const fs = require('fs');
const path = require('path');

// Cross-platform path handling
const htmlPath = path.join(__dirname, '..', 'dist', 'renderer', 'index.html');

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Since Vite is configured with base: './', the paths should already be relative
  // But we double-check and fix if needed (in case Vite behavior changes)
  
  // Replace any absolute paths with relative paths
  // This works for both Windows and Unix-like systems
  html = html.replace(/href="\/tiny-logo\.png"/g, 'href="./tiny-logo.png"');
  html = html.replace(/src="\/assets\//g, 'src="./assets/');
  html = html.replace(/href="\/assets\//g, 'href="./assets/');
  
  // Also handle Windows-style paths if they somehow appear
  html = html.replace(/href="\\tiny-logo\.png"/g, 'href="./tiny-logo.png"');
  html = html.replace(/src="\\assets\\/g, 'src="./assets/');
  html = html.replace(/href="\\assets\\/g, 'href="./assets/');
  
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Fixed asset paths in index.html');
} else {
  console.error('❌ index.html not found at:', htmlPath);
}