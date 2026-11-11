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
 const currentBoard=()=>{
  const battle=document.getElementById("storyBattle");
  const storyVisible=!!battle&&!battle.classList.contains("hidden");
  const board=document.getElementById(storyVisible?"storyBoard":"board");
  return board&&board.getClientRects().length?board:null;
 };
 let anchorY=0,repositioning=false;
 const updateOverlayPosition=()=>{
  const board=currentBoard();
  if(!board)return;
  const rect=board.getBoundingClientRect();
  const viewportTop=window.visualViewport?.offsetTop||0;
  const viewportHeight=window.visualViewport?.height||window.innerHeight;
  const offset=Math.round(rect.top+rect.height/2-(viewportTop+viewportHeight/2));
  document.documentElement.style.setProperty("--game-board-effect-offset",offset+"px");
  window.ShinsengumiTurnPresentation?.place(board,document.getElementById("turnNotice"),"absolute");
  window.ShinsengumiTurnPresentation?.place(board,document.getElementById("compactTurnNotice"),"offset");
 };
 const centerBoardAndHold=()=>{
  const board=currentBoard();if(!board)return;
  const rect=board.getBoundingClientRect();if(!rect.height)return;
  const viewportHeight=window.visualViewport?.height||window.innerHeight;
  const viewportTop=window.visualViewport?.offsetTop||0;
  anchorY=Math.max(0,Math.round(window.scrollY+rect.top+rect.height/2-(viewportHeight/2+viewportTop)));
  repositioning=true;
  window.scrollTo({top:anchorY,left:0,behavior:"instant"});
  requestAnimationFrame(()=>{updateOverlayPosition();requestAnimationFrame(()=>{updateOverlayPosition();repositioning=false})});
 };
 const sync=()=>{
  const next=active();if(next===locked)return;
  if(next){
   document.documentElement.classList.add("game-effect-scroll-locked");
   document.body.classList.add("game-effect-scroll-locked");
   locked=true;
   // One controlled jump on entering an effect, then hold the board centered.
   centerBoardAndHold();
  }else{
   document.documentElement.classList.remove("game-effect-scroll-locked");
   document.body.classList.remove("game-effect-scroll-locked");
   locked=false;
   updateOverlayPosition();
  }
 };
 const holdScroll=()=>{
  if(!locked||repositioning||Math.abs(window.scrollY-anchorY)<2)return;
  window.scrollTo({top:anchorY,left:0,behavior:"instant"});
 };
 const blockKeys=e=>{
  if(!locked)return;
  if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(e.key)&&!e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))e.preventDefault();
 };
 const start=()=>{
  new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("touchmove",blockScroll,{passive:false});
  document.addEventListener("wheel",blockScroll,{passive:false});
  document.addEventListener("keydown",blockKeys,{passive:false});
  window.addEventListener("scroll",holdScroll,{passive:true});
  sync();
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
