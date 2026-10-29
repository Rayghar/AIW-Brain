// Sol's model path read as a reader reads it (round 23; BR-11, BR-12, C2-03): a synthetic test double answers every
// theme of a small grouped project with one proposal of each of the nine kinds, through the architecture job (packet,
// schema, guard), Sol's bundle and the apply, into the SDD's architecture edition, which the content standard reads.
// The double stands in for a provider; nothing here calls one, and nothing here is client text.
//   1. every theme is accepted and every kind is placed; nothing a person decides is decided for them;
//   2. section 2 prints the driver Sol proposed with its description and impact;
//   3. section 3 prints Sol's preferred alternative as a proposal, its justification by driver and its impact, and the
//      reader reads the decision as stated without asking why the other alternative was not chosen; (round 25) the
//      drivers' lean follows Sol's proposal as AIW's reading, apart, and the trade-off analysis says whose the effects are;
//   4. section 4 prints the component with its responsibility sentences and architectural solution, and the party Sol
//      proposed with the component that would use it, as a proposal;
//   5. the provenance names the drafts as Sol's with the model, not reviewed by a person;
//   6. (round 24, D-24-06) the same design printed in format 1 and in format 2 reads the same, record by record.
// Run: npm run test:sol-sdd
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {draftArchitecture, applySteps, nounPhrase} from './public/architecture-drafter.js';
import {validateArchitectureDraft, guardArchitectureDraft} from './public/architecture-contract.js';
import {runArchitectureJob} from './architecture-job.js';
import {DUAL_CONTROL} from './public/security-domain.js';
import {sddDocument} from './public/sdd-document.js';
import {SKELETON_BANNER, contentReading} from './public/sdd-content.js';
import {architectureMarkdown} from './public/sdd-architecture.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS ' + n); };
const at = '2026-10-14T00:00:00.000Z';
const ROWS = [
  ['Deposit accounts', 'Posting', 'Record each ledger posting with balanced debit and credit entries'],
  ['Deposit accounts', 'Posting', 'Update the account balance after each ledger posting'],
  ['Deposit accounts', 'Approvals', 'A maker enters a manual adjustment and a checker authorises it before it is applied'],
  ['Payments', 'Day end', 'Run the end-of-day interest accrual for every account'],
  ['Payments', 'Clearing', 'Send each outgoing payment to the national clearing system'],
  ['Payments', 'Clearing', 'Reconcile each outgoing payment with the national clearing system before the cut-off'],
  ['Customer records', 'Record keeping', 'Keep the history of every customer profile'],
  ['Customer records', 'Record keeping', 'Store each customer profile change with the user who made it']
];
let g = withFinalReview(createProject({name: 'Synthetic bank, model path', template: 'blank'}, 'sol-sdd', at));
for (const [domain, capability, title] of ROWS) g = applyCommand(g, {type: 'artefact', payload: {type: 'requirement', title, description: title + '.', owner: 'Banking operations', source: 'Synthetic register', priority: 'Must', acceptance: 'Given the start, when it happens, then the result is recorded.', domain, capability}}).document;
const reqs = g.artefacts.filter(a => a.type === 'requirement'), idOf = t => reqs.find(a => a.title === t).id;
for (const domain of new Set(ROWS.map(r => r[0]))) g = applyRequirementsCommand(g, {type: 'requirements.group', payload: {title: domain, kind: 'domain', memberIds: ROWS.filter(r => r[0] === domain).map(r => idOf(r[2]))}}, at, 'architect-p').document;
for (const theme of new Set(ROWS.map(r => r[1]))) g = applyRequirementsCommand(g, {type: 'requirements.group', payload: {title: theme, kind: 'theme', memberIds: ROWS.filter(r => r[1] === theme).map(r => idOf(r[2]))}}, at, 'architect-p').document;
const skeleton = draftArchitecture(g);

