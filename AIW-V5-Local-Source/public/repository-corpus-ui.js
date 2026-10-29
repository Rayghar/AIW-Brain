// Proposals → Explore → Sources: the laptop knowledge repository, searched as discovery material. A passage
// here is unreviewed repository text. The architect reads it, retrieves the exact original into the
// project (knowledge.fetch), then interprets and reviews it before it can support any design.
import {projectURL} from './project-context.js';
import {knowledgeState} from './knowledge-governance.js';
import {sha256} from './brain-integrity.js';
import {esc} from './html-escape.js';
import {knowledgeButton as button} from './studio-kit.js';

const fresh=projectId=>({projectId,request:0,status:null,loading:false,query:'',connector:'',retrievable:false,results:null,reading:null,error:''});
let state=fresh('');
export const corpusState=()=>state;
// A state not yet bound to a project (a lead opened before Sources first rendered) binds instead of resetting.
export function resetCorpus(projectId){if(state.projectId!==projectId)state=state.projectId===''?{...state,projectId}:fresh(projectId);}

async function get(view,params={}){
 const url=new URL(projectURL('/api/knowledge/corpus'),location.origin);url.searchParams.set('view',view);
 for(const [k,v] of Object.entries(params))if(v!==''&&v!=null&&v!==false)url.searchParams.set(k,String(v));
 const response=await fetch(url,{credentials:'same-origin'}),data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'The knowledge repository could not answer.');return data;
}
export async function loadCorpusStatus(redraw){
 if(state.status||state.loading)return;const own=state,request=++own.request;own.loading=true;
 try{const data=await get('status');if(state===own&&own.request===request)own.status=data;}catch(e){if(state===own&&own.request===request)own.status={connected:false,configured:false,reason:e.message};}finally{if(state===own&&own.request===request){own.loading=false;redraw();}}
}
export async function searchCorpus(redraw,{query=state.query,page=1}={}){
 const own=state,request=++own.request;own.query=query;own.loading=true;own.error='';own.reading=null;redraw();
 try{const data=await get('search',{q:query,scope:own.status?.transport==='project'?'project':'',connector:own.connector,retrievable:own.retrievable?'1':'',page});if(state===own&&own.request===request){own.results=data;if(data.supplyStatus)own.status=data.supplyStatus;}}
 catch(e){if(state===own&&own.request===request){own.error=e.message;own.results=null;}}finally{if(state===own&&own.request===request){own.loading=false;redraw();}}
}
export async function readCorpusPassage(redraw,id){
 const own=state,request=++own.request;own.loading=true;own.error='';redraw();
 try{const data=await get('passage',{id,scope:own.status?.transport==='project'?'project':''});if(state===own&&own.request===request)own.reading=data.passage;}catch(e){if(state===own&&own.request===request)own.error=e.message;}finally{if(state===own&&own.request===request){own.loading=false;redraw();}}
}
export const closeCorpusPassage=redraw=>{state.request++;state.reading=null;state.loading=false;redraw();};
// From elsewhere in the workbench: a lead Sol's view showed, or a catalogue concept's passages.
export async function openCorpusLead(redraw,{query='',passageId=''}={}){const own=state,request=own.request+1;await searchCorpus(redraw,{query});if(state===own&&own.request===request&&/^passage-[a-f0-9]{32}$/.test(passageId))await readCorpusPassage(redraw,passageId);}
export const conceptIdOf=catalogueId=>'concept-'+sha256(JSON.stringify(['catalogue',catalogueId])).slice(0,32);
export async function searchConcept(redraw,catalogueId,name=''){
 const own=state,request=++own.request;own.query='';own.loading=true;own.error='';own.reading=null;redraw();
 try{const data=await get('search',{concept:conceptIdOf(catalogueId),scope:own.status?.transport==='project'?'project':'',connector:own.connector,retrievable:own.retrievable?'1':''});if(state===own&&own.request===request){own.results={...data,conceptName:name||catalogueId};if(data.supplyStatus)own.status=data.supplyStatus;}}
 catch(e){if(state===own&&own.request===request){own.error=e.message;own.results=null;}}finally{if(state===own&&own.request===request){own.loading=false;redraw();}}
}
export function corpusFilter(key,value){if(key==='connector')state.connector=value;if(key==='retrievable')state.retrievable=!!value;}

// The exact revision a result names, wherever it is shown (list, reader or file matches).
export function corpusRevision(revisionId){
 const all=[...(state.results?.results||[]).map(x=>x.revision),...(state.results?.files||[]),state.reading?.revision].filter(Boolean);
 return all.find(r=>r.revisionId===revisionId)||null;
}
export function corpusPassage(passageId){return [state.reading,...(state.results?.results||[])].find(x=>x?.passageId===passageId)||null;}
// The project's own saved original for this exact identity (current project state, not the search snapshot).
export function savedOriginal(p,r){return knowledgeState(p).sources.find(x=>r.transport==='project'?x.id===r.sourceId&&x.hash===r.fileSha256:x.origin==='repository-fetch'&&x.repository===r.repository&&x.revision===r.commit&&x.path===r.path&&x.hash===r.fileSha256)||null;}

