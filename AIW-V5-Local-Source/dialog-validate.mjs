// The dialog primitive and the studio helpers, in a DOM without a browser (audit F2-02, F2-03, F2-04, F2-10,
// F2-12, F2-13, F2-24): a dialog makes the page inert, keeps Tab inside, routes Escape through one cancel
// path, and returns focus to its opener found again by its data attributes after a re-render, or to the
// saved record's row; busy states name what the person waits for; invalid fields get inline messages; lists
// page at 50 with "Show all"; per-document memoisation lives exactly one revision; preference keys are scoped
// per project, the reference project included, with migration and cleanup; the store sends commands one at
// a time and refuses to save while behind; off-screen SVG nodes are hidden only above the culling threshold.
// Needs happy-dom (a pinned development dependency). Run: npm run test:dialog
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const w=new Window({url:'https://aiw.test/?chapter=4&tab=work',width:1440,height:900});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','KeyboardEvent','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])if(w[key]!==undefined)Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
w.document.body.innerHTML='<div id="app"><main><button type="button" data-l-action="edit-group" data-l-id="GRP-002">Edit group</button><button type="button" class="l-record-title" data-select="lr-007">Row</button></main></div><div id="toast"></div>';
const checks=[];const pass=n=>{checks.push(n);console.log('PASS',n);};
const q=s=>document.querySelector(s);
const tick=()=>new Promise(r=>setTimeout(r,0));

