/* Story victories unlock battlefield themes for the finished 9x9 match.
   Do not turn a 5x6 story board into an illegal 9x9 playing grid. */
(function(){
 'use strict';
 const progressKey='shinsengumi-story-progress-v2';
 const battlefields=[
  {id:'classic',name:'京都・通常盤',hint:'いつでも対戦可能',required:0},
  {id:'ikedaya',name:'池田屋',hint:'第一章で勝利すると解放',required:1},
  {id:'kinmon',name:'禁門の変',hint:'第二章で勝利すると解放',required:2},
  {id:'aburanokoji',name:'油小路',hint:'第三章で勝利すると解放',required:3},
  {id:'tobafushimi',name:'鳥羽・伏見',hint:'第四章で勝利すると解放',required:4}
 ];
 const title=document.getElementById('titleScreen');
 const match=document.getElementById('board');
 const anchor=document.getElementById('titleModeActions');
 if(!title||!match||!anchor)return;
 let selected='classic';
 const testAvailable=new URLSearchParams(location.search).has('previewAll');
 let testAllStages=false;
 const panel=document.createElement('section');panel.id='storyUnlockPicker';
 panel.setAttribute('aria-label','通常対戦の戦場を選択');
 panel.innerHTML='<h2>対戦する戦場 <small>物語で勝利すると解放</small></h2><div id="storyUnlockChoices" role="group" aria-label="戦場一覧"></div><p id="storyUnlockExplanation">未解放の戦場は物語の各章で勝利すると選べます。</p>';
 // Both choices share one layout center; no viewport-specific offset calculations.
 const group=document.createElement('div');
 group.id='battlefieldModeGroup';
 group.style.cssText='display:flex;flex-direction:column;align-items:center;width:min(95vw,520px);min-width:0;position:relative;left:50%;transform:translateX(-50%)';
 anchor.before(group);
 group.append(panel,anchor);
 if(testAvailable){
  const testButton=document.createElement('button');
  testButton.type='button';testButton.id='twoPlayerDevStages';
  testButton.textContent='🛠 開発テスト：全ステージを試す';
  testButton.setAttribute('aria-pressed','false');
  testButton.addEventListener('click',()=>{
   testAllStages=!testAllStages;
   testButton.textContent=testAllStages?'🛠 開発テスト終了（通常の解放条件）':'🛠 開発テスト：全ステージを試す';
   testButton.setAttribute('aria-pressed',String(testAllStages));render();
  });
  panel.append(testButton);
 }
 // The battlefield is a local two-player choice, not an AI difficulty setting.
 const syncModeVisibility=()=>{panel.hidden=!document.getElementById('modeLocal')?.classList.contains('selected')};
 document.getElementById('modeAi')?.addEventListener('click',syncModeVisibility);
 document.getElementById('modeLocal')?.addEventListener('click',syncModeVisibility);
 syncModeVisibility();
 const choices=panel.querySelector('#storyUnlockChoices');
 const explanation=panel.querySelector('#storyUnlockExplanation');
 const cleared=()=>{try{return Math.max(0,Math.min(4,Number(localStorage.getItem(progressKey))||0))}catch(e){return 0}};
 const cssAssets={
  ikedaya:'assets/backgrounds/story/ikedaya-bg-v2.webp',
  kinmon:'assets/backgrounds/story/kinmon-bg-v2.webp',
  aburanokoji:'assets/backgrounds/story/aburanokoji-bg-v2.webp',
  tobafushimi:'assets/backgrounds/story/tobafushimi-bg-v2.webp'
 };
 function updateAppearance(){
  match.setAttribute('data-unlocked-field',selected);
  document.body.setAttribute('data-unlocked-field',selected);
  // Keep the 9x9 board, cell hit targets and piece geometry completely unchanged.
  // The two 9x9 chapter grounds were specifically designed for these coordinates.
  const boardImages={
   kinmon:'url("assets/boards/story/board-kinmon-ground-v2.webp")',
   tobafushimi:'url("assets/boards/story/board-tobafushimi-ground-v2.webp")'
  };
  match.style.backgroundImage=boardImages[selected]||'';
  // The 5x6 story chapters supply scenery only, not a stretched 5x6 chessboard.
  if(selected==='ikedaya'||selected==='aburanokoji')match.style.backgroundImage='';
  const art=cssAssets[selected];
  document.body.style.setProperty('--unlocked-scene',art?'url("'+art+'")':'none');
 }
 function render(){
  const wins=cleared();
  if(!testAllStages&&battlefields.find(f=>f.id===selected)?.required>wins)selected='classic';
  choices.replaceChildren();
  for(const field of battlefields){
   const allowed=testAllStages||wins>=field.required;
   const button=document.createElement('button');button.type='button';
   button.className='story-unlock-choice'+(field.id===selected?' selected':'')+(allowed?' stage-available':' stage-locked');
   button.disabled=!allowed;button.setAttribute('aria-pressed',String(field.id===selected));
   // Locked fields contain only a key: never render their decorative scroll or chapter name.
   // Keep the name and unlock requirement available to assistive technology.
   button.textContent=allowed?field.name:'🔒';
   button.setAttribute('aria-label',allowed?field.name+'・選択可能':field.name+'・未解放。'+field.hint);
   button.title=allowed?'この戦場を選ぶ':field.hint;
   button.addEventListener('click',()=>{
    if(!allowed)return;
    selected=field.id;updateAppearance();render();
   });
   choices.append(button);
  }
  const current=battlefields.find(f=>f.id===selected);
  explanation.textContent=testAllStages?'開発テスト中：全ステージを試せます。攻略記録は変更しません。':current.id==='classic'
   ?'未解放の戦場は物語の各章で勝利すると選べます。'
   :current.name+'の戦場を選択中。いざ、出陣で専用盤面の二人対戦を開始します。';
  updateAppearance();
 }
  render();
  // Actual historical battleboards run in the shared StoryEngine, never in the
  // regular 9x9 engine.  Stop the inline startGame() handler for these fields.
  const sortie=document.getElementById('startGame');
  sortie?.addEventListener('click',event=>{
   if(!document.getElementById('modeLocal')?.classList.contains('selected')||selected==='classic')return;
   const field=battlefields.find(item=>item.id===selected);
   if(!field||(!testAllStages&&cleared()<field.required))return;
   event.preventDefault();event.stopImmediatePropagation();
   // Match the ordinary match: the actual user click starts its approved
   // 「いざ出陣」 voice and BGM before the cross-page navigation. Waiting until
   // the destination loads loses gesture activation on mobile Safari.
   if(sortie.dataset.twoPlayerLaunching==='1')return;
   sortie.dataset.twoPlayerLaunching='1';
   sortie.disabled=true;
   try{sessionStorage.setItem('shinsengumi-two-player-sortie-cue','1')}catch(e){}
   const destination='story-mode.html?twoPlayer='+encodeURIComponent(field.id)+(testAllStages?'&previewAll=1':'');
   let navigated=false;
   const depart=()=>{if(navigated)return;navigated=true;window.location.assign(destination)};
   const cue=typeof sortieVoiceAudio!=='undefined'?sortieVoiceAudio:null;
   if(typeof playSortieVoice==='function'&&voiceEnabled!==false){
    // The same mastered recording and 0.65 voice mix as the 9×9 sortie.
    const started=playSortieVoice();
    cue?.addEventListener('ended',depart,{once:true});
    cue?.addEventListener('error',depart,{once:true});
    if(started?.catch)started.catch(()=>{try{sessionStorage.removeItem('shinsengumi-two-player-sortie-cue')}catch(e){};setTimeout(depart,120)});
    setTimeout(depart,3400); // Never trap launch when Safari omits ended.
   }else depart();
  },true);
 // Pages restored from browser history must show the latest story victory.
 window.addEventListener('pageshow',()=>{if(sortie){sortie.dataset.twoPlayerLaunching='';sortie.disabled=false;}render();syncModeVisibility()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 if(typeof window.returnToTitle==='function'){
  const original=window.returnToTitle;
  window.returnToTitle=function(...args){const result=original.apply(this,args);render();syncModeVisibility();return result};
 }
})();