const UNTRUSTED={INSTRUCTION_SHAPED_CONTENT:'contains instruction-shaped text',EMBEDDED_SCRIPT:'contains embedded script',POSSIBLE_GENERATED_OR_MINIFIED_CONTENT:'may be generated or minified'};
function posture(r){
 const warn=(r.findings||[]).map(f=>UNTRUSTED[f]).filter(Boolean);
 if(r.transport==='project')return `<p class="kw-discovery-count">Saved project original · ${esc(r.licence.usePolicy||'Permitted use needs review')}. Search does not establish that a claim is eligible for this design.</p>`;
 return `<p class="kw-discovery-count">Use policy ${esc(r.licence.usePolicy||'unknown')} · licence ${esc(r.licence.spdx||'not detected')} (detected, not cleared) · ${esc(r.connector.lifecycle||'unregistered')} repository${warn.length?' · <span class="kw-overlap">'+esc(warn.join(', '))+'; read it as untrusted text</span>':''}</p>`;
}
function actions(p,x,r){
 const saved=savedOriginal(p,r),read=x&&state.reading?.passageId!==x.passageId?button('corpus-read','Read the passage',`data-id="${esc(x.passageId)}"`):'';
 if(saved)return `<div class="brain-actions">${read}<span class="kw-discovery-count">Original saved as ${esc(saved.id)}</span>${x?button('corpus-interpret','Interpret this passage',`data-id="${esc(x.passageId)}" data-source="${esc(saved.id)}"`):''}</div>`;
 return `<div class="brain-actions">${read}${r.command?button('corpus-fetch','Retrieve the exact original',`data-id="${esc(r.revisionId)}"`):`<small class="kw-corpus-why">${esc(r.retrieval.explanation||'This file cannot become a project source.')}</small>`}</div>`;
}
function hit(p,x){
 const r=x.revision;
 return `<article class="kw-lead kw-corpus-hit" data-k-passage="${esc(x.passageId)}"><span class="brain-eyebrow">${esc(r.connector.name||r.repository)} · unreviewed passage</span><b>${esc(x.heading||r.title)}</b><small>${esc(r.repository)} · ${esc(r.path)} · lines ${x.lineStart}–${x.lineEnd} · commit ${esc(r.commit.slice(0,10))}</small><p class="kw-snippet">${esc(x.verified?x.snippet:'The original could not be verified, so this passage is withheld.')}</p>${x.concepts.length?`<p class="kw-chips">Names catalogue concepts: ${x.concepts.map(c=>button('suggested-concept',esc(c.name),`data-id="${esc(c.catalogueId)}"`)).join(' ')}</p>`:''}${posture(r)}${actions(p,x,r)}</article>`;
}
function reader(p,x){
 const r=x.revision;
 return `<article class="kw-corpus-reader" aria-label="Repository passage"><div class="kw-form-heading">${button('corpus-close','← Results')}<span>${esc(r.path)} · lines ${x.lineStart}–${x.lineEnd}</span></div><span class="brain-eyebrow">Unreviewed repository text · not evidence until interpreted and reviewed</span><h4>${esc(x.heading||r.title)}</h4>${x.verified?`<pre>${esc(x.excerpt)}</pre>`:`<p class="kw-overlap">${esc(x.status==='excerpt-changed'?'The stored original no longer reproduces this passage.':'The original could not be verified.')} Nothing is shown.</p>`}${posture(r)}<div class="brain-actions">${x.previous?button('corpus-read','← Previous passage',`data-id="${esc(x.previous)}"`):''}${x.next?button('corpus-read','Next passage →',`data-id="${esc(x.next)}"`):''}</div>${actions(p,x,r)}<details><summary>Source identity</summary><p>${esc(r.repository)} @ ${esc(r.commit)}<br>${esc(r.path)}</p><p class="brain-hash">File SHA-256 ${esc(r.fileSha256)}</p><p class="brain-hash">Excerpt SHA-256 ${esc(x.excerptSha256)}</p><p class="brain-hash">${esc(r.revisionId)} · ${esc(x.passageId)}</p><p>Read from the verified original ${r.transport==='project'?'saved in this project':'on the repository machine'} at the time of this request. A hash establishes identity, not truth, licence or approval.</p></details></article>`;
}
export function renderCorpus(p){
 const st=state.status;
 if(!st)return `<section class="kw-discovery kw-corpus" aria-label="Knowledge repository"><span class="brain-eyebrow">Knowledge repository</span><p>Checking the knowledge repository…</p></section>`;
 if(!st.connected)return `<section class="kw-discovery kw-corpus is-offline" aria-label="Knowledge repository"><span class="brain-eyebrow">Knowledge repository · not connected</span><p>${esc(st.reason||'The knowledge repository is not connected on this server.')}</p><p class="brain-note">The bundled locators and packet preview below still work. On the repository laptop, start the service with <code>npm run repository:serve</code> and configure this server with its address and token.</p></section>`;
 const c=st.counts||{},res=state.results,local=st.transport==='project'||res?.transport==='project';
 const connectors=(st.connectors||[]).map(x=>`<option value="${esc(x.connectorId)}" ${x.connectorId===state.connector?'selected':''}>${esc(x.name||x.repository)} · ${esc(x.lifecycle)}${x.usePolicy==='metadata-only'?' · metadata only':''}</option>`).join('');
 const pages=res?Math.max(1,Math.ceil(res.total/(res.pageSize||20))):1;
 return `<section class="kw-discovery kw-corpus" aria-label="Knowledge repository"><span class="brain-eyebrow">Knowledge repository · discovery only</span><h4>${local?'Search saved project originals':'Search the acquired architecture corpus'}</h4><p>${local?`${esc(c.documents)} saved originals · ${esc(c.passages)} passages. Search the exact sources available to this project, then interpret and review their applicability.`:`${esc(c.connectors)} repositories · ${esc(c.documents)} documents · ${esc(c.passages)} passages · ${esc(c.retrievable)} files can become project sources. Passages are unreviewed repository text: read one, retrieve the exact original, then interpret and review it before it can support a design.`}</p>${local&&st.remote?.reason?`<p class="brain-note">External corpus: ${esc(st.remote.reason)} Saved originals remain available here.</p>`:''}
<form data-k-corpus-search class="kw-corpus-form"><label class="brain-field"><span>Search passages</span><div class="kw-search"><input data-k-corpus-query value="${esc(state.query)}" placeholder="Circuit breaker, outbox, zero trust…" aria-label="Search the knowledge repository"><button class="btn" type="submit">Search the corpus</button></div></label><div class="kw-corpus-filters"><label class="brain-field"><span>Repository</span><select data-k-corpus-connector aria-label="Repository filter"><option value="">All repositories</option>${connectors}</select></label>${local?'':`<label class="brain-check"><input type="checkbox" data-k-corpus-retrievable ${state.retrievable?'checked':''}> Only files I can retrieve into this project</label>`}</div></form>
${state.error?`<p class="kw-overlap" role="alert">${esc(state.error)}</p>`:''}${state.loading?'<p class="kw-discovery-count" role="status">Reading the repository…</p>':''}
${state.reading?reader(p,state.reading):res?`<p class="kw-discovery-count">${res.conceptName?'Passages that name '+esc(res.conceptName)+' (a lexical cue, not a judgement that it applies) · ':''}${esc(res.total)} matching passage${res.total===1?'':'s'}${res.total?' · page '+esc(res.page)+' of '+pages:''} · at most two per file</p><div class="kw-discovery-list kw-corpus-results">${res.results.map(x=>hit(p,x)).join('')||'<p>No passage matches every term. Try fewer or broader terms.</p>'}</div>${pages>1?`<div class="brain-actions kw-pager">${res.page>1?button('corpus-page','← Previous page',`data-page="${res.page-1}"`):''}${res.page<pages?button('corpus-page','Next page →',`data-page="${res.page+1}"`):''}</div>`:''}${res.files.length?`<details><summary>Matching file names · ${res.files.length}</summary>${res.files.map(r=>`<article class="kw-lead"><b>${esc(r.title)}</b><small>${esc(r.repository)} · ${esc(r.path)}</small>${posture(r)}${actions(p,null,r)}</article>`).join('')}</details>`:''}`:''}
<details><summary>Repository posture</summary>${local?`<p>Scope: current, intact originals already saved in this project. Withdrawn, superseded or changed-byte sources are withheld. This search neither reads the laptop corpus nor promotes a source into approved knowledge.${c.omitted?' '+esc(c.omitted)+' source or passage item(s) could not be exposed.':''}</p>`:`<p>Store ${esc(st.storeId)} · notice cursor ${esc(st.cursor)} · built ${esc(String(st.builtAt||'').slice(0,19).replace('T',' '))}. Licences are detected, not cleared. Candidate and discovery-only repositories can be searched but not retrieved; metadata-only dossiers expose file names only.</p>${button('corpus-sync','Apply signed repository notices now')}`}</details></section>`;
}
