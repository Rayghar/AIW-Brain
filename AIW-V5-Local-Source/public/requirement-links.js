// A record's links to requirements, read one way (round 12, DM-02 and DM-26), and how a save patches a record (DM-09).
//
// A record of any chapter may name requirements (requirementIds) and requirement groups (requirementGroupIds; RG-nnn,
// requirement-groups.js). linkedRequirementIds is the one reader of what it answers for: the requirements it names, then
// the members of the groups it links it does not name, each once. Traceability, coverage and readiness read it, so a
// group link counts as tracing every member. A record that links no group reads exactly as before.
//
// Patch semantics: a field a save leaves out keeps what is stored; an explicit null (or [] for a list) clears it. A link
// field also takes {add: [...], remove: [...]}. patchIds and patchText are what each chapter's save uses; a save whose
// result equals what is stored keeps the record's revision (each chapter's own check). Pure; no DOM, no project writes.
import {groupIndex,groupById} from './requirement-groups.js';
import {refList} from './util.js';
import {valueFingerprint,recordStamp} from './source-fingerprint.js';
import {remember,findIn} from './document-memo.js';

export function linkedRequirementIds(p,r){
 const ids=[...new Set(Array.isArray(r?.requirementIds)?r.requirementIds:[])],groups=r?.requirementGroupIds;
 if(!Array.isArray(groups)||!groups.length)return ids;
 const seen=new Set(ids),members=groupIndex(p).members;
 for(const g of groups)for(const m of members.get(g)||[])if(!seen.has(m)){seen.add(m);ids.push(m);}
 return ids;
}
// What a reading (source-fingerprint.js) holds for a group a record links: one fingerprint of the group's record and of
// the requirements it holds now. A rule that starts to match a new requirement, or a member named or dropped, is a change
// to every record that links the group; a member's own words are read by the records that name that requirement.
export const groupStamp=(p,id)=>remember(p,'links:group-stamp',id,()=>{const g=groupById(p,id);return valueFingerprint(g?{group:g,members:groupIndex(p).members.get(id)||[]}:null);});
// What a reading holds for the requirements a record names (round 12, GR-REQ-13): each named requirement's
// fingerprint, then each linked group's. A record of Chapters 8–10 reads them so; a change to one marks the records
// that name it, not every record of those chapters.
export const namedRequirementStamps=(p,r)=>[...(Array.isArray(r?.requirementIds)?r.requirementIds:[]).map(id=>recordStamp(p,findIn(p,'links:artefacts',()=>p?.artefacts||[],id)||null)),...(Array.isArray(r?.requirementGroupIds)?r.requirementGroupIds:[]).map(id=>groupStamp(p,id))];
// Whether a record answers for one requirement: it names it, or it links a group that holds it.
export const linksRequirement=(p,r,id)=>(Array.isArray(r?.requirementIds)&&r.requirementIds.includes(id))||(Array.isArray(r?.requirementGroupIds)&&r.requirementGroupIds.length>0&&(groupIndex(p).of.get(id)||[]).some(g=>r.requirementGroupIds.includes(g)));

