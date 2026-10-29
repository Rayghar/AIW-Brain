// The chapter's compact orientation and notice disclosure. All guidance comes from the
// saved-model selector; opening this control neither calls a provider nor changes a record.
import {chapterInsight} from './chapter-insight.js';
import {esc, safeUrl} from './html-escape.js';
import {milestoneRecheck, readinessWords} from './shell-ux.js';
import {currentProject} from './project-context.js';
import {intelligenceActionHTML,intelligenceSourcesHTML,intelligenceAuthority} from './chapter-insight.js';

const thoughtIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19h6M10 22h4M8 16c0-2-3-3-3-7a7 7 0 0 1 14 0c0 4-3 5-3 7"/><path d="M9 11V8l3 2 3-2v3M12 10v6"/></svg>';
const arrow = '<span class="chapter-next-arrow" aria-hidden="true">↗</span>';
const count = n => Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
const percent = (done, total) => total ? Math.min(100, Math.max(0, done / total * 100)) : 0;
const link = (target, label, attributes = '') => target?.url
  ? `<a href="${esc(safeUrl(target.url))}" data-scope-link ${attributes}>${label}</a>`
  : `<span ${attributes}>${label}</span>`;
let held = {key: '', open: false}, latest = null, installed = false;

function actionHTML(action, index) {
  return `<li>${actionLink(action, `<span>${esc(action.title)}</span>${arrow}`, `data-header-focus="action-${index}"`)}<p>${esc(action.why)}</p></li>`;
}
function actionLink(action,labelHTML,attributes='',className=''){
 const x=action.intelligence;if(!x)return link(action.target,labelHTML,`${className?`class="${className}"`:''} ${attributes}`);
 return intelligenceActionHTML(x.reading,x.insight,x.action,{projectId:x.projectId,scopeId:new URL(action.target.url,'https://aiw.local').searchParams.get('scope')||'',className,attributes,labelHTML});
}
function decisionHTML(decision) {
  return `<li>${link(decision.target, `<b>${esc(decision.id)}</b><span>${esc(decision.title)}</span>${arrow}`, `data-header-focus="decision-${esc(decision.id)}"`)}<div class="chapter-decision-state"><span>${esc(decision.stateLabel || decision.state)}</span>${decision.highPriorityDriver ? '<span>High-priority driver</span>' : ''}</div><p>${esc(decision.reason)}</p></li>`;
}
function projectProgressHTML(progress) {
  const chapters = Array.isArray(progress?.chapters) ? progress.chapters : [];
  return `<details class="chapter-project-progress" data-project-progress><summary data-header-focus="project-progress"><span>Across the project</span><b>${count(progress?.done)} of ${count(progress?.total)}</b><small>milestones met</small></summary><p>Eleven chapters, one saved model. These counts describe recorded milestones; they do not grant design approval.</p><div class="chapter-progress-list">${chapters.map(ch => `<details data-progress-chapter="${count(ch.chapter)}"><summary data-header-focus="chapter-${count(ch.chapter)}"><span class="chapter-progress-number">${String(ch.chapter).padStart(2, '0')}</span><span class="chapter-progress-title">${esc(ch.title)}</span><span class="chapter-progress-count">${count(ch.done)} / ${count(ch.total)}</span><span class="chapter-progress-line" aria-hidden="true"><i style="width:${percent(count(ch.done), count(ch.total))}%"></i></span></summary><ul>${(ch.stages || []).map(stage => `<li class="${stage.done ? 'is-met' : ''}">${link(stage.target, `<span aria-hidden="true">${stage.done ? '✓' : '○'}</span><span>${esc(stage.name)}</span><small>${stage.done ? 'Met' : 'To do'}</small>`, `data-header-focus="stage-${count(ch.chapter)}-${esc(stage.id)}"`)}</li>`).join('')}</ul>${link(ch.target, `Open Chapter ${count(ch.chapter)} ${arrow}`, `class="chapter-open-link" data-header-focus="open-chapter-${count(ch.chapter)}"`)}</details>`).join('')}</div></details>`;
}

