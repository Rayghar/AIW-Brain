import {caseGuidance} from './case-guidance.js';
import {chapterGuide} from './chapter-guide.js';
import {captureCompanionDrafts,restoreCompanionDrafts} from './companion-drafts.js';
import {workbenchHTML,mountWorkbench} from './workbench-ui.js';
import {guideHTML,threadHTML,mountGuide} from './chapter-guide-ui.js';
import {assuranceHTML,mountAssurance} from './assurance-ui.js';
import {knowledgeWorkspace,mountKnowledge,knowledgeEditing,guardKnowledge} from './knowledge-workspace-ui.js';
import {solOverlay,solChapterBind,solChapterMount} from './chapter-sol.js';
import {architectureWorkspace,architectureSolEntry,architectureActive,architectureEditing,guardArchitecture,mountArchitecture} from './architecture-task-ui.js';
import {registerAssistantSurface} from './assistant-surface.js';
import {intelligenceSection,mountIntelligence,intelligenceBasis,intelligenceGenerationHTML,intelligenceSourceReviewHTML,exploreKnowledgeQuestion} from './intelligence-ui.js';
import {brainContext,brainNotes,brainNote,noteCurrent} from './aiw-brain.js';
import {journeyChapters,journeyObjectURL} from './journey-context.js';
import {projectURL,projectPreferenceKey} from './project-context.js';
import {knowledgeHTML,knowledgeCard,contextSketch} from './knowledge-ui.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const B=(action,label,cls='',attrs='')=>`<button type="button" class="btn ${cls}" data-brain-action="${action}" ${attrs}>${label}</button>`;
const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/></svg>';
let selection=null,current=null,panel=null,mode='design',open=false,noteId='',title='',body='',reviewer='',reason='',dirty=false,busy=false,error='',review=false,conflict=false,loadedRevision=0,nativeClick=false,returnFocus=null,pending=null,restored=false,refreshing=false;
const nativeViews=new Map();
const knowledgeChoices=new Map();
const contextKey=c=>[c.chapter,c.tab,c.selected.id,c.stamp].join(':');
const project=()=>window.aiwProjectStore?.value?.document||window.aiwCurrentProject;
const note=()=>brainNote(project(),noteId);
const pref=()=>projectPreferenceKey('brain-assistance');
function remember(){try{localStorage.setItem(pref(),JSON.stringify({open,mode,noteId}));}catch{}}
function syncLaunchState(){document.querySelectorAll('.brain-assistance [data-brain-launch],.brain-assistance [data-brain-action="author"]').forEach(b=>{b.setAttribute('aria-controls','brain-panel');b.setAttribute('aria-expanded',String(open&&(b.dataset.brainLaunch||b.dataset.brainAction)===(mode==='author'?'design':mode)));});}
const objectLink=n=>`<a href="${projectURL(journeyObjectURL(n))}"><span>${esc(n.ref||n.id)}</span>${esc(n.title)}</a>`;
function relatedContext(c){return `<details class="brain-basis"><summary>What AIW is using <span>${c.requirements.length+c.drivers.length+c.decisions.length} linked records</span></summary>${[['Requirements',c.requirements],['Quality drivers',c.drivers],['Decisions',c.decisions]].map(([label,items])=>`<h4>${label}</h4><div class="brain-record-links">${items.map(objectLink).join('')||'<p>None linked to this object.</p>'}</div>`).join('')}${c.sources.length?`<h4>Project sources</h4>${c.sources.map(s=>`<p><b>${esc(s.id+' · '+s.title)}</b><br>Revision ${s.revision} · ${esc(s.location||'Location not recorded')}</p>`).join('')}`:''}<p class="brain-note">${esc(c.status)}. Recorded relationships express design intent; verification evidence remains separate.</p></details>`;}
function savedTasks(c){const related=c.tasks.filter(t=>!['applied','dismissed'].includes(t.status));return related.length?`<section class="brain-resume"><h3>Continue this design</h3>${related.map(t=>`<button type="button" data-brain-action="task" data-task-id="${esc(t.id)}"><span>${esc(t.id)} · ${esc(t.status)}</span><strong>${esc(t.title)}</strong><small>Continue saved work →</small></button>`).join('')}</section>`:'';}
function nativeView(c,kind){if(document.body.classList.contains('am-active'))return ''; const saved=nativeViews.get(kind);return saved?.key===contextKey(c)?`<section class="brain-native" data-native-kind="${kind}">${saved.body}<span role="alert" hidden></span></section>`:'';}
function designActions(c){
 const reqs=c.requirements,canDesign=c.chapter<=7&&reqs.length;if(!canDesign&&![8,9].includes(c.chapter)&&c.selected.id==='project')return '';
 return `<section class="brain-collaborate"><h3>${c.tab==='output'?'Explain the design':'Develop the design'}</h3><div class="brain-actions">${canDesign?B('develop','Develop the connected design'):c.chapter===8?B('exchange','Develop contract & payload'):c.chapter===9?B('protection','Develop protection'):''}${c.selected.id!=='project'?B('author',c.tab==='output'?'Write this explanation':'Explain this in the SDD'):''}</div>${canDesign&&reqs.length>1?`<label class="brain-field"><span>Source requirement for design</span><select data-brain-requirement>${reqs.map(n=>`<option value="${esc(n.id)}">${esc(n.id+' · '+n.title)}</option>`).join('')}</select></label>`:''}</section>`;
}
function caseGuidanceHTML(c,compact=false){
 const g=caseGuidance(project(),c);if(!g)return '';
 const html=`<section class="brain-case-guide" aria-label="Active architecture case"><p class="brain-eyebrow">Architecture case · ${esc(g.requirementId)}</p>${g.cases.map(scope=>`<h3>${esc(scope.title)}</h3><p>${esc(scope.purpose)}</p>`).join('')}<div class="brain-case-path" aria-label="Connected chapters">${g.stages.map(s=>`<a href="${projectURL(s.objects[0]?.url||'/?chapter='+s.chapter+'&tab=work')}" class="${s.objects.length?'has-objects':''}" title="Chapter ${s.chapter}: ${s.objects.length} connected objects">${String(s.chapter).padStart(2,'0')}</a>`).join('')}<a href="${projectURL('/?chapter=11&tab=work')}">11</a></div><small>Connected objects, including drafts · each link needs review</small><div class="brain-case-next"><strong>${esc(g.next.title)}</strong><p>${esc(g.next.detail)}</p>${g.next.taskId?B('task','Continue in Mind Factory','',`data-task-id="${esc(g.next.taskId)}"`):`<a class="btn" href="${projectURL(g.next.url)}">Continue in chapter ${g.next.chapter} →</a>`}</div></section>`;
 return compact?`<details class="brain-basis"><summary>Case · ${esc(g.cases.map(s=>s.title).join(', '))}</summary>${html}</details>`:html;
}
function designView(c){
 const p=project(),g=chapterGuide(p,c.chapter,c.selected.id==='project'?null:c.selected.id),focused=!!g.creation||!!g.question||!!g.session?.pending;
 const tools=`${nativeView(c,'sol')}${savedTasks(c)}${designActions(c)}${workbenchHTML(p,c,'design')}${assuranceHTML(p,c)}`;
 return `${caseGuidanceHTML(c)}${contextSketch(c)}${solOverlay(p,c.chapter,c.selected.id)}${guideHTML(p,c)}<div data-brain-intelligence></div>${focused?`<details class="brain-basis"><summary>Chapter tools, sources and earlier work</summary>${tools}</details>`:tools}${knowledgeWorkspace(p,c,{compact:true})}${architectureSolEntry(p,c)}${threadHTML(p,c)}${relatedContext(c)}`;
}

