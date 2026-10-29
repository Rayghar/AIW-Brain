// DOM and Worker integration. No browser or layout engine.
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const argChapter=process.argv.find(a=>a.startsWith('--chapter='))?.slice(10),companionOnly=process.env.AIW_COMPANION_ONLY==='1'||process.argv.includes('--companion');
const ch=Number(process.env.AIW_CHAPTER||argChapter||4),blank=false;
const w=new Window({url:`https://aiw.test/?chapter=${ch}&tab=work&artefact=REQ-001`,width:Number(process.env.AIW_WIDTH||1440),height:900});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
// happy-dom has no CSS.escape; the browser does. The shim escapes as the browser would for the ids used here.
if(typeof globalThis.CSS==='undefined')globalThis.CSS={escape:v=>String(v).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)};
w.document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default:worker}=await import(pathToFileURL(root+'/worker.js'));
const {localDatabase}=await import(pathToFileURL(root+'/local-db.js'));
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
globalThis.fetch=(path,options={})=>worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':'ux-test',Origin:'https://aiw.test'}}),env);
const errors=[];w.addEventListener('error',e=>errors.push(e.message));
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);assert.ok(el,'Missing '+s);el.focus();el.click();return el};
const waitFor=async(fn,message)=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw Error(message+' '+q('.ip-error')?.textContent)};
if(blank){const fixture=makeBlank();await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind('ux-test',fixture.id,JSON.stringify(fixture),new Date().toISOString()).run();history.replaceState({},'', 'https://aiw.test/?chapter=9&tab=work&project='+fixture.id);}
await import(pathToFileURL(root+'/public/entry.js'));
const input=(selector,value)=>{const el=q(selector);assert.ok(el,'Missing '+selector);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));return el;};
const select=(selector,value)=>{const el=q(selector);assert.ok(el,'Missing '+selector);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));return el;};
const submit=selector=>{assert.ok(q(selector),'Missing '+selector);q(selector).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));};

const brain=a=>click('[data-brain-action="'+a+'"]');
const store=w.aiwProjectStore;
// Sol's panel loads after Chapters 1–3 paint (round 2, I2-20); the bar's button is Sol's once it has mounted.
await waitFor(()=>q('[data-brain-launch="design"]'),'Sol mounts on the page');
if(companionOnly){
 for(const tab of ['work','model','validate','output']){
  if(q('.brain-panel:not([hidden])'))brain('close');
  click(`[data-tab="${tab}"],[data-r-tab="${tab}"],[data-q-tab="${tab}"],[data-d-tab="${tab}"]`);
  click('[data-brain-launch="design"]');
  assert(q('.brain-panel:not([hidden])'),`Sol opens in chapter ${ch} / ${tab}`);
  // While a chapter model or the explorer is open, it carries the chapter's own actions and the panel does not
  // repeat them (brain-context-ui.js nativeView).
  const modelOpen=()=>document.body.classList.contains('cm-active');
  assert(modelOpen()||q('.brain-native[data-native-kind="sol"]'),`Native chapter actions ${ch} / ${tab}`);
  assert(q('.brain-location').textContent.includes(tab));
  assert.equal(qa('dialog[open]').length,0,'Assistance keeps the model available');
  if(tab==='work'){
   const action=q('.brain-native .r-menu-actions button,.brain-native .l-sol-actions button');
   if(action){action.click();await waitFor(()=>q('dialog[open]')||!q('.brain-panel:not([hidden])'),'Native action');if(q('dialog[open]'))click('dialog[open] header button');click('[data-brain-launch="design"]');}
  }
  // On the Model tab the chapter model carries its own Sol beside the diagram (chapter-sol.js); selection there is
  // covered by the chapter model suites. The retired canvas this step used to click is gone.
  if(tab==='model')assert(q('.cm, .am-explorer'),`The chapter model or explorer is the Model tab in chapter ${ch}`);
  brain('mind');assert(modelOpen()||q('.brain-native[data-native-kind="mind"]'),`Native patterns ${ch} / ${tab}`);
  assert.equal(qa('dialog[open]').length,0);
  assert.equal(qa('.brain-assistance button').length,3,'Only the three established companions in the bar');
 }
 assert.deepEqual(errors,[]);console.log(`PASS Chapter ${ch}: Sol and Mind native routing across Work, Model, Validate and Output; native task action; three companion controls.`);await w.happyDOM.close();env.DB.close();process.exit(0);
}

