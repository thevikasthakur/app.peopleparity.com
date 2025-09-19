# Windows Build Guide - People Parity Desktop App

## Quick Start for Windows Developers

This guide will help you build the People Parity desktop app on Windows.

## Prerequisites

1. **Install Node.js 18+**
   - Download from https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **Install Windows Build Tools**
   ```cmd
   npm install -g windows-build-tools
   ```
   Or install manually:
   - Visual Studio 2019/2022 with "Desktop development with C++" workload
   - Python 3.x from https://www.python.org/

3. **Install Git**
   - Download from https://git-scm.com/download/win

## Build Steps

### Step 1: Clone and Navigate
```cmd
git clone <your-repo-url>
cd time-tracker\apps\desktop
```

### Step 2: Install Dependencies
```cmd
npm install
```

If you get errors with native modules, try:
```cmd
npm install --force
```

### Step 3: Build for Windows
```cmd
npm run dist:win
```

This will:
1. Compile TypeScript code
2. Build the React renderer
3. Fix asset paths automatically (via scripts/fix-paths.js)
4. Package the app into Windows installer

### Step 4: Find Your Build
The installer will be created in:
```
dist-electron\People Parity Setup 1.0.0.exe
```

## Alternative Build Commands

### Development Mode
```cmd
npm run dev
```

### Build without packaging
```cmd
npm run build
```

### Clean build
```cmd
rmdir /s /q dist dist-electron out
npm run dist:win
```

## Troubleshooting

### Issue: Native module errors
**Solution:**
```cmd
npm rebuild
```
or
```cmd
npm install --force
```

### Issue: Python not found
**Solution:** Install Python 3.x and add to PATH, or:
```cmd
npm config set python python3
```

### Issue: Visual Studio errors
**Solution:** Install Visual Studio with C++ workload:
1. Download Visual Studio Installer
2. Select "Desktop development with C++" workload
3. Install and restart

### Issue: Blank screen after installation
**Solution:** This should be automatically fixed by the build process. The `scripts/fix-paths.js` script runs after build to ensure all paths are relative.

### Issue: Build timeout
**Solution:** The build is configured with `npmRebuild: false` to prevent timeouts. If you still have issues:
```cmd
set NODE_OPTIONS=--max-old-space-size=4096
npm run dist:win
```

## What Gets Built?

- **Installer**: `People Parity Setup 1.0.0.exe` (~100MB)
- **Portable ZIP**: `People Parity-1.0.0-win.zip` (~90MB)

## Running the Built App

1. **From Installer**:
   - Double-click the .exe installer
   - Follow installation wizard
   - Launch from Start Menu or Desktop shortcut

2. **From ZIP** (Portable):
   - Extract the ZIP file
   - Run `People Parity.exe`

## Important Notes

1. **Cross-Platform Code**: This codebase works on both Windows and macOS. All path handling is cross-platform compatible.

2. **Automatic Path Fixing**: The build process automatically fixes asset paths for production builds using `scripts/fix-paths.js`.

3. **Native Modules**: The app uses native modules (better-sqlite3, sharp, etc.). These are automatically rebuilt during the build process.

## Build Scripts Reference

- `npm run dev` - Start development environment
- `npm run build` - Build only (no packaging)
- `npm run dist:win` - Build and package for Windows
- `npm run dist:all` - Build for all platforms (requires additional tools)

## Need Help?

If you encounter issues not covered here:
1. Check `BUILD_INSTRUCTIONS.md` for general build info
2. Check `CROSS_PLATFORM_BUILD.md` for cross-platform details
3. Review the error messages carefully - they often indicate missing dependencies

## For Production Builds

For signed production builds, you'll need:
1. Code signing certificate
2. Set environment variables:
   ```cmd
   set CSC_LINK=path\to\certificate.pfx
   set CSC_KEY_PASSWORD=your_password
   ```

Without signing, Windows SmartScreen may warn users when installing.