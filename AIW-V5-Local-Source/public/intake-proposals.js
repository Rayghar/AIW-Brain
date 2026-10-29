// What a workbook import proposes besides its requirements (round 12, D-09). Read by the intake service on the server;
// every proposal is shown in the import preview, covered by its stamp, and either created on a reviewed apply (groups,
// the priorities a band mapping sets) or kept on the dataset for the person to accept or dismiss in Chapter 1
// (stakeholders from a user-group column, a brief from the workbook's overview sheets). Nothing is invented: every
// value comes from a cell, and a proposed brief sentence cites its sheet and cell.
import {markupIn} from './assurance-domain.js';
import {GROUP_LIMITS,requirementGroups} from './requirement-groups.js';
import {withRequirementGroups} from './requirement-commands.js';
import {proposeModules,applyModuleProposal,isModuleKind} from './module-model.js';
import {INTAKE_FIELDS,suggestMapping,titleOf} from './intake-domain.js';
import {regulationsNamed} from './statement-checks.js';
import {columnLabel} from './workbook-reader.js';
import {digest} from './brain-integrity.js';
const fold=v=>String(v??'').trim().toLowerCase();
const words=s=>String(s).trim().split(/\s+/).filter(Boolean).length;
// The priority a band value may set; '' is "not stated" (round 12, GR-INT-19), the person's to choose for a band.
export const PRIORITY_CHOICES=['Must','Should','Could'];
// ---------------------------------------------------------------- the priority band
// How strongly a band value asks for attention: 4 critical, 3 high, 2 medium, 1 low or watch, 0 delivered or done;
// null when the value names no level AIW recognises.
const RANKS=[[/\b(critical|urgent|highest|very high|blocker|showstopper|must|mandatory|essential|p0|p1)\b/i,4],[/\b(high|important|major|should|p2)\b/i,3],[/\b(medium|moderate|normal|could|p3)\b/i,2],[/\b(low|minor|watch|nice to have|optional|later|won.?t|p4|p5)\b/i,1],[/(?<!\bnot\s)\b(delivered|done|complete|completed|closed|implemented)\b/i,0]];
export function bandRank(value){const v=String(value??'').trim();if(/^\d+$/.test(v))return Math.max(1,5-Number(v));for(const [re,rank] of RANKS)if(re.test(v))return rank;return null;}
// The sensible default for each band value found: the strongest level found is Must, the next Should, every weaker
// level Could; a band that says the work is delivered is Could; a value AIW does not recognise is not stated ('', round
// 12, GR-INT-19), as a row with no band is: AIW cannot tell its order. The person changes any of them at inspect.
export function defaultPriorityMap(values){
 const ranks=[...new Set(values.map(v=>bandRank(v.value??v)).filter(r=>r!==null&&r>0))].sort((a,b)=>b-a),map={};
 for(const v of values){const value=String(v.value??v).trim();if(!value)continue;const r=bandRank(value);map[value]=r===null?'':r===0?'Could':ranks.indexOf(r)===0?'Must':ranks.indexOf(r)===1?'Should':'Could';}
 return map;
}
// The band values of one column below the header row, most frequent first.
export function bandValues(sheet,headerRow,column){
 if(!column)return [];const counts=new Map();
 for(const row of sheet.rows)if(row.number>Number(headerRow)){const c=row.cells.find(x=>x.address===column+row.number),v=String(c?.value??'').trim();if(v)counts.set(v,(counts.get(v)||0)+1);}
 return [...counts].map(([value,count])=>({value,count})).sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value)).slice(0,60);
}
// A map the person sent: band value -> Must, Should, Could or '' (not stated, kept so that a re-import proposes the same
// choice); anything else is dropped.
export function cleanPriorityMap(raw){
 const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 for(const [k,v] of Object.entries(raw).slice(0,60)){const key=String(k).trim().slice(0,240);if(key&&(PRIORITY_CHOICES.includes(v)||v===''))out[key]=v;}
 return out;
}
// ---------------------------------------------------------------- a re-import's saved mapping (round 12, GR-INT-06)
// A new revision of a dataset is proposed the mapping the dataset was saved with, matched by header: a saved column whose
// header moved is followed, one whose header changed in place is kept and said so, one that is gone falls back to AIW's
// suggestion. Every difference is listed before the preview: those, the fields AIW would map that the saved mapping left
// out, and the saved choices AIW would not have suggested (kept, as the person chose them).
const normal=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function savedMapping(dataset,headers,labels={},{exclude=[]}={}){
 const suggested=suggestMapping(headers,{exclude}),at=c=>headers.find(h=>h.column===c),byLabel=new Map(),out={},differences=[],free=c=>c&&!exclude.includes(c);
 for(const h of headers){const k=normal(h.label);if(!byLabel.has(k))byLabel.set(k,h);}
 const cell=c=>c?{column:c,label:at(c)?.label||''}:null;
 for(const field of Object.keys(INTAKE_FIELDS)){
  const col=dataset?.mapping?.[field]||'',label=labels?.[field]||'',here=at(col);out[field]='';if(!col)continue;
  if(here&&free(col)&&(!label||normal(here.label)===normal(label))){out[field]=col;continue;}
  const moved=label?byLabel.get(normal(label)):null;
  if(moved&&free(moved.column)){out[field]=moved.column;differences.push({field,kind:'moved',saved:{column:col,label},now:cell(moved.column)});}
  else if(here&&free(col)){out[field]=col;differences.push({field,kind:'renamed',saved:{column:col,label},now:cell(col)});}
  else{out[field]=suggested[field]&&!Object.values(out).includes(suggested[field])?suggested[field]:'';differences.push({field,kind:'gone',saved:{column:col,label},now:cell(out[field])});}
 }
 for(const field of Object.keys(INTAKE_FIELDS)){
  if(differences.some(d=>d.field===field))continue;const s=suggested[field]||'',o=out[field]||'';if(s===o)continue;
  if(!o){if(!Object.values(out).includes(s))differences.push({field,kind:'new',suggested:cell(s)});}
  else differences.push({field,kind:'kept',now:cell(o),suggested:cell(s)});
 }
 return {mapping:out,differences};
}
// The saved band mapping for the bands found now: a value seen before keeps the person's choice, a new one takes its
// default, and one no longer found is listed.
export function savedBands(saved={},values=[]){
 const map={},differences=[],had=new Map(Object.entries(saved||{}).map(([k,v])=>[k.toLowerCase(),[k,v]])),defaults=defaultPriorityMap(values);
 for(const v of values){const k=String(v.value??v).trim();const s=had.get(k.toLowerCase());if(s)map[k]=s[1];else{map[k]=defaults[k];differences.push({value:k,kind:'new',priority:defaults[k]});}}
 for(const [k,[name]] of had)if(!values.some(v=>String(v.value??v).trim().toLowerCase()===k))differences.push({value:name,kind:'gone'});
 return {map,differences};
}
// ---------------------------------------------------------------- personal data (round 12, GR-SRC-06)
// A column is personal data when a label-like header (four words or fewer, not a sentence) names a person's role (a
// lead, an owner, a contact, a reviewer, a tester …) and most cells below it are a person's: a name of one to four words
// in any case (initials too; no digits, no word of a team, an organisation or a status), or an e-mail address, with
// names of two words or more, or addresses, among them; or when much of a column is e-mail addresses or telephone
// numbers. Flagged with the reason, never with the values, and held back from what the project keeps (snapshots, mapped
// fields, proposals) unless the person chooses to import it ({sheet, column} keys in `include`). AIW's rule, not a
// judgement of the law.
const PERSON_ROLE=/\b(?:leads?|owners?|contacts?|person|people|assignees?|assigned to|reviewers?|approvers?|analysts?|managers?|authors?|reporters?|testers?|champions?|sponsors?|signator(?:y|ies)|requesters?|raised by|signed by|prepared by|staff|employees?|full name|first name|last name|given name|surname|family name|contact name|e-?mails?|phone|mobile|telephone)\b/i;
const ORG_WORDS=/\b(?:team|teams|desk|floor|office|department|dept|unit|group|operations|services?|bank|ltd|limited|plc|inc|llc|committee|board|management|control|support|admin|administration|branch|division|centre|center|section|authority|ministry|agency|system|platform|module|product|account|customer|report|finance|audit|risk|compliance|treasury|credit|channels?|technology|engineering|business|sales|marketing|legal|vendor|supplier|partner|review|analysis)\b/i;
const STATUS_WORDS=/^(?:yes|no|y|n|n\/a|na|tbd|tbc|pending|complete|completed|done|open|closed|approved|rejected|active|inactive|none|nil|unassigned|unknown|all|various|other|others|self|high|medium|low)$/i;
const NAME_TOKEN=/^[A-Za-z][A-Za-z'’.-]*$/,EMAIL=/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
export const personLike=v=>{const s=String(v).trim();if(EMAIL.test(s))return true;const t=s.split(/\s+/);return t.length<=4&&t.every(x=>NAME_TOKEN.test(x))&&!ORG_WORDS.test(s)&&!STATUS_WORDS.test(s);};
// An e-mail address, or a telephone number written as one (a leading +, or digits grouped by spaces or brackets; seven to
// fifteen digits): not a date, an amount or a bare number.
const CONTACT=v=>EMAIL.test(v)||/^(?:\+|\(?\d)[\d\s()-]{6,}$/.test(v)&&/^\+|[\s()]/.test(v)&&!/^\d{4}-\d{2}-\d{2}/.test(v)&&(n=>n>=7&&n<=15)(v.replace(/\D/g,'').length);
export const personalKey=(sheet,column)=>sheet+'!'+column;
export function personalColumns(sheet,{maxRows=3000}={}){
 const byColumn=new Map();
 for(const r of sheet.rows.slice(0,maxRows))for(const c of r.cells){const v=String(c.value??'').trim();if(!v)continue;if(!byColumn.has(c.column))byColumn.set(c.column,[]);byColumn.get(c.column).push({row:r.number,value:v});}
 const out=[];
 for(const [n,cells] of byColumn){
  const column=columnLabel(n),contacts=cells.filter(c=>CONTACT(c.value));
  if(contacts.length>=2&&contacts.length>=cells.length*0.3){out.push({sheet:sheet.name,column,label:'',count:contacts.length,reason:`${contacts.length} cells hold e-mail addresses or telephone numbers`,values:contacts.map(c=>c.value)});continue;}
  for(let i=0;i<cells.length;i++){
   const h=cells[i],label=h.value.replace(/_+/g,' ');if(!PERSON_ROLE.test(label)||words(label)>4||/[.!?;:]$/.test(label))continue;
   const run=[];for(let j=i+1;j<cells.length&&cells[j].row-(run.at(-1)?.row??h.row)<=3&&run.length<5000;j++)run.push(cells[j]);
   const named=run.filter(c=>personLike(c.value)),full=named.filter(c=>EMAIL.test(c.value)||words(c.value)>=2);
   if(run.length>=2&&named.length>=run.length*0.6&&full.length>=Math.max(2,named.length*0.3)){out.push({sheet:sheet.name,column,label:h.value,header:column+h.row,count:named.length,reason:`the header “${h.value}” names a person's role and ${named.length} of ${run.length} cells below it are names or e-mail addresses`,values:named.map(c=>c.value)});break;}
  }
 }
 return out;
}
// What a flag says on the receipt and in the preview: never the values.
export const personalFlag=(f,include=[])=>({sheet:f.sheet,column:f.column,label:f.label,...(f.header?{header:f.header}:{}),count:f.count,reason:f.reason,included:include.includes(personalKey(f.sheet,f.column))});
// The names held back: those of the flagged columns no one chose, for the sentences that would carry them.
export const heldNames=(flags,include=[])=>new Set(flags.filter(f=>!include.includes(personalKey(f.sheet,f.column))).flatMap(f=>f.values).filter(v=>v.length>=3));
const namesIn=(text,names)=>{for(const n of names){const i=text.indexOf(n);if(i>=0&&!/\w/.test(text[i-1]||'')&&!/\w/.test(text[i+n.length]||''))return true;}return false;};
// ---------------------------------------------------------------- what the rows say beyond themselves (round 12)
// GR-SRC-03: per mapped column, how many rows fill it, leave it empty or repeat the statement word for word, and how
// many distinct values it holds (the five most frequent when it reads as labels: fifty values or fewer).
const flat=v=>String(v??'').replace(/\s+/g,' ').trim().toLowerCase();
export function columnProfile(source){
 return Object.entries(source.mapping).filter(([f,c])=>c&&!['externalId','description'].includes(f)).map(([field,column])=>{
  let filled=0,same=0;const counts=new Map();
  for(const r of source.rows){const v=String(r.fields[field]??'').trim();if(!v)continue;filled++;if(flat(v)===flat(r.fields.description))same++;counts.set(v,(counts.get(v)||0)+1);}
  return {field,column,label:source.headers.find(h=>h.column===column)?.label||column,filled,empty:source.rows.length-filled,sameAsStatement:same,distinct:counts.size,...(counts.size&&counts.size<=50?{top:[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(([value,count])=>({value:value.slice(0,80),count}))}:{})};
 });
}
// GR-INT-04: an intended outcome that says more than the statement it belongs to is proposed as a Chapter 1 outcome,
// once per distinct text, with the requirements that state it (they deliver it once a person accepts it). A very long
// cell is marked: it may hold text from another part of the source.
export function outcomeProposals(source){
 if(!source.mapping.outcome)return [];
 const key=v=>flat(v).replace(/[.!;:,\s]+$/,''),by=new Map(),label=source.headers.find(h=>h.column===source.mapping.outcome)?.label||'Intended outcome';
 for(const r of source.rows){const t=String(r.fields.outcome??'').replace(/\s+/g,' ').trim();if(!t||key(t)===key(r.fields.description)||markupIn(t))continue;const k=key(t),x=by.get(k)||{text:t,externalIds:[]};x.externalIds.push(r.externalId);by.set(k,x);}
 return [...by.entries()].sort((a,b)=>b[1].externalIds.length-a[1].externalIds.length||a[0].localeCompare(b[0])).slice(0,200).map(([k,x])=>({key:digest(k).slice(0,16),title:titleOf(x.text),text:x.text.slice(0,4000),count:x.externalIds.length,externalIds:x.externalIds.slice(0,500),label,...(x.text.length>600?{long:true}:{})}));
}
// GR-INT-10: a row that names a regulator or an instrument (statement-checks.js regulationsNamed) is proposed, not
// created, as a Chapter 1 constraint with its constraint driver (kind C), once per name, with the rows that name it.
export function constraintProposals(source,{lens=false}={}){
 const by=new Map();
 for(const r of source.rows)for(const n of regulationsNamed(r.fields.description,{lens})){const k=n.name.toLowerCase(),x=by.get(k)||{name:n.name,kind:n.kind,externalIds:[]};if(!x.externalIds.includes(r.externalId))x.externalIds.push(r.externalId);by.set(k,x);}
 const title=x=>x.kind==='regulator'?'Obligations set by '+(/^[A-Z]/.test(x.name)?'':'the ')+x.name:x.kind==='regime'?'Comply with '+x.name+' obligations':'Comply with '+(/^[A-Z]{2,}|^(?:Directive|Regulation)\s/.test(x.name)?'':'the ')+x.name;
 return [...by.entries()].sort((a,b)=>b[1].externalIds.length-a[1].externalIds.length||a[0].localeCompare(b[0])).slice(0,100).map(([k,x])=>({key:digest(k).slice(0,16),name:x.name,kind:x.kind,title:title(x).slice(0,160),count:x.externalIds.length,externalIds:x.externalIds.slice(0,500),driverKind:'constraint'}));
}
// GR-SRC-05: the columns of a sheet that refer to a row of the requirement sheet (whole numbers under a header that
// names a row, or that sit within one row of the row they refer to), checked against the row each referenced
// requirement is on: how many match, and the shift most of the others share (off by one).
// entries: [{expected: the requirement's row, cells: [[column, value], …]}].
export function rowReferences(entries,headerOf){
 const cols=new Map();
 for(const e of entries)for(const [column,v] of e.cells){if(!/^\d{1,7}$/.test(String(v).trim()))continue;const d=Number(v)-e.expected;let x=cols.get(column);if(!x)cols.set(column,x={column,checked:0,deltas:new Map()});x.checked++;x.deltas.set(d,(x.deltas.get(d)||0)+1);}
 const out=[];
 for(const x of cols.values()){
  const label=headerOf(x.column)||'',exact=x.deltas.get(0)||0,near=exact+(x.deltas.get(1)||0)+(x.deltas.get(-1)||0);
  if(x.checked<2||!/\brows?\b/i.test(label.replace(/_+/g,' '))&&near<x.checked*0.8)continue;
  const [shift,shifted]=[...x.deltas].filter(([d])=>d!==0).sort((a,b)=>b[1]-a[1]||Math.abs(a[0])-Math.abs(b[0]))[0]||[0,0];
  out.push({column:x.column,label,checked:x.checked,exact,offBy:shifted>exact?shift:0,shifted:shift?shifted:0});
 }
 return out;
}
// GR-SRC-04, GR-SRC-05: the lists a workbook keeps of its own requirements in its assurance sheets (a sheet named for
// validation, assurance, anomalies, exceptions, quality, checks or issues): a run of two or more cells in one column that
// hold the ids just imported, with the cell above it and the nearest title, and the row references beside it checked.
// Kept on the receipt, so the import summary can set the workbook's own anomaly list beside AIW's causes.
const LIST_SHEET=/valid|assur|anomal|exception|reconcil|quality|\bqa\b|\bchecks?\b|\bissues?\b/i;
export async function sourceLists(workbook,source,{exclude='',sheets=4,rows=3000}={}){
 const ids=new Set(source.rows.map(r=>r.externalId)),rowOf=new Map(source.rows.map(r=>[r.externalId,r.sourceRow])),out=[];
 for(const s of workbook.sheets.filter(s=>!s.hidden&&s.name!==exclude&&LIST_SHEET.test(s.name)).slice(0,sheets)){
  const sheet=await workbook.sheet(s.name),grid=new Map(sheet.rows.slice(0,rows).map(r=>[r.number,new Map(r.cells.map(c=>[c.column,String(c.value??'').trim()]))])),hits=new Map();
  for(const [n,cells] of grid)for(const [c,v] of cells)if(ids.has(v)){if(!hits.has(c))hits.set(c,[]);hits.get(c).push({row:n,id:v});}
  for(const [c,list] of hits){
   let run=[];const flush=()=>{if(run.length>=2){
    const from=run[0].row,to=run.at(-1).row,L=columnLabel(c),above=k=>grid.get(from-k)?.get(c)||'';let title='';for(let k=2;k<=6&&!title;k++){const v=above(k);if(v&&!ids.has(v))title=v;}
    const head=new Map([...(grid.get(from-1)||new Map())].map(([k,v])=>[columnLabel(k),v]));
    const refs=rowReferences(run.map(h=>({expected:rowOf.get(h.id),cells:[...(grid.get(h.row)||new Map())].filter(([k])=>k!==c).map(([k,v])=>[columnLabel(k),v])})),col=>head.get(col)||'');
    out.push({sheet:s.name,column:L,range:L+from+':'+L+to,header:above(1),title:title.slice(0,160),count:run.length,ids:run.map(h=>h.id).slice(0,500),rowReferences:refs});
   }run=[];};
   for(const h of list){if(run.length&&h.row-run.at(-1).row>3)flush();run.push(h);}flush();
  }
 }
 return out.slice(0,12);
}
// ---------------------------------------------------------------- groups and stakeholders
// Groups come from the domain and capability-theme columns: one per distinct value, unless a group with that one rule
// exists already. A column with more distinct values than a project keeps groups is left ungrouped and said so.
const GROUP_COLUMNS=[['domain','domain','Domain','domain'],['capabilityTheme','capability','Capability theme','theme']];
const gap=f=>!!String(f.delivery||'').trim()&&fold(f.delivery)!=='delivered';
export function groupProposals(project,source){
 const existing=requirementGroups(project);
 return GROUP_COLUMNS.filter(([,field])=>source.mapping[field]).map(([rule,field,label,kind])=>{
  const by=new Map();for(const r of source.rows){const v=String(r.fields[field]||'').trim();if(!v)continue;const x=by.get(fold(v))||{value:v,count:0,gaps:0};x.count++;x.gaps+=Number(gap(r.fields));by.set(fold(v),x);}
  const values=[...by.values()].sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value)).map(x=>({...x,exists:existing.some(g=>g.rule?.length===1&&g.rule[0].field===rule&&fold(g.rule[0].value)===fold(x.value))}));
  const header=source.headers.find(h=>h.column===source.mapping[field]);
  return {field:rule,kind,label,column:source.mapping[field],header:header?.label||label,distinct:values.length,...(values.length>200?{skipped:'More than 200 distinct values: too many to group by.',values:[]}:{values})};
 });
}
// Round 24 (D-24-02): what the module structure would be, read from the rows being imported (the structure itself is
// proposed from the whole project once the import is applied: module-model.js). The review step shows it.
export function moduleProposalPreview(project,source){
 if(requirementGroups(project).some(g=>isModuleKind(g.kind)))return {exists:true};
 const artefacts=source.rows.map(r=>({id:r.externalId,type:'requirement',domain:r.fields.domain,capability:r.fields.capability,module:r.fields.module,userGroup:r.fields.userGroup,assessment:r.fields}));
 const proposal=proposeModules({artefacts});
 return {basis:proposal.basis,notes:proposal.notes,modules:proposal.modules.slice(0,60).map(m=>({title:m.title,role:m.role,members:m.members,subModules:m.children.length,...(m.serves?{serves:m.serves[0]?.values?.length||0}:{})}))};
}
export function stakeholderProposals(project,source,previous=null){
 if(!source.mapping.userGroup)return null;
 const known=new Set(project.artefacts.filter(a=>a.type==='stakeholder'||a.type==='actor').flatMap(a=>[fold(a.title),fold(a.userGroup)]).filter(Boolean));
 const settled=new Map((previous?.stakeholders||[]).filter(s=>s.status!=='proposed').map(s=>[fold(s.name),s]));
 const by=new Map();for(const r of source.rows){const v=String(r.fields.userGroup||'').trim().slice(0,160);if(!v)continue;const x=by.get(fold(v))||{name:v,count:0,gaps:0};x.count++;x.gaps+=Number(gap(r.fields));by.set(fold(v),x);}
 const header=source.headers.find(h=>h.column===source.mapping.userGroup);
 return {column:source.mapping.userGroup,label:header?.label||'User group',values:[...by.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,100).map(x=>settled.get(fold(x.name))||{...x,status:known.has(fold(x.name))?'exists':'proposed'})};
}
export function markupFlags(source){
 return source.rows.map(r=>({r,m:markupIn(r.fields.description)})).filter(x=>x.m).slice(0,500).map(({r,m})=>({externalId:r.externalId,sourceRow:r.sourceRow,cell:source.mapping.description+r.sourceRow,cleaned:m.cleaned.slice(0,300)}));
}
// ---------------------------------------------------------------- the brief
// A generic reader of the sheets a workbook keeps for its reader: a read-me, an overview, a summary, a dashboard, an
// introduction. It reads prose only (a cell of six or more words that ends a sentence, or of ten or more words) from
// the top of each such sheet, splits it into sentences and keeps each with its sheet and cell. Tables of numbers and
// short labels are passed over. The sheets take turns, so a long read-me does not crowd out a dashboard's readout. The
// person chooses which sentences describe the problem and which the outcome, and edits them. Round 12 (GR-SRC-06): a
// sentence that names a person of a flagged column (personalColumns: of the sheets read here, or the names passed in) is
// held back unless the person chose to import that column; the flags and the count held back are reported, never the
// sentence. Returns {sentences, sheets, withheld, personal} (sentences may be empty when all were held back), or null.
const BRIEF_SHEETS=[[/read\s*-?\s*me|introduction|about|overview|purpose|context|background|cover/i,0],[/summary|dashboard|executive|scope/i,1]];
const sheetKind=name=>{for(const [re,k] of BRIEF_SHEETS)if(re.test(name))return k;return null;};
const GOAL=/\b(goal|goals|objective|objectives|aim|aims|purpose|intend|intended|so that|to ensure|enable|improve|reduce|increase|achieve|value|outcome|outcomes|target|roadmap|next version)\b/i;
export async function proposeBrief(workbook,{exclude='',limit=12,include=[],personal=[]}={}){
 const sheets=workbook.sheets.filter(s=>!s.hidden&&s.name!==exclude).map(s=>({name:s.name,kind:sheetKind(s.name)})).filter(s=>s.kind!==null).sort((a,b)=>a.kind-b.kind).slice(0,6);
 const seen=new Set(),bySheet=[],read=[],flags=[...personal];
 for(const s of sheets){const sheet=await workbook.sheet(s.name);read.push([s,sheet]);flags.push(...personalColumns(sheet));}
 const names=heldNames(flags,include);let withheld=0;
 for(const [s,sheet] of read){
  const found=[];
  for(const row of sheet.rows.filter(r=>r.number<=80))for(const cell of row.cells.slice(0,20)){
   const value=String(cell.value||'').replace(/\s+/g,' ').trim();
   if(found.length>=30||!/[a-z]{3}/i.test(value)||cell.formula||markupIn(value))continue;
   const n=words(value);if(n<6||!(/[.!?:]$/.test(value)||n>=10))continue;
   for(const text of value.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)){const t=text.trim(),k=fold(t);if(words(t)<6||words(t)>80||seen.has(k))continue;seen.add(k);if(names.size&&namesIn(t,names)){withheld++;continue;}found.push({text:t.slice(0,600),sheet:s.name,cell:cell.address,part:GOAL.test(t)?'goal':'problem'});}
  }
  if(found.length)bySheet.push(found);
 }
 const sentences=[];for(let i=0;sentences.length<limit&&bySheet.some(f=>f[i]);i++)for(const f of bySheet)if(f[i]&&sentences.length<limit)sentences.push(f[i]);
 const flagged=flags.filter(f=>!personal.includes(f)).map(f=>personalFlag(f,include));
 return sentences.length||withheld||flagged.length?{sentences,sheets:[...new Set(sentences.map(x=>x.sheet))],withheld,personal:flagged}:null;
}
// The brief a person starts from: the chosen sentences, the problem and the outcome apart, and the cells they came from.
export function briefFromSentences(sentences,filename){
 const part=k=>sentences.filter(x=>x.part===k).map(x=>x.text).join(' ');
 const cells=new Map();for(const x of sentences){if(!cells.has(x.sheet))cells.set(x.sheet,[]);cells.get(x.sheet).push(x.cell);}
 return {problem:part('problem'),goal:part('goal'),source:(filename+': '+[...cells].map(([sheet,cs])=>sheet+'!'+cs.join(', ')).join('; ')).slice(0,600)};
}
// ---------------------------------------------------------------- applied
// Round 24 (D-24-02): an import that asks for modules proposes the structure from the whole project once its groups are
// made (the domain groups just created become the modules, in place). Nothing is proposed while a structure exists.
export function createImportModules(p,meta,at,actor){
 withRequirementGroups(p);
 if(p.requirementGroups.records.some(g=>isModuleKind(g.kind)))return {created:[],converted:[],skipped:'A module structure exists; it is kept.'};
 const proposal=proposeModules(p);
 if(!proposal.modules.length)return {created:[],converted:[],skipped:proposal.notes[0]||'No module structure could be proposed.'};
 const made=applyModuleProposal(p,proposal,meta,at,actor);
 p.requirementGroups.modules={basis:proposal.basis,notes:proposal.notes,at,actor};
 return {...made,notes:proposal.notes};
}
// The groups a reviewed import creates: one rule per chosen column and value (domain = X, capability theme = Y). A title
// another group holds already is told apart by its kind.
export function createImportGroups(p,proposals,choice,meta,at,actor){
 withRequirementGroups(p);const m=p.requirementGroups,created=[],skipped=[];
 for(const col of proposals||[]){
  if(choice?.[col.field]===false||col.skipped)continue;
  for(const v of col.values){
   if(v.exists||requirementGroups(p).some(g=>g.rule?.length===1&&g.rule[0].field===col.field&&fold(g.rule[0].value)===fold(v.value)))continue;
   if(m.records.length>=GROUP_LIMITS.groups){skipped.push(v.value);continue;}
   const taken=new Set(m.records.map(g=>fold(g.title)));let title=v.value.slice(0,160);if(taken.has(fold(title)))title=(v.value.slice(0,140)+' ('+col.label.toLowerCase()+')');
   const id='RG-'+String(++m.counter).padStart(3,'0');
   m.records.push({id,title,kind:col.kind,description:`The requirements imported from ${meta.filename} whose ${col.header} is “${v.value}”.`.slice(0,4000),owner:'',memberIds:[],rule:[{field:col.field,value:v.value.slice(0,GROUP_LIMITS.value)}],origin:'import',source:{datasetId:meta.datasetId,revision:meta.revision,column:col.column,label:col.header},at,actor});
   created.push(id);
  }
 }
 if(created.length)m.version++;
 return {created,skipped};
}
