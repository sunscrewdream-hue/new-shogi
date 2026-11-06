const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
for(const file of ['assets/audio/saccho_voice_03_toraeta.mp3','assets/audio/voice_capture_toraeta.mp3','assets/audio/voice_oute.mp3']){
 assert.ok(fs.statSync(path.join(root,file)).size>1000,`${file} must contain real audio`);
}
assert.match(source,/document\.addEventListener\("pointerdown",unlockBattleVoice/,'voice context must unlock from touch/click');
assert.match(source,/kind==="sacchoCapture"\|\|kind==="check"\)playBattleShout/,'enemy capture and check must use the reliable channel');
assert.match(source,/if\(actor===0\)announce\("capture",sfx\);else announce\("sacchoCapture"\);\s*if\(gaveCheck\)announce\("check"\)/,'capture must speak even when giving check');
assert.match(source,/moveVoiceDone=moveVoiceDone\.then/,'capture and check must be serialized');
console.log('PASS: enemy capture and check use gesture-unlocked sequential voices');
