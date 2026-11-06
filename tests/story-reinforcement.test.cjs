const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(root,'story-data.js'),'utf8'),{window});
vm.runInNewContext(fs.readFileSync(path.join(root,'story-engine.js'),'utf8'),{window});
const start=script.indexOf('function compactGrantReinforcement(effect){');
const end=script.indexOf('\nfunction compactApplyIncident(',start);
assert.ok(start>=0&&end>start,'Actual story reinforcement grant is extracted');
const source=script.slice(start,end);
for(let stage=0;stage<4;stage++){
 const g=new window.StoryEngine(stage);
 const context={g,reinforcementSerial:0};
 vm.createContext(context);
 const grant=vm.runInContext(source+'\ncompactGrantReinforcement',context);
 for(const side of [0,1]){
  const before=g.hands[side].length;
  const newcomer=grant({kind:'援軍',side,reserve:true});
  assert.equal(newcomer.t,'銀');
  assert.equal(g.hands[side].length,before+1,`stage ${stage} side ${side}: reinforcement increases hand`);
  assert.equal(g.hands[side].at(-1).uid,newcomer.uid);
  const fallen={t:'歩',s:side,origin:side,uid:`fallen-${stage}-${side}`,cid:11,p:false};
  g.fallen[side].push(fallen);
  const rescued=grant({kind:'援軍',side,uid:fallen.uid});
  assert.equal(rescued.uid,fallen.uid);
  assert.equal(g.fallen[side].length,0);
  assert.equal(g.hands[side].length,before+2,`stage ${stage} side ${side}: fallen soldier returns`);
 }
}
assert.match(script,/else\{compactIncidentEffect=\{kind,side,reserve:true\}/,'Card has a real fallback when nobody has died');
assert.match(script,/figure\.className="story-reinforcement-runner"/,'Reinforcement runner exists');
assert.match(script,/voice&&!voice\.paused&&!voice\.ended\)\|\|battleVoiceActive/,'Banner waits for both HTML and Web Audio voices');
console.log('PASS: reinforcement increases hand with both reserve and revival in four chapters; banners await voices');
