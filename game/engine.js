// RAT'S KITCHEN v3 — GAME ENGINE
// Pure logic, no I/O. Server drives it; bots use the same API as humans.
// Rules locked per RATS_KITCHEN_V3_SPEC. Three stats: COUNT / WEIGHT / HEAT.
// Win: WEIGHT >= 5. Lose: 0 Stars. Inspections fine (never remove rats).

'use strict';

const COLOURS = ['red', 'blue', 'green', 'yellow'];
const THRESHOLD = 5;   // weight to win
const STARS = 3;
const HAND = 7;
const ALPHA_COLOURS = 4;   // Alpha shows on all 4 colours (big inspection target)


// ── rat catalogue ────────────────────────────────────────────────────────
// weight, heat, prop, colourable
const RATS = {
  plain:  { name: 'Street Rat', w: 1, heat: 1, prop: null,          col: true,  desc: 'Plain stock. A small inspection risk.' },
  runner: { name: 'Runner Rat', w: 1, heat: 1, prop: 'draw_again',  col: true,  desc: 'Draw a card the moment it enters your kitchen.' },
  fat:    { name: 'Fat Rat',    w: 2, heat: 2, prop: 'no_cat',      col: true,  desc: 'Heavy stock — weight 2. Cannot be shielded by a Cat.' },
  sow:    { name: 'Sow Rat',    w: 2, heat: 2, prop: 'draw_or_play',col: true,  desc: 'While held, once per turn you may draw a card instead of playing.' },
  alpha:  { name: 'Alpha Rat',  w: 2, heat: 2, prop: 'alpha_guard', col: true,  desc: 'While Alpha is in your kitchen, none of your rats can be Poached. Cannot be Cat-shielded.' },
  sewer:  { name: 'Sewer Rat',  w: 1, heat: 0, prop: null,          col: false, desc: 'Colourless and heat 0 — invisible to inspection.' },
  toll:   { name: 'Toll Rat',   w: 1, heat: 1, prop: 'tax',         col: true,  desc: 'If inspected while you hold it, the inspector gives you a card.' },
  feral:  { name: 'Feral Rat',  w: 1, heat: 1, prop: 'no_dump',     col: true,  desc: 'Cannot be moved by sabotage or dump effects.' },
  spice:  { name: 'Spice Rat',  w: 1, heat: 1, prop: 'no_explode',  col: true,  desc: 'Cannot be Hot Chilli-d.' },
  boiler: { name: 'Boiler Rat', w: 1, heat: 1, prop: 'no_steal',    col: true,  desc: 'Cannot be Poached.' },
  larder: { name: 'Larder Rat', w: 1, heat: 1, prop: 'free_eat',    col: true,  desc: 'May eat itself for free — stars equal to its weight.' },
  ratato: { name: 'Ratato Rat', w: 0, heat: 1, prop: 'sabotage',    col: true,  desc: 'No weight — worthless as stock, but carries heat. Play it into a RIVAL kitchen to draw the inspector eye. Never your own.' },
};

