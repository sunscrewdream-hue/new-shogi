const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const html=fs.readFileSync(path.join(root,'story-mode.html'),'utf8');
const turn=source.match(/function compactTurn\(side,after,opening=false\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(turn,'Turn notice routine must exist');
assert.doesNotMatch(turn,/scrollTo\(|scrollBy\(|scrollIntoView\(/,
 'Turn changes must not move the browser viewport or shift the board');
assert.match(turn,/getBoundingClientRect\(\)/,'Position the turn art using the current board bounds');
assert.match(turn,/--turn-center-offset/,'Keep turn art centered over the board without scrolling');
assert.match(source,/const desiredY=Math\.max\(0,Math\.round\(boardCenter-window\.innerHeight\/2-36\)\);\s*window\.scrollTo\(0,desiredY\)/,
 'Opening presentation may still position the board once');
assert.match(html,/story-mode\.js\?v=[^"']+/);
console.log('PASS: no automatic page scroll on either army turn; opening layout retained');
