// The upgrade of a document whose records keep copies of what they read (round 12, D-04; source-fingerprint.js). It runs
// on read, at the end of withFinalReview, and the next save stores its result; a document already upgraded passes through
// untouched. Pure and deterministic: the same document always upgrades to the same document. The server registers it
// (worker.js imports this module); the browser only ever receives documents the server has read, so its bundles carry
// none of it, and the comparisons read a copy as its fingerprint wherever a document has not been upgraded.
//
// It converts every kept reading (a record's sourceSnapshot, a conflict's driverSnapshot), in the records and in the
// copies of records other records keep (a design task's basis, a staged change's targets, a reversal's sections), into
// the fingerprint the same reading has now. Every source-change judgement is the same after it as before.
//
// Stamps are fingerprints of records and of the design, and a record that kept a copy now keeps a fingerprint, so a stamp
// taken now differs from the same stamp taken of the copy. A stored stamp that was current before the upgrade is made
// current after it: each stamp is taken of the document before and after the conversion, and a stored value equal to
// the first becomes the second; a stored value that was not current stays as it was, and stays not current. In reading
// order: Chapter 6's needs and capabilities and Chapter 7's realisations (each reads the one before); then what reads
// records (change targets, Sol's model sources, the working basis, a reasoning context, a guide session's basis, a
// quality analysis, a reversal receipt); then what reads the whole design (the review stamps, the findings' stamps, an
// action's verification, an architecture case's review basis). A frozen baseline is never changed: its stamps are
// answered through the aliases kept in finalReview.readingsUpgrade (review-domain.js baselineCurrent, baselineChanges).
//
// Readings definition 2 (round 12, UX-02): a reading reads a record's content, not its review state (source-fingerprint.js
// readContent). A document whose readings were taken of whole records (definition 1: D-04 as first written, and every
// document the copies above convert to) is upgraded the same way, by the same rule: each reading and each stamp is taken
// under definition 1 and under definition 2, level by level in reading order, and a kept value that was current under
// the first becomes the current value under the second; one that was not stays as it was. The document then says it is
// at the current definition (readingsDefinition) and passes through untouched.
//
// Readings definition 3 (round 12, GR-STO-08): a Chapter 7 realization reads the records behind its capabilities one by
// one, and a design task's security basis the readings of its threat and control, where each read the versions of
// whole chapters; they are upgraded by the same rule (a document is taken under the definition it was written at and
// under the current one). And a Chapter 8-10 record whose reading was kept as the versions of the chapters it reads
// (before D4) and was current now keeps its reading of the records it reads; one that was not stays as it was.
//
// Design fingerprint 2 (rc42, D14): the stamps of the whole design (review-domain.js reviewSourceStamp) leave out the
// evidence recorded about it. A document whose stamps were taken under fingerprint 1 (finalReview.designFingerprint not
// set, stamps kept) has its readings converted under fingerprint 1, then its stamps of the whole design carried over by
// the same rule (toDesignFingerprint), and says it is at fingerprint 2.
import {withReadingsDefinition,READINGS_DEFINITION,recordStamp,driverStamp,isFingerprint} from './source-fingerprint.js';
import {interfaceReading,inputStamp as interfaceInputStamp} from './interfaces-domain.js';
import {securityReading,securityInputStamp} from './security-domain.js';
import {runtimeReading,runtimeInputStamp} from './runtime-domain.js';
import {securityBasisReading} from './design-basis.js';
// The conversion of copies, registered with source-fingerprint.js when loaded (server only).
import {isCopy,readingOf} from './reading-copies.js';
import {documentClone,memoPass} from './document-memo.js';
import {changeTargetStamp,changeFingerprint} from './changes-domain.js';
import {appSnapshot,capabilitySnapshot,intakeStamp} from './technology-domain.js';
import {inputSnapshot} from './technology-realisation-domain.js';
import {reviewFingerprint,designFingerprint,computeChapterStamps,inheritedFindings,legacyStampOf,actionDefinition,registerReadingsUpgrade,DESIGN_FINGERPRINT,withDesignFingerprint,withLibraryLogAsDesign,evidenceStamp,withFinalReview} from './review-domain.js';
import {currentResponsibilityReading} from './logical-domain.js';
import {currentComponentReading} from './realisation-domain.js';
import {workingBasis,guideBasis} from './guidance-record.js';
import {journeyIndex} from './journey-context.js';
import {brainContext} from './aiw-brain.js';
import {analysisModelStamp} from './quality-analysis.js';
import {reversalBasis} from './model-reversal.js';
import {architectureCases,caseReviewBasis} from './architecture-case.js';
import {digest} from './brain-integrity.js';
import {templateEvidence} from '../shared/projects-domain.js';
import {upgradeOwnership} from './ownership-upgrade.js';
import {upgradeExtensions} from './design-extension-parts.js';

