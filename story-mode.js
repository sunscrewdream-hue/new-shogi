(function(){
"use strict";
const $=id=>document.getElementById(id),D=window.StoryData;
const SAVE="shinsengumi-story-progress-v2",KINGS="shinsengumi-story-kings-v1",COL="shinsengumi-shogi-collection-v1";
let unlock=0;try{unlock=Math.max(0,Math.min(4,Number(localStorage.getItem(SAVE))||0))}catch(e){}
let stage=-1,dialog=[],at=0,onEnd=null,g=null,selected=null,busy=false,ended=false,epoch=0,enemyTurns=0,weapons=[],soundOff=false,audioContext=null,devPreview=false,compactTurnLocked=false,compactFxSerial=0,compactCaptures={},compactArrival=null,compactIncident=null,compactIncidentEffect=null,compactIncidentMarks=[];
const later=ms=>new Promise(r=>setTimeout(r,ms));
function chooseView(active){["storyHome","storyDialogue","storyBattle"].forEach(id=>$(id).classList.toggle("hidden",id!==active));window.scrollTo(0,0)}
function sfx(t){
 if(soundOff)return;
 if(t==="cannon"||t==="rifle"||t==="blast"){
  window.StoryBgm?.duck();
  const a=new Audio("assets/story/audio/"+t+".mp3");a.volume=t==="cannon"?.75:.67;a.play().catch(()=>{});return;
 }
 if(t==="capture"||t==="win"||t==="loss")window.StoryBgm?.duck();
 const files={move:"assets/audio/sfx/step_soil.mp3",capture:"assets/audio/voice_capture_toraeta.mp3",card:"assets/audio/sfx/card_flip.mp3",win:"assets/audio/voice_shobu_atta.mp3",loss:"assets/audio/voice_loss_custom.mp3"};
 if(files[t]){const a=new Audio(files[t]);a.volume=t==="capture"?.83:.40;a.play().catch(()=>{});return}
 try{
  audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==="suspended")audioContext.resume();
  const dur=t==="cannon"?.8:.28,buf=audioContext.createBuffer(1,Math.floor(audioContext.sampleRate*dur),audioContext.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*(t==="cannon"?5:10));
  const noise=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  noise.buffer=buf;filter.type="lowpass";filter.frequency.value=t==="cannon"?850:1600;gain.gain.value=t==="cannon"?.4:.2;
  noise.connect(filter).connect(gain).connect(audioContext.destination);noise.start();
 }catch(e){}
}
// 5x6 only: reuse the finished game's ORIGINAL images and audio files.
// Card mechanics are deliberately not introduced on compact chapter boards.
function compactMode(){return stage===0||stage===2}
const compactCardFaces={"何事もなし":"assets/cards/events/calm.webp?v=20261104d","援軍":"assets/cards/events/reinforcement.webp","脱走":"assets/cards/events/desertion.webp","粛清":"assets/cards/events/purge.webp","大地震":"assets/cards/events/earthquake.webp"};
const compactCardWeights=[["何事もなし",50],["援軍",20],["脱走",15],["粛清",10],["大地震",5]];
const compactCardVoices={"何事もなし":"assets/audio/events/incident_voice_calm.mp3","援軍":"assets/audio/events/incident_voice_reinforcement.mp3","脱走":"assets/audio/events/incident_voice_desertion.mp3","粛清":"assets/audio/events/incident_voice_purge.mp3","大地震":"assets/audio/events/incident_voice_earthquake.mp3"};
function compactFighterKey(p){return String(p?.origin??p?.s)+':'+String(p?.cid??p?.t??'unknown')}
const compactAudio={
 move0:"assets/audio/voice_shinsengumi_move_sorya.mp3",
 kondo:"assets/audio/voice_kondo_isami_king_move.mp3",
 hijikata:"assets/audio/voice_hijikata_toshizo_move.mp3",
 move1:"assets/audio/voice_saccho_move_taa.mp3",
 check:"assets/audio/voice_oute.mp3",
 slash:"assets/audio/sfx/sword_slash_2.mp3",
 kill:"assets/audio/sfx/purge_shukusei.mp3",
 turn:"assets/audio/sfx/taiko_kaka.mp3"
};
function compactSound(kind){
 if(soundOff)return;
 const src=compactAudio[kind];if(!src)return;
 try{const a=new Audio(src);a.volume=kind==="turn"?.4:kind==="check"?.6:.62;a.play().catch(()=>{})}catch(e){}
}
function hideCompactFx(){
 compactFxSerial++;
 compactTurnLocked=false;
 $("compactTurnNotice").classList.remove("show");
 $("compactCaptureNotice").classList.remove("show");
 $("compactAwakenNotice").classList.remove("show");
 compactArrival=null;
 compactIncident=null;compactIncidentEffect=null;compactIncidentMarks=[];$("compactCardOverlay").classList.add("hidden");$("compactCardFace").classList.remove("revealed");
 $("compactIntroClash").classList.remove("show");$("compactActionLayer").replaceChildren();
}
function compactPickCard(){let roll=Math.random()*100;for(const [name,weight] of compactCardWeights){roll-=weight;if(roll<0)return name}return "何事もなし"}
function compactSafeBoard(B){return !g.check(B,0)&&!g.check(B,1)&&g.legal(0,B,g.hands).length>0&&g.legal(1,B,g.hands).length>0}
function compactEligible(owner,types=null){const out=[];for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
 const p=g.board[y][x];if(!p||p.s!==owner||p.t==="玉"||(types&&!types.includes(p.t)))continue;
 const B=g.clone(g.board);B[y][x]=null;if(compactSafeBoard(B))out.push({y,x,p});
 }return out}
