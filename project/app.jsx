/* ===========================================================================
   ShiftSwap: The Deck — app host
   Owns all state, exposes it via window.SSCtx, renders the device shell,
   navigation, the match bottom-sheet, toast, and the deal-your-hand intro.
   =========================================================================== */
(function () {
  const { useState, useMemo, useEffect, createContext } = React;
  const SS = window.SS;
  const T = window.SS_I18N.t;

  const SSCtx = createContext(null);
  window.SSCtx = SSCtx;

  // Tweak defaults — the host rewrites this block on disk when a tweak changes.
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "brunchCard": ["#f7a81b", "#d9630e"],
    "dawnCard": ["#7e93da", "#ff9166"],
    "cardVividness": 100,
    "accent": ["#f5c518", "#ffe9a8"],
    "displayFont": "Grotesk"
  }/*EDITMODE-END*/;

  const TW_FONTS = {
    "Grotesk": '"Space Grotesk", system-ui, sans-serif',
    "Manrope": '"Manrope", system-ui, sans-serif',
    "Serif":   'Georgia, "Times New Roman", serif',
  };

  /* ---------- Compliance disclaimer (shared copy) ------------------------- */
  function DisclaimerModal({ onAck }) {
    return (
      <div className="disclaimer-modal">
        <div className="disclaimer-card">
          <div className="disclaimer-icon">⚠️</div>
          <h2 className="disclaimer-h">ShiftSwap is not an official scheduling tool.</h2>
          <p className="disclaimer-p">
            All trades must be approved by your RTM.<br />
            Calabrio is the only source of truth.
          </p>
          <p className="disclaimer-p2">
            This app helps you find a match — nothing is confirmed until your RTM updates Calabrio.
          </p>
          <button className="btn btn--gold btn--full btn--lg" onClick={onAck}>I understand</button>
        </div>
      </div>
    );
  }

  function ReminderBar({ onClose }) {
    return (
      <div className="reminder-bar" role="alert">
        <span className="reminder-bar__ic">⚠️</span>
        <span className="reminder-bar__txt">
          <b>Not official.</b> All trades must be approved by your RTM — Calabrio is the only source of truth.
          Nothing is confirmed until your RTM updates Calabrio.
        </span>
        <button className="reminder-bar__x" onClick={onClose} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  /* ---------- Login gate -------------------------------------------------- */
  function LoginGate({ onLogin }) {
    const [mode, setMode] = useState("agent");
    const [empId, setEmpId] = useState("");
    const [user,  setUser]  = useState("");
    const [pass,  setPass]  = useState("");
    const [err,   setErr]   = useState("");

    function handleAgent() {
      if (!empId.trim()) { onLogin({ role: "agent", agentId: SS.ME }); return; }
      const ag = SS.AGENTS.find(a => a.emp.toUpperCase() === empId.trim().toUpperCase());
      if (!ag) { setErr("Employee ID not found. Try DXB-2041 for the demo."); return; }
      onLogin({ role: "agent", agentId: ag.id });
    }
    function handleAdmin() {
      const creds = SS.ADMIN_CREDS || { username: "admin", password: "Deck2026!" };
      if (user.trim() === creds.username && pass === creds.password) {
        onLogin({ role: "admin" });
      } else {
        setErr("Invalid credentials.");
      }
    }

    const inp = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#eceef8", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 14, display: "block" };

    return (
      <div style={{ minHeight: "100vh", background: "#0b0b1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,-apple-system,sans-serif", color: "#eceef8" }}>
        <div style={{ width: 360, padding: "40px 36px", background: "rgba(255,255,255,.04)", borderRadius: 20, border: "1px solid rgba(255,255,255,.09)" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🃏</div>
            <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-.01em" }}>ShiftSwap</div>
            <div style={{ fontSize: 12, opacity: .4, marginTop: 4, fontWeight: 600 }}>Sign in to continue</div>
          </div>

          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", marginBottom: 26 }}>
            {[["agent", "🏢 Agent"], ["admin", "🔑 Admin"]].map(([m, lbl]) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                style={{ flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                  background: mode === m ? "#f5c518" : "transparent",
                  color: mode === m ? "#1a1200" : "rgba(255,255,255,.4)" }}>
                {lbl}
              </button>
            ))}
          </div>

          {mode === "agent" && (
            <>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, opacity: .5, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Employee ID</label>
              <input value={empId} onChange={e => { setEmpId(e.target.value); setErr(""); }}
                placeholder="e.g. DXB-2041"
                onKeyDown={e => e.key === "Enter" && handleAgent()}
                style={inp} />
              <button onClick={() => onLogin({ role: "agent", agentId: SS.ME })}
                style={{ width: "100%", padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.45)", cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                Quick demo (Abdelrahman · DXB-2041)
              </button>
              <button onClick={handleAgent}
                style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#f5c518", color: "#1a1200", cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
                Sign in →
              </button>
            </>
          )}
          {mode === "admin" && (
            <>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, opacity: .5, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Username</label>
              <input value={user} onChange={e => { setUser(e.target.value); setErr(""); }} placeholder="admin" style={inp} />
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, opacity: .5, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Password</label>
              <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(""); }}
                placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleAdmin()}
                style={{ ...inp, marginBottom: 4 }} />
              <button onClick={handleAdmin}
                style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#f5c518", color: "#1a1200", cursor: "pointer", fontSize: 14, fontWeight: 800, marginTop: 12 }}>
                Sign in →
              </button>
            </>
          )}
          {err && <div style={{ marginTop: 12, fontSize: 12, color: "#ef4444", fontWeight: 700, textAlign: "center" }}>{err}</div>}
          <div style={{ marginTop: 22, fontSize: 10, opacity: .18, textAlign: "center", fontWeight: 600, lineHeight: 1.7 }}>
            Demo: agent DXB-2041 · admin / Deck2026!
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Onboarding: deal-your-hand ---------------------------------- */
  function DealIntro({ lang, onEnter }) {
    const me = SS.agent(SS.ME);
    const cards = SS.MY_HAND;
    const [done, setDone] = useState(false);
    useEffect(() => {
      const tmr = setTimeout(() => setDone(true), 250 + cards.length * 130 + 250);
      return () => clearTimeout(tmr);
    }, []);
    return (
      <div className="deal-stage">
        <div className="deal-eyebrow">{T(lang, "eyebrow")} · ShiftSwap</div>
        <h1 className="deal-title">{T(lang, "welcome")}, {me.name.split(" ")[0]}</h1>
        <div className="deal-sub">{T(lang, "dealing")}</div>
        <div className="deal-fan">
          {cards.map((c, i) => {
            const mid = (cards.length - 1) / 2;
            const rot = (i - mid) * 9;
            const tx = (i - mid) * 30;
            return (
              <div key={c.id} className="dealt"
                   style={{
                     transform: `translateX(${tx}px) rotate(${rot}deg)`,
                     animationDelay: `${250 + i * 130}ms`,
                     zIndex: i,
                   }}>
                <window.ShiftCard shiftKey={c.shift} day={c.day} date={c.date}
                  tierKey={me.tier} lang={lang} langSpec={me.lang} tilt={false} />
              </div>
            );
          })}
        </div>
        {done && (
          <button className="btn btn--gold btn--lg deal-enter-btn" onClick={onEnter}>
            {T(lang, "tapToEnter")} →
          </button>
        )}
      </div>
    );
  }

  /* ---------- Profile / settings ----------------------------------------- */
  function Profile() {
    const app = React.useContext(SSCtx);
    const { t, flexible, setFlexible, trades, onLogout } = app;
    const me = SS.agent(SS.ME);
    const rank = SS.rankFor(trades);
    const tierObj = SS.tier(me.tier);
    return (
      <div className="screen-enter">
        <div className="glass profile-hero">
          <div className="profile-avatar">{SS.initials(me.name)}</div>
          <div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 20 }}>{me.name}</div>
            <div className="faint" style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>
              {me.emp} · {me.site} · {me.team}
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 2 }}>
            <span className="matchbadge" style={{ background: "linear-gradient(120deg,#ffe9a8,#f5c518)", color: "#2a1d00", boxShadow: "none" }}>
              {rank.badge} {rank.name}
            </span>
          </div>
        </div>

        {/* Languages — fixed profile attribute */}
        <div className="section-label"><span>Queue</span><span className="lock-chip">🔒 Fixed</span></div>
        <div className="locked-field">
          <div className="lf-row">
            <span className="lc-flag">{SS.FLAGS.EN}</span>
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 13 }}>English</b>
              <span className="lc-sub" style={{ display: "block" }}>Baseline — everyone on the floor</span>
            </span>
          </div>
          <div className="lf-divider" />
          <div className="lf-row">
            <span className="lc-flag">{SS.FLAGS[me.lang]}</span>
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 13 }}>{SS.LANG_NAMES[me.lang]}</b>
              <span className="lc-sub" style={{ display: "block" }}>Your specialty — you only trade in this language</span>
            </span>
            <span className="lf-flag-badge">Specialty</span>
          </div>
        </div>

        {/* Skill tier — fixed, capped ladder */}
        <div className="section-label"><span>Skill tier</span><span className="lock-chip">🔒 Fixed</span></div>
        <div className="locked-field" style={{ padding: "12px 14px" }}>
          <div className="tier-ladder">
            <span className={"tier-step" + (me.tier === "GDS" ? " on" : "")}>GDS</span>
            <span className="tier-arrow">→</span>
            <span className={"tier-step top" + (tierObj.top ? " on" : "")}>
              GDS Advanced <span className="tier-cap">top · limited</span>
            </span>
          </div>
          <div className="lf-row" style={{ paddingBottom: 2 }}>
            <span style={{ fontSize: 18 }}>{tierObj.foil ? "✦" : "●"}</span>
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: 13 }}>You are {tierObj.label}</b>
              <span className="lc-sub" style={{ display: "block" }}>
                {tierObj.top
                  ? "Top of the ladder — no further tier."
                  : `Next: ${tierObj.next || "—"} (a small, limited cohort)`}
              </span>
            </span>
          </div>
        </div>
        <p className="lock-note">🎓 You trade only inside your queue ({tierObj.label} · {SS.LANG_NAMES[me.lang]}). Tier & language stay locked until you complete training for the next tier.</p>

        {/* Availability — editable */}
        <div className="section-label">Availability</div>
        <button className="glass flex-banner" onClick={() => setFlexible(f => !f)}
          style={{ borderColor: flexible ? "var(--gold)" : "var(--line)", marginTop: 0 }}>
          <span style={{ fontSize: 22 }}>{flexible ? "🖐️" : "✋"}</span>
          <span style={{ flex: 1, textAlign: "start" }}>
            <b style={{ fontSize: 13 }}>{t("flexible")}</b>
            <span className="faint" style={{ display: "block", fontSize: 11, fontWeight: 600 }}>
              {flexible ? t("flexibleOn") : t("flexibleSub")}
            </span>
          </span>
          <span className="mini-toggle" data-on={flexible}><span /></span>
        </button>

        <button onClick={onLogout}
          style={{ width: "100%", marginTop: 18, padding: "12px", borderRadius: 10, border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.06)", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          Sign out
        </button>
        <p className="faint" style={{ textAlign: "center", fontSize: 11, fontWeight: 600, marginTop: 14 }}>
          ShiftSwap: The Deck · v0.1 · {SS.SITES.length} sites
        </p>
      </div>
    );
  }

  /* ---------- Agent shell ------------------------------------------------- */
  function AgentApp({ sharedSchedule, scheduleAlerts = [], onDismissAlert, onLogout }) {
    const [intro, setIntro] = useState(true);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [tw, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
    const [reminder, setReminder] = useState(false);
    const [lang, setLang] = useState("EN");
    const [screen, setScreen] = useState("hand");      // hand|market|post|ledger|profile
    const me0 = SS.agent(SS.ME);
    const [flexible, setFlexible] = useState(me0.flexible);
    const [trades, setTrades] = useState(me0.trades);
    const [handCards,   setHandCards]   = useState(SS.MY_HAND.map(c => ({ ...c })));
    const [handCardsW2, setHandCardsW2] = useState((SS.MY_HAND_W2 || []).map(c => ({ ...c })));
    const [offers, setOffers] = useState(SS.OFFERS.map(o => ({ ...o })));
    const [listedIds, setListedIds] = useState([]);
    const [sheetOffer, setSheetOffer] = useState(null);
    const [postPreselect, setPostPreselect] = useState(null);
    const [bundlePreselect, setBundlePreselect] = useState(null);
    const [toast, setToast] = useState(null);
    const [pendingRtm, setPendingRtm] = useState(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("ss_pending_rtm") || "null");
        if (stored) return stored;
      } catch {}
      // Seed one demo entry so the section is visible on first load
      return [{
        id: "rtm-demo-1",
        offer: { id: "o1-demo", kind: "time", agent: "a3", day: "Mon", date: "Jun 8", offered: "EARLY", wantType: ["GRIND"] },
        myCard: { id: "s1", shift: "GRIND", day: "Mon", date: "Jun 8" },
        sealedAt: "2 Jun",
      }];
    });

    const rtl = false;
    useEffect(() => {
      document.documentElement.setAttribute("dir", "ltr");
      document.documentElement.setAttribute("lang", "en");
    }, []);
    useEffect(() => {
      localStorage.setItem("ss_pending_rtm", JSON.stringify(pendingRtm));
    }, [pendingRtm]);

    const [scavengeProposals, setScavengeProposals] = useState(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("ss_scavenge_props") || "null");
        if (stored) return stored;
      } catch {}
      return [{
        id: "scp-demo-1",
        fromAgentId: "a1", toAgentId: "a3",
        fromCard: { id: "s1", shift: "GRIND", day: "Mon", date: "Jun 8" },
        toShift: "EARLY", toDay: "Mon", toDate: "Jun 8",
      }];
    });
    useEffect(() => {
      localStorage.setItem("ss_scavenge_props", JSON.stringify(scavengeProposals));
    }, [scavengeProposals]);
    useEffect(() => {
      if (sharedSchedule && sharedSchedule.w2 && sharedSchedule.w2[SS.ME]) {
        const w2 = sharedSchedule.w2[SS.ME];
        setHandCardsW2(w2.map((c, i) => ({ ...c, id: c.id || ("w2s"+(i+1)), agent: SS.ME })));
      }
    }, [sharedSchedule]);

    const t = useMemo(() => (k) => T(lang, k), [lang]);

    function fireToast(msg) {
      setToast(msg);
      setTimeout(() => setToast(null), 2200);
    }
    function fireReminder() { setReminder(true); }

    function openCard(c) {                 // tap a card in My Hand → list it
      if (listedIds.includes(c.id)) return;
      setPostPreselect(c.id);
      setScreen("post");
    }
    function openOffer(o) { setSheetOffer(o); }
    function clearPreselect() { setPostPreselect(null); }

    function openBundlePost(cardIds) {
      setBundlePreselect(cardIds);
      setPostPreselect(null);
      setScreen("post");
    }
    function clearBundlePreselect() { setBundlePreselect(null); }

    function postOffer({ cardId, wantTypes, wantRestDay, flex, note, kind, bundleCardIds, wantRestDaysList }) {
      // ---- Bundle trade ----
      if (kind === "bundle" && bundleCardIds && bundleCardIds.length >= 2) {
        const allHandCards = [...handCards, ...handCardsW2];
        const bundleCards = allHandCards
          .filter(c => bundleCardIds.includes(c.id))
          .map(c => ({ cardId: c.id, day: c.day, date: c.date, shift: c.shift }));
        const newOffer = {
          id: "mine-bundle-" + Date.now(),
          agent: SS.ME, mine: true, kind: "bundle",
          bundleCards,
          wantType: (wantTypes && wantTypes.length) ? wantTypes : [],
          note: (note && note.trim()) ? note.trim() : "Looking for a bundle swap.",
          ts: "now",
        };
        setOffers(os => [newOffer, ...os]);
        setListedIds(ids => [...ids, ...bundleCardIds]);
        setScreen("market");
        fireToast("✓ Bundle posted to market");
        return;
      }
      // ---- Rest-bundle trade ----
      if (kind === "rest-bundle" && bundleCardIds && bundleCardIds.length >= 2 && wantRestDaysList) {
        const allHandCards2 = [...handCards, ...handCardsW2];
        const rbCards = allHandCards2
          .filter(c => bundleCardIds.includes(c.id))
          .map(c => ({ cardId: c.id, day: c.day, date: c.date, shift: c.shift }));
        const newOffer = {
          id: "mine-rb-" + Date.now(),
          agent: SS.ME, mine: true, kind: "rest-bundle",
          bundleCards: rbCards,
          wantRestDaysList,
          note: (note && note.trim()) ? note.trim() : "Looking to swap my days off.",
          ts: "now",
        };
        setOffers(os => [newOffer, ...os]);
        setListedIds(ids => [...ids, ...bundleCardIds]);
        setScreen("market");
        fireToast("✓ Rest day bundle posted to market");
        return;
      }
      // ---- Single card trade ----
      const card = handCards.find(c => c.id === cardId) || handCardsW2.find(c => c.id === cardId);
      if (!card) return;
      const isRest = card.shift === "CROWN";
      let newOffer;
      if (isRest) {
        // double trade: I give my day off (card.day) and want a day off on wantRestDay
        const yCard = handCards.find(c => c.day === wantRestDay);
        newOffer = {
          id: "mine-" + cardId + "-" + Date.now(),
          agent: SS.ME, mine: true, kind: "rest",
          day: card.day, date: card.date,
          offered: "CROWN",
          wantRestDay,
          wantRestDate: yCard ? yCard.date : "",
          workShift: yCard ? yCard.shift : "GRIND",
          note: (note && note.trim()) ? note.trim() : "Looking to swap this one.",
          ts: "now",
        };
      } else {
        newOffer = {
          id: "mine-" + cardId + "-" + Date.now(),
          agent: SS.ME, mine: true, kind: "time",
          day: card.day, date: card.date,
          offered: card.shift,
          wantType: (wantTypes && wantTypes.length) ? wantTypes : ["GRIND"],
          note: (note && note.trim()) ? note.trim() : "Looking to swap this one.",
          ts: "now",
        };
      }
      setOffers(os => [newOffer, ...os]);
      setListedIds(ids => [...ids, cardId]);
      setScreen("market");
      fireToast("✓ " + t("posted"));
    }

    function completeTrade(offer, myCard, bundleLegs, rtmMsg) {
      setOffers(os => os.filter(o => o.id !== offer.id));
      if (myCard) setListedIds(ids => ids.filter(id => id !== myCard.id));
      const sealedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      setPendingRtm(ps => [{ id: "rtm-" + Date.now(), offer, myCard: myCard || null, bundleLegs: bundleLegs || null, sealedAt, rtmMsg: rtmMsg || "" }, ...ps]);
    }

    function approveRtm(rtmId) {
      const entry = pendingRtm.find(p => p.id === rtmId);
      if (entry) {
        const { offer, myCard, bundleLegs } = entry;
        function applyTrade(cards) {
          if (offer.kind === "time" && myCard) {
            // I gave myCard's shift, I receive offer.offered — same day
            return cards.map(c => c.id === myCard.id ? { ...c, shift: offer.offered } : c);
          }
          if (offer.kind === "rest") {
            // offer.day → I now rest (CROWN); offer.wantRestDay → I now work offer.workShift
            return cards.map(c => {
              if (c.day === offer.day)        return { ...c, shift: "CROWN" };
              if (c.day === offer.wantRestDay) return { ...c, shift: offer.workShift };
              return c;
            });
          }
          if (offer.kind === "bundle" && bundleLegs) {
            return cards.map(c => {
              const leg = bundleLegs.find(l => l.myCard && l.myCard.id === c.id);
              return leg ? { ...c, shift: leg.theirShift } : c;
            });
          }
          if (offer.kind === "rest-bundle") {
            const agRoster = ((SS.ROSTER || {})[offer.agent]) || [];
            const legs = (offer.wantRestDaysList || []).map((giveDay, i) => ({
              giveDay, getDay: offer.bundleCards?.[i]?.day,
              workShift: agRoster.find(c => c.day === giveDay)?.shift || "GRIND",
            }));
            return cards.map(c => {
              const gLeg = legs.find(l => l.giveDay === c.day);
              const rLeg = legs.find(l => l.getDay === c.day);
              if (gLeg) return { ...c, shift: gLeg.workShift };
              if (rLeg) return { ...c, shift: "CROWN" };
              return c;
            });
          }
          return cards;
        }
        setHandCards(applyTrade);
        setHandCardsW2(applyTrade);
        // Unlist any bundle cards still in the listed pool
        if (bundleLegs) {
          const ids = bundleLegs.map(l => l.myCard?.id).filter(Boolean);
          if (ids.length) setListedIds(ls => ls.filter(id => !ids.includes(id)));
        }
      }
      setPendingRtm(ps => ps.filter(p => p.id !== rtmId));
      setTrades(n => n + 1);
      fireToast("✅ RTM approved — your hand is updated");
    }

    function declineRtm(rtmId) {
      const entry = pendingRtm.find(p => p.id === rtmId);
      if (entry) {
        // Restore the original offer so both agents can try again
        setOffers(os => [{ ...entry.offer, ts: "now" }, ...os]);
      }
      setPendingRtm(ps => ps.filter(p => p.id !== rtmId));
      fireToast("❌ RTM declined — trade reopened for both agents");
    }

    function sendScavengeProposal(proposal) {
      setScavengeProposals(ps => [{ ...proposal, id: "scp-" + Date.now() }, ...ps]);
      const toAg = SS.agent(proposal.toAgentId);
      fireToast("📤 Proposal sent to " + toAg.name.split(" ")[0]);
    }

    function acceptScavengeProposal(proposalId) {
      const p = scavengeProposals.find(x => x.id === proposalId);
      if (!p) return;
      setScavengeProposals(ps => ps.filter(x => x.id !== proposalId));
      setSheetOffer({
        id: proposalId + "-syn",
        kind: "time",
        agent: p.toAgentId,
        day: p.toDay, date: p.toDate,
        offered: p.toShift,
        wantType: [p.fromCard.shift],
        _startPhase: "confirm",
        _preCardId: p.fromCard.id,
      });
    }

    function declineScavengeProposal(proposalId) {
      setScavengeProposals(ps => ps.filter(x => x.id !== proposalId));
      fireToast("❌ Proposal declined");
    }

    const ctx = {
      t, lang, setLang, screen, setScreen,
      flexible, setFlexible, trades,
      handCards, offers, listedIds,
      openCard, openOffer, postOffer, clearPreselect,
      postPreselect, bundlePreselect, openBundlePost, clearBundlePreselect, completeTrade,
      pendingRtm, approveRtm, declineRtm,
      scavengeProposals, sendScavengeProposal, acceptScavengeProposal, declineScavengeProposal,
      fireToast,
      handCardsW2, scheduleAlerts, onDismissAlert: onDismissAlert || (() => {}),
      onLogout: onLogout || (() => {}),
    };

    const titles = {
      hand: t("myHand"), market: t("theMarket"), post: t("postTrade"),
      ledger: t("theLedger"), profile: t("profile"),
    };

    const Screen = {
      hand: window.MyHand, market: window.Market, post: window.PostTrade,
      ledger: window.Ledger, profile: Profile,
    }[screen];

    const navItems = [
      { key: "hand",   ic: "🃏", label: t("hand") },
      { key: "market", ic: "🔥", label: t("market") },
      { key: "ledger", ic: "📊", label: t("ledger") },
      { key: "profile",ic: "👤", label: t("profile") },
    ];

    return (
      <SSCtx.Provider value={ctx}>
        <style>{`
          :root{
            --gold:${tw.accent[0]};
            --gold-soft:${tw.accent[1]};
            --display:${TW_FONTS[tw.displayFont] || TW_FONTS.Grotesk};
          }
          .t-brunch{ --c1:${tw.brunchCard[0]}; --c2:${tw.brunchCard[1]}; }
          .t-dawn{ --c1:${tw.dawnCard[0]}; --c2:${tw.dawnCard[1]}; }
          .card:not(.is-disabled){ filter:saturate(${tw.cardVividness}%); }
        `}</style>
        {window.TweaksPanel && (
          <window.TweaksPanel title="Tweaks">
            <window.TweakSection label="Your new shift cards" />
            <window.TweakColor label="11am · Brunch Run" value={tw.brunchCard}
              options={[["#f7a81b","#d9630e"],["#ff7a3c","#e8402b"],["#22b8a6","#0f7a72"],["#5b8def","#2f5fd0"]]}
              onChange={(v) => setTweak("brunchCard", v)} />
            <window.TweakColor label="6am · Dawn Patrol" value={tw.dawnCard}
              options={[["#7e93da","#ff9166"],["#9b6cf0","#f06aa6"],["#3a2d72","#1c1640"],["#ff9a5c","#d8542b"]]}
              onChange={(v) => setTweak("dawnCard", v)} />
            <window.TweakSlider label="Card vividness" value={tw.cardVividness}
              min={70} max={150} step={5} unit="%"
              onChange={(v) => setTweak("cardVividness", v)} />
            <window.TweakSection label="Brand" />
            <window.TweakColor label="Accent" value={tw.accent}
              options={[["#f5c518","#ffe9a8"],["#3b82f6","#bfdbfe"],["#22c55e","#bbf7d0"],["#a855f7","#e9d5ff"]]}
              onChange={(v) => setTweak("accent", v)} />
            <window.TweakSection label="Type" />
            <window.TweakRadio label="Display font" value={tw.displayFont}
              options={["Grotesk", "Manrope", "Serif"]}
              onChange={(v) => setTweak("displayFont", v)} />
          </window.TweaksPanel>
        )}
        <div className="stage">
          <div className="device">
            <div className="screen">
              <div className="notch" />

              {intro ? (
                <DealIntro lang={lang} onEnter={() => { setIntro(false); setShowDisclaimer(true); }} />
              ) : (
                <>
                  {/* status bar */}
                  <div className="statusbar">
                    <span>9:41</span>
                    <span className="right">
                      <span>{rtl ? "▮▮▮" : "📶"}</span>
                      <span>{rtl ? "" : "🔋"}</span>
                    </span>
                  </div>

                  {/* app bar */}
                  <div className="appbar">
                    <div className="appbar__title">
                      <span className="appbar__eyebrow">{t("eyebrow")}</span>
                      <span className="appbar__h">{titles[screen]}</span>
                    </div>
                    <div className="appbar__actions">
                      <div className="lang-static" title="You speak English + your specialty language">
                        <span>EN</span>
                        <span className="lang-static__plus">+</span>
                        <span>{SS.FLAGS[SS.agent(SS.ME).lang]}</span>
                      </div>
                    </div>
                  </div>

                  {/* RTM reminder (non-blocking) */}
                  {reminder && <ReminderBar onClose={() => setReminder(false)} />}

                  {/* scroll body */}
                  <div className="body" key={screen}>
                    {Screen ? <Screen /> : null}
                  </div>

                  {/* bottom nav */}
                  <div className="nav">
                    {navItems.slice(0, 2).map(n => (
                      <button key={n.key} className={"nav__item" + (screen === n.key ? " active" : "")}
                        onClick={() => setScreen(n.key)}>
                        <span className="ic">{n.ic}</span><span>{n.label}</span>
                      </button>
                    ))}
                    <button className="nav__post" title={t("postTrade")}
                      onClick={() => { setPostPreselect(null); setScreen("post"); }}>+</button>
                    {navItems.slice(2).map(n => (
                      <button key={n.key} className={"nav__item" + (screen === n.key ? " active" : "")}
                        onClick={() => setScreen(n.key)}>
                        <span className="ic">{n.ic}</span><span>{n.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* match bottom sheet */}
                  <div className={"sheet-backdrop" + (sheetOffer ? " show" : "")}
                    onClick={(e) => { if (e.target === e.currentTarget) setSheetOffer(null); }}>
                    <div className="sheet">
                      {sheetOffer && (
                        <window.MatchSheet offer={sheetOffer}
                          onClose={() => setSheetOffer(null)}
                          onDone={() => { setSheetOffer(null); setScreen("hand"); }} />
                      )}
                    </div>
                  </div>

                  {/* toast */}
                  <div className={"toast" + (toast ? " show" : "")}>{toast}</div>

                  {/* login compliance modal */}
                  {showDisclaimer && <DisclaimerModal onAck={() => setShowDisclaimer(false)} />}
                </>
              )}
            </div>
          </div>
        </div>
      </SSCtx.Provider>
    );
  }

  /* ---------- Root: login gate + routing ---------------------------------- */
  function App() {
    const [session, setSession] = useState(() => {
      try { return JSON.parse(localStorage.getItem("ss_session") || "null"); } catch { return null; }
    });
    const [sharedSchedule, setSharedSchedule] = useState({ w1: SS.ROSTER, w2: SS.ROSTER_W2 || {} });
    const [scheduleAlerts, setScheduleAlerts] = useState([]);

    function handleLogin(s) { localStorage.setItem("ss_session", JSON.stringify(s)); setSession(s); }
    function handleLogout() { localStorage.removeItem("ss_session"); setSession(null); }
    function handleImported(newSchedule, alerts) {
      setSharedSchedule(newSchedule);
      if (alerts && alerts.length) setScheduleAlerts(prev => [...prev, ...alerts]);
    }
    function handleDismissAlert(idx) { setScheduleAlerts(a => a.filter((_, i) => i !== idx)); }

    if (!session) return <LoginGate onLogin={handleLogin} />;

    if (session.role === "admin") {
      return <window.AdminDashboard
        offers={SS.OFFERS.slice()}
        pendingRtm={[]}
        schedule={sharedSchedule}
        onImported={handleImported}
        onLogout={handleLogout} />;
    }

    return <AgentApp
      sharedSchedule={sharedSchedule}
      scheduleAlerts={scheduleAlerts}
      onDismissAlert={handleDismissAlert}
      onLogout={handleLogout} />;
  }

  window.SSApp = App;
})();
