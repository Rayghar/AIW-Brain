// The Validate tab: two ways to validate the same design, behind one switch.
// - SDD readiness (the original Validate): the chapter's own checks, milestones and handoff, with
//   the readiness of every chapter for the solution design document read as one line across the
//   journey, and — where the chapter has its own models — what those models show.
// - Model views: the design anatomy, the whole design as one body in which every hole is a finding.
// The review desk (desk-view.js) is the third way: every running part on a monitor, what an
// objective asks of it, and the thread from each requirement.
// The choice is remembered for each project; a link can ask for one with ?validate=readiness|desk|model.
import {sddReadiness} from './readiness-model.js';
import {projectPreferenceKey, projectURL} from './project-context.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
// Chapters with their own models, and how to read what each shows.
const MODELS = {
  1: [() => import('./story-model.js'), 'storySource', 'storyInsights'],
  2: [() => import('./utility-model.js'), 'utilitySource', 'utilityInsights'],
  3: [() => import('./tradeoff-model.js'), 'tradeoffSource', 'tradeoffInsights'],
  4: [() => import('./responsibility-model.js'), 'responsibilitySource', 'responsibilityInsights'],
  5: [() => import('./realise-model.js'), 'realiseSource', 'realiseInsights'],
  6: [() => import('./platform-model.js'), 'platformSource', 'platformInsights'],
  7: [() => import('./stack-model.js'), 'stackSource', 'stackInsights'],
  8: [() => import('./exchange-model.js'), 'exchangeSource', 'exchangeInsights'],
  9: [() => import('./threat-model.js'), 'threatSource', 'threatInsights'],
  10: [() => import('./deploy-model.js'), 'deploySource', 'deployInsights']
};
const MODES = ['readiness', 'desk', 'model'];
const key = () => projectPreferenceKey('aiw-validate-mode');
let bar = null, ready = null, last = null, hooks = {}, readyFor = null, observed = new Map();

function mode() {
  try { const v = localStorage.getItem(key()); return MODES.includes(v) ? v : 'readiness'; } catch { return 'readiness'; }
}
function setMode(v) { try { localStorage.setItem(key(), v); } catch { /* preference only */ } }
const hostOf = () => document.querySelector('.studio > .stage.tab-content') || document.querySelector('.r-studio > .r-surface');

export function mountValidate(selection, callbacks = {}) {
  const host = hostOf(), p = project();
  if (!host || !p) return;
  last = selection || last; hooks = {...hooks, ...callbacks};
  if (MODES.includes(callbacks.asked)) setMode(callbacks.asked);
  const chapter = Number(selection?.chapter) || Number(new URLSearchParams(location.search).get('chapter')) || 1;
  if (!bar) { bar = document.createElement('div'); bar.className = 'vx-bar'; bar.addEventListener('click', onClick); }
  if (host.firstElementChild !== bar) host.prepend(bar);
  const m = mode();
  document.body.classList.toggle('vx-model', m === 'model');
  document.body.classList.toggle('vx-readiness', m === 'readiness');
  document.body.classList.toggle('vx-desk', m === 'desk');
  let R = null;
  try { R = sddReadiness(p); } catch (e) { console.warn('SDD readiness could not be read.', e?.message); }
  const c = R?.chapters.find(x => x.id === chapter);
  bar.innerHTML = `<div class="vx-switch" role="group" aria-label="What to validate"><button type="button" data-vx="mode" data-id="readiness" aria-pressed="${m === 'readiness'}"><b>SDD readiness</b><small>checks, milestones, handoff</small></button><button type="button" data-vx="mode" data-id="desk" aria-pressed="${m === 'desk'}"><b>Review desk</b><small>vitals, what it takes, the thread</small></button><button type="button" data-vx="mode" data-id="model" aria-pressed="${m === 'model'}"><b>Model views</b><small>the design as one body</small></button></div><p class="vx-state">${m === 'desk' ? 'Every running part on the monitor, what an objective asks of it, and the thread from each requirement. Plug a probe into what you are watching.' : m === 'model' ? 'The whole design as one body, as of Chapter ' + chapter + ': every hole is a finding. Switch back for the chapter\'s checks.' : c ? esc(`Chapter ${chapter} · ${c.blockers ? c.blockers + (c.blockers === 1 ? ' finding blocks' : ' findings block') + ' the SDD' : c.gaps ? 'blocking findings treated in Chapter 11' : 'nothing blocks the SDD'} · ${c.review} to review · ${c.done} of ${c.total} milestones`) : ''}</p>`;
  if (m === 'model') {
    ready?.remove(); readyFor = null; hooks.desk?.leave();
    hooks.anatomy?.mount(selection);
    return;
  }
  hooks.anatomy?.leave();
  if (m === 'desk') {
    ready?.remove(); readyFor = null;
    hooks.desk?.mount(selection);
    return;
  }
  hooks.desk?.leave();
  if (!ready) { ready = document.createElement('section'); ready.className = 'vx-ready'; ready.setAttribute('aria-label', 'SDD readiness across the journey'); ready.addEventListener('click', onClick); }
  if (bar.nextElementSibling !== ready) bar.after(ready);
  const sig = p.id + ':' + chapter + ':' + (window.aiwProjectStore?.value?.revision ?? '');
  if (readyFor !== sig || !ready.innerHTML) { readyFor = sig; ready.innerHTML = R ? readinessHTML(R, chapter) : ''; observe(p, chapter); observeAnti(p, sig); }
}
export function leaveValidate() {
  document.body.classList.remove('vx-model', 'vx-readiness', 'vx-desk');
  bar?.remove(); ready?.remove(); readyFor = null;
  hooks.anatomy?.leave(); hooks.desk?.leave();
}