const {openDialog,closeDialog,rememberOpener,returnFocus,setDialogBusy,validateForm,fieldMessage,releaseStaleInert,canLeaveStep}=await import(pathToFileURL(root+'/public/dialog.js'));
// 1. Opening: inert outside, focus inside, Escape goes through onCancel, close restores the opener's focus.
const opener=q('[data-l-action="edit-group"]');opener.focus();
let cancels=0;
const d=openDialog({className:'dialog l-dialog test-dialog',labelledBy:'t-title',html:'<header><h2 id="t-title">Edit</h2><button type="button" data-dialog-close>×</button></header><div id="t-error" class="l-error" role="alert" hidden></div><form id="t-form"><label class="l-field"><span>Name</span><input name="title" required maxlength="20"></label><label class="l-field"><span>Purpose</span><textarea name="purpose"></textarea></label><button type="submit" class="btn primary">Save</button></form>',onCancel:()=>{cancels++;closeDialog(d);}});
assert.equal(q('#app').hasAttribute('inert'),true,'the page is inert behind the dialog');
assert.equal(q('#toast').hasAttribute('inert'),true);
assert.equal(d.hasAttribute('inert'),false);
assert.equal(d.querySelector('form').noValidate,true,'forms validate programmatically');
assert.equal(document.activeElement,d.querySelector('[name="title"]'),'the first field takes focus');
assert.deepEqual(d.opener.data,[['lAction','edit-group'],['lId','GRP-002']],'the opener is remembered by its data attributes');
pass('A dialog makes the page inert, gives focus to its first field and remembers its opener');
// 2. Tab stays inside the dialog.
d.querySelector('button[type="submit"]').focus();
d.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
assert.equal(document.activeElement,d.querySelector('[data-dialog-close]'),'Tab from the last control wraps to the first');
d.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
assert.equal(document.activeElement,d.querySelector('button[type="submit"]'),'Shift+Tab from the first control wraps to the last');
pass('Tab and Shift+Tab stay inside the open dialog');
// 3. Busy states and the error slot.
setDialogBusy(d,'review');
assert.equal(d.querySelector('[data-dialog-status]').textContent,'Awaiting your review');
assert.equal(d.querySelector('button[type="submit"]').disabled,true);
setDialogBusy(d,'saving');assert.equal(d.querySelector('[data-dialog-status]').textContent,'Saving…');
setDialogBusy(d,false);assert.equal(d.querySelector('[data-dialog-status]').hidden,true);assert.equal(d.querySelector('button[type="submit"]').disabled,false);assert.equal(d.dataset.busy,'');
pass('A dialog names what the person waits for and frees its controls afterwards');
// 4. Programmatic validation with inline messages.
const form=d.querySelector('form');
assert.equal(validateForm(form),false,'an empty required field fails');
const title=form.elements.title;
assert.equal(title.getAttribute('aria-invalid'),'true');
assert.ok(document.getElementById(title.getAttribute('aria-describedby'))?.classList.contains('field-message'),'the message sits beside the field');
assert.equal(document.activeElement,title,'the invalid field takes focus');
title.value='Named';
assert.equal(validateForm(form),true);
assert.equal(title.hasAttribute('aria-invalid'),false);assert.equal(form.querySelectorAll('.field-message').length,0,'messages are cleared when the form is valid');
fieldMessage(title,'Custom rule');assert.equal(form.querySelector('.field-message').textContent,'Custom rule');
let submitted=0;form.addEventListener('submit',e=>{e.preventDefault();submitted++;});
title.value='';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
assert.equal(submitted,0,'an invalid form never reaches the opener\'s submit handler');assert.equal(title.getAttribute('aria-invalid'),'true');
title.value='Named';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));assert.equal(submitted,1,'a valid form is submitted');assert.equal(title.hasAttribute('aria-invalid'),false);
const wizard=document.createElement('form');wizard.innerHTML='<div data-a-panel="0"><label class="l-field"><span>Name</span><input name="title" required></label></div><div data-a-panel="1" hidden><label class="l-field"><span>Owner</span><input name="owner" required></label></div>';d.append(wizard);
assert.equal(canLeaveStep(wizard,'data-a-panel',1),false,'a wizard does not move past a step with an invalid field');assert.equal(wizard.elements.title.getAttribute('aria-invalid'),'true');
wizard.elements.title.value='Named';assert.equal(canLeaveStep(wizard,'data-a-panel',1),true);assert.equal(wizard.elements.title.hasAttribute('aria-invalid'),false);
wizard.children[0].hidden=true;wizard.children[1].hidden=false;assert.equal(canLeaveStep(wizard,'data-a-panel',0),true,'moving back never validates');wizard.remove();
pass('Invalid fields are announced inline, block the submit and are cleared when they become valid; wizard steps check the step being left');
// 5. Escape routes through onCancel; closing restores focus and releases inert.
d.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
assert.equal(cancels,1,'Escape went through the cancel path once');
assert.equal(d.isConnected,false,'the dialog is gone');
assert.equal(q('#app').hasAttribute('inert'),false,'the page is live again');
assert.equal(document.activeElement,opener,'focus returned to the opener');
pass('Escape goes through one cancel path; closing releases inert and returns focus to the opener');
// 6. After a re-render replaces the opener, focus returns to the same control found again, else to the record's row.
const remembered=rememberOpener(opener);
q('#app').innerHTML='<main><button type="button" data-l-action="edit-group" data-l-id="GRP-001">Other</button><button type="button" data-l-action="edit-group" data-l-id="GRP-002">Edit group</button><button type="button" class="l-record-title" data-select="lr-007">Row</button></main>';
assert.equal(returnFocus(remembered),q('[data-l-id="GRP-002"]'),'the opener is found again by its data attributes');
assert.equal(document.activeElement,q('[data-l-id="GRP-002"]'));
q('#app').innerHTML='<main><button type="button" class="l-record-title" data-select="lr-007">Row</button><button type="button" data-l-action="new">New</button></main>';
assert.equal(returnFocus(remembered,{ids:['lr-007'],attributes:['data-select','data-l-id']}),q('[data-select="lr-007"]'),'without the opener, the saved record\'s row takes focus');
assert.equal(returnFocus(remembered,{ids:['missing'],attributes:['data-select'],fallbacks:['[data-l-action="new"]']}),q('[data-l-action="new"]'),'else the fallback');
assert.equal(returnFocus(null,{}),null,'nothing to focus is reported, not thrown');
pass('Focus returns to the opener re-found after a re-render, else to the saved record\'s row, else to a fallback');
// 7. A dialog removed by hand still releases its inert marks when the next one opens or when asked.
const d2=openDialog({className:'test-dialog',html:'<p>By hand</p>',onCancel:()=>closeDialog(d2)});
assert.equal(q('#app').hasAttribute('inert'),true);
d2.remove();await tick();releaseStaleInert();
assert.equal(q('#app').hasAttribute('inert'),false,'a dialog removed by hand leaves no inert behind');
const d3=openDialog({className:'test-dialog',html:'<p>Native close</p>',onCancel:()=>closeDialog(d3)});
d3.close();assert.equal(q('#app').hasAttribute('inert'),false,'a native close releases inert');d3.remove();
pass('Inert marks are released when a dialog leaves the DOM by another route');

