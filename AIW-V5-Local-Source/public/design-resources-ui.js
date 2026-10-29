// One project entry to the existing Chapter 5 component library, Chapter 7 technology choices, and
// Proposals' governed sources. The catalogue is a read-only projection of the project's options.
import {COMPONENT_ARCHETYPES,COMPONENT_LIBRARY_KIND} from './component-library.js';
import {technologyCatalogue} from './technology-catalogue.js';
import {architectureKnowledgeSnapshot} from './architecture-knowledge.js';
import {knowledgeChoiceHTML} from './knowledge-explanation-ui.js';
import {SOURCE_MEDIA_AREAS,sourceMediaAreas} from './source-media-areas.js';
import {knowledgeState,releasedClaims} from './knowledge-governance.js';
import {corpusState,resetCorpus,loadCorpusStatus} from './repository-corpus-ui.js';
import {currentProject,projectURL,reportFailure,onProjectSwitch} from './project-context.js';
import {esc,safeUrl} from './html-escape.js';
import {openDialog,closeDialog} from './dialog.js';

let dialog=null,section='technology',selected='',query='',capability='',driver='',status='',mobileView='list',knowledgeLens='sources',sceneId='',sceneVideo='',sceneQuery='',sceneArea='';
const mediaByProject=new Map();
let mediaSequence=0,mediaTimer=0;
const freshMedia=()=>({phase:'idle',status:null,scenes:[],videos:[],total:0,nextOffset:null,counts:null,provenance:null,videoListTruncated:false,error:'',deepLinkId:'',unavailableScene:false});
const media=()=>{const key=currentProject()?.id;if(!key)return freshMedia();if(!mediaByProject.has(key))mediaByProject.set(key,freshMedia());return mediaByProject.get(key);};
const VALID_SECTIONS=new Set(['components','technology','knowledge']);
const RESOURCE_KEYS=['resources','resourceProduct','resourceQuery','resourceCapability','resourceDriver','resourceStatus','resourceLens','resourceScene','resourceVideo','resourceSceneQuery','resourceArea'];
const savedByProject=new Map();
const sourceLink=(url,label)=>url?`<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';
const chapter=(number,tab='work',extra='')=>projectURL(`/?chapter=${number}&tab=${tab}${extra}`);
const badge=(label,kind='neutral')=>`<span class="dr-badge dr-${kind}">${esc(label)}</span>`;
const link=(href,label,cls='')=>`<a class="dr-link ${cls}" href="${esc(href)}">${esc(label)}</a>`;
const btn=(action,label,cls='')=>`<button type="button" class="dr-link ${cls}" data-dr-action="${action}">${esc(label)}</button>`;
const filters=()=>({section,selected,query,capability,driver,status,mobileView,knowledgeLens,sceneId,sceneVideo,sceneQuery,sceneArea});
const remember=()=>{const p=currentProject();if(p)savedByProject.set(p.id,filters());};
const bounded=(value,max=120)=>String(value||'').slice(0,max);
function routeParams(){const q=new URLSearchParams(location.search);return {
 section:VALID_SECTIONS.has(q.get('resources'))?q.get('resources'):null,
 selected:bounded(q.get('resourceProduct'),90),query:bounded(q.get('resourceQuery')),
 capability:bounded(q.get('resourceCapability'),90),driver:bounded(q.get('resourceDriver'),90),status:bounded(q.get('resourceStatus'),30),
 knowledgeLens:q.get('resourceLens')==='scenes'?'scenes':'sources',sceneId:bounded(q.get('resourceScene'),180),sceneVideo:bounded(q.get('resourceVideo'),180),sceneQuery:bounded(q.get('resourceSceneQuery')),sceneArea:bounded(q.get('resourceArea'),25)
};}
function writeResourceRoute(push=false){
 const url=new URL(location.href);for(const key of RESOURCE_KEYS)url.searchParams.delete(key);
 url.searchParams.set('resources',section);
 if(section==='technology'){
  if(selected)url.searchParams.set('resourceProduct',selected);
  if(query)url.searchParams.set('resourceQuery',bounded(query));
  if(capability)url.searchParams.set('resourceCapability',capability);
  if(driver)url.searchParams.set('resourceDriver',driver);
  if(status)url.searchParams.set('resourceStatus',status);
 }
 if(section==='knowledge'&&knowledgeLens==='scenes'){
  url.searchParams.set('resourceLens','scenes');
  if(sceneId)url.searchParams.set('resourceScene',sceneId);
  if(sceneVideo)url.searchParams.set('resourceVideo',sceneVideo);
  if(sceneQuery)url.searchParams.set('resourceSceneQuery',bounded(sceneQuery));
  if(sceneArea)url.searchParams.set('resourceArea',sceneArea);
 }
 const href=projectURL(url.pathname+'?'+url.searchParams+url.hash);
 if(href===location.pathname+location.search+location.hash)return;
 if(push)history.pushState({aiw:'resources'},'',href);else history.replaceState(history.state,'',href);
}
function clearResourceRoute(){
 const url=new URL(location.href);for(const key of RESOURCE_KEYS)url.searchParams.delete(key);
 history.replaceState(history.state,'',projectURL(url.pathname+'?'+url.searchParams+url.hash));
}
function appearance(entry){
 const uses=entry.uses||[];
 return uses.some(u=>u.approved)?['External approval evidence recorded','approved']:
 uses.some(u=>u.needsReview)?['Selection needs review','working']:
 uses.some(u=>u.recorded)?['Current architect selection','approved']:
 uses.some(u=>u.selected)?['Draft preference','working']:
 uses.length?['Candidate option','neutral']:['Not considered','neutral'];
}
const terms=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function entryMatches(e){
 const p=currentProject(),cap=(p?.technology?.capabilities||[]).find(c=>c.id===capability);
 if(capability&&!(capability.startsWith('category:')?e.category===capability.slice(9):e.uses?.some(u=>u.capabilityIds?.includes(capability))||e.category===cap?.category&&e.uses?.some(u=>u.capabilities?.includes(cap?.title))))return false;
 if(driver&&!e.uses?.some(u=>u.driverImpacts?.some(d=>d.driverId===driver)))return false;
 const [state]=appearance(e);
 if(status==='in-design'&&!e.uses?.length)return false;
 if(status==='recorded'&&!e.uses?.some(u=>u.recorded))return false;
 if(status==='needs-review'&&!e.uses?.some(u=>u.needsReview))return false;
 if(status==='candidate'&&!e.uses?.some(u=>!u.selected))return false;
 if(status==='not-considered'&&e.uses?.length)return false;
 if(status==='approved'&&!e.uses?.some(u=>u.approved))return false;
 const corpus=[e.name,e.category,e.summary,state,...(e.uses||[]).flatMap(u=>[u.realizationTitle,u.realizationRef,u.rationale,u.drawbacks,u.evidence,...(u.capabilities||[]),...(u.driverImpacts||[]).flatMap(d=>[d.driver,d.effect,d.reason,d.evidence])])].join(' ');
 return terms(query).split(' ').filter(Boolean).every(t=>terms(corpus).includes(t));
}
function usageCard(use,knowledgeSnapshot){
 const assumptions=use.assumptions||{},effects=use.driverImpacts||[],p=currentProject();
 const capabilities=(p.technology?.capabilities||[]).filter(c=>use.capabilityIds?.includes(c.id));
 const choice={product:use.product,capabilities,version:assumptions.version,topology:assumptions.topology,tier:assumptions.tier,operatingModel:assumptions.operatingModel,driverIds:effects.map(d=>d.driverId)};
 return `<article class="dr-usage-card"><div class="dr-usage-title"><div><span class="dr-eyebrow">${esc(use.realizationRef||use.realizationId)} · ${esc(use.capabilities?.join(', ')||use.realizationTitle||'realization')}</span><h5>${esc(use.product)}</h5></div>${badge(use.status||'Option',use.approved?'approved':use.needsReview?'working':use.recorded?'approved':'neutral')}</div>
 <p class="dr-usage-why"><b>Why considered or chosen</b><span>${esc(use.rationale||'No recorded selection rationale for this option.')}</span></p>
 ${use.drawbacks?`<p class="dr-usage-tradeoff"><b>Trade-off</b> ${esc(use.drawbacks)}</p>`:''}
 ${effects.length?`<div class="dr-effect-grid" aria-label="Quality-driver effects">${effects.map(d=>`<div><b>${esc(d.driver)}</b>${badge(d.effect||'Needs evidence',d.effect==='supports'?'approved':d.effect==='tradeoff'?'working':'neutral')}<p>${esc(d.reason||'Reason still needed')}</p>${d.evidence?`<small>Evidence: ${esc(d.evidence)}</small>`:''}</div>`).join('')}</div>`:'<p class="dr-muted">No effect on a connected quality driver has been recorded for this option.</p>'}
 <p class="dr-evidence"><b>Evidence and authority</b> ${esc(use.sourceStatus||'Product fact requires source review.')} ${use.evidence?'Option evidence: '+esc(use.evidence):'No option evidence recorded.'}</p>${use.sourceVersionMismatch?`<p class="dr-version-caution" role="note">${esc(use.sourceVersionMismatch)}</p>`:''}
 ${knowledgeChoiceHTML(p,choice,{sourceAction:'resources',knowledgeSnapshot})}
 <div class="dr-brief-facts"><span><b>Version</b> ${esc(assumptions.version||'Not established')}</span><span><b>Service tier</b> ${esc(assumptions.tier||'Not established')}</span></div>
 <details><summary>Specifications and operating assumptions</summary><dl class="dr-facts">${[['Version',assumptions.version],['Service tier',assumptions.tier],['Operating model',assumptions.operatingModel],['Topology',assumptions.topology],['Instances',assumptions.instances],['Failure domains',assumptions.failureDomains],['Workload basis',assumptions.workload],['Configuration basis',assumptions.configurationBasis]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value||'Not established')}</dd></div>`).join('')}</dl></details>
 <div class="dr-actions">${link(chapter(7,'model',`&object=${encodeURIComponent(use.realizationId)}&model=options`),'Inspect model options')}${link(chapter(7,'work',`&object=${encodeURIComponent(use.realizationId)}`),'Compare and record')}${link(chapter(2,'model'),'Inspect quality drivers')}</div></article>`;
}
function unrecorded(entry,matching){
 return `<div class="dr-empty-inline"><p>This product is not in a recorded Chapter 7 comparison for this project.</p>${matching.length?`<p>Start an unsaved option under a connected capability:</p><div class="dr-actions">${matching.map(r=>link(chapter(7,'work',`&object=${encodeURIComponent(r.id)}&product=${encodeURIComponent(entry.id)}`),`Compare for ${r.ref||r.title||r.id}`)).join('')}</div>`:`<p>Define the supporting capability in Chapter 6, then compare products in Chapter 7.</p>${link(chapter(6),'Open Chapter 6')}`}</div>`;
}
function productDetail(entry){
 if(!entry)return `<div class="dr-empty"><h3>Choose a product</h3><p>Inspect where it is considered in this project, its documented mechanisms, and the assumptions that still need verification.</p></div>`;
 const uses=entry.uses||[],mechanisms=entry.mechanisms||[],assumptions=entry.assumptions||{},p=currentProject(),knowledgeSnapshot=architectureKnowledgeSnapshot(p),[state,kind]=appearance(entry);
 const matching=(p.technologyRealisation?.records||[]).filter(r=>(p.technologyRealisation?.mappings||[]).some(m=>m.realizationId===r.id&&(p.technology?.capabilities||[]).some(c=>c.id===m.capabilityId&&c.category===entry.category)));
 return `<article class="dr-detail" aria-label="${esc(entry.name)} detail"><div class="dr-detail-head"><div><button type="button" class="dr-back" data-dr-action="back-products">← Products</button><p class="dr-eyebrow">${esc(entry.category||'Technology product')}</p><h3 class="dr-product-title" tabindex="-1">${esc(entry.name)}</h3></div>${badge(state,kind)}</div>
 <p>${esc(entry.summary||'No descriptive summary has been recorded.')}</p><p class="dr-muted">${esc(entry.provenance?.note||'Catalogue presence alone is not approval or evidence of a quality target.')}</p>
 <section aria-label="Decision in this design"><h4>In this design</h4>${uses.length?`<div class="dr-usage">${uses.map(u=>usageCard(u,knowledgeSnapshot)).join('')}</div>`:unrecorded(entry,matching)}</section>
 <section class="dr-product-basis" aria-label="Documented product basis"><h4>Documented product basis</h4>${uses.length?'':'<dl class="dr-facts">'+[['Version',assumptions.version],['Service tier',assumptions.tier],['Operating model',assumptions.operatingModel],['Topology',assumptions.topology]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value||'Not established for this project')}</dd></div>`).join('')+'</dl>'}
 ${mechanisms.length?`<details><summary>Documented mechanisms · ${mechanisms.length}</summary><ul class="dr-mechanisms">${mechanisms.map(m=>`<li><b>${esc(m.effect||'Documented')}</b> ${esc(m.text)}${m.condition?`<small>Condition: ${esc(m.condition)}</small>`:''}${m.source?sourceLink(m.source,'Read original documentation'):''}</li>`).join('')}</ul></details>`:'<p class="dr-muted">No documented mechanism is recorded here. Product claims need exact current sources and review.</p>'}</section>
 <div class="dr-actions">${link(chapter(7),'Open Chapter 7','primary')}${entry.documentation?sourceLink(entry.documentation,'Product documentation'):''}</div></article>`;
}
function technology(p){
 const entries=technologyCatalogue(p).entries||[],visible=entries.filter(entryMatches);
 if(!visible.some(x=>x.id===selected))selected=visible[0]?.id||'';
 const product=entries.find(x=>x.id===selected);
 const categories=[...new Set(entries.map(x=>x.category).filter(Boolean))].sort();
 const caps=(p.technology?.capabilities||[]).filter(c=>entries.some(e=>e.uses?.some(u=>u.capabilityIds?.includes(c.id))));
 const drivers=(p.quality?.drivers||[]).filter(d=>entries.some(e=>e.uses?.some(u=>u.driverImpacts?.some(i=>i.driverId===d.id))));
 return `<div class="dr-intro"><p class="dr-eyebrow">Technology products · Chapter 6 → 7</p><h2>Find a product. Follow the decision.</h2><p>See its project rationale, quality effects and evidence, then continue the same comparison in Chapter 7.</p></div>
 <div class="dr-tech-layout" data-mobile-view="${mobileView}"><div class="dr-picker"><label for="dr-search">Search products and reasons</label><input id="dr-search" type="search" data-dr-search value="${esc(query)}" placeholder="Kafka, PostgreSQL, reliability…" autocomplete="off" maxlength="120">
 <div class="dr-filters"><label>Capability<select data-dr-filter="capability"><option value="">All capabilities</option><optgroup label="Product categories">${categories.map(c=>`<option value="category:${esc(c)}" ${capability==='category:'+c?'selected':''}>${esc(c)}</option>`).join('')}</optgroup>${caps.length?`<optgroup label="In this design">${caps.map(c=>`<option value="${esc(c.id)}" ${capability===c.id?'selected':''}>${esc(c.title||c.id)}</option>`).join('')}</optgroup>`:''}</select></label>
 <label>Quality driver<select data-dr-filter="driver"><option value="">All drivers</option>${drivers.map(d=>`<option value="${esc(d.id)}" ${driver===d.id?'selected':''}>${esc(d.title||d.id)}</option>`).join('')}</select></label>
 <label>Decision state<select data-dr-filter="status"><option value="">All states</option>${[['in-design','Considered in project'],['recorded','Recorded selection'],['needs-review','Needs review'],['candidate','Candidate option'],['approved','External approval recorded'],['not-considered','Not considered']].map(([id,label])=>`<option value="${id}" ${status===id?'selected':''}>${label}</option>`).join('')}</select></label></div>
 <p class="dr-list-count">${visible.length} of ${entries.length} products · ${entries.filter(x=>x.uses?.length).length} appear in project options</p><div class="dr-products" role="group" aria-label="Technology products">${entries.map(e=>{const [state]=appearance(e);return `<button type="button" data-dr-product="${esc(e.id)}" aria-pressed="${e.id===selected}" ${visible.includes(e)?'':'hidden'}><span><b>${esc(e.name)}</b><small>${esc(e.category||'Technology')} · ${esc(state)}</small></span><span aria-hidden="true">›</span></button>`}).join('')}</div><p class="dr-no-match" ${visible.length?'hidden':''}>No matching product. Change a filter or add a custom option in Chapter 7.</p></div><div class="dr-detail-slot">${visible.length?productDetail(product):'<div class="dr-empty"><h3>No matching product</h3><p>Change a filter or add a custom option in Chapter 7.</p></div>'}</div></div>`;
}
function components(p){
 const mine=(p.workbench?.catalogue||[]).filter(x=>x.kind===COMPONENT_LIBRARY_KIND&&x.status!=='deprecated');
 return `<div class="dr-intro"><p class="dr-eyebrow">Application component library · Chapter 5</p><h2>Reuse an application role with its obligations.</h2><p>Library entries capture component responsibilities, interfaces, data, technology needs and conditions. Proposing one puts an unsaved candidate on the Chapter 5 model for the architect to review.</p></div>
 <div class="dr-callout"><div><b>${mine.length} project entr${mine.length===1?'y':'ies'}</b><p>Organisation entries and their review status are available in the Chapter 5 library browser.</p></div>${btn('browse-components','Browse the component library','primary')}</div>
 ${mine.length?`<section class="dr-section"><h3>From this project</h3><div class="dr-card-grid">${mine.map(e=>`<article class="dr-card"><span class="dr-eyebrow">${esc(e.status||'draft')} · revision ${esc(e.revision||1)}</span><h4>${esc(e.title)}</h4><p>${esc(e.owner||'Owner not recorded')}</p>${link(chapter(5,'work',`&library=${encodeURIComponent('project:'+e.id)}`),'Propose in Chapter 5')}</article>`).join('')}</div></section>`:''}
 <section class="dr-section"><div class="dr-section-head"><h3>Catalogue archetypes</h3>${badge(`${COMPONENT_ARCHETYPES.length} descriptive roles`)}</div><div class="dr-card-grid">${COMPONENT_ARCHETYPES.map(a=>`<article class="dr-card"><span class="dr-eyebrow">${esc(a.id)}</span><h4>${esc(a.name)}</h4>${link(chapter(5,'work',`&library=${encodeURIComponent('archetype:'+a.id)}`),'Propose in Chapter 5')}</article>`).join('')}</div></section><p class="dr-muted">A component archetype or snapshot is a starting point. The architecture’s own interfaces, needs and evidence remain to be reviewed.</p>`;
}
const videoTime=value=>{const n=Math.max(0,Number(value)||0),whole=Math.floor(n),fraction=n-whole,seconds=String(whole%60).padStart(2,'0')+(fraction?fraction.toFixed(4).slice(1).replace(/0+$/,''):'');return `${String(Math.floor(whole/60)).padStart(2,'0')}:${seconds}`;};
const sceneLocator=scene=>`${scene.packId||'Source'} · ${scene.videoId} · ${scene.sceneId} · ${videoTime(scene.startSeconds)}–${videoTime(scene.endSeconds)}`;
const sceneAreas=sourceMediaAreas;
const visibleScenes=()=>media().scenes;
function normalizeScene(x){
 return {id:String(x.sourceMediaId||x.id||x.sceneId||''),sceneId:String(x.sceneId||''),packId:String(x.packId||''),manifestSha256:String(x.manifestSha256||''),videoId:String(x.videoId||''),videoKey:String(x.videoKey||''),title:String(x.title||'Untitled scene'),summary:String(x.summary||''),startSeconds:Number(x.startMs??(Number(x.startSeconds||0)*1000))/1000,endSeconds:Number(x.endMs??(Number(x.endSeconds||0)*1000))/1000,startFrame:x.startFrame,endFrame:x.endFrame,assetTypes:Array.isArray(x.assetTypes)?x.assetTypes:[],candidateEntities:Array.isArray(x.candidateEntities)?x.candidateEntities:[],relatedNodes:Array.isArray(x.relatedNodes)?x.relatedNodes:[],relatedEdges:Array.isArray(x.relatedEdges)?x.relatedEdges:[],fileName:x.fileName||'',videoTitle:x.videoTitle||'',authorityState:x.authorityState||'candidate',rightsState:x.rightsState||'unknown',originalVideosPresent:!!x.originalVideosPresent,transcriptAvailable:!!x.transcriptAvailable};
}
async function fetchMedia({more=false}={}){
 const p=currentProject();if(!p)return;const key=p.id,m=media(),sequence=++mediaSequence;
 if(more&&m.nextOffset==null)return;
 m.phase='loading';m.error='';
 if(!more){m.scenes=[];m.total=0;m.nextOffset=null;const list=dialog?.querySelector('.dr-scenes');if(list){list.replaceChildren();list.setAttribute('aria-busy','true');}const count=dialog?.querySelector('.dr-scene-count');if(count)count.textContent='Loading source media…';const slot=dialog?.querySelector('.dr-scene-slot');if(slot)slot.innerHTML='<div class="dr-empty" role="status"><p>Loading source media…</p></div>';}
 try{
  if(!m.status){
   const statusURL=projectURL('/api/knowledge/corpus?view=video-status',key);
   const response=await fetch(statusURL,{credentials:'same-origin'});
   if(!response.ok)throw Error(response.status===403?'Source media is unavailable for this project.':'The knowledge repository is not connected.');
   m.status=await response.json();
  }
  if(m.status.connected===false){m.phase='offline';m.error=m.status.reason||'Connect a knowledge repository to browse source media.';return;}
  const url=new URL(projectURL('/api/knowledge/corpus',key),location.origin);
  for(const [param,value] of Object.entries({view:'video',q:sceneQuery,videoKey:sceneVideo,area:sceneArea,offset:more?m.nextOffset:0,limit:50}))url.searchParams.set(param,String(value));
  const response=await fetch(url,{credentials:'same-origin'});
  if(!response.ok)throw Error(response.status===403?'Source media is unavailable for this project.':'Source media could not be loaded from the repository.');
  const data=await response.json();
  if(sequence!==mediaSequence||currentProject()?.id!==key)return;
  const scenes=(Array.isArray(data.results)?data.results:[]).map(normalizeScene).filter(x=>x.id);
  m.scenes=more?[...m.scenes,...scenes.filter(x=>!m.scenes.some(y=>y.id===x.id))]:scenes;
  m.total=Number(data.total)||0;m.nextOffset=data.nextOffset??null;m.counts=data.counts||null;m.provenance=data.provenance||null;
  m.videos=Array.isArray(data.videos)?data.videos:[];m.videoListTruncated=!!data.videoListTruncated;
  if(m.deepLinkId&&!m.scenes.some(x=>x.id===m.deepLinkId)){
   const wanted=m.deepLinkId;
   const exactURL=new URL(projectURL('/api/knowledge/corpus',key),location.origin);
   exactURL.searchParams.set('view','video');exactURL.searchParams.set('key',wanted);
   const exactResponse=await fetch(exactURL,{credentials:'same-origin'});
   if(sequence!==mediaSequence||currentProject()?.id!==key)return;
   if(exactResponse.ok){const exact=await exactResponse.json();if(sequence!==mediaSequence||currentProject()?.id!==key)return;const located=exact.results?.[0];if(located?.sourceMediaId===wanted||located?.id===wanted)m.scenes.unshift(normalizeScene(located));else m.unavailableScene=true;}
   else m.unavailableScene=true;
   m.deepLinkId='';
  }
  m.phase='ready';
 }catch(e){
  if(sequence!==mediaSequence||currentProject()?.id!==key)return;
  m.phase='error';m.error=e.message;
 }finally{if(sequence===mediaSequence&&currentProject()?.id===key&&dialog?.isConnected&&section==='knowledge'&&knowledgeLens==='scenes'){render();writeResourceRoute(false);}}
}
function scheduleMedia(){
 clearTimeout(mediaTimer);
 // A request already in flight may finish; the sequence guard discards its result.
 ++mediaSequence;
 mediaTimer=setTimeout(()=>fetchMedia(),220);
}
function sceneDetail(scene){
 if(!scene)return '<div class="dr-empty"><h3>Choose a scene</h3><p>Select a result to inspect its source locator, relationships and review status.</p></div>';
 const m=media(),video=m.videos.find(x=>x.id===scene.videoKey),nodes=new Map(scene.relatedNodes.map(x=>[x.id,x.title||x.name||x.id]));
 const name=scene.fileName||video?.fileName||scene.videoId,rights=scene.rightsState==='restricted-source-review-required'?'Restricted · source review required':scene.rightsState.replaceAll('-',' ');
 const mediaAvailable=scene.originalVideosPresent||video?.mediaAvailable,transcriptAvailable=scene.transcriptAvailable||video?.transcriptAvailable;
 const related=scene.relatedNodes||[],edges=scene.relatedEdges||[];
 return `<article class="dr-detail dr-scene-detail" aria-label="${esc(scene.title)} scene"><div class="dr-detail-head"><div><p class="dr-eyebrow">${esc(sceneLocator(scene))}</p><h3 class="dr-scene-title" tabindex="-1">${esc(scene.title)}</h3><small>${esc(scene.videoTitle||video?.title||scene.videoId)}</small></div>${badge(scene.authorityState==='candidate'?'Candidate · unreviewed':scene.authorityState,scene.authorityState==='candidate'?'working':'neutral')}</div>
 <p class="dr-scene-summary">${esc(scene.summary)}</p><p class="dr-muted">${mediaAvailable?'The original is available through the governed source workflow.':'The original is not available in this workspace.'} ${transcriptAvailable?'A transcript is available for source review.':'No verified transcript is available here.'}</p>
 <dl class="dr-facts dr-scene-facts"><div><dt>Source locator</dt><dd>${esc(name)} · ${videoTime(scene.startSeconds)}–${videoTime(scene.endSeconds)}</dd></div><div><dt>Frame span</dt><dd>${esc(scene.startFrame??'Unknown')}–${esc(scene.endFrame??'Unknown')}</dd></div><div><dt>Rights</dt><dd>${esc(rights)}</dd></div><div><dt>Source authority</dt><dd>${esc(scene.authorityState==='candidate'?'Candidate interpretation · unreleased':scene.authorityState)}</dd></div></dl>
 ${scene.manifestSha256?`<details class="dr-video-footnote"><summary>Source index provenance</summary><p>Manifest SHA-256 ${esc(scene.manifestSha256)}</p></details>`:''}
 ${scene.assetTypes.length?`<p class="dr-scene-tags"><b>Related concepts</b> ${scene.assetTypes.map(x=>badge(x)).join('')}</p>`:''}
 ${sceneAreas(scene).length?`<section class="dr-scene-areas"><h4>Areas to review</h4><p class="dr-muted">These categories help you find material. A source review is required before a design can rely on this interpretation.</p><div class="dr-actions">${sceneAreas(scene).map(area=>badge(area.name)).join('')}</div></section>`:''}
 ${related.length?`<section class="dr-scene-assets"><h4>Related knowledge</h4><p class="dr-muted">Relationships are source interpretations and carry their own review status.</p><div class="dr-card-grid">${related.map(a=>`<article class="dr-card"><span class="dr-eyebrow">${esc(a.type||'Concept')} · ${esc(a.id)}</span><h5>${esc(a.title||a.name||a.id)}</h5>${a.description?`<p>${esc(a.description)}</p>`:''}</article>`).join('')}</div></section>`:''}
 ${edges.length?`<details class="dr-scene-connections"><summary>Relationships · ${edges.length}</summary><ul>${edges.map(r=>`<li>${esc(nodes.get(r.subjectId||r.from)||r.subjectId||r.from)} <b>${esc(String(r.predicate||r.type||'related to').toLowerCase().replaceAll('_',' '))}</b> ${esc(nodes.get(r.objectId||r.to)||r.objectId||r.to)}</li>`).join('')}</ul></details>`:''}
 <aside class="dr-scene-gate"><h4>Use this in a design</h4><p>Check the permitted original and rights, interpret the relevant passage, then obtain independent review and release with provenance. Assess applicability to this project’s quality drivers before linking a claim to a decision.</p></aside>
 <div class="dr-actions">${btn('copy-scene-locator','Copy source locator')}${btn('open-sources','Open Sources for review','primary')}</div></article>`;
}
function videoKnowledge(){
 const m=media(),visible=visibleScenes();if(m.phase==='ready'&&!m.unavailableScene&&!visible.some(x=>x.id===sceneId))sceneId=visible[0]?.id||'';
 if(m.phase==='idle'||m.phase==='loading'&&!m.scenes.length)return '<div class="dr-empty dr-media-state" role="status"><h3>Source media</h3><p>Loading media from this project’s knowledge repository…</p></div>';
 if(m.phase==='error'||m.phase==='offline')return `<div class="dr-empty dr-media-state" role="status"><h3>Source media is unavailable</h3><p>${esc(m.error||'Connect a knowledge repository to browse source media.')}</p>${btn('retry-media','Try again')}${btn('open-sources','Open Sources')}</div>`;
 return `<div class="dr-video-intro"><div><p class="dr-eyebrow">Knowledge repository · source review</p><h3>Explore source media</h3><p>Find timecoded material, inspect its provenance and relationships, then review a source before using it in an architecture decision.</p></div>${badge(`${m.counts?.videos??m.videos.length} recordings · ${m.counts?.scenes??m.total} scenes`)}</div>
 <div class="dr-video-layout"><div class="dr-video-picker"><label for="dr-scene-query">Search scenes and concepts</label><input id="dr-scene-query" type="search" data-dr-scene-search value="${esc(sceneQuery)}" placeholder="Search a concept…" autocomplete="off" maxlength="120"><label for="dr-scene-video">Recording</label><select id="dr-scene-video" data-dr-scene-video><option value="">All recordings</option>${m.videos.map(v=>`<option value="${esc(v.id)}" ${sceneVideo===v.id?'selected':''}>${esc(v.title||v.id)}</option>`).join('')}</select>${m.videoListTruncated?'<p class="dr-muted">Showing the first 50 recordings. Search covers all accessible media.</p>':''}<label for="dr-scene-area">Design area</label><select id="dr-scene-area" data-dr-scene-area><option value="">All areas</option>${SOURCE_MEDIA_AREAS.map(a=>`<option value="${esc(a.id)}" ${sceneArea===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select><p class="dr-scene-count">${visible.length} shown · ${m.total} matching scenes${m.phase==='loading'?' · loading…':''}</p><div class="dr-scenes" role="group" aria-label="Source media scenes">${m.scenes.map(s=>`<button type="button" data-dr-scene="${esc(s.id)}" aria-pressed="${s.id===sceneId}" ${visible.includes(s)?'':'hidden'}><span><small>${esc(s.videoId)} · ${videoTime(s.startSeconds)}–${videoTime(s.endSeconds)}</small><b>${esc(s.title)}</b></span><span aria-hidden="true">›</span></button>`).join('')}</div><p class="dr-no-scenes" ${visible.length?'hidden':''}>${m.counts?.scenes===0?'No source media is available to this workspace yet.':m.total===0?'No matching scene. Change your search or filters.':m.scenes.length?'No scenes in this area on the loaded page.':'No source media is available.'}</p>${m.nextOffset!=null?btn('more-media','Load more scenes'):''}${m.counts?.scenes===0?btn('retry-media','Refresh sources'):''}</div><div class="dr-scene-slot">${m.unavailableScene?'<div class="dr-empty" role="status"><h3>Source unavailable</h3><p>This source is unavailable or outside your current access.</p></div>':sceneDetail(visible.find(x=>x.id===sceneId))}</div></div>

`;
}
function knowledgeSources(p){
 resetCorpus(p.id);const status=corpusState().status,s=knowledgeState(p),sources=s.sources||[],originals=sources.filter(x=>x.origin==='repository-fetch'),eligible=releasedClaims(p).filter(x=>x.eligible&&!x.release.organizationId),sourceIds=new Set(originals.map(x=>x.id)),signed=eligible.filter(x=>sourceIds.has(x.claim.sourceId));
 const sourceStatus=src=>{const n=eligible.filter(x=>x.claim.sourceId===src.id).length,candidates=(s.claims||[]).filter(x=>x.sourceId===src.id).length;return n?badge(`${n} eligible released claim${n===1?'':'s'}`,'approved'):candidates?badge('Interpretation awaiting release','working'):badge('No eligible reviewed claim');};
 return `<div class="dr-intro"><p class="dr-eyebrow">Knowledge repository · Design Resources</p><h2>Find an exact source. See its authority.</h2><p>The workbench reads a configured repository service and selected source transfers. Availability depends on this workspace’s connection and permissions. Retrieval gives an original for interpretation; review and release are separate decisions.</p></div>
 <div class="dr-status ${status?.connected?'connected':'unconnected'}" role="status"><div><span class="dr-status-dot" aria-hidden="true"></span><b>${!status?'Checking repository connection…':status.connected?'Repository service connected':'Repository service not connected'}</b><p>${!status?'Reading this server’s connection state.':status.connected?`${esc(status.counts?.documents??0)} indexed documents · ${esc(status.counts?.passages??0)} passages · discovery only`:`${esc(status.reason||'This server cannot reach a repository service.')} Bundled locators and signed selected-original transfer remain available in Sources.`}</p></div>${btn('open-sources','Open Sources','primary')}</div>
 <div class="dr-metrics"><div><b>${sources.length}</b><span>Originals in this project</span></div><div><b>${signed.length}</b><span>Eligible signed repository claims</span></div><div><b>${s.claims?.length||0}</b><span>Candidate interpretations</span></div></div>
 <section class="dr-section"><div class="dr-section-head"><h3>Exact originals in this project</h3>${btn('open-releases','Review releases')}</div>${sources.length?`<div class="dr-source-list">${sources.slice(0,12).map(src=>`<article><div><b>${esc(src.title)}</b><small>${esc(src.repository||src.path||src.id)} · ${esc(src.revision||'revision not recorded')}</small></div>${sourceStatus(src)}</article>`).join('')}</div>${sources.length>12?`<p class="dr-muted">Showing 12 of ${sources.length}. Open Sources for the full register and exact passages.</p>`:''}`:'<div class="dr-empty"><p>No exact originals have been saved into this project. Search Sources when the repository service is connected, retrieve an allowed original, or transfer a selected source.</p></div>'}</section>
 <p class="dr-muted">No source here becomes design authority until an independently reviewed interpretation is in an active signed release and linked to this design. A product mechanism or catalogue match alone does not meet that gate.</p>`;
}
function knowledge(p){
 return `<nav class="dr-knowledge-lenses" aria-label="Knowledge resource lenses"><button type="button" data-dr-lens="sources" aria-pressed="${knowledgeLens==='sources'}">Sources and releases</button><button type="button" data-dr-lens="scenes" aria-pressed="${knowledgeLens==='scenes'}">Source media${media().counts?.scenes!=null?` <span>${media().counts.scenes}</span>`:''}</button></nav>${knowledgeLens==='scenes'?videoKnowledge():knowledgeSources(p)}`;
}
function announce(message){const el=dialog?.querySelector('.dr-live');if(el)el.textContent=message;}
function render({resetScroll=false}={}){
 if(!dialog?.isConnected)return;const p=currentProject();if(!p){close({route:false});return;}
 const active=dialog.contains(document.activeElement)?document.activeElement:null;
 const caret=active?.matches?.('[data-dr-scene-search]')?[active.selectionStart,active.selectionEnd]:null;
 const focus=active?.dataset.drTab?['tab',active.dataset.drTab]:active?.dataset.drLens?['lens',active.dataset.drLens]:active?.dataset.drScene?['scene',active.dataset.drScene]:active?.matches('[data-dr-scene-search]')?['scene-search','']:active?.matches('[data-dr-scene-video]')?['scene-video','']:active?.matches('[data-dr-scene-area]')?['scene-area','']:active?.dataset.drProduct?['product',active.dataset.drProduct]:active?.dataset.drFilter?['filter',active.dataset.drFilter]:active?.matches('[data-dr-search]')?['search','']:null;
 const scroll=resetScroll?0:dialog.querySelector('.dr-body')?.scrollTop||0;
 dialog.innerHTML=`<div class="dr-shell"><header class="dr-header"><div><p class="dr-eyebrow">${esc(p.name)} · architecture workspace</p><h1 id="dr-title">Design resources</h1><p>Follow reusable components, product decisions and source authority into this project's model.</p></div><div class="dr-header-actions">${btn('copy-link','Copy view link')}<button type="button" class="dr-close" data-dialog-close aria-label="Return to chapter">×</button></div></header><nav class="dr-tabs" aria-label="Design resource views">${[['components','Component library'],['technology','Technology products'],['knowledge','Knowledge repository']].map(([id,label])=>`<button type="button" data-dr-tab="${id}" aria-pressed="${section===id}">${esc(label)}</button>`).join('')}</nav><p class="dr-live" role="status" aria-live="polite"></p><div class="dr-body">${section==='components'?components(p):section==='knowledge'?knowledge(p):technology(p)}</div></div>`;
 dialog.classList.toggle('dr-show-detail',section==='technology'&&mobileView==='detail');
 const body=dialog.querySelector('.dr-body');if(body)body.scrollTop=scroll;
 const target=focus?.[0]==='tab'?dialog.querySelector(`[data-dr-tab="${focus[1]}"]`):focus?.[0]==='lens'?dialog.querySelector(`[data-dr-lens="${focus[1]}"]`):focus?.[0]==='scene'?[...dialog.querySelectorAll('[data-dr-scene]')].find(x=>x.dataset.drScene===focus[1]):focus?.[0]==='scene-search'?dialog.querySelector('[data-dr-scene-search]'):focus?.[0]==='scene-video'?dialog.querySelector('[data-dr-scene-video]'):focus?.[0]==='scene-area'?dialog.querySelector('[data-dr-scene-area]'):focus?.[0]==='product'?[...dialog.querySelectorAll('[data-dr-product]')].find(x=>x.dataset.drProduct===focus[1]):focus?.[0]==='filter'?dialog.querySelector(`[data-dr-filter="${focus[1]}"]`):focus?.[0]==='search'?dialog.querySelector('[data-dr-search]'):null;
 target?.focus({preventScroll:true});if(caret&&target?.setSelectionRange)target.setSelectionRange(...caret);remember();
}
function updateProductResults(){
 if(!dialog?.isConnected)return;const entries=technologyCatalogue(currentProject()).entries||[],visible=entries.filter(entryMatches);
 const changed=!visible.some(x=>x.id===selected);if(changed)selected=visible[0]?.id||'';
 for(const card of dialog.querySelectorAll('[data-dr-product]')){card.hidden=!visible.some(e=>e.id===card.dataset.drProduct);card.setAttribute('aria-pressed',String(card.dataset.drProduct===selected));}
 const count=dialog.querySelector('.dr-list-count');if(count)count.textContent=`${visible.length} of ${entries.length} products · ${entries.filter(x=>x.uses?.length).length} appear in project options`;
 const noMatch=dialog.querySelector('.dr-no-match');if(noMatch)noMatch.hidden=visible.length!==0;
 if(changed){const slot=dialog.querySelector('.dr-detail-slot');if(slot)slot.innerHTML=visible.length?productDetail(entries.find(x=>x.id===selected)):'<div class="dr-empty"><h3>No matching product</h3><p>Change a filter or add a custom option in Chapter 7.</p></div>';}
 writeResourceRoute(false);remember();announce(`${visible.length} products match${selected?'. '+entries.find(x=>x.id===selected)?.name+' selected.':'.'}`);
}
function close({route=true}={}){
 if(!dialog)return;const was=dialog;dialog=null;closeDialog(was);
 ++mediaSequence;clearTimeout(mediaTimer);mediaByProject.clear();
 // On phones the rail closes before this reading opens. Its remembered button is offscreen;
 // return the keyboard to the visible chapter control when the resource view closes.
 if(matchMedia('(max-width:700px)').matches&&was.opener?.el?.closest('.journey-rail:not(.open)'))
  document.querySelector('.mobile-layers')?.focus({preventScroll:true});
 if(route&&new URLSearchParams(location.search).has('resources')){
  if(history.state?.aiw==='resources'){window.aiwResourceClosing=true;history.back();}else clearResourceRoute();
 }
}
async function sources(view){
 route(chapter(1,'work'));
 try{const m=await import('./brain-context-ui.js');if(!window.aiwKnowledge){const q=new URLSearchParams(location.search);m.mountBrainContext(currentProject(),{chapter:Number(q.get('chapter')||1),id:q.get('object')||'project'},document.body.dataset.workspaceTab||q.get('tab')||'work');}
  window.aiwKnowledge?.openView(view);
 }catch(e){reportFailure('The knowledge workspace could not open. Try Co-design from the chapter bar.',e);}
}
function route(href){close({route:false});if(!window.aiwRoute?.(href))location.assign(href);}
function bind(){
 dialog.addEventListener('click',event=>{
  const tab=event.target.closest('[data-dr-tab]');if(tab){section=tab.dataset.drTab;mobileView='list';if(section==='knowledge'&&knowledgeLens==='scenes')mediaByProject.delete(currentProject()?.id);render({resetScroll:true});writeResourceRoute(false);dialog.querySelector(`[data-dr-tab="${section}"]`)?.focus({preventScroll:true});announce(`${tab.textContent.trim()} opened.`);if(section==='knowledge'){loadCorpusStatus(render);if(knowledgeLens==='scenes')fetchMedia();}return;}
  const lens=event.target.closest('[data-dr-lens]');if(lens){knowledgeLens=lens.dataset.drLens;if(knowledgeLens==='scenes')mediaByProject.delete(currentProject()?.id);render({resetScroll:true});writeResourceRoute(false);dialog.querySelector(`[data-dr-lens="${knowledgeLens}"]`)?.focus({preventScroll:true});announce(knowledgeLens==='scenes'?'Source media opened.':'Sources and releases opened.');if(knowledgeLens==='scenes')fetchMedia();return;}
  const scene=event.target.closest('[data-dr-scene]');if(scene){sceneId=scene.dataset.drScene;media().unavailableScene=false;render();writeResourceRoute(false);dialog.querySelector('.dr-scene-title')?.focus({preventScroll:true});if(matchMedia('(max-width:700px)').matches)dialog.querySelector('.dr-scene-detail')?.scrollIntoView({block:'start',behavior:'instant'});announce(`${dialog.querySelector('.dr-scene-title')?.textContent||'Scene'} · source detail opened.`);return;}
  const product=event.target.closest('[data-dr-product]');if(product){selected=product.dataset.drProduct;mobileView='detail';render({resetScroll:true});writeResourceRoute(false);const title=dialog.querySelector('.dr-product-title');title?.focus({preventScroll:true});dialog.querySelector('.dr-detail')?.scrollIntoView({block:'start',behavior:'instant'});announce(`${title?.textContent||'Product'} details opened. Return to products is available before the heading on small screens.`);return;}
  const action=event.target.closest('[data-dr-action]')?.dataset.drAction;
  if(action==='copy-scene-locator'){const hit=media().scenes.find(x=>x.id===sceneId),video=media().videos.find(x=>x.id===hit?.videoKey);if(!hit)return;const locator=`${hit.fileName||video?.fileName||hit.videoId} · ${sceneLocator(hit)} · frames ${hit.startFrame??'unknown'}–${hit.endFrame??'unknown'}${hit.manifestSha256?' · manifest SHA-256 '+hit.manifestSha256:''}`;if(!navigator.clipboard?.writeText){announce('Clipboard unavailable. The locator is shown above.');return;}navigator.clipboard.writeText(locator).then(()=>announce('Source locator copied.')).catch(()=>announce('Clipboard unavailable. The locator is shown above.'));return;}
  if(action==='retry-media'){media().status=null;fetchMedia();return;}
  if(action==='more-media'){fetchMedia({more:true});return;}
  if(action==='back-products'){mobileView='list';render({resetScroll:true});const target=[...dialog.querySelectorAll('[data-dr-product]')].find(x=>x.dataset.drProduct===selected&&!x.hidden)||dialog.querySelector('[data-dr-search]');target?.focus();target?.scrollIntoView({block:'nearest'});announce('Product list. '+(target?.textContent||'Search products'));return;}
  if(action==='copy-link'){const button=event.target.closest('button');navigator.clipboard?.writeText(location.href).then(()=>{if(button?.isConnected)button.textContent='Link copied';announce('View link copied.');}).catch(()=>announce('Copy the address from your browser.'));return;}
  if(action==='open-sources'||action==='open-releases'){sources(action==='open-sources'?'sources':'releases');return;}
  if(action==='browse-components'){route(chapter(5,'work'));const studio=window.aiwLogicalStudio;if(typeof studio?.browseLibrary==='function')studio.browseLibrary();else document.querySelector('[data-a-action="from-library"]')?.click();return;}
  const a=event.target.closest('a.dr-link[href]');if(a&&a.origin===location.origin&&new URL(a.href).pathname===location.pathname){
   event.preventDefault();event.stopPropagation();const token=new URL(a.href).searchParams.get('library');if(token){route(chapter(5,'work'));import('./component-library-ui.js').then(m=>m.openLibraryToken(token,{propose:prop=>window.aiwLogicalStudio?.proposeFromLibrary?.(prop)})).catch(e=>reportFailure('The selected component could not open in Chapter 5.',e));return;}
   route(a.href);
  }
 });
 dialog.addEventListener('input',event=>{if(event.target.matches('[data-dr-scene-search]')){sceneQuery=bounded(event.target.value);sceneId='';media().deepLinkId='';media().unavailableScene=false;writeResourceRoute(false);remember();scheduleMedia();return;}if(!event.target.matches('[data-dr-search]'))return;query=bounded(event.target.value);updateProductResults();});
 dialog.addEventListener('change',event=>{if(event.target.matches('[data-dr-scene-video]')){sceneVideo=bounded(event.target.value,180);sceneId='';media().deepLinkId='';media().unavailableScene=false;writeResourceRoute(false);fetchMedia();return;}if(event.target.matches('[data-dr-scene-area]')){sceneArea=bounded(event.target.value,25);sceneId='';media().deepLinkId='';media().unavailableScene=false;writeResourceRoute(false);fetchMedia();return;}const kind=event.target.dataset.drFilter;if(!kind)return;const value=bounded(event.target.value,90);if(kind==='capability')capability=value;if(kind==='driver')driver=value;if(kind==='status')status=value;updateProductResults();});
 dialog.addEventListener('close',()=>{if(dialog?.open===false)dialog=null;});
}
function openResources(initial,{fromRoute=false}={}){
 if(!currentProject())return;
 const state=fromRoute?routeParams():savedByProject.get(currentProject().id)||{};
 if(!fromRoute){state.section=VALID_SECTIONS.has(initial)?initial:'technology';}
 const changed=!dialog?.isConnected||section!==state.section||selected!==state.selected||query!==state.query||capability!==state.capability||driver!==state.driver||status!==state.status||knowledgeLens!==state.knowledgeLens||sceneId!==state.sceneId||sceneVideo!==state.sceneVideo||sceneQuery!==state.sceneQuery||sceneArea!==state.sceneArea;
 section=state.section||'technology';selected=state.selected||'';query=state.query||'';capability=state.capability||'';driver=state.driver||'';status=state.status||'';
 knowledgeLens=state.knowledgeLens||'sources';sceneId=state.sceneId||'';sceneVideo=state.sceneVideo||'';sceneQuery=state.sceneQuery||'';sceneArea=state.sceneArea||'';
 if(fromRoute&&sceneId)media().deepLinkId=sceneId;
 if(!dialog?.isConnected){
  mobileView=fromRoute&&selected&&matchMedia('(max-width:700px)').matches?'detail':state.mobileView||'list';
  dialog=openDialog({className:'dr-dialog',labelledBy:'dr-title',html:'<div class="dr-shell"></div>',initialFocus:'[data-dr-tab]',onCancel:()=>close()});bind();render();
 }else if(changed){mobileView=fromRoute&&selected&&matchMedia('(max-width:700px)').matches?'detail':state.mobileView||'list';render({resetScroll:true});}
 if(!fromRoute){writeResourceRoute(true);dialog.querySelector(`[data-dr-tab="${section}"]`)?.focus({preventScroll:true});}
 if(section==='knowledge'&&changed){loadCorpusStatus(render);if(knowledgeLens==='scenes'&&media().phase==='idle')fetchMedia();}
}
// The chapter shell calls this after its first draw and after Back/Forward. Opening an address never
// creates a second history entry; losing the `resources` parameter closes only this reading.
export function syncDesignResourcesFromRoute(){
 const state=routeParams();if(!state.section){if(dialog?.isConnected)close({route:false});return;}
 openResources(state.section,{fromRoute:true});
}
export function openDesignResources(initial='technology'){openResources(initial);}
if(typeof window!=='undefined')window.aiwResourcesRoute=syncDesignResourcesFromRoute;
onProjectSwitch(()=>{close({route:false});++mediaSequence;clearTimeout(mediaTimer);mediaByProject.clear();section='technology';selected='';query='';capability='';driver='';status='';mobileView='list';knowledgeLens='sources';sceneId='';sceneVideo='';sceneQuery='';sceneArea='';});
if(typeof document!=='undefined')document.addEventListener('aiw:external-project',()=>{++mediaSequence;clearTimeout(mediaTimer);mediaByProject.clear();if(dialog?.isConnected){render();if(section==='knowledge'&&knowledgeLens==='scenes')fetchMedia();}});
