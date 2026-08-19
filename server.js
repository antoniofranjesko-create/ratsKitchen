// RAT'S KITCHEN v3 — SERVER
'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const E = require('./game/engine');
const A = require('./game/actions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(process.cwd(), 'public')));

const rooms = {}; // code -> {players:[{id,name,bot,socket}], game, started}

function code() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }

// project the game state for one viewer (their hand private, others' counts only)
function project(g, viewerId) {
  return {
    over: g.over, winner: g.winner, active: g.players[g.active] && g.players[g.active].id,
    turn: g.turn, threshold: E.THRESHOLD, log: g.log.slice(-14),
    binsRats: g.bins.filter(b => b.rat).length,
    deckLeft: g.deck.length,
    players: g.players.map(p => ({
      id: p.id, name: p.name, bot: p.bot, alive: p.alive,
      stars: p.stars, weight: E.weight(p), heat: E.heat(p), count: p.rats.length,
      // rats are public (zones are public) — show kind + colour, no ids to others
      rats: p.rats.map(r => ({ name: r.name, w: r.w, heat: r.heat, col: r.col, prop: r.prop })),
      armed: p.armed ? { cols: p.armed.cols, ready: p.armed.age >= 1 } : null,
      boardup: p.boardup, territorial: p.territorial,
      handCount: p.hand.length,
      hand: p.id === viewerId ? p.hand.map(c => ({ id: c.id, card: c.card, name: E.CARDS[c.card] ? E.CARDS[c.card].name : c.card })) : null,
    })),
    you: viewerId,
    yourActions: (() => {
      const p = g.players.find(x => x.id === viewerId);
      if (!p || !p.alive || g.over) return [];
      if (g.players[g.active].id !== viewerId) return [];
      return A.legalActions(g, p).map(a => ({
        type: a.type, id: a.id, label: a.label,
        needsTarget: !!a.needsTarget, needsRat: !!a.needsRat, targets: a.targets || [],
      }));
    })(),
  };
}

function broadcast(room) {
  for (const pl of room.players) {
    if (pl.socket) pl.socket.emit('state', project(room.game, pl.id));
  }
}

// advance any bot turns until it's a human's turn or game over
function runBots(room) {
  const g = room.game;
  let guard = 0;
  while (!g.over && guard++ < 400) {
    const act = g.players[g.active];
    A.startTurn(g);
    if (g.over) break;
    if (act.bot) {
      A.botTurn(g);
      A.endTurn(g);
      broadcast(room);
    } else {
      broadcast(room);
      return; // wait for human input
    }
  }
  broadcast(room);
}

io.on('connection', (socket) => {
  let myRoom = null, myId = null;

  socket.on('create', ({ name }) => {
    const c = code();
    myId = E.rid();
    rooms[c] = { code: c, players: [{ id: myId, name: name || 'Host', bot: false, socket }], game: null, started: false };
    myRoom = c;
    socket.join(c);
    socket.emit('room', { code: c, you: myId, players: rooms[c].players.map(p => ({ id: p.id, name: p.name, bot: p.bot })) });
  });

  socket.on('join', ({ code: c, name }) => {
    const room = rooms[c];
    if (!room || room.started) { socket.emit('err', 'No such open room.'); return; }
    myId = E.rid(); myRoom = c;
    room.players.push({ id: myId, name: name || 'Player', bot: false, socket });
    socket.join(c);
    io.to(c).emit('room', { code: c, you: myId, players: room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot })) });
  });

  socket.on('addBot', () => {
    const room = rooms[myRoom]; if (!room || room.started) return;
    if (room.players.length >= 8) return;
    room.players.push({ id: E.rid(), name: 'Bot ' + room.players.length, bot: true, socket: null });
    io.to(myRoom).emit('room', { code: myRoom, players: room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot })) });
  });

  socket.on('start', () => {
    const room = rooms[myRoom]; if (!room || room.started) return;
    if (room.players.length < 2) { socket.emit('err', 'Need at least 2 players.'); return; }
    room.started = true;
    room.game = E.newGame(room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot })));
    io.to(myRoom).emit('begin', {});
    runBots(room);
  });

  socket.on('act', ({ type, id, target, ratId }) => {
    const room = rooms[myRoom]; if (!room || !room.game || room.game.over) return;
    const g = room.game;
    if (g.players[g.active].id !== myId) return;
    const p = g.players[g.active];
    const acts = A.legalActions(g, p);
    const act = acts.find(a => a.type === type && (id ? a.id === id : true));
    if (!act) return;
    A.apply(g, p, act, target, ratId);
    if (g.over) { broadcast(room); return; }
    // end turn automatically when both actions used or player chose end/draw
    if (type === 'end' || type === 'draw_instead' || (p._actedAttack && p._actedBuild && !A.legalActions(g, p).some(a => a.type === 'fire'))) {
      A.endTurn(g);
      runBots(room);
    } else {
      broadcast(room);
    }
  });

  socket.on('endTurn', () => {
    const room = rooms[myRoom]; if (!room || !room.game || room.game.over) return;
    const g = room.game;
    if (g.players[g.active].id !== myId) return;
    A.endTurn(g);
    runBots(room);
  });

  socket.on('disconnect', () => {
    const room = rooms[myRoom];
    if (room && !room.started) {
      room.players = room.players.filter(p => p.socket !== socket);
      if (room.players.length === 0) delete rooms[myRoom];
      else io.to(myRoom).emit('room', { code: myRoom, players: room.players.map(p => ({ id: p.id, name: p.name, bot: p.bot })) });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Rat's Kitchen v3 on :${PORT}`));