// action card catalogue: type -> {name, cls}
const CARDS = {
  mole:        { name: 'Health Inspection', sub: 'Naked Mole Rat', cls: 'attack', desc: 'Snap inspection. Any rival, flat -1 star, immediately. Colour-agnostic (the mole is blind).' },
  sched1:      { name: 'Health Inspection', sub: 'Scheduled — 1 Colour', cls: 'attack', desc: 'Arm face-down. Fires next turn after your draw: pick a kitchen, then 1 colour; damage = their heat in that colour.' },
  sched2:      { name: 'Health Inspection', sub: 'Scheduled — 2 Colour', cls: 'attack', desc: 'Arm face-down. Fires next turn: pick a kitchen, then up to 2 colours; damage = their heat in those colours.' },
  poach:       { name: 'Poach',           cls: 'attack', desc: 'Steal one weight-1 rat from a rival. Blocked by Boiler, and by any rat in an Alpha-guarded kitchen.' },
  switch:      { name: 'Switcheroo',      cls: 'attack', desc: 'Swap one of your rats for a rival-s, regardless of weight.' },
  chilli:      { name: 'Hot Chilli',      cls: 'attack', desc: 'Place on a rival-s rat (not Spice). It explodes at the start of your next turn — rat to the bins.' },
  grease:      { name: 'Grease the Palm', cls: 'attack', desc: 'Discard a rival-s armed Scheduled inspection before it fires.' },
  klepto:      { name: 'Kleptomaniac',    cls: 'attack', desc: 'Steal one card at random from any opponent-s hand.' },
  shakedown:   { name: 'Shakedown',       cls: 'attack', desc: 'Name a card. If that opponent holds it, they must give you one.' },
  territorial: { name: 'Territorial',     cls: 'control', desc: 'Place on a rival kitchen. Until your next turn it cannot receive rats; rats it would gain go to the bins.' },
  wok:         { name: 'Wok Block',       cls: 'defence', desc: 'Reactive. Cancel one inspection aimed at you.' },
  boardup:     { name: 'Board Up',        cls: 'defence', desc: 'Your kitchen cannot be attacked for one turn.' },
  food:        { name: 'Food',            cls: 'buff', desc: 'Spend 2 Food to regain 1 star. Powers builds that need feeding.' },
  cat:         { name: 'Cat',             cls: 'buff', desc: 'Play on one of your rats (not Fat or Alpha) to shield it — blocks the next single attack on that rat.' },
  lastresort:  { name: 'Last Resort',     cls: 'buff', desc: 'Eat any one of your rats and regain stars equal to its weight.' },
  delivery:    { name: 'Special Delivery',cls: 'engine', desc: 'Take the TOP rat of the bins into your kitchen. Never choose.' },
  trashdiver:  { name: 'Trash Diver',     cls: 'engine', desc: 'Take any one of the last 3 discarded cards from the bins.' },
  rattrap:     { name: 'Rat Trap',        cls: 'engine', desc: 'The next rat that would enter the trapped kitchen is caught and sent to the bins.' },
  exterm:      { name: 'Exterminator',    cls: 'engine', desc: 'Instantly remove one of your own rats (your hottest) to the bins — cool your heat.' },
  inherit:     { name: 'Inheritance',     cls: 'engine', desc: 'Place on a rival. If THAT rival is later shut down, you take 2 of their cards at random.' },
  gambit:      { name: 'Gambit',          cls: 'drawn', desc: 'Look at the top 3 cards of the deck. Keep 1; put the other 2 back on top (you know what they are).' },
  wd_release:  { name: 'WD: Rat Release', cls: 'drawn', desc: 'When drawn, fires at once. The top bins rat escapes to the kitchen holding most of its colour. Cannot be held.' },
};

// per-player-count deck config (13% density band; see spec 10e)
function deckConfig(P) {
  // Inspections scale gently; §6 counts are the 6P baseline.
  const inspScale = P / 6;
  const mole   = Math.max(2, Math.round(4 * inspScale));
  const sched1 = Math.max(3, Math.round(6 * inspScale));
  const sched2 = Math.max(3, Math.round(6 * inspScale));
  const actions = {
    mole, sched1, sched2,
    poach: 5, switch: 3, chilli: 4, grease: 3, klepto: 3, shakedown: 3,
    territorial: 3, wok: 2, boardup: 4,
    food: 12, cat: 3, lastresort: 3,
    delivery: 4, trashdiver: 3, rattrap: 5, exterm: 3, inherit: 3,
    gambit: 3, wd_release: 8,
  };
  // rats: ~10 non-ratato in deck + 3 Ratato Rats + 6 seeded to bins
  const deckRats = 10;
  const ratatoRats = 3;
  const binSeed = 6;
  return { actions, deckRats, ratatoRats, binSeed };
}

function rid() { return Math.random().toString(36).slice(2, 9); }

function makeRat(kind, colour) {
  const d = RATS[kind];
  const r = {
    id: rid(), kind, name: d.name, w: d.w, heat: d.heat,
    prop: d.prop, col: d.col ? colour : null,
  };
  if (kind === 'alpha') {
    const shuf = COLOURS.slice().sort(() => Math.random() - 0.5);
    r.cols = shuf.slice(0, ALPHA_COLOURS);
    r.col = r.cols[0];
  }
  return r;
}

