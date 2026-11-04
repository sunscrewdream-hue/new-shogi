(()=>{
 'use strict';
 const key='shinsengumi-shogi-collection-v1',cards=Array.from(document.querySelectorAll('details.card'));
 const main=document.querySelector('.hero'),oldNotice=main.querySelector('.notice');
 if(oldNotice)oldNotice.remove();
 const h=main.querySelector('h1');h.textContent='幕末人物コレクション';
 main.querySelector('.eyebrow').textContent='HISTORICAL CHARACTER COLLECTION';
 main.querySelector('.intro').textContent='対局で相手の駒を取ると、その人物が図鑑に加わります。手に入れた人物の肖像と略歴を見て、幕末を学びましょう。';
 document.title='人物コレクション｜新選組将棋';
 const panel=document.createElement('section');panel.className='collection-progress';panel.innerHTML='<strong id="collectionTotal">0 / 40</strong><div>人物カードを収集中</div><div class="collection-bar" aria-hidden="true"><div id="collectionFill"></div></div><p id="collectionStatus" role="status" aria-live="polite">捕縛すると人物カードを獲得できます。</p><button type="button" id="resetCollection">収集データをリセット</button>';
 main.append(panel);
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?new Set(v.filter(n=>Number.isInteger(n)&&n>=0&&n<40)):new Set()}catch{return new Set()}};
 const names=cards.map(card=>card.querySelector('summary h3').textContent);
 cards.forEach((card,i)=>{
  card.dataset.characterIndex=String(i);
  const portrait=card.querySelector('.portrait');portrait.textContent='';
  const img=document.createElement('img');img.loading='lazy';img.alt='';img.src='assets/portraits/'+String(i+1).padStart(2,'0')+'.png';
  portrait.append(img);
 });
 const refresh=()=>{
  const owned=read();
  cards.forEach((card,i)=>{
   const unlocked=owned.has(i);card.classList.toggle('unlocked',unlocked);card.classList.toggle('locked',!unlocked);
   const heading=card.querySelector('summary h3');heading.textContent=unlocked?names[i]:'未収録';
   const portrait=card.querySelector('.portrait');portrait.style.removeProperty('color');
   if(!unlocked){card.open=false;portrait.querySelector('img').style.display='none';portrait.textContent='？'}
   else{if(!portrait.querySelector('img')){portrait.textContent='';const img=document.createElement('img');img.src='assets/portraits/'+String(i+1).padStart(2,'0')+'.png';img.loading='lazy';img.alt='';portrait.append(img)};portrait.querySelector('img').style.display='block'}
  });
  document.getElementById('collectionTotal').textContent=owned.size+' / 40';
  document.getElementById('collectionFill').style.width=(owned.size/40*100)+'%';
  document.getElementById('collectionStatus').textContent=owned.size===40?'全人物を収集しました！':owned.size===0?'まだ人物を収集していません。新選組将棋の対局で駒を捕りましょう。':(40-owned.size)+'名が未収録です。';
 };
 cards.forEach(c=>c.addEventListener('toggle',()=>{if(c.classList.contains('locked')&&c.open)c.open=false}));
 document.getElementById('resetCollection').onclick=()=>{
  if(!confirm('獲得した人物カード40名の収集記録を消去しますか？ 対局のセーブデータは消えません。'))return;
  try{localStorage.removeItem(key)}catch{}
  refresh();
 };
 refresh();
})();
