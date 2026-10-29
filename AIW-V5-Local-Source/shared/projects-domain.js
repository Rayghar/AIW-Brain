import {REFERENCE_PROJECTS} from '../public/reference-projects.js';
import {referenceBrief,referenceJourney} from './reference-journeys.js';
import {sha256} from '../public/brain-integrity.js';
import {seedProject} from '../public/requirements-domain.js';
import {withFinalReview,reviewTrace} from '../public/review-domain.js';
import {memoPass} from '../public/document-memo.js';
import {changedRequirementIds} from '../public/changes-domain.js';
import {sddReadiness,nextMilestone} from '../public/readiness-model.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES} from '../public/chapter-names.js';
import {applyEvidenceCommand,EXCERPT_LIMIT} from '../public/evidence-domain.js';
import {interpretBrief,briefCounts,BRIEF_LIMIT,BRIEF_RULES} from './brief-interpreter.js';
import {interpretModel,modelCounts,MODEL_LIMIT,MODEL_RULES} from './model-interpreter.js';

// A blank project can start from a brief (round 4, Contract 1): typed, or read from a .txt, .md or .docx file in the
// browser (public/brief-reader.js). `briefHash` is the SHA-256 of the trimmed brief text, which the caller works out
// (the Worker does; hashing is asynchronous and this function is not). With it, the text is also kept as the
// project's first evidence source, so every passage the interpretation cites stays verifiable against that hash.
// A blank project can also start from a model file (round 6, Contract I), with or beside the brief: `model` is
// {text, name, kind} as public/brief-reader.js read it; the text is kept whole as an evidence source of kind 'model'
// with the SHA-256 worked out here, on the server, and model.interpreted keeps the counts of what the model reader read.
// author: who creates the project (authorship.js commitAuthor: a person, or an agent account drafting as Sol), which the
// opening brief's evidence version says (round 12, GR-GOV-07).
export function createProject({name,template,brief='',briefFile=null,model=null},id,at=new Date().toISOString(),{briefHash='',author=null}={}){
  if(typeof name!=='string'||!name.trim()||name.trim().length>100)throw Error('Give the project a name of 1–100 characters.');
  if(!['blank','bank-payment',...REFERENCE_PROJECTS.map(r=>r.id)].includes(template))throw Error('Choose a blank project or an available reference journey.');
  if(typeof brief!=='string'||brief.length>BRIEF_LIMIT)throw Error('Keep the opening brief within 20,000 characters.');
  const file=briefFileOf(briefFile);
  if(file&&(template!=='blank'||!brief.trim()))throw Error('A brief file starts a blank project from its text.');
  if(typeof briefHash!=='string'||(briefHash&&!/^[a-f0-9]{64}$/.test(briefHash)))throw Error('The brief text hash must be a SHA-256.');
  const kept=modelFileOf(model);
  if(kept&&template!=='blank')throw Error('A model file starts a blank project.');
  let p=withFinalReview(seedProject());
  p.id=id;p.name=name.trim();p.workspace={template,createdAt:at};
  if(template!=='bank-payment'){
    p.brief={problem:brief.trim(),goal:'',source:'',confirmed:false};p.artefacts=[];p.relationships=[];
    for(const key of Object.keys(p.counters))p.counters[key]=0;
    for(const key of ['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime','finalReview']){
      const domain=p[key];
      for(const [field,value] of Object.entries(domain)){
        if(Array.isArray(value))domain[field]=[];
        else if(['intake','review','handoff','checks'].includes(field))domain[field]=null;
        else if(['scenarios','applicationBoundaries'].includes(field))domain[field]={};
        else if(field==='counters')for(const counter of Object.keys(value))value[counter]=0;
      }
    }
  }
  p.finalReview.narrative={title:p.name+' — Solution Design',owner:'',audience:'',summary:'',scope:'',approach:'',confirmed:false};
  // A reference journey (shared/reference-journeys.js) is drafted from its own brief, kept first as any opening brief
  // is; a brief typed with it is not read, as for the Bank Payment reference.
  const reference=referenceBrief(template);
  if(reference){p.brief.problem=reference;return referenceJourney(openingBrief(p,{hash:sha256(reference),origin:'Reference brief of the AIW reference journey '+template+' (an AIW authored teaching example), kept with the reference'},at),template,at);}
  if(template==='blank'&&p.brief.problem)p=openingBrief(p,{file,hash:briefHash,author},at);
  if(kept)p=openingModel(p,kept,at);
  return p;
}

