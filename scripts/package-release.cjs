const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const releaseDir = path.resolve(__dirname, '../release');
const chromiumReleaseDir = path.join(releaseDir, 'chromium');
const firefoxReleaseDir = path.join(releaseDir, 'firefox');

fs.mkdirSync(chromiumReleaseDir, { recursive: true });
fs.mkdirSync(firefoxReleaseDir, { recursive: true });

const chromeOutput = path.resolve(__dirname, '../.output/chrome-mv3');
const firefoxOutput = path.resolve(__dirname, '../.output/firefox-mv2');

const chromeZip = path.join(chromiumReleaseDir, 'nookspace-chromium-0.1.0-alpha.51.zip');
const firefoxZip = path.join(firefoxReleaseDir, 'nookspace-firefox-0.1.0-alpha.51.zip');

// Remove existing archives if any
if (fs.existsSync(chromeZip)) fs.unlinkSync(chromeZip);
if (fs.existsSync(firefoxZip)) fs.unlinkSync(firefoxZip);

// Create ZIP archives using PowerShell Compress-Archive
console.log('Archiving Chromium bundle...');
execSync(`powershell -Command "Compress-Archive -Path '${chromeOutput}\\*' -DestinationPath '${chromeZip}' -Force"`);

console.log('Archiving Firefox bundle...');
execSync(`powershell -Command "Compress-Archive -Path '${firefoxOutput}\\*' -DestinationPath '${firefoxZip}' -Force"`);

function getFileInfo(filePath) {
  const stat = fs.statSync(filePath);
  const data = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  return {
    size: stat.size,
    sha256,
  };
}

const chromeInfo = getFileInfo(chromeZip);
const firefoxInfo = getFileInfo(firefoxZip);

console.log('Chromium Package:', chromeZip);
console.log('  Size:', (chromeInfo.size / (1024 * 1024)).toFixed(2), 'MB (' + chromeInfo.size + ' bytes)');
console.log('  SHA-256:', chromeInfo.sha256);

console.log('Firefox Package:', firefoxZip);
console.log('  Size:', (firefoxInfo.size / (1024 * 1024)).toFixed(2), 'MB (' + firefoxInfo.size + ' bytes)');
console.log('  SHA-256:', firefoxInfo.sha256);
