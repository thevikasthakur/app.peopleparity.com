# Cross-Platform Build Guide

This document outlines the changes made to ensure the People Parity desktop app builds correctly on both macOS and Windows.

## Key Changes for Cross-Platform Compatibility

### 1. Vite Configuration (`vite.config.ts`)
- Set `base: './'` to ensure all assets use relative paths
- This is critical for Electron apps that load HTML via `file://` protocol

### 2. Path Fixing Script (`scripts/fix-paths.js`)
- Uses Node.js `path.join()` for cross-platform path handling
- Handles both forward slashes (Unix) and backslashes (Windows)
- Automatically runs after build via `build:renderer` script

### 3. Build Scripts (package.json)
- Added `rebuild:prod` step to Windows and Linux builds
- Ensures native modules are rebuilt for the target platform
- Scripts now consistent across all platforms:
  - `npm run dist:mac` - Build for macOS
  - `npm run dist:win` - Build for Windows  
  - `npm run dist:linux` - Build for Linux

### 4. Electron Builder Configuration (`electron-builder.json`)
- `npmRebuild: false` prevents build timeouts
- Platform-specific settings configured for each OS
- Works identically on macOS and Windows

### 5. Windows Batch Scripts
Created `.bat` equivalents for shell scripts:
- `scripts/fix-paths.bat` - Windows version of path fixing
- `scripts/build-all-platforms.bat` - Windows build script

## Building on Different Platforms

### On macOS:
```bash
# Build for macOS
npm run dist:mac

# Build for all platforms (requires Wine for Windows builds)
npm run dist:all
```

### On Windows:
```cmd
# Build for Windows
npm run dist:win

# Run path fixing manually if needed
node scripts/fix-paths.js
```

### On Linux:
```bash
# Build for Linux
npm run dist:linux
```

## Common Issues and Solutions

### Issue: Blank/white screen in production build
**Cause:** HTML file has absolute paths that don't work with file:// protocol
**Solution:** The fix-paths.js script automatically converts paths to relative

### Issue: Build timeouts on native modules
**Cause:** npmRebuild trying to rebuild modules during packaging
**Solution:** Set `npmRebuild: false` in electron-builder.json

### Issue: Path separators differ between OS
**Cause:** Windows uses backslashes, Unix uses forward slashes
**Solution:** Use Node.js path module for all path operations

## Testing Cross-Platform Builds

1. After making changes, test the build on your current OS first
2. Commit changes and test on the target OS
3. Verify the app launches correctly and assets load
4. Check that all native modules (sqlite, sharp, etc.) work properly

## Important Notes

- Always use `path.join()` for file paths in Node.js code
- Keep Vite's `base` config as `'./'` for relative paths
- Test builds on actual target platforms when possible
- The fix-paths script is idempotent and can be run multiple times safely