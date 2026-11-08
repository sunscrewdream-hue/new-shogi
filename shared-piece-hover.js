/* Shared mouse-only character inspection for every battle board. */
(function(global){
 'use strict';
 const INSET=.225; // The middle 55% of each square triggers a portrait.
 const DELAY=140;
 function bind({root,getPiece,canPreview,onPreview,onClear}){
  let candidate=-1,active=-1,timer=null;
  function reset(){
   if(timer!==null)clearTimeout(timer);
   timer=null;candidate=-1;active=-1;
   onClear();
  }
  root.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse')return;
   if(!canPreview()){reset();return}
   const cell=event.target.closest?.('.sq');
   if(!cell||!root.contains(cell)){reset();return}
   const box=cell.getBoundingClientRect();
   if(!box.width||!box.height){reset();return}
   const x=(event.clientX-box.left)/box.width,y=(event.clientY-box.top)/box.height;
   if(x<INSET||x>1-INSET||y<INSET||y>1-INSET){reset();return}
   const index=Array.prototype.indexOf.call(root.children,cell);
   const piece=getPiece(index);
   if(!piece){reset();return}
   if(candidate===index||active===index)return;
   if(timer!==null)clearTimeout(timer);
   candidate=index;
   timer=setTimeout(()=>{
    timer=null;candidate=-1;
    if(!root.contains(cell)||!canPreview())return;
    onPreview(piece);
    active=index;
   },DELAY);
  });
  root.addEventListener('pointerout',event=>{
   if(event.pointerType!=='mouse')return;
   const cell=event.target.closest?.('.sq');
   if(cell&&!cell.contains(event.relatedTarget))reset();
  });
  root.addEventListener('pointerleave',reset);
  return {reset};
 }
 global.ShinsengumiPieceHover=Object.freeze({bind,INSET,DELAY});
})(window);
