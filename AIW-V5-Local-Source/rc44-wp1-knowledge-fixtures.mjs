// rc44, work package 1 (versioned, usable knowledge): synthetic text and builders for the wp1 suites.
// Nothing here is knowledge and no handbook text is used: the "Synthetic Integration Handbook" below was written for
// these suites (system "Northquay Parcel Notices": a booking service tells partner carriers that a parcel was booked,
// once per booking, even while the broker is unavailable). Every form is a candidate until a second person verifies it.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyKnowledgeCommand, knowledgeStamp, knowledgeImpactStamp} from './public/knowledge-governance.js';

export const AT = '2026-11-16T09:00:00.000Z';
export const ACCOUNTS = {importer: 'importer', reviewer: 'reviewer', releaser: 'releaser', architect: 'architect', second: 'second-architect', bot: 'bot'};
// The commit's author as the command boundary states it (authorship.js commitAuthor).
export const person = id => ({author: {kind: 'person', id, account: 'person', reviewed: true}});
export const importedBy = id => ({author: {kind: 'import', id, account: 'person', reviewed: true}});
export const solDraft = id => ({author: {kind: 'sol-draft', id, account: 'person', reviewed: false}});
export const agent = id => ({author: {kind: 'sol-draft', id, account: 'agent', reviewed: false}});

// ------------------------------------------------------------------------------------------------ the synthetic handbook
// One entry in full (SYN-P001) and three short ones. A claim's lines are lines of its source, the first line being 1.
export const SYN_P001 = [
  '# SYN-P001 Transactional outbox',
  'Synthetic Integration Handbook | pattern | Reliable publication',
  '',
  '## Definition',
  'A transactional outbox stores the notice to be published in the same local transaction as the booking record, and a relay sends it afterwards.',
  'It is not exactly-once delivery: the relay may send a notice again after a crash, so a receiver must tolerate repeats.',
  'Outbox row: the stored notice awaiting publication. Relay: the worker that publishes stored notices.',
  '',
  '## How it works',
  'Step one: the booking service writes the booking and the outbox row in one commit.',
  'Step two: the relay claims a small batch of unsent rows and publishes each notice to the broker.',
  'Step three: the relay marks a row as sent only after the broker confirms it.',
  'The effect on integrity is that a committed booking always has a stored notice; the cost is added delay before publication.',
  '',
  '## When to use it',
  'Use it when a committed booking must always lead to a partner notice, even while the broker is unavailable.',
  'Avoid it when the caller only reads data and nothing has to be published afterwards.',
  'It needs a store that commits the booking and the outbox row together.',
  'The bounded claim is that no committed booking loses its notice; it does not establish that a carrier acted on the notice.',
  '',
  '## Choosing between alternatives',
  'Choose the polling relay when the store supports short claims and simple operation matters more than delay.',
  'Choose log capture when an approved capture platform already exists and low delay justifies its operation.',
  'A direct call is the candidate when nothing must survive a broker outage; its contraindication is any durable obligation, and a failure-injection record is the evidence needed.',
  '',
  '## Parts and rules',
  'The outbox writer belongs to the booking service and is required.',
  'The relay is a separate worker that owns publication attempts.',
  'The pattern requires an idempotent receiver because a notice can arrive twice.',
  'It conflicts with an unsafe dual write, where the booking and the notice are written separately.',
  'Invariant: the booking and its outbox row are written in the same local transaction.',
  'Parameter claim batch size, in rows: bound it by lock time and broker capacity; too large a batch holds locks for too long. A teaching value is 50 rows.',
  'Port outbox rows, consumed: committed rows with a unique notice identity.',
  'Sequence: first commit, then claim, then publish, then mark as sent; if publishing fails the row stays unsent.',
  '',
  '## Sizing the backlog',
  'The oldest unsent notice age is the time now minus the commit time of the oldest unsent row.',
  'Inputs are the commit time of the oldest unsent row, in seconds, and the current time, in seconds.',
  'The result is bounded by the relay polling interval plus the broker outage length.',
  'It does not consider clock skew between the store and the relay.',
  'A worked teaching value: an outage of 120 seconds gives an age of about 120 seconds.',
  '',
  '## Checking it',
  'Scenario crash after publish: given a published notice that is not yet marked, when the relay restarts, then the notice is sent again and the receiver applies it once.',
  'The evidence required is a crash-injection record with notice identities reconciled; the handbook proposes this test and did not run it.',
  'Failure mode: cleanup deletes unsent rows by age; the signal is a booking with no notice; the response is to restore the rows with their original identities.',
  'Metric oldest unsent notice age, in seconds, measured from local commit to broker confirmation over all unsent rows, as a maximum per minute; unknown when the relay is not reporting.',
  'Signal relay lag, in seconds: a rising value means publication is falling behind.',
  '',
  '## Example',
  'A broker outage lasts two minutes while forty bookings are accepted; every booking keeps its outbox row.',
  'When the broker returns, the relay publishes the forty notices in order of commit.',
  'The expected outcome is forty notices and no lost booking; the numbers are teaching assumptions.',
  '',
  '## Practice',
  'Beginner: draw the commit, publish and mark steps and show where a crash repeats a notice.',
  'Intermediate: decide a claim batch size for a store with short lock limits and explain the basis.',
  'Advanced: design ordering across two relay workers without holding locks during broker calls.'
];
export const SYN_P002 = [
  '# SYN-P002 Idempotent receiver',
  'Synthetic Integration Handbook | pattern | Reliable consumption',
  '',
  'An idempotent receiver records the identity of each notice it has applied and ignores a notice it has already applied.',
  'It is needed wherever a sender may deliver the same notice more than once.'
];
export const SYN_A001 = [
  '# SYN-A001 Unsafe dual write',
  'Synthetic Integration Handbook | anti-pattern | Reliable publication',
  '',
  'An unsafe dual write saves the booking and publishes the notice as two separate steps with no shared commit.',
  'A crash between the two steps leaves a booking that no carrier ever hears about.'
];
export const SYN_C001 = [
  '# SYN-C001 Outbox relay',
  'Synthetic Integration Handbook | component | Messaging',
  '',
  'An outbox relay is the worker that reads committed outbox rows, publishes them and records which were confirmed.',
  'It may publish a row twice after a crash and never invents a row that was not committed.'
];
// A marker no reading of a design project may ever carry while the forms are candidates (rc44 inertness cases).
export const MARKER = 'NORTHQUAY-CANDIDATE-MARKER';
const collapse = v => String(v).replace(/\s+/g, ' ').trim();
// The fixtures' own check, independent of the product's: a quote sits in its lines.
const Q = (body, a, b, quote) => { assert(collapse(body.slice(a - 1, b).join(' ')).includes(collapse(quote)), 'fixture quote not in lines ' + a + '-' + b + ': ' + quote); return {at: [a, b], quote}; };
const q1 = (n, quote) => Q(SYN_P001, n, n, quote);

