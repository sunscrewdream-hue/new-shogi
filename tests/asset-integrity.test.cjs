// Checks literal asset paths in every HTML, CSS and JavaScript source file.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(root).filter(name=>/\.(html|css|js)$/.test(name));
const missing=[];let references=0;
for(const name of files){
 const source=fs.readFileSync(path.join(root,name),'utf8');
 for(const match of source.matchAll(/assets\/[A-Za-z0-9_./-]+\.(?:png|webp|jpg|jpeg|mp3|wav|svg|part|ogg)/g)){
  references++;
  if(!fs.existsSync(path.join(root,match[0])))missing.push(`${name}: ${match[0]}`);
 }
}
assert.deepEqual(missing,[],`Broken asset references:\n${missing.join('\n')}`);
console.log(`PASS: ${references} static asset references across ${files.length} game files`);
