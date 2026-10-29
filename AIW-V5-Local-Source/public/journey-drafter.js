// The journey drafter (round 4, Contract 2; audit/round4/DESIGN.md): an interpreted brief in, one chapter of proposed
// records out, shaped as answers to the chapter's own creation questions. The rules live here, in public/, beside the
// brief interpreter's (public/brief-interpreter.js); shared/journey-drafter.js re-exports them for the server and the
// suites, so there is one set of rules. Plain ES module: no DOM, no Node API, no model, no project writes.
//
// It proposes and never writes. Each record is an `answers` object shaped exactly for creationFields(p, ch, answers)
// (public/guided-creation.js), so compileCreation stays the one path from answers to commands; the person commits each
// record through the governed guide.start → guide.draft-answer → guide.commit-draft commands (public/chapter-guide.js).
// Every Chapter 1 artefact type goes through that chain (its first answer is the record type), a requirement naming its
// own links as answers, Chapter 8's data its key and status fields, Chapter 11 its title: what a record is made with is
// committed with it. Only the links between Chapter 1 context records follow the commit, as the relationship command;
// they touch no requirement, so no change to review is raised.
//
// Every value says where it came from: stated in a brief passage (the words are there), inferred from a passage or a
// named upstream record by a rule given here, or a gap — a question no source answers, which keeps an explicit
// open-question answer ("Unassigned", "Open question: …") so the person sees it and answers it. No number is written
// unless a passage states it; the one exception is the smallest replica count Chapter 10 accepts (one instance of an
// application that exists), recorded as an assumption. Knowledge enters only as the basis and the citations:
// eligible released claims and Playbook passages from architectureBrain/brainSources, never candidate or discovery
// knowledge, and never as a value.
//
// A model in (round 6, Contract I; public/model-interpreter.js): draftChapter(p, ch, {brief, model}) prefers what the
// model states and falls back to the brief rules for what the model lacks. Chapter 1 takes the model's people, steps,
// requirements, outcomes and constraints and the brief's records of the kinds the model does not name; every other
// chapter takes the model's elements when it names any for that chapter, else the brief rules. A record drafted from
// the model carries provenance {mode: 'model', sourceId} and cites the model's passages (source lines), so the guide
// can check it against the kept model source; a record from the brief rules keeps its deterministic provenance. BPMN
// events, gateways and flows become process.element and process.transition commands that follow the last journey step's
// commit, as the Chapter 1 links do. With no model, nothing here changes: the brief path is byte for byte what it was.
//
// Round 12 (D-10): a project whose requirements were imported, or that keeps requirement groups (readiness-model.js
// draftsByGroup), is drafted by requirement group as one architecture draft (architecture-drafter.js); every chapter
// here answers it with an empty draft that says so (`grouped`), and the brief path stays the drafter of a brief's project.
import {creationFields, compileCreation} from './guided-creation.js';
import {applyCommand} from './requirements-domain.js';
import {applyProcessCommand} from './process-model.js';
import {QUALITY_TYPES} from './quality-domain.js';
import {TECHNOLOGY_CATEGORIES} from './technology-domain.js';
import {architectureBrain, brainSources, BRAIN_ENGINE, BRAIN_POLICY} from './architecture-brain.js';
import {brainContext} from './aiw-brain.js';
import {guideBasis} from './guidance-record.js';
import {sha256} from './brain-integrity.js';
import {withJourneyProvenance} from './chapter-guide.js';
import {resilienceDrafts} from './security-domain.js';
import {draftsByGroup, groupedDraftReason} from './readiness-model.js';
import {nounPhrase} from './architecture-drafter.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES} from './chapter-names.js';

export const JOURNEY_CHAPTERS = 11;
// The bounds of a record's provenance, as guide.commit-draft checks them. A chapter's number of records is not bounded:
// every interpreted proposal (Chapter 1) and every upstream record a rule reads (Chapters 2–11) is drafted.
export const JOURNEY_LIMITS = {passages: 40, upstream: 40, claimIds: 20, playbook: 20};
// The choices that name the upstream record a draft hangs from: the rules make them; their option lists (every record of
// a chapter) are sent only when the choice is open.
const ANCHORS = new Set(['type', 'journeyId', 'outcomeId', 'constraintId', 'assumptionId', 'requirementId', 'driverId', 'decisionId', 'logicalId', 'applicationId', 'capabilityId', 'from', 'to', 'authorityId', 'targetId', 'assetId']);

