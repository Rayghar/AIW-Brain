// The change journal kept compact (round 12, PS-08; journal-archive.js), held as D-04's readings upgrade was:
//   1. pure and reversible: on a synthetic history of a drafted design's shape (thousands of changes, most superseded,
//      interface changes keeping their explanations twice), compacting is deterministic and idempotent, and expanding the
//      compacted journal with its archive pages gives back the journal it was made from, character for character;
//   2. every reading of the journal judges the same after it: the change summary, the causes, every latest change's
//      count and every affected record's state and stamp, the whole-change stamps, the SDD's change summary and the
//      review finding it raises, and every page of the journal's annex (Markdown, CSV, JSON), its archived changes read
//      back from the archive;
//   3. through storage: a project stored before round 12 (its journal whole) is stored compacted the first time it is
//      read (a storage upgrade, recorded once, the version it upgraded read back whole from its recovery point); the
//      annex through the export route, GET /api/changes and the project's JSON export (from which a project is restored)
//      read the journal whole; a recovery package carries it whole and its restore compacts it again; a project that
//      carries archived changes without their archive is refused by the recovery preview;
//   4. a save answers the journal as a delta, which the browser's store applies to the journal it holds (mergeSaved):
//      the journal it then holds is the one saved, and a review's answer carries the change it reviewed, not the journal.
// Run: npm run test:journal-archive
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview, finalFindings} from './public/review-domain.js';
import {changeEvents, changeSummary, changeCauses, currentChanges, changeItemState, causeStamp, isCurrentChange, changeTargetStamp, itemWhy, isArchived, JOURNAL_PAGE} from './public/changes-domain.js';
import {changeDigest, changeSummaryMarkdown} from './public/change-summary.js';
import {changeJournalPage, changeJournalMarkdown, changeJournalCSV} from './change-journal.js';
import {compactJournal, expandJournal, foldChange, ARCHIVE_EVENTS, decodeEvents} from './journal-archive.js';
import {readRecoveryPoint, storeStorageUpgrade} from './storage-upgrade.js';
import {readStoredProject} from './project-storage.js';
import {runRetention, retentionPolicy} from './retention.js';
import {packageText, assemblePackage} from './recovery-package.js';
import {mergeSaved} from './public/project-store.js';
import {addSyntheticJournal} from './scripts/synthetic-journal.mjs';
import {documentClone, handOver} from './public/document-memo.js';
import {applyCommand} from './public/requirements-domain.js';

const checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const at = '2026-10-08T00:00:00.000Z';
// The reference project with 200 more requirements (generated, no client text) and a synthetic history: 1,200 changes
// over 250 records, most of them superseded.
let base = handOver(withFinalReview(createProject({name: 'Journal archive · QA only', template: 'bank-payment'}, 'project-journal-archive', at)));
for (let n = 1; n <= 200; n++) base = handOver(applyCommand(base, {type: 'artefact', payload: {type: 'requirement', title: 'Generated requirement ' + n, description: 'The service keeps generated obligation ' + n + '.', acceptance: 'Given case ' + n + ', the outcome is kept.', owner: 'Generated owner', source: 'Synthetic', priority: 'Should', confirmed: n % 2 === 0}}, at).document);
const whole = withFinalReview(documentClone(base)), added = addSyntheticJournal(whole, {events: 1200, sources: 250, items: 12, reviewed: 0.05, seed: 7});
const J = whole.changes.events, text = JSON.stringify(J);

