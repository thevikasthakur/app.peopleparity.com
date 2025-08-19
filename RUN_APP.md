# 🚀 Running People Parity Desktop App

## Quick Start

### Option 1: Web Preview Only (Fastest)
```bash
npm run dev:no-electron
```
Then open http://localhost:5173 in your browser

### Option 2: Full Desktop App
```bash
# Terminal 1: Build and watch
npm run dev:main

# Terminal 2: Start Vite dev server
npm run dev:renderer

# Terminal 3: After both are running, start Electron
npm run start
```

## What You'll See

1. **Login Screen** - Enter any email/password (mocked auth)
2. **Dashboard** with:
   - Mode toggle (Client/Command)
   - Task selector modal
   - Time tracking display
   - Screenshot grid (mock data)
   - Analytics & Leaderboard

## Troubleshooting

- **Port 5173 in use**: Kill the process or change port in vite.config.ts
- **Electron not opening**: Make sure to build main process first with `npm run dev:main`
- **Blank screen**: Check console for errors, ensure Vite is running

## Features Working

✅ Full UI with animations
✅ Mode switching with themes
✅ Task selection modal
✅ Mock data for testing
✅ Playful, sarcastic messages

## Not Yet Connected

- Real database (using mock data)
- Screenshot capture (showing placeholders)
- Activity tracking (simulated)
- API server (local only)

Enjoy your time tracking experience! 🎯