// ---------------------------------------------------------------- words

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
const uniq = xs => [...new Set(xs.filter(Boolean))];
const clip = (s, n) => { const t = str(s).replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
const cap = s => { const t = str(s); return t ? t[0].toUpperCase() + t.slice(1) : t; };
const lower = s => { const t = str(s); return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; };
const firstSentence = s => { const t = str(s); const m = /^([\s\S]{8,400}?[.!?])(?:\s|$)/.exec(t); return m ? m[1] : clip(t, 400); };
const STOP = new Set('the and for that this with from into its are was were have has will shall must should can could may might not any all each every per than then when where which who whom whose what how via our their your his her them they who also only able need needs using use used within without about after before over under between there here been being such other more most less least very much many some'.split(' '));
const stem = w => w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
const words = s => (str(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2 && !STOP.has(w)).map(stem);
// The words that make two titles the same record: lower case, no short or stop words, simple plurals folded.
export const titleKey = title => words(title).join(' ');
const overlap = (a, b) => { const A = new Set(words(a)); return new Set(words(b).filter(w => A.has(w))).size; };
const placeholder = v => !str(v) || /^(?:confirm|tbd|to be (?:confirmed|decided)|unassigned|unknown|n\/a|none|open question)\b/i.test(str(v));
const textOf = r => [r?.title, r?.question, r?.description, r?.statement, r?.purpose, r?.acceptance, r?.response].map(str).filter(Boolean).join(' ');
// The given / when / then clauses of an acceptance criterion, verbatim.
// A stub that still holds bracketed prompts ([the starting condition]) is no clause: it states nothing yet.
const stub = t => /\[[^\]]+\]/.test(str(t));
const clauses = t => { const m = !stub(t) && /^\s*given\s+([\s\S]+?),\s*when\s+([\s\S]+?),\s*then\s+([\s\S]+?)\s*$/i.exec(str(t)); return m ? {given: 'Given ' + m[1], when: 'When ' + m[2], then: 'Then ' + m[3]} : null; };

// ---------------------------------------------------------------- the interpreted brief

// The brief as the interpreter returns it (shared/brief-interpreter.js, Contract 1), read defensively: any list may be
// missing, a proposal may carry `statement` instead of `description`.
export function briefOf(raw) {
  const b = raw && typeof raw === 'object' ? raw : {};
  const passages = list(b.passages).filter(x => x && typeof x.id === 'string').map(x => ({id: x.id, start: x.start, end: x.end, text: str(x.text)}));
  const proposals = key => list(b[key]).filter(x => x && typeof x === 'object' && str(x.title || x.statement || x.description)).map(x => ({...x, title: str(x.title) || clip(x.statement || x.description, 120), description: str(x.description || x.statement), passages: list(x.passages).filter(id => passages.some(q => q.id === id)), confidence: x.confidence === 'stated' ? 'stated' : 'inferred'}));
  return {passages, byId: new Map(passages.map(x => [x.id, x])), outcomes: proposals('outcomes'), stakeholders: proposals('stakeholders'), actors: proposals('actors'), scope: proposals('scope'), journeys: proposals('journeys'), constraints: proposals('constraints'), assumptions: proposals('assumptions'), requirements: proposals('requirements'), questions: list(b.questions).filter(q => q && str(q.question)).map(q => ({key: str(q.key), question: str(q.question), forType: str(q.forType)}))};
}
// The brief a project's draft is read from (R4-D, shared/projects-domain.js): the opening brief the project keeps whole
// as its evidence source (brief.interpreted.sourceId, marked kind 'brief'); else brief.problem, when its SHA-256 is the
// hash the interpretation recorded (a template copy drops the sources but keeps the brief); else brief.problem and goal
// as Chapter 1 records them, and the draft says the source was not kept.
export function briefSource(p) {
  const sources = list(p?.coauthoring?.sources), seen = p?.brief?.interpreted || null, id = seen?.sourceId;
  const kept = sources.find(s => id && s?.id === id) || sources.find(s => s?.kind === 'brief');
  const text = str(kept?.text);
  if (text) return {text, sourceId: kept.id, kept: true, note: ''};
  const problem = str(p?.brief?.problem);
  if (problem && seen?.textHash && sha256(problem) === seen.textHash) return {text: problem, sourceId: null, kept: false, note: 'The opening brief is not kept as a source in this project; its text matches the hash recorded when it was read.'};
  const fallback = [problem, str(p?.brief?.goal)].filter(Boolean).join('\n\n');
  return {text: fallback, sourceId: null, kept: false, note: !fallback ? '' : seen?.sourceId ? 'The opening brief source was not kept and the brief has changed since it was read; drafted from the brief as Chapter 1 records it.' : 'Drafted from the brief as Chapter 1 records it.'};
}
export const briefText = p => briefSource(p).text;

// ---------------------------------------------------------------- the interpreted model

// The model as the interpreter returns it (shared/model-interpreter.js, Contract I), read defensively, with the id of
// the evidence source it was read from (`sourceId`, which the caller adds: the interpreter does not know the project).
// Indexes the drafter's rules read: elements by id, relationships out of and into each element, children by parent.
export function modelOf(raw) {
  const m = raw && typeof raw === 'object' ? raw : null;
  if (!m) return null;
  const passages = list(m.passages).filter(x => x && typeof x.id === 'string').map(x => ({id: x.id, start: x.start, end: x.end, text: str(x.text)}));
  const byId = new Map(passages.map(x => [x.id, x]));
  const elements = list(m.elements).filter(e => e && typeof e === 'object' && str(e.id) && str(e.name)).map(e => ({id: str(e.id), kind: str(e.kind), name: clip(e.name, 160), description: str(e.description), technology: str(e.technology), tags: list(e.tags).map(str).filter(Boolean), parent: e.parent ? str(e.parent) : null, external: e.external === true, passages: list(e.passages).filter(id => byId.has(id)), confidence: e.confidence === 'stated' ? 'stated' : 'inferred', attrs: e.attrs && typeof e.attrs === 'object' && !Array.isArray(e.attrs) ? e.attrs : {}}));
  const els = new Map(elements.map(e => [e.id, e]));
  const relationships = list(m.relationships).filter(r => r && typeof r === 'object' && els.has(str(r.from)) && els.has(str(r.to))).map(r => ({id: str(r.id), from: str(r.from), to: str(r.to), label: str(r.label), technology: str(r.technology), kind: str(r.kind) || 'association', passages: list(r.passages).filter(id => byId.has(id)), confidence: r.confidence === 'stated' ? 'stated' : 'inferred', attrs: r.attrs && typeof r.attrs === 'object' && !Array.isArray(r.attrs) ? r.attrs : {}}));
  const out = new Map(), into = new Map(), children = new Map();
  for (const r of relationships) { (out.get(r.from) || out.set(r.from, []).get(r.from)).push(r); (into.get(r.to) || into.set(r.to, []).get(r.to)).push(r); }
  for (const e of elements) if (e.parent) (children.get(e.parent) || children.set(e.parent, []).get(e.parent)).push(e);
  return {format: str(m.format) || 'unknown', name: str(m.name) || 'the model', sourceId: str(m.sourceId) || null, passages, byId, elements, els, relationships, out, into, children, views: list(m.views), questions: list(m.questions).filter(q => q && str(q.question)).map(q => ({key: str(q.key), question: str(q.question), forType: str(q.forType)})), empty: !elements.length};
}
// The model a project's draft is read from: the evidence source of kind 'model' that createProject kept
// (shared/projects-domain.js; model.interpreted.sourceId names it), with its name and format.
export function modelSource(p) {
  const sources = list(p?.coauthoring?.sources), seen = p?.model?.interpreted || null, id = seen?.sourceId;
  const kept = sources.find(s => id && s?.id === id && s?.kind === 'model') || sources.find(s => s?.kind === 'model');
  // The text exactly as kept, never trimmed: the passages the drafter cites are offsets in that text, and its hash is the recorded one.
  const text = typeof kept?.text === 'string' && kept.text.trim() ? kept.text : '';
  if (text) return {text, sourceId: kept.id, name: str(kept.name) || kept.id, format: str(kept.format) || str(seen?.format) || '', kept: true, note: ''};
  return {text: '', sourceId: null, name: '', format: '', kept: false, note: 'This project keeps no model source.'};
}

// ---------------------------------------------------------------- one value and where it came from

// A field's draft: the value, how it is known and what it rests on. `basis` is one of
// stated   — the words are in the cited passage(s);
// inferred — a rule derived it from the cited passage(s) or upstream record(s);
// upstream — copied from the named upstream record(s);
// gap      — no source answers it; `value` is the explicit open answer the record carries until the person answers.
const V = (value, basis, {passages = [], upstream = [], note = ''} = {}) => ({value: value == null ? '' : String(value), basis, passages: uniq(passages), upstream: uniq(upstream), ...(note ? {note} : {})});
const stated = (value, passages, extra = {}) => V(value, 'stated', {passages, ...extra});
const inferred = (value, sources = {}) => V(value, 'inferred', sources);
const fromUpstream = (value, upstream, extra = {}) => V(value, 'upstream', {upstream, ...extra});
const gap = (value = '', note = '') => V(value, 'gap', {note});
// Stated when a cited passage holds the words, otherwise inferred from it.
function fromPassages(B, value, passages, field = null, proposal = null) {
  if (field && Array.isArray(proposal?.inferred)) return proposal.inferred.includes(field) ? inferred(str(value), {passages}) : stated(str(value), passages);
  const v = str(value), texts = passages.map(id => B.byId.get(id)?.text || '').join(' ').toLowerCase().replace(/\s+/g, ' ');
  const plain = v.toLowerCase().replace(/[.!?;:]+$/, '').replace(/\s+/g, ' ');
  return plain && texts.includes(plain) ? stated(v, passages) : inferred(v, {passages});
}
// The same, against the model's passages (source lines): stated when the line holds the words, else inferred from it.
const fromModel = (M, value, passages, extra = {}) => { const v = fromPassages(M, value, passages); return extra.note ? {...v, note: extra.note} : v; };
// The open answers a gap carries: the guide accepts them as "what remains unknown".
const openText = label => 'Open question: ' + lower(label).replace(/\?$/, '') + '? Not stated in the brief or the upstream records.';
const OWNER_GAP = 'Unassigned';
const ownerOf = (r, id) => placeholder(r?.owner) ? gap(OWNER_GAP, 'No owner is named; the person names one.') : fromUpstream(r.owner, [id]);

// ---------------------------------------------------------------- reading the document

const artefacts = (p, type) => list(p.artefacts).filter(a => a.type === type);
const related = (p, id) => list(p.relationships).filter(r => r.from === id || r.to === id).map(r => r.from === id ? r.to : r.from);
const linkedOfType = (p, id, type) => related(p, id).map(x => list(p.artefacts).find(a => a.id === x)).filter(a => a?.type === type);
const journeyOf = r => r?.provenance?.journey || null;
const passagesOf = r => list(journeyOf(r)?.passages);
const refOf = r => r?.ref || r?.id;
const best = (items, text, min = 1) => { let top = null, score = min - 1; for (const x of items) { const s = overlap(textOf(x), text); if (s > score) { top = x; score = s; } } return top; };

// The noun phrase a requirement acts on: one naming rule with the architecture draft (round 12, DRF-15:
// architecture-drafter.js nounPhrase): its title without a leading adverb, the subject and modal, "Ensure", "Ability
// to" or the leading verb, numbers and determiners, cut at the first preposition or clause ("Accept a traceable service
// request from a citizen" → "traceable service request"; "The system shall record each account closure" → "account
// closure"); never a modal verb. A passive title ("Be paid through the gateway") acts on the subject of its description
// ("Refunds must be paid …" → "refund"), or else on the subject of the description's clause that says what must be
// done ("…, and a door opened offline must still be accounted for" → "door opened offline"), never on its participle.
const DETERMINERS = /\b(?:a|an|the|each|every|any|all|its|their|our|his|her|your|one|new|existing|current)\s+/gi;
const PASSIVE_CLAUSE = /(?:^|[;:]\s*|,\s*(?:and|but|or|so|while)\s+|\.\s+)(?:the\s+|a\s+|an\s+|each\s+|all\s+|every\s+)?([a-z][\w\s-]{1,60}?)\s+(?:must|shall|should|will|needs? to|can|has to|have to)\s+(?:still\s+|also\s+|always\s+|only\s+)?be\s/i;
export function objectPhrase(title, description = '') {
  const t = str(title).replace(/[.!?]+$/, '').replace(/^(?:still|also|always|only)\s+/i, '');
  if (/^be\s/i.test(t)) { const m = /^(?:the\s+|each\s+|all\s+|every\s+)?([a-z][\w\s-]{1,60}?)\s+(?:must|shall|should|will|needs?|can|has to|have to)\b/i.exec(str(description)) || PASSIVE_CLAUSE.exec(str(description)); if (m) return clip(stem(m[1].trim().toLowerCase().replace(DETERMINERS, '')), 80); }
  return nounPhrase(t) || clip(title, 80);
}
const ROLE_OF_VERB = [[/^(?:accept|submit|receive|capture|register|create|lodge|apply|request|intake|collect|upload)\b/i, 'intake'], [/^(?:review|assess|approve|screen|check|validate|verify|decide|triage|evaluate|reject|inspect)\b/i, 'assessment'], [/^(?:notify|inform|send|communicate|alert|remind|message|email)\b/i, 'notification'], [/^(?:track|view|show|display|enquire|query|report|search|find|see|retrieve|monitor)\b/i, 'status'], [/^(?:pay|charge|refund|bill|invoice|settle|be paid)\b/i, 'payment'], [/^(?:schedule|book|reserve|allocate|assign|plan|dispatch|route)\b/i, 'scheduling'], [/^(?:store|retain|archive|keep|maintain|preserve|protect|record|log)\b/i, 'record keeping'], [/^(?:calculate|compute|price|quote|estimate)\b/i, 'calculation'], [/^(?:pick|pack|ship|deliver|fulfil|fulfill)\b/i, 'fulfilment']];
const roleOf = title => ROLE_OF_VERB.find(([re]) => re.test(str(title)))?.[1] || 'handling';
// A responsibility's name: the noun the requirement acts on and the kind of work its verb names ("Return intake").
const responsibilityTitle = r => { const noun = objectPhrase(r.title, r.description), role = roleOf(r.title); return cap(words(noun).includes(stem(role.split(' ')[0])) ? noun : `${noun} ${role}`); };

// ---------------------------------------------------------------- the chapters' rules

// Each rule returns record specs: {key, kind: 'guided', type?, title, values: {field: V}, upstream, passages,
// extras?: (doc, created) => [commands]}. A spec value may be a function of the working document, so a
// record can name what an earlier record of the same chapter created.
const QUALITY_CUES = {
  performance: /\b(?:within|seconds?|secs?|minutes?|ms|milliseconds?|latency|quick(?:ly)?|fast|promptly|response time|immediately|real[- ]time)\b/i,
  availability: /\b(?:available|availability|uptime|outages?|downtime|24\s*\/\s*7|around the clock|always on)\b/i,
  integrity: /\b(?:duplicates?|exactly once|consistent|consistency|reconcil\w*|transaction\w*|idempoten\w*|double|lost|accurate|accuracy|integrity)\b/i,
  recoverability: /\b(?:recover\w*|restore\w*|backups?|resume\w*|failover|retr(?:y|ies)|interrupt\w*)\b/i,
  security: /\b(?:authori[sz]\w*|authenticat\w*|permission\w*|access|confidential\w*|personal data|encrypt\w*|privacy|private|secure\w*|sensitive)\b/i,
  traceability: /\b(?:audit\w*|trace\w*|history|track\w*|logs?|evidence|reference|status)\b/i,
  scalability: /\b(?:peaks?|volumes?|scale|scaling|concurren\w*|surges?|per (?:second|minute|hour|day)|thousands?|millions?)\b/i,
  usability: /\b(?:accessib\w*|easy|user[- ]friendly|usab\w*|mobile|self[- ]service|plain language)\b/i,
  interoperability: /\b(?:integrat\w*|interfaces?|exchange\w*|apis?|partners?|standards?|third[- ]part\w*|external systems?)\b/i,
  maintainability: /\b(?:maintain\w*|change\w* (?:easily|quickly)|configur\w*|extend\w*)\b/i,
  deployability: /\b(?:deploy\w*|release\w*|roll ?out|upgrade\w*)\b/i,
  testability: /\b(?:testab\w*|test\w*)\b/i
};
function qualityOf(text) {
  let top = null, score = 0;
  for (const [id, re] of Object.entries(QUALITY_CUES)) { const n = (str(text).match(new RegExp(re.source, 'gi')) || []).length; if (n > score) { top = id; score = n; } }
  return top;
}
const qualityName = id => QUALITY_TYPES.find(t => t.id === id)?.name || id;
// A number a passage states with its unit, and the comparison its words imply.
const NUMBER = /(?:(within|under|less than|no more than|at most|up to|inside|below|maximum of|at least|minimum of|more than|over|above|exceed\w*)\s+)?(\d+(?:[.,]\d+)?)\s*(%|percent|per ?cent|ms|milliseconds?|seconds?|secs?|minutes?|mins?|hours?|hrs?|(?:working |business |calendar )?days?|weeks?|months?|[a-z]+ per (?:second|minute|hour|day|week|month))(?![a-z])/i;
function statedNumber(B, ids) {
  for (const id of ids) {
    const t = B.byId.get(id)?.text || '', m = NUMBER.exec(t);
    if (!m) continue;
    const cue = str(m[1]).toLowerCase(), unit = m[3].replace(/^per ?cent$/i, '%').replace(/^percent$/i, '%');
    const atLeast = /least|minimum|more|over|above|exceed/.test(cue) || (!cue && /%/.test(unit));
    return {value: m[2].replace(',', '.'), unit, operator: atLeast ? 'At least' : cue || /second|minute|hour|day|week|month|ms/i.test(unit) ? 'At most' : 'At least', cue: !!cue, passage: id, phrase: m[0]};
  }
  return null;
}
// The same, read from an upstream record's own words (a requirement the person wrote, with no brief passage).
function numberIn(text, id) { const B = {byId: new Map([[id, {text}]])}, n = statedNumber(B, [id]); return n ? {...n, passage: null, upstream: id} : null; }
// A stated number cites its passage, or the upstream record whose words hold it.
const cites = (n, up) => n.passage ? {passages: [n.passage], upstream: up} : {upstream: up};
const said = (value, n) => n.passage ? stated(value, [n.passage]) : fromUpstream(value, [n.upstream]);
const PRIORITY_OF = {Must: 'High', Should: 'Medium', Could: 'Low'};

const RULES = {
  // Chapter 1: one record per interpreted proposal, every artefact type, each through the guided chain (its first
  // answer is the record type the interpreter read). The context records come first; an actor's, stakeholder's or scope
  // boundary's links to them follow its commit as the Chapter 1 relationship command (they touch no requirement, so no
  // change to review is raised). The requirements come last and name their own links as answers — the journey step that
  // requires one and the outcome it delivers (the one sharing most words with it, or the only one), the constraint and
  // the assumption sharing most words with it — so each link is made with the requirement, in the same command.
  1: (p, B, ctx) => {
    const specs = [], source = (ids, x) => stated(str(x?.source) || `Project brief — ${p.name}${ids.length ? ' · ' + ids.join(', ') : ''}`, ids);
    // A proposal the project already holds (same type, same title words) is not drafted again; proposals of one type
    // with the same title words are one record citing all their passages.
    const known = new Set(list(p.artefacts).map(a => a.type + ':' + titleKey(a.title)));
    const distinct = (type, xs) => { const kept = new Map(); for (const x of xs) { const k = titleKey(x.title); if (known.has(type + ':' + k)) continue; const g = kept.get(k); if (g) g.passages = uniq([...g.passages, ...x.passages]); else kept.set(k, {...x, passages: [...x.passages]}); } return [...kept.values()]; };
    const kind = (type, x) => inferred(type, {passages: x.passages, note: `The brief interpreter read ${x.passages.join(', ') || 'the brief'} as a ${type}.`});
    const order = ['outcome', 'journey', 'actor', 'stakeholder', 'scope', 'constraint', 'assumption'], from = {outcome: 'outcomes', journey: 'journeys', actor: 'actors', stakeholder: 'stakeholders', scope: 'scope', constraint: 'constraints', assumption: 'assumptions'};
    let n = 0;
    for (const type of order) for (const [i, x] of distinct(type, B[from[type]]).entries()) {
      n++;
      specs.push({key: 'c' + n, kind: 'guided', type, title: x.title, passages: x.passages, values: {
        type: kind(type, x), title: fromPassages(B, x.title, x.passages, 'title', x), description: x.description ? fromPassages(B, x.description, x.passages, 'description', x) : gap(openText('Describe it in the project’s own terms')),
        owner: str(x.owner) && !placeholder(x.owner) ? fromPassages(B, x.owner, x.passages, 'owner', x) : gap('', 'The brief names no owner.'), source: source(x.passages, x),
        ...(type === 'scope' ? {scopeMode: inferred(x.scopeMode === 'out' || /\bout of scope|exclud|not (?:in scope|include)/i.test(textOf(x)) ? 'out' : 'in', {passages: x.passages})} : {}),
        ...(type === 'journey' ? {order: inferred(String(Number(x.order) || i + 1), {passages: x.passages, note: 'Its place in the brief\'s list of steps.'})} : {})},
      extras: (doc, created) => linksFor(doc, type, x).map(([a, rel, b]) => ({type: 'relationship', payload: {from: a === 'new' ? created[0] : a, to: b === 'new' ? created[0] : b, kind: rel}}))});
    }
    const linkTo = (type, x, onlyOne) => doc => {
      const items = artefacts(doc, type), top = items.map(i => [i, overlap(textOf(i), textOf(x))]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1])[0]?.[0] || (onlyOne && items.length === 1 ? items[0] : null);
      return top ? inferred(top.id, {upstream: [top.id], note: overlap(textOf(top), textOf(x)) ? `Shares the most words with ${top.id} ${top.title}.` : `The only ${type} the brief names.`}) : gap('', `No ${type} shares words with it.`);
    };
    for (const [i, x] of distinct('requirement', B.requirements).entries()) specs.push({key: 'r' + (i + 1), kind: 'guided', type: 'requirement', title: x.title, passages: x.passages, values: {
      type: kind('requirement', x), title: fromPassages(B, x.title, x.passages, 'title', x), description: x.description ? fromPassages(B, x.description, x.passages, 'description', x) : gap(openText('Describe the need, scope and conditions')),
      acceptance: str(x.acceptance) ? fromPassages(B, x.acceptance, x.passages, 'acceptance', x) : gap(openText('What observable result would demonstrate this behaviour')),
      owner: str(x.owner) && !placeholder(x.owner) ? fromPassages(B, x.owner, x.passages, 'owner', x) : gap(OWNER_GAP, 'The brief names no owner for this requirement.'), source: source(x.passages, x),
      journeyId: linkTo('journey', x, true), outcomeId: linkTo('outcome', x, true), constraintId: linkTo('constraint', x, false), assumptionId: linkTo('assumption', x, false)}});
    ctx.questions = B.questions;
    return specs;
  },
  // Chapter 2: one quality scenario per requirement without one, from its acceptance clauses. A target is a number the
// requirement's passages (or its own words) state, or one a constraint on it states with a comparison ("within 3 days").
  2: (p, B) => artefacts(p, 'requirement').filter(r => !list(p.quality?.drivers).some(d => list(d.requirementIds).includes(r.id))).map((r, i) => {
    const text = textOf(r), category = qualityOf(text), k = clauses(r.acceptance), ids = passagesOf(r), up = [r.id], limits = linkedOfType(p, r.id, 'constraint'), limited = n => n?.cue ? n : null, n = statedNumber(B, ids) || numberIn(text, r.id) || limited(statedNumber(B, limits.flatMap(passagesOf))) || limits.map(c => limited(numberIn(textOf(c), c.id))).find(Boolean);
    const outcome = linkedOfType(p, r.id, 'outcome')[0], name = category ? qualityName(category) : 'Quality';
    return {key: 'q' + (i + 1), kind: 'guided', title: `${name}: ${r.title}`, upstream: up, passages: ids, values: {
      requirementId: fromUpstream(r.id, up), title: inferred(`${name}: ${clip(r.title, 120)}`, {upstream: up}),
      category: category ? inferred(category, {upstream: up, note: 'Chosen from the cue words in ' + r.id + '.'}) : gap(QUALITY_TYPES[0].id, 'No quality cue word in the requirement; choose the quality this scenario makes measurable.'),
      stimulus: k ? fromUpstream(k.when, up) : gap(openText('Who or what triggers the scenario, and what happens')),
      conditions: k ? fromUpstream(k.given, up) : gap(openText('Under what workload, failure or operating conditions')),
      response: k ? fromUpstream(k.then, up) : r.description ? fromUpstream(firstSentence(r.description), up) : gap(openText('What must the system do in response')),
      metric: n ? inferred(`${/%/.test(n.unit) ? 'Share' : /second|minute|hour|day|week|month|ms/i.test(n.unit) ? 'Elapsed time' : 'Count'} for: ${clip(k ? k.then : r.title, 160)}`, cites(n, up)) : gap(openText('Which metric measures that response')),
      operator: n ? (n.cue ? said(n.operator, n) : inferred(n.operator, cites(n, up))) : gap('At most', 'No target is stated, so there is nothing to compare yet.'),
      targetValue: n ? said(n.value, n) : gap('', 'The brief states no number for this requirement.'),
      unit: n ? said(n.unit, n) : gap(openText('What unit does that metric use')),
      window: gap(openText('Define the workload, population and measurement window')),
      measurement: str(r.acceptance) && !stub(r.acceptance) ? fromUpstream(`Verify against the acceptance criteria of ${r.id}: ${clip(r.acceptance, 600)}`, up) : str(r.acceptance) ? fromUpstream(`Verify against the acceptance criteria of ${r.id}, once they say what is observed.`, up) : gap(openText('How will the team measure and verify it')),
      priority: PRIORITY_OF[r.priority] ? inferred(PRIORITY_OF[r.priority], {upstream: up, note: `${r.id} is a ${r.priority} requirement.`}) : gap('', `${r.id} has no stated priority; the architect must set this scenario's priority.`),
      rationale: fromUpstream(`${r.id} ${r.title} ${r.priority ? `is a ${r.priority} requirement` : 'has no stated priority'}${outcome ? ` and delivers ${outcome.id} ${outcome.title}` : ''}.`, uniq([r.id, outcome?.id])),
      owner: ownerOf(r, r.id)}};
  }),
  // Chapter 3: one decision per constraint, and per pair of drivers whose qualities pull apart, each with two
  // alternatives — keep it within one owned boundary, or separate it (the Playbook's "compare structure before choosing
  // technology"). When neither exists, one decision for the most significant driver.
  3: (p, B, ctx) => {
    const drivers = list(p.quality?.drivers), reqs = artefacts(p, 'requirement'), decided = list(p.decisions?.records), specs = [];
    const driverFor = req => drivers.find(d => list(d.requirementIds).includes(req?.id));
    const add = (question, subject, req, driver, context, up) => {
      if (!req || !driver || decided.some(d => list(d.driverIds).includes(driver.id) && overlap(d.question, question) > 2) || specs.some(x => x.title === question)) return;
      const U = uniq([...up, req.id, driver.id]);
      specs.push({key: 'd' + (specs.length + 1), kind: 'guided', title: question, upstream: U, values: {
        requirementId: fromUpstream(req.id, [req.id]), driverId: fromUpstream(driver.id, [driver.id]),
        question: inferred(question, {upstream: U}), context: fromUpstream(context, U),
        optionA: inferred('Keep it within one owned boundary', {upstream: U, note: 'The simpler structure first (Playbook: compare structure before choosing technology).'}),
        approachA: inferred(`One application boundary owns the work ${subject} governs, with its data and recovery, under one owner.`, {upstream: U}),
        tradeoffA: inferred(`Fewer moving parts and one owner; ${qualityName(driver.category).toLowerCase()} (${driver.id}) then rests on that one boundary.`, {upstream: U}),
        optionB: inferred('Separate it into an independent boundary', {upstream: U}),
        approachB: inferred(`A separate boundary owns the work ${subject} governs and exchanges with the rest through an explicit contract.`, {upstream: U}),
        tradeoffB: inferred(`Independent change and failure isolation for ${driver.id}; more contracts, ownership and operating work.`, {upstream: U}),
        owner: ownerOf(driver, driver.id)}});
    };
    for (const c of artefacts(p, 'constraint')) { const req = linkedOfType(p, c.id, 'requirement').find(driverFor) || best(reqs.filter(driverFor), textOf(c)) || reqs.find(driverFor); add(`How should the design respect ${c.id}: ${clip(c.title, 140)}?`, c.id, req, driverFor(req), str(c.description) || c.title, [c.id]); }
    const TENSIONS = [['performance', 'integrity'], ['performance', 'security'], ['availability', 'integrity'], ['scalability', 'integrity'], ['usability', 'security'], ['availability', 'security']];
    for (const [a, b] of TENSIONS) { const x = drivers.find(d => d.category === a), y = drivers.find(d => d.category === b); if (x && y && specs.length < 6) { const req = reqs.find(r => list(x.requirementIds).includes(r.id)); add(`How should the design balance ${qualityName(a).toLowerCase()} (${x.id}) against ${qualityName(b).toLowerCase()} (${y.id})?`, `${x.id} and ${y.id}`, req, x, `${x.id} asks: ${x.response} ${y.id} asks: ${y.response}`, [x.id, y.id]); } }
    if (!specs.length) { const d = [...drivers].sort((a, b) => ['Critical', 'Important', 'Supporting'].indexOf(a.priority) - ['Critical', 'Important', 'Supporting'].indexOf(b.priority))[0], req = d && reqs.find(r => list(d.requirementIds).includes(r.id)); if (d) add(`Which structure best meets ${d.id}: ${clip(d.title, 140)}?`, d.id, req, d, `${d.id}: ${d.response}`, [d.id]); }
    ctx.note = specs.length ? '' : 'No requirement with a quality scenario to decide on.';
    return specs;
  },
  // Chapter 4: one responsibility per requirement without one, named for what the requirement acts on.
  4: p => {
    const reqs = artefacts(p, 'requirement'), owned = new Set(list(p.logical?.responsibilities).flatMap(r => list(r.requirementIds))), out = artefacts(p, 'scope').filter(s => s.scopeMode === 'out');
    return reqs.filter(r => !owned.has(r.id)).map((r, i) => {
      const decision = list(p.decisions?.records).find(d => list(d.requirementIds).includes(r.id)), others = reqs.filter(x => x.id !== r.id).slice(0, 3), up = [r.id];
      const title = responsibilityTitle(r);
      return {key: 'l' + (i + 1), kind: 'guided', title, upstream: up, values: {
        requirementId: fromUpstream(r.id, up), ...(decision ? {decisionId: fromUpstream(decision.id, [decision.id])} : {}),
        title: inferred(title, {upstream: up, note: 'What the requirement acts on, and the kind of work its verb names.'}),
        purpose: r.description ? fromUpstream(r.description, up) : fromUpstream(r.title, up),
        boundary: out.length ? fromUpstream(`Outside: ${out.map(s => s.title).join('; ')} (out of scope).${others.length ? ' Also outside: ' + others.map(x => `${x.id} ${x.title}`).join('; ') + '.' : ''}`, uniq([...out.map(s => s.id), ...others.map(x => x.id)])) : others.length ? fromUpstream(`Outside: ${others.map(x => `${x.id} ${x.title}`).join('; ')}.`, others.map(x => x.id)) : gap(openText('What belongs outside it')),
        owner: ownerOf(r, r.id)}};
    });
  },
  // Chapter 5: one application component per responsibility without one.
  5: p => {
    const mapped = new Set(list(p.logical?.mappings).map(m => m.logicalId));
    return list(p.logical?.responsibilities).filter(r => !mapped.has(r.id)).map((r, i) => {
      const req = list(p.artefacts).find(a => list(r.requirementIds).includes(a.id)), k = clauses(req?.acceptance), journey = req && linkedOfType(p, req.id, 'journey')[0], actor = journey && linkedOfType(p, journey.id, 'actor')[0], up = uniq([r.id, req?.id]);
      const role = /notification/i.test(r.title) ? 'adapter' : /records/i.test(r.title) ? 'store' : 'service', title = `${r.title} ${role === 'store' ? 'store' : role === 'adapter' ? 'adapter' : 'service'}`;
      return {key: 'a' + (i + 1), kind: 'guided', title, upstream: up, values: {
        logicalId: fromUpstream(r.id, [r.id]), title: inferred(title, {upstream: [r.id]}), kind: inferred(role, {upstream: [r.id], note: 'Notification work is an adapter, record keeping a store, anything else a service.'}),
        boundary: fromUpstream(`Owns ${r.title}: ${firstSentence(r.purpose)}${str(r.boundary) && !placeholder(r.boundary) ? ' ' + r.boundary : ''}`, [r.id]),
        inputs: journey ? fromUpstream(`${actor ? actor.title + ', at ' : 'At '}${journey.id} ${journey.title}${k ? ': ' + lower(k.when) : ''}.`, uniq([journey.id, actor?.id, req?.id])) : k ? fromUpstream(k.when, [req.id]) : gap(openText('What does it receive, and from whom')),
        outputs: k ? fromUpstream(k.then, [req.id]) : gap(openText('What does it provide, and to whom')),
        owner: ownerOf(r, r.id)}};
    });
  },
  // Chapter 6: one supporting capability and trust boundary per component without a need.
  6: p => {
    const needed = new Set(list(p.technology?.needs).map(n => n.applicationId)), CATEGORY = {service: 'compute', module: 'compute', worker: 'messaging', queue: 'messaging', adapter: 'connectivity', store: 'transactional'};
    const securityReq = artefacts(p, 'requirement').find(r => QUALITY_CUES.security.test(textOf(r))), recovery = list(p.quality?.drivers).find(d => d.category === 'recoverability');
    return list(p.realisation?.components).filter(c => !needed.has(c.id)).map((c, i) => {
      const category = CATEGORY[c.kind] || 'compute', name = TECHNOLOGY_CATEGORIES.find(([id]) => id === category)?.[1] || category, up = [c.id];
      return {key: 't' + (i + 1), kind: 'guided', title: `${name} for ${c.title}`, upstream: up, values: {
        applicationId: fromUpstream(c.id, up), category: inferred(category, {upstream: up, note: `A ${c.kind} needs ${name.toLowerCase()}.`}),
        need: fromUpstream(`${refOf(c)} ${c.title} needs ${name.toLowerCase()} to run what it owns: ${firstSentence(c.purpose || c.boundary)}`, up), title: inferred(`${name} for ${c.title}`, {upstream: up}),
        boundary: inferred(`Provides ${name.toLowerCase()} to ${refOf(c)} ${c.title}; the application's own logic and data rules stay with the application.`, {upstream: up}),
        trustName: inferred(`${c.title} trust boundary`, {upstream: up}),
        trustPolicy: securityReq ? fromUpstream(`Crossing it follows ${securityReq.id}: ${firstSentence(securityReq.description || securityReq.title)}`, [securityReq.id]) : gap(openText('What controls crossing this trust boundary')),
        failureDomain: gap(openText('Which failure domain contains it')),
        recoveryPlan: recovery ? fromUpstream(`Recover as ${recovery.id} asks: ${recovery.response}`, [recovery.id]) : gap(openText('How should it recover, and what evidence is still required')),
        owner: ownerOf(c, c.id)}};
    });
  },
  // Chapter 7: one implementation plan per capability without one, with two operating options.
  7: p => {
    const planned = new Set(list(p.technologyRealisation?.mappings).map(m => m.capabilityId));
    return list(p.technology?.capabilities).filter(c => !planned.has(c.id)).map((c, i) => {
      const name = TECHNOLOGY_CATEGORIES.find(([id]) => id === c.category)?.[1] || c.title, up = [c.id];
      return {key: 'p' + (i + 1), kind: 'guided', title: `${c.title} implementation`, upstream: up, values: {
        capabilityId: fromUpstream(c.id, up), title: inferred(`${c.title} implementation`, {upstream: up}),
        operationsPlan: gap(openText('Who will operate, monitor and support it')), lifecyclePlan: gap(openText('What are the upgrade, migration and exit obligations')),
        optionA: inferred(`Self-managed ${name.toLowerCase()}`, {upstream: up, note: 'One option per operating model; no product is named.'}), operatingA: inferred('Self managed', {upstream: up}),
        optionB: inferred(`Provider-managed ${name.toLowerCase()}`, {upstream: up}), operatingB: inferred('Provider managed', {upstream: up}),
        owner: ownerOf(c, c.id)}};
    });
  },
  // Chapter 8: a contract per hand-over between components in journey order, and one per external actor a component
  // serves; each exchanges the noun its requirement acts on, as a data definition with a key and a status field.
  8: p => {
    const comps = list(p.realisation?.components), reqOf = c => { const lr = list(p.logical?.responsibilities).find(r => list(p.logical?.mappings).some(m => m.physicalId === c.id && m.logicalId === r.id)); return {lr, req: lr && list(p.artefacts).find(a => list(lr.requirementIds).includes(a.id))}; };
    const ordered = comps.map(c => ({c, ...reqOf(c)})).map(x => ({...x, step: x.req ? linkedOfType(p, x.req.id, 'journey')[0] : null})).sort((a, b) => (Number(a.step?.order) || 999) - (Number(b.step?.order) || 999) || a.c.id.localeCompare(b.c.id));
    const exchanged = new Set(list(p.interfaces?.contracts).map(c => c.from + '>' + c.to)), specs = [];
    const contract = (from, to, req, extra = {}) => {
      if (!req) return;
      const noun = objectPhrase(req.title, req.description), cls = classificationOf(p, req), up = uniq([from.c?.id || from.id, typeof to === 'string' ? null : to.id, req.id, ...(extra.upstream || [])]);
      const title = cap(`${extra.verb || 'Pass'} ${noun}`), op = noun.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'exchange';
      specs.push({key: 'i' + (specs.length + 1), kind: 'guided', title, upstream: up, values: {
        from: fromUpstream(from.c?.id || from.id, [from.c?.id || from.id]), to: typeof to === 'string' ? inferred(to, {upstream: up}) : fromUpstream(to.id, [to.id]),
        ...(extra.external ? {externalTitle: fromUpstream(extra.external.title, [extra.external.id]), externalPurpose: extra.external.description ? fromUpstream(extra.external.description, [extra.external.id]) : inferred(`Takes part in the journey as ${extra.external.title}.`, {upstream: [extra.external.id]})} : {}),
        title: inferred(title, {upstream: up}), kind: inferred('request', {upstream: up, note: 'A hand-over the receiver answers; change it for an event or a batch.'}),
        purpose: fromUpstream(`Carries ${noun} for ${req.id} ${req.title}.`, [req.id]), operation: inferred(op, {upstream: [req.id]}), dataTitle: inferred(cap(noun), {upstream: [req.id], note: 'The noun the requirement acts on.'}),
        authorityId: fromUpstream(from.c?.id || from.id, [from.c?.id || from.id], {note: 'The sender publishes it, so it holds it first.'}),
        classification: cls.basis, failurePolicy: gap(openText('What should happen when the outcome is unavailable or uncertain')),
        authorization: QUALITY_CUES.security.test(textOf(req)) ? fromUpstream(`As ${req.id} requires: ${firstSentence(req.description || req.title)}`, [req.id]) : gap(openText('What authorisation is required')),
        // The data's key and status fields, created with it: a stable key named for the noun, and its status.
        keyField: inferred(keyName(noun), {upstream: [req.id], note: `A stable reference for the ${noun}.`}), keyType: inferred('string', {upstream: [req.id]}),
        statusField: inferred('status', {upstream: [req.id], note: `Where the ${noun} stands in the journey, as ${req.id} records it.`}), statusType: inferred('string', {upstream: [req.id]}),
        owner: ownerOf(from.c || from, from.c?.id || from.id)}});
    };
    // Hand-overs follow the journey: the component serving one step passes what its requirement acts on to the one
    // serving the next step. Components whose requirements no journey step requires have no inferred hand-over.
    const stepped = ordered.filter(x => x.step);
    for (let i = 0; i + 1 < stepped.length; i++) { const a = stepped[i], b = stepped[i + 1]; if (a.c.id !== b.c.id && !exchanged.has(a.c.id + '>' + b.c.id)) contract(a, b.c, a.req || b.req, {verb: 'Hand over'}); }
    // External actors (systems, organisations and the public outside the design): a party each, created by the first
    // contract that reaches it and named by the later ones.
    const EXTERNAL = /\b(?:citizens?|customers?|applicants?|patients?|members? of the public|public|residents?|suppliers?|partners?|providers?|carriers?|couriers?|banks?|insurers?|agenc(?:y|ies)|regulators?|government|councils?|systems?|services?|platforms?|gateways?|external|third[- ]part(?:y|ies))\b/i;
    for (const actor of artefacts(p, 'actor').filter(a => EXTERNAL.test(a.title + ' ' + a.description))) {
      const steps = linkedOfType(p, actor.id, 'journey'), first = ordered.find(x => x.step && steps.some(s => s.id === x.step.id)) || ordered[0];
      if (!first) continue;
      const party = doc => list(doc.interfaces?.parties).find(x => words(x.title).join(' ') === words(actor.title).join(' '));
      const s = specs.length; contract(first, 'new-external', first.req, {verb: 'Answer', external: actor, upstream: [actor.id]});
      if (specs[s]) { specs[s].values.to = doc => party(doc) ? fromUpstream(party(doc).id, [party(doc).id, actor.id]) : inferred('new-external', {upstream: [actor.id], note: `A new external participant for ${actor.id} ${actor.title}.`}); }
    }
    // One component and no external actor: the first actor the journey names is the other side of its exchange.
    const actor = artefacts(p, 'actor')[0];
    if (!specs.length && ordered.length && actor && !list(p.interfaces?.contracts).some(c => c.from === ordered[0].c.id)) contract(ordered[0], 'new-external', ordered[0].req, {verb: 'Answer', external: actor, upstream: [actor.id]});
    return specs;
  },
  // Chapter 9: a threat and its control per confidential data definition and per contract with an external party.
  9: p => {
    const threatened = new Set(list(p.security?.threats).flatMap(t => list(t.targetIds))), parties = new Set(list(p.interfaces?.parties).map(x => x.id)), specs = [];
    const data = list(p.interfaces?.data).filter(d => ['Confidential', 'Restricted'].includes(d.classification) && !threatened.has(d.id));
    const external = list(p.interfaces?.contracts).filter(c => (parties.has(c.to) || parties.has(c.from)) && !threatened.has(c.id));
    for (const d of data) specs.push(threat(p, d, 'Data disclosure', `Disclosure of ${d.title}`, `A caller without a need to know reads ${d.title} where it is exchanged or kept by ${titleById(p, d.authorityId)}.`, `${d.classification} information about the journey is exposed.`, d.classification === 'Restricted' ? 'Critical' : 'High', `Follows from the ${d.classification} classification of ${refOf(d)}.`, `Limit access to ${d.title}`, 'Data protection', specs.length));
    for (const c of external) specs.push(threat(p, c, 'Replay or tampering', `Replay or tampering on ${c.title}`, `A party outside the design replays or alters ${c.title} between ${titleById(p, c.from)} and ${titleById(p, c.to)}.`, `A repeated or altered exchange changes the recorded outcome of ${c.title}.`, 'High', `${refOf(c)} crosses to a party outside the design.`, `Check the identity and integrity of ${c.title}`, 'Transaction integrity', specs.length));
    // Resilience beside security (round 6, Contract K): a 'Service disruption' threat and its 'Recovery & availability'
    // control per contract with a party outside the design, and per zone once Chapter 10 exists, in AIW's resilience
    // vocabulary (security-domain.js resilienceDrafts); a target a Service disruption threat already names is drafted no more.
    for (const d of resilienceDrafts(p)) { const up = uniq(d.upstream), t = d.threat, k = d.control; specs.push({key: 's' + (specs.length + 1), kind: 'guided', title: t.title, upstream: up, values: {targetId: fromUpstream(t.targetIds[0], up), title: inferred(t.title, {upstream: up}), category: inferred(t.category, {upstream: up}), scenario: inferred(t.scenario, {upstream: up}), consequence: inferred(t.consequence, {upstream: up}), priority: inferred(t.priority, {upstream: up}), priorityBasis: fromUpstream(t.priorityBasis, up), controlTitle: inferred(k.title, {upstream: up}), controlCategory: inferred(k.category, {upstream: up}), mechanism: inferred(k.mechanism, {upstream: up, note: 'AIW’s resilience vocabulary applied to the recorded contract or zone; confirm each mechanism and its settings with the owner.'}), verificationPlan: inferred(k.verificationPlan, {upstream: up}), owner: d.owner ? fromUpstream(d.owner, [d.objectId]) : gap(OWNER_GAP, 'No owner is named; the person names one.')}}); }
    if (!specs.length) { const c = list(p.interfaces?.contracts).find(x => !threatened.has(x.id)); if (c) specs.push(threat(p, c, 'Unauthorised action', `Unauthorised use of ${c.title}`, `A caller without the required permission invokes ${c.title}.`, `An action on ${c.title} is taken without the authority it needs.`, 'Moderate', `${refOf(c)} is the design's exchange with the least recorded protection.`, `Authorise callers of ${c.title}`, 'Identity & access', specs.length)); }
    return specs;
  },
  // Chapter 10: an operating plan, zone and placement per application component without one.
  10: p => {
    const placed = new Set(list(p.runtime?.plans).map(r => r.assetId));
    return list(p.realisation?.components).filter(c => !placed.has(c.id)).map((c, i) => {
      const need = list(p.technology?.needs).find(n => n.applicationId === c.id), cap = need && list(p.technology?.capabilities).find(x => list(p.technology?.mappings).some(m => m.capabilityId === x.id && m.needId === need.id));
      const boundary = list(p.technology?.boundaries).find(b => b.id === cap?.boundaryId), up = uniq([c.id, cap?.id, boundary?.id]);
      return {key: 'e' + (i + 1), kind: 'guided', title: `${c.title} production design`, upstream: up, values: {
        assetId: fromUpstream(c.id, [c.id]), title: inferred(`${c.title} production design`, {upstream: [c.id]}), stage: inferred('Production design', {upstream: [c.id], note: 'The operating environment designed first; add others as needed.'}),
        zone: boundary ? fromUpstream(`${boundary.title} zone`, [boundary.id]) : gap(openText('Name the placement zone')),
        failureDomain: cap && !placeholder(cap.failureDomain) ? fromUpstream(cap.failureDomain, [cap.id]) : gap(openText('Which shared failure domain does this zone belong to')),
        replicas: inferred('1', {upstream: [c.id], note: 'The smallest count the question accepts: one instance of an application that exists. An assumption until load and failure tests say otherwise.'}),
        minReady: inferred('1', {upstream: [c.id], note: 'No more than the proposed replicas.'}),
        readiness: cap ? fromUpstream(`${c.title} is ready when ${cap.title} answers for it.`, [cap.id]) : gap(openText('What demonstrates readiness to serve')),
        rollback: gap(openText('What triggers rollback and how is it checked')),
        runbook: inferred(`Runbook for ${c.title} still to be written.`, {upstream: [c.id], note: 'The question asks for the procedure still to be written when there is none.'}),
        owner: ownerOf(c, c.id)}};
    });
  },
  // Chapter 11: the SDD's framing from the brief's outcomes and scope and the chain's decisions; its title is the
  // project's name, as the workbench titles every SDD ("<name> — Solution Design", createProject).
  11: (p, B) => {
    const outcomes = artefacts(p, 'outcome'), inScope = artefacts(p, 'scope').filter(s => s.scopeMode !== 'out'), outScope = artefacts(p, 'scope').filter(s => s.scopeMode === 'out'), assumptions = artefacts(p, 'assumption'), decisions = list(p.decisions?.records), stakeholders = artefacts(p, 'stakeholder');
    const n = p.finalReview?.narrative || {};
    if (str(n.summary) || str(n.scope) || str(n.approach)) return [];
    const ids = uniq([...outcomes, ...inScope, ...outScope].flatMap(passagesOf)), first = B.passages[0];
    const summary = outcomes.length ? fromUpstream(`${p.name}: ${outcomes.map(o => str(o.description) || o.title).join(' ')}`, outcomes.map(o => o.id), {passages: ids}) : first ? stated(first.text, [first.id]) : gap(openText('Explain the business intent and the current architecture'));
    const scope = inScope.length || outScope.length || assumptions.length ? fromUpstream([inScope.length ? 'In scope: ' + inScope.map(s => s.title).join('; ') + '.' : '', outScope.length ? 'Out of scope: ' + outScope.map(s => s.title).join('; ') + '.' : '', assumptions.length ? 'Assumptions to confirm: ' + assumptions.map(a => `${a.id} ${a.title}`).join('; ') + '.' : ''].filter(Boolean).join(' '), [...inScope, ...outScope, ...assumptions].map(x => x.id)) : gap(openText('Summarise scope, exclusions and unresolved assumptions'));
    const approach = decisions.length ? fromUpstream(`Decisions to make: ${decisions.slice(0, 6).map(d => `${d.id} ${d.question} (${list(d.alternatives).map(a => a.title).join(' or ') || 'alternatives to record'})`).join('; ')}. Nothing is chosen yet.`, decisions.slice(0, 6).map(d => d.id)) : gap(openText('Explain the chosen approach and the remaining decisions'));
    return [{key: 's1', kind: 'guided', title: `${p.name} — Solution Design`, upstream: uniq([...outcomes, ...decisions].map(x => x.id)), passages: ids, values: {
      title: fromUpstream(`${str(p.name)} — Solution Design`, ['SDD'], {note: 'The project’s name, as the workbench titles every SDD.'}), summary, scope, approach, audience: stakeholders.length ? fromUpstream(stakeholders.map(s => s.title).join(', '), stakeholders.map(s => s.id)) : gap(openText('Who should review and use this SDD')),
      owner: gap(OWNER_GAP, 'The document owner is named by the person.')}}];
  }
};

