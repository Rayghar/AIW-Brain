// The narrative trace (round 6, R6-G; audit/round6/DESIGN.md): traceNarrative, traceStoryHTML and narrativeSection
// (public/trace-narrative.js, re-exported by shared/) on the bank reference and the three drafted reference projects.
// Asserts, for every journey step of each: a narrative with a title, an opening, one paragraph per step of the trace
// after the start, and a closing; every record a paragraph cites named in its text by title or reference, and nothing
// in the text that is not the records' own words — once the cited records' titles, references and field values are
// removed, only the narrative's framing words remain; each paragraph is one to three sentences; the gap paragraphs are
// exactly the trace's gaps, each named "No <word> is recorded for this step yet."; the bounds (12 paragraphs, 600
// words) hold, also with records whose
// values run to hundreds of words; the same document tells the same story; the HTML links every cited record with
// data-cm-open and escapes hostile titles; the SDD section has one sub-heading per journey step (the first 20) in the
// full edition and one in the executive edition, and nothing for a project without a journey. No provider key is read.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {REFERENCE_PROJECTS} from './public/reference-projects.js';
import {traceFrom, TRACE_ORDER} from './public/model-matrix.js';
import {architectureModel} from './public/architecture-model.js';
import {CHECK_WORDS} from './public/readiness-model.js';
import {traceNarrative, traceStoryHTML, narrativeSection, narrativeTitle, journeySteps, clipValue, NARRATIVE_LIMITS} from './shared/trace-narrative.js';

const checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const at = '2026-10-01T09:00:00.000Z';
const words = t => (String(t).match(/\S+/g) || []).length;
const total = N => words(N.title) + words(N.opening) + N.paragraphs.reduce((k, x) => k + words(x.text), 0) + words(N.closing);
const projects = [['bank-payment', createProject({name: 'Bank Payment Journey', template: 'bank-payment'}, 'bank', at)], ...REFERENCE_PROJECTS.map(r => [r.id, createProject({name: r.title, template: r.id}, 'ref-' + r.id, at)])];

// The words the narrative adds around the records' own: verbs, articles and the names of the layers. Anything else in a
// paragraph must come from a record it cites.
const FRAMING = new Set(('it needs traces to the requirement requirements quality driver drivers on is are decision decisions behind responsibility responsibilities realizes realize calls realized by contract contracts data definition definitions protects protect placement placements running part parts and more acceptance of sets chose no alternative chosen yet purpose owner status selects lists option options none selected over from timeout ms retry policy open question recorded key field classification mechanism enforcement failure response mode in replica replicas runs has min ready max state takes take realization or what happens when the design records for step steps journey actors actor others'.split(' ')));
// Every string a record carries, at full length and as the narrative clips it.
function valuesOf(r, out = new Set(), depth = 0) {
  if (r == null || depth > 3) return out;
  if (typeof r === 'string') { const t = r.replace(/\s+/g, ' ').trim(); if (t) { out.add(t); out.add(clipValue(t)); out.add(clipValue(t, 90)); } return out; }
  if (typeof r === 'number') { out.add(String(r)); return out; }
  if (Array.isArray(r)) { for (const x of r) valuesOf(x, out, depth + 1); return out; }
  if (typeof r === 'object') for (const [k, v] of Object.entries(r)) if (!['history', 'sourceSnapshot', 'provenance', 'review'].includes(k)) valuesOf(v, out, depth + 1);
  return out;
}
// The words the cited records carry: titles, references, every field value (whole and as clipped) and the titles of
// the records a field points to (a contract's parties, a running part's environment), longest first.
function pool(M, ids) {
  const out = new Set();
  for (const id of ids) {
    const o = M.objects.get(id); if (!o) continue;
    out.add(o.title); out.add(String(o.ref || o.id)); valuesOf(o.record, out); valuesOf(o.attributes?.zone, out);
    for (const f of ['from', 'to', 'environmentId', 'zoneId', 'planId', 'authorityId']) { const x = M.objects.get(o.record?.[f]); if (x) { out.add(x.title); out.add(String(x.ref || x.id)); } }
  }
  return [...out].filter(Boolean).map(String).sort((a, b) => b.length - a.length);
}
// What remains of a text once the cited records' words are taken out, as lower-case tokens.
function leftovers(text, M, ids) {
  // Case apart (the narrative lowers a field value such as "At most" inside a sentence), the words must match exactly.
  let t = (' ' + text + ' ').toLowerCase();
  for (const v of pool(M, ids)) t = t.split(v.toLowerCase()).join(' ');
  return t.replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(w => w && !/^\d+(\.\d+)?$/.test(w));
}

