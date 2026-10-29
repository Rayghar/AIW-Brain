// Domain lenses (round 12, workstream C; audit/round12/DESIGN.md, D-14).
//
// A lens is a deterministic rule set for one domain: the concerns a solution in that domain must address, the words
// that show a record speaks of each concern, and the facets a design must cover for each. It makes no knowledge
// claim, cites no source and consults no model. For a project it says, per concern: addressed, partly, not addressed,
// or not applicable (the person's choice); the records that address it; and the questions to ask next. The lenses are
// files of their own (public/lenses/*.js); the core-banking lens is the first. A lens is never knowledge: it states no
// value a design must take, and nothing it reads moves a score, a constraint or a conformance result. Round 12
// (workstream E, D-10): Sol's architecture draft (architecture-drafter.js) reads the chosen lens's concerns, as rules,
// to name the operational, data, technology-evolution and continuity drivers the requirements evidence; what it drafts
// stays a proposal a person keeps or retires. Its reading is an item to confirm on Chapter 11's Validate, and it blocks
// nothing.
//
// What it reads (lensRecords). The records the chapters keep, each with its role:
//   - stated (what the design is asked for): Chapter 1 requirements, constraints, outcomes and assumptions, Chapter 2
//     quality drivers and Chapter 9 threats;
//   - design (what the design does): Chapter 3 decisions, Chapter 4 responsibilities, Chapter 5 components, Chapter 6
//     platform capabilities, Chapter 7 realizations, Chapter 8 contracts, data definitions and parties, Chapter 9
//     controls, Chapter 10 environments, zones and runtime plans, the roadmap's plateaus and Chapter 11's delivery
//     actions.
// A record's words are its own text fields, with the name of every filled field (a plan whose recovery plan is filled
// reads "recovery plan") and the words of every field name it defines (a data field "debitAccount" reads "debit
// account"), in lower case. Identifiers, references, owners, provenance, history, review state and the copies a record
// keeps of other records are not its words; a value that says nothing ("Unspecified", "not stated", "Unclassified") is
// left out. A design record is read for what it does, not for its caveats: its risks, drawbacks, costs, anti-patterns
// and assumptions are not its words (a product option whose drawback says "check residency" does not address
// residency), and neither are its open sentences: a question, or a sentence that says something is open or not stated,
// decided, recorded or defined ("Open question: which recovery site? Not stated."). Those sentences say the design
// leaves the concern open; the reading names such records apart, as leaving it open, and never counts them as
// addressing it. A stated record is read with all its words. Words beyond the first 8,000 characters of a record are
// not read.
//
// The coverage rule (the same for every concern; each concern's cues and facets are in its lens file):
//   - a record speaks of a concern when its words match the concern's cues;
//   - a facet is met by a design record that speaks of the concern and matches the facet's words (or every pattern of
//     its `all`), or that passes the facet's field rule (`check`). A facet marked `alone` needs no concern cue in the
//     same record; one marked `from: 'any'` may also be met by a stated record; `kinds` limits it to some record kinds;
//   - addressed: every required facet is met and a design record speaks of the concern or meets a facet; partly: a
//     design record speaks of it or meets a facet, but a required facet is not met; not addressed: no design record
//     does (the design records that only leave it open are named); not applicable: the person said so, with a reason.
// The questions: for a concern not addressed, its lead question first; then those of the required facets not met;
// then those of the optional facets not met; at most four.
//
// The choice is a project setting (p.workspace.domainLens), made only through the governed commands lens.choose,
// lens.clear and lens.concern (applyLensCommand), each with the person's reason, each recorded with who and when. AIW
// suggests a lens when the brief and the requirements use its words (lensSuggestion), and never chooses one. Pure:
// nothing here changes a project, except applyLensCommand, which works on a copy and changes the setting alone.
import {CORE_BANKING} from './lenses/core-banking.js';
import {list, str, plural, joinAnd} from './util.js';
import {remember, documentCopy} from './document-memo.js';

export const LENSES = [CORE_BANKING];
export const lensById = id => LENSES.find(l => l.id === id) || null;
export const LENS_COMMANDS = ['lens.choose', 'lens.clear', 'lens.concern'];
export const LENS_STATES = ['addressed', 'partly', 'not-addressed', 'not-applicable'];
export const LENS_WORDS = {addressed: 'addressed', partly: 'partly addressed', 'not-addressed': 'not addressed', 'not-applicable': 'not applicable'};
export const LENS_RULE = 'Read by rule from the records the chapters keep. A lens makes no knowledge claim, approves nothing and blocks nothing.';
export const LENS_LIMITS = {reason: 600, history: 100, text: 8000, questions: 4};

