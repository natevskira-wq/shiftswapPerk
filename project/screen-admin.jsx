/* ===========================================================================
   ShiftSwap — Admin Dashboard
   Full-page: Upload Schedule | Active Trades | Agent List | Analytics
   =========================================================================== */
(function () {
  const { useState, useRef } = React;
  const SS = window.SS;

  function em(key) { return SS.shift(key)?.emoji || "·"; }

  function matchAgent(name) {
    if (!name || !name.trim()) return null;
    const n = name.trim().toLowerCase().replace(/[^a-z ]/g, "");
    return SS.AGENTS.find(a => a.name.toLowerCase().replace(/[^a-z ]/g, "") === n)
      || SS.AGENTS.find(a => {
           const parts = a.name.toLowerCase().split(" ");
           return parts.some(p => p.length > 3 && n.includes(p));
         })
      || null;
  }

  function normalizeShift(cell) {
    if (!cell && cell !== 0) return null;
    const v = String(cell).trim().toUpperCase().replace(/[\s\-_]/g, "");
    if (SS.SHIFTS[v]) return v;
    const ALIASES = { "RD":"CROWN","DO":"CROWN","DAYOFF":"CROWN","REST":"CROWN","AL":"LEAVE","ANNUALLEAVE":"LEAVE","HOLIDAY":"LEAVE","MS":"GRIND","AS":"GOLDEN","NS":"OWL" };
    if (ALIASES[v]) return ALIASES[v];
    const found = Object.values(SS.SHIFTS).find(s => s.name.toUpperCase().replace(/[\s\-_]/g,"") === v);
    return found ? found.key : null;
  }

  /* ============================================================
     Upload Tab
     ============================================================ */
  function UploadTab({ schedule, onImported }) {
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState(null);
    const [fixes, setFixes] = useState({});
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);   // null | { imported, alerts }
    const [err, setErr] = useState(null);
    const ref = useRef();

    function processFile(f) {
      if (!window.XLSX) { setErr("SheetJS not loaded — reload the page."); return; }
      setErr(null); setFile(f); setRows(null); setDone(null);
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const wb = window.XLSX.read(ev.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          if (raw.length < 2) { setErr("File looks empty."); return; }
          let start = 0;
          const fc = String(raw[0][0] || "").toLowerCase();
          if (fc.includes("agent") || fc.includes("name") || fc === "") start = 1;
          const days1 = SS.DAYS   || [];
          const days2 = (SS.DAYS_W2 || []);
          const parsed = raw.slice(start)
            .filter(r => String(r[0] || "").trim())
            .map(r => {
              const agentName = String(r[0]).trim();
              const matched  = matchAgent(agentName);
              const w1 = days1.map((d, i) => ({ day: d.key, date: d.date, shift: normalizeShift(r[1 + i]) }));
              const w2 = days2.map((d, i) => ({ day: d.key, date: d.date, shift: normalizeShift(r[8 + i]) }));
              const hasW2 = r.length > 8 && r.slice(8, 15).some(c => String(c || "").trim());
              return { agentName, matched, w1, w2, hasW2 };
            });
          setRows(parsed);
          const f0 = {};
          parsed.filter(p => !p.matched).forEach(p => { f0[p.agentName] = ""; });
          setFixes(f0);
        } catch (ex) { setErr("Parse error: " + ex.message); }
      };
      reader.readAsBinaryString(f);
    }

    function confirmImport() {
      setBusy(true);
      setTimeout(() => {
        const nW1 = { ...(schedule.w1 || {}) };
        const nW2 = { ...(schedule.w2 || {}) };
        const alerts = [];
        rows.forEach(row => {
          const fix = fixes[row.agentName];
          const ag  = row.matched || (fix && fix !== "__skip" ? SS.AGENTS.find(a => a.id === fix) : null);
          if (!ag) return;
          const oldW1 = (schedule.w1 || {})[ag.id] || [];
          const changed = row.w1.some((nc, i) => oldW1[i] && nc.shift && oldW1[i].shift !== nc.shift);
          nW1[ag.id] = row.w1.map(d => ({ ...d, agent: ag.id }));
          if (row.hasW2) nW2[ag.id] = row.w2.map(d => ({ ...d, agent: ag.id }));
          if (changed) alerts.push({ agentId: ag.id, msg: "Your schedule was updated — check your new hand." });
        });
        const summary = { imported: rows.length, changed: alerts.length };
        setBusy(false); setDone(summary);
        onImported({ w1: nW1, w2: nW2 }, alerts);
      }, 1500);
    }

    const unmatched   = rows ? rows.filter(r => !r.matched) : [];
    const canConfirm  = rows && !busy && unmatched.every(r => fixes[r.agentName]);
    const hasW2Cols   = rows && rows.some(r => r.hasW2);
    const days1 = SS.DAYS   || [];
    const days2 = SS.DAYS_W2 || [];

    return (
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Upload Schedule</h2>
        <p style={{ fontSize: 13, opacity: .55, lineHeight: 1.7, marginBottom: 28, maxWidth: 560 }}>
          Upload a biweekly <b>.xlsx</b> file. <b>Column A:</b> agent name ·
          <b> B–H:</b> Week 1 shifts (Mon–Sun) · <b>I–O:</b> Week 2 (optional).<br />
          Shift codes: <code>GRIND EARLY MORNING GOLDEN DUSK OWL CROWN LEAVE</code>
        </p>

        {/* Drop zone */}
        {!rows && !done && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
            onClick={() => ref.current.click()}
            style={{
              border: `2px dashed ${dragging ? "#f5c518" : "rgba(255,255,255,.12)"}`,
              borderRadius: 16, padding: "56px 24px", textAlign: "center", cursor: "pointer",
              background: dragging ? "rgba(245,197,24,.05)" : "rgba(255,255,255,.02)", transition: "all .2s",
            }}>
            <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
              onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); }} />
            <div style={{ fontSize: 48, marginBottom: 14 }}>📤</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Drop .xlsx file here</div>
            <div style={{ fontSize: 12, opacity: .4 }}>or click to browse — .xlsx · .xls · .csv</div>
          </div>
        )}

        {err && (
          <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.28)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 13, fontWeight: 700, marginTop: 14 }}>
            ⚠️ {err}
          </div>
        )}

        {/* Success state */}
        {done && (
          <div style={{ background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.22)", borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Schedule imported</div>
            <div style={{ fontSize: 13, opacity: .55 }}>
              {done.imported} agents · {done.changed} schedule {done.changed === 1 ? "change" : "changes"} detected.
              {done.changed > 0 && " Affected agents will see an alert on their home screen."}
            </div>
            <button onClick={() => { setRows(null); setFile(null); setDone(null); }}
              style={{ marginTop: 20, padding: "10px 28px", borderRadius: 9, border: "1px solid rgba(255,255,255,.14)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              Upload another
            </button>
          </div>
        )}

        {/* Preview */}
        {rows && !done && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Preview — {rows.length} agents</div>
                <div style={{ fontSize: 12, opacity: .45, marginTop: 2 }}>{file?.name}</div>
                {unmatched.length > 0 && (
                  <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 4, fontWeight: 700 }}>
                    ⚠️ {unmatched.length} name{unmatched.length > 1 ? "s" : ""} not matched — assign before importing
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <button onClick={() => { setRows(null); setFile(null); }}
                  style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={confirmImport} disabled={!canConfirm}
                  style={{ padding: "9px 22px", borderRadius: 9, border: "none", fontWeight: 800, fontSize: 13, cursor: canConfirm ? "pointer" : "not-allowed",
                    background: canConfirm ? "#f5c518" : "rgba(255,255,255,.08)", color: canConfirm ? "#1a1200" : "rgba(255,255,255,.25)" }}>
                  {busy ? "Importing…" : "✓ Confirm Import"}
                </button>
              </div>
            </div>

            {/* Unmatched resolver */}
            {unmatched.length > 0 && (
              <div style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#fbbf24", marginBottom: 12 }}>🚩 Flagged — Unmatched Names</div>
                {unmatched.map(row => (
                  <div key={row.agentName} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 13 }}>
                    <span style={{ flex: "0 0 190px", fontWeight: 700, opacity: .75 }}>{row.agentName}</span>
                    <span style={{ opacity: .3, fontSize: 11 }}>→</span>
                    <select value={fixes[row.agentName] || ""}
                      onChange={e => setFixes(f => ({ ...f, [row.agentName]: e.target.value }))}
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "#15152a", color: "inherit", fontSize: 13 }}>
                      <option value="">— assign to agent —</option>
                      {SS.AGENTS.map(a => <option key={a.id} value={a.id}>{a.name} · {a.emp}</option>)}
                      <option value="__skip">Skip this row</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Preview table */}
            <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    <th style={{ padding: "11px 16px", textAlign: "left", opacity: .55, fontWeight: 700 }}>Agent</th>
                    {days1.map(d => (
                      <th key={d.key} style={{ padding: "11px 7px", textAlign: "center", opacity: .55, fontWeight: 700, fontSize: 11 }}>
                        {d.key}<br /><span style={{ fontWeight: 500, fontSize: 9 }}>{d.date}</span>
                      </th>
                    ))}
                    {hasW2Cols && days2.map(d => (
                      <th key={"w2"+d.key} style={{ padding: "11px 7px", textAlign: "center", opacity: .3, fontWeight: 600, fontSize: 11, borderLeft: d.key === "Mon" ? "1px dashed rgba(255,255,255,.1)" : "none" }}>
                        {d.key}<br /><span style={{ fontWeight: 500, fontSize: 9 }}>{d.date}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: i % 2 ? "transparent" : "rgba(255,255,255,.015)" }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontWeight: 700 }}>{row.matched ? row.matched.name : row.agentName}</div>
                        <div style={{ fontSize: 10, marginTop: 2, color: row.matched ? "inherit" : "#fbbf24", opacity: row.matched ? .4 : 1 }}>
                          {row.matched ? row.matched.emp : "⚠️ not matched"}
                        </div>
                      </td>
                      {row.w1.map((d, di) => (
                        <td key={di} style={{ padding: "10px 7px", textAlign: "center" }}>
                          {d.shift
                            ? <><div style={{ fontSize: 17 }}>{em(d.shift)}</div><div style={{ fontSize: 9, opacity: .35, marginTop: 1 }}>{d.shift}</div></>
                            : <span style={{ opacity: .15, fontSize: 10 }}>—</span>}
                        </td>
                      ))}
                      {hasW2Cols && row.w2.map((d, di) => (
                        <td key={"w2"+di} style={{ padding: "10px 7px", textAlign: "center", opacity: .55, borderLeft: di === 0 ? "1px dashed rgba(255,255,255,.08)" : "none" }}>
                          {d.shift ? <span style={{ fontSize: 15 }}>{em(d.shift)}</span> : <span style={{ opacity: .15 }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ============================================================
     Trades Tab
     ============================================================ */
  function TradesTab({ offers, pendingRtm }) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Active Trades</h2>
        <p style={{ fontSize: 13, opacity: .55, marginBottom: 24 }}>All open market offers and trades awaiting RTM sign-off. Read-only.</p>

        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {[["Open offers", offers.length, "#f5c518"], ["Pending RTM", pendingRtm.length, "#22c55e"]].map(([lbl, n, c]) => (
            <div key={lbl} style={{ flex: 1, background: "rgba(255,255,255,.04)", borderRadius: 13, padding: "18px 22px", border: `1px solid ${c}22` }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: c, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 12, opacity: .5, marginTop: 6, fontWeight: 700 }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.07)", marginBottom: 16 }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,.07)", fontWeight: 800, fontSize: 13 }}>
            Open Offers ({offers.length})
          </div>
          {offers.length === 0 && <div style={{ padding: 28, textAlign: "center", opacity: .3, fontSize: 13 }}>No open offers</div>}
          {offers.map(o => {
            const ag = SS.agent(o.agent);
            if (!ag) return null;
            const isBundle = o.kind === "bundle";
            const isRest   = o.kind === "rest";
            const dayLabel = isBundle ? o.bundleCards?.map(b => b.day).join("+") : `${o.day} ${o.date}`;
            const kindTag  = isBundle ? `📦 ${o.bundleCards?.length}d bundle` : isRest ? "🔁 rest swap" : "⇄ time swap";
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                  {SS.initials(ag.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{ag.name}</div>
                  <div style={{ fontSize: 11, opacity: .4, marginTop: 2 }}>{ag.site} · {SS.tier(ag.tier)?.short}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{dayLabel}</div>
                  <div style={{ fontSize: 10, opacity: .4, marginTop: 2 }}>{kindTag}</div>
                </div>
                <div style={{ fontSize: 22 }}>{isBundle ? "📦" : SS.shift(o.offered)?.emoji || "?"}</div>
                {o.wantType && o.wantType.length > 0 && (
                  <div style={{ fontSize: 11, opacity: .4 }}>→ {o.wantType.map(k => SS.shift(k)?.name || k).join(" / ")}</div>
                )}
                <div style={{ fontSize: 11, opacity: .3, whiteSpace: "nowrap" }}>{o.ts} ago</div>
              </div>
            );
          })}
        </div>

        {pendingRtm.length > 0 && (
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,.07)", fontWeight: 800, fontSize: 13 }}>Pending RTM ({pendingRtm.length})</div>
            {pendingRtm.map(entry => {
              const ag2 = SS.agent(entry.offer?.agent);
              return (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{SS.agent(SS.ME)?.name} ↔ {ag2?.name}</div>
                    <div style={{ fontSize: 11, opacity: .4, marginTop: 2 }}>Sealed {entry.sealedAt} · {entry.offer?.kind}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "rgba(245,197,24,.12)", color: "#f5c518" }}>⏳ Awaiting RTM</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ============================================================
     Agents Tab
     ============================================================ */
  function AgentsTab({ schedule }) {
    const [weekN, setWeekN] = useState(1);
    const [q, setQ] = useState("");
    const days   = weekN === 1 ? (SS.DAYS || []) : (SS.DAYS_W2 || []);
    const roster = weekN === 1 ? (schedule.w1 || {}) : (schedule.w2 || {});
    const agents = SS.AGENTS.filter(a => !q
      || a.name.toLowerCase().includes(q.toLowerCase())
      || a.emp.toLowerCase().includes(q.toLowerCase())
      || a.site.toLowerCase().includes(q.toLowerCase())
    );

    return (
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Agent List</h2>
            <p style={{ fontSize: 13, opacity: .55 }}>{SS.AGENTS.length} agents · {SS.SITES.length} sites</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)" }}>
              {[1, 2].map(n => (
                <button key={n} onClick={() => setWeekN(n)}
                  style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                    background: weekN === n ? "#f5c518" : "transparent", color: weekN === n ? "#1a1200" : "rgba(255,255,255,.45)" }}>
                  Week {n}
                </button>
              ))}
            </div>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents…"
              style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "inherit", fontSize: 13, width: 190, outline: "none" }} />
          </div>
        </div>

        <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", opacity: .55, fontWeight: 700 }}>Agent</th>
                <th style={{ padding: "12px 8px", textAlign: "center", opacity: .55, fontWeight: 700 }}>Site</th>
                <th style={{ padding: "12px 8px", textAlign: "center", opacity: .55, fontWeight: 700 }}>Tier</th>
                <th style={{ padding: "12px 8px", textAlign: "center", opacity: .55, fontWeight: 700 }}>Lang</th>
                {days.map(d => (
                  <th key={d.key} style={{ padding: "12px 7px", textAlign: "center", opacity: .55, fontWeight: 700, fontSize: 11 }}>
                    {d.key}<br /><span style={{ fontWeight: 500, fontSize: 9 }}>{d.date}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a, i) => {
                const agRoster = roster[a.id] || [];
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: i % 2 ? "transparent" : "rgba(255,255,255,.015)" }}>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ fontWeight: 700 }}>{a.name}</div>
                      <div style={{ fontSize: 10, opacity: .4, marginTop: 2 }}>{a.emp}</div>
                    </td>
                    <td style={{ padding: "11px 8px", textAlign: "center", fontSize: 11, opacity: .55 }}>
                      {a.site.replace(" HQ","").replace(" Hub","").replace(" Floor","")}
                    </td>
                    <td style={{ padding: "11px 8px", textAlign: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "rgba(255,255,255,.08)" }}>
                        {SS.tier(a.tier)?.short}
                      </span>
                    </td>
                    <td style={{ padding: "11px 8px", textAlign: "center", fontSize: 14 }}>
                      {SS.FLAGS[a.lang] || ""}
                    </td>
                    {days.map(d => {
                      const card = agRoster.find(c => c.day === d.key);
                      return (
                        <td key={d.key} style={{ padding: "11px 7px", textAlign: "center" }}>
                          {card
                            ? <span title={card.shift} style={{ fontSize: 19 }}>{em(card.shift)}</span>
                            : <span style={{ opacity: .12 }}>·</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ============================================================
     Analytics Tab
     ============================================================ */
  function AnalyticsTab() {
    const heat = SS.SHIFT_HEAT || [];
    const vol  = SS.WEEKLY_VOLUME || [];
    const maxW = Math.max(...heat.map(h => h.wanted), 1);
    const maxV = Math.max(...vol.map(v => v.n), 1);

    const totalTrades = vol.reduce((s, v) => s + v.n, 0);
    const avgTrades   = vol.length ? (totalTrades / vol.length).toFixed(1) : 0;
    const topShift    = heat.length ? heat.reduce((a, b) => b.wanted > a.wanted ? b : a) : null;
    const leastWanted = heat.length ? heat.reduce((a, b) => b.wanted < a.wanted ? b : a) : null;

    return (
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Analytics</h2>
        <p style={{ fontSize: 13, opacity: .55, marginBottom: 28 }}>Shift demand and trade volume across the floor.</p>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total trades logged",  val: totalTrades,                   color: "#f5c518" },
            { label: "Avg per week",          val: avgTrades,                     color: "#60a5fa" },
            { label: "Most-wanted shift",     val: topShift ? `${em(topShift.shift)} ${SS.shift(topShift.shift)?.name}` : "—", color: "#a78bfa" },
          ].map(k => (
            <div key={k.label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 13, padding: "18px 20px", border: `1px solid ${k.color}18` }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, opacity: .5, marginTop: 6, fontWeight: 700 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Shift demand */}
        <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, padding: "22px 26px", border: "1px solid rgba(255,255,255,.07)", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 18 }}>Shift Demand Index</div>
          {heat.map(h => (
            <div key={h.shift} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <span style={{ fontSize: 20, width: 26, textAlign: "center", flexShrink: 0 }}>{em(h.shift)}</span>
              <span style={{ width: 120, fontSize: 12, fontWeight: 700, opacity: .7, flexShrink: 0 }}>{SS.shift(h.shift)?.name}</span>
              <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(h.wanted / maxW) * 100}%`, borderRadius: 999,
                  background: h.wanted > 60 ? "#f5c518" : h.wanted > 35 ? "#60a5fa" : "#6b7280", transition: "width .4s" }} />
              </div>
              <span style={{ width: 28, fontSize: 12, fontWeight: 800, textAlign: "right", opacity: .8, flexShrink: 0 }}>{h.wanted}</span>
              <span style={{ width: 72, fontSize: 10, opacity: .3, textAlign: "right", flexShrink: 0 }}>{h.posted} posted</span>
            </div>
          ))}
        </div>

        {/* Volume chart */}
        <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, padding: "22px 26px", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 20 }}>Weekly Trade Volume</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {vol.map(v => (
              <div key={v.wk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, opacity: .6 }}>{v.n}</span>
                <div style={{ width: "100%", height: `${(v.n / maxV) * 96}px`, background: "#f5c518", opacity: .75, borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                <span style={{ fontSize: 9, opacity: .35, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{v.wk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     Admin Dashboard Shell
     ============================================================ */
  function AdminDashboard({ offers, pendingRtm, schedule, onImported, onLogout }) {
    const [tab, setTab] = useState("upload");
    const TABS = [
      { key: "upload",    ic: "📤", label: "Upload Schedule" },
      { key: "trades",    ic: "🔥", label: "Active Trades"   },
      { key: "agents",    ic: "👥", label: "Agent List"      },
      { key: "analytics", ic: "📊", label: "Analytics"       },
    ];

    return (
      <div style={{ minHeight: "100vh", background: "#0b0b1a", color: "#eceef8", display: "flex", flexDirection: "column", fontFamily: "system-ui,-apple-system,sans-serif" }}>
        {/* Top bar */}
        <div style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", padding: "0 28px", gap: 16, background: "rgba(0,0,0,.2)", flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", gap: 10 }}>
            🃏 ShiftSwap
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(245,197,24,.14)", color: "#f5c518" }}>Admin</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, opacity: .4, fontWeight: 600 }}>
            Signed in as <b style={{ opacity: .75 }}>admin</b>
          </div>
          <button onClick={onLogout}
            style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            Sign out
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div style={{ width: 215, borderRight: "1px solid rgba(255,255,255,.05)", padding: "18px 10px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "11px 14px",
                  borderRadius: 9, border: "none", cursor: "pointer", textAlign: "left",
                  background: tab === t.key ? "rgba(245,197,24,.1)" : "transparent",
                  color: tab === t.key ? "#f5c518" : "rgba(255,255,255,.45)",
                  fontWeight: tab === t.key ? 800 : 600, fontSize: 13, transition: "background .15s, color .15s",
                }}>
                <span style={{ fontSize: 18 }}>{t.ic}</span>
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 10, opacity: .18, padding: "6px 14px", fontWeight: 600 }}>ShiftSwap v0.1</div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "34px 42px" }}>
            {tab === "upload"    && <UploadTab schedule={schedule} onImported={onImported} />}
            {tab === "trades"    && <TradesTab offers={offers} pendingRtm={pendingRtm} />}
            {tab === "agents"    && <AgentsTab schedule={schedule} />}
            {tab === "analytics" && <AnalyticsTab />}
          </div>
        </div>
      </div>
    );
  }

  window.AdminDashboard = AdminDashboard;
})();
