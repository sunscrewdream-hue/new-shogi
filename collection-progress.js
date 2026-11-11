(()=>{
 'use strict';
 const D=window.StoryData;
 const primaryKey='shinsengumi-shogi-collection-v1';
 const legacy=[
  ['shinsengumi-story-kinmon-cards-v1','kinmonRoster'],
  ['shinsengumi-story-kinmon-satsuma-cards-v1','kinmonAllies'],
  ['shinsengumi-story-toba-historical-cards-v1','tobaRoster'],
  ['shinsengumi-story-toba-aizu-cards-v1','tobaAllies']
 ];
 const oilKey='shinsengumi-story-oil-historical-cards-v1';
 const grid=document.querySelector('.grid'),main=document.querySelector('.hero');
 if(!D||!grid||!main)return;
 const existing=Array.from(grid.querySelectorAll('details.card'));
 const rows=[],seen=new Map();
 const fallback='assets/cards/back/card-back-saccho-1024x1536.webp';
 const adoptedArt={"石川潤次郎":"assets/collection/41.webp","吉田稔麿":"assets/collection/42.webp","北添佶摩":"assets/collection/43.webp","望月亀弥太":"assets/collection/44.webp","松田重助":"assets/collection/45.webp","大高又次郎":"assets/collection/46.webp","広岡浪秀":"assets/collection/47.webp","杉山松助":"assets/collection/48.webp","福岡祐次郎":"assets/collection/49.webp","来島又兵衛":"assets/collection/50.webp","真木和泉":"assets/collection/51.webp","国司信濃":"assets/collection/52.webp","福原越後":"assets/collection/53.webp","益田右衛門介":"assets/collection/54.webp","入江九一":"assets/collection/55.webp","寺島忠三郎":"assets/collection/56.webp","児玉小民部":"assets/collection/57.webp","楳本仙之助":"assets/collection/58.webp","湯川庄蔵":"assets/collection/59.webp","有川常槌":"assets/collection/60.webp","三隅竜雄":"assets/collection/61.webp","内田弥三郎":"assets/collection/62.webp","若杉弘之進":"assets/collection/63.webp","中村恒次郎":"assets/collection/64.webp","澄川謙蔵":"assets/collection/65.webp","中尾易三郎":"assets/collection/66.webp","中村総治":"assets/collection/67.webp","吉井友実":"assets/collection/68.webp","服部武雄":"assets/collection/69.webp","毛内有之助":"assets/collection/70.webp","鈴木三樹三郎":"assets/collection/71.webp","篠原泰之進":"assets/collection/72.webp","加納鷲雄":"assets/collection/73.webp","富山弥兵衛":"assets/collection/74.webp","大石鍬次郎":"assets/collection/75.webp","横倉甚五郎":"assets/collection/76.webp","宮川信吉":"assets/collection/77.webp","三浦常三郎":"assets/collection/78.webp","岸島芳太郎":"assets/collection/79.webp","伊地知正治":"assets/collection/80.webp","篠原国幹":"assets/collection/81.webp","野津鎮雄":"assets/collection/82.webp","市来勘兵衛":"assets/collection/83.webp","鈴木武五郎":"assets/collection/84.webp","辺見十郎太":"assets/collection/85.webp","樺山資紀":"assets/collection/86.webp","川路利良":"assets/collection/87.webp","山田顕義":"assets/collection/88.webp","福田侠平":"assets/collection/89.webp","世良修蔵":"assets/collection/90.webp","三浦梧楼":"assets/collection/91.webp","安富才助":"assets/collection/92.webp","佐川官兵衛":"assets/collection/93.webp","林権助":"assets/collection/94.webp","田中土佐":"assets/collection/95.webp","堀半右衛門":"assets/collection/96.webp","生駒五兵衛":"assets/collection/97.webp","上田八郎右衛門":"assets/collection/98.webp","白井五郎太夫":"assets/collection/99.webp","小原宇右衛門":"assets/collection/100.webp","佐藤織之助":"assets/collection/101.webp","中澤常左衛門":"assets/collection/102.webp","宮部鼎蔵":"assets/collection/103.webp","伊東甲子太郎":"assets/collection/104.webp"};
 function register(name,role,side,chapter,art){
  if(!name)return;
  let row=seen.get(name);
  if(row){if(chapter&&!row.chapters.includes(chapter))row.chapters.push(chapter);return row;}
  row={name,role:role||'幕末の人物',side:String(side),chapters:chapter?[chapter]:[],art:art||fallback};
  seen.set(name,row);rows.push(row);return row;
 }
 existing.forEach((card,index)=>{
  const name=card.querySelector('summary h3')?.textContent?.trim();
  const role=card.querySelector('summary .role')?.textContent?.trim();
  const row=register(name,role,card.dataset.side,'',index<40?'assets/collection/'+String(index+1).padStart(2,'0')+'.webp':fallback);
  row.element=card;row.legacyIndex=index;
 });
 const groupSpecs=[
  ['kinmonRoster','禁門の変',1],['kinmonAllies','禁門の変',0],
  ['oilRaiders','油小路',1],['oilDefenders','油小路',0],
  ['tobaRoster','鳥羽・伏見',1],['tobaAllies','鳥羽・伏見',0]
 ];
 for(const [field,chapter,side] of groupSpecs)
  for(const person of D[field]||[])register(person.name,person.role,side,chapter,person.art);
 register('宮部鼎蔵','尊王攘夷派・池田屋の指導者',1,'池田屋事件');
 register('伊東甲子太郎','御陵衛士・盟主',1,'油小路');
 register('芹沢鴨','壬生浪士組・初代局長',0,'幕末物語','assets/collection/105.webp');
 if(rows.length!==105)console.warn('人物数の確認が必要です',rows.length);
 for(const row of rows){
  if(adoptedArt[row.name])row.art=adoptedArt[row.name];
  if(row.element)continue;
  const card=document.createElement('details');card.className='card';card.dataset.side=row.side;
  const summary=document.createElement('summary');
  const portrait=document.createElement('span');portrait.className='portrait';portrait.setAttribute('aria-hidden','true');portrait.textContent=row.name.slice(0,1);
  const tag=document.createElement('span');tag.className='tag';tag.textContent=(row.name==='芹沢鴨'?'特別収録':row.side==='0'?'新選組・会津／関係者':'幕末・対戦人物')+' ／ '+String(rows.indexOf(row)+1).padStart(3,'0');
  const heading=document.createElement('h3');heading.textContent=row.name;
  const role=document.createElement('div');role.className='role';role.textContent=row.role;
  const hint=document.createElement('span');hint.className='open-hint';hint.textContent='略歴を読む ＋';
  summary.append(portrait,tag,heading,role,hint);
  const profile=document.createElement('div');profile.className='profile';
  const dl=document.createElement('dl');
  const dt1=document.createElement('dt');dt1.textContent='人物・役割';const dd1=document.createElement('dd');dd1.textContent=row.role;
  const dt2=document.createElement('dt');dt2.textContent='登場章';const dd2=document.createElement('dd');dd2.textContent=row.chapters.join('・')||'通常盤';
  const dt3=document.createElement('dt');dt3.textContent='人物素材';const dd3=document.createElement('dd');dd3.textContent='正式採用コレクションカード';
  dl.append(dt1,dd1,dt2,dd2,dt3,dd3);
  const note=document.createElement('p');note.textContent=row.name==='芹沢鴨'?'幕末物語のすべての対局を勝ち抜くと獲得できる特別なゴールドカード。芹沢の肖像は残っておらず、伝承をもとに創作した人物像です。':'正式採用カードを収録しています。ゲーム内の役割は史実の経歴と異なる場合があります。';
  profile.append(dl,note);card.append(summary,profile);grid.append(card);row.element=card;
 }
 const notice=main.querySelector('.notice');if(notice)notice.remove();
 main.querySelector('h1').textContent='幕末人物コレクション';
 main.querySelector('.eyebrow').textContent='HISTORICAL CHARACTER COLLECTION';
 main.querySelector('.intro').textContent='幕末を生きた104名と特別収録の芹沢鴨。人物を選ぶと、カードとプロフィールを一緒に確認できます。対局で駒を取るか、物語を攻略すると人物カードを獲得できます。';
 document.title='人物コレクション｜新選組将棋';
 let testMode=false;
 const panel=document.createElement('section');panel.className='collection-progress';
 panel.innerHTML='<strong id="collectionTotal">0 / 105</strong><div>人物カードを収集中</div><div class="collection-bar" aria-hidden="true"><div id="collectionFill"></div></div><p id="collectionStatus" role="status" aria-live="polite"></p><button type="button" id="collectionDevToggle" aria-pressed="false">🛠 開発テスト：全105名を表示</button><button type="button" id="resetCollection">収集データをリセット</button>';
 main.append(panel);
 const keys=[primaryKey,...legacy.map(x=>x[0]),oilKey];
 const readArray=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
 const owned=()=>{
  const names=new Set();
  for(const id of readArray(primaryKey)){
   if(!Number.isInteger(id))continue;
   if(id<40){const person=id<20?D.F[id]:D.E[id-20];if(person)names.add(person[0]);}
   else if(id<49){const person=existing[id]?.querySelector('summary h3')?.dataset.originalName;if(person)names.add(person);}
  }
  for(const [key,field] of legacy)
   for(const id of readArray(key))if(Number.isInteger(id)&&D[field]?.[id])names.add(D[field][id].name);
  for(const id of readArray(oilKey)){
   if(typeof id!=='string')continue;
   const [side,index]=id.split(':');const field=side==='shinsengumi'?'oilDefenders':side==='goryo-eji'?'oilRaiders':null;
   if(field&&D[field]?.[Number(index)])names.add(D[field][Number(index)].name);
  }
  let progress=0;try{progress=Number(localStorage.getItem('shinsengumi-story-progress-v2'))||0}catch{}
  if(progress>=1)names.add('宮部鼎蔵');
  if(progress>=3)names.add('伊東甲子太郎');
  if(progress>=4)names.add('芹沢鴨');
  return names;
 };
 const viewer=document.createElement('dialog');viewer.className='collection-viewer';
 viewer.innerHTML='<button type="button" class="viewer-close" aria-label="閉じる">×</button><h2 class="viewer-name"></h2><div class="viewer-layout"><img class="viewer-art" alt=""><div class="viewer-profile" aria-label="人物のプロフィール"></div></div>';
 document.body.append(viewer);
 // Reuse the adopted page-turn sound. Opening is clear; closing is gentler.
 const pageFlip=new Audio('assets/audio/sfx/card_flip.mp3');
 pageFlip.preload='auto';
 let lastFlipAt=0;
 function playProfilePageTurn(closing=false){
  if(Date.now()-lastFlipAt<130)return;
  lastFlipAt=Date.now();
  try{
   pageFlip.pause();pageFlip.currentTime=0;
   pageFlip.volume=closing?0.30:0.46;
   const playback=pageFlip.play();if(playback?.catch)playback.catch(()=>{});
  }catch(_){/* Audio can be unavailable until the next user gesture. */}
 }
 let lastFocused=null;
 const closeViewer=()=>{if(viewer.open)viewer.close()};
 viewer.querySelector('.viewer-close').onclick=closeViewer;
 viewer.onclick=e=>{if(e.target===viewer)closeViewer()};
 viewer.addEventListener('close',()=>{playProfilePageTurn(true);lastFocused?.focus?.();lastFocused=null});
 function showCard(row){
  if(!testMode&&!owned().has(row.name))return;
  lastFocused=document.activeElement;
  const art=viewer.querySelector('.viewer-art');
  art.src=row.art;art.alt=row.name+'の人物カード';
  art.onerror=()=>{if(!art.src.includes('card-back-saccho'))art.src=fallback};
  viewer.querySelector('.viewer-name').textContent=row.name;
  const profile=row.element.querySelector('.profile');
  viewer.querySelector('.viewer-profile').replaceChildren(...Array.from(profile.childNodes,child=>child.cloneNode(true)));
  viewer.showModal();
  playProfilePageTurn();
 }
 rows.forEach((row,index)=>{
  const card=row.element;card.dataset.characterIndex=String(index);
  card.dataset.search=[row.name,row.role,...row.chapters].join(' ');
  const heading=card.querySelector('summary h3');heading.dataset.originalName=row.name;
  const portrait=card.querySelector('.portrait');portrait.replaceChildren();
  const img=document.createElement('img');img.loading='lazy';img.alt='';img.width=768;img.height=1152;img.src=row.art;img.onerror=()=>{if(img.src.indexOf('card-back-saccho')<0)img.src=fallback};portrait.append(img);
  const summary=card.querySelector('summary');
  summary.setAttribute('aria-label',row.name+'のカードとプロフィールを開く');
  const hint=summary.querySelector('.open-hint');if(hint)hint.textContent='カードと略歴を見る ＋';
  summary.addEventListener('click',event=>{
   event.preventDefault();
   card.open=false;
   if(card.classList.contains('locked'))return;
   showCard(row);
  });
  card.addEventListener('toggle',()=>{if(card.open)card.open=false});
 });
 let filterSide='all',shownLimit=24;const pageSize=24,search=document.getElementById('search'),buttons=Array.from(document.querySelectorAll('[data-filter]'));
 const more=document.createElement('button');more.type='button';more.className='collection-show-more';more.textContent='さらに24名を表示';
 grid.after(more);
 const normalize=value=>value.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g,'');
 function filter(){
  const query=normalize(search.value),matches=rows.filter(row=>(filterSide==='all'||row.side===filterSide)&&normalize(row.element.dataset.search).includes(query));
  const visible=new Set(matches.slice(0,testMode||query?matches.length:shownLimit));
  for(const row of rows)row.element.hidden=!visible.has(row);
  document.getElementById('count').textContent=visible.size+'名を表示 ／ 該当'+matches.length+'名 ／ 全105名';
  document.getElementById('empty').hidden=matches.length>0;
  more.hidden=testMode||!!query||matches.length<=shownLimit;
  if(!more.hidden)more.textContent='さらに'+Math.min(pageSize,matches.length-shownLimit)+'名を表示';
 }
 function refresh(){const found=owned();for(const row of rows){const card=row.element,unlocked=testMode||found.has(row.name);card.classList.toggle('unlocked',unlocked);card.classList.toggle('locked',!unlocked);card.querySelector('summary h3').textContent=unlocked?row.name:'未収録';const portrait=card.querySelector('.portrait'),img=portrait.querySelector('img');if(!unlocked){card.open=false;img.hidden=true;portrait.dataset.locked='？'}else{img.hidden=false;delete portrait.dataset.locked}}const total=rows.filter(row=>found.has(row.name)).length;document.getElementById('collectionTotal').textContent=total+' / '+rows.length;document.getElementById('collectionFill').style.width=total/rows.length*100+'%';document.getElementById('collectionStatus').textContent=total===rows.length?'全人物を収集しました！':total===0?'まだ人物を収集していません。対局で駒を取りましょう。':(rows.length-total)+'名が未収録です。';filter()}
 const sides={0:rows.filter(x=>x.side==='0').length,1:rows.filter(x=>x.side==='1').length};
 for(const button of buttons){if(button.dataset.filter==='0')button.textContent='新選組・会津 '+sides[0]+'名';if(button.dataset.filter==='1')button.textContent='その他の人物 '+sides[1]+'名';button.onclick=()=>{filterSide=button.dataset.filter;shownLimit=pageSize;for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));filter()}}
 const devButton=document.getElementById('collectionDevToggle');
 devButton.onclick=()=>{testMode=!testMode;devButton.setAttribute('aria-pressed',String(testMode));devButton.textContent=testMode?'🛠 開発テストを終了（通常表示へ）':'🛠 開発テスト：全105名を表示';shownLimit=pageSize;refresh()};
 more.onclick=()=>{shownLimit+=pageSize;filter()};
 search.oninput=()=>{shownLimit=pageSize;filter()};
 document.getElementById('resetCollection').onclick=()=>{
  if(!confirm('人物カードの収集記録を消去しますか？ 対局のセーブデータとストーリー進行記録は残り、章クリア特典のカードは再表示されます。'))return;
  for(const key of keys)try{localStorage.removeItem(key)}catch{}
  refresh();
 };
 refresh();
 const localization=document.createElement('script');localization.src='game-language.js';localization.defer=true;document.body.append(localization);
})();
