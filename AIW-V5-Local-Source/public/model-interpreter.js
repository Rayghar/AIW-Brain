// A model in (round 6, Contract I; audit/round6/DESIGN.md). interpretModel(text, {name, format}) reads a model written
// in Structurizr DSL, an ArchiMate 3 exchange file (or Archi's native file), BPMN 2.0, draw.io with C4 or ArchiMate
// shapes, the C4 subset of Mermaid or PlantUML, or a MADR decision record, and returns elements, relationships and
// views in one normalised shape, each citing the passages (source spans) it came from. It proposes nothing and writes
// nothing: the journey drafter (public/journey-drafter.js) turns the elements into chapter proposals that a person
// accepts through the governed guide commands. shared/model-interpreter.js re-exports this module for the server and
// the suites; the rules live in public/ because the browser loads only public/ and the Projects page reads a model file
// before the project exists. Plain ES module: no DOM, no Node API, no network, no knowledge, no project writes.
//
// Every parser here is hand-written and bounded: the text is refused above MODEL_LIMIT characters, each kind of element
// keeps at most MODEL_KIND_LIMIT (the rest are counted in the report), XML nesting stops at a fixed depth, and no
// entity declared in a DOCTYPE is ever expanded (an unknown entity stays literal text). A name that holds markup stays
// text: nothing here renders, and every surface that does escapes it.
//
// The result: {format, name, hash, passages:[{id:'P-001', start, end, text}], elements:[{id, kind, name, description,
// technology, tags, parent, external, passages, confidence, attrs}], relationships:[{id, from, to, label, technology,
// kind, passages, confidence, attrs}], views:[{id, title, kind, elementIds}], questions:[{key, question, forType}],
// report:{omitted:[{id?, kind?, reason}], counts}}. A passage's text is exactly text.slice(start, end). An element is
// `stated` when its name is a span of the passages it cites, else `inferred`.
import {sha256} from './brain-integrity.js';
import {interpretMADR} from './madr.js';

export const MODEL_LIMIT = 2000000;
export const MODEL_KIND_LIMIT = 500;
export const MODEL_RULES = 'model-rules-1';
export const MODEL_FORMATS = ['structurizr', 'archimate', 'bpmn', 'drawio', 'mermaid-c4', 'plantuml-c4', 'madr'];
export const ELEMENT_KINDS = ['person', 'stakeholder', 'system', 'container', 'component', 'interface', 'service', 'capability', 'data', 'node', 'environment', 'zone', 'instance', 'process', 'task', 'event', 'gateway', 'lane', 'pool', 'requirement', 'outcome', 'constraint', 'driver', 'decision', 'alternative', 'boundary', 'technology'];
export const RELATIONSHIP_KINDS = ['uses', 'flow', 'message', 'sequence', 'realizes', 'serves', 'assigned', 'composes', 'accesses', 'triggers', 'association'];
const XML_DEPTH = 100, XML_NODES = 400000, PASSAGE_LIMIT = 6000, OMITTED_LIMIT = 60, QUESTION_LIMIT = 20, NAME = 200, TEXT = 2000;
const KIND = new Set(ELEMENT_KINDS), REL = new Set(RELATIONSHIP_KINDS);

// ------------------------------------------------------------------------------------------------ small helpers
const squash = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const cut = (s, n) => { const t = squash(s); return t.length > n ? t.slice(0, n) : t; };
const pad = n => String(n).padStart(3, '0');
const plain = s => squash(s).toLowerCase();
// (a draw.io label is HTML: its character references are read too, once its tags are gone, so "A &amp; B" reads "A & B")
const stripTags = s => unescapeXML(String(s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' '));
// The five XML entities and character references; any other entity stays as written (no DOCTYPE entity is expanded).
export function unescapeXML(s) {
  return String(s ?? '').replace(/&(#x[0-9a-fA-F]{1,6}|#\d{1,7}|amp|lt|gt|quot|apos);/g, (m, c) => {
    if (c[0] === '#') { const n = c[1] === 'x' || c[1] === 'X' ? parseInt(c.slice(2), 16) : Number(c.slice(1)); return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m; }
    return {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"}[c];
  });
}

// ------------------------------------------------------------------------------------------------ the collector
// Elements, relationships and views are collected through one object that applies the bounds and cites the passages.
// A passage is a span of the text (a line, or an XML element's extent); passages are numbered in text order at the end,
// so every id a record cites is P-nnn in the order the text reads.
function collector(text, name) {
  const spans = new Map(), elements = [], kept = new Set(), relationships = [], views = [], omitted = [], questions = [], kinds = {}, truncated = {}, notes = new Set();
  let omittedMore = 0;
  const span = (start, end) => {
    start = Math.max(0, Math.min(text.length, start | 0)); end = Math.max(start, Math.min(text.length, end | 0));
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end <= start) return null;
    const key = start + ':' + end;
    if (!spans.has(key)) { if (spans.size >= PASSAGE_LIMIT) return null; spans.set(key, {start, end}); }
    return key;
  };
  const spanText = key => { const s = spans.get(key); return s ? text.slice(s.start, s.end) : ''; };
  const statedIn = (value, keys) => { const v = plain(value); if (!v) return false; const t = plain(keys.map(spanText).join(' ')); return t.includes(v); };
  const omit = (entry) => { if (omitted.length < OMITTED_LIMIT) omitted.push(entry); else omittedMore++; };
  const note = (line) => { notes.add(line); };
  // A name, a description and a technology are kept as the text the file holds (markup in them stays text: nothing
  // here renders, and every surface that shows them escapes); a reader of HTML labels (draw.io, Mermaid) strips its
  // own markup before it gets here.
  const element = ({kind, name: n, description = '', technology = '', tags = [], parent = null, external = false, passages = [], attrs = {}, ref = null}) => {
    const title = cut(n, NAME);
    if (!KIND.has(kind)) { omit({id: ref || title, kind, reason: 'No AIW element kind for ' + (attrs.xsiType || attrs.type || kind) + '.'}); return null; }
    if ((kinds[kind] || 0) >= MODEL_KIND_LIMIT) { truncated[kind] = (truncated[kind] || 0) + 1; return null; }
    kinds[kind] = (kinds[kind] || 0) + 1;
    const keys = passages.filter(Boolean);
    const el = {id: 'E-' + pad(elements.length + 1), kind, name: title || cut(kind + ' ' + (ref || elements.length + 1), NAME), description: cut(description, TEXT), technology: cut(technology, NAME), tags: [...new Set(tags.map(t => cut(t, 60)).filter(Boolean))].slice(0, 20), parent, external: !!external, passages: keys, confidence: title && statedIn(title, keys) ? 'stated' : 'inferred', attrs: {...attrs, ...(ref ? {ref: cut(ref, 160)} : {})}};
    elements.push(el); kept.add(el);
    return el;
  };
  const relationship = ({from, to, label = '', technology = '', kind = 'association', passages = [], attrs = {}, ref = null}) => {
    if (!from || !to || !kept.has(from) || !kept.has(to)) { omit({id: ref || label || 'relationship', kind: 'relationship', reason: 'An end of the relationship is not an element the reader kept.'}); return null; }
    if (from === to) { omit({id: ref || label || 'relationship', kind: 'relationship', reason: 'A relationship from an element to itself.'}); return null; }
    if (relationships.length >= MODEL_KIND_LIMIT) { truncated.relationship = (truncated.relationship || 0) + 1; return null; }
    const k = REL.has(kind) ? kind : 'association', keys = passages.filter(Boolean), text = cut(label, NAME);
    const r = {id: 'R-' + pad(relationships.length + 1), from: from.id, to: to.id, label: text, technology: cut(technology, NAME), kind: k, passages: keys, confidence: text && statedIn(text, keys) ? 'stated' : 'inferred', attrs: {...attrs, ...(ref ? {ref: cut(ref, 160)} : {})}};
    relationships.push(r);
    return r;
  };
  const view = ({title, kind = 'diagram', elementIds = [], ref = null}) => {
    if (views.length >= MODEL_KIND_LIMIT) { truncated.view = (truncated.view || 0) + 1; return null; }
    const v = {id: 'V-' + pad(views.length + 1), title: cut(title, NAME) || 'View ' + (views.length + 1), kind, elementIds: [...new Set(elementIds.filter(Boolean))].slice(0, 2000), ...(ref ? {ref: cut(ref, 160)} : {})};
    views.push(v);
    return v;
  };
  const finish = format => {
    // Only the spans an element or a relationship cites are passages, in text order.
    const cited = new Set([...elements.flatMap(e => e.passages), ...relationships.flatMap(r => r.passages)]);
    const ordered = [...spans.entries()].filter(([key]) => cited.has(key)).sort((a, b) => a[1].start - b[1].start || a[1].end - b[1].end);
    const ids = new Map(ordered.map(([key], i) => [key, 'P-' + pad(i + 1)]));
    const passages = ordered.map(([key, s]) => ({id: ids.get(key), start: s.start, end: s.end, text: text.slice(s.start, s.end)}));
    const cite = keys => [...new Set(keys.map(k => ids.get(k)).filter(Boolean))];
    for (const el of elements) el.passages = cite(el.passages);
    for (const r of relationships) r.passages = cite(r.passages);
    // Questions the model leaves open: a person without a word about them, a relationship without a label.
    for (const el of elements) if (questions.length < QUESTION_LIMIT && el.kind === 'person' && !el.description) questions.push({key: 'who-' + el.id, question: `Who is ${el.name}, and what do they need from the design?`, forType: 'actor'});
    for (const r of relationships) if (questions.length < QUESTION_LIMIT && !r.label) { const a = elements.find(e => e.id === r.from), b = elements.find(e => e.id === r.to); questions.push({key: 'what-' + r.id, question: `What passes from ${a.name} to ${b.name}?`, forType: 'contract'}); }
    for (const [kind, n] of Object.entries(truncated)) omit({kind, reason: `${n} more ${kind}${n === 1 ? '' : 's'} beyond the ${MODEL_KIND_LIMIT} this reader keeps per kind.`});
    if (omittedMore) omit({reason: `${omittedMore} more omitted.`});
    for (const line of notes) omit({reason: line});
    const byKind = Object.fromEntries(Object.entries(kinds).sort());
    const counts = {passages: passages.length, elements: elements.length, relationships: relationships.length, views: views.length, questions: questions.length, stated: elements.filter(e => e.confidence === 'stated').length, inferred: elements.filter(e => e.confidence === 'inferred').length, omitted: omitted.length, kinds: byKind};
    return {format, name, hash: sha256(text), passages, elements, relationships, views, questions, report: {omitted, counts}};
  };
  return {span, element, relationship, view, omit, note, finish, elements, relationships, kinds};
}

