// The reference journeys (round 4; audit/round4/DESIGN.md, "Reference projects"; shared/reference-journeys.js; round 6,
// Contract K, adds the parcel-locker and library-reservation briefs). Each of the five is the pipeline's own output from a
// brief kept beside its id: interpretBrief → draftJourney →
// compileCreation per chapter, committed as guide.commit-draft commits. The suite asserts, for each:
//   the brief: written as an architect receives it (500–1,500 words, every section, a regulation and a deadline),
//     labelled an AIW authored teaching example, its first line the one the Projects picker shows;
//   the project: the brief kept as its first evidence source (kind brief, hash, text) with brief.interpreted counted as
//     for a typed brief; every chapter holds records; every record carries provenance.journey whose passages are in
//     the kept brief and which passes the guide's own check; the records are exactly the ones draftJourney drafts from
//     that brief; Chapter 8 data has a key and a status field; the SDD is titled "<name> — Solution Design"; nothing is
//     confirmed, reviewed, frozen, approved or handed off; no chapter raises a source-change or key finding; a drafted
//     record reads "to confirm", never "passing"; workspace.reference says what it is; the same brief drafts the same
//     project;
//   through the Worker: POST /api/projects creates it, and its working SDD exports as Markdown, JSON and HTML with the
//     chapter registers; the counts kept in evidence/reference-projects.json are the counts measured now.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {REFERENCE_PROJECTS} from './public/reference-projects.js';
import {referenceBrief, REFERENCE_AUTHORITY, REFERENCE_DRAFTED} from './shared/reference-journeys.js';
import {createProject} from './shared/projects-domain.js';
import {interpretBrief, briefCounts, BRIEF_RULES, BRIEF_LIMIT} from './shared/brief-interpreter.js';
import {draftJourney} from './shared/journey-drafter.js';
import {journeyProvenance} from './public/chapter-guide.js';
import {CHAPTERS} from './public/review-domain.js';
import {chapterChecks} from './public/readiness-model.js';
import {measure, REGISTERS, recordedActs, localWorker, referenceThroughWorker, EVIDENCE_FILE} from './scripts/reference-projects-evidence.mjs';
import {isArchitectureEdition} from './public/sdd-document.js';

const checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const at = '2026-10-01T09:00:00.000Z', sha = t => createHash('sha256').update(t).digest('hex');
const IDS = ['service-permits', 'warehouse-fulfilment', 'clinic-appointments', 'parcel-lockers', 'library-reservations'];
// The three projects of round 4 draft exactly as before the two briefs of round 6 joined them: their record counts per
// chapter, as kept before this round. Chapter 9 is read against the kept evidence instead, because the resilience drafts
// (security-domain.js resilienceDrafts) change it when the lead wires them into the Chapter 9 journey rule.
const EXISTING_COUNTS = {'service-permits': {1: 24, 2: 5, 3: 3, 4: 5, 5: 5, 6: 10, 7: 5, 8: 11, 10: 15, 11: 1}, 'warehouse-fulfilment': {1: 24, 2: 7, 3: 4, 4: 7, 5: 7, 6: 14, 7: 7, 8: 15, 10: 21, 11: 1}, 'clinic-appointments': {1: 24, 2: 6, 3: 4, 4: 6, 5: 6, 6: 12, 7: 6, 8: 13, 10: 18, 11: 1}};
// The two briefs of round 6 are the shorter form: 600–750 words, like a brief an architect is handed in one sitting.
const ROUND6 = {'parcel-lockers': {party: /Couriers|Residents|Locker stations/, rate: /20 deposits per second/}, 'library-reservations': {party: /Library members|Catalogue system/, rate: /1000 holds per hour/}};
const CHAPTER_TITLES = Object.fromEntries(CHAPTERS.map(c => [c.id, c.title]));
const registered = p => Object.entries(REGISTERS).flatMap(([ch, f]) => f(p).map(r => ({ch: Number(ch), r})));

