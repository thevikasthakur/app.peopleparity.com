#!/bin/bash

# Switch back to V1 implementation

echo "Switching back to original ActivityTracker implementation..."

# Restore backup
if [ -f "src/main/index.backup.ts" ]; then
  cp src/main/index.backup.ts src/main/index.ts
  echo "✅ Restored original implementation"
else
  echo "❌ No backup found. Please manually restore src/main/index.ts"
fi

# Build the application
npm run build:main

echo "✅ Switched to V1 implementation"