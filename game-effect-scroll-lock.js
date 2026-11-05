/* Shared battle presentation scroll lock for the finished match and story chapters. */
(()=>{
 "use strict";
 const selectors=[
  "#cardOverlay.show","#incidentBanner.show","#endOverlay.show",
  "#compactCardOverlay:not(.hidden)","#compactIncidentStage:not(.hidden)",
  "#storyEndOverlay:not(.hidden)","#compactIntroClash.show",
  "#cardOverlay:not(.hidden).show"
 ];
 let locked=false,scrollY=0;
 const active=()=>selectors.some(selector=>document.querySelector(selector));
 const sync=()=>{
  const shouldLock=active();if(shouldLock===locked)return;
  if(shouldLock){
   scrollY=window.scrollY||document.documentElement.scrollTop||0;
   document.documentElement.classList.add("game-effect-scroll-locked");
   document.body.classList.add("game-effect-scroll-locked");
   document.body.style.position="fixed";
   document.body.style.top=-scrollY+"px";
   document.body.style.left="0";
   document.body.style.right="0";
   document.body.style.width="100%";
   locked=true;
  }else{
   document.documentElement.classList.remove("game-effect-scroll-locked");
   document.body.classList.remove("game-effect-scroll-locked");
   for(const key of ["position","top","left","right","width"])document.body.style[key]="";
   locked=false;window.scrollTo(0,scrollY);
  }
 };
 const observer=new MutationObserver(sync);
 const start=()=>{
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  sync();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
