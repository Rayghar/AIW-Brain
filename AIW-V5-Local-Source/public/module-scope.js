// Which modules a record belongs to (round 24, D-24-03): one reading, used by the screens' scope, the drafting packets,
// the SDD's module sections and the figures. A record is in a module when
//   - it is a requirement the module (or one of its sub-modules) holds;
//   - it links the module or a sub-module (requirementGroupIds), or requirements the module holds (requirementIds, and
//     the members of any other group it links);
//   - it reaches, through the architecture model's module chain, a Chapter 4 responsibility group that realises the
//     module (logical group requirementGroupIds): the chain runs from the group's responsibilities through what fulfils,
//     realises, requires, implements, operates, places and locates them (architecture-model.js moduleIds: components,
//     capabilities, implementations, plans, placements, zones).
// A record in several modules is shared; a platform module also counts the records whose requirements it serves (a
// record's `served` list), apart from the modules it is in. Sub-modules are read the same way, through the sub-module's
// own links and requirements.
// The chain does not reach a data entity, an interface contract, a security control, a threat or an external party: by
// D-24-03 they are in no module, and the screens' lens (module-lens.js) shows them as shared context. A reader that lays
// the design out by module (the SDD's Section 4, a module's figures) places them by what they touch instead, through
// recordAttachments, so every such reader places them alike.
//
//   recordModules(p)        -> Map(record id -> {modules: [module ids], subs: [sub-module ids], served: [module ids]})
//   recordAttachments(p)    -> Map(record id -> {modules, subs, by}) for the records recordModules does not place: a data
//                              entity by the components that own it (by 'owner'), a contract by the components at its ends
//                              ('ends'; both modules where two meet), a control by what it protects and a threat by what
//                              it threatens or the controls that mitigate it ('targets'), an external party by the
//                              components its contracts join ('contracts'); a record that touches nothing placed is absent
//   moduleScope(p, scopeId) -> {scope, module, sub, title, crumbs, requirements: Set, records: Set, served: Set} for a
//                              module or sub-module id; null for any other id
//   scopeHolds(p, scopeId, recordId) -> whether the record is in the scope (true for every record without a scope)
import {moduleTree} from './module-model.js';
import {groupIndex} from './requirement-groups.js';
import {architectureModel} from './architecture-model.js';
import {remember} from './document-memo.js';

