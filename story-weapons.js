(function(){
"use strict";
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const board=()=>document.getElementById("storyBoard");
const cell=(g,y,x)=>board()?.children[y*g.w+x];
const visible=cb=>typeof cb!=="function"||cb();
async function projectile(g,kind,x,y,isActive){
 const root=board(),from=cell(g,0,x),to=cell(g,y<0?g.h-1:y,x);
 if(!root||!from||!to||!visible(isActive))return;
 const flying=document.createElement("img");
 flying.className="bullet";
 flying.alt="";
 flying.src="assets/story/fx/"+(kind==="cannon"?"cannonball.webp":"bullet.webp");
 flying.onerror=()=>{flying.style.display="none"};
 root.append(flying);
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),area=root.getBoundingClientRect();
 const size=kind==="cannon"?Math.max(16,a.width*.48):Math.max(10,a.width*.30);
 flying.style.cssText="position:absolute;left:0;top:0;width:"+size+"px;height:"+size+"px;z-index:24;pointer-events:none;object-fit:contain;filter:drop-shadow(0 0 5px #f8b34a)";
 const startX=a.left-area.left+a.width/2-size/2,startY=a.top-area.top+a.height/2-size/2;
 const endX=b.left-area.left+b.width/2-size/2,endY=b.top-area.top+b.height/2-size/2;
 if(flying.animate){
  const animation=flying.animate([{transform:"translate("+startX+"px,"+(-size*2)+"px)",opacity:1},{transform:"translate("+endX+"px,"+endY+"px)",opacity:1}],{duration:kind==="cannon"?480:230,easing:"ease-in",fill:"forwards"});
  await animation.finished.catch(()=>{});
 }else{flying.style.transform="translate("+endX+"px,"+endY+"px)";await wait(250)}
 flying.remove();
}
async function impact(g,y,x,kind,isActive){
 const c=cell(g,y,x);if(!c)return;
 c.classList.remove("warn");
 const overlay=document.createElement("div");overlay.className="shot-overlay "+kind;
 const art=document.createElement("img");art.alt="";art.src="assets/story/fx/"+(kind==="cannon"?"explosion.webp":"rifle-impact.webp");
 art.onerror=()=>{art.style.display="none";overlay.textContent=kind==="cannon"?"💥":"✴"};
 overlay.append(art);c.append(overlay);
 await wait(620);overlay.remove();
}
async function fire(g,kind,isActive,onSound){
 const shot=g.fire(kind),root=board();if(!root)return null;
 const warnings=[];
 if(kind==="cannon"){const c=cell(g,shot.y,shot.x);if(c){c.classList.add("warn");warnings.push(c)}}
 else{for(let y=0;y<g.h;y++){const c=cell(g,y,shot.x);if(c){c.classList.add("warn");warnings.push(c)}}}
 const clear=()=>warnings.forEach(c=>c.classList.remove("warn"));
 await wait(750);if(!visible(isActive)){clear();return null}
 if(kind==="cannon"){onSound?.("cannon");await projectile(g,kind,shot.x,shot.y,isActive)}
 else{onSound?.("rifle");await projectile(g,kind,shot.x,shot.y,isActive)}
 if(!visible(isActive)){clear();return null}
 if(shot.y>=0)await impact(g,shot.y,shot.x,kind,isActive);
 clear();if(!visible(isActive))return null;
 const hit=shot.y>=0?g.destroy(shot.y,shot.x):null;
 return {hit,x:shot.x,y:shot.y,kind};
}
window.StoryWeapons={fire};
})();