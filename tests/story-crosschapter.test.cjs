// Run: node tests/story-crosschapter.test.cjs
// Regression guard: every story battle must share the established event flow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'story-mode.js'), 'utf8');
const storyHtml=fs.readFileSync(path.join(root,'story-mode.html'),'utf8');
for(const id of ['debugCard','debugQuake','debugReinforce','debugRevival','debugDesert','debugPurge','debugKill','debugAwaken','debugCannon','debugRifle','debugTurn','debugFx','debugVoice0','debugVoice1']){
 assert.match(storyHtml,new RegExp(`id="${id}"`),`Missing story debug button: ${id}`);
 assert.ok(source.includes(`$("${id}").onclick`),`Debug button has no handler: ${id}`);
}
assert.match(source,/if\(win&&!devPreview&&!debugModified\)/,'Debug-driven game results must not unlock chapters');
assert.match(source,/if\(devPreview\|\|debugModified\|\|!p/,'Debug-driven captures must not grant collection cards');
assert.match(source, /function compactMode\(\)\{return stage>=0&&stage<D\.chapters\.length\}/,
  'Do not silently restrict story events to the 5x6 chapters again');
for (const token of ['compactCardStart(actor)', 'compactIntro()', 'compactCalligraphy(false)',
  'animateCompactEscort(actor', 'compactTurn(side', 'compactCheckSources()']) {
  assert.ok(source.includes(token), `Missing shared story trigger: ${token}`);
}
const turnNotice = source.match(/function compactTurn\(side,after,opening=false\)\{([\s\S]*?)\n\}/)?.[1];
assert.ok(turnNotice, 'Turn notice routine not found');
assert.doesNotMatch(turnNotice, /compactSound\("check"\)/,
  'Check must play once at the move, not again after the following turn notice');
assert.match(source, /if\(gaveCheck\)announce\("check"\)/,
  'The move that gives check must still announce it');
assert.match(source, /const afterFx=\(\)=>moveVoiceDone\.then\(/,
  'Do not start the next turn while the moving officer is speaking');
assert.match(source, /desert:"assets\/story\/audio\/master_gravel_run_v2\.mp3"/,
  'Desertion and reinforcement footsteps must use the louder mastered sample');
assert.match(source, /if\(p\.s===0\)sfx\("loss",finish\);else compactSound\("sacchoLoss",finish\)/,
  'Purging an enemy officer must play the enemy loss voice');
assert.match(source, /if\(stage===3&&actor===0\)/,
  'The player must receive artillery cards in Toba-Fushimi');
assert.match(source, /pendingWeaponKind=\{kind,side:1\}/,
  'The enemy must retain its artillery cards');
assert.match(source,/hit\.s===0\?sfx\("loss",resolve\):compactSound\("sacchoLoss",resolve\)/,
  'Cannon casualty must be voiced before the next shot');
assert.match(source,/compactFadeExpiredHoles\(id\)/,
  'Expired shell or quake holes must fade before proceeding');
assert.match(source,/master_cliffcollapse_1s_v1\.mp3/,
  'Closing holes must use the treated cliff-fall audio');
assert.match(source, /"援軍":"assets\/cards\/events\/reinforcement\.webp"/,
 'The original reinforcement illustration must be reused');
assert.match(source,/"援軍":"assets\/audio\/events\/incident_voice_reinforcement\.mp3"/,
 'Reinforcement card must use the approved announcement');
assert.match(source,/assets\/audio\/voice_iza_shutsujin\.mp3/,
 'The revived piece must receive the sortie voice');
assert.match(source,/const fallen=g\.fallen\[effect\.side\]/,
 'Reinforcement must restore dead pieces, rather than defecting living enemies');
assert.doesNotMatch(source,/playKabukiVoice\(item\.kind\)/,
 'Cannon and rifle cards must not speak the incorrect old line');
assert.match(source, /setTimeout\(depart,120\)/, 'Desertion disappearance must begin during exit motion');
for (const file of [
  'assets/turn-notice/turn_shinsengumi_illustrated.png',
  'assets/turn-notice/turn_enemy_illustrated.png',
  'assets/visuals/hitokiri_red_calligraphy.webp',
  'assets/visuals/hitokiri_kill_calligraphy.webp',
  'assets/cards/events/calm.webp',
  'assets/cards/events/reinforcement.webp',
  'assets/cards/events/defection-v1.webp',
  'assets/cards/events/defection-v2.webp',
  'assets/cards/events/desertion.webp',
  'assets/cards/events/purge.webp',
  'assets/cards/events/earthquake.webp',
  'assets/story/cards/cannon-v2.webp',
  'assets/story/cards/rifle-v2.webp',
  'assets/story/fx/explosion-v2.webp',
  'assets/story/fx/rifle-impact-v2.webp',
  'assets/story/fx/explosion-v3.webp',
  'assets/story/fx/rifle-impact-v3.webp',
  'assets/story/audio/master_reinforcement.mp3',
  'assets/story/audio/master_fire_voice.mp3',
  'assets/story/audio/master_promotion_voice.mp3',
  'assets/story/audio/master_cannon.mp3',
  'assets/story/audio/master_rifle.mp3',
  'assets/story/audio/master_explosion.mp3',
  'assets/cards/incident-title-outline-v3.webp',
  'assets/story/audio/master_reinforcement_v2.mp3',
  'assets/story/audio/master_fire_voice_v2.mp3',
  'assets/story/audio/master_samurai_loss_v1.mp3',
  'assets/story/audio/master_cliffcollapse_1s_v1.mp3',
]) assert.ok(fs.existsSync(path.join(root, file)), `Missing game asset: ${file}`);
const weapons = fs.readFileSync(path.join(root, 'story-weapons.js'), 'utf8');
assert.match(weapons,/document\.body\.classList\.add\("story-quake-active"\)/,
 'Each cannon explosion must shake the whole battlefield');
assert.match(weapons,/await onImpact\?\.\(outcome,hit\)/,
 'The cannon casualty voice and rifle blood must finish before the next shot');
assert.match(weapons, /story-projectile/, 'Projectile must not use opaque legacy bitmaps');
assert.match(weapons, /kind==="cannon"\?2:1/, 'Cannon must fire exactly twice');
assert.match(weapons, /used\.has/, 'Two cannon shells must strike different squares');
assert.match(weapons, /explosion-v3\.webp/, 'Transparent centered blast asset must be used');
assert.doesNotMatch(weapons, /cannonball\.webp|bullet\.webp|explosion\.webp|rifle-impact\.webp/,
  'Legacy weapon assets with opaque backgrounds must not be used');
assert.match(source, /master_samurai_fire_v1\.mp3/, 'The new samurai artillery voice was not connected');
assert.match(source, /master_samurai_gomen_v1\.mp3/, 'Defection must use only the trimmed 「御免！」 recording');
assert.match(source, /master_samurai_loss_v1\.mp3/, 'The new 「無念だ」 recording was not connected');
assert.match(source, /"寝返り":"assets\/story\/audio\/master_samurai_defection_v1\.mp3"/,
  'The confirmed 「寝返り」 recording must play when the story card is revealed');
assert.ok(fs.existsSync(path.join(root,'assets/story/audio/master_samurai_defection_v1.mp3')),
  'The confirmed defection audio must be included in the repository');
const mainGame = fs.readFileSync(path.join(root,'card-ai-test.html'),'utf8');
assert.match(mainGame, /'寝返り':'defection'/,
  'The finished match must also announce the new defection card');
assert.match(source, /"寝返り":"assets\/cards\/events\/defection-v2\.webp"/,
  'The defection card must have its updated calligraphy');
for(const cue of ['promotion','cannon','rifle','awakening','kill']){
 assert.ok(source.includes('master_kabuki_'+cue+'_v1.mp3'),
  `New Kabuki performance is not wired for ${cue}`);
 assert.ok(fs.existsSync(path.join(root,'assets/story/audio/master_kabuki_'+cue+'_v1.mp3')),
  `Missing Kabuki voice asset: ${cue}`);
}
assert.match(source, /playStoryClip\(kabukiVoice\.promotion,"voice",\(\)=>/,
 'Promotion prompt did not receive the new Kabuki voice');
assert.doesNotMatch(source, /await playKabukiVoice\("kill"\)/,
 'Fatal capture must not speak 斬殺');
assert.match(source, /await playCasualtyCry\(\)/,
 'Fatal capture and rifle hits must play the casualty cry');
assert.match(source, /compactSound\("blood"/,
 'Fatal capture and rifle hit must use a blood splash, not a sword sound');
assert.match(source,/debugAwakenKey=compactFighterKey\(officer\)/,
 'Awakening debug must show a persistent stamp on the officer banner');
assert.match(source,/\}finally\{\s*if\(id===epoch&&!ended\)\{busy=false;compactTurnLocked=false;render\(\)\}/,
 'Debug action must always restore gameplay and mouse hover');
assert.match(source,/master_enemy_loss_v4\.mp3/,
 'The enemy must use their distinct 「無念」 recording');
assert.ok(fs.existsSync(path.join(root,'assets/story/audio/master_enemy_loss_v4.mp3')));
assert.ok(fs.existsSync(path.join(root,'assets/story/audio/sfx_blood_splatter_v1.mp3')));
assert.match(source, /await playKabukiVoice\("awakening"\)/,
 'Awakening must wait until the capture voice is finished');
assert.match(source, /playStoryClip\("assets\/story\/audio\/master_samurai_fire_v1\.mp3","voice",done\)/,
 'Both weapons must use the confirmed 「撃て！」 clip immediately before fire');
assert.match(source, /function compactCardInterval\(\)\{return stage===3\?3:4\}/,
  'Toba-Fushimi must show incident cards every three turns; others retain four');
assert.match(source, /document\.body\.classList\.add\("story-quake-active"\)/,
  'Earthquake must shake the battlefield backdrop in every chapter');
assert.match(source, /const crater=\{y:shot\.y,x:shot\.x,expiresPly:g\.ply\+3\}/,
  'Each cannon impact must leave its own temporary crater');
assert.match(source, /expiresPly:g\.ply\+3/, 'Craters must expire after three moves');
assert.match(source, /assets\/visuals\/defeat_kondo_clean\.webp/, 'Clean defeat artwork must be used');
assert.match(source, /if\(stage===3\)return g\.ply>=5&&\(g\.ply-5\)%3===0/,
  'Toba-Fushimi incidents must be staggered three half-moves apart');
assert.doesNotMatch(source, /if\(actor===1&&!willKill\)/,
  'Ordinary captures must never trigger an additional loss voice');
assert.match(source, /pendingWeaponDisplay=\{kind,ownerSide,revealed:false\}/,
  'Weapon cards must reuse the normal two-step back-and-reveal UI');
assert.match(source, /compactSound\("slash"\)\},1010\)/, 'Opening clash must have a sword sound');
assert.match(source, /if\(kind==="脱走"\|\|kind==="寝返り"\)compactSound\("desert"\)/,
  'Defectors and deserters must share footsteps');
assert.match(source, /\$\("compactCardText"\)\.textContent=item\.kind==="cannon"/,
  'Weapon cards must show their explanations in the ordinary card footer');
assert.match(source, /side===1\?1400:1800/, 'Turn notice needs the completed match queue delay');
assert.match(source, /setTimeout\(\(\)=>\{if\(id===epoch&&!ended\)compactCardStart\(actor\)\},250\)/,
  'Incident notices need the completed match post-move beat');
assert.match(source, /相手の陣地のランダムな２か所/, 'Cannon card must explain the two random enemy targets');
assert.match(source, /発射側の４段目のランダムな列/, 'Rifle card must explain the firing origin');

const sandbox = {window: {}};
vm.createContext(sandbox);
for (const file of ['story-data.js', 'story-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, {filename: file});
}
assert.equal(sandbox.window.StoryData.chapters.length, 4);
for (let stage = 0; stage < 4; stage++) {
  const game = new sandbox.window.StoryEngine(stage);
  assert.equal(game.board.length, game.h);
  assert.equal(game.board[0].length, game.w);
  assert.equal(game.w * game.h, stage === 0 || stage === 2 ? 30 : 81);
  assert.ok(game.legal(0).length > 0, `No opening move in chapter ${stage + 1}`);
  assert.ok(game.legal(1).length > 0, `Enemy has no opening move in chapter ${stage + 1}`);

  const fighters = game.board.flat().filter(Boolean);
  assert.equal(new Set(fighters.map(p => p.uid)).size, fighters.length,
    `Chapter ${stage + 1} shares the same capture identity between distinct soldiers`);
  const first = fighters.find(p => p.t === '歩');
  const other = fighters.find(p => p.t === '歩' && p.s === first.s && p.uid !== first.uid);
  assert.ok(other, `Chapter ${stage + 1} has no two distinct soldiers of one class`);
  assert.notEqual(first.uid, other.uid);
  const original = first.uid;
  const switched = {...first, s: 1 - first.s, p: false};
  assert.equal(switched.uid, original, 'Capture/redeployment must not reset officer identity');

  // The fourth capture of an awakened unit kills instead of entering the hand.
  game.board = Array.from({length: game.h}, () => Array(game.w).fill(null));
  game.board[game.h - 1][game.w - 1] = {t: '玉', s: 0};
  game.board[0][game.w - 1] = {t: '玉', s: 1};
  game.board[game.h - 2][0] = {t: '飛', s: 0, cid: 1, origin: 0};
  game.board[game.h - 3][0] = {t: '歩', s: 1, cid: 11, origin: 1, uid: 'enemy-killed-pawn'};
  const result = game.move({y: game.h - 2, x: 0, Y: game.h - 3, X: 0}, false, true);
  assert.equal(result.captured.t, '歩');
  assert.equal(game.hands[0].length, 0, `Kill added a captive in chapter ${stage + 1}`);
  assert.equal(game.fallen[1].length, 1, `Killed soldier not recorded for future 援軍 in chapter ${stage + 1}`);
  assert.equal(game.fallen[1][0].uid, 'enemy-killed-pawn');
  const restored=game.fallen[1].pop();game.hands[1].push({...restored,s:1,p:false});
  assert.equal(game.hands[1][0].uid,'enemy-killed-pawn','Reinforcement must preserve fallen soldier identity');
  game.board[game.h-4][1]={t:'銀',s:0,uid:'shell-casualty'};
  assert.equal(game.destroy(game.h-4,1).uid,'shell-casualty');
  assert.equal(game.fallen[0][0].uid,'shell-casualty','Artillery casualties must enter reinforcement roster');
}
// A checked king may be saved by another piece. Do not incorrectly lock every
// non-king square: an interposition is a legal move in the finished game.
const checked = new sandbox.window.StoryEngine(1);
checked.board = Array.from({length:9},()=>Array(9).fill(null));
checked.board[8][4]={t:'玉',s:0};
checked.board[0][0]={t:'玉',s:1};
checked.board[0][4]={t:'飛',s:1};
checked.board[7][3]={t:'金',s:0};
assert.ok(checked.check(checked.board,0), 'Fixture must start in check');
assert.ok(checked.legal(0).some(m=>m.y===7&&m.x===3&&m.Y===7&&m.X===4),
  'A non-king piece must be able to interpose against a rook check');
const weaponsGame=new sandbox.window.StoryEngine(3);
for(let i=0;i<100;i++){
 const enemyCannon=weaponsGame.fire('cannon',1),allyCannon=weaponsGame.fire('cannon',0);
 const enemyRifle=weaponsGame.fire('rifle',1),allyRifle=weaponsGame.fire('rifle',0);
 assert.ok(enemyCannon.y>=5&&enemyCannon.y<=8,'Enemy cannon must land on player half');
 assert.ok(allyCannon.y>=0&&allyCannon.y<=3,'Player cannon must land on enemy half');
 assert.equal(enemyRifle.fromY,3,'Enemy rifle must launch from fourth rank');
 assert.equal(allyRifle.fromY,5,'Player rifle must launch from fourth rank');
 assert.ok(enemyRifle.y<0||enemyRifle.y>=4,'Enemy rifle must not hit behind its muzzle');
 assert.ok(allyRifle.y<0||allyRifle.y<=4,'Player rifle must not hit behind its muzzle');
 if(enemyRifle.hit)assert.equal(enemyRifle.hit.s,0,'Enemy musket killed its own soldier');
 if(allyRifle.hit)assert.equal(allyRifle.hit.s,1,'Shinsengumi musket killed an ally');
}
// Only hostile pieces may be casualties; a friendly piece farther down the lane is ignored.
const rifleGame=new sandbox.window.StoryEngine(3);
rifleGame.board=Array.from({length:9},()=>Array(9).fill(null));
for(let x=0;x<9;x++){
 rifleGame.board[4][x]={t:'歩',s:0};rifleGame.board[2][x]={t:'銀',s:1};
}
for(let i=0;i<100;i++){const shot=rifleGame.fire('rifle',0);
 assert.equal(shot.y,2,'Shinsengumi rifle must target the hostile soldier');
 assert.equal(shot.hit.s,1,'Friendly fire is forbidden');
}
console.log('PASS: four story chapters, board dimensions, legal opening moves, capture-kill, and shared assets');
