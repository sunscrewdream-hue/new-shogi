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
 function voiceCues({captured=false,lethal=false,gaveCheck=false,captureAlreadyPlayed=false}){
  const cues=[];
  if(captured&&!lethal&&!captureAlreadyPlayed)cues.push("capture");
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

 // Contact/finish are idempotent even if an animation ends and a watchdog fires.
 function runCaptureEscort({animate,onContact=()=>{},onFinished=()=>{},valid=()=>true}){
  let touched=false,finished=false;
  const contact=()=>{if(touched||!valid())return;touched=true;onContact()};
  const finish=()=>{if(finished||!valid())return;finished=true;contact();onFinished()};
  try{animate(finish,contact)}catch(error){console.error("捕獲護送の復旧",error);finish()}
 }
 // One serialized capture -> visible move -> promotion-question contract.
 // Each view supplies its own board rendering and character sprite adapter.
 async function runCapturePromotionSequence({capture=null,movePreview=null,choose,valid=()=>true}){
  if(!valid())return false;
  if(typeof capture==="function")await capture();
  if(!valid())return false;
  if(typeof movePreview==="function")await movePreview();
  if(!valid())return false;
  if(typeof choose==="function")choose();
  return true;
 }
 // Used by both 9x9 regular matches and all story board sizes.
 function animateMovePreview(from,to,token,{duration=360,valid=()=>true}={}){
  if(!from||!to||!token||!valid())return Promise.resolve();
  if(typeof token.animate!=="function"||root.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
   return new Promise(resolve=>setTimeout(resolve,180));
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
  return new Promise(resolve=>{
   let settled=false,motion=null;
   const finish=()=>{if(settled)return;settled=true;try{motion?.cancel()}catch{}resolve()};
   try{
    // The opposite-facing shogi token already has rotate(180deg) in CSS.
    // Keep that base orientation during the translation preview for both players.
    const computed=root.getComputedStyle?.(token)?.transform||'none';
    const base=computed==='none'?'':(' '+computed);
    motion=token.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px)`+base,opacity:.9},{transform:computed==='none'?'translate(0,0)':computed,opacity:1}],{duration,easing:"ease-out"});
    motion.onfinish=finish;motion.oncancel=finish;
   }catch{finish()}
   setTimeout(finish,duration+140);
  });
 }
 root.ShinsengumiBattleRules=Object.freeze({fighterKey,captureResult,voiceCues,runOrderedEffect,revealAfterTurn,runCaptureEscort,runCapturePromotionSequence,animateMovePreview});
})(typeof window!=="undefined"?window:globalThis);
