// The model-backed architecture draft uses the same bundle, preview and apply path as the rules draft.
// Each theme is bounded by the architecture contract. Completed themes may be checkpointed by the caller,
// so an interrupted job resumes without paying for the same provider calls again.
import {draftUnits, sealBundle} from './public/architecture-drafter.js';
import {THEME_LIMITS, architectureInstructionsPin, themePacket, crossPacket, recordedState, stateAfter, solDraftBundle, unitInfo} from './public/architecture-contract.js';
import {requestArchitectureDraft} from './architecture-request.js';

const shortError = e => String(e?.message || e).slice(0, 240);
// A spent drafting budget (BR-06) is final for the theme: a retry in the next slice would meet the same budget. A failed
// theme keeps what its calls were billed in its receipt.
const finality = e => ({...(e?.code === 'job_budget' ? {final: true} : {}), ...(e?.usage ? {usage: e.usage} : {})});
// A unit's snapshot keeps what the bundle reads of it: with modules (round 24), its module, role and concern, the
// sub-modules it holds and the part it is.
const snapshot = (unit, packet, run, status) => ({
  key: unit.key, id: unit.id, title: unit.title, kind: unit.kind, stored: unit.stored,
  ...(unit.moduleId ? {moduleId: unit.moduleId, moduleTitle: unit.moduleTitle, role: unit.role, concern: unit.concern || '', subIds: unit.subIds || [], part: unit.part || null} : {}),
  packetStamp: packet.stamp, status, proposals: (run?.result?.proposals || []).map(x => ({...x, ref: unit.key + ':' + x.ref})), keep: run?.result?.keep || [],
  withheld: run?.result?.withheld?.length || 0, withheldDetails: (run?.result?.withheld || []).slice(0, 12),
  provider: run?.provider || '', model: run?.model || '',
  runId: run?.providerResponseId || (run ? 'draft:' + packet.stamp.slice(0, 16) : ''), groundingReview: run?.groundingReview || null,
  providerReceipt: run?.providerReceipt || null, usage: run?.usage || null
});

// The plan of a model draft before it starts (round 23, BR-06): the themes the job will send (the disclosure policy's
// exclusions out, past the job's theme bound not sent), each packet's size, and the tokens a theme run is expected to use
// in each pass. The figures are calibrated on a live run of a 1,400-requirement register, where a theme run used about
// its packet plus 5,000 tokens in and 9,000 out for the draft, and its packet plus 3,000 in and 3,000 out for the check
// (instructions, schema and candidate included). They are an estimate and say so: the provider bills what it reads
// and writes. The cross-cutting pass is estimated whole, since its packet holds what the themes propose.
// Round 24 (D-24-04): with a module structure the units are the modules and their parts (draftUnits), each requirement
// sent once. A unit's packet grows as the units before it propose (the state holds every component, the platform services
// catalogue their sentences): the estimate allows RUN_ESTIMATE.state bytes for each unit before it, and the
// cross-cutting pass, which reads every component with its sentences, RUN_ESTIMATE.cross.perUnit tokens per unit. These
// two allowances are AIW's assumption, not yet measured on a live run.
export const RUN_ESTIMATE = Object.freeze({bytesPerToken: 4, draft: {input: 5000, output: 9000}, check: {input: 3000, output: 3000}, state: {bytesPerUnit: 1200}, cross: {draft: {input: 20000, output: 9000}, check: {input: 10000, output: 3000}, perUnit: {input: 900}}});
// A unit the job sends: one the disclosure policy leaves requirements in, its own or the sample of the requirements a
// platform module that only serves sends.
const eligible = (u, excluded) => !excluded.has(u.id) && [...u.members, ...(u.served || [])].some(a => !excluded.has(a.id));
export function architecturePlan(p, skeleton) {
  const excluded = new Set(p?.workspace?.aiPolicy?.excludedObjectIds || []), pin = architectureInstructionsPin(), state = recordedState(p);
  const allUnits = draftUnits(p), units = allUnits.filter(u => eligible(u, excluded)), modular = units.some(u => u.kind === 'module');
  const themes = units.slice(0, THEME_LIMITS.themes).map((unit, i) => {
    const bytes = new TextEncoder().encode(JSON.stringify(themePacket(p, skeleton, unit, {state, instructions: pin}))).length + i * RUN_ESTIMATE.state.bytesPerUnit;
    return {key: unit.key, title: unit.title, requirements: unit.members.filter(a => !excluded.has(a.id)).length, ...(unit.kind === 'module' ? {module: unit.moduleTitle, role: unit.role, ...(unit.part ? {part: unit.part} : {}), served: (unit.served || []).length} : {}), packetBytes: bytes, packetTokens: Math.ceil(bytes / RUN_ESTIMATE.bytesPerToken), reservation: 2 * bytes + 24000};
  });
  const sent = themes.length > 0, crossInput = which => (sent ? RUN_ESTIMATE.cross[which].input + themes.length * RUN_ESTIMATE.cross.perUnit.input : 0), pass = which => ({
    inputTokens: themes.reduce((n, t) => n + t.packetTokens + RUN_ESTIMATE[which].input, 0) + crossInput(which),
    outputTokens: themes.length * RUN_ESTIMATE[which].output + (sent ? RUN_ESTIMATE.cross[which].output : 0)
  });
  const draft = pass('draft'), check = pass('check'), runs = themes.length + (sent ? 1 : 0);
  const modules = modular ? {platform: themes.filter(t => t.role === 'platform').length, business: themes.filter(t => t.role === 'business').length, parts: themes.filter(t => t.part).length} : null;
  return {themes, units: modular ? 'modules' : 'themes', ...(modules ? {modules} : {}), excludedThemes: allUnits.length - units.length, notSent: Math.max(0, units.length - THEME_LIMITS.themes), runs, calls: 2 * runs, draft, check,
    tokens: draft.inputTokens + draft.outputTokens + check.inputTokens + check.outputTokens, largestReservation: Math.max(0, ...themes.map(t => t.reservation)), estimate: 'calibrated', retry: 'A theme that fails is sent once more; a second failure keeps its rules skeleton.'};
}

