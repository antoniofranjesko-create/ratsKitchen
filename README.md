# Rat's Kitchen — Online Multiplayer

## What you need

1. A **Render** account (free) — https://render.com (recommended — Railway no longer has a free tier)
2. A **GitHub** account (free) — to host the code

That's it. No credit card required for the free tier.

---

## One-time setup (takes ~15 minutes)

### Step 1 — Put the code on GitHub

1. Go to https://github.com/new
2. Create a new repository called `rats-kitchen`
3. Upload all files from the `rats-kitchen-online` folder:
   - `package.json`
   - `server/index.js`
   - `server/engine.js`
   - `public/index.html`

### Step 2 — Deploy on Render

1. Go to https://render.com and sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your `rats-kitchen` repository
4. Build command: `npm install`   Start command: `npm start`
5. Instance type: **Free**
6. Click **Create Web Service**
7. Your game is live at the URL Render gives you (e.g. `rats-kitchen.onrender.com`)

Note: Render's free tier sleeps after 15 minutes of inactivity — first
load after sleep takes ~30-50 seconds to wake up. Fine for casual play;
upgrade to a paid instance ($7/mo) if you want always-on.

### Step 3 — Play

1. Open the URL in your browser
2. Enter your name, pick player count, click **Create Room**
3. Share the 4-letter room code with friends
4. They open the same URL, enter their name, paste the code, click **Join**
5. Game starts automatically when all players have joined

---

## How private hands work

- The server holds the full game state including all hands and the deck order
- Each player's browser only receives their own hand — opponents see only card counts
- You cannot cheat by inspecting browser state because your hand data is sent only to your socket connection

---

## Free tier limits (Railway)

- 500 hours/month of runtime (enough for ~20 hours/day)
- Sleeps after inactivity — first load after sleep takes ~10 seconds
- Upgrade to $5/month for always-on if you want to avoid the sleep

## Local testing (before deploying)

```bash
cd rats-kitchen-online
npm install
npm start
# open http://localhost:3000 in two browser tabs
```

---

## File structure

```
rats-kitchen-online/
├── package.json          ← Node dependencies
├── server/
│   ├── index.js          ← Game server (Socket.io, room management, card logic)
│   └── engine.js         ← Deck building, game state projection
└── public/
    └── index.html        ← Client (React, lobby, game UI)
```
