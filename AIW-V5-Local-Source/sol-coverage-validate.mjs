// Sol on every chapter. For every record a chapter model holds, every selection its pages offer, every item on
// the review desk and every saved object in Chapters 1 to 11, Sol's two paths build what Sol reads, the provider
// test double answers, the answer passes the contract, and the page renders it. A selection that is only
// drawn from the records (a module, a link) says so instead of leaving Sol on an earlier selection.
// Run: npm run test:sol-coverage
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reasoningPacket, checkRecordRefinements, MAX_DECISIONS} from './public/brain-reasoning.js';
import {RECORD_TYPES, solTarget, solOwner, chapterRound, findRecord} from './public/chapter-reasoning.js';
import {assessmentHTML} from './public/brain-reasoning-ui.js';
import {requestReasoning, requestIntelligence} from './intelligence-provider.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {journeyIndex} from './public/journey-context.js';
import {deskModel} from './public/desk-model.js';
import {fixDrafts} from './public/desk-fixes.js';
import {answer} from './mock-llm-provider.mjs';
import {domainProject} from './sol-evaluation.js';
import {resultHTML} from './public/intelligence-ui.js';

const started = Date.now(), checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS', name); }
const env = {OPENAI_API_KEY: 'test-double', AIW_LLM_MODEL: 'mock-sol'};
const fetcher = async (url, init) => new Response(JSON.stringify(answer(JSON.parse(init.body))), {status: 200, headers: {'Content-Type': 'application/json'}});
const list = v => Array.isArray(v) ? v : [];
const ds = JSON.parse(readFileSync('evaluation/sol-heldout-v1.json', 'utf8'));
const projects = Object.fromEntries(Object.entries(ds.domains).map(([k, d]) => [k, domainProject(d)]));
const table = {}, row = ch => (table[ch] ||= {assessed: 0, rendered: 0, kinds: new Set(), explained: 0, drawn: 0, withheld: 0});

// Every assessment Sol returns is displayed the way the chapter pages and the desk display it.
function shown(run, packet, id) {
  const a = run.result.assessments.find(x => x.id === id), item = packet.items.find(i => i.id === id);
  assert(a, `Sol returned no assessment for ${id}`);
  const html = assessmentHTML({run: {...run, id: 'coverage', createdAt: '2026-09-27T00:00:00Z', packet}, a, item, current: true}, {id, knobs: item?.knobs || []});
  assert.match(html, /Sol’s assessment/, id); assert.match(html, /dk-solv (?:apply|refine|reconsider|judge|insufficient|withheld)/, id);
  return {a, item};
}
// Asks in groups as the pages do (at most eight at a time); a group too large for one request is asked one by one.
async function assess(p, chapter, ids, values = null) {
  const out = [];
  for (let i = 0; i < ids.length; i += 4) {
    const group = ids.slice(i, i + 4);
    let packets;
    try { packets = [reasoningPacket(p, {task: 'decisions', ids: group, scope: 'coverage', prompt: '', ...(values ? {values} : {})})]; }
    catch (e) { if (!/do not fit/.test(e.message)) throw e; packets = group.map(id => reasoningPacket(p, {task: 'decisions', ids: [id], scope: 'coverage', prompt: '', ...(values ? {values} : {})})); }
    for (const packet of packets) {
      const run = await requestReasoning(env, packet, {fetcher, check: r => checkRecordRefinements(p, packet, r)});
      for (const it of packet.items) { const {a} = shown(run, packet, it.id); const r = row(chapter); r.assessed++; r.rendered++; r.kinds.add(it.kind); if (a.withheld) r.withheld++; out.push(it.id); }
    }
  }
  return out;
}
// The selections a chapter model offers, as its views name them, with what Sol can be asked about each.
function selections(p, chapter) {
  const own = type => list(RECORD_TYPES[type].coll(p)).map(r => r.id);
  const S = [];
  if (chapter === 2) S.push(...own('driver'));
  if (chapter === 3) for (const d of list(p.decisions?.records)) S.push(d.id, ...list(d.alternatives).map(a => a.id));
  if (chapter === 4) S.push(...own('responsibility'));
  if (chapter === 5) S.push(...own('component'));
  if (chapter === 6) S.push(...own('capability'));
  if (chapter === 7) for (const r of list(p.technologyRealisation?.records)) S.push(r.id, ...list(r.options).map(o => `${r.id}/${o.id}`));
  if (chapter === 8) S.push(...own('contract'), ...own('data'), ...own('contract').map(id => 'C:' + id));
  if (chapter === 9) S.push(...own('threat'), ...own('control'), ...own('component'), ...own('contract'), ...own('data'), ...own('realisation'), ...own('contract').map(id => 'C:' + id));
  if (chapter === 10) S.push(...own('plan'));
  return [...new Set(S)];
}

await check('every record a chapter model holds, and every selection it offers, reaches Sol and its answer is displayed (Chapters 2 to 10)', async () => {
  for (const [name, p] of Object.entries(projects)) for (let chapter = 2; chapter <= 10; chapter++) {
    const sels = selections(p, chapter), targets = new Map();
    for (const sel of sels) {
      const id = solTarget(p, chapter, sel);
      assert(id, `${name} · Chapter ${chapter}: ${sel} has no Sol target`);
      targets.set(id, sel);
    }
    const asked = await assess(p, chapter, [...targets.keys()]);
    assert.equal(asked.length, targets.size, `${name} · Chapter ${chapter}`);
    // With nothing selected, the chapter's round asks about the records with the most open checks.
    const round = chapterRound(p, chapter);
    if (round.length) await assess(p, chapter, round.slice(0, MAX_DECISIONS));
  }
});

