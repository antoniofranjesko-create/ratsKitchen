// server/engine.js — authoritative Rat's Kitchen game engine (v11)
// Runs on the server. Clients never see deck order or other players' hands.
//
// v11 changes from v10:
//   • 3P–8P supported (index = np-3). Plus a bespoke 2P slim deck.
//   • FAT RAT: some of the rat pool count as 2 (zone weight AND detonation damage).
//   • Defence trim: Wok Block 5→3, Cat 5→3, Board Up 3→2, Territorial 3→2.
//   • Swerve 1→3.
//   • Health Inspection at base counts [6,7,8,9,10,11].

const DECK_TABLE = {
  // SCALING (index = np-3)
  "Rat":                  [12,14,14,17,18,21],   // includes the Fat Rats (see FAT_BY_NP)
  "Health Inspection":    [ 6, 7, 8, 9,10,11],
  "Health Code Violation":[ 4, 4, 4, 4, 4, 4],
  // ATTACK
  "Hot Ratato CW":        [ 4, 4, 4, 4, 4, 4],
  "Hot Ratato CCW":       [ 4, 4, 4, 4, 4, 4],
  "Kleptomaniac":         [ 3, 3, 3, 3, 3, 3],
  // DEFENCE  (trimmed in v11)
  "Wok Block":            [ 3, 3, 3, 3, 3, 3],
  "Board Up":             [ 2, 2, 2, 2, 2, 2],
  "Exterminator":         [ 3, 3, 3, 3, 3, 3],
  "Sleeper":              [ 2, 2, 2, 2, 2, 2],
  "Swerve":               [ 3, 3, 3, 3, 3, 3],
  "The Sweep":            [ 3, 3, 3, 3, 3, 3],
  "Cat":                  [ 3, 3, 3, 3, 3, 3],
  "Territorial":          [ 2, 2, 2, 2, 2, 2],
  "Snitch":               [ 2, 2, 2, 2, 2, 2],
  // ENGINE
  "Trojan Rat":           [ 2, 2, 2, 2, 2, 2],
  "Special Delivery":     [ 3, 3, 3, 3, 3, 3],
  "Rat Trap":             [ 2, 2, 2, 2, 2, 2],
  "Food":                 [ 9, 9, 9, 9, 9, 9],
  // CONTROL
  "Gambit":               [ 4, 4, 4, 4, 4, 4],
  "Tag":                  [ 3, 3, 3, 3, 3, 3],
  "Tailed":               [ 1, 1, 1, 1, 1, 1],
  "Shakedown":            [ 3, 3, 3, 3, 3, 3],
  "Rat Pack":             [ 3, 3, 3, 3, 3, 3],
  "Inheritance":          [ 3, 3, 3, 3, 3, 3],
  "Switcheroo":           [ 1, 1, 1, 1, 1, 1],
  "Live Wire":            [ 3, 3, 3, 3, 3, 3],
  "Trash Diver":          [ 1, 1, 1, 1, 1, 1],
  "Steak Out":            [ 3, 3, 3, 3, 3, 3],
  "Russian Roulette":     [ 1, 1, 1, 1, 1, 1],
  // BUFF/NERF
  "Hot Chilli":           [ 6, 6, 6, 6, 6, 6],
  "Last Resort":          [ 2, 2, 2, 2, 2, 2],
  "Big Cheese":           [ 3, 3, 3, 3, 3, 3],
  "Bun in the Oven":      [ 1, 1, 1, 1, 1, 1],
  // WHEN DRAWN
  "WD: Frenzy":           [ 2, 2, 2, 2, 2, 2],
  "WD: Blackout":         [ 1, 1, 1, 1, 1, 1],
  "WD: Rat Run CW":       [ 1, 1, 1, 1, 1, 1],
  "WD: Rat Run CCW":      [ 1, 1, 1, 1, 1, 1],
  "WD: Audit":            [ 1, 1, 1, 1, 1, 1],
  "WD: Health Inspection":[ 2, 2, 2, 2, 2, 2],
  "WD: Infestation":      [ 3, 3, 3, 3, 3, 3],
};

// Fat Rats within the rat pool, index = np-3
const FAT_BY_NP = [2,2,2,3,3,3];

// ── 2-PLAYER VARIANT ─────────────────────────────────────────
// Slim ~49-card deck. Cards degenerate with one opponent are cut.
const DECK_2P = {
  "Rat":8, "Health Inspection":5, "Health Code Violation":2,
  "Hot Ratato CW":1, "Hot Ratato CCW":1, "Kleptomaniac":1,
  "Wok Block":3, "Cat":2, "Board Up":1, "Territorial":1,
  "Sleeper":1, "Swerve":1, "The Sweep":1, "Exterminator":1, "Snitch":1,
  "Trojan Rat":1, "Special Delivery":1, "Rat Trap":1, "Food":3,
  "Gambit":1, "Shakedown":1, "Rat Pack":1, "Inheritance":1,
  "Switcheroo":1, "Live Wire":1, "Steak Out":1,
  "Hot Chilli":2, "Big Cheese":1, "Last Resort":1,
  "WD: Frenzy":1, "WD: Health Inspection":1,
};
const FAT_2P = 1;
const PILE_2P = 4, HAND_2P = 6;

