// Development script to run Electron after compilation
const { spawn } = require('child_process');

console.log('Starting Electron in development mode...');

// Get the electron binary path using the electron package
// This returns the full path to the Electron binary
const electronPath = require('electron');
console.log('Electron binary path:', electronPath);

// Create a clean environment for Electron
// IMPORTANT: Remove ELECTRON_RUN_AS_NODE as it makes Electron run as plain Node.js
// This variable is often set when running from VS Code or other Electron-based editors
const env = { ...process.env, NODE_ENV: 'development' };
delete env.ELECTRON_RUN_AS_NODE;

const electron = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  cwd: __dirname,
  env
});

electron.on('close', (code) => {
  process.exit(code);
});