const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const releaseChromiumDir = path.resolve(__dirname, '../release/chromium');
const releaseFirefoxDir = path.resolve(__dirname, '../release/firefox');

fs.mkdirSync(releaseChromiumDir, { recursive: true });
fs.mkdirSync(releaseFirefoxDir, { recursive: true });

const srcChromeZip = path.resolve(__dirname, '../.output/nookspace-extension-0.1.0-chrome.zip');
const srcFirefoxZip = path.resolve(__dirname, '../.output/nookspace-extension-0.1.0-firefox.zip');
const srcSourcesZip = path.resolve(__dirname, '../.output/nookspace-extension-0.1.0-sources.zip');

const targetChromeZip = path.join(releaseChromiumDir, 'nookspace-chromium-0.1.0-alpha.51.zip');
const targetFirefoxZip = path.join(releaseFirefoxDir, 'nookspace-firefox-0.1.0-alpha.51.zip');
const targetSourcesZip = path.join(releaseFirefoxDir, 'nookspace-firefox-0.1.0-alpha.51-sources.zip');

fs.copyFileSync(srcChromeZip, targetChromeZip);
fs.copyFileSync(srcFirefoxZip, targetFirefoxZip);
if (fs.existsSync(srcSourcesZip)) {
  fs.copyFileSync(srcSourcesZip, targetSourcesZip);
}

function getDetails(filePath) {
  const stat = fs.statSync(filePath);
  const buf = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  return {
    filename: path.basename(filePath),
    bytes: stat.size,
    kb: (stat.size / 1024).toFixed(2),
    mb: (stat.size / (1024 * 1024)).toFixed(2),
    sha256,
  };
}

const chromeDetails = getDetails(targetChromeZip);
const firefoxDetails = getDetails(targetFirefoxZip);
const sourcesDetails = fs.existsSync(targetSourcesZip) ? getDetails(targetSourcesZip) : null;

console.log('Release packages prepared successfully:');
console.log(JSON.stringify({ chromeDetails, firefoxDetails, sourcesDetails }, null, 2));