// How many sentences a text holds once the cited records' own words (titles with their question marks, values with
// their full stops) are masked: what the narrative itself says, counted by its own sentence ends.
function sentencesOf(text, M, ids) {
  let t = text;
  for (const v of pool(M, ids)) t = t.split(v).join('X');
  return (t.match(/[.?!](?=\s|$)/g) || []).length;
}

// ---------------------------------------------------------------- 1. every journey step of every reference project
const measured = {};
for (const [id, p] of projects) {
  const M = architectureModel(p), steps = journeySteps(p), actors = p.artefacts.filter(a => a.type === 'actor').map(a => a.id);
  assert.ok(steps.length >= 4, id + ' holds journey steps');
  const stats = {narratives: 0, paragraphs: [], words: [], gaps: 0, gapWords: new Set()};
  for (const s of steps) {
    const T = traceFrom(p, s.id), N = traceNarrative(p, T);
    assert.ok(T && N, id + ' ' + s.id + ' yields a narrative');
    assert.equal(N.title, narrativeTitle(M.objects.get(s.id)));
    assert.ok(/^What happens when/.test(N.title) && N.title.toLowerCase().includes(s.title.toLowerCase()), id + ' ' + s.id + ' is titled in the step’s words: ' + N.title);
    assert.ok(N.opening.startsWith(s.id + ' ' + s.title), 'the opening names the step: ' + N.opening);
    assert.deepEqual(leftovers(N.opening, M, [s.id, ...actors]).filter(w => !FRAMING.has(w)), [], id + ' ' + s.id + ' opening adds no words of its own: ' + N.opening);
    assert.ok(sentencesOf(N.opening, M, [s.id, ...actors]) <= NARRATIVE_LIMITS.sentences, 'the opening is one to three short sentences: ' + N.opening);
    // One paragraph per step of the trace after the start, in the trace's order; a gap where the trace has one.
    assert.equal(N.paragraphs.length, TRACE_ORDER.length, id + ' ' + s.id + ' tells each layer once');
    assert.deepEqual(N.paragraphs.map(x => x.step), T.steps.slice(1).map(x => x.word), 'in the trace’s order');
    assert.deepEqual(N.paragraphs.filter(x => x.gap).map(x => 'no ' + x.step), T.gaps, id + ' ' + s.id + ' gaps match the trace');
    assert.deepEqual(N.gaps, T.gaps);
    for (const [i, x] of N.paragraphs.entries()) {
      const st = T.steps[i + 1];
      if (x.gap) { assert.equal(x.text, 'No ' + st.word + ' is recorded for this step yet.'); assert.deepEqual(x.ids, []); continue; }
      const cap = NARRATIVE_LIMITS.named + NARRATIVE_LIMITS.refs, expected = [...st.types.flatMap(t => st.records.filter(r => r.type === t).slice(0, cap).map(r => r.id)), ...st.records.filter(r => !st.types.includes(r.type)).slice(0, cap).map(r => r.id)];
      assert.deepEqual(x.ids, expected, id + ' ' + s.id + ' ' + st.word + ' cites every record of the step the bound allows');
      if (st.records.length > expected.length) assert.match(x.text, / and \d+ others\./, 'and counts the rest');
      for (const rid of x.ids) { const o = M.objects.get(rid); assert.ok(x.text.includes(String(o.ref || o.id)) || x.text.includes(o.title), rid + ' is named in: ' + x.text); }
      assert.ok(/\b[A-Z]{2,5}-\d{3}\b/.test(x.text), 'names a reference: ' + x.text);
      assert.doesNotMatch(x.text, /Unassigned|Open question: |undefined|\?\.|\.\.|·\s*$/, 'no placeholder, no doubled stop: ' + x.text);
      const strange = leftovers(x.text, M, x.ids).filter(w => !FRAMING.has(w));
      assert.deepEqual(strange, [], id + ' ' + s.id + ' ' + st.word + ' adds no words of its own: ' + JSON.stringify(strange) + ' in: ' + x.text);
      const n = sentencesOf(x.text, M, x.ids); assert.ok(n >= 1 && n <= NARRATIVE_LIMITS.sentences, 'one to three short sentences (' + n + '): ' + x.text);
    }
    assert.match(N.closing, /^Records on this trace: \d+\. (?:Gaps: no .+\.|Every layer holds a record\.)$/);
    assert.ok(N.paragraphs.length <= NARRATIVE_LIMITS.paragraphs && total(N) <= NARRATIVE_LIMITS.words && total(N) > 40, id + ' ' + s.id + ' within bounds: ' + total(N) + ' words');
    assert.equal(JSON.stringify(traceNarrative(p, traceFrom(p, s.id))), JSON.stringify(N), 'the same document tells the same story');
    assert.equal(JSON.stringify(traceNarrative(structuredClone(p), traceFrom(structuredClone(p), s.id))), JSON.stringify(N), 'and so does its copy');
    stats.narratives++; stats.paragraphs.push(N.paragraphs.length); stats.words.push(total(N)); stats.gaps += N.gaps.length; for (const g of N.gaps) stats.gapWords.add(g);
  }
  measured[id] = {steps: steps.length, ...stats, gapWords: [...stats.gapWords]};
}
pass('every journey step of the bank, permits, warehouse and clinic references yields a narrative whose every paragraph is one to three sentences that name the records it cites and add no words of their own, whose gaps are the trace’s gaps in the records’ words, within 12 paragraphs and 600 words, the same for the same document');

