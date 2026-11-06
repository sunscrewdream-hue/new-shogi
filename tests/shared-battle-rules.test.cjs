const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const context={window:{}};vm.createContext(context);
vm.runInContext(file('shared-battle-rules.js'),context);
const {fighterKey,captureResult,voiceCues}=context.window.ShinsengumiBattleRules;
for(const origin of [0,1])for(const cid of [0,1,2,11]){
 const finished={originSide:origin,s:1-origin,cid,t:'歩'};
 const story={origin,s:1-origin,cid,t:'歩'};
 assert.equal(fighterKey(finished),fighterKey(story),'Both modes identify one officer consistently');
}
assert.equal(fighterKey({origin:0,uid:'0:歩:5',t:'歩'}),'0:歩:5');
for(const hitokiri of [false,true])for(const captured of [false,true])for(let previous=0;previous<=5;previous++){
 const result=captureResult({captured,previous,hitokiri});
 assert.equal(result.lethal,!!(hitokiri&&captured&&previous>=3));
 assert.equal(result.awakened,!!(hitokiri&&captured&&previous===2));
 assert.equal(result.next,hitokiri&&captured?(previous>=3?0:previous+1):previous);
}
assert.equal(Array.from(voiceCues({captured:true,gaveCheck:true})).join(','),'capture,check');
assert.equal(Array.from(voiceCues({captured:true,lethal:true,gaveCheck:true})).join(','),'');
assert.equal(Array.from(voiceCues({gaveCheck:true})).join(','),'check');
assert.equal(Array.from(voiceCues({captured:true})).join(','),'capture');
for(const html of ['card-ai-test.html','story-mode.html'])assert.match(file(html),/shared-battle-rules\.js\?v=/);
assert.match(file('card-ai-test.html'),/ShinsengumiBattleRules\.captureResult/);
assert.match(file('story-mode.js'),/ShinsengumiBattleRules\.captureResult/);
assert.match(file('card-ai-test.html'),/const queue=\[\.\.\.voiceKeys\]/,'Multiple voice cues must play sequentially');
console.log('PASS: shared capture progression, officer identity and sequential capture/check cues');
