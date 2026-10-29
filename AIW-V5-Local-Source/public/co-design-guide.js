// This guide projects the saved context. It prepares editable questions for the
// existing intelligence flow; it never calls a provider or changes the model.
import {esc} from './html-escape.js';
import {projectURL} from './project-context.js';
import {CHAPTER_TITLES} from './chapter-names.js';
import {isQualityDriver} from './quality-domain.js';
import {intelligenceActionHTML,intelligenceWhyHTML} from './chapter-insight.js';

const list=x=>Array.isArray(x)?x:[];
const text=(x,max=160)=>String(x||'').trim().slice(0,max);
const CHAPTERS={
  1:['What must the solution do, for whom and within which limits?','A precise need gives every later component and test a reason to exist.','Separate required behavior, constraints and assumptions; make acceptance observable.'],
  2:['Which quality scenarios and constraints shape the design?','A quality label alone cannot distinguish alternatives or establish a test target.','Connect stimulus, conditions and response to a measurable boundary; keep unagreed targets open.'],
  3:['Which alternative fits the recorded requirements, and why?','The decision must explain the rejected or deferred options as well as the choice.','Check fixed constraints before comparing quality effects, costs and assumptions.'],
  4:['Which responsibilities belong together, and how do they collaborate?','Clear ownership and boundaries reveal coupling before implementation choices hide it.','Trace behavior to responsibilities and interactions; compare reasons to join or separate them.'],
  5:['Which application components realize those responsibilities?','A component name is useful only when its owned behavior, state and contracts are clear.','Name ownership and interfaces; co-location alone does not establish a transaction boundary.'],
  6:['Which technology capabilities does the application need?','Capabilities state the required mechanism before a product constrains the answer.','Describe required storage, messaging, execution or integration semantics before choosing vendors.'],
  7:['Which named product and configuration could supply the capability?','Version, tier, topology and operating model can change the fit and obligations.','Compare recorded product options against actual scenarios; expose configuration, source and operating assumptions.'],
  8:['What crosses each interface, and who owns data and consistency?','Failures and concurrent actions expose ambiguities that a payload diagram can hide.','Define identity, state transitions, ordering, error outcomes and authoritative ownership.'],
  9:['What can go wrong, and which controls address that threat?','A control needs a specific protected asset, actor, boundary and verification method.','Trace threats to controls and residual risk; distinguish a proposed control from tested protection.'],
  10:['How does the design run, fail and recover?','Deployment and failure boundaries determine whether proposed mechanisms can operate.','Connect topology, state, capacity, observability and recovery; do not infer achieved targets.'],
  11:['Which claims are ready for review, and which still need evidence?','A focused case finding does not establish whole-project SDD readiness or approval.','Trace the selected scope to connected objects, decisions and evidence; separate proposed tests from observations.']
};
const subject=c=>text(c?.selected?.ref||c?.selected?.id);
const named=rows=>list(rows).slice(0,3).map(r=>text(r.ref||r.id)+' · '+text(r.title||r.question||r.record?.title||r.record?.question,100)).join('; ');
const selected=c=>!!c?.selected?.id&&c.selected.id!=='project';
const projectId=c=>c?.basis?.projectId||'';
const quality=c=>list(c?.drivers).filter(d=>isQualityDriver(d.record||d));
const route=(c,chapter,tab='work',object=c.selected?.id)=>projectURL('/?'+new URLSearchParams({chapter:String(chapter),tab,...(object&&object!=='project'?{object}: {})}),projectId(c));

