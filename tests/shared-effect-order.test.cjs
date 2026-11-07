const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../shared-battle-rules.js'),'utf8'),{window:root,setTimeout});
const rules=root.ShinsengumiBattleRules;

async function main(){
 const events=[];
 const pause=()=>new Promise(resolve=>setTimeout(resolve,5));
 await rules.runOrderedEffect({
  attack:async()=>{events.push('attack');await pause()},
  impact:async()=>{events.push('impact');await pause()},
  cry:async()=>{events.push('cry');await pause()},
  result:()=>events.push('result')
 });
 assert.deepEqual(events,['attack','impact','cry','result']);
 const sourceFiles=['card-ai-test.html','story-mode.js'].map(x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8'));
 for(const source of sourceFiles){
  assert.match(source,/ShinsengumiBattleRules\.runOrderedEffect/);
  assert.match(source,/ShinsengumiBattleRules\.revealAfterTurn/);
 }
 console.log('PASS: normal and story use shared sequential sound/visual phases and card reveal timing');
}
main().catch(error=>{console.error(error);process.exitCode=1});
