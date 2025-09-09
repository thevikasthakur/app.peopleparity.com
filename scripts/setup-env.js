#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function updateDesktopEnv(apiUrl) {
  const envPath = path.join(__dirname, '..', 'apps', 'desktop', '.env');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update or add API_URL
  if (envContent.includes('API_URL=')) {
    envContent = envContent.replace(/API_URL=.*/g, `API_URL=${apiUrl}`);
  } else {
    envContent += `\nAPI_URL=${apiUrl}`;
  }
  
  // Ensure LOCAL_DB_PATH is set
  if (!envContent.includes('LOCAL_DB_PATH=')) {
    envContent += '\nLOCAL_DB_PATH=./data/local.db';
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Updated desktop .env with API_URL=${apiUrl}`);
}

function detectApiMode() {
  // Check API on port 3001 (serverless offline with noPrependStageInUrl or traditional)
  try {
    execSync('curl -s http://localhost:3001/api/health', { stdio: 'pipe' });
    return 'http://localhost:3001';
  } catch (e) {
    // Not running
  }
  
  // Check if serverless is running on port 3001 with /dev prefix (if noPrependStageInUrl is false)
  try {
    execSync('curl -s http://localhost:3001/dev/api/health', { stdio: 'pipe' });
    return 'http://localhost:3001/dev';
  } catch (e) {
    // Not running with /dev prefix
  }
  
  // Default to port 3001 for local dev
  return 'http://localhost:3001';
}

if (require.main === module) {
  const mode = process.argv[2];
  
  if (mode === 'local' || mode === 'serverless') {
    updateDesktopEnv('http://localhost:3001');
  } else if (mode === 'traditional') {
    updateDesktopEnv('http://localhost:3001');
  } else if (mode === 'cloud') {
    updateDesktopEnv('https://55p4tw00m0.execute-api.ap-south-1.amazonaws.com');
  } else if (mode === 'auto') {
    const apiUrl = detectApiMode();
    updateDesktopEnv(apiUrl);
  } else {
    console.log('Usage: node setup-env.js [local|traditional|cloud|auto]');
    console.log('  local/serverless - Use serverless offline (port 3001)');
    console.log('  traditional - Use traditional NestJS (port 3001)');
    console.log('  cloud - Use AWS Lambda endpoint');
    console.log('  auto - Auto-detect based on running services');
  }
}

module.exports = { updateDesktopEnv, detectApiMode };