// A non-journey start reads the same way: through the requirement first, the gaps named.
{
  const p = projects[0][1];
  const R = traceNarrative(p, traceFrom(p, 'REQ-001'));
  assert.equal(R.paragraphs.length, TRACE_ORDER.length - 1); assert.equal(R.paragraphs[0].step, 'quality driver'); assert.match(R.title, /^What the design records for REQ-001 /);
  const G = traceNarrative(p, traceFrom(p, 'risk'));
  assert.match(G.paragraphs[0].text, /^It traces to the requirement REQ-002 /); assert.ok(G.gaps.includes('no control') && G.paragraphs.some(x => x.gap && x.text === 'No control is recorded for this step yet.'));
  assert.equal(traceNarrative(p, null), null); assert.equal(traceNarrative(p, traceFrom(p, 'nothing-here')), null); assert.equal(traceStoryHTML(p, null), '');
  pass('a requirement or a responsibility is told the same way, through its requirement first, with its gaps named; nothing to trace is nothing to tell');
}

// ---------------------------------------------------------------- 2. the bounds under long values
{
  const p = structuredClone(projects[0][1]), long = Array.from({length: 300}, (_, i) => 'word' + i).join(' ');
  for (const a of p.artefacts) { a.description = long; a.acceptance = 'Given ' + long + ', when it happens, then it is seen.'; }
  for (const r of p.logical.responsibilities) r.purpose = long;
  for (const c of p.realisation.components) c.purpose = long;
  for (const c of p.technology.capabilities) c.purpose = long;
  for (const c of p.interfaces.contracts) { c.retryPolicy = long; c.operation = long; }
  for (const c of p.security.controls) { c.mechanism = long; c.failureResponse = long; }
  for (const s of journeySteps(p)) {
    const T = traceFrom(p, s.id), N = traceNarrative(p, T);
    assert.ok(total(N) <= NARRATIVE_LIMITS.words, s.id + ' stays within ' + NARRATIVE_LIMITS.words + ' words: ' + total(N));
    for (const [i, x] of N.paragraphs.entries()) if (!x.gap) for (const rid of x.ids) { const o = architectureModel(p).objects.get(rid); assert.ok(x.text.includes(String(o.ref || o.id)), rid + ' still named in ' + T.steps[i + 1].word); }
    assert.ok(N.paragraphs.every(x => x.gap || !x.text.includes(long)), 'a long value is clipped, never copied whole');
  }
  pass('with every value run to hundreds of words the story stays within 600 words, clips the values and still names every record of every step');
  // A step with scores of requirements (the scale fixture's shape): the first are named, the next referenced, the rest counted.
  const q = structuredClone(projects[0][1]), base = q.artefacts.find(a => a.id === 'REQ-001');
  for (let i = 0; i < 40; i++) { const rid = 'REQ-9' + String(i).padStart(2, '0'); q.artefacts.push({...base, id: rid, title: 'Added requirement ' + i, modelRef: undefined}); q.relationships.push({id: 'REL-9' + String(i).padStart(2, '0'), from: 'JRN-001', to: rid, kind: 'requires'}); }
  const Q = traceNarrative(q, traceFrom(q, 'JRN-001')), req = Q.paragraphs[0];
  assert.ok(total(Q) <= NARRATIVE_LIMITS.words && req.ids.length === NARRATIVE_LIMITS.named + NARRATIVE_LIMITS.refs && / and 26 others\./.test(req.text) && !req.text.includes('REQ-939'), 'forty-one requirements: ' + total(Q) + ' words, ' + req.ids.length + ' cited: ' + req.text);
  pass('a step with forty-one requirements names three in full and twelve by reference, counts the twenty-six others, and stays within the bound');
}

