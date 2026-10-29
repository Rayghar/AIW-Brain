// The change journal kept compact (round 12, PS-08), a server module. At the size of a drafted design the journal was
// 90% of the project document (73.9 M of 81.6 M characters), and every read, save and answer carried it:
//   - every affected record of an interface change kept its explanation twice, as `why` and as its `reasons` joined
//     (16.5 M characters): `why` is now left out wherever it is exactly its `reasons` joined and stands just before them,
//     and read as that (changes-domain.js itemWhy);
//   - every superseded change was kept whole (2,529 changes, 41.2 M characters), although nothing reads an earlier change
//     but the journal's annex: once ARCHIVE_EVENTS of them (or ARCHIVE_BYTES of text) are waiting, each is moved, whole,
//     to an archive page (immutable private objects beside the journal's segments) and the journal keeps its identity,
//     who made it and when, the change that superseded it, its count of affected records and where it is
//     (changes-domain.js isArchived). The annex (change-journal.js), GET /api/changes and every export a project can be
//     restored from read the archived changes back whole (hydrateJournal).
// The compaction is pure: the same journal compacts to the same journal and the same archive pages, and a compacted
// journal compacts to itself. It is reversible: expanding it (expandJournal) gives back the journal it was made from,
// character for character, so a recovery package carries the journal as it was and a restore compacts it again
// (journal-archive-validate.mjs holds both, and that every reading of the journal judges the same after it).
import {changeSource,registerLegacyJournal,legacyChanges} from './public/changes-domain.js';
// The conversion of a document saved before the change journal is the server's (changes-domain.js withChanges).
registerLegacyJournal(legacyChanges);
import {integrityError} from './error-message.js';

export const ARCHIVE_EVENTS=25,ARCHIVE_BYTES=512*1024;
const sourceKey=e=>{const s=changeSource(e);return JSON.stringify([s.chapter,s.id]);};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);

// An affected record with its explanation kept once: `why` is left out where it is exactly `reasons` joined and the key
// just before `reasons` (so that expanding it puts it back where it was).
export function compactItem(i){
  if(!plain(i)||typeof i.why!=='string'||!Array.isArray(i.reasons)||!i.reasons.every(r=>typeof r==='string')||i.why!==i.reasons.join(' '))return i;
  const keys=Object.keys(i),at=keys.indexOf('why');if(keys[at+1]!=='reasons')return i;
  const out={};for(const k of keys)if(k!=='why')out[k]=i[k];return out;
}
export function expandItem(i){
  if(!plain(i)||Object.hasOwn(i,'why')||!Array.isArray(i.reasons))return i;
  const out={};for(const k of Object.keys(i)){if(k==='reasons')out.why=i.reasons.join(' ');out[k]=i[k];}return out;
}
// A change whose affected records keep their explanations once (the same object when nothing is left out).
export function compactEvent(e){
  if(!plain(e)||!Array.isArray(e.items))return e;
  let items=null;for(let k=0;k<e.items.length;k++){const x=e.items[k],y=compactItem(x);if(y!==x){items??=e.items.slice();items[k]=y;}}
  return items?{...e,items}:e;
}
export function expandEvent(e){
  if(!plain(e)||!Array.isArray(e.items))return e;
  let items=null;for(let k=0;k<e.items.length;k++){const x=e.items[k],y=expandItem(x);if(y!==x){items??=e.items.slice();items[k]=y;}}
  return items?{...e,items}:e;
}
// What the journal keeps of an archived change.
function stubOf(e,supersededBy,page){
  return {id:e.id,...(e.requirementId!==undefined?{requirementId:e.requirementId}:{}),...(e.source!==undefined?{source:e.source}:{}),title:e.title,at:e.at,...(e.actor!==undefined?{actor:e.actor}:{}),...(e.authorKind!==undefined?{authorKind:e.authorKind}:{}),...(e.reason!==undefined?{reason:e.reason}:{}),supersededBy,items:[],archived:{page,items:Array.isArray(e.items)?e.items.length:0}};
}
// compactJournal(events, {pageCount}): the journal to keep and the archive pages to add after the pageCount pages the
// project has (each an array of whole changes, in the order they were recorded). The same events array when nothing
// changes.
export function compactJournal(events,{pageCount=0}={}){
  if(!Array.isArray(events)||!events.length)return {events,pages:[]};
  const last=new Map();events.forEach((e,i)=>{if(plain(e))last.set(sourceKey(e),i);});
  let out=null;const set=(i,v)=>{if(v!==events[i]){out??=events.slice();out[i]=v;}};
  for(let i=0;i<events.length;i++){const e=events[i];if(plain(e)&&!e.archived)set(i,compactEvent(e));}
  const kept=out||events,waiting=[];let bytes=0;
  for(let i=0;i<kept.length;i++){const e=kept[i];if(!plain(e)||e.archived||last.get(sourceKey(e))===i)continue;const n=JSON.stringify(e).length;waiting.push({i,n});bytes+=n;}
  const pages=[];
  if(waiting.length>=ARCHIVE_EVENTS||bytes>=ARCHIVE_BYTES){
    // The change that superseded each: the next change of the same record.
    const next=new Map(),later=new Map();
    for(let i=kept.length-1;i>=0;i--){const e=kept[i];if(!plain(e))continue;const k=sourceKey(e);if(later.has(k))next.set(i,later.get(k));later.set(k,kept[i].id);}
    let page=[],size=0;
    const close=()=>{if(page.length){pages.push(page);page=[];size=0;}};
    for(const {i,n} of waiting){
      if(page.length&&(page.length>=ARCHIVE_EVENTS||size+n>ARCHIVE_BYTES))close();
      page.push(kept[i]);size+=n;set(i,stubOf(kept[i],next.get(i)||null,pageCount+pages.length));
    }
    close();
  }
  return {events:out||events,pages};
}
// The journal as it was before it was compacted: every archived change whole again (pages: the project's archive pages,
// each an array of changes, by page number), every explanation kept twice where it was.
export function expandJournal(events,pages){
  if(!Array.isArray(events))return events;
  return events.map(e=>{
    if(!plain(e)||!e.archived)return expandEvent(e);
    const whole=pages[e.archived.page]?.find(x=>x?.id===e.id);
    if(!whole)throw integrityError('An archived change could not be found in its archive page.','archive:'+e.archived.page);
    return expandEvent(whole);
  });
}

