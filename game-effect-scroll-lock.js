/* Shared turn positioning and presentation lock for every battle size. */
window.ShinsengumiTurnPresentation=Object.freeze({
 place(board,panel,mode){
  if(!board||!panel)return;
  const rect=board.getBoundingClientRect();
  const viewportTop=window.visualViewport?.offsetTop||0;
  const viewportHeight=window.visualViewport?.height||window.innerHeight;
  const center=Math.round(rect.top+rect.height/2);
  if(mode==='offset')panel.style.setProperty('--turn-center-offset',center-(viewportTop+viewportHeight/2)+'px');
  else panel.style.setProperty('--finished-turn-board-y',center+'px');
  return center;
 }
});
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
 let locked=false;
 const active=()=>selectors.some(q=>!!document.querySelector(q));
 const inStoryBattle=()=>{
  const battle=document.getElementById("storyBattle");
  return !!battle&&!battle.classList.contains("hidden");
 };
 const blockScroll=e=>{if(locked&&e.cancelable)e.preventDefault()};
 const centerStoryBoard=()=>{
  const battle=document.getElementById("storyBattle");
  const storyVisible=!!battle&&!battle.classList.contains("hidden");
  const board=storyVisible?document.getElementById("storyBoard"):document.getElementById("board");
  if(!board||(!storyVisible&&board.getClientRects().length===0))return false;
  const rect=board.getBoundingClientRect();
  if(!rect.height)return false;
  const viewport=window.visualViewport?.height||window.innerHeight;
  // Never scroll to center an effect: that visibly jerks the normal match
  // when a figure enters or leaves the board. Offset overlays in place.
  document.documentElement.style.setProperty("--game-board-effect-offset",Math.round(rect.top+rect.height/2-viewport/2)+"px");
  return true;
 };
 const sync=()=>{
  const next=active();if(next===locked)return;
  const storyVisible=inStoryBattle();
  if(next){
   // Story opening already anchors the board. Never re-centre it on each
   // turn banner or card: that causes a visible jump after every move.
   // Do not toggle overflow: removing the scrollbar changes viewport width
   // and can shift the board even if scrollY is untouched.
   document.documentElement.classList.add("game-effect-scroll-locked");
   document.body.classList.add("game-effect-scroll-locked");
   locked=true;
   if(!storyVisible)requestAnimationFrame(centerStoryBoard);
  }else{
   document.documentElement.classList.remove("game-effect-scroll-locked");
   document.body.classList.remove("game-effect-scroll-locked");
   locked=false;
   // Story players retain their own viewport position throughout a match.
   // Keep normal completed-match centering unchanged.
   if(!storyVisible)centerStoryBoard();
  }
 };
 const start=()=>{
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("touchmove",blockScroll,{passive:false});
  document.addEventListener("wheel",blockScroll,{passive:false});
  sync();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
