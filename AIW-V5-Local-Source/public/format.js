// Dates and numbers for people (audit F2-16): one place that turns a stored ISO timestamp, a calendar date or a
// number into the reader's locale. Stored and exported values stay as they are (ISO 8601, plain numbers); only what
// is shown changes, and a timestamp shown in HTML keeps its ISO value in <time datetime>.
import {esc} from './html-escape.js';

const DATE = {day: 'numeric', month: 'short', year: 'numeric'}, TIME = {hour: '2-digit', minute: '2-digit'};
const formatters = new Map();
const formatter = (kind, options) => { const key = kind + JSON.stringify(options); let f = formatters.get(key); if (!f) { f = kind === 'number' ? new Intl.NumberFormat(undefined, options) : new Intl.DateTimeFormat(undefined, options); formatters.set(key, f); } return f; };
// A calendar date ('2026-10-01', a due date) names the same day everywhere; it is not moved into the reader's zone.
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;
const dateOf = (value) => { if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null; if (value == null || value === '') return null; const d = new Date(typeof value === 'number' ? value : String(value)); return Number.isFinite(d.getTime()) ? d : null; };
const zoned = (value, options) => (CALENDAR_DAY.test(String(value)) ? {...options, timeZone: 'UTC'} : options);

// "1 Oct 2026" in the reader's locale; a value that is not a date is returned as text, unchanged.
export function formatDate(value) { const d = dateOf(value); return d ? formatter('date', zoned(value, DATE)).format(d) : String(value ?? ''); }
// "14:40" (or "2:40 PM") in the reader's locale and zone.
export function formatTime(value) { const d = dateOf(value); return d ? formatter('date', TIME).format(d) : String(value ?? ''); }
// "1 Oct 2026, 14:40"; a calendar date alone shows no time.
export function formatDateTime(value) { const d = dateOf(value); if (!d) return String(value ?? ''); return CALENDAR_DAY.test(String(value)) ? formatDate(value) : formatter('date', {...DATE, ...TIME}).format(d); }
// A number with the reader's grouping and decimal marks ("12,500" / "12 500"), at most `maximumFractionDigits`
// decimals (3 by default, as Number#toLocaleString); anything that is not a finite number is returned as text.
export function formatNumber(value, {maximumFractionDigits = 3, minimumFractionDigits = 0} = {}) {
  const n = typeof value === 'number' ? value : value === '' || value == null ? NaN : Number(value);
  return Number.isFinite(n) ? formatter('number', {maximumFractionDigits, minimumFractionDigits: Math.min(minimumFractionDigits, maximumFractionDigits)}).format(n) : String(value ?? '');
}
// A timestamp or date as HTML: the reader's date (and time), with the stored ISO value in datetime= and as the title.
export function timeHTML(value, {time = true} = {}) {
  const d = dateOf(value); if (!d) return esc(value ?? '');
  const iso = CALENDAR_DAY.test(String(value)) ? String(value) : d.toISOString();
  return `<time datetime="${esc(iso)}" title="${esc(iso)}">${esc(time ? formatDateTime(value) : formatDate(value))}</time>`;
}
