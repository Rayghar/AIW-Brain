// The SDD's editions (round 12, decision D-01; audit/round12/SDD-SPEC.md). The architecture edition is the default: the
// design document of SDD-SPEC, built by sdd-architecture.js, with its figures, the C4 levels of section 5, drawn here.
// The executive edition is its concise reading, with a context figure when available: what the solution is, the requirements and drivers that matter most,
// the decisions, the shape, where it runs, what protects it, and the risks and open items. Audiences are views of the
// architecture edition (delivery and review). Every edition says who wrote its content, from the one provenance reading,
// never from a clipped text. The register-shaped full edition of rounds 5 to 11 is retired: its registers are annexes
// (sdd-annexes.js, review-domain.js assembleSDD), and a link that still asks for it opens the architecture edition.
// A baseline frozen before round 12 keeps its full edition as it was frozen, and its figures are drawn again from its
// frozen source by the chapter figure set kept below for it (legacyFigureSet).
// Nothing here writes the document, confirms a record or approves anything. DOM-free: the server, the export thread
// and the suites load it; the browser builds Word and PDF from the Markdown the server serves.
// Round 6 (Contract F), kept: figures:'mermaid' writes each figure as a fenced Mermaid block that renders where Markdown is
// rendered; the HTML, Word and PDF builders never take that variant.
import {CHAPTERS, reviewRequirements, reviewTrace, reviewSource, baselineChanges, registerSDDBuilder, withFinalReview, openCounts, latestDesignReview} from './review-domain.js';
import {sddFigures, traceabilityFigure, figureSet, diagramFigures, moduleMapFigures, MAP_LINES, MATRIX_COLUMNS, FIGURE_BUDGET} from './sdd-figures.js';
import {hasModules} from './module-model.js';
import {SCENES, notationDiagram} from './notation-model.js';
import {LIST_MAX as LIST_NAMES, LIST_FEWER} from './figure-budget.js';
import {fileSafe} from './util.js';
import {mermaidFenced} from './mermaid-figures.js';
import {baselineDiff} from './architecture-analysis.js';
import {journeyIndex} from './journey-context.js';
import {decisionCategory, chosen, statusLabel, DECISION_CATEGORIES} from './decisions-domain.js';
import {driverCodes, driverPriority, isQualityDriver, driverKind, DRIVER_KINDS} from './quality-domain.js';
import {priorityRank, levelOf} from './priority-scale.js';
import {requirementGroups, groupIndex} from './requirement-groups.js';
import {sha256, digest} from './brain-integrity.js';
import {remember, memoPass, passRemember} from './document-memo.js';
import {architectureMarkdown, provenanceReading, documentStatus, solutionName, refList, refOf, md, mdCell, plural, bullets, LIST_MAX, unescapeMd, groupLabel, slugger, leanWords} from './sdd-architecture.js';
import {DEFAULT_WEIGHTS} from './decision-reading.js';
import {c4Diagrams, c4Reading, C4_SCENES, containersInBody, modulesInBody} from './sdd-c4.js';
import {pdfPageCount} from './review-pdf.js';
import {targetWords} from './ars-document.js';
import {planOperation, seededRecords} from './runtime-domain.js';
// The SDD's change section registers itself with review-domain.js when loaded (round 12, D-05).
import './change-summary.js';

export {refList};
export const SDD_EDITIONS = ['architecture', 'executive'];
export const SDD_AUDIENCES = ['all', 'delivery', 'review'];
// How an edition carries its figures: drawn as inline SVG (true), left out (false), or written as Mermaid code blocks.
export const SDD_FIGURES = [true, false, 'mermaid'];
export const AUDIENCE_LABEL = {all: 'For everyone', delivery: 'For the delivery team', review: 'For reviewers'};
export const EDITION_LABEL = {architecture: 'Architecture edition', executive: 'Executive edition'};
// An edition and an audience from the export route's query (or a plain object). A link made before round 12 still opens:
// the retired full edition (edition=full) reads as the architecture edition, and the retired summary view
// (detail=summary) as the executive edition.
export function sddEdition(params) {
  const get = k => (typeof params?.get === 'function' ? params.get(k) : params?.[k]);
  const asked = get('edition'), edition = asked === 'full' ? 'architecture' : asked || (get('detail') === 'summary' ? 'executive' : 'architecture'), audience = get('audience') || 'all';
  if (!SDD_EDITIONS.includes(edition)) throw Error('Choose the architecture or the executive edition.');
  if (!SDD_AUDIENCES.includes(audience)) throw Error('Choose everyone, the delivery team or reviewers as the audience.');
  return {edition, audience};
}

// ---------------------------------------------------------------- what changed since the last frozen baseline
function recordIndex(p) {
  const byRef = new Map(), byId = new Map(), add = (ref, id, chapter, record) => { if (!ref) return; const e = {ref, id, chapter, record}; if (!byRef.has(ref)) byRef.set(ref, e); if (id && !byId.has(id)) byId.set(id, e); };
  for (const n of journeyIndex(p).nodes.values()) add(n.ref || n.id, n.id, n.chapter, n.record || n);
  for (const d of p.decisions?.records || []) for (const a of d.alternatives || []) add(a.id, a.id, 3, a);
  for (const x of p.runtime?.placements || []) add(x.id, x.id, 10, x);
  for (const x of p.runtime?.paths || []) add(x.id, x.id, 10, x);
  return {byRef, byId, ref: id => byId.get(id)?.ref || byRef.get(id)?.ref || id};
}
const NOISE = new Set(['history', 'revision', 'sourceSnapshot', 'driverSnapshot', 'provenance', 'updatedAt', 'stamp', 'sourceStamp', 'review', 'reviews', 'at', 'solSuggestions']);
export function changesSinceBaseline(p) {
  const b = p.finalReview?.baselines?.at(-1); if (!b?.source) return null;
  let diff; try { diff = baselineDiff(b.source, reviewSource(p)); } catch { return null; }
  const now = recordIndex(p), then = recordIndex(b.source), rows = new Map();
  for (const r of diff.records) {
    const fields = r.kind === 'changed' ? r.fields.map(f => f.key).filter(k => !NOISE.has(k)) : []; if (r.kind === 'changed' && !fields.length) continue;
    const ref = now.byId.get(r.id)?.ref || then.byId.get(r.id)?.ref || r.id, ch = Number(r.chapter) || 11;
    if (!rows.has(ch)) rows.set(ch, {added: [], changed: [], removed: []}); rows.get(ch)[r.kind].push(r.kind === 'changed' ? {ref, fields} : {ref});
  }
  let other = []; try { other = baselineChanges(p, b).filter(t => !CHAPTERS.some(c => c.title === t)); } catch { other = []; }
  return {baseline: {id: b.id, title: b.title, at: b.at, classification: b.classification}, chapters: [...rows].sort((a, b2) => a[0] - b2[0]).map(([chapter, r]) => ({chapter, ...r})), other, edges: diff.edges.length};
}