// Chapter 1 links between context records, a rule per type: an actor or an in-scope boundary to the journey steps it
// shares words with (or the only step), a stakeholder to the outcomes it shares words with (or the only outcome). The
// person reviews every link on the card. A requirement's links are its own answers (the Chapter 1 rule above).
function linksFor(doc, type, x) {
  const text = textOf(x), out = [], sharing = items => items.length === 1 ? items : items.filter(i => overlap(textOf(i), text) > 0);
  if (type === 'actor') for (const j of sharing(artefacts(doc, 'journey'))) out.push(['new', 'participates in', j.id]);
  if (type === 'stakeholder') for (const o of sharing(artefacts(doc, 'outcome'))) out.push(['new', 'owns', o.id]);
  if (type === 'scope' && !/\bout of scope|exclud|not (?:in scope|include)/i.test(text) && x.scopeMode !== 'out') for (const j of sharing(artefacts(doc, 'journey'))) out.push(['new', 'supports', j.id]);
  return out.slice(0, 12);
}
// Classification from the words of the requirement and the brief's constraints.
function classificationOf(p, req) {
  const text = textOf(req) + ' ' + artefacts(p, 'constraint').map(textOf).join(' ');
  if (/\b(?:secret|restricted|health record|medical record|criminal)\b/i.test(text)) return {value: 'Restricted', basis: inferred('Restricted', {upstream: [req.id], note: 'The requirement or a constraint names restricted information.'})};
  if (/\b(?:personal|patient|medical|health|clinical|payments?|refunds?|card|account|bank|identity|address|date of birth|confidential|private|sensitive|salary|tax)\b/i.test(text)) return {value: 'Confidential', basis: inferred('Confidential', {upstream: [req.id], note: 'The requirement or a constraint names personal or financial information.'})};
  return {value: 'Internal', basis: gap('Internal', 'Nothing names the information’s sensitivity; Internal holds until the person classifies it.')};
}
// A data definition's key field, named for the noun it holds ("study room booking" → studyRoomBookingId).
function keyName(noun) {
  const camel = words(noun).slice(0, 3).map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w).join('') || 'record';
  return /^[a-z_]/.test(camel) ? camel + 'Id' : 'recordId';
}
const titleById = (p, id) => [...list(p.realisation?.components), ...list(p.interfaces?.parties), ...list(p.technologyRealisation?.records)].find(x => x.id === id)?.title || id;
function threat(p, target, category, title, scenario, consequence, priority, priorityBasis, controlTitle, controlCategory, i) {
  const up = [target.id], contract = target.exchanges ? target : list(p.interfaces?.contracts).find(c => list(c.exchanges).some(x => x.dataId === target.id));
  return {key: 's' + (i + 1), kind: 'guided', title, upstream: up, values: {
    targetId: fromUpstream(target.id, up), title: inferred(title, {upstream: up}), category: inferred(category, {upstream: up}),
    scenario: inferred(scenario, {upstream: up}), consequence: inferred(consequence, {upstream: up}), priority: inferred(priority, {upstream: up}), priorityBasis: fromUpstream(priorityBasis, up),
    controlTitle: inferred(controlTitle, {upstream: up}), controlCategory: inferred(controlCategory, {upstream: up}),
    mechanism: contract && !placeholder(contract.authorization) && !/^Open question/i.test(contract.authorization) ? fromUpstream(`At ${contract.title}: ${contract.authorization}`, [contract.id]) : gap(openText('Where and how is the control enforced')),
    verificationPlan: inferred(`Attempt “${title}” against ${refOf(target)} and keep the result and the audit trail.`, {upstream: up}),
    owner: ownerOf(target, target.id)}};
}

