#!/bin/bash

# Switch to V2 implementation

echo "Switching to ActivityTracker V2 implementation..."

# Backup current index.ts
cp src/main/index.ts src/main/index.backup.ts

# Copy V2 index
cp src/main/indexV2.ts src/main/index.ts

# Build the application
npm run build:main

echo "✅ Switched to V2 implementation"
echo "To revert, run: ./switch-to-v1.sh"