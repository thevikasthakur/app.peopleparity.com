# People Parity Desktop App

Time tracking and productivity monitoring application for desktop.

## 🚀 Quick Start

### For Windows Developers
**→ See [WINDOWS_BUILD_GUIDE.md](WINDOWS_BUILD_GUIDE.md) for step-by-step Windows instructions**

```cmd
cd apps\desktop
npm install
npm run dist:win
```

### For macOS Developers
```bash
cd apps/desktop
npm install  
npm run dist:mac
```

### For Linux Developers
```bash
cd apps/desktop
npm install
npm run dist:linux
```

## 📚 Documentation

- **[WINDOWS_BUILD_GUIDE.md](WINDOWS_BUILD_GUIDE.md)** - Detailed Windows build instructions
- **[BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)** - Comprehensive build guide for all platforms
- **[CROSS_PLATFORM_BUILD.md](CROSS_PLATFORM_BUILD.md)** - Cross-platform compatibility details
- **[DISTRIBUTION.md](DISTRIBUTION.md)** - Distribution and release information

## 🎯 Key Features

- Cross-platform (Windows, macOS, Linux)
- Automatic path fixing for production builds
- Native module support (SQLite, Sharp, etc.)
- Screenshot capture with annotations
- Time tracking with cloud sync
- Productivity metrics and reporting

## 🛠 Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build only (no packaging) |
| `npm run dist:win` | Build Windows installer |
| `npm run dist:mac` | Build macOS DMG |
| `npm run dist:linux` | Build Linux AppImage |

## 📦 Build Output

Builds are created in the `dist-electron/` directory:
- Windows: `People Parity Setup 1.0.0.exe`
- macOS: `People Parity-1.0.0.dmg`
- Linux: `People-Parity-1.0.0.AppImage`

## ⚠️ Important Notes

1. **The build process automatically handles path fixing** - no manual intervention needed
2. **Native modules are rebuilt automatically** during packaging
3. **All code is cross-platform compatible** - works on Windows, macOS, and Linux

## 🐛 Common Issues

### Blank Screen After Installation
This is automatically fixed by the build process. The `scripts/fix-paths.js` script converts absolute paths to relative paths.

### Native Module Errors
Run `npm rebuild` or `npm install --force`

### Build Timeouts
Already configured with `npmRebuild: false` to prevent timeouts.

## 🔧 Development

```bash
# Start development environment
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## 📄 License

Proprietary - Vikas Thakur