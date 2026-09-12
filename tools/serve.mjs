import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2'};
createServer(async(req,res)=>{try {
  if(req.url==='/__qa/light') {res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body style="margin:0;background:#F6F5F1"><iframe title="Light mode verification" src="/vault-drill/" style="border:0;width:360px;height:800px;color-scheme:light"></iframe></body></html>');return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/vault-drill(?=\/)/,'');
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/')) {res.writeHead(403).end(); return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(await readFile(file));
} catch {res.writeHead(404).end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Vault Drill: http://127.0.0.1:4173/vault-drill/'));
