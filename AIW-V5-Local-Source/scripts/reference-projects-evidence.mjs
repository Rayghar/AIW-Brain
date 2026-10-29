// Evidence for the reference journeys (round 4; audit/round4/DESIGN.md, "Reference projects"): each reference
// project is created through the Worker's own POST /api/projects, read back through GET /api/project and exported
// through GET /api/export as the working SDD in Markdown, JSON and HTML; what each one holds is measured from the
// project as served. Writes evidence/reference-projects.json:
//   per project, record counts per chapter; the readiness counts (passing / to fix / to confirm, from
//   readiness-model.js sddBoard and chapterChecks); the records that carry provenance.journey; the gaps left as
//   explicit open answers ("Unassigned", "Open question: …"); what was confirmed, reviewed, frozen, approved or handed
//   off (nothing); and the size of each SDD export.
// reference-projects-validate.mjs measures the same way and checks the counts against this file, so the kept evidence
// cannot drift from what the code generates. Run: node scripts/reference-projects-evidence.mjs
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import worker from '../worker.js';
import {localDatabase} from '../local-db.js';
import {REFERENCE_PROJECTS} from '../public/reference-projects.js';
import {referenceBrief, REFERENCE_AUTHORITY, REFERENCE_DRAFTED} from '../shared/reference-journeys.js';
import {interpretBrief, BRIEF_RULES} from '../shared/brief-interpreter.js';
import {sddBoard} from '../public/readiness-model.js';
import {CHAPTERS} from '../public/review-domain.js';
import {scaleReadings} from '../public/desk-capacity.js';
import {resilienceDrafts, externalContracts, securityFindings, threats, RESILIENCE_THREAT} from '../public/security-domain.js';

export const EVIDENCE_FILE = 'evidence/reference-projects.json';
export const EVIDENCE_AUTHORITY = 'AIW authored illustrations: each reference project is drafted by the deterministic journey rules (' + REFERENCE_DRAFTED + ') from an AIW authored teaching brief. Not a customer project, not a measured system, not an architecture review, and not a confirmation, verification, governance approval or production acceptance of any record; productionAccepted stays false.';

const sha = t => createHash('sha256').update(t).digest('hex');
const list = v => Array.isArray(v) ? v : [];
const words = t => (String(t).match(/\S+/g) || []).length;

// The records each chapter registers (the SDD's chapter registers), and the parts that live inside a record: a
// decision's alternatives, an application's technology needs, a runtime plan's placements. A part carries no
// provenance of its own; its record does, exactly as guide.commit-draft writes it.
export const REGISTERS = {
  1: p => list(p.artefacts),
  2: p => list(p.quality?.drivers),
  3: p => list(p.decisions?.records),
  4: p => list(p.logical?.responsibilities),
  5: p => list(p.realisation?.components),
  6: p => [...list(p.technology?.capabilities), ...list(p.technology?.boundaries)],
  7: p => list(p.technologyRealisation?.records),
  8: p => [...list(p.interfaces?.contracts), ...list(p.interfaces?.data), ...list(p.interfaces?.parties)],
  9: p => [...list(p.security?.threats), ...list(p.security?.controls)],
  10: p => [...list(p.runtime?.environments), ...list(p.runtime?.zones), ...list(p.runtime?.plans)],
  11: p => p.finalReview?.narrative ? [p.finalReview.narrative] : []
};
const PARTS = {alternatives: p => list(p.decisions?.records).flatMap(d => list(d.alternatives)), technologyNeeds: p => list(p.technology?.needs), placements: p => list(p.runtime?.placements)};
const DETAIL = {
  1: p => Object.fromEntries([...new Set(list(p.artefacts).map(a => a.type))].sort().map(t => [t, list(p.artefacts).filter(a => a.type === t).length])),
  6: p => ({capabilities: list(p.technology?.capabilities).length, trustBoundaries: list(p.technology?.boundaries).length, technologyNeeds: list(p.technology?.needs).length}),
  3: p => ({decisions: list(p.decisions?.records).length, alternatives: PARTS.alternatives(p).length}),
  8: p => ({contracts: list(p.interfaces?.contracts).length, data: list(p.interfaces?.data).length, dataFields: list(p.interfaces?.data).reduce((n, d) => n + list(d.fields).length, 0), parties: list(p.interfaces?.parties).length}),
  9: p => ({threats: list(p.security?.threats).length, controls: list(p.security?.controls).length}),
  10: p => ({environments: list(p.runtime?.environments).length, zones: list(p.runtime?.zones).length, plans: list(p.runtime?.plans).length, placements: PARTS.placements(p).length})
};
export const OPEN_ANSWER = v => typeof v === 'string' && (v === 'Unassigned' || /^Open question: /.test(v));
const openAnswers = r => Object.values(r).filter(OPEN_ANSWER).length;
const CONFIRMED = r => r?.confirmed === true || r?.targetConfirmed === true;
// Whether anything records a review, a handoff, a baseline or governance: every chapter's own review and handoff, and
// Chapter 11's reviews, baselines, governance and handoff.
export function recordedActs(p) {
  const chapters = [p, p.quality, p.decisions, p.logical, p.realisation, p.technology, p.technologyRealisation, p.interfaces, p.security, p.runtime];
  return {chapterReviews: chapters.filter(c => c?.review).length, chapterHandoffs: chapters.filter(c => c?.handoff).length, reviews: list(p.finalReview?.reviews).length, baselines: list(p.finalReview?.baselines).length, governance: list(p.finalReview?.governance).length, handoff: p.finalReview?.handoff ? 1 : 0};
}

