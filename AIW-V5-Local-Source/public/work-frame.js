// Shared Work composition. Chapter adapters retain their editors, state and commands.
// rc40 (PLAN §4.4): one intentional layout for the eleven chapters — the journey rail with a progress mark per stage,
// the task head with its state line, the feeds as records with counts, the arrival card, and the register's keyboard
// model (j/k, Enter, o) — chapter-specific in content through WORK_METHOD, WORK_RECORDS and the chapters' own bodies.
// rc41 (W2): the rail is the chapter strip (chapter-strip.js), the one component the four tabs share; the state line
// is the one vocabulary (kindsState); the handoff cards and the chapter's records state are exported for Validate,
// Output and the Model footer, so the four tabs of a chapter are one layout.
import {esc} from './html-escape.js';
import {projectURL,scopedHref} from './project-context.js';
import {chapterChecks} from './readiness-model.js';
import {kindsState,kindWord,isConfirmed} from './work-records.js';
import {chapterStripHTML,chapterStateHTML,stripReading} from './chapter-strip.js';
export const WORK_SECTIONS={
  1:['brief','context','journey','requirement'],2:['intake','scenarios','priorities','compare','conflicts'],3:['inputs','compare','record'],
  4:['responsibilities','connections','mappings','groups'],5:['components','interactions','technology'],6:['needs','capabilities','dependencies'],
  7:['plans','compare','connections'],8:['contracts','parties','data','lineage'],9:['threats','controls','assurance'],10:['placement','recovery','operate'],11:['overview','case','document','delivery','plateaus']
};
const sectionAttributes={1:'data-r-section',2:'data-q-section',3:'data-d-stage',4:'data-l-stage',5:'data-a-stage',6:'data-t-stage',7:'data-tr-stage',8:'data-i-stage',9:'data-sec-stage',10:'data-rt-stage',11:'data-rv-stage'};
const sectionActions={4:['data-l-action','work-stage'],5:['data-a-action','work-stage'],6:['data-t-action','work-stage'],7:['data-tr-action','stage'],8:['data-i-action','stage'],9:['data-sec-action','stage'],10:['data-rt-action','stage'],11:['data-rv-action','stage']};
export function validWorkSection(chapter,id){return WORK_SECTIONS[chapter]?.includes(id)||false;}
export function sectionFromAddress(chapter,fallback){
  if(typeof location==='undefined')return fallback;
  const q=new URLSearchParams(location.search),id=q.get('section');
  return Number(q.get('chapter')||1)===chapter&&validWorkSection(chapter,id)?id:fallback;
}
// The method stays visible while the architect works. These descriptions explain
// the task; they never imply that a visited section or a saved record is approved.
const PURPOSES={
 1:['Frame the outcome','Set the boundaries','Connect the steps','Make it testable'],
 2:['Read the source','Define the pressures','Weigh what matters','Understand the tension','Resolve the trade-offs'],
 3:['Frame a choice','Test the alternatives','Keep the reasoning'],
 4:['Define what is needed','Connect responsibilities','Trace implementation','Set ownership boundaries'],
 5:['Shape the application','Define collaborations','Express platform needs'],
 6:['Read application needs','Define platform support','Design the dependencies'],
 7:['Specify the realization','Compare product choices','Connect the stack'],
 8:['Agree the exchange','Name the participants','Define information','Trace its movement'],
 9:['Understand exposure','Design the safeguards','Record the evidence'],
 10:['Place the workload','Design for disruption','Define how it runs'],
 11:['Review the whole design','Examine the hard cases','Tell the design story','Verify the obligations','Plan the transition']
};
// A method connection names the work that informs a task and the work it feeds.
// These are navigation through the method, not claims of recorded traceability.
// Actual record links are rendered separately by each chapter's native body.
export const WORK_METHOD={
 1:{
  brief:['What needs to change, and what outcome will make the change worthwhile?',[[null,'','Project evidence']],[[1,'context','People & boundaries']]],
  context:['Who is affected, what belongs in scope, and which assumptions shape the design?',[[1,'brief','Project brief']],[[1,'journey','User journey'],[1,'requirement','Testable requirements']]],
  journey:['How does the work move from an actor’s intent to a known outcome?',[[1,'context','Actors & outcomes']],[[1,'requirement','Required behaviour']]],
  requirement:['What must the solution do, and how will someone verify it?',[[1,'journey','Journey steps'],[1,'context','Business context']],[[2,'intake','Architectural drivers'],[4,'responsibilities','Logical responsibilities']]]
 },
 2:{
  intake:['Which requirements create a constraint, quality pressure or important design choice?',[[1,'requirement','Source requirements']],[[2,'scenarios','Driver definitions']]],
  scenarios:['What architectural consequence does each driver have, and what evidence defines it?',[[2,'intake','Inherited requirements']],[[2,'priorities','Reasoned priorities'],[3,'inputs','Design questions']]],
  priorities:['Which pressures matter most, and why should they take precedence?',[[2,'scenarios','Defined drivers']],[[2,'compare','Competing pressures'],[3,'compare','Alternative comparison']]],
  compare:['Where do these drivers reinforce each other, and where do they compete?',[[2,'priorities','Priority order']],[[2,'conflicts','Trade-off record'],[3,'inputs','Design questions']]],
  conflicts:['What tension needs an explicit decision rather than an unstated compromise?',[[2,'compare','Driver comparison']],[[3,'inputs','Decision & rationale']]]
 },
 3:{
  inputs:['What choice must be made, and which requirements and drivers should decide it?',[[1,'requirement','Requirements'],[2,'scenarios','Architectural drivers']],[[3,'compare','Credible alternatives']]],
  compare:['Which approach addresses the drivers, with what trade-offs and supporting evidence?',[[3,'inputs','Question & criteria']],[[3,'record','Reasoned decision']]],
  record:['Why is this the working choice, and what must be reviewed before it is accepted?',[[3,'compare','Alternative evidence']],[[4,'responsibilities','Logical boundaries'],[5,'components','Application components']]]
 },
 4:{
  responsibilities:['What must the application be responsible for, independently of its implementation?',[[1,'requirement','Required behaviour'],[3,'record','Design decisions']],[[4,'connections','Collaborations'],[5,'components','Implementing components']]],
  connections:['How do responsibilities collaborate to deliver the required behaviour?',[[4,'responsibilities','Responsibility boundaries']],[[5,'interactions','Component interactions']]],
  mappings:['Which component will realise each responsibility, and what is the allocation scope?',[[4,'responsibilities','Logical responsibilities']],[[5,'components','Physical realisation']]],
  groups:['Which responsibilities belong together, and where should ownership boundaries sit?',[[1,'context','Business boundaries'],[4,'responsibilities','Responsibilities']],[[5,'components','Component boundaries']]]
 },
 5:{
  components:['Which components realise the logical design, and why do those boundaries make sense?',[[4,'responsibilities','Responsibilities'],[3,'record','Design decisions']],[[5,'interactions','Interactions'],[5,'technology','Platform needs']]],
  interactions:['What crosses each component boundary, and what happens when the interaction fails?',[[5,'components','Component responsibilities']],[[8,'contracts','Boundary contracts'],[10,'operate','Runtime routes']]],
  technology:['What must the platform provide for each component to fulfil its responsibilities?',[[5,'components','Component design'],[2,'scenarios','Architectural drivers']],[[6,'needs','Structured capability needs']]]
 },
 6:{
  needs:['What support does each application need, and where is support still unlinked?',[[5,'technology','Application needs']],[[6,'capabilities','Supporting capabilities']]],
  capabilities:['Which technology capabilities supply that support, with what boundaries and obligations?',[[6,'needs','Application demand'],[2,'scenarios','Architectural drivers']],[[7,'plans','Realisation plans']]],
  dependencies:['What must each capability rely on, and where does trust change?',[[6,'capabilities','Capability boundaries']],[[8,'contracts','Interface obligations'],[9,'controls','Protection design']]]
 },
 7:{
  plans:['What must this implementation realise, and who owns its selection and assumptions?',[[6,'capabilities','Logical capabilities']],[[7,'compare','Product comparison']]],
  compare:['Which configured option fits the drivers, and what remains to be evidenced?',[[6,'capabilities','Capability specification'],[2,'scenarios','Architectural drivers']],[[7,'plans','Recorded selection'],[10,'placement','Runtime placement']]],
  connections:['What agreements are needed between the selected technologies?',[[7,'plans','Realisation boundaries']],[[8,'contracts','Explicit contracts']]]
 },
 8:{
  contracts:['What do both ends of this exchange promise, including data and failure behaviour?',[[5,'interactions','Application interactions'],[7,'connections','Technology obligations']],[[8,'data','Payload definitions'],[9,'threats','Boundary exposure']]],
  parties:['Who participates outside the design, and what integration agreement is needed?',[[1,'context','Actors & scope']],[[8,'contracts','Participant contracts']]],
  data:['Who is authoritative for this information, and what makes its shape and use valid?',[[8,'contracts','Contract payloads']],[[8,'lineage','Data derivations'],[9,'controls','Information protection']]],
  lineage:['How is one record derived from another, and how is the result reconciled?',[[8,'data','Owned data definitions']],[[9,'threats','Data exposure'],[10,'operate','Operating obligations']]]
 },
 9:{
  threats:['What could compromise this design, what would be harmed, and who owns the risk?',[[8,'contracts','Exchanges'],[8,'data','Information assets']],[[9,'controls','Targeted safeguards']]],
  controls:['Where does protection act, and how should it behave when unavailable?',[[9,'threats','Threat scenarios']],[[9,'assurance','Evidence & residual risk'],[10,'operate','Operating controls']]],
  assurance:['What evidence supports the control, and what residual risk still needs a decision?',[[9,'controls','Intended safeguards']],[[10,'operate','Operating obligations'],[11,'delivery','Verification actions']]]
 },
 10:{
  placement:['Where will this workload run, with what capacity and independent failure domains?',[[5,'components','Application assets'],[7,'plans','Technology choices']],[[10,'recovery','Recovery design']]],
  recovery:['How is service restored without losing state ownership or exceeding the agreed targets?',[[10,'placement','Declared placements'],[2,'scenarios','Recovery drivers']],[[10,'operate','Runbooks & exercises']]],
  operate:['Who observes, changes and recovers this workload, and what evidence will they keep?',[[9,'controls','Security obligations'],[10,'recovery','Recovery approach']],[[11,'overview','Design review'],[11,'delivery','Delivery evidence']]]
 },
 11:{
  overview:['Does the connected design carry its intent, choices and open obligations consistently?',[[3,'record','Architecture choices'],[10,'operate','Operating design']],[[11,'case','Focused assurance'],[11,'document','Design document']]],
  case:['Can this architecture case be explained and challenged through its connected evidence?',[[1,'requirement','Requirements'],[11,'overview','Chapter findings']],[[11,'delivery','Owned verification work']]],
  document:['What story should the reviewer understand about this design and its remaining limits?',[[11,'overview','Reviewed chapter context']],[[11,'','Baselines & exports','output']]],
  delivery:['Who will fulfil each implementation obligation, and what evidence will verify it?',[[11,'case','Architecture cases'],[9,'assurance','Assurance obligations']],[[11,'plateaus','Transition work']]],
  plateaus:['What changes between architecture states, and which work makes each transition possible?',[[11,'delivery','Implementation actions']],[[11,'','Implementation handoff','output']]]
 }
};
// The record kinds each stage reads (in) and produces (out), by the readers of work-records.js (rc40, PLAN §4.4.3).
// The rail's progress, the task head's state line, the feeds cards and the arrival card count these records; the
// method links above stay the navigation, these say what the project actually holds behind each of them.
export const WORK_RECORDS={
 1:{brief:{in:[],out:['brief']},context:{in:['brief'],out:['context']},journey:{in:['context'],out:['journey']},requirement:{in:['journey','context'],out:['requirement']}},
 2:{intake:{in:['requirement'],out:['driver']},scenarios:{in:['driver'],out:['scenario']},priorities:{in:['scenario'],out:['priority']},compare:{in:['priority'],out:['driver']},conflicts:{in:['driver'],out:['conflict']}},
 3:{inputs:{in:['requirement','driver'],out:['decision']},compare:{in:['decision'],out:['alternative']},record:{in:['alternative'],out:['decision']}},
 4:{responsibilities:{in:['requirement','decision'],out:['responsibility']},connections:{in:['responsibility'],out:['connection']},mappings:{in:['responsibility'],out:['mapping']},groups:{in:['context','responsibility'],out:['group']}},
 5:{components:{in:['responsibility','decision'],out:['component']},interactions:{in:['component'],out:['interaction']},technology:{in:['component','driver'],out:['need']}},
 6:{needs:{in:['need'],out:['support']},capabilities:{in:['need','driver'],out:['capability']},dependencies:{in:['capability'],out:['dependency','boundary']}},
 7:{plans:{in:['capability'],out:['realization']},compare:{in:['capability','driver'],out:['option']},connections:{in:['realization'],out:['techConnection']}},
 8:{contracts:{in:['interaction','techConnection'],out:['contract']},parties:{in:['context'],out:['party']},data:{in:['contract'],out:['data']},lineage:{in:['data'],out:['lineage']}},
 9:{threats:{in:['contract','data'],out:['threat']},controls:{in:['threat'],out:['control']},assurance:{in:['control'],out:['evidence','risk']}},
 10:{placement:{in:['component','realization'],out:['environment','zone','placement']},recovery:{in:['placement','driver'],out:['plan']},operate:{in:['control','plan'],out:['path','runtimeEvidence']}},
 11:{overview:{in:['decision','path'],out:['review']},case:{in:['requirement','review'],out:['case']},document:{in:['review'],out:['narrative','baseline']},delivery:{in:['case','evidence'],out:['action']},plateaus:{in:['action'],out:['plateau']}}
};
const checksOf=(p,chapter)=>{try{return p?chapterChecks(p,chapter):null;}catch{return null;}};
// The state of a stage's own records (what it produces), with the chapter's open checks on them.
export function workStageState(p,chapter,section){return kindsState(p,WORK_RECORDS[chapter]?.[section]?.out||[],checksOf(p,chapter));}
// Whether the chapter holds any record of its own stages (the arrival card shows while it does not).
export const chapterHasRecords=(p,chapter)=>Object.values(WORK_RECORDS[chapter]||{}).some(x=>kindsState(p,x.out).recorded>0);
// The record kinds a chapter's stages produce, once each.
export const chapterKinds=chapter=>[...new Set(Object.values(WORK_RECORDS[chapter]||{}).flatMap(x=>x.out))];
// The state of every record the chapter produces, in one word ("47 records · 5 confirmed · 2 to fix · 22 to confirm"):
// the one state line of Validate's summary, Output's hero and the Model footer (rc41, W2). Chapter 11's checks are not
// kept per record: its passages are the SDD's sections, written from its final checks (readiness-model.js
// reviewPassages), so what it holds open is its final checks to fix and to confirm (rc41 close) — never "confirmed"
// while a final check fails.
const CHECKS_BY_SECTION=new Set([11]);
export function chapterRecordsState(p,chapter){
 const checks=checksOf(p,chapter),open=checks&&CHECKS_BY_SECTION.has(Number(chapter))?{fix:checks.toFix,confirm:checks.toConfirm}:null;
 return kindsState(p,chapterKinds(chapter),checks,{noun:'record',open});
}
// One record's state in the same shape (recorded, confirmed, to fix, to confirm, state), or null when the chapter does
// not hold it: a document that reads one record (Output's component specification) carries this record's meter.
export function recordState(p,chapter,id){
 const row=chapterRecordsState(p,chapter).rows.find(r=>r.id===id);if(!row)return null;
 const passage=(checksOf(p,chapter)?.passages||[]).find(x=>x.id===id),fix=passage?.status==='fix'?1:0,confirm=passage?.status==='confirm'?1:0,confirmed=isConfirmed(row)?1:0;
 return {recorded:1,confirmed,fix,confirm,open:fix+confirm,rows:[row],state:fix?'fix':confirm?'confirm':confirmed?'confirmed':'recorded'};
}
function methodLink([chapter,section,label,tab='work'],project){
 if(!chapter)return '<span>'+esc(label)+'</span>';
 const href=scopedHref(projectURL('/?chapter='+chapter+'&tab='+tab+(section?'&section='+encodeURIComponent(section):''),project?.id));
 return '<a href="'+esc(href)+'">'+esc(label)+'</a>';
}
// One feed: the method link (the navigation the suites pin), then what the project holds behind it — the count per
// kind and the first three names — read from the records of the stage the link names.
function feedHTML(entry,project,p){
 const [chapter,section]=entry,link=methodLink(entry,project),kinds=chapter&&section?WORK_RECORDS[chapter]?.[section]?.out:null;
 if(!p||!kinds?.length)return '<li class="work-feed">'+link+'</li>';
 const st=kindsState(p,kinds);
 const names=st.names.map(n=>'<span class="work-feed-name">'+esc(n.ref&&n.title&&n.title!==n.ref?n.ref+' · '+n.title:n.title||n.ref)+'</span>').join('')+(st.recorded>3?'<span class="work-feed-name work-feed-more">+'+(st.recorded-3)+' more</span>':'');
 return '<li class="work-feed" data-work-feed="'+chapter+':'+esc(section)+'" data-work-feed-count="'+st.recorded+'">'+link+'<span class="work-feed-count">'+esc(st.parts.join(' · '))+'</span>'+(st.recorded?'<span class="work-feed-names">'+names+'</span>':'<span class="work-feed-names work-feed-empty">Nothing recorded there yet</span>')+'</li>';
}
function handoffCardsHTML(chapter,from,into,project,p){
 const feeds=(entries,cls,label,word)=>'<div class="'+cls+'"><span>'+label+'</span><ul class="work-feeds" aria-label="'+word+'">'+entries.map(x=>feedHTML(x,project,p)).join('')+'</ul></div>';
 return '<nav class="work-connections" data-chapter-accent="'+chapter+'" aria-label="Method inputs and handoffs">'+feeds(from,'work-method-input','From earlier chapters','What this task reads')+feeds(into,'work-method-output','Into later chapters','What this task feeds')+'</nav>';
}
function connectedWorkHTML(chapter,section,project,p){
 const method=WORK_METHOD[chapter]?.[section];if(!method)return '';
 return handoffCardsHTML(chapter,method[1],method[2],project,p);
}
// The chapter's handoff cards for Validate and Output (rc41, W2): what the chapter as a whole reads from earlier
// chapters and feeds into later ones — the method entries of all its stages, each destination once, the stage-to-stage
// links inside the chapter left out — with the records the project holds behind each, as Work's feeds say them.
export function chapterHandoffHTML(chapter,project,p){
 const method=WORK_METHOD[chapter];if(!method)return '';
 const once=entries=>{const seen=new Set();return entries.filter(([c,s,,tab])=>{const key=(c||'')+':'+(s||'')+':'+(tab||'');if(seen.has(key))return false;seen.add(key);return true;});};
 const from=once(Object.values(method).flatMap(m=>m[1]).filter(([c])=>!c||c<chapter)),into=once(Object.values(method).flatMap(m=>m[2]).filter(([c,,,tab])=>c>chapter||(c===chapter&&tab&&tab!=='work')));
 return handoffCardsHTML(chapter,from,into,project,p);
}
// The arrival card (PLAN §4.4.7): while the chapter holds no record, what it produces, what it needs from earlier
// chapters with their counts, and the one action that starts it — the task's primary action, else the readiness
// model's next task. It is gone once a record exists.
function arrivalHTML(p,chapter,section,actions,project){
 if(!p||chapterHasRecords(p,chapter))return '';
 const produces=[...new Set(Object.values(WORK_RECORDS[chapter]||{}).flatMap(x=>x.out))].map(k=>kindWord(k,2).replace(/^2 /,'')).join(', ');
 const needs=(WORK_RECORDS[chapter]?.[section]?.in||[]).map(k=>{const st=kindsState(p,[k]),kind=kindWord(k,st.recorded),{chapter:c,section:s}=kindHome(k);return '<li>'+(c?'<a href="'+esc(scopedHref(projectURL('/?chapter='+c+'&tab=work&section='+encodeURIComponent(s),project?.id)))+'">'+esc(kind)+'</a>':esc(kind))+(st.recorded?' · '+esc(st.names.map(n=>n.ref||n.title).join(', ')):' · record them first')+'</li>';}).join('');
 const primary=/<button[^>]*class="[^"]*\bprimary\b[^"]*"[^>]*>([\s\S]*?)<\/button>/.exec(actions||''),primaryText=primary?primary[1].replace(/<[^>]+>/g,'').trim():'';
 const next=checksOf(p,chapter)?.next;
 const action=primaryText?'<button type="button" class="btn primary" data-work-arrival="primary">'+esc(primaryText)+'</button>':next?.url?'<a class="btn primary" href="'+esc(next.url)+'">'+esc(next.text)+'</a>':'';
 return '<section class="work-arrival" aria-label="Start this chapter"><div class="work-arrival-copy"><span class="eyebrow">Nothing recorded in this chapter yet</span><h3>Start here</h3><p>This chapter produces '+esc(produces)+'.</p>'+(needs?'<p class="work-arrival-needs">It reads</p><ul>'+needs+'</ul>':'')+'</div><div class="work-arrival-action">'+action+(next?.text&&primaryText&&next.text!==primaryText?'<small>Next by the checks: '+(next.url?'<a href="'+esc(next.url)+'">'+esc(next.text)+'</a>':esc(next.text))+'</small>':'')+'</div></section>';
}
function kindHome(kind){for(const [c,sections] of Object.entries(WORK_RECORDS))for(const [s,x] of Object.entries(sections))if(x.out.includes(kind))return {chapter:Number(c),section:s};return {chapter:null,section:null};}
// Compact, bounded context from native records. The caller supplies only records
// it actually links; the fallback opens the held record's existing context view.
export function workTraceHTML(groups){
 const link=r=>'<a data-work-record="'+esc(r.id)+'" href="'+esc(scopedHref(projectURL('/?chapter='+r.chapter+'&tab='+(r.tab||'work')+(r.section?'&section='+encodeURIComponent(r.section):'')+'&object='+encodeURIComponent(r.id))))+'">'+esc((r.ref||r.id)+(r.title?' · '+r.title:''))+'</a>';
 return '<dl class="work-record-trace">'+groups.map(g=>{const rows=[...new Map((g.records||[]).filter(Boolean).map(r=>[r.chapter+':'+r.id,r])).values()],more=rows.length>3;return '<div><dt>'+esc(g.label)+'</dt><dd>'+ (rows.length?rows.slice(0,3).map(link).join(''):'<span class="work-trace-empty">'+esc(g.empty||'No link recorded')+'</span>')+(more?'<a class="work-trace-more" href="'+esc(scopedHref(projectURL(g.more||'/?chapter='+rows[0].chapter+'&tab=work'+(rows[0].section?'&section='+encodeURIComponent(rows[0].section):''))))+'">'+(rows.length-3)+' more · Open context</a>':'')+'</dd></div>';}).join('')+'</dl>';
}
// The saved document the frame counts from: the caller's project when it is the document, else the shell's store.
const documentOf=project=>(project&&(project.artefacts||project.brief))?project:(typeof window!=='undefined'?window.aiwProjectStore?.value?.document:null)||null;
// Chapter adapters retain their native editors, selection, scope and commands.
// One working surface brings the task and its surrounding architecture together.
// The head's state line speaks of the stage: its own records ("5 components · 5 to confirm"), or, while the stage holds
// none, which stage is empty and what the chapter holds elsewhere ("Nothing recorded in Brief yet · 1,400 records in
// this chapter") — rc41 W2, from the scale walk: "Nothing recorded yet" on an empty stage read as an empty chapter.
export function emptyStageLine(p,chapter,stage){
 let chapterState=null;try{chapterState=chapterRecordsState(p,chapter);}catch{chapterState=null;}
 return 'Nothing recorded in '+stage+' yet'+(chapterState?.recorded?' · '+chapterState.parts[0]+' in this chapter':'');
}
function stageLine(p,chapter,section,sections,title,state){
 if(!state||state.recorded)return state;
 return {...state,line:emptyStageLine(p,chapter,(sections.find(([id])=>id===section)||[])[1]||title||section)};
}
export function workFrameHTML({chapter,section,sections=[],title='',description='',actions='',context='',body='',footer='',project=null}){
 if(!validWorkSection(chapter,section))throw new Error('Unknown Work section for chapter '+chapter+': '+section);
 const question=WORK_METHOD[chapter]?.[section]?.[0],p=documentOf(project),state=p?stageLine(p,chapter,section,sections,title,workStageState(p,chapter,section)):null;
 return '<section class="work-view" data-work-chapter="'+chapter+'" data-chapter-accent="'+chapter+'" data-work-section="'+esc(section)+'"'+(state?' data-work-state="'+esc(state.state)+'"':'')+'>'+
  '<div class="work-desk">'+workStagesHTML(sections,section,sectionAttributes[chapter],sectionActions[chapter],chapter,p)+
  '<header class="work-task-head"><div><h2>'+esc(title)+'</h2>'+(question||description?'<p class="work-task-question">'+esc(question||description)+'</p>':'')+chapterStateHTML(state,{chapter,cls:'work-task-state',attrs:state?'data-work-task-state="'+esc(state.state)+'"':''})+'</div>'+
  (actions?'<div class="work-task-actions">'+actions+'</div>':'')+'</header>'+
  '<div class="work-context">'+(context?'<div class="work-context-controls">'+context+'</div>':'')+connectedWorkHTML(chapter,section,project,p)+'</div>'+
  arrivalHTML(p,chapter,section,actions,project)+
  '<div class="work-body">'+body+'</div>'+(footer?'<footer class="work-support">'+footer+'</footer>':'')+'</div></section>';
}
// The journey rail: the chapter strip (chapter-strip.js) with the numbered stages as its items, each a button the
// chapter's own handler reads, with a progress mark beside it — what that stage's records are: recorded, confirmed, to
// fix or to confirm — read from the document. The button's text is the stage's name alone (its accessible name); the
// counts are its description. The suites' selectors stay: nav.work-stages, .work-stage[data-work-stage]
// [data-work-stage-state][data-work-current], .work-stages button[data-work-step][data-work-purpose], .work-stage-count.
export function workStagesHTML(items,active,attribute,action,chapter,p=null){
 const stages=items.map(([id,title],i)=>{
  const purpose=PURPOSES[chapter]?.[i]||title,st=p?workStageState(p,chapter,id):null,reading=stripReading(st,'start here');
  return {id,title,purpose,...reading,current:id===active,cls:'work-stage',countCls:'work-stage-count',
   itemAttrs:'data-work-stage="'+esc(id)+'"'+(st?' data-work-stage-state="'+esc(st.state)+'"':'')+(id===active?' data-work-current="true"':''),
   attrs:attribute+'="'+esc(id)+'"'+(action?' '+action[0]+'="'+action[1]+'"':''),tail:'data-work-step="'+(i+1)+'" data-work-purpose="'+esc(purpose)+'"'};
 });
 return chapterStripHTML({tab:'work',chapter,label:'Work sections',items:stages,cls:'work-stages',attrs:'data-chapter-strip-numbered',currentValue:'step'});
}
// The register's keyboard model and the inline open (PLAN §4.4.5), installed once for every chapter: j/k move between
// rows, Enter holds the focused row's record through its own control, o or Space opens the row in place; a click on a
// row's blank area opens it; ← → Home End along the rail are the chapter strip's (chapter-strip.js). Nothing here
// writes a record.
const ROWS='.work-body [data-work-record-row],.work-body [data-work-source],.work-body [data-work-need],.work-body .r-record,.work-body .q-driver-row,.work-body .t-cap-card,.work-body .rv-chapter-list>article,.work-body .rt-placement-list>article,.work-body .sec-safeguard-list>article';
const HOLD='.l-record-title,[data-select],[data-q-select],[data-r-details],.r-record-main,summary,[data-work-record]';
const INTERACTIVE='a,button,input,select,textarea,label,summary,details,[contenteditable],[tabindex]';
const rowsOf=view=>[...new Set([...view.querySelectorAll(ROWS)])].filter(r=>!r.closest('dialog'));
const rowOf=el=>{const rows=rowsOf(el.closest('.work-view')||document);return rows.find(r=>r===el||r.contains(el))||null;};
function focusRow(row){if(!row)return;if(!row.hasAttribute('tabindex'))row.setAttribute('tabindex','-1');row.focus({preventScroll:true});row.scrollIntoView?.({block:'nearest'});}
function toggleRow(row,open){if(!row)return;const next=open??!row.hasAttribute('data-work-open');if(next)row.setAttribute('data-work-open','');else row.removeAttribute('data-work-open');}
function onKey(e){
 if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;
 const t=e.target;if(!(t instanceof Element)||t.closest('input,textarea,select,[contenteditable],dialog'))return;
 const view=t.closest('.work-view');if(!view)return;
 if(e.key==='j'||e.key==='k'){
  if(t.closest('button,a,summary')&&!t.closest('.work-body'))return;
  const rows=rowsOf(view);if(!rows.length)return;
  const current=rowOf(t),i=current?rows.indexOf(current):-1;
  e.preventDefault();focusRow(rows[Math.min(rows.length-1,Math.max(0,i+(e.key==='j'?1:-1)))]);return;
 }
 const row=rowOf(t);if(!row||t!==row)return;
 if(e.key==='Enter'){const hold=row.querySelector(HOLD);if(hold){e.preventDefault();toggleRow(row,true);hold.click();}}
 else if(e.key==='o'||e.key===' '){e.preventDefault();toggleRow(row);}
}
function onClick(e){
 const t=e.target;if(!(t instanceof Element))return;
 const arrival=t.closest('[data-work-arrival="primary"]');
 if(arrival){const primary=arrival.closest('.work-view')?.querySelector('.work-task-actions .primary');if(primary){e.preventDefault();primary.focus();primary.click();}return;}
 const row=rowOf(t);if(!row||!row.closest('.work-body'))return;
 if(t.closest(INTERACTIVE)){if(t.closest(HOLD))toggleRow(row,true);return;}
 toggleRow(row);
}
if(typeof document!=='undefined'&&!globalThis.__aiwWorkFrameKeys){globalThis.__aiwWorkFrameKeys=true;document.addEventListener('keydown',onKey);document.addEventListener('click',onClick);}
