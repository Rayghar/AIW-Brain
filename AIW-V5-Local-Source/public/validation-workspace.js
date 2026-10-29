// One presentation contract for chapter checks. Studios supply their findings and
// native action markup; this workspace never changes a domain record or check stamp.
// rc41 (W2): the head is the one layout's — the title, the purpose, the one state line (work-records.js kindsState over
// the chapter's records) and the checks' counts, the primary (Run checks) to the right — followed by the chapter's
// handoff cards (work-frame.js). The next task is published for the shell's footer (aiw:next-task), the one place
// it is said; the "Recommended next" line is retired.
import {esc} from './html-escape.js';
import {scopedChecks,scopedCauses,checkUnits,counted,draftOffer,causeLabel} from './readiness-model.js';
import {chapterStateHTML} from './chapter-strip.js';
import {chapterRecordsState,chapterHandoffHTML} from './work-frame.js';
import {architectureModel} from './architecture-model.js';
import {inheritedFindings,latestDisposition,findingTreatment,reviewSourceUrl} from './review-domain.js';
import {projectURL,shellLens,shellScopeId} from './project-context.js';
import {rankedFindings} from './chapter-brief.js';
import {timeHTML} from './format.js';
import {architectureIntelligence} from './architecture-intelligence.js';
import {intelligenceActionHTML,intelligenceWhyHTML,refreshIntelligenceSlot} from './chapter-insight.js';

const views=new Map(),states=new Map();
// Resolve the current finding from this workspace's own selection, never a click
// payload. Its source may be in another chapter during final review.
export function validationIntelligenceSubject(p){
 const root=typeof document==='undefined'?null:document.querySelector('[data-validation-workspace]'),V=root&&views.get(root.dataset.validationWorkspace),f=V?.rows.find(x=>x.key===V.state.selected),object=f&&V.model.objects.get(f.objectId);
 return V?.p.id===p?.id&&object?{id:object.id,chapter:f.sourceChapter||object.chapter||V.chapter}:null;
}
export function refreshValidationIntelligence(p){
 const root=typeof document==='undefined'?null:document.querySelector('[data-validation-workspace]'),V=root&&views.get(root.dataset.validationWorkspace);
 if(V?.p.id===p?.id)V.refreshIntelligence?.();
}
const sourceCodes=new Set(['source-conflict','source-evidence','source-markup','test-cycle','delivery-assurance','source-removed','source-retained','assurance-stale']);
const keyOf=(p,ch)=>p.id+':'+ch+':'+shellScopeId();
const statusOf=f=>f.treated?'treated':f.category||(f.level==='error'?'gaps':'review');
const statusText=f=>({treated:'Treated',gaps:'Content gap',review:'Review item'}[statusOf(f)]);
const causeKey=f=>(f.sourceChapter||'')+':'+(f.code||f.title);
const stampText=C=>C?.run?.current?'Checks current':C?.run?.at?'Checks out of date':'Checks not recorded';
const groupPreference=p=>'aiw-validate-grouping:'+p.id;
const contextPreference=(p,ch)=>'aiw-validate-groups-'+ch+'-'+encodeURIComponent(shellScopeId()||'whole')+':'+p.id;
function groupPreferences(p,ch){try{const saved=JSON.parse(localStorage.getItem(contextPreference(p,ch))||'{}'),v=saved.mode||localStorage.getItem(groupPreference(p));return {group:v==='kind'?'cause':['priority','object','cause'].includes(v)?v:'priority',groupOpen:saved.open&&typeof saved.open==='object'?saved.open:{}};}catch{return {group:'priority',groupOpen:{}};}}
function persistGroups(V){try{localStorage.setItem(groupPreference(V.p),V.state.group==='cause'?'kind':V.state.group);localStorage.setItem(contextPreference(V.p,V.chapter),JSON.stringify({mode:V.state.group,open:V.state.groupOpen}));}catch{/* Optional browser preference; no design record is changed. */}}
function categoryMatches(f,filter){
  if(filter==='all')return true;
  if(filter==='source')return sourceCodes.has(f.code);
  // Assessment is an independent obligation: an error can still need assessment.
  if(f.set==='source'&&filter==='review')return f.treatmentText==='Needs assessment';
  if(f.set==='source'&&filter==='gaps')return f.level==='error';
  return statusOf(f)===filter;
}

