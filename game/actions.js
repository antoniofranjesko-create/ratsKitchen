// RAT'S KITCHEN v3 — ACTIONS, LEGALITY, TURN FLOW, BOT
'use strict';
const E = require('./engine');
const { COLOURS, THRESHOLD, HAND } = E;

// A turn: draw 1 (WD fires on reveal), then 1 attack + 1 build, OR draw instead.
// Reactives (wok/cat) are handled inside inspection/steal resolution.

function startTurn(g) {
  const p = g.players[g.active];
  p.turns++;
  p._actedAttack = false;
  p._actedBuild = false;
  p._ratsIn = 0;
  p._playedRat = false;   // one rat into your kitchen per turn (Ratato/hand-play)
  p._hitZones = {};
  p._sowUsed = false;

  // 1) resolve YOUR lingering cards placed last turn (card-as-token): Hot Chilli detonates now
  for (const q of g.players) {
    if (!q.alive) continue;
    q.rats = q.rats.filter(r => {
      if (r._chilliBy === p.id) { g.bins.push({ id: r.id, rat: r }); E.logAdd(g, `A Hot Chilli detonates — ${q.name} loses a ${r.name} to the bins.`); return false; }
      return true;
    });
    // Territorial placed by you expires at your next turn
    if (q._terrBy === p.id) { q._terrBy = null; q.territorial = 0; }
  }

  // 2) armed Scheduled ages; must fire this turn or expire
  if (p.armed) {
    p.armed.age++;
    if (p.armed.age >= 2) { E.logAdd(g, `${p.name}'s Health Inspection expires unused.`); p.armed = null; }
  }
  if (p.boardup > 0) p.boardup--;

  // 3) draw phase — Runner chains; Ratato and other rats obey the entry rules
  let draws = 1;
  for (let i = 0; i < draws && i < 8; i++) {
    const c = E.drawCard(g);
    if (!c) break;
    if (c.rat) {
      if (c.rat.kind === 'ratato') {
        // Ratato Rats are HELD in hand and played into a rival later
        p.hand.push({ id: c.rat.id, ratcard: c.rat });
        E.logAdd(g, `${p.name} draws a Ratato Rat (held to deploy).`);
      } else if (E.ratEnters(g, p, c.rat)) {
        E.logAdd(g, `${p.name} draws a ${c.rat.name}.`);
        if (E.checkWin(g, p)) return;
        if (c.rat.prop === 'draw_again') draws++;
      }
    } else {
      p.hand.push(c);
      if (c.card === 'wd_release') resolveWDRelease(g, p, c);
    }
  }
}

function resolveWDRelease(g, p, card) {
  // remove the WD card itself from hand to bins
  p.hand = p.hand.filter(c => c.id !== card.id);
  g.bins.push(card);
  // take the TOP rat of the bins (last pushed)
  let idx=-1; for(let i=g.bins.length-1;i>=0;i--){ if(g.bins[i].rat){idx=i;break;} }
  if (idx<0) return;
  const pick = g.bins.splice(idx,1)[0];
  // joins the kitchen with most rats of that colour; ties/none -> drawer
  let best = null, bn = -1;
  for (const q of g.players) {
    if (!q.alive) continue;
    const n = q.rats.filter(r => r.col === pick.rat.col).length;
    if (n > bn) { bn = n; best = q; }
    else if (n === bn && q.id === p.id) best = p;
  }
  const tgt = bn > 0 ? best : p;
  E.ratEnters(g, tgt, pick.rat);
  E.logAdd(g, `WD: Rat Release — a ${pick.rat.name} scurries to ${tgt.name}.`);
  E.checkWin(g, tgt);
}

// ── legality ────────────────────────────────────────────────────────────────
function canGainRat(p) { return p._ratsIn < 1; }

