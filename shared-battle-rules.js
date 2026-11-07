/* One rule contract for capture, check and hitokiri awakening in every mode. */
(function(root){
 "use strict";
 function fighterKey(piece){
  if(!piece)return null;
  const origin=piece.originSide??piece.origin??piece.s;
  if(piece.cid!=null)return String(origin)+":"+String(piece.cid);
  return piece.uid??String(origin)+":"+String(piece.t??"unknown");
 }
 function captureResult({captured,drop=false,previous=0,hitokiri=true}){
  const count=Math.max(0,Number(previous)||0);
  const lethal=Boolean(captured&&!drop&&hitokiri&&count>=3);
  const next=captured&&hitokiri?(lethal?0:count+1):count;
  return Object.freeze({lethal,next,awakened:Boolean(captured&&hitokiri&&!lethal&&next===3)});
 }
 function voiceCues({captured=false,lethal=false,gaveCheck=false}){
  const cues=[];
  if(captured&&!lethal)cues.push("capture");
  if(gaveCheck&&!lethal)cues.push("check");
  return cues;
 }
 // The presentation contract is shared across 9x9 and every story chapter.
 // Board mutations and sprites remain view-specific; their ORDER never does.
 async function runOrderedEffect({attack,impact,cry,result,valid=()=>true}){
  for(const [name,step] of [["attack",attack],["impact",impact],["cry",cry],["result",result]]){
   if(!valid())return false;
   if(typeof step==="function")await step();
  }
  return valid();
 }
 function revealAfterTurn(face,animationName,display,{fallbackMs=650,valid=()=>true}={}){
  let done=false;
  const finish=()=>{if(done||!valid())return;done=true;display()};
  const onAnimationEnd=event=>{
   if(event.target===face&&event.animationName===animationName){face.removeEventListener("animationend",onAnimationEnd);finish()}
  };
  face.addEventListener("animationend",onAnimationEnd);
  setTimeout(()=>{face.removeEventListener("animationend",onAnimationEnd);finish()},fallbackMs);
 }
 root.ShinsengumiBattleRules=Object.freeze({fighterKey,captureResult,voiceCues,runOrderedEffect,revealAfterTurn});
})(typeof window!=="undefined"?window:globalThis);
