// A capture actor must not be presented as an architect reviewer. Synthetic
// local fixtures exercise the actual dialog without recording governance.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?chapter=11&tab=output',settings:{disableIframePageLoading:true}});
for(const k of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','MutationObserver','navigator','CSS'])Object.defineProperty(globalThis,k,{value:k==='window'?w:w[k],configurable:true,writable:true});
for(const k of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[k]=w[k].bind(w);
const {createProject}=await import('./shared/projects-domain.js');
const {withFinalReview,applyFinalReviewCommand,reviewDesignStamp}=await import('./public/review-domain.js');
const {createReviewStudio}=await import('./public/review-ui.js');
const command=(p,type,payload={})=>applyFinalReviewCommand(p,{type:'review.'+type,payload},'2026-10-18T12:00:00.000Z','local-architect').document;
let p=withFinalReview(createProject({name:'Governance wording fixture',template:'blank'},'governance-wording'));
p=command(p,'checks');p=command(p,'baseline',{title:'Synthetic draft capture',stamp:reviewDesignStamp(p),reviewed:true});
const captured=p.finalReview.baselines[0];
assert.equal(captured.classification,'Working draft');assert.equal(captured.reviewId,null);
assert.equal(captured.actor,'local-architect');assert.equal(p.finalReview.reviews.length,0);assert.equal(p.finalReview.governance.length,0);
assert.throws(()=>command(p,'governance',{baselineId:captured.id,outcome:'Approved',reviewer:'Synthetic external reviewer',reference:'fixture',notes:'Only checking the existing guard',reviewed:true}),/working draft needs an architect-reviewed baseline/i,'Working draft approval remains blocked');
const before=JSON.stringify(p);let saves=0;
function dialogText(project){
  const store={value:{document:project,revision:1},command:async()=>{saves++;throw Error('No save expected');}};window.aiwProjectStore=store;
  const studio=createReviewStudio(store);studio.bind({state:{chapter:11,tab:'output',selected:null},render(){},persist(){},toast(){},getNode(){return null;}});
  document.body.innerHTML='<button type="button" data-rv-action="governance">Record governance evidence</button>';
  document.querySelector('button').click();const dialog=document.querySelector('.rv-dialog');assert(dialog,'The actual governance dialog opens');const text=dialog.textContent;
  assert(dialog.querySelector('#rv-governance-form'),'The existing governance form remains available');studio.dispose();return text;
}
try{
  const absent=dialogText(p);
  assert.match(absent,/No architect review is recorded for this baseline/);
  assert.match(absent,/local-architect captured this baseline/);
  assert.doesNotMatch(absent,/local-architect recorded the architect review/);
  const reviewed=structuredClone(p),b=reviewed.finalReview.baselines[0];b.reviewId='FR-fixture';b.classification='Architect reviewed';b.review.outcome={id:'FR-fixture',actor:'reviewer-fixture',outcome:'Ready with actions / limitations'};
  assert.match(dialogText(reviewed),/reviewer-fixture recorded the architect review/,'A real captured review author, not the capture actor, is named');
  delete b.review.outcome.actor;
  const unattributed=dialogText(reviewed);assert.match(unattributed,/captured architect review has no signed-in author/);assert.doesNotMatch(unattributed,/local-architect recorded the architect review/,'Legacy missing-review-author data never falls back to the capturer in UI wording');
  assert.equal(JSON.stringify(p),before);assert.equal(saves,0);
  console.log('PASS: unreviewed working baseline identifies its capturer; captured reviews name only their own actor; unattributed reviews remain explicit; working-draft approval guard unchanged; opening dialogs records nothing.');
}finally{await w.happyDOM.close();}
