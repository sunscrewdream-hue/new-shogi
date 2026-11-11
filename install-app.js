/* Shared, platform-aware home-screen installation guide for the title page. */
(()=>{
 'use strict';
 let pendingPrompt=null;
 const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const isAndroid=/Android/i.test(navigator.userAgent);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingPrompt=event;});
 const initialize=()=>{
  const extras=document.getElementById('titleExtras');
  if(!extras)return;
  const button=document.createElement('button');
  button.type='button';button.id='installAppButton';button.textContent='📲 ホーム画面に追加';
  button.setAttribute('aria-haspopup','dialog');
  const dialog=document.createElement('dialog');
  dialog.id='installAppDialog';dialog.className='install-app-dialog';
  dialog.setAttribute('aria-labelledby','installAppHeading');
  dialog.innerHTML='<div class="install-app-head"><h2 id="installAppHeading">ホーム画面に追加</h2><button type="button" class="install-app-close" aria-label="閉じる">×</button></div><div class="install-app-body"><p id="installAppIntro"></p><ol id="installAppSteps"></ol><p id="installAppTip" class="install-app-tip"></p><button type="button" id="installAppConfirm" hidden>ホーム画面に追加する</button></div>';
  const intro=dialog.querySelector('#installAppIntro');
  const steps=dialog.querySelector('#installAppSteps');
  const tip=dialog.querySelector('#installAppTip');
  const confirm=dialog.querySelector('#installAppConfirm');
  const setSteps=items=>{steps.replaceChildren(...items.map(item=>{const li=document.createElement('li');li.textContent=item;return li;}));};
  const present=()=>{
   confirm.hidden=true;
   if(isIOS){
    intro.textContent='iPhone／iPadではSafariのメニューから追加できます。';
    setSteps(['Safariでこのゲームのページを開く。','画面の共有ボタン（またはページメニューから「共有」）を押す。','「ホーム画面に追加」を選び、必要に応じて「Webアプリとして開く」を有効にする。','右上の「追加」を押す。']);
    tip.textContent='Safari以外で開いている場合は、URLをSafariで開いてください。';
   }else if(isAndroid){
    intro.textContent='Androidではホーム画面にゲームのアイコンを追加できます。';
    setSteps(['Chromeなどの対応ブラウザでこのページを開く。','ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選ぶ。','確認画面に従って追加する。']);
    tip.textContent=pendingPrompt?'下のボタンから追加画面を開くこともできます。':'追加画面が出ない場合は、ブラウザのメニューから操作してください。';
    confirm.hidden=!pendingPrompt;
   }else{
    intro.textContent='スマートフォンでこのページを開くと、ゲームのアイコンをホーム画面に追加できます。';
    setSteps(['iPhoneではSafariの「共有」から「ホーム画面に追加」を選ぶ。','AndroidではChromeのメニューから「アプリをインストール」または「ホーム画面に追加」を選ぶ。']);
    tip.textContent='対応するブラウザやOSによって表示名・操作方法が異なります。';
   }
   dialog.showModal();
   dialog.querySelector('.install-app-close').focus();
  };
  button.addEventListener('click',present);
  confirm.addEventListener('click',async()=>{
   if(!pendingPrompt)return;
   const prompt=pendingPrompt;pendingPrompt=null;confirm.hidden=true;
   try{await prompt.prompt();const result=await prompt.userChoice;
    if(result?.outcome==='accepted'){dialog.close()}else{tip.textContent='追加をキャンセルしました。必要ならブラウザのメニューからもう一度お試しください。'}
   }catch{tip.textContent='ブラウザのメニューから「ホーム画面に追加」を選んでください。'}
  });
  const close=()=>dialog.close();
  dialog.querySelector('.install-app-close').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
  dialog.addEventListener('close',()=>button.focus());
  window.addEventListener('appinstalled',()=>{pendingPrompt=null;button.hidden=true;dialog.close()});
  if(installed())button.hidden=true;
  const settings=document.getElementById('titleSettingsButton');
  if(settings)settings.after(button);else extras.append(button);
  document.body.append(dialog);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
