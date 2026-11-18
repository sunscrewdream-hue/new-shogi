"use strict";
const castGroups=[
 {title:"新選組",names:["近藤勇","土方歳三","沖田総司","井上源三郎","山南敬助","永倉新八","斎藤一","藤堂平助","原田左之助","武田観柳斎","谷三十郎","島田魁","尾形俊太郎","山崎烝","松原忠司","佐々木愛次郎","河合耆三郎","中村五郎","安藤早太郎","新見錦"]},
 {title:"各藩",section:true},
 {title:"長州藩",names:["木戸孝允","山県有朋","伊藤博文","高杉晋作","大村益次郎","井上馨","久坂玄瑞","前原一誠","品川弥二郎","来島又兵衛","国司信濃","福原越後","益田右衛門介","入江九一","寺島忠三郎","児玉小民部","楳本仙之助","湯川庄蔵","有川常槌","三隅竜雄","内田弥三郎","若杉弘之進","澄川謙蔵","中尾易三郎","中村総治","山田顕義","福田侠平","世良修蔵","三浦梧楼"]},
 {title:"薩摩藩",names:["西郷隆盛","大久保利通","大山巌","黒田清隆","桐野利秋","村田新八","桂久武","小松帯刀","西郷従道","川村純義","寺島宗則","伊地知正治","吉井友実","篠原国幹","野津鎮雄","市来勘兵衛","鈴木武五郎","辺見十郎太","樺山資紀","川路利良"]},
 {title:"会津藩",names:["佐川官兵衛","林権助","田中土佐","堀半右衛門","生駒五兵衛","上田八郎右衛門","白井五郎太夫","小原宇右衛門","佐藤織之助","中澤常左衛門"]},
 {title:"土佐藩",names:["石川潤次郎","北添佶摩","望月亀弥太"]},
 {title:"肥後藩",names:["宮部鼎蔵","松田重助"]},
 {title:"諸藩の志士",names:["真木和泉","大高又次郎","福岡祐次郎"]},
 {title:"御陵衛士",names:["藤堂平助","服部武雄","毛内有之助","鈴木三樹三郎","篠原泰之進","加納鷲雄","富山弥兵衛"]}
];
const $=selector=>document.querySelector(selector);
const addLine=(parent,className,text)=>{const el=document.createElement("div");el.className=className;el.textContent=text;parent.append(el);return el};
function startCredits(){
 const duration=Number($("input[name='previewDuration']:checked").value);
 $("#previewGate").hidden=true;
 const overlay=document.createElement("section");overlay.id="storyCreditsOverlay";overlay.className="story-credits-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","新選組将棋 エンドロール");
 const intro=document.createElement("div");intro.className="story-credits-intro";const logo=document.createElement("img");logo.src="assets/logo-shinsengumi-sumi-watercolor.webp";logo.alt="新選組将棋";intro.append(logo);
 const track=document.createElement("div");track.className="story-credits-track";track.style.animationDuration=duration+"s";
 addLine(track,"story-credits-heading","出演");
 for(const group of castGroups){if(group.section){addLine(track,"story-credits-section","各藩");continue}const section=document.createElement("section");section.className="story-credits-group";addLine(section,"story-credits-group-title",group.title);const names=document.createElement("div");names.className="story-credits-names";for(const name of group.names)addLine(names,"story-credits-name",name);section.append(names);track.append(section)}
 const music=document.createElement("section");music.className="story-credits-music";addLine(music,"story-credits-group-title","音楽");addLine(music,"story-credits-music-title","「華」");addLine(music,"story-credits-name","サンズオアクラウド");addLine(music,"story-credits-music-note","作詞・作曲　サンズオアクラウド");track.append(music);
 const final=document.createElement("section");final.className="story-credits-final";addLine(final,"story-credits-final-label","製作・著作");addLine(final,"story-credits-final-name","Mabii");track.append(final);
 const skip=document.createElement("button");skip.type="button";skip.className="story-credits-skip";skip.textContent="エンドロールをスキップ";overlay.append(intro,track,skip);document.body.append(overlay);
 const musicClip=new Audio("assets/華_Endroll_Master_256k.mp3");musicClip.preload="auto";musicClip.volume=.72;void musicClip.play().catch(error=>console.warn("プレビュー音源を再生できません",error));
 let closed=false;let holdTimer=null;
 const close=()=>{if(closed)return;closed=true;overlay.classList.add("is-fading");const start=musicClip.volume;let step=0;const fade=setInterval(()=>{step++;musicClip.volume=Math.max(0,start*(1-step/30));if(step>=30){clearInterval(fade);musicClip.pause();musicClip.currentTime=0}},200);setTimeout(()=>{clearInterval(fade);musicClip.pause();overlay.remove();$("#previewGate").hidden=false},6200)};
 const hold=()=>{if(closed||holdTimer!==null)return;holdTimer=setTimeout(close,8000)};
 track.addEventListener("animationend",event=>{if(event.animationName==="story-credits-rise")hold()});
 setTimeout(hold,(duration+4.5)*1000);
 skip.addEventListener("click",close);
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!closed)close()},{once:true});
}
$("#previewStart").addEventListener("click",startCredits);