// Lines with their offsets: start and end of the trimmed line, and the raw line for the parsers that read it.
function lines(text) {
  const out = [];
  for (let at = 0; at <= text.length;) {
    const nl = text.indexOf('\n', at), stop = nl < 0 ? text.length : nl;
    let a = at, b = stop;
    while (a < b && /\s/.test(text[a])) a++;
    while (b > a && /\s/.test(text[b - 1])) b--;
    out.push({start: a, end: b, raw: text.slice(a, b), n: out.length + 1});
    if (nl < 0) break;
    at = nl + 1;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ format detection
export function detectFormat(text, hint = '') {
  const h = String(hint || '').toLowerCase().replace(/^\./, '');
  const ALIAS = {structurizr: 'structurizr', dsl: 'structurizr', archimate: 'archimate', bpmn: 'bpmn', drawio: 'drawio', 'mermaid-c4': 'mermaid-c4', mermaid: 'mermaid-c4', mmd: 'mermaid-c4', 'plantuml-c4': 'plantuml-c4', plantuml: 'plantuml-c4', puml: 'plantuml-c4', madr: 'madr', md: 'madr'};
  if (ALIAS[h] && h !== 'xml') return ALIAS[h];
  const head = text.slice(0, 20000);
  if (/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?</.test(head)) {
    const root = /<(?:(\w+):)?(\w[\w.-]*)\b[^>]*>/.exec(head.replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[\s\S]*?>/g, '')) || [];
    const local = root[2] || '';
    if (local === 'definitions' && /BPMN\/20100524\/MODEL/.test(head)) return 'bpmn';
    if (local === 'mxfile' || local === 'mxGraphModel') return 'drawio';
    if (local === 'model' && (/opengroup\.org\/xsd\/archimate/.test(head) || root[1] === 'archimate' || /xmlns:archimate=/.test(head))) return 'archimate';
    if (local === 'definitions' && /sequenceFlow|<(?:\w+:)?process\b/.test(head)) return 'bpmn';
    if (local === 'model' && /<(?:\w+:)?elements?\b/.test(head)) return 'archimate';
    return 'unknown';
  }
  if (/^\s*@startuml\b/m.test(head)) return 'plantuml-c4';
  if (/^\s*(?:%%.*\n\s*)*(?:C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|flowchart|graph)\b/.test(head)) return 'mermaid-c4';
  if (/^\s*(?:\/\/.*\n\s*|#.*\n\s*|\/\*[\s\S]*?\*\/\s*)*workspace\b/.test(head) || /^\s*model\s*\{/m.test(head) && /^\s*(?:\w+\s*=\s*)?(?:softwareSystem|person|container)\b/m.test(head)) return 'structurizr';
  if (/^#\s+\S/m.test(head) && /^##\s+(?:Context and Problem Statement|Considered Options|Decision Outcome)|^status:\s*\S/mi.test(head)) return 'madr';
  if (/^\s*(?:\w+\s*=\s*)?(?:softwareSystem|person|container)\s+"/m.test(head) && /->/.test(head)) return 'structurizr';
  return 'unknown';
}

// ------------------------------------------------------------------------------------------------ the entry point
export function interpretModel(text, {name = '', format = ''} = {}) {
  if (typeof text !== 'string') throw TypeError('A model is read from text.');
  const title = squash(name).slice(0, 180) || 'the model';
  if (text.length > MODEL_LIMIT) {
    const C = collector('', title);
    C.note(`The model holds ${text.length.toLocaleString('en-GB')} characters; this reader reads up to ${MODEL_LIMIT.toLocaleString('en-GB')}. Nothing was read.`);
    return {...C.finish(detectFormat(text.slice(0, 20000), format) || 'unknown'), hash: sha256(text)};
  }
  const f = detectFormat(text, format), C = collector(text, title);
  if (f === 'madr') return madr(text, title, C);
  if (f === 'structurizr') structurizr(text, C);
  else if (f === 'archimate') archimate(text, C);
  else if (f === 'bpmn') bpmn(text, C);
  else if (f === 'drawio') drawio(text, C);
  else if (f === 'mermaid-c4') mermaid(text, C);
  else if (f === 'plantuml-c4') plantuml(text, C);
  else C.note('The format was not recognised: Structurizr DSL, an ArchiMate exchange file, BPMN 2.0, draw.io, Mermaid C4, C4-PlantUML or a MADR record is read.');
  return C.finish(f);
}
// The counts a project keeps of an interpretation (p.model.interpreted): never the elements themselves.
export function modelCounts(r) {
  return {format: r.format, passages: r.passages.length, elements: r.elements.length, relationships: r.relationships.length, views: r.views.length, questions: r.questions.length, stated: r.elements.filter(e => e.confidence === 'stated').length, inferred: r.elements.filter(e => e.confidence === 'inferred').length, omitted: r.report.omitted.length, kinds: {...r.report.counts.kinds}};
}

// ------------------------------------------------------------------------------------------------ MADR
function madr(text, title, C) {
  let r;
  try { r = interpretMADR(text); } catch (e) { C.note('The MADR reader could not read this file: ' + String(e?.message || e).slice(0, 200)); return C.finish('madr'); }
  const out = r && typeof r === 'object' ? r : {};
  const list = v => Array.isArray(v) ? v : [], obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  // The MADR reader's output in the contract's shape and key order, whatever it adds of its own.
  const passages = list(out.passages).map(x => ({id: x.id, start: x.start, end: x.end, text: x.text}));
  const elements = list(out.elements).map(e => ({id: e.id, kind: e.kind, name: cut(e.name, NAME), description: cut(e.description, TEXT), technology: cut(e.technology, NAME), tags: list(e.tags), parent: e.parent ?? null, external: e.external === true, passages: list(e.passages), confidence: e.confidence === 'stated' ? 'stated' : 'inferred', attrs: obj(e.attrs)}));
  const relationships = list(out.relationships).map(x => ({id: x.id, from: x.from, to: x.to, label: cut(x.label, NAME), technology: cut(x.technology, NAME), kind: REL.has(x.kind) ? x.kind : 'association', passages: list(x.passages), confidence: x.confidence === 'stated' ? 'stated' : 'inferred', attrs: obj(x.attrs)}));
  const views = list(out.views), questions = list(out.questions).map(q => ({key: q.key, question: q.question, forType: q.forType})).slice(0, QUESTION_LIMIT), omitted = list(out.report?.omitted);
  const kinds = Object.fromEntries([...new Set(elements.map(e => e.kind))].sort().map(k => [k, elements.filter(e => e.kind === k).length]));
  return {format: 'madr', name: title, hash: sha256(text), passages, elements, relationships, views, questions, report: {omitted, counts: {passages: passages.length, elements: elements.length, relationships: relationships.length, views: views.length, questions: questions.length, stated: elements.filter(e => e.confidence === 'stated').length, inferred: elements.filter(e => e.confidence !== 'stated').length, omitted: omitted.length, kinds, ...(out.report?.counts ? {madr: {files: out.report.counts.files, decisions: out.report.counts.decisions, alternatives: out.report.counts.alternatives}} : {})}}};
}

// ------------------------------------------------------------------------------------------------ Structurizr DSL
// One statement per line. Strings are double-quoted (\" escapes a quote); // and # start a comment, /* */ spans lines.
// A block opens with a `{` that a later line closes, or is written inline on the statement's own line
// (`a = container "T" "D" "Tech" { tags "Database" properties { ... } }`, as AIW's own export writes it): the words
// before the first `{` are the statement, the words inside are its block.
function dslTokens(code) {
  const out = [];
  for (let i = 0; i < code.length;) {
    const c = code[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') { let j = i + 1, s = ''; while (j < code.length && code[j] !== '"') { if (code[j] === '\\' && j + 1 < code.length) { s += code[j + 1]; j += 2; continue; } s += code[j++]; } out.push({t: 'str', v: s}); i = j + 1; continue; }
    if (c === '{' || c === '}' || c === '=') { out.push({t: c}); i++; continue; }
    if (code.startsWith('->', i)) { out.push({t: '->'}); i += 2; continue; }
    let j = i; while (j < code.length && !/[\s{}="]/.test(code[j]) && !code.startsWith('->', j)) j++;
    out.push({t: 'word', v: code.slice(i, j)}); i = j;
  }
  return out;
}
// The code of a line without its comments; a /* */ comment may span lines.
function dslCode(raw, state) {
  let out = '', i = 0;
  while (i < raw.length) {
    if (state.block) { const end = raw.indexOf('*/', i); if (end < 0) return out; state.block = false; i = end + 2; continue; }
    const c = raw[i];
    if (c === '"') { let j = i + 1; while (j < raw.length && raw[j] !== '"') { if (raw[j] === '\\') j++; j++; } out += raw.slice(i, j + 1); i = j + 1; continue; }
    if (raw.startsWith('//', i) || c === '#') return out;
    if (raw.startsWith('/*', i)) { state.block = true; i += 2; continue; }
    out += c; i++;
  }
  return out;
}
const DSL_ELEMENTS = {person: 'person', softwareSystem: 'system', container: 'container', component: 'component', group: 'boundary', enterprise: 'boundary', deploymentEnvironment: 'environment', deploymentNode: 'node', infrastructureNode: 'node'};
const DSL_VIEWS = new Set(['systemLandscape', 'systemContext', 'container', 'component', 'deployment', 'dynamic', 'filtered', 'custom', 'image']);
const DSL_SKIP = new Set(['properties', 'perspectives', 'styles', 'themes', 'theme', 'branding', 'terminology', 'configuration', 'archetypes', '!script', '!elements', '!relationships', 'animation', 'users']);
const addTags = (el, strs) => { el.tags = [...new Set([...el.tags, ...strs.flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)])].slice(0, 20); if (el.tags.some(t => /^external$/i.test(t))) el.external = true; };
// The statements of an element's block written on its own line: description, technology and tags are read; url,
// properties and perspectives are noted and skipped (a nested block to its matching brace).
function inlineBlock(el, toks, C) {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'word') continue;
    const word = toks[i].v, strs = []; let j = i + 1;
    while (j < toks.length && toks[j].t === 'str') strs.push(toks[j++].v);
    if (toks[j]?.t === '{') { let d = 0; for (; j < toks.length; j++) { if (toks[j].t === '{') d++; else if (toks[j].t === '}' && --d === 0) { j++; break; } } }
    if (word === 'description' && strs[0]) el.description = cut(strs[0], TEXT);
    else if (word === 'technology' && strs[0]) el.technology = cut(strs[0], NAME);
    else if (word === 'tags') addTags(el, strs);
    else if (word === 'url') C.note('url lines are not read.');
    else if (word === 'properties' || word === 'perspectives') C.note(word + ' blocks are not read.');
    i = j - 1;
  }
}
function structurizr(text, C) {
  const state = {block: false}, stack = [{type: 'root', path: '', el: null}], byPath = new Map(), byName = new Map();
  const top = () => stack[stack.length - 1];
  const scope = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].el && ['system', 'container', 'component', 'node', 'environment', 'boundary'].includes(stack[i].el.kind)) return stack[i]; return null; };
  const register = (id, el) => { if (!id) return; const parentPath = stack.map(f => f.id).filter(Boolean).join('.'); const path = parentPath ? parentPath + '.' + id : id; byPath.set(path, el); if (!byPath.has(id)) byPath.set(id, el); if (!byName.has(id)) byName.set(id, []); byName.get(id).push(el); return path; };
  const resolve = ref => {
    if (!ref) return null;
    if (ref === 'this') return scope()?.el || null;
    if (byPath.has(ref)) return byPath.get(ref);
    for (let i = stack.length - 1; i >= 0; i--) { const prefix = stack.slice(0, i + 1).map(f => f.id).filter(Boolean).join('.'); if (prefix && byPath.has(prefix + '.' + ref)) return byPath.get(prefix + '.' + ref); }
    const last = ref.split('.').at(-1), named = byName.get(last);
    return named?.length === 1 ? named[0] : null;
  };
  const pending = [];
  for (const line of lines(text)) {
    const code = dslCode(line.raw, state).trim();
    if (!code) continue;
    const key = C.span(line.start, line.end);
    const all = dslTokens(code), first = all.findIndex(x => x.t === '{');
    let depth = 0; for (const x of all) depth += x.t === '{' ? 1 : x.t === '}' ? -1 : 0;
    // The statement is what comes before the first brace; a block closed on the same line is read inline; a line that
    // only closes blocks pops them.
    const tokens = first >= 0 ? all.slice(0, first) : all.filter(x => x.t !== '}'), opens = depth > 0, inline = first >= 0 && depth <= 0 ? all.slice(first + 1, all.length - 1) : [];
    if (depth < 0) { for (let k = 0; k < -depth; k++) if (stack.length > 1) stack.pop(); if (!tokens.length) continue; }
    if (!tokens.length) { if (opens) stack.push({type: 'skip'}); continue; }
    const frame = top();
    if (frame.type === 'skip') { if (opens) stack.push({type: 'skip'}); continue; }
    let id = null, rest = tokens;
    if (tokens[0].t === 'word' && tokens[1]?.t === '=') { id = tokens[0].v; rest = tokens.slice(2); }
    const arrow = rest.findIndex(x => x.t === '->');
    if (arrow >= 0) {
      const strs = rest.slice(arrow + 2).filter(x => x.t === 'str').map(x => x.v);
      const inlineTags = inline.filter((x, i) => x.t === 'str' && inline[i - 1]?.t === 'word' && inline[i - 1].v === 'tags').map(x => x.v);
      pending.push({from: arrow === 0 ? 'this' : rest[arrow - 1].v, to: rest[arrow + 1]?.v, label: strs[0] || '', technology: strs[1] || '', tags: [strs[2] || '', ...inlineTags].filter(Boolean).join(','), key, scope: stack.slice(), implicit: arrow === 0});
      if (opens) stack.push({type: 'skip'});
      continue;
    }
    const word = rest[0].t === 'word' ? rest[0].v : '', strs = rest.slice(1).filter(x => x.t === 'str').map(x => x.v), refs = rest.slice(1).filter(x => x.t === 'word').map(x => x.v);
    if (word === 'workspace') { if (refs.includes('extends')) C.note('The workspace extends another file; what it extends was not read.'); stack.push({type: 'workspace', id: null}); continue; }
    if (word === 'model') { stack.push({type: 'model', id: null}); continue; }
    if (word === 'views') { stack.push({type: 'views', id: null}); continue; }
    if (word === '!include') { C.note(`!include ${refs[0] || strs[0] || ''} was not followed: only this file was read.`.replace(/\s+/g, ' ')); if (opens) stack.push({type: 'skip'}); continue; }
    if (word === '!identifiers') { continue; }
    if (word === '!docs' || word === '!adrs') { C.note(`${word} was not read: documentation and decision folders are outside this file.`); if (opens) stack.push({type: 'skip'}); continue; }
    if (word === '!constant' || word === '!const' || word === '!var' || word === '!impliedRelationships' || word === '!plugin') { if (opens) stack.push({type: 'skip'}); continue; }
    if (word === 'url') { C.note('url lines are not read.'); continue; }
    if (word === 'properties') { C.note('properties blocks are not read.'); if (opens) stack.push({type: 'skip'}); continue; }
    if (DSL_SKIP.has(word)) { if (opens) stack.push({type: 'skip'}); continue; }
    if (frame.type === 'views') {
      if (DSL_VIEWS.has(word)) { const v = C.view({title: strs.length >= 2 ? strs.at(-1) : strs[0] || word, kind: word, ref: strs.length >= 2 ? strs.at(-2) : strs[0] || refs[0] || null}); stack.push({type: 'view', id: null, view: v, refs: []}); if (!opens) stack.pop(); continue; }
      if (opens) stack.push({type: 'skip'}); continue;
    }
    if (frame.type === 'view') {
      if (word === 'include' && frame.view) for (const r of refs) if (r !== '*') { const el = resolve(r); if (el) frame.view.elementIds.push(el.id); }
      if (word === 'title' && frame.view && strs[0]) frame.view.title = cut(strs[0], NAME);
      if (opens) stack.push({type: 'skip'});
      continue;
    }
    if (frame.el && ['description', 'technology', 'tags'].includes(word)) {
      if (word === 'description') frame.el.description = cut(strs[0] || '', TEXT);
      if (word === 'technology') frame.el.technology = cut(strs[0] || '', NAME);
      if (word === 'tags') addTags(frame.el, strs);
      if (key) frame.el.passages.push(key);
      continue;
    }
    if (word === 'containerInstance' || word === 'softwareSystemInstance') {
      const target = resolve(refs[0]), node = scope();
      const el = C.element({kind: 'instance', name: (target?.name || refs[0] || 'instance') + ' instance', parent: node?.el?.id || null, passages: [key], attrs: {of: target?.id || null, identifier: id || refs[0] || null, deploymentGroups: strs[0] || '', instances: node?.el?.attrs?.instances || null, environment: stack.map(f => f.el).filter(e => e?.kind === 'environment').at(-1)?.id || null}, ref: refs[0]});
      if (el && id) register(id, el);
      if (!target) C.omit({id: refs[0] || 'instance', kind: 'instance', reason: 'The instance names an element this file does not define.'});
      if (opens) stack.push({type: 'skip'});
      continue;
    }
    if (word === 'element') { C.omit({id: strs[0] || id || 'element', kind: 'element', reason: 'A custom element has no C4 kind.'}); if (opens) stack.push({type: 'skip'}); continue; }
    const kind = DSL_ELEMENTS[word];
    if (kind) {
      const parent = scope(), env = stack.map(f => f.el).filter(e => e?.kind === 'environment').at(-1);
      const attrs = {identifier: id || null, type: word};
      let description = strs[1] || '', technology = '', tags = '';
      if (word === 'person' || word === 'softwareSystem') tags = strs[2] || '';
      else if (word === 'container' || word === 'component' || word === 'infrastructureNode') { technology = strs[2] || ''; tags = strs[3] || ''; }
      else if (word === 'deploymentNode') { technology = strs[2] || ''; tags = strs[3] || ''; if (strs[4]) attrs.instances = strs[4]; }
      if (word === 'infrastructureNode') attrs.infrastructure = true;
      if (env && kind !== 'environment') attrs.environment = env.id;
      const tagList = tags.split(',').map(s => s.trim()).filter(Boolean);
      const el = C.element({kind, name: strs[0] || id || word, description, technology, tags: tagList, parent: kind === 'environment' ? null : parent?.el?.id || null, external: tagList.some(t => /^external$/i.test(t)), passages: [key], attrs, ref: id});
      if (el) register(id, el);
      if (el && inline.length) inlineBlock(el, inline, C);
      if (opens) stack.push({type: 'element', id: id || null, el});
      continue;
    }
    if (word) C.omit({id: id || word, kind: word, reason: `The statement "${cut(word, 40)}" is not read.`});
    if (opens) stack.push({type: 'skip'});
  }
  if (state.block) C.note('A comment block is not closed; the lines after it were read as comment.');
  // Relationships after every element exists: an implicit source is the element whose block held the line.
  for (const r of pending) {
    const frames = r.scope, saved = stack.splice(0, stack.length, ...frames);
    const from = r.implicit || r.from === 'this' ? frames.slice().reverse().find(f => f.el)?.el || null : resolve(r.from), to = resolve(r.to);
    stack.splice(0, stack.length, ...saved);
    if (!from || !to) { C.omit({id: `${r.from} -> ${r.to}`, kind: 'relationship', reason: 'An end of the relationship is not an element this file defines.'}); continue; }
    const kind = /\b(?:async|asynchronous|publish|subscrib|event|queue|topic|message|stream)/i.test(r.label + ' ' + r.technology + ' ' + r.tags) ? 'flow' : 'uses';
    C.relationship({from, to, label: r.label, technology: r.technology, kind, passages: [r.key], attrs: {...(r.tags ? {tags: r.tags} : {})}});
  }
}

// ------------------------------------------------------------------------------------------------ XML
// A small tolerant XML reader: elements with attributes (keyed by local name; a prefixed attribute is also kept under
// its qualified name), text and CDATA, comments and processing instructions skipped, a DOCTYPE skipped whole (its
// entities are never expanded), nesting bounded. Each node keeps its start and end offsets.
function parseXML(text, C) {
  const root = {name: '#document', prefix: '', attrs: {}, children: [], text: '', start: 0, end: text.length, depth: 0};
  const stack = [root];
  let i = 0, nodes = 0, deep = 0, doctype = false, stopped = false;
  const current = () => stack[stack.length - 1];
  const addText = s => { const n = current(); if (n.skip) return; n.text += s; };
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt < 0) { addText(unescapeXML(text.slice(i))); break; }
    if (lt > i) addText(unescapeXML(text.slice(i, lt)));
    if (text.startsWith('<!--', lt)) { const end = text.indexOf('-->', lt + 4); i = end < 0 ? text.length : end + 3; continue; }
    if (text.startsWith('<?', lt)) { const end = text.indexOf('?>', lt + 2); i = end < 0 ? text.length : end + 2; continue; }
    if (text.startsWith('<![CDATA[', lt)) { const end = text.indexOf(']]>', lt + 9); addText(text.slice(lt + 9, end < 0 ? text.length : end)); i = end < 0 ? text.length : end + 3; continue; }
    if (text.startsWith('<!DOCTYPE', lt) || text.startsWith('<!doctype', lt)) {
      doctype = true;
      let j = lt + 9, bracket = 0;
      while (j < text.length) { const c = text[j]; if (c === '[') bracket++; else if (c === ']') bracket--; else if (c === '>' && bracket <= 0) break; j++; }
      i = j + 1; continue;
    }
    if (text.startsWith('</', lt)) {
      const end = text.indexOf('>', lt); const name = text.slice(lt + 2, end < 0 ? text.length : end).trim().split(/\s+/)[0] || '';
      const local = name.includes(':') ? name.split(':').pop() : name;
      for (let k = stack.length - 1; k > 0; k--) if (stack[k].name === local) { while (stack.length - 1 >= k) { const n = stack.pop(); n.end = end < 0 ? text.length : end + 1; } break; }
      i = end < 0 ? text.length : end + 1; continue;
    }
    // A start tag.
    let j = lt + 1;
    while (j < text.length && !/[\s/>]/.test(text[j])) j++;
    const qname = text.slice(lt + 1, j);
    if (!qname) { addText('<'); i = lt + 1; continue; }
    const attrs = {};
    let selfClosing = false;
    for (;;) {
      while (j < text.length && /\s/.test(text[j])) j++;
      if (j >= text.length) break;
      if (text[j] === '>') { j++; break; }
      if (text.startsWith('/>', j)) { selfClosing = true; j += 2; break; }
      let k = j; while (k < text.length && !/[\s=/>]/.test(text[k])) k++;
      const aname = text.slice(j, k); j = k;
      while (j < text.length && /\s/.test(text[j])) j++;
      let value = '';
      if (text[j] === '=') {
        j++; while (j < text.length && /\s/.test(text[j])) j++;
        const q = text[j];
        if (q === '"' || q === "'") { const end = text.indexOf(q, j + 1); value = unescapeXML(text.slice(j + 1, end < 0 ? text.length : end)); j = end < 0 ? text.length : end + 1; }
        else { k = j; while (k < text.length && !/[\s/>]/.test(text[k])) k++; value = unescapeXML(text.slice(j, k)); j = k; }
      }
      if (!aname) { j++; continue; }
      const alocal = aname.includes(':') ? aname.split(':').pop() : aname;
      if (!(alocal in attrs) || aname === alocal) attrs[alocal] = value;
      if (aname !== alocal) attrs[aname] = value;
    }
    nodes++;
    if (nodes > XML_NODES) { stopped = true; break; }
    const parent = current(), depth = parent.depth + 1, skip = parent.skip || depth > XML_DEPTH;
    if (depth > XML_DEPTH && !parent.skip) deep++;
    const local = qname.includes(':') ? qname.split(':').pop() : qname, prefix = qname.includes(':') ? qname.split(':')[0] : '';
    const node = {name: local, prefix, attrs, children: [], text: '', start: lt, end: j, depth, skip};
    if (!skip) parent.children.push(node);
    if (!selfClosing) stack.push(node);
    i = j;
  }
  while (stack.length > 1) { const n = stack.pop(); n.end = text.length; }
  if (doctype) C.note('A DOCTYPE was skipped: no entity it declares is expanded.');
  if (deep) C.note(`Elements nested deeper than ${XML_DEPTH} levels were not read.`);
  if (stopped) C.note(`The file holds more than ${XML_NODES.toLocaleString('en-GB')} XML elements; the rest was not read.`);
  return root;
}
const childOf = (n, name) => n.children.find(c => c.name === name) || null;
const childrenOf = (n, name) => n.children.filter(c => c.name === name);
const textOf = n => squash(n?.text || '');
// Every descendant, depth first.
function* walk(n) { for (const c of n.children) { yield c; yield* walk(c); } }
// The passage of an XML element: its whole extent when short, else its start tag alone.
const spanOf = (C, text, n) => C.span(n.start, n.end - n.start <= 1200 ? n.end : text.indexOf('>', n.start) + 1);