// ---------------------------------------------------------------- 1. pure and reversible
const one = compactJournal(J), two = compactJournal(documentClone(J));
assert.equal(JSON.stringify(one), JSON.stringify(two), 'the same journal compacts to the same journal and pages');
assert(one.pages.length > 1 && one.pages.every(p => p.length <= ARCHIVE_EVENTS));
const again = compactJournal(one.events, {pageCount: one.pages.length});
assert.equal(again.events, one.events, 'a compacted journal compacts to itself'); assert.equal(again.pages.length, 0);
assert.equal(JSON.stringify(expandJournal(one.events, one.pages)), text, 'expanded with its pages, the compacted journal is the journal it was made from');
assert.equal(text, JSON.stringify(J), 'compacting changes nothing it was given');
const archived = one.events.filter(isArchived), interfaceItems = J.flatMap(e => e.items).filter(i => Array.isArray(i.reasons));
assert.equal(archived.length, added.superseded, 'every superseded change is archived');
for (const e of archived) { const was = J.find(x => x.id === e.id); assert.equal(e.archived.items, was.items.length); assert.deepEqual(e.items, []); assert(e.supersededBy && J.findIndex(x => x.id === e.supersededBy) > J.findIndex(x => x.id === e.id), 'superseded by a later change of the same record'); }
assert(interfaceItems.length > 100 && one.events.filter(e => !isArchived(e)).flatMap(e => e.items).every(i => !Array.isArray(i.reasons) || !Object.hasOwn(i, 'why')), 'an explanation is kept once');
for (const e of J) for (const i of e.items) assert.equal(itemWhy(i), i.why);
const compactText = JSON.stringify(one.events);
pass(`${J.length} synthetic changes (${added.superseded} superseded, ${added.items} affected records): compacting is deterministic and idempotent, archives every superseded change in ${one.pages.length} pages of at most ${ARCHIVE_EVENTS}, keeps each explanation once, and expands back to the same journal character for character (${text.length} → ${compactText.length} characters)`);

// ---------------------------------------------------------------- 2. every reading judges the same
const compacted = {...whole, changes: {...whole.changes, events: one.events}};
const readings = p => ({
  summary: changeSummary(p), causes: changeCauses(p), counts: currentChanges(p).map(c => [c.event.id, c.total, c.reviewed, c.open, c.followUp, c.stale, [...c.byChapter]]),
  states: changeEvents(p).filter(e => isCurrentChange(p, e)).map(e => [e.id, causeStamp(p, e), e.items.map(i => [i.key, changeItemState(p, e, i).status, changeTargetStamp(p, i), itemWhy(i)])]),
  digest: changeDigest(p), markdown: changeSummaryMarkdown(p), finding: finalFindings(p).filter(f => /change/i.test(f.title)).map(f => [f.title, f.detail])
});
assert.deepEqual(readings(compacted), readings(whole), 'every reading of the journal');
const pages = Math.ceil(J.length / JOURNAL_PAGE), annex = (p, n) => { const page = changeJournalPage(p, {page: n}); return [changeJournalMarkdown(page), changeJournalCSV(page), JSON.stringify(page)]; };
for (let n = 1; n <= pages; n++) {
  const events = expandJournal(one.events.slice((n - 1) * JOURNAL_PAGE, n * JOURNAL_PAGE), one.pages), read = {...compacted, changes: {...compacted.changes, events: [...one.events.slice(0, (n - 1) * JOURNAL_PAGE), ...events, ...one.events.slice(n * JOURNAL_PAGE)]}};
  assert.deepEqual(annex(read, n), annex(whole, n), 'annex page ' + n);
}
pass(`every reading of the compacted journal is the reading of the whole one: the summary ${JSON.stringify(changeSummary(compacted))}, ${changeCauses(compacted).length} causes, every latest change's counts, every affected record's state, stamp and explanation, the whole-change stamps, the SDD's change summary and its review finding, and all ${pages} pages of the annex (Markdown, CSV, JSON) with the archived changes read back`);