// Kept pure so escaping, unavailable states and count semantics can be verified without a provider.
export function chapterHeaderHTML(insight, {recheck = [], open = false} = {}) {
  const progress = insight.progress || {}, milestones = progress.milestones || [];
  const done = count(progress.done), total = count(progress.total), attention = insight.attention === true;
  const reading = progress.unavailable ? 'Chapter milestone information is unavailable' : milestones.length ? readinessWords(milestones, {recheck, illustrative: progress.illustrative === true}) : progress.label || 'Milestone information is unavailable';
  const lead = insight.lead, actions = (insight.nextActions || []).filter(a => a.id !== lead?.id).slice(0, 3);
  const decisions = insight.openDecisions || {count: 0, items: []};
  const scope = insight.scope?.title ? `Focus: ${insight.scope.title}. Milestones cover the whole chapter.` : 'Milestones cover the whole chapter.';
  const checkReading = progress.unavailable ? 'Check counts could not be read.' : `${progress.findingsScope === 'module' ? 'In this module' : 'In this chapter'}: ${count(progress.toFix)} to fix · ${count(progress.toConfirm)} to confirm · ${count(progress.treated)} treated.`;
  const validationReading = progress.checksAt ? progress.checksCurrent ? 'The saved validation run is current.' : 'Saved validation results need to be refreshed.' : 'No saved validation run yet.';
  const caption = progress.unavailable ? 'Unavailable' : `${done}/${total} met${progress.illustrative ? ' · illustrative' : ''}${recheck.length ? ` · ${recheck.length} recheck` : ''}`;
  const focus=lead?actionLink(lead,`<small>${attention?'Needs attention':'Next focus'}</small><span>${esc(lead.title)}</span>`, `data-header-focus="next" title="${esc(lead.title)}"`,'chapter-next'):'';
  return `${focus}<details class="progress-disclosure chapter-insights ${attention ? 'has-attention' : ''}" ${open ? 'open' : ''}><summary data-chapter-insights-toggle data-header-focus="insights" aria-controls="chapter-insights-content" aria-expanded="${open}" aria-label="Chapter insights: ${esc(reading)}${attention ? '. Needs attention' : ''}"><span class="chapter-thought">${thoughtIcon}</span><span class="chapter-insights-caption"><span>Insights</span><small data-chapter-progress data-done="${done}" data-total="${total}">${esc(caption)}</small></span><span class="chapter-insights-chevron" aria-hidden="true">⌄</span></summary><section id="chapter-insights-content" class="chapter-insights-content" data-chapter-insights aria-label="Chapter insights"><header><div><span class="chapter-insight-kicker">${attention ? 'Needs attention' : 'Your next step'}</span><h2>Chapter ${count(insight.chapter)} insights</h2></div><button type="button" data-chapter-insights-close data-header-focus="close" aria-label="Close chapter insights">×</button></header><p class="chapter-insight-origin">${lead?.intelligence?'Saved project context and repository guidance':'Based on saved project checks'}</p>${lead ? `<section class="chapter-insight-lead" data-chapter-insight-why${lead.intelligence?` data-intelligence-id="${esc(lead.intelligence.insight.id)}"`:""}><h3>${esc(lead.title)}</h3><p>${esc(lead.why)}</p>${actionLink(lead, `${lead.intelligence?esc(lead.intelligence.action.label||lead.intelligence.action.title):lead.target?.objectId ? `Open ${esc(lead.target.objectId)}` : 'Open this step'} ${arrow}`, 'data-chapter-next data-header-focus="lead"','chapter-open-link')}<details class="chapter-rule"><summary data-header-focus="rule">Why this is shown</summary><p>${esc(lead.rule || insight.summary)}</p>${insight.knowledgeLoaded===false?'<p class="chapter-insight-note">Architecture knowledge has not loaded. <button type="button" class="chapter-open-link" data-brain-launch="mind">Open Co-design to load or retry it</button>. Saved project checks remain available.</p>':''}${lead.intelligence?`<p>${esc(intelligenceAuthority(lead.intelligence.insight.authority))} · guidance requires project judgement and evidence.</p>${intelligenceSourcesHTML(lead.intelligence.reading,lead.intelligence.insight,{projectId:lead.intelligence.projectId})}`:''}<small>${esc(scope)}</small></details></section>` : `<p role="status">${esc(insight.summary || 'No next action is available from the current model.')}</p>`}${actions.length ? `<section class="chapter-insight-section"><h3>Then consider</h3><ol class="chapter-insight-actions">${actions.map(actionHTML).join('')}</ol></section>` : ''}<section class="chapter-insight-section" data-chapter-decision-queue><div class="chapter-section-title"><h3>Open decisions</h3><span>${count(decisions.count)} across the project</span></div>${decisions.items?.length ? `<ul class="chapter-decision-list">${decisions.items.slice(0, 3).map(decisionHTML).join('')}</ul>${decisions.count > decisions.items.length ? `<p class="chapter-insight-note">Showing ${decisions.items.length} of ${count(decisions.count)} open decisions.</p>` : ''}` : '<p class="chapter-insight-note">No open decision records were found. This does not confirm that all necessary decisions have been identified.</p>'}</section><section class="chapter-insight-section chapter-readiness"><div class="chapter-section-title"><h3>This chapter</h3><span>Saved milestones</span></div><div class="progress-wrap"><div class="progress-top"><span>Chapter ${count(insight.chapter)}</span><b id="progress-percent">${progress.unavailable ? 'Unavailable' : `${done} of ${total}`}</b></div><div class="progress-track" role="progressbar" aria-label="Chapter ${count(insight.chapter)} milestones met" aria-valuemin="0" aria-valuemax="${total}" ${progress.unavailable ? '' : `aria-valuenow="${done}"`} aria-valuetext="${esc(reading)}"><span id="progress-fill" style="width:${percent(done, total)}%"></span><span id="progress-recheck" class="progress-recheck" style="left:${percent(done, total)}%;width:${percent(recheck.length, total)}%" title="Previously met milestones to re-check"></span></div><small id="progress-count">${esc(reading)}</small></div><p>${esc(progress.meaning || 'Milestones indicate recorded work, not architectural correctness or external approval.')}</p><p class="chapter-insight-note">${esc(checkReading)}</p><p class="chapter-insight-note">${esc(scope)} ${esc(validationReading)}</p>${link({url: insight.more?.validateURL}, `Review chapter checks ${arrow}`, 'class="chapter-open-link" data-header-focus="validate"')}</section>${projectProgressHTML(insight.projectProgress)}</section></details>`;
}

