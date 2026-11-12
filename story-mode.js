(function(){
"use strict";
const $=id=>document.getElementById(id),D=window.StoryData;
const SAVE="shinsengumi-story-progress-v2",KINGS="shinsengumi-story-kings-v1",COL="shinsengumi-shogi-collection-v1";
const localFieldToStage={ikedaya:0,kinmon:1,aburanokoji:2,tobafushimi:3};
const localRequested=new URLSearchParams(window.location.search).get('twoPlayer');
const localTwoPlayer=Object.prototype.hasOwnProperty.call(localFieldToStage,localRequested);
const localStage=localTwoPlayer?localFieldToStage[localRequested]:-1;
const localSide=()=>localTwoPlayer&&g?g.side:0;
function localExit(){window.location.assign('card-ai-test.html')}

let unlock=0;try{unlock=Math.max(0,Math.min(4,Number(localStorage.getItem(SAVE))||0))}catch(e){}
let stage=-1,dialog=[],at=0,onEnd=null,g=null,selected=null,busy=false,ended=false,epoch=0,weapons=[],pendingWeaponDisplay=null,soundOff=false,voiceEnabled=true,fxEnabled=true,devPreview=false,debugModified=false,compactTurnLocked=false,compactFxSerial=0,compactCaptures={},compactArrival=null,promotionRise=null,promotionCapturePreview=null,promotionVisualHold=null,deferredCheckVisualEpoch=-1,compactIncident=null,compactIncidentEffect=null,compactIncidentMarks=[],compactQuakeMove=null,compactQuakeLanding=null,compactQuakeCracks=[],compactClosingHoles=[],compactHoleFading=false,compactBloodMarks=[],debugAwakenKey=null,oilAmbushAnimating=false,ikedayaReinforcing=false,ikedayaPendingPositions=new Set(),kinmonSatsumaReinforcing=false,kinmonSatsumaPendingPositions=new Set();
let storyVolume=10;try{const saved=localStorage.getItem("shinsengumi-story-volume-v1");if(saved!==null)storyVolume=Math.max(0,Math.min(100,Number(saved)||0))}catch(e){}
const voiceLevel=()=>Math.min(.75,(window.ShinsengumiAudioMixer?.ratio('voice')??storyVolume/100)*.75);
// Match finished match's SFX gain (.021 per slider point; capped at .5).
const fxLevel=()=>Math.min(.5,(window.ShinsengumiAudioMixer?.ratio('fx')??storyVolume/100)*.50);
const storyClipCache=new Map();let activeStoryVoice=null,activeStoryFx=null,activeStoryVoiceBoost=1;
const sortieGainBoost=13/15; // .75 * 13/15 == the approved 9×9 0.65 voice gain.
// Enemy moves run from timers, outside a touch gesture. A gesture-unlocked
// Web Audio voice channel keeps capture and check shouts playable on iOS.
let battleVoiceContext=null,battleVoiceActive=null,battleImpactActive=null,battleVoiceGain=null,battleImpactGain=null,battleVoiceBoost=1,battleImpactBoost=1;
const battleVoiceBuffers=new Map(),battleVoiceLoading=new Map();
function unlockBattleVoice(){
 if(!battleVoiceContext){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return null;battleVoiceContext=new AudioContextClass()}
 if(battleVoiceContext.state==="suspended")battleVoiceContext.resume().catch(()=>{});
 return battleVoiceContext;
}
document.addEventListener("pointerdown",unlockBattleVoice,{passive:true});
document.addEventListener("touchstart",unlockBattleVoice,{passive:true});
function playGestureAudio(path,onDone,channel="voice",gainBoost=1,isStillValid=null){
 if((channel==="voice"?!voiceEnabled:!fxEnabled)||document.hidden){onDone?.();return}
 const context=unlockBattleVoice();if(!context){playStoryClip(path,channel,onDone);return}
 let loading=battleVoiceBuffers.get(path);
 if(!loading){
  loading=battleVoiceLoading.get(path);
  if(!loading){loading=fetch(path).then(response=>{if(!response.ok)throw Error("voice HTTP "+response.status);return response.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{battleVoiceBuffers.set(path,buffer);battleVoiceLoading.delete(path);return buffer}).catch(error=>{battleVoiceLoading.delete(path);throw error});battleVoiceLoading.set(path,loading)}
 }
 let settled=false;const watchdog=setTimeout(()=>{console.warn("音声演出タイムアウト",path);finish()},5500);
 const finish=()=>{if(settled)return;settled=true;clearTimeout(watchdog);onDone?.()};
 Promise.race([Promise.resolve(loading),new Promise((_,reject)=>setTimeout(()=>reject(Error("Voice loading timeout")),2500))]).then(buffer=>{
  if((channel==="voice"?!voiceEnabled:!fxEnabled)||document.hidden||(isStillValid&&!isStillValid())){finish();return}
  stopStoryClip(channel);
  const previous=channel==="voice"?battleVoiceActive:battleImpactActive;
  if(previous){try{previous.stop()}catch(e){}}
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=Math.min(1,(channel==="voice"?voiceLevel():fxLevel())*gainBoost);source.connect(gain).connect(context.destination);
  if(channel==="voice"){battleVoiceActive=source;battleVoiceGain=gain;battleVoiceBoost=gainBoost}else{battleImpactActive=source;battleImpactGain=gain;battleImpactBoost=gainBoost}
  source.onended=()=>{if(battleVoiceActive===source){battleVoiceActive=null;battleVoiceGain=null}if(battleImpactActive===source){battleImpactActive=null;battleImpactGain=null}finish()};
  Promise.race([context.resume(),new Promise((_,reject)=>setTimeout(()=>reject(Error("AudioContext resume timeout")),1400))]).then(()=>{if(settled)return;if(isStillValid&&!isStillValid()){finish();return}source.start()}).catch(()=>{if(settled)return;if(isStillValid&&!isStillValid()){finish();return}playStoryClip(path,channel,finish)});
 }).catch(()=>playStoryClip(path,channel,finish));
}
function playBattleShout(path,onDone){playGestureAudio(path,onDone,"voice")}
function playStorySortieVoice(){if(!voiceEnabled)return;return playStoryClip("assets/audio/voice_iza_shutsujin.mp3","voice",null,sortieGainBoost)}
// Cannon impact needs its own channel: shot, hit cry and other FX must not
// interrupt the explosion halfway through.
const cannonImpactAudio=new Audio("assets/audio/story/master_explosion.mp3");
cannonImpactAudio.preload="auto";cannonImpactAudio.playsInline=true;
function playCannonImpact(){
 if(!fxEnabled||document.hidden||fxLevel()<=0)return;
 cannonImpactAudio.pause();cannonImpactAudio.currentTime=0;
 cannonImpactAudio.volume=Math.min(.75,(window.ShinsengumiAudioMixer?.ratio('fx')??storyVolume/100)*.75);
 cannonImpactAudio.play().catch(error=>console.warn("砲弾着弾音を再生できません",error));
}
const storyQuakeBattle=new Audio("assets/audio/sfx/battle_charge_mono_64kbps.mp3");let quakeBattleRuns=0;
storyQuakeBattle.preload="auto";storyQuakeBattle.playsInline=true;
function stopStoryQuakeBattle(){storyQuakeBattle.pause();storyQuakeBattle.currentTime=0;quakeBattleRuns=0}
storyQuakeBattle.addEventListener("ended",()=>{if(quakeBattleRuns!==1||!fxEnabled||document.hidden)return;quakeBattleRuns=2;storyQuakeBattle.currentTime=0;storyQuakeBattle.play().catch(()=>{})});
function playStoryQuakeBattle(){if(!fxEnabled||document.hidden)return;stopStoryQuakeBattle();quakeBattleRuns=1;storyQuakeBattle.volume=Math.min(.5,(window.ShinsengumiAudioMixer?.ratio('fx')??storyVolume/100)*.50);storyQuakeBattle.play().catch(()=>{})}
function stopStoryClip(channel){
 const a=channel==="voice"?activeStoryVoice:activeStoryFx;if(a){a.pause();a.currentTime=0}
 if(channel==="voice"){
  activeStoryVoice=null;
  if(battleVoiceActive){try{battleVoiceActive.stop()}catch(e){}battleVoiceActive=null;battleVoiceGain=null}
 }else{
  activeStoryFx=null;
  if(battleImpactActive){try{battleImpactActive.stop()}catch(e){}battleImpactActive=null;battleImpactGain=null}
 }
}
function playStoryClip(path,channel="fx",onDone=null,gainBoost=1){
 if(!path){onDone?.();return null}
 if(channel==="voice"?!voiceEnabled:!fxEnabled){onDone?.();return null}
 if(document.hidden){onDone?.();return null}
 let a=storyClipCache.get(path);if(!a){a=new Audio(path);a.preload=channel==="voice"?"auto":"none";a.playsInline=true;storyClipCache.set(path,a);
  window.ShinsengumiAudioMixer?.registerMedia?.(a,channel==="voice"?"voice":"fx",channel==="voice" ? .75 : .50)
 }
 stopStoryClip(channel);a.currentTime=0;if(channel==="voice")activeStoryVoiceBoost=gainBoost;a.volume=Math.min(1,(channel==="voice"?voiceLevel():fxLevel())*gainBoost);
 if(channel==="voice")activeStoryVoice=a;else activeStoryFx=a;
 let settled=false,watchdog=null;const finish=()=>{if(settled)return;settled=true;if(watchdog!==null)clearTimeout(watchdog);a.removeEventListener("ended",finish);a.removeEventListener("error",finish);a.removeEventListener("pause",finish);onDone?.()};
 if(onDone){a.addEventListener("ended",finish);a.addEventListener("error",finish);a.addEventListener("pause",finish);watchdog=setTimeout(()=>{console.warn("音声終了通知タイムアウト",path);finish()},9000)}
 a.play().catch(finish);return a;
}
const promotionRiseSound=new Audio('assets/audio/story/promotion_rise_shakiin_20261109.mp3');
promotionRiseSound.preload='auto';promotionRiseSound.playsInline=true;
function playPromotionRise(){
 if(!fxEnabled||document.hidden)return Promise.resolve();
 return new Promise(resolve=>{
  let finished=false,watchdog;
  const finish=()=>{
   if(finished)return;
   finished=true;clearTimeout(watchdog);
   promotionRiseSound.removeEventListener('ended',finish);
   promotionRiseSound.removeEventListener('error',finish);
   resolve();
  };
  try{
   promotionRiseSound.pause();
   promotionRiseSound.currentTime=0;
   promotionRiseSound.volume=fxLevel();
   promotionRiseSound.addEventListener('ended',finish,{once:true});
   promotionRiseSound.addEventListener('error',finish,{once:true});
   watchdog=setTimeout(finish,2400);
   const playback=promotionRiseSound.play();
   if(playback?.catch)playback.catch(finish);
  }catch(error){console.warn('池田屋・成り演出音声',error);finish();}
 });
}
const kabukiVoice={promotion:"assets/audio/story/master_kabuki_promotion_v1.mp3",cannon:"assets/audio/story/master_kabuki_cannon_v1.mp3",rifle:"assets/audio/story/master_kabuki_rifle_v1.mp3",awakening:"assets/audio/story/master_kabuki_awakening_v1.mp3",kill:"assets/audio/story/master_kabuki_kill_v1.mp3"};
function playKabukiVoice(kind){return new Promise(resolve=>{
 const path=kabukiVoice[kind];if(!path)return resolve();
 playStoryClip(path,"voice",resolve);
})}
function playCasualtyCry(){return new Promise(resolve=>{
 // Dedicated 「ぎゃあ！」 from the user's three-line 2026-11-05 recording.
 // Hold the sequence until this shout actually finishes.
 let settled=false;const done=()=>{if(settled)return;settled=true;resolve()};
 playBattleShout("assets/audio/story/master_battle_gyah_v1.mp3",done);
 setTimeout(done,3400);
})}
const later=ms=>new Promise(r=>setTimeout(r,ms));
// Character art gets the same minimum on-screen time in ordinary moves and
// scripted reinforcements; never truncate a spoken line to advance the turn.
const storyBannerMinimumMs=2300,storyBannerVoiceLimitMs=15000,storyBannerVoicePollMs=160;
async function waitStoryReinforcementBanner(game){
 const shownAt=Date.now();
 await later(storyBannerMinimumMs);
 while(game===epoch&&!ended&&Date.now()-shownAt<storyBannerVoiceLimitMs){
  const voice=activeStoryVoice;
  if(!((voice&&!voice.paused&&!voice.ended)||battleVoiceActive))break;
  await later(storyBannerVoicePollMs);
 }
}
// Never leave battle input locked if mobile Safari omits an audio-ended event.
function playBloodImpact(){return Promise.race([new Promise(resolve=>compactSound("blood",resolve)),later(1700)])}
function playLethalSword(){return Promise.race([new Promise(resolve=>compactSound("slash",resolve)),later(1300)])}
function hideStoryEndOverlay(){const node=$("storyEndOverlay");if(node)node.classList.add("hidden")}
function chooseView(active){hideStoryEndOverlay();["storyHome","storyDialogue","storyBattle"].forEach(id=>$(id).classList.toggle("hidden",id!==active));window.scrollTo(0,0)}
function sfx(t,onDone=null){
 if(t==="blast"){window.StoryBgm?.duck();playCannonImpact();onDone?.();return}
 if(t==="cannon"||t==="rifle"){
  window.StoryBgm?.duck();
  playStoryClip("assets/audio/story/master_"+t+".mp3","fx",onDone);return;
 }
 if(t==="capture"||t==="win"||t==="loss")window.StoryBgm?.duck();
 const files={move:"assets/audio/sfx/step_soil.mp3",capture:"assets/audio/voice_capture_toraeta.mp3",card:"assets/audio/sfx/taiko_don.mp3",flip:"assets/audio/sfx/card_flip.mp3",woodSlide:"assets/audio/story/wood_lid_slide.mp3",win:"assets/audio/voice_shobu_atta.mp3",loss:"assets/audio/story/master_samurai_loss_v1.mp3"};
 if(files[t]){if(t==="capture")playBattleShout(files[t],onDone);else playStoryClip(files[t],["win","loss"].includes(t)?"voice":"fx",onDone);return}
 onDone?.();
 // No legacy synthesized fallback: only approved recorded assets are played.
}
// Every playable chapter reuses the approved main-game event assets and rules.
// Historical 5x6-only gating silently disabled cards, capture escorts, turn notices,
// awakening and check paths on the Kinmon and Toba-Fushimi 9x9 boards.
function compactMode(){return stage>=0&&stage<D.chapters.length}
const compactCardFaces={"何事もなし":"assets/cards/events/calm.webp?v=20261104d","寝返り":"assets/cards/events/defection-v2.webp","援軍":"assets/cards/events/reinforcement.webp","脱走":"assets/cards/events/desertion.webp","粛清":"assets/cards/events/purge.webp","大地震":"assets/cards/events/earthquake.webp","大砲":"assets/cards/weapons/cannon-v2.webp","鉄砲":"assets/cards/weapons/rifle-v2.webp"};
const compactCardWeights=window.ShinsengumiIncidentRules.cardWeights;
const compactCardVoices={"何事もなし":"assets/audio/events/incident_voice_calm.mp3","寝返り":"assets/audio/story/master_samurai_defection_v1.mp3","援軍":"assets/audio/events/incident_voice_reinforcement.mp3","脱走":"assets/audio/events/incident_voice_desertion.mp3","粛清":"assets/audio/events/incident_voice_purge.mp3","大地震":"assets/audio/events/incident_voice_earthquake.mp3","大砲":kabukiVoice.cannon,"鉄砲":kabukiVoice.rifle};
// Awakening counts belong to a person, even after capture and redeployment.
function compactFighterKey(p){
 return window.ShinsengumiBattleRules.fighterKey(p);
}
const compactAudio={
 move0:"assets/audio/voice_shinsengumi_move_sorya.mp3",
 kondo:"assets/audio/voice_kondo_isami_king_move.mp3",
 hijikata:"assets/audio/voice_hijikata_toshizo_move.mp3",
 move1:"assets/audio/voice_saccho_move_taa.mp3",
 // The 0.98-second enemy take was masked during the capture escort on phones.
 // Use the same audible, approved 1.75-second 「捕らえた！」 as the player.
 sacchoCapture:"assets/audio/voice_capture_toraeta.mp3",
 sacchoLoss:"assets/audio/story/master_enemy_loss_v4.mp3",
 saigo:"assets/audio/voice_saigo_takamori.mp3",
 kido:"assets/audio/voice_kido_takayoshi.mp3",
 sacchoCheck:"assets/audio/saccho_voice_06_korede_saigo.mp3",
 sacchoPromote:"assets/audio/saccho_voice_05_madamada.mp3",
 sacchoChesto:"assets/audio/saccho_voice_01_chesto.mp3",
 sacchoUryaa:"assets/audio/saccho_voice_02_uryaa.mp3",
 check:"assets/audio/voice_oute.mp3",
 banner:"assets/audio/sfx/taiko_dodon.mp3",
 quake:"assets/audio/sfx/rumble.mp3",
 slash:"assets/audio/sfx/sword_slash_2.mp3",
 desert:"assets/audio/story/master_gravel_run_v2.mp3",
 reinforce:"assets/audio/sfx/taiko_dodon.mp3",
 kill:"assets/audio/sfx/purge_shukusei.mp3",
 // One approved impact sound for purge, lethal slash and rifle casualties.
 blood:"assets/audio/sfx/purge_shukusei.mp3",
 turn:"assets/audio/sfx/taiko_kaka.mp3"
};
function compactSound(kind,onDone=null){
 if(kind==="slash")kind=["slash1","slash2","slash3"][Math.floor(Math.random()*3)];
 const src=compactAudio[kind]||({slash1:"assets/audio/sfx/sword_slash_1.mp3",slash2:"assets/audio/sfx/sword_slash_2.mp3",slash3:"assets/audio/sfx/sword_slash_3.mp3"})[kind];if(!src){onDone?.();return}
 const isVoice=["move0","move1","kondo","hijikata","check","sacchoCapture","sacchoLoss","saigo","kido","sacchoCheck","sacchoPromote","sacchoChesto","sacchoUryaa"].includes(kind);
 if(kind==="blood")playGestureAudio(src,onDone,"fx");
 else if(kind==="sacchoCapture"||kind==="check"){
  window.StoryBgm?.duck();
  playBattleShout(src,onDone);
 }
 else playStoryClip(src,isVoice?"voice":"fx",onDone);
}
async function compactFadeExpiredHoles(game){
 if(!compactClosingHoles.length)return;
 compactHoleFading=true;
 const root=$("storyBoard");
 for(const pos of compactClosingHoles)root.children[pos.y*g.w+pos.x]?.classList.add("compact-hole-fading");
 // Play the treated first second of the cliff collapse while the hole fades.
 // The turn/card queue may only resume once BOTH the sound and fade have ended.
 await Promise.all([
  new Promise(resolve=>playStoryClip("assets/audio/story/master_cliffcollapse_1s_v1.mp3","fx",resolve)),
  later(1350)
 ]);
 if(game!==epoch)return;
 compactClosingHoles=[];compactHoleFading=false;render();
}
function hideCompactFx(){
 stopStoryQuakeBattle();
 document.body.classList.remove("story-quake-active");
 compactFxSerial++;
 compactTurnLocked=false;
 $("compactTurnNotice").classList.remove("show");
 $("compactAwakenNotice").classList.remove("show");
 compactArrival=null;promotionRise=null;promotionCapturePreview=null;promotionVisualHold=null;pendingStoryAwakeningKey=null;
 compactIncident=null;compactIncidentEffect=null;compactIncidentMarks=[];compactQuakeMove=null;compactQuakeLanding=null;compactQuakeCracks=[];compactClosingHoles=[];compactHoleFading=false;compactBloodMarks=[];debugAwakenKey=null;pendingWeaponDisplay=null;$("compactCardFace").blur();$("compactCardOverlay").classList.add("hidden");$("compactIncidentStage").classList.add("hidden");$("compactCardFace").classList.remove("revealed");
 $("compactIntroClash").classList.remove("show");$("compactActionLayer").replaceChildren();
}
function compactPickCard(side){
 // Artillery belongs to the Toba-Fushimi deck, never to a turn-count timer.
 // Each army can draw each weapon at most once; other chapters are unchanged.
 const base=stage===3?compactCardWeights.map(([name,weight])=>[name,weight*.8]):compactCardWeights;
 // Do not draw a card that cannot affect the current legal position.
 // A silent no-op was especially confusing for defection on small boards.
 const deck=base.filter(([kind])=>{
  if(localTwoPlayer&&kind==="援軍")return false; // Human-vs-human plays without reinforcement.
  if(kind==="寝返り")return compactEligible(1-side).length>0;
  if(kind==="脱走")return compactEligible(side).length>0;
  if(kind==="粛清")return compactEligible(side,["歩","香","桂","銀"]).length>0;
  return true;
 });
 if(stage===3){
  if(!weapons.includes(side+":cannon"))deck.push(["大砲",10]);
  if(!weapons.includes(side+":rifle"))deck.push(["鉄砲",10]);
 }
 let roll=Math.random()*deck.reduce((sum,item)=>sum+item[1],0);
 for(const [name,weight] of deck){roll-=weight;if(roll<0)return name}
 return "何事もなし";
}
function compactCardInterval(){return stage===3?3:4}
function compactCardDue(actor){
 if(localTwoPlayer)return false; // Visual-stage human matches never trigger incident cards.
 if(stage===2)return g?.oilPhase===2&&g.ply>0&&g.ply%4===0;
 if(stage===3)return g.ply>=5&&(g.ply-5)%3===0; // Alternate sides; avoid back-to-back incidents.
 const cycle=compactCardInterval()*2;return g.ply%cycle===(actor===0?cycle-1:0);
}
function compactCardRemaining(){
 if(stage===2&&g?.oilPhase===2)return 2-Math.floor((g.ply%4)/2);
 if(stage===3)return Math.max(1,Math.ceil(((g.ply<5?5:5+Math.ceil((g.ply-4)/3)*3)-g.ply)/2));
 const cycle=compactCardInterval()*2;return compactCardInterval()-Math.floor((g.ply%cycle)/2);
}
function compactSafeBoard(B){return !g.check(B,0)&&!g.check(B,1)&&g.legal(0,B,g.hands).length>0&&g.legal(1,B,g.hands).length>0}
function compactEligible(owner,types=null){
 return window.ShinsengumiIncidentRules.eligibleTargets({
  board:g.board,owner,allowedTypes:types,
  check:(board,side)=>g.check(board,side),
  legalMoves:(board,side)=>g.legal(side,board,g.hands)
 });
}
function compactPlanQuake(){return window.ShinsengumiIncidentRules.planQuake({board:g.board,isHole:(y,x)=>g.isHole(y,x),safe:compactSafeBoard})}
function compactCardStart(side){
 if(localTwoPlayer)return; // Keep card animations exclusive to the authored story.
 if(!compactMode()||ended)return;compactIncident={side,kind:null,revealed:false,voiceDone:true,closeRequested:false};
 busy=true;compactTurnLocked=true;selected=null;render();
 const overlay=$("compactCardOverlay"),face=$("compactCardFace");overlay.classList.add("hidden");face.classList.remove("revealed","card-text-ready");$("compactCardArtwork").src="assets/cards/back/card-back-king-neutral.webp";
 $("compactCardHeading").textContent="";$("compactCardText").textContent="";$("compactCardPrompt").textContent="";
 const stage=$("compactIncidentStage"),banner=$("compactIncidentBanner"),game=epoch,incident=compactIncident;
 stage.classList.remove("hidden");banner.style.animation="none";void banner.offsetWidth;banner.style.animation="";
 compactSound("banner");
 setTimeout(()=>{if(game!==epoch||compactIncident!==incident||incident.revealed)return;
  stage.classList.add("hidden");overlay.classList.remove("hidden");sfx("card");
  // The authored card back must be visible briefly before the front flips.
  setTimeout(()=>{if(game===epoch&&compactIncident===incident&&!incident.revealed)compactCardReveal()},520);
 },1300);
}
function compactCardReveal(){
 const state=compactIncident;if(!state||state.revealed)return;state.revealed=true;state.kind=compactPickCard(state.side);
 const kind=state.kind,side=state.side;let detail="";compactIncidentEffect=null;
 if(kind==="何事もなし")detail="何事もなし。盤面に変化なし";
 else if(kind==="大地震"){compactIncidentEffect={kind};detail="大地震！ 駒が揺れ動き、地面が崩れる"}
 else if(kind==="大砲"||kind==="鉄砲"){
  const weaponKind=kind==="大砲"?"cannon":"rifle";
  compactIncidentEffect={kind:"weapon",weaponKind,side};
  detail=kind==="大砲"?"大砲！ 敵陣の2か所へ砲撃し、着弾地点に穴を開ける":"鉄砲！ 敵陣へ銃撃する";
 }
 else if(kind==="援軍"){
  const fallen=g.fallen[side];
  if(fallen.length){const revived=fallen[Math.floor(Math.random()*fallen.length)];compactIncidentEffect={kind,side,uid:revived.uid};detail="援軍！ 離脱した"+revived.t+"が持ち駒に復帰する"}
  else{compactIncidentEffect=null;detail="援軍を必要とする隊士はいない"}
 }
 else{
  const owner=kind==="寝返り"?1-side:side,options=compactEligible(owner,kind==="粛清"?["歩","香","桂","銀"]:null);
  if(!options.length)detail=kind+"：安全な対象がないため効果なし";
  else{const v=options[Math.floor(Math.random()*options.length)];compactIncidentEffect={kind,side,owner,y:v.y,x:v.x};
   detail=kind==="寝返り"?"敵の"+v.p.t+"が寝返り、味方の持ち駒に加わる":kind==="脱走"?"味方の"+v.p.t+"が脱走する":"味方の"+v.p.t+"を粛清する";
  }
 }
 const face=$("compactCardFace");face.style.backgroundImage="none";
 // Keep the painted back visible until the front has decoded, even on cold-cache Safari.
 const cardArt=$("compactCardArtwork"),imageUrl=compactCardFaces[kind],loadedFront=new Image();
 loadedFront.onload=()=>{if(compactIncident===state)cardArt.src=imageUrl};
 loadedFront.onerror=()=>console.warn("事件札の表面を読み込めません",imageUrl);
 loadedFront.src=imageUrl;
 face.classList.remove("card-text-ready");face.classList.add("revealed");
 $("compactCardHeading").textContent=kind;$("compactCardText").textContent="";
 window.ShinsengumiBattleRules.revealAfterTurn(face,"storyCardTurn",()=>{
  $("compactCardText").textContent=detail;face.classList.add("card-text-ready");
  if(state.closeRequested&&state.voiceDone)compactCardClose();
 },{valid:()=>compactIncident===state});
 $("compactCardPrompt").textContent="";
 state.voiceDone=false;
 sfx("flip");
 if(!voiceEnabled){state.voiceDone=true;return}
 let settled=false;
 const done=()=>{if(settled)return;settled=true;if(compactIncident!==state)return;state.voiceDone=true;if(state.closeRequested)compactCardClose()};
 // The flip SFX and incident voice have separate channels as in the finished game.
 // Card arrival is timer-driven; on iOS an HTMLAudioElement may be denied
 // autoplay even after the initial tap. Use the touch-unlocked audio channel.
 playGestureAudio(compactCardVoices[kind],done,"voice");setTimeout(done,6200);
}
function compactCardClose(){
 const state=compactIncident;if(!state||!state.revealed)return;
 if(!$("compactCardFace").classList.contains("card-text-ready"))return;
 if(!state.voiceDone){state.closeRequested=true;$("compactCardPrompt").textContent="読み上げ終了後に進みます…";return}
 compactIncident=null;$("compactCardFace").blur();$("compactCardOverlay").classList.add("hidden");compactApplyIncident(compactIncidentEffect);compactIncidentEffect=null;
}
$("compactCardFace").onclick=()=>{
 if(pendingWeaponDisplay){
  const item=pendingWeaponDisplay;
  if(!item.revealed){
   item.revealed=true;item.voiceDone=false;item.closeRequested=false;
 const face=$("compactCardFace");face.style.backgroundImage="none";face.classList.remove("card-text-ready");sfx("flip");
   const detail=item.kind==="cannon"
    ?"【大砲・砲撃】相手の陣地のランダムな２か所へ、砲弾が１発ずつ落ちる。命中した駒は消滅。着弾地点には穴が開き、３手番のあいだ駒の移動も配置もできない。"
    :"【鉄砲・銃撃】発射側の４段目のランダムな列から、相手陣地へ向けて発砲する。進路上で最初に命中した駒が消滅する。途中に駒がなければ空振りとなる。";
   const url=`assets/cards/weapons/${item.kind}-v2.webp`,front=new Image();
   front.onload=()=>{if(pendingWeaponDisplay===item)$("compactCardArtwork").src=url};
   front.onerror=()=>console.warn("兵器札の表面を読み込めません",url);
   front.src=url;face.classList.add("revealed");$("compactCardText").textContent="";
   window.ShinsengumiBattleRules.revealAfterTurn(face,"storyCardTurn",()=>{
    $("compactCardText").textContent=detail;face.classList.add("card-text-ready");
   },{valid:()=>pendingWeaponDisplay===item});
   $("compactCardPrompt").textContent="";
   // Name the revealed weapon card first, then speak 「撃て！」 once at launch.
   playKabukiVoice(item.kind).then(()=>{
    if(pendingWeaponDisplay!==item)return;
    item.voiceDone=true;
   if(item.closeRequested){pendingWeaponDisplay=null;$("compactCardFace").blur();$("compactCardOverlay").classList.add("hidden");fire(item.kind,item.ownerSide)}
   });return;
  }
  if(!faceIsWeaponReady())return;
  if(!item.voiceDone){item.closeRequested=true;$("compactCardPrompt").textContent="号令が終わると砲撃を開始します…";return}
  pendingWeaponDisplay=null;$("compactCardFace").blur();$("compactCardOverlay").classList.add("hidden");fire(item.kind,item.ownerSide);return;
 }
 if(!compactIncident)return;if(!compactIncident.revealed)compactCardReveal();else compactCardClose();
};
function faceIsWeaponReady(){return $("compactCardFace").classList.contains("card-text-ready")}
// Use the exact same .story-token element and board CSS as every normal piece.
// Only its outer square flies in; no duplicate lettering/font/material is drawn.
function createStoryReinforcementRunner(entry){
 const board=$("storyBoard"),cellWidth=board.clientWidth/g.w,cellHeight=board.clientHeight/g.h;
 const runner=document.createElement("div");
 runner.className="sq story-reinforcement-runner";
 runner.setAttribute("aria-hidden","true");
 Object.assign(runner.style,{
  position:"absolute",zIndex:"25",pointerEvents:"none",boxSizing:"border-box",border:"0",
  background:"transparent",boxShadow:"none",display:"grid",placeItems:"center",
  left:(entry.x*cellWidth)+"px",top:(entry.y*cellHeight)+"px",
  width:cellWidth+"px",height:cellHeight+"px"
 });
 const token=document.createElement("span");
 token.className="story-token"+(entry.piece.s?" enemy":"")+(entry.piece.p?" promoted":"");
 token.textContent=label(entry.piece);token.setAttribute("aria-hidden","true");
 runner.append(token);board.append(runner);
 return{runner,boardHeight:board.clientHeight,cellHeight,width:cellWidth};
}
async function ikedayaReinforcementArrival(){
 const game=epoch;ikedayaReinforcing=true;busy=true;compactTurnLocked=true;selected=null;
 const arrivals=g.deployIkedayaReinforcements();
 if(!arrivals){ikedayaReinforcing=false;busy=false;compactTurnLocked=false;render();popup("援軍の配置に失敗","盤上に4騎分の空きマスがありません。対局を再開してください。",[["再挑戦",()=>battle(0)]]);return}
 // Keep the four destinations empty until each runner actually lands.
 // This avoids Safari retaining opacity:0 on pre-rendered, hidden pieces.
 for(const entry of arrivals)g.board[entry.y][entry.x]=null;
 ikedayaPendingPositions.clear();
 render();
 const layer=$("compactActionLayer");layer.replaceChildren();
 try{
  storyBannerMessage("新選組、援軍到着！",0);
  await new Promise(resolve=>{playGestureAudio(compactCardVoices["援軍"],resolve,"voice",2,()=>game===epoch&&!ended);setTimeout(resolve,5000)});
  // The reinforcements answer the command with a single battle cry as the first officer runs in.
  playGestureAudio("assets/audio/sfx/battle_charge_mono_64kbps.mp3",null,"voice",2.5,()=>game===epoch&&!ended);
  for(const entry of arrivals){
   if(game!==epoch||ended)return;
   closeStoryReinforcementBanner(0); // The previous portrait leaves before the next rider moves.
   const {runner,boardHeight,cellHeight,width}=createStoryReinforcementRunner(entry);
   let feet=true;
   const active=()=>feet&&game===epoch&&!ended;
   const foot=()=>playGestureAudio("assets/audio/sfx/step_soil.mp3",null,"fx",2.5,active);
   foot();const second=setTimeout(()=>{if(active())foot()},390);
   if(runner?.animate&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
    const startY=boardHeight-(entry.y+.5)*cellHeight+width;
    const animation=runner.animate([
     {opacity:0,transform:`translateY(${startY}px) scale(.82)`},
     {opacity:1,offset:.17,transform:`translateY(${startY*.8}px) scale(.9)`},
     {opacity:1,transform:"translateY(0) scale(1)"}
    ],{duration:1000,easing:"ease-out",fill:"forwards"});
    await Promise.race([animation.finished.catch(()=>{}),later(1200)]);
    animation.cancel();
   }else await later(1000);
   feet=false;clearTimeout(second);stopStoryClip("fx");
   runner?.remove();
   if(game!==epoch||ended)return;
   g.board[entry.y][entry.x]=entry.piece;
   render();
   banner(0,entry.piece,true);
   // Match normal character banners: full reading time, plus any active voice.
   await waitStoryReinforcementBanner(game);
  }
  // Let the last arriving officer be seen before retiring the character portrait.
  await later(700);
 }finally{
  layer.replaceChildren();ikedayaPendingPositions.clear();
  // Never leave an officer invisible or missing if mobile animation aborts.
  if(game===epoch&&!ended)for(const entry of arrivals)
   if(!g.board[entry.y][entry.x])g.board[entry.y][entry.x]=entry.piece;
  if(game===epoch&&!ended){
   ikedayaReinforcing=false;busy=false;compactTurnLocked=false;selected=null;
   render();
   storyBannerMessage("援軍四騎、盤上に到着！",0);
   // A held reinforcement portrait must be retired before the next turn art.
   closeStoryReinforcementBanner(0);
   if(g.check(g.board,0))compactSound("check");
   else if(g.check(g.board,1))compactSound("check");
   compactResumeTurn();
  }
 }
}
async function kinmonSatsumaArrival(){
 const game=epoch;kinmonSatsumaReinforcing=true;busy=true;compactTurnLocked=true;selected=null;
 const arrivals=g.deployKinmonSatsumaReinforcements();
 if(!arrivals){kinmonSatsumaReinforcing=false;busy=false;compactTurnLocked=false;render();popup("援軍の配置に失敗","薩摩援軍3騎分の空きマスがありません。",[["再挑戦",()=>battle(1)]]);return}
 // Keep the four destinations empty until each runner actually lands.
 // This avoids Safari retaining opacity:0 on pre-rendered, hidden pieces.
 for(const entry of arrivals)g.board[entry.y][entry.x]=null;
 kinmonSatsumaPendingPositions.clear();
 render();
 const layer=$("compactActionLayer");layer.replaceChildren();
 try{
  storyBannerMessage("薩摩藩、援軍到着！",0);
  await new Promise(resolve=>{playGestureAudio(compactCardVoices["援軍"],resolve,"voice",2,()=>game===epoch&&!ended);setTimeout(resolve,5000)});
  // The reinforcements answer the command with a single battle cry as the first officer runs in.
  playGestureAudio("assets/audio/sfx/battle_charge_mono_64kbps.mp3",null,"voice",2.5,()=>game===epoch&&!ended);
  for(const entry of arrivals){
   if(game!==epoch||ended)return;
   closeStoryReinforcementBanner(0); // The previous portrait leaves before the next rider moves.
   const {runner,boardHeight,cellHeight,width}=createStoryReinforcementRunner(entry);
   let feet=true;
   const active=()=>feet&&game===epoch&&!ended;
   const foot=()=>playGestureAudio("assets/audio/sfx/step_soil.mp3",null,"fx",2.5,active);
   foot();const second=setTimeout(()=>{if(active())foot()},390);
   if(runner?.animate&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
    const startY=boardHeight-(entry.y+.5)*cellHeight+width;
    const animation=runner.animate([
     {opacity:0,transform:`translateY(${startY}px) scale(.82)`},
     {opacity:1,offset:.17,transform:`translateY(${startY*.8}px) scale(.9)`},
     {opacity:1,transform:"translateY(0) scale(1)"}
    ],{duration:1000,easing:"ease-out",fill:"forwards"});
    await Promise.race([animation.finished.catch(()=>{}),later(1200)]);
    animation.cancel();
   }else await later(1000);
   feet=false;clearTimeout(second);stopStoryClip("fx");
   runner?.remove();
   if(game!==epoch||ended)return;
   g.board[entry.y][entry.x]=entry.piece;
   render();
   banner(0,entry.piece,true);
   // Match normal character banners: full reading time, plus any active voice.
   await waitStoryReinforcementBanner(game);
  }
  // Let the last arriving officer be seen before retiring the character portrait.
  await later(700);
 }finally{
  layer.replaceChildren();kinmonSatsumaPendingPositions.clear();
  // Never leave an officer invisible or missing if mobile animation aborts.
  if(game===epoch&&!ended)for(const entry of arrivals)
   if(!g.board[entry.y][entry.x])g.board[entry.y][entry.x]=entry.piece;
  if(game===epoch&&!ended){
   kinmonSatsumaReinforcing=false;busy=false;compactTurnLocked=false;selected=null;
   render();
   storyBannerMessage("薩摩の援軍三騎、盤上に到着！",0);
   // A held reinforcement portrait must be retired before the next turn art.
   closeStoryReinforcementBanner(0);
   if(g.check(g.board,0))compactSound("check");
   else if(g.check(g.board,1))compactSound("check");
   compactResumeTurn();
  }
 }
}
function compactResumeTurn(){
 if(ended)return;
 if(!localTwoPlayer&&stage===0&&g?.ply>=3&&!g.ikedayaReinforced){ikedayaReinforcementArrival();return}
 if(!localTwoPlayer&&stage===1&&g?.ply>=3&&!g.kinmonSatsumaReinforced){kinmonSatsumaArrival();return}busy=false;compactTurnLocked=true;render();const game=epoch;
 // The finished match queues the turn illustration 1.4s (enemy) / 1.8s
 // (player) after the preceding action, then shows the artwork for 1.8s.
 const side=g.side;
 setTimeout(()=>{if(game!==epoch||ended||g.side!==side)return;
  if(side===1)compactTurn(1,localTwoPlayer?null:()=>{if(game===epoch)setTimeout(()=>{if(game===epoch)computer()},1050)});
  else compactTurn(0);
 },side===1?window.ShinsengumiBattlePresentation.timing.enemyTurnDelay:window.ShinsengumiBattlePresentation.timing.playerTurnDelay);
}
function compactGrantReinforcement(effect){
 const fallen=g.fallen[effect.side],i=fallen.findIndex(p=>p.uid===effect.uid);
 if(i<0)return null;
 const revived=fallen.splice(i,1)[0];
 g.hands[effect.side].push({...revived,s:effect.side,p:false});
 return revived;
}
function compactApplyIncident(effect){
 if(!effect){compactResumeTurn();return}
 const game=epoch,board=$("storyBoard");busy=true;compactTurnLocked=true;
 if(effect.kind==="weapon"){
  const {weaponKind,side}=effect;
  if(!weapons.includes(side+":"+weaponKind))weapons.push(side+":"+weaponKind);
  fire(weaponKind,side);return;
 }
 if(effect.kind==="援軍"){
  const candidate=g.fallen[effect.side].find(p=>p.uid===effect.uid);
  if(!candidate){compactResumeTurn();return}
  // The reinforcement presentation is an anonymous rank-and-file banner;
  // the actual returning unit keeps its original identity and piece type.
  const mobCandidate={t:candidate.t,s:effect.side,cid:null,origin:effect.side,mob:candidate.mob||0};
  banner(effect.side,mobCandidate,true);render();
  const hand=$("storyHand"+effect.side);
  storyBannerMessage("援軍！ 離脱していた隊士が戻る！",effect.side);
  // A returning officer runs in from outside the screen and lands in the hand.
  // Reuse the desertion footsteps; the sortie voice starts after the run.
  const goal=hand.closest(".hand-container")?.getBoundingClientRect(),layer=$("compactActionLayer");
  const figure=document.createElement("img");figure.src="assets/sprites/figures/"+(effect.side===0?"shinsengumi_back":"saccho_front")+".webp";figure.alt="";figure.className="story-reinforcement-runner";
  const width=66,startX=effect.side===0?-width-30:innerWidth+30,startY=goal?goal.top+goal.height/2-55:innerHeight/2;
  Object.assign(figure.style,{left:startX+"px",top:startY+"px",width:width+"px",height:"92px",visibility:"hidden"});layer.replaceChildren(figure);
  // The command must finish before footsteps and the running animation begin.
  playStoryClip("assets/audio/voice_iza_shutsujin.mp3","voice",async()=>{
   if(game!==epoch)return;
   figure.style.visibility="visible";
   const run=figure.animate&&goal&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ?figure.animate([{opacity:0,transform:"translateX(0) scale(.85)"},{opacity:1,offset:.18,transform:"translateX("+((goal.left+goal.width/2-startX)*.18)+"px)"},{opacity:1,offset:.88,transform:"translateX("+(goal.left+goal.width/2-startX)+"px)"},{opacity:0,transform:"translateX("+(goal.left+goal.width/2-startX)+"px) scale(.6)"}],{duration:1700,easing:"ease-in-out",fill:"forwards"}).finished.catch(()=>{})
    :later(1700);
   const footsteps=new Promise(resolve=>{compactSound("desert",resolve);setTimeout(resolve,3000)});
   await Promise.all([run,footsteps]);figure.remove();if(game!==epoch)return;
   // Only now does the reinforcement become a usable piece in the hand.
   const revived=compactGrantReinforcement(effect);
   if(!revived){compactResumeTurn();return}
   render();
   for(const button of hand.querySelectorAll(".story-hand-piece"))if(button.dataset.piece===revived.t)button.classList.add("story-reinforcement-glow");
   storyBannerMessage("援軍！ 隊士が持ち駒に復帰した！",effect.side);
   setTimeout(()=>{if(game!==epoch)return;hand.querySelectorAll(".story-reinforcement-glow").forEach(b=>b.classList.remove("story-reinforcement-glow"));if(!(compactCaptures[compactFighterKey(revived)]>=3))$(effect.side?"enemyStoryBanner":"playerStoryBanner").classList.remove("show-character");compactResumeTurn()},450);
  });
  return;
 }
 if(effect.kind==="大地震"){
  compactQuakeMove=null;compactQuakeLanding=null;compactQuakeCracks=[];compactIncidentMarks=[];
  board.classList.add("compact-quake");document.body.classList.add("story-quake-active");compactSound("quake");playStoryQuakeBattle();
  const quakeSnapshot=g.clone(g.board);
  const quakeCount=B=>B.flat().filter(Boolean).length;
  let quakeFinished=false;
  let quakeWatchdog=null;
  const quakeRecovery=()=>{
   if(game!==epoch||quakeFinished)return;
   quakeFinished=true;
   if(quakeWatchdog!==null)clearTimeout(quakeWatchdog);
   if(quakeCount(g.board)!==quakeCount(quakeSnapshot)){
    console.error("地震中の駒消失を検知、盤面を復元");
    g.board=g.clone(quakeSnapshot);
   }
   board.classList.remove("compact-quake");document.body.classList.remove("story-quake-active");
   compactQuakeMove=null;compactQuakeLanding=null;compactQuakeCracks=[];compactIncidentMarks=[];
   stopStoryQuakeBattle();render();compactResumeTurn();
  };
  // Even if an animation callback fails, never leave the match locked forever.
  quakeWatchdog=setTimeout(()=>{console.warn("地震演出のタイムアウトを復旧");quakeRecovery()},12000);
  setTimeout(()=>{
   if(game!==epoch||quakeFinished)return;
   board.classList.remove("compact-quake");document.body.classList.remove("story-quake-active");
   let plan;
   try{plan=compactPlanQuake()}catch(error){console.error("地震の移動計画を復旧しました",error);quakeRecovery();return}
   g.last=null;selected=null;
   if(!plan){quakeRecovery();return}
   // A quake must rearrange pieces, never capture or erase them.
   const before=g.clone(g.board);
   const signature=B=>B.flat().filter(Boolean).map(p=>[p.uid??"",p.cid??"",p.t,p.s,p.p??false].join(":")).sort().join("|");
   const originalSignature=signature(before);
   if(signature(plan.B)!==originalSignature){console.error("地震計画で駒数が変化したため中止");quakeRecovery();return}
   // Mirror the finished 9x9 quake: flash -> travel -> landing, one piece
   // at a time, followed by cracks and holes. The live board stays coherent.
   let index=0;
   const nextShift=()=>{
    if(game!==epoch||quakeFinished)return;
    if(index>=plan.shifts.length){
     if(signature(g.board)!==originalSignature){
      console.error("地震後の駒配置が不正、復元");
      g.board=g.clone(before);quakeRecovery();return;
     }
     compactQuakeMove=null;compactQuakeLanding=null;
     compactIncidentMarks=plan.shifts.map(v=>v.Y+":"+v.X);
     const vacated=[...new Map(plan.shifts.map(v=>[v.y+":"+v.x,{y:v.y,x:v.x}])).values()]
      .filter(v=>!g.board[v.y][v.x]&&!g.isHole(v.y,v.x)).sort(()=>Math.random()-.5);
     const chosen=[];
     for(const p of vacated){
      if(chosen.length>=2)break;
      const candidate={...p,expiresPly:g.ply+3};
      g.holes.push(candidate);
      let safe=false;
      try{safe=compactSafeBoard(g.board)}catch(error){console.error("地震の穴判定",error)}
      g.holes.pop();
      if(safe){chosen.push(candidate);g.holes.push(candidate)}
     }
     for(let i=0;i<chosen.length;i++)g.holes.pop();
     compactQuakeCracks=chosen;render();
     setTimeout(()=>{
      if(game!==epoch||quakeFinished)return;
      compactQuakeCracks=[];
      if(chosen.length)playStoryClip("assets/audio/story/master_cliffcollapse_1s_v1.mp3","fx");
      for(const hole of chosen)if(!g.board[hole.y][hole.x])g.holes.push(hole);
      render();
     },650);
     setTimeout(()=>{
      if(game!==epoch||quakeFinished)return;
      compactIncidentMarks=[];quakeRecovery();
     },1450);
     return;
    }
    const shift=plan.shifts[index++];
    const piece=g.board[shift.y]?.[shift.x];
    if(!piece||g.board[shift.Y][shift.X]){
     console.error("地震の移動元または移動先が不正",shift);
     g.board=g.clone(before);quakeRecovery();return;
    }
    compactQuakeMove=shift;compactQuakeLanding=null;
    compactIncidentMarks=[shift.y+":"+shift.x,shift.Y+":"+shift.X];render();
    setTimeout(()=>{
     if(game!==epoch||quakeFinished)return;
     const current=g.board[shift.y]?.[shift.x];
     if(!current||g.board[shift.Y][shift.X]){
      g.board=g.clone(before);quakeRecovery();return;
     }
     g.board[shift.Y][shift.X]=current;g.board[shift.y][shift.x]=null;
     compactQuakeMove=null;compactQuakeLanding={y:shift.Y,x:shift.X};
     compactIncidentMarks=[shift.Y+":"+shift.X];render();
     setTimeout(nextShift,420);
    },460);
   };
   nextShift();
  },1750);return;
 }
 const {kind,side,owner,y,x}=effect,p=g.board[y]?.[x];
 if(!p||p.s!==owner||p.t==="玉"){compactIncidentMarks=[];compactResumeTurn();return}
 compactIncidentMarks=[y+":"+x];banner(owner,p);render();
 // Finished match plays the gravel-run cue as the desertion starts, not after it ends.
 if(kind==="脱走"||kind==="寝返り")compactSound("desert");
 let effectFinished=false;
 const finish=()=>{if(game!==epoch||effectFinished)return;effectFinished=true;compactIncidentMarks=[];render();compactResumeTurn()};
 const remove=()=>{
  if(game!==epoch)return;const current=g.board[y]?.[x];if(!current||current!==p){finish();return}
  g.board[y][x]=null;
  if(kind==="粛清")g.fallen[p.s].push({...p,p:false});
  if(kind==="寝返り"){
   // Keep the gravel footsteps audible; the later drum used to cut them short.
   g.hands[side].push({...p,s:side,p:false});banner(side,p);
   // Use only 「御免！」 cut from the older approved recording;
   // never play its unrelated 「助太刀致す」 second half.
   let escortDone=false,voiceDone=false,completed=false;
   const resume=()=>{if(completed)return;if(escortDone&&voiceDone){completed=true;finish()}};
   playGestureAudio("assets/audio/story/master_battle_gomen_v1.mp3",()=>{voiceDone=true;resume()},"voice");
   render();animateCompactEscort(side,y,x,p,()=>{escortDone=true;resume()});
   // Safari can discard animation.finished or audio ended when the page scrolls.
   // The board/hand mutation above is already complete; always unlock the turn.
   setTimeout(()=>{if(game!==epoch||completed)return;escortDone=true;voiceDone=true;resume()},4500);
  }else if(kind==="粛清"){
   window.ShinsengumiBattleRules.runOrderedEffect({
    valid:()=>game===epoch&&!ended,
    attack:async()=>{render();board.children[y*g.w+x]?.classList.add("compact-blood");await playLethalSword()},
    impact:playBloodImpact,
    cry:playCasualtyCry,
    result:finish
   });
  }else{render();setTimeout(finish,650)}
 };
 if(kind==="脱走"){
   window.ShinsengumiBattlePresentation.animateDesertion({cell:board.children[y*g.w+x],layer:$('compactActionLayer'),side:owner,valid:()=>game===epoch&&!ended,
    onDepart:()=>{if(g.board[y]?.[x]!==p)return;g.board[y][x]=null;g.fallen[p.s].push({...p,p:false});render()},onFinished:finish});
 }else setTimeout(remove,850);
}
function compactIntro(){
 if(!compactMode())return;
 const game=epoch,root=$("compactIntroClash");root.classList.remove("show");void root.offsetWidth;root.classList.add("show");
 setTimeout(()=>{if(game===epoch&&root.classList.contains("show"))compactSound("slash")},840);
 setTimeout(()=>{if(game!==epoch||ended)return;root.classList.remove("show");compactTurnLocked=true;render();
  setTimeout(()=>{if(game===epoch&&!ended){busy=false;compactTurn(0,null,true)}},450);
 },2600);
}
function animateCompactEscort(side,y,x,captive,done,onContact=null){
 const game=epoch;
 window.ShinsengumiBattlePresentation.animateEscort({cell:$('storyBoard').children[y*g.w+x],jail:$('storyHand'+side)?.closest('.hand-container'),layer:$('compactActionLayer'),side,tokenSelector:'.story-token',valid:()=>game===epoch&&!ended,onContact:()=>onContact?.(),onFinished:done});
}
function compactTurn(side,after,opening=false){
 if(!compactMode()||ended)return after?.();
 const stamp=++compactFxSerial,game=epoch;
 // Opening notice must use the battle viewport, not the story page scroll position.
 // The opening battle position is already anchored before the VS sequence.
 compactTurnLocked=true;
 const panel=$("compactTurnNotice"),art=$("compactTurnArt"),fallback=$("compactTurnFallback");
 // All battle sizes use the same board-relative turn presentation routine.
 if(typeof window.ShinsengumiTurnPresentation?.place==='function')window.ShinsengumiTurnPresentation.place($("storyBoard"),panel,'offset');
 else{const rect=$("storyBoard").getBoundingClientRect();panel.style.setProperty('--game-board-effect-offset',(rect.top+rect.height/2-innerHeight/2)+'px')}
 const title=localTwoPlayer?(side===0?"先手・新選組の手番！":"後手・敵軍の手番！"):(side===0?"新選組の手番！":"敵軍の手番！");
 art.src=localTwoPlayer?(side===0?"assets/turn-notice/turn_sente_illustrated_v2.png":"assets/turn-notice/turn_gote_illustrated_v2.png"):(side===0?"assets/turn-notice/turn_shinsengumi_illustrated.png":"assets/turn-notice/turn_enemy_illustrated.png");
 art.alt=title;art.style.display="block";fallback.textContent=title;fallback.classList.add("hidden");
 art.onerror=()=>{art.style.display="none";fallback.classList.remove("hidden")};
 panel.classList.add("show");compactSound("turn");render();
 setTimeout(()=>{
  if(game!==epoch||stamp!==compactFxSerial||ended)return;
  panel.classList.remove("show");
  if(opening)document.body.classList.remove("story-opening-viewport-lock");
  compactTurnLocked=false;render();
  // Check was announced on the move that gave check; don't repeat on turn notice.
  after?.();
 },1800);
}
function compactCalligraphy(kill){
 const panel=$("compactAwakenNotice"),art=$("compactAwakenArt");
 art.src=kill?"assets/visuals/hitokiri_kill_calligraphy.webp":"assets/visuals/hitokiri_red_calligraphy.webp";
 art.alt=kill?"人斬り・斬殺":"人斬り覚醒";
 panel.classList.remove("show");void panel.offsetWidth;panel.classList.add("show");
 const game=epoch;setTimeout(()=>{if(game===epoch)panel.classList.remove("show")},1600);
}
function compactCheckSources(){
 const result={attackers:new Set(),rays:new Set(),paths:[]};
 if(!compactMode()||!g?.check(g.board,g.side))return result;
 let king=null;for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.board[y][x]?.s===g.side&&g.board[y][x]?.t==="玉")king={y,x};
 if(!king)return result;
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
  const p=g.board[y][x];if(p?.s!==1-g.side)continue;
  if(!g.steps(g.board,y,x,true).some(m=>m.Y===king.y&&m.X===king.x))continue;
  result.attackers.add(y+":"+x);result.paths.push({fromY:y,fromX:x,toY:king.y,toX:king.x});
  const dy=king.y-y,dx=king.x-x,rook=p.t==="飛"&&(dy===0||dx===0),bishop=p.t==="角"&&Math.abs(dy)===Math.abs(dx),lance=p.t==="香"&&dx===0;
  if((rook||bishop||lance)&&Math.max(Math.abs(dy),Math.abs(dx))>1){
   const count=Math.max(Math.abs(dy),Math.abs(dx));for(let k=1;k<count;k++)result.rays.add((y+k*Math.sign(dy))+":"+(x+k*Math.sign(dx)));
  }
 }
 return result;
}
function popup(title,text,options,img){
 const modal=$("storyPopup");modal.classList.toggle("promotion-calligraphy",title==="成るか、成らぬか");$("popupTitle").textContent=title;$("popupText").textContent=text;
 modal.querySelectorAll(".story-verdict-art,.story-final-loser").forEach(node=>node.remove());
 const image=$("popupArt");image.classList.toggle("hidden",!img);
 if(img){image.onerror=()=>image.classList.add("hidden");image.src=img}
 const buttons=$("popupButtons");buttons.replaceChildren();
 options.forEach((v,i)=>{const b=document.createElement("button");b.type="button";b.textContent=v[0];if(i)b.className="secondary";
  b.onclick=()=>{modal.classList.add("hidden");v[1]()};buttons.append(b)});
 modal.classList.remove("hidden");
}
function collect(p){
 if(devPreview||debugModified||!p)return;
 if(Number.isInteger(p.tobaAllyId)){
  const profile=D.tobaAllies?.[p.tobaAllyId];if(!profile)return;
  try{const key="shinsengumi-story-toba-aizu-cards-v1",owned=JSON.parse(localStorage.getItem(key)||"[]");
   if(Array.isArray(owned)&&!owned.includes(p.tobaAllyId)){owned.push(p.tobaAllyId);localStorage.setItem(key,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+profile.name,0)}
  }catch(e){}return;
 }
 if(Number.isInteger(p.tobaId)){
  const profile=D.tobaRoster?.[p.tobaId];if(!profile)return;
  try{const key="shinsengumi-story-toba-historical-cards-v1",owned=JSON.parse(localStorage.getItem(key)||"[]");
   if(Array.isArray(owned)&&!owned.includes(p.tobaId)){owned.push(p.tobaId);localStorage.setItem(key,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+profile.name,0)}
  }catch(e){}return;
 }
 for(const [field,side,list] of [["oilDefenderId","shinsengumi",D.oilDefenders],["oilRaiderId","goryo-eji",D.oilRaiders]]){
  if(Number.isInteger(p[field])){
   const profile=list?.[p[field]];if(!profile)return;
   try{const key="shinsengumi-story-oil-historical-cards-v1",owned=JSON.parse(localStorage.getItem(key)||"[]"),id=side+":"+p[field];
    if(Array.isArray(owned)&&!owned.includes(id)){owned.push(id);localStorage.setItem(key,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+profile.name,0)}
   }catch(e){}return;
  }
 }
 if(Number.isInteger(p.satsumaId)){
  const item=D.kinmonAllies?.[p.satsumaId];if(!item)return;
  try{const key="shinsengumi-story-kinmon-satsuma-cards-v1",owned=JSON.parse(localStorage.getItem(key)||"[]");
   if(Array.isArray(owned)&&!owned.includes(p.satsumaId)){owned.push(p.satsumaId);localStorage.setItem(key,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+item.name,0)}
  }catch(e){}return;
 }
 if(Number.isInteger(p.kinmonId)){
  // Preserve the original 40-person collection indexes; provisional Kinmon cards
  // live in their own namespace until portrait art and the unified gallery ship.
  const id=p.kinmonId,profile=D.kinmonRoster?.[id];if(!profile)return;
  try{const key="shinsengumi-story-kinmon-cards-v1";const owned=JSON.parse(localStorage.getItem(key)||"[]");
   if(Array.isArray(owned)&&!owned.includes(id)){owned.push(id);localStorage.setItem(key,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+profile.name,0)}
  }catch(e){}return;
 }
 if(p.featuredId){
  const id=ikedayaFeaturedCardIndexes[p.featuredId];if(id==null)return;
  try{const owned=JSON.parse(localStorage.getItem(COL)||"[]");if(Array.isArray(owned)&&!owned.includes(id)){owned.push(id);localStorage.setItem(COL,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+person(p).name,0)}}catch(e){}
  return;
 }
 if(p.cid==null)return;
 const id=(p.origin===0?0:20)+p.cid;
 if(id<0||id>=40)return;
 try{const owned=JSON.parse(localStorage.getItem(COL)||"[]");if(Array.isArray(owned)&&!owned.includes(id)){owned.push(id);localStorage.setItem(COL,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+person(p).name,0)}}catch(e){}
}
const ikedayaFeaturedCardIndexes={ishikawa:40,yoshida:41,kitazoe:42,mochizuki:43,matsuda:44,otaka:45,hirooka:46,sugiyama:47,fukuoka:48};
function person(p){
 if(!p)return{name:"",role:"",img:""};
 if(Number.isInteger(p.tobaAllyId)){
  const record=D.tobaAllies?.[p.tobaAllyId];if(record)return{name:record.name,role:record.role,img:record.art};
 }
 if(Number.isInteger(p.tobaId)){
  const record=D.tobaRoster?.[p.tobaId];if(record)return{name:record.name,role:record.role,img:record.art};
 }
 for(const [field,list] of [["oilDefenderId",D.oilDefenders],["oilRaiderId",D.oilRaiders]]){
  if(Number.isInteger(p[field])){const record=list?.[p[field]];if(record)return{name:record.name,role:record.role,img:record.art};}
 }
 if(Number.isInteger(p.satsumaId)){
  const record=D.kinmonAllies?.[p.satsumaId];
  if(record)return{name:record.name,role:record.role,img:record.art};
 }
 if(Number.isInteger(p.kinmonId)){
  const record=D.kinmonRoster?.[p.kinmonId];
  if(record)return{name:record.name,role:record.role,img:record.art};
 }
 const king=p.king;
 if(king==="miyabe")return{name:"宮部鼎蔵",role:"尊攘派志士",img:"assets/dialogue_banners/miyabe_banner.webp?v=miyabe-framing-20261107b"};
 if(p.featuredId){
  const featured={ishikawa:["石川潤次郎","土佐藩士"],yoshida:["吉田稔麿","長州藩士"],kitazoe:["北添佶摩","土佐出身の尊攘派志士"],mochizuki:["望月亀弥太","土佐藩士"],matsuda:["松田重助","肥後藩士"],otaka:["大高又次郎","播磨林田藩出身の志士"],hirooka:["広岡浪秀","長州系の尊攘派志士"],sugiyama:["杉山松助","長州藩士"],fukuoka:["福岡祐次郎","伊予松山出身の志士"]}[p.featuredId];
  const index=ikedayaFeaturedCardIndexes[p.featuredId];
  if(featured&&Number.isInteger(index))return{name:featured[0],role:featured[1],img:"assets/dialogue_banners/person_"+String(index+1).padStart(2,"0")+".webp"};
 }
 if(king==="ito")return{name:"伊東甲子太郎",role:"御陵衛士・盟主",img:"assets/dialogue_banners/ito_kashitaro_banner.webp"};
 if(king==="kusaka")return{name:"久坂玄瑞",role:"長州藩士",img:"assets/dialogue_banners/person_38.webp?v=face-final-20261107"};
 if(king==="saigo")return{name:"西郷隆盛",role:"新政府軍・薩摩藩",img:"assets/dialogue_banners/person_21.webp?v=face-final-20261107"};
 if(king==="todo")return{name:"藤堂平助",role:"御陵衛士",img:"assets/dialogue_banners/person_08.webp?v=face-final-20261107"};
 if(p.cid!=null){
  const data=(p.origin===0?D.F:D.E)[p.cid];
  if(data)return{name:data[0],role:data[1],img:"assets/dialogue_banners/person_"+String((p.origin===0?1:21)+p.cid).padStart(2,"0")+".webp?v=face-final-20261107"};
 }
 const m=D.mobs[(p.mob||0)%8];return{name:m[0],role:m[1],img:"assets/characters/mobs/"+m[2]};
}
const storyBannerTimers=[null,null];
let pendingStoryAwakeningKey=null;
// Reinforcement portraits use banner(..., true), which has no auto-dismiss timer.
// Clear that hold before compactResumeTurn queues the next turn illustration.
function closeStoryReinforcementBanner(side){
 clearTimeout(storyBannerTimers[side]);
 const panel=$(side===0?"playerStoryBanner":"enemyStoryBanner");
 panel.classList.remove("show-character");
}
function banner(s,p,hold=false){
 if(!p)return;
 const a=person(p),prefix=s===0?"player":"enemy",image=$(prefix+"StoryArt");
 const awakened=compactMode()&&compactFighterKey(p)!==pendingStoryAwakeningKey&&((compactCaptures[compactFighterKey(p)]||0)>=3||debugAwakenKey===compactFighterKey(p));
 $(prefix+"StoryBanner").classList.toggle("compact-awakened",awakened);
 $(prefix+"StoryName").textContent=a.name;
 const caption=document.createElement('span');caption.className='story-role-caption';caption.textContent=a.role;
 const piece=document.createElement('span');piece.className='story-role-piece';piece.textContent=label(p);
 $(prefix+"StoryRole").replaceChildren(caption,piece);
 // Prevent the previous officer art from flashing while the new image decodes.
 const imageRequest=String((Number(image.dataset.portraitRequest)||0)+1);
 image.dataset.portraitRequest=imageRequest;
 image.style.opacity="0";image.style.display="block";
 // Load each portrait off-screen first; do not reveal the previous character.
 const portraitLoader=new Image();
 portraitLoader.onload=()=>{
  if(image.dataset.portraitRequest!==imageRequest)return;
  image.src=a.img;image.style.opacity="1";
 };
 portraitLoader.onerror=()=>{if(image.dataset.portraitRequest===imageRequest)image.style.display="none"};
 portraitLoader.src=a.img;
 const panel=$(prefix+"StoryBanner"),currentEpoch=epoch;
 panel.classList.add("show-character");
 clearTimeout(storyBannerTimers[s]);
 // The stamp belongs to this officer's visible portrait, not the message board.
 if(!hold){
  const start=Date.now();
  const closeAfterVoice=()=>{
   if(currentEpoch!==epoch)return;
   const voice=activeStoryVoice;
   if(((voice&&!voice.paused&&!voice.ended)||battleVoiceActive)&&Date.now()-start<storyBannerVoiceLimitMs){storyBannerTimers[s]=setTimeout(closeAfterVoice,storyBannerVoicePollMs);return}
   panel.classList.remove("show-character");
  };
  storyBannerTimers[s]=setTimeout(closeAfterVoice,storyBannerMinimumMs);
 }
}
// As in the completed match, turn/status notices live inside the character banners.
// Keep one screen-reader announcement; do not insert a third board between the enemy hand and field.
function storyBannerMessage(message,side=g?.side??0,cardCountdown=null){
 $("storyStatus").textContent=message;
 $("playerBannerStatus").textContent=side===0?message:"新選組、待機中";
 $("enemyBannerStatus").textContent=side===1?message:"敵陣、布陣中";
 if(cardCountdown!==null){
  const target=$(side===0?"playerBannerStatus":"enemyBannerStatus");
  target.replaceChildren();
  const line=document.createElement("span");line.className="story-banner-status-line";
  const turn=document.createElement("span");turn.textContent=cardCountdown.turn;
  const count=document.createElement("span");count.className="story-banner-countdown";
  const title=document.createElement("img");title.src="assets/cards/incident-title-outline-v3.webp";title.alt="動乱の刻";title.width=1774;title.height=887;title.decoding="async";
  const remaining=document.createElement("span");remaining.textContent=cardCountdown.remaining;
  count.append(title,remaining);line.append(turn,count);target.append(line);
 }
}
// Main-game parity: pointer hover reveals the character without selecting or moving.
let storyHoverSide=null,storyHoverBase=[null,null];
function canPreviewStoryHover(){
 return !!g&&!ended&&!busy&&!compactTurnLocked&&(localTwoPlayer||g.side===0)
  &&!$("storyBattle").classList.contains("hidden")
  &&!$("compactTurnNotice").classList.contains("show")
  &&!$("compactIntroClash").classList.contains("show")
  &&!$("compactAwakenNotice").classList.contains("show")
  &&$("compactCardOverlay").classList.contains("hidden")
  &&$("compactIncidentStage").classList.contains("hidden")
  &&$("storyPopup").classList.contains("hidden");
}
function previewStoryUnit(p){
 if(!p||!canPreviewStoryHover())return;const side=p.s;
 const panel=$(side?"enemyStoryBanner":"playerStoryBanner");
 if(storyHoverSide!==null&&storyHoverSide!==side)restoreStoryHover();
 if(storyHoverSide===null){
  const prefix=side?"enemy":"player";
  storyHoverBase[side]={name:$(prefix+"StoryName").textContent,role:$(prefix+"StoryRole").textContent,src:$(prefix+"StoryArt").getAttribute("src")};
 }
 storyHoverSide=side;banner(side,p,true);
}
function restoreStoryHover(){
 if(storyHoverSide===null)return;
 const side=storyHoverSide,saved=storyHoverBase[side],prefix=side?"enemy":"player";
 storyHoverSide=null;storyHoverBase[side]=null;
 clearTimeout(storyBannerTimers[side]);$(prefix+"StoryBanner").classList.remove("show-character");
 // Closing the hover must not restore an old portrait while a new
 // officer is loading. The next banner() supplies the correct image.
 const art=$(prefix+"StoryArt");
 art.dataset.portraitRequest=String((Number(art.dataset.portraitRequest)||0)+1);
 art.style.opacity="0";
}
const storyPieceHover=window.ShinsengumiPieceHover.bind({
 root:$("storyBoard"),
 getPiece:index=>g?.board[Math.floor(index/g.w)]?.[index%g.w],
 canPreview:canPreviewStoryHover,
 onPreview:previewStoryUnit,
 onClear:restoreStoryHover
});
const label=p=>p.p?({飛:"龍",角:"馬",銀:"全",桂:"圭",香:"杏",歩:"と"}[p.t]||p.t):p.t;
const scenePreloadManifest={'-1':['assets/scenes/prologue-page-01-tenchu.webp','assets/scenes/prologue-page-02-ronin-road.webp','assets/scenes/prologue-page-03-shintokuji.webp','assets/scenes/prologue-page-04-mibu-resolve.webp?v=20261110-approved'],0:['assets/scenes/ikedaya-scene01-hijikata-yamazaki.webp?v=20261110-approved','assets/scenes/ikedaya-scene02-yamazaki-listening.webp?v=20261110-approved','assets/scenes/ikedaya-scene03-gathering.webp?v=20261110-approved','assets/scenes/ikedaya-scene04-kondo-entry.webp?v=20261110-approved'],1:['assets/scenes/kinmon-scene01-choshu-march.webp','assets/scenes/kinmon-scene02-gosho-defense.webp','assets/scenes/kinmon-scene03-shinsengumi-advance.webp?v=20261110-approved','assets/scenes/kinmon-scene04-kondo-rally.webp?v=20261110-approved'],2:['assets/scenes/aburanokoji-scene01-ito-departure.webp?v=20261110-approved','assets/scenes/aburanokoji-scene02-ito-speech.webp?v=20261110-approved','assets/scenes/aburanokoji-scene03-messenger-report.webp?v=20261110-approved','assets/scenes/aburanokoji-scene04-06-kondo-hijikata-talk.webp?v=20261110-approved','assets/scenes/aburanokoji-scene07-ito-todo.webp?v=20261110-approved','assets/scenes/aburanokoji-scene08-hijikata-resolve.webp?v=20261110-approved'],3:['assets/scenes/tobafushimi-scene01-taiseihokan.webp','assets/scenes/tobafushimi-scene03-satcho-nobori.webp','assets/scenes/tobafushimi-scene05-satcho-advance.webp','assets/scenes/tobafushimi-scene07-shinsengumi-ensemble.webp?v=20261110-approved'],4:['assets/scenes/epilogue-makoto-rain-flag.webp','assets/scenes/epilogue-yagi-dinner.webp?v=20261110-approved']};
const warmedStoryScenes=new Map();
function warmStoryScene(url){
 if(warmedStoryScenes.has(url))return warmedStoryScenes.get(url);
 const job=new Promise(resolve=>{
  const img=new Image();let done=false;
  const finish=ok=>{if(done)return;done=true;resolve(ok)};
  img.onload=()=>{if(img.decode)img.decode().then(()=>finish(true),()=>finish(true));else finish(true)};
  img.onerror=()=>finish(false);img.src=url;
 });
 warmedStoryScenes.set(url,job);return job;
}
function warmChapterScenes(chapter,firstOnly=false){
 const scenes=scenePreloadManifest[chapter]||[];
 if(scenes.length)void warmStoryScene(scenes[0]);
 if(!firstOnly&&scenes.length>1){
  // One at a time: the next spread is decoded before the reader turns the page.
  scenes.slice(1).reduce((promise,url)=>promise.then(()=>warmStoryScene(url)),Promise.resolve());
 }
}
// Start with the prologue and unlocked chapters on the selection screen;
// this does not block chapter selection or flood mobile bandwidth.
function warmStoryHomeArt(){
 warmChapterScenes(-1,true);
 const unlocked=Math.max(0,Math.min(4,unlock));
 setTimeout(()=>{if(!document.hidden)warmChapterScenes(0,true)},320);
 for(let i=1;i<unlocked;i++)setTimeout(()=>{if(!document.hidden)warmChapterScenes(i,true)},950+i*650);
}

function screenHome(){
 stopStoryVictoryBgm();storyPieceHover.reset();
 stopStoryClip("voice");stopStoryClip("fx");stopStoryQuakeBattle();
 $("storyPopup").classList.remove("compact-finale","compact-promotion");
 hideCompactFx();compactCaptures={};restoreStoryHover();
 // Chapter selection uses the existing restrained prologue score, never a new competing audio channel.
 if(localTwoPlayer)window.StoryBgm?.stop();else void window.StoryBgm?.play("prologue");
 $("storyDevToggle").textContent=devPreview?"🛠 開発テスト：終了して通常表示へ":"🛠 開発テスト：全章を表示";
 $("storyDevToggle").setAttribute("aria-pressed",String(devPreview));
 $("storyDevNote").hidden=!devPreview;
 chooseView("storyHome");warmStoryHomeArt();document.body.style.backgroundImage="";const el=$("storyChapters");el.replaceChildren();
 addButton("序章","壬生の誓い","物語のみ",true,false,()=>talk(-1));
 D.chapters.forEach((v,i)=>addButton("第"+(i+1)+"章",v.title,v.w+"×"+v.h+"盤",devPreview||unlock>=i,unlock>i,()=>talk(i)));
 addButton("終章",D.epilogue.title,"物語のみ",devPreview||unlock>=4,false,()=>talk(4));
 let collection=document.getElementById("storyKingCollection");
 if(!collection){collection=document.createElement("div");collection.id="storyKingCollection";collection.className="history-note";el.after(collection)}
 let earned=[];try{earned=JSON.parse(localStorage.getItem(KINGS)||"[]")}catch(e){}
 collection.replaceChildren();
 const owned=Array.isArray(earned)?earned:[];
 const caption=document.createElement("h2");caption.textContent="王将コレクション　"+owned.length+" / 4";collection.append(caption);
 const cards=document.createElement("div");cards.className="story-king-grid";
 const profile=[
  {id:"miyabe",name:"宮部鼎蔵",subtitle:"尊王攘夷派・池田屋事件",text:"肥後出身の尊攘派志士。池田屋事件で命を落とした。",art:"assets/collection/103.webp"},
  {id:"kusaka",name:"久坂玄瑞",subtitle:"長州藩・禁門の変",text:"吉田松陰に学んだ長州藩士。禁門の変で自刃した。",art:"assets/collection/38.webp"},
  {id:"ito",name:"伊東甲子太郎",subtitle:"御陵衛士・油小路事件",text:"新選組を離れて御陵衛士を結成。油小路事件で暗殺された。",art:"assets/collection/104.webp"},
  {id:"saigo",name:"西郷隆盛",subtitle:"薩摩藩・鳥羽伏見の戦い",text:"新政府側の有力指導者。ゲーム上の最終章王将。",art:"assets/collection/21.webp"}
 ];
 for(const p of profile){
  const card=document.createElement("button");card.className="story-king-card";const unlocked=owned.includes(p.id);
  card.setAttribute("aria-label",unlocked?p.name+"の人物情報":"未解放の人物カード");
  const picture=document.createElement("img");picture.alt=unlocked?p.name:"";picture.loading="lazy";picture.src=unlocked?p.art:"assets/cards/back/card-back-king-neutral.webp";
  const heading=document.createElement("strong");heading.textContent=unlocked?p.name:"？？？";
  card.append(picture,heading);card.onclick=()=>unlocked&&popup(p.name,p.subtitle+"\n"+p.text,[["閉じる",()=>{}]],p.art);cards.append(card);
 }
 collection.append(cards);
 function addButton(step,title,size,enabled,done,callback){
  const b=document.createElement("button");b.className="chapter"+(step==="序章"?" prologue-chapter":"")+(enabled?"":" locked")+(done?" completed":"");b.type="button";b.disabled=!enabled;
  const info=document.createElement("div"),mini=document.createElement("small"),heading=document.createElement("strong"),note=document.createElement("em"),board=document.createElement("div"),fig=document.createElement("span");
  mini.textContent=step+(done?"　✓ 突破":"");heading.textContent=title;note.textContent=devPreview?"開発用プレビュー（記録しません）":enabled?(done?"再挑戦可能":"出陣可能"):"前の章を突破すると開放";
  board.className="chapter-board";board.textContent=enabled?"⚔":"🔒";fig.textContent=size;board.append(fig);info.append(mini,heading,note);b.append(info,board);b.onclick=()=>{sfx("woodSlide");callback()};el.append(b);
 }
}
function talk(i){
 // Direct chapter clicks and "物語を進める" must both wait for this chapter's assets.
 if(window.ShinsengumiStartup&&!window.ShinsengumiStartup.isReady('story',i)){
  void window.ShinsengumiStartup.run('story',i,()=>talk(i));return;
 }
 window.StoryBgm?.play(i===4?"ending":"prologue");
 if(i===3)window.StoryBgm?.preload?.("toba").catch(error=>console.warn("鳥羽・伏見BGMを先読みできません",error));
 warmChapterScenes(i);
 stage=i;const ch=i===-1?D.prologue:i===4?D.epilogue:D.chapters[i];
 if(i>=0&&i<4)selectIntroArtwork(i);
 dialog=ch.intro;at=0;onEnd=i===-1||i===4?screenHome:()=>{
  // The final 「いざ、出陣」 always enters through the loading transition.
  if(window.ShinsengumiStartup)void window.ShinsengumiStartup.run('story',i,()=>battle(i),{forceOverlay:true,minVisibleMs:420});
  else battle(i);
 };
 $("dialogueScene").className="scene-art scene-"+ch.scene;$("dialogueDate").textContent=storyKanjiNumerals(ch.era);$("dialogueTitle").textContent=ch.title;chooseView("storyDialogue");line();
}
// The same approved Shinsengumi side is paired with each stage's own enemy art.
// Switching while the story pages are open lets the browser preload both images
// before the sortie animation begins.
function selectIntroArtwork(chapter){
 const stages=["ikedaya","kinmon","aburanokoji","toba_fushimi"];
 const key=stages[chapter];if(!key)return;
 const root=$("compactIntroClash"),pictures=root.querySelectorAll("picture");
 const enemy=pictures[0],shinsengumi=pictures[1];
 enemy.querySelector("source").srcset=`assets/visuals/intro_${key}_enemy_mobile.webp`;
 enemy.querySelector("img").src=`assets/visuals/intro_${key}_enemy_pc.webp`;
 shinsengumi.querySelector("source").srcset="assets/visuals/intro_shinsengumi_team_mobile.webp";
 shinsengumi.querySelector("img").src="assets/visuals/intro_shinsengumi_team_pc.webp";
}
function storyKanjiNumerals(value){
 const digits="〇一二三四五六七八九";
 return String(value).replace(/[0-9０-９]/g,ch=>digits[(ch.charCodeAt(0)-(ch<="9"?48:65296))]);
}
/* Ruby only for unfamiliar historical names and terms, preserving the source text. */
const storyRubyReadings=[
 ["伊東甲子太郎","いとうかしたろう"],["宮部鼎蔵","みやべていぞう"],
 ["久坂玄瑞","くさかげんずい"],["山崎烝","やまざきすすむ"],
 ["芹沢鴨","せりざわかも"],["桂小五郎","かつらこごろう"],
 ["蛤御門","はまぐりごもん"],["御陵衛士","ごりょうえじ"],
 ["京都守護職","きょうとしゅごしょく"],["尊王攘夷","そんのうじょうい"],
 ["尊攘派","そんじょうは"],["元治","げんじ"],
 ["桑名","くわな"],["会津","あいづ"],["肥後","ひご"],
 ["砲声","ほうせい"],["精鋭","せいえい"],["間者","かんじゃ"],
 ["壬生浪士組","みぶろうしぐみ"],["壬生","みぶ"],
 ["天誅","てんちゅう"],["不穏","ふおん"],["徳川家茂","とくがわいえもち"],
 ["上洛警護","じょうらくけいご"],["清河八郎","きよかわはちろう"],
 ["建言","けんげん"],["浪士組","ろうしぐみ"],["試衛館","しえいかん"],
 ["松平容保","まつだいらかたもり"],["諸藩","しょはん"],
 ["志士","しし"],["旅籠","はたご"],["三条小橋","さんじょうこばし"],
 ["帝","みかど"],["大政奉還","たいせいほうかん"],
 ["旧幕府軍","きゅうばくふぐん"],["甲陽鎮撫隊","こうようちんぶたい"],
 ["下総流山","しもうさながれやま"],["投降","とうこう"],
 ["榎本武揚","えのもとたけあき"],["箱館","はこだて"],
 ["終焉","しゅうえん"],["慶応","けいおう"],["洛中","らくちゅう"],
 ["油小路","あぶらのこうじ"],["鳥羽","とば"],["伏見","ふしみ"],
 ["参謀","さんぼう"],["相容れぬ","あいいれぬ"],["傍ら","かたわら"],["抜刀","ばっとう"],
 ["坂本龍馬","さかもとりょうま"],["尽力","じんりょく"],["薩長同盟","さっちょうどうめい"],
 ["武力衝突","ぶりょくしょうとつ"],["参陣","さんじん"],["硝煙","しょうえん"],
 ["轟く","とどろく"],["銃弾","じゅうだん"],["死線","しせん"]
];
const storyRubyPattern=new RegExp(storyRubyReadings.map(p=>p[0]).sort((a,b)=>b.length-a.length).join("|"),"g");
const storyRubyMap=new Map(storyRubyReadings);
function renderStoryNarration(textValue){
 const target=$("dialogueBody");
 // These editorial line breaks were composed for desktop. On small phones they
 // become separate columns and clip the paper; retain every character and ruby.
 const compactText=window.matchMedia?.('(max-width:600px)').matches?String(textValue).replace(/\n/g,''):textValue;
 const text=storyKanjiNumerals(compactText),fragment=document.createDocumentFragment();
 let start=0,match;
 storyRubyPattern.lastIndex=0;
 while((match=storyRubyPattern.exec(text))!==null){
  if(match.index>start)fragment.append(document.createTextNode(text.slice(start,match.index)));
  const ruby=document.createElement("ruby"),rt=document.createElement("rt");
  ruby.append(document.createTextNode(match[0]));rt.textContent=storyRubyMap.get(match[0]);ruby.append(rt);
  fragment.append(ruby);start=match.index+match[0].length;
 }
 if(start<text.length)fragment.append(document.createTextNode(text.slice(start)));
 target.replaceChildren(fragment);
}
function line(){
 if(at>=dialog.length){const fn=onEnd;onEnd=null;fn();return}
 // 池田屋は冒頭の二ページで同じ画を使い、以降の画を一ページずつ送る。
 $("dialogueScene").classList.toggle("ikedaya-first-page",stage===0&&at<=1);
 $("dialogueScene").classList.toggle("ikedaya-second-page",stage===0&&at===2);
 $("dialogueScene").classList.toggle("ikedaya-third-page",stage===0&&at===3);
 $("dialogueScene").classList.toggle("ikedaya-fourth-page",stage===0&&at===4);
 $("dialogueScene").classList.toggle("kinmon-first-page",stage===1&&at===0);
 $("dialogueScene").classList.toggle("kinmon-second-page",stage===1&&at===1);
 $("dialogueScene").classList.toggle("kinmon-third-page",stage===1&&at===2);
 $("dialogueScene").classList.toggle("kinmon-fourth-page",stage===1&&at===3);
 $("dialogueScene").classList.toggle("aburanokoji-first-page",stage===2&&at===0);
 $("dialogueScene").classList.toggle("aburanokoji-second-page",stage===2&&at===1);
 $("dialogueScene").classList.toggle("aburanokoji-third-page",stage===2&&at===2);
 $("dialogueScene").classList.toggle("aburanokoji-talk-pages",stage===2&&at>=3&&at<=5);
 $("dialogueScene").classList.toggle("aburanokoji-seventh-page",stage===2&&at===6);
 $("dialogueScene").classList.toggle("aburanokoji-eighth-page",stage===2&&at===7);
 $("dialogueScene").classList.toggle("tobafushimi-taiseihokan-pages",stage===3&&at<=1);
 $("dialogueScene").classList.toggle("tobafushimi-satcho-nobori-page",stage===3&&(at===2||at===3));
 $("dialogueScene").classList.toggle("tobafushimi-satcho-advance-pages",stage===3&&(at===4||at===5));
 $("dialogueScene").classList.toggle("tobafushimi-shinsengumi-ensemble-pages",stage===3&&at>=6&&at<=10);
 $("dialogueScene").classList.toggle("epilogue-rain-flag-pages",stage===4&&at<=3);
 $("dialogueScene").classList.toggle("epilogue-yagi-dinner-page",stage===4&&at===4);
 // 序章の絵巻はページ単位で切り替える。未制作ページは従来の背景を維持。
 $("dialogueScene").classList.toggle("prologue-first-page",stage===-1&&at===0);
 $("dialogueScene").classList.toggle("prologue-second-page",stage===-1&&at===1);
 $("dialogueScene").classList.toggle("prologue-third-page",stage===-1&&at===2);
 $("dialogueScene").classList.toggle("prologue-fourth-page",stage===-1&&at===3);
 const isNarration=dialog[at][0]==="語り";
 $("dialogueSpeaker").textContent=isNarration?"":dialog[at][0];
 $("dialogueSpeaker").hidden=isNarration;
 $("storyDialogue").classList.toggle("vertical-narration",isNarration);
 $("storyDialogue").classList.toggle("prologue-typeset",isNarration);
 if(isNarration)renderStoryNarration(dialog[at][1]);
 else $("dialogueBody").textContent=dialog[at][1];
 $("dialogueCount").textContent=storyKanjiNumerals(at+1)+"／"+storyKanjiNumerals(dialog.length);
 const sortie=at===dialog.length-1&&stage>=0&&stage<4;
 $("dialogueNext").textContent=sortie?"いざ、出陣":at===dialog.length-1?"物語を閉じる":"〉";
 $("dialogueNext").setAttribute("aria-label",sortie?"いざ、出陣":at===dialog.length-1?"物語を閉じる":"次のページ");
 $("dialoguePrev").disabled=at===0;
 $("dialoguePrev").setAttribute("aria-label","前のページ");
 $("dialogueNext").classList.toggle("story-sortie-button",sortie);
 $("dialogueNext").closest(".dialogue-foot").classList.toggle("story-sortie-foot",sortie);
}
function battle(i,oilFormation=null,retry=false){
 // Oil-koji formation choice happens before the battle and its opening animation.
 // Only swap the friendly rook with one front-rank pawn; all other pieces stay fixed.
 // Start Oil-koji in the standard formation without a selection popup.
 if(i===2&&oilFormation===null)oilFormation=2;
 stopStoryVictoryBgm();
 $("storyPopup").classList.remove("compact-finale","compact-promotion");
 document.body.classList.remove("story-opening-viewport-lock");
 hideCompactFx();compactCaptures={};oilAmbushAnimating=false;ikedayaReinforcing=false;ikedayaPendingPositions.clear();kinmonSatsumaReinforcing=false;kinmonSatsumaPendingPositions.clear();
 window.StoryBgm?.play(i===3?"toba":i===0||i===2?"battle01":"battle02");
 // A retry bypasses the sortie dialogue, so explicitly repeat its voice cue.
 if(retry){window.StoryBgm?.unlock();playStorySortieVoice()};
 epoch++;stage=i;g=new window.StoryEngine(i);selected=null;busy=false;ended=false;weapons=[];debugModified=false;
 // A human-vs-human battle begins with the authored reserve officers already
 // deployed. Skip scripted arrivals without leaving either side short-handed.
 if(localTwoPlayer){
  if(i===0&&Array.isArray(g.ikedayaReserve)){
   for(const entry of g.ikedayaReserve)if(!g.board[entry.y][entry.x])g.board[entry.y][entry.x]=entry.piece;
   g.ikedayaReinforced=true;
  }
  if(i===1&&Array.isArray(g.kinmonSatsumaReserve)){
   for(const entry of g.kinmonSatsumaReserve)if(!g.board[entry.y][entry.x])g.board[entry.y][entry.x]=entry.piece;
   g.kinmonSatsumaReinforced=true;
  }
 }
 if(i===2&&[1,3].includes(oilFormation)){
  const front=g.board[4];
  [front[2],front[oilFormation]]=[front[oilFormation],front[2]];
  // Revert on any future rule change that makes this starting setup invalid.
  if(g.check(g.board,0)||g.check(g.board,1)||!g.legal(0).length||!g.legal(1).length)
   [front[2],front[oilFormation]]=[front[oilFormation],front[2]];
 }
 if(i===2&&!localTwoPlayer)g.startOilAmbush(); // Human match: full 5x6 opposing rosters from move one.
 const ch=D.chapters[i];$("battleChapter").textContent=ch.era;$("battleTitle").textContent=ch.title+(localTwoPlayer?' ／ 二人対戦':'');
 if(localTwoPlayer){
  document.body.classList.add('story-two-player');
  $("battleQuit").textContent='タイトルへ';
  $("storyHand0").parentElement.querySelector('span').textContent='先手・新選組の持ち駒';
  $("storyHand1").parentElement.querySelector('span').textContent='後手・敵軍の持ち駒';
 }
 const board=$("storyBoard");board.dataset.stage=i;board.style.setProperty("--cols",ch.w);board.style.setProperty("--rows",ch.h);
 board.classList.toggle("small-board",ch.w===5);
 document.body.style.backgroundImage="linear-gradient(#10172138,#07101660),url('assets/backgrounds/story/"+ch.scene+"-bg-v2.webp'),url('assets/backgrounds/seasons/kyoto-autumn.webp')";
 document.body.style.backgroundSize="cover";document.body.style.backgroundAttachment="fixed";
 for(const side of [0,1]){clearTimeout(storyBannerTimers[side]);$(side?"enemyStoryBanner":"playerStoryBanner").classList.remove("show-character","compact-awakened")}
 chooseView("storyBattle");ensureLocalItoControls();render();
 if(compactMode()){
  busy=true;render();
  // Position the actual battle board before activating the opening presentation lock.
  // The story page header and chapter heading make document scrollY=0 unreliable.
  const boardRect=$("storyBoard").getBoundingClientRect();
  const boardCenter=window.scrollY+boardRect.top+boardRect.height/2;
  const desiredY=Math.max(0,Math.round(boardCenter-window.innerHeight/2-36));
  window.scrollTo(0,desiredY);
  document.body.classList.add("story-opening-viewport-lock");
  compactIntro();
 }
}
// First-act Aburanokoji abilities were previously AI-only.  The second
// human player receives the same bounded actions, without the AI choosing for them.
function ensureLocalItoControls(){
 if(!localTwoPlayer||g?.oilPhase!==1)return;
 let bar=$("localItoControls");if(bar)return;
 bar=document.createElement('div');bar.id='localItoControls';bar.hidden=true;
 bar.style.cssText='flex-wrap:wrap;gap:8px;justify-content:center;max-width:520px;margin:8px auto';
 const add=(id,label,handler)=>{const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.onclick=handler;bar.append(b)};
 add('localItoDig','伊東・穴掘り',localItoDig);
 add('localItoRifle','伊東・鉄砲',localItoRifle);
 add('localItoPass','伊東・手番をパス',localItoPass);
 $("storyBoard").after(bar);
}
function updateLocalItoControls(){
 const bar=$("localItoControls");if(!bar)return;
 const active=localTwoPlayer&&stage===2&&g?.oilPhase===1&&g.side===1&&!ended&&!busy&&!compactTurnLocked;
 bar.hidden=!active;bar.style.display=active?'flex':'none';if(!active)return;
 const noMoves=g.legal(1).length===0;
 $("localItoDig").disabled=!!g.holes.length||(g.oilDigCount||0)>=3;
 $("localItoRifle").disabled=!!g.oilItoGunUsed||!g.oilItoGunTarget?.();
 $("localItoPass").hidden=!noMoves;
}
function localItoDig(){
 if(!localTwoPlayer||stage!==2||g?.oilPhase!==1||g.side!==1||ended||busy||compactTurnLocked)return;
 const pit=g.oilItoDig();
 if(!pit){storyBannerMessage('伊東の穴掘りは今の局面では使えない',1);return}
 compactQuakeCracks=[{y:pit.y,x:pit.x}];compactSound('quake');render();
 const id=epoch;setTimeout(()=>{if(id!==epoch)return;compactQuakeCracks=[];render();storyBannerMessage('伊東、退路に穴を掘った！ 続けて駒を指せ',1)},700);
}
function localItoPass(){
 if(!localTwoPlayer||stage!==2||g?.oilPhase!==1||g.side!==1||ended||busy||compactTurnLocked||g.legal(1).length)return;
 g.side=0;g.ply++;g.last=null;selected=null;compactResumeTurn();
}
async function localItoRifle(){
 if(!localTwoPlayer||stage!==2||g?.oilPhase!==1||g.side!==1||ended||busy||compactTurnLocked||g.oilItoGunUsed)return;
 const shot=g.oilItoGunTarget?.();if(!shot)return;
 g.oilItoGunUsed=true;busy=true;compactTurnLocked=true;selected=null;render();
 const game=epoch,valid=()=>game===epoch&&!ended;
 storyBannerMessage('伊東甲子太郎「鉄砲！」',1);
 try{
  await new Promise(resolve=>playGestureAudio(kabukiVoice.rifle,resolve,'voice',3.5,valid));
  if(!valid())return;
  await later(350);if(!valid())return;
  await window.StoryWeapons.fire(g,'rifle',valid,kind=>{
   if(kind==='rifle')playGestureAudio('assets/audio/story/master_rifle.mp3',null,'fx',2.5,valid);
   else sfx(kind);
  },async(result,hit)=>{
   if(!valid()||!hit)return;
   const mark=result.y+':'+result.x;compactBloodMarks.push(mark);render();
   await playCasualtyCry();compactBloodMarks=compactBloodMarks.filter(v=>v!==mark);
   if(valid())render();
  },1,shot,()=>new Promise(resolve=>playGestureAudio('assets/audio/sfx/purge_shukusei.mp3',resolve,'fx',2.5,valid)));
 }catch(error){console.error('対人・伊東の鉄砲演出',error)}
 if(!valid())return;
 g.side=0;g.ply++;g.last=null;busy=false;compactTurnLocked=false;
 const result=g.state();if(result)finish(result.winner,result.why);else compactResumeTurn();
}
function render(){
 storyPieceHover.reset();
 if(!g||$("storyBattle").classList.contains("hidden"))return;
 const root=$("storyBoard");
 const inputLocked=!canPreviewStoryHover();
 root.classList.toggle("input-locked",inputLocked);
 root.setAttribute("aria-disabled",String(inputLocked));
 root.replaceChildren();
 const active=localSide();
 const legal=!inputLocked?g.legal(active):[];
 const defending=!inputLocked&&g.side===active&&g.check(g.board,active);
 // Highlight only moves that ACTUALLY defend the king; the special rule also
 // permits risky moves, but those require an explicit confirmation.
 const safeDefense=defending?legal.filter(m=>{
  const B=g.clone(g.board),H=g.handClone(g.hands);g.act(B,H,active,m);return !g.check(B,active);
 }):[];
 const defendingPieces=defending?new Set(safeDefense.filter(m=>!m.drop).map(m=>m.y+":"+m.x)):null;
 const defendingDrops=defending?new Set(safeDefense.filter(m=>m.drop).map(m=>m.t)):null;
 const targets=selected?legal.filter(m=>selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x):[];
 const attackers=deferredCheckVisualEpoch===epoch||oilAmbushAnimating||ikedayaReinforcing?{attackers:new Set(),rays:new Set(),paths:[]}:compactCheckSources();
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
  const p=g.board[y][x],btn=document.createElement("button");btn.type="button";btn.className="sq";btn.setAttribute("role","gridcell");
  // During a promotion choice, show the moving piece on the captured square
  // without committing the engine move or displaying it twice.
  const preview=promotionCapturePreview?.showMover?promotionCapturePreview:null;
  const previewDestination=preview?.y===y&&preview?.x===x;
  const previewOrigin=preview?.fromY===y&&preview?.fromX===x;
  const held=promotionVisualHold?.y===y&&promotionVisualHold.x===x?promotionVisualHold.piece:null;
  const captureHidden=promotionCapturePreview?.hide&&promotionCapturePreview.y===y&&promotionCapturePreview.x===x;
   // Once the escort touches the captive, remove the actual board token from
   // the rendered DOM. CSS-only visibility was vulnerable to later redraws.
   const shown=captureHidden?null:previewDestination?preview.piece:previewOrigin?null:held||p;
  btn.setAttribute("aria-label",(y+1)+"段"+(x+1)+"列 "+(shown?person(shown).name+" "+label(shown):"空きマス"));
  if(g.last?.y===y&&g.last.x===x)btn.classList.add("last");
  if(selected&&!selected.drop&&selected.y===y&&selected.x===x)btn.classList.add("selected");
  if(targets.some(m=>m.Y===y&&m.X===x))btn.classList.add(p&&p.s!==active?"capture-hint":"hint");
  if(promotionRise?.y===y&&promotionRise.x===x)btn.classList.add('story-promotion-rise');
  if(promotionCapturePreview?.hide&&promotionCapturePreview.y===y&&promotionCapturePreview.x===x)btn.classList.add('promotion-capture-preview');
  if(deferredCheckVisualEpoch!==epoch&&!oilAmbushAnimating&&!ikedayaReinforcing&&p?.t==="玉"&&g.check(g.board,p.s))btn.classList.add("king-in-check");
  if(defendingPieces?.has(y+":"+x))btn.classList.add("check-defender");
  if(attackers.attackers.has(y+":"+x))btn.classList.add("compact-check-attacker");
  if(attackers.rays.has(y+":"+x))btn.classList.add("compact-check-ray");
  if(compactIncidentMarks.includes(y+":"+x)&&!compactQuakeMove)btn.classList.add("compact-incident-target");
  if(compactQuakeMove&&(compactQuakeMove.y===y&&compactQuakeMove.x===x||compactQuakeMove.Y===y&&compactQuakeMove.X===x))btn.classList.add("compact-quake-mark");
  if(compactQuakeMove?.y===y&&compactQuakeMove.x===x){
   btn.classList.add("compact-quake-origin");
   const cell=root.getBoundingClientRect().width/g.w;
   btn.style.setProperty("--quake-dx",(compactQuakeMove.X-x)*cell+"px");
   btn.style.setProperty("--quake-dy",(compactQuakeMove.Y-y)*cell+"px");
  }
  if(compactQuakeLanding?.y===y&&compactQuakeLanding.x===x)btn.classList.add("compact-quake-landing");
  if(compactQuakeCracks.some(v=>v.y===y&&v.x===x))btn.classList.add("compact-quake-crack");
  if(compactMode()&&g.isHole(y,x))btn.classList.add("compact-hole");
  if(compactClosingHoles.some(hole=>hole.y===y&&hole.x===x))btn.classList.add("compact-hole-closing",...(compactHoleFading?["compact-hole-fading"]:[]));
  if(compactBloodMarks.includes(y+":"+x))btn.classList.add("compact-blood");
  if(compactArrival?.y===y&&compactArrival.x===x)btn.classList.add("compact-arrival");
  if(shown){const token=document.createElement("span");token.className="story-token"+(shown.s?" enemy":"")+(shown.p?" promoted":"");token.textContent=label(shown);token.setAttribute("aria-hidden","true");btn.append(token);if(ikedayaPendingPositions.has(y+":"+x))token.style.opacity="0"}
  btn.onclick=()=>square(y,x);root.append(btn);
 }
 if(attackers.paths.length){
  const ns="http://www.w3.org/2000/svg",overlay=document.createElementNS(ns,"svg");
  overlay.setAttribute("class","compact-check-lines");overlay.setAttribute("viewBox",`0 0 ${g.w*100} ${g.h*100}`);overlay.setAttribute("preserveAspectRatio","none");overlay.setAttribute("aria-hidden","true");
  for(const path of attackers.paths){const line=document.createElementNS(ns,"line");
   line.setAttribute("x1",String(path.fromX*100+50));line.setAttribute("y1",String(path.fromY*100+50));
   line.setAttribute("x2",String(path.toX*100+50));line.setAttribute("y2",String(path.toY*100+50));overlay.append(line);
  }root.append(overlay);
 }
 for(const s of [0,1]){
  const hand=$("storyHand"+s);hand.replaceChildren();const groups={};g.hands[s].forEach(p=>groups[p.t]=(groups[p.t]||0)+1);
  if(!g.hands[s].length)hand.textContent="なし";
  const names={歩:"fu",香:"kyosha",桂:"keima",銀:"gin",金:"kin",角:"kaku",飛:"hisha"};
  for(const t of ["飛","角","金","銀","桂","香","歩"]){if(!groups[t])continue;
   const b=document.createElement("button");b.type="button";b.className="story-hand-piece";b.dataset.piece=t;b.setAttribute("aria-label",(s===0?"新選組":"敵陣")+"の持ち駒 "+t+" "+groups[t]+"枚");b.disabled=ended||busy||compactTurnLocked||s!==active||(!localTwoPlayer&&s===1);
   const fig=document.createElement("img");fig.className="story-hand-art story-hand-figure";fig.src="assets/sprites/figures/"+(s===0?"shinsengumi_back":"saccho_front")+".webp";fig.alt="";fig.draggable=false;fig.decoding="async";
   const letter=document.createElement("img");letter.className="story-hand-art story-hand-letter";letter.src="assets/sprites/letters/normal_"+names[t]+".webp";letter.alt="";letter.draggable=false;letter.decoding="async";
   const fallback=document.createElement("span");fallback.className="story-hand-fallback";fallback.textContent=t;
   const showFallback=()=>{fig.style.display="none";letter.style.display="none";fallback.style.display="grid"};fig.onerror=showFallback;letter.onerror=showFallback;
   const count=document.createElement("span");count.className="story-hand-count";count.textContent="×"+groups[t];count.setAttribute("aria-hidden","true");b.append(fig,letter,fallback,count);
   if(s===active&&defendingDrops?.has(t))b.classList.add("check-defender");
   if(s===active&&selected?.drop&&selected.t===t)b.classList.add("selected");b.onclick=()=>{if(b.disabled)return;selected={drop:true,t};render()};hand.append(b)}
 }
 const countdown=localTwoPlayer?"":stage===2&&g?.oilPhase===1?"伊東甲子太郎を討て！":compactMode()&&!ended?(compactIncident?"動乱の刻・事件札を確認中":`動乱の刻まで${compactCardRemaining()}手`):"";
 const turnText=ended?'対局終了':busy?'演出中…':localTwoPlayer?
  (g.side?'後手・敵軍の手番！':'先手・新選組の手番！')+(g.check(g.board,g.side)?'　⚠王手！':''):
  g.side?'敵軍、思案中…'+(g.check(g.board,1)?'　⚠王手':''):'新選組の手番！'+(g.check(g.board,0)?'　⚠王手！ 防ぐか、覚悟して主君を見捨てる':'');
 const showCountdown=countdown&&!busy;
 storyBannerMessage(turnText+(showCountdown?"　"+countdown:""),g.side,showCountdown?{turn:turnText,remaining:g?.oilPhase===1?"・伊東を討て！":compactIncident?"・事件札を確認中":`まで${compactCardRemaining()}手`}:null);
 $("storyStatus").classList.toggle("check-status",!oilAmbushAnimating&&!ikedayaReinforcing&&!ended&&g.check(g.board,g.side));
 $("compactCardCountdown").textContent=countdown;
 updateLocalItoControls();
 const canTest=!localTwoPlayer&&!ended&&!busy&&!compactTurnLocked&&!compactIncident&&!pendingWeaponDisplay&&g.side===0;
 for(const id of ["debugCard","debugOilAmbush","debugQuake","debugReinforce","debugDesert","debugPurge","debugKill","debugAwaken","debugCannon","debugRifle","debugTurn","debugWin","debugLose","debugFx","debugVoice0","debugVoice1"]){
  $(id).disabled=!canTest||((id==="debugCannon"||id==="debugRifle")&&stage!==3)||(id==="debugOilAmbush"&&(stage!==2||g.oilPhase!==1));
 }
}
function square(y,x){
 if(ended||busy||compactTurnLocked||(!localTwoPlayer&&g.side!==0))return;
 const active=localSide(),legal=g.legal(active),p=g.board[y][x];
 if(selected){
  const m=legal.find(m=>m.Y===y&&m.X===x&&(selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x));
  if(m){
   const proceed=()=>{
    const unit=m.drop?g.hands[active].find(v=>v.t===m.t):g.board[m.y][m.x];
    if(!m.drop&&g.promoted(unit,m.y,m.Y)&&!g.forced(unit,m.Y)){
     const showPromotionChoice=(capturePreplayed=false)=>{
      const modal=$("storyPopup");modal.classList.toggle("compact-promotion",compactMode());
      popup("成るか、成らぬか","この駒を成り駒にしますか？",[["成る",()=>{modal.classList.remove("compact-promotion");makeMove(m,true,capturePreplayed)}],["成らぬ",()=>{modal.classList.remove("compact-promotion");makeMove(m,false,capturePreplayed)}]]);
      const options=[...$("popupButtons").querySelectorAll("button")];
      options.forEach(button=>button.disabled=true);
      playStoryClip(kabukiVoice.promotion,"voice",()=>{if(!modal.classList.contains("hidden"))options.forEach(button=>button.disabled=false)});
     };
     const previewThenChoose=async(capturePreplayed=false,capture=null)=>{
      const game=epoch;busy=true;selected=null;
      const valid=()=>game===epoch&&!ended&&!$("storyBattle").classList.contains("hidden");
      try{
       await window.ShinsengumiBattleRules.runCapturePromotionSequence({
        capture,valid,
        choose:()=>{busy=false;render();showPromotionChoice(capturePreplayed)}
       });
      }catch(error){console.error("物語・成り演出復旧",error);if(valid()){busy=false;promotionCapturePreview=null;render()}}
     };
     const captive=!m.drop?g.board[m.Y][m.X]:null;
     const sourceKey=compactFighterKey(unit);
     const capturePlan=captive?window.ShinsengumiBattleRules.captureResult({captured:true,drop:false,previous:compactCaptures[sourceKey]||0,hitokiri:true}):null;
     if(captive&&!capturePlan.lethal&&!(stage===2&&g.oilPhase===1&&captive.king==='ito')){
      const game=epoch;busy=true;selected=null;
      promotionCapturePreview={y:m.Y,x:m.X,hide:false};render();
      const takeCaptive=()=>{if(game===epoch&&promotionCapturePreview?.y===m.Y&&promotionCapturePreview.x===m.X){promotionCapturePreview={y:m.Y,x:m.X,hide:true};render()}};
      const capture=async()=>{
       await new Promise(resolve=>{
        let escortDone=false,voiceDone=false;
        const finish=()=>{if(escortDone&&voiceDone)resolve()};
        window.ShinsengumiBattleRules.runCaptureEscort({
         valid:()=>game===epoch&&!ended,
         animate:(done,contact)=>animateCompactEscort(active,m.Y,m.X,captive,done,()=>{takeCaptive();contact()}),
         onContact:()=>sfx("capture",()=>{voiceDone=true;finish()}),
         onFinished:()=>{escortDone=true;finish()}
        });
       });
       await later(300);
      };
      void previewThenChoose(true,capture);return;
     }
     void previewThenChoose();return;
    }makeMove(m,false);
   };
   if(g.allowAbandonKing&&g.check(g.board,active)){
    const B=g.clone(g.board),H=g.handClone(g.hands);g.act(B,H,active,m);
    if(g.check(B,active)){
     popup("主君を見捨てるのか！","王手を防がず別の手を指します。次の一手で王を討ち取られ、敗北する危険があります。",[["忠義を尽くす",()=>{}],["覚悟して指す",proceed]]);
     return;
    }
   }
   proceed();return;
  }
 }
 if(p?.s!==undefined&&p.s!==active){banner(p.s,p);return}
 selected=p?.s===active?{y,x}:null;render();if(p)banner(p.s,p);
}
async function oilAmbushReveal(){
 const game=epoch,board=$("storyBoard");
 let completed=false;
 const complete=()=>{
  if(completed||game!==epoch||ended)return;
  completed=true;clearTimeout(recovery);
  oilAmbushAnimating=false;compactTurnLocked=false;busy=false;selected=null;g.side=0;
  $("storyPopup").classList.add("hidden");
  $("compactTurnNotice").classList.remove("show");
  $("compactAwakenNotice").classList.remove("show");
  $("compactActionLayer").replaceChildren();
  window.StoryBgm?.unlock();window.StoryBgm?.restart?.("battle01");
  render();
  // The check ray and warning belong to the completed formation, not arrivals.
  if(g.check(g.board,0))compactSound("check");
 };
 const recovery=setTimeout(()=>{if(game===epoch&&!completed){
  console.warn("油小路援軍イベントの操作ロックを復旧");
  complete();
 }},75000);
 // Even a pit that expired on the fatal move closes AFTER the slash.
 if(g.holes.length||compactClosingHoles.length){
  busy=true;compactTurnLocked=true;
  const closing=new Map([...compactClosingHoles,...g.holes].map(({y,x})=>[y+":"+x,{y,x}]));
  compactClosingHoles=[...closing.values()];g.holes=[];render();
  await compactFadeExpiredHoles(game);
  if(game!==epoch||ended)return;
 }
 // Keep a visual copy of each friendly piece until the actual collision beat.
 const before=[...board.children].map(cell=>cell.querySelector(".story-token")?.cloneNode(true)||null);
 const previousKing=[...board.children].findIndex(cell=>cell.getAttribute("aria-label")?.includes("近藤勇 玉"));
 oilAmbushAnimating=true;
 const event=g.triggerOilAmbush();
 if(event){g.ply=0;compactCaptures={};}
 if(!event){completed=true;clearTimeout(recovery);oilAmbushAnimating=false;compactTurnLocked=false;busy=false;render();popup("布陣を整えられません","近藤勇の退路が確保できません。再挑戦してください。",[["再挑戦",()=>battle(2)]]);return}
 busy=true;compactTurnLocked=true;selected=null;render();
 const casualties=new Set(event.casualties.map(p=>p.y*g.w+p.x));
 const arrivals=[];
 for(let y=0;y<2;y++)for(let x=0;x<g.w;x++)if(g.board[y][x]?.s===1)arrivals.push(y*g.w+x);
 const ghosts=new Map();
 for(const i of casualties){
  const old=before[i],cell=board.children[i];if(!old||!cell)continue;
  old.classList.add("oil-ambush-victim");
  cell.append(old);ghosts.set(i,old);
 }
 for(const i of arrivals){const token=board.children[i]?.querySelector(".story-token.enemy");if(token)token.style.opacity="0"}
 if(event.retreat&&previousKing>=0){
  const next=event.retreat.y*g.w+event.retreat.x;
  const token=board.children[next]?.querySelector(".story-token");
  if(token?.animate){
   const oldRect=board.children[previousKing]?.getBoundingClientRect();
   const newRect=board.children[next]?.getBoundingClientRect();
   if(oldRect&&newRect)token.animate([{transform:`translate(${oldRect.left-newRect.left}px,${oldRect.top-newRect.top}px)`},{transform:"translate(0,0)"}],{duration:520,easing:"ease-out"});
  }
 }
 // Reuse the approved reinforcement voice, then the desertion footsteps.
 await new Promise(resolve=>playStoryClip(compactCardVoices["援軍"],"voice",resolve));
 if(game!==epoch||ended)return;
 // Each reinforcement gets its own running footsteps, synchronized to its arrival.
 const layer=$("compactActionLayer");
 layer.replaceChildren();
 for(const i of arrivals){
  if(game!==epoch||ended){layer.replaceChildren();return}
  const cell=board.children[i],token=cell?.querySelector(".story-token.enemy");
  if(!token)continue;
  // Clone the exact board piece; preserve the glyph, token image, text position,
  // 180-degree enemy orientation and all responsive computed styles.
  const tokenRect=token.getBoundingClientRect(),style=getComputedStyle(token);
  const runner=document.createElement("span");
  runner.className="oil-ambush-runner";runner.setAttribute("aria-hidden","true");
  Object.assign(runner.style,{
   position:"fixed",zIndex:"170",pointerEvents:"none",display:"block",
   left:tokenRect.left+"px",top:tokenRect.top+"px",
   width:tokenRect.width+"px",height:tokenRect.height+"px"
  });
  const replica=token.cloneNode(true);
  for(const property of style)replica.style.setProperty(property,style.getPropertyValue(property),style.getPropertyPriority(property));
  Object.assign(replica.style,{
   position:"absolute",left:"0",top:"0",right:"auto",bottom:"auto",inset:"auto",
   width:tokenRect.width+"px",height:tokenRect.height+"px",maxWidth:"none",maxHeight:"none",
   margin:"0",opacity:"1",animation:"none",transition:"none"
  });
  runner.append(replica);layer.append(runner);
  // Two distinct footfalls per arriving piece; unlocked Web Audio also works on iOS.
  let runningFootsteps=true;
  const footstep=()=>playGestureAudio("assets/audio/sfx/step_soil.mp3",null,"fx",2.5,()=>runningFootsteps&&game===epoch&&!ended);
  footstep();
  const secondStep=setTimeout(()=>{if(runningFootsteps&&game===epoch&&!ended)footstep()},390);
  const startY=-Math.max(160,Math.min(340,tokenRect.top+100));
  if(runner.animate&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
   const animation=runner.animate([
    {opacity:0,transform:`translate(65px,${startY}px) scale(.76)`},
    {opacity:1,offset:.18,transform:`translate(45px,${startY*.7}px) scale(.9)`},
    {opacity:1,transform:"translate(0,0) scale(1)"}
   ],{duration:820,easing:"ease-out",fill:"forwards"});
   await Promise.race([animation.finished.catch(()=>{}),later(1050)]);
   animation.cancel();
  }else await later(820);
  // Arrival is the exact sound cutoff, even for the final runner.
  runningFootsteps=false;clearTimeout(secondStep);stopStoryClip("fx");
  runner.remove();token.style.opacity="";
  if(game!==epoch||ended){layer.replaceChildren();return}
  if(casualties.has(i)){
   cell.classList.add("compact-blood");
   await playLethalSword();
   if(game!==epoch||ended){layer.replaceChildren();return}
   await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};playGestureAudio("assets/audio/sfx/purge_shukusei.mp3",finish,"fx",2);setTimeout(finish,1700)});
   if(game!==epoch||ended){layer.replaceChildren();return}
   await playCasualtyCry();
   if(game!==epoch||ended){layer.replaceChildren();return}
   ghosts.get(i)?.remove();cell.classList.remove("compact-blood");
  }
  await later(220);
 }
 layer.replaceChildren();
 if(game!==epoch||ended)return;
 // The board is now complete: enable check highlights and rays only once.
 oilAmbushAnimating=false;render();
 // Keep the Act II message, but never require a confirmation button.
 const message="伊東甲子太郎、討死！\n御陵衛士の伏兵が布陣した。"+(event.retreat?"\n近藤勇は後方へ退却！":"")+"\n藤堂平助率いる御陵衛士と決着をつけよ。\n動乱の刻は第二幕の2手目から再開。";
 popup("御陵衛士、伏兵出現！",message+"\n（画面をタップして進む）",[]);
 // The whole message overlay is a dismiss target; it also auto-continues.
 await new Promise(resolve=>{
  const modal=$("storyPopup");let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);modal.removeEventListener("click",finish);resolve()};
  const timer=setTimeout(finish,5000);
  modal.addEventListener("click",finish);
 });
 if(game!==epoch||ended)return;
 complete();
}
function makeMove(m,prom,capturePreplayed=false){
 const actor=g.side,source=m.drop?g.hands[actor].find(p=>p.t===m.t):g.board[m.y][m.x];
 const forcedPromotion=!m.drop&&!!source&&g.forced(source,m.Y),showPromotion=prom||forcedPromotion;
 const holesBefore=compactMode()?[...g.holes]:[];
 let moveVoiceDone=Promise.resolve(),triggerCaptureVoice=null;
 const announce=(kind,player=compactSound)=>{moveVoiceDone=moveVoiceDone.then(()=>new Promise(resolve=>player(kind,resolve)))};
 const key=compactFighterKey(source),before=compactCaptures[key]||0;
 const capturePlan=window.ShinsengumiBattleRules.captureResult({captured:!m.drop&&!!g.board[m.Y][m.X],drop:!!m.drop,previous:before,hitokiri:compactMode()&&!localTwoPlayer});
 const oilItoCapture=stage===2&&g.oilPhase===1&&!m.drop&&g.board[m.Y][m.X]?.king==="ito";
 const willKill=capturePlan.lethal||oilItoCapture;
 const prePromotionPiece=showPromotion&&!m.drop?{...source,p:false}:null;
 let justAwakened=false;
 const {unit,captured}=g.move(m,prom,willKill);
 if(prePromotionPiece)promotionVisualHold={y:m.Y,x:m.X,piece:prePromotionPiece};
 if(compactMode())compactClosingHoles=holesBefore.filter(h=>!g.holes.some(v=>v.x===h.x&&v.y===h.y));
 if(compactMode()&&!showPromotion&&!captured)compactArrival={y:m.Y,x:m.X}; // No re-triggered landing flash during escort.
 if(compactMode()&&captured){
  compactCaptures[key]=capturePlan.next;
  justAwakened=capturePlan.awakened;
  if(justAwakened)pendingStoryAwakeningKey=key;
 }
 const gaveCheck=g.check(g.board,1-actor);
 const deferCheck=(showPromotion||!!captured)&&gaveCheck;
 if(deferCheck)deferredCheckVisualEpoch=epoch;
 const delayedCheck=compactClosingHoles.length>0&&gaveCheck;
 const moveCues=window.ShinsengumiBattleRules.voiceCues({captured:!!captured,lethal:willKill,gaveCheck,captureAlreadyPlayed:capturePreplayed});
 if(captured){
  if(!willKill){
   if(!capturePreplayed)for(const cue of moveCues){if(cue==="capture"){
    const voiceDone=new Promise(resolve=>{
     let started=false;
     triggerCaptureVoice=()=>{if(started)return;started=true;
      if(actor===0)sfx("capture",resolve);else compactSound("sacchoCapture",resolve)
     };
    });
    moveVoiceDone=moveVoiceDone.then(()=>voiceDone);
   }else if(!delayedCheck&&!deferCheck)announce("check")}
  }
  // The fallen Shinsengumi officer responds after the enemy's capture shout.
  // Ordinary capture plays 「捕えた」 only. 「無念」 is reserved for killing,
  // purging and weapon casualties; the finished match does not stack both.
  if(!localTwoPlayer&&actor===0)collect(captured);banner(1-actor,captured);
 }else{
  if(!showPromotion)sfx("move");
   const cues=window.ShinsengumiBattlePresentation.moveVoices({board:g.board,side:actor,y:m.Y,x:m.X,source,captured:false,lethal:willKill,gaveCheck:gaveCheck&&!delayedCheck&&!deferCheck,promoted:showPromotion,satsuma:actor===1&&/薩摩/.test(person(source).role)});
   for(const cue of cues)announce(cue);
 }
 promotionCapturePreview=captured&&!willKill&&!capturePreplayed?{y:m.Y,x:m.X,piece:captured,showMover:true,hide:false}:null;
 if(unit)banner(actor,unit);selected=null;render();
 const oilFirstActVictory=stage===2&&g.oilPhase===1&&!g.king(1);
 // Being cornered without legal moves is not Ito's death.
 const rawResult=g.state();
 const result=(stage===2&&g.oilPhase===1&&g.king(1)&&rawResult?.winner===0)||(!localTwoPlayer&&stage===0&&g.ply>=3&&!g.ikedayaReinforced&&g.king(0)&&g.king(1)&&rawResult&&rawResult.why!=="主君討死")?null:rawResult;
 if(compactMode()){
  busy=true;render();const id=epoch;
  // Capture and the awakening seal must finish before the next turn or verdict.
  const afterFx=()=>moveVoiceDone.then(async()=>{
   if(id!==epoch||ended)return;
   // Serialize complete capture escort + 「捕えた！」 voice before promotion.
   if(showPromotion){
    await later(220); // A deliberate breath between two distinct beats.
    if(id!==epoch||ended)return;
    promotionVisualHold=null;promotionRise={y:m.Y,x:m.X};render();
    await Promise.all([later(1050),playPromotionRise()]);
    if(id!==epoch||ended)return;
    promotionRise=null;render();
   }
   if(justAwakened){
    compactCalligraphy(false);
    const awakeningVoice=playKabukiVoice("awakening");
    await later(window.ShinsengumiBattlePresentation.timing.awakening);
    if(id!==epoch||ended)return;
    pendingStoryAwakeningKey=null;
     if(unit)banner(actor,unit); // Only now is the persistent stamp revealed.
     sfx("card"); // DON: the permanent red seal lands after the main announcement.
    await Promise.all([awakeningVoice,later(1100)]); // Hold the printed seal before play resumes.
    if(id!==epoch||ended)return;
   }
   if(!oilFirstActVictory)await compactFadeExpiredHoles(id);
   if(id!==epoch||ended)return;
   if(delayedCheck||deferCheck){
    deferredCheckVisualEpoch=-1;render();
    storyBannerMessage("王手！",actor);
    await new Promise(resolve=>compactSound("check",resolve));
    if(id!==epoch||ended)return;
   }
   deferredCheckVisualEpoch=-1;compactArrival=null;promotionRise=null;
   if(oilFirstActVictory){
    // An explicit final blow before the ambush replaces the routine victory.
    compactCalligraphy(true);
    storyBannerMessage("伊東甲子太郎、斬殺！",0);
    await later(700);
    if(id!==epoch||ended)return;
    oilAmbushReveal();return;
   }
   if(result){finish(result.winner,result.why);return}
   busy=false;
   if(compactCardDue(actor)){
    busy=true;compactTurnLocked=true;render();
    // Same 250ms beat between the completed game's move and incident title.
    setTimeout(()=>{if(id===epoch&&!ended)compactCardStart(actor)},250);
   }
   else compactResumeTurn();
  });
  if(captured&&!willKill&&!capturePreplayed){
   const valid=()=>id===epoch&&!ended;
   window.ShinsengumiBattleRules.runCaptureEscort({
    valid,
    animate:(done,contact)=>animateCompactEscort(actor,m.Y,m.X,captured,done,contact),
    onContact:()=>{
     if(promotionCapturePreview?.y===m.Y&&promotionCapturePreview.x===m.X){promotionCapturePreview.piece=prePromotionPiece||unit;promotionCapturePreview.hide=false;render()}
     compactSound("slash");triggerCaptureVoice?.();
    },
    onFinished:()=>{promotionCapturePreview=null;render();afterFx()}
   });
  }
  else if(willKill){
   // The shared contract enforces attack -> impact -> casualty cry -> result.
   (async()=>{
    const square=m.Y+":"+m.X;
    try{
     await window.ShinsengumiBattleRules.runOrderedEffect({
      valid:()=>id===epoch&&!ended,
      attack:async()=>{if(!oilFirstActVictory)compactCalligraphy(true);compactBloodMarks.push(square);render();await playLethalSword()},
      impact:playBloodImpact,
      cry:playCasualtyCry,
      result:()=>later(window.ShinsengumiBattlePresentation.timing.killResult)
     });
    }catch(error){console.error("斬殺演出の復旧処理",error)}
    finally{
     compactBloodMarks=compactBloodMarks.filter(v=>v!==square);
     if(id===epoch&&!ended){render();afterFx()}
    }
   })();
  }else setTimeout(afterFx,showPromotion?window.ShinsengumiBattlePresentation.timing.promotionMove:window.ShinsengumiBattlePresentation.timing.quietMove);
  return;
 }
 if(oilFirstActVictory){storyBannerMessage("伊東甲子太郎、斬殺！",0);oilAmbushReveal();return}
 if(result){finish(result.winner,result.why);return}
 if(g.side===1&&!localTwoPlayer){busy=true;render();const id=epoch;setTimeout(()=>{if(id===epoch)computer()},420)}
}
function computer(){
 if(ended||!g||g.side!==1||localTwoPlayer)return;
 // When truly cornered, the one-time rifle takes priority over digging.
 const pit=g.legal(1).length?g.oilItoDig?.():null;
 if(pit){
  const game=epoch;busy=true;compactTurnLocked=true;
  // Digging and filling use the same approved earth-collapse sound.
  g.holes=g.holes.filter(h=>h!==pit);
  compactQuakeCracks=[{y:pit.y,x:pit.x}];render();
  const active=()=>game===epoch&&!ended&&g?.oilPhase===1;
  setTimeout(()=>{
   if(!active())return;
   g.holes.push(pit);compactQuakeCracks=[];render();
   // Do not move Ito until the entire digging sound finishes.
   let continued=false;
   const continueTurn=()=>{
    if(continued)return;continued=true;clearTimeout(recovery);
    if(active())setTimeout(()=>{if(active())computer()},180);
   };
   // A failed audio-ended event must not permanently lock the match.
   const recovery=setTimeout(continueTurn,6000);
   playGestureAudio("assets/audio/story/master_cliffcollapse_1s_v1.mp3",continueTurn,"fx",2.4,active);
  },360);
  return;
 }
 const move=g.ai();busy=false;
 if(!move){
  if(stage===2&&g.oilPhase===1&&!g.oilItoGunUsed&&g.king(1)){
   const shot=g.oilItoGunTarget?.();
   if(shot){
    g.oilItoGunUsed=true;
    const game=epoch;busy=true;compactTurnLocked=true;selected=null;render();
    storyBannerMessage("伊東甲子太郎「鉄砲！」",1);
    (async()=>{
     const active=()=>game===epoch&&!ended;
     try{
      // Name the weapon before its small projectile appears on the board.
      await new Promise(resolve=>playGestureAudio(kabukiVoice.rifle,resolve,"voice",3.5,active));
      if(!active())return;
      await later(350);
      if(!active())return;
      await window.StoryWeapons.fire(g,"rifle",active,kind=>{
       if(kind==="rifle"){
        window.StoryBgm?.duck();
        playGestureAudio("assets/audio/story/master_rifle.mp3",null,"fx",2.5,active);
       }else sfx(kind);
      },async(result,hit)=>{
       if(!active()||!hit)return;
       const mark=result.y+":"+result.x;compactBloodMarks.push(mark);render();
       await playCasualtyCry();
       compactBloodMarks=compactBloodMarks.filter(v=>v!==mark);
       if(active())render();
      },1,shot,()=>new Promise(resolve=>{
       // The projectile lands: purge slash first, then the casualty cries.
       playGestureAudio("assets/audio/sfx/purge_shukusei.mp3",resolve,"fx",2.5,active);
      }));
     }catch(error){console.error("伊東の鉄砲演出",error)}
     if(game!==epoch||ended)return;
     g.side=0;g.ply++;g.last=null;
     render();compactResumeTurn();
    })();
    return;
   }
  }
  if(stage===2&&g.oilPhase===1&&g.king(1)){
   // Ito remains alive: announce his helplessness before passing the turn.
   const game=epoch;
   busy=true;compactTurnLocked=true;render();
   storyBannerMessage("伊東甲子太郎「無念！」 指す手なし、パス",1);
   // Make Ito visibly waver as he says 「無念」, then pass his turn.
   const itoIndex=g.board.flat().findIndex(p=>p?.king==="ito");
   const itoToken=$("storyBoard").children[itoIndex]?.querySelector(".story-token");
   const blink=itoToken?.animate?.([
    {opacity:1,offset:0},{opacity:.12,offset:.16},{opacity:1,offset:.32},
    {opacity:.12,offset:.49},{opacity:1,offset:.65},{opacity:.12,offset:.82},{opacity:1,offset:1}
   ],{duration:1500,easing:"ease-in-out"});
   const blinkDone=blink?Promise.race([blink.finished.catch(()=>{}),later(1800)]):later(1500);
   const voiceDone=new Promise(resolve=>playBattleShout("assets/audio/voice_loss_munen.mp3",resolve));
   Promise.all([voiceDone,blinkDone]).then(()=>{if(game!==epoch||ended)return;g.side=0;g.ply++;compactResumeTurn()});
   return;
  }
  finish(0,"敵軍に指す手なし");return;
 }
 const p=move.drop?null:g.board[move.y][move.x],prom=!!p&&g.promoted(p,move.y,move.Y);
 if(p)banner(1,p);
 makeMove(move,prom);
}
function weaponCard(kind,ownerSide=1,debug=false){
 if(ended||busy||(!debug&&weapons.includes(ownerSide+":"+kind))||stage!==3)return;
 if(!debug)weapons.push(ownerSide+":"+kind);busy=true;compactTurnLocked=true;pendingWeaponDisplay={kind,ownerSide,revealed:false};render();
 // Weapon cards share the same front-only reveal used by ordinary incidents.
 const face=$("compactCardFace"),overlay=$("compactCardOverlay"),stageLayer=$("compactIncidentStage");
 overlay.classList.add("hidden");face.classList.remove("revealed","card-text-ready");
 $("compactCardArtwork").src="assets/cards/back/card-back-king-neutral.webp";
 $("compactCardHeading").textContent="";$("compactCardText").textContent="";
 $("compactCardPrompt").textContent="";
 stageLayer.classList.remove("hidden");const id=epoch;
 const banner=$("compactIncidentBanner");banner.style.animation="none";void banner.offsetWidth;banner.style.animation="";
 compactSound("banner");setTimeout(()=>{if(id!==epoch||!pendingWeaponDisplay||pendingWeaponDisplay.kind!==kind)return;
  stageLayer.classList.add("hidden");overlay.classList.remove("hidden");sfx("card");face.click();
 },1300);
}
async function fire(kind,ownerSide=1){
 const id=epoch;
 // The spoken order to fire is distinct from the subsequent discharge and impact.
 await new Promise(resolve=>{let settled=false;const done=()=>{if(settled)return;settled=true;resolve()};
  // Restore the previously mastered original 「撃て！」 clip.
  playStoryClip("assets/audio/story/master_battle_fire_v1.mp3","voice",done);setTimeout(done,4500)});
 if(id!==epoch||ended)return;
 const results=await window.StoryWeapons.fire(g,kind,()=>id===epoch,sfx,async(shot,hit)=>{
  if(id!==epoch||shot.y<0)return;
  if(kind==="cannon"){
   // Each of the two blasts changes one square and opens its own three-move hole.
   const crater={y:shot.y,x:shot.x,expiresPly:g.ply+3};
   // A landed shell always makes a crater. The ordinary quake safety filter
   // must not silently undo an artillery hit, even if it restricts legal moves.
   if(!g.board[crater.y][crater.x]&&!g.isHole(crater.y,crater.x))g.holes.push(crater);
   storyBannerMessage(`大砲 ${shot.index}/2：${shot.y+1}段${shot.x+1}列に着弾！`,0);render();
  }
  if(!hit)return;
  if(kind==="cannon"){
   // Cannon casualties share the immediate hit-cry slot with rifle casualties.
   await playCasualtyCry();
  }else{
   const square=shot.y+":"+shot.x;
   compactBloodMarks.push(square);render();
   await playBloodImpact();if(id!==epoch)return;
   await playCasualtyCry();if(id!==epoch)return;
   await later(1600);
   compactBloodMarks=compactBloodMarks.filter(v=>v!==square);
   if(id===epoch)render();
  }
 },ownerSide);
 const result=results?.[results.length-1];
 if(!result||id!==epoch)return;
 const hits=results.filter(r=>r.hit);
 if(hits.length)storyBannerMessage(hits.map(r=>person(r.hit).name).join("・")+" に命中！ 駒が消滅。",0);
 else storyBannerMessage(kind==="cannon"?"砲弾２発は空きマスへ着弾！":"鉄砲は空振り！",0);
 busy=false;render();const status=g.state();if(status)finish(status.winner,status.why);
 else{await later(1200);if(id===epoch&&!ended)compactResumeTurn()}
}
const storyVictoryBgmClip=new Audio('assets/audio/bgm/victory_thunder_pass_4s.mp3');
storyVictoryBgmClip.preload='auto';
const storyDefeatBgmClip=new Audio('assets/audio/bgm/defeat_full.mp3');
storyDefeatBgmClip.preload='auto';storyDefeatBgmClip.playsInline=true;
let storyEndBgmKind=null,storyEndBgmShouldResume=false;
function stopStoryVictoryBgm(){
 storyEndBgmKind=null;storyEndBgmShouldResume=false;
 for(const clip of [storyVictoryBgmClip,storyDefeatBgmClip]){clip.pause();clip.currentTime=0}
}
function storyEndBgmClip(){return storyEndBgmKind==='victory'?storyVictoryBgmClip:storyEndBgmKind==='defeat'?storyDefeatBgmClip:null}
function pauseStoryEndBgmOnHide(){
 const clip=storyEndBgmClip();if(!clip)return;
 // Preserve the position across mobile tab/PWA suspension.
 if(!clip.ended)storyEndBgmShouldResume=true;
 clip.pause();
}
function resumeStoryEndBgm(){
 if(!storyEndBgmShouldResume||!ended||soundOff||document.hidden||$("storyEndOverlay").classList.contains("hidden"))return;
 const clip=storyEndBgmClip();if(!clip)return;
 storyEndBgmShouldResume=false;
 clip.play().catch(error=>{storyEndBgmShouldResume=true;console.warn('物語の終局BGM復帰待ち',error)});
}
function playStoryVictoryBgm(){
 if(soundOff||document.hidden||!ended||$("storyEndOverlay").classList.contains("hidden"))return;
 stopStoryVictoryBgm();storyEndBgmKind='victory';
 storyVictoryBgmClip.volume=Math.min(.7,(window.ShinsengumiAudioMixer?.ratio('bgm')??storyVolume/100)*.70);
 storyVictoryBgmClip.play().catch(()=>{});
}

