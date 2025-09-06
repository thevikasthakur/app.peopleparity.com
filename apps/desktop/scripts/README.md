# Desktop App Scripts

This directory contains utility scripts for managing the People Parity desktop application.

## Available Scripts

### 🚀 `start.js`
**Usage:** `npm run start:safe`

A safe startup script that:
- Checks native dependency compatibility before launching
- Automatically rebuilds native modules if needed
- Provides clear error messages and recovery steps
- Handles graceful shutdown

### 🔍 `check-native-deps.js`
**Usage:** `npm run check:deps`

Checks if native dependencies (like better-sqlite3) are compatible with the current Electron version:
- Detects NODE_MODULE_VERSION mismatches
- Attempts automatic rebuild if issues are found
- Provides diagnostic information

### 📦 `install-deps.sh`
**Usage:** `./scripts/install-deps.sh`

Complete dependency installation and rebuild:
- Installs all npm dependencies
- Installs electron-rebuild if needed
- Rebuilds all native modules for Electron
- Verifies the installation

## Common Issues and Solutions

### Node Module Version Mismatch

**Error:**
```
The module '...better-sqlite3.node' was compiled against a different Node.js version using NODE_MODULE_VERSION X. This version of Node.js requires NODE_MODULE_VERSION Y.
```

**Solution:**
1. Run `npm run start:safe` - it will automatically fix this
2. Or manually: `npm run rebuild`
3. Or complete reinstall: `./scripts/install-deps.sh`

### Manual Rebuild Commands

If automatic fixes don't work:
```bash
# Rebuild specific module
npm rebuild better-sqlite3

# Rebuild all modules
npm rebuild

# Use electron-rebuild (recommended)
npx electron-rebuild

# Complete clean install
rm -rf node_modules
npm install
npx electron-rebuild
```

## NPM Scripts

Add these to your workflow:

- `npm run start:safe` - Start with dependency checks
- `npm run check:deps` - Check dependency compatibility
- `npm run rebuild` - Rebuild native modules
- `npm run dev` - Normal development mode (no checks)

## When to Use Each Script

- **First time setup:** Run `./scripts/install-deps.sh`
- **Daily development:** Use `npm run start:safe`
- **After Node/Electron update:** Run `npm run rebuild`
- **Debugging issues:** Use `npm run check:deps`
- **Production build:** Dependencies should be rebuilt as part of build process

## Architecture Notes

The scripts handle these native dependencies:
- `better-sqlite3` - SQLite database
- `uiohook-napi` - Keyboard/mouse tracking
- `node-window-manager` - Window management (if installed)

Each module must be compiled for the specific Electron version's Node.js runtime.