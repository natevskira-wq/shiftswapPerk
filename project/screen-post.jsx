/* ===========================================================================
   ShiftSwap — Post a Trade (unified, 3 steps)
   Kind auto-detected from selection:
     1 working shift   → time swap
     2+ working shifts → bundle
     1 Crown           → day off swap
     2+ Crowns         → multi-rest swap
   =========================================================================== */
(function () {
  const { useState } = React;

  function StepDots({ step }) {
    return (
      <div className="row" style={{ gap: 6, justifyContent: "center", margin: "2px 0 14px" }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            height: 5, borderRadius: 999, transition: "all .25s",
            width: n === step ? 26 : 16,
            background: n <= step ? "var(--gold)" : "var(--surface-3)",
          }} />
        ))}
      </div>
    );
  }

  const KIND_META = {
    time:          { icon: "⇄",  label: "Time Swap",           color: "#60a5fa" },
    bundle:        { icon: "📦", label: "Bundle",               color: "#f5c518" },
    rest:          { icon: "👑", label: "Day Off Swap",         color: "#a78bfa" },
    "rest-bundle": { icon: "👑", label: "Multi Rest Swap",      color: "#a78bfa" },
    mixed:         { icon: "⚠️", label: "Mixed — one type only", color: "#ef4444" },
  };

  function PostTrade() {
    const app = React.useContext(window.SSCtx);
    const { t, lang, handCards, listedIds, postOffer, postPreselect, clearPreselect } = app;
    const SS = window.SS;
    const me = SS.agent(SS.ME);
    const handCardsW2 = app.handCardsW2 || [];
    const allCards = [...handCards, ...handCardsW2];
    const available = allCards.filter(c => !listedIds.includes(c.id));
    const bundlePreselect = app.bundlePreselect || null;

    const initIds = () => {
      if (bundlePreselect) return new Set(bundlePreselect);
      if (postPreselect)   return new Set([postPreselect]);
      return new Set();
    };
    const [step, setStep]   = useState(() => (postPreselect || bundlePreselect) ? 2 : 1);
    const [selectedIds, setSelectedIds] = useState(initIds);
    const [wantTypes,   setWantTypes]  = useState([]);
    const [wantRestDay, setWantRestDay] = useState(null);
    const [wantRestDaysMap, setWantRestDaysMap] = useState({}); // { cardId: targetDay }
    const [flex, setFlex] = useState(false);
    const [note, setNote] = useState("Looking to swap this one.");
    const timeOptions = ["EARLY", "MORNING", "GRIND", "GOLDEN", "DUSK", "OWL"];

    // ── Derived from selectedIds ──────────────────────────────────────────────
    const selectedCards  = [...selectedIds].map(id => allCards.find(c => c.id === id)).filter(Boolean);
    const selectedCrowns = selectedCards.filter(c => c.shift === "CROWN");
    const selectedWork   = selectedCards.filter(c => c.shift !== "CROWN");
    const hasMix = selectedCrowns.length > 0 && selectedWork.length > 0;
    const detectedKind   = hasMix ? "mixed"
      : selectedWork.length === 1   ? "time"
      : selectedWork.length > 1     ? "bundle"
      : selectedCrowns.length === 1 ? "rest"
      : selectedCrowns.length > 1   ? "rest-bundle"
      : null;

    const card        = selectedCards[0] || null;
    const isTime      = detectedKind === "time";
    const isRest      = detectedKind === "rest";
    const isBundle    = detectedKind === "bundle";
    const isRestBundle = detectedKind === "rest-bundle";

    // for single rest swap
    const myWorkDays    = allCards.filter(c => c.shift !== "CROWN" && c.day !== (card && card.day));
    const targetRestCard = wantRestDay ? myWorkDays.find(c => c.day === wantRestDay) : null;

    // for rest-bundle: candidates for each Crown (exclude already picked + same day)
    function restBundleTargets(crownCard) {
      const taken = new Set(
        Object.entries(wantRestDaysMap)
          .filter(([id]) => id !== crownCard.id)
          .map(([, d]) => d)
      );
      return allCards.filter(c => c.shift !== "CROWN" && !taken.has(c.day) && c.day !== crownCard.day);
    }

    const step2Ready = isRest ? !!wantRestDay
      : isRestBundle ? selectedCrowns.every(c => wantRestDaysMap[c.id])
      : isBundle     ? wantTypes.length > 0
      : isTime       ? (flex || wantTypes.length > 0)
      : false;

    function toggleCard(c) {
      setSelectedIds(prev => {
        const n = new Set(prev);
        n.has(c.id) ? n.delete(c.id) : n.add(c.id);
        return n;
      });
      setWantTypes([]); setWantRestDay(null); setWantRestDaysMap({}); setFlex(false);
    }

    function submit() {
      if (isBundle) {
        postOffer({ kind: "bundle", bundleCardIds: [...selectedIds], wantTypes, note });
        if (app.clearBundlePreselect) app.clearBundlePreselect();
      } else if (isRestBundle) {
        const wantRestDaysList = selectedCrowns.map(c => wantRestDaysMap[c.id]);
        postOffer({ kind: "rest-bundle", bundleCardIds: [...selectedIds], wantRestDaysList, note });
      } else if (isRest && card) {
        postOffer({ cardId: card.id, wantRestDay, note });
      } else if (isTime && card) {
        postOffer({ cardId: card.id, wantTypes: flex ? timeOptions : wantTypes, flex, note });
      }
      clearPreselect();
    }

    return (
      <div className="screen-enter">
        <div className="faint" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center" }}>
          {t("step")} {step} / 3
        </div>
        <StepDots step={step} />

        {/* ================================================================
            STEP 1: unified card picker
            ================================================================ */}
        {step === 1 && (
          <div className="screen-enter">
            <h3 className="step-h">Pick your cards</h3>
            <p className="step-sub">Tap one or more — the trade type is detected automatically.</p>

            {/* Live kind indicator */}
            <div style={{ minHeight: 30, marginBottom: 8, display: "flex", justifyContent: "center", alignItems: "center" }}>
              {detectedKind && (() => {
                const m = KIND_META[detectedKind];
                const countLabel = detectedKind === "bundle" ? `${selectedCards.length}-Day Bundle`
                  : detectedKind === "rest-bundle" ? `${selectedCards.length}-Day Rest Swap`
                  : m.label;
                return (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 13px", borderRadius: 999,
                    background: m.color + "18", color: m.color, border: `1px solid ${m.color}44`,
                    display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {m.icon} {countLabel}
                  </span>
                );
              })()}
            </div>

            <div className="grid2" style={{ marginTop: 0 }}>
              {available.map(c => {
                const isSel = selectedIds.has(c.id);
                const wouldMix = !isSel && selectedIds.size > 0 &&
                  ((selectedCrowns.length > 0 && c.shift !== "CROWN") ||
                   (selectedWork.length > 0 && c.shift === "CROWN"));
                return (
                  <div key={c.id} onClick={() => !wouldMix && toggleCard(c)}
                    title={wouldMix ? "Can't mix rest days and working shifts" : undefined}
                    style={{ cursor: wouldMix ? "not-allowed" : "pointer", position: "relative",
                             opacity: wouldMix ? .28 : 1,
                             transform: isSel ? "scale(.97)" : "none" }}>
                    <window.ShiftCard shiftKey={c.shift} day={c.day} date={c.date}
                      tierKey={me.tier} lang={lang} langSpec={me.lang} tilt={false}
                      className={isSel ? "card-selected" : ""} />
                    {isSel && (
                      <div style={{ position: "absolute", top: 7, right: 7, zIndex: 10,
                        width: 22, height: 22, borderRadius: "50%",
                        background: "var(--gold)", color: "#2a1d00",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,.35)" }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>
            {available.length === 0 && (
              <p className="faint" style={{ textAlign: "center", padding: 30 }}>All your cards are already listed</p>
            )}
            {hasMix && (
              <p style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textAlign: "center", marginTop: 8 }}>
                Can't mix rest days and working shifts — pick one type only.
              </p>
            )}
            {detectedKind && detectedKind !== "mixed" && (
              <button className="btn btn--gold btn--full" style={{ marginTop: 14 }}
                onClick={() => setStep(2)}>
                Continue →
              </button>
            )}
          </div>
        )}

        {/* ================================================================
            STEP 2: TIME SWAP
            ================================================================ */}
        {step === 2 && isTime && card && (
          <div className="screen-enter">
            <h3 className="step-h">{t("whatWant")}</h3>
            <p className="step-sub">Same day, different time — pick the shift(s) you'd take.</p>
            <div className="offering-reco">
              <span className="offering-reco__emoji">{SS.shift(card.shift).emoji}</span>
              <span style={{ flex: 1 }}>
                <span className="offering-reco__lbl">You're offering</span>
                <span className="offering-reco__name" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <b>{SS.shift(card.shift).name}</b>
                  <span style={{ fontSize: ".8em", opacity: .6, fontWeight: 600 }}>{SS.timeText(card.shift)} · {card.day} {card.date}</span>
                </span>
              </span>
              <button className="offering-reco__change" onClick={() => setStep(1)}>Change</button>
            </div>
            <button className="glass flex-banner" onClick={() => setFlex(f => !f)}
              style={{ borderColor: flex ? "var(--gold)" : "var(--line)" }}>
              <span style={{ fontSize: 20 }}>🖐️</span>
              <span style={{ flex: 1, textAlign: "start" }}>
                <b style={{ fontSize: 13 }}>Any time this day</b>
                <span className="faint" style={{ display: "block", fontSize: 11, fontWeight: 600 }}>I'll take any {card.day} shift</span>
              </span>
              <span className="mini-toggle" data-on={flex}><span /></span>
            </button>
            {!flex && (
              <>
                <div className="section-label" style={{ marginTop: 16 }}>Times you'd take · {card.day}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {timeOptions.map(k => {
                    const same = k === card.shift;
                    return (
                      <button key={k}
                        className={"pill" + (wantTypes.includes(k) ? " active" : "") + (same ? " pill--owned" : "")}
                        onClick={same ? undefined : () => setWantTypes(w => w.includes(k) ? w.filter(x => x !== k) : [...w, k])}
                        aria-disabled={same || undefined}>
                        <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, lineHeight: 1.3, textAlign: "start" }}>
                          <span>{SS.shift(k).emoji} {SS.shift(k).name}</span>
                          <span style={{ fontSize: ".75em", opacity: .55, fontWeight: 600 }}>{SS.timeText(k)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <div className="row" style={{ gap: 10, marginTop: 22 }}>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>←</button>
              <button className="btn btn--gold" disabled={!step2Ready}
                style={{ flex: 3, opacity: step2Ready ? 1 : .5 }}
                onClick={() => setStep(3)}>{t("review")} →</button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 2: BUNDLE (working shifts)
            ================================================================ */}
        {step === 2 && isBundle && (
          <div className="screen-enter">
            <h3 className="step-h">📦 {selectedWork.length}-Day Bundle</h3>
            <p className="step-sub">Pick the shift you want back on all these days.</p>
            <div className="glass" style={{ padding: 12, marginTop: 10 }}>
              {selectedWork.map(c => (
                <div key={c.id} className="row" style={{ gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 18 }}>{SS.shift(c.shift).emoji}</span>
                  <span style={{ flex: 1 }}><window.ShiftNameTime shiftKey={c.shift} /></span>
                  <span className="faint" style={{ fontSize: 12, fontWeight: 700 }}>{c.day} {c.date}</span>
                </div>
              ))}
            </div>
            <div className="section-label" style={{ marginTop: 16 }}>What shift do you want back on each day?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {timeOptions.map(k => (
                <button key={k}
                  className={"pill" + (wantTypes.includes(k) ? " active" : "")}
                  onClick={() => setWantTypes(w => w.includes(k) ? w.filter(x => x !== k) : [...w, k])}>
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, lineHeight: 1.3, textAlign: "start" }}>
                    <span>{SS.shift(k).emoji} {SS.shift(k).name}</span>
                    <span style={{ fontSize: ".75em", opacity: .55, fontWeight: 600 }}>{SS.timeText(k)}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>←</button>
              <button className="btn btn--gold" disabled={!step2Ready}
                style={{ flex: 3, opacity: step2Ready ? 1 : .5 }}
                onClick={() => setStep(3)}>{t("review")} →</button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 2: SINGLE DAY OFF SWAP (one Crown)
            ================================================================ */}
        {step === 2 && isRest && card && (
          <div className="screen-enter">
            <h3 className="step-h">👑 Day Off Swap</h3>
            <p className="step-sub">Give up one rest day, gain a different one — both agents stay at 5 working days.</p>
            <div className="offering-reco">
              <span className="offering-reco__emoji">{SS.shift(card.shift).emoji}</span>
              <span style={{ flex: 1 }}>
                <span className="offering-reco__lbl">Giving up your day off</span>
                <span className="offering-reco__name"><b>{card.day} {card.date}</b></span>
              </span>
              <button className="offering-reco__change" onClick={() => setStep(1)}>Change</button>
            </div>
            <div className="section-label" style={{ marginTop: 16 }}>Which day do you want off instead?</div>
            <div className="chiprow chiprow--wrap">
              {myWorkDays.map(c => (
                <button key={c.id}
                  className={"pill" + (wantRestDay === c.day ? " active" : "")}
                  onClick={() => setWantRestDay(c.day)}>
                  {c.day} · {SS.shift(c.shift).emoji} {SS.shift(c.shift).name}
                </button>
              ))}
            </div>
            {targetRestCard && (
              <div style={{ background: "rgba(245,197,24,.07)", border: "1px solid rgba(245,197,24,.2)", borderRadius: 12, padding: "13px 15px", marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: .55, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Your schedule change</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ fontSize: 10, opacity: .5, fontWeight: 700, marginBottom: 5 }}>{card.day} — giving up</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 20 }}>👑</span><span style={{ opacity: .3, fontSize: 11 }}>→</span>
                      <span style={{ fontSize: 20 }}>{SS.shift(targetRestCard.shift)?.emoji}</span>
                    </div>
                    <div style={{ fontSize: 10, opacity: .4, marginTop: 4 }}>day off → work day</div>
                  </div>
                  <div style={{ background: "rgba(245,197,24,.1)", borderRadius: 8, padding: "9px 11px" }}>
                    <div style={{ fontSize: 10, opacity: .5, fontWeight: 700, marginBottom: 5 }}>{wantRestDay} — new day off</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 20 }}>{SS.shift(targetRestCard.shift)?.emoji}</span><span style={{ opacity: .3, fontSize: 11 }}>→</span>
                      <span style={{ fontSize: 20 }}>👑</span>
                    </div>
                    <div style={{ fontSize: 10, opacity: .4, marginTop: 4 }}>work day → day off</div>
                  </div>
                </div>
              </div>
            )}
            <p className="faint" style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>
              We'll match you with someone who rests on {wantRestDay || "your chosen day"} and works {card.day}.
            </p>
            <div className="row" style={{ gap: 10, marginTop: 22 }}>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>←</button>
              <button className="btn btn--gold" disabled={!step2Ready}
                style={{ flex: 3, opacity: step2Ready ? 1 : .5 }}
                onClick={() => setStep(3)}>{t("review")} →</button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 2: MULTI REST SWAP (2+ Crowns)
            ================================================================ */}
        {step === 2 && isRestBundle && (
          <div className="screen-enter">
            <h3 className="step-h">👑 Multi Rest Swap</h3>
            <p className="step-sub">For each day off you're giving up, pick a working day you want off instead.</p>

            {selectedCrowns.map(crownCard => {
              const targets = restBundleTargets(crownCard);
              const picked  = wantRestDaysMap[crownCard.id];
              return (
                <div key={crownCard.id} style={{ marginTop: 14 }}>
                  <div className="section-label" style={{ marginTop: 0 }}>
                    <span>👑 {crownCard.day} {crownCard.date} — want off on:</span>
                    {picked && <span style={{ color: "var(--gold)", fontWeight: 800 }}>{picked} ✓</span>}
                  </div>
                  <div className="chiprow chiprow--wrap">
                    {targets.map(tgt => (
                      <button key={tgt.id}
                        className={"pill" + (picked === tgt.day ? " active" : "")}
                        onClick={() => setWantRestDaysMap(m => ({ ...m, [crownCard.id]: tgt.day }))}>
                        {tgt.day} · {SS.shift(tgt.shift).emoji} {SS.shift(tgt.shift).name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {selectedCrowns.some(c => wantRestDaysMap[c.id]) && (
              <div style={{ background: "rgba(245,197,24,.07)", border: "1px solid rgba(245,197,24,.18)", borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: .55, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Schedule changes</div>
                {selectedCrowns.map(c => {
                  const target = wantRestDaysMap[c.id];
                  const tCard  = target ? allCards.find(x => x.day === target && x.shift !== "CROWN") : null;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, padding: "4px 0" }}>
                      <span>👑 {c.day}</span>
                      <span style={{ opacity: .3 }}>→</span>
                      <span style={{ opacity: tCard ? 1 : .35 }}>{tCard ? SS.shift(tCard.shift)?.emoji : "?"} {c.day} works</span>
                      <span style={{ opacity: .25, marginLeft: "auto" }}>·</span>
                      <span style={{ opacity: target ? 1 : .35, marginLeft: "auto" }}>
                        {target ? `gain 👑 ${target}` : "pick a day →"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>←</button>
              <button className="btn btn--gold" disabled={!step2Ready}
                style={{ flex: 3, opacity: step2Ready ? 1 : .5 }}
                onClick={() => setStep(3)}>{t("review")} →</button>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 3: REVIEW (all kinds)
            ================================================================ */}
        {step === 3 && (
          <div className="screen-enter">
            <h3 className="step-h">{t("review")}</h3>

            {/* Card fan preview */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 10, marginBottom: 4 }}>
              {selectedCards.slice(0, 3).map((c, i) => (
                <div key={c.id} style={{
                  width: isTime ? 168 : 80,
                  transform: selectedCards.length > 1
                    ? `rotate(${(i - (Math.min(selectedCards.length, 3) - 1) / 2) * 3}deg) translateY(${i === 1 && selectedCards.length >= 3 ? 0 : 5}px)`
                    : "none" }}>
                  <window.ShiftCard shiftKey={c.shift} day={c.day} date={c.date}
                    size={isTime ? undefined : "sm"}
                    tierKey={me.tier} lang={lang} langSpec={me.lang}
                    trades={isTime ? app.trades : undefined} showRank={isTime} tilt={false} />
                </div>
              ))}
            </div>

            <div className="glass" style={{ padding: 14, marginTop: 14 }}>
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="faint" style={{ fontWeight: 700 }}>Offering</span>
                <b style={{ textAlign: "end" }}>
                  {isTime       && `${SS.shift(card.shift).name} · ${card.day}`}
                  {isRest       && `👑 ${card.day} off`}
                  {isBundle     && selectedWork.map(c => c.day).join(" + ")}
                  {isRestBundle && selectedCrowns.map(c => `👑 ${c.day}`).join(" + ")}
                </b>
              </div>
              <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="faint" style={{ fontWeight: 700 }}>{t("wants")}</span>
                <b style={{ textAlign: "end", maxWidth: "65%" }}>
                  {isTime       && (flex ? `Any ${card.day}` : wantTypes.map(k => SS.shift(k).name).join(" / "))}
                  {isRest       && `👑 ${wantRestDay} off`}
                  {isBundle     && (wantTypes.length > 0 ? wantTypes.map(k => SS.shift(k).name).join(" / ") + " each day" : "Any shift · each day")}
                  {isRestBundle && selectedCrowns.map(c => `👑 ${wantRestDaysMap[c.id] || "?"}`).join(" + ")}
                </b>
              </div>
              {(isRest || isRestBundle) && (
                <div className="cap-note">🛡️ Both stay at 5 working days</div>
              )}
            </div>

            <div className="section-label" style={{ marginTop: 16 }}>
              <span>Your note</span>
              <span className="faint" style={{ fontWeight: 700, fontSize: 11 }}>shows on market card</span>
            </div>
            <textarea className="note-input" rows={2} maxLength={140}
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Looking to swap this one." />
            <div className="faint" style={{ fontSize: 10, fontWeight: 700, textAlign: "end", marginTop: 2 }}>{note.length}/140</div>

            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>←</button>
              <button className="btn btn--gold" style={{ flex: 3 }} onClick={submit}>
                📤 {t("postToMarket")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  window.PostTrade = PostTrade;
})();
