/* English UI for players who already know shogi. Pieces, artwork and voices stay Japanese. */
(()=>{
 'use strict';
 const STORAGE='shinsengumi-shogi-language-v1';
 let lang=localStorage.getItem(STORAGE)==='en'?'en':'ja';
 const $=id=>document.getElementById(id);
 const strings={
  '幕末動乱・盤上決戦':'SHOGI IN THE TURBULENT BAKUMATSU ERA',
  '⚔ AI対戦':'⚔ Play vs AI','⚔ 二人対戦':'⚔ Two Players',
  'AIの強さ':'AI Difficulty','初級':'Beginner','中級（標準）':'Intermediate (default)','上級':'Advanced',
  '対局ルール':'Game Rules','新選組将棋（全要素ON・推奨）':'Shinsengumi Shogi (All Events — Recommended)',
  'カスタム対局':'Custom Rules','通常将棋':'Standard Shogi',
  '特殊ルール設定':'Special Rules','事件札':'Event Cards','地震と穴':'Earthquakes & Holes',
  '脱走':'Desertion','粛清':'Purge','援軍':'Reinforcements','人斬り':'Hitokiri',
  '王を見捨てる（特殊ルール）':'Abandon the King (special rule)',
  'いざ、出陣':'Begin Battle','🔊 タイトルコールを聴く':'🔊 Play Title Call',
  '▶ 続きから':'▶ Continue','📂 保存した対局':'📂 Load Saved Match','⛶ 全画面':'⛶ Fullscreen',
  '📜 新選組将棋の遊び方 ›':'📜 Game Manual ›',
  '人物コレクション ›':'Character Collection ›','新選組の歴史 ›':'History of the Shinsengumi ›',
  '将棋の遊び方 ›':'How to Play Shogi ›','事件札が戦局を変える':'Events Can Turn the Tide',
  '敵軍の持ち駒':'Opponent’s Captured Pieces','あなたの持ち駒':'Your Captured Pieces',
  '最初から':'New Game','降参':'Resign','タイトルへ戻る':'Back to Title',
  '将棋の遊び方':'Shogi Rules','🎴 カード演出テスト':'🎴 Test Event Card','🌋 地震演出テスト':'🌋 Test Earthquake',
  '♪ 効果音テスト':'♪ Test Sound','効果音：ON':'SFX: ON','効果音：OFF':'SFX: OFF',
  '⚔ 掛け声：ON':'⚔ Voices: ON','⚔ 掛け声：OFF':'⚔ Voices: OFF',
  '新選組の声':'Shinsengumi Voices','薩長の声':'Satcho Voices',
  '♪ BGM：ON':'♪ Music: ON','♪ BGM：OFF':'♪ Music: OFF',
  '音量':'Volume','💾 対局を保存':'💾 Save Game','⚔ 人斬り覚醒テスト':'⚔ Test Hitokiri Awakening',
  '🩸 斬殺演出テスト':'🩸 Test Hitokiri Strike','🏃 援軍アニメテスト':'🏃 Test Reinforcement Animation','もう一局！':'Play Again!',
  '勝負あった！':'Victory Decided!','成るか、成らぬか':'Promote This Piece?',
  '駒を成り駒に変化させますか？':'Would you like to promote your piece?',
  '成る！':'Promote','成らぬ':'Do Not Promote',
  '事件札をめくる':'Reveal Event Card','局中に何が起こるか…':'What will fate bring?',
  'もう一度タップして閉じる':'Tap again to close','カードをタップしてめくる':'Tap the Card to Reveal',
  '主君を見捨てるのか！':'Abandon Your Lord?!','忠義を尽くす':'Defend Your Lord','覚悟して指す':'Accept the Risk',
  '王手を防がず別の手を指します。次の一手で王を討ち取られ、敗北する危険があります。':'This move does not stop check. Your king could be captured on the next turn, resulting in defeat.',
  '未収録':'Not Collected','略歴を読む ＋':'Read Biography +',
  '幕末人物コレクション':'Bakumatsu Character Collection',
  '収集データをリセット':'Reset Collection','人物カードを収集中':'Character Cards Collected',
  '捕縛すると人物カードを獲得できます。':'Capture an enemy piece to earn its character card.',
  '全人物を収集しました！':'All 40 characters collected!',
  'まだ人物を収集していません。新選組将棋の対局で駒を捕りましょう。':'No cards yet. Capture an enemy piece in Shinsengumi Shogi.',
  '対局で相手の駒を取ると、その人物が図鑑に加わります。手に入れた人物の肖像と略歴を見て、幕末を学びましょう。':'Capture enemy pieces to collect historical characters and learn about the Bakumatsu era.',
  '🎴 人物カード獲得：':'🎴 Character Card Unlocked: ',
  '人斬り覚醒':'Hitokiri Awakening','斬殺！':'Fatal Strike!',
  '新選組、出陣を待つ':'Shinsengumi ready for battle','薩長同盟、出陣を待つ':'Satcho Alliance ready for battle',
  '新選組':'Shinsengumi','新撰組':'Shinsengumi','薩長同盟':'Satcho Alliance',
  '敵軍':'Enemy','王手':'Check','思考中':'Thinking','手番':'Turn',
  '何事もなし':'No Incident','大地震':'Earthquake','捕縛':'Captured',
  '人斬り':'Hitokiri','斬殺':'Fatal Strike','主君討死':'Lord Fallen',
  '詰み':'Checkmate','降参':'Resignation'
 };
 const exact=new Map(Object.entries(strings));
 const replacements=[
  [/🎴\s*事件札が出現！/g,'🎴 Event card is ready!'],
  [/あなたの手番/g,'Your Turn'],
  [/敵軍の手番/g,"Opponent's Turn"],
  [/薩長同盟の手番/g,"Satcho Alliance's Turn"],
  [/薩長の手番/g,"Satcho's Turn"],
  [/新選組の手番/g,"Shinsengumi's Turn"],
  [/新撰組の手番/g,"Shinsengumi's Turn"],
  [/敵軍、思案中…/g,'Opponent is thinking…'],
  [/王手！ 防御してください/g,'Check! Defend your king.'],
  [/⚠ 王手！ 王の移動・攻め駒の捕獲・合駒で防いでください。/g,'⚠ Check! Move your king, capture the attacker, or block the attack.'],
  [/⚠ 王手！ 防ぐか、覚悟して主君を見捨てる手も選べます。/g,'⚠ Check! You can defend your king or choose to abandon your lord.'],
  [/事件発生中…/g,'Event in progress…'],
  [/事件札を確認中/g,'Event card being revealed'],
  [/勝負あり/g,'Match Over'],
  [/（\d+\/40）/g,m=>m.replace('（','(').replace('）',')')],
  [/(\d+)名が未収録です。/g,(_,n)=>n+' characters remaining.'],
  [/（(\d+)\/40）/g,'($1/40)'],
  [/【王手】/g,'[CHECK]'],[/　🤔 思考中…/g,' 🤔 Thinking…'],
  [/の手番/g,' Turn'],[/札まで(\d+)手/g,'card in $1 moves'],
  [/人斬り覚醒/g,'HITOKIRI AWAKENING'],[/人斬り・斬殺/g,'HITOKIRI STRIKE'],
  [/地震の穴が塞がった！/g,'The earthquake holes have closed!'],
  [/新選組/g,'Shinsengumi'],[/新撰組/g,'Shinsengumi'],[/薩長同盟/g,'Satcho Alliance'],
  [/敵軍/g,'Enemy'],[/王手/g,'Check'],[/の勝利！/g,' wins!'],
  [/対局を保存しました/g,'Match saved'],[/保存した対局を再開しました/g,'Match resumed'],
  [/を獲得/g,' unlocked'],[/人物カード獲得：/g,'Character Card: '],
  [/事件札/g,'Event Card'],[/脱走/g,'Desertion'],[/粛清/g,'Purge'],[/援軍/g,'Reinforcements'],
  [/大地震/g,'Earthquake'],[/何事もなし/g,'No Incident'],[/：/g,': ']
 ];
 const known=new WeakMap();
 const targets=['#titleSub','#titleFoot','#modeAi','#modeLocal','#difficultyPicker label','#ruleModePicker label','#rulePreset option','#aiLevel option','#customRules legend','#customRules label','#startGame','#titleSoundReplay','#titleLinks a','#titleExtras button','#enemyHandLabel','#playerHandShell .hand-label','#status','#cardCountdown','#checkHint','#quakeHoleHint','#enemyBannerStatus','#playerBannerStatus','#enemyBannerVoice','#playerBannerVoice','#event','#endText','#endSurrender','#endActions button','#promotionPanel h2','#promotionPanel p','#promotionActions button','#cardTitle','#cardDetail','#cardEffectText','#cardPrompt','#cardCloseHint','#resetCollection','#collectionStatus','#collectionTotal','#collectionProgress','#collectionTotal + div','.hero h1','.hero .intro','.collection-progress > div','#abandonPanel h2','#abandonPanel p','#abandonNo','#abandonYes','#quickSave','#hitokiriTestTools button','.special-debug','body > button','#sfxToggle','#voiceToggle','#bgmToggle','.game-menu-link'];
 function english(text){const raw=text.trim();if(exact.has(raw))return exact.get(raw);let out=text;for(const [pattern,replacement] of replacements)out=out.replace(pattern,replacement);return out;}
 function translateNode(node){
  if(!node||!node.isConnected||node.closest('.shogi-token, #board, .profile, .tag, .role, .portrait, .hand, #titleMain'))return;
  const text=node.textContent;const prev=known.get(node);
  if(lang==='ja'){
   if(prev&&text===prev.en&&text!==prev.ja)node.textContent=prev.ja;
   return;
  }
  if(!text||!/[\u3040-\u30ff\u3400-\u9fff]/.test(text))return;
  const en=english(text);if(en===text)return;
  known.set(node,{ja:text,en});node.textContent=en;
 }
 let syncing=false,scheduled=false;
 function refresh(){if(syncing)return;syncing=true;
  const list=new Set();for(const selector of targets)for(const node of document.querySelectorAll(selector))list.add(node);
  for(const node of list){
   if(node.matches('#customRules label')){
    for(const child of node.childNodes)if(child.nodeType===3){const prev=known.get(child);if(lang==='ja'&&prev&&child.data===prev.en){child.data=prev.ja;}else if(lang==='en'&&/[\u3040-\u30ff\u3400-\u9fff]/.test(child.data)){const en=english(child.data);known.set(child,{ja:child.data,en});child.data=en;}}
   }else if(node.children.length===0||node.matches('button,option,legend,#titleLinks a,summary .open-hint,#titleSub,#titleFoot,#cardDetail,#cardEffectText,#cardPrompt,#cardCloseHint,#checkHint,#status,#event,#cardCountdown,#collectionStatus,.intro'))translateNode(node);
  }
  if(lang==='ja')for(const node of document.querySelectorAll('[data-ui-ja]')){node.textContent=node.dataset.uiJa;delete node.dataset.uiJa}
  document.documentElement.lang=lang;syncing=false;
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
 function setLang(next){
  lang=next==='en'?'en':'ja';try{localStorage.setItem(STORAGE,lang)}catch{}
  for(const node of document.querySelectorAll('[data-ui-ja]')){node.textContent=node.dataset.uiJa;delete node.dataset.uiJa}
  for(const anchor of document.querySelectorAll('a[href="manual.html"],a[href="manual-en.html"]'))anchor.href=lang==='en'?'manual-en.html':'manual.html';
  refresh();for(const button of document.querySelectorAll('.language-toggle'))button.textContent=lang==='en'?'日本語 / EN':'JP / English';
 }
 for(const anchor of ['titleExtras','quickSave']){
  const parent=$(anchor);if(!parent)continue;
  const btn=document.createElement('button');btn.type='button';btn.className='language-toggle';btn.textContent=lang==='en'?'日本語 / EN':'JP / English';btn.title='Switch interface language';btn.onclick=()=>setLang(lang==='en'?'ja':'en');
  if(anchor==='titleExtras')parent.append(btn);else parent.insertAdjacentElement('afterend',btn);
 }
 if(!document.querySelector('.language-toggle')){
  const hero=document.querySelector('.hero');if(hero){const btn=document.createElement('button');btn.type='button';btn.className='language-toggle';btn.textContent=lang==='en'?'日本語 / EN':'JP / English';btn.onclick=()=>setLang(lang==='en'?'ja':'en');hero.append(btn);}
 }
 const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 setLang(lang);
 window.setShinsengumiLanguage=setLang;
})();