// What one reference project holds, measured from the project as the Worker serves it.
export function measure(p) {
  const kept = list(p.coauthoring?.sources).find(s => s.kind === 'brief'), text = kept?.text || '', brief = interpretBrief(text, {name: p.name}), ids = new Set(brief.passages.map(x => x.id));
  const chapters = {}, records = [];
  for (let ch = 1; ch <= 11; ch++) {
    const rs = REGISTERS[ch](p);
    records.push(...rs.map(r => ({ch, r})));
    chapters[ch] = {records: rs.length, ...(DETAIL[ch] ? {detail: DETAIL[ch](p)} : {}), withJourney: rs.filter(r => r.provenance?.journey).length, openAnswers: rs.reduce((n, r) => n + openAnswers(r), 0)};
  }
  const cited = new Set(records.flatMap(({r}) => list(r.provenance?.journey?.passages)));
  const board = sddBoard(p);
  const findings = CHAPTERS.flatMap(c => c.checks(p));
  return {
    brief: {firstLine: text.split('\n')[0], words: words(text), characters: text.length, sha256: kept?.hash || null, passages: brief.passages.length, questions: brief.questions.length, sourceId: kept?.id || null},
    interpreted: Object.fromEntries(Object.entries(p.brief?.interpreted || {}).filter(([k]) => !['at', 'textHash'].includes(k))),
    chapters,
    parts: Object.fromEntries(Object.entries(PARTS).map(([k, f]) => [k, f(p).length])),
    provenance: {records: records.length, withJourney: records.filter(({r}) => r.provenance?.journey).length, passagesCited: cited.size, passagesNotInBrief: [...cited].filter(id => !ids.has(id)).length},
    gaps: {openAnswers: records.reduce((n, {r}) => n + openAnswers(r), 0), briefQuestions: brief.questions.length},
    readiness: {passing: board.passing, total: board.total, toFix: board.toFix, toConfirm: board.toConfirm, treated: board.treated, chapters: board.chapters.map(c => ({chapter: c.chapter, passing: c.passing, total: c.total, toFix: c.toFix, toConfirm: c.toConfirm}))},
    findings: {errors: findings.filter(f => f.level === 'error').length, warnings: findings.filter(f => f.level === 'warning').length, sourceChange: findings.filter(f => f.code === 'source-change').length, key: findings.filter(f => f.code === 'key').length},
    // Round 6 (Contract K): the scale readings and the resilience drafts the project holds, measured, never applied.
    scale: (() => { const s = scaleReadings(p); return {inputs: s.inputs.length, derived: s.derived.filter(x => x.qps > 0 || x.storageGB != null).length, findings: Object.fromEntries([...new Set(s.findings.map(f => f.code))].sort().map(c => [c, s.findings.filter(f => f.code === c).length]))}; })(),
    resilience: {externalContracts: externalContracts(p).length, disruptionThreats: threats(p).filter(t => t.category === RESILIENCE_THREAT).length, drafts: resilienceDrafts(p).length, missing: securityFindings(p).filter(f => f.code === 'RESILIENCE-MISSING').length},
    confirmed: records.filter(({r}) => CONFIRMED(r)).length + (p.brief?.confirmed ? 1 : 0),
    recorded: recordedActs(p),
    reference: p.workspace?.reference || null,
    narrativeTitle: p.finalReview?.narrative?.title || ''
  };
}

