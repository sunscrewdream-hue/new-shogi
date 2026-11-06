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
 root.ShinsengumiIncidentRules=Object.freeze({eligibleTargets});
})(typeof window!=="undefined"?window:globalThis);
