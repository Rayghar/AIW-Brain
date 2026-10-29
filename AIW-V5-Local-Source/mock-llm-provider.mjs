// A test double for the OpenAI Responses API and the Anthropic Messages API, for verification only. It
// answers the review desk's assessment contract with structurally valid, packet-grounded assessments and
// approves them in the source check, so the whole path — packet, provider call, guard, review, storage,
// adoption and the desk — can be exercised without a provider key, on either wire. It is never used by the
// application itself: the server reaches it only when a test sets AIW_LLM_BASE_URL (OpenAI) or
// AIW_ANTHROPIC_BASE_URL (Anthropic) to its loopback address.
import http from 'node:http';
import {providerOf} from './intelligence-provider.js';

export function mockAssessment(packet, {refineBy = 0.1, faults = {}} = {}) {
  const assessments = packet.items.map((it, i) => {
    const ref = it.ref, nums = it.knobs.filter(k => k.type === 'number'), words = it.knobs.filter(k => k.type !== 'number');
    const base = {id: it.id, headline: '', reasoning: '', refinements: [], proposals: [], verification: [], preferred: 'none', alternativeChecks:(it.allowed.preferred||[]).map(alternativeId=>({alternativeId,admissibility:'viable_as_stated',constraint:'The supplied fixture constraints in the own reading.',reason:'Synthetic test-double compatibility statement only; the architect must assess the real mechanism and evidence.',sourceRefs:[ref]})), risks: [], questions: [], sourceRefs: [ref]};
    if (it.kind === 'judgement' || it.kind === 'exposure') {
      const t = it.allowed.proposals?.targets || [];
      return {...base, verdict: 'judge', headline: `${it.title.split(' · ')[0]} needs your judgement before the desk can draft anything.`, reasoning: `The reading carries a security driver but records no threat to this part (${ref}). Examine what could go wrong where requests enter and data is kept, then record the threats you accept.`,
        proposals: t.length ? [{title: 'Unauthorised use of the risk decision', category: 'Unauthorised action', priority: 'High', targetIds: [t[0]], scenario: 'A caller without the required authority asks for a decision it should not see or change.', consequence: 'A payment could be screened with the wrong authority, or its decision disclosed.'}] : [],
        questions: ['Who may call this part, and with what authority?']};
    }
    if (it.kind === 'decision') return {...base, verdict: 'judge', preferred: it.allowed.preferred?.[1] || it.allowed.preferred?.[0] || 'none', headline: 'The drivers favour separating acceptance from settlement; the choice stays yours.', reasoning: `Weigh the alternatives against the drivers in ${ref}: a durable handoff keeps acknowledgement within its target while settlement continues, at the cost of an outcome the customer must be able to look up later.`, risks: ['An acknowledged instruction may still fail to settle.'], questions: ['How will the customer see a pending outcome?']};
    if (it.kind === 'switch') return {...base, verdict: 'apply', headline: 'Frame the choice now, while it is cheap to change.', reasoning: `The weighing in ${ref} leans away from the product in the design. A recorded question keeps the choice visible until Chapter 7 records a product.`, questions: ['Which option does the team already run in production?']};
    if (it.kind === 'stewardship') { const k = it.knobs.find(x => x.key === 'statement'); return {...base, verdict: 'refine', headline: 'Capture it: the architect names a project fact the reading does not record.', reasoning: `The disagreement in ${ref} rests on the project's own arrangements rather than on general guidance. Recorded as a condition on this record, it keeps the same advice from recurring; the limits keep it from spreading to other records.`, refinements: k ? [{key: 'statement', value: `Within this project: ${String(k.value || '').replace(/^[^:]*:\s*/, '')}`.slice(0, 1100), why: 'States the fact as the project’s own condition, not as a general rule.'}] : [], questions: ['Who owns the arrangement the architect describes?']}; }
    if (it.kind === 'stewardship-impact') return {...base, verdict: 'apply', headline: 'The change still holds on the design’s own readings.', reasoning: `The change in ${ref} follows from the instruments’ arithmetic, not from the withdrawn knowledge alone; keep it and record why.`};
    const learned = packet.sources.find(s => s.kind === 'governed-claim' && /learned by the project/.test(s.title));
    if (it.kind === 'record' && learned) return {...base, verdict: 'apply', headline: 'Sound as recorded: the project has already learned why the earlier advice does not apply here.', reasoning: `The reading in ${ref} is unchanged, and the stewards' claim in ${learned.ref} records the project's own arrangement for this record. Within its conditions it holds, so the earlier refinement is not repeated.`, sourceRefs: [ref, learned.ref]};
    if (it.kind === 'whatif') return {...base, verdict: 'judge', headline: 'The move is the business’s to weigh; the reading shows what it would reach.', reasoning: `As the reading in ${ref} shows, a stricter target reaches the parts and decisions that carry it; weigh that against what the business gains before opening the editor.`, questions: ['Who in the business has asked for the stricter target, and why?']};
    const lean = it.allowed.preferred?.length > 1 ? it.allowed.preferred[1] : 'none';
    // A refinement rests on the reading and, where the packet has them, a documented mechanism and a tactic.
    const cites = [ref, packet.sources.find(s => s.kind === 'product-mechanism')?.ref, packet.sources.find(s => s.kind === 'playbook-entry')?.ref].filter(Boolean);
    if (nums.length && i % 2 === 0) {
      const k = nums[0], step = Math.max(1, k.step || 1), was = Number(k.value) || 0, grown = Math.round((was * (1 + refineBy)) / step) * step, next = Math.min(k.max, Math.max(k.min, grown > was ? grown : was + step));
      return {...base, verdict: 'refine', headline: k.value === '' || k.value == null ? `Record ${next}${k.unit ? ' ' + k.unit : ''} where nothing is recorded yet.` : `Keep the draft, with ${next}${k.unit ? ' ' + k.unit : ''} rather than ${k.value}.`, reasoning: `The draft follows the arithmetic in ${ref}. Headroom beyond the computed figure covers a rolling release without losing capacity; the desk will re-read it with the new value.`,
        refinements: [{key: k.key, value: String(next), why: 'Headroom for a rolling release, above the computed figure.'}], risks: ['The per-replica rate is a planning assumption until a load test replaces it.'], questions: ['What rate did the last load test show for one replica?'], preferred: lean, sourceRefs: cites};
    }
    if (words.length) return {...base, verdict: 'refine', headline: 'Apply it, with the wording made specific to this part.', reasoning: `The draft is sound on the reading in ${ref}; its wording is sharpened so the team knows what to watch and who acts.`,
      refinements: [{key: words[0].key, value: `${String(words[0].value || '').slice(0, Math.max(0, (words[0].maxLength || 2400) - 60))} Review this with the owning team before release.`.trim(), why: 'Names the review the wording still needs.'}], preferred: lean};
    return {...base, verdict: 'apply', headline: 'Apply as drafted.', reasoning: `The draft follows from the reading in ${ref}; confirm its values with evidence after it is applied.`, preferred: lean};
  });
  // Deliberate faults, for proving that the guards and the evaluation (sol-evaluation.js) detect them.
  for (const a of assessments) {
    const fault = faults[a.id], it = packet.items.find(x => x.id === a.id);
    if (!fault || !it) continue;
    if (fault === 'wrong-verdict') a.verdict = it.allowed.verdicts.find(v => v !== a.verdict && v !== 'insufficient') || a.verdict;
    if (fault === 'invented-number') a.reasoning += ' It will need 987654 replicas to be safe.';
    if (fault === 'guarantee') a.reasoning += ' This guarantees a verified outcome at full capacity.';
    if (fault === 'no-own-citation') a.sourceRefs = packet.sources.filter(s => s.ref !== it.ref).slice(0, 1).map(s => s.ref);
    if (fault === 'out-of-bounds') { const k = it.knobs.find(x => x.type === 'number'); if (k) a.refinements = [{key: k.key, value: String(k.max + 1), why: 'Beyond the knob bound.'}]; }
    if (fault === 'reading-only') a.sourceRefs = [it.ref];
  }
  return {summary: `Sol assessed ${assessments.length} decision${assessments.length === 1 ? '' : 's'} on the desk.`, sourceRefs: [...new Set(assessments.flatMap(a => a.sourceRefs))], assessments};
}
// The second pass: concrete defects decide, anything else is a note. contradict lists ids for which it answers
// as a real model sometimes has — unsupported, with only notes that confirm support in its defects.
// An id ending in * stands for every id it begins ("M:5:*" is every Chapter 5 record).
const listed = (xs, id) => xs.some(x => x.endsWith('*') ? id.startsWith(x.slice(0, -1)) : x === id);
export const mockReview = (input, {reject = [], contradict = []} = {}) => ({assessments: input.candidate.assessments.map(a => ({id: a.id,
  supported: !listed(reject, a.id) && !listed(contradict, a.id),
  defects: listed(reject, a.id) ? ['It overstates what the reading shows.'] : listed(contradict, a.id) ? ['The refinement is a proposal, not a claim of a measurement, so it is supported.'] : [],
  notes: listed(reject, a.id) || listed(contradict, a.id) ? [] : ['Each statement follows from the cited reading.'],alternativeFindings:(a.alternativeChecks||[]).map(c=>({alternativeId:c.alternativeId,classificationMatchesSources:true,proseConsistent:true,defects:[],notes:['Synthetic checker fixture only.']})),requestFulfillment:{supported:true,defects:[],notes:['Synthetic checker fixture only.']}}))});

