#!/bin/bash

echo "🚀 Starting PeopleParity Full Stack"
echo "==================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n\nShutting down servers..."
    kill $API_PID $DESKTOP_PID 2>/dev/null
    exit
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Start API server
echo "Starting API server..."
cd ../api
npm run dev &
API_PID=$!
echo "API server PID: $API_PID"

# Wait for API to be ready
echo "Waiting for API server to start..."
while ! curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; do
    sleep 1
    echo -n "."
done
echo ""
echo "✅ API server is ready!"
echo ""

# Start desktop app
echo "Starting desktop app..."
cd ../desktop
npm run dev &
DESKTOP_PID=$!
echo "Desktop app PID: $DESKTOP_PID"
echo ""

echo "✅ All services started successfully!"
echo ""
echo "Services running:"
echo "  API Server: http://127.0.0.1:3001"
echo "  Desktop App: Running in Electron"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait