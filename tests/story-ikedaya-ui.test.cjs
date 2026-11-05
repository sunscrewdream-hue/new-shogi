const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
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
assert.match(css,/board-ikedaya-room-perimeter-v2\.webp/);
assert.match(css,/#storyBoard\[data-stage="0"\]>.sq\{z-index:2\}/,'Board cells keep their normal stacking context');
assert.match(css,/content:"";position:absolute;z-index:3;pointer-events:none/,'Decorative overlay cannot intercept shogi moves');
assert.ok(fs.statSync(path.join(root,'assets/story/board-ikedaya-room-perimeter-v2.webp')).size>10000);
assert.match(css,/width:122%;height:115%;left:-11%;top:-7\.5%/,'5x6 frame aligns with transparent inner aperture');
assert.match(js,/defendingPieces\?\.has\(y\+":"\+x\)/,'Every legal defensive piece is visibly marked');
assert.match(js,/defendingDrops\?\.has\(t\)/,'A defensive drop from hand is visibly marked');

const window={};
vm.runInNewContext(fs.readFileSync(path.join(root,'story-data.js'),'utf8'),{window});
vm.runInNewContext(fs.readFileSync(path.join(root,'story-engine.js'),'utf8'),{window});
for(const stage of [0,2]){
 const g=new window.StoryEngine(stage);
 g.board=Array.from({length:6},()=>Array(5).fill(null));
 g.board[5][2]={t:'玉',s:0};g.board[0][0]={t:'玉',s:1};
 g.board[2][2]={t:'飛',s:1};g.board[4][1]={t:'金',s:0};
 assert.equal(g.check(g.board,0),true);
 const defense=g.legal(0);
 assert.ok(defense.some(m=>m.y===4&&m.x===1&&m.Y===4&&m.X===2),`stage ${stage}: gold can block check`);
 assert.ok(defense.some(m=>m.y===4&&m.x===1&&m.Y===3&&m.X===2),`stage ${stage}: gold can block nearer attacker`);
 g.hands[0].push({t:'金',s:0});
 const drops=g.legal(0);
 assert.ok(drops.some(m=>m.drop&&m.t==='金'&&m.Y===4&&m.X===2),`stage ${stage}: gold drop can block check`);
}
console.log('PASS: official incident title, neutral enemy banner, and noninteractive Ikedaya frame');