function playStoryDefeatBgm(){
 if(soundOff||document.hidden||!ended||$("storyEndOverlay").classList.contains("hidden"))return;
 stopStoryVictoryBgm();storyEndBgmKind='defeat';
 storyDefeatBgmClip.volume=Math.min(.7,(window.ShinsengumiAudioMixer?.ratio('bgm')??storyVolume/100)*.70);
 storyDefeatBgmClip.play().catch(error=>console.warn('敗北BGMは未取得または再生できません',error));
}
function finish(winner,reason){
 if(ended)return;const wasCompact=compactMode();epoch++;hideCompactFx();ended=true;busy=false;render();$("storyPopup").classList.toggle("compact-finale",wasCompact);if(winner===-1){popup("引き分け","対局は引き分けです。再挑戦できます。",[["再挑戦",()=>battle(stage,null,true)],[localTwoPlayer?"タイトルへ":"章選択",localTwoPlayer?localExit:screenHome]]);return}const win=winner===0,ch=D.chapters[stage],king=ch.king;
 if(win&&!localTwoPlayer&&!devPreview&&!debugModified){
  unlock=Math.max(unlock,stage+1);try{localStorage.setItem(SAVE,String(unlock));
   const arr=JSON.parse(localStorage.getItem(KINGS)||"[]");if(Array.isArray(arr)&&!arr.includes(king)){arr.push(king);localStorage.setItem(KINGS,JSON.stringify(arr))}}catch(e){}
 }

 // Same presentation contract as the finished game's showVictory().
 const overlay=$("storyEndOverlay");
 const opponent={miyabe:"miyabe",kusaka:"kusaka",ito:"ito",saigo:"saigo"}[king];
 const winnerId=win?"kondo":opponent,loserId=win?opponent:"kondo";
 window.SharedVictory.show({overlay,winnerElement:$("storyEndWinner"),loserElement:$("storyEndLoser"),
  winnerId,loserId,winnerName:win?"近藤勇":ch.boss,loserName:win?ch.boss:"近藤勇"});
 $("storyEndText").textContent=localTwoPlayer?"勝負あった！　"+(win?"先手":"後手")+"の勝利":"勝負あった！";
 overlay.classList.toggle("enemy-win",!win);
 const actions=$("storyEndActions");actions.replaceChildren();
 const choices=localTwoPlayer?
  [['もう一局！',()=>battle(stage,null,true)],['タイトルへ',localExit]]:[
  [win?'物語を進める':'再挑戦',()=>win?talk(Math.min(stage+1,4)):battle(stage,null,true)],
  ['章選択',screenHome]
 ];
 for(const [label,action] of choices){
  const button=document.createElement("button");button.type="button";button.textContent=label;
  button.onclick=()=>{overlay.classList.add("hidden");stopStoryVictoryBgm();action()};
  actions.append(button);
 }
 overlay.classList.remove("hidden");
 // Start the victory/defeat score with the reveal; voices remain sequential.
 window.StoryBgm?.stop();
 if(win||localTwoPlayer)playStoryVictoryBgm();else playStoryDefeatBgm();
 const verdictEpoch=epoch;
 const valid=()=>verdictEpoch===epoch&&ended&&!overlay.classList.contains("hidden");
 const playVoice=path=>new Promise(resolve=>{
  if(!voiceEnabled||!valid())return resolve();
  playStoryClip(path,"voice",resolve);
 });
 void window.SharedVictory.playVerdictSequence({
  valid,
  announce:()=>playVoice("assets/audio/voice_shobu_atta.mp3"),
  metal:()=>playPromotionRise(),
  playerDefeated:!localTwoPlayer&&!win,
  defeat:()=>playVoice("assets/audio/voice_loss_munen.mp3"),
  complete:()=>{} // BGM began immediately at the visible verdict.
 });
}
function leave(){
 if(ended){localTwoPlayer?localExit():screenHome();return}
 popup('対局を中断しますか？','途中の対局は保存されません。',[[localTwoPlayer?'タイトルへ':'章選択へ',()=>{epoch++;ended=true;busy=false;localTwoPlayer?localExit():screenHome()}],['戻る',()=>{}]]);
}
$( "storyDevToggle" ).onclick=()=>{devPreview=!devPreview;screenHome()};
$("dialogueNext").onclick=()=>{
 const sortie=stage>=0&&stage<4&&at===dialog.length-1;
 // 物語のページ切り替えは従来の紙のめくり音を維持する。
 // 最終ページの出陣ボイスには重ねない。
 if(at<dialog.length-1)sfx("flip");
 if(sortie&&voiceEnabled){
  window.StoryBgm?.duck();
  playStorySortieVoice();
 }
 at++;line();
};
$("dialoguePrev").onclick=()=>{
 if(at<=0)return;
 sfx("flip");
 at--;line();
};
$("dialogueHome").onclick=()=>screenHome();
$("battleQuit").onclick=leave;
$("storyResign").onclick=()=>popup('降参しますか？',localTwoPlayer?'現在の手番側の負けとなります。':'まだこの章は突破していません。',[['降参する',()=>finish(localTwoPlayer?1-g.side:1,'降参')],['続ける',()=>{}]]);
$("storyRules").onclick=()=>popup("操作・ルール","駒をタップし、緑色の移動先をタップします。\n持ち駒は下欄から選択。二歩・行き所のない駒打ちは禁止です。\n新選組将棋独自の『主君を見捨てる』ルールでは、王手を防がず別の手を選べます。警告後に覚悟を決め、玉を取られれば『主君討死』で敗北します。\n鳥羽・伏見では両軍が大砲と鉄砲を各1回使用します。", [["閉じる",()=>{}]]);
$("audioToggle").onclick=()=>{window.StoryBgm?.unlock();soundOff=!soundOff;window.StoryBgm?.setMuted(soundOff);$("audioToggle").textContent=soundOff?"♪ BGM OFF":"♪ BGM ON";$("audioToggle").setAttribute("aria-pressed",String(!soundOff))};
$("storyVoiceToggle").onclick=()=>{voiceEnabled=!voiceEnabled;if(!voiceEnabled)stopStoryClip("voice");$("storyVoiceToggle").textContent=voiceEnabled?"声 ON":"声 OFF";$("storyVoiceToggle").setAttribute("aria-pressed",String(voiceEnabled))};
$("storyFxToggle").onclick=()=>{fxEnabled=!fxEnabled;if(!fxEnabled){stopStoryClip("fx");stopStoryQuakeBattle()}$("storyFxToggle").textContent=fxEnabled?"効果音 ON":"効果音 OFF";$("storyFxToggle").setAttribute("aria-pressed",String(fxEnabled))};
const voiceSamples=["assets/audio/voice_shinsengumi_move_sorya.mp3","assets/audio/voice_kondo_isami_king_move.mp3","assets/audio/voice_hijikata_toshizo_move.mp3","assets/audio/saccho_voice_01_chesto.mp3","assets/audio/saccho_voice_02_uryaa.mp3","assets/audio/saccho_voice_03_toraeta.mp3"];
let previewIndex=0;
$("storyVoicePreview").onclick=()=>{window.StoryBgm?.unlock();if(!voiceEnabled)return;playStoryClip(voiceSamples[previewIndex++%voiceSamples.length],"voice")};

