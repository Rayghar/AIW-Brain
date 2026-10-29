// The records a Work stage reads and produces (rc40, PLAN §4.4): one reader per record kind, over the saved document,
// so the journey rail, the task head, the feeds cards and the arrival card count what is recorded, what a person has
// confirmed and what the chapter's checks still hold open. Counts are read from records, never from a visited stage;
// a confirmed record is one its author marked confirmed or whose status is an accepted one. Pure and DOM-free.
const list = x => (Array.isArray(x) ? x : []);
const artefacts = (p, keep) => list(p?.artefacts).filter(keep);
const ACCEPTED = /^(?:accepted|approved|confirmed|verified|chosen|decided|active|recorded|reviewed)$/i;
export const isConfirmed = r => !!r && (r.confirmed === true || r.recorded === true || (r.confirmed === undefined && ACCEPTED.test(String(r.status || r.state || ''))));
// What a record is called in a list: its title, else what the kind carries (a question, a label, a route, a role).
export const recordName = r => String(r?.title || r?.question || r?.name || r?.label || r?.topic || (r?.from && r?.to ? r.from + ' → ' + r.to : '') || (r?.logicalId && r?.physicalId ? r.logicalId + ' → ' + r.physicalId : '') || (r?.needId && r?.capabilityId ? r.needId + ' ← ' + r.capabilityId : '') || r?.description || r?.role || r?.route || r?.ref || r?.id || '').trim();
export const recordRef = r => String(r?.ref || r?.id || '');
// Each kind: its words (one, many), the chapter and Work section that record it, and the rows it holds in a document.
export const RECORD_KINDS = {
  brief: {one: 'project brief', many: 'project brief', chapter: 1, section: 'brief', rows: p => (p?.brief && (p.brief.problem || p.brief.goal) ? [{id: 'brief', ref: 'Brief', title: p.brief.goal || p.brief.problem, confirmed: !!p.brief.confirmed}] : [])},
  context: {one: 'context record', many: 'context records', chapter: 1, section: 'context', rows: p => artefacts(p, a => !['journey', 'requirement'].includes(a.type))},
  journey: {one: 'journey step', many: 'journey steps', chapter: 1, section: 'journey', rows: p => artefacts(p, a => a.type === 'journey')},
  requirement: {one: 'requirement', many: 'requirements', chapter: 1, section: 'requirement', rows: p => artefacts(p, a => a.type === 'requirement')},
  driver: {one: 'architectural driver', many: 'architectural drivers', chapter: 2, section: 'intake', rows: p => list(p?.quality?.drivers)},
  scenario: {one: 'quality scenario', many: 'quality scenarios', chapter: 2, section: 'scenarios', rows: p => list(p?.quality?.drivers).filter(d => d.metric || d.targetValue != null || d.scenarioId)},
  priority: {one: 'prioritised driver', many: 'prioritised drivers', chapter: 2, section: 'priorities', rows: p => list(p?.quality?.drivers).filter(d => d.priority)},
  conflict: {one: 'driver conflict', many: 'driver conflicts', chapter: 2, section: 'conflicts', rows: p => list(p?.quality?.conflicts)},
  decision: {one: 'decision', many: 'decisions', chapter: 3, section: 'record', rows: p => list(p?.decisions?.records)},
  alternative: {one: 'alternative', many: 'alternatives', chapter: 3, section: 'compare', rows: p => list(p?.decisions?.records).flatMap(d => list(d.alternatives).map(a => ({...a, id: d.id + '/alternative/' + a.id, title: a.title || a.name, confirmed: d.selectedAlternativeId === a.id || d.selected === a.id})))},
  responsibility: {one: 'responsibility', many: 'responsibilities', chapter: 4, section: 'responsibilities', rows: p => list(p?.logical?.responsibilities)},
  connection: {one: 'collaboration', many: 'collaborations', chapter: 4, section: 'connections', rows: p => list(p?.logical?.connections)},
  mapping: {one: 'implementation link', many: 'implementation links', chapter: 4, section: 'mappings', rows: p => list(p?.logical?.mappings)},
  group: {one: 'responsibility group', many: 'responsibility groups', chapter: 4, section: 'groups', rows: p => list(p?.logical?.groups)},
  component: {one: 'component', many: 'components', chapter: 5, section: 'components', rows: p => list(p?.realisation?.components)},
  interaction: {one: 'interaction', many: 'interactions', chapter: 5, section: 'interactions', rows: p => list(p?.realisation?.connections)},
  need: {one: 'technology need', many: 'technology needs', chapter: 5, section: 'technology', rows: p => list(p?.technology?.needs)},
  support: {one: 'support link', many: 'support links', chapter: 6, section: 'needs', rows: p => list(p?.technology?.mappings)},
  capability: {one: 'technology capability', many: 'technology capabilities', chapter: 6, section: 'capabilities', rows: p => list(p?.technology?.capabilities)},
  dependency: {one: 'dependency', many: 'dependencies', chapter: 6, section: 'dependencies', rows: p => list(p?.technology?.dependencies)},
  boundary: {one: 'trust boundary', many: 'trust boundaries', chapter: 6, section: 'dependencies', rows: p => list(p?.technology?.boundaries)},
  realization: {one: 'technology realization', many: 'technology realizations', chapter: 7, section: 'plans', rows: p => list(p?.technologyRealisation?.records)},
  option: {one: 'technology option', many: 'technology options', chapter: 7, section: 'compare', rows: p => list(p?.technologyRealisation?.records).flatMap(t => list(t.options).map(o => ({...o, id: t.id + '/option/' + o.id, title: o.title || o.product, confirmed: t.selectedOptionId === o.id && !!t.recorded})))},
  techConnection: {one: 'technology agreement', many: 'technology agreements', chapter: 7, section: 'connections', rows: p => list(p?.technologyRealisation?.connections)},
  contract: {one: 'interface contract', many: 'interface contracts', chapter: 8, section: 'contracts', rows: p => list(p?.interfaces?.contracts)},
  party: {one: 'external participant', many: 'external participants', chapter: 8, section: 'parties', rows: p => list(p?.interfaces?.parties)},
  data: {one: 'data definition', many: 'data definitions', chapter: 8, section: 'data', rows: p => list(p?.interfaces?.data)},
  lineage: {one: 'data derivation', many: 'data derivations', chapter: 8, section: 'lineage', rows: p => list(p?.interfaces?.lineage)},
  threat: {one: 'threat', many: 'threats', chapter: 9, section: 'threats', rows: p => list(p?.security?.threats)},
  control: {one: 'security control', many: 'security controls', chapter: 9, section: 'controls', rows: p => list(p?.security?.controls)},
  evidence: {one: 'piece of evidence', many: 'pieces of evidence', chapter: 9, section: 'assurance', rows: p => list(p?.security?.evidence)},
  risk: {one: 'residual risk', many: 'residual risks', chapter: 9, section: 'assurance', rows: p => list(p?.security?.risks)},
  environment: {one: 'environment', many: 'environments', chapter: 10, section: 'placement', rows: p => list(p?.runtime?.environments)},
  zone: {one: 'deployment zone', many: 'deployment zones', chapter: 10, section: 'placement', rows: p => list(p?.runtime?.zones)},
  placement: {one: 'placement', many: 'placements', chapter: 10, section: 'placement', rows: p => list(p?.runtime?.placements)},
  plan: {one: 'operating plan', many: 'operating plans', chapter: 10, section: 'recovery', rows: p => list(p?.runtime?.plans)},
  path: {one: 'runtime path', many: 'runtime paths', chapter: 10, section: 'operate', rows: p => list(p?.runtime?.paths)},
  runtimeEvidence: {one: 'operating record', many: 'operating records', chapter: 10, section: 'operate', rows: p => list(p?.runtime?.evidence)},
  review: {one: 'architecture review', many: 'architecture reviews', chapter: 11, section: 'overview', rows: p => list(p?.finalReview?.reviews)},
  case: {one: 'architecture case', many: 'architecture cases', chapter: 11, section: 'case', rows: p => list(p?.finalReview?.architectureCases)},
  narrative: {one: 'design narrative', many: 'design narrative', chapter: 11, section: 'document', rows: p => { const n = p?.finalReview?.narrative; return n && (n.summary || n.approach) ? [{id: 'narrative', ref: 'SDD', title: n.title || 'Design narrative', confirmed: !!n.confirmed}] : []; }},
  baseline: {one: 'frozen baseline', many: 'frozen baselines', chapter: 11, section: 'document', rows: p => list(p?.finalReview?.baselines)},
  action: {one: 'delivery action', many: 'delivery actions', chapter: 11, section: 'delivery', rows: p => list(p?.finalReview?.actions)},
  plateau: {one: 'plateau', many: 'plateaus', chapter: 11, section: 'plateaus', rows: p => list(p?.roadmap?.plateaus)}
};
// Counts read with a thousands separator (rc41, W2: "1,400 requirements" at the scale of a real register).
export const count = n => Number(n || 0).toLocaleString('en-GB');
export const kindWord = (kind, n) => { const k = RECORD_KINDS[kind]; if (!k) return count(n) + ' ' + kind; return count(n) + ' ' + (n === 1 ? k.one : k.many); };
export const kindRows = (p, kind) => { try { return list(RECORD_KINDS[kind]?.rows(p)).filter(r => r && typeof r === 'object'); } catch { return []; } };
// The state of one or more kinds: what is recorded, confirmed and (from the chapter's passages) to fix or to confirm,
// the first rows for naming, and a one-line reading. `checks` is readiness-model's chapterChecks for the kinds' chapter.
// rc41 (W2): `noun` names the rows as one word ("47 records") where the reading spans a whole chapter — the one state
// line of Validate's summary, Output's hero and the Model footer; a stage's line keeps its kinds ("5 components").
// rc41 (close): a record is counted once however many of the kinds read it — Chapter 2's quality scenarios and
// prioritised drivers are filters over its drivers, so a chapter-wide reading met each driver three times. `open` gives
// the open checks of a chapter whose passages are not kept per record (Chapter 11's are the SDD's sections, from its
// final checks: work-frame.js chapterRecordsState) — {fix, confirm} — in place of the passages matched by record id.
export function kindsState(p, kinds, checks = null, {noun = '', open = null} = {}) {
  const rows = [], counts = [], seen = new Set();
  for (const kind of list(kinds)) { const xs = kindRows(p, kind); counts.push([kind, xs.length]); for (const r of xs) if (!seen.has(r)) { seen.add(r); rows.push(r); } }
  // The kinds with a record, or the first kind's word when none has one ("0 components"); or the one noun.
  const parts = noun ? [count(rows.length) + ' ' + (rows.length === 1 ? noun : noun + 's')] : (counts.some(([, n]) => n) ? counts.filter(([, n]) => n) : counts.slice(0, 1)).map(([kind, n]) => kindWord(kind, n));
  const ids = new Set(rows.map(r => r.id)), passages = list(checks?.passages).filter(x => ids.has(x.id));
  const fix = open ? Math.max(0, Number(open.fix) || 0) : passages.filter(x => x.status === 'fix').length, confirm = open ? Math.max(0, Number(open.confirm) || 0) : passages.filter(x => x.status === 'confirm').length;
  const confirmed = rows.filter(isConfirmed).length, held = [fix ? count(fix) + ' to fix' : '', confirm ? count(confirm) + ' to confirm' : ''];
  return {recorded: rows.length, confirmed, fix, confirm, open: fix + confirm, rows, parts,
    names: rows.slice(0, 3).map(r => ({id: r.id, ref: recordRef(r), title: recordName(r)})),
    // "5 components · 2 confirmed · 1 to fix · 3 to confirm", or what there is to do ("Nothing recorded yet", with the
    // chapter's open checks where they are not kept per record).
    line: (rows.length ? [parts.join(' · '), confirmed ? count(confirmed) + ' confirmed' : '', ...held] : ['Nothing recorded yet', ...held]).filter(Boolean).join(' · '),
    // The rail's word for the stage: read from the records and the open checks, never from a visit.
    state: fix ? 'fix' : confirm ? 'confirm' : !rows.length ? 'empty' : confirmed === rows.length ? 'confirmed' : 'recorded'};
}
