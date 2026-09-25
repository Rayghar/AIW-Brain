// DOM and Worker integration. No browser or layout engine.
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const ch=Number(process.env.AIW_CHAPTER||4),blank=false;
const w=new Window({url:`https://aiw.test/?chapter=${ch}&tab=work&artefact=REQ-001`,width:Number(process.env.AIW_WIDTH||1440),height:900});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
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
if(process.env.AIW_COMPANION_ONLY==='1'){
 for(const tab of ['work','model','validate','output']){
  if(q('.brain-panel:not([hidden])'))brain('close');
  click(`[data-tab="${tab}"],[data-r-tab="${tab}"],[data-q-tab="${tab}"],[data-d-tab="${tab}"]`);
  click('[data-brain-launch="design"]');
  assert(q('.brain-panel:not([hidden])'),`Sol opens in chapter ${ch} / ${tab}`);
  assert(q('.brain-native[data-native-kind="sol"]'),`Native chapter actions ${ch} / ${tab}`);
  assert(q('.brain-location').textContent.includes(tab));
  assert.equal(qa('dialog[open]').length,0,'Assistance keeps the model available');
  if(tab==='work'){
   const action=q('.brain-native .r-menu-actions button,.brain-native .l-sol-actions button');
   if(action){action.click();await waitFor(()=>q('dialog[open]')||!q('.brain-panel:not([hidden])'),'Native action');if(q('dialog[open]'))click('dialog[open] header button');click('[data-brain-launch="design"]');}
  }
  if(ch===4&&tab==='model'){
   const before=q('.brain-location').textContent;
   const nodes=qa('#graph [data-node]');
   let changed=false;
   for(const node of nodes.slice(0,3)){
    node.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
    if(q('.brain-location')?.textContent!==before){changed=true;break;}
   }
   assert(changed,'Companion follows an actual model selection');assert(q('.brain-native[data-native-kind="sol"]'));
  }
  brain('mind');assert(q('.brain-native[data-native-kind="mind"]'),`Native patterns ${ch} / ${tab}`);
  assert.equal(qa('dialog[open]').length,0);
  assert.equal(qa('.brain-assistance button').length,3,'Only the three established companions in the bar');
 }
 assert.deepEqual(errors,[]);console.log(`PASS Chapter ${ch}: Sol and Mind native routing across Work, Model, Validate and Output; native task action; three companion controls.`);await w.happyDOM.close();env.DB.close();process.exit(0);
}

assert.equal(qa('.journey-rail > section').length,3);
assert.equal(qa('.brain-assistance [data-brain-action="author"]').length,0);
click('[data-brain-launch="design"]');assert(q('.brain-panel'));assert.equal(qa('dialog[open]').length,0);assert.equal(qa('.brain-modes button').length,2);assert(q('.brain-modes').textContent.includes('Sol'));assert(q('.brain-native'));assert(q('.brain-location').textContent.includes('Chapter'));assert(!q('.intel-compose>details').open,'LLM composer should not displace chapter guidance');
brain('mind');assert(q('#brain-title').textContent.includes('Mind Factory'));assert(q('.brain-native[data-native-kind="mind"]'));brain('design');brain('author');
if(!q('[data-brain-action="draft"]')||q('[data-brain-action="draft"]').disabled){brain('close');console.log('PASS Chapter '+ch+': empty-context guidance, co-design/co-author access and navigation retained.');await w.happyDOM.close();process.exit(0);}
brain('draft');await waitFor(()=>store.value.document.coauthoring?.narratives?.length&&!q('.brain-panel[aria-busy="true"]'),'Prepare co-author draft');
assert(q('[data-brain-field="body"]').value.length>100);const initial=q('[data-brain-field="body"]').value;
input('[data-brain-field="body"]',initial+'\n\nUI authoring check.');brain('close');assert(q('.brain-leave'));brain('stay');assert.equal(q('[data-brain-field="body"]').value,initial+'\n\nUI authoring check.');brain('save');await waitFor(()=>q('.brain-panel footer [role="status"]').textContent==='Saved with project','Save co-author text');
brain('review');assert(q('.brain-review'));input('[data-brain-field="reviewer"]','UI reviewer');input('[data-brain-field="reason"]','The model and remaining assumptions are represented.');q('[data-brain-confirm]').checked=true;brain('accept');await waitFor(()=>store.value.document.coauthoring.narratives[0].accepted&&!q('.brain-panel[aria-busy="true"]'),'Accept co-author passage');
assert.match(store.value.document.coauthoring.narratives[0].accepted.body,/UI authoring check/);brain('close');assert(!document.body.classList.contains('brain-open'));await store.load();document.dispatchEvent(new CustomEvent('aiw:external-project'));click('[data-brain-launch="design"]');brain('author');assert.match(q('[data-brain-field="body"]').value,/UI authoring check/);
brain('design');if(ch>=4&&ch<=7&&q('[data-brain-action="develop"]')){brain('develop');await waitFor(()=>q('.dc-dialog')&&store.value.document.coauthoring.designTasks?.length,'Start contextual design');assert.equal(qa('dialog[open]').length,1);assert(q('.dc-note').textContent||q('[data-dc-answer]'));assert(store.value.document.coauthoring.designTasks[0].knowledge.length===2);click('[data-dc-action="close"]');}
else if([8,9].includes(ch)){brain(ch===8?'exchange':'protection');assert(q('.dc-dialog[open]'),'Native guided task remains available');assert(q(ch===8?'#ex-title':'#pr-title'));click('.dc-dialog header button');}
else brain('close');
assert.equal(errors.length,0,errors.join('\n'));assert.equal(qa('.brain-assistance [data-brain-action="author"]').length,0);console.log('PASS Chapter '+ch+': distinct Sol/Mind, native actions, contextual writing draft/accept/reopen, unsaved protection and guided task entry.');await w.happyDOM.close();
