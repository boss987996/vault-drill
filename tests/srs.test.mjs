import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {grade,bangkokDay,addDays,initialState,buildQueue,ensureSession,answer,nextDue,exportProgress,scheduleFields} from '../src/srs.js';
const deck=JSON.parse(readFileSync(new URL('../data/vocab.json',import.meta.url),'utf8').replace(/^\uFEFF/,'' )).cards;
const today='2026-09-12', base=deck[0];
test('A9: bundled deck has stable sequential IDs and all 76 complete cards',()=>{
  assert.equal(deck.length,76); assert.deepEqual(deck.map(c=>c.id),Array.from({length:76},(_,i)=>`v${String(i+1).padStart(3,'0')}`));
  for(const c of deck) { assert.ok(c.thai); assert.ok(c.example); }
});
test('all four new and learning outcomes follow Section 5',()=>{
  for(const state of ['new','learning']) for(let g=0;g<4;g++) {
    const r=grade({...base,state},g,today);
    assert.equal(r.requeue,g<2); assert.equal(r.card.state,g<2?'learning':'review');
    assert.equal(r.card.ease,2.5); assert.equal(r.card.last_review,today);
    if(g>=2) { assert.equal(r.card.interval,g===2?1:4); assert.equal(r.card.reps,1); assert.equal(r.card.due,g===2?'2026-09-13':'2026-09-16'); }
  }
});
test('review grades, lapse count, ease clamp order and dates',()=>{
  const c={...base,state:'review',interval:10,reps:4,lapses:2};
  const outcomes=[{interval:1,reps:4,lapses:3,ease:2.3,state:'learning',due:'2026-09-13'},
    {interval:12,reps:5,lapses:2,ease:2.35,state:'review',due:'2026-09-24'},
    {interval:25,reps:5,lapses:2,ease:2.5,state:'review',due:'2026-10-07'},
    {interval:34,reps:5,lapses:2,ease:2.65,state:'review',due:'2026-10-16'}];
  outcomes.forEach((expected,g)=>{const r=grade(c,g,today); for(const [k,v] of Object.entries(expected))assert.equal(r.card[k],v);assert.equal(r.requeue,g===0);});
  assert.equal(grade({...c,ease:3},3,today).card.interval,41);
  assert.equal(grade({...c,ease:3},3,today).card.ease,3);
  assert.equal(grade({...c,ease:1.3},0,today).card.ease,1.3);
  assert.equal(grade({...c,interval:1},1,today).card.interval,1);
  assert.deepEqual(c,{...base,state:'review',interval:10,reps:4,lapses:2});
});
test('A5: previews use the same grade function as persisted answers for every branch',()=>{
  for(const state of ['new','learning','review']) for(const ease of [1.3,2.5,3]) for(const interval of [1,4,21,99]) for(let g=0;g<4;g++) {
    const s=initialState(); s.cards[base.id]=scheduleFields({...base,state,ease,interval}); ensureSession(deck,s,today);
    const preview=grade({...base,...s.cards[base.id]},g,today); answer(deck,s,g,today);
    assert.deepEqual(s.cards[base.id],scheduleFields(preview.card));
  }
});
test('queue orders overdue reviews first, preserves book order, caps 40 distinct',()=>{
  const s=initialState(); s.cards.v020=scheduleFields({...deck[19],state:'review',due:'2026-09-10'}); s.cards.v021=scheduleFields({...deck[20],state:'learning',due:'2026-09-09'});
  assert.deepEqual(buildQueue(deck,s,today).slice(0,4),['v021','v020','v001','v002']);
  for(const c of deck) s.cards[c.id]=scheduleFields({...c,state:'review'});
  assert.equal(buildQueue(deck,s,today).length,40);
});
test('A4: forgotten card returns after three others; short tail repeats within session',()=>{
  const s=ensureSession(deck,initialState(),today); answer(deck,s,0,today);
  assert.deepEqual(s.session.queue.slice(0,5),['v002','v003','v004','v001','v005']);
  for(let i=0;i<3;i++) answer(deck,s,2,today); assert.equal(s.session.queue[0],'v001');
  while(s.session.queue.length>1)answer(deck,s,2,today);
  const last=s.session.queue[0]; answer(deck,s,0,today); assert.equal(s.session.queue[0],last); answer(deck,s,2,today); assert.equal(s.session.queue.length,0);
});
test('repeats continue beyond 40 attempts with 40 distinct cards',()=>{
  const s=initialState(); for(const c of deck)s.cards[c.id]=scheduleFields({...c,state:'review'});ensureSession(deck,s,today);
  while(s.session.queue.length){const id=s.session.queue[0];answer(deck,s,s.session.reviewed.includes(id)?2:0,today);}
  assert.equal(s.session.attempts,80);assert.equal(s.session.reviewed.length,40);assert.equal(s.reviews.length,80);
});
test('A14: daily new limit survives repeat sessions and restarts, resets at Bangkok midnight',()=>{
  let s=ensureSession(deck,initialState(),today); while(s.session.queue.length)answer(deck,s,2,today);
  s=JSON.parse(JSON.stringify(s)); assert.equal(s.introduced[today].length,5); assert.deepEqual(buildQueue(deck,s,today),[]);
  assert.equal(nextDue(deck,s,today),'2026-09-13');
  const tomorrow=buildQueue(deck,s,'2026-09-13');assert.equal(tomorrow.length,10); assert.deepEqual(tomorrow.slice(5),deck.slice(5,10).map(c=>c.id));
});
test('Bangkok boundary, month/year and leap dates',()=>{
  assert.equal(bangkokDay(new Date('2026-09-12T16:59:59Z')),'2026-09-12'); assert.equal(bangkokDay(new Date('2026-09-12T17:00:00Z')),'2026-09-13');
  assert.equal(addDays('2028-02-28',1),'2028-02-29'); assert.equal(addDays('2026-12-31',1),'2027-01-01');
});
test('A3: serializing mid-session preserves queue, learning card, reveal state and history',()=>{
  const s=ensureSession(deck,initialState(),today);answer(deck,s,0,today);s.session.revealed=true;
  const restored=ensureSession(deck,JSON.parse(JSON.stringify(s)),today); assert.deepEqual(restored,s);
  answer(deck,restored,2,today);assert.equal(restored.history[today],2);
});
test('streak counts days rather than attempts and resets after missed day',()=>{
  const s=ensureSession(deck,initialState(),today);answer(deck,s,2,today);answer(deck,s,2,today);assert.equal(s.streak,1);
  answer(deck,s,2,'2026-09-13');assert.equal(s.streak,2);answer(deck,s,2,'2026-09-15');assert.equal(s.streak,1);
});
test('A12: export is exact progress schema, no vocabulary or internal metadata',()=>{
  const s=ensureSession(deck,initialState(),today);answer(deck,s,2,today);
  const p=JSON.parse(JSON.stringify(exportProgress(s,new Date('2026-09-12T14:05:00Z'))));
  assert.deepEqual(Object.keys(p),['schema_version','updated_at','device','streak','last_studied','history','cards','reviews']);
  assert.equal(p.updated_at,'2026-09-12T21:05:00.000+07:00'); assert.equal(p.schema_version,2);assert.equal(p.device,'android');
  assert.deepEqual(Object.keys(p.cards),['v001']); assert.deepEqual(Object.keys(p.cards.v001),['ease','interval','reps','lapses','due','state','last_review']);
  assert.equal(p.cards.v001.due,'2026-09-13');assert.equal(p.history[today],1);
});
