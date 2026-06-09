/* ===========================================================================
   ShiftSwap — My Hand (home)
   =========================================================================== */
(function () {
  const { useState } = React;

  function ScavengeProposalSection({ proposals, onAccept, onDecline, lang }) {
    const SS = window.SS;
    if (!proposals || proposals.length === 0) return null;
    return (
      <>
        <div className="section-label" style={{ marginTop: 22 }}>
          <span>📬 Pending Approval</span>
          <span className="count">{proposals.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proposals.map(p => {
            const from = SS.agent(p.fromAgentId);
            const to   = SS.agent(p.toAgentId);
            return (
              <div key={p.id} className="glass"
                style={{ padding: 14, borderLeft: "3px solid oklch(60% 0.14 240)", display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Who → who */}
                <div className="row" style={{ gap: 9 }}>
                  <div className="avatar sm">{SS.initials(from.name)}</div>
                  <span style={{ opacity: .35, fontSize: 13 }}>→</span>
                  <div className="avatar sm">{SS.initials(to.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{from.name.split(" ")[0]} → {to.name.split(" ")[0]}</div>
                    <div className="faint" style={{ fontSize: 10.5, fontWeight: 700 }}>{p.toDay} {p.toDate} · 🔦 Scavenge proposal</div>
                  </div>
                  <span className="matchbadge" style={{ background: "rgba(99,179,237,.12)", color: "oklch(60% 0.14 240)", boxShadow: "none", fontSize: 10, whiteSpace: "nowrap" }}>⏳ Awaiting</span>
                </div>

                {/* Swap */}
                <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="faint" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em" }}>{from.name.split(" ")[0]} gives</span>
                    <window.ShiftNameTime shiftKey={p.fromCard.shift} size="sm" />
                  </span>
                  <span style={{ opacity: .3, fontSize: 16 }}>⇄</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="faint" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em" }}>{to.name.split(" ")[0]} gives</span>
                    <window.ShiftNameTime shiftKey={p.toShift} size="sm" />
                  </span>
                </div>

                {/* Actions */}
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn--gold"
                    style={{ flex: 1, fontSize: 11, padding: "10px 6px", lineHeight: 1.4 }}
                    onClick={() => onAccept(p.id)}>
                    ✅ Accept &amp; Trade
                  </button>
                  <button className="btn btn--ghost"
                    style={{ flex: 1, fontSize: 11, padding: "10px 6px", lineHeight: 1.4, borderColor: "rgba(239,68,68,.35)", color: "#ef4444" }}
                    onClick={() => onDecline(p.id)}>
                    ❌ Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  function PendingRtmSection({ pending, onApprove, onDecline, lang }) {
    const SS = window.SS;
    const me = SS.agent(SS.ME);
    if (!pending || pending.length === 0) return null;
    return (
      <>
        <div className="section-label" style={{ marginTop: 22 }}>
          <span>⏳ Waiting on RTM</span>
          <span className="count">{pending.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.map(entry => {
            const { id, offer, myCard, bundleLegs, sealedAt } = entry;
            const poster = SS.agent(offer.agent);
            const isRest = offer.kind === "rest";
            const isBundle = offer.kind === "bundle";
            return (
              <div key={id} className="glass" style={{ padding: 14, borderLeft: "3px solid var(--gold)", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Agents + date */}
                <div className="row" style={{ gap: 9 }}>
                  <div className="avatar sm">{SS.initials(me.name)}</div>
                  <span style={{ opacity: .35, fontSize: 13 }}>⇄</span>
                  <div className="avatar sm">{SS.initials(poster.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{me.name.split(" ")[0]} ↔ {poster.name.split(" ")[0]}</div>
                    <div className="faint" style={{ fontSize: 10.5, fontWeight: 700 }}>{isBundle ? bundleLegs.map(l => l.day).join(" + ") : `${offer.day} ${offer.date}`} · sealed {sealedAt}</div>
                  </div>
                  <span className="matchbadge" style={{ background: "rgba(245,197,24,.15)", color: "var(--gold)", boxShadow: "none", fontSize: 10, whiteSpace: "nowrap" }}>⏳ Pending</span>
                </div>

                {/* Shifts being swapped */}
                <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "9px 12px" }}>
                  {isBundle ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)" }}>📦 {bundleLegs.length}-day bundle</div>
                      {bundleLegs.map((l, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, fontWeight: 700 }}>
                          <span style={{ width: 56, flex: "0 0 auto", opacity: .6 }}>{l.day} {l.date}</span>
                          <window.ShiftNameTime shiftKey={l.myCard.shift} size="sm" />
                          <span style={{ opacity: .3, fontSize: 14 }}>⇄</span>
                          <window.ShiftNameTime shiftKey={l.theirShift} size="sm" />
                        </div>
                      ))}
                    </div>
                  ) : isRest ? (
                    <div style={{ fontSize: 12, fontWeight: 700 }}>🔁 Rest-day swap · {offer.day} ↔ {offer.wantRestDay}</div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 700 }}>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className="faint" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em" }}>you give</span>
                        <window.ShiftNameTime shiftKey={myCard ? myCard.shift : offer.wantType[0]} size="sm" />
                      </span>
                      <span style={{ opacity: .3, fontSize: 16 }}>⇄</span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className="faint" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em" }}>you get</span>
                        <window.ShiftNameTime shiftKey={offer.offered} size="sm" />
                      </span>
                    </div>
                  )}
                </div>

                {/* RTM message — copy any time before RTM acts */}
                {entry.rtmMsg && (
                  <div style={{ background: "var(--surface-2)", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, opacity: .5, padding: "8px 12px 2px", textTransform: "uppercase", letterSpacing: ".06em" }}>📋 Message for your RTM</div>
                    <pre style={{ fontSize: 10.5, fontFamily: "monospace", padding: "4px 12px 10px", margin: 0, whiteSpace: "pre-wrap", opacity: .7, lineHeight: 1.55, maxHeight: 120, overflowY: "auto" }}>{entry.rtmMsg}</pre>
                    <button
                      onClick={() => navigator.clipboard?.writeText(entry.rtmMsg).catch(() => {})}
                      style={{ width: "100%", padding: "8px", border: "none", borderTop: "1px solid var(--line)", background: "transparent", color: "var(--gold)", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>
                      ⧉ Copy message
                    </button>
                  </div>
                )}

                {/* Calabrio reminder */}
                <div style={{ fontSize: 11.5, fontWeight: 700, background: "rgba(245,197,24,.09)", border: "1px solid rgba(245,197,24,.28)", borderRadius: 7, padding: "8px 11px" }}>
                  📋 Check Calabrio to see if your schedule updated
                </div>

                {/* Action buttons */}
                <div className="row" style={{ gap: 8 }}>
                  <button
                    className="btn btn--gold"
                    style={{ flex: 1, fontSize: 11, padding: "10px 6px", lineHeight: 1.4 }}
                    onClick={() => onApprove(id)}>
                    ✅ RTM Approved —{" "}<br />I see it in Calabrio
                  </button>
                  <button
                    className="btn btn--ghost"
                    style={{ flex: 1, fontSize: 11, padding: "10px 6px", lineHeight: 1.4, borderColor: "rgba(239,68,68,.35)", color: "#ef4444" }}
                    onClick={() => onDecline(id)}>
                    ❌ RTM Declined —{" "}<br />reopen this trade
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  function MyHand() {
    const app = React.useContext(window.SSCtx);
    const { t, lang, flexible, setFlexible, handCards, openCard, trades, listedIds,
            pendingRtm, approveRtm, declineRtm,
            scavengeProposals, acceptScavengeProposal, declineScavengeProposal,
            handCardsW2, scheduleAlerts, onDismissAlert } = app;
    const SS = window.SS;
    const me = SS.agent(SS.ME);
    const rank = SS.rankFor(trades);
    const next = SS.nextRank(trades);
    const [weekTab, setWeekTab] = useState(1);
    const displayCards = weekTab === 1 ? handCards : (handCardsW2 || []);
    const restDays = displayCards.filter(c => c.shift === "CROWN").length;

    const [pulled, setPulled] = useState(null); // index hovered/active

    return (
      <div className="screen-enter">
        {/* identity strip */}
        <div className="glass" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{SS.initials(me.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{me.name}</div>
            <div className="faint" style={{ fontSize: 12, fontWeight: 700 }}>
              {me.site} · {me.team} · {SS.tier(me.tier).label}
            </div>
          </div>
          <div style={{ textAlign: lang === "AR" ? "left" : "right" }}>
            <div style={{ fontSize: 20 }}>{rank.badge}</div>
            <div className="faint" style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".04em" }}>
              {lang === "AR" ? rank.ar : rank.name}
            </div>
          </div>
        </div>

        {/* flexible toggle */}
        <button
          onClick={() => setFlexible(f => !f)}
          className="glass"
          style={{
            width: "100%", textAlign: "start", padding: 14, marginTop: 10, cursor: "pointer",
            border: flexible ? "1px solid var(--gold)" : "1px solid var(--line)",
            background: flexible ? "linear-gradient(120deg, rgba(245,197,24,.16), rgba(245,197,24,.05))" : "var(--surface)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
          <div style={{ fontSize: 24 }}>{flexible ? "🖐️" : "✋"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              {t("flexible")}
              {flexible && <span className="matchbadge" style={{ background: "linear-gradient(120deg,#ffe9a8,#f5c518)", color: "#2a1d00", boxShadow: "none" }}>{t("openHand")}</span>}
            </div>
            <div className="faint" style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>
              {flexible ? t("flexibleOn") : t("flexibleSub")}
            </div>
          </div>
          <div style={{
            width: 46, height: 28, borderRadius: 999, flex: "0 0 auto", position: "relative",
            background: flexible ? "var(--gold)" : "var(--surface-3)", transition: "background .2s",
          }}>
            <div style={{
              position: "absolute", top: 3, insetInlineStart: flexible ? 21 : 3,
              width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "inset-inline-start .2s",
              boxShadow: "0 2px 4px rgba(0,0,0,.3)",
            }} />
          </div>
        </button>

        {/* schedule change alerts */}
        {(scheduleAlerts || []).filter(a => a.agentId === SS.ME).map((alert, idx) => (
          <div key={idx} style={{ background: "rgba(245,197,24,.1)", border: "1px solid rgba(245,197,24,.28)", borderRadius: 10, padding: "12px 14px", marginTop: 12, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{alert.msg}</div>
            <button onClick={() => onDismissAlert && onDismissAlert(scheduleAlerts.indexOf(alert))}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, opacity: .4, color: "inherit", padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        ))}

        {/* the hand */}
        <div className="section-label" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{t("thisWeek")} · {weekTab === 1 ? SS.WEEK_START.slice(5).replace("-", "/") : (SS.WEEK2_START || "").slice(5).replace("-", "/")}</span>
            <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,.14)" }}>
              {[1, 2].map(n => (
                <button key={n} onClick={() => setWeekTab(n)}
                  style={{ padding: "3px 11px", fontSize: 10, fontWeight: 800, border: "none", cursor: "pointer",
                    background: weekTab === n ? "var(--gold)" : "transparent",
                    color: weekTab === n ? "#1a1200" : "rgba(255,255,255,.45)" }}>
                  Wk {n}
                </button>
              ))}
            </div>
          </div>
          <span className="count">{displayCards.length} {t("shifts")} · {restDays} {t("restDays")}</span>
        </div>

        <div className="hand-fan">
          {displayCards.map((c, i) => {
            const mid = (displayCards.length - 1) / 2;
            const rot = (i - mid) * 2.6;
            const ty = Math.abs(i - mid) * 5;
            const lift = pulled === i ? 22 : 0;
            const listed = listedIds.includes(c.id);
            const canTrade = true;
            return (
              <div key={c.id} className="hand-card-wrap"
                   style={{ transform: `rotate(${rot}deg) translateY(${ty - lift}px)${lift ? " scale(1.05)" : ""}`, zIndex: pulled === i ? 30 : 10 }}
                   onMouseEnter={() => setPulled(i)} onMouseLeave={() => setPulled(null)}>
                <div style={{ width: 104, opacity: listed ? .55 : 1, position: "relative" }}>
                  <window.ShiftCard shiftKey={c.shift} day={lang === "AR" ? null : c.day} date={c.date}
                    tierKey={me.tier} lang={lang} langSpec={me.lang}
                    onClick={() => openCard(c)} />
                  {listed && <div className="listed-tag">{t("live")} ●</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* rank progress */}
        {next && (
          <div className="glass" style={{ padding: 14, marginTop: 22 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{rank.badge} {lang === "AR" ? rank.ar : rank.name}</div>
              <div className="faint" style={{ fontSize: 12, fontWeight: 700 }}>
                {next.min - trades} {t("trades")} {t("toNext")} {next.badge}
              </div>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${Math.min(100, ((trades - rank.min) / (next.min - rank.min)) * 100)}%`,
                background: "linear-gradient(90deg, var(--gold-soft), var(--gold))",
              }} />
            </div>
          </div>
        )}

        <p className="faint" style={{ textAlign: "center", fontSize: 11, fontWeight: 600, marginTop: 18 }}>
          {lang === "AR" ? "اضغط على بطاقة لعرضها للتبديل" : "Tap any card to put it up for trade"}
        </p>

        <ScavengeProposalSection proposals={scavengeProposals} onAccept={acceptScavengeProposal} onDecline={declineScavengeProposal} lang={lang} />
        <PendingRtmSection pending={pendingRtm} onApprove={approveRtm} onDecline={declineRtm} lang={lang} />
      </div>
    );
  }

  window.MyHand = MyHand;
})();
