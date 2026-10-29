import {modelDossierHTML} from './model-dossier.js';
// The Diagram view every chapter model mounts in its stage: the chapter's design in the standard
// notation (notation-model.js), arranged by notation-layout.js and drawn by notation-svg.js — the
// same renderer the export and the SDD figure use. The chapter keeps its shell, its companion and
// its selection; this module offers the scene picker, the Arrange, Layers, Focus and Download menus,
// pins by dragging or by keyboard, a relationship that can be hovered, focused and selected, a
// baseline comparison, a vitals overlay, reader notes, the Key built from what is drawn, a text
// alternative of the picture, and a packet Sol can read. Nothing here writes to the document.
// Round 3 (D): it also serves every chapter model's shared views — Layers (the chapter's connected model, one lane
// per model layer), Table (model-table.js), Matrix (model-matrix.js) and Whole design (the anatomy) — under the one
// layer model: the sidebar's eight layers, kept per chapter and picture, filter every view, and the toolbar keeps
// the zoom and fit controls, the overview and the note that says what the layers hide.
// Round 4 (R4-B): Layers draws all eight lanes (the empty and hidden ones as thin strips); the Matrix sets any two
// record types the project holds against each other, the pair remembered per chapter with the layers; Table pages
// and Matrix caps a large project; a selection marks the sheet in place instead of redrawing it.
// Round 5 (R5-B, Contract M): every view paints the marks of model-marks.js — the chapter's checks (published here on
// every draw, with a Checks switch in the Layers menu), the trace path (Trace in the toolbar, on a selected element and
// on a Matrix cell; Escape clears it), an alternative's impact (the picture drawn over the saved design) and any other
// source — and repaints them on `aiw:model-marks` without laying out again; the Key lists every state drawn. Semantic
// zoom (notation.css, model-stage.js) keeps every drawn word at 9 px or more, and the companion reads the element the
// pointer rests on. The readings are two lines with More.
// Round 6 (R6-E, Contract F): a Build menu steps the picture up — by layer, along the lit trace, or by any mode another
// module registers through window.aiwNotationSteps — with Next, Back and Play; the steps are painted through the marks
// channel (source `build`: the step's elements traced, what is not yet revealed dimmed), the step's title stands under
// the toolbar, Escape clears, the state survives a redraw and the exported SVG never carries it. The Key lists the
// technology icons a picture draws (D.icons, node.icon).
import {notationDiagram, notationScenes, stripToLayers, focusDiagram, describeNode, describeEdge, notationDiff, viewpointOf, arrangementsFor, architectureArrangement, ALL_ARRANGEMENTS as ARRANGEMENTS, LAYERS, LAYER_NAMES, KINDS, styleOf, CONNECTED} from './notation-model.js';
import {iconsDrawn} from './technology-icons.js';
import {notationLayout, arrangeSelection, canSize, NL, sameFact, SCREEN_STAGE} from './notation-layout.js';
import {foldDiagram, overBudget, SCREEN_BUDGET, familyWord, countWords} from './figure-budget.js';
import {svgParts, notationSVG, legendData, diagramText, explainDiagram, exportName, figureManifest, SVG_STYLE, nodeMarkSVG, nodeMarkClass, edgeMarkClass, ghostsSVG, marksLegend, markClassList, liftSVG, drawnBundles, recordName, FAR} from './notation-svg.js';
import {setMarks, clearMarks, mergeMarks, mergeSources, marksInfo, marksVersion, markSources, MARK_WORDS, MARK_GLYPHS, isCheckState} from './model-marks.js';
import {chapterChecks} from './readiness-model.js';
import {codeFile, CODE_FORMATS} from './notation-code.js';
import {iconSVG, markerRef} from './notation-palette.js';
import {projectPreferenceKey, projectURL, onProjectSwitch, currentProject} from './project-context.js';
import {baselinePartNow} from './project-store.js';
import {esc} from './html-escape.js';
import {nextFrame, listen, inCompanion, openInWorkHTML, companionOf, zoomLevel, contentOf} from './model-stage.js';
// rc41 W3: modelling on the canvas — the ghost element placed with "Add … here", the port handle and the ghost line of a
// relationship, the kinds menu; the record is the chapter editor's (canvas-draft.js); nothing here writes the document.
import {addHereHTML, draftNoteHTML, ghostElementSVG, ghostLineSVG, portSVG, kindsMenuHTML, targetPickerHTML, targetCountWords, relationshipOffers, notOfferedLines, canConnectFrom, openDraft, cancelDraft, draftKind, draftLabel, draftTypesFor} from './canvas-draft.js';
import {arrangeControlHTML, mountArrangePanel, handleArrangeAction, handleArrangeKey, rememberLayout, arrangeSpacing, arrangeDirection} from './arrange-panel.js';
import {chapterLayers, layerSummary, layerCounts, edgeFamilies, layerOverview, hiddenNoteHTML, layersReadingHTML, viewpointProjection, viewpointGroupKeys, viewpointBand, viewpointBandTitle, hiddenBands, VIEW_BANDS, CONNECTION_LEVELS, STEPPED_LEVELS, isConnectionLevel, connectionLevelTitle, connectionLevelOf, levelRank, defaultConnectionLevel} from './layers-view.js';
import {tableModel, tableHTML, tableRecordHTML, TABLE_PAGE} from './model-table.js';
import {chapterOfRecord, typeCount} from './chapter-records.js';
import {historyWorkDestination} from './model-work-destination.js';
import {matrixModel, matrixHTML, matrixSets, cellHTML, MATRIX_DEFAULTS, isRecordType, setLabel, traceFrom} from './model-matrix.js';
import {traceStoryHTML} from './trace-narrative.js';
import {architectureModel} from './architecture-model.js';
import {inheritedFindings} from './review-domain.js';
import {perDocument} from './document-memo.js';
import {findRecord, homeChapter} from './chapter-reasoning.js';
import {deskSource, VSTATE} from './desk-vitals.js';
import {SHARED_VIEWS, sharedButtonsHTML, scenesOffered, resolveView, applyTray, draftActionHTML} from './instrument-tray.js';
// Round 24 (D-24-08): under the shell's module scope a chapter model hands this view the scope's projection
// (module-lens.js), so every picture, the connected model with its cap, the Table and the Matrix read the scope; the
// checks painted on them are the saved document's (baseOf). The module map is a shared sheet, drawn by module-ui.js,
// which is loaded on first use (as the rail loads it).
import {baseOf} from './module-lens.js';
export {SHARED_VIEWS};

const CHAPTER_OF = {requirement: 1, journey: 1, actor: 1, outcome: 1, task: 1, event: 1, gateway: 1, quality: 2, decision: 3, alternative: 3, responsibility: 4, module: 4, component: 5, system: 5, capability: 6, boundary: 6, technology: 7, contract: 8, data: 8, party: 8, control: 9, threat: 9, environment: 10, zone: 10, runtime: 10, instance: 10, path: 10, evidence: 11};
const PREFIX = 'nt';
// The shared views every chapter model offers after its own, in this order (round 3, D), are the instrument tray's
// (instrument-tray.js, round 11): one table serves the switchers and the help map.
const SHEETS = new Set(['table', 'cross', 'whole', 'modules']);
// The furthest zoom that keeps a picture's names at 10 px on screen (rc41, lead): far out (under 0.8) the names are drawn
// at FAR px, nearer at NL.TITLE px; rounded up to the next whole percent so they never read 9.9 px.
export const legibleZoom = zf => Math.ceil(1000 / (zf < 0.8 ? FAR : NL.TITLE)) / 100;
// The chapter's connected model, once per saved document: the own views read their elements' layers from it.
const connectedOf = perDocument((p, chapter) => notationDiagram(p, CONNECTED.id, {chapter}));
// The open checks on each record: the error and warning findings Validate lists (one reading per saved document).
const openChecks = perDocument(p => { const by = new Map(); let all = []; try { all = inheritedFindings(p) || []; } catch { all = []; } for (const f of all) { if (!['error', 'warning'].includes(f.level) || f.code === 'confirmation') continue; for (const id of new Set([f.objectId, ...(Array.isArray(f.objectIds) ? f.objectIds : [])].filter(Boolean))) { const x = by.get(id) || []; x.push(f); by.set(id, x); } } return by; });
// The chapter's checks as marks (Contract M, source `checks`): each passage of the chapter's register that stands for a
// record, with its state (pass | fix | confirm) and the first thing missing or to confirm. Read once per saved document.
export const checkMarks = perDocument((p, chapter) => {
  let C = null; try { C = chapterChecks(p, chapter); } catch { C = null; }
  return (C?.passages || []).filter(x => x.id && x.id !== 'project').map(x => ({id: x.id, state: x.status, note: x.status === 'fix' ? (x.fix[0]?.title || '') : x.status === 'confirm' ? (x.confirm[0]?.title || '') : '', href: x.url}));
});
// The record ids of the one model, for the trace's dimming.
const modelIds = perDocument(p => [...architectureModel(p).objects.keys()]);
// The alternative or change impact previewed in this chapter, if any (interface-impact-ui.js hands its document over).
const previewed = chapter => { try { const i = typeof window !== 'undefined' ? window.aiwInterfaceImpact : null; return i?.pending && i.previewInChapter?.(Number(chapter)) ? i : null; } catch { return null; } };
let anatomyModule = null, anatomyLoading = null;
const loadAnatomy = () => (anatomyLoading ??= import('./anatomy-view.js').then(m => { anatomyModule = m; return m; }).catch(e => { anatomyLoading = null; throw e; }));
let moduleUI = null, moduleUILoading = null;
const loadModuleUI = () => (moduleUILoading ??= import('./module-ui.js').then(m => { moduleUI = m; return m; }).catch(e => { moduleUILoading = null; throw e; }));

// ---------------------------------------------------------------- build-up (round 6, Contract F)
// A build mode turns a picture into steps: {title, steps(D, p) → [{title, marks: [{id, state}]}], available?(D, p) → true
// or a reason}. The kit ships two — by layer and along the lit trace — and other modules (plateaus) register their own
// through window.aiwNotationSteps.register(id, mode); list() names them in the order registered. A step's marks name the
// elements it reveals; the kit paints them traced and dims what no step up to it has revealed (source `build`).
export const BUILD_MS = 900;
const buildModes = new Map();
export function registerBuildMode(id, mode) {
  const key = String(id || '').trim();
  if (!key || !mode || typeof mode.steps !== 'function') throw Error('A build mode needs an id, a title and a steps(D, p) function.');
  buildModes.set(key, {id: key, title: String(mode.title || key), sub: String(mode.sub || ''), steps: mode.steps, available: typeof mode.available === 'function' ? mode.available : null});
  return key;
}
export const buildModeList = () => [...buildModes.values()].map(m => ({id: m.id, title: m.title, sub: m.sub}));
registerBuildMode('layer', {title: 'By layer', sub: 'one step per model layer in the picture', steps: D => LAYERS.filter(l => (D?.nodes || []).some(n => n.layer === l)).map(l => ({title: LAYER_NAMES[l], marks: D.nodes.filter(n => n.layer === l).map(n => ({id: n.id, state: 'traced'}))}))});
registerBuildMode('trace', {title: 'Along the trace', sub: 'one step per chain step of the lit trace',
  available: D => { const t = marksInfo('trace'); if (!t) return 'Light a trace first (Trace menu)'; const drawn = new Set((D?.nodes || []).map(n => n.id)); return (t.steps || []).some(st => st.records.some(r => drawn.has(r.id))) ? true : 'The lit trace touches nothing in this picture'; },
  steps: D => { const t = marksInfo('trace'), drawn = new Set((D?.nodes || []).map(n => n.id)); return (t?.steps || []).map(st => ({title: st.word + ': ' + st.records.map(r => r.ref).join(', '), marks: st.records.filter(r => drawn.has(r.id)).map(r => ({id: r.id, state: 'traced'}))})).filter(s => s.marks.length); }});
if (typeof window !== 'undefined') window.aiwNotationSteps = {register: registerBuildMode, list: buildModeList};

// The Key's entry for the technology icons a picture draws (Contract F): only when the picture names its icon set
// (D.icons) and an element carries one (node.icon); each icon once, with how many elements carry it.
export function iconKeyHTML(D) {
  if (!D?.icons) return '';
  const list = iconsDrawn(D); if (!list.length) return '';
  return `<h5 aria-level="4">Technology icons</h5>${list.map(i => `<p class="nt-icon-key" data-nt-icon="${esc(i.id)}"><i class="nt-k nt-ik" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${esc(i.path)}"/></svg></i>${esc(i.title)}${i.count > 1 ? ` <small>×${i.count}</small>` : ''}</p>`).join('')}`;
}

// ---------------------------------------------------------------- lines drawn together (round 10, N6)
// A picture's lines drawn together (L.bundles, notation-layout.js) as the screen reads them. A selected relationship's
// reading says which line it is drawn on, with each other relationship on that line (and each other record of the same
// fact) as a button that selects it; an element's reading lists the lines it shares; the hover reading says what a line
// carries. Only the bundles the renderer draws are read (every member names its bundle back, as notation-svg.js keeps
// them), so a reading never claims a line the picture does not draw. Pure: every view that draws the notation (the
// chapter models, the Running board, the perspectives) passes its own picture; `attr` names its controls' attribute.
const linesCache = new WeakMap(), NO_LINES = {E: new Map(), bundles: [], of: new Map(), byId: new Map()};
export function drawnLines(L) {
  if (!L || !L.bundles?.length) return NO_LINES;
  let v = linesCache.get(L); if (v) return v;
  const E = new Map((L.edges || []).map(e => [e.id, e])), bundles = drawnBundles(L), of = new Map();
  for (const b of bundles) for (const id of b.members) of.set(id, b);
  v = {E, bundles, of, byId: new Map(bundles.map(b => [b.id, b]))}; linesCache.set(L, v); return v;
}
const wordOf = e => e?.label || styleOf(e?.kind).label || e?.kind || 'related';
const nodeName = (D, id) => { const n = D?.nodes?.find(x => x.id === id); return n ? (n.fullTitle || n.title || id) : String(id); };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// The far end of a member as its button says it, with the record when the same end is reached more than once.
function memberText(D, b, m, E) {
  if (b.end === 'both') return recordName(m);
  const far = b.end === 'to' ? m.from : m.to, again = b.members.filter(id => { const x = E.get(id); return x && (b.end === 'to' ? x.from : x.to) === far; }).length > 1;
  return `${b.end === 'to' ? 'from' : 'to'} ${nodeName(D, far)}${again ? ' · ' + recordName(m) : ''}`;
}
const pickHTML = (D, attr, m, text) => `<button type="button" class="nt-pick" data-${attr}="edge-pick" data-id="${esc(m.id)}" title="${esc(describeEdge(D, m.id))}">${esc(text)}</button>`;
// The drawing note a relationship's own reading carries (the same words as its hit's accessible name).
export function lineNote(D, L, id) {
  const {E, of} = drawnLines(L), b = of.get(id), e = E.get(id); if (!b || !e) return '';
  const twin = b.members.some(m => m !== id && sameFact(E.get(m), e));
  if (b.end === 'both') return `Recorded more than once; this record: ${recordName(e)}.`;
  return `Drawn on one line with ${plural(b.members.length - 1, 'other ' + wordOf(e) + ' relationship')} ${b.end === 'to' ? 'to' : 'from'} ${nodeName(D, b.node)}.${twin ? ` Recorded more than once; this record: ${recordName(e)}.` : ''}`;
}
// A selected relationship drawn on a line with others: the line, the other relationships on it and the other records of
// the same fact, each a button that selects it. Empty when it is drawn on its own.
export function edgeLinesHTML(D, L, id, {attr = 'nt'} = {}) {
  const {E, of} = drawnLines(L), b = of.get(id), e = E.get(id); if (!b || !e) return '';
  const twins = b.members.filter(m => m !== id && sameFact(E.get(m), e)).map(m => E.get(m)), others = b.end === 'both' ? [] : b.members.filter(m => m !== id && !twins.some(t => t.id === m)).map(m => E.get(m)).filter(Boolean);
  const line = b.end === 'both' ? '' : `<p>Drawn on one line with ${esc(plural(b.members.length - 1, 'other ' + wordOf(e) + ' relationship'))} ${b.end === 'to' ? 'to' : 'from'} ${esc(nodeName(D, b.node))}.</p>${others.length ? `<p class="nt-picks">${others.map(m => pickHTML(D, attr, m, memberText(D, b, m, E))).join('')}</p>` : ''}`;
  const also = twins.length ? `<p>Also recorded as <span class="nt-picks">${twins.map(t => pickHTML(D, attr, t, recordName(t))).join('')}</span></p>` : '';
  return `<div class="nt-lines" data-nt-lines="${esc(b.id)}">${line}${also}</div>`;
}
// An element's lines drawn together: each fan it is the shared end of, and each fact recorded more than once that it takes
// part in, with every relationship on the line as a button that selects it.
export function nodeLinesHTML(D, L, id, {attr = 'nt'} = {}) {
  const {E, bundles} = drawnLines(L);
  const mine = bundles.filter(b => (b.end === 'both' ? [E.get(b.members[0])?.from, E.get(b.members[0])?.to].includes(id) : b.node === id));
  if (!mine.length) return '';
  const row = b => {
    const rep = E.get(b.members[0]), ms = b.members.map(m => E.get(m)).filter(Boolean);
    const head = b.end === 'both' ? `One line for ${b.members.length} records of: ${describeEdge(D, rep.id)}` : `One line for ${plural(b.members.length, wordOf(rep) + ' relationship')} ${b.end === 'to' ? 'to' : 'from'} it`;
    return `<li data-nt-lines="${esc(b.id)}"><span>${esc(head)}</span><span class="nt-picks">${ms.map(m => pickHTML(D, attr, m, memberText(D, b, m, E))).join('')}</span></li>`;
  };
  return `<section class="nt-lines nt-lines-node"><h4 aria-level="3">Lines drawn together<span>${mine.length}</span></h4><ul>${mine.map(row).join('')}</ul><p class="cm-muted">Each line is drawn once for the relationships on it; each relationship keeps its own record, reading and Tab stop.</p></section>`;
}
// The hover reading of a relationship, or of a line drawn for several (each of its relationships).
export function edgeHoverHTML(D, L, id) {
  if (!D?.edges?.some(e => e.id === id)) return '';
  const note = lineNote(D, L, id);
  return `<section class="nt-hover-read" ><h4 aria-level="3">Under the pointer · Relationship</h4><p>${esc(describeEdge(D, id))}</p>${note ? `<p class="cm-muted">${esc(note)}</p>` : ''}</section>`;
}
export function bundleHoverHTML(D, L, bundleId) {
  const {byId, E} = drawnLines(L), b = byId.get(bundleId); if (!b) return '';
  // (two records of one fact read alike: each is told apart by its record)
  const said = b.members.map(id => describeEdge(D, id)), twice = new Set(said.filter((s, i) => said.indexOf(s) !== i));
  return `<section class="nt-hover-read"><h4 aria-level="3">Under the pointer · One line, ${plural(b.members.length, 'relationship')}</h4><ul class="nt-hover-list">${b.members.map((id, i) => `<li>${esc(said[i])}${twice.has(said[i]) ? ' · ' + esc(recordName(E.get(id))) : ''}</li>`).join('')}</ul></section>`;
}
// The lift (round 10, liftSVG) composed in two: its routes over the lines and under the elements, so a selected, lit or
// traced relationship shows its whole way (trunk included) without covering an element's words where a straight line
// passes behind it; its end rings over the elements, so each ring reads whole at the box it touches.
const RING = /<circle class="nt-end"[^>]*\/>/g;
export function liftParts(markup) {
  if (!markup) return {under: '', over: ''};
  const rings = markup.match(RING) || [];
  return {under: rings.length ? markup.replace(RING, '') : markup, over: rings.length ? `<g class="nt-lift nt-lift-ends" aria-hidden="true" pointer-events="none">${rings.join('')}</g>` : ''};
}
// The elements `id` is related to by a path not in `shown` and by no path in `shown` (rc41: the "+N" badge's count).
export function hiddenNeighbours(edges, shown, id) {
  const seen = new Set(), hidden = new Set();
  for (const e of edges) { if (e.from !== id && e.to !== id) continue; const other = e.from === id ? e.to : e.from; (shown.has(e.id) ? seen : hidden).add(other); }
  let n = 0; for (const o of hidden) if (!seen.has(o)) n++; return n;
}
// The companion's reading under the pointer: replaced in place, or removed when `html` is empty.
export function hoverReadInto(host, html) {
  if (!host) return;
  const el = host.querySelector('.nt-hover-read');
  if (!html) { el?.remove(); return; }
  if (el) el.outerHTML = html; else host.insertAdjacentHTML('afterbegin', html);
}