// ---------------------------------------------------------------- consecutive saves folded (round 12, A3: GR-STO-07)
// A person who saves one record's fields several times in a row (a title, then its description, then its owner) made one
// change of it in as many saves, and the journal kept a change for each. A save whose one change follows, in the journal,
// a change of the same record by the same person, within FOLD_WINDOW_MS, that nobody has reviewed yet, folds into it:
// one change, under the earlier id, from the record as it was before the first save to the record after the last, its
// fields each with their first value before and their last value after, its affected records those of both, counted in
// `folded`. A request for review, a removal, a change already reviewed or archived, another person's or another record's
// change is never folded, and neither is a change that would say nothing (every field back as it was).
export const FOLD_WINDOW_MS=30*60*1000;
// A step a person reviewed as one (a bulk confirmation, an evidence or journey treatment: requirement-commands.js journal,
// marked reviewed) is a change of its own, never folded.
// A person-authored save is marked `reviewed: true` by the command route after this function runs. That authorship
// marker says a person stood behind the save; it does not mean the affected records were reviewed. A newly journalled
// review step, however, already has `reviewed: true` before the route annotates it. Previously saved reviewed steps
// retain their source kind (or preview flag), while ordinary saves carry their author kind.
const reviewedStep=(e,fresh=false)=>e.preview?.reviewed===true||(e.reviewed===true&&(fresh||!e.authorKind||String(changeSource(e).kind||'').startsWith('requirements-')));
const foldable=(e,fresh=false)=>plain(e)&&!e.archived&&!e.request&&!e.legacy&&!reviewedStep(e,fresh)&&e.before!=null&&e.after!=null&&Array.isArray(e.fields)&&e.fields.length>0&&Array.isArray(e.items)&&e.items.every(i=>!(i?.reviews||[]).length);
// A save folds only into a change of its own author kind (round 23): a person's save never takes over a change Sol
// drafted, nor Sol's a person's, so a draft keeps "drafted by Sol, not reviewed by a person"; a change whose author
// kind is not recorded is never folded into. `authorKind` is the kind the route will stamp on the new save.
export function foldChange(prior,next,actor,at,authorKind=null){
  const before=prior?.changes?.events,after=next?.changes?.events;
  if(!Array.isArray(before)||!Array.isArray(after)||after.length!==before.length+1||!before.length)return null;
  const p=after[before.length-1],n=after.at(-1);
  if(p?.id!==before.at(-1)?.id||!foldable(p)||!foldable(n,true)||!actor||p.actor!==actor||(n.actor!=null&&n.actor!==actor)||sourceKey(p)!==sourceKey(n))return null;
  if(!p.authorKind||p.authorKind!==(n.authorKind??authorKind))return null;
  const t=Date.parse(at),t0=Date.parse(p.at);if(!(t>=t0&&t-t0<=FOLD_WINDOW_MS))return null;
  const fields=new Map(p.fields.map(f=>[f.key,f]));for(const f of n.fields){const was=fields.get(f.key);fields.set(f.key,was?{...f,before:was.before}:f);}
  const merged=[...fields.values()].filter(f=>JSON.stringify(f.before)!==JSON.stringify(f.after));if(!merged.length)return null;
  const items=new Map(p.items.map(i=>[i.key,i]));for(const i of n.items)items.set(i.key,i);
  const event={...n,id:p.id,before:p.before,fields:merged,items:[...items.values()],actor,folded:(p.folded||1)+1};
  next.changes={...next.changes,events:[...after.slice(0,before.length-1),event]};
  return event;
}

