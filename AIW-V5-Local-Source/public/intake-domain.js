import {digest} from './brain-integrity.js';
import {columnLabel,WORKBOOK_LIMITS} from './workbook-reader.js';

export const PROJECT_LIMITS=Object.freeze({artefacts:6000,requirements:5000,relationships:20000});
import {INTAKE_FIELDS} from './intake-fields.js';
export {INTAKE_FIELDS} from './intake-fields.js';
// The source assertions kept on an imported requirement's assessment (round 12: every column has a typed field).
export const ASSESSMENT_FIELDS=['category','delivery','validation','reliability','manual','evidence','comments','date','uatCount','uatPass','uatFail','uatBlocked','userNeed','outcome','priorityScore','priorityBand','pglLinked','sourceBasis','mappingMethod','sourceReference','sourceAuthority'];
const normal=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const bounded=(s,n=4000)=>String(s??'').trim().slice(0,n);
export function sheetHeaders(sheet,headerRow){
 const row=sheet.rows.find(r=>r.number===Number(headerRow));if(!row)throw Error('Choose a populated header row.');
 const width=Math.max(...sheet.rows.map(r=>Math.max(0,...r.cells.map(c=>c.column))));
 return Array.from({length:width},(_,i)=>({column:columnLabel(i+1),label:row.cells.find(c=>c.column===i+1)?.value||'Column '+columnLabel(i+1)}));
}
// Each field takes the header that matches its most specific alias, and a column serves one field: a header matching a
// field's first alias wins over one matching a looser alias of another field, whatever their order in the sheet, so
// Capability_Theme is the capability and Module / Theme the module (round 12, D-09). A column held back (personal data
// no one chose to import, round 12, GR-SRC-06) is offered to no field.
export function suggestMapping(headers,{fields=INTAKE_FIELDS,exclude=[]}={}){
 const out=Object.fromEntries(Object.keys(fields).map(f=>[f,''])),taken=new Set(exclude),depth=Math.max(...Object.values(fields).map(f=>f.aliases.length));
 for(let i=0;i<depth;i++)for(const [field,spec] of Object.entries(fields)){if(out[field]||!spec.aliases[i])continue;const h=headers.find(h=>!taken.has(h.column)&&normal(h.label)===spec.aliases[i]);if(h){out[field]=h.column;taken.add(h.column);}}
 return out;
}
export function guessHeader(sheet,fields=INTAKE_FIELDS){return sheet.rows.slice(0,30).map(r=>({row:r.number,score:r.cells.filter(c=>Object.values(fields).some(f=>f.aliases.includes(normal(c.value)))).length})).sort((a,b)=>b.score-a.score||a.row-b.row)[0]?.row||1;}
// One row's cells as the snapshot keeps them: every header column, with the value read (a date-formatted number as its
// ISO date, its stored number in raw), its formula and type; a column of personal data no one chose to import is kept
// blank and marked withheld, so the project never holds it (round 12, GR-SRC-06). The row's hash reads what is kept.
function rowCells(headers,row,withhold){
 const cells=Object.fromEntries(row.cells.map(c=>[c.address.replace(/\d+$/,''),c]));
 const values=headers.map(h=>{const c=cells[h.column];if(withhold.has(h.column))return {column:h.column,label:h.label,address:h.column+row.number,value:'',type:'blank',...(c&&(c.value!==''||c.formula)?{withheld:'personal data'}:{})};return {column:h.column,label:h.label,address:h.column+row.number,value:c?.value||'',...(c?.formula?{formula:c.formula}:{}),type:c?.type||'blank',...(c?.raw!==undefined?{raw:c.raw}:{}),...(c?.style!==undefined?{style:c.style}:{})};});
 return {cells,values,rowHash:digest(values.map(v=>[v.column,v.value,v.formula||'']))};
}
export function mapWorkbookRows(sheet,headerRow,rawMapping,{withhold=[]}={}){
 const headers=sheetHeaders(sheet,headerRow),columns=new Set(headers.map(h=>h.column)),mapping={},held=new Set(withhold);
 for(const [field,spec] of Object.entries(INTAKE_FIELDS)){const column=rawMapping[field]||'';if(column&&!columns.has(column))throw Error('Choose an existing column for '+spec.label+'.');if(spec.required&&!column)throw Error('Map '+spec.label+' before preparing an import.');mapping[field]=column;}
 if(mapping.externalId===mapping.description)throw Error('The ID and statement must use different columns.');
 const personal=Object.entries(mapping).filter(([,c])=>c&&held.has(c));if(personal.length)throw Error(`Column ${personal[0][1]} holds personal data. Choose to import it before mapping it to ${INTAKE_FIELDS[personal[0][0]].label}, or leave it unmapped.`);
 const rows=[],seen=new Map(),skipped=[],duplicates=[];
 for(const row of sheet.rows.filter(r=>r.number>Number(headerRow))){
  const {cells,values,rowHash}=rowCells(headers,row,held),value=field=>cells[mapping[field]]?.value||'';
  if(!value('externalId')&&!value('description')){skipped.push(row.number);continue;}
  const externalId=bounded(value('externalId'),180);if(!externalId||externalId!==value('externalId').trim())throw Error('Row '+row.number+' needs an external ID of at most 180 characters.');
  // Round 12 (GR-INT-05): a row that repeats another cell for cell is reported and dropped; an id held by two rows that
  // differ is still refused, so identities are never merged.
  const first=seen.get(externalId);if(first){if(first.rowHash===rowHash){duplicates.push({externalId,row:row.number,of:first.sourceRow});continue;}throw Error('External ID '+externalId+' occurs more than once. Resolve its identity before importing.');}
  if(!value('description').trim())throw Error('Row '+row.number+' has an ID but no requirement statement.');
  if(value('description').length>4000)throw Error('The statement in row '+row.number+' exceeds 4,000 characters. Split it explicitly before import.');
  for(const f of ['externalId','description'])if(cells[mapping[f]]?.formula)throw Error('Identity and requirement statement must be original values, not formulas. Row '+row.number+' needs review.');
  const fields=Object.fromEntries(Object.keys(INTAKE_FIELDS).map(f=>[f,value(f)])),r={externalId,sourceRow:row.number,fields,values,rowHash};
  seen.set(externalId,r);rows.push(r);
 }
 if(!rows.length)throw Error('No requirement rows were found below this header.');
 if(rows.length>Math.min(PROJECT_LIMITS.requirements,WORKBOOK_LIMITS.rows))throw Error('Split the intake into projects of at most 5,000 requirements.');
 return {mapping,headers,rows,skipped,duplicates,withheld:[...held]};
}
// A long statement's title ends at a word, with an ellipsis; the statement itself stays whole in the description.
export function titleOf(statement){const t=String(statement||'').replace(/\s+/g,' ').trim();if(t.length<=160)return t;const cut=t.slice(0,159),at=cut.lastIndexOf(' ');return (at>=100?cut.slice(0,at):cut).replace(/[\s,;:.\-–]+$/,'')+'…';}
// The priority a band sets (round 12, D-09): the person's mapping from band value to Must, Should or Could, chosen at
// inspect. A row with no band, or with a band the mapping leaves out or maps to "not stated", has no priority: '' (round
// 12, GR-INT-19: not stated, with no basis, sorted last; it used to read as Must).
export const priorityFor=(band,map)=>{const v=String(band||'').trim(),p=v&&map?Object.entries(map).find(([k])=>k.toLowerCase()===v.toLowerCase())?.[1]:'';return ['Must','Should','Could'].includes(p)?p:'';};
export function projectedRequirement(row,source){
 const f=row.fields,assessment=Object.fromEntries(ASSESSMENT_FIELDS.map(k=>[k,f[k]||'']));
 return {externalId:row.externalId,domain:bounded(f.domain,240),capability:bounded(f.capability,240),module:bounded(f.module,240),userGroup:bounded(f.userGroup,240),title:titleOf(f.description),description:f.description.trim(),owner:bounded(f.owner,180),acceptance:bounded(f.acceptance),source:bounded(source.filename+' · '+source.sheet+'!'+source.mapping.description+row.sourceRow,600),priority:priorityFor(f.priorityBand,source.priorityMap),assessment};
}
// extras: what the import proposes and reports besides its rows (intake-proposals.js), covered by the stamp so that the
// apply records what the preview showed: {groups, stakeholders, brief, markup, outcomes, constraints, profile, personal,
// lists, choice}.
// Two mappings are the same when they map the same fields to the same columns, whatever fields either leaves empty: a
// dataset imported before a field existed keeps its identity (round 12). The band mapping is part of it.
const mappedFields=m=>JSON.stringify(Object.entries(m||{}).filter(([,v])=>v).sort(([a],[b])=>a.localeCompare(b)));
export const sameMapping=(a,b)=>mappedFields(a?.mapping)===mappedFields(b?.mapping)&&JSON.stringify(a?.priorityMap||{})===JSON.stringify(b?.priorityMap||{});
// A requirement's own words: an import that changes none of them keeps the person's confirmation, since its source
// assertions (delivery, priority band, …) are separate from confirmation by design.
const OWN_WORDS=['title','description','owner','acceptance'];
export function previewIntake(project,source,priorRows=[],extras={}){
 const dataset=project.intake?.datasets?.find(d=>d.id===source.datasetId),prior=new Map(priorRows.map(r=>[r.externalId,r])),existing=new Map(project.artefacts.filter(a=>a.provenance?.datasetId===source.datasetId).map(a=>[a.externalId,a])),incoming=new Set(source.rows.map(r=>r.externalId));
 const changes=source.rows.map(row=>{
  const old=existing.get(row.externalId),base=prior.get(row.externalId),projection=projectedRequirement(row,source);
  const fields=old?Object.keys(projection).filter(k=>JSON.stringify(old[k]??'')!==JSON.stringify(projection[k]??'')):Object.keys(projection);
  const previous=base?projectedRequirement(base,{...source,filename:dataset?.filename||source.filename,sheet:dataset?.sheet||source.sheet,mapping:dataset?.mapping||source.mapping,priorityMap:dataset?dataset.priorityMap||{}:source.priorityMap}):null;
  const conflicts=old&&previous?fields.filter(k=>JSON.stringify(old[k]??'')!==JSON.stringify(previous[k]??'')):[];
  const changedCells=base?row.values.filter(v=>{const b=base.values.find(x=>x.column===v.column);return (b?.value||'')!==v.value||(b?.formula||'')!==(v.formula||'');}).map(v=>({address:v.address,column:v.column,label:v.label,before:base.values.find(x=>x.column===v.column)?.value||'',after:v.value})):[];
  // An unchanged source never overwrites an architect's edits.
  // An unchanged row stays unchanged under the same mapping, or under another one that projects it the same way.
  const kind=!old?'add':base?.rowHash===row.rowHash&&(sameMapping(dataset,source)||!fields.length)?'unchanged':conflicts.length?'conflict':'update';
  return {externalId:row.externalId,id:old?.id||null,sourceRow:row.sourceRow,title:projection.title,priority:projection.priority,kind,fields,conflicts,changedCells};
 });
 for(const [externalId,a] of existing)if(!incoming.has(externalId))changes.push({externalId,id:a.id,title:a.title,kind:'missing',fields:[],conflicts:[],changedCells:[]});
 const counts=Object.fromEntries(['add','update','unchanged','conflict','missing'].map(k=>[k,changes.filter(c=>c.kind===k).length]));
 if(project.artefacts.length+counts.add>PROJECT_LIMITS.artefacts||project.artefacts.filter(a=>a.type==='requirement').length+counts.add>PROJECT_LIMITS.requirements)throw Error('This import exceeds the supported project workload (5,000 requirements / 6,000 artefacts).');
 // The priorities the band mapping sets, and the rows it leaves not stated (GR-INT-19).
 const priorities={Must:0,Should:0,Could:0,notStated:0};for(const c of changes)if(c.kind!=='missing')priorities[c.priority||'notStated']++;
 const basis={datasetId:source.datasetId,workbookHash:source.workbookHash,sheet:source.sheet,headerRow:source.headerRow,mapping:source.mapping,priorityMap:source.priorityMap||{},withheld:source.withheld||[],revision:source.revision,projectVersion:project.contentVersion,changes,extras};
 return {stamp:digest(basis),counts,changes,skipped:source.skipped||[],duplicates:source.duplicates||[],formulaCount:source.rows.reduce((n,r)=>n+r.values.filter(v=>v.formula).length,0),columns:source.headers.length,rowCount:source.rows.length,priorities,proposals:extras};
}
// What a proposal kept on the receipt was when this import re-proposes it: a person's acceptance or dismissal stands.
const settled=(fresh,previous,key)=>{const was=new Map((previous||[]).filter(x=>x.status!=='proposed').map(x=>[x[key],x]));return (fresh||[]).map(x=>was.get(x[key])||{...x,status:'proposed'});};
// unattended: the import is applied by an agent or service account (round 12, D-06), which reviews nothing: it applies
// the previewed import unreviewed (reviewed:false), and its receipt says so. A person applies it reviewed, as before.
export function applyIntake(project,source,preview,raw,at,actor,{unattended=false}={}){
 if(raw.previewStamp!==preview.stamp||(unattended?raw.reviewed===true:raw.reviewed!==true))throw Error(unattended?'An agent or service account applies the previewed import unreviewed (reviewed:false); a person reviews what it imported.':'Review the current import preview before applying it.');
 if(!preview.counts.add&&!preview.counts.update&&!preview.counts.conflict&&!preview.counts.missing&&project.intake?.datasets?.some(d=>d.id===source.datasetId&&d.workbookHash===source.workbookHash&&sameMapping(d,source)))return {document:project,unchanged:true};
 const decisions=raw.decisions||{};
 for(const c of preview.changes)if(c.kind==='conflict'&&!['keep','replace'].includes(decisions[c.externalId]))throw Error('Choose whether to keep or replace edited fields for '+c.externalId+'.');
 const p=structuredClone(project);p.intake??={version:1,datasets:[]};
 let dataset=p.intake.datasets.find(d=>d.id===source.datasetId);if(!dataset){dataset={id:source.datasetId,versions:[]};p.intake.datasets.push(dataset);}
 const changeById=new Map(preview.changes.map(c=>[c.externalId,c])),artefacts=new Map(p.artefacts.map(a=>[a.id,a]));
 for(const row of source.rows){
  const change=changeById.get(row.externalId);let a=artefacts.get(change.id);
  if(!a){a={id:'REQ-'+String(++p.counters.requirement).padStart(3,'0'),type:'requirement',priority:'',origin:'import',confirmed:false,scopeMode:'in',order:0,modelRef:'',...projectedRequirement(row,source)};p.artefacts.push(a);}
  // Round 12 (DM-07, DM-21): what the import replaces is the source's again (its priority basis, its attributes).
  else if(change.kind==='update'||change.kind==='conflict'&&decisions[row.externalId]==='replace'){const before=OWN_WORDS.map(k=>a[k]);Object.assign(a,projectedRequirement(row,source));delete a.priorityBasis;delete a.attributeOrigin;if(OWN_WORDS.some((k,n)=>before[n]!==a[k]))a.confirmed=false;}
  a.provenance={datasetId:source.datasetId,revision:source.revision,sourceRow:row.sourceRow,workbookHash:source.workbookHash,rowHash:row.rowHash,sheet:source.sheet,sourceExcerpt:JSON.stringify({externalId:row.externalId,...row.fields}),cells:Object.fromEntries(Object.entries(source.mapping).filter(([,v])=>v).map(([k,v])=>[k,v+row.sourceRow])),...(change.kind==='conflict'&&decisions[row.externalId]==='keep'?{retainedEdits:true}:{} )};
  delete a.sourceMissing;
 }
 for(const c of preview.changes.filter(c=>c.kind==='missing')){const a=artefacts.get(c.id);a.sourceMissing={at,revision:source.revision};a.confirmed=false;}
 // The receipt keeps the band mapping, the priorities it set, and what the import proposes for the person to accept or
 // dismiss in Chapter 1 (stakeholders, a brief, outcomes, constraints); groups are created by the service from the same
 // preview. Round 12 (GR-INT-06, GR-SRC-03 to -06): with the header of each mapped column (a re-import proposes the
 // same mapping by header), the profile of the mapped columns, the personal data held back, the exact duplicate rows
 // dropped, and the lists of its own requirements the workbook keeps elsewhere.
 const x=preview.proposals||{},stakeholders=(x.stakeholders?.values||[]).filter(s=>s.status!=='exists').map(s=>({name:s.name,count:s.count,gaps:s.gaps,status:s.status||'proposed',...(s.recordId?{recordId:s.recordId}:{}),...(s.at?{at:s.at,actor:s.actor}:{})}));
 const prior=dataset.proposals?.brief,brief=prior&&prior.status!=='proposed'?prior:x.brief?{sentences:x.brief.sentences,sheets:x.brief.sheets,status:'proposed'}:null;
 const meta={revision:source.revision,workbookHash:source.workbookHash,snapshotKey:source.snapshotKey,uploadId:source.uploadId,filename:source.filename,sheet:source.sheet,headerRow:source.headerRow,mapping:source.mapping,priorityMap:source.priorityMap||{},priorities:preview.priorities,rowCount:source.rows.length,columnCount:source.headers.length,at,actor,previewStamp:preview.stamp,counts:preview.counts,...(unattended?{reviewed:false}:{}),
  proposals:{stakeholders,...(x.stakeholders?{stakeholderColumn:x.stakeholders.column,stakeholderLabel:x.stakeholders.label}:{}),brief},markup:(x.markup||[]).map(m=>m.externalId)};
 const outcomes=settled(x.outcomes,dataset.proposals?.outcomes,'key'),constraints=settled(x.constraints,dataset.proposals?.constraints,'key');
 Object.assign(meta.proposals,outcomes.length?{outcomes}:{},constraints.length?{constraints}:{});
 Object.assign(meta,{mappingLabels:Object.fromEntries(Object.entries(source.mapping).filter(([,v])=>v).map(([k,v])=>[k,source.headers.find(h=>h.column===v)?.label||'']))},x.profile?{profile:x.profile}:{},x.personal?.length?{personal:x.personal}:{},preview.duplicates?.length?{duplicates:{count:preview.duplicates.length,rows:preview.duplicates.slice(0,200)}}:{},x.lists?.length?{sourceLists:x.lists}:{});
 dataset.versions.push(meta);Object.assign(dataset,meta);p.intake.version++;p.contentVersion++;p.review=null;p.handoff=null;
 return {document:p,selected:p.artefacts.find(a=>a.provenance?.datasetId===source.datasetId)?.id,imported:preview.counts};
}

