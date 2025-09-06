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

function testElectronNativeModules(rootPath, desktopPath) {
  // Test if native modules work with Electron
  try {
    // Look for Electron in both desktop and root
    let electronPath = path.join(desktopPath, 'node_modules', 'electron', 'dist', 
      process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron');
    
    if (!fs.existsSync(electronPath)) {
      // Try root node_modules
      electronPath = path.join(rootPath, 'node_modules', 'electron', 'dist',
        process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron');
      
      if (!fs.existsSync(electronPath)) {
        // Electron not installed, will fail later anyway
        return false;
      }
    }
    
    // Create a simple test file to avoid shell escaping issues
    const testFilePath = path.join(rootPath, '__test_electron_modules.js');
    const testContent = `
      try {
        require('better-sqlite3');
        console.log('SUCCESS');
        process.exit(0);
      } catch (e) {
        console.error('FAIL:', e.message);
        process.exit(1);
      }
    `;
    fs.writeFileSync(testFilePath, testContent);
    
    try {
      // Run the test file with Electron
      execSync(`"${electronPath}" "${testFilePath}"`, {
        cwd: rootPath,
        stdio: 'pipe',
        timeout: 5000 // 5 second timeout
      });
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
      return true;
    } catch (error) {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      return false;
    }
  } catch (error) {
    return false;
  }
}

function checkDesktopDependencies(forceRebuild = false) {
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
  const isHoisted = fs.existsSync(rootBetterSqlitePath) && !fs.existsSync(desktopBetterSqlitePath);
  
  // First ensure dependencies are installed
  if (!fs.existsSync(rootBetterSqlitePath) && !fs.existsSync(desktopBetterSqlitePath)) {
    log('⚠️  better-sqlite3 not installed', 'yellow');
    log('   Installing desktop dependencies...', 'blue');
    execSync('npm install', { 
      stdio: 'inherit',
      cwd: desktopPath
    });
  }
  
  // Check if native modules work with Electron
  if (!forceRebuild && testElectronNativeModules(rootPath, desktopPath)) {
    log('✅ Native modules are compatible with Electron', 'green');
    return true;
  }
  
  // Need to rebuild
  log('⚠️  Native modules need to be rebuilt for Electron', 'yellow');
  log('🔧 Rebuilding native modules...', 'cyan');
  
  try {
    // Check if @electron/rebuild is available
    const hasElectronRebuild = fs.existsSync(path.join(rootPath, 'node_modules', '@electron', 'rebuild')) ||
                               fs.existsSync(path.join(desktopPath, 'node_modules', '@electron', 'rebuild'));
    
    if (!hasElectronRebuild) {
      log('   Installing @electron/rebuild...', 'blue');
      execSync('npm install --save-dev @electron/rebuild', {
        stdio: 'inherit',
        cwd: rootPath
      });
    }
    
    log('   Rebuilding with proper Electron headers...', 'blue');
    
    // Get Electron version - check both desktop and root
    let electronVersion;
    const desktopElectronPath = path.join(desktopPath, 'node_modules', 'electron', 'package.json');
    const rootElectronPath = path.join(rootPath, 'node_modules', 'electron', 'package.json');
    
    if (fs.existsSync(desktopElectronPath)) {
      electronVersion = require(desktopElectronPath).version;
    } else if (fs.existsSync(rootElectronPath)) {
      electronVersion = require(rootElectronPath).version;
    } else {
      throw new Error('Electron not found in node_modules');
    }
    
    if (isHoisted) {
      log(`   Rebuilding hoisted modules for Electron ${electronVersion}...`, 'blue');
      
      // Rebuild better-sqlite3 specifically for Electron
      const betterSqlitePath = path.join(rootPath, 'node_modules', 'better-sqlite3');
      execSync(`rm -rf build`, { cwd: betterSqlitePath, stdio: 'pipe' });
      execSync(`HOME=~/.electron-gyp npx node-gyp rebuild --target=${electronVersion} --arch=arm64 --dist-url=https://electronjs.org/headers --runtime=electron`, {
        stdio: 'inherit',
        cwd: betterSqlitePath
      });
      
      // Also rebuild other native modules
      const otherModules = ['uiohook-napi', 'active-win'];
      for (const mod of otherModules) {
        const modPath = path.join(rootPath, 'node_modules', mod);
        if (fs.existsSync(modPath)) {
          try {
            execSync(`npx @electron/rebuild --version ${electronVersion} --force --only ${mod}`, {
              stdio: 'inherit',
              cwd: rootPath
            });
          } catch (e) {
            // Ignore errors for optional modules
          }
        }
      }
    } else {
      execSync(`npx @electron/rebuild --version ${electronVersion} --force`, {
        stdio: 'inherit',
        cwd: desktopPath
      });
    }
    
    // Test again
    if (testElectronNativeModules(rootPath, desktopPath)) {
      log('✅ Native modules rebuilt successfully for Electron', 'green');
      return true;
    } else {
      throw new Error('Rebuild completed but modules still incompatible');
    }
    
  } catch (error) {
    // Don't use npm rebuild as fallback - it builds for Node.js, not Electron
    log(`❌ Failed to rebuild for Electron: ${error.message}`, 'red');
    log('', 'reset');
    log('   Manual fix required:', 'yellow');
    log('   1. cd /Users/thakur/Workspace/ppv1/time-tracker', 'cyan');
    log('   2. rm -rf node_modules/better-sqlite3/build', 'cyan');
    log('   3. cd node_modules/better-sqlite3', 'cyan');
    log('   4. HOME=~/.electron-gyp npx node-gyp rebuild --target=28.3.3 --arch=arm64 --dist-url=https://electronjs.org/headers --runtime=electron', 'cyan');
    return false;
  }
}

// Export for use in other scripts
module.exports = { checkDesktopDependencies };

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const forceRebuild = args.includes('--force');
  
  const success = checkDesktopDependencies(forceRebuild);
  process.exit(success ? 0 : 1);
}