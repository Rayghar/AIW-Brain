import {refreshActionUndo} from './action-undo-ui.js';
// The workspace shell of all eleven chapters (round 3, A: one document for the whole journey). It renders the frame
// (top bar, chapter navigation, heading and progress, tabs, footer) and, on Work, Validate and Output, the active
// chapter studio's surface with its object details.
// On the Model tab it renders the host that workspace-ux.js fills with the chapter's current view (one of its own
// models or a perspective of the whole model, round 5), and below it the chapter's trace or failure lab, where
// milestones are recorded.
// Retired (audit F-02, F-22): the SVG canvas with its layout, pan and zoom, search and legend, which every Model
// render drew and CSS then hid, and the studio-less prototype with its hard-coded findings and export.
import {isBlankProject,journeyStages} from './model-scope.js';
import {recordBelongsTo,chapterRecordSet,chapterOfRecord,resolveRecordRef} from './chapter-records.js';
import {findRecord} from './provenance.js';
import {recordCardHTML} from './record-card.js';
import {workGlanceHTML} from './work-glance.js';
import {chapterHasRecords} from './work-frame.js';
import {architectureModel} from './architecture-model.js';
import {modelDossierHTML} from './model-dossier.js';
import {savedRecordSubject} from './shell-record-subject.js';
import {reportLoadFailure} from './load-failures.js';
import {projectURL,projectPreferenceKey,activeProjectId,setShellScopeId} from './project-context.js';
import {moduleTree} from './module-model.js';
import {scopeLens} from './module-lens.js';
import {rememberRailFocus,refineWorkspace,openWorkspaceDetails,cursorPreference,saveCursorPreference,patchLiveSurface,registerShell,routeModel,modelViewInAddress,showBuilding} from './workspace-ux.js';
import {layers,suggestions,stages} from './model.js';
import {esc} from './html-escape.js';
import {pad2} from './util.js';
import {themeControl} from './theme.js';
import {milestoneRecheck,readinessWords,readinessHead,hasIllustrativeRecords,revealRecord,tablist,navigationDrawer,markConnection,isOffline,glossaryHTML,guidanceFooter,chipAddsFact,whereText,COACH_STEPS,coachDue,coachSeen,coachForget,coachHTML,helpMapHTML} from './shell-ux.js';
import {inheritedFindings,DISPOSITIONS,SOURCE_SILENT} from './review-domain.js';
import {solDisclosure} from './provenance.js';
import {TAB_PURPOSE} from './shell-ux.js';
import {chapterChecks} from './readiness-model.js';
import {CHAPTER_LAYERS} from './chapter-names.js';
import {CHAPTER_TITLES,chapterLabel} from './chapter-names.js';
// The shared shell helpers are absent when this file runs in the state suite's sandbox (validate.mjs strips
// the imports), so each call below checks the helper exists first.