// ---------------------------------------------------------------- the model's rules

// What the model states for each chapter, as record specs of the same shape as RULES' (Contract I's mapping): person →
// actor; stakeholder → stakeholder; process and task → journey step; requirement, outcome and constraint → their
// Chapter 1 kinds; driver → Chapter 2; decision and alternative → Chapter 3; system (internal), container and
// component → Chapter 4 responsibility; system and container → Chapter 5 component; service, capability and technology →
// Chapter 6 capability; a technology named on a component → Chapter 7 option; relationships between containers or to an
// external system, and interfaces → Chapter 8 contract (event when the words say so), with the data they touch;
// environment, node and instance → Chapter 10. An element the project already holds (same kind of record, same title
// words) is not drafted again. A value is stated when the model's line holds its words, else inferred from that line.
const elText = e => [e.name, e.description, e.technology, ...e.tags].join(' ');
const APP_KINDS = new Set(['system', 'container', 'component']);
const hasParts = (M, e) => list(M.children.get(e.id)).some(c => c.kind === 'container' || c.kind === 'component');
const whole = (M, e) => e.kind === 'system' && hasParts(M, e);
const named = (records, name) => records.find(r => titleKey(r.title) === titleKey(name)) || null;
const ASYNC = /\b(?:async\w*|publish\w*|subscrib\w*|events?|queues?|topics?|messag\w*|streams?|brokers?|notif\w*)\b/i;
const COMPONENT_ROLE = [[/\b(?:database|db|store|storage|table|ledger|repository|cache|file|bucket|warehouse|lake)\b/i, 'store'], [/\b(?:queue|topic|broker|bus|stream|kafka|mq|events?)\b/i, 'queue'], [/\b(?:adapter|gateway|connector|proxy|bridge|integration|protocol)\b/i, 'adapter'], [/\b(?:worker|job|batch|scheduler|cron|processor|pipeline)\b/i, 'worker'], [/\b(?:module|library|package)\b/i, 'module']];
const roleOfElement = el => { const t = [el.technology, ...el.tags, el.name].join(' '); return COMPONENT_ROLE.find(([re]) => re.test(t))?.[1] || (el.kind === 'component' ? 'module' : 'service'); };
const TECH_CATEGORY = [[/\b(?:database|db|sql|store|storage|table|ledger|repository|persist\w*|transaction\w*)\b/i, 'transactional'], [/\b(?:queue|topic|broker|bus|stream|messag\w*|events?|kafka|mq|publish\w*)\b/i, 'messaging'], [/\b(?:cache|caching|redis|memcache)\b/i, 'caching'], [/\b(?:identity|auth\w*|sso|login|token|iam)\b/i, 'identity'], [/\b(?:network|gateway|api gateway|load balancer|dns|cdn|proxy|connect\w*|vpn|firewall|protocol)\b/i, 'connectivity'], [/\b(?:monitor\w*|logging|logs?|metrics?|tracing|observab\w*|alert\w*)\b/i, 'observability'], [/\b(?:backup|snapshot|archive)\b/i, 'backup'], [/\b(?:recover\w*|failover|standby|disaster)\b/i, 'recovery']];
const categoryOfElement = el => TECH_CATEGORY.find(([re]) => re.test(elText(el)))?.[1] || 'compute';
const stageOfName = name => /\b(?:prod\w*|live)\b/i.test(name) ? 'Production design' : /\b(?:test\w*|staging|stage|uat|pre-?prod\w*|qa|acceptance|preview)\b/i.test(name) ? 'Pre-production design' : /\b(?:dev\w*|sandbox|local)\b/i.test(name) ? 'Development design' : /\b(?:dr|disaster|recovery|failover|standby)\b/i.test(name) ? 'Recovery design' : null;
const slug = s => str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'exchange';
// The requirement a model element develops: the one sharing most words with it, else the first, said so.
function requirementFor(p, el, extra = {}) {
  const reqs = artefacts(p, 'requirement'), req = best(reqs, elText(el));
  if (req) return {req, value: inferred(req.id, {upstream: [req.id], passages: el.passages, note: `Shares the most words with ${req.id} ${req.title}.`, ...extra})};
  if (reqs[0]) return {req: reqs[0], value: gap(reqs[0].id, 'No requirement shares words with it; the first holds until you choose.')};
  return {req: null, value: gap('', 'No requirement to develop; draft Chapter 1 first.')};
}
// The steps of a process in the order its flows run: a walk from the elements nothing flows into, then what is left in
// the order the model lists it. Tasks and processes only; a sub-process is a step, and so are the tasks inside it.
function processOrder(M) {
  // A task of the implementation-and-migration layer (an ArchiMate work package) is work on the design, not a step of the journey.
  const flowKinds = new Set(['sequence', 'triggers']), step = e => (e.kind === 'task' || e.kind === 'process') && e.attrs.layer !== 'implementation', node = e => step(e) || e.kind === 'event' || e.kind === 'gateway';
  const steps = M.elements.filter(step), flows = M.relationships.filter(r => flowKinds.has(r.kind));
  if (!flows.length) return steps;
  const inside = e => { const parent = M.els.get(e.parent); return !!parent && step(parent); }, noIncoming = e => !flows.some(r => r.to === e.id);
  // The walk starts at the top level; a sub-process's own start and a task's boundary events are reached from it.
  const seen = new Set(), order = [], queue = M.elements.filter(e => node(e) && noIncoming(e) && !inside(e) && e.attrs.position !== 'boundary');
  while (queue.length) {
    const e = queue.shift();
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    if (step(e)) order.push(e);
    const next = [...list(M.children.get(e.id)).filter(c => node(c) && noIncoming(c)), ...M.elements.filter(b => b.kind === 'event' && b.attrs.attachedTo === e.id), ...list(M.out.get(e.id)).filter(r => flowKinds.has(r.kind)).map(r => M.els.get(r.to))];
    for (const n of next) if (n && !seen.has(n.id)) queue.push(n);
  }
  return [...order, ...steps.filter(s => !seen.has(s.id))];
}
// The process elements and flows that follow the journey steps' commit (BPMN): events and gateways as process.element,
// sequence and message flows as process.transition between the steps the chapter made and those elements. An element
// made in this batch is named by a reference the applier resolves ("@ref:model:E-007"); a flow whose end is neither a
// step nor such an element (a pool, a data object) is not drafted.
const REF = '@ref:model:';
const EVENT_TYPES = new Set(['none', 'message', 'timer', 'error', 'signal']), GATEWAY_TYPES = new Set(['exclusive', 'parallel', 'inclusive', 'event']);
function processExtras(doc, M) {
  const steps = artefacts(doc, 'journey'), stepOf = el => named(steps, el.name), out = [], seen = new Set();
  const laneOf = el => { let e = M.els.get(el.parent); while (e && e.kind !== 'lane' && e.kind !== 'pool') e = M.els.get(e.parent); return e?.name || ''; };
  const idOf = el => !el ? null : el.kind === 'task' || el.kind === 'process' ? stepOf(el)?.id || null : el.kind === 'event' || el.kind === 'gateway' ? REF + el.id : null;
  const source = x => `${M.name}${x.passages.length ? ' · ' + x.passages.join(', ') : ''}`;
  // A BPMN sub-process that became a journey step also stands in the process model as a sub-process element, so the
  // events and gateways inside it can name it (Contract T: parentId names a sub-process element).
  const subs = new Map();
  for (const el of M.elements.filter(e => e.kind === 'event' || e.kind === 'gateway')) {
    const parentEl = M.els.get(el.parent); if (!parentEl || !(parentEl.kind === 'task' || parentEl.kind === 'process') || !stepOf(parentEl) || subs.has(parentEl.id)) continue;
    const ref = REF + parentEl.id + ':sub'; subs.set(parentEl.id, ref);
    out.push({type: 'process.element', ref, payload: {kind: 'subprocess', title: clip(parentEl.name, 160), purpose: clip(parentEl.description, 1000), lane: clip(laneOf(parentEl), 100) || 'Unassigned', owner: '', source: clip(source(parentEl), 600), sourceLocator: clip(parentEl.passages.join(', '), 240), requirementIds: [], eventType: '', position: '', attachedTo: '', gatewayType: '', parentId: '', partyId: '', dataId: ''}});
  }
  for (const el of M.elements.filter(e => e.kind === 'event' || e.kind === 'gateway')) {
    const a = el.attrs, parentEl = M.els.get(el.parent);
    out.push({type: 'process.element', ref: REF + el.id, payload: {kind: el.kind, title: clip(el.name, 160), purpose: clip(el.description, 1000), lane: clip(laneOf(el), 100) || 'Unassigned', owner: '', source: clip(source(el), 600), sourceLocator: clip(el.passages.join(', '), 240), requirementIds: [], eventType: el.kind === 'event' ? (EVENT_TYPES.has(a.eventType) ? a.eventType : 'none') : '', position: el.kind === 'event' ? (['start', 'intermediate', 'end', 'boundary'].includes(a.position) ? a.position : 'intermediate') : '', attachedTo: a.attachedTo ? idOf(M.els.get(a.attachedTo)) || '' : '', gatewayType: el.kind === 'gateway' ? (GATEWAY_TYPES.has(a.gatewayType) ? a.gatewayType : 'exclusive') : '', parentId: (parentEl && subs.get(parentEl.id)) || '', partyId: '', dataId: ''}});
  }
  for (const r of M.relationships.filter(r => r.kind === 'sequence' || r.kind === 'message')) {
    const a = M.els.get(r.from), b = M.els.get(r.to), from = idOf(a), to = idOf(b);
    if (!from || !to || from === to || seen.has(from + '>' + to)) continue;
    seen.add(from + '>' + to);
    const fromGateway = a.kind === 'gateway';
    out.push({type: 'process.transition', payload: {from, to, label: clip(r.label || `${a.name} → ${b.name}`, 100), condition: clip(r.attrs.condition || (fromGateway ? `No condition stated in the model for ${r.label || 'this path'}.` : `Follows when ${a.name} completes.`), 600), kind: r.kind, contractId: '', owner: '', source: clip(source(r), 600), sourceLocator: clip(r.passages.join(', '), 240)}});
  }
  return out;
}
// Deep-maps the "@ref:" strings of a command's payload to the ids the earlier commands made; an unresolved one stays.
export function resolveRefs(value, refs) {
  if (typeof value === 'string') return value.startsWith(REF) && refs.has(value) ? refs.get(value) : value;
  if (Array.isArray(value)) return value.map(v => resolveRefs(v, refs));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, refs)]));
  return value;
}
export const isRef = value => typeof value === 'string' && value.startsWith(REF);

