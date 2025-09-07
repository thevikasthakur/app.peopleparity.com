# People Parity Time Tracker - Installation Guide

## System Requirements

### Minimum Requirements
- **Operating System**: 
  - Windows 10 or later (64-bit)
  - macOS 10.15 (Catalina) or later
  - Ubuntu 20.04 or later (64-bit)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB available space
- **Internet**: Required for syncing data and authentication

## Download Links

Download the appropriate installer for your operating system:

- **Windows**: [People-Parity-Setup-1.0.0.exe](#)
- **macOS Intel**: [People-Parity-1.0.0-x64.dmg](#)
- **macOS Apple Silicon**: [People-Parity-1.0.0-arm64.dmg](#)
- **Linux**: [People-Parity-1.0.0.AppImage](#)

## Installation Instructions

### Windows Installation

1. **Download the installer**
   - Download `People-Parity-Setup-1.0.0.exe`

2. **Run the installer**
   - Double-click the downloaded file
   - If Windows Defender SmartScreen appears, click "More info" then "Run anyway"

3. **Follow installation wizard**
   - Accept the license agreement
   - Choose installation directory (or keep default)
   - Select whether to create desktop shortcut
   - Click "Install"

4. **Launch the application**
   - Find "People Parity" in Start Menu
   - Or use the desktop shortcut if created

### macOS Installation

1. **Download the installer**
   - For Intel Macs: Download `People-Parity-1.0.0-x64.dmg`
   - For Apple Silicon (M1/M2): Download `People-Parity-1.0.0-arm64.dmg`

2. **Open the DMG file**
   - Double-click the downloaded DMG file
   - A window will open showing the app icon

3. **Install the application**
   - Drag the "People Parity" icon to the Applications folder
   - Wait for the copy to complete

4. **First launch**
   - Open Finder and go to Applications
   - Right-click on "People Parity" and select "Open"
   - Click "Open" in the security dialog (first time only)

5. **Grant permissions**
   - macOS will ask for Screen Recording permission
   - Go to System Preferences > Security & Privacy > Screen Recording
   - Check the box next to "People Parity"
   - Restart the application

### Linux Installation

#### AppImage (Recommended)

1. **Download the AppImage**
   - Download `People-Parity-1.0.0.AppImage`

2. **Make it executable**
   ```bash
   chmod +x People-Parity-1.0.0.AppImage
   ```

3. **Run the application**
   ```bash
   ./People-Parity-1.0.0.AppImage
   ```

4. **Optional: Desktop integration**
   - Right-click the AppImage while running
   - Select "Integrate and run"

#### Debian/Ubuntu (.deb)

1. **Download the package**
   - Download `people-parity_1.0.0_amd64.deb`

2. **Install via terminal**
   ```bash
   sudo dpkg -i people-parity_1.0.0_amd64.deb
   sudo apt-get install -f  # Fix any dependency issues
   ```

3. **Launch from applications menu**
   - Find "People Parity" in your applications menu

## First Time Setup

### 1. Launch the Application
Open People Parity from your applications menu or desktop shortcut.

### 2. Login or Register
- **Existing users**: Enter your email and password
- **New users**: Click "Register" and create an account
- **SSO users**: Click "Login with SSO" if your organization uses single sign-on

### 3. Configure Settings
On first launch, you may want to configure:
- **Startup**: Enable "Launch at startup" for automatic time tracking
- **Screenshots**: Review screenshot frequency (default: every 10 minutes)
- **Notifications**: Configure notification preferences

### 4. Start Tracking
- Click "Start Session" to begin tracking
- Choose between "Client Hours" or "Command Hours" mode
- The app will now track your activity and take periodic screenshots

## Troubleshooting

### Windows Issues

**"Windows protected your PC" message**
- This is normal for new applications
- Click "More info" then "Run anyway"

**Application won't start**
- Install Visual C++ Redistributable if missing
- Check Windows Defender or antivirus exceptions

### macOS Issues

**"App is damaged and can't be opened"**
```bash
xattr -cr /Applications/People\ Parity.app
```

**Screen recording permission not working**
1. Quit People Parity completely
2. Open System Preferences > Security & Privacy
3. Click the lock to make changes
4. Uncheck and recheck "People Parity" under Screen Recording
5. Restart the application

**App won't open (Apple Silicon)**
- Make sure you downloaded the ARM64 version
- Or enable Rosetta: Right-click app > Get Info > Check "Open using Rosetta"

### Linux Issues

**AppImage won't run**
- Install FUSE: `sudo apt install libfuse2`
- Make sure file is executable: `chmod +x People-Parity-1.0.0.AppImage`

**Missing dependencies**
```bash
sudo apt update
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils
```

## Uninstallation

### Windows
1. Open Control Panel > Programs and Features
2. Find "People Parity" in the list
3. Click "Uninstall"
4. Follow the uninstall wizard

### macOS
1. Quit People Parity if running
2. Open Finder > Applications
3. Drag "People Parity" to Trash
4. Empty Trash
5. Optional: Remove settings:
   ```bash
   rm -rf ~/Library/Application\ Support/People\ Parity
   rm -rf ~/Library/Preferences/com.peopleparity.timetracker.plist
   ```

### Linux
**AppImage**: Simply delete the AppImage file

**Debian package**:
```bash
sudo apt remove people-parity
sudo apt purge people-parity  # Also remove configuration
```

## Security & Privacy

### Data Collection
People Parity collects:
- Screenshots (stored securely, only visible to you and authorized managers)
- Keyboard and mouse activity metrics (not keylogging)
- Active application information
- Time tracking data

### Privacy Settings
You can configure privacy settings in the application:
- Blur sensitive information in screenshots
- Pause tracking during breaks
- Delete screenshots locally

### Data Storage
- Screenshots are encrypted and stored locally
- Data syncs to secure cloud servers
- All communication uses HTTPS encryption

## Getting Help

### Support Channels
- **Email**: support@peopleparity.com
- **Documentation**: https://docs.peopleparity.com
- **FAQ**: https://peopleparity.com/faq

### Reporting Issues
When reporting issues, please include:
- Operating system and version
- People Parity version (Help > About)
- Description of the problem
- Steps to reproduce
- Any error messages

### Enterprise Support
For enterprise deployment and support:
- **Email**: enterprise@peopleparity.com
- **Phone**: Available for enterprise customers

## License

People Parity is proprietary software. By installing and using this application, you agree to the terms of service available at https://peopleparity.com/terms

---

© 2025 People Parity Inc. All rights reserved.