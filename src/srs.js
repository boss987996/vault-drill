export const EASE_START=2.5, EASE_MIN=1.3, EASE_MAX=3, MATURE_DAYS=21, MAX_NEW_PER_DAY=10, MAX_PER_SESSION=40, REQUEUE_GAP=3;
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
export const initialState=()=>({cards:{},history:{},introduced:{},streak:0,last_studied:null,session:null,revision:0});
export const cardsWithProgress=(deck,s)=>deck.map(c=>({...c,...s.cards[c.id]}));
export function buildQueue(deck,s,today=bangkokDay()) {
  const cards=cardsWithProgress(deck,s), allowance=Math.max(0,MAX_NEW_PER_DAY-(s.introduced[today]?.length||0));
  const due=cards.filter(c=>c.state!=='new'&&c.due<=today).sort((a,b)=>a.due.localeCompare(b.due));
  return [...due,...cards.filter(c=>c.state==='new').slice(0,allowance)].slice(0,MAX_PER_SESSION).map(c=>c.id);
}
export function ensureSession(deck,s,today=bangkokDay()) {
  if(s.session?.day!==today || (!s.session.queue.length && buildQueue(deck,s,today).length)) s.session={day:today,queue:buildQueue(deck,s,today),reviewed:[],before:{},attempts:0,revealed:false};
  return s;
}
export function answer(deck,s,g,today=bangkokDay()) {
  ensureSession(deck,s,today); const session=s.session;
  if(!session.queue.length) return s;
  const id=session.queue.shift(), c={...deck.find(c=>c.id===id),...s.cards[id]};
  session.before[id]||=scheduleFields(c);
  if(c.state==='new') { s.introduced[today]||=[]; s.introduced[today].push(id); }
  const result=grade(c,g,today); s.cards[id]=scheduleFields(result.card);
  // Owner approved 40 distinct cards, with repeated attempts beyond 40.
  if(result.requeue) session.queue.splice(Math.min(REQUEUE_GAP,session.queue.length),0,id);
  if(!session.reviewed.includes(id)) session.reviewed.push(id);
  session.attempts+=1; session.revealed=false; s.history[today]=(s.history[today]||0)+1;
  if(s.last_studied!==today) { s.streak=s.last_studied===addDays(today,-1)?s.streak+1:1; s.last_studied=today; }
  return s;
}
export function nextDue(deck,s,today=bangkokDay()) {
  const cards=cardsWithProgress(deck,s), dates=cards.filter(c=>c.state!=='new').map(c=>c.due<today?today:c.due);
  if(cards.some(c=>c.state==='new')) dates.push((s.introduced[today]?.length||0)<MAX_NEW_PER_DAY?today:addDays(today,1));
  return dates.sort()[0]||null;
}
export function exportProgress(s,now=new Date()) {
  return {schema_version:1,updated_at:new Date(now.getTime()+7*3600000).toISOString().replace('Z','+07:00'),device:'android',streak:s.streak,last_studied:s.last_studied,history:{...s.history},cards:structuredClone(s.cards)};
}
