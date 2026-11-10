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
 const panel=document.createElement('section');panel.id='storyUnlockPicker';
 panel.setAttribute('aria-label','通常対戦の戦場を選択');
 panel.innerHTML='<h2>対戦する戦場 <small>物語で勝利すると解放</small></h2><div id="storyUnlockChoices" role="group" aria-label="戦場一覧"></div><p id="storyUnlockExplanation">通常盤で対局できます。物語の戦場は各章の勝利後に解放されます。</p>';
 // Both choices share one layout center; no viewport-specific offset calculations.
 const group=document.createElement('div');
 group.id='battlefieldModeGroup';
 group.style.cssText='display:flex;flex-direction:column;align-items:center;width:min(95vw,520px);min-width:0;position:relative;left:50%;transform:translateX(-50%)';
 anchor.before(group);
 group.append(panel,anchor);
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
  if(battlefields.find(f=>f.id===selected)?.required>wins)selected='classic';
  choices.replaceChildren();
  for(const field of battlefields){
   const allowed=wins>=field.required;
   const button=document.createElement('button');button.type='button';
   button.className='story-unlock-choice'+(field.id===selected?' selected':'');
   button.disabled=!allowed;button.setAttribute('aria-pressed',String(field.id===selected));
   button.textContent=field.name;
   button.title=allowed?'この戦場を選ぶ':field.hint;
   button.addEventListener('click',()=>{
    if(!allowed)return;
    selected=field.id;updateAppearance();render();
   });
   choices.append(button);
  }
  const current=battlefields.find(f=>f.id===selected);
  explanation.textContent=current.id==='classic'
   ?'完成版の通常盤で対戦します。未解放の戦場は物語で勝利すると選べます。'
   :current.name+'の戦場を選択中。通常対戦の9×9ルールと駒配置は維持します。';
  updateAppearance();
 }
 render();
 // Pages restored from browser history must show the latest story victory.
 window.addEventListener('pageshow',()=>{render();syncModeVisibility()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 if(typeof window.returnToTitle==='function'){
  const original=window.returnToTitle;
  window.returnToTitle=function(...args){const result=original.apply(this,args);render();syncModeVisibility();return result};
 }
})();