// 8. Paging and per-document memoisation.
const {pageOf,showAllOf,pagerHTML,perDocument,PAGE_SIZE}=await import(pathToFileURL(root+'/public/studio-kit.js'));
const items=Array.from({length:120},(_,i)=>({id:'r'+i}));
let page=pageOf(items,'test:list');assert.equal(page.rows.length,PAGE_SIZE);assert.equal(page.hidden,70);assert.equal(page.total,120);
assert.match(pagerHTML(page,'data-x-action'),/<button type="button" class="btn" data-x-action="show-all" data-list="test:list">Show all 120<\/button>.*first 50 of 120/,'the pager control carries the studio\'s own action attribute and the list key');
assert.equal(pageOf(items.slice(0,50),'short').hidden,0);assert.equal(pagerHTML(pageOf(items.slice(0,50),'short'),'data-x-action'),'');
showAllOf('test:list');page=pageOf(items,'test:list');assert.equal(page.rows.length,120);assert.equal(page.hidden,0);
const {settleDocument,isSettled}=await import(pathToFileURL(root+'/public/document-memo.js'));
let computed=0;const derived=perDocument((p,k)=>{computed++;return p.n*10+(k?1:0);});
const docA=settleDocument({n:1}),docB=settleDocument({n:2}),draft={n:3};
assert.equal(derived(docA),10);assert.equal(derived(docA),10);assert.equal(computed,1,'a settled document computes once');
assert.equal(derived(docA,'k'),11);assert.equal(computed,2,'a different key computes again');
assert.equal(derived(docB),20);assert.equal(computed,3,'a new document (revision) computes again');
assert.equal(derived(draft),30);draft.n=4;assert.equal(derived(draft),40,'a document that is not settled is never cached');assert.equal(computed,5);
// The domain snapshots: on a settled store document they are computed once; a copy that a command changes is
// never settled, so a change to a capability's sources shows at once (no stale snapshot reaches a command).
const {createProject}=await import(pathToFileURL(root+'/shared/projects-domain.js'));
const {capabilityChanged,technologySources}=await import(pathToFileURL(root+'/public/technology-domain.js'));
const {workingBasis}=await import(pathToFileURL(root+'/public/workbench-domain.js'));
const stored=settleDocument(JSON.parse(JSON.stringify(createProject({name:'Memo check',template:'bank-payment'},'memo-check'))));
const capability=stored.technology.capabilities.find(c=>technologySources(stored,c.id).needs.length);
assert.ok(capability,'a capability with needs');
const before=capabilityChanged(stored,capability);
const copy=structuredClone(stored);assert.equal(isSettled(copy),false);
const need=copy.technology.needs.find(n=>technologySources(copy,capability.id).needs.some(x=>x.id===n.id));
assert.equal(capabilityChanged(copy,copy.technology.capabilities.find(c=>c.id===capability.id)),before);
need.description+=' (edited)';
assert.equal(capabilityChanged(copy,copy.technology.capabilities.find(c=>c.id===capability.id)),true,'a changed need is seen at once on an unsettled copy');
assert.equal(capabilityChanged(stored,capability),before,'the settled document keeps its own answer');
const basis=workingBasis(copy);copy.logical.groups[0].title+=' (edited)';assert.notEqual(workingBasis(copy),basis,'the working basis of a changing copy follows the change');
assert.equal(workingBasis(stored),workingBasis(stored));
const {inheritedFindings}=await import(pathToFileURL(root+'/public/review-domain.js'));
const lazy=inheritedFindings(stored),eager=inheritedFindings(structuredClone(stored));
assert.ok(lazy.length>0&&lazy.length===eager.length);
assert.equal(Object.getOwnPropertyDescriptor(lazy[0],'stamp').get!==undefined,true,'a settled document\'s findings stamp on first read');
assert.equal(Object.getOwnPropertyDescriptor(eager[0],'stamp').value.length,16,'any other document is stamped at once');
assert.deepEqual(JSON.parse(JSON.stringify(lazy)),JSON.parse(JSON.stringify(eager)),'lazy stamps read exactly as eager ones (JSON)');
assert.equal({...lazy.at(-1)}.stamp,eager.at(-1).stamp,'and through a spread');
pass('Lists page at 50 with "Show all"; derived data is computed once per settled document and key, never for a document that can still change');

