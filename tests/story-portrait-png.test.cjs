// Verify the entire PNG compressed stream, not just its header or onload event.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const intro=fs.readFileSync(path.join(root,'card-ai-test.html'),'utf8');
const files=[...fs.readdirSync(path.join(root,'assets/story/victory')).filter(n=>n.endsWith('.png')).map(n=>'assets/story/victory/'+n),
 'assets/story/shutsujin_shinsengumi_seven.png'];
const broken=[];
for(const file of files){
 const bytes=fs.readFileSync(path.join(root,file));
 let pos=8,parts=[];
 try{
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  while(pos+12<=bytes.length){
   const len=bytes.readUInt32BE(pos),type=bytes.toString('ascii',pos+4,pos+8);
   if(pos+12+len>bytes.length)throw Error('truncated chunk');
   if(type==='IDAT')parts.push(bytes.subarray(pos+8,pos+8+len));
   pos+=12+len;
   if(type==='IEND')break;
  }
  zlib.inflateSync(Buffer.concat(parts));
 }catch(error){broken.push(file)}
}
if(broken.length){
 assert.match(source,/const verifiedPortraitsAvailable=Boolean\(winnerArt&&loserArt\)/);
 assert.match(source,/miyabe_winner_drive\.webp/);
 assert.match(source,/kondo_loser_drive\.webp/);
 assert.doesNotMatch(source,/const winnerArt="assets\/story\/victory\/"\+winnerId\+"_winner\.png"/);
 assert.doesNotMatch(intro,/shinsengumi\.src='assets\/story\/shutsujin_shinsengumi_seven\.png/);
 console.warn(`KNOWN DAMAGED ASSETS (safely disabled): ${broken.length}/${files.length}`);
}else{
 assert.equal(broken.length,0);
}
console.log('PASS: damaged original artwork is identified and never presented partially');