export const UNIT = {
  kind: 'pattern', mechanism: 'A notice is committed with the booking and sent later by a relay that may deliver it more than once.',
  effects: [{quality: 'integrity', direction: 'supports', rationale: 'A committed booking always has a stored notice.'}, {quality: 'performance', direction: 'tradeoff', rationale: 'Publication is delayed until the relay runs.'}],
  obligations: [{action: 'Receivers deduplicate by the notice identity.', evidence: 'A crash-injection record with notice identities reconciled.'}],
  exclusions: ['Do not describe the result as exactly-once delivery.'],
  placement: [{target: 'data-owner', role: 'outbox writer', reason: 'The notice is written in the owner\'s local transaction.'}]
};
// The nine forms of SYN-P001, each on its own passage: {passage: [start, end], statement, conditions, limitations, content}.
// No quote of a form holds another quote of it and no two entries rest on one quote (ruling G3 of 2026-11-18): the
// narrative of the mechanism, the variant of the selection and the output of the calculation each took a quote of their
// own in the second fix-up (they rested on words inside another entry's quote).
export function p001Forms() {
  return {
    definition: {passage: [5, 7], statement: 'A transactional outbox stores the notice in the booking\'s local transaction and a relay sends it afterwards.', polarity: 'neutral',
      content: {type: 'definition', v: 1, short: 'A notice to publish is stored in the same local transaction as the booking record, and a relay sends it afterwards.',
        quotes: [{field: 'short', quote: 'stores the notice to be published in the same local transaction as the booking record'}],
        distinctions: [{from: 'exactly-once delivery', difference: 'The relay may send a notice again after a crash, so a receiver must tolerate repeats.', ...q1(6, 'It is not exactly-once delivery')}],
        vocabulary: [{term: 'Outbox row', meaning: 'The stored notice awaiting publication.', ...q1(7, 'Outbox row: the stored notice awaiting publication.')}, {term: 'Relay', meaning: 'The worker that publishes stored notices.', ...q1(7, 'Relay: the worker that publishes stored notices.')}]}},
    mechanism: {passage: [10, 13], statement: 'The booking and its notice are committed together; a relay publishes afterwards.', conditions: ['A relay retry keeps the same notice identity.'], limitations: ['A crash between publishing and marking can repeat a notice.'],
      content: {type: 'mechanism', v: 1, narrative: 'The booking and its notice are committed together; a relay publishes afterwards and marks a row only once the broker confirms.',
        quotes: [{field: 'narrative', quote: 'publishes each notice to the broker'}],
        steps: [{n: 1, text: 'The booking service writes the booking and the outbox row in one commit.', ...q1(10, 'writes the booking and the outbox row in one commit')},
          {n: 2, text: 'The relay claims a small batch of unsent rows and publishes each notice.', ...q1(11, 'claims a small batch of unsent rows and publishes each notice')},
          {n: 3, text: 'The relay marks a row as sent only after the broker confirms it.', ...q1(12, 'marks a row as sent only after the broker confirms it')}],
        effects: [{quality: 'integrity', direction: 'supports', mechanism: 'A committed booking always has a stored notice.', potentialCost: 'Added delay before publication.', ...q1(13, 'a committed booking always has a stored notice')}]}},
    applicability: {passage: [16, 19], statement: 'Use it where a committed booking must always lead to a notice; it does not show that a carrier acted.', polarity: 'supports', conditions: ['A local booking must cause a publication.'], limitations: ['Receivers need their own identity record.'], architectureUnit: UNIT,
      content: {type: 'applicability', v: 1,
        useWhen: [{text: 'A committed booking must always lead to a partner notice, even while the broker is unavailable.', ...q1(16, 'a committed booking must always lead to a partner notice')}],
        avoidWhen: [{text: 'The caller only reads data and nothing has to be published afterwards.', ...q1(17, 'the caller only reads data and nothing has to be published afterwards')}],
        prerequisites: [{text: 'A store that commits the booking and the outbox row together.', ...q1(18, 'a store that commits the booking and the outbox row together')}],
        guaranteeBoundary: {boundedClaim: 'No committed booking loses its notice.', doesNotEstablish: [{text: 'That a carrier acted on the notice.', quote: 'it does not establish that a carrier acted on the notice'}], ...q1(19, 'no committed booking loses its notice')}}},
    selection: {passage: [22, 24], statement: 'Polling suits a store with short claims; log capture suits an existing approved capture platform.', polarity: 'neutral', conditions: ['Both keep the repeat window.'], limitations: ['Costs are the handbook\'s description, not measurements.'],
      content: {type: 'selection', v: 1,
        alternatives: [{target: {label: 'Polling relay'}, chooseWhen: 'The store supports short claims and simple operation matters more than delay.', cost: 'Publication waits for the next poll.', ...q1(22, 'the store supports short claims and simple operation matters more than delay')},
          {target: {label: 'Log capture'}, chooseWhen: 'An approved capture platform already exists and low delay justifies its operation.', cost: 'The capture platform must be operated.', ...q1(23, 'an approved capture platform already exists')}],
        rules: [{condition: 'Nothing must survive a broker outage.', candidate: 'A direct call.', contraindication: 'Any durable obligation.', evidenceNeeded: 'A failure-injection record.', ...q1(24, 'A direct call is the candidate when nothing must survive a broker outage')}],
        variants: [{name: 'Polling relay', chooseWhen: 'Short claims are supported.', tradeoff: 'Simple operation at the price of delay.', ...q1(22, 'Choose the polling relay when the store supports short claims')}]}},
    composition: {passage: [27, 34], statement: 'The pattern has an outbox writer and a relay, requires an idempotent receiver and conflicts with an unsafe dual write.', polarity: 'requires', conditions: ['Receivers perform effects on delivery.'], limitations: ['Roles are the handbook\'s, not a project\'s.'],
      content: {type: 'composition', v: 1,
        roles: [{id: 'outbox-writer', name: 'Outbox writer', responsibility: 'Writes the outbox row with the booking.', recordKind: 'component', required: true, ...q1(27, 'The outbox writer belongs to the booking service and is required.')},
          {id: 'relay', name: 'Relay', responsibility: 'Owns publication attempts.', recordKind: 'component', required: true, ...q1(28, 'The relay is a separate worker that owns publication attempts.')}],
        relations: [{verb: 'requires', target: {conceptId: 'SYN-P002'}, reason: 'A notice can arrive twice.', ...q1(29, 'requires an idempotent receiver because a notice can arrive twice')},
          {verb: 'conflicts-with', target: {label: 'Unsafe dual write'}, reason: 'The booking and the notice are written separately.', ...q1(30, 'It conflicts with an unsafe dual write')}],
        invariants: [{kind: 'publication', statement: 'The booking and its outbox row are written in the same local transaction.', ...q1(31, 'the booking and its outbox row are written in the same local transaction')}],
        parameters: [{name: 'claim_batch_size', type: 'integer', unit: 'rows', meaning: 'Rows held by one relay attempt.', selectionBasis: 'Bound it by lock time and broker capacity.', wrongChoice: 'Too large a batch holds locks for too long.', required: true, example: {value: 50, evidenceLevel: 'illustrative'}, ...q1(32, 'bound it by lock time and broker capacity')}],
        ports: [{name: 'Outbox rows', direction: 'consumed', contract: 'Committed rows with a unique notice identity.', ...q1(33, 'committed rows with a unique notice identity')}],
        sequence: [{step: 1, ownerRole: 'outbox-writer', text: 'Commit the booking and the outbox row.', ...q1(34, 'first commit, then claim, then publish, then mark as sent')},
          {step: 2, ownerRole: 'relay', text: 'Claim, publish, then mark as sent.', onFailure: 'The row stays unsent.', ...q1(34, 'if publishing fails the row stays unsent')}]}},
    calculation: {passage: [37, 41], statement: 'The age of the oldest unsent notice is the time now minus the commit time of the oldest unsent row.', polarity: 'neutral', conditions: ['The relay reports its unsent rows.'], limitations: ['Clock skew is not considered.'],
      content: {type: 'calculation', v: 1, modelKind: 'oldest-unsent-age', purpose: 'Estimate how long the oldest unsent notice has waited.',
        relation: 'The age is the time now minus the commit time of the oldest unsent row.', bounds: 'Bounded by the relay polling interval plus the broker outage length.',
        quotes: [{field: 'purpose', quote: 'The oldest unsent notice age is'}, {field: 'relation', quote: 'the time now minus the commit time of the oldest unsent row'}, {field: 'bounds', quote: 'bounded by the relay polling interval plus the broker outage length'}],
        inputs: [{name: 'commit_time_oldest_unsent', unit: 'seconds', meaning: 'Commit time of the oldest unsent row.', ...q1(38, 'the commit time of the oldest unsent row, in seconds')}, {name: 'now', unit: 'seconds', meaning: 'The current time.', ...q1(38, 'the current time, in seconds')}],
        outputs: [{text: 'The age of the oldest unsent notice, as the result.', ...q1(39, 'The result is bounded by the relay polling interval')}],
        notConsidered: [{text: 'Clock skew between the store and the relay.', ...q1(40, 'It does not consider clock skew between the store and the relay.')}],
        workedValues: [{name: 'outage', value: 120, unit: 'seconds', evidenceLevel: 'illustrative', ...q1(41, 'an outage of 120 seconds gives an age of about 120 seconds')}]}},
    verification: {passage: [44, 48], statement: 'A crash after publishing and the age of the oldest unsent notice check the pattern.', polarity: 'neutral', conditions: ['A relay and a broker that can be correlated.'], limitations: ['The handbook proposes the test and did not run it.'],
      content: {type: 'verification', v: 1,
        scenarios: [{id: 'crash-after-publish', given: 'A published notice that is not yet marked.', when: 'The relay restarts.', then: 'The notice is sent again and the receiver applies it once.', evidenceRequired: 'A crash-injection record with notice identities reconciled.', evidenceLevel: 'proposed', ...Q(SYN_P001, 44, 45, 'when the relay restarts, then the notice is sent again and the receiver applies it once')}],
        failureModes: [{failure: 'Cleanup deletes unsent rows by age.', signal: 'A booking with no notice.', response: 'Restore the rows with their original identities.', ...q1(46, 'cleanup deletes unsent rows by age')}],
        metric: {name: 'oldest_unsent_notice_age', unit: 'seconds', boundary: 'Local commit to broker confirmation.', population: 'All unsent rows.', aggregation: 'Maximum.', window: 'Per minute.', missingData: 'Unknown when the relay is not reporting.', ...q1(47, 'measured from local commit to broker confirmation over all unsent rows')},
        signals: [{name: 'relay_lag', unit: 'seconds', interpretation: 'A rising value means publication is falling behind.', ...q1(48, 'a rising value means publication is falling behind')}]}},
    example: {passage: [51, 53], statement: 'During a broker outage every accepted booking keeps its outbox row and is published when the broker returns.', polarity: 'neutral', conditions: ['An illustrative scenario.'], limitations: ['A teaching design, not an observed incident.'],
      content: {type: 'example', v: 1, title: 'Broker outage with accepted bookings', scenario: 'A broker outage lasts two minutes while forty bookings are accepted.', expectedOutcome: 'Forty notices and no lost booking.',
        quotes: [{field: 'scenario', quote: 'A broker outage lasts two minutes while forty bookings are accepted'}, {field: 'expectedOutcome', quote: 'The expected outcome is forty notices and no lost booking'}],
        steps: [{text: 'Every booking keeps its outbox row during the outage.', ...q1(51, 'every booking keeps its outbox row')}, {text: 'The relay publishes the notices in order of commit when the broker returns.', ...q1(52, 'the relay publishes the forty notices in order of commit')}],
        evidenceLevel: 'illustrative', numbersAre: 'teaching-assumptions'}},
    exercise: {passage: [56, 58], statement: 'Three practice tasks at beginner, intermediate and advanced level.', polarity: 'neutral', conditions: ['Practice only.'], limitations: ['The handbook gives no model answer.'],
      content: {type: 'exercise', v: 1,
        items: [{level: 'beginner', prompt: 'Draw the commit, publish and mark steps and show where a crash repeats a notice.', stage: 'inspect', ...q1(56, 'draw the commit, publish and mark steps')},
          {level: 'intermediate', prompt: 'Decide a claim batch size for a store with short lock limits and explain the basis.', stage: 'decide', ...q1(57, 'decide a claim batch size for a store with short lock limits')},
          {level: 'advanced', prompt: 'Design ordering across two relay workers without holding locks during broker calls.', stage: 'decide', ...q1(58, 'design ordering across two relay workers without holding locks during broker calls')}]}}
  };
}
export const FORM_ORDER = ['definition', 'mechanism', 'applicability', 'selection', 'composition', 'calculation', 'verification', 'example', 'exercise'];
// The fixed claim type and predicate of each form (design b.3), kept here too so the suites state them independently.
export const CLAIM_OF = {definition: ['definition', 'is defined as'], mechanism: ['mechanism', 'works by'], applicability: ['applicability', 'applies when'], selection: ['selection', 'is chosen over alternatives when'], composition: ['composition', 'composes with'], calculation: ['calculation', 'is calculated by'], verification: ['verification', 'is verified by'], example: ['example', 'is illustrated by'], exercise: ['exercise', 'is practised by']};
// The knowledge.claim payload of one form.
export function formClaim(sourceId, conceptId, f) {
  const [claimType, predicate] = CLAIM_OF[f.content.type];
  return {sourceId, lineStart: f.passage[0], lineEnd: f.passage[1], subjectId: conceptId, predicate, statement: f.statement, claimType, polarity: f.polarity || 'neutral', conditions: f.conditions || [], limitations: f.limitations || [], tags: ['form:' + f.content.type], ...(f.architectureUnit ? {architectureUnit: f.architectureUnit} : {}), form: f.content};
}
export const sourcePayload = (title, lines, extra = {}) => ({title, body: lines.join('\n'), revision: 'Synthetic edition 1', path: 'synthetic/integration-handbook.md · ' + title, license: 'Synthetic test material written for the AIW suites; free to use.', ...extra});
export const REVIEW = {reviewed: true, reviewer: 'Synthetic second person', reason: 'Checked the synthetic passage, its permitted use, its conditions and each item of the form.', sourceChecked: true, rightsChecked: true, conditionsChecked: true, decision: 'verified'};
// A blank project with one requirement (REQ-001), so a rationale link has a record to name.
export const blankProject = (id = 'rc44-wp1-library') => applyCommand(withFinalReview(createProject({name: 'Northquay knowledge library', template: 'blank'}, id)), {type: 'artefact', payload: {type: 'requirement', title: 'Tell carriers a parcel was booked', description: 'Each booking leads to one partner notice.', owner: 'Booking team', acceptance: 'A notice is recorded for each booking.', source: 'Synthetic workshop'}}).document;
export const bankProject = () => withFinalReview(createProject({name: 'Bank', template: 'bank-payment'}, 'bank-payment'));

