/* One presentation, two independent save formats and storage namespaces. */
(()=>{
 'use strict';
 const adapters=new Map(),COUNT=6;
 const disclaimer='対局の記録は、ご利用の端末・ブラウザ内に保存されます。ブラウザの履歴・サイトデータの削除、端末の変更、その他の環境によって、記録が消失する場合があります。セーブデータの保存・復元は保証いたしかねます。あらかじめご了承ください。';
 const key=mode=>'shinsengumi-save-slots-'+mode+'-v1';
 const read=mode=>{try{const found=JSON.parse(localStorage.getItem(key(mode))||'[]');return Array.isArray(found)?Array.from({length:COUNT},(_,i)=>found[i]||null):Array(COUNT).fill(null)}catch{return Array(COUNT).fill(null)}};
 const write=(mode,slots)=>{localStorage.setItem(key(mode),JSON.stringify(slots));localStorage.setItem(key(mode)+'-legacy-imported','1');};
 const valid=mode=>data=>mode==='normal'?data?.version===1&&Array.isArray(data.b)&&data.b.length===9:data?.version===1&&Number.isInteger(data.stage)&&data.engine&&Array.isArray(data.engine.board);
 function migrate(mode,adapter){
  const slots=read(mode);
  if(slots.some(Boolean))return slots;
  try{if(localStorage.getItem(key(mode)+'-legacy-imported'))return slots}catch{}
  let i=0;
  for(const legacyKey of adapter.legacyKeys||[]){
   try{
    const data=JSON.parse(localStorage.getItem(legacyKey)||'null');
    if(!valid(mode)(data))continue;
    slots[i++]={savedAt:data.date||data.at||Date.now(),data,legacy:true};
    if(i>=COUNT)break;
   }catch{}
  }
  try{write(mode,slots)}catch{}
  return slots;
 }
 function boardData(mode,data){return mode==='normal'?data?.b:data?.engine?.board}
 function renderBoard(canvas,mode,data){
  const board=boardData(mode,data),ctx=canvas.getContext('2d');
  if(!ctx)return;
  const w=canvas.width=160,h=canvas.height=160;
  ctx.fillStyle='#d8b785';ctx.fillRect(0,0,w,h);
  if(!Array.isArray(board)||!board.length)return;
  const rows=board.length,cols=board[0]?.length||rows,cell=Math.min(144/cols,144/rows);
  const left=(w-cols*cell)/2,top=(h-rows*cell)/2;
  ctx.strokeStyle='#805c34';ctx.lineWidth=.65;
  for(let y=0;y<=rows;y++){ctx.beginPath();ctx.moveTo(left,top+y*cell);ctx.lineTo(left+cols*cell,top+y*cell);ctx.stroke()}
  for(let x=0;x<=cols;x++){ctx.beginPath();ctx.moveTo(left+x*cell,top);ctx.lineTo(left+x*cell,top+rows*cell);ctx.stroke()}
  ctx.fillStyle='#352719';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.max(7,Math.min(15,cell*.66))+'px serif';
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const p=board[y]?.[x];if(!p?.t)continue;
   ctx.save();ctx.translate(left+(x+.5)*cell,top+(y+.5)*cell);
   if(p.s===1)ctx.rotate(Math.PI);
   ctx.fillText(String(p.p?'成':p.t).slice(0,1),0,0);ctx.restore();
  }
 }
 let dialog,heading,list,status;
 function ensure(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.id='saveSlotsDialog';dialog.className='save-slots-dialog';
  dialog.innerHTML='<div class="save-slots-head"><h2 id="saveSlotsHeading">対局の記録</h2><button type="button" class="save-slots-close" aria-label="閉じる">×</button></div><div class="save-slots-body"><p id="saveSlotsStatus" role="status" aria-live="polite"></p><div id="saveSlotsList"></div><p class="save-slots-disclaimer"></p></div>';
  dialog.setAttribute('aria-labelledby','saveSlotsHeading');
  heading=dialog.querySelector('#saveSlotsHeading');list=dialog.querySelector('#saveSlotsList');status=dialog.querySelector('#saveSlotsStatus');
  dialog.querySelector('.save-slots-disclaimer').textContent=disclaimer;
  dialog.querySelector('.save-slots-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  document.body.append(dialog);
 }
 function metadata(mode,slot,adapter){
  const data=slot.data;
  return {title:adapter.describe(data),ply:mode==='normal'?data.ply:data.engine?.ply,side:mode==='normal'?data.turn:data.engine?.side};
 }
 function open(mode,action='load'){
  const adapter=adapters.get(mode);if(!adapter)return;
  ensure();heading.textContent=(mode==='normal'?'通常対局':'幕末物語')+'の記録';
  const slots=migrate(mode,adapter);status.textContent=action==='save'?'保存する場所を選んでください。':'再開する記録を選んでください。';
  list.replaceChildren();
  const refresh=()=>{dialog.close();open(mode,action)};
  slots.forEach((slot,i)=>{
   const card=document.createElement('section');card.className='save-slot';
   const preview=document.createElement('canvas');preview.className='save-slot-preview';preview.setAttribute('aria-label','保存時の盤面');
   const info=document.createElement('div');info.className='save-slot-info';
   const title=document.createElement('strong');title.textContent='記録 '+(i+1)+'　'+(slot?metadata(mode,slot,adapter).title:'空きスロット');
   const details=document.createElement('small');
   if(slot){
    const meta=metadata(mode,slot,adapter);
    details.textContent=new Date(slot.savedAt).toLocaleString('ja-JP')+' ／ '+(Number(meta.ply)||0)+'手目 ／ '+(meta.side===0?'新選組':'敵陣')+'の手番';
    renderBoard(preview,mode,slot.data);
   }else{details.textContent='まだ保存されていません';preview.classList.add('empty')}
   info.append(title,details);
   const buttons=document.createElement('div');buttons.className='save-slot-buttons';
   const add=(label,handler)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=handler;buttons.append(b)};
   if(action==='save')add(slot?'上書き保存':'ここに保存',()=>{
    if(slot&&!confirm('記録 '+(i+1)+' を上書きしますか？'))return;
    let data;try{data=adapter.capture()}catch(e){alert('保存できませんでした。'+(e?.message||''));return}
    if(!data){alert('演出が終了してから保存してください。');return}
    const next=read(mode);next[i]={savedAt:Date.now(),data};
    try{write(mode,next);adapter.afterSave?.();refresh();status.textContent='記録 '+(i+1)+' に保存しました。'}catch{alert('保存容量などの理由で保存できませんでした。')}
   });
   if(slot){
    add('再開',()=>{
     if(!adapter.restore(slot.data))return;
     dialog.close();
    });
    add('削除',()=>{if(!confirm('記録 '+(i+1)+' を削除しますか？'))return;const next=read(mode);next[i]=null;try{write(mode,next);refresh()}catch{alert('削除できませんでした。')}});
   }
   card.append(preview,info,buttons);list.append(card);
  });
  if(!dialog.open)dialog.showModal();
 }
 window.ShinsengumiSaveSlots={register:(mode,adapter)=>adapters.set(mode,adapter),open,hasSaves:mode=>read(mode).some(Boolean)};
})();
