// The existing native intake actions load their renderer on demand. A module
// arrival after project/studio disposal must not open the old project's editor.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';

const w=new Window({url:'https://aiw.test/?chapter=1&tab=work&project=bank-payment'});
for(const key of ['window','document','location','history','localStorage','CustomEvent','Event','MouseEvent','FormData','Node','Element','HTMLElement','navigator','AbortController','MutationObserver'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
const project=withFinalReview(seedProject()),source=project.artefacts.find(a=>a.type==='requirement');
source.provenance={datasetId:'source-fixture',revision:1};source.externalId='SOURCE-001';
let writes=0,fetches=0;
const store={value:{document:project,revision:1},async command(){writes++;throw Error('Inspection must not save a command.');}};
window.aiwProjectStore=store;
globalThis.fetch=async()=>{fetches++;return new Response(JSON.stringify({filename:'Synthetic.xlsx',sheet:'Requirements',hash:'synthetic',versions:[{revision:1,at:'2026-10-20'}],row:{sourceRow:2,values:[{address:'A2',label:'Requirement',value:'Synthetic original cell'}]}}),{status:200,headers:{'Content-Type':'application/json'}});};
const wait=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error(label);};
const {createRequirementsStudio}=await import('./public/requirements.js');
const notices=[];
const bridge={state:{chapter:1,tab:'work',selected:source.id},toast:message=>notices.push(message),render(){},persist(){},route(){}};
document.body.innerHTML='<main id="app"><button data-r-action="workbook">Import workbook</button><button data-r-action="source-row">Original cells</button></main><div id="dialog-host"></div><div id="cursor-tip"></div>';
const q=s=>document.querySelector(s);
try{
 const old=createRequirementsStudio(store);old.bind(bridge);
 assert.equal(q('dialog[open]'),null,'Binding the chapter does not open the workbook tools');
 q('[data-r-action="workbook"]').click();old.dispose();
 await new Promise(r=>setTimeout(r,30));
 assert.equal(q('dialog[open]'),null,'A disposed studio cannot open an editor when its import resolves');
 const studio=createRequirementsStudio(store);studio.bind(bridge);
 q('[data-r-action="workbook"]').click();
 await wait(()=>q('#intake-file'),'Native workbook action did not open the existing import editor');
 assert.equal(fetches,0,'Opening the workbook editor performs no upload or saved-project mutation');
 q('[data-intake-close]').click();
 q('[data-r-action="source-row"]').click();
 await wait(()=>document.body.textContent.includes('Synthetic original cell'),'Native source action did not load the original-cell reader');
 q('[data-source-close]').click();studio.dispose();

 const {assuranceHTML}=await import('./public/assurance-ui.js');
 const context={requirements:[{id:source.id}],selected:{id:source.id,record:source}};
 document.querySelector('#app').innerHTML=assuranceHTML(project,context);
 q('[data-assurance-action="source"]').click();
 await wait(()=>document.body.textContent.includes('Synthetic original cell'),'Companion source action did not load the same original-cell reader');
 q('[data-source-close]').click();
 const before=fetches;
 q('[data-assurance-action="source"]').click();store.value.document={...project,id:'other-project'};
 await new Promise(r=>setTimeout(r,30));
 assert.equal(q('dialog[open]'),null,'Companion action is cancelled when the project changes before loading');
 assert.equal(fetches,before);assert.equal(writes,0);
 assert(notices.includes('Opening workbook tools…'));
 console.log('PASS Native workbook and original-cell actions load the existing editors on demand, preserve read-only inspection, and cancel late opens after disposal/project switch.');
}finally{w.happyDOM.abort();}
