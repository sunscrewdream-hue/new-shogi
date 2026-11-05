const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const css=fs.readFileSync(path.join(root,'story-mode.css'),'utf8');

assert.match(js,/`動乱の刻まで\$\{compactCardRemaining\(\)\}手`/,'Official incident title replaces the emoji and generic card label');
assert.doesNotMatch(js,/🎴 札まで/,'Old emoji label is removed');
assert.match(js,/\$\("enemyBannerStatus"\)\.textContent=side===1\?message:"薩長同盟、布陣中"/,'Enemy banner defaults to a message');
assert.doesNotMatch(js,/banner\(0,g\.king\(0\)\);banner\(1,g\.king\(1\)\)/,'Starting a battle must not reveal both characters');
assert.match(js,/storyHoverSide=side;banner\(side,p,true\)/,'Hover preview lasts while pointer is over a unit');
assert.match(js,/clearTimeout\(storyBannerTimers\[side\]\);\$\(prefix\+"StoryBanner"\)\.classList\.remove\("show-character"\)/,'Pointer leave clears the character preview');
assert.match(js,/if\(p\)banner\(1,p\);\s*makeMove\(move,prom\)/,'AI selection shows the selected enemy unit');
assert.match(css,/#storyBoard\[data-stage="0"\]\.small-board::before/,'Ikedaya has a dedicated room perimeter');
assert.match(css,/board-ikedaya-room-perimeter-v1\.webp/);
assert.match(css,/#storyBoard\[data-stage="0"\]>.sq\{z-index:2\}/,'Board cells remain above the decorative perimeter');
assert.ok(fs.statSync(path.join(root,'assets/story/board-ikedaya-room-perimeter-v1.webp')).size>10000);
console.log('PASS: official incident title, neutral enemy banner, and noninteractive Ikedaya frame');
