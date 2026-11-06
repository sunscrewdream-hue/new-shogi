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
 root.ShinsengumiBattleRules=Object.freeze({fighterKey,captureResult,voiceCues});
})(typeof window!=="undefined"?window:globalThis);
