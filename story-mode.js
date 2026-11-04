(function(){
"use strict";
const $=id=>document.getElementById(id),D=window.StoryData;
const SAVE="shinsengumi-story-progress-v2",KINGS="shinsengumi-story-kings-v1",COL="shinsengumi-shogi-collection-v1";
let unlock=0;try{unlock=Math.max(0,Math.min(4,Number(localStorage.getItem(SAVE))||0))}catch(e){}
let stage=-1,dialog=[],at=0,onEnd=null,g=null,selected=null,busy=false,ended=false,epoch=0,enemyTurns=0,weapons=[],soundOff=false,audioContext=null,devPreview=false;
const later=ms=>new Promise(r=>setTimeout(r,ms));
function chooseView(active){["storyHome","storyDialogue","storyBattle"].forEach(id=>$(id).classList.toggle("hidden",id!==active));window.scrollTo(0,0)}
function sfx(t){
 if(soundOff)return;
 if(t==="cannon"||t==="rifle"||t==="blast"){
  window.StoryBgm?.duck();
  const a=new Audio("assets/story/audio/"+t+".mp3");a.volume=t==="cannon"?.75:.67;a.play().catch(()=>{});return;
 }
 if(t==="capture"||t==="win"||t==="loss")window.StoryBgm?.duck();
 const files={move:"assets/audio/sfx/step_soil.mp3",capture:"assets/audio/voice_capture_toraeta.mp3",card:"assets/audio/sfx/card_flip.mp3",win:"assets/audio/voice_shobu_atta.mp3",loss:"assets/audio/voice_loss_munen.mp3"};
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
 restoreStoryHover();window.StoryBgm?.stop();
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
 $("dialogueNext").textContent=at===dialog.length-1?(stage>=0&&stage<4?"出陣する ›":"物語を閉じる"):"続ける ›";
}
function battle(i){
 window.StoryBgm?.play(i===0||i===2?"battle01":"battle02");
 epoch++;stage=i;g=new window.StoryEngine(i);selected=null;busy=false;ended=false;enemyTurns=0;weapons=[];
 const ch=D.chapters[i];$("battleChapter").textContent="第"+(i+1)+"章 ／ "+ch.era;$("battleTitle").textContent=ch.title;
 const board=$("storyBoard");board.dataset.stage=i;board.style.setProperty("--cols",ch.w);board.style.setProperty("--rows",ch.h);
 board.classList.toggle("small-board",ch.w===5);
 document.body.style.backgroundImage="linear-gradient(#101721dd,#071016e0),url('assets/story/"+ch.scene+"-bg.webp'),url('kyoto-autumn.webp')";
 document.body.style.backgroundSize="cover";document.body.style.backgroundAttachment="fixed";
 banner(0,g.king(0));banner(1,g.king(1));chooseView("storyBattle");render();
}
function render(){
 restoreStoryHover();
 if(!g||$("storyBattle").classList.contains("hidden"))return;
 const root=$("storyBoard");root.replaceChildren();
 const legal=!ended&&!busy&&g.side===0?g.legal(0):[];
 const targets=selected?legal.filter(m=>selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x):[];
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
  const p=g.board[y][x],btn=document.createElement("button");btn.type="button";btn.className="sq";btn.setAttribute("role","gridcell");
  btn.setAttribute("aria-label",(y+1)+"段"+(x+1)+"列 "+(p?person(p).name+" "+label(p):"空きマス"));
  if(g.last?.y===y&&g.last.x===x)btn.classList.add("last");
  if(selected&&!selected.drop&&selected.y===y&&selected.x===x)btn.classList.add("selected");
  if(targets.some(m=>m.Y===y&&m.X===x))btn.classList.add(p&&p.s===1?"capture-hint":"hint");
  if(p?.t==="玉"&&g.check(g.board,p.s))btn.classList.add("king-in-check");
  if(p){const token=document.createElement("span");token.className="story-token"+(p.s?" enemy":"")+(p.p?" promoted":"");token.textContent=label(p);token.setAttribute("aria-hidden","true");btn.append(token)}
  btn.onclick=()=>square(y,x);root.append(btn);
 }
 for(const s of [0,1]){
  const hand=$("storyHand"+s);hand.replaceChildren();const groups={};g.hands[s].forEach(p=>groups[p.t]=(groups[p.t]||0)+1);
  if(!g.hands[s].length)hand.textContent="なし";
  for(const t of Object.keys(groups)){const b=document.createElement("button");b.type="button";b.className="story-hand-piece";b.setAttribute("aria-label",(s===0?"自軍":"敵軍")+"の持駒 "+t+" "+groups[t]+"枚");b.disabled=ended||busy||s===1||g.side!==0;
   const token=document.createElement("span");token.className="story-token"+(s===1?" enemy":"");token.textContent=t;token.setAttribute("aria-hidden","true");
   const count=document.createElement("span");count.className="story-hand-count";count.textContent="×"+groups[t];count.setAttribute("aria-hidden","true");b.append(token,count);
   if(s===0&&selected?.drop&&selected.t===t)b.classList.add("selected");b.onclick=()=>{selected={drop:true,t};render()};hand.append(b)}
 }
 $("storyStatus").textContent=ended?"対局終了":busy?"演出・思考中…":g.side?"敵軍、思案中…"+(g.check(g.board,1)?"　⚠王手":""):"新選組の手番！"+(g.check(g.board,0)?"　⚠王手！ 王を守ってください":"");
 $("storyStatus").classList.toggle("check-status",!ended&&g.check(g.board,g.side));
}
function square(y,x){
 if(ended||busy||g.side!==0)return;
 const legal=g.legal(0),p=g.board[y][x];
 if(selected){
  const m=legal.find(m=>m.Y===y&&m.X===x&&(selected.drop?m.drop&&m.t===selected.t:!m.drop&&m.y===selected.y&&m.x===selected.x));
  if(m){
   const unit=m.drop?g.hands[0].find(v=>v.t===m.t):g.board[m.y][m.x];
   if(!m.drop&&g.promoted(unit,m.y,m.Y)&&!g.forced(unit,m.Y)){
    popup("成るか、成らぬか","この駒を成り駒にしますか？",[["成る",()=>makeMove(m,true)],["成らぬ",()=>makeMove(m,false)]]);return;
   }makeMove(m,false);return;
  }
 }
 if(p?.s===1){banner(1,p);return}
 selected=p?.s===0?{y,x}:null;render();if(p)banner(p.s,p);
}
function makeMove(m,prom){
 const actor=g.side,{unit,captured}=g.move(m,prom);
 if(captured){sfx("capture");if(actor===0)collect(captured);banner(1-actor,captured)}else sfx("move");
 if(unit)banner(actor,unit);selected=null;render();const result=g.state();
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
 if(ended)return;epoch++;ended=true;busy=false;render();if(winner===-1){popup("引き分け","対局は引き分けです。再挑戦できます。",[["再挑戦",()=>battle(stage)],["章選択",screenHome]]);return}const win=winner===0,ch=D.chapters[stage],king=ch.king;
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
$("dialogueNext").onclick=()=>{at++;line()};
$("battleQuit").onclick=leave;
$("storyResign").onclick=()=>popup("降参しますか？","まだこの章は突破していません。",[["降参する",()=>finish(1,"降参")],["続ける",()=>{}]]);
$("storyRules").onclick=()=>popup("操作・ルール","駒をタップし、緑色の移動先をタップします。\n持ち駒は下欄から選択。二歩・王手放置・行き所のない駒打ちは禁止です。\n鳥羽・伏見では敵軍が大砲と鉄砲を各1回使用します。", [["閉じる",()=>{}]]);
$("audioToggle").onclick=()=>{window.StoryBgm?.unlock();soundOff=!soundOff;window.StoryBgm?.setMuted(soundOff);$("audioToggle").textContent=soundOff?"♪ 音 OFF":"♪ 音 ON";$("audioToggle").setAttribute("aria-pressed",String(!soundOff))};
screenHome();
})();