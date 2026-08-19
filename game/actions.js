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
  // clear own turn-duration cards
  if (p.armed) {
    p.armed.age++;
    // Scheduled must fire the turn after arming; if it has now sat a full turn, it expires.
    if (p.armed.age >= 2) { E.logAdd(g, `${p.name}'s armed inspection expires unused.`); p.armed = null; }
  }
  if (p.boardup > 0) p.boardup--;
  if (p.territorial > 0) p.territorial--;

  // draw phase (+Sow bonus, +Runner chain)
  let draws = 1 + p.rats.filter(r => r.prop === 'extra_draw').length;
  for (let i = 0; i < draws && i < 6; i++) {
    const c = E.drawCard(g);
    if (!c) break;
    if (c.rat) {
      if (E.ratEnters(g, p, c.rat)) {
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
  const ratsInBins = g.bins.filter(b => b.rat);
  if (!ratsInBins.length) return;
  const pick = ratsInBins[Math.floor(Math.random() * ratsInBins.length)];
  g.bins = g.bins.filter(b => b.id !== pick.id);
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

  for (const c of p.hand) {
    const t = c.card;
    if (t === 'food') {
      if (!p._actedBuild) push({ id: c.id, type: 'food_boost', card: t, label: 'Play Food (boost)' });
      // 2 food -> 1 star handled as its own action below
    }
    if (t === 'mole' && !p._actedAttack && opps.length)
      push({ id: c.id, type: t, card: t, needsTarget: true, targets: opps.map(o => o.id), label: 'Naked Mole Rat (-1 star)' });
    if ((t === 'sched1' || t === 'sched2') && !p._actedAttack && !p.armed)
      push({ id: c.id, type: t, card: t, label: `Arm ${E.CARDS[t].name}` });
    if (t === 'poach' && !p._actedAttack && canGainRat(p)) {
      const vics = opps.filter(o => o.rats.some(r => r.prop !== 'no_steal' && r.w <= 1));
      if (vics.length) push({ id: c.id, type: t, card: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Poach a rat' });
    }
    if (t === 'ratato' && !p._actedAttack && opps.length && p.rats.some(r => r.prop !== 'no_dump'))
      push({ id: c.id, type: t, card: t, needsTarget: true, targets: opps.map(o => o.id), label: 'Hot Ratato (dump a rat)' });
    if (t === 'switch' && !p._actedAttack && p.rats.length) {
      const vics = opps.filter(o => o.rats.some(r => r.prop !== 'no_steal'));
      if (vics.length) push({ id: c.id, type: t, card: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Switcheroo (swap 1 rat)' });
    }
    if (t === 'chilli' && !p._actedAttack) {
      const vics = opps.filter(o => o.rats.some(r => r.prop !== 'no_explode'));
      if (vics.length) push({ id: c.id, type: t, card: t, needsTarget: true, targets: vics.map(o => o.id), label: 'Hot Chilli (explode a rat)' });
    }
    if (t === 'territorial' && !p._actedAttack && opps.length)
      push({ id: c.id, type: t, card: t, needsTarget: true, targets: opps.map(o => o.id), label: 'Territorial' });
    if (t === 'grease' && !p._actedAttack) {
      const armed = opps.filter(o => o.armed);
      if (armed.length) push({ id: c.id, type: t, card: t, needsTarget: true, targets: armed.map(o => o.id), label: 'Grease the Palm' });
    }
    if (t === 'boardup' && !p._actedBuild)
      push({ id: c.id, type: t, card: t, label: 'Board Up (safe 1 turn)' });
    if (t === 'rattrap' && !p._actedBuild)
      push({ id: c.id, type: t, card: t, needsTarget: true, targets: [...opps.map(o => o.id), p.id], label: 'Rat Trap' });
    if (t === 'trojan' && !p._actedBuild && g.bins.some(b => b.rat) && opps.length)
      push({ id: c.id, type: t, card: t, needsTarget: true, targets: opps.map(o => o.id), label: 'Trojan Rat (bins→rival)' });
    if (t === 'delivery' && !p._actedBuild && g.bins.some(b => b.rat) && canGainRat(p))
      push({ id: c.id, type: t, card: t, label: 'Special Delivery (bins→you)' });
    if (t === 'exterm' && !p._actedBuild && p.rats.length)
      push({ id: c.id, type: t, card: t, label: 'Exterminator (clear a rat)' });
    if (t === 'misc' && !p._actedBuild)
      push({ id: c.id, type: t, card: t, label: 'Odd Job (draw)' });
  }
  // fire armed inspection (free, any time on your turn)
  if (p.armed && p.armed.age >= 1) {
    const legal = E.opponents(g, p).filter(o => o.boardup === 0 && E.hasCol(o, p.armed.cols));
    if (legal.length) push({ type: 'fire', needsTarget: true, targets: legal.map(o => o.id), label: 'Fire armed inspection' });
  }
  // 2 Food -> 1 star
  if (!p._actedBuild && p.hand.filter(c => c.card === 'food').length >= 2 && p.stars < E.STARS)
    push({ type: 'food_heal', label: 'Spend 2 Food (+1 star)' });
  // eat a rat (build) -> stars = weight, needs a food unless larder
  if (!p._actedBuild && p.rats.length && p.stars < E.STARS) {
    push({ type: 'eat', needsRat: true, label: 'Eat a rat (+stars = weight)' });
  }
  // draw instead of acting
  push({ type: 'draw_instead', label: 'Draw a card instead' });
  // end turn
  push({ type: 'end', label: 'End turn' });
  return acts;
}

// ── apply an action ──────────────────────────────────────────────────────────
function apply(g, p, act, targetId, ratId) {
  const t = targetId ? g.players.find(x => x.id === targetId) : null;
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
    case 'eat': {
      const r = p.rats.find(x => x.id === ratId); if (!r) break;
      const free = r.prop === 'free_eat';
      if (!free) { const f = p.hand.find(c => c.card === 'food'); if (!f) break; bin(takeCard(f.id)); }
      p.rats = p.rats.filter(x => x.id !== r.id); g.bins.push({ id: r.id, rat: r });
      p.stars = Math.min(E.STARS, p.stars + r.w); p._actedBuild = true;
      E.logAdd(g, `${p.name} eats a ${r.name} for ${r.w} star(s).`); break;
    }
    case 'mole': { bin(takeCard(act.id)); E.fireMole(g, p, t); p._actedAttack = true; break; }
    case 'sched1': case 'sched2': {
      bin(takeCard(act.id));
      const n = act.type === 'sched2' ? 2 : 1;
      const cols = E.shuffle([...COLOURS]).slice(0, n);
      p.armed = { cols, age: 0 }; p._actedAttack = true;
      E.logAdd(g, `${p.name} arms a Scheduled inspection.`); break;
    }
    case 'fire': {
      const cols = p.armed.cols; p.armed = null;
      E.fireScheduled(g, p, t, cols); break;
    }
    case 'poach': {
      bin(takeCard(act.id));
      if (E.tryCat(g, t)) { E.logAdd(g, `${t.name}'s Cat blocks the poach.`); p._actedAttack = true; break; }
      const pool = t.rats.filter(r => r.prop !== 'no_steal' && r.w <= 1);
      const r = pool.sort((a, b) => b.w - a.w)[0];
      if (r) { t.rats = t.rats.filter(x => x.id !== r.id); if (E.ratEnters(g, p, r)) p._ratsIn++; E.logAdd(g, `${p.name} poaches a ${r.name} from ${t.name}.`); }
      p._actedAttack = true; break;
    }
    case 'ratato': {
      bin(takeCard(act.id));
      const pool = p.rats.filter(r => r.prop !== 'no_dump');
      const r = pool.sort((a, b) => b.heat - a.heat)[0];
      if (r) { p.rats = p.rats.filter(x => x.id !== r.id); E.ratEnters(g, t, r); E.logAdd(g, `${p.name} Hot Ratatoes a ${r.name} onto ${t.name}.`); }
      p._actedAttack = true; break;
    }
    case 'switch': {
      bin(takeCard(act.id));
      if (E.tryCat(g, t)) { E.logAdd(g, `${t.name}'s Cat blocks the switch.`); p._actedAttack = true; break; }
      const theirs = t.rats.filter(r => r.prop !== 'no_steal').sort((a, b) => b.w - a.w)[0];
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
      if (E.tryCat(g, t)) { E.logAdd(g, `${t.name}'s Cat blocks the chilli.`); p._actedAttack = true; break; }
      const r = t.rats.filter(x => x.prop !== 'no_explode').sort((a, b) => b.w - a.w)[0];
      if (r) { t.rats = t.rats.filter(x => x.id !== r.id); g.bins.push({ id: r.id, rat: r }); E.logAdd(g, `${p.name} explodes ${t.name}'s ${r.name}.`); }
      p._actedAttack = true; break;
    }
    case 'territorial': { bin(takeCard(act.id)); t.territorial = 2; p._actedAttack = true; E.logAdd(g, `${p.name} marks ${t.name}'s kitchen Territorial.`); break; }
    case 'grease': { bin(takeCard(act.id)); t.armed = null; p._actedAttack = true; E.logAdd(g, `${p.name} greases ${t.name}'s inspector.`); break; }
    case 'boardup': { bin(takeCard(act.id)); p.boardup = 2; p._actedBuild = true; E.logAdd(g, `${p.name} boards up.`); break; }
    case 'rattrap': { bin(takeCard(act.id)); t._rattrap = p.id; p._actedBuild = true; E.logAdd(g, `${p.name} sets a Rat Trap on ${t.name}.`); break; }
    case 'trojan': {
      bin(takeCard(act.id));
      const b = g.bins.filter(x => x.rat).sort((a, z) => z.rat.w - a.rat.w)[0];
      if (b) { g.bins = g.bins.filter(x => x.id !== b.id); E.ratEnters(g, t, b.rat); E.logAdd(g, `${p.name} plants a ${b.rat.name} in ${t.name}'s kitchen.`); }
      p._actedBuild = true; break;
    }
    case 'delivery': {
      bin(takeCard(act.id));
      const b = g.bins.filter(x => x.rat).sort((a, z) => z.rat.w - a.rat.w)[0];
      if (b) { g.bins = g.bins.filter(x => x.id !== b.id); if (E.ratEnters(g, p, b.rat)) p._ratsIn++; E.logAdd(g, `${p.name} takes a ${b.rat.name} from the bins.`); }
      p._actedBuild = true; break;
    }
    case 'exterm': {
      bin(takeCard(act.id));
      const r = p.rats.slice().sort((a, b) => b.heat - a.heat)[0];
      if (r) { p.rats = p.rats.filter(x => x.id !== r.id); g.bins.push({ id: r.id, rat: r }); E.logAdd(g, `${p.name} calls the Exterminator on a ${r.name}.`); }
      p._actedBuild = true; break;
    }
    case 'misc': { bin(takeCard(act.id)); const c = E.drawCard(g); if (c && !c.rat) p.hand.push(c); else if (c) g.bins.push(c); p._actedBuild = true; break; }
    case 'draw_instead': { const c = E.drawCard(g); if (c) { if (c.rat) { if (E.ratEnters(g, p, c.rat)) E.checkWin(g, p); } else { p.hand.push(c); if (c.card === 'wd_release') resolveWDRelease(g, p, c); } } p._actedAttack = true; p._actedBuild = true; break; }
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
    if (choice.type === 'draw_instead') break;
    if (p._actedAttack && p._actedBuild) {
      // still allow firing an armed inspection (free)
      const fire = legalActions(g, p).find(a => a.type === 'fire');
      if (fire) { apply(g, p, fire, botTarget(g, p, fire)); }
      break;
    }
  }
}

function threatTo(g, p) {
  let d = 0;
  for (const o of E.opponents(g, p)) if (o.armed && o.armed.age >= 1 && E.hasCol(p, o.armed.cols)) d += E.heatOf(p, o.armed.cols);
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
    if (has('eat')) return has('eat');
    if (has('boardup')) return has('boardup');
    if (iLead && has('ratato')) return has('ratato'); // shed heat
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
  // 5. build a deterrent
  if (has('sched2')) return has('sched2');
  if (has('sched1')) return has('sched1');
  if (has('poach')) return has('poach');
  if (has('delivery')) return has('delivery');
  if (has('mole')) return has('mole');
  if (has('grease')) return has('grease');
  if (has('food_boost')) return has('food_boost');
  if (has('misc')) return has('misc');
  if (has('rattrap')) return has('rattrap');
  return has('draw_instead') || has('end');
}

function botTarget(g, p, act) {
  const cands = act.targets.map(id => g.players.find(x => x.id === id)).filter(Boolean);
  if (!cands.length) return null;
  if (act.type === 'ratato' || act.type === 'trojan' || act.type === 'territorial')
    return cands.sort((a, b) => E.weight(b) - E.weight(a))[0].id; // hurt the leader
  if (act.type === 'rattrap') return cands.sort((a, b) => E.weight(b) - E.weight(a))[0].id;
  // steal/inspect: prefer close-to-win, then biggest hoard
  return cands.sort((a, b) => (E.weight(b) - E.weight(a)))[0].id;
}

module.exports = { startTurn, legalActions, apply, endTurn, botTurn, resolveWDRelease };