const MODEL_RULES = {
  // Chapter 1: the model's people, stakeholders, outcomes, steps (in flow order), constraints and requirements; the
  // process elements and flows follow the last step. An actor's links go to the steps the model relates it to.
  1: (p, M) => {
    const specs = [], known = new Set(list(p.artefacts).map(a => a.type + ':' + titleKey(a.title))), seen = new Set();
    const take = (type, els) => els.filter(e => { const k = type + ':' + titleKey(e.name); if (known.has(k) || seen.has(k)) return false; seen.add(k); return true; });
    const source = el => inferred(`${M.name}${el.passages.length ? ' · ' + el.passages.join(', ') : ''}`, {passages: el.passages, note: 'The model file and the lines the record was read from.'});
    const common = (type, el) => ({type: inferred(type, {passages: el.passages, note: `The model interpreter read ${el.passages.join(', ') || 'the model'} (${el.attrs.xsiType || el.attrs.c4Type || el.attrs.macro || el.attrs.type || el.kind}) as ${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}.`}), title: fromModel(M, el.name, el.passages), description: el.description ? fromModel(M, el.description, el.passages) : gap(openText('Describe it in the project’s own terms')), owner: gap('', 'The model names no owner.'), source: source(el)});
    const push = (type, el, extra = {}) => { specs.push({key: 'm' + (specs.length + 1), kind: 'guided', type, title: clip(el.name, 120), passages: el.passages, source: 'model', element: el.id, values: {...common(type, el), ...extra}}); return specs.at(-1); };
    for (const el of take('actor', M.elements.filter(e => e.kind === 'person'))) push('actor', el).extras = (doc, created) => M.relationships.filter(r => r.from === el.id).map(r => named(artefacts(doc, 'journey'), M.els.get(r.to)?.name || '')).filter(Boolean).slice(0, 12).map(j => ({type: 'relationship', payload: {from: created[0], to: j.id, kind: 'participates in'}}));
    for (const el of take('stakeholder', M.elements.filter(e => e.kind === 'stakeholder'))) push('stakeholder', el);
    for (const el of take('outcome', M.elements.filter(e => e.kind === 'outcome'))) push('outcome', el);
    const steps = take('journey', processOrder(M));
    steps.forEach((el, i) => push('journey', el, {order: inferred(String(i + 1), {passages: el.passages, note: 'Its place along the model’s flows.'})}));
    for (const el of take('constraint', M.elements.filter(e => e.kind === 'constraint'))) push('constraint', el);
    const linkTo = (type, el, onlyOne) => doc => { const items = artefacts(doc, type), top = best(items, elText(el)) || (onlyOne && items.length === 1 ? items[0] : null); return top ? inferred(top.id, {upstream: [top.id], note: overlap(textOf(top), elText(el)) ? `Shares the most words with ${top.id} ${top.title}.` : `The only ${type} the project holds.`}) : gap('', `No ${type} shares words with it.`); };
    for (const el of take('requirement', M.elements.filter(e => e.kind === 'requirement'))) push('requirement', el, {acceptance: gap(openText('What observable result would demonstrate this behaviour')), owner: gap(OWNER_GAP, 'The model names no owner for this requirement.'), journeyId: linkTo('journey', el, true), outcomeId: linkTo('outcome', el, true), constraintId: linkTo('constraint', el, false), assumptionId: linkTo('assumption', el, false)});
    const last = specs.filter(s => s.type === 'journey').at(-1);
    if (last && M.elements.some(e => e.kind === 'event' || e.kind === 'gateway')) last.extras = doc => processExtras(doc, M);
    return specs;
  },
  // Chapter 2: a quality scenario per driver the model names.
  2: (p, M) => {
    const have = new Set(list(p.quality?.drivers).map(d => titleKey(d.title)));
    return M.elements.filter(e => e.kind === 'driver' && !have.has(titleKey(e.name))).map((el, i) => {
      const {req, value} = requirementFor(p, el), up = req ? [req.id] : [], category = qualityOf(elText(el));
      return {key: 'mq' + (i + 1), kind: 'guided', title: clip(el.name, 120), source: 'model', element: el.id, passages: el.passages, upstream: up, values: {
        requirementId: value, title: fromModel(M, el.name, el.passages), category: category ? inferred(category, {passages: el.passages, note: 'Chosen from the cue words of the driver.'}) : gap(QUALITY_TYPES[0].id, 'No quality cue word in the driver; choose the quality it makes measurable.'),
        response: el.description ? fromModel(M, el.description, el.passages) : gap(openText('What must the system do in response')), priority: gap('', 'A driver the model names; its priority is not stated.'),
        rationale: el.description ? fromModel(M, el.description, el.passages) : inferred(`${el.name} is a driver the model names.`, {passages: el.passages}), owner: gap(OWNER_GAP)}};
    });
  },
  // Chapter 3: a decision per decision the model (a MADR record, public/madr.js) names; the chosen alternative first,
  // then the next one the record considers, as the two options the guide asks for. The record's "Good, because" and
  // "Bad, because" lines are the trade-off; its "because" clause is how the chosen approach works when nothing else says.
  3: (p, M) => {
    const drivers = list(p.quality?.drivers), decided = new Set(list(p.decisions?.records).map(d => titleKey(d.question)));
    const stances = x => [['Good', x.good], ['Bad', x.bad], ['Neutral', x.neutral]].filter(([, v]) => list(v).length).map(([w, v]) => `${w}: ${list(v).map(v => str(v).replace(/[.;,\s]+$/, '')).filter(Boolean).join('; ')}.`).join(' ');
    return M.elements.filter(e => e.kind === 'decision' && !decided.has(titleKey(e.name))).map((el, i) => {
      const all = M.elements.filter(x => x.kind === 'alternative' && x.parent === el.id), alts = [...all.filter(x => x.attrs.chosen === true), ...all.filter(x => x.attrs.chosen !== true)], a = el.attrs;
      const {req, value} = requirementFor(p, {...el, description: el.description + ' ' + alts.map(elText).join(' ')});
      const driver = (req && drivers.find(d => list(d.requirementIds).includes(req.id))) || drivers[0] || null, up = uniq([req?.id, driver?.id]);
      const because = str(a.outcome?.because);
      const option = (alt, letter) => {
        if (!alt) return {};
        const trade = str(alt.attrs.tradeoff) || stances(alt.attrs), approach = str(alt.description) || (alt.attrs.chosen === true && because ? because : '');
        return {['option' + letter]: fromModel(M, alt.name, alt.passages), ['approach' + letter]: approach ? fromModel(M, approach, uniq([...alt.passages, ...el.passages]), alt.attrs.chosen === true && !str(alt.description) ? {note: 'The reason the record gives for choosing it.'} : {}) : gap(openText(`Explain how the ${letter === 'A' ? 'first' : 'second'} approach works`)), ['tradeoff' + letter]: trade ? fromModel(M, trade, alt.passages, {note: 'The good and bad lines the record gives it.'}) : gap(openText('What does it gain, cost or put at risk'))};
      };
      return {key: 'md' + (i + 1), kind: 'guided', title: clip(el.name, 120), source: 'model', element: el.id, passages: uniq([...el.passages, ...alts.flatMap(x => x.passages)]), upstream: up, values: {
        requirementId: value, driverId: driver ? (req && list(driver.requirementIds).includes(req.id) ? fromUpstream(driver.id, [driver.id]) : gap(driver.id, 'No quality driver shapes the chosen requirement; the first holds until you choose.')) : gap('', 'No quality driver to decide with; draft Chapter 2 first.'),
        question: fromModel(M, el.name, el.passages), context: str(a.context || el.description) ? fromModel(M, a.context || el.description, el.passages) : gap(openText('Which constraints and conditions govern that choice')),
        ...option(alts[0], 'A'), ...option(alts[1], 'B'), owner: gap(OWNER_GAP)}};
    });
  },
  // Chapter 4: a responsibility per internal system, container and component the model draws (a system that has
  // containers is the whole, not a responsibility).
  4: (p, M, ctx) => {
    if (!artefacts(p, 'requirement').length) { ctx.note = 'Chapter 4 develops a requirement; draft Chapter 1 first.'; return []; }
    const have = new Set(list(p.logical?.responsibilities).map(r => titleKey(r.title)));
    return M.elements.filter(e => APP_KINDS.has(e.kind) && !e.external && !whole(M, e) && !have.has(titleKey(e.name))).map((el, i) => {
      const {req, value} = requirementFor(p, el), siblings = M.elements.filter(x => x.id !== el.id && x.parent === el.parent && APP_KINDS.has(x.kind) && !whole(M, x)).slice(0, 4);
      return {key: 'ml' + (i + 1), kind: 'guided', title: clip(el.name, 120), source: 'model', element: el.id, passages: el.passages, upstream: req ? [req.id] : [], values: {
        requirementId: value, title: fromModel(M, el.name, el.passages),
        purpose: el.description ? fromModel(M, el.description, el.passages) : inferred(`${el.name}${el.technology ? ' (' + el.technology + ')' : ''}, as the model draws it.`, {passages: el.passages}),
        boundary: siblings.length ? inferred(`Outside: ${siblings.map(s => s.name).join('; ')}.`, {passages: uniq(siblings.flatMap(s => s.passages)), note: 'The elements the model draws beside it.'}) : gap(openText('What belongs outside it')),
        owner: gap(OWNER_GAP, 'The model names no owner.')}};
    });
  },
  // Chapter 5: an application component per internal system and container, realising the responsibility of the same
  // name; its role from the technology, tags and name the model gives it; its inputs and outputs from its relationships.
  5: (p, M, ctx) => {
    const resp = list(p.logical?.responsibilities);
    if (!resp.length) { ctx.note = 'Chapter 5 realises a responsibility; draft Chapter 4 first.'; return []; }
    const have = new Set(list(p.realisation?.components).map(c => titleKey(c.title)));
    return M.elements.filter(e => (e.kind === 'system' || e.kind === 'container') && !e.external && !whole(M, e) && !have.has(titleKey(e.name))).map((el, i) => {
      const same = named(resp, el.name), close = same || best(resp, elText(el)), chosen = close || resp[0], role = roleOfElement(el);
      const inc = list(M.into.get(el.id)).filter(r => !['composes', 'realizes', 'assigned'].includes(r.kind)), out = list(M.out.get(el.id)).filter(r => !['composes', 'realizes', 'assigned', 'accesses'].includes(r.kind)), nameOf = id => M.els.get(id)?.name || id;
      return {key: 'ma' + (i + 1), kind: 'guided', title: clip(el.name, 120), source: 'model', element: el.id, passages: el.passages, upstream: [chosen.id], values: {
        logicalId: same ? inferred(same.id, {upstream: [same.id], passages: el.passages, note: 'The responsibility of the same name.'}) : close ? inferred(close.id, {upstream: [close.id], passages: el.passages, note: `Shares the most words with ${refOf(close)} ${close.title}.`}) : gap(chosen.id, 'No responsibility matches it; the first holds until you choose.'),
        title: fromModel(M, el.name, el.passages), kind: inferred(role, {passages: el.passages, note: 'From the technology, tags and name the model gives it.'}),
        boundary: el.description ? fromModel(M, el.description, el.passages) : inferred(`Owns what the model draws as ${el.name}${el.technology ? ' (' + el.technology + ')' : ''}.`, {passages: el.passages}),
        inputs: inc.length ? inferred(inc.slice(0, 6).map(r => `${nameOf(r.from)}${r.label ? ': ' + lower(r.label) : ''}`).join('; ') + '.', {passages: uniq(inc.flatMap(r => r.passages)), note: 'What the model draws flowing into it.'}) : gap(openText('What does it receive, and from whom')),
        outputs: out.length ? inferred(out.slice(0, 6).map(r => `${r.label ? cap(r.label) + ' to ' : 'To '}${nameOf(r.to)}`).join('; ') + '.', {passages: uniq(out.flatMap(r => r.passages)), note: 'What the model draws flowing out of it.'}) : gap(openText('What does it provide, and to whom')),
        owner: gap(OWNER_GAP, 'The model names no owner.')}};
    });
  },
  // Chapter 6: a capability per service, capability and technology element, supporting the component the model relates
  // it to (else the one sharing most words with it).
  6: (p, M, ctx) => {
    const comps = list(p.realisation?.components);
    if (!comps.length) { ctx.note = 'Chapter 6 supports an application component; draft Chapter 5 first.'; return []; }
    const have = new Set(list(p.technology?.capabilities).map(c => titleKey(c.title)));
    return M.elements.filter(e => ['service', 'capability', 'technology'].includes(e.kind) && !have.has(titleKey(e.name))).map((el, i) => {
      const related = [...list(M.out.get(el.id)).map(r => M.els.get(r.to)), ...list(M.into.get(el.id)).map(r => M.els.get(r.from)), M.els.get(el.parent)].filter(x => x && APP_KINDS.has(x.kind));
      const app = related.map(x => named(comps, x.name)).find(Boolean) || best(comps, elText(el)) || comps[0], category = categoryOfElement(el), name = TECHNOLOGY_CATEGORIES.find(([id]) => id === category)?.[1] || category, up = [app.id];
      return {key: 'mt' + (i + 1), kind: 'guided', title: clip(el.name, 120), source: 'model', element: el.id, passages: el.passages, upstream: up, values: {
        applicationId: related.length && named(comps, related[0].name) ? inferred(app.id, {upstream: up, passages: el.passages, note: 'The component the model relates it to.'}) : inferred(app.id, {upstream: up, passages: el.passages, note: `Shares the most words with ${refOf(app)} ${app.title}.`}),
        category: inferred(category, {passages: el.passages, note: `${name} from the words the model gives it.`}),
        need: el.description ? fromModel(M, el.description, el.passages) : inferred(`${refOf(app)} ${app.title} needs ${lower(el.name)}, as the model draws it.`, {upstream: up, passages: el.passages}),
        title: fromModel(M, el.name, el.passages), boundary: inferred(`Provides ${lower(el.name)} to ${refOf(app)} ${app.title}; the application's own logic and data rules stay with the application.`, {upstream: up}),
        trustName: inferred(`${el.name} trust boundary`, {passages: el.passages}), trustPolicy: gap(openText('What controls crossing this trust boundary')), failureDomain: gap(openText('Which failure domain contains it')), recoveryPlan: gap(openText('How should it recover, and what evidence is still required')),
        owner: gap(OWNER_GAP, 'The model names no owner.')}};
    });
  },
  // Chapter 7: an implementation plan per capability without one whose component the model names a technology for:
  // the first option is that technology, the second a provider-managed alternative.
  7: (p, M) => {
    const planned = new Set(list(p.technologyRealisation?.mappings).map(m => m.capabilityId)), specs = [];
    for (const c of list(p.technology?.capabilities).filter(c => !planned.has(c.id))) {
      const needs = list(p.technology?.needs).filter(n => list(p.technology?.mappings).some(m => m.capabilityId === c.id && m.needId === n.id)), apps = needs.map(n => list(p.realisation?.components).find(x => x.id === n.applicationId)).filter(Boolean);
      const els = [...apps.map(a => M.elements.find(e => APP_KINDS.has(e.kind) && titleKey(e.name) === titleKey(a.title))), M.elements.find(e => (e.kind === 'technology' || e.kind === 'service') && titleKey(e.name) === titleKey(c.title))].filter(Boolean);
      const el = els.find(e => e.technology) || els.find(e => e.kind === 'technology'), tech = el ? el.technology || el.name : '';
      if (!tech) continue;
      const name = TECHNOLOGY_CATEGORIES.find(([id]) => id === c.category)?.[1] || c.title, up = [c.id];
      specs.push({key: 'mp' + (specs.length + 1), kind: 'guided', title: `${c.title} implementation`, source: 'model', element: el.id, passages: el.passages, upstream: up, values: {
        capabilityId: fromUpstream(c.id, up), title: inferred(`${c.title} implementation`, {upstream: up}),
        operationsPlan: gap(openText('Who will operate, monitor and support it')), lifecyclePlan: gap(openText('What are the upgrade, migration and exit obligations')),
        optionA: fromModel(M, tech, el.passages, {note: 'The technology the model names.'}), operatingA: inferred('Self managed', {passages: el.passages, note: 'The model names the technology, not who operates it.'}),
        optionB: inferred(`Provider-managed ${name.toLowerCase()}`, {upstream: up, note: 'A genuinely different operating model for the same need.'}), operatingB: inferred('Provider managed', {upstream: up}),
        owner: ownerOf(c, c.id)}});
    }
    return specs;
  },
  // Chapter 8: a contract per relationship between application elements (the caller first: a serving relationship is
  // read from the served side) and per interface the model draws, from the component of the same name to the component
  // or external party on the other side; the data it touches, else the noun its label names. A relationship from an
  // external system into the design, or from an element that is not yet a component, is left for the person.
  8: (p, M, ctx) => {
    const comps = list(p.realisation?.components);
    if (!comps.length) { ctx.note = 'Chapter 8 exchanges between application components; draft Chapter 5 first.'; return []; }
    const compOf = el => named(comps, el.name), exchanged = new Set(list(p.interfaces?.contracts).map(c => c.from + '>' + c.to)), partyOf = name => list(p.interfaces?.parties).find(x => titleKey(x.title) === titleKey(name)) || null, seen = new Set(), specs = [], left = [];
    const dataOf = (a, b) => { const touched = [...list(M.out.get(a.id)), ...list(M.out.get(b.id))].filter(r => r.kind === 'accesses').map(r => M.els.get(r.to)).find(d => d?.kind === 'data'); return touched || list(M.children.get(b.id)).find(d => d.kind === 'data') || null; };
    const contract = (a, b, r, labelText) => {
      if (!a || !b || a.external && b.external || whole(M, a) || whole(M, b)) return;
      const from = compOf(a), to = b.external ? null : compOf(b);
      if (!from || (!to && !b.external)) { left.push(`${a.name} → ${b.name}`); return; }
      const key = from.id + '>' + (to?.id || partyOf(b.name)?.id || 'ext:' + titleKey(b.name));
      if (seen.has(key) || exchanged.has(key)) return;
      seen.add(key);
      const label = str(labelText), title = label ? cap(label) : `${a.name} to ${b.name}`, async = r?.kind === 'flow' || r?.kind === 'message' || ASYNC.test([label, r?.technology, b.name, b.technology, ...b.tags].join(' ')), data = dataOf(a, b);
      const noun = data ? data.name : objectPhrase(title) || `${lower(a.name)} message`, passages = uniq([...(r?.passages || []), ...a.passages, ...b.passages]), up = uniq([from.id, to?.id]);
      const party = doc => list(doc.interfaces?.parties).find(x => titleKey(x.title) === titleKey(b.name));
      specs.push({key: 'mi' + (specs.length + 1), kind: 'guided', title: clip(title, 120), source: 'model', element: r?.id || b.id, passages, upstream: up, values: {
        from: fromUpstream(from.id, [from.id]), to: to ? fromUpstream(to.id, [to.id]) : doc => party(doc) ? fromUpstream(party(doc).id, [party(doc).id]) : inferred('new-external', {passages: b.passages, note: `A new external participant for ${b.name}, as the model draws it.`}),
        externalTitle: fromModel(M, b.name, b.passages), externalPurpose: b.description ? fromModel(M, b.description, b.passages) : inferred(`Takes part as the model draws it: ${b.name}.`, {passages: b.passages}),
        title: r ? fromModel(M, title, r.passages) : inferred(title, {passages}), kind: inferred(async ? 'event' : 'request', {passages: r?.passages || passages, note: async ? (r?.kind === 'flow' || r?.kind === 'message' ? 'The model draws it as a flow or a message: something passes without a reply.' : 'The model names an asynchronous channel.') : 'A call the receiver answers; change it for an event or a batch.'}),
        purpose: inferred(`${title}${r?.technology ? ' over ' + r.technology : ''}, as the model draws it.`, {passages}), operation: inferred(slug(label || title), {passages}),
        dataTitle: data ? fromModel(M, data.name, data.passages, {note: 'The data the model draws it touching.'}) : inferred(cap(noun), {passages, note: 'The noun the relationship names.'}),
        keyField: inferred(keyName(noun), {passages, note: `A stable reference for the ${lower(noun)}.`}), keyType: inferred('string', {passages}), statusField: inferred('status', {passages, note: `Where the ${lower(noun)} stands in the exchange.`}), statusType: inferred('string', {passages}),
        authorityId: fromUpstream(from.id, [from.id], {note: 'The sender publishes it, so it holds it first.'}), classification: gap('Internal', 'Nothing in the model names the information’s sensitivity; Internal holds until the person classifies it.'),
        failurePolicy: gap(openText('What should happen when the outcome is unavailable or uncertain')), authorization: gap(openText('What authorisation is required')), owner: gap(OWNER_GAP, 'The model names no owner.')}});
    };
    for (const r of M.relationships) {
      const a = M.els.get(r.from), b = M.els.get(r.to);
      if (!a || !b || !APP_KINDS.has(a.kind) || !APP_KINDS.has(b.kind)) continue;
      if (['composes', 'realizes', 'assigned', 'accesses', 'sequence', 'message'].includes(r.kind)) continue;
      if (r.kind === 'serves') contract(b, a, r, r.label); else contract(a, b, r, r.label);
    }
    for (const el of M.elements.filter(e => e.kind === 'interface')) {
      const owner = M.els.get(el.parent) || list(M.into.get(el.id)).filter(r => r.kind === 'composes').map(r => M.els.get(r.from)).find(Boolean);
      for (const r of list(M.out.get(el.id)).filter(r => r.kind === 'serves')) contract(M.els.get(r.to), owner, {...r, passages: uniq([...r.passages, ...el.passages])}, el.name);
    }
    const orphans = M.elements.filter(d => d.kind === 'data' && !d.attrs.standsFor && !M.relationships.some(r => r.from === d.id || r.to === d.id) && !M.els.get(d.parent)).length;
    const notes = [left.length ? `${left.length} relationship${left.length === 1 ? '' : 's'} into the design from outside, or from an element that is not yet a component, ${left.length === 1 ? 'is' : 'are'} not drafted: ${left.slice(0, 4).join('; ')}.` : '', orphans ? `${orphans} data element${orphans === 1 ? '' : 's'} no relationship exchanges ${orphans === 1 ? 'is' : 'are'} not drafted; add ${orphans === 1 ? 'it' : 'them'} in Chapter 8.` : ''].filter(Boolean);
    if (notes.length) ctx.note = notes.join(' ');
    return specs;
  },
  // Chapter 10: an operating plan per component the model places: an instance in a node (Structurizr), or a node that
  // realises or is assigned the component (ArchiMate). The zone is the node, the failure domain the outermost node, the
  // stage from the environment's name, the replicas the count the model states.
  10: (p, M, ctx) => {
    const comps = list(p.realisation?.components);
    if (!comps.length) { ctx.note = 'Chapter 10 places an application component; draft Chapter 5 first.'; return []; }
    const placed = new Set(list(p.runtime?.plans).map(r => r.assetId)), chain = el => { const out = []; let e = M.els.get(el.parent); while (e && out.length < 12) { out.push(e); e = M.els.get(e.parent); } return out; };
    const placements = [];
    // The replica count is the instance count the model states on the innermost node (its line is cited).
    const counted = nodes => nodes.find(n => /^\d+$/.test(str(n.attrs.instances))) || null;
    for (const inst of M.elements.filter(e => e.kind === 'instance')) { const target = M.els.get(inst.attrs.of), comp = target && named(comps, target.name), nodes = chain(inst); if (comp) placements.push({comp, el: inst, nodes, counted: counted(nodes)}); }
    for (const r of M.relationships.filter(r => ['assigned', 'realizes', 'composes'].includes(r.kind))) { const node = M.els.get(r.from), app = M.els.get(r.to); if (node?.kind !== 'node' || !app || !APP_KINDS.has(app.kind)) continue; const comp = named(comps, app.name), nodes = [node, ...chain(node)]; if (comp) placements.push({comp, el: node, nodes, counted: counted(nodes), passages: r.passages}); }
    const seen = new Set(), specs = [];
    for (const pl of placements) {
      if (placed.has(pl.comp.id) || seen.has(pl.comp.id)) continue;
      seen.add(pl.comp.id);
      const env = pl.nodes.find(e => e.kind === 'environment') || (pl.el.attrs.environment ? M.els.get(pl.el.attrs.environment) : null), nodes = pl.nodes.filter(e => e.kind === 'node' || e.kind === 'zone'), zone = nodes[0] || null, outer = nodes.length > 1 ? nodes.at(-1) : null;
      const stage = env ? stageOfName(env.name) : stageOfName(nodes.map(n => n.name).join(' ')), passages = uniq([...(pl.passages || []), ...pl.el.passages, ...(env?.passages || []), ...(zone?.passages || [])]), up = [pl.comp.id];
      const replicas = pl.counted && Number(pl.counted.attrs.instances) >= 1 ? String(Number(pl.counted.attrs.instances)) : '';
      specs.push({key: 'me' + (specs.length + 1), kind: 'guided', title: `${pl.comp.title} ${env ? lower(env.name) : 'production'} design`, source: 'model', element: pl.el.id, passages, upstream: up, values: {
        assetId: fromUpstream(pl.comp.id, up), title: inferred(`${pl.comp.title} ${env ? env.name : 'production'} design`, {upstream: up, passages}),
        stage: stage ? inferred(stage, {passages: env?.passages || passages, note: `From the name "${env?.name || zone?.name}" the model gives it.`}) : gap('Production design', 'The model names no environment stage; the first holds until you choose.'),
        zone: zone ? fromModel(M, zone.name, zone.passages) : gap(openText('Name the placement zone')),
        failureDomain: outer ? fromModel(M, outer.name, outer.passages, {note: 'The outermost node the model places it in.'}) : gap(openText('Which shared failure domain does this zone belong to')),
        replicas: replicas ? fromModel(M, replicas, uniq([...pl.counted.passages, ...pl.el.passages]), {note: `The instance count the model states on ${pl.counted.name}; an assumption until load and failure tests say otherwise.`}) : inferred('1', {passages: pl.el.passages, note: 'One instance, as the model draws it; an assumption until load and failure tests say otherwise.'}),
        minReady: inferred('1', {upstream: up, note: 'No more than the proposed replicas.'}), readiness: gap(openText('What demonstrates readiness to serve')), rollback: gap(openText('What triggers rollback and how is it checked')),
        runbook: inferred(`Runbook for ${pl.comp.title} still to be written.`, {upstream: up, note: 'The question asks for the procedure still to be written when there is none.'}),
        owner: gap(OWNER_GAP, 'The model names no owner.')}});
    }
    return specs;
  }
};
// The chapters' specs when a model is given: Chapter 1 takes the model's records and the brief's records of the kinds
// the model does not name (a kind the model names is the model's, whether or not its records are already held, so a
// later draft never sets the brief's people beside the model's); another chapter takes the model's specs when it has
// any, else the brief rules'.
const MODEL_TYPE = {person: 'actor', stakeholder: 'stakeholder', outcome: 'outcome', task: 'journey', process: 'journey', constraint: 'constraint', requirement: 'requirement'};
// The element kinds each chapter reads from the model: a chapter the model names elements for is the model's (its
// draft may be empty once they are held); a chapter the model says nothing about is the brief rules'.
const MODEL_NAMES = {2: ['driver'], 3: ['decision'], 4: [...APP_KINDS], 5: [...APP_KINDS], 6: ['service', 'capability', 'technology'], 7: [...APP_KINDS, 'technology'], 8: [...APP_KINDS, 'interface'], 10: ['instance', 'node']};
function specsWithModel(p, B, M, ch, ctx) {
  const own = (MODEL_RULES[ch] || (() => []))(p, M, ctx);
  if (ch !== 1) { if (own.length || M.elements.some(e => (MODEL_NAMES[ch] || []).includes(e.kind) && (ch !== 7 || e.technology || e.kind === 'technology'))) return own; const note = ctx.note; const fallback = RULES[ch](p, B, ctx); ctx.note = [note, ctx.note].filter(Boolean).join(' '); return fallback; }
  const types = new Set(M.elements.map(e => MODEL_TYPE[e.kind]).filter(Boolean)), rest = RULES[1](p, B, ctx).filter(s => !types.has(s.type));
  const requirement = s => s.type === 'requirement';
  return [...own.filter(s => !requirement(s)), ...rest.filter(s => !requirement(s)), ...own.filter(requirement), ...rest.filter(requirement)];
}

