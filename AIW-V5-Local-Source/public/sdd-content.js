// The SDD's content standard (round 12, workstream C2; audit/round12/SDD-SPEC.md "Content standard"). The round's other
// suites check the shape of the architecture edition: sections, counts, sizes, pages, seconds. This reader judges its
// substance: whether a reader of sections 2, 3 and 4 finds a design, record by record, as the standard says a driver, a
// decision, a component, an integration and a data entity must read. It reads the document structure the edition gives
// (sdd-architecture.js architectureMarkdown: the Markdown in its own print format, which every other format derives
// from), so the same reading judges a document built here and an export read back from a file.
// The standard judges prose, never placeholders: an "open: …" marker is counted, not judged, and a section where one
// statement in five or more is open, or where most records were drafted by rules, is a skeleton that must say so
// (SKELETON_BANNER) instead of pretending. The prose that is stated is judged: a name that is a verb fragment ("Ensure",
// "Verify", "System s ability") or a slug ("customer-management-360-service-to-notif"), a description that is a count
// dump ("374 requirements: 287 delivered, 87 gaps. Mostly maintenance (161)"), bookkeeping in a design field ("AIW's
// default", "not a workbook value", "Drafted by Sol", "Open question:") and the structure the standard asks of each
// record. Pure and DOM-free: the builder, the Output screen, the suites and a reviewer's scratch run read it. Nothing
// here writes the document, changes a record or approves anything.
import {chapterTitle} from './chapter-names.js';

// ---------------------------------------------------------------- the standard
export const CONTENT_STANDARD = Object.freeze({
  // A section is a skeleton when this share of its statements or more is open, or this share of its records or more
  // was drafted by rules (provenance.draft.engine 'rules'), not by Sol or a person.
  openShare: 0.2, rulesShare: 0.5,
  // A driver's description and impact: one to three sentences; a component: at least three responsibility sentences;
  // a decision: at least two alternatives in all.
  sentences: Object.freeze({min: 1, max: 3}), responsibilitySentences: 3, alternatives: 2,
  sections: Object.freeze([2, 3, 4])
});
export const SKELETON_BANNER = 'This section is a skeleton; Sol has not drafted it';
// A section that falls short while most of its records are not the rules' (Sol drafted them with the model, or a person
// wrote them) says that instead: "Sol has not drafted it" would be untrue of it (round 23).
export const SHORT_BANNER = 'This section falls short of the content standard';
export const SECTION_TITLES = Object.freeze({2: chapterTitle(2), 3: 'Architecture decisions', 4: 'Architectural components, interfaces, properties and composition'});

