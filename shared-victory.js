/* The same victory portrait compositor is used by normal and story games. */
(function(global){
 'use strict';
 const allowed=new Set(['kondo','miyabe','kusaka','ito','saigo']);
 function portrait(name,role){
  if(!allowed.has(name))throw new Error('Unknown victory character: '+name);
  return 'assets/characters/victory/'+name+'_'+role+'.webp';
 }
 function preload(url){
  return new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error('Victory image missing: '+url));img.src=url;});
 }
 function show({overlay,winnerElement,loserElement,winnerId,loserId,winnerName,loserName,onCross}){
  const token=String((Number(overlay.dataset.victorySequence)||0)+1);
  overlay.dataset.victorySequence=token;
  overlay.classList.remove('composite-victory','victory-image-error');
  const winnerUrl=portrait(winnerId,'winner'),loserUrl=portrait(loserId,'loser');
  winnerElement.alt=winnerName+'の勝利';loserElement.alt=loserName+'の敗北';
  winnerElement.removeAttribute('src');loserElement.removeAttribute('src');
  // Never fall back to withdrawn, pre-composited result scenes.
  return Promise.all([preload(winnerUrl),preload(loserUrl)]).then(()=>{
   if(overlay.dataset.victorySequence!==token)return false;
   winnerElement.src=winnerUrl;loserElement.src=loserUrl;
   overlay.classList.add('composite-victory');
   // Trigger at the first visible overlap, accounting for the eased entrance.
   if(typeof onCross==='function')setTimeout(()=>{
    if(overlay.dataset.victorySequence===token&&overlay.classList.contains('composite-victory')&&getComputedStyle(overlay).display!=='none')onCross();
   },1440);
   return true;
  }).catch(error=>{
   if(overlay.dataset.victorySequence===token)overlay.classList.add('victory-image-error');
   console.error(error);return false;
  });
 }
 global.SharedVictory={show,portrait};
})(window);
