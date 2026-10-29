// The design at a glance (rc40, PLAN §4.4.4): what the Work tab's Details column holds while no record is held — the
// chapter's picture as a read-only miniature drawn by the shared notation (model, arrangement, renderer: the same
// picture the Model tab and the SDD draw), the chapter's checks and Sol's starters for the stage; the next task is the
// footer's. The record card takes the column when a record is held (app.js). Nothing here writes a record;
// a starter composes a question for the Companion and sends nothing to a provider.
import {esc} from './html-escape.js';
import {projectURL} from './project-context.js';
import {chapterChecks, counted, checkUnits} from './readiness-model.js';
import {WORK_METHOD, WORK_SECTIONS, workStageState, chapterRecordsState, emptyStageLine} from './work-frame.js';
import {CHAPTER_SHORT} from './chapter-names.js';

const GLANCE_BUDGET = 18;
// The notation engine (the model, the layout, the renderer and the figure budget, about 230 KB of the Model tab's own
// chunks) loads on demand the first time a glance draws, as the Model views load it: the Work tab's route carries the
// glance's words, not the engine (client-bundle.mjs, the chapters route budget).
let engine = null;
const loadEngine = () => engine || (engine = Promise.all([import('./notation-model.js'), import('./notation-layout.js'), import('./notation-svg.js'), import('./figure-budget.js')])
  .then(([model, layout, svg, budget]) => ({notationDiagram: model.notationDiagram, notationScenes: model.notationScenes, notationLayout: layout.notationLayout, notationSVG: svg.notationSVG, foldDiagram: budget.foldDiagram}))
  .catch(e => { engine = null; throw e; }));