// The evaluation's control arm (sol-evaluation.js): the same questions without the Brain. A general answer
// that asserts a guaranteed outcome with a figure nobody recorded where a draft is numeric, and hedges
// ("does not guarantee") elsewhere, so the scorer and the Brain's checks can be seen to tell them apart.
export function mockDirect(input) {
  return {summary: `Assessed ${input.decisions.length} decision${input.decisions.length === 1 ? '' : 's'}.`, assessments: input.decisions.map(d => {
    const n = d.draft.find(k => typeof k.value === 'number'), verdict = d.verdicts.includes('apply') ? 'apply' : d.verdicts[0];
    return {id: d.id, verdict, headline: 'Sound as drafted, following common practice for this kind of system.',
      reasoning: n ? `${n.label} at ${n.value} ${n.unit || ''} is typical here. This configuration guarantees 99.99% availability.` : 'This follows common practice, but it does not guarantee any outcome on its own.',
      refinements: [], proposals: [], preferred: d.decision?.alternatives?.[0]?.id || 'none', risks: ['Real load may differ from what is assumed.'], questions: ['What load has the team measured?']};
  })};
}

// Sol's other path, for a selected saved object (intelligence-context.js): a proposal grounded in the
// selected record (S1) and the governed knowledge, in the mode asked for.
export function mockProposal(packet) {
  const know = packet.sources.find(s => s.kind === 'architecture-knowledge')?.ref, refs = [...new Set(['S1', know].filter(Boolean))];
  return {title: `Sol on ${String(packet.selectedTitle || 'the selected record').slice(0, 140)}`, summary: 'A reading of the saved record against the supplied sources. Nothing here changes the design.',
    passage: `The record as saved is described in S1${know ? `, and the governed knowledge in ${know} bears on it` : ''}. What it still needs is named in the questions; the architect decides.`,
    sourceRefs: refs, assumptions: ['The saved record is current.'], questions: ['Which evidence would confirm the record as it stands?'], options: [],
    ...(packet.request?.mode === 'challenge' ? {challenges: []} : {}), ...(packet.architectureDraft ? {architectureDraft: []} : {}), ...(packet.architectureOperations ? {architectureOperations: []} : {})};
}

