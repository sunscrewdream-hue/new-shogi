// Rebuild character banners from approved collection portraits.
// Requires: npm install --no-save sharp
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const root=path.resolve(__dirname,'..');
const input=path.join(root,'assets/collection');
const output=path.join(root,'assets/dialogue_banners');
const background=path.join(root,'assets/dialogue_banners/banner-background.webp');
// Optional staging directory for visual QA before replacing live assets.
const stagingDir=process.env.BANNER_OUTPUT_DIR;
// person_01.webp (approved Kondo Isami) is the immutable master.
// Hand-reviewed landmarks (face left/right edges, eye-line Y) measured on
// the 256x173 top section of each approved 768x1152 collection portrait.
// Face width normalization is isotropic: never distort an individual's
// anatomy or rotate a portrait merely to force facial points to coincide.
const landmarks={
  2:[105,171,76], 3:[112,178,79], 4:[104,180,73], 5:[135,199,80],
  6:[107,181,78], 7:[110,179,77], 8:[142,203,79], 9:[127,194,72],
  10:[130,195,78], 11:[99,178,70], 12:[101,180,78], 13:[104,183,70],
  14:[99,169,98], 15:[101,188,82], 16:[80,151,100], 17:[104,175,76],
  18:[99,171,90], 19:[110,184,74], 20:[103,178,90],
  21:[90,175,70], 22:[102,170,79], 23:[105,170,78], 24:[98,169,79],
  25:[99,171,85], 26:[78,178,86], 27:[100,183,94], 28:[104,172,85],
  29:[95,173,86], 30:[100,177,90], 31:[88,169,91], 32:[96,166,73],
  33:[112,181,76], 34:[120,178,77], 35:[110,166,75], 36:[87,181,95],
  37:[97,176,82], 38:[100,174,80], 39:[113,184,89], 40:[95,172,96]
};
const MASTER_FACE_WIDTH=189; // Kondo Isami's accepted banner, cheek-to-cheek
const MASTER_EYE_Y=61;
const MASTER_FACE_CENTER_X=648;
const REFERENCE_WIDTH=256;
const WORKING_SOURCE_WIDTH=510;
// Second-pass art-direction corrections, relative to the measured face bounds.
// [isotropic scale factor, vertical shift (px), horizontal shift (px)].
// Positive Y moves the entire portrait down. No stretch or face retouching.
const corrections={
  // Hijikata: pull back from the oversized close-up and align toward Kondo.
  2:[0.86,0,24],
  // Mobile gallery review: keep these faces away from the left-side copy.
  8:[1,0,25],9:[1,0,23],10:[1,0,23],
  11:[1,2,0],12:[1,2,0],13:[1,1,0],
  15:[0.96,-3,0],17:[0.90,5,0],19:[0.97,0,0],
  21:[1.13,-3,0],22:[0.91,-4,0],23:[0.96,-6,21],
  25:[0.93,-4,0],27:[0.96,-4,0],28:[0.86,-3,0],
  29:[0.97,-3,0],30:[0.96,-10,21],
  32:[1.10,-10,0],33:[1.07,-8,0],34:[0.92,-2,0],
  35:[0.92,0,0],36:[1.13,-4,0],39:[1,0,12]
};
const finalOutput=stagingDir||output;
fs.mkdirSync(finalOutput,{recursive:true});

(async()=>{
 const W=880,H=174;
 const paper=await sharp(background).resize({width:W}).extract({left:0,top:33,width:W,height:H}).png().toBuffer();
 // Keep the transition in the background/shoulder area. At 35% it washed
 // across cheeks and mouths; 18% reaches full opacity before the face.
 const mask=Buffer.from(`<svg width="510" height="174" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.18" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><rect width="510" height="174" fill="url(#fade)"/></svg>`);
 const border=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="870" height="164" fill="none" stroke="#866a44" stroke-width="2" opacity=".85"/><path d="M12 169H868" stroke="#f1dfb2" stroke-width="2" opacity=".8"/></svg>`);
 for(let i=1;i<=40;i++){
  const id=String(i).padStart(2,'0');
  const dest=path.join(finalOutput,`person_${id}.webp`);
  if(i===1){continue}
  const source=path.join(input,`${id}.webp`);
  const marks=landmarks[i];
  if(!marks)throw Error(`Missing individually reviewed landmarks for ${id}`);
  const [faceLeft,faceRight,eyeY]=marks;
  const unscaledFaceWidth=(faceRight-faceLeft)*WORKING_SOURCE_WIDTH/REFERENCE_WIDTH;
  // Angled and profile portraits may have a narrower projected cheek width.
  // A modest clamp protects these face shapes from unnatural over-magnification.
  const [scaleAdjust,verticalShift,horizontalShift]=corrections[i]||[1,0,0];
  const scale=Math.max(1.0,Math.min(1.5,MASTER_FACE_WIDTH/unscaledFaceWidth))*scaleAdjust;
  const scaledWidth=Math.round(WORKING_SOURCE_WIDTH*scale);
  const nativeToScaled=scaledWidth/REFERENCE_WIDTH;
  const center=(faceLeft+faceRight)/2;
  const extractLeft=Math.round(center*nativeToScaled-(MASTER_FACE_CENTER_X+horizontalShift-370));
  const extractTop=Math.round(eyeY*nativeToScaled-(MASTER_EYE_Y+verticalShift));
  if(extractTop<0){
    throw Error(`Invalid portrait crop for ${id}: ${JSON.stringify({scale,extractLeft,extractTop,scaledWidth})}`);
  }
  const visibleLeft=Math.max(0,extractLeft);
  const visibleRight=Math.min(scaledWidth,extractLeft+510);
  const visibleWidth=visibleRight-visibleLeft;
  if(visibleWidth<=0)throw Error(`Portrait outside frame: ${id}`);
  const cropped=await sharp(source).resize({width:scaledWidth})
    .extract({left:visibleLeft,top:extractTop,width:visibleWidth,height:H})
    .ensureAlpha().png().toBuffer();
  const art=await sharp({create:{width:510,height:H,channels:4,background:'#00000000'}})
    .composite([{input:cropped,left:visibleLeft-extractLeft,top:0}]).png().toBuffer();
  const faded=await sharp(art).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  await sharp(paper).composite([{input:faded,left:370,top:0},{input:border,left:0,top:0}]).webp({quality:86,effort:5}).toFile(dest);
 }
 console.log('Generated 39 derived banners (Kondo master unchanged) to '+finalOutput);
})().catch(e=>{console.error(e);process.exitCode=1});