// Build a colour-balanced rat pool (heat balanced 4/4/4/4 per spec 5.3).
function buildRatPool(n, opts) {
  opts = opts || {};
  // rat type shares (Ratato excluded here — added separately). Sewer is colourless.
  const mix = [
    ['plain', 0.22], ['runner', 0.15], ['fat', 0.12], ['sow', 0.04],
    ['alpha', 0.06], ['sewer', 0.10], ['toll', 0.08], ['feral', 0.08],
    ['spice', 0.06], ['boiler', 0.05], ['larder', 0.04],
  ];
  // 1) pick types
  const picked = [];
  for (let i = 0; i < n; i++) {
    let r = Math.random(), pick = 'plain';
    for (const [k, wgt] of mix) { r -= wgt; if (r <= 0) { pick = k; break; } }
    picked.push(pick);
  }
  // 2) assign colours to EQUALISE total heat per colour (§5.2).
  //    Colourless rats (Sewer) skip. Greedily place each coloured rat on the
  //    colour with the least heat so far — random tie-break — so heat is even
  //    but which rats land where is effectively random.
  const heatByCol = { red:0, blue:0, green:0, yellow:0 };
  const pool = [];
  // shuffle order so assignment isn't type-ordered
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [picked[i],picked[j]]=[picked[j],picked[i]]; }
  for (const kind of picked) {
    const d = RATS[kind];
    if (d.col === false) { pool.push(makeRat(kind, null)); continue; }
    // choose the lowest-heat colour, random among ties
    let min = Infinity; for (const c of COLOURS) min = Math.min(min, heatByCol[c]);
    const cands = COLOURS.filter(c => heatByCol[c] === min);
    const colour = cands[Math.floor(Math.random()*cands.length)];
    heatByCol[colour] += d.heat;
    pool.push(makeRat(kind, colour));
  }
  return pool;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── game construction ────────────────────────────────────────────────────
function newGame(playerDefs) {
  // playerDefs: [{id, name, bot}]
  const P = playerDefs.length;
  const cfg = deckConfig(P);

  const players = playerDefs.map((d, i) => ({
    id: d.id, name: d.name, bot: !!d.bot, seat: i,
    stars: STARS, rats: [], hand: [],
    armed: null,            // {cols:[], age:0} — one at a time
    boardup: 0, territorial: 0,
    alive: true, turns: 0,
  }));

  // deck = action cards + deck rats
  const deck = [];
  for (const [type, count] of Object.entries(cfg.actions)) {
    for (let i = 0; i < count; i++) deck.push({ id: rid(), card: type });
  }
  for (const r of buildRatPool(cfg.deckRats)) deck.push({ id: r.id, rat: r });
  // Ratato Rats (0 weight, 1 heat) — spread across colours
  for (let i = 0; i < cfg.ratatoRats; i++) deck.push({ id: rid(), rat: makeRat('ratato', COLOURS[i % COLOURS.length]) });
  shuffle(deck);

  // bins seeded with rats (bins == discard)
  const bins = buildRatPool(cfg.binSeed).map(r => ({ id: r.id, rat: r }));

  const g = {
    players, deck, bins, P,
    turn: 0, active: 0, over: false, winner: null,
    log: [], pending: null,   // pending reaction window
  };

  // Alpha Rat placed randomly in the deck (one copy, arrives any time)
  {
    const strip = arr => arr.filter(x => !(x.rat && x.rat.kind === 'alpha'));
    g.deck = strip(g.deck); g.bins = strip(g.bins);
    const alpha = makeRat('alpha', COLOURS[Math.floor(Math.random()*COLOURS.length)]);
    const at = Math.floor(Math.random() * (g.deck.length + 1));
    g.deck.splice(at, 0, { id: alpha.id, rat: alpha });
  }

  // deal hands (guarantee 1 Food each, rest from deck non-rats)
  for (const p of players) {
    p.hand.push({ id: rid(), card: 'food' });
    let dealt = 0;
    while (dealt < HAND - 1) {
      const c = drawCard(g);
      if (!c) break;
      if (c.rat) { bins.push(c); }
      else if (c.card === 'wd_release') { g.deck.unshift(c); }
      else { p.hand.push(c); dealt++; }
    }
  }
  logAdd(g, `Game start — ${P} players, first to weight ${THRESHOLD} wins.`);
  return g;
}

function drawCard(g) {
  if (g.deck.length === 0) {
    // reshuffle bins into deck
    if (g.bins.length === 0) return null;
    g.deck = shuffle(g.bins.splice(0));
    logAdd(g, 'Deck reshuffled from the bins.');
  }
  return g.deck.pop();
}

function logAdd(g, msg) { g.log.push(msg); if (g.log.length > 60) g.log.shift(); }

// ── stat helpers ───────────────────────────────────────────────────────────
const weight = p => p.rats.reduce((s, r) => s + r.w, 0);
// Alpha must be held one full round before it can complete a win.
const winWeight = (p, turn) => p.rats.reduce((s, r) => {
  if (r.kind === 'alpha' && r._enteredTurn === turn) return s; // not yet counted
  return s + r.w;
}, 0);
const heat   = p => p.rats.reduce((s, r) => s + r.heat, 0);
const ratOnCol = (r, cols) => r.cols ? r.cols.some(c => cols.includes(c)) : cols.includes(r.col);
const heatOf = (p, cols) => p.rats.reduce((s, r) => s + (ratOnCol(r, cols) ? r.heat : 0), 0);
const hasCol = (p, cols) => p.rats.some(r => ratOnCol(r, cols));