// ---------------------------------------------------------------- shaping answers for the creation questions

// Walks creationFields(p, ch, answers) as the guide asks them (each field may depend on the earlier answers) and fills
// each from the spec, or from a gap: an owner "Unassigned", a choice its first option, an optional number blank, a text
// field its open question. Returns the answers and, per field, how the value is known.
function shape(doc, ch, spec) {
  const answers = {}, fields = [];
  for (let i = 0; i < 40; i++) {
    const f = creationFields(doc, ch, answers).find(x => !Object.hasOwn(answers, x.key));
    if (!f) break;
    let v = typeof spec.values[f.key] === 'function' ? spec.values[f.key](doc) : spec.values[f.key];
    if (v && f.options && !(f.optional && v.value === '') && !f.options.some(o => o.id === v.value)) v = null;
    // An open optional question stays blank (an optional choice never takes its first option).
    if (!v) v = f.optional ? gap('', 'Left open.') : f.options ? gap(f.options[0]?.id || '', 'No source chooses this; the first option holds until the person chooses.') : f.key === 'owner' ? gap(OWNER_GAP) : gap(openText(f.label));
    answers[f.key] = v.value;
    fields.push({key: f.key, label: f.label, ...v, ...(f.options ? {display: f.options.find(o => o.id === v.value)?.title || v.value, ...(v.basis === 'gap' || !ANCHORS.has(f.key) ? {options: f.options.slice(0, 60).map(o => ({id: o.id, title: clip(o.title, 120)}))} : {})} : {}), ...(f.numeric ? {numeric: true} : {}), ...(f.optional ? {optional: true} : {}), ...(v.basis === 'gap' ? {question: f.label} : {})});
  }
  return {answers, fields};
}
// ---------------------------------------------------------------- the Brain: basis and citations

