/* One presentation for audio preferences in regular and story matches.
   Existing buttons and handlers are moved, not recreated. */
(()=>{
 'use strict';
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
    ...document.querySelectorAll('button[onclick^="previewVoiceClips"]'),
    document.getElementById('audioStatus'),document.getElementById('bgmStatus')
   ];
   for(const control of controls){if(control){if(control.id==='audioStatus'||control.id==='bgmStatus')control.classList.add('audio-settings-status');body.append(control)}}
  }
  // Shared control layout: preserve each mode's original click handlers.
  const actionTop=document.createElement('div');
  if(languageOnly){
   // Collection has no match controls; keep its existing page layout.
  }else if(story){
   document.querySelector('.story-header')?.classList.add('shared-match-header');
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
  const volumeKey='shinsengumi-shogi-master-volume-v1';
  if(slider){
   let saved=35;
   try{const raw=localStorage.getItem(volumeKey);if(raw!==null&&Number.isFinite(Number(raw)))saved=Math.max(0,Math.min(100,Number(raw)))}catch{}
   slider.value=String(saved);slider.dispatchEvent(new Event('input',{bubbles:true}));
   slider.addEventListener('input',()=>{try{localStorage.setItem(volumeKey,slider.value)}catch{}});
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
