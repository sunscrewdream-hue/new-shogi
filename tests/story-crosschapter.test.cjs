// Run: node tests/story-crosschapter.test.cjs
// Regression guard: every story battle must share the established event flow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'story-mode.js'), 'utf8');
const storyHtml=fs.readFileSync(path.join(root,'story-mode.html'),'utf8');
for(const id of ['debugCard','debugQuake','debugReinforce','debugDesert','debugPurge','debugCannon','debugRifle','debugTurn','debugFx','debugVoice0','debugVoice1']){
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
assert.match(source, /if\(gaveCheck\)compactSound\("check"\)/,
  'The move that gives check must still announce it');
assert.match(source, /setTimeout\(depart,120\)/, 'Desertion disappearance must begin during exit motion');
for (const file of [
  'assets/turn-notice/turn_shinsengumi_illustrated.png',
  'assets/turn-notice/turn_enemy_illustrated.png',
  'assets/visuals/hitokiri_red_calligraphy.webp',
  'assets/visuals/hitokiri_kill_calligraphy.webp',
  'assets/cards/events/calm.webp',
  'assets/cards/events/reinforcement.webp',
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
  'assets/story/audio/master_loss.mp3',
  'assets/story/audio/master_cannon.mp3',
  'assets/story/audio/master_rifle.mp3',
  'assets/story/audio/master_explosion.mp3',
  'assets/cards/incident-title-outline-v3.webp',
  'assets/story/audio/master_reinforcement_v2.mp3',
  'assets/story/audio/master_loss_v2.mp3',
  'assets/story/audio/master_fire_voice_v2.mp3',
  'assets/story/audio/master_saccho_loss_v3.mp3',
]) assert.ok(fs.existsSync(path.join(root, file)), `Missing game asset: ${file}`);
const weapons = fs.readFileSync(path.join(root, 'story-weapons.js'), 'utf8');
assert.match(weapons, /story-projectile/, 'Projectile must not use opaque legacy bitmaps');
assert.match(weapons, /kind==="cannon"\?2:1/, 'Cannon must fire exactly twice');
assert.match(weapons, /used\.has/, 'Two cannon shells must strike different squares');
assert.match(weapons, /explosion-v3\.webp/, 'Transparent centered blast asset must be used');
assert.doesNotMatch(weapons, /cannonball\.webp|bullet\.webp|explosion\.webp|rifle-impact\.webp/,
  'Legacy weapon assets with opaque backgrounds must not be used');
assert.match(source, /master_fire_voice_v2\.mp3/, 'The level-matched artillery voice was not connected');
assert.match(source, /master_reinforcement_v2\.mp3/, 'Reinforcement did not receive its level-matched voice');
assert.match(source, /master_promotion_voice\.mp3/, 'Promotion prompt did not receive its approved voice');
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
assert.match(source, /if\(kind==="脱走"\|\|kind==="援軍"\)compactSound\("desert"\)/,
  'Reinforcements and deserters must share footsteps');
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
  game.board[game.h - 3][0] = {t: '歩', s: 1, cid: 11, origin: 1};
  const result = game.move({y: game.h - 2, x: 0, Y: game.h - 3, X: 0}, false, true);
  assert.equal(result.captured.t, '歩');
  assert.equal(game.hands[0].length, 0, `Kill added a captive in chapter ${stage + 1}`);
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
}
console.log('PASS: four story chapters, board dimensions, legal opening moves, capture-kill, and shared assets');
