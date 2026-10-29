// Driver links (round 11). A Chapter 6 capability's recovery target and a Chapter 7 realisation's capacity each may
// name the Chapter 2 driver they serve (`driverId`). This reads that chain for one record and says whether the
// recorded figure agrees with the driver's target: arithmetic on recorded facts in the same unit, never a guess. When
// the units differ, or a figure is missing, it says so and decides nothing. Pure; nothing here changes the project.
//
// Round 12 (DM-04): a Chapter 10 plan states its targets as a list, each of a kind (availability, recovery time, data
// loss, latency, throughput or capacity) with the driver it serves, an operator, a value, a unit, the window it is
// measured over, its basis and whether it is confirmed; and its schedule: hours of service, maintenance windows and
// batch windows (a batch window may name the driver its length serves). A plan written before round 12 kept two driver
// slots instead: planTargets reads them as a recovery-time target (driverId) and a capacity target
// (capacityDriverId), on read, changing nothing stored. A recovery-time, data-loss or capacity target with no value of
// its own reads the plan's recovery time, data loss or maximum copies, as the slots did.
import {toMinutes} from './target-units.js';
import {list, str, num, fitText} from './util.js';
import {passValue} from './document-memo.js';

// The linked fields of Chapters 6 and 7: where each lives, which field names the driver, and which figure it records.
export const LINK_FIELDS = [
  {chapter: 6, kind: 'recovery', field: 'driverId', value: 'recoveryMinutes', unit: 'minutes', label: 'recovery time', records: p => list(p?.technology?.capabilities)},
  {chapter: 7, kind: 'capacity', field: 'driverId', value: 'capacityValue', unitField: 'capacityUnit', label: 'capacity', records: p => list(p?.technologyRealisation?.records)}
];
export const TARGET_KINDS = Object.freeze(['availability', 'recovery-time', 'data-loss', 'latency', 'throughput', 'capacity']);
export const TARGET_LABELS = Object.freeze({availability: 'availability', 'recovery-time': 'recovery time', 'data-loss': 'data loss', latency: 'latency', throughput: 'throughput', capacity: 'capacity'});
const TIME_KINDS = new Set(['recovery-time', 'data-loss']);

