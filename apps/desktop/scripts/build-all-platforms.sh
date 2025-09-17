#!/bin/bash

# Build script for all platforms
# This script builds distributable installers for Windows, macOS, and Linux

echo "🚀 Building People Parity Desktop App for all platforms..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on the correct platform for cross-compilation
platform=$(uname -s)
echo "Building from platform: $platform"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist-electron/
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Rebuild native modules for Electron
echo "🔧 Rebuilding native modules..."
npm run rebuild

# Build the application
echo "🏗️ Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please check the errors above.${NC}"
    exit 1
fi

# Build for each platform
echo "📦 Creating distributables..."

# macOS
if [[ "$platform" == "Darwin" ]]; then
    echo -e "${YELLOW}🍎 Building for macOS...${NC}"
    npm run dist:mac
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ macOS build complete!${NC}"
        echo "Files created:"
        ls -la dist-electron/*.dmg 2>/dev/null
        ls -la dist-electron/*.zip 2>/dev/null
    fi
fi

# Windows (can be built from macOS/Linux with Wine)
echo -e "${YELLOW}🪟 Building for Windows...${NC}"
npm run dist:win
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Windows build complete!${NC}"
    echo "Files created:"
    ls -la dist-electron/*.exe 2>/dev/null
    ls -la dist-electron/*-win.zip 2>/dev/null
else
    echo -e "${YELLOW}⚠️ Windows build requires Wine to be installed for cross-compilation${NC}"
fi

# Linux
echo -e "${YELLOW}🐧 Building for Linux...${NC}"
npm run dist:linux
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Linux build complete!${NC}"
    echo "Files created:"
    ls -la dist-electron/*.AppImage 2>/dev/null
    ls -la dist-electron/*.deb 2>/dev/null
fi

echo ""
echo "📁 All builds are in the dist-electron/ directory"
echo ""
echo "Distribution files created:"
echo "=========================="
ls -lah dist-electron/ | grep -E "\.(dmg|exe|AppImage|deb|zip)" | awk '{print "  • " $9 " (" $5 ")"}'

echo ""
echo -e "${GREEN}🎉 Build process complete!${NC}"
echo ""
echo "Installation instructions:"
echo "========================"
echo "macOS: Double-click the .dmg file and drag to Applications"
echo "Windows: Run the .exe installer"
echo "Linux: Make AppImage executable (chmod +x) and run, or install .deb with dpkg"