// ------------------------------------------------------------------------------------------------ ArchiMate
const ARCHIMATE_KIND = {BusinessActor: 'person', BusinessRole: 'person', BusinessCollaboration: 'person', BusinessInterface: 'interface', BusinessProcess: 'process', BusinessFunction: 'capability', BusinessInteraction: 'process', BusinessEvent: 'event', BusinessService: 'service', BusinessObject: 'data', Contract: 'data', Representation: 'data', Product: 'service',
  ApplicationComponent: 'container', ApplicationCollaboration: 'container', ApplicationInterface: 'interface', ApplicationFunction: 'component', ApplicationInteraction: 'process', ApplicationProcess: 'process', ApplicationEvent: 'event', ApplicationService: 'service', DataObject: 'data',
  Node: 'node', Device: 'node', SystemSoftware: 'technology', TechnologyCollaboration: 'node', TechnologyInterface: 'interface', Path: 'technology', CommunicationNetwork: 'technology', TechnologyFunction: 'capability', TechnologyProcess: 'process', TechnologyInteraction: 'process', TechnologyEvent: 'event', TechnologyService: 'service', Artifact: 'data', Equipment: 'node', Facility: 'zone', DistributionNetwork: 'technology', Material: 'data',
  Stakeholder: 'stakeholder', Driver: 'driver', Assessment: 'driver', Goal: 'outcome', Outcome: 'outcome', Principle: 'constraint', Requirement: 'requirement', Constraint: 'constraint', Meaning: 'outcome', Value: 'outcome',
  Resource: 'capability', Capability: 'capability', ValueStream: 'process', CourseOfAction: 'decision',
  WorkPackage: 'task', Deliverable: 'data', ImplementationEvent: 'event', Plateau: 'boundary', Gap: 'requirement',
  Grouping: 'boundary', Location: 'zone', AndJunction: 'gateway', OrJunction: 'gateway', Junction: 'gateway'};
