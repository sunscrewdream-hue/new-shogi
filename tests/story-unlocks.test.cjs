// Run: node tests/story-unlocks.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const story=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const selector=fs.readFileSync(path.join(root,'story-unlocks.js'),'utf8');
const html=fs.readFileSync(path.join(root,'card-ai-test.html'),'utf8');
assert.match(story,/if\(win&&!devPreview&&!debugModified\)/,
 'Only legitimate story victories may unlock the next battlefield');
assert.match(story,/localStorage\.setItem\(SAVE,String\(unlock\)\)/,
 'Story victories must write the established progress key');
assert.match(selector,/progressKey='shinsengumi-story-progress-v2'/,
 'Regular matches must read the same progress key');
for(const name of ['ikedaya','kinmon','aburanokoji','tobafushimi']){
 assert.ok(selector.includes("id:'"+name+"'"),'Missing unlocked field '+name);
}
for(let step=0;step<=4;step++){
 assert.match(selector,new RegExp('required:'+step),
  'Normal board and four win-locked battlefields need progression thresholds');
}
assert.match(selector,/button\.disabled=!allowed/,'Unwon battles must be disabled');
assert.match(selector,/if\(!allowed\)return/,'Locked battles must reject clicks');
assert.match(selector,/if\(battlefields\.find\(f=>f\.id===selected\)\?\.required>wins\)selected='classic'/,
 'Revoke a selection if the progress no longer permits it');
assert.match(selector,/window\.addEventListener\('pageshow',render\)/,
 'Returning from the story must refresh victory-based unlocks');
assert.match(selector,/const boardImages=\{/,
 'The 9x9 historical battlefields must have a native-sized ground');
assert.match(selector,/match\.style\.backgroundImage=boardImages\[selected\]\|\|''/,
 'The 5x6 story boards must not be stretched over regular 9x9 hit cells');
assert.match(html,/story-unlocks\.css\?v=20261105r/);
assert.match(html,/story-unlocks\.js\?v=20261105r/);
console.log('PASS: 4 win-locked battlefield themes, victory-only storage and standard 9x9 geometry');
