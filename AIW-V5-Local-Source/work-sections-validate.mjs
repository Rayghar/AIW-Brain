// Real chapter controls against the local Worker and DOM. This verifies navigation,
// not pixels or approval of the reference architecture.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?chapter=6&tab=work&section=dependencies', width: 1440, height: 900});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'FormData', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'MutationObserver', 'ResizeObserver', 'navigator']) {
  Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
}
for (const key of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
document.body.innerHTML = '<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default: worker} = await import('./worker.js');
const {localDatabase} = await import('./local-db.js');
const {WORK_METHOD,validWorkSection}=await import('./public/work-frame.js');
const {linkedRequirementIds}=await import('./public/requirement-links.js');
const {physicalObjects}=await import('./public/logical-domain.js');
const {logicalFor}=await import('./public/realisation-domain.js');
const {technologySources}=await import('./public/technology-domain.js');
const {realizationSources,selectionPreparation}=await import('./public/technology-realisation-domain.js');
const {runtimeSources}=await import('./public/runtime-domain.js');
const env = {DB: localDatabase(':memory:'), FILES: {async put() {}, async get() {return null;}, async delete() {}}, ASSETS: {fetch: () => new Response('asset')}};
let writes = 0;
globalThis.fetch = (path, options = {}) => {
  if (options.method && !['GET', 'HEAD'].includes(options.method)) writes++;
  return worker.fetch(new Request(new URL(path, 'https://aiw.test'), {...options, headers: {...options.headers, 'oai-authenticated-user-id': 'work-sections-test', Origin: 'https://aiw.test'}}), env);
};
const errors = [];
w.addEventListener('error', event => errors.push(event.message));
const q = selector => document.querySelector(selector);
const waitFor = async (predicate, label) => {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw Error(label);
};
const click = selector => {
  const button = q(selector); assert(button, 'Missing control: ' + selector); button.click();
};
const fixtureDirectory=process.env.AIW_WORK_FIXTURE_DIR;
const fixtureViews=new Set(['1:brief','1:context','1:journey','1:requirement','2:intake','2:scenarios','3:inputs','3:compare','4:responsibilities','5:components','6:needs','6:capabilities','7:plans','8:contracts','8:data','9:threats','9:controls','10:placement','10:recovery','10:operate','11:overview']);
let fixtureStyles='';
if(fixtureDirectory){const index=await readFile('public/index.html','utf8'),files=[...index.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g)].map(m=>m[1]);fixtureStyles=(await Promise.all(files.map(f=>readFile(path.join('public',f),'utf8')))).join('\n').replace(/url\(\s*(['"]?)\//g,(_m,q)=>'url('+q+pathToFileURL(path.resolve('public')).href+'/');await mkdir(fixtureDirectory,{recursive:true});}
async function writeVisualFixture(chapter,section,fixture){
 if(!fixtureDirectory||fixture!=='reference'||!fixtureViews.has(chapter+':'+section))return;
 const save=async suffix=>{const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIW native Work '+chapter+' '+section+'</title><style>'+fixtureStyles+'</style></head>'+document.body.outerHTML+'</html>';await writeFile(path.join(fixtureDirectory,'chapter-'+chapter+'-'+section+suffix+'.html'),html);};
 await save('');
 if(chapter===2&&section==='intake'){const source=q('.q-source-list>details');if(source){const open=source.open;source.open=true;await save('-source-open');source.open=open;}}
}
const sections = [
  [1, 'r-section', ['brief', 'context', 'journey', 'requirement']],
  [2, 'q-section', ['intake', 'scenarios', 'priorities', 'compare', 'conflicts']],
  [3, 'd-stage', ['inputs', 'compare', 'record']],
  [4, 'l-stage', ['responsibilities', 'connections', 'mappings', 'groups']],
  [5, 'a-stage', ['components', 'interactions', 'technology']],
  [6, 't-stage', ['needs', 'capabilities', 'dependencies']],
  [7, 'tr-stage', ['plans', 'compare', 'connections']],
  [8, 'i-stage', ['contracts', 'parties', 'data', 'lineage']],
  [9, 'sec-stage', ['threats', 'controls', 'assurance']],
  [10, 'rt-stage', ['placement', 'recovery', 'operate']],
  [11, 'rv-stage', ['overview', 'case', 'document', 'delivery', 'plateaus']]
];
function assertComposition(chapter, section, fixture) {
  const stage=q('#studio-surface > .stage'),label=`${fixture}: Chapter ${chapter} / ${section}`;
  assert(stage,label+' has a main stage');
  for(const selector of ['.work-view','.work-task-head','.work-stages'])assert.equal(stage.querySelectorAll(selector).length,1,label+' has one '+selector);
  assert.equal(stage.querySelectorAll(':scope > .content-card,:scope > .r-card,.work-body > .content-card,.work-body > .r-card').length,0,label+' has no legacy outer card');
  assert.equal(stage.querySelectorAll('.work-stages [data-stage]').length,0,'Numeric model journey controls must not handle Work navigation');
  assert.equal(stage.querySelectorAll('.r-unavailable').length,0,label+' renders without a guarded error');
  assert(stage.querySelector('.work-body').textContent.trim(),label+' retains a useful body or empty state');
  assert.equal(stage.querySelectorAll('.work-desk').length,1,label+' has one actual working surface');
  const connections=stage.querySelector('.work-connections'),method=WORK_METHOD[chapter][section];assert(connections,label+' explains task inputs and handoffs');
  assert.equal(stage.querySelector('.work-task-question').textContent,method[0],label+' asks the immediate architecture question');
  for(const [i,selector] of [[1,'.work-method-input'],[2,'.work-method-output']]){const expected=method[i].filter(x=>x[0]),links=[...connections.querySelectorAll(selector+' a')];assert.equal(links.length,expected.length,label+' exposes exact method destinations');links.forEach((a,j)=>{const u=new URL(a.href),[c,s,title,tab='work']=expected[j];assert.equal(u.searchParams.get('chapter'),String(c));assert.equal(u.searchParams.get('section')||'',s);assert.equal(u.searchParams.get('tab'),tab);assert.equal(a.textContent,title);assert.equal(u.searchParams.get('project')||'bank-payment',window.aiwProjectStore.value.document.id,'Method connection keeps the current project');});}
  for(const b of stage.querySelectorAll('.work-stages button')){assert(b.dataset.workPurpose&&b.getAttribute('aria-label'),label+' explains each native task accessibly');assert.equal(b.textContent,b.getAttribute('aria-label'),'Inventory decoration does not pollute task or breadcrumb identity');}
  if(chapter===1&&section==='brief')assert.equal(stage.querySelectorAll('.r-brief-story>.r-brief-block').length,2,'Problem and outcome are both present in the brief');
  if(chapter===1&&section==='context'&&fixture==='reference'){assert(stage.querySelectorAll('.r-context-group').length>1,'Context preserves named semantic groups');assert.equal(stage.querySelectorAll('.r-context-group .r-record').length,window.aiwProjectStore.value.document.artefacts.filter(a=>!['journey','requirement'].includes(a.type)).length,'Grouping retains every shown native context record');}
  const creation={4:['l','responsibilities'],5:['a','components'],6:['t','capabilities']}[chapter];
  if(creation){
    const button=stage.querySelector(`.work-task-actions [data-${creation[0]}-action="new"]`);
    if(section===creation[1])assert(button?.classList.contains('primary'),label+' exposes its primary creation action');
    else assert.equal(button,null,label+' does not offer creation for another task');
  }
  const primary={1:section==='brief'?'[data-r-action="edit-brief"]':'[data-r-action="add"]',2:['intake','scenarios'].includes(section)?'[data-q-action="add"]':section==='conflicts'?'[data-q-action="add-conflict"]':null,8:section==='contracts'?'[data-i-action="new-contract"]':section==='data'?'[data-i-action="new-data"]':null,10:'[data-rt-action="new-plan"]',11:section==='document'?'[data-rv-action="narrative"]':section==='delivery'?'[data-rv-action="action"]':null}[chapter];
  if(primary)assert(stage.querySelector('.work-task-actions '+primary),label+' retains its authoring entry');
  if(chapter===1&&section==='requirement')for(const selector of ['[data-r-action="workbook"]','#r-record-sort','#r-search','#r-selection','#r-record-list'])assert(stage.querySelector(selector),label+' retains '+selector);
  if(chapter===2&&section==='compare')assert.equal(stage.querySelectorAll('[data-q-compare]').length,2,label+' retains both comparison selectors');
  if(chapter===3){assert.equal(document.querySelectorAll('#d-question-select').length,1,label+' has one question selector');assert(stage.querySelector('.work-context #d-question-select'),label+' keeps question scope beside the task');}
  if(chapter===7&&window.aiwProjectStore.value.document.technologyRealisation.records.length)assert(stage.querySelector('[name="activeRecord"]'),label+' retains realization scope');
  if(chapter===10){assert.equal(document.querySelectorAll('[name="rtEnvironment"]').length,1,label+' has one environment selector');assert(stage.querySelector('.work-context [name="rtEnvironment"]'),label+' keeps environment scope beside the task');assert(stage.querySelector('[data-rt-action="new-environment"]'),label+' can create an environment');}
  if(fixture==='reference')assertNativeReading(stage,chapter,section);
}
function assertNativeReading(stage,chapter,section){
 const p=window.aiwProjectStore.value.document,rows=[...stage.querySelectorAll('[data-work-record-row]')],byId=id=>p.artefacts.find(a=>a.id===id),ids=xs=>[...new Set(xs.filter(Boolean).map(x=>typeof x==='string'?x:x.id))];
 const group=(row,label)=>[...row.querySelectorAll('.work-record-trace>div')].find(e=>e.querySelector('dt').textContent===label);
 const trace=(row,label,records)=>{const el=group(row,label);assert(el,'Named record context '+label);assert.deepEqual([...el.querySelectorAll('[data-work-record]')].map(a=>a.dataset.workRecord),ids(records).slice(0,3),'Only actual linked records appear in '+label);assert.equal(!!el.querySelector('.work-trace-more'),ids(records).length>3,'Long context remains bounded with a native route');};
 for(const a of stage.querySelectorAll('[data-work-record]')){const u=new URL(a.href);assert.equal(u.searchParams.get('object')||u.searchParams.get('artefact')||u.searchParams.get('driver'),a.dataset.workRecord,'Record route keeps its exact stable identity');assert.equal(u.searchParams.get('project')||'bank-payment',p.id);assert.equal(u.searchParams.get('tab'),'work');assert(validWorkSection(Number(u.searchParams.get('chapter')),u.searchParams.get('section')),'Record route reaches its authoring task');}
 if(chapter===1&&['journey','requirement'].includes(section))for(const row of rows){const r=byId(row.dataset.workRecordRow),neighbors=ids(p.relationships.filter(x=>x.from===r.id||x.to===r.id).map(x=>x.from===r.id?x.to:x.from)).map(byId).filter(Boolean);if(section==='journey'){trace(row,'Actors & outcomes',neighbors.filter(x=>['actor','stakeholder','outcome'].includes(x.type)));trace(row,'Required behaviour',neighbors.filter(x=>x.type==='requirement'));assert.equal(row.closest('li').dataset.journeyOrder,String(r.order));}else{trace(row,'Journey & business context',neighbors.filter(x=>x.type!=='requirement'));assert(row.querySelector('.r-acceptance').textContent.includes(r.acceptance||'Acceptance criteria are not recorded yet.'),'Acceptance stays in the requirement reading');}assert.equal(row.querySelectorAll('.r-record-main a,.r-record-main button').length,0,'Record selection never contains nested interactive links');}
 if(chapter===2&&section==='intake')for(const row of stage.querySelectorAll('[data-work-source]')){const r=byId(row.dataset.workSource),ds=p.quality.drivers.filter(d=>d.requirementIds.includes(r.id));assert.deepEqual([...row.querySelectorAll('.q-source-reading [data-q-select]')].map(b=>b.dataset.qSelect),ds.map(d=>d.id),'Source consequences name actual linked drivers');assert(row.querySelector('.q-source-reading').textContent.includes(r.acceptance||'Acceptance not recorded in Chapter 1.'));assert.equal(row.querySelector('[data-q-from-requirement]').dataset.qFromRequirement,r.id,'Create driver retains its exact requirement basis');}
 if(chapter===4&&section==='responsibilities')for(const row of rows){const r=p.logical.responsibilities.find(x=>x.id===row.dataset.workRecordRow),physical=new Map(physicalObjects(p).map(x=>[x.id,x]));trace(row,'Required behaviour',linkedRequirementIds(p,r).map(byId));trace(row,'Realised by',p.logical.mappings.filter(m=>m.logicalId===r.id).map(m=>physical.get(m.physicalId)));}
 if(chapter===5&&section==='components')for(const row of rows){const id=row.dataset.workRecordRow,needIds=new Set(p.technology.needs.filter(n=>n.applicationId===id).map(n=>n.id)),caps=new Set(p.technology.mappings.filter(m=>needIds.has(m.needId)).map(m=>m.capabilityId));trace(row,'Realises',logicalFor(p,id));trace(row,'Platform support',p.technology.capabilities.filter(c=>caps.has(c.id)));}
 if(chapter===6&&section==='needs')for(const row of stage.querySelectorAll('[data-work-need]')){const n=p.technology.needs.find(x=>x.id===row.dataset.workNeed),support=p.technology.mappings.filter(m=>m.needId===n.id).map(m=>m.capabilityId);assert(row.textContent.includes(n.description));assert.equal(row.querySelector('[data-t-action="need-context"]').dataset.tId,n.id);assert.deepEqual([...row.querySelectorAll('[data-t-action="edit-support"]')].map(b=>b.dataset.tId),support.slice(0,3),'Support actions name the mapped capabilities');}
 if(chapter===6&&section==='capabilities')for(const row of rows){const s=technologySources(p,row.dataset.workRecordRow);trace(row,'Supports application needs from',s.applications);trace(row,'Design driver basis',s.drivers);}
 if(chapter===7&&section==='plans'){const focus=stage.querySelector('[data-work-record-focus]');if(focus){const r=p.technologyRealisation.records.find(x=>x.id===focus.dataset.workRecordFocus),next={option:'stage',preference:'choose-preference',definition:'edit-plan',rationale:'edit-plan'}[selectionPreparation(r)]||'record';assert.equal(stage.querySelector('.work-task-actions .primary').dataset.trAction,next,'Primary action follows the actual selection preparation');assert.deepEqual([...focus.querySelectorAll('[data-work-record]')].map(a=>a.dataset.workRecord),realizationSources(p,r.id).capabilities.map(c=>c.id));}}
 if(chapter===8&&section==='data'){const focus=stage.querySelector('[data-work-record-focus]');if(focus)trace(focus,'Carried by these contracts',p.interfaces.contracts.filter(c=>c.exchanges.some(x=>x.dataId===focus.dataset.workRecordFocus)));}
 if(chapter===9&&section==='threats'){const focus=stage.querySelector('[data-work-record-focus]');if(focus)assert.deepEqual([...focus.querySelectorAll('[data-work-control]')].map(x=>x.dataset.workControl),p.security.controls.filter(c=>c.threatIds.includes(focus.dataset.workRecordFocus)).map(c=>c.id),'Threat context retains its actual safeguards');}
 if(chapter===10){const focus=stage.querySelector('[data-work-record-focus]');if(focus){const r=p.runtime.plans.find(x=>x.id===focus.dataset.workRecordFocus),s=runtimeSources(p,r);assert.equal(focus.dataset.workEnvironment,r.environmentId,'Plan identity keeps the environment');assert.equal(stage.querySelector('[name="rtEnvironment"]').value,r.environmentId);assert.equal(focus.querySelector('h3').textContent,r.title);trace(focus,'Operating asset',s.asset?[s.asset]:[]);trace(focus,'Inherited design drivers',s.drivers);}}
 if(chapter===11&&section==='overview'){assert.deepEqual([...stage.querySelectorAll('[data-work-chapter-review]')].map(x=>Number(x.dataset.workChapterReview)),[1,2,3,4,5,6,7,8,9,10],'All source chapters occur exactly once in method order');for(const [name,expected] of [['basis',[1,2,3]],['architecture',[4,5,6,7,8]],['assurance',[9,10]]])assert.deepEqual([...stage.querySelectorAll('[data-work-review-group="'+name+'"] [data-rv-chapter]')].map(x=>Number(x.dataset.rvChapter)),expected);}
}
async function walkSections(fixture){
  const before = JSON.stringify(window.aiwProjectStore.value.document), writeBaseline = writes;
  for (const [chapter, attribute, values] of sections) {
    click(`a[data-chapter="${chapter}"]`);
    await waitFor(() => q(`[data-${attribute}]`), 'Chapter ' + chapter + ' did not arrive');
    for (const section of values) {
      click(`[data-${attribute}="${section}"]`);
      await waitFor(() => q(`[data-${attribute}="${section}"][aria-pressed="true"]`), 'Section ' + section + ' did not activate');
      assert.equal(window.aiwLogicalStudio.workSection, section, 'Studio exposes the section the user sees');
      assert.equal(new URL(location.href).searchParams.get('section'), section, 'Address follows the current Work section');
      assert(q(`[data-${attribute}="${section}"]`).closest('nav'), 'Section choices are labelled navigation');
      assert.match(q('#yah-text').textContent, new RegExp(q(`[data-${attribute}="${section}"]`).textContent.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'Current location names the open section');
      assertComposition(chapter,section,fixture);
      await writeVisualFixture(chapter,section,fixture);
    }
    assert.equal(window.aiwLogicalStudio.openSection('unrecognized-section'), false, 'Invalid section is ignored');
    assert.equal(window.aiwLogicalStudio.workSection, values.at(-1));
    // Follow an actual in-app address to a different section, preserving the chapter
    // and using the same routing path as copied links and validation remedies.
    const link = document.createElement('a'); link.href = `/?chapter=${chapter}&tab=work&section=${values[0]}`; document.body.append(link); link.click(); link.remove();
    await waitFor(() => q(`[data-${attribute}="${values[0]}"][aria-pressed="true"]`), 'Chapter ' + chapter + ' section deep link was not restored');
    if ([4, 5].includes(chapter)) {
      const progress = q('.l-chapter-progress').closest('details'), note = q('#architect-note').closest('details');
      assert(progress && !progress.open, 'Secondary milestones start folded');
      assert(note && !note.open, 'The private note starts folded');
      assert.equal(progress.querySelectorAll('button').length, window.aiwLogicalStudio.milestones().length, 'Every milestone action remains reachable');
      note.open = true; assert(q('#architect-note'), 'The existing note editor remains available');
    }
  }
  assert.equal(JSON.stringify(window.aiwProjectStore.value.document), before, 'Navigation cannot mutate saved architecture');
  assert.equal(writes, writeBaseline, 'Navigation does not save or call generation');
}
try {
  await import('./public/entry.js');
  await waitFor(() => q('[data-t-stage="dependencies"][aria-pressed="true"]'), 'Initial Work section address was not restored');
  await walkSections('reference');
  // A new blank project enters through the same service and in-app route as the
  // project chooser. Fixture creation is outside the navigation write baseline.
  const response=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Blank Work composition fixture',template:'blank'})});
  assert.equal(response.status,201,'Blank fixture is created by the local service');
  const blank=await response.json();
  const link=document.createElement('a');link.href=`/?project=${encodeURIComponent(blank.document.id)}&chapter=1&tab=work&section=brief`;document.body.append(link);link.click();link.remove();
  await waitFor(()=>window.aiwProjectStore.value.document.id===blank.document.id&&q('[data-r-section="brief"][aria-pressed="true"]'),'Blank project opens in place');
  await walkSections('blank');
  assert.deepEqual(errors, []);
  console.log('PASS: reference and blank projects; 11 chapters / 40 Work sections each; 80 native section clicks; exact method routes and questions; actual requirement/driver/allocation/support/contract/control/runtime traces; contextual selection action; initial/deep-link destinations; preserved secondary tools; no navigation writes or saved-model mutation.');
} finally {
  await w.happyDOM.close();
}