// ---------------------------------------------------------------- figures
export function matrixRows(p, index = recordIndex(p)) {
  const accepted = /^(?:accepted|approved|confirmed|verified|chosen|decided|active)$/i, confirmed = r => !!r && (r.confirmed === true || (r.confirmed === undefined && accepted.test(String(r.status || ''))));
  return reviewRequirements(p).map(r => { const t = reviewTrace(p, r.id) || {}, ids = {}, counts = {}; for (const [k] of MATRIX_COLUMNS) { const xs = t[k] || []; counts[k] = xs.length; ids[k] = xs.map(x => x.ref || index.ref(x.id) || x.id); } return {ref: r.id, title: r.title, confirmed: confirmed(r), counts, ids}; });
}
// Drawing is the costly part of an edition, so a set is drawn once and kept: per document object through document-memo.js
// (remember), and by the content it was drawn from (the document's canonical SHA-256 with the filter), the FIGURE_SETS
// most recent, frozen so that no reader can change what the next one gets. figureMemo counts what was drawn and reused.
const FIGURE_SETS = 8, keptSets = new Map();
export const figureMemo = {drawn: 0, reused: 0};
const kept = (p, name, filter, draw) => remember(p, name, filter, () => {
  const fingerprint = digest(p), key = name + '\u0000' + fingerprint + '\u0000' + filter, have = keptSets.get(key);
  if (have) { keptSets.delete(key); keptSets.set(key, have); figureMemo.reused++; return have; }
  const set = draw(fingerprint);
  for (const x of [...set.figures, ...set.manifest, ...set.omitted]) Object.freeze(x);
  for (const x of [set.figures, set.manifest, set.omitted]) Object.freeze(x);
  Object.freeze(set); keptSets.set(key, set); if (keptSets.size > FIGURE_SETS) keptSets.delete(keptSets.keys().next().value); figureMemo.drawn++; return set;
});
// The architecture edition's figures (SDD-SPEC §5, GR-FIG-08; the lead's decision on figure heights): the C4 levels in
// reading order, the context (level 1), the containers (level 2), a component diagram for each container that holds two
// components or more (level 3) and the deployment. Each level is drawn within the figure budget (sdd-figures.js
// diagramFigures): the picture itself, or above the budget its overview followed by the details of its largest groups.
// The body keeps at most BODY_DETAILS details a level and the component diagrams of the BODY_CONTAINERS containers that
// hold the most components; the figures annex (annex: true) draws every detail of every level and every container.
// Every figure fits one page: portrait at 160 mm, else on a landscape page at 247 mm, else the level is folded again
// within FIT_BUDGETS (24, then 16 elements; a picture of 16 elements or fewer that still fits no page is not folded by
// either, so it is folded at 12, then 8), which its footer records. Each figure carries `key`, the level it draws
// (context, container, component:<container reference>, deployment); the set carries `levels`: per level, its budget,
// what its fold put in the body and what it leaves to the annex.
export const BODY_DETAILS = 3, FIT_BUDGETS = Object.freeze([FIGURE_BUDGET, 24, 16, 12, 8]);
const LISTED = {context: 'The people and external systems are listed in section 1 (Target users) and section 4 (External integrations).', container: 'The containers and their components are listed in section 4 (Component detail) and in the component specifications annex (Appendix D).', component: 'The components are listed in section 4 (Component detail) and in the component specifications annex (Appendix D).', deployment: 'The environments, zones and placements are listed in the Chapter 10 register (Appendix D).', 'chapter-model': 'The complete records and their relationships remain in the corresponding chapter register and the figures annex (Appendix D).'};
// Round 24 (D-24-07): a folded group prints as a list box naming up to six of its members (figure-budget.js LIST_MAX). At
// each budget a level that fits no page with six names a box is drawn again with three (LIST_FEWER) before it is folded
// within a smaller budget: more groups with fewer names each before fewer groups. The figure's footer says so.
const FIT_TRIES = Object.freeze(FIT_BUDGETS.flatMap(b => [[b, LIST_NAMES], [b, LIST_FEWER]]));
function levelFigures(p, D, {key, level, scene, chapter, first, details, baselineId, code, fewer = null}) {
  const version = p.contentVersion != null ? 'v' + p.contentVersion : '', at = version ? ' · ' + version : '', tail = baselineId ? ' · ' + baselineId : '';
  const stem = 'figures/AIW-' + fileSafe(p.name || 'design') + '-ch' + chapter + '-' + fileSafe(key.replace(':', '-')) + '-' + scene.arrangement + (version ? '-' + version : '') + (baselineId ? '-' + fileSafe(baselineId) : '');
  // Round 24 (D-24-07): a level drawn by module (`fewer(lines)`: sdd-c4.js containerAt) keeps every module a box of its
  // own, naming fewer of its components (MAP_LINES) until it fits a page, before it is folded within a budget.
  if (fewer) for (const lines of MAP_LINES) {
    const X = fewer(lines), out = diagramFigures(p, X, {scene, chapter, first, stem, where: LISTED[level], code, budget: Infinity, details: 0, fit: true, at, tail, foot: lines >= MAP_LINES[0] ? '' : lines ? `each module names up to ${lines} of its components` : 'each module counts its components without naming them'});
    if (out.figures.every(x => x.print.fits)) return {figures: out.figures.map(x => ({...x, key})), level: {key, budget: null, fits: true, fold: null, lines}};
    D = X;
  }
  // Complementary chapter pictures are overviews: begin with eight groups rather
  // than laying out every large scene repeatedly. Their complete records stay in
  // the chapter registers; the footer declares the smaller group/name budget.
  const tries = level === 'chapter-model' ? [[8, LIST_FEWER], [8, 2], [4, 2], [4, 1]] : FIT_TRIES;
  let out = null, budget = tries[0][0], list = tries[0][1];
  for (const [i, [b, names]] of tries.entries()) {
    // A smaller budget the picture is still within draws the same figure again: the next one that folds it (and fewer
    // names where nothing is folded change nothing). While a later try would fold it, a fold stops at its first figure that
    // fits no page.
    if (out && b >= D.nodes.length && budget >= D.nodes.length) continue;
    const stop = tries.slice(i + 1).some(([x]) => x < D.nodes.length);
    budget = b; list = names; out = diagramFigures(p, D, {scene, chapter, first, stem, where: LISTED[level], code, budget: b, list: names, details, fit: true, stop, at, tail}); if (!out.unfit && out.figures.every(x => x.print.fits)) break;
  }
  return {figures: out.figures.map(x => ({...x, key})), level: {key, budget, fits: out.figures.every(x => x.print.fits), fold: out.fold ? {by: out.fold.by, groups: out.fold.groups.length, details: out.fold.details.length, listed: out.fold.listed, list} : null}};
}
// Round 24 (D-24-07): the module map opens section 5 where the project has a module structure (sdd-figures.js
// moduleMapFigures: drawn smaller until it fits a page), and the container and component levels read the modules where
// the containers are not decided yet (sdd-c4.js): the container level draws the modules as its containers, and the
// component level one figure per module of two components or more, the BODY_MODULES that hold the most in the body and
// every one in the figures annex. The set carries `section5`, what the section prints in reading order (one entry per
// level, and per module or container at level 3; each with the numbers of its figures in this set):
//   {level: 'module-map' | 'context' | 'container' | 'component' | 'deployment', key (the figures' key), title,
//    figures: [n], by ('module' | 'container', at levels 2 and 3), why (level 2 by module: why the modules stand for the
//    containers), module {id, ref, title, platform} and container {id, ref, title} (level 3), components (how many it
//    holds; by module, round 24 part 3, those it is home to, which its figure draws in full), shared (by module: those it
//    shares, drawn in full in their home module's figure), body (drawn in this set's body), annex (left to the figures
//    annex), reason (why it has no figure)}.
const MAP_LISTED = 'The modules and their sub-modules are listed in section 4, and their requirements in the requirement register by group (Appendix D).';
export function architectureFigureSet(p, {baselineId = null, code = null, annex = false, details = BODY_DETAILS, chapterModels = true} = {}) {
  return memoPass(p, () => kept(p, 'sdd:c4-set', JSON.stringify([baselineId, code, annex, details, chapterModels]), fingerprint => {
    const C = c4Diagrams(p), list = [], omitted = [], levels = [], keep = annex ? Infinity : details, section5 = [];
    const numbers = from => list.slice(from).map(f => f.n);
    const draw = (D, key, level, scene, chapter = 5, fewer = null) => {
      if (!D || !D.nodes.length) { omitted.push({chapter, scene: key, title: scene.title, reason: 'Nothing is recorded for this picture yet.'}); return []; }
      const from = list.length, out = levelFigures(p, D, {key, level, scene, chapter, first: list.length + 1, details: level === 'chapter-model' && !annex ? 0 : keep, baselineId, code, fewer});
      list.push(...out.figures); levels.push(out.level); return numbers(from);
    };
    // The module map, where the project has a module structure (a project without one has no functional decomposition to draw).
    if (C4_SCENES.moduleMap && hasModules(p)) {
      const version = p.contentVersion != null ? 'v' + p.contentVersion : '', from = list.length;
      const stem = 'figures/AIW-' + fileSafe(p.name || 'design') + '-ch1-module-map-' + C4_SCENES.moduleMap.arrangement + (version ? '-' + version : '') + (baselineId ? '-' + fileSafe(baselineId) : '');
      const M = moduleMapFigures(p, {chapter: 1, first: list.length + 1, stem, where: MAP_LISTED, code, at: version ? ' · ' + version : '', tail: baselineId ? ' · ' + baselineId : ''});
      list.push(...M.figures.map(f => ({...f, key: 'module-map'})));
      if (M.figures.length) levels.push({key: 'module-map', budget: null, fits: M.figures.every(f => f.print.fits), fold: null, map: M.map});
      section5.push({level: 'module-map', key: 'module-map', title: C4_SCENES.moduleMap.title, figures: numbers(from), ...(M.map ? {modules: M.map.total, drawn: M.map.modules, lines: M.map.lines} : {reason: M.D?.notes?.[0] || 'No module structure is recorded yet.'})});
    }
    if (C.context) section5.push({level: 'context', key: 'context', title: C4_SCENES.context.title, figures: draw(C.context, 'context', 'context', C4_SCENES.context, 1)});
    else { omitted.push({chapter: 1, scene: 'context', title: 'Context', reason: C.contextNote || 'Nothing is recorded for this picture yet.'}); section5.push({level: 'context', key: 'context', title: C4_SCENES.context.title, figures: [], reason: C.contextNote || 'Nothing is recorded for this picture yet.'}); }
    const containerScene = C.byModule ? C4_SCENES.moduleContainer : C4_SCENES.container;
    const containerFigures = draw(C.container, 'container', 'container', containerScene, 5, C.containerAt);
    section5.push({level: 'container', key: 'container', title: containerScene.title, by: C.containerBy, ...(C.byModule ? {why: C.containerWhy} : {}), figures: containerFigures, ...(containerFigures.length ? {} : {reason: 'No application component is recorded yet, so there is no container to draw.'})});
    // Level 3 in the body: the containers, or the modules, that hold the most components, in reading order; the annex
    // draws every one.
    const shown = (C.byModule ? modulesInBody : containersInBody)(C.components, annex ? Infinity : undefined), level3 = [];
    for (const x of C.components) {
      const ref = x.container.ref || x.container.id, key = 'component:' + ref, what = x.module ? {by: 'module', module: {id: x.module.id, ref: x.module.ref, title: x.module.title, platform: !!x.module.platform}} : {by: 'container', container: {id: x.container.id, ref: x.container.ref, title: x.container.title}};
      const scene = x.module ? {...C4_SCENES.moduleComponent, title: 'Components of ' + ref + ' ' + x.container.title} : {...C4_SCENES.component, title: 'Components of ' + ref + ' ' + x.container.title};
      const counts = {components: x.container.components.length, ...(x.module ? {shared: (x.container.shared || []).length} : {})};
      if (shown.has(x)) level3.push({level: 'component', key, title: scene.title, ...what, ...counts, body: true, figures: draw(x.D, key, 'component', scene)});
      else { levels.push({key, budget: null, fits: true, fold: null, annex: true}); level3.push({level: 'component', key, title: scene.title, ...what, ...counts, body: false, annex: true, figures: []}); }
    }
    // The modules (or containers) of one component, and of none, at level 3: named, never drawn.
    for (const k of C.single) level3.push({level: 'component', key: 'component:' + (k.ref || k.id), title: (k.ref || k.id) + ' ' + k.title, ...(k.module ? {by: 'module', module: {id: k.id, ref: k.ref, title: k.title, platform: !!k.platform}} : {by: 'container', container: {id: k.id, ref: k.ref, title: k.title}}), components: 1, body: false, figures: [], reason: 'It holds one component, which section 4 describes.'});
    if (C.byModule) for (const u of C.modules.modules.filter(u => !u.components.length)) level3.push({level: 'component', key: 'component:' + u.ref, title: u.ref + ' ' + u.title, by: 'module', module: {id: u.id, ref: u.ref, title: u.title, platform: u.platform}, components: 0, body: false, figures: [], reason: 'No component is in this module yet.'});
    // (round 24 part 3: a module whose components are all shared and drawn in full in their home module's figure)
    for (const k of C.elsewhere || []) level3.push({level: 'component', key: 'component:' + k.ref, title: k.ref + ' ' + k.title, by: 'module', module: {id: k.id, ref: k.ref, title: k.title, platform: !!k.platform}, components: 0, shared: k.shared.length, body: false, figures: [], reason: 'Each of its components is shared, and drawn in full in the figure of its home module.'});
    // By module, level 3 reads in the modules' order (the tree's); by container, the drawn containers first, as before.
    const rank = new Map(C.modules.modules.map((u, i) => [u.id, i]));
    section5.push(...(C.byModule ? level3.slice().sort((a, b) => (rank.get(a.module?.id) ?? 1e9) - (rank.get(b.module?.id) ?? 1e9)) : level3));
    if (C.deployment) section5.push({level: 'deployment', key: 'deployment', title: C4_SCENES.deployment.title, figures: draw(C.deployment, 'deployment', 'deployment', C4_SCENES.deployment, 10)});
    else { omitted.push({chapter: 10, scene: 'deployment', title: 'Deployment', reason: C.deploymentNote || 'Nothing is placed in an environment yet.'}); section5.push({level: 'deployment', key: 'deployment', title: C4_SCENES.deployment.title, figures: [], reason: C.deploymentNote || 'Nothing is placed in an environment yet.'}); }
    // Complement the C4 views with the canonical chapter models. A chapter with no
    // relevant records gets an omission receipt, never an illustrative placeholder.
    if (chapterModels) for (const [chapter, id, present] of [
      [2, 'drivers', p.quality?.drivers?.length], [3, 'decisions', p.decisions?.records?.length],
      [4, 'logical', p.logical?.responsibilities?.length], [6, 'solution', p.technology?.capabilities?.length],
      [7, 'stack', p.technologyRealisation?.records?.length],
      [8, p.interfaces?.contracts?.length ? 'sequence' : 'data', p.interfaces?.contracts?.length || p.interfaces?.data?.length],
      [9, 'security', p.security?.threats?.length || p.security?.controls?.length],
      [11, 'rationale', reviewRequirements(p).length]
    ]) {
      const scene = SCENES.find(s => s.id === id), key = 'chapter:' + id;
      const figures = draw(present ? passRemember(p, 'sdd:chapter-diagram', id, () => notationDiagram(p, id)) : null, key, 'chapter-model', scene, chapter);
      section5.push({level: 'chapter-model', key, chapter, title: scene.title, purpose: scene.purpose, figures, ...(figures.length ? {} : {reason: 'No relevant saved records are available for this chapter model.'})});
    }
    const set = figureSet(p, list, omitted, fingerprint, code);
    set.levels = levels; for (const l of levels) Object.freeze(l); Object.freeze(levels);
    set.section5 = section5; for (const x of section5) { Object.freeze(x.figures); Object.freeze(x); } Object.freeze(section5);
    return set;
  }));
}
// The chapter figure set a baseline frozen before round 12 carries (its full edition: the traceability matrix, then each
// chapter's pictures), drawn again from its frozen source for its HTML. Kept for those baselines alone. Drawn in one pass
// over the source (GR-PERF-11): its pictures read the same model, checks and indexes, which are worked out once.
const LEGACY_SCENES = Object.freeze(SCENES.map(s => s.id).filter(id => id !== 'module-map'));
export function legacyFigureSet(p, options = {}) {
  const o = {baselineId: null, matrix: true, matrixAt: 'first', chapters: CHAPTERS.map(c => c.id).concat(11), scenes: null, code: null, ...options};
  return memoPass(p, () => kept(p, 'sdd:figure-set', JSON.stringify([o.baselineId, o.matrix ? o.matrixAt : false, o.chapters, o.scenes, o.code]), fingerprint => {
    const list = [], omitted = [], rows = o.matrix ? matrixRows(p) : [], matrix = n => traceabilityFigure(p, rows, {n, baselineId: o.baselineId});
    if (o.matrix && !rows.length) omitted.push({chapter: 11, scene: 'traceability', title: 'Requirement traceability', reason: 'No requirement in scope is recorded yet.'});
    if (rows.length && o.matrixAt === 'first') list.push(matrix(1));
    // (the chapter pictures those editions drew: the module map of round 24 is not one of them)
    const scenes = sddFigures(p, {baselineId: o.baselineId, chapters: o.chapters, scenes: o.scenes || LEGACY_SCENES, first: list.length + 1, fingerprint, code: o.code});
    list.push(...scenes.figures); if (rows.length && o.matrixAt === 'last') list.push(matrix(list.length + 1));
    return figureSet(p, list, [...omitted, ...scenes.omitted], fingerprint, o.code);
  }));
}
// The figures of a frozen baseline's HTML, drawn from its frozen source by the set its Markdown was frozen with.
export const isArchitectureEdition = markdown => /^<!-- aiw:cover -->$/m.test(String(markdown ?? ''));
export function frozenFigureSet(source, baseline) {
  const p = figureSourceOf(source);
  return isArchitectureEdition(baseline?.markdown) ? architectureFigureSet(p, {baselineId: baseline.id, chapterModels: String(baseline.markdown).includes('<!-- aiw:chapter-models -->')}) : legacyFigureSet(p, {baselineId: baseline?.id || null});
}
// The project a frozen baseline's figures are drawn from: its frozen source, so the HTML of the baseline draws the same bytes.
export const figureSourceOf = source => withFinalReview(structuredClone(source), {upgrade: false});
// A figure in Markdown: inline SVG in an HTML block (no blank line inside, so a Markdown reader keeps it whole), with
// its caption, file name and SHA-256. The HTML rendering, the Word and the PDF builders find it by its id.
const xml = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export function figureBlock(f) {
  let svg = f.svg, sha = f.sha256; if (/\n[ \t]*\n/.test(svg)) { svg = svg.replace(/\n[ \t]*\n/g, '\n'); sha = sha256(svg); }
  return '<figure id="figure-' + f.n + '" data-scene="' + xml(f.scene) + '" data-sha256="' + sha + '">\n' + svg + '\n<figcaption>' + xml(f.caption) + ' · ' + xml(f.path) + '</figcaption>\n</figure>';
}
// A figure as Mermaid (round 6, Contract F): a bold figure line, the fenced block a Markdown renderer draws, and a caption
// paragraph with the file name and the SHA-256 of the Mermaid text. No HTML, so it reads wherever Markdown reads.
const plainText = v => String(v ?? '').replace(/[*_`[\]<>]/g, ' ').replace(/\s+/g, ' ').trim();
export function mermaidBlock(f, purpose = '') {
  if (!f.mermaid) throw Error('This figure carries no Mermaid text; draw the set with code: mermaid.');
  return '**Figure ' + f.n + ' · ' + plainText(f.title) + '**\n\n```mermaid\n' + mermaidFenced(f.mermaid) + '\n```\n\n' + plainText(f.caption) + (purpose ? ' — ' + plainText(purpose) : '') + ' · ' + plainText(f.mermaidPath) + ' · SHA-256 ' + f.mermaidSha256;
}
const MERMAID_NOTE = 'Figures are Mermaid code blocks: they render where Markdown renders them, from the same records the pictures on screen are drawn from.';

// ---------------------------------------------------------------- the architecture edition
// The PDF of the architecture edition stays under PDF_PAGES pages with its figures drawn at their print size (the lead's
// decision on figure heights): the body keeps BODY_DETAILS details a level, else 2, else 1. An explicit `details` is kept.
export const PDF_PAGES = 150;
// How many editions were built, by kind (as figureMemo counts the figure sets): what the size suite reads to show that the
// executive edition builds no architecture edition (GR-SDD-27).
export const editionBuilds = {architecture: 0, executive: 0};
function architectureEdition(p, options = {}) {
  if (options.details != null || (options.figures ?? true) !== true || options.audience === 'review') return architectureBody(p, {...options, details: options.details ?? BODY_DETAILS});
  const build = details => { const doc = architectureBody(p, {...options, details}), sizes = new Map((doc.figures?.figures || []).map(f => [f.n, {type: 'image/jpeg', pixelWidth: f.print.widthPx, pixelHeight: f.print.heightPx}])); doc.pages = pdfPageCount(doc.markdown, solutionName(p) + ' Solution Design', sizes); return doc; };
  let doc = null;
  for (const details of [BODY_DETAILS, 2, 1]) {
    doc = build(details);
    if (doc.pages < PDF_PAGES || details === 1) break;
    // A body figure takes a page at most, so fewer details save at most a page for each detail beyond the one a folded
    // level keeps: when that cannot bring the document under the bound (its text alone is longer), the body keeps one
    // detail a level at once, as the rule ends, without the builds in between.
    const shown = (doc.figures?.figures || []).filter(f => f.role === 'detail').length, kept = (doc.figures?.levels || []).filter(l => l.fold && l.fold.details).length;
    if (doc.pages - Math.max(0, shown - kept) >= PDF_PAGES) { doc = build(1); break; }
  }
  return doc;
}
function architectureBody(p, {audience = 'all', meta = {}, baselineId = null, figures = true, figureProject = p, details = BODY_DETAILS} = {}) {
  editionBuilds.architecture++;
  const code = figures === 'mermaid' ? 'mermaid' : null, keepsModels = audience !== 'review';
  const set = figures && keepsModels ? architectureFigureSet(figureProject, {baselineId, code, details}) : null;
  const c4 = keepsModels ? c4Diagrams(p) : null, block = code ? f => mermaidBlock(f) : figureBlock;
  // (round 24: `section5`, the set's list of what section 5 prints, level by level and module by module, with the numbers
  // of each one's figures; null where no figure is drawn)
  const F = c4 ? {c4, figures: key => (set ? set.figures.filter(f => f.key === key) : []), level: key => set?.levels.find(l => l.key === key) || null, section5: set?.section5 || null, block, drawn: !!set, details} : null;
  const editionLine = EDITION_LABEL.architecture + ' · ' + AUDIENCE_LABEL[audience] + (code ? ' · Mermaid figures. ' + MERMAID_NOTE : figures ? '' : ' · figures not drawn in this export') + (meta.id ? ' · frozen as ' + meta.id : '');
  const changes = meta.id ? null : changesSinceBaseline(p);
  const A = architectureMarkdown(p, {audience, meta, figures: F, editionLine, changes});
  return {edition: 'architecture', audience, markdown: A.markdown, sections: A.sections, figures: set, openItems: A.openItems, provenance: A.provenance, status: A.status, content: A.content, changes, details};
}

// The figures annex (Appendix D; the lead's decision on figure heights): every figure of section 5, the C4 levels with
// the detail of every group a level folds and the component diagram of every container, numbered in its own reading
// order, each fitting one page, with its caption, text alternative and digest. The Markdown carries the figures as the
// edition does; the route draws them in HTML, writes the SVG files to a zip with their manifest, and the browser makes
// its Word and PDF (review-documents.js). Nothing here changes the project.
export function figuresAnnex(p, {code = null} = {}) {
  const set = architectureFigureSet(p, {annex: true, code}), block = code ? f => mermaidBlock(f) : figureBlock;
  const TITLE = {'module-map': 'Module map', context: 'Context diagram (Level 1)', container: 'Container diagram (Level 2)', deployment: 'Deployment diagram'};
  let out = '<!-- aiw:cover -->\n# ' + md(solutionName(p).toUpperCase()) + ' · Figures annex\n\nAn annex of the Solution Design Document (Appendix D): every figure of section 5, ' + plural(set.figures.length, 'figure') + ' drawn from the saved records within the figure budget, each fitting one page; positions are a projection, never facts.\n<!-- aiw:/cover -->\n\n';
  if (!set.figures.length) out += 'None recorded: nothing is recorded that section 5 would draw.\n\n';
  for (const key of [...new Set(set.figures.map(f => f.key))]) {
    const fs = set.figures.filter(f => f.key === key);
    out += '# ' + (TITLE[key] || (key.startsWith('chapter:') ? md(fs[0].title) : 'Component diagram (Level 3) · ' + md(key.replace(/^component:/, '')))) + '\n\n' + fs.map(f => (f.print?.orientation === 'landscape' ? '<!-- aiw:landscape -->\n' + block(f) + '\n<!-- aiw:/landscape -->' : block(f))).join('\n\n') + '\n\n';
  }
  return {markdown: (out + '<!-- aiw:figure-manifest -->\n').replace(/\n{3,}/g, '\n\n'), figures: set};
}

// ---------------------------------------------------------------- the executive edition (concise with context)
const delivery = a => String(a?.assessment?.delivery ?? '').trim();
const isGap = a => !!delivery(a) && delivery(a).toLowerCase() !== 'delivered';
const BANDS = ['critical', 'high', 'medium', 'low'];
const bandRank = a => { const i = BANDS.indexOf(String(a?.assessment?.priorityBand ?? '').trim().toLowerCase()); return i < 0 ? 9 : i; };
const scoreOf = a => { const n = Number(a?.assessment?.priorityScore); return Number.isFinite(n) && String(a?.assessment?.priorityScore ?? '').trim() !== '' ? n : -1; };
const clip = (v, max) => { const t = String(v ?? '').replace(/\s+/g, ' ').trim(); return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t; };
const sentence = t => { const s = String(t || '').trim(); return !s ? '' : /[.!?…:]$/.test(s) ? s : s + '.'; };
// The requirements that matter most (GR-SDD-09): the delivery gaps first, by the source's priority band and then its
// score; then the rest by their priority and by the priority of the drivers linked to them. The ranking says its basis.
export function rankRequirements(p) {
  const reqs = reviewRequirements(p), drivers = p.quality?.drivers || [], linked = new Map();
  for (const d of drivers) for (const id of d.requirementIds || []) { const lv = levelOf('driver', driverPriority(d)) ?? 9; if (!linked.has(id) || linked.get(id) > lv) linked.set(id, lv); }
  const key = r => [isGap(r) ? 0 : delivery(r) ? 2 : 1, bandRank(r), -scoreOf(r), priorityRank('requirement', r.priority), linked.get(r.id) ?? 9];
  const ranked = [...reqs].sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return a.id.localeCompare(b.id); });
  const assessed = reqs.some(r => delivery(r)), banded = reqs.some(r => bandRank(r) < 9), scored = reqs.some(r => scoreOf(r) >= 0);
  const basis = assessed ? 'ranked by the source assessment: the requirements not yet delivered first' + (banded ? ', by the source’s priority band (Critical, High, Medium, Low)' : '') + (scored ? (banded ? ' and its score within a band' : ', by the source’s score') : '') + ', then the others by their priority (Must, Should, Could) and the priority of the drivers linked to them' : 'ranked by priority (Must, Should, Could), then by the priority of the quality drivers linked to them; the source carries no delivery assessment, band or score';
  return {ranked, basis};
}
const EXEC_PARTS = {all: ['what', 'requirements', 'drivers', 'decisions', 'shape', 'runtime', 'protection', 'risks'], delivery: ['what', 'requirements', 'shape', 'interfaces', 'runtime', 'risks', 'obligations'], review: ['what', 'requirements', 'drivers', 'decisions', 'protection', 'risks']};
function executiveEdition(p, {audience = 'all', meta = {}, figures = true, baselineId = null} = {}) {
  editionBuilds.executive++;
  const S = documentStatus(p, meta), prov = provenanceReading(p), n = p.finalReview?.narrative || {}, name = solutionName(p), codes = driverCodes(p);
  const reqs = reviewRequirements(p), groups = requirementGroups(p), G = groupIndex(p);
  let out = '<!-- aiw:cover -->\n# ' + md(name.toUpperCase()) + ' · Executive edition\n\nSolution Design Document · ' + S.line + ' · Date: ' + S.date + ' · ' + AUDIENCE_LABEL[audience] + '\n<!-- aiw:/cover -->\n\n';
  const owner = String(n.owner || '').trim(), aud = String(n.audience || '').trim(), said = v => v && !/^(?:unassigned|unknown|tbd|not stated)\b/i.test(v);
  out += '## Document control\n\nOwner: ' + (said(owner) ? md(owner) : 'open: owner not stated') + ' · Audience: ' + (said(aud) ? md(aud) : 'open: audience not stated') + ' · Approvals: ' + (S.approvals.length ? S.approvals.map(x => x.b.id + ' ' + x.g.outcome.toLowerCase()).join('; ') + '; this working draft is not approved' : 'none recorded') + '.\n\nProvenance: ' + prov.line + (prov.detail ? ' ' + prov.detail : '') + '\n\nA two-page reading of the architecture edition, assembled by rule from the saved records; every statement names the records it rests on. Nothing here establishes implementation, external approval or production readiness.\n\n';
  const part = {
    what: () => {
      const summary = String(n.summary || '').trim(), problem = String(p.brief?.problem || '').trim().split(/\n\s*\n/)[0] || '';
      const states = {}; for (const r of reqs) { const s = delivery(r); if (s) states[s] = (states[s] || 0) + 1; }
      return '## What the solution is\n\n' + (summary ? md(summary) : problem ? 'As the brief puts it: ' + md(clip(problem, 900)) + (problem.length > 900 ? ' (the architecture edition’s section 1 carries the brief)' : '') : 'open: summary not stated — the SDD narrative has no summary and the brief no problem yet.') + '\n\n' + (reqs.length ? sentence(plural(reqs.length, 'requirement') + ' in scope' + (groups.length ? ', in ' + plural(groups.length, 'requirement group') : '') + (Object.keys(states).length ? '; the source assessment says ' + Object.entries(states).sort((a, b) => b[1] - a[1]).map(([s, k]) => k.toLocaleString('en-GB') + ' ' + md(s).toLowerCase()).join(', ') : '')) + '\n\n' : 'No requirement is recorded yet.\n\n');
    },
    requirements: () => {
      if (!reqs.length) return '';
      const {ranked, basis} = rankRequirements(p), top = ranked.slice(0, 5), gid = id => (G.of.get(id) || [])[0];
      return '## The requirements that matter most\n\nThe five that matter most, ' + basis + ':\n\n' + bullets(top.map(r => r.id + (r.externalId ? ' (' + md(r.externalId) + ')' : '') + ' · ' + md(clip(r.title, 150)) + ' — ' + [delivery(r) ? md(delivery(r)).toLowerCase() : '', r.assessment?.priorityBand ? 'band ' + md(r.assessment.priorityBand) : '', scoreOf(r) >= 0 ? 'score ' + scoreOf(r) : '', r.priority ? r.priority : 'priority not stated', gid(r.id) ? 'in ' + gid(r.id) : ''].filter(Boolean).join(', '))) + '';
    },
    drivers: () => {
      const ds = [...(p.quality?.drivers || [])].sort((a, b) => priorityRank('driver', driverPriority(a)) - priorityRank('driver', driverPriority(b)) || (a.rank ?? 0) - (b.rank ?? 0) || a.id.localeCompare(b.id));
      if (!ds.length) return '## The drivers that matter most\n\nNo architectural driver is recorded yet.\n\n';
      return '## The drivers that matter most\n\n' + sentence(plural(ds.length, 'driver') + ' guide the design (' + DRIVER_KINDS.map(k => [k, ds.filter(d => driverKind(d) === k.id).length]).filter(([, c]) => c).map(([k, c]) => c + ' ' + k.name.toLowerCase()).join(', ') + '); the first five by priority:') + '\n\n' + bullets(ds.slice(0, 5).map(d => (codes.get(d.id) || d.id) + ' · ' + md(clip(d.title, 100)) + ' (' + (driverPriority(d) || 'priority not stated') + ')' + (isQualityDriver(d) ? ': ' + (targetWords(d).text ? md(targetWords(d).text) : 'target not stated') : d.impact ? ': ' + md(clip(d.impact, 160)) : '')));
    },
    decisions: () => {
      const ds = p.decisions?.records || [];
      if (!ds.length) return '## Decisions\n\nNo architecture decision is recorded yet.\n\n';
      const open = ds.filter(d => d.status !== 'superseded' && !chosen(d));
      // Round 25 (D-25-07): beside the choice, the drivers' lean where the decision has none or its choice does not lead,
      // as the architecture edition's decision log says it (sdd-architecture.js leanWords), and once whose reading it is.
      const rows = ds.map(d => { const c = chosen(d), cat = decisionCategory(d), lean = leanWords(p, d, id => codes.get(id) || id); return {lean, line: '| ' + d.id + ' | ' + mdCell(clip(d.question, 110)) + ' | ' + (cat ? DECISION_CATEGORIES.find(x => x.id === cat).name : 'Additional (not stated)') + ' | ' + mdCell(statusLabel(d)) + ' | ' + (c ? c.id + ' ' + mdCell(clip(c.title, 60)) + (d.status === 'accepted' ? '' : ' (working choice)') : 'open') + (lean ? '; ' + lean : '') + ' |'}; });
      return '## Decisions\n\n' + sentence(plural(ds.length, 'decision') + ' ' + (ds.length === 1 ? 'is' : 'are') + ' recorded; ' + (open.length ? open.length + ' ' + (open.length === 1 ? 'is' : 'are') + ' open: ' + refList(open.map(d => d.id)) : 'each has a working choice')) + '\n\n| Decision | Question | Category | Status | Choice |\n| --- | --- | --- | --- | --- |\n' + rows.map(x => x.line).join('\n') + '\n\n' + (rows.some(x => x.lean) ? 'Where the table names the drivers’ lean, a tie, a hard constraint a choice breaks or an alternative that dominates it, that is AIW’s reading of the recorded effects at the default weights (' + DEFAULT_WEIGHTS + '), not a choice; the architecture edition’s trade-off analysis shows the arithmetic.\n\n' : '');
    },
    shape: () => {
      // Counted from the readers (GR-SDD-27): who holds what (sdd-c4.js c4Reading), not the diagrams the architecture edition draws.
      const cs = p.realisation?.components || [], rs = p.logical?.responsibilities || [], C = c4Reading(p);
      if (!cs.length) return '## The shape\n\nNo application component is recorded yet.\n\n';
      return '## The shape\n\n' + sentence(plural(rs.length, 'responsibility', 'responsibilities') + ' are allocated to ' + plural(cs.length, 'application component') + ' (' + refList(cs.map(refOf)) + ')' + (C.containers.length ? ', running in ' + plural(C.containers.length, 'container') + ' (' + refList(C.containers.map(k => k.ref || k.id)) + ')' : '') + (C.unplaced.length ? '; ' + C.unplaced.length + ' run in no container yet' : '') + '. Section 4 of the architecture edition specifies each and section 5 draws them') + '\n\n';
    },
    interfaces: () => {
      const cs = p.interfaces?.contracts || [], ds = p.interfaces?.data || [], xs = p.interfaces?.parties || [];
      return '## Interfaces and data\n\n' + (cs.length || ds.length ? sentence(plural(cs.length, 'interface contract') + (cs.length ? ' (' + refList(cs.map(refOf)) + ')' : '') + ', ' + plural(ds.length, 'data definition') + ' and ' + plural(xs.length, 'external party', 'external parties') + ' are recorded') : 'No interface contract or data definition is recorded yet.') + '\n\n';
    },
    runtime: () => {
      const envs = p.runtime?.environments || [], plans = p.runtime?.plans || [];
      if (!envs.length) return '## Where it runs\n\nNo environment is recorded yet.\n\n';
      const avail = plans.map(r => ({r, a: planOperation(p, r).availability})).filter(x => x.a);
      return '## Where it runs\n\n' + sentence(plural(envs.length, 'environment') + ' (' + refList(envs.map(refOf)) + ') and ' + plural(plans.length, 'runtime plan') + ' are recorded; ' + (avail.length ? plural(avail.length, 'plan') + ' state' + (avail.length === 1 ? 's' : '') + ' an availability target (' + refList(avail.map(x => refOf(x.r)), 6) + ')' : 'no plan states an availability target yet')) + '\n\n';
    },
    protection: () => {
      const ts = p.security?.threats || [], cs = p.security?.controls || [];
      if (!ts.length && !cs.length) return '## What protects it\n\nNo threat or control is recorded yet.\n\n';
      const by = {}; for (const t of ts) { const k = t.priority || 'not stated'; by[k] = (by[k] || 0) + 1; }
      const bare = ts.filter(t => !cs.some(c => (c.threatIds || []).includes(t.id)));
      return '## What protects it\n\n' + sentence(plural(ts.length, 'threat') + ' (' + Object.entries(by).map(([k, c]) => c + ' ' + k).join(', ') + ') and ' + plural(cs.length, 'control') + ' are recorded' + (bare.length ? '; ' + plural(bare.length, 'threat') + ' ' + (bare.length === 1 ? 'has' : 'have') + ' no control linked (' + refList(bare.map(refOf), 6) + ')' : '; every threat has a control linked') + '. A planned control is a design intent until evidence shows it works') + '\n\n';
    },
    risks: () => {
      // Risks (GR-SDD-22): the recorded threats count as security risks by priority, beside the risk records; the most
      // important list ranks critical threats and critical delivery gaps before the checks to fix and to confirm.
      const C = openCounts(p), ts = p.security?.threats || [], risks = p.security?.risks || [], cs = p.security?.controls || [], by = {};
      for (const t of ts) { const k = t.priority || 'not stated'; by[k] = (by[k] || 0) + 1; }
      const gaps = reqs.filter(isGap), critical = gaps.filter(r => bandRank(r) === 0), groupOfGap = new Map();
      for (const r of critical) for (const g of G.of.get(r.id) || []) groupOfGap.set(g, (groupOfGap.get(g) || 0) + 1);
      let o = '## Risks and open items\n\n' + '| Measure | Count |\n| --- | --- |\n| Security risks: recorded threats by priority | ' + (ts.length ? ts.length + ' (' + ['Critical', 'High', 'Moderate', 'Low', 'not stated'].filter(k => by[k]).map(k => by[k] + ' ' + k).join(', ') + ')' : '0') + ' |\n| Risk assessments recorded against threats | ' + risks.length + ' |\n| Delivery gaps (source assessment) | ' + gaps.length + (critical.length ? ' (' + critical.length + ' Critical)' : '') + ' |\n| Findings to fix | ' + (C ? C.toFix : 'counted on the Output tab') + ' |\n| Items to confirm | ' + (C ? C.toConfirm : 'counted on the Output tab') + ' |\n| Proposals by AIW awaiting a person | ' + seededRecords(p).length + ' |\n\n';
      const top = [];
      for (const t of ts.filter(t => t.priority === 'Critical')) top.push(refOf(t) + ' · ' + md(clip(t.title, 90)) + ' — critical threat' + (cs.some(c => (c.threatIds || []).includes(t.id)) ? ', controls linked' : ', no control linked'));
      for (const [g, k] of [...groupOfGap].sort((a, b) => b[1] - a[1])) { const grp = groups.find(x => x.id === g); top.push((grp ? groupLabel(p, grp) : g) + ' — ' + plural(k, 'critical delivery gap')); }
      for (const t of ts.filter(t => t.priority === 'High')) top.push(refOf(t) + ' · ' + md(clip(t.title, 90)) + ' — high threat' + (cs.some(c => (c.threatIds || []).includes(t.id)) ? ', controls linked' : ', no control linked'));
      for (const r of (C?.rules || []).filter(x => x.level === 'fix').sort((a, b) => b.count - a.count)) top.push('Chapter ' + r.chapter + ' · ' + md(clip(r.title, 90)) + ' — ' + plural(r.count, 'finding') + ' to fix');
      for (const r of (C?.rules || []).filter(x => x.level === 'confirm').sort((a, b) => b.count - a.count)) top.push('Chapter ' + r.chapter + ' · ' + md(clip(r.title, 90)) + ' — ' + plural(r.count, 'item') + ' to confirm');
      o += top.length ? 'The ten most important, critical threats and critical gaps before the checks to fix and to confirm:\n\n' + top.slice(0, 10).map((x, i) => (i + 1) + '. ' + x).join('\n') + '\n\n' : 'Nothing is open.\n\n';
      return o;
    },
    obligations: () => {
      const acts = p.finalReview?.actions || [];
      return '## Delivery obligations\n\n' + (acts.length ? bullets(acts.map(a => a.id + ' · ' + md(clip(a.title, 110)) + ' — ' + (a.owner ? 'owner ' + md(a.owner) : 'open: owner') + ', ' + (a.due ? 'due ' + a.due : 'open: due date') + ', ' + String(a.status || 'Planned').toLowerCase()), {rest: k => 'And ' + plural(k, 'more obligation') + ' in the architecture edition for the delivery team.'}) : 'No delivery obligation is recorded yet.\n\n');
    }
  };
  const code = figures === 'mermaid' ? 'mermaid' : null;
  const context = figures ? kept(p, 'sdd:executive-context', JSON.stringify([baselineId, code]), fingerprint => {
    const D = c4Diagrams(p).context;
    if (!D?.nodes.length) return figureSet(p, [], [{chapter: 1, scene: 'context', title: 'Context', reason: 'No saved system context can be drawn yet.'}], fingerprint, code);
    const drawn = levelFigures(p, D, {key: 'context', level: 'context', scene: C4_SCENES.context, chapter: 1, first: 1, details: 0, baselineId, code});
    return figureSet(p, drawn.figures, [], fingerprint, code);
  }) : null;
  for (const k of EXEC_PARTS[audience]) {
    out += part[k]();
    if (k === 'what' && context?.figures.length) out += '## System context\n\n' + context.figures.map(f => { const block = code ? mermaidBlock(f) : figureBlock(f); return f.print?.orientation === 'landscape' ? '<!-- aiw:landscape -->\n'+block+'\n<!-- aiw:/landscape -->' : block; }).join('\n\n') + '\n\n';
  }
  const review = latestDesignReview(p);
  out += '## Boundary\n\nThis edition is derived from the working project by rule' + (review ? '; the latest architect review is ' + review.id + ' (' + review.outcome + ')' : '') + '. Rule-based checks do not replace implementation or operational evidence; external approval is recorded separately against a frozen baseline.\n';
  const markdown = out.replace(/\n{3,}/g, '\n\n'), slug = slugger();
  // Its structure, as the architecture edition gives its own: each heading with its level and anchor.
  const sections = markdown.split('\n').map(l => /^(#{1,6}) (.+)$/.exec(l)).filter(Boolean).map(m => ({level: m[1].length, title: unescapeMd(m[2]), anchor: slug(m[2])}));
  return {edition: 'executive', audience, markdown, sections, figures: context, openItems: {checks: openCounts(p)}, provenance: {line: prov.line, detail: prov.detail, by: prov.by, confirmed: prov.confirmed, total: prov.total}, status: S, changes: null};
}

// ---------------------------------------------------------------- the one entry point
// An edition is assembled in one pass over the document (document-memo.js): the checks, indexes and figure sets it reads
// more than once are worked out once. Nothing here changes the document.
export function sddDocument(p, {edition = 'architecture', audience = 'all', meta = {}, baselineId = null, figures = true, details = null} = {}) {
  if (edition === 'full') edition = 'architecture';
  if (!SDD_EDITIONS.includes(edition) || !SDD_AUDIENCES.includes(audience)) throw Error('Choose an edition and an audience the SDD offers.');
  if (!SDD_FIGURES.includes(figures)) throw Error('Figures are drawn as SVG, left out, or written as Mermaid.');
  return memoPass(p, () => (edition === 'executive' ? executiveEdition(p, {audience, meta, figures, baselineId}) : architectureEdition(p, {audience, meta, baselineId, figures, details})));
}
export const sddMarkdown = (p, options) => sddDocument(p, options).markdown;
// Whether a Markdown text is the Mermaid edition: a figure line followed by its fence, as mermaidBlock writes them.
export const MERMAID_EDITION = /^\*\*Figure \d+ · [^\n]*\*\*\n\n```mermaid\n/m;
export const isMermaidEdition = markdown => MERMAID_EDITION.test(String(markdown ?? ''));
// What the JSON export carries (SDD-SPEC formats): the edition, its structure (each heading with its level and anchor),
// the figure manifest, the open items, the content reading (sdd-content.js, round 12 C2: the architecture edition
// only), the provenance and the status; the project document only when asked.
export function sddPackage(p, doc) {
  return {edition: doc.edition, audience: doc.audience, status: doc.status ? {version: doc.status.version, status: doc.status.status, date: doc.status.date} : null, provenance: doc.provenance || null,
    structure: (doc.sections || []).map(s => ({level: s.level, title: s.title, anchor: s.anchor})),
    figures: doc.figures ? {schema: doc.figures.schema, code: doc.figures.code || null, documentFingerprint: doc.figures.documentFingerprint, manifest: doc.figures.manifest.map((m, i) => ({...m, n: doc.figures.figures[i].n, key: doc.figures.figures[i].key || null, caption: doc.figures.figures[i].caption})), omitted: doc.figures.omitted} : null,
    openItems: doc.openItems, content: doc.content || null, changesSinceBaseline: doc.changes || null};
}
export {unescapeMd, LIST_MAX};
// A freeze keeps the architecture edition for everyone, with its figures drawn from the frozen source (review-domain.js
// registerSDDBuilder), the document and that source each read in one pass (GR-PERF-11: the figures drawn outside a pass
// took minutes at size); a pass changes no byte of what is frozen.
registerSDDBuilder((p, meta) => { const source = figureSourceOf(reviewSource(p)); return memoPass(p, () => memoPass(source, () => architectureEdition(p, {audience: 'all', meta, baselineId: meta?.id || null, figureProject: source}).markdown)); });