// Sol's model review (round 5, Contract R): a finding on each of the first two records, each citing that record, and
// the check that supports every finding it is shown.
export function mockModelReview(packet) {
  const records = packet.sources.filter(s => s.kind === 'record').slice(0, 2);
  return {findings: records.map((s, i) => ({elementId: s.objectId, severity: i ? 'note' : 'confirm', title: `Confirm what ${s.title.slice(0, 80)} records`,
    reason: `The record in ${s.ref} is still to confirm in the chapter's checks; confirm its fields against what it connects to before relying on it.`, sourceRefs: [s.ref]}))};
}
export const mockModelReviewCheck = input => ({findings: input.candidate.findings.map(f => ({id: f.id, supported: true, defects: [], notes: ['The finding follows from the cited record.']}))});

// The field and journey contracts (round 6): a field draft that repeats the packet's own words and cites its first
// source; a journey draft that repeats the deterministic draft's current values. Both pass the guards, so
// the double can stand in for every mode the live probe exercises.
export const mockFieldDraft = input => {
  const first = (input.sources || [])[0], words = String(first?.excerpt || input.target?.current || input.target?.record || 'Drafted from the packet').split(/[.!?]/)[0].trim();
  return {field: input.target.field, value: words.slice(0, Math.min(200, input.target.maxLength || 200)), basis: 'From the packet’s first source.', sourceRefs: first ? [first.ref] : []};
};
export const mockJourneyDraft = input => { const cite = (input.passages || [])[0]?.id; return {answers: cite ? (input.records || []).flatMap(r => (r.fields || []).filter(f => !f.options && !f.numeric && typeof f.current === 'string' && f.current.trim()).map(f => ({record: r.key, field: f.key, value: f.current.trim().slice(0, 2000), passages: [cite], sourceRefs: []}))).slice(0, 400) : []}; };