// A plan's targets: its own list, or, for a plan written before round 12, its two driver slots read as targets. Pure.
// Round 12 (GR-TEC-09): a Chapter 7 realisation states its targets in the same shape (chapter 7); one written before
// kept one slot, the driver its capacity serves (driverId), read as a capacity target whose figure is its capacity.
export function planTargets(r, chapter = 10) {
  if (Array.isArray(r?.targets)) return r.targets;
  const out = [];
  if (chapter === 7) { if (str(r?.driverId)) out.push({kind: 'capacity', driverId: str(r.driverId), operator: '', value: '', unit: '', window: '', basis: '', confirmed: false}); return out; }
  if (str(r?.driverId)) out.push({kind: 'recovery-time', driverId: str(r.driverId), operator: 'At most', value: '', unit: 'minutes', window: '', basis: '', confirmed: false});
  if (str(r?.capacityDriverId)) out.push({kind: 'capacity', driverId: str(r.capacityDriverId), operator: '', value: '', unit: '', window: '', basis: '', confirmed: false});
  return out;
}
// The targets a save sends, checked and kept in that one shape (Chapters 7 and 10): each of a kind, the driver it serves
// (an existing one, or none), an operator, a value (a number, or '' where it is not stated or read from the record's own
// figure), a unit, the window it is measured over, its basis and whether it is confirmed; at most `limit`. Pure; the
// drivers are checked by knownTargetDrivers once the save's own slots are applied.
export const TARGET_OPERATORS = Object.freeze(['At most', 'At least', 'Exactly', '']);
export function cleanTargets(ts, noun = 'A runtime plan', limit = 24) {
  if (!Array.isArray(ts)) throw Error('List the targets this plan states.');
  if (ts.length > limit) throw Error(noun + ' states up to ' + limit + ' targets; ' + ts.length + ' were sent.');
  const out = ts.map(t => {
    if (!TARGET_KINDS.includes(t?.kind)) throw Error('Choose what each target measures: availability, recovery time, data loss, latency, throughput or capacity.');
    const v = t.value === '' || t.value == null ? '' : Number(t.value);
    if (v !== '' && (!Number.isFinite(v) || v < 0 || t.kind === 'availability' && v > 100)) throw Error(t.kind === 'availability' ? 'State an availability target as a percentage from 0 to 100.' : 'State each target as a non-negative number.');
    if (!TARGET_OPERATORS.includes(t.operator ?? '')) throw Error('Choose at most, at least or exactly for each target.');
    return {kind: t.kind, driverId: typeof t.driverId === 'string' ? t.driverId.trim() : '', operator: t.operator || '', value: v === '' ? '' : String(v), unit: fitText(t.unit, 40, 'A target\'s unit'), window: fitText(t.window, 120, 'A target\'s window'), basis: fitText(t.basis, 600, 'A target\'s basis'), confirmed: t.confirmed === true};
  });
  return out;
}
// A target list whose drivers all exist, or the refusal every chapter gives (checked after a save's slots are applied).
export function knownTargetDrivers(p, ts) { if (ts.some(t => t.driverId && !list(p?.quality?.drivers).some(d => d.id === t.driverId))) throw Error('Choose existing quality drivers for the targets this plan serves.'); return ts; }
// A plan's schedule: hours of service, maintenance and batch windows, and their basis; empty when none is stated.
export function planSchedule(r) {
  const s = r?.schedule && typeof r.schedule === 'object' ? r.schedule : {};
  return {serviceHours: str(s.serviceHours), basis: str(s.basis), maintenanceWindows: list(s.maintenanceWindows), batchWindows: list(s.batchWindows)};
}
// A window's length in minutes, from its start and end on a 24-hour clock (an end before the start is the next day).
const clock = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(str(v)) ? Number(str(v).slice(0, 2)) * 60 + Number(str(v).slice(3)) : null;
export function windowLength(w) { const a = clock(w?.start), b = clock(w?.end); if (a == null || b == null) return null; const d = b - a; return d > 0 ? d : d + 1440; }
const fold = v => str(v).toLowerCase().replace(/[^a-z0-9]+/g, '');
const fmt = n => n == null ? '' : Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 100) / 100);
const sameUnit = (a, b) => str(a).toLowerCase().replace(/[\s.]/g, '') === str(b).toLowerCase().replace(/[\s.]/g, '') && str(a) !== '';
const driverOf = (p, id) => (id ? list(p?.quality?.drivers).find(d => d.id === id) || null : null);
const isPlan = (p, r) => list(p?.runtime?.plans).some(x => x.id === r?.id);
// A Chapter 7 realisation that states its targets as a list (round 12, GR-TEC-09); one without reads its capacity slot.
const realisationOf = (p, r) => list(p?.technologyRealisation?.records).find(x => x.id === r?.id) || null;
const listedTargets = r => Array.isArray(r?.targets);

// The figure a recorded value and its driver compare: a time in minutes, or the value with its unit.
function compare(base, driver, recorded, {time = false, window = '', label = ''} = {}) {
  const targetValue = num(driver.targetValue), targetUnit = str(driver.unit), op = str(driver.operator) || 'At most';
  const target = {value: targetValue, unit: targetUnit, operator: op, text: targetValue == null ? 'no target yet' : `${op.toLowerCase()} ${fmt(targetValue)} ${targetUnit}`.trim()};
  if (targetValue == null) return {...base, target, state: 'unknown', why: `${driver.id} has no numeric target yet.`};
  if (recorded.value == null) return {...base, target, state: 'unknown', why: `No ${label} is recorded to compare with ${driver.id}'s target.`};
  if (time) {
    const minutes = toMinutes(targetValue, targetUnit), what = base.kind === 'batch' ? 'Its batch window lasts' : base.kind === 'data-loss' ? 'Loses at most' : 'Recovers in';
    if (minutes == null) return {...base, target, state: 'unknown', why: `${driver.id}'s target is not a time (${target.text}), so the ${label} cannot be compared with it.`};
    const ok = recorded.value <= minutes;
    return {...base, target: {...target, minutes}, state: ok ? 'holds' : 'breaks', why: ok ? `${what} ${fmt(recorded.value)} min, within ${driver.id}'s ${fmt(minutes)} min.` : `${what} ${fmt(recorded.value)} min, longer than ${driver.id}'s ${fmt(minutes)} min.`};
  }
  if (fold(window) && fold(driver.window) && fold(window) !== fold(driver.window)) return {...base, target, state: 'unknown', why: `Measured over different windows (${str(window)}; ${driver.id}: ${str(driver.window)}): compare them by hand.`};
  let value = recorded.value, unit = recorded.unit;
  // Two durations in different units (a latency in seconds against a target in milliseconds) are read in minutes.
  const a = toMinutes(value, unit), b = toMinutes(targetValue, targetUnit);
  const timed = a != null && b != null && !sameUnit(unit, targetUnit);
  if (!timed && !sameUnit(unit, targetUnit)) return {...base, target, state: 'unknown', why: `Recorded in ${unit || 'no unit'}, the target in ${targetUnit || 'no unit'}: compare them by hand.`};
  const x = timed ? a : value, y = timed ? b : targetValue;
  const ok = op === 'At least' ? x >= y : op === 'Exactly' ? x === y : x <= y;
  const tail = base.kind === 'availability' && !fold(window) ? '; its measurement window is not stated' : '';
  return {...base, target, state: ok ? 'holds' : 'breaks', why: (ok ? `${fmt(value)} ${unit} meets ${driver.id}'s ${target.text}` : `${fmt(value)} ${unit} does not meet ${driver.id}'s ${target.text}`) + tail + '.'};
}