// The model file the browser read (public/brief-reader.js readModelFile): its text, up to the model reader's limit,
// its file name and its kind. The server never receives the bytes; the text it keeps is hashed here, and that hash is
// the one that verifies the passages a model draft cites. `format` is what the browser detected, kept as a hint only:
// the reader detects the format again from the text.
const MODEL_KEYS=new Set(['text','name','kind','format']),MODEL_KINDS=['dsl','xml','archimate','bpmn','drawio','mmd','mermaid','puml','plantuml','md','txt'];
export function modelFileOf(raw){
  if(raw==null)return null;
  if(typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!MODEL_KEYS.has(k)))throw Error('The model file is described in an unsupported shape.');
  if(typeof raw.text!=='string'||!raw.text.trim())throw Error('A model file holds text.');
  if(raw.text.length>MODEL_LIMIT)throw Error('Keep the model within 2,000,000 characters.');
  const name=typeof raw.name==='string'?raw.name.replace(/[\u0000-\u001f\u007f]/g,'').replace(/^.*[\\/]/,'').trim():'';
  if(!name||name.length>180)throw Error('Name the model file in 1–180 characters.');
  if(!MODEL_KINDS.includes(raw.kind))throw Error('A model file is .dsl, .xml, .archimate, .bpmn, .drawio, .mmd, .puml, .md or .txt.');
  if(raw.format!==undefined&&(typeof raw.format!=='string'||raw.format.length>40))throw Error('Name the model format in up to 40 characters.');
  return {text:raw.text,name,kind:raw.kind,format:typeof raw.format==='string'?raw.format:''};
}
// The model of a blank project, kept whole as evidence source SRC-nnn through the evidence domain's own `evidence.source`
// command (status Unconfirmed; the excerpt is the start of the text, bounded by that command), marked {kind: 'model',
// name, hash, format, text, addedAt}. model.interpreted keeps the counts of interpretModel(text): what the reader read,
// never the elements, which the journey drafter recomputes from the kept text. Nothing here drafts or creates a record.
function openingModel(p,kept,at){
  const hash=sha256(kept.text),read=interpretModel(kept.text,{name:kept.name,format:kept.format||kept.kind}),format=read.format;
  if(format==='unknown'||!read.elements.length)throw Error('The model file was not read as a model: '+(format==='unknown'?'':'no element was read; ')+(read.report.omitted.map(o=>o.reason).join(' ')||'check the file and choose it again.'));
  const location='Model file '+kept.name+' read in the browser · '+format+' · text SHA-256 '+hash;
  const r=applyEvidenceCommand(p,{type:'evidence.source',payload:{title:'Model · '+kept.name,location,version:hash.slice(0,16),date:at.slice(0,10),excerpt:kept.text,status:'Unconfirmed'}},at);
  p=r.document;const sourceId=r.selected;
  Object.assign(p.coauthoring.sources.find(s=>s.id===sourceId),{kind:'model',name:kept.name,hash,format,text:kept.text,addedAt:at});
  p.model={interpreted:{rules:MODEL_RULES,at,sourceId,textHash:hash,...modelCounts(read)}};
  return p;
}

// The brief file the browser read: its name, the SHA-256 of its bytes, its kind and size, and whether the text was
// edited after reading. The server never receives the bytes, so this is the browser's account of what it read; the
// text the project keeps is hashed again on the server, and that hash is the one that verifies the passages.
const BRIEF_FILE_KEYS=new Set(['name','hash','kind','bytes','edited']);
export function briefFileOf(raw){
  if(raw==null)return null;
  if(typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!BRIEF_FILE_KEYS.has(k)))throw Error('The brief file is described in an unsupported shape.');
  const name=typeof raw.name==='string'?raw.name.replace(/[\u0000-\u001f\u007f]/g,'').replace(/^.*[\\/]/,'').trim():'';
  if(!name||name.length>180)throw Error('Name the brief file in 1–180 characters.');
  if(typeof raw.hash!=='string'||!/^[a-f0-9]{64}$/.test(raw.hash))throw Error('Give the brief file its SHA-256 as 64 hexadecimal characters.');
  if(!['txt','md','docx'].includes(raw.kind))throw Error('A brief file is .txt, .md or .docx.');
  if(!Number.isInteger(raw.bytes)||raw.bytes<1||raw.bytes>12*1024*1024)throw Error('A brief file holds 1 byte to 12 MB.');
  if(raw.edited!==undefined&&typeof raw.edited!=='boolean')throw Error('Say whether the brief text was edited with true or false.');
  return {name,hash:raw.hash,kind:raw.kind,bytes:raw.bytes,edited:raw.edited===true};
}

