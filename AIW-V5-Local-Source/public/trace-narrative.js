// The narrative trace (round 6, R6-G; audit/round6/DESIGN.md): "what happens when", told from the saved records along
// one record's trace (model-matrix.js traceFrom). Each paragraph is one step of the chain — requirement, quality driver,
// decision, responsibility, component, capability, realization, contract or data definition, control, placement,
// running part — in one to three short sentences whose nouns are the records' own titles, references and field values:
// a responsibility's purpose, a component's owner, a contract's protocol, operation, timeout and retry policy, a data
// definition's classification and key field, a control's mechanism and failure response, a placement's zone, role and
// replicas. A step with nothing recorded is named as a gap ("No control is recorded for this step yet."); a field the
// drafter left as an open question is named as one, never read as a fact. Nothing is inferred and no LLM is called:
// the same document tells the same story, bounded to 12 paragraphs and 600 words. DOM-free. The HTML reading links
// each reference the way the chapter models' companions link records (an in-app link to the record on its chapter's
// model, carrying data-cm-open for a view that selects in place); the Markdown section joins the SDD (sdd-document.js
// wires narrativeSection for both editions).
import {architectureModel, OBJECT_TYPES} from './architecture-model.js';
import {traceFrom, setLabel} from './model-matrix.js';
import {CHECK_WORDS, CHECK_GLYPHS} from './readiness-model.js';
import {esc} from './html-escape.js';
import {list} from './util.js';

// The bounds: paragraphs and words per story, sentences per paragraph, records named in full per step and then by
// reference (any others are counted), journey steps told in the full edition of the SDD, and the length a field value
// is read to.
export const NARRATIVE_LIMITS = {paragraphs: 12, words: 600, sentences: 3, named: 3, refs: 12, steps: 20, value: 140};

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
// What the editors and the drafter write where nothing is said yet; sdd-document.js reads the same words as gaps.
const UNSAID = /^(?:Open question: |Unassigned\b|Unspecified\b|Missing$|Not recorded$|Target not defined$)/;
const said = v => { const t = clean(v); return t && !UNSAID.test(t) ? t : ''; };
const openQ = v => /^Open question: /.test(clean(v));
// A value still holding the editor's placeholders ("Given [the starting condition], …") is a template, not a statement.
const templated = v => /\[[^\]]+\]/.test(clean(v));
// The same words, with or without a full stop (a drafted step's description repeats its title).
const same = (a, b) => clean(a).replace(/[.!?]+$/, '') === clean(b).replace(/[.!?]+$/, '');
const capFirst = t => (t ? t[0].toUpperCase() + t.slice(1) : t);
const endDot = t => (/[.!?…]$/.test(t) ? t : t + '.');
const words = t => (String(t).match(/\S+/g) || []).length;
// A value's first sentence, or its head cut at a word, within the bound.
export function clipValue(v, max = NARRATIVE_LIMITS.value) {
  const t = clean(v); if (t.length <= max) return t;
  const s = /^(.*?[.!?])(?=\s)/.exec(t); if (s && s[1].length <= max) return s[1];
  const cut = t.slice(0, max - 1), at = cut.lastIndexOf(' ');
  return (at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,;:·—-]+$/, '') + '…';
}