// ---------------------------------------------------------------- 1. the catalogue and the briefs
{
  assert.deepEqual(REFERENCE_PROJECTS.map(r => r.id), IDS);
  for (const r of REFERENCE_PROJECTS) assert.deepEqual(Object.keys(r).sort(), ['brief', 'description', 'id', 'title'], `${r.id}: the catalogue holds only what the picker shows`);
  assert.doesNotMatch(readFileSync('public/reference-projects.js', 'utf8'), /\bimport\b/, 'the Projects route loads the catalogue alone: no interpreter, drafter or guided chain');
  for (const r of REFERENCE_PROJECTS) {
    const text = referenceBrief(r.id), n = (text.match(/\S+/g) || []).length, b = interpretBrief(text, {name: r.title});
    assert.equal(text.split('\n')[0], r.brief, `${r.id}: the picker's line is the brief's first line`);
    assert.ok(n >= 500 && n <= 1500, `${r.id}: the brief is 500–1,500 words (${n})`);
    if (ROUND6[r.id]) { assert.ok(n >= 600 && n <= 750, `${r.id}: the round 6 brief is 600–750 words (${n})`); assert.match(text, ROUND6[r.id].rate, `${r.id}: the brief states a rate the scale readings can derive from`); assert.ok(b.actors.some(a => ROUND6[r.id].party.test(a.title)), `${r.id}: the brief names an actor outside the design`); }
    assert.ok(text.length <= BRIEF_LIMIT);
    assert.match(text, /AIW authored teaching example/);
    assert.match(text, /illustrative/);
    for (const section of ['Context:', 'Goals:', 'Stakeholders:', 'Users:', 'Scope:', 'Journey:', 'Requirements:', 'Constraints:', 'Assumptions:', 'Open questions:', 'In scope:', 'Out of scope:']) assert.ok(text.includes('\n' + section), `${r.id}: the brief has ${section}`);
    assert.ok(/\n1\. /.test(text) && /\n2\. /.test(text), `${r.id}: the journey is numbered steps`);
    assert.ok(b.requirements.some(x => x.priority === 'Must') && b.requirements.some(x => x.priority === 'Should'), `${r.id}: requirements with must and should`);
    assert.ok(b.constraints.some(x => /regulation/i.test(x.description)), `${r.id}: a constraint names a regulation`);
    assert.ok(b.constraints.some(x => /\b(?:live|in production) by\b/i.test(x.description)), `${r.id}: a constraint sets a deadline`);
    for (const kind of ['outcomes', 'stakeholders', 'actors', 'scope', 'journeys', 'assumptions']) assert.ok(b[kind].length >= 1, `${r.id}: the brief yields ${kind}`);
    assert.ok(b.scope.some(s => s.scopeMode === 'in') && b.scope.some(s => s.scopeMode === 'out'), `${r.id}: in and out of scope`);
    assert.ok(b.questions.some(q => q.passages?.length), `${r.id}: the brief asks its own open questions`);
  }
  assert.equal(referenceBrief('bank-payment'), null);
  assert.equal(referenceBrief('blank'), null);
  pass('five briefs, each written as an architect receives it (500–1,500 words: context, goals, stakeholders and users, in and out of scope, numbered journey steps, must and should requirements, a regulation and a deadline, assumptions, open questions), labelled an AIW authored teaching example; the picker\'s line is each brief\'s first line and the catalogue imports nothing');
}