function opponents(g, p) { return g.players.filter(o => o.alive && o.id !== p.id); }

// ── rat entry (respects Territorial) ────────────────────────────────────────
function ratEnters(g, p, rat) {
  if (p.territorial > 0) { g.bins.push({ id: rat.id, rat }); return false; }
  if (rat.kind === 'alpha') rat._enteredTurn = g.turn;
  p.rats.push(rat);
  return true;
}
function ratToBins(g, p, rat) {
  p.rats = p.rats.filter(r => r.id !== rat.id);
  g.bins.push({ id: rat.id, rat });
}

// ── inspections ──────────────────────────────────────────────────────────────
function fireMole(g, owner, t) {
  if (tryWok(g, t)) { logAdd(g, `${t.name} wok-blocks the inspection.`); return; }
  damage(g, t, 1);
  logAdd(g, `Naked Mole Rat inspects ${t.name}: -1 star.`);
}
function fireScheduled(g, owner, t, cols) {
  if (tryWok(g, t)) { logAdd(g, `${t.name} wok-blocks the inspection.`); return; }
  const d = heatOf(t, cols);
  damage(g, t, d);
  logAdd(g, `Scheduled inspection hits ${t.name} for ${d} (${cols.join('/')}).`);
  // Toll Rat: inspector gives target a card
  if (t.alive && t.rats.some(r => r.prop === 'tax') && owner.hand.length) {
    const c = owner.hand.shift();
    t.hand.push(c);
    logAdd(g, `Toll Rat: ${owner.name} pays ${t.name} a card.`);
  }
}
function tryWok(g, t) {
  const i = t.hand.findIndex(c => c.card === 'wok');
  if (i >= 0) { g.bins.push(t.hand.splice(i, 1)[0]); return true; }
  return false;
}
function tryCat(g, t, rat) {
  // Cat is now a buff pre-placed on a rat. If that rat carries a shield, consume it.
  if (rat && rat._catShield) { rat._catShield = false; return true; }
  return false;
}

function damage(g, t, d) {
  if (d <= 0) return;
  t.stars -= d;
  if (t.stars <= 0) eliminate(g, t);
}
function eliminate(g, t) {
  // Inheritance: whoever PLACED an Inheritance marker on this specific
  // player takes 2 of their cards at random when they fall.
  if (t._inheritBy) {
    const q = g.players.find(x => x.id === t._inheritBy);
    if (q && q.alive) {
      for (let k = 0; k < 2 && t.hand.length; k++) {
        const i = Math.floor(Math.random() * t.hand.length);
        q.hand.push(t.hand.splice(i, 1)[0]);
      }
      logAdd(g, `${q.name}'s Inheritance pays off — they take from ${t.name}'s fallen stall.`);
    }
  }
  t.alive = false;
  for (const r of t.rats) g.bins.push({ id: r.id, rat: r });
  t.rats = [];
  for (const c of t.hand) g.bins.push(c);
  t.hand = [];
  t.armed = null;
  logAdd(g, `${t.name} is shut down!`);
}

function alphaWin(p, turn) {
  const alpha = p.rats.find(r => r.kind === 'alpha');
  if (!alpha) return false;
  if (alpha._enteredTurn === turn) return false;      // hold-one-round
  return p.rats.length >= 4;  // Alpha wins with 4 rats total (itself + 3), any weights
}

function checkWin(g, p) {
  if (p.alive && (winWeight(p, g.turn) >= THRESHOLD || alphaWin(p, g.turn))) {
    g.over = true; g.winner = p.id;
    logAdd(g, `${p.name} becomes RAT KING with weight ${weight(p)}!`);
    return true;
  }
  const alive = g.players.filter(x => x.alive);
  if (alive.length <= 1) {
    g.over = true; g.winner = alive[0] ? alive[0].id : null;
    if (alive[0]) logAdd(g, `${alive[0].name} is the last kitchen standing.`);
    return true;
  }
  return false;
}

module.exports = {
  COLOURS, THRESHOLD, STARS, HAND, RATS, CARDS,
  newGame, drawCard, weight, winWeight, alphaWin, heat, heatOf, hasCol, opponents,
  ratEnters, ratToBins, fireMole, fireScheduled, tryCat, damage,
  eliminate, checkWin, logAdd, shuffle, rid, makeRat, deckConfig,
};
