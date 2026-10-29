// Round 12 (workstream A, per-command cost): a governed command costs one copy of the project and one comparison of
// its requirements, and answers exactly as before (the route's sequence includes workstream B's journal base for a
// bulk confirmation). Each command of a walk through the reference project is sent to the
// Worker, and the same command is applied to the same document by the route's sequence as it was before round 12
// (rc.10.73.16, kept below as the reference): every step on a fresh complete copy, the staged commands of a reviewed
// change applied twice (preview, then apply) on structured clones, the requirements compared once for the impact notice
// and again for each changed requirement, the trackers called one by one, and the sections of the answer compared as
// JSON text. The saved document, the sections answered and the selection must be the same, byte for byte, at the time
// the Worker applied the command. Then the pieces: sameJSON against JSON.stringify, documentCopy against documentClone,
// the shared journal never changed in place (its events are frozen for the walk), the stored row without the summary
// nobody read, and the indexed requirement comparison against the one it replaced. The journal is kept compact
// (journal-archive.js) and answered as a delta: both are compared whole, as they read back.
import assert from 'node:assert/strict';
import worker,{commandHandler,carryProvenance,trackCommandChanges} from './worker.js';
import {localDatabase} from './local-db.js';
import {withFinalReview} from './public/review-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyTechnologyCommand} from './public/technology-domain.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {applySecurityCommand} from './public/security-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {applyProcessCommand} from './public/process-model.js';
import {STAGED_COMMANDS} from './public/canonical-command.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {workingBasis} from './public/guidance-record.js';
import {baselineDiff} from './public/architecture-analysis.js';
import {journeyIndex,journeyTargets} from './public/journey-context.js';
import {digest,sha256,sha256Portable,canonical} from './public/brain-integrity.js';
import {requirementImpact} from './shared/projects-domain.js';
import {journalBase} from './public/requirement-commands.js';
import {trackRequirementChanges,changeEvents,changeItemState,changeTargetStamp,changeSummary,causeStamp,changedRequirementIds,isCurrentChange,quietChanges} from './public/changes-domain.js';
import {trackInterfaceChange,previewInterfaceChange} from './public/interface-impact.js';
import {trackModelChange,previewModelChange,modelEditSnapshot} from './public/model-impact.js';
import {trackDecisionChange} from './public/decision-impact.js';
import {documentClone,documentCopy,memoPass,unmemoised,handOver} from './public/document-memo.js';
import {sameJSON} from './server-runtime.js';
import {hydrateEvents} from './journal-archive.js';
import {mergeSaved,journalAfter,sectionAfter} from './public/project-store.js';
// Round 12 (D-06, workstream D3): the route records who or what wrote each commit and the records it wrote. The reference
// below applies the same authorship steps (authorship.js, provenance.js) after the route's own, so the comparison stays
// byte for byte on everything else.
import {commitAuthor,versionBrief} from './authorship.js';
import {stampAuthorship,attachProvenanceBlocks} from './public/provenance.js';

const checks=[];const pass=name=>{checks.push(name);console.log('PASS '+name);};
// Where two JSON values first differ, for a message that says what differs rather than printing both.
function difference(a,b,path='$'){
  if(JSON.stringify(a)===JSON.stringify(b))return null;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return path+': '+JSON.stringify(a)?.slice(0,300)+' ≠ '+JSON.stringify(b)?.slice(0,300);
  const keys=Array.isArray(a)?[...Array(Math.max(a.length,b.length)).keys()]:[...new Set([...Object.keys(a),...Object.keys(b)])];
  if(!Array.isArray(a)&&JSON.stringify(Object.keys(a))!==JSON.stringify(Object.keys(b))){for(const k of keys){const d=difference(a[k],b[k],path+'.'+k);if(d)return d;}return path+' keys: '+Object.keys(a).join(',')+' ≠ '+Object.keys(b).join(',');}
  for(const k of keys){const d=difference(a[k],b[k],path+(Array.isArray(a)?'['+k+']':'.'+k));if(d)return d;}
  return path+': differs';
}
const same=(actual,expected,label)=>{const d=difference(actual,expected);assert.ok(!d,label+' · '+d);};

