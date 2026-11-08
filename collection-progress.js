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
 if(rows.length!==104)console.warn('人物数の確認が必要です',rows.length);
 for(const row of rows){
  if(row.element)continue;
  row.art=fallback;
  const card=document.createElement('details');card.className='card';card.dataset.side=row.side;
  const summary=document.createElement('summary');
  const portrait=document.createElement('span');portrait.className='portrait';portrait.setAttribute('aria-hidden','true');portrait.textContent=row.name.slice(0,1);
  const tag=document.createElement('span');tag.className='tag';tag.textContent=(row.side==='0'?'新選組・会津／関係者':'幕末・対戦人物')+' ／ '+String(rows.indexOf(row)+1).padStart(3,'0');
  const heading=document.createElement('h3');heading.textContent=row.name;
  const role=document.createElement('div');role.className='role';role.textContent=row.role;
  const hint=document.createElement('span');hint.className='open-hint';hint.textContent='略歴を読む ＋';
  summary.append(portrait,tag,heading,role,hint);
  const profile=document.createElement('div');profile.className='profile';
  const dl=document.createElement('dl');
  const dt1=document.createElement('dt');dt1.textContent='人物・役割';const dd1=document.createElement('dd');dd1.textContent=row.role;
  const dt2=document.createElement('dt');dt2.textContent='登場章';const dd2=document.createElement('dd');dd2.textContent=row.chapters.join('・')||'通常盤';
  const dt3=document.createElement('dt');dt3.textContent='人物素材';const dd3=document.createElement('dd');dd3.textContent='仮画像（正式カード制作待ち）';
  dl.append(dt1,dd1,dt2,dd2,dt3,dd3);
  const note=document.createElement('p');note.textContent='この人物のカード画像と詳しい略歴は制作中です。ゲーム内の役割は史実の経歴と異なる場合があります。';
  profile.append(dl,note);card.append(summary,profile);grid.append(card);row.element=card;
 }
 const notice=main.querySelector('.notice');if(notice)notice.remove();
 main.querySelector('h1').textContent='幕末人物コレクション';
 main.querySelector('.eyebrow').textContent='HISTORICAL CHARACTER COLLECTION';
 main.querySelector('.intro').textContent='幕末を生きた104名。対局で駒を取ると人物カードを獲得できます。未完成のカード画像は仮素材で表示します。';
 document.title='人物コレクション｜新選組将棋';
 const panel=document.createElement('section');panel.className='collection-progress';
 panel.innerHTML='<strong id="collectionTotal">0 / 104</strong><div>人物カードを収集中</div><div class="collection-bar" aria-hidden="true"><div id="collectionFill"></div></div><p id="collectionStatus" role="status" aria-live="polite"></p><button type="button" id="resetCollection">収集データをリセット</button>';
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
  return names;
 };
 const viewer=document.createElement('dialog');viewer.className='collection-viewer';
 viewer.innerHTML='<button type="button" class="viewer-close" aria-label="閉じる">×</button><img alt=""><p class="viewer-name"></p>';
 document.body.append(viewer);
 viewer.querySelector('.viewer-close').onclick=()=>viewer.close();
 viewer.onclick=e=>{if(e.target===viewer)viewer.close()};
 function showCard(row){if(!owned().has(row.name))return;viewer.querySelector('img').src=row.art;viewer.querySelector('img').alt=row.name+'の人物カード';viewer.querySelector('.viewer-name').textContent=row.name;viewer.showModal()}
 rows.forEach((row,index)=>{
  const card=row.element;card.dataset.characterIndex=String(index);
  card.dataset.search=[row.name,row.role,...row.chapters].join(' ');
  const heading=card.querySelector('summary h3');heading.dataset.originalName=row.name;
  const portrait=card.querySelector('.portrait');portrait.replaceChildren();
  const img=document.createElement('img');img.loading='lazy';img.alt='';img.width=768;img.height=1152;img.src=row.art;img.onerror=()=>{if(img.src.indexOf('card-back-saccho')<0)img.src=fallback};portrait.append(img);
  const button=document.createElement('button');button.type='button';button.className='view-collection-card';button.textContent='カードを大きく見る';button.onclick=()=>showCard(row);
  card.querySelector('.profile').prepend(button);
  card.addEventListener('toggle',()=>{if(card.classList.contains('locked')&&card.open)card.open=false});
 });
 let filterSide='all';const search=document.getElementById('search'),buttons=Array.from(document.querySelectorAll('[data-filter]'));
 const normalize=value=>value.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g,'');
 function filter(){const query=normalize(search.value);let shown=0;for(const row of rows){const card=row.element;const visible=(filterSide==='all'||row.side===filterSide)&&normalize(card.dataset.search).includes(query);card.hidden=!visible;if(visible)shown++}document.getElementById('count').textContent=shown+'名を表示 ／ 全104名';document.getElementById('empty').hidden=shown>0}
 function refresh(){const found=owned();for(const row of rows){const card=row.element,unlocked=found.has(row.name);card.classList.toggle('unlocked',unlocked);card.classList.toggle('locked',!unlocked);card.querySelector('summary h3').textContent=unlocked?row.name:'未収録';const portrait=card.querySelector('.portrait'),img=portrait.querySelector('img');if(!unlocked){card.open=false;img.hidden=true;portrait.dataset.locked='？'}else{img.hidden=false;delete portrait.dataset.locked}}const total=rows.filter(row=>found.has(row.name)).length;document.getElementById('collectionTotal').textContent=total+' / '+rows.length;document.getElementById('collectionFill').style.width=total/rows.length*100+'%';document.getElementById('collectionStatus').textContent=total===rows.length?'全人物を収集しました！':total===0?'まだ人物を収集していません。対局で駒を取りましょう。':(rows.length-total)+'名が未収録です。';filter()}
 const sides={0:rows.filter(x=>x.side==='0').length,1:rows.filter(x=>x.side==='1').length};
 for(const button of buttons){if(button.dataset.filter==='0')button.textContent='新選組・会津 '+sides[0]+'名';if(button.dataset.filter==='1')button.textContent='その他の人物 '+sides[1]+'名';button.onclick=()=>{filterSide=button.dataset.filter;for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));filter()}}
 search.oninput=filter;
 document.getElementById('resetCollection').onclick=()=>{
  if(!confirm('人物カードの収集記録を消去しますか？ 対局のセーブデータとストーリー進行記録は残り、章クリア特典のカードは再表示されます。'))return;
  for(const key of keys)try{localStorage.removeItem(key)}catch{}
  refresh();
 };
 refresh();
 const localization=document.createElement('script');localization.src='game-language.js';localization.defer=true;document.body.append(localization);
})();
