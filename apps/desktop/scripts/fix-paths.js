const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist/renderer/index.html');

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Replace absolute paths with relative paths
  html = html.replace(/href="\/tiny-logo\.png"/g, 'href="./tiny-logo.png"');
  html = html.replace(/src="\/assets\//g, 'src="./assets/');
  html = html.replace(/href="\/assets\//g, 'href="./assets/');
  
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Fixed asset paths in index.html');
} else {
  console.error('❌ index.html not found at:', htmlPath);
}