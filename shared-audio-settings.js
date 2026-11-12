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
 const mixer={
  defaults, get:kind=>values[kind]??0,
  ratio:kind=>(values[kind]??0)/100,
  set:(kind,value)=>{if(!(kind in defaults))return;values[kind]=clamp(value);try{localStorage.setItem(key,JSON.stringify(values))}catch{};for(const fn of listeners)fn({...values})},
  reset:()=>{values={...defaults};try{localStorage.setItem(key,JSON.stringify(values))}catch{};for(const fn of listeners)fn({...values})},
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
  // Same audio field order and same saved master-volume percentage in both modes.
  const order=languageOnly?[]:story?['audioToggle','storyVoiceToggle','storyFxToggle']:['bgmToggle','voiceToggle','sfxToggle'];
  for(const id of order){const control=body.querySelector('#'+id);if(control)body.append(control)}
  const slider=body.querySelector(story?'#storyVolume':'#volume');
  const sliderLabel=slider?.closest('label');if(sliderLabel)body.append(sliderLabel);
  const primary=new Set([...order,'volume','storyVolume']);
  const extras=[...body.children].filter(node=>!primary.has(node.id)&&node!==sliderLabel);
  extras.forEach(node=>body.append(node));
  // Keep the single translation control inside the Settings dialog on every page.
  const languageButton=document.querySelector('.language-toggle');
  if(languageButton)body.append(languageButton);
  document.body.append(panel);
  if(slider&&!languageOnly){
   const oldLabel=slider.closest('label');
   // Preserve the original range input so the game's BGM handlers stay wired.
   if(oldLabel){oldLabel.firstChild.textContent='BGM　';slider.style.width='100%'}
   slider.value=String(mixer.get('bgm'));
   slider.dispatchEvent(new Event('input',{bubbles:true}));
   slider.addEventListener('input',()=>mixer.set('bgm',slider.value));
   const group=document.createElement('div');
   group.className='audio-mixer';
   const rows={};
   const labelFor={fx:'効果音',voice:'音声'};
   for(const kind of ['fx','voice']){
    const row=document.createElement('label');row.className='audio-mixer-row';
    const title=document.createElement('span');title.textContent=labelFor[kind];
    const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.step='1';
    range.id='audioMix'+kind;range.value=String(mixer.get(kind));
    range.setAttribute('aria-label',labelFor[kind]+'の音量');
    const value=document.createElement('output');value.htmlFor=range.id;value.textContent=range.value+'%';
    range.addEventListener('input',()=>mixer.set(kind,range.value));
    row.append(title,range,value);group.append(row);rows[kind]={range,value};
   }
   const reset=document.createElement('button');reset.type='button';reset.className='audio-mixer-reset';
   reset.textContent='推奨音量にリセット';
   reset.onclick=()=>mixer.reset();
   group.append(reset);
   oldLabel?.after(group);
   const bgmOutput=oldLabel?.querySelector('output');
   const sync=next=>{
    slider.value=String(next.bgm);
    if(bgmOutput){bgmOutput.value=String(next.bgm);bgmOutput.textContent=String(next.bgm)}
    // Game audio subscribes to the mixer directly; re-dispatching input here
    // would recursively trigger mixer.set() through this range's listener.
    for(const kind of ['fx','voice']){rows[kind].range.value=String(next[kind]);rows[kind].value.textContent=next[kind]+'%'}
   };
   mixer.subscribe(sync);
  }
  const close=()=>panel.close();
  trigger.addEventListener('click',()=>{panel.showModal();trigger.setAttribute('aria-expanded','true');panel.querySelector('.audio-settings-close').focus()});
  panel.querySelector('.audio-settings-close').addEventListener('click',close);
  panel.addEventListener('click',event=>{if(event.target===panel)close()});
  panel.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus()});
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