// ---------------------------------------------------------------- 2. each project, the pipeline's own output
const projects = {};
for (const r of REFERENCE_PROJECTS) {
  const name = r.title, text = referenceBrief(r.id), brief = interpretBrief(text, {name}), ids = new Set(brief.passages.map(x => x.id));
  const p = createProject({name, template: r.id, brief: 'A typed brief beside a reference journey is not read.'}, 'ref-' + r.id, at);
  projects[r.id] = p;
  // The brief, kept first, counted as a typed brief is.
  const kept = p.coauthoring.sources[0];
  assert.equal(p.coauthoring.sources.length, 1);
  assert.deepEqual([kept.id, kept.kind, kept.text, kept.hash, kept.addedAt], ['SRC-001', 'brief', text, sha(text), at], `${r.id}: the brief is the first evidence source, whole, with its SHA-256`);
  assert.equal(kept.versions[0].status, 'Unconfirmed');
  assert.match(kept.versions[0].location, new RegExp(`^Reference brief of the AIW reference journey ${r.id} .* · text SHA-256 ${sha(text)}$`));
  assert.equal(p.brief.problem, text);
  assert.equal(p.brief.confirmed, false);
  assert.equal(p.brief.goal, brief.outcomes.find(o => o.confidence === 'stated').description, `${r.id}: the goal is the first outcome the brief states`);
  assert.ok(text.replace(/\s+/g, ' ').includes(p.brief.goal), `${r.id}: the goal is in the brief's own words`);
  assert.deepEqual(p.brief.interpreted, {rules: BRIEF_RULES, at, sourceId: 'SRC-001', textHash: sha(text), ...briefCounts(brief)}, `${r.id}: brief.interpreted counted as for a typed brief`);
  assert.deepEqual(p.workspace.reference, {id: r.id, authority: REFERENCE_AUTHORITY, drafted: REFERENCE_DRAFTED, verified: false});
  assert.deepEqual([REFERENCE_AUTHORITY, REFERENCE_DRAFTED], ['AIW authored illustration', 'journey-rules-1 from the brief']);
  assert.equal(p.workspace.template, r.id);
  // Every proposal of the brief is a Chapter 1 record; every chapter holds records; every record carries its journey
  // provenance.
  const TYPE = {requirements: 'requirement', outcomes: 'outcome', journeys: 'journey', actors: 'actor', stakeholders: 'stakeholder', scope: 'scope', constraints: 'constraint', assumptions: 'assumption'};
  for (const [kind, type] of Object.entries(TYPE)) assert.equal(p.artefacts.filter(a => a.type === type).length, brief[kind].length, `${r.id}: every ${type} the brief states is a Chapter 1 record`);
  const all = registered(p);
  for (let ch = 1; ch <= 11; ch++) assert.ok(all.some(x => x.ch === ch), `${r.id}: Chapter ${ch} holds a record`);
  for (const {ch, r: rec} of all) {
    const j = rec.provenance?.journey, label = `${r.id}: Chapter ${ch} ${rec.ref || rec.id || 'narrative'}`;
    assert.ok(j, `${label} carries provenance.journey`);
    assert.deepEqual([j.mode, j.at], ['deterministic', at], `${label}: drafted by the rules, at creation`);
    assert.equal(j.chapter, ch, `${label}: marked by the chapter that created it (${j.chapter})`);
    for (const id of j.passages) assert.ok(ids.has(id), `${label}: ${id} is a passage of the kept brief`);
    assert.ok(j.passages.length || j.upstream.length, `${label} cites a passage or an upstream record`);
    if (ch === 1) assert.ok(j.passages.length, `${label} cites the passage it was read from`);
    const {chapter, at: when, ...raw} = j;
    assert.deepEqual(journeyProvenance(p, raw), raw, `${label}: its provenance passes the guide's own check`);
  }
  // The records are the ones draftJourney drafts from the same kept brief: same ids, same titles, chapter by chapter.
  const base = createProject({name, template: 'blank', brief: text}, 'base-' + r.id, at, {briefHash: sha(text)});
  const run = draftJourney(base, {brief, at});
  for (let ch = 1; ch <= 10; ch++) assert.deepEqual(REGISTERS[ch](p).map(x => [x.id, x.title]), REGISTERS[ch](run.document).map(x => [x.id, x.title]), `${r.id}: Chapter ${ch} holds exactly what the journey drafts`);
  const links = d => d.relationships.map(x => [x.from, x.kind, x.to]);
  assert.ok(p.relationships.length > 0);
  assert.deepEqual(links(p), links(run.document), `${r.id}: Chapter 1 holds exactly the links the journey drafts`);
  const framing = n => ['summary', 'scope', 'approach', 'audience', 'owner'].map(k => n[k]);
  assert.deepEqual(framing(p.finalReview.narrative), framing(run.document.finalReview.narrative), `${r.id}: Chapter 11 frames the SDD exactly as the journey drafts it`);
  assert.equal(run.document.finalReview.narrative.title, name + ' — Solution Design', `${r.id}: the drafter titles the SDD as createProject does`);
  assert.deepEqual(run.chapters.flatMap(d => d.records.filter(x => x.blocked).map(x => x.key)), [], `${r.id}: no drafted record was blocked`);
  // Chapter 8 data: the drafter's key and status fields.
  assert.ok(p.interfaces.data.length >= 1);
  for (const d of p.interfaces.data) { assert.ok(d.fields.some(f => f.key && f.required), `${r.id}: ${d.ref} has a required key field`); assert.ok(d.fields.some(f => f.name === 'status'), `${r.id}: ${d.ref} has a status field`); }
  // The SDD's title is the project's own.
  assert.equal(p.finalReview.narrative.title, name + ' — Solution Design');
  // Nothing confirmed, reviewed, frozen, approved or handed off.
  assert.deepEqual(all.filter(x => x.r.confirmed === true || x.r.targetConfirmed === true).map(x => x.r.id), [], `${r.id}: nothing is confirmed`);
  assert.ok(p.quality.drivers.every(d => d.targetConfirmed === false));
  assert.deepEqual(recordedActs(p), {chapterReviews: 0, chapterHandoffs: 0, reviews: 0, baselines: 0, governance: 0, handoff: 0}, `${r.id}: no review, baseline, governance or handoff`);
  assert.equal((p.guidance?.sessions || []).length, 0, `${r.id}: no guide session is recorded on anyone's behalf`);
  // The chapters' own checks: no source-change and no key finding; a drafted record is to confirm, never passing.
  for (const c of CHAPTERS) assert.deepEqual(c.checks(p).filter(f => f.code === 'source-change' || f.code === 'key').map(f => f.code + ':' + (f.objectId || '')), [], `${r.id}: Chapter ${c.id} raises no source-change or key finding`);
  const own = new Set(all.map(x => x.r.id).filter(Boolean));
  for (let ch = 1; ch <= 10; ch++) for (const x of chapterChecks(p, ch).passages.filter(x => own.has(x.id) && x.from === undefined)) {
    assert.ok(x.confirm.some(c => c.id === 'journey:' + x.id), `${r.id}: ${x.ref} is to confirm as a drafted record`);
    assert.notEqual(x.status, 'pass', `${r.id}: ${x.ref} is not passing`);
  }
  assert.ok(chapterChecks(p, 11).passages.find(x => x.id === 'ownership').confirm.some(c => c.id === 'journey:narrative'), `${r.id}: the drafted framing is to confirm`);
  // No banking seed in another domain.
  // The bank's own titles, at the start of a record's title: the parcel-locker brief's "Late fee payment service" is its own.
  assert.ok(!all.some(x => /Bank Payment|^Payment service|Risk engine|Core connector|Settlement contract/i.test(x.r.title || '')), `${r.id}: no banking seed leaks in`);
  // The same brief drafts the same project.
  assert.equal(JSON.stringify(createProject({name, template: r.id}, 'ref-' + r.id, at)), JSON.stringify(p), `${r.id}: the same brief drafts the same project, and a typed brief beside it changes nothing`);
  // The three projects of round 4 hold exactly the records they held before the two briefs of round 6 joined them.
  if (EXISTING_COUNTS[r.id]) for (const [ch, n] of Object.entries(EXISTING_COUNTS[r.id])) assert.equal(REGISTERS[ch](p).length, n, `${r.id}: Chapter ${ch} holds ${n} records, as before round 6`);
  // The two briefs of round 6 reach the parties outside the design and the numbers the scale readings read.
  if (ROUND6[r.id]) { assert.ok(p.interfaces.parties.length >= 2, `${r.id}: at least two parties outside the design`); assert.ok(p.quality.drivers.some(d => d.category === 'scalability' && Number(d.targetValue) > 0), `${r.id}: a scalability driver with a number`); }
}
pass('each of the five reference projects is the pipeline\'s own output: its brief kept first (kind brief, SHA-256, text), counted as a typed brief and its first stated outcome the goal; every proposal of the brief a Chapter 1 record; records in all eleven chapters, exactly the records and links draftJourney drafts from that brief; every record with provenance.journey (deterministic, at creation, passages of the kept brief, the guide\'s own check; its own chapter, except the Chapter 6 mark the guide writes over a Chapter 5 component); Chapter 8 data keyed with a status field; "<name> — Solution Design"; nothing confirmed, reviewed, frozen, approved or handed off; no source-change or key finding; drafted records to confirm, never passing; workspace.reference says what it is; deterministic');