function setOpen(details, open, focus = false) {
  details.open = open;
  details.querySelector('[data-chapter-insights-toggle]')?.setAttribute('aria-expanded', String(open));
  held.open = open;
  if (open) sizeDisclosure(details);
  if (focus) details.querySelector('[data-chapter-insights-toggle]')?.focus({preventScroll: true});
}
function sizeDisclosure(details) {
  const panel = details.querySelector('[data-chapter-insights]');
  if (!details.open || !panel) return;
  const available = Math.max(80, window.innerHeight - panel.getBoundingClientRect().top - 16);
  panel.style.setProperty('--chapter-insight-available', `${available}px`);
}
function installEvents() {
  if (installed) return;
  installed = true;
  document.addEventListener('pointerdown', event => {
    const details = document.querySelector('.chapter-insights[open]');
    if (details && !details.contains(event.target)) setOpen(details, false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
    const details = document.querySelector('.chapter-insights[open]');
    if (!details) return;
    event.preventDefault(); event.stopPropagation(); setOpen(details, false, true);
  }, true);
  document.addEventListener('aiw:project-command', () => {
    // A saved edit may update a model in place without rebuilding the shell.
    if (latest) queueMicrotask(() => { if (latest) mountChapterHeader(currentProject(), latest.selection, latest.tab); });
  });
  document.addEventListener('aiw:project-switched', () => { held = {key: '', open: false}; latest = null; });
  window.addEventListener('resize', () => { const details = document.querySelector('.chapter-insights[open]'); if (details) sizeDisclosure(details); });
}

export function mountChapterHeader(project, selection, tab = 'work') {
  const heading = document.querySelector('.heading-row');
  if (!heading || !project || !selection?.chapter) return;
  latest = {selection: {...selection}, tab};
  const key = [project.id, selection.chapter, tab, selection.scope || ''].join(':');
  let insight, recheck;
  try {
    insight = chapterInsight(project, Number(selection.chapter), {tab, selectedId: selection.id || null, scopeId: selection.scope || null});
    recheck = milestoneRecheck(selection.chapter, insight.progress?.milestones || []).recheck;
  } catch (error) {
    let note = heading.querySelector('.chapter-insight-error');
    if (!note) { note = document.createElement('p'); note.className = 'chapter-insight-error'; note.setAttribute('role', 'status'); heading.append(note); }
    note.textContent = 'Chapter insights could not be read. The chapter tools are still available.';
    console.warn('Chapter insights could not be read.', error?.message);
    return;
  }
  heading.querySelector('.chapter-insight-error')?.remove();
  heading.dataset.chapterHeader = String(selection.chapter);
  const title = heading.firstElementChild;
  title?.classList.add('chapter-heading-title');
  const signature = JSON.stringify([insight, recheck.map(m => m.id)]);
  let actions = heading.querySelector('.chapter-header-actions');
  if (actions?.dataset.signature === signature) return;
  const focused = document.activeElement?.closest?.('[data-header-focus]')?.dataset.headerFocus;
  const oldDetails = actions?.querySelector('.chapter-insights');
  const scroll = oldDetails?.querySelector('[data-chapter-insights]')?.scrollTop || 0;
  const expanded = held.key === key ? [...(oldDetails?.querySelectorAll('details[open]') || [])].map(el => el.querySelector('summary')?.dataset.headerFocus).filter(Boolean) : [];
  const open = held.key === key && (oldDetails ? oldDetails.open : held.open);
  held = {key, open};
  if (!actions) {
    heading.querySelector(':scope > .progress-disclosure')?.remove();
    actions = document.createElement('div'); actions.className = 'chapter-header-actions'; heading.append(actions);
  }
  actions.dataset.signature = signature;
  actions.innerHTML = chapterHeaderHTML(insight, {recheck, open});
  // These were a duplicate count and a less specific first-milestone route. The grounded
  // focus link replaces them; the four surfaces and all module/context controls stay put.
  document.querySelector('.workspace-bar > .journey-status')?.remove();
  const details = actions.querySelector('.chapter-insights');
  details.addEventListener('toggle', () => { if (details.isConnected) { held.open = details.open; details.querySelector('summary').setAttribute('aria-expanded', String(details.open)); sizeDisclosure(details); } });
  details.querySelector('[data-chapter-insights-close]').addEventListener('click', () => setOpen(details, false, true));
  for (const summary of details.querySelectorAll('details>summary')) if (expanded.includes(summary.dataset.headerFocus)) summary.parentElement.open = true;
  details.querySelector('[data-chapter-insights]').scrollTop = scroll;
  if (focused) ([...actions.querySelectorAll('[data-header-focus]')].find(el => el.dataset.headerFocus === focused) || details.querySelector('summary')).focus({preventScroll: true});
  sizeDisclosure(details);
  installEvents();
}
