// Change review records design reasoning separately from approval and verification.
import {remember,documentIndex,documentClone,documentCopy,memoPass} from './document-memo.js';
import {contentOf,withoutAuthorship} from './source-fingerprint.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES} from './chapter-names.js';
export const CHANGE_OUTCOMES = [
  ['unchanged', 'Still meets the linked obligation'],
  ['updated', 'Design revised and reviewed'],
  ['follow-up', 'Follow-up required'],
  ['unlinked', 'Not applicable to this change']
];
const fields = {title:'Title',description:'Required behaviour',acceptance:'Acceptance criteria',owner:'Owner',source:'Source',priority:'Priority',confirmed:'Confirmation',scopeMode:'Scope'};
const text = (v, max=4000) => typeof v === 'string' ? v.trim().slice(0,max) : '';
// One step per code point (a surrogate pair counts its first unit), as the for…of loop this replaces did: the same
// fingerprint, without a string per character.
// Round 12 (D-06): who wrote a record and who reviewed it (provenance.author and provenance.reviewed, the server's stamps)
// are not what it says: a fingerprint is taken without them, so a stamp the server adds after a command never moves a basis
// the command took (a design task's, a generation's, a reasoning context's), and a value that holds none reads as before.
export function changeFingerprint(value) {
  let a=2166136261,b=5381,s=JSON.stringify(value ?? null);
  if(s.includes('"author":{')||s.includes('"reviewed":{')){const v=withoutAuthorship(value);if(v!==value)s=JSON.stringify(v ?? null);}
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c;if(c>=0xD800&&c<=0xDBFF&&i+1<s.length){const d=s.charCodeAt(i+1);if(d>=0xDC00&&d<=0xDFFF)i++;}}
  return (a>>>0).toString(16)+':'+(b>>>0).toString(16);
}
// The requirements and the relationships that touch each, read once per document (round 12: a command compared every
// requirement by searching both lists for each one). The same snapshot, field for field, as before.
function requirementIndex(p) {
  const build=()=>{const byId=new Map(),links=new Map();
    for(const a of p.artefacts)if(a.type==='requirement'&&!byId.has(a.id))byId.set(a.id,a);
    for(const e of p.relationships)for(const id of new Set([e.from,e.to]))if(byId.has(id)){let xs=links.get(id);if(!xs)links.set(id,xs=[]);xs.push(e);}
    return {byId,links};};
  return documentIndex(p,'changes:requirements',build)||build();
}
function requirementSnapshot(p,id,index=requirementIndex(p)) {
  const r=index.byId.get(id);
  if(!r)return null;
  return {...Object.fromEntries(Object.keys(fields).map(k=>[k,r[k]??''])),relationships:(index.links.get(id)||[]).map(e=>({from:e.from,kind:e.kind,to:e.to})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};
}
// A requirement changed when what it says changed: its words, owner, source, priority, scope or links. Confirming it is a
// review of it, not a change (round 12, UX-02), so a confirmation alone opens no change review; a change journals its
// confirmation with the rest.
const said=s=>{if(!s)return s;const {confirmed:_c,...rest}=s;return rest;};
export function changedRequirementIds(before,after) {
  const a=requirementIndex(before),b=requirementIndex(after);
  return before.artefacts.filter(r=>r.type==='requirement'&&JSON.stringify(said(requirementSnapshot(before,r.id,a)))!==JSON.stringify(said(requirementSnapshot(after,r.id,b)))).map(r=>r.id);
}
// The record a change item names, and the records around it its stamp reads. Inside a pass or on a settled document
// each list is indexed once (document-memo.js); otherwise each is searched as before. The same records, in order.
const TARGET_LISTS={1:p=>p.artefacts,2:p=>p.quality?.drivers,3:p=>p.decisions?.records,4:p=>p.logical?.responsibilities,5:p=>p.realisation?.components,6:p=>[...(p.technology?.capabilities||[]),...(p.technology?.boundaries||[])],7:p=>p.technologyRealisation?.records,8:p=>[...(p.interfaces?.contracts||[]),...(p.interfaces?.data||[]),...(p.interfaces?.parties||[])],9:p=>[...(p.security?.controls||[]),...(p.security?.threats||[])],10:p=>p.runtime?.plans};
const firstOf=list=>{const m=new Map();for(const r of list||[])if(!m.has(r.id))m.set(r.id,r);return m;};
export function changeTarget(p,item) {
  const list=TARGET_LISTS[item.chapter];if(!list)return null;
  const index=documentIndex(p,'changes:targets:'+item.chapter,()=>firstOf(list(p)));
  return (index?index.get(item.id):list(p)?.find(r=>r.id===item.id))||null;
}
// xs.filter(x=>keys.some(k=>x[k]===id)) from an index of the values each record carries under the keys, in list order.
function related(p,name,xs=[],keys,id){
  const index=documentIndex(p,'changes:related:'+name+':'+keys.join(','),()=>{const m=new Map();for(const x of xs||[])for(const v of new Set(keys.map(k=>x[k]))){let ys=m.get(v);if(!ys)m.set(v,ys=[]);ys.push(x);}return m;});
  return index?(index.get(id)||[]).slice():(xs||[]).filter(x=>keys.some(k=>x[k]===id));
}
function targetContext(p,item) {
  const r=changeTarget(p,item);if(!r)return null;
  const rel=(name,xs,keys=['from','to'])=>related(p,name,xs,keys,item.id);
  const records=()=>[...(p.logical?.responsibilities||[]),...(p.realisation?.components||[]),...(p.technology?.capabilities||[]),...(p.technologyRealisation?.records||[]),...(p.interfaces?.contracts||[]),...(p.interfaces?.data||[])];
  const index=documentIndex(p,'changes:context-records',()=>firstOf(records()));
  const get=id=>(index?index.get(id):records().find(o=>o.id===id))||null;
  const needs=documentIndex(p,'changes:needs',()=>firstOf(p.technology?.needs));
  const need=id=>needs?needs.get(id):p.technology.needs.find(n=>n.id===id);
  const extras={
    4:()=>[rel('logical.mappings',p.logical?.mappings,['logicalId']),rel('logical.connections',p.logical?.connections)],
    5:()=>[rel('logical.mappings',p.logical?.mappings,['physicalId']),rel('logical.mappings',p.logical?.mappings,['physicalId']).map(m=>get(m.logicalId)),rel('realisation.connections',p.realisation?.connections)],
    6:()=>[rel('technology.mappings',p.technology?.mappings,['capabilityId']),rel('technology.mappings',p.technology?.mappings,['capabilityId']).map(m=>need(m.needId)),rel('technology.dependencies',p.technology?.dependencies)],
    7:()=>[rel('technologyRealisation.mappings',p.technologyRealisation?.mappings,['realizationId']),rel('technologyRealisation.mappings',p.technologyRealisation?.mappings,['realizationId']).map(m=>get(m.capabilityId)),rel('technologyRealisation.connections',p.technologyRealisation?.connections)],
    8:()=>[rel('interfaces.lineage',p.interfaces?.lineage,['from','to','dataId','contractId']),r.exchanges?[get(r.from),get(r.to),r.exchanges.map(e=>get(e.dataId))]:[get(r.authorityId)]],
    9:()=>[p.security?.threats?.filter(t=>r.threatIds?.includes(t.id)),r.targetIds?.map(get)],
    10:()=>[get(r.assetId),rel('runtime.placements',p.runtime?.placements,['planId']),p.runtime?.environments?.find(e=>e.id===r.environmentId),p.runtime?.zones?.filter(z=>z.environmentId===r.environmentId),p.runtime?.paths?.filter(l=>l.environmentId===r.environmentId&&[get(l.contractId)?.from,get(l.contractId)?.to].includes(r.assetId)).map(l=>[l,get(l.contractId)])]
  };
  return [r,extras[item.chapter]?.()||[]];
}
// A target's stamp reads its records' content (round 12, UX-02: source-fingerprint.js contentOf): confirming or
// reviewing a record does not make a review of it stale; a change to what it says does.
export const changeTargetStamp=(p,item)=>changeFingerprint(contentOf(p,targetContext(p,item)));
// A target's stamp, taken once per record of a settled document or a pass (several changes name the same record).
const targetStamp=(p,item)=>remember(p,'changes:target-stamp',JSON.stringify([item.chapter,item.id]),()=>changeTargetStamp(p,item));
export const CHANGE_REASONS={2:'This quality scenario names the requirement as a source. Review whether its stimulus, response, and target still test the changed behaviour.',3:'This decision cites the requirement or a quality driver that depends on it. Review the alternatives, recorded choice, and rationale.',4:'This responsibility claims to deliver the requirement. Check its owned behaviour and implementation scope.',5:'This component realizes a responsibility linked to the requirement. Review its boundary, interactions, and allocations.',6:'This capability supports an application need in the requirement trail. Check the support mapping and quality obligations.',7:'This implementation realizes a capability in the requirement trail. Review the chosen option and operating obligations.',8:'This contract or data definition carries information used in the requirement trail. Check meaning, ownership, and exchange behaviour.',9:'This control protects an object in the requirement trail. Review the threat, enforcement point, and intended response.',10:'This operating plan supports an asset in the requirement trail. Check placement, recovery, and operational evidence.'};
function impactItems(p,impact) {
  return (impact?.groups||[]).flatMap(g=>g.objects.map(o=>{
    const item={...o,chapter:g.chapter,chapterTitle:g.title,key:g.chapter+':'+o.id,why:o.why||CHANGE_REASONS[g.chapter],via:o.via||[]};
    return {...item,capturedStamp:changeTargetStamp(p,item),reviews:[]};
  }));
}
// A document saved before the change journal keeps only its last impact notice: the server gives it its journal when it
// reads it (legacyChanges, registered by journal-archive.js), so the browser, which only receives documents the server
// has read, carries none of the conversion.
let legacyJournal=null;
export function registerLegacyJournal(convert){legacyJournal=typeof convert==='function'?convert:null;}
export function withChanges(p) {
  if(p.changes)return p;
  p.changes={schemaVersion:1,counter:0,events:[]};
  if(p.workspace?.lastImpact)legacyJournal?.(p);
  return p;
}
export function legacyChanges(p){
  const previous=p.workspace.lastImpact;
  for(const r of previous.requirements||[]) {
    const id='CHG-'+String(++p.changes.counter).padStart(3,'0');
    p.changes.events.push({id,requirementId:r.id,title:r.title,at:previous.at,legacy:true,before:null,after:requirementSnapshot(p,r.id),fields:[],items:impactItems(p,previous)});
  }
}
// changed: the requirements already found changed between the two documents (changedRequirementIds), when the caller has them.
// Each change is worked out first, in one pass over both documents (their records indexed once, each requirement traced
// once: round 12, PS-03), and recorded once the pass has ended, since nothing may change a document inside a pass
// (document-memo.js). The same events, in the same order, as recording each as it was worked out.
export function trackRequirementChanges(before,after,at,impactFor,changed=changedRequirementIds(before,after)) {
  withChanges(after);
  const found=memoPass(before,()=>memoPass(after,()=>changed.map(id=>{
    const old=requirementSnapshot(before,id),current=requirementSnapshot(after,id);
    const impact=impactFor(before,after,at,id,changed);
    const fieldChanges=[...Object.keys(fields),'relationships'].filter(k=>JSON.stringify(old?.[k])!==JSON.stringify(current?.[k])).map(k=>({key:k,label:k==='relationships'?'Requirement relationships':fields[k],before:old?.[k]??null,after:current?.[k]??null}));
    return {requirementId:id,title:current?.title||old.title,at,before:old,after:current,fields:fieldChanges,items:impactItems(after,impact)};
  })));
  for(const e of found)after.changes.events.push({id:'CHG-'+String(++after.changes.counter).padStart(3,'0'),...e});
  return after;
}
// Round 12 (GR-INT-03): what an import changed of what its source asserts of a requirement (intake-domain.js
// assertionChanges: delivery, validation, band, domain …), journalled as a change of its own kind (source kind
// 'source-assertion') with each assertion before and after; confirmation is not touched. A change that can move the design
// lists the design records built on the requirement (impactFor), so they are reviewed as one cause; one that only
// describes the source (a date, a comment, a test count) is journalled with no review opened, and says why. A requirement
// whose words changed in the same import keeps one change with both. from: the journal's length before the import.
export function trackSourceAssertions(before,after,at,impactFor,changes,{from=0,datasetId='',revision=null}={}) {
  if(!changes?.length)return after;
  withChanges(after);
  const words=new Map(after.changes.events.slice(from).filter(e=>e.requirementId).map(e=>[e.requirementId,e])),review=changes.filter(c=>c.review).map(c=>c.id);
  const found=memoPass(before,()=>memoPass(after,()=>changes.map(c=>{
    const said=words.get(c.id);
    if(said){said.fields.push(...c.fields);said.sourceAssertion={datasetId,revision};return null;}
    const a=requirementIndex(after).byId.get(c.id),impact=c.review?impactFor(before,after,at,c.id,review):null;
    return {requirementId:c.id,source:{chapter:1,id:c.id,ref:c.id,kind:'source-assertion',title:a?.title||c.id},title:a?.title||c.id,at,before:Object.fromEntries(c.fields.map(f=>[f.key,f.before])),after:Object.fromEntries(c.fields.map(f=>[f.key,f.after])),fields:c.fields,items:impactItems(after,impact),sourceAssertion:{datasetId,revision},
      ...(c.review?{}:{quiet:{reason:'Only what describes the source changed ('+c.fields.map(f=>f.label.replace(/ \(source assertion\)$/,'')).join(', ')+'): no design record rests on it, so no review is opened.'}})};
  }).filter(Boolean)));
  for(const e of found)after.changes.events.push({id:'CHG-'+String(++after.changes.counter).padStart(3,'0'),...e});
  return after;
}

// ---------------------------------------------------------------- reading the journal (round 12, D-05)
// The journal is read once per document: the latest change of each source record, which alone can be reviewed, and the
// state of each affected record of a latest change. A target's stamp is taken only for a record a review was recorded on
// (a record nobody reviewed needs review whatever its stamp), once per record. Before round 12 every state took every
// stamp, and the summary found each change's latest by searching the whole journal: 45 s of a save at 1,400
// requirements and 4,075 changes.
export function changeEvents(p) {return p.changes?.events||[];}
export const changeSource=e=>e.source||{chapter:1,id:e.requirementId,ref:e.requirementId,kind:'requirement',title:e.title};
const sourceKey=s=>JSON.stringify([s.chapter,s.id]);
function latestBySource(p){return remember(p,'changes:latest','',()=>{const m=new Map();for(const e of changeEvents(p))m.set(sourceKey(changeSource(e)),e);return m;});}
export function latestChange(p,source) {const key=typeof source==='string'?{chapter:1,id:source}:source;return latestBySource(p).get(sourceKey(key));}
export function isCurrentChange(p,event) {return latestChange(p,changeSource(event))?.id===event.id;}
export function changeItemState(p,event,item,current=isCurrentChange(p,event)) {
  const review=item.reviews?.at(-1)||null,state=(label,status,complete)=>({label,status,complete,review,get stamp(){return targetStamp(p,item);}});
  if(!current)return state('Earlier change','superseded',false);
  if(!review)return state('Needs review','open',false);
  if(review.targetStamp!==targetStamp(p,item))return state('Changed since review','stale',false);
  if(review.outcome==='follow-up')return state('Follow-up required','follow-up',false);
  return state(CHANGE_OUTCOMES.find(([v])=>v===review.outcome)?.[1]||'Needs review','reviewed',true);
}
// The latest changes, each with the count of its affected records by state and by chapter: what the summary, the causes
// and the change-summary reader read, worked out once per settled document or pass.
export function currentChanges(p){return remember(p,'changes:current','',()=>{
  const latest=latestBySource(p),out=[];
  for(const e of changeEvents(p)){
    if(latest.get(sourceKey(changeSource(e)))!==e)continue;
    const c={event:e,total:e.items.length,reviewed:0,open:0,followUp:0,stale:0,byChapter:new Map()};
    for(const item of e.items){const s=changeItemState(p,e,item,true),ch=c.byChapter.get(item.chapter)||{affected:0,open:0};ch.affected++;if(s.complete)c.reviewed++;else{c.open++;ch.open++;}if(s.status==='follow-up')c.followUp++;if(s.status==='stale')c.stale++;c.byChapter.set(item.chapter,ch);}
    out.push(c);
  }
  return out;
});}
export function changeSummary(p,event) {
  const counted=event?[event].map(e=>{const current=isCurrentChange(p,e),c={total:e.items.length,reviewed:0,open:0,followUp:0,stale:0};for(const item of e.items){const s=changeItemState(p,e,item,current);if(s.complete)c.reviewed++;else c.open++;if(s.status==='follow-up')c.followUp++;if(s.status==='stale')c.stale++;}return c;}):currentChanges(p);
  const sum=k=>counted.reduce((n,c)=>n+c[k],0);
  return {events:counted.length,total:sum('total'),reviewed:sum('reviewed'),open:sum('open'),followUp:sum('followUp'),stale:sum('stale')};
}
// Changes that open no affected review (round 12, GR-GOV-11): completing a record AIW proposed (D1's lifecycle: nothing
// downstream was reviewed against a proposal), and saving a record again within the Sol-draft session that last wrote
// it (the drafting's second save of a link cycle: nothing was reviewed against the first). The change is journalled as
// ever, with why no review was opened; a person's later change opens its reviews as before. events: the changes one
// command added; prior: the document before it; author: the commit's (authorship.js).
export function quietChanges(prior,events,author){
  for(const e of events||[]){
    if(!e||!Array.isArray(e.items)||!e.items.length||e.quiet)continue;
    const s=changeSource(e),old=changeTarget(prior,{chapter:s.chapter,id:s.id}),stamp=old?.provenance?.author;
    let reason=null;
    if(old?.state==='proposed')reason='It completed '+(old.ref||old.id)+', which AIW proposed: nothing was reviewed against the proposal.';
    else if(author?.kind==='sol-draft'&&author.session&&stamp?.kind==='sol-draft'&&stamp.session===author.session)reason='Sol saved it again within the drafting session '+author.session+' that wrote it: nothing was reviewed against the earlier save.';
    if(reason){e.quiet={reason,affected:e.items.length,...(author?.session?{session:author.session}:{})};e.items=[];}
  }
  return events;
}
// A cause (round 12, D-05: G-33, G-37): the latest change of one record that still has affected records to review. One
// change to a shared record is one cause with its affected count, however many records it reaches; a reviewer can record
// one judgement for all of them (change.review with scope 'cause'), each record keeping its own stamp.
export function changeCauses(p){
  return currentChanges(p).filter(c=>c.open>0).map(c=>({id:c.event.id,source:changeSource(c.event),title:c.event.title,at:c.event.at,actor:c.event.actor||null,request:!!c.event.request,affected:c.total,open:c.open,reviewed:c.reviewed,followUp:c.followUp,stale:c.stale,chapters:[...c.byChapter].filter(([,x])=>x.open).map(([chapter,x])=>({chapter,open:x.open,affected:x.affected})).sort((a,b)=>a.chapter-b.chapter)}));
}
// What a cause review judges: the open affected records of a change and their stamps, as the reviewer saw them.
export function causeStamp(p,event){const current=isCurrentChange(p,event);return changeFingerprint(event.items.filter(i=>!changeItemState(p,event,i,current).complete).map(i=>[i.key,targetStamp(p,i)]));}
// A recorded event is shared by every copy of the document (document-memo.js documentCopy), so a review is recorded on
// this document's own copy of the event it is about, which takes that event's place in the journal.
function ownEvent(p,event){const i=p.changes.events.indexOf(event),own=documentClone(event);p.changes.events[i]=own;return own;}
// Four eyes below governance (round 12, GR-GOV-12): a project that switches it on (workspace.governance, workbench-domain.js)
// refuses a review recorded by the person who made the change it judges. Off by default; a review always records the
// signed-in person who made it (actor), whatever name the reviewer field gives.
export const fourEyesOn=p=>p?.workspace?.governance?.fourEyes===true;
function fourEyes(p,event,actor){if(fourEyesOn(p)&&actor&&event?.actor&&event.actor===actor)throw Error('Four eyes: '+actor+' made this change. Another signed-in person reviews it.');}
// actor: the signed-in person who records the review or the request (worker.js passes it to every handler).
export function applyChangeCommand(input,command,at=new Date().toISOString(),actor=null) {
  const p=withChanges(documentCopy(input)),raw=command.payload||{};
  if(command.type==='change.request')return requestReview(p,raw,at,actor);
  if(command.type!=='change.review')throw Error('Choose a supported change-review action.');
  if(raw.scope==='cause')return reviewCause(p,raw,at,actor);
  const event=changeEvents(p).find(e=>e.id===raw.changeId);
  if(event&&!isCurrentChange(p,event))throw Error('A newer change to this definition needs review. Open the latest change.');
  const item=event?.items.find(i=>i.key===raw.itemKey);
  if(!event||!item)throw Error('Choose an affected record from the change history.');
  const stamp=changeTargetStamp(p,item),exists=!!changeTarget(p,item);
  if(stamp!==raw.targetStamp)throw Error('This record changed. Reload the project and review the current design.');
  if(!CHANGE_OUTCOMES.some(([v])=>v===raw.outcome))throw Error('Choose a review outcome.');
  if(raw.reviewed!==true||!text(raw.reviewer)||!text(raw.rationale)||!text(raw.evidence))throw Error('Record the reviewer, rationale, evidence or analysis reference, and explicit confirmation.');
  if(['unchanged','updated'].includes(raw.outcome)&&!event.after)throw Error('The source definition was removed. Explain why the assessment is not applicable, or record a follow-up.');
  if(['unchanged','updated'].includes(raw.outcome)&&!exists)throw Error('This record was removed. Explain why the link no longer applies, or record a follow-up.');
  if(raw.outcome==='updated'&&stamp===item.capturedStamp)throw Error('The linked design has not changed since this source edit. Revise it first, or choose another outcome.');
  if(raw.outcome==='follow-up'&&(!text(raw.owner)||!text(raw.action)))throw Error('Give the follow-up an accountable owner and a clear next action.');
  fourEyes(p,event,actor);
  ownEvent(p,event).items.find(i=>i.key===raw.itemKey).reviews.push({at,outcome:raw.outcome,reviewer:text(raw.reviewer,180),rationale:text(raw.rationale),evidence:text(raw.evidence),owner:raw.outcome==='follow-up'?text(raw.owner,180):'',action:raw.outcome==='follow-up'?text(raw.action):'',targetStamp:stamp,...(actor?{actor}:{})});
  if(p.finalReview){p.finalReview.version++;p.finalReview.checks=null;p.finalReview.handoff=null;}
  return {document:p,selected:null};
}
// One judgement for every affected record a change still leaves open (D-05): the same gates as a review of one record,
// held for each of them (the outcome must suit every record, or nothing is recorded), and the stamp of what the reviewer
// saw, so a record that changed meanwhile sends them back to look. Each record keeps its own review and stamp, marked as
// recorded for the cause, so a later change to one of them reopens that record alone.
function reviewCause(p,raw,at,actor=null){
  // The gates read the journal and the stamps once, in a pass (each stamp is taken once); the review is recorded after it.
  const {event,stamps}=memoPass(p,()=>{
    const event=changeEvents(p).find(e=>e.id===raw.changeId);
    if(!event)throw Error('Choose a change from the change history.');
    if(!isCurrentChange(p,event))throw Error('A newer change to this definition needs review. Open the latest change.');
    const open=event.items.filter(i=>!changeItemState(p,event,i,true).complete);
    if(!open.length)throw Error('Every affected record of this change is reviewed.');
    if(raw.stamp!==causeStamp(p,event))throw Error('An affected record changed. Reload the project and review the current design.');
    if(!CHANGE_OUTCOMES.some(([v])=>v===raw.outcome))throw Error('Choose a review outcome.');
    if(raw.reviewed!==true||!text(raw.reviewer)||!text(raw.rationale)||!text(raw.evidence))throw Error('Record the reviewer, rationale, evidence or analysis reference, and explicit confirmation.');
    if(['unchanged','updated'].includes(raw.outcome)&&!event.after)throw Error('The source definition was removed. Explain why the assessment is not applicable, or record a follow-up.');
    if(['unchanged','updated'].includes(raw.outcome)){const gone=open.filter(i=>!changeTarget(p,i));if(gone.length)throw Error(gone.length+' affected record'+(gone.length===1?' was':'s were')+' removed. Review '+(gone.length===1?'it':'them')+' one by one, or record a follow-up or not applicable for the change.');}
    if(raw.outcome==='updated'){const same=open.filter(i=>targetStamp(p,i)===i.capturedStamp);if(same.length)throw Error(same.length+' affected record'+(same.length===1?' has':'s have')+' not changed since this source edit. Revise '+(same.length===1?'it':'them')+' first, or choose another outcome.');}
    if(raw.outcome==='follow-up'&&(!text(raw.owner)||!text(raw.action)))throw Error('Give the follow-up an accountable owner and a clear next action.');
    fourEyes(p,event,actor);
    return {event,stamps:open.map(i=>[event.items.indexOf(i),targetStamp(p,i)])};
  });
  const review={at,outcome:raw.outcome,reviewer:text(raw.reviewer,180),rationale:text(raw.rationale),evidence:text(raw.evidence),owner:raw.outcome==='follow-up'?text(raw.owner,180):'',action:raw.outcome==='follow-up'?text(raw.action):'',scope:'cause',...(actor?{actor}:{})};
  const own=ownEvent(p,event);
  for(const [k,stamp] of stamps)own.items[k].reviews.push({...review,targetStamp:stamp});
  if(p.finalReview){p.finalReview.version++;p.finalReview.checks=null;p.finalReview.handoff=null;}
  return {document:p,selected:null};
}
// A review asked for by hand — from the review desk, a probe or a decision's implications — rather
// than by an edit. It is recorded like any change event, so each affected record is reviewed and
// its outcome kept with the reviewer, rationale and evidence.
const refOf=t=>t.ref||t.externalId||t.id,titleOf=t=>t.title||t.question||t.name||t.id;
function requestReview(p,raw,at,actor=null){
  const src=raw.source||{},target=changeTarget(p,{chapter:Number(src.chapter),id:src.id});
  if(!target)throw Error('Choose the record the review is about.');
  if(raw.reviewed!==true||!text(raw.reason)||!text(raw.requestedBy))throw Error('Say why the review is needed and who asks for it, and confirm the request.');
  const seen=new Set(),items=[];
  for(const i of Array.isArray(raw.items)?raw.items:[]){const chapter=Number(i?.chapter),t=changeTarget(p,{chapter,id:i?.id}),key=chapter+':'+i?.id;if(!t||seen.has(key)||items.length>=60)continue;seen.add(key);const item={id:i.id,ref:refOf(t),title:titleOf(t),chapter,chapterTitle:CHAPTER_TITLES[chapter]||'',key,why:text(i.why,600)||'Asked to review from the review desk.',via:[refOf(target)]};items.push({...item,capturedStamp:changeTargetStamp(p,item),reviews:[]});}
  if(!items.length)throw Error('Choose at least one record to review.');
  const source={chapter:Number(src.chapter),id:src.id,ref:refOf(target),kind:text(src.kind,40)||'record',title:titleOf(target)};
  p.changes.events.push({id:'CHG-'+String(++p.changes.counter).padStart(3,'0'),source,title:'Review requested · '+text(raw.reason,160),at,before:null,after:{requested:true},fields:[],request:{reason:text(raw.reason,2000),by:text(raw.requestedBy,180),at,...(actor?{actor}:{})},items});
  if(p.finalReview){p.finalReview.version++;p.finalReview.checks=null;p.finalReview.handoff=null;}
  return {document:p,selected:null};
}
function show(value) {
  if(value===null||value===''||value===undefined)return 'Not recorded';
  if(typeof value==='boolean')return value?'Yes':'No';
  if(Array.isArray(value))return value.every(e=>e&&typeof e==='object'&&'from' in e&&'to' in e)?value.map(e=>e.from+' — '+(e.label||e.kind||'linked')+' → '+e.to).join('; ')||'No links':JSON.stringify(value,null,2);
  return String(value);
}
export const changeValue=show;

// The journal kept compact (round 12, PS-08: journal-archive.js, a server module). An affected record's explanation is
// kept once: read it through itemWhy. An earlier change is moved whole to the journal's archive once enough are waiting;
// the journal keeps its identity, who made it and when, the change that superseded it and its count of affected records
// (archived.items), with no affected records of its own (isArchived). The annex prints it whole.
export const itemWhy=i=>typeof i?.why==='string'?i.why:Array.isArray(i?.reasons)?i.reasons.join(' '):'';
export const isArchived=e=>!!e?.archived;
// The journal as a project read and a save's answer carry it (round 12, A3: GR-PERF-13): the changes not archived. An
// archived change is a superseded one, kept whole in the journal's archive pages (journal-archive.js) and read with the
// journal's annex (GET /api/changes, the SDD's change journal), so a read no longer grows with every change archived; the
// view counts them (archivedCount), and the server reads the whole journal for everything it works out.
export function journalView(changes){
  const events=changes?.events;
  if(!Array.isArray(events)||!events.some(isArchived))return changes;
  const kept=events.filter(e=>!isArchived(e)),{events:_events,...rest}=changes;
  return {...rest,archivedCount:(changes.archivedCount||0)+events.length-kept.length,events:kept};
}
export const withJournalView=p=>{const c=journalView(p?.changes);return c===p?.changes?p:{...p,changes:c};};
// The change journal is printed a page of JOURNAL_PAGE changes at a time (change-journal.js, a server module).
export const JOURNAL_PAGE=100;
