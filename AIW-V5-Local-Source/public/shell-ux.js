// Behaviours of the one workspace shell (app.js) and its chapter studios (audit round 2, U2-06, U2-14, U2-17,
// U2-24, U2-28, U2-30, U2-34): the milestone re-check memory and the readiness words, revealing a saved record,
// the scoped change notice, the tab-bar keyboard contract, the phone navigation drawer, the offline watch, the
// glossary and the guidance footer. Presentation only: nothing here writes to the project. Retired with the
// second shell (round 3, A): the chapter link that carried the tab across shells, the prefetch of the other shell,
// the Chapter 1–3 readiness widget and the chapter name tables only those shells used (the shell's CHAPTER table
// in app.js names the chapters).
import {projectURL,projectPreferenceKey} from './project-context.js';
import {chapterRecordSet} from './chapter-records.js';
import {plural} from './util.js';
import {changeCauses,latestChange} from './changes-domain.js';
import {esc} from './html-escape.js';
import {sddContributionHTML,showMorePassages} from './readiness-model.js';
import {currentProject} from './project-context.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES} from './chapter-names.js';
import {updateSaveState} from './dialog.js';
import {chapterSurfacePurpose} from './chapter-surfaces.js';

// A chapter's passages in the SDD (readiness-model.js sddContributionHTML) are drawn a page at a time on Validate and
// Output (round 5, R5-G): "Show more" draws the next page in place, keeps the count for the chapter, and moves focus to
// the first passage it added. The redrawn part says so (aiw:sdd-part), so Validate can compact it again.
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('click',e=>{
  const b=e.target?.closest?.('[data-sdd-more]');if(!b||e.defaultPrevented)return;
  const part=b.closest('.sdd-part'),p=currentProject(),chapter=Number(b.dataset.sddMore),where=b.dataset.sddWhere||'output';if(!part||!p)return;
  e.preventDefault();
  const from=part.querySelectorAll('tbody tr').length;showMorePassages(where,chapter);
  const t=document.createElement('template');t.innerHTML=sddContributionHTML(p,chapter,{where});const next=t.content.firstElementChild;if(!next)return;
  part.replaceWith(next);next.dispatchEvent(new CustomEvent('aiw:sdd-part',{bubbles:true}));
  next.querySelectorAll('tbody tr')[from]?.querySelector('a')?.focus();
});

// Milestones a chapter met on an earlier saved state and no longer meets are "to re-check" rather than
// silently lost (U2-06). The count of met milestones is the saved project's; the memory is this browser's.
export function milestoneRecheck(chapter,milestones){
  const key=projectPreferenceKey('aiw-milestones-met:'+chapter);let seen=[];
  try{const raw=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(raw))seen=raw.filter(id=>typeof id==='string');}catch{/* no memory in this browser */}
  const met=milestones.filter(m=>m.done).map(m=>m.id),ids=new Set(milestones.map(m=>m.id));
  const recheck=milestones.filter(m=>!m.done&&seen.includes(m.id));
  const next=[...new Set([...seen.filter(id=>ids.has(id)),...met])];
  try{if(next.join()!==seen.join())localStorage.setItem(key,JSON.stringify(next));}catch{/* the memory is optional */}
  return {met:milestones.filter(m=>m.done),recheck};
}
// The words beside the percentage: met, to re-check, and the illustrative note only when illustrative
// records exist (U2-05, U2-06).
export function readinessWords(milestones,{recheck=[],illustrative=false}={}){
  const met=milestones.filter(m=>m.done).length;
  if(!milestones.length)return 'No milestones for this chapter';
  return `${met} of ${milestones.length} milestones met${recheck.length?', '+recheck.length+' to re-check':''}${illustrative?' · includes illustrative records':''}`;
}
// The readiness headline (U2-06, U2-29): the count of milestones met. Nothing here counts a milestone as met that the
// saved project does not meet.
export function readinessHead(milestones){return `${milestones.filter(m=>m.done).length} of ${milestones.length}`;}
export function hasIllustrativeRecords(p){
  if(!p)return false;
  if(p.workspace?.template&&p.workspace.template!=='blank')return true;
  const lists=[p.artefacts,p.quality?.drivers,p.decisions?.records,p.logical?.responsibilities,p.realisation?.components,p.technology?.capabilities,p.interfaces?.contracts,p.security?.controls,p.runtime?.placements];
  return lists.some(list=>Array.isArray(list)&&list.some(r=>r?.origin==='reference'));
}

