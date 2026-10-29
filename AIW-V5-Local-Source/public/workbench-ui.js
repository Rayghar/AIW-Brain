import {architectureAnalysis} from './architecture-analysis.js';
import {previewWorkingChange,workingBasis,libraryCurrent,scenarioComparisonCurrent} from './workbench-domain.js';
import {STAGED_COMMANDS,reviewsOnItsOwn} from './canonical-command.js';
import {projectURL} from './project-context.js';
import {journeyIndex,journeyObjectURL} from './journey-context.js';
import {esc} from './html-escape.js';
import {openDialog,closeDialog,setDialogBusy,returnFocus,showDialogError} from './dialog.js';
import {commandChangeDetail} from './project-store.js';
import {fieldOf} from './record-fields.js';
// The brief's change review compares each field by its canonical digest (brain-integrity.js). The rc.10.73.38 snapshot
// (f6fdb02) dropped this import while keeping the comparison, so every brief review threw; restored in rc40 (W4).
import {digest} from './brain-integrity.js';
export const field=(name,label,value='',type='text')=>`<label class="brain-field"><span>${label}</span><input name="${name}" type="${esc(type)}" value="${esc(value)}" ${type==='number'?'step="any" min="0"':''}></label>`;
export const area=(name,label,value='')=>`<label class="brain-field"><span>${label}</span><textarea name="${name}" rows="3">${esc(value)}</textarea></label>`;
export const select=(name,label,options)=>`<label class="brain-field"><span>${label}</span><select name="${name}">${options.map(o=>`<option value="${esc(o.id??o)}">${esc(o.title??o)}</option>`).join('')}</select></label>`;
export const button=(action,label,attrs='')=>`<button type="button" class="btn" data-wb-action="${action}" ${attrs}>${label}</button>`;
export const download=(name,value)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export const project=()=>window.aiwProjectStore?.value?.document;
let context,refresh;
export function modal(title,body){const dialog=openDialog({className:'intake-dialog wb-dialog',label:title,html:`<header><h2>${esc(title)}</h2><button type="button" class="btn" data-close data-dialog-close aria-label="Close ${esc(title)}">×</button></header><div class="intake-body">${body}<p data-error role="alert" hidden></p></div>`,onCancel:()=>dialog.closeView(),closeSelector:null});dialog.closeView=()=>closeDialog(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.closeView();dialog.error=e=>{const n=dialog.querySelector('[data-error]');n.hidden=false;n.textContent=e.message||e;};return dialog;}
export async function save(command){const result=await window.aiwProjectStore.command(command);document.dispatchEvent(new CustomEvent('aiw:external-project',{detail:commandChangeDetail(command,result)}));refresh?.();return result;}
// What a save changed travels with the event (audit F2-22): see project-store.js commandChangeDetail.
export {commandChangeDetail as projectChangeDetail};
export function formModal(title,body,onSubmit){const d=modal(title,`<form>${body}<button class="btn primary" type="submit">${onSubmit.label||'Review & save'}</button></form>`);d.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('[type=submit]');if(b.disabled)return;b.disabled=true;try{await onSubmit(Object.fromEntries(new FormData(e.target)),d,e.target);}catch(err){d.error(err);}finally{if(b.isConnected)b.disabled=false;}};return d;}
export const pretty=v=>typeof v==='string'?v:JSON.stringify(v??null,null,2);
// Review uses the editor's words. Exact values remain available, including long prose
// and nested links; a concise first reading never discards part of the proposed change.
const fieldLabel=key=>String(key).replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').replace(/\bIds\b/g,'references').replace(/\bId\b/g,'reference').replace(/^./,c=>c.toUpperCase());
const scalarText=value=>value===null||value===undefined||value===''?'Not recorded':typeof value==='boolean'?(value?'Yes':'No'):String(value);
function readableValue(value){
 if(value===null||typeof value!=='object'){
  const text=scalarText(value);return text.length>1800?`<span>${esc(text.slice(0,1800))}…</span><details class="wb-exact"><summary>Read full value · ${text.length.toLocaleString('en-GB')} characters</summary><p>${esc(text)}</p></details>`:`<span>${esc(text)}</span>`;
 }
 const list=Array.isArray(value),entries=list?value.map((v,i)=>[String(i+1),v]):Object.entries(value);
 const summary=v=>v===null||typeof v!=='object'?scalarText(v):Array.isArray(v)?`${v.length} ${v.length===1?'item':'items'}`:v.title||v.name||v.id||`${Object.keys(v).length} fields`;
 const rows=entries.slice(0,8).map(([key,v])=>`<li>${list?'':`<b>${esc(fieldLabel(key))}:</b> `}${esc(summary(v))}</li>`).join('');
 return `${entries.length?`<ul class="wb-readable-value">${rows}</ul>${entries.length>8?`<small>${entries.length-8} more ${list?'items':'fields'} in exact data below.</small>`:''}`:'<span>None recorded</span>'}<details class="wb-exact"><summary>Exact data · ${entries.length} ${list?'items':'fields'}</summary><pre>${esc(pretty(value))}</pre></details>`;
}
function fieldChangeHTML(field,label=fieldLabel(field.key)){
 return `<div class="wb-change" data-change-field="${esc(field.key)}"><b>${esc(label)}</b><del><small class="wb-value-label">Before</small>${readableValue(field.before)}</del><ins><small class="wb-value-label">After</small>${readableValue(field.after)}</ins></div>`;
}
function briefChangeHTML(brief){
 const fields=[...new Set([...Object.keys(brief.before||{}),...Object.keys(brief.after||{})])].filter(key=>digest(brief.before?.[key]??null)!==digest(brief.after?.[key]??null));
 return `<section class="wb-brief-change" aria-label="Project brief changes"><h3>Project brief · ${fields.length} ${fields.length===1?'changed field':'changed fields'}</h3>${fields.map(key=>fieldChangeHTML({key,before:brief.before?.[key],after:brief.after?.[key]},fieldOf('brief',key)?.label||fieldLabel(key))).join('')}<details class="wb-exact"><summary>Exact brief data</summary><pre>${esc(pretty(brief))}</pre></details></section>`;
}
export function diffHTML(diff){if(!diff.records.length&&!diff.edges.length)return '';return `<div class="wb-diff">${diff.records.slice(0,40).map(r=>`<article><h3><small>${esc(r.kind)} · Chapter ${esc(r.chapter)}</small>${esc(r.id+' · '+r.title)}</h3>${r.fields.filter(f=>!['history','review','sourceSnapshot','revision'].includes(f.key)).map(f=>fieldChangeHTML(f)).join('')}</article>`).join('')}${diff.records.length>40?`<details class="wb-exact"><summary>${diff.records.length-40} additional object changes · exact data</summary><pre>${esc(pretty(diff.records.slice(40)))}</pre></details>`:''}${diff.edges.length?`<details><summary>${diff.edges.length} relationship changes</summary>${diff.edges.slice(0,80).map(e=>`<p>${esc(e.kind)} · ${esc(e.from)} → ${esc(e.to)} · ${esc(e.label)}</p>`).join('')}${diff.edges.length>80?`<details class="wb-exact"><summary>${diff.edges.length-80} more relationships · exact data</summary><pre>${esc(pretty(diff.edges.slice(80)))}</pre></details>`:''}</details>`:''}<details class="wb-exact wb-change-data"><summary>Exact change data, including history and review metadata</summary><pre>${esc(pretty(diff))}</pre></details></div>`;}
export async function reviewOrdinaryChange(p,command){
 const q=reviewPreview(p,command);if(!q)return command;
 return reviewDialog(q,[command]);
}
// Several ordinary changes reviewed together, as one change to the working design — used where a
// chapter or the review desk drafts a change for the architect to confirm. Resolves to the
// workspace command to send, or null when cancelled or when nothing would change.
export async function reviewDesignChanges(p,commands,{intro='',reason='',title='Review this design change'}={}){
 if(!commands.length||commands.some(c=>!STAGED_COMMANDS.has(c.type)))throw Error('Only ordinary design changes can be reviewed here.');
 const q=previewWorkingChange(p,commands);if(!q.diff.records.length&&!q.diff.edges.length&&!q.brief)return null;
 return reviewDialog(q,commands,{intro,reason,title});
}
// Whether an ordinary change needs a person's review before it is sent: a staged command that names an
// existing record (or the brief) and would change something.
export function reviewPreview(p,command){
 if(!command||!reviewsOnItsOwn(command.type)||!command.payload?.id&&command.type!=='brief')return null;
 const q=previewWorkingChange(p,[command]);if(!q.diff.records.length&&!q.diff.edges.length&&!q.brief)return null;
 return q;
}
function reviewBodyHTML(q,{intro='',reason=''}={}){
 return `${intro}${q.brief?briefChangeHTML(q.brief):''}${diffHTML(q.diff)}<details><summary>Linked downstream work · ${q.affected.length}</summary>${q.affected.map(n=>`<p>Chapter ${esc(n.chapter)} · ${esc(n.id+' · '+n.title)}</p>`).join('')||'<p>No downstream objects are linked yet.</p>'}</details><p class="brain-note">These relationships identify work to review. They do not establish that a target is met or a change is safe in production.</p><label class="brain-check"><input data-reviewed type="checkbox">I reviewed the changed definition and its dependencies.</label>${area('reason','Reason for the change',reason)}<div class="brain-actions">${button('apply-preview','Apply to working design')}${button('retain-preview','Keep as an alternative')}</div><div data-name hidden>${field('title','Alternative name')}</div>`;
}
// The review controls resolve to the workspace command to send: apply, or keep as an alternative (which
// needs a name). An unticked acknowledgement is an inline message, not a round trip.
function bindReview(root,q,commands,decide,error){
 root.addEventListener('click',e=>{const action=e.target.closest('[data-wb-action]')?.dataset.wbAction;if(!['apply-preview','retain-preview'].includes(action))return;e.preventDefault();e.stopPropagation();if(action==='retain-preview'&&!root.querySelector('[name=title]').value){root.querySelector('[data-name]').hidden=false;root.querySelector('[name=title]').focus();return;}const reviewed=root.querySelector('[data-reviewed]').checked,reason=root.querySelector('[name=reason]').value;if(action==='apply-preview'&&!reviewed){error('Review the changed definition before applying.');root.querySelector('[data-reviewed]').focus();return;}decide({type:action==='apply-preview'?'workspace.apply':'workspace.alternative',payload:{commands,stamp:q.stamp,reviewed,reason,title:root.querySelector('[name=title]').value}});});
}
function reviewDialog(q,commands,{intro='',reason='',title='Review this design change'}={}){
 return new Promise(resolve=>{let done=false;const d=modal(title,reviewBodyHTML(q,{intro,reason}));const close=d.closeView;d.closeView=()=>{if(!done){done=true;resolve(null);}close();};bindReview(d,q,commands,command=>{done=true;resolve(command);close();},text=>d.error(text));});
}
// The same review inside the editor that proposed the change (audit F2-01): the form gives way to the
// preview, the acknowledgement and the reason; the editor's own close path stays in charge; "Back to
// editing" (or Escape) restores the form with focus on its submit control and leaves the status untouched,
// since nothing was attempted. Resolves to the command to send (the reviewed workspace command, or the
// original when no review is needed), or null when the person went back. `always` reviews a change that only the
// reviewed workspace path carries (a new process object, path or claim: round 5, R5-C), with `intro` saying what it does.
export function reviewChangeInDialog(dialog,p,command,{title='Review this design change',always=false,intro=''}={}){
 // Projection validates references before a save is attempted. Keep an invalid edit in
 // its original form and use that editor's error slot instead of rejecting its submit handler.
 const previousError=dialog?.querySelector('[data-wb-preview-error]');if(previousError){previousError.hidden=true;previousError.textContent='';delete previousError.dataset.wbPreviewError;}
 let q;try{q=always&&reviewsOnItsOwn(command?.type)?previewWorkingChange(p,[command]):reviewPreview(p,command);}catch(err){if(!showDialogError(dialog,err.message||'This change could not be reviewed. Check the definition and its references.'))throw err;dialog.querySelector('[role=alert]').dataset.wbPreviewError='true';return Promise.resolve(null);}if(!q)return Promise.resolve(command);
 const form=dialog?.querySelector('form');if(!dialog||!form)return reviewDialog(q,[command],{title});
 return new Promise(resolve=>{
  let done=false;const panel=document.createElement('section');panel.className='wb-review-step';panel.setAttribute('data-dialog-review','');panel.setAttribute('aria-label',title);
  panel.innerHTML=`<h3 class="wb-review-title">${esc(title)}</h3><p data-error class="l-error" role="alert" hidden></p>${reviewBodyHTML(q,{intro})}<div class="brain-actions">${button('back-to-editing','Back to editing')}</div>`;
  form.hidden=true;form.after(panel);setDialogBusy(dialog,'review');
  const finish=value=>{if(done)return;done=true;dialog.removeEventListener('aiw:dialog-closed',closed);panel.remove();form.hidden=false;setDialogBusy(dialog,false);resolve(value);if(!value&&dialog.isConnected)returnFocus(null,{fallbacks:[form.querySelector('button[type=submit]'),form.querySelector('input,textarea,select,button')]});};
  const closed=()=>finish(null);dialog.addEventListener('aiw:dialog-closed',closed);
  panel.addEventListener('click',e=>{if(e.target.closest('[data-wb-action="back-to-editing"]')){e.preventDefault();e.stopPropagation();finish(null);}});
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(null);}});
  bindReview(panel,q,[command],finish,text=>{const slot=panel.querySelector('[data-error]');slot.hidden=false;slot.textContent=text;});
  panel.querySelector('[data-reviewed]').focus();
 });
}
function graphChips(p,ids){const index=journeyIndex(p);return ids.map(id=>{const n=index.nodes.get(id);return n?`<a class="wb-object" href="${projectURL(journeyObjectURL(n))}">${esc(n.ref||id)}<b>${esc(n.title)}</b></a>`:''}).join('<span class="wb-arrow" aria-hidden="true">→</span>');}
export function workbenchHTML(p,c,mode){
 context=c;const m=p.workbench||{alternatives:[],analyses:[],catalogue:[],views:[]},relevant=m.catalogue.filter(e=>({1:['requirement-template'],2:['scenario-template'],3:['decision-template','standard','pattern','reference-architecture'],7:['technology'],9:['control'],10:['runbook'],11:['document-template']}[c.chapter]||[]).includes(e.kind));
 let specific=c.chapter===2?`<details class="brain-basis"><summary>Priorities, workload and measurement</summary><p>Discuss business impact, compare measurable scenarios and trace changed targets into the design.</p>${button('quality-workshop','Facilitate a priority discussion')}</details>`:'';if([4,5,6].includes(c.chapter)){const a=architectureAnalysis(p,c.chapter);specific=`<details class="brain-basis"><summary>${esc(a.title)}</summary>${(a.cycles||[]).map(c=>`<div class="wb-cycle">${graphChips(p,c.ids)}</div><p>${esc(c.obligation)}</p>`).join('')||(c.chapter===4?'':'<p>No dependency cycles identified in this chapter’s saved graph.</p>')}${(a.shared||[]).map(s=>`<h4>${esc(s.component.title)} · shared by ${s.responsibilities.length} responsibilities</h4><div class="wb-cycle">${graphChips(p,s.responsibilities.map(r=>r.id))}</div><p>${s.requirements.length} requirements, ${s.contracts.length} contracts, ${s.controls.length} controls to review together.</p>`).join('')}${(a.candidates||[]).map(v=>`<div class="wb-cycle">${graphChips(p,[v.left,v.right])}</div><p>${esc(v.question)}</p>`).join('')}${(a.domains||[]).map(d=>`<h4>${esc(d.domain)}</h4>${d.capabilities.map(v=>`<p>${esc(v.title)} · alternate ${esc(v.alternate)}</p>`).join('')}`).join('')}</details>`;}
 if(c.chapter===3||c.chapter===7)specific+=`<details class="brain-basis"><summary>Compare whole-life cost and exit</summary><p>Use dated estimates with explicit migration and exit costs.</p>${button('cost','Compare estimates')}${c.chapter===7?button('lifecycle','Design migration or exit'):''}</details>`;
 if(c.chapter===8)specific+=`<details class="brain-basis"><summary>Contract exchange and nested schemas</summary><div class="brain-actions">${button('spec','Import API specification')}${button('schema','Edit or check a nested schema')}${button('lineage','Connect schema fields')}${button('openapi','Export OpenAPI')}${button('asyncapi','Export AsyncAPI')}</div>${(p.interfaces.specifications||[]).map(s=>`<p>${esc(s.title)} · ${esc(s.type)} · source revision ${s.revision} ${button('original-spec','Original JSON',`data-id="${esc(s.id)}"`)}</p>`).join('')}</details>`;
 if(c.chapter===10)specific+=`<details class="brain-basis"><summary>Operating comparisons and rehearsals</summary><div class="brain-actions">${button('capacity','Capacity sensitivity')}${button('environments','Compare environments')}${button('rollout','Rehearse a rollout')}${button('infra','Prepare operating specification')}</div></details>`;
 if(c.chapter===11)specific+=`<details class="brain-basis"><summary>Review packs and delivery evidence</summary><div class="brain-actions">${button('baseline-diff','Compare a baseline')}${button('recovery','Download recovery package')}${button('docx','Export Word review pack')}${button('pdf','Export PDF review pack')}${button('feedback','Import delivery observations')}${button('delivery','Export delivery handoff')}${button('team','Assigned reviews & discussion')}${button('queue','Review the action queue')}${button('source-questions','Resolve source questions')}</div></details>`;
 if(mode==='design')return `${specific}<details class="brain-basis"><summary>Project evidence and saved perspectives</summary><div class="brain-actions">${button('evidence','Attach or inspect original evidence')}${button('activity','Project activity')}${button('operations','Sources & operations')}${(p.assurance?.semanticFindings||[]).length?button('source-questions','Source questions'):''}${button('view','Save this perspective')}${c.chapter!==11?button('team','Assigned reviews'):''}</div>${m.views.map(v=>`<p><a href="${projectURL('/?chapter='+v.chapter+'&tab='+v.tab+(v.objectId?'&'+(v.chapter===1?'artefact':v.chapter===2?'driver':v.chapter===3?'decision':'object')+'='+encodeURIComponent(v.objectId):''))}">${esc(v.title)} · Chapter ${esc(v.chapter)}</a></p>`).join('')}</details>`;
 return `${specific}<details class="brain-basis"><summary>Saved design alternatives · ${m.alternatives.length}</summary><p>Keep related specifications together, then compare their capacity and cost under shared assumptions.</p>${button('compare-alternatives','Compare alternatives')}${m.alternatives.map(a=>`<article class="guide-loop"><b>${esc(a.title)}</b><p>${esc(a.reason)}</p><small>${esc(a.status)} · r${a.revision}${a.status==='draft'?(a.basis===workingBasis(p)?' · current basis':' · working design changed'):''}</small>${a.status==='draft'?button('alternative','Compare with current design',`data-id="${esc(a.id)}"`)+button('revise-alternative','Revise proposal',`data-id="${esc(a.id)}"`):''}</article>`).join('')||'<p>Save an edited definition as an alternative from its change preview.</p>'}</details><details class="brain-basis"><summary>Reusable chapter guidance · ${relevant.length}</summary>${relevant.map(e=>`<article class="guide-loop"><b>${esc(e.title)}</b><p class="brain-prose">${esc(e.content)}</p><small>r${e.revision} · ${esc(e.status)} · ${libraryCurrent(p,e)?'Source current':'Source needs review'} · ${esc(e.owner)}</small><div class="brain-actions">${button('library-edit','Review / revise',`data-id="${esc(e.id)}"`)}${e.kind.endsWith('-template')?button('template','Use as a draft',`data-id="${esc(e.id)}"`):['technology','control','runbook'].includes(e.kind)?button('use-guidance','Adapt to the model',`data-id="${esc(e.id)}" ${e.status!=='approved'||!libraryCurrent(p,e)?'disabled':''}`):''}</div></article>`).join('')}${button('library','Add reusable guidance')}${button('organization','Organisation guidance')}</details>${m.analyses.length?`<details class="brain-basis"><summary>Recorded design analyses · ${m.analyses.length}</summary>${m.analyses.map(a=>`<p><b>${esc(a.title)}</b> · ${(a.kind==='alternatives'?scenarioComparisonCurrent(p,a):a.modelBasis===workingBasis(p))?'Current basis':'Earlier basis'} ${button('analysis','Inspect result',`data-id="${esc(a.id)}"`)}</p>`).join('')}</details>`:''}`;
}
export function mountWorkbench(fn){refresh=fn;}
export function refreshWorkbench(){refresh?.();}
export function feedbackConflictHTML(q){return (q.conflicts||[]).map(c=>`<article class="guide-loop"><h4>${esc(c.externalId+' · '+c.field)}</h4><p>${c.baselineKnown?'Both the project and source changed this field.':'This earlier import has no saved comparison basis. Review each difference.'}</p><div class="wb-change"><span>Current project</span><p>${esc(pretty(c.current))}</p><span>Incoming source</span><p>${esc(pretty(c.incoming))}</p></div>${select('sync-resolution:'+c.key,'Keep which value?',[{id:'',title:'Choose a resolution'},{id:'current',title:'Keep my current value'},{id:'incoming',title:'Use incoming value'}])}</article>`).join('');}
export function feedbackResolutions(root){return Object.fromEntries([...root.querySelectorAll('[name^="sync-resolution:"]')].map(el=>[el.name.slice(16),el.value]));}
// The workbench's document listener is installed once per page and can be removed (audit F2-05).
let installed=null,actionsLoading=null;
const loadActions=()=>actionsLoading??=import('./workbench-actions.js').catch(error=>{actionsLoading=null;throw error;});
export function installWorkbench({loadStandards=()=>import('./standards-domain.js')}={}){
 if(installed||typeof document==='undefined')return;
 const life=installed=new AbortController();let standardsLoading=null,request=0;
 const place=()=>JSON.stringify([project()?.id,window.aiwProjectStore?.value?.revision,context?.chapter,context?.tab,context?.selected?.id,location.search]);
 async function openStandards(action,b){
  const at=place(),sequence=++request,label=b.textContent,editor=document.querySelector('dialog[open]');
  const current=()=>!life.signal.aborted&&sequence===request&&b.isConnected&&place()===at;
  b.disabled=true;b.textContent='Opening…';b.setAttribute('aria-busy','true');
  try{
   const [actions,tools]=await Promise.all([loadActions(),standardsLoading??=Promise.resolve().then(loadStandards).catch(error=>{standardsLoading=null;throw error;})]);
   if(current()&&document.querySelector('dialog[open]')===editor)actions.openWorkbenchStandards(action,tools);
  }catch(error){
   if(current()&&document.querySelector('dialog[open]')===editor){const d=modal('Interface tools could not load','<p>Check your connection, then try again.</p>'+button('retry-standards','Try again'));d.error(error);d.querySelector('[data-wb-action="retry-standards"]').onclick=()=>{d.closeView();if(current())void openStandards(action,b);};}
  }finally{b.disabled=false;b.textContent=label;b.removeAttribute('aria-busy');}
 }
 async function openAction(action,b){const at=place(),sequence=++request,editor=document.querySelector('dialog[open]');b.disabled=true;b.setAttribute('aria-busy','true');try{const actions=await loadActions();if(!life.signal.aborted&&sequence===request&&b.isConnected&&place()===at&&document.querySelector('dialog[open]')===editor)return await actions.workbenchAction(action,b,context);}finally{if(b.isConnected){b.disabled=false;b.removeAttribute('aria-busy');}}}
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-wb-action]');if(!b||b.disabled||b.closest('dialog')&&!['respond'].includes(b.dataset.wbAction))return;try{if(['spec','schema'].includes(b.dataset.wbAction))await openStandards(b.dataset.wbAction,b);else await openAction(b.dataset.wbAction,b);}catch(err){const d=b.closest('dialog');if(d?.error)d.error(err);else modal('This action needs attention',`<p>${esc(err.message)}</p>`);}},{signal:life.signal});window.aiwReviewOrdinaryChange=reviewOrdinaryChange;
}
export function uninstallWorkbench(){installed?.abort();installed=null;if(typeof window!=='undefined'&&window.aiwReviewOrdinaryChange===reviewOrdinaryChange)delete window.aiwReviewOrdinaryChange;}
installWorkbench();
