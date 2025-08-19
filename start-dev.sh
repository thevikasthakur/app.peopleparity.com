#!/bin/bash

echo "🚀 Starting People Parity Development Environment..."

# Build shared packages first
echo "📦 Building shared packages..."
npm run build --workspace=packages/shared

# Start the desktop app in development mode
echo "💻 Starting Desktop App..."
npm run dev --workspace=apps/desktop