import {CHANGE_OUTCOMES,changeSource,changeEvents,changeSummary,changeItemState,changeTarget,isCurrentChange,latestChange,changeValue} from './changes-domain.js';
import {projectURL,projectPreferenceKey} from './project-context.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,cls='',attrs='')=>`<button type="button" class="cr-button ${cls}" data-cr-action="${action}" ${attrs}>${label}</button>`;
const field=(label,name,value='',multi=false,required=false)=>`<label class="cr-field"><span>${label}</span>${multi?`<textarea name="${name}" rows="3" ${required?'required':''}>${esc(value)}</textarea>`:`<input name="${name}" value="${esc(value)}" maxlength="180" ${required?'required':''}>`}</label>`;
const contextKey=projectPreferenceKey('aiw-change-context'),noticeKey=projectPreferenceKey('aiw-change-notice-hidden');
let host=null,lastFocus=null,dirty=false,busy=false,pending=null,recoveryDraft=null;
let state={eventId:'',itemKey:'',chapter:'all',message:'',diffOpen:true};
const project=()=>window.aiwProjectStore?.value?.document||window.aiwCurrentProject;
const event=()=>changeEvents(project()).find(e=>e.id===state.eventId)||changeEvents(project()).at(-1);
const selected=()=>event()?.items.find(i=>i.key===state.itemKey);
const chapter=()=>Number(new URLSearchParams(location.search).get('chapter')||1);
const visibleItems=()=>event()?.items.filter(i=>state.chapter==='all'||String(i.chapter)===state.chapter)||[];
const sourceURL=item=>projectURL('/?chapter='+item.chapter+'&tab=model&'+(item.chapter===1?'artefact':item.chapter===2?'driver':item.chapter===3?'decision':'object')+'='+encodeURIComponent(item.id));
function remember(){try{sessionStorage.setItem(contextKey,JSON.stringify({eventId:state.eventId,itemKey:state.itemKey}));}catch{}}
function restore(){try{return JSON.parse(sessionStorage.getItem(contextKey)||'null');}catch{return null;}}
function choose(){const items=visibleItems();if(!items.some(i=>i.key===state.itemKey))state.itemKey=items.find(i=>!changeItemState(project(),event(),i).complete)?.key||items[0]?.key||'';remember();}
function guarded(action){if(busy)return;if(!dirty)return action();pending=action;host.querySelector('.cr-unsaved').hidden=false;host.querySelector('[data-cr-action="keep"]')?.focus();}
function close(){guarded(()=>{host?.close();host?.remove();host=null;dirty=false;recoveryDraft=null;lastFocus?.isConnected&&lastFocus.focus();});}
function notifyProject(){document.dispatchEvent(new CustomEvent('aiw:external-project'));}
function showError(message,conflict=false){const e=host?.querySelector('.cr-error');if(e){e.hidden=false;e.innerHTML=esc(message)+(conflict?button('reload','Load latest project'):'');e.focus();}}
function badge(s){return `<span class="cr-status ${s.status}">${esc(s.label)}</span>`;}
function changedFields(e){if(e.request)return `<details class="cr-diff" ${state.diffOpen?'open':''}><summary>Review requested on ${esc(changeSource(e).ref)} <span>${esc(e.request.by)}</span></summary><div class="cr-diff-field"><h4>Why</h4><p>${esc(e.request.reason)}</p></div><a class="cr-link" data-cr-open-source href="${sourceURL(changeSource(e))}">Open ${esc(changeSource(e).ref)} →</a><a class="cr-link" data-cr-open-source href="${projectURL('/?chapter=11&tab=model')}">Open the review desk →</a></details>`;return `<details class="cr-diff" ${state.diffOpen?'open':''}><summary>What changed in ${esc(changeSource(e).ref)} <span>${e.legacy?'Earlier notice':e.fields.length+' '+(e.fields.length===1?'field':'fields')}</span></summary>${e.legacy?'<p>The earlier notice did not retain the previous wording. Review the current source definition and its linked design.</p>':e.fields.map(f=>`<div class="cr-diff-field"><h4>${esc(f.label)}</h4><div class="cr-diff-grid"><div><small>Before</small><p>${esc(changeValue(f.before))}</p></div><div><small>After</small><p>${esc(changeValue(f.after))}</p></div></div></div>`).join('')}<a class="cr-link" data-cr-open-source href="${sourceURL(changeSource(e))}">Open source definition →</a><a class="cr-link" data-cr-open-source href="${projectURL('/?chapter=11&tab=work')}">Review complete trace →</a></details>`;}
function recoveredNotes(){
  if(!recoveryDraft)return '';
  const d=recoveryDraft,latest=latestChange(project(),d.source),canUse=latest?.items.some(i=>i.key===d.itemKey);
  return `<section class="cr-recovery" aria-label="Preserved review draft"><h3>Your unsaved notes are still here.</h3><p>${esc(d.eventId)} / ${esc(d.itemRef)} now belongs to an earlier or unavailable change. These notes have not been saved as an assessment of the current design.</p><label class="cr-field"><span>Preserved review notes</span><textarea readonly rows="5">${esc(Object.entries(d.fields).filter(([key,value])=>key!=='reviewed'&&value).map(([key,value])=>key+': '+value).join('\n\n'))}</textarea></label>${canUse?button('recover','Use these notes for '+esc(latest.id),'primary'):'<p>Copy the notes you need before discarding this draft.</p>'}</section>`;
}
function fillDraft(draft){
  for(const [name,value] of Object.entries(draft)){const el=host.querySelector(`#cr-review-form [name="${name}"]`);if(el&&name!=='reviewed')el.value=value;}
  const confirmation=host.querySelector('#cr-review-form [name="reviewed"]');if(confirmation)confirmation.checked=false;
  const followup=host.querySelector('.cr-followup');if(followup)followup.hidden=draft.outcome!=='follow-up';
}
function editor(e,item){
  if(!item)return '<section class="cr-empty"><h3>No linked records in this view.</h3><p>Choose another chapter to continue. If this change has no downstream links, connect its source as you develop the architecture.</p></section>';
  const s=changeItemState(project(),e,item),r=changeTarget(project(),item),previous=s.review,active=isCurrentChange(project(),e);
  return `<section class="cr-detail" aria-label="Selected affected record"><header><div><p class="cr-kicker">Chapter ${item.chapter} / ${esc(item.chapterTitle)}</p><h3>${esc(item.ref)} · ${esc(r?.title||r?.question||item.title)}</h3></div>${badge(s)}</header><p class="cr-why">${esc(item.why)}</p>${item.via?.length?`<p class="cr-via">Linked through <b>${esc(item.via.join(', '))}</b></p>`:''}<div class="cr-source">${r?`<p>${esc(r.purpose||r.description||r.response||r.context||'Open the model to inspect this record and its relationships.')}</p><a class="cr-link" data-cr-open-source href="${sourceURL(item)}">Open ${esc(item.ref)} in Chapter ${item.chapter} →</a>`:'<p>This record has been removed from the current model. Record how the obligation is now addressed.</p>'}</div>${s.status==='stale'?'<p class="cr-stale" role="status">The record or its immediate context changed after the last review. The earlier assessment stays in history; review the current design.</p>':''}
  ${active?`<form id="cr-review-form"><h4>Record your assessment</h4><label class="cr-field"><span>Review outcome</span><select name="outcome" required><option value="">Choose an outcome</option>${CHANGE_OUTCOMES.map(([v,t])=>`<option value="${v}" ${s.status!=='stale'&&previous?.outcome===v?'selected':''} ${['unchanged','updated'].includes(v)&&(!r||!e.after)?'disabled':''}>${esc(t)}</option>`).join('')}</select></label>${field('Reason and architectural implications','rationale',previous?.rationale,true,true)}<div class="cr-form-pair">${field('Reviewed by','reviewer',previous?.reviewer,false,true)}${field('Evidence or analysis reference','evidence',previous?.evidence,true,true)}</div><div class="cr-followup" ${s.status!=='stale'&&previous?.outcome==='follow-up'?'':'hidden'}>${field('Follow-up owner','owner',previous?.owner)}${field('Next action and expected result','action',previous?.action,true)}</div><label class="cr-confirm"><input type="checkbox" name="reviewed" required> I reviewed the changed source definition and the current linked record.</label><p class="cr-help">An owned follow-up stays open until reviewed again. Chapter checks and governance approval remain separate.</p><div class="cr-form-actions"><button type="submit" class="cr-button primary">Save review</button>${button('next','Next affected record →')}</div></form>`:`<div class="cr-older"><h4>A later change needs review.</h4><p>This entry and its recorded assessments remain available as history.</p>${button('latest','Open '+esc(latestChange(project(),changeSource(e)).id),'primary')}</div>`}
  ${item.reviews?.length?`<details class="cr-history"><summary>Review history · ${item.reviews.length}</summary>${[...item.reviews].reverse().map(rv=>`<article><b>${esc(CHANGE_OUTCOMES.find(([v])=>v===rv.outcome)?.[1]||rv.outcome)}</b><small>${esc(rv.reviewer)} · ${esc(new Date(rv.at).toLocaleString())}</small><p>${esc(rv.rationale)}</p><p>Evidence / analysis: ${esc(rv.evidence)}</p>${rv.action?`<p>Follow-up: ${esc(rv.owner)} — ${esc(rv.action)}</p>`:''}</article>`).join('')}</details>`:''}</section>`;
}
function render(){
  if(!host)return;const p=project(),e=event(),all=changeEvents(p),sum=e?changeSummary(p,e):{total:0,reviewed:0,open:0};choose();
  const chapters=[...new Set(e?.items.map(i=>i.chapter)||[])];
  host.innerHTML=`<header class="cr-header"><div><p class="cr-kicker">${esc(p.name)} / Change review</p><h2 id="cr-title">Keep the reasoning current.</h2></div>${button('close','×','','aria-label="Close change review"')}</header><div class="cr-error" role="alert" tabindex="-1" hidden></div><div class="cr-unsaved" role="alertdialog" aria-label="Unsaved review" hidden><p>Keep editing this review, or discard the unsaved notes?</p>${button('keep','Keep editing','primary')}${button('discard','Discard draft')}</div>${!all.length?'<div class="cr-empty"><h3>Your change history starts with the next edit.</h3><p>When an existing requirement, interface contract, or data definition changes, AIW keeps the before-and-after wording and the affected architecture records here.</p><p>Continue in the current chapter. No artificial changes are added to your project.</p>'+recoveredNotes()+'</div>':`<div class="cr-selection"><label class="cr-field"><span>Architecture change</span><select data-cr-select="event">${[...all].reverse().map(x=>`<option value="${x.id}" ${x.id===e.id?'selected':''}>${esc(x.id+' · '+changeSource(x).ref+' · '+x.title)}${isCurrentChange(p,x)?'':' · Earlier change'}</option>`).join('')}</select></label><div class="cr-progress"><b>${isCurrentChange(p,e)?sum.reviewed+' / '+sum.total:'Earlier change'}</b><span>${isCurrentChange(p,e)?'affected reviews resolved':'Preserved for reference'}</span>${isCurrentChange(p,e)&&sum.total?`<progress aria-label="Affected reviews resolved" value="${sum.reviewed}" max="${sum.total}"></progress>`:''}</div></div><nav class="cr-chapters" aria-label="Affected chapters">${button('chapter','All chapters',state.chapter==='all'?'active':'','data-cr-chapter="all" aria-pressed="'+(state.chapter==='all')+'"')}${chapters.map(c=>{const items=e.items.filter(i=>i.chapter===c),open=items.filter(i=>!changeItemState(p,e,i).complete).length;return button('chapter','Ch. '+c+` <span>${open}</span>`,state.chapter===String(c)?'active':'',`data-cr-chapter="${c}" aria-pressed="${state.chapter===String(c)}"`);}).join('')}</nav><div class="cr-body"><aside class="cr-side"><p class="cr-kicker">Affected records / ${visibleItems().length}</p><label class="cr-mobile-picker cr-field"><span>Affected record</span><select data-cr-select="item">${visibleItems().map(i=>`<option value="${esc(i.key)}" ${i.key===state.itemKey?'selected':''}>${esc(i.ref+' · '+i.title)}</option>`).join('')}</select></label><div class="cr-records" aria-label="Affected records">${visibleItems().map(i=>{const s=changeItemState(p,e,i);return `<button type="button" data-cr-action="item" data-cr-item="${esc(i.key)}" aria-current="${state.itemKey===i.key?'true':'false'}"><small>${esc(i.ref)} · Ch. ${i.chapter}</small><b>${esc(i.title)}</b>${badge(s)}</button>`;}).join('')||'<p>No records in this chapter.</p>'}</div></aside><div class="cr-reading">${recoveredNotes()}<div class="cr-change-title"><p class="cr-kicker">${esc(e.id)} · ${esc(new Date(e.at).toLocaleString())}</p><h3>${esc(changeSource(e).ref)} · ${esc(e.title)}</h3>${e.after?'':'<p class="cr-stale">The source definition was removed. Its earlier links remain in this review.</p>'}</div>${e.proposal?`<section class="cr-proposal"><p class="cr-kicker">${esc(e.proposal.alternativeId||'Coordinated proposal')} · ${e.proposal.recordCount} records</p><h4>${esc(e.proposal.name)}</h4><p>${esc(e.proposal.reason)}</p><small>Accepted by ${esc(e.proposal.reviewer)}. Linked reviews remain separate.</small></section>`:''}${changedFields(e)}${editor(e,selected())}</div></div>`}<footer class="cr-footer"><span role="status">${esc(state.message||'Review the change, inspect its links, then record the outcome.')}</span><span>Chapter ${chapter()} / ${esc(document.body.dataset.workspaceTab||'work')}</span></footer>`;
  host.querySelector('#cr-review-form')?.addEventListener('submit',save);
}
export function openChangeReview(options={}) {
  if(host?.open)return host.focus();if(document.querySelector('dialog[open]'))return;
  const p=project();if(!p)return;lastFocus=document.activeElement;const remembered=restore(),events=changeEvents(p),latest=events.at(-1);
  state={eventId:options.eventId||remembered?.eventId||latest?.id||'',itemKey:options.itemKey||remembered?.itemKey||'',chapter:options.chapter||'all',message:'',diffOpen:true};
  if(!events.some(e=>e.id===state.eventId))state.eventId=latest?.id||'';
  dirty=false;busy=false;recoveryDraft=null;host=document.createElement('dialog');host.className='cr-dialog';host.setAttribute('aria-labelledby','cr-title');document.body.append(host);render();
  host.addEventListener('cancel',e=>{e.preventDefault();close();});
  host.addEventListener('toggle',e=>{if(e.target.matches('.cr-diff'))state.diffOpen=e.target.open;},true);
  host.addEventListener('input',e=>{if(e.target.closest('#cr-review-form'))dirty=true;});
  host.addEventListener('change',e=>{
    const key=e.target.dataset.crSelect;
    if(key){const value=e.target.value;e.target.value=key==='event'?state.eventId:state.itemKey;guarded(()=>{if(key==='event'){state.eventId=value;state.chapter='all';state.itemKey='';state.diffOpen=true;}else state.itemKey=value;state.message='';render();});}
    if(e.target.name==='outcome'){dirty=true;host.querySelector('.cr-followup').hidden=e.target.value!=='follow-up';}
  });
  host.addEventListener('click',e=>{
    const source=e.target.closest('[data-cr-open-source]');if(source){e.preventDefault();const href=source.href;guarded(()=>{remember();location.assign(href);});return;}
    const b=e.target.closest('[data-cr-action]');if(!b||busy)return;
    const action=b.dataset.crAction;
    if(action==='close')return close();
    if(action==='keep'){pending=null;host.querySelector('.cr-unsaved').hidden=true;host.querySelector('textarea')?.focus();return;}
    if(action==='discard'){dirty=false;recoveryDraft=null;host.querySelector('.cr-unsaved').hidden=true;const go=pending;pending=null;go?.();return;}
    if(action==='reload')return reloadDraft();
    if(action==='recover'){const d=recoveryDraft,latest=latestChange(project(),d.source);if(!latest?.items.some(i=>i.key===d.itemKey))return;state.eventId=latest.id;state.diffOpen=true;state.itemKey=d.itemKey;state.chapter='all';recoveryDraft=null;render();fillDraft(d.fields);dirty=true;showError('Your notes are attached to the same record in the latest change. Review the new wording before confirming.');return;}
    guarded(()=>{
      if(action==='item')state.itemKey=b.dataset.crItem;
      if(action==='chapter'){state.chapter=b.dataset.crChapter;state.itemKey='';}
      if(action==='latest'){state.eventId=latestChange(project(),changeSource(event())).id;state.itemKey='';state.diffOpen=true;}
      if(action==='next'){const items=visibleItems(),current=items.findIndex(i=>i.key===state.itemKey),later=items.slice(current+1).concat(items.slice(0,current));state.itemKey=(later.find(i=>!changeItemState(project(),event(),i).complete)||later[0])?.key||state.itemKey;}
      state.message='';render();host.querySelector('.cr-detail h3')?.scrollIntoView({block:'nearest'});
    });
  });
  host.showModal();host.querySelector('[data-cr-select="event"],button')?.focus();
}
async function save(e){
  e.preventDefault();if(busy)return;const form=e.target,fd=new FormData(form),item=selected(),entry=event();if(!item)return;
  const positions=['.cr-body','.cr-reading'].map(selector=>[selector,host.querySelector(selector)?.scrollTop||0]);
  busy=true;form.querySelector('[type="submit"]').disabled=true;
  try{
    await window.aiwProjectStore.command({type:'change.review',payload:{...Object.fromEntries(fd),reviewed:fd.has('reviewed'),changeId:entry.id,itemKey:item.key,targetStamp:changeItemState(project(),entry,item).stamp}});
    dirty=false;state.message=fd.get('outcome')==='follow-up'?'Follow-up saved · '+item.ref+'. This review remains open.':'Review saved · '+item.ref+'. The underlying chapter checks remain available.';notifyProject();render();for(const [selector,top] of positions){const el=host.querySelector(selector);if(el)el.scrollTop=top;}
  }catch(error){showError(error.message,error.conflict);}finally{busy=false;host?.querySelector('[type="submit"]')?.removeAttribute('disabled');}
}
async function reloadDraft(){
  if(busy)return;busy=true;
  const form=host.querySelector('#cr-review-form'),item=selected(),entry=event();
  const draft=form?{eventId:entry.id,source:changeSource(entry),itemKey:item.key,itemRef:item.ref,fields:Object.fromEntries(new FormData(form))}:recoveryDraft;
  try{
    await window.aiwProjectStore.load();notifyProject();
    const current=changeEvents(project()).find(e=>e.id===draft?.eventId);
    const canRestore=current&&isCurrentChange(project(),current)&&current.items.some(i=>i.key===draft.itemKey);
    recoveryDraft=canRestore?null:draft;
    if(canRestore){state.eventId=draft.eventId;state.itemKey=draft.itemKey;}
    render();if(canRestore)fillDraft(draft.fields);dirty=!!draft;
    showError(canRestore?'Current model loaded. Your notes are preserved. Inspect the current design and confirm the review again.':'Current model loaded. The change has moved on; your unsaved notes are preserved below.');
  }catch(error){showError(error.message);}finally{busy=false;}
}
export function mountChangeReview(p){
  const card=document.querySelector('.project-card,.r-project');if(!card)return;
  const s=changeSummary(p),events=changeEvents(p);
  let entry=card.querySelector('.cr-entry');if(!entry){entry=document.createElement('button');entry.type='button';entry.className='cr-entry';(card.querySelector('.rail-project-tools')||card).append(entry);entry.onclick=()=>openChangeReview();}
  entry.innerHTML=`Changes${s.open?` <span>${esc(s.open)}</span>`:''}`;
  entry.setAttribute('aria-label',s.open?'Review changes, '+s.open+' open':'Review change history');entry.title=s.open?s.open+' affected records need review':events.length+' recorded changes';
  let notice=document.querySelector('.cr-notice');if(!s.open){notice?.remove();return;}
  const latest=[...events].reverse().find(e=>isCurrentChange(p,e)&&changeSummary(p,e).open)||events.at(-1),signature=latest.id+':'+s.open+':'+s.stale;
  let hidden=false;try{hidden=localStorage.getItem(noticeKey)===signature;}catch{}
  if(hidden){notice?.remove();return;}
  if(!notice){notice=document.createElement('section');notice.className='cr-notice';notice.setAttribute('aria-label','Architecture change review');document.querySelector('.r-assistant-bar,.l-assistance,.workspace-bar')?.before(notice);}
  notice.innerHTML=`<div><b>${esc(changeSource(latest).ref)} ${latest.request?'· review requested':'changed'}</b><span>${s.open} affected records need review${s.stale?' · '+s.stale+' changed since review':''}</span></div><nav aria-label="Change notice actions">${button('open','Review impact →')}${button('hide','×','cr-hide','aria-label="Hide this notice" title="Hide notice. Review changes stays available in the project menu."')}</nav>`;
  notice.querySelector('[data-cr-action="open"]').onclick=()=>openChangeReview({eventId:latest.id,chapter:latest.items.some(i=>i.chapter===chapter())?String(chapter()):'all'});
  notice.querySelector('[data-cr-action="hide"]').onclick=()=>{try{localStorage.setItem(noticeKey,signature);}catch{}notice.remove();entry.focus();};
}
if(typeof window!=='undefined')window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
