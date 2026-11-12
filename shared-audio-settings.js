/* One presentation for audio preferences in regular and story matches.
   Existing buttons and handlers are moved, not recreated. */
(()=>{
 'use strict';
 const defaults=Object.freeze({bgm:18,fx:55,voice:70});
 const key='shinsengumi-shogi-audio-mix-v2';
 const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
 let values={...defaults};
 try{const data=JSON.parse(localStorage.getItem(key)||'null');if(data&&typeof data==='object')for(const k of Object.keys(defaults))if(Number.isFinite(Number(data[k])))values[k]=clamp(data[k])}catch{}
 const listeners=new Set();
 // iOS Safari and installed home-screen apps may ignore HTMLAudio.volume.
 // Use Web Audio gain stages only on iOS; leave PC/Android unchanged.
 const iosMedia=/iPhone|iPad|iPod/.test(navigator.userAgent)||
  (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const mediaRoutes=new Map();let mediaContext=null;
 function updateMediaGains(){
  if(!mediaContext)return;
  for(const route of mediaRoutes.values()){
   if(!route.gain)continue;
   const level=Math.max(0,Math.min(1,values[route.kind]/100*route.scale));
   route.gain.gain.setTargetAtTime(level,mediaContext.currentTime,.012);
  }
 }
 function unlockMedia(){
  if(!iosMedia)return;
  if(!mediaContext){
   const C=window.AudioContext||window.webkitAudioContext;
   if(!C)return;
   try{mediaContext=new C()}catch(error){console.warn('iOS音量制御の初期化',error);return}
  }
  // Do not connect every registered voice and FX on the first touch:
  // on iOS that causes a synchronous stall and may silence ongoing media.
  if(mediaContext.state==='suspended')mediaContext.resume().catch(()=>{});
 }
 function connectPlayingMedia(clip){
  if(!iosMedia)return;
  unlockMedia();
  if(!mediaContext)return;
  const route=mediaRoutes.get(clip);
  if(!route||route.gain)return;
  try{
   const source=mediaContext.createMediaElementSource(clip),gain=mediaContext.createGain();
   source.connect(gain).connect(mediaContext.destination);
   route.gain=gain;
   // Web Audio is authoritative on iOS. On PC the original element
   // volume adjustment is untouched.
   clip.volume=1;
   updateMediaGains();
   if(mediaContext.state==='suspended')mediaContext.resume().catch(()=>{});
  }catch(error){
   // Do not silence the regular audio path if routing is unsupported.
   console.warn('iOS音量制御を使えない音源',error);
  }
 }
 if(iosMedia){
  const gesture=()=>unlockMedia();
  document.addEventListener('pointerdown',gesture,{passive:true,capture:true});
  document.addEventListener('touchstart',gesture,{passive:true,capture:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)unlockMedia()});
  window.addEventListener('pageshow',unlockMedia);
 }
 const mixer={
  registerMedia:(clip,kind,scale=1)=>{
   if(!iosMedia||!clip||!Object.prototype.hasOwnProperty.call(defaults,kind))return;
   if(!mediaRoutes.has(clip)){
    mediaRoutes.set(clip,{kind,scale,gain:null});
    clip.addEventListener('play',()=>connectPlayingMedia(clip));
    if(!clip.paused)connectPlayingMedia(clip);
   }else Object.assign(mediaRoutes.get(clip),{kind,scale});
   updateMediaGains();
  },
  defaults, get:kind=>values[kind]??0,
  ratio:kind=>(values[kind]??0)/100,
  set:(kind,value)=>{if(!(kind in defaults))return;values[kind]=clamp(value);try{localStorage.setItem(key,JSON.stringify(values))}catch{};updateMediaGains();for(const fn of listeners)fn({...values})},
  reset:()=>{values={...defaults};try{localStorage.setItem(key,JSON.stringify(values))}catch{};updateMediaGains();for(const fn of listeners)fn({...values})},
  subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}
 };
 window.ShinsengumiAudioMixer=mixer;
 function initialize(){
  const story=document.getElementById('storyVolume');
  const normal=document.getElementById('sfxToggle');
  const languageOnly=!story&&!normal&&!!document.querySelector('.language-toggle');
  if(!story&&!normal&&!languageOnly)return;
  // Keep the rule link: regular matches share the story action row.
  const panel=document.createElement('dialog');
  panel.className='audio-settings-panel';
  panel.setAttribute('aria-label','設定');
  panel.innerHTML='<div class="audio-settings-head"><h2>設定</h2><button class="audio-settings-close" type="button" aria-label="設定を閉じる">×</button></div><div class="audio-settings-body"></div>';
  const body=panel.querySelector('.audio-settings-body');
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='audio-settings-trigger';
  trigger.textContent='⚙ 設定';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  if(languageOnly){
   const hero=document.querySelector('.hero,.story-hero');
   if(!hero)return;
   hero.append(trigger);
  }else if(story){
   const holder=document.querySelector('.story-audio-controls');
   if(!holder)return;
   while(holder.firstChild)body.append(holder.firstChild);
   holder.append(trigger);
  }else{
   normal.before(trigger);
   const controls=[
    document.getElementById('sfxToggle'),document.getElementById('voiceToggle'),
    document.getElementById('bgmToggle'),document.getElementById('volume')?.closest('label'),
    ...document.querySelectorAll('button[onclick^="previewVoiceClips"]')
   ];
   // Legacy playback-status nodes are deliberately excluded from Settings.
   // Their DOM IDs remain available to existing audio event handlers.
   for(const control of controls){if(control)body.append(control)}
  }
  // Shared control layout: preserve each mode's original click handlers.
  const actionTop=document.createElement('div');
  if(languageOnly){
   // Collection has no match controls; keep its existing page layout.
  }else if(story){
   document.querySelector('.story-header')?.classList.add('shared-match-header');
   document.getElementById('battleQuit')?.remove();
   document.querySelector('#storyBattle .battle-top')?.classList.add('shared-match-top');
   const actions=document.querySelector('#storyBattle .battle-bottom');
   if(actions){
    actions.classList.add('shared-match-actions','two-tier-match-actions');
    const resign=document.getElementById('storyResign');
    const rules=document.getElementById('storyRules');
    const save=document.querySelector('#storyDebugTools button[onclick="storySaveMatch()"]');
    rules?.remove();
    if(resign){resign.classList.add('match-resign');actions.append(resign)}
    if(save){save.textContent='💾 保存';save.id='storyQuickSave';actions.append(save)}
    actions.append(trigger);
   }
  }else{
   const enemy=document.getElementById('enemyOfficerPanel');
   const playerHand=document.getElementById('playerHandShell');
   const findAction=action=>[...document.querySelectorAll('button[onclick="'+action+'()"]')].find(b=>!b.closest('#endOverlay'));
   const back=findAction('returnToTitle'),restart=findAction('restartGame'),resign=findAction('surrender');
   const rules=document.querySelector('.game-menu-link[href="rules.html"]');
   const header=document.createElement('div');header.className='shared-match-header normal-match-header';
   if(back){back.textContent='タイトルへ戻る';back.classList.add('page-return');header.append(back)}
   enemy?.before(header);
   // The player sitting opposite the screen also needs a surrender control.
   const opponentResign=document.createElement('button');
   opponentResign.type='button';opponentResign.id='opponentResignButton';
   opponentResign.className='match-resign opponent-resign';
   opponentResign.textContent='降参する';
   opponentResign.setAttribute('aria-label','対面側が降参する');
   opponentResign.onclick=()=>window.surrenderOpponent?.();
   header.after(opponentResign);
   actionTop.className='shared-match-top normal-match-top';
   const label=document.createElement('span');label.textContent='通常対局';actionTop.append(label);
   header.after(actionTop);
   const actions=document.createElement('div');actions.className='shared-match-actions normal-match-actions two-tier-match-actions';
   const save=document.getElementById('quickSave');
   if(resign){resign.textContent='降参する';resign.classList.add('normal-resign','match-resign');actions.append(resign)}
   if(save){save.textContent='💾 保存';actions.append(save)}
   actions.append(trigger);
   // These two controls were retired from the normal match UI.
   rules?.remove();
   restart?.remove();
   playerHand?.after(actions);
  }
  // Preserve the game's original on/off controls and their handlers, but
  // place each button directly beside its own volume slider.
  const toggles=languageOnly?{}:story?
   {bgm:body.querySelector('#audioToggle'),voice:body.querySelector('#storyVoiceToggle'),fx:body.querySelector('#storyFxToggle')}:
   {bgm:body.querySelector('#bgmToggle'),voice:body.querySelector('#voiceToggle'),fx:body.querySelector('#sfxToggle')};
  const slider=body.querySelector(story?'#storyVolume':'#volume');
  const oldLabel=slider?.closest('label');
  const extras=[...body.children].filter(node=>node!==oldLabel&&!Object.values(toggles).includes(node));
  if(slider&&!languageOnly){
   const bgmOriginalOutput=oldLabel?.querySelector('output');
   const group=document.createElement('div');group.className='audio-mixer';
   const rows={};
   const labels={bgm:'BGM',voice:'音声',fx:'効果音'};
   const toggleOn=button=>{
    if(!button)return true;
    // Story buttons already maintain aria-pressed. Normal buttons encode
    // their current state in the text; both handlers remain untouched.
    return story?button.getAttribute('aria-pressed')==='true':
     !/OFF/i.test(button.textContent);
   };
   for(const kind of ['bgm','voice','fx']){
    const row=document.createElement('div');row.className='audio-mixer-row';
    const label=document.createElement('label');label.className='audio-mixer-title';
    const range=kind==='bgm'?slider:document.createElement('input');
    if(kind!=='bgm'){range.type='range';range.min='0';range.max='100';range.step='1';range.id='audioMix'+kind}
    range.value=String(mixer.get(kind));range.setAttribute('aria-label',labels[kind]+'の音量');
    label.textContent=labels[kind];label.htmlFor=range.id;
    const toggle=toggles[kind];
    if(toggle){
     toggle.classList.add('audio-mixer-toggle');toggle.type='button';
     const updateButton=()=>{
      const on=toggleOn(toggle);
      toggle.textContent=on?'ON':'OFF';
      toggle.setAttribute('aria-pressed',String(on));
      toggle.setAttribute('aria-label',labels[kind]+'を'+(on?'オフ':'オン')+'にする');
      row.classList.toggle('audio-mixer-off',!on);
     };
     // Normal game onclick handlers use button text to toggle? They do not:
     // each maintains its own enabled flag, so keep the raw state in dataset.
     const sourceHandler=toggle.onclick;
     toggle.onclick=null;
     toggle.addEventListener('click',()=>{
      if(typeof sourceHandler==='function')sourceHandler.call(toggle);
      // Original normal handlers set their long text; normalize after them.
      updateButton();
     });
     updateButton();
    }
    const value=document.createElement('output');value.htmlFor=range.id;
    value.textContent=range.value+'%';
    range.addEventListener('input',()=>mixer.set(kind,range.value));
    row.append(label,toggle||document.createElement('span'),range,value);group.append(row);
    rows[kind]={range,value};
   }
   const reset=document.createElement('button');reset.type='button';reset.className='audio-mixer-reset';
   reset.textContent='推奨音量にリセット';reset.onclick=()=>mixer.reset();
   group.append(reset);
   oldLabel?.remove();
   body.prepend(group);
   const sync=next=>{
    for(const kind of ['bgm','voice','fx']){
     rows[kind].range.value=String(next[kind]);
     rows[kind].value.textContent=next[kind]+'%';
    }
    if(bgmOriginalOutput){bgmOriginalOutput.value=String(next.bgm);bgmOriginalOutput.textContent=String(next.bgm)}
   };
   mixer.subscribe(sync);sync({bgm:mixer.get('bgm'),voice:mixer.get('voice'),fx:mixer.get('fx')});
  }
  for(const node of extras)body.append(node);
  const languageButton=document.querySelector('.language-toggle');
  if(languageButton)body.append(languageButton);
  document.body.append(panel);
  const close=()=>panel.close();
  trigger.addEventListener('click',()=>{document.body.classList.add('audio-settings-active');panel.showModal();trigger.setAttribute('aria-expanded','true');panel.querySelector('.audio-settings-close').focus()});
  panel.querySelector('.audio-settings-close').addEventListener('click',close);
  panel.addEventListener('click',event=>{if(event.target===panel)close()});
  panel.addEventListener('close',()=>{document.body.classList.remove('audio-settings-active');trigger.setAttribute('aria-expanded','false');trigger.focus()});
  // Keep the label bilingual without affecting any original game audio handler.
  const updateLanguage=()=>{
   let language='ja';try{language=localStorage.getItem('shinsengumi-shogi-language-v1')||'ja'}catch{}
   trigger.textContent=language==='en'?'⚙ Settings':'⚙ 設定';
   panel.querySelector('h2').textContent=language==='en'?'Settings':'設定';
   panel.querySelector('.audio-settings-close').setAttribute('aria-label',language==='en'?'Close Settings':'設定を閉じる');
  };
  updateLanguage();
  document.addEventListener('click',event=>{if(event.target?.closest?.('.language-toggle'))setTimeout(updateLanguage,0)},true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