const strings=v=>[...new Set((Array.isArray(v)?v:[]).filter(x=>typeof x==='string'&&x))];
// A link field: {ids, sent}. sent holds the ids this save names (an array's, or an {add}'s), which the chapter checks;
// the ids kept from the stored record are not checked again (a link that broke is reported by the chapter's findings).
export function patchIds(raw,key,old){
 const v=raw?.[key],had=strings(old?.[key]);
 if(v===undefined)return {ids:had,sent:[]};
 if(v===null)return {ids:[],sent:[]};
 if(Array.isArray(v)){const ids=strings(v);return {ids,sent:ids};}
 if(typeof v==='object'){const add=strings(v.add),remove=new Set(strings(v.remove));return {ids:strings([...had,...add]).filter(id=>!remove.has(id)),sent:add};}
 throw Error('Send a list of ids, or ids to add and remove.');
}
// A text field: a string is trimmed and refused past its limit (never cut); null clears it; left out, it keeps its value.
export function patchText(raw,key,old,limit=4000,label=key){
 const v=raw?.[key];
 if(v===undefined)return typeof old?.[key]==='string'?old[key]:'';
 if(v===null)return '';
 const t=typeof v==='string'?v.trim():typeof v==='number'?String(v):'';
 if(t.length>limit)throw Error(`${label} holds at most ${limit.toLocaleString('en-GB')} characters; this one has ${t.length.toLocaleString('en-GB')}.`);
 return t;
}
// Ids sent that the project does not hold are refused by name.
export function knownOnly(sent,known,noun){const bad=sent.filter(id=>!known.has(id));if(bad.length)throw Error(`Choose existing ${noun}: ${bad.slice(0,3).join(', ')}${bad.length>3?' and '+(bad.length-3)+' more':''} ${bad.length===1?'is':'are'} not in this project.`);return sent;}
// A field new in round 12 that a record saved before never held stays absent while it is empty, so the record keeps
// its shape (and the readings other records keep of it) until a person sets it. A new record stores none empty.
export function settle(r,prior,keys){for(const k of keys){const v=r[k];if(prior&&Object.hasOwn(prior,k))continue;if(v===undefined||v===''||v===null||(typeof v==='object'&&!Object.keys(v).length))delete r[k];}return r;}
// A bound on a link list, refused with what was sent (never cut).
export function within(ids,max,noun){if(ids.length>max)throw Error(`At most ${max.toLocaleString('en-GB')} ${noun} can be linked; ${ids.length.toLocaleString('en-GB')} were sent.`);return ids;}

// Round 12 (GR-SDD-05): a record's derived requirement trail in words, for the chapter registers. Each component the
// trail passes through, with the requirements it realises among them ("12 requirements via APP-001 (REQ-001–REQ-012)"):
// those of the responsibilities allocated to it and those it names itself, read by linkedRequirementIds. The components
// that carry most come first, four at most; the others are counted together with their references; requirements the
// trail reaches through no listed component are counted last. Ids are compacted into ranges and counted past six parts,
// so a line stays short however long the trail. What a record names itself is its caller's to print first. Pure.
export function trailText(p, ids, applications = [], {shown = 4, parts = 6} = {}) {
  if (!ids.length) return 'none';
  const left = new Set(ids), via = [], n = k => k.toLocaleString('en-GB') + ' requirement' + (k === 1 ? '' : 's');
  for (const a of applications) {
    const xs = componentRequirementIds(p, a.id).filter(id => left.has(id));
    if (!xs.length) continue;
    for (const id of xs) left.delete(id);
    via.push({ref: a.ref || a.id, xs});
  }
  via.sort((x, y) => y.xs.length - x.xs.length);
  const out = via.slice(0, shown).map(v => n(v.xs.length) + ' via ' + v.ref + ' (' + refList(v.xs, parts) + ')'), rest = via.slice(shown);
  if (rest.length) out.push(n(rest.reduce((k, v) => k + v.xs.length, 0)) + ' via ' + rest.length + ' more component' + (rest.length === 1 ? '' : 's') + ' (' + refList(rest.map(v => v.ref), parts) + ')');
  if (left.size) out.push(n(left.size) + (via.length ? ' otherwise' : '') + ' (' + refList([...left], parts) + ')');
  return out.join('; ');
}
function componentRequirementIds(p, id) {
  return remember(p, 'requirement-links:component', id, () => {
    const resp = new Map((p?.logical?.responsibilities || []).map(r => [r.id, r])), out = new Set();
    for (const m of p?.logical?.mappings || []) if (m.physicalId === id && resp.has(m.logicalId)) for (const x of linkedRequirementIds(p, resp.get(m.logicalId))) out.add(x);
    const c = (p?.realisation?.components || []).find(x => x.id === id);
    if (c) for (const x of linkedRequirementIds(p, c)) out.add(x);
    return [...out];
  });
}
// Requirements a record cites in its words without linking them (round 12, DM-03): requirement ids and workbook ids
// (externalId) in its text fields, resolved to the project's requirements, less those it answers for
// (linkedRequirementIds). The one reader of every chapter that checks it (Chapters 2 and 3 since GR-REQ-14, Chapters 6
// to 10 before): [[record, [requirement ids]]], in the order of the records.
const CITED_ID=/\b[A-Z][A-Z0-9]*(?:[.-][A-Z0-9]+)*-\d[\d.]*\b/g;
const CITED_HINT=/-\d/;
const citedIds=p=>remember(p,'links:cited-ids',p,()=>{const ids=new Map();for(const a of p.artefacts||[])if(a.type==='requirement'){ids.set(a.id,a.id);if(a.externalId)ids.set(String(a.externalId).trim(),a.id);}return ids;});
export function citedRequirements(p,records){
 const ids=citedIds(p);
 const out=[];if(!ids.size)return out;
 for(const r of records){let linked=null;const hit=new Set();for(const v of Object.values(r))if(typeof v==='string'&&CITED_HINT.test(v))for(const m of v.matchAll(CITED_ID)){const id=ids.get(m[0].replace(/\.$/,''));if(id&&!(linked??=new Set(linkedRequirementIds(p,r))).has(id))hit.add(id);}if(hit.size)out.push([r,[...hit]]);}
 return out;
}
// The one finding a chapter raises for them, the same cause in every chapter: code 'cited-not-linked', key 'cited', with
// each record and the requirements it cites in `items`. `add` is the chapter's own (code, key, title, detail, level, extra).
export function citedNotes(p,records,add){const out=citedRequirements(p,records);if(!out.length)return;
 add('cited-not-linked','cited',out.length+' record'+(out.length>1?'s cite':' cites')+' requirements in their words without linking them',out.slice(0,5).map(([r,xs])=>(r.ref||r.id)+' cites '+xs.slice(0,3).join(', ')+(xs.length>3?' and '+(xs.length-3)+' more':'')).join('; ')+(out.length>5?'; and '+(out.length-5)+' more records':'')+'. Link them, or the trail stays in words only.','warning',{items:out.map(([r,xs])=>({objectId:r.id,requirementIds:xs}))});}
