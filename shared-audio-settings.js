/* One presentation for audio preferences in regular and story matches.
   Existing buttons and handlers are moved, not recreated. */
(()=>{
 'use strict';
 function initialize(){
  const story=document.getElementById('storyVolume');
  const normal=document.getElementById('sfxToggle');
  if(!story&&!normal)return;
  document.querySelector('.game-menu-link[href="rules.html"]')?.remove();
  const panel=document.createElement('dialog');
  panel.className='audio-settings-panel';
  panel.setAttribute('aria-label','音声設定');
  panel.innerHTML='<div class="audio-settings-head"><h2>設定</h2><button class="audio-settings-close" type="button" aria-label="設定を閉じる">×</button></div><div class="audio-settings-body"></div>';
  const body=panel.querySelector('.audio-settings-body');
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='audio-settings-trigger';
  trigger.textContent='⚙ 設定';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  if(story){
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
  document.body.append(panel);
  const close=()=>panel.close();
  trigger.addEventListener('click',()=>{panel.showModal();trigger.setAttribute('aria-expanded','true');panel.querySelector('.audio-settings-close').focus()});
  panel.querySelector('.audio-settings-close').addEventListener('click',close);
  panel.addEventListener('click',event=>{if(event.target===panel)close()});
  panel.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus()});
  // Keep the label bilingual without affecting any original game audio handler.
  const updateLanguage=()=>{
   let language='ja';try{language=localStorage.getItem('shinsengumi-shogi-language-v1')||'ja'}catch{}
   trigger.textContent=language==='en'?'⚙ Settings':'⚙ 設定';
   panel.querySelector('h2').textContent=language==='en'?'Audio Settings':'設定';
   panel.querySelector('.audio-settings-close').setAttribute('aria-label',language==='en'?'Close Settings':'設定を閉じる');
  };
  updateLanguage();
  document.addEventListener('click',event=>{if(event.target?.closest?.('.language-toggle'))setTimeout(updateLanguage,0)},true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
