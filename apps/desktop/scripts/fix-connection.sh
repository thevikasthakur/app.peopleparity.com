#!/bin/bash

# Script to fix common connection issues with the API server

echo "🔧 PeopleParity Connection Fix Tool"
echo "===================================="
echo ""

# Function to check if API server is running
check_api_server() {
    echo "1️⃣  Checking API server status..."
    
    # Check if server is running on port 3001
    if lsof -ti:3001 > /dev/null 2>&1; then
        echo "   ✅ API server is running on port 3001"
        echo "   Process ID: $(lsof -ti:3001)"
    else
        echo "   ❌ API server is NOT running on port 3001"
        echo ""
        echo "   To start the API server, run:"
        echo "   cd ../api && npm run dev"
        return 1
    fi
    
    # Check which interface it's listening on
    echo ""
    echo "2️⃣  Checking network interfaces..."
    netstat -an | grep "3001" | grep LISTEN || lsof -nP -i:3001
    echo ""
    
    return 0
}

# Function to test connectivity
test_connectivity() {
    echo "3️⃣  Testing connectivity..."
    echo ""
    
    # Test IPv4
    echo -n "   Testing IPv4 (127.0.0.1:3001): "
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health 2>/dev/null | grep -q "200\|404"; then
        echo "✅ Connected"
    else
        echo "❌ Failed"
    fi
    
    # Test IPv6
    echo -n "   Testing IPv6 ([::1]:3001): "
    if curl -s -o /dev/null -w "%{http_code}" http://[::1]:3001/health 2>/dev/null | grep -q "200\|404"; then
        echo "✅ Connected"
    else
        echo "❌ Failed (This is usually OK - we'll fix it)"
    fi
    
    # Test localhost
    echo -n "   Testing localhost:3001: "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null | grep -q "200\|404"; then
        echo "✅ Connected"
    else
        echo "❌ Failed"
    fi
    echo ""
}

# Function to fix the API URL configuration
fix_api_url() {
    echo "4️⃣  Fixing API URL configuration..."
    echo ""
    
    # Check current .env settings
    if [ -f ".env" ]; then
        echo "   Current .env configuration:"
        grep -E "API_URL|VITE_API_URL" .env 2>/dev/null || echo "   No API_URL found in .env"
    else
        echo "   No .env file found. Creating one..."
        touch .env
    fi
    
    echo ""
    echo "   Setting API URL to use IPv4 explicitly..."
    
    # Update or add API_URL in .env
    if grep -q "^API_URL=" .env 2>/dev/null; then
        sed -i '' 's|^API_URL=.*|API_URL=http://127.0.0.1:3001/api|' .env
    else
        echo "API_URL=http://127.0.0.1:3001/api" >> .env
    fi
    
    if grep -q "^VITE_API_URL=" .env 2>/dev/null; then
        sed -i '' 's|^VITE_API_URL=.*|VITE_API_URL=http://127.0.0.1:3001/api|' .env
    else
        echo "VITE_API_URL=http://127.0.0.1:3001/api" >> .env
    fi
    
    echo "   ✅ Updated .env file with IPv4 address"
    echo ""
    echo "   New configuration:"
    grep -E "API_URL|VITE_API_URL" .env
    echo ""
}

# Function to restart the desktop app
restart_app() {
    echo "5️⃣  Restarting the desktop app..."
    echo ""
    
    # Find and kill existing npm/electron processes for desktop
    echo "   Stopping existing processes..."
    pkill -f "electron.*desktop" 2>/dev/null
    pkill -f "npm.*desktop" 2>/dev/null
    sleep 2
    
    echo "   Starting the app..."
    npm run dev &
    echo "   ✅ App restarted. Check the window for the application."
    echo ""
}

# Main execution
echo "Starting diagnostics..."
echo ""

check_api_server
if [ $? -eq 0 ]; then
    test_connectivity
    
    echo "🔧 Applying fixes..."
    echo ""
    fix_api_url
    
    echo "🎯 Recommendations:"
    echo "==================="
    echo ""
    echo "1. The app has been configured to use IPv4 (127.0.0.1) instead of IPv6"
    echo "2. Please restart the desktop app for changes to take effect:"
    echo ""
    echo "   npm run dev"
    echo ""
    echo "3. If you still have issues, ensure the API server is running:"
    echo "   cd ../api && npm run dev"
    echo ""
else
    echo ""
    echo "⚠️  Please start the API server first!"
    echo ""
    echo "Run these commands:"
    echo "  cd ../api"
    echo "  npm run dev"
    echo ""
    echo "Then run this script again."
fi