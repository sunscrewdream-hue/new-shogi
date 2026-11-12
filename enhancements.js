/* New features are deliberately isolated from the original game engine. */
(()=>{
 'use strict';
 const SAVE_KEY='shinsengumi-shogi-autosave-v1';
 const MANUAL_KEY='shinsengumi-shogi-manualsave-v1';
 const COLLECTION_KEY='shinsengumi-shogi-collection-v1';
 const $=id=>document.getElementById(id);
 const titleAudio=new Audio('assets/audio/title_bgm_mobile.mp3');
 titleAudio.loop=true;titleAudio.preload='auto';titleAudio.playsInline=true;
 // Request the media before the first gesture, avoiding a network wait on tap.
 titleAudio.load();
 const titleIsVisible=()=>!$('titleScreen').classList.contains('hidden');
 const getStorage=(key)=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
 const putStorage=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
 let toastTimer=null;
 const toast=document.createElement('div');toast.className='collection-toast';toast.setAttribute('role','status');document.body.append(toast);
 function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3100)}

 /* Try sound immediately when allowed; regular game interactions recover it on restricted browsers. */
 function syncTitleVolume(){const volume=$('volume')||document.querySelector('.audio-settings-panel #volume');if(!volume)return;titleAudio.volume=Math.min(.6,Number(volume.value)/100)*(titleIntroAudio.paused?1:.18)}
 titleIntroAudio.addEventListener('play',syncTitleVolume);
 titleIntroAudio.addEventListener('ended',syncTitleVolume);
 titleIntroAudio.addEventListener('pause',syncTitleVolume);
 function playTitleMusic(){
  if(!bgmEnabled||document.hidden||!titleIsVisible())return;
  syncTitleVolume();
  if(!titleAudio.paused)return;
  const p=titleAudio.play();if(p?.catch)p.catch(error=>{
   if(error?.name!=='NotAllowedError')console.warn('タイトルBGM復帰待ち',error);
  });
 }
 function stopTitleMusic(){titleAudio.pause();titleAudio.currentTime=0}
 const restoreTitleMusic=()=>{
  if(!bgmEnabled||document.hidden||!titleIsVisible())return;
  playTitleMusic();
  // iOS may restore its audio session slightly after returning to the tab.
  setTimeout(()=>{if(titleAudio.paused)playTitleMusic()},650);
 };
 document.addEventListener('pointerdown',restoreTitleMusic,{passive:true,capture:true});
 document.addEventListener('touchstart',restoreTitleMusic,{passive:true,capture:true});
 document.addEventListener('keydown',restoreTitleMusic);
 window.addEventListener('pageshow',restoreTitleMusic);
 window.addEventListener('focus',restoreTitleMusic);
 // Browsers that permit autoplay can begin before any input.
 playTitleMusic();
 const baseSyncVolume=syncBgmVolume;
 syncBgmVolume=function(){baseSyncVolume();syncTitleVolume()};
 const baseStartBgm=startBgm;
 startBgm=function(){stopTitleMusic();baseStartBgm()};
 const baseToggleBgm=toggleBgm;
 toggleBgm=function(){baseToggleBgm();if(titleIsVisible()&&bgmEnabled)playTitleMusic();else if(!bgmEnabled)stopTitleMusic()};
 const baseStopAll=stopAllAudio;
 stopAllAudio=function(){titleAudio.pause();baseStopAll()};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)restoreTitleMusic()});
 const baseReturn=returnToTitle;
 returnToTitle=function(){baseReturn();playTitleMusic();updateContinueButton()};
 const baseStart=startGame;
 startGame=function(){baseStart();stopTitleMusic()};
 const baseRestart=restartGame;
 restartGame=function(){baseRestart();stopTitleMusic()};
 const baseReset=reset;
 reset=function(){baseReset();captureCounts={};for(const seal of hitokiriSeals)seal.classList.remove('active','preview');visibleBannerPersons.fill(null);awakeningPreviewSide=null;awakeningTest.textContent='⚔ 人斬り覚醒テスト'};
 $('volume').addEventListener('input',syncTitleVolume);

 /* PWA, fullscreen button, title/manual/navigation. */
 const extras=document.createElement('div');extras.id='titleExtras';
 const resume=document.createElement('button');resume.type='button';resume.id='continueGame';resume.textContent='▶ 続きから';resume.onclick=()=>window.ShinsengumiSaveSlots?.open('normal','load');
 const manualLoad=document.createElement('button');manualLoad.type='button';manualLoad.id='loadGame';manualLoad.textContent='📂 保存した対局';manualLoad.onclick=()=>window.ShinsengumiSaveSlots?.open('normal','load');
 const titleSettings=document.createElement('button');titleSettings.type='button';titleSettings.id='titleSettingsButton';titleSettings.textContent='⚙ 設定';titleSettings.setAttribute('aria-haspopup','dialog');
 titleSettings.onclick=()=>{const settingsButton=document.querySelector('.audio-settings-trigger');if(settingsButton)settingsButton.click()};
 extras.append(resume,manualLoad,titleSettings);$('startGame').insertAdjacentElement('afterend',extras);
 const collectionLink=$('titleLinks').querySelector('a[href="collection.html"]');if(collectionLink)collectionLink.textContent='人物コレクション';
 const inGameSave=document.createElement('button');inGameSave.type='button';inGameSave.id='quickSave';inGameSave.textContent='💾 対局を保存';inGameSave.onclick=()=>{if(titleIsVisible()||ended){showToast('対局中に保存してください');return}window.ShinsengumiSaveSlots?.open('normal','save')};
 const gameHelp=document.querySelector('.game-menu-link');gameHelp?.insertAdjacentElement('beforebegin',inGameSave);
 function updateContinueButton(){resume.hidden=!getStorage(SAVE_KEY)&&!window.ShinsengumiSaveSlots?.hasSaves('normal');manualLoad.hidden=!getStorage(MANUAL_KEY)&&!window.ShinsengumiSaveSlots?.hasSaves('normal')}

 /* Special "abandon the king" rule. It is intentionally not standard shogi. */
 allRules.abandonKing=true;customSettings.abandonKing=true;ruleSettings.abandonKing=rulePreset!=='traditional';
 const flag=document.createElement('label');flag.innerHTML='<input type="checkbox" data-rule="abandonKing" checked onchange="changeCustomRule(this)">王を見捨てる（特殊ルール）';$('customRules').append(flag);
 const baseMoves=moves;
 moves=function(B,y,x,attack=false){return baseMoves(B,y,x,attack||(ruleSettings.abandonKing&&rulePreset!=='traditional'))};
 const baseApply=apply;
 apply=function(B,H,s,m,prom=false,ids=null,flags=null){
  const kingCapture=!m.drop&&B[m.Y]?.[m.X]?.t==='玉';
  return baseApply(B,H,s,m,prom,ids,kingCapture?{...(flags||{}),kill:true}:flags);
 };
 const baseLegal=legalMoves;
 legalMoves=function(B,H,s,checkPawnMate=true){
  if(!ruleSettings.abandonKing||rulePreset==='traditional'||(s===1&&gameMode==='ai')||!check(B,s))return baseLegal(B,H,s,checkPawnMate);
  const out=[];
  for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(B[y][x]?.s===s)for(const [Y,X] of moves(B,y,x))out.push({y,x,Y,X});
  for(const [t,num] of Object.entries(H[s]||{}))if(num>0){
   for(let Y=0;Y<9;Y++)for(let X=0;X<9;X++){
    if(B[Y][X]||isQuakeHole(Y,X))continue;
    if((t==='歩'||t==='香')&&(s?Y===8:Y===0)||t==='桂'&&(s?Y>=7:Y<=1))continue;
    if(t==='歩'&&B.some(row=>row[X]?.s===s&&row[X]?.t==='歩'&&!row[X]?.p))continue;
    const m={drop:true,t,Y,X};if(checkPawnMate&&isPawnDropMate(B,H,s,m))continue;out.push(m);
   }
  }
  return out;
 };
 const baseGameEnd=gameEnd;
 gameEnd=function(){
  if(ruleSettings.abandonKing&&rulePreset!=='traditional'){
   const alive=[0,1].map(side=>b.some(row=>row.some(p=>p?.s===side&&p.t==='玉')));
   if(!alive[0]||!alive[1]){showVictory(alive[0]?0:1,'主君討死');return true}
  }
  return baseGameEnd();
 };
 const warning=document.createElement('div');warning.id='abandonOverlay';warning.setAttribute('role','dialog');warning.setAttribute('aria-modal','true');warning.setAttribute('aria-label','主君を見捨てますか');
 warning.innerHTML='<div id="abandonPanel"><h2>主君を見捨てるのか！</h2><p>王手を防がず別の手を指します。次の一手で王を討ち取られ、敗北する危険があります。</p><button type="button" id="abandonNo">忠義を尽くす</button><button type="button" id="abandonYes">覚悟して指す</button></div>';
 document.body.append(warning);
 let ignoreMove=null;
 $('abandonNo').onclick=()=>{warning.classList.remove('show');ignoreMove=null};
 $('abandonYes').onclick=()=>{const target=ignoreMove;ignoreMove=null;warning.classList.remove('show');if(target)baseTap(target.y,target.x)};
 const baseTap=tap;
 tap=function(y,x){
  if(ruleSettings.abandonKing&&rulePreset!=='traditional'&&sel&&check(b,turn)&&playerTurnReady&&!busy&&!ended){
   const m=legalMoves(b,h,turn).find(m=>m.Y===y&&m.X===x&&(sel.drop?m.drop&&m.t===sel.t:!m.drop&&m.y===sel.y&&m.x===sel.x));
   if(m){const bb=clone(b),hh=clone(h);apply(bb,hh,turn,m);if(check(bb,turn)){
    ignoreMove={y,x};warning.classList.add('show');return;
   }}
  }
  return baseTap(y,x);
 };
 /* Enemy portraits are previews, not a move. A selected legal capture still works. */
 const tapWithKingWarning=tap;
 tap=function(y,x){
  const piece=b?.[y]?.[x];
  if(piece&&piece.s!==turn&&!titleIsVisible()&&!ended&&!busy&&!incidentRunning&&playerTurnReady&&(gameMode!=='ai'||turn===0)){
   const canCapture=sel&&legalMoves(b,h,turn).some(m=>!m.drop&&m.Y===y&&m.X===x&&m.y===sel.y&&m.x===sel.x);
   if(!canCapture){setCharacterBanner(piece.s,piece,'',3000);return}
  }
  return tapWithKingWarning(y,x);
 };
 const gameBoard=$('board');
 const baseShowOfficer=showOfficer;
 showOfficer=function(piece){
  // Mouse users inspect a character by hovering; touch users inspect by tapping.
  if(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)return false;
  return baseShowOfficer(piece);
 };
 let hoveredBannerSide=null;
 function clearHoveredBanner(){
  if(hoveredBannerSide===null)return;
  const side=hoveredBannerSide;hoveredBannerSide=null;
  const panel=$(side===0?'officerPanel':'enemyOfficerPanel');
  if(!panel.classList.contains('speaking'))clearCharacterBanner(side);
 }
 const pieceHover=window.ShinsengumiPieceHover.bind({
  root:gameBoard,
  getPiece:index=>b?.[Math.floor(index/9)]?.[index%9],
  canPreview:()=>!titleIsVisible()&&!ended&&!busy&&!incidentRunning&&playerTurnReady&&(gameMode!=='ai'||turn===0),
  onPreview:piece=>{
   const panel=$(piece.s===0?'officerPanel':'enemyOfficerPanel');
   if(panel.classList.contains('speaking'))return;
   if(hoveredBannerSide!==null&&hoveredBannerSide!==piece.s)clearHoveredBanner();
   setCharacterBanner(piece.s,piece,'',0);
   hoveredBannerSide=piece.s;
  },
  onClear:clearHoveredBanner
 });
 const baseRender=render;
 render=function(){
  pieceHover.reset();
  baseRender();
  if(ruleSettings.abandonKing&&rulePreset!=='traditional'&&check(b,turn)&&!ended){
   $('checkHint').textContent='⚠ 王手！ 防ぐか、覚悟して主君を見捨てる手も選べます。';
  }
  const cells=$('board').children;
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){
   const p=b[y][x];if(!p)continue;
   const node=cells[y*9+x];if(!node)continue;
   node.replaceChildren(createToken(p.t,p.s,p.p,true));
  }
  const stage=$('boardStage');
  let routes=$('checkRouteOverlay');if(routes)routes.remove();
  const threats=ended||normalDeferCheck?[]:getCheckThreats(b).paths;
  if(threats?.length){
   const ns='http://www.w3.org/2000/svg';
   routes=document.createElementNS(ns,'svg');routes.id='checkRouteOverlay';routes.setAttribute('viewBox','0 0 9 9');routes.setAttribute('preserveAspectRatio','none');routes.setAttribute('aria-hidden','true');
   threats.forEach((path,index)=>{
    const stroke=index%2===0?'#ff503d':'#ffe07b';
    const line=document.createElementNS(ns,'line');line.setAttribute('x1',path.fromX+.5);line.setAttribute('y1',path.fromY+.5);line.setAttribute('x2',path.toX+.5);line.setAttribute('y2',path.toY+.5);
    line.setAttribute('stroke',stroke);line.setAttribute('stroke-width',index%2===0?'.09':'.075');line.setAttribute('stroke-dasharray',index%2===0?'.22 .14':'.12 .13');line.setAttribute('stroke-linecap','round');
    line.classList.add('check-route');routes.append(line);
   });
   stage.append(routes);
  }
 };
 function createToken(t,side,promoted=false,onBoard=false){
  const node=document.createElement('span');
  const label=promoted?({歩:'と',香:'杏',桂:'圭',銀:'全',飛:'龍',角:'馬'}[t]||t):t;
  node.className='piece-layer shogi-token'+(side?' enemy-token':'')+(promoted?' promoted-token':'')+(onBoard?' board-token':'');
  node.textContent=label;node.setAttribute('aria-hidden','true');return node;
 }
 makeHandPiece=function(s,t,count){
  const btn=document.createElement('button');btn.type='button';btn.className='hand-piece';
  btn.setAttribute('aria-label',(gameMode==='local'?(s===0?'先手':'後手'):(s===0?'新選組':'敵陣'))+'の持ち駒 '+t+' '+count+'枚');
  btn.title=t+' ×'+count;
  btn.disabled=s!==turn||busy||ended||!playerTurnReady||incidentRunning||pendingCardSide!==null;
  const badge=document.createElement('span');badge.className='hand-count';badge.textContent='×'+count;badge.setAttribute('aria-hidden','true');
  btn.append(createToken(t,s),badge);btn.onclick=()=>{if(btn.disabled)return;sel={drop:true,t};render()};return btn;
 };

 /* Collection: one unique card per captured person's original faction and index. */
 function awardPerson(piece){
  if(!piece||!Number.isInteger(piece.cid)||!Number.isInteger(piece.originSide))return;
  const id=(piece.originSide===0?0:20)+piece.cid;
  if(id<0||id>=40)return;
  const cards=getStorage(COLLECTION_KEY);
  const acquired=Array.isArray(cards)?cards:[];
  if(acquired.includes(id))return;
  acquired.push(id);
  if(putStorage(COLLECTION_KEY,acquired)){
   const data=(piece.originSide===0?officerData:enemyOfficerData)[piece.cid];
   showToast('🎴 人物カード獲得：'+(data?.[0]||'新たな人物')+' （'+acquired.length+'/40）');
  }
 }
 const baseCommit=commit;
 commit=function(m,prom=false,preplayedCapture=false){
  const captured=!m.drop?b[m.Y]?.[m.X]:null;
  const beforePly=ply;
  // Forward the escort completion flag; dropping it restarts the capture forever.
  const result=baseCommit(m,prom,preplayedCapture);
  // Award a character only after the board move actually commits.
  if(captured&&ply!==beforePly)awardPerson(captured);
  return result;
 };
 /* The seal belongs to a particular historical person and follows their capture counter. */
 const visibleBannerPersons=[null,null],hitokiriSeals=[];
 for(const side of [0,1]){
  const seal=document.createElement('img');seal.className='hitokiri-stamp';seal.src='assets/visuals/hitokiri_red_calligraphy.webp';seal.alt='人斬り覚醒';seal.setAttribute('aria-hidden','true');
  $(side===0?'officerPanel':'enemyOfficerPanel').append(seal);hitokiriSeals[side]=seal;
 }
 function syncHitokiriSeal(side){
  const person=visibleBannerPersons[side];
  const key=person&&Number.isInteger(person.cid)?String(person.originSide??person.s)+':'+String(person.cid):null;
  const active=!!(ruleSettings.hitokiri&&key&&Number(captureCounts[key]||0)>=3);
  hitokiriSeals[side].classList.toggle('active',active);
 }
 const baseSetCharacterBanner=setCharacterBanner;
 setCharacterBanner=function(side,p,caption='',duration=2500){
  visibleBannerPersons[side]=p;const result=baseSetCharacterBanner(side,p,caption,duration);
  syncHitokiriSeal(side);return result;
 };
 flashHitokiri=function(message,side=turn){
  const notice=$('hitokiriNotice');
  const awakening=message.includes('覚醒');
  const name=awakening?'人斬り覚醒！':'斬殺！';
  const image=document.createElement('img');image.src=awakening?'assets/visuals/hitokiri_red_calligraphy.webp':'assets/visuals/hitokiri_kill_calligraphy.webp';image.alt=name;
  notice.replaceChildren(image);
  const ep=epoch;
  syncHitokiriSeal(side);
  const id=++noticeSerialHitokiri;notice.classList.add('show');
  setTimeout(()=>{if(ep===epoch&&id===noticeSerialHitokiri)notice.classList.remove('show')},window.ShinsengumiBattlePresentation.timing.awakening);
 };

 /* These visual tests leave the actual match and character counters unchanged. */
 const testTools=document.createElement('span');testTools.className='special-debug';testTools.id='hitokiriTestTools';
 const awakeningTest=document.createElement('button');awakeningTest.type='button';awakeningTest.textContent='⚔ 人斬り覚醒テスト';
 let awakeningPreviewSide=null;
 awakeningTest.onclick=()=>{
  if(titleIsVisible())return;
  if(awakeningPreviewSide!==null){
   const side=awakeningPreviewSide;awakeningPreviewSide=null;
   hitokiriSeals[side].classList.remove('preview');
   awakeningTest.textContent='⚔ 人斬り覚醒テスト';
   if(!hitokiriSeals[side].classList.contains('active'))clearCharacterBanner(side);
   showToast('覚醒印プレビューを解除しました');return;
  }
  const side=gameMode==='ai'?0:turn;
  const person=visibleBannerPersons[side]||b.flat().find(p=>p?.s===side&&p.t==='玉')||b.flat().find(p=>p?.s===side);
  if(!person)return;
  setCharacterBanner(side,person,'',0);
  playSampleSfx('slash1');
  hitokiriSeals[side].classList.add('preview');
  awakeningPreviewSide=side;
  awakeningTest.textContent='⚔ 覚醒印テスト解除';
  showToast('覚醒印をバナー中央に持続表示中（もう一度押すと解除）');
 };
 const killTest=document.createElement('button');killTest.type='button';killTest.textContent='🩸 斬殺演出テスト';
 killTest.onclick=()=>{if(titleIsVisible())return;const focus=lastMove||{y:4,x:4};playFx('purge');markBlood(focus.y,focus.x);flashHitokiri('人斬り・斬殺！');showToast('斬殺：演出プレビュー（駒は変わりません）')};
 // The preview stages a defection without changing the saved board or captured-piece counts.
 let reinforcementPreviewRunning=false;
 async function previewReinforcementPortrait(target,receivingSide=0,onArrive=null){
  if(reinforcementPreviewRunning){onArrive?.();return}
  const cell=$('board').children[target.y*9+target.x],hand=$(receivingSide===0?'playerHandShell':'enemyHandShell');
  if(!cell||!hand){onArrive?.();return}
  reinforcementPreviewRunning=true;reinforcementTest.disabled=true;
  const person=target.p;
  // Use the same full-body troop artwork as the desertion animation.
  const figureSrc='assets/sprites/figures/'+(person.s===0?'shinsengumi_back':'saccho_front')+'.webp';
  const portrait=document.createElement('img');
  // Wait for an actual decoded image before the timer begins. Slow mobile networks
  // otherwise finish the entire flight before the portrait becomes visible.
  async function loadPortrait(src){
   return new Promise(resolve=>{
    portrait.onload=()=>resolve(true);
    portrait.onerror=()=>resolve(false);
    portrait.src=src;
    if(portrait.complete)resolve(portrait.naturalWidth>0);
   });
  }
  const loaded=await loadPortrait(figureSrc);
  if(!loaded){
   reinforcementPreviewRunning=false;reinforcementTest.disabled=false;
   showToast('寝返りの隊士画像を読み込めませんでした');
   onArrive?.();return;
  }
  if(typeof portrait.decode==='function')try{await portrait.decode()}catch{}
  if(titleIsVisible()||!cell.isConnected){reinforcementPreviewRunning=false;reinforcementTest.disabled=false;onArrive?.();return}
  // The debug button sits below the board. On phones, clicking it scrolls the
  // board offscreen; bring the board and receiving hand back into view first.
  $('boardStage').scrollIntoView({block:'start',behavior:'instant'});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const from=cell.getBoundingClientRect(),to=hand.getBoundingClientRect();
  const size=Math.min(72,Math.max(42,from.width*1.15));
  const startX=from.left+from.width/2-size/2,startY=from.top+from.height/2-size*.7;
  const endX=to.left+to.width/2-size/2,endY=to.top+to.height/2-size*.7;
  portrait.alt='寝返りとなる隊士';
  Object.assign(portrait.style,{position:'fixed',display:'block',visibility:'visible',opacity:'1',left:startX+'px',top:startY+'px',width:size+'px',height:size*1.4+'px',objectFit:'contain',zIndex:'9999',pointerEvents:'none',filter:'drop-shadow(0 7px 10px #000c)'});
  document.body.append(portrait);
  cell.classList.add('sprite-departing');
  playSampleSfx('gravel');
  const duration=reducedGameMotion()?800:2000;
  let finished=false,flight=null;
  const cleanup=()=>{
   if(finished)return;finished=true;
   try{flight?.cancel()}catch{}
   portrait.remove();if(!onArrive)cell.classList.remove('sprite-departing');
   const landing=document.createElement('div');
   Object.assign(landing.style,{position:'fixed',left:(to.left+to.width/2-35)+'px',top:(to.top+to.height/2-43)+'px',width:'70px',height:'86px',zIndex:'9999',pointerEvents:'none',display:'grid',placeItems:'center'});
   landing.append(createToken(person.t,receivingSide,false));
   document.body.append(landing);
   if(!onArrive)setCharacterBanner(receivingSide,person,'寝返りとして合流！',1100);
   let ended=false;
   const end=()=>{if(ended)return;ended=true;landing.remove();reinforcementPreviewRunning=false;reinforcementTest.disabled=false;onArrive?.()};
   if(typeof landing.animate==='function'&&!reducedGameMotion()){
    const arrive=landing.animate([{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1.12)',offset:.45},{opacity:1,transform:'scale(1)',offset:.7},{opacity:0,transform:'scale(.85)'}],{duration:850,easing:'ease-out'});
    arrive.finished.then(end,end);
   }else setTimeout(end,850);
   setTimeout(end,1000);
  };
  const dx=endX-startX,dy=endY-startY;
  // Hold the fully loaded portrait on the board before moving it.
  setTimeout(()=>{
   if(typeof portrait.animate==='function'){
    flight=portrait.animate([
     {transform:'translate(0,0) scale(1)',opacity:1},
     {transform:`translate(${dx*.40}px,${dy*.35-20}px) scale(1.1)`,opacity:1,offset:.52},
     {transform:`translate(${dx}px,${dy}px) scale(.8)`,opacity:1}
    ],{duration,easing:'ease-in-out',fill:'forwards'});
    flight.finished.then(cleanup,cleanup);
   }else{
    portrait.style.transition=`transform ${duration}ms ease-in-out`;
    requestAnimationFrame(()=>{portrait.style.transform=`translate(${dx}px,${dy}px) scale(.8)`});
   }
   setTimeout(cleanup,duration+150);
  },350);
 }
 const reinforcementTest=document.createElement('button');reinforcementTest.type='button';reinforcementTest.textContent='🏃 寝返りアニメテスト';
 reinforcementTest.onclick=()=>{
  if(titleIsVisible()||incidentRunning||reinforcementPreviewRunning)return;
  const targets=[];for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(b[y][x]?.s===1&&b[y][x].t!=='玉')targets.push({y,x,p:b[y][x]});
  targets.sort((a,z)=>Math.abs(a.x-4)+Math.abs(a.y-4)-Math.abs(z.x-4)-Math.abs(z.y-4));
  const target=targets[0];if(!target){showToast('敵の駒がないためテストできません');return}
  previewReinforcementPortrait(target);
  showToast('隊士が合流する演出テスト（盤面と持ち駒の数は変わりません）');
 };
 const desertionTest=document.createElement('button');desertionTest.type='button';desertionTest.textContent='🏃 脱走アニメテスト';
 let desertionPreviewRunning=false;
 desertionTest.onclick=async()=>{
  if(titleIsVisible()||incidentRunning||desertionPreviewRunning||reinforcementPreviewRunning)return;
  const targets=[];for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(b[y][x]?.s===1&&b[y][x].t!=='玉')targets.push({y,x,p:b[y][x]});
  targets.sort((a,z)=>Math.abs(a.x-4)+Math.abs(a.y-4)-Math.abs(z.x-4)-Math.abs(z.y-4));
  const target=targets[0];if(!target){showToast('脱走させる駒がありません');return}
  desertionPreviewRunning=true;desertionTest.disabled=true;
  $('boardStage').scrollIntoView({block:'start',behavior:'instant'});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  playSampleSfx('gravel');
  const finish=()=>{desertionPreviewRunning=false;desertionTest.disabled=false;render()};
  animateDesertion(target.y,target.x,target.p,finish);
  // A canceled animation must not leave the test button disabled.
  setTimeout(()=>{if(desertionPreviewRunning)finish()},2100);
  showToast('脱走アニメテスト（盤面は変更しません）');
 };
 testTools.append(awakeningTest,killTest,reinforcementTest,desertionTest);document.querySelector('.special-debug')?.insertAdjacentElement('afterend',testTools);

 /* Autosave only at complete turn boundaries; the scene can always be restored. */
 function snapshotGame(){
  if(!b||ended)return null;
  return {
   version:1,date:Date.now(),b:clone(b),h:clone(h),handIdentities:clone(handIdentities),
   turn,ply,used:clone(used),left:clone(left),lastMove:clone(lastMove),positionHistory:clone(positionHistory),
   captureCounts:clone(captureCounts),quakeHoles:clone(quakeHoles),quakeCracks:clone(quakeCracks),
   rulePreset,ruleSettings:clone(ruleSettings),customSettings:clone(customSettings),gameMode,aiLevel
  };
 }
 function saveGame(key){const snapshot=snapshotGame();return !!snapshot&&putStorage(key,snapshot)}
 function loadGame(key){
  const data=getStorage(key);
  if(!data||data.version!==1||!Array.isArray(data.b)||data.b.length!==9||!Array.isArray(data.h)||![0,1].includes(data.turn)){
   alert('読み込める対局データがありません。');return false;
  }
  if(!titleIsVisible()&&!confirm('現在の対局を中断して保存データを読み込みますか？'))return false;
  reset();
  b=clone(data.b);h=clone(data.h);handIdentities=clone(data.handIdentities||[{},{}]);
  turn=data.turn;ply=data.ply||0;used=clone(data.used||[false,false]);left=clone(data.left||[0,0]);
  lastMove=data.lastMove||null;positionHistory=clone(data.positionHistory||[]);
  captureCounts=Array.isArray(data.captureCounts)?{}:clone(data.captureCounts||{});quakeHoles=clone(data.quakeHoles||[]);quakeCracks=clone(data.quakeCracks||[]);
  rulePreset=data.rulePreset||'full';ruleSettings=clone(data.ruleSettings||allRules);customSettings=clone(data.customSettings||allRules);
  gameMode=data.gameMode==='local'?'local':'ai';aiLevel=[0,1,2].includes(data.aiLevel)?data.aiLevel:1;
  $('rulePreset').value=rulePreset;selectRulePreset(rulePreset);ruleSettings=clone(data.ruleSettings||allRules);
  $('aiLevel').value=String(aiLevel);selectGameMode(gameMode);
  $('titleScreen').classList.add('hidden');document.body.classList.toggle('local-match',gameMode==='local');document.body.classList.toggle('traditional-match',rulePreset==='traditional');
  $('enemyHandLabel').textContent=gameMode==='local'?'後手の持ち駒':'敵陣の持ち駒';$('playerHandLabel').textContent=gameMode==='local'?'先手の持ち駒':'あなたの持ち駒';
  ended=false;busy=false;pendingCardSide=null;incidentRunning=false;incidentEffect=null;playerTurnReady=false;
  stopTitleMusic();startBgm();render();window.scrollTo(0,0);queueTurnNotice(turn);
  showToast('📂 保存した対局を再開しました');return true;
 }
 const baseQueueTurn=queueTurnNotice;
 queueTurnNotice=function(side){if(!ended&&b&&titleIsVisible()===false){saveGame(SAVE_KEY);updateContinueButton()}return baseQueueTurn(side)};

 // Incident animations and audio are supplied by the common story presentation.

 /* Both modes share the same transparent victory portrait compositor. */
 const baseVictory=showVictory;
 const endStage=$('endPanel');
 const verdict=document.createElement('img');verdict.id='endVerdictGraphic';verdict.className='end-result-calligraphy';verdict.src='assets/visuals/verdict_shobu_attah.webp';verdict.alt='勝負あった！';
 const winGraphic=document.createElement('img');winGraphic.id='endVictoryGraphic';winGraphic.className='end-result-calligraphy';winGraphic.src='assets/visuals/verdict_victory.webp';winGraphic.alt='勝利';
 const lossGraphic=document.createElement('img');lossGraphic.id='endDefeatGraphic';lossGraphic.className='end-result-calligraphy';lossGraphic.src='assets/visuals/verdict_defeat.webp';lossGraphic.alt='敗北';
 endStage.insertBefore(verdict,$('endActions'));endStage.insertBefore(winGraphic,$('endActions'));endStage.insertBefore(lossGraphic,$('endActions'));
 showVictory=function(winner,reason='詰み'){
  baseVictory(winner,reason);
  if($('endOverlay').classList.contains('show')){
   $('endPanel').classList.remove('result-draw');
   $('endWinnerImage').style.display='';$('endLoserImage').style.display='';
   window.SharedVictory.show({overlay:$('endOverlay'),winnerElement:$('endWinnerImage'),loserElement:$('endLoserImage'),
    winnerId:winner===0?'kondo':'saigo',loserId:winner===0?'saigo':'kondo',
    winnerName:winner===0?'近藤勇':'西郷隆盛',loserName:winner===0?'西郷隆盛':'近藤勇'});
   $('endText').textContent='勝負あった！';
   $('endPanel').setAttribute('data-winning-side',winner===0?'shinsengumi':'saccho');
  }
 };
 const baseDraw=showRepetitionDraw;
 showRepetitionDraw=function(){baseDraw();endStage.classList.add('result-draw')};

 window.ShinsengumiSaveSlots?.register('normal',{
  legacyKeys:[MANUAL_KEY,SAVE_KEY],
  capture:()=>snapshotGame(),
  restore:data=>{
   const key='shinsengumi-shogi-slot-restore-v1';
   if(!putStorage(key,data))return false;
   const ok=loadGame(key);
   try{localStorage.removeItem(key)}catch{}
   return ok;
  },
  describe:data=>data.gameMode==='local'?'二人対戦':data.rulePreset==='traditional'?'通常将棋':'通常対局',
  afterSave:()=>{manualLoad.hidden=false;resume.hidden=false}
 });
  syncTitleVolume();updateContinueButton();render();
})();
