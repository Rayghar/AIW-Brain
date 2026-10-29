// Modules and sub-modules (round 24, D-24-01 and D-24-02): the functional decomposition of a project, kept as
// requirement groups in a tree, not as a second model. A group of kind module is a part of the solution's functional
// decomposition, with a role: business (it owns a part of what the system does) or platform (a shared service the
// business modules use). A group of kind sub-module names its module (parentId); the tree is two deep. Membership is what
// it is for every group: a rule on imported attributes, explicit ids, or both, and a module holds its sub-modules'
// requirements too (requirement-groups.js rolls them up). The business and platform modules partition the requirements:
// each requirement belongs to one leaf (a sub-module, or a module with none of its own that holds it); a requirement in
// no leaf, or in two, is a Chapter 1 finding. A platform module may own the requirements of its own area, when the source
// has one, and it serves cross-cutting themes across the business modules (`serves`: a rule on the theme); the
// requirements it serves stay in their own module.
//
// AIW proposes the structure from the requirements' own columns (proposeModules, deterministic, the same twice); the
// groups are saved as proposed (state 'proposed') and a person accepts them (requirements.modules-accept, a review an
// agent or a draft by Sol cannot send). Each part of the proposal says which columns and rule it came from.
//
// Readers (pure, over the saved document; nothing here changes it):
//   moduleTree(p)            -> {modules: [{group, children: [group]}], byId: Map, home: Map(requirement id ->
//                               {moduleId, subId}), unassigned: [ids], doubled: [ids], served: Map(requirement id ->
//                               [platform module ids]), state: 'none' | 'proposed' | 'accepted' | 'mixed'}
//   topModuleId(p, groupId)  -> the module a module or sub-module belongs to ('' for any other group)
//   moduleLabel(p, group)    -> "Module" or "Module › Sub-module", the name a reader sees everywhere
//   concernOf(text)          -> the cross-cutting concern a title or theme names ('' when none)
//   proposeModules(p, opts)  -> {basis, modules: [...], notes} without changing anything
//   applyModuleProposal(p, proposal, meta, at, actor) -> creates the groups, converting in place an existing group with
//                               the same one-condition rule (its id and links stay); returns {created, converted}
import {requirementGroups,groupIndex,requirementAttribute,ruleMatches,GROUP_LIMITS} from './requirement-groups.js';
import {remember} from './document-memo.js';

export const MODULE_KINDS=['module','sub-module'];
export const MODULE_ROLES=[['business','Business module'],['platform','Platform module']];
export const isModuleKind=kind=>MODULE_KINDS.includes(kind);
export const isModuleGroup=g=>!!g&&isModuleKind(g.kind);
// The cross-cutting concerns a platform module serves, each with the words that name it in a title or a theme. A theme
// that names one and recurs across the modules is served by a platform module; an area of the source that names one is
// that platform module. Quality concerns (performance, stability) are drivers, not modules, and are not listed here.
export const PLATFORM_CONCERNS=Object.freeze([
 {key:'reporting',title:'Reporting and analytics',words:/\breport|\bsearch\b|\bexport|management information|\banalytic|\bdashboard|\benquir|\binquir/i},
 {key:'workflow',title:'Workflow and approvals',words:/\bworkflow|maker[- ]?checker|\bauthori[sz]ation|\bapprov|four[- ]eyes|dual control/i},
 {key:'audit',title:'Audit and change history',words:/\baudit|change history|before\/after|\btrail\b|\blogs?\b/i},
 {key:'access',title:'Identity and access',words:/user access|\baccess (?:administration|control|management)|\broles?\b|segregation of duties|\bidentity|\bauthenticat|\bpermission/i},
 {key:'notification',title:'Notifications and alerts',words:/\bnotif|\balerts?\b/i},
 {key:'integration',title:'Integration and channels',words:/\bintegration|\bapis?\b|\bchannels?\b|\bgateway/i},
 {key:'batch',title:'Batch and end-of-day processing',words:/\bbatch|\bbulk\b|end[- ]of[- ](?:day|cycle|period)|\bday[- ]end\b|\beod\b|\bperiodic processing|\bschedul/i},
 {key:'configuration',title:'Configuration and security',words:/configuration engine|configuration (?:&|and) security|platform settings|system settings/i},
 {key:'shared',title:'Shared services',words:/cross[- ]cutting|common services|shared services/i}
]);
// A catch-all value of a column ("Other", "Unclassified gap", "General") names no part of the system: its requirements
// go to the module's "Other" sub-module, never to a sub-module of their own.
export const CATCH_ALL=/^(?:other|others|general|misc(?:ellaneous)?|unclassified|not classified|n\/?a|none|tbc|tbd)\b|\bunclassified\b|\bfunctional gap\b|^other\b/i;
export const concernOf=text=>{const t=String(text||'');for(const c of PLATFORM_CONCERNS)if(c.words.test(t))return c.key;return '';};
export const concernTitle=key=>PLATFORM_CONCERNS.find(c=>c.key===key)?.title||'';
// The columns a proposal reads, in the order it prefers them: the first that partitions the requirements into a modest
// number of values gives the modules, the next that splits them further gives the sub-modules.
export const MODULE_COLUMNS=Object.freeze({first:['domain','module','capabilityTheme'],second:['capabilityTheme','module','userGroup']});
// A proposal's bounds: modules and sub-modules a person can still read in one tree.
export const MODULE_BOUNDS=Object.freeze({modules:60,subModules:12,minSub:5,subShare:0.03,subFrom:40,coverage:0.9,secondCoverage:0.5});

