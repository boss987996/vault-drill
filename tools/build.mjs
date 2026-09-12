import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
const root=resolve(import.meta.dirname,'..'), out=join(root,'dist');
await mkdir(join(out,'fonts'),{recursive:true});
const input=process.env.VOCAB_SOURCE || join(root,'data','vocab.json');
const bytes=await readFile(input), deck=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
if(deck.schema_version!==1||deck.count!==76||deck.cards.length!==76||new Set(deck.cards.map(c=>c.id)).size!==76) throw new Error('Invalid deck');
for(const c of deck.cards) for(const k of ['id','word','thai','meaning','simple','example','book_ctx','unit']) if(typeof c[k]!=='string'||!c[k]) throw new Error(`Missing ${k}`);
// Copy bytes exactly; neither source nor card order is modified.
await writeFile(join(root,'data','vocab.json'),bytes);
await writeFile(join(out,'vocab.json'),bytes);
await writeFile(join(out,'deck.js'),`export default ${JSON.stringify(deck)};\n`);
for(const name of ['index.html','manifest.webmanifest']) await copyFile(join(root,name),join(out,name));
for(const name of ['srs.js','storage.js','app.js','style.css']) await copyFile(join(root,'src',name),join(out,name));
let fonts='';
for(const [pkg,styles] of [['@fontsource/ibm-plex-sans-thai',['400','500','600','700']],['@fontsource/ibm-plex-mono',['400','500','600']],['@fontsource-variable/newsreader',['index','wght-italic']]]) {
  const folder=join(root,'node_modules',pkg);
  for(const style of styles) {
    const css=await readFile(join(folder,`${style}.css`),'utf8');
    for(let block of css.match(/@font-face\s*\{[^}]+\}/g)) {
      if(!/-(thai|latin)-/.test(block)) continue;
      const match=block.match(/url\(\.\/files\/([^)]*\.woff2)\)/);
      if(!match) throw new Error('Font source missing');
      await copyFile(join(folder,'files',match[1]),join(out,'fonts',match[1]));
      block=block.replace(/src:[^;]+;/,`src:url('./${match[1]}') format('woff2');`).replaceAll('Newsreader Variable','Newsreader'); fonts+=block+'\n';
    }
  }
  await copyFile(join(folder,'LICENSE'),join(out,'fonts',basename(pkg)+'-LICENSE.txt'));
}
await writeFile(join(out,'fonts','fonts.css'),fonts);
// Small deterministic PNG app icon, with a book and a returning review arrow.
function crc32(buf) {let c=0xffffffff; for(const b of buf){c^=b; for(let i=0;i<8;i++) c=(c>>>1)^((c&1)?0xedb88320:0);} return (c^0xffffffff)>>>0;}
function chunk(type,data) {const t=Buffer.from(type), n=Buffer.alloc(4), crc=Buffer.alloc(4);n.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([n,t,data,crc]);}
for(const size of [192,512]) {
  const raw=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const a=x/size,b=y/size;
    const book=(a>.27&&a<.73&&b>.28&&b<.69), spine=(Math.abs(a-.5)<.012&&b>.30&&b<.66);
    const line=(a>.33&&a<.44||a>.56&&a<.67)&&(Math.abs(b-.40)<.009||Math.abs(b-.47)<.009||Math.abs(b-.54)<.009);
    const arrow=(a>.36&&a<.64&&b>.745&&b<.77)||(a>.60&&a<.66&&Math.abs(b-(.757+(a-.64)))<.014);
    const color=(book&&!spine&&!line)||arrow?[246,245,241]:[13,110,122];
    const p=y*(size*4+1)+1+x*4;raw[p]=color[0];raw[p+1]=color[1];raw[p+2]=color[2];raw[p+3]=255;
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(join(out,`icon-${size}.png`),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
await writeFile(join(out,'.nojekyll'),'');
async function files(dir,prefix='') {const list=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=prefix+e.name;if(e.isDirectory())list.push(...await files(join(dir,e.name),p+'/'));else if(p!=='sw.js')list.push(p);}return list.sort();}
const assets=await files(out), hash=createHash('sha256');for(const path of assets)hash.update(await readFile(join(out,path)));
const version=hash.digest('hex').slice(0,16);
await writeFile(join(out,'sw.js'),`const CACHE='vault-drill-${version}';
const ASSETS=${JSON.stringify(['./',...assets.map(x=>'./'+x)])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vault-drill-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{const hit=await cache.match(event.request,{ignoreSearch:true});if(hit)return hit;if(event.request.mode==='navigate')return cache.match('./index.html');return fetch(event.request);}));});
`);
console.log(JSON.stringify({cards:deck.count,deckSha256:createHash('sha256').update(bytes).digest('hex'),version,assets:assets.length}));
