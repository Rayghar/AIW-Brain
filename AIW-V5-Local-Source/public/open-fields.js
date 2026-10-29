// Fields that are open (round 12, D-12 and DM-16). A value AIW cannot state is not a value: a field is either stated,
// "not stated" (no source says it), or an "open question" (a question someone asked and no source answers yet). The
// state is kept on the record beside its fields, never in their words, so checks read the state and never the text:
//   record.open = {<field>: {state: 'not-stated' | 'open-question', question?, raisedBy?, at?, source?}}
// A required field in either state satisfies the record's shape; readers raise one grouped finding per cause and the
// SDD prints "open: …" once and lists it in Appendix B. Older records carry the state as placeholder words ("Open
// question: …", "Not stated in the brief or the upstream records.", "Unassigned"); isOpenText recognises them so a
// document written before round 12 reads the same. Pure functions: no DOM, no Node API, no project writes.

export const OPEN_STATES = Object.freeze(['not-stated', 'open-question']);
export const NOT_STATED_LABEL = 'not stated';
export const OPEN_LABEL = Object.freeze({'not-stated': 'not stated', 'open-question': 'open question'});

// A placeholder followed by "Open question" ("Unassigned. Open question", round 23 GR-CMP-04) asks it all the same.
const QUESTION = /^\s*(?:(?:unassigned|unknown|tbd|tbc)\.?\s+)?open question\s*[:.-]?\s*(.*)$/i;
const PLACEHOLDERS = [
  /^\s*not stated(?: in the brief or the upstream records)?\.?\s*$/i,
  /^\s*not stated in (?:the )?(?:workbook|source|brief)\.?\s*$/i,
  /^\s*(?:unassigned|unknown|tbd|tbc|to be (?:confirmed|decided|defined)|n\/a)\.?\s*$/i,
  /^\s*confirm source\.?\s*$/i,
];

const text = value => (typeof value === 'string' ? value : value == null ? '' : String(value));

// The question an open-question text asks, without the trailing "Not stated …" sentence AIW's drafter adds.
export function questionOf(value) {
  const m = QUESTION.exec(text(value).trim());
  if (!m) return null;
  const q = m[1].replace(/\s*Not stated in the brief or the upstream records\.?\s*$/i, '').trim();
  return q ? (/[?]$/.test(q) ? q : q.replace(/\.$/, '') + '?') : '';
}

// True when a value says nothing: empty, an open-question text, or a recognised placeholder.
export function isOpenText(value) {
  const t = text(value).trim();
  if (!t) return true;
  if (QUESTION.test(t)) return true;
  return PLACEHOLDERS.some(re => re.test(t));
}

// The open state of one field: the recorded state first, else what the words say, else null (stated).
export function fieldOpen(record, field) {
  const kept = record?.open && typeof record.open === 'object' ? record.open[field] : null;
  if (kept && OPEN_STATES.includes(kept.state)) return {field, ...kept};
  const value = record ? record[field] : undefined;
  if (Array.isArray(value)) return value.length ? null : {field, state: 'not-stated', derived: true};
  if (typeof value === 'number' && Number.isFinite(value)) return null;
  if (typeof value === 'boolean') return null;
  const q = questionOf(value);
  if (q !== null) return {field, state: 'open-question', question: q, derived: true};
  return isOpenText(value) ? {field, state: 'not-stated', derived: true} : null;
}

// Every open field of a record among the fields named (or among the record's own open map when none are named).
export function openFields(record, fields = null) {
  const names = fields || Object.keys(record?.open || {});
  return names.map(f => fieldOpen(record, f)).filter(Boolean);
}

// The record's open map with one field set to a state (pure: returns a new map; the caller saves it through its
// chapter's command). state null clears the field's entry.
export function withOpen(record, field, state, {question = '', raisedBy = '', at = '', source = ''} = {}) {
  const open = {...(record?.open && typeof record.open === 'object' ? record.open : {})};
  if (state == null) { delete open[field]; return open; }
  if (!OPEN_STATES.includes(state)) throw Error('Choose not stated or open question.');
  const entry = {state};
  if (state === 'open-question') {
    const q = text(question).trim().slice(0, 600);
    if (!q) throw Error('Write the open question.');
    entry.question = q;
  }
  if (raisedBy) entry.raisedBy = text(raisedBy).slice(0, 180);
  if (at) entry.at = text(at).slice(0, 40);
  if (source) entry.source = text(source).slice(0, 600);
  open[field] = entry;
  return open;
}

// A stored open map, validated: unknown states and fields not in `allowed` are dropped; questions are bounded.
export function cleanOpen(raw, allowed = null) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [field, entry] of Object.entries(raw)) {
    if (allowed && !allowed.includes(field)) continue;
    if (!entry || !OPEN_STATES.includes(entry.state)) continue;
    const e = {state: entry.state};
    if (entry.state === 'open-question') { const q = text(entry.question).trim().slice(0, 600); if (!q) continue; e.question = q; }
    for (const k of ['raisedBy', 'at', 'source']) if (entry[k]) e[k] = text(entry[k]).slice(0, k === 'source' ? 600 : 180);
    out[field] = e;
  }
  return out;
}

// The words a document prints for a field: its value when stated, else "open: <label or question>".
export function printable(record, field, label = field) {
  const o = fieldOpen(record, field);
  if (!o) return text(record[field]).trim();
  return o.state === 'open-question' && o.question ? 'open: ' + o.question : 'open: ' + label + ' ' + NOT_STATED_LABEL;
}
