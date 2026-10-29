// Small pure helpers many modules used to copy byte for byte (audit F2-09). One definition each, so a fix to
// one of them is made once. No imports, no state and no DOM: the modules that use them run in the browser, in
// the server (shared/) and in the node suites alike. Function declarations, so a vm-based suite can inline the
// file as classic script (browser-source.mjs).

// A value that is an array, or an empty array: for optional lists in stored documents.
export function list(value) { return Array.isArray(value) ? value : []; }
// The distinct values in first-seen order.
export function uniq(values) { return [...new Set(values)]; }
// A trimmed string; null and undefined become '', anything else its String().
export function str(value) { return typeof value === 'string' ? value.trim() : value == null ? '' : String(value); }
// A finite number, or null for '', null, undefined and anything Number() cannot read.
export function num(value) { const n = Number(value); return value === '' || value == null || !Number.isFinite(n) ? null : n; }
// A value as one line of text (whitespace runs collapsed), at most `max` characters: for model sources.
export function text(value, max = 200) { return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max); }
// A string value trimmed to at most `max` characters; anything that is not a string becomes '': for commands.
export function clean(value, max = 4000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
// "1 item" / "2 items"; `many` defaults to `one` + 's'.
export function plural(n, one, many = one + 's') { return n + ' ' + (n === 1 ? one : many); }
// References as a short list (round 5, kept; moved here in round 12 for the chapter registers): a run of one prefix
// becomes a range (REQ-001–REQ-009, QD1–QD6), across a change of digit width too (REQ-999–REQ-1000); past `max` parts the rest
// are counted ("and 4 more").
export function refList(refs, max = 12) {
  const unique = [...new Set(refs.filter(Boolean).map(String))], prefix = r => /^(.*?)(\d+)$/.exec(r)?.[1] ?? r, order = [...new Set(unique.map(prefix))];
  const seen = unique.sort((a, b) => order.indexOf(prefix(a)) - order.indexOf(prefix(b)) || (Number(/(\d+)$/.exec(a)?.[1]) || 0) - (Number(/(\d+)$/.exec(b)?.[1]) || 0) || a.localeCompare(b)), parts = [];
  const next = (m, n) => !!n && n[1] === m[1] && Number(n[2]) === Number(m[2]) + 1 && (n[2].length === m[2].length || (n[2].length === m[2].length + 1 && !/^0/.test(n[2])));
  for (let i = 0; i < seen.length;) {
    let j = i;
    while (j + 1 < seen.length && /^(.*\D)(\d+)$/.test(seen[j]) && next(/^(.*\D)(\d+)$/.exec(seen[j]), /^(.*\D)(\d+)$/.exec(seen[j + 1]))) j++;
    parts.push(j - i >= 2 ? seen[i] + '–' + seen[j] : j > i ? seen[i] + ', ' + seen[j] : seen[i]); i = j + 1;
  }
  return parts.length > max ? parts.slice(0, max).join(', ') + ' and ' + Number(parts.length - max).toLocaleString('en-GB') + ' more' : parts.join(', ');
}
// "a", "a and b", "a, b and c".
export function joinAnd(items) { return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items.at(-1); }
// A two-digit, zero-padded number: 1 -> "01".
export function pad2(n) { return String(n).padStart(2, '0'); }
// A deep copy that keeps Dates, Maps and Sets (structured clone).
export function copy(value) { return structuredClone(value); }
// A deep copy through JSON: undefined values and functions are dropped, Dates become strings.
export function jsonClone(value) { return JSON.parse(JSON.stringify(value)); }
// Whether two values serialise to the same JSON.
export function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
// Words kept whole: trimmed, and refused past the limit with the label's name and both counts, never cut (round 12).
export function fitText(value, limit, label) { const t = typeof value === 'string' ? value.trim() : value == null ? '' : String(value); const n = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); if (t.length > limit) throw Error(label + ' holds up to ' + n(limit) + ' characters; ' + n(t.length) + ' were sent.'); return t; }
// One item per id, the last one recorded for an id winning, in first-seen order of the ids.
export function byId(items) { return [...new Map(items.map((x) => [x.id, x])).values()]; }
// A file-name-safe slug: runs of characters other than letters, digits, '.', '_' and '-' become '-'.
export function fileSafe(value) { return String(value || '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, ''); }
// A stored JSON object (browser preferences), or {} when the key is absent, unreadable or not an object.
export function readStoredObject(key) { try { const v = JSON.parse(localStorage.getItem(key) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
// A list named in a reading (round 12, G, GR-UX-04): every item by `name` while there are at most `max` (joined with
// "and" when `and` is set), else the first `max` by `short` (an id) and the rest as a count, "A, B, C, D, E and 1,395
// more", so an observation stays a sentence at any size (Chapter 1's rule, story-model.js). The reader offers the whole
// list as a filter: the observation carries it as `records` (recordsOf).
export function fewNames(items, {max = 5, sep = ', ', name = (x) => x, short = name, and = false} = {}) { const xs = list(items); return xs.length <= max ? (and ? joinAnd(xs.map(name)) : xs.map(name).join(sep)) : xs.slice(0, max).map(short).join(sep) + ' and ' + (xs.length - max).toLocaleString('en-GB') + ' more'; }
// The records an observation names, whole, as [id, label] pairs for the companion's "Show all" (round 12, G, GR-UX-04);
// an id the view cannot select is null and its label reads as text.
export function recordsOf(items, id, label) { return list(items).map((x) => { const k = id(x); return [k == null || k === '' ? null : String(k), String(label(x) ?? '')]; }); }
// The check a finding comes from, without the record its code may name ('unbound-SEC-001' is 'unbound'): how the SDD's
// counts and the Validate tab's causes group findings by rule (round 12, G, GR-UX-03).
export function checkCode(code) { return String(code ?? '').replace(/-[A-Za-z]+-\d+$/, ''); }

// Dates as the app writes them (round 26, D-26-09): "15 Oct 2026" and "15 Oct 2026, 06:24", never an ISO string on screen.
const DATE_WORDS = {day: '2-digit', month: 'short', year: 'numeric'}, TIME_WORDS = {hour: '2-digit', minute: '2-digit', hour12: false};
export function appDate(value) { if (value == null || value === '') return ''; const d = value instanceof Date ? value : new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', DATE_WORDS).replace(/^0/, ''); }
export function appDateTime(value) { if (value == null || value === '') return ''; const d = value instanceof Date ? value : new Date(value); return Number.isNaN(d.getTime()) ? '' : appDate(d) + ', ' + d.toLocaleTimeString('en-GB', TIME_WORDS); }