function readinessHTML(R, chapter) {
  const tile = c => {
    const n = c.blockers ? `${c.blockers} blocking` : c.gaps ? `${c.gaps} treated` : '✓ clear';
    const title = `Chapter ${c.id} · ${c.title}: ${c.blockers ? c.blockers + (c.blockers === 1 ? ' finding blocks' : ' findings block') + ' the SDD' : c.gaps ? 'blocking findings treated in Chapter 11' : 'nothing blocks the SDD'} · ${c.review} to review · ${c.done} of ${c.total} milestones`;
    return `<li><a class="vx-tile ${c.state}${c.id === chapter ? ' cur' : ''}" href="${esc(projectURL('/?chapter=' + c.id + '&tab=validate&validate=readiness'))}" title="${esc(title)}" aria-label="${esc(title)}"${c.id === chapter ? ' aria-current="page"' : ''}><small>${String(c.id).padStart(2, '0')}</small><b>${esc(c.short)}</b><span class="vx-n">${esc(n)}</span><span class="vx-r">${c.review} to review</span><i class="vx-m" style="--p:${c.total ? Math.round(100 * c.done / c.total) : 0}%"></i></a></li>`;
  };
  return `<header><div><small>SDD readiness · the whole journey</small><b>${esc(R.summary)}</b></div>${chapter === 11 ? '' : `<a class="vx-link" href="${esc(projectURL('/?chapter=11&tab=validate&validate=readiness'))}">Final review in Chapter 11 →</a>`}</header><ol class="vx-tiles">${R.chapters.map(tile).join('')}</ol><div class="vx-obs" hidden></div><details class="vx-anti" hidden></details>`;
}

// What the chapter's own models show, as prompts beside the checks.
async function observe(p, chapter) {
  const box = ready?.querySelector('.vx-obs'), spec = MODELS[chapter];
  if (!box || !spec) return;
  const sig = p.id + ':' + chapter + ':' + (window.aiwProjectStore?.value?.revision ?? '');
  let list = observed.get(sig);
  if (!list) {
    try { const m = await spec[0](); list = m[spec[2]](m[spec[1]](p)) || []; } catch (e) { console.warn('The chapter model could not be read.', e?.message); list = []; }
    observed.clear(); observed.set(sig, list);
  }
  if (!ready?.isConnected || readyFor !== sig || !list.length) return;
  const link = x => projectURL('/?chapter=' + chapter + '&tab=model' + (x.id ? '&object=' + encodeURIComponent(x.id) : ''));
  box.innerHTML = `<div class="vx-obs-in"><small>The Chapter ${chapter} models also show · ${list.length}</small><ul>${list.slice(0, 4).map(x => `<li class="${esc(x.kind)}"><a href="${esc(link(x))}">${esc(x.text)}</a></li>`).join('')}</ul><p>Prompts drawn from recorded facts by the chapter's own models — for review, not blockers.</p></div><div class="vx-obs-acts"><a class="btn" href="${esc(projectURL('/?chapter=' + chapter + '&tab=model'))}">Open the Chapter ${chapter} models</a><button type="button" class="btn" data-vx="mode" data-id="desk">Open the review desk</button><button type="button" class="btn" data-vx="mode" data-id="model">See the design anatomy</button></div>`;
  box.hidden = false;
}

// Anti-patterns found in the recorded design, named as the pattern catalogue names them.
async function observeAnti(p, sig) {
  const box = ready?.querySelector('.vx-anti');
  if (!box) return;
  let html = '', n = 0;
  try { const m = await import('./spec-panel.js'); const list = m.antiPatterns(p); n = list.length; html = m.antiPatternHTML(list, 'Anti-patterns in the design'); } catch (e) { console.warn('Anti-patterns could not be read.', e?.message); }
  if (!ready?.isConnected || readyFor !== sig || !n) return;
  box.innerHTML = `<summary><b>${n} anti-pattern${n === 1 ? '' : 's'}</b> found in the recorded design — failure boundaries to review before the SDD</summary>${html}`;
  box.hidden = false;
}

function onClick(e) {
  const b = e.target.closest('[data-vx="mode"]');
  if (!b) return;
  e.preventDefault();
  setMode(b.dataset.id);
  mountValidate(last, {...hooks, asked: null});
  document.querySelector('.vx-bar')?.scrollIntoView({block: 'nearest'});
}
