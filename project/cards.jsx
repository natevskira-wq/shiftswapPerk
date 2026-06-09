/* ===========================================================================
   ShiftSwap — ShiftCard component + small card helpers
   Exposed on window: ShiftCard, RankBadge, FlagBadge, TierPip
   =========================================================================== */
(function () {
  const { useRef } = React;
  const SS = window.SS;
  const LIGHT_INK = { golden: true, dusk: true, owl: true, joker: true };

  function TierPip({ tierKey }) {
    const tier = SS.tier(tierKey);
    if (!tier) return null;
    return (
      <span className="card__tierpip">
        {tier.foil ? "✦ " : ""}{tier.short}
      </span>
    );
  }

  function FlagBadge({ tierKey, lang }) {
    const tier = SS.tier(tierKey);
    const flag = (tier && tier.flag) || (lang && SS.FLAGS[lang]);
    if (!flag) return null;
    return <span className="card__flag">{flag}</span>;
  }

  function RankBadge({ trades, small }) {
    const r = SS.rankFor(trades);
    return (
      <span className="card__rankbadge" title={r.name}>
        <span>{r.badge}</span>{!small && <span>{r.name}</span>}
      </span>
    );
  }

  // 3D tilt that follows the pointer
  function useTilt(enabled) {
    const ref = useRef(null);
    function move(e) {
      if (!enabled) return;
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `translateY(-6px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg) scale(1.03)`;
    }
    function leave() {
      const el = ref.current; if (el) el.style.transform = "";
    }
    return { ref, onMouseMove: move, onMouseLeave: leave };
  }

  /* props:
     shiftKey, day, date, size ('sm'|undefined), tilt (bool),
     tierKey, lang (for flag), trades (rank badge),
     disabled (greyed, non-interactive + tooltip), onClick, className, style */
  function ShiftCard(props) {
    const {
      shiftKey, day, date, size, tilt = true, tierKey, lang = "EN",
      langSpec, trades, onClick, className = "", style, showRank,
      disabled = false, disabledTip = "You already have this shift",
    } = props;
    const sh = SS.shift(shiftKey);
    if (!sh) return null;
    const tier = tierKey ? SS.tier(tierKey) : null;
    const light = LIGHT_INK[sh.theme];
    // disabled cards never tilt and never respond to the pointer
    const tiltProps = useTilt(tilt && !size && !disabled);

    const name = lang === "AR" ? sh.ar : sh.name;
    const timeLabel = SS.timeText(shiftKey);

    const cls = [
      "card", `t-${sh.theme}`,
      light ? "ink-light" : "",
      size === "sm" ? "sm" : "",
      tilt && !size && !disabled ? "tilt" : "",
      tier && tier.foil ? "foil" : "",
      tier && tier.ring ? "ring" : "",
      disabled ? "is-disabled" : "",
      className,
    ].filter(Boolean).join(" ");

    return (
      <div className={cls} style={style}
           onClick={disabled ? undefined : onClick}
           aria-disabled={disabled || undefined}
           title={disabled ? disabledTip : undefined}
           ref={tiltProps.ref} onMouseMove={tiltProps.onMouseMove} onMouseLeave={tiltProps.onMouseLeave}>
        {/* index corners */}
        <div className="card__index tl"><span className="ix-emoji">{sh.emoji}</span><span>{sh.code}</span></div>
        <div className="card__index br"><span className="ix-emoji">{sh.emoji}</span><span>{sh.code}</span></div>

        {tierKey && <FlagBadge tierKey={tierKey} lang={langSpec} />}
        {showRank && typeof trades === "number" && <RankBadge trades={trades} small />}

        <div className="card__top">
          {/* name + time always travel together — name is flavor, time is truth */}
          <div className="card__namewrap">
            <div className="card__name"><span className="card__nameemoji">{sh.emoji}</span>{name}</div>
            <div className="card__nametime">{timeLabel}</div>
          </div>
          {tierKey && <TierPip tierKey={tierKey} />}
        </div>

        <div className="card__art">
          <span className="card__watermark">{sh.emoji}</span>
          <span className="card__emoji">{sh.emoji}</span>
        </div>

        <div className="card__bottom">
          <div className="card__meta">
            {day && <span className="card__daychip">{day}</span>}
            {date && <span style={{ opacity: .8 }}>{date}</span>}
          </div>
        </div>

        {disabled && <div className="card__owned">{disabledTip}</div>}
      </div>
    );
  }

  // Inline shift name + time label — use wherever a shift name appears as plain text
  function ShiftNameTime({ shiftKey, lang = "EN", size }) {
    const sh = SS.shift(shiftKey);
    if (!sh) return null;
    const name = lang === "AR" ? sh.ar : sh.name;
    const fs = size === "sm" ? ".72em" : ".78em";
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, verticalAlign: "top" }}>
        <span>{name}</span>
        <span style={{ fontSize: fs, opacity: .55, fontWeight: 600, letterSpacing: ".01em" }}>{SS.timeText(shiftKey)}</span>
      </span>
    );
  }

  Object.assign(window, { ShiftCard, RankBadge, FlagBadge, TierPip, ShiftNameTime });
})();
