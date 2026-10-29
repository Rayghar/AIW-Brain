import {withRealisation,components,component,componentSources,componentSourceChanged,realisationHandoffCurrent} from './realisation-domain.js';
import {remember,memoPass,passValue,findIn,filterIn,withIds,firstById,groupBy,sharedList} from './document-memo.js';
import {logicalGraph} from './logical-domain.js';
import {decisionCurrent,governanceLabel} from './decisions-domain.js';
import {targetText,targetIsMeasurable} from './quality-domain.js';
import {byId,fitText} from './util.js';
import {valueFingerprint,contentSources} from './source-fingerprint.js';
import {isBlankProject,seedingOff} from './model-scope.js';
import {requirementGroups,groupMembers} from './requirement-groups.js';
import {cleanOpen,isOpenText,questionOf} from './open-fields.js';
import {citedNotes} from './requirement-links.js';
// rc39 (PLAN §4.3.2): the words of a need derived from the drivers reaching its application (design-questions.js).
import {designQuestions,designQuestionFindings} from './design-questions.js';
import {QUESTION_INDEX} from './pattern-dna.js';

// ---------------------------------------------------------------- records of Chapters 6–10 (round 12)
// D-12, DM-05: a value nobody has stated is stored '' and printed 'not stated', an open item, never an invented answer.
// D-13, DM-17: a record AIW makes by itself in a person's project (not the Bank Payment reference) is a proposal, state
// 'proposed' and origin 'seeded'; it counts in no check but one grouped "review the proposals" finding. An edit by a
// person or a drafter makes it authored (no state is stored, as record-lifecycle.js keeps it) with the author's origin
// ('user', or 'suggestion' when the save says so; the earlier origin goes into its history where it keeps one); keeping
// it does the same with origin 'suggestion'. A dismissed or removed record leaves its list for the project's retired
// records (p.retired.records), whole, with who, when and why, so no reader meets it and a restore puts it back as it
// was, a proposal again if it was one. Keeping, dismissing, retiring and restoring go through the one lifecycle family
// of every chapter (record-lifecycle.js: record.keep, record.retire, record.restore; round 12, GR-GOV-23); each
// chapter gives it its own rules (TECHNOLOGY_LIFECYCLE below, and those of Chapters 8 and 10).
// DM-09, DM-10: a field absent from a save keeps its value and null clears it; a link list is sent whole or as
// {add, remove}; a value beyond its limit is refused, naming the limit; a save that changes nothing keeps the record and
// its revision. A confirmation stays only while what it confirms is unchanged, or when the save confirms it again.
// DM-16: a record keeps `open` (open-fields.js) for fields a source does not state or a question leaves open; a required
// field in either state satisfies a check, and the chapter raises one finding per cause.
export const NOT_STATED='',SEEDED='seeded',PROPOSED='proposed';
export const said=v=>v===''||v==null?'not stated':String(v);
export const authoredOrigin=(old,raw)=>!old||['seeded','inherited','reference'].includes(old.origin)?(raw?.origin==='suggestion'?'suggestion':'user'):old.origin;
// fitText (util.js): words refused past their limit, never cut; read by the Chapters 6-10 domains from here.
export {fitText};
// A record's fields: [name, kind, limit or choices, label], 't' text up to its limit, 'e' one of its choices ('' among
// them where a value may be not stated), 'b' yes or no. A field the save leaves out and the record never held stays
// out, so an older record keeps its shape (a field it never had was never asked, not 'not stated').
export function patchFields(old,raw,spec){const out={};for(const [f,k,a,label=f] of spec){const v=raw?.[f];if(v===undefined){if(old&&!(f in old))continue;out[f]=old?old[f]:k==='b'?false:'';continue;}
 if(k==='b'){out[f]=v===true;continue;}if(v===null&&(k!=='e'||a.includes(''))){out[f]='';continue;}
 if(k==='e'){if(!a.includes(v))throw Error('Choose the '+label+(a.includes('')?', or leave it not stated':'')+'.');out[f]=v;}else out[f]=fitText(v,a,'The '+label);}
 return out;}
// A link list: whole, or {add, remove}; null clears it. Each id must exist, and more than `max` is refused by name.
export function patchLinks(old,raw,f,exists,noun,max){const cur=Array.isArray(old?.[f])?old[f]:[],v=raw?.[f];if(v===undefined)return cur;let next;
 if(v===null)next=[];else if(Array.isArray(v))next=v;else if(typeof v==='object'){const out=new Set(Array.isArray(v.remove)?v.remove:[]);next=[...cur.filter(id=>!out.has(id)),...(Array.isArray(v.add)?v.add:[])];}else throw Error('Choose existing '+noun+'.');
 const bad=[...new Set(next.filter(id=>typeof id!=='string'||!exists(id)))];if(bad.length)throw Error('Choose existing '+noun+'; '+bad.slice(0,3).map(String).join(', ')+(bad.length>3?' and '+(bad.length-3)+' more':'')+(bad.length>1?' are':' is')+' not in this project.');
 const u=[...new Set(next)];if(u.length>max)throw Error('A record links up to '+fmt(max)+' '+noun+'; '+fmt(u.length)+' were sent.');return u;}
// The requirements a record names itself (DM-02, DM-03), apart from the trail it inherits: requirement ids and RG
// groups, each existing.
// A record that names none keeps no empty list, so a save that adds no link leaves its shape as it was.
export function groundLinks(p,old,raw){const reqs=new Set((p.artefacts||[]).filter(a=>a.type==='requirement').map(a=>a.id)),groups=new Set(requirementGroups(p).map(g=>g.id).filter(id=>/^RG-\d+$/.test(id))),out={},ids=patchLinks(old,raw,'requirementIds',id=>reqs.has(id),'requirements',5000),gs=patchLinks(old,raw,'requirementGroupIds',id=>groups.has(id),'requirement groups',500);
 if(ids.length||old&&'requirementIds' in old)out.requirementIds=ids;if(gs.length||old&&'requirementGroupIds' in old)out.requirementGroupIds=gs;return out;}
export const groundIds=(p,r)=>[...new Set([...(r?.requirementIds||[]),...(r?.requirementGroupIds||[]).flatMap(id=>groupMembers(p,id))])];
export const patchOpen=(old,raw,fields)=>{const v=raw?.open;if(v===undefined)return old?.open&&Object.keys(old.open).length?old.open:undefined;const o=v===null?{}:cleanOpen(v,fields);return Object.keys(o).length?o:undefined;};
export function keepConfirmations(old,next,raw,map){if(old)for(const [flag,fields] of Object.entries(map))if(raw?.[flag]!==true&&fields.some(f=>JSON.stringify(old[f]??'')!==JSON.stringify(next[f]??'')))next[flag]=false;}
const empty=v=>v==null||v===''||Array.isArray(v)&&!v.length||typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length;
// Whether a save leaves what a reader sees as it was: absent, '', [] and {} are one "nothing".
export const sameRecord=(a,b,keys)=>keys.every(k=>empty(a?.[k])&&empty(b?.[k])||JSON.stringify(a?.[k])===JSON.stringify(b?.[k]));
export const isProposed=r=>r?.state===PROPOSED;
// Makes a record authored: no state stored, the author's origin, and the earlier origin in its history if it keeps one.
export function authored(r,origin){delete r.state;r.origin=origin;return r;}
// The records of a chapter collection retired from the design (record-lifecycle.js keeps them in p.retired.records): a
// chapter that proposes records reads them, so it never proposes again what a person dismissed.
export const retiredOf=(p,path)=>(p.retired?.records||[]).filter(x=>x.path===path);
// The one finding a chapter raises for its proposals (DM-17), naming them.
export function proposalNote(list,from){const refs=list.map(r=>r.ref||r.id),n=refs.length;return {title:'Review the proposals',detail:(n===1?'1 record was':n+' records were')+' proposed by AIW from '+from+' and not yet written by a person: '+refs.slice(0,12).join(', ')+(n>12?' and '+(n-12)+' more':'')+'. Keep, complete or dismiss each. Until then '+(n===1?'it counts':'they count')+' in no other check.',ids:list.map(r=>r.id)};}
// The open fields of a chapter's records, one finding per cause (DM-16): values no source states ('' where '' is the
// not-stated value, a recorded state, or an earlier document's placeholder words) and open questions.
const UNSTATED_FIELDS=new Set(['stage','role','mode','kind','priority','category','continuity','criticality','operatingModel','personalData','minReady','maxReplicas','replicas','status']);
export function openNotes(records,fields,add){const by={'not-stated':[],'open-question':[]};
 for(const r of records)for(const f of fields(r)){const kept=r.open?.[f],v=r[f];if(kept&&by[kept.state])by[kept.state].push([r,f,kept.question]);else if(v===''&&f in r&&UNSTATED_FIELDS.has(f)||v==='Not classified yet')by['not-stated'].push([r,f]);else if(typeof v==='string'&&v.trim()&&isOpenText(v)){const q=questionOf(v);by[q!==null?'open-question':'not-stated'].push([r,f,q]);}}
 const items=xs=>xs.map(([r,f,q])=>({objectId:r.id,field:f,...(q?{question:q}:{})})),named=xs=>xs.slice(0,5).map(([r,f])=>(r.ref||r.id)+' '+f.replace(/([A-Z])/g,' $1').toLowerCase()).join(', ')+(xs.length>5?' and '+(xs.length-5)+' more':'');
 const n=by['not-stated'].length,q=by['open-question'].length;
 if(n)add('not-stated','open',n+' value'+(n>1?'s are':' is')+' stated by no source','Not stated: '+named(by['not-stated'])+'. Record each when a source states it.','warning',{items:items(by['not-stated'])});
 if(q)add('open-question','questions',q+' question'+(q>1?'s wait':' waits')+' for an answer','Open: '+named(by['open-question'])+'.','warning',{items:items(by['open-question'])});}
