// DOM behavior and saved-model presentation; this does not evaluate an LLM or grant approval.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createProject} from './shared/projects-domain.js';

const w = new Window({url:'https://aiw.test/?project=header-fixture&chapter=1&tab=model',width:1440,height:1000});
for (const key of ['window','document','localStorage','location','CustomEvent','Event','KeyboardEvent','PointerEvent']) Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true});
let calls=0;
globalThis.fetch=()=>{calls++;throw Error('The header must not disclose or generate');};
const {mountChapterHeader,chapterHeaderHTML}=await import('./public/chapter-header.js');
const {chapterInsight}=await import('./public/chapter-insight.js');
const {adoptProject}=await import('./public/project-context.js');
const {COACH_STEPS}=await import('./public/shell-ux.js');
const blank=createProject({name:'Synthetic header fixture',template:'blank'},'header-fixture');
window.aiwProjectStore={value:{document:blank}};
adoptProject(blank.id);
const shell=()=>{document.body.innerHTML='<section class="heading-row"><div><div class="breadcrumb">Fixture / Chapter</div><h1>Architecture chapter</h1><p class="subtitle">A saved-model workspace</p></div><details class="progress-disclosure"><summary>Old count</summary><div id="progress-percent">Old</div></details></section><div class="workspace-bar"><nav role="tablist"><button data-tab="work">Work</button><button data-tab="model">Model</button><button data-tab="validate">Validate</button><button data-tab="output">Output</button></nav><div class="journey-status">Old repeated next</div><button id="outside">Other tool</button></div><textarea id="pending">Keep the unsent question</textarea>';};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
for(let chapter=1;chapter<=11;chapter++){
  shell();mountChapterHeader(blank,{chapter,id:null,scope:''},'model');
  const insight=chapterInsight(blank,chapter),meter=document.querySelector('[role="progressbar"]');
  assert.equal(document.querySelector('[data-chapter-header]').dataset.chapterHeader,String(chapter));
  assert.equal(Number(meter.getAttribute('aria-valuenow')),insight.progress.done);
  assert.equal(Number(meter.getAttribute('aria-valuemax')),insight.progress.total);
  assert.equal(document.querySelectorAll('#progress-percent').length,1,'Legacy progress ID remains unique');
  assert.equal(document.querySelectorAll('[data-progress-chapter]').length,11);
  assert.equal(document.querySelectorAll('[role="tablist"] button').length,4);
  assert.equal(document.querySelector('.journey-status'),null,'The repeated old count/next route is removed');
  assert.equal(document.querySelector('.chapter-insights').classList.contains('has-attention'),false,'A blank project receives quiet orientation');
  assert.equal(document.querySelector('[data-chapter-next]').getAttribute('href'),insight.lead.target.url);
  assert.match(document.querySelector('[data-chapter-insights]').textContent,/Based on saved project checks/);
  assert.doesNotMatch(document.querySelector('#progress-count').textContent,/illustrative/);
  for(const a of document.querySelectorAll('[data-chapter-header] a')){
    const url=new URL(a.href);assert.equal(url.origin,'https://aiw.test');assert.equal(url.searchParams.get('project'),blank.id);assert(a.hasAttribute('data-scope-link'),'Header target scope is owned by the selector');
  }
  assert(document.querySelector(COACH_STEPS[2].target).matches('[data-chapter-insights-toggle]'),'Coach highlights the visible control');
}

shell();mountChapterHeader(blank,{chapter:4,id:null},'model');
let details=document.querySelector('.chapter-insights'),toggle=details.querySelector('summary');
toggle.click();await tick();assert(details.open);assert.equal(toggle.getAttribute('aria-expanded'),'true');
document.querySelector('[data-header-focus="lead"]').focus();
document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
assert.equal(details.open,false);assert.equal(document.activeElement,toggle,'Escape returns focus to the insights control');
toggle.click();await tick();document.querySelector('#outside').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));assert.equal(details.open,false,'An outside pointer closes the disclosure');
toggle.click();await tick();document.querySelector('[data-chapter-insights-close]').click();assert.equal(details.open,false);assert.equal(document.activeElement,toggle);

