# 5D Chess: Multiverse Time Travel

Web-native **5D Chess with Multiverse Time Travel** — a fully client-side React + TypeScript implementation.

Every piece moves across four axes: **File (X)**, **Rank (Y)**, **Turn Time (T)**, and **Parallel Timelines (L)**. Leap into the past to branch new timelines, evade present threats, or deliver retrocausal checkmate.

## Features

- **4-axis spatiotemporal movement** — pieces move in space *and* time
- **Parallel timeline branching** — travel back and create a new timeline from the past
- **Cross-timeline check detection** — threats can come from any timeline
- **Tactical presets & puzzles** — 5×5 Tactical Multiverse, 8×8 Standard 5D Chess, Temporal SandboxLab
- **AI Chronomancer** — a built-in local AI opponent (no server needed)
- **2P Pass & Play** — local hot-seat multiplayer

## Play Online

Live: **https://hana-ame.github.io/5d-chess-multiverse-time-travel/**

## Run Locally

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build & Test

```bash
npm run lint       # TypeScript type check
npm run test       # engine test suite (5 tests)
npm run build      # production build to dist/
npm run build:pages  # build to docs/ for GitHub Pages
```

## Deploy

The repository uses **GitHub Actions** to build and deploy to GitHub Pages automatically on every push to `main`. The workflow:

1. Installs dependencies
2. Runs lint + tests
3. Builds the app into `docs/`
4. Uploads `docs/` as a Pages artifact and deploys it

The built site is a fully static single-page app — no backend or API keys required. The AI opponent logic (`computeAITurn`) runs entirely in the browser.
