import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,migrateProgress,ensureSession,answer,buildQueue,scheduledGrade,scheduleFields,exportProgress,ratedToday,nextDue,MAX_NEW_PER_DAY,MAX_REVIEWS_PER_DAY,MAX_SAME_SESSION_REPEATS} from '../src/srs.js';
const deck=JSON.parse(readFileSync('data/vocab.json','utf8')).cards;
const today='2026-09-12', tomorrow='2026-09-13';
const at=(time='08:41:03')=>new Date(today+'T'+time+'+07:00');
function dueState(n){const s=initialState();for(const c of deck.slice(0,n))s.cards[c.id]=scheduleFields({...c,state:'review',interval:4,reps:1,due:today,last_review:'2026-09-08'});return s;}
function finish(s,g=2){while(s.session.queue.length)answer(deck,s,g,today,{now:at()});}
test('v1.2.1 constants match the approved limits',()=>{assert.equal(MAX_NEW_PER_DAY,5);assert.equal(MAX_REVIEWS_PER_DAY,60);assert.equal(MAX_SAME_SESSION_REPEATS,3);});
test('A13: append every accepted grade, preserve old entries, record exact time and intervals',()=>{
  const s=ensureSession(deck,initialState(),today);answer(deck,s,0,today,{now:at(),ms:3200});
  const first=structuredClone(s.reviews);
  assert.deepEqual(first,[{id:'v001',at:'2026-09-12T08:41:03.000+07:00',grade:0,prev_interval:0,new_interval:0,elapsed_days:0,ms:3200}]);
  for(let i=0;i<3;i++)answer(deck,s,2,today,{now:at('08:41:10'),ms:1500});
  answer(deck,s,2,today,{now:at('08:41:20')});assert.deepEqual(s.reviews.slice(0,1),first);
  assert.equal(s.reviews.length,5);assert.equal(s.reviews[4].id,'v001');assert.equal(s.reviews[4].elapsed_days,0);assert.equal(s.reviews[4].ms,null);
  assert.equal(s.reviews[4].new_interval,1);
});
test('review logs elapsed Bangkok calendar days and final interval',()=>{
  const s=ensureSession(deck,dueState(1),today);answer(deck,s,3,today,{now:at(),ms:2500});
  assert.equal(s.reviews[0].elapsed_days,4);assert.equal(s.reviews[0].prev_interval,4);assert.equal(s.reviews[0].new_interval,14);
});
test('A14: existing v1 ten-card queue trims unintroduced cards to five; progress survives',()=>{
  const s=initialState();delete s.schema_version;delete s.reviews;
  s.session={day:today,queue:deck.slice(0,10).map(c=>c.id),reviewed:[],before:{},attempts:0,revealed:false};
  ensureSession(deck,s,today);assert.deepEqual(s.session.queue,deck.slice(0,5).map(c=>c.id));finish(s);
  assert.equal(Object.keys(s.cards).length,5);assert.equal(s.reviews.length,5);assert.deepEqual(buildQueue(deck,s,today),[]);
});
test('A14: upgrading after ten new ratings preserves all ten without admitting more',()=>{
  const s=initialState();s.introduced[today]=deck.slice(0,10).map(c=>c.id);s.history[today]=10;
  for(const c of deck.slice(0,10))s.cards[c.id]=scheduleFields({...c,state:'review',interval:1,reps:1,last_review:today,due:tomorrow});
  const before=structuredClone(s.cards);ensureSession(deck,s,today);assert.deepEqual(s.cards,before);assert.equal(s.session.queue.length,0);
  assert.equal(buildQueue(deck,s,tomorrow).length,15);
});
test('A15: sixty-three overdue cards consume two sessions and admit zero new cards',()=>{
  const s=ensureSession(deck,dueState(63),today);assert.equal(s.session.queue.length,40);finish(s);ensureSession(deck,s,today);
  assert.equal(s.session.queue.length,20);finish(s);ensureSession(deck,s,today);
  assert.equal(s.session.queue.length,0);assert.equal(ratedToday(s,today).size,60);assert.equal(s.reviews.length,60);assert.equal(s.introduced[today],undefined);
  assert.equal(nextDue(deck,s,today),tomorrow);
});
test('A15: one due card with two remaining slots admits just one new word',()=>{
  const s=dueState(59);for(const c of deck.slice(0,58)){s.cards[c.id].last_review=today;s.cards[c.id].due=tomorrow;}
  const q=buildQueue(deck,s,today);assert.deepEqual(q,['v059','v060']);
});
test('A16/A17: card sixty repeats past cap and defers on exactly the third Forgot',()=>{
  const s=dueState(60);for(const c of deck.slice(0,59)){s.cards[c.id].last_review=today;s.cards[c.id].due='2026-09-20';s.reviews.push({id:c.id,at:'2026-09-12T08:00:00+07:00',grade:2,prev_interval:1,new_interval:4,elapsed_days:1,ms:1000});}
  s.history[today]=59;ensureSession(deck,s,today);assert.deepEqual(s.session.queue,['v060']);
  answer(deck,s,0,today,{now:at()});assert.equal(ratedToday(s,today).size,60);assert.deepEqual(s.session.queue,['v060']);
  const restored=JSON.parse(JSON.stringify(s));ensureSession(deck,restored,today);answer(deck,restored,0,today,{now:at()});assert.deepEqual(restored.session.queue,['v060']);
  const c={...deck[59],...restored.cards.v060};const preview=scheduledGrade(c,0,restored.session,today);assert.equal(preview.requeue,false);assert.equal(preview.card.interval,1);
  answer(deck,restored,0,today,{now:at()});assert.equal(restored.reviews.length,62);assert.equal(restored.session.queue.length,0);
  assert.equal(restored.cards.v060.due,tomorrow);assert.equal(restored.cards.v060.interval,1);assert.equal(restored.cards.v060.state,'learning');
  assert.deepEqual(restored.reviews.slice(0,60),s.reviews);assert.equal(restored.reviews[61].new_interval,1);
  ensureSession(deck,restored,today);assert.equal(restored.session.queue.length,0);
});
test('Hard on learning cards is also bounded, with matching third-attempt preview',()=>{
  const s=ensureSession(deck,initialState(),today);s.session.queue=['v001'];
  answer(deck,s,1,today);answer(deck,s,1,today);
  assert.equal(scheduledGrade({...deck[0],...s.cards.v001},1,s.session,today).requeue,false);
  answer(deck,s,1,today);assert.equal(s.cards.v001.due,tomorrow);assert.equal(s.reviews.length,3);assert.equal(s.session.queue.length,0);
});
test('schema-1 JSON migration preserves data, adds empty log without fabricated history',()=>{
  const legacy={schema_version:1,updated_at:'2026-09-12T08:40:00+07:00',device:'android',streak:3,last_studied:today,history:{[today]:14},cards:{v001:scheduleFields({...deck[0],state:'review',interval:4,last_review:today,due:'2026-09-16'})}};
  const before=structuredClone(legacy);migrateProgress(legacy);assert.deepEqual(legacy.cards,before.cards);assert.deepEqual(legacy.history,before.history);assert.equal(legacy.streak,3);assert.deepEqual(legacy.reviews,[]);assert.equal(legacy.schema_version,2);
  assert.deepEqual(buildQueue(deck,legacy,today),[]);assert.equal(buildQueue(deck,legacy,tomorrow).length,5);
  const exported=exportProgress(legacy,at());assert.equal(exported.schema_version,2);assert.deepEqual(exported.reviews,[]);
});
test('Bangkok midnight resets daily distinct/new allowance and session repeat counts',()=>{
  const s=ensureSession(deck,initialState(),today);finish(s,0);assert.equal(s.reviews.length,15);
  assert.equal(s.session.queue.length,0);ensureSession(deck,s,tomorrow);assert.deepEqual(s.session.repeats,{});assert.equal(s.session.queue.length,10);assert.equal(ratedToday(s,tomorrow).size,0);
});
test('migration never resets malformed or future review schemas',()=>{
  assert.throws(()=>migrateProgress({...initialState(),schema_version:3}));assert.throws(()=>migrateProgress({...initialState(),reviews:null}));
});