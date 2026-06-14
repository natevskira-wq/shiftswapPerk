/* ===========================================================================
   ShiftSwap — The Market (browse + matching logic)
   =========================================================================== */
(function () {
  const { useState, useMemo } = React;

  function MarketCardRow({ offer, isMatch, owned, onOpen, lang }) {
    const SS = window.SS;
    const poster = SS.agent(offer.agent);
    const t = (k) => window.SS_I18N.t(lang, k);
    const isRest = offer.kind === "rest";
    const isBundle = offer.kind === "bundle";
    const isRestBundle = offer.kind === "rest-bundle";
    const wantNames = (isRest || isBundle || isRestBundle) ? [] : offer.wantType.map(w => SS.shift(w).name);
    return (
      <button className={"offer-row" + (isMatch ? " is-match" : "") + (owned ? " is-owned" : "")}
        onClick={owned ? undefined : () => onOpen(offer)}
        aria-disabled={owned || undefined}
        title={owned ? "You already have this shift" : undefined}>
        <div style={{ width: 92, flex: "0 0 auto", position: "relative" }}>
          {isBundle ? (
            <div style={{ position: "relative", height: 128 }}>
              {offer.bundleCards.slice(0, 2).map((bc, i) => (
                <div key={i} style={{
                  position: "absolute", top: i * 6, left: i * 4,
                  right: -(i * 4), zIndex: 2 - i,
                  opacity: i === 0 ? 1 : 0.55,
                  transform: `rotate(${i === 0 ? 0 : 3}deg)`,
                }}>
                  <window.ShiftCard shiftKey={bc.shift} size="sm" tilt={false}
                    tierKey={poster.tier} lang={lang} langSpec={poster.lang} />
                </div>
              ))}
              <div style={{
                position: "absolute", bottom: -4, right: -4, zIndex: 4,
                background: "var(--gold)", color: "#2a1d00",
                fontSize: 10, fontWeight: 800, padding: "2px 7px",
                borderRadius: 999, boxShadow: "0 2px 6px rgba(0,0,0,.3)",
                whiteSpace: "nowrap",
              }}>📦 {offer.bundleCards.length}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="gives-tag">{lang === "AR" ? "يعرض" : "Offers"}</span>
              <window.ShiftCard shiftKey={offer.offered} size="sm" tilt={false} disabled={owned}
                tierKey={poster.tier} lang={lang} langSpec={poster.lang} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
          <div className="row between" style={{ marginBottom: 4 }}>
            <div className="row" style={{ gap: 7 }}>
              <div className="avatar sm">{SS.initials(poster.name)}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12.5, lineHeight: 1.1 }}>{poster.name}</div>
                <div className="faint" style={{ fontSize: 10, fontWeight: 700 }}>
                  {SS.rankFor(poster.trades).badge} {poster.site}
                </div>
              </div>
            </div>
            {isMatch && <span className="matchbadge">★ {t("match")}</span>}
          </div>
          {isBundle ? (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-dim)", marginBottom: 5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 6px" }}>
              <span className="badge-double">📦 {offer.bundleCards.length}-DAY BUNDLE</span>
              <span>{offer.bundleCards.map(bc => bc.day).join(" + ")}</span>
              {offer.wantType && offer.wantType.length > 0 && <>
                <span className="faint">· wants</span>
                {offer.wantType.map((w, wi) => (
                  <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {wi > 0 && <span style={{ opacity: .35 }}>/</span>}
                    <window.ShiftNameTime shiftKey={w} lang={lang} size="sm" />
                  </span>
                ))}
                <span className="faint">each day</span>
              </>}
            </div>
          ) : isRestBundle ? (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-dim)", marginBottom: 5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px 6px" }}>
              <span className="badge-double">👑 MULTI REST SWAP</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ opacity: .55 }}>{offer.bundleCards?.map(bc => `👑 ${bc.day}`).join(" + ")}</span>
                <span style={{ opacity: .3, fontSize: 11 }}>→</span>
                <span style={{ color: "var(--ink)" }}>{(offer.wantRestDaysList || []).map(d => `👑 ${d}`).join(" + ")}</span>
              </span>
            </div>
          ) : isRest ? (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-dim)", marginBottom: 5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px 6px" }}>
              <span className="badge-double">👑 DAY OFF SWAP</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ opacity: .5 }}>👑 {offer.day}</span>
                <span style={{ opacity: .3, fontSize: 11 }}>→</span>
                <span style={{ color: "var(--ink)" }}>👑 {offer.wantRestDay}</span>
              </span>
            </div>
          ) : (
            <div className="ask">
              <span className="ask__lead">{lang === "AR" ? "يطلب بالمقابل" : "Wants in return"}</span>
              <div className="ask__shifts">
                {offer.wantType.map((w, i) => {
                  const sh = SS.shift(w);
                  return (
                    <span key={w} className="ask__shift">
                      {i > 0 && <span className="ask__or">{lang === "AR" ? "أو" : "or"}</span>}
                      <span className="ask__emoji">{sh.emoji}</span>
                      <span className="ask__txt">
                        <span className="ask__nm">{lang === "AR" ? sh.ar : sh.name}</span>
                        <span className="ask__tm">{SS.timeText(w)}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
              <span className="ask__day">{lang === "AR" ? "نفس اليوم" : "Same day"} · {offer.day} {offer.date}</span>
            </div>
          )}
          <div className="offer-note">“{offer.note}”</div>
          <div className="faint" style={{ fontSize: 10, fontWeight: 700, marginTop: 5 }}>
            {offer.ts} {lang === "AR" ? "مضت" : "ago"} · {offer.day} {offer.date}
            {offer.mine && <span style={{ color: "var(--gold)" }}> · {t("live")} ● {lang==="AR"?"عرضك":"yours"}</span>}
          </div>
        </div>
      </button>
    );
  }

  function Market() {
    const app = React.useContext(window.SSCtx);
    const { t, lang, offers, openOffer, handCards, listedIds } = app;
    const SS = window.SS;
    const me = SS.agent(SS.ME);

    const [dayF, setDayF] = useState("ALL");
    const [shiftF, setShiftF] = useState("ALL");
    const [matchOnly, setMatchOnly] = useState(false);
    const [mode, setMode] = useState("board"); // "board" | "scavenge"

    // my available hand
    const avail = useMemo(() =>
      handCards.filter(c => !listedIds.includes(c.id)),
      [handCards, listedIds]);

    // I can only fulfil an offer if I'm in the same queue (tier + language).
    function isMatch(o) {
      if (o.mine || isOwned(o)) return false;
      const poster = SS.agent(o.agent);
      if (!SS.sameQueue(me, poster)) return false;
      if (o.kind === "bundle") {
        if (!o.wantType || !o.bundleCards) return false;
        return o.bundleCards.every(bc =>
          avail.some(c => c.day === bc.day && o.wantType.includes(c.shift))
        );
      }
      if (o.kind === "rest") {
        // rest-day double trade: I must currently REST on the day they want off,
        // and WORK on the day they're giving up — so we can swap both days.
        const iRestOnWanted = avail.some(c => c.day === o.wantRestDay && c.shift === "CROWN");
        const iWorkTheirRest = avail.some(c => c.day === o.day && c.shift !== "CROWN");
        return iRestOnWanted && iWorkTheirRest;
      }
      if (o.kind === "rest-bundle") {
        const iRestOnAll = (o.wantRestDaysList || []).every(d => avail.some(c => c.day === d && c.shift === "CROWN"));
        const iWorkOnAll = (o.bundleCards || []).every(bc => avail.some(c => c.day === bc.day && c.shift !== "CROWN"));
        return iRestOnAll && iWorkOnAll;
      }
      // same-day time swap: I hold a working card on THAT day of a type they want.
      return avail.some(c => c.day === o.day && c.shift !== "CROWN" && o.wantType.includes(c.shift));
    }

    // "Owned" = I already hold this exact shift on that same day, so taking it
    // would be pointless. These cards are greyed out and non-interactive.
    function isOwned(o) {
      if (o.mine || o.kind === "rest" || o.kind === "bundle" || o.kind === "rest-bundle") return false;
      return avail.some(c => c.day === o.day && c.shift === o.offered);
    }

    // The market only ever shows offers from MY queue.
    const queueOffers = offers.filter(o => o.mine || SS.sameQueue(me, SS.agent(o.agent)));

    const visible = queueOffers.filter(o => {
      if (o.kind === "bundle" || o.kind === "rest-bundle") {
        if (matchOnly && !isMatch(o)) return false;
        return true;
      }
      if (dayF !== "ALL" && o.day !== dayF) return false;
      if (shiftF !== "ALL" && o.offered !== shiftF) return false;
      if (matchOnly && !isMatch(o)) return false;
      return true;
    });
    const ranked = [...visible].sort((a, b) => {
      const am = isMatch(a) ? 1 : 0, bm = isMatch(b) ? 1 : 0;
      if (am !== bm) return bm - am;
      const ao = isOwned(a) ? 1 : 0, bo = isOwned(b) ? 1 : 0;
      if (ao !== bo) return ao - bo;   // owned (inert) sink to the bottom
      return 0;
    });
    const matches = ranked.filter(isMatch);
    const rest = ranked.filter(o => !isMatch(o));

    const days = ["ALL", ...SS.DAYS.map(d => d.key)];
    const shiftKeys = ["ALL", "CROWN", "GRIND", "GOLDEN", "OWL", "EARLY", "MORNING", "DUSK"];

    return (
      <div className="screen-enter">
        {/* Board / Scavenge tab toggle */}
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={mode === "board" ? "on" : ""} onClick={() => setMode("board")}>📋 Board</button>
          <button className={mode === "scavenge" ? "on" : ""} onClick={() => setMode("scavenge")}>🔦 Scavenge</button>
        </div>

        {mode === "scavenge" && <window.Scavenge />}
        {mode === "board" && <>
        {/* queue banner — you only trade inside your own tier + language */}
        <div className="queue-banner">
          <span className="queue-banner__dot" />
          <span style={{ flex: 1 }}>
            <b>Your queue</b> · {SS.tier(me.tier).label} · {SS.FLAGS[me.lang]} {SS.LANG_NAMES[me.lang]}
          </span>
          <span className="queue-banner__hint">trades stay in-queue</span>
        </div>

        {/* filters */}
        <div className="filter-bar">
          <button
            className={"filter-match-btn" + (matchOnly ? " active" : "")}
            onClick={() => setMatchOnly(m => !m)}>
            ★ {t("matchesForYou")}
          </button>
          <div className="filter-selects">
            <div className="filter-select-wrap">
              <select
                className="filter-select"
                value={dayF}
                onChange={e => setDayF(e.target.value)}>
                <option value="ALL">{t("allDays")}</option>
                {SS.DAYS.map(d => (
                  <option key={d.key} value={d.key}>{d.key} · {d.date}</option>
                ))}
              </select>
              <span className="filter-select-arrow">▾</span>
            </div>
            <div className="filter-select-wrap">
              <select
                className="filter-select"
                value={shiftF}
                onChange={e => setShiftF(e.target.value)}>
                <option value="ALL">{t("allShifts")}</option>
                {shiftKeys.filter(s => s !== "ALL").map(s => (
                  <option key={s} value={s}>{SS.shift(s).emoji} {SS.shift(s).name} · {SS.timeText(s)}</option>
                ))}
              </select>
              <span className="filter-select-arrow">▾</span>
            </div>
          </div>
        </div>

        {matches.length > 0 && (
          <>
            <div className="section-label"><span>★ {t("matchesForYou")}</span><span className="count">{matches.length}</span></div>
            <div className="offer-list">
              {matches.map(o => <MarketCardRow key={o.id} offer={o} isMatch={true} owned={false} onOpen={openOffer} lang={lang} />)}
            </div>
          </>
        )}

        <div className="section-label"><span>{t("otherOffers")}</span><span className="count">{rest.length}</span></div>
        <div className="offer-list">
          {rest.map(o => <MarketCardRow key={o.id} offer={o} isMatch={false} owned={isOwned(o)} onOpen={openOffer} lang={lang} />)}
        </div>
        {ranked.length === 0 && (
          <div className="faint" style={{ textAlign: "center", padding: 40, fontWeight: 700 }}>
            {lang === "AR" ? "لا عروض مطابقة للتصفية" : "No offers match these filters"}
          </div>
        )}
        </>}
      </div>
    );
  }

  window.Market = Market;
})();