// ---------------------------------------------------------------- 3. through storage
const dir = await mkdtemp(tmpdir() + '/aiw-journal-archive-'), env = {DB: localDatabase(dir + '/j.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
const owner = 'journal-archivist', origin = 'https://aiw.test';
const api = async (route, body, actor = owner) => { const r = await worker.fetch(new Request(origin + route, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': actor, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); const t = await r.text(); let data = null; try { data = JSON.parse(t); } catch { data = null; } return {status: r.status, text: t, data}; };
const row = (id, actor = owner) => env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(actor, id).first();
try {
  // A row as the code before this round stored it: the journal whole, in the row.
  const id = whole.id, legacy = JSON.stringify(whole);
  await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,7,?)').bind(owner, id, legacy, at).run();
  const read = await api('/api/project?project=' + id);
  assert.equal(read.status, 200, read.text.slice(0, 300));
  const stored = await row(id), meta = JSON.parse(stored.document).changes;
  assert.equal(stored.revision, 8, 'the first read stored the upgrade'); assert.equal(meta.compacted, true); assert.equal(meta.archive.length, one.pages.length);
  // The read answers the compacted journal without its archived changes, which it counts (round 12, A3: GR-PERF-13:
  // changes-domain.js journalView); the annex, GET /api/changes and the exports below read them back whole.
  assert.equal(JSON.stringify(read.data.document.changes.events), JSON.stringify(one.events.filter(e => !isArchived(e))), 'the read answers the compacted journal, its archived changes left out');
  assert.equal(read.data.document.changes.archivedCount, one.events.filter(isArchived).length, 'and counts them');
  assert(read.text.length < legacy.length * 0.6, `the project read shrinks (${legacy.length} → ${read.text.length} characters)`);
  const storage = (await env.DB.prepare('SELECT document FROM project_activity WHERE owner_id=? AND project_id=?').bind(owner, id).all()).results.map(r => JSON.parse(r.document)).filter(a => a.kind === 'storage');
  assert.equal(storage.length, 1, 'recorded once as a storage upgrade');
  const previous = await readRecoveryPoint(env, owner, id, storage[0].recoveryPoint);
  assert.equal(previous.revision, 7); assert.equal(JSON.stringify(previous.document.changes.events), text, 'the version it upgraded reads back whole');
  await api('/api/project?project=' + id); assert.equal((await row(id)).revision, 8, 'the next read writes nothing');
  // The annex through the export route, GET /api/changes and the JSON export read the journal whole.
  for (const n of [1, Math.ceil(pages / 2), pages]) for (const [k, f] of [[0, 'md'], [1, 'csv'], [2, 'json']]) {
    const r = await api(`/api/export?project=${id}&chapter=11&document=changes&format=${f}&page=${n}`);
    assert.equal(r.status, 200); assert.equal(f === 'json' ? JSON.stringify(JSON.parse(r.text)) : r.text, annex(withFinalReview(documentClone(whole)), n)[k], 'the annex page ' + n + ' (' + f + ') through the route');
  }
  const older = await api('/api/changes?project=' + id + '&limit=50&before=' + J[600].id);
  assert.deepEqual(older.data.events, J.slice(550, 600).reverse().map(e => JSON.parse(JSON.stringify(e))), 'GET /api/changes answers older changes whole');
  const exported = await api('/api/export?project=' + id + '&format=json');
  assert.equal(JSON.stringify(exported.data.project.changes.events), text, 'the project JSON export carries the journal whole');
  // A recovery package carries it whole; its restore compacts it again and judges the same.
  const pack = await api('/api/recovery?project=' + id + '&action=export');
  assert.equal(pack.status, 200, pack.text.slice(0, 200));
  // A recovery package is NDJSON, its manifest last (round 12, GR-STO-03: recovery-package.js); its entries assembled
  // carry the journal whole.
  const {manifest, line} = packageText(pack.text), unpacked = await assemblePackage(manifest, line);
  assert.equal(JSON.stringify(unpacked.project.changes.events), text, 'the recovery package carries the journal whole');
  const preview = await api('/api/recovery?action=preview', {package: pack.text});
  assert.equal(preview.status, 200, preview.text.slice(0, 300));
  const restored = await api('/api/recovery?action=restore', {package: pack.text, hash: preview.data.hash, name: 'Journal archive · restored', reviewed: true});
  assert.equal(restored.status, 201, restored.text.slice(0, 300));
  const back = (await api('/api/project?project=' + restored.data.id)).data.document;
  assert.equal(JSON.parse((await row(restored.data.id)).document).changes.archive.length, one.pages.length, 'the restore compacts the journal again');
  assert.deepEqual(readings(back), readings(withFinalReview(documentClone(whole))), 'the restored project judges the same');
  // A document that carries archived changes without their archive is refused.
  const bare = await api('/api/recovery?action=preview', {package: {...read.data.document}});
  assert.equal(bare.status, 400); assert.match(bare.data.error, /hydrated project export/);
  pass(`through storage: a row with its journal whole (${legacy.length} characters) is stored compacted by its first read (${meta.archive.length} archive pages; the read ${read.text.length} characters), recorded once, the version it upgraded read back whole; the annex, GET /api/changes and the JSON export read it whole; a recovery package carries it whole and its restore compacts it again and judges the same; archived changes without their archive are refused`);

  // ---------------------------------------------------------------- 4. the journal answered as a delta
  let held = (await api('/api/project?project=' + id)).data;
  const e = changeEvents(held.document).filter(x => isCurrentChange(held.document, x) && x.items.some(i => !changeItemState(held.document, x, i).complete)).at(-1), item = e.items.find(i => !changeItemState(held.document, e, i).complete);
  const reviewed = await api('/api/commands?project=' + id + '&response=sections', {revision: held.revision, command: {type: 'change.review', payload: {changeId: e.id, itemKey: item.key, targetStamp: changeTargetStamp(held.document, item), outcome: 'unchanged', reviewer: 'Archive reviewer', rationale: 'Still holds.', evidence: 'Synthetic', reviewed: true}}});
  assert.equal(reviewed.status, 200, reviewed.text.slice(0, 300));
  const delta = reviewed.data.sections.changes.delta;
  assert.deepEqual(delta.replaced.map(([n]) => n), [held.document.changes.events.indexOf(e)], 'the review answers the change it was recorded on'); assert.deepEqual(delta.added, []);
  assert(reviewed.text.length < JSON.stringify(e).length + 20000, `the answer is the change, not the journal (${reviewed.text.length} characters)`);
  const merged = mergeSaved(held.document, reviewed.data).document, now = (await api('/api/project?project=' + id)).data.document;
  assert.equal(JSON.stringify(merged.changes), JSON.stringify(now.changes), 'the journal the browser holds after the answer is the one saved');
  held = {document: merged, revision: reviewed.data.revision};
  const edited = await api('/api/commands?project=' + id + '&response=sections', {revision: held.revision, command: {type: 'artefact', payload: {...held.document.artefacts.find(a => a.id === 'REQ-001'), acceptance: 'Edited for the delta check.'}}});
  assert.equal(edited.status, 200, edited.text.slice(0, 300));
  assert(edited.data.sections.changes.delta.added.length >= 1);
  assert.equal(JSON.stringify(mergeSaved(held.document, edited.data).document.changes), JSON.stringify((await api('/api/project?project=' + id)).data.document.changes), 'and after an edit that adds a change (and may archive the one it supersedes)');
  pass(`a save answers the journal as a delta that the browser's store applies (a review: ${reviewed.text.length} characters, the change it was recorded on; an edit: the change it added and the changes it archived), and the journal it then holds is the one saved`);

  // ---------------------------------------------------------------- 5. codes, folded saves, retired recovery points (round 12, A3: GR-STO-07)
  // Each part of the journal as stored (a segment, the head, an archive page) keeps the chapter titles and reasons of its
  // affected records once, as codes, and they are printed in words wherever the journal is read.
  {
    const meta = JSON.parse((await row(id)).document).changes, raw = async key => JSON.parse(await (await env.FILES.get(key)).text());
    const parts = [...meta.segments, ...(meta.head ? [meta.head] : []), ...meta.archive].map(p => p.key), coded = [];
    for (const key of parts) { const stored = await raw(key); if (!Array.isArray(stored)) coded.push({key, stored}); }
    assert(coded.length > 0, 'parts of the journal are stored with codes');
    const {stored} = coded.find(c => c.stored.events.some(e => (e.items || []).some(i => i.chapterTitle?.$c !== undefined))) || coded[0];
    assert(stored.codes.includes('Quality drivers') || stored.codes.some(c => /^[A-Z]/.test(c)), 'a chapter title is a code of its part');
    const words = decodeEvents(stored), text = JSON.stringify(stored), plainText = JSON.stringify(words);
    assert(words.every(e => (e.items || []).every(i => typeof (i.chapterTitle ?? '') === 'string' && (i.reasons || []).every(r => typeof r === 'string'))), 'read, every code is printed in words');
    assert(text.length < plainText.length, `stored with codes, a part is shorter (${text.length} < ${plainText.length} characters)`);
    const now = (await api('/api/project?project=' + id)).data.document.changes.events;
    assert(now.every(e => (e.items || []).every(i => typeof (i.chapterTitle ?? '') === 'string' && (i.reasons || []).every(r => typeof r === 'string'))), 'a read prints them in words');
    const sizes = {coded: 0, words: 0}; for (const c of coded) { sizes.coded += JSON.stringify(c.stored).length; sizes.words += JSON.stringify(decodeEvents(c.stored)).length; }
    pass(`the journal's parts are stored with codes for the chapter titles and reasons of their affected records (${coded.length} parts: ${sizes.coded} characters where their words take ${sizes.words}), printed in words wherever the journal is read`);
  }
  // Consecutive saves of one record's fields by one person fold into one change; another person's save, another record's
  // change between them, or a review recorded on the change keeps them apart.
  {
    const project = (await api('/api/projects', {name: 'Folded saves · synthetic', template: 'bank-payment'})).data.document.id;
    assert.equal((await api('/api/access?project=' + project, {actorId: 'second-architect', role: 'editor'})).status, 200);
    let held = (await api('/api/project?project=' + project)).data;
    const save = async (artefact, actor = owner) => { const r = await api('/api/commands?project=' + project, {revision: held.revision, command: {type: 'artefact', payload: artefact}}, actor); assert.equal(r.status, 200, r.text.slice(0, 300)); held = {document: r.data.document, revision: r.data.revision}; return r.data; };
    const req = n => held.document.artefacts.find(a => a.id === n), events = () => held.document.changes.events;
    // Two steps a person reviewed as one each (bulk confirmations) stay two changes.
    const open = held.document.artefacts.filter(a => a.type === 'requirement' && !a.confirmed).slice(0, 2), steps0 = events().length;
    assert.equal(open.length, 2, 'two requirements to confirm');
    for (const a of open) { const r = await api('/api/commands?project=' + project, {revision: held.revision, command: {type: 'requirements.confirm', payload: {ids: [a.id], count: 1, reviewed: true}}}); assert.equal(r.status, 200, r.text.slice(0, 300)); held = {document: r.data.document, revision: r.data.revision}; }
    assert.equal(events().length, steps0 + 2, 'two reviewed steps by one person are two changes');
    const original = req('REQ-001'), count0 = events().length;
    await save({...original, title: original.title + ' (revised)'});
    const first = events().at(-1);
    assert.equal(first.reviewed, true, 'the person who saved the first edit stood behind it; its affected records remain open to review');
    assert.equal(first.authorKind, 'person');
    const reviewedImpact = {...first, id: 'CHG-reviewed-impact', preview: {reviewed: true}, reviewed: undefined};
    assert.equal(foldChange({changes: {events: [first]}}, {changes: {events: [first, reviewedImpact]}}, owner, first.at), null, 'a newly reviewed impact step cannot fold into the preceding edit');
    await save({...req('REQ-001'), acceptance: (req('REQ-001').acceptance || '') + ' Within one business day.'});
    assert.equal(events().length, count0 + 1, 'two saves of one record by one person are one change');
    const folded = events().at(-1);
    assert.equal(folded.id, first.id); assert.equal(folded.folded, 2); assert.equal(folded.before.title, original.title, 'from the record as it was before the first save');
    assert.deepEqual(folded.fields.map(f => f.key).sort(), ['acceptance', 'title'].sort(), 'its fields from both saves');
    assert.equal(folded.fields.find(f => f.key === 'title').before, original.title);
    await save({...req('REQ-001'), owner: 'Another owner'}, 'second-architect');
    assert.equal(events().length, count0 + 2, 'another person\'s save is its own change');
    await save({...req('REQ-002'), title: req('REQ-002').title + ' (revised)'});
    await save({...req('REQ-001'), title: req('REQ-001').title + ' again'});
    assert.equal(events().length, count0 + 4, 'a change of another record between them keeps them apart');
    const latest = events().at(-1), item = latest.items.find(i => i);
    if (item) {
      const reviewed = await api('/api/commands?project=' + project, {revision: held.revision, command: {type: 'change.review', payload: {changeId: latest.id, itemKey: item.key, targetStamp: changeTargetStamp(withFinalReview(held.document), item), outcome: 'unchanged', reviewer: 'Synthetic reviewer', rationale: 'Still holds.', evidence: 'Synthetic', reviewed: true}}});
      assert.equal(reviewed.status, 200, reviewed.text.slice(0, 300)); held = {document: reviewed.data.document, revision: reviewed.data.revision};
      await save({...req('REQ-001'), title: req('REQ-001').title + ' once more'});
      assert.equal(events().length, count0 + 5, 'a change already reviewed is not folded');
    }
    // A person's save never folds into a change Sol drafted (round 23): the draft keeps its author kind and stays not
    // reviewed, and the person's save is its own change.
    const third = held.document.artefacts.filter(a => a.type === 'requirement')[2];
    const drafted0 = await api('/api/commands?project=' + project, {revision: held.revision, command: {type: 'artefact', payload: {...third, acceptance: 'Given a synthetic draft, when it is read, then it reads as drafted.'}}, authorKind: 'sol-draft', session: 'draft-1'});
    assert.equal(drafted0.status, 200, drafted0.text.slice(0, 300)); held = {document: drafted0.data.document, revision: drafted0.data.revision};
    const drafted = events().at(-1), beforePerson = events().length;
    assert.deepEqual([drafted.authorKind, drafted.reviewed], ['sol-draft', false]);
    await save({...req(third.id), owner: 'Synthetic owner'});
    assert.equal(events().length, beforePerson + 1, 'a person\'s save after Sol\'s draft of the same record is its own change');
    const kept = events().find(e => e.id === drafted.id);
    assert.deepEqual([kept.authorKind, kept.reviewed, kept.folded || 1, kept.fields.map(f => f.key)], ['sol-draft', false, 1, ['acceptance']], 'the draft keeps its author kind, stays not reviewed and holds only its own field');
    assert.equal(foldChange({changes: {events: [drafted]}}, {changes: {events: [drafted, {...drafted, id: 'CHG-next', authorKind: undefined, fields: [{key: 'owner', before: '', after: 'x'}]}]}}, owner, drafted.at, 'person'), null, 'the fold refuses across author kinds');
    pass('consecutive saves of one record\'s fields by one person fold into one change, under its first id, from the record before the first save, its fields from both; another person\'s save, another record\'s change between them and a review recorded on the change keep them apart, and so does a person\'s save after Sol\'s draft; two steps reviewed as one each (bulk confirmations) stay two changes');
  }
  // A retention policy retires recovery points beyond it (the newest of a project always kept) with the objects only they
  // kept; the restore of a kept one stays exact.
  {
    const identity = {owner, actor: owner, role: 'owner'}, points = [], versions = [];
    for (let k = 0; k < 2; k++) {
      const current = await row(id), stored = await readStoredProject(env, owner, current.document);
      versions.push(JSON.stringify((await readStoredProject(env, owner, current.document)).document));
      const saved = await storeStorageUpgrade(env, identity, id, {...current, updated_at: at}, stored, withFinalReview(stored.document), new Date(Date.now() + (k + 1) * 60000).toISOString());
      assert(saved, 'a storage upgrade stored'); points.push(saved.recoveryPoint);
    }
    const activity = (await env.DB.prepare('SELECT id,document FROM project_activity WHERE owner_id=? AND project_id=?').bind(owner, id).all()).results.map(r => ({id: r.id, d: JSON.parse(r.document)})).filter(a => a.d.kind === 'storage').sort((a, b) => a.d.at < b.d.at ? -1 : 1);
    assert.equal(activity.length, 3, 'three recovery points: the first read\'s and two more');
    // The first two are made 100 days old; the policy retires points older than 90 days, the newest always kept.
    for (const a of activity.slice(0, 2)) await env.DB.prepare('UPDATE project_activity SET document=? WHERE owner_id=? AND project_id=? AND id=?').bind(JSON.stringify({...a.d, at: new Date(Date.now() - 100 * 86400000).toISOString()}), owner, id, a.id).run();
    const retainedBefore = JSON.parse((await row(id)).document).storageRetained || [];
    const result = await runRetention(env, retentionPolicy({}), Date.now());
    assert.equal(result.recoveryPoints, 2, 'the two points beyond the policy are retired'); assert.deepEqual(result.errors, []);
    for (const a of activity.slice(0, 2)) await assert.rejects(() => readRecoveryPoint(env, owner, id, a.d.recoveryPoint), /unavailable/, 'a retired point is gone');
    const kept = await readRecoveryPoint(env, owner, id, activity[2].d.recoveryPoint);
    assert.equal(JSON.stringify(kept.document), versions[1], 'the restore of the kept point is the version it replaced, exactly');
    const retainedAfter = JSON.parse((await row(id)).document).storageRetained || [];
    assert(retainedAfter.length <= retainedBefore.length, 'the row keeps no more than the kept point needs');
    for (const key of retainedBefore.filter(k => !retainedAfter.includes(k))) assert.equal(await env.FILES.get(key), null, 'an object only a retired point kept is deleted: ' + key);
    assert.equal((await api('/api/project?project=' + id)).status, 200, 'the project reads as before');
    pass(`a retention policy (recovery points older than ${retentionPolicy({}).recoveryPointsDays} days, the newest kept) retired 2 of 3 recovery points and released ${result.recoveryObjects} objects only they kept; the kept point restores the version it replaced exactly`);
  }
} finally {
  env.DB.close(); await rm(dir, {recursive: true, force: true});
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 1));
