const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'game-effect-scroll-lock.js'),'utf8');
const css=fs.readFileSync(path.join(root,'story-mode.css'),'utf8');
const html=fs.readFileSync(path.join(root,'story-mode.html'),'utf8');
function scenario(storyVisible){
 let effect=false,scrolls=0,listener=null;
 const cls=()=>({add(){},remove(){},contains(name){return name==='hidden'&&!storyVisible}});
 const style=()=>({overflow:'',overscrollBehavior:'',setProperty(){}});
 const board={getBoundingClientRect:()=>({top:210,height:300}),getClientRects:()=>[{}],scrollIntoView(){scrolls++}};
 const battle={classList:cls()};
 const document={readyState:'complete',
  querySelector:query=>effect&&query==='#compactTurnNotice.show'?{}:null,
  getElementById:id=>id==='storyBattle'?battle:board,
  documentElement:{style:style(),classList:cls()},
  body:{style:style(),classList:cls()},
  addEventListener(){}
 };
 const window={scrollY:80,innerHeight:700,scrollTo(){scrolls++}};
 class MutationObserver{constructor(callback){listener=callback}observe(){}}
 const context={document,window,MutationObserver,requestAnimationFrame:callback=>callback()};
 vm.runInNewContext(code,context);
 assert.ok(listener,'Scroll-lock observer should initialize');
 effect=true;listener();effect=false;listener();
 return scrolls;
}
assert.equal(scenario(true),0,'Story turn overlays must not alter the scroll offset');
assert.equal(scenario(false),0,'Normal match effects must not move the viewport during or after presentation');
assert.match(css,/html\{scrollbar-gutter:stable\}/,'Desktop scrollbar width must stay stable');
assert.match(css,/#storyBattle\{overflow-anchor:none\}/,'DOM rerenders must not cause browser scroll anchoring');
assert.match(html,/game-effect-scroll-lock\.js\?v=stable-scroll-20261107b/);
console.log('PASS: story overlay lock preserves scroll, normal match behavior retained');
