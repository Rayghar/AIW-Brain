// Scoped DOM interaction checks. Synthetic in-memory project; no browser, server or provider.
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {compositionFixtureAnswers} from './composition-fixtures.mjs';

const w=new Window({url:'https://aiw.test/?chapter=5&tab=work&project=driver-ui'});
for(const key of ['window','document','location','localStorage','CustomEvent','Event','Node','Element','HTMLElement','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
document.body.innerHTML='<main id="app"></main><aside id="task"></aside>';
let project=createProject({name:'Driver-led UI acceptance',template:'blank'},'driver-ui');
const at='2026-10-20T12:00:00.000Z';
project=applyCommand(project,{type:'artefact',payload:{type:'requirement',title:'Read current supplier status',description:'Retrieve a supplier outcome without losing the recorded business result.',acceptance:'A failed dependency produces an explicit unavailable outcome.',owner:'Supply team',source:'Synthetic workshop'}},at).document;
project=applyLogicalCommand(project,{type:'logical.responsibility',payload:{title:'Supplier enquiry',purpose:'Own the supplier enquiry.',boundary:'Own the calling boundary.',owner:'Supply team',requirementIds:['REQ-001'],decisionIds:[]}},at).document;
const responsibilityId=project.logical.responsibilities[0].id;
project=applyRealisationCommand(project,{type:'realisation.component',payload:{title:'Supplier enquiry application',kind:'service',purpose:'Call the supplier status boundary.',boundary:'Own enquiry requests.',owner:'Supply team',allocations:[{logicalId:responsibilityId,scope:'Own the supplier enquiry.'}],decisionIds:[]}},at).document;
const componentId=project.realisation.components[0].id;
project=applyQualityCommand(project,{type:'quality.driver',payload:{title:'Bound dependency waiting',category:'availability',requirementIds:['REQ-001'],stimulus:'Supplier stops responding',conditions:'Concurrent enquiries',response:'Return an explicit unavailable result.',metric:'Enquiry response time',operator:'At most',targetValue:'2',unit:'seconds',window:'Per request',measurement:'Dependency interruption exercise',confirmed:true,targetConfirmed:true}},at).document;
project=applyQualityCommand(project,{type:'quality.driver',payload:{kind:'operational',title:'Use the existing operating team',description:'The current team owns enquiry incidents.',impact:'A separately deployed control service needs a reviewed operating owner.',componentIds:[componentId],requirementIds:[],owner:'Supply team',confirmed:true}},at).document;
const operationalId=project.quality.drivers.find(d=>d.kind==='operational').id;
const commands=[],previews=[],inspections=[];
window.aiwProjectStore={value:{document:project},async command(command){commands.push(structuredClone(command));const result=applyArchitectureCommand(project,command,at);project=result.document;this.value.document=project;return result;}};
document.addEventListener('aiw:inspect-record',event=>inspections.push(event.detail.id));
const {architectureWorkspace,mountArchitecture}=await import('./public/architecture-task-ui.js');
const context=()=>({chapter:5,tab:'work',selected:{id:componentId,record:project.realisation.components.find(c=>c.id===componentId)},requirements:project.artefacts.filter(r=>r.type==='requirement'),drivers:project.quality.drivers,tasks:project.coauthoring?.designTasks||[]});
const render=()=>document.querySelector('#task').innerHTML=architectureWorkspace(project,context());
mountArchitecture(project,context(),{selectedId:componentId,render,reveal:render,preview:id=>previews.push(id)});render();
const q=selector=>document.querySelector(selector),qa=selector=>[...document.querySelectorAll(selector)];
const click=selector=>{const element=q(selector);assert(element,'Missing '+selector);element.click();return element;};
const arc=action=>click('[data-arc-action="'+action+'"]');
const set=(key,value)=>{const field=q('[data-arc-field="'+key+'"]');assert(field,'Missing answer '+key);field.value=value;field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));};
const choose=(selector,value)=>{const field=q(selector);assert(field,'Missing '+selector);field.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));};
const settled=async()=>{for(let i=0;i<40;i++){if(!window.aiwArchitectureTask.busy)return;await new Promise(resolve=>setTimeout(resolve,0));}throw Error('Architecture command did not settle: '+q('.arc-error')?.textContent);};
const task=()=>project.coauthoring.designTasks.at(-1);
const modelBefore=()=>JSON.stringify([project.logical.responsibilities,project.realisation.components,project.technology.capabilities]);

assert.equal(q('.arc-entry svg'),null,'Entry asks for context before illustrating a mechanism');
assert.equal(q('[data-arc-concern]'),null,'Concern selection appears once, in the scoped start');
arc('launch');choose('[data-arc-concern]','resilience');
assert.equal(qa('[data-arc-concern]').length,1);
assert(q('[data-arc-field="driver"]').textContent.includes('Operational'),'The entry includes component-linked non-quality drivers');
const beforeStart=modelBefore();arc('start');await settled();
assert.deepEqual(task().basis.contextIds,[componentId],'The exact selected component reaches the canonical task basis');
assert(q('[data-arc-action="conditions"][aria-current="step"]'),'A new task starts from its conditions');
assert(q('[data-arc-driver="'+operationalId+'"]'),'All linked driver kinds stay visible in the common basis');
assert.equal(modelBefore(),beforeStart,'Starting and reading a task cannot create model records');