// ---------------------------------------------------------------- source assertions, as the journal reads them
// Round 12 (GR-INT-03): what an import asserts of a requirement besides its words: the attributes it groups by and the
// assessment it keeps. A change to one of the first kind (`review: true`) can move what was designed on the requirement
// (its delivery, validation, reliability, manual work, category, priority band, domain, theme, module, user group); the
// rest describe the source (dates, comments, test counts, references) and are journalled without opening a review.
export const SOURCE_ASSERTIONS=[['delivery','Delivery',true],['validation','Validation',true],['reliability','Reliability',true],['manual','Manual intervention',true],['category','Promise or change category',true],['priorityBand','Source priority band',true],['domain','Domain',true],['capability','Capability theme',true],['module','Module',true],['userGroup','User group',true],['priorityScore','Source priority score',false],['evidence','Evidence reference',false],['comments','Source comments',false],['date','Assessment date',false],['uatCount','Historical test count',false],['uatPass','Historical passed',false],['uatFail','Historical failed',false],['uatBlocked','Historical blocked',false],['userNeed','User need',false],['outcome','Intended outcome',false],['pglLinked','Post-go-live link',false],['sourceBasis','Source basis',false],['mappingMethod','Mapping method',false],['sourceReference','Source reference',false],['sourceAuthority','Source authority',false]];
const TOP_ASSERTIONS=new Set(['domain','capability','module','userGroup']);
const assertionOf=(a,k)=>String((TOP_ASSERTIONS.has(k)?a?.[k]:a?.assessment?.[k])??'').trim();
// The requirements of a dataset whose source assertions an import changed: [{id, fields: [{key, label, before, after}],
// review}] (review: a field that can move the design changed), in register order. A requirement the import added or a
// person's attribute kept by a reviewed "keep" is not a change of the source's assertion.
export function assertionChanges(before,after,datasetId){
 const was=new Map(before.artefacts.filter(a=>a.type==='requirement').map(a=>[a.id,a])),out=[];
 for(const a of after.artefacts){
  if(a.type!=='requirement'||a.provenance?.datasetId!==datasetId)continue;const old=was.get(a.id);if(!old?.provenance)continue;
  const fields=SOURCE_ASSERTIONS.filter(([k])=>assertionOf(old,k)!==assertionOf(a,k)).map(([k,label,review])=>({key:k,label:label+' (source assertion)',before:assertionOf(old,k),after:assertionOf(a,k),review}));
  if(fields.length)out.push({id:a.id,fields:fields.map(({review,...f})=>f),review:fields.some(f=>f.review)});
 }
 return out;
}

