import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {brotliDecompressSync} from 'node:zlib';
import {richProject, contentReadySyntheticProject, largeProject, depthProject, blankProject, modularProject} from './sdd-fixtures.mjs';
import {sddDocument, sddPackage} from './public/sdd-document.js';
import {CONTENT_STANDARD, SKELETON_BANNER, SHORT_BANNER, contentReading, findingLines, sddFormatOf, parseArchitectureEdition} from './public/sdd-content.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {contentAuthoringQueue, contentAuthoringTask} from './public/sdd-authoring.js';

// A Markdown edition is reread from its actual text. AIW's JSON SDD package contains the content reading,
// rather than duplicating the Markdown: validate that embedded reading and say that it was not recomputed.
export function exportedContent(file) {
  const source = readFileSync(file, 'utf8');
  if (/\.md$/i.test(file)) return {reading: contentReading(source), basis: 'recomputed from the exported Markdown'};
  if (!/\.json$/i.test(file)) throw Error('Provide an exported architecture SDD as .md or .json.');
  const data = JSON.parse(source);
  if (typeof data.markdown === 'string') return {reading: contentReading(data.markdown), basis: 'recomputed from the exported JSON Markdown'};
  if (data.edition !== 'architecture' || data.audience !== 'all') throw Error('The JSON must contain the complete architecture edition for everyone.');
  const r = data.content;
  if (!r || !Array.isArray(r.sections) || !Array.isArray(r.findings) || typeof r.pass !== 'boolean' || typeof r.score !== 'number' ||
      !CONTENT_STANDARD.sections.every(n => r.sections.some(s => s.n === n && typeof s.pass === 'boolean' && typeof s.records === 'number')))
    throw Error('The JSON does not contain AIW’s complete section-by-section content reading. Export the architecture edition again.');
  // Do not upgrade a partial or inconsistent embedded reading to a passing result.
  const expected = r.sections.length === CONTENT_STANDARD.sections.length && r.sections.every(s => s.pass && s.present && s.records > 0 && !s.skeleton) && r.findings.length === 0 && r.score === 100;
  return {reading: {...r, pass: r.pass && expected}, basis: 'read from the exported JSON content report; the package contains no Markdown to recompute'};
}

