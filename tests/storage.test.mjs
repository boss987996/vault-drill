import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indexedDB} from 'fake-indexeddb';
import {ensureSession,answer} from '../src/srs.js';
const deck=JSON.parse(readFileSync('data/vocab.json','utf8')).cards;
const day='2026-09-12';
test('A3/A13: existing IndexedDB migrates; atomic abort and append-only guard preserve history',async()=>{
  globalThis.indexedDB=indexedDB;
  const legacy={cards:{},history:{'2026-09-11':9},introduced:{},streak:1,last_studied:'2026-09-11',revision:4,session:null};
  await new Promise((resolve,reject)=>{const r=indexedDB.open('vault-drill',1);r.onupgradeneeded=()=>r.result.createObjectStore('progress');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('progress','readwrite');tx.objectStore('progress').put(legacy,'state');tx.oncomplete=()=>{db.close();resolve();};};});
  const {openStore,updateStore}=await import('../src/storage.js');await openStore();
  const migrated=await updateStore(s=>ensureSession(deck,s,day));assert.equal(migrated.schema_version,2);assert.equal(migrated.history['2026-09-11'],9);assert.deepEqual(migrated.reviews,[]);
  const first=await updateStore(s=>answer(deck,s,0,day,{now:new Date('2026-09-12T08:40:00+07:00'),ms:1000}));
  assert.equal(first.reviews.length,1);assert.equal(first.cards.v001.state,'learning');
  await assert.rejects(updateStore(s=>{answer(deck,s,2,day);throw new Error('Simulated interruption before commit');}));
  let restored=await updateStore();assert.deepEqual(restored.cards,first.cards);assert.deepEqual(restored.reviews,first.reviews);assert.deepEqual(restored.session,first.session);
  await assert.rejects(updateStore(s=>{s.reviews=[];return s;}),/append-only/);
  await assert.rejects(updateStore(s=>{s.reviews[0].grade=3;return s;}),/append-only/);
  restored=await updateStore();assert.deepEqual(restored.reviews,first.reviews);
  // Two serialized write transactions must append two different answers, not
  // overwrite one another with an earlier snapshot of the log.
  await Promise.all([updateStore(s=>answer(deck,s,2,day)),updateStore(s=>answer(deck,s,2,day))]);
  restored=await updateStore();assert.equal(restored.reviews.length,3);assert.deepEqual(restored.reviews[0],first.reviews[0]);assert.deepEqual(restored.reviews.map(r=>r.id),['v001','v002','v003']);
});