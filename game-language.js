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
  '脱走':'Desertion','粛清':'Purge','寝返り':'Defection','人斬り':'Hitokiri',
  '王を見捨てる（特殊ルール）':'Abandon the King (special rule)',
  'いざ、出陣':'Begin Battle','🔊 タイトルコールを聴く':'🔊 Play Title Call',
  '▶ 続きから':'▶ Continue','📂 保存した対局':'📂 Load Saved Match','⛶ 全画面':'⛶ Fullscreen',
  '新選組将棋の遊び方':'Game Manual',
  '人物コレクション':'Character Collection','新選組の歴史 ›':'History of the Shinsengumi ›',
  '将棋の遊び方 ›':'How to Play Shogi ›','事件札が戦局を変える':'Events Can Turn the Tide',
  '敵軍の持ち駒':'Opponent’s Captured Pieces','あなたの持ち駒':'Your Captured Pieces',
  '先手の持ち駒':'First Player’s Captured Pieces','後手の持ち駒':'Second Player’s Captured Pieces',
  '最初から':'New Game','降参':'Resign','タイトルへ戻る':'Back to Title',
  '将棋の遊び方':'Shogi Rules','🎴 カード演出テスト':'🎴 Test Event Card','🌋 地震演出テスト':'🌋 Test Earthquake',
  '♪ 効果音テスト':'♪ Test Sound','効果音：ON':'SFX: ON','効果音：OFF':'SFX: OFF',
  '⚔ 掛け声：ON':'⚔ Voices: ON','⚔ 掛け声：OFF':'⚔ Voices: OFF',
  '新選組の声':'Shinsengumi Voices','薩長の声':'Satcho Voices',
  '♪ BGM：ON':'♪ Music: ON','♪ BGM：OFF':'♪ Music: OFF',
  '音量':'Volume','💾 対局を保存':'💾 Save Game','⚔ 人斬り覚醒テスト':'⚔ Test Hitokiri Awakening',
  '🩸 斬殺演出テスト':'🩸 Test Hitokiri Strike','🏃 寝返りアニメテスト':'🏃 Test Defection Animation','もう一局！':'Play Again!',
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
  '全人物を収集しました！':'All 104 characters collected!',
  'まだ人物を収集していません。新選組将棋の対局で駒を捕りましょう。':'No cards yet. Capture an enemy piece in Shinsengumi Shogi.',
  '対局で相手の駒を取ると、その人物が図鑑に加わります。手に入れた人物の肖像と略歴を見て、幕末を学びましょう。':'Capture enemy pieces to collect historical characters and learn about the Bakumatsu era.',
  '🎴 人物カード獲得：':'🎴 Character Card Unlocked: ',
  '人斬り覚醒':'Hitokiri Awakening','斬殺！':'Fatal Strike!',
  '新選組、出陣を待つ':'Shinsengumi ready for battle','薩長同盟、出陣を待つ':'Satcho Alliance ready for battle',
  '新選組':'Shinsengumi','新撰組':'Shinsengumi','薩長同盟':'Satcho Alliance','敵陣':'Opposing Side',
  '敵軍':'Enemy','王手':'Check','思考中':'Thinking','手番':'Turn',
  '何事もなし':'No Incident','大地震':'Earthquake','捕縛':'Captured',
  '人斬り':'Hitokiri','斬殺':'Fatal Strike','主君討死':'Lord Fallen',
  '詰み':'Checkmate','降参':'Resignation',
  '通常対局':'Regular Match','ストーリーモード':'Story Mode','幕末物語':'Bakumatsu Story',
  '人物図鑑':'Character Collection','遊び方':'How to Play','将棋の基本':'Shogi Basics',
  '誠の軌跡':'Path of Makoto','物語選択へ戻る':'Back to Chapters',
  '章選択へ':'Chapters','操作・ルール':'Controls & Rules','降参する':'Resign',
  '敵陣の持ち駒':'Opponent’s Captured Pieces','新選組の持ち駒（タップで駒打ち）':'Shinsengumi Hand (tap to drop)',
  '📂 保存した対局から再開':'📂 Resume Saved Match','📂 保存した対局':'📂 Load Saved Match',
  '💾 対局を保存':'💾 Save Match','🛠 開発テスト：全章を表示':'🛠 Test: Show All Chapters',
  '🛠 開発テスト・対局管理':'🛠 Development Tools','🎴 カード演出テスト':'🎴 Test Event Card',
  '🏇 御陵衛士・伏兵テスト':'🏇 Test Ambush','🏇 寝返り':'🏇 Defection',
  '🏃 脱走':'🏃 Desertion','⚔ 粛清':'⚔ Purge','🩸 斬撃・斬殺':'🩸 Fatal Strike',
  '🔥 人斬り覚醒':'🔥 Hitokiri Awakening','💥 大砲２発':'💥 Two Cannon Shots',
  '🔫 鉄砲':'🔫 Rifle','🏳 手番画像':'🏳 Turn Animation',
  '🏆 自軍勝利演出':'🏆 Test Victory','💀 敵軍勝利演出':'💀 Test Defeat',
  '全4章':'Four Chapters','第1章':'Chapter 1','第2章':'Chapter 2','第3章':'Chapter 3','第4章':'Chapter 4',
  '池田屋事件':'Ikedaya Incident','禁門の変':'Kinmon Incident','油小路事件':'Aburanokoji Incident',
  '鳥羽・伏見の戦い':'Battle of Toba–Fushimi','語り':'Narration',
  '次のページ':'Next Page','前のページ':'Previous Page',
  '再挑戦':'Try Again','閉じる':'Close','章選択':'Chapter Select',
  '大砲':'Cannon','鉄砲':'Rifle','援軍':'Reinforcements',
  '幕末人物コレクション':'Bakumatsu Character Collection',
  '援軍の配置に失敗':'Could Not Place Reinforcements',
  '布陣を整えられません':'Unable to Set Up Formation',
  '御陵衛士、伏兵出現！':'Imperial Tomb Guards: Ambush!',
  '引き分け':'Draw','対局を中断しますか？':'Leave This Match?',
  '降参しますか？':'Do You Want to Resign?',
  'テストできる駒がありません':'No Pieces Available for This Test',
  '新選組、援軍到着！':'Shinsengumi Reinforcements Arrive!',
  '援軍四騎、盤上に到着！':'Four Reinforcements Have Arrived!',
  '薩摩藩、援軍到着！':'Satsuma Reinforcements Arrive!',
  '薩摩の援軍三騎、盤上に到着！':'Three Satsuma Reinforcements Have Arrived!',
  '援軍！ 離脱していた隊士が戻る！':'Reinforcements! A Departed Soldier Returns!',
  '援軍！ 隊士が持ち駒に復帰した！':'Reinforcements! A Soldier Returns to Your Hand!',
  '伊東甲子太郎、斬殺！':'Itō Kashitarō Falls!',
  '伊東甲子太郎「鉄砲！」':'Itō Kashitarō: “Fire!”',
  '伊東甲子太郎「無念！」 指す手なし、パス':'Itō Kashitarō: “How bitter!” No legal move; turn passed.',
  '所属':'Affiliation','役職・立場':'Role','生没年':'Born–Died',
  '史実上の注意':'Historical Note','主な典拠を読む ↗':'View Primary Source ↗',
  '略歴を読む ＋':'Read Biography +','略歴を閉じる −':'Close Biography −',
  '序章':'Prologue','終章':'Epilogue','壬生の誓い':'The Oath at Mibu',
  '誠の行方':'The Fate of Sincerity','物語のみ':'Story Only',
  '突破':'Cleared','出陣可能':'Ready to Play','再挑戦可能':'Replay Available',
  '前の章を突破すると開放':'Clear the Previous Chapter to Unlock',
  '開発用プレビュー（記録しません）':'Development Preview (Not Saved)',
  '王将コレクション':'King Collection','未解放の人物カード':'Character Card Not Yet Unlocked',
  '尊王攘夷派・池田屋事件':'Loyalist Activist — Ikedaya Incident',
  '長州藩・禁門の変':'Chōshū — Kinmon Incident',
  '御陵衛士・油小路事件':'Imperial Tomb Guards — Aburanokōji Incident',
  '薩摩藩・鳥羽伏見の戦い':'Satsuma — Battle of Toba–Fushimi',
  '肥後出身の尊攘派志士。池田屋事件で命を落とした。':'A loyalist activist from Higo who died in the Ikedaya Incident.',
  '吉田松陰に学んだ長州藩士。禁門の変で自刃した。':'A Chōshū samurai who studied under Yoshida Shōin and died by suicide during the Kinmon Incident.',
  '新選組を離れて御陵衛士を結成。油小路事件で暗殺された。':'He left the Shinsengumi to form the Imperial Tomb Guards and was assassinated during the Aburanokōji Incident.',
  '新政府側の有力指導者。ゲーム上の最終章王将。':'An influential leader of the new government forces and the final opposing king in this game.',
  '志を胸に、時代を駆ける。':'Carry your convictions through a turbulent age.',
  '史実をたどりながら、盤上で新選組を指揮せよ。':'Follow history and lead the Shinsengumi on the board.',
  '史実に基づく物語ですが、対局・勝敗・駒の配置はゲーム独自の演出です。':'Inspired by history; battles, outcomes, and piece positions are fictional game elements.',
  '対局を進めずに演出を確認できます。事件札・兵器のテストは局面が変化する場合があります。':'Preview effects without taking turns. Event-card and weapon tests may alter the board.',
  'テスト中：全章・終章に直接移動できます。クリア・人物獲得は保存しません。':'Test mode: all chapters and the epilogue are available. Clears and cards are not saved.'
 };
 const exact=new Map(Object.entries(strings));
 const replacements=[
  [/🎴\s*事件札が出現！/g,'🎴 Event card is ready!'],
  [/あなたの手番/g,'Your Turn'],
  [/先手の番/g,'First Player’s Turn'],[/後手の番/g,'Second Player’s Turn'],
  [/先手の手番/g,'First Player’s Turn'],[/後手の手番/g,'Second Player’s Turn'],
  [/先手/g,'First Player'],[/後手/g,'Second Player'],
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
  [/（\d+\/104）/g,m=>m.replace('（','(').replace('）',')')],
  [/(\d+)名が未収録です。/g,(_,n)=>n+' characters remaining.'],
  [/（(\d+)\/104）/g,'($1/104)'],
  [/敵陣/g,'Opposing Side'],
  [/人物図鑑/g,'Character Collection'],[/遊び方/g,'How to Play'],
  [/将棋の基本/g,'Shogi Basics'],[/新選組の歴史/g,'Shinsengumi History'],
  [/誠の軌跡/g,'Path of Makoto'],[/幕末物語/g,'Bakumatsu Story'],
  [/降参する/g,'Resign'],[/章選択へ/g,'Chapters'],
  [/人物カード獲得！/g,'Character Card Unlocked!'],
  [/第(\d+)章/g,'Chapter $1'],
  [/序章/g,'Prologue'],[/終章/g,'Epilogue'],[/突破/g,'Cleared'],
  [/([0-9]+)×([0-9]+)盤/g,'$1×$2 Board'],
  [/第([一二三四1234])章/g,(_,n)=>'Chapter '+({'一':1,'二':2,'三':3,'四':4}[n]||n)],
  [/元治元年/g,'1864 (Genji 1)'],[/慶応三年/g,'1867 (Keiō 3)'],[/慶応四年/g,'1868 (Keiō 4)'],
  [/新選組の持ち駒/g,'Shinsengumi Hand'],[/の持ち駒/g,' Hand'],
  [/池田屋事件/g,'Ikedaya Incident'],[/禁門の変/g,'Kinmon Incident'],
  [/油小路事件/g,'Aburanokoji Incident'],[/鳥羽・伏見の戦い/g,'Battle of Toba–Fushimi'],
  [/【王手】/g,'[CHECK]'],[/　🤔 思考中…/g,' 🤔 Thinking…'],
  [/の手番/g,' Turn'],[/札まで(\d+)手/g,'card in $1 moves'],
  [/人斬り覚醒/g,'HITOKIRI AWAKENING'],[/人斬り・斬殺/g,'HITOKIRI STRIKE'],
  [/地震の穴が塞がった！/g,'The earthquake holes have closed!'],
  [/新選組/g,'Shinsengumi'],[/新撰組/g,'Shinsengumi'],[/薩長同盟/g,'Satcho Alliance'],
  [/敵軍/g,'Enemy'],[/王手/g,'Check'],[/の勝利！/g,' wins!'],
  [/対局を保存しました/g,'Match saved'],[/保存した対局を再開しました/g,'Match resumed'],
  [/を獲得/g,' unlocked'],[/人物カード獲得：/g,'Character Card: '],
  [/事件札/g,'Event Card'],[/脱走/g,'Desertion'],[/粛清/g,'Purge'],[/寝返り/g,'Defection'],
  [/大地震/g,'Earthquake'],[/何事もなし/g,'No Incident'],[/：/g,': ']
 ];
 const known=new WeakMap();
 const targets=['#titleSub','#titleFoot','#modeAi','#modeLocal','#difficultyPicker label','#ruleModePicker label','#rulePreset option','#aiLevel option','#customRules legend','#customRules label','#startGame','#titleSoundReplay','#titleLinks a','#titleExtras button','#titleModeActions a','#titleModeActions small','#titleModeActions .modeCaption','#enemyHandLabel','#playerHandShell .hand-label','#status','#cardCountdown','#checkHint','#quakeHoleHint','#enemyBannerStatus','#playerBannerStatus','#enemyBannerVoice','#playerBannerVoice','#event','#endText','#endSurrender','#endActions button','#promotionPanel h2','#promotionPanel p','#promotionActions button','#cardTitle','#cardDetail','#cardEffectText','#cardPrompt','#cardCloseHint','#resetCollection','#collectionStatus','#collectionTotal','#collectionProgress','#collectionTotal + div','.hero h1','.hero .intro','.collection-progress > div','#abandonPanel h2','#abandonPanel p','#abandonNo','#abandonYes','#quickSave','#hitokiriTestTools button','.special-debug','body > button','#sfxToggle','#voiceToggle','#bgmToggle','.game-menu-link'];
 function english(text){const raw=text.trim();if(exact.has(raw))return exact.get(raw);let out=text;for(const [pattern,replacement] of replacements)out=out.replace(pattern,replacement);return out;}
 function translateNode(node){
  if(!node||!node.isConnected||node.closest('.shogi-token, #board, .profile, .tag, .role, .portrait, .hand, #titleMain'))return;
  const text=node.textContent;const prev=known.get(node);
  if(lang==='ja'){
   if(prev&&text===prev.en&&text!==prev.ja)node.textContent=prev.ja;
   return;
  }
  if(!text||!/[\u3040-\u30ff\u3400-\u9fff]/.test(text))return;
  const en=english(text);if(en===text||/[\u3040-\u30ff\u3400-\u9fff]/.test(en))return;
  known.set(node,{ja:text,en});node.textContent=en;
 }
 let syncing=false,scheduled=false;
 function translateVisibleText(){
  const roots=['#titleScreen','#storyHome','#storyDialogue','#storyBattle','#storyPopup','#storyEndOverlay','#main','body > header','.page-nav'];
  for(const selector of roots)for(const root of document.querySelectorAll(selector)){
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   let node;
   while((node=walker.nextNode())){
    const host=node.parentElement;if(!host||host.closest('script,style,svg,.shogi-token,#board,#storyBoard,.portrait,.profile,.card,.notice,.caution,.hand,.story-hand,.language-toggle'))continue;
    const previous=known.get(node);
    if(lang==='ja'){
     if(previous&&node.data===previous.en)node.data=previous.ja;
    }else if(/[\u3040-\u30ff\u3400-\u9fff]/.test(node.data)){
     const en=english(node.data);if(en!==node.data&&!/[\u3040-\u30ff\u3400-\u9fff]/.test(en)){known.set(node,{ja:node.data,en});node.data=en;}
    }
   }
  }
 }
 function refresh(){if(syncing)return;syncing=true;
  const list=new Set();for(const selector of targets)for(const node of document.querySelectorAll(selector))list.add(node);
  for(const node of list){
   if(node.matches('#customRules label')){
    for(const child of node.childNodes)if(child.nodeType===3){const prev=known.get(child);if(lang==='ja'&&prev&&child.data===prev.en){child.data=prev.ja;}else if(lang==='en'&&/[\u3040-\u30ff\u3400-\u9fff]/.test(child.data)){const en=english(child.data);known.set(child,{ja:child.data,en});child.data=en;}}
   }else if(node.children.length===0||node.matches('button,option,legend,#titleLinks a,summary .open-hint,#titleSub,#titleFoot,#cardDetail,#cardEffectText,#cardPrompt,#cardCloseHint,#checkHint,#status,#event,#cardCountdown,#collectionStatus,.intro'))translateNode(node);
  }
  if(lang==='ja')for(const node of document.querySelectorAll('[data-ui-ja]')){node.textContent=node.dataset.uiJa;delete node.dataset.uiJa}
  translateVisibleText();document.documentElement.lang=lang;syncing=false;
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
 function setLang(next){
  const selected=next==='en'?'en':'ja',changed=selected!==lang;
  lang=selected;try{localStorage.setItem(STORAGE,lang)}catch{}
  // Story narration is localized before battle initialization, so re-create that view.
  if(changed&&$('storyHome')){window.location.reload();return;}
  for(const node of document.querySelectorAll('[data-ui-ja]')){node.textContent=node.dataset.uiJa;delete node.dataset.uiJa}
  for(const anchor of document.querySelectorAll('a[href="manual.html"],a[href="manual-en.html"]'))anchor.href=lang==='en'?'manual-en.html':'manual.html';
  refresh();for(const button of document.querySelectorAll('.language-toggle'))button.textContent=lang==='en'?'Language: English → 日本語':'表示言語：日本語 → English';
 }
 const parent=$('titleExtras')||$('quickSave')||document.querySelector('.story-hero,.hero');
 if(parent){
  const btn=document.createElement('button');btn.type='button';btn.className='language-toggle';
  btn.title='Switch interface language';btn.onclick=()=>setLang(lang==='en'?'ja':'en');
  parent.append(btn);
 }
 if(document.querySelector('.language-toggle')){
  const style=document.createElement('style');style.textContent='.language-toggle{display:inline-block;margin:8px auto;padding:8px 15px;min-height:38px;border:1px solid #a88b61;border-radius:7px;background:#233b49;color:#fff1d4;font:700 13px/1.3 system-ui,sans-serif;cursor:pointer}.language-toggle:focus-visible{outline:3px solid #e6b756;outline-offset:2px}';document.head.append(style);
 }
 const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 setLang(lang);
 window.setShinsengumiLanguage=setLang;
})();
