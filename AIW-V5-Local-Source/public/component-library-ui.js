// The component library's surfaces (round 11, workstream F; loaded on demand). "Add to the library" files one project
// component's specification snapshot (component-library.js componentSnapshot) as a library entry: in the project
// library through workspace.catalogue, or in an organisation library through the organisation route, for its editors.
// "From the library" lists the project's and the organisations' component entries and the catalogue's component
// archetypes; choosing one hands Chapter 5 a proposal (the studio's proposeFromLibrary), which the person reviews in the
// component form and saves as a candidate through realisation.candidate. The catalogue reading in Sol's panel lists the
// archetypes and the organisations' entries with "Propose into this project": on Chapter 5 it proposes at once, elsewhere
// it opens Chapter 5 with the item named in the address (?library=…). Nothing here writes a design record; library
// content is knowledge; a proposal is not a record.
import {modal} from './workbench-ui.js';
import {projectURL} from './project-context.js';
import {esc} from './html-escape.js';
import {servicePost,commandChangeDetail} from './project-store.js';
import {loadCatalogue} from './catalogue-store.js';
import {snapshotText,readComponentSnapshot,COMPONENT_ARCHETYPES,COMPONENT_LIBRARY_KIND} from './component-library.js';
import {componentSnapshot,snapshotSummary,libraryProposal,archetypeProposal,archetypeRecord} from './component-snapshot.js';
const field=(name,label,value='',attrs='')=>`<label class="brain-field"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" ${attrs}></label>`;
const area=(name,label,value='',attrs='')=>`<label class="brain-field"><span>${esc(label)}</span><textarea name="${name}" rows="3" ${attrs}>${esc(value)}</textarea></label>`;
const select=(name,label,options)=>`<label class="brain-field"><span>${esc(label)}</span><select name="${name}">${options.map(o=>`<option value="${esc(o.id)}">${esc(o.title)}</option>`).join('')}</select></label>`;
const button=(action,label,attrs='',cls='btn')=>`<button type="button" class="${cls}" data-cl-action="${action}" ${attrs}>${esc(label)}</button>`;
const store=()=>window.aiwProjectStore;
const document_=()=>store()?.value?.document;
async function get(path,fallback){const r=await fetch(projectURL(path),{credentials:'same-origin'});let d;try{d=await r.json();}catch{throw Error(fallback);}if(!r.ok)throw Error(d.error||fallback);return d;}
// The organisations the person belongs to, with their component entries. A failed read is an empty list, said in the
// surface, never an error that hides the rest.
async function organisationEntries({editorsOnly=false}={}){
 let orgs=[];try{orgs=(await get('/api/organizations?action=list','Organisation libraries are unavailable.')).organizations||[];}catch{return {organizations:[],entries:[],failed:true};}
 const editable=orgs.filter(o=>['administrator','editor'].includes(o.role));
 if(editorsOnly)return {organizations:editable,entries:[],failed:false};
 const entries=[];let failed=false;
 for(const o of orgs){try{const lib=await get('/api/organizations?action=library&organization='+encodeURIComponent(o.id),'This organisation library is unavailable.');for(const e of lib.entries||[])if(e.kind===COMPONENT_LIBRARY_KIND&&e.status!=='withdrawn')entries.push({...e,organization:{id:o.id,title:o.title}});}catch{failed=true;}}
 return {organizations:orgs,entries,failed};
}
const projectEntries=p=>(p?.workbench?.catalogue||[]).filter(e=>e.kind===COMPONENT_LIBRARY_KIND&&e.status!=='deprecated');
const snapshotOf=e=>{try{return readComponentSnapshot(e.content);}catch{return null;}};
const entryCard=(e,scope,extra='')=>{const s=snapshotOf(e);return `<article class="guide-loop" data-cl-entry="${esc(e.id)}"><b>${esc(e.title)}</b><small>${esc(scope)} · r${esc(e.revision??1)} · ${esc(e.status||'draft')}${s?.origin?.project?.name?' · from '+esc(s.origin.project.name):''}</small><p>${esc(s?s.purpose||'No purpose written.':'This entry is not a readable component snapshot.')}</p>${s?`<small>${esc(snapshotSummary(s))}</small>`:''}<div class="brain-actions">${extra}</div></article>`;};
const archetypeCard=(a,extra='')=>`<article class="guide-loop" data-cl-archetype="${esc(a.id)}"><b>${esc(a.name)}</b><small>${esc(a.id)} · catalogue archetype · descriptive knowledge, never a score</small><div class="brain-actions">${extra}</div></article>`;
const dispatchChange=(command,result)=>document.dispatchEvent(new CustomEvent('aiw:external-project',{detail:commandChangeDetail(command,result)}));