await check('a move explored in Chapter 2’s What if reaches Sol with its values, for every driver', async () => {
  for (const p of Object.values(projects)) for (const d of list(p.quality?.drivers)) {
    const id = solTarget(p, 2, d.id, {whatIf: true}); assert.equal(id, `M:2:${d.id}|whatif`);
    const move = {targetValue: String(Number(d.targetValue) > 0 ? Number(d.targetValue) * 0.8 : 2), priority: 'High'};
    await assess(p, 2, [id], {[id]: move});
  }
});

await check('every fix, judgement and decision on the review desk reaches Sol and is displayed (Chapter 11)', async () => {
  for (const [name, p] of Object.entries(projects)) {
    const F = fixDrafts(deskModel(p)), ids = [...F.drafts.map(d => 'F:' + d.id), ...F.judgements.map(j => 'J:' + j.id), ...list(p.decisions?.records).map(d => 'D:' + d.id)];
    assert(ids.length, name + ': the desk holds something to ask about');
    const asked = await assess(p, 11, ids);
    assert.equal(asked.length, ids.length, name);
  }
});

await check('a selection only drawn from the records says so, and a drawn selection with a record keeps Sol on that record', async () => {
  for (const p of Object.values(projects)) {
    for (const sel of ['MOD:any', 'L:a>b', 'REG:any', 'PLATFORM']) { assert.equal(solTarget(p, 5, sel), null); assert.equal(solOwner(p, sel), null); row(0).drawn++; }
    for (const r of list(p.technologyRealisation?.records)) for (const o of list(r.options)) { assert.equal(solOwner(p, `${r.id}/${o.id}`), r.id); assert.equal(solTarget(p, 7, `${r.id}/${o.id}`), 'M:7:' + r.id); }
    for (const c of list(p.interfaces?.contracts)) { assert.equal(solOwner(p, 'C:' + c.id), c.id); assert.equal(solTarget(p, 9, 'C:' + c.id), 'M:9:' + c.id); assert.equal(solTarget(p, 8, 'C:' + c.id), 'M:8:' + c.id); }
    for (const g of list(p.logical?.groups)) assert.equal(solOwner(p, 'G:' + g.id), g.id);
  }
});

await check('every saved object in Chapters 1 to 11 reaches Sol’s panel in each mode, and its answer is displayed', async () => {
  for (const [name, p] of Object.entries(projects)) {
    const nodes = [...journeyIndex(p).nodes.values()].filter(n => n.chapter >= 1 && n.chapter <= 11 && n.id !== 'project');
    const seenMode = new Set();
    for (const n of nodes) {
      // Every object in design mode; the other modes once per chapter.
      const modes = ['design', ...['mind', 'author', 'challenge'].filter(m => !seenMode.has(n.chapter + m))];
      for (const mode of modes) {
        seenMode.add(n.chapter + mode);
        const packet = intelligencePacket(p, {chapter: n.chapter, objectId: n.id, mode, prompt: 'Explain this record and what the architect should decide next.'});
        const run = await requestIntelligence(env, packet, {fetcher});
        const html = resultHTML({run: {...run, id: 'coverage-' + n.id, status: 'completed', createdAt: '2026-09-27T00:00:00Z', packet}}, p);
        assert.match(html, /intel-result/, `${name} · ${n.id} · ${mode}`);
        const r = row(n.chapter); r.explained++;
      }
    }
    // Chapter 11's review pages ask Sol's panel about whatever is selected there, from any chapter.
    for (const n of [...new Map(nodes.map(n => [n.chapter, n])).values()]) {
      const packet = intelligencePacket(p, {chapter: 11, objectId: n.id, mode: 'design', prompt: 'What should the review settle about this record?'});
      const run = await requestIntelligence(env, packet, {fetcher});
      assert.match(resultHTML({run: {...run, id: 'coverage-review-' + n.id, status: 'completed', createdAt: '2026-09-27T00:00:00Z', packet}}, p), /intel-result/, `${name} · Chapter 11 · ${n.id}`);
      row(11).explained++;
    }
    assert(nodes.some(n => n.chapter === 1), name + ': Chapter 1 has saved objects');
  }
});

const summary = Object.fromEntries(Object.entries(table).sort(([a], [b]) => Number(a) - Number(b)).map(([ch, r]) => [ch === '0' ? 'drawn selections' : 'Chapter ' + ch, {assessedAndDisplayed: r.assessed, kinds: [...r.kinds].sort(), withheldByChecks: r.withheld, explainedAndDisplayed: r.explained, ...(r.drawn ? {drawnOnly: r.drawn} : {})}]));
console.log(JSON.stringify({status: 'passed', checks: checks.length, seconds: Math.round((Date.now() - started) / 1000), coverage: summary, authority: 'Provider test double: proves every chapter’s path from selection to displayed answer, not the quality of the answers.', checksRun: checks}, null, 2));
