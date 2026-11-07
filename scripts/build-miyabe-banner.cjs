// Compose the approved Miyabe Teizo character sheet portrait into the
// same 880x174 dialogue-banner framing used by the forty-person roster.
const sharp=require('sharp');
const path=require('path');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'assets/story/kings/miyabe-approved-source.webp');
const background=path.join(root,'assets/dialogue_banners/banner-background.webp');
const output=path.join(root,'assets/story/kings/miyabe_banner.webp');

(async()=>{
  const W=880,H=174;
  const paper=await sharp(background).resize({width:W})
    .extract({left:0,top:33,width:W,height:H}).png().toBuffer();
  const scaled=await sharp(source).resize({width:279}).png().toBuffer();
  const crop=await sharp(scaled).extract({left:0,top:56,width:279,height:H}).png().toBuffer();
  const feather=Buffer.from(`<svg width="279" height="174" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="0.11" stop-color="white" stop-opacity="1"/><stop offset="0.87" stop-color="white" stop-opacity="1"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><rect width="279" height="174" fill="url(#a)"/></svg>`);
  const portrait=await sharp(crop).ensureAlpha().composite([{input:feather,blend:'dest-in'}]).png().toBuffer();
  const border=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="870" height="164" fill="none" stroke="#866a44" stroke-width="2" opacity=".85"/><path d="M12 169H868" stroke="#f1dfb2" stroke-width="2" opacity=".8"/></svg>`);
  await sharp(paper).composite([{input:portrait,left:525,top:0},{input:border,left:0,top:0}])
    .webp({quality:86,effort:5}).toFile(output);
  console.log(output);
})().catch(e=>{console.error(e);process.exitCode=1});
