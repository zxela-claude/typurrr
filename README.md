# TYPURRR 🐱

> **Type fast. Meow louder.**

A retro pixel-art typing racer where cats sprint across your screen as you type. Race solo, challenge friends in real-time, or leave a ghost for someone to race against later.

**Live at → [typurrr.vercel.app](https://typurrr.vercel.app)**

---

## Features

- **Solo mode** — race against yourself, track your WPM and accuracy over time
- **Multiplayer** — real-time races with friends via room codes or shareable links
- **Async challenges** — race the same text as a friend and race their recorded ghost
- **Global leaderboard** — all-time and weekly top scores
- **3 retro palettes** — Phosphor Green, Amber Arcade, Game Boy DMG (switchable mid-game)
- **4 cat variants** — orange, grey, tuxedo, calico (pick yours in your profile)
- **Zero framework** — vanilla JS ES modules, no build step, no bundler

---

## Screenshots

| Landing | Race | Results |
|---------|------|---------|
| Phosphor green glow, animated logo | Cats race across a pixel track | Finish order with WPM + accuracy |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JS (ES Modules) + HTML/CSS |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| Real-time | Supabase Realtime (broadcast) |
| Font | Press Start 2P (Google Fonts) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- [Supabase](https://supabase.com) project (free tier works)
- [Vercel](https://vercel.com) account

### Local setup

```bash
git clone https://github.com/zxela-claude/typurrr.git
cd typurrr
npm install
```

Open `index.html` in a browser. Without Supabase credentials the game works in "demo mode" (solo play with fallback prompts, no score saving).

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com/dashboard)
2. Run the schema: **Dashboard → SQL Editor** → paste `supabase/schema.sql` → Run
3. Grab your **Project URL** and **anon key** from **Settings → API**

### Environment variables

For local dev, create a `.env` (not needed for production — Vercel handles it):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

For production, set these in **Vercel → Project → Settings → Environment Variables**.

---

## Deployment

### Automatic (GitHub Actions)

Push to `main` → tests run → auto-deploys to Vercel.

Required GitHub secrets (set in **Settings → Secrets → Actions**):

| Secret | Where to find it |
|--------|-----------------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | vercel.com → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | vercel.com → typurrr project → Settings → General |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → Project API keys → anon |

PRs get automatic preview deployments with a comment on the PR.

### Manual deploy

```bash
npm install -g vercel
vercel --prod
```

---

## Architecture

```
typurrr/
├── index.html              # HTML shell — all screens, loaded once
├── css/main.css            # All styles + CSS variables per palette
├── js/
│   ├── app.js              # Entry: palette, auth, nav, URL routing
│   ├── engine.js           # Typing engine (pure logic, no DOM)
│   ├── sprites.js          # Pixel cat renderer (canvas, no external assets)
│   ├── screens.js          # Screen router
│   ├── auth.js             # Supabase auth + modal
│   ├── solo.js             # Solo mode
│   ├── race.js             # Multiplayer race (lobby + Realtime)
│   ├── ghost.js            # Async challenge ghost replay
│   ├── leaderboard.js      # Leaderboard screen
│   ├── profile.js          # Profile + avatar picker
│   ├── supabase.js         # All DB/auth helper functions
│   └── config.js           # Constants, env var injection point
├── build.js                # Build script — copies to dist/, injects env vars
├── vercel.json             # Vercel config
├── supabase/schema.sql     # Full DB schema + RLS + seed prompts
└── tests/engine.test.js    # Vitest unit tests for typing engine
```

### How the typing engine works

`engine.js` is pure logic — no DOM, no side effects, fully unit tested:

- Correct char → advance cursor
- Wrong char → mark error (cursor blocked until backspace)
- **WPM** = (correct chars / 5) / elapsed minutes
- **Accuracy** = correct keystrokes / total keystrokes × 100

### How real-time races work

1. Host creates a race → gets a 6-char room code
2. Players join via code or link → subscribe to `lobby:{raceId}` Postgres changes channel
3. Host clicks Start → race status updates to `countdown` → all clients start 3-second countdown
4. Race begins → each client tracks their own progress locally, broadcasts `{userId, pct}` over a Supabase Realtime broadcast channel
5. On finish → save score, record ghost keystrokes, broadcast finish

### Async challenges

After a race, players can copy a `?challenge=RACE_ID` URL. When someone opens it, their browser:
1. Loads the same prompt
2. Fetches the fastest ghost (recorded keystrokes from the original race)
3. Replays the ghost using delta timestamps while the challenger types in real-time

---

## Testing

```bash
npm test          # run tests once
npm run test:watch  # watch mode
```

15 unit tests covering the typing engine: cursor movement, error states, WPM calculation, accuracy, completion detection.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add something awesome'`
4. Push: `git push origin feat/your-feature`
5. Open a PR — you'll get an automatic preview deploy

---

## License

MIT