// Story match snapshots are deliberately separate from 9x9 save data.
const STORY_MATCH_SAVE="shinsengumi-story-match-save-v1";
function captureStoryMatch(){
 if(!g||ended||busy||compactTurnLocked||compactIncident||pendingWeaponDisplay)return null;
 const snapshot={version:1,stage,at:Date.now(),engine:{
   board:g.board,hands:g.hands,fallen:g.fallen,holes:g.holes,side:g.side,ply:g.ply,last:g.last,oilPhase:g.oilPhase,oilEnemyReserve:g.oilEnemyReserve,oilItoGunUsed:g.oilItoGunUsed,oilDigCount:g.oilDigCount,kinmonSatsumaReinforced:g.kinmonSatsumaReinforced
  },enemyTurns,playerTurns,weapons,debugModified};
 return snapshot;
}
function storySaveMatch(){window.ShinsengumiSaveSlots?.open('story','save')}
function restoreStoryMatch(data){
 if(!data||data.version!==1||!Number.isInteger(data.stage)||data.stage<0||data.stage>=D.chapters.length||!data.engine){alert("読み込める対局データがありません。");return false}
 const cfg=D.chapters[data.stage],state=data.engine;
 if(!Array.isArray(state.board)||state.board.length!==cfg.h||!state.board.every(row=>Array.isArray(row)&&row.length===cfg.w)||!Array.isArray(state.hands)||state.hands.length!==2||![0,1].includes(state.side)){alert("保存データの形式が正しくありません。");return false}
 if(data.stage===2){
  const enemies=state.board.flat().filter(p=>p?.s===1);
  if(enemies.filter(p=>p.t==="玉").length!==1||(state.oilPhase===1&&enemies.length!==1)){
   alert("旧版の油小路対局データには駒の重複があります。章選択から再開始してください。");return false;
  }
 }
 if(g&&!ended&&!confirm("現在の対局を中断し、保存した対局に戻りますか？"))return false;
 battle(data.stage,2);
 g.board=state.board;g.hands=state.hands;g.fallen=Array.isArray(state.fallen)?state.fallen:[[],[]];
 g.holes=Array.isArray(state.holes)?state.holes:[];g.side=state.side;g.ply=Number(state.ply)||0;g.last=state.last||null;
 g.oilPhase=state.oilPhase??(data.stage===2?2:null);g.oilEnemyReserve=state.oilEnemyReserve||null;
 g.oilItoGunUsed=!!state.oilItoGunUsed;
 g.oilDigCount=Math.max(0,Math.min(3,Number(state.oilDigCount)||0));
 if(data.stage===1)g.kinmonSatsumaReinforced=!!state.kinmonSatsumaReinforced||g.board.flat().some(p=>Number.isInteger(p?.satsumaId));
 enemyTurns=Number(data.enemyTurns)||0;playerTurns=Number(data.playerTurns)||0;
 weapons=Array.isArray(data.weapons)?data.weapons:[];debugModified=!!data.debugModified;
 // Invalidate timers started by the chapter opening before restoring play.
 epoch++;busy=false;compactTurnLocked=false;selected=null;
 hideCompactFx();render();
 window.StoryBgm?.play(data.stage===0||data.stage===2?"battle01":"battle02");
 return true;
}
function storyLoadMatch(){window.ShinsengumiSaveSlots?.open('story','load')}
window.ShinsengumiSaveSlots?.register('story',{
 legacyKeys:[STORY_MATCH_SAVE],
 capture:()=>captureStoryMatch(),
 restore:data=>restoreStoryMatch(data),
 describe:data=>D.chapters[data.stage]?.title||'幕末物語'
});
window.storySaveMatch=storySaveMatch;window.storyLoadMatch=storyLoadMatch;
function storyDebugReady(){return g&&!ended&&!busy&&!compactTurnLocked&&g.side===0&&!compactIncident&&!pendingWeaponDisplay&&$("storyPopup").classList.contains("hidden")}
function storyDebugRun(action,changesBoard=false,renderAfter=true){
 if(!storyDebugReady())return;
 window.StoryBgm?.unlock();
 if(changesBoard){debugModified=true;selected=null}
 // Fixed overlays already follow the viewport. Do not re-center the document
 // when a debug card/effect starts: that visibly jerks the board.
 requestAnimationFrame(()=>{action();if(renderAfter)render()});
}
function storyDebugIncident(kind){
 const side=g.side,owner=kind==="寝返り"?1-side:side;
 const options=compactEligible(owner,kind==="粛清"?["歩","香","桂","銀"]:null);
 if(!options.length){popup("テストできる駒がありません",kind+"の合法な対象が現在の盤面にありません。",[["閉じる",()=>{}]]);return}
 const v=options[Math.floor(Math.random()*options.length)];
 compactApplyIncident({kind,side,owner,y:v.y,x:v.x});
}
$("debugWin").onclick=()=>storyDebugRun(()=>finish(0,"開発テスト：新選組の勝利"),true);
$("debugLose").onclick=()=>storyDebugRun(()=>finish(1,"開発テスト：敵陣の勝利"),true);
$("debugCard").onclick=()=>storyDebugRun(()=>compactCardStart(g.side),true);
 $("debugOilAmbush").onclick=()=>storyDebugRun(()=>{
 if(stage!==2||g.oilPhase!==1)return;
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.board[y][x]?.king==="ito"&&g.board[y][x]?.s===1)g.board[y][x]=null;
 oilAmbushReveal();
},true,false);
$("debugQuake").onclick=()=>storyDebugRun(()=>compactApplyIncident({kind:"大地震"}),true);
$("debugReinforce").onclick=()=>storyDebugRun(()=>storyDebugIncident("寝返り"),true);