// A required field is there when it holds a value or a recorded open state: checks read the state, never the words.
export const has=(r,f)=>!!(typeof r?.[f]==='string'?r[f].trim():r?.[f])||!!r?.open?.[f];
// Text that cites a requirement this record does not link (DM-03): the one reader and finding of every chapter
// (requirement-links.js citedNotes), one finding per chapter.

// The nine categories the Bank Payment reference seeds a capability for, and the cue words of a component's needs draft.
const REFERENCE_CATEGORIES=[['compute','Compute'],['transactional','Transactional storage'],['messaging','Messaging'],['caching','Caching'],['connectivity','Connectivity'],['identity','Identity'],['observability','Observability'],['backup','Backup'],['recovery','Recovery']];
// Round 12 (GR-TEC-05): five more, each with checks of its own (technologyFindings), so a scheduler, a workflow engine, a
// search index, a reporting store or an archive is no longer recorded as the nearest category and checked as one. No
// capability is seeded for them and no cue word drafts them: a person or a drafter chooses them.
export const ADDED_TECHNOLOGY_CATEGORIES=[['scheduling','Scheduling'],['workflow','Workflow'],['search','Search'],['reporting','Reporting data'],['archive','Archive']];
// Round 12 (GR-DOM-04): an application platform, so that a packaged platform (a core banking platform, a payments hub)
// is weighed in Chapter 7 as one option against building what it provides. No capability is seeded for it and no cue
// word drafts it: a person or a drafter chooses it.
export const PLATFORM_CATEGORIES=[['application-platform','Application platform']];
export const TECHNOLOGY_CATEGORIES=[...REFERENCE_CATEGORIES,...ADDED_TECHNOLOGY_CATEGORIES,...PLATFORM_CATEGORIES];
export const DEPENDENCY_TYPES=[['dependency','Required service'],['data','Data movement'],['trust','Trust enforcement'],['resilience','Recovery dependency']];
const clean=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'',sig=v=>JSON.stringify(v),pad=n=>String(n).padStart(3,'0');
// Compact change detection only; access control never depends on this fingerprint (source-fingerprint.js, the same fp1).
const fingerprint=valueFingerprint;
const compactSnapshot=value=>typeof value==='string'&&value.startsWith('fp1:')?value:fingerprint(JSON.parse(value));
// Explicit bounds (round 5, R5-G): what one workspace keeps, measured by scale-validate.mjs at these sizes.
export const TECHNOLOGY_LIMITS=Object.freeze({capabilities:500,dependencies:2000});
export const capabilities=p=>p.technology?.capabilities||[];
// Lookups (round 5, R5-G): on a settled document, or inside a pass (document-memo.js), each list is indexed once and
// every lookup reads the index; otherwise each searches its list as before. The same records, in the same order.
export const capability=(p,id)=>findIn(p,'technology:capabilities',()=>capabilities(p),id);
export const categoryName=id=>TECHNOLOGY_CATEGORIES.find(x=>x[0]===id)?.[1]||id;
export const needsFor=(p,id)=>filterIn(p,'technology:needs-by-application',()=>p.technology.needs,n=>n.applicationId,id);
export const supports=(p,id)=>filterIn(p,'technology:mappings-by-capability',()=>p.technology.mappings,m=>m.capabilityId,id);
const spec={
 compute:{title:'Application execution',purpose:'Execute application responsibilities within bounded, observable workloads.',boundary:'Own workload execution and resource isolation; financial authority remains with the application.',need:'Execute this component with workload isolation and controlled restart.',owner:'Platform architecture'},
 transactional:{title:'Transactional persistence',purpose:'Retain authoritative application state with explicit consistency and commit boundaries.',boundary:'Own durable state, unique references, and atomic updates. Do not imply ownership of an external core ledger.',need:'Persist this component’s authoritative records and original references consistently.',owner:'Data platform architecture'},
 messaging:{title:'Durable work handoff',purpose:'Carry acknowledged work and events across independently running components.',boundary:'Own durable delivery and redelivery semantics. The consumer still guards repeat financial effects.',need:'Dispatch durable work with explicit acknowledgement and duplicate-safe consumption.',owner:'Integration architecture'},
 caching:{title:'Disposable read acceleration',purpose:'Reduce repeated reads while keeping the source of truth explicit.',boundary:'Hold disposable derived values. Never use a cache-only check to authorise a financial effect.',need:'Accelerate repeat reads while preserving the authoritative record and a bypass path.',owner:'Application architecture'},
 connectivity:{title:'Service connectivity',purpose:'Route controlled requests between channels, application services, and external boundaries.',boundary:'Own routing, admission, and bounded connection behaviour; contracts remain with their producers.',need:'Reach required services with bounded timeouts and explicit failure responses.',owner:'Network architecture'},
 identity:{title:'Identity and access decisions',purpose:'Establish caller identity and enforce the authority to act at each protected boundary.',boundary:'Own authentication and entitlement decisions, credential lifecycle, and auditable denial.',need:'Enforce caller and service authority without treating an unavailable control as permission.',owner:'Identity architecture'},
 observability:{title:'Correlated operational evidence',purpose:'Retain and retrieve the evidence needed to explain behaviour across the payment journey.',boundary:'Own correlated telemetry and alerts; financial records retain their authoritative owner.',need:'Correlate events and failures using the original payment reference and alert an owner.',owner:'Operations architecture'},
 backup:{title:'Recoverable state copies',purpose:'Preserve restorable copies with an explicit retention and integrity policy.',boundary:'Own recoverable copies and verification. A successful copy is not proof of a successful restore.',need:'Retain recoverable copies of required state with an agreed loss boundary.',owner:'Data protection architecture'},
 recovery:{title:'Controlled service recovery',purpose:'Coordinate restoration and reconciliation before a service resumes financial work.',boundary:'Own recovery sequencing, evidence, and authority to resume; do not infer that a timeout means failure.',need:'Restore a usable service and reconcile uncertain outcomes before any controlled replay.',owner:'Service continuity architecture'},
 scheduling:{title:'Time-driven work scheduling',purpose:'Start time-driven and calendar-driven work when it is due, in its declared order.',boundary:'Own the schedule, its calendar and the order of runs; the work itself stays with the application that does it.',need:'Start this component’s time-driven work on its calendar, in order, with missed runs handled.',owner:'Operations architecture'},
 workflow:{title:'Workflow and task orchestration',purpose:'Carry long-running work and people’s tasks through their steps with their state kept.',boundary:'Own in-flight work items, their state and their assignment; decisions stay with the people and applications that make them.',need:'Carry this component’s long-running work and tasks through their steps without losing work in flight.',owner:'Application architecture'},
 search:{title:'Search index',purpose:'Find records quickly from an index derived from their source of record.',boundary:'Own the index and its freshness; the source of record stays authoritative, and nothing is authorised from the index alone.',need:'Find this component’s records quickly from an index rebuilt from the source of record.',owner:'Data platform architecture'},
 reporting:{title:'Reporting data store',purpose:'Keep the copies of records that reports and analysis read, apart from the systems that own the records.',boundary:'Own derived reporting copies and their refresh; the authoritative records stay with their owners.',need:'Provide reporting copies of this component’s records, refreshed from the records it owns.',owner:'Data platform architecture'},
 archive:{title:'Long-term archive',purpose:'Keep records for their retention period, retrievable and unaltered, after they leave active use.',boundary:'Own the retention, integrity and retrieval of archived records; deletion follows the retention rule.',need:'Keep this component’s records for their retention period, retrievable and unaltered.',owner:'Data protection architecture'}
};
// Round 12 (GR-DOM-04): the application platform's specification: what a packaged platform owns and what stays the design's.
spec['application-platform']={title:'Packaged application platform',purpose:'Provide a set of the design\'s application components as one packaged product, weighed against building them.',boundary:'Own the components the platform provides and the configuration that adapts them; the business rules stay the design\'s, and its data stays under the design\'s data and residency rules.',need:'Provide this component through a packaged application platform, configured rather than built.',owner:'Application architecture'};
// Snapshots of a settled (store) document are computed once per revision and record (audit F2-04); the copies a
// command changes are never settled, so their snapshots are always computed afresh (document-memo.js).
// What a reading reads of the records it names is their content (source-fingerprint.js contentSources, round 12 UX-02).
export function appSnapshot(p,id){return remember(p,'technology:app',id,()=>{const c=component(p,id);return fingerprint({component:c&&{id:c.id,revision:c.revision,needs:c.technologyNeeds,boundary:c.boundary,changed:componentSourceChanged(p,c)},sources:c?contentSources(p,componentSources(p,id)):null});});}
export const needChanged=(p,n)=>n.sourceSnapshot!==appSnapshot(p,n.applicationId);
// A capability's sources: once per capability for the length of a pass (its readers there only read it).
export function technologySources(p,id){return passValue(p,'technology:sources:'+id,()=>technologySourcesOf(p,id));}
function technologySourcesOf(p,id){
 const c=capability(p,id),ns=supports(p,id).map(m=>findIn(p,'technology:needs',()=>p.technology.needs,m.needId)).filter(Boolean),apps=[...new Set(ns.map(n=>n.applicationId))].map(id=>component(p,id)).filter(Boolean),ss=apps.map(a=>componentSources(p,a.id));
 return {needs:ns,applications:apps,logical:byId(ss.flatMap(s=>s.logical)),requirements:byId(ss.flatMap(s=>s.requirements)),drivers:byId([...ss.flatMap(s=>s.drivers),...withIds(p,'technology:drivers',()=>p.quality.drivers,c?.driverIds)]),decisions:byId([...ss.flatMap(s=>s.decisions),...withIds(p,'technology:decisions',()=>p.decisions.records,c?.decisionIds)])};
}
export function capabilitySnapshot(p,c){return remember(p,'technology:capability',c,()=>computeCapabilitySnapshot(p,c));}
function computeCapabilitySnapshot(p,c){const s=technologySources(p,c.id);return fingerprint({needs:s.needs.map(n=>({id:n.id,description:n.description,category:n.category,criticality:n.criticality,changed:needChanged(p,n)})),applications:s.applications.map(a=>appSnapshot(p,a.id)),drivers:contentSources(p,s.drivers),decisions:s.decisions.map(d=>({id:d.id,revision:d.revision,status:d.status,rationale:d.rationale}))});}
export const capabilityChanged=(p,c)=>c.sourceSnapshot!==capabilitySnapshot(p,c);
export const technologyStamp=p=>sig({technology:p.technology.version,application:p.realisation.version,logical:p.logical.version,requirements:p.contentVersion,quality:p.quality.version,decisions:p.decisions.version});
export const intakeStamp=p=>sig(components(p).map(c=>appSnapshot(p,c.id)));
export const technologyIntakeCurrent=p=>p.technology.intake?.stamp!=null&&p.technology.intake.stamp===intakeStamp(p);
export const technologyReviewCurrent=p=>p.technology.review?.stamp===technologyStamp(p);
export const technologyHandoffCurrent=p=>p.technology.handoff?.stamp===technologyStamp(p);
export const simulationCurrent=(p,s)=>!!s&&!s.withdrawn&&s.stamp===technologyStamp(p);
const baseCategories={
 'api-pod':['compute','transactional','connectivity','identity','observability','backup'],
 'risk-engine':['compute','transactional','identity','observability','backup'],
 'core-adapter':['compute','connectivity','identity','observability'],
 worker:['compute','transactional','messaging','connectivity','identity','observability','backup','recovery'],
 'notify-worker':['compute','messaging','connectivity','identity','observability']
};
// Cue words at the start of a word, read from the component's own words, never from an open question in them (round 12).
const cues={compute:/\b(?:runtime|execut|schedul|worker)/i,transactional:/\b(?:stor|persist|durab|record)/i,messaging:/\b(?:queue|dispatch|event|messag)/i,caching:/\bcach/i,connectivity:/\b(?:connect|enquir|integrat|network)/i,identity:/\b(?:auth|identity|access)/i,observability:/\b(?:monitor|audit|alert|evidence|correlat)/i,backup:/\b(?:backup|copies)/i,recovery:/\b(?:recover|restore|reconcil)/i};
const ownWords=v=>String(v||'').replace(/open question:[^?]*\?/gi,' ').replace(/not stated in the brief or the upstream records\.?/gi,' ');
// A need AIW drafted from cue words that nobody has decided on (DM-17): state 'proposed', or, written before round 12,
// AIW's suggestion still in AIW's words and unconfirmed (only cue words ever made such a need).
export const needIsSeed=(p,n)=>n?.state===PROPOSED||!n?.state&&!n?.keptAt&&n?.origin==='suggestion'&&!n.confirmed&&n.description===spec[n.category]?.need;
// In a person's project AIW proposes the need and leaves its consequence not stated (DM-05): keeping the proposal does
// not make AIW's guess the person's; the Bank Payment reference keeps its illustrative consequences.
function addNeeds(p,c,seedMappings=false){
 const t=p.technology,own=isBlankProject(p),cats=baseCategories[c.id]||(seedingOff(p)?[]:REFERENCE_CATEGORIES.filter(([id])=>cues[id].test(ownWords(c.technologyNeeds))).map(([id])=>id));
 for(const category of cats){const n={id:'TN-'+pad(++t.counters.need),applicationId:c.id,category,description:own&&!baseCategories[c.id]?needWording(p,c.id,category).text:spec[category].need,criticality:own&&!baseCategories[c.id]?NOT_STATED:category==='caching'||category==='observability'?'degraded':'essential',confirmed:false,origin:baseCategories[c.id]?'reference':own?SEEDED:'suggestion',...(own&&!baseCategories[c.id]?{state:PROPOSED}:{}),sourceSnapshot:appSnapshot(p,c.id)};t.needs.push(n);if(seedMappings){const cap=t.capabilities.find(c=>c.category===category);t.mappings.push({id:'TM-'+pad(++t.counters.mapping),needId:n.id,capabilityId:cap.id,scope:n.description,origin:'reference'});}}
 // A person's project has no default trust boundary: the reference's Payment services boundary is the reference's own.
 t.applicationBoundaries[c.id]=own?'':'tb-002';t.knownApplications.push(c.id);
}
// rc39: the words of a need, derived from the drivers when one reaches the application and opens a design question the
// need's category answers (design-questions.js, pattern-dna.js): "Transactional persistence for QD-001 (preserve one
// financial effect), QD-003 (acknowledge a payment predictably) and QD-006 (retain the payment trail across
// boundaries)." The template sentence is the fallback when no driver applies (fromDrivers false). One function for the
// seeding of a person's project and the needs editor's default; the reference project keeps its illustrative words,
// and a need already recorded is never rewritten: the Needs register offers the wording as an edit the person accepts.
const lowFirst=t=>String(t||'').replace(/^[A-Z]/,c=>c.toLowerCase()).replace(/[.]$/,'');
export function needWording(p,applicationId,category){
 const template=spec[category]?.need||'',r=spec[category]?designQuestions(p,applicationId):null;
 if(!r)return {text:template,fromDrivers:false,driverIds:[]};
 const ids=[];for(const q of r.questions){if(!QUESTION_INDEX[q.id]?.answers.includes('need:'+category))continue;for(const id of q.because)if(!ids.includes(id))ids.push(id);}
 const drivers=ids.map(id=>r.drivers.find(d=>d.id===id)).filter(Boolean);
 if(!drivers.length)return {text:template,fromDrivers:false,driverIds:[]};
 const words=drivers.map(d=>d.id+' ('+lowFirst(d.title)+')');
 return {text:spec[category].title+' for '+(words.length>1?words.slice(0,-1).join(', ')+' and '+words.at(-1):words[0])+'.',fromDrivers:true,driverIds:drivers.map(d=>d.id)};
}
export const technologySeeds=p=>(p.technology?.needs||[]).filter(n=>needIsSeed(p,n));
// The three trust boundaries a new project starts with (round 12, GR-SEC-05). The Bank Payment reference keeps its
// illustrative boundaries as they were. In a person's project they are AIW's proposals (state 'proposed', origin 'seeded',
// D-13): each names a boundary, in words that belong to no domain, and states no owner and no crossing policy (DM-05),
// so nobody's ownership or rule is invented; they count in no check until a person keeps, completes or dismisses them.
function seedBoundaries(own){return [['tb-001','Channel entry','Channel security architecture','Authenticate the caller and authorise the instruction before crossing into payment services.'],['tb-002',own?'Application services':'Payment services','Application security architecture','Use explicit service identities and least-privilege access across component boundaries.'],['tb-003','Restricted state','Data security architecture','Restrict state and key access to named authorities; retain auditable access evidence.']].map(([id,title,owner,policy])=>own?{id,ref:id.toUpperCase(),title,owner:NOT_STATED,policy:NOT_STATED,open:{owner:{state:'not-stated'},policy:{state:'not-stated'}},origin:SEEDED,state:PROPOSED}:{id,ref:id.toUpperCase(),title,owner,policy});}
export const boundarySeeds=p=>(p.technology?.boundaries||[]).filter(isProposed);
export function withTechnology(input){
 const p=withRealisation(input);
 if(!p.technology){
  p.technology={schemaVersion:1,version:1,counters:{capability:0,need:0,mapping:0,dependency:0,boundary:3},capabilities:[],needs:[],mappings:[],dependencies:[],boundaries:seedingOff(p)?[]:seedBoundaries(isBlankProject(p)),applicationBoundaries:{},knownApplications:[],intake:null,review:null,handoff:null,simulations:[]};
  const t=p.technology;
  for(const [category] of REFERENCE_CATEGORIES){const seq=++t.counters.capability,id={transactional:'postgres',messaging:'queue',connectivity:'gateway'}[category]||'tc-'+pad(seq);t.capabilities.push({id,ref:'TC-'+pad(seq),revision:1,category,...spec[category],source:'Illustrative logical technology capability; confirm with the project.',rationale:spec[category].need,status:'candidate',origin:'reference',boundaryId:['transactional','backup','identity'].includes(category)?'tb-003':category==='connectivity'?'tb-001':'tb-002',failureDomain:'Primary operating domain',continuity:category==='caching'?'bypass':'single',alternateDomain:'',continuityPlan:category==='caching'?'Read from the authority if the cache is unavailable.':'',recoveryPlan:'',recoveryOwner:'',recoveryMinutes:'',lossMinutes:'',driverId:'',targetsConfirmed:false,assumptions:'Confirm capacity, isolation, access policy, and recovery behaviour before selecting products.',assumptionsResolved:false,driverIds:[],decisionIds:[],history:[]});}
  for(const c of components(p))addNeeds(p,c,!!baseCategories[c.id]);
  const dep=(from,to,type,label,critical=false)=>t.dependencies.push({id:'TD-'+pad(++t.counters.dependency),from,to,type,label,critical,policy:'Illustrative dependency; verify the failure and trust boundary.',origin:'reference'});
  dep('tc-001','gateway','dependency','requires service reachability',true);dep('gateway','tc-006','trust','requires access decisions',true);dep('tc-001','tc-007','data','emits correlated operational evidence');dep('queue','tc-007','data','reports delivery and failure evidence');
  for(const c of t.capabilities)c.sourceSnapshot=capabilitySnapshot(p,c);
 }else{
  // Preserve any earlier review state while compacting pre-release snapshots.
  const t=p.technology;
  for(const n of t.needs)if(n.sourceSnapshot&&!n.sourceSnapshot.startsWith('fp1:'))n.sourceSnapshot=compactSnapshot(n.sourceSnapshot);
  for(const c of t.capabilities)if(c.sourceSnapshot&&!c.sourceSnapshot.startsWith('fp1:')){const old=JSON.parse(c.sourceSnapshot);old.applications=old.applications.map(compactSnapshot);c.sourceSnapshot=fingerprint(old);}
  if(t.intake?.stamp){const old=JSON.parse(t.intake.stamp);if(old.some(v=>!v.startsWith('fp1:')))t.intake.stamp=sig(old.map(compactSnapshot));}
  const unknown=components(p).filter(c=>!p.technology.knownApplications.includes(c.id));
  if(unknown.length){for(const c of unknown)addNeeds(p,c);p.technology.version++;p.technology.review=null;p.technology.handoff=null;}
 }
 return p;
}
// The chapter's checks, worked out once per settled document or pass (each caller gets its own copies).
export function technologyFindings(p){return memoPass(p,()=>sharedList(p,'technology:findings',()=>technologyFindingsOf(p)));}
function technologyFindingsOf(p){
 const t=p.technology,fs=[],add=(code,id,title,detail,level='error',extra={})=>fs.push({id:code+':'+id,code,objectId:id,title,detail,level,...extra}),g=logicalGraph(p),ids=new Set(g.nodes.map(n=>n.id));
 if(!technologyIntakeCurrent(p))add('intake','project','Review the application handoff','Application needs or their upstream rationale have changed.','warning');
 for(const a of components(p))if(!needsFor(p,a.id).length)add('no-needs',a.id,'Define technology needs for '+a.ref,'Review the application’s capability needs before treating it as supported.');
 const seeds=technologySeeds(p),bounds=boundarySeeds(p);if(seeds.length||bounds.length){const s=proposalNote([...seeds,...bounds],[seeds.length?'the words of the components\' technology needs':'',bounds.length?'the trust boundaries a new project starts with':''].filter(Boolean).join(' and '));add('proposals','technology',s.title,s.detail,'warning',{ids:s.ids});}
 const mappingsOf=groupBy(t.mappings,m=>m.needId),needById=firstById(t.needs),essentialNeeds=new Set(t.needs.filter(n=>n.criticality==='essential').map(n=>n.id)),dependent=new Set(t.dependencies.flatMap(d=>[d.from,d.to])),driverIds=new Set(p.quality.drivers.map(d=>d.id)),decisionIds=new Set(p.decisions.records.map(d=>d.id)),dependsFrom=groupBy(t.dependencies,d=>d.from);
 for(const n of t.needs){
  if(!component(p,n.applicationId))add('broken-application',n.id,'Repair '+n.id+' application link','The source application is missing.');
  if(needIsSeed(p,n))continue;
  if(!has(n,'description'))add('need-description',n.applicationId,'Describe '+n.id,'State what this application needs from '+categoryName(n.category)+'.');
  if(!n.confirmed||needChanged(p,n))add('need-review',n.applicationId,'Review '+n.id+' application need','Confirm this need against the current application definition.','warning',{needId:n.id,id:'need-review:'+n.id});
  if(!(mappingsOf.get(n.id)||[]).some(m=>capability(p,m.capabilityId)))add('unsupported',n.applicationId,'Support '+n.id+' · '+categoryName(n.category),n.description,'error',{needId:n.id,id:'unsupported:'+n.id});
 }
 for(const m of t.mappings){const n=needById.get(m.needId),c=capability(p,m.capabilityId);if(!n||!c)add('broken-mapping',m.capabilityId,'Repair '+m.id,'The capability or application need is missing.');else{if(!m.scope)add('mapping-scope',c.id,'Explain '+m.id,'Describe how this capability fulfils the application need.');if(n.category!==c.category)add('mapping-fit',c.id,'Explain the category fit for '+m.id,categoryName(c.category)+' is mapped to a '+categoryName(n.category)+' need. Confirm the scope or choose a matching capability.','warning');}}
 const essentialCaps=new Set(t.mappings.filter(m=>essentialNeeds.has(m.needId)).map(m=>m.capabilityId));
 for(let i=0;i<t.capabilities.length;i++){const before=essentialCaps.size;for(const d of t.dependencies)if(d.critical&&['dependency','trust'].includes(d.type)&&essentialCaps.has(d.from))essentialCaps.add(d.to);if(before===essentialCaps.size)break;}
 for(const c of capabilities(p)){
  const s=technologySources(p,c.id),essential=essentialCaps.has(c.id);
  if(!['purpose','boundary','owner','rationale','source'].every(f=>has(c,f)))add('definition',c.id,'Define '+c.ref+' · '+c.title,'Complete its purpose, owned boundary, owner, rationale, and source.');
  if(!s.needs.length&&!dependent.has(c.id))add('unused',c.id,'Justify '+c.ref,'This capability has no application mapping or dependency. Confirm whether it belongs in the design.','warning');
  if(capabilityChanged(p,c))add('source-change',c.id,'Review changed rationale for '+c.ref,'A supporting application need, quality driver, or decision changed.');
  if(!s.drivers.length)add('driver',c.id,'Link a quality driver to '+c.ref,'Use an application mapping or an explicit quality-driver reference.','warning');
  if(!s.decisions.length)add('decision',c.id,'Record the decision behind '+c.ref,'Link a recorded decision or carry the open question into Chapter 3.','warning');
  else if(s.decisions.some(d=>!decisionCurrent(p,d)))add('decision-review',c.id,'Review supporting decisions for '+c.ref,'Draft or changed decisions remain visible but do not justify an approved technology choice.','warning');
  if(c.driverIds.some(id=>!driverIds.has(id))||c.decisionIds.some(id=>!decisionIds.has(id)))add('broken-source',c.id,'Repair source references for '+c.ref,'A named quality driver or decision is missing.');
  if(!t.boundaries.some(b=>b.id===c.boundaryId))add('trust',c.id,'Set a trust boundary for '+c.ref,'Choose the policy boundary controlling this capability.');
  if(!has(c,'failureDomain'))add('domain',c.id,'Name the failure domain for '+c.ref,'State which capabilities could be lost together.');
  if(essential&&c.continuity==='single')add('single-point',c.id,'Single support path · '+c.title,'Essential application needs depend on one declared capability path. Record the continuity arrangement or carry the risk explicitly.','warning');
  if(c.continuity==='redundant'&&(!has(c,'alternateDomain')||!!c.alternateDomain&&c.alternateDomain.trim().toLowerCase()===String(c.failureDomain||'').trim().toLowerCase()||!has(c,'continuityPlan')))add('isolation',c.id,'Clarify independent continuity for '+c.ref,'Name a different alternate failure domain and explain how service continues. Two copies in the same domain are not independent.');
  if(c.continuity==='bypass'&&!has(c,'continuityPlan'))add('bypass',c.id,'Define the safe bypass for '+c.ref,'Explain which behaviour can continue safely without the capability.');
  if(c.continuity==='bypass'&&['identity','transactional'].includes(c.category))add('unsafe-bypass',c.id,'Review a critical bypass for '+c.ref,'Identity and authoritative state must not fail open. Describe a controlled redundant path or explicit unavailability.');
  if(['transactional','messaging'].includes(c.category)){
   if(!['recoveryPlan','recoveryOwner','recoveryMinutes','lossMinutes'].every(f=>has(c,f)))add('recovery-plan',c.id,'Define recovery for '+c.ref,'Record restoration steps, an accountable owner, and explicit recovery-time and data-loss assumptions.');
   if(!(dependsFrom.get(c.id)||[]).some(d=>d.type==='resilience'&&capability(p,d.to)?.category==='backup'))add('backup',c.id,'Link recoverable copies for '+c.ref,'Show which backup capability supplies restorable state.','error');
   if(!(dependsFrom.get(c.id)||[]).some(d=>d.type==='resilience'&&capability(p,d.to)?.category==='recovery'))add('recovery-path',c.id,'Link recovery coordination for '+c.ref,'Show which capability owns the restoration dependency.','warning');
  }
  // Round 12 (GR-TEC-05): the checks of the added categories. A schedule says what happens to a missed or late run; a
  // workflow where its work in flight is kept and how it resumes (its state is its own, so it needs no backup link); a
  // search index how it is rebuilt from its source of record; reporting copies how they are refreshed and what reports
  // show when a refresh fails; an archive how archived records are restored and verified, with the loss accepted.
  if(c.category==='scheduling'&&!has(c,'continuityPlan'))add('schedule-policy',c.id,'Define missed runs for '+c.ref,'Say what happens when a scheduled run is missed, late or overlaps the next one (catch up, skip or hold) and who decides.');
  if(c.category==='workflow'&&!['recoveryPlan','recoveryOwner'].every(f=>has(c,f)))add('workflow-state',c.id,'Keep the work in flight for '+c.ref,'Say where work in flight is kept and how it resumes after a failure, with an accountable owner.');
  if(c.category==='search'&&!has(c,'recoveryPlan'))add('search-rebuild',c.id,'Say how '+c.ref+' is rebuilt','Name the source of record the index is rebuilt from, how long a rebuild takes and how stale results may be.','warning');
  if(c.category==='reporting'&&!has(c,'continuityPlan'))add('reporting-refresh',c.id,'Say how '+c.ref+' is refreshed','Say how often the reporting copies are refreshed from their source and what reports show when a refresh fails.','warning');
  if(c.category==='archive'&&!['recoveryPlan','recoveryOwner','lossMinutes'].every(f=>has(c,f)))add('archive-recovery',c.id,'Define retrieval and restore for '+c.ref,'Record how archived records are restored and verified, an accountable owner, and the loss you accept.');
  if((c.recoveryMinutes!==''||c.lossMinutes!=='')&&!c.targetsConfirmed)add('target-assumption',c.id,'Confirm recovery assumptions for '+c.ref,'Recovery-time and data-loss numbers remain assumptions until reviewed against evidence.','warning');
  // Round 12 (GR-DOM-04): an application platform names the components it provides; Chapter 7 weighs it as one option.
  if(c.category==='application-platform'&&!has(c,'boundary'))add('platform-scope',c.id,'Say what '+c.ref+' provides','Name the application components the packaged platform provides, so that Chapter 7 weighs it as one option against building them.','warning');
  if(c.assumptions&&!c.assumptionsResolved)add('assumption',c.id,'Resolve assumptions for '+c.ref,c.assumptions,'warning');
  if(c.status!=='reviewed')add('review',c.id,'Review '+c.ref+' capability design','Reference and suggested content require a project review.','warning');
 }
 // rc39 (PLAN §4.3.3): a driver asks a design question no decision answers, per capability (design-questions.js).
 for(const c of capabilities(p))designQuestionFindings(designQuestions(p,c.id),add);
 for(const b of t.boundaries)if(!isProposed(b)&&(!b.title||!has(b,'owner')||!has(b,'policy')))add('boundary-policy',b.id,'Define '+b.ref+' trust policy','Name the owner and the rule for crossing this boundary.');
 for(const d of t.dependencies){if(!ids.has(d.from)||!ids.has(d.to))add('broken-dependency',d.id,'Repair '+d.id,'A relationship endpoint is missing.','error',{dependencyId:d.id});if(!d.policy)add('dependency-policy',d.from,'Explain '+d.id+' boundary behaviour','Record the exchange, access obligation, or recovery policy.','error',{dependencyId:d.id});if(d.type==='resilience'){const a=capability(p,d.from),b=capability(p,d.to);if(a&&b&&a.failureDomain&&a.failureDomain===b.failureDomain)add('shared-recovery-domain',a.id,'Separate recovery dependencies for '+a.ref,'The primary and recovery capability share a declared failure domain. A domain loss may remove both.','warning',{dependencyId:d.id});}}
 // Directed critical prerequisite cycles make start-up and recovery order unclear.
 const critical=t.dependencies.filter(d=>d.critical&&['dependency','trust'].includes(d.type)),criticalFrom=groupBy(critical,d=>d.from),next=id=>(criticalFrom.get(id)||[]).map(d=>d.to);
 for(const c of capabilities(p)){const pending=next(c.id),seen=new Set();while(pending.length){const id=pending.pop();if(id===c.id){add('cycle',c.id,'Review a circular prerequisite for '+c.ref,'Critical prerequisites loop back to this capability; state a viable start-up and recovery order.');break;}if(seen.has(id))continue;seen.add(id);pending.push(...next(id));}}
 // Round 12 (DM-16, DM-03): values no source states, open questions, and requirements cited only in words, one finding
 // per cause for the chapter; AIW's proposals wait for their own finding.
 const decided=t.needs.filter(n=>!needIsSeed(p,n)),openOf=new Map([...decided.map(n=>[n,['description','criticality']]),...capabilities(p).map(c=>[c,CAPABILITY_OPEN]),...t.boundaries.filter(b=>!isProposed(b)).map(b=>[b,['owner','policy']])]);
 openNotes([...openOf.keys()],r=>openOf.get(r),add);citedNotes(p,[...decided,...capabilities(p)],add);
 return fs;
}
const CAPABILITY_OPEN=['purpose','boundary','owner','rationale','source','failureDomain','alternateDomain','continuity','continuityPlan','recoveryPlan','recoveryOwner','recoveryMinutes','lossMinutes','assumptions'];
export function technologyMilestones(p){return memoPass(p,()=>technologyMilestonesOf(p));}
function technologyMilestonesOf(p){const fs=technologyFindings(p),t=p.technology,none=codes=>!fs.some(f=>codes.includes(f.code));return [
 {id:'intake',name:'Review application inputs',detail:components(p).length+' inherited components',done:technologyIntakeCurrent(p)},
 {id:'needs',name:'Clarify capability needs',detail:t.needs.filter(n=>n.confirmed&&!needChanged(p,n)).length+' / '+t.needs.length+' needs reviewed',done:t.needs.length>0&&none(['no-needs','need-description','need-review'])&&!technologySeeds(p).length},
 {id:'support',name:'Support each application need',detail:t.mappings.length+' support mappings',done:t.needs.length>0&&none(['unsupported','broken-mapping','mapping-scope'])},
 {id:'define',name:'Explain the capabilities',detail:capabilities(p).length+' vendor-neutral capabilities',done:capabilities(p).length>0&&none(['definition','source-change','broken-source','trust','domain'])},
 {id:'resilience',name:'Describe recovery and trust',detail:'Continuity, state protection, and access policies',done:capabilities(p).length>0&&none(['recovery-plan','backup','isolation','bypass','unsafe-bypass','dependency-policy','boundary-policy','cycle'])&&!boundarySeeds(p).length},
 {id:'simulate',name:'Explore two failure scopes',detail:['capability','domain'].filter(mode=>t.simulations.some(s=>s.mode===mode&&simulationCurrent(p,s))).length+' / 2 failure scopes reviewed',done:['capability','domain'].every(mode=>t.simulations.some(s=>s.mode===mode&&simulationCurrent(p,s)))},
 {id:'validate',name:'Validate the logical technology',detail:fs.filter(f=>f.level==='error').length+' content gaps',done:technologyReviewCurrent(p)&&!fs.some(f=>f.level==='error')},
 {id:'handoff',name:'Carry forward to Chapter 7',detail:'Stable technology references and open findings',done:technologyHandoffCurrent(p)}
];}

