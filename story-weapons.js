(function(){
"use strict";
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const board=()=>document.getElementById("storyBoard");
const cell=(g,y,x)=>board()?.children[y*g.w+x];
const visible=cb=>typeof cb!=="function"||cb();
async function projectile(g,kind,shot,isActive){
 const x=shot.x,y=shot.y,fromY=shot.fromY??0;
 const root=board(),from=cell(g,fromY,x),to=cell(g,y<0?(shot.side===0?0:g.h-1):y,x);
 if(!root||!from||!to||!visible(isActive))return;
 // Pure CSS projectile: no opaque black rectangular backing from legacy bitmaps.
 const flying=document.createElement("span");
 flying.className="story-projectile "+kind;
 root.append(flying);
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),area=root.getBoundingClientRect();
 const size=kind==="cannon"?Math.max(19,a.width*.46):Math.max(10,a.width*.32);
 flying.style.cssText="position:absolute;left:0;top:0;width:"+size+"px;height:"+size+"px;z-index:24;pointer-events:none";
 const startX=a.left-area.left+a.width/2-size/2,startY=a.top-area.top+a.height/2-size/2;
 const endX=b.left-area.left+b.width/2-size/2,endY=b.top-area.top+b.height/2-size/2;
 if(flying.animate){
  const startingY=kind==="cannon"?startY+(shot.side===0?size*2:-size*2):startY;
  const animation=flying.animate([{transform:"translate("+startX+"px,"+startingY+"px) scale(.75)",opacity:1},{transform:"translate("+endX+"px,"+endY+"px) scale(1.2)",opacity:1}],{duration:kind==="cannon"?1100:900,easing:"ease-in",fill:"forwards"});
  await animation.finished.catch(()=>{});
 }else{flying.style.transform="translate("+endX+"px,"+endY+"px)";await wait(950)}
 flying.remove();
}
async function impact(g,y,x,kind,isActive){
 const c=cell(g,y,x);if(!c)return;
 const shake=kind==="cannon";
 if(shake){board()?.classList.add("compact-quake");document.body.classList.add("story-quake-active")}
 c.classList.remove("warn");
 const overlay=document.createElement("div");overlay.className="shot-overlay "+kind;
 const art=document.createElement("img");art.alt="";art.src="assets/effects/weapons/"+(kind==="cannon"?"explosion-v3.webp":"rifle-impact-v3.webp");
 art.onerror=()=>{art.style.display="none";overlay.textContent="✴"};
 overlay.append(art);c.append(overlay);
 const previousZ=c.style.zIndex;c.style.zIndex="26";
 try{await wait(kind==="cannon"?2250:1750)}finally{
  overlay.remove();c.style.zIndex=previousZ;
  if(shake){board()?.classList.remove("compact-quake");document.body.classList.remove("story-quake-active")}
 }
}
async function fire(g,kind,isActive,onSound,onImpact,ownerSide=1){
 const root=board();if(!root)return null;
 const shots=[],used=new Set(),count=kind==="cannon"?2:1;
 for(let index=1;index<=count;index++){
  if(!visible(isActive))return null;
  let shot=g.fire(kind,ownerSide),attempts=0;
  while(kind==="cannon"&&used.has(shot.y+":"+shot.x)&&attempts++<100)shot=g.fire(kind,ownerSide);
  if(kind==="cannon"&&used.has(shot.y+":"+shot.x)){
   const free=[];for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if((ownerSide===1?y>=g.h-Math.floor(g.h/2):y<Math.floor(g.h/2))&&!used.has(y+":"+x))free.push({y,x});
   shot={...shot,...free[Math.floor(Math.random()*free.length)]};
  }
  used.add(shot.y+":"+shot.x);
  const warnings=[];
  if(kind==="cannon"){const c=cell(g,shot.y,shot.x);if(c){c.classList.add("warn");warnings.push(c)}}
  else for(let y=shot.fromY;y>=0&&y<g.h;y+=ownerSide===1?1:-1){const c=cell(g,y,shot.x);if(c){c.classList.add("warn");warnings.push(c)}}
  const clear=()=>warnings.forEach(c=>c.classList.remove("warn"));
  await wait(1250);if(!visible(isActive)){clear();return null}
  onSound?.(kind);await projectile(g,kind,shot,isActive);
  if(!visible(isActive)){clear();return null}
  if(shot.y>=0){if(kind==="cannon")onSound?.("blast");await impact(g,shot.y,shot.x,kind,isActive)}
  clear();if(!visible(isActive))return null;
  const hit=shot.y>=0?g.destroy(shot.y,shot.x):null;
  const outcome={hit,x:shot.x,y:shot.y,kind,index};shots.push(outcome);
  // Await the casualty's voice and blood/slash vignette before the next shell.
  await onImpact?.(outcome,hit);
  await wait(kind==="cannon"?1100:800);
 }
 return shots;
}
window.StoryWeapons={fire};
})();
