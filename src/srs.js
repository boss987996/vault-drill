export const EASE_START=2.5, EASE_MIN=1.3, EASE_MAX=3, MATURE_DAYS=21, MAX_NEW_PER_DAY=5, MAX_REVIEWS_PER_DAY=60, MAX_SAME_SESSION_REPEATS=3, MAX_PER_SESSION=40, REQUEUE_GAP=3;
export function bangkokDay(now=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function addDays(day,n) { const d=new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
export function grade(card,g,today=bangkokDay()) {
  if (![0,1,2,3].includes(g)) throw new Error('Invalid grade');
  const c={...card}; let requeue=false;
  if(c.state==='new'||c.state==='learning') {
    if(g<2) { c.state='learning'; c.due=today; c.last_review=today; return {card:c,requeue:true}; }
    c.state='review'; c.interval=g===2?1:4; c.reps=1;
  } else if(g===0) { c.lapses+=1; c.ease-=.20; c.interval=1; c.state='learning'; requeue=true;
  } else if(g===1) { c.ease-=.15; c.interval=Math.max(1,Math.round(c.interval*1.2)); c.reps+=1;
  } else if(g===2) { c.interval=Math.max(1,Math.round(c.interval*c.ease)); c.reps+=1;
  } else { c.ease+=.15; c.interval=Math.max(1,Math.round(c.interval*c.ease*1.3)); c.reps+=1; }
  // Section 5 calculates interval before clamping ease.
  c.ease=Math.min(EASE_MAX,Math.max(EASE_MIN,c.ease)); c.due=addDays(today,c.interval); c.last_review=today;
  return {card:c,requeue};
}
export const scheduleFields=c=>Object.fromEntries(['ease','interval','reps','lapses','due','state','last_review'].map(k=>[k,c[k]]));
export const initialState=()=>({schema_version:2,cards:{},reviews:[],history:{},introduced:{},streak:0,last_studied:null,session:null,revision:0});
export const bangkokTimestamp=(now=new Date())=>new Date(now.getTime()+7*3600000).toISOString().replace('Z','+07:00');
export function migrateProgress(s) {
  if(s.schema_version!=null&&![1,2].includes(s.schema_version)) throw new Error('Unsupported progress schema');
  if(s.reviews===undefined) s.reviews=[];
  if(!Array.isArray(s.reviews)) throw new Error('Invalid review log');
  s.legacyNewDays??=s.introduced===undefined?Object.keys(s.history||{}):[];
  s.schema_version=2; s.cards??={}; s.history??={}; s.introduced??={};
  s.streak??=0; s.last_studied??=null; s.session??=null; s.revision??=0;
  if(s.session) s.session.repeats??={};
  return s;
}
export const cardsWithProgress=(deck,s)=>deck.map(c=>({...c,...s.cards[c.id]}));
export const ratedToday=(s,today=bangkokDay())=>new Set(Object.entries(s.cards).filter(([,c])=>c.last_review===today).map(([id])=>id));
export function newToday(s,today) {
  // Exported v1 files lack introduction metadata: conservatively reserve the five
  // slots on a previously studied migration day rather than introduce too many.
  if(s.legacyNewDays?.includes(today)) return MAX_NEW_PER_DAY;
  return new Set(s.introduced[today]||[]).size;
}
export function buildQueue(deck,s,today=bangkokDay()) {
  migrateProgress(s);
  const cards=cardsWithProgress(deck,s), slots=Math.max(0,MAX_REVIEWS_PER_DAY-ratedToday(s,today).size);
  const due=cards.filter(c=>c.state!=='new'&&c.due<=today).sort((a,b)=>a.due.localeCompare(b.due));
  const allowance=Math.max(0,Math.min(MAX_NEW_PER_DAY-newToday(s,today),slots-due.length));
  return [...due,...cards.filter(c=>c.state==='new').slice(0,allowance)].slice(0,Math.min(MAX_PER_SESSION,slots)).map(c=>c.id);
}
function limitSavedQueue(deck,s,today) {
  const session=s.session, rated=ratedToday(s,today);
  let slots=Math.max(0,MAX_REVIEWS_PER_DAY-rated.size), newSlots=Math.max(0,MAX_NEW_PER_DAY-newToday(s,today));
  const byId=new Map(cardsWithProgress(deck,s).map(c=>[c.id,c]));
  const due=Array.from(byId.values()).filter(c=>c.state!=='new'&&c.due<=today&&!rated.has(c.id));
  newSlots=Math.min(newSlots,Math.max(0,slots-due.length));
  const oldFirst=session.queue[0];
  session.queue=session.queue.filter(id=>{
    const c=byId.get(id); if(!c) return false;
    if(rated.has(id)) return (session.repeats[id]||0)<MAX_SAME_SESSION_REPEATS;
    if(slots<=0) return false;
    if(c.state==='new') {if(newSlots<=0)return false;newSlots--;}
    slots--; return true;
  });
  if(oldFirst!==session.queue[0]) session.revealed=false;
}
export function ensureSession(deck,s,today=bangkokDay()) {
  migrateProgress(s);
  if(s.session?.day===today) limitSavedQueue(deck,s,today);
  if(s.session?.day!==today || (!s.session.queue.length && buildQueue(deck,s,today).length)) s.session={day:today,queue:buildQueue(deck,s,today),reviewed:[],before:{},attempts:0,revealed:false,repeats:{}};
  return s;
}
// Policy wrapper: grade() itself stays byte-for-byte unchanged.
export function scheduledGrade(card,g,session,today=bangkokDay()) {
  const result=grade(card,g,today);
  if(result.requeue&&(session.repeats?.[card.id]||0)+1>=MAX_SAME_SESSION_REPEATS) {
    result.card.state='learning';result.card.interval=1;result.card.due=addDays(today,1);result.requeue=false;
  }
  return result;
}
export function answer(deck,s,g,today=bangkokDay(),{now=new Date(),ms=null}={}) {
  ensureSession(deck,s,today); const session=s.session;
  if(!session.queue.length) return s;
  const id=session.queue[0], c={...deck.find(c=>c.id===id),...s.cards[id]};
  const result=scheduledGrade(c,g,session,today);
  session.queue.shift();session.before[id]||=scheduleFields(c);
  if(c.state==='new') { s.introduced[today]||=[]; s.introduced[today].push(id); }
  if(grade(c,g,today).requeue) session.repeats[id]=(session.repeats[id]||0)+1;
  s.cards[id]=scheduleFields(result.card);
  if(result.requeue) session.queue.splice(Math.min(REQUEUE_GAP,session.queue.length),0,id);
  if(!session.reviewed.includes(id)) session.reviewed.push(id);
  session.attempts+=1; session.revealed=false; s.history[today]=(s.history[today]||0)+1;
  const elapsed=c.last_review?Math.max(0,Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(c.last_review+'T00:00:00Z'))/86400000)):0;
  s.reviews.push({id,at:bangkokTimestamp(now),grade:g,prev_interval:c.interval,new_interval:result.card.interval,elapsed_days:Number.isFinite(elapsed)?elapsed:0,ms:Number.isFinite(ms)&&ms>=0?Math.round(ms):null});
  if(s.last_studied!==today) { s.streak=s.last_studied===addDays(today,-1)?s.streak+1:1; s.last_studied=today; }
  return s;
}
export function nextDue(deck,s,today=bangkokDay()) {
  migrateProgress(s);
  const cards=cardsWithProgress(deck,s), capped=ratedToday(s,today).size>=MAX_REVIEWS_PER_DAY;
  const earliest=capped?addDays(today,1):today;
  const dates=cards.filter(c=>c.state!=='new').map(c=>c.due<earliest?earliest:c.due);
  if(cards.some(c=>c.state==='new')) dates.push(!capped&&newToday(s,today)<MAX_NEW_PER_DAY?today:addDays(today,1));
  return dates.sort()[0]||null;
}
export function exportProgress(s,now=new Date()) {
  migrateProgress(s);
  return {schema_version:2,updated_at:bangkokTimestamp(now),device:'android',streak:s.streak,last_studied:s.last_studied,history:{...s.history},cards:structuredClone(s.cards),reviews:structuredClone(s.reviews)};
}
