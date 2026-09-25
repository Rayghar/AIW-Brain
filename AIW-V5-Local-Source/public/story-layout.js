// Requirements — deterministic layout for the Chapter 1 Model views.
//
// Journey map: the journey's steps are columns under sticky heads, the priority slices are bands
// down the left rail, and each slice of each step stacks its cards; nothing is routed, so nothing
// crosses. Context: people, the system, the outcomes and their owners are lanes routed by the
// shared lane engine, with the limits on the design (scope, constraints, assumptions) as notes
// beneath. Guarantees are checked in story-validate.mjs; neither layout reads the lens.
import {laneLayout, LANE} from './lane-layout.js';

export const SX = {RAIL: 132, HEAD_H: 104, COL_W: 216, GAP: 14, CARD_H: 134, VGAP: 10, PAD: 12};
export function mapHead() { return SX.HEAD_H + 10; }
export function cardHeight() { return SX.CARD_H; }

export function storyLayout(F) {
  const x0 = SX.RAIL + 12;
  // One step on its own takes the width: its cards wrap into as many as four columns.
  const most = Math.max(0, ...F.bands.map(b => F.cards.filter(c => c.band === b).length));
  const sub = F.cols.length === 1 ? Math.min(4, Math.max(1, Math.ceil(most / 6))) : 1;
  const cw = sub * SX.COL_W + (sub - 1) * SX.GAP;
  const cols = F.cols.map((c, i) => ({...c, x: x0 + i * (cw + SX.GAP), w: cw}));
  const K = new Map(cols.map(c => [c.id, c]));
  let y = mapHead() + 6;
  const bands = [], cards = [];
  for (const b of F.bands) {
    const inBand = F.cards.filter(c => c.band === b), stack = new Map();
    for (const c of inBand) stack.set(c.col, (stack.get(c.col) || 0) + 1);
    const rows = Math.max(1, ...[...stack.values()].map(n => Math.ceil(n / sub)));
    const h = SX.PAD * 2 + rows * SX.CARD_H + (rows - 1) * SX.VGAP;
    const at = new Map();
    for (const c of inBand) { const k = at.get(c.col) || 0; at.set(c.col, k + 1); const col = K.get(c.col); cards.push({id: c.id, card: c, x: col.x + 6 + (k % sub) * (SX.COL_W + SX.GAP), y: y + SX.PAD + Math.floor(k / sub) * (SX.CARD_H + SX.VGAP), w: SX.COL_W - 12, h: SX.CARD_H}); }
    bands.push({id: b, y, h, rows});
    y += h + 8;
  }
  const W = (cols.length ? cols.at(-1).x + cw : x0) + 20, H = y + 20;
  return {kind: 'map', W, H, top: mapHead(), rail: SX.RAIL, cols, bands, cards};
}

// Context: four lanes, with the system's lane drawn as its boundary.
export const CT = {HEAD_H: 88, CARD_W: 196, CARD_H: 78, NOTE_W: 250, NOTE_H: 104, NOTE_GAP: 14, LABEL_MAX: 150};
export function contextHead() { return CT.HEAD_H + 10; }
export function contextLayout(F, {measure} = {}) {
  const L = laneLayout(F, {top: contextHead(), left: 12, cardW: CT.CARD_W, cardH: (row, ports) => Math.max(CT.CARD_H, 22 + ports * LANE.PORT), labelMax: CT.LABEL_MAX, labelInset: 12, measure, labelled: l => l.kind === 'delivers'});
  // The limits on the design sit beneath, as notes in reading order.
  const notes = [], per = Math.max(1, Math.floor((Math.max(L.W, 4 * (CT.NOTE_W + CT.NOTE_GAP)) - 24) / (CT.NOTE_W + CT.NOTE_GAP)));
  const y0 = L.H + 34;
  F.notes.forEach((n, i) => notes.push({id: n.id, note: n, x: 12 + (i % per) * (CT.NOTE_W + CT.NOTE_GAP), y: y0 + Math.floor(i / per) * (CT.NOTE_H + CT.NOTE_GAP), w: CT.NOTE_W, h: CT.NOTE_H}));
  const W = Math.max(L.W, ...notes.map(n => n.x + n.w + 12)), H = notes.length ? Math.max(...notes.map(n => n.y + n.h)) + 24 : L.H;
  return {kind: 'context', ...L, W, H, rail: 0, notes, notesY: notes.length ? y0 - 24 : null, lanesH: L.H};
}