// The chapter's procedure and its citations: eligible released claims (claim receipts) and Playbook passages only.
function chapterBrain(p, ch, anchor, query) {
  try {
    const c = brainContext(p, {chapter: ch, id: anchor || 'project'}), brain = architectureBrain(p, c, {query, limit: 4});
    const citations = brainSources(p, brain).filter(s => s.kind === 'governed-claim' || s.kind === 'brain-method').map(s => {
      let excerpt = s.excerpt; if (s.kind === 'governed-claim') { try { excerpt = JSON.parse(s.excerpt).statement; } catch { excerpt = String(s.excerpt).slice(0, 400); } }
      return {id: s.id, kind: s.kind, objectId: s.objectId, title: s.title, posture: s.posture, receipt: s.receipt, excerpt: clip(excerpt, 600),reasoningExcerpt:s.excerpt,truncated:s.truncated};
    });
    return {procedure: brain.procedure, citations, claimIds: citations.filter(x => x.kind === 'governed-claim').map(x => x.objectId).slice(0, JOURNEY_LIMITS.claimIds), playbook: citations.filter(x => x.kind === 'brain-method').map(x => x.objectId).slice(0, JOURNEY_LIMITS.playbook)};
  } catch {
    return {procedure: null, citations: [], claimIds: [], playbook: []};
  }
}

