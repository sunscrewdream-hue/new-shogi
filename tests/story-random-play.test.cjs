// Deterministic, repeatable game-engine stress test for every story battlefield.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{}};vm.createContext(context);
for(const file of ['story-data.js','story-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const Engine=context.window.StoryEngine;
function random(seed){let n=seed>>>0;return()=>((n=Math.imul(1664525,n)+1013904223>>>0)/4294967296)}
function all(g){return[...g.board.flat().filter(Boolean),...g.hands.flat(),...g.fallen.flat()]}
function assertConsistent(g,stage,seed,turn){
 assert.equal(g.board.length,g.h);
 assert.ok(g.board.every(row=>row.length===g.w));
 const allPieces=all(g),identities=allPieces.map(p=>p.uid);
 assert.equal(new Set(identities).size,identities.length,`duplicate soldier identity: ${stage}/${seed}/${turn}`);
 assert.ok(allPieces.every(p=>[0,1].includes(p.s)),`invalid faction: ${stage}/${seed}/${turn}`);
 for(const side of [0,1])assert.ok(g.hands[side].every(p=>p.t!=='玉'&&!p.p),`illegal hand: ${stage}/${seed}/${turn}`);
 assert.ok(g.holes.every(h=>h.x>=0&&h.x<g.w&&h.y>=0&&h.y<g.h));
}
let plies=0,captures=0,kills=0,checks=0,games=0;
for(let stage=0;stage<4;stage++)for(let seed=1;seed<=5;seed++){
 const g=new Engine(stage),rnd=random(1009*seed+stage),total=all(g).length;
 for(let turn=0;turn<90;turn++){
  const legal=g.legal(),state=g.state();assert.equal(!!state,!legal.length||!g.king(0)||!g.king(1)||g.ply>=400);
  if(state)break;
  const move=legal[Math.floor(rnd()*legal.length)];
  assert.ok(move,`missing legal move: ${stage}/${seed}/${turn}`);
  const actor=g.side,piece=move.drop?null:g.board[move.y][move.x];
  const captured=move.drop?null:g.board[move.Y][move.X];
  const prom=!!piece&&(g.forced(piece,move.Y)||g.promoted(piece,move.y,move.Y)&&rnd()<.5);
  const kill=!!captured&&captured.t!=='玉'&&rnd()<.12;
  const result=g.move(move,prom,kill);
  assert.equal(result.captured,captured);
  if(captured)captures++;
  if(kill)kills++;
  if(g.check(g.board,1-actor))checks++;
  assertConsistent(g,stage,seed,turn);
  assert.equal(all(g).length,total-(g.king(0)&&g.king(1)?0:1),`soldier lost: ${stage}/${seed}/${turn}`);
  plies++;
 }
 games++;
}
assert.ok(plies>=500&&captures>=20&&checks>0);
console.log(`PASS: ${games} story matches, ${plies} plies, ${captures} captures, ${kills} lethal captures, ${checks} checks`);
