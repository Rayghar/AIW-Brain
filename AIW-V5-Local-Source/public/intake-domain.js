import {digest} from './brain-integrity.js';
import {columnLabel,WORKBOOK_LIMITS} from './workbook-reader.js';

export const PROJECT_LIMITS=Object.freeze({artefacts:6000,requirements:5000,relationships:20000});
export const INTAKE_FIELDS={
 externalId:{label:'External requirement ID',required:true,aliases:['baselineid','requirementid','externalid','id']},
 description:{label:'Requirement statement',required:true,aliases:['requirementstatement','requirement','description','statement']},
 domain:{label:'Domain',aliases:['domain']},capability:{label:'Capability',aliases:['capabilitytheme','capability','moduletheme']},
 owner:{label:'Accountable owner',aliases:['owner','accountableowner']},acceptance:{label:'Acceptance criterion',aliases:['acceptance','acceptancecriteria']},
 category:{label:'Promise / change category',aliases:['assessmentcategory','category']},delivery:{label:'Delivery assertion',aliases:['deliverystatus']},validation:{label:'Validation assertion',aliases:['functionalvalidation','validationstatus']},reliability:{label:'Reliability assertion',aliases:['reliabilitystatus']},manual:{label:'Manual intervention',aliases:['manualintervention']},
 evidence:{label:'Evidence reference',aliases:['evidencereference']},comments:{label:'Source comments',aliases:['ownercomments','comments']},date:{label:'Assessment date',aliases:['validationdate','assessmentdate']},
 uatCount:{label:'Historical test count',aliases:['uattestcount']},uatPass:{label:'Historical passed',aliases:['uatpass']},uatFail:{label:'Historical failed',aliases:['uatfail']},uatBlocked:{label:'Historical blocked',aliases:['uatblocked']},
 userNeed:{label:'User need',aliases:['userneed']},outcome:{label:'Intended outcome',aliases:['intendedoutcome']},priorityScore:{label:'Source priority score',aliases:['v2priorityscore','priorityscore']},priorityBand:{label:'Source priority band',aliases:['v2priorityband','priorityband']}
};
const normal=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const bounded=(s,n=4000)=>String(s??'').trim().slice(0,n);
export function sheetHeaders(sheet,headerRow){
 const row=sheet.rows.find(r=>r.number===Number(headerRow));if(!row)throw Error('Choose a populated header row.');
 const width=Math.max(...sheet.rows.map(r=>Math.max(0,...r.cells.map(c=>c.column))));
 return Array.from({length:width},(_,i)=>({column:columnLabel(i+1),label:row.cells.find(c=>c.column===i+1)?.value||'Column '+columnLabel(i+1)}));
}
export function suggestMapping(headers){return Object.fromEntries(Object.entries(INTAKE_FIELDS).map(([field,spec])=>[field,headers.find(h=>spec.aliases.includes(normal(h.label)))?.column||'']));}
export function guessHeader(sheet){return sheet.rows.slice(0,30).map(r=>({row:r.number,score:r.cells.filter(c=>Object.values(INTAKE_FIELDS).some(f=>f.aliases.includes(normal(c.value)))).length})).sort((a,b)=>b.score-a.score||a.row-b.row)[0]?.row||1;}
export function mapWorkbookRows(sheet,headerRow,rawMapping){
 const headers=sheetHeaders(sheet,headerRow),columns=new Set(headers.map(h=>h.column)),mapping={};
 for(const [field,spec] of Object.entries(INTAKE_FIELDS)){const column=rawMapping[field]||'';if(column&&!columns.has(column))throw Error('Choose an existing column for '+spec.label+'.');if(spec.required&&!column)throw Error('Map '+spec.label+' before preparing an import.');mapping[field]=column;}
 if(mapping.externalId===mapping.description)throw Error('The ID and statement must use different columns.');
 const rows=[],seen=new Set(),skipped=[];
 for(const row of sheet.rows.filter(r=>r.number>Number(headerRow))){
  const cells=Object.fromEntries(row.cells.map(c=>[c.address.replace(/\d+$/,''),c])),value=field=>cells[mapping[field]]?.value||'';
  if(!value('externalId')&&!value('description')){skipped.push(row.number);continue;}
  const externalId=bounded(value('externalId'),180);if(!externalId||externalId!==value('externalId').trim())throw Error('Row '+row.number+' needs an external ID of at most 180 characters.');
  if(seen.has(externalId))throw Error('External ID '+externalId+' occurs more than once. Resolve its identity before importing.');seen.add(externalId);
  if(!value('description').trim())throw Error('Row '+row.number+' has an ID but no requirement statement.');
  if(value('description').length>4000)throw Error('The statement in row '+row.number+' exceeds 4,000 characters. Split it explicitly before import.');
  for(const f of ['externalId','description'])if(cells[mapping[f]]?.formula)throw Error('Identity and requirement statement must be original values, not formulas. Row '+row.number+' needs review.');
  const fields=Object.fromEntries(Object.keys(INTAKE_FIELDS).map(f=>[f,value(f)]));
  rows.push({externalId,sourceRow:row.number,fields,values:headers.map(h=>({column:h.column,label:h.label,address:h.column+row.number,value:cells[h.column]?.value||'',...(cells[h.column]?.formula?{formula:cells[h.column].formula}:{}),type:cells[h.column]?.type||'blank',...(cells[h.column]?.style!==undefined?{style:cells[h.column].style}:{})})),rowHash:digest(headers.map(h=>[h.column,cells[h.column]?.value||'',cells[h.column]?.formula||'']))});
 }
 if(!rows.length)throw Error('No requirement rows were found below this header.');
 if(rows.length>Math.min(PROJECT_LIMITS.requirements,WORKBOOK_LIMITS.rows))throw Error('Split the intake into projects of at most 5,000 requirements.');
 return {mapping,headers,rows,skipped};
}
export function projectedRequirement(row,source){
 const f=row.fields,assessment=Object.fromEntries(['category','delivery','validation','reliability','manual','evidence','comments','date','uatCount','uatPass','uatFail','uatBlocked','userNeed','outcome','priorityScore','priorityBand'].map(k=>[k,f[k]||'']));
 return {externalId:row.externalId,domain:bounded(f.domain,240),capability:bounded(f.capability,240),title:bounded(f.description,160),description:f.description.trim(),owner:bounded(f.owner,180),acceptance:bounded(f.acceptance),source:bounded(source.filename+' · '+source.sheet+'!'+source.mapping.description+row.sourceRow,600),assessment};
}
export function previewIntake(project,source,priorRows=[]){
 const dataset=project.intake?.datasets?.find(d=>d.id===source.datasetId),prior=new Map(priorRows.map(r=>[r.externalId,r])),existing=new Map(project.artefacts.filter(a=>a.provenance?.datasetId===source.datasetId).map(a=>[a.externalId,a])),incoming=new Set(source.rows.map(r=>r.externalId));
 const changes=source.rows.map(row=>{
  const old=existing.get(row.externalId),base=prior.get(row.externalId),projection=projectedRequirement(row,source);
  const fields=old?Object.keys(projection).filter(k=>JSON.stringify(old[k]??'')!==JSON.stringify(projection[k]??'')):Object.keys(projection);
  const previous=base?projectedRequirement(base,{...source,filename:dataset?.filename||source.filename,sheet:dataset?.sheet||source.sheet,mapping:dataset?.mapping||source.mapping}):null;
  const conflicts=old&&previous?fields.filter(k=>JSON.stringify(old[k]??'')!==JSON.stringify(previous[k]??'')):[];
  const changedCells=base?row.values.filter(v=>{const b=base.values.find(x=>x.column===v.column);return (b?.value||'')!==v.value||(b?.formula||'')!==(v.formula||'');}).map(v=>({address:v.address,column:v.column,label:v.label,before:base.values.find(x=>x.column===v.column)?.value||'',after:v.value})):[];
  // An unchanged source never overwrites an architect's edits.
  const kind=!old?'add':base?.rowHash===row.rowHash&&JSON.stringify(dataset?.mapping||{})===JSON.stringify(source.mapping||{})?'unchanged':conflicts.length?'conflict':'update';
  return {externalId:row.externalId,id:old?.id||null,sourceRow:row.sourceRow,title:projection.title,kind,fields,conflicts,changedCells};
 });
 for(const [externalId,a] of existing)if(!incoming.has(externalId))changes.push({externalId,id:a.id,title:a.title,kind:'missing',fields:[],conflicts:[],changedCells:[]});
 const counts=Object.fromEntries(['add','update','unchanged','conflict','missing'].map(k=>[k,changes.filter(c=>c.kind===k).length]));
 if(project.artefacts.length+counts.add>PROJECT_LIMITS.artefacts||project.artefacts.filter(a=>a.type==='requirement').length+counts.add>PROJECT_LIMITS.requirements)throw Error('This import exceeds the supported project workload (5,000 requirements / 6,000 artefacts).');
 const basis={datasetId:source.datasetId,workbookHash:source.workbookHash,sheet:source.sheet,headerRow:source.headerRow,mapping:source.mapping,revision:source.revision,projectVersion:project.contentVersion,changes};
 return {stamp:digest(basis),counts,changes,skipped:source.skipped||[],formulaCount:source.rows.reduce((n,r)=>n+r.values.filter(v=>v.formula).length,0),columns:source.headers.length,rowCount:source.rows.length};
}
export function applyIntake(project,source,preview,raw,at,actor){
 if(raw.previewStamp!==preview.stamp||raw.reviewed!==true)throw Error('Review the current import preview before applying it.');
 if(!preview.counts.add&&!preview.counts.update&&!preview.counts.conflict&&!preview.counts.missing&&project.intake?.datasets?.some(d=>d.id===source.datasetId&&d.workbookHash===source.workbookHash&&digest(d.mapping)===digest(source.mapping)))return {document:project,unchanged:true};
 const decisions=raw.decisions||{};
 for(const c of preview.changes)if(c.kind==='conflict'&&!['keep','replace'].includes(decisions[c.externalId]))throw Error('Choose whether to keep or replace edited fields for '+c.externalId+'.');
 const p=structuredClone(project);p.intake??={version:1,datasets:[]};
 let dataset=p.intake.datasets.find(d=>d.id===source.datasetId);if(!dataset){dataset={id:source.datasetId,versions:[]};p.intake.datasets.push(dataset);}
 const changeById=new Map(preview.changes.map(c=>[c.externalId,c])),artefacts=new Map(p.artefacts.map(a=>[a.id,a]));
 for(const row of source.rows){
  const change=changeById.get(row.externalId);let a=artefacts.get(change.id);
  if(!a){a={id:'REQ-'+String(++p.counters.requirement).padStart(3,'0'),type:'requirement',priority:'Must',origin:'import',confirmed:false,scopeMode:'in',order:0,modelRef:'',...projectedRequirement(row,source)};p.artefacts.push(a);}
  else if(change.kind==='update'||change.kind==='conflict'&&decisions[row.externalId]==='replace'){Object.assign(a,projectedRequirement(row,source));a.confirmed=false;}
  a.provenance={datasetId:source.datasetId,revision:source.revision,sourceRow:row.sourceRow,workbookHash:source.workbookHash,rowHash:row.rowHash,sheet:source.sheet,sourceExcerpt:JSON.stringify({externalId:row.externalId,...row.fields}),cells:Object.fromEntries(Object.entries(source.mapping).filter(([,v])=>v).map(([k,v])=>[k,v+row.sourceRow])),...(change.kind==='conflict'&&decisions[row.externalId]==='keep'?{retainedEdits:true}:{} )};
  delete a.sourceMissing;
 }
 for(const c of preview.changes.filter(c=>c.kind==='missing')){const a=artefacts.get(c.id);a.sourceMissing={at,revision:source.revision};a.confirmed=false;}
 const meta={revision:source.revision,workbookHash:source.workbookHash,snapshotKey:source.snapshotKey,uploadId:source.uploadId,filename:source.filename,sheet:source.sheet,headerRow:source.headerRow,mapping:source.mapping,rowCount:source.rows.length,columnCount:source.headers.length,at,actor,previewStamp:preview.stamp,counts:preview.counts};
 dataset.versions.push(meta);Object.assign(dataset,meta);p.intake.version++;p.contentVersion++;p.review=null;p.handoff=null;
 return {document:p,selected:p.artefacts.find(a=>a.provenance?.datasetId===source.datasetId)?.id,imported:preview.counts};
}
