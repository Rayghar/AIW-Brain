import {brainContext} from './aiw-brain.js';
import {evidenceState,sourceVersion,sourceCurrent,taskNext,evidenceForRecord} from './evidence-domain.js';
import {currentProject,reportFailure,onProjectSwitch} from './project-context.js';
import {esc} from './html-escape.js';
const button=(action,label,cls='',attrs='')=>`<button type="button" class="ev-button ${cls}" data-ev-action="${action}" ${attrs}>${label}</button>`;
const p=()=>currentProject(),editable=t=>t&&!['applied','dismissed','withdrawn'].includes(t.status);
export function evidenceContextHTML(project,id,activeTab){const ts=evidenceForRecord(project,id);if(!ts.length)return '';return `<section class="ev-context"><h3>Source evidence</h3>${ts.map(t=>{const s=sourceVersion(project,t.sourceId,t.sourceRevision);return `<p><b>${esc(t.sourceId)} · revision ${t.sourceRevision}</b><br>${esc(s.title)} · ${esc(s.status)}</p><p>${sourceCurrent(project,t)?'Cited source review is current.':'Source changed. Review the linked requirement, scenario, and decision.'}</p>${button('record-trail','Open evidence trail','',`data-task="${esc(t.id)}"`)}`}).join('')}<small>${activeTab==='validate'?'Check the source and interpretation before closing findings.':activeTab==='output'?'This citation and review history travel into the SDD.':'The source supports the interpretation; it does not establish approval.'}</small></section>`;}
export function evidenceCursorText(project,id){const c=brainContext(project,{id}),basis=c.knowledge.length?'AIW knowledge · '+c.knowledge.map(k=>k.record.name).join(' / ')+' · descriptive pilot. ':'';const t=evidenceForRecord(project,id)[0];if(!t)return basis;const s=sourceVersion(project,t.sourceId,t.sourceRevision);return basis+t.sourceId+' r'+t.sourceRevision+' · '+s.status+' · '+(sourceCurrent(project,t)?'Source review current.':'Source changed; review required.');}
export function evidenceAssistantLink(kind){
 const tasks=evidenceState(p()).tasks,active=tasks.filter(t=>editable(t)),recent=active.at(-1)||tasks.at(-1);
 if(kind==='mind')return tasks.length?`<section class="ev-assistant-link"><div><h3>Reasoning from your sources</h3><p>Compare patterns for a saved need and retain the trade-offs.</p></div>${button('open-mind','Review source-based patterns','',`data-task="${esc(recent.id)}"`)}</section>`:'';
 return `<section class="ev-assistant-link"><div><h3>Work from a source</h3><p>Shape one need into linked requirement, scenario and decision drafts.</p></div><div class="ev-form-actions">${button('new-draft','Draft from a source')}${tasks.length?button('open-sol',active.length?'Resume saved work · '+active.length:'Review saved work') : ''}</div>${recent?`<small>${esc(recent.title)} · ${esc(taskNext(p(),recent))}</small>`:''}</section>`;
}
// Source-based work is a drill-in within the existing assistant, not another assistant window.
export function refineAssistantDialog(dialog,kind){
 if(!['sol','mind'].includes(kind))return;
 dialog.dataset.assistant=kind;dialog.classList.add('assistant-dialog');
 let link=dialog.querySelector('.ev-assistant-link');if(!link){const template=document.createElement('template');template.innerHTML=evidenceAssistantLink(kind);link=template.content.firstElementChild;}if(link)dialog.querySelector('.r-discard')?.before(link);
 const title=dialog.querySelector('header h2');if(title){const text=title.textContent.split(' · ');title.textContent=text[0];if(text[1]){const sub=document.createElement('p');sub.className='assistant-subtitle';sub.textContent=text.slice(1).join(' · ');title.after(sub);}}
}
export function mountEvidenceWorkspace(project){
 const card=document.querySelector('.project-card,.r-project');if(card&&!card.querySelector('[data-ev-action="open-sources"]')){const b=document.createElement('button');b.type='button';b.className='ev-project-link';b.dataset.evAction='open-sources';const count=evidenceState(project).sources.length;b.innerHTML='Sources'+(count?' <span>'+count+'</span>':'');b.setAttribute('aria-label','Project sources'+(count?', '+count+' saved':''));(card.querySelector('.rail-project-tools')||card).prepend(b);}
}

let editorLoading=null,opening=0;
onProjectSwitch(()=>opening++);
if(typeof document!=='undefined')document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-ev-action]');if(!b||b.disabled||b.closest('.ev-dialog'))return;
 const action=b.dataset.evAction;if(!['open-sources','open-sol','open-mind','record-trail','new-draft'].includes(action))return;
 e.preventDefault();const projectId=p()?.id,sequence=++opening,dialog=document.querySelector('dialog[open]'),locationKey=location.search;
 b.disabled=true;b.setAttribute('aria-busy','true');
 try{const m=await(editorLoading??=import('./evidence-workspace-ui.js').catch(error=>{editorLoading=null;throw error;}));if(sequence===opening&&b.isConnected&&p()?.id===projectId&&location.search===locationKey&&document.querySelector('dialog[open]')===dialog)m.openEvidenceAction(action,b.dataset.task);}
 catch(error){if(sequence===opening&&p()?.id===projectId)reportFailure('The source editor could not load. Your saved evidence is retained; try the action again.',error);}
 finally{if(b.isConnected){b.disabled=false;b.removeAttribute('aria-busy');}}
});
