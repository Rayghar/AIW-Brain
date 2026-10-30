// Sol drafts one theme of the architecture (round 12, workstream BRAIN; mode 'architecture'). The same path as Sol's
// other modes, on the one seam (intelligence-provider.js modelCall): a draft call under the contract's strict schema
// (public/architecture-contract.js), its structure checked (validateArchitectureDraft: a proposal that does not fit is
// withheld, the rest stand), a deterministic guard (guardArchitectureDraft: citations inside the packet, numbers the
// packet holds, no approval or guarantee, a decision's alternatives and its preferred one, titles that name things), a
// second call that checks each proposal's basis against the packet and reads its interpretation as Sol's proposal
// (ARCHITECTURE_REVIEW_INSTRUCTIONS; settleArchitectureReview: a defect withholds the proposal it names), and the run
// recorded with its prompt pin, provider, model, usage, packet stamp and grounding review. A theme whose every proposal
// the review withheld is drafted once more (a fresh draft call and its check), both attempts in the receipt; what still
// stands withheld leaves the rules' skeleton for that theme. Nothing here applies anything: the proposals go back to the
// job (drafting-service.js), which keeps them in a draft a person previews and applies as Sol's proposals.
// Round 24 (D-24-04): the instructions follow the packet's task: a unit's draft reads ARCHITECTURE_INSTRUCTIONS, the
// cross-cutting pass its own (ARCHITECTURE_CROSS_INSTRUCTIONS: merge what is one concern, decide the concerns every part
// shares), and its check assesses the merges as well as the proposals (ARCHITECTURE_CROSS_REVIEW_SCHEMA): a merge the
// check does not support is not applied.
//
// Round 41 (FIX NOW 6): the seam's own timer, parser and refusal reader (intelligence-provider.js timed, parsed,
// declinable) replace the shims this file kept. The shim's timer could not re-arm, so after a timeout a fallback route
// was sent with a signal already aborted, and after a 5xx it had only the primary's leftover time; the seam's timer gives
// each route a time of its own. The calls go through runCalls, so a failed request carries what its calls were billed.
import {intelligenceStatus, modelCall, callTimeout, providerReceipt, sumUsage, timed, parsed, declinable, runCalls} from './intelligence-provider.js';
import {ARCHITECTURE_INSTRUCTIONS, ARCHITECTURE_CROSS_INSTRUCTIONS, ARCHITECTURE_REVIEW_INSTRUCTIONS, ARCHITECTURE_REVIEW_SCHEMA, ARCHITECTURE_CROSS_REVIEW_SCHEMA, architectureInstructionsPin, architectureDraftSchema, crossDraftSchema, validateArchitectureDraft, guardArchitectureDraft, settleArchitectureReview, reviewShapeOf, reviewCandidate} from './public/architecture-contract.js';

const AUTHORITY = 'Automated checks against the packet, not independent verification. A withheld proposal offers nothing and the rules’ skeleton stands for it; an accepted one is a proposal a person previews, applies and then keeps, completes or retires.';
const EMPTY = {proposals: [], withheld: [], keep: [], merges: [], notes: []}, list = v => (Array.isArray(v) ? v : []);