// ---------------------------------------------------------------- enriching from a further sheet (round 12, GR-INT-05)
// A further sheet of a workbook (test keys, issue keys, a later status) adds to the requirements an import made and
// creates none: its rows join on a column of requirement ids, a row that repeats another cell for cell is reported and
// dropped, and each matched requirement keeps what the sheet says of it, by dataset, in `enrichment` (evidence keys,
// test status, assertions, comments), never over the requirement sheet's own assertions. A row whose id is no
// requirement of the project is reported. A column of personal data is held back unless the person chooses it.
export const ENRICH_FIELDS={
 joinId:{label:'Requirement ID to match',required:true,aliases:['mappedrequirementid','requirementid','externalrequirementid','baselineid','externalid','reqid','id']},
 evidence:{label:'Evidence reference',aliases:['evidencereference','evidenceref','evidence','evidenceid','evidencelink']},
 testCase:{label:'Test case key',aliases:['testcasekey','testcaseid','testcase','testkey','testid']},
 execution:{label:'Test execution key',aliases:['executionkey','testexecutionkey','executionid','testexecution','testrun','runid']},
 issues:{label:'Linked issue or defect keys',aliases:['linkedissues','linkedissue','issuekeys','issues','defects','defectids','defectkeys','ticketkeys']},
 testStatus:{label:'Test status',aliases:['teststatus','executionstatus','testresult','result']},
 delivery:{label:'Delivery assertion',aliases:['deliverystatus']},
 validation:{label:'Validation assertion',aliases:['functionalvalidation','validationstatus']},
 reliability:{label:'Reliability assertion',aliases:['reliabilitystatus','reliability']},
 comments:{label:'Comments',aliases:['comments','notes','remarks']}
};
export const ENRICH_LIMITS=Object.freeze({value:600,unmatched:50,duplicates:200});
// The join column: the one whose cells hold the most ids of the project's requirements (at least one), else the column
// an alias names.
export function suggestEnrichMapping(sheet,headerRow,knownIds,{exclude=[]}={}){
 const headers=sheetHeaders(sheet,headerRow),out=suggestMapping(headers,{fields:ENRICH_FIELDS,exclude}),hits=new Map();
 for(const row of sheet.rows)if(row.number>Number(headerRow))for(const c of row.cells){const col=c.address.replace(/\d+$/,'');if(!exclude.includes(col)&&knownIds.has(String(c.value).trim()))hits.set(col,(hits.get(col)||0)+1);}
 const best=[...hits].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 if(best&&best[1]>(hits.get(out.joinId)||0)){for(const k of Object.keys(out))if(out[k]===best[0])out[k]='';out.joinId=best[0];}
 return {headers,mapping:out,matches:best?best[1]:0};
}
export function mapEnrichRows(sheet,headerRow,rawMapping,{withhold=[]}={}){
 const headers=sheetHeaders(sheet,headerRow),columns=new Set(headers.map(h=>h.column)),mapping={},held=new Set(withhold);
 for(const [field,spec] of Object.entries(ENRICH_FIELDS)){const column=rawMapping?.[field]||'';if(column&&!columns.has(column))throw Error('Choose an existing column for '+spec.label+'.');if(spec.required&&!column)throw Error('Map '+spec.label+' before preparing an enrichment.');mapping[field]=column;}
 const personal=Object.entries(mapping).filter(([,c])=>c&&held.has(c));if(personal.length)throw Error(`Column ${personal[0][1]} holds personal data. Choose to import it before mapping it to ${ENRICH_FIELDS[personal[0][0]].label}, or leave it unmapped.`);
 if(!Object.entries(mapping).some(([k,c])=>k!=='joinId'&&c))throw Error('Map at least one column to add to the requirements.');
 const rows=[],seen=new Map(),duplicates=[],noId=[],filled=new Map(headers.map(h=>[h.column,0]));
 for(const row of sheet.rows.filter(r=>r.number>Number(headerRow))){
  const {cells,values,rowHash}=rowCells(headers,row,held);if(!values.some(v=>v.value!==''||v.formula||v.withheld))continue;
  for(const v of values)if(v.value!==''||v.withheld)filled.set(v.column,filled.get(v.column)+1);
  const first=seen.get(rowHash);if(first){duplicates.push({row:row.number,of:first});continue;}seen.set(rowHash,row.number);
  const joinId=String(cells[mapping.joinId]?.value??'').trim();if(!joinId){noId.push(row.number);continue;}
  rows.push({joinId,sourceRow:row.number,fields:Object.fromEntries(Object.entries(mapping).filter(([k,c])=>k!=='joinId'&&c).map(([k,c])=>[k,String(cells[c]?.value??'').trim()])),values,rowHash});
 }
 // GR-SRC-05: the columns no row fills (a status column left blank throughout).
 const blankColumns=headers.filter(h=>!filled.get(h.column)&&!/^Column [A-Z]+$/.test(h.label)).map(h=>({column:h.column,label:h.label}));
 return {mapping,headers,rows,duplicates,noId,blankColumns,withheld:[...held]};
}
// Every value a field takes across a requirement's rows, once each, in row order.
const combine=xs=>{const out=[];for(const x of xs)for(const v of String(x||'').split(/\s*;\s*/))if(v&&!out.includes(v))out.push(v);return out.join('; ');};
export function previewEnrich(project,source,extras={}){
 const reqs=new Map(project.artefacts.filter(a=>a.type==='requirement'&&a.externalId).map(a=>[String(a.externalId).trim(),a])),by=new Map(),unmatched=[];
 for(const r of source.rows){const a=reqs.get(r.joinId);if(!a){unmatched.push(r);continue;}if(!by.has(a.id))by.set(a.id,{a,rows:[]});by.get(a.id).rows.push(r);}
 const fieldKeys=Object.keys(source.mapping).filter(k=>k!=='joinId'&&source.mapping[k]),changes=[];
 for(const {a,rows} of by.values()){
  const fields=Object.fromEntries(fieldKeys.map(k=>[k,combine(rows.map(r=>r.fields[k])).slice(0,ENRICH_LIMITS.value)]).filter(([,v])=>v));
  const entry={revision:source.revision,sheet:source.sheet,rows:rows.map(r=>r.sourceRow),fields,rowHash:digest(rows.map(r=>r.rowHash))},old=a.enrichment?.[source.datasetId];
  changes.push({id:a.id,externalId:a.externalId,kind:!old?'add':JSON.stringify(old.fields)===JSON.stringify(fields)&&JSON.stringify(old.rows)===JSON.stringify(entry.rows)?'unchanged':'update',entry});
 }
 for(const a of project.artefacts)if(a.enrichment?.[source.datasetId]&&!by.has(a.id))changes.push({id:a.id,externalId:a.externalId,kind:'missing'});
 const count=k=>changes.filter(c=>c.kind===k).length;
 const counts={rows:source.rows.length+source.duplicates.length+source.noId.length,kept:source.rows.length,duplicates:source.duplicates.length,noId:source.noId.length,matched:source.rows.length-unmatched.length,unmatched:unmatched.length,requirements:by.size,add:count('add'),update:count('update'),unchanged:count('unchanged'),missing:count('missing')};
 const report={unmatched:[...new Set(unmatched.map(r=>r.joinId))].slice(0,ENRICH_LIMITS.unmatched),duplicates:source.duplicates.slice(0,ENRICH_LIMITS.duplicates),blankColumns:source.blankColumns,rowReferences:extras.rowReferences||[],personal:extras.personal||[]};
 const basis={datasetId:source.datasetId,workbookHash:source.workbookHash,sheet:source.sheet,headerRow:source.headerRow,mapping:source.mapping,withheld:source.withheld,revision:source.revision,projectVersion:project.contentVersion,changes,report};
 return {mode:'enrich',stamp:digest(basis),counts,changes,...report,columns:source.headers.length,joinColumn:source.mapping.joinId};
}
// unattended: as applyIntake (round 12, D-06): an agent or service account applies the previewed enrichment unreviewed.
export function applyEnrich(project,source,preview,raw,at,actor,{unattended=false}={}){
 if(raw.previewStamp!==preview.stamp||(unattended?raw.reviewed===true:raw.reviewed!==true))throw Error(unattended?'An agent or service account applies the previewed enrichment unreviewed (reviewed:false); a person reviews what it added.':'Review the current enrichment preview before applying it.');
 if(!preview.counts.add&&!preview.counts.update&&!preview.counts.missing&&project.intake?.datasets?.some(d=>d.id===source.datasetId&&d.workbookHash===source.workbookHash))return {document:project,unchanged:true};
 const p=structuredClone(project);p.intake??={version:1,datasets:[]};
 let dataset=p.intake.datasets.find(d=>d.id===source.datasetId);if(!dataset){dataset={id:source.datasetId,mode:'enrich',versions:[]};p.intake.datasets.push(dataset);}
 const byId=new Map(p.artefacts.map(a=>[a.id,a])),touched=[];
 for(const c of preview.changes){const a=byId.get(c.id);if(!a||c.kind==='unchanged')continue;touched.push(a.id);if(c.kind==='missing'){delete a.enrichment[source.datasetId];if(!Object.keys(a.enrichment).length)delete a.enrichment;}else a.enrichment={...(a.enrichment||{}),[source.datasetId]:c.entry};}
 const mappingLabels=Object.fromEntries(Object.entries(source.mapping).filter(([,v])=>v).map(([k,v])=>[k,source.headers.find(h=>h.column===v)?.label||'']));
 const meta={mode:'enrich',revision:source.revision,workbookHash:source.workbookHash,snapshotKey:source.snapshotKey,uploadId:source.uploadId,filename:source.filename,sheet:source.sheet,headerRow:source.headerRow,mapping:source.mapping,mappingLabels,joinColumn:source.mapping.joinId,rowCount:preview.counts.rows,columnCount:source.headers.length,at,actor,previewStamp:preview.stamp,...(unattended?{reviewed:false}:{}),counts:preview.counts,
  unmatched:preview.unmatched,duplicates:{count:preview.counts.duplicates,rows:preview.duplicates},blankColumns:preview.blankColumns,rowReferences:preview.rowReferences,...(preview.personal?.length?{personal:preview.personal}:{})};
 dataset.versions.push(meta);Object.assign(dataset,meta);p.intake.version++;
 return {document:p,touched,imported:preview.counts};
}