// One theme's answer: a proposal of every kind, each citing the theme's first requirement and restating it as its basis;
// what the source does not state is "not stated".
const cap = s => s[0].toUpperCase() + s.slice(1), cites = r => ({requirementRefs: [r.ref], passages: [], basis: r.statement});
const NS = 'not stated';
function answer(packet) {
  const r = packet.requirements[0], name = nounPhrase(r.statement) || 'source process', N = cap(name);
  const driver = N + ' timeliness', resp = N + ' processing', comp = N + ' service', party = N + ' gateway';
  return {keep: [], proposals: [
    {kind: 'driver', driverKind: 'operational', quality: 'none', title: driver, description: `The ${name} must be handled on time and in order. Late handling delays what the business promises its customers.`, impact: `The architecture separates the ${name} work from the enquiries so one cannot slow the other. It needs a processing path that can be watched and restarted.`, priority: 'Medium', priorityReason: `the ${name} supports a daily business process`, lensConcern: 'none', stimulus: NS, conditions: NS, response: NS, metric: NS, targetValue: NS, unit: NS, ...cites(r), interpretation: `Sol proposes treating the ${name} as an operational driver.`},
    {kind: 'responsibility', title: resp, statement: `Sol proposes one responsibility that handles each ${name} from intake to completion.`, ...cites(r), interpretation: `Sol proposes a single owner for the ${name} work.`},
    {kind: 'component', title: comp, componentKind: 'application service', responsibilities: [`It receives each ${name} and checks it is complete.`, `It records each accepted ${name} once, with its reference.`, `It reports each ${name} it could not complete, with the reason.`], solution: `A stateless service behind a durable queue, with its own store for the ${name} records.`, properties: [{concern: 'availability', statement: `It keeps accepting each ${name} while a downstream part is unavailable.`}], uses: [], serves: [{driver, reason: `It keeps each ${name} on time and in order.`}], realises: [resp], ...cites(r), interpretation: `Sol proposes a service that owns the ${name} work.`},
    {kind: 'decision', question: `How should the ${name} be processed?`, category: 'structural', context: `The ${name} arrives during the business day and must not be lost.`, alternatives: [{title: 'Process each item at once', approach: `Handle each ${name} as it arrives.`, consequences: ['Each caller waits for the result.'], effects: [{driver, effect: 'tension', reason: 'A slow step delays every caller.'}]}, {title: 'Queue each item for a worker', approach: `Queue each ${name} for a worker that handles it.`, consequences: ['The caller gets an acknowledgement first.'], effects: [{driver, effect: 'supports', reason: 'The queue absorbs bursts without delaying callers.'}]}], preferred: 'Queue each item for a worker', justification: [{driver, effect: 'supports', reason: 'A queue keeps the intake responsive while the worker catches up.'}], impact: `A queue and a worker join the design, and every ${name} is acknowledged before it is handled.`, openQuestions: ['What volume arrives at the busiest hour?'], ...cites(r), interpretation: `Sol proposes queueing the ${name}.`},
    {kind: 'data', entity: N + ' record', purpose: `Holds each ${name} with its reference and state.`, owner: comp, keyFields: ['reference', 'state'], classification: 'not classified yet', ...cites(r), interpretation: `Sol proposes one record per ${name}.`},
    {kind: 'integration', party, purpose: `Exchanges each ${name} with the outside party that receives it.`, formats: NS, protocols: NS, security: NS, challenges: NS, direction: 'outbound', component: comp, question: `Which protocol and message format does the ${party} use?`, ...cites(r), interpretation: `Sol proposes an outbound exchange for the ${name}.`},
    {kind: 'control', title: N + ' dual control', category: DUAL_CONTROL, statement: `A second person authorises each sensitive change to a ${name}.`, component: comp, makerRole: NS, checkerRole: NS, ...cites(r), interpretation: `Sol proposes dual control on the ${name}.`},
    {kind: 'batch', title: N + ' end-of-day run', trigger: NS, schedule: NS, window: NS, cutOff: NS, predecessors: [], restartPoint: NS, volume: NS, component: comp, target: party, ...cites(r), interpretation: `Sol proposes an end-of-day run for the ${name}.`},
    {kind: 'question', question: `Who owns the ${name} outside business hours?`, ...cites(r), interpretation: 'Sol asks the architect.'}
  ]};
}
const withheld = [];
let calls = 0;
const request = async packet => {
  calls++;
  if (packet.task === 'architecture-cross') return {result: {proposals: [], withheld: [], keep: [], merges: []}, provider: 'Synthetic provider', model: 'synthetic-double', providerResponseId: 'cross'};
  const result = guardArchitectureDraft(packet, validateArchitectureDraft(answer(packet), packet));
  withheld.push(...result.withheld);
  return {result, provider: 'Synthetic provider', model: 'synthetic-double', providerResponseId: 'theme-' + calls};
};
const run = await runArchitectureJob(g, skeleton, {request});
const steps = applySteps(g, run.bundle, {at, actor: 'architect-p', jobId: 'sol-sdd'});
let step; while (!(step = steps.next()).done) { /* apply, step by step */ }
const doc = step.value.document, sdd = sddDocument(doc, {figures: false}), md = sdd.markdown;
const section = n => md.split(new RegExp('^# ' + n + '\\. ', 'm'))[1]?.split(/^# \d\. /m)[0] || '';
const s2 = section(2), s3 = section(3), s4 = section(4), model = r => r.provenance?.draft?.engine === 'model';

// 1. Accepted, placed, and nothing decided for a person.
{
  const themes = run.bundle.basis.themes;
  assert.ok(themes >= 4, 'the project has its themes: ' + themes);
  assert.equal(run.bundle.basis.drafted, themes, 'every theme is accepted');
  assert.deepEqual(withheld.map(w => w.kind + ': ' + w.issues.join(' ')), [], 'nothing withheld');
  const placed = {drivers: doc.quality.drivers.filter(model).length, decisions: doc.decisions.records.filter(model).length, responsibilities: doc.logical.responsibilities.filter(model).length, components: doc.realisation.components.filter(model).length, parties: doc.interfaces.parties.filter(model).length, data: doc.interfaces.data.filter(model).length, contracts: doc.interfaces.contracts.filter(model).length, controls: doc.security.controls.filter(model).length};
  for (const [k, n] of Object.entries(placed)) assert.ok(n > 0, k + ' placed from the model: ' + JSON.stringify(placed));
  const decisions = doc.decisions.records.filter(model);
  assert.ok(decisions.every(d => !d.selectedAlternativeId), 'no alternative is chosen for a person');
  assert.ok(decisions.every(d => d.state === 'proposed'), 'each decision stays a proposal');
  pass('a double answering all nine kinds for ' + themes + ' themes: every theme accepted, nothing withheld, drivers, decisions, responsibilities, components, parties, data, contracts and controls placed from the model; no alternative chosen and every decision a proposal');
}

// 2. Section 2: the driver as Sol proposed it.
{
  const od = s2.split(/\n(?=\*\*[A-Z]{1,2}\d+: )/).find(x => /^\*\*OD\d+: .+ timeliness\*\*/.test(x)) || '';
  assert.match(od, /\nDescription: The .+ must be handled on time and in order\./, 'its description');
  assert.match(od, /\nImpact on the architecture: The architecture separates /, 'its impact');
  assert.match(od, /\nPriority: Medium, because the .+ supports a daily business process\.? \(Sol’s reading\)/, 'its priority with Sol’s reason, then whose reading it is');
  assert.ok(!s2.includes(SKELETON_BANNER), 'section 2 is not called a skeleton Sol has not drafted');
  pass('section 2 prints the operational driver Sol proposed with its description, its impact and its priority with Sol’s reason');
}

// 3. Section 3: Sol's preference as a proposal, read as the decision stated.
{
  const adr = s3.split(/\n(?=### ADR-)/).find(x => /^### ADR-\d+ · How should the .+ be processed\?/.test(x)) || '';
  assert.match(adr, /\*\*Decision\*\*: Open: no alternative is chosen yet\. Preferred: ALT-\d+ · Queue each item for a worker, proposed by Sol/, 'the preference is Sol’s proposal, not a choice');
  assert.match(adr, /\*\*Impact\*\*: A queue and a worker join the design/, 'its impact');
  assert.match(adr, /\*\*Decision\*\*: [^\n]*, proposed by Sol, not accepted\. Under consideration: ALT-\d+ · /, 'the decision line names the preference; its reasons print once, under Justification');
  assert.match(adr, /- .+ \(OD\d+\): the preferred ALT-\d+ supports it/, 'its justification by driver');
  const findings = sdd.content.findings.filter(f => f.section === 3 && /How should the .+ be processed/.test(f.title));
  assert.ok(!findings.some(f => f.field === 'decision' || f.check === 'why-not'), 'the reader reads Sol’s proposal as the decision stated, and asks no person’s reason why not: ' + JSON.stringify(findings.slice(0, 3)));
  // Round 25 (D-25-07): AIW's reading of the drivers follows Sol's proposal, apart, and leaves it as it was: the drivers
  // lean to the alternative Sol prefers here, which is AIW's reading and not a choice; the trade-off analysis weighs
  // Sol's assessments and says whose they are.
  assert.match(adr, /\*\*Decision\*\*: Open: no alternative is chosen yet\. Preferred: (ALT-\d+) · Queue each item for a worker, proposed by Sol, not accepted\. Under consideration: [^\n]+\. The drivers lean to \1 · Queue each item for a worker \(AIW’s reading of the recorded effects at the default weights; not a choice\)\.\n/, 'Sol’s proposal, then the drivers’ lean as AIW’s reading, apart');
  const weighed = s3.slice(s3.indexOf('\n## Trade-off analysis\n')).split(/\n(?=\*\*ADR-)/).find(x => /^\*\*ADR-\d+ · How should the .+ be processed\?\*\*/.test(x)) || '';
  assert.match(weighed, /\nCriteria: OD\d+ ×2\. The effects are Sol’s assessments, not reviewed by a person\.\n/, 'the trade-off analysis says the effects are Sol’s, not reviewed by a person');
  assert.match(weighed, /\n\| ALT-\d+ · Process each item at once \| −2 \| OD\d+ − \| 2 of 2; dominated by ALT-\d+ \|\n/, 'and weighs the alternatives: ' + weighed);
  pass('section 3 prints Sol’s preferred alternative as a proposal with its justification by driver and its impact; the content reader reads it as the decision stated and asks no reason why the other was not chosen; the drivers’ lean follows as AIW’s reading, apart, and the trade-off analysis says the effects are Sol’s');
}

// 4. Section 4: the component in sentences, its solution, and the party with its proposed user.
{
  const line = s4.split('\n').find(l => /^\*\*\d+\. APP-\d+ · .+ service\*\* \(/.test(l) && /It receives each /.test(l)) || '';
  assert.match(line, /It receives each .+\. It records each accepted .+\. It reports each .+ it could not complete, with the reason\./, 'three responsibility sentences');
  const table = s4.split(/^## Component specification table/m)[1] || '';
  assert.match(table, /\| A stateless service behind a durable queue, with its own store for the .+ records\. \|/, 'the architectural solution in the specification table');
  const party = s4.split(/\n(?=### \d+\. )/).find(x => /^### \d+\. EXT-\d+ · .+ gateway/.test(x)) || '';
  assert.match(party, /\nPurpose: Exchanges each /, 'the party’s purpose');
  // Format 2 (D-24-06): what the source does not state is asked, not invented: the party prints no value for it, its
  // marker names the fields as asked, and the section's open questions ask the question once, naming the fields.
  assert.ok(!/\n(?:Data formats|Protocols|Security considerations): /.test(party) && /\n<!-- aiw:open [^>]*\bprotocols\?/.test(party), 'what the source does not state is not printed as a value; the party’s marker names it as asked');
  const ext = /^### \d+\. (EXT-\d+) · (.+)$/m.exec(party), asked = s4.slice(s4.indexOf('\n## Open questions\n')).split('\n').filter(l => l.startsWith('- Which protocol and message format does the ' + ext[2] + ' use? ('));
  assert.equal(asked.length, 1, 'the question asked once in the section’s open questions');
  assert.ok(asked[0].endsWith('(' + ext[1] + ': data formats, protocols and security considerations)'), 'naming the party and the three fields it is asked of, on one line: ' + asked[0]);
  assert.equal(s4.split('Which protocol and message format does the ' + ext[2] + ' use?').length - 1, 1, 'and nowhere else in section 4');
  assert.match(party, /\nUsed by: proposed, not decided: APP-\d+ .+ service through IF-\d+(?:, IF-\d+)*\./, 'the component that would use it, as a proposal');
  assert.match(party, /\nHow the architecture handles it: APP-\d+ .+ service calls it through IF-\d+ .+ \(read from AIW’s proposed contracts, not decided\)/, 'how the architecture handles it, from the proposed contracts and labelled so');
  pass('section 4 prints the component with three responsibility sentences and its solution, and the party with its purpose, its unanswered protocol as a question, how the architecture handles it and the component that would use it, both read from the proposed contracts and labelled as not decided');
}

// 5. Provenance.
{
  const prov = md.split('\n').find(l => l.startsWith('Provenance: ')) || '';
  assert.match(prov, /drafted by Sol, not reviewed by a person/, 'Sol’s drafts, not reviewed');
  assert.match(prov, /Of Sol’s drafts: \d+ with the model \(Synthetic provider · synthetic-double\)/, 'drafted with the model, naming its provider and model');
  assert.ok(!/approved|verified/i.test(prov.replace(/Approval is printed only from approval records\./, '')), 'nothing claims approval');
  pass('the provenance names Sol’s drafts as drafted with the model (provider and model), not reviewed by a person, and claims no approval');
}

// 6. Format 1 and format 2 read the same (D-24-06): the design's integrations ask their questions, which the content
// standard counts as stated, so the reader must find them asked in format 2 as it did beside each field in format 1.
{
  const one = architectureMarkdown(doc, {format: 1}), two = architectureMarkdown(doc, {format: 2}), plain = r => JSON.parse(JSON.stringify(r));
  assert.ok(!/<!-- aiw:sdd-format/.test(one.markdown) && /^Protocols: open: Which protocol/m.test(one.markdown), 'format 1 asks beside each field');
  assert.deepEqual(plain(two.content), plain(one.content), 'the reading of the edition as built is the same');
  assert.deepEqual(plain(contentReading(two.markdown)), plain(contentReading(one.markdown)), 'and of its Markdown reread without the project');
  assert.deepEqual(plain(sdd.content), plain(two.content), 'and the export reads as the format-2 edition');
  pass('format 1 and format 2 of the drafted design read the same: ' + two.content.line);
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 1));