const list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const READINGS=new Set(['sourceSnapshot','driverSnapshot']);

// Whether a document keeps copies: a quick look at the records that read others (the upgrade converts them all at once).
const keepsCopies=p=>list(p?.quality?.drivers).some(d=>isCopy(d.sourceSnapshot))||list(p?.quality?.conflicts).some(c=>isCopy(c.driverSnapshot,'driverSnapshot'))||list(p?.decisions?.records).some(d=>isCopy(d.sourceSnapshot))||list(p?.logical?.responsibilities).some(r=>isCopy(r.sourceSnapshot))||list(p?.realisation?.components).some(c=>isCopy(c.sourceSnapshot));
// Whether anything in a document keeps a reading or a stamp of records (a document that keeps none is at any definition).
const keepsReadings=p=>list(p?.quality?.drivers).length>0||list(p?.decisions?.records).length>0||list(p?.logical?.responsibilities).length>0||list(p?.realisation?.components).length>0||list(p?.technology?.needs).length>0||list(p?.technologyRealisation?.records).length>0||list(p?.changes?.events).some(e=>list(e?.items).length>0)||list(p?.interfaces?.contracts).length>0||list(p?.interfaces?.data).length>0||list(p?.security?.threats).length>0||list(p?.security?.controls).length>0||list(p?.runtime?.plans).length>0||list(p?.runtime?.paths).length>0||list(p?.coauthoring?.designTasks).length>0;
export const readingsDefinitionOf=p=>Number.isInteger(p?.readingsDefinition)?p.readingsDefinition:1;
const readingsDue=p=>keepsCopies(p)||readingsDefinitionOf(p)<READINGS_DEFINITION&&keepsReadings(p);
// The design fingerprint a document's stamps were taken under (rc42, D14): the one its review names; one that names none
// was written before versions (fingerprint 1), unless it keeps no stamp of the design, which reads alike under any.
const keepsDesignStamps=m=>!!(m.intake||m.checks||m.narrative?.sourceStamp||['reviews','baselines','actions','traces','dispositions'].some(k=>list(m[k]).length));
export const designFingerprintOf=p=>{const m=p?.finalReview;return !plain(m)?DESIGN_FINGERPRINT:Number.isInteger(m.designFingerprint)?m.designFingerprint:keepsDesignStamps(m)?1:DESIGN_FINGERPRINT;};
// (rc44, S0-w3-stamps; ruling Y2) A knowledge library whose stamps of the whole design were taken while its log was
// design (before this build): carried over once (toLibraryLog), then marked (finalReview.libraryLogUpgrade).
const libraryLogDue=p=>p?.knowledge?.library?.enabled===true&&plain(p.finalReview)&&!p.finalReview.libraryLogUpgrade&&keepsDesignStamps(p.finalReview);
// (the fix-up of S0-w3-stamps, must-fix 4; rulings X4 and Y2) A document stored before this build holds the knowledge
// package's steps in the package's records only: they were quiet (no line in the family's log), and the history panel
// joined them from the project activity, which is retired. Each step its records keep, who took it and when (a row's
// proposals and edits, its review, a person's confirmation, its retirement; a pin, a repin, an unpin; a link and its
// retirement; a migration's proposals and edits and a person's confirmation), is one line of the log naming the package,
// written once, at the first read, as the step would have written it; a step moved aside by an import names nobody and
// writes none. Due while the document holds such a step and no line names the package.
const PACKAGE='p10-knowledge',str=v=>typeof v==='string'?v:'';
function packageSteps(k){
 const out=[],line=(type,id,x,reason,reviewer='')=>{if(plain(x)&&typeof x.at==='string'&&typeof x.actor==='string'&&x.actor)out.push({at:x.at,actor:x.actor,type:'knowledge.'+type,id,reason:str(reason),reviewer:str(reviewer),package:PACKAGE});};
 const confirmed=(type,x)=>{const c=x.provenance?.reviewed;if(x.confirmed===true&&c?.how==='confirmed')line(type,x.id,{at:c.at,actor:c.by},'');};
 const repins=new Map(list(k.conceptMigrations).filter(m=>plain(m?.review)&&m.review.pinId).map(m=>[m.review.pinId,m.review]));
 for(const x of list(k.crosswalk).filter(plain)){for(const h of list(x.history))line('crosswalk',x.id,h,h?.change);if(plain(x.review))line('crosswalk-review',x.id,x.review,x.review.reason,x.review.reviewer);confirmed('crosswalk-confirm',x);if(plain(x.retired))line('crosswalk-retire',x.id,x.retired,x.retired.reason,x.retired.reviewer);}
 for(const x of list(k.conceptPins).filter(plain))for(const h of list(x.history)){const r=repins.get(x.id);if(h?.change==='Pinned')line(r?'concept-repin':'concept-pin',x.id,h,(r||x).reason,(r||x).reviewer);else if(h?.change==='Retired')line('concept-unpin',x.id,h,x.retired?.reason,x.retired?.reviewer);}
 for(const x of list(k.conceptLinks).filter(plain)){line('concept-link',x.id,x,x.reason,x.reviewer);if(plain(x.retired))line('concept-unlink',x.id,x.retired,x.retired.reason,x.retired.reviewer);}
 for(const x of list(k.conceptMigrations).filter(plain)){for(const h of list(x.history))line('concept-migration',x.id,h,h?.change);confirmed('concept-migration-confirm',x);}
 return out;
}
const packageRecords=k=>['crosswalk','conceptPins','conceptLinks','conceptMigrations'].some(key=>list(k?.[key]).length);
const packageLinesDue=p=>plain(p?.knowledge)&&packageRecords(p.knowledge)&&!list(p.knowledge.history).some(h=>h?.package)&&packageSteps(p.knowledge).length>0;
// The lines, by time, each after the lines that stand at its time; the version moves by as many (review-domain.js
// designOf: in a design project they are bookkeeping, in a library the log is evidence).
function withPackageLines(q){
 const k=q.knowledge,steps=packageSteps(k).sort((a,b)=>a.at.localeCompare(b.at)),had=list(k.history),out=[];let i=0;
 for(const x of had){while(i<steps.length&&steps[i].at<String(x?.at))out.push(steps[i++]);out.push(x);}
 out.push(...steps.slice(i));k.history=out;k.version=(Number.isInteger(k.version)?k.version:had.length)+steps.length;
 return q;
}
export function needsReadingsUpgrade(p){
 return readingsDue(p)||designFingerprintOf(p)<DESIGN_FINGERPRINT||libraryLogDue(p)||packageLinesDue(p);
}
// Every value of a part of the document, depth first, except the frozen baselines (finalReview.baselines). fn(value,
// holder, key) answers what to descend into (a falsy answer: nothing).
function visit(p,root,fn){
 const stack=[root],seen=new Set();
 while(stack.length){
  const o=stack.pop();if(!o||typeof o!=='object'||seen.has(o))continue;seen.add(o);
  if(Array.isArray(o)){for(let i=0;i<o.length;i++){const v=fn(o[i],o,i);if(v&&typeof v==='object')stack.push(v);}continue;}
  for(const k of Object.keys(o)){if(o===p.finalReview&&k==='baselines')continue;const v=fn(o[k],o,k);if(v&&typeof v==='object')stack.push(v);}
 }
}
// Every string equal to a stamp that was current, in a part of the document, becomes that stamp taken again.
function translate(p,root,map){if(map.size&&root)visit(p,root,(v,o,k)=>{if(typeof v==='string'){if(map.has(v))o[k]=map.get(v);return null;}return v;});map.clear();}
const record=(map,before,after)=>{if(typeof before==='string'&&typeof after==='string'&&before!==after)map.set(before,after);};
// What was stamped, found in the document: the change targets the journal and the proposals name, the model records
// Sol's sources name, the reasoning contexts of narratives and generations, and whether a reversal receipt exists.
function stamped(p){
 const targets=new Map(),models=new Set(),contexts=new Map();let reversal=false;
 visit(p,p,v=>{
  if(plain(v)){
   if(typeof v.key==='string'&&Number.isInteger(v.chapter)&&typeof v.id==='string'&&(typeof v.capturedStamp==='string'||Array.isArray(v.reviews)))targets.set(v.chapter+':'+v.id,{chapter:v.chapter,id:v.id});
   if(v.kind==='model'&&typeof v.objectId==='string'&&typeof v.versionStamp==='string')models.add(v.objectId);
   if(plain(v.context)&&typeof v.context.id==='string'&&typeof v.basisStamp==='string')contexts.set(JSON.stringify(v.context),v.context);
   if(typeof v.afterStamp==='string')reversal=true;
  }
  return v;
 });
 return {targets:[...targets.values()],models:[...models],contexts:[...contexts.entries()],reversal};
}
// The stamps of records, taken of one document in one pass (nothing changes it meanwhile).
function recordStamps(p,what){
 return memoPass(p,()=>{
  const out=new Map(),index=what.models.length?journeyIndex(p):null;
  for(const t of what.targets)out.set('target:'+t.chapter+':'+t.id,changeTargetStamp(p,t));
  for(const id of what.models){const n=index.nodes.get(id);out.set('model:'+id,changeFingerprint(n?.record||n||null));}
  out.set('basis',workingBasis(p));
  for(const [key,context] of what.contexts){try{out.set('context:'+key,brainContext(p,context).stamp);}catch{/* a context that no longer reads stays as it was */}}
  for(const s of list(p.guidance?.sessions))if(typeof s.basis==='string')out.set('guide:'+s.chapter+'|'+s.objectId,guideBasis(p,s.chapter,s.objectId==='project'?undefined:s.objectId));
  for(const t of list(p.coauthoring?.designTasks))if(list(t.measurements).length){try{out.set('analysis:'+t.id,analysisModelStamp(p,t));}catch{/* as above */}}
  if(what.reversal)out.set('reversal',digest(reversalBasis(p)));
  return out;
 });
}
// The stamps of the whole design: its review fingerprint, its chapters', and both stamps of each finding a treatment
// names: its own (what a treatment recorded since round 12 keeps, D-06) and the whole design's (what one recorded before
// keeps; review-domain.js dispositionCurrent reads each by the treatment's basis).
const treatedFindingIds=p=>new Set(list(p.finalReview?.dispositions).flatMap(d=>d.scope==='cause'?list(d.findings).map(x=>x?.[0]):[d.findingId]).filter(id=>typeof id==='string'));
function designStamps(p,findingIds){
 const out={source:designFingerprint(p),chapters:computeChapterStamps(p),evidence:evidenceStamp(p),findings:new Map()};
 // Findings are kept per document object (review-domain.js): taken of a copy, so the document itself keeps none.
 if(findingIds.size){const copy=documentClone(p);for(const f of inheritedFindings(copy))if(findingIds.has(f.id))out.findings.set(f.id,[f.stamp,legacyStampOf(copy,f)]);}
 return out;
}
const recordFindings=(map,before,after)=>{for(const [id,b] of before){const a=after.get(id)||[];b.forEach((s,i)=>record(map,s,a[i]));}};
const caseStamps=p=>new Map(architectureCases(p).map(c=>[c.id,caseReviewBasis(p,c)]));

