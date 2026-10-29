import {esc} from './html-escape.js';
import {findRecord,recordProvenance} from './provenance.js';
import {chapterChecks} from './readiness-model.js';
import {chapterOfRecord} from './chapter-records.js';
import {projectURL} from './project-context.js';
// rc39 (PLAN §4.3.2): the design basis of a Chapter 5, 6 or 7 record, read from the one projection (design-questions.js).
import {designQuestions} from './design-questions.js';

const url=(chapter,id,tab='work')=>projectURL('/?chapter='+chapter+'&tab='+tab+'&object='+encodeURIComponent(id));
const disclosure=(key,title,html,open=false)=>'<details data-card-section="'+esc(key)+'"'+(open?' open':'')+'><summary>'+esc(title)+'</summary><div class="record-card-section">'+html+'</div></details>';
const text=html=>String(html||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&gt;/g,'>').replace(/&lt;/g,'<');
function fragment(html){if(!globalThis.document?.createElement)return null;const template=document.createElement('template');template.innerHTML=html;return template;}
function dockBody(html){const template=fragment(html);return template?.content.querySelector('.t-dock-body')?.innerHTML||html.match(/<div class="t-dock-body">([\s\S]*?)<\/div>(?=(?:<p class="record-provenance"|<section class="lifecycle"|$))/)?.[1]||html;}

