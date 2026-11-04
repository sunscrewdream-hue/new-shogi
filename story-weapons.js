(function(){
"use strict";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function showImpact(game,y,x,kind,isActive){
 const cell=document.getElementById("storyBoard").children[y*game.w+x];if(!cell)return;
 cell.classList.remove("warn");
 const effect=document.createElement("div");effect.className="shot-overlay "+(kind==="cannon"?"cannon":"");
 const img=document.createElement("img");img.alt="";img.src="assets/story/fx/"+(kind==="cannon"?"explosion.webp":"rifle-impact.webp");
 img.onerror=()=>{img.style.display="none";effect.textContent=kind==="cannon"?"💥":"✴"};
 effect.append(img);cell.append(effect);await sleep(650);if(isActive())effect.remove();
}
async function fire(game,kind,isActive,onSound){
 const shot=game.fire(kind),root=document.getElementById("storyBoard");
 if(kind==="cannon"){
  const c=root.children[shot.y*game.w+shot.x];c?.classList.add("warn");
  await sleep(720);if(!isActive())return null;
  onSound("cannon");await showImpact(game,shot.y,shot.x,kind,isActive);if(!isActive())return null;
 }else{
  for(let y=0;y<game.h;y++)root.children[y*game.w+shot.x]?.classList.add("warn");
  await sleep(720);if(!isActive())return null;
  onSound("rifle");
  if(shot.y>=0){await showImpact(game,shot.y,shot.x,kind,isActive);if(!isActive())return null}
 }
 const hit=shot.y>=0?game.destroy(shot.y,shot.x):null;
 return {hit,x:shot.x,y:shot.y,kind};
}
window.StoryWeapons={fire};
})();