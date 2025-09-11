const screenshot = require('screenshot-desktop');
const fs = require('fs');

async function testScreenshot() {
  try {
    console.log('Testing screenshot capture...');
    const img = await screenshot();
    console.log('Screenshot captured, buffer size:', img.length);
    
    if (img && img.length > 0) {
      fs.writeFileSync('/tmp/test-screenshot.png', img);
      console.log('Screenshot saved to /tmp/test-screenshot.png');
      console.log('Test successful!');
    } else {
      console.log('Screenshot buffer is empty!');
    }
  } catch (error) {
    console.error('Screenshot failed:', error);
  }
}

testScreenshot();