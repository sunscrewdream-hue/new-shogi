/* Lightweight start gate for installed/home-screen browsers.
   Warm critical artwork before the first match, not the entire game catalogue. */
(function(){
 'use strict';
 const chapterKeys=['ikedaya','kinmon','aburanokoji','toba_fushimi'];
 const common=[
  'assets/sprites/figures/shinsengumi_back.webp',
  'assets/sprites/figures/saccho_front.webp',
  'assets/visuals/incident-title-outline-v3.webp'
 ];
 const normalImages=[
  'assets/visuals/intro_toba_fushimi_enemy_mobile.webp',
  'assets/visuals/intro_shinsengumi_team_mobile.webp',
  'assets/visuals/intro_toba_fushimi_enemy_pc.webp',
  'assets/visuals/intro_shinsengumi_team_pc.webp'
 ];
 const titleVoice='assets/audio/voice_iza_shutsujin.mp3';
 const cache=new Map(),successful=new Set(),bypass=new WeakSet();
 let starting=false,overlay=null,status=null,retryButton=null,continueButton=null;
 function imageReady(src){
  return new Promise(resolve=>{
   const img=new Image();let settled=false;
   const timer=setTimeout(()=>finish(false),7000);
   const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);resolve(ok)};
   img.onload=()=>{
    if(typeof img.decode==='function')img.decode().then(()=>finish(true),()=>finish(true));
    else finish(true);
   };
   img.onerror=()=>finish(false);
   img.src=src;
   if(img.complete&&img.naturalWidth)finish(true);
  });
 }
 function audioReady(src){
  // Fetch warms the HTTP cache, but does not start audio or require autoplay.
  if(!window.fetch)return Promise.resolve(true);
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>controller?.abort(),6500);
  return fetch(src,{cache:'force-cache',...(controller?{signal:controller.signal}:{})})
   .then(r=>r.ok?r.arrayBuffer():Promise.reject(Error('audio '+r.status)))
   .then(()=>true,()=>false).finally(()=>clearTimeout(timer));
 }
 function assetsFor(mode,chapter){
  const story=mode==='story';
  const names=story?common.slice():common.concat(normalImages);
  if(story&&Number.isInteger(chapter)&&chapter>=0&&chapter<4){
   const key=chapterKeys[chapter];
   names.push('assets/visuals/intro_'+key+'_enemy_mobile.webp',
    'assets/visuals/intro_'+key+'_enemy_pc.webp',
    'assets/visuals/intro_shinsengumi_team_mobile.webp',
    'assets/visuals/intro_shinsengumi_team_pc.webp');
  }
  return [...new Set(names)].map(src=>({src,kind:'image'}))
   .concat([{src:titleVoice,kind:'audio'}]);
 }
 function prepare(mode,chapter,onProgress){
  const key=mode+':'+(Number.isInteger(chapter)?chapter:'home');
  if(successful.has(key)){onProgress?.(1,1);return Promise.resolve(true)}
  if(cache.has(key))return cache.get(key).then(ok=>{onProgress?.(1,1);return ok});
  const list=assetsFor(mode,chapter);let next=0,completed=0,failures=0;
  const workers=Array.from({length:Math.min(3,list.length)},async()=>{
   while(next<list.length){
    const item=list[next++];
    const ok=await (item.kind==='image'?imageReady(item.src):audioReady(item.src));
    if(!ok)failures++;
    onProgress?.(++completed,list.length);
   }
  });
  const task=Promise.all(workers).then(()=>{
   const ok=failures===0;
   if(ok)successful.add(key);else cache.delete(key);
   return ok;
  }).catch(e=>{console.warn('出陣前の素材確認',e);cache.delete(key);return false});
  cache.set(key,task);return task;
 }
 function createOverlay(){
  if(overlay)return;
  const style=document.createElement('style');
  style.textContent='#startupPreload{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#0a1621eF;color:#f5e8cd;padding:22px;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;text-align:center}#startupPreload[hidden]{display:none}#startupPreload .preloadBox{max-width:360px;width:100%;padding:24px 20px;border:1px solid #b59b70;border-radius:11px;background:#172b38;box-shadow:0 14px 45px #0009}#startupPreload h2{margin:0 0 12px;font-size:clamp(22px,6vw,29px)}#startupPreload p{font-size:14px;line-height:1.7}#startupPreload progress{width:100%;height:12px;accent-color:#c5a36d}#startupPreload .preloadActions{display:flex;justify-content:center;gap:9px;margin-top:16px}#startupPreload button{padding:10px;border-radius:7px;border:1px solid #c3a979;background:#e8d3a6;color:#261d15;font-weight:800;min-height:43px}';
  document.head.append(style);
  overlay=document.createElement('div');overlay.id='startupPreload';overlay.hidden=true;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','出陣準備中');
  overlay.innerHTML='<div class="preloadBox"><h2>出陣準備中</h2><p id="startupPreloadStatus" role="status" aria-live="polite">素材を読み込んでいます…</p><progress id="startupPreloadProgress" value="0" max="100"></progress><div class="preloadActions" id="startupPreloadActions" hidden><button type="button" id="startupPreloadRetry">再読み込み</button><button type="button" id="startupPreloadContinue">このまま開始</button></div></div>';
  document.body.append(overlay);
  status=overlay.querySelector('#startupPreloadStatus');
  retryButton=overlay.querySelector('#startupPreloadRetry');
  continueButton=overlay.querySelector('#startupPreloadContinue');
 }
 async function run(mode,chapter,action){
  if(starting)return;
  starting=true;createOverlay();
  const key=mode+':'+(Number.isInteger(chapter)?chapter:'home');
  if(!successful.has(key))overlay.hidden=false;
  let done=false;
  const start=()=>{
   if(done)return;done=true;overlay.hidden=true;starting=false;
   action();
  };
  const attempt=async()=>{
   overlay.querySelector('#startupPreloadActions').hidden=true;
   status.textContent='画像と音声を準備しています…';
   const progress=overlay.querySelector('#startupPreloadProgress');
   progress.value=0;
   const ok=await prepare(mode,chapter,(completed,total)=>{progress.value=Math.round(completed/total*100);status.textContent='素材の読み込み中 '+completed+' / '+total});
   if(ok){start();return}
   overlay.hidden=false;
   status.textContent='一部の素材を読み込めませんでした。通信を確認して再試行してください。';
   overlay.querySelector('#startupPreloadActions').hidden=false;
  };
  retryButton.onclick=attempt;
  continueButton.onclick=start;
  await attempt();
 }
 function initialize(){
  createOverlay();
  const mode=document.getElementById('storyHome')?'story':'normal';
  // Start immediately on every page opening, including stand-alone homescreen launch.
  prepare(mode,mode==='story'?0:null).catch(()=>{});
  if(mode==='story')prepare('story',null).catch(()=>{});
  document.addEventListener('click',event=>{
   const button=mode==='story'
    ?event.target.closest?.('#storyChapters button.chapter')
    :event.target.closest?.('#startGame');
   if(!button||button.disabled||bypass.has(button)){if(button)bypass.delete(button);return}
   const chapter=mode==='story'?[...document.querySelectorAll('#storyChapters button.chapter')].indexOf(button)-1:null;
   const key=mode+':'+(Number.isInteger(chapter)?chapter:'home');
   if(successful.has(key))return;
   event.preventDefault();event.stopImmediatePropagation();
   void run(mode,chapter,()=>{bypass.add(button);button.click()});
  },true);
 }
 window.ShinsengumiStartup={prepare,run,isReady:(mode,chapter)=>successful.has(mode+':'+(Number.isInteger(chapter)?chapter:'home'))};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
