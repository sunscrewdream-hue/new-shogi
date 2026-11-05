/* Shared game presentation lock: keep viewport and overlays stationary on mobile. */
(()=>{
 "use strict";
 const selectors=[
  "#cardOverlay.show","#incidentBanner.show","#turnNotice.show",
  "#compactCardOverlay:not(.hidden)","#compactIncidentStage:not(.hidden)",
  "#compactTurnNotice.show",".compact-game-fx.show",
  "#storyEndOverlay:not(.hidden)",
  "#compactIntroClash.show","#endOverlay.show"
 ];
 let locked=false,scrollY=0,previous=null;
 const active=()=>selectors.some(q=>!!document.querySelector(q));
 const blockTouch=e=>{if(locked&&e.cancelable)e.preventDefault()};
 const sync=()=>{
  const next=active();if(next===locked)return;
  if(next){
   scrollY=window.scrollY||document.documentElement.scrollTop||0;
   previous={htmlOverflow:document.documentElement.style.overflow,bodyOverflow:document.body.style.overflow,htmlOverscroll:document.documentElement.style.overscrollBehavior,bodyOverscroll:document.body.style.overscrollBehavior};
   document.documentElement.style.overflow="hidden";
   document.body.style.overflow="hidden";
   document.documentElement.style.overscrollBehavior="none";
   document.body.style.overscrollBehavior="none";
   document.documentElement.classList.add("game-effect-scroll-locked");
   document.body.classList.add("game-effect-scroll-locked");
   locked=true;
  }else{
   document.documentElement.style.overflow=previous?.htmlOverflow??"";
   document.body.style.overflow=previous?.bodyOverflow??"";
   document.documentElement.style.overscrollBehavior=previous?.htmlOverscroll??"";
   document.body.style.overscrollBehavior=previous?.bodyOverscroll??"";
   document.documentElement.classList.remove("game-effect-scroll-locked");
   document.body.classList.remove("game-effect-scroll-locked");
   locked=false;window.scrollTo(0,scrollY);
  }
 };
 const start=()=>{
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("touchmove",blockTouch,{passive:false});
  sync();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
