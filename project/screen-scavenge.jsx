/* ===========================================================================
   ShiftSwap — Scavenge (proactive trade hunting)
   Lets an agent find who holds a wanted shift on a given day,
   even if that person hasn't posted an offer yet.
   =========================================================================== */
(function () {
  const { useState } = React;

  /* --- Single result row -------------------------------------------------- */
  function ScavengeRow({ agent, dayEntry, wantDay, proposed, onPropose, lang }) {
    const SS = window.SS;
    const sent = proposed.has(agent.id);
    return (
      <div className="offer-row" style={{ cursor: "default", alignItems: "flex-start" }}>
        <div style={{ width: 80, flex: "0 0 auto" }}>
          <window.ShiftCard shiftKey={dayEntry.shift} size="sm" tilt={false}
            tierKey={agent.tier} lang={lang} langSpec={agent.lang} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 7, marginBottom: 5 }}>
            <div className="avatar sm">{SS.initials(agent.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, lineHeight: 1.1 }}>{agent.name}</div>
              <div className="faint" style={{ fontSize: 10, fontWeight: 700 }}>
                {SS.rankFor(agent.trades).badge} {agent.site}
              </div>
            </div>
            <span className="queue-pill">{SS.tier(agent.tier).label} · {SS.FLAGS[agent.lang]}</span>
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8, display: "flex", flexWrap: "wrap", gap: "2px 5px", alignItems: "flex-start" }}>
            <span className="faint" style={{ alignSelf: "center" }}>Has</span>
            <window.ShiftNameTime shiftKey={dayEntry.shift} size="sm" />
            <span className="faint" style={{ alignSelf: "center" }}>on {wantDay}</span>
          </div>

          <button
            className={"btn " + (sent ? "btn--ghost" : "btn--gold")}
            style={{ width: "100%", fontSize: 11.5, padding: "9px 8px", opacity: sent ? .65 : 1 }}
            disabled={sent}
            onClick={() => onPropose(agent.id, dayEntry)}>
            {sent ? "✓ Proposal sent" : "📤 Propose trade"}
          </button>
          {sent && (
            <div className="faint" style={{ fontSize: 10, fontWeight: 700, marginTop: 5, textAlign: "center" }}>
              They'll see a nudge to check the market
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --- Main Scavenge component -------------------------------------------- */
  function Scavenge() {
    const app  = React.useContext(window.SSCtx);
    const { lang, handCards, sendScavengeProposal } = app;
    const SS   = window.SS;
    const me   = SS.agent(SS.ME);

    const [myCardId, setMyCardId] = useState(null);
    const [wantDay,  setWantDay]  = useState(null);
    const [wantShift,setWantShift]= useState(null);
    const [results,  setResults]  = useState(null); // null = not yet searched
    const [proposed, setProposed] = useState(new Set());

    const myCard = handCards.find(c => c.id === myCardId);
    const shiftOpts = ["EARLY","MORNING","GRIND","GOLDEN","DUSK","OWL","CROWN"];

    function pickCard(c) {
      setMyCardId(c.id);
      setWantDay(c.day);   // default same day
      setWantShift(null);
      setResults(null);
    }

    function doScavenge() {
      const hits = [];
      Object.entries(SS.ROSTER).forEach(([aid, sched]) => {
        if (aid === SS.ME) return;
        const ag = SS.agent(aid);
        if (!ag || !SS.sameQueue(me, ag)) return;
        const match = sched.find(s => s.day === wantDay && s.shift === wantShift);
        if (match) hits.push({ agent: ag, dayEntry: match });
      });
      setResults(hits);
    }

    function propose(agentId, dayEntry) {
      setProposed(s => new Set([...s, agentId]));
      sendScavengeProposal({
        fromAgentId: SS.ME,
        toAgentId: agentId,
        fromCard: { ...myCard },
        toShift: dayEntry.shift,
        toDay: wantDay,
        toDate: dayEntry.date,
      });
    }

    const canScavenge = !!(myCard && wantShift && wantDay);

    return (
      <div className="screen-enter" style={{ paddingTop: 4 }}>

        {/* Intro */}
        <div className="glass" style={{ padding: 12, marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20 }}>🔦</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 12.5 }}>Proactive hunting</div>
            <div className="faint" style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>
              Find who holds the shift you want — even if they haven't posted yet.
              Only shows agents in your queue.
            </div>
          </div>
        </div>

        {/* Step 1 — pick my card */}
        <div className="section-label"><span>1 · Which card are you trading?</span></div>
        <div className="grid2" style={{ marginTop: 8, marginBottom: 4 }}>
          {handCards.map(c => (
            <div key={c.id} onClick={() => pickCard(c)}
                 style={{ cursor: "pointer", transform: myCardId === c.id ? "scale(.97)" : "none", transition: "transform .15s" }}>
              <window.ShiftCard shiftKey={c.shift}
                day={lang === "AR" ? null : c.day} date={c.date}
                tierKey={me.tier} lang={lang} langSpec={me.lang} tilt={false}
                className={myCardId === c.id ? "card-selected" : ""} />
            </div>
          ))}
        </div>

        {/* Step 2 — what do I want */}
        {myCard && (
          <>
            <div className="section-label" style={{ marginTop: 20 }}>
              <span>2 · What do you want back?</span>
            </div>

            <div className="faint" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 5 }}>
              On which day
            </div>
            <div className="chiprow chiprow--wrap" style={{ marginBottom: 14 }}>
              {SS.DAYS.map(d => (
                <button key={d.key}
                  className={"pill" + (wantDay === d.key ? " active" : "")}
                  onClick={() => { setWantDay(d.key); setResults(null); }}>
                  {d.key} · {d.date}
                </button>
              ))}
            </div>

            <div className="faint" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 5 }}>
              Which shift
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {shiftOpts.map(k => {
                const same = k === myCard.shift && wantDay === myCard.day;
                return (
                  <button key={k}
                    className={"pill" + (wantShift === k ? " active" : "") + (same ? " pill--owned" : "")}
                    onClick={same ? undefined : () => { setWantShift(k); setResults(null); }}
                    aria-disabled={same || undefined}
                    title={same ? "That's already your shift" : undefined}>
                    <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, lineHeight: 1.3, textAlign: "start" }}>
                      <span>{SS.shift(k).emoji} {SS.shift(k).name}</span>
                      <span style={{ fontSize: ".73em", opacity: .55, fontWeight: 600 }}>{SS.timeText(k)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button className="btn btn--gold btn--full"
              disabled={!canScavenge}
              style={{ opacity: canScavenge ? 1 : .45 }}
              onClick={doScavenge}>
              🔍 Scavenge
            </button>
          </>
        )}

        {/* Results */}
        {results !== null && (
          <>
            <div className="section-label" style={{ marginTop: 22 }}>
              <span>{SS.shift(wantShift).emoji} {SS.shift(wantShift).name} · {wantDay}</span>
              <span className="count">{results.length} in your queue</span>
            </div>

            {results.length === 0 ? (
              <div className="glass" style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>🌑</div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Nobody in your queue has this</div>
                <div className="faint" style={{ fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>
                  Try a different shift or day.
                </div>
              </div>
            ) : (
              <div className="offer-list">
                {results.map(({ agent, dayEntry }) => (
                  <ScavengeRow key={agent.id}
                    agent={agent} dayEntry={dayEntry} wantDay={wantDay}
                    proposed={proposed} onPropose={propose} lang={lang} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  window.Scavenge = Scavenge;
})();