// One record's link for one field (Chapters 6 and 7): the driver it names, the two figures and whether they agree.
export function driverLink(p, record, spec) {
  if (!p || !record || !spec) return null;
  const id = str(record[spec.field]);
  if (!id) return null;
  const driver = driverOf(p, id);
  const recordedValue = num(record[spec.value]), recordedUnit = spec.unit || str(record[spec.unitField]);
  const recorded = {value: recordedValue, unit: recordedUnit, text: recordedValue == null ? `no ${spec.label} recorded` : `${fmt(recordedValue)} ${recordedUnit}`.trim()};
  const base = {chapter: spec.chapter, kind: spec.kind, field: spec.field, label: spec.label, driverId: id, driver, recorded};
  if (!driver) return {...base, target: null, state: 'unknown', why: `${id} is not a Chapter 2 driver any more.`};
  return compare(base, driver, recorded, {time: spec.kind === 'recovery', label: spec.label});
}

// One plan target's link (round 12): what the plan states, or the plan's own figure where the target states none.
// A Chapter 7 realisation's target (chapter 7) reads its own capacity where a capacity target states no value.
export function targetLink(p, plan, t, index = 0, chapter = 10) {
  const id = str(t?.driverId);
  if (!p || !plan || !id) return null;
  const driver = driverOf(p, id), kind = TARGET_KINDS.includes(t.kind) ? t.kind : 'capacity', label = TARGET_LABELS[kind] + ' target';
  const own = str(t.value) !== '', time = TIME_KINDS.has(kind);
  let value, unit;
  if (time) { value = own ? toMinutes(t.value, t.unit || 'minutes') : chapter === 7 ? null : num(kind === 'recovery-time' ? plan.recoveryMinutes : plan.lossMinutes); unit = 'minutes'; }
  else if (kind === 'capacity' && !own) { value = num(chapter === 7 ? plan.capacityValue : plan.maxReplicas); unit = chapter === 7 ? str(plan.capacityUnit) : 'replicas'; }
  else { value = num(t.value); unit = kind === 'availability' ? '%' : str(t.unit); }
  const recorded = {value, unit, text: value == null ? `no ${TARGET_LABELS[kind]} recorded` : `${fmt(value)} ${unit}`.trim()};
  const base = {chapter, kind, field: 'targets', index, label, driverId: id, driver, recorded};
  if (!driver) return {...base, target: null, state: 'unknown', why: `${id} is not a Chapter 2 driver any more.`};
  return compare(base, driver, recorded, {time, window: t.window, label: TARGET_LABELS[kind]});
}
// One batch window's link: its length against the time the driver it names allows.
export function batchLink(p, plan, w, index = 0) {
  const id = str(w?.driverId);
  if (!p || !plan || !id) return null;
  const driver = driverOf(p, id), value = windowLength(w);
  const recorded = {value, unit: 'minutes', text: value == null ? 'no batch window length recorded' : `${fmt(value)} minutes`};
  const base = {chapter: 10, kind: 'batch', field: 'schedule', index, label: 'batch window', driverId: id, driver, recorded};
  if (!driver) return {...base, target: null, state: 'unknown', why: `${id} is not a Chapter 2 driver any more.`};
  return compare(base, driver, recorded, {time: true, label: 'batch window'});
}
const planLinks = (p, r) => [...planTargets(r).map((t, i) => targetLink(p, r, t, i)), ...planSchedule(r).batchWindows.map((w, i) => batchLink(p, r, w, i))].filter(Boolean);
const realisationLinks = (p, r) => planTargets(r, 7).map((t, i) => targetLink(p, r, t, i, 7)).filter(Boolean);

