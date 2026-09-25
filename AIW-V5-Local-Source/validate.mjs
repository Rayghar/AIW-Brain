import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const model=fs.readFileSync('public/model.js','utf8').replaceAll('export const ','const ');
const app=fs.readFileSync('public/app.js','utf8').replace(/^import .*?;\n/gm,'').replace(/\npersist\(\);render\(\);\n/,'\n');
const el={clientWidth:1200,textContent:'',style:{},innerHTML:'',classList:{add(){},remove(){}},focus(){},click(){},setAttribute(){},scrollIntoView(){}};
const ctx={console,Set,Map,URL,URLSearchParams,location:{search:""},Blob,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},document:{querySelector:()=>el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el},window:{addEventListener(){},matchMedia:()=>({matches:true})}};
Object.assign(ctx,projectContext,projectScope);vm.createContext(ctx);
const ux=browserSource('public/workspace-ux.js');
vm.runInContext(model+'\n'+ux+'\n'+app+`\nrender=()=>{};drawGraph=()=>{};refreshInspector=()=>{};renderFlow=()=>{};closeModal=()=>{};toast=()=>{};globalThis.test={s,layers,nodes,edges,suggestions,allNodes,allEdges,toggleLayer,setChapter,setTab,selectNode,preview,accept,remove,advance,goStage,isTerminal,flowText,done,mark,progress,inspector,workSurface,validateSurface,outputSurface,modelSurface,findings,nextTask,visibleNodes,layoutModel,searchNodes,unmark};`,ctx);
const t=ctx.test;
assert.equal(t.layers.length,8);
assert.equal(new Set(t.nodes.map(n=>n.id)).size,t.nodes.length);
for(const e of t.edges){assert(t.nodes.some(n=>n.id===e.from));assert(t.nodes.some(n=>n.id===e.to));}
for(const layer of t.layers){assert(t.nodes.some(n=>n.layer===layer.id));t.toggleLayer(layer.id)}
assert(t.done('physical'));
t.selectNode('risk');assert(t.done('inspect'));
const count=t.allNodes().length;
t.preview('review');assert.equal(t.allNodes().length,count+1);assert.equal(t.s.accepted.length,0);assert(t.allNodes().find(n=>n.id==='review').ghost);
t.mark('validate');t.mark('export');t.accept('review');assert(t.s.accepted.includes('review'));assert(!t.done('validate'));assert(!t.done('export'));assert(t.done('candidate'));
t.remove('review');assert.equal(t.allNodes().length,count);assert(!t.done('candidate'));
for(const id of ['review','dedup','recovery']){t.preview(id);t.accept(id)}
assert.equal(t.allNodes().length,count+3);
assert(t.allEdges().every(e=>t.allNodes().some(n=>n.id===e.from)&&t.allNodes().some(n=>n.id===e.to)));
t.setChapter(4);t.s.scenario='success';for(let i=0;i<5;i++)t.advance();assert.equal(t.s.step,4);assert(t.done('flow'));
t.setChapter(4);t.s.scenario='hold';for(let i=0;i<5;i++)t.advance();assert.equal(t.s.step,1);assert(t.flowText().includes('No ledger posting'));
t.setChapter(5);t.s.scenario='timeout';for(let i=0;i<7;i++)t.advance();assert.equal(t.s.step,3);assert(t.flowText().includes('pending'));
for(const chapter of [4,5]){t.setChapter(chapter);for(const tab of ['work','model','validate','output']){t.setTab(tab);for(const node of t.allNodes()){t.s.selected=node.id;assert(t.inspector().includes(node.title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));}assert(t.workSurface().includes('Chapter'));assert(t.validateSurface().includes('Validate'));assert(t.outputSurface().includes('Export model JSON'));assert(t.modelSurface().includes('Generative'));}}
assert.equal(t.findings().at(-1).ok,false);
assert(t.progress()>=0&&t.progress()<=100);
// Every combination of layers must lay out distinct, in-bounds cards on both screen modes.
for(const canvasWidth of [390,680,1100]){
el.clientWidth=canvasWidth;
for(let mask=0;mask<256;mask++){
  t.s.visible=t.layers.filter((_,i)=>mask&(1<<i)).map(l=>l.id);
  t.s.focus=false;
  for(const mobile of [false,true]){
    const ns=t.visibleNodes(),layout=t.layoutModel(ns,mobile,false);
    for(const n of ns){const p=layout.positions.get(n.id);assert(p.x>=0&&p.y>=0);assert(p.x+200<=layout.width);assert(p.y+74<=layout.height)}
    const ps=[...layout.positions.values()];
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(ps[i].x+200<=ps[j].x||ps[j].x+200<=ps[i].x||ps[i].y+74<=ps[j].y||ps[j].y+74<=ps[i].y,'Cards must not overlap');
  }
}
}
t.s.visible=t.layers.map(l=>l.id);t.s.focus=true;t.s.selected='ledger';
const neighbours=new Set(['ledger']);for(const e of t.allEdges())if(e.from==='ledger'||e.to==='ledger'){neighbours.add(e.from);neighbours.add(e.to)}
assert(t.visibleNodes().every(n=>neighbours.has(n.id)));
assert(t.visibleNodes().some(n=>n.id==='posting'));
assert(t.searchNodes('CORE banking').some(n=>n.id==='ledger'));
assert(t.searchNodes('certificate lifecycle').some(n=>n.id==='mtls'));
assert.equal(t.searchNodes('not-a-model-object-xyz').length,0);
t.setChapter(4);t.s.scenario='success';t.unmark('flow');t.goStage(3);t.advance();assert(!t.done('flow'),'Skipping steps must not award completion');
t.setChapter(4);t.s.scenario='hold';t.goStage(4);assert.equal(t.s.step,-1,'Held payments cannot jump to confirmation');
console.log('PASS: 1536 mobile/desktop layer layouts across three canvas widths, focus neighbourhood, multi-term search, skipped-step and held-payment guards.');
console.log(JSON.stringify({status:'passed',nodes:t.nodes.length,baseRelationships:t.edges.length,layers:8,checks:['unique objects and resolved endpoints','eight layer toggles','chapter and tab context rendering','object selection','ghost preview / acceptance / undo','validation and export invalidation','complete payment journey','risk hold stops before posting','timeout stops before confirmation','candidate relationship integrity','open governance findings retained'],limitations:['State-level tests; no browser layout assertions in this script']},null,2));
