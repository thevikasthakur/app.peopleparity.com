#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
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

function runCommand(command, cwd, showOutput = true) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const options = {
      cwd,
      stdio: showOutput ? 'inherit' : 'pipe',
      shell: true
    };
    
    const child = spawn(cmd, args, options);
    
    let stdout = '';
    let stderr = '';
    
    if (!showOutput) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || 'Unknown error'}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      child.kill('SIGTERM');
      log('\n\n⚠️  Rebuild interrupted by user', 'yellow');
      process.exit(130);
    });
  });
}

async function rebuildDesktopDependencies() {
  console.log();
  log('════════════════════════════════════════════════', 'cyan');
  log('     Desktop Native Module Rebuild Tool', 'cyan');
  log('════════════════════════════════════════════════', 'cyan');
  console.log();
  
  const desktopPath = path.join(__dirname, '..', 'apps', 'desktop');
  
  // Check if desktop app exists
  if (!fs.existsSync(desktopPath)) {
    log('❌ Desktop app not found at apps/desktop', 'red');
    return false;
  }
  
  try {
    // Step 1: Ensure dependencies are installed
    log('📦 Step 1: Checking dependencies...', 'blue');
    const nodeModulesPath = path.join(desktopPath, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      log('   Installing dependencies...', 'yellow');
      await runCommand('npm install', desktopPath);
      log('   ✅ Dependencies installed', 'green');
    } else {
      log('   ✅ Dependencies already installed', 'green');
    }
    
    // Step 2: Install @electron/rebuild (the newer, better package)
    log('\n🔧 Step 2: Preparing @electron/rebuild...', 'blue');
    const electronRebuildPath = path.join(desktopPath, 'node_modules', '@electron', 'rebuild');
    
    if (!fs.existsSync(electronRebuildPath)) {
      log('   Installing @electron/rebuild...', 'yellow');
      await runCommand('npm install --save-dev @electron/rebuild', desktopPath);
      log('   ✅ @electron/rebuild installed', 'green');
    } else {
      log('   ✅ @electron/rebuild already available', 'green');
    }
    
    // Step 3: Clean old builds
    log('\n🧹 Step 3: Cleaning old builds...', 'blue');
    const buildPath = path.join(desktopPath, 'node_modules', 'better-sqlite3', 'build');
    if (fs.existsSync(buildPath)) {
      try {
        execSync(`rm -rf "${buildPath}"`, { cwd: desktopPath });
        log('   ✅ Old builds cleaned', 'green');
      } catch (e) {
        log('   ⚠️  Could not clean old builds (continuing anyway)', 'yellow');
      }
    } else {
      log('   ✅ No old builds to clean', 'green');
    }
    
    // Step 4: Rebuild with @electron/rebuild
    log('\n🔨 Step 4: Rebuilding native modules for Electron...', 'blue');
    log('   This may take a minute...', 'yellow');
    
    try {
      await runCommand('npx @electron/rebuild --force', desktopPath, true);
      log('\n   ✅ Native modules rebuilt successfully!', 'green');
      return true;
    } catch (rebuildError) {
      log('\n   ⚠️  @electron/rebuild encountered issues', 'yellow');
      
      // Step 5: Fallback to npm rebuild
      log('\n🔄 Step 5: Trying fallback method...', 'blue');
      
      try {
        log('   Rebuilding better-sqlite3...', 'yellow');
        await runCommand('npm rebuild better-sqlite3', desktopPath);
        
        log('   Rebuilding uiohook-napi...', 'yellow');
        await runCommand('npm rebuild uiohook-napi', desktopPath);
        
        log('\n   ✅ Native modules rebuilt with npm rebuild', 'green');
        return true;
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
    
  } catch (error) {
    log('\n❌ Rebuild failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    
    log('\n📋 Manual fix instructions:', 'yellow');
    log('   1. cd apps/desktop', 'cyan');
    log('   2. rm -rf node_modules', 'cyan');
    log('   3. npm install', 'cyan');
    log('   4. npx electron-rebuild --force', 'cyan');
    
    log('\n💡 Alternative method:', 'yellow');
    log('   1. cd apps/desktop', 'cyan');
    log('   2. npm install --save-dev @electron/rebuild', 'cyan');
    log('   3. npx @electron/rebuild --force', 'cyan');
    
    return false;
  }
}

async function main() {
  const success = await rebuildDesktopDependencies();
  
  if (success) {
    console.log();
    log('════════════════════════════════════════════════', 'green');
    log('     ✅ Rebuild completed successfully!', 'green');
    log('════════════════════════════════════════════════', 'green');
    console.log();
    log('You can now run: npm start', 'cyan');
    console.log();
  }
  
  process.exit(success ? 0 : 1);
}

// Export for use in other scripts
module.exports = { rebuildDesktopDependencies };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}