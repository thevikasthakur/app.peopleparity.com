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

function checkDesktopDependencies() {
  log('\n🔍 Checking desktop app native dependencies...', 'cyan');
  
  const desktopPath = path.join(__dirname, '..', 'apps', 'desktop');
  
  // Check if desktop app exists
  if (!fs.existsSync(desktopPath)) {
    log('⚠️  Desktop app not found at apps/desktop', 'yellow');
    return true; // Not an error, just not present
  }
  
  try {
    // Try to load better-sqlite3 from desktop app
    const betterSqlitePath = path.join(desktopPath, 'node_modules', 'better-sqlite3');
    
    if (!fs.existsSync(betterSqlitePath)) {
      log('⚠️  better-sqlite3 not installed in desktop app', 'yellow');
      log('   Installing desktop dependencies...', 'blue');
      execSync('npm install', { 
        stdio: 'inherit',
        cwd: desktopPath
      });
    }
    
    // Check if we can require it
    require(betterSqlitePath);
    log('✅ Desktop native dependencies are compatible', 'green');
    return true;
    
  } catch (error) {
    if (error.message && error.message.includes('NODE_MODULE_VERSION')) {
      log('⚠️  Desktop native module version mismatch detected', 'yellow');
      log(`   ${error.message.split('\n')[0]}`, 'yellow');
      
      // Try to rebuild
      log('\n🔧 Rebuilding desktop native dependencies...', 'cyan');
      
      try {
        // Try electron-rebuild first
        log('   Attempting electron-rebuild...', 'blue');
        execSync('npx electron-rebuild', { 
          stdio: 'inherit',
          cwd: desktopPath
        });
        log('✅ Rebuilt with electron-rebuild', 'green');
        return true;
        
      } catch (rebuildError) {
        // Fallback to npm rebuild
        log('   Falling back to npm rebuild...', 'yellow');
        
        try {
          execSync('npm rebuild better-sqlite3', { 
            stdio: 'inherit',
            cwd: desktopPath
          });
          
          // Also rebuild other native deps
          const nativeDeps = ['uiohook-napi'];
          for (const dep of nativeDeps) {
            const depPath = path.join(desktopPath, 'node_modules', dep);
            if (fs.existsSync(depPath)) {
              log(`   Rebuilding ${dep}...`, 'blue');
              execSync(`npm rebuild ${dep}`, { 
                stdio: 'inherit',
                cwd: desktopPath
              });
            }
          }
          
          log('✅ Native dependencies rebuilt', 'green');
          return true;
          
        } catch (npmRebuildError) {
          log('❌ Failed to rebuild native dependencies', 'red');
          log('   You may need to:', 'yellow');
          log('   1. cd apps/desktop', 'yellow');
          log('   2. rm -rf node_modules', 'yellow');
          log('   3. npm install', 'yellow');
          log('   4. npx electron-rebuild', 'yellow');
          return false;
        }
      }
    }
    
    // Some other error
    log(`❌ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

// Export for use in other scripts
module.exports = { checkDesktopDependencies };

// Run if called directly
if (require.main === module) {
  const success = checkDesktopDependencies();
  process.exit(success ? 0 : 1);
}