#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');

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

function runDependencyCheck() {
  try {
    log('\n🚀 Starting People Parity Desktop App...', 'magenta');
    log('─'.repeat(40), 'cyan');
    
    // Run the dependency check
    execSync('node scripts/check-native-deps.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    return true;
  } catch (error) {
    log('❌ Dependency check failed', 'red');
    return false;
  }
}

function startApp(mode = 'dev') {
  log('\n📱 Launching application...', 'cyan');
  log('─'.repeat(40), 'cyan');
  
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = ['run', mode];
  
  const child = spawn(npm, args, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: true
  });
  
  child.on('error', (error) => {
    log(`\n❌ Failed to start: ${error.message}`, 'red');
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`\n⚠️  Application exited with code ${code}`, 'yellow');
    }
    process.exit(code || 0);
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    log('\n\n👋 Shutting down gracefully...', 'cyan');
    child.kill('SIGINT');
  });
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'dev';
  
  // ASCII Art Banner
  console.log(colors.cyan);
  console.log('╔════════════════════════════════════════╗');
  console.log('║     People Parity Desktop Launcher     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(colors.reset);
  
  // Check dependencies first
  if (runDependencyCheck()) {
    // Start the application
    startApp(mode);
  } else {
    log('\n❌ Cannot start application due to dependency issues', 'red');
    log('   Please fix the issues above and try again', 'yellow');
    process.exit(1);
  }
}

// Run the launcher
main();