// The record the person just saved is brought into view and lit for a moment (U2-14).
export function revealRecord(el,{focus=false}={}){
  if(!el||typeof el.scrollIntoView!=='function')return false;
  el.scrollIntoView({block:'center',behavior:'auto'});
  el.classList.add('ux-just-saved');setTimeout(()=>el.classList.remove('ux-just-saved'),6000);
  if(focus){const target=el.matches('button,a,[tabindex]')?el:el.querySelector('button,a,[tabindex]');target?.focus({preventScroll:true});}
  return true;
}

// The change notice is shown on the chapters that hold affected records, on the chapter the change came
// from and on Chapter 11; elsewhere the Changes badge in the project card is enough (U2-17). Hiding it with
// its × stays remembered for that change (changes-ui.js).
export function scopeChangeNotice(p,chapter){
  const notice=document.querySelector('.cr-notice');if(!notice||!p)return;
  const here=Number(chapter);let relevant=true;
  try{
    // The changes still to review (round 12: read from the journal's index of latest changes, not by searching it per change).
    const open=changeCauses(p);
    relevant=here===11||!open.length||open.some(c=>Number(c.source.chapter)===here||(latestChange(p,c.source)?.items||[]).some(i=>Number(i.chapter)===here));
  }catch{relevant=true;}
  notice.hidden=!relevant;
}

// Tabs are a tablist: Left/Right and Home/End move between them, Enter or Space opens (U2-30). The nav
// keeps its data attributes, so the shells' own click handlers still choose the tab.
export function tablist(nav,{selector='[role="tab"]'}={}){
  if(!nav||nav.dataset.uxTablist)return;nav.dataset.uxTablist='1';
  nav.addEventListener('keydown',ev=>{
    const tabs=[...nav.querySelectorAll(selector)],i=tabs.indexOf(document.activeElement);if(i<0||!tabs.length)return;
    const go=j=>{ev.preventDefault();tabs[(j+tabs.length)%tabs.length].focus();};
    if(ev.key==='ArrowRight'||ev.key==='ArrowDown')go(i+1);else if(ev.key==='ArrowLeft'||ev.key==='ArrowUp')go(i-1);else if(ev.key==='Home')go(0);else if(ev.key==='End')go(tabs.length-1);
  });
}

