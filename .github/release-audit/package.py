from pathlib import Path
import csv,hashlib,json,zipfile,subprocess,shutil
root=Path('.');qa=Path('/tmp/shogi-finalqa');qa.mkdir(exist_ok=True)
stat=json.loads((qa/'static.json').read_text('utf-8'))
try:browser=json.loads((qa/'browser.json').read_text('utf-8'))
except Exception as e:browser={'pages':[],'errors':['browser test did not complete: '+str(e)],'consoleErrors':[]}
assets=sorted([p for p in root.rglob('*') if p.is_file() and (str(p).startswith('assets/') or len(p.parts)==1 and p.suffix.lower() in ('.html','.js','.css','.png','.webmanifest','.svg'))],key=lambda p:p.as_posix())
dest=Path('dist');dest.mkdir(exist_ok=True)
name='新選組将棋_別サーバー公開用_20261112.zip'
zip_path=dest/name
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for p in assets:z.write(p,p.as_posix())
with zipfile.ZipFile(zip_path) as z:
 corrupted=z.testzip()
 if corrupted:raise ValueError('ZIP CRC failed: '+corrupted)
 with (dest/'FILE_MANIFEST.csv').open('w',newline='',encoding='utf-8-sig') as f:
  csvw=csv.writer(f);csvw.writerow(['file_path','bytes','sha256'])
  for p in assets:csvw.writerow([p.as_posix(),p.stat().st_size,hashlib.sha256(p.read_bytes()).hexdigest()])
mediaerrors=[];mediapass=0
for p in assets:
 if p.suffix not in ('.mp3','.mp4'):continue
 try:
  r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(p)],capture_output=True,text=True,timeout=18)
  if r.returncode or float(r.stdout.strip())<=0:mediaerrors.append('unreadable media '+str(p)+' '+r.stderr[:170])
  else:mediapass+=1
 except Exception as e:mediaerrors.append('probe exception '+str(p)+' '+str(e))
for name0,n in {'prologue':7,'battle01':8,'battle02':8,'toba':7,'ending':8}.items():
 files=[Path(f'assets/audio/story/bgm_{name0}_{i:02d}.part') for i in range(n)]
 try:
  joined=qa/(name0+'.mp3')
  with joined.open('wb') as out:
   for p in files:out.write(p.read_bytes())
  r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(joined)],capture_output=True,text=True,timeout=18)
  if r.returncode or float(r.stdout.strip())<=0:mediaerrors.append('unreadable BGM '+name0)
  else:mediapass+=1
 except Exception as e:mediaerrors.append('probe exception BGM '+name0+' '+str(e))
qa_status='PASS' if not stat['errors'] and not browser['errors'] and not mediaerrors else 'CHECK_REQUIRED'
with (dest/'QA_REPORT.md').open('w',encoding='utf-8') as f:
 f.write('# 新選組将棋 最終公開前検査（2026-11-12）\n\n')
 f.write('検査対象：公開ブランチ release/preview-20261108（mainは変更しない）。\n\n')
 f.write(f'**判定：{qa_status}**\n\n')
 f.write(f'- 配布ファイル数：{len(assets)} ／ ZIPサイズ：{zip_path.stat().st_size:,} bytes\n')
 f.write(f'- JavaScript構文検証：{stat["js_syntax_checks"]}件\n')
 f.write(f'- HTML・CSS・JSのローカル参照：{stat["asset_refs_verified"]}件\n')
 f.write(f'- PC・スマホ幅の画面検査：{len(browser["pages"])}ページ\n')
 f.write(f'- メディア読取検査：{mediapass}件（MP3・MP4と5組の分割BGM結合データ）\n')
 f.write(f'- 静的エラー：{len(stat["errors"])}件／ブラウザエラー：{len(browser["errors"])}件／メディアエラー：{len(mediaerrors)}件\n')
 f.write(f'- 警告：静的 {len(stat["warnings"])}件／ブラウザコンソール {len(browser["consoleErrors"])}件\n\n')
 for title,li in [('静的エラー',stat['errors']),('ブラウザ',browser['errors']),('メディア',mediaerrors),('静的警告',stat['warnings']),('コンソールエラー',browser['consoleErrors'])]:
  f.write('## '+title+'\n\n')
  if not li:f.write('該当なし\n\n')
  else:
   for s in li[:150]:f.write('- '+str(s)+'\n')
   f.write('\n')
 f.write('## 公開に際して\n\n')
 f.write('アプリは静的サイトとしてHTTPS配信。配布ZIPの階層を維持し、MP3/MP4/WEBPに適切なContent-Typeを付けてください。ストーリーBGMの .part ファイルは改変・削除せず配信してください。動画のHTTP Rangeアクセス推奨。\n\n')
 f.write('この自動検査はPC・スマホ表示幅でのChromium初期画面確認とメディア読取・コード検査です。iPhone SafariとAndroidの実機、各ステージの全分岐、駒の勝敗処理、音量フェーダーの音量実測までは確認できません。公開後に別途実機の受け入れ試験を実施してください。\n')
(dest/'DEPLOY_INSTRUCTIONS.txt').write_text('新選組将棋：別サーバー公開手順\n'
'1. '+name+' を展開し、HTML/JS/CSSとassets/を階層ごとHTTPSサーバーの公開フォルダへコピー。\n'
'2. index.htmlが入口。静的ファイルだけで動作しDBやビルド不要。\n'
'3. assets/audio/story/ の .part 38ファイルは再生に必要。改名も削除も不可。\n'
'4. MP4はvideo/mp4、MP3はaudio/mpeg、WEBPはimage/webp、.partはバイナリで配信。\n'
'5. PC/iPhone Safari/Android Chromeで通常対局・全ストーリー・図鑑・設定フェーダー・勝敗音・名シーン映画・ホーム画面起動を確認。\n'
'6. 問題があればQA_REPORT.mdを参照。\n',encoding='utf-8')
shutil.copyfile(qa/'static.json',dest/'static.json')
if (qa/'browser.json').exists():shutil.copyfile(qa/'browser.json',dest/'browser.json')
report={'status':qa_status,'zip_files':len(assets),'zip_bytes':zip_path.stat().st_size,'sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'media_pass':mediapass,'media_errors':mediaerrors,'static_errors':len(stat['errors']),'browser_errors':len(browser['errors']),'browser_console_errors':len(browser['consoleErrors'])}
(dest/'SUMMARY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('QA_RESULT',json.dumps(report,ensure_ascii=False))
for s in mediaerrors:print('MEDIA_ERROR',s)
