const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'..','story-mode.js'),'utf8');
assert.match(script,/function playBloodImpact\(\)\{return Promise\.race\(/,'Blood sound must be bounded');
assert.match(script,/watchdog=setTimeout\(\(\)=>\{console\.warn\("音声終了通知タイムアウト"/,'Every timed HTML audio sequence must release its callback');
assert.match(script,/if\(kind==="blood"\)playGestureAudio\(src,onDone,"fx"\)/,'Impact must use gesture-unlocked audio');
assert.match(script,/catch\(error\)\{console\.error\("斬殺演出の復旧処理",error\)\}/,'Fatal animation needs an exception recovery');
assert.match(script,/finally\{[\s\S]*?compactBloodMarks=compactBloodMarks\.filter[\s\S]*?afterFx\(\)/,'Turn must resume after lethal animation');

const extracted=script.match(/function playBloodImpact\(\)\{[^\n]+\}/)?.[0];
assert.ok(extracted);
const sandbox={Promise,setTimeout,compactSound:()=>{},later:ms=>new Promise(resolve=>setTimeout(resolve,Math.min(ms,5)))};
vm.createContext(sandbox);
vm.runInContext(extracted,sandbox);
Promise.race([vm.runInContext('playBloodImpact()',sandbox),new Promise((_,reject)=>setTimeout(()=>reject(Error('Audio callback hung')),150))])
 .then(()=>console.log('PASS: lethal impact audio timeout releases game even without ended event'))
 .catch(error=>{console.error(error);process.exitCode=1});