export function validationSurfaceHTML(p,chapter,options){
  const key=keyOf(p,chapter),lens=shellLens(),model=architectureModel(p),inherited=inheritedFindings(p);
  const sourceById=new Map(inherited.filter(f=>f.chapter===chapter).map(f=>[f.sourceId,f]));
  const rows=options.findings.filter(f=>!lens||chapter===11||lens.shows.has(f.objectId)).map(f=>{
    const source=chapter===11?f.sourceFinding:sourceById.get(f.id),treatment=source&&latestDisposition(p,source);
    return {...f,key:(f.set||'chapter')+':'+f.id,sourceFinding:source,treatment,treatmentText:f.set==='source'?findingTreatment(p,source||f):f.treatmentText,fixChapter:f.fixChapter||source?.fixChapter||f.sourceChapter||chapter};
  });
  const C=scopedChecks(p,chapter,lens),causes=scopedCauses(p,chapter,lens);
  let rank=[];if(chapter<11)try{rank=rankedFindings(p,chapter,500);}catch{/* stable source order remains available */}
  const ranks=new Map(rank.map((f,i)=>[f.title+'|'+f.objectId,i]));
  rows.sort((a,b)=>(a.level==='error'?0:1)-(b.level==='error'?0:1)||(ranks.get(a.title+'|'+a.objectId)??1e6)-(ranks.get(b.title+'|'+b.objectId)??1e6));
  const prior=states.get(key),state=prior||{filter:'all',cause:'',query:'',source:'all',set:chapter===11?'final':'chapter',selected:null,limit:40,...groupPreferences(p,chapter),groupLimits:{},causesOpen:false};
  states.set(key,state);views.clear();views.set(key,{p,chapter,options,rows,C,causes,model,state});
  return `<section class="validation-workspace" data-validation-workspace="${esc(key)}" aria-label="Chapter ${chapter} validation">${workspaceHTML(views.get(key))}</section>`;
}
function matching(V,{filter=true,cause=true}={}){const s=V.state,q=s.query.toLowerCase();return V.rows.filter(f=>(f.set||'chapter')===s.set&&(!filter||categoryMatches(f,s.filter))&&(!cause||!s.cause||causeKey(f)===s.cause)&&(s.set!=='source'||s.source==='all'||String(f.sourceChapter)===s.source)&&(!q||(f.title+' '+f.detail+' '+f.objectId+' '+(f.reference||'')).toLowerCase().includes(q)));}
function workspaceHTML(V){
  const {chapter,C,options:o,state:s}=V,U=checkUnits(chapter),offer=draftOffer(V.p,chapter);
  // The checks' counts (findings to fix, items to confirm, passages passing) beside the one state line of the records.
  const counts=C?`<span data-validation-count="fix"><b>${C.toFix}</b> ${esc(counted(C.toFix,U.fix).replace(/^[\d,]+ /,''))}</span><span data-validation-count="confirm"><b>${C.toConfirm}</b> ${esc(counted(C.toConfirm,U.confirm).replace(/^[\d,]+ /,''))}</span><a data-validation-count="pass" href="#vx-sdd" data-validation-passages><b>${C.passing}/${C.total}</b> SDD passages passing</a>`:'';
  let state=null;try{state=chapterRecordsState(V.p,chapter);}catch{state=null;}
  let handoff='';try{handoff=chapterHandoffHTML(chapter,V.p,V.p);}catch{handoff='';}
  const sets=chapter===11?`<nav class="validation-sets" aria-label="Finding sets"><button type="button" data-validation-set="final" aria-pressed="${s.set==='final'}">Final review checks <span>${V.rows.filter(f=>f.set==='final').length}</span></button><button type="button" data-validation-set="source" aria-pressed="${s.set==='source'}">Inherited findings <span>${V.rows.filter(f=>f.set==='source').length}</span></button></nav>`:'';
  return `<header class="validation-header" data-chapter-accent="${chapter}"><div><h2>${esc(o.title)}</h2><p>${esc(o.purpose)}</p>${chapterStateHTML(state,{chapter})}<div class="validation-readiness" aria-label="Readiness summary">${counts}${C?.scope?`<span>Scope: ${esc(C.scope)}</span>`:''}<details><summary>Check record</summary><p>${C?.run?.at?timeHTML(C.run.at):'No check has been recorded.'} ${C?.run?.current?'Matches the saved chapter.':'Run checks after reviewing the current definitions.'}</p><p>Counts update with the saved design. A recorded check is not approval.${chapter===11?' These counts describe final review checks; inherited findings have a separate queue.':''}</p></details></div></div><div class="validation-run">${o.run}<span class="validation-freshness ${C?.run?.current?'current':'stale'}">${stampText(C)}</span></div></header>${o.context||''}${sets}<div class="validation-workflow-actions">${o.actions||''}${offer.kind==='journey'||offer.kind==='grouped'?`<button type="button" class="btn" data-journey-draft="${chapter}"${offer.kind==='grouped'?' data-journey-grouped="true"':''}>${esc(offer.text)}</button>`:''}${offer.kind==='grouped'&&offer.reason?`<p class="r-note" data-draft-reason>${esc(offer.reason)}</p>`:''}</div>${handoff}<div class="validation-main" data-validation-main>${mainHTML(V)}</div><div class="validation-support" data-validation-support></div>`;
}
function causeGroups(V,rows){
  const groups=new Map();
  for(const f of rows){const key=causeKey(f);if(!groups.has(key))groups.set(key,{key,items:[],records:new Map(),treatments:new Map()});const g=groups.get(key);g.items.push(f);const o=V.model.objects.get(f.objectId);if(o)g.records.set(o.id,o);if(f.set==='source')g.treatments.set(f.treatmentText,(g.treatments.get(f.treatmentText)||0)+1);}
  for(const g of groups.values()){const f=g.items[0];g.label=(f.sourceChapter?'Chapter '+f.sourceChapter+' · ':'')+causeLabel(g.items.map(f=>f.title),f.sourceChapter||V.chapter,f.code);}
  return [...groups.values()];
}
function causeOverviewHTML(V){
  const groups=causeGroups(V,matching(V,{cause:false}));
  if(!groups.length)return '';
  const link=o=>`<a data-scope-link href="${esc(projectURL(reviewSourceUrl(o.chapter,o.id,'work')))}">${esc(o.ref||o.id)}</a>`;
  return `<details class="validation-causes" data-validation-causes${V.state.causesOpen?' open':''}><summary>Findings by cause · ${groups.length} ${groups.length===1?'cause':'causes'}</summary><p>Counts follow the current category, search and source chapter. Select a cause to narrow the queue.</p><div class="validation-cause-scroll"><table><thead><tr><th>Cause and rule</th><th>Findings</th><th>Affected records</th>${V.state.set==='source'?'<th>Current treatments</th>':''}<th>Review</th></tr></thead><tbody>${groups.map(g=>{const f=g.items[0],records=[...g.records.values()],rule=V.causes.find(c=>c.rule.replace(/^C\d+:/,'')===f.code&&(!f.sourceChapter||c.rule.startsWith('C'+f.sourceChapter+':')));return `<tr data-validation-cause-row="${esc(g.key)}"><th scope="row"><b>${esc(g.label)}</b><details><summary>Why this check matters</summary><p>${esc(rule?.sentence||f.detail||'Review the affected definitions and their evidence.')}</p></details></th><td data-validation-cause-count>${g.items.length}</td><td><div class="validation-record-chips">${records.slice(0,6).map(link).join(' ')||'The chapter as a whole'}${records.length>6?`<details><summary>${records.length-6} more records</summary>${records.slice(6).map(link).join(' ')}</details>`:''}</div></td>${V.state.set==='source'?`<td data-validation-cause-treatments>${[...g.treatments].map(([label,n])=>`<span data-treatment="${esc(label)}" data-count="${n}">${n} ${esc(label)}</span>`).join('')}</td>`:''}<td><button type="button" class="btn" data-validation-cause-pick="${esc(g.key)}" aria-pressed="${V.state.cause===g.key}">${V.state.cause===g.key?'Show all causes':'Show '+g.items.length}</button>${V.options.causeActions?.(f.code)||''}</td></tr>`;}).join('')}</tbody></table></div></details>`;
}
const findingDetail=f=>f.detail||'Review the saved definition and its evidence.';
function findingItemHTML(V,f,{detail=true}={}){return `<li><button type="button" class="validation-item ${statusOf(f)}" data-validation-select="${esc(f.key)}" aria-pressed="${V.state.selected===f.key}"><span class="validation-item-meta"><span>${statusText(f)}</span><span>${f.sourceChapter?'Ch '+f.sourceChapter+' · ':''}${esc(f.reference||f.objectId||'Chapter')}</span></span><b>${esc(f.title)}</b>${detail?`<small>${esc(findingDetail(f))}</small>`:''}</button></li>`;}
// A list of findings says each explanation once (rc41 close): a cause raises the same sentence on every record it
// reaches ("Complete purpose, owner, operation, protocol, and contract version." on seven contracts), so a later item with
// the same explanation as one above it shows its status, record and title only; the selected finding says it in full.
function findingItemsHTML(V,list){const said=new Set();return list.map(f=>{const d=findingDetail(f),first=!said.has(d);said.add(d);return findingItemHTML(V,f,{detail:first});}).join('');}
// rc41 close: a chapter's own findings name no record (objectId 'project', or none): their group is the chapter as a whole,
// never the internal subject "project". A group's counts agree with their numbers.
const chapterLevel=f=>!f.objectId||f.objectId==='project';
const COUNT_ONE={gaps:'gap',review:'review item',treated:'treated'},COUNT_MANY={gaps:'gaps',review:'review items',treated:'treated'};
function findingGroups(V,rows){
  const groups=new Map(),s=V.state;
  for(const f of rows){const id=s.group==='object'?(f.sourceChapter||V.chapter)+':'+(f.objectId||'project'):causeKey(f),key=s.set+':'+s.group+':'+id;if(!groups.has(key))groups.set(key,{key,items:[]});groups.get(key).items.push(f);}
  return [...groups.values()].map(g=>{const f=g.items[0],o=V.model.objects.get(f.objectId);g.label=s.group==='object'?(f.sourceChapter?'Chapter '+f.sourceChapter+' · ':'')+(o?[o.ref||o.id,o.title].filter(Boolean).join(' · '):chapterLevel(f)?'The chapter as a whole':f.reference||f.objectId):(f.sourceChapter?'Chapter '+f.sourceChapter+' · ':'')+causeLabel(g.items.map(x=>x.title),f.sourceChapter||V.chapter,f.code);return g;});
}
function groupBodyHTML(V,g){const limit=V.state.groupLimits[g.key]||40,shown=g.items.slice(0,limit);return `<ul>${findingItemsHTML(V,shown)}</ul>${g.items.length>shown.length?`<button type="button" class="btn validation-more" data-validation-group-more="${esc(g.key)}">Show ${Math.min(40,g.items.length-shown.length)} more · ${shown.length} of ${g.items.length}</button>`:''}`;}
function queueHTML(V,rows){
  const s=V.state;if(s.group==='priority'){const shown=rows.slice(0,s.limit),selected=rows.find(f=>f.key===s.selected);if(selected&&!shown.includes(selected))shown.push(selected);return `<ul>${findingItemsHTML(V,shown)}</ul>${rows.length>shown.length?`<button type="button" class="btn validation-more" data-validation-more>Show ${Math.min(40,rows.length-shown.length)} more · ${shown.length} of ${rows.length}</button>`:''}`;}
  const groups=findingGroups(V,rows);
  return `<div class="validation-group-tools"><span>${groups.length} ${s.group==='object'?'objects':'kinds'}</span><button type="button" class="text-button" data-validation-groups="expand">Expand all</button><button type="button" class="text-button" data-validation-groups="collapse">Collapse all</button></div><div class="validation-group-list">${groups.map((g,i)=>{const open=s.groupOpen[g.key]??i===0,counts=['gaps','review','treated'].map(k=>{const n=g.items.filter(f=>statusOf(f)===k).length;return n?`<span class="${k}">${n} ${(n===1?COUNT_ONE:COUNT_MANY)[k]}</span>`:''}).join('');return `<details class="validation-finding-group" data-validation-group-id="${esc(g.key)}"${open?' open':''}><summary><b>${esc(g.label)}</b><span class="validation-group-counts">${counts}</span></summary><div data-validation-group-body>${open?groupBodyHTML(V,g):''}</div></details>`;}).join('')}</div>`;
}
function mainHTML(V){
  const {state:s,chapter}=V,base=V.rows.filter(f=>(f.set||'chapter')===s.set),counts=matching(V,{filter:false}),causes=causeGroups(V,matching(V,{filter:false,cause:false})),rows=matching(V);
  // Search must not conceal an active cause while it still filters the queue.
  if(s.cause&&!causes.some(c=>c.key===s.cause)){const active=causeGroups(V,base).find(c=>c.key===s.cause);if(active)causes.push({...active,items:[]});}
  if(!rows.some(f=>f.key===s.selected))s.selected=rows[0]?.key||null;
  const selected=rows.find(f=>f.key===s.selected),filters=[['all','All'],['gaps','Content gaps'],['review',chapter===11&&s.set==='source'?'Awaiting assessment':'Review items'],...(chapter===1?[['source','Source assurance']]:[]),...(base.some(f=>f.treated)?[['treated','Treated']]:[])];
  const confirm=[1,2,4,5,6,8,10].includes(chapter)&&rows.some(f=>statusOf(f)==='review');
  return `<div class="validation-toolbar"><nav class="validation-filters" aria-label="Finding categories">${filters.map(([id,label])=>`<button type="button" data-validation-filter="${id}" aria-pressed="${s.filter===id}">${label}<span>${counts.filter(f=>categoryMatches(f,id)).length}</span></button>`).join('')}</nav><div class="validation-tools"><label class="validation-search"><span class="sr-only">Search findings</span><input type="search" data-validation-search value="${esc(s.query)}" placeholder="Search findings or records"></label><label>Cause<select data-validation-cause><option value="">All causes</option>${causes.map(c=>`<option value="${esc(c.key)}"${s.cause===c.key?' selected':''}>${esc(c.label)} (${c.items.length})</option>`).join('')}</select></label><label>View<select data-validation-group>${[['priority','Priority queue'],['object','By object'],['cause','By kind']].map(([id,t])=>`<option value="${id}"${s.group===id?' selected':''}>${t}</option>`).join('')}</select></label>${chapter===11&&s.set==='source'?`<label>Source chapter<select data-validation-source><option value="all">All chapters</option>${[...new Set(base.map(f=>f.sourceChapter))].sort((a,b)=>a-b).map(c=>`<option value="${c}"${String(c)===s.source?' selected':''}>Chapter ${c}</option>`).join('')}</select></label>`:''}${confirm?'<button type="button" class="btn" data-validation-confirm>Review records for confirmation</button>':''}</div>${causeOverviewHTML(V)}${s.set==='source'?'<p class="validation-filter-note">Content gaps retain their original severity. Awaiting assessment includes errors and review items whose current treatment is Needs assessment.</p>':''}</div><div class="validation-columns"><section class="validation-queue" aria-label="Finding queue"><div class="validation-queue-heading"><b>${rows.length} ${rows.length===1?'finding':'findings'}</b><small>${s.group==='priority'?'Content gaps first, then architectural reach':s.group==='object'?'Groups follow finding priority · expand an object':'Groups follow finding priority · expand a kind'}</small></div>${queueHTML(V,rows)}${!rows.length?'<p class="validation-empty">No findings match these filters.</p><button type="button" class="btn" data-validation-reset>Show all findings</button>':''}</section><section class="validation-detail" aria-label="Selected finding" tabindex="-1">${detailHTML(V,selected)}</section></div><p class="validation-status" role="status" hidden></p>`;
}
// The next task (rc41, W2): the readiness model's, refined by validate-view.js validationNextStep (Record current
// checks when nothing is open and the checks are stale; the chapter's output when the module is clear). It is said
// once, in the shell's footer: the workspace publishes it on its root (data-validation-next, -text, -kind, -reason)
// and through aiw:next-task; nothing here draws a second line for it.
export function validationNextTask(V,nextStep){
  const next=nextStep?.(V.C,V.chapter)||V.C?.next||null;
  return next&&next.text?{kind:next.kind||'',text:next.text,url:next.url?projectURL(next.url):'',reason:next.reason||''}:null;
}
function publishNext(root,V,nextStep){
  const next=validationNextTask(V,nextStep);
  root.dataset.validationNext=next?.url||'';root.dataset.validationNextText=next?.text||'';root.dataset.validationNextKind=next?.kind||'';
  if(next?.reason)root.dataset.validationNextReason=next.reason;else delete root.dataset.validationNextReason;
  if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('aiw:next-task',{detail:{chapter:V.chapter,tab:'validate',next}}));
}
function findingKnowledgeHTML(V,f){
 const object=f&&V.model.objects.get(f.objectId),reading=object?architectureIntelligence(V.p,{chapter:f.sourceChapter||object.chapter||V.chapter,id:object.id,tab:'validate'}):null,i=reading?.primary;
 return i?`<details data-intelligence-id="${esc(i.id)}"><summary>Architecture knowledge and conditions</summary><p><b>${esc(i.question||i.title)}</b></p>${intelligenceWhyHTML(reading,i,{projectId:V.p.id})}${intelligenceActionHTML(reading,i,i.actions?.[0],{projectId:V.p.id})}</details>`:'';
}
function detailHTML(V,f){
  if(!f)return `<div class="validation-empty-detail"><h3>${V.rows.length?'Choose another filter':'No open chapter finding'}</h3><p>${V.rows.length?'The other categories remain available.':'Review the saved design and record current checks before preparing the handoff.'}</p><a class="btn" href="${esc(projectURL('/?chapter='+V.chapter+'&tab=output'))}">Review chapter output</a></div>`;
  const object=V.model.objects.get(f.objectId),record=object?.record,sourceChapter=f.sourceChapter||object?.chapter||V.chapter,cause=V.causes.find(c=>c.rule.replace(/^C\d+:/,'')===f.code&&(!f.sourceChapter||c.rule.startsWith('C'+f.sourceChapter+':'))),refs=V.model.relationships.filter(r=>r.from===f.objectId||r.to===f.objectId),neighbors=[...new Set(refs.map(r=>r.from===f.objectId?r.to:r.from))].map(id=>V.model.objects.get(id)).filter(Boolean);
  const knowledge=`<div data-validation-intelligence>${findingKnowledgeHTML(V,f)}</div>`;
  const evidence=record?Object.entries(record).filter(([k,v])=>/^(source|evidence|evidenceReference|rationale|assumptionEvidence|owner|reviewedBy|reviewDate)$/.test(k)&&v!=null&&v!=='').map(([k,v])=>`<dt>${esc(k.replace(/([a-z])([A-Z])/g,'$1 $2'))}</dt><dd>${esc(typeof v==='object'?JSON.stringify(v):String(v))}</dd>`).join(''):'';
  const inherited=f.sourceFinding,treated=f.treatment;
  const treat=inherited&&V.chapter!==11?(treated?`<p class="validation-treatment">Recorded treatment: ${esc(treated.treatment)}${treated.reason?' · '+esc(treated.reason):''}</p>`:`<button type="button" class="btn" data-action="treat-finding" data-finding="${esc(inherited.id)}" data-stamp="${esc(inherited.stamp)}" data-title="${esc(f.title)}">Treat finding…</button>`):'';
  const open=object?`<div class="validation-source-actions"><button type="button" class="btn" data-validation-inspect="${esc(object.id)}" data-inspect-chapter="${object.chapter}">Inspect record</button><a class="btn" data-scope-link href="${esc(projectURL(reviewSourceUrl(sourceChapter,f.objectId,'work')))}">Open ${esc(object.ref||f.objectId)} in Work</a></div>`:'';
  return `<header><span class="validation-detail-kicker">${statusText(f)}${f.sourceChapter?' · Chapter '+f.sourceChapter:''}</span><h3>${esc(f.title)}</h3><p>${esc(f.detail||'Review this definition against the chapter checks.')}</p></header><div class="validation-remedy"><h4>Resolve or review</h4><div class="validation-detail-actions">${f.actions||''}${f.fixChapter!==sourceChapter?`<a class="btn" data-scope-link href="${esc(projectURL('/?chapter='+f.fixChapter+'&tab=work&scope='))}">Fix in Chapter ${f.fixChapter}</a>`:''}${treat}<button type="button" class="btn" data-validation-ask="${esc(f.key)}">Ask Sol</button></div>${V.options.causeActions?.(f.code)||''}${f.treatmentText?`<p>${esc(f.treatmentText)}</p>`:''}</div>${cause?.sentence&&cause.sentence!==f.detail?`<section><h4>Why this check matters</h4><p>${esc(cause.sentence)}</p></section>`:''}<section><h4>Source and evidence</h4>${object?`<p><b>${esc(object.ref||object.id)} · ${esc(object.title)}</b></p>${evidence?`<dl class="validation-evidence">${evidence}</dl>`:'<p>Review the saved definition and its linked sources before recording a decision.</p>'}${open}${knowledge}`:`<p>This finding concerns the chapter or a definition that has not been recorded yet.</p>`}</section>${neighbors.length?`<details class="validation-connections"><summary>Connected records · ${neighbors.length}</summary><ul>${neighbors.slice(0,12).map(o=>`<li><a href="${esc(projectURL(reviewSourceUrl(o.chapter,o.id,'work')))}">${esc(o.ref+' · '+o.title)}</a></li>`).join('')}</ul>${neighbors.length>12?`<a href="${esc(projectURL('/?chapter='+sourceChapter+'&tab=model&object='+encodeURIComponent(f.objectId)))}">Inspect all connections in Model</a>`:''}</details>`:''}`;
}
export function mountValidationWorkspace(host,{askSol,nextStep}={}){
  const root=host.querySelector('[data-validation-workspace]');if(!root||root.dataset.bound)return;root.dataset.bound='1';
  const current=()=>views.get(root.dataset.validationWorkspace);
  publishNext(root,current(),nextStep);
  current().refreshIntelligence=()=>{if(!root.isConnected)return;const V=current();publishNext(root,V,nextStep);refreshIntelligenceSlot(root.querySelector('[data-validation-intelligence]'),findingKnowledgeHTML(V,V.rows.find(f=>f.key===V.state.selected)));};
  const syncControls=()=>{const s=current()?.state;if(!s)return;for(const [name,key]of [['group','group'],['cause','cause'],['source','source']]){const input=root.querySelector('[data-validation-'+name+']');if(input)input.value=s[key];}};
  const update=focus=>{const V=current();if(!V)return;root.querySelector('[data-validation-main]').innerHTML=mainHTML(V);publishNext(root,V,nextStep);syncControls();root.querySelectorAll('[data-validation-set]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.validationSet===V.state.set)));if(focus)root.querySelector(focus)?.focus({preventScroll:true});};
  syncControls();
  root.addEventListener('click',async e=>{
    const b=e.target.closest('button,a');if(!b)return;const V=current();if(!V)return;const s=V.state;
    if(b.dataset.validationInspect){document.dispatchEvent(new CustomEvent('aiw:inspect-record',{detail:{id:b.dataset.validationInspect,chapter:Number(b.dataset.inspectChapter)}}));return;}
    if(b.hasAttribute('data-validation-run')){root.querySelector('.validation-run button')?.click();return;}
    if(b.dataset.validationCausePick){s.cause=s.cause===b.dataset.validationCausePick?'':b.dataset.validationCausePick;s.selected=null;s.limit=40;update('[data-validation-cause]');return;}
    if(b.dataset.validationGroups){for(const g of findingGroups(V,matching(V)))s.groupOpen[g.key]=b.dataset.validationGroups==='expand';persistGroups(V);update('[data-validation-groups="'+b.dataset.validationGroups+'"]');return;}
    if(b.dataset.validationGroupMore){const key=b.dataset.validationGroupMore;s.groupLimits[key]=(s.groupLimits[key]||40)+40;update('[data-validation-group-more="'+CSS.escape(key)+'"]');return;}
    if(b.hasAttribute('data-validation-passages')){e.preventDefault();const d=root.querySelector('#vx-sdd');if(d){d.open=true;d.scrollIntoView({block:'nearest'});}return;}
    if(b.dataset.validationSelect){s.selected=b.dataset.validationSelect;update(`[data-validation-select="${CSS.escape(s.selected)}"]`);if(window.innerWidth<620)root.querySelector('.validation-detail')?.scrollIntoView({block:'start'});return;}
    if(b.dataset.validationFilter){s.filter=b.dataset.validationFilter;s.selected=null;s.limit=40;update(`[data-validation-filter="${s.filter}"]`);return;}
    if(b.dataset.validationSet){s.set=b.dataset.validationSet;s.filter='all';s.cause='';s.source='all';s.selected=null;s.limit=40;update();return;}
    if(b.hasAttribute('data-validation-more')){s.limit+=40;update('[data-validation-more]');return;}
    if(b.hasAttribute('data-validation-reset')){Object.assign(s,{filter:'all',cause:'',query:'',source:'all',limit:40});update();return;}
    if(b.dataset.validationAsk){const f=V.rows.find(f=>f.key===b.dataset.validationAsk);if(f){const reading=architectureIntelligence(V.p,{chapter:f.sourceChapter||V.chapter,id:f.objectId,tab:'validate'}),i=reading.primary;askSol?.(f.objectId,f.title+'. '+(f.detail||'')+(i?' Shared design question '+i.id+': '+(i.question||i.title)+'. Inspect its current source conditions.':''));}return;}
    if(b.hasAttribute('data-validation-confirm')){b.disabled=true;try{const {openConfirmationReview}=await import('./validation-confirmation.js'),ids=new Set(matching(V).filter(f=>statusOf(f)==='review').map(f=>f.objectId));const d=openConfirmationReview(window.aiwProjectStore,V.chapter,{ids});if(!d){const n=root.querySelector('.validation-status');n.hidden=false;n.textContent='These items need their individual review or evidence workflow. Open a finding to continue.';}}catch(error){const n=root.querySelector('.validation-status');n.hidden=false;n.textContent=error.message;}finally{b.disabled=false;}}
  });
  root.addEventListener('toggle',e=>{const V=current(),el=e.target;if(!V||!el.isConnected)return;if(el.matches('[data-validation-causes]'))V.state.causesOpen=el.open;if(el.matches('[data-validation-group-id]')){const key=el.dataset.validationGroupId;V.state.groupOpen[key]=el.open;persistGroups(V);const g=findingGroups(V,matching(V)).find(g=>g.key===key);el.querySelector('[data-validation-group-body]').innerHTML=el.open&&g?groupBodyHTML(V,g):'';}},true);
  root.addEventListener('change',e=>{const V=current();if(!V)return;for(const [attribute,key]of [['validationCause','cause'],['validationGroup','group'],['validationSource','source']])if(e.target.dataset[attribute]!==undefined){V.state[key]=e.target.value;V.state.selected=null;V.state.limit=40;if(key==='group')persistGroups(V);if(key==='source')V.state.cause='';update('[data-'+attribute.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+']');}});
  root.addEventListener('input',e=>{if(!e.target.matches('[data-validation-search]'))return;const V=current();if(!V)return;const at=e.target.selectionStart;V.state.query=e.target.value;V.state.limit=40;update('[data-validation-search]');const input=root.querySelector('[data-validation-search]');try{input.setSelectionRange(at,at);}catch{/* search inputs need no range restoration */}});
}
