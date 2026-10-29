// Chapter 1 at the size of a real project (round 12, D-03 and D-09): the commands that work on many requirements at
// once, and the selection and finding causes the Requirements page shows. Read by the server (worker.js, registered
// under the prefix requirements.) and by the Chapter 1 page (requirements.js), so the count a person sees is the count
// the server checks. The Projects page never loads it.
//
//   requirements.group          create or update a requirement group (requirement-groups.js): {id?, title, kind,
//                               description, owner, memberIds, rule}.
//   requirements.group-delete   remove a group no other record links: {id}. A module with sub-modules is not removed.
//   requirements.modules-propose  AIW's module structure from the requirements' columns (module-model.js, round 24,
//                               D-24-02): {first?, second?} names the columns, else AIW chooses. Refused while a
//                               structure exists. Saved as proposed; a domain group with the same rule becomes the module.
//   requirements.modules-accept   a person accepts the structure: {reviewed: true}. Refused while a requirement is in no
//                               module or in two; an agent or a draft by Sol cannot send it (authorship.js).
//   requirements.modules-discard  removes the structure no record links: created groups go, converted ones return to the
//                               kind they had.
//   requirements.confirm        confirm many requirements in one reviewed step: {ids | filter, count, reviewed: true}.
//                               The count is the number the person saw; a different number now is refused. The change
//                               journal records the step once, with the requirements it confirmed.
//   requirements.evidence       record, for requirements whose source gives no evidence reference, why none exists
//                               (or remove that record): {ids | filter, reason, count, reviewed: true, remove?}. The
//                               "missing evidence" finding clears while the record's source row is unchanged.
//   requirements.journey-treatment  record, for requirements that belong on no journey step, why (or remove that record):
//                               {ids | filter, reason, count, reviewed: true, remove?} (round 12, DRF-05). The journey-link
//                               finding clears while the reason stands; a step of a supporting or administrative
//                               process is a journey step too (requirements-domain.js PROCESS_KINDS).
//   requirements.proposals      accept or dismiss what an import proposed: stakeholders from a user-group column, a
//                               brief from the workbook's overview sheets, outcomes from the intended outcomes that
//                               differ from the statement, constraints from the rows that name a regulator or an
//                               instrument: {datasetId, stakeholders: {accept, dismiss}, brief: {accept: {problem, goal,
//                               source}} | {dismiss: true}, outcomes: {accept, dismiss}, constraints: {accept, dismiss},
//                               reviewed: true}. An accepted outcome is delivered by the requirements it came from; an
//                               accepted constraint constrains them and gets its constraint driver (kind C, Chapter 2).
//   requirements.repeated       record a person's judgement of a group of identical statements whose source statuses
//                               disagree (round 12, GR-SRC-02): {group, judgement: 'same requirement' | 'distinct scope',
//                               reason, reviewed: true}. The same requirement is linked "duplicates"; either judgement
//                               answers the conflict while the rows are the ones judged.
// Nothing here approves anything: confirming records a person's review, and a treatment records a reason.
import {GROUP_KINDS,GROUP_RULE_FIELDS,GROUP_LIMITS,RULE_OPS,groupIndex,groupById,migratedId,searchText} from './requirement-groups.js';
import {applyCommand,findings} from './requirements-domain.js';
import {PROJECT_LIMITS} from './intake-domain.js';
import {withChanges} from './changes-domain.js';
import {documentCopy,handOver} from './document-memo.js';
import {hasEvidence,sourceAssurance,repeatJudgementBasis} from './assurance-domain.js';
import {applyQualityCommand} from './quality-domain.js';
import {proposeModules,applyModuleProposal,moduleTree,isModuleKind,MODULE_ROLES,PLATFORM_CONCERNS} from './module-model.js';
const text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'';
const plural=(n,one,many)=>n.toLocaleString('en-GB')+' '+(n===1?one:many);
const isGap=a=>!!a.assessment?.delivery&&String(a.assessment.delivery).trim().toLowerCase()!=='delivered';
// The register's search reads searchText (requirement-groups.js), the text every requirement search reads.
export const FILTER_KEYS=['groupId','domain','gaps','q','cause','unconfirmed','noEvidence','module'];
// The requirements a selection names: explicit ids, or a filter over the register (group, domain, delivery gaps,
// search text, a finding's cause, unconfirmed only, no evidence reference, a module or sub-module). In register order.
// Round 24 (D-24-08): `module` is the screens' module scope: the requirements whose place in the structure is that module
// or sub-module (module-model.js moduleTree home, as module-scope.js reads a scope), so a bulk step under a scope selects
// what the register shows; an id that names no module or sub-module selects none.
export function selectRequirements(p,selection={}){
 const reqs=(p?.artefacts||[]).filter(a=>a.type==='requirement');
 if(Array.isArray(selection.ids)){const want=new Set(selection.ids.map(String));return reqs.filter(a=>want.has(a.id));}
 const f=selection.filter&&typeof selection.filter==='object'?selection.filter:{};
 let out=reqs;
 if(f.groupId){const members=new Set(groupIndex(p).members.get(String(f.groupId))||[]);out=out.filter(a=>members.has(a.id));}
 if(f.module){const id=String(f.module),home=moduleTree(p).home;out=out.filter(a=>{const h=home.get(a.id);return !!h&&(h.moduleId===id||h.subId===id);});}
 if(f.domain)out=out.filter(a=>a.domain===f.domain);
 if(f.gaps)out=out.filter(isGap);
 if(f.unconfirmed)out=out.filter(a=>!a.confirmed);
 if(f.noEvidence)out=out.filter(a=>a.assessment&&!hasEvidence(a));
 if(f.cause){const ids=new Set(findings(p).filter(x=>x.code===f.cause).map(x=>x.artefactId));out=out.filter(a=>ids.has(a.id));}
 const q=text(f.q,240).toLowerCase();if(q)out=out.filter(a=>searchText(a).includes(q));
 return out;
}
// ---------------------------------------------------------------- findings by cause
// One line per cause instead of one per record: what a cause means for the records it affects, in a sentence that names
// how many, never the records themselves.
const SENTENCES={
 'journey-link':n=>`${plural(n,'requirement is','requirements are')} needed at no journey step.`,
 'outcome-link':n=>`${plural(n,'requirement delivers','requirements deliver')} no business outcome.`,
 accountability:n=>`${plural(n,'requirement has','requirements have')} no accountable owner or source.`,
 acceptance:n=>`${plural(n,'requirement has','requirements have')} acceptance that cannot be tested yet.`,
 confirmation:n=>`${plural(n,'record is','records are')} not confirmed by you yet.`,
 'source-evidence':n=>`${plural(n,'imported requirement has','imported requirements have')} no evidence reference and no recorded reason.`,
 'source-markup':n=>`${plural(n,'statement holds','statements hold')} pasted markup.`,
 'test-cycle':n=>`${plural(n,'requirement has','requirements have')} test counts that disagree with the delivery status.`,
 duplicate:n=>`${plural(n,'record repeats','records repeat')} the title of another record.`,
 'source-conflict':n=>`${plural(n,'delivered requirement carries','delivered requirements carry')} a source comment that disagrees.`,
 'delivery-assurance':n=>`${plural(n,'delivered requirement needs','delivered requirements need')} more assurance.`,
 ambiguity:n=>`${plural(n,'requirement cannot','requirements cannot')} be tested as worded: subjective or open words, an unnamed regulation, a quality with no target, or a fragment.`,
 // Round 12 (GR-INT-04, GR-INT-09, GR-SRC-02, GR-SRC-04).
 'test-objective':n=>`${plural(n,'statement reads','statements read')} as a test objective, not as the requirement it tests.`,
 'repeat-conflict':n=>`${plural(n,'requirement repeats','requirements repeat')} a statement whose copies give different source statuses.`,
 'delivery-validation':n=>`${plural(n,'delivered requirement is','delivered requirements are')} not fully validated in the source.`,
 'gap-stable':n=>`${plural(n,'undelivered requirement is','undelivered requirements are')} marked stable in the source.`,
 'test-blocked':n=>`${plural(n,'requirement has','requirements have')} blocked historical tests.`,
 'enrich-conflict':n=>`${plural(n,'requirement is','requirements are')} given another status by a further sheet.`,
 'missing-type':n=>`${plural(n,'kind of Chapter 1 record is','kinds of Chapter 1 record are')} not recorded yet.`,
};
const TITLES={'missing-type':'Add the kinds of record that are missing'};
// A cause found once reads as its finding does; a cause found many times reads as a count.
export const causeSentence=(code,n,title,detail='')=>SENTENCES[code]?.(n)||(n===1&&detail?detail:`${plural(n,'record','records')}: ${title}.`);
export function findingCauses(fs){
 const by=new Map();
 for(const f of fs||[]){let c=by.get(f.code);if(!c)by.set(f.code,c={code:f.code,title:TITLES[f.code]||f.title,detail:f.detail,level:f.level,ids:new Set(),findings:0});c.findings++;if(f.artefactId)c.ids.add(f.artefactId);if(f.level==='error')c.level='error';}
 return [...by.values()].map(c=>({code:c.code,title:c.title,level:c.level,findings:c.findings,count:c.ids.size||c.findings,ids:[...c.ids],sentence:causeSentence(c.code,c.ids.size||c.findings,c.title,c.findings===1?c.detail:'')})).sort((a,b)=>(a.level==='error'?0:1)-(b.level==='error'?0:1)||b.count-a.count||a.code.localeCompare(b.code));
}
// ---------------------------------------------------------------- groups
export function withRequirementGroups(p){
 p.requirementGroups??={version:1,counter:0,records:[]};
 // The capability groups of the retired assurance.group command become requirement groups RG-nnn, numbered after the
 // project's own and keeping the old id as an alias (round 12, DM-24): the ids requirementGroups(p) read them under.
 if(Array.isArray(p.assurance?.groups)&&p.assurance.groups.length){const m=p.requirementGroups,ids=p.assurance.groups.map((g,i)=>migratedId(p,i));p.assurance.groups.forEach((g,i)=>{if(!m.records.some(r=>r.alias===g.id))m.records.push({id:ids[i],alias:g.id,title:text(g.title,160)||g.id,kind:'theme',description:text(g.reason),owner:'',memberIds:[...new Set(g.requirementIds||[])],rule:[],origin:'migrated',at:g.at,actor:g.actor});});m.counter+=ids.length;delete p.assurance.groups;}
 return p;
}
const idList=v=>Array.isArray(v)?v:typeof v==='string'?v.split(/[\s,;]+/):[];
export function cleanRule(raw){
 const rows=Array.isArray(raw)?raw:[];
 if(rows.length>GROUP_LIMITS.conditions)throw Error(`A rule has at most ${GROUP_LIMITS.conditions} conditions.`);
 // A condition is {field, value} (is), {field, op: 'is not', value} or {field, op: 'is one of', values} (round 12, DM-22);
 // a value past its limit is refused, never cut.
 const long=v=>{if(String(v??'').trim().length>GROUP_LIMITS.value)throw Error(`A rule value holds at most ${GROUP_LIMITS.value} characters.`);return text(v,GROUP_LIMITS.value);};
 return rows.filter(c=>c&&(text(c.field)||text(c.value)||Array.isArray(c.values)&&c.values.length)).map(c=>{
  const field=text(c.field,40),op=c.op==null||c.op===''?'is':c.op;
  if(!GROUP_RULE_FIELDS.some(([f])=>f===field))throw Error('Choose an imported attribute for each condition of the rule.');
  if(!RULE_OPS.includes(op))throw Error('Choose is, is not or is one of for each condition of the rule.');
  if(op==='is one of'){const values=[...new Set((Array.isArray(c.values)?c.values:String(c.value??'').split(/\s*[;|]\s*/)).map(long).filter(Boolean))];if(!values.length)throw Error('Give each condition of the rule a value.');if(values.length>GROUP_LIMITS.values)throw Error(`A condition holds at most ${GROUP_LIMITS.values} values; ${values.length} were sent.`);return {field,op,values};}
  const value=long(c.value);if(!value)throw Error('Give each condition of the rule a value.');
  return op==='is'?{field,value}:{field,op,value};
 });
}
function saveGroup(p,raw,at,actor){
 withRequirementGroups(p);const m=p.requirementGroups,old=raw.id?m.records.find(g=>g.id===raw.id):null;
 if(raw.id&&!old)throw Error('This group no longer exists. Reload the project.');
 if(!old&&m.records.length>=GROUP_LIMITS.groups)throw Error(`A project keeps up to ${GROUP_LIMITS.groups} requirement groups.`);
 const title=text(raw.title,160);if(!title)throw Error('Give the group a title.');
 const kind=GROUP_KINDS.some(([k])=>k===raw.kind)?raw.kind:'';if(!kind)throw Error('Choose what kind of group this is.');
 // Round 24 (D-24-01): a sub-module names the module it belongs to; a module has a role and, as a platform module, may
 // serve themes across the business modules. A sub-module's title is its own among its module's; every other group's
 // title is its own in the project.
 const children=old?.kind==='module'?m.records.filter(g=>g.kind==='sub-module'&&g.parentId===old.id):[];
 if(children.length&&kind!=='module')throw Error('This module has sub-modules. Move or remove them first.');
 let parentId='';
 if(kind==='sub-module'){parentId=text(raw.parentId===undefined?old?.parentId:raw.parentId,40);const parent=m.records.find(g=>g.id===parentId);if(!parent||parent.kind!=='module')throw Error('Choose the module this sub-module belongs to.');}
 else if(raw.parentId)throw Error('Only a sub-module names a module it belongs to.');
 let role='',serves=[],concern='';
 if(kind==='module'){
  role=raw.role===undefined?(old?.role||'business'):raw.role;if(!MODULE_ROLES.some(([r])=>r===role))throw Error('Choose whether the module is a business module or a platform module.');
  serves=raw.serves===undefined?(old?.serves||[]):cleanRule(raw.serves);if(serves.length&&role!=='platform')throw Error('Only a platform module serves themes across the modules.');
  concern=raw.concern===undefined?(old?.concern||''):PLATFORM_CONCERNS.some(c=>c.key===raw.concern)?raw.concern:'';
 }
 const same=g=>g!==old&&g.title.trim().toLowerCase()===title.toLowerCase();
 if(kind==='sub-module'?m.records.some(g=>same(g)&&g.kind==='sub-module'&&g.parentId===parentId):m.records.some(g=>same(g)&&g.kind!=='sub-module'))throw Error(`A group called “${title}” exists${kind==='sub-module'?' in this module':''}. Choose another title, or edit that group.`);
 const reqs=new Set(p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id)),ids=[...new Set(idList(raw.memberIds).map(id=>text(id,40).toUpperCase()).filter(Boolean))];
 if(ids.length>GROUP_LIMITS.members)throw Error(`A group names at most ${GROUP_LIMITS.members.toLocaleString('en-GB')} requirements. Use a rule for a larger group.`);
 const unknown=ids.filter(id=>!reqs.has(id));if(unknown.length)throw Error(`${unknown.slice(0,3).join(', ')}${unknown.length>3?` and ${unknown.length-3} more`:''} ${unknown.length===1?'is not a requirement':'are not requirements'} of this project.`);
 const rule=cleanRule(raw.rule);
 // A module may hold its requirements through its sub-modules alone, a platform module may only serve, and a module
 // a person starts may be empty until its sub-modules are named.
 if(!ids.length&&!rule.length&&kind!=='module')throw Error('Name the requirements the group holds, or give a rule that selects them.');
 const moduleFields=kind==='module'?{role,...(serves.length?{serves}:{}),...(concern?{concern}:{})}:kind==='sub-module'?{parentId,...(old?.concern?{concern:old.concern}:{})}:{};
 const proposalFields=isModuleKind(kind)?{state:old?.state||'proposed',...(old?.proposal?{proposal:old.proposal}:{}),...(old?.acceptedAt?{acceptedAt:old.acceptedAt,acceptedBy:old.acceptedBy}:{})}:{};
 const record={id:old?.id||'RG-'+String(++m.counter).padStart(3,'0'),title,kind,description:text(raw.description),owner:text(raw.owner,180),memberIds:ids,rule,...moduleFields,origin:old?.origin||'user',...(old?.source?{source:old.source}:{}),...proposalFields,at:old?.at||at,actor:old?.actor||actor,...(old?{updatedAt:at,updatedBy:actor}:{})};
 if(old)m.records[m.records.indexOf(old)]=record;else m.records.push(record);
 m.version++;return record.id;
}
// The records that link a group (requirementGroupIds), checked before it is removed: every record of every chapter,
// and the parts inside one (a decision's alternatives), found by the field wherever it is (round 12, DM-02). A record's
// history, its readings and the retired records are what it was, not what it links.
const UNLINKED=new Set(['requirementGroups','history','retired','sourceSnapshot','driverSnapshot','provenance']);
export function groupLinks(p,id){const out=[],walk=(v,depth)=>{if(!v||typeof v!=='object'||depth>8)return;if(Array.isArray(v)){for(const x of v)walk(x,depth+1);return;}if(Array.isArray(v.requirementGroupIds)&&v.requirementGroupIds.includes(id))out.push(v.id||v.ref||'a record');for(const [k,x] of Object.entries(v))if(!UNLINKED.has(k))walk(x,depth+1);};walk(p,0);return [...new Set(out)];}
function deleteGroup(p,raw){
 withRequirementGroups(p);const m=p.requirementGroups,old=m.records.find(g=>g.id===raw.id);
 if(!old)throw Error('This group no longer exists. Reload the project.');
 if(old.kind==='module'&&m.records.some(g=>g.kind==='sub-module'&&g.parentId===old.id))throw Error('This module has sub-modules. Move or remove them first.');
 const links=groupLinks(p,old.id);if(links.length)throw Error(`${links.slice(0,3).join(', ')}${links.length>3?' and others':''} ${links.length===1?'links':'link'} this group. Remove those links first.`);
 m.records=m.records.filter(g=>g!==old);m.version++;
}
// ---------------------------------------------------------------- the module structure (round 24, D-24-02)
const COLUMN_FIELDS=new Set(GROUP_RULE_FIELDS.map(([f])=>f));
function proposeStructure(p,raw,at,actor){
 withRequirementGroups(p);
 if(p.requirementGroups.records.some(g=>isModuleKind(g.kind)))throw Error('A module structure exists. Change it, or discard it first.');
 for(const k of ['first','second'])if(raw[k]!=null&&!COLUMN_FIELDS.has(raw[k]))throw Error('Choose an imported attribute for the modules and the sub-modules.');
 const proposal=proposeModules(p,{...(raw.first?{first:raw.first}:{}),...(raw.second===null?{second:null}:raw.second?{second:raw.second}:{})});
 if(!proposal.modules.length)throw Error(proposal.notes[0]||'No module structure could be proposed from these requirements.');
 const made=applyModuleProposal(p,proposal,{},at,actor);
 p.requirementGroups.modules={basis:proposal.basis,notes:proposal.notes,at,actor};
 return made.converted[0]||made.created[0]||null;
}
function acceptStructure(p,raw,at,actor){
 if(raw.reviewed!==true)throw Error('Review the module structure, then say that you did.');
 const tree=moduleTree(p),n=x=>plural(x,'requirement','requirements');
 if(!tree.modules.length)throw Error('There is no module structure to accept.');
 if(tree.doubled.length)throw Error(`${n(tree.doubled.length)} ${tree.doubled.length===1?'is':'are'} in two modules or sub-modules. Change their rules so each is in one, then accept.`);
 if(tree.unassigned.length)throw Error(`${n(tree.unassigned.length)} ${tree.unassigned.length===1?'is':'are'} in no module. Place ${tree.unassigned.length===1?'it':'them'}, then accept.`);
 const groups=p.requirementGroups.records.filter(g=>isModuleKind(g.kind));
 for(const g of groups){g.state='accepted';g.acceptedAt=at;g.acceptedBy=actor;}
 p.requirementGroups.version++;return groups[0]?.id||null;
}
function discardStructure(p,raw,at,actor){
 withRequirementGroups(p);const m=p.requirementGroups,groups=m.records.filter(g=>isModuleKind(g.kind));
 if(!groups.length)throw Error('There is no module structure to discard.');
 const linked=groups.filter(g=>!g.proposal?.from&&groupLinks(p,g.id).length);
 if(linked.length)throw Error(`${linked.slice(0,3).map(g=>g.id).join(', ')}${linked.length>3?' and others':''} ${linked.length===1?'is':'are'} linked by other records. Remove those links first.`);
 for(const g of groups)if(g.proposal?.from){g.kind=g.proposal.from;for(const k of ['role','serves','concern','state','proposal','parentId','acceptedAt','acceptedBy'])delete g[k];g.updatedAt=at;g.updatedBy=actor;}
 m.records=m.records.filter(g=>!isModuleKind(g.kind));delete m.modules;m.version++;
}
// ---------------------------------------------------------------- many requirements at once
function selection(p,raw){
 if(Array.isArray(raw.ids)){if(raw.ids.length>PROJECT_LIMITS.requirements)throw Error('Choose at most 5,000 requirements.');const known=new Set(p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id)),missing=raw.ids.filter(id=>!known.has(id));if(missing.length)throw Error(`${missing.slice(0,3).join(', ')} ${missing.length===1?'is':'are'} no longer in this project. Reload and review the selection again.`);return selectRequirements(p,{ids:raw.ids});}
 if(!raw.filter||typeof raw.filter!=='object')throw Error('Choose the requirements: a selection, a group or a filter.');
 // A group named by its legacy id (GRP-nnn) is the RG-nnn it reads as (round 12, GR-REQ-18).
 if(raw.filter.groupId){const g=groupById(p,String(raw.filter.groupId));if(!g)throw Error('This group no longer exists. Reload the project.');raw.filter={...raw.filter,groupId:g.id};}
 return selectRequirements(p,{filter:Object.fromEntries(FILTER_KEYS.filter(k=>raw.filter[k]!==undefined).map(k=>[k,raw.filter[k]]))});
}
function counted(targets,raw,verb){
 if(Number(raw.count)!==targets.length)throw Error(`The selection changed: ${plural(targets.length,'requirement','requirements')} would be ${verb} now, not ${Number(raw.count)||0}. Review the selection again.`);
}
function journal(p,{id,title,before,after,label,requirementIds,at,actor,extra={}}){
 withChanges(p);const event={id:'CHG-'+String(++p.changes.counter).padStart(3,'0'),source:{chapter:1,id,ref:'Chapter 1',kind:id,title},title,at,before,after,fields:[{key:id,label,before:before.state,after:after.state}],items:[],requirementIds,actor,reviewed:true,...extra};
 p.changes.events.push(event);return event.id;
}
function confirmMany(p,raw,at,actor){
 if(raw.reviewed!==true)throw Error('Review the requirements, then say that you did.');
 const targets=selection(p,raw).filter(a=>!a.confirmed);
 if(!targets.length)throw Error('Every requirement in this selection is confirmed already.');
 counted(targets,raw,'confirmed');
 for(const a of targets)a.confirmed=true;
 journal(p,{id:'requirements-confirm',title:`Confirmed ${plural(targets.length,'requirement','requirements')}`,label:'Confirmation',before:{state:'Not confirmed',count:targets.length},after:{state:'Confirmed',count:targets.length},requirementIds:targets.map(a=>a.id),at,actor,extra:raw.filter?{filter:raw.filter}:{}});
 return targets[0].id;
}
// A reviewed reason a requirement belongs on no journey step (DRF-05): the step is the person's, journalled once.
function treatJourney(p,raw,at,actor){
 if(raw.reviewed!==true)throw Error('Review the requirements, then say that you did.');
 const remove=raw.remove===true,reason=text(raw.reason,2000);
 if(!remove&&reason.length<12)throw Error('Say why these requirements belong on no journey step, in a sentence.');
 const linked=new Set(p.relationships.filter(r=>r.kind==='requires').map(r=>r.to));
 const targets=selection(p,raw).filter(a=>remove?!!a.journeyTreatment:!linked.has(a.id));
 if(!targets.length)throw Error(remove?'No requirement in this selection has a recorded reason.':'Every requirement in this selection is on a journey step already.');
 counted(targets,raw,remove?'changed':'treated');
 const event=journal(p,{id:'requirements-journey',title:remove?`Removed the reason for no journey step from ${plural(targets.length,'requirement','requirements')}`:`Recorded why ${plural(targets.length,'requirement belongs','requirements belong')} on no journey step`,label:'Journey step',before:{state:remove?'Reason recorded':'No journey step'},after:{state:remove?'No journey step':'Not applicable, with a reason',reason:remove?'':reason},requirementIds:targets.map(a=>a.id),at,actor});
 for(const a of targets){if(remove)delete a.journeyTreatment;else a.journeyTreatment={reason,reviewed:true,at,actor,change:event,...(raw.filter?.groupId?{groupId:raw.filter.groupId}:{})};}
 return targets[0].id;
}
function treatEvidence(p,raw,at,actor){
 if(raw.reviewed!==true)throw Error('Review the requirements, then say that you did.');
 const remove=raw.remove===true,reason=text(raw.reason,2000);
 if(!remove&&reason.length<12)throw Error('Say why no evidence exists for these requirements, in a sentence.');
 const targets=selection(p,raw).filter(a=>a.assessment&&!hasEvidence(a)&&(remove?!!a.evidenceTreatment:true));
 if(!targets.length)throw Error(remove?'No requirement in this selection has a recorded reason.':'No requirement in this selection lacks an evidence reference.');
 counted(targets,raw,remove?'changed':'treated');
 const event=journal(p,{id:'requirements-evidence',title:remove?`Removed the reason for no evidence from ${plural(targets.length,'requirement','requirements')}`:`Recorded why no evidence exists for ${plural(targets.length,'requirement','requirements')}`,label:'Evidence',before:{state:remove?'Reason recorded':'No evidence reference'},after:{state:remove?'No evidence reference':'Reason recorded',reason:remove?'':reason},requirementIds:targets.map(a=>a.id),at,actor});
 for(const a of targets){if(remove)delete a.evidenceTreatment;else a.evidenceTreatment={reason,at,actor,basis:a.provenance?.rowHash||null,change:event,...(raw.filter?.groupId?{groupId:raw.filter.groupId}:{})};}
 return targets[0].id;
}
// The rule group of one user group (round 12, DM-12): 'user group is X', of kind user-group; the one there is, or a new one.
function userGroup(p,name,at,actor){
 withRequirementGroups(p);const m=p.requirementGroups,same=g=>g.kind==='user-group'&&g.rule?.length===1&&g.rule[0].field==='userGroup'&&!g.rule[0].op&&g.rule[0].value.toLowerCase()===name.toLowerCase(),found=m.records.find(same);if(found)return found.id;
 if(m.records.length>=GROUP_LIMITS.groups)throw Error(`A project keeps up to ${GROUP_LIMITS.groups} requirement groups.`);
 const title=m.records.some(g=>g.title.trim().toLowerCase()===name.toLowerCase())?text(name+' (user group)',160):text(name,160),id='RG-'+String(++m.counter).padStart(3,'0');
 m.records.push({id,title,kind:'user-group',description:text(`The requirements imported for the ${name} user group.`),owner:'',memberIds:[],rule:[{field:'userGroup',value:text(name,GROUP_LIMITS.value)}],origin:'import',at,actor});m.version++;return id;
}
function acceptProposals(p,raw,at,actor){
 if(raw.reviewed!==true)throw Error('Review the proposals, then say that you did.');
 const dataset=(p.intake?.datasets||[]).find(d=>d.id===raw.datasetId),proposals=dataset?.proposals;
 if(!proposals)throw Error('This import has no proposals to review. Reload the project.');
 let selected=null;
 const names=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x,180)).filter(Boolean))];
 const accept=names(raw.stakeholders?.accept),dismiss=names(raw.stakeholders?.dismiss);
 for(const name of [...accept,...dismiss]){const x=(proposals.stakeholders||[]).find(s=>s.name===name);if(!x)throw Error(`“${name}” is not a stakeholder this import proposed.`);if(x.status!=='proposed')throw Error(`“${name}” was ${x.status} already.`);}
 for(const name of accept){
  const x=proposals.stakeholders.find(s=>s.name===name);
  if(p.artefacts.length>=PROJECT_LIMITS.artefacts)throw Error('This project supports up to 6,000 artefacts.');
  const id='STK-'+String(++p.counters.stakeholder).padStart(3,'0'),group=userGroup(p,name,at,actor);
  p.artefacts.push({id,type:'stakeholder',title:text(name,160),description:text(`A user group named in ${plural(x.count,'imported requirement','imported requirements')}. Say what this group needs from the design and what it is accountable for.`),owner:'',source:text(dataset.filename+' · '+dataset.sheet+' · '+(x.label||'User group')+' column',600),priority:'',acceptance:'',confirmed:false,origin:'import',scopeMode:'in',order:0,modelRef:'',userGroup:name,requirementGroupIds:[group]});
  Object.assign(x,{status:'accepted',recordId:id,at,actor});selected??=id;
 }
 for(const name of dismiss)Object.assign(proposals.stakeholders.find(s=>s.name===name),{status:'dismissed',at,actor});
 // Round 12 (GR-INT-04, GR-INT-10): the outcomes and the constraints the rows propose, each by its key.
 const chosen={};
 for(const kind of ['outcomes','constraints']){
  const keys=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x,240)).filter(Boolean))],acc=keys(raw[kind]?.accept),dis=keys(raw[kind]?.dismiss);
  for(const k of [...acc,...dis]){const x=(proposals[kind]||[]).find(o=>o.key===k);if(!x)throw Error(`“${k}” is not ${kind==='outcomes'?'an outcome':'a constraint'} this import proposed.`);if(x.status!=='proposed')throw Error(`“${x.title}” was ${x.status} already.`);}
  chosen[kind]={acc,dis};
 }
 const rowsOf=x=>{const want=new Set(x.externalIds||[]);return p.artefacts.filter(a=>a.type==='requirement'&&a.provenance?.datasetId===dataset.id&&want.has(a.externalId));};
 const link=(from,to,kind)=>{if(p.relationships.some(r=>r.from===from&&r.to===to&&r.kind===kind))return;if(p.relationships.length>=PROJECT_LIMITS.relationships)throw Error('This project supports up to 20,000 requirement relationships.');p.relationships.push({id:'REL-'+String(++p.counters.relationship).padStart(3,'0'),from,to,kind});};
 const record=(type,prefix,fields)=>{if(p.artefacts.length>=PROJECT_LIMITS.artefacts)throw Error('This project supports up to 6,000 artefacts.');p.counters[type]=(p.counters[type]||0)+1;const id=prefix+'-'+String(p.counters[type]).padStart(3,'0');p.artefacts.push({id,type,owner:'',priority:'',acceptance:'',confirmed:false,origin:'import',scopeMode:'in',order:0,modelRef:'',...fields});return id;};
 const sourceOf=(x,label)=>text(dataset.filename+' · '+dataset.sheet+' · '+label+': '+(x.externalIds||[]).slice(0,8).join(', ')+((x.externalIds||[]).length>8?' and '+((x.externalIds||[]).length-8)+' more':''),600);
 for(const key of chosen.outcomes.acc){
  const x=proposals.outcomes.find(o=>o.key===key),rows=rowsOf(x);
  const id=record('outcome','OUT',{title:text(x.title,160),description:text(x.text,4000)||text(x.title,4000),source:sourceOf(x,x.label||'Intended outcome')});
  for(const a of rows)link(a.id,id,'delivers');
  Object.assign(x,{status:'accepted',recordId:id,at,actor});selected??=id;
 }
 for(const key of chosen.constraints.acc){
  const x=proposals.constraints.find(o=>o.key===key),rows=rowsOf(x),title=text(x.title,160);
  const description=text(`${plural(x.count||rows.length,'imported requirement names','imported requirements name')} ${x.name}${rows.length?': '+rows.slice(0,3).map(a=>a.externalId||a.id).join(', ')+(rows.length>3?' and '+(rows.length-3)+' more':''):''}. Say what it requires of the design, and who is accountable for meeting it.`,4000);
  const id=record('constraint','CON',{title,description,source:sourceOf(x,'Statements')});
  for(const a of rows)link(id,a.id,'constrains');
  // Its constraint driver (kind C, D1's driver kinds): what the constraint asks of the architecture, open until a person says.
  const q=applyQualityCommand(handOver(p),{type:'quality.driver',payload:{kind:'constraint',title,description,impact:'',priority:'',rationale:'',owner:'',source:text('Accepted from the import of '+dataset.filename,600),constraintIds:[id],requirementIds:rows.map(a=>a.id).slice(0,5000),origin:'suggestion',open:{impact:{state:'not-stated'},owner:{state:'not-stated'},rationale:{state:'not-stated'}}}},at);
  if(q.document!==p)Object.assign(p,q.document);
  Object.assign(x,{status:'accepted',recordId:id,driverId:q.selected,at,actor});selected??=id;
 }
 for(const kind of ['outcomes','constraints'])for(const key of chosen[kind].dis)Object.assign(proposals[kind].find(o=>o.key===key),{status:'dismissed',at,actor});
 if(raw.brief){
  const b=proposals.brief;if(!b)throw Error('This import proposed no brief.');if(b.status!=='proposed')throw Error(`The proposed brief was ${b.status} already.`);
  if(raw.brief.dismiss===true)Object.assign(b,{status:'dismissed',at,actor});
  else{
   if(p.brief?.confirmed)throw Error('The brief is confirmed. Change it in the brief editor, where confirming is reviewed again.');
   const brief=raw.brief.accept||{};if(!text(brief.problem))throw Error('Keep at least one sentence for the problem.');
   const next=applyCommand(p,{type:'brief',payload:{problem:brief.problem,goal:brief.goal,source:brief.source,confirmed:false}},at).document;p.brief=next.brief;
   Object.assign(b,{status:'accepted',at,actor});selected??='brief';
  }
 }
 if(!accept.length&&!dismiss.length&&!raw.brief&&!['outcomes','constraints'].some(k=>chosen[k].acc.length||chosen[k].dis.length))throw Error('Choose the proposals to accept or dismiss.');
 return selected;
}
// A person's judgement of identical statements whose source statuses disagree (round 12, GR-SRC-02): the same requirement
// (its copies linked "duplicates" to the first) or distinct scopes, with the reason, journalled once. Either answers the
// group's conflict while its rows are the ones judged; a changed row asks again.
export const REPEAT_JUDGEMENTS=['same requirement','distinct scope'];
function judgeRepeats(p,raw,at,actor){
 if(raw.reviewed!==true)throw Error('Review the identical statements, then say that you did.');
 const judgement=REPEAT_JUDGEMENTS.find(j=>j===raw.judgement||j.split(' ')[0]===raw.judgement);if(!judgement)throw Error('Choose “same requirement” or “distinct scope”.');
 const reason=text(raw.reason,2000);if(reason.length<12)throw Error('Say why these statements are '+(judgement==='same requirement'?'the same requirement':'distinct scopes')+', in a sentence.');
 const group=sourceAssurance(p.artefacts,p).repeated.find(r=>r.id===raw.group);if(!group)throw Error('This group of identical statements no longer exists. Reload the project.');
 const members=group.ids.map(id=>p.artefacts.find(a=>a.id===id)),links=[];
 if(judgement==='same requirement')for(const a of members.slice(1))if(!p.relationships.some(r=>r.from===a.id&&r.to===members[0].id&&r.kind==='duplicates')){if(p.relationships.length>=PROJECT_LIMITS.relationships)throw Error('This project supports up to 20,000 requirement relationships.');const id='REL-'+String(++p.counters.relationship).padStart(3,'0');p.relationships.push({id,from:a.id,to:members[0].id,kind:'duplicates'});links.push(id);}
 const event=journal(p,{id:'requirements-repeated',title:`Judged ${plural(members.length,'identical statement','identical statements')} as ${judgement==='same requirement'?'one requirement':'distinct scopes'}`,label:'Identical statements',before:{state:'Not judged'},after:{state:judgement==='same requirement'?'Same requirement':'Distinct scope',reason},requirementIds:group.ids,at,actor});
 p.assurance??={version:1,counter:0,records:[]};
 p.assurance.repeats=[...(p.assurance.repeats||[]).filter(j=>j.id!==group.id),{id:group.id,ids:group.ids,judgement,reason,at,actor,basis:repeatJudgementBasis(members),change:event,...(links.length?{links}:{})}];
 p.assurance.version=(p.assurance.version||0)+1;
 return {selected:group.ids[0],content:links.length>0};
}
// Confirming requirements and recording why none has an evidence reference are reviews of them, not changes of what they
// say (round 12, UX-02): the requirements' content version, and the Chapter 1 review and handoff that read it, stay as
// they are, so nothing downstream reads them as changed inputs.
const REVIEW_ONLY=new Set(['requirements.confirm','requirements.evidence','requirements.modules-accept']);
export function applyRequirementsCommand(input,command,at=new Date().toISOString(),actor='architect'){
 const p=documentCopy(input),raw=command.payload||{};let selected=null;
 if(command.type==='requirements.group')selected=saveGroup(p,raw,at,actor);
 else if(command.type==='requirements.group-delete')deleteGroup(p,raw);
 else if(command.type==='requirements.modules-propose')selected=proposeStructure(p,raw,at,actor);
 else if(command.type==='requirements.modules-accept')selected=acceptStructure(p,raw,at,actor);
 else if(command.type==='requirements.modules-discard')discardStructure(p,raw,at,actor);
 else if(command.type==='requirements.confirm')selected=confirmMany(p,raw,at,actor);
 else if(command.type==='requirements.evidence')selected=treatEvidence(p,raw,at,actor);
 else if(command.type==='requirements.journey-treatment')selected=treatJourney(p,raw,at,actor);
 else if(command.type==='requirements.proposals')selected=acceptProposals(p,raw,at,actor);
 else if(command.type==='requirements.repeated'){const r=judgeRepeats(p,raw,at,actor);selected=r.selected;if(!r.content)return {document:p,selected};}
 else throw Error('Unknown requirements action.');
 if(!REVIEW_ONLY.has(command.type)){p.contentVersion++;p.review=null;p.handoff=null;}
 return {document:p,selected};
}
// The project as the change journal should compare it with after a bulk confirmation: the step is recorded once (above),
// so the confirmations it made are not each a requirement change of their own (worker.js).
export function journalBase(prior,after,type){
 if(type!=='requirements.confirm')return prior;
 const now=new Map(after.artefacts.map(a=>[a.id,a]));
 return {...prior,artefacts:prior.artefacts.map(a=>a.type==='requirement'&&!a.confirmed&&now.get(a.id)?.confirmed===true?{...a,confirmed:true}:a)};
}
