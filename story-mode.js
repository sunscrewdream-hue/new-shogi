(function(){
"use strict";
const $=id=>document.getElementById(id),D=window.StoryData;
const SAVE="shinsengumi-story-progress-v2",KINGS="shinsengumi-story-kings-v1",COL="shinsengumi-shogi-collection-v1";
let unlock=0;try{unlock=Math.max(0,Math.min(4,Number(localStorage.getItem(SAVE))||0))}catch(e){}
let stage=-1,dialog=[],at=0,onEnd=null,g=null,selected=null,busy=false,ended=false,epoch=0,weapons=[],pendingWeaponDisplay=null,soundOff=false,voiceEnabled=true,fxEnabled=true,devPreview=false,debugModified=false,compactTurnLocked=false,compactFxSerial=0,compactCaptures={},compactArrival=null,compactIncident=null,compactIncidentEffect=null,compactIncidentMarks=[],compactQuakeMove=null,compactQuakeLanding=null,compactQuakeCracks=[],compactClosingHoles=[],compactHoleFading=false,compactBloodMarks=[],debugAwakenKey=null,reinforcementSerial=0;
let storyVolume=10;try{const saved=localStorage.getItem("shinsengumi-story-volume-v1");if(saved!==null)storyVolume=Math.max(0,Math.min(100,Number(saved)||0))}catch(e){}
const voiceLevel=()=>Math.min(.75,storyVolume/100*4.3);
// Match finished match's SFX gain (.021 per slider point; capped at .5).
const fxLevel=()=>Math.min(.5,storyVolume/100*2.1);
const storyClipCache=new Map();let activeStoryVoice=null,activeStoryFx=null;
// Enemy moves run from timers, outside a touch gesture. A gesture-unlocked
// Web Audio voice channel keeps capture and check shouts playable on iOS.
let battleVoiceContext=null,battleVoiceActive=null,battleImpactActive=null;
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
  if(!loading){loading=fetch(path).then(response=>{if(!response.ok)throw Error("voice HTTP "+response.status);return response.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{battleVoiceBuffers.set(path,buffer);return buffer});battleVoiceLoading.set(path,loading)}
 }
 let settled=false;const watchdog=setTimeout(()=>{console.warn("音声演出タイムアウト",path);finish()},9000);
 const finish=()=>{if(settled)return;settled=true;clearTimeout(watchdog);onDone?.()};
 Promise.resolve(loading).then(buffer=>{
  if((channel==="voice"?!voiceEnabled:!fxEnabled)||document.hidden||(isStillValid&&!isStillValid())){finish();return}
  stopStoryClip(channel);
  const previous=channel==="voice"?battleVoiceActive:battleImpactActive;
  if(previous){try{previous.stop()}catch(e){}}
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=Math.min(1,(channel==="voice"?voiceLevel():fxLevel())*gainBoost);source.connect(gain).connect(context.destination);
  if(channel==="voice")battleVoiceActive=source;else battleImpactActive=source;
  source.onended=()=>{if(battleVoiceActive===source)battleVoiceActive=null;if(battleImpactActive===source)battleImpactActive=null;finish()};
  context.resume().then(()=>{if(isStillValid&&!isStillValid()){finish();return}source.start()}).catch(()=>{if(isStillValid&&!isStillValid()){finish();return}playStoryClip(path,channel,finish)});
 }).catch(()=>playStoryClip(path,channel,finish));
}
function playBattleShout(path,onDone){playGestureAudio(path,onDone,"voice")}
// Cannon impact needs its own channel: shot, hit cry and other FX must not
// interrupt the explosion halfway through.
const cannonImpactAudio=new Audio("assets/audio/story/master_explosion.mp3");
cannonImpactAudio.preload="auto";cannonImpactAudio.playsInline=true;
function playCannonImpact(){
 if(!fxEnabled||document.hidden||storyVolume<=0)return;
 cannonImpactAudio.pause();cannonImpactAudio.currentTime=0;
 cannonImpactAudio.volume=Math.min(.75,storyVolume/100*4.5);
 cannonImpactAudio.play().catch(error=>console.warn("砲弾着弾音を再生できません",error));
}
const storyQuakeBattle=new Audio("assets/audio/sfx/battle_charge_mono_64kbps.mp3");let quakeBattleRuns=0;
storyQuakeBattle.preload="auto";storyQuakeBattle.playsInline=true;
function stopStoryQuakeBattle(){storyQuakeBattle.pause();storyQuakeBattle.currentTime=0;quakeBattleRuns=0}
storyQuakeBattle.addEventListener("ended",()=>{if(quakeBattleRuns!==1||!fxEnabled||document.hidden)return;quakeBattleRuns=2;storyQuakeBattle.currentTime=0;storyQuakeBattle.play().catch(()=>{})});
function playStoryQuakeBattle(){if(!fxEnabled||document.hidden)return;stopStoryQuakeBattle();quakeBattleRuns=1;storyQuakeBattle.volume=Math.min(.5,storyVolume/100*2.4);storyQuakeBattle.play().catch(()=>{})}
function stopStoryClip(channel){
 const a=channel==="voice"?activeStoryVoice:activeStoryFx;if(a){a.pause();a.currentTime=0}
 if(channel==="voice"){
  activeStoryVoice=null;
  if(battleVoiceActive){try{battleVoiceActive.stop()}catch(e){}battleVoiceActive=null}
 }else{
  activeStoryFx=null;
  if(battleImpactActive){try{battleImpactActive.stop()}catch(e){}battleImpactActive=null}
 }
}
function playStoryClip(path,channel="fx",onDone=null){
 if(!path){onDone?.();return null}
 if(channel==="voice"?!voiceEnabled:!fxEnabled){onDone?.();return null}
 if(document.hidden){onDone?.();return null}
 let a=storyClipCache.get(path);if(!a){a=new Audio(path);a.preload=channel==="voice"?"auto":"none";a.playsInline=true;storyClipCache.set(path,a)}
 stopStoryClip(channel);a.currentTime=0;a.volume=channel==="voice"?voiceLevel():fxLevel();
 if(channel==="voice")activeStoryVoice=a;else activeStoryFx=a;
 let settled=false,watchdog=null;const finish=()=>{if(settled)return;settled=true;if(watchdog!==null)clearTimeout(watchdog);a.removeEventListener("ended",finish);a.removeEventListener("error",finish);a.removeEventListener("pause",finish);onDone?.()};
 if(onDone){a.addEventListener("ended",finish);a.addEventListener("error",finish);a.addEventListener("pause",finish);watchdog=setTimeout(()=>{console.warn("音声終了通知タイムアウト",path);finish()},9000)}
 a.play().catch(finish);return a;
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
 playStoryClip("assets/audio/story/master_battle_gyah_v1.mp3","voice",done);
 setTimeout(done,3400);
})}
const later=ms=>new Promise(r=>setTimeout(r,ms));
// Never leave battle input locked if mobile Safari omits an audio-ended event.
function playBloodImpact(){return Promise.race([new Promise(resolve=>compactSound("blood",resolve)),later(1700)])}
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
const compactCardWeights=[["何事もなし",45],["寝返り",15],["援軍",10],["脱走",15],["粛清",10],["大地震",5]];
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
 compactArrival=null;
 compactIncident=null;compactIncidentEffect=null;compactIncidentMarks=[];compactQuakeMove=null;compactQuakeLanding=null;compactQuakeCracks=[];compactClosingHoles=[];compactHoleFading=false;compactBloodMarks=[];debugAwakenKey=null;pendingWeaponDisplay=null;$("compactCardOverlay").classList.add("hidden");$("compactIncidentStage").classList.add("hidden");$("compactCardFace").classList.remove("revealed");
 $("compactIntroClash").classList.remove("show");$("compactActionLayer").replaceChildren();
}
function compactPickCard(side){
 // Artillery belongs to the Toba-Fushimi deck, never to a turn-count timer.
 // Each army can draw each weapon at most once; other chapters are unchanged.
 const base=stage===3?compactCardWeights.map(([name,weight])=>[name,weight*.8]):compactCardWeights;
 // Do not draw a card that cannot affect the current legal position.
 // A silent no-op was especially confusing for defection on small boards.
 const deck=base.filter(([kind])=>{
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
function compactPlanQuake(){
 // Mini-board earthquake: move at most two distinct pieces, without chaining
 // one piece through multiple squares or replacing any other piece.
 const all=[];for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)
  if(g.board[y][x]&&g.board[y][x].t!=="玉")all.push({y,x});
 const maxMoves=g.w===5?3:6,minMoves=g.w===5?1:3;
 for(let count=Math.min(maxMoves,all.length);count>=minMoves;count--)
  for(let attempt=0;attempt<80;attempt++){
   const B=g.clone(g.board),candidates=[...all].sort(()=>Math.random()-.5),shifts=[];
   const usedSources=new Set(),usedTargets=new Set();
   for(const v of candidates){
    if(shifts.length>=count)break;
    const source=v.y+":"+v.x;
    if(usedTargets.has(source)||usedSources.has(source)||!B[v.y][v.x])continue;
    const positions=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const Y=v.y+dy,X=v.x+dx,target=Y+":"+X;
     if((dy||dx)&&Y>=0&&Y<g.h&&X>=0&&X<g.w&&!B[Y][X]&&!g.isHole(Y,X)
        &&!usedSources.has(target)&&!usedTargets.has(target))positions.push({Y,X});
    }
    if(!positions.length)continue;
    const target=positions[Math.floor(Math.random()*positions.length)];
    B[target.Y][target.X]=B[v.y][v.x];B[v.y][v.x]=null;
    usedSources.add(source);usedTargets.add(target.Y+":"+target.X);
    shifts.push({...v,...target});
   }
   if(shifts.length===count&&compactSafeBoard(B))return {B,shifts};
  }
 return null;
}
function compactCardStart(side){
 if(!compactMode()||ended)return;compactIncident={side,kind:null,revealed:false,voiceDone:true,closeRequested:false};
 busy=true;compactTurnLocked=true;selected=null;render();
 const overlay=$("compactCardOverlay"),face=$("compactCardFace");overlay.classList.add("hidden");face.classList.remove("revealed","card-text-ready");$("compactCardArtwork").removeAttribute("src");
 $("compactCardHeading").textContent="";$("compactCardText").textContent="";$("compactCardPrompt").textContent="";
 const stage=$("compactIncidentStage"),banner=$("compactIncidentBanner"),game=epoch,incident=compactIncident;
 stage.classList.remove("hidden");banner.style.animation="none";void banner.offsetWidth;banner.style.animation="";
 compactSound("banner");
 setTimeout(()=>{if(game!==epoch||compactIncident!==incident||incident.revealed)return;
  stage.classList.add("hidden");overlay.classList.remove("hidden");sfx("card");compactCardReveal();
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
  if(fallen.length){const revived=fallen[Math.floor(Math.random()*fallen.length)];compactIncidentEffect={kind,side,uid:revived.uid};detail="援軍！ 戦死した"+revived.t+"が持ち駒に復活する"}
  else{compactIncidentEffect={kind,side,reserve:true};detail="援軍到着！ 新たな銀将が持ち駒に加わる"}
 }
 else{
  const owner=kind==="寝返り"?1-side:side,options=compactEligible(owner,kind==="粛清"?["歩","香","桂","銀"]:null);
  if(!options.length)detail=kind+"：安全な対象がないため効果なし";
  else{const v=options[Math.floor(Math.random()*options.length)];compactIncidentEffect={kind,side,owner,y:v.y,x:v.x};
   detail=kind==="寝返り"?"敵の"+v.p.t+"が寝返り、味方の持ち駒に加わる":kind==="脱走"?"味方の"+v.p.t+"が脱走する":"味方の"+v.p.t+"を粛清する";
  }
 }
 const face=$("compactCardFace");face.style.backgroundImage="none";
 // The paper-flip sound accompanies the illustrated front entering the screen.
 face.classList.remove("card-text-ready");$("compactCardArtwork").src=compactCardFaces[kind];face.classList.add("revealed");
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
 playGestureAudio(compactCardVoices[kind],done,"voice");setTimeout(done,15000);
}
function compactCardClose(){
 const state=compactIncident;if(!state||!state.revealed)return;
 if(!$("compactCardFace").classList.contains("card-text-ready"))return;
 if(!state.voiceDone){state.closeRequested=true;$("compactCardPrompt").textContent="読み上げ終了後に進みます…";return}
 compactIncident=null;$("compactCardOverlay").classList.add("hidden");compactApplyIncident(compactIncidentEffect);compactIncidentEffect=null;
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
   $("compactCardArtwork").src=`assets/cards/weapons/${item.kind}-v2.webp`;face.classList.add("revealed");$("compactCardText").textContent="";
   window.ShinsengumiBattleRules.revealAfterTurn(face,"storyCardTurn",()=>{
    $("compactCardText").textContent=detail;face.classList.add("card-text-ready");
   },{valid:()=>pendingWeaponDisplay===item});
   $("compactCardPrompt").textContent="";
   // Name the revealed weapon card first, then speak 「撃て！」 once at launch.
   playKabukiVoice(item.kind).then(()=>{
    if(pendingWeaponDisplay!==item)return;
    item.voiceDone=true;
   if(item.closeRequested){pendingWeaponDisplay=null;$("compactCardOverlay").classList.add("hidden");fire(item.kind,item.ownerSide)}
   });return;
  }
  if(!faceIsWeaponReady())return;
  if(!item.voiceDone){item.closeRequested=true;$("compactCardPrompt").textContent="号令が終わると砲撃を開始します…";return}
  pendingWeaponDisplay=null;$("compactCardOverlay").classList.add("hidden");fire(item.kind,item.ownerSide);return;
 }
 if(!compactIncident)return;if(!compactIncident.revealed)compactCardReveal();else compactCardClose();
};
function faceIsWeaponReady(){return $("compactCardFace").classList.contains("card-text-ready")}
function compactResumeTurn(){
 if(ended)return;busy=false;compactTurnLocked=true;render();const game=epoch;
 // The finished match queues the turn illustration 1.4s (enemy) / 1.8s
 // (player) after the preceding action, then shows the artwork for 1.8s.
 const side=g.side;
 setTimeout(()=>{if(game!==epoch||ended||g.side!==side)return;
  if(side===1)compactTurn(1,()=>{if(game===epoch)setTimeout(()=>{if(game===epoch)computer()},1050)});
  else compactTurn(0);
 },side===1?1400:1800);
}
function compactGrantReinforcement(effect){
 const fallen=g.fallen[effect.side],i=effect.reserve?-1:fallen.findIndex(p=>p.uid===effect.uid);
 if(i<0&&!effect.reserve)return null;
 const revived=effect.reserve
  ?{t:"銀",s:effect.side,origin:effect.side,uid:`reinforcement:${effect.side}:${++reinforcementSerial}`,cid:null,mob:reinforcementSerial%8,p:false}
  :fallen.splice(i,1)[0];
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
  const candidate=effect.reserve?{t:"銀",s:effect.side,origin:effect.side}:g.fallen[effect.side].find(p=>p.uid===effect.uid);
  if(!candidate){compactResumeTurn();return}
  banner(effect.side,candidate,true);render();
  const hand=$("storyHand"+effect.side);
  storyBannerMessage("援軍！ "+person(candidate).name+"が到着する！",effect.side);
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
   storyBannerMessage("援軍！ "+person(revived).name+"が持ち駒に加わった！",effect.side);
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
 if(!p||p.s!==owner||p.t==="玉"){compactResumeTurn();return}
 compactIncidentMarks=[y+":"+x];banner(owner,p);render();
 // Finished match plays the gravel-run cue as the desertion starts, not after it ends.
 if(kind==="脱走"||kind==="寝返り")compactSound("desert");
 const finish=()=>{if(game!==epoch)return;compactIncidentMarks=[];compactResumeTurn()};
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
    attack:()=>{render();board.children[y*g.w+x]?.classList.add("compact-blood")},
    impact:()=>new Promise(resolve=>{compactSound("kill",resolve);setTimeout(resolve,1800)}),
    cry:()=>new Promise(resolve=>{
     if(p.s===0)sfx("loss",resolve);else compactSound("sacchoLoss",resolve);
     setTimeout(resolve,3800);
    }),
    result:finish
   });
  }else{render();setTimeout(finish,650)}
 };
 if(kind==="脱走"){
  // The pawn vanishes as the officer departs; neither action waits for the other.
  const rect=board.children[y*g.w+x]?.getBoundingClientRect(),layer=$("compactActionLayer");
  const motion=!!rect&&!!Element.prototype.animate&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let ghost=null;
  if(motion){
   const width=Math.min(72,Math.max(42,rect.width*1.15)),height=width*1.4;
   ghost=document.createElement("img");ghost.src="assets/sprites/figures/"+(owner===0?"shinsengumi_back":"saccho_front")+".webp";ghost.alt="";
   Object.assign(ghost.style,{left:rect.left+rect.width/2-width/2+"px",top:rect.top+rect.height/2-height/2+"px",width:width+"px",height:height+"px"});layer.replaceChildren(ghost);
  }
  const depart=()=>{if(game!==epoch)return;g.board[y][x]=null;render()};
  if(!ghost){depart();setTimeout(finish,180);return}
  setTimeout(depart,120);
  const travel=owner===0?-innerWidth:innerWidth;
  ghost.animate([{offset:0,opacity:1,transform:"rotate(0)"},{offset:.12,transform:"rotate(-8deg)"},{offset:.24,transform:"rotate(8deg)"},{offset:.38,transform:"rotate(-6deg)"},{offset:.62,opacity:1,transform:`translate(${travel*.42}px,-38px) rotate(-15deg)`},{offset:1,opacity:0,transform:`translate(${travel}px,${-rect.top-100}px) rotate(16deg) scale(.5)`}],{duration:2600,easing:"ease-in-out",fill:"forwards"}).finished.catch(()=>{}).then(()=>{ghost.remove();finish()});
 }else setTimeout(remove,850);
}
function compactIntro(){
 if(!compactMode())return;
 const game=epoch,root=$("compactIntroClash");root.classList.remove("show");void root.offsetWidth;root.classList.add("show");
 setTimeout(()=>{if(game===epoch&&root.classList.contains("show"))compactSound("slash")},1010);
 setTimeout(()=>{if(game!==epoch||ended)return;root.classList.remove("show");compactTurnLocked=true;render();
  setTimeout(()=>{if(game===epoch&&!ended){busy=false;compactTurn(0,null,true)}},450);
 },2600);
}
function animateCompactEscort(side,y,x,captive,done){
 // Adapted from the finished 9x9 game's animateCaptureEscort; board coordinates use g.w.
 const cell=$("storyBoard").children[y*g.w+x],jail=$("storyHand"+side)?.closest(".hand-container");
 const rect=cell?.getBoundingClientRect(),goal=jail?.getBoundingClientRect(),layer=$("compactActionLayer"),game=epoch;
 if(!rect||!goal||!Element.prototype.animate||window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){setTimeout(done,180);return}
 // One capture = one officer illustration, owned by the capturing side only.
 // Remove any previous animation before starting a new one.
 layer.replaceChildren();
 const width=Math.min(72,Math.max(42,rect.width*1.15)),height=width*1.4;
 const targetX=rect.left+rect.width/2-width/2,targetY=rect.top+rect.height/2-height/2;
 const goalX=goal.left+goal.width/2-width/2,goalY=goal.top+goal.height/2-height/2;
 const startX=side===0?-width-20:innerWidth+20;
 function sprite(src,left,top){const img=document.createElement("img");img.src=src;img.alt="";Object.assign(img.style,{left:left+"px",top:top+"px",width:width+"px",height:height+"px"});layer.append(img);return img}
 const guard=sprite("assets/sprites/figures/"+(side===0?"shinsengumi_back":"saccho_front")+".webp",startX,targetY);
 const dx=targetX-startX,dy=goalY-targetY;
 guard.animate([{offset:0,opacity:0,transform:"scale(.8)"},{offset:.3,opacity:1,transform:`translateX(${dx}px)`},{offset:.48,opacity:1,transform:`translateX(${dx}px)`},{offset:.88,opacity:1,transform:`translate(${goalX-startX}px,${dy}px)`},{offset:1,opacity:0,transform:`translate(${goalX-startX}px,${dy}px) scale(.8)`}],{duration:1450,easing:"ease-in-out",fill:"forwards"}).finished.catch(()=>{}).then(()=>{guard.remove();if(game===epoch)done()});
}
function compactTurn(side,after,opening=false){
 if(!compactMode()||ended)return after?.();
 const stamp=++compactFxSerial,game=epoch;
 // Opening notice must use the battle viewport, not the story page scroll position.
 // The opening battle position is already anchored before the VS sequence.
 compactTurnLocked=true;
 const panel=$("compactTurnNotice"),art=$("compactTurnArt"),fallback=$("compactTurnFallback");
 // All battle sizes use the same board-relative turn presentation routine.
 window.ShinsengumiTurnPresentation.place($("storyBoard"),panel,'offset');
 const title=side===0?"新選組の手番！":"敵軍の手番！";
 art.src=side===0?"assets/turn-notice/turn_shinsengumi_illustrated.png":"assets/turn-notice/turn_enemy_illustrated.png";
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
 const modal=$("storyPopup");$("popupTitle").textContent=title;$("popupText").textContent=text;
 modal.querySelectorAll(".story-verdict-art,.story-final-loser").forEach(node=>node.remove());
 const image=$("popupArt");image.classList.toggle("hidden",!img);
 if(img){image.onerror=()=>image.classList.add("hidden");image.src=img}
 const buttons=$("popupButtons");buttons.replaceChildren();
 options.forEach((v,i)=>{const b=document.createElement("button");b.type="button";b.textContent=v[0];if(i)b.className="secondary";
  b.onclick=()=>{modal.classList.add("hidden");v[1]()};buttons.append(b)});
 modal.classList.remove("hidden");
}
function collect(p){
 if(devPreview||debugModified||!p||p.cid==null)return;
 const id=(p.origin===0?0:20)+p.cid;
 if(id<0||id>=40)return;
 try{const owned=JSON.parse(localStorage.getItem(COL)||"[]");if(Array.isArray(owned)&&!owned.includes(id)){owned.push(id);localStorage.setItem(COL,JSON.stringify(owned));storyBannerMessage("🎴 人物カード獲得！ "+person(p).name,0)}}catch(e){}
}
function person(p){
 if(!p)return{name:"",role:"",img:""};
 const king=p.king;
 if(king==="miyabe")return{name:"宮部鼎蔵",role:"尊攘派志士",img:"assets/dialogue_banners/miyabe_banner.webp?v=miyabe-framing-20261107b"};
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
function banner(s,p,hold=false){
 if(!p)return;
 const a=person(p),prefix=s===0?"player":"enemy",image=$(prefix+"StoryArt");
 const awakened=compactMode()&&((compactCaptures[compactFighterKey(p)]||0)>=3||debugAwakenKey===compactFighterKey(p));
 $(prefix+"StoryBanner").classList.toggle("compact-awakened",awakened);
 $(prefix+"StoryName").textContent=a.name;
 const caption=document.createElement('span');caption.className='story-role-caption';caption.textContent=a.role;
 const piece=document.createElement('span');piece.className='story-role-piece';piece.textContent=label(p);
 $(prefix+"StoryRole").replaceChildren(caption,piece);
 image.style.display="block";image.onerror=()=>image.style.display="none";image.src=a.img;
 const panel=$(prefix+"StoryBanner"),currentEpoch=epoch;
 panel.classList.add("show-character");
 clearTimeout(storyBannerTimers[s]);
 // The stamp belongs to this officer's visible portrait, not the message board.
 if(!hold){
  const start=Date.now();
  const closeAfterVoice=()=>{
   if(currentEpoch!==epoch)return;
   const voice=activeStoryVoice;
   if(((voice&&!voice.paused&&!voice.ended)||battleVoiceActive)&&Date.now()-start<15000){storyBannerTimers[s]=setTimeout(closeAfterVoice,160);return}
   panel.classList.remove("show-character");
  };
  storyBannerTimers[s]=setTimeout(closeAfterVoice,2300);
 }
}
// As in the completed match, turn/status notices live inside the character banners.
// Keep one screen-reader announcement; do not insert a third board between the enemy hand and field.
function storyBannerMessage(message,side=g?.side??0,cardCountdown=null){
 $("storyStatus").textContent=message;
 $("playerBannerStatus").textContent=side===0?message:"新選組、待機中";
 $("enemyBannerStatus").textContent=side===1?message:"薩長同盟、布陣中";
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
 return !!g&&!ended&&!busy&&!compactTurnLocked&&g.side===0
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
 if(!saved)return;
 $(prefix+"StoryName").textContent=saved.name;$(prefix+"StoryRole").textContent=saved.role;
 const art=$(prefix+"StoryArt");if(saved.src)art.src=saved.src;
}
const storyPieceHover=window.ShinsengumiPieceHover.bind({
 root:$("storyBoard"),
 getPiece:index=>g?.board[Math.floor(index/g.w)]?.[index%g.w],
 canPreview:canPreviewStoryHover,
 onPreview:previewStoryUnit,
 onClear:restoreStoryHover
});
const label=p=>p.p?({飛:"龍",角:"馬",銀:"全",桂:"圭",香:"杏",歩:"と"}[p.t]||p.t):p.t;
function screenHome(){
 storyPieceHover.reset();
 stopStoryClip("voice");stopStoryClip("fx");stopStoryQuakeBattle();
 $("storyPopup").classList.remove("compact-finale","compact-promotion");
 hideCompactFx();compactCaptures={};restoreStoryHover();window.StoryBgm?.stop();
 $("storyDevToggle").textContent=devPreview?"🛠 開発テスト：終了して通常表示へ":"🛠 開発テスト：全章を表示";
 $("storyDevToggle").setAttribute("aria-pressed",String(devPreview));
 $("storyDevNote").hidden=!devPreview;
 chooseView("storyHome");document.body.style.backgroundImage="";const el=$("storyChapters");el.replaceChildren();
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
  {id:"miyabe",name:"宮部鼎蔵",subtitle:"尊王攘夷派・池田屋事件",text:"肥後出身の尊攘派志士。池田屋事件で命を落とした。",art:"assets/collection/king_miyabe.webp"},
  {id:"kusaka",name:"久坂玄瑞",subtitle:"長州藩・禁門の変",text:"吉田松陰に学んだ長州藩士。禁門の変で自刃した。",art:"assets/portraits/38.webp"},
  {id:"ito",name:"伊東甲子太郎",subtitle:"御陵衛士・油小路事件",text:"新選組を離れて御陵衛士を結成。油小路事件で暗殺された。",art:"assets/collection/king_ito.webp"},
  {id:"saigo",name:"西郷隆盛",subtitle:"薩摩藩・鳥羽伏見の戦い",text:"新政府側の有力指導者。ゲーム上の最終章王将。",art:"assets/portraits/21.webp"}
 ];
 for(const p of profile){
  const card=document.createElement("button");card.className="story-king-card";const unlocked=owned.includes(p.id);
  card.setAttribute("aria-label",unlocked?p.name+"の人物情報":"未解放の人物カード");
  const picture=document.createElement("img");picture.alt=unlocked?p.name:"";picture.loading="lazy";picture.src=unlocked?p.art:"assets/cards/back/card-back-saccho-1024x1536.webp";
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
 window.StoryBgm?.play(i===4?"ending":"prologue");
 stage=i;const ch=i===-1?D.prologue:i===4?D.epilogue:D.chapters[i];
 dialog=ch.intro;at=0;onEnd=i===-1||i===4?screenHome:()=>battle(i);
 $("dialogueScene").className="scene-art scene-"+ch.scene;$("dialogueDate").textContent=storyKanjiNumerals(ch.era);$("dialogueTitle").textContent=ch.title;chooseView("storyDialogue");line();
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
 const target=$("dialogueBody"),text=storyKanjiNumerals(textValue),fragment=document.createDocumentFragment();
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
function battle(i,oilFormation=null){
 // Oil-koji formation choice happens before the battle and its opening animation.
 // Only swap the friendly rook with one front-rank pawn; all other pieces stay fixed.
 if(i===2&&oilFormation===null){
  popup("油小路・布陣を選ぶ",
   "王将は中央固定。駒の数と動きは変わりません。\n飛車と歩を入れ替え、左・中央・右の三陣形から選びます。",
   [["左翼の布陣",()=>battle(i,1)],["中央の布陣（標準）",()=>battle(i,2)],["右翼の布陣",()=>battle(i,3)]]);
  return;
 }
 $("storyPopup").classList.remove("compact-finale","compact-promotion");
 document.body.classList.remove("story-opening-viewport-lock");
 hideCompactFx();compactCaptures={};reinforcementSerial=0;
 window.StoryBgm?.play(i===0||i===2?"battle01":"battle02");
 epoch++;stage=i;g=new window.StoryEngine(i);selected=null;busy=false;ended=false;weapons=[];debugModified=false;
 if(i===2&&[1,3].includes(oilFormation)){
  const front=g.board[4];
  [front[2],front[oilFormation]]=[front[oilFormation],front[2]];
  // Revert on any future rule change that makes this starting setup invalid.
  if(g.check(g.board,0)||g.check(g.board,1)||!g.legal(0).length||!g.legal(1).length)
   [front[2],front[oilFormation]]=[front[oilFormation],front[2]];
 }
 if(i===2)g.startOilAmbush();
 const ch=D.chapters[i];$("battleChapter").textContent="第"+(i+1)+"章 ／ "+ch.era;$("battleTitle").textContent=ch.title;
 const board=$("storyBoard");board.dataset.stage=i;board.style.setProperty("--cols",ch.w);board.style.setProperty("--rows",ch.h);
 board.classList.toggle("small-board",ch.w===5);
 document.body.style.backgroundImage="linear-gradient(#10172138,#07101660),url('assets/backgrounds/story/"+ch.scene+"-bg-v2.webp'),url('assets/backgrounds/seasons/kyoto-autumn.webp')";
 document.body.style.backgroundSize="cover";document.body.style.backgroundAttachment="fixed";
 for(const side of [0,1]){clearTimeout(storyBannerTimers[side]);$(side?"enemyStoryBanner":"playerStoryBanner").classList.remove("show-character","compact-awakened")}
 chooseView("storyBattle");render();
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
function render(){
 storyPieceHover.reset();
 if(!g||$("storyBattle").classList.contains("hidden"))return;
 const root=$("storyBoard");
 const inputLocked=!canPreviewStoryHover();
 root.classList.toggle("input-locked",inputLocked);
 root.setAttribute("aria-disabled",String(inputLocked));
 root.replaceChildren();
 const legal=!inputLocked?g.legal(0):[];
 const defending=!inputLocked&&g.side===0&&g.check(g.board,0);
 // Highlight only moves that ACTUALLY defend the king; the special rule also
 // permits risky moves, but those require an explicit confirmation.
 const safeDefense=defending?legal.filter(m=>{
  const B=g.clone(g.board),H=g.handClone(g.hands);g.act(B,H,0,m);return !g.check(B,0);
 }):[];
 const defendingPieces=defending?new Set(safeDefense.filter(m=>!m.drop).map(m=>m.y+":"+m.x)):null;
 const defendingDrops=defending?new Set(safeDefense.filter(m=>m.drop).map(m=>m.t)):null;
 const targets=selected?legal.filter(m=>selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x):[];
 const attackers=compactCheckSources();
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
  const p=g.board[y][x],btn=document.createElement("button");btn.type="button";btn.className="sq";btn.setAttribute("role","gridcell");
  btn.setAttribute("aria-label",(y+1)+"段"+(x+1)+"列 "+(p?person(p).name+" "+label(p):"空きマス"));
  if(g.last?.y===y&&g.last.x===x)btn.classList.add("last");
  if(selected&&!selected.drop&&selected.y===y&&selected.x===x)btn.classList.add("selected");
  if(targets.some(m=>m.Y===y&&m.X===x))btn.classList.add(p&&p.s===1?"capture-hint":"hint");
  if(p?.t==="玉"&&g.check(g.board,p.s))btn.classList.add("king-in-check");
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
  if(p){const token=document.createElement("span");token.className="story-token"+(p.s?" enemy":"")+(p.p?" promoted":"");token.textContent=label(p);token.setAttribute("aria-hidden","true");btn.append(token)}
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
   const b=document.createElement("button");b.type="button";b.className="story-hand-piece";b.dataset.piece=t;b.setAttribute("aria-label",(s===0?"新選組":"薩長同盟")+"の持ち駒 "+t+" "+groups[t]+"枚");b.disabled=ended||busy||compactTurnLocked||s===1||g.side!==0;
   const fig=document.createElement("img");fig.className="story-hand-art story-hand-figure";fig.src="assets/sprites/figures/"+(s===0?"shinsengumi_back":"saccho_front")+".webp";fig.alt="";fig.draggable=false;fig.decoding="async";
   const letter=document.createElement("img");letter.className="story-hand-art story-hand-letter";letter.src="assets/sprites/letters/normal_"+names[t]+".webp";letter.alt="";letter.draggable=false;letter.decoding="async";
   const fallback=document.createElement("span");fallback.className="story-hand-fallback";fallback.textContent=t;
   const showFallback=()=>{fig.style.display="none";letter.style.display="none";fallback.style.display="grid"};fig.onerror=showFallback;letter.onerror=showFallback;
   const count=document.createElement("span");count.className="story-hand-count";count.textContent="×"+groups[t];count.setAttribute("aria-hidden","true");b.append(fig,letter,fallback,count);
   if(s===0&&defendingDrops?.has(t))b.classList.add("check-defender");
   if(s===0&&selected?.drop&&selected.t===t)b.classList.add("selected");b.onclick=()=>{if(b.disabled)return;selected={drop:true,t};render()};hand.append(b)}
 }
 const countdown=stage===2&&g?.oilPhase===1?"伊東甲子太郎を討て！":compactMode()&&!ended?(compactIncident?"動乱の刻・事件札を確認中":`動乱の刻まで${compactCardRemaining()}手`):"";
 const turnText=ended?"対局終了":busy?"演出・思考中…":g.side?"敵軍、思案中…"+(g.check(g.board,1)?"　⚠王手":""):"新選組の手番！"+(g.check(g.board,0)?"　⚠王手！ 防ぐか、覚悟して主君を見捨てる":"");
 const showCountdown=countdown&&!busy;
 storyBannerMessage(turnText+(showCountdown?"　"+countdown:""),g.side,showCountdown?{turn:turnText,remaining:g?.oilPhase===1?"・伊東を討て！":compactIncident?"・事件札を確認中":`まで${compactCardRemaining()}手`}:null);
 $("storyStatus").classList.toggle("check-status",!ended&&g.check(g.board,g.side));
 $("compactCardCountdown").textContent=countdown;
 const canTest=!ended&&!busy&&!compactTurnLocked&&!compactIncident&&!pendingWeaponDisplay&&g.side===0;
 for(const id of ["debugCard","debugOilAmbush","debugQuake","debugReinforce","debugRevival","debugDesert","debugPurge","debugKill","debugAwaken","debugCannon","debugRifle","debugTurn","debugWin","debugLose","debugFx","debugVoice0","debugVoice1"]){
  $(id).disabled=!canTest||((id==="debugCannon"||id==="debugRifle")&&stage!==3)||(id==="debugOilAmbush"&&(stage!==2||g.oilPhase!==1));
 }
}
function square(y,x){
 if(ended||busy||compactTurnLocked||g.side!==0)return;
 const legal=g.legal(0),p=g.board[y][x];
 if(selected){
  const m=legal.find(m=>m.Y===y&&m.X===x&&(selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x));
  if(m){
   const proceed=()=>{
    const unit=m.drop?g.hands[0].find(v=>v.t===m.t):g.board[m.y][m.x];
    if(!m.drop&&g.promoted(unit,m.y,m.Y)&&!g.forced(unit,m.Y)){
     const modal=$("storyPopup");modal.classList.toggle("compact-promotion",compactMode());
     popup("成るか、成らぬか","この駒を成り駒にしますか？",[["成る",()=>{modal.classList.remove("compact-promotion");makeMove(m,true)}],["成らぬ",()=>{modal.classList.remove("compact-promotion");makeMove(m,false)}]]);
     const options=[...$("popupButtons").querySelectorAll("button")];
     options.forEach(button=>button.disabled=true);
     playStoryClip(kabukiVoice.promotion,"voice",()=>{if(!modal.classList.contains("hidden"))options.forEach(button=>button.disabled=false)});return;
    }makeMove(m,false);
   };
   if(g.allowAbandonKing&&g.check(g.board,0)){
    const B=g.clone(g.board),H=g.handClone(g.hands);g.act(B,H,0,m);
    if(g.check(B,0)){
     popup("主君を見捨てるのか！","王手を防がず別の手を指します。次の一手で王を討ち取られ、敗北する危険があります。",[["忠義を尽くす",()=>{}],["覚悟して指す",proceed]]);
     return;
    }
   }
   proceed();return;
  }
 }
 if(p?.s===1){banner(1,p);return}
 selected=p?.s===0?{y,x}:null;render();if(p)banner(p.s,p);
}
async function oilAmbushReveal(){
 const game=epoch,board=$("storyBoard");
 // Keep a visual copy of each friendly piece until the actual collision beat.
 const before=[...board.children].map(cell=>cell.querySelector(".story-token")?.cloneNode(true)||null);
 const previousKing=[...board.children].findIndex(cell=>cell.getAttribute("aria-label")?.includes("近藤勇 玉"));
 const event=g.triggerOilAmbush();
 if(event){g.ply=0;compactCaptures={};}
 if(!event){busy=false;render();popup("布陣を整えられません","近藤勇の退路が確保できません。再挑戦してください。",[["再挑戦",()=>battle(2)]]);return}
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
  const rect=cell.getBoundingClientRect(),width=Math.max(22,rect.width*.8),height=Math.max(27,rect.height*.84);
  // A fixed overlay runner is not clipped by the board's square or perimeter layers.
  const runner=document.createElement("div");runner.textContent=token.textContent;
  runner.className="oil-ambush-runner";runner.setAttribute("aria-hidden","true");
  Object.assign(runner.style,{
   position:"fixed",zIndex:"170",pointerEvents:"none",display:"grid",placeItems:"center",
   left:(rect.left+(rect.width-width)/2)+"px",top:(rect.top+(rect.height-height)/2)+"px",
   width:width+"px",height:height+"px",boxSizing:"border-box",fontSize:getComputedStyle(token).fontSize,
   fontFamily:"system-ui,sans-serif",fontWeight:"900",color:"#fffaf0",
   textShadow:"0 1px 3px #1b0b10",background:'url("assets/pieces/saccho_token.png") center/100% 100% no-repeat',
   filter:"drop-shadow(0 4px 6px #000b)"
  });
  layer.append(runner);
  // Two distinct footfalls per arriving piece; unlocked Web Audio also works on iOS.
  let runningFootsteps=true;
  const footstep=()=>playGestureAudio("assets/audio/sfx/step_soil.mp3",null,"fx",2.5,()=>runningFootsteps&&game===epoch&&!ended);
  footstep();
  const secondStep=setTimeout(()=>{if(runningFootsteps&&game===epoch&&!ended)footstep()},390);
  const startY=-Math.max(160,Math.min(340,rect.top+100));
  if(runner.animate&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
   const animation=runner.animate([
    {opacity:0,transform:`translate(65px,${startY}px) rotate(180deg) scale(.76)`},
    {opacity:1,offset:.18,transform:`translate(45px,${startY*.7}px) rotate(180deg) scale(.9)`},
    {opacity:1,transform:"translate(0,0) rotate(180deg) scale(1)"}
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
   await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};compactSound("kill",finish);setTimeout(finish,1700)});
   if(game!==epoch||ended){layer.replaceChildren();return}
   await playCasualtyCry();
   if(game!==epoch||ended){layer.replaceChildren();return}
   ghosts.get(i)?.remove();cell.classList.remove("compact-blood");
  }
  await later(220);
 }
 layer.replaceChildren();
 if(game!==epoch||ended)return;
 const message="伊東甲子太郎、討死！\n御陵衛士の伏兵が布陣した。"+(event.retreat?"\n近藤勇は後方へ退却！":"")+"\n藤堂平助率いる御陵衛士と決着をつけよ。\n動乱の刻は第二幕の2手目から再開。";
 popup("御陵衛士、伏兵出現！",message,[["応戦する",()=>{busy=false;compactTurnLocked=false;g.side=0;render()}]]);
}
function makeMove(m,prom){
 const actor=g.side,source=m.drop?g.hands[actor].find(p=>p.t===m.t):g.board[m.y][m.x];
 const holesBefore=compactMode()?[...g.holes]:[];
 let moveVoiceDone=Promise.resolve();
 const announce=(kind,player=compactSound)=>{moveVoiceDone=moveVoiceDone.then(()=>new Promise(resolve=>player(kind,resolve)))};
 const key=compactFighterKey(source),before=compactCaptures[key]||0;
 const capturePlan=window.ShinsengumiBattleRules.captureResult({captured:!m.drop&&!!g.board[m.Y][m.X],drop:!!m.drop,previous:before,hitokiri:compactMode()});
 const oilItoCapture=stage===2&&g.oilPhase===1&&!m.drop&&g.board[m.Y][m.X]?.king==="ito";
 const willKill=capturePlan.lethal||oilItoCapture;
 let justAwakened=false;
 const {unit,captured}=g.move(m,prom,willKill);
 if(compactMode())compactClosingHoles=holesBefore.filter(h=>!g.holes.some(v=>v.x===h.x&&v.y===h.y));
 if(compactMode())compactArrival={y:m.Y,x:m.X};
 if(compactMode()&&captured){
  compactCaptures[key]=capturePlan.next;
  justAwakened=capturePlan.awakened;
 }
 const gaveCheck=g.check(g.board,1-actor);
 const moveCues=window.ShinsengumiBattleRules.voiceCues({captured:!!captured,lethal:willKill,gaveCheck});
 if(captured){
  if(!willKill){
   for(const cue of moveCues){if(cue==="capture"){
    if(actor===0)announce("capture",sfx);else announce("sacchoCapture");
   }else announce("check")}
   if(compactMode())compactSound("slash");
  }
  // The fallen Shinsengumi officer responds after the enemy's capture shout.
  // Ordinary capture plays 「捕えた」 only. 「無念」 is reserved for killing,
  // purging and weapon casualties; the finished match does not stack both.
  if(actor===0)collect(captured);banner(1-actor,captured);
 }else{
  sfx("move");
  const nearby=g.board.some((row,Y)=>row.some((p,X)=>p&&p.s!==actor&&Math.max(Math.abs(Y-m.Y),Math.abs(X-m.X))<=1));
  const dedicated=actor===0?(source?.origin===0&&source?.cid===0?"kondo":source?.origin===0&&source?.cid===1?"hijikata":null)
   :source?.origin===1&&source?.cid===0?"saigo":source?.origin===1&&source?.cid===2?"kido":null;
  if(moveCues.includes("check"))announce("check");
  else if(dedicated)announce(dedicated);
  else if(nearby&&Math.random()<.45)announce(actor===0?"move0":prom?"sacchoPromote":Math.random()<.3?"sacchoUryaa":"sacchoChesto");
 }
 if(unit)banner(actor,unit);selected=null;render();
 const oilFirstActVictory=stage===2&&g.oilPhase===1&&!g.king(1);
 // Being cornered without legal moves is not Ito's death.
 const rawResult=g.state();
 const result=stage===2&&g.oilPhase===1&&g.king(1)&&rawResult?.winner===0?null:rawResult;
 if(compactMode()){
  busy=true;render();const id=epoch;
  // Capture and the awakening seal must finish before the next turn or verdict.
  const afterFx=()=>moveVoiceDone.then(async()=>{
   if(id!==epoch||ended)return;
   if(justAwakened){
    compactCalligraphy(false);
    await playKabukiVoice("awakening");
    if(id!==epoch||ended)return;
   }
   await compactFadeExpiredHoles(id);
   if(id!==epoch||ended)return;
   compactArrival=null;
   if(oilFirstActVictory){
    // An explicit final blow before the ambush replaces the routine victory.
    compactCalligraphy(true);
    storyBannerMessage("伊東甲子太郎、斬殺！",0);
    await playKabukiVoice("kill");
    if(id!==epoch||ended)return;
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
  if(captured&&!willKill)animateCompactEscort(actor,m.Y,m.X,captured,afterFx);
  else if(willKill){
   // The shared contract enforces attack -> impact -> casualty cry -> result.
   (async()=>{
    const square=m.Y+":"+m.X;
    try{
     await window.ShinsengumiBattleRules.runOrderedEffect({
      valid:()=>id===epoch&&!ended,
      attack:()=>{compactCalligraphy(true);compactBloodMarks.push(square);render()},
      impact:playBloodImpact,
      cry:playCasualtyCry,
      result:()=>later(850)
     });
    }catch(error){console.error("斬殺演出の復旧処理",error)}
    finally{
     compactBloodMarks=compactBloodMarks.filter(v=>v!==square);
     if(id===epoch&&!ended){render();afterFx()}
    }
   })();
  }else setTimeout(afterFx,prom?800:850);
  return;
 }
 if(oilFirstActVictory){storyBannerMessage("伊東甲子太郎、斬殺！",0);oilAmbushReveal();return}
 if(result){finish(result.winner,result.why);return}
 if(g.side===1){busy=true;render();const id=epoch;setTimeout(()=>{if(id===epoch)computer()},420)}
}
function computer(){
 if(ended||!g||g.side!==1)return;
 const move=g.ai();busy=false;
 if(!move){
  if(stage===2&&g.oilPhase===1&&g.king(1)){
   // Ito remains alive: announce his helplessness before passing the turn.
   const game=epoch;
   busy=true;compactTurnLocked=true;render();
   storyBannerMessage("伊東甲子太郎「無念！」 指す手なし、パス",1);
   sfx("loss",()=>{if(game!==epoch||ended)return;g.side=0;g.ply++;compactResumeTurn()});
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
 $("compactCardArtwork").removeAttribute("src");
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
function finish(winner,reason){
 if(ended)return;const wasCompact=compactMode();epoch++;hideCompactFx();ended=true;busy=false;render();$("storyPopup").classList.toggle("compact-finale",wasCompact);if(winner===-1){popup("引き分け","対局は引き分けです。再挑戦できます。",[["再挑戦",()=>battle(stage)],["章選択",screenHome]]);return}const win=winner===0,ch=D.chapters[stage],king=ch.king;
 if(win&&!devPreview&&!debugModified){
  unlock=Math.max(unlock,stage+1);try{localStorage.setItem(SAVE,String(unlock));
   const arr=JSON.parse(localStorage.getItem(KINGS)||"[]");if(Array.isArray(arr)&&!arr.includes(king)){arr.push(king);localStorage.setItem(KINGS,JSON.stringify(arr))}}catch(e){}
 }

 // Same presentation contract as the finished game's showVictory().
 const overlay=$("storyEndOverlay");
 const opponent={miyabe:"miyabe",kusaka:"kusaka",ito:"ito",saigo:"saigo"}[king];
 const winnerId=win?"kondo":opponent,loserId=win?opponent:"kondo";
 window.SharedVictory.show({overlay,winnerElement:$("storyEndWinner"),loserElement:$("storyEndLoser"),
  winnerId,loserId,winnerName:win?"近藤勇":ch.boss,loserName:win?ch.boss:"近藤勇"});
 $("storyEndText").textContent="勝負あった！";
 overlay.classList.toggle("enemy-win",!win);
 const actions=$("storyEndActions");actions.replaceChildren();
 const choices=[
  [win?"物語を進める":"再挑戦",()=>win?(stage===3?talk(4):screenHome()):battle(stage)],
  ["章選択",screenHome]
 ];
 for(const [label,action] of choices){
  const button=document.createElement("button");button.type="button";button.textContent=label;
  button.onclick=()=>{overlay.classList.add("hidden");action()};
  actions.append(button);
 }
 overlay.classList.remove("hidden");
 // Finished game: taiko 'finish' impact followed by shobuAtta voice.
 playStoryClip("assets/audio/sfx/taiko_dodon.mp3","fx");
 sfx("win");
}
function leave(){
 if(ended){screenHome();return}
 popup("対局を中断しますか？","途中の対局は保存されません。",[["章選択へ",()=>{epoch++;ended=true;busy=false;screenHome()}],["戻る",()=>{}]]);
}
$( "storyDevToggle" ).onclick=()=>{devPreview=!devPreview;screenHome()};
$("dialogueNext").onclick=()=>{
 const sortie=stage>=0&&stage<4&&at===dialog.length-1;
 // 物語のページ切り替えは従来の紙のめくり音を維持する。
 // 最終ページの出陣ボイスには重ねない。
 if(at<dialog.length-1)sfx("flip");
 if(sortie&&voiceEnabled){
  window.StoryBgm?.duck();
  playStoryClip("assets/audio/voice_iza_shutsujin.mp3","voice");
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
$("storyResign").onclick=()=>popup("降参しますか？","まだこの章は突破していません。",[["降参する",()=>finish(1,"降参")],["続ける",()=>{}]]);
$("storyRules").onclick=()=>popup("操作・ルール","駒をタップし、緑色の移動先をタップします。\n持ち駒は下欄から選択。二歩・行き所のない駒打ちは禁止です。\n新選組将棋独自の『主君を見捨てる』ルールでは、王手を防がず別の手を選べます。警告後に覚悟を決め、玉を取られれば『主君討死』で敗北します。\n鳥羽・伏見では両軍が大砲と鉄砲を各1回使用します。", [["閉じる",()=>{}]]);
$("audioToggle").onclick=()=>{window.StoryBgm?.unlock();soundOff=!soundOff;window.StoryBgm?.setMuted(soundOff);$("audioToggle").textContent=soundOff?"♪ BGM OFF":"♪ BGM ON";$("audioToggle").setAttribute("aria-pressed",String(!soundOff))};
$("storyVoiceToggle").onclick=()=>{voiceEnabled=!voiceEnabled;if(!voiceEnabled)stopStoryClip("voice");$("storyVoiceToggle").textContent=voiceEnabled?"声 ON":"声 OFF";$("storyVoiceToggle").setAttribute("aria-pressed",String(voiceEnabled))};
$("storyFxToggle").onclick=()=>{fxEnabled=!fxEnabled;if(!fxEnabled){stopStoryClip("fx");stopStoryQuakeBattle()}$("storyFxToggle").textContent=fxEnabled?"効果音 ON":"効果音 OFF";$("storyFxToggle").setAttribute("aria-pressed",String(fxEnabled))};
const voiceSamples=["assets/audio/voice_shinsengumi_move_sorya.mp3","assets/audio/voice_kondo_isami_king_move.mp3","assets/audio/voice_hijikata_toshizo_move.mp3","assets/audio/saccho_voice_01_chesto.mp3","assets/audio/saccho_voice_02_uryaa.mp3","assets/audio/saccho_voice_03_toraeta.mp3"];
let previewIndex=0;
$("storyVoicePreview").onclick=()=>{window.StoryBgm?.unlock();if(!voiceEnabled)return;playStoryClip(voiceSamples[previewIndex++%voiceSamples.length],"voice")};

// Story match snapshots are deliberately separate from 9x9 save data.
const STORY_MATCH_SAVE="shinsengumi-story-match-save-v1";
function storySaveMatch(){
 if(!g||ended||busy||compactTurnLocked||compactIncident||pendingWeaponDisplay){alert("演出が終了してから保存してください。");return}
 try{
  const snapshot={version:1,stage,at:Date.now(),engine:{
   board:g.board,hands:g.hands,fallen:g.fallen,holes:g.holes,side:g.side,ply:g.ply,last:g.last,oilPhase:g.oilPhase,oilEnemyReserve:g.oilEnemyReserve
  },enemyTurns,playerTurns,weapons,debugModified};
  localStorage.setItem(STORY_MATCH_SAVE,JSON.stringify(snapshot));
  alert("この章の対局を保存しました。");
 }catch(e){alert("保存できませんでした。ブラウザの保存設定をご確認ください。")}
}
function storyLoadMatch(){
 let data;
 try{data=JSON.parse(localStorage.getItem(STORY_MATCH_SAVE)||"null")}catch(e){}
 if(!data||data.version!==1||!Number.isInteger(data.stage)||data.stage<0||data.stage>=D.chapters.length||!data.engine){alert("読み込める対局データがありません。");return}
 const cfg=D.chapters[data.stage],state=data.engine;
 if(!Array.isArray(state.board)||state.board.length!==cfg.h||!state.board.every(row=>Array.isArray(row)&&row.length===cfg.w)||!Array.isArray(state.hands)||state.hands.length!==2||![0,1].includes(state.side)){alert("保存データの形式が正しくありません。");return}
 if(data.stage===2){
  const enemies=state.board.flat().filter(p=>p?.s===1);
  if(enemies.filter(p=>p.t==="玉").length!==1||(state.oilPhase===1&&enemies.length!==1)){
   alert("旧版の油小路対局データには駒の重複があります。章選択から再開始してください。");return;
  }
 }
 if(g&&!ended&&!confirm("現在の対局を中断し、保存した対局に戻りますか？"))return;
 battle(data.stage,2);
 g.board=state.board;g.hands=state.hands;g.fallen=Array.isArray(state.fallen)?state.fallen:[[],[]];
 g.holes=Array.isArray(state.holes)?state.holes:[];g.side=state.side;g.ply=Number(state.ply)||0;g.last=state.last||null;
 g.oilPhase=state.oilPhase??(data.stage===2?2:null);g.oilEnemyReserve=state.oilEnemyReserve||null;
 enemyTurns=Number(data.enemyTurns)||0;playerTurns=Number(data.playerTurns)||0;
 weapons=Array.isArray(data.weapons)?data.weapons:[];debugModified=!!data.debugModified;
 // Invalidate timers started by the chapter opening before restoring play.
 epoch++;busy=false;compactTurnLocked=false;selected=null;
 hideCompactFx();render();
 window.StoryBgm?.play(data.stage===0||data.stage===2?"battle01":"battle02");
}
window.storySaveMatch=storySaveMatch;window.storyLoadMatch=storyLoadMatch;
function storyDebugReady(){return g&&!ended&&!busy&&!compactTurnLocked&&g.side===0&&!compactIncident&&!pendingWeaponDisplay&&$("storyPopup").classList.contains("hidden")}
function storyDebugRun(action,changesBoard=false,renderAfter=true){
 if(!storyDebugReady())return;
 window.StoryBgm?.unlock();
 if(changesBoard){debugModified=true;selected=null}
 // Development controls sit below the board. Return to the battle viewport
 // BEFORE showing a fixed-position effect, so tests mirror normal gameplay.
 const battle=document.getElementById("storyBattle");
 const board=document.getElementById("storyBoard");
 const target=board||battle;
 if(target){
  const top=window.scrollY+target.getBoundingClientRect().top;
  const viewport=window.innerHeight;
  const height=target.getBoundingClientRect().height;
  const y=Math.max(0,Math.round(top-Math.max(0,(viewport-height)/2)));
  window.scrollTo({top:y,behavior:"instant"});
 }
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
$("debugLose").onclick=()=>storyDebugRun(()=>finish(1,"開発テスト：薩長同盟の勝利"),true);
$("debugCard").onclick=()=>storyDebugRun(()=>compactCardStart(g.side),true);
 $("debugOilAmbush").onclick=()=>storyDebugRun(()=>{
 if(stage!==2||g.oilPhase!==1)return;
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.board[y][x]?.king==="ito"&&g.board[y][x]?.s===1)g.board[y][x]=null;
 oilAmbushReveal();
},true,false);
$("debugQuake").onclick=()=>storyDebugRun(()=>compactApplyIncident({kind:"大地震"}),true);
$("debugReinforce").onclick=()=>storyDebugRun(()=>storyDebugIncident("寝返り"),true);
$("debugRevival").onclick=()=>storyDebugRun(()=>{
 const fallen=g.fallen[g.side];
 compactApplyIncident(fallen.length?{kind:"援軍",side:g.side,uid:fallen[fallen.length-1].uid}:{kind:"援軍",side:g.side,reserve:true});
},true);
$("debugDesert").onclick=()=>storyDebugRun(()=>storyDebugIncident("脱走"),true);
$("debugPurge").onclick=()=>storyDebugRun(()=>storyDebugIncident("粛清"),true);
async function storyDebugHitokiri(kill){
 const id=epoch;busy=true;compactTurnLocked=true;selected=null;render();
 try{
  if(!kill){
   const officer=g.board.flat().find(p=>p?.s===0&&p.t==="玉");
   debugAwakenKey=compactFighterKey(officer);banner(0,officer);
   compactCalligraphy(false);
   await Promise.race([playKabukiVoice("awakening"),later(3500)]);
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
document.addEventListener("visibilitychange",()=>{if(document.hidden){stopStoryClip("voice");stopStoryClip("fx");stopStoryQuakeBattle()}});
window.addEventListener("pagehide",()=>{stopStoryClip("voice");stopStoryClip("fx");stopStoryQuakeBattle()});
$("storyVolume").value=String(storyVolume);$("storyVolumeValue").value=String(storyVolume);$("storyVolumeValue").textContent=String(storyVolume);
window.StoryBgm?.setVolume(storyVolume);
$("storyVolume").addEventListener("input",event=>{
 storyVolume=Math.max(0,Math.min(100,Number(event.target.value)||0));
 $("storyVolumeValue").value=String(storyVolume);$("storyVolumeValue").textContent=String(storyVolume);
 window.StoryBgm?.setVolume(storyVolume);
 try{localStorage.setItem("shinsengumi-story-volume-v1",String(storyVolume))}catch(e){}
});
screenHome();
})();
