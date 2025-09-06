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
  
  const rootPath = path.join(__dirname, '..');
  const desktopPath = path.join(rootPath, 'apps', 'desktop');
  
  // Check if desktop app exists
  if (!fs.existsSync(desktopPath)) {
    log('⚠️  Desktop app not found at apps/desktop', 'yellow');
    return true; // Not an error, just not present
  }
  
  // In monorepo, better-sqlite3 might be hoisted to root node_modules
  const rootBetterSqlitePath = path.join(rootPath, 'node_modules', 'better-sqlite3');
  const desktopBetterSqlitePath = path.join(desktopPath, 'node_modules', 'better-sqlite3');
  
  // Check if better-sqlite3 exists at root level (hoisted)
  const isHoisted = fs.existsSync(rootBetterSqlitePath) && !fs.existsSync(desktopBetterSqlitePath);
  
  if (!fs.existsSync(rootBetterSqlitePath) && !fs.existsSync(desktopBetterSqlitePath)) {
    log('⚠️  better-sqlite3 not installed', 'yellow');
    log('   Installing desktop dependencies...', 'blue');
    execSync('npm install', { 
      stdio: 'inherit',
      cwd: desktopPath
    });
  } else if (isHoisted) {
    log('📦 better-sqlite3 is hoisted to root node_modules', 'cyan');
  }
  
  // Always rebuild for Electron to be safe
  log('🔧 Ensuring native modules are built for Electron...', 'cyan');
  
  try {
    // Check if @electron/rebuild is available
    const hasElectronRebuild = fs.existsSync(path.join(desktopPath, 'node_modules', '@electron', 'rebuild')) ||
                               fs.existsSync(path.join(rootPath, 'node_modules', '@electron', 'rebuild'));
    
    if (!hasElectronRebuild) {
      log('   Installing @electron/rebuild...', 'blue');
      execSync('npm install --save-dev @electron/rebuild', {
        stdio: 'inherit',
        cwd: rootPath
      });
    }
    
    log('   Rebuilding native modules for Electron...', 'blue');
    
    // If better-sqlite3 is hoisted, rebuild from root
    if (isHoisted) {
      log('   Rebuilding hoisted modules from root...', 'blue');
      execSync('npx @electron/rebuild --force --module-dir . --only better-sqlite3,uiohook-napi,active-win', {
        stdio: 'inherit',
        cwd: rootPath
      });
    } else {
      execSync('npx @electron/rebuild --force', {
        stdio: 'inherit',
        cwd: desktopPath
      });
    }
    
    log('✅ Native modules rebuilt for Electron', 'green');
    return true;
    
  } catch (error) {
    // Rebuild failed, try fallback
    log('   electron-rebuild failed, trying fallback method...', 'yellow');
    
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
      
      log('✅ Native dependencies rebuilt with npm rebuild', 'green');
      return true;
      
    } catch (npmRebuildError) {
      log('❌ Failed to rebuild native dependencies', 'red');
      log(`   Error: ${npmRebuildError.message}`, 'red');
      log('\n   Manual fix required:', 'yellow');
      log('   1. cd apps/desktop', 'yellow');
      log('   2. rm -rf node_modules', 'yellow');
      log('   3. npm install', 'yellow');
      log('   4. npx @electron/rebuild --force', 'yellow');
      return false;
    }
  }
}

// Export for use in other scripts
module.exports = { checkDesktopDependencies };

// Run if called directly
if (require.main === module) {
  const success = checkDesktopDependencies();
  process.exit(success ? 0 : 1);
}