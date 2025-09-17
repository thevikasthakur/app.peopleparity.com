#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkNativeDependencies() {
  log('\n🔍 Checking native dependencies...', 'cyan');
  
  try {
    // Try to require better-sqlite3 to see if it's compatible
    require('better-sqlite3');
    log('✅ Native dependencies are compatible', 'green');
    return true;
  } catch (error) {
    if (error.message.includes('NODE_MODULE_VERSION')) {
      log('⚠️  Native module version mismatch detected', 'yellow');
      log(`   ${error.message.split('\n')[0]}`, 'yellow');
      return false;
    }
    // Some other error
    throw error;
  }
}

function rebuildNativeDependencies() {
  log('\n🔧 Rebuilding native dependencies...', 'cyan');
  
  try {
    // First, try electron-rebuild if it's available
    try {
      log('   Using electron-rebuild...', 'blue');
      execSync('npx electron-rebuild', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      log('✅ Rebuilt with electron-rebuild', 'green');
      return true;
    } catch (e) {
      // electron-rebuild not available or failed
      log('   electron-rebuild not available, using npm rebuild...', 'yellow');
    }
    
    // Fallback to npm rebuild
    log('   Rebuilding better-sqlite3...', 'blue');
    execSync('npm rebuild better-sqlite3', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Also rebuild other native deps if needed
    const nativeDeps = ['uiohook-napi', 'node-window-manager'];
    for (const dep of nativeDeps) {
      try {
        const depPath = path.join(__dirname, '..', 'node_modules', dep);
        if (fs.existsSync(depPath)) {
          log(`   Rebuilding ${dep}...`, 'blue');
          execSync(`npm rebuild ${dep}`, { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
          });
        }
      } catch (e) {
        // Dependency might not be installed, skip
      }
    }
    
    log('✅ Native dependencies rebuilt successfully', 'green');
    return true;
  } catch (error) {
    log('❌ Failed to rebuild native dependencies', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('=================================', 'cyan');
  log('  Desktop App Dependency Check', 'cyan');
  log('=================================', 'cyan');
  
  // Check if native dependencies are compatible
  if (!checkNativeDependencies()) {
    // Try to rebuild
    if (rebuildNativeDependencies()) {
      // Check again after rebuild
      if (checkNativeDependencies()) {
        log('\n✅ All dependencies are ready!', 'green');
        process.exit(0);
      } else {
        log('\n❌ Dependencies still incompatible after rebuild', 'red');
        log('   Please try:', 'yellow');
        log('   1. Delete node_modules and run npm install', 'yellow');
        log('   2. Make sure you have the correct Node version', 'yellow');
        process.exit(1);
      }
    } else {
      log('\n❌ Could not fix dependency issues', 'red');
      process.exit(1);
    }
  } else {
    log('\n✅ All dependencies are ready!', 'green');
    process.exit(0);
  }
}

// Run the check
main();