// 9. Field descriptors: one vocabulary, unique form ids, rendered fields carry their constraints.
const {RECORD_FIELDS,FORM_IDS,fieldsFor,fieldHTML,vocabulary}=await import(pathToFileURL(root+'/public/record-fields.js'));
const ids=Object.values(FORM_IDS);assert.equal(new Set(ids).size,ids.length,'every record type has its own form id');
for(const [command,fields] of Object.entries(RECORD_FIELDS)){assert.ok(fields.length,command);for(const f of fields){assert.ok(f.name&&f.label&&f.kind,command+' '+f.name);}assert.equal(new Set(fields.map(f=>f.name)).size,fields.length,command+' names are unique');}
const vocab=vocabulary();
for(const [synonym,canonical] of [['description','purpose'],['reason','rationale'],['notes','rationale'],['statement','purpose'],['outcome','status']])assert.ok(!vocab.has(synonym)||synonym==='description'&&vocab.get(synonym).every(c=>c==='interfaces.field'),`${synonym} is spelt ${canonical} across the studios`);
const html=fieldHTML(fieldsFor('logical.group')[0],'<b>Ops</b>');
assert.match(html,/<input type="text" name="title" required aria-required="true" maxlength="120" value="&lt;b&gt;Ops&lt;\/b&gt;">/);
assert.match(fieldHTML(fieldsFor('logical.connection').find(f=>f.name==='kind'),'flow'),/<option value="flow" selected>/);
// The kit (round 11): a field by record type carries its help as its description, a picker offers the project's
// stakeholders as a datalist and keeps free text, a decision's assumption picker lists Chapter 1's assumption records,
// a per-item field is named by its item, and a confirmation box is drawn the same way.
const {recordField,checkHTML,EVIDENCE_RECORD_TYPES}=await import(pathToFileURL(root+'/public/record-fields.js'));
const project={artefacts:[{id:'STK-001',type:'stakeholder',title:'Head of Payments'},{id:'ASM-001',type:'assumption',title:'The enquiry contract exists',confirmed:false},{id:'REQ-001',type:'requirement',title:'Submit'}]};
const purpose=recordField('logical.responsibility','purpose','Owns the hold');
assert.match(purpose,/<textarea name="purpose" maxlength="4000" aria-describedby="(field-help-\d+)">Owns the hold<\/textarea><small class="field-help" id="\1">The behaviour this responsibility owns for the requirements it serves\.<\/small>/,'a field is described by its help');
const owner=recordField('artefact','owner','',{project});
assert.match(owner,/<input type="text" name="owner" maxlength="180" placeholder="Unassigned" aria-describedby="field-help-\d+" list="(field-list-\d+)" value=""><datalist id="\1" data-picker="stakeholder"><option value="Head of Payments">STK-001<\/option><\/datalist>/,'the owner offers the stakeholders and stays free text');
assert.match(recordField('decision.save','assumptionIds',['ASM-001'],{project}),/<fieldset class="l-checks"><legend>Assumptions recorded in Chapter 1<\/legend><label><input type="checkbox" name="assumptionIds" value="ASM-001" checked><span><b>ASM-001<\/b> The enquiry contract exists<small>Unconfirmed<\/small><\/span><\/label><\/fieldset>/,'a decision offers the assumption records as linked ids');
assert.match(recordField('decision.alternative','effect','tension',{item:'QD-001',label:'Effect on QD-001',options:[['supports','Supports'],['tension','Tension']]}),/<label class="l-field"><span>Effect on QD-001<\/span><select name="effect:QD-001"><option value="supports">Supports<\/option><option value="tension" selected>Tension<\/option><\/select><\/label>/,'a per-item field is named by its item');
assert.equal(checkHTML('acknowledge','I acknowledge the open findings.',{required:true}),'<label class="l-checkbox"><input type="checkbox" name="acknowledge" required aria-required="true">I acknowledge the open findings.</label>');
for(const command of EVIDENCE_RECORD_TYPES)assert.ok(FORM_IDS[command]&&RECORD_FIELDS[command],command+' is a described form');
pass('The kit draws a field with its help as its description, the stakeholder and assumption pickers from the project, a per-item field by its item, and a confirmation box; every evidence form is described');
pass('Record types share one field vocabulary, unique form ids and descriptor-rendered fields');
// rc41 close: the contract editor posts the execution agreement as execution.<key> (interfaces-ui.js); every field the
// contract defines (composition-manifest.js EXECUTION_FIELDS) is described, with the manifest's own label, kind,
// choices and limits, a help sentence, and no spark or draft (declarations are never inferred).
{
 const {EXECUTION_FIELDS}=await import(pathToFileURL(root+'/public/composition-manifest.js'));
 const {fieldHelp,formFieldsMatch}=await import(pathToFileURL(root+'/public/record-fields.js'));
 const {sparkFields}=await import(pathToFileURL(root+'/public/field-suggestions.js'));
 const described=fieldsFor('interfaces.contract').filter(d=>d.name.startsWith('execution.'));
 assert.deepEqual(described.map(d=>d.name),EXECUTION_FIELDS.map(f=>'execution.'+f.key),'one descriptor per execution field, in the contract\'s order');
 for(const f of EXECUTION_FIELDS){const d=described.find(x=>x.name==='execution.'+f.key),kind=f.type==='number'?'number':f.type==='field'?'text':'select';
  assert.deepEqual([d.label,d.kind,d.measure],[f.label,kind,true],d.name+': the contract\'s label and kind, never drafted');
  if(f.options)assert.deepEqual(d.options,f.options,d.name+': the contract\'s choices');
  if(f.type==='number')assert.deepEqual([d.min,d.max,d.step],[f.min,f.max,f.integer?'1':'any'],d.name+': the contract\'s limits');
  assert.match(fieldHelp('interfaces.contract',d.name),/^[A-Z].{20,}\.$/,d.name+': a help sentence');}
 assert.deepEqual(sparkFields('interfaces.contract').filter(d=>d.name.startsWith('execution.')),[],'no execution declaration is offered a spark or a draft');
 assert.deepEqual(formFieldsMatch('interfaces.contract',[...fieldsFor('interfaces.contract').filter(d=>!d.proposalOnly).map(d=>d.name)]).undescribed,[]);
 assert.deepEqual(formFieldsMatch('interfaces.contract',EXECUTION_FIELDS.map(f=>'execution.'+f.key)).undescribed,[],'the execution controls the contract editor posts are described');
}
pass('rc41 close: the contract\'s execution agreement is described field by field from the manifest (label, kind, choices, limits, help), never drafted');
// rc41 close: a picker's Find box, the control a person types in, is described by the picker's help: the requirements
// a record answers (one joined value) and a long ids list drawn as a picker alike.
{
 const describedBy=html=>{const find=html.match(/<input type="search" data-pick-find[^>]*>/)?.[0]||'',id=find.match(/aria-describedby="([^"]+)"/)?.[1];return id?html.match(new RegExp(`<(?:p|small) class="field-help" id="${id}">([^<]*)<`))?.[1]||'':'';};
 const grounded=recordField('security.threat','grounds','REQ-001',{project});
 assert.equal(describedBy(grounded),'Choose the requirements and groups this record answers. Existing links stay selected when you search.','the grounds picker\'s Find box is described by its help');
 const many=Array.from({length:31},(_,i)=>['LR-'+String(i+1).padStart(3,'0'),'Record '+(i+1)]);
 assert.equal(describedBy(fieldHTML({name:'linked',label:'Linked records',kind:'ids'},[],{options:many,help:'Choose the records it links.'})),'Choose the records it links.','a long ids list\'s Find box is described by its help');
 assert.doesNotMatch(fieldHTML({name:'linked',label:'Linked records',kind:'ids'},[],{options:many}),/data-pick-find[^>]*aria-describedby/,'no help, no dangling description');
}
pass('rc41 close: a picker\'s Find box is described by the picker\'s help');

