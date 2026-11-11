/* English story text is kept separate from battle logic and historical Japanese source. */
(()=>{
 'use strict';
 let language='ja';try{language=localStorage.getItem('shinsengumi-shogi-language-v1')||'ja'}catch{}
 if(language!=='en'||!window.StoryData)return;
 const D=window.StoryData;
 const chapters=[
  [
   `Kyoto, 1864. Yamazaki Susumu, a Shinsengumi intelligence officer, rushes to Hijikata Toshizō.\nYamazaki: “Hijikata! Rumor has it that radical loyalist rōnin plan to set Kyoto ablaze and abduct the Emperor amid the chaos!”`,
   `Hijikata Toshizō: “What?! We cannot ignore this. Yamazaki, investigate further!”`,
   `The Shinsengumi follow the trail and learn that the loyalist activists are meeting at the Ikedaya inn near Sanjō Bridge.`,
   `Among them are Miyabe Teizō of Higo and activists from Chōshū, Tosa, and other domains. Kondō Isami and his men march on Ikedaya to prevent violence in Kyoto.`,
   `Kondō Isami: “Shinsengumi! Official inspection!”`
  ],
  [
   `July 1864. The Chōshū domain has lost many comrades in the Ikedaya Incident. Filled with anger and grief, Kusaka Genzui and his men advance on Kyoto. The capital braces for another battle.`,
   `Troops from Aizu, Satsuma, Kuwana, and other domains guard the Imperial Palace. The opposing forces collide. Cannon fire echoes at the Hamaguri Gate, and black smoke rises above Kyoto.`,
   `The Shinsengumi, charged with helping keep peace in Kyoto, join the fighting.\nHijikata Toshizō: “Chōshū's finest are coming. We cannot let them through! All men, prepare yourselves!”`,
   `Chōshū troops advance through flames and smoke.\nKondō Isami: “Fear nothing! We are the Shinsengumi, defenders of Kyoto! Fight with honor beneath our banner of Sincerity! To battle!”`
  ],
  [
   `1867. Itō Kashitarō, once a senior strategist of the Shinsengumi, leaves the unit with Tōdō Heisuke and other followers.`,
   `They establish the Goryō Eji (Imperial Tomb Guards) and deepen ties with activists from other domains. Their beliefs, however, are at odds with those of Kondō Isami and Hijikata Toshizō.`,
   `Disturbing news reaches the Shinsengumi: Itō's group is in conflict with them and is said to be plotting Kondō's death. Former comrades may soon become enemies.`,
   `Hijikata Toshizō: “Itō... are you truly preparing to cross swords with us?”`,
   `Hijikata: “We may differ in our ideals. But if they threaten the commander's life, that changes everything!”\nKondō: “Toshi... we may have to fight men who once stood beside us.”`,
   `Hijikata: “I understand. There is no turning back!”\nNovember 18, 1867. A deadly confrontation approaches on Kyoto's Aburanokōji street.`,
   `Itō Kashitarō awaits them. Yet among his supporters is Tōdō Heisuke, once one of their own. They may have to fight him as well...`,
   `Hijikata: “Cast aside your doubts! We carry the Shinsengumi's honor! Draw your swords! To battle!”`
  ],
  [
   `1867. Through the efforts of Sakamoto Ryōma and others, the Tokugawa shogunate returns political authority to the Imperial Court, ending more than 260 years of shogunal rule.`,
   `Many hope the age of war is over. But Japan is moving toward yet another conflict.`,
   `Satsuma and Chōshū, once rivals, have already forged an alliance: the Satchō Alliance.`,
   `Even after the return of power, their conflict with the former shogunate persists. Armed confrontation becomes inevitable.`,
   `January 1868, south of Kyoto: Toba and Fushimi. The former shogunate forces greatly outnumber the new government army. But the opposing side possesses formidable weapons.`,
   `Western-style rifles—and cannons! Artillery roars, bullets rain down, and the age of the sword begins to fade.`,
   `The Shinsengumi join the fighting.\nHijikata: “They have modern guns and artillery. Swords alone will not make this easy...”\nKondō: “Toshi, even so, we cannot retreat.”`,
   `Hijikata: “Of course, Commander! We have survived countless brushes with death. What have we to fear now?”`,
   `Artillery shakes the earth. Through the gunsmoke comes the new government army, led by Satsuma and Chōshū. A decisive battle awaits the Shinsengumi.`,
   `Kondō: “Listen well, men! Times may change, but our sincerity never will. Even if the whole country opposes us, show them the spirit of the Shinsengumi!”`,
   `Hijikata: “Draw your swords! The Shinsengumi's great battle begins! Charge!”`
  ]
 ];
 const titles=['Ikedaya Incident','Kinmon Incident','Aburanokōji Incident','Battle of Toba–Fushimi'];
 const endings=[
  'Dawn breaks over Kyoto. The Shinsengumi name echoes throughout the capital.',
  'Fires spread through Kyoto. Kusaka Genzui loses his life in the Kinmon Incident.',
  'The pain of losing former comrades cannot be erased by victory or defeat.',
  'Victory on the board cannot change history. The Shinsengumi retreat toward their next fate.'
 ];
 D.chapters.forEach((chapter,i)=>{
  chapter.title=titles[i];chapter.outro=endings[i];
  chapter.intro.forEach((line,j)=>{if(chapters[i][j])line[1]=chapters[i][j]});
 });
 D.prologue.title='The Oath at Mibu';
 const prologue=[
  `The final years of the shogunate. Kyoto is troubled by a wave of assassinations carried out in the name of “divine punishment.”`,
  `In 1863, the Rōshigumi is formed in Edo on Kiyokawa Hachirō's proposal, ostensibly to protect Shogun Tokugawa Iemochi during his visit to Kyoto. Kondō Isami, Hijikata Toshizō, and their comrades from the Shieikan dojo join the journey.`,
  `In Kyoto, however, Kiyokawa reveals that the group's purpose is not guarding the shogun but supporting the Emperor and expelling foreign influence. He orders a return to Edo, but Kondō and his comrades choose to remain.`,
  `Together with Serizawa Kamo and others, they establish the Mibu Rōshigumi under the protection of Matsudaira Katamori, Kyoto's Military Commissioner. Tasked with maintaining order, they eventually take the name Shinsengumi. Their story of loyalty begins.`
 ];
 D.prologue.intro.forEach((line,i)=>{line[1]=prologue[i]});
 D.epilogue.title='The Fate of Sincerity';
 const epilogue=[
  `After retreating from Toba–Fushimi, the Shinsengumi reorganize as the Kōyō Chinbutai, but the war turns against them.`,
  `Kondō Isami surrenders to the new government army at Nagareyama. He is executed at Itabashi in April 1868.`,
  `Hijikata Toshizō travels through Aizu to Hakodate, where he fights alongside Enomoto Takeaki and others in a final campaign.`,
  `In May 1869, Hijikata dies in battle at Hakodate. The history of the Shinsengumi comes to an end.`,
  `Yet their spirit of sincerity is remembered across generations.`
 ];
 D.epilogue.intro.forEach((line,i)=>{line[1]=epilogue[i]});
})();
