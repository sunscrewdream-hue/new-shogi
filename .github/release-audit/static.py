import re,json,posixpath,urllib.parse,html.parser,collections,subprocess
from pathlib import Path
paths=[p for p in Path('.').rglob('*') if p.is_file() and not str(p).startswith(('.git/','.github/','node_modules/','dist/'))]
runtime=[p for p in paths if str(p).startswith('assets/') or (len(p.parts)==1 and p.suffix in ('.html','.js','.css','.png','.webmanifest','.svg'))]
available={p.as_posix() for p in runtime}
errors=[];warnings=[];checked=collections.Counter();externals=collections.Counter()
def check(p,url,kind):
 url=urllib.parse.unquote((url or '').strip().strip('"').strip("'"))
 if not url or url.startswith(('#','data:','blob:','javascript:','mailto:','tel:')):return
 if url.startswith(('https://','http://','//')):externals[url.split('/')[2] if '/' in url[8:] else url]+=1;return
 if any(c in url for c in ('{','}','+','*')):return
 url=url.split('?',1)[0].split('#',1)[0]
 if not url or url.endswith('/'):return
 if url.startswith('/'):warnings.append('absolute path '+str(p)+': '+url);url=url.lstrip('/')
 else:url=posixpath.normpath(posixpath.join(str(p.parent),url))
 if url.startswith('../'):warnings.append('outside root '+str(p)+': '+url);return
 if url.endswith(('.html','.js','.css','.webp','.png','.svg','.jpg','.jpeg','.mp3','.mp4','.part','.webmanifest','.ico','.json','.wav')):
  if url not in available:
   maybe=[x for x in available if x.lower()==url.lower()]
   errors.append('missing '+kind+' '+str(p)+' -> '+url+(' [CASE '+maybe[0]+']' if maybe else ''))
  else:checked[url]+=1
def css(p,s):
 for q in re.findall(r'url\s*\(\s*([^)]+)\)',s,re.I):check(p,q,'CSS')
inline=[]
class Parser(html.parser.HTMLParser):
 def __init__(self,p):super().__init__();self.p=p;self.ids=collections.Counter();self.script=None;self.style=None;self.typ=''
 def handle_starttag(self,tag,a):
  d=dict(a)
  if d.get('id'):self.ids[d['id']]+=1
  for k in ('src','href','poster','data-src','action'):
   if d.get(k):check(self.p,d[k],tag+'.'+k)
  for q in d.get('srcset','').split(','):
   if q.strip():check(self.p,q.strip().split()[0],tag+'.srcset')
  if tag=='script' and not d.get('src'):self.script=[];self.typ=d.get('type','')
  if tag=='style':self.style=[]
 def handle_data(self,d):
  if self.script is not None:self.script.append(d)
  if self.style is not None:self.style.append(d)
 def handle_endtag(self,tag):
  if tag=='script' and self.script is not None:
   if self.typ not in ('application/json','application/ld+json','text/plain') and ''.join(self.script).strip():inline.append((self.p,''.join(self.script),self.typ))
   self.script=None
  if tag=='style' and self.style is not None:css(self.p,''.join(self.style));self.style=None
for p in runtime:
 if p.suffix=='.html':
  pa=Parser(p);pa.feed(p.read_text(encoding='utf-8'))
  for k,n in pa.ids.items():
   if n>1:errors.append(f'duplicate id in {p}: {k} x{n}')
 if p.suffix=='.css':css(p,p.read_text(encoding='utf-8'))
 if p.suffix=='.js':
  s=p.read_text(encoding='utf-8')
  for q in re.findall(r'''['"]((?:assets/|\./|\.\./)[^'"\r\n]+?\.(?:webp|png|mp3|mp4|css|js|html|part))['"]''',s):check(p,q,'JS')
for p in runtime:
 if p.stat().st_size==0:errors.append('zero bytes '+str(p))
 if p.suffix=='.webp':
  with p.open('rb') as f:h=f.read(12)
  if h[:4]!=b'RIFF' or h[8:12]!=b'WEBP':errors.append('invalid webp '+str(p))
 if p.suffix=='.png':
  with p.open('rb') as f:h=f.read(8)
  if h!=b'\x89PNG\r\n\x1a\n':errors.append('invalid png '+str(p))
numjs=0
for p in runtime:
 if p.suffix=='.js':
  c=subprocess.run(['node','--check',str(p)],capture_output=True,text=True);numjs+=1
  if c.returncode:errors.append('JS syntax '+str(p)+' '+c.stderr[-350:])
out=Path('/tmp/shogi-finalqa');out.mkdir(exist_ok=True)
for i,(p,s,t) in enumerate(inline):
 f=out/(str(i)+('.mjs' if t=='module' else '.cjs'));f.write_text(s,encoding='utf-8')
 c=subprocess.run(['node','--check',str(f)],capture_output=True,text=True);numjs+=1
 if c.returncode:errors.append('inline JS '+str(p)+' '+c.stderr[-350:])
try:
 m=json.loads(Path('manifest.webmanifest').read_text(encoding='utf-8'))
 for d in m.get('icons',[]):check(Path('manifest.webmanifest'),d['src'],'icon')
except Exception as e:errors.append('manifest '+str(e))
groups=collections.defaultdict(list)
for p in runtime:
 m=re.match(r'assets/audio/story/bgm_(.+)_(\d\d)\.part',str(p))
 if m:groups[m.group(1)].append(int(m.group(2)))
for key,n in {'prologue':7,'battle01':8,'battle02':8,'toba':7,'ending':8}.items():
 if sorted(groups.get(key,[]))!=list(range(n)):errors.append(f'BGM segment group {key}: {sorted(groups.get(key,[]))}')
info={'files':len(runtime),'bytes':sum(p.stat().st_size for p in runtime),'html_pages':[p.name for p in runtime if p.suffix=='.html'],'js_syntax_checks':numjs,'asset_refs_verified':sum(checked.values()),'bgm_groups':{k:len(v) for k,v in groups.items()},'errors':errors,'warnings':warnings,'externals':dict(externals)}
(out/'static.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
print('STATIC_SUMMARY',json.dumps({k:v for k,v in info.items() if k not in ('errors','warnings','externals')},ensure_ascii=False))
for e in errors:print('STATIC_ERROR',e)
for e in warnings[:40]:print('STATIC_WARN',e)