// ---------------------------------------------------------------- codes for the words a part repeats (round 12, A3: GR-STO-07)
// The affected records of a change carry the title of their chapter and the reasons they are affected in words, and the
// same few sentences recur on thousands of records. A part of the journal (a segment, the head, an archive page) is stored
// as {codes, events}: each chapter title and reason (chapterTitle, why, reasons) is stored once in the part's codes and
// named by its place there ({"$c": n}). Read, every code is printed in words again, exactly; a part stored as a plain
// array of changes (before this round) reads as before.
const CODED=new Set(['chapterTitle','why']);
export function encodeEvents(events){
  const codes=[],at=new Map(),code=v=>{let n=at.get(v);if(n===undefined){n=codes.length;codes.push(v);at.set(v,n);}return {$c:n};};
  const out=events.map(e=>{
    if(!plain(e)||!Array.isArray(e.items))return e;
    let items=null;
    e.items.forEach((i,k)=>{
      if(!plain(i))return;let coded=false;const o={};
      for(const key of Object.keys(i)){let v=i[key];if(CODED.has(key)&&typeof v==='string'){v=code(v);coded=true;}else if(key==='reasons'&&Array.isArray(v)&&v.length&&v.every(x=>typeof x==='string')){v=v.map(code);coded=true;}o[key]=v;}
      if(coded){items??=e.items.slice();items[k]=o;}
    });
    return items?{...e,items}:e;
  });
  return codes.length?{codes,events:out}:events;
}
export function decodeEvents(stored,key){
  if(Array.isArray(stored))return stored;
  if(!plain(stored)||!Array.isArray(stored.codes)||!Array.isArray(stored.events))throw integrityError('A stored part of the change history could not be read.',key);
  const word=v=>{if(!plain(v)||!Object.hasOwn(v,'$c'))return v;const t=stored.codes[v.$c];if(typeof t!=='string'||Object.keys(v).length!==1)throw integrityError('A stored part of the change history names a code it does not hold.',key);return t;};
  return stored.events.map(e=>{
    if(!plain(e)||!Array.isArray(e.items))return e;
    return {...e,items:e.items.map(i=>{if(!plain(i))return i;const o={};for(const k of Object.keys(i)){let v=i[k];if(CODED.has(k))v=word(v);else if(k==='reasons'&&Array.isArray(v))v=v.map(word);o[k]=v;}return o;})};
  });
}

// ---------------------------------------------------------------- the archive in private object storage
// The project's archive pages, as its row lists them: [{key, count, first, last}], by page number.
export async function readArchivePages(env,archive,numbers){
  const out=[];
  await Promise.all([...new Set(numbers)].map(async n=>{
    const meta=archive?.[n];if(!meta)throw integrityError('The change history archive is incomplete.','archive:'+n);
    const file=await env.FILES?.get(meta.key);if(!file)throw integrityError('The change history archive could not be loaded.',meta.key);
    let events;try{events=JSON.parse(await file.text());}catch{throw integrityError('The change history archive could not be read.',meta.key);}
    events=decodeEvents(events,meta.key);
    if(!Array.isArray(events)||events.length!==meta.count||events[0]?.id!==meta.first||events.at(-1)?.id!==meta.last)throw integrityError('The change history archive does not match its saved reference.',meta.key);
    out[n]=events;
  }));
  return out;
}
// The journal's events from..to (all by default) with every archived change among them whole again and every
// explanation as it was: what the annex, GET /api/changes and the exports a project can be restored from read.
export async function hydrateEvents(env,archive,events,from=0,to=events?.length||0){
  if(!Array.isArray(events))return events;
  const slice=events.slice(from,to),pages=await readArchivePages(env,archive,slice.filter(e=>e?.archived).map(e=>e.archived.page));
  const whole=expandJournal(slice,pages);
  return from===0&&to>=events.length?whole:[...events.slice(0,from),...whole,...events.slice(to)];
}
// A document whose journal is whole again (a copy: the document given is not changed).
export async function hydrateJournal(env,archive,p){
  if(!Array.isArray(p?.changes?.events))return p;
  return {...p,changes:{...p.changes,events:await hydrateEvents(env,archive,p.changes.events)}};
}