export async function runArchitectureJob(p, skeleton, {request = requestArchitectureDraft, completed = [], onTheme = async () => {}, cancelled = async () => false, maxNewUnits = Infinity} = {}) {
  const excluded = new Set(p?.workspace?.aiPolicy?.excludedObjectIds || []);
  const allUnits = draftUnits(p), units = allUnits.filter(u => eligible(u, excluded)), pin = architectureInstructionsPin(), themes = [];
  if (allUnits.length && !units.length) throw Error('The disclosure policy leaves no requirements eligible for Sol architecture drafting.');
  let state = recordedState(p), newUnits = 0;
  for (let i = 0; i < units.length; i++) {
    if (await cancelled()) return null;
    const unit = units[i], packet = themePacket(p, skeleton, unit, {state, instructions: pin});
    const prior = completed[i];
    // The packet stamp includes the accumulated state, so a stale checkpoint cannot be silently reused.
    // A transient provider error may be retried once by the next durable slice. A refused or withheld answer is
    // final, and a second failure leaves the rules skeleton; no scheduled retry loop can run unbounded.
    const matching = prior?.key === unit.key && prior.packetStamp === packet.stamp ? prior : null;
    let theme = matching?.status === 'failed' && !matching.final && (matching.attempts || 1) < 2 ? null : matching;
    if (!theme) {
      if (i >= THEME_LIMITS.themes) theme = snapshot(unit, packet, null, 'not-sent');
      else {
        if (newUnits >= maxNewUnits) return {pending: true, themes, next: i, total: units.length + 1};
        newUnits++;
        try {
          const run = await request(packet);
          theme = snapshot(unit, packet, run, run.result.proposals.length ? 'accepted' : 'withheld');
        } catch (e) { if (e?.code === 'budget') throw e; theme = {...snapshot(unit, packet, null, 'failed'), attempts: (matching?.attempts || 0) + 1, ...finality(e), error: shortError(e)}; }
      }
    }
    themes.push(theme);
    if (theme.status === 'accepted') state = stateAfter(state, theme.proposals, theme.key, unitInfo(theme));
    await onTheme(theme, i + 1, units.length, themes);
  }
  if (await cancelled()) return null;
  let cross = null;
  if (themes.some(t => t.status === 'accepted')) {
    const packet = crossPacket(p, themes, {state, instructions: pin});
    const prior = completed[units.length];
    const matching = prior?.packetStamp === packet.stamp ? prior : null;
    cross = matching?.status === 'failed' && !matching.final && (matching.attempts || 1) < 2 ? null : matching;
    if (!cross) {
      if (newUnits >= maxNewUnits) return {pending: true, themes, next: units.length, total: units.length + 1};
      try {
        const run = await request(packet);
        // The cross pass stands with its proposals or its merges (round 24: a pass that only merges is accepted).
        cross = {...snapshot({key: 'cross', title: 'Cross-cutting architecture', kind: 'cross', stored: false}, packet, run, run.result.proposals.length || run.result.merges?.length ? 'accepted' : 'withheld'), merges: run.result.merges || []};
      } catch (e) { if (e?.code === 'budget') throw e; cross = {...snapshot({key: 'cross', title: 'Cross-cutting architecture', kind: 'cross', stored: false}, packet, null, 'failed'), attempts: (matching?.attempts || 0) + 1, ...finality(e), error: shortError(e)}; }
    }
    await onTheme(cross, units.length + 1, units.length + 1, [...themes, cross]);
  }
  const bundle = solDraftBundle(p, skeleton, themes, cross);
  if (units.length > THEME_LIMITS.themes) bundle.notes.push(`${units.length - THEME_LIMITS.themes} themes exceeded the ${THEME_LIMITS.themes}-theme job limit; their rules skeletons stand.`);
  if (cross?.status === 'failed' || cross?.status === 'withheld') bundle.notes.push(`The cross-cutting model pass ${cross.status}; inspect the open decisions before applying.`);
  const {stamp: _stamp, counts: _counts, caps: _caps, ...content} = bundle;
  return {bundle: sealBundle(p, content), themes, cross};
}
