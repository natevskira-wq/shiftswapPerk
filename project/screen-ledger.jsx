/* ===========================================================================
   ShiftSwap — The Ledger (agent timeline + manager dashboard)
   =========================================================================== */
(function () {
  const { useState } = React;

  function Bar({ label, value, max, color, sub }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <div className="row between" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          <span>{label}</span>
          <span className="num faint">{sub || value}</span>
        </div>
        <div style={{ height: 9, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(value / max) * 100}%`, borderRadius: 999, background: color, transition: "width .6s" }} />
        </div>
      </div>
    );
  }

  function AgentLedger() {
    const app = React.useContext(window.SSCtx);
    const { t, lang, trades } = app;
    const SS = window.SS;
    const me = SS.agent(SS.ME);
    const rank = SS.rankFor(trades);
    const next = SS.nextRank(trades);
    const history = SS.MY_HISTORY;

    return (
      <div className="screen-enter">
        {/* rank hero */}
        <div className="glass rank-hero">
          <div className="rank-badge-xl">{rank.badge}</div>
          <div style={{ flex: 1 }}>
            <div className="faint" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{t("myRank")}</div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 22, lineHeight: 1.1 }}>
              {lang === "AR" ? rank.ar : rank.name}
            </div>
            <div className="num" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 800, marginTop: 2 }}>
              {trades} {t("trades")}
            </div>
          </div>
        </div>

        {next && (
          <div className="glass" style={{ padding: 14, marginTop: 12 }}>
            <div className="row between" style={{ marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
              <span>{rank.badge} {lang==="AR"?rank.ar:rank.name}</span>
              <span className="faint">{next.badge} {lang==="AR"?next.ar:next.name}</span>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg,var(--gold-soft),var(--gold))",
                width: `${Math.min(100, ((trades - rank.min) / (next.min - rank.min)) * 100)}%` }} />
            </div>
            <div className="faint" style={{ fontSize: 11, fontWeight: 700, marginTop: 7, textAlign: "center" }}>
              {next.min - trades} {t("trades")} {t("toNext")}
            </div>
          </div>
        )}

        {/* history timeline */}
        <div className="section-label">{t("tradeHistory")}</div>
        <div className="timeline">
          {history.map(h => {
            const other = SS.agent(h.with);
            return (
              <div key={h.id} className="tl-row">
                <div className="tl-dot" />
                <div className="glass" style={{ padding: 11, flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 46, flex: "0 0 auto" }}>
                    <window.ShiftCard shiftKey={h.got} size="sm" tilt={false} lang={lang} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "2px 5px" }}>
                      <span className="faint" style={{ alignSelf: "center" }}>{t("gave")}</span>
                      <span style={{ display: "inline-flex", flexDirection: "column", gap: 1 }}>
                        <span>{SS.shift(h.gave)[lang==="AR"?"ar":"name"]}</span>
                        <span style={{ fontSize: ".72em", opacity: .55, fontWeight: 600 }}>{SS.timeText(h.gave)}</span>
                      </span>
                      <span style={{ color: "var(--gold)", alignSelf: "center" }}>→</span>
                      <span className="faint" style={{ alignSelf: "center" }}>{t("got")}</span>
                      <span style={{ display: "inline-flex", flexDirection: "column", gap: 1 }}>
                        <span>{SS.shift(h.got)[lang==="AR"?"ar":"name"]}</span>
                        <span style={{ fontSize: ".72em", opacity: .55, fontWeight: 600 }}>{SS.timeText(h.got)}</span>
                      </span>
                    </div>
                    <div className="faint" style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                      {t("with")} {other.name} · {h.date} · +{h.xp} {t("xp")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function ManagerLedger() {
    const app = React.useContext(window.SSCtx);
    const { t, lang } = app;
    const SS = window.SS;
    const heat = SS.SHIFT_HEAT;
    const vol = SS.WEEKLY_VOLUME;
    const maxVol = Math.max(...vol.map(v => v.n));
    const leaders = [...SS.AGENTS].sort((a, b) => b.trades - a.trades).slice(0, 5);
    const crown = heat.find(h => h.shift === "CROWN");

    const tierAgg = {};
    SS.AGENTS.forEach(a => {
      const lab = SS.tier(a.tier).label;
      tierAgg[lab] = (tierAgg[lab] || 0) + a.trades;
    });
    const tierRows = Object.entries(tierAgg).sort((a, b) => b[1] - a[1]);
    const maxTier = Math.max(...tierRows.map(r => r[1]));

    return (
      <div className="screen-enter">
        {/* Crown Index */}
        <div className="glass crown-index">
          <div style={{ fontSize: 30 }}>👑</div>
          <div style={{ flex: 1 }}>
            <div className="faint" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{t("crownIndex")}</div>
            <div className="faint" style={{ fontSize: 11, fontWeight: 600 }}>{t("crownSub")}</div>
          </div>
          <div className="num" style={{ fontSize: 34, fontWeight: 800, color: "var(--gold)" }}>{crown.wanted}</div>
        </div>

        {/* Heatmap */}
        <div className="section-label">{t("heatmap")}</div>
        <div className="glass" style={{ padding: 14 }}>
          {heat.map(h => (
            <div key={h.shift} className="heat-row">
              <div className="row" style={{ gap: 7, width: 118, flex: "0 0 auto" }}>
                <span style={{ fontSize: 16 }}>{SS.shift(h.shift).emoji}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>{SS.shift(h.shift)[lang==="AR"?"ar":"name"]}</span>
                  <span style={{ fontSize: 9.5, opacity: .5, fontWeight: 600 }}>{SS.timeText(h.shift)}</span>
                </span>
              </div>
              <div className="heat-track">
                <div className="heat-wanted" style={{ width: `${h.wanted}%` }} title={`${t("wanted")} ${h.wanted}`} />
                <div className="heat-avoided" style={{ width: `${h.avoided}%` }} title={`${t("avoided")} ${h.avoided}`} />
              </div>
            </div>
          ))}
          <div className="row" style={{ gap: 14, marginTop: 10, fontSize: 10.5, fontWeight: 700 }}>
            <span className="row" style={{ gap: 5 }}><i className="dot" style={{ background: "var(--green)" }} /> {t("wanted")}</span>
            <span className="row" style={{ gap: 5 }}><i className="dot" style={{ background: "var(--red)" }} /> {t("avoided")}</span>
          </div>
        </div>

        {/* Weekly volume */}
        <div className="section-label">{t("weeklyVol")}</div>
        <div className="glass" style={{ padding: "16px 14px 10px" }}>
          <div className="vol-chart">
            {vol.map(v => (
              <div key={v.wk} className="vol-col">
                <div className="vol-bar" style={{ height: `${(v.n / maxVol) * 100}%` }}><span className="vol-n">{v.n}</span></div>
                <div className="vol-x">{v.wk.split(" ")[1]}</div>
              </div>
            ))}
          </div>
          <div className="faint" style={{ textAlign: "center", fontSize: 10, fontWeight: 700, marginTop: 4 }}>Apr → May</div>
        </div>

        {/* Leaderboard */}
        <div className="section-label">{t("leaderboard")}</div>
        <div className="glass" style={{ padding: 8 }}>
          {leaders.map((a, i) => (
            <div key={a.id} className="lead-row">
              <div className={"lead-rank r" + i}>{i + 1}</div>
              <div className="avatar sm">{SS.initials(a.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800 }}>{a.name} {a.flexible && "🖐️"}</div>
                <div className="faint" style={{ fontSize: 10.5, fontWeight: 700 }}>{SS.rankFor(a.trades).badge} {a.site}</div>
              </div>
              <div className="num" style={{ fontWeight: 800, color: "var(--gold)" }}>{a.trades}</div>
            </div>
          ))}
        </div>

        {/* Tier activity */}
        <div className="section-label">{t("tierActivity")}</div>
        <div className="glass" style={{ padding: 14 }}>
          {tierRows.map(([lab, n]) => (
            <Bar key={lab} label={lab} value={n} max={maxTier} color="linear-gradient(90deg,#a855f7,#6d28d9)" sub={`${n} ${t("trades")}`} />
          ))}
        </div>
      </div>
    );
  }

  function Ledger() {
    const app = React.useContext(window.SSCtx);
    const { t } = app;
    const [view, setView] = useState("agent");
    return (
      <div>
        <div className="seg">
          <button className={view === "agent" ? "on" : ""} onClick={() => setView("agent")}>{t("agentView")}</button>
          <button className={view === "mgr" ? "on" : ""} onClick={() => setView("mgr")}>{t("managerView")}</button>
        </div>
        {view === "agent" ? <AgentLedger /> : <ManagerLedger />}
      </div>
    );
  }

  window.Ledger = Ledger;
})();