const ARCHIMATE_REL = {Composition: 'composes', Aggregation: 'composes', Assignment: 'assigned', Realization: 'realizes', Serving: 'serves', Access: 'accesses', Influence: 'association', Triggering: 'triggers', Flow: 'flow', Specialization: 'association', Association: 'association'};
// The implementation-and-migration layer: read with the nearest kind (a work package is a task), marked so that the
// drafter never takes a work package for a journey step.
const ARCHIMATE_IMPLEMENTATION = new Set(['WorkPackage', 'Deliverable', 'ImplementationEvent', 'Plateau', 'Gap']);
const xsiType = n => String(n.attrs['xsi:type'] || n.attrs.type || '').replace(/^archimate:/, '');
function archimate(text, C) {
  const doc = parseXML(text, C), root = doc.children.find(n => n.name === 'model') || doc.children[0];
  if (!root) { C.note('No ArchiMate model element was found.'); return; }
  const byRef = new Map(), rels = [], diagrams = [];
  const addElement = (n, {name, description, type}) => {
    const kind = ARCHIMATE_KIND[type];
    const props = {};
    for (const p of childrenOf(childOf(n, 'properties') || {children: []}, 'property')) { const k = p.attrs.propertyDefinitionRef || p.attrs.key || ''; const v = textOf(childOf(p, 'value')) || p.attrs.value || ''; if (k) props[cut(k, 60)] = cut(v, 300); }
    for (const p of childrenOf(n, 'property')) if (p.attrs.key) props[cut(p.attrs.key, 60)] = cut(p.attrs.value || '', 300);
    const el = C.element({kind: kind || type || 'unknown', name, description, passages: [spanOf(C, text, n)], external: /external/i.test(props['aiw-kind'] || '') || /^external$/i.test(props.external || ''), attrs: {xsiType: type, ...(ARCHIMATE_IMPLEMENTATION.has(type) ? {layer: 'implementation'} : {}), ...(Object.keys(props).length ? {properties: props} : {})}, ref: n.attrs.identifier || n.attrs.id});
    if (el) byRef.set(n.attrs.identifier || n.attrs.id, el);
  };
  if (root.prefix === 'archimate' || root.attrs['xmlns:archimate'] || /^archimate:/.test(root.attrs['xsi:type'] || '')) {
    // Archi's native file: folders of <element xsi:type="archimate:…" name id>, relationships among them, diagrams as elements.
    for (const n of walk(root)) {
      if (n.name !== 'element') continue;
      const type = xsiType(n);
      if (/Relationship$/.test(type)) { rels.push(n); continue; }
      if (/DiagramModel$/.test(type) || type === 'SketchModel' || type === 'CanvasModel') { diagrams.push(n); continue; }
      if (!type) continue;
      addElement(n, {name: n.attrs.name || '', description: textOf(childOf(n, 'documentation')) || n.attrs.documentation || '', type});
    }
    for (const n of rels) { const type = xsiType(n).replace(/Relationship$/, ''); const from = byRef.get(n.attrs.source), to = byRef.get(n.attrs.target); if (from && to) C.relationship({from, to, label: n.attrs.name || '', kind: ARCHIMATE_REL[type] || 'association', passages: [spanOf(C, text, n)], attrs: {xsiType: type, ...(n.attrs.accessType ? {accessType: n.attrs.accessType} : {})}, ref: n.attrs.id}); else C.omit({id: n.attrs.id || type, kind: 'relationship', reason: 'An end of the relationship is not an element the reader kept.'}); }
    for (const d of diagrams) { const ids = []; for (const c of walk(d)) if (c.attrs.archimateElement && byRef.has(c.attrs.archimateElement)) ids.push(byRef.get(c.attrs.archimateElement).id); C.view({title: d.attrs.name || 'View', kind: 'diagram', elementIds: ids, ref: d.attrs.id}); }
  } else {
    for (const n of childrenOf(childOf(root, 'elements') || {children: []}, 'element')) addElement(n, {name: textOf(childOf(n, 'name')) || n.attrs.name || '', description: textOf(childOf(n, 'documentation')), type: xsiType(n)});
    for (const n of childrenOf(childOf(root, 'relationships') || {children: []}, 'relationship')) {
      const type = xsiType(n), from = byRef.get(n.attrs.source), to = byRef.get(n.attrs.target);
      if (!from || !to) { C.omit({id: n.attrs.identifier || type, kind: 'relationship', reason: 'An end of the relationship is not an element the reader kept.'}); continue; }
      C.relationship({from, to, label: textOf(childOf(n, 'name')), kind: ARCHIMATE_REL[type] || 'association', passages: [spanOf(C, text, n)], attrs: {xsiType: type, ...(n.attrs.accessType ? {accessType: n.attrs.accessType} : {})}, ref: n.attrs.identifier});
    }
    const views = childOf(root, 'views');
    for (const v of views ? [...walk(views)].filter(n => n.name === 'view') : []) { const ids = []; for (const c of walk(v)) if (c.name === 'node' && c.attrs.elementRef && byRef.has(c.attrs.elementRef)) ids.push(byRef.get(c.attrs.elementRef).id); C.view({title: textOf(childOf(v, 'name')) || v.attrs.name || 'View', kind: cut(xsiType(v) || 'Diagram', 40), elementIds: ids, ref: v.attrs.identifier}); }
    if (childOf(root, 'organizations')) C.note('The organizations (folders) of the exchange file are not read.');
  }
  // Nesting from composition and aggregation: a composed element's parent is what composes it.
  for (const r of C.relationships) if (r.kind === 'composes') { const child = C.elements.find(e => e.id === r.to), parent = C.elements.find(e => e.id === r.from); if (child && parent && !child.parent && parent.kind !== child.kind) child.parent = parent.id; }
}

