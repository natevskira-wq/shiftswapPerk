/* ===========================================================================
   ShiftSwap: The Deck — Supabase data layer
   When window.SS_CONFIG.url + anonKey are set AND @supabase/supabase-js is
   loaded, this connects to a real Postgres backend with realtime market sync.
   Otherwise SSDB.enabled === false and the app runs on the seeded mock data in
   data.jsx, so the prototype always previews.

   Scope: DB + Realtime, demo login (no Supabase Auth). The live, realtime table
   is `trade_offers` (The Market). Agents/schedules are loaded at boot; sealed
   trades land in `trade_matches` (status pending_rtm → approved/declined).
   Exposed as window.SSDB.
   =========================================================================== */
(function () {
  const CFG = window.SS_CONFIG || {};
  const url = (CFG.url || "").trim();
  const key = (CFG.anonKey || "").trim();
  const lib = window.supabase; // UMD global from @supabase/supabase-js
  const enabled = !!(url && key && lib && lib.createClient);
  const client = enabled ? lib.createClient(url, key, { realtime: { params: { eventsPerSecond: 5 } } }) : null;

  // ---- row <-> app offer mapping ------------------------------------------
  function rowToOffer(r) {
    const o = {
      id: r.id, kind: r.kind, agent: r.agent_id, mine: !!r.mine,
      note: r.note || "", ts: r.ts || "now", status: r.status || "open",
    };
    if (r.day) o.day = r.day;
    if (r.date) o.date = r.date;
    if (r.offered) o.offered = r.offered;
    if (r.want_type) o.wantType = r.want_type;
    if (r.want_rest_day) o.wantRestDay = r.want_rest_day;
    if (r.want_rest_date) o.wantRestDate = r.want_rest_date;
    if (r.work_shift) o.workShift = r.work_shift;
    if (r.bundle_cards) o.bundleCards = r.bundle_cards;
    if (r.want_rest_days_list) o.wantRestDaysList = r.want_rest_days_list;
    return o;
  }
  function offerToRow(o) {
    return {
      id: o.id, kind: o.kind, agent_id: o.agent, mine: !!o.mine,
      day: o.day || null, date: o.date || null, offered: o.offered || null,
      want_type: o.wantType || null,
      want_rest_day: o.wantRestDay || null,
      want_rest_date: o.wantRestDate || null,
      work_shift: o.workShift || null,
      bundle_cards: o.bundleCards || null,
      want_rest_days_list: o.wantRestDaysList || null,
      note: o.note || null, ts: o.ts || "now", status: o.status || "open",
    };
  }

  // ---- boot: hydrate SS.* from the database before first render -----------
  async function fetchOpenOffers() {
    const { data, error } = await client.from("trade_offers").select("*").eq("status", "open");
    if (error) throw error;
    return (data || []).map(rowToOffer);
  }

  // rebuild SS.ROSTER / SS.ROSTER_W2 / SS.MY_HAND* from a flat schedules table
  function applySchedules(rows) {
    if (!rows || !rows.length) return;
    const SS = window.SS;
    const w1 = {}, w2 = {};
    rows.forEach(r => {
      const bucket = r.week === 2 ? w2 : w1;
      (bucket[r.agent_id] = bucket[r.agent_id] || []).push({ day: r.day, date: r.day_date, shift: r.shift });
    });
    const order = SS.DAYS.map(d => d.key);
    const sortDays = m => Object.keys(m).forEach(a => m[a].sort((x, y) => order.indexOf(x.day) - order.indexOf(y.day)));
    sortDays(w1); sortDays(w2);
    if (Object.keys(w1).length) {
      SS.ROSTER = w1;
      if (w1[SS.ME]) SS.MY_HAND = w1[SS.ME].map((c, i) => ({ id: "s" + (i + 1), agent: SS.ME, ...c }));
    }
    if (Object.keys(w2).length) {
      SS.ROSTER_W2 = w2;
      if (w2[SS.ME]) SS.MY_HAND_W2 = w2[SS.ME].map((c, i) => ({ id: "w2s" + (i + 1), agent: SS.ME, ...c }));
    }
  }

  function applyAgents(rows) {
    if (!rows || !rows.length) return;
    const SS = window.SS;
    SS.AGENTS = rows.map(a => ({
      id: a.id, name: a.name, emp: a.emp, site: a.site, team: a.team,
      tier: a.tier, lang: a.lang, trades: a.trades, flexible: !!a.flexible,
    }));
  }

  // Loads agents, schedules, and open offers into SS.* so the existing
  // synchronous screens render straight from live data. Best-effort: any
  // failure leaves the seeded mock in place.
  async function boot() {
    if (!enabled) return false;
    try {
      const [ag, sch, off] = await Promise.all([
        client.from("agents").select("*"),
        client.from("schedules").select("*"),
        client.from("trade_offers").select("*").eq("status", "open"),
      ]);
      if (!ag.error) applyAgents(ag.data);
      if (!sch.error) applySchedules(sch.data);
      if (!off.error && off.data && off.data.length) {
        window.SS.OFFERS = off.data.map(rowToOffer);
      }
      console.info("[SSDB] connected — live Supabase backend");
      return true;
    } catch (e) {
      console.warn("[SSDB] boot failed, falling back to mock data:", e.message || e);
      return false;
    }
  }

  // ---- realtime: re-emit the full open board on any change ----------------
  function subscribeOffers(cb) {
    if (!enabled) return () => {};
    const refresh = async () => { try { cb(await fetchOpenOffers()); } catch (e) {} };
    const ch = client
      .channel("ss-offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_offers" }, refresh)
      .subscribe();
    return () => { try { client.removeChannel(ch); } catch (e) {} };
  }

  // ---- writes (fire-and-forget; realtime reconciles local optimistic state)
  function insertOffer(o) {
    if (!enabled) return;
    client.from("trade_offers").insert(offerToRow(o)).then(({ error }) => {
      if (error) console.warn("[SSDB] insertOffer:", error.message);
    });
  }
  function removeOffer(id) {
    if (!enabled) return;
    client.from("trade_offers").update({ status: "matched" }).eq("id", id).then(({ error }) => {
      if (error) console.warn("[SSDB] removeOffer:", error.message);
    });
  }
  function reopenOffer(o) {
    if (!enabled) return;
    // restore to the board: upsert keeps it idempotent if the row still exists
    client.from("trade_offers").upsert({ ...offerToRow(o), status: "open" }).then(({ error }) => {
      if (error) console.warn("[SSDB] reopenOffer:", error.message);
    });
  }
  function insertMatch(entry) {
    if (!enabled) return;
    client.from("trade_matches").insert({
      id: entry.id,
      offer_id: entry.offer && entry.offer.id,
      offer: entry.offer || null,
      my_card: entry.myCard || null,
      bundle_legs: entry.bundleLegs || null,
      responder_agent_id: window.SS.ME,
      sealed_at: entry.sealedAt || null,
      rtm_msg: entry.rtmMsg || null,
      status: "pending_rtm",
    }).then(({ error }) => { if (error) console.warn("[SSDB] insertMatch:", error.message); });
  }
  function resolveMatch(id, status) {
    if (!enabled) return;
    client.from("trade_matches").update({ status }).eq("id", id).then(({ error }) => {
      if (error) console.warn("[SSDB] resolveMatch:", error.message);
    });
  }

  // ---- admin schedule import → persist to the schedules table -------------
  function upsertSchedules(schedule) {
    if (!enabled || !schedule) return;
    const rows = [];
    const push = (week, map) => Object.entries(map || {}).forEach(([agentId, days]) =>
      (days || []).forEach(d => rows.push({
        id: `${agentId}-w${week}-${d.day}`, agent_id: agentId, week,
        day: d.day, day_date: d.date, shift: d.shift,
      })));
    push(1, schedule.w1); push(2, schedule.w2);
    if (!rows.length) return;
    client.from("schedules").upsert(rows).then(({ error }) => {
      if (error) console.warn("[SSDB] upsertSchedules:", error.message);
    });
  }

  window.SSDB = {
    enabled, client, boot, subscribeOffers,
    insertOffer, removeOffer, reopenOffer, insertMatch, resolveMatch, upsertSchedules,
    rowToOffer, offerToRow,
  };
  if (!enabled) console.info("[SSDB] no credentials — running on seeded mock data");
})();