function gaps(c){
  const open=list(c.missing).filter(x=>!['Link a measurable quality scenario.','Confirm the quality targets that are still assumptions.'].includes(x));
  if(selected(c)&&!quality(c).length)open.push('Link a measurable quality scenario.');
  else if(quality(c).some(d=>d.record?.targetConfirmed!==true))open.push('Confirm the quality targets that are still assumptions.');
  if(selected(c)&&!list(c.sources).length&&!list(c.governed?.claims).length)open.push('No relevant released claim or linked project source is shown here. Inspect source eligibility before relying on technical claims.');
  if(Number(c.chapter)===11)open.push('Case review, whole-project readiness and human approval are separate checks.');
  return [...new Set([...(c.intelligence?.questions?.length?c.intelligence.questions.map(q=>q.question):list(c.intelligence?.insights).filter(i=>['question','needs-context','stale','pending'].includes(i.state)).map(i=>i.question||i.title)),...open])].slice(0,4);
}
function nextSteps(c){
  const chapter=Number(c.chapter),home=Number(c.selected?.chapter)||chapter;
  const insight=c.intelligence?.primary,action=insight?.actions?.[0];
  if(selected(c)&&action)return [{label:action.label||action.title,why:insight.question||insight.title,reading:c.intelligence,insight,action}];
  if(!selected(c))return chapter===1?[{label:'Select or capture a saved record',why:'Then the guide and Sol can work on its actual connections.',href:route(c,1)}]:[{label:'Select a saved record in this chapter',why:'The guide and Sol need a record to work on its actual connections.',href:route(c,chapter)},{label:'Capture a requirement in Chapter 1',why:'For a new design, begin with the need the later chapters will develop.',href:route(c,1)}];
  const steps=[];
  if(!list(c.requirements).length)steps.push({label:'Connect the source requirement',why:'Keep the selected object in view while recording what it must satisfy.',href:route(c,home)});
  if(!quality(c).length||quality(c).some(d=>d.record?.targetConfirmed!==true))steps.push({label:'Review the quality scenario',why:'Resolve the stimulus and response boundary; leave an unagreed target explicitly open.',href:route(c,2,'work',quality(c)[0]?.id||c.selected.id)});
  if(list(c.decisions).length){const d=c.decisions.find(d=>!d.record?.rationale||!d.record?.selectedAlternativeId);if(d)steps.push({label:'Develop the alternative comparison',why:'Keep each option unselected until the architect records a reasoned choice.',href:route(c,3,'work',d.id)});}
  else if(chapter>2)steps.push({label:'Record the design question and alternatives',why:'Connect the reasoning to this object and its requirements.',href:route(c,3)});
  if(steps.length<3)steps.push({label:'Inspect this record’s checks',why:'Use Validate to distinguish a missing record from missing verification evidence.',href:route(c,home,'validate')});
  return steps.slice(0,3);
}
const INTENTS=[['understand','Teach me this step','design'],['compare','Explore alternatives','mind'],['verify','Design a useful check','design'],['next','Help with the next step','design']];
function question(c,intent){
  const chapter=Number(c.chapter),entry=CHAPTERS[chapter],record=c.selected;
  const focus=`Work with ${text(subject(c),90)} (${text(record.title,110)}) in Chapter ${chapter}, ${CHAPTER_TITLES[chapter]}. ${entry[2]}`;
  const context=[list(c.requirements).length?'Linked requirements: '+list(c.requirements).slice(0,5).map(r=>r.id).join(', '):'No linked requirement is shown in this context.',quality(c).length?'Recorded quality scenarios: '+quality(c).slice(0,5).map(r=>r.id).join(', '):'A quality scenario is not yet linked.',list(c.constraints).length?'Preserve recorded constraints: '+list(c.constraints).slice(0,5).map(r=>r.id).join(', '):'',gaps(c).length?'Open context checks: '+gaps(c).slice(0,2).join(' '):''].filter(Boolean).join(' ');
  const task={understand:'Teach the architectural idea in plain language, then explain how it applies to this record. Show one causal chain from a mechanism through its quality effect, conditions and cost. Distinguish recorded facts, conditional suggestions and missing evidence. End with at most one useful question about a genuinely missing fact.',compare:'Develop up to three materially different unselected alternatives for this context, including a simpler viable approach where possible. First test each against the fixed constraints. Explain concrete mechanisms, quality effects, conditions, obligations and verification. Preserve the earlier proposals; distinguish a refinement from a new option. Ask only for facts needed to compare them.',verify:'Propose a concrete, falsifiable check for this record’s most consequential claim. State setup, actions, concurrency or failure injection, observable authoritative state, and pass/fail invariant. Target the actual failure boundary. This is a proposed test, not an executed observation. Keep timing acceptance pending when no target is agreed.',next:'Identify the most consequential open design question in this context and explain why it comes next. Help develop one concrete candidate answer or method using current evidence, instead of returning only an authoring checklist. Name what the architect must decide and the existing chapter where it belongs. Ask at most one question for a fact genuinely needed to proceed.'}[intent];
  // Bound source-derived labels/checks before the fixed instructions so long
  // project text cannot cut away the task or the requirement/authority boundary.
  const insight=c.intelligence?.primary,knowledge=insight?`Shared design question (${insight.id}): ${text(insight.question||insight.title,260)}. Sources to inspect: ${list(insight.sourceRefs).slice(0,3).join(', ')}. `:'';
  return [focus,task,text(knowledge+context,600),'Use the existing scoped sources and expose their authority and uncertainty. Preserve fixed requirements; a new proposal never changes them or records approval.'].join('\n\n');
}

