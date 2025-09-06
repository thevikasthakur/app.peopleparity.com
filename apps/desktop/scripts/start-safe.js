#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { checkDesktopDependencies } = require('./check-desktop-deps');

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
  
  try {
    execSync('curl -s http://127.0.0.1:3001/api/health', { stdio: 'pipe' });
    log('✅ API server is running', 'green');
    return true;
  } catch (error) {
    log('⚠️  API server is not running', 'yellow');
    log('   Starting API server...', 'blue');
    return false;
  }
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

async function main() {
  // Banner
  console.log(colors.magenta);
  console.log('╔════════════════════════════════════════╗');
  console.log('║     People Parity - Safe Launcher      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(colors.reset);
  
  let apiProcess = null;
  let desktopProcess = null;
  
  try {
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
      
      // Wait a bit for API to start
      log('   Waiting for API to initialize...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check again
      if (!checkApiServer()) {
        log('⚠️  API may still be starting up', 'yellow');
      }
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
      
      if (apiProcess) {
        log('   Stopping API server...', 'yellow');
        apiProcess.kill('SIGTERM');
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