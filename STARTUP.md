# People Parity - Startup Guide

## Quick Start

From the **root directory** of the project, run:

```bash
npm start
```

This will:
1. ✅ Check and fix desktop app native dependencies
2. ✅ Start the API server (if not running)
3. ✅ Launch the desktop application

## Available Commands (from root)

### 🚀 Main Commands

- `npm start` - Safe start with dependency checks (recommended)
- `npm run start:all` - Start using shell script (original method)
- `npm run api` - Start only the API server
- `npm run desktop` - Start only the desktop app (no checks)
- `npm run desktop:safe` - Start desktop with dependency checks

### 🔧 Maintenance Commands

- `npm run check:deps` - Check desktop native module compatibility
- `npm run rebuild:desktop` - Rebuild desktop native modules

## Common Issues

### Node Module Version Mismatch

**Problem:**
```
The module '.../better-sqlite3.node' was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 119.
```

**Solution:**
```bash
# From root directory:
npm start  # Automatically detects and fixes this

# Or manually:
npm run rebuild:desktop
```

### API Server Not Running

**Problem:**
Desktop app can't connect to API server

**Solution:**
```bash
# From root directory:
npm start  # Automatically starts API if needed

# Or manually:
npm run api
```

## How It Works

The `npm start` command runs a smart launcher that:

1. **Dependency Check Phase**
   - Verifies native modules are compatible with Electron
   - Automatically rebuilds if version mismatch detected
   - Uses `electron-rebuild` or `npm rebuild` as fallback

2. **API Server Phase**
   - Checks if API is running at http://127.0.0.1:3001
   - Starts API server if not running
   - Waits for API to be ready

3. **Desktop App Phase**
   - Launches the desktop application
   - All IPC handlers registered before window creation
   - Native modules already verified and working

## Manual Operations

If you prefer to run services individually:

```bash
# Terminal 1 - API Server
cd apps/api
npm run dev

# Terminal 2 - Desktop App
cd apps/desktop
npm run start:safe  # With checks
# or
npm run dev  # Without checks
```

## Troubleshooting

### Complete Reset

If you're having persistent issues:

```bash
# From root directory
cd apps/desktop
rm -rf node_modules
npm install
npx electron-rebuild
cd ../..
npm start
```

### Check Logs

The startup script provides detailed logging:
- 🔍 Checking phase
- ⚠️ Warnings (auto-fixed)
- ✅ Success confirmations
- ❌ Errors requiring manual intervention

## Development Tips

1. **Daily Use:** Always use `npm start` from root
2. **After Updates:** Run `npm run rebuild:desktop` after updating Node/Electron
3. **CI/CD:** The check scripts can be used in CI pipelines
4. **Production:** Dependencies are rebuilt during the build process

## Architecture

```
project-root/
├── scripts/
│   ├── check-desktop-deps.js  # Dependency checker
│   └── start-safe.js          # Safe launcher
├── apps/
│   ├── api/                   # Backend API
│   └── desktop/               # Electron app
│       └── scripts/           # Desktop-specific scripts
└── package.json               # Root commands
```

The root-level scripts coordinate both the API and desktop app, ensuring everything starts correctly with proper dependency management.