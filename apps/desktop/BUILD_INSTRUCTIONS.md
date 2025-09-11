# People Parity Desktop App - Build Instructions

## Prerequisites

### All Platforms
- Node.js 18+ and npm
- Git
- Python (for building native modules)

### Platform-Specific Requirements

#### macOS
- Xcode Command Line Tools: `xcode-select --install`
- For notarization (optional): Apple Developer account

#### Windows
- Windows Build Tools: `npm install -g windows-build-tools`
- Visual Studio 2019 or later with C++ workload

#### Linux
- Build essentials: `sudo apt-get install build-essential`
- Additional libraries:
  ```bash
  sudo apt-get install libx11-dev libxkbfile-dev libsecret-1-dev
  sudo apt-get install rpm fakeroot dpkg
  ```

## Building Distributables

### Quick Build (Current Platform Only)
```bash
cd apps/desktop
npm install
npm run dist
```

### Build for Specific Platforms

#### macOS (.dmg and .zip)
```bash
npm run dist:mac
```
Creates:
- `People Parity-1.0.0-arm64.dmg` (Apple Silicon)
- `People Parity-1.0.0-x64.dmg` (Intel)
- Corresponding .zip files

#### Windows (.exe installer and .zip)
```bash
npm run dist:win
```
Creates:
- `People Parity Setup 1.0.0.exe` (NSIS installer)
- `People Parity-1.0.0-win.zip` (Portable version)

#### Linux (.AppImage and .deb)
```bash
npm run dist:linux
```
Creates:
- `People-Parity-1.0.0.AppImage` (Universal package)
- `people-parity_1.0.0_amd64.deb` (Debian/Ubuntu)

### Build All Platforms
```bash
./scripts/build-all-platforms.sh
```

## Output Location
All distributable files are created in: `dist-electron/`

## File Sizes (Approximate)
- macOS .dmg: ~120MB
- Windows .exe: ~100MB
- Linux .AppImage: ~130MB
- Linux .deb: ~95MB

## Installation Instructions for Users

### macOS
1. Download the .dmg file
2. Double-click to mount
3. Drag "People Parity" to Applications folder
4. First run: Right-click and select "Open" (due to Gatekeeper)

### Windows
1. Download the .exe installer
2. Run the installer
3. Follow installation wizard
4. App will be available in Start Menu

### Linux

#### AppImage (Recommended)
```bash
chmod +x People-Parity-1.0.0.AppImage
./People-Parity-1.0.0.AppImage
```

#### Debian/Ubuntu (.deb)
```bash
sudo dpkg -i people-parity_1.0.0_amd64.deb
```

## Troubleshooting

### macOS Signing Issues
If users see "cannot be opened because the developer cannot be verified":
1. Go to System Preferences > Security & Privacy
2. Click "Open Anyway"

Or disable Gatekeeper temporarily:
```bash
sudo spctl --master-disable
```

### Windows SmartScreen
If Windows SmartScreen blocks the installer:
1. Click "More info"
2. Click "Run anyway"

### Linux Dependencies
If AppImage doesn't run:
```bash
sudo apt-get install libfuse2
```

## Code Signing (Production)

### macOS
Requires Apple Developer Certificate ($99/year)
1. Set environment variables:
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   ```
2. The build process will automatically sign and notarize

### Windows
Requires Code Signing Certificate (~$200-500/year)
1. Set certificate path in electron-builder.json
2. Set `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables

## Auto-Update Configuration

The app is configured to check for updates from GitHub releases.
Update the `publish` section in `electron-builder.json` with your repository details.

## Environment Variables for Build

Create a `.env` file:
```env
API_URL=https://api.peopleparity.com
NODE_ENV=production
```

## Build Optimization Tips

1. **Reduce Size**: Exclude unnecessary files in electron-builder.json
2. **Native Modules**: Pre-build for target architectures
3. **Assets**: Optimize images and icons before building

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build Desktop Apps
on:
  release:
    types: [created]
jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run dist
      - uses: actions/upload-artifact@v3
        with:
          name: distributables
          path: dist-electron/*
```

## Support

For build issues, check:
1. Node modules are correctly installed: `npm ci`
2. Native modules are rebuilt: `npm run rebuild`
3. All required system dependencies are installed
4. Electron version compatibility with native modules