// entry.js opens this shell only once the project and the chapter studios are ready: the Chapter 4–11 studios behind
// one object (window.aiwLogicalStudio) and the Chapter 1–3 studio factories (window.aiwFoundationStudios). A Chapter
// 1–3 studio is created the first time its chapter opens. `studio` always answers with the current chapter's studio:
// a chapter change disposes the old one's listeners and binds the new one (enterChapter), and window.aiwLogicalStudio
// is this same object, so the chapter views, Sol's panel and Validate reach the studio of the chapter on screen.
// Another project opened in place (round 4, A) brings its own set of studios (openProject below).
let chapterStudios=window.aiwLogicalStudio,foundationFactories=window.aiwFoundationStudios||{};const foundationStudios=new Map();
if(!chapterStudios)throw Error('The chapter studios must be ready before the workspace opens.');
// Every method the shell calls, with a safe default for what a studio leaves out: a Chapter 1–3 studio has no trace,
// failure lab or model candidates, and the state suite's studio serves only its graph. A studio needs work(),
// validation(), output(), inspector(node), milestones(), graph(), next(), assistance(), assistant(kind), bind(bridge),
// dispose(), busy and tip(node).
const STUDIO_DEFAULTS={work:()=>'',validation:()=>'',output:()=>'',inspector:()=>'',milestones:()=>[],graph:()=>({nodes:[],edges:[]}),next(){},assistance:()=>'',assistant(){},bind(){},dispose(){},tip:()=>'',enter(){},pause(){},flowNode:()=>null,flowText:text=>text,failureSurface:()=>'',scenarioAction:()=>'',preview(){},accept(){},busy:false};
function studioDefaults(target){return new Proxy(target,{get(t,key){const v=t[key];return v===undefined&&Object.hasOwn(STUDIO_DEFAULTS,key)?STUDIO_DEFAULTS[key]:v}})}
let mainStudio=studioDefaults(chapterStudios);
function studioOf(chapter){
  const make=foundationFactories[chapter];if(!FOUNDATION.includes(chapter)||typeof make!=='function')return mainStudio;
  if(!foundationStudios.has(chapter))foundationStudios.set(chapter,studioDefaults(make()));
  return foundationStudios.get(chapter);
}
let current=mainStudio;
const studio=new Proxy({},{get:(_,key)=>current[key]});
window.aiwLogicalStudio=studio;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
// Attribute selectors built from record ids; CSS.escape is absent in the DOM suites' sandbox.
const cssId=v=>typeof CSS!=='undefined'&&CSS.escape?CSS.escape(String(v)):String(v).replace(/["\\]/g,'\\$&');
const paths={
  arrow:'M4 12h16m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',
  boxes:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',route:'M4 5h6v5H4zM14 14h6v5h-6zM7 10v7h7M10 7h7v7',
  database:'M4 6c0-4 16-4 16 0s-16 4-16 0v12c0 4 16 4 16 0V6M4 12c0 4 16 4 16 0',server:'M3 3h18v7H3zM3 14h18v7H3zM7 6h1m-1 11h1',
  cpu:'M6 6h12v12H6zM9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',arrows:'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
  shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',cloud:'M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11H6',
  lock:'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  cursor:'m5 3 14 10-7 1-3 7z',play:'m8 4 12 8-12 8z',pause:'M8 4v16M16 4v16',rewind:'M4 5v5h5M4 10a8 8 0 1 1 1 7',
  plus:'M12 5v14M5 12h14',minus:'M5 12h14',fit:'M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5',book:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15',
  work:'M4 7h16v14H4zM8 7V3h8v4M4 12h16m-10 0v3h4v-3',file:'M5 3h9l5 5v13H5zM14 3v6h5M8 13h8m-8 4h6',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',layers:'m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5',
  globe:'M3 12h18M12 3c-6 5-6 13 0 18 6-5 6-13 0-18M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m7 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  clock:'M12 7v5l3 2M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0',leaf:'M4 20C20 22 22 7 20 3 4 2 2 13 4 20m0 0L16 8'
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.boxes}"/></svg>`;

const CHAPTERS=[1,2,3,4,5,6,7,8,9,10,11],TABS=['work','model','validate','output'];
// The chapters whose studios are created from a factory on first use (requirements.js, quality.js, decisions.js).
const FOUNDATION=[1,2,3];
// Each chapter's name, its heading and subtitle (the screen's one guidance voice, round 5 Contract G), and what it
// continues to. The arrival toast names the chapter and nothing more ("Chapter 8 · Interfaces & data").
const CHAPTER={
  1:{sub:'Frame the problem and the requirements',heading:'Start with the right questions.',subtitle:'Turn a project brief into requirements you can explain and test.',details:'Contextual artefact inspector',next:'Continue to architectural drivers'},
  2:{sub:'Record what drives the design',heading:'Make what drives the design explicit.',subtitle:'Record the drivers by kind, each with its impact and priority; turn quality drivers into measurable scenarios.',details:'Driver inspector',next:'Continue to decisions'},
  3:{sub:'Compare and record choices',heading:'Make the reasoning visible.',subtitle:'Compare alternatives against the requirements and quality drivers, and record the choice.',details:'Decision context inspector',next:'Continue to logical application'},
  4:{sub:'Define the responsibilities',heading:'Shape the logical application.',subtitle:'Define responsibilities, connect the model, and retain the reasoning.',details:'Contextual object inspector',next:'Continue to application realization'},
  5:{sub:'Make the design executable',heading:'Bring the model to life.',subtitle:'Trace logical responsibilities into implementations, controls, and runtime.',details:'Contextual object inspector',next:'Continue to logical technology'},
  6:{sub:'Define supporting capabilities',heading:'Define the technology foundations.',subtitle:'Connect application needs to capabilities, trust, and recovery.',details:'Contextual technology bottom panel',next:'Continue to technology realization'},
  7:{sub:'Compare implementation choices',heading:'Realize the technology choices.',subtitle:'Compare options, record evidence, and define the operating boundaries.',details:'Contextual technology bottom panel',next:'Continue to Interfaces & data'},
  8:{sub:'Define exchanges and ownership',heading:'Define the promises between systems.',subtitle:'Connect contracts, data definitions, and the owners behind each exchange.',details:'Contextual interfaces and data bottom panel',next:'Continue to Security'},
  9:{sub:'Design controls and review risk',heading:'Design protection you can explain.',subtitle:'Trace threats, intended controls, and the evidence behind each decision.',details:'Contextual security bottom panel',next:'Continue to Deployment / runtime'},
  10:{sub:'Place and operate the architecture',heading:'Design how the architecture will run.',subtitle:'Connect placements, recovery, security enforcement, and operating evidence.',details:'Contextual runtime bottom panel',next:'Continue to Review & realize'},
  11:{sub:'Review, baseline and verify',heading:'Review the design. Realize its intent.',subtitle:'Trace the evidence, capture the SDD, and carry clear obligations into delivery.',details:'Contextual architecture review bottom panel',next:'Track implementation and verification'}
};
// Round 12 (G, GR-UX-16): the name and the arrival line from the one chapter-name table (chapter-names.js).
for(const n of CHAPTERS)Object.assign(CHAPTER[n],{title:CHAPTER_TITLES[n],arrival:chapterLabel(n)});

// View preferences for this browser. Studios read and write several of these fields through the bridge below.
const defaults={chapter:4,tab:'model',visible:['process','logical'],selected:'api',cursor:true,animate:true,accepted:[],completed:[],note:'',scenario:'success',focus:false,grouped:false,runtimeEnvironment:'env-001',reviewRequirement:'REQ-001',scope:''};
const query=new URLSearchParams(location.search);
// An address without a chapter opens Chapter 1, as it always has. Deep links written before the shells were one name
// the record as artefact (Chapter 1), driver (Chapter 2) or decision (Chapter 3); each is read as `object`.
const objectParam=q=>q.get('object')||q.get('artefact')||q.get('driver')||q.get('decision');
// Reference resolution (rc41, W3): the object an address or a link names may be a record's reference (APP-001, LR-001,
// QD-003, IF-001 …) as well as its id; every route resolves it to the id here (chapter-records.js resolveRecordRef: the
// chapter in the address first when two chapters share a reference), so the shell holds the record exactly as the id
// does and the address is rewritten with the id. A name that resolves to nothing is kept as given (an object the
// perspective graph draws, or one that left the design, is treated as before). It reads the store's document, so it
// is only ever asked about the project that document is: a route into another project resolves after adopt().
const resolveObjectId=(id,chapter=null)=>(id&&resolveRecordRef(window.aiwProjectStore?.value?.document,id,{chapter}))||id||null;
const requestedObject=resolveObjectId(objectParam(query),Number(query.get('chapter')||1));
// The shell's view state for the project on screen: this browser's preferences for that project, then the place the
// address names, with the studio of that chapter made current. Read when the shell opens and again when another
// project opens in place (round 4, A), so no project starts from another's preferences.
// Detail selection includes canonical records such as groups that have no standalone diagram node.
// This is display metadata only; it adds no object or relationship to the model.
function canonicalSelection(id){if(!id||typeof chapterOfRecord!=='function'||typeof findRecord!=='function')return null;const p=window.aiwProjectStore?.value?.document;id=resolveObjectId(id);const chapter=p&&chapterOfRecord(p,id),found=chapter&&findRecord(p,chapter,id);if(!found)return null;const r=found.record;return {id,ref:r.ref||id,title:r.title||r.question||r.name||id,description:r.purpose||r.description||r.context||'',layer:CHAPTER_LAYERS[chapter]?.[0]||'logical',sub:CHAPTER_TITLES[chapter]+' record',attrs:{Reference:r.ref||id,Status:r.status||r.state||(r.confirmed?'Confirmed':'Draft')},canonical:true};}
function openView(place){
  let saved={};try{saved=JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-v5-explorer-v1'))||'{}')}catch{/* no saved preferences */}
  if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
  if(CHAPTERS.includes(place.chapter)){if(saved.chapter!==place.chapter){saved.visible=[...CHAPTER_LAYERS[place.chapter]];saved.tab='model'}saved.chapter=place.chapter;}
  if(TABS.includes(place.tab))saved.tab=place.tab;
  current=studioOf(CHAPTERS.includes(saved.chapter)?saved.chapter:4);
  const requested=studio.graph().nodes.find(n=>n.id===place.object)||savedSubject(place.object,Number(saved.chapter)||4)||canonicalSelection(place.object);
  if(requested){saved.selected=requested.id;saved.tab=TABS.includes(place.tab)?place.tab:'model';saved.visible=[...new Set([...(saved.visible||[]),requested.layer])];}
  else saved.selected='project';
  saved.note=typeof saved.note==='string'?saved.note.slice(0,5000):'';
  saved.cursor=cursorPreference(typeof saved.cursor==='boolean'?saved.cursor:true);
  saved.animate=typeof saved.animate==='boolean'?saved.animate:true;
  saved.focus=saved.focus===true;
  saved.reviewRequirement=typeof saved.reviewRequirement==='string'?saved.reviewRequirement:'REQ-001';
  saved.runtimeEnvironment=typeof saved.runtimeEnvironment==='string'?saved.runtimeEnvironment:'env-001';
  saved.scenario=['success','hold','timeout'].includes(saved.scenario)?saved.scenario:'success';
  // The module scope (round 24, D-24-08): the address's first, then this browser's for the project; an id that names no
  // module or sub-module of the project on screen is dropped without a word.
  saved.scope=knownScope(typeof place.scope==='string'?place.scope:saved.scope);
  const view={...defaults,...saved,
    chapter:CHAPTERS.includes(saved.chapter)?saved.chapter:4,
    tab:TABS.includes(saved.tab)?saved.tab:'model',
    visible:(Array.isArray(saved.visible)?saved.visible:defaults.visible).filter(x=>layers.some(l=>l.id===x)),
    accepted:(Array.isArray(saved.accepted)?saved.accepted:[]).filter(x=>Object.hasOwn(suggestions,x)),
    completed:Array.isArray(saved.completed)?saved.completed:[],
    ghost:null,step:-1,playing:false,flowFinished:false,zoom:1,pan:{x:0,y:0},modal:null,layerOpen:false};
  const selection=studio.graph().nodes.find(n=>n.id===view.selected);if(selection&&!view.visible.includes(selection.layer))view.visible.push(selection.layer);
  return view;
}
// A scope id the project's module structure holds, else ''.
function knownScope(id){if(!id||typeof id!=='string')return '';try{const p=window.aiwProjectStore?.value?.document;return p&&typeof moduleTree==='function'&&moduleTree(p).byId.has(id)?id:''}catch{return ''}}
const s=openView({chapter:Number(query.get('chapter')||1),tab:query.get('tab'),object:requestedObject,scope:query.has('scope')?query.get('scope'):undefined});
// The chapter model's view an address names (model=, for example Validate's "See the whole design"): kept in the address
// while that view is the picture on the Model tab, so a reload lands on it; dropped when the person moves to another
// chapter or the picture reports another view (aiwSetModelLayers). A saved perspective (modelView=) is kept while it is
// the chapter's current view (workspace-ux.js modelViewInAddress). Round 4, A; round 5, R5-C.
let addressModel=s.tab==='model'?query.get('model')||null:null;
let flowTimer,toastTimer,tipTimer,lastFocus,renderedRevision=null,pendingNavigationFocus=null;
const visitedSteps=new Set();

// Candidates accepted in the browser before projects were saved on the server stay visible until the
// architect saves or undoes them (logical-ui.js offers both).
const legacyCandidates=()=>s.accepted.filter(id=>!studio.graph().nodes.some(n=>n.candidateKey===id));
const allNodes=()=>[...studio.graph().nodes,...legacyCandidates().map(id=>({...suggestions[id],accepted:true,legacy:true}))];
// Saved chapter records can be selected even when a particular diagram does not draw them.
// They are inspector subjects, never fabricated diagram nodes.
function savedSubject(id,chapter){return typeof savedRecordSubject==='function'?savedRecordSubject(window.aiwProjectStore?.value?.document,chapter,id):null}
const selectable=id=>allNodes().find(n=>n.id===id)||savedSubject(id,s.chapter)||canonicalSelection(id);
// No selection, or the project itself, reads as the chapter's guidance (round 26, D-26-03): a chapter arrives with its
// guidance in the details column, and a record fills it only when chosen or named in the address.
const GUIDANCE_NODE=()=>{
  let count=0;try{if(typeof chapterRecordSet==='function')count=chapterRecordSet(window.aiwProjectStore?.value?.document,s.chapter).total}catch{/* The chapter tools remain available while data loads. */}
  return {id:'project',guidance:true,title:count?'Select a record to inspect':'Start this chapter',description:count?`This chapter has ${count} saved record${count===1?'':'s'}. Select one in Work or Model to see its details, relationships and next useful action.`:'Create the first record using this chapter’s Work controls. Its details and connections will appear here when selected.',layer:'',sub:'This chapter',attrs:{},col:0};
};
const getNode=id=>(!id||id==='project'?GUIDANCE_NODE():null)||selectable(id)||(!allNodes().length?GUIDANCE_NODE():null)||{id:String(id||''),title:'Object unavailable in this perspective',description:'Select another object or reveal its layer. The saved project may have changed.',layer:'logical',sub:'Unresolved reference',attrs:{Reference:String(id||'None')},col:0};
const layerOf=n=>layers.find(l=>l.id===n.layer);

function persist(){try{localStorage.setItem(projectPreferenceKey('aiw-v5-explorer-v1'),JSON.stringify(Object.fromEntries(Object.keys(defaults).map(k=>[k,s[k]]))));}catch{/* a preference: the page works without it */}}
function mark(id){if(!s.completed.includes(id)){s.completed.push(id);persist();updateProgress()}}
function unmark(id){s.completed=s.completed.filter(x=>x!==id);persist()}
// The toast is plain text, so object titles go in as they are.
function toast(message){const el=$('#toast');if(!el)return;
  if(/^Saved to your private project\.?$/.test(message)){if(!savedRecord)return;message=`${savedRecord.ref||savedRecord.title} saved`;savedRecord=null}
  el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),5000)}
// After a save the record that appeared is remembered, so the toast names it and the next render brings it into
// view (U2-14, U2-15). Only the store says a save happened; nothing here writes.
let knownIds=new Set(studio.graph().nodes.map(n=>n.id)),savedRecord=null;
document.addEventListener('aiw:save',ev=>{
  const status=ev.detail?.status;if(status==='saving')return;
  if(status==='error'){probeConnection();return}
  const nodes=studio.graph().nodes,fresh=nodes.filter(n=>!knownIds.has(n.id)&&!n.ghost);knownIds=new Set(nodes.map(n=>n.id));
  if(fresh.length){savedRecord=fresh[fresh.length-1];revealPending=savedRecord.id;}else{savedRecord=null;revealPending=nodes.some(n=>n.id===s.selected)?s.selected:null;}
});
// A failed save is checked against the server: when it cannot be reached the header says Offline, the page
// watches for its return and says so (U2-34).
function probeConnection(){if(typeof markConnection!=='function'||typeof fetch!=='function')return;fetch(projectURL('/api/intelligence/status'),{credentials:'same-origin',cache:'no-store'}).catch(()=>{markConnection('offline',{announce:toast});offerRetry()})}
// An editor whose save could not reach the server offers to send it again; its own submit path does the rest.
function offerRetry(){const form=document.querySelector('dialog[open] form');if(!form||form.parentElement.querySelector('.ux-retry'))return;const slot=[...form.parentElement.querySelectorAll('[role="alert"]')].find(el=>!el.hidden&&el.textContent.trim())||form.querySelector('[role="alert"]');const retry=document.createElement('button');retry.type='button';retry.className='btn ux-retry';retry.textContent='Try again';retry.addEventListener('click',()=>{retry.remove();form.requestSubmit()});(slot||form).after(retry)}
if(typeof window!=='undefined'&&window.addEventListener){window.addEventListener('offline',()=>typeof markConnection==='function'&&markConnection('offline',{announce:toast}));}

// Progress comes from the active chapter's milestones, which analyse the whole project. They are computed once
// for each render or progress update and handed to the helpers below (audit F-03).
const doc=()=>window.aiwProjectStore?.value?.document;
const progressOf=m=>m.length?Math.round(m.filter(x=>x.done).length/m.length*100):0;
// Milestones met on an earlier saved state and no longer met are "to re-check" rather than silently lost
// (U2-06); the illustrative note appears only when illustrative records exist (U2-05). The percentage is
// the saved project's: milestones met over milestones in the chapter.
const recheckOf=m=>typeof milestoneRecheck==='function'?milestoneRecheck(s.chapter,m).recheck:[];
const countOf=(m,recheck=recheckOf(m))=>typeof readinessWords==='function'?readinessWords(m,{recheck,illustrative:hasIllustrativeRecords(doc())}):m.filter(x=>x.done).length+' of '+m.length+' milestones met';
const recheckPct=(m,recheck)=>m.length?Math.round(recheck.length/m.length*100):0;
// The headline is the count of milestones met, as in Chapters 1–3 (U2-29); the bar adds what is to re-check.
const headOf=m=>typeof readinessHead==='function'?readinessHead(m):m.filter(x=>x.done).length+' of '+m.length;
function nextOf(m){const x=m.find(x=>!x.done);return {id:x?.id||(s.chapter===11?'delivery':'chapter'+(s.chapter+1)),text:x?.name||CHAPTER[s.chapter].next}}
// The footer's next task (rc41, W2): the readiness model's next (chapterChecks().next — a finding to fix or confirm
// with the record it concerns, a milestone, a draft, or the chapter's output), said once per tab in the footer's
// words and place. Validate refines it through its own reading (validation-workspace.js publishes aiw:next-task:
// Record current checks when nothing is open and the checks are stale, the chapter's output when a module is clear).
// The chapter's milestones remain the fallback while the checks cannot be read. Nothing here approves anything.
let validateNext=null;
document.addEventListener('aiw:next-task',e=>{const d=e.detail;if(!d||d.tab!=='validate')return;validateNext=d.next&&d.next.text?{...d.next,chapter:Number(d.chapter)}:null;if(s.tab==='validate')refreshFooterNext();});
function readinessNext(){try{const p=doc();if(!p)return null;const n=chapterChecks(p,s.chapter)?.next;return n&&n.text?{kind:n.kind||'',text:n.text,url:n.url||''}:null;}catch{return null;}}
function footerNext(){const v=s.tab==='validate'&&validateNext&&validateNext.chapter===s.chapter?validateNext:null;return v||readinessNext()||{kind:'milestone',text:nextOf(studio.milestones()).text,url:''};}
function footerNextHTML(next){const label=' aria-label="Open next task: '+esc(next.text)+'"',inner='<span>Next task</span><strong id="next-text">'+esc(next.text)+'</strong>'+icon('arrow');return next.url?'<a class="workspace-next" data-action="next" data-next-kind="'+esc(next.kind)+'" href="'+esc(next.url)+'"'+label+'>'+inner+'</a>':'<button type="button" class="workspace-next" data-action="next" data-next-kind="'+esc(next.kind)+'"'+label+'>'+inner+'</button>';}
function refreshFooterNext(){const el=$('.workspace-next');if(!el)return;const t=document.createElement('template');t.innerHTML=footerNextHTML(footerNext());const next=t.content.firstElementChild;if(el.outerHTML!==next.outerHTML)el.replaceWith(next);}
function updateProgress(){
  const m=studio.milestones(),pct=progressOf(m),recheck=recheckOf(m),next=nextOf(m),set=(sel,fn)=>{const el=$(sel);if(el)fn(el)};
  set('#journey-progress',el=>el.textContent=headOf(m)+' milestones');set('.progress-disclosure>summary b',el=>el.textContent=headOf(m));set('#journey-next',el=>el.textContent='Next: '+next.text);
  set('#progress-percent',el=>el.textContent=headOf(m));set('#progress-fill',el=>el.style.width=pct+'%');set('#progress-recheck',el=>{el.style.left=pct+'%';el.style.width=recheckPct(m,recheck)+'%'});
  set('#progress-count',el=>el.textContent=countOf(m,recheck));refreshFooterNext();
  const fn=footerNext();set('[data-action="next-context"]',el=>{el.title=fn.text;el.setAttribute('aria-label','Open next task: '+fn.text)});
  set('.progress-track',el=>{el.setAttribute('aria-valuenow',m.filter(x=>x.done).length);el.setAttribute('aria-valuemax',m.length);el.setAttribute('aria-valuetext',countOf(m,recheck))});
}

// Chapter and tab changes are history entries, so Back returns to the previous chapter or tab; a new selection
// only rewrites the current entry (audit F-13).
let destinationResources=null,destinationResourceQuery=null,destinationHash=null,destinationValidate=null;
const validationByChapter=new Map();
window.addEventListener('aiw:validation-lens',e=>{const {chapter,lens}=e.detail||{};if(CHAPTERS.includes(Number(chapter))&&['readiness','integrity','case'].includes(lens))validationByChapter.set(Number(chapter),lens)});
function routeURL(){const q=new URLSearchParams();q.set('chapter',s.chapter);q.set('tab',s.tab);if(s.selected)q.set('object',s.selected);
  // Read the current Work section from the studio, including before a first render or after a route change.
  if(s.tab==='work'){const section=studio.workSection;if(section)q.set('section',section)}
  // The module scope is part of the place on every chapter and tab (round 24, D-24-08).
  if(s.scope)q.set('scope',s.scope);
  if(s.tab==='model'){if(addressModel)q.set('model',addressModel);const view=typeof modelViewInAddress==='function'?modelViewInAddress(s.chapter):null;if(view)q.set('modelView',view)}
  if(s.chapter===7&&s.tab==='work'){
    if(studio.selectedProductId)q.set('product',studio.selectedProductId);
    if(studio.routeStage&&studio.routeStage!=='plans')q.set('stage',studio.routeStage);
  }
  if(s.chapter===11&&['work','validate'].includes(s.tab)&&studio.selectedCaseId)q.set('case',studio.selectedCaseId);
  // Validate's reading is part of the place: links, Back and reload return to the same lens.
  const hereRoute=new URLSearchParams(location.search),sameChapter=Number(hereRoute.get('chapter'))===s.chapter;
  const validation=destinationValidate!==null?destinationValidate:validationByChapter.get(s.chapter)||(sameChapter?hereRoute.get('validate'):null);
  if(['readiness','integrity','case'].includes(validation))q.set('validate',validation);
  // The resource reading is an addressable part of this project. Preserve only its known view fields
  // when the chapter redraws; its own module owns edits to those fields and the dialog's lifecycle.
  const here=destinationResourceQuery||new URLSearchParams(location.search);
  if(destinationResources!==false&&['technology','components','knowledge'].includes(here.get('resources')))
    for(const key of ['resources','resourceProduct','resourceQuery','resourceCapability','resourceDriver','resourceStatus','resourceLens','resourceScene','resourceVideo','resourceSceneQuery','resourceArea'])
      if(here.has(key))q.set(key,here.get(key));
  const hash=destinationHash!==null?destinationHash:s.chapter===11&&q.has('case')?location.hash:'';
  return projectURL(location.pathname+'?'+q+hash)}
function writeRoute(push=false){
  const here=new URLSearchParams(location.search),moved=Number(here.get('chapter'))!==s.chapter||here.get('tab')!==s.tab||(here.get('project')||'bank-payment')!==activeProjectId||(here.get('scope')||'')!==(s.scope||'');
  const lensChanged=s.tab==='validate'&&destinationValidate!==null&&(here.get('validate')||'')!==destinationValidate;
  // Changing a Work section is navigation too. Initial/legacy URLs acquire their
  // section without creating an extra history entry; Back restores the named section.
  const sectionChanged=!moved&&s.tab==='work'&&here.has('section')&&studio.workSection&&here.get('section')!==studio.workSection;
  if(sectionChanged||push&&(moved||destinationResources!==null&&here.has('resources')!==destinationResources||lensChanged))history.pushState({aiw:'workspace'},'',routeURL());else history.replaceState(history.state,'',routeURL());
}
let modelReturn = null;
function setTab(tab){studio.pause?.();hideTip();if(tab!=='model')modelReturn=null;s.tab=tab;s.playing=false;clearTimeout(flowTimer);persist();pendingNavigationFocus='tab';render(true)}
// Moving between chapters keeps the tab the person is working in when they choose the chapter themselves
// (audit UX-20); a studio that hands over to the next chapter opens its Model tab as before.
function enterChapter(chapter,tab){
  const priorSelection=s.selected;studio.pause?.();hideTip();
  if(chapter!==s.chapter)addressModel=null;
  s.chapter=chapter;s.layerOpen=false;s.focus=false;s.tab=tab;s.playing=false;clearTimeout(flowTimer);s.step=-1;s.flowFinished=false;visitedSteps.clear();s.zoom=1;s.pan={x:0,y:0};
  s.visible=[...CHAPTER_LAYERS[chapter]];if(chapter===5)mark('physical');
  // The chapter's studio takes over (round 3, A): a Chapter 1–3 studio being left lets go of its listeners and its
  // dialog, the next one is bound. The Chapter 4–11 studios live as long as the page (their listeners answer only their
  // own markup), so they are bound again, never disposed. Records the new chapter already holds are not "just saved".
  const next=studioOf(chapter);
  if(next!==current){if(current!==mainStudio)current.dispose();current=next;current.bind(bridge);knownIds=new Set(studio.graph().nodes.map(n=>n.id));savedRecord=null;}
  studio.enter?.(priorSelection);
  // Round 26 (D-26-03, J-43): a selection follows into the next chapter only when the record belongs to it (a Chapter 4
  // responsibility is not a Chapter 5 record); otherwise the chapter arrives with its guidance and no record chosen. An
  // address that names an object selects it afterwards (applyRoute).
  const drawn=studio.graph().nodes.find(n=>n.id===priorSelection&&!n.ghost),carried=drawn&&recordBelongsTo(doc(),chapter,priorSelection)?drawn:null;
  s.selected=carried?.id||null;
  if(carried&&!s.visible.includes(carried.layer))s.visible.push(carried.layer);
  // The subject stays held while the new chapter draws it; one the chapter does not draw is released, and the strip says so.
  if(subject&&!(carried&&carried.id===subject))releaseSubject({title:subjectTitle,why:'is not drawn in this chapter'},{quiet:true});
  persist();
}
// A chapter chosen opens in two frames (round 12, G, GR-UX-07): the shell is marked first, with its address (showBuilding,
// workspace-ux.js: the rail, the heading and "Building Chapter N…"), then the chapter is drawn and its counts computed. A
// later choice supersedes one still waiting; a tab hidden from view draws when it is seen again, or after 100 ms.
let chapterFrame=0;
function setChapter(chapter,{keepTab=false,tab=null}={}){
  modelReturn=null;
  enterChapter(chapter,TABS.includes(tab)?tab:keepTab?s.tab:'model');writeRoute(true);
  pendingNavigationFocus='heading';
  const frame=++chapterFrame,stop=showBuilding(chapter,{heading:CHAPTER[chapter].title,subtitle:TAB_PURPOSE[s.tab]||CHAPTER[chapter].subtitle,title:CHAPTER_TITLES[chapter]});
  let done=false;const draw=()=>{if(done)return;done=true;if(frame!==chapterFrame)return;stop();render(false);toast(CHAPTER[chapter].arrival)};
  (typeof requestAnimationFrame==='function'?requestAnimationFrame:setTimeout)(()=>setTimeout(draw,0));setTimeout(draw,100);
}
// Where an address points in the shell: its chapter, tab and object (with the Chapter 1–3 aliases), and its project
// when that is another one (round 4, A: opened in place; an address of another project without a chapter opens its
// Chapter 1, as a document load would). Null for another origin or path, a perspective view (the Projects page among
// them), or (for a link into this project) an address that names no place.
// The Model tab's own parameters travel with the route (round 4, A): the chapter model's view (model=) and a saved
// perspective (modelView=), handed over as a document load would; an old address's explore= opens the Diagram.
function inAppRoute(href,link=false){
  let url;try{url=new URL(href,location.href)}catch{return null}
  const q=url.searchParams,project=q.get('project')||'bank-payment',other=project!==activeProjectId;
  if(url.origin!==location.origin||url.pathname!==location.pathname||q.get('view'))return null;
  if(link&&!other&&!q.has('chapter')&&!q.has('tab')&&!objectParam(q)&&!q.get('model')&&!q.get('modelView')&&!q.get('product')&&!q.get('case')&&!q.get('resources')&&!q.get('explore')&&!q.get('section')&&!q.has('scope'))return null;
  const chapter=Number(q.get('chapter')||(link&&!other?s.chapter:1));if(!CHAPTERS.includes(chapter))return null;
  // A case deep link without an explicit lens still names the focused case. Back must
  // restore that place before a more recently remembered model or SDD reading.
  const validation=['readiness','integrity','case'].includes(q.get('validate'))?q.get('validate'):chapter===11&&q.get('tab')==='validate'&&q.get('case')?'case':null;
  // The module scope: a history entry without one is the whole design; a link without one keeps the scope held now.
  // The object is resolved against the project it belongs to (rc41 close, C18/C24): this project's document for a route
  // that stays here; for another project it is kept as the address names it and resolved by openProject once that
  // project is adopted, so a reference or an id is never read through the project on screen.
  return {chapter,tab:TABS.includes(q.get('tab'))?q.get('tab'):null,object:other?objectParam(q)||null:resolveObjectId(objectParam(q),chapter),section:q.get('section')||null,scope:q.has('scope')?q.get('scope')||'':link?undefined:'',model:q.get('model')||null,modelView:q.get('modelView')||null,product:q.get('product')||null,stage:['plans','compare','connections'].includes(q.get('stage'))?q.get('stage'):null,case:q.get('case')||null,validation,hash:/^#ac-(assessment|readiness)$/.test(url.hash)?url.hash:'',resources:['technology','components','knowledge'].includes(q.get('resources'))?q.get('resources'):null,explore:!!q.get('explore'),project:other?project:null};
}
function focusRouteHash(hash,frames=60){
 if(!hash)return;
 requestAnimationFrame(()=>{if(location.hash!==hash)return;const target=document.getElementById(hash.slice(1));if(!target){if(frames>0)focusRouteHash(hash,frames-1);return;}target.scrollIntoView({block:'start'});target.tabIndex=-1;target.focus({preventScroll:true});});
}
// Moves the shell to that place without a document navigation: a chapter change binds the chapter's studio, a tab
// change keeps the chapter, a named object is selected and its layer shown (round 3, A: no in-app link reloads).
// The Model tab's own parameters are handed to the chapter model as the first address's are (workspace-ux.js
// routeModel); a link's explore= opens the Diagram, and Back from a perspective is Back from a view (round 5, R5-C).
function applyRoute(r,fallbackTab,{link=false}={}){
  const scoped=r.scope!==undefined&&adoptScope(r.scope);
  if(r.chapter!==s.chapter)enterChapter(r.chapter,r.tab||fallbackTab);else if(r.tab&&r.tab!==s.tab){studio.pause?.();hideTip();s.tab=r.tab}
  if(scoped)scopeChanged();
  if(r.object&&selectable(r.object)){s.selected=r.object;holdSubject(r.object);const n=getNode(r.object);if(!s.visible.includes(n.layer))s.visible.push(n.layer);studio.enter?.(r.object,{explicit:true})}
  if(r.validation)validationByChapter.set(r.chapter,r.validation);
  if(r.section&&s.tab==='work')studio.openSection?.(r.section);// a section named in the address opens (round 26, D-26-02)
  if(r.chapter===7&&r.product)studio.selectProduct?.(r.product,r.object);
  if(r.chapter===7&&s.tab==='work'&&!r.section)studio.openStage?.(r.stage||(r.product?'compare':'plans'),r.object);
  if(r.chapter===11&&r.case)studio.selectCase?.(r.case);
  handModel(r,link);
  s.layerOpen=false;persist();
}
function handModel(r,link){
  if(s.tab!=='model')return;
  addressModel=r.model||null;
  if((r.model||r.modelView||(link&&r.explore))&&typeof routeModel==='function')routeModel({chapter:s.chapter,object:r.object,model:r.model,modelView:r.modelView,explore:link&&r.explore});
}
window.addEventListener('popstate',()=>{
  modelReturn=null;
  const r=inAppRoute(location.href);
  if(!r){location.reload();return}
  if(r.project){openProject(r,location.href);return}
  const closingResources=!!window.aiwResourceClosing||!!document.querySelector('.dr-dialog[open]')&&!r.resources;
  window.aiwResourceClosing=false;
  applyRoute(r,'model');pendingNavigationFocus=closingResources?null:'heading';render();
  focusRouteHash(r.hash);
});

// Another project, in place (round 4, A: a link to another project, Back across one, or a project the import just
// created is not a document load). The store reads that project while this one stays on screen; then, with nothing
// else running in between, the shell lets go of everything this project held — the open dialog, the trace, the Chapter
// 1–3 studios and the Chapter 4–11 studio set with its tasks — the store adopts the other project (every module keeping
// state for the project on screen lets it go on 'aiw:project-switched'), a new studio set is opened on it, the view
// state is that project's own preferences with the place the address names, and the page is drawn.
// The address is assigned instead — the document load this replaces — when the shell cannot do this itself: a page
// whose studios cannot be opened again or whose store cannot switch; when the other project cannot be read through
// the store (access refused, a deleted project, an invalid id, no connection), so entry.js says why and offers its
// retry; and when something on the page is unsaved, so the browser asks whether to leave as it always has.
let opening=false;
const unsavedWork=()=>typeof Event==='function'&&!window.dispatchEvent(new Event('beforeunload',{cancelable:true}));
async function openProject(r,href){
  if(opening)return;
  const store=window.aiwProjectStore;
  if(typeof window.aiwOpenStudios!=='function'||typeof store?.prepareProject!=='function'||unsavedWork()){location.assign(href);return}
  opening=true;document.body.setAttribute('aria-busy','true');toast('Opening the project…');
  let next;
  try{next=await store.prepareProject(r.project)}catch(e){opening=false;document.body.removeAttribute('aria-busy');console.warn('The project could not be opened in place.',e?.message);location.assign(href);return}
  try{
    if(studio.busy||mainStudio.busy){next.abandon();toast('Finish the change in progress, then open the project again.');return}
    // The address's object is that project's: resolved against its document, now the store's (inAppRoute left it as given).
    leaveProject();next.adopt();r={...r,object:resolveObjectId(r.object,r.chapter)};enterProject(r);handModel(r,true);
  }catch(e){console.warn('The project could not be opened in place.',e?.message);location.assign(href);return}
  finally{opening=false;document.body.removeAttribute('aria-busy')}
  pendingNavigationFocus='heading';destinationResources=!!r.resources;destinationResourceQuery=r.resources?new URL(href,location.href).searchParams:null;destinationHash=r.hash||'';render(true);destinationResources=null;destinationResourceQuery=null;destinationHash=null;focusRouteHash(r.hash);toast(`${doc()?.name||'Project'} · ${CHAPTER[s.chapter].arrival}`);startCoach();
}
// What belongs to the project on screen and goes with it: the dialog and tooltip, the trace's timer, the Chapter 1–3
// studio bound now and the ones made earlier, and the Chapter 4–11 studio set with its design, exchange and protection
// tasks (every listener each holds, and its window.aiw* handle).
function leaveProject(){
  studio.pause?.();hideTip();closeModal();clearTimeout(flowTimer);
  validationByChapter.clear();
  if(current!==mainStudio)current.dispose();
  foundationStudios.clear();mainStudio.dispose();
}
// The adopted project's own: a new studio set bound to the bridge, the view state from that project's preferences and
// the place the address names, and the shell's memory of what it last drew.
function enterProject(r){
  modelReturn=null;
  if(r.validation)validationByChapter.set(r.chapter,r.validation);
  const set=window.aiwOpenStudios();chapterStudios=set.chapter;foundationFactories=set.foundation||{};mainStudio=studioDefaults(chapterStudios);current=mainStudio;
  const view=openView(r);for(const k of Object.keys(s))delete s[k];Object.assign(s,view);
  mainStudio.bind(bridge);if(current!==mainStudio)current.bind(bridge);
  if(r.object)studio.enter?.(s.selected,{explicit:true});
  if(r.chapter===7){
    if(r.product)studio.selectProduct?.(r.product,r.object);
    if(s.tab==='work'&&!r.section)studio.openStage?.(r.stage||(r.product?'compare':'plans'),r.object);
  }
  if(r.section&&s.tab==='work')studio.openSection?.(r.section);
  if(r.chapter===11&&r.case)studio.selectCase?.(r.case);
  visitedSteps.clear();knownIds=new Set(studio.graph().nodes.map(n=>n.id));savedRecord=null;revealPending=null;modelLayerInfo=null;subject=null;released=null;
  renderedRevision=null;guidance=null;guidanceAsked=false;drawerWasOpen=false;lastFocus=null;
  persist();
}

// Chapter-owned bodies share one shell. Supporting tools are kept out of the task area;
// essential scope selectors and live error messages remain visible.
function outputSurface(){return studio.output();}
function workspaceAssistance(){
  const template=document.createElement('template');template.innerHTML=studio.assistance();
  if(!template.content)return {tools:studio.assistance(),context:'',notices:''};
  const root=template.content,context=[],notices=[];
  for(const el of root.querySelectorAll('.d-question-bar,.rt-environment-bar')){context.push(el.outerHTML);el.remove();}
  for(const el of root.querySelectorAll('[role="alert"],.l-gap-note')){notices.push(el.outerHTML);el.remove();}
  for(const el of root.querySelectorAll('.r-assistant-bar,.l-assistance')){
    for(const button of el.querySelectorAll('button'))if([...button.attributes].some(a=>a.name.startsWith('data-')&&a.value==='sol'))button.remove();
    const first=el.firstElementChild;if(first&&!first.querySelector('button,select,input')&&first.tagName!=='NAV')first.remove();
  }
  return {tools:template.innerHTML,context:context.join(''),notices:notices.join('')};
}

// The purpose line is the tab's one sentence on every chapter (round 26, D-26-01: the same words, the glossary a click
// away); the Model's picture is named by the breadcrumb and its purpose by the Questions picker, so aiw:model-context
// (perspective-view.js) no longer rewrites the line (rc41, W2: a second line after the frame measured its height
// overflowed the stage).

// Same-tab inspection reads the canonical record without borrowing another chapter's
// stateful editor. Own-chapter controls remain native; foreign records use the shared
// dossier and explicit links to their owning editor.
function workspaceInspectorHTML(){
  const p=doc(),id=s.selected,source=typeof chapterOfRecord==='function'&&chapterOfRecord(p,id);
  if(!source||source===s.chapter)return withGlance(studio.inspector(getNode(id)));
  const r=findRecord(p,source,id)?.record;if(!r)return withGlance(studio.inspector(getNode(id)));
  const graph=architectureModel(p),body='<p>'+esc(r.purpose||r.description||r.context||r.statement||'Purpose needs definition.')+'</p>'+
    '<p><a class="btn" href="'+esc(projectURL('/?chapter='+source+'&tab=work&object='+encodeURIComponent(id)))+'">Open definition in Chapter '+source+' Work</a></p>'+modelDossierHTML(p,id,{chapter:source,open:true});
  return recordCardHTML(p,source,id,body,{nodes:[...graph.objects.values()],edges:graph.relationships});
}
// The design at a glance (rc40, PLAN §4.4.4; work-glance.js): on Work, Validate and Output (rc41, W2), while no record
// is held (the chapter's guidance stands in the column), the chapter's picture, its checks, Sol's starters for the
// stage and the next task follow the guidance; a chapter with no record of its own keeps the column for its arrival
// card. A held record keeps its card.
function withGlance(html){
  if(!['work','validate','output'].includes(s.tab)||!String(html).includes('class="record-guidance"'))return html;
  try{const p=doc();if(!chapterHasRecords(p,s.chapter))return html;return html+workGlanceHTML(p,s.chapter,studio.workSection||null,{tab:s.tab});}
  catch(e){console.warn('The design at a glance could not be drawn.',e?.message);return html;}
}
// Public read-only inspection contract. `chapter` identifies the source, never a
// navigation destination. The canonical id is authoritative; the stage is not rebuilt.
const inspectionEvents=new WeakSet();
function inspectRecord(event){
  if(inspectionEvents.has(event))return;inspectionEvents.add(event);
  const id=event.detail?.id;if(typeof id!=='string'||!selectable(id)){toast('This record is no longer available.');return;}
  selectNode(id,true);
  document.querySelector('#inspector')?.focus({preventScroll:true});
}
document.addEventListener('aiw:inspect-record',inspectRecord);
window.addEventListener('aiw:inspect-record',inspectRecord);

function render(push=false){
  const restoreFocus=rememberRailFocus();
  if(adoptScope(s.scope))persist();
  if(s.selected&&s.selected!=='project'&&!selectable(s.selected))s.selected=null;// a record that left the design is released, never replaced by another (round 26, D-26-03)
  if(window.aiwProjectStore?.value?.document.workspace?.template&&window.aiwProjectStore.value.document.workspace.template!=='bank-payment')s.scenario='success';
  document.body.dataset.workspaceTab=s.tab;document.body.classList.add('studio-workspace');
  document.body.classList.toggle('realisation-studio',s.chapter===5);document.body.classList.toggle('technology-studio',s.chapter>=6);
  writeRoute(push);
  hideTip();
  const info=CHAPTER[s.chapter],model=s.tab==='model',project=doc(),assistance=workspaceAssistance();
  const purpose=TAB_PURPOSE[s.tab]||info.subtitle;
  const next=footerNext();
  const responsibilities=project?.logical?.responsibilities.length??studio.graph().nodes.filter(n=>n.layer==='logical'&&!n.ghost).length;
  const projectName=project?.name||'Project';
  // Every chapter is a link (U2-01) that this shell follows in place, keeping the working tab and the project (round 3,
  // A); the address is still a real one, for a new tab or a bookmark.
  const nav=CHAPTERS.map(id=>`<a class="chapter-item available ${s.chapter===id?'current':''}" href="${esc(projectURL('/?chapter='+id+'&tab='+s.tab))}" data-chapter="${id}" aria-current="${s.chapter===id?'step':'false'}"><span class="chapter-number">${pad2(id)}</span><span><b>${CHAPTER[id].title}</b><small>${CHAPTER[id].sub}</small></span>${s.chapter===id?icon('chevron'):''}</a>`).join('');
  // The tab bar is a tablist (U2-30): one tab stop, arrow keys between the tabs.
  const tabs=[['work','Work','work'],['model','Model','boxes'],['validate','Validate','shield'],['output','Output','file']].map(([id,label,ic])=>`<button class="tab ${s.tab===id?'active':''}" role="tab" id="tab-${id}" data-tab="${id}" aria-selected="${s.tab===id}" aria-controls="studio-surface" tabindex="${s.tab===id?'0':'-1'}">${icon(ic)}${label}</button>`).join('');
  const stage=model
    ?`<div class="stage tab-content">${s.chapter>=5?'<div id="flow-panel" class="flow-panel"></div>':''}</div><aside id="inspector" tabindex="-1" class="model-companion" aria-label="Model details"></aside>`
    :`<div class="stage tab-content">${s.tab==='work'?studio.work():s.tab==='validate'?studio.validation():outputSurface()}</div><aside id="inspector" tabindex="-1" class="inspector" aria-label="${info.details}">${workspaceInspectorHTML()}</aside>`;
  const context=scopeBarHTML()+assistance.context+(model?subjectStripHTML():'');
  const saveLabel=typeof isOffline==='function'&&isOffline()?'Offline · changes are not saved':window.aiwProjectStore?.status==='saving'?'Saving…':'Saved to your private project';
  const saveShort=saveLabel.startsWith('Offline')?'Offline':saveLabel.startsWith('Saving')?'Saving…':'Saved';
  $('#app').innerHTML=`
  <header class="topbar"><div class="brand"><span class="brand-mark">${icon('layers')}</span><span class="brand-name">aiw<span class="v5">V5</span></span><span class="brand-caption">Intelligent Architecture Workbench</span></div><div class="top-actions">${themeControl()}<span class="save-state" role="status" aria-live="polite" aria-label="${esc(saveLabel)}"><i class="dot"></i><span class="save-state-full" aria-hidden="true">${esc(saveLabel)}</span><span class="save-state-short" aria-hidden="true">${esc(saveShort)}</span></span><span class="private" aria-label="Private workspace">${icon('lock')}<span>Private workspace</span></span></div></header>
  <div class="shell"><aside class="sidebar ${s.layerOpen?'open':''}" aria-label="Project navigation"><div class="eyebrow">Project</div><div class="project-card"><div class="project-name">${icon('globe')}${esc(projectName)}</div><small>Shared model · ${responsibilities} responsibilities</small></div><div class="eyebrow">Architecture journey</div><nav class="chapter-nav" aria-label="Architecture chapters">${nav}</nav>${modulesRailHTML()}${layersRail()}<div class="sidebar-note"><b>One model. Many perspectives.</b>${model?'Switch layers to focus the picture. Select an object to follow it through the project.':'Use Work to record, Model to explore, Validate to check, and Output to share a working edition.'}</div><div class="sidebar-bottom">${icon('book')} Guided exploration · Ch. 01–11</div></aside>
  <main id="workspace" class="main"><section class="heading-row" aria-label="Current chapter"><div class="workspace-heading"><div class="breadcrumb"><span class="breadcrumb-project">${esc(projectName)}</span>${icon('chevron')}<span class="you-are-here" id="you-are-here"><span id="yah-text">${esc(whereNow())}</span></span></div><h1>${esc(info.title)}</h1><p class="subtitle tab-purpose" id="tab-purpose">${esc(purpose)}<button type="button" class="text-button" data-action="help-glossary">Words used here</button></p></div></section>
  <div class="workspace-bar workspace-toolbar"><nav class="tabs" role="tablist" aria-label="Chapter surfaces" aria-describedby="tab-purpose">${tabs}</nav><div class="workspace-tools"><button type="button" data-workspace-sol data-brain-launch="design" aria-controls="brain-panel" aria-expanded="false">${icon('spark')}Ask Sol</button><button type="button" data-panel-toggle aria-controls="inspector" aria-expanded="false">${icon('eye')}Details</button><details class="chapter-tools"><summary>Chapter tools</summary><div class="chapter-tools-menu">${assistance.tools}<button type="button" class="text-button" data-action="help-glossary">Words used here</button></div></details><button type="button" class="help-btn" data-action="help-map" aria-haspopup="dialog" aria-label="Help: what each chapter and tab holds" title="What each chapter and tab holds">?</button><button class="btn mobile-layers" data-action="layers-menu" aria-expanded="${s.layerOpen}" aria-haspopup="dialog" aria-controls="chapter-drawer" aria-label="Open chapter navigation">${icon('book')}Chapters</button></div></div>
  <div class="workspace-context">${context}</div>${coachMarkup()}
  ${window.aiwInterfaceImpact?.reminder(s.chapter,s.tab)||''}${assistance.notices}<section class="studio" id="studio-surface" role="tabpanel" aria-labelledby="tab-${s.tab}" aria-label="${s.tab} workspace">${stage}</section>
  <footer class="footer">${footerNextHTML(next)}<p class="footer-state"><span id="guidance-source">${esc(guidanceText())}</span> · <button type="button" data-action="about">About this workbench</button></p></footer></main></div><div id="dialog-host"></div>`;
  if(model)renderFlow();
  if(s.tab!=='model')import('./record-picture.js').then(m=>m.mountRecordPicture($('#inspector'),()=>({chapter:typeof chapterOfRecord==='function'?chapterOfRecord(doc(),s.selected)||s.chapter:s.chapter,id:s.selected}))).catch(e=>reportLoadFailure('the record picture',e));// the selected record's picture above its details (round 5)
  refineWorkspace(s.tab,{chapter:s.chapter,id:s.selected,subject,scope:s.scope});restoreFocus();
  askGuidance();
  afterRender();
  watchChrome();
  // A new chapter or an in-page route starts at its destination; tab activation keeps the
  // keyboard in the tablist so the arrow keys remain useful. Other redraws retain their control.
  const destination=pendingNavigationFocus;pendingNavigationFocus=null;
  if(destination){const target=destination==='tab'?$('#tab-'+s.tab):$('.heading-row h1');if(target){if(destination==='heading')target.tabIndex=-1;target.focus({preventScroll:destination==='tab'});}}
  renderedRevision=window.aiwProjectStore?.value?.revision??null;
  // Direct resource links and browser Back enter through this same shell. A normal redraw keeps
  // the reading open without creating another dialog or a new history entry.
  if(new URLSearchParams(location.search).has('resources')||window.aiwResourcesRoute)
    import('./design-resources-ui.js').then(m=>m.syncDesignResourcesFromRoute()).catch(e=>reportLoadFailure('the design resources',e));
}
// What the shell does once the page is drawn: the tablist keys, the phone navigation drawer, the Work-surface layer
// filter and the record just saved (the change notice scopes itself where it is mounted: change-notice.js, round 12, G).
// There is no other shell to prefetch (round 3, A).
let revealPending=null,drawerWasOpen=false;
function afterRender(){
  if(typeof refreshActionUndo==='function')refreshActionUndo();
  // Each step is presentation only; one that fails must never leave the page half drawn.
  const step=fn=>{try{fn()}catch(e){console.warn('Shell refinement skipped:',e?.message)}};
  step(()=>{if(typeof tablist==='function')tablist($('.tabs'))});
  step(()=>{const sidebar=$('.sidebar'),wasOpen=drawerWasOpen;drawerWasOpen=s.layerOpen;if(sidebar){sidebar.id='chapter-drawer';if(typeof navigationDrawer==='function'&&(s.layerOpen||wasOpen))navigationDrawer(sidebar,{open:s.layerOpen,wasOpen,opener:$('.mobile-layers')});}});
  const id=revealPending;revealPending=null;
  if(id)step(()=>{const row=recordRow(id);if(row&&typeof revealRecord==='function')revealRecord(row)});
  if(s.tab==='work')step(()=>writeRoute());
}
// A saved record's row on the Work surface, found by the object it selects or edits.
function recordRow(id){const el=$(`.studio [data-select="${cssId(id)}"], .studio [data-l-id="${cssId(id)}"]`);return el?.closest('article,li,tr,.l-record,.task-row')||el;}
// Chapter 5's trace of the payment outcomes (or the recorded journey) through the components that realise each
// step. Recording each outcome is a Chapter 5 milestone. From Chapter 6 the panel holds the chapter's failure lab.
const blankJourney=()=>isBlankProject(window.aiwProjectStore?.value?.document||{});
const flowStages=()=>blankJourney()?journeyStages(window.aiwProjectStore.value.document):stages;
function baseFlowText(){if(blankJourney())return s.step<0?'This trace follows your recorded journey order and saved responsibility links. It illustrates the design; no application code is executed.':flowStages()[s.step]?.text||'Add journey steps in Chapter 1 to trace this model.';if(s.step<0)return 'Trace the happy path, or explore a risk hold and a settlement timeout. This is an illustrative simulation.';if(s.scenario==='hold'&&s.step===1)return 'Risk screening holds this instruction. No ledger posting or settlement occurs. A manual review owner must decide the next action.';if(s.scenario==='timeout'&&s.step===3)return 'The settlement response times out. Outcome stays pending; enquire using the existing reference before retrying. Do not assume failure.';return flowStages()[s.step].text}
function flowText(){const base=baseFlowText();return !blankJourney()&&studio.flowText?studio.flowText(base):base}
function isTerminal(){if(blankJourney())return flowStages().length>0&&s.step===flowStages().length-1;return s.step===4||(s.scenario==='hold'&&s.step===1)||(s.scenario==='timeout'&&s.step===3)}
function renderFlow(){
  const panel=$('#flow-panel');if(!panel)return;
  if(s.chapter>=6){patchLiveSurface(panel,studio.failureSurface());return}
  patchLiveSurface(panel,`<header><div class="flow-label"><i class="live-indicator"></i>${blankJourney()?'Your recorded journey':'Payment outcomes'} <span class="flow-kind" style="font-size:12px">· SIMULATION</span></div><select id="scenario" aria-label="Journey scenario">${blankJourney()?'<option value="success">Recorded journey</option>':`<option value="success" ${s.scenario==='success'?'selected':''}>Successful payment</option><option value="hold" ${s.scenario==='hold'?'selected':''}>Risk hold</option><option value="timeout" ${s.scenario==='timeout'?'selected':''}>Settlement timeout</option>`}</select></header><div class="journey">${flowStages().map((stage,i)=>`<button class="journey-step ${s.step===i?'active':visitedSteps.has(i)?'done':''}" data-stage="${i}" aria-label="Explore step ${i+1}: ${esc(stage.name)}" ${s.scenario==='hold'&&i>1||s.scenario==='timeout'&&i>3?'disabled':''}><span>${visitedSteps.has(i)&&s.step!==i?'✓':pad2(i+1)}</span>${esc(stage.name)}</button>`).join('')}</div><div class="flow-actions"><small>${s.flowFinished?(s.scenario==='success'?(visitedSteps.size===flowStages().length?'Journey complete · '+flowStages().length+' steps traced':'At final step · Replay to explore every step'):'Journey stopped · Review required'):'Step through each outcome, then record its review.'}</small><div class="action-row"><button class="btn icon-only" data-action="restart-flow" aria-label="Restart walkthrough">${icon('rewind')}</button><button class="btn" data-action="step-flow" ${isTerminal()?'disabled':''}>Step${icon('chevron')}</button><button class="btn" data-action="play">${icon(s.playing?'pause':'play')}${s.playing?'Pause':s.flowFinished?'Replay':'Play'}</button></div></div><p class="journey-copy" role="status" aria-live="polite">${esc(flowText())}</p>${studio.scenarioAction?.()||''}`);
}
function goStage(step){if(!Number.isInteger(step)||step<0||step>=flowStages().length||(s.scenario==='hold'&&step>1)||(s.scenario==='timeout'&&step>3))return;visitedSteps.add(step);s.step=step;s.selected=studio.flowNode?.(flowStages()[step].node)||flowStages()[step].node;const flowLayer=s.chapter===5?'physical':'logical';if(!s.visible.includes(flowLayer)){s.visible.push(flowLayer);render()}refreshInspector();renderFlow()}
function advance(){if(isTerminal()){s.playing=false;s.flowFinished=true;if(s.scenario==='success'&&visitedSteps.size===flowStages().length)mark('flow');renderFlow();return}goStage(s.step+1);if(s.playing)flowTimer=setTimeout(advance,2100);else if(isTerminal()){s.flowFinished=true;if(s.scenario==='success'&&visitedSteps.size===flowStages().length)mark('flow');renderFlow()}}
function play(){if(!flowStages().length){toast('Add a journey step in Chapter 1, then connect its responsibility in Chapter 4.');return}if(s.tab!=='model')setTab('model');if(s.playing){s.playing=false;clearTimeout(flowTimer);renderFlow();return}if(isTerminal()){s.step=-1;s.flowFinished=false;visitedSteps.clear()}s.playing=true;advance()}

// A selection rewrites the current address, refreshes the details beside Work, Validate and Output, and tells
// the chapter model and Sol.
function refreshInspector(){writeRoute();const details=$('#inspector:not(.model-companion)');if(details)details.innerHTML=workspaceInspectorHTML();refineWorkspace(s.tab,{chapter:s.chapter,id:s.selected,subject,scope:s.scope})}
function refreshModel(){if(s.tab==='model')refineWorkspace('model',{chapter:s.chapter,id:s.selected,subject,scope:s.scope})}
function selectNode(id,fromPointer=false){if(!selectable(id)){toast('This object is unavailable in the current perspective. Reveal its layer or choose another object.');return}const n=getNode(id),revealed=!s.visible.includes(n.layer);s.selected=n.id;holdSubject(n.id);if(revealed)s.visible.push(n.layer);if(!n.ghost)mark('inspect');if(n.layer==='physical')mark('physical');persist();if(s.tab==='model'&&revealed)render();else refreshInspector();openWorkspaceDetails();if(!fromPointer&&s.tab==='model')toast(`${n.title} · ${layerOf(n).name}`)}
function preview(id){return studio.preview(id)}
function accept(id){return studio.accept(id)}
function remove(id){s.accepted=s.accepted.filter(x=>x!==id);s.selected=suggestions[id].source;if(!s.accepted.length)unmark('candidate');unmark('validate');unmark('export');persist();render();toast('Candidate removed. The original model is restored for this change.')}
// The sidebar's "Model layers" (round 3, D: one layer model). They belong to the Model picture:
// per layer how many elements it holds ("Logical application · 5"; a layer with none is shown, disabled), the
// picture's name, Show all and Only this chapter's layers; a switch hides that layer's elements and relationships in
// every Model view and re-lays the picture (notation-view.js keeps the state per chapter and picture and reports it
// back through aiwSetModelLayers). Record lists and checks retain their own explicit filters.
let modelLayerInfo=null;
function layersRail(){
  if(s.tab!=='model')return '';
  const info=modelLayerInfo&&modelLayerInfo.chapter===s.chapter?modelLayerInfo:null,on=id=>s.visible.includes(id),count=id=>info?info.counts[id]||0:null;
  if(info&&(info.view==='whole'||!Object.values(info.counts||{}).some(n=>n>0)))return '';
  if(info?.filterMenu)return `<section class="journey-explorer model-layers" aria-label="Model layers"><header><h2>Model layers</h2></header><p class="rail-view-hint" role="status">${esc(info.picture)} · ${info.hidden?esc(info.hidden)+' hidden by layers':'every layer shown'}</p><button type="button" class="text-button" data-action="model-layer-filter">Open picture layer filters</button><p class="rail-view-help">One filter setting for this picture. Whole design’s depth controls open its architecture bands separately.</p></section>`;
  const items=layers.map(l=>{const n=count(l.id),none=n===0,label=n==null?l.name:none?`${l.name} · none in this picture`:`${l.name} · ${n}`;return `<button type="button" class="rail-layer${none?' rail-layer-none':''}" data-layer="${esc(l.id)}" aria-pressed="${on(l.id)&&!none}"${none?' disabled aria-disabled="true"':''} style="--layer:${l.color}" title="${esc(none?'Nothing in this picture stands in this layer':`${on(l.id)?'Hide':'Show'} this layer in the picture`)}">${icon(l.icon)}<span>${esc(label)}</span><span class="rail-layer-check" aria-hidden="true">${on(l.id)&&!none?'✓':''}</span></button>`}).join('');
  const hint=info?(info.view==='whole'?'Whole design · the anatomy shows every layer; the layers filter the other views':`${esc(info.picture)} · ${info.hidden?info.hidden+' hidden by layers':'every layer shown'}`):'The layers of the picture on screen';
  return `<section class="journey-explorer model-layers" aria-label="Model layers"><header><h2>Model layers</h2><button type="button" data-action="all-layers" aria-label="Show all model layers">Show all</button></header><p class="rail-view-hint" role="status">${hint}</p><div class="rail-layer-list">${items}</div><p class="rail-view-help"><button type="button" class="text-button" data-action="chapter-layers">Only this chapter’s layers</button></p></section>`;
}
function toggleLayer(id){studio.pause?.();s.playing=false;clearTimeout(flowTimer);hideTip();s.layerOpen=false;
  if(s.tab!=='model')return;s.visible=s.visible.includes(id)?s.visible.filter(x=>x!==id):[...s.visible,id];if(s.visible.includes('process')&&s.visible.includes('logical'))mark('layers4');if(s.visible.includes('physical'))mark('physical');s.zoom=1;s.pan={x:0,y:0};persist();
  // The chapter models' pictures strip to the same layers (notation-view.js listens and reports back); the page is
  // not redrawn, only the picture and this list.
  setModelLayers([...s.visible])}
function setModelLayers(detail){
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('aiw:model-layers',{detail}));
  if(Array.isArray(detail))window.aiwSetModelLayers(detail);
}
// A chapter model's own Layers menu tells the sidebar, which redraws its layer list alone.
// It reports the picture's layers and what each holds (layers-view.js layerSummary); the list is redrawn alone.
// Modules that send the person elsewhere in this project (the model companion's Open in Work, a saved perspective's chapter)
// route through the shell when the address is a place in it; they fall back to the browser when it is not.
function rememberModelReturn(r){if(s.tab==='model'&&r.tab==='model'&&r.chapter!==s.chapter)modelReturn={chapter:s.chapter,title:CHAPTER[s.chapter].title};else if(r.tab&&r.tab!=='model')modelReturn=null}
window.aiwRoute=href=>{const r=inAppRoute(href,true);if(!r)return false;if(studio.busy||opening)return true;if(r.project){openProject(r,href);return true}rememberModelReturn(r);const moved=r.chapter!==s.chapter,changed=moved||!!r.tab&&r.tab!==s.tab;destinationResources=!!r.resources;destinationResourceQuery=r.resources?new URL(href,location.href).searchParams:null;destinationHash=r.hash||'';destinationValidate=r.validation||'';applyRoute(r,s.tab,{link:true});if(changed)pendingNavigationFocus='heading';render(true);destinationResources=null;destinationResourceQuery=null;destinationHash=null;destinationValidate=null;focusRouteHash(r.hash);if(moved)toast(CHAPTER[s.chapter].arrival);return true};
window.aiwSetModelLayers=(layersNow,info)=>{if(!Array.isArray(layersNow))return;s.visible=layers.map(l=>l.id).filter(id=>layersNow.includes(id));if(info&&typeof info==='object'){modelLayerInfo=info;queueWhere()}persist();
  // The picture now shows another view than the address names: the address follows the picture.
  if(s.tab==='model'&&info?.chapter===s.chapter&&info.model&&addressModel!==info.model){addressModel=info.model;writeRoute()}
  if(s.tab!=='model')return;const rail=document.querySelector('.sidebar .model-layers');
  const t=document.createElement('template');if(!t?.content)return;t.innerHTML=layersRail();const fresh=t.content.firstElementChild;
  if(!fresh){rail?.remove();return;}if(rail?.outerHTML===fresh.outerHTML)return;
  const keep=rememberRailFocus();if(rail)rail.replaceWith(fresh);else document.querySelector('.sidebar .chapter-nav')?.after(fresh);keep()};

// What produces the guidance on this page comes from the workbench's configuration, not a fixed claim (audit F-22).
let guidance=null,guidanceAsked=false;
function guidanceText(){if(typeof guidanceFooter!=='function')return 'Rule-based guidance';let disclosure=null;try{const d=doc();if(d)disclosure=solDisclosure(d);}catch{/* a project still loading discloses nothing yet */}return guidanceFooter(guidance,disclosure);}
function askGuidance(){if(guidanceAsked)return;guidanceAsked=true;fetch(projectURL('/api/intelligence/status'),{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(v=>{if(!v)return;guidance=v;const el=$('#guidance-source');if(el)el.textContent=guidanceText()}).catch(e=>console.warn('Sol’s connection status could not be read.',e?.message))}
function about(){hideTip();lastFocus=document.activeElement;s.modal='about';
  $('#dialog-host').innerHTML=`<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><span class="eyebrow">AIW V5</span><button class="btn icon-only" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header><h2 id="dialog-title">About this workbench</h2><p>All eleven chapters share one connected model of your project and the same Work, Model, Validate and Output rhythm, in one page that never reloads between chapters. Each Model tab opens the chapter's own models; the connected architecture explorer shows every perspective of the same objects.</p><h3>What is real here</h3><p>Your project and its connected objects, layer filtering, object inspection, chapter-aware guidance, structural checks, milestones, and exports.</p><h3>What is illustrative</h3><p>${typeof hasIllustrativeRecords==='function'&&hasIllustrativeRecords(doc())?'The bank architecture and its implementations are sample data. ':''}Traces and failure labs are teaching simulations; nothing is executed. Chapter guidance uses explicit model rules. ${esc(guidanceText())}. Sol shows the connection's status and the exact source packet before it generates anything.</p>${typeof glossaryHTML==='function'?glossaryHTML():''}<h3>Your working state</h3><p>Requirements, quality drivers, decisions, logical responsibilities, connections, implementation mappings, technology capabilities, technology choices, and interface/data definitions use your private project storage. View preferences and earlier architecture notes stay in this browser.</p></section></div>`;
  $('#dialog-host [data-action="close-modal"]').focus();
}
// ---------------------------------------------------------------- the subject strip (round 11, A)
// What the reader holds, said in one place above the Model tab's picture: the record last selected, kept across chapters
// while the chapter draws it, and released by its button or by a chapter that does not draw it (round-8 J-43), which the
// strip says. A chapter model's own selection reaches here as 'aiw:subject' (model-stage.js announceObject), a release
// reaches the models as 'aiw:subject-release' (notation-view.js). The strip is a status line: a change is announced.
let subject=null,subjectTitle='',released=null;
function subjectNode(){const n=subject?selectable(subject):null;return n&&!n.ghost?n:null}
function holdSubject(id){const n=id?selectable(id):null;if(!n||n.ghost){if(subject){subject=null;released=null;drawSubject()}return}if(subject===n.id)return;subject=n.id;subjectTitle=n.title;released=null;drawSubject()}
function releaseSubject({title=subjectTitle,why=''}={},{quiet=false}={}){subject=null;released=title?{title,why}:null;drawSubject();if(!quiet&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('aiw:subject-release'))}
function subjectStripHTML(){
  const back=modelReturn&&s.tab==='model' ? `<button type="button" class="ss-return" data-action="model-return" aria-label="Back to Chapter ${esc(modelReturn.chapter)} model">← Chapter ${esc(modelReturn.chapter)} · ${esc(modelReturn.title)}</button>` : '';
  const n=subjectNode();
  if(n)return `<p class="subject-strip" id="subject-strip" role="status" aria-live="polite">${back}<span class="ss-k">Holding</span><b>${esc(n.title)}</b>${n.ref?` <span class="ss-ref">${esc(n.ref)}</span>`:''}<button type="button" class="text-button" data-action="release-subject" aria-label="Release ${esc(n.title)}">Release</button></p>`;
  if(released)return `<p class="subject-strip ss-released" id="subject-strip" role="status" aria-live="polite">${back}<span class="ss-k">Released</span>${esc(released.title)}${released.why?' '+esc(released.why):''}</p>`;
  return `<p class="subject-strip ss-none" id="subject-strip" role="status" aria-live="polite"${back?'':' hidden'}>${back}</p>`;
}
function drawSubject(){const el=$('#subject-strip');if(!el||typeof el.replaceWith!=='function')return;const t=document.createElement('template');if(!t?.content)return;t.innerHTML=subjectStripHTML();const fresh=t.content.firstElementChild;if(fresh&&el.outerHTML!==fresh.outerHTML)el.replaceWith(fresh)}
// ---------------------------------------------------------------- the module scope (round 24, D-24-08)
// The module or sub-module the reader works in ('' is the whole design). It is part of the place: the address on every
// chapter and tab, a history entry when it changes (Back returns the previous scope), this browser's preference for the
// project; a chapter or tab change keeps it. The Modules rail, the module map and the breadcrumb set it, Clear ends it,
// and an id the project's structure no longer holds is dropped without a word. Every surface reads it through
// project-context.js; a change is announced as 'aiw:scope', and a held subject the scope does not show is released.
function adoptScope(id){const next=knownScope(id);if(typeof setShellScopeId==='function')setShellScopeId(next);if(next===s.scope)return false;s.scope=next;return true}
function lensNow(){try{return s.scope&&typeof scopeLens==='function'?scopeLens(doc(),s.scope):null}catch{return null}}
function scopeChanged(){
  const lens=lensNow();
  if(subject&&lens&&!lens.shows.has(subject))releaseSubject({title:subjectTitle,why:'is outside '+lens.title},{quiet:true});
  if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('aiw:scope',{detail:{scope:s.scope,title:lens?.title||''}}));
}
function setScope(id){if(studio.busy||opening||!adoptScope(id))return;persist();scopeChanged();render(true);const lens=lensNow();toast(lens?'Scope · '+lens.title:'Scope cleared · the whole design');}
// The breadcrumb in the workspace bar, while the project has a module structure: All modules › Module › Sub-module · Clear.
function scopeBarHTML(){
  let tree=null;try{tree=doc()&&typeof moduleTree==='function'?moduleTree(doc()):null}catch{tree=null}
  if(!tree?.modules.length)return '';
  const lens=lensNow(),crumbs=[{id:'',title:'All modules'},...(lens?lens.crumbs:[])];
  return `<nav class="scope-bar" aria-label="Module scope"><span class="scope-k">Scope</span> ${crumbs.map((c,i)=>i===crumbs.length-1?`<b aria-current="location" tabindex="-1">${esc(c.title)}</b>`:`<button type="button" class="scope-crumb" data-scope-to="${esc(c.id)}">${esc(c.title)}</button>`).join(' <span class="scope-sep" aria-hidden="true">›</span> ')}${lens?` <span class="scope-sep" aria-hidden="true">·</span> <button type="button" class="scope-crumb" data-action="clear-scope">Clear</button>`:''}</nav>`;
}
// The rail's Modules section: its frame here, its tree and counts drawn by module-ui.js (workspace-ux.js refineModules).
function modulesRailHTML(){let any=false;try{any=!!doc()&&typeof moduleTree==='function'&&moduleTree(doc()).modules.length>0}catch{any=false}return any?'<section class="rail-modules" data-rail-modules aria-labelledby="rail-modules-title"><h2 id="rail-modules-title">Modules</h2></section>':''}
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('aiw:subject',e=>{const id=e.detail?.id||null;if(id&&selectable(id)){if(s.selected!==id){s.selected=id;persist()}holdSubject(id);openWorkspaceDetails({byItself:true})}else if(!id&&subject){subject=null;released=null;drawSubject()}});

// ---------------------------------------------------------------- one voice, "You are here", first steps, the help map
// Round 5, Contract G. Presentation only: none of this writes to the project.
// The assistance chip (brain-context-ui.js places it when the page is idle) is shown only when it adds a fact the
// heading does not. The rule is chipAddsFact in shell-ux.js: the chip's fact must not repeat a word of the heading or
// the subtitle beyond the chapter's name. The chip's framing — its "From your project · rule-based" label, its kicker
// and its "+n in Sol's brief" pointer — is not its fact. The bar is watched, so the rule holds whenever the chip arrives.
let chipObserver=null,whereObserver=null,whereFrame=0,coach=null;
function chipFact(chip){const span=chip.querySelector(':scope>span');if(!span)return '';const kicker=span.querySelector(':scope>b')?.textContent||'';return (span.textContent||'').replace(kicker,'').trim()}
function judgeChip(){
  const chip=document.querySelector('.r-assistant-bar>.brain-brief-chip,.l-assistance>.brain-brief-chip');if(!chip||typeof chipAddsFact!=='function')return;
  const info=CHAPTER[s.chapter],adds=chipAddsFact(chipFact(chip),{heading:info.heading,subtitle:info.subtitle,chapter:info.title});
  if(chip.hidden===adds)chip.hidden=!adds;
  chip.dataset.uxChip=adds?'adds':'repeats';
}
// "You are here": chapter · tab · view, one line under the tabs. The Model view is the switcher's active entry, with
// the picture's own name when the chapter model reports one (aiwSetModelLayers); Validate names the category of
// findings shown and how they are grouped; Work the section its surface has open; Output what it shows.
const SHARED_VIEWS=['diagram','layers','table','cross','whole','modules'];
function viewNow(){
  const stage=$('.studio > .stage');if(!stage)return '';
  if(s.tab==='model'){
    const on=stage.querySelector('.cm-view[aria-pressed="true"]');
    const name=(on?.querySelector('span')?.textContent||on?.textContent||'').trim(),id=on?.dataset.id||'',info=modelLayerInfo&&modelLayerInfo.chapter===s.chapter?modelLayerInfo:null;
    const pic=info&&info.picture&&(info.view===id||(info.view==='own'&&id&&!SHARED_VIEWS.includes(id)))?String(info.picture).trim():'';
    if(!pic||pic===name)return name;
    return pic.toLowerCase().startsWith(name.toLowerCase())?pic:name?name+' · '+pic:pic;
  }
  const mine=el=>el&&!el.closest('#inspector,.vx-head,.vx-index,.vx-sdd,.vx-obs,dialog');
  if(s.tab==='validate'){
    const lens=stage.querySelector('.vx-switch [data-vx-lens-view][aria-pressed="true"]')?.dataset.vxLensView;
    if(lens==='model')return 'Model integrity';
    if(lens==='case')return 'Focused case';
    const category=[...stage.querySelectorAll('nav [aria-pressed="true"]')].find(mine)?.textContent.trim()||[...stage.querySelectorAll('select[name="rvFilter"]')].map(x=>x.selectedOptions?.[0]?.textContent.trim()).find(Boolean)||'';
    const by=stage.querySelector('.vx-index [data-vx-by][aria-pressed="true"]')?.textContent.trim().toLowerCase()||'';
    return [category||'Checks',by].filter(Boolean).join(' · ');
  }
  if(s.tab==='work'){const on=[...stage.querySelectorAll('nav [aria-pressed="true"], [role="tablist"] [aria-selected="true"], nav [aria-current="page"], nav [aria-current="true"]')].find(mine);return on?on.textContent.replace(/\s+/g,' ').trim().slice(0,60):'Records'}
  return s.chapter===11?'The SDD':'Its part of the SDD';
}
const whereNow=(view='')=>(typeof whereText==='function'?whereText({chapter:s.chapter,title:CHAPTER[s.chapter].title,tab:s.tab,view}):'Chapter '+s.chapter+' · '+s.tab)+(s.scope&&lensNow()?' · Scope: '+lensNow().title:'');
function updateWhere(){whereFrame=0;try{const el=$('#yah-text');if(!el)return;const text=whereNow(viewNow());if(el.textContent!==text)el.textContent=text}catch(e){console.warn('The "You are here" line was not redrawn:',e?.message)}}
function queueWhere(){if(whereFrame)return;whereFrame=typeof requestAnimationFrame==='function'?requestAnimationFrame(updateWhere):(updateWhere(),0)}
// After every render: the chip rule on the new bar, the line redrawn, and the switches of the new surface watched (a
// view switch, a category or a grouping is an aria-pressed change), so the line follows without a document load.
function watchChrome(){
  try{
    judgeChip();updateWhere();
    if(typeof MutationObserver!=='function')return;
    chipObserver?.disconnect();const bar=document.querySelector('.r-assistant-bar,.l-assistance');
    if(bar){chipObserver=new MutationObserver(judgeChip);chipObserver.observe(bar,{childList:true})}
    whereObserver?.disconnect();const surface=$('#studio-surface');
    if(surface){whereObserver=new MutationObserver(queueWhere);whereObserver.observe(surface,{subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-selected','aria-current'],childList:true})}
    markCoachTarget();
  }catch(e){console.warn('Shell chrome skipped:',e?.message)}
}
// First steps (shell-ux.js COACH_STEPS): on a project's first open for this viewer, beside the work, never taking the
// keyboard; any click outside it or Escape puts it away, and the help map can show it again.
function coachMarkup(){return coach&&typeof coachHTML==='function'?`<section class="ux-coach" id="ux-coach" role="region" aria-labelledby="ux-coach-title" aria-describedby="ux-coach-text">${coachHTML(coach.step,doc())}</section>`:''}
function startCoach(force=false){if(typeof coachDue!=='function'||(!force&&!coachDue()))return false;coachSeen();coach={step:0};drawCoach();return true}
function drawCoach(){
  let box=$('#ux-coach');
  if(!coach){box?.remove?.();markCoachTarget();return}
  if(!box){const bar=$('.workspace-bar');if(!bar?.insertAdjacentHTML)return;bar.insertAdjacentHTML('afterend',coachMarkup());}else box.innerHTML=coachHTML(coach.step,doc());
  markCoachTarget();
}
function markCoachTarget(){
  for(const el of $$('.ux-coach-target'))el.classList.remove('ux-coach-target');
  const step=coach&&typeof COACH_STEPS!=='undefined'?COACH_STEPS[coach.step]:null;if(!step)return;
  for(const q of [isMobile()&&step.phone?step.phone:step.target,step.also].filter(Boolean))$(q)?.classList?.add('ux-coach-target');
}
function closeCoach(focusHelp=false){if(!coach)return;coach=null;drawCoach();if(focusHelp)$('.help-btn')?.focus()}
function coachAction(kind){
  if(kind==='next'&&coach)coach.step=Math.min(COACH_STEPS.length-1,coach.step+1);
  else if(kind==='back'&&coach)coach.step=Math.max(0,coach.step-1);
  else{closeCoach(true);return}
  drawCoach();
  // The keyboard stays on the control that was used, or on the step's primary action once that control is gone.
  ($('#ux-coach [data-coach="'+kind+'"]')||$('#ux-coach .btn.primary'))?.focus();
}
// The help map: the chapter × tab grid, the glossary and the first steps again. A dialog like About: Escape closes it
// and the keyboard returns to the "?".
let trayModule=null;
function helpMap(){hideTip();lastFocus=document.activeElement;s.modal='help';
  const draw=()=>{if(s.modal!=='help')return;$('#dialog-host').innerHTML=`<div class="dialog-backdrop"><section class="dialog help-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><span class="eyebrow">Help</span><button class="btn icon-only" data-action="close-modal" aria-label="Close the help map">${icon('close')}</button></header><h2 id="dialog-title">What each chapter and tab holds</h2>${typeof helpMapHTML==='function'?helpMapHTML({chapter:s.chapter,tab:s.tab,project:doc(),tray:trayModule?.trayHTML}):''}<div class="help-actions"><button type="button" class="btn" data-action="help-glossary">Words used here</button><button type="button" class="btn" data-action="coach-again">Show the first steps again</button></div></section></div>`;
  $('#dialog-host [data-action="close-modal"]').focus();};
  if(trayModule)draw();else import('./instrument-tray.js').then(m=>{trayModule=m;draw()}).catch(e=>{reportLoadFailure('the instrument tray',e);draw()});
}
function helpGlossary(){const opener=lastFocus;about();lastFocus=opener;const head=[...$$('.dialog h3')].find(h=>h.nextElementSibling?.matches('.about-glossary'));if(head){head.tabIndex=-1;head.scrollIntoView({block:'start'});head.focus({preventScroll:true})}}
function coachAgain(){closeModal();if(typeof coachForget==='function')coachForget();if(startCoach(true))$('#ux-coach .btn.primary')?.focus()}
// A finding can be treated where it is found: the treatment is Chapter 11's own record (review.disposition),
// sent through the store like every other command; it changes no record and approves nothing (U2-13).
function treatFinding(findingId,stamp,title){
  if(typeof inheritedFindings!=='function'||!window.aiwProjectStore)return;
  const f=inheritedFindings(doc()).find(x=>x.id===findingId);if(!f||(stamp&&f.stamp!==stamp)){toast('This finding has changed. Run the checks again.');return}
  hideTip();lastFocus=document.activeElement;s.modal='treat';
  // "Carry as action" needs a Chapter 11 action defined for this finding, so it is offered there, not here.
  // "Source silent · raised with the owner" (round 12, GR-SRC-07) names with whom the question was raised in the reference.
  const here=DISPOSITIONS.filter(d=>d!=='Carry as action'),needsReference=t=>['Accepted design limitation','Not applicable',SOURCE_SILENT].includes(t);
  $('#dialog-host').innerHTML=`<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><span class="eyebrow">Treatment</span><button class="btn icon-only" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header><h2 id="dialog-title">Treat this finding</h2><p><b>${esc(title||f.title)}</b><br>${esc(f.detail||'')}</p><form id="treat-form" class="treat-form"><label><span>Treatment</span><select name="treatment" required>${here.map(d=>`<option>${esc(d)}</option>`).join('')}</select></label><label><span>Reason</span><textarea name="rationale" rows="3" required maxlength="2000"></textarea></label><label><span>Reviewer</span><input name="reviewer" required maxlength="180" autocomplete="name"></label><label><span data-treat-reference>Evidence or decision reference</span><input name="reference" maxlength="400" placeholder="ADR-00n, a review note, a test or a document"></label><label class="treat-check"><input type="checkbox" name="reviewed" required>I reviewed the finding against the current design.</label><p class="treat-note">Recorded as a Chapter 11 disposition against this finding's current definition. It does not change the record the finding concerns and is not an approval. To carry it as an action, define the action in <a href="${esc(projectURL('/?chapter=11&tab=validate&validate=readiness'))}">Chapter 11</a>.</p><div class="treat-actions"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">Record treatment</button></div></form></section></div>`;
  const form=$('#treat-form'),reference=form.elements.reference,sync=()=>{const t=form.elements.treatment.value;reference.required=needsReference(t);form.querySelector('[data-treat-reference]').textContent=t===SOURCE_SILENT?'Raised with (the owner of the source, and the reference of the request)':'Evidence or decision reference';};sync();
  form.elements.treatment.addEventListener('change',sync);form.elements.treatment.focus();
  form.addEventListener('submit',async ev=>{ev.preventDefault();const data=Object.fromEntries(new FormData(form)),submit=form.querySelector('[type="submit"]');submit.disabled=true;
    try{await window.aiwProjectStore.command({type:'review.disposition',payload:{findingId:f.id,stamp:f.stamp,treatment:data.treatment,rationale:data.rationale,reviewer:data.reviewer,reference:data.reference,reviewed:form.elements.reviewed.checked===true}});closeModal();render();toast(`Treated in Chapter 11 · ${data.treatment}`);const again=[...document.querySelectorAll('.vx-treated')].find(el=>el.closest('.l-finding')?.querySelector(`[data-l-id="${cssId(f.sourceId)}"]`));(again?.closest('.l-finding')?.querySelector('button')||$('.vx-index'))?.focus?.()}
    catch(e){submit.disabled=false;let err=form.querySelector('.treat-error');if(!err){err=document.createElement('p');err.className='treat-error';err.setAttribute('role','alert');form.prepend(err)}err.textContent=e.message}});
}
function closeModal(){s.modal=null;if($('#dialog-host'))$('#dialog-host').innerHTML='';lastFocus?.isConnected&&lastFocus.focus()}

// The cursor explains an object on hover or keyboard focus wherever the studios list one ([data-select]).
function isMobile(){return window.matchMedia('(max-width: 700px)').matches}
function hideTip(){clearTimeout(tipTimer);const tip=$('#cursor-tip');if(tip)tip.hidden=true}
function positionTip(ev){const tip=$('#cursor-tip');if(!tip||tip.hidden||!ev)return;tip.style.left=Math.max(10,Math.min(window.innerWidth-(tip.offsetWidth||260)-12,ev.clientX+18))+'px';tip.style.top=Math.max(10,Math.min(window.innerHeight-tip.offsetHeight-12,ev.clientY+18))+'px'}
function showTip(id,ev,el){if(!s.cursor||isMobile()||ev?.pointerType==='touch'||document.querySelector('dialog[open]'))return;clearTimeout(tipTimer);tipTimer=setTimeout(()=>{if(document.querySelector('dialog[open]'))return;const tip=$('#cursor-tip');if(!tip)return;tip.className='cursor-tip';tip.innerHTML=studio.tip(getNode(id));tip.hidden=false;const box=el?.getBoundingClientRect();positionTip(ev||{clientX:box.x+box.width/2,clientY:box.y+box.height/2})},220)}

document.addEventListener('click',ev=>{
  // Chapter links change the chapter in place with a plain click, keeping the working tab and the project, whatever
  // another module wrote into the link (U2-01; round 3, A: no chapter change is a document navigation). A modified
  // click opens the link's own address, as a browser does.
  const link=ev.target.closest('a[href]'),plain=!!link&&!ev.defaultPrevented&&!ev.metaKey&&!ev.ctrlKey&&!ev.shiftKey&&!ev.altKey&&ev.button===0&&!link.target&&!link.hasAttribute('download');
  if(plain&&link.matches('.chapter-item[data-chapter]:not([data-journey-target])')){ev.preventDefault();if(studio.busy||opening)return;s.layerOpen=false;return setChapter(Number(link.dataset.chapter),{keepTab:true})}
  // Every other link into this project's shell (a chapter's checks from the readiness board, "Open in Work" on another
  // chapter's record, a tab) is the same in-place change; the address bar follows and Back returns.
  if(plain){const r=inAppRoute(link.getAttribute('href'),true);if(r){ev.preventDefault();if(studio.busy||opening)return;if(r.project){openProject(r,link.href);return}rememberModelReturn(r);const moved=r.chapter!==s.chapter;destinationResources=!!r.resources;destinationResourceQuery=r.resources?new URL(link.href,location.href).searchParams:null;destinationHash=r.hash||'';destinationValidate=r.validation||'';applyRoute(r,s.tab,{link:true});pendingNavigationFocus='heading';render(true);destinationResources=null;destinationResourceQuery=null;destinationHash=null;destinationValidate=null;focusRouteHash(r.hash);if(moved)toast(CHAPTER[s.chapter].arrival);return}}
  const button=ev.target.closest('button');if(!button){if(ev.target.classList.contains('dialog-backdrop'))closeModal();return}if(button.disabled||studio.busy)return;
  if(button.dataset.coach)return coachAction(button.dataset.coach);
  if(button.dataset.scopeTo!==undefined){s.layerOpen=false;return setScope(button.dataset.scopeTo)}
  if(button.dataset.action==='treat-finding')return treatFinding(button.dataset.finding,button.dataset.stamp,button.dataset.title);
  // "Review" on a finding keeps the keyboard where it was when the studio only selects the object (U2-13).
  if(button.matches('.l-finding button,.vx-group button')){const key=button.dataset.lId||button.dataset.finding;setTimeout(()=>{if(document.activeElement===document.body){const again=key?$(`.l-finding button[data-l-id="${cssId(key)}"]`):null;again?.focus({preventScroll:true})}},0)}
  if(button.dataset.chapter)return setChapter(Number(button.dataset.chapter),{keepTab:true});if(button.dataset.tab)return setTab(button.dataset.tab);if(button.dataset.layer)return toggleLayer(button.dataset.layer);if(button.dataset.select){closeModal();return selectNode(button.dataset.select)}if(button.dataset.propose)return preview(button.dataset.propose);if(button.dataset.accept)return accept(button.dataset.accept);if(button.dataset.remove)return remove(button.dataset.remove);if(button.dataset.stage!==undefined){clearTimeout(flowTimer);s.playing=false;s.flowFinished=false;goStage(Number(button.dataset.stage));return}
  switch(button.dataset.action){
    case 'next-context':case 'next':if(button.dataset.nextKind==='run'){$('.validation-run button, [data-run-checks]')?.click();break;}studio.next();break;
    case 'back-canvas':setTab('model');break;
    case 'layers-menu':s.layerOpen=!s.layerOpen;render();break;
    case 'model-layer-filter':s.layerOpen=false;document.querySelector('.sidebar')?.classList.remove('open');if(s.tab==='model'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('aiw:open-model-layers'));break;
    case 'all-layers':s.layerOpen=false;if(s.tab!=='model')break;s.visible=layers.map(l=>l.id);mark('layers4');mark('physical');s.zoom=1;s.pan={x:0,y:0};persist();setModelLayers([...s.visible]);break;
    case 'chapter-layers':s.layerOpen=false;setModelLayers('chapter');break;
    case 'cursor':s.cursor=!s.cursor;saveCursorPreference(s.cursor);persist();render();toast(s.cursor?'Hover explanations on · Hover over or focus an object to read about it.':'Hover explanations off · Select an object to see its details.');break;
    case 'play':play();break;
    case 'step-flow':s.playing=false;clearTimeout(flowTimer);advance();break;
    case 'restart-flow':s.playing=false;s.step=-1;s.flowFinished=false;visitedSteps.clear();clearTimeout(flowTimer);renderFlow();break;
    case 'about':about();break;
    case 'help-map':closeCoach();helpMap();break;
    case 'release-subject':releaseSubject({title:subjectTitle});break;
    case 'clear-scope':setScope('');break;
    case 'model-return':if(modelReturn){modelReturn=null;history.back()}break;
    case 'help-glossary':helpGlossary();break;
    case 'coach-again':coachAgain();break;
    case 'close-modal':closeModal();break;
  }
});
document.addEventListener('change',ev=>{if(ev.target.id==='scenario'){s.scenario=ev.target.value;s.playing=false;s.step=-1;s.flowFinished=false;visitedSteps.clear();clearTimeout(flowTimer);persist();renderFlow()}});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){hideTip();if(s.modal)closeModal();else if(coach)closeCoach(!!document.activeElement?.closest?.('#ux-coach'))}if(ev.key==='Tab'&&s.modal){const els=$$('.dialog button:not(:disabled),.dialog a,.dialog input');const first=els[0],last=els.at(-1);if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}}});
window.addEventListener('resize',hideTip);
document.addEventListener('pointerdown',hideTip);
// On a phone the coach occupies its own row. Let an outside tap finish activating its target before removing that row;
// removing it on pointerdown shifts the target away before the browser can dispatch click.
document.addEventListener('pointerdown',ev=>{if(!isMobile()&&coach&&!ev.target?.closest?.('#ux-coach'))closeCoach()});
document.addEventListener('click',ev=>{if(!isMobile()||!coach||ev.target?.closest?.('#ux-coach'))return;const shown=coach;setTimeout(()=>{if(coach===shown)closeCoach()},0)},true);
// Some controls replace their target on pointerup and the browser never emits click. Complete those taps too, after
// the click window has passed; keep the captured instance so a new project's tour is never dismissed by an old tap.
document.addEventListener('pointerup',ev=>{if(!isMobile()||!coach||ev.target?.closest?.('#ux-coach'))return;const shown=coach;setTimeout(()=>{if(coach===shown)closeCoach()},350)},true);
document.addEventListener('pointerover',ev=>{const el=ev.target.closest?.('[data-select]');if(el)showTip(el.dataset.select,ev)});
document.addEventListener('pointerout',ev=>{if(ev.target.closest?.('[data-select]'))hideTip()});
document.addEventListener('focusin',ev=>{const el=ev.target.closest?.('[data-select]');if(el)showTip(el.dataset.select,null,el)});
document.addEventListener('focusout',ev=>{if(ev.target.closest?.('[data-select]'))hideTip()});

// The studios' bridge. The canvas is gone, so a graph refresh re-syncs the Model tab's surface and a
// simulation refresh redraws the trace or lab below it; `route` rewrites the address after a selection a studio made
// without a render. The Chapter 4–11 studios are bound once, for the life of the page; a Chapter 1–3 studio is bound
// when its chapter opens (here, or in enterChapter) and disposed when it closes.
const bridge={state:s,getNode,icon,render,route:()=>writeRoute(),refreshGraph:refreshModel,refreshSimulation:renderFlow,toast,selectNode,setTab,setChapter,mark,unmark,persist,closeModal,pauseFlow(){s.playing=false;clearTimeout(flowTimer)},visited:()=>[...visitedSteps],isTerminal};
mainStudio.bind(bridge);if(current!==mainStudio)current.bind(bridge);
if(requestedObject)studio.enter?.(s.selected,{explicit:true});
if(query.get('section')&&s.tab==='work')studio.openSection?.(query.get('section'));
// The record a link names is what the reader came to hold (round 11, A).
if(requestedObject&&selectable(requestedObject))holdSubject(requestedObject);
// A design-task workspace loaded on demand (workspace-ux.js designTasksReady) works through this bridge and adopts the
// Chapter 4 studio's Sol dialog, as the one the studios create does.
registerShell({bridge,openSol:()=>chapterStudios.designSol(),openProtectionSol:()=>chapterStudios.securitySol()});
// Validate's "Ask Sol about this finding" selects the record the finding concerns through the shell's own selection.
window.aiwShellSelect=id=>{if(selectable(id))selectNode(id)};
document.body.classList.add('logical-studio');
persist();render();focusRouteHash(location.hash);
startCoach();
// A render records the project revision it drew (F2-22): a change this page has already drawn is not drawn again,
// and a save that only stores a view preference does not rebuild the page. aiw:project-command never renders.
const PREFERENCE_ONLY=new Set(['workspace.view','workspace.diagram-arrangement']);
document.addEventListener('aiw:project-command',e=>{const r=e.detail?.revision;if(PREFERENCE_ONLY.has(e.detail?.type)&&Number.isFinite(r)&&renderedRevision===r-1)renderedRevision=r;});
document.addEventListener('aiw:external-project',e=>{const r=e.detail?.revision;if(r!=null&&r===renderedRevision)return;render()});
// A surface that changed what the chapter shows (Validate's cause, round 12, G, GR-UX-03) asks the shell to draw again.
document.addEventListener('aiw:redraw',()=>render());
