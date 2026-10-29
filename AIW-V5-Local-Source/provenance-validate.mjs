// Authorship and provenance (round 12, D-06; workstream D3). Who or what wrote each commit and each record, what a person
// reviewed, and the sources, read through one reader (public/provenance.js) and recorded by the Worker's command path
// (authorship.js). Synthetic project and accounts; no provider is contacted. Run: npm run test:provenance
//   1. A governed batch drafted by Sol is accepted unreviewed (reviewed:false, authorKind sol-draft) and its records read
//      "Drafted by Sol · not reviewed"; a person's batch still needs its review; no draft and no agent account confirms,
//      accepts or approves anything; an agent never writes as a person (GR-GOV-03, GR-GOV-12).
//   2. One origin vocabulary and label for every chapter; reviewed is read only from a recorded confirmation; a proposal
//      is its proposer's until a person keeps it or saves a change to it, and then the person's, saying whose words it
//      started from (GR-GOV-06; workstream F's rule, which the lead kept for every reader).
//   3. Every journal event and activity row says who, of what kind and why; the SDD's change summary prints it (GR-GOV-08).
//   4. Every confirmation and review records the signed-in identity, and a project may switch four eyes on (GR-GOV-12).
//   5. A dismissal carried by a reviewed workspace change records the reviewing person (GR-GOV-22).
//   6. The reader counts every record by author kind and review state (GR-GOV-14).
//   7. On every chapter page a record Sol drafted (workstream E's mark, provenance.draft) reads "Drafted by Sol, not
//      reviewed", with who applied it and when; kept by a person, it is the person's, from Sol's draft, with who kept it
//      (GR-GOV-25).
//   8. A record leaves the design only through the one retire path, with its author and reason, and can be restored; the
//      hard delete is refused; removing a link stays an edit, journalled with its author (GR-GOV-24).
//   9. Every disclosure is derived from stored authorship: the opening brief says who gave it, the evidence section and
//      the footer how many records Sol drafted that no person reviewed (GR-GOV-07; test:sol-disclosure holds the provider).
//  10. Relationships, connections, interactions, groups, the narrative, parties, zones, paths and needs accept a provenance
//      block (source, citations, basis), kept across saves, and the SDD prints it apart from the design statement (GR-GOV-09).
//  11. A citation of an imported workbook row on a driver, a decision, a contract or a plan opens the row's original cells
//      in the revision it cites (GR-GOV-18).
//  12. Through the Worker: a person's change to Sol's draft is recorded as the person's edit with its date, on Sol's mark
//      and the record's stamp, for every record kind (a data invariant too); a keep makes the draft the person's with who
//      kept it; Sol's drafter saving its draft again is not a person's edit; and the SDD's cover and Appendix E read the
//      one reader, with the provenance blocks in Appendix E (GR-GOV-06, GR-GOV-25, GR-GOV-14, GR-GOV-09).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {authorOf, recordProvenance, recordLabel, provenanceSummary, AUTHOR_KINDS, AUTHOR_WORDS} from './public/provenance.js';
import {changeEvents, changeTargetStamp, isCurrentChange} from './public/changes-domain.js';
import {changeSummaryMarkdown} from './public/change-summary.js';
import {independentApproval} from './public/review-domain.js';
import {recordStamp} from './public/source-fingerprint.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {markDrafted} from './public/architecture-drafter.js';
import {lifecycleHTML} from './public/studio-kit.js';
import {RECORD_PATHS, LINK_PATHS, listAt, findRecord, stampAuthorship} from './public/provenance.js';
import {applyRecordCommand} from './public/canonical-command.js';
import {solDisclosure} from './public/provenance.js';
import {evidenceMarkdown} from './public/evidence-domain.js';
import {guidanceFooter} from './public/shell-ux.js';
import {citationTarget, provenanceBlockText} from './public/provenance.js';
import {assembleSDD} from './public/review-domain.js';
import {needsFor} from './public/technology-domain.js';
import {sddAuthor, provenanceBlocksMarkdown} from './public/provenance.js';
import {provenanceReading, LIST_MAX} from './public/sdd-architecture.js';
import {sddDocument} from './public/sdd-document.js';
import {syntheticWorkbook, SHEET} from './scripts/synthetic-workbook.mjs';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const DB = localDatabase(':memory:'), bytes = new Map();
const FILES = {async put(k, v) { bytes.set(k, typeof v === 'string' ? v : new Uint8Array(v instanceof ArrayBuffer ? v : v.buffer || v)); }, async get(k) { return bytes.has(k) ? {text: async () => String(bytes.get(k)), arrayBuffer: async () => bytes.get(k)} : null; }, async delete(k) { bytes.delete(k); }};
const env = {DB, FILES, ASSETS: {fetch: () => new Response('asset')}, AIW_AGENT_ACTORS: 'sol-drafter'};
const ARCHITECT = 'architect-a', REVIEWER = 'reviewer-b', AGENT = 'sol-drafter';
const api = (path, method = 'GET', body, as = ARCHITECT) => worker.fetch(new Request('https://aiw.test' + path, {method, headers: {'oai-authenticated-user-id': as, ...(body ? {'Content-Type': 'application/json', Origin: 'https://aiw.test'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
let id, state;
const read = async (as = ARCHITECT) => { const r = await api('/api/project?project=' + id, 'GET', null, as); assert.equal(r.status, 200); state = await r.json(); return state; };
const send = async (command, {as = ARCHITECT, extra = {}} = {}) => { await read(as); const r = await api('/api/commands?project=' + id, 'POST', {revision: state.revision, command, ...extra}, as); const body = await r.json(); return {status: r.status, body}; };
const ok = async (command, options) => { const r = await send(command, options); assert.equal(r.status, 200, command.type + ': ' + JSON.stringify(r.body).slice(0, 400)); state = {document: r.body.document, revision: r.body.revision}; return r.body; };
const refused = async (command, pattern, options) => { const r = await send(command, options); assert.equal(r.status, 400, command.type + ' should be refused: ' + JSON.stringify(r.body).slice(0, 300)); assert.match(r.body.error, pattern); return r.body; };
const batch = (commands, payload = {}) => ({type: 'workspace.apply', payload: {commands, stamp: previewWorkingChange(state.document, commands).stamp, ...payload}});
const activity = async () => (await DB.prepare('SELECT document FROM project_activity WHERE project_id=? ORDER BY created_at DESC, rowid DESC').bind(id).all()).results.map(r => JSON.parse(r.document));
const req = (doc, title) => doc.artefacts.find(a => a.title === title);

try {
  const created = await (await api('/api/projects', 'POST', {name: 'Permits office · provenance QA', template: 'blank'})).json();
  id = created.document.id;
  // The drafter's account is a project editor, as a person would make it.
  assert.equal((await api('/api/access?project=' + id, 'POST', {actorId: AGENT, role: 'editor'})).status, 200);
  assert.equal((await api('/api/access?project=' + id, 'POST', {actorId: REVIEWER, role: 'editor'})).status, 200);
  await read();

  // ---------------------------------------------------------------- 1. a batch drafted by Sol (GR-GOV-03, GR-GOV-12)
  const drafted = [
    {type: 'artefact', payload: {type: 'requirement', title: 'Accept a permit application', description: 'The service accepts a permit application with its reference.', acceptance: 'Given an application, when it is submitted, then it is recorded once with its reference.', owner: 'Permits office', priority: 'Must', origin: 'suggestion'}},
    {type: 'artefact', payload: {type: 'requirement', title: 'Notify the applicant', description: 'The service notifies the applicant of the decision.', acceptance: 'Given a decision, when it is recorded, then the applicant is told.', owner: 'Permits office', priority: 'Should'}},
    {type: 'realisation.component', payload: {title: 'Application intake', kind: 'service', purpose: 'Takes permit applications.', boundary: 'Owns the application record.', owner: 'Permits delivery team'}},
    {type: 'realisation.component', payload: {title: 'Notice sender', kind: 'worker', purpose: 'Sends decision notices.', boundary: 'Owns the notice record.', owner: 'Permits delivery team'}},
    {type: 'logical.responsibility', payload: {title: 'Notify applicants of decisions', purpose: 'Tells each applicant the decision on their application.', boundary: 'Owns the notice; never the decision.', owner: 'Permits office', requirementIds: ['REQ-002']}}
  ];
  const reason = 'Drafted by Sol from the brief; not reviewed by a person.';
  // A person's batch claims its review; without one it is refused, as before.
  await refused(batch(drafted, {reviewed: false}), /Review the changed objects/);
  // A draft by Sol never claims a review, never confirms, accepts or approves.
  await refused(batch(drafted, {reviewed: true, authorKind: 'sol-draft', reason}), /cannot claim a review \(reviewed\)/);
  await refused(batch([{...drafted[0], payload: {...drafted[0].payload, confirmed: true}}], {reviewed: false, authorKind: 'sol-draft', reason}), /cannot claim a review \(confirmed\)/);
  await refused(batch([drafted[2]], {reviewed: false, authorKind: 'someone'}), /written by a person, by an import, or drafted by Sol/);
  // Accepted as what it is: a draft by Sol, applied unreviewed by the person who sent it.
  let answer = await ok(batch(drafted, {reviewed: false, authorKind: 'sol-draft', reason, session: 'draft-session-1'}));
  assert.equal(answer.selectedIds.length, drafted.length, 'the batch answers the record each staged command made');
  const doc1 = state.document, applied = doc1.workbench.history.at(-1);
  assert.deepEqual(applied.author, {kind: 'sol-draft', account: 'person', reviewed: false, session: 'draft-session-1'}, 'the history keeps who sent it, of what kind, unreviewed');
  assert.equal(applied.actor, ARCHITECT); assert.equal(applied.reason, reason);
  const r1 = req(doc1, 'Accept a permit application'), app = doc1.realisation.components.find(c => c.title === 'Application intake');
  assert.deepEqual(answer.selectedIds.slice(0, 1), [r1.id]);
  for (const [r, chapter] of [[r1, 1], [req(doc1, 'Notify the applicant'), 1], [app, 5]]) {
    assert.equal(authorOf(r), 'sol-draft');
    assert.equal(recordLabel(doc1, r, chapter), 'Drafted by Sol · not reviewed', (r.ref || r.id) + ' reads as Sol\'s unreviewed draft');
    assert.deepEqual(Object.keys(r.provenance.author).sort(), ['at', 'by', 'from', 'kind', 'session'].filter(k => k !== 'from' || r.provenance.author.from));
    assert.equal(r.confirmed ?? false, false, 'nothing is confirmed by a draft');
  }
  // A guidance origin the drafter sent is still Sol's draft, and never a review.
  assert.equal(r1.origin, 'suggestion'); assert.equal(recordProvenance(doc1, r1, 1).reviewed, null);
  let rows = await activity();
  assert.equal(rows[0].authorKind, 'sol-draft'); assert.equal(rows[0].reviewed, false); assert.equal(rows[0].reason, reason); assert.equal(rows[0].command, 'workspace.apply');
  assert.match(rows[0].title, /^Drafted by Sol, not reviewed by a person · workspace\.apply · 5 changes$/);
  // An agent or service account drafts by default, never as a person, and never reviews or approves.
  await refused({type: 'realisation.component', payload: {title: 'Fee calculator', kind: 'service', purpose: 'Works out the permit fee.'}}, /does not write as a person/, {as: AGENT, extra: {authorKind: 'person'}});
  answer = await ok({type: 'realisation.component', payload: {title: 'Fee calculator', kind: 'service', purpose: 'Works out the permit fee.', boundary: 'Owns the fee schedule.', owner: 'Permits delivery team'}}, {as: AGENT, extra: {reason: 'Sol drafts the fee calculation.'}});
  const fee = state.document.realisation.components.find(c => c.title === 'Fee calculator');
  assert.deepEqual([fee.provenance.author.kind, fee.provenance.author.by], ['sol-draft', AGENT]);
  rows = await activity(); assert.deepEqual([rows[0].authorKind, rows[0].account, rows[0].reviewed], ['sol-draft', 'agent', false]);
  for (const [command, pattern] of [
    [{type: 'requirements.confirm', payload: {ids: [r1.id], count: 1, reviewed: true}}, /does not review, confirm, accept or approve \(requirements\.confirm\)/],
    [{type: 'review.judgement', payload: {scope: {kind: 'author', author: 'sol-draft'}, outcome: 'kept', rationale: 'x', evidence: 'y', reviewed: true}}, /does not review, confirm, accept or approve/],
    [{type: 'decision.accept', payload: {id: 'ADR-001', acknowledge: true}}, /does not review, confirm, accept or approve/],
    [{type: 'artefact', payload: {...r1, confirmed: true}}, /cannot claim a review \(confirmed\)/]
  ]) await refused(command, pattern, {as: AGENT});
  const library = await api('/api/organizations?project=' + id + '&action=review&organization=org-1', 'POST', {id: 'x', revision: 1, outcome: 'approved', reviewed: true}, AGENT);
  assert.equal(library.status, 403, 'an agent account reviews no organisation library entry');
  pass('a governed batch drafted by Sol is accepted unreviewed (reviewed:false, authorKind sol-draft) and its records read "Drafted by Sol · not reviewed"; its history, activity row and every staged record say who sent it, of what kind and why; a person\'s batch still needs its review; a draft claims no review, confirmation or acceptance; an agent account drafts by default, never writes as a person and never reviews, confirms, accepts or approves');

  // ---------------------------------------------------------------- 2. one vocabulary, reviewed only from a recorded confirmation (GR-GOV-06)
  const synthetic = {artefacts: [], finalReview: {judgements: []}};
  const kinds = [
    [{id: 'x1', origin: 'import', provenance: {datasetId: 'workbook-1', revision: 1}}, 'import', 'Imported · not reviewed'],
    [{id: 'x2', origin: 'seeded', state: 'proposed'}, 'seeded', 'Seeded by AIW · not reviewed'],
    [{id: 'x3', origin: 'sol-draft', state: 'proposed', provenance: {draft: {by: 'sol', reviewed: false}}}, 'sol-draft', 'Drafted by Sol · not reviewed'],
    [{id: 'x4', origin: 'suggestion'}, 'person', 'Written by a person (from guidance)'],
    [{id: 'x5', origin: 'user'}, 'person', 'Written by a person'],
    [{id: 'x6', origin: 'reference'}, 'seeded', 'Seeded by AIW (reference example) · not reviewed'],
    [{id: 'x7', provenance: {journey: {mode: 'sol'}}}, 'sol-draft', 'Drafted by Sol · not reviewed'],
    [{id: 'x8', provenance: {journey: {mode: 'deterministic'}}}, 'guidance', 'Proposed by guidance · not reviewed'],
    [{id: 'x9', origin: 'suggestion', confirmed: true}, 'person', 'Written by a person (from guidance) · confirmed'],
    [{id: 'x10', origin: 'sol-draft', provenance: {draft: {by: 'sol', reviewed: false}}}, 'person', 'Written by a person (from Sol\'s draft)'],
    [{id: 'x11', origin: 'archetype'}, 'person', 'Written by a person (from a catalogue archetype)'],
    [{id: 'x12', origin: 'suggestion', provenance: {reviewed: {by: 'reviewer-b', at: '2026-10-08T10:00:00.000Z', how: 'kept'}}}, 'person', 'Written by a person (from AIW\'s proposal) · kept by reviewer-b'],
    [{id: 'x13', origin: 'sol-draft', state: 'proposed', provenance: {draft: {by: 'sol', reviewed: false}, author: {kind: 'person', by: 'architect-a', at: '2026-10-08T10:00:00.000Z', from: 'sol-draft'}}}, 'person', 'Written by architect-a (from Sol\'s draft)'],
    [{id: 'x14', origin: 'user', provenance: {author: {kind: 'sol-draft', by: 'sol-drafter', at: '2026-10-08T10:00:00.000Z'}}}, 'sol-draft', 'Drafted by Sol · not reviewed']
  ];
  for (const [r, kind, label] of kinds) { assert.equal(authorOf(r), kind, JSON.stringify(r)); assert.equal(recordLabel(synthetic, r, 2), label, JSON.stringify(r)); }
  // The SDD's words for the same records (sdd-architecture.js reads sddAuthor): one reading, in its six words.
  assert.deepEqual(kinds.map(([r]) => sddAuthor(r)), ['import', 'proposal', 'sol', 'person', 'person', 'reference', 'sol', 'rules', 'person', 'person', 'person', 'person', 'person', 'sol']);
  assert.deepEqual(AUTHOR_KINDS, ['person', 'import', 'sol-draft', 'seeded', 'guidance']);
  // Every chapter's screens read the one label: no screen keeps its own origin words.
  const screens = ['requirements.js', 'quality.js', 'decisions.js', 'logical-ui.js', 'realisation-ui.js', 'interfaces-ui.js', 'security-ui.js', 'runtime-ui.js', 'technology-realisation-ui.js'];
  for (const f of screens) { const s = readFileSync('public/' + f, 'utf8'); assert.match(s, /recordProvenance\(/, f + ' reads the one label'); assert.doesNotMatch(s, /'(?:User-authored|Reviewed suggestion|Accepted working suggestion|Guidance proposal)'/, f + ' keeps no origin words of its own'); }
  pass('one origin vocabulary and label (imported, seeded by AIW, drafted by Sol, proposed by guidance, written by a person) serves every chapter\'s screens and the SDD; an origin never says a record was reviewed, and reviewed is read only from a recorded confirmation; a proposal is its proposer\'s until a person keeps it or saves a change to it, then the person\'s, from its proposer\'s words');

  // ---------------------------------------------------------------- 3. who, what kind and why on every journal event (GR-GOV-08)
  answer = await ok(batch([{type: 'artefact', payload: {...req(state.document, 'Notify the applicant'), description: 'The service notifies the applicant of the decision within a day.'}}], {reviewed: false, authorKind: 'sol-draft', reason: 'Sol tightens the notice requirement.'}));
  let events = changeEvents(state.document), last = events.at(-1);
  assert.deepEqual([last.actor, last.authorKind, last.reviewed, last.reason], [ARCHITECT, 'sol-draft', false, 'Sol tightens the notice requirement.']);
  answer = await ok({type: 'artefact', payload: {...req(state.document, 'Notify the applicant'), owner: 'Permits notices team'}}, {extra: {reason: 'The notices team owns it.'}});
  last = changeEvents(state.document).at(-1);
  assert.deepEqual([last.actor, last.authorKind, last.reviewed, last.reason], [ARCHITECT, 'person', true, 'The notices team owns it.']);
  rows = await activity();
  for (const row of rows.filter(x => x.kind === 'model')) { assert.ok(row.actor && AUTHOR_KINDS.includes(row.authorKind) && typeof row.reviewed === 'boolean', JSON.stringify(row).slice(0, 200)); }
  assert.equal(rows[0].reason, 'The notices team owns it.');
  const summary = changeSummaryMarkdown(state.document);
  assert.match(summary, /\| Change \| Record \| When \| By \| Why \| What changed \|/);
  assert.match(summary, new RegExp(ARCHITECT + ' \\| The notices team owns it\\.'), 'the SDD\'s change summary prints who and why');
  pass('every journal event and activity row carries its actor, author kind, whether a person stood behind it, and the reason the commit gave; the SDD\'s change summary prints who and why');

  // ---------------------------------------------------------------- 4. identity on every confirmation and review; four eyes (GR-GOV-12)
  let doc = state.document; const draftedReq = req(doc, 'Accept a permit application');
  await ok({type: 'artefact', payload: {...draftedReq, confirmed: true}});
  doc = state.document; let confirmedReq = req(doc, 'Accept a permit application');
  assert.deepEqual([confirmedReq.provenance.reviewed.by, confirmedReq.provenance.reviewed.how], [ARCHITECT, 'confirmed']);
  assert.equal(recordLabel(doc, confirmedReq, 1), 'Drafted by Sol · confirmed by ' + ARCHITECT, 'confirming Sol\'s draft leaves it Sol\'s, confirmed by the signed-in person');
  assert.equal(recordStamp(doc, confirmedReq), recordStamp(doc1, r1), 'a confirmation moves no reading: authorship is not what a record says');
  // A change review records the signed-in person, whatever name is typed.
  const changed = changeEvents(doc).filter(e => isCurrentChange(doc, e) && e.items.length).at(-1);
  assert.ok(changed, 'a change with affected records to review');
  {
    const item = changed.items[0];
    await ok({type: 'change.review', payload: {changeId: changed.id, itemKey: item.key, targetStamp: changeTargetStamp(doc, item), outcome: 'unchanged', reviewer: 'Any typed name', rationale: 'Still meets it.', evidence: 'Walkthrough', reviewed: true}}, {as: REVIEWER});
    const review = changeEvents(state.document).find(e => e.id === changed.id).items[0].reviews.at(-1);
    assert.equal(review.actor, REVIEWER, 'the review names the signed-in reviewer');
  }
  // Four eyes on: no person reviews or confirms what they wrote themselves.
  await ok({type: 'workspace.governance', payload: {fourEyes: true, reason: 'The board asks for a second person on every review.'}});
  await ok({type: 'artefact', payload: {type: 'requirement', title: 'Record the fee paid', description: 'The service records the fee paid with its receipt.', acceptance: 'Given a payment, when it is received, then the receipt is kept.', owner: 'Permits office', priority: 'Must'}});
  const own = req(state.document, 'Record the fee paid');
  await refused({type: 'artefact', payload: {...own, confirmed: true}}, /Four eyes: architect-a wrote/);
  await ok({type: 'artefact', payload: {...own, confirmed: true}}, {as: REVIEWER});
  assert.equal(req(state.document, 'Record the fee paid').provenance.reviewed.by, REVIEWER);
  const ownChange = changeEvents(state.document).filter(e => isCurrentChange(state.document, e) && e.actor === ARCHITECT && e.items.length).at(-1);
  assert.ok(ownChange, 'a change architect-a made');
  { const item = ownChange.items[0]; await refused({type: 'change.review', payload: {changeId: ownChange.id, itemKey: item.key, targetStamp: changeTargetStamp(state.document, item), outcome: 'unchanged', reviewer: 'Me', rationale: 'Fine.', evidence: 'Self', reviewed: true}}, /Four eyes: architect-a made this change/); }
  await refused({type: 'workspace.governance', payload: {fourEyes: false, reason: 'Turn it off.'}}, /does not review, confirm, accept or approve/, {as: AGENT});
  await ok({type: 'workspace.governance', payload: {fourEyes: false, reason: 'One architect works alone this week.'}});
  // An agent account is never one of the four eyes, even in a record written outside the server.
  assert.equal(independentApproval({actor: ARCHITECT, review: {outcome: {actor: ARCHITECT}}}, {actor: AGENT, account: 'agent'}), false);
  assert.equal(independentApproval({actor: ARCHITECT, review: {outcome: {actor: ARCHITECT}}}, {actor: REVIEWER}), true);
  pass('every confirmation and change review records the signed-in person; a project can switch four eyes on, and then nobody confirms or reviews what they wrote themselves; an agent account never changes that setting and never counts as an independent approver');

  // ---------------------------------------------------------------- 5. a dismissal through a reviewed workspace change (GR-GOV-22)
  doc = state.document; const [a, b] = doc.realisation.components.filter(c => ['Application intake', 'Notice sender'].includes(c.title)).map(c => c.id);
  await ok({type: 'realisation.interaction', payload: {from: a, to: b, label: 'Hands over a decided application', interaction: 'event'}});
  const seed = state.document.interfaces.contracts.find(c => c.state === 'proposed');
  assert.ok(seed, 'AIW proposes a contract for the event');
  assert.equal(recordLabel(state.document, seed, 8), 'Seeded by AIW · not reviewed');
  await ok(batch([{type: 'interfaces.dismiss-seed', payload: {ids: [seed.id], reason: 'The notice is sent by the intake itself.'}}], {reviewed: true, reason: 'Reviewed the proposal and dismissed it.'}), {as: REVIEWER});
  const retired = state.document.retired.records.find(x => x.id === seed.id);
  assert.equal(retired.actor, REVIEWER, 'the dismissal names the person who reviewed the change that carried it');
  pass('a dismissal carried by a reviewed workspace change records the reviewing person as its actor');

  // ---------------------------------------------------------------- 6. the reader counts every record (GR-GOV-14)
  const s = provenanceSummary(state.document);
  assert.equal(Object.values(s.byKind).reduce((n, x) => n + x, 0), s.total);
  assert.ok(s.byKind['sol-draft'] >= 4 && s.byKind.person >= 1, JSON.stringify(s.byKind));
  assert.equal(s.solDrafted - s.solDraftedNotReviewed, s.reviewed['sol-draft']);
  assert.ok(s.reviewers.includes(ARCHITECT) && s.reviewers.includes(REVIEWER));
  assert.match(s.line, /drafted by Sol/); assert.match(s.detail, /Reviewed by a person: \d/);
  for (const c of s.chapters) assert.equal(Object.values(c.byKind).reduce((n, x) => n + x, 0), c.total);
  assert.deepEqual(Object.keys(AUTHOR_WORDS), AUTHOR_KINDS);
  pass('the provenance reader counts every record by who wrote it and whether a person reviewed it, per chapter, with the people and the line and detail the SDD prints (' + s.line + ')');

  // ---------------------------------------------------------------- 7. a record Sol drafted, on every chapter page (GR-GOV-25)
  {
    const at = '2026-10-08T09:00:00.000Z', bank = withFinalReview(createProject({name: 'Drafted records', template: 'bank-payment'}, 'project-drafted', at));
    // One record of each of Chapters 1 to 10, marked as workstream E's drafter marks what it applies.
    const picked = [];
    for (let chapter = 1; chapter <= 10; chapter++) {
      const path = RECORD_PATHS.find(([path, ch]) => ch === chapter && !LINK_PATHS.has(path) && listAt(bank, path).some(r => r?.id && findRecord(bank, chapter, r.id)?.record === r))?.[0];
      assert.ok(path, 'the reference project holds a record of Chapter ' + chapter);
      const r = listAt(bank, path).find(x => x?.id && findRecord(bank, chapter, x.id)?.record === x);
      markDrafted(r, {by: 'sol', kind: 'sol-draft', job: 'job-1', key: 'draft-' + chapter, bundle: 'bundle-1', reviewed: false, appliedBy: ARCHITECT, appliedAt: at, groups: [], cites: []});
      picked.push([chapter, r]);
    }
    const line = 'Drafted by Sol, not reviewed; applied by ' + ARCHITECT + ' on 2026-10-08';
    for (const [chapter, r] of picked) {
      assert.equal(recordLabel(bank, r, chapter), 'Drafted by Sol · not reviewed', 'Chapter ' + chapter + ': ' + r.id);
      assert.deepEqual(recordProvenance(bank, r, chapter).applied, {by: ARCHITECT, at});
      // Every chapter page draws the details of the record in view with the one lifecycle block (studio-kit.js), and
      // the block opens with the record's provenance line.
      const html = lifecycleHTML(bank, chapter, r.id, 'data-x-action');
      assert.ok(html.includes('<p class="record-provenance" data-provenance-kind="sol-draft"><small>' + line + '</small></p>'), 'Chapter ' + chapter + ' (' + r.id + '): ' + html.slice(0, 300));
    }
    // The pages: each draws that block for the record in view and its labels through the one reader, never origin words
    // of its own (Chapters 1 to 10: the nine pages named by the register, and Chapter 6's).
    for (const f of ['requirements.js', 'quality.js', 'decisions.js', 'logical-ui.js', 'realisation-ui.js', 'technology-ui.js', 'technology-realisation-ui.js', 'interfaces-ui.js', 'security-ui.js', 'runtime-ui.js']) {
      const src = readFileSync('public/' + f, 'utf8');
      assert.match(src, /lifecycleHTML\(/, f + ' draws the details block of the record in view');
      assert.doesNotMatch(src, /User-authored|Accepted working suggestion|Reviewed suggestion/, f + ' keeps no origin words of its own');
    }
    // Kept by a person (the lifecycle family's keep, through the Worker's stamping): the person's record now, from Sol's
    // draft, with who kept it and when (workstream F's rule, which the lead kept for every reader).
    const [chapter, r] = picked.find(([c]) => c === 2), keep = {type: 'record.keep', payload: {ids: [r.id], chapter}};
    const result = applyRecordCommand(bank, keep, at, REVIEWER);
    stampAuthorship(bank, result.document, keep, result, {kind: 'person', id: REVIEWER, account: 'person', reviewed: true}, '2026-10-09T10:00:00.000Z');
    const kept = findRecord(result.document, chapter, r.id).record;
    assert.equal(kept.state, undefined, 'the keep makes it the design\'s');
    assert.equal(recordLabel(result.document, kept, chapter), 'Written by a person (from Sol\'s draft) · kept by ' + REVIEWER);
    assert.equal(recordProvenance(result.document, kept, chapter).line, 'Written by a person (from Sol\'s draft), kept by ' + REVIEWER + '; applied by ' + ARCHITECT + ' on 2026-10-08; kept on 2026-10-09');
    // AIW's own proposal kept as it stood is the person's too, from AIW's proposal, kept by the person.
    const seeded = {id: 'QD-900', origin: 'seeded', state: 'proposed', title: 'A proposed driver'}, before = {quality: {drivers: [seeded]}}, after = {quality: {drivers: [{...seeded, state: undefined, origin: 'suggestion'}]}};
    delete after.quality.drivers[0].state;
    stampAuthorship(before, after, keep, {selected: 'QD-900'}, {kind: 'person', id: REVIEWER, account: 'person', reviewed: true}, at);
    assert.equal(recordLabel(after, after.quality.drivers[0], 2), 'Written by a person (from AIW\'s proposal) · kept by ' + REVIEWER);
    pass('on every chapter page (Chapters 1 to 10) a record Sol drafted reads "' + line + '" in the details of the record in view, through the one reader; kept by a person it is the person\'s, "Written by a person (from Sol\'s draft), kept by …", and so is AIW\'s proposal kept as it stood, from AIW\'s proposal');
  }

  // ---------------------------------------------------------------- 8. one way out of the design (GR-GOV-24)
  {
    const fee = req(state.document, 'Record the fee paid'), accept = req(state.document, 'Accept a permit application');
    await ok({type: 'relationship', payload: {from: fee.id, to: accept.id, kind: 'supports'}});
    const link = state.document.relationships.find(r => r.from === fee.id && r.to === accept.id);
    // Deleting outright is refused; while the link names it, so is retiring it.
    await refused({type: 'deleteArtefact', payload: {id: fee.id}}, /leaves the design through Retire/);
    await refused({type: 'record.retire', payload: {ids: [fee.id], chapter: 1, reason: 'The fee is recorded by the payments service.'}}, /is still named by Chapter 1/);
    // Removing the link is an edit, journalled with its author.
    await ok({type: 'deleteRelationship', payload: {id: link.id}}, {as: REVIEWER, extra: {reason: 'The dependency was recorded the wrong way round.'}});
    const unlinked = changeEvents(state.document).at(-1);
    assert.deepEqual([unlinked.actor, unlinked.authorKind, unlinked.reason], [REVIEWER, 'person', 'The dependency was recorded the wrong way round.']);
    assert.ok(unlinked.fields.some(x => x.key === 'relationships'), 'the journal says the links changed');
    // The record retires with who, when and why; the activity row says who and of what kind; and it comes back.
    await ok({type: 'record.retire', payload: {ids: [fee.id], chapter: 1, reason: 'The fee is recorded by the payments service.'}}, {as: REVIEWER});
    const left = state.document.retired.records.find(x => x.id === fee.id);
    assert.deepEqual([left.actor, left.reason, typeof left.at], [REVIEWER, 'The fee is recorded by the payments service.', 'string']);
    assert.equal(left.record.provenance.author.by, ARCHITECT, 'the retired record keeps who wrote it');
    const row = (await activity())[0];
    assert.deepEqual([row.command, row.actor, row.authorKind, row.reviewed], ['record.retire', REVIEWER, 'person', true]);
    await ok({type: 'record.restore', payload: {ids: [fee.id], chapter: 1}});
    const restored = req(state.document, 'Record the fee paid');
    assert.deepEqual([restored.provenance.author.by, restored.provenance.reviewed.by], [ARCHITECT, REVIEWER], 'restored as it left: its author and its reviewer, not the person who restored it');
    pass('a record leaves the design only through the one retire path, with who, when and why, and is restored as it left, its author and reviewer kept; deleting it outright is refused, and so is retiring it while a link names it; removing the link is an edit, journalled with its author and reason');
  }

  // ---------------------------------------------------------------- 9. disclosures derived from stored authorship (GR-GOV-07)
  {
    const d = solDisclosure(state.document), s9 = provenanceSummary(state.document);
    assert.deepEqual([d.drafted, d.notReviewed], [s9.solDrafted, s9.solDraftedNotReviewed]);
    assert.match(d.line, new RegExp('^Sol drafted ' + d.drafted + ' records; ' + d.notReviewed + ' of them (is|are) not reviewed by a person\\.$'));
    assert.equal(guidanceFooter({configured: false}, d), 'Rule-based guidance · No language model is connected · Sol drafted ' + d.drafted + ' records, ' + d.notReviewed + ' not reviewed by a person');
    // A project an agent account creates with a brief: the brief's evidence version says the agent sent it, as Sol's draft.
    const made = await api('/api/projects', 'POST', {name: 'Agent-made project', template: 'blank', brief: 'The registry keeps each permit application once with its reference, and tells the applicant the decision.'}, AGENT);
    assert.equal(made.status, 201);
    const v = (await made.json()).document.coauthoring.sources.find(x => x.kind === 'brief').versions[0];
    assert.match(v.location, new RegExp('^Opening brief sent at project creation by the agent account ' + AGENT + ', as a draft by Sol, not reviewed by a person · text SHA-256 [a-f0-9]{64}$'));
    assert.deepEqual(v.author, {kind: 'sol-draft', by: AGENT, account: 'agent'});
    // The evidence section says what Sol drafted, from the records: never "no external LLM is connected".
    const withBrief = await api('/api/projects', 'POST', {name: 'Person-made project', template: 'blank', brief: 'The registry keeps each permit application once.'});
    const doc = (await withBrief.json()).document;
    assert.match(evidenceMarkdown(doc), /Proposals use explicit project rules\. No record was drafted by Sol\./);
    assert.doesNotMatch(evidenceMarkdown(doc), /no external LLM/);
    pass('every disclosure is derived from stored authorship: the evidence section and the footer say how many records Sol drafted that no person reviewed (' + d.line + '), and a brief an agent account sent at creation says so, as Sol\'s draft, never "typed"');
  }

  // ---------------------------------------------------------------- 10. a provenance block on every staged type (GR-GOV-09)
  {
    const bank = await (await api('/api/projects', 'POST', {name: 'Provenance blocks', template: 'bank-payment'})).json();
    id = bank.document.id; await read();
    const block = n => ({basis: ['stated', 'inferred', 'proposed', 'open'][n % 4], source: 'Payments workshop notes, item ' + (n + 1), citations: [{kind: 'record', chapter: 1, id: 'REQ-001', note: 'The requirement it answers'}]});
    const d = () => state.document, firstOf = list => list[0];
    const needsApp = d().technology.needs[0].applicationId;
    const cases = [
      ['relationship', () => ({from: 'REQ-002', to: 'REQ-004', kind: 'supports'}), doc => doc.relationships.find(r => r.from === 'REQ-002' && r.to === 'REQ-004' && r.kind === 'supports')],
      ['logical.connection', () => ({...firstOf(d().logical.connections)}), doc => doc.logical.connections.find(c => c.id === firstOf(d().logical.connections).id)],
      ['realisation.interaction', () => ({...firstOf(d().realisation.connections)}), doc => doc.realisation.connections.find(c => c.id === firstOf(d().realisation.connections).id)],
      ['logical.group', () => ({...firstOf(d().logical.groups)}), doc => doc.logical.groups.find(g => g.id === firstOf(d().logical.groups).id)],
      ['review.narrative', () => ({title: 'Payments design', owner: 'Payments architect', audience: 'Delivery and review', summary: 'How a payment is taken and settled.', scope: 'Chapters 1 to 10.', approach: 'Reviewed chapter by chapter.'}), doc => doc.finalReview.narrative],
      ['interfaces.party', () => ({...firstOf(d().interfaces.parties)}), doc => doc.interfaces.parties.find(x => x.id === firstOf(d().interfaces.parties).id)],
      ['runtime.zone', () => ({...firstOf(d().runtime.zones)}), doc => doc.runtime.zones.find(z => z.id === firstOf(d().runtime.zones).id)],
      ['runtime.path', () => ({...firstOf(d().runtime.paths)}), doc => doc.runtime.paths.find(x => x.id === firstOf(d().runtime.paths).id)],
      ['technology.needs', () => ({applicationId: needsApp, needs: needsFor(d(), needsApp).map(n => ({...n}))}), doc => needsFor(doc, needsApp)[0]]
    ];
    for (const [n, [type, payload, find]] of cases.entries()) {
      assert.ok(type === 'relationship' || type === 'review.narrative' || find(d()), type + ': the reference project holds one to save');
      const p = payload(); delete p.provenance;
      await ok({type, payload: {...p, provenance: block(n)}});
      const r = find(d()), pv = r.provenance || {};
      assert.deepEqual([pv.basis, pv.source, pv.citations?.[0]?.id], [block(n).basis, block(n).source, 'REQ-001'], type + ' keeps its provenance block');
    }
    // Kept across a save that sends none; {} clears it; a malformed block or a citation of nothing is refused.
    const party = firstOf(d().interfaces.parties);
    await ok({type: 'interfaces.party', payload: {...party, provenance: undefined, purpose: (party.purpose || 'Takes part.') + ' It is external.'}});
    assert.equal(firstOf(d().interfaces.parties).provenance?.source, block(5).source, 'a save that sends no block keeps it');
    await refused({type: 'interfaces.party', payload: {...firstOf(d().interfaces.parties), provenance: {basis: 'certain'}}}, /stated, inferred, proposed or open/);
    await refused({type: 'interfaces.party', payload: {...firstOf(d().interfaces.parties), provenance: {citations: [{kind: 'record', chapter: 1, id: 'REQ-999'}]}}}, /names a record this project holds/);
    // The rest of a payload's provenance is the server's: an author sent with the block is not taken.
    await ok({type: 'interfaces.party', payload: {...firstOf(d().interfaces.parties), provenance: {author: {kind: 'import', by: 'someone-else'}, basis: 'proposed'}}});
    assert.deepEqual([firstOf(d().interfaces.parties).provenance.basis, firstOf(d().interfaces.parties).provenance.source, firstOf(d().interfaces.parties).provenance.author.by], ['proposed', block(5).source, ARCHITECT], 'a key sent replaces the block\'s, the others are kept, and the author stays the server\'s');
    // A block staged in a reviewed change lands on the record its command wrote.
    const zone = d().runtime.zones[1] || firstOf(d().runtime.zones), staged = [{type: 'runtime.zone', payload: {...zone, provenance: {basis: 'inferred', source: 'Network diagram, page 2'}}}];
    await ok(batch(staged, {reviewed: true, reason: 'Reviewed the zone.'}));
    assert.equal(d().runtime.zones.find(z => z.id === zone.id).provenance.source, 'Network diagram, page 2');
    // The SDD prints each block apart from what the record says.
    const sdd = assembleSDD(d());
    const register = sdd.slice(sdd.indexOf('# Where the records come from'));
    assert.ok(sdd.includes('# Where the records come from'), 'the SDD has its register of provenance blocks');
    assert.match(register, /- Chapter 1 · [^\n]*REQ-002 supports REQ-004 — Basis: stated · Source: Payments workshop notes, item 1 · Cites: Chapter 1 · REQ-001/);
    assert.match(register, /- Chapter 11 · narrative · Payments design — Basis: stated · Source: Payments workshop notes, item 5/);
    assert.match(register, /- Chapter 6 · [^\n]+ — Basis: stated · Source: Payments workshop notes, item 9/);
    assert.equal(provenanceBlockText(d(), d().finalReview.narrative), 'Basis: stated · Source: Payments workshop notes, item 5 · Cites: Chapter 1 · REQ-001');
    pass('relationships, connections, interactions, groups, the narrative, parties, zones, paths and needs each accept a provenance block (basis, source, citations), checked, kept across a save that sends none and set through a reviewed change; the SDD prints each block in its own register, apart from what the record says');
  }

  // ---------------------------------------------------------------- 11. a row citation opens the row (GR-GOV-18)
  {
    const {bytes} = syntheticWorkbook({rows: 12, seed: 3});
    const call = async (route, body, raw) => { const r = await worker.fetch(new Request('https://aiw.test' + route + (route.includes('?') ? '&' : '?') + 'project=' + id, {method: body || raw ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': ARCHITECT, Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : raw ? {body: raw} : {})}), env); const data = await r.json(); assert.ok(r.status < 300, route + ': ' + JSON.stringify(data).slice(0, 300)); return data; };
    const upload = await call('/api/intake?action=upload&filename=assessment.xlsx', null, bytes);
    const inspect = await call('/api/intake?action=inspect', {uploadId: upload.id, sheet: SHEET});
    const input = {uploadId: upload.id, sheet: inspect.sheet, headerRow: inspect.headerRow, mapping: inspect.mapping, priorityMap: inspect.bands.map};
    const preview = await call('/api/intake?action=preview', input);
    await call('/api/intake?action=apply', {...input, revision: preview.projectRevision, previewStamp: preview.stamp, reviewed: true});
    await read();
    const dataset = state.document.intake.datasets.at(-1), row = state.document.artefacts.find(a => a.provenance?.datasetId === dataset.id);
    const cite = {kind: 'row', datasetId: dataset.id, revision: dataset.revision, externalId: row.externalId};
    const targets = [['quality.driver', () => d2().quality.drivers[0]], ['decision.save', () => d2().decisions.records[0]], ['interfaces.contract', () => d2().interfaces.contracts.find(c => c.state !== 'proposed')], ['runtime.plan', () => d2().runtime.plans[0]]];
    function d2() { return state.document; }
    for (const [type, get] of targets) {
      const r = get(); assert.ok(r, type + ': a record to cite from');
      await ok({type, payload: {...r, provenance: {basis: 'stated', citations: [cite]}}});
      const saved = get(), c = saved.provenance.citations[0], target = citationTarget(state.document, c);
      assert.deepEqual([c.kind, c.datasetId, c.revision, c.externalId], ['row', dataset.id, dataset.revision, row.externalId]);
      const cells = await call(target.url.replace(/^\/api\/intake\?/, '/api/intake?'));
      assert.deepEqual([cells.dataset, cells.revision, cells.row.externalId], [dataset.id, dataset.revision, row.externalId], type + ': the citation opens the row it cites');
      assert.ok(cells.row.values.length >= 1 && cells.headers.length >= 1, type + ': with its original cells and headers');
    }
    pass('a citation of an imported workbook row on a driver, a decision, a contract and a runtime plan opens that row\'s original cells and headers in the revision it cites (/api/intake?action=source)');
  }

  // ---------------------------------------------------------------- 12. Sol's draft edited, kept or drafted again (GR-GOV-06, GR-GOV-25)
  {
    for (const actorId of [REVIEWER, AGENT]) assert.equal((await api('/api/access?project=' + id, 'POST', {actorId, role: 'editor'})).status, 200);
    // A data invariant to draft: a record kind the Worker's carrying of the spark's provenance does not reach.
    await ok({type: 'interfaces.invariant', payload: {title: 'One permit per application', condition: 'An application holds one permit, whatever is repeated.', kind: 'uniqueness', dataIds: [state.document.interfaces.data[0].id]}});
    // Three records as workstream E's drafter applies them (architecture-drafter.js markDrafted): proposals with Sol's
    // mark, applied by a person, and no person's stamp; stored so, as an apply leaves them.
    const doc = structuredClone(state.document), applied = '2026-10-08T09:00:00.000Z';
    const picks = {driver: [2, doc.quality.drivers.at(-1)], invariant: [8, doc.interfaces.invariants.at(-1)], responsibility: [4, doc.logical.responsibilities.at(-1)]};
    for (const [key, [, r]] of Object.entries(picks)) { markDrafted(r, {by: 'sol', kind: 'sol-draft', job: 'job-12', key: 'draft-' + key, bundle: 'bundle-12', reviewed: false, appliedBy: ARCHITECT, appliedAt: applied, groups: [], cites: []}); delete r.provenance.author; delete r.provenance.reviewed; }
    await DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(doc), ARCHITECT, id).run();
    await read();
    const get = key => { const [chapter, r] = picks[key]; return {chapter, r: findRecord(state.document, chapter, r.id).record}; };
    const before = provenanceReading(state.document);
    for (const key of Object.keys(picks)) { const {chapter, r} = get(key); assert.equal(recordLabel(state.document, r, chapter), 'Drafted by Sol · not reviewed', key); assert.equal(sddAuthor(r), 'sol', key); }
    // A person saves a change to the drafted driver: the person's edit, with its date, on Sol's mark and on the stamp.
    const driver = get('driver').r;
    await ok({type: 'quality.driver', payload: {...driver, title: driver.title + ' (restated)'}}, {as: REVIEWER});
    const edited = get('driver').r, mark = edited.provenance.draft;
    assert.equal(edited.state, undefined, 'the save makes it the design\'s');
    assert.deepEqual([mark.by, mark.edited, mark.editedFields.includes('title'), /^\d{4}-\d{2}-\d{2}T/.test(mark.editedAt), mark.appliedBy], ['sol', true, true, true, ARCHITECT], 'Sol\'s mark stays, with the person\'s edit and when: ' + JSON.stringify(mark));
    assert.deepEqual([edited.provenance.author.kind, edited.provenance.author.by, edited.provenance.author.from], ['person', REVIEWER, 'sol-draft']);
    assert.equal(recordLabel(state.document, edited, 2), 'Written by ' + REVIEWER + ' (from Sol\'s draft)');
    assert.equal(recordProvenance(state.document, edited, 2).line, 'Written by ' + REVIEWER + ' (from Sol\'s draft); applied by ' + ARCHITECT + ' on 2026-10-08; edited on ' + mark.editedAt.slice(0, 10));
    assert.equal(sddAuthor(edited), 'person');
    // A person keeps the drafted invariant as it stands: the person's, from Sol's draft, with who kept it; not an edit.
    await ok({type: 'record.keep', payload: {ids: [picks.invariant[1].id], chapter: 8}}, {as: REVIEWER});
    const kept = get('invariant').r;
    assert.equal(kept.state, undefined); assert.ok(!kept.provenance.draft.edited, 'a keep is not an edit');
    assert.equal(recordLabel(state.document, kept, 8), 'Written by a person (from Sol\'s draft) · kept by ' + REVIEWER);
    assert.equal(sddAuthor(kept), 'person');
    // A person's edit of a record kind the spark does not carry keeps Sol's mark and records the edit too.
    await ok({type: 'interfaces.invariant', payload: {id: kept.id, condition: 'An application holds one permit, whatever is repeated or resent.'}}, {as: REVIEWER});
    const invEdited = get('invariant').r;
    assert.deepEqual([invEdited.provenance.draft?.by, invEdited.provenance.draft?.edited, invEdited.provenance.draft?.editedFields?.includes('condition'), invEdited.provenance.author.from], ['sol', true, true, 'sol-draft'], JSON.stringify(invEdited.provenance));
    assert.equal(recordLabel(state.document, invEdited, 8), 'Written by ' + REVIEWER + ' (from Sol\'s draft)');
    // Sol's drafter saves its responsibility again within its session: still Sol's draft, not a person's edit.
    const resp = get('responsibility').r;
    await ok({type: 'logical.responsibility', payload: {id: resp.id, purpose: (resp.purpose || 'Serves the permits office.') + ' Drafted again.'}}, {as: AGENT, extra: {authorKind: 'sol-draft', session: 'job-12', reason: 'Sol drafts the responsibility again from the brief.'}});
    const again = get('responsibility').r;
    assert.equal(again.provenance.author.kind, 'sol-draft'); assert.ok(again.provenance.draft && !again.provenance.draft.edited, 'Sol\'s own save keeps its mark and is not a person\'s edit');
    assert.equal(recordLabel(state.document, again, 4), 'Drafted by Sol · not reviewed');
    assert.equal(sddAuthor(again), 'sol');
    // The SDD reads the same records the same way: two of the three are the person's now, one is still Sol's, on its
    // cover and in Appendix E; and Appendix E prints the provenance blocks apart from what the records say (GR-GOV-09).
    const after = provenanceReading(state.document);
    assert.deepEqual([after.by.sol, after.by.person], [before.by.sol - 2, before.by.person + 2], JSON.stringify([before.by, after.by]));
    const md = sddDocument(state.document, {figures: false}).markdown, appendix = md.slice(md.indexOf('## E. Provenance'));
    assert.ok(md.includes('Provenance: ' + after.line) && appendix.startsWith('## E. Provenance\n\n' + after.line), 'the cover and Appendix E print the one reading');
    const blocks = provenanceBlocksMarkdown(state.document).split('\n').filter(l => l.startsWith('- Chapter ')).length, inE = appendix.slice(appendix.indexOf('**Where the records come from**')).split('\n\n')[2].split('\n');
    assert.ok(blocks > 0 && appendix.includes('**Where the records come from**'), 'Appendix E prints the provenance blocks');
    assert.equal(inE.filter(l => l.startsWith('- Chapter ')).length, Math.min(blocks, LIST_MAX), 'at most ' + LIST_MAX + ' of them');
    if (blocks > LIST_MAX) assert.equal(inE.at(-1), '- And ' + (blocks - LIST_MAX) + ' more record' + (blocks - LIST_MAX === 1 ? '' : 's') + ' with a provenance block, each in the review registers (Appendix D).');
    pass('a person\'s change to Sol\'s draft is the person\'s edit with its date, on Sol\'s mark (edited, the fields, when) and the stamp, for a driver and for a data invariant; a keep makes the draft the person\'s with who kept it; Sol saving its draft again is still Sol\'s; the SDD\'s cover and Appendix E read the one reader (' + after.line + '), and Appendix E prints ' + Math.min(blocks, LIST_MAX) + ' of the ' + blocks + ' provenance blocks');
  }
} finally { DB.close(); }
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