// The opening brief of a blank project. brief.problem is the text; brief.source names the file and its hash when a
// file was read. With the text's hash, the text is kept whole as evidence source SRC-nnn through the evidence domain's
// own `evidence.source` command (status Unconfirmed), and that source is marked {kind: 'brief', name, hash, text,
// addedAt, file?} the way an attachment marks its source. brief.interpreted keeps the counts of interpretBrief(text):
// what the rules read, never the proposals, which the journey drafter recomputes from the kept text. Nothing here
// drafts or creates a record. `origin` names where the text came from when it was neither typed nor read from a file
// (a reference journey's own brief). brief.goal is the first outcome the brief states, in its passage's own words
// (the proposal's description), and stays empty when the brief states none; the brief stays unconfirmed.
// Round 12: the version keeps the whole text and its hash, says how much its excerpt shows (excerptOf, GR-GOV-15), and
// says who gave the brief: typed by a person at creation, or sent by an agent account as a draft by Sol (GR-GOV-07).
const givenBy=a=>a?.account==='agent'||a?.kind==='sol-draft'?'Opening brief sent at project creation by '+(a.account==='agent'?'the agent account ':'')+(a.id||'an account not recorded')+(a.kind==='sol-draft'?', as a draft by Sol, not reviewed by a person':''):'Opening brief typed at project creation';
function openingBrief(p,{file=null,hash,origin='',author=null},at){
  const text=p.brief.problem;
  if(file)p.brief.source=file.name+' · file SHA-256 '+file.hash+(file.edited?' · edited after it was read':'');
  let sourceId=null;
  if(hash){
    const location=(origin||(file?'Opening brief read from '+file.name+' in the browser (file SHA-256 '+file.hash+(file.edited?', edited after reading':'')+')':givenBy(author)))+' · text SHA-256 '+hash;
    const r=applyEvidenceCommand(p,{type:'evidence.source',payload:{title:'Opening brief'+(file?' · '+file.name:''),location,version:hash.slice(0,16),date:at.slice(0,10),excerpt:text,status:'Unconfirmed'}},at);
    p=r.document;sourceId=r.selected;
    const kept=p.coauthoring.sources.find(s=>s.id===sourceId);Object.assign(kept,{kind:'brief',name:file?file.name:'Opening brief',hash,text,addedAt:at,...(file?{file}:{})});
    Object.assign(kept.versions.at(-1),{text,hash,...(text.length>EXCERPT_LIMIT?{excerptOf:{shown:EXCERPT_LIMIT,total:text.length}}:{}),...(author?{author:{kind:author.kind,by:author.id||null,account:author.account}}:{})});
  }
  const read=interpretBrief(text,{name:p.name}),goal=read.outcomes.find(o=>o.confidence==='stated');
  if(goal)p.brief.goal=goal.description;
  p.brief.interpreted={rules:BRIEF_RULES,at,sourceId,textHash:hash||null,...briefCounts(read)};
  return p;
}

// The template a document was made from (round 12, A3: GR-DOM-15): its own workspace.template, else its own evidence.
// Documents written before templates existed were all the Bank Payment reference and hold its records (its seed ids,
// made by the reference, with the reference's titles or source); a document from elsewhere without the field holds none
// of them and is blank, never read as the reference and seeded with payment records. The storage upgrade stamps the
// template it finds (storage-upgrade.js).
let referenceRecords=null;
export function templateEvidence(p){
  if(typeof p?.workspace?.template==='string'&&p.workspace.template)return p.workspace.template;
  referenceRecords??=new Map(seedProject().artefacts.map(a=>[a.id,a]));
  let n=0;for(const a of Array.isArray(p?.artefacts)?p.artefacts:[]){const r=referenceRecords.get(a?.id);if(r&&a.origin==='reference'&&(a.title===r.title||a.source===r.source)&&++n>=3)return 'bank-payment';}
  return 'blank';
}
export function projectSummary(row){return projectSummaryOf(JSON.parse(row.document),row);}
// The same summary of a stored row the caller already holds as an object (round 12: a save does not read back what it wrote).
export function projectSummaryOf(p,row){
  const counts={requirements:p.requirementsStorage?.requirementCount??p.artefacts.filter(a=>a.type==='requirement').length,drivers:p.quality?.drivers.length||0,decisions:p.decisions?.records.length||0,responsibilities:p.logical?.responsibilities.length||0};
  return {status:p.workspace?.status||'active',reusableTemplate:p.workspace?.reusableTemplate===true,id:p.id,name:p.name,template:templateEvidence(p),updatedAt:row.updated_at,revision:row.revision,counts,confirmedRequirements:p.requirementsStorage?.confirmedRequirements??p.artefacts.filter(a=>a.type==='requirement'&&a.confirmed).length};
}