// ---------------------------------------------------------------- the records, as a lens reads them

const SOURCES = [
  {kind: 'requirement', chapter: 1, role: 'stated', list: p => list(p?.artefacts).filter(a => a?.type === 'requirement')},
  {kind: 'constraint', chapter: 1, role: 'stated', list: p => list(p?.artefacts).filter(a => a?.type === 'constraint')},
  {kind: 'outcome', chapter: 1, role: 'stated', list: p => list(p?.artefacts).filter(a => a?.type === 'outcome')},
  {kind: 'assumption', chapter: 1, role: 'stated', list: p => list(p?.artefacts).filter(a => a?.type === 'assumption')},
  {kind: 'driver', chapter: 2, role: 'stated', list: p => list(p?.quality?.drivers)},
  {kind: 'decision', chapter: 3, role: 'design', list: p => list(p?.decisions?.records)},
  {kind: 'responsibility', chapter: 4, role: 'design', list: p => list(p?.logical?.responsibilities)},
  {kind: 'component', chapter: 5, role: 'design', list: p => list(p?.realisation?.components)},
  {kind: 'capability', chapter: 6, role: 'design', list: p => list(p?.technology?.capabilities)},
  {kind: 'realisation', chapter: 7, role: 'design', list: p => list(p?.technologyRealisation?.records)},
  {kind: 'contract', chapter: 8, role: 'design', list: p => list(p?.interfaces?.contracts)},
  {kind: 'data', chapter: 8, role: 'design', list: p => list(p?.interfaces?.data)},
  {kind: 'party', chapter: 8, role: 'design', list: p => list(p?.interfaces?.parties)},
  {kind: 'threat', chapter: 9, role: 'stated', list: p => list(p?.security?.threats)},
  {kind: 'control', chapter: 9, role: 'design', list: p => list(p?.security?.controls)},
  {kind: 'environment', chapter: 10, role: 'design', list: p => list(p?.runtime?.environments)},
  {kind: 'zone', chapter: 10, role: 'design', list: p => list(p?.runtime?.zones)},
  {kind: 'plan', chapter: 10, role: 'design', list: p => list(p?.runtime?.plans)},
  {kind: 'plateau', chapter: 11, role: 'design', list: p => list(p?.roadmap?.plateaus)},
  {kind: 'action', chapter: 11, role: 'design', list: p => list(p?.finalReview?.actions)}
];
export const LENS_KINDS = SOURCES.map(s => s.kind);
// What a record's words leave out: identifiers and references, owners, provenance, history and review state.
const SKIP = new Set(['id', 'ref', 'type', 'revision', 'history', 'sourceSnapshot', 'provenance', 'review', 'origin', 'status', 'confirmed', 'col', 'order', 'rank', 'source', 'from', 'to', 'actor', 'reviewer', 'solSuggestions', 'assessments', 'governance', 'appliedImpact', 'sourceChapter', 'externalId', 'counters', 'version', 'schemaVersion', 'tags']);
const SKIP_END = /(?:Id|Ids|Ref|Refs|Owner|owner|At|By|Hash|Stamp|Url|Confirmed|Resolved|Snapshot)$/;
// What a design record warns of rather than does.
const CAVEATS = new Set(['risks', 'drawbacks', 'costs', 'antiPattern', 'assumptions']);
const EMPTY = /^(?:unspecified|not stated|not recorded|not classified yet|unclassified|inherited|none|n\/a|tbd|unknown|-)$/i;
export const fieldWords = key => String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_]+/g, ' ').toLowerCase();
function wordsOf(record, {caveats = true} = {}) {
  const parts = [], room = {left: LENS_LIMITS.text};
  const add = (key, value, depth) => {
    if (room.left <= 0) return;
    if (typeof value === 'string') {
      const s = value.trim(); if (!s || EMPTY.test(s)) return;
      const piece = (key ? fieldWords(key) + ': ' : '') + (key === 'name' ? fieldWords(s) : s).slice(0, room.left);
      parts.push(piece); room.left -= piece.length; return;
    }
    if (depth > 3 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { for (const x of value) add(typeof x === 'string' ? key : '', x, depth + 1); return; }
    for (const [k, x] of Object.entries(value)) if (!SKIP.has(k) && !SKIP_END.test(k) && (caveats || !CAVEATS.has(k))) add(k, x, depth + 1);
  };
  add('', record, 0);
  return parts.join(' \n ').toLowerCase().replace(/\s+/g, ' ');
}
// A sentence that leaves something open: a question; one that says a thing is open, or not stated, decided, recorded,
// defined, specified, agreed or chosen yet; or one that says no such thing is stated, recorded, given or found ("No
// recovery site appears in the source."). A sentence that forbids ("No user may approve their own entry.") is kept.
const OPEN = /\?|\bopen questions?\b|\bnot (?:yet )?(?:stated|recorded|decided|designed|defined|specified|agreed|chosen|named|given)\b|\bunspecified\b|\bto be (?:confirmed|decided|defined|agreed|designed|named)\b|\btb[cd]\b|\b(?:is|are|remains?|left) open\b|\b(?:no|none|nothing)\b[^.;]{0,200}\b(?:stated|recorded|given|named|specified|defined|mentioned|appears?|exists?)\b/;
// A design record's words in two parts: what it asserts, and the sentences it leaves open.
function splitOpen(text) {
  const kept = [], open = [];
  for (const piece of text.split(/(?<=[.?!;])\s+| \n /)) (OPEN.test(piece) ? open : kept).push(piece);
  return {text: kept.join(' '), open: open.join(' ')};
}
// Every record the lens reads, in journey order: {id, ref, title, kind, chapter, role, text, open, raw}: `text` is
// what the record asserts (for a stated record, all its words), `open` the sentences a design record leaves open.
export function lensRecords(p) {
  const out = [];
  for (const s of SOURCES) for (const r of s.list(p)) {
    if (!r || typeof r !== 'object') continue;
    const id = str(r.id); if (!id) continue;
    const words = wordsOf(r, {caveats: s.role === 'stated'}), read = s.role === 'stated' ? {text: words, open: ''} : splitOpen(words);
    out.push({id, ref: str(r.ref) || id, title: str(r.title || r.question || r.name), kind: s.kind, chapter: s.chapter, role: s.role, text: read.text, open: read.open, raw: r});
  }
  return out;
}

// ---------------------------------------------------------------- the setting, and the suggestion

// The lens the person chose for the project, or null. A choice of a lens AIW no longer offers reads as no choice.
export function lensSetting(p) {
  const s = p?.workspace?.domainLens;
  if (!s || typeof s !== 'object' || !lensById(s.lensId)) return null;
  return s;
}
const firstMatch = (re, texts) => { for (const t of texts) { const m = re.exec(t); if (m) return m[0].trim(); } return null; };
// Whether the brief and the requirements use a lens's words: its strong cues, and how many of its concerns they name,
// each with the first words found. A suggestion is only shown; it sets nothing.
export function lensSuggestion(p) {
  const brief = [p?.brief?.problem, p?.brief?.goal, p?.brief?.text].map(str).filter(Boolean).join(' \n ').toLowerCase();
  const reqs = list(p?.artefacts).filter(a => a?.type === 'requirement').map(a => wordsOf(a));
  const texts = [brief, ...reqs].filter(Boolean);
  if (!texts.length) return null;
  let best = null;
  for (const lens of LENSES) {
    const concerns = [];
    for (const c of lens.concerns) { const w = firstMatch(c.cues, texts); if (w) concerns.push({id: c.id, title: c.title, words: w}); }
    const strong = firstMatch(lens.suggest.strong, texts);
    const fits = concerns.length >= (strong ? lens.suggest.withStrong : lens.suggest.without);
    if (fits && (!best || concerns.length > best.concerns.length)) best = {lensId: lens.id, title: lens.title, noun: lens.noun, strong, concerns, words: [...new Set([strong, ...concerns.map(c => c.words)].filter(Boolean))].slice(0, 6)};
  }
  return best;
}

// ---------------------------------------------------------------- the reading

// References in the order a reader expects: by chapter, then by the reference's letters and number (APP-2 before APP-10).
const refKey = ref => { const m = /^(.*?)(\d+)(\D*)$/.exec(ref); return m ? [m[1], Number(m[2]), m[3]] : [ref, -1, '']; };
function byRef(a, b) {
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  const x = refKey(a.ref), y = refKey(b.ref);
  if (x[0] !== y[0]) return x[0] < y[0] ? -1 : 1;
  if (x[1] !== y[1]) return x[1] - y[1];
  if (x[2] !== y[2]) return x[2] < y[2] ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
const brief = r => ({id: r.id, ref: r.ref, title: r.title, kind: r.kind, chapter: r.chapter});
// A facet's check may say 'not-stated' of a record (round 12, GR-DOM-14): the record leaves the value the facet reads
// not stated, so it neither meets nor fails the facet; facetUnstated finds those records.
const checkOf = (f, r) => (f.from !== 'any' && r.role !== 'design') || (f.kinds && !f.kinds.includes(r.kind)) || !f.check ? false : f.check(r.raw, r);
const facetUnstated = (f, r) => checkOf(f, r) === 'not-stated';
function facetMet(f, r, speaks) {
  if (f.from !== 'any' && r.role !== 'design') return false;
  if (f.kinds && !f.kinds.includes(r.kind)) return false;
  if (f.check && f.check(r.raw, r) === true) return true;
  if (!f.alone && !speaks) return false;
  if (f.all) return f.all.every(re => re.test(r.text));
  return !!f.words && f.words.test(r.text);
}
// The person's not-applicable choice for one concern, or null.
const notApplicableOf = (setting, id) => list(setting?.notApplicable).find(x => x?.concernId === id) || null;
function readConcern(c, records, setting) {
  const na = notApplicableOf(setting, c.id);
  const facets = c.facets.map(f => ({id: f.id, label: f.label, required: !!f.required, question: f.question, hits: [], unstated: []}));
  const stated = [], design = new Map(), leftOpen = [];
  for (const r of records) {
    const speaks = c.cues.test(r.text);
    if (speaks && r.role === 'stated') stated.push(r);
    c.facets.forEach((f, i) => { if (facetMet(f, r, speaks)) facets[i].hits.push(r); else if (facetUnstated(f, r)) facets[i].unstated.push(r); });
    if (r.role === 'design' && speaks) design.set(r.id + '|' + r.kind, {r, facets: []});
    else if (r.role === 'design' && r.open && c.cues.test(r.open)) leftOpen.push(r);
  }
  facets.forEach(f => { for (const r of f.hits) if (r.role === 'design') { const k = r.id + '|' + r.kind; if (!design.has(k)) design.set(k, {r, facets: []}); design.get(k).facets.push(f.id); } });
  const met = facets.filter(f => f.hits.length), required = facets.filter(f => f.required), missing = required.filter(f => !f.hits.length);
  const records2 = [...design.values()].sort((a, b) => byRef(a.r, b.r)).map(x => ({...brief(x.r), facets: x.facets}));
  const asks = stated.sort(byRef).map(brief), open = leftOpen.filter(r => !design.has(r.id + '|' + r.kind)).sort(byRef).map(brief);
  const state = na ? 'not-applicable' : !records2.length ? 'not-addressed' : missing.length ? 'partly' : 'addressed';
  const labels = xs => joinAnd(xs.map(f => f.label));
  const refs = xs => { const shown = xs.slice(0, 4).map(x => x.ref); return joinAnd(xs.length > 4 ? [...shown, (xs.length - 4) + ' more'] : shown); };
  const one = records2.length === 1;
  const reason = state === 'not-applicable' ? `Marked not applicable: ${str(na.reason)}`
    : state === 'not-addressed' ? 'No design record addresses it yet.' + (open.length ? ` ${refs(open)} leave${open.length === 1 ? 's' : ''} it open.` : '') + (asks.length ? ` ${plural(asks.length, 'stated record asks', 'stated records ask')} for it: ${refs(asks)}.` : '')
    : state === 'partly' ? (met.length ? `It covers ${labels(met)}, not yet ${labels(missing)}. See ${refs(records2)}.` : `${refs(records2)} speak${one ? 's' : ''} of it but do${one ? 'es' : ''} not yet cover ${labels(missing)}.`)
    : `Addressed by ${plural(records2.length, 'design record')}: ${refs(records2)}.`;
  const questions = state === 'not-applicable' ? [] : [...(state === 'not-addressed' ? [c.lead] : []), ...missing.map(f => f.question), ...facets.filter(f => !f.required && !f.hits.length).map(f => f.question)].slice(0, LENS_LIMITS.questions);
  return {id: c.id, title: c.title, why: c.why, lead: c.lead, state, word: LENS_WORDS[state], reason,
    // A facet no record meets, that a record leaves not stated, reads 'not-stated' (round 12, GR-DOM-14), never met or unmet.
    facets: facets.map(f => ({id: f.id, label: f.label, required: f.required, met: f.hits.length > 0, state: f.hits.length ? 'met' : f.unstated.length ? 'not-stated' : 'unmet', records: f.hits.slice().sort(byRef).map(r => r.ref), ...(f.hits.length || !f.unstated.length ? {} : {unstated: f.unstated.slice().sort(byRef).map(r => r.ref)})})),
    rule: `Addressed when the design covers ${labels(required)}.${facets.some(f => !f.required) ? ' It also asks about ' + labels(facets.filter(f => !f.required)) + '.' : ''}`,
    records: records2, asks, open, questions, notApplicable: na ? {reason: str(na.reason), at: na.at || null, actor: na.actor || null} : null};
}
const EMPTY_COUNTS = {addressed: 0, partly: 0, 'not-addressed': 0, 'not-applicable': 0};
function readLens(p, lens, setting) {
  const records = lensRecords(p), concerns = lens.concerns.map(c => readConcern(c, records, setting));
  const counts = {...EMPTY_COUNTS}; for (const c of concerns) counts[c.state]++;
  const text = `${lens.title} · ${plural(concerns.length, 'concern')}: ${counts.addressed} addressed, ${counts.partly} partly, ${counts['not-addressed']} not addressed, ${counts['not-applicable']} not applicable.`;
  return {lens: {id: lens.id, version: lens.version, title: lens.title, ref: lens.ref, noun: lens.noun, summary: lens.summary}, concerns, counts: {...counts, total: concerns.length}, text, read: records.length};
}
// The reading of the lens the person chose, or a preview of one not chosen ({lensId}): the lens, its concerns with
// their state, records and questions, the counts and a summary line. Without a choice and without a preview it reads
// nothing and carries the suggestion. Worked out once per saved document. What a printer (the SDD) can rely on:
//   {lens: {id, version, title, ref, noun, summary} | null, chosen, setting: {chosenAt, chosenBy, reason} | null,
//    concerns: [{id, title, why, lead, state, word, reason, rule, questions: [text],
//      facets: [{id, label, required, met, records: [ref]}],
//      records: [{id, ref, title, kind, chapter, facets: [facet id]}]   (the design records that address it),
//      asks: [{id, ref, title, kind, chapter}]                         (the stated records that ask for it),
//      open: [{id, ref, title, kind, chapter}]                         (design records that only leave it open),
//      notApplicable: {reason, at, actor} | null}],
//    counts: {addressed, partly, 'not-addressed', 'not-applicable', total}, text, read, suggestion, rule}
// Every value is plain data in the lens's order and the records' reference order.
export function lensReport(p, {lensId = null} = {}) {
  return remember(p, 'domain-lens', lensId || '', () => {
    const setting = lensSetting(p), lens = lensById(lensId || setting?.lensId);
    if (!lens) return {lens: null, chosen: false, setting: null, concerns: [], counts: {...EMPTY_COUNTS, total: 0}, text: 'No domain lens is chosen for this project.', read: 0, suggestion: lensSuggestion(p), rule: LENS_RULE};
    const chosen = !!setting && setting.lensId === lens.id;
    return {...readLens(p, lens, chosen ? setting : null), chosen, setting: chosen ? {chosenAt: setting.chosenAt || null, chosenBy: setting.chosenBy || null, reason: str(setting.reason)} : null, suggestion: null, rule: LENS_RULE};
  });
}

// ---------------------------------------------------------------- what the other surfaces print

// Chapter 11's Validate passage "Domain lens · <domain>" (readiness-model.js): one item to confirm for each concern
// partly or not addressed, in the lens's order; null while no lens is chosen. It informs; it blocks nothing.
export function lensPassage(p) {
  if (!lensSetting(p)) return null;
  const R = lensReport(p);
  if (!R.chosen) return null;
  const items = R.concerns.filter(c => c.state === 'partly' || c.state === 'not-addressed').map(c => ({id: 'lens:' + R.lens.id + ':' + c.id, title: `${c.title} is ${c.word}`, detail: c.reason + (c.questions[0] ? ' Ask: ' + c.questions[0] : '')}));
  return {id: 'lens', ref: R.lens.ref, title: 'the concerns ' + R.lens.noun + ' must address', items, text: R.text};
}
// Chapter 11's companion: the counts and the first questions, for the lens the person chose; null without one.
export function lensCompanion(p, {questions = 3} = {}) {
  if (!lensSetting(p)) return null;
  const R = lensReport(p);
  if (!R.chosen) return null;
  const open = R.concerns.filter(c => c.state === 'not-addressed' || c.state === 'partly').sort((a, b) => (a.state === 'not-addressed' ? 0 : 1) - (b.state === 'not-addressed' ? 0 : 1));
  return {ref: R.lens.ref, title: R.lens.title, counts: R.counts, text: R.text, asks: open.slice(0, questions).map(c => ({id: c.id, concern: c.title, word: c.word, question: c.questions[0] || c.lead}))};
}

// ---------------------------------------------------------------- the governed commands

const reasonOf = raw => { const t = typeof raw?.reason === 'string' ? raw.reason.trim() : ''; if (!t) throw Error('Say why, in a sentence: the reason is kept with the choice.'); if (t.length > LENS_LIMITS.reason) throw Error(`Keep the reason within ${LENS_LIMITS.reason} characters.`); return t; };
// lens.choose {lensId, reason}: use a lens for this project. lens.clear {reason}: stop using it. lens.concern
// {concernId, applicable: false|true, reason}: mark a concern of the chosen lens not applicable, or applicable again.
// Each keeps the reason, who and when; nothing else in the project changes. The Worker's command route checks the
// role and the revision as for every command.
export function applyLensCommand(input, command, at = new Date().toISOString(), actor = null) {
  const type = command?.type, raw = command?.payload || {};
  if (!LENS_COMMANDS.includes(type)) throw Error('Unknown lens action.');
  if (typeof raw !== 'object' || Array.isArray(raw)) throw Error('The lens action payload must be an object.');
  const p = documentCopy(input), current = p.workspace?.domainLens && typeof p.workspace.domainLens === 'object' ? p.workspace.domainLens : null;
  const inUse = lensSetting(p), reason = reasonOf(raw), who = actor || null;
  const history = list(current?.history).slice(-(LENS_LIMITS.history - 1));
  let next;
  if (type === 'lens.choose') {
    const lens = lensById(raw.lensId);
    if (!lens) throw Error('Choose a lens this workbench offers.');
    if (inUse?.lensId === lens.id) throw Error('This lens is already in use for the project.');
    next = {lensId: lens.id, lensVersion: lens.version, chosenAt: at, chosenBy: who, reason, notApplicable: [], history: [...history, {at, actor: who, action: 'choose', lensId: lens.id, reason}]};
  } else if (type === 'lens.clear') {
    if (!inUse) throw Error('No lens is in use for this project.');
    next = {lensId: null, clearedAt: at, clearedBy: who, reason, notApplicable: [], history: [...history, {at, actor: who, action: 'clear', lensId: inUse.lensId, reason}]};
  } else {
    if (!inUse) throw Error('Choose a lens for the project first.');
    const lens = lensById(inUse.lensId), concern = lens.concerns.find(c => c.id === raw.concernId);
    if (!concern) throw Error('Choose a concern of the lens in use.');
    if (typeof raw.applicable !== 'boolean') throw Error('Say whether the concern applies, with true or false.');
    const marked = list(inUse.notApplicable).filter(x => x && lens.concerns.some(c => c.id === x.concernId));
    const was = marked.some(x => x.concernId === concern.id);
    if (!raw.applicable && was) throw Error('This concern is already marked not applicable.');
    if (raw.applicable && !was) throw Error('This concern already applies.');
    next = {...inUse, notApplicable: raw.applicable ? marked.filter(x => x.concernId !== concern.id) : [...marked, {concernId: concern.id, reason, at, actor: who}],
      history: [...history, {at, actor: who, action: raw.applicable ? 'applicable' : 'not-applicable', lensId: lens.id, concernId: concern.id, reason}]};
  }
  p.workspace = {...(p.workspace || {}), domainLens: next};
  return {document: p, selected: null};
}