// One grounded architecture theme for the synthetic live-check reference. The test double proposes a responsibility;
// it neither selects a decision nor supplies evidence that a running system meets the requirement. The cross-cutting
// pass (round 24: its own task) proposes and merges nothing.
export const mockArchitectureDraft = packet => {
  if (packet.task === 'architecture-cross') return {proposals: [], merges: [], keep: []};
  const requirement = packet.requirements?.[0];
  if (!requirement) return {proposals: [], keep: []};
  const title = String(packet.theme?.title || 'Appointment').replace(/[.!?]+$/, '').slice(0, 100) + ' handling';
  return {proposals: [{kind: 'responsibility', title, statement: 'Sol proposes a responsibility for ' + title.toLowerCase() + '.', requirementRefs: [requirement.ref], passages: [], basis: requirement.statement, interpretation: 'Sol proposes a boundary for the recorded requirement.'}], keep: []};
};
// The check supports every proposal it is shown, and every merge of a cross-cutting pass's candidate.
export const mockArchitectureCheck = input => ({proposals: (input.candidate?.proposals || []).map(p => ({id: p.id, supported: true, defects: [], notes: ['The cited requirement supports this proposal as a proposal.']})), ...(Array.isArray(input.candidate?.merges) ? {merges: input.candidate.merges.map(m => ({id: m.id, supported: true, defects: [], notes: ['The merged proposals are one concern.']}))} : {})});

// The Responses API envelope around a JSON answer.
export const envelope = (answer, model = 'mock-sol') => ({id: 'mock-' + Math.random().toString(16).slice(2), model, status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(answer)}]}], usage: {input_tokens: 1200, output_tokens: 400}});

// Answer a request body the way the provider would.
export function answer(body, opts = {}) {
  const name = body?.text?.format?.name, input = JSON.parse(body.input[0].content);
  if (name === 'aiw_desk_assessment') return envelope(mockAssessment(input, opts));
  if (name === 'aiw_desk_assessment_check') return envelope(mockReview(input, opts));
  if (name === 'aiw_direct_assessment') return envelope(mockDirect(input));
  if (name === 'aiw_source_check') return envelope({supported: true, defects: [], notes: []});
  if (name === 'aiw_grounded_proposal') return envelope(mockProposal(input));
  if (name === 'aiw_model_review') return envelope(mockModelReview(input));
  if (name === 'aiw_model_review_check') return envelope(mockModelReviewCheck(input));
  if (name === 'aiw_field_draft') return envelope(mockFieldDraft(input));
  if (name === 'aiw_field_draft_check' || name === 'aiw_journey_draft_check') return envelope({supported: true, defects: [], notes: ['The draft repeats the packet.']});
  if (name === 'aiw_journey_draft') return envelope(mockJourneyDraft(input));
  if (name === 'aiw_architecture_draft') return envelope(mockArchitectureDraft(input));
  if (name === 'aiw_architecture_draft_check') return envelope(mockArchitectureCheck(input));
  return {id: 'mock', model: 'mock-sol', status: 'incomplete', output: []};
}

