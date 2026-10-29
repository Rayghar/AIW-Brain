import {digest,sha256} from './public/brain-integrity.js';
import {readRequirements,writeRequirements,requirementIndexStatements} from './requirement-storage.js';
import {integrityError} from './error-message.js';
import {projectSummary,projectSummaryOf,projectReadiness} from './shared/projects-domain.js';
// Baselines are immutable documents. Keep their bytes in private object storage
// and only their references in the revision-controlled working project row.
import {compactJournal,compactEvent,expandEvent,hydrateEvents,hydrateJournal,encodeEvents,decodeEvents} from './journal-archive.js';
const prefix=(owner,projectId)=>'baselines/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const journalPrefix=(owner,projectId)=>'changes/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const evidencePrefix=(owner,projectId)=>'evidence/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const alternativesPrefix=(owner,projectId)=>'alternatives/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const knowledgePrefix=(owner,projectId)=>'knowledge/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
// The change journal (round 2, B2-03) is kept in segments: sealed segments of up to SEGMENT_EVENTS events (or
// SEGMENT_BYTES) and one open head. An edit rewrites the head only; a sealed segment is rewritten only when an event
// inside it changed (a review recorded on an earlier change). Superseded objects are listed in the row and deleted
// by a later save once SWEEP_GRACE_MS has passed, so a read that already holds the old reference still completes.
export const SEGMENT_EVENTS=25,SEGMENT_BYTES=512*1024,SWEEP_GRACE_MS=10*60*1000;
const put=(env,key,bytes)=>env.FILES.put(key,bytes,{httpMetadata:{contentType:'application/json'}});
export async function readStoredProject(env,owner,serialized){
  const document=JSON.parse(serialized),keys=new Map();
  if(document.storageSweep){keys.set('__sweep',document.storageSweep);delete document.storageSweep;}
  // Objects a recovery point names (storage-upgrade.js): kept by every later save, whichever row references them.
  if(document.storageRetained){keys.set('__retained',document.storageRetained);delete document.storageRetained;}
  await readRequirements(env,owner,document,keys);
  for(const field of ['workbench','assurance','guidance','intake','interfaceExtensions','caseExtensions']){
    const meta=document[field];if(!meta?.storageKey)continue;
    if(!env.FILES||!meta.storageKey.startsWith('extensions/'+encodeURIComponent(owner)+'/'+encodeURIComponent(document.id)+'/'+field+'/'))throw Error('Private extension storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw integrityError('Saved '+field+' could not be loaded.',meta.storageKey);
    const bytes=await file.text(),value=JSON.parse(bytes);if(digest(value)!==meta.checksum)throw integrityError('The '+field+' integrity check failed.',meta.storageKey);
    keys.set('__'+field,{key:meta.storageKey,bytes});document[field]=value;
  }
  // The workbench's and the guided sessions' histories, kept as append-only logs (round 12, GR-STO-05: below).
  if(document.historyLogs){await readHistoryLogs(env,owner,document,keys);delete document.historyLogs;}
  if(document.caseExtensions){Object.assign(document.finalReview,document.caseExtensions);delete document.caseExtensions;}
  if(document.interfaceExtensions){Object.assign(document.interfaces,document.interfaceExtensions);delete document.interfaceExtensions;}
  if(document.knowledge?.storageKey){
    const meta=document.knowledge;if(!env.FILES||!meta.storageKey.startsWith(knowledgePrefix(owner,document.id)))throw Error('Private architecture knowledge storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw integrityError('The saved architecture knowledge could not be loaded.',meta.storageKey);
    const bytes=await file.text(),knowledge=JSON.parse(bytes);if(knowledge.version!==meta.version||digest(knowledge)!==meta.checksum)throw integrityError('The knowledge does not match its exact saved reference.',meta.storageKey);
    keys.set('__knowledge',{key:meta.storageKey,bytes});document.knowledge=knowledge;
  }
  if(document.modelAlternatives?.storageKey){
    const meta=document.modelAlternatives;
    if(!env.FILES||!meta.storageKey.startsWith(alternativesPrefix(owner,document.id)))throw Error('Private alternative storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw integrityError('Saved model alternatives could not be loaded.',meta.storageKey);
    const bytes=await file.text(),alternatives=JSON.parse(bytes);
    if(alternatives.counter!==meta.counter||alternatives.records?.length!==meta.recordCount)throw integrityError('The alternatives do not match their saved reference.',meta.storageKey);
    keys.set('__alternatives',{key:meta.storageKey,bytes});document.modelAlternatives=alternatives;
  }
  if(document.coauthoring?.storageKey){
    const meta=document.coauthoring;
    if(!env.FILES||!meta.storageKey.startsWith(evidencePrefix(owner,document.id)))throw Error('Private evidence storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw integrityError('The saved project evidence could not be loaded.',meta.storageKey);
    const bytes=await file.text(),evidence=JSON.parse(bytes);
    if((meta.narrativeCount!==undefined&&(evidence.narratives?.length||0)!==meta.narrativeCount)||evidence.sources?.length!==meta.sourceCount||evidence.tasks?.length!==meta.taskCount||(meta.designTaskCount!==undefined&&(evidence.designTasks?.length||0)!==meta.designTaskCount))throw integrityError('The evidence does not match its saved reference.',meta.storageKey);
    keys.set('__evidence',{key:meta.storageKey,bytes});document.coauthoring=evidence;
  }
  if(document.changes?.storageKey){
    // Journal written before segments (schema 1): one object holding the whole journal. Read as before; the next
    // save moves it into segments and supersedes the object.
    const meta=document.changes;
    if(!env.FILES||!meta.storageKey.startsWith(journalPrefix(owner,document.id)))throw Error('Private change history is unavailable.');
    const file=await env.FILES.get(meta.storageKey);
    if(!file)throw integrityError('The saved change history could not be loaded.',meta.storageKey);
    const bytes=await file.text(),journal=JSON.parse(bytes);
    if(journal.counter!==meta.counter||journal.events?.length!==meta.eventCount)throw integrityError('The change history does not match its saved reference.',meta.storageKey);
    keys.set('__change_journal',{key:meta.storageKey,bytes,archive:[]});document.changes=journal;
  }else if(document.changes?.segments){
    const meta=document.changes,parts=[...meta.segments,...(meta.head?[meta.head]:[])];
    if(!env.FILES||parts.some(part=>typeof part?.key!=='string'||!part.key.startsWith(journalPrefix(owner,document.id))))throw Error('Private change history is unavailable.');
    const loaded=await Promise.all(parts.map(async part=>{
      const file=await env.FILES.get(part.key);if(!file)throw integrityError('The saved change history could not be loaded.',part.key);
      const bytes=await file.text();let events;try{events=JSON.parse(bytes);}catch{throw integrityError('The saved change history could not be read.',part.key);}
      // A part stored with codes for the words it repeats (round 12, GR-STO-07: journal-archive.js) is read in words.
      events=decodeEvents(events,part.key);
      if(!Array.isArray(events)||events.length!==part.count)throw integrityError('The change history does not match its saved reference.',part.key);
      return {key:part.key,count:part.count,bytes,events};
    }));
    const events=loaded.flatMap(part=>part.events);
    if(events.length!==meta.eventCount)throw integrityError('The change history does not match its saved reference.');
    // The archive pages of the earlier changes the journal keeps compact (journal-archive.js): read only by what needs an
    // archived change whole, never with the document.
    const archive=meta.archive||[];
    if(archive.some(page=>typeof page?.key!=='string'||!page.key.startsWith(journalPrefix(owner,document.id))||!Number.isInteger(page.count)))throw Error('Private change history is unavailable.');
    keys.set('__change_journal',{segments:loaded.slice(0,meta.segments.length).map(({key,count,bytes,events})=>({key,count,bytes,events})),head:meta.head?(({key,count,bytes})=>({key,count,bytes}))(loaded.at(-1)):null,archive,compacted:meta.compacted===true});
    document.changes={schemaVersion:1,counter:meta.counter,events};
  }
  // A frozen baseline is read as its metadata, its parts left where they are (openBaseline reads them); a baseline stored
  // whole before round 12 (storageKey) is read whole, as before, until the storage upgrade keeps it in parts.
  if(document.finalReview){
    const parts=new Set();
    document.finalReview.baselines=await Promise.all(document.finalReview.baselines.map(async b=>{
      if(b?.frozen){checkFrozenEntry(b,owner,document.id);keys.set('baseline:'+b.id,JSON.stringify(b));for(const part of Object.values(b.frozen.parts))parts.add(part.sha256);return b;}
      if(!b.storageKey)return b; // Earlier local drafts remain readable.
      if(!env.FILES||!b.storageKey.startsWith(prefix(owner,document.id)))throw Error('Private baseline storage is unavailable.');
      const file=await env.FILES.get(b.storageKey);
      if(!file)throw integrityError('A captured baseline could not be loaded.',b.storageKey);
      const snapshot=JSON.parse(await file.text());
      if(snapshot.id!==b.id||snapshot.stamp!==b.stamp)throw integrityError('The baseline reference does not match its snapshot.',b.storageKey);
      keys.set(b.id,b.storageKey);return snapshot;
    }));
    keys.set('__baseline_parts',parts);
  }
  return {document,keys};
}

// ---------------------------------------------------------------- frozen baselines (round 12, A3: GR-STO-02, GR-PERF-13)
// A baseline is immutable. Its parts — the design source, the review state, the change journal of that moment, the
// inherited findings, the connected model and the frozen SDD — are private objects named by the SHA-256 of their bytes
// (content-addressed: a part frozen again unchanged is stored once), and the working row keeps the baseline's metadata —
// what the screens list and judge by: its id, title, classification, stamps, chapter summary and the review outcome its
// four-eyes rule reads — with the SHA-256 of each part and the baseline's own SHA-256 over all of it (frozen.sha256). A
// project read carries no part, so it does not grow with the parts of its baselines; a part is read, and checked against
// its SHA-256, only when a baseline is opened (openBaseline: an export of it, a comparison, its recovery). The journal
// of a baseline is kept whole (an archived change read back as it was archived) in chunks of BASELINE_JOURNAL_CHUNK
// changes, each with its explanations kept once (journal-archive.js compactEvent, reversed when read), so a later freeze
// stores only the chunks that changed. A part is never deleted by a save: another baseline may hold the same bytes.
export const BASELINE_SCHEMA='aiw.baseline.v2',BASELINE_PARTS=['source','review','journal','findings','model','markdown'],BASELINE_JOURNAL_CHUNK=250;
const PART_FIELDS=new Set(['source','review','findings','model','markdown']),SHA=/^[a-f0-9]{64}$/;
export const baselinePartKey=(owner,projectId,sha)=>prefix(owner,projectId)+'parts/'+sha+'.json';
// The SHA-256 that names a frozen baseline: of its metadata and the SHA-256 of each of its parts.
const baselineRoot=entry=>{const {frozen,...meta}=entry;return digest({schema:frozen.schema,prefix:frozen.prefix,meta,order:frozen.order,reviewOrder:frozen.reviewOrder,sourceDigest:frozen.sourceDigest,parts:frozen.parts});};
function checkFrozenEntry(b,owner,projectId){
  const f=b.frozen;
  // A baseline's parts are its project's: named under its owner's and project's prefix, which its SHA-256 covers.
  if(f?.prefix!==prefix(owner,projectId))throw Error('Private baseline storage is unavailable.');
  if(f.schema!==BASELINE_SCHEMA||typeof b.id!=='string'||!SHA.test(f.sha256||'')||!Array.isArray(f.order)||!f.parts||typeof f.parts!=='object'||Object.entries(f.parts).some(([name,part])=>!BASELINE_PARTS.includes(name)||!SHA.test(part?.sha256||'')||!Number.isInteger(part.chars)))throw integrityError('A frozen baseline\'s record is incomplete.','baseline:'+b.id);
  if(baselineRoot(b)!==f.sha256)throw integrityError('A frozen baseline does not match its SHA-256.','baseline:'+b.id);
}
// The text of one part, checked against its SHA-256 and its length, and read.
async function readPart(env,owner,projectId,part,label){
  const key=baselinePartKey(owner,projectId,part.sha256),file=await env.FILES?.get(key);
  if(!file)throw integrityError('A part of a frozen baseline could not be loaded ('+label+').',key);
  const text=await file.text();
  if(sha256(text)!==part.sha256||(Number.isInteger(part.chars)&&text.length!==part.chars))throw integrityError('A part of a frozen baseline failed its SHA-256 check ('+label+').',key);
  try{return JSON.parse(text);}catch{throw integrityError('A part of a frozen baseline could not be read ('+label+').',key);}
}
// The parts of a frozen baseline asked for, read and checked: {name: value}, the journal as it was frozen, whole.
export async function readBaselineParts(env,owner,projectId,entry,names=BASELINE_PARTS){
  checkFrozenEntry(entry,owner,projectId);
  const f=entry.frozen,values={};
  await Promise.all([...new Set(names)].filter(n=>f.parts[n]).map(async name=>{
    const value=await readPart(env,owner,projectId,f.parts[name],entry.id+' '+name);
    if(name!=='journal'){values[name]=value;return;}
    if(!value||!Array.isArray(value.chunks)||!Array.isArray(value.order)||!value.head||typeof value.head!=='object'||value.chunks.some(c=>!SHA.test(c?.sha256||'')||!Number.isInteger(c.count)))throw integrityError('A frozen baseline\'s change journal is incomplete.','baseline:'+entry.id);
    const chunks=await Promise.all(value.chunks.map((c,i)=>readPart(env,owner,projectId,c,entry.id+' journal '+(i+1)))),events=[];
    value.chunks.forEach((c,i)=>{if(!Array.isArray(chunks[i])||chunks[i].length!==c.count)throw integrityError('A frozen baseline\'s change journal does not match its chunks.','baseline:'+entry.id);for(const e of chunks[i])events.push(expandEvent(e));});
    if(events.length!==value.count)throw integrityError('A frozen baseline\'s change journal does not match its count.','baseline:'+entry.id);
    values.journal=Object.fromEntries(value.order.map(k=>[k,k==='events'?events:value.head[k]]));
  }));
  if(values.review&&JSON.stringify(values.review.outcome??null)!==JSON.stringify(entry.review?.outcome??null))throw integrityError('A frozen baseline\'s review outcome does not match its record.','baseline:'+entry.id);
  return values;
}
// A frozen baseline with the parts asked for (all by default) read back and checked, in the order it was frozen: exactly
// the baseline frozen when every part is read. A baseline read whole (stored whole before round 12, or as a recovery
// package carries it) is answered as it is.
export async function openBaseline(env,owner,projectId,entry,names=BASELINE_PARTS){
  if(!entry?.frozen)return entry;
  const values=await readBaselineParts(env,owner,projectId,entry,names),f=entry.frozen,out={};
  for(const key of f.order){
    if(key==='review'){if(values.review)out.review=Object.fromEntries((f.reviewOrder||Object.keys(values.review)).filter(k=>k!=='changes'||values.journal).map(k=>[k,k==='changes'?values.journal:values.review[k]]));continue;}
    if(PART_FIELDS.has(key)){if(key in values)out[key]=values[key];continue;}
    out[key]=entry[key];
  }
  return out;
}
// A project as a package carries it, from which it can be restored (recovery-service.js, the project's JSON exports): its
// change journal whole (its archived changes read back) and every frozen baseline whole (its parts read and checked).
export async function wholeProject(env,owner,projectId,p,keys){
  const q=await hydrateJournal(env,keys.get('__change_journal')?.archive||[],p),list=q?.finalReview?.baselines;
  if(!Array.isArray(list)||!list.some(b=>b?.frozen))return q;
  return {...q,finalReview:{...q.finalReview,baselines:await Promise.all(list.map(b=>openBaseline(env,owner,projectId,b)))}};
}
// The last frozen baseline with its design source read, which the SDD's "changes since the last baseline" compares with
// the working design (sdd-document.js changesSinceBaseline): read when an edition is built, not with the project.
export async function withLastBaselineSource(env,owner,projectId,p){
  const list=p?.finalReview?.baselines,last=Array.isArray(list)?list.at(-1):null;
  if(!last?.frozen)return p;
  return {...p,finalReview:{...p.finalReview,baselines:[...list.slice(0,-1),await openBaseline(env,owner,projectId,last,['source'])]}};
}
// What a frozen baseline's design source reads as, for the reviews assigned on it (collaboration-service.js): its
// canonical digest, kept when it was frozen, or worked out from a baseline read whole.
export const baselineSourceDigest=b=>b?.frozen?b.frozen.sourceDigest:b?.source?digest(b.source):null;
// A baseline frozen in memory (a freeze, a recovery package, the storage upgrade of one stored whole) stored as parts:
// the entry the row keeps. known: the SHA-256 of the parts the project holds (none is written twice); archive: the
// project's journal archive, from which a journal frozen with archived changes is read back whole.
async function storeBaseline(env,owner,projectId,b,known,archive,parent){
  if(!env.FILES)throw Error('Private baseline storage is unavailable.');
  const put=async value=>{const text=JSON.stringify(value),hash=sha256(text);if(!known.has(hash)){await env.FILES.put(baselinePartKey(owner,projectId,hash),text,{httpMetadata:{contentType:'application/json'}});known.add(hash);}return {sha256:hash,chars:text.length};};
  const parts={},meta={};
  // The chunks of the parent baseline's journal are known too: a later freeze stores only the chunks that changed.
  if(parent?.frozen?.parts?.journal){try{const j=await readPart(env,owner,projectId,parent.frozen.parts.journal,parent.id+' journal');for(const c of j?.chunks||[])known.add(c.sha256);}catch{/* the parent's chunks are written again */}}
  for(const key of Object.keys(b)){
    if(!PART_FIELDS.has(key)){meta[key]=b[key];continue;}
    if(b[key]===undefined)continue;
    if(key!=='review'){parts[key]=await put(b[key]);continue;}
    const {changes,...review}=b.review||{};
    parts.review=await put(review);meta.review={outcome:b.review?.outcome??null};
    if(changes&&typeof changes==='object'){
      let events=Array.isArray(changes.events)?changes.events:[];
      if(events.some(e=>e?.archived))events=await hydrateEvents(env,archive||[],events);
      const chunks=[];for(let i=0;i<events.length;i+=BASELINE_JOURNAL_CHUNK){const slice=events.slice(i,i+BASELINE_JOURNAL_CHUNK);chunks.push({...await put(slice.map(compactEvent)),count:slice.length});}
      const {events:_events,...head}=changes;
      parts.journal=await put({order:Object.keys(changes),head,count:events.length,chunks});
    }
  }
  const entry={...meta,frozen:{schema:BASELINE_SCHEMA,prefix:prefix(owner,projectId),order:Object.keys(b),reviewOrder:b.review&&typeof b.review==='object'?Object.keys(b.review):null,sourceDigest:b.source===undefined?null:digest(b.source),parts}};
  entry.frozen.sha256=baselineRoot(entry);
  return entry;
}
// ---------------------------------------------------------------- histories as logs (round 12, A3: GR-STO-05)
// The workbench keeps the history of every batch applied to the design (who, when, why, its commands and what it
// changed) and each guided session the history of its steps. Both were kept inside their section and stored with it, so
// every batch or guided step wrote the whole history again (1.87 M characters of a drafted design's workbench), and every
// save answered it whole. Each is now an append-only log of private objects beside the project, like the change
// journal's segments: sealed segments of LOG_ENTRIES entries (or LOG_BYTES of text) and one open head, each named in the
// row (historyLogs) with its count and the SHA-256 of its bytes. The section is stored with each history marked
// (HISTORY_LOG) in its place, so a step that only appends to a history leaves the section's object as it was and writes
// the log's head alone; a sealed segment is not written again unless an entry in it changed. A guided session's entries
// are kept in the order they were added, each with its session's id, and a read gives each session its own, in order.
// A read gives every history back whole, in its place in its section. A history kept inside its section by an earlier
// version is moved into its log by the one-time storage upgrade (storage-upgrade.js), which keeps the version it replaced.
export const LOG_ENTRIES=25,LOG_BYTES=512*1024,HISTORY_LOG='aiw:history-log';
const historyPrefix=(owner,projectId)=>'histories/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
async function writeLog(env,base,entries,prior,created){
  const segments=[];let offset=0;
  for(const s of prior?.segments||[]){
    const slice=entries.slice(offset,offset+s.count);if(slice.length!==s.count||JSON.stringify(slice)!==s.bytes)break;
    segments.push({key:s.key,count:s.count,sha256:s.sha256});offset+=s.count;
  }
  let head=null;
  for(let rest=entries.slice(offset);rest.length;){
    let n=0,size=2;while(n<rest.length&&n<LOG_ENTRIES&&size<LOG_BYTES){size+=JSON.stringify(rest[n]).length+1;n++;}
    const bytes=JSON.stringify(rest.slice(0,n)),sealed=n===LOG_ENTRIES||size>=LOG_BYTES;
    let key=!sealed&&prior?.head?.bytes===bytes?prior.head.key:null;
    if(!key){key=base+crypto.randomUUID()+'.json';await put(env,key,bytes);created.push(key);}
    const item={key,count:n,sha256:sha256(bytes)};if(sealed)segments.push(item);else head=item;
    rest=rest.slice(n);
  }
  return {count:entries.length,segments,...(head?{head}:{})};
}
async function readLog(env,owner,projectId,log){
  const base=historyPrefix(owner,projectId),parts=[...(Array.isArray(log?.segments)?log.segments:[]),...(log?.head?[log.head]:[])];
  if(!env.FILES||!Number.isInteger(log?.count)||!Array.isArray(log.segments)||parts.some(p=>typeof p?.key!=='string'||!p.key.startsWith(base)||!Number.isInteger(p.count)||!SHA.test(p.sha256||'')))throw Error('Private history storage is unavailable.');
  const loaded=await Promise.all(parts.map(async p=>{
    const file=await env.FILES.get(p.key);if(!file)throw integrityError('A saved history could not be loaded.',p.key);
    const bytes=await file.text();if(sha256(bytes)!==p.sha256)throw integrityError('A saved history does not match its SHA-256.',p.key);
    let entries;try{entries=JSON.parse(bytes);}catch{throw integrityError('A saved history could not be read.',p.key);}
    if(!Array.isArray(entries)||entries.length!==p.count)throw integrityError('A saved history does not match its saved reference.',p.key);
    return {key:p.key,count:p.count,sha256:p.sha256,bytes,entries};
  }));
  const entries=loaded.flatMap(p=>p.entries);if(entries.length!==log.count)throw integrityError('A saved history does not match its saved reference.');
  const kept=({key,count,sha256:sum,bytes})=>({key,count,sha256:sum,bytes});
  return {entries,kept:{segments:loaded.slice(0,log.segments.length).map(kept),head:log.head?kept(loaded.at(-1)):null}};
}
// Which histories a document keeps as logs: the workbench's, and the guided sessions' when each session has its own id.
export function loggedHistories(document){
  const out=[],sessions=document?.guidance?.sessions;
  if(Array.isArray(document?.workbench?.history)&&document.workbench.history.length)out.push('workbench');
  if(Array.isArray(sessions)&&sessions.some(s=>Array.isArray(s?.history)&&s.history.length)&&sessions.every(s=>typeof s?.id==='string')&&new Set(sessions.map(s=>s.id)).size===sessions.length)out.push('guidance');
  return out;
}
async function readHistoryLogs(env,owner,document,keys){
  const logs=document.historyLogs;
  if(logs.workbench){
    const {entries,kept}=await readLog(env,owner,document.id,logs.workbench);
    if(document.workbench?.history!==HISTORY_LOG)throw integrityError('The workbench history does not match its saved reference.');
    document.workbench.history=entries;keys.set('__history:workbench',kept);
  }
  if(logs.guidance){
    const {entries,kept}=await readLog(env,owner,document.id,logs.guidance),by=new Map(),counts=logs.guidance.sessions||{};
    for(const x of entries){if(!Array.isArray(x)||x.length!==2||typeof x[0]!=='string')throw integrityError('The guided sessions\' history could not be read.');if(!by.has(x[0]))by.set(x[0],[]);by.get(x[0]).push(x[1]);}
    for(const s of document.guidance?.sessions||[]){if(s?.history!==HISTORY_LOG)continue;const h=by.get(s.id)||[];if(h.length!==counts[s.id])throw integrityError('The guided sessions\' history does not match its saved reference.');s.history=h;by.delete(s.id);}
    if(by.size)throw integrityError('The guided sessions\' history names a session the project does not hold.');
    keys.set('__history:guidance',{...kept,entries});
  }
}
// The guided sessions' entries in the order they were added: the log's as it was, then each session's new entries. A
// history changed otherwise (an entry rewritten, a session removed) is written again, session by session.
function guidanceEntries(sessions,prior){
  const was=new Map();for(const [id,e] of prior){if(!was.has(id))was.set(id,[]);was.get(id).push(e);}
  const live=sessions.map(s=>[s.id,Array.isArray(s.history)?s.history:[]]),ids=new Set(live.map(([id])=>id)),added=[];
  let appended=[...was.keys()].every(id=>ids.has(id));
  for(const [id,h] of live){if(!appended)break;const before=was.get(id)||[];if(h.length<before.length||before.some((e,i)=>JSON.stringify(e)!==JSON.stringify(h[i]))){appended=false;break;}for(const e of h.slice(before.length))added.push([id,e]);}
  return appended?[...prior,...added]:live.flatMap(([id,h])=>h.map(e=>[id,e]));
}
// The logs a save writes and the sections it stores with their histories marked: {marked: {field: value}, meta}.
async function writeHistoryLogs(env,owner,projectId,document,keys,created){
  const marked={},meta={},base=historyPrefix(owner,projectId),kinds=loggedHistories(document);
  if(kinds.length&&!env.FILES)throw Error('Private history storage is unavailable.');
  if(kinds.includes('workbench')){
    meta.workbench=await writeLog(env,base,document.workbench.history,keys.get('__history:workbench'),created);
    marked.workbench={...document.workbench,history:HISTORY_LOG};
  }
  if(kinds.includes('guidance')){
    const sessions=document.guidance.sessions,prior=keys.get('__history:guidance'),counts={};
    for(const s of sessions)if(Array.isArray(s.history))counts[s.id]=s.history.length;
    meta.guidance={...await writeLog(env,base,guidanceEntries(sessions,prior?.entries||[]),prior,created),sessions:counts};
    marked.guidance={...document.guidance,sessions:sessions.map(s=>Array.isArray(s.history)?{...s,history:HISTORY_LOG}:s)};
  }
  return {marked,meta:kinds.length?meta:null};
}
// Every object key the previous row referenced, and every object key the new row references.
export function priorKeys(keys){
  const out=new Set();
  for(const [name,value] of keys){
    // A frozen baseline's entry as read ('baseline:'+id) and the parts it names are no objects a save replaces: parts are
    // shared by their SHA-256 and never swept.
    if(name==='__sweep'||name==='__requirement_index'||name==='__retained'||name==='__baseline_parts'||name.startsWith('baseline:'))continue;
    if(typeof value==='string')out.add(value);
    else if(name==='__requirement_parts')for(const kind of ['artefacts','relationships'])for(const part of value[kind]||[])out.add(part.key);
    else if(value?.segments){for(const s of value.segments)out.add(s.key);if(value.head)out.add(value.head.key);for(const a of value.archive||[])out.add(a.key);}
    else if(value?.key)out.add(value.key);
  }
  return out;
}
export function referencedKeys(stored){
  const out=new Set();
  for(const field of ['workbench','assurance','guidance','intake','interfaceExtensions','caseExtensions','knowledge','modelAlternatives','coauthoring'])if(stored[field]?.storageKey)out.add(stored[field].storageKey);
  for(const kind of ['artefacts','relationships'])for(const part of stored.requirementsStorage?.[kind]||[])out.add(part.key);
  if(stored.changes?.storageKey)out.add(stored.changes.storageKey);
  for(const log of Object.values(stored.historyLogs||{})){for(const s of log.segments)out.add(s.key);if(log.head)out.add(log.head.key);}
  for(const s of stored.changes?.segments||[])out.add(s.key);if(stored.changes?.head)out.add(stored.changes.head.key);for(const a of stored.changes?.archive||[])out.add(a.key);
  for(const b of stored.finalReview?.baselines||[])if(b.storageKey)out.add(b.storageKey);
  return out;
}
// The project list's summary of a row as stored (round 2, B2-19): everything the list shows except the revision and
// the time, which the row itself carries. Written with every document, so GET /api/projects never parses documents.
// The listed summary of a stored row. With the whole document in hand it also carries the card's readiness line and
// next milestone (round 2, I2-23), so the Projects page reads no document. Working them out takes the chapter checks
// (about 0.17 s on the reference project, measured 2026-10-01), so a save recomputes them at most once a minute
// (READINESS_EVERY_MS) and otherwise keeps the previous reading, which says when it was made (`at`) and for which
// revision. A new project always gets one.
export const READINESS_EVERY_MS=60000;
// stored: the row's document as the object it was serialized from, when the caller holds it (it is not parsed again).
export function storedSummary(serialized,full=null,{previous=null,at=new Date().toISOString(),revision=1,stored=null}={}){
  const row={document:serialized,revision:0,updated_at:''},{updatedAt,revision:_revision,...summary}=stored?projectSummaryOf(stored,row):projectSummary(row);
  let readiness=null;try{readiness=previous?JSON.parse(previous).readiness||null:null;}catch{readiness=null;}
  if(full&&(!readiness||!(Date.parse(at)-Date.parse(readiness.at)<READINESS_EVERY_MS))){const r=projectReadiness(full);readiness=r?{...r,at,revision}:readiness;}
  return JSON.stringify(readiness?{...summary,readiness}:summary);
}
export const listedProject=row=>row.summary?{...JSON.parse(row.summary),updatedAt:row.updated_at,revision:row.revision}:projectSummary(row);
// keepPrior: the objects the previous row referenced are kept, not swept, because a recovery point names them (a storage
// upgrade keeps the version it upgraded recoverable: storage-upgrade.js).
export async function saveStoredProject(env,owner,projectId,document,revision,at,keys,extraStatements=()=>[],{keepPrior=false,jobGuard=null}={}){
  const stored={...document,finalReview:{...document.finalReview}},created=[];delete stored.storageSweep;delete stored.storageRetained;
  await writeRequirements(env,owner,projectId,document,stored,keys,created);
  const extensions={...Object.fromEntries(['workbench','assurance','guidance','intake'].filter(k=>document[k]).map(k=>[k,document[k]]))};
  // The histories a batch or a guided step appends to are logs (above): their sections are stored with each marked.
  const logs=await writeHistoryLogs(env,owner,projectId,document,keys,created);
  for(const [field,value] of Object.entries(logs.marked)){extensions[field]=value;stored[field]=value;}
  if(logs.meta)stored.historyLogs=logs.meta;
  if(document.finalReview.architectureCases?.length){extensions.caseExtensions={architectureCases:document.finalReview.architectureCases};delete stored.finalReview.architectureCases;}
  if(document.interfaces?.specifications?.length||document.interfaces?.schemaChecks?.length||document.interfaces?.fieldLineage?.length){extensions.interfaceExtensions=Object.fromEntries(['specifications','schemaChecks','fieldLineage'].map(k=>[k,document.interfaces[k]||[]]));stored.interfaces={...document.interfaces};for(const k of Object.keys(extensions.interfaceExtensions))delete stored.interfaces[k];}
  for(const [field,value]of Object.entries(extensions)){
    const bytes=JSON.stringify(value),prior=keys.get('__'+field);if(bytes.length<64000&&!prior&&!['interfaceExtensions','caseExtensions'].includes(field))continue;
    if(!env.FILES)throw Error('Private extension storage is unavailable.');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){storageKey='extensions/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/'+field+'/'+crypto.randomUUID()+'.json';await env.FILES.put(storageKey,bytes);created.push(storageKey);}
    stored[field]={storageKey,checksum:digest(value)};
  }
  if(document.knowledge){
    const bytes=JSON.stringify(document.knowledge),prior=keys.get('__knowledge');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){if(!env.FILES)throw Error('Private architecture knowledge storage is unavailable.');storageKey=knowledgePrefix(owner,projectId)+crypto.randomUUID()+'.json';await put(env,storageKey,bytes);created.push(storageKey);}
    stored.knowledge={version:document.knowledge.version,checksum:digest(document.knowledge),storageKey};
  }
  if(document.modelAlternatives?.records?.length){
    const bytes=JSON.stringify(document.modelAlternatives),prior=keys.get('__alternatives');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){
      if(!env.FILES)throw Error('Private alternative storage is unavailable.');
      storageKey=alternativesPrefix(owner,projectId)+crypto.randomUUID()+'.json';
      await put(env,storageKey,bytes);created.push(storageKey);
    }
    stored.modelAlternatives={schemaVersion:1,counter:document.modelAlternatives.counter,recordCount:document.modelAlternatives.records.length,storageKey};
  }
  if(document.coauthoring?.sources?.length||document.coauthoring?.designTasks?.length||document.coauthoring?.narratives?.length){
    const bytes=JSON.stringify(document.coauthoring),prior=keys.get('__evidence');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){
      if(!env.FILES)throw Error('Private evidence storage is unavailable.');
      storageKey=evidencePrefix(owner,projectId)+crypto.randomUUID()+'.json';
      await put(env,storageKey,bytes);created.push(storageKey);
    }
    stored.coauthoring={schemaVersion:1,sourceCount:document.coauthoring.sources.length,taskCount:document.coauthoring.tasks.length,designTaskCount:document.coauthoring.designTasks?.length||0,narrativeCount:document.coauthoring.narratives?.length||0,storageKey};
  }
  // Frozen baselines (above): one read from this row is kept exactly as it was read, since a baseline never changes; one
  // stored whole before round 12 keeps its object until the storage upgrade (keepPrior: its recovery point keeps that
  // object) stores it as parts; one frozen in memory (a freeze, a recovery package) is stored as parts.
  // The document saved holds a baseline stored as parts as stored (its metadata), so the caller's answer does too.
  stored.finalReview.baselines=[];
  const knownParts=new Set(keys.get('__baseline_parts')||[]),archive=keys.get('__change_journal')?.archive||[],answered=[...document.finalReview.baselines];let storedNow=false;
  for(const [i,b] of document.finalReview.baselines.entries()){
    const read=keys.get('baseline:'+b.id);
    if(read!==undefined){if(JSON.stringify(b)!==read)throw TypeError('A frozen baseline cannot change.');stored.finalReview.baselines.push(b);continue;}
    if(b.frozen)throw integrityError('A frozen baseline belongs to the project it was frozen in.','baseline:'+b.id);
    const legacy=keys.get(b.id);
    if(typeof legacy==='string'&&!keepPrior){const {source,review,findings,markdown,model,...metadata}=b;stored.finalReview.baselines.push({...metadata,storageKey:legacy});continue;}
    const entry=await storeBaseline(env,owner,projectId,b,knownParts,archive,stored.finalReview.baselines.at(-1));
    stored.finalReview.baselines.push(entry);answered[i]=entry;storedNow=true;
  }
  if(storedNow)document.finalReview={...document.finalReview,baselines:answered};
  if(document.changes?.events?.length){
    if(!env.FILES)throw Error('Private change history is unavailable.');
    // The journal is kept compact (journal-archive.js): explanations once, and the earlier changes waiting to be archived
    // moved whole to new archive pages. The document saved holds the journal as stored, so the caller's answer does too.
    const prior=keys.get('__change_journal'),archive=[...(prior?.archive||[])],compacted=compactJournal(document.changes.events,{pageCount:archive.length});
    for(const page of compacted.pages){const key=journalPrefix(owner,projectId)+'archive/'+crypto.randomUUID()+'.json';await put(env,key,JSON.stringify(encodeEvents(page)));created.push(key);archive.push({key,count:page.length,first:page[0].id,last:page.at(-1).id});}
    if(compacted.events!==document.changes.events)document.changes={...document.changes,events:compacted.events};
    const events=document.changes.events,sealed=[];let offset=0;
    for(const segment of prior?.segments||[]){
      const slice=events.slice(offset,offset+segment.count);if(slice.length!==segment.count)break;
      // A sealed segment that holds the changes it was read with (the copy a command works on shares them) is not written
      // again; one whose changes differ is written with codes for the words it repeats (journal-archive.js encodeEvents).
      let key=segment.key;
      if(!segment.events||slice.some((e,i)=>e!==segment.events[i]&&JSON.stringify(e)!==JSON.stringify(segment.events[i]))){const bytes=JSON.stringify(encodeEvents(slice));if(bytes!==segment.bytes){key=journalPrefix(owner,projectId)+crypto.randomUUID()+'.json';await put(env,key,bytes);created.push(key);}}
      sealed.push({key,count:segment.count});offset+=segment.count;
    }
    const headEvents=events.slice(offset);let head=null;
    if(headEvents.length){
      const bytes=JSON.stringify(encodeEvents(headEvents));let key=prior?.head&&prior.head.bytes===bytes?prior.head.key:null;
      if(!key){key=journalPrefix(owner,projectId)+crypto.randomUUID()+'.json';await put(env,key,bytes);created.push(key);}
      if(headEvents.length>=SEGMENT_EVENTS||bytes.length>=SEGMENT_BYTES)sealed.push({key,count:headEvents.length});else head={key,count:headEvents.length};
    }
    // The row keeps no summary of the journal (round 12, PS-01: the one it kept was never read). The change summary is
    // counted where it is read, once per settled document or pass (changes-domain.js currentChanges).
    stored.changes={schemaVersion:2,counter:document.changes.counter,eventCount:events.length,segments:sealed,...(head?{head}:{}),...(archive.length?{archive}:{}),compacted:true};
  }
  // Objects the previous row referenced and this one does not are superseded: listed in the row now, deleted by a
  // later save once the grace period has passed (never by the save that loses the revision race).
  const referenced=referencedKeys(stored),now=Date.parse(at)||Date.now(),due=[],pending=[];
  const retained=new Set([...(Array.isArray(keys.get('__retained'))?keys.get('__retained'):[]),...(keepPrior?priorKeys(keys):[])]);
  for(const item of keys.get('__sweep')?.superseded||[])if(referenced.has(item.key)||retained.has(item.key))continue;else if(now-Date.parse(item.at)>=SWEEP_GRACE_MS)due.push(item.key);else pending.push(item);
  for(const key of priorKeys(keys))if(!referenced.has(key)&&!retained.has(key)&&!pending.some(item=>item.key===key)&&!due.includes(key))pending.push({key,at});
  if(pending.length)stored.storageSweep={superseded:pending};
  if(retained.size)stored.storageRetained=[...retained].sort();
  // Every capture gets a unique object key. A concurrent losing save cannot
  // replace the winning snapshot, even when both allocated the same BL ID.
  const indexed=await env.DB.prepare('SELECT index_stamp,summary FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first(),stamp=crypto.randomUUID();
  // An asynchronous draft-apply may only commit while its exact lease is still held. Combined with the caller's
  // guarded job-completion statement in this batch, cancelling or taking over that lease cannot race a project save.
  if(jobGuard&&(!jobGuard.id||!jobGuard.token||!jobGuard.actor||typeof jobGuard.id!=='string'||typeof jobGuard.token!=='string'||typeof jobGuard.actor!=='string'))throw TypeError('A project job guard needs its job ID, lease token and actor.');
  const guarded=!!jobGuard;
  const guardSql=guarded?" AND EXISTS(SELECT 1 FROM project_jobs WHERE owner_id=? AND project_id=? AND id=? AND status='running' AND json_extract(document,'$.leaseToken')=?) AND (?=? OR EXISTS(SELECT 1 FROM project_access WHERE owner_id=? AND project_id=? AND actor_id=? AND role IN ('owner','editor')))":'';
  const serialized=JSON.stringify(stored),update=env.DB.prepare('UPDATE projects SET document=?,summary=?,revision=revision+1,updated_at=?,index_stamp=? WHERE owner_id=? AND id=? AND revision=?'+guardSql).bind(serialized,storedSummary(serialized,document,{previous:indexed?.summary,at,revision:revision+1,stored}),at,stamp,owner,projectId,revision,...(guarded?[owner,projectId,jobGuard.id,jobGuard.token,jobGuard.actor,owner,owner,projectId,jobGuard.actor]:[]));
  const indexStatements=requirementIndexStatements(env,owner,projectId,document,keys,stamp,!!indexed?.index_stamp);
  let change;try{if(!env.DB.batch)throw Error('Atomic project indexing is unavailable.');[change]=await env.DB.batch([update,...indexStatements,...extraStatements(stamp)]);}catch(e){await Promise.allSettled(created.map(key=>env.FILES.delete(key)));throw e;}
  if(!change.meta?.changes)await Promise.allSettled(created.map(key=>env.FILES.delete(key)));
  else if(due.length)await Promise.allSettled(due.map(key=>env.FILES.delete(key)));
  return change;
}
