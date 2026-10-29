// Requirement groups (round 12, D-03): a Chapter 1 record RG-nnn that names a functional area, a capability theme, a
// module or a domain, and the requirements it holds. A group keeps its members as explicit requirement ids, as a rule on
// the attributes a requirement was imported with (every condition must hold: domain = X and capability theme = Y), or
// both; a requirement belongs when it is named or when the rule matches it. A rule's condition reads 'field is X',
// 'field is not X' or 'field is one of X, Y' (round 12, DM-22: {field, op, value | values}; a condition saved before
// holds no op and reads 'is'), and every condition must hold. A group of kind user-group holds the requirements of one
// user group, the one an accepted user-group stakeholder links (DM-12). Groups are stored in
// p.requirementGroups = {version, counter, records: [{id, title, kind, description, owner, memberIds, rule, origin,
// source?, alias?, at, actor}]}; their commands (requirements.group, requirements.group-delete) are requirement-commands.js'.
// Round 24 (D-24-01): a group of kind module, with a role, and a group of kind sub-module naming its module (parentId)
// form the project's module structure (module-model.js); a module holds its sub-modules' requirements as well as its own.
// A capability group of the retired assurance.group (GRP-nnn) reads as group RG-nnn, numbered after the project's own
// groups, and keeps its old id as an alias for citations (round 12, DM-24); the migration a group command makes stores
// the same ids.
//
// The readers other chapters use (pure, over the saved document; nothing here changes it):
//   requirementGroups(p)           -> the group records, in id order (a legacy capability group, GRP-nnn, read as one
//                                     until a group command migrates it).
//   groupMembers(p, groupId)       -> the ids of the requirements the group holds, in register order ([] when unknown).
//   groupsOf(p, requirementId)     -> the ids of the groups that hold the requirement, in id order.
//   groupIndex(p)                  -> {members: Map(groupId -> ids), of: Map(requirementId -> groupIds)}: the same
//                                     answers for a loop over many records (built once per settled document or pass).
//   requirementAttribute(a, field) -> the imported attribute a rule reads (GROUP_RULE_FIELDS).
//   groupSummary(p)                -> per group: members, delivered, delivery gaps, confirmed.
//   searchText(a)                  -> the text the register's search reads on a record, lower case.
//   requirementSearchIndex(p)      -> Map(requirementId -> searchText and the ids and titles of its groups): the one text
//                                     the record pickers and the chapter models' Table and Matrix filter on.
// A record of another chapter that links groups names them in a field called requirementGroupIds; a group that such a
// record names cannot be deleted (requirement-commands.js), and traceability expands a group with groupMembers.
import {remember,memoOff} from './document-memo.js';
export const GROUP_KINDS=[['functional-area','Functional area'],['theme','Capability theme'],['module','Module'],['sub-module','Sub-module'],['domain','Domain'],['user-group','User group']];
export const RULE_OPS=['is','is not','is one of'];
// The attributes a rule may read: the typed fields an import keeps on a requirement (intake-domain.js).
export const GROUP_RULE_FIELDS=[['domain','Domain'],['capabilityTheme','Capability theme'],['module','Module'],['userGroup','User group'],['category','Promise or change category'],['priorityBand','Source priority band'],['delivery','Delivery status'],['sourceAuthority','Source authority']];
// Sized for a project of 5,000 requirements: a group may name every one of them; a project keeps up to 500 groups.
export const GROUP_LIMITS=Object.freeze({groups:500,members:5000,conditions:4,value:240,values:50});
const TOP={domain:'domain',capabilityTheme:'capability',module:'module',userGroup:'userGroup'};
const fold=v=>String(v??'').trim().toLowerCase();
export const requirementAttribute=(a,field)=>String((TOP[field]?a?.[TOP[field]]:a?.assessment?.[field])??'').trim();
const holds=(c,a)=>{const v=fold(requirementAttribute(a,c.field)),op=c.op||'is';if(op==='is one of'){const vs=(Array.isArray(c.values)?c.values:[]).map(fold).filter(Boolean);return vs.length>0&&vs.includes(v);}const want=fold(c.value);return want!==''&&(op==='is not'?v!==want:op==='is'&&v===want);};
export const ruleMatches=(rule,a)=>Array.isArray(rule)&&rule.length>0&&rule.every(c=>c&&holds(c,a));
// Capability groups recorded by the retired assurance.group command, read as requirement groups until migrated.
const legacy=p=>(Array.isArray(p?.assurance?.groups)?p.assurance.groups:[]).map((g,i)=>({id:migratedId(p,i),alias:g.id,title:g.title,kind:'theme',description:g.reason||'',owner:'',memberIds:[...(g.requirementIds||[])],rule:[],origin:'migrated',at:g.at,actor:g.actor,legacy:true}));
export const migratedId=(p,i)=>'RG-'+String((p?.requirementGroups?.counter||0)+i+1).padStart(3,'0');
export function requirementGroups(p){const own=Array.isArray(p?.requirementGroups?.records)?p.requirementGroups.records:[];return [...own,...legacy(p)];}
export const groupById=(p,id)=>{const gs=requirementGroups(p);return gs.find(g=>g.id===id)||gs.find(g=>g.alias===id)||null;};
// A group link sent by a legacy capability group's id (GRP-nnn) is stored as the RG-nnn it reads as (round 12,
// GR-REQ-18): every requirementGroupIds of a command, at any depth, as a list or as {add, remove}. The worker reads a
// command through it before applying it, and the staged path (canonical-command.js) each staged command, so a batch's
// review stamp stays the one taken of what the person reviewed (`skip`: keys not to enter, such as a batch's commands).
// Only requirementGroupIds is read: the GRP-nnn of a Chapter 4 responsibility group is another record. A command with
// nothing to resolve is returned as it is. The aliases are read only when a command names a group, so a save that links
// none pays nothing for them.
export function resolveGroupAliases(p,command,{skip=[]}={}){
 if(!command||typeof command!=='object')return command;
 let changed=false,aliases=null;
 const alias=id=>(aliases??=new Map(requirementGroups(p).filter(g=>g.alias&&g.alias!==g.id).map(g=>[g.alias,g.id]))).get(id);
 const ids=v=>Array.isArray(v)?v.map(id=>{const to=typeof id==='string'?alias(id):undefined;if(to){changed=true;return to;}return id;}):v;
 const walk=(v,depth)=>{
  if(!v||typeof v!=='object'||depth>8)return v;
  if(Array.isArray(v)){let out=null;v.forEach((x,i)=>{const y=walk(x,depth+1);if(y!==x){out??=v.slice();out[i]=y;}});return out||v;}
  let out=null;
  for(const [k,x] of Object.entries(v)){
   if(skip.includes(k))continue;
   const y=k==='requirementGroupIds'?(Array.isArray(x)?ids(x):x&&typeof x==='object'?{...x,...(Array.isArray(x.add)?{add:ids(x.add)}:{}),...(Array.isArray(x.remove)?{remove:ids(x.remove)}:{})}:x):walk(x,depth+1);
   if(y!==x){out??={...v};out[k]=y;}
  }
  return out||v;
 };
 const next=walk(command,0);return changed?next:command;
}
// The index is built once per revision of what it reads (round 12, A3: GR-PERF-15). A settled document, or one in a pass,
// keeps its own (document-memo.js); every other document — each one on the server, a command's copy — had it built again
// by each reader, several times in one command that links groups (16 ms a build at 1,400 requirements in 60 rule groups).
// It is kept here by what it reads (indexInputs: the requirements in register order with the attributes the rules read,
// and the groups with their members and rules), for the last INDEX_HELD such revisions, so the commands of one revision,
// and a command's copy that changes no requirement and no group, share one build; with every cache off (unmemoised) it is
// built afresh, as before. Its readers read it and never change it: its lists are frozen.
const INDEX_HELD=4,heldIndexes=new Map();let indexBuilds=0;
// How many indexes have been built in this process (the size-and-speed suite counts them).
export const groupIndexBuilds=()=>indexBuilds;
function indexInputs(p,groups){
 const fields=[...new Set(groups.flatMap(g=>Array.isArray(g.rule)?g.rule.map(c=>c?.field):[]))].sort(),reqs=[];
 for(const a of p?.artefacts||[])if(a?.type==='requirement'){reqs.push(a.id);for(const f of fields)reqs.push(requirementAttribute(a,f));}
 return JSON.stringify([groups.map(g=>[g.id,g.memberIds??null,g.rule??null,g.kind==='sub-module'?g.parentId??null:null]),fields,reqs]);
}
export function groupIndex(p){return remember(p,'requirement-groups','index',()=>{
 const groups=requirementGroups(p);
 if(memoOff())return buildIndex(p,groups);
 const key=indexInputs(p,groups);let index=heldIndexes.get(key);
 if(index){heldIndexes.delete(key);heldIndexes.set(key,index);return index;}
 index=buildIndex(p,groups);heldIndexes.set(key,index);while(heldIndexes.size>INDEX_HELD)heldIndexes.delete(heldIndexes.keys().next().value);
 return index;
});}
function buildIndex(p,groups){
 indexBuilds++;
 const reqs=(p?.artefacts||[]).filter(a=>a.type==='requirement'),order=new Map(reqs.map((a,i)=>[a.id,i])),members=new Map(),of=new Map();
 // Round 12 (speed at size): each attribute a rule reads is folded once per requirement, not once per group, and a
 // rule keeps the requirements that hold each of its conditions in turn: what ruleMatches decides, without reading a
 // requirement's attribute again for every group (1,400 requirements in 37 groups were 51,800 readings an index).
 const folded=new Map(),valuesOf=field=>{let vs=folded.get(field);if(!vs){vs=reqs.map(a=>fold(requirementAttribute(a,field)));folded.set(field,vs);}return vs;};
 const matching=rule=>{let at=null;for(const c of rule){if(!c)return [];const vs=valuesOf(c.field),op=c.op||'is',set=op==='is one of'?new Set((Array.isArray(c.values)?c.values:[]).map(fold).filter(Boolean)):null,want=set?'':fold(c.value);const test=set?v=>set.size>0&&set.has(v):op==='is not'?v=>want!==''&&v!==want:op==='is'?v=>want!==''&&v===want:()=>false;const kept=[];for(const i of at||reqs.keys())if(test(vs[i]))kept.push(i);at=kept;}return at||[];};
 const own=new Map();
 for(const g of groups){
  const ids=new Set((g.memberIds||[]).filter(id=>order.has(id)));
  if(Array.isArray(g.rule)&&g.rule.length)for(const i of matching(g.rule))ids.add(reqs[i].id);
  own.set(g.id,ids);
 }
 // Round 24 (D-24-01): a module holds its sub-modules' requirements as well as its own, so a link to a module reaches
 // every requirement under it.
 const moduleIds=new Set(groups.filter(x=>x.kind==='module').map(x=>x.id));
 for(const g of groups)if(g.kind==='sub-module'&&moduleIds.has(g.parentId))for(const id of own.get(g.id))own.get(g.parentId).add(id);
 for(const g of groups){
  const sorted=[...own.get(g.id)].sort((x,y)=>order.get(x)-order.get(y));members.set(g.id,sorted);
  for(const id of sorted){let xs=of.get(id);if(!xs)of.set(id,xs=[]);xs.push(g.id);}
 }
 for(const xs of members.values())Object.freeze(xs);for(const xs of of.values())Object.freeze(xs);
 return {members,of};
}
export const groupMembers=(p,groupId)=>[...(groupIndex(p).members.get(groupId)||[])];
export const groupsOf=(p,requirementId)=>[...(groupIndex(p).of.get(requirementId)||[])];
// Round 12 (G, GR-UX-06): one search over a requirement wherever a person looks for one. The register's own fields (its
// id, workbook id, title, description, owner, domain, capability theme, module and user group: the register's search,
// requirement-commands.js), and, for the pickers, the Table and the Matrix, the ids and titles of the groups that hold
// it, so a requirement found by its workbook id, its domain or its group in one place is found by it in each.
export const searchText=a=>[a.id,a.externalId,a.title,a.description,a.owner,a.domain,a.capability,a.module,a.userGroup].filter(Boolean).join(' ').toLowerCase();
export function requirementSearchIndex(p){return remember(p,'requirement-groups','search',()=>{
 const names=new Map(requirementGroups(p).map(g=>[g.id,(g.id+' '+(g.title||'')).toLowerCase()])),of=groupIndex(p).of,m=new Map();
 for(const a of p?.artefacts||[])if(a?.type==='requirement')m.set(String(a.id),[searchText(a),...(of.get(a.id)||[]).map(id=>names.get(id)||String(id).toLowerCase())].join(' '));
 return m;
});}
const delivered=a=>fold(a.assessment?.delivery)==='delivered',gap=a=>!!a.assessment?.delivery&&!delivered(a);
// Per group: its members, those delivered, the delivery gaps, the confirmed, and each delivery value with its count
// (DM-22: partly delivered is its own value, as the source states it).
export function groupSummary(p){
 const index=groupIndex(p),byId=new Map((p?.artefacts||[]).map(a=>[a.id,a]));
 return requirementGroups(p).map(g=>{const rs=(index.members.get(g.id)||[]).map(id=>byId.get(id));const deliveries={};for(const a of rs){const v=String(a.assessment?.delivery??'').trim();if(v)deliveries[v]=(deliveries[v]||0)+1;}return {group:g,members:rs.length,delivered:rs.filter(delivered).length,gaps:rs.filter(gap).length,confirmed:rs.filter(a=>a.confirmed).length,deliveries};});
}
export const kindName=kind=>GROUP_KINDS.find(([k])=>k===kind)?.[1]||'Group';
export const ruleText=rule=>(Array.isArray(rule)?rule:[]).map(c=>(GROUP_RULE_FIELDS.find(([f])=>f===c.field)?.[1]||c.field)+' '+(c.op==='is one of'?'is one of '+(c.values||[]).join(', '):(c.op||'is')+' '+c.value)).join(' and ');
// The Chapter 1 register's section (requirements-domain.js exportMarkdown): one row per group.
export function groupsMarkdown(p){
 const rows=groupSummary(p);if(!rows.length)return '';
 const safe=s=>String(s??'').replace(/\r?\n/g,' ').replace(/\|/g,'\\|');
 return `## Requirement groups\n\n${rows.length} groups. A group holds the requirements it names and those its rule matches; a requirement may sit in several groups.\n\n| ID | Group | Kind | Members | Delivery gaps | Confirmed | Membership |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.map(r=>`| ${r.group.id} | ${safe(r.group.title)} | ${kindName(r.group.kind)} | ${r.members} | ${r.gaps} | ${r.confirmed} | ${safe([r.group.rule?.length?'Rule: '+ruleText(r.group.rule):'',r.group.memberIds?.length?r.group.memberIds.length+' named':''].filter(Boolean).join('; ')||'No members')} |`).join('\n')}\n\n`;
}
