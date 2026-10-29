// The provenance reader (round 12, D-06; workstream D3): who or what wrote each record and each commit, what a person has
// reviewed, and the sources. One vocabulary and one label for every chapter, the review plan, the footer, the SDD's
// cover, document control and Appendix E (sdd-architecture.js counts its records through sddAuthor and
// confirmedByPerson, and prints the provenance blocks). Pure: no DOM, nothing here changes a document except
// the stamping functions the server calls on the copy a command made (stampAuthorship) and the judgement the review
// command records (recordJudgement).
//
// Who wrote a record (its author kind). A proposal is its proposer's until a person keeps it or saves a change to it;
// then it is the person's record, and it still says where its words came from (workstream F's rule, which the lead
// kept for every reader: the chapter pages, the review plan, the footer, and the SDD's cover, document control and
// Appendix E, which sdd-architecture.js prints through sddAuthor and confirmedByPerson below). Read in this order:
//   - a proposal (D1's lifecycle, state 'proposed'): drafted by Sol when Sol drafted it (origin 'sol-draft', or Sol's
//     mark provenance.draft {by: 'sol'}, record-lifecycle.js solDraftOf, as workstream E's drafter marks it), else
//     seeded by AIW (D2's seeds); a person's change to it makes it the person's;
//   - provenance.author {kind, by, at, session?, from?}: the commit that last wrote what the record says, stamped by the
//     server (a person, an import, or a Sol draft; `from` names whose words a person's write started from); a proposal
//     a person then kept as it stood (provenance.reviewed {how: 'kept'}) is the person's;
//   - Sol's draft that is no longer a proposal (kept or saved by a person): the person's, from Sol's draft;
//   - before round 12's stamps: a journey draft (mode sol: Sol; the journey rules: guidance) until a person edits it,
//     an import (origin import, an intake row), AIW's own records (origin seeded, inherited, reference), words a person
//     took from guidance or kept from AIW's proposal (origin suggestion, library, archetype: the person's), and
//     otherwise a person.
// Whether a person reviewed it is read only from a recorded confirmation (GR-GOV-06): a grouped judgement of the review
// plan that covers the record as it now reads (its fingerprint), provenance.reviewed {by, at, how: confirmed | kept} the
// server stamps when a signed-in person confirms the record or keeps AIW's proposal, or, in a document written before
// the stamps, the record's own confirmed flag or accepted state (who is then not recorded). A draft's origin never says
// it was reviewed.
import {remember,memoPass} from './document-memo.js';
import {recordStamp,valueFingerprint} from './source-fingerprint.js';
import {COLLECTIONS,solDraftOf} from './record-lifecycle.js';
import {list,str,clean} from './util.js';

