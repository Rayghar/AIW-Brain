import {mountObjectExploration} from './object-exploration.js';
import {journeyIndex,journeyTargets,journeyObjectURL,journeyStatus,journeyChapters} from './journey-context.js';
import {projectURL} from './project-context.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let previousProject,index,opened=false,lastSelection;
export function mountJourneyContext(p,{id,chapter}={}){
 if(!p||!id)return;mountObjectExploration(p,{id,chapter});
 if(previousProject!==p){index=journeyIndex(p);previousProject=p;}
 const inspector=document.querySelector('#r-inspector,#q-inspector,#d-inspector,#inspector');if(!inspector)return;
 const prior=inspector.querySelector('.journey-context');
 if(prior&&lastSelection===id)opened=prior.open;
 if(lastSelection!==id)opened=false;lastSelection=id;
 const n=index.nodes.get(id);if(!n){prior?.remove();return;}
 const groups=[];for(let c=1;c<=10;c++){if(c===chapter&&n.chapter===chapter)continue;const targets=journeyTargets(index,id,c);if(targets.length)groups.push({chapter:c,targets});}
 groups.sort((a,b)=>(a.chapter===chapter?-1:b.chapter===chapter?1:a.chapter-b.chapter));
 const next=chapter<10?journeyTargets(index,id,chapter+1):[],link=next.length===1?next[0].node:null;
 const title=groups.length?'Follow this object · '+groups.length+' chapters':'No cross-chapter links yet';
 const html=`<summary><span><small>One project / Connected journey</small><strong>${esc(title)}</strong></span><span aria-hidden="true">↗</span></summary><div class="journey-context-body"><p class="journey-context-source"><b>${esc(n.ref||n.id)}</b> · ${esc(n.title)}<small>${esc(journeyStatus(n))}</small></p>${chapter<10&&!next.length?`<p class="journey-context-gap">No saved path to Chapter ${chapter+1} yet. Use the chapter's existing modelling controls to define the missing relationship.</p>`:''}${groups.map(g=>`<section><h3>${String(g.chapter).padStart(2,'0')} · ${journeyChapters[g.chapter]}${g.chapter===chapter?' · Here':''} <small>${g.targets.length}</small></h3>${g.targets.map(t=>`<a href="${esc(projectURL(journeyObjectURL(t.node)))}"><b>${esc(t.node.ref||t.node.id)} · ${esc(t.node.title)}</b><span>${!t.path.length?'Open its definition':t.path.length===1?esc((index.nodes.get(t.path[0].edgeFrom)?.ref||t.path[0].edgeFrom)+' → '+(index.nodes.get(t.path[0].edgeTo)?.ref||t.path[0].edgeTo)+' · '+t.path[0].label):'Via '+esc(t.path.slice(0,-1).map(e=>index.nodes.get(e.to)?.ref||e.to).join(' → '))}</span><small>${esc(journeyStatus(t.node))}</small></a>`).join('')}</section>`).join('')||'<p>Relationships appear here as you connect the architecture. No new model objects have been created.</p>'}<p class="journey-context-note">These are saved relationships, not proof of acceptance or implementation. Drafts and reference content retain their own status.</p></div>`;
 const el=prior||document.createElement('details');el.className='journey-context';el.setAttribute('aria-label','Connected architecture journey');if(el.innerHTML!==html)el.innerHTML=html;el.open=opened;
 el.ontoggle=()=>{opened=el.open;};
 if(!prior){const body=inspector.querySelector('.r-inspector-body,.inspector-body,.t-dock-body');if(body)body.prepend(el);else inspector.append(el);}
 let action=inspector.querySelector('.journey-next-link');
 if(link){if(!action){action=document.createElement('a');action.className='journey-next-link';el.after(action);}action.href=projectURL(journeyObjectURL(link));action.textContent='Continue in Chapter '+(chapter+1)+' · '+(link.ref||link.id)+' →';}
 else action?.remove();
 // Chapter navigation carries a single unambiguous saved relationship. Multiple
 // possible destinations remain an explicit choice in the connected journey.
 for(const a of document.querySelectorAll('.journey-chapters a[href]')){
  const url=new URL(a.href,location.origin),target=Number(url.searchParams.get('chapter'));
  if(target===chapter)continue;
  const targets=journeyTargets(index,id,target);
  if(targets.length===1)a.href=projectURL(journeyObjectURL(targets[0].node));
  else if(target>=4&&index.nodes.get(id)?.layer)a.href=projectURL('/?'+new URLSearchParams({chapter:String(target),tab:'model',object:id}));
  else a.href=projectURL('/?chapter='+target);
 }
}