// One miniature per document and chapter, kept while the document is the same (its id, content version and update time).
const pictures = new Map();
const pictureKey = (p, chapter) => [p.id, p.contentVersion, p.updatedAt, p.revision, chapter].join('|');
function miniature(p, chapter, E) {
  const {notationDiagram, notationScenes, notationLayout, notationSVG, foldDiagram} = E;
  const scene = notationScenes(chapter)[0];
  if (!scene) return null;
  const key = pictureKey(p, chapter);
  if (pictures.has(key)) return pictures.get(key);
  let out = null;
  try {
    const D = notationDiagram(p, scene.id, {chapter});
    if (D && D.nodes.length) {
      const F = foldDiagram(D, {project: p, budget: GLANCE_BUDGET}), X = F?.folded ? F.overview : D;
      const L = notationLayout(X, {arrangement: scene.arrangement});
      const top = Math.max(0, (L.header?.y || 0) + (L.header?.h || 0) + 6), H = Math.max(40, (L.notesY ?? L.H) - top);
      const svg = notationSVG(X, L, {key: false, notes: false, prefix: 'wg' + chapter, title: scene.title + ' · at a glance', desc: 'A miniature of the ' + scene.title + ' picture. Open it in Model to read it.'})
        .replace(/^<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"\sviewBox="[^"]*"/, '<svg$1 width="100%" viewBox="0 ' + top + ' ' + L.W + ' ' + H + '" preserveAspectRatio="xMidYMin meet"');
      out = {scene, svg, elements: X.nodes.length, relationships: X.edges.length, folded: !!F?.folded, total: D.nodes.length};
    } else out = {scene, svg: '', elements: 0, relationships: 0, folded: false, total: 0, note: D?.notes?.[0] || 'Nothing is recorded for this picture yet.'};
  } catch (e) { out = {scene, svg: '', elements: 0, relationships: 0, folded: false, total: 0, note: 'The picture could not be drawn here. Open it in Model.'}; console.warn('The glance picture could not be drawn.', e?.message); }
  if (pictures.size > 4) pictures.delete(pictures.keys().next().value);
  pictures.set(key, out);
  return out;
}
function pictureHTML(pic, modelURL) {
  return '<figure class="work-glance-picture" data-work-glance-scene="' + esc(pic.scene.id) + '">' + (pic.svg ? '<div class="work-glance-canvas">' + pic.svg + '</div>' : '<p class="work-glance-note">' + esc(pic.note || '') + '</p>') + '<figcaption><span>' + esc(pic.scene.title) + ' · ' + esc(pic.scene.standard) + (pic.total ? ' · ' + pic.total + (pic.total === 1 ? ' element' : ' elements') + (pic.folded ? ', folded by group' : '') : '') + '</span><a class="btn" data-work-glance-open href="' + esc(modelURL) + '">Open in Model</a></figcaption></figure>';
}
// Fill every pending glance figure in the document: load the engine once, draw (and keep) the miniature, replace the
// figure in place. A figure whose document changed meanwhile is left to the next render, which keys it afresh.
let pendingTimer = 0;
function schedulePending(p) {
  if (typeof document === 'undefined' || pendingTimer) return;
  pendingTimer = setTimeout(() => { pendingTimer = 0; drawPending(p); }, 0);
}
async function drawPending(p) {
  const figures = [...document.querySelectorAll('figure[data-work-glance-pending]')];
  if (!figures.length) return;
  let E; try { E = await loadEngine(); } catch (e) { console.warn('The glance picture engine could not load.', e?.message); for (const f of figures) f.replaceWith(noteFigure('The picture could not be drawn here. Open it in Model.', f)); return; }
  for (const f of figures) {
    if (!f.isConnected) continue;
    const chapter = Number(f.dataset.workGlancePending), modelURL = f.querySelector('[data-work-glance-open]')?.getAttribute('href') || '';
    const pic = miniature(p, chapter, E);
    if (pic) { const t = document.createElement('template'); t.innerHTML = pictureHTML(pic, modelURL); f.replaceWith(t.content.firstElementChild); }
    else f.remove();
  }
}
function noteFigure(note, f) { const t = document.createElement('template'); t.innerHTML = '<figure class="work-glance-picture"><p class="work-glance-note">' + esc(note) + '</p>' + (f.querySelector('figcaption')?.outerHTML || '') + '</figure>'; return t.content.firstElementChild; }
// Three starters for the stage: each drafts a question with the stage's recorded state in it, so Sol explains from
// the records; the person edits and sends it, as every starter. A starter holds the stage's first record (the
// Companion reads a held record), opens Ask Sol and hands the question over; it is disabled while the stage holds none.
export function stageStarters(p, chapter, section, state, checks) {
  const title = CHAPTER_SHORT[chapter] || 'Chapter ' + chapter, question = WORK_METHOD[chapter]?.[section]?.[0] || '', into = (WORK_METHOD[chapter]?.[section]?.[2] || []).map(x => x[2]).join(', ');
  const stage = String(section).replace(/-/g, ' '), facts = state.line, open = checks ? counted(checks.toFix, checkUnits(chapter).fix) + ' and ' + counted(checks.toConfirm, checkUnits(chapter).confirm) : '';
  return [
    ['stage-explain', 'Explain this stage', question + ' In ' + title + ' · ' + stage + ' the project holds ' + facts + '. Explain what is recorded and what it rests on, from the records only; propose nothing as decided.', 'What is recorded and what it rests on'],
    ['stage-gaps', 'What is missing here?', 'In ' + title + ' · ' + stage + ' (' + facts + (open ? '; ' + open : '') + '), which records are missing, unsupported or untestable, and in what order would you record them? Use the chapter’s checks; invent no owners, numbers or approvals.', 'The gaps the checks and sources show'],
    ['stage-feeds', 'What does this feed?', 'What do the records of ' + title + ' · ' + stage + ' carry into ' + (into || 'the later chapters') + ', and what would those later chapters need from them that is not recorded yet? Read the recorded connections; ask me rather than inventing a target.', 'What later chapters will need']
  ];
}
// The head speaks as the tab's own state line does: on Work the stage's ("Nothing recorded in this stage yet · 47 records
// in this chapter" while the stage holds none), on Validate and Output the chapter's. The next task is the footer's
// alone (rc41 W2: one next step per tab), and the checks link to Validate only from another tab.
export function workGlanceHTML(p, chapter, section, {tab = 'work'} = {}) {
  chapter = Number(chapter);
  if (!p || !(chapter >= 1 && chapter <= 11)) return '';
  section = WORK_SECTIONS[chapter]?.includes(section) ? section : WORK_SECTIONS[chapter][0];
  let checks = null; try { checks = chapterChecks(p, chapter); } catch { checks = null; }
  const state = workStageState(p, chapter, section), first = state.rows[0];
  let head = state.line;
  if (tab !== 'work') { try { head = chapterRecordsState(p, chapter).line; } catch { head = state.line; } }
  else if (!state.recorded) head = emptyStageLine(p, chapter, 'this stage');
  const modelURL = projectURL('/?chapter=' + chapter + '&tab=model&model=diagram'), units = checkUnits(chapter);
  // The picture: drawn at once when this document's miniature is already kept; otherwise a pending figure that
  // `drawPending` fills once the engine has loaded (the figure keeps its place and its Open in Model link meanwhile).
  const kept = pictures.get(pictureKey(p, chapter));
  const picture = kept === null ? '' : kept ? pictureHTML(kept, modelURL) : '<figure class="work-glance-picture" data-work-glance-pending="' + chapter + '"><div class="work-glance-canvas" aria-busy="true"></div><figcaption><span>Drawing the chapter’s picture…</span><a class="btn" data-work-glance-open href="' + esc(modelURL) + '">Open in Model</a></figcaption></figure>';
  if (!kept && kept !== null) schedulePending(p);
  const checksHTML = checks ? '<div class="work-glance-checks" data-work-glance-checks="' + esc(checks.state) + '"><span class="eyebrow">Checks</span><div class="work-glance-chips"><span class="chip ' + (checks.toFix ? 'fix' : 'pass') + '">' + esc(counted(checks.toFix, units.fix)) + '</span><span class="chip ' + (checks.toConfirm ? 'warn' : 'pass') + '">' + esc(counted(checks.toConfirm, units.confirm)) + '</span><span class="chip pass">' + esc(checks.passing + ' of ' + checks.total + ' passing') + '</span></div>' + (tab === 'validate' ? '' : '<a href="' + esc(checks.validateURL) + '">Open Validate</a>') + '</div>' : '';
  const starters = stageStarters(p, chapter, section, state, checks).map(([key, label, prompt, hint]) => '<button type="button" class="work-starter" data-work-starter="' + esc(key) + '" data-work-starter-prompt="' + esc(prompt) + '" data-work-starter-record="' + esc(first?.id || '') + '" data-work-starter-chapter="' + chapter + '" data-work-starter-project="' + esc(p.id || '') + '"' + (first ? '' : ' disabled') + '><b>' + esc(label) + '</b><small>' + esc(hint) + '</small></button>').join('');
  const solHTML = '<div class="work-glance-sol"><span class="eyebrow">Ask Sol about this stage</span>' + starters + '<small class="work-glance-sol-note">' + esc(first ? 'Each starter holds the stage’s first record and drafts the question for you to edit; nothing is sent until you send it.' : 'Record the first ' + state.parts.map(x => x.replace(/^\d+ /, '')).join(' or ') + ' to ask Sol about it.') + '</small></div>';
  return '<section class="work-glance" data-work-glance="' + chapter + ':' + esc(section) + '" aria-label="The design at a glance"><header class="work-glance-head"><span class="eyebrow">The design at a glance</span><strong>' + esc(CHAPTER_SHORT[chapter] || 'Chapter ' + chapter) + '</strong><small>' + esc(head) + '</small></header>' + picture + checksHTML + solHTML + '</section>';
}
// A starter: hold the record (the shell's selection, as Validate's Open does), open Ask Sol, then hand the question to
// the Companion through its own event; the Companion retains it as a draft the person edits and sends.
const until = (test, done, tries = 40) => { if (test()) return done(); if (tries <= 0) return; setTimeout(() => until(test, done, tries - 1), 50); };
function startStarter(b) {
  const {workStarterRecord: id, workStarterPrompt: prompt, workStarterChapter: chapter, workStarterProject: projectId} = b.dataset;
  if (!id || !prompt) return;
  const held = () => new URLSearchParams(location.search).get('object') === id;
  if (!held()) document.dispatchEvent(new CustomEvent('aiw:inspect-record', {detail: {id}}));
  until(held, () => {
    document.querySelector('.workspace-tools [data-workspace-sol]')?.click();
    until(() => { const panel = document.querySelector('#brain-panel'); return !!panel && !panel.hidden; }, () => {
      const send = (tries = 10) => {
        const e = new CustomEvent('aiw:co-design-prompt', {cancelable: true, detail: {source: 'co-design-guide', projectId, chapter: Number(chapter), objectId: id, mode: 'design', prompt}});
        document.dispatchEvent(e);
        if (!e.defaultPrevented && tries > 0) setTimeout(() => send(tries - 1), 120);
      };
      send();
    });
  });
}
if (typeof document !== 'undefined' && !globalThis.__aiwWorkGlance) {
  globalThis.__aiwWorkGlance = true;
  document.addEventListener('click', e => { const b = e.target instanceof Element ? e.target.closest('[data-work-starter]') : null; if (!b || b.disabled) return; e.preventDefault(); startStarter(b); });
}