// The upgrade itself: the document when it needs none, else an upgraded copy of it (the input is left as it was). Copies
// become readings of whole records (definition 1, as D-04 wrote them), then readings of content (definition 2).
// Readings are converted under the design fingerprint the document's stamps were taken at, then the fingerprint upgraded.
export function upgradeReadings(p){
 if(!p||typeof p!=='object'||!needsReadingsUpgrade(p))return p;
 const fingerprint=designFingerprintOf(p),q=readingsDue(p)?withDesignFingerprint(fingerprint,()=>toCurrentReadings(p)):documentClone(p),r=fingerprint<DESIGN_FINGERPRINT?toDesignFingerprint(q):q;
 return libraryLogDue(r)?toLibraryLog(r):packageLinesDue(r)?toPackageLines(r):r;
}
// A library's log leaves its design (rc44, S0-w3-stamps; the lead's ruling Y2: in a knowledge library knowledge.history
// and knowledge.version are the family's log, review-domain.js designOf). The design is unchanged; only what its stamps
// of the whole design read. As for fingerprint 2 below: each stamp of the design, of its version and of each treated
// finding is taken with the log read as design and as the log, a stored value equal to the first (it was current)
// becomes the second, one that was not stays as it was; a frozen baseline is answered through the one alias table,
// chained through an earlier one. So a library stored before this build reads with the same findings, and its stamps move
// once, at its first read here. The stamps the upgrade read stay on record (finalReview.libraryLogUpgrade), which also
// says it is done.
function toLibraryLog(q){
 const findingIds=treatedFindingIds(q),before=withLibraryLogAsDesign(()=>designStamps(q,findingIds));
 // (the fix-up, must-fix 4: the package's steps of a library stored before this build are written into its log in the same
 // pass, so the stamps are carried over both at once)
 if(packageLinesDue(q))withPackageLines(q);
 const after=designStamps(q,findingIds);
 carry(q,before,after);
 q.finalReview.libraryLogUpgrade={design:{[after.source]:before.source}};
 return q;
}
// The package's lines alone (must-fix 4): in a design project they say nothing to either fingerprint; in a library whose
// log upgrade is done they are evidence, and the stamps it keeps are carried over them.
function toPackageLines(q){
 const library=q.knowledge?.library?.enabled===true&&plain(q.finalReview)&&keepsDesignStamps(q.finalReview),findingIds=library?treatedFindingIds(q):null,before=library?designStamps(q,findingIds):null;
 withPackageLines(q);
 if(library)carry(q,before,designStamps(q,findingIds));
 return q;
}
// The stamps of the whole design carried over a change that leaves the design as it was (toLibraryLog above, and the
// import's move of the record stamps below): a stored stamp of the design, of its version or of a treated finding equal
// to the one taken before (it was current) becomes the one taken after; a verification of an action that was current
// stays current; a frozen baseline, which is never changed, is answered through the one alias table, chained through an
// earlier one, for its chapters, its design stamp and (the fix-up of S0-w3-stamps, must-fix 3) the evidence it was
// frozen beside (review-domain.js designStampIs and baselineChanges). The table is written only when a stamp moved.
function carry(q,before,after){
 const m=q.finalReview,version=m.version,map=new Map();
 record(map,before.source,after.source);record(map,before.source+':'+version,after.source+':'+version);
 recordFindings(map,before.findings,after.findings);
 const verified=list(m.actions).map(a=>!!a.verification&&a.verification.stamp===reviewFingerprint(actionDefinition(a)));
 translate(q,m,map);
 list(m.actions).forEach((a,i)=>{if(verified[i])a.verification={...a.verification,stamp:reviewFingerprint(actionDefinition(a))};});
 if(list(m.baselines).length&&(before.source!==after.source||before.evidence!==after.evidence||Object.keys(before.chapters).some(id=>before.chapters[id]!==after.chapters[id]))){
  const old=m.readingsUpgrade,aliases={},evidence=old?.evidence?.[before.evidence]??before.evidence;for(const [id,b] of Object.entries(before.chapters)){const legacy=old?.chapters?.[id]?.[b]??b,a=after.chapters[id];if(a!==legacy||old?.chapters?.[id])aliases[id]={[a]:legacy};}
  m.readingsUpgrade={design:{[after.source]:old?.design?.[before.source]??before.source},chapters:aliases,...(after.evidence!==evidence?{evidence:{[after.evidence]:evidence}}:{})};
 }
}
// A recovery import moves every record stamp aside (the lead's ruling Z8: provenance.js keepImportedStamps, called by
// recovery-service.js). The design fingerprint reads a built-in record's provenance, so the move changes the stamps of
// the whole design though the design is as it was: they are carried over in the same pass (the fix-up of S0-w3-stamps,
// must-fix 2), each taken before and after the move of the document as a read gives it, under the reading its stamps were taken at (its design
// fingerprint, and a library's log as design when its log upgrade is still due). A document that keeps no stamp of the
// design, or whose stamps cannot be taken, is moved as it is. Answers what `move` answers (how many records it moved).
export function keepingDesignStamps(p,move){
 const m=p?.finalReview;if(!plain(m)||!keepsDesignStamps(m))return move(p);
 const findingIds=treatedFindingIds(p),version=designFingerprintOf(p),log=libraryLogDue(p),take=()=>{try{const q=withFinalReview(p,{upgrade:false}),f=()=>withDesignFingerprint(version,()=>designStamps(q,findingIds));return log?withLibraryLogAsDesign(f):f();}catch{return null;}};
 const before=take(),moved=move(p),after=before&&moved?take():null;
 if(after)carry(p,before,after);
 return moved;
}
function toCurrentReadings(p){
 const copies=keepsCopies(p),whole=copies?withReadingsDefinition(1,()=>convertCopies(p)):p,from=copies?1:readingsDefinitionOf(p);
 const q=from<READINGS_DEFINITION?withReadingsDefinition(READINGS_DEFINITION,()=>toReadings(whole,from)):whole===p?documentClone(p):whole;
 q.readingsDefinition=READINGS_DEFINITION;
 return q;
}
// Design fingerprint 1 → 2 (rc42, D14: the design fingerprint leaves the evidence recorded about the design out). The
// document's design is unchanged; only what its stamps of the whole design read. Each stamp of the design, of its
// version, and of each treated finding is taken under fingerprint 1 and under 2: a stored value equal to the first (it was
// current) becomes the second, one that was not stays as it was, and stays not current, so no review, baseline or
// approval turns current or stale by the upgrade. A frozen baseline is never changed (its stamps are covered by its
// SHA-256): it is answered, while the design is unchanged, through the one alias table (finalReview.readingsUpgrade,
// review-domain.js designStampIs and baselineChanges), keyed by the current stamps and chained through the aliases an
// earlier readings upgrade left, as toReadings chains them, so that a later readings upgrade chains through it too. The
// fingerprint-1 stamps the upgrade read, and the alias table it replaced, stay on record for audit
// (finalReview.designFingerprintUpgrade).
function toDesignFingerprint(q){
 const m=q.finalReview;if(!m||typeof m!=='object')return q;
 const findingIds=treatedFindingIds(q),before=withDesignFingerprint(1,()=>designStamps(q,findingIds)),version=m.version,map=new Map();
 // A document whose own records say it is the reference and that names no template is stamped as the reference by the
 // storage upgrade this one triggers (storage-upgrade.js, GR-DOM-15), which reads it as it read: stamped here first, so
 // the stamps carried over are those of the document as it is stored, and the stamping never makes them stale.
 if(!q.workspace?.template&&templateEvidence(q)==='bank-payment')q.workspace={...(q.workspace||{}),template:'bank-payment'};
 const after=designStamps(q,findingIds);
 record(map,before.source,after.source);record(map,before.source+':'+version,after.source+':'+version);
 recordFindings(map,before.findings,after.findings);
 // A verification reads its action's definition, which names the design stamp the action was defined against.
 const verified=list(m.actions).map(a=>!!a.verification&&a.verification.stamp===reviewFingerprint(actionDefinition(a)));
 translate(q,m,map);
 list(m.actions).forEach((a,i)=>{if(verified[i])a.verification={...a.verification,stamp:reviewFingerprint(actionDefinition(a))};});
 const old=m.readingsUpgrade,chapters={};for(const [id,b] of Object.entries(before.chapters))if(after.chapters[id]!==b)chapters[id]={[after.chapters[id]]:b};
 m.designFingerprintUpgrade={from:1,design:{[after.source]:before.source},chapters,...(old?{readingsUpgrade:old}:{})};
 if(list(m.baselines).length){
  const aliases={};for(const [id,b] of Object.entries(before.chapters)){const legacy=old?.chapters?.[id]?.[b]??b,a=after.chapters[id];if(a!==legacy||old?.chapters?.[id])aliases[id]={[a]:legacy};}
  m.readingsUpgrade={design:{[after.source]:old?.design?.[before.source]??before.source},chapters:aliases,...(old?.evidence?{evidence:old.evidence}:{})};
 }
 m.designFingerprint=DESIGN_FINGERPRINT;
 return q;
}
function convertCopies(p){
 const legacy=p,q=documentClone(p),what=stamped(legacy),findingIds=treatedFindingIds(legacy),map=new Map();
 // Before: Chapter 6 and 7's readings, the record stamps and the design stamps, all of the document as it was.
 const tech=memoPass(legacy,()=>({needs:list(legacy.technology?.needs).map(n=>appSnapshot(legacy,n.applicationId)),capabilities:list(legacy.technology?.capabilities).map(c=>capabilitySnapshot(legacy,c)),intake:legacy.technology?intakeStamp(legacy):null,realizations:list(legacy.technologyRealisation?.records).map(r=>inputSnapshot(legacy,r))}));
 const recordsBefore=recordStamps(legacy,what),designBefore=designStamps(legacy,findingIds),casesBefore=legacy.finalReview?caseStamps(legacy):new Map();
 // The readings, converted.
 visit(q,q,(v,o,k)=>{if(READINGS.has(k)&&!Array.isArray(o)){const r=readingOf(v,k);if(r!==v)o[k]=r;return null;}return v;});
 // Chapter 6 and 7, in reading order: a capability reads its needs' state, a realisation its capabilities' readings.
 // Each step is taken in a pass of its own (its readings are indexed once) and kept before the next reads it.
 if(q.technology){
  const needs=list(q.technology.needs),now=memoPass(q,()=>({needs:needs.map(n=>appSnapshot(q,n.applicationId)),intake:intakeStamp(q)}));
  needs.forEach((n,i)=>{record(map,tech.needs[i],now.needs[i]);if(n.sourceSnapshot===tech.needs[i])n.sourceSnapshot=now.needs[i];});
  record(map,tech.intake,now.intake);
  const capabilities=list(q.technology.capabilities),caps=memoPass(q,()=>capabilities.map(c=>capabilitySnapshot(q,c)));
  capabilities.forEach((c,i)=>{record(map,tech.capabilities[i],caps[i]);if(c.sourceSnapshot===tech.capabilities[i])c.sourceSnapshot=caps[i];});
 }
 if(q.technologyRealisation)memoPass(q,()=>list(q.technologyRealisation.records).map(r=>inputSnapshot(q,r))).forEach((now,i)=>record(map,tech.realizations[i],now));
 translate(q,q,map);
 // What reads records.
 const recordsAfter=recordStamps(q,what);
 for(const [key,before] of recordsBefore)record(map,before,recordsAfter.get(key));
 translate(q,q,map);
 // What reads the whole design: the review stamps live in finalReview, which the design fingerprint leaves out.
 const m=q.finalReview;if(!m)return q;
 const designAfter=designStamps(q,findingIds),version=m.version;
 record(map,designBefore.source,designAfter.source);record(map,designBefore.source+':'+version,designAfter.source+':'+version);
 recordFindings(map,designBefore.findings,designAfter.findings);
 const verified=list(m.actions).map(a=>!!a.verification&&a.verification.stamp===reviewFingerprint(actionDefinition(a)));
 translate(q,m,map);
 list(m.actions).forEach((a,i)=>{if(verified[i])a.verification={...a.verification,stamp:reviewFingerprint(actionDefinition(a))};});
 // A frozen baseline keeps the stamps it was frozen with; the design and chapter stamps of the moment of the upgrade
 // answer for them while the design stays as it was.
 if(list(m.baselines).length){
  const chapters={};for(const [id,before] of Object.entries(designBefore.chapters))if(designAfter.chapters[id]!==before)chapters[id]={[designAfter.chapters[id]]:before};
  m.readingsUpgrade={design:{[designAfter.source]:designBefore.source},chapters};
 }
 // An architecture case's review basis reads the design stamp and the current baseline.
 const casesAfter=casesBefore.size?caseStamps(documentClone(q)):new Map();
 for(const [id,before] of casesBefore)record(map,before,casesAfter.get(id));
 translate(q,m,map);
 return q;
}
// Readings of an earlier definition (`from`: 1, whole records; 2, content with whole-chapter readings in Chapter 7 and a
// security basis) → readings of the current definition: a copy of the document, every kept reading and stamp that was
// current kept current. Before: every reading and stamp of the document as written, under its definition. Then, level by
// level in reading order and each in a pass of its own after the level before it is kept, the same under the current
// definition: the requirements and drivers a reading names, the responsibilities, the components, Chapter 6's needs,
// intake and capabilities, Chapter 7's realisations, the Chapter 8-10 readings kept as versions and the security bases;
// then what reads records and what reads the whole design, as the conversion of copies does. Frozen baselines keep
// their stamps, answered through the aliases.
const stampOrNull=fn=>{try{return fn();}catch{return null;}};
function toReadings(legacy,from){
 const q=documentClone(legacy),what=stamped(legacy),findingIds=treatedFindingIds(legacy),map=new Map();
 // The document says its definition before anything is taken of it under that definition.
 q.readingsDefinition=READINGS_DEFINITION;
 const before=withReadingsDefinition(from,()=>({
  chapters:{interfaces:stampOrNull(()=>interfaceInputStamp(legacy)),security:stampOrNull(()=>securityInputStamp(legacy)),runtime:stampOrNull(()=>runtimeInputStamp(legacy))},
  artefacts:memoPass(legacy,()=>new Map(list(legacy.artefacts).map(a=>[a.id,recordStamp(legacy,a)]))),
  drivers:memoPass(legacy,()=>new Map(list(legacy.quality?.drivers).map(d=>[d.id,driverStamp(legacy,d)]))),
  responsibilities:memoPass(legacy,()=>list(legacy.logical?.responsibilities).map(r=>currentResponsibilityReading(legacy,r))),
  components:memoPass(legacy,()=>list(legacy.realisation?.components).map(c=>currentComponentReading(legacy,c))),
  tech:memoPass(legacy,()=>({needs:list(legacy.technology?.needs).map(n=>appSnapshot(legacy,n.applicationId)),capabilities:list(legacy.technology?.capabilities).map(c=>capabilitySnapshot(legacy,c)),intake:legacy.technology?intakeStamp(legacy):null,realizations:list(legacy.technologyRealisation?.records).map(r=>inputSnapshot(legacy,r))})),
  records:recordStamps(legacy,what),design:designStamps(legacy,findingIds),cases:legacy.finalReview?caseStamps(legacy):new Map()
 }));
 const level=(compute,pairs)=>{const now=memoPass(q,compute);pairs(now);translate(q,q,map);};
 // The requirements (and any record a reading names by id) and the drivers, wherever a driver, a conflict, a decision
 // keeps their fingerprints; then the responsibilities and the components, each one fingerprint.
 level(()=>new Map(list(q.artefacts).map(a=>[a.id,recordStamp(q,a)])),now=>{for(const [id,v] of now)record(map,before.artefacts.get(id),v);});
 level(()=>new Map(list(q.quality?.drivers).map(d=>[d.id,driverStamp(q,d)])),now=>{for(const [id,v] of now)record(map,before.drivers.get(id),v);});
 level(()=>list(q.logical?.responsibilities).map(r=>currentResponsibilityReading(q,r)),now=>now.forEach((v,i)=>record(map,before.responsibilities[i],v)));
 level(()=>list(q.realisation?.components).map(c=>currentComponentReading(q,c)),now=>now.forEach((v,i)=>record(map,before.components[i],v)));
 // Chapter 6 and 7, in reading order (a capability reads its needs' state, a realisation its capabilities' readings).
 if(q.technology){
  level(()=>({needs:list(q.technology.needs).map(n=>appSnapshot(q,n.applicationId)),intake:intakeStamp(q)}),now=>{now.needs.forEach((v,i)=>record(map,before.tech.needs[i],v));record(map,before.tech.intake,now.intake);});
  level(()=>list(q.technology.capabilities).map(c=>capabilitySnapshot(q,c)),now=>now.forEach((v,i)=>record(map,before.tech.capabilities[i],v)));
 }
 if(q.technologyRealisation)level(()=>list(q.technologyRealisation.records).map(r=>inputSnapshot(q,r)),now=>now.forEach((v,i)=>record(map,before.tech.realizations[i],v)));
 // Chapters 8-10: a reading kept as the versions of the chapters a record reads (before D4) and current becomes the
 // record's reading of the records it reads (each taken before any is kept: none reads another's reading).
 const kept=(r,stamp)=>stamp!=null&&typeof r?.sourceSnapshot==='string'&&!isFingerprint(r.sourceSnapshot)&&r.sourceSnapshot===stamp;
 level(()=>[...[...list(q.interfaces?.contracts),...list(q.interfaces?.data)].filter(r=>kept(r,before.chapters.interfaces)).map(r=>[r,interfaceReading(q,r)]),...[...list(q.security?.threats),...list(q.security?.controls)].filter(r=>kept(r,before.chapters.security)).map(r=>[r,securityReading(q,r)]),...[...list(q.runtime?.plans),...list(q.runtime?.paths)].filter(r=>kept(r,before.chapters.runtime)).map(r=>[r,runtimeReading(q,r)])],now=>{for(const [r,v] of now)r.sourceSnapshot=v;});
 // A design task's security basis that read the versions of Chapters 1-8 and was current reads its threat and control
 // (design-basis.js securityBasisReading), wherever a basis is kept (the task, its source review, an alternative).
 if(before.chapters.security!=null){
  const bases=[];visit(q,q,v=>{if(plain(v)&&plain(v.securitySource)&&plain(v.securityIds)&&v.securitySource.inputStamp===before.chapters.security)bases.push(v);return v;});
  if(bases.length)memoPass(q,()=>{for(const b of bases){const t=list(q.security?.threats).find(x=>x.id===b.securityIds.threatId),c=b.securityIds.controlId?list(q.security?.controls).find(x=>x.id===b.securityIds.controlId):null;if(t&&(c||!b.securityIds.controlId))b.securitySource={...b.securitySource,inputStamp:securityBasisReading(q,t,c)};}});
 }
 // What reads records.
 const recordsAfter=recordStamps(q,what);
 for(const [key,b] of before.records)record(map,b,recordsAfter.get(key));
 translate(q,q,map);
 // What reads the whole design.
 const m=q.finalReview;if(!m)return q;
 const designAfter=designStamps(q,findingIds),version=m.version;
 record(map,before.design.source,designAfter.source);record(map,before.design.source+':'+version,designAfter.source+':'+version);
 recordFindings(map,before.design.findings,designAfter.findings);
 const verified=list(m.actions).map(a=>!!a.verification&&a.verification.stamp===reviewFingerprint(actionDefinition(a)));
 translate(q,m,map);
 list(m.actions).forEach((a,i)=>{if(verified[i])a.verification={...a.verification,stamp:reviewFingerprint(actionDefinition(a))};});
 // A frozen baseline keeps the stamps it was frozen with. The aliases a copy's conversion left now answer for the
 // design as it reads under definition 2; the design and chapter stamps of this moment answer for the others.
 if(list(m.baselines).length){
  const old=m.readingsUpgrade||{},design={},chapters={};
  const designLegacy=old.design?.[before.design.source]??before.design.source;
  if(designAfter.source!==before.design.source||old.design)design[designAfter.source]=designLegacy;
  for(const [id,b] of Object.entries(before.design.chapters)){const legacyChapter=old.chapters?.[id]?.[b]??b,a=designAfter.chapters[id];if(a!==legacyChapter||old.chapters?.[id])chapters[id]={[a]:legacyChapter};}
  m.readingsUpgrade={design,chapters};
 }
 const casesAfter=before.cases.size?caseStamps(documentClone(q)):new Map();
 for(const [id,b] of before.cases)record(map,b,casesAfter.get(id));
 translate(q,m,map);
 return q;
}
// The read upgrade of rc.10.73.42 (D9) runs with it: the data owners Chapter 5 named that Chapter 8 does not (ownership-upgrade.js).
// Then the steps the design packages state for documents written before them (rc44, slice S0: design-extension-parts.js).
registerReadingsUpgrade(p=>upgradeExtensions(upgradeOwnership(upgradeReadings(p))));
