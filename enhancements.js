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
 reset=function(){baseReset();captureCounts={}};
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
 const baseRender=render;
 render=function(){
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
 flashHitokiri=function(message){
  const notice=$('hitokiriNotice');
  const name=message.includes('覚醒')?'人斬り覚醒':'斬殺';
  if(name==='人斬り覚醒'){
   notice.replaceChildren();const image=document.createElement('img');image.src='assets/visuals/hitokiri_awakening_v1.webp';image.alt='人斬り覚醒';notice.append(image);
  }else{
   notice.textContent='斬殺！';
  }
  const side=turn,ep=epoch;
  if(name==='人斬り覚醒'){
   const panel=$(side===0?'officerPanel':'enemyOfficerPanel');panel.classList.add('hitokiri-banner');
   setTimeout(()=>{if(ep===epoch)panel.classList.remove('hitokiri-banner')},1900);
  }
  const id=++noticeSerialHitokiri;notice.classList.add('show');
  setTimeout(()=>{if(ep===epoch&&id===noticeSerialHitokiri)notice.classList.remove('show')},1800);
 };

 /* These visual tests leave the actual match and character counters unchanged. */
 const testTools=document.createElement('span');testTools.className='special-debug';testTools.id='hitokiriTestTools';
 const awakeningTest=document.createElement('button');awakeningTest.type='button';awakeningTest.textContent='⚔ 人斬り覚醒テスト';
 awakeningTest.onclick=()=>{if(titleIsVisible())return;flashHitokiri('人斬り覚醒');showToast('人斬り覚醒：演出プレビュー（捕縛数は変わりません）')};
 const killTest=document.createElement('button');killTest.type='button';killTest.textContent='🩸 斬殺演出テスト';
 killTest.onclick=()=>{if(titleIsVisible())return;const focus=lastMove||{y:4,x:4};playFx('purge');markBlood(focus.y,focus.x);flashHitokiri('人斬り・斬殺！');showToast('斬殺：演出プレビュー（駒は変わりません）')};
 testTools.append(awakeningTest,killTest);document.querySelector('.special-debug')?.insertAdjacentElement('afterend',testTools);

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
  const from=cell?.getBoundingClientRect(),to=jail?.getBoundingClientRect();
  if(!from||!to||!cell||reducedGameMotion()){done();return}
  const ghost=createToken(person.t,person.s,person.p);
  ghost.style.cssText='position:fixed!important;inset:auto!important;z-index:185;pointer-events:none;display:grid;width:'+from.width*.83+'px;height:'+from.height*.92+'px;left:'+from.left+'px;top:'+from.top+'px;margin:0';
  $('actionLayer').append(ghost);cell.classList.add('sprite-departing');
  const deltaX=(to.left+to.width/2)-(from.left+from.width/2),deltaY=(to.top+to.height/2)-(from.top+from.height/2);
  const anim=ghost.animate([
   {offset:0,transform:'translate(0,0) rotate(0)',opacity:1},
   {offset:.12,transform:'translate(-4px,-5px) rotate(-9deg)'},
   {offset:.22,transform:'translate(7px,4px) rotate(8deg)'},
   {offset:.35,transform:'translate(-4px,0) rotate(-7deg)'},
   {offset:.78,transform:`translate(${deltaX*.72}px,${deltaY*.72}px) scale(.82)`},
   {offset:1,transform:`translate(${deltaX}px,${deltaY}px) scale(.6) rotate(${effect.side===0?0:180}deg)`,opacity:.1}
  ],{duration:1370,easing:'ease-in-out',fill:'forwards'});
  let finished=false;const finish=()=>{if(finished)return;finished=true;anim.cancel();ghost.remove();cell.classList.remove('sprite-departing');done()};
  anim.finished.then(finish,finish);setTimeout(finish,1700);
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
 resolveCard=function(s){baseResolveCard(s);if(incidentEffect?.kind==='援軍')$('event').textContent=$('event').textContent.replace('捕獲して持ち駒に加える','寝返り、味方の持ち駒に合流する')};

 /* One illustrated result scene: towering victor and kneeling defeated officer. */
 const baseVictory=showVictory;
 showVictory=function(winner,reason='詰み'){
  baseVictory(winner,reason);
  if($('endOverlay').classList.contains('show')){
   $('endWinnerImage').src=winner===0?'assets/visuals/victory_shinsengumi_scene.webp':'assets/visuals/victory_saccho_scene.webp';
   $('endWinnerImage').alt=(winner===0?'新選組':'薩長同盟')+'勝利、敗軍は膝をつく';
   $('endLoserImage').style.display='none';
   $('endText').textContent='勝負あった！';
   $('endPanel').setAttribute('data-winning-side',winner===0?'shinsengumi':'saccho');
  }
 };

 syncTitleVolume();updateContinueButton();render();
})();