// ---------------------------------------------------------------- add to the library
export async function addToLibrary({store:s=store(),id,after=null}={}){
 const p=s?.value?.document,at=new Date().toISOString(),snapshot=p&&id?componentSnapshot(p,id,{at}):null;
 if(!snapshot){modal('Add to the library','<p>Choose a saved component first.</p>');return null;}
 const {organizations}=await organisationEntries({editorsOnly:true});
 const scopes=[{id:'project',title:'This project’s library'},...organizations.map(o=>({id:'org:'+o.id,title:o.title+' (organisation library)'}))];
 const d=modal('Add to the library',`<p>Files what the design records about <b>${esc(snapshot.identity.ref)} ${esc(snapshot.identity.title)}</b> as a library entry: its purpose and boundary, the responsibilities it realises, its interfaces with their promises, the data it owns, consumes and produces, its technology needs and its obligations, by name. No record is copied and no secret is kept.</p><p class="brain-note">${esc(snapshotSummary(snapshot))}. Values that look like credentials are replaced before filing.</p><form id="cl-add-form">${field('title','Entry title',snapshot.identity.title,'required maxlength="180"')}${field('owner','Accountable owner',snapshot.identity.owner,'required maxlength="180"')}${select('scope','Library',scopes)}${area('reviewNote','Why it is reusable','','maxlength="4000"')}<p class="brain-note">A project entry starts as a draft. An organisation entry starts as a draft for an independent reviewer; it reaches other projects only through a signed release. Nothing is approved by filing it.</p><button class="btn primary" type="submit">File in the library</button></form>`);
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');if(b.disabled)return;const raw=Object.fromEntries(new FormData(f));if(!raw.title.trim()||!raw.owner.trim()){d.error('Name the entry and its accountable owner.');return;}b.disabled=true;
  try{const content=snapshotText(snapshot);
   if(raw.scope==='project'){const command={type:'workspace.catalogue',payload:{kind:COMPONENT_LIBRARY_KIND,title:raw.title,content,owner:raw.owner,status:'draft',reviewNote:raw.reviewNote||''}};const result=await s.command(command);dispatchChange(command,result);}
   else{const org=raw.scope.slice(4),o=organizations.find(x=>x.id===org);if(!o)throw Error('Choose a library.');
    await servicePost('/api/organizations?'+new URLSearchParams({action:'library',organization:org}),{kind:COMPONENT_LIBRARY_KIND,title:raw.title,content,conditions:raw.reviewNote||'Read from one project; confirm the boundary, interfaces and needs against the target project.',limitations:'A snapshot of one project’s design at the time of filing. It carries no approval and no runtime evidence.',lifecycle:'Review when the source component changes.',source:{location:`Project ${p.name||p.id} · Chapter 5 · ${snapshot.identity.ref} ${snapshot.identity.title}`,passage:[snapshot.purpose,snapshot.boundary].filter(Boolean).join('\n\n')||snapshot.identity.title,revision:`${snapshot.identity.ref} revision ${snapshot.identity.revision} · ${at}`,licence:'Project-owned design content'}},{fallback:'The organisation library did not accept the entry.'});}
   d.closeView();after?.();window.dispatchEvent(new CustomEvent('aiw:notice',{detail:{message:raw.scope==='project'?'Filed in this project’s library as a draft entry.':'Filed in the organisation library as a draft for review.'}}));
  }catch(err){d.error(err);b.disabled=false;}};
 return d;
}