// A sentence is a list of parts: text, or a mention of a record ({id, ref, title, type, say}) that the HTML links.
const mention = (o, say = 'both') => ({id: o.id, ref: String(o.ref || o.id), title: clean(o.title), type: o.type, say});
const partText = x => (typeof x === 'string' ? x : x.say === 'ref' || !x.title ? x.ref : x.ref + ' ' + x.title);
const sentenceText = s => s.map(partText).join('');
// A sentence never ends "?." or ".": a closing full stop after a record's own question mark or full stop is dropped.
const S = (...parts) => { const out = parts.flat().filter(x => x !== '' && x != null); if (out.length > 1 && out.at(-1) === '.' && /[.?!]$/.test(partText(out.at(-2)))) out.pop(); return out; };
// The records of a step: the first few in full, the next by reference, and the count of any others, so a step with
// hundreds of records (the scale fixture) stays within the story's bound and says how many it leaves unnamed.
function nameAll(recs, extra = () => '') {
  const named = recs.slice(0, NARRATIVE_LIMITS.named), byRef = recs.slice(NARRATIVE_LIMITS.named, NARRATIVE_LIMITS.named + NARRATIVE_LIMITS.refs), others = recs.length - named.length - byRef.length, parts = [];
  named.forEach((o, i) => { if (i) parts.push(i === named.length - 1 && !byRef.length ? ' and ' : ', '); parts.push(mention(o)); const x = extra(o); if (x) parts.push(' (' + x + ')'); });
  if (byRef.length) { parts.push(', and ' + (byRef.length + others) + ' more: '); byRef.forEach((o, i) => { if (i) parts.push(', '); parts.push(mention(o, 'ref')); }); if (others) parts.push(' and ' + others + ' others'); }
  return parts;
}
const purposeOf = o => { const r = o.record || {}, t = said(r.purpose) || said(r.description); return t && !same(t, o.title) ? [S('Purpose of ', mention(o, 'ref'), ': ', endDot(clipValue(t)))] : []; };
const ownerOf = o => { const w = said(o.record?.owner); return w ? [S('Owner: ', w, '.')] : []; };
const statusOf = o => { const st = said(o.record?.status); return st ? [S('Status: ', st, '.')] : []; };
const oneOf = (recs, one, many) => (recs.length === 1 ? one : many);