const list=v=>Array.isArray(v)?v:[];
export function recordModules(p){return remember(p,'modules','records',()=>{
 const tree=moduleTree(p),out=new Map();
 if(!tree.modules.length)return out;
 const index=groupIndex(p),top=id=>{const g=tree.byId.get(id);return !g?'':g.kind==='module'?g.id:g.parentId||'';};
 const entry=id=>{let e=out.get(id);if(!e)out.set(id,e={modules:new Set(),subs:new Set(),served:new Set()});return e;};
 const fromRequirement=(e,rid)=>{const h=tree.home.get(rid);if(h){e.modules.add(h.moduleId);if(h.subId)e.subs.add(h.subId);}for(const m of tree.served.get(rid)||[])e.served.add(m);};
 // Requirements first: each in its leaf.
 for(const [rid] of tree.home)fromRequirement(entry(rid),rid);
 for(const [rid,ms] of tree.served)for(const m of ms)entry(rid).served.add(m);
 // Chapter 4 responsibility groups that realise a module or a sub-module.
 const realised=new Map();
 for(const g of list(p?.logical?.groups))for(const id of list(g.requirementGroupIds)){const m=top(id);if(!m)continue;const r=realised.get(g.id)||{modules:new Set(),subs:new Set()};r.modules.add(m);if(tree.byId.get(id)?.kind==='sub-module')r.subs.add(id);realised.set(g.id,r);}
 const model=architectureModel(p);
 for(const o of model.objects.values()){
  if(o.type==='requirement')continue;
  const r=o.record||{},e=entry(o.id);
  for(const gid of list(r.requirementGroupIds)){const g=tree.byId.get(gid);if(g){e.modules.add(top(gid));if(g.kind==='sub-module')e.subs.add(gid);}else for(const rid of index.members.get(gid)||[])fromRequirement(e,rid);}
  for(const rid of list(r.requirementIds))fromRequirement(e,rid);
  for(const gid of list(o.moduleIds)){const x=realised.get(gid);if(x){for(const m of x.modules)e.modules.add(m);for(const s of x.subs)e.subs.add(s);}}
  if(o.type==='module'){const x=realised.get(o.id);if(x){for(const m of x.modules)e.modules.add(m);for(const s of x.subs)e.subs.add(s);}}
  if(!e.modules.size&&!e.subs.size&&!e.served.size)out.delete(o.id);
 }
 const frozen=new Map();
 for(const [id,e] of out)frozen.set(id,Object.freeze({modules:Object.freeze([...e.modules]),subs:Object.freeze([...e.subs]),served:Object.freeze([...e.served].filter(m=>!e.modules.has(m)))}));
 return frozen;
});}
export function recordAttachments(p){return remember(p,'modules','attachments',()=>{
 const R=recordModules(p),out=new Map();
 if(!R.size)return out;
 const placed=id=>{const e=R.get(id)||out.get(id);return e&&(e.modules.length||e.subs.length)?e:null;};
 const attach=(id,from,by)=>{
  if(!id||R.has(id)||out.has(id))return;
  const modules=new Set(),subs=new Set();
  for(const f of from){const e=placed(f);if(!e)continue;for(const m of e.modules)modules.add(m);for(const x of e.subs)subs.add(x);}
  if(modules.size||subs.size)out.set(id,Object.freeze({modules:Object.freeze([...modules]),subs:Object.freeze([...subs]),by}));
 };
 const add=(m,k,v)=>{if(k&&v)m.set(k,[...(m.get(k)||[]),v]);};
 const owners=new Map(),mitigators=new Map(),joins=new Map();
 for(const c of list(p?.realisation?.components))for(const d of list(c.dataIds))add(owners,d,c.id);
 for(const c of list(p?.security?.controls))for(const t of list(c.threatIds))add(mitigators,t,c.id);
 for(const c of list(p?.interfaces?.contracts)){add(joins,c.from,c.to);add(joins,c.to,c.from);}
 // In this order, so a control reads the data it protects and a threat the controls that mitigate it.
 for(const d of list(p?.interfaces?.data))attach(d.id,[d.authorityId,...(owners.get(d.id)||[])].filter(Boolean),'owner');
 for(const c of list(p?.interfaces?.contracts))attach(c.id,[c.from,c.to].filter(Boolean),'ends');
 for(const c of list(p?.security?.controls))attach(c.id,list(c.targetIds),'targets');
 for(const t of list(p?.security?.threats))attach(t.id,[...list(t.targetIds),...(mitigators.get(t.id)||[])],'targets');
 for(const x of list(p?.interfaces?.parties))attach(x.id,joins.get(x.id)||[],'contracts');
 return out;
});}
export function moduleScope(p,scopeId){return remember(p,'modules','scope:'+scopeId,()=>{
 const tree=moduleTree(p),g=tree.byId.get(scopeId);if(!g)return null;
 const module=g.kind==='module'?g:tree.byId.get(g.parentId),sub=g.kind==='sub-module'?g:null;
 const requirements=new Set(),records=new Set(),served=new Set();
 for(const [rid,h] of tree.home)if(sub?h.subId===sub.id:h.moduleId===module.id)requirements.add(rid);
 for(const [id,e] of recordModules(p)){
  if(sub?e.subs.includes(sub.id):e.modules.includes(module.id))records.add(id);
  else if(!sub&&e.served.includes(module.id))served.add(id);
 }
 const crumbs=[{id:module.id,title:module.title},...(sub?[{id:sub.id,title:sub.title}]:[])];
 return {scope:g.id,module,sub,title:crumbs.map(c=>c.title).join(' › '),crumbs,requirements,records,served};
});}
export function scopeHolds(p,scopeId,recordId){if(!scopeId)return true;const s=moduleScope(p,scopeId);return !s||s.records.has(recordId)||s.requirements.has(recordId);}