// What a record's requirements say of their delivery (round 12, GR-SEC-04): each requirement it answers for
// (linkedRequirementIds) with its delivery status as its source states it (assessment.delivery; '' when no source states
// it); `undelivered` are those whose status is stated and is not delivered (planned, partly delivered, a later phase),
// read apart from those not stated. A control or a plan that rests on an undelivered row describes something not yet
// running: the chapter raises one finding for it (undeliveredNotes).
//   deliveryOf(p, r) -> {rows: [{id, delivery, delivered}], undelivered: [ids], notStated: [ids], text}
export function deliveryOf(p,r){const rows=linkedRequirementIds(p,r).map(id=>{const a=findIn(p,'links:artefacts',()=>p?.artefacts||[],id),delivery=String(a?.assessment?.delivery??'').trim();return {id,delivery,delivered:delivery.toLowerCase()==='delivered'};});
 const undelivered=rows.filter(x=>x.delivery&&!x.delivered).map(x=>x.id),notStated=rows.filter(x=>!x.delivery).map(x=>x.id);
 return {rows,undelivered,notStated,text:rows.length?rows.map(x=>x.id+' '+(x.delivery||'delivery not stated')).join('; '):'No requirement linked.'};}
// The one finding a chapter raises for its records that rest on undelivered requirements: code 'undelivered', key
// 'delivery', with each record and the rows it rests on in `items`.
export function undeliveredNotes(p,records,add){const out=records.map(r=>[r,deliveryOf(p,r)]).filter(([,d])=>d.undelivered.length);if(!out.length)return;
 add('undelivered','delivery',out.length+' record'+(out.length>1?'s rest':' rests')+' on requirements not yet delivered',out.slice(0,5).map(([r,d])=>(r.ref||r.id)+' rests on '+d.rows.filter(x=>d.undelivered.includes(x.id)).slice(0,3).map(x=>x.id+' ('+x.delivery+')').join(', ')+(d.undelivered.length>3?' and '+(d.undelivered.length-3)+' more':'')).join('; ')+(out.length>5?'; and '+(out.length-5)+' more records':'')+'. Say what runs until they are delivered, or read these records as the target design.','warning',{items:out.map(([r,d])=>({objectId:r.id,requirementIds:d.undelivered}))});}
