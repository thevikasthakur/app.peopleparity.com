#!/bin/bash

# Build and package People Parity for distribution
# Usage: ./scripts/build-release.sh [platform]
# Platforms: mac, win, linux, all (default: current platform)

set -e

PLATFORM=${1:-"current"}

echo "🚀 Building People Parity for distribution..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist-electron
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build

# Create distributable based on platform
case $PLATFORM in
  mac)
    echo "🍎 Building for macOS..."
    npm run dist -- --mac
    ;;
  win)
    echo "🪟 Building for Windows..."
    npm run dist -- --win
    ;;
  linux)
    echo "🐧 Building for Linux..."
    npm run dist -- --linux
    ;;
  all)
    echo "📦 Building for all platforms..."
    npm run dist
    ;;
  current)
    echo "💻 Building for current platform..."
    npm run dist
    ;;
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Valid options: mac, win, linux, all, current"
    exit 1
    ;;
esac

echo "✅ Build complete! Check dist-electron/ for the installers."

# List generated files
echo ""
echo "📁 Generated files:"
ls -la dist-electron/