function compactPlanQuake(){
 const all=[];for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.board[y][x]&&g.board[y][x].t!=="玉")all.push({y,x});
 for(let count=Math.min(6,all.length);count>=3;count--)for(let attempt=0;attempt<90;attempt++){
  const B=g.clone(g.board),candidates=[...all].sort(()=>Math.random()-.5),shifts=[];
  for(const v of candidates){if(shifts.length>=count)break;if(!B[v.y][v.x])continue;
   const positions=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const Y=v.y+dy,X=v.x+dx;if((dy||dx)&&Y>=0&&Y<g.h&&X>=0&&X<g.w&&!B[Y][X]&&!g.isHole(Y,X))positions.push({Y,X});
   }
   if(!positions.length)continue;const target=positions[Math.floor(Math.random()*positions.length)];
   B[target.Y][target.X]=B[v.y][v.x];B[v.y][v.x]=null;shifts.push({...v,...target});
  }
  if(shifts.length===count&&compactSafeBoard(B))return {B,shifts};
 }
 return null;
}
function compactCardStart(side){
 if(!compactMode()||ended)return;compactIncident={side,kind:null,revealed:false,voiceDone:true,closeRequested:false};
 busy=true;compactTurnLocked=true;selected=null;render();
 const overlay=$("compactCardOverlay"),face=$("compactCardFace");overlay.classList.remove("hidden");face.classList.remove("revealed");face.style.backgroundImage=`url("${side===0?"card-back-shinsengumi-1024x1536.webp":"card-back-saccho-1024x1536.webp"}")`;
 $("compactCardHeading").textContent=side===0?"新選組の事件札":"敵軍の事件札";$("compactCardText").textContent="";$("compactCardPrompt").textContent="動乱の刻 — タップしてめくる";
 $("compactIncidentBanner").classList.add("show");sfx("card");const game=epoch;
 setTimeout(()=>{if(game===epoch)$("compactIncidentBanner").classList.remove("show")},1250);
}
function compactCardReveal(){
 const state=compactIncident;if(!state||state.revealed)return;state.revealed=true;state.kind=compactPickCard();
 const kind=state.kind,side=state.side;let detail="";compactIncidentEffect=null;
 if(kind==="何事もなし")detail="何事もなし。盤面に変化なし";
 else if(kind==="大地震"){compactIncidentEffect={kind};detail="大地震！ 駒が揺れ動き、地面が崩れる"}
 else{
  const owner=kind==="援軍"?1-side:side,options=compactEligible(owner,kind==="粛清"?["歩","香","桂","銀"]:null);
  if(!options.length)detail=kind+"：安全な対象がないため効果なし";
  else{const v=options[Math.floor(Math.random()*options.length)];compactIncidentEffect={kind,side,owner,y:v.y,x:v.x};
   detail=kind==="援軍"?"敵の"+v.p.t+"を捕らえ、持ち駒に加える":kind==="脱走"?"味方の"+v.p.t+"が脱走する":"味方の"+v.p.t+"を粛清する";
  }
 }
 const face=$("compactCardFace");face.style.backgroundImage=`url("${compactCardFaces[kind]}")`;face.classList.add("revealed");
 $("compactCardHeading").textContent=kind;$("compactCardText").textContent=detail;$("compactCardPrompt").textContent="もう一度タップして閉じる";
 state.voiceDone=false;
 if(soundOff){state.voiceDone=true;return}
 const audio=new Audio(compactCardVoices[kind]);audio.volume=.7;let settled=false;
 const done=()=>{if(settled)return;settled=true;if(compactIncident!==state)return;state.voiceDone=true;if(state.closeRequested)compactCardClose()};
 audio.onended=done;audio.onerror=done;audio.play().catch(done);setTimeout(done,7000);
}
function compactCardClose(){
 const state=compactIncident;if(!state||!state.revealed)return;
 if(!state.voiceDone){state.closeRequested=true;$("compactCardPrompt").textContent="セリフ再生後に進みます…";return}
 compactIncident=null;$("compactCardOverlay").classList.add("hidden");compactApplyIncident(compactIncidentEffect);compactIncidentEffect=null;
}
$("compactCardFace").onclick=()=>{if(!compactIncident)return;if(!compactIncident.revealed)compactCardReveal();else compactCardClose()};
function compactResumeTurn(){
 if(ended)return;busy=false;compactTurnLocked=false;render();const game=epoch;
 if(g.side===1)compactTurn(1,()=>{if(game===epoch)setTimeout(()=>{if(game===epoch)computer()},420)});
 else compactTurn(0);
}
function compactApplyIncident(effect){
 if(!effect){compactResumeTurn();return}
 const game=epoch,board=$("storyBoard");busy=true;compactTurnLocked=true;
 if(effect.kind==="大地震"){
  board.classList.add("compact-quake");compactSound("turn");
  setTimeout(()=>{
   if(game!==epoch)return;board.classList.remove("compact-quake");const plan=compactPlanQuake();
   if(plan){g.board=plan.B;g.last=null;compactIncidentMarks=plan.shifts.map(v=>v.Y+":"+v.X);
    // Craters follow the main game's vacated-square rule, but only if both sides retain legal moves.
    const vacated=plan.shifts.map(v=>({y:v.y,x:v.x})).filter(v=>!g.board[v.y][v.x]).sort(()=>Math.random()-.5);
    for(const p of vacated){if(g.holes.length>=2)break;g.holes.push({...p,expiresPly:g.ply+3});
     if(!compactSafeBoard(g.board))g.holes.pop();
    }
   }
   render();setTimeout(()=>{if(game!==epoch)return;compactIncidentMarks=[];compactResumeTurn()},1400);
  },1000);return;
 }
 const {kind,side,owner,y,x}=effect,p=g.board[y]?.[x];
 if(!p||p.s!==owner||p.t==="玉"){compactResumeTurn();return}
 compactIncidentMarks=[y+":"+x];banner(owner,p);render();
 const finish=()=>{if(game!==epoch)return;compactIncidentMarks=[];compactResumeTurn()};
 const remove=()=>{
  if(game!==epoch)return;const current=g.board[y]?.[x];if(!current||current!==p){finish();return}
  // A second safety check protects against any stale target or changed board.
  const B=g.clone(g.board);B[y][x]=null;if(!compactSafeBoard(B)){finish();return}
  g.board[y][x]=null;
  if(kind==="援軍"){
   g.hands[side].push({...p,s:side,p:false});banner(side,p);compactCapture(side);
   render();animateCompactEscort(side,y,x,p,finish);
  }else if(kind==="粛清"){
   compactSound("kill");const square=board.children[y*g.w+x];square?.classList.add("compact-blood");
   render();const marked=board.children[y*g.w+x];marked?.classList.add("compact-blood");setTimeout(finish,1400);
  }else{render();setTimeout(finish,650)}
 };
 if(kind==="脱走"){
  const rect=board.children[y*g.w+x]?.getBoundingClientRect();
  if(rect&&Element.prototype.animate&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
   const ghost=document.createElement("img");ghost.src="assets/sprites/figures/"+(owner===0?"shinsengumi_back":"saccho_front")+".webp";ghost.alt="";
   Object.assign(ghost.style,{left:rect.left+"px",top:rect.top+"px",width:rect.width+"px",height:rect.height*1.3+"px"});$("compactActionLayer").append(ghost);
   ghost.animate([{transform:"rotate(-8deg)"},{offset:.24,transform:"rotate(8deg)"},{offset:.44,transform:"rotate(-8deg)"},{opacity:0,transform:`translate(${owner===0?-innerWidth:innerWidth}px,-70px) scale(.7)`}],{duration:1200,fill:"forwards"}).finished.catch(()=>{}).then(()=>{ghost.remove();remove()});
  }else setTimeout(remove,900);
 }else setTimeout(remove,850);
}
function compactIntro(){
 if(!compactMode())return;
 const game=epoch,root=$("compactIntroClash");root.classList.remove("show");void root.offsetWidth;root.classList.add("show");
 setTimeout(()=>{if(game!==epoch||ended)return;root.classList.remove("show");busy=false;compactTurn(0,null,true)},2600);
}
function animateCompactEscort(side,y,x,captive,done){
 // Adapted from the finished 9x9 game's animateCaptureEscort; board coordinates use g.w.
 const cell=$("storyBoard").children[y*g.w+x],jail=$("storyHand"+side)?.closest(".hand-container");
 const rect=cell?.getBoundingClientRect(),goal=jail?.getBoundingClientRect(),layer=$("compactActionLayer"),game=epoch;
 if(!rect||!goal||!Element.prototype.animate||window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){setTimeout(done,180);return}
 const width=Math.min(72,Math.max(42,rect.width*1.15)),height=width*1.4;
 const targetX=rect.left+rect.width/2-width/2,targetY=rect.top+rect.height/2-height/2;
 const goalX=goal.left+goal.width/2-width/2,goalY=goal.top+goal.height/2-height/2;
 const startX=side===0?-width-20:innerWidth+20;
 function sprite(src,left,top){const img=document.createElement("img");img.src=src;img.alt="";Object.assign(img.style,{left:left+"px",top:top+"px",width:width+"px",height:height+"px"});layer.append(img);return img}
 const guard=sprite("assets/sprites/figures/"+(side===0?"shinsengumi_back":"saccho_front")+".webp",startX,targetY);
 const captiveSprite=sprite("assets/sprites/figures/"+(captive?.s===0?"shinsengumi_back":"saccho_front")+".webp",targetX,targetY);
 const dx=targetX-startX,dy=goalY-targetY,carryX=goalX-targetX;
 const animations=[
  guard.animate([{offset:0,opacity:0,transform:"scale(.8)"},{offset:.3,opacity:1,transform:`translateX(${dx}px)`},{offset:.48,opacity:1,transform:`translateX(${dx}px)`},{offset:.88,opacity:1,transform:`translate(${goalX-startX}px,${dy}px)`},{offset:1,opacity:0,transform:`translate(${goalX-startX}px,${dy}px) scale(.8)`}],{duration:1450,easing:"ease-in-out",fill:"forwards"}),
  captiveSprite.animate([{offset:0,opacity:0},{offset:.38,opacity:0},{offset:.48,opacity:1},{offset:.87,opacity:1,transform:`translate(${carryX}px,${dy}px) scale(.7)`},{offset:1,opacity:0,transform:`translate(${carryX}px,${dy}px) scale(.5)`}],{duration:1450,easing:"ease-in-out",fill:"forwards"})
 ];
 Promise.allSettled(animations.map(a=>a.finished)).then(()=>{guard.remove();captiveSprite.remove();if(game===epoch)done()});
}
function compactTurn(side,after,opening=false){
 if(!compactMode()||ended)return after?.();
 const stamp=++compactFxSerial,game=epoch;
 compactTurnLocked=true;
 const panel=$("compactTurnNotice"),art=$("compactTurnArt"),fallback=$("compactTurnFallback");
 const title=side===0?"新選組の手番！":"敵軍の手番！";
 art.src=side===0?"assets/turn-notice/turn_shinsengumi_illustrated.png":"assets/turn-notice/turn_enemy_illustrated.png";
 art.alt=title;art.style.display="block";fallback.textContent=title;fallback.classList.add("hidden");
 art.onerror=()=>{art.style.display="none";fallback.classList.remove("hidden")};
 panel.classList.add("show");if(opening)compactSound("turn");render();
 setTimeout(()=>{
  if(game!==epoch||stamp!==compactFxSerial||ended)return;
  panel.classList.remove("show");
  compactTurnLocked=false;render();
  if(g.check(g.board,side))compactSound("check");
  after?.();
 },1800);
}
function compactCapture(side){
 if(!compactMode())return;
 const panel=$("compactCaptureNotice");
 $("compactCaptureArt").src=side===0?"assets/visuals/capture_shinsengumi.webp":"assets/visuals/capture_saccho.webp";
 panel.classList.remove("show");void panel.offsetWidth;panel.classList.add("show");
 compactSound("slash");const game=epoch;
 setTimeout(()=>{if(game===epoch)panel.classList.remove("show")},1500);
}
function compactCalligraphy(kill){
 const panel=$("compactAwakenNotice"),art=$("compactAwakenArt");
 art.src=kill?"assets/visuals/hitokiri_kill_calligraphy.webp":"assets/visuals/hitokiri_red_calligraphy.webp";
 art.alt=kill?"人斬り・斬殺":"人斬り覚醒";
 panel.classList.remove("show");void panel.offsetWidth;panel.classList.add("show");
 const game=epoch;setTimeout(()=>{if(game===epoch)panel.classList.remove("show")},1600);
}
function compactCheckSources(){
 if(!compactMode()||!g?.check(g.board,g.side))return new Set();
 let king=null;for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.board[y][x]?.s===g.side&&g.board[y][x]?.t==="玉")king={y,x};
 if(!king)return new Set();
 const squares=new Set();
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
  const p=g.board[y][x];if(p?.s!==1-g.side)continue;
  if(g.steps(g.board,y,x,true).some(m=>m.Y===king.y&&m.X===king.x))squares.add(y+":"+x);
 }
 return squares;
}
function popup(title,text,options,img){
 const modal=$("storyPopup");$("popupTitle").textContent=title;$("popupText").textContent=text;
 const image=$("popupArt");image.classList.toggle("hidden",!img);
 if(img){image.onerror=()=>image.classList.add("hidden");image.src=img}
 const buttons=$("popupButtons");buttons.replaceChildren();
 options.forEach((v,i)=>{const b=document.createElement("button");b.type="button";b.textContent=v[0];if(i)b.className="secondary";
  b.onclick=()=>{modal.classList.add("hidden");v[1]()};buttons.append(b)});
 modal.classList.remove("hidden");
}
function collect(p){
 if(devPreview||!p||p.cid==null)return;
 const id=(p.origin===0?0:20)+p.cid;
 if(id<0||id>=40)return;
 try{const owned=JSON.parse(localStorage.getItem(COL)||"[]");if(Array.isArray(owned)&&!owned.includes(id)){owned.push(id);localStorage.setItem(COL,JSON.stringify(owned));$("storyStatus").textContent="🎴 人物カード獲得！ "+person(p).name}}catch(e){}
}
function person(p){
 if(!p)return{name:"",role:"",img:""};
 const king=p.king;
 if(king==="miyabe")return{name:"宮部鼎蔵",role:"尊攘派志士",img:"assets/story/kings/miyabe_banner.webp"};
 if(king==="ito")return{name:"伊東甲子太郎",role:"御陵衛士",img:"assets/story/kings/ito_banner.webp"};
 if(king==="kusaka")return{name:"久坂玄瑞",role:"長州藩士",img:"assets/dialogue_banners/person_38.webp"};
 if(king==="saigo")return{name:"西郷隆盛",role:"新政府軍・薩摩藩",img:"assets/dialogue_banners/person_21.webp"};
 if(king==="todo")return{name:"藤堂平助",role:"御陵衛士",img:"assets/dialogue_banners/person_08.webp"};
 if(p.cid!=null){
  const data=(p.origin===0?D.F:D.E)[p.cid];
  if(data)return{name:data[0],role:data[1],img:"assets/dialogue_banners/person_"+String((p.origin===0?1:21)+p.cid).padStart(2,"0")+".webp"};
 }
 const m=D.mobs[(p.mob||0)%8];return{name:m[0],role:m[1],img:"assets/story/mobs/"+m[2]};
}
function banner(s,p){
 if(!p)return;
 const a=person(p),prefix=s===0?"player":"enemy",image=$(prefix+"StoryArt");
 if(compactMode())$(prefix+"StoryBanner").classList.toggle("compact-awakened",(compactCaptures[compactFighterKey(p)]||0)>=3);else $(prefix+"StoryBanner").classList.remove("compact-awakened");
 $(prefix+"StoryName").textContent=a.name;
 $(prefix+"StoryRole").textContent=a.role+" ／ "+label(p);
 image.style.display="block";image.onerror=()=>image.style.display="none";image.src=a.img;
}
// Main-game parity: pointer hover reveals the character without selecting or moving.
let storyHoverSide=null,storyHoverBase=[null,null];
function previewStoryUnit(p){
 if(!p)return;const side=p.s;
 const panel=$(side?"enemyStoryBanner":"playerStoryBanner");
 if(storyHoverSide!==null&&storyHoverSide!==side)restoreStoryHover();
 if(storyHoverSide===null){
  const prefix=side?"enemy":"player";
  storyHoverBase[side]={name:$(prefix+"StoryName").textContent,role:$(prefix+"StoryRole").textContent,src:$(prefix+"StoryArt").getAttribute("src")};
 }
 storyHoverSide=side;banner(side,p);
}
function restoreStoryHover(){
 if(storyHoverSide===null)return;
 const side=storyHoverSide,saved=storyHoverBase[side],prefix=side?"enemy":"player";
 storyHoverSide=null;storyHoverBase[side]=null;
 if(!saved)return;
 $(prefix+"StoryName").textContent=saved.name;$(prefix+"StoryRole").textContent=saved.role;
 const art=$(prefix+"StoryArt");if(saved.src)art.src=saved.src;
}
function storyCellFromPointer(event){
 const root=$("storyBoard"),cell=event.target.closest?.(".sq");
 if(!cell||!root.contains(cell)||!g)return null;
 const i=Array.prototype.indexOf.call(root.children,cell),y=Math.floor(i/g.w),x=i%g.w;
 return {cell,y,x,p:g.board[y]?.[x]};
}
$("storyBoard").addEventListener("pointerover",event=>{
 if(event.pointerType!=="mouse"||ended||!g||busy)return;
 const unit=storyCellFromPointer(event);
 if(unit?.p)previewStoryUnit(unit.p);else restoreStoryHover();
});
$("storyBoard").addEventListener("pointerout",event=>{
 if(event.pointerType!=="mouse")return;
 const unit=storyCellFromPointer(event);
 if(unit&&!unit.cell.contains(event.relatedTarget))restoreStoryHover();
});
$("storyBoard").addEventListener("pointerleave",restoreStoryHover);
const label=p=>p.p?({飛:"龍",角:"馬",銀:"全",桂:"圭",香:"杏",歩:"と"}[p.t]||p.t):p.t;
function screenHome(){
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
  {id:"miyabe",name:"宮部鼎蔵",subtitle:"尊王攘夷派・池田屋事件",text:"肥後出身の尊攘派志士。池田屋事件で命を落とした。",art:"assets/story/kings/miyabe_collection.webp"},
  {id:"kusaka",name:"久坂玄瑞",subtitle:"長州藩・禁門の変",text:"吉田松陰に学んだ長州藩士。禁門の変で自刃した。",art:"assets/portraits/38.webp"},
  {id:"ito",name:"伊東甲子太郎",subtitle:"御陵衛士・油小路事件",text:"新選組を離れて御陵衛士を結成。油小路事件で暗殺された。",art:"assets/story/kings/ito_collection.webp"},
  {id:"saigo",name:"西郷隆盛",subtitle:"薩摩藩・鳥羽伏見の戦い",text:"新政府側の有力指導者。ゲーム上の最終章王将。",art:"assets/portraits/21.webp"}
 ];
 for(const p of profile){
  const card=document.createElement("button");card.className="story-king-card";const unlocked=owned.includes(p.id);
  card.setAttribute("aria-label",unlocked?p.name+"の人物情報":"未解放の人物カード");
  const picture=document.createElement("img");picture.alt="";picture.loading="lazy";picture.src=unlocked?p.art:"card-back-saccho-1024x1536.webp";
  const heading=document.createElement("strong");heading.textContent=unlocked?p.name:"？？？";
  card.append(picture,heading);card.onclick=()=>unlocked&&popup(p.name,p.subtitle+"\n"+p.text,[["閉じる",()=>{}]],p.art);cards.append(card);
 }
 collection.append(cards);
 function addButton(step,title,size,enabled,done,callback){
  const b=document.createElement("button");b.className="chapter"+(enabled?"":" locked")+(done?" completed":"");b.type="button";b.disabled=!enabled;
  const info=document.createElement("div"),mini=document.createElement("small"),heading=document.createElement("strong"),note=document.createElement("em"),board=document.createElement("div"),fig=document.createElement("span");
  mini.textContent=step+(done?"　✓ 突破":"");heading.textContent=title;note.textContent=devPreview?"開発用プレビュー（記録しません）":enabled?(done?"再挑戦可能":"出陣可能"):"前の章を突破すると開放";
  board.className="chapter-board";board.textContent=enabled?"⚔":"🔒";fig.textContent=size;board.append(fig);info.append(mini,heading,note);b.append(info,board);b.onclick=callback;el.append(b);
 }
}
function talk(i){
 window.StoryBgm?.play(i===4?"ending":"prologue");
 stage=i;const ch=i===-1?D.prologue:i===4?D.epilogue:D.chapters[i];
 dialog=ch.intro;at=0;onEnd=i===-1||i===4?screenHome:()=>battle(i);
 $("dialogueScene").className="scene-art scene-"+ch.scene;$("dialogueDate").textContent=ch.era;$("dialogueTitle").textContent=ch.title;chooseView("storyDialogue");line();
}
function line(){
 if(at>=dialog.length){const fn=onEnd;onEnd=null;fn();return}
 $("dialogueSpeaker").textContent=dialog[at][0];$("dialogueBody").textContent=dialog[at][1];
 $("dialogueCount").textContent=(at+1)+" / "+dialog.length;
 const sortie=at===dialog.length-1&&stage>=0&&stage<4;
 $("dialogueNext").textContent=sortie?"いざ、出陣":at===dialog.length-1?"物語を閉じる":"続ける ›";
 $("dialogueNext").classList.toggle("story-sortie-button",sortie);
 $("dialogueNext").closest(".dialogue-foot").classList.toggle("story-sortie-foot",sortie);
}
function battle(i){
 $("storyPopup").classList.remove("compact-finale","compact-promotion");
 hideCompactFx();compactCaptures={};
 window.StoryBgm?.play(i===0||i===2?"battle01":"battle02");
 epoch++;stage=i;g=new window.StoryEngine(i);selected=null;busy=false;ended=false;enemyTurns=0;weapons=[];
 const ch=D.chapters[i];$("battleChapter").textContent="第"+(i+1)+"章 ／ "+ch.era;$("battleTitle").textContent=ch.title;
 const board=$("storyBoard");board.dataset.stage=i;board.style.setProperty("--cols",ch.w);board.style.setProperty("--rows",ch.h);
 board.classList.toggle("small-board",ch.w===5);
 document.body.style.backgroundImage="linear-gradient(#10172138,#07101660),url('assets/story/"+ch.scene+"-bg.webp'),url('kyoto-autumn.webp')";
 document.body.style.backgroundSize="cover";document.body.style.backgroundAttachment="fixed";
 banner(0,g.king(0));banner(1,g.king(1));chooseView("storyBattle");render();if(compactMode()){busy=true;render();compactIntro()}
}
function render(){
 restoreStoryHover();
 if(!g||$("storyBattle").classList.contains("hidden"))return;
 const root=$("storyBoard");root.replaceChildren();
 const legal=!ended&&!busy&&!compactTurnLocked&&g.side===0?g.legal(0):[];
 const targets=selected?legal.filter(m=>selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x):[];
 const attackers=compactCheckSources();
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
  const p=g.board[y][x],btn=document.createElement("button");btn.type="button";btn.className="sq";btn.setAttribute("role","gridcell");
  btn.setAttribute("aria-label",(y+1)+"段"+(x+1)+"列 "+(p?person(p).name+" "+label(p):"空きマス"));
  if(g.last?.y===y&&g.last.x===x)btn.classList.add("last");
  if(selected&&!selected.drop&&selected.y===y&&selected.x===x)btn.classList.add("selected");
  if(targets.some(m=>m.Y===y&&m.X===x))btn.classList.add(p&&p.s===1?"capture-hint":"hint");
  if(p?.t==="玉"&&g.check(g.board,p.s))btn.classList.add("king-in-check");
  if(attackers.has(y+":"+x))btn.classList.add("compact-check-attacker");
  if(compactIncidentMarks.includes(y+":"+x))btn.classList.add("compact-incident-target");
  if(compactMode()&&g.isHole(y,x))btn.classList.add("compact-hole");
  if(compactArrival?.y===y&&compactArrival.x===x)btn.classList.add("compact-arrival");
  if(p){const token=document.createElement("span");token.className="story-token"+(p.s?" enemy":"")+(p.p?" promoted":"");token.textContent=label(p);token.setAttribute("aria-hidden","true");btn.append(token)}
  btn.onclick=()=>square(y,x);root.append(btn);
 }
 for(const s of [0,1]){
  const hand=$("storyHand"+s);hand.replaceChildren();const groups={};g.hands[s].forEach(p=>groups[p.t]=(groups[p.t]||0)+1);
  if(!g.hands[s].length)hand.textContent="なし";
  for(const t of Object.keys(groups)){const b=document.createElement("button");b.type="button";b.className="story-hand-piece";b.setAttribute("aria-label",(s===0?"自軍":"敵軍")+"の持駒 "+t+" "+groups[t]+"枚");b.disabled=ended||busy||compactTurnLocked||s===1||g.side!==0;
   const token=document.createElement("span");token.className="story-token"+(s===1?" enemy":"");token.textContent=t;token.setAttribute("aria-hidden","true");
   const count=document.createElement("span");count.className="story-hand-count";count.textContent="×"+groups[t];count.setAttribute("aria-hidden","true");b.append(token,count);
   if(s===0&&selected?.drop&&selected.t===t)b.classList.add("selected");b.onclick=()=>{selected={drop:true,t};render()};hand.append(b)}
 }
 $("storyStatus").textContent=ended?"対局終了":busy?"演出・思考中…":g.side?"敵軍、思案中…"+(g.check(g.board,1)?"　⚠王手":""):"新選組の手番！"+(g.check(g.board,0)?"　⚠王手！ 王を守ってください":"");
 $("storyStatus").classList.toggle("check-status",!ended&&g.check(g.board,g.side));
 $("compactCardCountdown").textContent=compactMode()&&!ended?(compactIncident?"🎴 事件札を確認中":`🎴 ${g.side===0?"新選組":"敵軍"}：札まで${4-Math.floor((g.ply%8)/2)}手`):"";
}
function square(y,x){
 if(ended||busy||compactTurnLocked||g.side!==0)return;
 const legal=g.legal(0),p=g.board[y][x];
 if(selected){
  const m=legal.find(m=>m.Y===y&&m.X===x&&(selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x));
  if(m){
   const unit=m.drop?g.hands[0].find(v=>v.t===m.t):g.board[m.y][m.x];
   if(!m.drop&&g.promoted(unit,m.y,m.Y)&&!g.forced(unit,m.Y)){
    const modal=$("storyPopup");modal.classList.toggle("compact-promotion",compactMode());
    popup("成るか、成らぬか","この駒を成り駒にしますか？",[["成る",()=>{modal.classList.remove("compact-promotion");makeMove(m,true)}],["成らぬ",()=>{modal.classList.remove("compact-promotion");makeMove(m,false)}]]);return;
   }makeMove(m,false);return;
  }
 }
 if(p?.s===1){banner(1,p);return}
 selected=p?.s===0?{y,x}:null;render();if(p)banner(p.s,p);
}
function makeMove(m,prom){
 const actor=g.side,source=m.drop?g.hands[actor].find(p=>p.t===m.t):g.board[m.y][m.x];
 const key=compactFighterKey(source),before=compactCaptures[key]||0;
 const willKill=compactMode()&&!m.drop&&!!g.board[m.Y][m.X]&&before>=3;
 const {unit,captured}=g.move(m,prom,willKill);
 if(compactMode())compactArrival={y:m.Y,x:m.X};
 if(compactMode()&&captured){
  compactCaptures[key]=willKill?0:before+1;
  if(willKill){compactSound("kill");compactCalligraphy(true)}
  else if(compactCaptures[key]===3){
   compactCalligraphy(false);
  }
 }
 if(captured){if(!willKill)sfx("capture");compactCapture(actor);if(actor===0)collect(captured);banner(1-actor,captured)}else if(compactMode())compactSound(actor===0&&source?.origin===0&&source?.cid===0?"kondo":actor===0&&source?.origin===0&&source?.cid===1?"hijikata":"move"+actor);else sfx("move");
 if(unit)banner(actor,unit);selected=null;render();const result=g.state();
 if(compactMode()){
  busy=true;render();const id=epoch;
  // Capture and the awakening seal must finish before the next turn or verdict.
  const afterFx=()=>{
   if(id!==epoch||ended)return;
   compactArrival=null;
   if(result){finish(result.winner,result.why);return}
   busy=false;
   if(g.ply%8===(actor===0?7:0))compactCardStart(actor);
   else compactResumeTurn();
  };
  if(captured&&!willKill)animateCompactEscort(actor,m.Y,m.X,captured,afterFx);
  else setTimeout(afterFx,captured?1700:prom?600:320);
  return;
 }
 if(result){finish(result.winner,result.why);return}
 if(g.side===1){busy=true;render();const id=epoch;setTimeout(()=>{if(id===epoch)computer()},420)}
}
function computer(){
 if(ended||!g||g.side!==1)return;
 const move=g.ai();busy=false;
 if(!move){finish(0,"敵軍に指す手なし");return}
 const p=move.drop?null:g.board[move.y][move.x],prom=!!p&&g.promoted(p,move.y,move.Y);
 makeMove(move,prom);enemyTurns++;
 if(!ended&&stage===3&&(enemyTurns===4||enemyTurns===8)){
  const kind=weapons.length===0?(Math.random()<.5?"cannon":"rifle"):weapons[0]==="cannon"?"rifle":"cannon";
  if(!weapons.includes(kind))weaponCard(kind);
 }
}
function weaponCard(kind){
 if(ended||busy||weapons.includes(kind)||stage!==3)return;
 weapons.push(kind);busy=true;render();sfx("card");
 popup("敵軍 "+(kind==="cannon"?"大砲":"鉄砲")+"カード",kind==="cannon"?"ランダムな1マスに砲弾が落ちる。外れれば無傷。":"縦の1列へ一直線に発射。敵陣側から最初の駒1枚で止まる。",[["攻撃を確認",()=>fire(kind)]],"assets/story/cards/"+kind+".webp");
}
async function fire(kind){
 const id=epoch,result=await window.StoryWeapons.fire(g,kind,()=>id===epoch,sfx);
 if(!result||id!==epoch)return;
 if(result.hit){$("storyStatus").textContent=person(result.hit).name+" に命中！ 駒が消滅。";/* 砲撃による消滅は捕獲ではないためコレクションに加えない */}
 else $("storyStatus").textContent=kind==="cannon"?"砲弾は空きマスへ着弾！":"鉄砲は空振り！";
 busy=false;render();const status=g.state();if(status)finish(status.winner,status.why);
}
function finish(winner,reason){
 if(ended)return;const wasCompact=compactMode();epoch++;hideCompactFx();ended=true;busy=false;render();$("storyPopup").classList.toggle("compact-finale",wasCompact);if(winner===-1){popup("引き分け","対局は引き分けです。再挑戦できます。",[["再挑戦",()=>battle(stage)],["章選択",screenHome]]);return}const win=winner===0,ch=D.chapters[stage],king=ch.king;
 if(win&&!devPreview){
  unlock=Math.max(unlock,stage+1);try{localStorage.setItem(SAVE,String(unlock));
   const arr=JSON.parse(localStorage.getItem(KINGS)||"[]");if(Array.isArray(arr)&&!arr.includes(king)){arr.push(king);localStorage.setItem(KINGS,JSON.stringify(arr))}}catch(e){}
 }
 sfx(win?"win":"loss");
 const image=(king==="saigo")?"assets/visuals/"+(win?"victory_kondo.webp":"defeat_kondo.webp"):"assets/story/kings/"+king+"_"+(win?"loss":"win")+".webp";
 popup(win?"勝負あった！":"無念…",(win?"勝利！ ":"敗北。")+reason+"\n"+(win?ch.outro:"何度でも再挑戦できます。"),[
  [win?"物語を進める":"再挑戦",()=>win?(stage===3?talk(4):screenHome()):battle(stage)],
  ["章選択",screenHome]
 ],image);
}
function leave(){
 if(ended){screenHome();return}
 popup("対局を中断しますか？","途中の対局は保存されません。",[["章選択へ",()=>{epoch++;ended=true;busy=false;screenHome()}],["戻る",()=>{}]]);
}
$( "storyDevToggle" ).onclick=()=>{devPreview=!devPreview;screenHome()};
const storySortieVoice=new Audio("assets/audio/voice_iza_shutsujin.mp3");
storySortieVoice.preload="auto";storySortieVoice.playsInline=true;
$("dialogueNext").onclick=()=>{
 const sortie=stage>=0&&stage<4&&at===dialog.length-1;
 if(sortie&&!soundOff){
  window.StoryBgm?.duck();
  try{storySortieVoice.pause();storySortieVoice.currentTime=0;storySortieVoice.volume=.68;
   const playing=storySortieVoice.play();if(playing?.catch)playing.catch(()=>{});
  }catch(e){}
 }
 at++;line();
};
$("battleQuit").onclick=leave;
$("storyResign").onclick=()=>popup("降参しますか？","まだこの章は突破していません。",[["降参する",()=>finish(1,"降参")],["続ける",()=>{}]]);
$("storyRules").onclick=()=>popup("操作・ルール","駒をタップし、緑色の移動先をタップします。\n持ち駒は下欄から選択。二歩・王手放置・行き所のない駒打ちは禁止です。\n鳥羽・伏見では敵軍が大砲と鉄砲を各1回使用します。", [["閉じる",()=>{}]]);
$("audioToggle").onclick=()=>{window.StoryBgm?.unlock();soundOff=!soundOff;window.StoryBgm?.setMuted(soundOff);$("audioToggle").textContent=soundOff?"♪ 音 OFF":"♪ 音 ON";$("audioToggle").setAttribute("aria-pressed",String(!soundOff))};
screenHome();
})();