export async function requestArchitectureDraft(env, packet, {fetcher = fetch, timeoutMs = 120000, retry = true} = {}) {
  const status = intelligenceStatus(env, 'architecture');
  if (!status.configured) throw Object.assign(Error('LLM connection is not configured. The rules’ draft of the architecture remains available.'), {code: 'not_configured'});
  const cross = packet.task === 'architecture-cross', perCall = callTimeout(env, timeoutMs), pin = architectureInstructionsPin(), schema = cross ? crossDraftSchema(packet) : architectureDraftSchema(packet);
  const instructions = cross ? ARCHITECTURE_CROSS_INSTRUCTIONS : ARCHITECTURE_INSTRUCTIONS, reviewSchema = cross ? ARCHITECTURE_CROSS_REVIEW_SCHEMA : ARCHITECTURE_REVIEW_SCHEMA;
  const calls = [], attempts = [], run = runCalls(env);
  // One attempt: the draft call, the structure and the guard, then the check call; what it leaves accepted and withheld.
  const attempt = async n => {
    const draft = await run.call(declinable(timed(perCall, call => modelCall(env, status, {instructions, input: packet, schema, name: 'aiw_architecture_draft', mode: 'architecture'}, call, fetcher).then(parsed), 'proposal')));
    calls.push(['draft', draft]);
    if (draft.declined) return {n, result: {...EMPTY, issues: [draft.declined]}, draft, review: null, accepted: 0, withheld: 0, issues: [draft.declined]};
    let checked;
    try { checked = guardArchitectureDraft(packet, validateArchitectureDraft(draft.raw, packet)); } catch (e) { return {n, result: {...EMPTY, issues: [e.message]}, draft, review: null, accepted: 0, withheld: 0, issues: [e.message]}; }
    if (!checked.proposals.length && !checked.merges.length) return {n, result: {...checked, notes: list(checked.notes)}, draft, review: null, accepted: 0, withheld: checked.withheld.length, guarded: checked.withheld.map(w => w.id), issues: checked.withheld.flatMap(w => w.issues)};
    const candidate = reviewCandidate(checked);
    const review = await run.call(declinable(timed(perCall, call => modelCall(env, status, {instructions: ARCHITECTURE_REVIEW_INSTRUCTIONS, input: {packet, candidate}, schema: reviewSchema, name: 'aiw_architecture_draft_check', mode: 'architecture'}, call, fetcher).then(parsed), 'proposal')));
    calls.push(['check', review]);
    // A check the provider declined, or one that does not fit, withholds every proposal: unchecked advice is not shown.
    const read = review.declined ? {proposals: checked.proposals.map(x => ({id: x.id, supported: false, defects: [review.declined.replace('nothing was drafted', 'the proposals were not checked and are withheld')], notes: []}))} : reviewShapeOf(review.raw) ? review.raw : null;
    if (!read) throw Object.assign(Error('The source check returned an unsupported assessment.'), {code: 'invalid_output'});
    const settled = settleArchitectureReview(checked, read);
    // What stands is what the check supports: the proposals, and for the cross-cutting pass its merges.
    return {n, result: settled, draft, review, accepted: settled.proposals.length + settled.merges.length, withheld: settled.withheld.length, guarded: checked.withheld.map(w => w.id), issues: settled.withheld.flatMap(w => w.issues)};
  };
  try {
    let best = await attempt(1);
    attempts.push(best);
    // Every proposal withheld by the check (not by the structure or the guard alone): one more draft, then it stands.
    if (retry && !best.accepted && best.review && best.result.proposals.length === 0 && !best.draft.declined) { const again = await attempt(2); attempts.push(again); if (again.accepted || !best.withheld) best = again; }
    const usage = sumUsage(env, ...calls.map(([, c]) => c.usage)), last = attempts.at(-1);
    // Which layer withheld each proposal (the probe's evidence): the structure and the guard, else the check.
    const guarded = new Set(list(best.guarded)), byGuard = best.result.withheld.filter(w => guarded.has(w.id)), byCheck = best.result.withheld.filter(w => !guarded.has(w.id));
    const result = {proposals: best.result.proposals, withheld: best.result.withheld, keep: best.result.keep || [], merges: best.result.merges || [], notes: best.result.notes || [], issues: best.result.issues || [], attempts: attempts.length, withheldAll: !best.accepted};
    return {result, provider: status.provider, model: best.draft.model, instructions: pin, usage, attempts: calls.reduce((n, [, c]) => n + (c.attempts || 1), 0), providerResponseId: best.draft.providerResponseId, providerReceipt: providerReceipt(status, 'architecture', pin, calls),
      groundingReview: {kind: 'automated-source-consistency', accepted: best.accepted > 0, withheld: result.withheld.map(w => w.id), issues: result.withheld.flatMap(w => w.issues).slice(0, 40), notes: result.notes, draft: best.result.proposals.length ? {proposals: best.result.proposals.length, keep: result.keep.length} : null, draftModel: best.draft.model, reviewModel: best.review?.model || null, reviewResponseId: best.review?.providerResponseId || null, deterministic: {withheld: byGuard.map(w => w.id), issues: [...(best.draft.declined ? [] : list(best.result.issues)), ...byGuard.flatMap(w => w.issues)].slice(0, 40)}, check: best.review ? {withheld: byCheck.map(w => w.id), defects: byCheck.flatMap(w => w.issues).slice(0, 40), notes: result.notes} : null, packetStamp: packet.stamp, attempts: attempts.map(a => ({attempt: a.n, draftResponseId: a.draft.providerResponseId || null, reviewResponseId: a.review?.providerResponseId || null, accepted: a.accepted, withheld: a.withheld, declined: !!a.draft.declined})), retried: attempts.length > 1, lastAttempt: last.n, authority: AUTHORITY}};
  } catch (e) {
    // A failed request still carries what its calls were billed (round 23): the completed calls and the failing one's,
    // and whether that is the run's whole use (runCalls; the service settles the reservation from it).
    throw run.failed(e);
  }
}
