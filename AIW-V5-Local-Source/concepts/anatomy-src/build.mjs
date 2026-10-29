// Build the self-contained concept page: node concepts/anatomy-src/build.mjs
import {readFileSync,writeFileSync} from 'node:fs';
const src=f=>readFileSync(new URL('./'+f,import.meta.url),'utf8');
const bank=JSON.parse(readFileSync(new URL('./bank.json',import.meta.url),'utf8'));
bank.scenarios=[{id:'payment',title:'Payment journey',steps:[['ext-channel','api-pod'],['api-pod','risk-engine'],['risk-engine','core-adapter'],['core-adapter','ext-core'],['core-adapter','worker'],['worker','ext-network'],['worker','notify-worker']]}];
const mark='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 28 20 10 30 28M14 22h12" fill="none" stroke="#faf8ef" stroke-width="3"/></svg>';
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIW Anatomy · concept</title>
<meta name="description" content="Concept prototype: a layered, lens-based way to explore a solution architecture in AIW.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%23214d40'/%3E%3Cpath d='M10 28 20 10 30 28M14 22h12' fill='none' stroke='%23faf8ef' stroke-width='3'/%3E%3C/svg%3E">
<style>${src('styles.css')}</style></head><body>
<div class="app">
 <header class="top"><div class="mark"><i>${mark}</i>aiw <small>V5 · concept</small></div><nav class="crumbs" aria-label="Where you are"></nav><div class="spacer"></div>
  <div class="seg" role="group" aria-label="Model to explore"><button data-ds="core-banking">Core banking <span style="opacity:.7">(illustrative)</span></button><button data-ds="bank-payment">Bank Payment Journey</button></div>
  <button class="tbtn" data-act="intro">How to read this</button><button class="tbtn" data-act="panel" aria-pressed="true">Companion</button></header>
 <div class="main">
  <div class="center"><div class="lensbar"><span class="lbl">Lens</span><div class="lenses"></div><div class="depth" aria-label="Depth"></div></div>
  <div class="stage" aria-label="Architecture anatomy canvas"><div class="world"><div class="bg" style="position:absolute;inset:0"></div><svg class="edges under" width="1" height="1"></svg><div class="rings" style="position:absolute;inset:0;pointer-events:none"></div><div class="nodes" style="position:absolute;inset:0"></div><svg class="edges over" width="1" height="1"></svg><div class="pills" style="position:absolute;inset:0;pointer-events:none"></div></div>
   <div class="scenario" hidden></div><div class="key min"><button class="kt" data-act="key" aria-label="Show key">▴</button><div class="cap"></div><div class="legend"></div></div>
   <div class="zoombar"><button data-act="zout" aria-label="Zoom out">−</button><button data-act="zin" aria-label="Zoom in">+</button><button data-act="fit" aria-label="Fit to view" style="font-size:12px">fit</button></div></div></div>
  <aside class="panel" aria-label="Companion"></aside>
 </div>
 <footer class="story" aria-label="The design story"><button class="play" data-act="play"></button><div class="steps"></div><div class="note"></div></footer>
</div>
<div class="tip" hidden></div>
<div class="intro"><div class="card" role="dialog" aria-modal="true" aria-labelledby="intro-t">
 <h1 id="intro-t">See the whole architecture — then cut into it.</h1>
 <p>This concept treats a solution like a body you can study. The parts stay where they are. What changes is <b>how deep you cut</b> and <b>which system you look at</b>.</p>
 <div class="three"><div><b>Parts stay put</b><span>Columns are the modules — the organs. They keep their place in every view, so you never lose your bearings.</span></div><div><b>Cut deeper</b><span>Each band is one layer down: what a part must do → the software that does it → the platform beneath → the products → where it runs.</span><div class="strata">${['#8a6d3b','#286954','#2f6177','#66733a','#7a5f33','#3f6d86'].map((c,i)=>`<span style="background:${c}">${['Intent','Logical','Application','Platform','Product','Runtime'][i]}</span>`).join('')}</div></div><div><b>Switch lenses</b><span>Structure, Flow, Signals, Information, Protection, Operation and Reasoning run through the whole body — like skeleton, muscles, nerves, blood, immunity, vital signs and DNA.</span></div></div>
 <div class="row"><button class="tbtn primary" data-act="intro-story">▶ Watch the design story (35 s)</button><button class="tbtn" data-act="intro-close">Explore on my own</button></div>
 <p class="fine">Concept prototype, not part of the product yet. <b>Core banking</b> is a hypothetical model written for this concept — it is not SEABaaS’s recorded architecture. <b>Bank Payment Journey</b> is exported unchanged from the AIW V5 reference project. Companion answers here are rule-based previews.</p>
</div></div>
<script>window.AIW_DATASETS=[${JSON.stringify(bank)}];</script>
<script>${src('core-banking.js')}</script>
<script>${src('engine-model.js')}</script>
<script>${src('engine-ui.js')}</script>
</body></html>`;
writeFileSync(new URL('../anatomy-prototype.html',import.meta.url),html);
console.log('built',(html.length/1024).toFixed(0)+' KB');
