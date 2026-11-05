// Run: node tests/story-crosschapter.test.cjs
// Regression guard: every story battle must share the established event flow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'story-mode.js'), 'utf8');
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
]) assert.ok(fs.existsSync(path.join(root, file)), `Missing game asset: ${file}`);

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
console.log('PASS: four story chapters, board dimensions, legal opening moves, capture-kill, and shared assets');
