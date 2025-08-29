# Connection Error Fixes

This document explains how to fix common connection errors with the PeopleParity desktop app.

## Common Error: ECONNREFUSED ::1:3001

This error occurs when the app tries to connect to the API server using IPv6 (`::1`) but the server is only listening on IPv4 (`127.0.0.1`).

### Quick Fix Commands

We've created several npm scripts to help you fix connection issues:

```bash
# 1. Check if the API server is running
npm run check:api

# 2. Fix connection issues automatically
npm run fix:connection

# 3. Fix IPv6-specific issues
npm run fix:ipv6

# 4. Rebuild and restart the app
npm run build && npm run dev
```

## Detailed Solutions

### Solution 1: Use the Automated Fix Script

```bash
npm run fix:connection
```

This script will:
- Check if the API server is running
- Test connectivity on IPv4 and IPv6
- Update your `.env` file to use IPv4
- Provide recommendations for fixing issues

### Solution 2: Fix IPv6 Issues Programmatically

```bash
npm run fix:ipv6
```

This Node.js script will:
- Create API configuration with IPv4 preference
- Update environment variables
- Generate a diagnostic report
- Test connectivity

### Solution 3: Manual Configuration

1. **Update your `.env` file:**

```env
API_URL=http://127.0.0.1:3001/api
VITE_API_URL=http://127.0.0.1:3001/api
```

2. **Ensure the API server is running:**

```bash
cd ../server
npm run dev
```

3. **Rebuild the desktop app:**

```bash
cd ../desktop
npm run build
npm run dev
```

## Prevention

The codebase has been updated to:
1. Use IPv4 (`127.0.0.1`) instead of `localhost` or `::1`
2. Force axios to use IPv4 connections
3. Replace any IPv6 addresses with IPv4 automatically

## Troubleshooting

### API Server Not Running

If you see "API server not running", start it:

```bash
cd ../server
npm install
npm run dev
```

### Port Already in Use

If port 3001 is already in use:

```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
kill -9 $(lsof -ti:3001)

# Restart the server
cd ../server && npm run dev
```

### Persistent IPv6 Issues

If you continue to have IPv6 issues after running the fixes:

1. **Check your hosts file:**

```bash
# macOS/Linux
sudo nano /etc/hosts

# Add or ensure these lines exist:
127.0.0.1 localhost
::1 ip6-localhost ip6-loopback
```

2. **Force Node.js to prefer IPv4:**

Set this environment variable before running the app:

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first"
npm run dev
```

## Diagnostic Information

After running `npm run fix:ipv6`, check the diagnostic report:

```bash
cat connection-diagnostic.txt
```

This report contains:
- DNS settings
- Environment variables
- Port status
- Connection test results

## Additional Commands

```bash
# Test IPv4 connection
curl http://127.0.0.1:3001/api/health

# Test IPv6 connection (usually fails)
curl http://[::1]:3001/api/health

# Check what's listening on port 3001
lsof -nP -i:3001

# Check network interfaces
netstat -an | grep 3001
```

## Support

If you continue to experience issues:

1. Run the diagnostic script: `npm run fix:ipv6`
2. Check the `connection-diagnostic.txt` file
3. Ensure both the API server and desktop app are running
4. Check that no firewall is blocking port 3001
5. Try restarting your computer

## Code Changes Made

The following files have been updated to fix IPv6 issues:

1. **`src/main/services/databaseService.ts`**
   - Forces IPv4 connections
   - Replaces localhost/::1 with 127.0.0.1

2. **`src/main/services/apiSyncService.ts`**
   - Uses IPv4 explicitly
   - Adds httpAgent with family: 4

3. **`package.json`**
   - Added `fix:connection` script
   - Added `fix:ipv6` script
   - Added `check:api` script

These changes ensure the app always uses IPv4 connections, preventing the ECONNREFUSED ::1:3001 error.