// The Worker, an in-memory database and one signed-in owner: what the suites use too.
export function localWorker(owner = 'reference-author') {
  const DB = localDatabase(':memory:'), objects = new Map();
  const FILES = {async put(k, v) { objects.set(k, v); }, async get(k) { return objects.has(k) ? {text: async () => objects.get(k)} : null; }, async delete(k) { objects.delete(k); }};
  const env = {DB, FILES, ASSETS: {fetch: () => new Response('asset')}};
  const api = (path, method = 'GET', body = null) => worker.fetch(new Request('https://aiw.test' + path, {method, headers: {'oai-authenticated-user-id': owner, ...(body ? {'Content-Type': 'application/json', Origin: 'https://aiw.test'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
  return {api, close: () => DB.close()};
}

// One reference project through the Worker: created, read back and exported (the working SDD as Markdown, JSON with the
// project, and HTML; its review registers annex as Markdown). Returns the project and its exports.
export async function referenceThroughWorker(api, ref, name = ref.title) {
  const created = await api('/api/projects', 'POST', {name, template: ref.id, brief: ''});
  if (created.status !== 201) throw Error(`POST /api/projects ${ref.id}: ${created.status} ${await created.text()}`);
  const id = (await created.json()).document.id, read = await api('/api/project?project=' + id);
  if (read.status !== 200) throw Error(`GET /api/project ${ref.id}: ${read.status}`);
  const project = (await read.json()).document, exports = {};
  for (const [format, query] of [['md', 'format=md'], ['json', 'format=json&embed=project'], ['html', 'format=html'], ['registers', 'annex=registers&format=md']]) {
    const res = await api(`/api/export?project=${id}&chapter=11&${query}`);
    if (res.status !== 200) throw Error(`GET /api/export ${ref.id} ${format}: ${res.status}`);
    exports[format] = {text: await res.text(), type: res.headers.get('Content-Type'), disposition: res.headers.get('Content-Disposition'), policy: res.headers.get('Content-Security-Policy')};
  }
  return {id, project, exports};
}

export async function referenceEvidence() {
  const {api, close} = localWorker();
  try {
    const results = [];
    for (const ref of REFERENCE_PROJECTS) {
      const {project, exports} = await referenceThroughWorker(api, ref), text = referenceBrief(ref.id);
      results.push({id: ref.id, title: ref.title, name: project.name, briefSha256: sha(text), ...measure(project), sdd: Object.fromEntries(Object.entries(exports).map(([f, x]) => [f === 'md' ? 'markdownBytes' : f + 'Bytes', Buffer.byteLength(x.text)]))});
    }
    return {at: new Date().toISOString(), authority: EVIDENCE_AUTHORITY, rules: {brief: BRIEF_RULES, drafted: REFERENCE_DRAFTED, referenceAuthority: REFERENCE_AUTHORITY}, method: 'Each project created through POST /api/projects with its template id, read back through GET /api/project and exported through GET /api/export?chapter=11 as md, json (embed=project) and html, with its review registers annex (annex=registers, md), on the local Worker with an in-memory database. Readiness from readiness-model.js sddBoard (chapterChecks per chapter); findings from each chapter\'s own checks.', productionAccepted: false, results};
  } finally { close(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const evidence = await referenceEvidence();
  await writeFile(EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n');
  for (const r of evidence.results) console.log(`${r.id}: ${r.provenance.records} records (${r.provenance.withJourney} with journey provenance), readiness ${r.readiness.passing} passing / ${r.readiness.toFix} to fix / ${r.readiness.toConfirm} to confirm, ${r.gaps.openAnswers} open answers, SDD ${r.sdd.markdownBytes} B Markdown`);
  console.log('Wrote ' + EVIDENCE_FILE);
}