// ---------------------------------------------------------------- the vocabulary
export const AUTHOR_KINDS=Object.freeze(['person','import','sol-draft','seeded','guidance']);
export const AUTHOR_WORDS=Object.freeze({person:'Written by a person',import:'Imported','sol-draft':'Drafted by Sol',seeded:'Seeded by AIW',guidance:'Proposed by guidance'});
// What a commit may say it is: a person's change, an import, or a draft by Sol (D-06).
export const COMMIT_KINDS=Object.freeze(['person','import','sol-draft']);
const FROM_WORDS={import:'the import','sol-draft':'Sol\'s draft',seeded:'AIW\'s proposal',guidance:'guidance'};
const HOW_WORDS={confirmed:'confirmed',kept:'kept',judgement:'reviewed',accepted:'accepted'};
const GUIDANCE_FROM={library:'from the library',archetype:'from a catalogue archetype'};
// The origins a domain gives words a person accepted from guidance (a proposal, the library, a catalogue archetype).
const GUIDANCE_ORIGINS=new Set(['suggestion','library','archetype']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const count=n=>n.toLocaleString('en-GB');
export const lowerFirst=w=>String(w).charAt(0).toLowerCase()+String(w).slice(1);
const plural=(n,one,many=one+'s')=>count(n)+' '+(n===1?one:many);

// ---------------------------------------------------------------- the records
// Every design record, by the collection that holds it and its chapter (record-lifecycle.js COLLECTIONS), with the SDD
// narrative. The Chapter 4 assets are the twins of the Chapter 5 components and are read once, as components. A link
// (a relationship, a connection, a mapping, a dependency, a lineage) is counted apart from the records it joins.
export const LINK_PATHS=new Set(['relationships','logical.connections','logical.mappings','realisation.connections','technology.mappings','technology.dependencies','technologyRealisation.mappings','technologyRealisation.connections','interfaces.lineage','processModel.transitions']);
const NARRATIVE='finalReview.narrative';
export const RECORD_PATHS=Object.freeze([...COLLECTIONS.filter(([path])=>path!=='logical.assets'),[NARRATIVE,11]]);
const CHAPTER_OF=new Map(RECORD_PATHS);
export const RECORD_NOUNS=Object.freeze({artefacts:'Chapter 1 record','processModel.elements':'process object','processModel.transitions':'process path','processModel.claims':'process claim',relationships:'requirement relationship','requirementGroups.records':'requirement group','quality.drivers':'driver','quality.conflicts':'quality conflict','decisions.records':'decision','decisions.conflicts':'decision conflict','logical.responsibilities':'responsibility','logical.groups':'responsibility group','logical.connections':'logical connection','logical.mappings':'allocation','realisation.components':'component','realisation.connections':'component interaction','technology.capabilities':'capability','technology.needs':'technology need','technology.mappings':'support mapping','technology.dependencies':'technology dependency','technology.boundaries':'trust boundary','technologyRealisation.records':'technology realisation','technologyRealisation.mappings':'realisation mapping','technologyRealisation.connections':'realisation connection','interfaces.contracts':'contract','interfaces.data':'data definition','interfaces.parties':'external party','interfaces.lineage':'data lineage','interfaces.invariants':'invariant','security.threats':'threat','security.controls':'control','runtime.environments':'environment','runtime.zones':'zone','runtime.plans':'runtime plan','runtime.placements':'placement','runtime.paths':'runtime path','roadmap.plateaus':'plateau','roadmap.migrations':'migration record','finalReview.actions':'delivery action',[NARRATIVE]:'SDD narrative'});
export function listAt(p,path){
 if(path===NARRATIVE)return plain(p?.finalReview?.narrative)?[p.finalReview.narrative]:[];
 const [a,b]=path.split('.'),v=b?p?.[a]?.[b]:p?.[a];return Array.isArray(v)?v:[];
}
export const chapterOfPath=path=>CHAPTER_OF.get(path)||null;
export const recordKey=(chapter,id)=>chapter+':'+id;
// fn(record, chapter, path, isLink) for every record.
export function eachRecord(p,fn){for(const [path,chapter] of RECORD_PATHS){const link=LINK_PATHS.has(path);for(const r of listAt(p,path))if(plain(r))fn(r,chapter,path,link);}}
// One record by its chapter and id, the first that has it (the narrative's id is 'narrative').
export function findRecord(p,chapter,id){
 if(Number(chapter)===11&&id==='narrative')return plain(p?.finalReview?.narrative)?{record:p.finalReview.narrative,chapter:11,path:NARRATIVE}:null;
 for(const [path,ch] of RECORD_PATHS){if(ch!==Number(chapter)||path===NARRATIVE)continue;const r=listAt(p,path).find(x=>x?.id===id);if(r)return {record:r,chapter:ch,path};}
 return null;
}
const idOf=(r,path)=>path===NARRATIVE?'narrative':r?.id;

// ---------------------------------------------------------------- who wrote it
// authorship(r): {kind, from}: the author kind, and for a person's record whose words came from another, whose
// (sol-draft, seeded, guidance or import).
const PERSON={kind:'person',from:null};
const PROPOSERS=new Set(['sol-draft','seeded','guidance']);
export function authorship(r){
 if(!plain(r))return PERSON;
 const pv=plain(r.provenance)?r.provenance:{},a=plain(pv.author)&&AUTHOR_KINDS.includes(pv.author.kind)?pv.author:null,mark=solDraftOf(r),journey=plain(pv.journey)?pv.journey:null;
 const sol=!!mark||r.origin==='sol-draft',kept=plain(pv.reviewed)&&pv.reviewed.how==='kept'?pv.reviewed:null;
 if(r.state==='proposed'){
  const proposer=sol||a?.kind==='sol-draft'?'sol-draft':'seeded';
  // A person saved a change to the proposal, and it stayed one: the person's.
  if(a?.kind==='person')return {kind:'person',from:a.from||proposer};
  if(!a&&mark?.edited)return {kind:'person',from:proposer};
  return {kind:proposer,from:null};
 }
 if(a){
  // Words a person kept as they stood (a proposal kept after the commit that wrote it): the person's, from them.
  if(PROPOSERS.has(a.kind)&&(kept&&!(a.at&&kept.at&&a.at>kept.at)||a.kind==='guidance'&&pv.reviewed?.how==='accepted'))return {kind:'person',from:a.kind};
  return a.kind==='person'?{kind:'person',from:a.from||null}:{kind:a.kind,from:null};
 }
 if(sol)return {kind:'person',from:'sol-draft'};
 if(journey)return journey.edited?{kind:'person',from:journey.mode==='sol'?'sol-draft':'guidance'}:{kind:journey.mode==='sol'?'sol-draft':'guidance',from:null};
 if(r.origin==='import'||pv.datasetId)return {kind:'import',from:null};
 if(['seeded','inherited','reference'].includes(r.origin))return {kind:'seeded',from:null};
 // D4's keep gives AIW's kept proposal the origin a person's words taken from guidance have (record-lifecycle.js).
 if(GUIDANCE_ORIGINS.has(r.origin))return {kind:'person',from:kept?'seeded':'guidance'};
 return PERSON;
}
export const authorOf=r=>authorship(r).kind;
// The SDD's reading of the same (sdd-architecture.js provenanceReading): Sol's drafts, imports, the journey rules'
// drafts (guidance), a person's records, AIW's reference content (a teaching example's own records) and AIW's proposals.
export function sddAuthor(r){
 const k=authorOf(r);
 return k==='sol-draft'?'sol':k==='import'?'import':k==='guidance'?'rules':k==='seeded'?(r?.origin==='reference'&&r?.state!=='proposed'?'reference':'proposal'):'person';
}
const stampOf=r=>plain(r?.provenance?.author)?r.provenance.author:null;

// ---------------------------------------------------------------- what a person reviewed
// The grouped judgements of the review plan (finalReview.judgements): each covers records by chapter and id with the
// fingerprint of each as the reviewer saw it; the latest judgement of a record holds while the record reads the same.
export const JUDGEMENT_OUTCOMES=Object.freeze([['kept','Reviewed and kept as drafted'],['follow-up','Reviewed; follow-up required'],['not-applicable','Reviewed; not applicable to this design']]);
export const JUDGEMENT_LIMIT=6000;
// A restored package keeps its earlier judgements as audit history. Only a judgement recorded by a signed-in person on
// this workbench may close the review plan here (a package's importedActor is not that person).
const historicalReview=(p,at)=>!!p?.finalReview?.imported?.at&&(!at||at<=p.finalReview.imported.at);
function judgementIndex(p){return remember(p,'provenance:judgements','',()=>{const m=new Map();for(const j of list(p?.finalReview?.judgements)){if(historicalReview(p,j?.at)||j?.importedActor||!j?.actor)continue;for(const x of list(j?.records))if(Array.isArray(x)){m.set(recordKey(x[0],x[1]),{j,stamp:x[2]});m.set(recordKey('*',x[1]),{j,stamp:x[2]});}}return m;});}
export function judgementOf(p,r,chapter=null){
 const index=judgementIndex(p);if(!index.size)return null;
 const e=index.get(recordKey(chapter==null?'*':chapter,r?.id===undefined&&(chapter===11||chapter==null&&plain(r)&&r===p?.finalReview?.narrative)?'narrative':r?.id));
 return e&&e.stamp===recordStamp(p,r)?e.j:null;
}
const confirmedNow=r=>r?.confirmed===true;
const acceptedNow=r=>['accepted','approved','confirmed','verified','reviewed'].includes(r?.status);
export function reviewOf(p,r,chapter=null){
 const j=judgementOf(p,r,chapter);
 if(j)return {by:j.actor||null,at:j.at||null,how:'judgement',id:j.id,outcome:j.outcome};
 const s=plain(r?.provenance?.reviewed)?r.provenance.reviewed:null;
 if(s&&!historicalReview(p,s.at)&&(s.how!=='confirmed'||confirmedNow(r)))return {by:s.by||null,at:s.at||null,how:s.how||'confirmed'};
 // Legacy flags have no signed-in reviewer stamp. They remain readable in their original project, but after restore
 // they are historical assertions; a local judgement or confirmation is required to count them on this workbench.
 if(confirmedNow(r)&&!p?.finalReview?.imported)return {by:null,at:null,how:'confirmed'};
 if(acceptedNow(r)&&!p?.finalReview?.imported)return {by:null,at:null,how:'accepted'};
 return null;
}

// What the SDD prints as confirmed by a person (sdd-architecture.js): a recorded confirmation, keep or acceptance, or a
// judgement that kept the record as drafted (a judgement that asks a follow-up, or finds it not applicable, reviewed it
// without confirming it).
export function confirmedByPerson(p,r,chapter=null){const rv=reviewOf(p,r,chapter);return !!rv&&(rv.how!=='judgement'||rv.outcome==='kept');}

// ---------------------------------------------------------------- one record, in words
export function recordProvenance(p,r,chapter){
 const {kind,from:came}=authorship(r),a=stampOf(r),reviewed=reviewOf(p,r,chapter),from=kind==='person'&&came&&came!=='person'?came:null;
 // Who applied Sol's draft and when (GR-GOV-25): the commit's stamp, else the mark workstream E's drafter leaves
 // (provenance.draft {appliedBy, appliedAt}), on the draft and on the person's record it became.
 const draft=solDraftOf(r),stampedDraft=a?.kind==='sol-draft';
 const applied=kind==='sol-draft'?{by:(stampedDraft?a.by:draft?.appliedBy)||null,at:(stampedDraft?a.at:draft?.appliedAt)||null}:from==='sol-draft'&&draft&&(draft.appliedBy||draft.appliedAt)?{by:draft.appliedBy||null,at:draft.appliedAt||null}:null;
 // A person's own write (their commit's stamp) names them, and, when it changed another's words (Sol's draft, AIW's
// proposal, an import), says when they edited them; a record they kept as it stood names them as its keeper.
 const own=a?.kind==='person'?a:null;
 // AIW's reference example (the teaching project's own records) says so, and guidance says where its words came from (the
 // component library, a catalogue archetype).
 const rp={kind,word:AUTHOR_WORDS[kind]+(kind==='seeded'&&r?.origin==='reference'&&r?.state!=='proposed'?' (reference example)':''),by:own?.by||null,at:own?.at||null,from,fromWords:from?(from==='guidance'&&GUIDANCE_FROM[r?.origin]?GUIDANCE_FROM[r.origin].replace(/^from /,''):FROM_WORDS[from]):null,edited:!!(own&&from&&from!=='guidance'),session:a?.session||null,applied,reviewed,citations:recordCitations(p,r)};
 rp.label=provenanceLabel(rp);rp.line=provenanceLine(rp);return rp;
}
// "Drafted by Sol · not reviewed", "Imported · confirmed by architect-a", "Written by architect-a (from Sol's draft)",
// "Written by a person (from Sol's draft) · kept by architect-b".
export function provenanceLabel(rp){
 if(!rp)return '';
 const who=rp.kind==='person'?(rp.by?'Written by '+rp.by:AUTHOR_WORDS.person)+(rp.from?' (from '+(rp.fromWords||FROM_WORDS[rp.from])+')':''):rp.word||AUTHOR_WORDS[rp.kind]||AUTHOR_WORDS.person;
 const r=rp.reviewed;
 if(r)return who+' · '+(HOW_WORDS[r.how]||'reviewed')+(r.by?' by '+r.by:'')+(r.how==='judgement'&&r.outcome==='follow-up'?' (follow-up required)':'');
 return rp.kind==='person'?who:who+' · not reviewed';
}
export const recordLabel=(p,r,chapter)=>recordProvenance(p,r,chapter).label;
// The same as a sentence, with who applied a draft and when (every chapter page prints it in the details of the record in
// view, studio-kit.js): "Drafted by Sol, not reviewed; applied by architect-a on 2026-10-08", "Written by architect-b
// (from Sol's draft); applied by architect-a on 2026-10-08; edited on 2026-10-09".
const day=at=>typeof at==='string'&&/^\d{4}-\d{2}-\d{2}/.test(at)?at.slice(0,10):'';
export function provenanceLine(rp){
 if(!rp)return '';
 const out=[(rp.label||'').replace(' · ',', ')];
 if(rp.applied&&(rp.applied.by||rp.applied.at))out.push('applied by '+(rp.applied.by||'an account not recorded')+(day(rp.applied.at)?' on '+day(rp.applied.at):''));
 if(rp.edited&&day(rp.at))out.push('edited on '+day(rp.at));
 else if(!(rp.applied&&(rp.applied.by||rp.applied.at))&&day(rp.at))out.push((rp.kind==='person'?'written':'recorded')+' on '+day(rp.at));
 if(rp.reviewed?.at&&day(rp.reviewed.at))out.push((HOW_WORDS[rp.reviewed.how]||'reviewed')+' on '+day(rp.reviewed.at));
 return out.join('; ');
}

// ---------------------------------------------------------------- what AIW discloses of Sol's part (GR-GOV-07)
// Every disclosure is derived from what is stored, never a fixed sentence: who wrote each record (the counts above), and
// which words a language model proposed in a recorded run (workstream E's model-assisted wording, each naming its run).
// The screens add the provider configured now (shell-ux.js guidanceFooter). chapter: one chapter's records only.
// Worked out once per settled document or pass, as the summary is (every render of the footer reads it).
export function solDisclosure(p,chapter=null){return memoPass(p,()=>remember(p,'provenance:disclosure',chapter?String(chapter):'',()=>disclosureOf(p,chapter)));}
function disclosureOf(p,chapter){
 const s=provenanceSummary(p),c=chapter?s.chapters.find(x=>x.chapter===Number(chapter)):null;
 const drafted=chapter?(c?.byKind['sol-draft']||0):s.solDrafted,open=chapter?(c?c.byKind['sol-draft']-c.reviewed['sol-draft']:0):s.solDraftedNotReviewed;
 let worded=0;const runs=new Set();
 eachRecord(p,(r,ch)=>{if(chapter&&ch!==Number(chapter))return;const w=list(r?.provenance?.draft?.wording).filter(x=>x?.kind==='model-assisted');if(w.length){worded++;for(const x of w)if(x?.runId)runs.add(x.runId);}});
 const where=chapter?' in this chapter':'';
 const line=(drafted?'Sol drafted '+plural(drafted,'record')+where+'; '+(open?count(open)+' of them '+(open===1?'is':'are')+' not reviewed by a person.':'a person reviewed each of them.'):'No record'+where+' was drafted by Sol.')+(worded?' '+plural(worded,'record')+' hold wording a language model proposed, in '+plural(runs.size,'recorded run')+'.':'');
 return {drafted,notReviewed:open,modelWorded:worded,runs:[...runs].sort(),line,short:drafted?'Sol drafted '+plural(drafted,'record')+', '+(open?count(open)+' not reviewed by a person':'each reviewed by a person'):''};
}

// ---------------------------------------------------------------- the whole design
const zero=()=>Object.fromEntries(AUTHOR_KINDS.map(k=>[k,0]));
// Counts every record by who wrote it and whether a person reviewed it, per chapter too; the people who wrote and
// reviewed; the sources (the brief and its versions, the workbooks imported, the evidence sources); the commits of the
// journal by kind; and the provenance line (the cover and the document control) and detail (Appendix E). Worked out
// once per settled document or pass.
export function provenanceSummary(p){return memoPass(p,()=>remember(p,'provenance:summary','',()=>summaryOf(p)));}
function summaryOf(p){
 const byKind=zero(),reviewed=zero(),links=zero(),chapters=new Map(),writers=new Set(),reviewers=new Set();let total=0,linkTotal=0,reviewedTotal=0,followUps=0;
 eachRecord(p,(r,chapter,path,link)=>{
  const kind=authorOf(r);
  if(link){linkTotal++;links[kind]++;return;}
  const rv=reviewOf(p,r,chapter),a=stampOf(r);total++;byKind[kind]++;
  if(rv){reviewed[kind]++;reviewedTotal++;if(rv.by)reviewers.add(rv.by);if(rv.outcome==='follow-up')followUps++;}
  if(a?.by&&a.kind==='person')writers.add(a.by);
  let c=chapters.get(chapter);if(!c)chapters.set(chapter,c={chapter,total:0,byKind:zero(),reviewed:zero()});c.total++;c.byKind[kind]++;if(rv)c.reviewed[kind]++;
 });
 const sources=summarySources(p),commits=zero();
 for(const e of list(p?.changes?.events))if(COMMIT_KINDS.includes(e?.authorKind))commits[e.authorKind]++;
 const sol=byKind['sol-draft'],solOpen=sol-reviewed['sol-draft'];
 const lower=lowerFirst,parts=AUTHOR_KINDS.filter(k=>byKind[k]).sort((a,b)=>byKind[b]-byKind[a]).map(k=>count(byKind[k])+' '+lower(AUTHOR_WORDS[k]));
 const line=!total?'No design records are recorded yet.':(sol&&sol===total&&!reviewed['sol-draft']?'Drafted by Sol; not reviewed by a person.':parts.join(', ')+'; '+(reviewedTotal?count(reviewedTotal)+' of '+plural(total,'record')+' reviewed by a person':'none reviewed by a person')+'.')+(sol&&!(sol===total&&!reviewed['sol-draft'])?' '+(solOpen?plural(solOpen,'record')+' Sol drafted '+(solOpen===1?'is':'are')+' not reviewed by a person.':'Every record Sol drafted is reviewed by a person.'):'');
 const detail=!total?'':'Of '+plural(total,'record')+': '+parts.join(', ')+'. Reviewed by a person: '+(reviewedTotal?count(reviewedTotal)+(followUps?' ('+count(followUps)+' with a follow-up)':''):'none')+'. '+(linkTotal?count(linkTotal)+' links join them. ':'')+'Reviewed is read only from a recorded confirmation or a person\'s recorded judgement; approval is printed only from approval records.';
 return {total,byKind,reviewed,notReviewed:Object.fromEntries(AUTHOR_KINDS.map(k=>[k,byKind[k]-reviewed[k]])),reviewedTotal,followUps,solDrafted:sol,solDraftedNotReviewed:solOpen,links:{total:linkTotal,byKind:links},
  chapters:[...chapters.values()].sort((a,b)=>a.chapter-b.chapter),writers:[...writers].sort(),reviewers:[...reviewers].sort(),commits,sources,judgements:list(p?.finalReview?.judgements).length,line,detail};
}
// The brief (each version kept, with its hash and who changed it), the workbooks imported (their revisions) and the
// other evidence sources.
function summarySources(p){
 const out=[];
 for(const s of list(p?.coauthoring?.sources)){const v=list(s?.versions),last=v.at(-1)||{};out.push({kind:s.kind==='brief'?'brief':s.kind==='model'?'model':'source',id:s.id,title:str(last.title||s.name||s.id),revisions:v.length,hash:str(last.hash||s.hash),status:str(last.status),changedBy:list(v).filter(x=>plain(x?.author)).map(x=>x.author.by).filter(Boolean).at(-1)||null});}
 for(const d of list(p?.intake?.datasets))out.push({kind:'workbook',id:d.id,title:str(d.filename||d.id),revisions:list(d.versions).length||1,hash:str(d.workbookHash),rows:d.rowCount??null,sheet:str(d.sheet),importedBy:d.actor||null,at:d.at||null});
 return out;
}
// Appendix E's body (SDD-SPEC): who and what wrote the records, what is reviewed and what is not, and the sources.
export function provenanceMarkdown(p,{heading='## Provenance'}={}){
 const s=provenanceSummary(p);
 let out=heading+'\n\n'+s.line+'\n\n';
 if(!s.total)return out;
 out+='| Chapter | Records | '+AUTHOR_KINDS.map(k=>AUTHOR_WORDS[k]).join(' | ')+' | Reviewed by a person |\n| --- | --- | '+AUTHOR_KINDS.map(()=>'---').join(' | ')+' | --- |\n'+s.chapters.map(c=>'| '+c.chapter+' | '+count(c.total)+' | '+AUTHOR_KINDS.map(k=>count(c.byKind[k])).join(' | ')+' | '+count(AUTHOR_KINDS.reduce((n,k)=>n+c.reviewed[k],0))+' |').join('\n')+'\n\n'+s.detail+'\n\n';
 if(s.reviewers.length)out+='Reviewed by: '+s.reviewers.join(', ')+'.\n\n';
 if(s.sources.length)out+='Sources:\n\n'+s.sources.slice(0,12).map(x=>'- '+x.id+' · '+x.title+' ('+(x.kind==='workbook'?'workbook, '+plural(x.revisions,'revision')+(x.importedBy?', imported by '+x.importedBy:''):x.kind==='brief'?'brief, '+plural(x.revisions,'version')+(x.changedBy?', last changed by '+x.changedBy:''):x.kind)+(x.hash?', SHA-256 '+x.hash.slice(0,16):'')+')').join('\n')+(s.sources.length>12?'\n- and '+plural(s.sources.length-12,'more source'):'')+'\n\n';
 return out;
}

// ---------------------------------------------------------------- the provenance block and citations (GR-GOV-09, -18)
// A record may carry a provenance block apart from its design statement: the source in words, the passages and rows it
// cites, and the basis of its claim (stated by a source, inferred from one, proposed, or open). The server checks it
// and keeps it on the record (provenance.source, .citations, .basis); a citation of an imported row names the dataset,
// the revision and the row, so the row's original cells open in the revision cited, from any record.
export const PROVENANCE_BASES=Object.freeze(['stated','inferred','proposed','open']);
export const CITATION_KINDS=Object.freeze(['row','source','record']);
export const PROVENANCE_LIMITS=Object.freeze({source:600,citations:20,note:300});
export function provenanceBlock(p,raw){
 if(raw===undefined||raw===null)return null;
 if(!plain(raw)||Object.keys(raw).some(k=>!['source','citations','basis'].includes(k)))throw Error('A provenance block holds a source, citations and a basis only.');
 const source=clean(raw.source,PROVENANCE_LIMITS.source+1);if(source.length>PROVENANCE_LIMITS.source)throw Error('Keep the source to '+PROVENANCE_LIMITS.source+' characters; cite the passages it rests on.');
 if(raw.basis!==undefined&&raw.basis!==''&&!PROVENANCE_BASES.includes(raw.basis))throw Error('The basis of a claim is stated, inferred, proposed or open.');
 const cites=raw.citations??[];if(!Array.isArray(cites))throw Error('Citations are a list.');
 if(cites.length>PROVENANCE_LIMITS.citations)throw Error('A record cites at most '+PROVENANCE_LIMITS.citations+' passages; '+cites.length+' were sent.');
 const citations=cites.map(c=>citation(p,c));
 const out={};if(source)out.source=source;if(citations.length)out.citations=citations;if(raw.basis)out.basis=raw.basis;
 return Object.keys(out).length?out:{};
}
function citation(p,c){
 if(!plain(c)||!CITATION_KINDS.includes(c.kind))throw Error('A citation is of a workbook row, a source or a record.');
 const note=clean(c.note,PROVENANCE_LIMITS.note);
 if(c.kind==='row'){
  const d=list(p?.intake?.datasets).find(x=>x?.id===c.datasetId),revision=Number(c.revision??d?.revision);
  if(!d)throw Error('A row citation names a dataset this project imported.');
  if(!Number.isInteger(revision)||!list(d.versions).some(v=>v?.revision===revision)&&d.revision!==revision)throw Error('A row citation names a revision of '+d.id+' this project keeps.');
  const externalId=clean(c.externalId,120);if(!externalId)throw Error('A row citation names the row by its identifier in the workbook.');
  return {kind:'row',datasetId:d.id,revision,externalId,...(note?{note}:{})};
 }
 if(c.kind==='source'){
  const s=list(p?.coauthoring?.sources).find(x=>x?.id===c.sourceId),revision=Number(c.revision??list(s?.versions).length);
  if(!s)throw Error('A source citation names an evidence source this project keeps.');
  if(!list(s.versions).some(v=>v?.revision===revision))throw Error('A source citation names a revision of '+s.id+' this project keeps.');
  return {kind:'source',sourceId:s.id,revision,...(note?{note}:{})};
 }
 const id=clean(c.id,120),chapter=Number(c.chapter);if(!id||!findRecord(p,chapter,id))throw Error('A record citation names a record this project holds.');
 return {kind:'record',chapter,id,...(note?{note}:{})};
}
// Where a citation leads: a workbook row opens its original cells in the revision cited (the intake's source action),
// a source its revision, a record its chapter.
export function citationTarget(p,c){
 if(c?.kind==='row'){const d=list(p?.intake?.datasets).find(x=>x?.id===c.datasetId);return {kind:'row',label:c.externalId+' · '+(d?.filename||c.datasetId)+(d?.sheet?' · '+d.sheet:'')+' · revision '+c.revision,url:'/api/intake?action=source&dataset='+encodeURIComponent(c.datasetId)+'&externalId='+encodeURIComponent(c.externalId)+'&revision='+c.revision};}
 if(c?.kind==='source'){const s=list(p?.coauthoring?.sources).find(x=>x?.id===c.sourceId),v=list(s?.versions).find(x=>x?.revision===c.revision);return {kind:'source',label:c.sourceId+' · revision '+c.revision+(v?.title?' · '+v.title:''),url:null};}
 if(c?.kind==='record')return {kind:'record',label:'Chapter '+c.chapter+' · '+c.id,url:'/?chapter='+c.chapter+'&object='+encodeURIComponent(c.id)};
 return null;
}
// The brief's version a record drafted from it cites (round 12, GR-GOV-10): the version that was current when the record
// was drafted (its journey draft's time, else when its commit stamped it), else the version the brief's interpretation
// read (its text hash), else the first. A later change of the brief adds a version and leaves the citation where it was.
export function briefVersionCited(p,when){
 const sources=list(p?.coauthoring?.sources),pinned=p?.brief?.interpreted?.sourceId,s=sources.find(x=>pinned&&x?.id===pinned)||sources.find(x=>x?.kind==='brief');
 const vs=list(s?.versions);if(!vs.length)return null;
 const hashOf=v=>v?.hash||String(v?.location||'').match(/text SHA-256 ([a-f0-9]{64})/)?.[1]||null;
 let v=typeof when==='string'?vs.filter(x=>typeof x?.at==='string'&&x.at<=when).at(-1):null;
 if(!v&&p?.brief?.interpreted?.textHash)v=vs.find(x=>hashOf(x)===p.brief.interpreted.textHash);
 v??=vs[0];
 return {sourceId:s.id,revision:v.revision};
}
// A record's citations: those of its provenance block, for an imported requirement its own row, and for a record drafted
// from the brief (a journey draft not read from a model file) the brief's version it was drafted from, with its passages.
export function recordCitations(p,r){
 const pv=plain(r?.provenance)?r.provenance:{},out=[...list(pv.citations)];
 if(pv.datasetId&&r?.externalId&&!out.some(c=>c?.kind==='row'&&c.datasetId===pv.datasetId&&c.externalId===r.externalId))out.unshift({kind:'row',datasetId:pv.datasetId,revision:pv.revision,externalId:r.externalId});
 const j=plain(pv.journey)?pv.journey:null;
 if(j&&j.mode!=='model'){const b=briefVersionCited(p,j.at||stampOf(r)?.at);if(b&&!out.some(c=>c?.kind==='source'&&c.sourceId===b.sourceId))out.push({kind:'source',...b,passages:list(j.passages).slice(0,40)});}
 return out;
}
// The block as one line, apart from the design statement: "Basis: inferred · Source: … · Cites: REQ-023 (workbook,
// revision 2)".
// The SDD's register of provenance blocks (GR-GOV-09): every record that names its source, its citations or the basis
// of its claim, each on its own line apart from what the record says; nothing when no record has one. Workstream F may
// print it in Appendix E.
const recordTitle=(r,path)=>path==='relationships'?(r.from+' '+r.kind+' '+r.to):(r.title||r.question||r.label||r.name||r.topic||'');
// limit: at most that many records, then rest(n) says where the n others are (the SDD's Appendix E prints the first
// twelve; the review registers every one).
export function provenanceBlocksMarkdown(p,{heading='# Where the records come from',limit=Infinity,rest=null}={}){
 const rows=[];
 eachRecord(p,(r,chapter,path)=>{const pv=plain(r?.provenance)?r.provenance:null;if(!pv||!(pv.source||list(pv.citations).length||pv.basis))return;rows.push('- Chapter '+chapter+' · '+(r.ref||r.code||r.id||'narrative')+(recordTitle(r,path)?' · '+recordTitle(r,path):'')+' — '+provenanceBlockText(p,r));});
 const shown=rows.length>limit?rows.slice(0,limit):rows,more=rows.length-shown.length;
 return rows.length?heading+'\n\nEach record below names its source, the passages it cites or the basis of its claim (stated, inferred, proposed or open), kept apart from what the record says.\n\n'+shown.join('\n')+(more&&rest?'\n- '+rest(more):'')+'\n\n':'';
}
export function provenanceBlockText(p,r){
 const pv=plain(r?.provenance)?r.provenance:{},cites=list(pv.citations).map(c=>citationTarget(p,c)?.label).filter(Boolean);
 return [pv.basis?'Basis: '+pv.basis:'',pv.source?'Source: '+pv.source:'',cites.length?'Cites: '+cites.join('; '):''].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------- stamping what a commit wrote (the server's)
// What a record says, for authorship: every field but the bookkeeping a save does and its review and lifecycle state
// (the same fields worker.js editedFields leaves out, and state).
export const NOT_CONTENT=new Set(['provenance','history','sourceSnapshot','revision','review','reviews','updatedAt','at','stamp','sourceStamp','origin','state','confirmed','targetConfirmed','solSuggestions']);
export function contentEdits(old,now){return [...new Set([...Object.keys(old||{}),...Object.keys(now||{})])].filter(k=>!NOT_CONTENT.has(k)&&JSON.stringify(old?.[k]??null)!==JSON.stringify(now?.[k]??null));}
// The collections a command's records are kept in, by its type (and a reviewed change's inner commands).
const PATHS_BY_PREFIX={artefact:['artefacts','relationships'],brief:[],relationship:['relationships'],deleteRelationship:[],deleteArtefact:[],requirements:['artefacts','requirementGroups.records'],quality:['quality.drivers','quality.conflicts'],decision:['decisions.records','decisions.conflicts'],logical:['logical.responsibilities','logical.groups','logical.connections','logical.mappings'],realisation:['realisation.components','realisation.connections','logical.mappings'],technology:['technology.capabilities','technology.needs','technology.mappings','technology.dependencies','technology.boundaries'],techrealisation:['technologyRealisation.records','technologyRealisation.mappings','technologyRealisation.connections'],interfaces:['interfaces.contracts','interfaces.data','interfaces.parties','interfaces.lineage','interfaces.invariants'],security:['security.threats','security.controls'],runtime:['runtime.environments','runtime.zones','runtime.plans','runtime.placements','runtime.paths'],'review.narrative':[NARRATIVE],'review.action':['finalReview.actions'],'review.plateau':['roadmap.plateaus'],'review.plateau-assign':['roadmap.plateaus'],'review.plateau-group':['roadmap.plateaus'],'review.migration':['roadmap.migrations'],process:['processModel.elements','processModel.transitions','processModel.claims']};
const NESTED=new Set(['workspace.apply','workspace.merge','workspace.template','workspace.guidance','workspace.lifecycle','workspace.quality-workshop','alternative.apply']);
export function innerCommands(command){
 const payload=command?.payload;if(!plain(payload))return [command];
 if(command.type==='model.apply-impact'||command.type==='interfaces.apply-impact')return plain(payload.command)?[payload.command]:[];
 if(NESTED.has(command.type))return Array.isArray(payload.commands)?payload.commands.filter(plain):[];
 return [command];
}
function pathsOf(type){const t=String(type||'');return PATHS_BY_PREFIX[t]||PATHS_BY_PREFIX[t.split('.')[0]]||[];}
// A command's collections: by its type, and for the lifecycle family's keep (record.keep {ids, chapter?}) those of its
// chapter (any chapter when none is named). A retire or a restore (record.retire, record.restore) moves records with
// their own provenance (record-lifecycle.js keeps who, when and why) and writes none.
function pathsOfCommand(c){
 if(c?.type==='record.keep'){const ch=Number(c.payload?.chapter);return RECORD_PATHS.filter(([path,chapter])=>path!==NARRATIVE&&(!ch||chapter===ch)).map(([path])=>path);}
 return pathsOf(c?.type);
}
// The ids a command names as the records it writes or decides on: its payload's id (an alternative's, an option's, a
// field's), the ids of a bulk step, and the records it answers it created or selected.
export function touchedIds(command,result){
 const ids=new Set(),add=v=>{if(typeof v==='string'&&v)ids.add(v);};
 for(const c of innerCommands(command)){const x=c?.payload;if(!plain(x))continue;add(x.id);add(x.alternativeId);add(x.option?.id);add(x.field?.id);for(const id of list(x.ids))add(id);}
 add(result?.selected);for(const id of list(result?.selectedIds))add(id);
 return ids;
}
const personAuthor=a=>!!a&&a.account!=='agent'&&a.kind!=='sol-draft';
// The provenance block (GR-GOV-09: source, citations, basis) a record keeps across a save that rebuilt it without it.
const BLOCK_KEYS=['source','citations','basis'];
// A record's provenance keeps its accepted suggestions and their history last (worker.js carryProvenance rebuilds it so on
// every save): whatever is added before them, so that a save that changes nothing leaves the record's text as it was.
const TRAIL=['suggestions','history'];
export function tidyProvenance(pv){const out={};for(const k of Object.keys(pv))if(!TRAIL.includes(k))out[k]=pv[k];for(const k of TRAIL)if(Object.hasOwn(pv,k))out[k]=pv[k];return out;}
// Where a drafter's words came from (Sol's mark, provenance.draft; the journey's, provenance.journey) stays on the record
// across a save that rebuilt it without them, as the Worker carries them for the spark's records (worker.js
// carryJourney), and a person's change to Sol's draft is recorded on its mark (edited, the fields, when), the shape
// carryJourney gives the journey's: the record is then the person's, and the stamp says who (round 12, GR-GOV-25).
const MARKS=['draft','journey'];
function setOwned(now,author,reviewed,old=null,edited=null,at=null){
 const pv=plain(now.provenance)?{...now.provenance}:{};delete pv.author;delete pv.reviewed;
 if(author)pv.author=author;if(reviewed)pv.reviewed=reviewed;
 const was=plain(old?.provenance)?old.provenance:null;if(was){for(const k of BLOCK_KEYS)if(was[k]!==undefined&&pv[k]===undefined)pv[k]=was[k];for(const k of MARKS)if(plain(was[k])&&!plain(pv[k]))pv[k]=was[k];}
 if(edited?.length&&plain(pv.draft)&&pv.draft.by==='sol'){const d=pv.draft;pv.draft={...d,edited:true,editedFields:[...new Set([...list(d.editedFields),...edited])].slice(0,60),editedAt:at};}
 if(Object.keys(pv).length)now.provenance=tidyProvenance(pv);else delete now.provenance;
}
// What the commit did to one record it wrote or decided on: a record it made, or one whose content it changed, is
// stamped as the commit's (with what a person's write started from); a person's confirmation or keep of a record is
// stamped as reviewed by them; whatever the domain's save dropped or a payload brought in is put back as it was.
function settle(old,now,author,at,fourEyes=false,forceConfirmation=false){
 const priorAuthor=stampOf(old),priorReview=plain(old?.provenance?.reviewed)?old.provenance.reviewed:null;
 let a=priorAuthor,rv=priorReview;
 const created=!old,edits=created?['created']:contentEdits(old,now);
 if(edits.length&&!(created&&now.state==='proposed')){
  // Whose words the write started from: another kind's, or, for a person's write of a person's record, where that
  // record's words came from (Sol's draft a person kept, then edited, is still from Sol's draft).
  const was=created?null:authorship(old),from=!was?null:was.kind!==author.kind?was.kind:author.kind==='person'?was.from:null;
  a={kind:author.kind,by:author.id||null,at,...(author.session?{session:author.session}:{}),...(from?{from}:{})};
  rv=null;
  // A record a person makes in guidance's words (the domain says so by its origin) is the person's, from guidance.
  if(created&&author.kind==='person'&&personAuthor(author)&&GUIDANCE_ORIGINS.has(now.origin))a={...a,from:'guidance'};
 }
 if(personAuthor(author)){
  const confirming=(forceConfirmation||!confirmedNow(old))&&confirmedNow(now),keeping=!created&&old.state==='proposed'&&now.state!=='proposed'&&!edits.length;
  // Four eyes (a project's setting): a person does not confirm, or keep, what they wrote themselves.
  if(fourEyes&&(confirming||keeping)&&a?.kind==='person'&&a.by&&a.by===author.id)throw Error('Four eyes: '+author.id+' wrote '+(now.ref||now.id||'this record')+'. Another signed-in person confirms it.');
  // A keep makes the proposal the person's record (record-lifecycle.js record.keep): who kept it, and when.
  if(keeping)rv={by:author.id||null,at,how:'kept'};
  if(confirming)rv={by:author.id||null,at,how:'confirmed'};
 }
 if(rv?.how==='confirmed'&&!confirmedNow(now))rv=null;
 setOwned(now,a,rv,old,!created&&author.kind==='person'&&personAuthor(author)?edits:null,at);
}
// stampAuthorship(prior, next, command, result, author, at): the records of next the command made, named, confirmed or
// kept (a bulk step names them by a filter), in the collections its type keeps them in, settled one by one (settle
// above). The work is the size of those collections, never the project's; a record the command did not change is left
// as the domain left it.
export function stampAuthorship(prior,next,command,result,author,at,{fourEyes=false}={}){
 if(!author)return next;
 const inner=innerCommands(command),types=new Set(inner.map(c=>c?.type)),paths=new Set(inner.flatMap(pathsOfCommand)),touched=touchedIds(command,result);
 // A record a restore brought back is the one that left, with its own provenance: not made by this commit.
 const restored=new Set();if(types.has('record.restore')){const still=new Set(list(next?.retired?.records).map(x=>x?.path+'|'+x?.id));for(const x of list(prior?.retired?.records))if(!still.has(x?.path+'|'+x?.id))restored.add(x?.path+'|'+x?.id);}
 for(const path of paths){
  const after=listAt(next,path);if(!after.length)continue;
  const before=listAt(prior,path);
  if(path===NARRATIVE){if(types.has('review.narrative'))settle(before[0]||null,after[0],author,at,fourEyes,true);continue;}
  const old=new Map();for(const r of before)if(plain(r)&&r.id!=null&&!old.has(r.id))old.set(r.id,r);
  for(const now of after){if(!plain(now)||now.id==null)continue;const was=old.get(now.id);if(!was&&restored.has(path+'|'+now.id))continue;if(!was||touched.has(now.id)||was.confirmed!==now.confirmed||was.state!==now.state)settle(was||null,now,author,at,fourEyes);}
 }
 return next;
}
// The provenance block a command carries (round 12, GR-GOV-09): the source, citations and basis of payload.provenance,
// checked (provenanceBlock: each citation must name a row, a source version or a record the project holds) and set on the
// record the command wrote, apart from what the record says. A key sent replaces the record's (empty clears it); a key
// left out keeps it, and a command that sends none leaves the block as it was (settle keeps it across a save). The rest
// of a payload's provenance (a record sent back whole, with its author, review or journey) is the server's and is never
// taken from a payload. Relationships, connections, interactions, groups, the narrative, parties,
// zones, paths and needs take it, as every first-class record does. A block for a record the command does not write is
// refused. Run by the Worker after the command (worker.js), on the commit's own copy.
const BLOCK_PATHS={'relationship':['relationships'],'artefact':['artefacts'],'requirements.group':['requirementGroups.records'],'quality.driver':['quality.drivers'],'quality.conflict':['quality.conflicts'],'decision.save':['decisions.records'],'decision.conflict':['decisions.conflicts'],'logical.responsibility':['logical.responsibilities'],'logical.group':['logical.groups'],'logical.connection':['logical.connections'],'logical.mapping':['logical.mappings'],'realisation.component':['realisation.components'],'realisation.interaction':['realisation.connections'],'technology.capability':['technology.capabilities'],'technology.needs':['technology.needs'],'technology.dependency':['technology.dependencies'],'technology.boundary':['technology.boundaries'],'techrealisation.plan':['technologyRealisation.records'],'interfaces.contract':['interfaces.contracts'],'interfaces.data':['interfaces.data'],'interfaces.party':['interfaces.parties'],'interfaces.invariant':['interfaces.invariants'],'security.threat':['security.threats'],'security.control':['security.controls'],'runtime.environment':['runtime.environments'],'runtime.zone':['runtime.zones'],'runtime.plan':['runtime.plans'],'runtime.path':['runtime.paths'],'process.element':['processModel.elements'],'process.claim':['processModel.claims'],'review.narrative':[NARRATIVE]};
function blockTargets(prior,next,c,id){
 const paths=BLOCK_PATHS[c?.type];if(!paths)return null;
 if(paths[0]===NARRATIVE)return listAt(next,NARRATIVE);
 const x=c.payload||{};
 // A relationship names no id of its own: the one the command added between the records it names.
 if(c.type==='relationship'){const had=new Set(listAt(prior,'relationships').map(r=>r?.id));return listAt(next,'relationships').filter(r=>!had.has(r?.id)&&r.from===x.from&&r.to===x.to&&r.kind===x.kind);}
 // A need is saved per application: every need of the application the command wrote.
 if(c.type==='technology.needs'){const had=new Map(listAt(prior,'technology.needs').map(r=>[r?.id,r]));return listAt(next,'technology.needs').filter(r=>r?.applicationId===x.applicationId&&had.get(r.id)!==r);}
 // The record the command answers it wrote, else the one its payload names (a command may answer another record: a
 // connection answers the responsibility it starts from).
 for(const want of [...(Array.isArray(id)?id:[id]),x.id]){if(want==null)continue;const hit=paths.flatMap(path=>listAt(next,path).filter(r=>r?.id===want));if(hit.length)return hit;}
 return [];
}
export function attachProvenanceBlocks(prior,next,command,result){
 const inner=innerCommands(command),ids=list(result?.selectedIds);
 inner.forEach((c,i)=>{
  const raw=c?.payload?.provenance;if(!plain(raw))return;
  const sent=Object.fromEntries(BLOCK_KEYS.filter(k=>Object.hasOwn(raw,k)).map(k=>[k,raw[k]]));if(!Object.keys(sent).length)return;
  const block=provenanceBlock(next,sent);
  const targets=blockTargets(prior,next,c,inner.length>1||command?.type==='workspace.apply'?ids[i]:[result?.created,result?.selected]);
  if(!targets)throw Error('A provenance block is kept on a design record; '+c.type+' writes none.');
  if(!targets.length)throw Error('The provenance block names no record this change wrote ('+c.type+').');
  for(const r of targets){const pv=plain(r.provenance)?{...r.provenance}:{};for(const k of Object.keys(sent))delete pv[k];Object.assign(pv,block);if(Object.keys(pv).length)r.provenance=tidyProvenance(pv);else delete r.provenance;}
 });
 return next;
}

// A record stamped as a commit's on its own (an import's rows, a drafter's records): the same stamp settle gives a
// record a commit made.
export function stampWritten(r,author,at){if(plain(r)&&author)setOwned(r,{kind:author.kind,by:author.id||null,at,...(author.session?{session:author.session}:{})},null);return r;}

// ---------------------------------------------------------------- grouped judgements (the review plan)
// The records a judgement's scope covers, as the plan states it: {kind: 'author', author, chapter?, path?, group?} for
// the records of one author kind not yet reviewed (in one chapter, one collection, or linked to one requirement group),
// or {kind: 'records', ids: ['chapter:id', ...]} for named records.
export function judgementMembers(p,scope){
 if(!plain(scope))throw Error('Name what the judgement covers.');
 const out=[];
 if(scope.kind==='records'){
  const ids=list(scope.ids);if(!ids.length||ids.length>JUDGEMENT_LIMIT)throw Error('A judgement covers 1 to '+count(JUDGEMENT_LIMIT)+' named records.');
  for(const key of new Set(ids.map(String))){const [chapter,...rest]=key.split(':'),hit=findRecord(p,Number(chapter),rest.join(':'));if(!hit)throw Error('Choose records this project holds: '+key.slice(0,80)+' is not one.');out.push({chapter:hit.chapter,id:idOf(hit.record,hit.path),path:hit.path,record:hit.record});}
  return out;
 }
 if(scope.kind!=='author'||!AUTHOR_KINDS.includes(scope.author))throw Error('A judgement covers the records of one author kind, or named records.');
 const chapter=scope.chapter==null||scope.chapter===''?null:Number(scope.chapter),path=scope.path?String(scope.path):null,group=scope.group?String(scope.group):null;
 if(path&&!CHAPTER_OF.has(path))throw Error('Choose a kind of record this workbench keeps.');
 eachRecord(p,(r,ch,pth)=>{
  if(chapter!=null&&ch!==chapter||path&&pth!==path)return;
  if(group&&!list(r.requirementGroupIds).includes(group))return;
  if(authorOf(r)!==scope.author||reviewOf(p,r,ch))return;
  out.push({chapter:ch,id:idOf(r,pth),path:pth,record:r});
 });
 return out;
}
// The fingerprint of what a reviewer saw: each record of the scope with its own fingerprint.
export const judgementStamp=(p,members)=>valueFingerprint(members.map(m=>[m.chapter,m.id,recordStamp(p,m.record)]));
export function scopeWords(scope,n){
 if(scope?.kind==='records')return plural(n,'named record');
 const noun=scope?.path?RECORD_NOUNS[scope.path]||'record':'record';
 return plural(n,noun)+' '+lowerFirst(AUTHOR_WORDS[scope?.author]||'')+(scope?.chapter?' in Chapter '+scope.chapter:'')+(scope?.group?' linked to '+scope.group:'')+', not yet reviewed';
}
// Records one judgement (review.judgement, through review-domain.js): the scope's records as they read now, less the
// exceptions the reviewer names (each with its reason; they stay open), each kept with its fingerprint. The signed-in
// person is the reviewer; with four eyes on, a person does not judge records they wrote themselves.
export function recordJudgement(p,raw,at,actor,{fourEyes=false}={}){
 if(!actor)throw Error('Sign in to record a review: the reviewer is the signed-in person.');
 if(!JUDGEMENT_OUTCOMES.some(([v])=>v===raw.outcome))throw Error('Choose the judgement: kept as drafted, follow-up required, or not applicable.');
 const rationale=clean(raw.rationale),evidence=clean(raw.evidence);
 if(raw.reviewed!==true||!rationale||!evidence)throw Error('Record why, the evidence or sample you reviewed, and that you reviewed every record in scope.');
 if(raw.outcome==='follow-up'&&(!clean(raw.owner,180)||!clean(raw.action)))throw Error('Give the follow-up an accountable owner and a clear next action.');
 const all=judgementMembers(p,raw.scope);
 if(!all.length)throw Error('Nothing in this scope is waiting for review.');
 if(raw.stamp!==judgementStamp(p,all))throw Error('A record in this scope changed, or was reviewed, since you opened it. Reload the plan and review the current records.');
 const exceptions=list(raw.exceptions).map(x=>plain(x)?x:{id:x}),wanted=new Map(exceptions.map(x=>[String(x.id||''),clean(x.reason,600)]));
 const keyOf=m=>recordKey(m.chapter,m.id),unknown=[...wanted.keys()].filter(k=>!all.some(m=>keyOf(m)===k||m.id===k));
 if(unknown.length)throw Error('An exception names a record outside this scope: '+unknown.slice(0,3).join(', ')+'.');
 if([...wanted.values()].some(r=>!r))throw Error('Give each exception its reason: it stays open for review.');
 const excluded=all.filter(m=>wanted.has(keyOf(m))||wanted.has(m.id)),members=all.filter(m=>!excluded.includes(m));
 if(!members.length)throw Error('Every record of the scope is an exception: nothing would be reviewed.');
 if(fourEyes){const own=members.filter(m=>stampOf(m.record)?.kind==='person'&&stampOf(m.record)?.by===actor);if(own.length)throw Error('Four eyes: '+actor+' wrote '+plural(own.length,'of these records','of these records')+' ('+own.slice(0,4).map(keyOf).join(', ')+'). Another person reviews them, or name them as exceptions.');}
 const m=p.finalReview;m.judgements??=[];m.counters.judgement=(m.counters.judgement||0)+1;
 const id='RJ-'+String(m.counters.judgement).padStart(3,'0'),scope=plain(raw.scope)?{kind:raw.scope.kind,...(raw.scope.author?{author:raw.scope.author}:{}),...(raw.scope.chapter!=null&&raw.scope.chapter!==''?{chapter:Number(raw.scope.chapter)}:{}),...(raw.scope.path?{path:String(raw.scope.path)}:{}),...(raw.scope.group?{group:String(raw.scope.group)}:{})}:{};
 m.judgements.push({id,at,actor,scope,label:scopeWords(scope,all.length),outcome:raw.outcome,rationale,evidence,reviewer:clean(raw.reviewer,180),...(raw.outcome==='follow-up'?{owner:clean(raw.owner,180),action:clean(raw.action)}:{}),records:members.map(x=>[x.chapter,x.id,recordStamp(p,x.record)]),exceptions:excluded.map(x=>[x.chapter,x.id,wanted.get(keyOf(x))||wanted.get(x.id)])});
 return id;
}