// How each layer of the chain is told: the lead names every record of the step; `more` reads the first record's fields.
const TELL = {
  requirement: {
    lead: (recs, ctx) => S(ctx.start.type === 'journey' ? 'It needs ' : 'It traces to the ' + oneOf(recs, 'requirement ', 'requirements '), nameAll(recs, o => said(o.record.priority)), '.'),
    more: o => { const a = said(o.record.acceptance); return a && !templated(a) ? [S('Acceptance of ', mention(o, 'ref'), ': ', endDot(clipValue(a)))] : []; }
  },
  quality: {
    lead: recs => S('The quality ', oneOf(recs, 'driver on it is ', 'drivers on it are '), nameAll(recs, o => said(o.record.priority)), '.'),
    more: o => { const r = o.record, m = said(r.metric), t = said(r.targetValue); return m && t ? [S(mention(o, 'ref'), ' sets ', m, ': ', [said(r.operator).toLowerCase(), t, said(r.unit)].filter(Boolean).join(' '), '.')] : []; }
  },
  decision: {
    lead: recs => S('The ', oneOf(recs, 'decision behind it is ', 'decisions behind it are '), nameAll(recs), '.'),
    more: o => { const r = o.record, alt = list(r.alternatives).find(a => a.id === r.selectedAlternativeId), st = said(r.status); return alt && said(alt.title) ? [S(mention(o, 'ref'), ' chose ', clean(alt.title), '.')] : st ? [S(mention(o, 'ref'), ' is ', st, '; no alternative is chosen yet.')] : []; }
  },
  responsibility: {lead: recs => S('The ', oneOf(recs, 'responsibility is ', 'responsibilities are '), nameAll(recs), '.'), more: o => [...purposeOf(o), ...ownerOf(o)]},
  component: {lead: recs => S(nameAll(recs), oneOf(recs, ' realizes it.', ' realize it.')), more: o => [...ownerOf(o), ...statusOf(o)]},
  capability: {lead: recs => S('It calls on ', nameAll(recs), '.'), more: o => purposeOf(o)},
  technology: {
    lead: recs => S('It is realized by ', nameAll(recs), '.'),
    more: o => { const r = o.record, opt = list(r.options).find(x => x.id === r.selectedOptionId), n = list(r.options).length; return opt && said(opt.title) ? [S(mention(o, 'ref'), ' selects ', clean(opt.title), '.')] : n ? [S(mention(o, 'ref'), ' lists ', String(n), n === 1 ? ' option; none is selected yet.' : ' options; none is selected yet.')] : []; }
  },
  contract: {
    lead: recs => S('The ', oneOf(recs, 'contract is ', 'contracts are '), nameAll(recs, o => said(o.record.kind)), '.'),
    // One sentence: operation over protocol, from one party to the other; then the timeout and the retry policy, or
    // that none is recorded.
    more: (o, ctx) => {
      const r = o.record, op = said(r.operation) && clipValue(r.operation, 90), pr = said(r.protocol) && clipValue(r.protocol, 90), from = ctx.M.objects.get(r.from), to = ctx.M.objects.get(r.to);
      const how = [op && pr ? op + ' over ' + pr : op || pr, from && to ? 'from ' + clean(from.title) + ' to ' + clean(to.title) : ''].filter(Boolean).join(', ');
      const t = Number(r.timeoutMs), retry = said(r.retryPolicy);
      const bounds = [t > 0 ? 'timeout ' + t + ' ms' : openQ(r.timeoutMs) ? 'timeout: open question' : 'no timeout is recorded', retry ? 'retry ' + clipValue(retry, 90) : openQ(r.retryPolicy) ? 'retry policy: open question' : 'no retry policy is recorded'].join('; ');
      return [S(mention(o, 'ref'), how ? ' is ' + how + '; ' : ': ', bounds, '.')];
    }
  },
  // Each data definition carries its classification and key field in the sentence that names it.
  data: {
    lead: recs => S('The data ', oneOf(recs, 'definition is ', 'definitions are '), nameAll(recs, o => { const r = o.record, cls = said(r.classification), key = list(r.fields).find(f => f.key && said(f.name)); return [cls || 'no classification is recorded', key ? 'key field ' + clean(key.name) : 'no key field is recorded'].join('; '); }), '.'),
    more: () => []
  },
  control: {
    lead: recs => S(nameAll(recs), oneOf(recs, ' protects it.', ' protect it.')),
    more: o => { const r = o.record, m = said(r.mechanism), en = said(r.enforcement), f = said(r.failureResponse), fm = said(r.failureMode); return [S(m ? 'Mechanism: ' + endDot(clipValue(m)) : en ? 'Enforcement: ' + endDot(clipValue(en)) : openQ(r.mechanism) ? 'Mechanism: open question.' : 'No mechanism is recorded.'), S(f ? 'On failure: ' + endDot(clipValue(f)) : fm ? 'Failure mode: ' + fm + '.' : openQ(r.failureResponse) ? 'Failure response: open question.' : 'No failure response is recorded.')]; }
  },
  instance: {
    lead: recs => S('The ', oneOf(recs, 'placement is ', 'placements are '), nameAll(recs), '.'),
    more: o => { const r = o.record, zone = said(o.attributes?.zone), role = said(r.role), n = Number(r.replicas), bits = [role, zone ? 'in ' + zone : '', n > 0 ? n + (n === 1 ? ' replica' : ' replicas') : ''].filter(Boolean); return bits.length ? [S(mention(o, 'ref'), ' is ', bits.join(', '), '.')] : []; }
  },
  runtime: {
    lead: recs => S('The running ', oneOf(recs, 'part is ', 'parts are '), nameAll(recs), '.'),
    more: (o, ctx) => {
      const r = o.record, env = ctx.M.objects.get(r.environmentId), mode = said(r.stateMode), mr = Number(r.minReady), mx = Number(r.maxReplicas);
      const bits = [mr > 0 ? 'min ready ' + mr : '', mx > 0 ? 'max replicas ' + mx : '', mode ? 'state mode ' + mode : ''].filter(Boolean);
      const where = env || bits.length ? [S(mention(o, 'ref'), env ? ' runs in ' + clean(env.title) : '', bits.length ? (env ? ': ' : ' has ') + bits.join(', ') : '', '.')] : [];
      return [...where, ...ownerOf(o)];
    }
  }
};
const generic = type => ({lead: recs => S(capFirst(setLabel(type).toLowerCase()) + ': ', nameAll(recs), '.'), more: o => purposeOf(o)});

// Who takes part in a journey step: the actors the project relates to it ('participates in', either way round).
function actorsOf(p, id, M) {
  const ids = new Set();
  for (const r of list(p.relationships)) if (r.kind === 'participates in') { if (r.to === id) ids.add(r.from); else if (r.from === id) ids.add(r.to); }
  return [...ids].map(x => M.objects.get(x)).filter(o => o && o.type === 'actor').sort((a, b) => String(a.ref).localeCompare(String(b.ref), undefined, {numeric: true}));
}
// The story's title: a journey step reads "What happens when …" in the step's own words.
export function narrativeTitle(start) {
  const t = clean(start.title) || String(start.ref || start.id);
  if (start.type === 'journey') return /^(?:A|An|The) [a-z]/.test(t) ? 'What happens when ' + t[0].toLowerCase() + t.slice(1) : 'What happens when: ' + t;
  return 'What the design records for ' + String(start.ref || start.id) + ' ' + t;
}
// The opening: the start record with its description after a dash, who takes part (a journey step), its owner.
function openingOf(start, ctx) {
  const r = start.record || {}, d = said(r.description) || said(r.purpose) || said(r.scenario) || said(r.question);
  const out = [S(mention(start), d && !same(d, start.title) ? ' — ' + endDot(clipValue(d)) : '.')];
  if (start.type === 'journey') { const actors = actorsOf(ctx.p, start.id, ctx.M); if (actors.length) out.push(S(nameAll(actors), actors.length === 1 ? ' takes part.' : ' take part.')); }
  return [...out, ...ownerOf(start)];
}
const textOf = sentences => sentences.map(sentenceText).join(' ');
const partsOf = sentences => sentences.flatMap((s, i) => (i ? [' ', ...s] : s));

