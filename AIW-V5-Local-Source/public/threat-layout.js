// Security — deterministic layout for the Chapter 9 Model views.
//
// Threat model: trust regions are lanes (outside, each boundary, outside), laid out by the
// shared lane engine (lane-layout.js): shared rows, one gutter track per flow, no flow through
// a card. Uses of one platform service or store from one region share a trunk and one marker —
// the entry into that element, and are drawn once from it (the lane engine's wires). Crossing
// markers on contracts sit where the flow enters (or leaves) a trust boundary. Guarantees are
// checked in threat-validate.mjs; the layout never reads the lens.
import {laneLayout, LANE} from './lane-layout.js';

export const TM = {...LANE, HEAD_H: 70};
export function threatHead() { return TM.HEAD_H + 12; }

// How the threat model's lines are drawn alike (round 10, V4): a link's kind, whether it crosses a boundary and its
// state there, and whether it carries sensitive data (the caller says, from the data's classification). An entry's uses
// share ink only where all of these agree (lane-layout.js wires); the string is also the classes the view draws the line
// with. Lying outside a part's scope is not among them: like a selection's dimming, the view fades a line only when every
// link on it lies outside.
export const threatWireStyle = (sensitive = () => false) => l => `${l.kind} ${l.crosses ? 'cross ' + l.state : 'inside'}${sensitive(l) ? ' sensitive' : ''}`;

export function threatLayout(F, {measure = l => 16 + 7 * String(l.label || '').length, sensitive = () => false} = {}) {
  const L = laneLayout(F, {
    top: threatHead(), measure,
    bundleKey: (l, rowOf) => (l.kind === 'uses' ? l.to + '<' + rowOf.get(l.from).region : null),
    edgeMarker: l => !!l.crosses,
    entryMarker: ls => ls.some(l => l.crosses),
    labelled: l => l.kind !== 'uses',
    wireStyle: threatWireStyle(sensitive)
  });
  return {kind: 'threat', ...L};
}

// Threats × controls: threats are rows, controls are columns.
export const MX = {RAIL: 300, HEAD_H: 96, COL_W: 118, ROW_H: 64, GROUP_H: 28, COVER_W: 190, EVID_W: 170};
export function matrixHead() { return MX.HEAD_H + 10; }
export function matrixLayout(G) {
  let y = matrixHead() + 6, group = null;
  const rows = [], groups = [];
  for (const t of G.threats) { if (t.priority !== group) { group = t.priority; groups.push({id: 'G:' + group, title: group, y, h: MX.GROUP_H}); y += MX.GROUP_H; } rows.push({id: t.id, threat: t, y, h: MX.ROW_H}); y += MX.ROW_H; }
  const cols = G.controls.map((c, i) => ({id: c.id, control: c, x: MX.RAIL + i * MX.COL_W, w: MX.COL_W}));
  const coverX = MX.RAIL + cols.length * MX.COL_W + 10, evidX = coverX + MX.COVER_W + 6, W = evidX + MX.EVID_W + 16, H = y + 24;
  const R = new Map(rows.map(r => [r.id, r])), K = new Map(cols.map(c => [c.id, c]));
  const cells = G.cells.map(c => { const r = R.get(c.threat), k = K.get(c.control); return {...c, x: k.x + k.w / 2, y: r.y + r.h / 2}; });
  return {kind: 'matrix', W, H, top: matrixHead(), rail: MX.RAIL, rows, groups, cols, cells, coverX, evidX};
}