// The Design basis (rc39): the drivers reaching the record (ref, title, target, priority, "Target unconfirmed" when so),
// then the design questions as rows: the state chip, the title, the drivers that opened it, what already answers it with
// its chapter and state, the story once decided, the caution behind "?", "to confirm: <facts>" when the model does not
// say, and one action per open or draft question: Decide → Co-design (data-action="design-decide", handled by the
// Companion, brain-context-ui.js: the comparison for this record and the question's method topic) when a method decides
// it, or Open → Chapter N when another chapter's own record decides it. Every count is the projection's.
const STATE_WORDS={open:'Open',draft:'Draft',decided:'Decided'},STATE_CLASS={open:'warn',draft:'draft',decided:'pass'};
const stateChip=s=>'<span class="chip design-state '+STATE_CLASS[s]+'" data-design-state="'+esc(s)+'">'+esc(STATE_WORDS[s]||s)+'</span>';
export function designBasisHTML(p,chapter,id){
  if(![5,6,7].includes(Number(chapter)))return '';
  const dq=designQuestions(p,id);if(!dq)return '';
  const drivers=dq.drivers.map(d=>'<li data-design-driver="'+esc(d.id)+'"><a href="'+esc(url(2,d.id))+'">'+esc(d.id)+'</a> · '+esc(d.title)+'<small>'+esc(d.target||'No target stated')+(d.priority?' · '+esc(d.priority):'')+'</small>'+(d.kind==='quality'&&!d.confirmed?'<span class="chip reference">Target unconfirmed</span>':'')+'</li>').join('');
  const byId=new Map(dq.drivers.map(d=>[d.id,d]));
  const because=q=>q.because.map(x=>'<abbr title="'+esc(byId.get(x)?.title||x)+'">'+esc(x)+'</abbr>').join(', ');
  const answer=a=>'<li>'+esc(a.ref)+' → '+esc(a.title)+', Chapter '+esc(a.chapter)+' · '+esc(a.state)+'</li>';
  const action=q=>q.state==='decided'?'':q.decide?.topic?'<button type="button" class="btn" data-action="design-decide" data-question="'+esc(q.id)+'" data-record="'+esc(id)+'" data-topic="'+esc(q.decide.topic)+'" data-driver="'+esc(q.because[0]||'')+'">Decide → Co-design</button>':q.decide?.chapter?'<a class="btn" data-design-open="'+esc(q.id)+'" href="'+esc(url(q.decide.chapter,id))+'">Open → Chapter '+esc(q.decide.chapter)+'</a>':'';
  const rows=dq.questions.map(q=>'<li class="design-q" data-design-question="'+esc(q.id)+'" data-design-state="'+esc(q.state)+'">'+stateChip(q.state)+'<div><b>'+esc(q.title)+'</b>'+(q.toConfirm.length?'<small class="design-confirm">to confirm: '+esc(q.toConfirm.join('; '))+'</small>':'')+'<small>Opened by '+because(q)+'</small>'+(q.answers.length?'<ul class="design-answers">'+q.answers.map(answer).join('')+'</ul>':'')+(q.story?'<p class="design-story">'+esc(q.story)+'</p>':'')+'<details class="design-caution"><summary aria-label="Why this question matters">?</summary><p>'+esc(q.caution)+'</p></details></div>'+action(q)+'</li>').join('');
  const c=dq.counts,words=['open','draft','decided'].filter(k=>c[k]).map(k=>c[k]+' '+k).join(' · ');
  const body='<p class="design-basis-lead">'+(dq.drivers.length?dq.drivers.length+(dq.drivers.length===1?' driver reaches':' drivers reach')+' this record.':'No architectural driver reaches this record yet.')+'</p>'+(drivers?'<ul class="design-drivers">'+drivers+'</ul>':'')+(rows?'<ul class="design-questions">'+rows+'</ul>':'<p>No design question opens from its drivers.</p>');
  return {html:disclosure('design-basis','Design basis · '+(dq.questions.length?words:'no design question yet'),body,c.open>0),open:c.open>0};
}
// Lenses become labelled disclosures without changing the stored lens or any records.
export function renderStudioRecordCard(p,chapter,id,render,graph,getLens=null,setLens=null){
  const html=render();let sections=[];
  if(getLens&&setLens&&id&&id!=='project'){
    const nav=html.match(/<nav class="t-dock-tabs"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
    const tabs=[...nav.matchAll(/<button[^>]*data-[\w]+-lens="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
    const held=getLens();
    try{sections=tabs.map(([,key,label])=>{setLens(key);return {key,title:text(label),body:dockBody(render())};});}finally{setLens(held);}
  }
  return recordCardHTML(p,chapter,id,html,graph,sections);
}
// Remove the native presentation shell while retaining its fields and commands.
// This is composition at render time, rather than CSS that hides a second identity.
export function recordDetailContent(html,title){
  const template=fragment(html);
  if(!template)return String(html).replace(/<section class="lifecycle"[\s\S]*?<\/section>/g,'').replace(/<p class="record-provenance"[\s\S]*?<\/p>/g,'');
  const root=template.content;
  root.querySelectorAll('.lifecycle,.record-provenance,.r-inspector-head,.inspector-top,.t-dock-head,.t-dock-tabs').forEach(el=>el.remove());
  root.querySelectorAll('.r-inspector-body,.inspector-body,.t-dock-body').forEach(el=>el.replaceWith(...el.childNodes));
  for(const el of [...root.children]){
    if(/^H[23]$/.test(el.tagName)&&el.textContent.trim()===String(title).trim())el.remove();
    else if(el.tagName==='H3'&&el.textContent.trim()==='Design question'&&el.nextElementSibling?.textContent.trim()===String(title).trim()){el.nextElementSibling.remove();el.remove();}
  }
  return template.innerHTML;
}
export function recordCardHTML(p,chapter,id,html,graph={nodes:[],edges:[]},sections=[]){
  if(!id||id==='project'){
    const referenceNote=chapter===1?(html.match(/<div class="r-reference-note r-note-once"[^>]*>[\s\S]*?<\/div>/)?.[0]||''):'';
    return '<section class="record-guidance"><p>Select a record to inspect its details, sources and relationships.</p>'+referenceNote+'</section>';
  }
  const source=chapterOfRecord(p,id)||chapter,found=findRecord(p,source,id),r=found?.record,n=graph.nodes?.find(x=>x.id===id);
  if(!r)return html; // Unsaved proposals keep their specialised, explicitly labelled preview.
  const provenance=recordProvenance(p,r,source),title=r.title||r.question||n?.title||r.ref||id;
  const status=r.status||r.state||(r.confirmed?'Confirmed':'Draft'),edges=(graph.edges||[]).filter(e=>e.from===id||e.to===id);
  const related=[...new Set(edges.map(e=>e.from===id?e.to:e.from))],link=other=>{const node=graph.nodes?.find(x=>x.id===other),ch=chapterOfRecord(p,other)||chapter;return '<a href="'+esc(url(ch,other))+'">'+esc([node?.ref,node?.title||other].filter(Boolean).join(' · '))+'</a>';};
  const passage=chapterChecks(p,source)?.passages.find(x=>x.id===id),findings=[...(passage?.fix||[]),...(passage?.confirm||[])];
  const native=fragment(html),lifecycle=native?.content.querySelector('.lifecycle')?.outerHTML||html.match(/<section class="lifecycle"[\s\S]*?<\/section>/)?.[0]||'';
  const actions=native?.content.querySelector('.t-dock-actions')?.innerHTML||html.match(/<div class="t-dock-actions">([\s\S]*?)<\/div>/)?.[1]||'';
  const basis=designBasisHTML(p,source,id);
  let details=(basis?basis.html:'')+(sections.length?sections.map((s,i)=>disclosure(s.key,s.title,recordDetailContent(s.body,title),i===0)).join(''):'<div class="record-card-section record-card-main">'+recordDetailContent(html,title)+'</div>');
  if(findings.length)details+=disclosure('findings','Open findings · '+findings.length,'<ul>'+findings.map(f=>'<li>'+esc(f.title)+'</li>').join('')+'</ul><a class="btn" href="'+esc(url(source,id,'validate'))+'">Review findings</a>');
  details+=disclosure('connections','Connections & picture · '+related.length,'<p>Trace this record’s linked design. Open the picture to explore it on Model.</p><div data-record-picture-slot></div>'+(related.length?'<ul>'+related.map(x=>'<li>'+link(x)+'</li>').join('')+'</ul>':'<p>No saved relationship for this record.</p>')+'<a class="btn" href="'+esc(url(source,id,'model'))+'">Open on Model</a>');
  const history=(r.history||[]).slice(-12).reverse().map(h=>'<li>'+esc(h.event||h.action||'Revision '+(h.revision||''))+(h.at?' · '+esc(new Date(h.at).toLocaleDateString('en-GB')):'')+'</li>').join('');
  const incoming=edges.filter(e=>e.to===id).map(e=>'<li>'+link(e.from)+' · '+esc(e.label||'informs')+'</li>').join('');
  details+=disclosure('history','Sources, reasoning & history','<p>'+esc(provenance.label)+'</p>'+(r.source?'<p><b>Source</b> '+esc(r.source)+'</p>':'')+(r.rationale?'<h3>Rationale</h3><p>'+esc(r.rationale)+'</p>':'')+(incoming?'<h3>Incoming relationships</h3><ul>'+incoming+'</ul>':'')+(history?'<h3>Revisions</h3><ol>'+history+'</ol>':'<p>No record-specific revision entry yet. Saved changes remain in project history.</p>'));
  if(lifecycle)details+=disclosure('retire','Record lifecycle',lifecycle);
  return '<article class="record-card" data-record-card="'+esc(id)+'"><header class="record-card-head"><span class="eyebrow">'+esc(r.ref||n?.ref||id)+' · Chapter '+source+'</span><h2>'+esc(title)+'</h2><div class="record-card-state"><span class="chip">'+esc(status)+'</span><span class="chip '+(provenance.reviewed?'pass':'draft')+'">'+esc(provenance.label)+'</span></div>'+(actions?'<div class="record-card-actions">'+actions+'</div>':'')+'</header>'+details+'</article>';
}
