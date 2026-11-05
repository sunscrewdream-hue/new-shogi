const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const finished=fs.readFileSync(path.join(root,'enhancements.js'),'utf8');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(root,'story-data.js'),'utf8'),{window});
vm.runInNewContext(fs.readFileSync(path.join(root,'story-engine.js'),'utf8'),{window});

for(let stage=0;stage<4;stage++){
 const g=new window.StoryEngine(stage);
 const ownY=g.h-1,rookY=g.h-4,kingX=Math.floor(g.w/2),otherX=g.w-1;
 g.board=Array.from({length:g.h},()=>Array(g.w).fill(null));
 g.board[ownY][kingX]={t:'玉',s:0};
 g.board[0][0]={t:'玉',s:1};
 g.board[rookY][kingX]={t:'飛',s:1};
 g.board[ownY-1][otherX]={t:'歩',s:0};
 assert.ok(g.check(g.board,0),`stage ${stage}: check is detected`);
 const risky=g.legal(0).find(m=>m.y===ownY-1&&m.x===otherX&&m.Y===ownY-2&&m.X===otherX);
 assert.ok(risky,`stage ${stage}: human can ignore check with another piece`);
 const trial=g.clone(g.board);g.act(trial,g.handClone(g.hands),0,risky);
 assert.ok(g.check(trial,0),`stage ${stage}: this move really leaves the king threatened`);
 g.move(risky);
 const strike=g.legal(1).find(m=>m.y===rookY&&m.x===kingX&&m.Y===ownY&&m.X===kingX);
 assert.ok(strike,`stage ${stage}: enemy can directly take the abandoned king`);
 g.move(strike);
 assert.equal(g.state()?.winner,1,`stage ${stage}: losing the king ends the match`);
 assert.equal(g.state()?.why,'主君討死');
}

assert.match(finished,/主君を見捨てるのか！/);
for(const phrase of ['主君を見捨てるのか！','忠義を尽くす','覚悟して指す'])assert.ok(script.includes(phrase),`Missing finished-game warning: ${phrase}`);
assert.match(script,/g\.act\(B,H,0,m\);\s*if\(g\.check\(B,0\)\)/,'Risky move is confirmed only if the king remains checked');
assert.match(script,/const safeDefense=defending\?legal\.filter/,'Optional defensive hints do not restrict special-rule moves');
assert.doesNotMatch(script,/二歩・王手放置・行き所のない駒打ちは禁止/);
console.log('PASS: abandon-the-king rule matches main game in all four chapters');
