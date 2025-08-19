#!/bin/bash

echo "🚀 Starting People Parity Desktop App..."

# First, rebuild native modules for Electron
echo "📦 Rebuilding native modules for Electron..."
npm rebuild better-sqlite3 --runtime=electron --target=28.2.0 --dist-url=https://electronjs.org/headers --abi=119

# Compile TypeScript
echo "🔧 Compiling TypeScript..."
npx tsc -p tsconfig.main.json

# Start Electron
echo "💻 Launching Electron..."
NODE_ENV=development npx electron dist/main/index.js