const ZONE_DEATH_AT = 5;   // total rat WEIGHT, not token count
const START_HP = 3;
const START_HAND = 7;
const START_PILE = 6;

let _id = 0;
const uid = () => ++_id;
const sh = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; };
const isWD = n => n.startsWith("WD:");

function tableFor(np) {
  if (np === 2) return { table: DECK_2P, fat: FAT_2P, pile: PILE_2P, hand: HAND_2P, two: true };
  const i = np - 3;
  const t = {};
  for (const [name, qs] of Object.entries(DECK_TABLE)) t[name] = qs[i];
  return { table: t, fat: FAT_BY_NP[i], pile: START_PILE, hand: START_HAND, two: false };
}

function buildDeck(np) {
  const { table } = tableFor(np);
  const deck = [];
  for (const [name, q] of Object.entries(table))
    for (let k = 0; k < q; k++) deck.push({ id: uid(), n: name });
  return deck;
}

function newGame(np, playerNames) {
  _id = 0;
  const cfg = tableFor(np);
  const full = buildDeck(np);
  const dealPool = full.filter(c => c.n !== "Rat" && !isWD(c.n));
  const excluded = full.filter(c => c.n === "Rat" || isWD(c.n));
  sh(dealPool);

  const players = playerNames.map((name, i) => ({
    i, name, hp: START_HP, alive: true,
    hand: [], zone: [], fortify: false, ratTrap: false,
  }));
  for (const pl of players)
    for (let k = 0; k < cfg.hand; k++) pl.hand.push(dealPool.pop());

  // ── FAT RAT distribution ───────────────────────────────────
  // Fat rats are shuffled across the whole rat population (deck rats + pile),
  // then dealt: the pile takes the first `pile` slots, the rest sit in the deck.
  const deckRatCount = excluded.filter(c => c.n === "Rat").length;
  const totalRats = deckRatCount + cfg.pile;
  const fat = Math.min(cfg.fat, totalRats);
  const flags = [];
  for (let i = 0; i < totalRats; i++) flags.push(i < fat);
  sh(flags);
  let pileFat = 0;
  for (let i = 0; i < cfg.pile; i++) if (flags[i]) pileFat++;

  return {
    np, players,
    deck: sh(dealPool.concat(excluded)),
    discard: [],
    pile: cfg.pile,
    pileFat,                      // fat rats currently sitting in the pile
    deckRatsLeft: deckRatCount,   // rat tokens still to surface from the deck
    deckFatLeft: fat - pileFat,   // of which fat
    twoPlayer: cfg.two,
    cur: 0, round: 1,
    touchedZones: [],
    mark: null, mark2: null,
    bounties: [], fusions: [], chillis: [],
    log: [], over: false, winner: null,
    pendingReaction: null,
    pendingModal: null,
  };
}

// ── rat weight helpers ───────────────────────────────────────
// A rat token carries w:1 (normal) or w:2 (Fat Rat).
const ratWeight = r => (r && r.w) ? r.w : 1;
const zoneWeight = zone => zone.reduce((s, r) => s + ratWeight(r), 0);

// Mint a rat token, drawing its weight from the correct pool.
// src: 'deck' (surfacing from the deck) or 'pile' (taken from the pile).
// NOTE: for 'pile', call AFTER decrementing G.pile.
function mintRat(G, src) {
  let w = 1;
  if (src === 'deck') {
    if (G.deckRatsLeft > 0) {
      if (Math.random() * G.deckRatsLeft < G.deckFatLeft) { w = 2; G.deckFatLeft--; }
      G.deckRatsLeft--;
    }
  } else {
    const poolBefore = G.pile + 1;  // count before the caller's pile--
    if (poolBefore > 0 && Math.random() * poolBefore < G.pileFat) { w = 2; G.pileFat--; }
  }
  return { id: uid(), att: null, atts: [], w };
}

// A rat leaving a zone goes back to the pile, keeping its fatness.
function ratHomeToPile(G, rat) {
  G.pile++;
  if (ratWeight(rat) >= 2) G.pileFat++;
}

// ── projection: what a given player is allowed to see ───────
function projectFor(G, pi) {
  return {
    np: G.np,
    players: G.players.map(p => ({
      i: p.i, name: p.name, hp: p.hp, alive: p.alive,
      handCount: p.hand.length,
      hand: p.i === pi ? p.hand : null,
      zone: p.zone,
      zoneWeight: zoneWeight(p.zone),
      fortify: p.fortify,
      ratTrap: p.ratTrap,
    })),
    pile: G.pile,
    deckCount: G.deck.length,
    discardCount: G.discard.length,
    cur: G.cur, round: G.round,
    touchedZones: G.touchedZones,
    mark: G.mark, mark2: G.mark2,
    bounties: G.bounties, fusions: G.fusions, chillis: G.chillis,
    log: G.log.slice(0, 60),
    over: G.over, winner: G.winner,
    twoPlayer: G.twoPlayer,
    zoneDeathAt: ZONE_DEATH_AT,
    pendingReaction: G.pendingReaction,
    pendingModal: G.pendingModal,
  };
}

module.exports = {
  newGame, projectFor, DECK_TABLE, DECK_2P, isWD, sh, uid,
  ratWeight, zoneWeight, mintRat, ratHomeToPile,
  ZONE_DEATH_AT, START_HP,
};