$("debugDesert").onclick=()=>storyDebugRun(()=>storyDebugIncident("脱走"),true);
$("debugPurge").onclick=()=>storyDebugRun(()=>storyDebugIncident("粛清"),true);
async function storyDebugHitokiri(kill){
 const id=epoch;busy=true;compactTurnLocked=true;selected=null;render();
 try{
  if(!kill){
   const officer=g.board.flat().find(p=>p?.s===0&&p.t==="玉");
   debugAwakenKey=compactFighterKey(officer);pendingStoryAwakeningKey=debugAwakenKey;banner(0,officer);
   compactCalligraphy(false);
   const awakenedVoice=Promise.race([playKabukiVoice("awakening"),later(3500)]);
   await later(window.ShinsengumiBattlePresentation.timing.awakening);
   if(id!==epoch||ended)return;
   pendingStoryAwakeningKey=null;banner(0,officer);sfx("card");
   await awakenedVoice;
   if(id!==epoch||ended)return;
   // Let the tester see the persistent stamp on the officer banner.
   await later(1200);
  }else{
   await playBloodImpact();if(id!==epoch||ended)return;
   await playCasualtyCry();if(id!==epoch||ended)return;
   const victim=g.board.flatMap((row,y)=>row.map((p,x)=>p&&p.s===1?y+":"+x:null)).find(Boolean);
   if(victim){compactBloodMarks.push(victim);render()}
   await playBloodImpact();
   await later(800);compactBloodMarks=[];
  }
 }finally{
  if(id===epoch&&!ended){busy=false;compactTurnLocked=false;render()}
 }
}
$("debugKill").onclick=()=>storyDebugRun(()=>storyDebugHitokiri(true));
$("debugAwaken").onclick=()=>storyDebugRun(()=>storyDebugHitokiri(false));
$("debugCannon").onclick=()=>storyDebugRun(()=>weaponCard("cannon",1,true),true);
$("debugRifle").onclick=()=>storyDebugRun(()=>weaponCard("rifle",1,true),true);
$("debugTurn").onclick=()=>storyDebugRun(()=>compactTurn(0));
$("debugFx").onclick=()=>storyDebugRun(()=>{compactSound("slash");const id=epoch;setTimeout(()=>{if(id===epoch)sfx("card")},400)});
let debugVoiceIndex=[0,0];
$("debugVoice0").onclick=()=>storyDebugRun(()=>{if(voiceEnabled)playStoryClip(voiceSamples[debugVoiceIndex[0]++%3],"voice")});
$("debugVoice1").onclick=()=>storyDebugRun(()=>{if(voiceEnabled)playStoryClip(voiceSamples[3+debugVoiceIndex[1]++%3],"voice")});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){stopStoryClip("voice");stopStoryClip("fx");stopStoryQuakeBattle();pauseStoryEndBgmOnHide()}
 else resumeStoryEndBgm();
});
window.addEventListener("pagehide",()=>{stopStoryClip("voice");stopStoryClip("fx");stopStoryQuakeBattle();pauseStoryEndBgmOnHide()});
window.addEventListener("pageshow",resumeStoryEndBgm);
window.addEventListener("focus",resumeStoryEndBgm);
document.addEventListener("pointerdown",resumeStoryEndBgm,{passive:true,capture:true});
$("storyVolume").value=String(storyVolume);$("storyVolumeValue").value=String(storyVolume);$("storyVolumeValue").textContent=String(storyVolume);
// The shared mixer is loaded as a deferred script after story-mode.js.
// Subscribe once all deferred scripts have run; otherwise the optional-chain
// silently skips registration and faders cannot change currently playing clips.
const connectStoryAudioMixer=()=>{
 const mixer=window.ShinsengumiAudioMixer;
 if(!mixer){console.warn('共通音量ミキサーの初期化を確認できません');return}
 const apply=values=>{
  window.StoryBgm?.setVolume(values.bgm);
  if(activeStoryVoice)activeStoryVoice.volume=Math.min(1,voiceLevel()*activeStoryVoiceBoost);
  if(activeStoryFx)activeStoryFx.volume=fxLevel();
  if(battleVoiceGain)battleVoiceGain.gain.value=Math.min(1,voiceLevel()*battleVoiceBoost);
  if(battleImpactGain)battleImpactGain.gain.value=Math.min(1,fxLevel()*battleImpactBoost);
  promotionRiseSound.volume=fxLevel();
  cannonImpactAudio.volume=values.fx/100*.75;
  storyQuakeBattle.volume=values.fx/100*.50;
  storyVictoryBgmClip.volume=values.bgm/100*.70;
  storyDefeatBgmClip.volume=values.bgm/100*.70;
 };
 mixer.subscribe(apply);
 // iOS routes HTML media through Web Audio; existing decoded FX already use GainNode.
 mixer.registerMedia?.(promotionRiseSound,'fx',.50);
 mixer.registerMedia?.(cannonImpactAudio,'fx',.75);
 mixer.registerMedia?.(storyQuakeBattle,'fx',.50);
 mixer.registerMedia?.(storyVictoryBgmClip,'bgm',.70);
 mixer.registerMedia?.(storyDefeatBgmClip,'bgm',.70);
 apply({bgm:mixer.get('bgm'),voice:mixer.get('voice'),fx:mixer.get('fx')});
};
if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',connectStoryAudioMixer,{once:true});
else connectStoryAudioMixer();
$("storyVolume").addEventListener("input",event=>{
 storyVolume=Math.max(0,Math.min(100,Number(event.target.value)||0));
 $("storyVolumeValue").value=String(storyVolume);$("storyVolumeValue").textContent=String(storyVolume);
 window.StoryBgm?.setVolume(storyVolume);
 try{localStorage.setItem("shinsengumi-story-volume-v1",String(storyVolume))}catch(e){}
});
screenHome();
if(localTwoPlayer){
 const earned=(()=>{try{return Math.max(0,Math.min(4,Number(localStorage.getItem(SAVE))||0))}catch{return 0}})();
 if(localStage+1>earned&&!new URLSearchParams(location.search).has('previewAll')){
  popup('未解放の戦場','この戦場は幕末物語で勝利すると2人対戦で遊べます。',[["タイトルへ",localExit]]);
 }else{
  // The StoryEngine setup is shared with the story chapter, not a visual skin.
  // Human players take both sides, with no AI turn scheduled.
  const fromSortie=(()=>{try{return sessionStorage.getItem('shinsengumi-two-player-sortie-cue')==='1'}catch{return false}})();
  try{sessionStorage.removeItem('shinsengumi-two-player-sortie-cue')}catch(e){}
  if(!fromSortie)playStorySortieVoice(); // Direct deep links still attempt the cue.
  battle(localStage);
 }
}
})();