// ---------------------------------------------------------------- the Anthropic Messages API (round 5, Contract P)
// The same answers on the second wire. A Messages request is read as the Responses request it stands for — the system
// blocks as the instructions, the user turn's JSON blocks merged back into the one packet, the structured-output
// schema's title as the format's name — answered by the same OpenAI-shaped fetcher, and its answer written back as a
// Message: a thinking block first (read by type, never by position), the JSON as text, the stop reason (a refusal for a
// refusal, max_tokens for an incomplete answer) and usage with cache writes on a first sight of a cached prefix and cache
// reads after. A streamed request is answered with the Messages event stream.
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) { if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) merge(a[k], v); else a[k] = v; } return a; };
export function asResponsesBody(body) {
  const blocks = typeof body.messages?.[0]?.content === 'string' ? [{type: 'text', text: body.messages[0].content}] : body.messages?.[0]?.content || [];
  let packet; try { packet = blocks.reduce((o, b) => merge(o, JSON.parse(b.text)), {}); } catch { packet = blocks.map(b => b.text).join(''); }
  const {title, ...schema} = body.output_config?.format?.schema || {};
  return {model: body.model, store: false, max_output_tokens: body.max_tokens, instructions: (body.system || []).map(b => b.text).join('\n'),
    input: [{role: 'user', content: typeof packet === 'string' ? packet : JSON.stringify(packet)}], text: {format: {type: 'json_schema', name: title, strict: true, schema}}};
}
// The cached prefix of a request: the system blocks and the user blocks up to the last one marked for caching.
function cachedPrefix(body) {
  const blocks = Array.isArray(body.messages?.[0]?.content) ? body.messages[0].content : [], last = blocks.map(b => !!b.cache_control).lastIndexOf(true);
  const system = (body.system || []).some(b => b.cache_control) ? body.system : [];
  const prefix = JSON.stringify([system.map(b => b.text), blocks.slice(0, last + 1).map(b => b.text)]);
  return system.length || last >= 0 ? prefix : null;
}
export function asMessage(envelopeOrAnswer, body, cache = new Set()) {
  const e = envelopeOrAnswer || {}, content = (e.output || []).filter(x => x.type === 'message').flatMap(x => x.content || []);
  const refused = content.some(x => x.type === 'refusal'), text = content.filter(x => x.type === 'output_text').map(x => x.text).join('');
  const prefix = cachedPrefix(body), tokens = prefix ? Math.ceil(prefix.length / 4) : 0, seen = prefix && cache.has(prefix); if (prefix) cache.add(prefix);
  return {id: 'msg_mock_' + Math.random().toString(16).slice(2), type: 'message', role: 'assistant', model: e.model || body.model,
    content: refused ? [] : [{type: 'thinking', thinking: '', signature: 'mock-signature'}, {type: 'text', text}],
    stop_reason: refused ? 'refusal' : e.status === 'completed' ? 'end_turn' : 'max_tokens', stop_sequence: null, ...(refused ? {stop_details: {type: 'refusal', category: null, explanation: null}} : {}),
    usage: {input_tokens: Number(e.usage?.input_tokens) || 0, output_tokens: Number(e.usage?.output_tokens) || 0, cache_creation_input_tokens: seen ? 0 : tokens, cache_read_input_tokens: seen ? tokens : 0}};
}
// A Message as the Messages event stream.
export function messageEvents(m) {
  const out = [], send = (type, data) => out.push(`event: ${type}\ndata: ${JSON.stringify({type, ...data})}\n\n`);
  send('message_start', {message: {...m, content: [], stop_reason: null, stop_details: null, usage: {...m.usage, output_tokens: 1}}});
  m.content.forEach((b, index) => {
    send('content_block_start', {index, content_block: b.type === 'text' ? {type: 'text', text: ''} : b.type === 'thinking' ? {type: 'thinking', thinking: '', signature: ''} : b});
    if (b.type === 'text') for (let i = 0; i < b.text.length; i += 240) send('content_block_delta', {index, delta: {type: 'text_delta', text: b.text.slice(i, i + 240)}});
    if (b.type === 'thinking') send('content_block_delta', {index, delta: {type: 'signature_delta', signature: b.signature}});
    send('content_block_stop', {index});
  });
  send('message_delta', {delta: {stop_reason: m.stop_reason, stop_sequence: null, ...(m.stop_details ? {stop_details: m.stop_details} : {})}, usage: m.usage});
  send('message_stop', {});
  return out.join('');
}
const asResponse = (m, body) => body.stream ? new Response(messageEvents(m), {status: 200, headers: {'Content-Type': 'text/event-stream'}}) : new Response(JSON.stringify(m), {status: 200, headers: {'Content-Type': 'application/json', 'request-id': 'req_mock'}});
// An OpenAI-shaped fetcher (url, init) => Response, speaking the Messages API instead. Its errors keep their status, in
// the Messages API's error shape, so the SDK raises its typed errors. bodies: each Messages request as it was sent.
export function viaAnthropic(fetcher, {cache = new Set(), bodies = []} = {}) {
  const wrapped = async (url, init = {}) => {
    const target = String(url);
    if (!/\/v1\/messages(?:\?|$)/.test(target)) return /\/v1\/models\//.test(target) ? new Response(JSON.stringify({type: 'model', id: decodeURIComponent(target.split('/v1/models/')[1].split('?')[0]), display_name: 'Mock', created_at: '2026-01-01T00:00:00Z'}), {status: 200, headers: {'Content-Type': 'application/json'}}) : new Response('{}', {status: 404, headers: {'Content-Type': 'application/json'}});
    const body = JSON.parse(init.body); bodies.push(body);
    const response = await fetcher(target.replace(/\/v1\/messages(?:\?.*)?$/, '/v1/responses').replace('https://api.anthropic.com', 'https://api.openai.com'), {...init, body: JSON.stringify(asResponsesBody(body))});
    if (!response.ok) return new Response(JSON.stringify({type: 'error', error: {type: response.status === 429 ? 'rate_limit_error' : response.status === 401 ? 'authentication_error' : 'api_error', message: 'mock provider error'}}), {status: response.status, headers: {'Content-Type': 'application/json', ...(response.headers.get('retry-after') ? {'retry-after': response.headers.get('retry-after')} : {})}});
    let e; try { e = await response.json(); } catch { return new Response('not json', {status: 200, headers: {'Content-Type': 'application/json'}}); }
    return asResponse(asMessage(e, body, cache), body);
  };
  wrapped.bodies = bodies;
  return wrapped;
}

