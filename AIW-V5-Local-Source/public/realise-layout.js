// Application realization — deterministic layout for the Chapter 5 Model views.
//
// Components: modules are lanes (outside, each module in the anatomy's order, outside), laid out
// by the shared lane engine (lane-layout.js). A card's height follows what it contains — the
// responsibilities it realises — never the lens. Allocation: responsibilities are rows grouped by
// module, components are columns grouped by module. Guarantees are checked in
// realise-validate.mjs; neither layout reads the lens.
import {laneLayout, LANE} from './lane-layout.js';

export const RL = {HEAD_H: 70, CARD_W: 200, LABEL_MAX: 170, HEAD: 42, LINE: 19, LENS: 21, STRIP: 24, PAD: 10, MAX_REAL: 3, MAX_MOD: 4};
export function realiseHead() { return RL.HEAD_H + 12; }

// Lines of realised responsibilities a card shows: at least one ("realises nothing"), at most a
// few with "+ n more".
export function realLines(row) { const n = (row.realises || []).length, max = row.kind === 'module' ? RL.MAX_MOD : RL.MAX_REAL; return Math.max(1, Math.min(max, n)); }
export function cardHeight(row) {
  if (row.kind === 'party' || (row.kind === 'module' && !row.module)) return LANE.CARD_H;
  if (row.kind === 'hole') return RL.HEAD + RL.LINE + RL.LENS + RL.PAD;
  return RL.HEAD + realLines(row) * RL.LINE + RL.LENS + RL.STRIP + RL.PAD;
}

export function realiseLayout(F, {measure = l => 16 + 7 * String(l.label || '').length} = {}) {
  const L = laneLayout(F, {top: realiseHead(), cardW: RL.CARD_W, cardH: (row, ports) => Math.max(cardHeight(row), 22 + ports * LANE.PORT), measure, labelMax: RL.LABEL_MAX, labelInset: 12, labelled: () => true});
  return {kind: 'realise', ...L};
}