// An application's needs (round 12, DM-26): each entry keyed by its id, so a category may hold several needs; an entry
// with no id and the category of exactly one existing need updates that need, as the category editor sends it. The set
// replaces the application's needs (one left out is removed); each need is patched (DM-09) and may name the requirements
// it answers (DM-03). A need whose words, consequence or links change becomes its author's; one kept as it was stays as
// it was, and confirming the set keeps AIW's proposals as the person's. The application's trust boundary may be not
// stated yet (DM-05). Returns whether anything changed.
const NEED_FIELDS=[['description','t',4000,'need'],['criticality','e',['essential','degraded','optional',''],'consequence if unavailable']],NEED_KEYS=['category','description','criticality','requirementIds','requirementGroupIds','open'];
function saveNeeds(p,raw){
 const t=p.technology,a=component(p,raw.applicationId);if(!a)throw Error('Choose an existing application component.');
 const entries=Array.isArray(raw.needs)?raw.needs:[];if(!entries.length)throw Error('Define at least one capability need for this application.');if(entries.some(n=>!spec[n?.category]))throw Error('Choose a capability category for each need.');
 const boundaryId=raw.boundaryId===undefined?t.applicationBoundaries[a.id]||'':raw.boundaryId||'';if(boundaryId&&!t.boundaries.some(b=>b.id===boundaryId))throw Error('Choose an existing trust boundary for the application.');
 const previous=needsFor(p,a.id),claimed=new Set(),named=new Set(entries.map(e=>e.id).filter(Boolean)),kept=[];let changed=boundaryId!==(t.applicationBoundaries[a.id]||'')||previous.length!==entries.length;
 for(const input of entries){let old=input.id?previous.find(n=>n.id===input.id):null;if(input.id&&!old)throw Error(input.id+' is not a need of '+a.ref+'.');
  if(!old){const same=previous.filter(n=>n.category===input.category&&!claimed.has(n.id)&&!named.has(n.id));if(same.length===1)old=same[0];}
  if(old){if(claimed.has(old.id))throw Error('Send each need once.');claimed.add(old.id);}
  const next={...(old||{}),id:old?.id||'TN-'+pad(++t.counters.need),applicationId:a.id,category:input.category,...patchFields(old,input,NEED_FIELDS),...groundLinks(p,old,input)};if(!next.description)throw Error('Describe each selected application need.');
  const open=patchOpen(old,input,['description','criticality']);if(open)next.open=open;else delete next.open;
  const edited=!old||!sameRecord(old,next,NEED_KEYS),seed=old&&needIsSeed(p,old),mark={origin:input.origin==='suggestion'||raw.origin==='suggestion'?'suggestion':''};
  const confirmation=input.confirmed===undefined?raw.confirmed:input.confirmed;
  if(edited)authored(next,authoredOrigin(seed?{origin:SEEDED}:old,mark));else if(confirmation===true&&seed)authored(next,'suggestion');
  next.confirmed=confirmation===undefined?!edited&&!!old?.confirmed:confirmation===true;next.sourceSnapshot=edited||confirmation===true?appSnapshot(p,a.id):old.sourceSnapshot;
  if(edited||['confirmed','state','origin','sourceSnapshot'].some(k=>next[k]!==old?.[k]))changed=true;kept.push(next);}
 if(!changed)return false;
 t.needs=t.needs.filter(n=>n.applicationId!==a.id).concat(kept);const valid=new Set(t.needs.map(n=>n.id));t.mappings=t.mappings.filter(m=>valid.has(m.needId));t.applicationBoundaries[a.id]=boundaryId;return true;
}
// A capability, patched (DM-09): continuity may be not stated (DM-05), and it may name the requirements it answers (DM-03).
const minutesField=(raw,f,old)=>{const v=raw[f];if(v===undefined)return old?.[f]??'';if(v!==''&&v!=null&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>5256000))throw Error('Recovery assumptions must be non-negative numbers in minutes.');return v===''||v==null?'':String(Number(v));};
const CAPABILITY_FIELDS=[['title','t',160,'capability name'],['category','e',TECHNOLOGY_CATEGORIES.map(([id])=>id),'capability category'],['purpose','t',4000,'purpose'],['boundary','t',4000,'owned boundary'],['owner','t',180,'owner'],['rationale','t',4000,'rationale'],['source','t',4000,'source'],['failureDomain','t',4000,'failure domain'],['alternateDomain','t',4000,'alternate domain'],['continuityPlan','t',4000,'continuity behaviour'],['recoveryPlan','t',4000,'recovery plan'],['recoveryOwner','t',4000,'recovery owner'],['assumptions','t',4000,'assumptions'],['status','e',['draft','candidate','reviewed'],'design state'],['continuity','e',['single','redundant','bypass',''],'continuity arrangement'],['targetsConfirmed','b'],['assumptionsResolved','b']];
const CAPABILITY_KEYS=[...CAPABILITY_FIELDS.map(([f])=>f),'recoveryMinutes','lossMinutes','driverId','driverIds','decisionIds','boundaryId','requirementIds','requirementGroupIds','open'];
function saveCapability(p,raw,at){
 const t=p.technology,old=raw.id?capability(p,raw.id):null;if(raw.id&&!old)throw Error('This capability no longer exists.');
 const f=patchFields(old,raw,CAPABILITY_FIELDS);if(!f.title||!spec[f.category])throw Error('Name the capability and choose its category.');if(!old&&!raw.status)f.status='draft';
 if(!old&&t.capabilities.length>=TECHNOLOGY_LIMITS.capabilities)throw Error('This workspace keeps up to 500 technology capabilities.');
 const driverIds=patchLinks(old,raw,'driverIds',id=>p.quality.drivers.some(d=>d.id===id),'quality drivers',500),decisionIds=patchLinks(old,raw,'decisionIds',id=>p.decisions.records.some(d=>d.id===id),'decisions',500);
 // Round 11: the Chapter 2 driver this capability's recovery target serves, so the specification can read the chain.
 const driverId=raw.driverId===undefined?old?.driverId||'':clean(raw.driverId,40);if(driverId&&!p.quality.drivers.some(d=>d.id===driverId))throw Error('Choose an existing quality driver for the recovery target to serve.');
 const boundaryId=raw.boundaryId===undefined?old?.boundaryId||'':raw.boundaryId||'';if(boundaryId&&!t.boundaries.some(b=>b.id===boundaryId))throw Error('Choose an existing trust boundary.');
 const maps=raw.mappings===undefined?null:Array.isArray(raw.mappings)?raw.mappings:[];if(maps&&(new Set(maps.map(m=>m.needId)).size!==maps.length||maps.some(m=>!t.needs.some(n=>n.id===m.needId))))throw Error('Map each existing application need only once.');
 const c={...(old||{}),...f,driverIds,decisionIds,driverId,boundaryId,recoveryMinutes:minutesField(raw,'recoveryMinutes',old),lossMinutes:minutesField(raw,'lossMinutes',old),...groundLinks(p,old,raw)};const open=patchOpen(old,raw,CAPABILITY_FIELDS.map(([x])=>x));if(open)c.open=open;else delete c.open;
 keepConfirmations(old,c,raw,{targetsConfirmed:['recoveryMinutes','lossMinutes'],assumptionsResolved:['assumptions']});
 if(c.status==='reviewed'&&!['purpose','boundary','owner','source','rationale','boundaryId','failureDomain'].every(x=>has(c,x)))throw Error('Complete the capability definition, rationale, owner, trust boundary, and failure domain before review.');
 const previous=supports(p,c.id||''),mapped=maps&&(maps.length!==previous.length||maps.some(m=>{const x=previous.find(y=>y.needId===m.needId);return !x||x.scope!==clean(m.scope);}));
 if(old&&sameRecord(old,c,CAPABILITY_KEYS)&&!mapped)return old;
 const seq=old?null:++t.counters.capability;Object.assign(c,{id:old?.id||'tc-'+pad(seq),ref:old?.ref||'TC-'+pad(seq),revision:(old?.revision||0)+1,origin:authoredOrigin(old,raw),history:old?[...old.history,{at,revision:old.revision,title:old.title,purpose:old.purpose,continuity:old.continuity,recoveryPlan:old.recoveryPlan,...(old.origin!==authoredOrigin(old,raw)?{origin:old.origin}:{})}].slice(-30):[]});
 delete c.state;if(maps){t.mappings=t.mappings.filter(m=>m.capabilityId!==c.id);for(const m of maps){const prior=previous.find(x=>x.needId===m.needId);t.mappings.push({id:prior?.id||'TM-'+pad(++t.counters.mapping),capabilityId:c.id,needId:m.needId,scope:fitText(m.scope,4000,'The support scope'),origin:prior?.origin||'user'});}}
 if(old)t.capabilities[t.capabilities.indexOf(old)]=c;else t.capabilities.push(c);c.sourceSnapshot=capabilitySnapshot(p,c);return c;
}
const DEPENDENCY_FIELDS=[['from','t',100,'first object'],['to','t',100,'second object'],['type','e',DEPENDENCY_TYPES.map(([id])=>id),'relationship type'],['label','t',180,'relationship meaning'],['policy','t',4000,'boundary and failure policy'],['critical','b']];
// Why a Chapter 6 dependency from → to of a type would be refused, or '' (rc41 close: one rule for the save and for the
// canvas's kinds menu): two different objects of the logical graph, one of them a technology capability; a prerequisite,
// trust or recovery link between two capabilities; not already recorded with that type (`except`: the one being edited).
// With no type, the ends alone.
export function dependencyRefusal(p,from,to,type='',except=null){
 const g=logicalGraph(p);
 if(from===to||![from,to].every(id=>g.nodes.some(n=>n.id===id))||![from,to].some(id=>capability(p,id)))return 'Connect different existing objects, including a technology capability.';
 if(['dependency','trust','resilience'].includes(type)&&(!capability(p,from)||!capability(p,to)))return 'Prerequisite and recovery links connect capabilities; use application mappings and boundary membership for other support.';
 if(type&&(p.technology?.dependencies||[]).some(d=>d.id!==except&&d.from===from&&d.to===to&&d.type===type))return 'This dependency already exists. Edit the existing relationship.';
 return '';
}
function saveDependency(p,raw){
 const t=p.technology,old=raw.id?t.dependencies.find(d=>d.id===raw.id):null;if(raw.id&&!old)throw Error('This dependency no longer exists.');const f=patchFields(old,raw,DEPENDENCY_FIELDS);
 const ends=dependencyRefusal(p,f.from,f.to,'',old?.id);if(ends)throw Error(ends);
 if(!f.type||!f.label)throw Error('Choose a relationship type and explain its meaning.');
 const why=dependencyRefusal(p,f.from,f.to,f.type,old?.id);if(why)throw Error(why);
 if(!old&&t.dependencies.length>=TECHNOLOGY_LIMITS.dependencies)throw Error('This workspace keeps up to 2,000 technology dependencies.');
 const d={id:old?.id||'TD-'+pad(++t.counters.dependency),...f,critical:['dependency','trust'].includes(f.type)&&f.critical===true,origin:authoredOrigin(old,raw)};if(old&&sameRecord(old,d,DEPENDENCY_FIELDS.map(([x])=>x)))return old;
 if(old)t.dependencies[t.dependencies.indexOf(old)]=d;else t.dependencies.push(d);return d;
}
// A trust boundary, patched; its owner and policy may be open items (DM-16) rather than invented words.
const BOUNDARY_FIELDS=[['title','t',160,'boundary name'],['owner','t',180,'owner'],['policy','t',4000,'crossing policy']];
function saveBoundary(p,raw){const t=p.technology,old=raw.id?t.boundaries.find(b=>b.id===raw.id):null;if(raw.id&&!old)throw Error('This boundary no longer exists.');const b={...(old||{}),...patchFields(old,raw,BOUNDARY_FIELDS)},open=patchOpen(old,raw,['owner','policy']);if(open)b.open=open;else delete b.open;
 if(!b.title||!has(b,'owner')||!has(b,'policy'))throw Error('Name the boundary, accountable owner, and crossing policy.');if(old&&sameRecord(old,b,['title','owner','policy','open']))return old;
 const seq=old?null:++t.counters.boundary;Object.assign(b,{id:old?.id||'tb-'+pad(seq),ref:old?.ref||'TB-'+pad(seq)});if(old)t.boundaries[t.boundaries.indexOf(old)]=b;else t.boundaries.push(b);return b;}
