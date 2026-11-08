(function(){
"use strict";
const BACK=["香","桂","銀","金","玉","金","銀","桂","香"];
const ROSTER={玉:[0],飛:[1],角:[2],金:[3,4],銀:[5,6],桂:[7,8],香:[9,10],歩:[11,12,13,14,15,16,17,18,19]};
const VALUES={玉:10000,飛:14,角:12,金:9,銀:7,桂:5,香:4,歩:2};
class StoryEngine{
 constructor(stage){this.stage=stage;this.config=window.StoryData.chapters[stage];this.w=this.config.w;this.h=this.config.h;this.side=0;this.last=null;this.ply=0;this.holes=[];this.hands=[[],[]];this.fallen=[[],[]];this.allowAbandonKing=true;this.board=Array.from({length:this.h},()=>Array(this.w).fill(null));this.setup();}
 isHole(y,x){return this.holes.some(v=>v.y===y&&v.x===x&&this.ply<v.expiresPly)}
 startOilAmbush(){
  if(this.stage!==2)return;
  this.oilEnemyReserve=this.board.slice(0,2).map(row=>row.map(p=>p?{...p}:null));
  for(let y=0;y<2;y++)this.board[y].fill(null);
  this.board[1][0]={...this.oilEnemyReserve[0][2],king:"ito"};
  this.oilPhase=1;this.oilItoGunUsed=false;this.oilVisitCounts=new Map([["1:0",1]]);
 }
 triggerOilAmbush(){
  if(this.stage!==2||this.oilPhase!==1||!this.oilEnemyReserve)return null;
  // The ambush must never start while Ito is still on the board.
  if(this.king(1))return null;
  const enemy=this.oilEnemyReserve.map(row=>row.map(p=>p?{...p}:null));
  enemy[0][2]={...enemy[0][1],t:"玉",king:"todo",p:false};
  enemy[0][1]={...enemy[0][3],uid:"1:銀:ambush",mob:1};
  const slots=[];
  for(let y=0;y<2;y++)for(let x=0;x<this.w;x++)if(enemy[y][x])slots.push({y,x});
  let king=null;
  for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)if(this.board[y][x]?.s===0&&this.board[y][x].t==="玉")king={y,x};
  let retreat=null;
  if(king&&slots.some(q=>q.y===king.y&&q.x===king.x)){
   const ordered=[];
   for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)
    if(!slots.some(q=>q.y===y&&q.x===x)&&!this.isHole(y,x)&&this.board[y][x]===null)
     ordered.push({y,x});
   ordered.sort((a,b)=>b.y-a.y||Math.abs(a.x-king.x)-Math.abs(b.x-king.x));
   for(const q of ordered){
    const test=this.clone(this.board);
    test[king.y][king.x]=null;test[q.y][q.x]={...this.board[king.y][king.x]};
    for(const slot of slots)test[slot.y][slot.x]={...enemy[slot.y][slot.x]};
    if(!this.check(test,0)){retreat=q;break}
   }
   if(!retreat)return null;
   const moving=this.board[king.y][king.x];
   this.board[king.y][king.x]=null;
   this.board[retreat.y][retreat.x]=moving;
  }
  const casualties=[];
  for(const slot of slots){
   const p=this.board[slot.y][slot.x];
   if(p?.s===0){casualties.push({y:slot.y,x:slot.x,cid:p.cid});this.board[slot.y][slot.x]=null}
   this.board[slot.y][slot.x]={...enemy[slot.y][slot.x]};
  }
  this.oilPhase=2;this.oilEnemyReserve=null;this.side=0;this.last=null;
  return {casualties,retreat,valid:!!this.king(0)&&!!this.king(1)&&!!this.legal(0).length};
 }
 setup(){
  const used=[{},{}],make=(t,s)=>{
   const n=used[s][t]||0;used[s][t]=n+1;
   const cid=ROSTER[t][n]??null;
   // An officer's identity survives capture, change of allegiance and redeployment.
   // In 5x6, multiple unnamed soldiers otherwise shared the same origin/type key.
   const uid=`${s}:${t}:${n}`;
   if(s===0)return{t,s,cid,origin:0,uid,p:false,mob:n%8};
   if(t==="玉")return{t,s,cid:this.stage===1?17:this.stage===3?0:null,origin:1,uid,p:false,king:this.config.king,mob:0};
   if(this.stage===2&&t==="銀"&&n===0)return{t,s,cid:7,origin:0,uid,p:false,king:"todo",mob:0};
   return{t,s,cid:this.stage===1||this.stage===3?cid:null,origin:1,uid,p:false,mob:n%8};
  },B=this.board;
  if(this.w===5){
   const row=["金","銀","玉","銀","金"],row2=["歩","歩","飛","歩","歩"];
   for(let x=0;x<5;x++){B[0][x]=make(row[x],1);B[1][x]=make(row2[x],1);B[4][x]=make(row2[x],0);B[5][x]=make(row[x],0)}
  }else{
   for(let x=0;x<9;x++){B[0][x]=make(BACK[x],1);B[2][x]=make("歩",1);B[6][x]=make("歩",0);B[8][x]=make(BACK[x],0)}
   B[1][1]=make("飛",1);B[1][7]=make("角",1);B[7][1]=make("角",0);B[7][7]=make("飛",0);
  }
 }
 clone(B){return B.map(r=>r.map(p=>p?{...p}:null))}
 handClone(H){return H.map(a=>a.map(p=>({...p})))}
 steps(B,y,x,attack=false){
  const p=B[y]?.[x];if(!p)return[];
  const d=p.s===0?-1:1,out=[],h=B.length,w=B[0].length,isHole=(Y,X)=>this.isHole(Y,X),abandonKing=this.allowAbandonKing;
  function add(dy,dx,slide=false){
   let Y=y+dy,X=x+dx;
   while(Y>=0&&Y<h&&X>=0&&X<w){
    if(isHole(Y,X))break;
    const q=B[Y][X];if(q&&q.s===p.s)break;
    // New Shinsengumi Shogi permits a king to be taken directly after it is abandoned.
    if(q&&q.t==="玉"&&!attack&&!abandonKing)break;
    out.push({y,x,Y,X});
    if(q||!slide)break;Y+=dy;X+=dx;
   }
  }
  const gold=[[d,-1],[d,0],[d,1],[0,-1],[0,1],[-d,0]],silver=[[d,-1],[d,0],[d,1],[-d,-1],[-d,1]];
  if(p.t==="玉")[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(v=>add(...v));
  else if(p.t==="金"||p.p&&["歩","香","桂","銀"].includes(p.t))gold.forEach(v=>add(...v));
  else if(p.t==="銀")silver.forEach(v=>add(...v));
  else if(p.t==="歩")add(d,0);
  else if(p.t==="桂"){add(2*d,-1);add(2*d,1)}
  else if(p.t==="香")add(d,0,true);
  else if(p.t==="飛"){[[1,0],[-1,0],[0,1],[0,-1]].forEach(v=>add(...v,true));if(p.p)[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(v=>add(...v))}
  else if(p.t==="角"){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(v=>add(...v,true));if(p.p)[[1,0],[-1,0],[0,1],[0,-1]].forEach(v=>add(...v))}
  return out;
 }
 promoted(p,y,Y,h=this.h){
  const zone=h===6?2:3;
  return !p.p&&!["玉","金"].includes(p.t)&&(p.s===0?(y<zone||Y<zone):(y>=h-zone||Y>=h-zone));
 }
 forced(p,Y,h=this.h){return !p.p&&((["歩","香"].includes(p.t)&&(p.s===0?Y===0:Y===h-1))||(p.t==="桂"&&(p.s===0?Y<=1:Y>=h-2)))}
 act(B,H,s,m,prom=false,kill=false){
  if(m.drop){const i=H[s].findIndex(p=>p.t===m.t);if(i<0)return null;const p=H[s].splice(i,1)[0];B[m.Y][m.X]={...p,s,p:false};return null}
  const captured=B[m.Y][m.X],p=B[m.y][m.x];B[m.y][m.x]=null;B[m.Y][m.X]=p;
  if(prom||this.forced(p,m.Y,B.length))p.p=true;
  if(captured&&captured.t!=="玉"&&!kill)H[s].push({...captured,s,p:false});
  return captured;
 }
 check(B,s){
  let king=null;
  for(let y=0;y<B.length;y++)for(let x=0;x<B[0].length;x++)if(B[y][x]?.s===s&&B[y][x].t==="玉")king=[y,x];
  if(!king)return true;
  for(let y=0;y<B.length;y++)for(let x=0;x<B[0].length;x++)if(B[y][x]?.s===1-s&&this.steps(B,y,x,true).some(m=>m.Y===king[0]&&m.X===king[1]))return true;
  return false;
 }
 legal(s=this.side,B=this.board,H=this.hands,checkPawnMate=true){
  const result=[],h=B.length,w=B[0].length;
  // Same as the completed game's "主君を見捨てる" rule: a human who is
  // already in check may choose a move that leaves the king exposed.
  // The AI must still defend its king while it can.
  const abandoning=this.allowAbandonKing&&s===0&&this.check(B,s);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(B[y][x]?.s===s)
   for(const m of this.steps(B,y,x)){const bb=this.clone(B),hh=this.handClone(H);this.act(bb,hh,s,m);if(abandoning||!this.check(bb,s))result.push(m)}
  for(const t of new Set(H[s].map(p=>p.t)))for(let Y=0;Y<h;Y++)for(let X=0;X<w;X++){
   if(B[Y][X]||this.isHole(Y,X))continue;
   if(["歩","香"].includes(t)&&(s===0?Y===0:Y===h-1)||t==="桂"&&(s===0?Y<=1:Y>=h-2))continue;
   if(t==="歩"&&B.some(row=>row[X]?.s===s&&row[X]?.t==="歩"&&!row[X]?.p))continue;
   const m={drop:true,t,Y,X},bb=this.clone(B),hh=this.handClone(H);this.act(bb,hh,s,m);
   if(!abandoning&&this.check(bb,s))continue;
   if(checkPawnMate&&t==="歩"&&this.check(bb,1-s)&&!this.legal(1-s,bb,hh,false).length)continue;
   result.push(m);
  }
  return result;
 }
 king(s){for(const row of this.board)for(const p of row)if(p?.s===s&&p.t==="玉")return p;return null}
 move(m,prom=false,kill=false){
  const unit=m.drop?this.hands[this.side].find(p=>p.t===m.t):this.board[m.y][m.x];
  const captured=this.act(this.board,this.hands,this.side,m,prom,kill);
  if(kill&&captured&&captured.t!=="玉")this.fallen[captured.s].push({...captured,p:false});
  if(this.stage===2&&this.oilPhase===1&&this.side===1){const k=m.Y+":"+m.X;this.oilVisitCounts?.set(k,(this.oilVisitCounts.get(k)||0)+1)}
  this.last={y:m.Y,x:m.X};this.ply++;this.holes=this.holes.filter(v=>this.ply<v.expiresPly);this.side=1-this.side;
  return {unit,captured};
 }
 state(){if(!this.king(0))return{winner:1,why:"主君討死"};if(!this.king(1))return{winner:0,why:"主君討死"};
  if(this.ply>=400)return{winner:-1,why:"持久戦による引き分け"};
  if(!this.legal().length)return{winner:1-this.side,why:this.check(this.board,this.side)?"詰み":"指す手なし"};return null;
 }
 score(m,level){
  const p=m.drop?this.hands[1].find(x=>x.t===m.t):this.board[m.y][m.x],cap=this.board[m.Y][m.X];
  let score=(cap?VALUES[cap.t]*1.9:0)+(m.drop?0:(m.Y-m.y)*.18);
  if(!m.drop&&this.promoted(p,m.y,m.Y))score+=2.2;
  score+=Math.random()*(level===3?.25:level===2?.75:2.7);
  const B=this.clone(this.board),H=this.handClone(this.hands);this.act(B,H,1,m,!m.drop&&this.promoted(p,m.y,m.Y));
  if(this.check(B,0))score+=3;
  if(!m.drop){let attacked=false;for(let y=0;y<B.length;y++)for(let x=0;x<B[0].length;x++)if(B[y][x]?.s===0&&this.steps(B,y,x,true).some(a=>a.Y===m.Y&&a.X===m.X))attacked=true;
   if(attacked)score-=VALUES[p.t]*(level>=2?.9:.35);
  }
  return score;
 }
 oilItoGunTarget(){
  if(this.stage!==2||this.oilPhase!==1||this.oilItoGunUsed)return null;
  let ito=null;
  for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)
   if(this.board[y][x]?.king==="ito")ito={y,x};
  if(!ito)return null;
  let best=null,score=-Infinity;
  for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){
   const victim=this.board[y][x];if(victim?.s!==0||victim.t==="玉")continue;
   this.board[y][x]=null;
   const exits=this.legal(1).length,stillChecked=this.check(this.board,1);
   this.board[y][x]=victim;
   const distance=Math.max(Math.abs(ito.y-y),Math.abs(ito.x-x));
   const value=exits*50-(stillChecked?80:0)-distance*3;
   if(value>score){score=value;best={x,y,fromX:ito.x,fromY:ito.y,side:1,hit:victim}}
  }
  return best;
 }
 oilItoAi(ms){
  // One defender against a full army: optimize the WORST plausible reply.
  // This is defensive minimax, not the normal attack-oriented material score.
  const reserveSlots=new Set();
  for(let y=0;y<2;y++)for(let x=0;x<this.w;x++)if(this.oilEnemyReserve?.[y]?.[x])reserveSlots.add(y*this.w+x);
  let best=ms[0],bestScore=-Infinity;
  for(const move of ms){
   const B=this.clone(this.board),H=this.handClone(this.hands);
   this.act(B,H,1,move);
   // Check the most forcing human replies first; keep mobile search bounded.
   const responsePriority=r=>{
    const p=r.drop?H[0].find(v=>v.t===r.t):B[r.y][r.x];
    const distance=Math.max(Math.abs(r.Y-move.Y),Math.abs(r.X-move.X));
    return (B[r.Y][r.X]?.s===1?120:0)+(distance<=1?50:0)
      +(p?.t==="飛"?12:0)+(r.Y<=2?8:0)-distance*8;
   };
   const responses=this.legal(0,B,H,false).sort((a,b)=>responsePriority(b)-responsePriority(a)).slice(0,14);
   let worst=Infinity;
   for(const response of responses){
    const next=this.clone(B),hands=this.handClone(H);
    this.act(next,hands,0,response);
    const escape=this.legal(1,next,hands,false);
    let value;
    if(!escape.length)value=-500;
    else{
     const destinations=new Set(escape.map(m=>m.Y*this.w+m.X));
     const lateral=new Set(escape.map(m=>m.X));
     const pressure=this.check(next,1)?12:0;
     const bait=[...reserveSlots].filter(k=>next[Math.floor(k/this.w)][k%this.w]?.s===0).length;
     value=destinations.size*12+lateral.size*3-pressure+bait*2;
    }
    if(value<worst)worst=value;
   }
   if(!responses.length)worst=90;
   const key=move.Y+":"+move.X;
   const repeated=this.oilVisitCounts?.get(key)||0;
   // Prefer escape routes that retain room, but keep the chase near the ambush ranks.
   const score=worst-repeated*15+Math.max(0,3-move.Y)*2+Math.random()*.15;
   if(score>bestScore){bestScore=score;best=move}
  }
  return best;
 }
 ai(){const ms=this.legal(1);if(!ms.length)return null;
  if(this.stage===2&&this.oilPhase===1)return this.oilItoAi(ms);
  return ms.map(m=>({m,score:this.score(m,this.config.level)})).sort((a,b)=>b.score-a.score)[0].m}
 fire(kind,side=1){
  const x=Math.floor(Math.random()*this.w);
  if(kind==="cannon"){
   // Shells fall only on the opposing half, never on the firing army's rear.
   const enemyRows=side===1?Array.from({length:Math.floor(this.h/2)},(_,i)=>this.h-Math.floor(this.h/2)+i)
    :Array.from({length:Math.floor(this.h/2)},(_,i)=>i);
   const y=enemyRows[Math.floor(Math.random()*enemyRows.length)];
   return {kind,x,y,fromY:side===1?0:this.h-1,side,hit:this.board[y][x]};
  }
  // The musket launches from the 4th rank ON THE CARD OWNER'S SIDE.
  // Only pieces further toward the enemy can be struck, never the firing side's back ranks.
  const fromY=side===1?3:this.h-4,d=side===1?1:-1;
  // Friendly soldiers must never be selected as casualties of their own musket.
  for(let y=fromY+d;y>=0&&y<this.h;y+=d)if(this.board[y][x]?.s===1-side)return{kind,x,y,fromY,side,hit:this.board[y][x]};
  return{kind,x,y:-1,fromY,side,hit:null};
 }
 destroy(y,x){const p=this.board[y]?.[x];if(p){this.board[y][x]=null;if(p.t!=="玉")this.fallen[p.s].push({...p,p:false})}return p}
}
window.StoryEngine=StoryEngine;
})();