// The story in full: the opening, one paragraph per step of the trace, the closing, each paragraph with the parts the
// HTML links and the ids of the records it cites. `primary` sentences name the records and are never trimmed; the
// detail sentences after them go, last paragraph first, until the story fits the word bound.
function narrate(p, trace) {
  if (!p || !trace || !trace.id) return null;
  const M = architectureModel(p), start = M.objects.get(trace.id); if (!start) return null;
  const ctx = {p, M, start}, paragraphs = [];
  let count = 0;
  for (const st of list(trace.steps)) {
    const recs = list(st.records).map(r => M.objects.get(r.id)).filter(o => o && o.id !== start.id);
    count += recs.length;
    if (!recs.length) { if (list(st.types).includes(start.type)) continue; paragraphs.push({step: st.word, sentences: [], primary: 0, ids: [], gap: true}); continue; }
    const lead = [], more = [];
    for (const t of list(st.types)) { const mine = recs.filter(o => o.type === t); if (!mine.length) continue; const tell = TELL[t] || generic(t); lead.push(tell.lead(mine, ctx)); more.push(...tell.more(mine[0], ctx)); }
    const other = recs.filter(o => !list(st.types).includes(o.type)); if (other.length) lead.push(generic(other[0].type).lead(other, ctx));
    // One to three sentences: the sentences that name the records, then the details that fit.
    const sentences = [...lead, ...more].slice(0, Math.max(lead.length, NARRATIVE_LIMITS.sentences));
    paragraphs.push({step: st.word, sentences, primary: lead.length, ids: [...new Set(lead.flat().filter(x => typeof x === 'object').map(x => x.id))], gap: false});
  }
  const told = paragraphs.slice(0, NARRATIVE_LIMITS.paragraphs), opening = openingOf(start, ctx), gaps = list(trace.gaps).slice();
  const gapText = x => 'No ' + x.step + ' is recorded for this step yet.';
  const closing = 'Records on this trace: ' + count + '.' + (gaps.length ? ' Gaps: ' + gaps.join(', ') + '.' : ' Every layer holds a record.');
  const title = narrativeTitle(start), total = () => words(title) + words(textOf(opening)) + told.reduce((k, x) => k + words(x.gap ? gapText(x) : textOf(x.sentences)), 0) + words(closing);
  for (let guard = 400; total() > NARRATIVE_LIMITS.words && guard; guard--) {
    const x = [...told].reverse().find(q => !q.gap && q.sentences.length > q.primary);
    if (x) { x.sentences.pop(); continue; }
    if (opening.length > 1) { opening.pop(); continue; }
    break;
  }
  return {
    id: start.id, ref: String(start.ref || start.id), title,
    opening: textOf(opening), openingParts: partsOf(opening), openingIds: [start.id, ...opening.flat().filter(x => typeof x === 'object').map(x => x.id)],
    paragraphs: told.map(x => (x.gap ? {step: x.step, text: gapText(x), parts: [gapText(x)], ids: [], gap: true} : {step: x.step, text: textOf(x.sentences), parts: partsOf(x.sentences), ids: x.ids, gap: false})),
    closing, gaps, count
  };
}
// The story as data: {title, opening, paragraphs: [{step, text, ids, gap}], closing, gaps}.
export function traceNarrative(p, trace) {
  const N = narrate(p, trace);
  return N && {title: N.title, opening: N.opening, paragraphs: N.paragraphs.map(({step, text, ids, gap}) => ({step, text, ids: ids.slice(), gap})), closing: N.closing, gaps: N.gaps};
}

