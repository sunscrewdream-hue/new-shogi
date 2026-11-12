/* Shared incident-card rules. Presentation and chapter-specific cards stay in each mode. */
(function(root){
 "use strict";
 function eligibleTargets({board,owner,allowedTypes=null,check,legalMoves}){
  const result=[];
  for(let y=0;y<board.length;y++)for(let x=0;x<board[y].length;x++){
   const piece=board[y][x];
   if(!piece||piece.s!==owner||piece.t==="玉"||(allowedTypes&&!allowedTypes.includes(piece.t)))continue;
   board[y][x]=null;
   let valid=false;
   try{
    valid=!check(board,0)&&!check(board,1)&&legalMoves(board,0).length>0&&legalMoves(board,1).length>0;
   }finally{board[y][x]=piece}
   if(valid)result.push({y,x,p:piece,t:piece.t});
  }
  return result;
 }
 function planQuake({board,isHole,safe,random=Math.random}){
  const h=board.length,w=board[0].length,all=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(board[y][x]&&board[y][x].t!=='玉')all.push({y,x});
  const maxMoves=w===5?3:6,minMoves=w===5?1:3;
  for(let count=Math.min(maxMoves,all.length);count>=minMoves;count--)for(let attempt=0;attempt<80;attempt++){
   const B=JSON.parse(JSON.stringify(board)),candidates=[...all].sort(()=>random()-.5),shifts=[],sources=new Set(),targets=new Set();
   for(const v of candidates){
    if(shifts.length>=count)break;const source=v.y+':'+v.x;
    if(targets.has(source)||sources.has(source)||!B[v.y][v.x])continue;
    const positions=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const Y=v.y+dy,X=v.x+dx,target=Y+':'+X;
     if((dy||dx)&&Y>=0&&Y<h&&X>=0&&X<w&&!B[Y][X]&&!isHole(Y,X)&&!sources.has(target)&&!targets.has(target))positions.push({Y,X});
    }
    if(!positions.length)continue;const target=positions[Math.floor(random()*positions.length)];
    B[target.Y][target.X]=B[v.y][v.x];B[v.y][v.x]=null;sources.add(source);targets.add(target.Y+':'+target.X);shifts.push({...v,...target});
   }
   if(shifts.length===count&&safe(B))return {B,shifts};
  }
  return null;
 }
 const cardWeights=Object.freeze([['何事もなし',45],['寝返り',15],['脱走',15],['粛清',10],['大地震',5]].map(Object.freeze));
 root.ShinsengumiIncidentRules=Object.freeze({eligibleTargets,planQuake,cardWeights});
})(typeof window!=="undefined"?window:globalThis);
