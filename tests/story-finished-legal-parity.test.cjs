// Compare the actual completed 9x9 move/legal implementations against StoryEngine.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const story={window:{}};vm.createContext(story);
for(const file of ['story-data.js','story-engine.js'])vm.runInContext(read(file),story);
const finished=read('card-ai-test.html'),enhancements=read('enhancements.js');
const start=finished.indexOf('function moves(B,y,x,attack=false)');
const end=finished.indexOf('\nfunction positionKey(',start);
const patchStart=enhancements.indexOf('const baseMoves=moves;');
const patchEnd=enhancements.indexOf('const baseGameEnd=gameEnd;',patchStart);
assert.ok(start>0&&end>start&&patchStart>0&&patchEnd>patchStart);
const game={
 quakeHoles:[],ruleSettings:{abandonKing:true},rulePreset:'full',gameMode:'ai',
 inside:(y,x)=>y>=0&&y<9&&x>=0&&x<9,
 clone:value=>JSON.parse(JSON.stringify(value)),
};
vm.createContext(game);
vm.runInContext(finished.slice(start,end)+'\n'+enhancements.slice(patchStart,patchEnd),game);
function key(m){return m.drop?`D:${m.t}:${m.Y},${m.X}`:`M:${m.y},${m.x}:${m.Y},${m.X}`}
function hands(source){return source.map(pieces=>pieces.reduce((counts,p)=>(counts[p.t]=(counts[p.t]||0)+1,counts),{}))}
function random(seed){let n=seed>>>0;return()=>((n=Math.imul(1664525,n)+1013904223>>>0)/4294967296)}
let states=0;
for(const stage of [1,3])for(let seed=1;seed<=3;seed++){
 const g=new story.window.StoryEngine(stage),rnd=random(stage*500+seed);
 for(let ply=0;ply<55;ply++){
  game.quakeHoles=g.holes.filter(h=>g.ply<h.expiresPly).map(({y,x})=>({y,x}));
  const board=game.clone(g.board),hand=hands(g.hands);
  for(const side of [0,1]){
   const expected=g.legal(side).map(key).sort(),actual=game.legalMoves(board,hand,side).map(key).sort();
   assert.equal(actual.join('|'),expected.join('|'),`Legal moves disagree: chapter ${stage+1}, seed ${seed}, ply ${ply}, side ${side}`);
   states++;
  }
  const options=g.legal();if(!options.length)break;
  const m=options[Math.floor(rnd()*options.length)],p=m.drop?null:g.board[m.y][m.x];
  g.move(m,!!p&&g.promoted(p,m.y,m.Y)&&rnd()<.5);
  if(g.state())break;
 }
}
console.log(`PASS: finished and story 9x9 legal moves match in ${states} side-to-move comparisons`);