// Every link one record holds (a plan may hold several), by the field group the record belongs to.
export function driverLinks(p, record) {
  if (!p || !record) return [];
  if (isPlan(p, record)) return planLinks(p, record);
  if (listedTargets(record) && realisationOf(p, record)) return realisationLinks(p, record);
  return LINK_FIELDS.filter(spec => spec.records(p).some(r => r.id === record.id)).map(spec => driverLink(p, record, spec)).filter(Boolean);
}

// The links of one record by its id, for a reader that holds the id alone.
export function driverLinksOf(p, id) {
  if (!p || !id) return [];
  const plan = list(p?.runtime?.plans).find(r => r.id === id);
  return [...LINK_FIELDS.flatMap(spec => spec.records(p).filter(r => r.id === id).map(r => spec.chapter === 7 && listedTargets(r) ? realisationLinks(p, r) : [driverLink(p, r, spec)]).flat()), ...(plan ? planLinks(p, plan) : [])].filter(Boolean);
}

// The choices an editor's driver picker offers: no link, then every Chapter 2 driver with its target.
export function driverOptions(p) {
  const target = d => (num(d.targetValue) == null ? 'no target yet' : `${str(d.operator) || 'At most'} ${fmt(num(d.targetValue))} ${str(d.unit)}`.trim());
  return [['', 'Not linked to a quality driver'], ...list(p?.quality?.drivers).map(d => [d.id, `${d.id} · ${d.title} · ${target(d)}`])];
}

// Every link in the project, each with its record, read once (Chapters 6, 7 and 10).
function everyLink(p) {
  const out = [];
  for (const spec of LINK_FIELDS) for (const r of spec.records(p)) {
    if (spec.chapter === 7 && listedTargets(r)) { for (const l of realisationLinks(p, r)) out.push({chapter: 7, kind: l.kind, field: l.field, record: r, ref: r.ref || r.id, title: r.title || '', link: l}); continue; }
    const l = driverLink(p, r, spec); if (l) out.push({chapter: spec.chapter, kind: spec.kind, field: spec.field, record: r, ref: r.ref || r.id, title: r.title || '', link: l});
  }
  for (const r of list(p?.runtime?.plans)) for (const l of planLinks(p, r)) out.push({chapter: 10, kind: l.kind, field: l.field, record: r, ref: r.ref || r.id, title: r.title || '', link: l});
  return out;
}
// Every link in the project by the driver it names, read once for the length of a pass (document-memo.js): the
// specification, its gate and the readiness board ask for it once per driver.
export function linksIndex(p) {
  return passValue(p, 'driver-links:index', () => {
    const m = new Map();
    for (const x of everyLink(p)) { if (!m.has(x.link.driverId)) m.set(x.link.driverId, []); m.get(x.link.driverId).push(x); }
    return m;
  });
}
// Every Chapter 6, 7 and 10 field that names one driver, with its record and its reading.
export function linksToDriver(p, driverId, index = linksIndex(p)) { return index.get(driverId) || []; }

// The fields that name a driver whose figure does not agree with its target, across the project.
export function driverDisagreements(p) {
  return everyLink(p).filter(x => x.link.state === 'breaks').map(({chapter, kind, record, ref, title, link}) => ({chapter, kind, record, ref, title, link}));
}

// One line for a reader: what it serves, what it records, what the driver asks, and whether they agree.
export function driverLinkText(l) {
  if (!l) return '';
  const who = l.driver ? `${l.driver.id} ${l.driver.title}` : l.driverId;
  const state = l.state === 'holds' ? 'agrees' : l.state === 'breaks' ? 'disagrees' : 'not compared';
  return `Serves ${who} · recorded ${l.recorded.text} · target ${l.target ? l.target.text : 'unknown'} · ${state}: ${l.why}`;
}