// ------------------------------------------------------------------------------------------------ BPMN 2.0
const BPMN_TASKS = new Set(['task', 'userTask', 'serviceTask', 'scriptTask', 'sendTask', 'receiveTask', 'manualTask', 'businessRuleTask', 'callActivity', 'subProcess', 'adHocSubProcess', 'transaction']);
const BPMN_EVENTS = {startEvent: 'start', intermediateCatchEvent: 'intermediate', intermediateThrowEvent: 'intermediate', boundaryEvent: 'boundary', endEvent: 'end'};
const BPMN_GATEWAYS = {exclusiveGateway: 'exclusive', parallelGateway: 'parallel', inclusiveGateway: 'inclusive', eventBasedGateway: 'event', complexGateway: 'complex'};
const BPMN_DATA = new Set(['dataObject', 'dataObjectReference', 'dataStore', 'dataStoreReference', 'dataInput', 'dataOutput']);
function bpmn(text, C) {
  const doc = parseXML(text, C), root = doc.children.find(n => n.name === 'definitions') || doc.children[0];
  if (!root) { C.note('No BPMN definitions element was found.'); return; }
  const byRef = new Map(), flows = [], messages = [], associations = [], laneOf = new Map(), pools = new Map();
  const named = (n, fallback) => n.attrs.name || fallback;
  for (const collab of childrenOf(root, 'collaboration')) {
    for (const p of childrenOf(collab, 'participant')) { const el = C.element({kind: 'pool', name: named(p, 'Participant'), passages: [spanOf(C, text, p)], attrs: {processRef: p.attrs.processRef || null}, ref: p.attrs.id}); if (el) { byRef.set(p.attrs.id, el); if (p.attrs.processRef) pools.set(p.attrs.processRef, el); } }
    messages.push(...childrenOf(collab, 'messageFlow'));
  }
  // Lanes first (they name the nodes they hold), then the nodes.
  const readLanes = (set, parentId) => { for (const l of childrenOf(set, 'lane')) { const el = C.element({kind: 'lane', name: named(l, 'Lane'), parent: parentId, passages: [spanOf(C, text, l)], ref: l.attrs.id}); if (!el) continue; byRef.set(l.attrs.id, el); for (const r of childrenOf(l, 'flowNodeRef')) laneOf.set(textOf(r), el.id); for (const child of childrenOf(l, 'childLaneSet')) readLanes(child, el.id); } };
  const readNodes = (container, parentId, pool) => {
    for (const n of childrenOf(container, 'laneSet')) readLanes(n, parentId);
    for (const n of container.children) {
      const t = n.name, key = spanOf(C, text, n), lane = laneOf.get(n.attrs.id) || null, parent = lane || parentId;
      if (t === 'laneSet') continue;
      if (t === 'sequenceFlow') { flows.push(n); continue; }
      if (t === 'association' || t === 'textAnnotation' || t === 'group') { if (t === 'textAnnotation') C.omit({id: n.attrs.id || t, kind: t, reason: 'Annotations and associations are not read.'}); continue; }
      if (BPMN_TASKS.has(t)) {
        const sub = t === 'subProcess' || t === 'adHocSubProcess' || t === 'transaction';
        const el = C.element({kind: 'task', name: named(n, t), description: textOf(childOf(n, 'documentation')), parent, passages: [key], attrs: {taskType: t, ...(sub ? {subprocess: true} : {}), ...(pool ? {poolId: pool.id} : {}), ...(lane ? {laneId: lane} : {})}, ref: n.attrs.id});
        if (el) { byRef.set(n.attrs.id, el); if (sub) readNodes(n, el.id, pool); }
        for (const a of [...childrenOf(n, 'dataOutputAssociation'), ...childrenOf(n, 'dataInputAssociation')]) associations.push({task: n.attrs.id, kind: a.name, node: a});
        continue;
      }
      if (BPMN_EVENTS[t]) {
        const def = n.children.find(c => /EventDefinition$/.test(c.name)), eventType = def ? def.name.replace(/EventDefinition$/, '') : 'none';
        const el = C.element({kind: 'event', name: named(n, ''), description: textOf(childOf(n, 'documentation')), parent, passages: [key], attrs: {position: BPMN_EVENTS[t], eventType: ['timer', 'message', 'error', 'signal'].includes(eventType) ? eventType : eventType === 'none' ? 'none' : eventType, ...(n.attrs.attachedToRef ? {attachedTo: n.attrs.attachedToRef} : {}), ...(pool ? {poolId: pool.id} : {}), ...(lane ? {laneId: lane} : {})}, ref: n.attrs.id});
        if (el) { byRef.set(n.attrs.id, el); if (!n.attrs.name) el.name = cut(`${eventType === 'none' ? '' : eventType + ' '}${BPMN_EVENTS[t]} event`, NAME); }
        continue;
      }
      if (BPMN_GATEWAYS[t]) { const el = C.element({kind: 'gateway', name: named(n, BPMN_GATEWAYS[t] + ' gateway'), description: textOf(childOf(n, 'documentation')), parent, passages: [key], attrs: {gatewayType: BPMN_GATEWAYS[t], ...(n.attrs.default ? {defaultFlow: n.attrs.default} : {}), ...(pool ? {poolId: pool.id} : {}), ...(lane ? {laneId: lane} : {})}, ref: n.attrs.id}); if (el) byRef.set(n.attrs.id, el); continue; }
      if (BPMN_DATA.has(t)) { const el = C.element({kind: 'data', name: named(n, t), parent: parentId, passages: [key], attrs: {dataType: t, ...(n.attrs.dataObjectRef ? {dataObjectRef: n.attrs.dataObjectRef} : {}), ...(n.attrs.dataStoreRef ? {dataStoreRef: n.attrs.dataStoreRef} : {})}, ref: n.attrs.id}); if (el) byRef.set(n.attrs.id, el); continue; }
      if (['documentation', 'extensionElements', 'ioSpecification', 'property', 'incoming', 'outgoing', 'multiInstanceLoopCharacteristics', 'standardLoopCharacteristics'].includes(t)) continue;
      C.omit({id: n.attrs.id || t, kind: t, reason: `The BPMN element ${t} is not read.`});
    }
  };
  for (const proc of childrenOf(root, 'process')) {
    const pool = pools.get(proc.attrs.id) || null;
    if (pool && proc.attrs.name && pool.name === 'Participant') pool.name = cut(proc.attrs.name, NAME);
    readNodes(proc, pool?.id || null, pool);
  }
  for (const d of [...childrenOf(root, 'dataStore'), ...childrenOf(root, 'message'), ...childrenOf(root, 'signal'), ...childrenOf(root, 'error')]) { if (d.name === 'dataStore') { const el = C.element({kind: 'data', name: named(d, 'Data store'), passages: [spanOf(C, text, d)], attrs: {dataType: 'dataStore'}, ref: d.attrs.id}); if (el) byRef.set(d.attrs.id, el); } }
  // A reference to a data store or object stands for it: a reference whose target was read is folded onto it.
  for (const el of C.elements) if (el.kind === 'data' && (el.attrs.dataStoreRef || el.attrs.dataObjectRef)) { const target = byRef.get(el.attrs.dataStoreRef || el.attrs.dataObjectRef); if (target && target !== el) { el.attrs.standsFor = target.id; if (el.name === el.attrs.dataType) el.name = target.name; } }
  for (const el of C.elements) if (el.attrs.attachedTo) el.attrs.attachedTo = byRef.get(el.attrs.attachedTo)?.id || null;
  for (const f of flows) {
    const from = byRef.get(f.attrs.sourceRef), to = byRef.get(f.attrs.targetRef), condition = textOf(childOf(f, 'conditionExpression'));
    if (!from || !to) { C.omit({id: f.attrs.id || 'sequenceFlow', kind: 'sequenceFlow', reason: 'An end of the flow is not an element the reader kept.'}); continue; }
    C.relationship({from, to, label: f.attrs.name || '', kind: 'sequence', passages: [spanOf(C, text, f)], attrs: {...(condition ? {condition: cut(condition, 600)} : {}), ...(f.attrs.id && from.attrs.defaultFlow === f.attrs.id ? {isDefault: true} : {})}, ref: f.attrs.id});
  }
  for (const m of messages) { const from = byRef.get(m.attrs.sourceRef), to = byRef.get(m.attrs.targetRef); if (!from || !to) { C.omit({id: m.attrs.id || 'messageFlow', kind: 'messageFlow', reason: 'An end of the message flow is not an element the reader kept.'}); continue; } C.relationship({from, to, label: m.attrs.name || '', kind: 'message', passages: [spanOf(C, text, m)], ref: m.attrs.id}); }
  for (const a of associations) { const task = byRef.get(a.task), ref = a.kind === 'dataOutputAssociation' ? textOf(childOf(a.node, 'targetRef')) : textOf(childOf(a.node, 'sourceRef')), data = byRef.get(ref); if (task && data) C.relationship({from: a.kind === 'dataOutputAssociation' ? task : data, to: a.kind === 'dataOutputAssociation' ? data : task, label: a.kind === 'dataOutputAssociation' ? 'writes' : 'reads', kind: 'accesses', passages: [spanOf(C, text, a.node)], ref: a.node.attrs.id}); }
  for (const d of childrenOf(root, 'BPMNDiagram')) C.view({title: d.attrs.name || 'Process diagram', kind: 'BPMNDiagram', elementIds: [...walk(d)].filter(n => n.name === 'BPMNShape' && byRef.has(n.attrs.bpmnElement)).map(n => byRef.get(n.attrs.bpmnElement).id), ref: d.attrs.id});
}

