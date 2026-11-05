const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const story=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const css=fs.readFileSync(path.join(root,'story-mode.css'),'utf8');
const complete=fs.readFileSync(path.join(root,'card-ai-test.html'),'utf8');

function functionSource(name){
 const start=story.indexOf(`function ${name}(`);
 assert.ok(start>=0,`${name} is defined`);
 const open=story.indexOf('{',start);let depth=0;
 for(let i=open;i<story.length;i++){
  if(story[i]==='{')depth++;
  if(story[i]==='}'&&!--depth)return story.slice(start,i+1);
 }
 throw new Error(`Unterminated ${name}`);
}

const browser={};
vm.runInNewContext(fs.readFileSync(path.join(root,'story-data.js'),'utf8'),{window:browser});
vm.runInNewContext(fs.readFileSync(path.join(root,'story-engine.js'),'utf8'),{window:browser});
const planSource=functionSource('compactSafeBoard')+'\n'+functionSource('compactPlanQuake')+'\ncompactPlanQuake()';

for(let stage=0;stage<4;stage++){
 const game=new browser.StoryEngine(stage);
 for(let sample=0;sample<20;sample++){
  const result=vm.runInNewContext(planSource,{g:game,Math});
  if(!result)continue;
  const replay=game.clone(game.board);
  assert.ok(result.shifts.length>=3&&result.shifts.length<=6);
  for(const move of result.shifts){
   assert.ok(move.y>=0&&move.y<game.h&&move.Y>=0&&move.Y<game.h);
   assert.ok(move.x>=0&&move.x<game.w&&move.X>=0&&move.X<game.w);
   assert.ok(Math.max(Math.abs(move.Y-move.y),Math.abs(move.X-move.x))===1);
   assert.ok(replay[move.y][move.x]&&replay[move.y][move.x].t!=='玉');
   assert.equal(replay[move.Y][move.X],null);
   replay[move.Y][move.X]=replay[move.y][move.x];replay[move.y][move.x]=null;
  }
  assert.equal(JSON.stringify(replay),JSON.stringify(result.B),`stage ${stage}: animated shifts equal planned board`);
  assert.ok(!game.check(result.B,0)&&!game.check(result.B,1));
  assert.ok(game.legal(0,result.B).length&&game.legal(1,result.B).length);
 }
}

assert.match(complete,/function quakeEffect\(/);
assert.match(story,/function compactPlanQuake\(/);
assert.match(story,/compactQuakeMove=shift/);
assert.match(story,/compactQuakeCracks=chosen;render\(\)/);
assert.match(story,/compactQuakeCracks=\[\];g\.holes\.push\(\.\.\.chosen\)/);
assert.match(css,/\.sq\.compact-quake-origin \.story-token\{animation:storyQuakeTravel/);
assert.match(css,/\.sq\.compact-quake-mark\{animation:storyQuakeRedFlash/);
assert.match(css,/quake_crack\.webp/);
assert.match(story,/if\(effect\.kind==="大地震"\)/);
console.log('PASS: completed-game quake choreography and safe plans on all four story boards');
