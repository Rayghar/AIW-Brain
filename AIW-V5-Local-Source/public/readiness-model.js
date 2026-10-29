// SDD readiness — what stands between the design and a reviewable solution design document.
//
// Every chapter already records its own checks (content gaps and review items) and milestones,
// and Chapter 11 decides which content gaps still block the SDD. This reads them together, as one
// line across the journey. Pure: it reads the records the chapters keep and never writes.
import {chapterSummaries, reviewBlockers, finalFindings, finalMilestones, CHAPTERS, inheritedFindings, chapterInheritedFindings, findingTreatment, latestDisposition, reviewObjects, reviewSourceUrl, reviewCapacity, finalChecksCurrent, registerOpenCounts} from './review-domain.js';
import {arsGate} from './ars-document.js';
import {qualityReviewCurrent} from './quality-domain.js';
import {decisionReviewCurrent} from './decisions-domain.js';
import {logicalReviewCurrent} from './logical-domain.js';
import {realisationReviewCurrent} from './realisation-domain.js';
import {technologyReviewCurrent} from './technology-domain.js';
import {realizationReviewCurrent} from './technology-realisation-domain.js';
import {interfaceReviewCurrent} from './interfaces-domain.js';
import {securityReviewCurrent} from './security-domain.js';
import {runtimeReviewCurrent} from './runtime-domain.js';
import {esc} from './html-escape.js';
import {plural, checkCode} from './util.js';
import {memoPass, passValue, firstById, memoOff} from './document-memo.js';
import {plateausOf, plateauReadiness, registerRecordReadiness} from './roadmap-domain.js';
import {lensPassage} from './domain-lens.js';
import {requirementGroups} from './requirement-groups.js';
import {moduleTree} from './module-model.js';
import {causeSentence} from './requirement-commands.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_SHORT} from './chapter-names.js';

// Links keep the project in the address, as project-context.js projectURL does. The project is read when a link is
// made, not imported: shared/projects-domain.js loads this module where there is no page address yet (the Worker,
// and suites before they set one), and project-context.js fixes the project and migrates the stored preferences once,
// on its own import, so importing it from here pinned the reference project for the rest of such a run.
function projectURL(path) {
  // Every caller here supplies a rooted internal route. In the Worker there is no page or project query to carry;
  // the route is already the exact pathname, search and hash that URL would return. This is read for every passage.
  if (typeof location === 'undefined' && path.startsWith('/')) return path;
  const page = typeof location === 'undefined' ? null : location, url = new URL(path, page ? page.origin : 'http://aiw.local');
  const id = page ? new URLSearchParams(page.search).get('project') : null;
  if (id && id !== 'bank-payment') url.searchParams.set('project', id);
  return url.pathname + url.search + url.hash;
}

// Short forms of the one chapter naming set (the shell's CHAPTER titles in app.js), for the readiness tiles (U2-26).
export const SHORT = CHAPTER_SHORT;
// Whether the project holds any record beyond its brief. Until it does, nothing can "block": the findings are
// what there is to do (U2-05).
export function projectHasRecords(p) {
  if (!p) return false;
  const lists = [p.artefacts, p.quality?.drivers, p.quality?.conflicts, p.decisions?.records, p.logical?.responsibilities, p.logical?.groups, p.realisation?.components, p.technology?.capabilities, p.technologyRealisation?.records, p.interfaces?.contracts, p.interfaces?.data, p.security?.controls, p.security?.threats, p.runtime?.placements, p.runtime?.environments, p.finalReview?.actions];
  return lists.some(list => Array.isArray(list) && list.length > 0);
}

export function sddReadiness(p) { return memoPass(p, () => sddReadinessOf(p)); }
function sddReadinessOf(p) {
  const sums = chapterSummaries(p), open = reviewBlockers(p), by = {};
  for (const f of open) by[f.chapter] = (by[f.chapter] || 0) + 1;
  const chapters = sums.map(c => {
    const blockers = by[c.id] || 0;
    return {id: c.id, title: c.title, short: SHORT[c.id], gaps: c.errors, review: c.warnings, done: c.done, total: c.total, blockers, treated: c.errors - blockers,
      state: blockers ? 'gaps' : c.errors ? 'treated' : c.warnings ? 'review' : c.done === c.total ? 'clear' : 'open'};
  });
  const ff = finalFindings(p), fm = finalMilestones(p), fe = ff.filter(f => f.level === 'error').length;
  chapters.push({id: 11, title: 'Review & realize', short: SHORT[11], gaps: fe, review: ff.length - fe, done: fm.filter(m => m.done).length, total: fm.length, blockers: fe, treated: 0,
    state: fe ? 'gaps' : ff.length ? 'review' : fm.every(m => m.done) ? 'clear' : 'open', final: true});
  const source = chapters.filter(c => !c.final), gaps = source.reduce((n, c) => n + c.gaps, 0), treated = gaps - open.length;
  const done = chapters.reduce((n, c) => n + c.done, 0), total = chapters.reduce((n, c) => n + c.total, 0), withGaps = source.filter(c => c.blockers).length;
  const started = projectHasRecords(p);
  // Round 12 (G, GR-UX-14): in the one vocabulary (checkWords, U2-05): findings "to fix", never "blocking".
  const summary = !started
    ? `${plural(open.length, 'thing', 'things')} to do in ${plural(withGaps, 'chapter', 'chapters')} before this design can be reviewed as an SDD. Nothing is recorded yet; the findings say what to add.`
    : open.length
    ? `${plural(open.length, 'finding', 'findings')} to fix in ${plural(withGaps, 'chapter', 'chapters')} stand${open.length === 1 ? 's' : ''} between this design and a reviewable SDD.${treated ? ' ' + treated + ' more ' + (treated === 1 ? 'is' : 'are') + ' treated in Chapter 11.' : ''}`
    : gaps ? `Every finding to fix is repaired or treated in Chapter 11; ${done} of ${total} milestones are met.` : `No finding is left to fix for the SDD; ${done} of ${total} milestones are met.`;
  // The plateaus' readiness (roadmap-domain.js, round 6): an empty list without plateaus; no count above changes.
  return {chapters, blockers: open.length, gaps, treated, done, total, withGaps, summary, started, ready: !open.length && !fe && fm.every(m => m.done), plateaus: plateauReadiness(p)};
}