// ------------------------------------------------------------------------------------------------ AIW's own labels
// A diagram AIW exported (notation-code.js) labels each element with its kind above its name ("PHYSICAL APPLICATION
// COMPONENT", "ACTOR", …). When such a label comes back, the kind it names is read; a kind with no element here
// (a control, a threat, evidence) is reported. The same words are the technology slot of AIW's C4-PlantUML export.
const AIW_KICKER = {'physical application component': 'container', 'logical application component': 'component', 'application service': 'service', 'logical data component': 'data', 'physical data component': 'data', 'data entity': 'data', 'logical technology component': 'capability', 'physical technology component': 'technology', 'technology service': 'service', 'business service': 'service', process: 'process', actor: 'person', 'value stream': 'outcome', requirement: 'requirement', 'quality scenario': 'driver', decision: 'decision', alternative: 'alternative', placement: 'instance', 'security control': null, threat: null, evidence: null};
const aiwKind = kicker => { const k = plain(kicker); return Object.hasOwn(AIW_KICKER, k) ? {known: true, kind: AIW_KICKER[k]} : {known: false, kind: null}; };

// ------------------------------------------------------------------------------------------------ draw.io
const C4_KIND = {person: 'person', 'software system': 'system', container: 'container', component: 'component', systemscopeboundary: 'boundary', containerscopeboundary: 'boundary', 'system boundary': 'boundary', 'container boundary': 'boundary', 'enterprise boundary': 'boundary', boundary: 'boundary', 'deployment node': 'node', node: 'node'};
const DRAWIO_ARCHIMATE = {comp: 'container', collab: 'container', interface: 'interface', func: 'capability', interaction: 'process', proc: 'process', event: 'event', serv: 'service', actor: 'person', role: 'person', node: 'node', device: 'node', sysSw: 'technology', path: 'technology', netw: 'technology', artifact: 'data', passive: 'data', location: 'zone', stakeholder: 'stakeholder', driver: 'driver', assess: 'driver', goal: 'outcome', outcome: 'outcome', principle: 'constraint', requirement: 'requirement', constraint: 'constraint', meaning: 'outcome', value: 'outcome', resource: 'capability', capability: 'capability', course: 'decision', workPackage: 'task', deliverable: 'data', plateau: 'boundary', gap: 'requirement', group: 'boundary', junction: 'gateway'};
const styleOf = style => Object.fromEntries(String(style || '').split(';').filter(Boolean).map(s => { const i = s.indexOf('='); return i < 0 ? [s, true] : [s.slice(0, i), s.slice(i + 1)]; }));
const plain_ = v => String(v || '').trim().toLowerCase();
function drawio(text, C) {
  const doc = parseXML(text, C);
  const diagrams = [...walk(doc)].filter(n => n.name === 'diagram');
  const pairs = diagrams.length ? diagrams.map(d => ({diagram: d, m: childOf(d, 'mxGraphModel')})).filter(x => x.m) : [...walk(doc)].filter(n => n.name === 'mxGraphModel').map(m => ({diagram: null, m}));
  for (const d of diagrams) if (!childOf(d, 'mxGraphModel') && /^[A-Za-z0-9+/=\s]+$/.test(d.text || '') && squash(d.text).length > 20) C.note(`The diagram "${d.attrs.name || ''}" is compressed; decompress it first (the Projects page does when it reads the file), as this reader does not inflate.`.replace(/\s+/g, ' '));
  if (!pairs.length) { if (!diagrams.length) C.note('No draw.io diagram was found.'); return; }
  const byRef = new Map(), edges = [], own = /<mxfile\b[^>]*\bhost="AIW"/.test(text.slice(0, 2000));
  let plain = 0;
  for (const [di, {diagram, m}] of pairs.entries()) {
    const rootNode = childOf(m, 'root'), ids = [];
    if (!rootNode) continue;
    for (const n of rootNode.children) {
      const cell = n.name === 'mxCell' ? n : childOf(n, 'mxCell'), wrapper = n.name === 'mxCell' ? null : n;
      if (!cell) continue;
      const id = n.attrs.id || cell.attrs.id, st = styleOf(cell.attrs.style), label = stripTags(wrapper ? wrapper.attrs.label || wrapper.attrs.c4Name || '' : cell.attrs.value || '');
      if (cell.attrs.edge === '1') { edges.push({id, cell, wrapper, label, st}); continue; }
      if (cell.attrs.vertex !== '1') continue;
      const key = spanOf(C, text, n), parent = cell.attrs.parent;
      const c4Type = plain_(wrapper?.attrs.c4Type);
      if (wrapper && c4Type) {
        const kind = C4_KIND[c4Type] || null;
        if (!kind) { C.omit({id, kind: wrapper.attrs.c4Type, reason: `The C4 type "${cut(wrapper.attrs.c4Type, 40)}" is not read.`}); continue; }
        const external = /8c8496|6c6477|external/i.test(cell.attrs.style || '') || /_ext\b|external/i.test(wrapper.attrs.c4Type + ' ' + (wrapper.attrs.c4Container || ''));
        const el = C.element({kind, name: wrapper.attrs.c4Name || label || c4Type, description: wrapper.attrs.c4Description || '', technology: wrapper.attrs.c4Technology || '', tags: /cylinder|database/i.test(cell.attrs.style || '') || /database/i.test(wrapper.attrs.c4Type) ? ['Database'] : /queue/i.test(cell.attrs.style || '') ? ['Queue'] : [], parent: byRef.get(parent)?.id || null, external, passages: [key], attrs: {c4Type: wrapper.attrs.c4Type, ...(wrapper.attrs.c4Container ? {c4Container: wrapper.attrs.c4Container} : {})}, ref: id});
        if (el) { byRef.set(id, el); ids.push(el.id); }
        continue;
      }
      const shape = /shape=mxgraph\.archimate3\.(\w+)/.exec(cell.attrs.style || '');
      if (shape) {
        const sub = shape[1] === 'application' ? st.appType : shape[1] === 'tech' ? st.techType : shape[1] === 'business' ? st.busType : shape[1];
        const kind = DRAWIO_ARCHIMATE[sub] || DRAWIO_ARCHIMATE[shape[1]] || null;
        if (!kind) { C.omit({id, kind: shape[1], reason: `The ArchiMate shape "${cut(sub || shape[1], 40)}" is not read.`}); continue; }
        const el = C.element({kind, name: label || sub, parent: byRef.get(parent)?.id || null, passages: [key], attrs: {archimateShape: shape[1], ...(sub ? {archimateType: sub} : {}), ...(['workPackage', 'deliverable', 'plateau', 'gap'].includes(sub) || shape[1] === 'implementation' ? {layer: 'implementation'} : {}), ...(st.archiType ? {archiType: st.archiType} : {})}, ref: id});
        if (el) { byRef.set(id, el); ids.push(el.id); }
        continue;
      }
      // A file AIW wrote: swimlanes are its groups, and a labelled cell names its kind above its name (or is a task, an
      // event or a gateway by its shape, as the process scene draws them).
      const style = cell.attrs.style || '';
      if (own && /(?:^|;)swimlane(?:;|$)/.test(style) && label.trim()) {
        const [title, sub] = label.split(/\s+—\s+/);
        const el = C.element({kind: 'boundary', name: title, description: sub || '', parent: byRef.get(parent)?.id || null, external: /external/i.test(sub || ''), passages: [key], attrs: {aiwGroup: sub || ''}, ref: id});
        if (el) { byRef.set(id, el); ids.push(el.id); }
        continue;
      }
      if (own && label.trim()) {
        const parts = String(cell.attrs.value || '').split(/<br\s*\/?>/i).map(x => squash(stripTags(x))).filter(Boolean);
        const kicker = parts.length >= 2 && /^[A-Z0-9][A-Z0-9 &/-]*$/.test(parts[0]) ? parts[0] : '';
        const found = kicker ? aiwKind(kicker) : {known: false, kind: null};
        const kind = found.known ? found.kind : /(?:^|;)ellipse(?:;|$)/.test(style) ? 'event' : /(?:^|;)rhombus(?:;|$)/.test(style) ? 'gateway' : /(?:^|;)rounded=1(?:;|$)/.test(style) ? 'task' : null;
        if (!kind) { C.omit({id, kind: kicker || 'cell', reason: kicker ? `No AIW element kind for ${cut(kicker.toLowerCase(), 40)}.` : `"${cut(label, 60)}" has no C4 or ArchiMate metadata.`}); continue; }
        const name = kicker ? parts[1] : label, rest = kicker ? parts.slice(2) : [], ref = rest.find(x => /^[A-Z]{2,5}-\d+$/.test(x)) || '', sub = rest.filter(x => x !== ref).join(' ');
        const el = C.element({kind, name, description: sub, parent: byRef.get(parent)?.id || null, external: /\bexternal\b/i.test(sub), passages: [key], attrs: {...(kicker ? {kicker} : {shape: kind}), ...(ref ? {aiwRef: ref} : {})}, ref: id});
        if (el) { byRef.set(id, el); ids.push(el.id); }
        continue;
      }
      if (label.trim()) { plain++; if (plain <= 20) C.omit({id, kind: 'cell', reason: `"${cut(label, 60)}" has no C4 or ArchiMate metadata.`}); }
    }
    C.view({title: diagram?.attrs.name || 'Diagram ' + (di + 1), kind: 'drawio', elementIds: ids, ref: diagram?.attrs.id || null});
  }
  if (plain > 20) C.note(`${plain - 20} more cells without C4 or ArchiMate metadata were omitted.`);
  for (const e of edges) {
    const from = byRef.get(e.cell.attrs.source), to = byRef.get(e.cell.attrs.target);
    if (!from || !to) { if (e.wrapper?.attrs.c4Type || e.label.trim()) C.omit({id: e.id, kind: 'relationship', reason: 'An end of the connector is not an element the reader kept.'}); continue; }
    const key = spanOf(C, text, e.wrapper || e.cell), style = e.cell.attrs.style || '';
    const c4 = e.wrapper?.attrs.c4Type ? {label: e.wrapper.attrs.c4Description || e.label, technology: e.wrapper.attrs.c4Technology || ''} : null;
    const kind = c4 ? (/\b(?:async|asynchronous|publish|subscrib|event|queue|topic|message|stream)/i.test(c4.label + ' ' + c4.technology) ? 'flow' : 'uses')
      : /endArrow=block;endFill=0/.test(style) && /dashed=1/.test(style) ? 'realizes' : /startArrow=diamond/.test(style) ? 'composes' : /endArrow=open|endArrow=openThin/.test(style) && !/dashed=1/.test(style) ? 'serves' : /dashed=1/.test(style) && /endArrow=block|endArrow=classic/.test(style) ? 'flow' : /startArrow=oval/.test(style) ? 'assigned' : 'association';
    C.relationship({from, to, label: c4 ? c4.label : e.label, technology: c4 ? c4.technology : '', kind, passages: [key], attrs: c4 ? {c4Type: e.wrapper.attrs.c4Type} : {style: cut(style, 200)}, ref: e.id});
  }
}
// ------------------------------------------------------------------------------------------------ C4 macros (Mermaid, PlantUML)
// Person(alias, label, description?) · System(alias, label, description?) · Container(alias, label, technology?, description?)
// · Component(alias, label, technology?, description?) · Boundary(alias, label, type?) · Deployment_Node(alias, label,
// type?, description?) · Rel(from, to, label, technology?, description?); Rel_Back names the ends the other way round.
const C4_MACROS = {Person: ['person', false], Person_Ext: ['person', true], System: ['system', false], System_Ext: ['system', true], SystemDb: ['system', false, 'Database'], SystemDb_Ext: ['system', true, 'Database'], SystemQueue: ['system', false, 'Queue'], SystemQueue_Ext: ['system', true, 'Queue'], Container: ['container', false], Container_Ext: ['container', true], ContainerDb: ['container', false, 'Database'], ContainerDb_Ext: ['container', true, 'Database'], ContainerQueue: ['container', false, 'Queue'], ContainerQueue_Ext: ['container', true, 'Queue'], Component: ['component', false], Component_Ext: ['component', true], ComponentDb: ['component', false, 'Database'], ComponentDb_Ext: ['component', true, 'Database'], ComponentQueue: ['component', false, 'Queue'], ComponentQueue_Ext: ['component', true, 'Queue'], Deployment_Node: ['node', false], Node: ['node', false], Node_L: ['node', false], Node_R: ['node', false], Boundary: ['boundary', false], Enterprise_Boundary: ['boundary', false], System_Boundary: ['boundary', false], Container_Boundary: ['boundary', false]};
const C4_RELS = new Set(['Rel', 'BiRel', 'Rel_Back', 'Rel_Neighbor', 'Rel_Neighbour', 'Rel_Back_Neighbor', 'Rel_U', 'Rel_Up', 'Rel_D', 'Rel_Down', 'Rel_L', 'Rel_Left', 'Rel_R', 'Rel_Right', 'BiRel_U', 'BiRel_Up', 'BiRel_D', 'BiRel_Down', 'BiRel_L', 'BiRel_Left', 'BiRel_R', 'BiRel_Right']);
const C4_IGNORED = new Set(['UpdateRelStyle', 'UpdateElementStyle', 'UpdateLayoutConfig', 'UpdateBoundaryStyle', 'AddElementTag', 'AddRelTag', 'AddBoundaryTag', 'LAYOUT_WITH_LEGEND', 'LAYOUT_TOP_DOWN', 'LAYOUT_LEFT_RIGHT', 'LAYOUT_LANDSCAPE', 'LAYOUT_AS_SKETCH', 'SHOW_LEGEND', 'SHOW_FLOATING_LEGEND', 'HIDE_STEREOTYPE', 'SHOW_PERSON_OUTLINE', 'SHOW_PERSON_PORTRAIT', 'SHOW_PERSON_SPRITE', 'SHOW_DYNAMIC_LEGEND', 'Lay_U', 'Lay_D', 'Lay_L', 'Lay_R', 'Lay_Up', 'Lay_Down', 'Lay_Left', 'Lay_Right', 'LAYOUT_WITH_LEGEND()', 'SetPropertyHeader', 'AddProperty', 'WithoutPropertyHeader', 'RelIndex', 'SetDefaultLegendEntries', 'Rel_Index', 'increment']);
// The arguments of a macro call: comma-separated, a quoted argument may hold commas, $name=value arguments are dropped.
function macroArgs(s) {
  const out = []; let cur = '', q = null, i = 0;
  for (; i < s.length; i++) { const c = s[i]; if (q) { if (c === '\\' && i + 1 < s.length) { cur += s[++i]; continue; } if (c === q) q = null; else cur += c; continue; } if (c === '"' || c === "'") { q = c; continue; } if (c === ',') { out.push(cur); cur = ''; continue; } cur += c; }
  out.push(cur);
  return out.map(a => a.trim()).filter(a => !/^\$\w+\s*=/.test(a)).map(a => a.replace(/^\$\w+\s*=\s*/, ''));
}
function c4Line(code, C, key, ctx) {
  const m = /^(\w+)\s*\((.*)\)\s*(\{)?\s*$/.exec(code);
  if (!m) return false;
  const [, macro, inner, opens] = m, args = macroArgs(inner);
  if (C4_MACROS[macro]) {
    let [kind, external, tag] = C4_MACROS[macro];
    const alias = args[0] || '', label = args[1] || alias;
    let tech = kind === 'container' || kind === 'component' ? args[2] || '' : '';
    const description = kind === 'container' || kind === 'component' ? args[3] || '' : kind === 'node' ? args[3] || '' : kind === 'boundary' ? '' : args[2] || '';
    // AIW's C4-PlantUML export writes the element's kind where the technology goes: the kind is read, not a technology.
    const own = tech ? aiwKind(tech) : {known: false};
    if (own.known) { if (!own.kind) { C.omit({id: alias, kind: tech, reason: `No AIW element kind for ${cut(tech.toLowerCase(), 40)}.`}); if (opens) ctx.stack.push({id: null}); return true; } kind = own.kind; tech = ''; }
    const el = C.element({kind, name: label, description, technology: kind === 'node' ? args[2] || '' : tech, tags: [...(tag ? [tag] : []), ...(kind === 'boundary' && args[2] ? [args[2]] : [])], parent: ctx.stack.at(-1)?.id || null, external: external || (own.known && /\bexternal\b/i.test(description)), passages: [key], attrs: {macro, alias, ...(own.known ? {kicker: args[2]} : {})}, ref: alias});
    if (el) ctx.byAlias.set(alias, el);
    if (opens) ctx.stack.push(el || {id: null});
    return true;
  }
  if (C4_RELS.has(macro)) {
    const back = /Back/.test(macro), [a, b] = back ? [args[1], args[0]] : [args[0], args[1]];
    ctx.rels.push({from: a, to: b, label: args[2] || '', technology: args[3] || '', description: args[4] || '', key, bidirectional: /^BiRel/.test(macro)});
    return true;
  }
  if (C4_IGNORED.has(macro) || /^(?:UpdateRel|UpdateElement|Lay_|LAYOUT_|SHOW_|HIDE_|Add\w*Tag)/.test(macro)) { if (opens) ctx.stack.push({id: null}); return true; }
  C.omit({id: macro, kind: 'macro', reason: `The macro ${cut(macro, 40)} is not read.`});
  if (opens) ctx.stack.push({id: null});
  return true;
}
function c4Finish(C, ctx) {
  for (const r of ctx.rels) {
    const from = ctx.byAlias.get(r.from), to = ctx.byAlias.get(r.to);
    if (!from || !to) { C.omit({id: `${r.from} -> ${r.to}`, kind: 'relationship', reason: 'An end of the relationship is not an element this diagram defines.'}); continue; }
    const kind = /\b(?:async|asynchronous|publish|subscrib|event|queue|topic|message|stream)/i.test(r.label + ' ' + r.technology) ? 'flow' : 'uses';
    C.relationship({from, to, label: r.label, technology: r.technology, kind, passages: [r.key], attrs: {...(r.description ? {description: cut(r.description, TEXT)} : {}), ...(r.bidirectional ? {bidirectional: true} : {})}});
  }
}

// ------------------------------------------------------------------------------------------------ Mermaid
function mermaid(text, C) {
  const ls = lines(text).filter(l => l.raw && !l.raw.startsWith('%%'));
  const head = ls[0]?.raw || '';
  if (/^(?:flowchart|graph)\b/.test(head)) return flowchart(ls, C);
  const diagram = /^(C4\w+)/.exec(head)?.[1] || 'C4';
  const ctx = {stack: [], byAlias: new Map(), rels: []};
  let title = '';
  for (const l of ls.slice(1)) {
    const code = l.raw.replace(/%%.*$/, '').trim(), key = C.span(l.start, l.end);
    if (!code) continue;
    if (code === '}') { ctx.stack.pop(); continue; }
    if (/^title\b/.test(code)) { title = code.replace(/^title\s*/, ''); continue; }
    if (/^(?:accTitle|accDescr)\b/.test(code)) continue;
    if (!c4Line(code, C, key, ctx)) C.omit({id: cut(code, 40), kind: 'line', reason: 'The line is not a C4 statement.'});
  }
  c4Finish(C, ctx);
  C.view({title: title || diagram, kind: diagram, elementIds: C.elements.map(e => e.id)});
}
// A flowchart: nodes by shape, subgraphs as boundaries, edges by arrow. A label of several lines (<br/>) whose first
// line is in capitals is read as a kind label above the name (the shape AIW writes); otherwise the first line is the name.
const SHAPES = [['[(', ')]', 'data'], ['((', '))', 'event'], ['([', '])', 'service'], ['[[', ']]', 'container'], ['{{', '}}', 'gateway'], ['[/', '/]', 'container'], ['[\\', '\\]', 'container'], ['>', ']', 'person'], ['{', '}', 'gateway'], ['[', ']', 'container'], ['(', ')', 'container']];
const rx = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// A node: its id and, when drawn, its shape with a quoted or a bare label.
const NODE = new RegExp('^([A-Za-z0-9_.:-]+)(' + SHAPES.map(([open, close]) => rx(open) + '(?:\\s*"[^"]*"\\s*|[^\\]\\)}]*?)' + rx(close)).join('|') + ')?');
const ARROW = /^\s*(<?)(-{2,}|={2,}|-\.+-|-\.+)(>?|[ox]?)(?:\|([^|]*)\|)?\s*/;
const stripTagsKeep = s => String(s ?? '').replace(/<(?!br\s*\/?>)[^>]*>/gi, '');
function flowchart(ls, C) {
  const byId = new Map(), stack = [], edges = [];
  const unq = s => { let t = s.trim(); if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) t = t.slice(1, -1); return t.replace(/#quot;/g, '"').replace(/&quot;/g, '"'); };
  const nameOf = label => { const parts = stripTagsKeep(label).split(/\s*<br\s*\/?>\s*|\n/).map(s => s.trim()).filter(Boolean); if (parts.length >= 2 && /^[A-Z0-9][A-Z0-9 &/-]*$/.test(parts[0]) && /[A-Z]/.test(parts[0])) return {name: parts[1], kicker: parts[0], sub: parts.slice(2).join(' ')}; return {name: parts[0] || label, kicker: '', sub: parts.slice(1).join(' ')}; };
  const node = (id, shapeText, key) => {
    if (!id) return null;
    if (byId.has(id)) { const el = byId.get(id); if (el && shapeText != null && key) el.passages.push(key); return el; }
    let kind = 'container', label = id, drawn = false;
    if (shapeText != null) { for (const [open, close, k] of SHAPES) if (shapeText.startsWith(open) && shapeText.endsWith(close)) { kind = k; label = unq(shapeText.slice(open.length, shapeText.length - close.length)); drawn = true; break; } }
    const {name, kicker, sub} = nameOf(label), own = kicker ? aiwKind(kicker) : {known: false};
    if (own.known && !own.kind) { C.omit({id, kind: kicker, reason: `No AIW element kind for ${cut(kicker.toLowerCase(), 40)}.`}); byId.set(id, null); return null; }
    const el = C.element({kind: own.kind || kind, name, description: sub, parent: stack.at(-1)?.id || null, external: /\bexternal\b/i.test(sub), passages: [key], attrs: {alias: id, ...(kicker ? {kicker} : {}), shape: drawn ? kind : 'none'}, ref: id});
    if (el) byId.set(id, el);
    return el;
  };
  for (const l of ls.slice(1)) {
    const code = l.raw.replace(/%%.*$/, '').trim(), key = C.span(l.start, l.end);
    if (!code) continue;
    if (/^subgraph\b/.test(code)) { const m = /^subgraph\s+([^\s[]+)?\s*(?:\[([\s\S]*)\])?\s*$/.exec(code); const id = m?.[1] || 'group' + (stack.length + 1), title = m?.[2] != null ? unq(m[2]) : m?.[1] || 'Group'; const el = C.element({kind: 'boundary', name: nameOf(title).name, parent: stack.at(-1)?.id || null, passages: [key], attrs: {alias: id}, ref: id}); if (el) byId.set(id, el); stack.push(el || {id: null}); continue; }
    if (code === 'end') { stack.pop(); continue; }
    if (/^(?:classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/.test(code)) continue;
    // A chain of nodes and arrows: a[x] --> b --> c; "a -- text --> b" writes the label between two dashes.
    let rest = code, prev = null, arrow = null, ok = false;
    for (let guard = 0; guard < 50 && rest; guard++) {
      const m = NODE.exec(rest);
      if (!m) break;
      const el = node(m[1], m[2] ?? null, key); rest = rest.slice(m[0].length); ok = true;
      if (prev && el && arrow) edges.push({from: prev, to: el, label: arrow.label, key, kind: arrow.kind});
      const ar = ARROW.exec(rest);
      if (!ar) break;
      const dashed = /\./.test(ar[2]), thick = /=/.test(ar[2]);
      arrow = {label: unq(ar[4] || ''), kind: thick ? 'sequence' : dashed ? 'flow' : 'uses'};
      rest = rest.slice(ar[0].length); prev = el;
      const mid = /^([^-=]+?)\s*(-{2,}>|={2,}>|-\.+->)\s*/.exec(rest);
      if (mid) { arrow.label = unq(mid[1]); rest = rest.slice(mid[0].length); }
    }
    if (!ok) C.omit({id: cut(code, 40), kind: 'line', reason: 'The line is not a flowchart statement.'});
  }
  for (const e of edges) C.relationship({from: e.from, to: e.to, label: e.label, kind: e.kind, passages: [e.key]});
  C.view({title: 'Flowchart', kind: 'flowchart', elementIds: C.elements.map(e => e.id)});
}

// ------------------------------------------------------------------------------------------------ PlantUML
function plantuml(text, C) {
  const ctx = {stack: [], byAlias: new Map(), rels: []};
  let inside = false, block = false, title = '';
  for (const l of lines(text)) {
    let code = l.raw;
    if (block) { const end = code.indexOf("'/"); if (end < 0) continue; block = false; code = code.slice(end + 2).trim(); }
    if (code.startsWith("/'")) { const end = code.indexOf("'/", 2); if (end < 0) { block = true; continue; } code = code.slice(end + 2).trim(); }
    if (!code || code.startsWith("'")) continue;
    if (/^@startuml\b/.test(code)) { inside = true; continue; }
    if (/^@enduml\b/.test(code)) { inside = false; continue; }
    if (!inside) continue;
    const key = C.span(l.start, l.end);
    if (code === '}') { ctx.stack.pop(); continue; }
    if (/^!include/.test(code)) { C.note(`${code.split(/\s+/)[0]} ${cut(code.split(/\s+/)[1] || '', 200)} was not followed: only this file was read.`); continue; }
    if (/^(?:!|skinparam|title|header|footer|legend|endlegend|caption|scale|left to right|top to bottom|hide|show|together)\b/.test(code) || /^!/.test(code)) { if (/^title\b/.test(code)) title = code.replace(/^title\s*/, ''); continue; }
    if (!c4Line(code, C, key, ctx)) C.omit({id: cut(code, 40), kind: 'line', reason: 'The line is not a C4 statement.'});
  }
  c4Finish(C, ctx);
  C.view({title: title || 'C4 diagram', kind: 'C4', elementIds: C.elements.map(e => e.id)});
}

// ------------------------------------------------------------------------------------------------ compressed draw.io
// A draw.io file whose <diagram> holds base64 of a deflated, URL-encoded diagram. Decoding needs DecompressionStream
// (built into the browser and Node); where it is missing, the text is returned as it is and the note says so. The
// Projects page runs this before interpreting, so the text a project keeps is the readable XML.
export async function inflateModelText(text) {
  if (typeof text !== 'string' || !/<diagram\b/.test(text) || text.length > MODEL_LIMIT) return {text, inflated: 0, note: ''};
  const parts = [...text.matchAll(/<diagram\b([^>]*)>([^<]*)<\/diagram>/g)].filter(m => /^[A-Za-z0-9+/=\s]+$/.test(m[2]) && squash(m[2]).length > 20);
  if (!parts.length) return {text, inflated: 0, note: ''};
  if (typeof DecompressionStream !== 'function' || typeof atob !== 'function') return {text, inflated: 0, note: 'The compressed diagram could not be decoded here: DecompressionStream is not available. Export the file uncompressed (File · Properties · Compressed off) and choose it again.'};
  let out = text, inflated = 0, note = '';
  for (const m of parts) {
    try {
      const bytes = Uint8Array.from(atob(squash(m[2]).replace(/\s+/g, '')), c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const xml = decodeURIComponent(await new Response(stream).text());
      if (xml.length > MODEL_LIMIT) { note = 'A decompressed diagram is larger than this reader reads.'; continue; }
      out = out.replace(m[0], `<diagram${m[1]}>${xml}</diagram>`); inflated++;
    } catch { note = 'A compressed diagram could not be decoded; it was left as it is.'; }
  }
  return {text: out, inflated, note};
}
