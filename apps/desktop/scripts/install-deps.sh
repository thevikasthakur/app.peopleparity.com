#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  People Parity - Dependency Installer${NC}"
echo -e "${CYAN}========================================${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo -e "${YELLOW}   Please run this script from the desktop app directory${NC}"
    exit 1
fi

# Install npm dependencies
echo -e "\n${BLUE}📦 Installing npm dependencies...${NC}"
npm install

# Install electron-rebuild if not present
if ! npm list electron-rebuild >/dev/null 2>&1; then
    echo -e "\n${BLUE}🔧 Installing electron-rebuild...${NC}"
    npm install --save-dev electron-rebuild
fi

# Rebuild native modules for Electron
echo -e "\n${BLUE}🔨 Rebuilding native modules for Electron...${NC}"
npx electron-rebuild

# Verify the rebuild
echo -e "\n${BLUE}🔍 Verifying native modules...${NC}"
node scripts/check-native-deps.js

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ All dependencies installed and rebuilt successfully!${NC}"
    echo -e "${CYAN}   You can now run: npm run start:safe${NC}"
else
    echo -e "\n${RED}❌ There were issues with the dependencies${NC}"
    echo -e "${YELLOW}   Please check the errors above${NC}"
    exit 1
fi