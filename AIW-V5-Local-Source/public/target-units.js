// A target's time value in one unit (rc39, W4): the conversions driver readings share. Held here, below
// design-reasoning.js and driver-links.js, so neither has to import the other for them (the static import cycle
// design-reasoning → technology-realisation-domain → driver-links → design-reasoning is closed by this module).
import {num, str} from './util.js';

// A value in a time unit (ms, s, min, h and their longer spellings) as milliseconds; null for no value or an unknown unit.
export function toMs(value, unit) {
  const v = num(value), u = str(unit).toLowerCase();
  if (v == null) return null;
  if (/^(ms|milli)/.test(u)) return v;
  if (/^(s|sec)/.test(u)) return v * 1000;
  if (/^min/.test(u)) return v * 60000;
  if (/^(h|hour)/.test(u)) return v * 3600000;
  return null;
}// The same value in minutes.
export function toMinutes(value, unit) { const ms = toMs(value, unit); return ms == null ? null : ms / 60000; }
