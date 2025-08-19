// Development script to run Electron after compilation
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Electron in development mode...');

const electron = spawn('electron', [path.join(__dirname, 'dist/main/index.js')], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

electron.on('close', (code) => {
  process.exit(code);
});