// ---------------------------------------------------------------- 3. through the Worker, and the kept evidence
const evidence = JSON.parse(readFileSync(EVIDENCE_FILE, 'utf8'));
{
  assert.match(evidence.authority, /Not a customer project/);
  assert.match(evidence.authority, /not .*production acceptance/);
  assert.equal(evidence.productionAccepted, false);
  assert.deepEqual(evidence.rules, {brief: BRIEF_RULES, drafted: REFERENCE_DRAFTED, referenceAuthority: REFERENCE_AUTHORITY});
  assert.deepEqual(evidence.results.map(r => r.id), IDS);
  const {api, close} = localWorker();
  try {
    for (const ref of REFERENCE_PROJECTS) {
      const {project, exports} = await referenceThroughWorker(api, ref), kept = evidence.results.find(r => r.id === ref.id), now = measure(project);
      assert.equal(project.name, ref.title);
      assert.deepEqual(project.workspace.reference, {id: ref.id, authority: REFERENCE_AUTHORITY, drafted: REFERENCE_DRAFTED, verified: false});
      for (const key of Object.keys(now)) assert.deepEqual(kept[key], now[key], `${ref.id}: evidence ${key} is current (node scripts/reference-projects-evidence.mjs)`);
      // Round 6: the evidence measures the scale readings and the resilience drafts too, and applies none of them.
      assert.ok(kept.scale && Number.isInteger(kept.scale.inputs) && kept.resilience && Number.isInteger(kept.resilience.drafts), `${ref.id}: evidence measures scale and resilience`);
      assert.equal(kept.resilience.missing, kept.resilience.externalContracts - kept.resilience.disruptionThreats, `${ref.id}: every contract to a party outside the design is to confirm for its disruption unless the drafter already proposed its pair; nothing is confirmed`);
      assert.equal(kept.briefSha256, sha(referenceBrief(ref.id)));
      for (const [f, x] of Object.entries(kept.sdd)) assert.ok(Number.isInteger(x) && x > 0, `${ref.id}: evidence ${f}`);
      // The working SDD in Markdown, JSON and HTML: the architecture edition (round 12, F), titled on its cover; the chapter
      // registers and the kept brief are its review registers annex.
      const md = exports.md.text, json = JSON.parse(exports.json.text), html = exports.html.text, registers = exports.registers.text;
      assert.match(exports.md.disposition, /^attachment; filename="AIW_[A-Za-z_]+_Working_SDD\.md"$/);
      assert.ok(isArchitectureEdition(md) && md.startsWith('<!-- aiw:cover -->\n# ' + ref.title.toUpperCase() + '\n'), `${ref.id}: the SDD is titled with the project's name`);
      assert.ok(!md.includes('Bank Payment Journey — Solution Design'));
      assert.ok(registers.includes('## Detailed chapter registers'));
      for (let ch = 1; ch <= 10; ch++) assert.ok(registers.includes(`\n# Chapter ${ch} — ${CHAPTER_TITLES[ch]}\n`), `${ref.id}: the registers annex holds the Chapter ${ch} register`);
      for (const ref2 of ['REQ-001', 'QD-001', 'ADR-001', 'LR-001', 'APP-001', 'TC-001', 'TR-001', 'IF-001', 'DAT-001', 'SEC-001', 'RUN-001', 'SRC-001']) assert.ok(md.includes(ref2) && registers.includes(ref2), `${ref.id}: the SDD and its registers name ${ref2}`);
      assert.ok(registers.includes(ref.brief), `${ref.id}: the registers annex carries the kept brief`);
      assert.equal(json.project.workspace.reference.verified, false);
      assert.deepEqual([json.project.finalReview.baselines.length, json.project.finalReview.reviews.length, json.project.finalReview.governance.length, json.project.finalReview.handoff], [0, 0, 0, null]);
      assert.equal(json.markdown, md, `${ref.id}: the JSON export carries the same SDD`);
      assert.ok(json.connectedModel.nodes.length > 0);
      assert.match(exports.html.policy, /default-src 'none'/);
      assert.ok(!/<script/i.test(html));
      for (const token of ['<svg', '<table', '5. Architecture models', ref.title.toUpperCase()]) assert.ok(html.includes(token), `${ref.id}: the HTML SDD holds ${token}`);
    }
  } finally { close(); }
}
pass('through the Worker: POST /api/projects creates each reference from its template id; its working SDD exports as Markdown, JSON and HTML (the architecture edition, titled on its cover) with the chapters\' registers and the kept brief in its review registers annex, and nothing frozen or approved; evidence/reference-projects.json says it is no acceptance, and its counts are the counts measured now');

