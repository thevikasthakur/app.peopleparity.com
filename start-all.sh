#!/bin/bash

# Start script for People Parity Time Tracker
# This ensures both API and Desktop app run together

echo "🚀 Starting People Parity Time Tracker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        echo "   Checking what's using it..."
        lsof -i :$1 | grep LISTEN
        return 1
    fi
    return 0
}

# Function to wait for API to be ready
wait_for_api() {
    echo -e "${YELLOW}⏳ Waiting for API server to be ready...${NC}"
    for i in {1..30}; do
        curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ API server is ready!${NC}"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    echo -e "${RED}❌ API server failed to start${NC}"
    return 1
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up any existing processes..."
pkill -f "nest start" 2>/dev/null
pkill -f "port 3001" 2>/dev/null
sleep 2

# Check if ports are available
echo "🔍 Checking ports..."
check_port 3001
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Port 3001 is still in use. Please free it and try again.${NC}"
    exit 1
fi

# Start API server
echo -e "${GREEN}🚀 Starting API server on port 3001...${NC}"
cd apps/api
npm run dev &
API_PID=$!
cd ../..

# Wait for API to be ready
wait_for_api
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start API server${NC}"
    kill $API_PID 2>/dev/null
    exit 1
fi

# Start Desktop app
echo -e "${GREEN}🖥️  Starting Desktop app...${NC}"
cd apps/desktop
npm run dev &
DESKTOP_PID=$!
cd ../..

echo -e "${GREEN}✨ All services started successfully!${NC}"
echo ""
echo "📝 Service Information:"
echo "   API Server: http://127.0.0.1:3001/api"
echo "   Desktop App: Running (Electron)"
echo ""
echo "   API PID: $API_PID"
echo "   Desktop PID: $DESKTOP_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"
    kill $API_PID 2>/dev/null
    kill $DESKTOP_PID 2>/dev/null
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running
while true; do
    # Check if processes are still running
    if ! kill -0 $API_PID 2>/dev/null; then
        echo -e "${RED}❌ API server crashed!${NC}"
        cleanup
    fi
    if ! kill -0 $DESKTOP_PID 2>/dev/null; then
        echo -e "${RED}❌ Desktop app crashed!${NC}"
        cleanup
    fi
    sleep 5
done