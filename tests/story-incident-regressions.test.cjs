// Run: node tests/story-incident-regressions.test.cjs
// Guard against silent incident cards, stuck banners, and unplayable results.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'story-mode.js'),'utf8');
const complete=fs.readFileSync(path.join(root,'card-ai-test.html'),'utf8');

assert.match(source,/playGestureAudio\(compactCardVoices\[kind\],done,"voice"\)/,
 'Incident narration must use the gesture-unlocked channel');
assert.match(source,/if\(!hold\)\{/,
 'An awakened officer must not leave the portrait displayed forever');
assert.match(source,/setTimeout\(\(\)=>\{if\(game!==epoch\|\|completed\)return;escortDone=true;voiceDone=true;resume\(\)\},4500\)/,
 'Defection must recover if Safari loses the animation/audio completion');
assert.match(source,/const verifiedPortraitsAvailable=Boolean\(winnerArt&&loserArt\)/,
 'Do not render truncated PNG cutouts; require two recovered portraits');
assert.doesNotMatch(complete,/shinsengumi\.src='assets\/story\/shutsujin_shinsengumi_seven\.png/,
 'Do not load the damaged seven-person PNG into the intro');

const begin=source.indexOf('function compactPickCard(side){');
const end=source.indexOf('\nfunction compactCardInterval()',begin);
const expression=source.slice(begin,end)+'\ncompactPickCard';
assert.ok(begin>=0&&end>begin);
for(const stage of [0,1,2,3])for(const side of [0,1]){
 const options={stage,compactCardWeights:[['何事もなし',45],['寝返り',15],['援軍',10],['脱走',15],['粛清',10],['大地震',5]],
  weapons:[],compactEligible:()=>[],Math:{random:()=>.99999}};
 const draw=vm.runInNewContext(expression,options);
 const kind=draw(side);
 assert.ok(!['寝返り','脱走','粛清'].includes(kind),
  `Ineligible incident ${kind} drawn in chapter ${stage}, side ${side}`);
}
console.log('PASS: safe card draws in all chapters, unlocked audio, banner expiry, escort recovery, art fallback');