function mindView(c){
 if(architectureActive())return `${caseGuidanceHTML(c,true)}${architectureWorkspace(project(),c)}<div data-brain-intelligence></div>`;
 return `${caseGuidanceHTML(c,true)}${c.chapter<8?architectureWorkspace(project(),c):contextSketch(c)}${c.chapter>=8?`<details class="brain-basis" open><summary>${esc(journeyChapters[c.chapter])} alternatives and tactics</summary>${nativeView(c,'mind')}</details>`:''}${knowledgeWorkspace(project(),c)}${workbenchHTML(project(),c,'mind')}${c.chapter<8?`<details class="brain-basis"><summary>Chapter explorations</summary>${nativeView(c,'mind')}</details>`:''}<div data-brain-intelligence></div>${savedTasks(c)}${c.selected.id!=='project'?B('author','Capture this reasoning'):''}${relatedContext(c)}`;
}

function noteSource(n){return `<details class="brain-basis"><summary>Captured source & knowledge</summary><p>${esc(n.context.id)} · Chapter ${n.context.chapter} · ${noteCurrent(project(),n)?'Current source basis':'Source changed; review required'}</p><p>${esc(n.basis.selected.record.purpose||n.basis.selected.record.description||'')}</p>${n.knowledge.map(knowledgeHTML).join('')}</details>`;}
function authorView(c){
 const n=note(),notes=brainNotes(project()).filter(n=>n.context.id===c.selected.id),all=brainNotes(project());
 if(!n)return `<section class="brain-intent"><p class="brain-eyebrow">Writing with Sol · ${esc(c.selected.ref||c.selected.id)}</p><h3>Give the design its explanation.</h3><p>Prepare an editable passage from the object, its linked requirements, quality targets and decisions. Missing information stays visible.</p>${c.selected.id==='project'?'<p>Select a saved object to draft its explanation. For a new project, capture the first requirement in Work.</p>'+B('native','Open chapter actions'):B('draft','Draft from this object','primary')}</section>${notes.length?`<section class="brain-saved"><h3>Passages for this object</h3>${notes.map(n=>B('load-note',n.id+' · '+n.title,'',`data-note-id="${esc(n.id)}"`)).join('')}</section>`:''}${all.length?`<details class="brain-basis"><summary>All saved passages <span>${all.length}</span></summary>${all.map(n=>B('load-note',n.id+' · '+n.title,'',`data-note-id="${esc(n.id)}"`)).join('')}</details>`:''}${relatedContext(c)}`;
 const current=noteCurrent(project(),n),updated=n.accepted&&(n.accepted.body!==body||n.accepted.title!==title);
 return `<div class="brain-writing-context"><span>${esc(n.id)} · Writing for ${esc(n.context.id)}</span>${B('notes','Other passages')}</div>${current?'':`<section class="brain-source-warning"><h3>The source has changed.</h3><p>Your text is retained. Review the latest object context and revise the passage before including it in the SDD.</p>${B('source-review','Review current sources')}</section>`}${review?`<section class="brain-review"><h3>${updated?'Review the revised passage':'Review before using in the SDD'}</h3>${n.accepted?`<details><summary>Currently included passage</summary><p class="brain-prose">${esc(n.accepted.body)}</p></details>`:''}<h4>${esc(title)}</h4><p class="brain-prose">${esc(body)}</p><label class="brain-field"><span>Author / reviewer</span><input data-brain-field="reviewer" value="${esc(reviewer)}" maxlength="180"></label><label class="brain-field"><span>Why this passage is ready to use</span><textarea data-brain-field="reason" rows="2" maxlength="2000">${esc(reason)}</textarea></label><label class="brain-check"><input type="checkbox" data-brain-confirm> I reviewed the text, source context and open assumptions.</label><div class="brain-actions">${B('edit','Return to editing')}${B('accept','Use in working SDD','primary',!current?'disabled':'')}</div></section>`:`<label class="brain-field"><span>Passage title</span><input data-brain-field="title" value="${esc(title)}" maxlength="180"></label><label class="brain-field"><span>Design explanation</span><textarea class="brain-manuscript" data-brain-field="body" maxlength="16000">${esc(body)}</textarea></label><div class="brain-actions">${B('save','Save draft')}${B('review','Review & use','primary',!current?'disabled':'')}</div><p class="brain-note">${n.accepted?'The accepted passage remains in the SDD while you edit this draft.':'Saved drafts stay private until you choose to include the passage in the working SDD.'}</p>`}${noteSource(n)}${n.accepted?`<details class="brain-basis"><summary>Accepted passage & history</summary><p>${esc(n.accepted.reviewer)} · ${esc(n.accepted.at.slice(0,10))}</p><p>${esc(n.accepted.reason)}</p><a href="${projectURL('/?chapter=11&tab=output')}">Open the working SDD →</a><details><summary>Remove from working SDD</summary><label class="brain-field"><span>Reason for removal</span><textarea data-brain-withdraw rows="2" maxlength="2000"></textarea></label><label class="brain-check"><input type="checkbox" data-brain-withdraw-confirm> Remove the passage and retain its history.</label>${B('withdraw','Remove accepted passage')}</details></details>`:''}`;
}
function render(){
 if(!open||!current)return;
 if(!panel){panel=document.createElement('aside');panel.id='brain-panel';panel.className='brain-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','brain-title');document.body.append(panel);solChapterBind(panel,()=>current?.chapter,{refresh:()=>{if(open&&!busy&&mode==='design')render();},scope:'.brain-sol'});}
 solChapterMount(project(),current.chapter,()=>{if(open&&!busy&&mode==='design')render();});
 captureCompanionDrafts(panel);
 const c=mode==='author'&&note()?brainContext(project(),{...note().context,tab:current.tab}):current;
 panel.hidden=false;panel.dataset.role=mode==='mind'?'mind':'sol';document.body.classList.add('brain-open');const modal=matchMedia('(max-width:700px)').matches;panel.setAttribute('aria-modal',String(modal));const app=document.querySelector('#app');if(app)app.inert=modal;
 panel.innerHTML=`<header class="brain-header"><strong id="brain-title" class="brain-role-title">${mode==='mind'?'Mind Factory':'Sol'}</strong><nav class="brain-modes" aria-label="AIW companions">${[['design','Sol'],['mind','Mind Factory']].map(([key,label])=>B(key,label,(mode==='author'?'design':mode)===key?'active':'',`aria-pressed="${(mode==='author'?'design':mode)===key}"`)).join('')}</nav>${B('close','×','icon-only','aria-label="Close assistance"')}</header><div class="brain-location"><span>Chapter ${String(c.chapter).padStart(2,'0')} · ${esc(journeyChapters[c.chapter])} / ${esc(c.tab)}</span><strong>${esc(c.selected.ref||c.selected.id)} · ${esc(c.selected.title)}</strong><small>${esc(c.status)}</small>${window.aiwExplorationContext?'<small>Exploring '+esc(window.aiwExplorationContext.scope)+' · '+esc(window.aiwExplorationContext.concern)+(window.aiwExplorationContext.gaps.length?' · '+window.aiwExplorationContext.gaps.length+' realization questions':'')+'</small>':''}</div>${mode==='author'?`<nav class="brain-writing-return" aria-label="Writing task">${B('design','← Back to Sol')}<span>Design explanation</span></nav>`:''}<div class="brain-error" role="alert" tabindex="-1" ${error?'':'hidden'}>${esc(error)}${conflict?B('reload','Load latest; retain my text'):''}</div><div class="brain-content">${mode==='author'?authorView(c):mode==='mind'?mindView(c):designView(c)}</div><footer><span role="status">${busy?'Saving…':dirty?'Unsaved text':mode==='author'&&noteId?'Saved with project':'Using this project’s context'}</span><details><summary>Sources & connection</summary><p>${intelligenceBasis()} Knowledge supports exploration and reviewed proposals; scoring is off.</p></details></footer>${pending?`<div class="brain-leave" role="alertdialog" aria-label="Unsaved co-author text"><h3>Keep your draft text?</h3><p>Save it before changing this task, or discard only the unsaved edits.</p>${B('stay','Keep editing','primary')}${B('save-leave','Save & continue')}${B('discard','Discard unsaved edits')}</div>`:''}`;
 const content=panel.querySelector('.brain-content'),slot=panel.querySelector('[data-brain-intelligence]');
 const architecturalTask=mode==='mind'&&(project().coauthoring?.designTasks||[]).find(t=>t.id===window.aiwArchitectureTask?.currentId);
 const intelligenceContext=architecturalTask?brainContext(project(),{chapter:2,id:architecturalTask.driverId}):c;
 const intelligence=intelligenceSection(project(),intelligenceContext,mode,{editing:mode==='author'&&!!note(),compact:mode!=='author'});
 if(slot)slot.outerHTML=intelligence;else content.insertAdjacentHTML(mode==='author'&&note()?'beforeend':'afterbegin',intelligence);
 if(mode==='author'&&note()?.generation)content.insertAdjacentHTML('beforeend',intelligenceGenerationHTML(note().generation));
 const native=panel.querySelector('.brain-native');if(native){
  const intro=native.querySelector(':scope>p');if(intro&&/Chapter| · | \/ /.test(intro.textContent))intro.remove();
  const source=native.querySelector('.ev-assistant-link');if(source){const details=document.createElement('details');details.className='brain-basis';details.innerHTML='<summary>Work from project sources</summary>';source.replaceWith(details);details.append(source);native.append(details);}
  const patterns=[...native.querySelectorAll('.r-pattern,.d-pattern,.l-pattern')];if(patterns.length){const deck=document.createElement('div');deck.className='brain-pattern-deck';patterns[0].before(deck);patterns.forEach((card,i)=>{card.classList.add('brain-native-pattern');const heading=card.querySelector('h3');if(heading){const tag=document.createElement('span');tag.className='brain-pattern-number';tag.textContent=String(i+1).padStart(2,'0');heading.before(tag);}deck.append(card);});}
  if(mode==='mind')window.aiwInterfaceImpact?.decorateAssistant(native,'mind',{tasks:false});
 }
 panel.setAttribute('aria-busy',String(busy));panel.querySelectorAll('button,input,textarea,select').forEach(b=>{if(busy)b.disabled=true;});
 restoreCompanionDrafts(panel,[project().id,c.chapter,c.selected.id,mode].join(':'));remember();syncLaunchState();mountGuide(render);mountAssurance(render);mountWorkbench(render);
 mountIntelligence(project(),intelligenceContext,mode,{render:()=>{if(open&&!busy)render();},guard:change,author:id=>{mode='author';loadNote(id);},design:resumeTask,architecture:resumeTask});
}
function change(fn){if(busy||guardKnowledge(fn)||guardArchitecture(fn))return;if(dirty){pending=fn;render();panel.querySelector('[data-brain-action="stay"]')?.focus();}else fn();}
function close(focus=true){open=false;pending=null;if(panel)panel.hidden=true;document.body.classList.remove('brain-open');const app=document.querySelector('#app');if(app)app.inert=false;remember();syncLaunchState();if(focus)(returnFocus?.isConnected?returnFocus:document.querySelector('[data-brain-launch="design"]'))?.focus({preventScroll:true});}
function show(next){if(document.querySelector('dialog[open]'))return;if(open&&mode===next&&next!=='author')return;returnFocus=document.activeElement;change(()=>{if(next!=='author'){native(next==='mind'?'mind':'sol');return;}mode='author';open=true;if(note()?.context.id!==current.selected.id)noteId='';if(!noteId){const n=brainNotes(project()).filter(n=>n.context.id===current.selected.id).at(-1);if(n)loadNote(n.id,false);}render();panel.querySelector('[data-brain-action="close"]')?.focus({preventScroll:true});});}
registerAssistantSurface(view=>{
 if(!current)return false;
 nativeViews.set(view.kind,{...view,key:contextKey(current)});mode=view.kind==='mind'?'mind':'design';open=true;error='';render();
 if(!refreshing)panel.querySelector('[data-brain-action="close"]')?.focus({preventScroll:true});
 return true;
});
function loadNote(id,draw=true){const n=brainNote(project(),id);if(!n)return;noteId=id;loadedRevision=n.revision;title=n.title;body=n.body;dirty=false;review=false;error='';conflict=false;if(draw)render();}
function notify(){document.dispatchEvent(new CustomEvent('aiw:external-project'));}
async function save(type,payload,after){if(busy)return;busy=true;error='';render();try{const r=await window.aiwProjectStore.command({type,payload});dirty=false;conflict=false;await after?.(r);notify();}catch(e){error=e.message;conflict=!!e.conflict;}finally{busy=false;render();if(error)panel.querySelector('.brain-error')?.focus();}}
async function saveText(after){if(!note())return;return save('brain.update',{id:noteId,revision:loadedRevision,title,body},async()=>{loadNote(noteId,false);await after?.();});}
function native(kind='sol'){
 if(document.body.classList.contains('am-active')){mode=kind==='mind'?'mind':'design';open=true;error='';render();syncLaunchState();remember();return;}
 const target=[...document.querySelectorAll('.r-assistant-bar button,.l-assistance button')].find(b=>[...b.attributes].some(a=>a.name.startsWith('data-')&&a.value===kind));
 if(!target){error='Choose an object to open its chapter actions.';render();return;}close(false);nativeClick=true;try{target.click();}finally{nativeClick=false;}
}
function develop(){
 const id=panel.querySelector('[data-brain-requirement]')?.value||current.requirements[0]?.id;if(!id){native();return;}
 const related=current.tasks.find(t=>t.requirementId===id&&!t.kind&&!['applied','dismissed'].includes(t.status));
 close(false);
 if(window.aiwDesignTasks){if(related)window.aiwDesignTasks.openTask(related.id);else window.aiwDesignTasks.startFrom(id);}else location.href=projectURL('/?chapter=4&tab=model&'+(related?'designTask='+encodeURIComponent(related.id):'coDesign='+encodeURIComponent(id)));
}
const designTasksForArchitecture=id=>(project().coauthoring?.designTasks||[]).some(t=>t.id===id&&t.kind==='architecture');
function resumeTask(id){if(designTasksForArchitecture(id)){window.aiwArchitectureTask?.openTask(id);return;}close(false);if(window.aiwDesignTasks)window.aiwDesignTasks.openTask(id);else location.href=projectURL('/?chapter=4&tab=model&designTask='+encodeURIComponent(id));}
function act(b){
 const a=b.dataset.brainAction;
 if(['design','author','mind'].includes(a)){show(a);return;}
 if(a==='close')return change(()=>close());
 if(a==='stay'){pending=null;render();return;}
 if(a==='discard'){const fn=pending;dirty=false;pending=null;fn?.();return;}
 if(a==='save-leave'){const fn=pending;return saveText(()=>{pending=null;fn?.();});}
 if(a==='native'||a==='native-mind')return change(()=>native(a==='native'?'sol':'mind'));
 if(a==='knowledge-open')return change(()=>{native('mind');const section=panel.querySelector('.brain-pattern-library');if(section){section.open=true;section.querySelector('summary')?.focus({preventScroll:true});section.scrollIntoView?.({block:'start'});}});
 if(a==='knowledge-select'){knowledgeChoices.set(contextKey(current),b.dataset.knowledgeId);render();panel.querySelector(`[data-brain-action="knowledge-select"][data-knowledge-id="${b.dataset.knowledgeId}"]`)?.focus({preventScroll:true});return;}
 if(a==='knowledge-explore'){
  const k=current.knowledge.find(k=>k.id===b.dataset.knowledgeId);if(!k)return;
  try{exploreKnowledgeQuestion(project(),current,k);render();const input=panel.querySelector('[data-intel-prompt]');input?.focus({preventScroll:true});input?.scrollIntoView?.({block:'center'});}catch(e){error=e.message;render();panel.querySelector('.brain-error')?.focus();}return;
 }
 if(a==='develop')return change(develop);
 if(a==='task')return change(()=>resumeTask(b.dataset.taskId));
 if(a==='alternative')return change(()=>{close(false);if(window.aiwInterfaceImpact)window.aiwInterfaceImpact.loadAlternative(b.dataset.alternativeId);else location.href=projectURL('/?chapter=4&tab=model&modelAlternative='+encodeURIComponent(b.dataset.alternativeId));});
 if(a==='exchange'||a==='protection')return change(()=>{close(false);const task=a==='exchange'?window.aiwExchangeTask:window.aiwSecurityTask;if(task)task.openTask();else location.href=projectURL('/?chapter='+(a==='exchange'?8:9)+'&tab=work&object='+encodeURIComponent(current.selected.id));});
 if(a==='source-draft')return change(()=>{close(false);const button=document.createElement('button');button.dataset.evAction='new-draft';button.hidden=true;document.body.append(button);button.click();button.remove();});
 if(a==='draft')return save('brain.draft',{chapter:current.chapter,objectId:current.selected.id,basisStamp:current.stamp},r=>loadNote(r.selected,false));
 if(a==='notes')return change(()=>{noteId='';review=false;render();});
 if(a==='load-note')return change(()=>loadNote(b.dataset.noteId));
 if(a==='save')return saveText();
 if(a==='review'){if(dirty)return saveText(()=>{review=true;});review=true;render();return;}
 if(a==='edit'){review=false;render();return;}
 if(a==='accept')return save('brain.accept',{id:noteId,revision:loadedRevision,reviewer,reason,reviewed:panel.querySelector('[data-brain-confirm]').checked},()=>{loadNote(noteId,false);reason='';review=false;});
 if(a==='withdraw')return save('brain.withdraw',{id:noteId,revision:loadedRevision,reason:panel.querySelector('[data-brain-withdraw]').value,reviewed:panel.querySelector('[data-brain-withdraw-confirm]').checked},()=>loadNote(noteId,false));
 if(a==='source-review')return change(()=>{const n=note(),c=brainContext(project(),n.context);panel.querySelector('.brain-source-warning').innerHTML=`<h3>Review the current source context</h3>${relatedContext(c)}${intelligenceSourceReviewHTML(project(),n.generation)}<p class="brain-prose">${esc(c.selected.record?.purpose||c.selected.record?.description||'Source object removed.')}</p><label class="brain-field"><span>Source-review conclusion</span><textarea data-brain-source-reason rows="3"></textarea></label><label class="brain-check"><input type="checkbox" data-brain-source-confirm> I reviewed this context against the retained text.</label>${B('confirm-source','Record source review','primary',`data-stamp="${c.stamp}"`)}`;});
 if(a==='confirm-source')return save('brain.refresh',{id:noteId,revision:loadedRevision,basisStamp:b.dataset.stamp,reason:panel.querySelector('[data-brain-source-reason]').value,reviewed:panel.querySelector('[data-brain-source-confirm]').checked},()=>loadNote(noteId,false));
 if(a==='reload'){busy=true;window.aiwProjectStore.load().then(()=>{notify();conflict=false;error='Latest project loaded. Your text is retained. '+(note()?.revision!==loadedRevision?'This passage also changed; open its saved version from Other passages before saving again.':'Review your text before saving.');}).catch(e=>{error=e.message;}).finally(()=>{busy=false;render();});}
}
let handoffSelection,handoffOpened=false;
export function mountBrainContext(p,selected,tab){
 if(!p||!selected)return;selection={...selected,tab};const from=new URLSearchParams(location.search).get('guideSource');if(from){handoffSelection??=selected.id;if(handoffSelection===selected.id)selection.id=from;}current=brainContext(p,selection);
 mountKnowledge(p,current,{open:()=>{mode='mind';open=true;render();},changed:()=>{current=brainContext(project(),selection);render();},ask:k=>{exploreKnowledgeQuestion(project(),current,k);render();panel.querySelector('[data-intel-prompt]')?.focus();}});
 mountArchitecture(p,current,{selectedId:current.selected.id,render,reveal:()=>native('mind'),preview:id=>{close(false);if(window.aiwInterfaceImpact)window.aiwInterfaceImpact.loadAlternative(id);else location.href=projectURL('/?chapter=4&tab=model&modelAlternative='+encodeURIComponent(id));}});
 const assistance=document.querySelector('.r-assistant-bar,.l-assistance');
 if(assistance){
  const buttons=[...assistance.querySelectorAll('button')],sol=buttons.find(b=>[...b.attributes].some(a=>a.name.startsWith('data-')&&a.value==='sol'));
  if(sol){sol.dataset.brainLaunch='design';sol.innerHTML=icon+'<span>Ask Sol</span>';sol.title='Ask Sol · Help with the current task';sol.setAttribute('aria-label','Ask Sol');sol.setAttribute('aria-controls','brain-panel');sol.setAttribute('aria-expanded',String(open));
  }
  const mind=buttons.find(b=>[...b.attributes].some(a=>a.name.startsWith('data-')&&a.value==='mind'));if(mind)mind.dataset.brainLaunch='mind';
  assistance.classList.add('brain-assistance');
 }
 if(!restored){restored=true;try{const saved=JSON.parse(localStorage.getItem(pref())||'null');if(saved){mode=['design','author','mind'].includes(saved.mode)?saved.mode:'design';open=saved.open===true;if(saved.noteId)loadNote(saved.noteId,false);}}catch{}}
 if(from&&!handoffOpened){handoffOpened=true;mode='design';open=true;}
 if(open&&!dirty&&!busy&&!knowledgeEditing()&&!architectureEditing()){if(mode!=='author'&&nativeViews.get(mode==='mind'?'mind':'sol')?.key!==contextKey(current)){refreshing=true;try{native(mode==='mind'?'mind':'sol');}finally{refreshing=false;}}else render();}
 const params=new URLSearchParams(location.search),task=params.get('designTask'),req=params.get('coDesign'),alt=params.get('modelAlternative');
 if(window.aiwDesignTasks&&(task||req||alt)&&!window.aiwBrainRouteHandled){window.aiwBrainRouteHandled=true;setTimeout(()=>{close(false);if(task)window.aiwDesignTasks.openTask(task);else if(req)window.aiwDesignTasks.startFrom(req);else window.aiwInterfaceImpact?.loadAlternative(alt);},0);}
 syncLaunchState();
}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||nativeClick||b.disabled)return;const action=b.dataset.brainAction,launch=b.dataset.brainLaunch||(b.matches('.canvas-bottom [data-action="sol"]')?'design':b.matches('.canvas-bottom [data-action="mind"]')?'mind':null);if(!action&&!launch){if(b.closest('.brain-native')&&[...b.attributes].some(a=>a.name.startsWith('data-')))close(false);return;}e.preventDefault();e.stopImmediatePropagation();if(launch)show(launch);else act(b);},true);
 document.addEventListener('input',e=>{const key=e.target.dataset.brainField;if(!key)return;if(key==='title')title=e.target.value;if(key==='body')body=e.target.value;if(key==='reviewer')reviewer=e.target.value;if(key==='reason')reason=e.target.value;if(['title','body'].includes(key)){dirty=true;review=false;}const status=panel.querySelector('footer [role="status"]');if(status)status.textContent=dirty?'Unsaved text':'Saved with project';});
 document.addEventListener('keydown',e=>{if(e.key==='Tab'&&open&&matchMedia('(max-width:700px)').matches&&!document.querySelector('dialog[open]')){const focusable=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary')].filter(el=>!el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.parentElement.matches('details:not([open])')&&el.tagName==='SUMMARY'));const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'&&open&&!document.querySelector('dialog[open]')){e.preventDefault();change(()=>close());}});
 window.addEventListener('resize',()=>{if(!open)return;const modal=matchMedia('(max-width:700px)').matches;panel?.setAttribute('aria-modal',String(modal));const app=document.querySelector('#app');if(app)app.inert=modal;});
 window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
}
