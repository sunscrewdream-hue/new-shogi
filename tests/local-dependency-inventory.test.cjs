const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const page of ['story-mode.html', 'card-ai-test.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)].map(m => m[1]);
  for (const ref of refs) {
    if (/^(?:https?:|\/\/|data:|#)/i.test(ref)) continue;
    const local = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!/\.(?:js|css)$/i.test(local)) continue;
    assert.ok(fs.existsSync(path.join(root, local)), `${page}: missing local dependency ${local}`);
  }
}
console.log('PASS: HTML local JS/CSS dependencies exist');