assert.equal(qa('.journey-rail > section').length,3);
assert.equal(qa('.brain-assistance [data-brain-action="author"]').length,0);
click('[data-brain-launch="design"]');assert(q('.brain-panel'));assert.equal(qa('dialog[open]').length,0);assert.equal(qa('.brain-modes button').length,2);assert(q('.brain-modes').textContent.includes('Sol'));assert(q('.brain-native'));assert(q('.brain-location').textContent.includes('Chapter'));assert(q('.intel-compose>details')?.open,'Sol opens with the question composer available');
assert(q('.brain-content').firstElementChild.classList.contains('brain-band-sol'),'Sol question and answer precede generic chapter guidance');
assert.equal(q('.brain-project-guidance').open,false,'generic project guidance is available progressively');
assert.match(q('[data-brain-scope]').textContent,/Scope:.*quality|Scope:.*targets/,'object scope and quality-target certainty are visible');
// Sol speaks about this chapter's own record, never one the studio carries from another chapter (round 2, I2-01). The
// heading names the subject by its reference chip (audit/co-design-2026-10-13.json).
if(ch>=5){const carried=q('[data-brain-carried]')?.dataset.brainCarried;assert(carried,`Chapter ${ch}: the studio's carried selection is named`);const ref=q('[data-brain-selected-context]>b').textContent;assert(!/^(LR-001|REQ-001)\b/.test(ref),`Chapter ${ch}: Sol speaks about ${ref}`);}
// Co-design (audit/co-design-2026-10-13.json; formerly Proposals, before that Mind Factory): Sol's panel in its Co-design
// mode explains the chapter's decision, and keeps the one list with a source column under "Drafts and suggestions" and
// the chapter's own explorations under its tools.
brain('mind');assert.equal(q('#brain-title').textContent,'Sol');assert.equal(q('#brain-panel').dataset.role,'mind');assert.match(q('.brain-modes [aria-pressed="true"]').textContent,/^Co-design/);assert(q('[data-co-design-guide]'),'Co-design explains the chapter decision');assert(q('.brain-native[data-native-kind="mind"]'));await waitFor(()=>q('[data-proposals-summary]'),'Proposals list');
assert.match(q('[data-proposals-summary]').textContent,/^(\d+ items? in Chapter \d+: \d+ design suggestions? · \d+ guided tasks? · \d+ questions?\.|No suggestions, tasks or questions available for Chapter \d+ right now\.)/,'the list counts the chapter’s suggestions, tasks and questions');assert(qa('[data-proposal]').every(li=>li.querySelector('.pp-src')&&/^Where it would go/.test(li.querySelector('.pp-where').textContent)),'every row names its source and where it would go');assert.equal(qa('[data-brain-band-coauthor],.brain-band-coauthor').length,0,'the Co-author band is folded into the one list of drafts and suggestions');brain('design');
// Chapter 11's subject is the project with its review (I2-01): there is no record to explain, and the SDD is framed with Chapter 11's own tools.
if(ch===11){assert(!q('[data-brain-action="author"]'),'Chapter 11 offers no record explanation for the project');assert.equal(q('[data-brain-selected-context]>b').textContent,'Project');}else brain('author');
if(!q('[data-brain-action="draft"]')||q('[data-brain-action="draft"]').disabled){brain('close');console.log('PASS Chapter '+ch+': empty-context guidance, co-design/co-author access and navigation retained.');await w.happyDOM.close();process.exit(0);}
brain('draft');await waitFor(()=>store.value.document.coauthoring?.narratives?.length&&!q('.brain-panel[aria-busy="true"]'),'Prepare co-author draft');
assert(q('[data-brain-field="body"]').value.length>100);const initial=q('[data-brain-field="body"]').value;
input('[data-brain-field="body"]',initial+'\n\nUI authoring check.');brain('close');assert(q('.brain-leave'));brain('stay');assert.equal(q('[data-brain-field="body"]').value,initial+'\n\nUI authoring check.');brain('save');await waitFor(()=>q('.brain-panel footer [role="status"]').textContent==='Saved with project','Save co-author text');
brain('review');assert(q('.brain-review'));input('[data-brain-field="reviewer"]','UI reviewer');input('[data-brain-field="reason"]','The model and remaining assumptions are represented.');q('[data-brain-confirm]').checked=true;brain('accept');await waitFor(()=>store.value.document.coauthoring.narratives[0].accepted&&!q('.brain-panel[aria-busy="true"]'),'Accept co-author passage');
assert.match(store.value.document.coauthoring.narratives[0].accepted.body,/UI authoring check/);brain('close');assert(!document.body.classList.contains('brain-open'));await store.load();document.dispatchEvent(new CustomEvent('aiw:external-project'));click('[data-brain-launch="design"]');brain('author');assert.match(q('[data-brain-field="body"]').value,/UI authoring check/);
brain('mind');await waitFor(()=>q('[data-proposals-summary]'),'Proposals list');if(ch>=4&&ch<=7&&q('[data-brain-action="develop"]')){assert(q('[data-proposal-source="task"] [data-brain-action="develop"]'),'the design start is a task row in Proposals');brain('develop');await waitFor(()=>q('.dc-dialog')&&store.value.document.coauthoring.designTasks?.length,'Start contextual design');assert.equal(qa('dialog[open]').length,1);assert(q('.dc-note').textContent||q('[data-dc-answer]'));assert(store.value.document.coauthoring.designTasks[0].knowledge.length===2);click('[data-dc-action="close"]');}
else if([8,9].includes(ch)){brain(ch===8?'exchange':'protection');assert(q('.dc-dialog[open]'),'Native guided task remains available');assert(q(ch===8?'#ex-title':'#pr-title'));click('.dc-dialog header button');}
else brain('close');
assert.equal(errors.length,0,errors.join('\n'));assert.equal(qa('.brain-assistance [data-brain-action="author"]').length,0);console.log('PASS Chapter '+ch+': distinct Sol/Mind, native actions, contextual writing draft/accept/reopen, unsaved protection and guided task entry.');await w.happyDOM.close();