// ---------------------------------------------------------------- words
const str = v => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const list = v => (Array.isArray(v) ? v : []);
// The Markdown escapes the edition writes (sdd-architecture.js md, mdCell), read back.
export const plain = v => str(v).replace(/\\([\\<>*`[\]|])/g, '$1').replace(/\s+/g, ' ');
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const count = n => Number(n).toLocaleString('en-GB');
const plural = (n, one, many = one + 's') => count(n) + ' ' + (n === 1 ? one : many);
const andList = xs => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1) : xs.join(''));
const isAre = n => (n === 1 ? 'is' : 'are');
// The sentences of a text: split at a full stop, question or exclamation mark followed by space or the end, abbreviations
// and decimals kept whole; a sentence has two words at least.
export function sentencesOf(text) {
  const t = plain(text).replace(/\b(?:e\.g|i\.e|etc|vs|approx|cf|no|fig|ref|incl)\./gi, m => m.replace('.', '\u0000')).replace(/(\d)\.(\d)/g, '$1\u0000$2');
  return t.split(/[.!?…]+(?:\s+|$)/).map(s => s.replace(/\u0000/g, '.').trim()).filter(s => s.split(/\s+/).filter(Boolean).length >= 2);
}
// An "open: …" marker as the edition prints it: "open: <label> not stated" (no question asked), "open: <question>?" (a
// question asked), "Open: no alternative is chosen yet", or a bare "open" after the first time.
const OPEN_MARKER = /^open(?::|\b)/i;
export const isOpenMarker = v => OPEN_MARKER.test(str(v));
export const markerQuestion = v => { const m = /^open:\s*(.+?\?)/i.exec(str(v)); return m ? m[1] : ''; };

// ---------------------------------------------------------------- the edition's format (round 24, D-24-06)
// Format 1 (every edition before round 24, and every baseline frozen then) prints each statement in place, an open one as
// its "open: …" marker. Format 2 carries "<!-- aiw:sdd-format 2 -->" after its cover and prints only what is stated: a
// statement a record leaves open is absent from the record and named once in its section's "Open questions" list. So
// that the list can stay short (LIST_MAX lines) and the reading stay exact, a format-2 record also carries a marker the
// renderers skip, "<!-- aiw:open description impact? -->": the statements it leaves open, "?" where format 1's marker
// asked a question. The reader counts the same statements in both formats: one a format-2 record leaves out is open,
// with or without its marker, so nothing a record leaves open is hidden from the reading.
export const SDD_FORMAT = 2;
export const formatMarker = (n = SDD_FORMAT) => '<!-- aiw:sdd-format ' + n + ' -->';
export const sddFormatOf = markdown => { const m = /^<!-- aiw:sdd-format (\d+) -->$/m.exec(String(markdown ?? '')); return m ? Number(m[1]) : 1; };
export const openMarkerLine = fields => '<!-- aiw:open ' + fields.join(' ') + ' -->';
const OPEN_LINE = /^<!-- aiw:open ([A-Za-z]+\??(?: [A-Za-z]+\??)*) -->$/;
const openOf = line => { const m = OPEN_LINE.exec(line); return m ? new Map(m[1].split(' ').map(t => [t.replace(/\?$/, ''), {asked: t.endsWith('?')}])) : null; };
// Whether a question is asked of a record's open field: as the record's marker says (format 2), else as the "open: …"
// marker printed in its place asks one (format 1).
const askedOf = (r, field) => { const o = r.open?.get(field), v = r[field]; return o ? o.asked : !!(v && markerQuestion(v)); };

// ---------------------------------------------------------------- the checks on stated prose
// Verb fragments: a name that is a verb or an auxiliary, or a possessive torn apart ("System s ability"), is no noun.
const AUXILIARIES = new Set('shall must should will would can could may might be is are was were been being am has have had do does did to that which who whom whose what if when where while than then there here'.split(' '));
const IMPERATIVES = new Set('ensure verify provide allow enable permit let make give take get set use maintain validate generate perform calculate compute notify send inform remind manage handle include require define configure submit retrieve display show print create delete remove add edit amend modify update cancel suspend reactivate renew approve reject confirm check process record store capture export import search monitor alert track trace log hold save receive transmit exchange integrate interface post reverse settle reconcile book debit credit transfer pay run schedule restrict grant revoke authenticate block lock unlock limit support keep prevent avoid determine identify assign apply enter select view list produce offer'.split(' '));
// Words that are nouns as often as verbs, so a name that starts or ends with one is not a fragment on that account.
const NOUNS_TOO = new Set('report record check deposit display update review search export import alert transfer request process payment post charge credit debit limit log hold run schedule print view exchange interface order change release return claim offer trade support balance statement account control access grant block lock'.split(' '));
const FUNCTION_WORDS = new Set('to of for and or with by a an the in on at from into via per'.split(' '));
const COMPOUND_TAIL = /(?:ing|ion|ment|ance|ence|ure|age|ity)$/;
// '' when the name reads as a noun phrase; else why it does not.
export function nounNameCheck(name) {
  const t = plain(name).toLowerCase();
  if (!t || t.replace(/[^a-z]/g, '').length < 3) return 'too short to be a name';
  const words = t.replace(/[^a-z0-9-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.some(w => w === 's' || w === 't')) return 'a possessive torn apart ("s ability")';
  if (words.length > 1 && FUNCTION_WORDS.has(words.at(-1))) return 'ends in a function word';
  if (AUXILIARIES.has(words[0])) return 'starts with an auxiliary verb';
  if (/\b(?:ability|able|capability|need|needs|possibility)\s+to\b/.test(t)) return 'a fragment of a statement ("ability to …")';
  if (words.length === 1) return IMPERATIVES.has(words[0]) && !NOUNS_TOO.has(words[0]) ? 'a verb, not a noun' : '';
  if (IMPERATIVES.has(words[0]) && !NOUNS_TOO.has(words[0]) && !COMPOUND_TAIL.test(words[1])) return 'an imperative verb phrase, not a noun phrase';
  if (words.length > 2 && AUXILIARIES.has(words[1]) && !FUNCTION_WORDS.has(words[1])) return 'a clause, not a noun phrase';
  return '';
}
// A slug: three or more lower-case tokens joined by hyphens and nothing else, a name cut on a hyphen, or "a-to-b".
export function slugCheck(name) {
  const t = plain(name);
  if (!t) return '';
  if (/^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(t)) return 'a slug, not words';
  if (/-$/.test(t)) return 'cut on a hyphen';
  if (/^[a-z0-9-]+-to-[a-z0-9-]+$/.test(t)) return 'a slug ("a-to-b"), not words';
  return '';
}
// A count dump: a description that counts requirements instead of describing anything.
const COUNT_DUMPS = [
  [/^(?:[^.:]{0,80}:\s*)?\d[\d,]*\s+requirements?\b/i, 'starts with a requirement count'],
  [/\b\d[\d,]*\s+(?:delivered|gaps?|partly delivered|not delivered)\b/i, 'counts delivery'],
  [/\bmostly\s+[a-z][a-z ,-]*\(\d/i, 'lists kinds of work with counts'],
  [/\b\d[\d,]*\s+requirements?\s+(?:speak of it|names?|states?|asks?)\b/i, 'counts the requirements that name it']
];
export function countDumpCheck(text) {
  const t = plain(text);
  for (const [re, why] of COUNT_DUMPS) { const m = re.exec(t); if (m) return why + ' ("' + m[0].slice(0, 60) + '")'; }
  return '';
}
// Bookkeeping in a design field: provenance, defaults and open-question words, which belong in the provenance fields
// and in Appendix E, never in a description, an impact, a purpose, a rationale or a statement.
export const BOOKKEEPING = Object.freeze([
  [/AIW[’']s default/i, "AIW's default"], [/\bnot a workbook value\b/i, 'not a workbook value'], [/\bdefault priority\b/i, 'default priority'],
  [/\bthe workbook ranks\b/i, 'the workbook ranks'], [/\bDrafted by Sol\b/i, 'Drafted by Sol'], [/\bdrafted by (?:AIW[’']s )?(?:the )?(?:journey )?rules\b/i, 'drafted by the rules'],
  [/\bOpen question:/i, 'Open question:'], [/\bnot reviewed by a person\b/i, 'not reviewed by a person'], [/\bproposed by AIW\b/i, 'proposed by AIW'],
  [/\bNot stated in the brief or the upstream records\b/i, 'Not stated in the brief or the upstream records'], [/\bthe source[’']s own headings?\b/i, "the source's own heading"],
  [/\bThe SA Playbook marks it\b/i, 'The SA Playbook marks it'], [/^The SA Playbook[’']s .+ (?:style|pattern|tactic|design decision)\.?$/i, 'names only its source'],
  [/\brequirements? speak of it\b/i, 'requirements speak of it'], [/\ba person compares them and decides\b/i, 'a person compares them and decides']
]);
export function bookkeepingCheck(text) {
  const t = plain(text);
  for (const [re, phrase] of BOOKKEEPING) if (re.test(t)) return phrase;
  return '';
}
// The faults of one stated design text: bookkeeping, a count dump, and (when asked) the sentence count.
function proseFaults(text, {sentences = true} = {}) {
  const out = [], b = bookkeepingCheck(text), c = countDumpCheck(text);
  if (b) out.push({level: 'fault', check: 'bookkeeping', detail: 'bookkeeping in a design field: "' + b + '"'});
  if (c) out.push({level: 'fault', check: 'count-dump', detail: 'a count dump, not a description: ' + c});
  if (sentences) {
    const n = sentencesOf(text).length;
    if (!n) out.push({level: 'fault', check: 'sentence', detail: 'not a sentence: "' + plain(text).slice(0, 60) + '"'});
    else if (n > CONTENT_STANDARD.sentences.max) out.push({level: 'gap', check: 'length', detail: n + ' sentences, where one to three are asked'});
  }
  return out;
}
const nameFaults = (name, {noun = true} = {}) => {
  const out = [], s = slugCheck(name), n = noun ? nounNameCheck(name) : '';
  if (s) out.push({level: 'fault', check: 'slug', detail: 'the name "' + plain(name) + '" is ' + s});
  else if (n) out.push({level: 'fault', check: 'verb-fragment', detail: 'the name "' + plain(name) + '" is ' + n});
  return out;
};

// ---------------------------------------------------------------- the records a drafter marked
// Which engine drafted a record (architecture-drafter.js markDrafted): 'rules' for the rule-based drafter, 'model-assisted'
// where Sol reworded it with the model, '' for anything a person or an import wrote or an older draft that says nothing.
export const draftEngine = r => str(r?.provenance?.draft?.engine);
export function rulesShareOf(records) {
  const xs = list(records).filter(r => r && typeof r === 'object' && r.state !== 'retired');
  const rules = xs.filter(r => draftEngine(r) === 'rules').length;
  return {records: xs.length, rules, share: xs.length ? rules / xs.length : 0};
}

// ---------------------------------------------------------------- the edition, read back
const lineIs = (line, label) => (line.startsWith(label) ? plain(line.slice(label.length)) : null);
// The lines of a top-level section ("# 2. …") up to the next one.
function sectionLines(lines, n) {
  const start = lines.findIndex(l => new RegExp('^# ' + n + '\\. ').test(l));
  if (start < 0) return null;
  let end = start + 1; while (end < lines.length && !/^# /.test(lines[end])) end++;
  return lines.slice(start, end);
}
const bannerOf = xs => (xs.some(l => l.includes(SKELETON_BANNER)) ? 'rules' : xs.some(l => l.includes(SHORT_BANNER)) ? 'short' : '');
// Section 2: each driver under "**CODE: Title**" with its Description, Impact, Priority, Scenario and Target lines. In
// format 2 a quality driver (code QD…) has a scenario and a target whether it prints them or not, as format 1 always
// printed them; one it leaves out is open.
function readDrivers(xs, format = 1) {
  const drivers = []; let d = null;
  for (const line of xs) {
    if (line === '## Summary table') break;
    const head = /^\*\*([A-Z]{1,2}\d+): (.+)\*\*$/.exec(line);
    if (head) { d = {ref: head[1], title: plain(head[2]), description: null, impact: null, priority: null, scenario: null, target: null}; drivers.push(d); continue; }
    if (!d) continue;
    let v;
    if (format >= 2 && (v = openOf(line))) d.open = v;
    else if ((v = lineIs(line, 'Description: ')) !== null) d.description = v;
    else if ((v = lineIs(line, 'Impact on the architecture: ')) !== null) d.impact = v;
    else if ((v = lineIs(line, 'Priority: ')) !== null) d.priority = v;
    else if ((v = lineIs(line, 'Scenario: ')) !== null) d.scenario = v;
    else if ((v = lineIs(line, 'Target: ')) !== null) d.target = v;
  }
  if (format >= 2) for (const x of drivers) if (/^QD\d+$/.test(x.ref)) { const o = x.open || (x.open = new Map()); for (const f of ['scenario', 'target']) if (x[f] === null && !o.has(f)) o.set(f, {asked: false}); }
  return drivers;
}
// Section 3: each decision under "### ADR-nnn · Question" with its Decision, Justification (and the driver bullets after
// it), Alternatives considered (bullets) and Impact.
// The marks the export puts on an assessment no person has reviewed (sdd-architecture.js SOL_ASSESSED and, round 25,
// RULES_ASSESSED): provenance, not the reason's prose.
const SOL_ASSESSED_MARK = /\s*\(Sol[’']s assessment, not reviewed by a person\)\s*$/, RULES_ASSESSED_MARK = /\s*\(drafted by AIW[’']s rules from the SA Playbook, not reviewed by a person\)\s*$/;
// AIW's reading of an alternative not chosen that no person gave a reason for (round 25, D-25-07), last on its line: the
// reader keeps it apart and never reads it as the reason, so the alternative's why stays open.
const AIW_READING = ' AIW’s reading: ';
// In format 2 a decision whose justification is not stated lists its drivers' effects under "**By driver**:", and any
// other bold label ends a list.
function readDecisions(xs, format = 1) {
  const decisions = []; let d = null, bullets = '';
  for (const line of xs) {
    if (line === '## Trade-off analysis') break;
    const head = /^### ([A-Z]+-\d+) · (.+)$/.exec(line);
    if (head) { d = {ref: head[1], question: plain(head[2]), decision: null, chosen: null, considered: [], justification: null, drivers: [], alternatives: [], impact: null}; decisions.push(d); bullets = ''; continue; }
    if (!d) continue;
    let v;
    if (format >= 2 && (v = openOf(line))) { d.open = v; continue; }
    if (format >= 2 && line === '**By driver**:') { bullets = 'drivers'; continue; }
    if (format >= 2 && /^\*\*[^*]+\*\*:/.test(line) && !/^\*\*(?:Decision|Justification|Alternatives considered|Impact)\*\*:/.test(line)) { bullets = ''; continue; }
    if ((v = lineIs(line, '**Decision**: ')) !== null) {
      d.decision = v; bullets = '';
      if (!isOpenMarker(v)) { const m = /^([A-Z]+-\d+) · ([^:(]+)/.exec(v); d.chosen = m ? {ref: m[1], title: m[2].trim()} : {ref: '', title: v}; }
      else {
        // Each alternative once: the drivers' lean (round 25) names one of those under consideration again, as Sol's
        // preference does.
        d.considered = [...new Set([...v.matchAll(/\b([A-Z]+-\d+) · /g)].map(m => m[1]))];
        // Sol's preferred alternative, proposed and not accepted (sdd-architecture.js decisionText): the decision is
        // proposed, not chosen (round 23: the reader had read it as open).
        const pref = /\bPreferred: ([A-Z]+-\d+) · (.+?), proposed by Sol\b/.exec(v);
        if (pref) d.proposed = {ref: pref[1], title: plain(pref[2])};
      }
    } else if ((v = lineIs(line, '**Justification**: ')) !== null) { d.justification = v; bullets = 'drivers'; }
    else if (line === '**Alternatives considered**:') bullets = 'alternatives';
    else if ((v = lineIs(line, '**Impact**: ')) !== null) { d.impact = v; bullets = ''; }
    else if (/^\*\*[A-Z][a-z]+\*\*: /.test(line) || /^Open: /.test(line)) bullets = '';
    else if (line.startsWith('- ') && bullets === 'drivers') {
      const t = plain(line.slice(2)), code = /\(([A-Z]{1,2}\d+)\)/.exec(t), dash = t.indexOf(' — ');
      // The export marks an assessment Sol made, or AIW's rules drafted: provenance, not the reason's prose.
      const reason = dash >= 0 ? t.slice(dash + 3).trim() : '', sol = SOL_ASSESSED_MARK.test(reason), rules = RULES_ASSESSED_MARK.test(reason);
      d.drivers.push({code: code ? code[1] : '', effect: dash >= 0 ? t.slice(0, dash) : t, reason: reason.replace(SOL_ASSESSED_MARK, '').replace(RULES_ASSESSED_MARK, '').trim(), sol, rules, pending: /weighed once an alternative is chosen/.test(t), unknown: /needs evidence/.test(t)});
    } else if (line.startsWith('- ') && bullets === 'alternatives') {
      const whole = plain(line.slice(2)), at = whole.lastIndexOf(AIW_READING), t = at < 0 ? whole : whole.slice(0, at), m = /^([A-Z]+-\d+) · ([^:]+)(?::\s*(.*))?$/.exec(t);
      if (!m) continue;
      const rest = m[3] || '', not = / Not chosen: (.+)$/.exec(' ' + rest), costs = / Costs: (.+)$/.exec(' ' + rest);
      d.alternatives.push({ref: m[1], title: m[2].trim(), summary: rest.replace(/ ?(?:Not chosen|Costs): .*$/, '').trim(), why: not ? not[1].trim() : '', costs: costs ? costs[1].trim() : '', reading: at < 0 ? '' : whole.slice(at + AIW_READING.length).trim()});
    }
  }
  return decisions;
}
// Section 4: the components (the high-level description with the kind, the specification table's solution, the detail's
// interfaces, data model and quality properties) and the external integrations with their fields. Round 24 (D-24-03):
// format 2 prints the section of a project with modules by module, told by its "## Module overview" part: the same lines
// for each component and integration, a component's high-level line and detail (a level-4 heading) under its module and
// the specification table after the overview, an integration under its module (level 4) or in the shared part (level 3).
// The reader reads the same records from either layout.
const INTEGRATION_FIELDS = [['purpose', 'Purpose: '], ['dataFormats', 'Data formats: '], ['protocols', 'Protocols: '], ['securityConsiderations', 'Security considerations: '], ['challenges', 'Challenges: '], ['facilitation', 'How the architecture handles it: ']];
// A component's line in the high-level description. Format 1: "**N. REF · Title** (kind): purpose Responsibilities: …
// Drivers: …." Format 2 prints the kind, the purpose and each part only when stated ("**N. REF · Title**." when none is),
// a component that only supports responsibilities says so under "Supported responsibilities: ", and its drivers are the
// drivers it serves with their reasons ("Serves: FD1 Title, because …", round 24, D-24-05), else how many reach it
// ("Drivers: 4 reach it through …"): either reads as its drivers stated, as format 1's list of them does.
const HIGH_LEVEL = /^\*\*\d+\. ([A-Z]+-\d+) · (.+?)\*\*(?: \(([^)]+)\))?: (.*)$/, HIGH_LEVEL_2 = /^\*\*\d+\. ([A-Z]+-\d+) · (.+?)\*\*(?: \(([^)]+)\))?(?:: (.*)|\.)$/;
function highLevelParts(rest) {
  const at = label => (rest.startsWith(label) ? 0 : (i => (i < 0 ? -1 : i + 1))(label === 'Drivers: ' ? rest.lastIndexOf(' ' + label) : rest.indexOf(' ' + label)));
  // The drivers served come last, after the responsibilities; their reasons are the record's words, so no label is
  // looked for inside them.
  const ri = at('Responsibilities: '), si = at('Supported responsibilities: '), from = Math.max(ri, si, 0);
  const vi = rest.startsWith('Serves: ') ? 0 : (i => (i < 0 ? -1 : i + 1))(rest.indexOf(' Serves: ', from)), di = vi >= 0 ? -1 : at('Drivers: '), ends = [ri, si, vi, di].filter(i => i >= 0);
  const upTo = i => { const next = ends.filter(j => j > i); return next.length ? Math.min(...next) : undefined; };
  return {purpose: plain(rest.slice(0, ends.length ? Math.min(...ends) : undefined)), responsibilities: ri >= 0 ? plain(rest.slice(ri + 18, upTo(ri))).replace(/\.$/, '') : '', drivers: vi >= 0 ? plain(rest.slice(vi + 8)).replace(/\.$/, '') : di >= 0 ? plain(rest.slice(di + 9)).replace(/\.$/, '') : ''};
}
// A line of a component's detail, and of an integration, in either layout.
function detailLine(c, line, format) {
  let v;
  if (format >= 2 && (v = openOf(line))) c.open = v;
  else if ((v = lineIs(line, 'Interfaces: ')) !== null) {
    for (const item of v.replace(/\.$/, '').split('; ')) { const m = /^(?:provides |uses )?([A-Z]+-\d+)(?: ([^(].*?))?(?: \([^)]*\))?$/.exec(item.trim()); if (m && m[2] && !/^(?:provides no contract yet)/.test(item)) c.operations.push({ref: m[1], name: m[2].trim()}); }
  } else if ((v = lineIs(line, 'Data model: ')) !== null) {
    for (const item of v.replace(/\.$/, '').split('; ')) { const m = /^(?:owns |consumes |produces )?([A-Z]+-\d+) (.+?)(?: \(key [^)]*\))?$/.exec(item.trim()); if (m) c.entities.push({ref: m[1], name: m[2].trim()}); }
  } else if ((v = lineIs(line, 'Quality properties: ')) !== null) c.properties = /^none recorded/i.test(v) ? '' : v;
}
function integrationLine(x, line, format) {
  const o = format >= 2 ? openOf(line) : null;
  if (o) { x.open = o; return; }
  for (const [f, label] of INTEGRATION_FIELDS) { const v = lineIs(line, label); if (v !== null) { x[f] = v.replace(/ \(read from (?:its contracts|AIW’s proposed contracts, not decided)\)$/, ''); break; } }
}
function readComponents(xs, format = 1) {
  const components = new Map(), integrations = [], comp = ref => { let c = components.get(ref); if (!c) components.set(ref, c = {ref, title: '', kind: null, purpose: '', responsibilities: '', drivers: '', solution: null, operations: [], entities: [], properties: null}); return c; };
  const solutionOf = (ref, rest) => { const cells = ('| ' + ref + ' · ' + rest).split(/(?<!\\)\|/).slice(1, -1).map(s => plain(s)); if (cells.length >= 8) comp(ref).solution = cells[6]; };
  let part = '', c = null, x = null;
  if (format >= 2 && xs.includes('## Module overview')) {
    // By module: a heading ends the record before it; a level-3 or level-4 "N. REF · Title" is an integration, a level-4
    // "REF · Title" a component's detail (a module is a level-3 heading, its parts level 4).
    for (const line of xs) {
      const h = /^(#{2,6}) (.+)$/.exec(line);
      if (h) {
        c = null; x = null;
        const integration = h[1].length >= 3 && /^\d+\. ([A-Z]+-\d+) · (.+)$/.exec(h[2]), detail = h[1].length === 4 && /^([A-Z]+-\d+) · (.+)$/.exec(h[2]);
        if (integration) { x = {ref: integration[1], title: plain(integration[2])}; integrations.push(x); }
        else if (detail) { c = comp(detail[1]); if (!c.title) c.title = plain(detail[2]); }
        continue;
      }
      const m = HIGH_LEVEL_2.exec(line), row = !m && /^\| ([A-Z]+-\d+) · (.*)$/.exec(line);
      if (m) { const k = comp(m[1]); k.title = plain(m[2]); k.kind = m[3] ? plain(m[3]) : null; Object.assign(k, highLevelParts(m[4] || '')); }
      else if (row) solutionOf(row[1], row[2]);
      else if (c) detailLine(c, line, format);
      else if (x) integrationLine(x, line, format);
    }
    return {components: [...components.values()], integrations};
  }
  for (const line of xs) {
    if (line.startsWith('## ')) { part = line.slice(3); c = null; x = null; continue; }
    if (part === 'High-level component description') {
      const m = (format >= 2 ? HIGH_LEVEL_2 : HIGH_LEVEL).exec(line);
      if (!m) continue;
      const k = comp(m[1]); k.title = plain(m[2]); k.kind = m[3] ? plain(m[3]) : null;
      if (format >= 2) { Object.assign(k, highLevelParts(m[4] || '')); continue; }
      const rest = m[4], ri = rest.indexOf('Responsibilities: '), di = rest.lastIndexOf(' Drivers: ');
      k.purpose = plain(ri >= 0 ? rest.slice(0, ri) : rest);
      k.responsibilities = ri >= 0 ? plain(rest.slice(ri + 18, di > ri ? di : undefined)).replace(/\.$/, '') : '';
      k.drivers = di >= 0 ? plain(rest.slice(di + 10)).replace(/\.$/, '') : '';
    } else if (part === 'Component specification table') {
      const m = /^\| ([A-Z]+-\d+) · (.*)$/.exec(line);
      if (m) solutionOf(m[1], m[2]);
    } else if (part === 'Component detail') {
      const head = /^### ([A-Z]+-\d+) · (.+)$/.exec(line);
      if (head) { c = comp(head[1]); if (!c.title) c.title = plain(head[2]); continue; }
      if (c) detailLine(c, line, format);
    } else if (part === 'External integrations') {
      const head = /^### \d+\. ([A-Z]+-\d+) · (.+)$/.exec(line);
      if (head) { x = {ref: head[1], title: plain(head[2])}; integrations.push(x); continue; }
      if (x) integrationLine(x, line, format);
    }
  }
  return {components: [...components.values()], integrations};
}
// The structure of an architecture edition: its sections 2, 3 and 4 as records, read from the Markdown it prints, in the
// format its marker names (format 1 without one); `format` reads sections given without their front matter.
export function parseArchitectureEdition(markdown, {format = null} = {}) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n'), s2 = sectionLines(lines, 2), s3 = sectionLines(lines, 3), s4 = sectionLines(lines, 4), f = format || sddFormatOf(markdown);
  const four = s4 ? readComponents(s4, f) : {components: [], integrations: []};
  return {format: f, present: {2: !!s2, 3: !!s3, 4: !!s4}, banners: {2: s2 ? bannerOf(s2) : '', 3: s3 ? bannerOf(s3) : '', 4: s4 ? bannerOf(s4) : ''}, drivers: s2 ? readDrivers(s2, f) : [], decisions: s3 ? readDecisions(s3, f) : [], ...four};
}

// ---------------------------------------------------------------- the reading, record by record
// A statement the section prints for a record's field: stated, or open (a marker, with or without its question).
const statement = (S, ref, field, value, {open = null, marker = true} = {}) => { const isOpen = open ?? (value == null || (marker && isOpenMarker(value))); S.push({ref, field, open: isOpen, question: isOpen && marker && value ? markerQuestion(value) : ''}); return !isOpen; };
const finding = (section, kind, ref, title, field, f) => ({section, kind, ref, title, field, level: f.level, check: f.check, detail: f.detail});
const gap = (check, detail) => ({level: 'gap', check, detail});
function driverReading(d) {
  const S = [], F = [], add = (field, f) => F.push(...[].concat(f).map(x => finding(2, 'driver', d.ref, d.title, field, x)));
  add('title', nameFaults(d.title, {noun: false}));
  // Format 2 (D-24-06): a statement the record's marker names is open, as its "open: …" marker read in format 1.
  const marked = f => (d.open?.has(f) ? {open: true} : {});
  for (const [field, label] of [['description', 'description'], ['impact', 'impact on the architecture']]) {
    const v = d[field];
    if (statement(S, d.ref, field, v, marked(field))) add(field, proseFaults(v));
    else add(field, gap('not-stated', label + ' not stated' + (askedOf(d, field) ? ', with the question asked' : ' and no question asked')));
  }
  if (statement(S, d.ref, 'priority', d.priority, marked('priority'))) {
    const m = /^(High|Medium|Low)\b(?:, because (.+?))?(?:\s*\((source band|person|rule)\))?\.?$/.exec(d.priority || '');
    if (!m) add('priority', gap('priority', 'the priority does not read as High, Medium or Low with its basis: "' + plain(d.priority).slice(0, 60) + '"'));
    else if (!m[2] && !m[3]) add('priority', gap('priority-basis', 'the priority states no basis'));
    else if (m[2]) { const b = bookkeepingCheck(m[2]); if (b) add('priority', {level: 'fault', check: 'bookkeeping', detail: 'bookkeeping as the priority\'s basis: "' + b + '"'}); }
  } else add('priority', gap('not-stated', 'priority not stated'));
  if (d.scenario !== null || d.open?.has('scenario')) { if (!statement(S, d.ref, 'scenario', d.scenario, {open: !!d.open?.has('scenario') || /open: /.test(d.scenario)})) add('scenario', gap('not-stated', 'the scenario is not stated whole')); }
  if (d.target !== null || d.open?.has('target')) { if (!statement(S, d.ref, 'target', d.target, marked('target'))) add('target', gap('not-stated', 'target not stated')); }
  return {statements: S, findings: F};
}
function decisionReading(d) {
  const S = [], F = [], add = (field, f) => F.push(...[].concat(f).map(x => finding(3, 'decision', d.ref, d.question, field, x)));
  add('question', nameFaults(d.question, {noun: false}));
  // A decision is stated when a person chose an alternative or Sol proposed one; why each other alternative was not
  // preferred is asked only of a choice.
  const decided = !!d.chosen, chosen = statement(S, d.ref, 'decision', d.decision, !decided && d.proposed ? {open: false} : {});
  const alts = d.alternatives.length + (decided ? 1 : 0);
  if (!chosen) add('decision', gap('open-decision', 'no alternative is chosen or proposed' + (d.considered.length ? ' (' + plural(d.considered.length, 'alternative') + ' under consideration)' : '')));
  if (alts < CONTENT_STANDARD.alternatives) add('alternatives', gap('alternatives', plural(alts, 'alternative') + ' in all, where at least ' + CONTENT_STANDARD.alternatives + ' are asked'));
  const marked = f => (d.open?.has(f) ? {open: true} : {});
  if (statement(S, d.ref, 'justification', d.justification, marked('justification'))) {
    add('justification', proseFaults(d.justification, {sentences: false}));
    if (chosen && !d.drivers.some(x => x.code) && !/\b[A-Z]{1,2}\d+\b/.test(d.justification)) add('justification', gap('drivers', 'the justification names no driver code'));
  } else add('justification', gap('not-stated', 'justification not stated' + (askedOf(d, 'justification') ? ', with the question asked' : ' and no question asked')));
  if (chosen) {
    for (const x of d.drivers) {
      if (statement(S, d.ref, 'driver:' + x.code, x.reason, {open: !x.reason || x.unknown, marker: false})) add('driver:' + x.code, proseFaults(x.reason, {sentences: false}));
      else add('driver:' + x.code, gap('driver-reason', 'no reason is given for ' + (x.code || 'a driver')));
    }
    for (const a of d.alternatives) {
      add('alternative:' + a.ref, nameFaults(a.title, {noun: false}));
      if (a.summary) add('alternative:' + a.ref, proseFaults(a.summary, {sentences: false}));
      if (!decided) continue;
      if (statement(S, d.ref, 'alternative:' + a.ref, a.why, {open: !a.why || isOpenMarker(a.why), marker: false})) add('alternative:' + a.ref, proseFaults(a.why, {sentences: false}));
      else add('alternative:' + a.ref, gap('why-not', a.ref + ' says not why it was not preferred'));
    }
  } else for (const a of d.alternatives) { add('alternative:' + a.ref, nameFaults(a.title, {noun: false})); if (a.summary) add('alternative:' + a.ref, proseFaults(a.summary, {sentences: false})); }
  if (statement(S, d.ref, 'impact', d.impact, marked('impact'))) add('impact', proseFaults(d.impact, {sentences: false}));
  else add('impact', gap('not-stated', 'impact not stated' + (askedOf(d, 'impact') ? ', with the question asked' : ' and no question asked')));
  return {statements: S, findings: F};
}
function componentReading(c) {
  const S = [], F = [], add = (field, f) => F.push(...[].concat(f).map(x => finding(4, 'component', c.ref, c.title, field, x)));
  add('title', nameFaults(c.title));
  const realised = c.responsibilities && !/^none realised yet/.test(c.responsibilities);
  // A named allocation, a quality property and an architectural solution explain other parts of the design;
  // they are not sentences about what this component is responsible for. Count only its actual prose here.
  const sentences = sentencesOf(c.purpose).length;
  if (statement(S, c.ref, 'responsibilities', c.purpose || c.responsibilities, {open: !c.purpose && !realised, marker: false})) { if (c.purpose) add('responsibilities', proseFaults(c.purpose, {sentences: false})); }
  if (sentences < CONTENT_STANDARD.responsibilitySentences) add('responsibilities', gap('responsibilities', plural(sentences, 'responsibility sentence') + ', where at least ' + CONTENT_STANDARD.responsibilitySentences + ' are asked'));
  if (!statement(S, c.ref, 'drivers', c.drivers, {open: !c.drivers || /^none reaches it/.test(c.drivers), marker: false})) add('drivers', gap('drivers', 'no driver reaches it'));
  // Format 2 prints no kind that is not stated; the record's marker names it, as format 1's "(kind not stated)" did.
  const kind = c.kind ?? (c.open?.has('kind') ? 'kind not stated' : null);
  if (!statement(S, c.ref, 'kind', kind, {open: !kind || /not stated/.test(kind), marker: false})) add('kind', gap('kind', kind ? 'kind not stated' : 'kind not printed'));
  if (c.solution !== null) { if (statement(S, c.ref, 'solution', c.solution === '—' ? 'open' : c.solution)) add('solution', proseFaults(c.solution, {sentences: false})); }
  for (const o of c.operations) add('operation:' + o.ref, nameFaults(o.name, {noun: false}));
  return {statements: S, findings: F};
}
function integrationReading(x) {
  const S = [], F = [], add = (field, f) => F.push(...[].concat(f).map(y => finding(4, 'external party', x.ref, x.title, field, y)));
  add('title', nameFaults(x.title));
  for (const [f] of INTEGRATION_FIELDS) {
    const v = x[f];
    if (statement(S, x.ref, f, v, x.open?.has(f) ? {open: true} : {})) add(f, proseFaults(v, {sentences: false}));
    else if (['purpose', 'dataFormats', 'protocols', 'securityConsiderations'].includes(f) && !askedOf(x, f)) add(f, gap('not-stated', f.replace(/([A-Z])/g, ' $1').toLowerCase() + ' not stated and no question asked'));
  }
  return {statements: S, findings: F};
}
function entityReading(e) {
  return {statements: [], findings: nameFaults(e.name).map(f => finding(4, 'data definition', e.ref, e.name, 'name', f))};
}

// ---------------------------------------------------------------- the sections and the document
function sectionReading(n, D, records) {
  const items = n === 2 ? D.drivers.map(d => ['driver', d.ref, driverReading(d)]) : n === 3 ? D.decisions.map(d => ['decision', d.ref, decisionReading(d)]) : [
    ...D.components.map(c => ['component', c.ref, componentReading(c)]),
    ...D.integrations.map(x => ['external party', x.ref, integrationReading(x)]),
    ...[...new Map(D.components.flatMap(c => c.entities).map(e => [e.ref, e])).values()].map(e => ['data definition', e.ref, entityReading(e)])
  ];
  const statements = items.flatMap(([, , r]) => r.statements), findings = items.flatMap(([, , r]) => r.findings), open = statements.filter(s => s.open).length;
  const R = rulesShareOf(records), openShare = statements.length ? open / statements.length : 0;
  const reasons = [];
  if (statements.length && openShare >= CONTENT_STANDARD.openShare) reasons.push(count(open) + ' of ' + plural(statements.length, 'statement') + ' ' + isAre(open) + ' open (' + pct(open, statements.length) + ' %)');
  if (R.records && R.share >= CONTENT_STANDARD.rulesShare) reasons.push(count(R.rules) + ' of ' + plural(R.records, 'record') + ' ' + (R.rules === 1 ? 'was' : 'were') + ' drafted by rules, not by Sol');
  // A file reread has no project records to count rules provenance. Respect the explicit in-place skeleton banner
  // exported with that file, even if a section happens to contain enough populated fields to meet density alone.
  if (D.banners[n]) reasons.push(D.banners[n] === 'short' ? 'the exported section is marked as short of the content standard' : 'the exported section is marked as a rules skeleton');
  const skeleton = reasons.length > 0, faults = findings.filter(f => f.level === 'fault');
  const met = skeleton ? 0 : items.filter(([, , r]) => !r.findings.length).length;
  return {n, title: SECTION_TITLES[n], present: !!D.present[n], banner: !!D.banners[n], bannerKind: D.banners[n] || '', records: items.length, met, score: pct(met, items.length), statements: statements.length, open, openShare: Math.round(openShare * 1000) / 1000, rules: R.records ? R.rules : null, rulesShare: R.records ? Math.round(R.share * 1000) / 1000 : null, skeleton, reasons, faults: faults.length, pass: !!D.present[n] && !skeleton && items.length > 0 && !findings.length, findings};
}
// The content reading of an architecture edition: the document structure (sddDocument's result, its JSON package, or
// the Markdown itself), with the records each section prints (records: {2: drivers, 3: decisions, 4: components and
// parties}) when the project is at hand, so the share drafted by rules is read; without them only the density decides.
// Either format reads the same (D-24-06); `format` names it for sections given without the marker the edition carries.
export function contentReading(input, {records = {}, format = null} = {}) {
  const markdown = typeof input === 'string' ? input : str(input?.markdown);
  const D = parseArchitectureEdition(markdown, {format});
  const sections = CONTENT_STANDARD.sections.map(n => sectionReading(n, D, records[n]));
  const present = sections.filter(s => s.present), records_ = present.reduce((n, s) => n + s.records, 0), met = present.reduce((n, s) => n + s.met, 0);
  const findings = sections.flatMap(s => s.findings), skeletons = present.filter(s => s.skeleton), faulted = present.filter(s => !s.skeleton && s.faults);
  const missing = sections.filter(s => !s.present), incomplete = present.filter(s => !s.skeleton && !s.pass);
  const score = pct(met, records_), pass = !missing.length && sections.every(s => s.pass);
  const names = xs => andList(xs.map(s => String(s.n))), ruledSk = skeletons.filter(ruled), shortSk = skeletons.filter(s => !ruled(s));
  const line = !present.length ? 'No section the content standard reads is in this edition.' : score + ' % of the design records (' + count(met) + ' of ' + count(records_) + ') meet the content standard' +
    (ruledSk.length ? '; ' + (ruledSk.length === 1 ? 'section ' : 'sections ') + names(ruledSk) + ' ' + isAre(ruledSk.length) + ' a skeleton, marked in place' : '') +
    (shortSk.length ? '; ' + (shortSk.length === 1 ? 'section ' : 'sections ') + names(shortSk) + ' ' + (shortSk.length === 1 ? 'falls' : 'fall') + ' short of the standard, marked in place' : '') +
    (faulted.length ? '; ' + (faulted.length === 1 ? 'section ' : 'sections ') + names(faulted) + ' ' + (faulted.length === 1 ? 'prints' : 'print') + ' ' + plural(faulted.reduce((n, s) => n + s.faults, 0), 'prose fault') : '') +
    (incomplete.length ? '; ' + (incomplete.length === 1 ? 'section ' : 'sections ') + names(incomplete) + ' ' + (incomplete.length === 1 ? 'has' : 'have') + ' incomplete design records' : '') +
    (missing.length ? '; ' + (missing.length === 1 ? 'section ' : 'sections ') + names(missing) + ' ' + (missing.length === 1 ? 'is' : 'are') + ' absent from this edition' : '') +
    (pass ? '; ' + (present.length === 1 ? 'section ' : 'sections ') + names(present) + ' ' + (present.length === 1 ? 'is' : 'are') + ' written' : '') + '.';
  return {standard: CONTENT_STANDARD, sections, findings, records: records_, met, score, pass, line};
}
// Whether a section that falls short is the rules' skeleton: most of its records drafted by rules, or, read from a file
// without its project, nothing says otherwise (its banner names it short of the standard).
const ruled = s => (s.rulesShare == null ? s.bannerKind !== 'short' : s.rulesShare >= CONTENT_STANDARD.rulesShare);
// The banner a section that falls short prints above its content (sdd-architecture.js), with its reasons; in format 2
// what is open is listed at the end of the section, not marked in place. The reader knows it by its first sentence.
export const skeletonBanner = (s, format = 1) => '**' + (ruled(s) ? SKELETON_BANNER : SHORT_BANNER) + '.** ' + (s.reasons.length ? s.reasons.map(r => r[0].toUpperCase() + r.slice(1)).join('; ') + '. ' : '') + (ruled(s) ? 'The records are listed as they stand; a person or Sol has yet to write this section.' : format >= 2 ? 'The records are listed as they stand; what is open is listed under the section’s open questions for a person or Sol to complete.' : 'The records are listed as they stand; what is open is marked in place for a person or Sol to complete.');
// The findings of a reading as lines a reviewer quotes: "section · kind ref (title) · field: detail".
export const findingLines = R => R.findings.map(f => f.section + ' · ' + f.kind + ' ' + f.ref + ' (' + f.title.slice(0, 60) + ') · ' + f.field + ': ' + f.detail);