// 10. Preference keys are scoped per project, the reference project included; migration and cleanup work.
localStorage.clear();
localStorage.setItem('aiw-v5-explorer-v1','{"chapter":4}');localStorage.setItem('aiw-lens-position-v1','{"4":"bottom"}');localStorage.setItem('aiw-anatomy-v1:other-project','{}');localStorage.setItem('aiw-project-location:gone-project','/?chapter=4');
const pc=await import(pathToFileURL(root+'/public/project-context.js'));
assert.equal(pc.activeProjectId,'bank-payment');
assert.equal(pc.projectPreferenceKey('aiw-v5-explorer-v1'),'aiw-v5-explorer-v1:bank-payment','the reference project reads a scoped key');
assert.equal(localStorage.getItem('aiw-v5-explorer-v1:bank-payment'),'{"chapter":4}','the pre-scoping row was moved');
assert.equal(localStorage.getItem('aiw-v5-explorer-v1'),null);
assert.equal(localStorage.getItem('aiw-lens-position-v1'),'{"4":"bottom"}','a key that is global by design is left alone');
assert.equal(pc.forgetProjectPreferences('other-project'),1);assert.equal(localStorage.getItem('aiw-anatomy-v1:other-project'),null);
assert.equal(pc.pruneProjectPreferences(['bank-payment']),1,'rows of projects that no longer exist are removed');
assert.equal(localStorage.getItem('aiw-project-location:gone-project'),null);
assert.equal(localStorage.getItem('aiw-v5-explorer-v1:bank-payment'),'{"chapter":4}','the live project keeps its rows');
pass('Preferences are scoped per project including the reference project; stale rows are migrated or removed');

