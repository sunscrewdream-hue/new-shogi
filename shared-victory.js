/* The same victory portrait compositor is used by normal and story games. */
(function(global){
 'use strict';
 const allowed=new Set(['kondo','miyabe','kusaka','ito','saigo']);
 function portrait(name,role){
  if(!allowed.has(name))throw new Error('Unknown victory character: '+name);
  return 'assets/characters/victory/'+name+'_'+role+'.webp';
 }
 function preload(url){
  return new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error('Victory image missing: '+url));img.src=url;});
 }
 const cleanedWinnerCache=new Map();
 // Strip disconnected matte debris from Kusaka's approved alpha cutout.
 // The connected figure is retained; other character assets are untouched.
 function cleanKusakaWinner(url){
  if(cleanedWinnerCache.has(url))return cleanedWinnerCache.get(url);
  const job=new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>{
    try{
     const canvas=document.createElement('canvas');
     canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
     const ctx=canvas.getContext('2d',{willReadFrequently:true});
     if(!ctx)throw new Error('Canvas unavailable');
     ctx.drawImage(img,0,0);
     const image=ctx.getImageData(0,0,canvas.width,canvas.height);
     const {data}=image,w=canvas.width,h=canvas.height,n=w*h;
     const solid=new Uint8Array(n),visited=new Uint8Array(n);
     // Ignore stray low-alpha pixels, then identify the foreground region.
     for(let i=0;i<n;i++)if(data[4*i+3]>=96)solid[i]=1;
     const queue=new Int32Array(n);
     let best=[],bestCount=0;
     // Prefer the connected region containing the chest, never a matte island.
     const seed=Math.min(h-1,Math.floor(h*.40))*w+Math.min(w-1,Math.floor(w*.5));
     const explore=(start)=>{
      let head=0,tail=1;queue[0]=start;visited[start]=1;
      while(head<tail){
       const i=queue[head++],x=i%w;
       const neighbors=[i-w,i+w,x?i-1:-1,x<w-1?i+1:-1];
       for(const j of neighbors)if(j>=0&&j<n&&solid[j]&&!visited[j]){visited[j]=1;queue[tail++]=j}
      }
      return tail;
     };
     if(solid[seed]){bestCount=explore(seed);best=queue.slice(0,bestCount)}
     // Guard against an unexpected transparent chest pixel.
     for(let i=0;i<n;i++)if(solid[i]&&!visited[i]){
      const count=explore(i);
      if(count>bestCount){bestCount=count;best=queue.slice(0,count)}
     }
     if(bestCount<Math.floor(n*.025))return resolve(url);
     const keep=new Uint8Array(n);
     for(const i of best)keep[i]=1;
     // Preserve a narrow antialiased fringe without keeping distant speckles.
     let frontier=best;
     for(let step=0;step<3;step++){
      const next=[];
      for(const i of frontier){
       const x=i%w;
       for(const j of [i-w,i+w,x?i-1:-1,x<w-1?i+1:-1])
        if(j>=0&&j<n&&!keep[j]&&data[4*j+3]>0){keep[j]=1;next.push(j)}
      }
      frontier=next;
     }
     for(let i=0;i<n;i++)if(!keep[i])data[4*i+3]=0;
     ctx.putImageData(image,0,0);
     resolve(canvas.toDataURL('image/png'));
    }catch(error){console.warn('久坂勝利素材の透過ノイズ補正を省略',error);resolve(url)}
   };
   img.onerror=()=>reject(new Error('Kusaka victory image unavailable'));
   img.src=url;
  });
  cleanedWinnerCache.set(url,job);
  return job;
 }
 function show({overlay,winnerElement,loserElement,winnerId,loserId,winnerName,loserName,onCross}){
  const token=String((Number(overlay.dataset.victorySequence)||0)+1);
  overlay.dataset.victorySequence=token;
  overlay.classList.remove('composite-victory','victory-image-error');
  overlay.classList.add('victory-loading');
  const winnerUrl=portrait(winnerId,'winner'),loserUrl=portrait(loserId,'loser');
  winnerElement.alt=winnerName+'の勝利';loserElement.alt=loserName+'の敗北';
  loserElement.classList.toggle('victory-kondo-loser',loserId==='kondo');
  winnerElement.removeAttribute('src');loserElement.removeAttribute('src');
  // Never fall back to withdrawn, pre-composited result scenes.
  return Promise.all([winnerId==='kusaka'?cleanKusakaWinner(winnerUrl):preload(winnerUrl).then(()=>winnerUrl),preload(loserUrl)]).then(([displayWinnerUrl])=>{
   if(overlay.dataset.victorySequence!==token)return false;
   winnerElement.src=displayWinnerUrl;loserElement.src=loserUrl;
   overlay.classList.add('composite-victory');
   overlay.classList.remove('victory-loading');
   // Trigger at the first visible overlap, accounting for the eased entrance.
   if(typeof onCross==='function')setTimeout(()=>{
    if(overlay.dataset.victorySequence===token&&overlay.classList.contains('composite-victory')&&getComputedStyle(overlay).display!=='none')onCross();
   },1480);
   return true;
  }).catch(error=>{
   if(overlay.dataset.victorySequence===token){overlay.classList.remove('victory-loading');overlay.classList.add('victory-image-error')};
   console.error(error);return false;
  });
 }
 global.SharedVictory={show,portrait};
})(window);