const fold=v=>String(v??'').trim().toLowerCase();
const list=v=>Array.isArray(v)?v:[];
const requirementsOf=p=>list(p?.artefacts).filter(a=>a?.type==='requirement');

// ---------------------------------------------------------------- the tree
export function moduleTree(p){return remember(p,'modules','tree',()=>{
 const groups=requirementGroups(p),modules=groups.filter(g=>g.kind==='module'),byId=new Map(groups.filter(isModuleGroup).map(g=>[g.id,g]));
 const children=new Map(modules.map(m=>[m.id,[]]));
 for(const g of groups)if(g.kind==='sub-module'&&children.has(g.parentId))children.get(g.parentId).push(g);
 const index=groupIndex(p),home=new Map(),doubled=new Set(),place=(id,moduleId,subId)=>{const was=home.get(id);if(was&&(was.moduleId!==moduleId||was.subId!==subId)){doubled.add(id);return;}home.set(id,{moduleId,subId});};
 for(const m of modules){
  const kids=children.get(m.id),inKid=new Set();
  for(const s of kids)for(const id of index.members.get(s.id)||[]){if(inKid.has(id)){doubled.add(id);continue;}inKid.add(id);place(id,m.id,s.id);}
  // The module's own members (its rule or ids) that none of its sub-modules holds sit in the module itself.
  for(const id of index.members.get(m.id)||[])if(!inKid.has(id))place(id,m.id,null);
 }
 const served=new Map();
 const reqs=requirementsOf(p);
 for(const m of modules)if(Array.isArray(m.serves)&&m.serves.length)for(const a of reqs)if(ruleMatches(m.serves,a)){const xs=served.get(a.id)||[];if(!xs.includes(m.id))xs.push(m.id);served.set(a.id,xs);}
 const unassigned=modules.length?reqs.filter(a=>!home.has(a.id)&&!doubled.has(a.id)).map(a=>a.id):[];
 const states=new Set(modules.map(m=>m.state==='accepted'?'accepted':'proposed'));
 const state=!modules.length?'none':states.size>1?'mixed':[...states][0];
 return {modules:modules.map(m=>({group:m,children:children.get(m.id)})),byId,home,unassigned,doubled:[...doubled],served,state};
});}
export const hasModules=p=>requirementGroups(p).some(g=>g.kind==='module');
export function topModuleId(p,groupId){const g=moduleTree(p).byId.get(groupId);return !g?'':g.kind==='module'?g.id:(g.parentId||'');}
export function moduleLabel(p,g){if(!g)return '';if(g.kind!=='sub-module')return g.title;const parent=moduleTree(p).byId.get(g.parentId);return (parent?parent.title+' › ':'')+g.title;}
// The leaf a requirement belongs to: its sub-module, else its module ('' outside the structure).
export function requirementModule(p,requirementId){const h=moduleTree(p).home.get(requirementId);return h?{moduleId:h.moduleId,subId:h.subId}:null;}