// ---------------------------------------------------------------- 3. the HTML reading
{
  const p = structuredClone(projects[0][1]);
  p.artefacts.find(a => a.id === 'JRN-001').title = '<img src=x onerror="alert(1)"> & "quotes"';
  p.artefacts.find(a => a.id === 'REQ-001').title = '</a><script>alert(2)</script>';
  p.logical.responsibilities.find(r => r.id === 'api').purpose = 'javascript:alert(3) <b>bold</b>';
  const T = traceFrom(p, 'JRN-001'), N = traceNarrative(p, T), html = traceStoryHTML(p, T);
  assert.ok(!/<img|<script|<b>|<\/a><script/.test(html) && html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;quotes&quot;') && html.includes('&lt;/a&gt;&lt;script&gt;'), 'hostile titles are escaped');
  assert.ok(!/href="javascript/.test(html) && [...html.matchAll(/href="([^"]*)"/g)].every(m => m[1].startsWith('/?chapter=')), 'every link is an in-app path');
  for (const x of N.paragraphs) for (const id of x.ids) assert.ok(html.includes(`data-cm-open="${id}"`), id + ' is a data-cm-open link');
  assert.ok(html.includes('data-cm-open="JRN-001" data-cm-chapter="1"') && html.includes('data-cm-open="rest" data-cm-chapter="8"') && html.includes('data-cm-open="oauth" data-cm-chapter="9"'), 'each link carries the record’s chapter');
  assert.equal((html.match(/<li class="tn-step/g) || []).length, N.paragraphs.length); assert.ok(html.startsWith('<section class="tn-story" data-tn-from="JRN-001"') && html.includes('<h4 aria-level="3">What happens when: &lt;img'));
  const C = projects.find(([id]) => id === 'clinic-appointments')[1], H = traceStoryHTML(C, traceFrom(C, 'JRN-001'));
  assert.equal((H.match(/<li class="tn-step gap"/g) || []).length, 3); assert.equal((H.match(new RegExp('<li><i aria-hidden="true">○</i>' + CHECK_WORDS.confirm + ' · No ', 'g')) || []).length, 3, 'the gaps in the checks’ words');
  assert.ok(H.includes('href="/?chapter=8&amp;tab=model&amp;object=dat-001"') && traceStoryHTML(C, traceFrom(C, 'JRN-001'), {href: (id, ch) => '/x/' + ch + '/' + id}).includes('href="/x/8/dat-001"'), 'the link target is the companion’s to choose');
  pass('the HTML reading escapes hostile titles, links every cited record with data-cm-open and its chapter to an in-app path the caller may replace, and names the gaps in the checks’ words');
}

// ---------------------------------------------------------------- 4. the SDD section
{
  const forbidden = /Unassigned|Open question: |undefined/;
  for (const [id, p] of projects) {
    const steps = journeySteps(p), full = narrativeSection(p, 'full'), exec = narrativeSection(p, 'executive');
    assert.ok(full.startsWith('# What happens when\n\n') && exec.startsWith('## What happens when\n\n'));
    assert.equal((full.match(/^## [A-Z]{2,5}-\d{3} · /gm) || []).length, Math.min(steps.length, NARRATIVE_LIMITS.steps), id + ' full: one sub-section per journey step');
    assert.equal((exec.match(/^### [A-Z]{2,5}-\d{3} · /gm) || []).length, 1, id + ' executive: the first step only'); assert.equal((exec.match(/^#{1,3} /gm) || []).length, 2);
    assert.ok(exec.includes('### ' + steps[0].id + ' · ' + steps[0].title + '\n') && (steps.length === 1 || exec.includes('The full edition tells the ' + (steps.length - 1) + ' other step')));
    for (const md of [full, exec]) {
      assert.doesNotMatch(md, forbidden, id + ': no placeholder in the SDD text');
      for (const line of md.split('\n')) { assert.ok(!/:\s+·|·\s*$|^\s*·/.test(line), 'no dangling separator: ' + line); if (/^(?:The|\d+) /.test(line)) assert.match(line, /\b[A-Z]{2,5}-\d{3}\b/, 'a statement names its records: ' + line); }
    }
    for (const s of steps.slice(0, NARRATIVE_LIMITS.steps)) assert.ok(full.includes('\n## ' + s.id + ' · ' + s.title + '\n\n' + s.id + ' ' + s.title), id + ' ' + s.id + ' is told under its heading');
  }
  assert.equal(narrativeSection(createProject({name: 'Blank', template: 'blank', brief: 'A brief with nothing drafted.'}, 'blank', at), 'full'), '', 'no journey, no section');
  const many = structuredClone(projects[0][1]);
  for (let i = 6; i <= 25; i++) many.artefacts.push({...many.artefacts.find(a => a.id === 'JRN-005'), id: 'JRN-' + String(i).padStart(3, '0'), title: 'Added step ' + i, order: i});
  const capped = narrativeSection(many, 'full');
  assert.equal((capped.match(/^## /gm) || []).length, NARRATIVE_LIMITS.steps); assert.ok(capped.includes('And 5 more steps, not told here: JRN-021, JRN-022, JRN-023, JRN-024, JRN-025.'));
  pass('the SDD section tells each journey step under its own heading in the full edition (the first 20, the rest named), the first step only in the executive edition, nothing without a journey, and prints no placeholder');
}

// ---------------------------------------------------------------- what was measured
const bank = projects[0][1];
const summary = Object.fromEntries(Object.entries(measured).map(([id, m]) => { const sorted = xs => [...xs].sort((a, b) => a - b), med = xs => sorted(xs)[Math.floor(xs.length / 2)]; return [id, {steps: m.steps, paragraphs: {min: Math.min(...m.paragraphs), median: med(m.paragraphs), max: Math.max(...m.paragraphs)}, words: {min: Math.min(...m.words), median: med(m.words), max: Math.max(...m.words)}, gapsNamed: m.gaps, gapWords: m.gapWords}]; }));
console.log(JSON.stringify({suite: 'trace narrative', passed: checks.length, checks, measured: summary, sddFullWords: {bank: words(narrativeSection(bank, 'full'))}}, null, 2));
