(function(){
"use strict";
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const board=()=>document.getElementById("storyBoard");
const cell=(g,y,x)=>board()?.children[y*g.w+x];
const visible=cb=>typeof cb!=="function"||cb();
async function projectile(g,kind,x,y,isActive){
 const root=board(),from=cell(g,0,x),to=cell(g,y<0?g.h-1:y,x);
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
  const animation=flying.animate([{transform:"translate("+startX+"px,"+(-size*2)+"px) scale(.75)",opacity:1},{transform:"translate("+endX+"px,"+endY+"px) scale(1.2)",opacity:1}],{duration:kind==="cannon"?1100:850,easing:"ease-in",fill:"forwards"});
  await animation.finished.catch(()=>{});
 }else{flying.style.transform="translate("+endX+"px,"+endY+"px)";await wait(950)}
 flying.remove();
}
async function impact(g,y,x,kind,isActive){
 const c=cell(g,y,x);if(!c)return;
 c.classList.remove("warn");
 const overlay=document.createElement("div");overlay.className="shot-overlay "+kind;
 const art=document.createElement("img");art.alt="";art.src="assets/story/fx/"+(kind==="cannon"?"explosion-v2.webp":"rifle-impact-v2.webp");
 art.onerror=()=>{art.style.display="none";overlay.textContent="✴"};
 overlay.append(art);c.append(overlay);
 const previousZ=c.style.zIndex;c.style.zIndex="26";
 await wait(kind==="cannon"?1650:1300);overlay.remove();c.style.zIndex=previousZ;
}
async function fire(g,kind,isActive,onSound){
 const shot=g.fire(kind),root=board();if(!root)return null;
 const warnings=[];
 if(kind==="cannon"){const c=cell(g,shot.y,shot.x);if(c){c.classList.add("warn");warnings.push(c)}}
 else{for(let y=0;y<g.h;y++){const c=cell(g,y,shot.x);if(c){c.classList.add("warn");warnings.push(c)}}}
 const clear=()=>warnings.forEach(c=>c.classList.remove("warn"));
 await wait(1350);if(!visible(isActive)){clear();return null}
 if(kind==="cannon"){onSound?.("cannon");await projectile(g,kind,shot.x,shot.y,isActive)}
 else{onSound?.("rifle");await projectile(g,kind,shot.x,shot.y,isActive)}
 if(!visible(isActive)){clear();return null}
 if(shot.y>=0){if(kind==="cannon")onSound?.("blast");await impact(g,shot.y,shot.x,kind,isActive);}
 clear();if(!visible(isActive))return null;
 const hit=shot.y>=0?g.destroy(shot.y,shot.x):null;
 await wait(800);
 return {hit,x:shot.x,y:shot.y,kind};
}
window.StoryWeapons={fire};
})();
