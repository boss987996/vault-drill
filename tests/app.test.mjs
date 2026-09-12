import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {indexedDB} from 'fake-indexeddb';
test('A3/A6/A12: real app handlers persist, finish, download exact JSON and share files',async()=>{
  const dom=new JSDOM(await readFile(new URL('../index.html',import.meta.url),'utf8'),{url:'https://test.invalid/vault-drill/'});
  globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.indexedDB=indexedDB;
  Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
  window.scrollTo=()=>{};
  const interval=globalThis.setInterval, timeout=globalThis.setTimeout;
  globalThis.setInterval=(...a)=>interval(...a).unref(); globalThis.setTimeout=(...a)=>timeout(...a).unref();
  let file, downloadName, shared;
  const originalCreate=URL.createObjectURL, originalRevoke=URL.revokeObjectURL;
  URL.createObjectURL=f=>{file=f;return 'blob:https://test.invalid/export';};URL.revokeObjectURL=()=>{};
  dom.window.HTMLAnchorElement.prototype.click=function(){downloadName=this.download;};
  try {
    await import('../dist/app.js');
    assert.match(document.querySelector('#reveal').textContent,/interconnected/);
    await document.querySelector('#reveal').onclick();
    assert.match(document.querySelector('.thai').textContent,/เชื่อมโยง/);
    const first=document.querySelector('[data-grade="0"]');await Promise.all([first.onclick(),first.onclick()]);
    const {updateStore}=await import('../dist/storage.js');
    let saved=await updateStore();assert.equal(saved.session.attempts,1);assert.equal(saved.cards.v001.state,'learning');
    assert.deepEqual(saved.session.queue.slice(0,4),['v002','v003','v004','v001']);
    // A visibility refresh reads the authoritative transaction before further input.
    document.dispatchEvent(new window.Event('visibilitychange'));
    for(let i=0;i<5;i++) {await document.querySelector('#reveal').onclick(); await document.querySelector('[data-grade="2"]').onclick();}
    assert.equal(document.querySelector('h1').textContent,'ทบทวนครบแล้ว');
    assert.equal(document.querySelector('.count').textContent,'5');assert.ok(document.querySelector('.due strong').textContent);
    document.querySelector('#download').onclick();assert.equal(downloadName,'progress.json');assert.equal(file.type,'application/json');
    const p=JSON.parse(await file.text());assert.equal(Object.keys(p.cards).length,5);assert.equal(p.cards.v001.state,'review');
    assert.deepEqual(Object.keys(p),['schema_version','updated_at','device','streak','last_studied','history','cards','reviews']);
    assert.equal(Object.values(p.history)[0],6);assert.equal(p.streak,1);assert.equal(p.schema_version,2);assert.equal(p.reviews.length,6);
    assert.deepEqual(p.reviews.map(r=>r.id),['v001','v002','v003','v004','v001','v005']);
    assert.ok(p.reviews.every(r=>r.at.endsWith('+07:00')&&(r.ms===null||Number.isInteger(r.ms)&&r.ms>=0)));
    assert.equal(p.reviews[1].ms,null);assert.ok(Number.isInteger(p.reviews[0].ms));
    for(const c of Object.values(p.cards))assert.deepEqual(Object.keys(c),['ease','interval','reps','lapses','due','state','last_review']);
    navigator.canShare=()=>true;navigator.share=async data=>{shared=data;};await document.querySelector('#share').onclick();
    assert.equal(shared.files[0].name,'progress.json');assert.equal(Object.keys(JSON.parse(await shared.files[0].text()).cards).length,5);
    navigator.share=async()=>{throw new DOMException('Cancelled','AbortError');};await document.querySelector('#share').onclick();
    navigator.canShare=()=>false;downloadName=null;await document.querySelector('#share').onclick();assert.equal(downloadName,'progress.json');
    saved=await updateStore();assert.equal(saved.session.queue.length,0);assert.equal(saved.session.reviewed.length,5);
  } finally {dom.window.close();URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;globalThis.setInterval=interval;globalThis.setTimeout=timeout;}
});
