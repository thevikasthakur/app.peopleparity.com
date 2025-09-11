# People Parity Desktop App - Distribution Guide

## ✅ Build Setup Complete

The desktop application is now configured to build distributable installers for all major platforms.

## 📦 Available Distributables

### macOS
Successfully built and ready for distribution:
- **Intel Macs**: `People Parity-1.0.0.dmg` (118MB)
- **Apple Silicon**: `People Parity-1.0.0-arm64.dmg` (113MB)
- **Portable versions**: ZIP files also available

### Windows
Build configured for:
- **Installer**: NSIS installer (.exe)
- **Portable**: ZIP archive
- Requires Windows machine or Wine for cross-compilation

### Linux
Build configured for:
- **AppImage**: Universal package for all distributions
- **DEB**: For Debian/Ubuntu systems

## 🚀 Quick Build Commands

```bash
# Build for current platform
npm run dist

# Build for specific platforms
npm run dist:mac     # macOS
npm run dist:win     # Windows
npm run dist:linux   # Linux

# Build all platforms (requires proper setup)
npm run dist:all
```

## 📋 Distribution Checklist

### Before Distribution
- [x] Build configuration complete
- [x] Icons generated (placeholder - replace with branded icons)
- [x] Package metadata added (name, version, description, author)
- [ ] Replace placeholder icons with branded versions
- [ ] Test installer on target platforms
- [ ] Code signing (optional but recommended)

### Files to Distribute

#### macOS Users
Provide one of:
- `.dmg` file (recommended) - Beautiful installer with drag-to-Applications
- `.zip` file - For users who prefer manual installation

#### Windows Users
Provide:
- `.exe` installer (recommended) - Standard Windows installer
- `.zip` file - Portable version, no installation needed

#### Linux Users
Provide both:
- `.AppImage` - Works on most distributions
- `.deb` - For Debian/Ubuntu users

## 📝 Installation Instructions for End Users

### macOS
1. Download the `.dmg` file for your Mac type:
   - Intel Mac: `People Parity-1.0.0.dmg`
   - Apple Silicon (M1/M2/M3): `People Parity-1.0.0-arm64.dmg`
2. Double-click the downloaded file
3. Drag "People Parity" to the Applications folder
4. First launch: Right-click the app and select "Open"

### Windows
1. Download `People Parity Setup 1.0.0.exe`
2. Double-click to run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### Linux
#### AppImage (Recommended)
```bash
chmod +x People-Parity-1.0.0.AppImage
./People-Parity-1.0.0.AppImage
```

#### Debian/Ubuntu
```bash
sudo dpkg -i people-parity_1.0.0_amd64.deb
```

## 🔐 Code Signing (Production)

### Current Status
- ⚠️ Apps are NOT code signed
- Users will see security warnings on first launch
- This is normal for development/testing

### For Production Release
1. **macOS**: Requires Apple Developer account ($99/year)
2. **Windows**: Requires Code Signing Certificate ($200-500/year)
3. **Linux**: Not typically required

## 📊 File Sizes

| Platform | File | Size |
|----------|------|------|
| macOS Intel | People Parity-1.0.0.dmg | 118MB |
| macOS ARM | People Parity-1.0.0-arm64.dmg | 113MB |
| Windows | People Parity Setup 1.0.0.exe | ~100MB |
| Linux | People-Parity-1.0.0.AppImage | ~130MB |
| Linux | people-parity_1.0.0_amd64.deb | ~95MB |

## 🚨 Known Issues

1. **macOS Gatekeeper Warning**: Users will see "cannot be opened because the developer cannot be verified"
   - Solution: Right-click → Open, or System Preferences → Security & Privacy → Open Anyway

2. **Windows SmartScreen**: May block the installer
   - Solution: Click "More info" → "Run anyway"

3. **Linux AppImage**: Requires FUSE2
   - Solution: `sudo apt-get install libfuse2`

## 🔄 Auto-Update

The app is configured to check for updates from GitHub releases. To enable:
1. Create a GitHub repository for releases
2. Update `electron-builder.json` with your repository details
3. Use GitHub releases to publish updates

## 📍 Distribution Locations

Built files are located in: `/Users/thakur/Workspace/ppv1/time-tracker/apps/desktop/dist-electron/`

## 🎯 Next Steps

1. **Test Installation**: Install and test on each target platform
2. **Replace Icons**: Create proper branded icons
3. **Code Signing**: Set up certificates for production
4. **CI/CD**: Automate builds with GitHub Actions
5. **Update Server**: Set up auto-update infrastructure

## 💡 Tips for Distribution

1. **Version Numbers**: Follow semantic versioning (1.0.0)
2. **Release Notes**: Include clear changelog with each release
3. **Support Channels**: Provide clear support contact information
4. **System Requirements**: Document minimum OS versions
5. **Uninstall Instructions**: Provide clear uninstall steps

## 📞 Support

For build issues or questions:
- Check `BUILD_INSTRUCTIONS.md` for detailed build setup
- Review electron-builder documentation
- Test on actual target platforms before distribution