// The first milestone not yet met, in journey order: what a project card names as next (round 2, I2-23).
export function nextMilestone(p) {
  for (const c of CHAPTERS) { let ms = []; try { ms = c.milestones(p); } catch { ms = []; } const m = ms.find(x => !x.done); if (m) return {chapter: c.id, name: m.name}; }
  const m = finalMilestones(p).find(x => !x.done);
  return m ? {chapter: 11, name: m.name} : null;
}

// ---------------------------------------------------------------- the chapter's checks, as SDD passages (round 3, C)
// Validate checks and Output documents read the same thing: what a chapter puts in the solution design document.
// Each record a chapter keeps is a passage of its register in the SDD ("Detailed chapter registers"); the chapter as a
// whole (its inputs and handoff) is one more. A passage is to fix while a content gap on it is untreated, to confirm
// while a review item on it is open, and passing otherwise. The words are the same everywhere and never "blocking":
// before the project holds a record the findings are simply what there is to do (U2-05). Rule-based: it reads the
// chapters' own checks and Chapter 11's treatments, and approves nothing.
export const CHECK_WORDS = {pass: 'passing', fix: 'to fix', confirm: 'to confirm'};
// Every count names what it counts (round 12, G, GR-UX-02), in the SDD's words (sddOpenCounts: "Findings to fix", "Items
// to confirm"): a chapter's findings to fix and items to confirm, Chapter 11's own final checks, the SDD passages a
// chapter fills, and records. One reader for every screen that counts: counted("3,396 findings to fix").
export const COUNT_UNITS = Object.freeze({fix: ['finding to fix', 'findings to fix'], confirm: ['item to confirm', 'items to confirm'], finalFix: ['final check to fix', 'final checks to fix'], finalConfirm: ['final check to confirm', 'final checks to confirm'], finalCheck: ['final check', 'final checks'], passage: ['SDD passage', 'SDD passages'], record: ['record', 'records'], finding: ['finding', 'findings']});
const fmtCount = n => (Number(n) || 0).toLocaleString('en-GB');
export const counted = (n, unit) => { const k = Number(n) || 0, [one, many] = COUNT_UNITS[unit]; return k.toLocaleString('en-GB') + ' ' + (k === 1 ? one : many); };
// The unit a chapter's to-fix and to-confirm counts are in: Chapter 11 counts its final checks.
export const checkUnits = chapter => (Number(chapter) === 11 ? {fix: 'finalFix', confirm: 'finalConfirm'} : {fix: 'fix', confirm: 'confirm'});
export const CHECK_GLYPHS = {pass: '✓', fix: '✕', confirm: '○'};
const recordsOf = (xs, kind, title = r => r.title) => (Array.isArray(xs) ? xs : []).map(r => ({id: r.id, ref: r.ref || r.id, title: title(r) || '', kind}));
const RECORDS = {
  1: p => [{id: 'brief', ref: 'Brief', title: 'Project brief', kind: 'brief'}, ...recordsOf(p.artefacts, null).map((r, i) => ({...r, kind: p.artefacts[i].type || 'record'}))],
  2: p => recordsOf(p.quality?.drivers, 'quality driver'),
  3: p => recordsOf(p.decisions?.records, 'decision', r => r.question),
  4: p => recordsOf(p.logical?.responsibilities, 'responsibility'),
  5: p => recordsOf(p.realisation?.components, 'application component'),
  6: p => recordsOf(p.technology?.capabilities, 'technology capability'),
  7: p => recordsOf(p.technologyRealisation?.records, 'technology realization'),
  8: p => [...recordsOf(p.interfaces?.contracts, 'interface contract'), ...recordsOf(p.interfaces?.data, 'data object')],
  9: p => [...recordsOf(p.security?.threats, 'threat'), ...recordsOf(p.security?.controls, 'control')],
  10: p => [...recordsOf(p.runtime?.environments, 'environment'), ...recordsOf(p.runtime?.plans, 'runtime plan')]
};
// The journey draft (round 4, Contract 3): a chapter with no record of its own can be drafted from the journey once
// what it is drafted from exists — the brief for Chapter 1, the records of the chapter before it otherwise — and its
// next action then says so. A record the journey drafted (provenance.journey, which a person's later edit keeps,
// marked edited) is to confirm while it is not confirmed: confirmed:false, or for a record type with no confirmation
// flag, a status that is not yet accepted. Rule-based, like everything here.
const SOURCES = {2: p => p.artefacts?.filter(a => a.type === 'requirement'), 3: p => p.quality?.drivers, 4: p => p.artefacts?.filter(a => a.type === 'requirement'), 5: p => p.logical?.responsibilities, 6: p => p.realisation?.components, 7: p => p.technology?.capabilities, 8: p => p.realisation?.components, 9: p => [...(p.interfaces?.contracts || []), ...(p.interfaces?.data || [])], 10: p => p.realisation?.components};
const has = xs => Array.isArray(xs) && xs.length > 0;
export const JOURNEY_DRAFT_TEXT = 'Draft this chapter from the journey';
// Round 12 (D-10, DRF-17): one predicate decides how a project is drafted, on every surface. A project whose
// requirements were imported, or that keeps requirement groups, is drafted by requirement group as one architecture
// draft (the drafting job, architecture-drafter.js): the chapter-by-chapter journey draft is not offered there, and
// every surface says why. A project of a brief or a model keeps the journey draft. draftOffer is what a surface shows.
export const GROUPED_DRAFT_TEXT = 'Draft the architecture from the requirement groups';
export const draftsByGroup = p => !!p && ((p.artefacts || []).some(a => a?.type === 'requirement' && a.provenance?.datasetId) || requirementGroups(p).some(g => /^RG-\d+$/.test(g.id)));
export function groupedDraftReason(p) {
  const n = (p?.artefacts || []).filter(a => a?.type === 'requirement').length, g = requirementGroups(p).filter(x => /^RG-\d+$/.test(x.id)).length;
  return `This project's ${n.toLocaleString('en-GB')} requirement${n === 1 ? '' : 's'} ${(p?.artefacts || []).some(a => a?.provenance?.datasetId) ? 'were imported' : 'are held'}${g ? ` in ${g.toLocaleString('en-GB')} requirement group${g === 1 ? '' : 's'}` : ''}: Sol drafts its architecture from the groups as one draft you preview and apply, not chapter by chapter from the brief.`;
}
export const groupedDraftURL = () => projectURL('/?chapter=1&tab=work&journey=draft&draft=architecture');
// What a chapter's surfaces offer: the architecture draft of a grouped project (from any chapter, while its chapters
// are not yet drafted), else the chapter's journey draft, else nothing; with the reason a journey draft is not offered.
// A grouped project's draft is offered on Chapter 1 and on any of Chapters 2-10 that holds no record yet.
export function groupedDraftable(p, chapter) {
  chapter = Number(chapter);
  if (!draftsByGroup(p)) return false;
  if (chapter === 1) return true;
  try { return chapter >= 2 && chapter <= 10 && !has(RECORDS[chapter](p).filter(r => r.id !== 'brief')); } catch { return false; }
}
export function draftOffer(p, chapter) {
  if (!p) return {kind: null, text: '', url: '', reason: ''};
  if (draftsByGroup(p)) return groupedDraftable(p, chapter) ? {kind: 'grouped', text: GROUPED_DRAFT_TEXT, url: groupedDraftURL(), reason: groupedDraftReason(p)} : {kind: null, text: '', url: '', reason: groupedDraftReason(p)};
  return journeyDraftable(p, chapter) ? {kind: 'journey', text: JOURNEY_DRAFT_TEXT, url: journeyDraftURL(chapter), reason: ''} : {kind: null, text: '', url: '', reason: ''};
}
export function journeyDraftable(p, chapter) {
  chapter = Number(chapter);
  if (!p) return false;
  // A grouped project is drafted as one architecture draft, never chapter by chapter (draftsByGroup).
  if (draftsByGroup(p)) return false;
  if (chapter === 1) return !has(p.artefacts) && (!!String(p.brief?.problem || p.brief?.text || '').trim() || (p.coauthoring?.sources || []).some(s => s?.kind === 'model' && String(s.text || '').trim()));
  if (chapter === 11) { const n = p.finalReview?.narrative || {}; return projectHasRecords(p) && ![n.summary, n.scope, n.approach].some(v => String(v || '').trim()); }
  try { return !!SOURCES[chapter] && !has(RECORDS[chapter](p).filter(r => r.id !== 'brief')) && has(SOURCES[chapter](p)); } catch { return false; }
}
export const journeyDraftURL = chapter => projectURL('/?chapter=' + chapter + '&tab=work&journey=draft');
const unconfirmed = r => r.confirmed === false || (r.confirmed === undefined && !/^(?:accepted|approved|confirmed|verified|chosen|decided|active)$/i.test(String(r.status || '')));
const drafted = r => !!r?.provenance?.journey && unconfirmed(r);
const DRAFTED = {title: 'Confirm the drafted record', detail: 'Drafted from the brief by the journey; nobody has confirmed it yet.', level: 'warning'};
const recordsById = p => new Map([...(p.artefacts || []), ...(p.quality?.drivers || []), ...(p.decisions?.records || []), ...(p.logical?.responsibilities || []), ...(p.realisation?.components || []), ...(p.technology?.capabilities || []), ...(p.technologyRealisation?.records || []), ...(p.interfaces?.contracts || []), ...(p.interfaces?.data || []), ...(p.security?.threats || []), ...(p.security?.controls || []), ...(p.runtime?.environments || []), ...(p.runtime?.plans || [])].map(r => [r.id, r]));
// Findings about a part of a record (a Chapter 10 placement or path) belong to the record that holds it.
const PARENTS = {10: p => new Map([...(p.runtime?.placements || []).map(x => [x.id, x.planId]), ...(p.runtime?.paths || []).map(x => [x.id, x.environmentId])])};
// When a chapter last ran its checks, and whether that run still matches what is recorded.
const RUNS = {
  1: p => [p.review, p.review?.contentVersion === p.contentVersion],
  2: p => [p.quality?.review, qualityReviewCurrent(p)],
  3: p => [p.decisions?.review, decisionReviewCurrent(p)],
  4: p => [p.logical?.review, logicalReviewCurrent(p)],
  5: p => [p.realisation?.review, realisationReviewCurrent(p)],
  6: p => [p.technology?.review, technologyReviewCurrent(p)],
  7: p => [p.technologyRealisation?.review, realizationReviewCurrent(p)],
  8: p => [p.interfaces?.review, interfaceReviewCurrent(p)],
  9: p => [p.security?.review, securityReviewCurrent(p)],
  10: p => [p.runtime?.review, runtimeReviewCurrent(p)],
  11: p => [p.finalReview?.checks, finalChecksCurrent(p)]
};
const OPEN = ['Needs assessment', 'Fix before review', 'Action needs review'];
const workURL = (chapter, id) => projectURL(reviewSourceUrl(chapter, id, 'work'));
function passage(chapter, rec, extra = {}) { return {chapter, id: rec.id, ref: rec.ref, title: rec.title, kind: rec.kind, fix: [], confirm: [], treated: [], url: workURL(chapter, rec.id === 'project' ? null : rec.id), ...extra}; }
function settle(x) { x.status = x.fix.length ? 'fix' : x.confirm.length ? 'confirm' : 'pass'; x.missing = x.fix.map(f => f.title + (f.detail ? ': ' + f.detail : '')); return x; }
function lastRun(p, chapter) { try { const [r, current] = RUNS[chapter](p); return {at: r?.at || null, current: !!r && !!current}; } catch { return {at: null, current: false}; } }
// Chapters 1–10: the chapter's records and the chapter as a whole, with the chapter's own findings placed on them.
function sourcePassages(p, chapter) {
  const c = CHAPTERS.find(x => x.id === chapter), recs = RECORDS[chapter](p), byId = new Map(), parents = PARENTS[chapter]?.(p) || new Map();
  const whole = passage(chapter, {id: 'project', ref: 'Chapter ' + chapter, title: c.title + ' as a whole: inputs, handoff and register', kind: ''});
  // The records by id, the inherited findings by chapter and the review's objects by id are worked out once for the
  // pass over the document that the board's eleven chapters share (round 5, R5-G); the same records, in the same order.
  const own = passValue(p, 'readiness:records', () => recordsById(p));
  for (const r of recs) { const x = passage(chapter, r); if (drafted(own.get(r.id))) x.confirm.push({id: 'journey:' + r.id, ...DRAFTED}); byId.set(r.id, x); }
  const foreign = new Map(), objects = () => (objects.byId ||= passValue(p, 'readiness:objects', () => firstById(reviewObjects(p))));
  // The chapter's own findings only (review-domain.js chapterInheritedFindings): the Model, Output and Validate of one
  // chapter no longer work out every chapter's checks to draw its passages.
  const hasTreatments = !!p.finalReview?.dispositions?.length;
  // Without treatments, a passage only reads the finding's message and target. The inherited wrapper adds an
  // individual source stamp to every finding, which Chapter 11 will not consult until a treatment is recorded.
  // Read the chapter's own checks directly on that path; keep the stamped path for treatment and cache-equivalence.
  const direct = !hasTreatments && !memoOff();
  const inChapter = direct ? c.checks(p) : memoOff() ? inheritedFindings(p).filter(f => f.chapter === chapter && String(f.id).startsWith('C' + chapter + ':')) : chapterInheritedFindings(p, chapter);
  for (const f of inChapter) {
    const objectId = direct ? f.objectId || f.artefactId || f.driverId || f.decisionId || 'project' : f.objectId;
    const oid = parents.get(objectId) || objectId;
    let x = byId.get(oid);
    if (!x && oid !== 'project') {
      if (!foreign.has(oid)) { const o = memoOff() ? reviewObjects(p).find(o => o.id === oid) : objects().get(oid); if (o) foreign.set(oid, passage(chapter, {id: oid, ref: o.ref, title: o.title, kind: 'Chapter ' + o.chapter + ' record, as Chapter ' + chapter + ' reads it'}, {from: o.chapter})); }
      x = foreign.get(oid);
    }
    x ||= whole;
    const item = {id: direct ? 'C' + chapter + ':' + f.id : f.id, title: f.title, detail: f.detail || '', level: f.level};
    if (f.level === 'error') (!hasTreatments || OPEN.includes(findingTreatment(p, f)) ? x.fix : x.treated).push(item);
    else (hasTreatments && latestDisposition(p, f) ? x.treated : x.confirm).push(item);
  }
  return [whole, ...byId.values(), ...foreign.values()].map(settle);
}
// Chapter 11: the passages the review itself writes into the SDD, from its own final checks.
function reviewPassages(p) {
  const m = p.finalReview, n = m?.narrative || {}, fs = finalFindings(p), on = codes => fs.filter(f => codes.some(c => f.code === c || f.code.startsWith(c + '-')));
  const make = (id, ref, title, codes, tab = 'work') => { const x = passage(11, {id, ref, title, kind: ''}, {url: projectURL('/?chapter=11&tab=' + tab)}); for (const f of on(codes)) (f.level === 'error' ? x.fix : x.confirm).push({id: f.id, title: checkWords(f.title), detail: checkWords(f.detail || ''), level: f.level}); return x; };
  // The framing passages are written in Chapter 11's own editor; until a field is filled the SDD prints a placeholder there.
  const blank = (x, fields) => { const missing = fields.filter(([k]) => !String(n[k] || '').trim()).map(([, label]) => label); if (missing.length && !x.fix.length) x.fix.push({id: 'narrative:' + x.id, title: 'Write the ' + missing.join(' and '), detail: 'The SDD prints a placeholder until it is written (Chapter 11 · Work · Frame the SDD).', level: 'error'}); return x; };
  let cap = null; try { cap = reviewCapacity(p); } catch { cap = null; }
  const perf = make('performance', 'Performance specification', 'what the review objective asks of every part', [], 'model');
  if (!cap) perf.confirm.push({id: 'performance:objective', title: 'No load stated: no objective is recorded', detail: 'Set one on the review desk (Chapter 11 · Model · What it takes), or record a scalability driver in Chapter 2.', level: 'warning'});
  // Round 11: the Architecture requirements specification's gate, every driver measurable, verified and carried by a
  // runtime plan (ars-document.js). Each driver that falls short is an item to confirm; the gate informs and blocks nothing.
  const ars = make('specification', 'Architecture requirements specification', 'every driver measurable, verified and carried by a runtime plan', []);
  ars.url = projectURL('/?chapter=2&tab=work');
  let gate = null; try { gate = arsGate(p); } catch { gate = null; }
  for (const it of gate?.items || []) ars.confirm.push({id: it.id, title: it.title, detail: it.detail, level: 'warning'});
  // An empty source cannot establish that a review passage passes. This is an open
  // confirmation, not an invented requirement to create an action or grant approval.
  const emptySource = (x, present, detail) => { if (!present) x.confirm.push({id: 'empty:' + x.id, title: 'Nothing recorded yet', detail, level: 'warning'}); return x; };
  emptySource(ars, (p.quality?.drivers || []).length, 'No architectural driver is recorded. The specification cannot establish coverage until its source is recorded and reviewed.');
  const ownership = make('ownership', 'Document ownership', 'the owner, the audience and the confirmed framing', ['narrative']);
  if (drafted(n)) ownership.confirm.push({id: 'journey:narrative', ...DRAFTED, title: 'Confirm the drafted framing'});
  const list = [
    blank(ownership, [['owner', 'document owner'], ['audience', 'audience and review purpose']]),
    blank(make('summary', 'Executive summary', 'the problem, the approach and what remains open', []), [['summary', 'executive summary']]),
    blank(make('scope', 'Scope and exclusions', 'what the design covers and leaves out', []), [['scope', 'scope and exclusions']]),
    blank(make('approach', 'Architecture approach', 'the approach and its principal trade-offs', []), [['approach', 'architecture approach']]),
    emptySource(make('trace', 'Requirement traceability register', 'each requirement followed to where it runs', ['trace']), (p.artefacts || []).some(a => a.type === 'requirement'), 'No requirement is recorded. Record the requirements before assessing whether their architecture traces are complete.'),
    make('findings', 'Source findings and review treatments', 'every chapter finding and its Chapter 11 treatment', ['intake', 'source-findings', 'change-review']),
    emptySource(make('actions', 'Delivery and verification obligations', 'owned actions and their evidence', ['action', 'delivery', 'verification', 'architecture-obligation']), (m?.actions || []).length || fs.some(f=>f.code==='architecture-obligation'), 'No delivery or verification obligation is recorded. Review whether any are needed; an empty register is not evidence of delivery or verification.'),
    ars,
    perf,
    make('review', 'Architect review', 'the recorded review outcome', ['design-review', 'revision']),
    make('baseline', 'Baseline and governance', 'the frozen SDD and its external governance evidence', ['baseline', 'governance'], 'output')
  ];
  // The Transition section (round 6, Contract S) is a passage only once the roadmap holds a plateau: a project without
  // plateaus has exactly the passages it had. The plan's findings (ROADMAP-*) sit on it, each to confirm.
  if (plateausOf(p).length) list.splice(list.indexOf(ars), 0, make('transition', 'Transition', 'the plateaus, what each introduces and retires, and the actions that get there', ['ROADMAP']));
  // Round 12 (D-14): the domain lens the person chose (domain-lens.js) is a passage after the performance specification,
  // each concern partly or not addressed an item to confirm; it informs and blocks nothing. Without a lens, none.
  let lp = null; try { lp = lensPassage(p); } catch { lp = null; }
  if (lp) { const lens = make(lp.id, lp.ref, lp.title, [], 'validate'); lens.url = projectURL('/?chapter=11&tab=validate#domain-lens'); for (const it of lp.items) lens.confirm.push({...it, level: 'warning'}); list.splice(list.indexOf(perf) + 1, 0, lens); }
  return list.map(settle);
}
// Memoised per saved document: Validate, Output and the readiness board read it several times in one render. Worked
// out in one pass over the document (document-memo.js, round 5): the chapters' checks, the inherited findings and the
// connected graph are worked out once for all of it.
const checksCache = new WeakMap();
export function chapterChecks(p, chapter) {
  chapter = Number(chapter);
  if (!p || !(chapter >= 1 && chapter <= 11)) return null;
  let byChapter = checksCache.get(p); if (!byChapter) { byChapter = new Map(); checksCache.set(p, byChapter); }
  if (byChapter.has(chapter)) return byChapter.get(chapter);
  return memoPass(p, () => chapterChecksOf(p, chapter, byChapter));
}
function chapterChecksOf(p, chapter, byChapter) {
  let passages = [], toFix = 0, toConfirm = 0, treated = 0, milestones = [];
  if (chapter === 11) {
    passages = reviewPassages(p);
    const ff = finalFindings(p); toFix = ff.filter(f => f.level === 'error').length; toConfirm = ff.length - toFix;
    try { milestones = finalMilestones(p); } catch { milestones = []; }
  } else {
    passages = sourcePassages(p, chapter);
    for (const x of passages) { toFix += x.fix.length; toConfirm += x.confirm.length; treated += x.treated.length; }
    try { milestones = CHAPTERS.find(c => c.id === chapter).milestones(p); } catch { milestones = []; }
  }
  const passing = passages.filter(x => x.status === 'pass').length;
  const first = passages.find(x => x.status === 'fix') || passages.find(x => x.status === 'confirm');
  const firstItem = first ? (first.fix[0] || first.confirm[0]) : null, nextMs = milestones.find(m => !m.done);
  const grouped = chapter >= 2 && chapter <= 10 && groupedDraftable(p, chapter);
  // Round 24 (D-24-08): a module structure AIW proposed waits for a person's review and acceptance in Chapter 1.
  const structure = chapter === 1 ? moduleTree(p).state : 'none';
  const next = journeyDraftable(p, chapter) ? {kind: 'draft', text: JOURNEY_DRAFT_TEXT, url: journeyDraftURL(chapter)}
    : structure === 'proposed' || structure === 'mixed' ? {kind: 'confirm', text: 'Review and accept the proposed module structure', url: projectURL('/?chapter=1&tab=work#modules')}
    : grouped ? {kind: 'draft', text: GROUPED_DRAFT_TEXT, url: groupedDraftURL()}
    : firstItem ? {kind: first.status, text: firstItem.title + (first.id === 'project' || chapter === 11 || firstItem.title.includes(first.ref) ? '' : ' · ' + first.ref), url: first.url}
    : nextMs ? {kind: 'milestone', text: nextMs.name, url: projectURL('/?chapter=' + chapter + '&tab=work')} : {kind: 'done', text: 'Nothing to fix or confirm', url: projectURL('/?chapter=' + chapter + '&tab=output')};
  const title = chapter === 11 ? 'Review & realize' : CHAPTERS.find(c => c.id === chapter).title;
  const result = {chapter, title, short: SHORT[chapter], passages, passing, total: passages.length, toFix, toConfirm, treated, milestones: {done: milestones.filter(m => m.done).length, total: milestones.length},
    run: lastRun(p, chapter), next, started: projectHasRecords(p), validateURL: projectURL('/?chapter=' + chapter + '&tab=validate'), state: toFix ? 'fix' : toConfirm ? 'confirm' : 'pass'};
  byChapter.set(chapter, result);
  return result;
}
// Every chapter at once, for Chapter 11's readiness board.
export function sddBoard(p) { return memoPass(p, () => sddBoardOf(p)); }
function sddBoardOf(p) {
  const chapters = [];
  for (let id = 1; id <= 11; id++) { try { chapters.push(chapterChecks(p, id)); } catch (e) { chapters.push({chapter: id, title: SHORT[id], short: SHORT[id], passages: [], passing: 0, total: 0, toFix: 0, toConfirm: 0, treated: 0, failed: e?.message || 'unreadable', next: {kind: 'done', text: 'This chapter could not be read', url: projectURL('/?chapter=' + id + '&tab=validate')}, validateURL: projectURL('/?chapter=' + id + '&tab=validate'), state: 'confirm'}); } }
  const sum = k => chapters.reduce((n, c) => n + (c[k] || 0), 0);
  return {chapters, passing: sum('passing'), total: sum('total'), toFix: sum('toFix'), toConfirm: sum('toConfirm'), treated: sum('treated'), clear: chapters.filter(c => c.state === 'pass').length, started: projectHasRecords(p)};
}
// What is left, counted once (round 12, GR-SDD-18): the board's findings to fix and items to confirm, which the Output
// tab shows and the SDD's At a glance, its risks and its Appendix B print, with the same items grouped by what they say
// (chapter, level and the rule that raised them: the item's id without the record it names): their count, the records
// they sit on, the first title and how many titles and details they carry. Chapter 11's are its final checks, as the
// board counts them.
const ruleOf = id => { const s = String(id || '').split(':'); return s.length >= 3 ? s[0] + ':' + checkCode(s[1]) : s[0]; };
export function sddOpenCounts(p) {
  return memoPass(p, () => {
    const B = sddBoard(p);
    return {toFix: B.toFix, toConfirm: B.toConfirm, treated: B.treated, unit: {fix: COUNT_UNITS.fix[0], confirm: COUNT_UNITS.confirm[0]}, chapters: B.chapters.map(c => ({chapter: c.chapter, title: c.title, toFix: c.toFix, toConfirm: c.toConfirm})), rules: B.chapters.flatMap(c => openCauses(p, c.chapter))};
  });
}
// One chapter's open items by cause (round 12, G, GR-UX-03): its findings to fix and items to confirm grouped by the rule
// that raised them (the item's id without the record it names), the reader the SDD's counts above and the chapter's
// Validate both read: the count, the records they sit on, the first title and detail, and how many titles and details
// they carry. Chapter 11's are its final checks. Kept per saved document and chapter.
const causesCache = new WeakMap();
// The words a cause's titles share, with "…" where they differ ("Define … contract"); the one title when they agree.
export function sharedWords(titles) {
  const ts = [...titles].map(t => String(t ?? '')), words = ts.map(t => t.split(' '));
  if (!ts.length) return '';
  if (ts.every(t => t === ts[0])) return ts[0];
  let pre = 0; while (words.every(w => w[pre] !== undefined && w[pre] === words[0][pre])) pre++;
  let suf = 0; while (suf < words[0].length - pre && words.every(w => w.length - suf - 1 >= pre && w[w.length - suf - 1] === words[0][words[0].length - suf - 1])) suf++;
  const headWords = words[0].slice(0, pre).join(' '), tail = suf ? words[0].slice(words[0].length - suf).join(' ') : '';
  return ((headWords + ' …' + (tail ? ' ' + tail : '')).trim()) || ts[0];
}
// A cause names what must be reviewed; the varying record name belongs in the record chips.
export function causeLabel(titles, chapter, code='') {
  const words=sharedWords(titles),subject=chapter===6&&code.includes('need')?'the application need':({1:'the project record',2:'the driver',3:'the decision',4:'the responsibility',5:'the component',6:'the capability',7:'the realization',8:'the definition',9:'the security record',10:'the runtime record',11:'the review item'}[chapter]||'the record');
  return words.replace(/\s*…\s*$/, ' '+subject).replace(/\s*…\s*/g,' ').replace(/\s+/g,' ').trim();
}
export function openCauses(p, chapter) {
  chapter = Number(chapter);
  let byChapter = causesCache.get(p); if (!byChapter) { byChapter = new Map(); causesCache.set(p, byChapter); }
  if (byChapter.has(chapter)) return byChapter.get(chapter);
  const out = memoPass(p, () => causesOf(p, chapter, chapterChecks(p, chapter)));
  if (!memoOff()) byChapter.set(chapter, out);
  return out;
}
function causesOf(p, chapter, C) {
  const rules = new Map(); if (!C) return [];
  const add = (level, id, title, detail, ref) => { const key = level + '|' + ruleOf(id); let r = rules.get(key); if (!r) rules.set(key, r = {chapter, level, rule: ruleOf(id), title, detail, titles: new Set(), details: new Set(), refs: [], count: 0}); r.count++; r.titles.add(title); r.details.add(detail || ''); if (ref && !r.refs.includes(ref)) r.refs.push(ref); };
  if (chapter === 11) { let ff = []; try { ff = finalFindings(p); } catch { ff = []; } for (const f of ff) add(f.level === 'error' ? 'fix' : 'confirm', f.code || f.id, checkWords(f.title), checkWords(f.detail || ''), f.objectId && f.objectId !== 'project' ? f.objectId : ''); }
  else for (const x of C.passages || []) for (const [level, items] of [['fix', x.fix], ['confirm', x.confirm]]) for (const it of items) add(level, it.id, it.title, it.detail, x.id === 'project' ? '' : x.ref);
  return [...rules.values()].map(r => {
    const label = causeLabel(r.titles, chapter, r.rule) || r.title;
    const code = r.rule.replace(/^C\d+:/, '');
    return {...r, label, sentence: chapter === 1 ? causeSentence(code, r.count, label, r.details.size === 1 ? r.detail : '') : r.details.size === 1 ? r.detail : r.count + ' records need this check. Open a record for its exact conditions.', titles: r.titles.size, details: r.details.size};
  });
}
// Round 24 (D-24-08): a chapter's checks, its open causes and the readiness board read for a module scope (module-lens.js
// scopeLens): the passages of the records the scope shows, counted as the chapter counts its own. The chapter-as-a-whole
// passage and Chapter 11's final checks are the whole design's and stay so. Without a lens, each is the chapter's own.
const scopedCache = new WeakMap();
export function scopedChecks(p, chapter, lens) {
  chapter = Number(chapter); const C = chapterChecks(p, chapter);
  if (!C || !lens || chapter === 11) return C;
  let by = scopedCache.get(C); if (!by) scopedCache.set(C, by = new Map()); if (by.has(lens.id)) return by.get(lens.id);
  const passages = C.passages.filter(x => x.id !== 'project' && lens.shows.has(x.id));
  let toFix = 0, toConfirm = 0, treated = 0; for (const x of passages) { toFix += x.fix.length; toConfirm += x.confirm.length; treated += x.treated.length; }
  const first = passages.find(x => x.status === 'fix') || passages.find(x => x.status === 'confirm'), item = first ? (first.fix[0] || first.confirm[0]) : null;
  // A draft offer and the proposed structure's acceptance are the chapter's whole next step and lead under a scope too.
  const whole = C.next?.kind === 'draft' || (chapter === 1 && ['proposed', 'mixed'].includes(moduleTree(p).state));
  const out = {...C, passages, passing: passages.filter(x => x.status === 'pass').length, total: passages.length, toFix, toConfirm, treated, state: toFix ? 'fix' : toConfirm ? 'confirm' : 'pass', scope: lens.title, next: !whole && item ? {kind: first.status, text: item.title + (item.title.includes(first.ref) ? '' : ' · ' + first.ref), url: first.url} : C.next};
  by.set(lens.id, out); return out;
}
export const scopedCauses = (p, chapter, lens) => (!lens || Number(chapter) === 11 ? openCauses(p, chapter) : memoPass(p, () => causesOf(p, Number(chapter), scopedChecks(p, chapter, lens))));
export function scopedBoard(p, lens) {
  const B = sddBoard(p); if (!lens) return B;
  const chapters = B.chapters.map(c => (c.failed ? c : scopedChecks(p, c.chapter, lens))), sum = k => chapters.reduce((n, c) => n + (c[k] || 0), 0);
  return {...B, chapters, passing: sum('passing'), total: sum('total'), toFix: sum('toFix'), toConfirm: sum('toConfirm'), treated: sum('treated'), clear: chapters.filter(c => c.state === 'pass').length, scope: lens.title};
}
registerOpenCounts(sddOpenCounts);
// A check's title in the one vocabulary: Chapter 11's "Assess 211 blocking source findings" reads "Assess 211 source
// findings to fix", so nothing is called blocking on any surface that shows the checks (U2-05).
export const checkWords = t => String(t ?? '').replace(/\b(\d+) blocking source findings?\b/gi, (m, n) => n + ' source finding' + (n === '1' ? '' : 's') + ' to fix').replace(/\bblocking\b/gi, 'to fix');
const STATUS_LABEL = {pass: 'Passing', fix: 'To fix', confirm: 'To confirm'};
// The passages a chapter fills, as a table: on Validate ("This chapter in the SDD") and on Output (its contribution).
// The passages are drawn a page at a time (round 5, R5-G), as the Table view draws its rows (model-table.js): the first
// SDD_PAGE, then "Show more" draws the next page in place (shell-ux.js). A chapter of 500 records reads thousands of
// passages, and an imported project's Chapter 4 names 5,500, which drawn at once were 80,000 elements. How many a reader
// has asked to see is kept per surface and chapter while the page lives, so a redraw keeps them.
export const SDD_PAGE = 50;
const passagesShown = new Map();
export function showMorePassages(where, chapter) { const k = where + ':' + Number(chapter), n = (passagesShown.get(k) || SDD_PAGE) + SDD_PAGE; passagesShown.set(k, n); return n; }
export function sddContributionHTML(p, chapter, {where = 'validate', limit = null} = {}) {
  let C = null; try { C = chapterChecks(p, chapter); } catch (e) { console.warn('The SDD contribution could not be read.', e?.message); }
  if (!C) return '';
  const upto = Math.max(SDD_PAGE, Number(limit) || passagesShown.get(where + ':' + C.chapter) || SDD_PAGE), shown = C.passages.slice(0, upto), rest = C.passages.length - shown.length;
  const id = 'sdd-part-' + where + '-' + C.chapter;
  const items = x => [...x.fix.map(f => ['fix', f]), ...x.confirm.map(f => ['confirm', f])];
  const row = x => { const its = items(x), shown = its.slice(0, 3);
    return `<tr class="sdd-row ${x.status}" data-sdd-passage="${esc(x.id)}"><th scope="row"><b>${esc(x.ref)}</b> <span>${esc(x.title)}</span>${x.kind && x.kind !== x.title ? `<small>${esc(x.kind)}</small>` : ''}</th>`
      + `<td><span class="sdd-st ${x.status}"><i aria-hidden="true">${CHECK_GLYPHS[x.status]}</i> ${STATUS_LABEL[x.status]}</span>${x.treated.length ? `<small>${x.treated.length} treated in Chapter 11</small>` : ''}</td>`
      + `<td>${its.length ? `<ul class="sdd-miss">${shown.map(([k, f]) => `<li class="${k}"><b>${k === 'fix' ? 'Missing' : 'Confirm'}</b> ${esc(f.title)}${k === 'fix' && f.detail ? `<small>${esc(f.detail)}</small>` : ''}</li>`).join('')}${its.length > shown.length ? `<li class="more">and ${its.length - shown.length} more ${where === 'validate' ? 'among the findings above' : `on <a href="${esc(C.validateURL)}">Validate</a>`}</li>` : ''}</ul>` : '<span class="sdd-none">Nothing missing</span>'}</td>`
      + `<td><a class="sdd-open" href="${esc(x.url)}">${C.chapter === 11 && x.id === 'performance' ? 'Open the review desk' : C.chapter === 11 && x.id === 'lens' ? 'Open the lens' : 'Open in Work'}</a></td></tr>`; };
  const lead = where === 'output' ? `What Chapter ${C.chapter} puts in the SDD` : 'This chapter in the SDD';
  const note = C.chapter === 11 ? 'The passages the review writes into the SDD itself.' : `Chapter ${C.chapter}'s register in the SDD: one passage for each record, and one for the chapter as a whole.`;
  return `<section class="sdd-part" aria-labelledby="${id}"><header><div><small>${esc(lead)}</small><h3 id="${id}">Chapter ${C.chapter} · ${esc(C.title)}</h3></div>`
    + `<p class="sdd-sum" title="Counted by passage: a passage is to fix while any of its items is, else to confirm while any is to confirm"><span class="pass"><b>${esc(fmtCount(C.passing))}</b> ${C.passing === 1 ? 'passage' : 'passages'} passing</span><span class="fix"><b>${esc(fmtCount(C.passages.filter(x => x.status === 'fix').length))}</b> ${C.passages.filter(x => x.status === 'fix').length === 1 ? 'passage' : 'passages'} to fix</span><span class="confirm"><b>${esc(fmtCount(C.passages.filter(x => x.status === 'confirm').length))}</b> ${C.passages.filter(x => x.status === 'confirm').length === 1 ? 'passage' : 'passages'} to confirm</span><small>of ${esc(counted(C.total, 'passage'))}</small></p></header>`
    + `<p class="sdd-note">${esc(note)} Read from the chapter's rule-based checks; it approves nothing.</p>`
    + `<div class="sdd-scroll"><table class="sdd-table"><thead><tr><th scope="col">Passage</th><th scope="col">Status</th><th scope="col">Missing or to confirm</th><th scope="col">Filled in</th></tr></thead><tbody>${shown.map(row).join('')}</tbody></table></div>`
    + (rest ? `<div class="sdd-more"><button type="button" class="btn" data-sdd-more="${C.chapter}" data-sdd-where="${esc(where)}">Show more</button><span>${shown.length} of ${C.passages.length} passages shown · ${Math.min(SDD_PAGE, rest)} more</span></div>` : '') + '</section>';
}

// ---------------------------------------------------------------- the plateaus' readiness (round 6, Contract S)
// Each record's status, as its passage above reads it (pass, fix or confirm), for the records of Chapters 4–10 a
// plateau introduces. The roadmap module cannot import this one (it sits under review-domain.js), so the reading is
// registered with it here, with the one set of words and glyphs, the way the SDD builder registers itself with
// review-domain.js. Worked out once per pass over the document; chapterChecks is already kept per saved document.
function recordStatus(p) {
  return memoPass(p, () => {
    const m = new Map();
    for (let ch = 4; ch <= 10; ch++) {
      let C = null; try { C = chapterChecks(p, ch); } catch { C = null; }
      for (const x of C?.passages || []) if (x.id !== 'project' && x.from == null && !m.has(x.id)) m.set(x.id, x.status);
    }
    return m;
  });
}
registerRecordReadiness({status: recordStatus, words: CHECK_WORDS, glyphs: CHECK_GLYPHS});
// The Transition section and the plateaus' readiness, from here: a module that imports them from this one has the
// per-record reading registered, whatever else it loaded (sdd-document.js's executive edition imports them this way).
export {transitionSection, plateauReadiness} from './roadmap-domain.js';
