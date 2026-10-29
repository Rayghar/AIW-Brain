// A scoped Work view uses the same drivers across register, priorities, comparison,
// and related conflicts; rendering never changes the canonical project or ranks.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {writeFile} from 'node:fs/promises';
const window = new Window({url:'https://aiw.test/?chapter=2&tab=work'});
for(const key of ['window','document','location','CustomEvent','Event','HTMLElement','Node','FormData'])globalThis[key]=key==='window'?window:window[key];
const {buildModuleScopeProject}=await import('../module-scope-fixture.mjs');
const {createQualityStudio}=await import('../public/quality.js');
const {applyQualityCommand,orderedDrivers,driverPriority,potentialTradeoffs}=await import('../public/quality-domain.js');
const {setShellScopeId}=await import('../public/project-context.js');
const {scopeLens,lensHolds}=await import('../public/module-lens.js');
const q=selector=>document.querySelector(selector),qa=selector=>[...document.querySelectorAll(selector)];
try{
 const built=await buildModuleScopeProject({rows:1400}),{modules,made}=built;let project=built.document;
 const command=(type,payload)=>{project=applyQualityCommand(project,{type,payload},'2026-10-18T12:00:00.000Z').document;};
 for(const [id,responsibilityIds] of [[made.A.drivers[0],[made.A.responsibilities[0]]],[made.A.drivers[1],[made.A.responsibilities[0]]],[made.B.drivers[0],[made.A.responsibilities[0],made.B.responsibilities[0]]],[made.C.drivers[0],[made.B.responsibilities[0]]]]){
  command('quality.driver',{...project.quality.drivers.find(d=>d.id===id),responsibilityIds});
 }
 for(const [title,driverIds] of [['Local module A conflict',made.A.drivers],['Other module B conflict',made.B.drivers],['Cross-module A and B conflict',[made.A.drivers[0],made.B.drivers[0]]]])command('quality.conflict',{title,driverIds,effect:'Fixture consequence',status:'open'});
 const before=JSON.stringify(project),store={value:{document:project},async command(){throw Error('Navigation must never save');}};window.aiwProjectStore=store;
 const studio=createQualityStudio(store),state={chapter:2,tab:'work',selected:'project',cursor:false};
 const draw=()=>{document.body.innerHTML='<div id="app">'+studio.work()+'</div><div id="dialog-host"></div>';};
 studio.bind({state,render:draw,route(){},persist(){},toast(){},selectNode(id){state.selected=id;draw();},setTab(tab){state.tab=tab;draw();}});
 const observations={scopes:[],crossModuleConflictsPreserved:true,globalPriorityPositionsPreserved:true};
 const checkScope=(scope,label)=>{
  setShellScopeId(scope);const lens=scopeLens(project,scope),all=orderedDrivers(project),expected=all.filter(d=>lensHolds(lens,d)).map(d=>d.id);
  studio.openSection('scenarios');draw();assert.deepEqual(qa('[data-q-select]').map(x=>x.dataset.qSelect),expected,label+' register');
  studio.openSection('priorities');draw();assert.deepEqual(qa('[data-q-select]').map(x=>x.dataset.qSelect),expected,label+' priority');
  for(const row of qa('.q-priority-list > div')){
   const id=row.querySelector('[data-q-select]').dataset.qSelect,d=all.find(d=>d.id===id),group=all.filter(x=>driverPriority(x)===driverPriority(d));
   assert.equal(Number(row.querySelector('.q-order').textContent),all.indexOf(d)+1,'canonical global position');
   assert.equal(row.querySelector('[data-direction="up"]').disabled,group.indexOf(d)===0,'global group upper boundary');
   assert.equal(row.querySelector('[data-direction="down"]').disabled,group.indexOf(d)===group.length-1,'global group lower boundary');
  }
  studio.openSection('compare');draw();
  const picks=qa('select[data-q-compare]');assert.equal(picks.length,2);
  picks.forEach(select=>assert.deepEqual([...select.options].map(o=>o.value).filter(Boolean),expected,label+' comparison candidates'));
  const selected=picks.map(s=>s.value).filter(Boolean);assert(selected.every(id=>expected.includes(id)),label+' selections in scope');assert.equal(new Set(selected).size,Math.min(2,expected.length),'distinct available comparison subjects');
  assert.equal(!!q('.q-comparison'),expected.length>=2,'comparison needs two visible drivers');
  studio.openSection('conflicts');draw();
  const related=project.quality.conflicts.filter(c=>!lens||c.driverIds.some(id=>lensHolds(lens,id)));
  assert.deepEqual(qa('.q-conflict [data-q-conflict]').map(x=>x.dataset.qConflict),related.map(c=>c.id),label+' relevant conflicts');
  const pairs=potentialTradeoffs(project,null).filter(t=>!lens||t.driverIds.some(id=>lensHolds(lens,id)));
  assert.equal(qa('.q-tradeoff').length,pairs.length,label+' related potential trade-offs');
  for(const row of qa('.q-conflict')){
   const c=project.quality.conflicts.find(c=>c.id===row.querySelector('[data-q-conflict]').dataset.qConflict);
   assert(c.driverIds.every(id=>row.textContent.includes(id)),'all explicit conflict endpoints retained');
   assert.equal(row.textContent.includes('Includes drivers outside'),!!lens&&c.driverIds.some(id=>!lensHolds(lens,id)),'cross-module note');
  }
  observations.scopes.push({label,candidates:expected,comparison:selected,conflicts:related.map(c=>c.id),potentialTradeoffs:pairs.length});return expected;
 };
 const expectedA=checkScope(modules.A,'Module A');assert.deepEqual(new Set(expectedA),new Set(['QD-001','QD-002','QD-007']));
 studio.openSection('compare');draw();let picker=q('[data-q-compare="1"]');picker.value=expectedA.at(-1);picker.dispatchEvent(new Event('change',{bubbles:true}));
 const held=qa('[data-q-compare]').map(s=>s.value);draw();assert.deepEqual(qa('[data-q-compare]').map(s=>s.value),held,'valid comparison selection survives redraw');
 checkScope(modules.B,'Module B');checkScope(modules.P,'Platform module');checkScope('','Whole design');checkScope(modules.A,'Return to module A');
 assert.equal(JSON.stringify(project),before,'all view and scope changes leave saved records and global ranks unchanged');
 observations.projectUnchanged=true;observations.passed=true;
 console.log('PASS: scoped driver register, Priority, Compare, related conflicts and trade-offs; global ranks and cross-module endpoints; scope-change selection; no document mutation.');
 await writeFile(new URL('./quality-scope-review-results.json',import.meta.url),JSON.stringify(observations,null,2));
 studio.dispose();
}finally{await window.happyDOM.close();}