export function coDesignGuideHTML(c){
  const chapter=Number(c?.chapter),entry=CHAPTERS[chapter];if(!entry||!projectId(c))return '';
  const open=gaps(c),steps=nextSteps(c),claims=list(c.governed?.claims).length;
  const recorded=selected(c)?[
    `Selected: ${subject(c)} · ${text(c.selected.title,180)}. Status shown by the model: ${text(c.status)||'not recorded'}.`,
    `Linked requirements: ${list(c.requirements).length}${c.requirements?.length?' — '+named(c.requirements):''}.`,
    `Architectural drivers: ${list(c.drivers).length}. Quality scenarios: ${quality(c).length}${quality(c).length?' — '+named(quality(c)):''}.`,
    `Constraints recorded in this project: ${list(c.constraints).length}. Connected decisions: ${list(c.decisions).length}.`,
    `Linked project sources: ${list(c.sources).length}. Relevant released claims in this reading: ${claims}. Recorded links and counts do not establish verification.`
  ]:[];
  const prompts=selected(c)?`<div class="co-design-prompts" role="group" aria-label="Develop this context with Sol">${INTENTS.map(([intent,label])=>`<button type="button" class="btn" data-co-design-intent="${intent}">${label}</button>`).join('')}</div><p class="co-design-note">These actions prepare an editable question. Review its source packet before sending. Existing proposals, selections and approvals remain unchanged.</p>`:'';
  return `<section class="co-design-guide" data-co-design-guide data-guide-project="${esc(projectId(c))}" data-guide-chapter="${chapter}" data-guide-object="${esc(c.selected?.id||'project')}" aria-label="Co-design guide"><p class="brain-eyebrow">Co-design guide · Chapter ${chapter}</p><div class="co-design-intent"><h3>${esc(entry[0])}</h3><p>${esc(entry[1])}</p></div><p class="co-design-note">${c.intelligence?'Guidance from the saved model and supplied architecture knowledge':'Chapter guidance from the saved model and explicit rules'}; no LLM has been consulted for this guide.</p>${prompts}${recorded.length?`<details class="co-design-recorded"><summary>What is recorded for ${esc(subject(c))}</summary><ul>${recorded.map(v=>'<li>'+esc(v)+'</li>').join('')}</ul><a href="${esc(route(c,Number(c.selected.chapter)||chapter))}">Open this saved record</a></details>`:'<p class="co-design-open">Select a saved record, or capture a requirement in Chapter 1 Work. Sol needs that context before answering a design question.</p>'}${selected(c)&&open.length?`<details class="co-design-open"><summary>Open context checks · ${open.length}</summary><ul>${open.map(v=>'<li>'+esc(v)+'</li>').join('')}</ul></details>`:''}<div class="co-design-next"><h4>Where to go next</h4><ol>${steps.map(s=>`<li${s.insight?` data-intelligence-id="${esc(s.insight.id)}"`:''}>${s.action?intelligenceActionHTML(s.reading,s.insight,s.action,{projectId:projectId(c),className:'chapter-open-link'}):`<a href="${esc(s.href)}">${esc(s.label)}</a>`}<p>${esc(s.why)}</p>${s.insight?`<details><summary>Why this comes next</summary>${intelligenceWhyHTML(s.reading,s.insight,{projectId:projectId(c)})}</details>`:''}</li>`).join('')}</ol></div></section>`;
}

export function mountCoDesignGuide(panel,c){
  const guide=panel?.querySelector?.('[data-co-design-guide]');if(!guide)return;
  guide.__coDesignContext=c;
  if(guide.dataset.guideMounted)return;guide.dataset.guideMounted='true';
  guide.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-co-design-intent]');if(!button||!guide.contains(button))return;
    const current=guide.__coDesignContext,intent=INTENTS.find(([id])=>id===button.dataset.coDesignIntent);
    if(!intent||!selected(current)||!CHAPTERS[Number(current.chapter)]||guide.dataset.guideProject!==projectId(current)||guide.dataset.guideObject!==current.selected.id||guide.dataset.guideChapter!==String(current.chapter))return;
    e.preventDefault();
    const EventClass=guide.ownerDocument?.defaultView?.CustomEvent||CustomEvent;
    guide.dispatchEvent(new EventClass('aiw:co-design-prompt',{bubbles:true,detail:{projectId:projectId(current),chapter:Number(current.chapter),objectId:current.selected.id,mode:intent[2],intent:intent[0],prompt:question(current,intent[0]),source:'co-design-guide'}}));
  });
}
