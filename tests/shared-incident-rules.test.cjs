const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const story={window:{}};
vm.createContext(story);
for(const name of ['shared-incident-rules.js','story-data.js','story-engine.js'])vm.runInContext(read(name),story);
const html=read('card-ai-test.html'),enhancements=read('enhancements.js');
const start=html.indexOf('function moves(B,y,x,attack=false)');
const end=html.indexOf('\nfunction positionKey(',start);
const patchStart=enhancements.indexOf('const baseMoves=moves;');
const patchEnd=enhancements.indexOf('const baseGameEnd=gameEnd;',patchStart);
assert.ok(start>0&&end>start&&patchStart>0&&patchEnd>patchStart);
const finished={window:{},quakeHoles:[],ruleSettings:{abandonKing:true},rulePreset:'full',gameMode:'ai',inside:(y,x)=>y>=0&&y<9&&x>=0&&x<9,clone:value=>JSON.parse(JSON.stringify(value))};
vm.createContext(finished);
vm.runInContext(html.slice(start,end)+'\n'+enhancements.slice(patchStart,patchEnd),finished);
vm.runInContext(read('shared-incident-rules.js'),finished);
const select=(rules,board,owner,allowed,check,legalMoves)=>rules.eligibleTargets({board,owner,allowedTypes:allowed,check,legalMoves});
const key=items=>items.map(v=>`${v.y},${v.x}:${v.t}`).sort().join('|');
let comparisons=0;
for(const stage of [0,1,2,3]){
 const game=new story.window.StoryEngine(stage);
 for(let turn=0;turn<18;turn++){
  for(const owner of [0,1])for(const allowed of [null,['歩','香','桂','銀']]){
   const before=JSON.stringify(game.board);
   const actual=select(story.window.ShinsengumiIncidentRules,game.board,owner,allowed,(b,s)=>game.check(b,s),(b,s)=>game.legal(s,b,game.hands));
   assert.equal(JSON.stringify(game.board),before,'Selection must not mutate the board');
   for(const target of actual){
    const p=game.board[target.y][target.x];game.board[target.y][target.x]=null;
    try{assert.ok(!game.check(game.board,0)&&!game.check(game.board,1)&&game.legal(0).length&&game.legal(1).length)}
    finally{game.board[target.y][target.x]=p}
   }
   if(game.w===9){
    const hands=game.hands.map(items=>items.reduce((counts,p)=>(counts[p.t]=(counts[p.t]||0)+1,counts),{}));
    const board=finished.clone(game.board);
    const expected=select(finished.window.ShinsengumiIncidentRules,board,owner,allowed,(b,s)=>finished.check(b,s),(b,s)=>finished.legalMoves(b,hands,s));
    assert.equal(key(actual),key(expected),`9x9 incident targets disagree at stage ${stage}, turn ${turn}`);
   }
   comparisons++;
  }
  const moves=game.legal();if(!moves.length)break;
  const move=moves[(turn*7+stage*11)%moves.length];
  game.move(move);
  if(game.state())break;
 }
}
assert.match(html,/shared-incident-rules\.js\?v=/);
assert.match(read('story-mode.html'),/shared-incident-rules\.js\?v=/);
console.log(`PASS: common incident target safety and 9x9 parity in ${comparisons} scenarios`);
