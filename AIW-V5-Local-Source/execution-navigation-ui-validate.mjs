// Native DOM navigation and draft preservation; no rendered browser or provider.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?project=execution-composition-fixture&chapter=8&tab=work',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
document.body.innerHTML='<main id="app"></main><aside id="brain-panel"></aside><div id="toast"></div>';
const requests=[],notices=[];
globalThis.fetch=async(url,opts={})=>{requests.push(String(url));assert.equal(opts.method||'GET','GET','Navigation must not generate or write');return Response.json({configured:false,draft:null,runs:[],actorKey:'fixture'});};
const {executionCompositionFixture}=await import('./execution-composition-fixtures.mjs');
const {createInterfacesStudio}=await import('./public/interfaces-ui.js');
const {EXECUTION_FIELDS}=await import('./public/interfaces-domain.js');
const {architectureIntelligence}=await import('./public/architecture-intelligence.js');
const {intelligenceActionHTML,intelligenceAuthority}=await import('./public/chapter-insight.js');
const {mountBrainContext,launchIntelligenceAction}=await import('./public/brain-context-ui.js');
const fixture=executionCompositionFixture({publication:undefined}),p=fixture.document,{contractId}=fixture.ids;
const store={value:{document:p,revision:1},async command(){throw Error('Navigation cannot mutate the project');}};window.aiwProjectStore=store;
const state={chapter:8,tab:'work',selected:contractId,visible:['physical','interface'],cursor:false};
const bridge={state,render(){},persist(){},toast:m=>notices.push(m),getNode:id=>({id,title:id}),setTab(tab){state.tab=tab;}};
const studio=createInterfacesStudio(store);studio.bind(bridge);
window.aiwRoute=url=>{const q=new URL(url,location.href).searchParams;state.chapter=Number(q.get('chapter'));state.tab=q.get('tab');state.selected=q.get('object');return true;};
const q=s=>document.querySelector(s),event=field=>document.dispatchEvent(new CustomEvent('aiw:sdd-edit',{detail:{chapter:8,projectId:p.id,objectId:contractId,editor:'contract',field}}));
const discard=()=>{q('[data-i-action="close"]')?.click();q('[data-i-action="discard"]')?.click();};
try{
 const original=JSON.stringify(p);
 for(const field of ['contractVersion','correlationKey','idempotencyKey',...EXECUTION_FIELDS.map(f=>'execution.'+f.key)]){
  event(field);const input=q('#i-editor')?.elements.namedItem(field);assert(input,field+' opens its native field');assert.equal(document.activeElement,input);assert.equal(input.closest('[data-i-panel]').hidden,false);if(field.startsWith('execution.'))assert(input.closest('details').open);discard();
 }
 assert.equal(JSON.stringify(p),original);
 console.log('PASS each execution declaration, version and request identity opens and focuses its existing native field without a write');

 event('execution.publication');const input=q('#i-editor').elements.namedItem('execution.publication');input.value='after-commit';input.dispatchEvent(new Event('change',{bubbles:true}));const form=q('#i-editor');
 event('contractVersion');assert.equal(q('#i-editor'),form);assert.equal(input.value,'after-commit');assert.equal(q('.l-discard').hidden,false);q('[data-i-action="keep"]').click();assert.equal(q('#i-editor'),form);discard();
 const reject=detail=>document.dispatchEvent(new CustomEvent('aiw:sdd-edit',{detail:{chapter:8,projectId:p.id,objectId:contractId,editor:'contract',field:'execution.publication',...detail}}));
 reject({projectId:'foreign-project'});reject({objectId:'foreign-contract'});reject({field:'execution.nonexistent'});assert(!q('#i-editor'));state.selected='another-object';reject({});assert(!q('#i-editor'));state.selected=contractId;
 console.log('PASS dirty edits survive navigation attempts and wrong project, record, field or current selection cannot open an editor');

 mountBrainContext(p,{chapter:8,id:contractId},'work');
 const reading=architectureIntelligence(p,{chapter:8,id:contractId}),insight=reading.insights.find(i=>i.id.startsWith('execution:')),action=insight?.actions.find(a=>a.fieldKey==='execution.publication');assert(action);
 const html=intelligenceActionHTML(reading,insight,action,{projectId:p.id});assert.match(html,/<button/);assert.match(html,/data-intelligence-basis=/);assert.equal(intelligenceAuthority(insight.authority),'Inspected source interpretation');
 const request={projectId:p.id,subjectId:contractId,chapter:8,insightId:insight.id,actionId:action.id,basisStamp:reading.receipt.basisStamp,knowledgeStamp:reading.receipt.knowledgeStamp};
 assert.equal(launchIntelligenceAction({...request,basisStamp:'obsolete'}),false);assert(!q('#i-editor'));
 assert.equal(launchIntelligenceAction(request),true);assert.equal(document.activeElement,q('#i-editor').elements.namedItem('execution.publication'));assert(q('[data-i-panel="2"] details').open);assert.equal(JSON.stringify(p),original);discard();
 assert(!requests.some(u=>/generate|reason\/run/.test(u)));
 console.log('PASS current source-backed guidance routes to the native Behaviour field; stale guidance is rejected and inspected interpretation keeps its own authority label');
}finally{studio.dispose();document.dispatchEvent(new CustomEvent('aiw:project-switched'));await w.happyDOM.abort();w.close();}
