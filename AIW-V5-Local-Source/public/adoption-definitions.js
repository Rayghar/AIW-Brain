// The definition contract of an adoption (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md §b.3): what can be
// applied to a model as a pattern, style, tactic, profile or method. Slice S1 states the shape and checks it
// (definitionIssues); the function that reads a definition from released knowledge and the closed vocabulary of
// steps and templates are slice S2's. A definition is data: it carries and names no code.
//   {definitionId, version, kind, title, mechanism?, groupId?, optionId?, authority?,
//    roles: [{id, label, required, cardinality: 'one' | 'many', accepts: [{type, kinds?, category?}], sameAs?}],
//    obligations: [{id, kind, action, evidence, mandatory, role?, title?, stage?, chapter?, factKeys?, parameterNames?}],
//    parameters?: [{name, label?, unit, required?}], bounds?: {dependsOn, doesNotCover, reconsiderWhen, removalConsequence, operatingWork}}
// A role's `accepts` names record types of the record graph (record-graph.js OBJECT_TYPES), an open list, so that a
// package that adds a type (a deployable, a bounded context) can be bound without a change here.
import {OBJECT_TYPES} from './record-graph.js';
// 'concern': a released design concern that was compared and applied as a guided design (the lead's ruling J4 of
// 2026-11-19: its own kind, not the boundary task's); slice S5 moves such a comparison to selection.*.
export const DEFINITION_KINDS=Object.freeze(['pattern','style','tactic','profile','method','concern']);
const ID=/^[a-z0-9][a-z0-9:._-]{0,79}$/i,list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v),words=(v,max=4000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
// What is wrong with a definition, in words; none when it is well formed.
export function definitionIssues(d){
 if(!plain(d))return ['A definition is an object.'];
 const out=[],name=typeof d.definitionId==='string'&&ID.test(d.definitionId)?d.definitionId:'The definition',once=(rows,key,what)=>{const seen=new Set();for(const r of rows){const id=plain(r)?r[key]:null;if(typeof id!=='string'||!ID.test(id))out.push(name+': '+what+' needs an id of letters, digits, hyphens, points and colons.');else if(seen.has(id))out.push(name+': '+what+' “'+id+'” is stated twice.');else seen.add(id);}return seen;};
 if(name!==d.definitionId)out.push('A definition needs an id of letters, digits, hyphens, points and colons.');
 if(!Number.isInteger(d.version)||d.version<1)out.push(name+': the version is a whole number from 1.');
 if(!DEFINITION_KINDS.includes(d.kind))out.push(name+': the kind is one of '+DEFINITION_KINDS.join(', ')+'.');
 if(!words(d.title,300))out.push(name+': a title of 1 to 300 characters is needed.');
 for(const k of ['roles','obligations','parameters'])if(d[k]!==undefined&&!Array.isArray(d[k]))out.push(name+': '+k+' is a list.');
 const roles=once(list(d.roles),'id','a role');
 for(const r of list(d.roles).filter(plain)){
  if(!words(r.label,300))out.push(name+': role “'+r.id+'” needs a label.');
  if(typeof r.required!=='boolean')out.push(name+': role “'+r.id+'” says whether it is required.');
  if(!['one','many'].includes(r.cardinality))out.push(name+': role “'+r.id+'” binds one record or many.');
  if(!list(r.accepts).length||list(r.accepts).some(a=>!plain(a)||!Object.hasOwn(OBJECT_TYPES,a.type)))out.push(name+': role “'+r.id+'” accepts record types of the model.');
  if(r.sameAs!==undefined&&(r.sameAs===r.id||!list(d.roles).some(x=>x?.id===r.sameAs)))out.push(name+': role “'+r.id+'” is the same record as another role of the definition.');
 }
 once(list(d.obligations),'id','an obligation');
 for(const o of list(d.obligations).filter(plain)){
  if(!words(o.action))out.push(name+': obligation “'+o.id+'” says what must hold.');
  if(typeof o.mandatory!=='boolean')out.push(name+': obligation “'+o.id+'” says whether it is mandatory.');
  if(o.role!==undefined&&!roles.has(o.role))out.push(name+': obligation “'+o.id+'” names a role of the definition.');
 }
 once(list(d.parameters),'name','a parameter');
 for(const x of list(d.parameters).filter(plain))if(typeof x.unit!=='string')out.push(name+': parameter “'+x.name+'” states its unit (empty when it has none).');
 if(d.bounds!==undefined&&!plain(d.bounds))out.push(name+': bounds is an object.');
 return out;
}
