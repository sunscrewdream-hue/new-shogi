/* Shared game presentation lock: keep viewport and overlays stationary on mobile. */
(()=>{
 "use strict";
 const selectors=[
  "body.story-opening-viewport-lock",
  "#cardOverlay.show","#incidentBanner.show","#turnNotice.show","#turnNotice.on",
  "#promotionOverlay.show","#hitokiriNotice.show",
  "#compactCardOverlay:not(.hidden)","#compactIncidentStage:not(.hidden)",
  "#compactTurnNotice.show",".compact-game-fx.show",
  "#storyPopup:not(.hidden)","#compactAwakenNotice.show",
  "body.story-quake-active","#storyEndOverlay:not(.hidden)",
  "#compactIntroClash.show","#endOverlay.show"
 ];
 let locked=false,scrollY=0,previous=null;
 const active=()=>selectors.some(q=>!!document.querySelector(q));
 const inStoryBattle=()=>{
  const battle=document.getElementById("storyBattle");
  return !!battle&&!battle.classList.contains("hidden");
 };
 const blockTouch=e=>{if(locked&&e.cancelable)e.preventDefault()};
 const centerStoryBoard=()=>{
  const battle=document.getElementById("storyBattle");
  const storyVisible=!!battle&&!battle.classList.contains("hidden");
  const board=storyVisible?document.getElementById("storyBoard"):document.getElementById("board");
  if(!board||(!storyVisible&&board.getClientRects().length===0))return false;
  const rect=board.getBoundingClientRect();
  if(!rect.height)return false;
  const viewport=window.visualViewport?.height||window.innerHeight;
  const target=Math.max(0,Math.round(window.scrollY+rect.top+rect.height/2-viewport/2));
  window.scrollTo({top:target,left:0,behavior:"instant"});
  if(!storyVisible)board.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
  const updated=board.getBoundingClientRect();
  document.documentElement.style.setProperty("--game-board-effect-offset",Math.round(updated.top+updated.height/2-viewport/2)+"px");
  requestAnimationFrame(()=>{const b=board.getBoundingClientRect();document.documentElement.style.setProperty("--game-board-effect-offset",Math.round(b.top+b.height/2-(window.visualViewport?.height||window.innerHeight)/2)+"px")});
  return true;
 };
 const sync=()=>{
  const next=active();if(next===locked)return;
  const storyVisible=inStoryBattle();
  if(next){
   scrollY=window.scrollY||document.documentElement.scrollTop||0;
   // Story opening already anchors the board. Never re-centre it on each
   // turn banner or card: that causes a visible jump after every move.
   previous={htmlOverflow:document.documentElement.style.overflow,bodyOverflow:document.body.style.overflow,htmlOverscroll:document.documentElement.style.overscrollBehavior,bodyOverscroll:document.body.style.overscrollBehavior};
   document.documentElement.style.overflow="hidden";
   document.body.style.overflow="hidden";
   document.documentElement.style.overscrollBehavior="none";
   document.body.style.overscrollBehavior="none";
   document.documentElement.classList.add("game-effect-scroll-locked");
   document.body.classList.add("game-effect-scroll-locked");
   locked=true;
   if(!storyVisible)requestAnimationFrame(centerStoryBoard);
  }else{
   document.documentElement.style.overflow=previous?.htmlOverflow??"";
   document.body.style.overflow=previous?.bodyOverflow??"";
   document.documentElement.style.overscrollBehavior=previous?.htmlOverscroll??"";
   document.body.style.overscrollBehavior=previous?.bodyOverscroll??"";
   document.documentElement.classList.remove("game-effect-scroll-locked");
   document.body.classList.remove("game-effect-scroll-locked");
   locked=false;
   // Story players retain their own viewport position throughout a match.
   // Keep normal completed-match centering unchanged.
   if(!storyVisible&&!centerStoryBoard())window.scrollTo(0,scrollY);
  }
 };
 const start=()=>{
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("touchmove",blockTouch,{passive:false});
  sync();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
