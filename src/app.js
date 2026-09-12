import deckData from './deck.js';
import {bangkokDay,addDays,grade,cardsWithProgress,ensureSession,answer,nextDue,exportProgress,MATURE_DAYS} from './srs.js';
import {openStore,updateStore} from './storage.js';
const deck=deckData.cards, main=document.querySelector('#main'), status=document.querySelector('#status');
let state, busy=false;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel=day=>day?new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'Asia/Bangkok'}).format(new Date(`${day}T12:00:00+07:00`)):'—';
const bucket=c=>c.state==='new'?0:c.state==='review'&&c.interval>=MATURE_DAYS?2:1;
function render() {
  const today=bangkokDay(), cards=cardsWithProgress(deck,state), counts=[0,0,0];
  cards.forEach(c=>counts[bucket(c)]++);
  const names=['ยังไม่เจอ','กำลังจำ','จำแม่น'];
  document.querySelector('#stock').setAttribute('aria-label',counts.map((n,i)=>`${names[i]} ${n} คำ`).join(' · '));
  document.querySelectorAll('#stock span').forEach((el,i)=>el.style.width=`${counts[i]/deck.length*100}%`);
  document.querySelector('#stock-labels').innerHTML=counts.map((n,i)=>`<span>${names[i]} <span class="number">${n}</span></span>`).join('');
  const streak=state.last_studied&&state.last_studied>=addDays(today,-1)?state.streak:0;
  document.querySelector('#streak').textContent=`${streak? '🔥 ':''}${streak} วันติด`;
  const session=state.session, id=session.queue[0];
  if(!id) { renderSummary(cards,today); return; }
  const c=cards.find(c=>c.id===id);
  if(!session.revealed) {
    main.innerHTML=`<button class="card question" id="reveal" aria-label="${escape(c.word)} — แตะเพื่อดูเฉลย"><span class="eyebrow" lang="en">${escape(c.unit)}</span><span class="word" lang="en">${escape(c.word)}</span><span class="reveal-hint">แตะเพื่อดูเฉลย <span aria-hidden="true">↗</span></span></button><p class="session-count">ทบทวนแล้ว ${session.reviewed.length} คำ · เหลือ ${session.queue.length} ใบ</p>`;
    document.querySelector('#reveal').onclick=reveal;
  } else {
    const detail=(label,value)=>value?`<p class="detail" lang="en"><span class="detail-label">${label}</span>${escape(value)}</p>`:'';
    main.innerHTML=`<article class="card answer"><p class="eyebrow" lang="en">${escape(c.unit)}</p><h1 class="word" lang="en">${escape(c.word)}</h1><p class="thai">${escape(c.thai)}</p>${detail('Simple English',c.simple)}${detail('Meaning in context',c.meaning)}<p class="example" lang="en">${escape(c.example)}</p>${detail('Book context',c.book_ctx)}${detail('Usage note',c.usage)}<div class="chips">${c.related.map(x=>`<span class="chip">${escape(x)}</span>`).join('')}</div></article><div class="grades" aria-label="ให้คะแนน">${['ลืม','ยาก','ได้','ง่าย'].map((label,g)=>{
      const result=grade(c,g,today), delay=result.requeue?'ทันที':`${result.card.interval} วัน`;
      return `<button class="grade grade-${g}" data-grade="${g}">${label}<small>${delay}</small></button>`;
    }).join('')}</div>`;
    main.querySelectorAll('[data-grade]').forEach(button=>button.onclick=()=>submit(Number(button.dataset.grade)));
  }
}
function renderSummary(cards,today) {
  const s=state.session, completed=s.reviewed.length>0;
  const promoted=s.reviewed.map(id=>cards.find(c=>c.id===id)).filter(c=>bucket(c)>bucket(s.before[c.id])||c.state==='review'&&s.before[c.id].state!=='review');
  main.innerHTML=`<section class="card summary"><p class="eyebrow" lang="en">Thinking in Systems · Review</p><h1>${completed?'ทบทวนครบแล้ว':'วันนี้ไม่มีคำที่ต้องทบทวน'}</h1>${completed?`<p class="count">${s.reviewed.length}</p><p>คำที่ทบทวน · ตอบทั้งหมด ${s.attempts} ครั้ง</p><p class="promotions">${promoted.length?`คำที่เลื่อนขั้น ${promoted.length} คำ: ${promoted.map(c=>`${escape(c.word)} (${c.interval>=MATURE_DAYS?'จำแม่น':'ทบทวนตามกำหนด'})`).join(' · ')}`:'วันนี้ยังไม่มีคำที่เลื่อนขั้น'}</p>`:''}<p class="due">ครั้งต่อไป<br><strong>${dateLabel(nextDue(deck,state,today))}</strong></p></section><button id="share" class="primary">ส่งความคืบหน้าเข้า OneDrive</button><button id="download" class="secondary">ดาวน์โหลด progress.json</button><p class="export-help">เลือก OneDrive แล้วบันทึก progress.json ในโฟลเดอร์ Learning ของ Thinking in Systems</p>`;
  document.querySelector('#share').onclick=share;
  document.querySelector('#download').onclick=download;
}
async function mutate(change) {
  if(busy) return; busy=true; status.textContent='';
  main.querySelectorAll('button').forEach(b=>b.disabled=true);
  try {state=await updateStore(change); render();}
  catch(e) {status.textContent='บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง ความคืบหน้าก่อนหน้ายังอยู่'; main.querySelectorAll('button').forEach(b=>b.disabled=false); console.error(e);}
  finally {busy=false;}
}
async function reveal() {
  const expected=state.session.queue[0], day=state.session.day;
  await mutate(s=>{ensureSession(deck,s); if(day===s.session.day&&expected===s.session.queue[0]) s.session.revealed=true; return s;});
}
async function submit(g) {
  if(!state?.session.revealed) return;
  const expected=state.session.queue[0], revision=state.revision, day=state.session.day;
  await mutate(s=>{ensureSession(deck,s); if(day===s.session.day&&s.revision===revision&&s.session.queue[0]===expected&&s.session.revealed) answer(deck,s,g); return s;});
  window.scrollTo(0,0); main.focus({preventScroll:true});
}
function exportFile() {return new File([JSON.stringify(exportProgress(state),null,2)],'progress.json',{type:'application/json'});}
function download() {
  const url=URL.createObjectURL(exportFile()), a=document.createElement('a'); a.href=url; a.download='progress.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),30000);
  status.textContent='ดาวน์โหลดแล้ว นำไฟล์ progress.json ไปบันทึกใน OneDrive';
}
async function share() {
  const file=exportFile();
  if(!navigator.canShare?.({files:[file]})) {download(); return;}
  try {await navigator.share({files:[file],title:'Vault Drill progress'}); status.textContent='ส่งไฟล์ให้แอปที่เลือกแล้ว โปรดตรวจสอบว่าบันทึกใน OneDrive สำเร็จ';}
  catch(e) {if(e.name!=='AbortError') status.textContent='แชร์ไม่สำเร็จ ใช้ปุ่มดาวน์โหลด progress.json ด้านล่างได้';}
}
document.addEventListener('keydown',e=>{
  if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||!state||busy||!state.session.queue.length) return;
  if((e.code==='Space'||e.key==='Enter')&&!state.session.revealed) {e.preventDefault(); reveal();}
  else if(['1','2','3','4'].includes(e.key)&&state.session.revealed) {e.preventDefault(); submit(Number(e.key)-1);}
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state&&!busy) mutate(s=>ensureSession(deck,s));});
// Refresh the queue and labels across Bangkok midnight even if the app stays open.
setInterval(()=>{if(state&&state.session.day!==bangkokDay()&&!busy) mutate(s=>ensureSession(deck,s));},15000);
try {await openStore(); state=await updateStore(s=>ensureSession(deck,s)); render();}
catch(e) {main.innerHTML='<p>เปิดข้อมูลความคืบหน้าไม่สำเร็จ กรุณาปิดแล้วเปิดแอปอีกครั้ง</p>'; console.error(e);}
if('serviceWorker' in navigator) {
  const offline=document.querySelector('#offline-status');
  navigator.serviceWorker.ready.then(()=>{offline.textContent='พร้อมทบทวนออฟไลน์';});
  navigator.serviceWorker.register('./sw.js').catch(()=>{if(!navigator.serviceWorker.controller) offline.textContent='ยังเตรียมออฟไลน์ไม่สำเร็จ โปรดเปิดอีกครั้งเมื่อมีอินเทอร์เน็ต';});
}