// 11. The store sends commands one at a time, with the revision the previous save produced, and refuses while behind.
const calls=[];let revision=3;
let accessRole='owner',accessCalls=0,notices=0,sectionsAnswered=0;
globalThis.fetch=async(url,options={})=>{const path=String(url);if(path.endsWith('/api/access')){accessCalls++;return new Response(JSON.stringify({actor:'t',role:accessRole,owner:'t',members:[]}),{status:200});}if(path.includes('/api/knowledge/corpus')){notices++;return new Response('{}',{status:200});}if(path.endsWith('/api/project'))return new Response(JSON.stringify({document:{id:'bank-payment',name:'Ref',untouched:{kept:true},dropped:1},revision}),{status:200});const body=JSON.parse(options.body);calls.push(body.revision);await new Promise(r=>setTimeout(r,15));if(body.revision!==revision)return new Response(JSON.stringify({error:'conflict'}),{status:409});revision++;
  // The server answers ?response=sections with the changed sections only: `rev` replaced, `dropped` removed.
  if(!path.includes('response=sections'))throw Error('the store asks for sections');sectionsAnswered++;return new Response(JSON.stringify({sections:{rev:revision,dropped:null},revision,updatedAt:'t'+revision,selected:'x-'+revision}),{status:200});};
delete window.aiwReviewOrdinaryChange;
const {createProjectStore}=await import(pathToFileURL(root+'/public/project-store.js'));
const store=createProjectStore();await store.load();
const details=[];document.addEventListener('aiw:project-command',e=>details.push(e.detail));
const [a,b]=await Promise.all([store.command({type:'logical.group',payload:{title:'A'}}),store.command({type:'logical.group',payload:{id:'GRP-001',title:'B'}})]);
assert.deepEqual(calls,[3,4],'the second command carried the revision the first save produced');
assert.equal(a.revision,4);assert.equal(b.revision,5);assert.equal(store.value.revision,5);
assert.equal(sectionsAnswered,2);assert.deepEqual(store.value.document,{id:'bank-payment',name:'Ref',untouched:{kept:true},rev:5},'the changed sections were merged into the held document; a null section was removed; untouched sections kept');
assert.deepEqual(Object.keys(b).sort(),['document','revision','selected','updatedAt'],'callers still receive {document, selected, revision, updatedAt}');
assert.equal(notices,1,'an owner applies due notices before reading');
assert.deepEqual(details.map(d=>[d.type,d.ids,d.revision]),[['logical.group',['x-4'],4],['logical.group',['GRP-001','x-5'],5]],'each save announces what changed');
// Another tab of this browser saves a newer revision: this tab is behind, refuses to send (no request leaves),
// says so as a conflict, and saves again once the latest project is loaded.
assert.equal(store.status,'saved');
const otherTab=new BroadcastChannel('aiw-project:bank-payment');otherTab.postMessage({revision:99});
for(let i=0;i<50&&store.status!=='behind';i++)await new Promise(r=>setTimeout(r,5));
otherTab.close();
assert.equal(store.status,'behind','a newer revision from another tab marks this tab behind');
const sent=calls.length;
const refused=await store.command({type:'logical.group',payload:{title:'Stale'}}).then(()=>null,e=>e);
assert.ok(refused&&refused.conflict===true&&refused.behind===true,'the save is refused as a conflict');
assert.match(refused.message,/newer version .* another tab\. Load the latest project/);
assert.equal(calls.length,sent,'nothing was sent while behind');
await store.load();assert.equal(store.status,'saved');
const c=await store.command({type:'logical.group',payload:{title:'C'}});assert.equal(c.revision,6,'after loading the latest project the save goes through');
const {appliesNotices}=await import(pathToFileURL(root+'/public/project-store.js'));
assert.deepEqual(['owner','editor','reviewer','viewer',null].map(appliesNotices),[true,true,false,false,true],'viewers and reviewers do not send the notices POST the server would refuse');
assert.equal(store.role,'owner','the reference project is the caller\'s own');assert.equal(accessCalls,0,'and its role is not asked of /api/access, which would answer 404 before its first read');
pass('Commands are queued, merge the sections the server answers with, announce their change detail, are refused while another tab is ahead; notices are applied only by owners and editors');