// ---------------------------------------------------------------- 4. round 12 (GR-REQ-17): seeds carry this release's readings
// A seeded responsibility and component, of the Bank Payment reference and of each reference journey, keep the ids of the
// drivers (and decisions) that bore on them (G-32), as a record a person saves now does. A driver added later that names
// the responsibility reaches it and the components that realise it as a link (they read it among their drivers), and
// marks none of them changed: nothing is marked by the seed's age, as for a responsibility a person saved in this release.
{
  const {applyQualityCommand} = await import('./public/quality-domain.js');
  const {logicalSourceChanged, driversForResponsibility} = await import('./public/logical-domain.js');
  const {componentSourceChanged, componentSources} = await import('./public/realisation-domain.js');
  const {withFinalReview} = await import('./public/review-domain.js');
  const marked = q => [...q.logical.responsibilities.filter(r => logicalSourceChanged(q, r)).map(r => r.id), ...q.realisation.components.filter(c => componentSourceChanged(q, c)).map(c => c.id)];
  const cases = [['bank-payment', withFinalReview(createProject({name: 'Bank Payment', template: 'bank-payment'}, 'ref-bank-payment', at))], ...Object.entries(projects).map(([id, p]) => [id, withFinalReview(p)])];
  for (const [id, p] of cases) {
    const r = p.logical.responsibilities[0], realisers = p.logical.mappings.filter(m => m.logicalId === r.id).map(m => m.physicalId);
    assert.ok(Array.isArray(r.sourceDriverIds), `${id}: a seeded responsibility keeps the ids of the drivers that bore on it`);
    assert.ok(p.realisation.components.every(c => Array.isArray(c.sourceDriverIds) && Array.isArray(c.sourceDecisionIds)), `${id}: each seeded component keeps the ids of its drivers and decisions`);
    assert.ok(realisers.length, `${id}: the responsibility is realised by a component`);
    const before = marked(p);
    const q = applyQualityCommand(p, {type: 'quality.driver', payload: {category: 'availability', title: 'Stays available for ' + r.title, stimulus: 'A zone fails.', conditions: 'At the busiest hour.', response: 'The other zone answers.', responsibilityIds: [r.id]}}, at).document, d = q.quality.drivers.at(-1);
    assert.ok(driversForResponsibility(q, r).some(x => x.id === d.id), `${id}: the new driver reaches the responsibility`);
    for (const c of realisers) assert.ok(componentSources(q, c).drivers.some(x => x.id === d.id), `${id}: and the component ${c} that realises it`);
    assert.deepEqual(marked(q), before, `${id}: adding the driver marks neither the responsibility nor its components changed`);
  }
  pass('round 12: a seeded responsibility and component (the Bank Payment reference and each reference journey) keep the ids of the drivers and decisions that bore on them; a driver added later that names the responsibility reaches it and its components, and marks none of them changed by the seed\'s age');
}

console.log(JSON.stringify({passed: checks.length, checks, measured: evidence.results.map(r => ({id: r.id, records: r.provenance.records, withJourney: r.provenance.withJourney, readiness: {passing: r.readiness.passing, toFix: r.readiness.toFix, toConfirm: r.readiness.toConfirm}, openAnswers: r.gaps.openAnswers, sdd: r.sdd})), limits: ['The reference projects are AIW authored illustrations drafted by deterministic rules from AIW authored briefs; nothing in them is confirmed, reviewed or accepted.']}, null, 2));
