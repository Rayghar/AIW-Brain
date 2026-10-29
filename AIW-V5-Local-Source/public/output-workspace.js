// The Output kit. rc41 (W2): the four tabs of a chapter are one layout — the documents are the chapter strip's items
// (chapter-strip.js; each with the meter of the records it reads), the hero carries the one state line
// (work-records.js kindsState over the chapter's records) and one filled primary (Review checks), the chapter's handoff
// cards follow (work-frame.js), then the document. The next task is the shell footer's (the readiness model's), so
// the "Next review step" line is retired; the readiness strip's own phrasing is retired for the state line.
import {OUTPUT_DOCUMENTS,outputStage,outputRecords,recordListHTML,MADR_DOWNLOAD_TEXT} from './output-documents.js';
import {sddContributionHTML,chapterChecks,checkUnits,counted} from './readiness-model.js';
import {projectURL} from './project-context.js';
import {esc} from './html-escape.js';
import {timeHTML} from './format.js';
import {chapterOfRecord} from './chapter-records.js';
import {architectureIntelligence} from './architecture-intelligence.js';
import {intelligenceActionHTML,intelligenceWhyHTML,refreshIntelligenceSlot} from './chapter-insight.js';
import {chapterStripHTML,chapterStateHTML,stripReading} from './chapter-strip.js';
import {chapterRecordsState,chapterHandoffHTML,recordState} from './work-frame.js';
import {kindsState} from './work-records.js';

