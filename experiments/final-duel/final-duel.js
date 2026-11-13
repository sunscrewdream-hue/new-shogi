/* Final Duel prototype: isolated from production, no game-engine overrides. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShinsengumiFinalDuel=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const around=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const key=p=>p.y+','+p.x;
function inside(p,size){return p.y>=0&&p.y<size.rows&&p.x>=0&&p.x<size.cols}
function adjacent(a,b){return Math.max(Math.abs(a.y-b.y),Math.abs(a.x-b.x))<=1}
function neighbors(p,size){return around.map(([dy,dx])=>({y:p.y+dy,x:p.x+dx})).filter(n=>inside(n,size))}
function distances(from,other,size){
  const out=new Map([[key(from),0]]),queue=[from];
  for(let i=0;i<queue.length;i++){
    const at=queue[i],d=out.get(key(at));
    for(const n of neighbors(at,size)){
      if(adjacent(n,other)||out.has(key(n)))continue;
      out.set(key(n),d+1);queue.push(n);
    }
  }
  return out;
}
function validState(s){
  return s&&Number.isInteger(s.rows)&&Number.isInteger(s.cols)&&s.rows>=4&&s.cols>=4&&
    Array.isArray(s.kings)&&s.kings.length===2&&s.kings.every(p=>Number.isInteger(p.y)&&Number.isInteger(p.x)&&inside(p,s))&&
    !adjacent(s.kings[0],s.kings[1])&&[0,1].includes(s.turn);
}
function candidates(s){
  if(!validState(s))return[];
  const d0=distances(s.kings[0],s.kings[1],s),d1=distances(s.kings[1],s.kings[0],s);
  const all=[];
  for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++){
    const p={y,x},k=key(p),a=d0.get(k),b=d1.get(k);
    if(a===undefined||b===undefined||a<2||b<2)continue;
    // A first mover wins a one-move tie: compare effective arrival plies, not only distance.
    const t0=2*a-(s.turn===0?1:0),t1=2*b-(s.turn===1?1:0);
    all.push({...p,d0:a,d1:b,arrivalGap:Math.abs(t0-t1),distanceGap:Math.abs(a-b)});
  }
  if(!all.length)return[];
  const min=Math.min(...all.map(p=>p.arrivalGap));
  // Favor candidates whose effective arrival times are close, but retain randomness.
  return all.filter(p=>p.arrivalGap===min).sort((a,b)=>Math.max(a.d0,a.d1)-Math.max(b.d0,b.d1));
}
function chooseSquare(s,rng=Math.random){
  const pool=candidates(s);
  if(!pool.length)return null;
  const bestMax=Math.min(...pool.map(p=>Math.max(p.d0,p.d1)));
  const finalists=pool.filter(p=>Math.max(p.d0,p.d1)<=bestMax+1);
  const num=Number(rng());const index=Math.min(finalists.length-1,Math.max(0,Math.floor((Number.isFinite(num)?num:0)*finalists.length)));
  const {y,x}=finalists[index];return {y,x};
}
function canStart(s){return validState(s)&&s.onlyKings===true&&s.handsEmpty===true&&s.enabled!==false&&!s.ended}
function begin(s,rng=Math.random){
  if(!canStart(s))return null;
  return {active:true,gun:chooseSquare(s,rng),plies:0,winner:null,shot:false};
}
function legalKingMove(s,side,to){
  if(!validState(s)||![0,1].includes(side)||side!==s.turn||!inside(to,s))return false;
  return adjacent(to,s.kings[side])&&!adjacent(to,s.kings[1-side]);
}
function move(s,duel,side,to,rng=Math.random){
  if(!duel?.active||duel.winner!==null||!legalKingMove(s,side,to))return null;
  const next={...s,kings:s.kings.map((p,i)=>i===side?{...to}:{...p}),turn:1-side};
  if(duel.gun&&key(to)===key(duel.gun))
    return {state:{...next,ended:true},duel:{...duel,active:false,gun:null,winner:side,shot:true,plies:duel.plies+1},event:'shot'};
  const plies=duel.plies+1;
  // Every four half-moves, reposition on a reachable, fair square.
  const gun=plies%4===0?chooseSquare(next,rng):duel.gun;
  return {state:next,duel:{...duel,gun,plies},event:plies%4===0?'relocate':'move'};
}
return {validState,canStart,distances,candidates,chooseSquare,begin,legalKingMove,move};
});
