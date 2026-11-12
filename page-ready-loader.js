/* Shared, nonblocking first-viewport image readiness for informational pages.
   Gameplay has its own chapter/start gate in startup-preloader.js. */
(()=>{
 'use strict';
 function init(){
  if(document.getElementById('startupPreload'))return;
  const candidates=[...document.images].filter(img=>{
   if(img.loading==='lazy'||img.complete&&img.naturalWidth>0)return false;
   const rect=img.getBoundingClientRect();
   return rect.top<innerHeight+150&&rect.bottom>=-100;
  }).slice(0,12);
  if(!candidates.length)return;
  let finished=false,layer=null;
  const show=setTimeout(()=>{
   if(finished)return;
   layer=document.createElement('div');
   layer.id='pageReadyOverlay';
   layer.setAttribute('role','status');
   layer.setAttribute('aria-live','polite');
   layer.textContent='画面を準備しています…';
   Object.assign(layer.style,{position:'fixed',inset:'0',display:'grid',placeItems:'center',background:'#14242df2',color:'#f6e8ce',fontSize:'18px',fontWeight:'700',zIndex:'2147482000',fontFamily:'serif'});
   document.body.append(layer);
  },180);
  const done=()=>{
   if(finished)return;finished=true;clearTimeout(show);layer?.remove();
  };
  const jobs=candidates.map(img=>new Promise(resolve=>{
   let settled=false;
   const finish=()=>{if(settled)return;settled=true;img.removeEventListener('load',finish);img.removeEventListener('error',finish);resolve()};
   img.addEventListener('load',finish,{once:true});
   img.addEventListener('error',finish,{once:true});
   if(img.complete)finish();
  }));
  Promise.race([Promise.all(jobs),new Promise(resolve=>setTimeout(resolve,5000))]).then(done,done);
  window.addEventListener('pageshow',event=>{if(event.persisted)done()},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
