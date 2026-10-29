import {hoverTipHTML} from './cursor-tip.js';
// rc41 W3: the canvas's drafts open this chapter's own editors prefilled (canvas-draft.js); the record is saved here as any other.
let draftRelease=null;
import {outputWorkspaceHTML} from './output-workspace.js';
import {validationSurfaceHTML} from './validation-workspace.js';
import {renderStudioRecordCard} from './record-card.js';
import {workFrameHTML,workTraceHTML,sectionFromAddress,validWorkSection} from './work-frame.js';
// Chapter 1, Requirements: the brief, the project context, the journey and the requirements, as a studio of the one
// workspace shell (round 3, A). The shell (app.js) draws the frame — navigation, heading and readiness, tabs, the
// details column and the footer — and calls this studio for its surfaces: work(), validation(), output(),
// inspector(node), assistance(), milestones(), graph(), next() and assistant(kind). bind(bridge) registers every
// document and window listener on one AbortController, which dispose() aborts. Selection and the working tab are the
// shell's (bridge.state); the record and its links are saved only through the project store's commands. The Model tab
// is the chapter's own models (story-view.js, through workspace-ux.js); they edit through window.aiwRequirementsPage.
import {reportLoadFailure} from './load-failures.js';
// One origin vocabulary and label for every chapter (round 12, GR-GOV-06): who wrote a record and whether a person reviewed it.
import {recordProvenance} from './provenance.js';
import {sourceAssurance} from './assurance-domain.js';
import {presentAssistant} from './assistant-surface.js';
import {evidenceContextHTML,evidenceCursorText,evidenceAssistantLink,refineAssistantDialog} from './evidence-ui.js';
import {projectURL,activeProjectId,shellScopeId} from './project-context.js';
import {downloadOutput,registerOutputRecords} from './output-documents.js';
import {scopeLens,lensHolds} from './module-lens.js';
import {TYPES,LINK_TYPES,PRIORITIES,PERSONA_FIELDS,USER_CATEGORIES,OUTCOME_FIELDS,RULE_FIELDS,REQUIREMENT_ATTRIBUTES,typeInfo,related,findings,milestones,guidance,proposals,contextApplicabilityCurrent} from './requirements-domain.js';
import {PRIORITY_BASIS} from './priority-scale.js';
import {esc} from './html-escape.js';
import {recordField,checkHTML,kitFor} from './record-fields.js';
// The field kit, bound to this studio's record types (record-fields.js).
const fArtefact=kitFor('artefact');const fBrief=kitFor('brief');
import {markConnection,looksOffline,revealRecord} from './shell-ux.js';
import {reviewChangeInDialog} from './workbench-ui.js';
import {lifecycleHTML, RETIRE_TEXT, registerDraftEditor} from './studio-kit.js';
import {openDialog,closeDialog as closeSharedDialog,rememberOpener,returnFocus,validateForm} from './dialog.js';
import {perDocument} from './document-memo.js';
import {sparkStudio} from './field-spark.js';
// Round 12 (D-03, D-09, D-15): the register at the size of an import (requirements-scale.js), and the selection, causes
// and commands the server shares (requirement-commands.js).
import {importSummaryHTML,groupsHTML,filterBarHTML,selectionBarHTML,sourceFactsHTML,groupFormHTML,confirmFormHTML,evidenceFormHTML,stakeholdersFormHTML,briefFormHTML,pendingProposals} from './requirements-scale.js';
import {selectRequirements,findingCauses} from './requirement-commands.js';
import {groupById,requirementGroups,searchText} from './requirement-groups.js';
import {draftOffer,chapterChecks} from './readiness-model.js';
const $=s=>document.querySelector(s);
const glyphs={arrow:'M4 12h16m-6-6 6 6-6 6',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',plus:'M12 5v14M5 12h14',layers:'m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5',work:'M4 7h16v14H4zM8 7V3h8v4M4 12h16',model:'M3 3h6v6H3zM15 15h6v6h-6zM6 9v9h9',shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',file:'M5 3h9l5 5v13H5zM14 3v6h5M8 13h8m-8 4h6',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',book:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15',cursor:'m5 3 14 10-7 1-3 7z',lock:'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',edit:'m4 16 12-12 4 4L8 20H4v-4zM14 6l4 4',link:'m9 8 3-3a5 5 0 0 1 7 7l-3 3M15 16l-3 3a5 5 0 0 1-7-7l3-3M8 16l8-8',play:'m8 4 12 8-12 8z',pause:'M8 4v16M16 4v16',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m7 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',menu:'M4 6h16M4 12h16M4 18h16'};
const icon=n=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${glyphs[n]||glyphs.file}"/></svg>`;
const status=a=>a.confirmed?'Confirmed':a.origin==='reference'?'Reference example':'Draft';
const btn=(action,label,style='',attrs='')=>`<button class="r-btn ${style}" data-r-action="${action}" ${attrs}>${label}</button>`;
// The dialog's own buttons: the shared .btn, never a submit.
const dbtn=(action,label,style='',attrs='')=>`<button type="button" class="btn ${style}" data-r-action="${action}" ${attrs}>${label}</button>`;
// The reference note (round 7, E): once per project per viewer, on Work, dismissed with "Got it" and remembered in this
// browser under aiw.note.reference.<project id>; storage is a convenience, the page reads the same without it.
const noteKey=()=>'aiw.note.reference.'+activeProjectId;
const noteDismissed=()=>{try{return localStorage.getItem(noteKey())==='1'}catch{return false}};
const dismissNote=()=>{try{localStorage.setItem(noteKey(),'1')}catch{/* storage is a convenience */}};
const shortHash=s=>esc(String(s||'')).replace(/\b([0-9a-f]{64})\b/g,(m,h)=>`<abbr title="${h}">${h.slice(0,12)}…</abbr>`);
const referenceNote=p=>noteDismissed()||p?.workspace?.template==='blank'?'':`<div class="r-reference-note r-note-once" role="note"><span>Reference examples are labelled throughout. Confirmed means you have reviewed the content; it does not represent governance approval.</span>${btn('dismiss-reference-note','Got it')}</div>`;
const meta=a=>`${a.id} · ${typeInfo(a.type).name}`;
const groupOf=a=>a.type==='journey'||a.type==='requirement'?a.type:'context';
// Derived once per saved revision (document-memo.js): the shell asks for the graph and the milestones on every render.
const milestonesOf=perDocument(milestones);
const graphOf=perDocument(p=>({nodes:[{id:'project',layer:'process',title:p.name,sub:'Chapter 1 · Project brief',description:p.brief?.goal||'',attrs:{Problem:p.brief?.problem||'Not recorded'}},...p.artefacts.map(a=>({id:a.id,ref:a.id,layer:'process',title:a.title,sub:a.id+' · '+(typeInfo(a.type)?.name||a.type),description:a.description||'',attrs:{Type:typeInfo(a.type)?.name||a.type,Owner:a.owner||'Not recorded',Status:status(a)}}))],edges:p.relationships.map(r=>({id:r.id,from:r.from,to:r.to,label:r.kind}))}));

// Any "Draft …" action and any readiness link to a chapter's journey draft (?journey=draft) open the review surface in
// the shell's own frame, loaded on first use. Listened for once, before the shell's own link handling.
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('click',ev=>{
  const el=ev.target?.closest?.('[data-journey-draft],a[href*="journey=draft"]');if(!el||ev.defaultPrevented||ev.button!==0||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey)return;
  let chapter=Number(el.dataset.journeyDraft);if(el.tagName==='A'){try{chapter=Number(new URL(el.href,location.href).searchParams.get('chapter'))}catch{return}}
  if(!(chapter>=1&&chapter<=11))return;ev.preventDefault();ev.stopPropagation();
  import('./journey-draft-ui.js').then(m=>m.openJourneyDraft({chapter,whole:el.dataset.journeyWhole==='true',mode:el.dataset.journeyMode==='model'?'model':'brief',grouped:el.dataset.journeyGrouped==='true'})).catch(e=>{window.dispatchEvent(new CustomEvent('aiw:notice',{detail:{message:'The journey draft could not open: '+(e?.message||'reload the page and try again.')}}))});
},true);
// A chapter's draft asked for by the address itself (a readiness link opened in a new tab) opens once the shell is drawn.
if(typeof location!=='undefined'&&typeof document!=='undefined'&&typeof document.addEventListener==='function'&&new URLSearchParams(location.search).get('journey')==='draft')import('./journey-draft-ui.js').then(m=>m.openFromAddress()).catch(e=>{window.dispatchEvent(new CustomEvent('aiw:notice',{detail:{message:'The journey draft could not open. Reload the page and try again. '+(e?.message||'')}}))});
export function createRequirementsStudio(store){
// The working tab and the selection are the shell's once bound; before that (a unit suite) they are this studio's.
let bridge=null,listeners=null,started=false,localTab='work',localSelected=null,tipTimer,dialogDraft=null,intakeOpening=false;
const doc=()=>store.value?.document;
let project=doc();
const linked=(()=>{const q=new URLSearchParams(location.search),id=q.get('artefact')||q.get('object');return Number(q.get('chapter')||1)===1&&id?project?.artefacts.find(a=>a.id===id):null})();
// A link may name a group or a finding's cause (?group=RG-001, ?cause=journey-link): the register opens filtered by it.
const asked=(()=>{const q=new URLSearchParams(location.search);return Number(q.get('chapter')||1)===1?{group:q.get('group')||'',cause:q.get('cause')||''}:{group:'',cause:''}})();
const ui={section:sectionFromAddress(1,linked?groupOf(linked):asked.group||asked.cause?'requirement':'brief'),filter:'all',query:'',sort:'reference',page:1,reviewPage:1,domain:'',onlyGaps:false,group:asked.group,cause:asked.cause,picked:new Set(),reviewCause:'',bulk:null,reviewFilter:'gaps',ghost:null,busy:false,modal:null,dirty:false};
Object.defineProperties(ui,{
  tab:{get:()=>bridge?.state.tab||localTab,set:v=>{if(bridge)bridge.state.tab=v;else localTab=v}},
  selected:{get:()=>{const id=bridge?bridge.state.selected:localSelected;return id&&id!=='project'?id:null},set:v=>{if(bridge)bridge.state.selected=v||'project';else localSelected=v||null}},
  cursor:{get:()=>bridge?bridge.state.cursor!==false:true}
});
const sync=()=>{project=doc()||project};
function connectButton(label,style='',attrs=''){const disabled=project.artefacts.length<2;return '<span class="r-connect-control">'+btn('link',label,style,attrs+(disabled?' disabled title="Add at least two records before connecting them."':''))+(disabled?'<small>Add at least two records before connecting them.</small>':'')+'</span>';}
// The Chapter 1 models edit through this studio's own editors and proposals.
const page={edit:id=>{sync();editArtefact(id)},add:(type,links)=>{sync();editArtefact(null,null,type,links)},link:preset=>{sync();linkDialog(null,preset)},focus(id){sync();if(get(id)){ui.selected=id;bridge?.route?.()}},get ghost(){return ui.ghost},get busy(){return ui.busy}};
const get=id=>project?.artefacts.find(a=>a.id===id);
const selected=()=>get(ui.selected);
const badge=a=>`<span class="chip ${a.confirmed?'pass':a.origin==='reference'?'reference':'draft'}">${a.confirmed?icon('check'):''}${status(a)}</span>`;
function toast(message){if(bridge)bridge.toast(message)}
// Workbook editors and original-cell inspection are used on request. Keep their
// renderer off the chapter shell's opening path; a late load cannot open a dialog
// for a studio that has been disposed or a project that has since changed.
async function withIntake(run){
 if(intakeOpening)return;const owner=listeners,projectId=doc()?.id;intakeOpening=true;
 const current=()=>listeners===owner&&!owner?.signal.aborted&&doc()?.id===projectId;
 toast('Opening workbook tools…');
 try{let intake;try{intake=await import('./intake-ui.js')}catch(e){reportLoadFailure('the workbook tools',e);return}if(current())await run(intake,doc());}
 catch(e){if(current())toast(e?.message||'The workbook tools could not open. Try again.');}
 finally{intakeOpening=false;}
}
// The shell draws the page; a change of tab pushes a history entry, anything else rewrites the current one.
function render(){sync();if(bridge)bridge.render(true)}
async function command(type,payload={},message='Project saved.',before=null){if(ui.busy)return false;
  // A change to an existing record is reviewed inside the editor that proposed it, not in a second dialog stacked on it (U2-04).
  let cmd={type,payload};const editor=$('.r-dialog');if(editor?.open&&editor.querySelector('form')){cmd=await reviewChangeInDialog(editor,store.value?.document||project,cmd);if(!cmd)return false;}
  ui.busy=true;$('.r-dialog')?.querySelectorAll('button[type="submit"]').forEach(b=>b.disabled=true);
  try{const r=await store.command(cmd);project=r.document;if(r.selected)ui.selected=r.selected;ui.dirty=false;before?.(r);const opener=closeDialog(true,{restore:false});render();returnFocus(opener,{ids:[r.selected],attributes:['data-r-select','data-r-edit']});toast(typeof message==='function'?message(r):message);return true}
  catch(e){const offline=looksOffline(e),error=$('#r-form-error')||$('#r-page-error');if(error){error.hidden=false;error.innerHTML=esc(e.message)+(e.conflict?` ${btn('refresh-conflict','Load latest project')}`:'')+(offline&&$('#r-form-error')?` ${btn('retry-submit','Try again','ux-retry')}`:'')};if(offline)markConnection('offline',{announce:toast});toast('Your change was not saved. Your input is preserved.');return false}
  finally{ui.busy=false;$('.r-dialog')?.querySelectorAll('button[type="submit"]').forEach(b=>b.disabled=false)}
}
// The editor says what the person asked for: "Add a functional requirement", "Add an assumption" (U2-35).
function addTitle(type){const name=(typeInfo(type)?.name||'record').toLowerCase();return `Add ${/^[aeiou]/.test(name)?'an':'a'} ${name}`}
// The record just saved is on the page that holds it, in view and lit for a moment (U2-14).
function revealSaved(id){if(!id)return;const list=filtered().sort(rowOrder),i=list.findIndex(a=>a.id===id);if(i>=0&&Math.floor(i/50)+1!==ui.page){ui.page=Math.floor(i/50)+1;const host=$('#r-record-list');if(host)host.innerHTML=recordList(filtered());}const row=[...document.querySelectorAll('[data-r-select]')].find(el=>el.dataset.rSelect===id)?.closest('.r-record');if(row)revealRecord(row);}
function work(){
  const isBrief=ui.section==='brief',isReq=ui.section==='requirement',grouped=isReq&&requirementGroups(project).length>0,imported=isReq&&(project.intake?.datasets||[]).length>0;
  const sections=[['brief','Brief'],['context','Context'],['journey','Journey'],['requirement','Requirements']];
  const titles={brief:'Project brief',context:'Project context',journey:'Project journey',requirement:'Requirement register'};
  const actions=isBrief?btn('edit-brief',icon('edit')+'Edit brief','primary')+btn('context','Define context '+icon('arrow'))+btn('workbook','Import workbook')
    :btn('add',icon('plus')+(isReq?'Add requirement':ui.section==='journey'?'Add step':'Add context record'),'primary')+(isReq?btn('workbook','Import workbook')+(imported?'':btn('assurance','Review delivery evidence'))+(grouped?'':btn('new-group','New group')):'');
  const context=isBrief?`<span class="chip ${project.brief.confirmed?'pass':'reference'}">${project.brief.confirmed?'User-confirmed':project.workspace?.template==='blank'?'Your draft':'Reference example'}</span>`:'';
  return workFrameHTML({project:project,chapter:1,section:ui.section,sections,title:titles[ui.section],actions,context,body:isBrief?brief():register()});
}
function brief(){const drafts=journeyActions();return `<div class="r-brief"><div class="r-brief-story"><div class="r-brief-block"><h3>What needs to change?</h3><p>${esc(project.brief.problem)||'Describe the problem you need to solve.'}</p></div><div class="r-brief-block"><h3>What should success look like?</h3><p>${esc(project.brief.goal)||'Describe the intended business outcome.'}</p></div></div><div class="r-source"><b>Source</b><span>${shortHash(project.brief.source)||'No source recorded.'}</span></div><p class="r-note">Review the brief and its source before confirming it for your project.</p>${proposalNote()}${drafts?`<details class="work-support"><summary>Draft records from this brief or model</summary>${drafts}</details>`:''}<details class="work-support"><summary>Brief checklist</summary><ol class="r-brief-steps" aria-label="Brief next steps">${milestonesOf(project).filter(m=>['brief','context','journey'].includes(m.id)).map(m=>`<li><span aria-hidden="true">${m.done?'✓':'○'}</span> ${esc(m.name)} <small>${m.done?'Complete':'To do'}</small></li>`).join('')}</ol></details></div>`}
// The journey draft (round 4, Contract 3): from a written brief, Chapter 1's records, or every chapter in turn, each
// proposed for review in this frame (journey-draft-ui.js) and committed through the chapter guide, unconfirmed.
// Round 12 (DRF-17): the one predicate decides what is offered (readiness-model.js draftOffer): a project of imported or
// grouped requirements is drafted as one architecture draft, and the page says why the brief is not drafted chapter by chapter.
function journeyActions(){const offer=draftOffer(project,1);if(offer.kind==='grouped')return `<div class="r-actions r-journey-actions"><button type="button" class="r-btn" data-journey-draft="1" data-journey-grouped="true">${icon('spark')}${esc(offer.text)}</button></div><p class="r-note" data-draft-reason>${esc(offer.reason)}</p>`;const brief=!!String(project.brief?.problem||'').trim(),model=(project.coauthoring?.sources||[]).some(s=>s?.kind==='model'&&String(s.text||'').trim());if(!brief&&!model)return '';const any=project.artefacts.length>0,word=brief?'brief':'model';return `<div class="r-actions r-journey-actions"><button type="button" class="r-btn" data-journey-draft="1"${brief?'':' data-journey-mode="model"'}>${icon('spark')}${any?'Draft more from the '+word:'Draft from the '+word}</button>${brief&&model?`<button type="button" class="r-btn" data-journey-draft="1" data-journey-mode="model">Draft from the model</button>`:''}<button type="button" class="r-btn" data-journey-draft="1" data-journey-whole="true"${brief?'':' data-journey-mode="model"'}>Draft the whole journey</button></div><p class="r-note">The journey proposes records from the ${brief&&model?'brief or the model':word}, citing the ${brief&&model?'passages or model lines':brief?'passages':'model lines'} each value comes from. You review and accept each chapter; nothing is confirmed for you.</p>`}
// The details of the record in view, then the one lifecycle path (round 12, GR-GOV-23): retire it, restore what left.
function inspector(){const a=selected();return inspectorBody()+lifecycleHTML(project,1,a?.id,'data-r-action');}
function inspectorBody(){const a=selected(),g=guidance(project,a,ui.tab,ui.section);const ps=proposals(project,a,ui.tab);return `<header class="r-inspector-head"><span>${icon('cursor')}Details</span></header><div class="r-inspector-body">${btn('back-surface','Back to workspace','r-mobile-return')}${a?`<p class="r-kicker">${esc(meta(a))}</p><h2 class="r-clip" title="${esc(a.title)}">${esc(a.title)}</h2>${badge(a)}<p>${esc(a.description)||'Add a description to establish the context.'}</p><dl><div><dt>Owner</dt><dd>${esc(a.owner)||'Not recorded'}</dd></div><div><dt>Source</dt><dd>${esc(a.source)||'Not recorded'}</dd></div>${a.type==='requirement'?`<div><dt>Priority</dt><dd>${esc(a.priority)}</dd></div><div><dt>Acceptance</dt><dd>${esc(a.acceptance)||'Missing — add an observable result.'}</dd></div>`:''}${a.type==='scope'?`<div><dt>Boundary</dt><dd>${a.scopeMode==='out'?'Out of scope':'In scope'}</dd></div>`:a.type==='journey'?`<div><dt>Journey order</dt><dd>${a.order}</dd></div>`:''}<div><dt>Origin</dt><dd>${esc(recordProvenance(project,a,1).label)}</dd></div></dl><div class="r-actions"><button class="r-btn" data-r-edit="${esc(a.id)}">${icon('edit')}Edit</button>${connectButton(icon('link')+'Connect')}</div><h3>Relationships <small>${related(project,a.id).length}</small></h3><div class="r-relations">${related(project,a.id).map(r=>{const other=get(r.from===a.id?r.to:r.from);return `<div><button data-r-select="${esc(other?.id||'')}"><small>${esc(r.kind)} ${r.to===a.id?'←':'→'}</small><span>${esc(other?.title||'Missing artefact')}</span><small>${esc(other?.id||'Broken relationship')}</small></button><button data-r-delete-link="${esc(r.id)}" aria-label="Remove relationship ${esc(r.id)}">×</button></div>`}).join('')||'<p>No relationships yet.</p>'}</div>${a.type==='journey'?`<a class="r-text-link" href="${esc(projectURL('/?chapter=4&tab=model&modelConcern=process&object='+encodeURIComponent(a.id)))}">Follow this step through the process and its outcomes ${icon('arrow')}</a>`:''}${a.modelRef?`<a class="r-text-link" href="/?chapter=4&object=${esc(a.modelRef)}">Explore its application responsibility ${icon('arrow')}</a>`:''}`:`<h2 class="r-guidance">${esc(g.heading)}</h2><p>${esc(g.explanation)}</p>${ui.tab==='work'?referenceNote(project):''}`}${a?sourceFactsHTML(project,a):''}${evidenceContextHTML(project,a?.id,ui.tab)}<div class="r-attention"><p class="r-kicker">A useful next thought</p><p>${esc(g.attention)}</p><small>${esc(g.next)}</small>${ps.length?btn('proposal',icon('spark')+'Explore a draft suggestion','gold',`data-proposal-id="${esc(ps[0].id)}"`):''}</div></div>`}
function domainOverview(){const a=sourceAssurance(project.artefacts);if(!a.counts.assessed)return '';return `<div class="intake-assurance-summary"><span><strong>${a.counts.assessed}</strong>source requirements</span><span><strong>${a.counts.deliveryGaps}</strong>delivery gaps</span><span><strong>${a.counts.additionalAssurance}</strong>additional assurance cases</span><span><strong>${a.counts.repeatedGroups}</strong>statement groups to review</span></div><details ${ui.domain?'open':''}><summary>${ui.domain?esc(ui.domain):'Explore by domain'} · ${a.domains.length} domains</summary><div class="intake-domains">${a.domains.map(d=>`<button class="intake-domain" data-r-domain="${esc(d.name)}" aria-pressed="${ui.domain===d.name}"><strong>${esc(d.name)}</strong><span>${d.total} requirements · ${d.deliveryGaps} delivery gaps</span><span>${d.additionalAssurance} additional assurance cases</span><i><b style="width:${100*d.deliveryGaps/d.total}%"></b></i></button>`).join('')}</div></details><div class="r-actions">${ui.domain?btn('clear-domain','All domains'):''}${btn('delivery-gaps',ui.onlyGaps?'Show all delivery states':'Focus delivery gaps','','aria-pressed="'+ui.onlyGaps+'"')}</div>`;}
// The requirements a filter shows are the ones the server would select for a bulk step (requirement-commands.js), so a
// count the page offers is the count the server checks.
// Round 24 (D-24-08): the shell's module scope holds the register to the scope's requirements (and the server checks the
// same selection for a bulk step); the context and journey lists to the records the scope shows.
const requirementFilter=()=>({groupId:ui.group||undefined,domain:ui.domain||undefined,gaps:ui.onlyGaps||undefined,q:ui.query||undefined,cause:ui.cause||undefined,module:shellScopeId()||undefined});
const lens=()=>scopeLens(project,shellScopeId());
function filtered(){if(ui.section==='requirement')return selectRequirements(project,{filter:requirementFilter()});const L=lens(),list=project.artefacts.filter(a=>(ui.section==='context'?!['journey','requirement'].includes(a.type):a.type===ui.section)&&lensHolds(L,a));return list.filter(a=>(!ui.domain||a.domain===ui.domain)&&(!ui.onlyGaps||a.assessment?.delivery&&a.assessment.delivery.toLowerCase()!=='delivered')&&(ui.filter==='all'||a.type===ui.filter)&&(!ui.query||searchText(a).includes(ui.query.toLowerCase())))}
const lacksEvidence=a=>!!a.assessment&&!a.assessment.evidence;
// The filters and the bulk steps appear at size: once an import or a group exists, or past twenty requirements.
const bulkVisible=()=>ui.section==='requirement'&&((project.intake?.datasets||[]).length>0||requirementGroups(project).length>0||project.artefacts.filter(a=>a.type==='requirement').length>20);
function selectionBar(records){return ui.section==='requirement'&&records.length?selectionBarHTML(ui,{shown:records.length,unconfirmed:records.filter(a=>!a.confirmed).length,lacking:records.filter(lacksEvidence).length}):''}
function proposalNote(){const x=pendingProposals(project);if(ui.section==='brief'&&x.brief)return `<div class="r-reference-note r-proposal-note"><span>Your workbook has an overview. ${x.brief.sentences.length} sentences from ${esc(x.brief.sheets.join(', '))} could start the brief, each with its cell.</span>${btn('review-brief','Review the proposed brief','gold')}</div>`;if(ui.section==='context'&&x.stakeholders.length)return `<div class="r-reference-note r-proposal-note"><span>${x.stakeholders.length} user groups from your workbook could become stakeholders.</span>${btn('review-stakeholders','Review the user groups','gold')}</div>`;return ''}
function contextApplicabilityHTML(){return ['constraint','assumption'].filter(type=>!project.artefacts.some(a=>a.type===type)).map(type=>{const decision=project.contextApplicability?.[type],name=typeInfo(type).name.toLowerCase();return `<div class="r-reference-note" role="note"><span><strong>${esc(typeInfo(type).name)}:</strong> ${contextApplicabilityCurrent(project,type)?`Recorded as not applicable · ${esc(decision.reason)} · Owner: ${esc(decision.owner)} · Source: ${esc(decision.source)}`:decision?.reviewed?'An earlier decision needs review because the brief or project context changed.':`No ${esc(name)} is recorded. Add one, or explain why this category does not apply.`}</span><div class="r-actions">${btn('add-context','Add '+esc(name),'',`data-r-type="${esc(type)}"`)}${btn('edit-applicability',decision?'Recheck decision':'Record not applicable','',`data-r-type="${esc(type)}"`)}</div></div>`}).join('')}
function register(){const isContext=ui.section==='context',isReq=ui.section==='requirement';const records=filtered(),grouped=isReq&&requirementGroups(project).length>0,L=lens(),reqCount=L?L.requirements.size:project.artefacts.filter(a=>a.type==='requirement').length,many=bulkVisible();
  return `${isContext?proposalNote()+contextApplicabilityHTML():''}${isReq?`<details class="work-support" ${ui.group||ui.domain||ui.cause?'open':''}><summary>Import, grouping and delivery evidence</summary>${importSummaryHTML(project)}${reqCount||L?'<div class="r-modules-slot" data-r-modules></div>':''}${groupsHTML(project,{group:ui.group,open:!ui.query&&!ui.cause})}${grouped?'':domainOverview()}</details>`:''}<div class="r-register-tools"><label><span>Sort</span><select id="r-record-sort">${[['reference','Reference / journey order'],['name','Name'],['status','Unconfirmed first'],['findings','Most open findings']].map(([id,label])=>`<option value="${id}"${ui.sort===id?' selected':''}>${label}</option>`).join('')}</select></label><label><span class="r-sr-only">Search artefacts</span><input id="r-search" type="search" value="${esc(ui.query)}" placeholder="Find an ID, title, or owner…"></label>${isContext?`<label><span class="r-sr-only">Filter context type</span><select id="r-context-filter"><option value="all">All context</option>${TYPES.filter(t=>!['journey','requirement'].includes(t.id)).map(t=>`<option value="${esc(t.id)}" ${ui.filter===t.id?'selected':''}>${t.plural}</option>`).join('')}</select></label>`:''}</div>${many?filterBarHTML(project,{...ui,causeLabel:ui.cause?findings(project).find(f=>f.code===ui.cause)?.title:'',scopeTitle:L?.title||''},{total:reqCount,shown:records.length}):''}<div id="r-selection">${many?selectionBar(records):''}</div><div id="r-record-list">${recordList(records)}</div><p class="r-note">Stable IDs stay with each record as its wording and relationships evolve.</p>`;
}
const recordFindings=perDocument(p=>new Map(chapterChecks(p,1).passages.map(x=>[x.id,x])));
function findingBadge(a){const x=recordFindings(project).get(a.id),fix=x?.fix.length||0,confirm=x?.confirm.length||0;return '<span class="chip '+(fix?'warn':confirm?'draft':'pass')+'">'+(fix?fix+' to fix':confirm?confirm+' to confirm':'No open finding')+'</span>';}
function rowOrder(a,b){if(ui.sort==='name')return a.title.localeCompare(b.title);if(ui.sort==='status')return Number(a.confirmed)-Number(b.confirmed)||a.id.localeCompare(b.id,undefined,{numeric:true});if(ui.sort==='findings'){const count=x=>{const f=recordFindings(project).get(x.id);return (f?.fix.length||0)+(f?.confirm.length||0)};return count(b)-count(a)||a.id.localeCompare(b.id,undefined,{numeric:true});}return a.type==='journey'&&b.type==='journey'?a.order-b.order:a.id.localeCompare(b.id,undefined,{numeric:true});}
const workNeighbours=perDocument(p=>{const records=new Map(p.artefacts.map(a=>[a.id,a])),links=new Map();for(const r of p.relationships){for(const [from,to] of [[r.from,r.to],[r.to,r.from]])if(records.has(to)){if(!links.has(from))links.set(from,new Map());links.get(from).set(to,records.get(to));}}return links;});
function recordReading(a){
 if(!['journey','requirement'].includes(a.type))return '';
 const linked=[...(workNeighbours(project).get(a.id)?.values()||[])],record=r=>({...r,chapter:1,section:groupOf(r)}),more='/?chapter=1&tab=model&object='+encodeURIComponent(a.id);
 const trace=a.type==='journey'?[{label:'Actors & outcomes',records:linked.filter(r=>['actor','stakeholder','outcome'].includes(r.type)).map(record),empty:'No actor or outcome link recorded',more},{label:'Required behaviour',records:linked.filter(r=>r.type==='requirement').map(record),empty:'No requirement linked to this step',more}]:[{label:'Journey & business context',records:linked.filter(r=>r.type!=='requirement').map(record),empty:'No source context link recorded',more}];
 const acceptance=a.type==='requirement'?`<div class="r-acceptance"><span>Verify with</span><div><p>${esc(a.acceptance?String(a.acceptance).length>280?String(a.acceptance).slice(0,240)+'…':a.acceptance:'Acceptance criteria are not recorded yet.')}</p>${String(a.acceptance||'').length>280?`<details><summary>Read full acceptance criteria</summary><p>${esc(a.acceptance)}</p></details>`:''}</div></div><div class="r-record-source"><span>Source · </span>${String(a.source||'').length>180?`<details><summary>${esc(String(a.source).slice(0,160))}…</summary><p>${esc(a.source)}</p></details>`:esc(a.source||'Not recorded')}</div>`:'';
 return acceptance+workTraceHTML(trace);
}
function recordList(records){
 const pages=Math.max(1,Math.ceil(records.length/50));ui.page=Math.min(ui.page,pages);
 const paging=records.length>50?`<div class="intake-pager"><button class="r-btn" data-r-page="${ui.page-1}" ${ui.page===1?'disabled':''}>Previous</button><span>Page ${ui.page} of ${pages} · ${records.length} records</span><button class="r-btn" data-r-page="${ui.page+1}" ${ui.page===pages?'disabled':''}>Next</button></div>`:'';
 if(!records.length)return `<div class="r-empty"><h3>${ui.query?'No matching records.':ui.section==='requirement'?'No requirements yet.':ui.section==='journey'?'No journey steps yet.':'No context records in this view.'}</h3><p>${ui.query?'Try a different reference, name or owner.':ui.section==='requirement'?'Add a requirement or import your permitted workbook.':ui.section==='journey'?'Add the first journey step and describe who acts and what changes.':'Add an outcome, stakeholder or boundary to frame the design.'}</p></div>`;
 const shown=records.sort(rowOrder).slice((ui.page-1)*50,ui.page*50),row=a=>`<div class="r-record ${a.id===ui.selected?'selected':''}" data-work-record-row="${esc(a.id)}">${a.type==='requirement'&&bulkVisible()?`<input type="checkbox" class="r-pick" data-r-pick="${esc(a.id)}" aria-label="Select ${esc(a.id)}" ${ui.picked.has(a.id)?'checked':''}>`:''}<div class="r-record-copy"><button class="r-record-main" data-r-select="${esc(a.id)}" data-r-insight="${esc(a.id)}"><span class="r-record-meta">${esc(a.externalId?a.externalId+' · '+meta(a):meta(a))}</span><strong>${esc(a.title)}</strong>${a.description&&a.description===a.title?'':`<span class="r-record-description">${esc(a.description||'Description not recorded.')}</span>`}<span class="r-record-owner">${esc(a.owner||'Owner missing')}${a.type==='requirement'?' · '+a.priority+' · '+related(project,a.id).length+' links':''}</span></button>${recordReading(a)}</div><div class="r-record-actions">${badge(a)}${findingBadge(a)}<button class="r-btn" data-r-select="${esc(a.id)}" data-r-details="${esc(a.id)}" aria-label="Details for ${esc(a.id)}">Details</button><button class="r-btn" data-r-edit="${esc(a.id)}" aria-label="Edit ${esc(a.id)}">${icon('edit')}Edit</button></div></div>`;
 if(ui.section==='context'&&ui.sort==='reference')return paging+TYPES.filter(t=>shown.some(a=>a.type===t.id)).map(t=>{const rows=shown.filter(a=>a.type===t.id);return `<section class="r-context-group"><header><h3>${esc(t.plural)}</h3><span>${rows.length} shown</span></header><div class="r-records">${rows.map(row).join('')}</div></section>`}).join('');
 if(ui.section==='journey'&&ui.sort==='reference')return paging+`<ol class="r-journey-sequence" aria-label="Journey steps in recorded order">${shown.map(a=>`<li data-journey-order="${esc(a.order??'—')}">${row(a)}</li>`).join('')}</ol>`;
 return paging+`<div class="r-records">${shown.map(row).join('')}</div>`;
}
// The checks read per cause (round 12, D-09): one line per cause with the records it affects, a filter to them and, where
// one step can treat them all, that step; a cause's own findings open one page of 50 at a time.
function validation(){
 const L=lens(),all=findings(project).filter(f=>!L||!get(f.artefactId)||L.shows.has(f.artefactId)),scoped=all.filter(f=>!ui.domain||get(f.artefactId)?.type!=='requirement'||get(f.artefactId)?.domain===ui.domain);
 return validationSurfaceHTML(project,1,{title:'Make the requirements defensible',purpose:'Review completeness, acceptance, traceability and source assurance.',run:btn('validate','Run checks','primary'),context:ui.domain?'<p class="validation-context">Domain: '+esc(ui.domain)+' '+btn('clear-review-domain','Show all domains')+'</p>':'',findings:scoped.map(f=>({...f,category:['confirmation','brief-review'].includes(f.code)?'review':'gaps',objectId:f.artefactId,reference:f.artefactId,actions:'<button type="button" class="btn" data-r-fix="'+esc(f.id)+'">'+(f.code==='missing-type'?'Add record':'Open remedy')+'</button>'+(f.canMarkNotApplicable?btn('edit-applicability','Record not applicable','',`data-r-type="${esc(f.artefactType)}"`):'')})),causeActions:code=>{const cause=findingCauses(scoped).find(c=>c.code===code);return !cause?'':(cause.ids.some(id=>/^REQ-/.test(id))&&cause.count>1?'<button type="button" class="btn" data-r-cause="'+esc(code)+'">Filter the requirements register</button>':'')+(code==='confirmation'&&cause.ids.some(id=>/^REQ-/.test(id))?btn('confirm-cause','Confirm after review'):'')+(code==='source-evidence'?btn('evidence-cause','Record why no evidence'):'');}});
}
function output(){const current=project.handoff?.contentVersion===project.contentVersion;return outputWorkspaceHTML(project,1,{title:'A brief you can build from',summary:project.artefacts.filter(a=>a.type==='requirement').length+' requirements · '+project.artefacts.filter(a=>a.confirmed).length+' confirmed artefacts · '+project.relationships.length+' relationships',handoff:'<h3>Carry the requirements into quality drivers</h3><p>Chapter 2 reads these same artefacts and stable IDs. Open questions travel with the project.</p><p>'+esc(current?'Current handoff recorded':'Working revision · handoff needs review')+'</p>'+btn('handoff',current?'Open Chapter 2 quality drivers':'Review & carry forward','gold')});}
function updateAssistantContext(){const el=$('.r-assistant-bar>div>span:last-child');if(el)el.textContent=selected()?meta(selected()):esc(project.name)}
// A record chosen on the surface becomes the shell's selection, so the details, Sol and the address follow it.
function select(id){
  if(id==='GHOST'){openGhost();return}const a=get(id);if(!a)return;hideTip();
  const refocus=document.activeElement?.closest?.('.r-record-main')?.dataset.rSelect;
  if(bridge)bridge.selectNode(id);else ui.selected=id;
  updateAssistantContext();
  if(ui.tab==='work'&&$('#r-record-list')){$('#r-record-list').innerHTML=recordList(filtered());if(refocus)[...document.querySelectorAll('[data-r-select]')].find(el=>el.dataset.rSelect===refocus)?.focus({preventScroll:true});}
}
// One editor at a time, in the shell's dialog host; closing it returns focus to what opened it, found again after the
// page is redrawn (dialog.js rememberOpener / returnFocus).
function dialog(title,body,kind){if(presentAssistant(kind,title,body))return;const open=$('.r-dialog'),opener=open?open.opener:rememberOpener(document.activeElement);if(open)closeSharedDialog(open,{restoreFocus:false});ui.modal=kind;ui.dirty=false;hideTip();const el=openDialog({className:'dialog l-dialog r-dialog',labelledBy:'r-dialog-title',opener,html:`<header><div><span class="eyebrow">Chapter 01 / ${esc(ui.tab)}</span><h2 id="r-dialog-title">${title}</h2></div>${dbtn('close-dialog',icon('close'),'icon-only','aria-label="Close dialog"')}</header><div id="r-form-error" class="l-error" role="alert" hidden></div>${body}<div id="r-discard" class="l-discard" hidden><p>Discard your unsaved changes?</p>${dbtn('keep-editing','Keep editing')}${dbtn('discard','Discard changes')}</div>`,onCancel:()=>closeDialog(),closeSelector:null});refineAssistantDialog(el,kind);}
function closeDialog(force=false,{restore=true}={}){if(ui.busy&&!force)return null;if(ui.dirty&&!force){$('#r-discard').hidden=false;$('#r-discard button').focus();return null}const el=$('.r-dialog'),opener=el?.opener||null;ui.modal=null;ui.dirty=false;dialogDraft=null;if(el)closeSharedDialog(el,{restoreFocus:restore});return opener;}
function editBrief(){sync();dialog('Review the project brief',`<form id="r-brief-form">${fBrief('problem',project.brief.problem)}${fBrief('goal',project.brief.goal)}${fBrief('source',project.brief.source)}${fBrief('confirmed',project.brief.confirmed)}<p class="r-note">Editing a confirmed field resets confirmation until you review the change.</p><div class="l-dialog-actions">${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Save brief</button></div></form>`,'brief')}
function applicabilityDialog(type){sync();if(!['constraint','assumption'].includes(type)||project.artefacts.some(a=>a.type===type))return;const d=project.contextApplicability?.[type],name=typeInfo(type).name.toLowerCase();dialog('Review '+name+' applicability',`<form id="r-applicability-form"><input type="hidden" name="type" value="${esc(type)}"><p class="r-dialog-intro">A project can have no ${esc(name)}. Record this decision with its source and owner so reviewers can revisit it. Adding a ${esc(name)} later replaces this decision.</p><label class="l-field"><span>Why it does not apply</span><textarea name="reason" minlength="20" maxlength="2000" required>${esc(d?.reason||'')}</textarea></label><div class="l-form-grid"><label class="l-field"><span>Accountable owner</span><input name="owner" maxlength="160" value="${esc(d?.owner||'')}" required></label><label class="l-field"><span>Decision source</span><input name="source" maxlength="600" value="${esc(d?.source||'')}" required></label></div><label class="l-check"><input type="checkbox" name="reviewed" required> I reviewed the project context and this category does not apply.</label><div class="l-dialog-actions">${d?dbtn('use-applicable','Use this category instead','',`data-r-type="${esc(type)}"`):''}${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Record decision</button></div></form>`,'applicability')}
// What each type keeps beyond the common fields (round 12): a persona and a user category, an outcome's measure, a rule's
// value and links, a requirement's attributes, and the requirement groups a record stands for. Every block is in the form;
// the ones of other types are hidden and are not read for this type.
function typeFields(a){const only=(types,html)=>`<div data-r-types="${types}" ${types.split(' ').includes(a.type)?'':'hidden'}>${html}</div>`,of=t=>project.artefacts.filter(x=>x.type===t),pick=(list,ref=x=>x.ref||x.id)=>[['','None'],...list.map(x=>[x.id,ref(x)+' · '+x.title])];
 return only('stakeholder actor',`<div class="l-form-grid">${fArtefact('category',a.category||'',{options:[['','Not stated'],...USER_CATEGORIES]})}${fArtefact('role',a.role||'')}</div>${PERSONA_FIELDS.slice(1).map(([k])=>fArtefact(k,a[k]||'')).join('')}`)
  +only('outcome',OUTCOME_FIELDS.map(([k])=>fArtefact(k,a[k]||'')).join(''))
  +only('rule',`<div class="l-form-grid">${RULE_FIELDS.map(([k])=>fArtefact(k,a[k]||'')).join('')}</div>${fArtefact('refinesId',a.refinesId||'',{options:pick(of('constraint'),x=>x.id)})}${fArtefact('dataId',a.dataId||'',{options:pick(project.interfaces?.data||[])})}${fArtefact('controlId',a.controlId||'',{options:pick(project.security?.controls||[])})}${fArtefact('requirementIds',a.requirementIds||[],{options:of('requirement').map(r=>({id:r.id,strong:r.id,title:r.title})),empty:'No requirement yet.'})}`)
  +only('requirement',`<div class="l-form-grid">${REQUIREMENT_ATTRIBUTES.map(([k])=>fArtefact(k,(k==='priorityBand'?a.assessment?.priorityBand:a[k])||'')).join('')}</div>`)
  +only('stakeholder actor outcome constraint scope',fArtefact('requirementGroupIds',a.requirementGroupIds||[],{options:requirementGroups(project).map(g=>({id:g.id,strong:g.id,title:g.title})),empty:'No requirement group yet.'}));}
function editArtefact(id=null,proposal=null,initialType=null,presetLinks=null){sync();const old=id?get(id):null;const a=proposal?.record||old||{type:initialType||(ui.section==='journey'?'journey':ui.section==='context'?(ui.filter==='all'?'outcome':ui.filter):'requirement'),title:'',description:'',owner:'',source:'',priority:'',acceptance:'',confirmed:false,order:project.artefacts.filter(a=>a.type==='journey').length+1};dialogDraft={id:old?.id,origin:proposal?'suggestion':old?.origin||'user',links:proposal?.links||presetLinks||[]};const draft=dialogDraft;
  dialog(proposal?'Review & edit the draft suggestion':old?`Edit ${old.id}`:addTitle(a.type),`<form id="r-artefact-form"><div class="l-form-grid">${fArtefact('type',a.type,{options:TYPES.map(t=>[t.id,t.name]),extra:'id="r-record-type"'+(old?' disabled':'')})}<div id="r-priority-fields" class="l-form-grid"${a.type!=='requirement'?' hidden':''}>${fArtefact('priority',a.priority||'',{options:[['','Not stated'],...PRIORITIES.map(p=>[p,p])]})}${fArtefact('priorityBasis',a.priorityBasis||'',{options:[['','Not recorded'],...PRIORITY_BASIS.map(b=>[b,b.charAt(0).toUpperCase()+b.slice(1)])]})}</div></div>${fArtefact('title',a.title)}${fArtefact('description',a.description)}${typeFields(a)}<div class="l-form-grid">${fArtefact('owner',a.owner)}${fArtefact('source',a.source)}</div><div id="r-acceptance-fields" ${a.type!=='requirement'?'hidden':''}>${fArtefact('acceptance',a.acceptance)}</div><div id="r-scope-fields" ${a.type!=='scope'?'hidden':''}>${fArtefact('scopeMode',a.scopeMode==='out'?'out':'in')}</div><div id="r-journey-fields" ${a.type!=='journey'?'hidden':''}><div class="l-form-grid">${fArtefact('order',a.order||1)}${fArtefact('journeyId',a.journeyId||'')}</div></div>${fArtefact('confirmed',a.confirmed)}<p class="r-note">${old?'The stable ID '+old.id+' will stay unchanged.':`A stable ID is assigned when you save.`} ${proposal?'This suggestion is editable and remains a draft until confirmed.':''}${!proposal&&!old&&presetLinks?.length?' Once saved it is connected: '+presetLinks.map(([f,k,t])=>esc((f==='new'?'this record':f)+' '+k+' '+(t==='new'?'this record':t))).join('; ')+'.':''}</p><div class="l-dialog-actions">${old?dbtn('lifecycle-retire','Retire artefact','danger',`data-lifecycle-id="${esc(old.id)}"`):''}${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">${proposal?'Apply edited proposal':'Save artefact'}</button></div></form>`,'artefact');dialogDraft=draft;
}
function linkDialog(finding=null,preset=null){sync();if(project.artefacts.length<2){toast('Add at least two records before connecting them.');return;}const a=selected();const options=project.artefacts.map(n=>[n.id,n.id+' · '+n.title]);dialog('Connect two artefacts',`<form id="r-link-form">${recordField('relationship','from',preset?.from||(finding?.code==='journey-link'?project.artefacts.find(n=>n.type==='journey')?.id:a?.id),{options})}${recordField('relationship','kind',preset?.kind||(finding?.code==='journey-link'?'requires':'delivers'),{options:LINK_TYPES.map(k=>[k,k])})}${recordField('relationship','to',preset?.to||(finding?.code==='journey-link'?a?.id:project.artefacts.find(n=>n.type==='outcome'&&n.id!==a?.id)?.id),{options})}<p class="r-note">Read the relationship from left to right: source → relationship → target.</p><div class="l-dialog-actions">${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Save relationship</button></div></form>`,'relationship')}
function previewProposal(id){const proposal=proposals(project,selected(),ui.tab).find(p=>p.id===id);if(!proposal){toast('This suggestion is no longer needed. Reopen Co-design for the current context.');return}closeDialog(true);ui.ghost=proposal;if(proposal.target)ui.selected=proposal.target;navigateTab('model');toast('Draft suggestion only. Review and edit before applying.');}
function openGhost(){if(ui.ghost)editArtefact(ui.ghost.target||null,ui.ghost)}
function explainMenu(kind){
  const a=selected(),g=guidance(project,a,ui.tab,ui.section),ps=proposals(project,a,ui.tab);
  const context=ui.tab==='work'?(a?esc(a.id+' · '+a.title):ui.section==='brief'?'Project brief':'Project context'):a?esc(a.id+' · '+a.title):esc(project.name);
  const actionSets={work:`${a?`<button class="r-btn" data-r-edit="${esc(a.id)}">${icon('edit')}Edit this artefact</button>${connectButton(icon('link')+'Connect an artefact')}`:btn('edit-brief',icon('edit')+'Review the brief')}${btn('add',icon('plus')+'Add an artefact')}${btn('show-model',icon('model')+'Explore the model')}`,model:`${connectButton(icon('link')+'Connect an artefact')}${a?`<button class="r-btn" data-r-edit="${esc(a.id)}">Edit ${esc(a.id)}</button>`:''}${btn('go-validate',icon('shield')+'Review findings')}`,validate:`${btn('run-checks-menu',icon('shield')+'Run checks','primary')}${a?`<button class="r-btn" data-r-edit="${esc(a.id)}">Edit ${esc(a.id)}</button>`:''}${btn('show-model',icon('model')+'Inspect relationships')}`,output:`${btn('export-json',icon('download')+'Export project JSON')}${btn('export-md',icon('file')+'Export requirements brief')}${btn('handoff','Review handoff','gold')}`};
  if(kind==='sol')dialog('Chapter tools · Act on this context',`${evidenceAssistantLink('sol')}<p class="r-dialog-intro">${context} · ${esc(ui.tab)}</p><div class="r-reference-note">${esc(g.next)}</div><p>${esc(g.attention)}</p><div class="r-menu-actions">${actionSets[ui.tab]}</div>${ps[0]?`<h3>A template proposal · rule-based, from the reference project</h3><p>${esc(ps[0].reason)}</p><button class="r-btn gold" data-r-proposal="${esc(ps[0].id)}">Preview an editable draft suggestion</button>`:''}`,'sol');
  else{const question={work:'What needs to be explicit before you confirm this record?',model:'Which assumption or missing relationship could change this journey?',validate:'What evidence would close an open question?',output:'What would the next chapter need to understand this requirement?'}[ui.tab];dialog('Co-design · Explore a better question',`${evidenceAssistantLink('mind')}<p class="r-dialog-intro">Chapter 1 / ${esc(ui.tab)} · ${context}</p><div class="r-reference-note">${question}</div>${ps.map(p=>`<article class="r-pattern"><h3>${esc(p.label)}</h3><p>${esc(p.reason)}</p><button class="r-btn gold" data-r-proposal="${esc(p.id)}">${icon('spark')}Preview on the map</button></article>`).join('')||'<p>No additional proposals match this context. Select an artefact to explore its assumptions.</p>'}<p class="r-note">These editable proposals use project rules. Live-generation status is shown in Sol.</p>`,'mind')}
}
// The register's list and its selection bar, redrawn in place (the search keeps its focus).
function refreshList(){const records=filtered(),list=$('#r-record-list'),bar=$('#r-selection');if(list)list.innerHTML=recordList(records);if(bar)bar.innerHTML=selectionBar(records);const count=$('.r-filter-count'),L=lens();if(count)count.textContent=records.length.toLocaleString('en-GB')+' of '+(L?L.requirements.size:project.artefacts.filter(a=>a.type==='requirement').length).toLocaleString('en-GB')+' requirements'+(L?' in '+L.title:'');}
function describeFilter(){const g=ui.group?groupById(project,ui.group):null,parts=[g?g.title:'',ui.domain,ui.onlyGaps?'delivery gaps':'',ui.cause?findings(project).find(f=>f.code===ui.cause)?.title:'',ui.query?'matching “'+ui.query+'”':''].filter(Boolean);return parts.length?'Requirements shown ('+parts.join(', ')+')':'Every requirement'}
function groupEditor(g,picked=[],kind=''){sync();dialogDraft={groupId:g?.id||null};ui.bulkGroupFrom=picked.length>0;dialog(g?'Edit '+esc(g.id):picked.length?'Group the '+picked.length+' selected':kind==='module'?'New module':'New requirement group',groupFormHTML(project,g,{picked,kind}),'group')}
// A step over many requirements is offered with the count the server will check: the selection or filter as it stands.
function bulkConfirm(target,label){sync();const all=selectRequirements(project,target),count=all.filter(a=>!a.confirmed).length;if(!count){toast('Every requirement in this selection is confirmed already.');return}ui.bulk={target,count};dialog('Confirm '+count.toLocaleString('en-GB')+' requirements',confirmFormHTML({label,count,total:all.length}),'bulk-confirm')}
function evidenceReason(target,label,reason=''){sync();const count=selectRequirements(project,target).filter(lacksEvidence).length;if(!count){toast('No requirement in this selection lacks an evidence reference.');return}ui.bulk={target,count};dialog('Record why no evidence exists',evidenceFormHTML({label,count,reason}),'evidence')}
function stakeholderProposals(){sync();const x=pendingProposals(project);if(!x.stakeholders.length){toast('No user group is waiting for review.');return}dialog('Add stakeholders from the workbook',stakeholdersFormHTML(x),'stakeholders')}
const briefParts=(brief,form)=>{const fd=form?new FormData(form):null,chosen=fd?new Set(fd.getAll('sentences')):null;return brief.sentences.map((x,i)=>({...x,part:fd?.get('part:'+i)||x.part,use:!chosen||chosen.has(String(i))})).filter(x=>x.use)};
function briefSource(sentences,filename){const cells=new Map();for(const x of sentences){if(!cells.has(x.sheet))cells.set(x.sheet,[]);cells.get(x.sheet).push(x.cell)}return (filename+': '+[...cells].map(([sheet,cs])=>sheet+'!'+cs.join(', ')).join('; ')).slice(0,600)}
function composed(brief,dataset,form){const xs=briefParts(brief,form);return {problem:xs.filter(x=>x.part==='problem').map(x=>x.text).join(' '),goal:xs.filter(x=>x.part==='goal').map(x=>x.text).join(' '),source:briefSource(xs,dataset.filename)}}
function briefProposal(){sync();const x=pendingProposals(project);if(!x.brief){toast('No brief is waiting for review.');return}dialog('Start the brief from the workbook',briefFormHTML(project,x.brief,x.briefDataset,composed(x.brief,x.briefDataset,null)),'brief-proposal')}
function composeBrief(form){const x=pendingProposals(project);if(!x.brief||!form)return;const c=composed(x.brief,x.briefDataset,form);for(const k of ['problem','goal','source'])if(form.elements[k])form.elements[k].value=c[k];}
function handoff(){if(ui.modal)closeDialog(true);if(project.handoff?.contentVersion===project.contentVersion){goChapter(2);return}const fs=findings(project),reqs=project.artefacts.filter(a=>a.type==='requirement');dialog('Carry the requirements forward',`<form id="r-handoff-form"><p class="l-note">Acknowledging records the handoff with the open findings; it does not resolve them or approve the design.</p><p>${reqs.length} requirements will be available in Chapter 2 with their existing IDs, owners, sources, acceptance criteria, and relationships.</p><div class="r-reference-note">${reqs.filter(a=>a.confirmed).length} of ${reqs.length} requirements are confirmed. ${fs.length} findings remain open. They will be included in the handoff.</div>${project.review?.contentVersion!==project.contentVersion?`<p>Run validation on the current revision before continuing.</p><button type="button" class="btn primary" disabled title="Resolve the prerequisite above first">Carry forward</button>${dbtn('go-validate','Go to validation','primary')}`:`${fs.length?checkHTML('acknowledge','I acknowledge the open findings and will carry them forward for review.',{required:true}):''}<div class="l-dialog-actions">${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Continue to Chapter 2 ${icon('arrow')}</button></div>`}</form>`,'handoff')}
// Carrying the requirements forward opens Chapter 2 in place, on its Work tab.
// The shell always binds its bridge (entry.js, app.js), so the next chapter opens in place; there is no page without it.
function goChapter(n){if(!bridge)return;bridge.state.tab='work';bridge.setChapter(n,{keepTab:true})}
// The chapter's files are offered by the Output tab's documents list (output-documents.js); the Sol menu's export goes
// through the same mechanic (round 26, D-26-13).
async function download(markdown=false){try{const file=await downloadOutput('/api/export?chapter=1&format='+(markdown?'md':'json'),{chapter:1});toast('Downloaded '+file.filename+'.')}catch(e){toast(e.message)}}
function hideTip(){clearTimeout(tipTimer);const tip=$('#cursor-tip');if(tip)tip.hidden=true;}
function showTip(el,event){if(!ui.cursor||window.innerWidth<700||event?.pointerType==='touch'||ui.modal)return;const a=get(el.dataset.rInsight);if(!a)return;clearTimeout(tipTimer);tipTimer=setTimeout(()=>{const g=guidance(project,a,ui.tab,ui.section),tip=$('#cursor-tip');if(!tip)return;tip.className='r-cursor-tip';tip.innerHTML=`<small>CHAPTER 01 / ${esc(ui.tab.toUpperCase())} · ${esc(a.id)}</small><h3>${esc(a.title)}</h3><p>${esc(g.explanation)}</p><p><b>${esc(a.owner||'Owner missing')}</b> · ${related(project,a.id).length} relationships · ${status(a)}</p><p class="r-tip-attention">${esc(g.attention)}</p><small>${esc(g.next)} Select to pin details and explore an editable draft suggestion.</small>`;tip.innerHTML+=`<small>${esc(evidenceCursorText(project,a.id))}</small>`;tip.hidden=false;Promise.resolve().then(()=>{const extra=hoverTipHTML(project,a.id,1);if(extra&&!tip.hidden&&!tip.querySelector('.tip-brain'))tip.insertAdjacentHTML('beforeend',extra)}).catch(e=>console.warn('Sol’s reading for this tip could not load.',e?.message));const box=el.getBoundingClientRect(),x=event?.clientX??box.x+box.width/2,y=event?.clientY??box.y+box.height/2;tip.style.left=Math.max(8,Math.min(innerWidth-328,x+14))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,y+14))+'px'},250)}
function next(id=null){const m=milestones(project).find(m=>m.id===id)||milestones(project).find(m=>!m.done);if(!m){goChapter(2);return}ui.tab=m.tab;if(m.filter){ui.section=m.filter;ui.filter='all';ui.query='';ui.selected=project.artefacts.find(a=>!a.confirmed&&(m.filter==='context'?!['journey','requirement'].includes(a.type):a.type===m.filter))?.id||null}render();landOn(m);}
// "Next" and the milestones always land on something (U2-25, U2-30): the brief opens its editor at the first
// field; any other milestone brings its work into view with the keyboard on its heading.
function landOn(m){if(m?.id==='brief')return editBrief();$('#workspace').scrollIntoView({block:'start'});const h=$('#workspace .stage h2')||$('#workspace h1');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}}
function navigateTab(tab){if(tab==='model'&&!selected())ui.selected=project.artefacts.find(a=>a.type==='requirement')?.id||project.artefacts[0]?.id||null;if(bridge)bridge.setTab(tab);else ui.tab=tab;$('.tabs [aria-selected="true"]')?.focus({preventScroll:true})}
async function onClick(e){sync();
  const b=e.target.closest('button,[data-r-select]');if(!b||b.disabled||ui.busy)return;
  if(b.dataset.rPage){ui.page=Number(b.dataset.rPage);$('#r-record-list').innerHTML=recordList(filtered());return;}
  if(b.dataset.rReviewPage){ui.reviewPage=Number(b.dataset.rReviewPage);render();return;}
  if(b.dataset.rDomain!==undefined){ui.domain=b.dataset.rDomain;ui.page=1;render();return;}
  if(b.dataset.rGroup!==undefined){ui.group=ui.group===b.dataset.rGroup?'':b.dataset.rGroup;ui.section='requirement';ui.page=1;ui.picked.clear();if(ui.tab!=='work')navigateTab('work');else render();return;}
  if(b.dataset.rCause){ui.cause=b.dataset.rCause;ui.section='requirement';ui.page=1;ui.picked.clear();closeDialog(true);if(ui.tab!=='work')navigateTab('work');else render();return;}
  if(b.dataset.rEditGroup){const g=groupById(project,b.dataset.rEditGroup);if(g)groupEditor(g);return;}
  if(b.dataset.rCauseFindings){ui.reviewCause=b.dataset.rCauseFindings;ui.reviewPage=1;render();return;}
  if(b.dataset.rSection){ui.section=b.dataset.rSection;ui.filter='all';ui.page=1;ui.query='';ui.selected=null;render();return}
  if(b.dataset.rSelect)return select(b.dataset.rSelect);
  if(b.dataset.rEdit)return editArtefact(b.dataset.rEdit);
  if(b.dataset.rProposal)return previewProposal(b.dataset.rProposal);
  if(b.dataset.rReviewFilter){ui.reviewFilter=b.dataset.rReviewFilter;ui.reviewPage=1;render();return}
  if(b.dataset.rFix){
    const f=findings(project).find(f=>f.id===b.dataset.rFix);if(!f)return;
    if(f.code==='missing-type')return editArtefact(null,null,f.artefactType);
    if(f.code==='broken-link'){const r=project.relationships.find(r=>r.id===f.relationshipId);return dialog('Repair a broken relationship',`<p>${esc(f.detail)}</p><p>Remove the obsolete link, then connect the correct artefacts from the Model tab.</p><div class="l-dialog-actions">${dbtn('close-dialog','Keep for review')}${dbtn('confirm-delete-link','Remove broken link','danger',`data-link-id="${esc(r.id)}"`)}</div>`,'delete-link')}
    if(f.artefactId==='brief')return editBrief();
    if(get(f.artefactId)){ui.selected=f.artefactId;if(['journey-link','outcome-link'].includes(f.code))return linkDialog(f);
      // Pasted markup opens the editor with the clean text proposed; missing evidence asks for the evidence or a reason.
      if(f.code==='source-markup'){const a=get(f.artefactId);return editArtefact(a.id,{record:{...a,description:f.cleaned||a.description,title:f.cleaned?f.cleaned.slice(0,160):a.title,confirmed:false}})}
      if(f.code==='source-evidence')return evidenceReason({ids:[f.artefactId]},f.artefactId,get(f.artefactId).evidenceTreatment?.reason||'');
      return editArtefact(f.artefactId)}
  }
  if(b.dataset.rDeleteLink){const r=project.relationships.find(r=>r.id===b.dataset.rDeleteLink);dialog('Remove this relationship?',`<p>${esc(r.from+' '+r.kind+' '+r.to)}</p><p>The artefacts will remain. You can reconnect them later.</p><div class="l-dialog-actions">${dbtn('close-dialog','Keep relationship')}${dbtn('confirm-delete-link','Remove relationship','danger',`data-link-id="${esc(r.id)}"`)}</div>`,'delete-link');return}
  switch(b.dataset.rAction){
    case'lifecycle-retire':{const id=b.dataset.lifecycleId;ui.retiring=[id];dialog('Retire '+id,`<p>${esc(RETIRE_TEXT)}</p><form id="record-retire-form">${recordField('record.retire','reason','')}<div class="l-dialog-actions">${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Retire</button></div></form>`,'retire');break;}
    case'lifecycle-restore':await command('record.restore',{ids:[b.dataset.lifecycleId],chapter:1},'Restored as it was.');break;
    case'workbook':await withIntake(m=>m.openIntake({store,onSaved:()=>{project=store.value.document;ui.section='requirement';ui.tab='work';render();toast('Workbook import saved. Review the source assertions and open findings.');}}));break;
    case'source-row':{const id=ui.selected;await withIntake((m,p)=>m.openSourceRow(p,id));break;}
    case'clear-domain':ui.domain='';ui.page=1;render();break;
    case'clear-review-domain':ui.domain='';ui.reviewPage=1;render();break;
    case'add-context':editArtefact(null,null,b.dataset.rType);break;
    case'edit-applicability':applicabilityDialog(b.dataset.rType);break;
    case'use-applicable':if(await command('applicability',{type:b.dataset.rType,applicable:true},'Context category restored.'))editArtefact(null,null,b.dataset.rType);break;
    case'clear-cause':ui.cause='';ui.page=1;render();break;
    case'back-causes':ui.reviewCause='';ui.reviewPage=1;render();break;
    case'new-group':groupEditor(null);break;
    case'new-module':groupEditor(null,[],'module');break;
    case'edit-group':groupEditor(groupById(project,ui.group));break;
    case'group-picked':groupEditor(null,[...ui.picked]);break;
    case'delete-group':{const g=groupById(project,b.dataset.groupId);if(!g)break;dialog('Remove '+esc(g.id)+'?',`<p>${esc(g.title)}</p><p>The requirements stay. Only the group goes.</p><div class="l-dialog-actions">${dbtn('close-dialog','Keep group')}${dbtn('confirm-delete-group','Remove group','danger',`data-group-id="${esc(g.id)}"`)}</div>`,'delete');break}
    case'confirm-delete-group':if(await command('requirements.group-delete',{id:b.dataset.groupId},'Group removed. Its requirements stay.')){if(ui.group===b.dataset.groupId)ui.group='';render()}break;
    case'pick-page':{const page=filtered().sort((a,c)=>a.id.localeCompare(c.id,undefined,{numeric:true})).slice((ui.page-1)*50,ui.page*50);for(const a of page)ui.picked.add(a.id);refreshList();break}
    case'clear-picks':ui.picked.clear();refreshList();break;
    case'confirm-picked':bulkConfirm({ids:[...ui.picked]},`The ${ui.picked.size} selected`);break;
    case'confirm-shown':bulkConfirm({filter:requirementFilter()},describeFilter());break;
    case'confirm-cause':bulkConfirm({filter:{cause:'confirmation'}},'Requirements not confirmed yet');break;
    case'evidence-reason':ui.picked.size?evidenceReason({ids:[...ui.picked]},`The ${ui.picked.size} selected`):evidenceReason({filter:requirementFilter()},describeFilter());break;
    case'evidence-one':{const a=selected();if(a)evidenceReason({ids:[a.id]},a.id,a.evidenceTreatment?.reason||'');break}
    case'evidence-cause':evidenceReason({filter:{cause:'source-evidence'}},'Requirements without evidence or a reason');break;
    case'review-stakeholders':stakeholderProposals();break;
    case'review-import-records':await withIntake((m,p)=>m.openImportProposals({store,pending:pendingProposals(p).records,onSaved:(r,n)=>{project=store.value.document;render();toast(n.outcomes+n.constraints?`${n.outcomes+n.constraints} accepted into Chapter 1. Describe and confirm each one.`:'The proposals you left unticked were dismissed.');}}));break;
    case'review-brief':briefProposal();break;
    case'dismiss-brief':{const x=pendingProposals(project);if(x.brief)await command('requirements.proposals',{datasetId:x.briefDataset.id,brief:{dismiss:true},reviewed:true},'The proposed brief was dismissed.');break}
    case'assurance':ui.tab='validate';ui.reviewFilter='source';ui.reviewPage=1;render();break;
    case'delivery-gaps':ui.onlyGaps=!ui.onlyGaps;ui.page=1;render();break;
    case'next':next();break;case'retry-submit':$('.r-dialog form')?.requestSubmit();break;
    case'edit-brief':editBrief();break;
    case'context':ui.section='context';ui.selected=null;ui.filter='all';ui.query='';render();break;
    case'add':editArtefact();break;
    case'link':linkDialog();break;
    case'sol':explainMenu('sol');break;
    case'mind':explainMenu('mind');break;
    case'proposal':previewProposal(b.dataset.proposalId);break;
    case'edit-ghost':openGhost();break;
    case'dismiss-ghost':ui.ghost=null;render();toast('Draft suggestion dismissed. The project is unchanged.');break;
    case'run-checks-menu':closeDialog(true);ui.tab='validate';await command('review',{},'Checks recorded for what is saved now.');break;
    case'validate':await command('review',{},'Checks recorded for what is saved now.');break;
    case'go-validate':closeDialog(true);navigateTab('validate');break;
    case'show-model':closeDialog(true);navigateTab('model');break;
    case'handoff':handoff();break;
    case'export-json':download();break;
    case'export-md':download(true);break;
    case'back-surface':$('#workspace .stage')?.scrollIntoView({block:'start'});$('#workspace .stage h2')?.focus?.({preventScroll:true});break;
    case'dismiss-reference-note':dismissNote();render();break;
    case'close-dialog':closeDialog();break;
    case'keep-editing':$('#r-discard').hidden=true;$('.r-dialog input, .r-dialog textarea')?.focus();break;
    case'discard':closeDialog(true);break;
    case'confirm-delete-link':await command('deleteRelationship',{id:b.dataset.linkId},'Relationship removed.');break;
    case'refresh-conflict':try{project=(await store.load()).document;$('#r-form-error').innerHTML='Latest project loaded. Your form values are preserved; review and save again.'}catch(err){toast(err.message)}break;
  }
}
async function onSubmit(e){sync();if(!e.target.closest('.r-dialog'))return;e.preventDefault();const form=e.target;if(!validateForm(form))return;const data=Object.fromEntries(new FormData(form));if(form.id==='record-retire-form'){if(await command('record.retire',{ids:ui.retiring||[],reason:data.reason,chapter:1},'Retired with your reason. You can restore it.'))ui.selected=null;render();return;}data.confirmed=form.elements.confirmed?.checked===true;
  if(form.id==='r-brief-form')await command('brief',data,'Project brief saved.');
  if(form.id==='r-artefact-form'){const d=dialogDraft||{},fd=new FormData(form);for(const k of ['requirementGroupIds','requirementIds'])data[k]=fd.getAll(k);data.type=form.elements.type.value;if(d.id)data.id=d.id;data.origin=d.origin;data.links=d.links;ui.section=['journey','requirement'].includes(data.type)?data.type:'context';ui.filter='all';const ok=await command('artefact',data,r=>`${typeInfo(data.type)?.name||'Record'} ${r.selected||data.id||''} saved`.replace(/\s+saved$/,' saved'),()=>{ui.ghost=null});if(ok)revealSaved(ui.selected)}
  if(form.id==='r-applicability-form')await command('applicability',{type:data.type,reason:data.reason,owner:data.owner,source:data.source,reviewed:form.elements.reviewed.checked},'Applicability decision recorded for this context category.');
  if(form.id==='r-link-form')await command('relationship',data,'Relationship saved to the shared model.');
  if(form.id==='r-group-form'){const rule=[0,1,2,3].map(i=>({field:data['rule-field-'+i],op:data['rule-op-'+i]||'is',value:data['rule-value-'+i]})).filter(c=>c.field||String(c.value||'').trim());const ok=await command('requirements.group',{id:dialogDraft?.groupId,title:data.title,kind:data.kind,...(data.kind==='sub-module'?{parentId:data.parentId}:{}),...(data.kind==='module'?{role:data.role}:{}),description:data.description,owner:data.owner,memberIds:data.memberIds,rule},r=>`Group ${r.selected||''} saved.`.replace(' .','.'));if(ok&&ui.bulkGroupFrom){ui.picked.clear();ui.bulkGroupFrom=false;}}
  if(form.id==='r-confirm-form'&&ui.bulk){const {target,count}=ui.bulk;if(await command('requirements.confirm',{...target,count,reviewed:true},`${count.toLocaleString('en-GB')} requirements confirmed. The journal records the step once.`)){ui.picked.clear();ui.bulk=null;render()}}
  if(form.id==='r-evidence-form'&&ui.bulk){const {target,count}=ui.bulk;if(await command('requirements.evidence',{...target,count,reason:data.reason,reviewed:true},`The reason is recorded for ${count.toLocaleString('en-GB')} requirements.`)){ui.picked.clear();ui.bulk=null;render()}}
  if(form.id==='r-stakeholders-form'){const x=pendingProposals(project),accept=new FormData(form).getAll('accept'),dismiss=form.elements.dismissRest?.checked?x.stakeholders.map(s=>s.name).filter(n=>!accept.includes(n)):[];await command('requirements.proposals',{datasetId:x.datasetId,stakeholders:{accept,dismiss},reviewed:true},`${accept.length} stakeholders added from the workbook. Describe and confirm each.`)}
  if(form.id==='r-brief-proposal-form'){const x=pendingProposals(project);await command('requirements.proposals',{datasetId:x.briefDataset.id,brief:{accept:{problem:data.problem,goal:data.goal,source:data.source}},reviewed:true},'The brief is drafted from the workbook. Review it, then confirm it.')}
  if(form.id==='r-handoff-form'){const ok=await command('handoff',{acknowledge:form.elements.acknowledge?.checked===true},'Requirements carried into Chapter 2.');if(ok)goChapter(2);}
}
function onInput(e){if(e.target.id==='r-search'){ui.query=e.target.value;ui.page=1;ui.picked.clear();refreshList();return}if(e.target.closest('.r-dialog form')){ui.dirty=true;if(e.target.name!=='confirmed'&&e.target.form?.elements.confirmed)e.target.form.elements.confirmed.checked=false}}
function onChange(e){if(e.target.id==='r-record-sort'){ui.sort=e.target.value;ui.page=1;refreshList();return;}if(e.target.dataset?.rPick){const id=e.target.dataset.rPick;if(e.target.checked)ui.picked.add(id);else ui.picked.delete(id);const host=$('#r-selection');if(host)host.innerHTML=selectionBar(filtered());return}
  if(e.target.id==='r-group-filter'){ui.group=e.target.value;ui.page=1;ui.picked.clear();render();$('#r-group-filter')?.focus();return}
  if(e.target.closest?.('#r-group-form')&&e.target.name==='kind'){for(const el of document.querySelectorAll('#r-group-form [data-r-kinds]'))el.hidden=el.dataset.rKinds!==e.target.value;return}
  if(e.target.id==='r-gaps-filter'){ui.onlyGaps=e.target.checked;ui.page=1;ui.picked.clear();render();$('#r-gaps-filter')?.focus();return}
  if(e.target.closest?.('#r-brief-proposal-form')&&(e.target.name==='sentences'||e.target.name?.startsWith('part:'))){composeBrief(e.target.form);return}
  if(e.target.id==='r-context-filter'){ui.filter=e.target.value;$('#r-record-list').innerHTML=recordList(filtered())}if(e.target.id==='r-record-type'){const t=e.target.value;const title=$('#r-dialog-title');if(title&&!dialogDraft?.id&&dialogDraft?.origin!=='suggestion')title.textContent=addTitle(t);$('#r-priority-fields').hidden=t!=='requirement';$('#r-acceptance-fields').hidden=t!=='requirement';$('#r-scope-fields').hidden=t!=='scope';$('#r-journey-fields').hidden=t!=='journey';for(const el of document.querySelectorAll('#r-artefact-form [data-r-types]'))el.hidden=!el.dataset.rTypes.split(' ').includes(t)}}
