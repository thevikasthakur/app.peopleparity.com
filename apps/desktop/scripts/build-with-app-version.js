const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read package.json to get appVersion
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const appVersion = packageJson.appVersion;

if (!appVersion) {
  console.error('Error: appVersion not found in package.json');
  process.exit(1);
}

console.log(`Building with appVersion: ${appVersion}`);

// Temporarily update the version field to match appVersion for the build
const originalVersion = packageJson.version;
packageJson.version = appVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

try {
  // Run electron-builder with the provided arguments
  const args = process.argv.slice(2).join(' ');
  const command = args ? `electron-builder ${args}` : 'electron-builder';

  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });

  console.log('\nBuild completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} finally {
  // Restore the original version
  packageJson.version = originalVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`\nRestored version field to: ${originalVersion}`);
}