// 12. SVG culling in the model stage only above the threshold, and never for HTML cards.
const {modelStage}=await import(pathToFileURL(root+'/public/model-stage.js'));
const host=document.createElement('div');host.innerHTML='<div class="cm"><div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div><div class="cm-stage" style="width:1000px;height:600px"><div class="cm-world"><svg class="cm-svg"></svg><div class="cm-html"></div></div></div></div>';document.body.append(host);
const svg=host.querySelector('.cm-svg');
const addNodes=n=>{svg.innerHTML='';for(let i=0;i<n;i++){const g=document.createElementNS('http://www.w3.org/2000/svg','g');const x=i*100;g.getBBox=()=>({x,y:10,width:60,height:20});svg.append(g);}};
Object.defineProperty(host.querySelector('.cm-stage'),'clientWidth',{value:1000});Object.defineProperty(host.querySelector('.cm-stage'),'clientHeight',{value:600});
const stage=modelStage(host.querySelector('.cm'),{headHeight:()=>0,railWidth:()=>0,cullFrom:10});
stage.use({W:50000,H:600},'k');stage.cam.z=1;
addNodes(5);stage.cull();assert.equal([...svg.children].filter(g=>g.style.visibility==='hidden').length,0,'below the threshold nothing is culled');
addNodes(40);stage.cull();
const hidden=[...svg.children].filter(g=>g.style.visibility==='hidden').length;
assert.ok(hidden>0&&hidden<40,`nodes beyond the stage plus a margin are hidden (${hidden} of 40)`);
assert.equal(svg.children[0].style.visibility,'','a node in view stays visible');
stage.cam.px=-3000;stage.cull();assert.equal(svg.children[0].style.visibility,'hidden','panning away hides the first node');assert.equal(svg.children[30].style.visibility,'','and shows the ones now in view');
addNodes(5);stage.cull();assert.equal([...svg.children].filter(g=>g.style.visibility==='hidden').length,0,'a smaller model releases every cull');
pass('Off-screen SVG nodes are hidden only above the culling threshold and follow the camera');

console.log(`\n${checks.length} checks passed.`);
await w.happyDOM.close();