const views=new Map(),states=new Map();
function subject(V){
 const doc=V.docs.find(d=>d.id===V.state.selected),params=typeof location==='undefined'?null:new URLSearchParams(location.search),selected=V.options.selectedId||['artefact','driver','decision','object'].map(k=>params?.get(k)).find(Boolean),id=doc?.objectId||(outputRecords(V.p,V.chapter).some(r=>r.id===selected)?selected:null)||(V.chapter===11&&doc?.id==='sdd'?'SDD':null);
 return id?{chapter:V.chapter,id,tab:'output'}:null;
}
export function outputIntelligenceSubject(p){
 const root=typeof document==='undefined'?null:document.querySelector('[data-output-workspace]'),V=root&&views.get(root.dataset.outputWorkspace);
 return V?.p.id===p?.id?subject(V):null;
}
function knowledgeHTML(V){
 const at=subject(V),reading=at?architectureIntelligence(V.p,at):null,i=reading?.primary;
 return i?`<details data-intelligence-id="${esc(i.id)}"><summary>Architecture knowledge for ${esc(reading.subject.title)}</summary><p><b>${esc(i.question||i.title)}</b></p>${intelligenceWhyHTML(reading,i,{projectId:V.p.id})}${intelligenceActionHTML(reading,i,i.actions[0],{projectId:V.p.id})}<p class="output-receipts">A changed source or design basis needs rechecking. These considerations do not change the saved document or its approval status.</p></details>`:'';
}
export function refreshOutputIntelligence(p){
 const root=typeof document==='undefined'?null:document.querySelector('[data-output-workspace]'),V=root&&views.get(root.dataset.outputWorkspace);if(!V||V.p.id!==p?.id)return;
 refreshIntelligenceSlot(root.querySelector('[data-output-intelligence]'),knowledgeHTML(V));
}
const FORMATS={md:'Markdown',html:'HTML',json:'JSON',zip:'ZIP',openapi:'OpenAPI',asyncapi:'AsyncAPI',schemas:'JSON Schema',delivery:'JSON'};
function artifacts(p,chapter,S){
  const own=S.now.flatMap(d=>{if(!d.perRecord)return [d];const schema=OUTPUT_DOCUMENTS.find(x=>x.id===d.id);return outputRecords(p,chapter).filter(r=>r.type===schema.recordType).map(r=>({...d,id:d.id+':'+r.id,objectId:r.id,title:r.ref+' · '+r.title,kind:'Component specification',links:d.formats.map(format=>({format,path:schema.recordPath(format,r.id)})),preview:schema.recordPath('html',r.id)+'&view=1'}));});
  if(chapter===11&&!own.some(d=>d.id==='sdd'))own.unshift({id:'sdd',title:'Working SDD · empty template',preview:'/api/export?chapter=11&format=html&view=1',links:[],template:true});
  if(chapter<11)own.push({id:'sdd-contribution',title:'This chapter in the SDD',kind:'SDD review registers',preview:'/api/export?chapter=11&annex=registers&format=html&view=1',find:'Chapter '+chapter+' —',links:[],fuller:'The SDD review registers annex, opened at this chapter. The canonical records remain editable in Work.'});
  if(chapter===11)own.push({id:'frozen',title:'Frozen baseline',kind:'Captured architecture edition',links:[]});
  return [...own,...S.later.filter(d=>d.here&&!(chapter===11&&d.id==='sdd')).map(d=>({...d,unavailable:true,links:[]}))];
}
// The hero's actions: the one filled primary (Review checks, the chapter's Validate), then the two panels' entries.
function heroActions(V){
  const {p,chapter}=V,records=outputRecords(p,chapter).length;
  return `<div class="output-actions"><a class="btn primary" href="${esc(projectURL('/?chapter='+chapter+'&tab=validate'))}">Review checks</a><button type="button" class="btn" data-output-panel="sources" aria-controls="output-sources-${chapter}" aria-expanded="false">Inspect sources · ${records}</button><button type="button" class="btn" data-output-panel="handoff" aria-controls="output-handoff-${chapter}" aria-expanded="false">${chapter===11?'Baseline & delivery workflow':'Review handoff'}</button></div>`;
}
// The documents as the strip's items: each with the meter of the records it reads — the chapter's records for a
// register or the chapter's part of the SDD, the frozen baselines for the captured edition — and the words for what it
// is; a document that waits for records says so. rc41 (close): a document made once per record (Chapter 5's component
// specification) is ONE item, its meter the records it is made for; the record is chosen inside the document
// (recordPickHTML), so a chapter with 180 components still has a strip of a few items and the primary stays near.
const DOC_WORDS={register:'Chapter register',document:'Working document'};
const groupOf=id=>String(id).split(':')[0];
const recordDocs=(V,group)=>V.docs.filter(d=>d.objectId&&groupOf(d.id)===group);
function documentItems(V,state){
  const {p,chapter}=V,seen=new Set(),items=[];
  for(const d of V.docs){
    if(d.objectId){
      const group=groupOf(d.id);if(seen.has(group))continue;seen.add(group);
      const schema=OUTPUT_DOCUMENTS.find(x=>x.id===group);
      let st=null;try{st=kindsState(p,[schema?.recordType].filter(Boolean),checksFor(p,chapter));}catch{st=null;}
      items.push({id:group,title:(d.kind||'Record document')+'s',purpose:'One per '+(schema?.recordType||'record')+', chosen below',...(st?stripReading(st):{}),current:groupOf(V.state.selected)===group,attrs:'data-output-document="'+esc(group)+'"'});
      continue;
    }
    let st=null,empty='nothing recorded yet';
    if(d.unavailable){st=null;empty='records needed';}
    else if(d.id==='frozen'){try{st=kindsState(p,['baseline']);}catch{st=null;}empty='no baseline frozen yet';}
    else if(!d.template){st=state;}
    const purpose=d.unavailable?'Records needed':d.id==='frozen'?'Immutable edition':d.template?'Empty template':DOC_WORDS[d.kind]||d.kind||'Working document';
    const reading=st?stripReading(st,empty):d.unavailable?{state:'empty',counts:empty}:{};
    items.push({id:d.id,title:d.title,purpose,...reading,current:V.state.selected===d.id,attrs:'data-output-document="'+esc(d.id)+'"'});
  }
  return items;
}
// The record a per-record document is made for, chosen inside the document: every record of its kind, in the chapter's
// order, the chosen one selected; the choice reads the record's own meter beside it.
function recordPickHTML(V,d){
  const group=groupOf(d.id),docs=recordDocs(V,group);if(docs.length<1)return '';
  let st=null;try{st=recordState(V.p,V.chapter,d.objectId);}catch{st=null;}
  const reading=st?stripReading(st):null;
  return `<div class="output-record-pick"><label><span>${esc(d.kind||'Record')}</span><select data-output-record="${esc(group)}">${docs.map(x=>`<option value="${esc(x.id)}"${x.id===d.id?' selected':''}>${esc(x.title)}</option>`).join('')}</select></label><small>${esc(docs.length.toLocaleString('en-GB')+' '+(docs.length===1?'record':'records'))}${reading?.counts?' · this one '+esc(reading.counts):''}</small></div>`;
}
// The checks' counts beside the one state line, as Validate's head says them (rc41 close: Output keeps the SDD
// readiness — the findings to fix and to confirm, in the chapter's units, and the passages passing).
const checksFor=(p,chapter)=>{try{return chapterChecks(p,chapter);}catch{return null;}};
function readinessHTML(p,chapter){
  const C=checksFor(p,chapter);if(!C)return '';const U=checkUnits(chapter);
  return `<p class="output-readiness" data-output-readiness><span data-output-count="fix">${esc(counted(C.toFix,U.fix))}</span> · <span data-output-count="confirm">${esc(counted(C.toConfirm,U.confirm))}</span> · <span data-output-count="pass">${C.passing}/${C.total} SDD passages passing</span></p>`;
}
function relatedHTML(S){
  return `<details class="output-secondary"><summary>Related documents & backup</summary>${relatedDocumentsHTML(S)}<a class="btn" href="${esc(projectURL(S.project.path))}" download data-out-download="Project data (JSON)">Project data (JSON)</a></details>`;
}
function relatedDocumentsHTML(S){
  return S.later.filter(d=>!d.here).map(d=>`<p data-output-related="${esc(d.id)}"><a href="${esc(projectURL(d.url))}">${esc(d.title)}</a><small>${d.available?'Available now':'Not yet available'} · Chapter ${d.chapter}</small><small class="output-prerequisite">${esc(d.needs)}</small></p>`).join('');
}
export function outputWorkspaceHTML(p,chapter,options={}){
  const key=p.id+':'+chapter,S=outputStage(p,chapter),docs=artifacts(p,chapter,S),state=states.get(key)||{selected:docs[0]?.id,edition:'architecture',audience:'all'};
  if(!docs.some(d=>d.id===state.selected))state.selected=docs[0]?.id;states.set(key,state);
  views.clear();const V={p,chapter,options,S,docs,state};views.set(key,V);
  const review=S.review;
  let recordsState=null;try{recordsState=chapterRecordsState(p,chapter);}catch{recordsState=null;}
  let handoff='';try{handoff=chapterHandoffHTML(chapter,p,p);}catch{handoff='';}
  return `<section class="output-workspace out-stage" data-output-workspace="${esc(key)}" data-chapter="${chapter}" data-chapter-accent="${chapter}" aria-label="Chapter ${chapter} output">${chapterStripHTML({tab:'output',chapter,label:'Choose a document',items:documentItems(V,recordsState),cls:'output-artifacts'})}<header class="output-header"><div><h2>${esc(options.title||'Review and share the chapter output')}</h2><p>${esc(options.summary||'Preview the saved design, inspect its sources, then download or review the handoff.')}</p>${chapterStateHTML(recordsState,{chapter})}${readinessHTML(p,chapter)}</div>${heroActions(V)}</header>${handoff}<div class="output-browser"><div class="output-document" data-output-document-view>${documentHTML(V)}</div></div>${relatedHTML(S)}<div class="output-support"><details class="output-source-panel" id="output-sources-${chapter}"><summary>Sources and readiness <span>${outputRecords(p,chapter).length} saved records · SDD passages and check history</span></summary>${options.context||''}${options.records||recordListHTML(p,chapter,{documents:false})}${options.evidence||''}<div data-output-intelligence>${knowledgeHTML(V)}</div><details class="output-passages"><summary>Inspect SDD passages</summary>${sddContributionHTML(p,chapter,{where:'output'})}</details><p class="output-receipts">${review?.at?'Last recorded check: '+timeHTML(review.at)+'. ':''}${S.handoffAt?'Last recorded handoff: '+timeHTML(S.handoffAt)+'. Historical receipts do not establish current readiness.':''}</p>${options.readiness||''}</details><details class="output-handoff-panel" id="output-handoff-${chapter}"><summary>${chapter===11?'Baseline, governance and delivery':'Review the handoff'}<span>${chapter===11?'Keep the edition, approval evidence and delivery status distinct':'What carries forward and what remains open'}</span></summary>${options.baselineWorkflow||''}${options.handoff||''}</details></div><p class="out-status output-download-status" role="status" aria-live="polite" hidden></p><p class="output-authority">Files read the saved design. Working snapshots, recorded checks, and approval evidence remain distinct.</p></section>`;
}
function previewURL(V,d){if(d.id==='frozen')return V.options.baselinePreview||null;const path=d.preview;if(!path)return null;return projectURL(path+(d.id==='sdd'?'&edition='+V.state.edition+'&audience='+V.state.audience:''));}
function documentHTML(V){
  const {chapter,options:o,state:s}=V,d=V.docs.find(d=>d.id===s.selected);if(!d)return '<p>No document is available yet.</p>';
  const url=previewURL(V,d),special=d.id==='sdd'&&o.editionControls,formats=special?'':(d.links||[]).map(l=>`<a class="btn" href="${esc(projectURL(l.path))}" download data-out-download="${esc(d.title+' ('+(FORMATS[l.format]||l.format)+')')}">${esc(FORMATS[l.format]||l.format)}</a>`).join('')+(d.pack==='madr'?`<button type="button" class="btn" data-vx-madr="zip">${MADR_DOWNLOAD_TEXT}</button>`:'');
  const toolbar=(d.objectId?recordPickHTML(V,d):'')+`<header class="output-document-header"><div><small>${d.id==='frozen'?'Captured edition':d.template?'Empty template':'Saved design · working snapshot'}</small><h3>${esc(d.title)}</h3></div>${url?`<a class="btn" data-output-open href="${esc(url)}" target="_blank" rel="noopener">Open preview in new tab</a>`:''}</header>${special?`<div class="output-edition-controls">${o.editionControls}</div>`:formats?`<div class="output-formats" aria-label="Download selected document"><span>Download</span>${formats}</div>`:''}`;
  const empty=d.unavailable?`<div class="output-unavailable"><h4>Define the source records first</h4><p>${esc(d.needs)}</p><a class="btn" href="${esc(projectURL('/?chapter='+chapter+'&tab=work'))}">Open Chapter ${chapter} Work</a></div>`:d.id==='frozen'&&!url?`<div class="output-unavailable"><h4>No frozen baseline selected</h4><p>Review the working SDD, then prepare a named baseline in the workflow below.</p></div>`:`<div class="output-file-reading"><h4>${d.pack?'Review the derived pack':'Structured exchange file'}</h4><p>${esc(d.note||d.fuller||'This artifact is a structured exchange format. Its download is generated from the current saved definitions.')}</p><p>${d.id==='contracts'?'OpenAPI describes recorded request operations; AsyncAPI describes recorded event contracts. Availability follows each contract’s declared kind and address.':d.id==='schemas'?'Contains recorded data schemas without invented paths or channels.':d.id==='delivery'?'Delivery exchange reads application components, interface contracts and runtime plans. It does not establish implementation or acceptance.':''}</p><a href="${esc(projectURL('/?chapter='+chapter+'&tab=work'))}">Review the canonical definitions in Work</a></div>`;
  return toolbar+(d.formatGap?`<p class="output-document-note">${esc(d.formatGap)}</p>`:'')+(d.fuller&&url?`<details class="output-document-note"><summary>What would make this document fuller?</summary><p>${esc(d.fuller)}</p></details>`:'')+(d.id==='frozen'?o.baselineControls||'':'')+(url?`<div class="output-preview-shell"><p class="output-preview-status" role="status">Loading the generated document…</p><iframe class="output-inline-preview" src="${esc(url)}" title="${esc(d.title)} · generated preview"${d.find?` data-output-find="${esc(d.find)}"`:''}></iframe></div>`:empty);
}
export function mountOutputWorkspace(host){
  const root=host.querySelector('[data-output-workspace]');if(!root||root.dataset.bound)return;root.dataset.bound='1';
  const current=()=>views.get(root.dataset.outputWorkspace),bindFrame=()=>{
    const frame=root.querySelector('iframe.output-inline-preview');if(!frame)return;
    const finish=()=>{
      // Rendering/import can settle after a cached frame load. Also reject a late
      // load from the previous edition when another selection is already pending.
      let doc;try{doc=frame.contentDocument;if(!doc||doc.readyState!=='complete'||doc.URL==='about:blank'||new URL(doc.URL).href!==new URL(frame.src,location.href).href)return;}catch{return;}
      const note=root.querySelector('.output-preview-status');if(note)note.hidden=true;
      const title=frame.dataset.outputFind;if(title)[...doc.querySelectorAll('h1,h2')].find(h=>h.textContent.trim().startsWith(title))?.scrollIntoView({block:'start'});
    };
    frame.addEventListener('load',finish);finish();
  };
  const restoreOptions=()=>{const V=current(),f=root.querySelector('form.rv-export-form');if(!V||!f)return;for(const k of ['edition','audience'])if(f.elements[k])f.elements[k].value=V.state[k];};
  // A per-record document's item opens the record chosen last (or the first); the record itself is chosen in the document.
  const resolve=(V,id)=>V.docs.some(d=>d.id===id)?id:(recordDocs(V,id).find(d=>d.id===V.state.records?.[id])||recordDocs(V,id)[0])?.id||null;
  const choose=requested=>{const V=current(),id=V&&resolve(V,requested);if(!id)return;V.state.selected=id;if(V.docs.find(d=>d.id===id)?.objectId)V.state.records={...V.state.records,[groupOf(id)]:id};root.querySelector('[data-output-document-view]').innerHTML=documentHTML(V);const pick=root.querySelector('select[data-output-record]');if(pick)pick.value=id;root.querySelectorAll('[data-output-document]').forEach(x=>{const on=x.dataset.outputDocument===groupOf(id);x.setAttribute('aria-pressed',String(on));if(on)x.setAttribute('aria-current','true');else x.removeAttribute('aria-current');const item=x.closest('.chapter-strip-item');if(item){if(on)item.setAttribute('data-chapter-strip-current','true');else item.removeAttribute('data-chapter-strip-current');}});refreshOutputIntelligence(V.p);restoreOptions();bindFrame();};
  root.addEventListener('click',e=>{
    const inspect=e.target.closest('[data-out-inspect]');
    if(inspect){
      const id=inspect.dataset.outInspect,chapter=chapterOfRecord(current()?.p,id);
      if(chapter){e.preventDefault();document.dispatchEvent(new CustomEvent('aiw:inspect-record',{detail:{id,chapter}}));}
      return;
    }
    const panel=e.target.closest('[data-output-panel]');
    if(panel){
      const details=root.querySelector(panel.dataset.outputPanel==='sources'?'.output-source-panel':'.output-handoff-panel');
      if(details){details.open=true;panel.setAttribute('aria-expanded','true');details.scrollIntoView?.({block:'nearest',behavior:'smooth'});details.querySelector('summary')?.focus({preventScroll:true});}
      return;
    }
    const b=e.target.closest('[data-output-document]');if(b)choose(b.dataset.outputDocument);
  });
  root.addEventListener('toggle',e=>{
    if(!e.target.matches('.output-source-panel,.output-handoff-panel'))return;
    root.querySelectorAll('[data-output-panel]').forEach(b=>{if(b.getAttribute('aria-controls')===e.target.id)b.setAttribute('aria-expanded',String(e.target.open));});
  },true);
  root.addEventListener('change',e=>{if(e.target.matches?.('select[data-output-record]')){choose(e.target.value);root.querySelector('select[data-output-record]')?.focus({preventScroll:true});}});
  root.addEventListener('change',e=>{const V=current();if(!V||!e.target.closest('form.rv-export-form')||!['edition','audience'].includes(e.target.name))return;V.state[e.target.name]=e.target.value;const d=V.docs.find(d=>d.id===V.state.selected),url=previewURL(V,d),frame=root.querySelector('iframe.output-inline-preview');if(frame){const note=root.querySelector('.output-preview-status');note.hidden=false;frame.src=url;}const link=root.querySelector('[data-output-open]');if(link)link.href=url;});
  restoreOptions();bindFrame();
}
