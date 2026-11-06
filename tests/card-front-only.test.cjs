const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const storyJs=read('story-mode.js');
const storyCss=read('story-mode.css');
const storyHtml=read('story-mode.html');
const finished=read('card-ai-test.html');

for(const [name,source] of [['story-mode.css',storyCss],['story-mode.html',storyHtml],['card-ai-test.html',finished]]){
 assert.doesNotMatch(source,/card-back-(?:shinsengumi|saccho)-1024x1536\.webp/,`${name}: incident back image remains`);
}
assert.doesNotMatch(storyHtml,/compact-card-back|compact-card-front/,'story DOM should have one illustrated card');
assert.doesNotMatch(finished,/card-front-art|#cardFace::before/,'completed DOM should have one illustrated card');
assert.match(storyJs,/overlay\.classList\.remove\("hidden"\);sfx\("card"\);compactCardReveal\(\)/,'story incident must reveal automatically');
assert.match(storyJs,/overlay\.classList\.remove\("hidden"\);sfx\("card"\);face\.click\(\)/,'story weapon must reveal automatically');
assert.match(finished,/playFx\('card'\);\s*void face\.offsetWidth;\s*revealCard\(\)/,'completed incident must reveal automatically');
console.log('PASS: incident cards in all story chapters and finished mode use only the face');
