'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),duel=require('./final-duel.js');
function state(rows=9,cols=9,turn=0){
 return {rows,cols,kings:[{y:rows-1,x:0},{y:0,x:cols-1}],turn,onlyKings:true,handsEmpty:true,enabled:true,ended:false};
}
test('never activates with other pieces, hands, disabled rule, or invalid kings',()=>{
 const s=state();assert.equal(duel.canStart(s),true);
 for(const change of [{onlyKings:false},{handsEmpty:false},{enabled:false},{ended:true},{kings:[s.kings[0],s.kings[0]]}])
  assert.equal(duel.canStart({...s,...change}),false);
});
test('gun can be approached legally by both kings for every legal king pair on 9x9 and 5x6',()=>{
 let count=0;
 for(const [rows,cols] of [[9,9],[5,6]])for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)
 for(let z=0;z<rows;z++)for(let w=0;w<cols;w++)for(let turn=0;turn<2;turn++){
  const s={...state(rows,cols,turn),kings:[{y,x},{y:z,x:w}]};
  if(!duel.validState(s))continue;
  const gun=duel.chooseSquare(s,()=>0.31);
  if(!gun)continue;
  const k=gun.y+','+gun.x,d0=duel.distances(s.kings[0],s.kings[1],s),d1=duel.distances(s.kings[1],s.kings[0],s);
  assert.ok(d0.has(k)&&d1.has(k),'unreachable: '+JSON.stringify(s));
  assert.ok(d0.get(k)>=2&&d1.get(k)>=2,'gun too close: '+JSON.stringify(s));
  count++;
 }
 assert.ok(count>3000);
});
test('either side can win by collecting the gun',()=>{
 for(const side of [0,1]){
  const s=state(9,9,side);
  const adjacentSquare={y:s.kings[side].y,x:s.kings[side].x+(side===0?1:-1)};
  const d={active:true,gun:adjacentSquare,plies:0,winner:null,shot:false};
  const result=duel.move(s,d,side,adjacentSquare);
  assert.equal(result?.event,'shot');assert.equal(result.duel.winner,side);
  assert.equal(result.state.ended,true);assert.equal(result.duel.active,false);
 }
});
test('illegal king moves do not modify a duel',()=>{
 const s=state(),d=duel.begin(s,()=>0);
 assert.equal(duel.move(s,d,0,s.kings[1]),null);
 assert.equal(duel.move(s,d,1,{y:1,x:8}),null);
});
test('keeps the pistol fixed after four legal half-moves without declaring a winner',()=>{
 let s=state(9,9,0),d=duel.begin(s,()=>0);
 const initialGun={...d.gun};
 const steps=[{y:8,x:1},{y:0,x:7},{y:8,x:0},{y:0,x:8}];
 for(const p of steps){const result=duel.move(s,d,s.turn,p,()=>0);assert.ok(result);s=result.state;d=result.duel;}
 assert.equal(d.plies,4);assert.equal(d.winner,null);assert.equal(d.active,true);assert.deepEqual(d.gun,initialGun);
});