// The suites' provider (round 5): AIW_LLM_PROVIDER=anthropic runs a suite against the Anthropic wire; anything else is
// OpenAI, as before. providerEnv gives a suite's env the provider's key and endpoint (the same test key, the same mock
// address); viaProvider gives a fetcher the provider's wire.
export const suiteProvider = () => String(process.env.AIW_LLM_PROVIDER || '').trim().toLowerCase() === 'anthropic' ? 'anthropic' : 'openai';
export function providerEnv(env, provider = suiteProvider()) {
  if (provider !== 'anthropic') return {...env, AIW_LLM_PROVIDER: 'openai'};
  const {OPENAI_API_KEY, AIW_LLM_BASE_URL, ...rest} = env;
  return {...rest, AIW_LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: OPENAI_API_KEY ?? env.ANTHROPIC_API_KEY, ...(AIW_LLM_BASE_URL ? {AIW_ANTHROPIC_BASE_URL: AIW_LLM_BASE_URL} : {})};
}
export const viaProvider = (fetcher, provider = suiteProvider(), options) => provider === 'anthropic' ? viaAnthropic(fetcher, options) : fetcher;
// The wire of the provider a given env chooses (intelligence-provider.js providerOf), for a fetcher handed to it.
export const wireFor = (env, fetcher, options) => providerOf(env) === 'anthropic' ? viaAnthropic(fetcher, options) : fetcher;

// A loopback HTTP server speaking both wires at one base address: POST /v1/responses (OpenAI), POST /v1/messages
// (Anthropic, streamed when asked) and GET /v1/models/{id} (either provider's connection probe).
export async function startMockLLM(opts = {}) {
  // calls: the contract name of each request; bodies: each request as sent, to check what reached the provider.
  const calls = [], bodies = [], cache = new Set();
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', async () => {
      try {
        if (req.method === 'GET' && /^\/v1\/models\//.test(req.url)) { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({id: decodeURIComponent(req.url.split('/v1/models/')[1]), object: 'model', type: 'model'})); return; }
        const body = JSON.parse(data || '{}');
        if (/^\/v1\/messages/.test(req.url)) {
          const as = asResponsesBody(body); calls.push(as.text.format.name); bodies.push(body);
          const m = asMessage(answer(as, opts), body, cache);
          res.writeHead(200, {'Content-Type': body.stream ? 'text/event-stream' : 'application/json'}); res.end(body.stream ? messageEvents(m) : JSON.stringify(m)); return;
        }
        calls.push(body.text?.format?.name); bodies.push(body); res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(answer(body, opts)));
      } catch (e) { res.writeHead(500); res.end('{}'); }
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return {url: `http://127.0.0.1:${server.address().port}/v1`, calls, bodies, close: () => new Promise(r => server.close(r))};
}