export function technologyProposal(p,key,objectId,needId){
 const t=p.technology;let c=capability(p,objectId),n=t.needs.find(n=>n.id===needId);
 if(key==='missing'){
  n=n||needsFor(p,objectId).find(n=>!t.mappings.some(m=>m.needId===n.id))||t.needs.find(n=>!t.mappings.some(m=>m.needId===n.id));if(!n)return null;
  const existing=t.capabilities.find(c=>c.category===n.category);c=existing||{...spec[n.category],category:n.category,title:spec[n.category].title,owner:spec[n.category].owner,source:'Suggested from '+n.id+'; review before application.',status:'candidate',origin:'suggestion',boundaryId:p.technology.applicationBoundaries[n.applicationId]||'tb-002',failureDomain:'Primary operating domain',continuity:'single',driverIds:[],decisionIds:[],assumptions:'Confirm capacity, isolation, and recovery boundaries.'};
  return {key,objectId,needId:n.id,record:c,mappings:[...supports(p,c.id),{needId:n.id,scope:n.description}],dependencies:[],reason:'No capability currently fulfils '+n.id+' for '+component(p,n.applicationId)?.ref+'.',effect:existing?'Proposes a support mapping to '+existing.ref+'. Existing definitions remain reviewable.':'Proposes one vendor-neutral capability and its application mapping.'};
 }
 c=c||capabilities(p).find(c=>['transactional','messaging'].includes(c.category));if(!c)return null;
 if(key==='isolate')return {key,objectId:c.id,record:{...c,continuity:'redundant',alternateDomain:c.alternateDomain||'Independent recovery domain',continuityPlan:c.continuityPlan||'Continue on an independently isolated path after health and consistency checks; stop financial writes when authority is uncertain.',status:'candidate',assumptionsResolved:false},mappings:supports(p,c.id),dependencies:[],reason:'A shared failure domain can remove several support paths together.',effect:'Proposes an independent continuity arrangement. This is a design assumption, not a failover test.'};
 if(key==='restore'){
  const backup=capabilities(p).find(x=>x.category==='backup'),recovery=capabilities(p).find(x=>x.category==='recovery');
  const deps=[backup&&{from:c.id,to:backup.id,type:'resilience',label:'restores a verified copy from',policy:'Verify the copy, restore consistency, and reconcile the original references before resuming.'},recovery&&{from:c.id,to:recovery.id,type:'resilience',label:'coordinates restoration through',policy:'A named recovery owner authorises restoration order and resumption.'}].filter(d=>d&&!t.dependencies.some(e=>e.from===d.from&&e.to===d.to&&e.type==='resilience'));
  return {key,objectId:c.id,record:{...c,recoveryPlan:c.recoveryPlan||'Restore a verified copy, re-establish consistency, reconcile pending instructions, and authorise resumption.',recoveryOwner:c.recoveryOwner||c.owner,status:'candidate',assumptionsResolved:false},mappings:supports(p,c.id),dependencies:deps,reason:'A durable store or queue still needs a recoverable copy and an owned restoration process.',effect:'Proposes recovery dependencies and an editable restoration plan. Time and data-loss targets require your input.'};
 }return null;
}
const timeFactor=unit=>/^(s|sec|second|seconds)$/i.test(unit?.trim())?1:/^(min|minute|minutes)$/i.test(unit?.trim())?60:/^(h|hour|hours)$/i.test(unit?.trim())?3600:null;
// The consequence a simulated loss has for one need (round 12, GR-RUN-08): its stated criticality read against its
// capability's state, or "not stated" when its consequence is not stated.
export const CONSEQUENCE_NOT_STATED='not-stated';
export const consequenceOf=(n,state)=>n?.criticality==='essential'?state:n?.criticality==='degraded'?'degraded':CONSEQUENCE_NOT_STATED;
export function simulateTechnology(p,raw){
 const failed=capability(p,raw.capabilityId);if(!failed)throw Error('Choose a capability to simulate.');if(!['capability','domain'].includes(raw.mode))throw Error('Choose the failure scope.');
 const duration=Number(raw.durationMinutes);if(!Number.isFinite(duration)||duration<=0||duration>525600)throw Error('Enter a positive simulated outage duration in minutes.');
 if(raw.mode==='domain'&&!failed.failureDomain)throw Error('Name a failure domain before simulating its loss.');
 const states=new Map(),reasons=new Map();
 const losses=raw.mode==='domain'?capabilities(p).filter(c=>c.failureDomain.trim().toLowerCase()===failed.failureDomain.trim().toLowerCase()):[failed];
 for(const c of losses){const alternate=raw.mode==='domain'&&c.continuity==='redundant'&&c.alternateDomain&&c.alternateDomain.trim().toLowerCase()!==failed.failureDomain.trim().toLowerCase()&&c.continuityPlan;const bypass=c.continuity==='bypass'&&c.continuityPlan&&!['identity','transactional'].includes(c.category);states.set(c.id,alternate||bypass?'degraded':'unavailable');reasons.set(c.id,alternate?'Alternate domain declared; continuity remains an assumption.':bypass?'A safe bypass is declared; degraded behaviour needs evidence.':raw.mode==='domain'?'Shares the failed domain '+failed.failureDomain+'.':'The entire selected capability is unavailable.');}
 const precedence={degraded:1,unavailable:2};
 // The critical prerequisites and the supports of each need are read once per simulation (round 5, R5-G).
 const critical=p.technology.dependencies.filter(d=>d.critical&&['dependency','trust'].includes(d.type)),supported=groupBy(p.technology.mappings,m=>m.needId);
 for(let i=0;i<capabilities(p).length;i++){let more=false;for(const d of critical){const state=states.get(d.to);if(state&&(!states.has(d.from)||precedence[state]>precedence[states.get(d.from)])){states.set(d.from,state);reasons.set(d.from,'Requires '+(capability(p,d.to)?.title||d.to)+' through '+d.id+'.');more=true}}if(!more)break;}
 const applications=[];
 // Round 12 (GR-RUN-08): what the loss does to an application is what its needs state: an essential need takes the
 // state of its capability, a need it can run degraded without degrades it, and a need whose consequence nobody stated
 // is "not stated" (an unstated value counts as nothing), never degraded. The application takes the worst stated
 // consequence of its needs, else "not stated".
 for(const a of components(p)){const affected=needsFor(p,a.id).flatMap(n=>(supported.get(n.id)||[]).filter(m=>states.has(m.capabilityId)).map(m=>({need:n,mapping:m,state:states.get(m.capabilityId)})));if(!affected.length)continue;const out=affected.map(x=>consequenceOf(x.need,x.state));applications.push({id:a.id,ref:a.ref,title:a.title,state:out.includes('unavailable')?'unavailable':out.includes('degraded')?'degraded':CONSEQUENCE_NOT_STATED,needs:affected.map((x,i)=>({id:x.need.id,description:x.need.description,capabilityId:x.mapping.capabilityId,criticality:x.need.criticality,consequence:out[i]}))});}
 const sources=[...applications.flatMap(a=>componentSources(p,a.id).drivers),...technologySources(p,failed.id).drivers],drivers=[...new Map(sources.map(d=>[d.id,d])).values()];
 const measurements=Array.isArray(raw.measurements)?raw.measurements:[];
 if(new Set(measurements.map(m=>m.driverId)).size!==measurements.length||measurements.some(m=>!drivers.some(d=>d.id===m.driverId)))throw Error('Use each affected quality driver once.');
 const assessments=drivers.map(d=>{const edit=measurements.find(m=>m.driverId===d.id),factor=timeFactor(d.unit);let value=edit?clean(String(edit.value??''),40):'',basis=edit?clean(edit.basis):'';
  if(!edit&&d.category==='recoverability'&&factor&&applications.some(a=>a.state==='unavailable')){value=String(duration*60/factor);basis='Assume investigation is blocked until the failed support is restored; review whether this matches the scenario conditions.';}
  let result='unassessed';if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))throw Error('Simulated measurements must be non-negative numbers.');
  if(value!==''&&!basis)throw Error('Explain the basis for each assumed quality value.');
  if(value!==''&&targetIsMeasurable(d)){const v=Number(value),target=Number(d.targetValue),met=d.operator==='At most'?v<=target:d.operator==='At least'?v>=target:v===target;result=met?'met-assumption':'unmet-assumption';}
  return {driverId:d.id,title:d.title,metric:d.metric,target:targetText(d),targetConfirmed:d.targetConfirmed,unit:d.unit,value,basis,result};
 });
 return {capabilityId:failed.id,mode:raw.mode,durationMinutes:duration,failedDomain:raw.mode==='domain'?failed.failureDomain:null,capabilities:[...states].map(([id,state])=>({id,title:capability(p,id)?.title,state,reason:reasons.get(id)})),applications,assessments,simulated:true};
}
export function applyTechnologyCommand(input,command,at=new Date().toISOString()){
 const p=withTechnology(input),t=p.technology,raw=command.payload||{};let selected=null,changed=true;
 switch(command.type){
  case 'technology.needs':changed=saveNeeds(p,raw);selected=raw.applicationId;break;
  case 'technology.capability':{const old=raw.id?capability(p,raw.id):null,c=saveCapability(p,raw,at);changed=c!==old;selected=c.id;break;}
  case 'technology.dependency':{const old=raw.id?t.dependencies.find(d=>d.id===raw.id):null,d=saveDependency(p,raw);changed=d!==old;selected=d.from;break;}
  case 'technology.remove-dependency':if(!t.dependencies.some(d=>d.id===raw.id))throw Error('This dependency no longer exists.');t.dependencies=t.dependencies.filter(d=>d.id!==raw.id);break;
  case 'technology.boundary':{const old=raw.id?t.boundaries.find(b=>b.id===raw.id):null,b=saveBoundary(p,raw);changed=b!==old;selected=b.id;break;}
  case 'technology.proposal':{if(raw.reviewed!==true)throw Error('Review the proposed capability, mappings, and dependencies before acceptance.');const prop=technologyProposal(p,raw.key,raw.objectId,raw.needId);if(!prop)throw Error('This proposal is no longer needed. Review the current model.');const c=saveCapability(p,{...raw.record,id:prop.record.id,origin:'suggestion',status:'candidate',mappings:raw.mappings||prop.mappings},at);for(const d of prop.dependencies)saveDependency(p,d);selected=c.id;break;}
  case 'technology.intake':changed=false;t.intake={at,stamp:intakeStamp(p),applicationHandoffCurrent:realisationHandoffCurrent(p)};break;
  case 'technology.simulation':{changed=false;if(raw.reviewed!==true||![0,1,2,3].every(i=>raw.visited?.includes(i)))throw Error('Walk through failure, propagation, target review, and recovery before recording.');const result=simulateTechnology(p,raw);t.simulations=[...t.simulations,{...result,id:'TS-'+crypto.randomUUID(),at,stamp:technologyStamp(p)}].slice(-20);selected=result.capabilityId;break;}
  case 'technology.review':changed=false;t.review={at,stamp:technologyStamp(p),findings:technologyFindings(p).length};break;
  case 'technology.handoff':{changed=false;if(!technologyReviewCurrent(p))throw Error('Run checks on the current technology model first.');const fs=technologyFindings(p);if(fs.length&&raw.acknowledge!==true)throw Error('Acknowledge the findings and assumptions that travel to Chapter 7.');t.handoff={at,stamp:technologyStamp(p),capabilityRefs:capabilities(p).map(c=>c.ref),needIds:t.needs.map(n=>n.id),mappingIds:t.mappings.map(m=>m.id),applicationRefs:components(p).map(a=>a.ref),findings:fs};break;}
  default:throw Error('Unknown technology action.');
 }
 if(changed){t.version++;t.review=null;t.handoff=null;}return {document:p,selected};
}
// What only Chapter 6 knows of the one lifecycle family (record-lifecycle.js; round 12, GR-GOV-23). A need AIW proposed is
// kept confirmed against its application as it is now, and it leaves with its support mappings (DEPENDENTS); one whose
// application is gone does not come back. A trust boundary a new project started with is AIW's proposal until kept, and
// one an application's trust boundary names stays until the application lets go of it. A dismissed need is never
// proposed again: its application stays known.
export const TECHNOLOGY_LIFECYCLE=Object.freeze({
 'technology.needs':{seed:(p,n)=>needIsSeed(p,n),keep:(p,n,at)=>{n.confirmed=false;n.keptAt=at;n.sourceSnapshot=appSnapshot(p,n.applicationId);},canRestore:(p,n)=>{if(!component(p,n.applicationId))throw Error(n.id+' cannot come back: its application '+n.applicationId+' is no longer in the design.');}},
 'technology.boundaries':{seed:(p,b)=>isProposed(b),namedBy:(p,b)=>Object.entries(p.technology?.applicationBoundaries||{}).filter(([,id])=>id===b.id).map(([id])=>'Chapter 6 · the trust boundary of '+(component(p,id)?.ref||id))}
});
// The chapter's export reads its records in one pass (document-memo.js), so its lookups read one index (round 5).
export function exportTechnologyMarkdown(p){return memoPass(p,()=>exportTechnologyMarkdownOf(p));}
function exportTechnologyMarkdownOf(p){const t=p.technology,g=logicalGraph(p),byId=firstById(g.nodes),label=id=>byId.get(id)?.title||id,fs=technologyFindings(p);return '# AIW V5 · Logical technology\n\n'+p.name+' · Working architecture, pending review.\n\nVendor-neutral capabilities; products, sizing, and deployment choices remain for Chapter 7. Guidance is rule-based. Simulations and their numerical outcomes are assumptions, not runtime evidence.\n\n## Application needs\n\n'+t.needs.map(n=>'- '+n.id+' · '+component(p,n.applicationId)?.ref+' · '+categoryName(n.category)+' · '+said(n.criticality)+' · '+(needIsSeed(p,n)?'Proposed by AIW, not decided':n.confirmed&&!needChanged(p,n)?'Reviewed':'Needs review')+'\n  '+n.description).join('\n')+'\n\n## Logical technology register\n\n'+capabilities(p).map(c=>{const s=technologySources(p,c.id);return '### '+c.ref+' · '+c.title+'\n\n'+c.category+' · Revision '+c.revision+' · '+c.status+' · '+c.origin+'\n\nPurpose: '+c.purpose+'\n\nOwned boundary: '+c.boundary+'\n\nOwner: '+c.owner+'\n\nRationale: '+c.rationale+'\n\nSource: '+c.source+(capabilityChanged(p,c)?' · INPUTS CHANGED':'')+'\n\nApplications: '+s.applications.map(a=>a.ref).join(', ')+'\n\nQuality drivers: '+s.drivers.map(d=>d.id+' '+targetText(d)+(d.targetConfirmed?'':' (assumption)')).join('; ')+'\n\nDecisions: '+s.decisions.map(d=>d.id+' · '+(decisionCurrent(p,d)?'Architect accepted':'Review needed')+' · '+governanceLabel(d,p)).join('; ')+'\n\nTrust boundary: '+label(c.boundaryId)+'\n\nFailure domain: '+c.failureDomain+' · Alternate: '+c.alternateDomain+'\n\nContinuity: '+said(c.continuity)+' · '+c.continuityPlan+'\n\nRecovery: '+c.recoveryPlan+' · Owner: '+c.recoveryOwner+'\n\nRecovery time: '+(c.recoveryMinutes||'Unspecified')+' minutes · Data loss: '+(c.lossMinutes===''?'Unspecified':c.lossMinutes)+' minutes · '+(c.targetsConfirmed?'Targets confirmed':'Targets are assumptions')+'\n\nAssumptions: '+c.assumptions+'\n\n';}).join('')+'## Support mappings\n\nAll mapped capabilities are required for a need. Alternate paths are declared in the capability’s continuity arrangement.\n\n'+t.mappings.map(m=>'- '+m.id+' · '+m.needId+' → '+capability(p,m.capabilityId)?.ref+' · '+m.scope).join('\n')+'\n\n## Dependencies and trust\n\n'+t.dependencies.map(d=>'- '+d.id+' · '+label(d.from)+' → '+label(d.to)+' · '+d.type+' · '+d.label+' · '+(d.critical?'Critical prerequisite':'No automatic failure propagation')+'\n  '+d.policy).join('\n')+'\n\n'+t.boundaries.map(b=>'- '+b.ref+' · '+b.title+' · '+said(b.owner)+' · '+said(b.policy)+(isProposed(b)?' · Proposed by AIW, not decided':'')).join('\n')+'\n\n## Failure simulations\n\n'+(t.simulations.map(s=>'- '+s.at+' · '+s.mode+' · '+label(s.capabilityId)+' · '+s.durationMinutes+' minutes · '+(s.withdrawn?'Withdrawn observation':simulationCurrent(p,s)?'Current model':'Earlier model')+'\n  Affected: '+s.applications.map(a=>a.ref+' '+(a.state===CONSEQUENCE_NOT_STATED?'not stated':a.state)).join(', ')+'\n  '+s.assessments.map(a=>a.driverId+': '+a.result+'; assumed '+a.value+' '+a.unit+'; '+a.basis).join('\n  ')).join('\n')||'No simulation reviews recorded.')+'\n\n## Open findings\n\n'+fs.map(f=>'- '+f.level.toUpperCase()+' · '+f.title+': '+f.detail).join('\n')+'\n\n## Chapter 7 handoff\n\n'+(technologyHandoffCurrent(p)?'Current saved handoff':'Working preview; handoff needs review')+'\n\nCapability references: '+capabilities(p).map(c=>c.ref).join(', ')+'\n\nRetain logical capability identity when selecting and comparing real technologies. Open assumptions and findings remain attached.\n';}
