import {initialState,migrateProgress} from './srs.js';
let db;
export function openStore() { return new Promise((resolve,reject)=>{
  const r=indexedDB.open('vault-drill',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('progress');
  r.onerror=()=>reject(r.error); r.onblocked=()=>reject(new Error('Close other Vault Drill tabs.'));
  r.onsuccess=()=>{db=r.result; db.onversionchange=()=>db.close(); resolve();};
}); }
// Answer and queue are committed atomically, including across concurrent tabs.
export function updateStore(change=s=>s) { return new Promise((resolve,reject)=>{
  const tx=db.transaction('progress','readwrite'), store=tx.objectStore('progress'), r=store.get('state'); let s;
  r.onsuccess=()=>{try {const previous=migrateProgress(r.result||initialState()), count=previous.reviews.length, prefix=JSON.stringify(previous.reviews);
    s=change(previous);
    if(!Array.isArray(s.reviews)||s.reviews.length<count||JSON.stringify(s.reviews.slice(0,count))!==prefix) throw new Error('Review log is append-only');
    s.revision+=1; store.put(s,'state');}catch(e){tx.abort(); reject(e);}};
  tx.oncomplete=()=>resolve(s); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error||new Error('Save interrupted'));
}); }
