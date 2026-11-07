const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = ['story-mode.html', 'card-ai-test.html'];
const obsoleteCaptureAssets = /(?:capture_shinsengumi|capture_saccho|captured_shinsengumi|captured_saccho)\.(?:png|webp|jpe?g)/i;

for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate HTML IDs`);
  assert.doesNotMatch(html, obsoleteCaptureAssets, `${file}: obsolete capture illustration`);
}
for (const file of ['story-mode.js', 'story-mode.css']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(source, obsoleteCaptureAssets, `${file}: obsolete capture illustration`);
}
console.log('PASS: unique page IDs and no known obsolete capture illustrations');
