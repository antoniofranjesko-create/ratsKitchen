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
  plain:  { name: 'Rat',        w: 1, heat: 1, prop: null,          col: true, desc: "A plain rat. Weight 1, heat 1. Stock, and a small inspection risk." },
  runner: { name: 'Runner Rat', w: 1, heat: 1, prop: 'draw_again',  col: true, desc: "Draws you another card the moment it enters your kitchen." },
  fat:    { name: 'Fat Rat',    w: 2, heat: 2, prop: null,          col: true, desc: "Heavy stock — weight 2. The rat everyone wants, worth 2 heat when inspected." },
  sow:    { name: 'The Sow',    w: 2, heat: 2, prop: 'extra_draw',  col: true, desc: "While you hold her, draw an extra card each turn. Only one exists." },
  alpha:  { name: 'Alpha Rat',  w: 2, heat: 3, prop: 'alpha_win',    col: true, desc: "Win instantly when you hold Alpha plus 3 other rats (any weights). Shows on all four colours, so easy to inspect. Must be held one full turn before it can win." },
  sewer:  { name: 'Sewer Rat',  w: 1, heat: 0, prop: null,          col: false, desc: "Colourless and heat 0 — invisible to inspection. Safe weight." },
  toll:   { name: 'Toll Rat',   w: 1, heat: 1, prop: 'tax',         col: true, desc: "If an inspector hits you while you hold Toll, the inspector must hand you a card." },
  feral:  { name: 'Feral Rat',  w: 1, heat: 1, prop: 'no_dump',     col: true, desc: "Cannot be Hot Ratatod out of your kitchen." },
  spice:  { name: 'Spice Rat',  w: 1, heat: 1, prop: 'no_explode',  col: true, desc: "Cannot be destroyed by Hot Chilli." },
  boiler: { name: 'Boiler Rat', w: 1, heat: 1, prop: 'no_steal',    col: true, desc: "Cannot be stolen by Poach." },
  larder: { name: 'Larder Rat', w: 1, heat: 1, prop: 'free_eat',    col: true, desc: "Eat it for free (no Food needed) to regain stars equal to its weight." },
};

// action card catalogue: type -> {name, cls}
const CARDS = {
  mole:        { name: 'Naked Mole Rat',  cls: 'attack', desc: "Snap inspection. Hits any one rival for -1 star immediately. Ignores colour (the mole is blind)." },
  sched1:      { name: 'Scheduled (1)',   cls: 'attack', desc: "Arm now on one colour; fires NEXT turn against a rival holding that colour, dealing damage equal to their heat in that colour. Expires if not fired." },
  sched2:      { name: 'Scheduled (2)',   cls: 'attack', desc: "As Scheduled, but names TWO colours; fires against a rival holding either, dealing their combined heat in those colours." },
  poach:       { name: 'Poach',           cls: 'attack', desc: "Steal one WEIGHT-1 rat from a rival. Cannot take heavier rats (the poacher can only carry so much)." },
  ratato:      { name: 'Hot Ratato',      cls: 'attack', desc: "Dump one of YOUR rats (your hottest) into a rival kitchen. Moves heat off your counter onto theirs." },
  switch:      { name: 'Switcheroo',      cls: 'attack', desc: "Swap one of your rats for one of a rivals, regardless of weight. The only card where weight does not matter." },
  chilli:      { name: 'Hot Chilli',      cls: 'attack', desc: "Destroy one rat in a rival kitchen (to the bins). No star damage — removes stock, not stars." },
  territorial: { name: 'Territorial',     cls: 'control', desc: "A rival kitchen cannot receive rats for a turn; rats they would gain go to the bins." },
  grease:      { name: 'Grease the Palm',  cls: 'attack', desc: "Discard a rivals armed Scheduled inspection before it can fire." },
  food:        { name: 'Food',            cls: 'buff', desc: "Fuel. Spend 2 Food for 1 star, or 1 Food to eat a rat for stars equal to its weight. Powers most builds." },
  cat:         { name: 'Cat',             cls: 'defence', desc: "Reactive. Blocks the next single attack on your rats (steal / swap / explode). Not inspections." },
  wok:         { name: 'Wok Block',       cls: 'defence', desc: "Reactive. Cancels one inspection aimed at you entirely." },
  boardup:     { name: 'Board Up',        cls: 'defence', desc: "Your kitchen cannot be attacked for one turn. (When-drawn effects still get through.)" },
  rattrap:     { name: 'Rat Trap',        cls: 'engine', desc: "Set a trap. The next rat that would enter the trapped kitchen is caught and sent to the bins." },
  trojan:      { name: 'Trojan Rat',      cls: 'engine', desc: "Take the heaviest rat from the bins and plant it in a rival kitchen." },
  delivery:    { name: 'Special Delivery', cls: 'engine', desc: "Take the heaviest rat from the bins straight into YOUR kitchen." },
  wd_release:  { name: 'WD: Rat Release', cls: 'drawn', desc: "When Drawn: fires at once. A rat escapes the bins into whichever kitchen holds the most of its colour. Cannot be held." },
  exterm:      { name: 'Exterminator',    cls: 'engine', desc: "Clear one rat from your OWN kitchen (your hottest) to the bins — cool your heat." },
  misc:        { name: 'Odd Job',         cls: 'drawn', desc: "Do a shift for cash: draw a card." },
};

// per-player-count deck config (13% density band; see spec 10e)
function deckConfig(P) {
  const insp = Math.round(12 + P * 0.9);
  const denial = 12;
  const mole = Math.max(2, Math.round(insp * 0.40));
  const s1   = Math.max(1, Math.round(insp * 0.35));
  const s2   = Math.max(1, Math.round(insp * 0.25));
  const poach  = Math.max(2, Math.round(denial * 0.45));
  const ratato = Math.max(1, Math.round(denial * 0.30));
  const swtch  = Math.max(1, Math.round(denial * 0.25));
  const actions = {
    mole, sched1: s1, sched2: s2,
    poach, ratato, switch: swtch,
    food: 14, chilli: 4, cat: 6, wok: 2, boardup: 4, territorial: 4,
    rattrap: 5, trojan: 4, delivery: 4, wd_release: 8, grease: 3,
    exterm: 3, misc: 10,
  };
  // rats: total ~13% of deck, 10 in deck + ~6 seeded to bins
  const deckRats = P <= 4 ? 10 : (P <= 6 ? 10 : 10);
  const binSeed = 6;
  return { actions, deckRats, binSeed };
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
function buildRatPool(n) {
  // distribution weights roughly matching the roster shares
  const mix = [
    ['plain', 0.20], ['runner', 0.16], ['fat', 0.12], ['sow', 0.04],
    ['alpha', 0.06], ['sewer', 0.10], ['toll', 0.08], ['feral', 0.08],
    ['spice', 0.06], ['boiler', 0.05], ['larder', 0.05],
  ];
  const pool = [];
  for (let i = 0; i < n; i++) {
    let r = Math.random(), pick = 'plain';
    for (const [k, wgt] of mix) { r -= wgt; if (r <= 0) { pick = k; break; } }
    const colour = COLOURS[i % COLOURS.length];
    pool.push(makeRat(pick, colour));
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
function tryCat(g, t) {
  const i = t.hand.findIndex(c => c.card === 'cat');
  if (i >= 0) { g.bins.push(t.hand.splice(i, 1)[0]); return true; }
  return false;
}

function damage(g, t, d) {
  if (d <= 0) return;
  t.stars -= d;
  if (t.stars <= 0) eliminate(g, t);
}
function eliminate(g, t) {
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
