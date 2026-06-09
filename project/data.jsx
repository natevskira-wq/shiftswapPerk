/* ===========================================================================
   ShiftSwap: The Deck — seed data & domain model
   Exposed as window.SS for all other scripts.
   =========================================================================== */
(function () {
  // ---- SHIFT CARD SYSTEM ---------------------------------------------------
  // Each shift type maps to a card "character" with its own theme.
  const SHIFTS = {
    EARLY:  { code: "MS", key: "EARLY",  name: "Early Bird",    ar: "الطائر المبكر", emoji: "🐦", start: "07:00", end: "16:00", theme: "earlybird", blurb: "Sunrise shift. For the ones who beat the rush." },
    DAWN:   { code: "MS", key: "DAWN",   name: "Dawn Patrol",   ar: "دورية الفجر",   emoji: "🌄", start: "06:00", end: "15:00", theme: "dawn",      blurb: "First on the floor. Owns the quiet before the storm." },
    BRUNCH: { code: "MS", key: "BRUNCH", name: "Brunch Run",    ar: "جولة الضحى",    emoji: "🥐", start: "11:00", end: "20:00", theme: "brunch",    blurb: "Late start, long finish. Coffee number two." },
    MORNING:{ code: "MS", key: "MORNING",name: "Morning Grind", ar: "صباح الكدّ",     emoji: "☕", start: "08:00", end: "17:00", theme: "morning",   blurb: "Coffee in hand, queue in sight." },
    GRIND:  { code: "MS", key: "GRIND",  name: "The Grind",     ar: "الكدّ",          emoji: "🔥", start: "09:00", end: "18:00", theme: "grind",     blurb: "Peak hours. Bring the heat." },
    GOLDEN: { code: "AS", key: "GOLDEN", name: "Golden Hour",   ar: "الساعة الذهبية", emoji: "🌅", start: "13:00", end: "22:00", theme: "golden",    blurb: "Afternoon into glow. Steady flow." },
    DUSK:   { code: "AS", key: "DUSK",   name: "Dusk Runner",   ar: "عدّاء الغسق",    emoji: "🌆", start: "14:00", end: "23:00", theme: "dusk",      blurb: "Closing the day down. Night owls welcome." },
    OWL:    { code: "NS", key: "OWL",    name: "The Owl",       ar: "البومة",         emoji: "🦉", start: "23:00", end: "08:00", theme: "owl",       blurb: "Graveyard. Stars and silence." },
    JOKER:  { code: "CC", key: "JOKER",  name: "The Joker",     ar: "الجوكر",         emoji: "🃏", start: "—",     end: "—",     theme: "joker",     blurb: "Holiday coverage. Wild card — trades for anything." },
    CROWN:  { code: "RD", key: "CROWN",  name: "The Crown",     ar: "التاج",          emoji: "👑", start: "—",     end: "—",     theme: "crown",     blurb: "Rest Day. The most wanted card in the deck." },
    BLADE:  { code: "AS", key: "BLADE",  name: "Split Blade",   ar: "النصل المنقسم",  emoji: "⚔️", start: "split", end: "split", theme: "blade",     blurb: "Any split. Two edges, one shift." },
    LEAVE:  { code: "AL", key: "LEAVE",  name: "Annual Leave",  ar: "إجازة سنوية",   emoji: "🌴", start: "—",     end: "—",     theme: "leave",     blurb: "Out of office. Sun, sand, and no shifts." },
  };

  // ---- SKILL TIERS ---------------------------------------------------------
  // `next` = the tier you train into. GDS Advanced is the top of the GDS line
  // (top: true) and is a deliberately small, limited cohort.
  const TIERS = {
    GDS:        { key: "GDS",        label: "GDS",                  short: "GDS",      color: "#3b82f6", foil: false, ring: false, next: "GDS Advanced" },
    GDS_ADV:    { key: "GDS_ADV",    label: "GDS Advanced",         short: "GDS+",     color: "#a855f7", foil: true,  ring: false, top: true },
    GDS_NEST:   { key: "GDS_NEST",   label: "GDS Advanced Nesting", short: "GDS+ Nest",color: "#a855f7", foil: true,  ring: true,  next: "GDS Advanced" },
    SUP:        { key: "SUP",        label: "Support (Non-GDS)",    short: "Support",  color: "#22c55e", foil: false, ring: false },
    SUP_DE:     { key: "SUP_DE",     label: "Support German",       short: "Support",  color: "#22c55e", foil: false, ring: false, flag: "🇩🇪" },
    SUP_ES:     { key: "SUP_ES",     label: "Support Spanish",      short: "Support",  color: "#22c55e", foil: false, ring: false, flag: "🇪🇸" },
    SUP_FR:     { key: "SUP_FR",     label: "Support French",       short: "Support",  color: "#22c55e", foil: false, ring: false, flag: "🇫🇷" },
  };

  // ---- RANKS ---------------------------------------------------------------
  const RANKS = [
    { min: 0,  max: 0,        name: "New Recruit",        ar: "مجنّد جديد",   badge: "🌱" },
    { min: 1,  max: 2,        name: "Rookie Trader",      ar: "متداول مبتدئ", badge: "🎴" },
    { min: 3,  max: 5,        name: "Card Shark",         ar: "قرش الورق",    badge: "🦈" },
    { min: 6,  max: 10,       name: "Floor Broker",       ar: "وسيط القاعة",  badge: "💼" },
    { min: 11, max: 20,       name: "Market Maker",       ar: "صانع السوق",   badge: "📈" },
    { min: 21, max: Infinity, name: "Exchange Royalty",   ar: "ملوك التداول", badge: "👑" },
  ];
  function rankFor(trades) {
    return RANKS.find(r => trades >= r.min && trades <= r.max) || RANKS[0];
  }
  function nextRank(trades) {
    const i = RANKS.findIndex(r => trades >= r.min && trades <= r.max);
    return RANKS[i + 1] || null;
  }

  const SITES = ["Dubai HQ", "Cairo Hub", "Amman Floor", "Casablanca"];

  // ---- AGENTS --------------------------------------------------------------
  // A "queue" = skill tier + language. You can only trade inside your own queue.
  // Layla's queue (GDS · French) has a real cohort: a1, a2, a3, a4.
  const AGENTS = [
    { id: "a1",  name: "Abdelrahman Abdellateef", emp: "DXB-2041", site: "Dubai HQ",     team: "Falcons",  tier: "GDS",      lang: "FR", trades: 4,  flexible: false },
    { id: "a2",  name: "Yara Mansour",    emp: "DXB-2199", site: "Dubai HQ",     team: "Falcons",  tier: "GDS",      lang: "FR", trades: 23, flexible: true  },
    { id: "a3",  name: "Tariq Bensalah",  emp: "CAS-0451", site: "Casablanca",   team: "Atlas",    tier: "GDS",      lang: "FR", trades: 6,  flexible: false },
    { id: "a4",  name: "Karim Aziz",      emp: "DXB-2050", site: "Dubai HQ",     team: "Falcons",  tier: "GDS",      lang: "FR", trades: 2,  flexible: false },
    { id: "a5",  name: "Amélie Roux",     emp: "DXB-0710", site: "Dubai HQ",     team: "Falcons",  tier: "GDS_ADV",  lang: "FR", trades: 15, flexible: false },
    { id: "a6",  name: "Sofia Navarro",   emp: "CAS-0907", site: "Casablanca",   team: "Atlas",    tier: "SUP_ES",   lang: "ES", trades: 7,  flexible: false },
    { id: "a7",  name: "Lucía Romero",    emp: "CAS-0688", site: "Casablanca",   team: "Atlas",    tier: "SUP_ES",   lang: "ES", trades: 14, flexible: false },
    { id: "a8",  name: "Jonas Weber",     emp: "AMM-3322", site: "Amman Floor",  team: "Cedars",   tier: "SUP_DE",   lang: "DE", trades: 2,  flexible: false },
    { id: "a9",  name: "Nadia Fischer",   emp: "AMM-3098", site: "Amman Floor",  team: "Cedars",   tier: "SUP_DE",   lang: "DE", trades: 9,  flexible: false },
    { id: "a10", name: "Felix Braun",     emp: "AMM-3411", site: "Amman Floor",  team: "Cedars",   tier: "SUP_DE",   lang: "DE", trades: 3,  flexible: false },
    { id: "a11", name: "Omar Khalil",     emp: "CAI-1180", site: "Cairo Hub",    team: "Scarabs",  tier: "GDS",      lang: "DE", trades: 12, flexible: true  },
    { id: "a12", name: "Hassan Reda",     emp: "CAI-1442", site: "Cairo Hub",    team: "Scarabs",  tier: "GDS_NEST", lang: "FR", trades: 5,  flexible: true  },
  ];

  const ME = "a1"; // current agent: Abdelrahman Abdellateef

  // ---- WEEK + MY HAND ------------------------------------------------------
  const WEEK_START = "2026-06-08"; // Monday
  const DAYS = [
    { key: "Mon", date: "Jun 8",  d: 8  },
    { key: "Tue", date: "Jun 9",  d: 9  },
    { key: "Wed", date: "Jun 10", d: 10 },
    { key: "Thu", date: "Jun 11", d: 11 },
    { key: "Fri", date: "Jun 12", d: 12 },
    { key: "Sat", date: "Jun 13", d: 13 },
    { key: "Sun", date: "Jun 14", d: 14 },
  ];

  // Abdelrahman's hand for the week — 1pm, 11am, 1pm, 1pm, 1pm, off, off
  const MY_HAND = [
    { id: "s1", agent: "a1", day: "Mon", date: "Jun 8",  shift: "GOLDEN" },
    { id: "s2", agent: "a1", day: "Tue", date: "Jun 9",  shift: "BRUNCH" },
    { id: "s3", agent: "a1", day: "Wed", date: "Jun 10", shift: "GOLDEN" },
    { id: "s4", agent: "a1", day: "Thu", date: "Jun 11", shift: "GOLDEN" },
    { id: "s5", agent: "a1", day: "Fri", date: "Jun 12", shift: "GOLDEN" },
    { id: "s6", agent: "a1", day: "Sat", date: "Jun 13", shift: "CROWN"  },
    { id: "s7", agent: "a1", day: "Sun", date: "Jun 14", shift: "CROWN"  },
  ];

  // ---- THE MARKET: open trade offers ---------------------------------------
  // Two kinds of trade:
  //  kind "time" — SAME-DAY shift swap. offered = the shift they give up that day;
  //                wantType = the time(s) they'd take instead, same day.
  //  kind "rest" — REST-DAY double trade. They give up their day off (offered:CROWN
  //                on `day`) and want a day off on `wantRestDay` instead. `workShift`
  //                is the shift they currently work on wantRestDay (what a responder
  //                picks up). Both sides stay at exactly 5 working days.
  const OFFERS = [
    // ---- same-day time swaps (GDS · French queue) ----
    { id: "o1", kind: "time", agent: "a3", day: "Mon", date: "Jun 8",  offered: "EARLY",   wantType: ["GRIND"],           note: "Early start's not for me — want a 9-to-6 this Monday instead.", ts: "1h"  },
    { id: "o2", kind: "time", agent: "a2", day: "Wed", date: "Jun 10", offered: "MORNING", wantType: ["OWL"],             note: "Happy to flip to the night Owl this Wednesday.", ts: "30m" },
    { id: "o3", kind: "time", agent: "a4", day: "Sat", date: "Jun 13", offered: "DUSK",    wantType: ["GOLDEN"],          note: "Want to finish a touch earlier Saturday.", ts: "3h"  },
    { id: "o4", kind: "time", agent: "a3", day: "Tue", date: "Jun 9",  offered: "GOLDEN",  wantType: ["EARLY","MORNING"], note: "Morning person stuck on a late Tuesday — help!", ts: "8h"  },
    { id: "o5", kind: "time", agent: "a2", day: "Thu", date: "Jun 11", offered: "MORNING", wantType: ["GOLDEN"],          note: "Prefer a later start this Thursday.", ts: "5h"  },
    // ---- rest-day double trades ----
    { id: "o6", kind: "rest", agent: "a2", day: "Wed", date: "Jun 10", offered: "CROWN", wantRestDay: "Fri", wantRestDate: "Jun 12", workShift: "GOLDEN",  note: "Swap my Wednesday off for a Friday off — chasing a long weekend.", ts: "2h" },
    { id: "o7", kind: "rest", agent: "a4", day: "Sat", date: "Jun 13", offered: "CROWN", wantRestDay: "Sun", wantRestDate: "Jun 14", workShift: "MORNING", note: "Need Sunday off for family — I'll cover your Sunday in return.", ts: "6h" },
    { id: "o8", kind: "rest", agent: "a3", day: "Mon", date: "Jun 8",  offered: "CROWN", wantRestDay: "Tue", wantRestDate: "Jun 9",  workShift: "EARLY",   note: "Want to move my day off to Tuesday this week.", ts: "1d" },
    // ---- bundle trade: Tariq offers Mon EARLY + Tue GOLDEN, wants The Grind back on both days ----
    { id: "o9", kind: "bundle", agent: "a3",
      bundleCards: [
        { day: "Mon", date: "Jun 8",  shift: "EARLY"  },
        { day: "Tue", date: "Jun 9",  shift: "GOLDEN" },
      ],
      wantType: ["GRIND"],
      note: "Bundle-swapping Mon + Tue — I need The Grind (09:00–18:00) on both days.", ts: "4h" },
    // ---- rest-bundle: a4 (Karim) wants to swap both his rest days Thu+Sat for Fri+Sun ----
    { id: "o10", kind: "rest-bundle", agent: "a4",
      bundleCards: [
        { day: "Thu", date: "Jun 11", shift: "CROWN" },
        { day: "Sat", date: "Jun 13", shift: "CROWN" },
      ],
      wantRestDaysList: ["Fri", "Sun"],
      note: "Swapping both my days off — want the weekend instead.", ts: "2h" },
  ];

  // ---- AGENT TRADE HISTORY (for The Ledger) --------------------------------
  const MY_HISTORY = [
    { id: "h1", date: "May 30", gave: "OWL",    got: "MORNING", with: "a8",  xp: 30 },
    { id: "h2", date: "May 24", gave: "GRIND",  got: "CROWN",   with: "a2",  xp: 45 },
    { id: "h3", date: "May 19", gave: "GOLDEN", got: "EARLY",   with: "a3",  xp: 30 },
    { id: "h4", date: "May 11", gave: "DUSK",   got: "GRIND",   with: "a11", xp: 30 },
  ];

  // ---- WEEKLY ROSTER: full schedule for every agent -----------------------
  // Used by Scavenge to find who has a given shift on a given day.
  // Each agent has exactly 5 working shifts + 2 CROWNs per week.
  const ROSTER = {
    "a1":  [{day:"Mon",date:"Jun 8", shift:"GOLDEN"},{day:"Tue",date:"Jun 9", shift:"BRUNCH"},{day:"Wed",date:"Jun 10",shift:"GOLDEN"},{day:"Thu",date:"Jun 11",shift:"GOLDEN"},{day:"Fri",date:"Jun 12",shift:"GOLDEN"},{day:"Sat",date:"Jun 13",shift:"CROWN" },{day:"Sun",date:"Jun 14",shift:"CROWN" }],
    "a2":  [{day:"Mon",date:"Jun 8", shift:"MORNING"},{day:"Tue",date:"Jun 9", shift:"MORNING"},{day:"Wed",date:"Jun 10",shift:"CROWN"  },{day:"Thu",date:"Jun 11",shift:"GOLDEN" },{day:"Fri",date:"Jun 12",shift:"GOLDEN" },{day:"Sat",date:"Jun 13",shift:"CROWN"  },{day:"Sun",date:"Jun 14",shift:"GRIND"  }],
    "a3":  [{day:"Mon",date:"Jun 8", shift:"EARLY"  },{day:"Tue",date:"Jun 9", shift:"GOLDEN" },{day:"Wed",date:"Jun 10",shift:"CROWN"  },{day:"Thu",date:"Jun 11",shift:"EARLY"  },{day:"Fri",date:"Jun 12",shift:"CROWN"  },{day:"Sat",date:"Jun 13",shift:"MORNING"},{day:"Sun",date:"Jun 14",shift:"DUSK"   }],
    "a4":  [{day:"Mon",date:"Jun 8", shift:"GRIND"  },{day:"Tue",date:"Jun 9", shift:"DUSK"   },{day:"Wed",date:"Jun 10",shift:"GRIND"  },{day:"Thu",date:"Jun 11",shift:"CROWN"  },{day:"Fri",date:"Jun 12",shift:"GRIND"  },{day:"Sat",date:"Jun 13",shift:"CROWN"  },{day:"Sun",date:"Jun 14",shift:"DUSK"   }],
    "a5":  [{day:"Mon",date:"Jun 8", shift:"MORNING"},{day:"Tue",date:"Jun 9", shift:"CROWN"  },{day:"Wed",date:"Jun 10",shift:"MORNING"},{day:"Thu",date:"Jun 11",shift:"GOLDEN" },{day:"Fri",date:"Jun 12",shift:"GOLDEN" },{day:"Sat",date:"Jun 13",shift:"GRIND"  },{day:"Sun",date:"Jun 14",shift:"CROWN"  }],
    "a6":  [{day:"Mon",date:"Jun 8", shift:"GRIND"  },{day:"Tue",date:"Jun 9", shift:"GRIND"  },{day:"Wed",date:"Jun 10",shift:"GOLDEN" },{day:"Thu",date:"Jun 11",shift:"CROWN"  },{day:"Fri",date:"Jun 12",shift:"GOLDEN" },{day:"Sat",date:"Jun 13",shift:"DUSK"   },{day:"Sun",date:"Jun 14",shift:"CROWN"  }],
    "a7":  [{day:"Mon",date:"Jun 8", shift:"EARLY"  },{day:"Tue",date:"Jun 9", shift:"CROWN"  },{day:"Wed",date:"Jun 10",shift:"EARLY"  },{day:"Thu",date:"Jun 11",shift:"MORNING"},{day:"Fri",date:"Jun 12",shift:"MORNING"},{day:"Sat",date:"Jun 13",shift:"CROWN"  },{day:"Sun",date:"Jun 14",shift:"GRIND"  }],
    "a8":  [{day:"Mon",date:"Jun 8", shift:"OWL"   },{day:"Tue",date:"Jun 9", shift:"OWL"   },{day:"Wed",date:"Jun 10",shift:"CROWN"  },{day:"Thu",date:"Jun 11",shift:"GRIND"  },{day:"Fri",date:"Jun 12",shift:"GRIND"  },{day:"Sat",date:"Jun 13",shift:"CROWN"  },{day:"Sun",date:"Jun 14",shift:"GOLDEN" }],
    "a9":  [{day:"Mon",date:"Jun 8", shift:"MORNING"},{day:"Tue",date:"Jun 9", shift:"GOLDEN" },{day:"Wed",date:"Jun 10",shift:"GOLDEN" },{day:"Thu",date:"Jun 11",shift:"CROWN"  },{day:"Fri",date:"Jun 12",shift:"MORNING"},{day:"Sat",date:"Jun 13",shift:"GRIND"  },{day:"Sun",date:"Jun 14",shift:"CROWN"  }],
    "a10": [{day:"Mon",date:"Jun 8", shift:"CROWN"  },{day:"Tue",date:"Jun 9", shift:"GRIND"  },{day:"Wed",date:"Jun 10",shift:"DUSK"   },{day:"Thu",date:"Jun 11",shift:"DUSK"   },{day:"Fri",date:"Jun 12",shift:"CROWN"  },{day:"Sat",date:"Jun 13",shift:"GOLDEN" },{day:"Sun",date:"Jun 14",shift:"MORNING"}],
    "a11": [{day:"Mon",date:"Jun 8", shift:"GRIND"  },{day:"Tue",date:"Jun 9", shift:"CROWN"  },{day:"Wed",date:"Jun 10",shift:"MORNING"},{day:"Thu",date:"Jun 11",shift:"MORNING"},{day:"Fri",date:"Jun 12",shift:"GRIND"  },{day:"Sat",date:"Jun 13",shift:"DUSK"   },{day:"Sun",date:"Jun 14",shift:"CROWN"  }],
    "a12": [{day:"Mon",date:"Jun 8", shift:"CROWN"  },{day:"Tue",date:"Jun 9", shift:"EARLY"  },{day:"Wed",date:"Jun 10",shift:"EARLY"  },{day:"Thu",date:"Jun 11",shift:"GRIND"  },{day:"Fri",date:"Jun 12",shift:"GOLDEN" },{day:"Sat",date:"Jun 13",shift:"CROWN"  },{day:"Sun",date:"Jun 14",shift:"MORNING"}],
  };

  // ---- DASHBOARD: shift demand heat (for manager view) ---------------------
  // demand = how wanted (higher = more sought), avoid = how avoided.
  const SHIFT_HEAT = [
    { shift: "CROWN",  wanted: 98, posted: 12, avoided: 4  },
    { shift: "GOLDEN", wanted: 71, posted: 28, avoided: 22 },
    { shift: "EARLY",  wanted: 64, posted: 19, avoided: 33 },
    { shift: "MORNING",wanted: 58, posted: 24, avoided: 30 },
    { shift: "GRIND",  wanted: 41, posted: 40, avoided: 52 },
    { shift: "DUSK",   wanted: 33, posted: 47, avoided: 61 },
    { shift: "OWL",    wanted: 19, posted: 63, avoided: 88 },
  ];
  const WEEKLY_VOLUME = [
    { wk: "Apr W1", n: 18 }, { wk: "Apr W2", n: 24 }, { wk: "Apr W3", n: 31 },
    { wk: "Apr W4", n: 27 }, { wk: "May W1", n: 38 }, { wk: "May W2", n: 44 },
    { wk: "May W3", n: 41 }, { wk: "May W4", n: 52 },
  ];

  // ---- HELPERS -------------------------------------------------------------
  function agent(id) { return AGENTS.find(a => a.id === id); }
  function shift(key) { return SHIFTS[key]; }
  function tier(key) { return TIERS[key]; }
  // employee email as it would appear in the company directory
  function email(ag) {
    if (!ag) return "";
    const slug = ag.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/ +/g, ".");
    return `${slug}@telecorp.com`;
  }
  // canonical "the truth" time string for a shift — never blank, never a bare dash
  function timeText(key) {
    const s = SHIFTS[key]; if (!s) return "";
    if (s.start === "split") return "Split shift";
    if (s.start === "—") {
      if (key === "CROWN") return "Day off";
      if (key === "JOKER") return "Holiday cover";
      if (key === "LEAVE") return "Annual leave";
      return "All day";
    }
    return `${s.start} – ${s.end}`;
  }
  function initials(name) { return name.split(" ").map(w => w[0]).slice(0,2).join(""); }
  // a "queue" is a (tier, language) pair — you can only trade inside yours
  function sameQueue(a, b) { return a && b && a.tier === b.tier && a.lang === b.lang; }
  function queueLabel(ag) { return `${TIERS[ag.tier].label} · ${LANG_NAMES[ag.lang]}`; }
  const FLAGS = { DE: "🇩🇪", ES: "🇪🇸", FR: "🇫🇷", EN: "🇬🇧" };
  const LANG_NAMES = { DE: "German", ES: "Spanish", FR: "French", EN: "English" };

  // ---- WEEK 2 -------------------------------------------------------------
  const WEEK2_START = "2026-06-15";
  const DAYS_W2 = [
    { key: "Mon", date: "Jun 15", d: 15 },
    { key: "Tue", date: "Jun 16", d: 16 },
    { key: "Wed", date: "Jun 17", d: 17 },
    { key: "Thu", date: "Jun 18", d: 18 },
    { key: "Fri", date: "Jun 19", d: 19 },
    { key: "Sat", date: "Jun 20", d: 20 },
    { key: "Sun", date: "Jun 21", d: 21 },
  ];
  const MY_HAND_W2 = [
    { id: "w2s1", agent: "a1", day: "Mon", date: "Jun 15", shift: "DAWN"   },
    { id: "w2s2", agent: "a1", day: "Tue", date: "Jun 16", shift: "DAWN"   },
    { id: "w2s3", agent: "a1", day: "Wed", date: "Jun 17", shift: "CROWN"  },
    { id: "w2s4", agent: "a1", day: "Thu", date: "Jun 18", shift: "CROWN"  },
    { id: "w2s5", agent: "a1", day: "Fri", date: "Jun 19", shift: "GOLDEN" },
    { id: "w2s6", agent: "a1", day: "Sat", date: "Jun 20", shift: "DUSK"   },
    { id: "w2s7", agent: "a1", day: "Sun", date: "Jun 21", shift: "DUSK"   },
  ];
  const ROSTER_W2 = {
    "a1":  [{day:"Mon",date:"Jun 15",shift:"DAWN"   },{day:"Tue",date:"Jun 16",shift:"DAWN"   },{day:"Wed",date:"Jun 17",shift:"CROWN"  },{day:"Thu",date:"Jun 18",shift:"CROWN"  },{day:"Fri",date:"Jun 19",shift:"GOLDEN" },{day:"Sat",date:"Jun 20",shift:"DUSK"   },{day:"Sun",date:"Jun 21",shift:"DUSK"   }],
    "a2":  [{day:"Mon",date:"Jun 15",shift:"CROWN"  },{day:"Tue",date:"Jun 16",shift:"GRIND"  },{day:"Wed",date:"Jun 17",shift:"MORNING"},{day:"Thu",date:"Jun 18",shift:"MORNING"},{day:"Fri",date:"Jun 19",shift:"CROWN"  },{day:"Sat",date:"Jun 20",shift:"GOLDEN" },{day:"Sun",date:"Jun 21",shift:"GOLDEN" }],
    "a3":  [{day:"Mon",date:"Jun 15",shift:"GRIND"  },{day:"Tue",date:"Jun 16",shift:"GRIND"  },{day:"Wed",date:"Jun 17",shift:"EARLY"  },{day:"Thu",date:"Jun 18",shift:"CROWN"  },{day:"Fri",date:"Jun 19",shift:"EARLY"  },{day:"Sat",date:"Jun 20",shift:"CROWN"  },{day:"Sun",date:"Jun 21",shift:"DUSK"   }],
    "a4":  [{day:"Mon",date:"Jun 15",shift:"CROWN"  },{day:"Tue",date:"Jun 16",shift:"MORNING"},{day:"Wed",date:"Jun 17",shift:"GRIND"  },{day:"Thu",date:"Jun 18",shift:"DUSK"   },{day:"Fri",date:"Jun 19",shift:"GRIND"  },{day:"Sat",date:"Jun 20",shift:"CROWN"  },{day:"Sun",date:"Jun 21",shift:"DUSK"   }],
    "a5":  [{day:"Mon",date:"Jun 15",shift:"GOLDEN" },{day:"Tue",date:"Jun 16",shift:"MORNING"},{day:"Wed",date:"Jun 17",shift:"CROWN"  },{day:"Thu",date:"Jun 18",shift:"MORNING"},{day:"Fri",date:"Jun 19",shift:"GOLDEN" },{day:"Sat",date:"Jun 20",shift:"GRIND"  },{day:"Sun",date:"Jun 21",shift:"CROWN"  }],
    "a6":  [{day:"Mon",date:"Jun 15",shift:"CROWN"  },{day:"Tue",date:"Jun 16",shift:"GOLDEN" },{day:"Wed",date:"Jun 17",shift:"GOLDEN" },{day:"Thu",date:"Jun 18",shift:"GRIND"  },{day:"Fri",date:"Jun 19",shift:"DUSK"   },{day:"Sat",date:"Jun 20",shift:"CROWN"  },{day:"Sun",date:"Jun 21",shift:"GRIND"  }],
    "a7":  [{day:"Mon",date:"Jun 15",shift:"MORNING"},{day:"Tue",date:"Jun 16",shift:"EARLY"  },{day:"Wed",date:"Jun 17",shift:"CROWN"  },{day:"Thu",date:"Jun 18",shift:"EARLY"  },{day:"Fri",date:"Jun 19",shift:"MORNING"},{day:"Sat",date:"Jun 20",shift:"GRIND"  },{day:"Sun",date:"Jun 21",shift:"CROWN"  }],
    "a8":  [{day:"Mon",date:"Jun 15",shift:"GRIND"  },{day:"Tue",date:"Jun 16",shift:"CROWN"  },{day:"Wed",date:"Jun 17",shift:"OWL"   },{day:"Thu",date:"Jun 18",shift:"OWL"   },{day:"Fri",date:"Jun 19",shift:"CROWN"  },{day:"Sat",date:"Jun 20",shift:"GRIND"  },{day:"Sun",date:"Jun 21",shift:"GOLDEN" }],
    "a9":  [{day:"Mon",date:"Jun 15",shift:"CROWN"  },{day:"Tue",date:"Jun 16",shift:"MORNING"},{day:"Wed",date:"Jun 17",shift:"MORNING"},{day:"Thu",date:"Jun 18",shift:"GOLDEN" },{day:"Fri",date:"Jun 19",shift:"CROWN"  },{day:"Sat",date:"Jun 20",shift:"DUSK"   },{day:"Sun",date:"Jun 21",shift:"GRIND"  }],
    "a10": [{day:"Mon",date:"Jun 15",shift:"DUSK"   },{day:"Tue",date:"Jun 16",shift:"CROWN"  },{day:"Wed",date:"Jun 17",shift:"MORNING"},{day:"Thu",date:"Jun 18",shift:"CROWN"  },{day:"Fri",date:"Jun 19",shift:"DUSK"   },{day:"Sat",date:"Jun 20",shift:"MORNING"},{day:"Sun",date:"Jun 21",shift:"GOLDEN" }],
    "a11": [{day:"Mon",date:"Jun 15",shift:"CROWN"  },{day:"Tue",date:"Jun 16",shift:"GRIND"  },{day:"Wed",date:"Jun 17",shift:"GRIND"  },{day:"Thu",date:"Jun 18",shift:"CROWN"  },{day:"Fri",date:"Jun 19",shift:"MORNING"},{day:"Sat",date:"Jun 20",shift:"MORNING"},{day:"Sun",date:"Jun 21",shift:"DUSK"   }],
    "a12": [{day:"Mon",date:"Jun 15",shift:"EARLY"  },{day:"Tue",date:"Jun 16",shift:"CROWN"  },{day:"Wed",date:"Jun 17",shift:"GOLDEN" },{day:"Thu",date:"Jun 18",shift:"EARLY"  },{day:"Fri",date:"Jun 19",shift:"CROWN"  },{day:"Sat",date:"Jun 20",shift:"GRIND"  },{day:"Sun",date:"Jun 21",shift:"MORNING"}],
  };
  const ADMIN_CREDS = { username: "admin", password: "Deck2026!" };

  window.SS = {
    SHIFTS, TIERS, RANKS, SITES, AGENTS, ME, WEEK_START, DAYS, MY_HAND,
    OFFERS, MY_HISTORY, ROSTER, SHIFT_HEAT, WEEKLY_VOLUME, FLAGS, LANG_NAMES,
    rankFor, nextRank, agent, shift, tier, timeText, email, initials, sameQueue, queueLabel,
    WEEK2_START, DAYS_W2, MY_HAND_W2, ROSTER_W2, ADMIN_CREDS,
  };
})();