// ---------------------------------------------------------------- the companion's reading
const defaultHref = (id, chapter) => '/?chapter=' + (chapter || 1) + '&tab=model&object=' + encodeURIComponent(id);
// A reference links to its record on its chapter's model, as the companions of the chapter models link records; the
// data-cm-open attribute lets a view that holds the record select it in place instead.
const linkHTML = (m, href) => {
  const ch = OBJECT_TYPES[m.type]?.chapter || '';
  return `<a class="cm-link tn-ref" data-cm-open="${esc(m.id)}"${ch ? ` data-cm-chapter="${ch}"` : ''} href="${esc(href(m.id, ch))}" title="${esc(m.ref + (m.title ? ' ' + m.title : ''))}">${esc(m.ref)}</a>` + (m.say !== 'ref' && m.title ? ' ' + esc(m.title) : '');
};
const partsHTML = (parts, href) => parts.map(x => (typeof x === 'string' ? esc(x) : linkHTML(x, href))).join('');
// Escaped HTML for the companion: the title, the opening, the paragraphs with each reference a link, the closing,
// and the gaps in the checks' words (readiness-model.js: "to confirm").
export function traceStoryHTML(p, trace, {href = defaultHref} = {}) {
  const N = narrate(p, trace); if (!N) return '';
  const para = x => `<li class="tn-step${x.gap ? ' gap' : ''}" data-tn-step="${esc(x.step)}"><small>${esc(x.step)}</small><span>${partsHTML(x.parts, href)}</span></li>`;
  const gaps = N.gaps.length ? `<ul class="tn-gaps" aria-label="Gaps on this trace">${N.paragraphs.filter(x => x.gap).map(x => `<li><i aria-hidden="true">${esc(CHECK_GLYPHS.confirm)}</i>${esc(CHECK_WORDS.confirm)} · ${esc(x.text)}</li>`).join('')}</ul>` : '';
  return `<section class="tn-story" data-tn-from="${esc(N.id)}" aria-label="${esc(N.title)}"><h4 aria-level="3">${esc(N.title)}</h4><p class="tn-open">${partsHTML(N.openingParts, href)}</p><ol class="tn-steps">${N.paragraphs.map(para).join('')}</ol><p class="tn-close">${esc(N.closing)}</p>${gaps}<p class="cm-muted">Told from the saved records along the trace, in their own words; a gap is what no record says yet.</p></section>`;
}

// ---------------------------------------------------------------- the SDD's section
// Chapter 1's journey steps in the order the Story view walks them.
export const journeySteps = p => list(p?.artefacts).filter(a => a && a.type === 'journey').sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || (a.id < b.id ? -1 : 1));
const refsOf = steps => steps.map(s => String(s.ref || s.id)).join(', ');
// Markdown for the SDD: in the full edition "What happens when" with one sub-section per journey step (the first 20);
// in the executive edition the first step only; '' when the project records no journey step.
export function narrativeSection(p, edition = 'full') {
  const steps = journeySteps(p); if (!steps.length) return '';
  const exec = edition === 'executive', shown = exec ? steps.slice(0, 1) : steps.slice(0, NARRATIVE_LIMITS.steps), h = exec ? ['## ', '### '] : ['# ', '## '];
  let md = h[0] + 'What happens when\n\n' + (exec ? 'One journey step, the first' : 'Each journey step') + ', read through the records on its trace: requirement, quality driver, decision, responsibility, component, capability, realization, contract or data definition, control, placement and running part. Every sentence is built from the records\' own titles, references and field values; a step with nothing recorded is named as a gap.\n\n';
  for (const s of shown) {
    let T = null; try { T = traceFrom(p, s.id); } catch { T = null; }
    const N = T && traceNarrative(p, T); if (!N) continue;
    md += h[1] + String(s.ref || s.id) + ' · ' + clean(s.title) + '\n\n' + N.opening + '\n\n' + N.paragraphs.map(x => x.text).join('\n\n') + '\n\n' + N.closing + '\n\n';
  }
  if (steps.length > shown.length) md += (exec ? 'The full edition tells the ' + (steps.length - 1) + ' other step' + (steps.length - 1 === 1 ? '' : 's') + ': ' : 'And ' + (steps.length - shown.length) + ' more steps, not told here: ') + refsOf(steps.slice(shown.length)) + '.\n\n';
  return md;
}
