/* Story soundtrack player. All four original Drive tracks live as same-origin GitHub Pages
   binary segments. We reconstruct MP3 bytes and apply game-side loudness matching,
   master gain and fade envelopes; normal-match audio is not touched. */
(function(){
"use strict";
const specs={
 prologue:{count:7,level:.79},
 battle01:{count:8,level:.77},
 battle02:{count:8,level:1},
 toba:{count:7,level:.92},
 ending:{count:8,level:.78}
};
let ctx=null,master=null,source=null,channel=null,current=null,wanted=null,muted=false,epoch=0,volume=10;
const gainLevel=()=>muted?0:Math.min(1,volume/100*1.15);
const buffers=new Map(),pending=new Map();
function audioContext(){
 if(ctx)return ctx;
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return null;
 ctx=new AC();
 master=ctx.createGain();master.gain.value=gainLevel();
 const limiter=ctx.createDynamicsCompressor();
 limiter.threshold.value=-15;limiter.knee.value=10;limiter.ratio.value=3;
 limiter.attack.value=.01;limiter.release.value=.2;
 master.connect(limiter).connect(ctx.destination);
 return ctx;
}
function unlock(){
 const c=audioContext();
 if(c&&c.state==="suspended")c.resume().catch(()=>{});
}
async function load(name){
 if(buffers.has(name))return buffers.get(name);
 if(pending.has(name))return pending.get(name);
 const cfg=specs[name];if(!cfg)return null;
 const request=(async()=>{
  const urls=Array.from({length:cfg.count},(_,i)=>"assets/audio/story/bgm_"+name+"_"+String(i).padStart(2,"0")+".part");
  const responses=await Promise.all(urls.map(url=>fetch(url,{cache:"force-cache"})));
  for(let i=0;i<responses.length;i++)if(!responses[i].ok)throw Error("BGM segment missing: "+urls[i]);
  const chunks=await Promise.all(responses.map(r=>r.arrayBuffer()));
  const size=chunks.reduce((n,b)=>n+b.byteLength,0),out=new Uint8Array(size);
  let offset=0;for(const chunk of chunks){out.set(new Uint8Array(chunk),offset);offset+=chunk.byteLength}
  const c=audioContext();if(!c)return null;
  const decoded=await c.decodeAudioData(out.buffer);
  buffers.set(name,decoded);
  if(buffers.size>2){for(const k of buffers.keys())if(k!==name&&k!==current){buffers.delete(k);break}}
  return decoded;
 })().finally(()=>pending.delete(name));
 pending.set(name,request);return request;
}
function stopCurrent(seconds=.6){
 if(!channel)return;
 const now=ctx.currentTime,old=channel,playing=source;
 old.gain.cancelScheduledValues(now);
 old.gain.setValueAtTime(old.gain.value,now);
 old.gain.linearRampToValueAtTime(0,now+seconds);
 if(playing)try{playing.stop(now+seconds+.03)}catch(e){}
 channel=null;source=null;current=null;
}
async function play(name){
 wanted=name;
 const token=++epoch;
 unlock();
 if(!name){if(ctx)stopCurrent();return}
 if(current===name&&source)return;
 try{
  const buffer=await load(name);
  if(token!==epoch||wanted!==name||!buffer)return;
  const c=audioContext();if(!c)return;
  await c.resume().catch(()=>{});
  if(token!==epoch)return;
  stopCurrent(.7);
  const node=c.createBufferSource(),gain=c.createGain();
  node.buffer=buffer;node.loop=true;
  gain.gain.value=0;node.connect(gain).connect(master);
  node.start();
  gain.gain.setTargetAtTime(specs[name].level,c.currentTime,.48);
  channel=gain;source=node;current=name;
 }catch(err){console.warn("Story BGM unavailable:",err.message)}
}
function setMuted(value){
 muted=!!value;
 if(!ctx||!master)return;
 master.gain.setTargetAtTime(gainLevel(),ctx.currentTime,.12);
}
function setVolume(value){volume=Math.max(0,Math.min(100,Number(value)||0));if(ctx&&master)master.gain.setTargetAtTime(gainLevel(),ctx.currentTime,.1)}
function duck(){
 if(!ctx||!master||muted)return;
 const t=ctx.currentTime;
 master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);
 master.gain.setTargetAtTime(gainLevel()*.5,t,.1);
 master.gain.setTargetAtTime(gainLevel(),t+1.6,.22);
}
// Direct two-player previews can open a battle without any initial tap.
// Browsers suspend Web Audio until a user gesture; a retry on that gesture
// allows the requested soundtrack to begin without toggling settings.
let gestureRecoveryPending=false;
function resumeBgmFromGesture(){
 if(!wanted||muted||document.hidden||gestureRecoveryPending)return;
 const c=audioContext();if(!c)return;
 if(c.state==="running"&&source)return;
 gestureRecoveryPending=true;
 Promise.resolve(c.resume()).then(()=>{
  gestureRecoveryPending=false;
  // The initial play may have been blocked before its source was created.
  // A fresh attempt is safe: play() invalidates previous requests by epoch.
  if(wanted&&!muted&&!document.hidden&&!source&&!pending.has(wanted))void play(wanted);
 }).catch(error=>{
  gestureRecoveryPending=false;
  console.warn("Story BGM gesture resume failed",error);
 });
}
document.addEventListener("pointerdown",resumeBgmFromGesture,{passive:true});
document.addEventListener("touchstart",resumeBgmFromGesture,{passive:true});
document.addEventListener("keydown",resumeBgmFromGesture);
document.addEventListener("visibilitychange",()=>{
 if(!ctx)return;
 if(document.hidden)ctx.suspend().catch(()=>{});
 else if(!muted&&wanted)ctx.resume().catch(()=>{});
});
window.StoryBgm={play,unlock,setMuted,setVolume,duck,preload:load,restart:name=>{current=null;return play(name)},stop:()=>play(null)};
})();
