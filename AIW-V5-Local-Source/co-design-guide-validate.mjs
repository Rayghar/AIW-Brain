// Contextual guide behavior, not a provider/model accuracy evaluation.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createProject} from './shared/projects-domain.js';
import {brainContext} from './public/aiw-brain.js';
import {coDesignGuideHTML,mountCoDesignGuide} from './public/co-design-guide.js';

const p=createProject({name:'Synthetic guide scope',template:'bank-payment'},'guide-fixture');
const requirement=p.artefacts.find(r=>r.type==='requirement');
const base=brainContext(p,{chapter:1,tab:'work',id:requirement.id});
const before=JSON.stringify(p),w=new Window({url:'https://aiw.test/?project=guide-fixture&chapter=1&tab=work'});
const panel=w.document.createElement('aside');w.document.body.append(panel);
let calls=0,events=[];
const previousFetch=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('The guide must not disclose or generate');};
panel.addEventListener('aiw:co-design-prompt',e=>events.push(e.detail));
const questions=new Set();
for(let chapter=1;chapter<=11;chapter++){
  const c={...base,chapter};panel.innerHTML=coDesignGuideHTML(c);mountCoDesignGuide(panel,c);mountCoDesignGuide(panel,c);
  assert.equal(panel.querySelector('[data-co-design-guide]').dataset.guideChapter,String(chapter));
  assert.match(panel.textContent,/no LLM has been consulted/);
  questions.add(panel.querySelector('.co-design-intent h3').textContent);
  const promptBand=panel.querySelector('.co-design-prompts');assert(promptBand.nextElementSibling.classList.contains('co-design-note'));assert(promptBand.compareDocumentPosition(panel.querySelector('.co-design-next'))&4,'Tutor actions precede navigation so they remain discoverable');
  const steps=panel.querySelectorAll('.co-design-next>ol>li');assert(steps.length>=1&&steps.length<=3);if(c.intelligence?.primary){assert.equal(steps.length,1,'One canonical next action; supporting conditions stay in its disclosure');assert.equal(steps[0].dataset.intelligenceId,c.intelligence.primary.id);}
  for(const a of panel.querySelectorAll('a')){const url=new URL(a.href);assert.equal(url.origin,'https://aiw.test');assert.equal(url.searchParams.get('project'),p.id);assert(Number(url.searchParams.get('chapter'))>=1&&Number(url.searchParams.get('chapter'))<=11);}
  const saved=JSON.stringify(c);events=[];
  for(const b of panel.querySelectorAll('[data-co-design-intent]'))b.click();
  assert.equal(events.length,4,'Remount cannot duplicate handlers');
  for(const event of events){assert.equal(event.projectId,p.id);assert.equal(event.chapter,chapter);assert.equal(event.objectId,requirement.id);assert.equal(event.source,'co-design-guide');assert.equal(event.mode,event.intent==='compare'?'mind':'design');assert(event.prompt.includes(requirement.id));assert(event.prompt.length<=2000);assert.match(event.prompt,/Preserve fixed requirements/);}
  assert.match(events.find(e=>e.intent==='verify').prompt,/observable authoritative state/);
  assert.match(events.find(e=>e.intent==='compare').prompt,/Preserve the earlier proposals/);
  assert.equal(JSON.stringify(c),saved,'No canonical context or original proposal is mutated');
}
assert.equal(questions.size,11,'The guide teaches a distinct design question in every chapter');
assert.equal(JSON.stringify(p),before);assert.equal(calls,0);

const business={id:'BUS-1',title:'Business driver',record:{id:'BUS-1',kind:'business',title:'Business driver'}};
const empty={...base,intelligence:null,chapter:7,drivers:[business],requirements:[],decisions:[],sources:[],governed:{claims:[]},missing:[],selected:{...base.selected,title:'<img src=x onerror=alert(1)>'}};
panel.innerHTML=coDesignGuideHTML(empty);mountCoDesignGuide(panel,empty);
assert.equal(panel.querySelector('img'),null,'Saved text is escaped');
assert.match(panel.textContent,/Architectural drivers: 1. Quality scenarios: 0/,'Business drivers are not falsely presented as measurable quality scenarios');
assert.match(panel.textContent,/No relevant released claim/);
assert.match(panel.querySelector('.co-design-next').textContent,/Connect the source requirement/);
assert.match(panel.querySelector('.co-design-next').textContent,/Review the quality scenario/);
events=[];panel.querySelector('[data-co-design-intent="understand"]').click();assert.match(events[0].prompt,/No linked requirement/);assert.match(events[0].prompt,/quality scenario is not yet linked/);

const long={...empty,selected:{...empty.selected,title:'Long saved label '.repeat(500)},missing:['Long saved open check '.repeat(500)]};
panel.innerHTML=coDesignGuideHTML(long);mountCoDesignGuide(panel,long);events=[];
for(const b of panel.querySelectorAll('[data-co-design-intent]'))b.click();
assert.equal(events.length,4);
for(const event of events){assert(event.prompt.length<=2000);assert.match(event.prompt,/Preserve fixed requirements; a new proposal never changes them or records approval\.$/,'Long record text cannot clip away the fixed safety/authority instruction');}

// A stale context/DOM mismatch cannot prepare a prompt about the former object.
events=[];mountCoDesignGuide(panel,{...empty,selected:{...empty.selected,id:'OTHER-REQ'}});panel.querySelector('button').click();assert.equal(events.length,0);
const project={...base,selected:{id:'project',title:'Blank project'},requirements:[],drivers:[],chapter:1,missing:['Select an object or capture the first requirement.']};
panel.innerHTML=coDesignGuideHTML(project);mountCoDesignGuide(panel,project);
assert.equal(panel.querySelectorAll('[data-co-design-intent]').length,0);assert.match(panel.textContent,/Select a saved record/);assert.equal(panel.querySelectorAll('.co-design-next>ol>li').length,1);
panel.innerHTML=coDesignGuideHTML({...project,chapter:11});
const emptySteps=[...panel.querySelectorAll('.co-design-next a')];assert.equal(emptySteps.length,2);assert.equal(new URL(emptySteps[0].href).searchParams.get('chapter'),'11');assert.equal(new URL(emptySteps[1].href).searchParams.get('chapter'),'1','Requirement capture from an empty later chapter must reach Chapter1 Work');
assert.equal(coDesignGuideHTML({...base,chapter:12}),'');assert.equal(coDesignGuideHTML({...base,basis:{}}),'');
globalThis.fetch=previousFetch;await w.happyDOM.close();
console.log('PASS: all 11 contextual design questions, scope-safe editable prompt events, canonical next steps, architectural-driver distinction, missing evidence, no-selection and escaping states; no model changes or provider disclosure.');
