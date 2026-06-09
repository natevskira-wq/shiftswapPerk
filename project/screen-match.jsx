/* ===========================================================================
   ShiftSwap — Match & Confirm
   Two trade kinds:
     • time — same-day shift swap (you give a card, get theirs, same day)
     • rest — rest-day DOUBLE trade (swap a day off for a day off; both stay 5 days)
   Rendered inside the bottom sheet.
   =========================================================================== */
(function () {
  const { useState } = React;

  function ConfirmTick({ on, who }) {
    return (
      <div className={"confirm-tick" + (on ? " on" : "")}>
        <span className="tick">{on ? "✔" : "…"}</span>
        <span className="who">{who}</span>
      </div>
    );
  }

  function MatchSheet({ offer, onClose, onDone }) {
    const app = React.useContext(window.SSCtx);
    const { t } = app;
    const SS = window.SS;
    const me = SS.agent(SS.ME);
    const poster = SS.agent(offer.agent);
    const isRest = offer.kind === "rest";
    const isBundle = offer.kind === "bundle";
    const isRestBundle = offer.kind === "rest-bundle";

    const avail = app.handCards.filter(c => !app.listedIds.includes(c.id));

    // --- TIME swap: cards I could give (same day, a type they want) ---
    const eligible = (isRest || isBundle || isRestBundle) ? [] :
      avail.filter(c => c.day === offer.day && c.shift !== "CROWN" && offer.wantType.includes(c.shift));

    // --- BUNDLE: for each day in the bundle, find MY card matching what the poster wants ---
    const bundleLegs = isBundle ? offer.bundleCards.map(bc => ({
      day: bc.day, date: bc.date, theirShift: bc.shift,
      myCard: offer.wantType
        ? avail.find(c => c.day === bc.day && offer.wantType.includes(c.shift)) || null
        : avail.find(c => c.day === bc.day && c.shift !== "CROWN") || null,
    })) : [];
    const canBundle = isBundle && bundleLegs.length > 0 && bundleLegs.every(l => l.myCard);

    // --- REST BUNDLE: multiple Crowns for multiple Crowns ---
    const restBundleLegs = isRestBundle ? (offer.wantRestDaysList || []).map((giveDay, i) => ({
      giveDay,
      getDay:      offer.bundleCards?.[i]?.day,
      getDate:     offer.bundleCards?.[i]?.date,
      giveCard:    avail.find(c => c.day === giveDay && c.shift === "CROWN"),
      getWorkCard: avail.find(c => c.day === offer.bundleCards?.[i]?.day && c.shift !== "CROWN"),
    })) : [];
    const canRestBundle = isRestBundle && restBundleLegs.length > 0 && restBundleLegs.every(l => l.giveCard && l.getWorkCard);

    // --- REST double trade: the two days that move ---
    const myRestCard = isRest ? avail.find(c => c.day === offer.wantRestDay && c.shift === "CROWN") : null;
    const myWorkCard = isRest ? avail.find(c => c.day === offer.day && c.shift !== "CROWN") : null;
    const canRest = !!(isRest && myRestCard && myWorkCard);

    // Plain-language summary of MY OWN posted offer (shown when offer.mine,
    // so opening your own listing reads as a summary — not a self-trade).
    const mineOffering =
        isBundle      ? offer.bundleCards.map(c => c.day).join(" + ")
      : isRestBundle  ? offer.bundleCards.map(c => `👑 ${c.day}`).join(" + ")
      : isRest        ? `👑 ${offer.day} off`
      :                 `${SS.shift(offer.offered).name} · ${offer.day}`;
    const mineWants =
        isBundle      ? ((offer.wantType || []).map(k => SS.shift(k).name).join(" / ") || "Any shift") + " · each day"
      : isRestBundle  ? (offer.wantRestDaysList || []).map(d => `👑 ${d}`).join(" + ")
      : isRest        ? `👑 ${offer.wantRestDay} off`
      :                 ((offer.wantType || []).map(k => SS.shift(k).name).join(" / ") || "Any time");

    const [phase, setPhase] = useState(offer._startPhase || "detail"); // detail | propose | confirm | sealing | sealed
    const [myCardId, setMyCardId] = useState(offer._preCardId || null);
    const [copied, setCopied] = useState("");      // "" | "plain" | "slack"
    const [meOk, setMeOk] = useState(false);
    const [themOk, setThemOk] = useState(false);
    const [sealedShift, setSealedShift] = useState(null);

    const myCard = avail.find(c => c.id === myCardId);
    const shownShift = sealedShift || (myCard && myCard.shift) || null;

    const tt = (k) => SS.timeText(k);
    // null-safe time for a bundle leg's "my card" — null when I can't fulfil
    // that leg (e.g. viewing a bundle I don't have the matching shift for).
    const myTt = (l) => l.myCard ? tt(l.myCard.shift)
      : (offer.wantType && offer.wantType.length ? offer.wantType.map(tt).join(" / ") : "your matching shift");

    // ---- RTM message: TIMES (not card names) + full identity for both agents
    function buildRtm(fmt) {
      const myTier = SS.tier(me.tier).label, myLang = SS.LANG_NAMES[me.lang];
      const poTier = SS.tier(poster.tier).label, poLang = SS.LANG_NAMES[poster.lang];
      const myMail = SS.email(me), poMail = SS.email(poster);

      if (fmt === "slack") {
        if (isBundle) {
          return `*${bundleLegs.length}-day bundle swap* — ${bundleLegs.map(l => `${l.day} ${l.date}`).join(" + ")}\n`
            + `• *${me.name}* <mailto:${myMail}|${myMail}> _(${myTier} · ${myLang})_\n`
            + bundleLegs.map(l => `    ${l.day} ${l.date}: gives \`${myTt(l)}\` → takes \`${tt(l.theirShift)}\``).join("\n") + "\n"
            + `• *${poster.name}* <mailto:${poMail}|${poMail}> _(${poTier} · ${poLang})_\n`
            + bundleLegs.map(l => `    ${l.day} ${l.date}: gives \`${tt(l.theirShift)}\` → takes \`${myTt(l)}\``).join("\n") + "\n"
            + `> Multi-day swap — both agents stay at 5 working days. Please update Calabrio.`;
        }
        if (isRestBundle) {
          const legs = restBundleLegs.length > 0 ? restBundleLegs : (offer.wantRestDaysList || []).map((giveDay, i) => ({ giveDay, getDay: offer.bundleCards?.[i]?.day }));
          return `Hi RTM team.\n\n`
            + `${me.name}    requests to swap days off with\n${poster.name}\n\n`
            + legs.map(l => `  ${l.giveDay} \u2194 ${l.getDay || "?"}: ${me.name.split(" ")[0]} rests ${l.getDay || "?"}, ${poster.name.split(" ")[0]} rests ${l.giveDay}`).join("\n") + "\n\n"
            + `both are\n  ${myTier} \u00b7 ${myLang}\n\nand they both have agreed on shiftswap.\n\nPlease update the schedule in Calabrio.\nThanks.\n`;
        }
        if (isRest) {
          return `*Rest-day double trade* — ${offer.day} ${offer.date} ↔ ${offer.wantRestDay} ${offer.wantRestDate}\n`
            + `• *${me.name}* <mailto:${myMail}|${myMail}> _(${myTier} · ${myLang})_ — works \`${tt(offer.workShift)}\` on ${offer.wantRestDay}, OFF ${offer.day}\n`
            + `• *${poster.name}* <mailto:${poMail}|${poMail}> _(${poTier} · ${poLang})_ — OFF ${offer.wantRestDay}, works on ${offer.day}\n`
            + `> Both agents stay at 5 working days. Please update Calabrio.`;
        }
        if (isRestBundle) {
          const legs = restBundleLegs.length > 0 ? restBundleLegs : (offer.wantRestDaysList || []).map((giveDay, i) => ({ giveDay, getDay: offer.bundleCards?.[i]?.day }));
          if (fmt === "slack") {
            return `*${legs.length}-day rest swap* \u2014 ${legs.map(l => `${l.giveDay}\u2194${l.getDay || "?"}`).join(", ")}\n`
              + legs.map(l => `\u2022 *${me.name}* gives \u201c${l.giveDay} off\u201d, takes \u201c${l.getDay} off\u201d`).join("\n") + "\n"
              + `> Both remain at 5 working days. Please update Calabrio.`;
          }
          return `Hi RTM team.\n\n`
            + `${me.name}    requests to swap days off with\n${poster.name}\n\n`
            + legs.map(l => `  ${l.giveDay} \u2194 ${l.getDay || "?"}: ${me.name.split(" ")[0]} rests ${l.getDay || "?"}, ${poster.name.split(" ")[0]} rests ${l.giveDay}`).join("\n") + "\n\n"
            + `both are\n  ${myTier} \u00b7 ${myLang}\n\nand they both have agreed on shiftswap.\n\nPlease update the schedule in Calabrio.\nThanks.\n`;
        }
        return `*Same-day time swap* — ${offer.day} ${offer.date}\n`
          + `• *${me.name}* <mailto:${myMail}|${myMail}> _(${myTier} · ${myLang})_ — gives \`${tt(shownShift)}\`, takes \`${tt(offer.offered)}\`\n`
          + `• *${poster.name}* <mailto:${poMail}|${poMail}> _(${poTier} · ${poLang})_ — gives \`${tt(offer.offered)}\`, takes \`${tt(shownShift)}\`\n`
          + `> Please update Calabrio.`;
      }

      // plain text
      if (isBundle) {
        return `${bundleLegs.length}-day bundle swap   ·   ${bundleLegs.map(l => `${l.day} ${l.date}`).join("  ·  ")}\n\n`
          + `${me.name}  <${myMail}>\n  ${myTier} · ${myLang}\n`
          + bundleLegs.map(l => `  ${l.day} ${l.date}: gives ${myTt(l)}  →  takes ${tt(l.theirShift)}`).join("\n") + "\n\n"
          + `${poster.name}  <${poMail}>\n  ${poTier} · ${poLang}\n`
          + bundleLegs.map(l => `  ${l.day} ${l.date}: gives ${tt(l.theirShift)}  →  takes ${myTt(l)}`).join("\n") + "\n\n"
          + `Both agents remain at 5 working days. Please update the schedule in Calabrio.`;
      }
      if (isRest) {
        return `${offer.day} ${offer.date}  ↔  ${offer.wantRestDay} ${offer.wantRestDate}   ·   rest-day double trade\n\n`
          + `${me.name}  <${myMail}>\n  ${myTier} · ${myLang}\n  ${offer.wantRestDay}: now WORK ${tt(offer.workShift)}\n  ${offer.day}: now OFF\n\n`
          + `${poster.name}  <${poMail}>\n  ${poTier} · ${poLang}\n  ${offer.wantRestDay}: now OFF\n  ${offer.day}: now WORK\n\n`
          + `Both agents remain at 5 working days. Please update the schedule in Calabrio.`;
      }
      return `Hi RTM team.\n\n`
        + `${me.name}    requests to swap with \n${poster.name}\n\n`
        + `${offer.day} ${offer.date} swap\n  gives ${tt(shownShift)}  →  takes ${tt(offer.offered)}\nboth are\n  ${myTier} · ${myLang}\n\n`
        + `and they both have agreed on shiftswap.\n\nPlease update the schedule in Calabrio.\nThanks.\n`;
    }
    const rtm = buildRtm("plain");

    function startSeal() {
      setPhase("sealing");
      setMeOk(false); setThemOk(false);
      setSealedShift(isRest ? null : (myCard ? myCard.shift : null));
      setTimeout(() => setMeOk(true), 350);
      setTimeout(() => setThemOk(true), 1150);
      setTimeout(() => setPhase("sealed"), 1900);
      setTimeout(() => app.completeTrade(offer, (isRest || isBundle || isRestBundle) ? null : myCard, isBundle ? bundleLegs : null, buildRtm("plain")), 1950);
    }

    function copy(fmt) {
      navigator.clipboard?.writeText(buildRtm(fmt)).catch(() => {});
      setCopied(fmt); setTimeout(() => setCopied(""), 1600);
    }

    return (
      <>
        <div className="sheet__grab" />

        {/* ---------- DETAIL ---------- */}
        {phase === "detail" && (
          <div>
            <div className="row between" style={{ marginBottom: 10 }}>
              <div className="row" style={{ gap: 9 }}>
                <div className="avatar">{SS.initials(poster.name)}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{poster.name}</div>
                  <div className="faint" style={{ fontSize: 11, fontWeight: 700 }}>
                    {SS.rankFor(poster.trades).badge} {SS.rankFor(poster.trades).name} · {poster.site}
                  </div>
                </div>
              </div>
              <span className="queue-pill">{SS.tier(poster.tier).label} · {SS.FLAGS[poster.lang]}</span>
            </div>

            {isBundle ? (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", margin: "6px 0 0" }}>
                {offer.bundleCards.map((bc, i) => (
                  <div key={i} style={{ width: 100 }}>
                    <window.ShiftCard shiftKey={bc.shift} day={bc.day} date={bc.date} size="sm"
                      tierKey={poster.tier} langSpec={poster.lang} tilt={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ width: 176, margin: "6px auto 0" }}>
                <window.ShiftCard shiftKey={offer.offered} day={offer.day} date={offer.date}
                  tierKey={poster.tier} langSpec={poster.lang} trades={poster.trades} showRank tilt={false} />
              </div>
            )}

            {offer.mine ? (
              <div className="glass" style={{ marginTop: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10, borderColor: "rgba(245,197,24,.35)", background: "linear-gradient(120deg, rgba(245,197,24,.1), var(--surface) 60%)" }}>
                <div className="badge-double" style={{ alignSelf: "flex-start", background: "linear-gradient(120deg,#ffe9a8,#f5c518)", color: "#2a1d00" }}>● YOUR LIVE OFFER</div>
                <div>
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="faint" style={{ fontWeight: 700 }}>You're offering</span>
                    <b style={{ textAlign: "end", maxWidth: "62%" }}>{mineOffering}</b>
                  </div>
                  <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="faint" style={{ fontWeight: 700 }}>You want back</span>
                    <b style={{ textAlign: "end", maxWidth: "62%" }}>{mineWants}</b>
                  </div>
                </div>
                {(isRest || isRestBundle) && <div style={{ fontSize: 11.5, fontWeight: 800, color: "#34d399" }}>🛡️ Both stay at 5 working days</div>}
                {offer.note && <div className="muted" style={{ fontSize: 13, fontStyle: "italic" }}>“{offer.note}”</div>}
              </div>
            ) : isBundle ? (
              <div className="glass double-explain" style={{ marginTop: 16 }}>
                <div className="badge-double" style={{ alignSelf: "flex-start" }}>📦 {offer.bundleCards.length}-DAY BUNDLE</div>
                <p className="double-explain__txt">
                  {poster.name.split(" ")[0]} is offering their <b>{offer.bundleCards.map(bc => bc.day).join(" + ")}</b> cards
                  {offer.wantType && offer.wantType.length > 0 && (
                    <> and wants <b>{offer.wantType.map(w => SS.shift(w).name).join(" or ")}</b> ({offer.wantType.map(w => SS.timeText(w)).join(" / ")}) back on each day</>
                  )}. Everyone keeps <b>5 working days</b>.
                </p>
                <div className="muted" style={{ fontSize: 13, marginTop: 4, fontStyle: "italic" }}>“{offer.note}”</div>
              </div>
            ) : isRestBundle ? (
              <div className="glass double-explain" style={{ marginTop: 16 }}>
                <div className="badge-double" style={{ alignSelf: "flex-start" }}>👑 MULTI REST SWAP</div>
                <p className="double-explain__txt" style={{ marginBottom: 10 }}>
                  {poster.name.split(" ")[0]} is swapping <b>{restBundleLegs.length} rest days</b>. You each move your days off — both stay at <b>5 working days</b>.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {restBundleLegs.map((l, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, fontSize: 12 }}>
                      <div style={{ background: "rgba(255,255,255,.07)", borderRadius: 8, padding: "9px 11px" }}>
                        <div style={{ fontSize: 10, opacity: .5, fontWeight: 700, marginBottom: 4 }}>{poster.name.split(" ")[0]} · {l.getDay}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 18 }}>👑</span><span style={{ opacity: .3 }}>→</span><span style={{ fontSize: 18 }}>{SS.shift(l.getWorkCard?.shift)?.emoji}</span></div>
                        <div style={{ fontSize: 9, opacity: .4, marginTop: 2 }}>rests → will work</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", opacity: .25 }}>↔</div>
                      <div style={{ background: canRestBundle ? "rgba(245,197,24,.08)" : "rgba(255,255,255,.05)", border: canRestBundle ? "1px solid rgba(245,197,24,.2)" : "none", borderRadius: 8, padding: "9px 11px" }}>
                        <div style={{ fontSize: 10, opacity: .5, fontWeight: 700, color: canRestBundle ? "var(--gold)" : "inherit", marginBottom: 4 }}>You · {l.giveDay}</div>
                        {l.giveCard
                          ? <><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 18 }}>👑</span><span style={{ opacity: .3 }}>→</span><span style={{ fontSize: 18 }}>{SS.shift(l.getWorkCard?.shift)?.emoji}</span></div><div style={{ fontSize: 9, opacity: .4, marginTop: 2 }}>rests → will work</div></>
                          : <div style={{ fontSize: 9, opacity: .3, marginTop: 4 }}>you don’t rest here</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {offer.note && <div className="muted" style={{ fontSize: 13, marginTop: 10, fontStyle: "italic" }}>“{offer.note}”</div>}
              </div>
            ) : isRest ? (
              <div className="glass double-explain" style={{ marginTop: 16 }}>
                <div className="badge-double" style={{ alignSelf: "flex-start" }}>👑 REST DAY SWAP</div>
                <p className="double-explain__txt" style={{ marginBottom: 10 }}>
                  Each person moves their day off — you both stay at exactly <b>5 working days</b>.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, opacity: .5, textTransform: "uppercase", letterSpacing: ".06em", paddingBottom: 2 }}>{offer.day} · {offer.date}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, opacity: .5, textTransform: "uppercase", letterSpacing: ".06em", paddingBottom: 2 }}>{offer.wantRestDay} · {offer.wantRestDate}</div>
                  <div style={{ background: "rgba(255,255,255,.07)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, opacity: .5, marginBottom: 6 }}>{poster.name.split(" ")[0]}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 20 }}>👑</span>
                      <span style={{ opacity: .3, fontSize: 11 }}>→</span>
                      <span style={{ fontSize: 20 }}>{SS.shift(offer.workShift)?.emoji}</span>
                    </div>
                    <div style={{ fontSize: 10, opacity: .4, marginTop: 4 }}>rests now · will work</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,.07)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, opacity: .5, marginBottom: 6 }}>{poster.name.split(" ")[0]}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 20 }}>{SS.shift(offer.workShift)?.emoji}</span>
                      <span style={{ opacity: .3, fontSize: 11 }}>→</span>
                      <span style={{ fontSize: 20 }}>👑</span>
                    </div>
                    <div style={{ fontSize: 10, opacity: .4, marginTop: 4 }}>works now · will rest</div>
                  </div>
                  {canRest && <>
                    <div style={{ background: "rgba(245,197,24,.08)", border: "1px solid rgba(245,197,24,.2)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "var(--gold)", marginBottom: 6 }}>You</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20 }}>{SS.shift(myWorkCard?.shift)?.emoji}</span>
                        <span style={{ opacity: .3, fontSize: 11 }}>→</span>
                        <span style={{ fontSize: 20 }}>👑</span>
                      </div>
                      <div style={{ fontSize: 10, opacity: .4, marginTop: 4 }}>works now · will rest</div>
                    </div>
                    <div style={{ background: "rgba(245,197,24,.08)", border: "1px solid rgba(245,197,24,.2)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "var(--gold)", marginBottom: 6 }}>You</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20 }}>👑</span>
                        <span style={{ opacity: .3, fontSize: 11 }}>→</span>
                        <span style={{ fontSize: 20 }}>{SS.shift(offer.workShift)?.emoji}</span>
                      </div>
                      <div style={{ fontSize: 10, opacity: .4, marginTop: 4 }}>rests now · will work</div>
                    </div>
                  </>}
                </div>
                {offer.note && <div className="muted" style={{ fontSize: 13, marginTop: 10, fontStyle: "italic" }}>“{offer.note}”</div>}
              </div>
            ) : (
              <div className="glass" style={{ padding: 13, marginTop: 16 }}>
                <div className="faint" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>{t("wants")} · same day</div>
                <div style={{ fontWeight: 800, fontSize: 14, display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "2px 6px" }}>
                  {offer.wantType.map((w, i) => (
                    <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {i > 0 && <span style={{ opacity: .35 }}>/</span>}
                      <span style={{ display: "inline-flex", flexDirection: "column", gap: 1 }}>
                        <span>{SS.shift(w).name}</span>
                        <span style={{ fontSize: ".72em", opacity: .55, fontWeight: 600 }}>{SS.timeText(w)}</span>
                      </span>
                    </span>
                  ))}
                  <span style={{ opacity: .5, alignSelf: "center" }}>· {offer.day}</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 8, fontStyle: "italic" }}>“{offer.note}”</div>
              </div>
            )}

            {offer.mine ? (
              <div className="faint" style={{ textAlign: "center", padding: "18px 0 4px", fontWeight: 700, fontSize: 13 }}>
                This is your offer — live on the market ●
              </div>
            ) : (isBundle ? canBundle : isRest ? canRest : eligible.length > 0) ? (
              <button className="btn btn--gold btn--full btn--lg" style={{ marginTop: 18 }}
                onClick={() => setPhase((isBundle || isRest) ? "confirm" : "propose")}>
                {isBundle ? "📦 Set up bundle trade" : isRestBundle ? "👑 Swap both days off" : isRest ? "👑 Swap my day off" : `🤝 ${t("proposeTrade")}`}
              </button>
            ) : (
              <div className="faint" style={{ textAlign: "center", padding: "18px 6px 4px", fontWeight: 700, fontSize: 12.5 }}>
                {isBundle
                  ? `You need ${offer.wantType ? offer.wantType.map(w => SS.shift(w).name).join(" or ") : "a working shift"} on each of: ${offer.bundleCards.map(bc => bc.day).join(", ")}.`
                  : isRestBundle
                  ? `To swap both days off you need: 👑 off on ${(offer.wantRestDaysList||[]).join(" + ")} and working shifts on ${(offer.bundleCards||[]).map(bc=>bc.day).join(" + ")}.`
                  : isRest
                  ? `To swap this day off you need: 👑 off on ${offer.wantRestDay} + a working shift on ${offer.day}.`
                  : `You don't hold a ${offer.day} card that matches what they want.`}
              </div>
            )}
          </div>
        )}

        {/* ---------- PROPOSE (time only): pick my card ---------- */}
        {phase === "propose" && !isRest && (
          <div>
            <h3 className="step-h" style={{ textAlign: "center" }}>Which {offer.day} card do you give?</h3>
            <p className="step-sub" style={{ textAlign: "center" }}>Same day, different time — these match their ask</p>
            <div className="grid2" style={{ marginTop: 12 }}>
              {eligible.map(c => (
                <div key={c.id} onClick={() => setMyCardId(c.id)} style={{ cursor: "pointer" }}>
                  <window.ShiftCard shiftKey={c.shift} day={c.day} date={c.date} tierKey={me.tier}
                    langSpec={me.lang} tilt={false}
                    className={myCardId === c.id ? "card-selected" : ""} />
                </div>
              ))}
            </div>
            <button className="btn btn--gold btn--full btn--lg" style={{ marginTop: 18, opacity: myCardId ? 1 : .5 }}
              disabled={!myCardId} onClick={() => setPhase("confirm")}>
              {t("confirm")} →
            </button>
          </div>
        )}

        {/* ---------- CONFIRM + SEALING ---------- */}
        {(phase === "confirm" || phase === "sealing") && (
          isBundle ? (
            <div>
              <h3 className="step-h" style={{ textAlign: "center" }}>{phase === "sealing" ? t("awaiting") : `Confirm ${bundleLegs.length}-day bundle`}</h3>
              <div className="cap-badge">🛡️ 5-day cap protected</div>

              <div className="double-stage">
                {bundleLegs.map((l, i) => (
                  <div key={i} className="double-leg">
                    <div className="double-leg__day">{l.day} {l.date}</div>
                    <div className="double-leg__cards">
                      <MiniSwap give={l.myCard.shift} get={l.theirShift} giveLbl="you give" getLbl="you get" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="row" style={{ justifyContent: "center", gap: 18, marginTop: 6 }}>
                <ConfirmTick on={meOk} who={t("you")} />
                <ConfirmTick on={themOk} who={poster.name.split(" ")[0]} />
              </div>

              {phase === "confirm" && (
                <button className="btn btn--gold btn--full btn--lg" style={{ marginTop: 16 }} onClick={startSeal}>
                  ✔ {t("confirm")}
                </button>
              )}
            </div>
          ) : isRestBundle ? (
            <div>
              <h3 className="step-h" style={{ textAlign: "center" }}>{phase === "sealing" ? t("awaiting") : `Confirm ${restBundleLegs.length}-day rest swap`}</h3>
              <div className="cap-badge">🛡️ 5-day cap protected</div>
              <div className="double-stage">
                {restBundleLegs.map((l, i) => (
                  <div key={i} className="double-leg">
                    <div className="double-leg__day">
                      <span style={{ opacity: .5 }}>👑 {l.giveDay}</span>
                      <span style={{ opacity: .3, margin: "0 5px" }}>↔</span>
                      <span>👑 {l.getDay}</span>
                    </div>
                    <div className="double-leg__cards">
                      <MiniSwap give="CROWN" get={l.getWorkCard?.shift || "GRIND"} giveLbl="you give" getLbl="you work" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ justifyContent: "center", gap: 18, marginTop: 6 }}>
                <ConfirmTick on={meOk} who={t("you")} />
                <ConfirmTick on={themOk} who={poster.name.split(" ")[0]} />
              </div>
              {phase === "confirm" && (
                <button className="btn btn--gold btn--full btn--lg" style={{ marginTop: 16 }} onClick={startSeal}>
                  ✔ {t("confirm")}
                </button>
              )}
            </div>
          ) : isRest ? (
            <div>
              <h3 className="step-h" style={{ textAlign: "center" }}>{phase === "sealing" ? t("awaiting") : "Confirm: rest day swap"}</h3>
              <div className="cap-badge">🛡️ 5-day cap protected</div>

              <div className="double-stage">
                <div className="double-leg">
                  <div className="double-leg__day">{offer.wantRestDay} {offer.wantRestDate}</div>
                  <div className="double-leg__cards">
                    <MiniSwap give="CROWN" get={offer.workShift} giveLbl="you give" getLbl="you work" />
                  </div>
                </div>
                <div className="double-leg">
                  <div className="double-leg__day">{offer.day} {offer.date}</div>
                  <div className="double-leg__cards">
                    <MiniSwap give={myWorkCard.shift} get="CROWN" giveLbl="you give" getLbl="you rest" />
                  </div>
                </div>
              </div>

              <div className="row" style={{ justifyContent: "center", gap: 18, marginTop: 6 }}>
                <ConfirmTick on={meOk} who={t("you")} />
                <ConfirmTick on={themOk} who={poster.name.split(" ")[0]} />
              </div>

              {phase === "confirm" && (
                <button className="btn btn--gold btn--full btn--lg" style={{ marginTop: 16 }} onClick={startSeal}>
                  ✔ {t("confirm")}
                </button>
              )}
            </div>
          ) : myCard && (
            <div>
              <h3 className="step-h" style={{ textAlign: "center" }}>{phase === "sealing" ? t("awaiting") : t("proposeTitle")}</h3>
              <div className="faint" style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginTop: -4, marginBottom: 4 }}>
                Same day · {offer.day} {offer.date}
              </div>
              <div className={"merge-stage" + (phase === "sealing" ? " merging" : "")}>
                <div className="merge-card give">
                  <div className="merge-label">{t("youGive")}</div>
                  <window.ShiftCard shiftKey={myCard.shift} day={myCard.day} tierKey={me.tier} tilt={false} />
                  <ConfirmTick on={meOk} who={t("you")} />
                </div>
                <div className="merge-swap">⇄</div>
                <div className="merge-card get">
                  <div className="merge-label">{t("youGet")}</div>
                  <window.ShiftCard shiftKey={offer.offered} day={offer.day} tierKey={poster.tier} tilt={false} />
                  <ConfirmTick on={themOk} who={poster.name.split(" ")[0]} />
                </div>
              </div>
              {phase === "confirm" && (
                <button className="btn btn--gold btn--full btn--lg" style={{ marginTop: 20 }} onClick={startSeal}>
                  ✔ {t("confirm")}
                </button>
              )}
            </div>
          )
        )}

        {/* ---------- SEALED ---------- */}
        {phase === "sealed" && (
          <div className="sealed-wrap">
            <div className="sealed-burst">🤝</div>
            <h2 style={{ fontFamily: "var(--display)", textAlign: "center", margin: "4px 0 2px", fontSize: 24 }}>{t("dealSealed")}</h2>
            <div className="row" style={{ justifyContent: "center", gap: 8, marginBottom: 4 }}>
              <span className="matchbadge">+{me.flexible ? 45 : 30} {t("xp")}</span>
              {isRest && <span className="badge-double">double</span>}
              {isRestBundle && <span className="badge-double">👑 {restBundleLegs.length}-day rest swap</span>}
              {isBundle && <span className="badge-double">📦 {bundleLegs.length}-day bundle</span>}
              {me.flexible && <span className="faint" style={{ fontSize: 11, fontWeight: 700 }}>{t("flexBonus")}</span>}
            </div>

            <div className="rtm-box">
              <div className="rtm-head">
                <span>📋 {t("rtmMsg")}</span>
                <span className="faint" style={{ fontSize: 10, fontWeight: 800 }}>AUTO-GENERATED</span>
              </div>
              <div className="rtm-warn">⚠️ Not official — Calabrio is the source of truth</div>
              <pre className="rtm-body">{rtm}</pre>
            </div>

            <div className="row" style={{ gap: 10, marginTop: 14 }}>
              <button className="btn btn--gold" style={{ flex: 1 }} onClick={() => copy("plain")}>
                {copied === "plain" ? "✓ Copied" : "⧉ Copy"}
              </button>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => copy("slack")}>
                {copied === "slack" ? "✓ Copied" : "💬 Copy for Slack"}
              </button>
            </div>
            <button className="btn btn--ghost btn--full" style={{ marginTop: 10 }} onClick={onDone || onClose}>{t("done")}</button>
          </div>
        )}
      </>
    );
  }

  // a compact "give X → get Y" pair used in the double-trade confirm
  function MiniSwap({ give, get, giveLbl, getLbl }) {
    return (
      <div className="mini-swap">
        <div className="mini-swap__col">
          <window.ShiftCard shiftKey={give} size="sm" tilt={false} />
          <span className="mini-swap__lbl">{giveLbl}</span>
        </div>
        <span className="mini-swap__arrow">→</span>
        <div className="mini-swap__col">
          <window.ShiftCard shiftKey={get} size="sm" tilt={false} />
          <span className="mini-swap__lbl get">{getLbl}</span>
        </div>
      </div>
    );
  }

  window.MatchSheet = MatchSheet;
})();