// Options: `annotations(D)` gives callouts a chapter wants on its picture ({id, targetId, text, severity,
// proposed}); `environment()` gives the environment the page above has chosen, which the Deployment and
// Technology usage pictures then follow instead of offering their own picker. `ownPicture()` (round 10) gives the
// picture a chapter draws itself through the same renderer in the same stage ({D, L, full, sel, selEdge}, the desk's
// Running board), so the reading under the pointer reads that picture, not this module's last one.
export function createNotation({chapter, root, stage, project, onSelect = null, annotations = null, environment = null, objectId = null, ownPicture = null}) {
  const pref = () => projectPreferenceKey('aiw-notation-v2-ch' + chapter);
  const scenes = notationScenes(chapter);
  // The picture's state: its defaults, then this browser's preferences for the chapter in the project on screen.
  const freshState = () => ({view: 'diagram', driver: null, layersBy: {}, checksOff: {}, edgeOff: [], emphasisBy: {}, revealBy: {}, legacyPins: [], table: {sort: 'ref', dir: 1, filter: '', limit: TABLE_PAGE}, cross: {rows: null, cols: null, cell: null, filter: {rows: '', cols: ''}}, scene: scenes[0]?.id || null, arrangement: null, layers: [...LAYERS], pins: {}, sizes: {}, snap: true, hub: null, environmentId: null, menu: null, toolsOpen: false, selEdge: null, focus: null, drill: null, unfold: null, pair: null, pairLimit: 40, edgeReveal: null, find: '', baseline: null, vitals: false, overlays: {findings: false, notes: true, proposed: true}, notes: [], history: [], build: null});
  const readPreferences = state => { try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); state.legacyPins = Array.isArray(v.legacyPins) ? v.legacyPins.filter(k => typeof k === 'string') : Object.keys(v.pins || {}).filter(k => Object.keys(v.pins[k] || {}).length); if (scenes.some(s => s.id === v.scene)) state.scene = v.scene; if (ARRANGEMENTS.some(a => a.id === v.arrangement)) state.arrangement = v.arrangement; if (Array.isArray(v.layers)) state.layers = v.layers.filter(l => LAYERS.includes(l)); if (typeof v.driver === 'string') state.driver = v.driver; if (v.pins && typeof v.pins === 'object') state.pins = v.pins; if (v.sizes && typeof v.sizes === 'object' && !Array.isArray(v.sizes)) state.sizes = v.sizes; if (v.snap === false) state.snap = false; if (typeof v.hub === 'string') state.hub = v.hub; if (typeof v.environmentId === 'string') state.environmentId = v.environmentId; if (Array.isArray(v.notes)) state.notes = v.notes.slice(0, 200); if (v.overlays) state.overlays = {...state.overlays, ...v.overlays}; if (v.layersBy && typeof v.layersBy === 'object') for (const [k, l] of Object.entries(v.layersBy)) if (Array.isArray(l)) state.layersBy[k] = l.filter(x => LAYERS.includes(x)); if (v.checksOff && typeof v.checksOff === 'object') for (const [k, off] of Object.entries(v.checksOff)) if (off === true) state.checksOff[k] = true; if (v.emphasisBy && typeof v.emphasisBy === 'object') for (const [k, f] of Object.entries(v.emphasisBy)) if (isConnectionLevel(f)) state.emphasisBy[k] = f; if (v.revealBy && typeof v.revealBy === 'object') for (const [key, n] of Object.entries(v.revealBy)) if (Number.isFinite(n) && n >= 0) state.revealBy[key] = Math.floor(n); if (Array.isArray(v.edgeOff)) state.edgeOff = v.edgeOff.filter(x => typeof x === 'string').slice(0, 20); if (v.table && typeof v.table === 'object') { if (typeof v.table.sort === 'string') state.table.sort = v.table.sort; if (v.table.dir === -1) state.table.dir = -1; if (v.table.showEmpty === true) state.table.showEmpty = true; } if (v.cross && typeof v.cross === 'object') { if (isRecordType(v.cross.rows)) state.cross.rows = v.cross.rows; if (isRecordType(v.cross.cols)) state.cross.cols = v.cross.cols; } } catch { /* preferences are optional */ } };
  const state = freshState(); readPreferences(state);
  const save = () => { try { localStorage.setItem(pref(), JSON.stringify({driver: state.driver, layersBy: state.layersBy, checksOff: state.checksOff, edgeOff: state.edgeOff, emphasisBy: state.emphasisBy, revealBy: state.revealBy, legacyPins: state.legacyPins, table: {sort: state.table.sort, dir: state.table.dir, showEmpty: !!state.table.showEmpty}, cross: {rows: state.cross.rows, cols: state.cross.cols}, scene: state.scene, arrangement: state.arrangement, layers: state.layers, pins: state.pins, sizes: state.sizes, snap: state.snap, hub: state.hub, environmentId: state.environmentId, notes: state.notes, overlays: state.overlays})); } catch { /* optional */ } };
  const restoreMenuControl = (kind, id = null) => nextFrame(() => {
    if (!state.menu) return;
    const selector = `.nt-pop [data-nt="${CSS.escape(kind)}"]${id == null ? '' : `[data-id="${CSS.escape(id)}"]`}`;
    const control = root.querySelector(selector);
    (control && !control.disabled ? control : root.querySelector(`[data-nt="menu"][data-id="${CSS.escape(state.menu)}"]`))?.focus({preventScroll: true});
  });
  const selected = new Set(), sheetCameras = new Map(); let arrangeMessage = '';
  let D = null, L = null, layoutOptions = null, full = null, sel = null, selectionChanged = false, lastSVG = '', renders = 0, storyOpen = null, fold = null, traceAutoExpanded = false;
  // An overview holds up to this many groups; a group opened holds up to the screen's budget.
  const SCREEN_OVERVIEW = 60, SCREEN_PAGE = 1320, DIAGRAM_OVERVIEW = {nodes: 24, edges: 64}, LAYERS_OVERVIEW = {nodes: 18, edges: 24};
  // Another project opened in place (round 4, A): the picture lets go of the last project's choices (layers per
  // picture, hidden relationship families, table sort, Matrix pair, scene, arrangement, pins, notes, overlays) and reads
  // the new project's own; nothing of the last project is drawn or saved under the new project's key. One hook for every
  // chapter model, since each draws its notation through this instance; the view the chapter shows is the chapter's.
  // The pictures drawn for the last project (the diagram, and a sheet kept hidden behind another view) go with it.
  // A draft in progress belongs to the last project's picture too (rc41 close: its kinds menu was drawn again over the new
  // project's picture with the old project's records); its editor, if open, is closed by the shell's own leave.
  onProjectSwitch(() => { const was = draft; draft = null; if (was) cancelDraft(); const next = freshState(); readPreferences(next); for (const k of Object.keys(state)) delete state[k]; Object.assign(state, next); D = null; L = null; full = null; sel = null; selected.clear(); arrangeMessage = ''; lastSVG = ''; traceAutoExpanded = false; stopBuild();
    sheetCameras.clear(); root.classList.remove('nt-sheet-on'); for (const el of root.querySelectorAll('.cm-sheet')) { delete el.dataset.anatomy; delete el.dataset.ntSheet; el.style.removeProperty('zoom'); el.scrollTop = el.scrollLeft = 0; el.replaceChildren(); } for (const el of root.querySelectorAll('.cm-svg, .cm-html')) el.replaceChildren(); });
  // One layer model (round 3, D): the sidebar's model layers and every view's Layers menu are one setting, kept per
  // chapter and picture — each diagram scene has its own, and the connected model (Layers, Table, Matrix) its own.
  const layerKey = () => (state.view === 'diagram' ? 'scene:' + (scene()?.id || '') : 'connected');
  const layersNow = () => { const v = state.layersBy[layerKey()]; return Array.isArray(v) ? v : [...LAYERS]; };
  const setLayers = list => { const next = LAYERS.filter(l => list.includes(l)); state.layersBy[layerKey()] = next; state.layers = next; };
  // Connection visibility is independent of scope and geometry. The reader can reveal recorded
  // paths six at a time without moving the objects or opening any group. Ordered notation keeps
  // its complete sequence by default. Hidden-path counts make partial views explicit at each node.
  // The per-level budget (rc41, W1): a stepped level whose own paths exceed LEVEL_BUDGET opens with its first LEVEL_BUDGET
  // (orderedConnections' order, which round-robins the relation roles); Reveal next adds inside the level before going
  // beyond it, so a dense level opens calm and the reader walks it in the same steps as the paths beyond.
  const REVEAL_STEP = 6, LEVEL_BUDGET = 12;
  // The level this view opens at and the one chosen (rc40, W1: layers-view.js CONNECTION_LEVELS; a saved level is kept per
  // view in emphasisBy, as before). Reveal next counts per level, so stepping down and back up starts the count afresh.
  const levelDefault = () => defaultConnectionLevel(D, {layers: state.view === 'layers'});
  const levelNow = () => { const c = state.emphasisBy[layerKey()]; return isConnectionLevel(c) ? c : levelDefault(); };
  const revealKey = () => `${layerKey()}|${state.drill || state.focus?.id || state.edgeReveal || state.unfold || 'overview'}|${levelNow()}`;
  const orderedConnections = () => {
    const sceneId = state.view === 'layers' ? 'connected' : scene()?.id;
    const preferred = {connected: ['realization', 'influence', 'serving', 'flow'], motivation: ['influence', 'realization'], drivers: ['influence', 'realization'], rationale: ['influence', 'realization'], logical: ['flow', 'realization'], application: ['realization', 'serving', 'composition'], solution: ['serving', 'dependency'], stack: ['realization', 'serving', 'dependency'], integration: ['flow', 'dependency'], cooperation: ['flow', 'dependency'], data: ['access'], lineage: ['access'], security: ['protection', 'threat'], deployment: ['assignment', 'path'], usage: ['realization', 'assignment', 'serving']}[sceneId] || [];
    const byId = new Map(D.nodes.map(n => [n.id, n])), groups = new Map();
    for (const e of D.edges) {
      const family = styleOf(e.kind).family; if (state.edgeOff.includes(family)) continue;
      const a = byId.get(e.from), b = byId.get(e.to), role = n => D.viewLevels ? n?.level : viewpointBand(n);
      const key = `${family}|${role(a)}|${role(b)}`;
      if (!groups.has(key)) groups.set(key, {family, edges: []}); groups.get(key).edges.push(e.id);
    }
    const order = [...groups.values()].sort((a, b) => (preferred.includes(a.family) ? preferred.indexOf(a.family) : 99) - (preferred.includes(b.family) ? preferred.indexOf(b.family) : 99));
    // Round-robin across relation roles exposes the architecture chain before adding more detail
    // to one dense family; ties retain source order, so repeated reveals are predictable.
    const paths = []; for (let i = 0; order.some(g => g.edges.length > i); i++) for (const group of order) if (group.edges[i]) paths.push(group.edges[i]);
    return paths;
  };
  // What the picture shows (rc40, W1): the level's own paths (Structure, Adjacent: layers-view.js connectionLevelOf; All:
  // every path; Selected: the held element's), plus, under a stepped level, the paths beyond it the reader has revealed
  // six at a time (orderedConnections' order), without moving an element. `hidden` is what the level still keeps back.
  // rc41 (W1): under a stepped level the level's own paths are shown LEVEL_BUDGET at first (orderedConnections' order) and
  // Reveal next fills the level (`levelHidden`: what the level itself still keeps back) before it adds the paths beyond.
  const emphasisFor = () => {
    if (!D || !['diagram', 'layers'].includes(state.view)) return null;
    const families = edgeFamilies(D), total = D.edges.length, chosen = levelNow();
    const selected = !!sel && D.nodes.some(n => n.id === sel), completeNotation = ['process', 'sequence', 'lifecycle'].includes(D.scene?.id);
    const mode = chosen === 'neighbourhood' && !selected ? levelDefault() : completeNotation && STEPPED_LEVELS.includes(chosen) ? 'all' : chosen;
    const stepped = STEPPED_LEVELS.includes(mode), off = e => state.edgeOff.includes(styleOf(e.kind).family);
    const levels = stepped ? connectionLevelOf(D) : null, rank = levelRank(mode);
    const base = mode === 'none' ? [] : mode === 'all' ? D.edges : mode === 'neighbourhood' ? D.edges.filter(e => e.from === sel || e.to === sel) : D.edges.filter(e => !off(e) && levelRank(levels.get(e.id)) <= rank);
    const own = new Set(base.map(e => e.id));
    if (!stepped) return {paths: own, mode, level: mode, stepped, families, total, active: own.size, selected, levelPaths: base.length, levelShown: base.length, levelHidden: 0, hidden: 0, budget: LEVEL_BUDGET, next: 0};
    const ordered = orderedConnections(), inLevel = ordered.filter(id => own.has(id)), beyond = ordered.filter(id => !own.has(id)), walk = [...inLevel, ...beyond];
    const opening = inLevel.length > LEVEL_BUDGET ? LEVEL_BUDGET : inLevel.length, reach = opening + (state.revealBy[revealKey()] || 0);
    // (rc41 close, C6: the reader's focus is drawn whatever the budget keeps back — the selected element's own paths at the
    // level, the relationship picked on the picture or from a reading, and every lit relationship of the trace or the
    // build-up step — added to the budget's paths, never shifting them; it is counted in the level's and the beyond counts,
    // so the caption, the Key and Sol's packet stay exact, and Reveal next walks on to the next six paths not yet drawn)
    const paths = new Set([...walk.slice(0, reach), ...focusPaths(own)]);
    const levelShown = inLevel.filter(id => paths.has(id)).length, beyondShown = beyond.filter(id => paths.has(id)).length;
    const levelHidden = inLevel.length - levelShown, hidden = beyond.length - beyondShown, next = Math.min(REVEAL_STEP, levelHidden + hidden);
    let advance = 0; for (let i = reach, n = 0; i < walk.length && n < next; i++) { advance++; if (!paths.has(walk[i])) n++; }
    return {paths, mode, level: mode, stepped, families, total, active: paths.size, selected, levelPaths: inLevel.length, levelShown, levelHidden, hidden, budget: LEVEL_BUDGET, next, advance};
  };
  // The reader's focus under a stepped level (rc41 close, C6): what the picture must draw for the selection, the picked
  // relationship and the lit chain to read at all. `own` is the level's own paths (the relationship kinds switched off are
  // not among them, and a trace keeps to the kinds shown); a relationship picked by name is drawn whatever its kind.
  // While a build-up runs, the trace's own marks step aside (marksFor) but its chain stays drawn: the build-up lights the
  // chain a step at a time over the same lines, it does not put them back behind the budget (rc41 close, C6 fix-up).
  const focusPaths = own => {
    const out = new Set(), off = new Set(state.edgeOff);
    if (sel) for (const e of D.edges) if ((e.from === sel || e.to === sel) && own.has(e.id)) out.add(e.id);
    if (state.selEdge && D.edges.some(e => e.id === state.selEdge)) out.add(state.selEdge);
    const lights = M => { if (M.size) for (const e of D.edges) if (!off.has(styleOf(e.kind).family) && edgeMarkClass(M.get(e.from), M.get(e.to)) === ' nt-mk-lit') out.add(e.id); };
    lights(marksNow());
    if (marksInfo('trace') && marksInfo('build')) lights(traceMarksNow());
    return out;
  };
  // The caption, the Key and Sol's packet read the same words: "12 of 41 links shown · Adjacent · 29 more at this level",
  // then, once the level is complete, "… · N beyond".
  const levelWords = em => (em.levelHidden ? ` · ${em.levelHidden} more at this level` : em.hidden ? ` · ${em.hidden} beyond` : '');
  const connectionCaption = em => !em ? '' : (fold ? `${em.active} of ${em.total} paths · ${fold.whole.edges.length} recorded links` : `${em.active} of ${em.total} links shown`) + (em.mode === 'neighbourhood' ? ' · selected element' : em.stepped ? ` · ${connectionLevelTitle(em.mode)}${levelWords(em)}` : '');
  // Its title says what the step adds: the level's own paths first, then, when the level holds fewer than the step, the rest
  // from beyond it (rc41 close: "Reveal 2 more of the Adjacent level's 13 paths (1 not yet shown)" claimed two of one).
  const revealHTML = em => (em?.next ? `<button type="button" class="nt-reveal-next" data-nt="connections-more" title="${esc(em.levelHidden ? `Reveal ${Math.min(em.next, em.levelHidden)} more of the ${connectionLevelTitle(em.mode)} level's ${em.levelPaths} paths (${em.levelHidden} not yet shown)${em.next > em.levelHidden ? ` and ${em.next - em.levelHidden} beyond it` : ''} without moving or expanding elements` : `Reveal ${plural(em.next, 'more recorded path')} beyond the ${connectionLevelTitle(em.mode)} level without moving or expanding elements`)}">Reveal next ${em.next}</button>` : '');
  // Reveal next says what it would add to what the picture draws now. paintConnections says it again in place beside the
  // caption, since a marks change (a build-up's step, a trace lit from another view) changes the lines drawn without a
  // render (rc41 close, C6).
  const sayRevealNext = em => {
    const box = root.querySelector('.nt-connections'); if (!box) return;
    const btn = box.querySelector('[data-nt="connections-more"]'), html = revealHTML(em);
    if (!html) btn?.remove(); else if (!btn) box.insertAdjacentHTML('beforeend', html);
    else { const t = document.createElement('template'); t.innerHTML = html; const fresh = t.content.firstElementChild; if (btn.textContent !== fresh.textContent) btn.textContent = fresh.textContent; if (btn.title !== fresh.title) btn.title = fresh.title; }
  };
  const chooseConnections = mode => {
    if (!isConnectionLevel(mode)) return;
    if (mode === 'neighbourhood' && !emphasisFor()?.selected) { api.announce('Select an individual element to show its direct connections.'); return; }
    state.emphasisBy[layerKey()] = mode; state.menu = null;
    if (mode === 'all') state.edgeOff = [];
    if (STEPPED_LEVELS.includes(mode)) state.revealBy[revealKey()] = 0;
    save(); api.onChange?.();
    api.announce(`${connectionLevelTitle(mode)}: ${connectionCaption(emphasisFor())}`);
    nextFrame(() => root.querySelector(`[data-nt="connections"][data-id="${mode}"]`)?.focus({preventScroll: true}));
  };
  const revealConnections = () => {
    const em = emphasisFor(); if (!em?.next) return;
    state.revealBy[revealKey()] = (state.revealBy[revealKey()] || 0) + em.advance;
    if (em.active + em.next === em.total) state.emphasisBy[layerKey()] = 'all';
    save(); api.onChange?.(); api.announce(connectionCaption(emphasisFor()));
    nextFrame(() => (root.querySelector('[data-nt="connections-more"]') || root.querySelector('[data-nt="connections"][data-id="all"]'))?.focus({preventScroll: true}));
  };
  const openedLaneMembers = () => {
    const key = state.view === 'layers' && fold?.X?.fold.group.key, group = key && fold.F.groups.find(g => g.key === key);
    return group ? {group, members: fold.whole.nodes.filter(n => group.members.includes(n.id))} : null;
  };
  const focusLayerMember = id => {
    const n = (fold?.whole || full)?.nodes.find(n => n.id === id && !n.fold); if (!n) return false;
    state.focus = {id, hops: 1}; state.unfold = 'connected'; state.drill = null; state.pair = null; state.edgeReveal = null; state.selEdge = null;
    state.emphasisBy.connected = 'neighbourhood'; state.menu = null; save(); onSelect?.(id); api.onChange?.(true);
    api.announce(`${n.title}: its direct neighbours and recorded connections. The Layers overview link returns to all concern bands.`);
    return true;
  };
  // The Checks switch (round 5): the chapter's checks painted on this picture, on by default, kept per chapter and picture
  // like the layers.
  const checksOn = () => !state.checksOff[layerKey()];
  // The marks this picture paints: every source merged by Contract M's precedence, the checks only while switched on.
  // While a build-up runs, the trace's own marks step aside (the build paints the trace step by step); the exported SVG
  // (export: true) never carries the build-up.
  let marksCache = null;
  const marksFor = ({export: forExport = false} = {}) => {
    const building = !forExport && !!marksInfo('build');
    const M = mergeMarks([...(checksOn() ? [] : ['checks']), ...(building ? ['trace'] : []), ...(forExport ? ['build'] : [])]);
    // While a trace is lit, whatever the picture draws off it is dimmed, records or not (a party, a group's stand-in).
    if (marksInfo('trace') && !building) for (const n of full?.nodes || []) if (!M.has(n.id)) M.set(n.id, {id: n.id, state: null, dimmed: true, ghost: false, notes: [], sources: ['trace'], glyph: '', word: ''});
    return M;
  };
  const marksNow = () => {
    if (marksCache && marksCache.k === marksVersion() + '|' + checksOn() && marksCache.full === full) return marksCache.M;
    const M = marksFor();
    marksCache = {k: marksVersion() + '|' + checksOn(), full, M}; return M;
  };
  // The trace's own marks alone (its chain, while a build-up paints over it: focusPaths).
  let traceCache = null;
  const traceMarksNow = () => (traceCache?.k === marksVersion() ? traceCache.M : (traceCache = {k: marksVersion(), M: mergeMarks(markSources().filter(src => src !== 'trace'))}).M);
  // Every source's own words for the Key (an alternative's "Changed by this alternative", the trace's start, the build-up's step).
  const markWords = ({export: forExport = false} = {}) => Object.assign({}, ...markSources().filter(src => !forExport || src !== 'build').map(src => marksInfo(src)?.words || {}));
  // A reading's two lines (Contract G): each one line, the whole of it in its title; the rest goes under More.
  const leadHTML = (a, b) => `<p class="nt-lead"><span title="${esc(a)}">${esc(a)}</span>${b ? `<span title="${esc(b)}">${esc(b)}</span>` : ''}</p>`;
  // The checks on the drawn elements, in the shared glyphs and words: the second line of every reading.
  const checksLine = (nodes = D?.nodes || []) => {
    if (!checksOn()) return 'Checks switched off (Visibility menu)';
    const M = marksNow(), n = {fix: 0, confirm: 0, pass: 0};
    for (const x of nodes) { const m = M.get(x.id), c = m?.notes.find(k => k.source === 'checks'); if (c && isCheckState(c.state)) n[c.state]++; }
    const parts = ['fix', 'confirm', 'pass'].filter(k => n[k]).map(k => `${MARK_GLYPHS[k]} ${n[k]} ${MARK_WORDS[k]}`);
    return parts.length ? 'Checks on these displayed records: ' + parts.join(' · ') : 'No chapter check is mapped to these displayed elements; Validate shows the chapter’s full findings';
  };
  // Publishing the chapter's checks on every draw (unchanged checks announce nothing).
  const publishChecks = p => { if (p) setMarks('checks', checkMarks(baseOf(p), chapter), {chapter: Number(chapter)}); };
  // The previewed alternative's impact: what it changes, ringed (source `impact`); withdrawn when the preview ends.
  let impactMarked = false;
  const publishImpact = (imp, ids) => {
    if (!imp) { if (impactMarked) { impactMarked = false; clearMarks('impact'); } return; }
    const changed = new Set();
    try { const g = imp.decorate({nodes: [...ids].map(id => ({id, attrs: {}})), edges: []}); for (const n of g.nodes) if (n.changeImpact || n.ghost) changed.add(n.id); } catch { /* the preview decorates what it can */ }
    impactMarked = true; setMarks('impact', [...changed].map(id => ({id, state: 'changed', note: 'Changed by this alternative'})), {words: {changed: 'Changed by this alternative'}});
  };
  // The shell's subject strip released what the reader held (round 11, A): the chapter model lets go of its selection.
  window.addEventListener('aiw:subject-release', () => { if (root.isConnected) onSelect?.(null); });
  window.addEventListener('aiw:model-layers', e => { if (!root.isConnected || state.view === 'whole' || !(Array.isArray(e.detail) || e.detail === 'chapter')) return; const next = e.detail === 'chapter' ? chapterLayers(chapter) : LAYERS.filter(l => e.detail.includes(l)); if (next.join() === layersNow().join()) return; setLayers(next); save(); api.onChange?.(true); });
  // The sidebar's "Open picture layer filters" opens the Visibility menu with the keyboard on its first layer; the shell
  // redraws the page after it dispatches the event, so the keyboard is put there again once that redraw has settled.
  window.addEventListener('aiw:open-model-layers', () => {
    if (!root.isConnected || !['diagram', 'layers', 'table', 'cross', 'modules'].includes(state.view)) return;
    state.menu = 'layers'; state.toolsOpen = true; api.onChange?.();
    const into = () => { if (state.menu !== 'layers') return; const menu = root.querySelector('[data-nt-menu="layers"]'); if (!menu) return; menu.scrollIntoView({block: 'nearest'}); const first = menu.querySelector('.nt-pop input:not(:disabled),.nt-pop button:not(:disabled)'); if (first && !menu.contains(document.activeElement)) first.focus({preventScroll: true}); };
    requestAnimationFrame(into); setTimeout(into, 150);
  });
  const pictureTitle = () => withNote(state.view === 'diagram' ? scene()?.title || 'Diagram' : state.view === 'layers' ? 'Layers · connected model' : state.view === 'table' ? 'Table · Chapter ' + chapter + ' records' : state.view === 'cross' ? 'Matrix' : state.view === 'modules' ? 'Module map' : 'Whole design');
  const tellSidebar = () => { try { window.aiwSetModelLayers?.(layersNow(), {...layerSummary({chapter, view: state.view, picture: pictureTitle(), full, D: fold?.whole || D, layers: layersNow()}), model: state.view, filterMenu: state.view !== 'whole'}); } catch { /* the sidebar is optional */ } };
  const hiddenLanes = () => (full ? LAYERS.filter(l => !layersNow().includes(l)).map(l => ({layer: l, count: full.nodes.filter(n => n.layer === l).length})).filter(c => c.count) : []);
  // The pictures this project can draw (instrument-tray.js, round 11): a picture whose records do not exist yet is not
  // in the picker, and the current picture falls back to the first offered when it is not among them.
  const offeredScenes = () => { const p = project(); return p ? scenesOffered(p, chapter) : {offered: scenes, later: []}; };
  const scene = () => { const so = offeredScenes().offered; return so.find(s => s.id === state.scene) || so[0] || scenes[0]; };
  // A view asked for by a deep link that this project cannot draw, or a retired view: the chapter's default opens
  // instead and the picture's name says so (the shell's "You are here" line reads it), until a view is chosen by hand.
  let fallbackNote = '';
  const withNote = title => (fallbackNote ? title + ' · ' + fallbackNote : title);
  // Keep an explicit arrangement or an existing manually arranged scene. New pictures can then choose
  // the arrangement justified by their recorded boundaries, levels, hubs or interaction direction.
  const arrangement = () => {
    if (state.view === 'layers') return 'by-layer';
    const offered = full ? arrangementsFor(full).map(a => a.id) : ARRANGEMENTS.map(a => a.id), legacy = scene()?.arrangement;
    const kept = k => Object.keys(state.pins[k] || {}).length || Object.keys(state.sizes[k] || {}).length;
    const hasPositions = kept(`${state.scene}|${legacy}`) || (legacy === 'layered' && kept(`${state.scene}|layered|across`));
    return [state.arrangement, hasPositions ? legacy : null, full && architectureArrangement(full).id, legacy, 'tree'].find(a => a && offered.includes(a));
  };
  // The positions and sizes a person pinned are kept per picture and arrangement, and (rc41 close, C23) a Layered picture's
  // per direction: its bands stand as rows or as columns, so a pin made in one direction lies outside the other's bands
  // (applyPins drops it) and a pin made in the other would overwrite it. Left to right keeps its own; Top to bottom keeps
  // the key it always had.
  const pinKey = () => { if (state.view === 'layers') return `${CONNECTED.id}|by-layer`; const a = arrangement(); return `${state.scene}|${a}${arrangeDirection(state, chapter, a) === 'across' ? '|across' : ''}`; };
  const pins = () => state.pins[pinKey()] || {};
  const sizes = () => state.sizes[pinKey()] || {};
  const selectedIds = () => [...(selected.size ? selected : sel ? [sel] : [])].filter(id => L?.nodes.some(n => n.id === id) && D?.nodes.some(n => n.id === id && !n.fold));
  // ---------------------------------------------------------------- modelling on the canvas (rc41, W3)
  // `draft` is this picture's presentation state while a person adds an element or draws a relationship; it is never
  // saved with the preferences, never a pin, never a record, never exported. Modes: place (awaiting the click that puts
  // the ghost down), ghost (the ghost stands while the chapter editor is open on Work), connect (a line dragged from a
  // port), kinds (the menu of the kinds the standard allows for the pair), targets (the keyboard path's target list),
  // link (the ghost line stands while the owning chapter's editor is open). canvas-draft.js owns the editor hand-over.
  let draft = null;
  const onPicture = () => ['diagram', 'layers'].includes(state.view) && api.owns(state.view) && !!L && !!D;
  const worldPoint = e => { const svg = root.querySelector('.cm-svg'), r = svg.getBoundingClientRect(), z = stage.cam.z || 1; return {x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z}; };
  const stagePoint = e => { const st = root.querySelector('.cm-stage'), r = st.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; };
  const centreOf = id => { const b = L?.nodes.find(n => n.id === id); return b ? {x: b.x + b.w / 2, y: b.y + b.h / 2} : null; };
  const ensureAddEntries = () => {
    const menu = root.querySelector('.cm-add > div'); if (!menu) return;
    const html = addHereHTML(chapter, {view: state.view}); let box = menu.querySelector('.nt-add-here');
    if (!box) { box = document.createElement('div'); box.className = 'nt-add-here'; menu.prepend(box); }
    if (box.innerHTML !== html) box.innerHTML = html;
  };
  // The port handle on the hovered and the selected element (an element a relationship can start from).
  const portable = id => onPicture() && D.nodes.some(n => n.id === id && !n.fold && canConnectFrom(n.type));
  const paintPorts = (hover = null) => {
    const svg = root.querySelector('.cm-svg'); if (!svg) return;
    const keep = new Set([sel, hover].filter(id => id && !draft && portable(id)));
    // The handles stand in a layer of their own above the relationship hits, so a press reaches them.
    let layer = svg.querySelector(':scope > .nt-ports');
    if (!keep.size) { layer?.remove(); return; }
    if (!layer) { layer = document.createElementNS('http://www.w3.org/2000/svg', 'g'); layer.setAttribute('class', 'nt-ports'); svg.append(layer); }
    for (const g of layer.querySelectorAll('.nt-port')) if (!keep.has(g.dataset.ntPort)) g.remove();
    for (const id of keep) { const b = L.nodes.find(n => n.id === id); if (b && !layer.querySelector(`.nt-port[data-nt-port="${CSS.escape(id)}"]`)) layer.insertAdjacentHTML('beforeend', portSVG(b.w, b.h, id, {x: b.x, y: b.y})); }
  };
  // The ghost, the line, the status line and the menus, drawn from `draft` after every render and every step.
  const paintDraft = ({back = null} = {}) => {
    const svg = root.querySelector('.cm-svg'), st = root.querySelector('.cm-stage'); if (!svg || !st) return;
    for (const el of svg.querySelectorAll('.nt-draft-ghost, .nt-draft-line')) el.remove();
    // The keyboard goes back to the element the draft started from before its menu leaves (a control removed while it
    // holds the focus is moved by the blur handling and cannot then be removed).
    const active = document.activeElement;
    if (active && active.closest?.('.nt-draft-menu, .nt-draft-note') && st.contains(active)) (svg.querySelector(`.nt-node[data-nt-node="${CSS.escape(draft?.from || back || sel || '')}"]`) || root.querySelector('.cm-stage'))?.focus?.({preventScroll: true});
    for (const el of st.querySelectorAll(':scope > .nt-draft-note, :scope > .nt-draft-menu')) el.remove();
    for (const el of svg.querySelectorAll('.nt-drop-target, .nt-drop-refused')) el.classList.remove('nt-drop-target', 'nt-drop-refused');
    root.classList.toggle('nt-placing', draft?.mode === 'place');
    selectionTools(); // the one-element toolbar steps aside while a draft is in progress
    if (!draft || !onPicture()) return;
    const d = draft, note = html => st.insertAdjacentHTML('beforeend', html);
    if (d.mode === 'place') note(draftNoteHTML(`Click where the new ${draftLabel(d.type).toLowerCase()} should stand · Escape cancels`, {place: true}));
    if (d.mode === 'ghost' && d.ghost.pinKey === pinKey()) { svg.insertAdjacentHTML('beforeend', ghostElementSVG({...d.ghost, type: d.type, far: FAR})); note(draftNoteHTML(`A new ${draftLabel(d.type).toLowerCase()} is being recorded in the Chapter ${chapter} editor; it stands here once saved`)); }
    if (d.mode === 'connect' || d.mode === 'kinds' || d.mode === 'link') { const l = d.line; svg.insertAdjacentHTML('beforeend', ghostLineSVG(l.x1, l.y1, l.x2, l.y2, {state: d.mode === 'connect' ? (d.target ? (d.ok ? 'ok' : 'refused') : '') : 'ok'})); }
    if (d.mode === 'connect') { note(draftNoteHTML('Drop on another element to record a relationship · Escape cancels')); if (d.target) svg.querySelector(`.nt-node[data-nt-node="${CSS.escape(d.target)}"]`)?.classList.add(d.ok ? 'nt-drop-target' : 'nt-drop-refused'); }
    if (d.mode === 'link') note(draftNoteHTML('The relationship is being recorded in its chapter’s editor; it is drawn here once saved'));
    if (d.mode === 'kinds' || d.mode === 'targets') {
      st.insertAdjacentHTML('beforeend', d.mode === 'kinds' ? kindsMenuHTML(d.result) : targetPickerHTML(D.nodes.find(n => n.id === d.from) || {id: d.from}, D.nodes));
      const m = st.querySelector(':scope > .nt-draft-menu'), w = m.offsetWidth || 280, h = m.offsetHeight || 200, at = d.at || {x: st.clientWidth / 2 - w / 2, y: 56};
      m.style.left = Math.round(Math.max(8, Math.min(st.clientWidth - w - 8, at.x))) + 'px'; m.style.top = Math.round(Math.max(8, Math.min(st.clientHeight - h - 8, at.y))) + 'px';
      // The wheel and a press on the menu are the menu's own (rc41 close: they panned the picture behind it, so the
      // target list did not scroll): model-stage.js leaves an element marked data-cm-scroll to the browser.
      m.dataset.cmScroll = '';
      // The keyboard goes into the menu: its Find box, its first kind, or a refused pair's Close (data-nt-focus).
      nextFrame(() => (m.querySelector('[data-nt-focus], input, [role="menuitem"]'))?.focus({preventScroll: true}));
    }
  };
  // Where the keyboard returns when a placement ends without a record (rc41 close): the Add control it was started from.
  const addOpener = kind => (kind === 'bar' ? root.querySelector('[data-nt="menu"][data-id="add-here"]') : root.querySelector('.cm-add > summary')) || root.querySelector('.cm-stage');
  // A click in placement mode puts the ghost down: at the pointer, in the clicked group, in its own lane on a layered picture.
  const placeGhost = pt => {
    if (!draft || draft.mode !== 'place' || !onPicture()) return false;
    const type = draft.type, kind = draftKind(type), all = L.nodes.filter(b => b.w > 40 && b.h > 24);
    // The ghost takes the size of the picture's own elements of its type (else of its elements at large), and on a layered
    // picture the lane those elements stand in (else the lane under the pointer): the layout keeps a pin in its lane.
    const peers = D.nodes.filter(n => !n.fold && (n.type === type || n.kind === kind)).map(n => L.nodes.find(b => b.id === n.id)).filter(Boolean), boxes = peers.length ? peers : all;
    const mid = arr => (arr.length ? [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)] : 0);
    const w = mid(boxes.map(b => b.w)) || 176, h = mid(boxes.map(b => b.h)) || 64, grid = state.snap ? 16 : 1;
    let x = Math.round((pt.x - w / 2) / grid) * grid, y = Math.round((pt.y - h / 2) / grid) * grid;
    const inside = (p, g) => p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h;
    const hit = (L.groups || []).filter(g => inside(pt, g)).sort((a, b) => a.w * a.h - b.w * b.h)[0] || null;
    const group = hit ? {id: hit.id, kind: D.groups.find(g => g.id === hit.id)?.kind || hit.kind || '', title: D.groups.find(g => g.id === hit.id)?.title || ''} : null;
    const bands = L.bands || [], own = peers.length ? bands.find(b => peers.some(bx => bx.y >= b.y && bx.y + bx.h <= b.y + b.h)) : null;
    const lane = own || bands.find(b => pt.y >= b.y && pt.y <= b.y + b.h) || null, layered = !!lane && (L.arrangement === 'by-layer' || L.arrangement === 'layered');
    // The ghost never covers an element (a pin that overlapped would be dropped by the layout, and the saved element
    // would not stand where the ghost stood): the free place nearest the pointer inside the clicked group, else inside
    // the type's lane; when the group or the lane is full, the first free place below the group's members or at the end
    // of the lane (the group or the lane grows to hold it, as it does for any pin).
    const free = (bx, by) => !all.some(b => bx < b.x + b.w + 8 && bx + w + 8 > b.x && by < b.y + b.h + 8 && by + h + 8 > b.y);
    const gp = NL.GPAD || 12, area = hit ? {x0: hit.x + gp, y0: hit.y + (NL.GHEAD || 24) + gp, x1: hit.x + hit.w - gp - w, y1: hit.y + hit.h - gp - h} : layered ? {x0: (lane.x ?? 0) + 8, y0: lane.y + 24, x1: (lane.x ?? 0) + (lane.w ?? L.W) - w - 8, y1: lane.y + lane.h - h - 8} : null;
    const snap = v => Math.round(v / 16) * 16;
    if (area) {
      let best = null;
      for (let cy = snap(area.y0); cy <= area.y1; cy += 16) for (let cx = snap(area.x0); cx <= area.x1; cx += 16) { if (cx < area.x0 || cy < area.y0 || !free(cx, cy)) continue; const d = (cx - x) ** 2 + (cy - y) ** 2; if (!best || d < best.d) best = {x: cx, y: cy, d}; }
      if (best) { x = best.x; y = best.y; }
      else if (hit) { const inside = all.filter(b => b.x >= hit.x && b.y >= hit.y && b.x + b.w <= hit.x + hit.w && b.y + b.h <= hit.y + hit.h); x = Math.max(area.x0, Math.min(x, hit.x + hit.w - gp - w)); y = Math.max(area.y0, ...inside.map(b => b.y + b.h + 16)); }
      else y = Math.max(area.y0, Math.min(area.y1, y));
    }
    x = Math.max(NL.LEFT || 0, x); y = Math.max(NL.TOP || 0, y);
    for (let guard = 0; !free(x, y) && guard < 120; guard++) x += 16;
    const opener = draft.opener;
    draft = {mode: 'ghost', type, opener, ghost: {x, y, w, h, group, lane: lane?.layer || null, pinKey: pinKey(), view: state.view}};
    paintDraft();
    const g = draft.ghost;
    const ok = openDraft({kind: 'element', type, chapter, group, lane: g.lane}, {
      onSaved: (id, spec, info = {}) => {
        // The person may have recorded another type in the editor (rc41 close: it was read as a cancel). The ghost's place
        // was chosen for the draft's type (its lane, its group), so a record of another type is drawn in its own type's
        // place, and the line says so; only a record of the draft's type is pinned where the ghost stood.
        const same = !info.type || info.type === type;
        // The picture has usually been drawn again by now with the new record in the layout's own place; the pin at the
        // ghost's position moves it there on the redraw (presentation only, as any pin).
        if (id && same) {
          remember(); const all = state.pins[g.pinKey] || (state.pins[g.pinKey] = {}), grp = g.group && L?.groups.find(x => x.id === g.group.id);
          all[id] = grp ? {x: g.x, y: g.y, group: grp.id, dx: g.x - grp.x, dy: g.y - grp.y} : {x: g.x, y: g.y}; save();
        }
        draft = null; api.announce(!id ? 'Recorded.' : same ? `${id} is recorded and stands where the draft stood.` : `${id} is recorded as ${aOrAnWord(draftLabel(info.type).toLowerCase())}; the picture draws it with its own type, not where the ${draftLabel(type).toLowerCase()} draft stood.`); api.onChange?.(true);
        // The saved element is brought into view once the picture is drawn again (the Details column may have narrowed it),
        // and the keyboard is put on it, where the arrow keys move it.
        if (id) setTimeout(() => { const b = L?.nodes.find(n => n.id === id); if (b && root.isConnected) { stage.reveal?.(b.x - 16, b.y - 16, b.w + 32, b.h + 32); if (!document.querySelector('dialog[open]')) root.querySelector(`.cm-svg .nt-node[data-nt-node="${CSS.escape(id)}"]`)?.focus({preventScroll: true}); } }, 450);
      },
      onCancelled: () => { draft = null; paintDraft(); api.announce('Draft cancelled; nothing was recorded.'); if (!document.querySelector('dialog[open]')) addOpener(opener)?.focus({preventScroll: true}); },
      onFailed: why => { draft = null; paintDraft(); api.announce(why); }
    });
    if (!ok) { draft = null; paintDraft(); }
    return true;
  };
  const aOrAnWord = word => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
  // Lets go of a draft that has no editor open (a placement, a dragged line, the kinds menu, the target list) when its
  // picture goes: another view, another project, another page. A draft whose editor is open ends with that editor.
  const dropDraft = () => { if (!draft || draft.mode === 'ghost' || draft.mode === 'link') return false; draft = null; return true; };
  // A click outside the model (the chapter rail, a tab, a link to another project) or a step back in the history ends
  // such a draft too, as a click elsewhere on the picture does (rc41 close).
  if (typeof document !== 'undefined') document.addEventListener('click', e => { if (!draft || draft.mode === 'ghost' || draft.mode === 'link' || root.contains(e.target) || inCompanion(e.target) || e.target.closest?.('dialog')) return; cancelAll({refocus: false}); }, true);
  if (typeof window !== 'undefined') window.addEventListener('popstate', () => { if (dropDraft()) paintDraft(); });
  // The keyboard's placement (rc41 close: only a pointer click put the ghost down): beside an element (`near`, its group
  // or its lane, at the nearest free place), else in the middle of the view.
  const placeInView = (near = null) => {
    if (draft?.mode !== 'place' || !onPicture()) return false;
    const b = near && L.nodes.find(n => n.id === near && D.nodes.some(x => x.id === n.id && !x.fold));
    if (b) return placeGhost({x: b.x + b.w / 2, y: b.y + b.h / 2});
    const r = root.querySelector('.cm-stage').getBoundingClientRect();
    return placeGhost(worldPoint({clientX: r.left + r.width / 2, clientY: r.top + r.height / 2}));
  };
  const startPlacement = type => {
    const add = root.querySelector('.cm-add'), opener = add?.contains(document.activeElement) || !root.querySelector('[data-nt="menu"][data-id="add-here"]') ? 'add' : 'bar';
    if (draft) cancelAll({refocus: false}); draft = {mode: 'place', type, opener}; if (add) add.open = false;
    if (state.menu) { state.menu = null; api.onChange?.(); } else paintDraft();
    // The keyboard goes to the status line's "Place in view" (the entry it came from has just closed with its menu).
    nextFrame(() => { if (draft?.mode === 'place') root.querySelector('.cm-stage > .nt-draft-note [data-nt="draft-place"]')?.focus({preventScroll: true}); });
    api.announce(`Click on the picture where the new ${draftLabel(type).toLowerCase()} should stand, or press Enter to place it in the view. Escape cancels.`);
  };
  // Ends a draft that has no record in progress; the keyboard returns to where the draft began (the element a line was
  // drawn from, or the Add control a placement came from) unless the person has moved on (`refocus: false`).
  const cancelAll = ({refocus = true} = {}) => {
    // (only a draft whose editor is open has a pending hand-over in canvas-draft.js to cancel)
    const d = draft; if (d?.mode === 'ghost' || d?.mode === 'link') cancelDraft(); draft = null; paintDraft({back: d?.from || null}); paintPorts();
    if (refocus && d?.mode === 'place' && !document.querySelector('dialog[open]')) addOpener(d.opener)?.focus({preventScroll: true});
  };
  // The kinds menu for a pair, at a point of the stage (or centred); then the owning chapter's editor, prefilled with both ends.
  const offerKinds = (from, to, at = null) => {
    const result = relationshipOffers(project(), from, to), a = centreOf(from), b = centreOf(to);
    draft = {mode: 'kinds', from, to, result, at, line: {x1: a?.x ?? 0, y1: a?.y ?? 0, x2: b?.x ?? 0, y2: b?.y ?? 0}};
    // (rc41 close: what is not offered, and why, is read with the count, as the menu shows it under its items)
    const not = result.offers.length ? notOfferedLines(result) : [];
    paintDraft(); api.announce(result.offers.length ? `${result.offers.length} relationship kind${result.offers.length === 1 ? '' : 's'} allowed between ${result.from?.ref || from} and ${result.to?.ref || to}.${not.length ? ' ' + not.join(' ') : ''}` : result.reason);
  };
  const chooseKind = key => {
    if (draft?.mode !== 'kinds') return; const o = draft.result.offers.find(x => x.key === key); if (!o) return;
    // The editor gets the records' own ids (a party drawn as a caller carries `party:<id>` on the picture).
    const {line} = draft, from = draft.result.from?.id || draft.from, to = draft.result.to?.id || draft.to, fromType = draft.result.from?.type || null, toType = draft.result.to?.type || null;
    draft = {mode: 'link', from, to, line}; paintDraft();
    const ok = openDraft({kind: 'relationship', chapter: o.chapter, editor: o.editor, section: o.section, relation: o.relation, interaction: o.interaction, swap: o.swap, archimate: o.archimate.type, from, to, fromType, toType}, {
      onSaved: () => { draft = null; api.announce(`${o.word} recorded in Chapter ${o.chapter}.`); api.onChange?.(true); },
      onCancelled: () => { draft = null; paintDraft(); api.announce('Draft cancelled; nothing was recorded.'); },
      onFailed: why => { draft = null; paintDraft(); api.announce(why); }
    });
    if (!ok) { draft = null; paintDraft(); }
  };
  const openTargets = from => { if (!portable(from)) return false; if (draft) cancelAll({refocus: false}); draft = {mode: 'targets', from}; paintDraft(); return true; };
  // The words narrow the list and its count says what is left (rc41 close: it said nothing, so no match went unheard).
  const filterTargets = q => {
    const list = root.querySelector('.nt-draft-targets-list'); if (!list) return; const s = q.trim().toLowerCase(), all = [...list.querySelectorAll('[data-nt="draft-target"]')];
    for (const b of all) b.hidden = !!s && !b.dataset.text.includes(s);
    const count = root.querySelector('.nt-draft-targets .nt-draft-count'); if (count) count.textContent = targetCountWords(all.filter(b => !b.hidden).length, all.length, q);
  };
  const paintSelection = () => { for (const el of root.querySelectorAll('.nt-node')) { const on = selected.has(el.dataset.ntNode); el.classList.toggle('arrange-selected', on); el.setAttribute('aria-pressed', String(on || el.dataset.ntNode === sel)); } selectionTools(); paintPorts(); };
  // The in-canvas selection toolbar (rc39, W2 step 4): while two or more elements are selected, the align, distribute,
  // size and pin commands stand over the selection (the same commands as the Arrange panel's, arrangeSelection); it
  // follows the camera and leaves with the selection.
  const SEL_TOOLS = [['left', 'Align left', 'M4 3v18M8 6h12v4H8zM8 14h8v4H8z'], ['center', 'Align centre', 'M12 3v18M4 6h16v4H4zM7 14h10v4H7z'], ['right', 'Align right', 'M20 3v18M4 6h12v4H4zM8 14h8v4H8z'], ['top', 'Align top', 'M3 4h18M6 8h4v12H6zM14 8h4v8h-4z'], ['middle', 'Align middle', 'M3 12h18M6 4h4v16H6zM14 7h4v10h-4z'], ['bottom', 'Align bottom', 'M3 20h18M6 4h4v12H6zM14 8h4v8h-4z'], ['distribute-horizontal', 'Equal horizontal spacing', 'M3 3v18M21 3v18M7 6h3v12H7zM14 6h3v12h-3z'], ['distribute-vertical', 'Equal vertical spacing', 'M3 3h18M3 21h18M6 7h12v3H6zM6 14h12v3H6z'], ['same-width', 'Same width', 'M4 4h16v5H4zM4 14h16v6H4zM4 12h16'], ['same-height', 'Same height', 'M4 4h5v16H4zM14 4h6v16h-6zM12 4v16']];
  let selWatch = null, placeSelTools = null;
  function selectionTools() {
    const st = root.querySelector('.cm-stage'); if (!st) return;
    let bar = st.querySelector(':scope > .nt-seltools');
    const ids = selectedIds(), on = ids.length >= 2 && !!L && api.owns(state.view) && !SHEETS.has(state.view);
    // rc41 W3: one selected element carries the keyboard path to a relationship ("Connect to…", then a target list, then
    // the kinds the standard allows), on the Diagram and Layers pictures, while no draft is in progress.
    const one = !on && ids.length === 1 && !draft && onPicture() && portable(ids[0]);
    if (!on && !one) { bar?.remove(); if (selWatch) { selWatch(); selWatch = null; } return; }
    const icon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    let html;
    if (one) {
      const n = D.nodes.find(x => x.id === ids[0]);
      html = `<span class="nt-seltools-n">${esc(n?.ref || n?.title || ids[0])}</span><button type="button" class="nt-connect" data-nt="connect-from" data-id="${esc(ids[0])}" aria-keyshortcuts="C" title="Record a relationship from ${esc(n?.ref || n?.title || ids[0])} to another element: choose the target, then a kind the standard allows · C on the element">${icon('M4 12h10M11 8l4 4-4 4M17 6h3v12h-3')}<span>Connect to…</span></button><button type="button" data-nt="selection-clear" aria-label="Clear the selection" title="Clear the selection · Escape">×</button>`;
    } else {
      const manual = L.arrangement !== 'sequence', matching = ids.every(id => canSize(D.nodes.find(n => n.id === id)));
      html = `<span class="nt-seltools-n">${ids.length} selected</span>${SEL_TOOLS.map(([id, label, d]) => `<button type="button" data-nt="manual" data-id="${id}" aria-label="${esc(label)}" title="${esc(label)}"${(id.startsWith('distribute') ? ids.length > 2 : id.startsWith('same') ? matching : manual) ? '' : ' disabled'}>${icon(d)}</button>`).join('')}<button type="button" data-nt="pin-selection" aria-label="Pin positions" title="Keep the selected elements where they stand"${manual ? '' : ' disabled'}>${icon('M12 3v10M8 13h8M9 8h6M12 13v8')}</button><button type="button" data-nt="selection-clear" aria-label="Clear the selection" title="Clear the selection · Escape">×</button>`;
    }
    if (!bar) { bar = document.createElement('div'); bar.className = 'nt-seltools'; bar.setAttribute('role', 'toolbar'); st.append(bar); }
    bar.classList.toggle('nt-seltools-one', one); bar.setAttribute('aria-label', one ? 'The selected element' : 'Arrange the selected elements');
    if (bar.innerHTML !== html) bar.innerHTML = html;
    const place = () => {
      if (!bar.isConnected || !L) return;
      const boxes = ids.map(id => L.nodes.find(n => n.id === id)).filter(Boolean); if (!boxes.length) return;
      const {z, px, py} = stage.cam, x = Math.min(...boxes.map(b => b.x)) * z + px, y = Math.min(...boxes.map(b => b.y)) * z + py, right = Math.max(...boxes.map(b => b.x + b.w)) * z + px, bottom = Math.max(...boxes.map(b => b.y + b.h)) * z + py;
      const w = bar.offsetWidth || 320, h = bar.offsetHeight || 36, sw = st.clientWidth, top = (st.querySelector(':scope > .nt-fold-note')?.offsetHeight || 0) + 8;
      const clampLeft = l => Math.max(8, Math.min(sw - w - 8, l)), clampTop = t => Math.max(top, Math.min(st.clientHeight - h - 8, t)), centre = clampLeft((x + right - w) / 2), middle = clampTop((y + bottom - h) / 2);
      // Above the selection, unless that covers another element of the picture; then below it, to its right or to its left,
      // the first that covers none (rc41 close: the one-element toolbar stood over the element above and took its pointer).
      const others = L.nodes.filter(n => !ids.includes(n.id) && n.w > 24 && n.h > 16).map(n => ({x1: n.x * z + px, y1: n.y * z + py, x2: (n.x + n.w) * z + px, y2: (n.y + n.h) * z + py}));
      const covers = ([l, t]) => others.some(o => l < o.x2 && l + w > o.x1 && t < o.y2 && t + h > o.y1);
      const spots = [[centre, clampTop(y - h - 10)], [centre, clampTop(bottom + 10)], [clampLeft(right + 10), middle], [clampLeft(x - w - 10), middle]];
      const [left, at] = spots.find(s => !covers(s)) || spots[0];
      bar.style.left = Math.round(left) + 'px'; bar.style.top = Math.round(at) + 'px';
    };
    // The camera watcher always places the bar over the current selection (rc41 W3: it kept the first selection's place,
    // so a one-element bar drifted back over an element no longer selected when the camera moved).
    placeSelTools = place; place(); if (!selWatch && stage.watch) selWatch = stage.watch(() => placeSelTools?.());
  }
  const setSelection = ids => { selected.clear(); for (const id of ids.slice(0, 200)) selected.add(id); arrangeMessage = ''; const first = selected.has(sel) ? sel : [...selected][0] || null, before = renders; if (first !== sel) onSelect?.(first); if (renders === before) api.onChange?.(); };
  const toggleSelection = id => { if (!D?.nodes.some(n => n.id === id && !n.fold)) return; const ids = new Set(selectedIds()); if (ids.has(id)) ids.delete(id); else if (ids.size < 200) ids.add(id); else { api.announce('Select up to 200 visible elements at a time.'); return; } setSelection([...ids]); };
  const arrangeSelected = (action, extra = {}, ids = selectedIds()) => { const r = arrangeSelection(D, L, ids, action, {pins: pins(), sizes: sizes(), layout: layoutOptions, grid: state.snap ? 16 : 0, ...extra}); arrangeMessage = r.reason; if (r.ok) { remember(); state.pins[pinKey()] = r.pins; state.sizes[pinKey()] = r.sizes; save(); } api.onChange?.(); api.announce(r.reason); return r.ok; };
  // rc40 W2: choosing a layout re-lays the picture out at once and keeps the Arrange panel docked; `keep` false (the
  // panel's "Keep pinned positions" switch off) lets every pinned position and size go. Returns whether it applied.
  const chooseArrangement = (id, hub = null, {keep = true} = {}) => {
    if (state.view !== 'layers' && !arrangementsFor(full).some(a => a.id === id)) return false;
    remember(); const previous = pins(), dimensions = sizes();
    if (state.view !== 'layers') state.arrangement = id;
    state.hub = hub;
    if (keep) { state.pins[pinKey()] ||= {...previous}; state.sizes[pinKey()] ||= {...dimensions}; } else { state.pins[pinKey()] = {}; state.sizes[pinKey()] = {}; }
    arrangeMessage = ''; save(); api.onChange?.(true);
    return true;
  };
  const releaseSelection = (dimensions = false, ids = selectedIds()) => { const values = dimensions ? sizes() : pins(); if (!ids.some(id => values[id])) return; remember(); for (const id of ids) delete values[id]; save(); arrangeMessage = dimensions ? 'Selected sizes restored to their content.' : 'Selected positions released.'; api.onChange?.(); api.announce(arrangeMessage); };
  // Every frozen baseline can be compared: its design source is read when it is chosen (round 12, GR-PERF-13:
  // project-store.js baselinePartNow), and the picture is drawn again when it arrives.
  const baselines = () => (project()?.finalReview?.baselines || []).filter(b => b.source || b.frozen);
  document.addEventListener('aiw:baseline-part', e => { if (root.isConnected && state.view === 'diagram' && state.baseline && state.baseline === e.detail?.baselineId) api.render({sel}); });
  const remember = () => rememberLayout(state, chapter);
  // rc40 W2: the Arrange panel (arrange-panel.js) reads and drives the picture through this context; the panel's own
  // state is state.arrangeOpen (docked or not) and state.arrange (spacing, Keep pinned positions), its history state.history and state.redo.
  const arrangeCtx = () => ({chapter, root, api, state, D, L, full, sel, project, pins, sizes, pinKey, arrangement, selectedIds, setSelection, arrangeSelected, releaseSelection, chooseArrangement, remember, save, message: () => arrangeMessage, say: m => { arrangeMessage = m; }, picture: api.owns(state.view) && !SHEETS.has(state.view)});

  // The annotations on the picture: findings the chapter passes in, the reader's own notes (kept in
  // this browser, never in the document), and what Sol proposed (marked until a person keeps it).
  // The chapter checks (review-domain.js), computed only when the reader asks for findings on the picture, one
  // callout per element with its worst level; read-only, recomputed per revision. Every page that draws this view
  // already loads review-domain.js and desk-vitals.js with its own code, so they are imported statically (round 2,
  // R2-G: the lazy imports only added two re-export chunks); the reads stay asynchronous as before.
  let findingsCache = null;
  const findingCallouts = () => {
    if (!state.overlays.findings || !D) return [];
    const p = project(), key = (p?.contentVersion ?? '') + '|' + (p?.updatedAt ?? '') + '|' + (p?.id ?? '');
    if (!findingsCache || findingsCache.key !== key) {
      if (!findingsCache?.loading) { findingsCache = {key, loading: true, list: findingsCache?.list || []}; Promise.resolve({inheritedFindings}).then(m => { const by = new Map(); for (const f of m.inheritedFindings(project()) || []) { if (!f.objectId || f.code === 'confirmation' || !['error', 'warning'].includes(f.level)) continue; const x = by.get(f.objectId) || {targetId: f.objectId, items: [], level: 'warning'}; x.items.push(f.title); if (f.level === 'error') x.level = 'error'; by.set(f.objectId, x); } findingsCache = {key, list: [...by.values()].map(x => ({id: 'F:' + x.targetId, targetId: x.targetId, text: [...new Set(x.items)].slice(0, 3).join('; ') + (x.items.length > 3 ? ` (+${x.items.length - 3})` : ''), severity: x.level === 'error' ? 'high' : 'low'}))}; if (root.isConnected) api.onChange?.(); }).catch(() => { findingsCache = {key, list: []}; }); }
      return findingsCache.list || [];
    }
    return findingsCache.list;
  };
  const callouts = () => {
    if (!D) return [];
    const ids = new Set(D.nodes.map(n => n.id)), out = [];
    const given = [...(typeof annotations === 'function' ? (annotations(D) || []) : []), ...findingCallouts()];
    if (state.overlays.findings) for (const a of given) if (ids.has(a.targetId) && !a.proposed) out.push({...a, severity: a.severity || 'high'});
    if (state.overlays.proposed) for (const a of given) if (ids.has(a.targetId) && a.proposed) out.push({...a, severity: a.severity || 'info'});
    if (state.overlays.notes) for (const n of state.notes) if (n.sceneId === state.scene && ids.has(n.targetId)) out.push({id: n.id, targetId: n.targetId, text: n.text, severity: 'info', note: true});
    return out.map((c, i) => ({...c, n: i + 1}));
  };
  // The vitals overlay (Chapter 10 and the technology usage view): the worst vital per running part.
  let vitalsCache = null;
  const vitalsMap = async () => {
    if (!state.vitals || !D || !D.nodes.some(n => n.sol)) return null;
    try {
      const p = project(); const key = (p?.contentVersion ?? '') + '|' + (p?.updatedAt ?? '');
      if (!vitalsCache || vitalsCache.key !== key) { const m = await Promise.resolve({deskSource, VSTATE}); const src = m.deskSource(p); vitalsCache = {key, rows: new Map(src.rows.map(r => [r.id, r])), VSTATE: m.VSTATE}; }
      const map = new Map();
      for (const n of D.nodes) { const r = n.sol && vitalsCache.rows.get(n.sol); if (!r) continue; const bad = r.vitals.filter(v => ['bad', 'warn', 'none'].includes(v.state)); map.set(n.id, {state: r.state === 'na' ? 'ok' : r.state, count: bad.length, text: `${vitalsCache.VSTATE[r.state]?.label || r.state}: ${bad.map(v => v.vital + ' ' + (vitalsCache.VSTATE[v.state]?.label || v.state)).join(', ') || 'every vital carried is within its target'}`}); }
      return map;
    } catch { return null; }
  };
  let vitalsNow = null;

  // ---------------------------------------------------------------- the Drivers lens (rc39, W2 step 5, PLAN §4.3.5)
  // Choose a driver and the elements it reaches (design-questions.js driverReach: the components, capabilities and
  // realizations whose design questions it opens) are lit with their state — decided, draft or open, three fills in the
  // Key — and the rest dimmed at the marks' dim opacity. A paint over the drawn scene: no re-layout, no camera move, no
  // write. The projection module loads on first use, so a Diagram without the lens starts as light as before.
  let basisModule = null, basisLoading = null, reachCache = null;
  const loadBasis = () => (basisLoading ??= import('./design-questions.js').then(m => { basisModule = m; return m; }).catch(e => { basisLoading = null; throw e; }));
  const driversOffered = () => (project()?.quality?.drivers || []).filter(d => d && d.id).map(d => ({id: d.id, ref: d.ref || d.id, title: d.title || ''}));
  const driverNow = () => { const id = state.driver; return id && driversOffered().find(d => d.id === id) ? id : null; };
  const DRIVER_STATES = ['open', 'draft', 'decided'];
  // The reach of the chosen driver for the project on screen: element id → state (null while the module loads).
  const reachNow = () => {
    const id = driverNow(), p = project(); if (!id || !p) return null;
    if (!basisModule) { loadBasis().then(() => { if (root.isConnected && driverNow() === id) { paintDrivers(); api.onChange?.(); } }); return null; }
    if (reachCache && reachCache.p === p && reachCache.id === id) return reachCache.map;
    let map = new Map(); try { map = basisModule.driverReach(p, id) || new Map(); } catch (e) { console.warn('The driver’s reach could not be read.', e?.message); }
    reachCache = {p, id, map}; return map;
  };
  const worst = states => DRIVER_STATES.find(s => states.includes(s)) || null;
  // The state of a drawn element under the lens: a record's own, a group's the worst of its members'; null when unreached.
  const lensStateOf = (n, reach) => { const ids = n.fold?.members || [n.id, n.record?.id].filter(Boolean); const states = ids.map(id => reach.get(id)).filter(s => s && s !== 'none'); return states.length ? worst(states) : null; };
  const DRIVER_CLASSES = ['nt-dr-open', 'nt-dr-draft', 'nt-dr-decided', 'nt-dr-dim'];
  function paintDrivers() {
    const svg = root.querySelector('.cm-svg'); if (!svg) return;
    const reach = ['diagram', 'layers'].includes(state.view) && D ? reachNow() : null;
    root.classList.toggle('nt-lens-drivers', !!reach); if (reach) root.dataset.ntDriver = driverNow(); else delete root.dataset.ntDriver;
    const byId = new Map((D?.nodes || []).map(n => [n.id, n])), lit = new Set();
    for (const g of svg.querySelectorAll('.nt-node[data-nt-node]')) {
      g.classList.remove(...DRIVER_CLASSES); if (!reach) continue;
      const n = byId.get(g.dataset.ntNode), s = n ? lensStateOf(n, reach) : null;
      g.classList.add(s ? 'nt-dr-' + s : 'nt-dr-dim'); if (s) lit.add(g.dataset.ntNode);
    }
    const edgeOf = new Map((D?.edges || []).map(e => [e.id, e]));
    for (const g of svg.querySelectorAll('.nt-edge[data-nt-edge]')) { g.classList.remove('nt-dr-dim'); if (!reach) continue; const e = edgeOf.get(g.dataset.ntEdge); if (!e || !(lit.has(e.from) || lit.has(e.to))) g.classList.add('nt-dr-dim'); }
    for (const t of svg.querySelectorAll('.nt-trunk[data-nt-members]')) { t.classList.remove('nt-dr-dim'); if (!reach) continue; let ids = []; try { ids = JSON.parse(t.dataset.ntMembers); } catch { ids = []; } if (!ids.some(id => { const e = edgeOf.get(id); return e && (lit.has(e.from) || lit.has(e.to)); })) t.classList.add('nt-dr-dim'); }
  }
  // The lens row's picker: data-lens="drivers", the chosen driver on the row and on each option (data-driver).
  const driversPickHTML = () => {
    if (!['diagram', 'layers'].includes(state.view)) return '';
    const ds = driversOffered(); if (!ds.length) return '';
    const id = driverNow();
    return `<label class="cm-scn nt-drivers" data-lens="drivers"${id ? ` data-driver="${esc(id)}"` : ''}><span title="Light the elements a driver reaches, with the state of the design questions it opens on them">Drivers</span><select data-nt-field="driver" aria-label="Drivers lens: light the elements a driver reaches"><option value="">No driver lit</option>${ds.map(d => `<option value="${esc(d.id)}" data-driver="${esc(d.id)}"${d.id === id ? ' selected' : ''}>${esc(d.ref === d.id ? d.title : d.ref + ' · ' + d.title)}</option>`).join('')}</select></label>`;
  };
  // The Key's three fills, counted over the drawn scene, and the dimmed rest.
  const driversKeyHTML = () => {
    const reach = ['diagram', 'layers'].includes(state.view) && D ? reachNow() : null; if (!reach) return '';
    const d = driversOffered().find(x => x.id === driverNow()), n = {open: 0, draft: 0, decided: 0, dim: 0};
    for (const x of D.nodes) { const s = lensStateOf(x, reach); n[s || 'dim']++; }
    const words = {open: 'reached · a design question open', draft: 'reached · answered in draft', decided: 'reached · decided', dim: 'not reached by this driver (dimmed)'};
    return `<h5 aria-level="4">Drivers lens · ${esc(d ? d.ref : '')}</h5>${['decided', 'draft', 'open', 'dim'].map(s => `<p class="nt-mk-key" data-nt-mark="driver-${s}"><i class="nt-k nt-dr-k ${s}" aria-hidden="true"></i>${esc(words[s])} <small>×${n[s]}</small></p>`).join('')}`;
  };
  // The companion's reading of a lit element: the questions this driver opens on it, each with its state, its story when
  // decided, and one Decide action for an open one (the shell handles data-action="design-decide").
  const basisHTML = id => {
    const reach = ['diagram', 'layers'].includes(state.view) && D ? reachNow() : null, driverId = driverNow(); if (!reach || !driverId || !basisModule) return '';
    const n = D.nodes.find(x => x.id === id) || full?.nodes.find(x => x.id === id); if (!n || n.fold) return '';
    const rid = reach.has(id) ? id : reach.has(n.record?.id) ? n.record.id : null; if (!rid) return '';
    let r = null; try { r = basisModule.designQuestions(project(), rid); } catch (e) { console.warn('The design basis could not be read.', e?.message); }
    if (!r) return '';
    const d = driversOffered().find(x => x.id === driverId), mine = r.questions.filter(q => q.because.includes(driverId));
    const word = {open: 'Open', draft: 'Answered in draft', decided: 'Decided'};
    const rows = mine.map(q => `<li class="nt-basis-q nt-dr-${esc(q.state)}" data-question="${esc(q.id)}"><b>${esc(q.title)}</b><span class="nt-basis-state">${esc(word[q.state] || q.state)}${q.chapter ? ' · Chapter ' + q.chapter : ''}</span>${q.story ? `<p class="nt-basis-story">${esc(q.story)}</p>` : q.answers?.length ? `<p class="nt-basis-story">${esc(q.answers.map(a => a.title).join('; '))}</p>` : `<p class="nt-basis-story cm-muted">${esc(q.question || '')}</p>`}${q.state === 'open' ? `<p class="nt-actions"><button type="button" class="cm-btn" data-action="design-decide" data-question="${esc(q.id)}" data-record="${esc(rid)}">Decide → Co-design</button></p>` : ''}</li>`).join('');
    return `<section class="nt-basis"><h4 aria-level="3">Design basis · ${esc(d ? d.ref : driverId)}<span>${mine.length}</span></h4><p class="cm-muted">${esc(d ? d.title : '')}: ${mine.length ? `${mine.length} design question${mine.length === 1 ? '' : 's'} it opens on ${esc(r.ref)}` : 'no design question it opens on ' + esc(r.ref)}.</p>${rows ? `<ul class="nt-basis-list">${rows}</ul>` : ''}</section>`;
  };
  // The layout is kept between renders while the picture and its options are the same (a selection, a trace or a mark
  // repaints without laying the picture out again: the review of round 10 timed every click as a full layout).
  let laid = null, laidKey = null;
  function build(p) {
    // An alternative or change previewed in this chapter (round 5): the picture draws its document over the saved one,
    // so what it adds, removes and changes is marked, and what it touches is ringed.
    const imp = state.view === 'whole' ? null : previewed(chapter), doc = imp?.document && imp.document !== p ? imp.document : null;
    if (state.view === 'diagram') {
      const base = state.baseline ? baselines().find(b => b.id === state.baseline) : null;
      const pageEnv = typeof environment === 'function' ? environment() : null; if (pageEnv) state.environmentId = pageEnv;
      if (scene()?.id === 'sequence' && state.sequenceContract === undefined) state.sequenceContract = p?.interfaces?.contracts?.[0]?.id || '';
      const sequenceObject = state.sequenceContract && (p?.interfaces?.contracts || []).some(c => c.id === state.sequenceContract) ? state.sequenceContract : null;
      const diagramObject = scene()?.id === 'sequence' ? sequenceObject : (typeof objectId === 'function' ? objectId() : null);
      full = scene() ? notationDiagram(p, scene().id, {environmentId: state.environmentId, objectId: diagramObject}) : null;
      if (full && base) { const source = baselinePartNow(p, base); if (source) { const A = notationDiagram(source, scene().id, {environmentId: state.environmentId, objectId: diagramObject}); full = notationDiff(A, full) || full; full.header = {...full.header, baseline: base.id + ' → working'}; } else full.header = {...full.header, baseline: base.id + ' · reading the frozen baseline'}; }
      else if (full && doc) { const B = notationDiagram(doc, scene().id, {environmentId: state.environmentId, objectId: diagramObject}); const X = notationDiff(full, B); if (X) { full = X; full.diffBy = 'alternative'; full.header = {...full.header, baseline: 'saved → this alternative'}; } }
    } else full = state.view === 'whole' || state.view === 'modules' || !p ? null : connectedOf(doc || p, chapter);
    if (full?.scene?.id === 'sequence') {
      const nodes = state.sequenceData ? full.nodes : full.nodes.filter(n => n.type !== 'data'), ids = new Set(nodes.map(n => n.id));
      const edges = full.edges.filter(e => ids.has(e.from) && ids.has(e.to)).map(e => ({...e, label: [e.record?.ref || e.record?.id, e.label].filter(Boolean).join(' · ')}));
      full = {...full, nodes, edges, counts: {...full.counts, nodes: nodes.length, edges: edges.length}};
    }
    publishImpact(imp, new Set([...(full?.nodes || []).map(n => n.id), ...(p ? modelIds(p) : [])]));
    state.layers = layersNow();
    D = full ? stripToLayers(full, state.layers) : null;
    // Display bands are a viewpoint projection. Repository layer ids and source records stay intact.
    // Connection filters change ink after layout, so revealing a family never shifts an object.
    if (D && ['diagram', 'layers'].includes(state.view) && !(state.legacyPins.includes(pinKey()) && Object.keys(pins()).length)) D = viewpointProjection(D);
    if (D && state.focus && !SHEETS.has(state.view)) D = focusDiagram(D, state.focus);
    // A relationship chosen from the overview gets a truthful, small picture of its exact endpoints and
    // recorded links. It remains selected in the inspector and has an explicit return to the overview.
    if (D && state.view === 'layers' && state.edgeReveal) {
      const edge = D.edges.find(e => e.id === state.edgeReveal);
      if (edge) {
        const ids = new Set([edge.from, edge.to]);
        D = {...D, nodes: D.nodes.filter(n => ids.has(n.id)), groups: [], edges: D.edges.filter(e => ids.has(e.from) && ids.has(e.to)), counts: {...D.counts, nodes: ids.size, groups: 0, edges: D.edges.filter(e => ids.has(e.from) && ids.has(e.to)).length}};
      } else state.edgeReveal = null;
    }
    // A trace names actual records and relationships. A lane aggregate cannot truthfully carry those source marks,
    // so a dense Layers trace opens the individual model until the reader clears it. Remember whether this was our
    // choice; a reader who had already asked to see every element keeps that choice after clearing the trace.
    if (D && state.view === 'layers' && marksInfo('trace') && state.unfold !== 'connected') {
      state.unfold = 'connected'; state.edgeReveal = null; traceAutoExpanded = true;
    }
    // Pictures at size (round 12, P): a picture above the screen's budget (figure-budget.js SCREEN_BUDGET) opens as an
    // overview of its groups, with the relationships between groups counted; a group opens in place (drill), its
    // neighbours standing as one element each. A selection inside a group (a deep link, Work, Find) opens its group with
    // the selected element drawn. "Show every element" draws the whole picture for this scene. Nothing is saved.
    fold = null;
    const foldId = state.view === 'layers' ? 'connected' : scene()?.id;
    const foldLimit = state.view === 'layers' ? LAYERS_OVERVIEW : SCREEN_BUDGET;
    const layersCanSummarize = state.view === 'layers' && overBudget(D, LAYERS_OVERVIEW) && !state.edgeReveal && !marksInfo('trace');
    const diagramCanSummarize = state.view === 'diagram' && !['process', 'sequence', 'lifecycle'].includes(full?.scene?.id) && !state.focus && overBudget(D, DIAGRAM_OVERVIEW) && !Object.keys(pins()).length;
    const canFold = !['process', 'sequence', 'lifecycle'].includes(full?.scene?.id) && !Object.keys(pins()).length;
    if (D && ['diagram', 'layers'].includes(state.view) && !full?.diff && state.unfold !== foldId && canFold && (layersCanSummarize || diagramCanSummarize || overBudget(D, foldLimit))) {
      const keys = viewpointGroupKeys(D, doc || p, {layers: state.view === 'layers'});
      const F = foldDiagram(D, {project: doc || p, budget: SCREEN_OVERVIEW, keys, force: layersCanSummarize || diagramCanSummarize}), groupOf = id => F.groups.find(g => g.count > 1 && g.members.includes(id))?.key || null;
      if (sel && (selectionChanged || state.view !== 'layers') && !F.overview.nodes.some(n => n.id === sel) && !String(sel).startsWith('fold:')) { const k = groupOf(sel); if (k) state.drill = k; }
      const X = state.drill && F.groups.some(g => g.key === state.drill) ? F.detail(state.drill, {budget: state.view === 'layers' ? 18 : SCREEN_BUDGET.nodes, stubs: state.view === 'layers' ? 6 : 12, keep: sel ? [sel] : []}) : null;
      if (!X) state.drill = null;
      fold = {F, X, whole: D, groupOf};
      D = state.view === 'layers' && !X ? layerOverview(F, fold.whole) : viewpointProjection(X || F.overview, fold.whole);
      if (D.layerSummary && state.pair && !D.layerSummary.pairs.some(x => x.key === state.pair)) state.pair = null;
    } else { state.drill = null; state.pair = null; }
    // A grouped picture is laid out on a page of the stage's proportions (notation-layout.js `page`: rows packed to its width),
    // in an arrangement that keeps to it, so an overview reads on one screen. The page stays once a pin exists (rc39): a
    // pin is placed and checked in the paged layout, and a picture that left the page on its first pin re-laid every
    // level under it and dropped that pin as conflicting with its lane.
    const a0 = state.view === 'layers' ? 'by-layer' : arrangement(), arr = fold && state.view !== 'layers' && !['tree', 'layered', 'grouped'].includes(a0) ? 'tree' : a0;
    // The Layers view draws a lane for each of the eight layers: the ones the chapter does not hold as thin strips.
    // (`stage`, rc40: the screen frame the layered, tree and grouped pictures and the Layers lanes are shaped for)
    const lo = D && !SHEETS.has(state.view) ? {arrangement: arr, stage: SCREEN_STAGE, pins: pins(), sizes: sizes(), hub: state.hub, spacing: arrangeSpacing(state, chapter), collapsed: arr !== 'by-layer' ? [] : D.viewBands ? hiddenBands(full, layersNow()) : hiddenLanes(), every: state.view === 'layers' && !D.viewBands ? {counts: layerCounts(full), none: 'none in this chapter'} : null, direction: arrangeDirection(state, chapter, arr) || (state.arrangement && ['tree', 'orthogonal'].includes(arr) ? 'strict' : null), ...(!['tree', 'orthogonal'].includes(arr) || fold ? {page: {width: SCREEN_PAGE, min: 820}} : {})} : null, key = lo ? JSON.stringify([D, lo], (k, v) => (k === 'record' || k === 'members' ? undefined : v)) : null;
    layoutOptions = lo;
    L = !lo ? null : key === laidKey ? laid : (laid = notationLayout(D, lo), laidKey = key, laid);
    for (const id of selected) if (!L?.nodes.some(n => n.id === id) || !D?.nodes.some(n => n.id === id && !n.fold)) selected.delete(id);
    // A folded lane contains one drawn aggregate but its band names the underlying records, not "1".
    if (L && fold && state.view === 'layers' && !D.viewBands) {
      const counts = layerCounts(fold.whole);
      for (const b of L.bands) if (b.layer && !b.collapsed && !b.none) { b.count = counts[b.layer]; b.title = `${LAYER_NAMES[b.layer]} · ${b.count}`; }
    }
    // A build-up in progress is read against the picture as it now stands, so it survives a redraw (layers, arrangement, scene).
    publishBuild();
    return L;
  }
  // ---- the build-up: its steps for the picture drawn now, and the marks of the current step (source `build`).
  let buildSteps = [], buildTimer = 0;
  const buildStepsOf = () => {
    const m = state.build && buildModes.get(state.build.mode); if (!m || !D) return [];
    let steps = []; try { steps = m.steps(D, project()) || []; } catch (e) { console.warn('The build-up steps could not be read.', e?.message); steps = []; }
    return (Array.isArray(steps) ? steps : []).filter(s => s && Array.isArray(s.marks)).map(s => ({title: String(s.title || ''), ids: [...new Set(s.marks.filter(x => x && x.id != null).map(x => String(x.id)))]}));
  };
  function publishBuild() {
    if (!state.build) return;
    buildSteps = buildStepsOf();
    if (!buildSteps.length) { setMarks('build', [], {mode: state.build.mode, title: buildModes.get(state.build.mode)?.title || state.build.mode, step: 0, total: 0, stepTitle: '', playing: false, words: {}}); return; }
    state.build.step = Math.max(0, Math.min(state.build.step, buildSteps.length - 1));
    const revealed = new Set(buildSteps.slice(0, state.build.step).flatMap(s => s.ids)), now = new Set(buildSteps[state.build.step].ids), marks = [];
    for (const id of now) marks.push({id, state: 'traced', note: 'Revealed in this step'});
    for (const n of D?.nodes || []) if (!now.has(n.id) && !revealed.has(n.id)) marks.push({id: n.id, state: 'dimmed', note: 'Not yet revealed'});
    setMarks('build', marks, {mode: state.build.mode, title: buildModes.get(state.build.mode)?.title || state.build.mode, step: state.build.step + 1, total: buildSteps.length, stepTitle: buildSteps[state.build.step].title, playing: !!state.build.playing, words: {traced: 'Revealed in this step', dimmed: 'Not yet revealed'}});
  }
  // The step line and the transport, refreshed in place (the picture repaints its marks on the marks event; no layout).
  function refreshBuildLine() {
    const b = state.build, n = buildSteps.length, text = root.querySelector('.nt-build-line .nt-build-text');
    if (text) text.textContent = buildLineText();
    for (const el of root.querySelectorAll('[data-nt="build-back"]')) el.disabled = !b || b.step <= 0;
    for (const el of root.querySelectorAll('[data-nt="build-next"]')) el.disabled = !b || b.step >= n - 1;
    for (const el of root.querySelectorAll('[data-nt="build-play"]')) { el.disabled = !b || !n; const t = el.querySelector('.nt-build-playword') || el; if (t) t.textContent = b?.playing ? 'Pause' : 'Play'; el.setAttribute('aria-pressed', String(!!b?.playing)); }
    const label = root.querySelector('[data-nt="menu"][data-id="build"] > span'); if (label) label.textContent = buildMenuLabel();
  }
  const buildLineText = () => { const b = state.build; if (!b) return ''; const m = buildModes.get(b.mode), n = buildSteps.length; return `${m?.title || b.mode} · ${n ? `Step ${b.step + 1} of ${n} · ${buildSteps[b.step]?.title || ''}` : 'Nothing to step through in this picture'}${b.playing ? ' · playing' : ''}`; };
  const buildMenuLabel = () => (state.build ? `Build · ${buildModes.get(state.build.mode)?.title || state.build.mode} ${buildSteps.length ? `${state.build.step + 1}/${buildSteps.length}` : ''}`.trim() : 'Build');
  const stopBuild = () => { clearTimeout(buildTimer); buildTimer = 0; buildSteps = []; clearMarks('build'); };
  // Any click while the build-up plays pauses it (the Play button itself toggles).
  document.addEventListener('click', e => { if (state.build?.playing && root.isConnected && !e.target.closest?.('[data-nt="build-play"]')) api.buildPause(); }, true);
  // The shared sheet views draw in a scrolling sheet beside the stage, not on the camera's world.
  function sheet() {
    const body = root.querySelector('.cm-body'); if (!body) return null;
    let el = body.querySelector(':scope > .cm-sheet');
    if (!el) { el = document.createElement('div'); el.className = 'cm-sheet'; el.tabIndex = -1; body.querySelector('.cm-stage')?.after(el) || body.prepend(el); }
    return el;
  }
  let tableCache = null, crossCache = null, setsCache = null, mapFocus = null, mapDrawn = '';
  root.addEventListener('click', e => { const b = e.target.closest?.('.mm [data-scope-to]'); if (b) mapFocus = b.dataset.scopeTo; }, true);
  const tableOf = p => { const key = p; if (!tableCache || tableCache.key !== key) tableCache = {key, T: tableModel(p, chapter)}; return tableCache.T; };
  // The Matrix's sets come from the data: the record types the project holds, the chapter's connected model's first.
  // The pair is the reader's (remembered per chapter with the layers) when the project still holds both, else the
  // chapter's default; the two axes are never the same set.
  const setsOf = p => { if (!setsCache || setsCache.key !== p) setsCache = {key: p, sets: matrixSets(p, {inModel: new Set((p ? connectedOf(p, chapter).nodes : []).map(n => n.type))})}; return setsCache.sets; };
  const crossOf = p => {
    const sets = setsOf(p), has = t => sets.some(x => x.type === t), [r0, c0] = MATRIX_DEFAULTS[chapter] || ['requirement', 'responsibility'];
    const rows = has(state.cross.rows) ? state.cross.rows : r0;
    let cols = has(state.cross.cols) ? state.cross.cols : c0; if (cols === rows) cols = [c0, r0, ...sets.map(x => x.type)].find(t => t !== rows);
    if (!crossCache || crossCache.key !== p || crossCache.rows !== rows || crossCache.cols !== cols) crossCache = {key: p, rows, cols, X: matrixModel(p, {rows, cols}), sets: [...sets, ...[rows, cols].filter(t => !has(t)).map(t => ({type: t, label: setLabel(t), count: 0, here: false}))]};
    return crossCache;
  };
  // A selection changes only marks: the sheet is redrawn when what it shows changes, and the selected row, headers and
  // cell are marked in place (round 4, scale: a click on a 60 × 60 matrix no longer rebuilds it).
  let sheetHTML = '', sheetEl = null;
  const markSheet = el => {
    for (const x of el.querySelectorAll('.nt-table .sel')) x.classList.remove('sel');
    for (const x of el.querySelectorAll('tr[aria-selected="true"]')) x.setAttribute('aria-selected', 'false');
    for (const x of el.querySelectorAll('.nt-x td.on')) { x.classList.remove('on'); x.querySelector('[aria-pressed]')?.setAttribute('aria-pressed', 'false'); }
    if (sel) {
      const q = CSS.escape(sel), tr = el.querySelector(`tr[data-nt-row="${q}"]`);
      if (tr) { tr.classList.add('sel'); tr.setAttribute('aria-selected', 'true'); }
      for (const b of el.querySelectorAll(`.nt-x [data-nt-row="${q}"]`)) (b.closest('tbody') ? b.closest('tr') : b.closest('th'))?.classList.add('sel');
    }
    const k = state.view === 'cross' && state.cross.cell, b = k && el.querySelector(`[data-nt-cell="${CSS.escape(k)}"]`);
    if (b) { b.setAttribute('aria-pressed', 'true'); b.parentElement.classList.add('on'); }
    paintSheet(el);
  };
  // The same marks on the Table's rows and the Matrix's headings (round 5): a check's glyph beside the reference, and the
  // trace's states as classes; painted in place, so the sheet is not drawn again.
  const SHEET_MARKS = ['nt-mk-traced', 'nt-mk-changed', 'nt-mk-dimmed', 'nt-mk-ghost'];
  function paintSheet(el) {
    const M = marksNow();
    for (const g of el.querySelectorAll('.nt-mk-g')) g.remove();
    for (const x of el.querySelectorAll('.' + SHEET_MARKS.join(',.'))) x.classList.remove(...SHEET_MARKS);
    const glyph = m => `<i class="nt-mk-g ${esc(m.state)}" title="${esc(m.word + (m.note ? ': ' + m.note : ''))}" aria-label="${esc(m.word)}">${esc(m.glyph)}</i>`;
    for (const tr of el.querySelectorAll('.nt-records tr[data-nt-row]')) {
      const m = M.get(tr.dataset.ntRow); if (!m) continue;
      if (m.glyph) tr.querySelector('.nt-tref')?.insertAdjacentHTML('afterbegin', glyph(m) + ' ');
      tr.classList.add(...nodeMarkClass(m).split(' ').filter(c => SHEET_MARKS.includes(c)));
    }
    for (const bt of el.querySelectorAll('.nt-x th [data-nt-row]')) {
      const m = M.get(bt.dataset.ntRow); if (!m) continue;
      if (m.glyph) bt.querySelector('b')?.insertAdjacentHTML('afterbegin', glyph(m) + ' ');
      bt.closest('th')?.classList.add(...nodeMarkClass(m).split(' ').filter(c => SHEET_MARKS.includes(c)));
    }
  }
  // The marks on the picture, repainted in place when a source changes (no layout): each element's state, its glyph and
  // word, the rings, the lit and dimmed relationships, the ghosts; then the Key and the companion's trace.
  // Round 10 (N6): a line drawn for several relationships (g.nt-trunk) takes its state from the relationships that travel
  // it (traced when any of them is, dimmed only when every one is, as the renderer derives it), and the lift (the whole
  // route of every selected, lit and traced relationship, over the lines) is drawn again from the marks.
  let drawing = false, painted = '';
  function paintMarks() {
    // Only the views this module draws: a chapter's own view (the desk's Running board, the Responsibilities map) and the
    // anatomy paint their own pictures.
    if (!root.isConnected || !D || !api.owns(state.view) || state.view === 'whole' || state.view === 'modules') return;
    const now = marksVersion() + '|' + checksOn();
    if (SHEETS.has(state.view)) { const el = root.querySelector('.cm-sheet'); if (el && state.view !== 'whole' && state.view !== 'modules') paintSheet(el); }
    else if (L && painted !== now) {
      const svg = root.querySelector('.cm-svg'), M = marksNow(), box = new Map(L.nodes.map(b => [b.id, b]));
      for (const g of svg.querySelectorAll('.nt-node[data-nt-node]')) {
        g.classList.remove(...markClassList); for (const x of g.querySelectorAll(':scope > .nt-mk')) x.remove();
        const m = M.get(g.dataset.ntNode), b = box.get(g.dataset.ntNode); if (!m || !b) continue;
        const cls = nodeMarkClass(m); if (cls) g.classList.add(...cls.split(' '));
        const paint = nodeMarkSVG(m, b.w, b.h, PREFIX); if (paint.ring) g.insertAdjacentHTML('afterbegin', paint.ring); if (paint.badge) g.insertAdjacentHTML('beforeend', paint.badge);
      }
      const byId = new Map(D.edges.map(e => [e.id, e])), mk = new Map();
      for (const e of D.edges) mk.set(e.id, edgeMarkClass(M.get(e.from), M.get(e.to)).trim());
      for (const g of svg.querySelectorAll('.nt-edge[data-nt-edge]')) { g.classList.remove('nt-mk-lit', 'nt-mk-dim'); const c = byId.has(g.dataset.ntEdge) ? mk.get(g.dataset.ntEdge) : ''; if (c) g.classList.add(c); }
      for (const t of svg.querySelectorAll('.nt-trunk[data-nt-members]')) {
        t.classList.remove('nt-mk-lit', 'nt-mk-dim');
        let ids = []; try { ids = JSON.parse(t.dataset.ntMembers); } catch { ids = []; }
        const cs = ids.map(id => mk.get(id) || '');
        if (cs.includes('nt-mk-lit')) t.classList.add('nt-mk-lit'); else if (cs.length && cs.every(c => c === 'nt-mk-dim')) t.classList.add('nt-mk-dim');
      }
      svg.querySelector(':scope > .nt-ghosts')?.remove();
      const gh = ghostsSVG(M, L, D, {prefix: PREFIX}), hits = svg.querySelector(':scope > .nt-hits');
      if (gh) { if (hits) hits.insertAdjacentHTML('beforebegin', gh); else svg.insertAdjacentHTML('beforeend', gh); }
      // The lift again: the whole route of the selected and lit relationships and of every traced one.
      for (const x of svg.querySelectorAll(':scope > .nt-lift')) x.remove();
      const se = state.selEdge, lift = liftParts(liftSVG(D, L, L.edges.filter(e => e.id === se || (sel && (e.from === sel || e.to === sel)) || mk.get(e.id) === 'nt-mk-lit').map(e => e.id), {sel, selEdge: se, marks: M}));
      const put = (html, before) => { if (!html) return; if (before) before.insertAdjacentHTML('beforebegin', html); else svg.insertAdjacentHTML('beforeend', html); };
      put(lift.under, svg.querySelector(':scope > .nt-node') || svg.querySelector(':scope > .nt-ghosts') || svg.querySelector(':scope > .nt-hits'));
      put(lift.over, svg.querySelector(':scope > .nt-hits'));
      painted = now;
      lastConnectionPaint = null; paintConnections();
    }
    const lg = root.querySelector('.cm-legend'); if (lg && !SHEETS.has(state.view)) lg.innerHTML = api.legendHTML();
    traceReading();
  }
  // The trace's reading in the companion, replaced in place.
  function traceReading() {
    const host = companionOf(root); if (!host) return;
    const html = traceHTML(), el = host.querySelector('.nt-trace-read');
    if (!html) { el?.remove(); return; }
    if (el) el.outerHTML = html; else host.insertAdjacentHTML('afterbegin', html);
  }
  window.addEventListener('aiw:model-marks', () => { if (!drawing && root.isConnected) paintMarks(); });
  // The scroll affordance: a card that scrolls sideways shades the edge with more beyond it and says so.
  const overflowOf = el => { for (const w of el?.querySelectorAll('.nt-table-wrap') || []) { const more = w.scrollWidth - w.clientWidth, card = w.parentElement; card.classList.toggle('nt-ovf-r', more > 2 && w.scrollLeft < more - 2); card.classList.toggle('nt-ovf-l', w.scrollLeft > 2); } };
  root.addEventListener('scroll', e => { if (e.target?.classList?.contains('nt-table-wrap')) overflowOf(e.target.closest('.cm-sheet')); }, {capture: true, passive: true});
  // Where the model's frame takes its content's height (phones) and the page scrolls, Table and Matrix take the height
  // the page shows (360–560 px), so their card scrolls inside it with the heading row and the first column in view.
  const fitSheet = el => {
    if (!el) return;
    if (state.view === 'whole' || state.view === 'modules' || !window.matchMedia?.('(max-width: 860px)').matches) { el.style.removeProperty('height'); return; }
    let s = el.parentElement; while (s && s !== document.body) { const o = getComputedStyle(s).overflowY; if ((o === 'auto' || o === 'scroll') && s.clientHeight) break; s = s.parentElement; }
    el.style.height = Math.round(Math.max(360, Math.min(560, (s && s !== document.body ? s.clientHeight : window.innerHeight) - 12))) + 'px';
  };
  window.addEventListener('resize', () => { if (!root.isConnected || !SHEETS.has(state.view)) return; const el = root.querySelector('.cm-sheet'); fitSheet(el); overflowOf(el); }, {passive: true});
  function renderSheet(p) {
    const el = sheet(); if (!el) return;
    // Each instrument keeps its own reading position. The anatomy owns an inner
    // camera, so a table's CSS zoom must never scale it a second time.
    const changed = el.dataset.ntSheet !== state.view, scroll = el.querySelector('.nt-table-wrap') || el;
    if (changed && el.dataset.ntSheet) sheetCameras.set(el.dataset.ntSheet, {zoom: el.style.zoom, top: scroll.scrollTop, left: scroll.scrollLeft});
    const saved = changed && sheetCameras.get(state.view);
    if (changed) { el.style.zoom = state.view === 'whole' ? '' : saved?.zoom || ''; el.scrollTop = el.scrollLeft = 0; }
    if (state.view !== 'whole') { anatomyModule?.leaveAnatomyView?.(); delete el.dataset.anatomy; }
    if (state.view === 'whole') {
      sheetHTML = ''; el.dataset.ntSheet = 'whole'; el.style.removeProperty('height'); el.style.removeProperty('zoom');
      if (!el.dataset.anatomy) { el.innerHTML = '<p class="nt-sheet-empty" aria-busy="true">Preparing the whole design…</p>'; el.dataset.anatomy = '1'; }
      loadAnatomy().then(m => { if (!root.isConnected || state.view !== 'whole') return; m.mountAnatomyView(el, {chapter, id: sel}, {companion: () => root.ownerDocument.querySelector('.an-companion')}); }).catch(() => { el.innerHTML = '<p class="nt-sheet-empty" role="alert">The whole design could not load.</p>'; });
      return;
    }
    // The module map: every module of the saved document, whatever the scope; a card chosen keeps the keyboard on it.
    if (state.view === 'modules') {
      sheetHTML = ''; el.style.removeProperty('height');
      if (!moduleUI) {
        if (el.dataset.ntSheet !== 'modules') { el.innerHTML = '<p class="nt-sheet-empty" aria-busy="true">Preparing the module map…</p>'; el.dataset.ntSheet = 'modules'; mapDrawn = ''; }
        loadModuleUI().then(() => { if (root.isConnected && state.view === 'modules') renderSheet(p); }).catch(() => { el.innerHTML = '<p class="nt-sheet-empty" role="alert">The module map could not load.</p>'; });
        return;
      }
      const html = moduleUI.moduleMapHTML(currentProject() || baseOf(p), chapter);
      if (el.dataset.ntSheet !== 'modules' || mapDrawn !== html || !el.firstElementChild) { el.innerHTML = html; el.dataset.ntSheet = 'modules'; mapDrawn = html; }
      const want = mapFocus; mapFocus = null;
      if (want != null) el.querySelector(`.mm [data-scope-to="${CSS.escape(want)}"]`)?.focus({preventScroll: true});
      return;
    }
    mapDrawn = '';
    let html;
    if (state.view === 'table') html = tableHTML(tableOf(p), {...state.table, layers: layersNow(), sel: null, reveal: sel, chapter, layerNames: LAYER_NAMES});
    else { const c = crossOf(p); html = matrixHTML(c.X, {layers: layersNow(), sets: c.sets, chapter, filter: state.cross.filter}); }
    if (html !== sheetHTML || el !== sheetEl || !el.firstElementChild) {
      const wrap = el.querySelector('.nt-table-wrap'), keep = changed ? saved && [saved.top, saved.left] : wrap && [wrap.scrollTop, wrap.scrollLeft];
      const a = document.activeElement, typing = a && el.contains(a) && a.dataset?.ntField ? {field: a.dataset.ntField, at: a.selectionStart ?? null} : null;
      el.innerHTML = html; el.dataset.ntSheet = state.view; sheetHTML = html; sheetEl = el;
      const w = el.querySelector('.nt-table-wrap'); if (w && keep) { w.scrollTop = keep[0]; w.scrollLeft = keep[1]; }
      if (typing) { const f = el.querySelector(`[data-nt-field="${typing.field}"]`); if (f) { f.focus({preventScroll: true}); if (typing.at != null && f.setSelectionRange) try { f.setSelectionRange(typing.at, typing.at); } catch { /* not a text field */ } } }
    }
    markSheet(el); fitSheet(el); overflowOf(el);
  }
  const headerHTML = h => { const H = D.header; const cell = (k, v) => v ? `<span><small>${k}</small>${esc(v)}</span>` : ''; return `<div class="nt-header" style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px"><b>${esc(state.view === 'diagram' ? scene()?.title || '' : pictureTitle())}</b>${cell('Model', H.model)}${cell('Template', H.template)}${cell('Author', H.author)}${cell('Created', H.created)}${cell('Last modified', H.modified)}${cell('Version', H.version)}${cell('Baseline', H.baseline)}</div>`; };

  // What the stage carries over the picture: the note that says what the layers hide.
  const layerNote = html => { const st = root.querySelector('.cm-stage'); if (!st) return; let el = st.querySelector(':scope > .nt-layer-note'); if (!html) { el?.remove(); return; } const t = document.createElement('template'); t.innerHTML = html; const fresh = t.content.firstElementChild; if (el) el.replaceWith(fresh); else st.append(fresh); };
  const findMatches = () => {
    const q = state.find.toLowerCase(); if (!q || !D) return [];
    const hit = n => (n.title + ' ' + n.ref + ' ' + n.sub).toLowerCase().includes(q), drawn = new Set(D.nodes.map(n => n.id));
    if (!fold) return D.nodes.filter(hit).map(n => n.id);
    // In a grouped picture: the drawn elements that match, and the group (or neighbour) drawn for each match inside one.
    const out = new Set(D.nodes.filter(n => !n.fold && hit(n)).map(n => n.id)), standIn = id => D.nodes.find(n => n.fold?.members.includes(id))?.id;
    for (const n of fold.whole.nodes) if (!drawn.has(n.id) && hit(n)) { const a = standIn(n.id); if (a) out.add(a); }
    return [...out];
  };
  const firstFoundRecord = () => {
    const q = state.find.toLowerCase(); if (!q) return null;
    return (fold?.whole || D)?.nodes.find(n => (n.title + ' ' + n.ref + ' ' + n.sub).toLowerCase().includes(q))?.id || null;
  };
  const foundWords = () => {
    if (!state.find) return '';
    if (!fold) return `${findMatches().length} found`;
    const q = state.find.toLowerCase(), records = fold.whole.nodes.filter(n => (n.title + ' ' + n.ref + ' ' + n.sub).toLowerCase().includes(q)).length;
    return `${records} record${records === 1 ? '' : 's'} found · ${findMatches().length} area${findMatches().length === 1 ? '' : 's'} marked`;
  };
  // The fold's note on the stage (round 12, P): what the grouped picture is, the way back to the overview, and the whole.
  // It stands over the stage's top edge (data-cm-inset): the camera keeps the picture below it (model-stage.js box).
  // Off (`on` false) under a chapter's own view or a sheet, whatever the last diagram was.
  // Round 12 (G, GR-FIG-12): one line where its words fit (the families listed "a, b and c"), so the note takes as little
  // of a short stage as it can. Round 12 (G, GR-FIG-10): a grouped picture whose elements do not fit the stage at the
  // reading zoom says how much of it is in view ("27 of 60 groups in view", kept current as the camera moves) and offers
  // Fit to whole, which frames every element at the zoom that shows them all; Fit returns to the reading size.
  const listOf = xs => (xs.length < 3 ? xs.join(' and ') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  const READING_ZOOM = 0.5;
  const foldFits = el => {
    const st = el.parentElement, c = contentOf(L); if (!c || !st) return true;
    const top = el.offsetTop + el.offsetHeight + 6, w = st.clientWidth || 900, h = (st.clientHeight || 520) - top, e = c.elements;
    return (e.x2 - e.x1) * READING_ZOOM <= w + 1 && (e.y2 - e.y1) * READING_ZOOM <= h + 1;
  };
  const foldView = () => {
    const out = root.querySelector('.cm-stage > .nt-fold-note .nt-fold-view'); if (!out || !stage.inView) return;
    const v = stage.inView(); if (!v) return;
    // A diagram overview draws groups of several and elements standing alone (a group of one is its element): its count
    // in view names neither alone.
    const groups = !!fold && !fold.X, word = groups ? (state.view === 'layers' ? 'type group' : '') : 'element';
    const of = n => n.toLocaleString('en-GB') + (word ? ` ${word}${n === 1 ? '' : 's'}` : '');
    const text = v.seen >= v.total ? `All ${of(v.total)} in view` : `${v.seen.toLocaleString('en-GB')} of ${of(v.total)} in view`;
    if (out.textContent !== text) out.textContent = text;
  };
  let foldWatch = null;
  const foldNote = (on = true) => {
    const st = root.querySelector('.cm-stage'); if (!st) return;
    let el = st.querySelector(':scope > .nt-fold-note');
    const whole = ['diagram', 'layers'].includes(state.view) && D && !fold && state.unfold && state.unfold === (state.view === 'layers' ? 'connected' : scene()?.id) && (state.view === 'layers' || overBudget(D, SCREEN_BUDGET));
    if (!on || (!fold && !whole)) { el?.remove(); return; }
    const plural = (n, w) => `${n.toLocaleString('en-GB')} ${w}${n === 1 ? '' : 's'}`, F = fold?.F, X = fold?.X, G = X?.fold.group;
    const tracing = state.view === 'layers' && !!marksInfo('trace');
    const html = whole ? tracing
      ? `<b>Trace · exact records drawn</b> ${plural(D.nodes.length, 'element')}, ${plural(D.edges.length, 'relationship')} · the source chain is lit<button type="button" data-nt="trace-clear">${traceAutoExpanded ? 'Clear trace · return to overview' : 'Clear trace'}</button>`
      : state.edgeReveal ? `<b>Exact relationship</b> ${plural(D.nodes.length, 'endpoint')}, ${plural(D.edges.length, 'relationship')} between them<button type="button" data-nt="fold-group">← Layers overview</button>`
      : state.view === 'layers' && state.focus?.id ? `<b>Selected neighbourhood</b> ${plural(D.nodes.length, 'element')} · ${connectionCaption(emphasisFor())}<button type="button" data-nt="fold-group">← Layers overview</button>`
      : `<b>Every element drawn</b> ${plural(D.nodes.length, 'element')}, ${plural(D.edges.length, 'relationship')} · choose which links stand out above<button type="button" data-nt="fold-group">Group them again</button>`
      : X ? `<button type="button" data-nt="fold-up" aria-label="Back to every group">← All groups</button><b>${esc(familyWord(G.family))}: ${esc(G.ref ? G.ref + ' · ' : '')}${esc(G.title)}</b> ${plural(G.count, 'element')}${G.more ? ` · the ${G.shown} most connected drawn, ${G.more} in one element` : ''} · ${plural(G.neighbours, 'neighbouring group')}<button type="button" data-nt="fold-all">Show every element</button>`
      : state.view === 'layers' ? `<b>Architecture concerns</b> ${plural(F.total.nodes, 'record')}, ${plural(F.total.edges, 'relationship')} · open a type group or reveal more connections<button type="button" data-nt="fold-all">Show every element</button>`
      : (() => {
        // rc41 (lead): a selected group is opened from the note that asks for it — the companion's Open sits in the
        // Details column, which is closed on the Model tab until a reader opens it, so selecting a group showed nothing.
        const several = F.groups.filter(g => g.count > 1).length, alone = F.groups.length - several, held = sel ? D.nodes.find(n => n.id === sel)?.fold : null, group = held ? F.groups.find(g => g.key === held.key && g.count > 1) : null;
        const ask = group ? `<button type="button" data-nt="fold-open" data-id="${esc(group.key)}">Open ${esc(group.title)}</button>` : ' · select a group to open it';
        return `<b>Grouped by ${esc(listOf(F.by.map(f => familyWord(f, true))))}</b> ${plural(F.total.nodes, 'element')} · ${plural(several, 'group')} drawn as one element each${alone ? `, ${plural(alone, 'element')} standing alone` : ''}${ask}<button type="button" data-nt="fold-all">Show every element</button>`;
      })();
    if (!el) { el = document.createElement('div'); el.className = 'nt-fold-note'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Grouped picture'); el.dataset.cmInset = ''; st.append(el); }
    // Under the layers' note when both are said, never over it.
    const ln = st.querySelector(':scope > .nt-layer-note'), at = ln ? ln.offsetTop + ln.offsetHeight + 6 + 'px' : '';
    if (el.style.top !== at) el.style.top = at;
    // How much is in view, decided before the camera frames the picture (the note's height is part of the stage it frames).
    const view = '<span class="nt-fold-viewline"><span class="nt-fold-view" aria-live="polite">Part of the picture in view</span><button type="button" data-nt="fold-fit">Fit to whole</button></span>';
    if (el.innerHTML !== html && el.innerHTML !== html + view) el.innerHTML = html;
    // The fitted layout bounds can understate the actual viewport after the camera frames a dense overview.
    // Keep the live count and Fit to whole in every grouped overview, including diagram groups.
    const fits = foldFits(el), want = fits && !fold ? html : html + view;
    if (el.innerHTML !== want) el.innerHTML = want;
    if (want !== html) { if (!foldWatch && stage.watch) foldWatch = stage.watch(foldView); nextFrame(foldView); }
  };
  const overview = () => { if (!L || SHEETS.has(state.view)) { stage.overview?.(null); return; } const found = new Set(findMatches()); stage.overview?.({W: L.W, H: L.H, groups: L.groups, boxes: L.nodes.map(b => ({x: b.x, y: b.y, w: b.w, h: b.h, cls: b.id === sel ? 'sel' : found.has(b.id) ? 'found' : ''}))}); };
  let lastConnectionPaint = null;
  const paintConnections = (peek = null) => {
    if (!D || !L || !['diagram', 'layers'].includes(state.view)) return;
    const svg = root.querySelector('.cm-svg'); if (!svg) return;
    const emphasis = emphasisFor(), focusKey = emphasis?.mode === 'none' ? null : peek || (state.selEdge && 'e:' + state.selEdge) || (sel && 'n:' + sel) || null;
    const valid = focusKey && (focusKey.startsWith('n:') ? D.nodes.some(n => n.id === focusKey.slice(2)) : focusKey.startsWith('e:') ? D.edges.some(e => e.id === focusKey.slice(2)) : drawnLines(L).byId.has(focusKey.slice(2)));
    const key = [valid ? focusKey : '', emphasis?.mode, emphasis?.active, state.edgeOff.join(','), sel, state.selEdge].join('|');
    if (lastConnectionPaint === key) return;
    lastConnectionPaint = key;
    const lit = new Set(), ends = new Set(), id = valid ? focusKey.slice(2) : null;
    if (id && focusKey[0] === 'n') { ends.add(id); for (const e of D.edges) if (e.from === id || e.to === id) { lit.add(e.id); ends.add(e.from); ends.add(e.to); } }
    if (id && focusKey[0] === 'e') lit.add(id);
    if (id && focusKey[0] === 'b') for (const x of drawnLines(L).byId.get(id)?.members || []) lit.add(x);
    if (id && focusKey[0] !== 'n') for (const e of D.edges) if (lit.has(e.id)) { ends.add(e.from); ends.add(e.to); }
    const byId = new Map(D.edges.map(e => [e.id, e]));
    const shown = e => emphasis?.mode !== 'none' && (emphasis?.mode === 'neighbourhood' ? e.from === sel || e.to === sel : !emphasis?.paths || emphasis.paths.has(e.id));
    const visible = new Set(D.edges.filter(shown).map(e => e.id));
    // Hidden crossings must not punch unexplained holes in a visible route.
    for (const gap of svg.querySelectorAll('[data-nt-gap-members]')) { let crossing = []; try { crossing = JSON.parse(gap.dataset.ntGapMembers); } catch { /* no active crossing */ } gap.setAttribute('fill', crossing.some(id => visible.has(id)) ? '#000' : '#fff'); }
    svg.classList.toggle('nt-connection-active', !!valid);
    svg.classList.toggle('nt-connections-none', emphasis?.mode === 'none');
    svg.classList.toggle('nt-connections-all', emphasis?.mode === 'all');
    svg.dataset.connectionMode = emphasis?.mode || 'all';
    for (const g of svg.querySelectorAll('.nt-edge[data-nt-edge]')) {
      const edge = byId.get(g.dataset.ntEdge), on = edge && visible.has(edge.id);
      g.classList.toggle('nt-connection-hidden', !on);
      g.classList.toggle('nt-peek', !!valid && !!on && lit.has(edge.id));
    }
    for (const g of svg.querySelectorAll('.nt-trunk[data-nt-members]')) {
      let members = []; try { members = JSON.parse(g.dataset.ntMembers); } catch { /* an invalid line is left in context */ }
      const on = members.some(x => visible.has(x));
      g.classList.toggle('nt-connection-hidden', !on);
      g.classList.toggle('nt-peek', !!valid && on && members.some(x => lit.has(x)));
    }
    for (const hit of svg.querySelectorAll('.nt-hit[data-nt-edge]')) {
      const on = visible.has(hit.dataset.ntEdge); hit.classList.toggle('nt-connection-hidden', !on);
      hit.setAttribute('tabindex', on ? '0' : '-1'); hit.setAttribute('aria-hidden', String(!on));
    }
    for (const hit of svg.querySelectorAll('.nt-bhit[data-nt-bundle]')) hit.classList.toggle('nt-connection-hidden', !(drawnLines(L).byId.get(hit.dataset.ntBundle)?.members || []).some(id => visible.has(id)));
    for (const path of svg.querySelectorAll('[data-nt-lift]')) path.classList.toggle('nt-connection-hidden', !visible.has(path.dataset.ntLift));
    for (const end of svg.querySelectorAll('.nt-lift .nt-end')) end.classList.toggle('nt-connection-hidden', !!state.selEdge && !visible.has(state.selEdge));
    const boxes = new Map(L.nodes.map(n => [n.id, n]));
    // Badges stay outside authored geometry, but must not cover a route label or another record.
    // Use all label bounds so adding paths cannot move a badge into newly revealed wording.
    // (and, rc40, never over a lane's title or an aspect column's header)
    // (rc41: and never over an element's state mark, which stands at its bottom-left corner: notation-svg.js nodeMarkSVG; nor
    // over a band's title as the screen draws it zoomed out, up to 1.6 times its width at 0.8: notation-layout.js TITLE_GROWTH)
    const marked = [...svg.querySelectorAll('.nt-node[data-nt-node]')].filter(g => g.querySelector(':scope > .nt-mk-badge')).map(g => boxes.get(g.dataset.ntNode)).filter(Boolean).map(b => ({x: b.x - 9, y: b.y + b.h - 9, w: 84, h: 18}));
    const badgeBounds = [...L.nodes, ...marked, ...L.edges.filter(e => e.labelBox && !e.labelHidden).map(e => e.labelBox), ...(L.relationIndex || []), ...(L.bands || []).flatMap(b => [{x: b.x, y: b.y, w: Math.min(b.w, Math.round(1.6 * (12 + (b.title || '').length * 9))), h: 24}, ...(b.columns || []).map(c => ({x: c.x - 2, y: c.y, w: 8 + (c.title || '').length * 8, h: 14}))])];
    const badgePosition = box => {
      for (const gap of [3, 21, 39, 57]) {
        const choices = [box.w - 34, 0, (box.w - 34) / 2].flatMap(x => [[x, -15 - gap], [x, box.h + gap]])
          .concat([0, box.h - 15, (box.h - 15) / 2].flatMap(y => [[box.w + gap, y], [-34 - gap, y]]));
        for (const [x, y] of choices) {
          const b = {x: box.x + x, y: box.y + y, w: 34, h: 15};
          if (b.x < 0 || b.y < 0 || b.x + b.w > L.W || b.y + b.h > L.H) continue;
          if (badgeBounds.some(a => b.x < a.x + a.w + 2 && b.x + b.w > a.x - 2 && b.y < a.y + a.h + 2 && b.y + b.h > a.y - 2)) continue;
          badgeBounds.push(b); return [x, y];
        }
      }
      return [4, Math.max(0, box.h - 17)];
    };
    for (const g of svg.querySelectorAll('.nt-node[data-nt-node]')) {
      const nodeId = g.dataset.ntNode, box = boxes.get(nodeId);
      g.classList.toggle('nt-peer', !!valid && ends.has(nodeId));
      g.querySelector('.nt-pending')?.remove();
      // The "+N" badge draws only under a stepped level (rc40): it says what the level keeps back. rc41 (W1; PLAN §2 W1.6):
      // only on an element with hidden neighbours — the elements it is related to by a path not shown and by no path shown —
      // and N counts them; a hidden path that repeats a connection already drawn to the same element adds no badge (the
      // caption, the Key and Sol's packet still count every path).
      const pending = emphasis?.stepped ? hiddenNeighbours(D.edges, visible, nodeId) : 0;
      if (!g.dataset.ntBaseLabel) g.dataset.ntBaseLabel = g.getAttribute('aria-label') || '';
      g.setAttribute('aria-label', g.dataset.ntBaseLabel + (pending ? `. ${pending} connected element${pending === 1 ? '' : 's'} not yet shown connected; use Reveal next or All.` : ''));
      if (pending && box) {
        const ns = 'http://www.w3.org/2000/svg', badge = document.createElementNS(ns, 'g'), rect = document.createElementNS(ns, 'rect'), label = document.createElementNS(ns, 'text'), title = document.createElementNS(ns, 'title');
        const [badgeX, badgeY] = badgePosition(box);
        badge.setAttribute('class', 'nt-pending'); badge.setAttribute('aria-hidden', 'true'); badge.setAttribute('transform', `translate(${badgeX} ${badgeY})`);
        for (const [name, value] of Object.entries({width: 34, height: 15, rx: 6})) rect.setAttribute(name, value);
        label.setAttribute('x', '17'); label.setAttribute('y', '11'); label.setAttribute('text-anchor', 'middle'); label.textContent = `+${pending}`;
        title.textContent = `${pending} connected element${pending === 1 ? '' : 's'} not yet shown connected. Reveal next or All adds the paths without moving these elements.`;
        // The badge's pill keeps a legible size at every zoom (notation.css .nt-pending-s, as the marks' glyphs do).
        const pill = document.createElementNS(ns, 'g'); pill.setAttribute('class', 'nt-pending-s'); pill.append(rect, label);
        badge.append(pill, title); g.append(badge);
      }
    }
    const caption = root.querySelector('.nt-connection-caption');
    if (caption) caption.textContent = connectionCaption(emphasis);
    sayRevealNext(emphasis);
  };
  // Search highlight: the elements that match stay marked as the reader types, without redrawing the picture.
  const highlightFound = () => {
    const svg = root.querySelector('.cm-svg'); if (!svg) return 0;
    const ids = new Set(findMatches());
    svg.querySelectorAll('.nt-node').forEach(n => n.classList.toggle('found', ids.has(n.dataset.ntNode)));
    const out = root.querySelector('.nt-found-count'); if (out) out.textContent = foundWords();
    overview(); return ids.size;
  };
  // The chapter a record is edited in, and its open checks (the rule-based findings on it, as Validate lists them).
  const homeOf = id => { const n = full?.nodes.find(x => x.id === id) || D?.nodes.find(x => x.id === id); return n ? CHAPTER_OF[n.type] || null : null; };
  const checksHTML = (p, id) => {
    const list = openChecks(baseOf(p)).get(id) || []; if (!list.length) return '';
    return `<section class="nt-checks"><h4 aria-level="3">Its checks<span>${list.length}</span></h4>${list.slice(0, 6).map(f => `<p class="nt-check ${esc(f.level)}"><b>${esc(f.title)}</b>${f.detail ? ' ' + esc(String(f.detail).slice(0, 220)) : ''}</p>`).join('')}${list.length > 6 ? `<p class="cm-muted">and ${list.length - 6} more</p>` : ''}<a class="cm-muted" href="${esc(projectURL('/?chapter=' + chapter + '&tab=validate'))}">Every check on Validate →</a></section>`;
  };
  // What the marks on one element say, each source in its words (Contract M), for the companion.
  const markLinesHTML = id => {
    const m = marksNow().get(id); if (!m || !m.notes.length) return '';
    const said = {checks: 'Check', trace: 'Trace', impact: 'Alternative', 'sol-review': 'Sol’s review', proposals: 'Proposal'};
    return `<ul class="nt-mk-lines">${m.notes.map(x => `<li class="nt-mk-line ${esc(x.state)}"><b>${esc(said[x.source] || x.source)}</b> ${MARK_GLYPHS[x.state] ? `<i aria-hidden="true">${esc(MARK_GLYPHS[x.state])}</i> ` : ''}${esc(MARK_WORDS[x.state] || x.state)}${x.note ? ': ' + esc(x.note) : ''}</li>`).join('')}</ul>`;
  };
  // The trace's reading: where it starts, the chain through the layers, and the gaps named.
  // "Read as a story" (round 6, R6-G): the trace told from its records (trace-narrative.js), beneath the chain; each
  // reference links to its record on its chapter's model.
  const storyHTML = id => {
    const p = project(); let T = null; try { T = traceFrom(p, id); } catch { T = null; }
    return T ? traceStoryHTML(p, T, {href: (rid, ch) => projectURL(`/?chapter=${ch || chapter}&tab=model&object=${encodeURIComponent(rid)}`)}) : '';
  };
  const traceHTML = () => {
    const t = marksInfo('trace'); if (!t) return '';
    const told = storyOpen === t.from;
    return `<section class="nt-trace-read" aria-live="polite"><h4 aria-level="3">Trace · from ${esc(t.ref)}</h4><p class="nt-chain">${esc(t.chain)}</p><p class="nt-gaps">${t.gaps.length ? 'Gaps: ' + esc(t.gaps.join(', ')) + '.' : 'No gap: every layer holds a record on this chain.'}</p><p class="nt-actions"><button type="button" class="cm-btn" data-nt="trace-clear">Clear the trace</button><button type="button" class="cm-btn" data-nt="story" data-id="${esc(t.from)}" aria-pressed="${told}" title="What happens along this trace, told from the records">Read as a story</button><small class="cm-muted">Esc clears it too</small></p>${told ? storyHTML(t.from) : ''}</section>`;
  };
  // The element under the pointer, in full, once the pointer rests on it (round 5: what far-out zoom leaves unwritten).
  // Round 10 (N6): a relationship under the pointer reads too (its words and the line it is drawn on), and a line drawn for
  // several relationships lists each of them. The picture read is the one on the stage: this module's, or the one a
  // chapter draws itself through the same renderer (`ownPicture`, the Running board), never this module's last one.
  const onStage = () => (api.owns(state.view) ? (D && L ? {D, L, full: full || D, sel, selEdge: state.selEdge, own: false} : null) : (typeof ownPicture === 'function' ? ownPicture() : null));
  const hoverHTML = (id, P) => {
    const n = P.full?.nodes.find(x => x.id === id) || P.D?.nodes.find(x => x.id === id); if (!n) return '';
    const rows = [['Reference', n.ref], ['Detail', n.sub]].filter(([, v]) => v);
    return `<section class="nt-hover-read" aria-live="polite"><h4 aria-level="3">Under the pointer · ${esc(n.kicker || KINDS[n.kind]?.short || 'Element')}</h4><p class="cm-spec-t"><b>${esc(n.fullTitle || n.title)}</b></p>${rows.length ? `<dl class="cm-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}${P.own ? '' : markLinesHTML(id)}<p class="cm-muted">${esc(describeNode(P.full || P.D, id))}</p></section>`;
  };
  // `key` is what the pointer rests on: n:<element>, e:<relationship> or b:<line drawn for several>.
  const hoverRead = key => {
    const P = key ? onStage() : null, k = key ? key.slice(0, 1) : '', id = key ? key.slice(2) : '';
    // What the selection already reads is not read again: the selected element, the selected relationship, a line whose
    // shared element is selected (its reading lists the line).
    const html = !P ? '' : k === 'n' ? (id !== P.sel ? hoverHTML(id, P) : '') : k === 'e' ? (id !== P.selEdge ? edgeHoverHTML(P.D, P.L, id) : '') : k === 'b' ? (drawnLines(P.L).byId.get(id)?.node !== P.sel ? bundleHoverHTML(P.D, P.L, id) : '') : '';
    hoverReadInto(companionOf(root), html);
  };
  // The selected element of the picture, as the companion reads it.
  // The relationships a line of a grouped picture stands for (round 12, P): each read in full, a button that opens the
  // group of its source with it drawn; at most 40 here, every one in the group's own picture.
  const foldMembersHTML = e => { const all = fold?.whole?.edges || [], ids = new Set(e.fold.members), items = all.filter(x => ids.has(x.id)); return `<h5 aria-level="4">It stands for ${items.length} relationship${items.length === 1 ? '' : 's'}</h5><div class="dk-links nt-fold-members">${items.slice(0, 40).map(x => `<button type="button" class="cm-link" data-nt="fold-edge" data-id="${esc(x.id)}">${esc(describeEdge(fold.whole, x.id))}</button>`).join('')}${items.length > 40 ? `<p class="cm-muted">and ${items.length - 40} more; open either group to see them.</p>` : ''}</div>`; };
  const pairReadingHTML = () => {
    const pair = D?.layerSummary?.pairs.find(p => p.key === state.pair), whole = fold?.whole;
    if (!pair || !whole) return '';
    const all = new Set(pair.members), records = whole.edges.filter(e => all.has(e.id));
    const shown = records.slice(0, state.pairLimit), name = l => D.viewBands ? viewpointBandTitle(l) : LAYER_NAMES[l] || l;
    return `<section class="cm-spec nt-pair-spec" aria-live="polite"><h4 aria-level="3">${esc(name(pair.from))} ${pair.from === pair.to ? 'within the band' : '→ ' + name(pair.to)}</h4><p>${records.length} recorded relationship${records.length === 1 ? '' : 's'} · ${esc(pair.families.map(f => `${f.family} ${f.count}`).join(' · '))}. Choose one to see its exact endpoints and line.</p><div class="dk-links nt-fold-members">${shown.map(e => `<button type="button" class="cm-link" data-nt="fold-edge" data-id="${esc(e.id)}">${esc(describeEdge(whole, e.id))}</button>`).join('')}</div>${records.length > shown.length ? `<button type="button" class="cm-btn" data-nt="pair-more">Show next ${Math.min(40, records.length - shown.length)} of ${records.length}</button>` : ''}<p class="nt-actions"><button type="button" class="cm-btn" data-nt="pair-clear">Clear connection selection</button></p></section>`;
  };
  // An element of a grouped picture that stands for a group (round 12, P): its reading, Open, and its members.
  function groupSpecimen(n) {
    const f = n.fold, whole = fold?.whole, items = (whole?.nodes || []).filter(x => f.members.includes(x.id)), open = fold?.F.groups.some(g => g.key === f.key && g.count > 1) && fold?.X?.fold.group.key !== f.key;
    const kinds = Object.entries(f.kinds || {}).sort((a, b) => b[1] - a[1]).map(([k, c]) => countWords(c, k)).join(', ');
    return `<section class="cm-spec nt-fold-spec"><h4 aria-level="3">${esc(n.kicker || 'Group')}</h4><p class="cm-spec-t"><b>${esc(n.fullTitle || n.title)}</b></p><p>${esc(kinds)}${f.internal ? ` · ${f.internal} relationship${f.internal === 1 ? '' : 's'} among them` : ''}. ${esc(describeNode(D, n.id).replace(/^[^:]*: [^.]*\. ?/, ''))}</p>${open ? `<p class="nt-actions"><button type="button" class="cm-btn" data-nt="fold-open" data-id="${esc(f.key)}">Open this group</button></p>` : ''}<h5 aria-level="4">In it</h5><div class="dk-links nt-fold-members">${items.slice(0, 12).map(x => `<button type="button" class="cm-link" data-nt="fold-member" data-id="${esc(x.id)}">${esc((x.ref ? x.ref + ' ' : '') + (x.fullTitle || x.title))}</button>`).join('')}${items.length > 12 ? `<p class="cm-muted">and ${items.length - 12} more; open the group to see them.</p>` : ''}</div></section>`;
  }
  function specimenOf(id) {
    const agg = !full?.nodes.some(x => x.id === id) && D?.nodes.find(x => x.id === id && x.fold); if (agg) return groupSpecimen(agg);
    const n = full?.nodes.find(x => x.id === id); if (!n) return '';
    const g = full.groups.find(g => g.id === n.group), r = n.record || {}, pinned = !!pins()[id];
    const rows = [['Type', n.kicker || KINDS[n.kind]?.short || 'Process step'], ['Reference', n.ref], ['In', g?.title], ['Detail', n.sub], ['Purpose', r.purpose || r.description || r.scenario], ['Owner', r.owner], ['Status', r.status || r.state], ['Change', n.change && n.change !== 'same' ? n.change + ' since the baseline' : '']].filter(([, v]) => v);
    const ch = CHAPTER_OF[n.type] || null, link = ch && ch !== chapter && !String(id).includes(':') ? `<a href="${esc(projectURL(`/?chapter=${ch}&tab=model&object=${encodeURIComponent(id)}`))}">Open in Chapter ${ch} →</a>` : '';
    const myNotes = state.notes.filter(x => x.sceneId === state.scene && x.targetId === id);
    const v = vitalsNow?.get?.(id);
    return `<section class="cm-spec"><h4 aria-level="3">${esc(n.kicker || KINDS[n.kind]?.short || 'Process step')}</h4><p class="cm-spec-t"><b>${esc(n.fullTitle || n.title)}</b></p><p>${esc(describeNode(full, id))}</p>${v ? `<p class="nt-vital nt-v-${esc(v.state)}">${esc(v.text)}</p>` : ''}${markLinesHTML(id)}<dl class="cm-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="nt-actions">${link}${pinned ? `<button type="button" class="cm-btn" data-nt="unpin" data-id="${esc(id)}">Release this pin</button>` : ''}<button type="button" class="cm-btn" data-nt="focus" data-id="1">Focus ± 1</button></p><details class="nt-notes-box"><summary>My notes (${myNotes.length})</summary>${myNotes.map(x => `<p class="nt-note-row">${esc(x.text)} <button type="button" data-nt="note-remove" data-id="${esc(x.id)}" aria-label="Remove this note">×</button></p>`).join('')}<form data-nt-form="note" data-id="${esc(id)}"><input name="text" maxlength="400" placeholder="A note on this element (kept in this browser only)" aria-label="Note text"><button type="submit" class="cm-btn">Add</button></form><small class="cm-muted">Notes stay in this browser; they are not part of the document. Raise a review item in Chapter 11 to make one count.</small></details></section>`;
  }
  listen(root, 'input', e => { const tf = e.target.closest?.('[data-nt-field="draft-target-find"]'); if (tf) { filterTargets(tf.value); return; } const f = e.target.closest?.('[data-nt-field="find"],[data-nt-field="tfilter"],[data-nt-field="xrfilter"],[data-nt-field="xcfilter"]'); if (f) api.change(e); });
  // Escape clears a build-up first (round 6), then a lit trace (round 5), before the chapter's own Escape clears the selection.
  window.addEventListener('keydown', e => {
    const drafting = draft && draft.mode !== 'ghost' && draft.mode !== 'link';
    if (e.key !== 'Escape' || !root.isConnected || !(state.build || marksInfo('trace') || drafting) || document.querySelector('dialog[open]')) return;
    const t = e.target; if (t?.closest?.('.nt-pop, input:not([data-nt-field="draft-target-find"]), select, textarea, [contenteditable="true"]')) return;
    if (t && t !== document.body && t !== document.documentElement && !root.contains(t) && !inCompanion(t)) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (drafting) cancelAll(); else if (state.build) api.clearBuild(); else api.clearTrace();
  }, true);
  const exportFileName = ext => {
    const name = exportName(project(), chapter, D, arrangement(), ext, state.baseline);
    return fold ? name.slice(0, -ext.length - 1) + (fold.X ? (state.view === 'layers' ? '-lane-detail.' : '-group-detail.') : '-overview.') + ext : name;
  };
  // One document and layout supply every file's content, name and Manifest entry.
  // PNG's asynchronous decoding and encoding belong to that same drawn context.
  const exportStatus = text => { const line = root.querySelector('.cm-export-status'); if (line) line.textContent = text; else api.announce(text); };
  const exportContext = includeSVG => {
    const p = project(), d = D, l = L, render = renders, view = state.view, selection = sel, edge = state.selEdge, picks = [...selected].join('\0');
    const key = pref(), route = location.href, revision = window.aiwProjectStore?.value?.revision, surface = root.querySelector('.cm-svg');
    const names = new Map(['svg', 'png', 'manifest.json', ...CODE_FORMATS.map(f => f.ext)].map(ext => [ext, exportFileName(ext)]));
    return {p, D: d, L: l, arrangement: arrangement(), baseline: state.baseline, name: ext => names.get(ext), svg: includeSVG ? api.svgString() : '',
      current: () => root.isConnected && root.querySelector('.cm-svg') === surface && project() === p && D === d && L === l && renders === render && state.view === view && sel === selection && state.selEdge === edge && [...selected].join('\0') === picks && pref() === key && location.href === route && window.aiwProjectStore?.value?.revision === revision};
  };
  const pictureFiles = c => {
    const file = (ext, text, mediaType) => ({path: c.name(ext), text, mediaType, scene: c.D.scene.id, arrangement: c.arrangement, chapter});
    const files = [file('svg', c.svg, 'image/svg+xml')];
    for (const f of CODE_FORMATS.filter(f => !f.scenes || f.scenes.includes(c.D.scene.id))) { try { files.push(file(f.ext, codeFile(f.id, c.D, c.L, {project: c.p, chapter}).text, f.mediaType)); } catch { /* a format that cannot carry this scene is left out */ } }
    return files;
  };
  const api = {
    state, scenes, scene, arrangement,
    diagram: () => D, layout: () => L, full: () => full,
    // The views this module draws for a chapter model, and the switcher's entries for them (round 3, D).
    views: ['diagram', ...SHARED_VIEWS.map(v => v.id)],
    owns: v => v === 'diagram' || SHARED_VIEWS.some(x => x.id === v),
    view: () => state.view,
    // The chapter's own views (Responsibilities, Coverage …) honour the layers where an element stands for a record
    // of the connected model: its card or chip is hidden with its layer, the sidebar counts what the view holds, and the
    // picture says how many the layers hide. Called by the chapter after it draws one of its own views.
    ownView() {
      state.view = 'own'; state.menu = null;
      // A placement, a kinds menu or a target list belongs to the picture it was started on (rc41 close: on the chapter's
      // own view its status line stayed and the placement took every click of the view).
      if (dropDraft()) paintDraft();
      root.querySelector('.cm-export-standard')?.replaceChildren();
      // Leaving a shared sheet (Table, Matrix, Whole design) for one of the chapter's own views.
      root.classList.remove('nt-sheet-on', 'nt-layers-overview'); root.dataset.ntView = 'own';
      const sh = root.querySelector('.cm-sheet[data-anatomy]'); if (sh) { anatomyModule?.leaveAnatomyView?.(); delete sh.dataset.anatomy; sh.innerHTML = ''; }
      const p = project(), C = p ? connectedOf(p, chapter) : null, layerOf = new Map((C?.nodes || []).map(n => [n.id, n.layer]));
      const keep = new Set(layersNow()), seen = new Map(), off = new Set();
      for (const el of root.querySelectorAll('.cm-world [data-sel], .cm-world [data-card], .cm-heads [data-sel], .cm-rail [data-sel]')) {
        const id = el.dataset.sel || el.dataset.card, l = layerOf.get(id); if (!l) { el.classList.remove('nt-layer-off'); continue; }
        seen.set(id, l); const hide = !keep.has(l); el.classList.toggle('nt-layer-off', hide); if (hide) off.add(id);
      }
      const counts = Object.fromEntries(LAYERS.map(l => [l, 0])); for (const l of seen.values()) counts[l]++;
      applyTray(root, p, chapter);
      const label = root.querySelector('.cm-view[aria-pressed="true"]')?.textContent.trim() || 'This view';
      layerNote(hiddenNoteHTML(off.size)); foldNote(false); stage.overview?.(null);
      try { window.aiwSetModelLayers?.(layersNow(), {chapter: Number(chapter), view: 'own', model: root.querySelector('.cm-view[aria-pressed="true"]')?.dataset.id, picture: withNote(label), counts, drawn: counts, visible: layersNow(), hidden: off.size, chapterLayers: chapterLayers(chapter)}); } catch { /* the sidebar is optional */ }
    },
    // Where a requested view lands (instrument-tray.js resolveView): a renamed view by its old id on its new one, a retired
    // view on the instrument that keeps its question, a view this project cannot draw yet on the chapter's default. A deep
    // link (`how` 'link') that lands elsewhere is said in the picture's name; a remembered preference falls back quietly.
    settle(id, how = 'memory') {
      const r = resolveView(project(), chapter, id, {shared: api.views});
      if (how === 'memory' && id && root.dataset) root.dataset.rememberedView = r.view;
      if (r.note && how === 'link') fallbackNote = r.note;
      if (r.scene && scenes.some(s => s.id === r.scene)) { state.scene = r.scene; state.hub = null; state.focus = null; state.selEdge = null; }
      return r.view;
    },
    offeredScenes,
    layers: () => layersNow(),
    viewButtonsHTML(attr) { return sharedButtonsHTML(attr, project()); },
    // Puts the shared views after the chapter's own in its switcher: Diagram · its own views · Layers · Table · Matrix · Whole design.
    addViews(attr) { const box = root.querySelector('.cm-views'); if (!box || box.querySelector('.nt-shared-view')) return; box.insertAdjacentHTML('beforeend', api.viewButtonsHTML(attr)); box.setAttribute('aria-label', 'Model views'); },
    // The selected element's details carry "Open in Work" inside them and its open checks after them.
    withSelected(spec, id) {
      const p = project();
      if (!spec && id && state.view === 'table') spec = tableRecordHTML(tableOf(p), id);
      if (!spec || !id) return spec;
      const recordHome = chapterOfRecord(p, id), editable = !!recordHome || !!findRecord(p, id) || !!window.aiwLogicalStudio?.graph?.().nodes.some(n => n.id === id && !n.ghost);
      const home = recordHome || homeChapter(p, id) || homeOf(id), destination = historyWorkDestination(p, id), link = (!editable || spec.includes('data-cm-open-work') ? '' : openInWorkHTML(destination?.id || id, {chapter, home, title: full?.nodes.find(n => n.id === id)?.title || architectureModel(p).objects.get(id)?.title || '', ...destination}))
        // Any record of the one model can be traced through the design (round 5).
        + (p && !spec.includes('data-nt="trace"') && modelIds(p).includes(id) ? `<p class="nt-actions nt-trace-act"><button type="button" class="cm-btn" data-nt="trace" data-id="${esc(id)}" aria-pressed="${marksInfo('trace')?.from === id}">Trace through the design</button></p>` : '');
      const i = spec.indexOf('</section>'), withLink = link ? (i < 0 ? spec + link : spec.slice(0, i) + link + spec.slice(i)) : spec;
      // Round 10 (N6): in a picture this module draws, the lines the element shares, each relationship on them a button.
      const lines = (state.view === 'diagram' || state.view === 'layers') && L && D?.nodes.some(n => n.id === id) && !spec.includes('nt-lines-node') ? nodeLinesHTML(D, L, id) : '';
      // The shell and every model already share this saved-record reading.
      const dossier = p && !spec.includes('data-nt-dossier=') ? modelDossierHTML(p, id, {chapter, open: state.view === 'diagram' || state.view === 'layers'}) : '';
      // The Drivers lens (rc39): a lit element's basis for the chosen driver, with its Decide action, before the dossier.
      const basisRead = (state.view === 'diagram' || state.view === 'layers') && !spec.includes('nt-basis') ? basisHTML(id) : '';
      return withLink + lines + basisRead + dossier + (spec.includes('nt-checks') ? '' : checksHTML(p, id));
    },
    // A dense Layers index opens at reading size with pan/minimap and an accurate in-view count. Fit to whole on
    // the grouped note still offers the entire arrangement at once; a reader chooses when to trade text size for scope.
    // Where a picture opens (rc39, W2 step 3). The Layers overview opens where its type groups list their members (the
    // mid level, from 0.8). A diagram opens at the fit of the whole drawing where that keeps its labels at 10 px or more
    // on screen (far out, the names at FAR px × zoom; nearer, the titles at NL.TITLE × zoom); where fitting the whole
    // drawing would put them under 10 px it opens at the furthest zoom that keeps them at 10 px, on the densest part of
    // the picture (model-stage.js frame). rc41 (lead): was the Readable view at 100 %, which on a long process picture
    // at scale showed 2 of its 24 steps on a short stage (figures-at-size-browser, red since rc39); the far level keeps
    // its names at 10 px from 53 %. A camera the reader has chosen for the view is kept (model-stage.js fit).
    arrival() {
      if (state.view === 'layers' && D?.layerSummary) return 0.8;
      const c = contentOf(L), b = stage.box?.(); if (!c || !b) return 0.5;
      const pad = 24, zf = Math.min((b.w || 900) / (c.x2 - c.x1 + 2 * pad), Math.max(1, (b.h || 520) - (b.top || 0)) / (c.y2 - c.y1 + 2 * pad));
      const labelPx = (zf < 0.8 ? FAR : NL.TITLE) * zf;
      return labelPx < 10 ? legibleZoom(zf) : 0.5;
    },
    // (rc40: a picture that fits the stage with room to spare arrives at 100 %, never enlarged past it)
    fit() { const minimum = api.arrival(); if (stage.fit) stage.fit({minimum, maximum: 1}); else stage.frame?.(minimum, 1); stage.apply(); },
    render({sel: s = null, view = null} = {}) {
      root.dataset.ntScene = scene()?.id || '';
      renders++;
      const enteringLayers = view === 'layers' && state.view !== 'layers';
      if (view && api.owns(view) && view !== state.view) { state.view = view; state.menu = null; state.focus = null; state.selEdge = null; state.pair = null; state.edgeReveal = null; selected.clear(); state.history = []; arrangeMessage = ''; dropDraft(); }
      if (selected.size && s !== sel && !selected.has(s)) selected.clear();
      selectionChanged = s !== sel; sel = s; const p = project(), isSheet = SHEETS.has(state.view);
      if (enteringLayers && !['all', 'none'].includes(state.emphasisBy.connected)) {
        if (sel && connectedOf(p, chapter)?.nodes.some(n => n.id === sel && !n.fold)) { state.focus = {id: sel, hops: 1}; state.unfold = 'connected'; state.emphasisBy.connected = 'neighbourhood'; }
        else { state.unfold = null; if (!STEPPED_LEVELS.includes(state.emphasisBy.connected)) state.emphasisBy.connected = 'adjacent'; }
      }
      applyTray(root, p, chapter); ensureAddEntries();
      root.classList.toggle('nt-sheet-on', isSheet); root.dataset.ntView = state.view;
      drawing = true; try { publishChecks(p); build(p); } finally { drawing = false; }
      root.classList.toggle('nt-layers-overview', state.view === 'layers' && !!D?.layerSummary);
      tellSidebar();
      const svg = root.querySelector('.cm-svg'), html = root.querySelector('.cm-html'), world = root.querySelector('.cm-world');
      if (isSheet) { svg.innerHTML = ''; html.innerHTML = ''; layerNote(''); foldNote(false); renderSheet(p); stage.overview?.(null); return {W: 640, H: 320, nodes: [], groups: [], edges: [], bands: []}; }
      if (anatomyModule && root.querySelector('.cm-sheet[data-anatomy]')) { anatomyModule.leaveAnatomyView?.(); delete root.querySelector('.cm-sheet').dataset.anatomy; }
      layerNote(hiddenNoteHTML(full && D ? full.nodes.length - (fold ? fold.whole : D).nodes.length : 0, state.edgeOff.filter(f => full?.edges.some(e => styleOf(e.kind).family === f)).length));
      foldNote();
      if (!L) { svg.innerHTML = ''; html.innerHTML = '<p class="cm-empty">No diagram for this chapter.</p>'; stage.overview?.(null); return {W: 640, H: 320}; }
      world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
      svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
      svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', fold ? `${state.view === 'layers' ? 'Layers' : scene()?.title || 'Diagram'}: ${fold.F.total.nodes} elements and ${fold.F.total.edges} relationships, grouped into ${D.counts.nodes} drawn elements and ${D.layerSummary ? `${D.layerSummary.pairs.length} directional relationship summaries` : `${D.counts.edges} drawn relationships`}` : `${state.view === 'layers' ? 'Layers' : scene()?.title || 'Diagram'}: ${D.counts.nodes} elements, ${D.counts.edges} relationships`);
      // A chapter's own stylesheet may size its canvas; the diagram's picture keeps its own size.
      svg.style.width = L.W + 'px'; svg.style.height = L.H + 'px'; svg.style.maxWidth = 'none';
      const parts = svgParts(D, L, {prefix: PREFIX, sel, selEdge: state.selEdge, interactive: true, vitals: vitalsNow, callouts: callouts(), diff: !!full?.diff, marks: marksNow()}), lift = liftParts(parts.lift);
      // Round 10 (N6): the lift over the lines and under the elements, its end rings over the elements, the hits on top.
      svg.innerHTML = `<style>${SVG_STYLE}</style>${parts.defs}${parts.descs}${parts.bands}${parts.groups}${parts.edges}${lift.under}${parts.nodes}${parts.ghosts}${lift.over}${parts.hits}${parts.callouts}`;
      paintSelection(); lastConnectionPaint = null; paintConnections(); paintDrivers(); paintDraft();
      painted = marksVersion() + '|' + checksOn();
      // A lane the chapter holds nothing in is a strip to read, not to open.
      for (const b of L.bands) if (b.none) svg.querySelector(`.nt-band[data-nt-lane="${CSS.escape(b.layer)}"]`)?.classList.add('nt-band-none');
      if (state.find) for (const id of findMatches()) svg.querySelector(`[data-nt-node="${CSS.escape(id)}"]`)?.classList.add('found');
      html.innerHTML = headerHTML(L.header)
        + (D.notes.length ? `<div class="nt-notes" style="left:${NL.LEFT}px;top:${L.notesY ?? L.H - 30 - 18 * D.notes.length}px">${D.notes.map(t => `<p>${esc(t)}</p>`).join('')}</div>` : '')
        + (!D.nodes.length && full?.nodes.length ? `<div class="cm-empty-card" style="left:${NL.LEFT + 20}px;top:${(L.bands.length ? L.bands[L.bands.length - 1].y + L.bands[L.bands.length - 1].h : NL.TOP) + 20}px"><b>Every layer of this picture is hidden</b><p>${full.nodes.length} element${full.nodes.length === 1 ? '' : 's'} stand in layers switched off in the sidebar or the Layers menu.</p><button type="button" class="cm-btn" data-nt="layers-all">Show every layer</button></div>` : '')
        + (!D.nodes.length && !full?.nodes.length ? `<div class="cm-empty-card" style="left:${NL.LEFT + 20}px;top:${NL.TOP + 20}px"><b>Nothing to draw yet</b><p>${esc(D.notes[0] || 'This chapter records nothing this diagram shows.')}</p><a class="btn" href="${esc(projectURL('/?chapter=' + chapter + '&tab=work'))}">Create the first record on Work →</a>${draftActionHTML(full ? project() : null, chapter)}</div>` : '');
      if (L.droppedPins?.length) html.insertAdjacentHTML('beforeend', `<div class="nt-notes nt-warn" style="left:${NL.LEFT}px;top:${(L.notesY ?? L.H) + 18 * D.notes.length + 4}px"><p>${L.droppedPins.length} saved position${L.droppedPins.length === 1 ? '' : 's'} could not be applied. Open Arrange to review or release them.</p></div>`);
      if (state.vitals && !vitalsNow) vitalsMap().then(m => { if (m && root.isConnected) { vitalsNow = m; api.onChange?.(); } });
      overview();
      return L;
    },
    // What the lens row carries in the Diagram view: the scene, the environment, Arrange, Layers, Focus, Compare, Download.
    barHTML() {
      const sc = scene();
      mountArrangePanel(arrangeCtx());
      // The picker offers the pictures this project can draw; its last entry, not selectable, names what later records add.
      const so = offeredScenes();
      const scenePick = state.view === 'diagram' && (so.offered.length > 1 || so.later.length) ? `<label class="cm-scn nt-scene"><span title="${esc(sc?.purpose || '')}">Viewpoint</span><select data-nt-field="scene" aria-label="Architecture viewpoint" title="${esc(sc?.purpose || '')}">${so.offered.map(s => `<option value="${esc(s.id)}" ${s.id === sc?.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}${so.later.length ? `<option value="" disabled class="nt-scene-later">Later: ${esc(so.later.map(l => l.word).join(' · '))}</option>` : ''}</select></label>` : '';
      const envs = full?.scene && ['deployment', 'usage'].includes(full.scene.id) ? (project()?.runtime?.environments || []) : [];
      const envPick = envs.length > 1 && typeof environment !== 'function' ? `<label class="cm-scn nt-env"><span>Environment</span><select data-nt-field="env" aria-label="Environment">${envs.map(e => `<option value="${esc(e.id)}" ${e.id === (full?.environmentId) ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select></label>` : '';
      const openedLane = openedLaneMembers(), memberTypes = new Map();
      for (const n of openedLane?.members || []) { const type = n.type || n.kind; if (!memberTypes.has(type)) memberTypes.set(type, []); memberTypes.get(type).push(n); }
      const lanePick = openedLane ? `<label class="cm-scn nt-lane-pick"><span>${esc(openedLane.group.title)} · ${openedLane.members.length} elements</span><select data-nt-field="lane-member" aria-label="Explore an element in ${esc(openedLane.group.title)}" title="Choose any member, grouped by its recorded type, to explore its direct connections"><option value="">Explore an element…</option>${[...memberTypes].sort((a,b) => a[0].localeCompare(b[0])).map(([type, nodes]) => `<optgroup label="${esc(typeCount(type, nodes.length))}">${nodes.map(n => `<option value="${esc(n.id)}">${esc((n.ref ? n.ref + ' · ' : '') + n.title)}</option>`).join('')}</optgroup>`).join('')}</select></label>` : '';
      const sequence = state.view === 'diagram' && sc?.id === 'sequence' ? `<label class="cm-scn"><span>Contract</span><select data-nt-field="sequence-contract" aria-label="Sequence contract"><option value="">All contracts</option>${(project()?.interfaces?.contracts || []).map(c => `<option value="${esc(c.id)}" ${state.sequenceContract === c.id ? 'selected' : ''}>${esc((c.ref || c.id) + ' · ' + c.title)}</option>`).join('')}</select></label><label class="cm-scn"><input type="checkbox" data-nt-field="sequence-data" ${state.sequenceData ? 'checked' : ''}> Include data definition lifelines</label>` : '';
      const menu = (id, label, body, icon) => `<div class="nt-menu" data-nt-menu="${id}"><button type="button" class="cm-btn" data-nt="menu" data-id="${id}" aria-expanded="${state.menu === id}" aria-haspopup="menu">${icon}<span>${label}</span></button>${state.menu === id ? `<div class="nt-pop" role="menu" aria-label="${esc(label)}">${body}</div>` : ''}</div>`;
      // rc40 W2: the Arrange control; its panel is docked beside the stage by mountArrangePanel below (arrange-panel.js).
      const arrange = arrangeControlHTML(arrangeCtx());
      // The Layers menu is the sidebar's layer control (one layer model): per layer how many elements this picture holds,
      // Show every layer and Only this chapter's layers, then the relationship kinds drawn, each of which can be hidden.
      const counts = layerCounts(full), hiddenN = full && D ? full.nodes.length - (fold?.whole || D).nodes.length : 0, fams = edgeFamilies(full);
      const layerRows = LAYERS.map(l => { const n = counts[l]; return `<label class="nt-layer${n ? '' : ' none'}" role="menuitemcheckbox" aria-checked="${!!n && state.layers.includes(l)}" aria-disabled="${!n}"><input type="checkbox" data-nt="layer" data-id="${l}" ${n && state.layers.includes(l) ? 'checked' : ''} ${n ? '' : 'disabled'}> ${esc(LAYER_NAMES[l])}<small>${n ? n : 'none in this picture'}</small></label>`; }).join('');
      const edgeRows = fams.length ? `<hr><p class="nt-hint">Relationship kinds</p>${fams.map(f => `<label class="nt-layer" role="menuitemcheckbox" aria-checked="${!state.edgeOff.includes(f.family)}"><input type="checkbox" data-nt="edgekind" data-id="${esc(f.family)}" ${state.edgeOff.includes(f.family) ? '' : 'checked'}> ${esc(f.title.split(' · ')[0])}<small>${f.count}</small></label>`).join('')}` : '';
      // The Checks switch (round 5): the chapter's checks painted on this picture, kept per chapter and picture.
      const checksRow = `<hr><label class="nt-layer nt-checks-switch" role="menuitemcheckbox" aria-checked="${checksOn()}"><input type="checkbox" data-nt="checks" ${checksOn() ? 'checked' : ''}> Checks<small>${esc(['pass', 'fix', 'confirm'].map(k => MARK_GLYPHS[k]).join(' '))} on the picture</small></label>`;
      // The show/hide-layers menu is called Visibility (rc39): the Layers view keeps its name; the menu keeps data-id="layers".
      const layers = menu('layers', `Visibility${hiddenN ? ` · ${hiddenN} hidden` : ''}`, layerRows + `<button type="button" role="menuitem" data-nt="layers-all">Show every layer</button><button type="button" role="menuitem" data-nt="layers-chapter">Only this chapter’s layers</button>` + edgeRows + checksRow, layersIcon());
      // Trace (round 5): the chain from the selected element, or from a requirement, lights through the layers.
      const tr = marksInfo('trace'), selTitle = sel && (full?.nodes.find(n => n.id === sel)?.title || '');
      const reqs = (() => { try { return [...architectureModel(project()).objects.values()].filter(o => o.type === 'requirement').sort((a, b) => String(a.ref).localeCompare(String(b.ref), undefined, {numeric: true})); } catch { return []; } })();
      const trace = menu('trace', tr ? `Trace · ${esc(tr.ref)}` : 'Trace', (sel && modelIds(project()).includes(sel) ? `<button type="button" role="menuitem" data-nt="trace" data-id="${esc(sel)}"><b>Trace the selected element</b><small>${esc(selTitle)}</small></button>` : '<p class="nt-hint">Select an element to trace it, or start from a requirement.</p>') + (reqs.length ? `<label class="nt-find"><span>From a requirement</span><select data-nt-field="trace" aria-label="Trace from a requirement"><option value="">Choose a requirement…</option>${reqs.map(r => `<option value="${esc(r.id)}" ${tr?.from === r.id ? 'selected' : ''}>${esc((r.ref && r.ref !== r.title ? r.ref + ' · ' : '') + r.title)}</option>`).join('')}</select></label>` : '') + `<button type="button" role="menuitem" data-nt="trace-clear" ${tr ? '' : 'disabled'}>Clear the trace<small>Escape</small></button>`, traceIcon());
      // Build (round 6): the modes registered, the one running checked, and the transport; the step line stands under the bar.
      const b = state.build, modeRows = buildModeList().map(x => { const mode = buildModes.get(x.id); let ok = true; try { ok = mode.available ? mode.available(D, project()) : true; } catch { ok = 'Not available for this picture'; } return `<button type="button" role="menuitemradio" aria-checked="${b?.mode === x.id}" data-nt="build" data-id="${esc(x.id)}" ${ok === true ? '' : 'disabled'}><b>${esc(x.title)}</b><small>${esc(ok === true ? x.sub : typeof ok === 'string' ? ok : 'Not available for this picture')}</small></button>`; }).join('');
      const buildMenu = menu('build', esc(buildMenuLabel()), (modeRows || '<p class="nt-hint">No build-up mode is registered.</p>') + `<hr><button type="button" role="menuitem" data-nt="build-back" ${b && b.step > 0 ? '' : 'disabled'}>Back<small>the step before</small></button><button type="button" role="menuitem" data-nt="build-next" ${b && b.step < buildSteps.length - 1 ? '' : 'disabled'}>Next<small>the next step</small></button><button type="button" role="menuitem" data-nt="build-play" ${b && buildSteps.length ? '' : 'disabled'} aria-pressed="${!!b?.playing}"><span class="nt-build-playword">${b?.playing ? 'Pause' : 'Play'}</span><small>${BUILD_MS} ms a step; any click pauses</small></button><button type="button" role="menuitem" data-nt="build-stop" ${b ? '' : 'disabled'}>Clear the build-up<small>Escape</small></button>`, buildIcon());
      const buildLine = b ? `<div class="nt-zoom nt-build-ctl" role="group" aria-label="Build-up steps"><button type="button" class="cm-btn" data-nt="build-back" ${b.step > 0 ? '' : 'disabled'} aria-label="Back one step" title="Back one step">‹<span> Back</span></button><button type="button" class="cm-btn" data-nt="build-next" ${b.step < buildSteps.length - 1 ? '' : 'disabled'} aria-label="Next step" title="Next step">›<span> Next</span></button><button type="button" class="cm-btn" data-nt="build-play" ${buildSteps.length ? '' : 'disabled'} aria-pressed="${!!b.playing}" title="${BUILD_MS} ms a step; any click pauses"><span class="nt-build-playword">${b.playing ? 'Pause' : 'Play'}</span></button><button type="button" class="cm-btn" data-nt="build-stop" aria-label="Clear the build-up" title="Clear the build-up (Escape)">×</button></div><p class="you-are-here nt-build-line" aria-live="polite"><span class="yah-k">Build</span> <span class="nt-build-text">${esc(buildLineText())}</span></p>` : '';
      const f = state.focus, focusLabel = f?.groupId ? 'Focus · group' : f?.id ? `Focus · ±${f.hops}` : 'Focus';
      const focus = menu('focus', focusLabel, (sel ? `<button type="button" role="menuitem" data-nt="focus" data-id="1">Only the selected element ± 1 hop</button><button type="button" role="menuitem" data-nt="focus" data-id="2">Only the selected element ± 2 hops</button>${full?.nodes.find(n => n.id === sel)?.group ? `<button type="button" role="menuitem" data-nt="focus" data-id="group">Only its container</button>` : ''}` : '<p class="nt-hint">Select an element to focus on its neighbourhood.</p>') + `<button type="button" role="menuitem" data-nt="focus" data-id="all" ${f ? '' : 'disabled'}>Everything</button>` + `<hr><label class="nt-layer" role="menuitemcheckbox" aria-checked="${state.overlays.findings}"><input type="checkbox" data-nt="overlay" data-id="findings" ${state.overlays.findings ? 'checked' : ''}> Findings on the picture</label><label class="nt-layer" role="menuitemcheckbox" aria-checked="${state.overlays.notes}"><input type="checkbox" data-nt="overlay" data-id="notes" ${state.overlays.notes ? 'checked' : ''}> My notes</label><label class="nt-layer" role="menuitemcheckbox" aria-checked="${state.overlays.proposed}"><input type="checkbox" data-nt="overlay" data-id="proposed" ${state.overlays.proposed ? 'checked' : ''}> Sol’s proposals</label>` + (full?.nodes.some(n => n.sol) ? `<label class="nt-layer" role="menuitemcheckbox" aria-checked="${state.vitals}"><input type="checkbox" data-nt="vitals" ${state.vitals ? 'checked' : ''}> Vitals overlay</label>` : ''), focusIcon());
      const bl = baselines(), compare = bl.length ? `<label class="cm-scn nt-compare"><span>Compare</span><select data-nt-field="baseline" aria-label="Compare with a frozen baseline"><option value="">Working document</option>${bl.map(b => `<option value="${esc(b.id)}" ${b.id === state.baseline ? 'selected' : ''}>${esc(b.id + ' · ' + b.title)}</option>`).join('')}</select></label>` : '';
      const standardExport = root.querySelector('.cm-export-standard');
      if (standardExport) standardExport.innerHTML = !SHEETS.has(state.view) ? `<h4>${fold ? 'Current grouped view' : state.focus ? 'Current focused diagram' : 'Complete current diagram'} and editable formats</h4>${fold ? '<p class="cm-muted">Choose Show every element to draw and export the individual records in this scope. Connections controls only change the screen’s visible paths.</p>' : ''}<button type="button" class="cm-btn" data-nt="export" data-id="svg" title="Current diagram with its key, scope and metadata">Diagram SVG</button><button type="button" class="cm-btn" data-nt="export" data-id="png" title="Current diagram as a raster image">Diagram PNG</button>` + CODE_FORMATS.filter(f => !f.scenes || f.scenes.includes(sc?.id)).map(f => `<button type="button" class="cm-btn" data-nt="export" data-id="${esc(f.id)}" title="${esc(f.sub)}">${esc(f.title)}</button>`).join('') + '<button type="button" class="cm-btn" data-nt="export" data-id="manifest">Manifest</button>' : '';
      // Find marks every match as the reader types; the zoom and fit controls stay in reach whatever the stage scrolls.
      const find = `<label class="nt-find nt-bar-find"><span>Find</span><input type="search" data-nt-field="find" value="${esc(state.find)}" placeholder="reference or name" aria-label="Find an element by reference or name"></label><span class="nt-found-count" aria-live="polite">${foundWords()}</span>`;
      const em = emphasisFor();
      // The Connections control (rc40, W1): the levels None · Structure · Adjacent · All, then Selected; Reveal next under
      // the active stepped level adds the paths beyond it, six at a time, without moving or expanding an element
      // (rc41: inside the level first, while the level's budget keeps some of its own paths back).
      const connections = em ? `<div class="nt-connections"><span class="nt-connections-label">Connections</span><div class="nt-connection-modes" role="group" aria-label="Connection level">${CONNECTION_LEVELS.map(({id, title: label, hint}) => `<button type="button" data-nt="connections" data-id="${id}" aria-pressed="${em.mode === id}"${id === 'neighbourhood' && !em.selected ? ' disabled' : ''} title="${esc(id === 'neighbourhood' && !em.selected ? 'Select an individual element to show its direct connections' : hint)}">${esc(label)}</button>`).join('')}</div><small class="nt-connection-caption" aria-live="polite">${esc(connectionCaption(em))}</small>${revealHTML(em)}</div>` : '';
      if (SHEETS.has(state.view)) return state.view === 'whole' ? '' : layers;
      const settings = sequence + compare;
      const options = settings ? menu('options', 'View options', settings, codeIcon()) : '';
      // One command bar owns every contextual action. The full-format export lives
      // alongside visible-view export in the shared footer, not in a second toolbar.
      // rc41 W3: a chapter whose Model header has no Add menu (Chapters 2 and 3 add with one button) places a new record
      // on its picture from the bar's own "Add here" menu; the others carry the entries in their Add menu.
      const addHere = !root.querySelector('.cm-add') && draftTypesFor(chapter).length ? menu('add-here', 'Add here', addHereHTML(chapter, {view: state.view, role: 'menuitem'}), addHereIcon()) : '';
      return scenePick + envPick + lanePick + connections + driversPickHTML() + find + arrange + addHere + layers + focus + trace + buildMenu + options + buildLine;

    },
    status() {
      if (state.view === 'table') { const T = tableOf(project()); return `Table · Chapter ${chapter} · ${T.rows.length} record${T.rows.length === 1 ? '' : 's'}`; }
      if (state.view === 'cross') { const c = crossOf(project()).X; return c ? `Matrix · ${c.rowLabel} × ${c.colLabel} · ${c.rows.length} × ${c.cols.length}` : 'Matrix'; }
      if (state.view === 'whole') return 'Whole design · the design anatomy, as of this chapter';
      if (state.view === 'layers' && D) { const source = fold?.whole || D, lanes = new Set(source.nodes.map(n => n.layer)).size, h = full.nodes.length - source.nodes.length; return `Layers · ${source.nodes.length} element${source.nodes.length === 1 ? '' : 's'} in ${lanes} lane${lanes === 1 ? '' : 's'} · ${source.edges.length} relationship${source.edges.length === 1 ? '' : 's'}${fold ? ` · ${fold.X ? 'one lane opened' : `${D.nodes.length} overview groups drawn`}` : ''}${h ? ` · ${h} hidden by the layers` : ''}${state.focus ? ' · focused' : ''}`; }
      if (!D) return ''; const c = D.counts, drawn = L?.groups.length || 0; return `${scene()?.title || 'Diagram'} · ${c.nodes} element${c.nodes === 1 ? '' : 's'} · ${c.edges} relationship${c.edges === 1 ? '' : 's'}${drawn ? ` · ${drawn} group${drawn === 1 ? '' : 's'}` : ''}${c.hidden ? ` · ${c.hidden} hidden by the layers` : ''}${state.focus ? ' · focused' : ''}${full?.diff ? ` · ${full.counts.added} added, ${full.counts.removed} removed, ${full.counts.changed} changed` : ''} · ${ARRANGEMENTS.find(x => x.id === arrangement())?.title || ''}`; },
    // The Key, from what is drawn: the element kinds, the relationship styles and their words, the containers, the marks.
    legendHTML() {
      if (!D) return '';
      // The lines drawn together (round 10) are in the Key only when this picture draws them.
      const K = legendData(D, L);
      const line = (st, both = false) => `<svg width="44" height="12" aria-hidden="true"><defs></defs><path d="M3 6H36" fill="none" stroke="${st.stroke}" stroke-width="1.4"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}${st.head !== 'none' ? ` marker-end="${markerRef(PREFIX, st.head, st.stroke)}"` : ''}${st.tail !== 'none' || both ? ` marker-start="${markerRef(PREFIX, st.tail !== 'none' ? st.tail : st.head, st.stroke)}"` : ''}/></svg>`;
      const selEdge = state.selEdge && D.edges.find(e => e.id === state.selEdge);
      const edgeBlock = selEdge ? `<h5 aria-level="4">Selected relationship</h5><p class="nt-selrel">${line(styleOf(selEdge.kind))}${esc(describeEdge(D, selEdge.id))}${selEdge.record?.id || selEdge.record?.ref ? ` <small>Record ${esc(selEdge.record.ref || selEdge.record.id)}</small>` : ''}</p>` : '';
      const counts = layerCounts(full), drawnBy = layerCounts(fold?.whole || D), layerKey = LAYERS.filter(l => counts[l]).map(l => `<p><i class="nt-k nt-lk nt-lk-${l}"></i>${esc(LAYER_NAMES[l])} <small>${drawnBy[l]} of ${counts[l]}${drawnBy[l] < counts[l] ? ' · ' + (counts[l] - drawnBy[l]) + ' hidden' : ''}</small></p>`).join('');
      // The marks drawn (round 5): every state on the picture, in its glyph or sample and its words.
      // The "+N" badge (rc39): the elements whose connections the Overview has not shown yet, counted as paintConnections counts them.
      const em = emphasisFor(), pendingOn = em?.stepped ? D.nodes.filter(n => hiddenNeighbours(D.edges, em.paths, n.id) > 0).length : 0;
      // The level in the Key (rc40): what the picture shows of its relationships, in the control's own words, under its
      // own heading ("On the picture" stays the marks' section: with the checks off and nothing pending it is absent).
      const levelKey = em ? `<h5 aria-level="4">Connections</h5><p class="nt-mk-key nt-level-key" data-nt-level="${esc(em.mode)}"><i class="nt-k nt-level-k" aria-hidden="true">${esc(connectionLevelTitle(em.mode))}</i>${esc(em.mode === 'neighbourhood' ? 'The selected element’s direct connections' : CONNECTION_LEVELS.find(l => l.id === em.mode)?.hint || '')} <small>${em.active} of ${em.total}${esc(em.stepped ? levelWords(em) : '')}</small></p>` : '';
      const MK = marksLegend(marksNow(), D, markWords()), markKey = levelKey + (MK.length || pendingOn ? `<h5 aria-level="4">On the picture</h5>${MK.map(m => `<p class="nt-mk-key" data-nt-mark="${esc(m.state)}"><i class="nt-k nt-mk-k ${esc(m.state)}" aria-hidden="true">${esc(m.glyph)}</i>${esc(m.text)} <small>×${m.count}</small></p>`).join('')}${pendingOn ? `<p class="nt-mk-key" data-nt-mark="pending"><i class="nt-k nt-pending-k" aria-hidden="true">+N</i>Connections not yet shown: Reveal next or All adds them <small>×${pendingOn}</small></p>` : ''}` : '');
      // Glyphs and technology icons drawn (round 6): the same two sections the exported Key carries.
      const glyphKey = (K.glyphs?.length ? `<h5 aria-level="4">Glyphs</h5>${K.glyphs.map(g => `<p><i class="nt-k"></i>${esc(g.text)}${g.count > 1 ? ` <small>×${g.count}</small>` : ''}</p>`).join('')}` : '') + (K.icons?.length ? `<h5 aria-level="4">Icons</h5>${K.icons.map(i => `<p><i class="nt-k"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${esc(i.path)}"/></svg></i>${esc(i.title)}${i.count > 1 ? ` <small>×${i.count}</small>` : ''}</p>`).join('')}` : '');
      const vp = viewpointOf(D), basis = `<h5 aria-level="4">Viewpoint &amp; notation</h5><p>${esc(vp.purpose)}</p><p>${esc(vp.notation)} ${esc(vp.method)}</p>${D.viewBands ? '<p>Motivation is distinct from the Business, Application and Technology domains. Information, Security and Deployment are AIW concern bands, not additional ArchiMate core layers. Decisions, quality scenarios and responsibility records retain their AIW meanings.</p>' : ''}`;
      const indexed = D.layerSummary, indexKey = indexed
        ? `<h5 aria-level="4">Between the lanes</h5><p>Each line stands for the recorded relationships between two type groups, its count on the line (${indexed.total} records on ${D.edges.length} line${D.edges.length === 1 ? '' : 's'}); a fan from one group is drawn as one line that splits. Select a line to read every record it stands for.</p>${edgeFamilies(fold?.whole || D).map(f => `<p>${esc(f.title)} <small>×${f.count}</small></p>`).join('')}`
        : '';
      const driversKey = driversKeyHTML();
      const relKey = indexKey + (K.relationships.length ? `<h5 aria-level="4">Relationships</h5>${K.relationships.map(r => `<p>${line(r.style)}${esc(r.kinds.map(k => k.label).join(', '))}<small> · ${esc(r.title.split(' · ')[1] || r.title)}${r.flowWords.length ? ' (' + esc(r.flowWords.join(' · ')) + ')' : ''}</small></p>`).join('')}` : '');
      return edgeBlock + basis + driversKey + markKey + glyphKey + (layerKey ? `<h5 aria-level="4">Repository scope</h5>${layerKey}` : '') + `<h5 aria-level="4">Elements</h5>${K.elements.map(el => `<p><i class="nt-k nt-${el.family}${el.bpmn ? ' ' + el.family : ''}">${el.bpmn ? '' : iconSVG(el.family)}</i>${esc(el.kicker)}${el.count > 1 ? ` <small>×${el.count}</small>` : ''}</p>`).join('') || '<p>Nothing drawn.</p>'}${K.groups.length ? `<p><i class="nt-k group"></i>${esc(K.groups.map(g => g.label).join(', '))}</p>` : ''}${iconKeyHTML(D)}${relKey}${K.marks.length ? `<h5 aria-level="4">Marks</h5>${K.marks.map(m => `<p><i class="nt-k nt-m-${m.id}"></i>${esc(m.text)}</p>`).join('')}` : ''}<p class="cm-muted">Elements are saved records or explicitly counted record groups; positions and notes are the reader's, never facts.</p>`;
    },
    // The readings (round 5, Contract G): two lines — what the picture is, and what its checks say — then More.
    readingHTML() {
      const more = (title, lead, rest) => `<section class="nt-reading"><h4 aria-level="3">${title}</h4>${leadHTML(...lead)}${rest ? `<details class="nt-more"><summary>More</summary>${rest}</details>` : ''}</section>`;
      // The selected relationship (the Diagram and, since round 10, the Layers view): its reading, and the line it is drawn
      // on with the other relationships on it and the other records of the same fact, each a button that selects it.
      const se = (state.view === 'diagram' || state.view === 'layers') && state.selEdge && D?.edges.find(e => e.id === state.selEdge), st = se ? styleOf(se.kind) : null;
      const edgeBlock = se ? `<section class="cm-spec nt-relspec" aria-live="polite"><h4 aria-level="3">Selected relationship · ${esc(st.family[0].toUpperCase() + st.family.slice(1))}</h4><p>${esc(describeEdge(D, se.id))}</p><dl class="cm-dl">${[['From', D.nodes.find(n => n.id === se.from)?.title], ['To', D.nodes.find(n => n.id === se.to)?.title], ['Word', se.fullLabel || se.label], ['Qualifier', se.qualifier], ['Step', se.step], ['Record', se.record?.ref || se.record?.id], ['ArchiMate', st.archimate]].filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>${edgeLinesHTML(D, L, se.id)}${se.fold ? foldMembersHTML(se) : ''}<p class="nt-actions"><button type="button" class="cm-btn" data-nt="edge-clear">Clear the relationship</button></p></section>` : '';
      if (state.view === 'layers') {
        const source = fold?.whole || D, lanes = new Set((source?.nodes || []).map(n => source.viewBands ? viewpointBand(n) : n.layer)).size;
        // The overview (rc39): one list box per type group in its lane, the lines between the lanes carrying their counts; the
        // band-to-band index stands here as buttons, each opening its exact records.
        const bandName = l => (D?.viewBands ? viewpointBandTitle(l) : LAYER_NAMES[l] || l);
        const index = D?.layerSummary ? `<p class="nt-fold-reading">${fold.F.total.nodes} records and ${fold.F.total.edges} relationships, drawn as ${D.nodes.length} type group${D.nodes.length === 1 ? '' : 's'} in ${lanes} lane${lanes === 1 ? '' : 's'}. Each line between two groups carries its count: select it to read its records; open a type group to explore its members. Show every element draws the full graph.</p><ul class="nt-pairs" aria-label="Relationships between the concern bands">${D.layerSummary.pairs.map(p => `<li><button type="button" class="cm-link" data-nt="pair" data-id="${esc(p.key)}" aria-pressed="${state.pair === p.key}">${esc(bandName(p.from))} ${p.from === p.to ? 'within the band' : '→ ' + esc(bandName(p.to))}<small> · ${p.count} · ${esc(p.families.map(f => `${f.family} ${f.count}`).join(', '))}</small></button></li>`).join('')}</ul>` : '';
        return edgeBlock + pairReadingHTML() + traceHTML() + index + layersReadingHTML(source, full, state.layers, chapter, {lead: leadHTML(`Chapter ${chapter} · ${source?.nodes.length || 0} records in ${lanes} ${source.viewBands ? 'concern bands' : 'repository layers'}`, checksLine(source.nodes))});
      }
      if (state.view === 'table') { const T = tableOf(project()), n = T.rows.filter(r => r.checks).length; return traceHTML() + more('Reading this table', [`Chapter ${chapter} · ${T.rows.length} record${T.rows.length === 1 ? '' : 's'}, one row each`, checksLine(T.rows)], `<p>The reference, the title and the key fields its editor records, the open checks on it (the rule-based findings Validate lists) and how many relationships connect it in the one model; the glyph beside the reference is the record’s check in the SDD. Sort by a column, filter by any word; the sidebar’s layers hide the records of a layer. Select a row to read it here; Open in Work opens its editor.</p><p class="cm-muted">${T.rows.length} record${T.rows.length === 1 ? '' : 's'} · ${n} with open checks · nothing here changes the design.</p>`); }
      if (state.view === 'cross') { const c = crossOf(project()), X = c.X, n = X?.counts || {}; return (state.cross.cell ? cellHTML(X, state.cross.cell) : '') + traceHTML() + more('Reading this matrix', [`${X?.rowLabel || ''} down, ${X?.colLabel || ''} across`, `● ${n.direct || 0} recorded · ○ ${n.via || 0} through one record${n.chain ? ` · ◌ ${n.chain} through the design` : ''}`], `<p>A filled mark is a relationship the project records; a hollow one, two records joined through one other record (two recorded relationships) where nothing is recorded between them${X?.basis === 'chain' ? '; a dotted one, the shortest chain through the design, because the two sets meet neither way' : ''}. A row or column with nothing recorded against the other axis is a gap, even where a path through another record exists. The glyph beside a reference is that record’s check.</p><p class="cm-muted">Choose any two record types the project holds, or swap them; this chapter remembers the pair. Select a cell to read it here, and trace its row through the design.</p>`); }
      if (state.view === 'whole') return `<div class="an-companion">${anatomyModule?.anatomyPanelHTML?.() || '<section><h4 aria-level="3">Reading the whole design</h4><p>The design anatomy is preparing.</p></section>'}</div>`;
      const sc = scene(), vp = full ? viewpointOf(full) : null;
      const text = D && L ? diagramText(D, L) : '';
      const count = D ? `${D.nodes.length} element${D.nodes.length === 1 ? '' : 's'}` : 'nothing drawn';
      return edgeBlock + traceHTML() + more('Reading this diagram', [`${sc?.title || 'This diagram'} · ${count}`, checksLine()], `<p>${esc(sc?.title || 'This diagram')} uses named record types and explicitly counted groups; each connector keeps its recorded direction and relationship convention. ${esc(sc?.standard ? 'It answers the “' + sc.standard + '” page of a solution architecture document.' : '')} Far out only the names and the checks read; zoom in for the element types and the relationship words, and further for the references. The element under the pointer is read here in full.</p>${vp ? `<dl class="cm-dl nt-vp"><div><dt>Audience</dt><dd>${esc(vp.audience)}</dd></div><div><dt>Purpose</dt><dd>${esc(vp.purpose)}</dd></div><div><dt>Readiness</dt><dd>${esc(vp.readiness === 'drawn' ? 'Drawn from the records' : vp.readiness === 'partial' ? 'Partly drawn: ' + vp.because.join('; ') : 'Nothing to draw: ' + vp.because.join('; '))}</dd></div></dl>` : ''}<p><b>Connections</b> steps None, Structure, Adjacent and All, with Selected for the held element’s direct links; a dense level opens with its first twelve paths. Reveal next adds paths, inside the level first, without moving or expanding any element; + counts mark connections not yet shown. Open a group to explore its records, or choose Show every element to expand the source scope. Diagram exports keep every relationship of the exported scope, including the membership of summaries. <b>Arrange</b> changes only where things stand; <b>Visibility</b> and <b>Focus</b> strip what you do not want to see; <b>Trace</b> lights one record’s chain through the design; drag an element or move it with the arrow keys to pin it; <b>Compare</b> draws the working picture over a frozen baseline.</p>${text ? `<details class="nt-read"><summary>Read this picture as text</summary><pre>${esc(text)}</pre></details>` : ''}`);
    },
    specimenHTML(id) { return api.withSelected(specimenOf(id), id); },
    tipHTML(id) { const n = full?.nodes.find(x => x.id === id); return n ? `<b>${esc(n.fullTitle || n.title)}</b>${esc(describeNode(full, id))}<small class="h">Drag or use the arrow keys to pin · Enter to select</small>` : ''; },
    // A structured description of the current picture for Sol (the Brain reads it; it never changes the picture).
    explain() {
      if (!D || !L) return null;
      const em = emphasisFor();
      return {...explainDiagram(D, L, {chapter, arrangement: arrangement(), hiddenLayers: LAYERS.filter(l => !state.layers.includes(l)), focus: state.focus, baseline: state.baseline, selection: sel, selectedEdge: state.selEdge, callouts: callouts()}), connectionVisibility: em ? {mode: em.mode, level: em.mode, levelTitle: connectionLevelTitle(em.mode), levels: CONNECTION_LEVELS.map(l => l.id), shown: em.active, paths: em.total, levelPaths: em.levelPaths, levelShown: em.levelShown, moreAtLevel: em.levelHidden, levelBudget: em.stepped ? em.budget : null, beyondLevel: em.hidden, caption: connectionCaption(em), visiblePathIds: [...em.paths], sourceRelationships: (fold?.whole || D).edges.length} : null};
    },
    // The controls of the Diagram view; true when the click was one of them.
    handle(e) {
      // A view chosen by hand ends the fallback's note (the chapter model switches the view itself).
      const vb = e.target.closest('.cm-view[data-id]'); if (vb && root.contains(vb)) fallbackNote = '';
      const f = e.target.closest('[data-nt-field]');
      // rc41 close: a click inside a draft's menu or status line is the draft's own — its Find box, its heading, its
      // padding — and never reaches the chapter's own click handling (which cleared the selection under the target list
      // and drew the list again, losing what was typed).
      const inDraft = !!e.target.closest('.cm-stage > .nt-draft-menu, .cm-stage > .nt-draft-note') && root.contains(e.target);
      if (f && !inDraft) return false;
      // rc41 W3: the Add menu's "Add … here" entries (drawn when the menu opens), the draft's own controls, and the click
      // that puts a ghost down in placement mode.
      if (e.target.closest('.cm-add > summary') && root.contains(e.target)) nextFrame(ensureAddEntries);
      const dn = e.target.closest('[data-nt]'), dk = dn && (root.contains(dn) || inCompanion(dn)) ? dn.dataset.nt : null;
      if (dk === 'add-here') { if (!dn.disabled) startPlacement(dn.dataset.id); return true; }
      if (dk === 'draft-cancel') { cancelAll(); return true; }
      if (dk === 'draft-place') { placeInView(sel); return true; }
      if (dk === 'draft-kind') { chooseKind(dn.dataset.id); return true; }
      if (dk === 'connect-from') { openTargets(dn.dataset.id); return true; }
      if (dk === 'draft-target') { if (draft?.mode === 'targets') offerKinds(draft.from, dn.dataset.id); return true; }
      if (inDraft) return true;
      // (only on a picture: on a chapter's own view a placement left in progress never takes the view's clicks)
      if (draft?.mode === 'place' && onPicture() && root.contains(e.target) && e.target.closest('.cm-stage') && !e.target.closest('.nt-seltools,.nt-draft-note,.nt-draft-menu,.cm-minimap,.cm-edge,.nt-fold-note,.nt-layer-note,[data-cm-inset]')) { e.preventDefault(); placeGhost(worldPoint(e)); return true; }
      if ((draft?.mode === 'kinds' || draft?.mode === 'targets') && root.contains(e.target) && !e.target.closest('.nt-draft-menu')) { cancelAll(); return true; }
      const element = e.target.closest('.nt-node');
      if (element && root.contains(element) && e.shiftKey) { e.preventDefault(); toggleSelection(element.dataset.ntNode); return true; }
      if (selected.size && root.contains(e.target) && e.target.closest('.cm-stage') && !e.target.closest('.cm-minimap,.cm-edge,.nt-layer-note,[data-cm-inset],.nt-hit,.nt-seltools')) { selected.clear(); arrangeMessage = ''; paintSelection(); }
      // In Whole design the companion is the anatomy's: its controls are the anatomy's own.
      if (e.target.closest('.an-companion')) { anatomyModule?.anatomyCompanionClick?.(e); return true; }
      // The sheets: a row or a heading selects its record; a matrix cell selects the relationship and its row.
      const row = e.target.closest('[data-nt-row]');
      if (row && root.contains(row)) { onSelect?.(row.dataset.ntRow); return true; }
      const xc = e.target.closest('[data-nt-cell]');
      if (xc && root.contains(xc)) { const key = xc.dataset.ntCell, n = renders; state.cross.cell = state.cross.cell === key ? null : key; onSelect?.(state.cross.cell ? key.split('|')[0] : null); if (renders === n) api.onChange?.(); return true; }
      // A collapsed lane shows its layer again.
      const lane = e.target.closest('.nt-band-collapsed[data-nt-lane]');
      if (lane && root.contains(lane)) {
        const l = lane.dataset.ntLane;
        // A concern band's strip (the Layers view, rc39) shows every repository layer of the records it hides.
        if (VIEW_BANDS.some(b => b.id === l) && !LAYERS.includes(l)) { const hidden = (full?.nodes || []).filter(n => viewpointBand(n) === l && !layersNow().includes(n.layer)).map(n => n.layer); if (hidden.length) { setLayers([...layersNow(), ...hidden]); save(); tellSidebar(); api.onChange?.(true); } return true; }
        if (!full?.nodes.some(n => n.layer === l)) { api.announce(`${LAYER_NAMES[l] || l}: none in this chapter.`); return true; }
        if (layersNow().includes(l)) { if (state.focus) { state.focus = null; api.onChange?.(true); } return true; }
        setLayers([...layersNow(), l]); save(); tellSidebar(); api.onChange?.(true); return true;
      }
      // Round 10 (N6): a click on a line drawn for several relationships (its pointer-only hit) selects the element they
      // share, whose reading lists the line's relationships, each a button; the element's own Tab stop is the keyboard's
      // way there. It adds no state of its own (as Chapter 9's entry marker selects what it enters).
      const bh = e.target.closest('.nt-bhit[data-nt-select]');
      if (bh && root.contains(bh)) { state.selEdge = null; const n = renders; onSelect?.(bh.dataset.ntSelect); if (renders === n) api.onChange?.(); nextFrame(() => companionOf(root)?.querySelector('.nt-lines-node')?.scrollIntoView({block: 'start'})); return true; }
      const hit = e.target.closest('.nt-hit');
      if (hit && root.contains(hit)) { state.selEdge = state.selEdge === hit.dataset.ntEdge ? null : hit.dataset.ntEdge; if (state.selEdge && sel) onSelect?.(null); api.onChange?.(); return true; }
      const groupNode = e.target.closest('.nt-node[data-nt-node^="fold:"]');
      // The second click of a double-click on a group fits the camera to it (rc39). It is read here, from the click's
      // count, because the first click's selection redraws the nodes: the browser's own dblclick event would reach a
      // node no longer in the document and never bubble to the drawing.
      if (groupNode && root.contains(groupNode) && e.detail === 2 && state.view !== 'layers' && L) { const bx = L.nodes.find(x => x.id === groupNode.dataset.ntNode); if (bx) { e.preventDefault(); stage.fitTo?.([bx]); return true; } }
      if (state.view === 'layers' && groupNode && root.contains(groupNode)) { api.openGroup(D?.nodes.find(n => n.id === groupNode.dataset.ntNode)?.fold?.key); return true; }
      const b = e.target.closest('[data-nt]'); if (!b || !(root.contains(b) || inCompanion(b))) { if (state.menu && !e.target.closest('.nt-pop')) { state.menu = null; api.onChange?.(); } if (state.selEdge && e.target.closest('.cm-stage') && !e.target.closest('.nt-node')) { state.selEdge = null; api.onChange?.(); } return false; }
      const k = b.dataset.nt, id = b.dataset.id;
      if (b.disabled) return true;
      if (k === 'tools') { state.toolsOpen = !state.toolsOpen; state.menu = null; api.onChange?.(); nextFrame(() => root.querySelector('.nt-mobile-tools')?.focus({preventScroll: true})); return true; }
      if (k === 'zoom') { if (id === 'fit') api.fit(); else { const {w, h} = stage.box(); stage.zoomAt(stage.cam.z * (id === 'in' ? 1.2 : 1 / 1.2), w / 2, h / 2); } return true; }
      if (k === 'connections' || k === 'emphasis-all') { chooseConnections(k === 'emphasis-all' ? 'all' : id); return true; }
      if (k === 'connections-more') { revealConnections(); return true; }
      if (k === 'layers-chapter') { setLayers(chapterLayers(chapter)); state.menu = null; save(); tellSidebar(); api.onChange?.(true); return true; }
      if (k === 'edgekind') { state.edgeOff = state.edgeOff.includes(id) ? state.edgeOff.filter(x => x !== id) : [...state.edgeOff, id]; if (levelNow() === 'all') state.emphasisBy[layerKey()] = 'adjacent'; save(); api.onChange?.(); restoreMenuControl(k, id); return true; }
      if (k === 'sort') { if (state.table.sort === id) state.table.dir = -state.table.dir; else { state.table.sort = id; state.table.dir = id === 'checks' || id === 'links' ? -1 : 1; } save(); api.onChange?.(); return true; }
      if (k === 'empty-columns') { state.table.showEmpty = !state.table.showEmpty; save(); api.onChange?.(); return true; }
      if (k === 'swap') { const c = crossOf(project()); state.cross.rows = c.cols; state.cross.cols = c.rows; state.cross.filter = {rows: state.cross.filter.cols, cols: state.cross.filter.rows}; state.cross.cell = null; save(); api.onChange?.(); return true; }
      if (k === 'tmore') { const from = root.querySelectorAll('.nt-records tbody tr[data-nt-row]').length; state.table.limit = Math.max(state.table.limit, from) + TABLE_PAGE; api.onChange?.(); nextFrame(() => root.querySelectorAll('.nt-records tbody tr[data-nt-row]')[from]?.focus({preventScroll: false})); return true; }
      // rc40 W2: the Arrange control and every control of the docked Arrange panel (arrange-panel.js).
      if (handleArrangeAction(arrangeCtx(), b)) return true;
      if (k === 'menu') { state.menu = state.menu === id ? null : id; api.onChange?.(); if (state.menu) nextFrame(() => root.querySelector('.nt-pop :is(button,input,select):not(:disabled)')?.focus()); return true; }
      if (k === 'unpin') { const p = pins(); if (p[id]) { remember(); delete p[id]; if (!Object.keys(p).length) delete state.pins[pinKey()]; save(); api.onChange?.(true); } return true; }
      if (k === 'layer') { const now = layersNow(); setLayers(now.includes(id) ? now.filter(l => l !== id) : [...now, id]); save(); tellSidebar(); api.onChange?.(true); restoreMenuControl(k, id); return true; }
      if (k === 'layers-all') { setLayers([...LAYERS]); state.edgeOff = []; state.menu = null; save(); tellSidebar(); api.onChange?.(true); return true; }
      if (k === 'overlay') { state.overlays[id] = !state.overlays[id]; save(); api.onChange?.(); restoreMenuControl(k, id); return true; }
      if (k === 'vitals') { state.vitals = !state.vitals; vitalsNow = null; api.onChange?.(); restoreMenuControl(k); return true; }
      if (k === 'story') { storyOpen = storyOpen === id ? null : id; traceReading(); return true; }
      if (k === 'focus') { if (id === 'all') state.focus = null; else if (id === 'group') { const g = full?.nodes.find(n => n.id === sel)?.group; state.focus = g ? {groupId: g} : null; } else if (sel) state.focus = {id: sel, hops: Number(id) || 1}; state.menu = null; api.onChange?.(true); return true; }
      if (k === 'edge-clear') { state.selEdge = null; api.onChange?.(); return true; }
      // The grouped picture (round 12, P): open a group, go back to every group, draw every element, group them again; a
      // member named in a reading opens its group with it selected; a relationship named there opens its source's group.
      if (k === 'fold-open') { api.openGroup(id); return true; }
      if (k === 'fold-up') { state.drill = null; state.pair = null; state.selEdge = null; if (sel) onSelect?.(null); api.onChange?.(true); return true; }
      if (k === 'fold-all') { if (state.emphasisBy[layerKey()] === 'none') state.emphasisBy[layerKey()] = levelDefault(); state.unfold = state.view === 'layers' ? 'connected' : scene()?.id || null; state.drill = null; state.pair = null; state.edgeReveal = null; state.focus = null; api.onChange?.(true); return true; }
      if (k === 'fold-group') { if (state.view === 'layers' && marksInfo('trace')) { api.announce('Clear the trace before grouping the source records.'); return true; } state.emphasisBy[layerKey()] = levelDefault(); state.unfold = null; state.focus = null; state.edgeReveal = null; state.pair = null; state.selEdge = null; state.revealBy[revealKey()] = 0; save(); if (state.view === 'layers' && sel) onSelect?.(null); api.onChange?.(true); return true; }
      // Fit to whole (round 12, G, GR-FIG-10): every element of the grouped picture in view, at the zoom that shows them all.
      if (k === 'fold-fit') { stage.fitAll(); return true; }
      if (k === 'fold-member') { if (state.view === 'layers') return focusLayerMember(id); const g = fold?.groupOf(id); if (g) state.drill = g; state.selEdge = null; onSelect?.(id); api.onChange?.(true); return true; }
      if (k === 'fold-edge') { const x = fold?.whole.edges.find(e => e.id === id); if (!x) return true; if (state.view === 'layers') { state.edgeReveal = id; state.unfold = 'connected'; state.focus = null; state.pair = null; state.drill = null; } else { const g = fold.groupOf(x.from) || fold.groupOf(x.to); if (g) state.drill = g; } state.selEdge = id; if (sel) onSelect?.(null); api.onChange?.(true); return true; }
      if (k === 'pair') { api.choosePair(id); nextFrame(() => companionOf(root)?.querySelector(`[data-nt="pair"][data-id="${CSS.escape(id)}"]`)?.focus({preventScroll: true})); return true; }
      if (k === 'pair-more') { state.pairLimit += 40; api.onChange?.(); return true; }
      if (k === 'pair-clear') { state.pair = null; api.onChange?.(); return true; }
      // A relationship named in a reading (round 10: the others on its line, another record of the same fact, an element's
      // lines) is selected, and the keyboard goes to its own hit on the picture.
      if (k === 'edge-pick') {
        if (!D?.edges.some(x => x.id === id)) return true;
        // Under None no line is drawn and no hit takes the keyboard, so a relationship picked by name brings the
        // connections back at the picture's own level, where the pick is drawn (as Show every element does; rc41 close).
        if (levelNow() === 'none') { state.emphasisBy[layerKey()] = levelDefault(); save(); }
        state.selEdge = id; const n = renders; if (sel) onSelect?.(null); if (renders === n) api.onChange?.();
        nextFrame(() => root.querySelector(`.nt-hit[data-nt-edge="${CSS.escape(id)}"]`)?.focus({preventScroll: true})); return true;
      }
      if (k === 'trace') { api.trace(id, {cell: b.dataset.cell || null}); return true; }
      if (k === 'trace-clear') { api.clearTrace(); return true; }
      if (k === 'build') { api.startBuild(id); return true; }
      if (k === 'build-next') { api.buildStep(1); return true; }
      if (k === 'build-back') { api.buildStep(-1); return true; }
      if (k === 'build-play') { api.buildPlay(); return true; }
      if (k === 'build-stop') { api.clearBuild(); return true; }
      if (k === 'checks') { const key = layerKey(); if (state.checksOff[key]) delete state.checksOff[key]; else state.checksOff[key] = true; save(); api.onChange?.(); restoreMenuControl(k); return true; }
      if (k === 'note-remove') { state.notes = state.notes.filter(x => x.id !== id); save(); api.onChange?.(); return true; }
      if (k === 'export') { api.export(id); return true; }
      return false;
    },
    change(e) {
      const f = e.target.closest('[data-nt-field]'); if (!f) return false;
      // rc41 close: the target list's Find box filters as the person types (the input listener); the change it fires on
      // leaving the box is not a picture setting (it drew the picture again, and the list unfiltered, under the pointer).
      if (f.dataset.ntField === 'draft-target-find') return true;
      if (f.dataset.ntField === 'lane-member') { if (f.value) focusLayerMember(f.value); return true; }
      if (f.dataset.ntField === 'driver') { state.driver = f.value || null; reachCache = null; save(); if (state.driver && !basisModule) loadBasis().catch(() => api.announce('The driver’s reach could not be read.')); paintDrivers(); api.onChange?.(); nextFrame(() => root.querySelector('[data-nt-field="driver"]')?.focus({preventScroll: true})); return true; }
      if (f.dataset.ntField === 'arrangement') { chooseArrangement(f.value); return true; }
      if (['scene', 'env', 'baseline', 'sequence-contract', 'sequence-data'].includes(f.dataset.ntField)) { selected.clear(); state.history = []; arrangeMessage = ''; }
      if (f.dataset.ntField === 'scene') { state.scene = f.value; state.hub = null; state.focus = null; state.selEdge = null; state.drill = null; state.unfold = null; }
      if (f.dataset.ntField === 'env') state.environmentId = f.value;
      if (f.dataset.ntField === 'baseline') { state.baseline = f.value || null; state.selEdge = null; }
      if (f.dataset.ntField === 'emphasis') { if (isConnectionLevel(f.value)) chooseConnections(f.value); return true; }
      if (f.dataset.ntField === 'find') { state.find = f.value.trim(); highlightFound(); return true; }
      if (f.dataset.ntField === 'trace') { if (f.value) api.trace(f.value); return true; }
      if (f.dataset.ntField === 'tfilter') { if (state.table.filter === f.value) return true; state.table.filter = f.value; state.table.limit = TABLE_PAGE; api.onChange?.(); return true; }
      if (f.dataset.ntField === 'xrfilter' || f.dataset.ntField === 'xcfilter') { const axis = f.dataset.ntField === 'xrfilter' ? 'rows' : 'cols'; if (state.cross.filter[axis] === f.value) return true; state.cross.filter = {...state.cross.filter, [axis]: f.value}; api.onChange?.(); return true; }
      // The pair is the reader's, remembered per chapter with the layers; choosing the other axis's set swaps them.
      if (f.dataset.ntField === 'sequence-contract' || f.dataset.ntField === 'sequence-data') { if (f.dataset.ntField === 'sequence-contract') state.sequenceContract = f.value; else state.sequenceData = !!f.checked; state.selEdge = null; api.onChange?.(true); return true; }
      if (f.dataset.ntField === 'xrows' || f.dataset.ntField === 'xcols') { const c = crossOf(project()), axis = f.dataset.ntField === 'xrows' ? 'rows' : 'cols'; state.cross.rows = c.rows; state.cross.cols = c.cols; state.cross[axis] = f.value; if (axis === 'rows' && f.value === c.cols) state.cross.cols = c.rows; if (axis === 'cols' && f.value === c.rows) state.cross.rows = c.cols; state.cross.filter = {rows: '', cols: ''}; state.cross.cell = null; save(); api.onChange?.(); return true; }
      save(); api.onChange?.(true); return true;
    },
    submit(e) {
      const form = e.target.closest?.('[data-nt-form="note"]'); if (!form) return false;
      e.preventDefault(); const text = String(form.elements.text.value || '').trim().slice(0, 400); if (!text) return true;
      state.notes.push({id: 'N-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), sceneId: state.scene, targetId: form.dataset.id, text, at: new Date().toISOString()}); save(); api.onChange?.(); return true;
    },
    // Keyboard: Enter or Space selects an element or a relationship; the arrow keys move the focused
    // element (Shift for larger steps) and pin it; Delete releases its pin; in a menu the arrows move
    // and Escape closes; Escape on the picture clears the found and the selected relationship.
    keydown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      // rc41 W3: Escape cancels a draft in progress (a placement, a dragged line, the kinds menu, the target list).
      if (e.key === 'Escape' && draft && draft.mode !== 'ghost' && draft.mode !== 'link') { e.preventDefault(); cancelAll(); return true; }
      if (e.target.closest?.('.nt-draft-menu')) {
        const items = [...e.target.closest('.nt-draft-menu').querySelectorAll('[role="menuitem"]:not([hidden]):not(:disabled)')], i = items.indexOf(e.target);
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1) + items.length) % items.length]?.focus(); return true; }
        // Enter in Find takes the first matching element (rc41 close: with no match it took the list's Cancel and dropped
        // the draft without a word); with none, it says so and keeps the list and the words.
        if (e.key === 'Enter' && e.target.matches('[data-nt-field="draft-target-find"]')) {
          e.preventDefault(); const first = items.find(b => b.dataset.nt === 'draft-target');
          if (first) first.click(); else api.announce(targetCountWords(0, root.querySelectorAll('.nt-draft-targets [data-nt="draft-target"]').length, e.target.value) + '.');
          return true;
        }
      }
      // rc41 close: the one-element toolbar follows its element in the keyboard's order — Tab from the selected element
      // goes to "Connect to…", Tab from the toolbar's last control to the element after it, Shift+Tab from its first back
      // to the element (the toolbar stands at the end of the stage, after every element and relationship of the picture).
      if (e.key === 'Tab' && !draft) {
        const bar = root.querySelector('.cm-stage > .nt-seltools.nt-seltools-one'), node = sel && root.querySelector(`.cm-svg .nt-node[data-nt-node="${CSS.escape(sel)}"]`);
        if (bar && node) {
          const controls = [...bar.querySelectorAll('button:not(:disabled)')];
          if (!e.shiftKey && e.target === node && controls.length) { e.preventDefault(); controls[0].focus({preventScroll: true}); return true; }
          if (e.shiftKey && e.target === controls[0]) { e.preventDefault(); node.focus({preventScroll: true}); return true; }
          if (!e.shiftKey && e.target === controls.at(-1)) {
            const order = [...root.querySelectorAll('.cm-svg [tabindex="0"]')], next = order[order.indexOf(node) + 1];
            if (next) { e.preventDefault(); next.focus({preventScroll: true}); return true; }
          }
        }
      }
      // rc41 close: a placement by the keyboard — Enter or Space on an element stands the ghost beside it (its group or its
      // lane); on the stage itself, in the middle of the view.
      if (draft?.mode === 'place' && (e.key === 'Enter' || e.key === ' ')) {
        const on = e.target.closest?.('.cm-svg .nt-node[data-nt-node]');
        if ((on && root.contains(on)) || e.target === root.querySelector('.cm-stage')) { e.preventDefault(); placeInView(on?.dataset.ntNode || null); return true; }
      }
      if (e.key === 'Enter' && e.target.matches?.('.nt-bar-find [data-nt-field="find"]')) { e.preventDefault(); state.find = e.target.value.trim(); const id = firstFoundRecord() || findMatches()[0]; if (id && state.view === 'layers' && fold) focusLayerMember(id); else if (id) onSelect?.(id); else highlightFound(); return true; }
      const tr = e.target.closest?.('tr[data-nt-row]');
      if (tr && root.contains(tr)) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(tr.dataset.ntRow); setTimeout(() => root.querySelector(`tr[data-nt-row="${CSS.escape(tr.dataset.ntRow)}"]`)?.focus(), 0); return true; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); (e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling)?.focus(); return true; }
        return false;
      }
      // rc40 W2: the keyboard inside the docked Arrange panel (arrange-panel.js): Escape closes it, Tab stays inside, arrows move.
      if (e.target.closest?.('.nt-arrange-panel')) return handleArrangeKey(arrangeCtx(), e);
      const pop = e.target.closest?.('.nt-pop');
      if (pop) {
        // Labels with role=menuitemcheckbox wrap the native checkbox. Focus the control once, in DOM order;
        // including both label and input makes ArrowDown rely on a browser forwarding label.focus().
        const items = [...pop.querySelectorAll(':is(button,input,select):not(:disabled)')];
        const i = items.indexOf(e.target);
        if (e.target.matches('select') && e.key !== 'Escape') return false;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); return true; }
        if (e.key === 'Escape') { e.preventDefault(); const id = state.menu; state.menu = null; api.onChange?.(); nextFrame(() => root.querySelector(`[data-nt="menu"][data-id="${id}"]`)?.focus()); return true; }
        if (e.key === 'Enter' && e.target.matches('[data-nt-field="find"]')) { e.preventDefault(); const q = e.target.value.trim().toLowerCase(); const n = D?.nodes.find(x => (x.ref + ' ' + x.title).toLowerCase().includes(q)); if (n) { state.menu = null; onSelect?.(n.id); } return true; }
        return false;
      }
      const hit = e.target.closest?.('.nt-hit');
      if (hit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); state.selEdge = hit.dataset.ntEdge; if (sel) onSelect?.(null); api.onChange?.(); setTimeout(() => root.querySelector(`.nt-hit[data-nt-edge="${CSS.escape(state.selEdge)}"]`)?.focus(), 0); return true; }
      if (e.key === 'Escape' && selected.size && root.contains(e.target)) { e.preventDefault(); setSelection([]); return true; }
      const n = e.target.closest?.('.nt-node');
      // Escape clears the selection (rc39): a selected relationship or a search first, then the selected element.
      if (!n) { if (e.key === 'Escape' && (state.selEdge || state.find) && root.contains(e.target)) { state.selEdge = null; state.find = ''; api.onChange?.(); return true; } if (e.key === 'Escape' && sel && root.contains(e.target) && api.owns(state.view) && !SHEETS.has(state.view)) { e.preventDefault(); onSelect?.(null); return true; } return false; }
      if (e.key === 'Escape' && (sel || state.selEdge || state.find)) { e.preventDefault(); state.selEdge = null; state.find = ''; if (sel) onSelect?.(null); else api.onChange?.(); return true; }
      const id = n.dataset.ntNode;
      // rc41 close: C on an element opens "Connect to…" from it (the toolbar's own key, aria-keyshortcuts).
      if ((e.key === 'c' || e.key === 'C') && !draft && openTargets(id)) { e.preventDefault(); return true; }
      // (rc41 close: a selection made from the keyboard says the toolbar that has appeared and how to reach it — it stands
      // at the end of the stage; a pointer sees it over the element)
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (e.shiftKey) toggleSelection(id); else { selected.clear(); if (String(id).startsWith('fold:') && (state.view === 'layers' || id === sel)) api.openGroup(D.nodes.find(n => n.id === id)?.fold?.key); else onSelect?.(id); } nextFrame(() => { root.querySelector(`[data-nt-node="${CSS.escape(id)}"]`)?.focus({preventScroll: true}); if (sel === id && root.querySelector('.cm-stage > .nt-seltools.nt-seltools-one')) { const n = D?.nodes.find(x => x.id === id); api.announce(`${n?.ref || n?.title || id} selected. C, or Tab, reaches Connect to… to record a relationship from it.`); } }); return true; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault(); const step = (state.snap ? 16 : 8) * (e.shiftKey ? 4 : 1), b = L?.nodes.find(x => x.id === id); if (!b) return true;
        const x = b.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), y = b.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0);
        // The keyboard's move says where the element went (a pointer sees it; a screen reader hears it).
        if (api.pin(id, x, y)) api.announce(`${D?.nodes.find(n => n.id === id)?.title || id} moved to ${Math.round(x)}, ${Math.round(y)} · pinned.`);
        setTimeout(() => root.querySelector(`[data-nt-node="${CSS.escape(id)}"]`)?.focus(), 0); return true;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); releaseSelection(false, selected.has(id) ? selectedIds() : [id]); setTimeout(() => root.querySelector(`[data-nt-node="${CSS.escape(id)}"]`)?.focus(), 0); return true; }
      return false;
    },
    // The trace path (round 5): the record's chain through the layers (model-matrix.js traceFrom, the Matrix's own
    // cells) is lit — source `trace`, traced for the chain and dimmed for the rest — in the Diagram and the Layers view,
    // with its reading in the companion. From a Matrix cell the cell's own path is part of it, and the Layers view opens.
    trace(id, {cell = null} = {}) {
      const p = project(); if (!p || !id) return false;
      let extra = [];
      if (cell) { const X = crossOf(p).X, x = X?.cells.get(cell); extra = [...cell.split('|'), ...(x?.items || []).flatMap(i => i.via)]; }
      let T = null; try { T = traceFrom(p, id, {extra}); } catch (e) { console.warn('The trace could not be read.', e?.message); }
      if (!T) { api.announce('This element is not a record of the design; nothing to trace.'); return false; }
      const marks = [...T.ids].map(x => ({id: x, state: 'traced', note: 'On the trace from ' + T.ref}));
      for (const x of new Set([...modelIds(p), ...(full?.nodes || []).map(n => n.id)])) if (!T.ids.has(x)) marks.push({id: x, state: 'dimmed', note: 'Off the trace from ' + T.ref});
      state.menu = null;
      // The chain's steps travel with the trace, so the build-up (round 6) can step along it.
      setMarks('trace', marks, {from: id, ref: T.ref, title: T.title, chain: T.chain, gaps: T.gaps, count: T.ids.size, cell, steps: T.steps.filter(st => !st.gap).map(st => ({word: st.word, records: st.records.map(r => ({id: r.id, ref: r.ref}))})), words: {traced: 'On the trace from ' + T.ref, dimmed: 'Off the trace, dimmed'}});
      api.announce(`Trace from ${T.ref}: ${T.chain}${T.gaps.length ? '. Gaps: ' + T.gaps.join(', ') : ''}.`);
      // The Table and the Matrix show the trace as row states; the chain itself is drawn in the Layers view.
      const lanes = cell && state.view === 'cross' ? root.querySelector('.cm-view[data-id="layers"]') : null;
      if (lanes) lanes.click(); else api.onChange?.();
      return true;
    },
    clearTrace() { if (!marksInfo('trace')) return false; clearMarks('trace'); state.menu = null; storyOpen = null; if (traceAutoExpanded && state.unfold === 'connected') state.unfold = null; traceAutoExpanded = false; api.announce('Trace cleared.'); api.onChange?.(true); return true; },
    choosePair(key) {
      if (!D?.layerSummary?.pairs.some(p => p.key === key)) return false;
      state.pair = state.pair === key ? null : key; state.pairLimit = 40; state.selEdge = null;
      if (sel) onSelect?.(null);
      api.onChange?.();
      const p = D.layerSummary.pairs.find(x => x.key === key);
      api.announce(state.pair ? `${p.count} recorded relationships from ${LAYER_NAMES[p.from]} to ${LAYER_NAMES[p.to]}. Read their exact records in the inspector.` : 'Relationship summary cleared.');
      return true;
    },
    traced: () => marksInfo('trace'),
    marks: () => marksNow(),
    // The build-up (round 6, Contract F): a mode's steps painted one at a time through the marks channel (source `build`).
    startBuild(mode) {
      const m = buildModes.get(String(mode || '')); if (!m) { api.announce('No such build-up mode.'); return false; }
      let ok = true; try { ok = m.available ? m.available(D, project()) : true; } catch { ok = 'Not available for this picture'; }
      if (ok !== true) { api.announce(typeof ok === 'string' ? ok : 'This build-up is not available for this picture.'); return false; }
      clearTimeout(buildTimer); buildTimer = 0;
      state.build = {mode: m.id, step: 0, playing: false}; state.menu = null; publishBuild();
      api.announce(buildSteps.length ? `Build-up ${m.title}: step 1 of ${buildSteps.length}, ${buildSteps[0].title}.` : `Build-up ${m.title}: nothing to step through in this picture.`);
      api.onChange?.(); return true;
    },
    buildStep(delta = 1) {
      const b = state.build; if (!b || !buildSteps.length) return false;
      const next = b.step + (Number(delta) || 0); if (next < 0 || next >= buildSteps.length) return false;
      b.step = next; publishBuild(); refreshBuildLine();
      api.announce(`Step ${b.step + 1} of ${buildSteps.length}: ${buildSteps[b.step].title}.`); return true;
    },
    buildPlay() {
      const b = state.build; if (!b || !buildSteps.length) return false;
      if (b.playing) { api.buildPause(); return false; }
      if (b.step >= buildSteps.length - 1) b.step = 0;
      b.playing = true; publishBuild(); refreshBuildLine();
      const tick = () => { buildTimer = 0; if (!state.build?.playing || !root.isConnected) { api.buildPause(); return; } if (!api.buildStep(1)) { api.buildPause(); return; } buildTimer = setTimeout(tick, BUILD_MS); };
      buildTimer = setTimeout(tick, BUILD_MS); return true;
    },
    buildPause() { clearTimeout(buildTimer); buildTimer = 0; if (!state.build?.playing) return false; state.build.playing = false; publishBuild(); refreshBuildLine(); api.announce('Build-up paused.'); return true; },
    clearBuild() { if (!state.build) return false; state.build = null; stopBuild(); state.menu = null; api.announce('Build-up cleared.'); api.onChange?.(); return true; },
    building: () => (state.build ? {mode: state.build.mode, step: state.build.step + 1, total: buildSteps.length, title: buildSteps[state.build.step]?.title || '', playing: !!state.build.playing} : null),
    // Opens a group of a grouped picture in place (round 12, P); false when it is not one.
    openGroup(key) {
      if (!key || !fold?.F.groups.some(g => g.key === key && g.count > 1)) return false;
      state.drill = key; state.pair = null; state.selEdge = null; if (sel) onSelect?.(null); api.onChange?.(true);
      api.announce(`Opened ${fold.F.groups.find(g => g.key === key).title}.`); return true;
    },
    folded: () => (fold ? {key: fold.F.key, by: fold.F.by, groups: fold.F.groups.map(g => ({key: g.key, title: g.title, count: g.count, id: g.id})), total: fold.F.total, drill: fold.X ? fold.X.fold.group : null} : null),
    announce(text) { let live = root.querySelector('.nt-live'); if (!live) { live = document.createElement('p'); live.className = 'nt-live visually-hidden'; live.setAttribute('aria-live', 'polite'); live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'; root.append(live); } live.textContent = text; },
    // A pin: kept relative to the element's container when it has one, so it survives the container moving.
    pin(id, x, y) {
      const b = L?.nodes.find(n => n.id === id); if (!b) return false;
      return arrangeSelected('move', {dx: x - b.x, dy: y - b.y}, selected.has(id) ? selectedIds() : [id]);
    },
    // Dragging an element pins it; a click selects it; the stage does not pan under a drag.
    bindDrag() {
      const svg = root.querySelector('.cm-svg'); let drag = null;
      svg.addEventListener('pointerdown', e => {
        // rc41 W3: a press on an element's port starts a relationship drag (a ghost line to the pointer), never a move.
        const port = e.target.closest('.nt-port');
        if (port && e.button === 0) {
          e.stopPropagation(); e.preventDefault();
          const from = port.dataset.ntPort, b = L?.nodes.find(x => x.id === from); if (!b || !portable(from)) return;
          const pt = worldPoint(e);
          draft = {mode: 'connect', from, target: null, ok: false, line: {x1: b.x + b.w, y1: b.y + b.h / 2, x2: pt.x, y2: pt.y}};
          drag = {connect: true, from}; port.setPointerCapture?.(e.pointerId); paintDraft(); return;
        }
        if (draft && draft.mode !== 'ghost' && draft.mode !== 'link') return;
        const n = e.target.closest('.nt-node'); if (!n || e.button !== 0 || n.classList.contains('nt-draft-ghost')) return;
        e.stopPropagation();
        if (e.shiftKey || L?.arrangement === 'sequence' || D?.layerSummary || D?.nodes.find(x => x.id === n.dataset.ntNode)?.fold) return;
        const b = L?.nodes.find(x => x.id === n.dataset.ntNode); if (!b) return;
        const ids = selected.has(b.id) ? selectedIds() : [b.id], elements = ids.map(id => ({box: L.nodes.find(b => b.id === id), el: svg.querySelector(`[data-nt-node="${CSS.escape(id)}"]`)})).filter(x => x.box && x.el);
        drag = {id: n.dataset.ntNode, el: n, elements, x: e.clientX, y: e.clientY, left: b.x, top: b.y, moved: false, nx: b.x, ny: b.y};
        n.setPointerCapture?.(e.pointerId);
      });
      svg.addEventListener('pointermove', e => {
        if (drag?.connect) {
          if (draft?.mode !== 'connect') return;
          const pt = worldPoint(e); draft.line.x2 = pt.x; draft.line.y2 = pt.y;
          // The target is the element under the pointer by its drawn box (a relationship's hit area lies over the elements).
          const id = L.nodes.find(b => b.id !== draft.from && pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h && D.nodes.some(n => n.id === b.id && !n.fold))?.id || null;
          if (id !== draft.target) { draft.target = id; draft.ok = !!id && relationshipOffers(project(), draft.from, id).offers.length > 0; paintDraft(); }
          else { const l = svg.querySelector('.nt-draft-line'); if (l) { l.querySelector('path').setAttribute('d', `M${draft.line.x1} ${draft.line.y1}L${pt.x} ${pt.y}`); const c = l.querySelector('circle'); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); } }
          return;
        }
        if (!drag) return; const z = stage.cam.z || 1, dx = (e.clientX - drag.x) / z, dy = (e.clientY - drag.y) / z;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
        drag.moved = true; const mx = state.snap ? Math.round(dx / 16) * 16 : Math.round(dx), my = state.snap ? Math.round(dy / 16) * 16 : Math.round(dy); drag.nx = drag.left + mx; drag.ny = drag.top + my; for (const x of drag.elements) { x.el.classList.add('dragging'); x.el.setAttribute('transform', `translate(${x.box.x + mx} ${x.box.y + my})`); }
      });
      const end = e => {
        if (!drag) return; const d = drag; drag = null;
        // rc41 W3: a relationship drag ends on another element with the kinds menu for the pair; anywhere else, it is let go.
        if (d.connect) {
          if (draft?.mode !== 'connect') return;
          const to = draft.target; root.dataset.suppress = '1'; setTimeout(() => { delete root.dataset.suppress; }, 60);
          if (e.type === 'pointercancel' || !to) { draft = null; paintDraft(); paintPorts(); return; }
          offerKinds(d.from, to, stagePoint(e)); return;
        }
        for (const x of d.elements) x.el.classList.remove('dragging'); if (!d.moved) return; root.dataset.suppress = '1'; setTimeout(() => { delete root.dataset.suppress; }, 60); if (e.type === 'pointercancel') { api.onChange?.(); return; } api.pin(d.id, d.nx, d.ny);
      };
      // A drag places; it does not select (rc39): selecting the dragged element changed the picture's emphasis to its
      // neighbourhood, which re-laid the levels under it and dropped the pin just placed as conflicting with its lane.
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      // Double-click on a group (a drawn container, or a grouped picture's group) fits the camera to it (rc39). A grouped
      // picture's group is also fitted from the second click above, since its selection redraws the node before this
      // event; a drawn container, which no click selects, arrives here still in the document.
      svg.addEventListener('dblclick', e => {
        const n = e.target.closest('.nt-node[data-nt-node^="fold:"], .nt-group[data-nt-group]'); if (!n || !L) return;
        const b = n.dataset.ntNode ? L.nodes.find(x => x.id === n.dataset.ntNode) : L.groups.find(g => g.id === n.dataset.ntGroup);
        if (b) { e.preventDefault(); stage.fitTo?.([b]); }
      });
      // The companion reads the element the pointer rests on (round 5): far out, the picture writes only names. Round 10:
      // and the relationship or the line drawn for several (their hits lie over the elements).
      let rest = 0, restId = null, connectionRest = 0;
      svg.addEventListener('pointermove', e => {
        if (drag) return;
        // rc41 W3: the port handle reads as its element (it stands above the hits, outside the element's own group).
        const portEl = e.target.closest?.('.nt-port');
        const t = portEl ? svg.querySelector(`.nt-node[data-nt-node="${CSS.escape(portEl.dataset.ntPort)}"]`) : e.target.closest?.('.nt-hit[data-nt-edge], .nt-bhit[data-nt-bundle], .nt-node[data-nt-node]');
        const id = !t ? null : t.dataset.ntEdge != null ? 'e:' + t.dataset.ntEdge : t.dataset.ntBundle != null && t.classList.contains('nt-bhit') ? 'b:' + t.dataset.ntBundle : 'n:' + t.dataset.ntNode;
        if (id === restId) return;
        restId = id; clearTimeout(rest); rest = setTimeout(() => hoverRead(id), id ? 420 : 260);
        clearTimeout(connectionRest); connectionRest = setTimeout(() => paintConnections(id), id ? 75 : 180);
        // rc41 W3: the port handle follows the hovered element (the selected one keeps its own).
        if (!e.target.closest('.nt-port')) paintPorts(id?.startsWith('n:') ? id.slice(2) : null);
      });
      svg.addEventListener('pointerleave', () => { restId = null; clearTimeout(rest); rest = setTimeout(() => hoverRead(null), 260); clearTimeout(connectionRest); connectionRest = setTimeout(() => paintConnections(), 180); if (!drag) paintPorts(); });
      svg.addEventListener('focusin', e => { const t = e.target.closest?.('.nt-hit[data-nt-edge], .nt-node[data-nt-node]'); if (t) paintConnections(t.dataset.ntEdge != null ? 'e:' + t.dataset.ntEdge : 'n:' + t.dataset.ntNode); });
      svg.addEventListener('focusout', () => queueMicrotask(() => { if (!svg.contains(document.activeElement)) paintConnections(); }));
      listen(root, 'submit', e => { api.submit(e); });
    },
    // The same picture as a file: SVG, PNG, diagram code, or the manifest of what this picture exports.
    export(id) {
      if (!D || !L) return;
      if (id === 'svg') { const s = api.svgString(); download(new Blob([s], {type: 'image/svg+xml;charset=utf-8'}), exportFileName('svg')); return; }
      if (id === 'png') { api.exportPNG(); return; }
      const fmt = CODE_FORMATS.find(f => f.id === id); if (!fmt && id !== 'manifest') return;
      const c = exportContext(id === 'manifest');
      if (id === 'manifest') {
        const files = pictureFiles(c);
        download(new Blob([JSON.stringify({schema: 'aiw.diagram-manifest/1', project: c.p?.name, chapter, scene: c.D.scene.id, arrangement: c.arrangement, contentVersion: c.p?.contentVersion ?? null, baseline: c.baseline, generatedAt: new Date().toISOString(), figures: figureManifest(files, String(c.p?.contentVersion ?? ''))}, null, 2)], {type: 'application/json'}), c.name('manifest.json'));
      } else download(new Blob([codeFile(fmt.id, c.D, c.L, {project: c.p, chapter}).text], {type: fmt.mediaType + ';charset=utf-8'}), c.name(fmt.ext));
    },
    // Every file this picture can be: the existing synchronous file-set API.
    files() {
      return D && L ? pictureFiles(exportContext(true)) : [];
    },
    exportSVG() { api.export('svg'); },
    exportPNG() {
      exportStatus('');
      const s = api.svgString(); if (!s) return; const context = exportContext(false), W = context.L.W;
      const img = new Image(), url = URL.createObjectURL(new Blob([s], {type: 'image/svg+xml;charset=utf-8'}));
      const H = Number(s.match(/height="([\d.]+)"/)?.[1]) || context.L.H;
      img.onload = () => { URL.revokeObjectURL(url); if (!context.current()) return; const c = document.createElement('canvas'), k = 2; c.width = W * k; c.height = H * k; const g = c.getContext('2d'); g.scale(k, k); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0); c.toBlob(b => { if (b && context.current()) download(b, context.name('png')); }, 'image/png'); };
      img.onerror = () => { URL.revokeObjectURL(url); if (context.current()) exportStatus('PNG could not be prepared. Choose PNG again to retry.'); };
      img.src = url;
    },
    svgString() {
      if (!L || !D) return '';
      const p = project();
      // The file never carries the build-up: it is a way of reading the picture, not part of it.
      const grouped = !!fold, scope = grouped ? `${fold.X ? (state.view === 'layers' ? 'Lane detail' : 'Group detail') : (state.view === 'layers' ? 'Grouped layer overview' : 'Grouped diagram overview')} of ${fold.F.total.nodes} elements and ${fold.F.total.edges} relationships` : '';
      lastSVG = notationSVG(D, L, {key: true, notes: true, prefix: 'nx', title: scope ? `${scope} · ${p?.name || ''}` : '', desc: scope ? `${scope}. This file draws ${D.nodes.length} elements and ${D.edges.length} relationships, including groups. Choose Show every element in AIW to draw and export the individual records of this scope. Connection visibility controls do not change this exported projection.\n${diagramText(D, L)}` : '', callouts: callouts(), vitals: vitalsNow, diff: !!full?.diff, marks: marksFor({export: true}), markWords: markWords({export: true}), footer: `AIW · ${p?.name || ''} · Chapter ${chapter} · ${scope || (state.view === 'layers' ? 'Connected model' : scene()?.title)}${p?.contentVersion != null ? ' · v' + p.contentVersion : ''}${state.baseline ? ' · compared with ' + state.baseline : ''} · positions are the reader’s, never facts`});
      return lastSVG;
    }
  };
  // A reader's selection on the picture (an element, a group, a line) opens the Details column its reading is written
  // into, unless the viewer closed it for this chapter and tab or the screen has no room for it (rc41 lead;
  // workspace-ux.js aiw:inspect-details). Before, the reading went into a closed column and the picture changed nothing.
  const revealReading = e => {
    if (!e.target?.closest?.('.cm-svg .nt-node, .cm-svg .nt-hit, .cm-svg .nt-bhit') || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    nextFrame(() => { if (root.isConnected && (sel || state.selEdge) && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aiw:inspect-details', {detail: {unlessClosed: true}})); });
  };
  // (in the capture phase: the picture's own handlers stop the click below the root; the frame after, the selection is read)
  listen(root, 'click', revealReading, true); listen(root, 'keydown', revealReading, true);
  // The Readable view returns to the frame the picture opens at (model-stage.js readable).
  stage.readingFrame = () => stage.frame(api.arrival(), 1);
  return api;
}
// ---------------------------------------------------------------- the record picture (round 5)
// Every record with a picture: a chapter record's neighbourhood in the chapter's connected model — the record and the
// records one relationship away (two when it stands nearly alone), at most twelve — drawn by this kit at a fixed small
// size, without a toolbar, with the record marked and the chapter's checks painted in the shared glyphs (Contract M).
// Its words follow the semantic zoom: at this size only the references and the glyphs are drawn, sized for the
// picture's scale so each reads at 9 px or more. record-picture.js mounts it on the Work tab's companion.
export const RECORD_PICTURE = {W: 268, H: 168, MAX: 12};
// The order the neighbours are kept in when there are more than the picture holds: the design's spine first.
const RANK = ['requirement', 'quality', 'decision', 'responsibility', 'component', 'capability', 'technology', 'contract', 'data', 'control', 'threat', 'instance', 'runtime', 'journey'];
const rankOf = t => { const i = RANK.indexOf(t); return i < 0 ? RANK.length : i; };

// The picture of one record, or null when the chapter cannot draw one for it.
export function recordPicture(p, chapter, id, {width = RECORD_PICTURE.W, height = RECORD_PICTURE.H} = {}) {
  if (!p || !id || !(chapter >= 1 && chapter <= 11)) return null;
  const own = checkMarks(p, chapter); if (!own.some(m => m.id === id)) return null;
  let C = null; try { C = notationDiagram(p, CONNECTED.id, {chapter}); } catch { C = null; }
  if (!C?.nodes.some(n => n.id === id)) return null;
  let D = focusDiagram(C, {id, hops: 1});
  if (D.nodes.length < 3) D = focusDiagram(C, {id, hops: 2});
  const all = D.nodes.length;
  if (all > RECORD_PICTURE.MAX) {
    const near = new Set(D.edges.flatMap(e => (e.from === id ? [e.to] : e.to === id ? [e.from] : [])));
    const keep = new Set([id, ...D.nodes.filter(n => n.id !== id).sort((a, b) => (near.has(b.id) - near.has(a.id)) || rankOf(a.type) - rankOf(b.type) || String(a.ref || a.title).localeCompare(String(b.ref || b.title), undefined, {numeric: true})).slice(0, RECORD_PICTURE.MAX - 1).map(n => n.id)]);
    D = {...D, nodes: D.nodes.filter(n => keep.has(n.id)), edges: D.edges.filter(e => keep.has(e.from) && keep.has(e.to)), groups: []};
  }
  D = {...D, notes: [], counts: {...D.counts, nodes: D.nodes.length, edges: D.edges.length}};
  const L = notationLayout(D, {arrangement: 'tree'});
  // The view box is the drawn elements alone (no header strip, no notes), with room for the marks at the corners.
  const xs = L.nodes.flatMap(b => [b.x, b.x + b.w]), ys = L.nodes.flatMap(b => [b.y, b.y + b.h]);
  const pad = 24, vx = Math.min(...xs) - pad, vy = Math.min(...ys) - pad, vw = Math.max(...xs) - vx + pad, vh = Math.max(...ys) - vy + pad;
  const z = Math.min(width / vw, height / vh, 1), far = Math.max(12, Math.min(64, Math.ceil(9.6 / z)));
  const marks = mergeSources([['checks', checkMarks(p, chapter)]]);
  const parts = svgParts(D, L, {prefix: 'rp', sel: id, marks, far, farText: 'ref'});
  const node = D.nodes.find(n => n.id === id), MK = marksLegend(marks, D);
  // The Model view it opens on: the chapter's Diagram when that draws the record, else the connected model it comes from.
  let view = 'layers'; try { const sc = notationScenes(chapter)[0]; if (sc && notationDiagram(p, sc.id)?.nodes.some(n => n.id === id)) view = 'diagram'; } catch { /* the connected model holds it */ }
  // The far names are sized for this picture's scale, so they read at any scale under 0.8.
  return {id, chapter, node, D, L, z, view, level: z < 0.8 ? 'far' : zoomLevel(z), all, shown: D.nodes.length, legend: MK,
    svg: `<svg class="rp-svg" viewBox="${Math.round(vx)} ${Math.round(vy)} ${Math.round(vw)} ${Math.round(vh)}" width="${width}" height="${Math.round(Math.min(height, vh * z))}" role="img" aria-label="${esc(`${node.ref || node.title}: ${D.nodes.length - 1} neighbouring record${D.nodes.length === 2 ? '' : 's'} in Chapter ${chapter}'s connected model`)}"><style>${SVG_STYLE}</style>${parts.defs}${parts.groups}${parts.edges}${parts.nodes}</svg>`};
}

export function recordPictureHTML(R) {
  if (!R) return '';
  const n = R.node, more = R.all > R.shown ? ` · ${R.all - R.shown} more on the Model tab` : '';
  const checks = R.legend.filter(m => MARK_GLYPHS[m.state]).map(m => `<span class="rp-k ${esc(m.state)}"><i aria-hidden="true">${esc(m.glyph)}</i> ${m.count} ${esc(MARK_WORDS[m.state])}</span>`).join('');
  return `<figure class="rp" data-rp="${esc(R.id)}" data-rp-chapter="${R.chapter}" data-rp-view="${esc(R.view)}" role="link" tabindex="0" aria-label="${esc(`Open ${n.ref || n.title} on the Model tab`)}" title="Open on the Model tab"><figcaption><b>${esc(n.ref && n.ref !== n.title ? n.ref + ' · ' + n.title : n.title)}</b><small>Its neighbourhood · ${R.shown - 1} record${R.shown === 2 ? '' : 's'}${more}</small></figcaption><div class="rp-pic" data-cm-z="${R.level}" style="--cm-z:${Math.round(R.z * 1000) / 1000}">${R.svg}</div><p class="rp-foot">${checks || '<span class="rp-k">No check on these records</span>'}<span class="rp-open">Open on Model →</span></p></figure>`;
}

function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
const svgIcon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const layersIcon = () => svgIcon('M12 3 2 8l10 5 10-5-10-5M2 13l10 5 10-5');
const focusIcon = () => svgIcon('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3');
const codeIcon = () => svgIcon('m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16');
const traceIcon = () => svgIcon('M5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4M19 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4M7 6h6a3 3 0 0 1 0 6h-2a3 3 0 0 0 0 6h6');
const buildIcon = () => svgIcon('M4 20h16M6 20v-5h4v5M14 20v-9h4v9M10 20V9h4v11M8 4l4-2 4 2');
const addHereIcon = () => svgIcon('M4 4h9v6H4zM15 15h5M17.5 12.5v5M8.5 10v4h4');