// ---------------------------------------------------------------- the proposal
function columnStats(reqs,field){
 const values=new Map();let filled=0;
 for(const a of reqs){const v=requirementAttribute(a,field);if(!v)continue;filled++;const k=fold(v);const x=values.get(k);if(x)x.ids.push(a.id);else values.set(k,{value:v,ids:[a.id]});}
 return {field,values,coverage:reqs.length?filled/reqs.length:0,distinct:values.size};
}
function chooseColumn(reqs,fields,{coverage,max,ratio,not=''}){
 for(const f of fields){if(f===not)continue;const s=columnStats(reqs,f);if(s.coverage>=coverage&&s.distinct>=2&&s.distinct<=max&&s.distinct<=Math.max(2,Math.floor(reqs.length/ratio)))return s;}
 return null;
}
const COLUMN_WORDS={domain:'domain',module:'module',capabilityTheme:'capability theme',userGroup:'user group'};
const shortTitle=(t,n=140)=>{const s=String(t||'').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;};
// The proposal: modules from the first column that partitions the requirements (covering 90 % of them in 2 to 60
// values, and no more than one value per four requirements), sub-modules from the next column within each module of 40
// requirements or more (a pair of at least 5 requirements and 3 % of the module, up to 12; the rest, and a catch-all
// value, in one "Other" sub-module), platform modules for the cross-cutting concerns. Nothing is saved here. opts: {first, second} to name the columns a person chose.
export function proposeModules(p,opts={}){
 const reqs=requirementsOf(p),byId=new Map(reqs.map(a=>[a.id,a])),B=MODULE_BOUNDS,notes=[];
 if(!reqs.length)return {basis:null,modules:[],notes:['The project holds no requirements to organise into modules.']};
 const first=opts.first?columnStats(reqs,opts.first):chooseColumn(reqs,MODULE_COLUMNS.first,{coverage:B.coverage,max:B.modules,ratio:4});
 if(!first||first.distinct<2){notes.push('No imported column divides the requirements into modules (one that most of them fill, in 2 to '+B.modules+' values). Name the modules and their rules, or import a column such as a domain or functional area.');return {basis:null,modules:[],notes};}
 const second=opts.second===null?null:opts.second?columnStats(reqs,opts.second):chooseColumn(reqs,MODULE_COLUMNS.second,{coverage:B.secondCoverage,max:80,ratio:8,not:first.field});
 // A theme of the second column is cross-cutting when it names a concern and recurs across the modules.
 const spread=new Map();
 if(second)for(const [k,x] of second.values){const ms=new Set();for(const id of x.ids){const a=byId.get(id);ms.add(fold(requirementAttribute(a,first.field)));}spread.set(k,ms.size);}
 const crossThemes=new Map();
 if(second)for(const [k,x] of second.values){const c=CATCH_ALL.test(x.value)?'':concernOf(x.value);if(c&&spread.get(k)>=Math.min(3,first.distinct))crossThemes.set(k,c);}
 const firstValues=[...first.values.values()].sort((a,b)=>b.ids.length-a.ids.length||a.value.localeCompare(b.value));
 const modules=firstValues.map(x=>{
  const concern=concernOf(x.value),module={key:'m:'+fold(x.value),title:shortTitle(x.value,160),value:x.value,role:concern?'platform':'business',...(concern?{concern}:{}),rule:[{field:first.field,value:x.value.slice(0,GROUP_LIMITS.value)}],members:x.ids.length,children:[]};
  // A module of fewer than 40 requirements is read whole: sub-modules would hold a handful each.
  if(!second||x.ids.length<B.subFrom)return module;
  // Sub-modules: the second column's values within this module, the larger pairs each a sub-module, the rest together.
  const pairs=new Map(),blank=[];
  for(const id of x.ids){const a=byId.get(id),v=requirementAttribute(a,second.field);if(!v||CATCH_ALL.test(v)){blank.push(id);continue;}const k=fold(v),y=pairs.get(k);if(y)y.ids.push(id);else pairs.set(k,{value:v,ids:[id]});}
  const floor=Math.max(B.minSub,Math.ceil(B.subShare*x.ids.length)),sorted=[...pairs.values()].sort((a,b)=>b.ids.length-a.ids.length||a.value.localeCompare(b.value));
  const big=sorted.filter(y=>y.ids.length>=floor).slice(0,B.subModules),small=sorted.filter(y=>!big.includes(y)),rest=small.reduce((n,y)=>n+y.ids.length,0)+blank.length;
  if(big.length+(rest?1:0)<2)return module;
  for(const y of big)module.children.push({key:module.key+'/'+fold(y.value),title:shortTitle(y.value,160),value:y.value,rule:[{field:first.field,value:x.value.slice(0,GROUP_LIMITS.value)},{field:second.field,value:y.value.slice(0,GROUP_LIMITS.value)}],members:y.ids.length,...(crossThemes.has(fold(y.value))?{concern:crossThemes.get(fold(y.value))}:{})});
  if(rest){
   const catchAll=[...new Set(x.ids.map(id=>requirementAttribute(byId.get(id),second.field)).filter(v=>v&&CATCH_ALL.test(v)))];
   const pool=[...small.map(y=>y.value),...catchAll].map(v=>v.slice(0,GROUP_LIMITS.value)),values=pool.slice(0,GROUP_LIMITS.values),named=[...small.filter(y=>!values.includes(y.value.slice(0,GROUP_LIMITS.value))).flatMap(y=>y.ids),...blank.filter(id=>!requirementAttribute(byId.get(id),second.field))];
   module.children.push({key:module.key+'/other',title:shortTitle('Other '+x.value+' requirements',160),other:true,rule:values.length?[{field:first.field,value:x.value.slice(0,GROUP_LIMITS.value)},{field:second.field,op:'is one of',values}]:[],memberIds:named,members:rest});
  }
  return module;
 });
 // Platform modules: one per cross-cutting concern the second column names, the area that names the same concern when
 // the source has one (the largest, if several), else a new platform module that owns nothing and serves the themes.
 const byConcern=new Map();for(const [k,c] of crossThemes){const x=second.values.get(k);if(!byConcern.has(c))byConcern.set(c,[]);byConcern.get(c).push(x.value);}
 for(const [concern,themes] of [...byConcern].sort((a,b)=>a[0].localeCompare(b[0]))){
  const serves=[{field:second.field,op:'is one of',values:themes.map(v=>v.slice(0,GROUP_LIMITS.value)).slice(0,GROUP_LIMITS.values)}];
  const area=modules.filter(m=>m.concern===concern).sort((a,b)=>b.members-a.members)[0];
  if(area){area.serves=serves;continue;}
  const title=themes.length===1?shortTitle(themes[0],160):concernTitle(concern);
  modules.push({key:'p:'+concern,title,role:'platform',concern,rule:[],serves,members:0,children:[],created:true});
 }
 const platform=modules.filter(m=>m.role==='platform').length;
 notes.push(`${modules.length-platform} business and ${platform} platform modules from the ${COLUMN_WORDS[first.field]||first.field} column${second?`, sub-modules from the ${COLUMN_WORDS[second.field]||second.field} column`:''}.`);
 const unused=MODULE_COLUMNS.first.concat(MODULE_COLUMNS.second).filter((f,i,a)=>a.indexOf(f)===i&&f!==first.field&&f!==second?.field).map(f=>columnStats(reqs,f)).filter(s=>s.coverage>0);
 for(const s of unused)if(s.distinct>Math.floor(reqs.length/4))notes.push(`The ${COLUMN_WORDS[s.field]||s.field} column holds ${s.distinct.toLocaleString('en-GB')} distinct values, nearly one per requirement: a feature name, not a module, so it is not used.`);
 // A remainder that holds a third of its module, or a catch-all theme's worth of requirements, is named: the columns do
 // not divide it, so a person splits it before accepting the structure.
 for(const m of modules)for(const c of m.children)if(c.other&&c.members>=Math.max(B.subFrom,Math.ceil(m.members/3)))notes.push(`${c.title} holds ${c.members.toLocaleString('en-GB')} of the module's ${m.members.toLocaleString('en-GB')} requirements: the ${COLUMN_WORDS[second.field]||second.field} column does not divide ${c.members===1?'it':'them'}. Split ${c.members===1?'it':'them'} into sub-modules of your own before accepting the structure.`);
 const placed=new Set(firstValues.flatMap(x=>x.ids)),missing=reqs.filter(a=>!placed.has(a.id)).length;
 if(missing)notes.push(`${missing.toLocaleString('en-GB')} requirement${missing===1?' states':'s state'} no ${COLUMN_WORDS[first.field]||first.field}: place ${missing===1?'it':'them'} in a module.`);
 return {basis:{method:'columns',first:first.field,second:second?.field||null,requirements:reqs.length},modules,notes};
}

