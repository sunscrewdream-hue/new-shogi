/* Common battle presentation. Story mode is the reference for both views. */
(function(root){
 'use strict';
 const timing=Object.freeze({quietMove:850,promotionMove:350,promotionPause:220,promotionRise:1050,
  awakening:1600,killResult:850,turnNotice:1800,enemyTurnDelay:1400,playerTurnDelay:1800,
  enemyThink:1050,escort:1450,desertion:2600,holeFade:1350,incidentTitle:1300});
 function moveVoices({board,side,y,x,source,captured=false,lethal=false,gaveCheck=false,captureAlreadyPlayed=false,promoted=false,random=Math.random}){
  const cues=root.ShinsengumiBattleRules.voiceCues({captured,lethal,gaveCheck,captureAlreadyPlayed});
  if(captured||lethal||cues.length)return cues;
  const origin=source?.originSide??source?.origin;
  const dedicated=side===0?(origin===0&&source?.cid===0?'kondo':origin===0&&source?.cid===1?'hijikata':null)
   :origin===1&&source?.cid===0?'saigo':origin===1&&source?.cid===2?'kido':null;
  if(dedicated)return [dedicated];
  const nearby=board.some((row,Y)=>row.some((p,X)=>p&&p.s!==side&&Math.max(Math.abs(Y-y),Math.abs(X-x))<=1));
  return nearby&&random()<.45?[side===0?'move0':promoted?'sacchoPromote':random()<.3?'sacchoUryaa':'sacchoChesto']:[];
 }
 function animateEscort({cell,jail,layer,side,tokenSelector,valid=()=>true,onContact=()=>{},onFinished=()=>{}}){
  const rect=cell?.getBoundingClientRect(),goal=jail?.getBoundingClientRect();
  if(!rect||!goal||!layer||!root.Element?.prototype.animate||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   if(valid())onContact();setTimeout(()=>{if(valid())onFinished()},180);return;
  }
  const width=Math.min(72,Math.max(42,rect.width*1.15)),height=width*1.4;
  const targetX=rect.left+rect.width/2-width/2,targetY=rect.top+rect.height/2-height/2;
  const goalX=goal.left+goal.width/2-width/2,goalY=goal.top+goal.height/2-height/2,startX=side===0?-width-20:root.innerWidth+20;
  const guard=document.createElement('img');guard.src='assets/sprites/figures/'+(side===0?'shinsengumi_back':'saccho_front')+'.webp';guard.alt='';
  Object.assign(guard.style,{position:'fixed',left:startX+'px',top:targetY+'px',width:width+'px',height:height+'px',objectFit:'contain',pointerEvents:'none'});layer.append(guard);
  const original=cell.querySelector(tokenSelector),tokenRect=original?.getBoundingClientRect(),style=original?getComputedStyle(original):null;
  let carried=null,contacted=false,finished=false,timer,watchdog;
  const contact=()=>{if(contacted||!valid())return;contacted=true;onContact()};
  const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);clearTimeout(watchdog);guard.remove();carried?.remove();if(valid()){contact();onFinished()}};
  try{
   if(original&&tokenRect&&style){
    carried=document.createElement('span');carried.setAttribute('aria-hidden','true');
    Object.assign(carried.style,{position:'fixed',zIndex:'161',pointerEvents:'none',left:tokenRect.left+'px',top:tokenRect.top+'px',width:tokenRect.width+'px',height:tokenRect.height+'px',display:'block'});
    const replica=original.cloneNode(true);
    for(const property of style)replica.style.setProperty(property,style.getPropertyValue(property),style.getPropertyPriority(property));
    Object.assign(replica.style,{position:'absolute',left:'0',top:'0',right:'auto',bottom:'auto',inset:'auto',margin:'0',width:tokenRect.width+'px',height:tokenRect.height+'px',maxWidth:'none',maxHeight:'none',animation:'none',transition:'none'});
    carried.append(replica);layer.append(carried);
    const travelX=goal.left+goal.width/2-(tokenRect.left+tokenRect.width/2),travelY=goal.top+goal.height/2-(tokenRect.top+tokenRect.height/2);
    carried.animate([{offset:0,opacity:1,transform:'translate(0,0)'},{offset:.3,opacity:1,transform:'translate(0,0)'},{offset:.48,opacity:1,transform:'translate(0,0)'},{offset:.88,opacity:1,transform:`translate(${travelX}px,${travelY}px)`},{offset:1,opacity:0,transform:`translate(${travelX}px,${travelY}px)`}],{duration:timing.escort,easing:'ease-in-out',fill:'forwards'});
   }
   timer=setTimeout(contact,timing.escort*.3);watchdog=setTimeout(finish,timing.escort+350);
   const dx=targetX-startX,dy=goalY-targetY;
   guard.animate([{offset:0,opacity:0,transform:'scale(.8)'},{offset:.3,opacity:1,transform:`translateX(${dx}px)`},{offset:.48,opacity:1,transform:`translateX(${dx}px)`},{offset:.88,opacity:1,transform:`translate(${goalX-startX}px,${dy}px)`},{offset:1,opacity:0,transform:`translate(${goalX-startX}px,${dy}px) scale(.8)`}],{duration:timing.escort,easing:'ease-in-out',fill:'forwards'}).finished.then(finish,finish);
  }catch(error){console.warn('護送演出を復旧',error);finish()}
 }
 function animateDesertion({cell,layer,side,valid=()=>true,onDepart=()=>{},onFinished=()=>{}}){
  const rect=cell?.getBoundingClientRect();let departed=false,finished=false,timer,watchdog,ghost=null;
  const depart=()=>{if(departed||!valid())return;departed=true;onDepart()};
  const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);clearTimeout(watchdog);ghost?.remove();if(valid()){depart();onFinished()}};
  if(!rect||!layer||!root.Element?.prototype.animate||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){depart();setTimeout(finish,180);return}
  const width=Math.min(72,Math.max(42,rect.width*1.15)),height=width*1.4;
  ghost=document.createElement('img');ghost.src='assets/sprites/figures/'+(side===0?'shinsengumi_back':'saccho_front')+'.webp';ghost.alt='';
  Object.assign(ghost.style,{position:'fixed',left:rect.left+rect.width/2-width/2+'px',top:rect.top+rect.height/2-height/2+'px',width:width+'px',height:height+'px',objectFit:'contain',pointerEvents:'none'});layer.append(ghost);
  timer=setTimeout(depart,120);watchdog=setTimeout(finish,3100);const travel=side===0?-root.innerWidth:root.innerWidth;
  try{ghost.animate([{offset:0,opacity:1,transform:'rotate(0)'},{offset:.12,transform:'rotate(-8deg)'},{offset:.24,transform:'rotate(8deg)'},{offset:.38,transform:'rotate(-6deg)'},{offset:.62,opacity:1,transform:`translate(${travel*.42}px,-38px) rotate(-15deg)`},{offset:1,opacity:0,transform:`translate(${travel}px,${-rect.top-100}px) rotate(16deg) scale(.5)`}],{duration:timing.desertion,easing:'ease-in-out',fill:'forwards'}).finished.then(finish,finish)}catch(error){console.warn('脱走演出を復旧',error);finish()}
 }
 root.ShinsengumiBattlePresentation=Object.freeze({timing,moveVoices,animateEscort,animateDesertion});
})(typeof window!=='undefined'?window:globalThis);