choose('[data-arc-focus]','protected-call');
click('[data-check-id="dependencyType"]');
assert.equal(document.activeElement.dataset.arcField,'dependencyType','A question action focuses its actual answer');
set('dependencyType','local');arc('compare');
assert.equal(qa('[data-arc-option-result]').length,2);
assert.match(q('.arc-verdict').textContent,/private in-process/,'A contradictory condition is explained beside the alternatives');
click('[data-check-id="local-breaker"]');
assert.equal(document.activeElement.dataset.arcField,'dependencyType','A failed predicate returns to the discriminating fact');
set('dependencyType','remote');arc('save-compare');await settled();
assert.equal(task().answers.dependencyType,'remote');
arc('home');click('[data-arc-action="resume"][data-task-id="'+task().id+'"]');
assert(q('[data-arc-action="compare"][aria-current="step"]'),'Resume keeps the useful task step');
assert.equal(q('.arc-approach.is-selected').dataset.arcOptionResult,'protected-call','Resume retains the examined alternative');

arc('objects');
assert(q('[data-arc-placement="caller"]'),'Caller policy placement is visible before preview');
assert.equal(q('[data-arc-placement="caller"] [data-record-id]').dataset.recordId,componentId);
assert.equal(qa('[data-arc-placement]').length,2,'Circuit breaking does not create a standalone breaker component');
assert(q('[data-arc-action="prepare"]').disabled,'Missing conditions cannot be submitted as a ready model proposal');
const commandCount=commands.length;click('[data-arc-placement="caller"] [data-arc-action="inspect"]');
assert.deepEqual(inspections,[componentId]);assert.equal(commands.length,commandCount,'Inspect is read-only');

// Full answers use the existing domain command. The UI must route its saved alternative
// through the native preview hook, without applying it to the working model.
const complete=applyArchitectureCommand(project,{type:'architecture.answers',payload:{id:task().id,taskRevision:task().revision,answers:{...compositionFixtureAnswers,callerId:componentId,processorId:''}}},at);
project=complete.document;window.aiwProjectStore.value.document=project;window.aiwArchitectureTask.openTask(task().id);
arc('objects');assert.equal(q('[data-arc-action="prepare"]').disabled,false);
const beforePreview=modelBefore();arc('prepare');await settled();
assert.equal(previews.length,1);assert.equal(previews[0],task().alternativeIds.at(-1));
assert.equal(modelBefore(),beforePreview,'A prepared alternative leaves the working model unchanged');
assert.equal(commands.at(-1).type,'architecture.prepare');

// Proxy and load distribution are orthogonal roles within the same concern.
window.aiwArchitectureTask.openConcern('distribution');arc('start');await settled();
choose('[data-arc-focus]','proxy-balanced-pool');
assert(q('[data-arc-field="proxyPolicy"]')&&q('[data-arc-field="healthPlan"]'),'Combined choice asks about policy and pool readiness');
choose('[data-arc-focus]','balanced-pool');
assert.equal(q('[data-arc-field="proxyPolicy"]'),null);assert(q('[data-arc-field="healthPlan"]'));
arc('compare');assert.equal(qa('[data-arc-option-result]').length,4);
assert.equal(qa('.arc-approach .arc-topology svg').length,4,'Every supported edge role has a readable structure');

// Routing belongs where the design puts it. Verification remains useful for a
// mechanism without a numerical calculator.
window.aiwArchitectureTask.openConcern('partitioning');arc('start');await settled();
choose('[data-arc-focus]','sharded');set('routingOwner','application');arc('objects');
assert.equal(q('[data-arc-field="routerId"]'),null,'Hosted routing reuses the application instead of forcing another component');
assert.match(q('[data-arc-placement="router"]').textContent,/Hosted by the processor/);
arc('evidence');assert(q('.arc-verification'));assert.equal(q('.arc-analysis'),null);
assert(qa('[data-arc-obligation]').length>=4,'Verification retains the conditional obligations for the selected mechanism');
assert.equal(q('.arc-error').hidden,true);

// A source review describes the actual change and preserves local work. The
// review command must not silently save or discard a condition still being edited.
const originalTarget=project.quality.drivers.find(d=>d.id===task().driverId);
project=applyQualityCommand(project,{type:'quality.driver',payload:{...originalTarget,targetValue:'3',confirmed:true,targetConfirmed:true}},at).document;
window.aiwProjectStore.value.document=project;render();
assert.match(q('.arc-changed-facts').textContent,/Bound dependency waiting: target changed/);
set('sourceReviewer','Synthetic architecture reviewer');
set('sourceReason','Review the revised response-time target against the retained partitioning conditions.');
const review=q('[data-arc-field="sourceConfirmed"]');review.checked=true;review.dispatchEvent(new Event('change',{bubbles:true}));
arc('refresh');await settled();
assert.equal(q('.arc-changed-facts'),null,'Source review returns to the saved task step');
arc('conditions');
assert.equal(q('[data-arc-field="routingOwner"]').value,'application','Unsaved routing placement survives source refresh');
assert.notEqual(task().answers.routingOwner,'application','Source review does not silently commit the draft answers');
assert.match(q('.arc-save-state').textContent,/Unsaved design/);
arc('save');await settled();assert.equal(task().answers.routingOwner,'application');

console.log('PASS driver-led task DOM: scoped entry, all driver kinds, conditions first, fact focus, blocked alternatives, resume continuity, exact caller placement, read-only inspection, native preview isolation, overlapping proxy/LB roles, hosted sharding verification and source-refresh draft preservation. No layout or live-provider claim.');
await w.happyDOM.close();