if (process.argv[2]) {
  const {reading: r, basis} = exportedContent(path.resolve(process.argv[2]));
  console.log('Content readiness: ' + r.line + ' (' + basis + ')');
  for (const f of r.findings.slice(0, 50)) console.log(`${f.section} · ${f.kind} ${f.ref} · ${f.field}: ${f.detail}`);
  if (r.findings.length > 50) console.log(`And ${r.findings.length - 50} further findings.`);
  if (!r.pass) process.exitCode = 1;
} else {
  // A populated register with thin prose is correctly diagnosed, with actionable per-record tasks.
  const {document: thin} = await richProject();
  const doc = sddDocument(thin, {figures: false}), content = doc.content;
  assert(content.records > 20, 'the synthetic design has substantial material to judge');
  assert.equal(content.pass, false, 'having populated registers is not sufficient SDD content readiness');
  assert(content.score < 50, `the design prose is still thin (${content.score} %) and should be reported`);
  assert(content.sections.some(s => s.skeleton), 'incomplete sections are named as skeletons');
  assert(doc.markdown.includes(SHORT_BANNER), 'the warning appears where the reader meets the section');
  assert(!doc.markdown.includes(SKELETON_BANNER), 'records not drafted by rules never read "Sol has not drafted it"');
  assert(doc.markdown.includes('Content readiness: ' + content.line), 'the cover reports content readiness');
  assert(findingLines(content).some(line => /^[234] · /.test(line)), 'individual prose defects remain traceable');
  const queue = contentAuthoringQueue(content);
  assert.equal(queue.tasks, content.findings.length, 'every defect has an authoring task');
  assert(queue.records.length < queue.tasks, 'several missing fields on one record stay grouped by source record');
  const description = queue.records.flatMap(r => r.tasks).find(t => t.section === 2 && t.field === 'description');
  assert.equal(description.chapter, 2); assert.equal(description.editor, 'driver');
  assert.match(description.question, /source require.*cite the requirement/i, 'the task asks for a source fact, not a generated answer');
  const rationale = queue.records.flatMap(r => r.tasks).find(t => t.section === 3 && t.field === 'rationale');
  assert.equal(rationale.chapter, 3); assert.equal(rationale.editor, 'decision');
  assert.equal(contentAuthoringTask({section: 3, kind: 'decision', ref: 'ADR-1', title: 'A choice', field: 'alternative:ALT-1', check: 'why-not', detail: 'missing'}).field, 'rejectionReason');
  assert(queue.missing > 0 && content.met < content.records, 'unknown answers remain tasks rather than fabricated SDD prose');

  // A genuinely written synthetic architecture passes; its working draft still has no human approval.
  const {document: rich} = await contentReadySyntheticProject();
  const finished = sddDocument(rich, {figures: false});
  assert.equal(finished.content.pass, true, finished.content.line);
  assert.equal(finished.content.score, 100);
  assert.equal(finished.content.findings.length, 0);
  assert(finished.content.sections.every(s => s.pass && s.records > 0));
  assert(!finished.markdown.includes(SKELETON_BANNER));
  assert.match(finished.markdown, /not approved/i, 'content quality never confers approval');
  const marked = finished.markdown.replace(/^(# 2\. [^\n]+\n\n)/m, '$1**' + SKELETON_BANNER + '.**\n\n');
  assert.equal(contentReading(marked).pass, false, 'an exported skeleton banner is binding even without the source project');
  const markedShort = contentReading(finished.markdown.replace(/^(# 3\. [^\n]+\n\n)/m, '$1**' + SHORT_BANNER + '.**\n\n'));
  assert.equal(markedShort.pass, false, 'so is the banner of a section that falls short');
  assert.deepEqual(markedShort.sections.find(s => s.n === 3).reasons, ['the exported section is marked as short of the content standard']);
  const missing = structuredClone(rich);
  missing.realisation.components[0].purpose = 'Accepts instructions.';
  const almost = sddDocument(missing, {figures: false}).content;
  assert.equal(almost.pass, false, 'a section with one missing responsibility fails even below the skeleton density threshold');
  assert(almost.findings.some(f => f.kind === 'component' && f.check === 'responsibilities'));

  // A large, rules-tagged skeleton cannot acquire a content pass by having many records or a fast export.
  const {document: large} = await largeProject({rows: 1400});
  for (const r of [...large.quality.drivers, ...large.decisions.records, ...large.realisation.components, ...large.interfaces.parties])
    r.provenance = {...r.provenance, draft: {...r.provenance?.draft, engine: 'rules'}};
  const rules = sddDocument(large, {figures: false});
  assert.equal(large.artefacts.filter(a => a.type === 'requirement').length, 1400);
  assert.equal(rules.content.pass, false);
  assert(rules.content.sections.every(s => s.skeleton && s.rulesShare >= 0.5), 'rules drafting is labelled in every design section');
  assert.equal((rules.markdown.match(new RegExp(SKELETON_BANNER, 'g')) || []).length, 3, 'all three sections warn in place');
  // The same thin design drafted by Sol with the model (round 23): it still falls short, and says so, but never that Sol
  // has not drafted it.
  const modelled = structuredClone(large);
  for (const r of [...modelled.quality.drivers, ...modelled.decisions.records, ...modelled.realisation.components, ...modelled.interfaces.parties])
    r.provenance = {...r.provenance, draft: {...r.provenance?.draft, engine: 'model'}};
  const model = sddDocument(modelled, {figures: false});
  assert.equal(model.content.pass, false);
  const short = model.content.sections.filter(s => s.skeleton);
  assert.deepEqual(short.map(s => [s.n, s.rulesShare, s.reasons.length]), [[3, 0, 1]], 'its decisions fall short on what they leave open alone, not on who drafted them');
  assert.equal((model.markdown.match(new RegExp(SHORT_BANNER, 'g')) || []).length, 1, 'that section says it falls short of the standard');
  assert(!model.markdown.includes(SKELETON_BANNER), 'and no section says Sol has not drafted it');
  assert.match(model.content.line, /section 3 falls short of the standard, marked in place/);

  // Round 24 (D-24-06): format 1 (every "open: …" in place) and format 2 (a record prints what is stated; each section's
  // open questions name the rest; each record's marker names what it leaves open) of the same design read the same:
  // score, records, met and findings per section, as built with the records and as reread without them. An integration's
  // question, which the standard counts as stated, is found asked in both.
  const asked = structuredClone(thin);
  {
    const d = asked.quality.drivers.find(x => !x.description), dec = asked.decisions.records.find(x => !x.rationale && x.id !== 'ADR-001'), q = 'Which contracts, authentication method and reconciliation rules govern the requests?';
    d.open = {...d.open, description: {state: 'open-question', question: 'What must the posting path guarantee to the customer?'}};
    dec.open = {...dec.open, rationale: {state: 'open-question', question: 'Which driver decides this choice?'}, impact: {state: 'open-question', question: 'What changes once it is decided?'}};
    for (const party of asked.interfaces.parties) {
      const open = {...party.open};
      for (const f of ['dataFormats', 'protocols', 'securityConsiderations']) if (!String(party[f] || '').trim()) open[f] = {state: 'open-question', question: q};
      // A question written without its question mark: the reader of format 1 takes no question from its marker.
      if (!String(party.challenges || '').trim()) open.challenges = {state: 'open-question', question: 'Who handles a missed cut-off'};
      party.open = open;
    }
  }
  const plainOf = r => JSON.parse(JSON.stringify(r)), clinic = withFinalReview(createProject({name: 'Clinic appointments', template: 'clinic-appointments'}, 'clinic-sdd', '2026-10-01T09:00:00Z'));
  const recordsOf = p => ({2: p.quality?.drivers || [], 3: p.decisions?.records || [], 4: [...(p.realisation?.components || []), ...(p.interfaces?.parties || [])]});
  const readings = [];
  for (const [name, p] of [['rich', thin], ['rich, asked', asked], ['depth', (await depthProject()).document], ['content-ready', rich], ['clinic', clinic], ['large, rules', large], ['large, Sol', modelled], ['blank', blankProject()]]) {
    const one = architectureMarkdown(p, {format: 1}), two = architectureMarkdown(p, {format: 2});
    assert.equal(sddFormatOf(one.markdown), 1, name + ': format 1 carries no marker'); assert.equal(sddFormatOf(two.markdown), 2, name + ': format 2 names itself');
    assert.deepEqual(plainOf(two.content), plainOf(one.content), name + ': the same reading as built');
    assert.deepEqual(plainOf(contentReading(two.markdown)), plainOf(contentReading(one.markdown)), name + ': the same reading of the Markdown alone');
    assert.deepEqual(plainOf(contentReading(two.markdown, {records: recordsOf(p)})), plainOf(contentReading(one.markdown, {records: recordsOf(p)})), name + ': the same reading of the Markdown with its records');
    const r = two.content;
    readings.push(name + ' ' + r.score + ' % (' + r.met + '/' + r.records + ', ' + r.findings.length + ' findings' + '; ' + r.sections.map(x => x.n + ': ' + x.met + '/' + x.records + (x.skeleton ? ' short' : '')).join(', ') + ')');
    if (name === 'rich, asked') {
      // Nothing a format-2 record leaves open is hidden from the reading: without the records' markers it reads no better
      // (a question asked is then not found), and a stated line deleted by hand reads as open.
      const bare = contentReading(two.markdown.replace(/^<!-- aiw:open [^>]*-->\n\n/gm, ''));
      assert.ok(bare.met <= r.met && bare.findings.length > r.findings.length, 'without its markers the edition reads no better: ' + bare.line);
      const cut = two.markdown.replace(/^(\*\*BD1: [^\n]+\*\*\n\n)Description: [^\n]+\n\n/m, '$1'), lessOne = contentReading(cut);
      assert.ok(cut !== two.markdown && lessOne.sections[0].open === contentReading(two.markdown).sections[0].open + 1 && lessOne.findings.some(f => f.ref === 'BD1' && f.field === 'description'), 'a description deleted by hand reads as open');
    }
  }
  // Round 24 (D-24-03): a design organised by module (sdd-fixtures.mjs modularProject: the synthetic register imported
  // with its modules and drafted by module, with an integration, an invariant and a component of no module added) reads
  // the same in format 1, in format 2 and in format 2 by module: the same records field by field, the same score and
  // counts per section and the same findings, as built and reread, with and without the records. Format 2 by module
  // prints them in another order (module by module), so the findings are compared as a set.
  {
    const {document: mp} = await modularProject({rows: 400}), recordsOf_ = recordsOf(mp);
    const one = architectureMarkdown(mp, {format: 1}), flat = architectureMarkdown(mp, {format: 2, modules: false}), by = architectureMarkdown(mp, {format: 2});
    assert.ok(by.markdown.includes('\n## Module overview\n') && !flat.markdown.includes('\n## Module overview\n'), 'modules: format 2 prints section 4 by module');
    const mapped = r => JSON.parse(JSON.stringify(r, (k, v) => (v instanceof Map ? [...v] : v))), byRef = xs => mapped(xs).sort((a, b) => a.ref.localeCompare(b.ref));
    const P1 = parseArchitectureEdition(flat.markdown), P2 = parseArchitectureEdition(by.markdown);
    assert.deepEqual(byRef(P2.components), byRef(P1.components), 'modules: the same components, field by field');
    assert.deepEqual(byRef(P2.integrations), byRef(P1.integrations), 'modules: the same integrations, field by field');
    const key = f => [f.section, f.kind, f.ref, f.field, f.check, f.detail].join('|'), counts = r => ({score: r.score, met: r.met, records: r.records, pass: r.pass, line: r.line, sections: r.sections.map(({findings: _f, ...x}) => x)});
    for (const [how, read] of [['as built', d => d.content], ['reread', d => contentReading(d.markdown)], ['reread with its records', d => contentReading(d.markdown, {records: recordsOf_})]]) {
      assert.deepEqual(plainOf(read(flat)), plainOf(read(one)), 'modules, ' + how + ': formats 1 and 2 read the same');
      assert.deepEqual(plainOf(counts(read(by))), plainOf(counts(read(flat))), 'modules, ' + how + ': by module, the same score and counts per section');
      assert.deepEqual(read(by).findings.map(key).sort(), read(flat).findings.map(key).sort(), 'modules, ' + how + ': by module, the same findings');
    }
    const r = by.content;
    readings.push('modules ' + r.score + ' % (' + r.met + '/' + r.records + ', ' + r.findings.length + ' findings' + '; ' + r.sections.map(x => x.n + ': ' + x.met + '/' + x.records + (x.skeleton ? ' short' : '')).join(', ') + '; format 1, format 2 and format 2 by module)');
  }
  // Round 25 (D-25-07, D-25-09): the reader takes the mark of an assessment AIW's rules drafted from the SA Playbook for
  // provenance, as it takes Sol's, never for the reason's prose; it keeps AIW's reading of an alternative not chosen apart
  // from a reason, so the question why it was not chosen stays open; and the drivers' lean of an open decision, which
  // names one of the alternatives under consideration again, is no proposal and counts no alternative twice.
  {
    const s3 = ['# 3. Architecture decisions', '### ADR-001 · Where should the reference be checked?', '**Decision**: ALT-001 · Check at the boundary (the working choice of a draft decision, not yet accepted).', '**Justification**: The boundary sees every request (QD1).',
      '- Integrity (QD1): supports it — One check sees every posting. (drafted by AIW’s rules from the SA Playbook, not reviewed by a person)\n- Speed (QD2): is in tension with it — A lookup adds a round trip. (Sol’s assessment, not reviewed by a person)',
      '**Alternatives considered**:', '- ALT-002 · Check in a cache: A cache holds recent references. AIW’s reading: dominated by ALT-001.', '**Impact**: Every request carries its reference.',
      '### ADR-002 · Where should statements be produced?', '**Decision**: Open: no alternative is chosen yet. Under consideration: ALT-003 · Produce on demand; ALT-004 · Produce overnight. The drivers lean to ALT-004 · Produce overnight (AIW’s reading of the recorded effects at the default weights; not a choice).', '## Trade-off analysis', ''].join('\n\n');
    for (const format of [1, 2]) {
      const [a, b] = parseArchitectureEdition(s3, {format}).decisions, R = contentReading(s3, {format}), of = ref => R.findings.filter(f => f.ref === ref);
      assert.deepEqual(a.drivers.map(x => [x.code, x.reason, x.rules, x.sol]), [['QD1', 'One check sees every posting.', true, false], ['QD2', 'A lookup adds a round trip.', false, true]], format + ': each mark read as provenance, the reason without it');
      assert.deepEqual(a.alternatives.map(x => [x.ref, x.title, x.summary, x.why, x.reading]), [['ALT-002', 'Check in a cache', 'A cache holds recent references.', '', 'dominated by ALT-001.']], format + ': AIW’s reading kept apart from the summary and from a reason');
      assert.ok(of('ADR-001').some(f => f.field === 'alternative:ALT-002' && f.check === 'why-not') && !of('ADR-001').some(f => f.check === 'bookkeeping'), format + ': the reader still asks why ALT-002 was not chosen, and finds no bookkeeping in the reasons: ' + findingLines(R).join(' | '));
      assert.deepEqual([b.chosen, b.proposed, b.considered], [null, undefined, ['ALT-003', 'ALT-004']], format + ': the drivers’ lean is no proposal and names no alternative twice');
      assert.ok(of('ADR-002').some(f => f.check === 'open-decision' && f.detail === 'no alternative is chosen or proposed (2 alternatives under consideration)'), format + ': the decision reads as open');
    }
    console.log('PASS the reader takes the mark of an assessment AIW’s rules drafted for provenance, as it takes Sol’s; AIW’s reading of an alternative not chosen is kept apart from a reason, so the question stays open; the drivers’ lean is no proposal and counts no alternative twice');
  }
  // An exported file of the format before (format 1, no marker; evaluation/sdd-format1-readings.json.br, built by
  // scripts/build-sdd-format1-fixture.mjs in rc.10.73.24) reads exactly as it read then, finding by finding.
  const legacy = JSON.parse(brotliDecompressSync(readFileSync('evaluation/sdd-format1-readings.json.br')).toString('utf8'));
  assert.equal(legacy.schema, 'aiw.sdd-format1-readings-fixture.v1');
  assert.deepEqual(legacy.documents.map(d => d.name), ['rich', 'rich-asked', 'depth', 'content-ready', 'clinic', 'large']);
  for (const d of legacy.documents) {
    assert.equal(sddFormatOf(d.markdown), 1, d.name + ': a format-1 file');
    assert.deepEqual(plainOf(contentReading(d.markdown)), d.reading, d.name + ': an old exported file reads exactly as before');
  }
  console.log('PASS formats 1 and 2 of the same design read the same, as built and reread, with and without the records: ' + readings.join('; ') + '; ' + legacy.documents.length + ' files exported by ' + legacy.release + ' read exactly as they did then');

  // Both supported exported forms can be checked by path, independently of the in-memory project.
  const dir = mkdtempSync(path.join(tmpdir(), 'aiw-sdd-content-'));
  try {
    const good = path.join(dir, 'architecture.md'), bad = path.join(dir, 'rules.md'), json = path.join(dir, 'architecture.json');
    writeFileSync(good, finished.markdown); writeFileSync(bad, rules.markdown); writeFileSync(json, JSON.stringify(sddPackage(rich, finished)));
    assert.equal(exportedContent(good).reading.pass, true, 'the Markdown reread passes');
    assert.equal(exportedContent(bad).reading.pass, false, 'the rules Markdown reread fails');
    assert.equal(exportedContent(json).reading.pass, true, 'the JSON package carries complete content readiness');
  } finally { rmSync(dir, {recursive: true, force: true}); }
  console.log(`PASS SDD content: a complete synthetic architecture passes ${finished.content.met}/${finished.content.records} records; a 1,400-requirement rules skeleton and a one-field regression fail; a thin section Sol drafted says it falls short, never that Sol has not drafted it; Markdown and JSON exported paths are checked`);
}
