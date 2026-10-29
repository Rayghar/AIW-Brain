import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const window = new Window({url:'http://fixture.local/?chapter=9&tab=model'});
Object.assign(globalThis,{window,document:window.document,location:window.location,CustomEvent:window.CustomEvent,MouseEvent:window.MouseEvent,requestAnimationFrame:cb=>queueMicrotask(cb)});
const {modelChrome,modelLabelEntries,toolsHTML} = await import('./public/model-stage.js');
document.body.innerHTML = `<section class="cm" data-chapter="9"><header class="cm-top"><div class="cm-actions"><label class="dk-environment">Environment<select><option>Production</option></select></label></div></header><div class="cm-bar"><div class="cm-lenses"></div><div class="cm-depth"><label class="sm-journey-picker">Journey<select><option>First journey</option></select></label></div><label class="cm-scn">Design scenario<select><option>Recorded zone failure</option></select></label></div><div class="cm-stage"><div class="cm-world"></div></div><footer class="cm-walk"><div class="cm-walk-in"><label class="tm-journey">Journey<select><option>Payment handoff</option></select></label></div>${toolsHTML('fixture')}</footer></section>`;
const root = document.querySelector('.cm'), selects = [...root.querySelectorAll('select')], locations = selects.map(s=>s.parentElement.parentElement); let changed=0,writes=0;
window.aiwProjectStore = {command:()=>writes++}; root.addEventListener('change',()=>changed++);
modelChrome(root);
assert.equal(root.querySelectorAll('.cm-picture').length,0, 'shared chrome does not invent or relocate another toolbar');
selects.forEach((control,i)=>assert.equal(control.parentElement.parentElement,locations[i], 'view-owned commands keep stable source hosts'));
selects[0].dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(changed,1,'the original select keeps its delegated action');
root.remove(); modelChrome(root); document.body.append(root);
selects.forEach((control,i)=>assert.equal(control.parentElement.parentElement,locations[i], 'detach and return preserve actionable controls'));
root.querySelector('.cm-depth').innerHTML='<label class="sm-journey-picker">Journey<select><option>Updated journey</option></select></label>';
modelChrome(root);assert.equal(root.querySelectorAll('.sm-journey-picker').length,1);assert.match(root.querySelector('.cm-depth').textContent,/Updated journey/);
assert.equal(root.querySelectorAll('[data-model-export]').length,3,'one export menu retains all visible-view formats');
assert.equal(root.querySelectorAll('.cm-zoom').length,1,'one footer owns the camera controls');
assert.equal(root.querySelector('.cm-reading-caption'),null,'no duplicate reading row is inserted');
const full='Responsibility R-123 Preserve the complete deliberately long payment-state consistency label without an ellipsis or an inferred outcome';
root.querySelector('.cm-world').innerHTML=`<div data-card="R-123" tabindex="0" role="button" aria-label="${full}" style="width:20px;overflow:hidden">short drawing</div><div data-card="hidden" class="nt-layer-off" aria-label="Excluded layer"></div><svg><g data-nt-node="N-1" aria-label="Full node label"><text>Short</text></g><path data-nt-edge="E-1" aria-label="Complete recorded relationship label"></path></svg>`;
const labels=modelLabelEntries(root);assert.equal(labels.length,3);assert.equal(labels[0].text,full);assert.ok(!labels.some(x=>x.id==='hidden'),'hidden model layers do not enter the label list');
let selected=0;labels[0].node.addEventListener('click',()=>selected++);
root.querySelector('[data-model-labels]').click();let dialog=document.querySelector('.cm-label-reader');assert.ok(dialog.open);assert.match(dialog.textContent,/overview scale/);assert.match(dialog.querySelector('.cm-label-list').textContent,/deliberately long payment-state consistency/);
dialog.querySelector('input').value='R-123';dialog.querySelector('input').dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(dialog.querySelectorAll('[data-label-index]').length,1);dialog.querySelector('[data-label-index]').click();assert.equal(selected,1);assert.equal(writes,0,'picture controls and full-label navigation never issue a project command');
// rc41 close: the chapter's one state line stands in the shell footer beside its Next task while the Model tab is open (in
// the Model's own footer it pushed the tools to a second row): written by every draw of the view on the stage, once, the
// chapter's records state; it follows the records, survives the next task's redraw and leaves with the chapter's state.
{
  const {placeChapterState} = await import('./public/model-stage.js'), {chapterStateHTML} = await import('./public/chapter-strip.js'), {esc} = await import('./public/html-escape.js'), {chapterRecordsState} = await import('./public/work-frame.js');
  const {createProject} = await import('./shared/projects-domain.js'), {settleDocument} = await import('./public/document-memo.js');
  const p = settleDocument(structuredClone(createProject({name:'Footer', template:'bank-payment'}, 'footer-fixture'))), store = window.aiwProjectStore; store.value = {document:p};
  const shellFooter = '<button type="button" class="workspace-next" data-action="next"><span>Next task</span><strong id="next-text">Confirm the threat model</strong></button><p class="footer-state"><span id="guidance-source">Rule-based guidance</span></p>';
  document.body.insertAdjacentHTML('beforeend', `<main id="workspace" class="main"><section class="studio" id="studio-surface"><div class="stage tab-content"></div></section><footer class="footer">${shellFooter}</footer></main>`);
  document.body.dataset.workspaceTab = 'model';
  const host = document.querySelector('.studio > .stage.tab-content'), footer = document.querySelector('#workspace > .footer'), lines = () => [...document.querySelectorAll('.chapter-state')], want = d => { const st = chapterRecordsState(d, 9); return chapterStateHTML(st, {chapter:9, attrs: 'title="' + esc(st.line) + '"'}); };
  host.prepend(root); modelChrome(root);
  assert.equal(lines().length, 1, 'one state line on the page');
  assert.ok(lines()[0].parentElement === footer, 'in the shell footer'); assert.ok(lines()[0].previousElementSibling === footer.querySelector('.workspace-next'), 'beside the Next task');
  assert.equal(root.querySelectorAll('.chapter-state').length, 0, 'none in the Model\'s own footer');
  assert.equal(lines()[0].outerHTML, want(p), 'the chapter\'s records state, as every tab\'s head draws it');
  assert.deepEqual([lines()[0].textContent, lines()[0].dataset.chapterState, lines()[0].dataset.chapterAccent], ['7 records · 6 to fix · 1 to confirm', 'fix', '9']);
  const first = lines()[0]; modelChrome(root); placeChapterState(root);
  assert.equal(lines().length, 1, 're-drawn, it is not duplicated'); assert.ok(lines()[0] === first, 'unchanged records keep the same element');
  const t = document.createElement('template'); t.innerHTML = '<a class="workspace-next" data-action="next" href="/?chapter=9&amp;tab=validate"><span>Next task</span><strong id="next-text">Fix TH-001</strong></a>'; footer.querySelector('.workspace-next').replaceWith(t.content.firstElementChild);
  modelChrome(root); assert.equal(lines().length, 1); assert.ok(lines()[0].previousElementSibling.matches('a.workspace-next'), 'the next task\'s redraw (app.js refreshFooterNext) leaves it beside the new one');
  const q = structuredClone(p); q.security.threats.push({...q.security.threats[0], id:'TH-990', title:'Second probe threat'}); settleDocument(q); store.value = {document:q};
  modelChrome(root); assert.equal(lines().length, 1); assert.equal(lines()[0].outerHTML, want(q), 'a record saved moves the line on the next draw'); assert.notEqual(want(q), want(p));
  store.value = null; modelChrome(root); assert.equal(lines().length, 0, 'with no chapter state there is no line'); store.value = {document:p}; modelChrome(root); assert.equal(lines().length, 1);
  root.remove(); store.value = {document:q}; placeChapterState(root); assert.equal(lines()[0].outerHTML, want(p), 'a view off the stage never writes it'); host.prepend(root);
  footer.insertAdjacentHTML('beforeend', want(p)); modelChrome(root); assert.equal(lines().length, 1, 'a stray second line is removed'); assert.equal(lines()[0].outerHTML, want(q));
  footer.innerHTML = shellFooter; document.body.dataset.workspaceTab = 'work'; modelChrome(root);
  assert.equal(lines().length, 0, 'on another tab (its footer redrawn by the shell) a late draw of the Model adds none');
  assert.equal(writes, 0, 'placing the state line never issues a project command');
}
await window.happyDOM.close();console.log('Model chrome: stable source-owned commands, single export and camera controls, full-label search and exact drawn-element navigation passed.');