// The phone chapter menu is a dialog: it is announced, focus enters it and stays in it, and closing it (its
// close control, or Escape, which workspace-ux.js routes to that control) returns focus to the button that opens
// it (U2-24). The shells redraw the sidebar on every render, so they say whether it was open before.
export function navigationDrawer(sidebar,{open,wasOpen=false,opener,label='Chapter navigation'}){
  if(!sidebar)return;
  if(open){
    sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');sidebar.setAttribute('aria-label',label);
    if(!sidebar.dataset.uxDrawer){sidebar.dataset.uxDrawer='1';sidebar.addEventListener('keydown',ev=>{
      if(ev.key!=='Tab'||sidebar.getAttribute('role')!=='dialog')return;
      const els=[...sidebar.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(e=>e.getClientRects().length);
      if(!els.length)return;const first=els[0],last=els.at(-1);
      if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
    });}
    if(!wasOpen||!sidebar.contains(document.activeElement)){const first=sidebar.querySelector('.rail-close')||sidebar.querySelector('a,button');if(first&&first.getClientRects?.().length)first.focus({preventScroll:true});}
  }else{
    sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');
    if(wasOpen&&opener?.isConnected&&opener.getClientRects?.().length)opener.focus({preventScroll:true});
  }
}

// When a save cannot reach the server the header says so, a retry is offered, and the page watches for the
// server's return and announces it (U2-34).
let reconnectTimer=null,offline=false;
export function isOffline(){return offline;}
export function markConnection(state,{status,announce}={}){
  const label=status||document.querySelector('.save-state');
  offline=state==='offline';
  document.body.classList.toggle('ux-offline',offline);
  if(label){label.setAttribute('role','status');label.setAttribute('aria-live','polite');if(offline)updateSaveState('Offline · changes are not saved',label);else if((label.getAttribute('aria-label')||label.textContent).startsWith('Offline'))updateSaveState('Connected again · try saving again',label);}
  if(offline){
    clearInterval(reconnectTimer);
    reconnectTimer=setInterval(async()=>{try{const r=await fetch(projectURL('/api/intelligence/status'),{credentials:'same-origin',cache:'no-store'});if(r.ok||r.status<500){clearInterval(reconnectTimer);markConnection('online',{status:label});announce?.('Connected again. Try saving again.');}}catch{/* still offline */}},5000);
  }else clearInterval(reconnectTimer);
}
export const looksOffline=error=>!!error&&(error.network===true||error.name==='TypeError'||/could not reach|offline/i.test(error.message||''));

// Words used across the chapters, in one place so the About dialog can show them (U2-28).
const GLOSSARY=[
  ['Sol','Output from a language model, and only that: each answer names its run, the model and the pinned prompt, is checked against the project sources it cites, and is a proposal you review. When no model is connected, Sol says so and drafts nothing.'],
  ['From your project','Guidance worked out by the workbench\'s own rules from your saved records. It names the rule it applied; no language model is involved.'],
  ['Chapter tools','The chapter\'s own actions on the selected record: edit, link, check and carry it forward. They change the project only when you save.'],
  ['Co-design','A guide to the current chapter and selected object: understand the architectural step, explore alternatives, plan verification and develop the next design move with Sol. Existing proposals and saved answers remain under Drafts and suggestions; knowledge and chapter tools remain available. Guide actions prepare editable questions. Model changes still go through their own preview and review.'],
  ['Hover help','A short explanation of an object when you hover over it or focus it. Select the object to pin its details. This uses the workbench\'s recorded descriptions; it does not ask an LLM to explain the design.'],
  ['Details panel','The panel beside the workspace that shows the selected object, what links to it ("Linked from") and its history. Called the object lens in older notes.'],
  ['Linked from','The records in other chapters that refer to the selected object. Older notes call them backlinks.'],
  ['Draft suggestion','An editable proposal shown on the model before anything is saved. Older notes call it a ghost. It becomes a record only when you review and save it.'],
  ['Model layers','Which kinds of objects the models show: process, logical, physical and so on. Hiding a layer changes the view, not the project.'],
  ['Milestones','The chapter\'s checks, worked out from the saved project. The percentage counts milestones met; it is not an approval. "To re-check" marks milestones that were met on an earlier saved state and need another look after an edit.'],
  ['Findings','What the rule-based checks found: content gaps (something missing or broken) and review items (something to look at). Findings do not grant or withhold approval.'],
  ['Handoff','Carrying a chapter\'s records forward so the next chapter reads them. It records that the revision was reviewed; it is not governance approval.'],
  ['SDD','The solution design document: the connected design read as one document, which Chapter 11 can freeze as a baseline.'],
  ['ADR','An architecture decision record: a design question, the alternatives compared, the choice and its reasons.'],
  ['Trace and failure lab','Teaching simulations below a chapter\'s model. Recording what you traced is a milestone; nothing is executed.'],
  ['Review desk','Chapter 11\'s reading of the design as running parts: Vitals (recorded values against targets), What it takes (an objective turned into a specification for every part) and Trace (each requirement followed to where it runs).'],
  ['Anatomy','On Validate, the whole design as one body built chapter by chapter, with rule-based findings on the parts they concern.'],
  ['Anti-pattern','A known shape of design that tends to fail, named as the pattern catalogue names it; a prompt to review, not a verdict.'],
  ['Stewards','The people who decide what the project learns when an architect disagrees with Sol\'s advice.']
];
export function glossaryHTML(){return `<h3>Words used here</h3><dl class="about-glossary">${GLOSSARY.map(([term,text])=>`<dt>${esc(term)}</dt><dd>${esc(text)}</dd>`).join('')}</dl>`;}
// The footer's honesty label: what produces the guidance, said the same way on every chapter (U2-29).
// Round 12 (GR-GOV-07): derived, never fixed: the provider configured now (guidance, /api/intelligence/status) and, from
// the project's stored authorship (provenance.js solDisclosure), how many records Sol drafted and how many no person reviewed.
export function guidanceFooter(guidance,disclosure=null){const base=guidance?.configured?`Rule-based guidance · Sol can also draft with ${guidance.model}`:guidance?'Rule-based guidance · No language model is connected':'Rule-based guidance';return disclosure?.short?base+' · '+disclosure.short:base;}

// ---------------------------------------------------------------- one guidance voice (round 5, Contract G)
// Each screen has one guidance voice: the heading and its subtitle. The arrival toast names the chapter and nothing
// more, "What comes next" is one line with one action, and the assistance chip (brain-context-ui.js places it) speaks
// only when it adds a fact the heading does not. The rule, in code: the chip's fact must not repeat a word already in
// the heading or the subtitle, beyond the chapter's name. Words are compared in lower case without punctuation, with a
// plural "s" folded and short function words left out; the chip's framing (its "From your project · rule-based" label,
// its "Matters most" kicker and its "+n in Sol's brief" pointer) is not its fact, so the caller passes the fact alone.
// A chip whose fact is only the chapter's name adds nothing either. Presentation only: the chip's brief stays in Sol's
// panel, and nothing here writes to the project.
const FUNCTION_WORDS = new Set('the and for with from into onto that this these those each every your you what which its are was were has have had not but can may will one our their them they then than also about over under between where when how why who all any'.split(' '));
export function contentWords(text) {
  return new Set(String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/)
    .map(w => w.replace(/^-+|-+$/g, '')).filter(w => w.length > 2 && !FUNCTION_WORDS.has(w))
    .map(w => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)));
}
export function chipAddsFact(fact, {heading = '', subtitle = '', chapter = ''} = {}) {
  const name = contentWords(chapter), own = [...contentWords(fact)].filter(w => !name.has(w) && w !== 'chapter');
  if (!own.length) return false;
  const said = contentWords(heading + ' ' + subtitle);
  return !own.some(w => said.has(w));
}