// What a project card shows without opening the project (round 2, I2-23): the SDD readiness line and the next
// milestone, by the same rules as Validate, worked out from the whole document when it is saved (the stored row may
// hold parts of it elsewhere). Rule-based and read-only; null when the document cannot be read this way, and then
// the card says nothing about readiness.
export function projectReadiness(p){
  try{const R=sddReadiness(p),next=nextMilestone(p);return {summary:R.summary,blockers:R.blockers,ready:R.ready,started:R.started,next};}
  catch{return null;}
}

// A trace-based review route, not a claim that every dependent record is invalid. known: the requirements already found
// changed between the two documents (changedRequirementIds), when the caller has them (round 12: found once per command).
export function requirementImpact(before,after,at,requirementId,known=null){
  const ids=(known||changedRequirementIds(before,after)).filter(id=>!requirementId||id===requirementId);
  const changed=after.artefacts.filter(a=>ids.includes(a.id));
  const removed=before.artefacts.filter(a=>ids.includes(a.id)&&!after.artefacts.some(b=>b.id===a.id));
  if(!changed.length&&!removed.length)return null;
  // Each document's trails are read in one pass (document-memo.js memoPass): a record that answers by its requirement
  // groups expands them through one group index per document, not one per record (round 12: a drafted architecture
  // links its records by group, and the save of a requirement read the index afresh for each of them).
  const reqs=[...changed,...removed],trails=new Map([after,before].map(p=>[p,memoPass(p,()=>new Map(reqs.map(r=>[r.id,reviewTrace(p,r.id)])))]));
  const groups=new Map();
  for(const r of reqs){
    for(const p of [after,before]){const t=trails.get(p).get(r.id);if(!t)continue;
    for(const [chapter,title,records] of [[2,CHAPTER_TITLES[2],t.drivers],[3,CHAPTER_TITLES[3],t.decisions],[4,CHAPTER_TITLES[4],t.logical],[5,CHAPTER_TITLES[5],t.applications],[6,CHAPTER_TITLES[6],t.capabilities],[7,CHAPTER_TITLES[7],t.realizations],[8,CHAPTER_TITLES[8],[...t.contracts,...t.data]],[9,CHAPTER_TITLES[9],t.controls],[10,CHAPTER_TITLES[10],t.runtime]]){
      if(!records.length)continue;const group=groups.get(chapter)||{chapter,title,objects:[]};
      for(const o of records)if(!group.objects.some(v=>v.id===o.id))group.objects.push({id:o.id,ref:o.ref||o.id,title:o.title||o.question||o.name||o.id,via:impactVia(p,t,chapter,o)});
      groups.set(chapter,group);
    }
    }
  }
  return {at,requirements:[...changed,...removed].map(r=>({id:r.id,title:r.title,removed:removed.includes(r)})),groups:[...groups.values()],message:'A requirement changed. Follow its saved relationships and review whether the dependent design still satisfies it. Earlier evidence and frozen baselines remain available.'};
}

function impactVia(p,t,chapter,o){
  const refs=xs=>xs.map(r=>r.ref||r.id);
  if(chapter===3)return refs(t.drivers.filter(d=>o.driverIds.includes(d.id)));
  if(chapter===5)return refs(t.logical.filter(r=>p.logical.mappings.some(m=>m.logicalId===r.id&&m.physicalId===o.id)));
  if(chapter===6){const needs=p.technology.mappings.filter(m=>m.capabilityId===o.id).map(m=>p.technology.needs.find(n=>n.id===m.needId));return refs(t.applications.filter(a=>needs.some(n=>n?.applicationId===a.id)));}
  if(chapter===7)return refs(t.capabilities.filter(c=>p.technologyRealisation.mappings.some(m=>m.realizationId===o.id&&m.capabilityId===c.id)));
  if(chapter===8&&!o.exchanges)return refs(t.contracts.filter(c=>c.exchanges.some(e=>e.dataId===o.id)));
  if(chapter===9)return refs([...t.applications,...t.capabilities,...t.realizations,...t.contracts,...t.data].filter(r=>o.targetIds.includes(r.id)));
  if(chapter===10)return refs([...t.applications,...t.realizations].filter(r=>r.id===o.assetId));
  return [];
}