// A surface that cannot be drawn from the saved project (an unexpected stored value, for example) says so in place, as
// the chapter's own page did when it could not open, instead of leaving the whole workspace undrawn.
const guard=draw=>{try{return draw()}catch(e){console.warn('Chapter 1 could not draw this part of the page.',e?.message);return `<article class="r-card r-unavailable" role="status"><p class="r-kicker">Chapter 01</p><h2>This part of the chapter could not be drawn.</h2><p>${esc(e?.message||'The saved project holds a value this view does not recognise.')}</p><p class="r-note">Saved records are unchanged. Review the record in its editor or reload the page.</p></article>`}};
// Every document and window listener of this studio, on one AbortController: dispose() takes them all away.
function bind(b){
  bridge=b;sync();listeners?.abort();listeners=new AbortController();const signal=listeners.signal;
  // The canvas's drafts (rc41, W3): an artefact of the type placed; a link between two artefacts of the kind chosen.
  draftRelease?.();draftRelease=registerDraftEditor(1,{element(spec){editArtefact(null,null,spec.type==='context'?'stakeholder':spec.type);},relationship(spec){linkDialog(null,{from:spec.from,kind:spec.relation,to:spec.to});}});
  // The chapter's records on Output (round 26, D-26-13): a requirement's row reads its priority and owner.
  registerOutputRecords(1,{detail:r=>r.type==='requirement'?[r.object?.record?.priority,r.object?.owner||'Owner missing'].filter(Boolean).join(' · '):undefined});
  document.addEventListener('click',onClick,{signal});document.addEventListener('submit',onSubmit,{signal});
  document.addEventListener('input',onInput,{signal});document.addEventListener('change',onChange,{signal});
  document.addEventListener('pointerover',e=>{const el=e.target.closest?.('[data-r-insight]');if(el)showTip(el,e)},{signal});
  document.addEventListener('pointerout',e=>{if(e.target.closest?.('[data-r-insight]'))hideTip()},{signal});
  document.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-r-insight]');if(el)showTip(el)},{signal});
  document.addEventListener('focusout',e=>{if(e.target.closest?.('[data-r-insight]'))hideTip()},{signal});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip()},{signal});
  window.addEventListener('beforeunload',e=>{if(ui.dirty||ui.busy){e.preventDefault();e.returnValue=''}},{signal});
  window.aiwRequirementsPage=page;
  // Field sparks on this studio's editors, and the Co-author panel's way into them (round 2, I2-12).
  sparkStudio({store,signal,dialog:'.r-dialog',recordId:c=>c==='brief'?'brief':dialogDraft?.id||null,editors:{artefact:id=>editArtefact(id),brief:()=>editBrief()},links:c=>c==='artefact'&&!dialogDraft?.id?{linkedIds:(dialogDraft?.links||[]).flatMap(([f,,t])=>[f,t]).filter(x=>x&&x!=='new')}:{}});
  // A link may open the workbook import (?intake=start), once.
  if(!started){started=true;const q=new URLSearchParams(location.search);if(q.get('intake')==='start'&&Number(q.get('chapter')||1)===1)withIntake(m=>m.openIntake({store,onSaved:()=>{ui.section='requirement';ui.tab='work';render();toast('Workbook import saved. Review the source assertions and open findings.');}}));}
}
function dispose(){listeners?.abort();listeners=null;draftRelease?.();draftRelease=null;hideTip();closeDialog(true,{restore:false});if(window.aiwRequirementsPage===page)delete window.aiwRequirementsPage;}
// Before a first render the studio reads its selection from the shell: a record named in the address opens its part of Work.
return {
  enter(id,{explicit=false}={}){if(!explicit)return;const a=doc()?.artefacts.find(x=>x.id===id);if(!a)return;ui.section=['journey','requirement'].includes(a.type)?a.type:'context';ui.filter='all';ui.page=1;ui.query='';},
  get workSection(){return ui.section},openSection(id){if(!validWorkSection(1,id))return false;ui.section=id;ui.filter='all';ui.page=1;ui.query='';return true;},
  work:()=>guard(()=>{sync();return work()}),validation:()=>guard(()=>{sync();return validation()}),output:()=>guard(()=>{sync();return output()}),inspector:()=>guard(()=>{sync();return renderStudioRecordCard(project,1,ui.selected,()=>inspector(),graphOf(project))}),
  assistance:()=>guard(()=>{sync();const a=selected();return `<div id="r-page-error" class="r-error" role="alert" hidden></div><div class="r-assistant-bar"><div><span class="r-kicker">Ch. 01 / ${esc(ui.tab[0].toUpperCase()+ui.tab.slice(1))}</span><span>${a?esc(meta(a)):esc(project.name)}</span></div><nav aria-label="Contextual assistance">${btn('sol',icon('spark')+'Sol')}${btn('mind',icon('book')+'Co-design')}<button class="r-btn" data-action="cursor" aria-pressed="${ui.cursor}">${icon('cursor')}Hover explanations <span class="ux-toggle-state" aria-hidden="true">${ui.cursor?'On':'Off'}</span></button></nav></div>`}),
  milestones:()=>milestonesOf(doc()),graph:()=>doc()?graphOf(doc()):{nodes:[],edges:[]},
  next(){sync();next()},assistant(kind){sync();explainMenu(kind==='mind'?'mind':'sol')},
  tip(n){sync();const a=get(n?.id);return a?`<small>CHAPTER 01 · ${esc(a.id)}</small><h3>${esc(a.title)}</h3><p>${esc(a.description||'Description not recorded.')}</p>`:''},
  bind,dispose,get busy(){return ui.busy},get ghost(){return ui.ghost}
};
}
