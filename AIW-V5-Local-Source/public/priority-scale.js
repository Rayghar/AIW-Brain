// One priority scale (round 12, DM-07). AIW holds four scales: requirements Must / Should / Could, drivers
// Critical / Important / Supporting (High / Medium / Low from round 12), threats Critical / High / Moderate / Low, and
// the levels the SDD prints. Each maps to one ordinal level (1 the strongest), so readers compare and sort across them,
// and every scale accepts '' for "not stated", which sorts last and is never weighted. A priority records its basis:
// a source band (an import mapped it), a person, or a rule. Pure functions: no DOM, no Node API, no project writes.

export const NOT_STATED = '';
export const PRIORITY_BASIS = Object.freeze(['source band', 'person', 'rule']);

export const SCALES = Object.freeze({
  requirement: Object.freeze(['Must', 'Should', 'Could']),
  driver: Object.freeze(['High', 'Medium', 'Low']),
  'driver-legacy': Object.freeze(['Critical', 'Important', 'Supporting']),
  threat: Object.freeze(['Critical', 'High', 'Moderate', 'Low']),
  sdd: Object.freeze(['High', 'Medium', 'Low']),
});

// Ordinal level of a value on its scale: 1 the strongest; null for not stated or an unknown value.
// A four-step threat scale folds into three levels: Critical 1, High 1, Moderate 2, Low 3.
export function levelOf(scale, value) {
  const s = SCALES[scale];
  if (!s) throw Error('Unknown priority scale: ' + scale);
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  const i = s.findIndex(x => x.toLowerCase() === v.toLowerCase());
  if (i < 0) return null;
  if (scale === 'threat') return [1, 1, 2, 3][i];
  return i + 1;
}

// The value on a scale for an ordinal level (1..3); '' when the level is not stated.
export function valueAt(scale, level) {
  const s = SCALES[scale];
  if (!s) throw Error('Unknown priority scale: ' + scale);
  if (level == null) return NOT_STATED;
  if (scale === 'threat') return ({1: 'High', 2: 'Moderate', 3: 'Low'})[level] || NOT_STATED;
  return s[level - 1] || NOT_STATED;
}

// A value moved from one scale to another through its level ('' stays '').
export function convert(fromScale, value, toScale) { return valueAt(toScale, levelOf(fromScale, value)); }

// Sort key: stated levels first, strongest first; not stated last.
export function priorityRank(scale, value) { const l = levelOf(scale, value); return l == null ? 99 : l; }

// The SDD's words for any scale's value: High, Medium, Low, or "not stated".
export function sddPriority(scale, value) { const v = convert(scale, value, 'sdd'); return v || 'not stated'; }

// A priority's basis, validated ('' when not recorded).
export function cleanBasis(value) { return PRIORITY_BASIS.includes(value) ? value : ''; }