// The fifteen knowledge command types that existed before rc44, each sent once or more through `apply` on a project
// that holds a saved project source and two disagreements with Sol's advice (written into the document, as the
// workbench records them): project-source, source, suggest, dismiss-suggestion, claim (plain, from a suggestion, and an
// opposing one), capture, steward, review, contradiction, release, activate, link, unlink, deactivate, withdraw.
export const LEGACY_TYPES = ['project-source', 'source', 'suggest', 'dismiss-suggestion', 'claim', 'capture', 'steward', 'review', 'contradiction', 'release', 'activate', 'deactivate', 'withdraw', 'unlink', 'link'].map(t => 'knowledge.' + t);
export function legacyWalkBase() {
  const p = structuredClone(blankProject('rc44-wp1-legacy-walk')), assessment = (id, reason) => ({id, itemId: 'M:1:' + p.artefacts.find(a => a.type === 'requirement').id, outcome: 'dismissed', title: 'Tell carriers a parcel was booked', chapter: 1, verdict: 'refine', headline: 'Send the notice inside the booking call.', reason, at: AT, model: 'synthetic', runId: 'run-1', sources: []});
  p.coauthoring = {...p.coauthoring, sources: [...(p.coauthoring?.sources || []), {id: 'SRC-900', versions: [{revision: 1, title: 'Synthetic carrier agreement', excerpt: 'A carrier must be told of each booking within the agreed notice window.', location: 'synthetic/agreement.txt'}]}], assessments: [assessment('SA-901', 'The carrier gateway already retries a failed notice.'), assessment('SA-902', 'The booking call has no time budget for a broker call.')]};
  return p;
}
export function legacyWalk(apply = applyKnowledgeCommand, base = legacyWalkBase()) {
  let p = base; const k = (type, payload, actor = 'architect-a') => { const r = apply(p, {type: 'knowledge.' + type, payload}, AT, actor); p = r.document; return r.selected; };
  const requirement = p.artefacts.find(a => a.type === 'requirement').id, review = {reviewed: true, reviewer: 'Synthetic second person', reason: 'Checked the synthetic passage, its permitted use and its conditions.'};
  const projectSource = k('project-source', {sourceId: 'SRC-900'}); k('project-source', {sourceId: 'SRC-900'});
  const sourceId = k('source', sourcePayload('SYN-P001 Transactional outbox', SYN_P001));
  k('suggest', {sourceId}); const open = p.knowledge.suggestions.filter(s => s.status === 'open');
  k('dismiss-suggestion', {id: open[0].id});
  const fromSuggestion = k('claim', {sourceId, suggestionId: open[1].id, lineStart: open[1].lineStart, lineEnd: open[1].lineEnd, subjectId: 'Outbox', predicate: 'is read as', statement: 'A passage of the synthetic handbook, interpreted.', claimType: 'benefit', conditions: ['A synthetic condition.'], limitations: ['A synthetic limitation.']});
  const supports = k('claim', {sourceId, lineStart: 16, lineEnd: 16, subjectId: 'Outbox', predicate: 'applies to', statement: 'Use an outbox where a booking must lead to a notice.', claimType: 'applicability', polarity: 'supports', conditions: ['A local booking must cause a publication.'], limitations: ['Receivers need their own identity record.']});
  const opposing = k('claim', {sourceId, lineStart: 17, lineEnd: 17, subjectId: 'Outbox', predicate: 'applies to', statement: 'Avoid an outbox where nothing is published afterwards.', claimType: 'applicability', polarity: 'prohibits', conditions: ['The caller only reads.'], limitations: ['Says nothing of later changes.']});
  const fromProjectSource = k('claim', {sourceId: projectSource, lineStart: 1, lineEnd: 1, subjectId: 'Carrier notice', predicate: 'requires', statement: 'A carrier is told of each booking within the agreed window.', claimType: 'obligation', conditions: ['The agreement applies.'], limitations: ['The window is the agreement\'s.']});
  const captured = k('capture', {assessmentId: 'SA-901', subject: 'Carrier notice', subjectId: 'Carrier notice', statement: 'Within this project the carrier gateway retries a failed notice.', conditions: 'Applies to the carrier notice.', limitations: 'Says nothing of other gateways.', objectId: requirement, reviewer: 'Synthetic steward', reason: 'Captured from the architect\'s disagreement.'});
  k('steward', {...review, key: 'dismissal:SA-902', decision: 'holds'});
  k('contradiction', {...review, id: p.knowledge.contradictions[0].id, status: 'context-separated', distinguishingContexts: 'One applies where a notice must follow, the other where nothing is published.'});
  for (const id of [fromSuggestion, supports, opposing, fromProjectSource, captured]) k('review', {...review, id, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, 'architect-b');
  const releaseId = k('release', {...review, title: 'Synthetic legacy release', claimIds: [fromSuggestion, supports, opposing, fromProjectSource, captured]});
  k('activate', {...review, id: releaseId, stamp: knowledgeStamp(p)});
  const linkId = k('link', {...review, claimId: supports, releaseId, objectId: requirement}); k('link', {...review, claimId: captured, releaseId, objectId: requirement});
  k('unlink', {...review, id: linkId});
  k('deactivate', {...review, id: releaseId, stamp: knowledgeStamp(p)});
  k('activate', {...review, id: releaseId, stamp: knowledgeStamp(p)});
  k('withdraw', {...review, id: fromProjectSource, stamp: knowledgeImpactStamp(p, fromProjectSource)});
  return p;
}

// A project whose knowledge was written by the commands that existed before rc44 only (a source, a structured claim, a
// plain claim, a four-eyes review, a release, its activation and a link): the old document of the byte-identity cases.
// `apply(p, command, at, actor)` is the command function under test (the old entry or the rc44 wrapper).
export function legacyKnowledge(apply = applyKnowledgeCommand, base = blankProject('rc44-wp1-legacy')) {
  let p = base; const k = (type, payload, actor = 'architect-a') => { const r = apply(p, {type: 'knowledge.' + type, payload}, AT, actor); p = r.document; return r.selected; };
  const sourceId = k('source', {title: 'Synthetic queue mechanism', body: 'For a parcel notice, the queue type and its topology decide the failure behaviour.\nA replicated queue keeps accepted notices after one node is lost.', revision: 'fixture-1', path: 'synthetic/queue.txt', license: 'Synthetic test material'});
  const unit = {kind: 'pattern', mechanism: 'A replicated queue accepts writes while a majority of its nodes can communicate.', effects: [{quality: 'reliability', direction: 'supports', rationale: 'Replicas keep the queue after one node is lost.'}], obligations: [{action: 'Place nodes in distinct failure domains.', evidence: 'A node loss drill.'}], exclusions: ['The expected failure removes the majority of replicas.']};
  const structured = k('claim', {sourceId, lineStart: 2, lineEnd: 2, subjectId: 'PAT-REPLICATED-QUEUE', predicate: 'replicates', statement: 'A replicated queue keeps accepted notices after one node is lost.', claimType: 'applicability', polarity: 'supports', conditions: ['Three replicas and a reachable majority.'], limitations: ['No measured availability is established.'], architectureUnit: unit});
  const plain = k('claim', {sourceId, lineStart: 1, lineEnd: 1, subjectId: 'Queue topology', predicate: 'decides', statement: 'The queue type and its topology decide the failure behaviour.', claimType: 'definition'});
  for (const id of [structured, plain]) k('review', {...REVIEW, id}, 'architect-b');
  const releaseId = k('release', {...REVIEW, title: 'Synthetic queue release', claimIds: [structured, plain]});
  k('activate', {...REVIEW, id: releaseId, stamp: knowledgeStamp(p)});
  const requirement = p.artefacts.find(a => a.type === 'requirement')?.id;
  if (requirement) k('link', {...REVIEW, claimId: structured, releaseId, objectId: requirement});
  return {document: p, sourceId, structured, plain, releaseId};
}
