// The native review surface loads the focused-case reader when requested. A late
// module arrival must preserve navigation and must never reopen a disposed project.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';

const w=new Window({url:'https://aiw.test/?chapter=11&tab=work&project=case-loading'});
for(const key of ['window','document','location','history','localStorage','CustomEvent','Event','MouseEvent','FormData','Node','Element','HTMLElement','navigator','AbortController','MutationObserver'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
const project=withFinalReview(seedProject());let writes=0;
const store={value:{document:project,revision:1},async command(){writes++;throw Error('Reading a case must not write.');}};
window.aiwProjectStore=store;
const q=s=>document.querySelector(s),pause=()=>new Promise(r=>setTimeout(r,10));
const wait=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await pause();}throw Error(label);};
document.body.innerHTML='<main id="app"></main><div id="dialog-host"></div><div id="cursor-tip"></div>';
const mount=async(suffix='')=>{
 const {createReviewStudio}=await import('./public/review-ui.js'+suffix);
 const studio=createReviewStudio(store),state={chapter:11,tab:'work',selected:'api',reviewRequirement:'REQ-001',visible:['logical']};
 let renders=0;
 const bridge={state,getNode:()=>null,toast(){},persist(){},setTab(tab){state.tab=tab;},render(){renders++;q('#app').innerHTML=studio.work();}};
 studio.bind(bridge);return {studio,state,bridge,get renders(){return renders;}};
};
try{
 const first=await mount();
 assert.doesNotMatch(first.studio.work(),/Opening architecture cases/,'The whole-project review has no case loading state');
 first.studio.openSection('case');first.bridge.render();
 assert.match(q('#app').textContent,/Opening architecture cases/,'A focused case initially explains the requested load');
 await wait(()=>q('[data-rv-action="case-new"]'),'The native case workspace did not arrive');
 q('[data-rv-action="case-new"]').click();
 assert(q('#rv-case-form'),'The same native case editor opens after loading');
 assert.equal(writes,0);q('[data-rv-action="close"]').click();first.studio.dispose();

 // A new module instance has an empty loader cache; its dependencies may already be
 // fetched, but their import promise still arrives after disposal/navigation.
 localStorage.clear();const disposed=await mount('?case-disposal-check');
 disposed.studio.openSection('case');disposed.bridge.render();
 const count=disposed.renders;disposed.studio.dispose();
 store.value.document={...project,id:'next-project'};
 await pause();await pause();
 assert.equal(disposed.renders,count,'Disposed/project-switched review cannot repaint from a late import');
 assert.equal(q('dialog[open]'),null);

 store.value.document=project;localStorage.clear();const moved=await mount('?case-navigation-check');
 q('#app').innerHTML='<button data-rv-action="case-new">Create focused case</button>';
 q('[data-rv-action="case-new"]').click();moved.state.tab='output';
 await pause();await pause();
 assert.equal(q('#rv-case-form'),null,'A late case action cannot open over the newly selected Output tab');
 assert.equal(moved.renders,0);assert.equal(writes,0);moved.studio.dispose();
 console.log('PASS Focused cases load on demand into their native workspace/editor, remain read-only until save, and cancel late repaint/dialog opens after disposal, project switch or tab navigation.');
}finally{w.happyDOM.abort();}
