const fs=require('fs'),{chromium}=require('/tmp/shogi-playwright/node_modules/playwright');
(async()=>{
 const base='http://127.0.0.1:8765/';
 const pages=['index.html','card-ai-test.html','story-mode.html','collection.html','history.html','manual.html','manual-en.html','rules.html','movies.html'];
 const bin=process.env.CHROME_EXEC;
 const browser=await chromium.launch({headless:true,...(bin?{executablePath:bin}:{})});
 const report={pages:[],errors:[],consoleErrors:[]};
 for(const mode of ['desktop','mobile']){
  const ctx=await browser.newContext(mode==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1365,height:820}});
  for(const file of pages){
   const page=await ctx.newPage(),js=[],http=[],failed=[];
   page.on('pageerror',x=>js.push(x.message.slice(0,250)));
   page.on('console',x=>{if(x.type()==='error')report.consoleErrors.push(mode+' '+file+' '+x.text().slice(0,220))});
   page.on('response',x=>{if(x.status()>=400&&x.url().startsWith(base))http.push(x.status()+' '+x.url().split('?')[0].replace(base,''))});
   page.on('requestfailed',x=>{const reason=x.failure()?.errorText||'';if(x.url().startsWith(base)&&!reason.includes('ERR_ABORTED'))failed.push(reason+' '+x.url().replace(base,''))});
   let status='ok',overflow=0;
   try{
    const response=await page.goto(base+file,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(1000);
    if(!response||response.status()>=400)status='HTTP '+(response?.status()||'none');
    overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
    if(file==='card-ai-test.html'){
      const count=await page.locator('#titleLinks a').count();
      if(count!==5)report.errors.push(mode+' title links '+count+' expected 5');
      if(!await page.locator('a[href="movies.html"]').count())report.errors.push(mode+' missing title movie link');
    }
    if(file==='story-mode.html'){
      const count=await page.locator('#storyChapters > *').count();
      if(count<1)report.errors.push(mode+' story chapters not populated');
    }
    if(file==='movies.html'){
      const media=await page.evaluate(async()=>{const r=await fetch('assets/movies/yamanami-final-1865.mp4',{method:'HEAD'});return {status:r.status,type:r.headers.get('content-type')}});
      if(media.status!==200||!media.type?.includes('video/mp4'))report.errors.push(mode+' movie HEAD '+JSON.stringify(media));
    }
   }catch(e){status='FAIL '+e.message.slice(0,180)}
   if(status!=='ok'||js.length||http.length||failed.length||overflow>3)report.errors.push([mode,file,status,...js,...http,...failed,'overflow='+overflow].join(' | '));
   report.pages.push({mode,page:file,status,js,http,failed,overflow});
   await page.close();
  }
  await ctx.close();
 }

 for(const mode of ['desktop','mobile']){
  const ctx=await browser.newContext(mode==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1365,height:820}});
  for(const route of ['card-ai-test.html','story-mode.html']){
   const page=await ctx.newPage();const js=[];
   page.on('pageerror',e=>js.push(e.message.slice(0,230)));
   try{
    await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
    const mix=await page.evaluate(()=>{
     const range=document.getElementById('audioMixvoice');
     const mixer=window.ShinsengumiAudioMixer;
     if(!range||!mixer)return 'missing UI or mixer';
     const before=mixer.get('voice');
     range.value='37';range.dispatchEvent(new Event('input',{bubbles:true}));
     const observed=mixer.get('voice');mixer.set('voice',before);
     return observed===37?'ok':'input did not update voice: '+observed;
    });
    if(mix!=='ok')report.errors.push(mode+' '+route+' real-time audio fader: '+mix);
    if(route==='card-ai-test.html'){
     await page.locator('#startGame').click({timeout:15000});
     await page.waitForFunction(()=>document.getElementById('titleScreen')?.classList.contains('hidden'),null,{timeout:20000});
     await page.waitForTimeout(900);
     const cells=await page.locator('#board .sq').count();
     if(cells!==81)report.errors.push(mode+' normal match board cells: '+cells+' (expected 81)');
    }else{
     await page.locator('#storyChapters .chapter').nth(1).click({timeout:15000});
     await page.waitForFunction(()=>!document.getElementById('storyDialogue')?.classList.contains('hidden'),null,{timeout:26000});
     const heading=await page.locator('#dialogueTitle').innerText();
     if(!heading.trim())report.errors.push(mode+' first story chapter dialogue missing');
    }
    if(js.length)report.errors.push(mode+' '+route+' gameplay navigation JS: '+js.join(' | '));
    report.pages.push({mode,interactive:route,status:'checked'});
   }catch(e){report.errors.push(mode+' '+route+' interactive smoke: '+e.message.slice(0,250));}
   await page.close();
  }
  await ctx.close();
 }
 await browser.close();
 fs.mkdirSync('/tmp/shogi-finalqa',{recursive:true});
 fs.writeFileSync('/tmp/shogi-finalqa/browser.json',JSON.stringify(report,null,2));
 console.log('BROWSER_TEST_PAGES',report.pages.length,'ERRORS',report.errors.length,'CONSOLE_ERRORS',report.consoleErrors.length);
 for(const x of report.errors)console.log('BROWSER_ERROR',x);
 for(const x of report.consoleErrors.slice(0,50))console.log('CONSOLE_ERROR',x);
})().catch(e=>{console.log('BROWSER_FATAL',e.stack);process.exit(1)});
