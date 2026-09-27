// A test double for the OpenAI Responses API, for verification only. It answers the review desk's
// assessment contract with structurally valid, packet-grounded assessments and approves them in the
// source check, so the whole path — packet, provider call, guard, review, storage, adoption and the
// desk — can be exercised without a provider key. It is never used by the application itself: the
// server reaches it only when a test sets AIW_LLM_BASE_URL to its loopback address.
import http from 'node:http';

export function mockAssessment(packet, {refineBy = 0.1, faults = {}} = {}) {
  const assessments = packet.items.map((it, i) => {
    const ref = it.ref, nums = it.knobs.filter(k => k.type === 'number'), words = it.knobs.filter(k => k.type !== 'number');
    const base = {id: it.id, headline: '', reasoning: '', refinements: [], proposals: [], preferred: 'none', risks: [], questions: [], sourceRefs: [ref]};
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
export const mockReview = (input, {reject = [], contradict = []} = {}) => ({assessments: input.candidate.assessments.map(a => ({id: a.id,
  supported: !reject.includes(a.id) && !contradict.includes(a.id),
  defects: reject.includes(a.id) ? ['It overstates what the reading shows.'] : contradict.includes(a.id) ? ['The refinement is a proposal, not a claim of a measurement, so it is supported.'] : [],
  notes: reject.includes(a.id) || contradict.includes(a.id) ? [] : ['Each statement follows from the cited reading.']}))});

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

// The Responses API envelope around a JSON answer.
export const envelope = (answer, model = 'mock-sol') => ({id: 'mock-' + Math.random().toString(16).slice(2), model, status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(answer)}]}], usage: {input_tokens: 1200, output_tokens: 400}});

// Answer a request body the way the provider would.
export function answer(body, opts = {}) {
  const name = body?.text?.format?.name, input = JSON.parse(body.input[0].content);
  if (name === 'aiw_desk_assessment') return envelope(mockAssessment(input, opts));
  if (name === 'aiw_desk_assessment_check') return envelope(mockReview(input, opts));
  if (name === 'aiw_direct_assessment') return envelope(mockDirect(input));
  if (name === 'aiw_source_check') return envelope({supported: true, defects: [], notes: []});
  return {id: 'mock', model: 'mock-sol', status: 'incomplete', output: []};
}

// A loopback HTTP server speaking the Responses API, for rendered tests.
export async function startMockLLM(opts = {}) {
  // calls: the format name of each request; bodies: each request as sent, to check what reached the provider.
  const calls = [], bodies = [];
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => {
      try { const body = JSON.parse(data || '{}'); calls.push(body.text?.format?.name); bodies.push(body); res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(answer(body, opts))); }
      catch (e) { res.writeHead(500); res.end('{}'); }
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return {url: `http://127.0.0.1:${server.address().port}/v1`, calls, bodies, close: () => new Promise(r => server.close(r))};
}