// ---------------------------------------------------------------- one chapter, and the journey

// Applies one drafted record to a working document the way the person's commit will: compileCreation and the record's
// provenance, as guide.commit-draft writes it, then the commands that follow the commit (the links between Chapter 1
// context records; a model's process elements and flows, each later one naming the ids the earlier ones made).
// Returns the document and what the record created.
const EXTRA = {relationship: applyCommand, 'process.element': applyProcessCommand, 'process.transition': applyProcessCommand};
function applyRecord(doc, ch, record, at) {
  const compiled = compileCreation(doc, ch, record.answers, at);
  let next = withJourneyProvenance(compiled.document, ch, compiled.created, record.provenance, undefined, {before: doc});
  const refs = new Map();
  for (const command of record.extras || []) { const r = EXTRA[command.type](next, {type: command.type, payload: resolveRefs(command.payload, refs)}, at); next = r.document; if (command.ref && r.selected) refs.set(command.ref, r.selected); }
  return {document: next, created: compiled.created};
}
function draftWith(input, ch, {brief = null, model = null, mode = 'deterministic', at = '2000-01-01T00:00:00Z'} = {}) {
  ch = Number(ch);
  if (!Number.isInteger(ch) || ch < 1 || ch > JOURNEY_CHAPTERS) throw Error('Choose a chapter from 1 to 11.');
  // Round 12 (D-10, DRF-01): a project of imported or grouped requirements is drafted by requirement group, as one
  // architecture draft (architecture-drafter.js, the drafting job); the per-requirement rules here are retired for it,
  // so no chapter of it is drafted one record per requirement.
  if (draftsByGroup(input)) return {draft: {chapter: ch, title: CHAPTER_TITLES[ch], mode: 'grouped', grouped: true, basis: {stamp: guideBasis(input, ch, null), engine: BRAIN_ENGINE, policy: BRAIN_POLICY, procedure: null}, records: [], gaps: [], citations: [], empty: groupedDraftReason(input)}, document: input};
  const B = briefOf(brief), M = model ? modelOf(model) : null, ctx = {}, p = input, specs = M && !M.empty ? specsWithModel(p, B, M, ch, ctx) : RULES[ch](p, B, ctx);
  const anchor = specs.find(s => s.upstream?.length)?.upstream[0] || null, query = [CHAPTER_TITLES[ch], ...specs.slice(0, 6).map(s => s.title)].join(' ');
  const brain = chapterBrain(p, ch, anchor, query);
  let doc = p; const records = [];
  for (const spec of specs) {
    const {answers, fields} = shape(doc, ch, spec);
    const passages = uniq([...list(spec.passages), ...fields.flatMap(f => f.passages)]).slice(0, JOURNEY_LIMITS.passages), upstream = uniq([...list(spec.upstream), ...fields.flatMap(f => f.upstream)]).filter(id => id !== 'new-external').slice(0, JOURNEY_LIMITS.upstream);
    const provenance = spec.source === 'model' ? {mode: 'model', ...(M?.sourceId ? {sourceId: M.sourceId} : {}), passages, upstream, claimIds: brain.claimIds, playbook: brain.playbook} : {mode, passages, upstream, claimIds: brain.claimIds, playbook: brain.playbook};
    const record = {key: spec.key, kind: 'guided', type: spec.type || null, title: spec.title, answers, fields, provenance, gaps: fields.filter(f => f.basis === 'gap').map(f => ({key: f.key, question: f.question || f.label})), ...(spec.element ? {element: spec.element} : {})};
    // What the record would create, on the working document, so that a later record (and the person's commit) can
    // name it; and the commands that follow the guided commit (the links between Chapter 1 context records).
    let applied;
    try {
      const pre = compileCreation(doc, ch, answers, at);
      record.extras = spec.extras && pre ? spec.extras(pre.document, pre.created) : [];
      const links = record.extras.filter(c => c.type === 'relationship').map(c => c.payload);
      if (links.length) record.links = links;
      applied = applyRecord(doc, ch, record, at);
    } catch (e) { record.blocked = String(e?.message || e).slice(0, 300); records.push(record); continue; }
    record.creates = applied.created;
    doc = applied.document;
    records.push(record);
  }
  const gaps = [...records.flatMap(r => r.gaps.map(g => ({record: r.key, ...g}))), ...list(ctx.questions).map(q => ({record: null, key: q.key, question: q.question, forType: q.forType}))];
  const draft = {chapter: ch, title: CHAPTER_TITLES[ch], mode: M && !M.empty ? 'model' : mode, basis: {stamp: guideBasis(p, ch, null), engine: BRAIN_ENGINE, policy: BRAIN_POLICY, procedure: brain.procedure ? {id: brain.procedure.id, title: brain.procedure.title, questions: brain.procedure.questions} : null}, records, gaps, citations: brain.citations, ...(ctx.note ? {note: ctx.note} : {}), ...(M && !M.empty ? {model: {sourceId: M.sourceId, name: M.name, format: M.format, elements: M.elements.length, drafted: records.filter(r => r.provenance.mode === 'model').length}} : {}), ...(!records.length ? {empty: ch === 1 ? (M && !M.empty ? 'The model and the brief yield no new Chapter 1 record.' : 'The brief yields no new Chapter 1 record.') : `Chapter ${ch} has nothing to draft from: its upstream records are drafted already or missing.`} : {})};
  return {draft, document: doc};
}
// One chapter of proposed records for the project as it stands. Pure: the project is read, never written.
export function draftChapter(p, ch, options = {}) { return draftWith(p, ch, options).draft; }
// One chapter drafted from an interpreted model alone (Contract I's `modelDraft`): the records in the drafter's shape.
export function modelDraft(p, chapter, foreign, options = {}) { return draftWith(p, chapter, {...options, model: foreign}).draft.records; }
// The whole journey, in order, on an in-memory copy: each chapter's records are applied (as the person's commits would
// apply them) before the next chapter is drafted. Nothing is persisted; the input is never changed.
export function draftJourney(input, {brief = null, model = null, upTo = JOURNEY_CHAPTERS, from = 1, at} = {}) {
  let doc = structuredClone(input); const chapters = [];
  for (let ch = from; ch <= Math.min(JOURNEY_CHAPTERS, upTo); ch++) { const r = draftWith(doc, ch, {brief, model, at}); chapters.push(r.draft); doc = r.document; }
  return {chapters, document: doc};
}
