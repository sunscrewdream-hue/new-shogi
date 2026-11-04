(function(){
"use strict";
const BACK=["香","桂","銀","金","玉","金","銀","桂","香"];
const ROSTER={玉:[0],飛:[1],角:[2],金:[3,4],銀:[5,6],桂:[7,8],香:[9,10],歩:[11,12,13,14,15,16,17,18,19]};
const VALUES={玉:10000,飛:14,角:12,金:9,銀:7,桂:5,香:4,歩:2};
class StoryEngine{
 constructor(stage){this.stage=stage;this.config=window.StoryData.chapters[stage];this.w=this.config.w;this.h=this.config.h;this.side=0;this.last=null;this.ply=0;this.holes=[];this.hands=[[],[]];this.board=Array.from({length:this.h},()=>Array(this.w).fill(null));this.setup();}
 isHole(y,x){return this.holes.some(v=>v.y===y&&v.x===x&&this.ply<v.expiresPly)}
 setup(){
  const used=[{},{}],make=(t,s)=>{
   const n=used[s][t]||0;used[s][t]=n+1;
   const cid=ROSTER[t][n]??null;
   if(s===0)return{t,s,cid,origin:0,p:false,mob:n%8};
   if(t==="玉")return{t,s,cid:this.stage===1?17:this.stage===3?0:null,origin:1,p:false,king:this.config.king,mob:0};
   if(this.stage===2&&t==="銀"&&n===0)return{t,s,cid:7,origin:0,p:false,king:"todo",mob:0};
   return{t,s,cid:this.stage===1||this.stage===3?cid:null,origin:1,p:false,mob:n%8};
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
  const d=p.s===0?-1:1,out=[],h=B.length,w=B[0].length,isHole=(Y,X)=>this.isHole(Y,X);
  function add(dy,dx,slide=false){
   let Y=y+dy,X=x+dx;
   while(Y>=0&&Y<h&&X>=0&&X<w){
    if(isHole(Y,X))break;
    const q=B[Y][X];if(q&&q.s===p.s)break;
    if(q&&q.t==="玉"&&!attack)break;
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
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(B[y][x]?.s===s)
   for(const m of this.steps(B,y,x)){const bb=this.clone(B),hh=this.handClone(H);this.act(bb,hh,s,m);if(!this.check(bb,s))result.push(m)}
  for(const t of new Set(H[s].map(p=>p.t)))for(let Y=0;Y<h;Y++)for(let X=0;X<w;X++){
   if(B[Y][X]||this.isHole(Y,X))continue;
   if(["歩","香"].includes(t)&&(s===0?Y===0:Y===h-1)||t==="桂"&&(s===0?Y<=1:Y>=h-2))continue;
   if(t==="歩"&&B.some(row=>row[X]?.s===s&&row[X]?.t==="歩"&&!row[X]?.p))continue;
   const m={drop:true,t,Y,X},bb=this.clone(B),hh=this.handClone(H);this.act(bb,hh,s,m);
   if(this.check(bb,s))continue;
   if(checkPawnMate&&t==="歩"&&this.check(bb,1-s)&&!this.legal(1-s,bb,hh,false).length)continue;
   result.push(m);
  }
  return result;
 }
 king(s){for(const row of this.board)for(const p of row)if(p?.s===s&&p.t==="玉")return p;return null}
 move(m,prom=false,kill=false){
  const unit=m.drop?this.hands[this.side].find(p=>p.t===m.t):this.board[m.y][m.x];
  const captured=this.act(this.board,this.hands,this.side,m,prom,kill);
  this.last={y:m.Y,x:m.X};this.ply++;this.holes=this.holes.filter(v=>this.ply<v.expiresPly);this.side=1-this.side;
  return {unit,captured};
 }
 state(){if(!this.king(0))return{winner:1,why:"王将が失われた"};if(!this.king(1))return{winner:0,why:"敵将が失われた"};
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
 ai(){const ms=this.legal(1);if(!ms.length)return null;return ms.map(m=>({m,score:this.score(m,this.config.level)})).sort((a,b)=>b.score-a.score)[0].m}
 fire(kind){
  const x=Math.floor(Math.random()*this.w);
  if(kind==="cannon"){const y=Math.floor(Math.random()*this.h);return {kind,x,y,hit:this.board[y][x]}}
  for(let y=0;y<this.h;y++)if(this.board[y][x])return{kind,x,y,hit:this.board[y][x]};
  return{kind,x,y:-1,hit:null};
 }
 destroy(y,x){const p=this.board[y]?.[x];if(p)this.board[y][x]=null;return p}
}
window.StoryEngine=StoryEngine;
})();
