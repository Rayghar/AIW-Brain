// Decision records in and out (round 6, Contract F and Contract I). interpretMADR(text) reads one or more Markdown Any
// Decision Records (MADR 2.x and 4.x, and the plain status / context / decision / consequences form) into the shape of a
// model brought in: elements of kind decision and alternative with the MADR sections kept on them, every element citing
// the lines it came from, a question where a record leaves something unsaid. Nothing read here is a record: the
// interpreter (model-interpreter.js) hands the elements to the drafter, and a person accepts each through the guide
// commands. madrExport(p) writes one MADR file per Chapter 3 decision from the saved records — the title, the status as
// recorded, the context, the quality drivers it names as decision drivers, the alternatives with their benefits and
// costs as good and bad lines, the chosen alternative with its rationale, the consequences, and the evidence and
// assumptions as confirmation. A file is derived from the record and says so; it never replaces it. DOM-free; the
// browser (Chapter 3's Output tab), the server and the suites load it (shared/madr.js re-exports it).
import {sha256} from './brain-integrity.js';

export const MADR_RULES = 'madr-rules-1';
export const MADR_LIMITS = Object.freeze({text: 400000, files: 200, decisions: 500, options: 20, drivers: 40, lines: 60, title: 200, line: 2000});

const clean = (v, n = MADR_LIMITS.line) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const pad = n => String(n).padStart(3, '0');
const norm = s => clean(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const lower = s => String(s ?? '').toLowerCase();

// The sections MADR names, and the words each is known by across its versions and the plain form.
const SECTION = [
  ['context', ['context and problem statement', 'context', 'problem statement', 'problem']],
  ['drivers', ['decision drivers', 'drivers', 'forces']],
  ['options', ['considered options', 'options', 'considered alternatives', 'alternatives']],
  ['outcome', ['decision outcome', 'decision', 'outcome', 'chosen option']],
  ['consequences', ['consequences', 'positive consequences', 'negative consequences']],
  ['confirmation', ['confirmation', 'validation', 'compliance']],
  ['prosCons', ['pros and cons of the options', 'pros and cons', 'evaluation of options', 'option evaluation']],
  ['status', ['status']],
  ['more', ['more information', 'links', 'related decisions', 'references', 'notes']]
];
const sectionKey = heading => { const h = norm(heading); for (const [key, names] of SECTION) if (names.includes(h)) return key; return null; };
// A "Good, because …" line and its kin: the stance and the argument.
const STANCE = /^(good|bad|neutral|positive|negative|pro|con|\+|-)\s*,?\s*(?:because\s*)?(.*)$/i;
const stanceOf = s => { const m = STANCE.exec(clean(s)); if (!m) return null; const w = lower(m[1]); return {stance: w === 'good' || w === 'positive' || w === 'pro' || w === '+' ? 'good' : w === 'bad' || w === 'negative' || w === 'con' || w === '-' ? 'bad' : 'neutral', text: clean(m[2])}; };
const item = line => { const m = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line); return m ? m[1] : null; };
const frontKey = line => { const m = /^([A-Za-z][A-Za-z0-9 _-]{0,40}):\s*(.*)$/.exec(line.trim()); return m ? [norm(m[1]).replace(/ /g, '-'), clean(m[2].replace(/^["']|["']$/g, ''))] : null; };

// The input as files: a string (several records separated by their own title or by a `---` rule), an array of strings,
// or an array of {name, text}.
function filesOf(text) {
  const list = Array.isArray(text) ? text : [text];
  return list.slice(0, MADR_LIMITS.files).map((f, i) => (typeof f === 'string' ? {name: 'decisions-' + (i + 1) + '.md', text: f} : {name: clean(f?.name || 'decisions-' + (i + 1) + '.md', 200), text: String(f?.text ?? '')}));
}
// Front matter: `---`, `key: value` lines, `---`. Returns the line after it, or the start when there is none.
function frontMatter(lines, from) {
  if (lines[from]?.trim() !== '---') return {end: from, attrs: null};
  const attrs = {}; let i = from + 1;
  for (; i < lines.length && lines[i].trim() !== '---'; i++) { if (!lines[i].trim()) continue; const kv = frontKey(lines[i]); if (!kv) return {end: from, attrs: null}; attrs[kv[0]] = kv[1]; }
  return i < lines.length ? {end: i + 1, attrs, lines: [from, i]} : {end: from, attrs: null};
}
// One file into its records: a record starts at front matter or at a `# ` title; a `---` rule between records separates
// them too. Each record is the run of lines from its start to the next start.
function splitRecords(lines) {
  // The starts: every front matter block and every `# ` title; a `---` rule after the first start separates too.
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^# /.test(t)) { starts.push({at: i, title: true}); continue; }
    if (t !== '---') continue;
    const fm = frontMatter(lines, i);
    if (fm.attrs) { starts.push({at: i, title: false, end: fm.end}); i = fm.end - 1; } else if (starts.length) starts.push({at: i + 1, title: false, cut: i});
  }
  if (!starts.length) return lines.some(l => l.trim()) ? [[0, lines.length]] : [];
  // A title right after a front matter block (blank lines between) belongs to that block's record.
  const kept = [];
  for (const s of starts) { const prev = kept.at(-1); if (prev && s.title && prev.end != null && !lines.slice(prev.end, s.at).some(l => l.trim())) continue; kept.push(s); }
  const out = [];
  if (kept[0].at > 0 && lines.slice(0, kept[0].at).some(l => l.trim())) out.push([0, kept[0].at]);
  for (let k = 0; k < kept.length; k++) out.push([kept[k].at, k + 1 < kept.length ? (kept[k + 1].cut ?? kept[k + 1].at) : lines.length]);
  return out.filter(([a, b]) => lines.slice(a, b).some(l => l.trim()));
}
// The chosen option and the reason, from the Decision Outcome text: `Chosen option: "X", because Y` (MADR), or
// `We chose X because Y` / `Decision: X.` in the plain form. The quoted title is taken whole; an unquoted one ends at the
// first comma, semicolon or full stop.
function parseOutcome(text) {
  const t = clean(text); if (!t) return {chosen: '', because: ''};
  let m = /chosen option:?\s*/i.exec(t), rest = m ? t.slice(m.index + m[0].length) : '';
  if (!m) { m = /^(?:we\s+(?:will|chose|choose|decided(?:\s+to)?)|decision:)\s*/i.exec(t); rest = m ? t.slice(m[0].length) : ''; }
  if (!m) return {chosen: '', because: ''};
  let chosen = '', tail = rest;
  const q = /^["“']([^"”']+)["”']/.exec(rest);
  if (q) { chosen = q[1]; tail = rest.slice(q[0].length); } else { const e = /[,;.]|\s+because\b/i.exec(rest); chosen = e ? rest.slice(0, e.index) : rest; tail = e ? rest.slice(e.index) : ''; }
  const b = /because\s+(.+?)(?:(?<=[.!?])\s+(?=[A-Z])|$)/i.exec(tail);
  return {chosen: clean(chosen, MADR_LIMITS.title), because: clean(b ? b[1] : '')};
}

// Reads one record: the lines of one decision (with their passage ids) into the decision and its alternatives.
function readRecord(lines, pid, n, file, report) {
  const fm = frontMatter(lines, 0), attrs = {status: '', date: '', deciders: '', consulted: '', informed: '', context: '', drivers: [], options: [], outcome: {chosen: '', because: '', text: ''}, consequences: {good: [], bad: [], neutral: []}, confirmation: '', moreInformation: '', file};
  const cite = new Set(), cites = idx => { for (const i of idx) if (pid[i]) cite.add(pid[i]); };
  if (fm.attrs) { attrs.status = fm.attrs.status || ''; attrs.date = fm.attrs.date || ''; attrs.deciders = fm.attrs['decision-makers'] || fm.attrs.deciders || ''; attrs.consulted = fm.attrs.consulted || ''; attrs.informed = fm.attrs.informed || ''; cites(Array.from({length: fm.end}, (_, i) => i)); }
  let title = '', titleAt = -1, confidence = 'stated';
  const body = [];
  for (let i = fm.end; i < lines.length; i++) { const t = lines[i]; if (!title && /^# /.test(t.trim())) { title = clean(t.trim().replace(/^#\s+/, ''), MADR_LIMITS.title); titleAt = i; continue; } body.push(i); }
  // Sections: the `##` headings, with `###` sub-headings under Decision Outcome and Pros and Cons.
  const sections = []; let cur = {key: 'preamble', title: '', lines: [], subs: []}, sub = null;
  for (const i of body) {
    const t = lines[i], h2 = /^##\s+(.+)$/.exec(t.trim()), h3 = /^###\s+(.+)$/.exec(t.trim());
    if (h2 && !/^###/.test(t.trim())) { sections.push(cur); cur = {key: sectionKey(h2[1]) || 'other', title: clean(h2[1], MADR_LIMITS.title), lines: [], subs: [], at: i}; sub = null; continue; }
    if (h3) { sub = {key: sectionKey(h3[1]) || 'option', title: clean(h3[1], MADR_LIMITS.title), lines: [], at: i}; cur.subs.push(sub); continue; }
    (sub || cur).lines.push(i);
  }
  sections.push(cur);
  const textOf = idx => { cites(idx); return clean(idx.map(i => lines[i]).filter(l => l.trim()).join(' '), MADR_LIMITS.line * 4); };
  const items = idx => { cites(idx); const out = []; for (const i of idx) { const it = item(lines[i]); if (it != null) out.push({text: clean(it), at: i}); } return out; };
  const stances = (idx, into) => { cites(idx); const rest = []; for (const i of idx) { const it = item(lines[i]); const s = it != null ? stanceOf(it) : null; if (s && s.text) into[s.stance].push(s.text); else if (lines[i].trim()) rest.push(i); } return rest; };
  const options = new Map(), optionList = [];
  const option = (name, at) => { const k = norm(name); if (!k) return null; if (!options.has(k)) { if (optionList.length >= MADR_LIMITS.options) { report.omitted.push({file, line: at + 1, reason: 'More than ' + MADR_LIMITS.options + ' options; the rest are not read.'}); return null; } const o = {title: clean(name, MADR_LIMITS.title), description: '', good: [], bad: [], neutral: [], at: [at]}; options.set(k, o); optionList.push(o); } else options.get(k).at.push(at); return options.get(k); };
  for (const s of sections) {
    if (s.key === 'preamble') {
      // MADR 2.x keeps status, deciders and date as a list before the first section; the plain form has a `Technical Story`.
      for (const i of s.lines) { const it = item(lines[i]) ?? lines[i]; const kv = frontKey(it); if (!kv) continue; if (kv[0] === 'status' && !attrs.status) attrs.status = kv[1]; else if ((kv[0] === 'deciders' || kv[0] === 'decision-makers') && !attrs.deciders) attrs.deciders = kv[1]; else if (kv[0] === 'date' && !attrs.date) attrs.date = kv[1]; else if (kv[0] === 'technical-story') attrs.moreInformation = kv[1]; else continue; cites([i]); }
      continue;
    }
    if (s.key === 'status') { attrs.status = attrs.status || textOf(s.lines); continue; }
    if (s.key === 'context') { attrs.context = [attrs.context, textOf(s.lines)].filter(Boolean).join(' '); continue; }
    if (s.key === 'drivers') { attrs.drivers.push(...items(s.lines).slice(0, MADR_LIMITS.drivers).map(x => x.text)); continue; }
    if (s.key === 'options') { for (const x of items(s.lines)) option(x.text, x.at); continue; }
    if (s.key === 'outcome') {
      const text = textOf(s.lines); attrs.outcome.text = text;
      const o = parseOutcome(text); attrs.outcome.chosen = o.chosen; attrs.outcome.because = o.because;
      for (const x of s.subs) { if (x.key === 'consequences') stances(x.lines, attrs.consequences); else if (x.key === 'confirmation') attrs.confirmation = textOf(x.lines); else { const rest = stances(x.lines, attrs.consequences); if (rest.length) attrs.outcome.text = [attrs.outcome.text, textOf(rest)].filter(Boolean).join(' '); } }
      continue;
    }
    if (s.key === 'consequences') { const rest = stances(s.lines, attrs.consequences); if (rest.length) attrs.consequences.neutral.push(textOf(rest)); for (const x of s.subs) { const r = stances(x.lines, attrs.consequences); if (r.length) attrs.consequences[/negative|bad/i.test(x.title) ? 'bad' : /positive|good/i.test(x.title) ? 'good' : 'neutral'].push(textOf(r)); } continue; }
    if (s.key === 'confirmation') { attrs.confirmation = textOf(s.lines); continue; }
    if (s.key === 'prosCons') { for (const x of s.subs) { const o = option(x.title, x.at); if (!o) continue; o.at.push(...x.lines); const rest = stances(x.lines, o); if (rest.length) o.description = textOf(rest); } continue; }
    if (s.key === 'more') { attrs.moreInformation = [attrs.moreInformation, textOf(s.lines)].filter(Boolean).join(' '); continue; }
    report.omitted.push({file, line: (s.at ?? 0) + 1, reason: 'Section “' + s.title + '” is not a MADR section; its text is not read.'});
  }
  if (!title) { title = clean(attrs.context.split(/(?<=[.!?])\s/)[0] || attrs.outcome.chosen || 'Decision ' + n, MADR_LIMITS.title); confidence = 'inferred'; } else cites([titleAt]);
  // The chosen option names one of the considered options when it does; a chosen option nobody listed is added.
  let chosen = null;
  if (attrs.outcome.chosen) { const k = norm(attrs.outcome.chosen); chosen = options.get(k) || [...options.values()].find(o => norm(o.title).startsWith(k) || k.startsWith(norm(o.title))) || null; if (!chosen) chosen = option(attrs.outcome.chosen, sections.find(s => s.key === 'outcome')?.at ?? 0); }
  attrs.options = optionList.map(o => o.title);
  const id = 'D-' + pad(n), passages = [...cite].sort(), at = o => o.at.map(i => pid[i]).filter(Boolean);
  const decision = {id, kind: 'decision', name: title, description: attrs.context.slice(0, MADR_LIMITS.line), technology: '', tags: [attrs.status ? 'status:' + attrs.status : ''].filter(Boolean), parent: null, external: false, passages, confidence, attrs: {...attrs, title, chosen: chosen?.title || ''}};
  const alternatives = optionList.map((o, i) => ({id: id + '-A' + (i + 1), kind: 'alternative', name: o.title, description: o.description, technology: '', tags: o === chosen ? ['chosen'] : [], parent: id, external: false, passages: [...new Set(at(o))].sort().length ? [...new Set(at(o))].sort() : passages, confidence: 'stated', attrs: {good: o.good, bad: o.bad, neutral: o.neutral, chosen: o === chosen}}));
  const relationships = alternatives.map(a => ({id: 'R-' + id + '-' + a.id, from: id, to: a.id, label: a.attrs.chosen ? 'chooses' : 'considers', technology: '', kind: 'association', passages: a.passages, confidence: 'stated'}));
  const questions = [];
  if (!attrs.status) questions.push({key: id + ':status', question: 'What is the status of “' + title + '”: proposed, accepted, rejected, deprecated or superseded?', forType: 'decision'});
  if (optionList.length < 2) questions.push({key: id + ':options', question: 'Which other options were considered for “' + title + '”? A decision compares at least two.', forType: 'alternative'});
  if (!attrs.drivers.length) questions.push({key: id + ':drivers', question: 'Which quality drivers decide “' + title + '”?', forType: 'decision'});
  if (!chosen) questions.push({key: id + ':outcome', question: 'Which option was chosen for “' + title + '”, and why?', forType: 'decision'});
  return {decision, alternatives, relationships, questions};
}

// Contract I: decision records into the shape of a model brought in.
export function interpretMADR(text, {name = 'decisions'} = {}) {
  const files = filesOf(text), report = {omitted: [], counts: {}}, elements = [], relationships = [], questions = [], passages = [], views = [];
  let offset = 0, n = 0;
  const joined = files.map(f => f.text).join('\n');
  if (joined.length > MADR_LIMITS.text) report.omitted.push({reason: 'The text is longer than ' + MADR_LIMITS.text + ' characters; the rest is not read.'});
  for (const f of files) {
    const text = f.text.slice(0, Math.max(0, MADR_LIMITS.text - offset)).replace(/\r\n?/g, '\n'), lines = text.split('\n'), pid = [];
    let pos = offset;
    for (const l of lines) { const t = l.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ''); if (t.trim()) { const id = 'P-' + pad(passages.length + 1); passages.push({id, start: pos, end: pos + l.length, text: clean(t, MADR_LIMITS.line), file: f.name}); pid.push(id); } else pid.push(null); pos += l.length + 1; }
    offset = pos;
    for (const [a, b] of splitRecords(lines)) {
      if (n >= MADR_LIMITS.decisions) { report.omitted.push({file: f.name, line: a + 1, reason: 'More than ' + MADR_LIMITS.decisions + ' decisions; the rest are not read.'}); break; }
      const r = readRecord(lines.slice(a, b), pid.slice(a, b), ++n, f.name, report);
      elements.push(r.decision, ...r.alternatives); relationships.push(...r.relationships); questions.push(...r.questions);
    }
  }
  report.counts = {files: files.length, decisions: elements.filter(e => e.kind === 'decision').length, alternatives: elements.filter(e => e.kind === 'alternative').length, relationships: relationships.length, passages: passages.length, questions: questions.length};
  return {format: 'madr', rules: MADR_RULES, name: clean(name, 200), hash: sha256(joined), passages, elements, relationships, views, questions, report};
}

// ---------------------------------------------------------------- out: one MADR file per Chapter 3 decision
const slug = s => clean(s, 200).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '') || 'decision';
const line = s => clean(s, 4000);
const stop = s => (/[.!?…]$/.test(s) ? '' : '.');
const bullet = (stance, text) => (text ? '* ' + stance + ', because ' + line(text) + stop(line(text)) + '\n' : '');
const dateOf = v => { const m = /^\d{4}-\d{2}-\d{2}/.exec(String(v || '')); return m ? m[0] : ''; };
// The MADR text of one decision from the saved record. Nothing is invented: a section with nothing recorded says so.
export function madrText(p, d) {
  const drivers = (p.quality?.drivers || []).filter(q => (d.driverIds || []).includes(q.id)), reqs = (d.requirementIds || []).map(id => (p.artefacts || []).find(a => a.id === id) || {id, title: ''});
  const alts = d.alternatives || [], chosen = alts.find(a => a.id === d.selectedAlternativeId) || null, date = dateOf(d.history?.at(-1)?.at || d.governance?.at || p.updatedAt);
  const title = d.id + ' · ' + line(d.question || d.topic || 'Decision');
  let out = '---\nstatus: "' + line(d.status || 'draft').replace(/"/g, '') + '"\n' + (date ? 'date: ' + date + '\n' : '') + (d.owner ? 'decision-makers: "' + line(d.owner).replace(/"/g, '') + '"\n' : '') + '---\n\n# ' + title + '\n\n';
  out += '## Context and Problem Statement\n\n' + (line(d.context) || 'Not recorded.') + (d.question ? '\n\n' + line(d.question) : '') + '\n\n';
  out += '## Decision Drivers\n\n' + (drivers.length ? drivers.map(q => '* ' + q.id + ' · ' + line(q.title) + (q.priority || q.category ? ' (' + [q.priority, q.category].filter(Boolean).join(', ') + ')' : '')).join('\n') : '* No quality driver is linked yet.') + '\n\n';
  out += '## Considered Options\n\n' + (alts.length ? alts.map(a => '* ' + a.id + ' · ' + line(a.title)).join('\n') : '* No alternative is recorded yet.') + '\n\n';
  out += '## Decision Outcome\n\n' + (chosen ? 'Chosen option: "' + chosen.id + ' · ' + line(chosen.title) + '", because ' + (line(d.rationale) || 'the rationale is not recorded yet') + stop(line(d.rationale) || 'x') + (d.status === 'accepted' ? ' The architect accepted this choice.' : d.status === 'recorded' ? ' The choice is recorded; architect acceptance is still to come.' : d.status === 'superseded' ? ' This decision has been superseded.' : ' This is a working draft; nothing is accepted yet.') : 'No option is chosen yet' + (d.status === 'superseded' ? '; this decision has been superseded.' : '; the decision is a ' + line(d.status || 'draft') + '.')) + '\n\n';
  out += '### Consequences\n\n';
  const cons = (chosen ? [bullet('Good', chosen.benefits), bullet('Bad', chosen.costs), bullet('Neutral', chosen.consequences)] : []).join('') + (d.risks ? bullet('Bad', 'risk: ' + line(d.risks)) : '') + (d.mitigation ? bullet('Neutral', 'mitigation: ' + line(d.mitigation)) : '');
  out += (cons || '* Neutral, because no consequence is recorded yet.\n') + '\n';
  out += '### Confirmation\n\n' + ([d.assumptions ? 'Assumptions: ' + line(d.assumptions) + (d.assumptionsResolved ? ' (resolved)' : ' (open)') : '', d.assumptionEvidence ? 'Evidence: ' + line(d.assumptionEvidence) : '', d.governance?.evidence ? 'Governance evidence: ' + line(d.governance.evidence) + (d.governance.reviewer ? ' (' + line(d.governance.reviewer) + ')' : '') : ''].filter(Boolean).join(' ') || 'No evidence or assumption is recorded yet; confirmation stays open.') + '\n\n';
  out += '## Pros and Cons of the Options\n\n' + (alts.length ? alts.map(a => '### ' + a.id + ' · ' + line(a.title) + '\n\n' + (line(a.summary) || 'Not described.') + (a.pattern ? ' Pattern: ' + line(a.pattern) + stop(line(a.pattern)) : '') + (a.antiPattern ? ' Anti-pattern: ' + line(a.antiPattern) + stop(line(a.antiPattern)) : '') + '\n\n' + (bullet('Good', a.benefits) + bullet('Bad', a.costs) + bullet('Neutral', a.consequences) || '* Neutral, because no benefit or cost is recorded yet.\n')).join('\n') : 'No alternative is recorded yet.\n') + '\n';
  out += '## More Information\n\n' + ['Requirements: ' + (reqs.length ? reqs.map(r => r.id + (r.title ? ' · ' + line(r.title) : '')).join('; ') : 'none linked') + '.', d.source ? 'Source: ' + line(d.source) + '.' : '', 'Derived from AIW record ' + d.id + ' (revision ' + (d.revision ?? 1) + ', status ' + line(d.status || 'draft') + ') in ' + line(p.name || 'the project') + '; the saved record is the authority, this file is a reading of it.'].filter(Boolean).join(' ') + '\n';
  return out;
}
// Every Chapter 3 decision as a MADR file under decisions/.
export function madrExport(p) {
  const records = p?.decisions?.records || [];
  const files = records.map(d => ({path: 'decisions/' + d.id + '-' + slug(d.question || d.topic || 'decision') + '.md', text: madrText(p, d)}));
  return {schema: 'aiw.madr-export/1', rules: MADR_RULES, project: p?.name || '', files, count: files.length};
}
// A convenience for the round trip and the suites: the exported files read back as one model.
export const madrRoundTrip = p => interpretMADR(madrExport(p).files.map(f => ({name: f.path.split('/').pop(), text: f.text})), {name: p?.name || 'decisions'});