// ---------------------------------------------------------------- applied
// The groups a proposal makes (the command requirements.modules-propose, and an import that asks for modules). A module
// whose one-condition rule an existing domain, functional-area or module group holds already is that group, converted in
// place: its id, title, rule, source and links stay, so every record that links it now links the module. Every group is
// saved as proposed, with the basis it came from. The caller checks the limits and that no structure exists.
export function applyModuleProposal(p,proposal,meta,at,actor){
 const m=p.requirementGroups,created=[],converted=[];
 const basis={...proposal.basis,at,...(meta?.datasetId?{datasetId:meta.datasetId}:{})};
 const same=(g,rule)=>Array.isArray(g.rule)&&g.rule.length===1&&rule.length===1&&g.rule[0].field===rule[0].field&&!g.rule[0].op&&fold(g.rule[0].value)===fold(rule[0].value)&&!list(g.memberIds).length;
 const taken=new Set(m.records.map(g=>fold(g.title)));
 // A new module takes the first of its names that no group holds (a platform module: the theme it serves, its concern,
 // its concern as a platform), a number only past them all.
 const unique=(...names)=>{for(const t of names)if(t&&!taken.has(fold(t))){taken.add(fold(t));return t;}const base=names.at(-1);let n=2,t;while(taken.has(fold(t=base+' ('+n+++')')));taken.add(fold(t));return t;};
 const newId=()=>'RG-'+String(++m.counter).padStart(3,'0');
 for(const mod of proposal.modules){
  let g=mod.rule.length?m.records.find(x=>['domain','functional-area','module'].includes(x.kind)&&same(x,mod.rule)):null;
  const fields={role:mod.role,...(mod.concern?{concern:mod.concern}:{}),...(mod.serves?{serves:mod.serves}:{}),state:'proposed',proposal:{...basis,...(g?{from:g.kind}:{})}};
  if(g){Object.assign(g,{kind:'module',...fields,updatedAt:at,updatedBy:actor});converted.push(g.id);}
  else{
   if(m.records.length>=GROUP_LIMITS.groups)throw Error(`A project keeps up to ${GROUP_LIMITS.groups} requirement groups; this structure needs more. Remove groups first.`);
   const names=mod.concern&&mod.role==='platform'?[mod.title,concernTitle(mod.concern),concernTitle(mod.concern)+' platform']:[mod.title,mod.title+' module'];
   g={id:newId(),title:unique(...names),kind:'module',description:moduleDescription(mod,proposal.basis),owner:'',memberIds:[],rule:mod.rule,origin:'aiw',...fields,at,actor};
   m.records.push(g);created.push(g.id);
  }
  const siblings=new Set();
  for(const s of mod.children){
   if(m.records.length>=GROUP_LIMITS.groups)throw Error(`A project keeps up to ${GROUP_LIMITS.groups} requirement groups; this structure needs more. Remove groups first.`);
   let title=s.title;if(siblings.has(fold(title))||fold(title)===fold(g.title))title=shortTitle(s.title,150)+' ('+g.id+')';siblings.add(fold(title));
   const sub={id:newId(),title,kind:'sub-module',parentId:g.id,description:moduleDescription(s,proposal.basis,g),owner:'',memberIds:list(s.memberIds),rule:s.rule,origin:'aiw',...(s.concern?{concern:s.concern}:{}),state:'proposed',proposal:basis,at,actor};
   if(!sub.rule.length&&!sub.memberIds.length)continue;
   m.records.push(sub);created.push(sub.id);
  }
 }
 if(created.length||converted.length)m.version++;
 return {created,converted};
}
function moduleDescription(x,basis,parent=null){
 const col=f=>COLUMN_WORDS[f]||f;
 if(parent)return x.other?`The requirements of ${parent.title} whose ${col(basis.second)} holds fewer than ${MODULE_BOUNDS.minSub} of them, or none: proposed by AIW from the columns, not reviewed by a person.`:`The requirements of ${parent.title} whose ${col(basis.second)} is “${x.value}”: proposed by AIW from the columns, not reviewed by a person.`;
 if(x.created)return `A platform module for ${concernTitle(x.concern).toLowerCase()}, serving the requirements whose ${col(basis.second)} names it across the business modules: proposed by AIW from the columns, not reviewed by a person.`;
 return `The requirements whose ${col(basis.first)} is “${x.value}”: proposed by AIW from the columns, not reviewed by a person.`;
}
