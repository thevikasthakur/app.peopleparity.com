const { exec, execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check if Python is available
function checkPython() {
  try {
    const pythonVersion = execSync('python --version 2>&1', { encoding: 'utf8' });
    console.log('✅ Python is already installed:', pythonVersion.trim());

    // Check if version is 3.6 or higher
    const versionMatch = pythonVersion.match(/Python (\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      const minor = parseInt(versionMatch[2]);
      if (major >= 3 && minor >= 6) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log('❌ Python not found or version too old');
    return false;
  }
}

// Setup Python for node-gyp
function setupNodeGyp() {
  try {
    // Try to find Python and configure npm
    const pythonPaths = [
      'python',
      'python3',
      'py',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python*', 'python.exe'),
      path.join(process.env.ProgramFiles || '', 'Python*', 'python.exe'),
    ];

    for (const pythonPath of pythonPaths) {
      try {
        execSync(`${pythonPath} --version`, { stdio: 'ignore' });
        console.log(`📝 Configuring npm to use Python: ${pythonPath}`);
        execSync(`npm config set python "${pythonPath}"`, { stdio: 'inherit' });
        return true;
      } catch (e) {
        // Try next path
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to setup node-gyp:', error);
    return false;
  }
}

// Main setup function
async function setupPython() {
  console.log('🔍 Checking Python installation for native dependencies...\n');

  if (checkPython()) {
    if (setupNodeGyp()) {
      console.log('\n✅ Python is properly configured for building native modules');
      return;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('⚠️  Python Installation Required');
  console.log('='.repeat(70));
  console.log('\nThe desktop app requires Python to build native dependencies.');
  console.log('\n📋 Installation Options:\n');

  if (process.platform === 'win32') {
    console.log('Option 1: Automatic Installation (Run as Administrator)');
    console.log('   Run this command in PowerShell as Administrator:');
    console.log('   powershell -ExecutionPolicy Bypass -File apps/desktop/scripts/install-python-windows.ps1\n');

    console.log('Option 2: Install from Microsoft Store');
    console.log('   - Open Microsoft Store');
    console.log('   - Search for "Python 3.12" (or latest version)');
    console.log('   - Click Install\n');

    console.log('Option 3: Download from python.org');
    console.log('   - Visit: https://www.python.org/downloads/');
    console.log('   - Download Python 3.12 or later');
    console.log('   - During installation, CHECK "Add Python to PATH"\n');
  } else if (process.platform === 'darwin') {
    console.log('Option 1: Use Homebrew (if installed)');
    console.log('   - Run: brew install python@3.12\n');

    console.log('Option 2: Download from python.org');
    console.log('   - Visit: https://www.python.org/downloads/');
    console.log('   - Download Python 3.12 or later for macOS\n');
  } else {
    console.log('Option 1: Use your package manager');
    console.log('   - Ubuntu/Debian: sudo apt-get install python3 python3-dev');
    console.log('   - Fedora: sudo dnf install python3 python3-devel');
    console.log('   - Arch: sudo pacman -S python\n');
  }

  console.log('='.repeat(70));
  console.log('\n📌 After installing Python:');
  console.log('   1. Close and reopen your terminal');
  console.log('   2. Run "npm install" again\n');

  // Don't fail the install, but inform the user
  console.log('⚠️  Continuing installation without Python...');
  console.log('    Some features may not work until Python is installed.\n');
}

// Run if called directly
if (require.main === module) {
  setupPython().catch(console.error);
}

module.exports = { checkPython, setupPython };