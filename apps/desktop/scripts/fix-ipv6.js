#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing IPv6 Connection Issues');
console.log('=================================\n');

// Function to update axios defaults to prefer IPv4
function updateAxiosConfig() {
  const configPath = path.join(__dirname, '..', 'src', 'main', 'services', 'apiConfig.ts');
  
  const axiosConfig = `
// API Configuration with IPv4 preference
import axios from 'axios';
import dns from 'dns';
import { promisify } from 'util';

// Force Node.js to prefer IPv4 over IPv6
dns.setDefaultResultOrder('ipv4first');

// Alternative: Create custom lookup function
const lookup = promisify(dns.lookup);

export function configureAxios() {
  // Set default axios config to use IPv4
  axios.defaults.httpAgent = new (require('http').Agent)({
    family: 4 // Force IPv4
  });
  
  axios.defaults.httpsAgent = new (require('https').Agent)({
    family: 4 // Force IPv4
  });
}

// Function to get IPv4 API URL
export function getApiUrl(): string {
  const apiUrl = process.env.API_URL || 'http://127.0.0.1:3001/api';
  
  // Replace localhost or ::1 with 127.0.0.1
  return apiUrl
    .replace('localhost', '127.0.0.1')
    .replace('[::1]', '127.0.0.1')
    .replace('::1', '127.0.0.1');
}
`;

  console.log('Creating API configuration file...');
  fs.writeFileSync(configPath, axiosConfig);
  console.log('✅ Created apiConfig.ts\n');
}

// Function to update .env file
function updateEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  
  console.log('Updating environment variables...');
  
  // Create .env if it doesn't exist
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '');
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add API_URL
  if (envContent.includes('API_URL=')) {
    envContent = envContent.replace(/API_URL=.*/g, 'API_URL=http://127.0.0.1:3001/api');
  } else {
    envContent += '\nAPI_URL=http://127.0.0.1:3001/api';
  }
  
  // Update or add VITE_API_URL
  if (envContent.includes('VITE_API_URL=')) {
    envContent = envContent.replace(/VITE_API_URL=.*/g, 'VITE_API_URL=http://127.0.0.1:3001/api');
  } else {
    envContent += '\nVITE_API_URL=http://127.0.0.1:3001/api';
  }
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  
  // Also create .env.local with same settings
  fs.writeFileSync(envLocalPath, envContent.trim() + '\n');
  
  console.log('✅ Updated .env and .env.local files\n');
}

// Function to update hosts file (requires sudo on macOS/Linux)
function suggestHostsFileUpdate() {
  console.log('📝 Hosts File Configuration');
  console.log('===========================\n');
  console.log('If you continue to have IPv6 issues, you can add this to your hosts file:\n');
  console.log('  127.0.0.1 localhost');
  console.log('  ::1 ip6-localhost ip6-loopback\n');
  console.log('On macOS/Linux, edit with: sudo nano /etc/hosts');
  console.log('On Windows, edit: C:\\Windows\\System32\\drivers\\etc\\hosts\n');
}

// Function to test connectivity
function testConnectivity() {
  console.log('🧪 Testing Connectivity');
  console.log('=======================\n');
  
  try {
    execSync('curl -s http://127.0.0.1:3001/api/health', { stdio: 'ignore' });
    console.log('✅ IPv4 connection successful (127.0.0.1:3001)');
  } catch (error) {
    console.log('❌ IPv4 connection failed - Is the API server running?');
  }
  
  try {
    execSync('curl -s http://[::1]:3001/api/health', { stdio: 'ignore' });
    console.log('✅ IPv6 connection successful ([::1]:3001)');
  } catch (error) {
    console.log('⚠️  IPv6 connection failed (this is expected and OK)');
  }
  
  console.log('');
}

// Function to create a diagnostic report
function createDiagnosticReport() {
  const reportPath = path.join(__dirname, '..', 'connection-diagnostic.txt');
  
  let report = 'PeopleParity Connection Diagnostic Report\n';
  report += '==========================================\n\n';
  report += `Date: ${new Date().toISOString()}\n\n`;
  
  // Check Node.js DNS settings
  report += 'Node.js DNS Settings:\n';
  report += `  Default Result Order: ${dns.getDefaultResultOrder()}\n\n`;
  
  // Check environment variables
  report += 'Environment Variables:\n';
  report += `  API_URL: ${process.env.API_URL || 'not set'}\n`;
  report += `  VITE_API_URL: ${process.env.VITE_API_URL || 'not set'}\n`;
  report += `  NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n\n`;
  
  // Check listening ports
  try {
    const ports = execSync('lsof -ti:3001 2>/dev/null || echo "none"').toString().trim();
    report += 'Port 3001 Status:\n';
    report += `  Process IDs: ${ports}\n\n`;
  } catch (error) {
    report += 'Port 3001 Status: Unable to check\n\n';
  }
  
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Diagnostic report saved to: ${reportPath}\n`);
}

// Main execution
async function main() {
  try {
    // Update axios configuration
    updateAxiosConfig();
    
    // Update environment files
    updateEnvFile();
    
    // Test connectivity
    testConnectivity();
    
    // Create diagnostic report
    createDiagnosticReport();
    
    // Suggest hosts file update
    suggestHostsFileUpdate();
    
    console.log('✨ IPv6 fix completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Rebuild the app: npm run build');
    console.log('2. Restart the app: npm run dev');
    console.log('3. If issues persist, run: npm run check:api');
    
  } catch (error) {
    console.error('❌ Error during IPv6 fix:', error.message);
    process.exit(1);
  }
}

main();