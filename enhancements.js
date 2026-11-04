/* New features are deliberately isolated from the original game engine. */
(()=>{
 'use strict';
 const SAVE_KEY='shinsengumi-shogi-autosave-v1';
 const MANUAL_KEY='shinsengumi-shogi-manualsave-v1';
 const COLLECTION_KEY='shinsengumi-shogi-collection-v1';
 const $=id=>document.getElementById(id);
 const titleAudio=new Audio('assets/audio/title_bgm_mobile.mp3');
 titleAudio.loop=true;titleAudio.preload='auto';titleAudio.playsInline=true;
 const titleIsVisible=()=>!$('titleScreen').classList.contains('hidden');
 const getStorage=(key)=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
 const putStorage=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
 let toastTimer=null;
 const toast=document.createElement('div');toast.className='collection-toast';toast.setAttribute('role','status');document.body.append(toast);
 function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3100)}

 /* A phone cannot autoplay without a gesture. The first title interaction unlocks it. */
 function syncTitleVolume(){titleAudio.volume=Math.min(.6,Number($('volume').value)/100)*(titleIntroAudio.paused?1:.18)}
 titleIntroAudio.addEventListener('play',syncTitleVolume);
 titleIntroAudio.addEventListener('ended',syncTitleVolume);
 titleIntroAudio.addEventListener('pause',syncTitleVolume);
 function playTitleMusic(){
  if(!bgmEnabled||document.hidden||!titleIsVisible())return;
  syncTitleVolume();const p=titleAudio.play();if(p?.catch)p.catch(()=>{});
 }
 function stopTitleMusic(){titleAudio.pause();titleAudio.currentTime=0}
 document.addEventListener('pointerdown',()=>{if(titleIsVisible())playTitleMusic()},{passive:true});
 const baseSyncVolume=syncBgmVolume;
 syncBgmVolume=function(){baseSyncVolume();syncTitleVolume()};
 const baseStartBgm=startBgm;
 startBgm=function(){stopTitleMusic();baseStartBgm()};
 const baseToggleBgm=toggleBgm;
 toggleBgm=function(){baseToggleBgm();if(titleIsVisible()&&bgmEnabled)playTitleMusic();else if(!bgmEnabled)stopTitleMusic()};
 const baseStopAll=stopAllAudio;
 stopAllAudio=function(){stopTitleMusic();baseStopAll()};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&titleIsVisible())playTitleMusic()});
 const baseReturn=returnToTitle;
 returnToTitle=function(){baseReturn();playTitleMusic();updateContinueButton()};
 const baseStart=startGame;
 startGame=function(){baseStart();stopTitleMusic()};
 const baseRestart=restartGame;
 restartGame=function(){baseRestart();stopTitleMusic()};
 const baseReset=reset;
 reset=function(){baseReset();captureCounts={};for(const seal of hitokiriSeals)seal.classList.remove('active','preview');visibleBannerPersons.fill(null)};
 $('volume').addEventListener('input',syncTitleVolume);

 /* PWA, fullscreen button, title/manual/navigation. */
 const extras=document.createElement('div');extras.id='titleExtras';
 const resume=document.createElement('button');resume.type='button';resume.id='continueGame';resume.textContent='▶ 続きから';resume.onclick=()=>loadGame(SAVE_KEY);
 const manualLoad=document.createElement('button');manualLoad.type='button';manualLoad.id='loadGame';manualLoad.textContent='📂 保存した対局';manualLoad.onclick=()=>loadGame(MANUAL_KEY);
 const full=document.createElement('button');full.type='button';full.textContent='⛶ 全画面';full.onclick=async()=>{
  try{if(document.fullscreenElement){await document.exitFullscreen();return}if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();return}}catch{}
  alert('このブラウザでは直接の全画面表示に対応していません。iPhoneではSafariの「共有」→「ホーム画面に追加」を選ぶと、アプリのように起動できます。');
 };
 extras.append(resume,manualLoad,full);$('startGame').insertAdjacentElement('afterend',extras);
 const manual=document.createElement('a');manual.href='manual.html';manual.textContent='📜 新選組将棋の遊び方 ›';$('titleLinks').prepend(manual);
 const collectionLink=$('titleLinks').querySelector('a[href="collection.html"]');if(collectionLink)collectionLink.innerHTML='人物コレクション <span aria-hidden="true">›</span>';
 const inGameSave=document.createElement('button');inGameSave.type='button';inGameSave.id='quickSave';inGameSave.textContent='💾 対局を保存';inGameSave.onclick=()=>{if(titleIsVisible()||ended){showToast('対局中に保存してください');return}showToast(saveGame(MANUAL_KEY)?'対局を保存しました':'保存できませんでした')};
 const gameHelp=document.querySelector('.game-menu-link');gameHelp?.insertAdjacentElement('beforebegin',inGameSave);
 const inGameFull=document.createElement('button');inGameFull.type='button';inGameFull.textContent='⛶ 全画面';inGameFull.onclick=full.onclick;inGameSave.insertAdjacentElement('afterend',inGameFull);
 function updateContinueButton(){resume.hidden=!getStorage(SAVE_KEY);manualLoad.hidden=!getStorage(MANUAL_KEY)}

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
 gameBoard.addEventListener('pointerover',event=>{
  if(event.pointerType!=='mouse'||titleIsVisible()||ended||busy||incidentRunning||!playerTurnReady||(gameMode==='ai'&&turn!==0))return;
  const cell=event.target.closest('.sq');
  if(!cell||!gameBoard.contains(cell))return;
  const index=Array.prototype.indexOf.call(gameBoard.children,cell),piece=b?.[Math.floor(index/9)]?.[index%9];
  if(!piece){clearHoveredBanner();return}
  if(hoveredBannerSide!==null&&hoveredBannerSide!==piece.s)clearHoveredBanner();
  const panel=$(piece.s===0?'officerPanel':'enemyOfficerPanel');
  if(panel.classList.contains('speaking'))return;
  setCharacterBanner(piece.s,piece,'',0);
  hoveredBannerSide=piece.s;
 });
 gameBoard.addEventListener('pointerout',event=>{
  if(event.pointerType!=='mouse')return;
  const cell=event.target.closest('.sq');
  if(!cell||cell.contains(event.relatedTarget))return;
  clearHoveredBanner();
 });
 gameBoard.addEventListener('pointerleave',clearHoveredBanner);
 const baseRender=render;
 render=function(){
  clearHoveredBanner();
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
  const threats=ended?[]:getCheckThreats(b).paths;
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
  btn.setAttribute('aria-label',(s===0?'新選組':'薩長同盟')+'の持ち駒 '+t+' '+count+'枚');
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
 commit=function(m,prom=false){
  const captured=!m.drop?b[m.Y]?.[m.X]:null;
  const result=baseCommit(m,prom);
  if(captured)awardPerson(captured);
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
 flashHitokiri=function(message){
  const notice=$('hitokiriNotice');
  const awakening=message.includes('覚醒');
  const name=awakening?'人斬り覚醒！':'斬殺！';
  const image=document.createElement('img');image.src=awakening?'assets/visuals/hitokiri_red_calligraphy.webp':'assets/visuals/hitokiri_kill_calligraphy.webp';image.alt=name;
  notice.replaceChildren(image);
  const side=turn,ep=epoch;
  syncHitokiriSeal(side);
  const id=++noticeSerialHitokiri;notice.classList.add('show');
  setTimeout(()=>{if(ep===epoch&&id===noticeSerialHitokiri)notice.classList.remove('show')},1800);
 };

 /* These visual tests leave the actual match and character counters unchanged. */
 const testTools=document.createElement('span');testTools.className='special-debug';testTools.id='hitokiriTestTools';
 const awakeningTest=document.createElement('button');awakeningTest.type='button';awakeningTest.textContent='⚔ 人斬り覚醒テスト';
 awakeningTest.onclick=()=>{if(titleIsVisible())return;flashHitokiri('人斬り覚醒');const seal=hitokiriSeals[turn];seal.classList.add('preview');const ep=epoch;setTimeout(()=>{if(ep===epoch)seal.classList.remove('preview')},2500);showToast('人斬り覚醒：演出プレビュー（捕縛数は変わりません）')};
 const killTest=document.createElement('button');killTest.type='button';killTest.textContent='🩸 斬殺演出テスト';
 killTest.onclick=()=>{if(titleIsVisible())return;const focus=lastMove||{y:4,x:4};playFx('purge');markBlood(focus.y,focus.x);flashHitokiri('人斬り・斬殺！');showToast('斬殺：演出プレビュー（駒は変わりません）')};
 const reinforcementTest=document.createElement('button');reinforcementTest.type='button';reinforcementTest.textContent='🏃 援軍アニメテスト';
 reinforcementTest.onclick=()=>{
  if(titleIsVisible()||incidentRunning)return;
  const targets=[];for(let y=0;y<9;y++)for(let x=0;x<9;x++)if(b[y][x]?.s===1&&b[y][x].t!=='玉')targets.push({y,x,p:b[y][x]});
  targets.sort((a,z)=>Math.abs(a.x-4)+Math.abs(a.y-4)-Math.abs(z.x-4)-Math.abs(z.y-4));
  const target=targets[0];if(!target){showToast('敵の駒がないためテストできません');return}
  animateDefection({y:target.y,x:target.x,side:0},target.p,()=>render());
  showToast('援軍の移動テスト（盤面と持ち駒の数は変わりません）');
 };
 testTools.append(awakeningTest,killTest,reinforcementTest);document.querySelector('.special-debug')?.insertAdjacentElement('afterend',testTools);

 /* Autosave only at complete turn boundaries; the scene can always be restored. */
 function saveGame(key){
  if(!b||ended)return false;
  return putStorage(key,{
   version:1,date:Date.now(),b:clone(b),h:clone(h),handIdentities:clone(handIdentities),
   turn,ply,used:clone(used),left:clone(left),lastMove:clone(lastMove),positionHistory:clone(positionHistory),
   captureCounts:clone(captureCounts),quakeHoles:clone(quakeHoles),quakeCracks:clone(quakeCracks),
   rulePreset,ruleSettings:clone(ruleSettings),customSettings:clone(customSettings),gameMode,aiLevel
  });
 }
 function loadGame(key){
  const data=getStorage(key);
  if(!data||data.version!==1||!Array.isArray(data.b)||data.b.length!==9||!Array.isArray(data.h)||![0,1].includes(data.turn)){
   alert('読み込める対局データがありません。');return;
  }
  if(!titleIsVisible()&&!confirm('現在の対局を中断して保存データを読み込みますか？'))return;
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
  $('enemyHandLabel').textContent=gameMode==='local'?'あなたの持ち駒':'敵軍の持ち駒';
  ended=false;busy=false;pendingCardSide=null;incidentRunning=false;incidentEffect=null;playerTurnReady=false;
  stopTitleMusic();startBgm();render();window.scrollTo(0,0);queueTurnNotice(turn);
  showToast('📂 保存した対局を再開しました');
 }
 const baseQueueTurn=queueTurnNotice;
 queueTurnNotice=function(side){if(!ended&&b&&titleIsVisible()===false){saveGame(SAVE_KEY);updateContinueButton()}return baseQueueTurn(side)};

 /* Reinforcement = defection, not an arrest. Move the token to the receiver's jail. */
 function animateDefection(effect,person,done){
  const cell=$('board').children[effect.y*9+effect.x],jail=$(effect.side===0?'playerHandShell':'enemyHandShell');
  if(!cell||!jail){done();return}
  let from=cell.getBoundingClientRect(),to=jail.getBoundingClientRect();
  if(from.bottom<0||from.top>window.innerHeight){$('boardStage').scrollIntoView({block:'center',behavior:'auto'});from=cell.getBoundingClientRect();to=jail.getBoundingClientRect()}
  const flight=document.createElement('div');flight.className='defection-flight';
  flight.style.left=from.left+'px';flight.style.top=from.top+'px';flight.style.width=from.width+'px';flight.style.height=from.height+'px';
  const ghost=createToken(person.t,person.s,person.p);
  const badge=document.createElement('span');badge.className='defection-flight-badge';badge.textContent='援軍！';
  flight.append(ghost,badge);document.body.append(flight);cell.classList.add('sprite-departing');
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const destX=clamp(to.left+to.width/2,from.width/2+16,window.innerWidth-from.width/2-16);
  const destY=clamp(to.top+to.height/2,from.height/2+28,window.innerHeight-from.height/2-30);
  const deltaX=destX-(from.left+from.width/2),deltaY=destY-(from.top+from.height/2);
  const duration=reducedGameMotion()?800:1800;
  let finished=false,anim=null;
  const finish=()=>{if(finished)return;finished=true;try{anim?.cancel()}catch{}flight.remove();cell.classList.remove('sprite-departing');done()};
  const frames=[
   {offset:0,transform:'translate(0,0) scale(1.25) rotate(-7deg)',opacity:1},
   {offset:.2,transform:'translate(4px,-4px) scale(1.35) rotate(7deg)',opacity:1},
   {offset:.53,transform:`translate(${deltaX*.34}px,${deltaY*.32-12}px) scale(1.26) rotate(-9deg)`,opacity:1},
   {offset:.82,transform:`translate(${deltaX*.82}px,${deltaY*.78-10}px) scale(1.0) rotate(8deg)`,opacity:1},
   {offset:1,transform:`translate(${deltaX}px,${deltaY}px) scale(.72) rotate(0deg)`,opacity:.16}
  ];
  try{
   if(typeof flight.animate==='function'){
    anim=flight.animate(frames,{duration,easing:'cubic-bezier(.35,.1,.2,1)',fill:'forwards'});
    anim.finished.then(finish,finish);
   }else{
    flight.style.transform=frames[0].transform;
    requestAnimationFrame(()=>{flight.style.transition=`transform ${duration}ms ease-in-out,opacity ${duration}ms ease-in-out`;flight.style.transform=frames[4].transform;flight.style.opacity='.16'});
   }
  }catch{flight.style.opacity='1'}
  setTimeout(finish,duration+180);
 }
 const baseIncidentEffect=runIncidentEffect;
 runIncidentEffect=function(){
  if(incidentEffect?.kind!=='援軍')return baseIncidentEffect();
  const effect=incidentEffect;incidentEffect=null;
  const p=b[effect.y]?.[effect.x];if(!p||p.s!==effect.owner||p.t==='玉'){queueTurnNotice(turn);return}
  incidentRunning=true;busy=true;playerTurnReady=false;incidentTarget={y:effect.y,x:effect.x};
  setCharacterBanner(effect.owner,p,'寝返り！',1800);playSampleSfx('gravel');render();
  const ep=epoch;
  const proceed=()=>{
   if(ep!==epoch)return;
   if(b[effect.y][effect.x]===p){
    b[effect.y][effect.x]=null;h[effect.side][p.t]=(h[effect.side][p.t]||0)+1;
    (handIdentities[effect.side][p.t]??=[]).push({cid:p.cid,originSide:p.originSide??p.s});
   }
   incidentTarget=null;incidentRunning=false;busy=false;
   clearCharacterBanner(effect.owner);setCharacterBanner(effect.side,p,'援軍として合流！',2000);
   render();if(!ended)queueTurnNotice(turn);
  };
  setTimeout(()=>{if(ep===epoch)animateDefection(effect,p,proceed)},240);
 };
 const baseResolveCard=resolveCard;
 const calmWind=new Audio('assets/audio/sfx/wind_calm_short.mp3');calmWind.preload='auto';calmWind.playsInline=true;
 resolveCard=function(s){
  baseResolveCard(s);
  if(incidentEffect?.kind==='援軍')$('event').textContent=$('event').textContent.replace('捕獲して持ち駒に加える','寝返り、味方の持ち駒に合流する');
  if(lastIncidentKind==='何事もなし'&&sampleSfxEnabled&&!document.hidden){
   calmWind.pause();calmWind.currentTime=0;
   calmWind.volume=Math.min(.32,Math.max(0,Number($('volume').value)/100*1.1));
   const playing=calmWind.play();if(playing?.catch)playing.catch(()=>{});
  }
 };

 /* One illustrated result scene: towering victor and kneeling defeated officer. */
 const baseVictory=showVictory;
 const endStage=$('endPanel');
 const verdict=document.createElement('img');verdict.id='endVerdictGraphic';verdict.className='end-result-calligraphy';verdict.src='assets/visuals/verdict_shobu_attah.webp';verdict.alt='勝負あった！';
 const winGraphic=document.createElement('img');winGraphic.id='endVictoryGraphic';winGraphic.className='end-result-calligraphy';winGraphic.src='assets/visuals/verdict_victory.webp';winGraphic.alt='勝利';
 const lossGraphic=document.createElement('img');lossGraphic.id='endDefeatGraphic';lossGraphic.className='end-result-calligraphy';lossGraphic.src='assets/visuals/verdict_defeat.webp';lossGraphic.alt='敗北';
 endStage.insertBefore(verdict,$('endActions'));endStage.insertBefore(winGraphic,$('endActions'));endStage.insertBefore(lossGraphic,$('endActions'));
 const portraitSource=document.createElement('source');portraitSource.media='(orientation: portrait)';
 const portraitPicture=document.createElement('picture');portraitPicture.id='endResponsiveScene';
 const winnerImage=$('endWinnerImage');winnerImage.parentNode.insertBefore(portraitPicture,winnerImage);
 portraitPicture.append(portraitSource,winnerImage);
 showVictory=function(winner,reason='詰み'){
  baseVictory(winner,reason);
  if($('endOverlay').classList.contains('show')){
   $('endWinnerImage').src=winner===0?'assets/visuals/victory_shinsengumi_scene.webp':'assets/visuals/victory_saccho_scene.webp';
   portraitSource.srcset=winner===0?'assets/visuals/victory_shinsengumi_mobile.webp':'assets/visuals/victory_saccho_mobile.webp';
   $('endPanel').classList.remove('result-draw');
   $('endWinnerImage').alt=(winner===0?'新選組':'薩長同盟')+'勝利、敗軍は膝をつく';
   $('endLoserImage').style.display='none';
   $('endText').textContent='勝負あった！';
   $('endPanel').setAttribute('data-winning-side',winner===0?'shinsengumi':'saccho');
  }
 };
 const baseDraw=showRepetitionDraw;
 showRepetitionDraw=function(){baseDraw();endStage.classList.add('result-draw')};

 syncTitleVolume();updateContinueButton();render();
})();
