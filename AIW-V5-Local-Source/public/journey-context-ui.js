import {mountObjectExploration} from './object-exploration.js';
import {journeyIndex,journeyTargets,journeyObjectURL,journeyStatus,journeyChapters} from './journey-context.js';
import {projectURL,currentProject} from './project-context.js';
import {modal} from './workbench-ui.js';
import {esc} from './html-escape.js';
let previousProject,index,opened=false,lastSelection;
export function journeyNode(p,id){
 if(!p||!id)return null;
 if(previousProject!==p){index=journeyIndex(p);previousProject=p;}
 return index.nodes.get(id)||null;
}
export function mountJourneyContext(p,{id,chapter}={}){
 chapter=Number(chapter)||Number(new URLSearchParams(location.search).get('chapter'))||1;
 const n=journeyNode(p,id);
 // Navigation is independent of the inspector: Model owns its companion and may
 // mount it later, but the selected object's saved targets must already work.
 bindJourneyNavigation(p,n,chapter);
 if(!p||!id)return;mountObjectExploration(p,{id,chapter});
 const inspector=document.querySelector('#r-inspector,#q-inspector,#d-inspector,#inspector:not(.model-companion)');if(!inspector)return;
 const prior=inspector.querySelector('.journey-context');
 if(prior&&lastSelection===id)opened=prior.open;
 if(lastSelection!==id)opened=false;lastSelection=id;
 if(!n){prior?.remove();return;}
 const groups=[];for(let c=1;c<=10;c++){if(c===chapter&&n.chapter===chapter)continue;const targets=journeyTargets(index,id,c);if(targets.length)groups.push({chapter:c,targets});}
 groups.sort((a,b)=>(a.chapter===chapter?-1:b.chapter===chapter?1:a.chapter-b.chapter));
 const next=chapter<10?journeyTargets(index,id,chapter+1):[],link=next.length===1?next[0].node:null;
 const title=groups.length?'Follow this object · '+groups.length+' chapters':'No cross-chapter links yet';
 const html=`<summary><span><small>One project / Connected journey</small><strong>${esc(title)}</strong></span><span aria-hidden="true">↗</span></summary><div class="journey-context-body"><p class="journey-context-source"><b>${esc(n.ref||n.id)}</b> · ${esc(n.title)}<small>${esc(journeyStatus(n))}</small></p>${chapter<10&&!next.length?`<p class="journey-context-gap">No saved path to Chapter ${chapter+1} yet. Use the chapter's existing modelling controls to define the missing relationship.</p>`:''}${groups.map(g=>`<details class="journey-context-group"${g.chapter===chapter?' open':''}><summary><h3>${String(g.chapter).padStart(2,'0')} · ${journeyChapters[g.chapter]}${g.chapter===chapter?' · Here':''} <small>${g.targets.length}</small></h3></summary>${g.targets.map(t=>`<a href="${esc(projectURL(journeyObjectURL(t.node)))}"><b>${esc(t.node.ref||t.node.id)} · ${esc(t.node.title)}</b><span>${!t.path.length?'Open its definition':t.path.length===1?esc((index.nodes.get(t.path[0].edgeFrom)?.ref||t.path[0].edgeFrom)+' → '+(index.nodes.get(t.path[0].edgeTo)?.ref||t.path[0].edgeTo)+' · '+t.path[0].label):'Via '+esc(t.path.slice(0,-1).map(e=>index.nodes.get(e.to)?.ref||e.to).join(' → '))}</span><small>${esc(journeyStatus(t.node))}</small></a>`).join('')}</details>`).join('')||'<p>Relationships appear here as you connect the architecture. No new model objects have been created.</p>'}<p class="journey-context-note">These are saved relationships, not proof of acceptance or implementation. Drafts and reference content retain their own status.</p></div>`;
 const el=prior||document.createElement('details');el.className='journey-context';el.setAttribute('aria-label','Connected architecture journey');if(el.innerHTML!==html)el.innerHTML=html;el.open=opened;
 el.ontoggle=()=>{opened=el.open;};
 if(!prior){const body=inspector.querySelector('.r-inspector-body,.inspector-body,.t-dock-body');if(body)body.prepend(el);else inspector.append(el);}
 let action=inspector.querySelector('.journey-next-link');
 if(link){if(!action){action=document.createElement('a');action.className='journey-next-link';el.after(action);}action.href=projectURL(journeyObjectURL(link));action.textContent='Continue in Chapter '+(chapter+1)+' · '+(link.ref||link.id)+' →';}
 else action?.remove();
}

