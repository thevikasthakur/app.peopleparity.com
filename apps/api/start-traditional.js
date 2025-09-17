#!/usr/bin/env node

// Simple script to run the API in traditional mode (not serverless)
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting API in traditional mode on port 3001...');

// Build TypeScript first
console.log('Building TypeScript files...');
const build = spawn('npx', ['tsc'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

build.on('close', (code) => {
  if (code !== 0) {
    console.error('Build failed');
    process.exit(1);
  }
  
  console.log('Starting server...');
  
  // Run the compiled JavaScript
  const server = spawn('node', ['dist/main.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'development'
    }
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.kill();
    process.exit(0);
  });
});