// ---------------------------------------------------------------- "You are here" (round 5, Contract G)
// One line under the tabs: chapter · tab · view. The view is the Model switcher's active entry (or the picture the
// chapter model reports), the category of findings on Validate, the section a Work surface has open, or what Output
// shows. It is redrawn on every change of chapter, tab or view, never by a document load.
export const TAB_NAMES = {work: 'Work', model: 'Model', validate: 'Validate', output: 'Output'};
export function whereText({chapter, title, tab, view}) {
  return ['Chapter ' + chapter + (title ? ' · ' + title : ''), TAB_NAMES[tab] || tab, view].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------- the first-run coach (round 5, Contract G)
// Three steps on a project's first open for this viewer: where the chapters are, what the four tabs mean, and where
// readiness and the draft live. It is remembered in this browser per project and marked seen the moment it is shown,
// so a second open never shows it again unless the key is cleared ("Show the first steps again" in the help map clears
// it). It never takes the keyboard, it sits beside the work rather than over it, any click outside it or Escape puts it
// away, and storage that cannot be read or written only means it is not remembered.
// Each tab has the same job across the journey, expressed in this chapter's vocabulary.
// Keep orientation to one sentence in the existing line; the help map holds the full journey.
export const TAB_PURPOSE = Object.freeze({
  work: 'Record and connect this chapter’s objects.',
  model: 'See what you have recorded, as pictures and tables.',
  validate: 'Check what is recorded; nothing here approves.',
  output: 'Produce the chapter’s documents and hand it forward.'
});
export function tabPurposeHTML(tab, chapter = null) {
  const text = chapterSurfacePurpose(chapter, tab) || TAB_PURPOSE[tab] || TAB_PURPOSE.work;
  return `<p class="tab-purpose" id="tab-purpose">${esc(text)}<button type="button" class="text-button" data-action="help-glossary">Words used here</button></p>`;
}
export const COACH_STEPS = [
  {target: '.chapter-nav', phone: '.mobile-layers', title: 'The chapters', text: 'Eleven chapters take the design from requirements to review. Each reads the ones before it, so start at the top and come back as the design changes.'},
  {target: '.tabs', title: 'The four tabs', text: 'Work records the chapter. Model draws it. Validate checks it: passing, to fix, to confirm. Output shows what the chapter puts in the SDD.'},
  {target: '[data-chapter-insights-toggle]', phone: '[data-chapter-insights-toggle]', also: '[data-tab="output"]', title: 'Insights, progress and the draft', text: 'Insights, at the top, explains the next step and shows the milestones recorded in this chapter and across the project. Milestones are not design approval. The SDD is drafted as you go: each Output holds the chapter’s part, Chapter 11’s Output the whole document.'}
];
const coachKey = () => projectPreferenceKey('aiw-first-steps-v1');
export function coachDue() {
  try { return localStorage.getItem(coachKey()) !== 'seen'; } catch { return false; }
}
export function coachSeen() { try { localStorage.setItem(coachKey(), 'seen'); } catch { /* not remembered in this browser */ } }
export function coachForget() { try { localStorage.removeItem(coachKey()); } catch { /* nothing remembered */ } }
// Where review starts (round 26, GR-UX-11): on a project whose records await confirmation, the first step says so.
export function coachReviewLine(project) {
  if (!project) return '';
  try {
    for (let chapter = 1; chapter <= 11; chapter++) {
      const S = chapterRecordSet(project, chapter), waiting = S.records.filter(r => r.status !== 'User-confirmed' && r.status !== 'Review recorded');
      if (S.total && waiting.length) return `This project has ${plural(waiting.length, 'record')} to confirm in Chapter ${chapter}; review starts on its Work tab.`;
    }
  } catch { /* a project the model cannot read says nothing here */ }
  return '';
}
export function coachHTML(step, project = null) {
  const s = COACH_STEPS[step]; if (!s) return '';
  const review = step === 0 ? coachReviewLine(project) : '';
  const last = step === COACH_STEPS.length - 1;
  return `<header><small id="ux-coach-count">First steps · ${step + 1} of ${COACH_STEPS.length}</small><button type="button" class="ux-coach-x" data-coach="close" aria-label="Close the first steps">×</button></header>`
    + `<h2 id="ux-coach-title">${esc(s.title)}</h2><p id="ux-coach-text">${esc(s.text)}${review ? ' ' + esc(review) : ''}</p>`
    + `<footer><span class="ux-coach-dots" aria-hidden="true">${COACH_STEPS.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</span>`
    + `${step ? '<button type="button" class="btn" data-coach="back">Back</button>' : ''}<button type="button" class="btn primary" data-coach="${last ? 'done' : 'next'}">${last ? 'Done' : 'Next'}</button></footer>`;
}

// ---------------------------------------------------------------- the help map (round 5, Contract G; round 11, A)
// A "?" in the tab bar opens the chapter × tab grid: eleven rows, the four tabs, what each tab holds in one phrase, and
// the way to the glossary and to the first steps again. The Model column is the chapter's instrument tray: every
// instrument the chapter offers this project now, one line each in the surgeon's words, and what later chapters add,
// read from the same table the switchers draw from (instrument-tray.js trayHTML, handed in by the shell), so the help
// map and the switchers cannot disagree. Without the tray (the state suite's sandbox) the Model phrase stands.
export const HELP_MAP = [
  [1, CHAPTER_TITLES[1], 'The brief, the journey and the requirements', 'Diagram, journey map and boundary', 'Testable, traced requirements', 'The requirements register'],
  [2, CHAPTER_TITLES[2], 'Drivers by kind and measurable quality scenarios', 'Diagram, utility tree and what if', 'Measures, evidence and trade-offs', 'The architectural drivers'],
  [3, CHAPTER_TITLES[3], 'Alternatives compared and each choice', 'Diagram and decision map', 'Rationale, alternatives, acceptance', 'The decision records'],
  [4, CHAPTER_TITLES[4], 'Responsibilities and their links', 'Diagram, responsibilities and coverage', 'Purpose, boundary, owner and trace', 'The logical application'],
  [5, CHAPTER_TITLES[5], 'Components that realize responsibilities', 'Diagram and components', 'Implementations, controls and runtime', 'The application architecture'],
  [6, CHAPTER_TITLES[6], 'Capabilities, trust and recovery', 'Diagram, platform, if a capability fails', 'Support for every component', 'The technology capabilities'],
  [7, CHAPTER_TITLES[7], 'Options compared and products chosen', 'Diagram, stack and options', 'Evidence and operating limits', 'The technology realization'],
  [8, CHAPTER_TITLES[8], 'Contracts, payloads and data owners', 'Diagram (with the sequence) and data flow', 'The promise at each boundary', 'Interfaces and data'],
  [9, CHAPTER_TITLES[9], 'Threats, controls and evidence', 'Diagram and threat model', 'Controls, evidence and residual risk', 'The security design'],
  [10, CHAPTER_TITLES[10], 'Placements, recovery and operations', 'Diagram, deployment, if a zone fails', 'Every environment and its recovery', 'Deployment and runtime'],
  [11, CHAPTER_TITLES[11], 'The SDD framed, chapters reviewed, actions', 'The review desk: vitals, what it takes, trace', 'Final checks and every source finding', 'Readiness, preview, download, freeze']
];
export function helpMapHTML({chapter, tab, project = null, tray = null} = {}) {
  const cols = ['work', 'model', 'validate', 'output'];
  const cell = (n, c, i) => { if (cols[i] === 'model' && project && typeof tray === 'function') { try { return tray(project, n); } catch { /* the phrase stands */ } } return esc(c); };
  const rows = HELP_MAP.map(([n, title, ...oldCells]) => { const cells = cols.map((tab, i) => chapterSurfacePurpose(n, tab) || oldCells[i]); return `<tr${n === Number(chapter) ? ' class="here" aria-current="true"' : ''}><th scope="row"><span>${String(n).padStart(2, '0')}</span> ${esc(title)}</th>${cells.map((c, i) => `<td${n === Number(chapter) && cols[i] === tab ? ' class="here"' : ''}>${cell(n, c, i)}</td>`).join('')}</tr>`; }).join('');
  return `<p class="help-lead">Every chapter has the same four tabs. What each holds:</p>`
    + `<div class="help-scroll" tabindex="0" role="region" aria-label="Chapters and tabs"><table class="help-map"><thead><tr><th scope="col">Chapter</th>${cols.map(c => `<th scope="col">${TAB_NAMES[c]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
    + `<p class="help-note">${project && typeof tray === 'function' ? 'Model lists each chapter’s instruments for this project, in the surgeon’s words: an overview, an isolation, a cross-section, a behaviour or an intervention, and what later chapters add. ' : 'Every Model also offers Layers, Table, Matrix and Whole design. '}Validate's words are passing, to fix and to confirm; the checks are rule-based and approve nothing.</p>`;
}