// ---------------------------------------------------------------- from the library
async function proposalFor(item){
 if(item.kind==='archetype'){const record=archetypeRecord(await loadCatalogue(),item.id);if(!record)throw Error('This archetype is not in the loaded catalogue.');return archetypeProposal(record);}
 if(item.kind==='project'){const e=projectEntries(document_()).find(e=>e.id===item.id);if(!e)throw Error('This library entry is no longer in the project.');return libraryProposal(e,{scope:'project'});}
 const lib=await get('/api/organizations?action=library&organization='+encodeURIComponent(item.organizationId),'This organisation library is unavailable.'),e=(lib.entries||[]).find(e=>e.id===item.id&&e.kind===COMPONENT_LIBRARY_KIND);if(!e)throw Error('This library entry is not readable here.');
 return libraryProposal(e,{scope:'organisation',organizationId:item.organizationId,organizationTitle:lib.organization?.title||'',contentHash:e.review?.contentHash||''});
}
export async function fromLibrary({store:s=store(),propose}={}){
 const p=s?.value?.document,mine=projectEntries(p);
 const d=modal('From the library',`<p>Propose a component from a library entry or a catalogue archetype. The proposal appears on the model as an unsaved ghost; you review and edit it, and it is saved as a candidate only when you accept it there. Its interface contracts and technology needs stay proposals for Chapter 8 and Chapter 6.</p><label class="brain-field"><span>Find</span><input type="search" data-cl-search placeholder="Name, archetype or project"></label><div data-cl-list><h3>This project’s library · ${mine.length}</h3>${mine.map(e=>entryCard(e,'project library',button('propose','Propose','data-kind="project" data-id="'+esc(e.id)+'"','btn primary'))).join('')||'<p>No component entry yet. Add one from a saved component.</p>'}<h3>Organisation libraries</h3><div data-cl-orgs><p class="brain-note">Reading the organisation libraries…</p></div><h3>Catalogue archetypes · ${COMPONENT_ARCHETYPES.length}</h3>${COMPONENT_ARCHETYPES.map(a=>archetypeCard(a,button('propose','Propose','data-kind="archetype" data-id="'+esc(a.id)+'"','btn primary'))).join('')}</div>`);
 const filter=()=>{const term=d.querySelector('[data-cl-search]').value.trim().toLowerCase();for(const a of d.querySelectorAll('[data-cl-list] article'))a.hidden=!!term&&!a.textContent.toLowerCase().includes(term);};d.querySelector('[data-cl-search]').oninput=filter;
 organisationEntries().then(({entries,failed,organizations})=>{const slot=d.querySelector('[data-cl-orgs]');if(!slot)return;slot.innerHTML=entries.map(e=>entryCard(e,e.organization.title,button('propose','Propose','data-kind="organisation" data-id="'+esc(e.id)+'" data-organization="'+esc(e.organization.id)+'"','btn primary'))).join('')||`<p class="brain-note">${failed?'An organisation library could not be read.':organizations.length?'No component entry in your organisations yet.':'You are not a member of an organisation workspace.'}</p>`;filter();});
 d.addEventListener('click',async e=>{const b=e.target.closest('[data-cl-action="propose"]');if(!b||b.disabled)return;b.disabled=true;try{const prop=await proposalFor({kind:b.dataset.kind,id:b.dataset.id,organizationId:b.dataset.organization});d.closeView();if(typeof propose==='function')propose(prop);}catch(err){d.error(err);b.disabled=false;}});
 return d;
}
// An address token names one item: archetype:ID, project:ENTRY or org:ORG:ENTRY.
export function libraryToken(item){return item.kind==='archetype'?'archetype:'+item.id:item.kind==='project'?'project:'+item.id:'org:'+item.organizationId+':'+item.id;}
export async function openLibraryToken(token,{propose}={}){
 const [kind,...rest]=String(token||'').split(':');
 const item=kind==='archetype'?{kind,id:rest.join(':')}:kind==='project'?{kind,id:rest.join(':')}:kind==='org'&&rest.length>=2?{kind:'organisation',organizationId:rest[0],id:rest.slice(1).join(':')}:null;
 if(!item)throw Error('This library address names nothing.');
 const prop=await proposalFor(item);if(typeof propose==='function')propose(prop);return prop;
}

// ---------------------------------------------------------------- the catalogue reading (Sol's panel)
export async function mountCatalogueReading(el,{chapter}={}){
 const here=Number(chapter)===5;
 const act=item=>button('propose-here','Propose into this project',`data-token="${esc(libraryToken(item))}"`,'btn primary');
 el.innerHTML=`<summary>The component library</summary><p class="brain-note">The catalogue’s ${COMPONENT_ARCHETYPES.length} component archetypes and your organisations’ component entries. Proposing one opens Chapter 5 with an unsaved proposal to review; nothing is scored, constrained or approved by proposing.</p><h4>Catalogue archetypes</h4>${COMPONENT_ARCHETYPES.map(a=>archetypeCard(a,act({kind:'archetype',id:a.id}))).join('')}<h4>Organisation component entries</h4><div data-cl-orgs><p class="brain-note">Reading the organisation libraries…</p></div>`;
 el.addEventListener('click',async e=>{const b=e.target.closest('[data-cl-action="propose-here"]');if(!b||b.disabled)return;e.preventDefault();e.stopPropagation();b.disabled=true;
  try{const studio=window.aiwLogicalStudio;if(here&&studio&&typeof studio.proposeFromLibrary==='function'){await openLibraryToken(b.dataset.token,{propose:prop=>studio.proposeFromLibrary(prop)});b.disabled=false;return;}
   location.assign(projectURL('/?chapter=5&tab=work&library='+encodeURIComponent(b.dataset.token)));
  }catch(err){b.disabled=false;window.dispatchEvent(new CustomEvent('aiw:notice',{detail:{message:err.message||'The proposal could not be opened.'}}));}});
 const {entries,failed,organizations}=await organisationEntries();const slot=el.querySelector('[data-cl-orgs]');if(!slot)return;
 slot.innerHTML=entries.map(e=>entryCard(e,e.organization.title,act({kind:'organisation',organizationId:e.organization.id,id:e.id}))).join('')||`<p class="brain-note">${failed?'An organisation library could not be read.':organizations.length?'No component entry in your organisations yet.':'You are not a member of an organisation workspace.'}</p>`;
}
