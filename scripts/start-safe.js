#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
// Use the fast check by default (only rebuilds when needed)
const { checkDesktopDependencies } = require('./check-desktop-deps-fast');
const { updateDesktopEnv } = require('./setup-env');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkApiServer() {
  log('\n🔍 Checking API server...', 'cyan');
  
  // Check port 3001 (both serverless and traditional use this now)
  try {
    // Check if anything is listening on port 3001
    execSync('lsof -i:3001', { stdio: 'pipe' });
    log(`✅ API server is running on port 3001`, 'green');
    return true;
  } catch (error) {
    // Port is not in use, so API is not running
  }
  
  log('⚠️  API server is not running', 'yellow');
  log('   Starting API server...', 'blue');
  return false;
}

function startApiServer() {
  const apiPath = path.join(__dirname, '..', 'apps', 'api');
  
  if (!fs.existsSync(apiPath)) {
    log('❌ API directory not found', 'red');
    return null;
  }
  
  log('🚀 Starting API server...', 'cyan');
  
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const apiProcess = spawn(npm, ['run', 'dev'], {
    cwd: apiPath,
    stdio: 'pipe',
    shell: true
  });
  
  apiProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server running') || output.includes('port 3001')) {
      log('✅ API server started', 'green');
    }
  });
  
  apiProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('DeprecationWarning')) {
      console.error(`API Error: ${output}`);
    }
  });
  
  return apiProcess;
}

function startDesktopApp() {
  const desktopPath = path.join(__dirname, '..', 'apps', 'desktop');
  
  if (!fs.existsSync(desktopPath)) {
    log('❌ Desktop app directory not found', 'red');
    return null;
  }
  
  log('🖥️  Starting desktop app...', 'cyan');
  
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const desktopProcess = spawn(npm, ['run', 'dev'], {
    cwd: desktopPath,
    stdio: 'inherit',
    shell: true
  });
  
  return desktopProcess;
}

function killPortProcess(port) {
  try {
    // Try to get PID using lsof
    const pid = execSync(`lsof -t -i:${port} 2>/dev/null`).toString().trim();
    if (pid) {
      log(`   Found process ${pid} using port ${port}, killing it...`, 'yellow');
      execSync(`kill -9 ${pid} 2>/dev/null`);
      return true;
    }
  } catch (e) {
    // Port is free or lsof not available
  }
  return false;
}

async function main() {
  // Banner
  console.log(colors.magenta);
  console.log('╔════════════════════════════════════════╗');
  console.log('║     People Parity - Safe Launcher      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(colors.reset);
  
  let apiProcess = null;
  let desktopProcess = null;
  let apiWasAlreadyRunning = false;
  
  try {
    // Step 0: Clean up ports (but preserve API if already running)
    log('\n🧹 Step 0: Checking ports...', 'blue');
    
    // Check if API is already running before cleaning
    try {
      execSync('lsof -i:3001', { stdio: 'pipe' });
      apiWasAlreadyRunning = true;
      log('   Port 3001 is in use (API already running)', 'cyan');
    } catch (e) {
      log('   Port 3001 is available', 'green');
    }
    
    // Only clean up port 3002 (serverless lambda port)
    if (killPortProcess(3002)) {
      log('   Port 3002 has been freed (lambda)', 'green');
    }
    
    // Step 1: Check and fix desktop dependencies
    log('\n📦 Step 1: Checking desktop dependencies...', 'blue');
    const depsOk = checkDesktopDependencies();
    
    if (!depsOk) {
      log('\n❌ Cannot start due to dependency issues', 'red');
      log('   Please fix the issues above and try again', 'yellow');
      process.exit(1);
    }
    
    // Step 2: Check/Start API server
    log('\n🌐 Step 2: Setting up API server...', 'blue');
    const apiRunning = checkApiServer();
    
    if (!apiRunning) {
      apiProcess = startApiServer();
      if (!apiProcess) {
        log('❌ Failed to start API server', 'red');
        process.exit(1);
      }
      
      // Update desktop .env with API URL
      log('   Updating desktop .env for API...', 'cyan');
      updateDesktopEnv('http://localhost:3001');
      
      // Wait for API to be ready with retries
      log('   Waiting for API to initialize...', 'yellow');
      let apiReady = false;
      const maxRetries = 30; // 30 seconds max wait
      
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (checkApiServer()) {
          apiReady = true;
          break;
        }
        
        if (i % 5 === 4) {
          log(`   Still waiting for API... (${i + 1}/${maxRetries})`, 'yellow');
        }
      }
      
      if (!apiReady) {
        log('❌ API server failed to start properly after 30 seconds', 'red');
        if (apiProcess) apiProcess.kill();
        process.exit(1);
      }
    } else if (apiWasAlreadyRunning) {
      log('   Using existing API server', 'green');
    }
    
    // Step 3: Start desktop app
    log('\n💻 Step 3: Launching desktop application...', 'blue');
    desktopProcess = startDesktopApp();
    
    if (!desktopProcess) {
      log('❌ Failed to start desktop app', 'red');
      if (apiProcess) apiProcess.kill();
      process.exit(1);
    }
    
    log('\n✅ All systems running!', 'green');
    log('   Press Ctrl+C to stop all services', 'cyan');
    
    // Handle shutdown
    const shutdown = () => {
      log('\n\n👋 Shutting down services...', 'cyan');
      
      if (desktopProcess) {
        log('   Stopping desktop app...', 'yellow');
        desktopProcess.kill('SIGTERM');
      }
      
      // Only stop API if we started it (not if it was already running)
      if (apiProcess && !apiWasAlreadyRunning) {
        log('   Stopping API server...', 'yellow');
        apiProcess.kill('SIGTERM');
      } else if (apiWasAlreadyRunning) {
        log('   Leaving API server running (was already running)', 'cyan');
      }
      
      setTimeout(() => {
        log('✅ All services stopped', 'green');
        process.exit(0);
      }, 1000);
    };
    
    // Handle Ctrl+C
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Handle process exits
    if (desktopProcess) {
      desktopProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          log(`\n⚠️  Desktop app exited with code ${code}`, 'yellow');
        }
        shutdown();
      });
    }
    
  } catch (error) {
    log(`\n❌ Startup failed: ${error.message}`, 'red');
    if (apiProcess) apiProcess.kill();
    if (desktopProcess) desktopProcess.kill();
    process.exit(1);
  }
}

// Run the launcher
main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});