// The shell owns chapter transitions and browser history. These real URLs keep a
// unique saved target; branching and missing links require an explicit choice.
const navigationDefaults=new WeakMap();
function bindJourneyNavigation(p,n,chapter){
 const tab=document.body.dataset.workspaceTab||new URLSearchParams(location.search).get('tab')||'model';
 for(const a of document.querySelectorAll('.journey-chapters a[href]')){
  if(!navigationDefaults.has(a))navigationDefaults.set(a,{href:a.getAttribute('href'),title:a.getAttribute('title')});
  const original=navigationDefaults.get(a);a.setAttribute('href',original.href);
  if(original.title===null)a.removeAttribute('title');else a.setAttribute('title',original.title);
  for(const key of ['journeyTarget','journeyOrigin','journeyOriginChapter','journeyChoice','journeyMissing'])delete a.dataset[key];
  const target=Number(new URL(a.href,location.origin).searchParams.get('chapter'));
  if(tab!=='model'||!p||!n||target===chapter||!journeyChapters[target])continue;
  const targets=journeyTargets(index,n.id,target);
  a.dataset.journeyOrigin=n.id;a.dataset.journeyOriginChapter=String(chapter);
  if(targets.length===1){
   a.href=projectURL(journeyObjectURL(targets[0].node));a.dataset.journeyTarget=targets[0].node.id;
   a.title=`Follow ${n.ref||n.id} to ${targets[0].node.ref||targets[0].node.id} · ${targets[0].node.title}`;
  }else if(targets.length){
   a.dataset.journeyChoice=String(target);a.title=`Choose among ${targets.length} saved connections from ${n.ref||n.id}`;
  }else{
   a.dataset.journeyMissing=String(target);a.title=`No saved connection from ${n.ref||n.id}; review how to continue`;
  }
 }
}
function chooseJourneyTarget(id,chapter,target){
 const p=currentProject(),n=journeyNode(p,id);if(!n)return;
 const targets=journeyTargets(index,id,target),heading=`Follow ${n.ref||n.id} · Chapter ${target}`;
 const links=targets.map(t=>`<a class="object-backlink" data-journey-target="${esc(t.node.id)}" data-journey-origin="${esc(id)}" data-journey-origin-chapter="${esc(chapter)}" href="${esc(projectURL(journeyObjectURL(t.node)))}"><strong>${esc(t.node.ref||t.node.id)} · ${esc(t.node.title)}</strong><small>${esc(journeyStatus(t.node))}</small></a>`).join('');
 const dialog=modal(heading,`<p><b>${esc(n.title)}</b> · ${esc(n.ref||n.id)}</p>${targets.length?`<p>${targets.length} saved connections reach ${esc(journeyChapters[target])}. Choose the record you want to follow.</p>${links}`:`<p>No saved relationship connects this object to ${esc(journeyChapters[target])} yet. Open the chapter to review its records and define the missing relationship.</p>`}<p><a class="brain-guide-link" href="${esc(projectURL('/?chapter='+target+'&tab=model'))}">Open Chapter ${target} without choosing a linked record</a></p><p class="journey-context-note">Following a link does not change the project or approve its records. Back returns to the source selection.</p>`);
 dialog.addEventListener('click',e=>{if(e.target?.closest?.('a[href]')&&!(e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey))dialog.closeView();});
}
if(typeof document!=='undefined')document.addEventListener('click',e=>{
 const a=e.target?.closest?.('[data-journey-choice],[data-journey-missing]');
 if(!a||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 e.preventDefault();e.stopImmediatePropagation();
 chooseJourneyTarget(a.dataset.journeyOrigin,Number(a.dataset.journeyOriginChapter),Number(a.dataset.journeyChoice||a.dataset.journeyMissing));
},true);
// Chapter models announce selection without rebuilding the shell. One module-level
// listener refreshes targets; companion remounts never add more listeners.
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){
 window.addEventListener('aiw:subject',e=>mountJourneyContext(currentProject(),{id:e.detail?.id||null}));
 window.addEventListener('aiw:subject-release',()=>mountJourneyContext(currentProject(),{id:null}));
}