// ---------------------------------------------------------------- the reference: the route before round 12
const HANDLERS={process:applyProcessCommand,quality:applyQualityCommand,decision:applyDecisionCommand,logical:applyLogicalCommand,realisation:applyRealisationCommand,technology:applyTechnologyCommand,techrealisation:applyTechnologyRealisationCommand,interfaces:applyInterfacesCommand,security:applySecurityCommand,runtime:applyRuntimeCommand};
// applyCanonical as it was: a structured clone for the handler, a fresh copy for the review sections. (documentClone
// stands for both: the handlers copy JSON documents, and copy them again, so the clone they receive is never shared.)
function applyCanonicalBefore(input,command,at,actor=''){
  if(!STAGED_COMMANDS.has(command?.type))throw Error('This action must use its chapter review workflow.');
  const result=(HANDLERS[command.type.split('.')[0]]||applyCommand)(structuredClone(input),command,at,actor);
  result.document=withFinalReview(documentClone(result.document));return result;
}
function previewBefore(p,commands){
  let doc=p,selected=null;for(const command of commands){const result=applyCanonicalBefore(doc,command,'preview');doc=result.document;selected=result.selected||selected;}
  const diff=baselineDiff(p,doc),index=journeyIndex(p),affected=new Map();
  for(const r of diff.records)for(let chapter=(r.chapter||1)+1;chapter<=11;chapter++)for(const target of journeyTargets(index,r.id,chapter))affected.set(target.node.id,{id:target.node.id,chapter,title:target.node.title});
  return {document:doc,selected,diff,affected:[...affected.values()],stamp:digest([workingBasis(p),commands])};
}
function workspaceApplyBefore(input,command,at,actor,author){
  const raw=command.payload||{};let p=structuredClone(input);p.workbench??={version:1,alternatives:[],analyses:[],catalogue:[],views:[],assignments:[]};
  const q=previewBefore(p,raw.commands);if(raw.stamp!==q.stamp)throw Error('The design changed. Refresh the change preview.');
  if(raw.reviewed!==true)throw Error('Review the changed objects and downstream obligations.');
  // The actor reaches every applied command (round 12, GR-GOV-22), and the history keeps the commit's author (D-06).
  for(const c of raw.commands)p=applyCanonicalBefore(p,c,at,actor).document;
  p.workbench.history??=[];p.workbench.history.push({at,actor,commands:raw.commands,changed:q.diff.records.map(r=>r.id),affected:q.affected,reason:String(raw.reason||'').trim().slice(0,4000),stamp:q.stamp,author:{kind:author.kind,account:author.account,reviewed:raw.reviewed===true}});
  p.workbench.version++;return {document:p,selected:q.selected};
}
// The requirement comparison as it was: each requirement and its relationships found by searching the lists.
const FIELDS=['title','description','acceptance','owner','source','priority','confirmed','scopeMode'];
function snapshotBefore(p,id){const r=p.artefacts.filter(a=>a.type==='requirement').find(r=>r.id===id);if(!r)return null;return {...Object.fromEntries(FIELDS.map(k=>[k,r[k]??''])),relationships:p.relationships.filter(e=>e.from===id||e.to===id).map(e=>({from:e.from,kind:e.kind,to:e.to})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};}
// A requirement changed when what it says changed: a confirmation alone is a review of it (round 12, UX-02).
const said=s=>{if(!s)return s;const {confirmed:_c,...rest}=s;return rest;};
const changedBefore=(before,after)=>before.artefacts.filter(a=>a.type==='requirement').filter(r=>JSON.stringify(said(snapshotBefore(before,r.id)))!==JSON.stringify(said(snapshotBefore(after,r.id)))).map(r=>r.id);
// The route: what it saved and what it answered (?response=sections).
function routeBefore(stored,command,at,actor){
  const fresh=()=>withFinalReview(documentClone(stored)),author=commitAuthor({actor,account:'person'},{command},command);
  const result=command.type==='workspace.apply'?workspaceApplyBefore(fresh(),command,at,actor,author):commandHandler(command.type)(fresh(),command,at,actor,{author});
  result.document=withFinalReview(documentClone(result.document));carryProvenance(fresh(),result.document,at);
  stampAuthorship(fresh(),result.document,command,result,author,at);attachProvenanceBlocks(fresh(),result.document,command,result);versionBrief(fresh(),result.document,author,at);
  const prior=fresh();
  // A bulk confirmation journals itself once (requirement-commands.js journalBase, round 12 B).
  const base=journalBase(prior,result.document,command.type);
  assert.deepEqual(changedRequirementIds(base,result.document),changedBefore(base,result.document),'the indexed requirement comparison finds the same requirements');
  const impact=requirementImpact(base,result.document,at);
  trackRequirementChanges(base,result.document,at,(b,a,t,id)=>requirementImpact(b,a,t,id));
  trackInterfaceChange(prior,result.document,command,at);
  trackModelChange(prior,result.document,command,at);
  trackDecisionChange(prior,result.document,command,at);
  if(command.type==='workspace.apply')for(const c of command.payload.commands){trackModelChange(prior,result.document,c,at);trackInterfaceChange(prior,result.document,c,at);}
  // Round 12 (GR-GOV-11): a completed proposal or a save within one Sol-draft session opens no review.
  quietChanges(prior,(result.document.changes?.events||[]).slice(prior.changes?.events?.length||0),author);
  if(impact)result.document.workspace={...result.document.workspace,lastImpact:impact};
  for(const event of (result.document.changes?.events||[]).slice(prior.changes?.events?.length||0)){event.actor??=actor;event.authorKind??=author.kind;event.reviewed??=author.reviewed;if(author.reason)event.reason??=author.reason;}
  const sections={};for(const key of new Set([...Object.keys(prior),...Object.keys(result.document)]))if(JSON.stringify(prior[key])!==JSON.stringify(result.document[key]))sections[key]=result.document[key];for(const key of Object.keys(prior))if(!(key in result.document))sections[key]=null;
  return {document:result.document,sections,selected:result.selected??null};
}

// ---------------------------------------------------------------- the walk
const DB=localDatabase(':memory:'),bytes=new Map(),FILES={async put(k,v){bytes.set(k,v);},async get(k){return bytes.has(k)?{text:async()=>bytes.get(k)}:null;},async delete(k){bytes.delete(k);}};
const owner='command-equivalence',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{'oai-authenticated-user-id':owner,...(body?{'Content-Type':'application/json',Origin:'https://aiw.test'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
// Every event of the journal, frozen, all the way down: a command that changed one in place would fail the walk.
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
try{
  const created=await(await api('/api/projects','POST',{name:'Command equivalence · QA only',template:'bank-payment'})).json(),id=created.document.id;
  const read=async()=>(await(await api('/api/project?project='+id)).json());
  const archiveOf=async()=>JSON.parse((await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first()).document).changes?.archive||[];
  const wholeJournal=async c=>c&&Array.isArray(c.events)?{...c,events:await hydrateEvents(env,await archiveOf(),c.events)}:c;
  const whole=async d=>d?.changes?{...d,changes:await wholeJournal(d.changes)}:d;
  let walked=0;const types=new Set();
  const step=async(label,make)=>{
    const before=await read(),command=make(before.document);
    const r=await api('/api/commands?project='+id+'&response=sections','POST',{revision:before.revision,command});
    assert.equal(r.status,200,label+': '+await r.clone().text());const answer=await r.json();
    const expected=routeBefore(before.document,command,answer.updatedAt,owner),after=await read();
    assert.equal(after.revision,before.revision+1);
    // The journal is kept compact (journal-archive.js): compared whole, as it reads back from its archive.
    same(await whole(after.document),await whole(withFinalReview(JSON.parse(JSON.stringify(expected.document)))),label+': the saved document is the one the route saved before round 12');
    assert.deepEqual([...Object.keys(answer.sections),...Object.keys(answer.deltas||{})].sort(),Object.keys(expected.sections).sort(),label+': the same sections are answered');
    for(const [key,value] of Object.entries(answer.sections))if(key!=='changes')same(value,JSON.parse(JSON.stringify(expected.sections[key])),label+': the same '+key+' is answered');
    // A section that holds records answers what changed in it (round 12, GR-PERF-12: worker.js sectionDelta): applied to
    // the section the browser holds, it is the section answered before round 12, and what the save stored.
    for(const [key,delta] of Object.entries(answer.deltas||{})){same(sectionAfter(before.document[key],delta),JSON.parse(JSON.stringify(expected.sections[key])),label+': the same '+key+' is answered, as what changed in it');same(mergeSaved(before.document,answer).document[key],after.document[key],label+': the '+key+' merged is the one saved');}
    // The journal answers with what the command did to it (worker.js journalDelta), which the browser applies to the
    // journal it holds: the journal the route answered before, whole.
    if(answer.sections.changes){assert(answer.sections.changes.delta,label+': the journal answers with a delta');same(await wholeJournal(journalAfter(before.document.changes,answer.sections.changes)),await wholeJournal(JSON.parse(JSON.stringify(expected.sections.changes))),label+': the journal answered is the one answered before round 12');same(mergeSaved(before.document,answer).document.changes,after.document.changes,label+': the journal merged is the one saved');}
    assert.deepEqual(answer.selected,expected.selected,label+': the same selection');
    // The route's own steps again, on a copy of the project whose journal is frozen: none changes a recorded event.
    const prior=withFinalReview(documentClone(before.document));for(const e of prior.changes.events)freeze(e);
    assert.doesNotThrow(()=>{const r=commandHandler(command.type)(documentCopy(prior),command,answer.updatedAt,owner);r.document=withFinalReview(handOver(r.document));carryProvenance(prior,r.document,answer.updatedAt);trackCommandChanges(prior,r.document,command,answer.updatedAt);},label+': the command and its trackers change no recorded event in place');
    walked++;types.add(command.type);return after.document;
  };
  const req=(p,n)=>p.artefacts.find(a=>a.id==='REQ-00'+n);
  const reason='Equivalence walk on a synthetic copy; nothing is reviewed by a person.';
  const staged=(p,commands)=>({type:'workspace.apply',payload:{commands,stamp:previewWorkingChange(p,commands).stamp,reviewed:true,reason}});
  await step('a requirement edited',p=>({type:'artefact',payload:{...req(p,1),acceptance:'Given a repeated instruction, when its reference is reused, then the original outcome is returned.'}}));
  await step('a scenario edited (no requirement compared)',p=>({type:'quality.driver',payload:{...p.quality.drivers[0],title:p.quality.drivers[0].title+' (revised)'}}));
  await step('a reviewed change of four records',p=>staged(p,[{type:'artefact',payload:{...req(p,2),description:req(p,2).description+' It keeps the reference.'}},{type:'quality.driver',payload:{...p.quality.drivers[1],response:p.quality.drivers[1].response+' Measured at peak.'}},{type:'logical.responsibility',payload:{...modelEditSnapshot(p,{type:'logical.responsibility',payload:{id:'api'}}),id:'api',owner:'Equivalence owner'}},{type:'artefact',payload:{type:'assumption',title:'Equivalence assumption',description:'',owner:'',source:'Synthetic',confirmed:false}}]));
  await step('a requirement link removed',p=>({type:'deleteRelationship',payload:{id:p.relationships.find(l=>l.from==='REQ-003'||l.to==='REQ-003').id}}));
  await step('one affected record reviewed',p=>{const e=changeEvents(p).find(x=>isCurrentChange(p,x)&&x.items.some(i=>i.chapter===2)),i=e.items.find(x=>x.chapter===2);return {type:'change.review',payload:{changeId:e.id,itemKey:i.key,targetStamp:changeTargetStamp(p,i),outcome:'unchanged',reviewer:'Equivalence reviewer',rationale:'Still meets the edited requirement.',evidence:'Synthetic walkthrough',reviewed:true}};});
  await step('one review for a whole change',p=>{const e=changeEvents(p).filter(x=>isCurrentChange(p,x)&&changeSummary(p,x).open).at(-1);return {type:'change.review',payload:{scope:'cause',changeId:e.id,stamp:causeStamp(p,e),outcome:'follow-up',owner:'Equivalence owner',action:'Walk the linked records with the delivery team.',reviewer:'Equivalence reviewer',rationale:'One judgement for every linked record.',evidence:'Synthetic walkthrough',reviewed:true}};});
  await step('a review requested',p=>({type:'change.request',payload:{source:{chapter:1,id:'REQ-004',kind:'requirement'},items:[{chapter:2,id:p.quality.drivers[0].id,why:'Asked by the equivalence walk.'},{chapter:4,id:'api'}],reason:'Check the scenario against the requirement.',requestedBy:'Equivalence reviewer',reviewed:true}}));
  await step('a working choice made',()=>({type:'decision.choose',payload:{id:'ADR-002',alternativeId:'ALT-003'}}));
  await step('a data field renamed through its impact preview',p=>{const d=p.interfaces.data.find(x=>x.id==='instruction'),f=d.fields[0],command={type:'interfaces.field',payload:{id:'instruction',field:{...f,name:f.name+'Ref'}}};return {type:'interfaces.apply-impact',payload:{command,previewStamp:previewInterfaceChange(p,command).stamp,reviewed:true}};});
  await step('a component edited through its impact preview',p=>{const command={type:'realisation.component',payload:{...modelEditSnapshot(p,{type:'realisation.component',payload:{id:'api-pod'}}),id:'api-pod',owner:'Equivalence platform team'}};return {type:'model.apply-impact',payload:{command,previewStamp:previewModelChange(p,command).stamp,reviewed:true}};});
  await step('a reviewed change of twenty records',p=>staged(p,[...Array.from({length:17},(_,i)=>({type:'artefact',payload:{type:'assumption',title:'Equivalence batch assumption '+(i+1),description:'',owner:'',source:'Synthetic',confirmed:false}})),{type:'artefact',payload:{...req(p,4),owner:'Equivalence requirement owner'}},{type:'artefact',payload:{...req(p,5),priority:'Could'}},{type:'relationship',payload:{from:'REQ-005',to:'REQ-004',kind:'supports'}}]));
  // Round 12 (GR-GOV-24): a record leaves through the one retire path (the hard delete is refused).
  await step('a record retired',p=>({type:'record.retire',payload:{ids:[p.artefacts.find(a=>a.title==='Equivalence batch assumption 1').id],chapter:1,reason:'Retired by the equivalence walk.'}}));
  await step('the same requirement edited twice in a row (the first change superseded)',p=>({type:'artefact',payload:{...req(p,1),owner:'Second owner of the requirement'}}));
  await step('a requirement group made',p=>({type:'requirements.group',payload:{title:'Equivalence group',kind:'theme',description:'Synthetic',owner:'Equivalence owner',memberIds:[req(p,3).id,req(p,4).id],rule:[]}}));
  await step('a requirement confirmed on its own (a review of it, not a change: nothing journalled, no impact)',p=>({type:'artefact',payload:{...req(p,5),confirmed:true}}));
  await step('requirements confirmed in one reviewed step (journalled once)',p=>{const ids=p.artefacts.filter(a=>a.type==='requirement'&&!a.confirmed).map(a=>a.id).slice(0,3);return {type:'requirements.confirm',payload:{ids,count:ids.length,reviewed:true}};});
  assert(walked===16&&types.size>=11);
  pass(walked+' commands of '+types.size+' kinds (requirement, scenario, link and decision edits, reviewed changes of 4 and 20 records, impact-previewed data and component edits, a single, a whole-change and a requested review, a retirement, a requirement group, a single and a bulk confirmation): the Worker saves and answers exactly what the route saved and answered before round 12, and no command changes a recorded journal event in place');

  // ---------------------------------------------------------------- the pieces
  const doc=withFinalReview((await read()).document);
  const values=[doc,doc.changes,doc.artefacts,{a:1,b:undefined,c:()=>1},{a:1},[1,undefined,()=>1,Symbol('x')],[1,null,null,null],{x:NaN},{x:null},{x:-0},{x:0},{x:new Date(0)},{x:'1970-01-01T00:00:00.000Z'},{toJSON:()=>'t'},'t',{a:1,b:2},{b:2,a:1},new Number(1),1,[],{},new Map([[1,2]]),{x:[{y:1}]},{x:[{y:2}]},Object.assign(Object.create(null),{'__proto__':1})];
  for(const a of values)for(const b of values)assert.equal(sameJSON(a,b),JSON.stringify(a)===JSON.stringify(b),'sameJSON('+JSON.stringify(a)?.slice(0,40)+', '+JSON.stringify(b)?.slice(0,40)+')');
  const edited=documentClone(doc);edited.artefacts[3].title+='.';assert.equal(sameJSON(doc,edited),false);edited.artefacts[3].title=doc.artefacts[3].title;assert.equal(sameJSON(doc,edited),true);
  pass('sameJSON answers what comparing the JSON texts answers, on documents, journals and the edge cases of JSON (undefined, functions, symbols, non-finite numbers, -0, toJSON, boxed values, key order, maps)');
  const copied=documentCopy(doc);
  assert.equal(JSON.stringify(copied),JSON.stringify(documentClone(doc)));assert(copied.changes.events.every((e,i)=>e===doc.changes.events[i]),'the events are shared');assert.notEqual(copied.changes.events,doc.changes.events);assert.notEqual(copied.artefacts,doc.artefacts);assert.notEqual(copied.changes,doc.changes);
  pass('documentCopy writes the same JSON as documentClone; it shares the recorded events with the document it copies, never their array or anything else');
  // The runtime's SHA-256 and the portable one: the same digest of the same text, whatever the text.
  const texts=['','abc','é','\u{1F600}','\uD800','a\uDC00b','\uDBFF\uDFFF','x'.repeat(55),'x'.repeat(56),'x'.repeat(64),'z'.repeat(100000)+'\uD83D',canonical(doc)];
  for(let i=0;i<200;i++){let t='';const n=(i*7919)%300;for(let j=0;j<n;j++)t+=String.fromCharCode((i*31+j*131)%0x10000);texts.push(t);}
  for(const t of texts)assert.equal(sha256(t),sha256Portable(t),'sha256 of '+JSON.stringify(t.slice(0,12)));
  assert.equal(digest(doc),sha256Portable(canonical(doc)));
  pass('the runtime SHA-256 the server uses gives the portable digest of every text tried ('+texts.length+', lone surrogates, block edges and a whole project among them)');
  // The row keeps no summary of the journal (round 12, PS-01: the one it kept was never read); the summary is counted
  // where it is read, and a count per change agrees with it.
  const row=JSON.parse((await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first()).document);
  assert.equal(row.changes.summary,undefined);assert.equal(row.changes.ledger,undefined);
  const latest=changeEvents(doc).filter(e=>isCurrentChange(doc,e)),counted=latest.map(e=>changeSummary(doc,e)),total=k=>counted.reduce((n,c)=>n+c[k],0);
  assert.deepEqual(changeSummary(doc),{events:latest.length,total:total('total'),reviewed:total('reviewed'),open:total('open'),followUp:total('followUp'),stale:total('stale')});
  pass('the stored row keeps no change summary nobody reads; the summary counted where it is read is the sum of each latest change\'s own count');
  // The stamps of the affected records: indexed in a pass, searched outside one and with the indexes switched off, the same.
  const stamps=d=>changeEvents(d).flatMap(e=>e.items.map(i=>changeTargetStamp(d,i)));
  assert.deepEqual(memoPass(doc,()=>stamps(doc)),unmemoised(()=>stamps(doc)));assert.deepEqual(stamps(doc),unmemoised(()=>stamps(doc)));
  assert.deepEqual(memoPass(doc,()=>changeEvents(doc).map(e=>e.items.map(i=>changeItemState(doc,e,i).status))),unmemoised(()=>changeEvents(doc).map(e=>e.items.map(i=>changeItemState(doc,e,i).status))));
  pass('every affected record\'s stamp and state is the same read from the indexes of a pass as searched without them');
}finally{DB.close();}
console.log(JSON.stringify({passed:checks.length,checks},null,1));
