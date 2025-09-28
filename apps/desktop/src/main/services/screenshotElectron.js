"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureScreenshot = captureScreenshot;
exports.captureScreenshotAlternative = captureScreenshotAlternative;
const electron_1 = require("electron");
async function captureScreenshot() {
    try {
        // Get all available screens
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: electron_1.screen.getPrimaryDisplay().workAreaSize
        });
        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }
        // Use the first screen (primary display)
        const source = sources[0];
        // The thumbnail is a NativeImage, convert to Buffer
        const image = source.thumbnail;
        // Return as PNG buffer (you can also use .toJPEG() for JPEG)
        return image.toPNG();
    }
    catch (error) {
        console.error('Error capturing screenshot with Electron:', error);
        throw error;
    }
}
// Alternative method using screen.getPrimaryDisplay()
async function captureScreenshotAlternative() {
    try {
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: 1920,
                height: 1080
            }
        });
        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }
        const source = sources[0];
        return source.thumbnail.toJPEG(85); // 85% quality JPEG
    }
    catch (error) {
        console.error('Error capturing screenshot:', error);
        throw error;
    }
}
//# sourceMappingURL=screenshotElectron.js.map