function legalActions(g, p) {
  // returns list of {type, card, needsTarget, targets:[], meta}
  const acts = [];
  const opps = E.opponents(g, p).filter(o => o.boardup === 0);
  const push = (a) => acts.push(a);
  const freeZones = list => list.filter(o => !p._hitZones[o.id]);   // zone-once

  for (const c of p.hand) {
    const t = c.card;
    // ---- Ratato Rat held in hand → play into a rival kitchen (attack) ----
    if (c.ratcard && c.ratcard.kind === 'ratato' && !p._actedAttack && !p._playedRat) {
      const tg = freeZones(opps);
      if (tg.length) push({ id: c.id, type: 'play_ratato', needsTarget: true, targets: tg.map(o => o.id), label: 'Deploy Ratato Rat into a rival' });
      continue;
    }
    if (!t) continue;
    // ---- inspections ----
    if (t === 'mole' && !p._actedAttack) { const tg=freeZones(opps); if(tg.length) push({ id: c.id, type: t, needsTarget: true, targets: tg.map(o => o.id), label: 'Health Inspection — Snap (-1 star)' }); }
    if ((t === 'sched1' || t === 'sched2') && !p._actedAttack && !p.armed)
      push({ id: c.id, type: t, label: `Arm ${E.CARDS[t].sub}` });
    // ---- poach: weight-1 rat, not Boiler, not in an Alpha-guarded kitchen ----
    if (t === 'poach' && !p._actedAttack && canGainRat(p)) {
      const vics = freeZones(opps).filter(o => !o.rats.some(r => r.prop === 'alpha_guard') && o.rats.some(r => r.prop !== 'no_steal' && r.prop !== 'alpha_guard' && r.w <= 1));
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Poach a rat' });
    }
    // ---- switcheroo ----
    if (t === 'switch' && !p._actedAttack && p.rats.length) {
      const vics = freeZones(opps).filter(o => o.rats.some(r => r.prop !== 'no_steal'));
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Switcheroo (swap 1 rat)' });
    }
    // ---- hot chilli: PLACE on a rival's rat (not Spice), detonates next turn ----
    if (t === 'chilli' && !p._actedAttack) {
      const vics = freeZones(opps).filter(o => o.rats.some(r => r.prop !== 'no_explode' && !r._chilliBy));
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Hot Chilli (place on a rat)' });
    }
    // ---- territorial: place on a rival kitchen ----
    if (t === 'territorial' && !p._actedAttack) { const tg=freeZones(opps); if(tg.length) push({ id: c.id, type: t, needsTarget: true, targets: tg.map(o => o.id), label: 'Territorial' }); }
    // ---- grease an armed rival ----
    if (t === 'grease' && !p._actedAttack) {
      const armed = opps.filter(o => o.armed);
      if (armed.length) push({ id: c.id, type: t, needsTarget: true, targets: armed.map(o => o.id), label: 'Grease the Palm' });
    }
    // ---- kleptomaniac: steal random card from any opponent with cards ----
    if (t === 'klepto' && !p._actedAttack) {
      const vics = opps.filter(o => o.hand.length);
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Kleptomaniac (steal a card)' });
    }
    // ---- shakedown: name a card; handled with a follow-up (bot names randomly) ----
    if (t === 'shakedown' && !p._actedAttack) {
      const vics = opps.filter(o => o.hand.length);
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Shakedown (demand a card)' });
    }
    // ---- cat: buff on your own rat (not fat/alpha) ----
    if (t === 'cat' && !p._actedBuild) {
      const shieldable = p.rats.filter(r => r.kind !== 'fat' && r.kind !== 'alpha' && !r._catShield);
      if (shieldable.length) push({ id: c.id, type: 'cat', needsRat: true, label: 'Cat — shield a rat' });
    }
    // ---- board up ----
    if (t === 'boardup' && !p._actedBuild)
      push({ id: c.id, type: t, label: 'Board Up (safe 1 turn)' });
    // ---- rat trap ----
    if (t === 'rattrap' && !p._actedBuild)
      push({ id: c.id, type: t, needsTarget: true, targets: [...opps.map(o => o.id), p.id], label: 'Rat Trap' });
    // ---- special delivery: top bins rat → you ----
    if (t === 'delivery' && !p._actedBuild && g.bins.some(b => b.rat) && canGainRat(p) && !p._playedRat)
      push({ id: c.id, type: t, label: 'Special Delivery (top bins rat → you)' });
    // ---- trash diver: take one of the last 3 discards ----
    if (t === 'trashdiver' && !p._actedBuild && g.bins.length)
      push({ id: c.id, type: t, label: 'Trash Diver (recover a discard)' });
    // ---- exterminator: clear your own hottest rat ----
    if (t === 'exterm' && !p._actedBuild && p.rats.length)
      push({ id: c.id, type: t, label: 'Exterminator (clear your rat)' });
    // ---- gambit: scry top 3 ----
    if (t === 'gambit' && !p._actedBuild && g.deck.length)
      push({ id: c.id, type: t, label: 'Gambit (look at top 3)' });
    if (t === 'inherit' && !p._actedBuild) {
      const vics = opps.filter(o => !o._inheritBy);
      if (vics.length) push({ id: c.id, type: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Inheritance (place on a rival)' });
    }
  }

  // fire armed inspection (free, any time on your turn)
  if (p.armed && p.armed.age >= 1) {
    const legal = E.opponents(g, p).filter(o => o.boardup === 0 && o.rats.some(r => r.col) && !p._hitZones[o.id]);
    if (legal.length) push({ type: 'fire', needsTarget: true, needsColour: p.armed.cap, targets: legal.map(o => o.id), label: 'Fire Health Inspection' });
  }
  // 2 Food -> 1 star
  if (!p._actedBuild && p.hand.filter(c => c.card === 'food').length >= 2 && p.stars < E.STARS)
    push({ type: 'food_heal', label: 'Spend 2 Food (+1 star)' });
  // eat: Larder Rat eats itself free; any rat only if you hold Last Resort
  if (!p._actedBuild) {
    const larder = p.rats.find(r => r.prop === 'free_eat');
    if (larder) push({ type: 'eat_larder', ratId: larder.id, label: 'Eat the Larder Rat (free, +1 star)' });
    const hasLR = p.hand.find(c => c.card === 'lastresort');
    if (hasLR && p.rats.length) push({ id: hasLR.id, type: 'eat_lastresort', needsRat: true, label: 'Last Resort — eat a rat (+stars = weight)' });
  }
  // Sow Rat: once per turn you may draw instead of playing
  if (!p._sowUsed && p.rats.some(r => r.prop === 'draw_or_play'))
    push({ type: 'sow_draw', label: 'Sow: draw a card' });
  // end turn
  push({ type: 'end', label: 'End turn' });
  return acts;
}

// ── apply an action ──────────────────────────────────────────────────────────
function apply(g, p, act, targetId, ratId) {
  const t = targetId ? g.players.find(x => x.id === targetId) : null;
  const ATTACKS = ["mole","poach","play_ratato","switch","chilli","territorial","fire","klepto","shakedown"];
  if (t && t.id !== p.id && ATTACKS.includes(act.type)) { if(!p._hitZones) p._hitZones={}; p._hitZones[t.id] = true; }
  const takeCard = (id) => {
    const i = p.hand.findIndex(c => c.id === id);
    return i >= 0 ? p.hand.splice(i, 1)[0] : null;
  };
  const bin = (c) => { if (c) g.bins.push(c); };

  switch (act.type) {
    case 'food_boost': { bin(takeCard(act.id)); p._actedBuild = true; E.logAdd(g, `${p.name} plays Food.`); break; }
    case 'food_heal': {
      let removed = 0;
      p.hand = p.hand.filter(c => { if (c.card === 'food' && removed < 2) { g.bins.push(c); removed++; return false; } return true; });
      p.stars = Math.min(E.STARS, p.stars + 1); p._actedBuild = true;
      E.logAdd(g, `${p.name} spends 2 Food for a star.`); break;
    }
    case 'eat_larder': {
      const r = p.rats.find(x => x.prop === 'free_eat'); if (!r) break;
      p.rats = p.rats.filter(x => x.id !== r.id); g.bins.push({ id: r.id, rat: r });
      p.stars = Math.min(E.STARS, p.stars + r.w); p._actedBuild = true;
      E.logAdd(g, `${p.name} eats the Larder Rat for ${r.w} star.`); break;
    }
    case 'eat_lastresort': {
      const r = p.rats.find(x => x.id === ratId); if (!r) break;
      bin(takeCard(act.id));   // spend the Last Resort card
      p.rats = p.rats.filter(x => x.id !== r.id); g.bins.push({ id: r.id, rat: r });
      p.stars = Math.min(E.STARS, p.stars + r.w); p._actedBuild = true;
      E.logAdd(g, `${p.name} plays Last Resort and eats a ${r.name} for ${r.w} star(s).`); break;
    }
    case 'mole': { bin(takeCard(act.id)); E.fireMole(g, p, t); p._actedAttack = true; break; }
    case 'sched1': case 'sched2': {
      bin(takeCard(act.id));
      const cap = act.type === 'sched2' ? 2 : 1;
      p.armed = { cap, age: 0 };   // no colour yet — decided when it fires
      p._actedAttack = true;
      E.logAdd(g, `${p.name} arms a Health Inspection (face-down).`); break;
    }
    case 'fire': {
      const cols = (act.cols && act.cols.length) ? act.cols : (t ? topColours(t, p.armed ? p.armed.cap : 1) : []);
      p.armed = null;
      E.fireScheduled(g, p, t, cols);
      if (t && t.id !== p.id) { if(!p._hitZones) p._hitZones={}; p._hitZones[t.id] = true; }
      break;
    }
    case 'poach': {
      bin(takeCard(act.id));
const pool = t.rats.filter(r => r.prop !== 'no_steal' && r.w <= 1);
      const r = pool.sort((a, b) => b.w - a.w)[0];
      if (r && E.tryCat(g, t, r)) { E.logAdd(g, `${t.name}'s Cat shields the ${r.name}.`); p._actedAttack = true; break; }
      if (r) { t.rats = t.rats.filter(x => x.id !== r.id); if (E.ratEnters(g, p, r)) p._ratsIn++; E.logAdd(g, `${p.name} poaches a ${r.name} from ${t.name}.`); }
      p._actedAttack = true; break;
    }
    case 'play_ratato': {
      const c = takeCard(act.id); if (!c || !c.ratcard) { p._actedAttack = true; break; }
      E.ratEnters(g, t, c.ratcard);   // enters rival kitchen; 0 weight so no win
      p._actedAttack = true; p._playedRat = true;
      E.logAdd(g, `${p.name} deploys a Ratato Rat into ${t.name}'s kitchen.`); break;
    }
    case 'switch': {
      bin(takeCard(act.id));
const theirs = t.rats.filter(r => r.prop !== 'no_steal').sort((a, b) => b.w - a.w)[0];
      if (theirs && E.tryCat(g, t, theirs)) { E.logAdd(g, `${t.name}'s Cat shields the ${theirs.name}.`); p._actedAttack = true; break; }
      const mine = p.rats.slice().sort((a, b) => a.w - b.w)[0];
      if (theirs && mine) {
        p.rats = p.rats.filter(x => x.id !== mine.id);
        t.rats = t.rats.filter(x => x.id !== theirs.id);
        p.rats.push(theirs); t.rats.push(mine);
        E.logAdd(g, `${p.name} swaps a ${mine.name} for ${t.name}'s ${theirs.name}.`);
      }
      p._actedAttack = true; break;
    }
    case 'chilli': {
      bin(takeCard(act.id));
      const r = t.rats.filter(x => x.prop !== 'no_explode' && !x._chilliBy).sort((a, b) => b.w - a.w)[0];
      if (r && E.tryCat(g, t, r)) { E.logAdd(g, `${t.name}'s Cat shields the ${r.name} from the chilli.`); p._actedAttack = true; break; }
      if (r) { r._chilliBy = p.id; E.logAdd(g, `${p.name} plants a Hot Chilli on ${t.name}'s ${r.name} — it blows next turn.`); }
      p._actedAttack = true; break;
    }
    case 'territorial': { bin(takeCard(act.id)); t.territorial = 2; t._terrBy = p.id; p._actedAttack = true; E.logAdd(g, `${p.name} marks ${t.name}'s kitchen Territorial.`); break; }
    case 'grease': { bin(takeCard(act.id)); t.armed = null; p._actedAttack = true; E.logAdd(g, `${p.name} greases ${t.name}'s inspector.`); break; }
    case 'cat': {
      bin(takeCard(act.id));
      const r = p.rats.find(x => x.id === ratId && x.kind !== 'fat' && x.kind !== 'alpha');
      if (r) { r._catShield = true; E.logAdd(g, `${p.name} shields a ${r.name} with a Cat.`); }
      p._actedBuild = true; break;
    }
    case 'boardup': { bin(takeCard(act.id)); p.boardup = 2; p._actedBuild = true; E.logAdd(g, `${p.name} boards up.`); break; }
    case 'rattrap': { bin(takeCard(act.id)); t._rattrap = p.id; p._actedBuild = true; E.logAdd(g, `${p.name} sets a Rat Trap on ${t.name}.`); break; }
    case 'delivery': {
      bin(takeCard(act.id));
      // take the TOP rat of the bins (no choosing)
      let idx = -1;
      for (let i = g.bins.length - 1; i >= 0; i--) { if (g.bins[i].rat) { idx = i; break; } }
      if (idx >= 0) { const b = g.bins.splice(idx, 1)[0]; if (E.ratEnters(g, p, b.rat)) { p._ratsIn++; p._playedRat = true; } E.logAdd(g, `${p.name} takes the top bins rat — a ${b.rat.name}.`); }
      p._actedBuild = true; break;
    }
    case 'exterm': {
      bin(takeCard(act.id));
      const r = p.rats.slice().sort((a, b) => b.heat - a.heat)[0];
      if (r) { p.rats = p.rats.filter(x => x.id !== r.id); g.bins.push({ id: r.id, rat: r }); E.logAdd(g, `${p.name} calls the Exterminator on a ${r.name}.`); }
      p._actedBuild = true; break;
    }
    case 'klepto': {
      bin(takeCard(act.id));
      if (t.hand.length) { const i = Math.floor(Math.random()*t.hand.length); const stolen = t.hand.splice(i,1)[0]; p.hand.push(stolen); E.logAdd(g, `${p.name} lifts a card from ${t.name}.`); }
      p._actedAttack = true; break;
    }
    case 'shakedown': {
      bin(takeCard(act.id));
      // demand a named card. Human passes act.named; bot picks the commonest.
      const named = act.named || (t.hand[0] && t.hand[0].card);
      const i = t.hand.findIndex(c => c.card === named);
      if (i >= 0) { const given = t.hand.splice(i,1)[0]; p.hand.push(given); E.logAdd(g, `${p.name} shakes down ${t.name} for a ${E.CARDS[named]?E.CARDS[named].name:named}.`); }
      else E.logAdd(g, `${p.name} demands a card from ${t.name} — they hold none.`);
      p._actedAttack = true; break;
    }
    case 'trashdiver': {
      bin(takeCard(act.id));
      // last 3 discards = end of bins that are CARDS (not rats). Human picks; bot takes newest.
      const cardsInBins = g.bins.filter(b => b.card);
      const last3 = cardsInBins.slice(-3);
      const pickId = act.pickId || (last3.length ? last3[last3.length-1].id : null);
      if (pickId) { const idx = g.bins.findIndex(b => b.id === pickId); if (idx>=0) { p.hand.push(g.bins.splice(idx,1)[0]); E.logAdd(g, `${p.name} fishes a card out of the bins.`); } }
      p._actedBuild = true; break;
    }
    case 'gambit': {
      bin(takeCard(act.id));
      const top = [];
      for (let i=0;i<3;i++){ const c=E.drawCard(g); if(c) top.push(c); }
      // keep act.keepId if given (human), else first non-rat useful card / first
      let keep = act.keepId ? top.find(c=>c.id===act.keepId) : top[0];
      if (!keep && top.length) keep = top[0];
      if (keep) {
        if (keep.rat) { E.ratEnters(g, p, keep.rat); } else { p.hand.push(keep); if (keep.card==='wd_release') resolveWDRelease(g,p,keep); }
      }
      // the other two go BACK ON TOP of the deck (player knows them)
      for (const c of top) { if (c !== keep) g.deck.push(c); }
      p._actedBuild = true;
      E.logAdd(g, `${p.name} plays Gambit and digs through the deck.`); break;
    }
    case 'inherit': { bin(takeCard(act.id)); t._inheritBy = p.id; p._actedBuild = true; E.logAdd(g, `${p.name} places Inheritance on ${t.name}.`); break; }
    case 'sow_draw': {
      p._sowUsed = true;
      const c = E.drawCard(g);
      if (c) { if (c.rat) { if (c.rat.kind==='ratato') p.hand.push({id:c.rat.id,ratcard:c.rat}); else E.ratEnters(g,p,c.rat); } else { p.hand.push(c); if (c.card==='wd_release') resolveWDRelease(g,p,c); } }
      E.logAdd(g, `${p.name} works the Sow for an extra draw.`); break;
    }
    case 'end': break;
  }
  E.checkWin(g, p);
}

function endTurn(g) {
  const p = g.players[g.active];
  while (p.hand.length > HAND) g.bins.push(p.hand.shift());
  do { g.active = (g.active + 1) % g.players.length; } while (!g.players[g.active].alive);
  g.turn++;
}

// ── SMART BOT (ported from tuned sim) ────────────────────────────────────────
function botTurn(g) {
  const p = g.players[g.active];
  let guard = 0;
  while (!g.over && guard++ < 8) {
    const acts = legalActions(g, p);
    const choice = botChoose(g, p, acts);
    if (!choice || choice.type === 'end') break;
    let target = null, ratId = null;
    if (choice.needsTarget) target = botTarget(g, p, choice);
    if (choice.needsRat) { const r = p.rats.slice().sort((a, b) => b.w - a.w)[0]; ratId = r && r.id; }
    apply(g, p, choice, target, ratId);
    if (p._actedAttack && p._actedBuild) {
      // still allow firing an armed inspection (free)
      const fire = legalActions(g, p).find(a => a.type === 'fire');
      if (fire) { apply(g, p, fire, botTarget(g, p, fire)); }
      break;
    }
  }
}

function topColours(t, n) {
  const byCol = {};
  for (const r of t.rats) if (r.col) byCol[r.col] = (byCol[r.col]||0) + r.heat;
  return Object.entries(byCol).sort((x,y)=>y[1]-x[1]).slice(0, n).map(e=>e[0]);
}

function threatTo(g, p) {
  let d = 0;
  for (const o of E.opponents(g, p)) {
    if (o.armed && o.armed.age >= 1) {
      const cols = topColours(p, o.armed.cap);   // they'll pick your hottest colours
      d += E.heatOf(p, cols);
    }
  }
  return d;
}

function botChoose(g, p, acts) {
  const opps = E.opponents(g, p);
  const lead = opps.slice().sort((a, b) => E.weight(b) - E.weight(a))[0];
  const alphaThreat = opps.find(o => o.rats.some(r => r.kind === 'alpha') && o.rats.length >= 2);
  const rivalClose = (lead && (THRESHOLD - E.weight(lead)) <= 2) || !!alphaThreat;
  const gap = THRESHOLD - E.weight(p);
  const iLead = !lead || E.weight(p) >= E.weight(lead);
  const threat = threatTo(g, p);
  const has = (type) => acts.find(a => a.type === type);

  // 1. fire armed inspection if it hits someone dangerous
  if (has('fire')) return has('fire');
  // 2. defend: heal / board up if under lethal threat
  if (threat >= p.stars) {
    if (has('food_heal')) return has('food_heal');
    if (has('eat_larder')) return has('eat_larder'); if (has('eat_lastresort')) return has('eat_lastresort');
    if (has('boardup')) return has('boardup');
  }
  // 3. strip a rival about to win (prioritise an Alpha holder)
  if (rivalClose) {
    for (const t of ['poach', 'switch', 'chilli', 'mole', 'sched2', 'sched1', 'territorial']) if (has(t)) return has(t);
  }
  // 4. race if safe and close
  if (gap <= 2 && threat === 0) {
    if (has('delivery')) return has('delivery');
    if (has('poach')) return has('poach');
  }
  // 5. productive plays first — grow your own kitchen
  if (has('delivery')) return has('delivery');
  if (has('poach')) return has('poach');
  // 6. grease a genuinely threatening armed rival
  if (has('grease')) return has('grease');
  // 7. arm an inspection ONLY when a rival is worth inspecting (holds >=2 rats) and
  //    not every turn — keeps the board from being wall-to-wall inspectors.
  const worthInspecting = opps.some(o => o.rats.length >= 2);
  if (worthInspecting && Math.random() < 0.5) {
    if (has('sched2')) return has('sched2');
    if (has('sched1')) return has('sched1');
    if (has('mole')) return has('mole');
  }
  // 8. otherwise do a small build or just end
  if (has('play_ratato')) return has('play_ratato');
  if (has('inherit') && lead) return has('inherit');
  if (has('gambit')) return has('gambit');
  if (has('klepto')) return has('klepto');
  if (has('sow_draw')) return has('sow_draw');
  if (has('rattrap')) return has('rattrap');
  return has('end');
}

function botTarget(g, p, act) {
  const cands = act.targets.map(id => g.players.find(x => x.id === id)).filter(Boolean);
  if (!cands.length) return null;
  if (act.type === 'play_ratato' || act.type === 'territorial' || act.type === 'chilli')
    return cands.sort((a, b) => E.weight(b) - E.weight(a))[0].id; // hurt the leader
  if (act.type === 'rattrap') return cands.sort((a, b) => E.weight(b) - E.weight(a))[0].id;
  // steal/inspect: prefer close-to-win, then biggest hoard
  return cands.sort((a, b) => (E.weight(b) - E.weight(a)))[0].id;
}

module.exports = { startTurn, legalActions, apply, endTurn, botTurn, resolveWDRelease };