// Background project changes preserve an unsent composer and its caret. The header is
// updated in place without replacing the rest of the workspace.
const question=document.querySelector('#pending');question.focus();question.setSelectionRange(5,10);
const recorded=createProject({name:'Synthetic recorded fixture',template:'bank-payment'},blank.id);
const before=JSON.stringify(recorded);window.aiwProjectStore.value.document=recorded;
mountChapterHeader(recorded,{chapter:4,id:null},'model');
assert.equal(document.activeElement,question);assert.equal(question.value,'Keep the unsent question');assert.deepEqual([question.selectionStart,question.selectionEnd],[5,10]);
assert.match(document.querySelector('#progress-count').textContent,/includes illustrative records/);
assert.match(document.querySelector('[data-chapter-progress]').textContent,/illustrative/,'Illustrative material remains visible without opening insights');
assert.equal(JSON.stringify(recorded),before,'Rendering cannot change the canonical project');

details=document.querySelector('.chapter-insights');toggle=details.querySelector('summary');toggle.click();await tick();
document.querySelector('[data-project-progress]').open=true;
document.querySelector('[data-progress-chapter="4"]').open=true;
document.querySelector('[data-header-focus="chapter-4"]').focus();
document.querySelector('[data-chapter-insights]').scrollTop=125;
window.aiwProjectStore.value.document=blank;
mountChapterHeader(blank,{chapter:4,id:null},'model');
details=document.querySelector('.chapter-insights');
assert(details.open);assert(document.querySelector('[data-project-progress]').open);assert(document.querySelector('[data-progress-chapter="4"]').open);
assert.equal(document.activeElement.dataset.headerFocus,'chapter-4');assert.equal(document.querySelector('[data-chapter-insights]').scrollTop,125);
assert.match(document.querySelector('#progress-count').textContent,/to re-check/,'Previously met milestones remain explicit after a model change');
assert.match(document.querySelector('[data-chapter-progress]').textContent,/\d+ recheck/,'The collapsed caption keeps the recheck status visible');
assert(parseFloat(document.querySelector('#progress-recheck').style.width)>0);
mountChapterHeader(blank,{chapter:5,id:null},'model');assert.equal(document.querySelector('.chapter-insights').open,false,'A different chapter does not inherit an open notice');

const sample=chapterInsight(recorded,4);sample.lead.title='<img src=x onerror=alert(1)>';sample.lead.why='<script>bad()</script>';
sample.lead.target.objectId='"><img src=x onerror=alert(1)>';
sample.openDecisions={count:1,items:[{id:'"><svg onload=alert(1)>',title:'Unsafe fixture title',stateLabel:'Needs review',reason:'Synthetic escaping check',target:sample.lead.target}]};
document.body.innerHTML=chapterHeaderHTML(sample,{recheck:[{id:'formerly-met'}]});
assert.equal(document.querySelector('img,script'),null,'All saved text is escaped');
assert.equal(document.querySelector('[onload],[onerror]'),null,'Saved IDs cannot break out of attributes or record links');
const caption=document.querySelector('[data-chapter-progress]');
assert.equal(caption.textContent,`${sample.progress.done}/${sample.progress.total} met · illustrative · 1 recheck`,'Both qualifications fit the existing single caption element');
assert.equal(caption.dataset.done,String(sample.progress.done));assert.equal(caption.dataset.total,String(sample.progress.total));
assert.match(document.querySelector('[data-chapter-insights-toggle]').getAttribute('aria-label'),/1 to re-check.*includes illustrative records/,'The accessible label retains the full readiness wording');
assert.match(document.body.textContent,/<img src=x/);
sample.progress.unavailable=true;sample.progress.done=0;sample.progress.total=0;
document.body.innerHTML=chapterHeaderHTML(sample);
assert.equal(document.querySelector('[data-chapter-progress]').textContent,'Unavailable');
assert.equal(document.querySelector('[role="progressbar"]').hasAttribute('aria-valuenow'),false,'Unavailable checks are not shown as measured zero completion');
assert.equal(calls,0);
await w.happyDOM.close();
console.log('PASS: 11 chapter counts and scoped routes, quiet blank state, unique readiness IDs, coach target, Escape/outside/close focus, draft/caret preservation, expanded progress and scroll preservation, milestone recheck, escaping and unavailable state; no provider call or project mutation.');
