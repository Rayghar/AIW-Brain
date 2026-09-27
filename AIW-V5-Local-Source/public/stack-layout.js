// Technology realisation — deterministic layout for the Chapter 7 Model views.
//
// Stack: realisations are rows (grouped by platform family, in Chapter 6's order); fixed columns
// read left to right from what a realisation provides, to the product chosen, to who depends on
// it, to the obligations written for it, to how far its selection has gone. Options: one
// realisation's options are columns and its criteria are rows. Guarantees are checked in
// stack-validate.mjs; neither layout reads the lens.

// The rail names what each realisation realises, so the columns start at the choice.
export const SX = {RAIL: 268, HEAD_H: 118, BAND: 22, ROW_H: 64, OPT_H: 46, GROUP_H: 26};
export const STACK_COLS = [
  {id: 'choice', title: 'Choice', sub: 'the preferred option', w: 250, group: 'structure'},
  {id: 'serves', title: 'Depends on it', sub: 'components · stop if it fails', w: 132, group: 'structure'},
  {id: 'operations', title: 'Operate', w: 70, group: 'operation', obligation: true},
  {id: 'access', title: 'Access', w: 70, group: 'operation', obligation: true},
  {id: 'data', title: 'Data', w: 70, group: 'operation', obligation: true},
  {id: 'resilience', title: 'Recover', w: 70, group: 'operation', obligation: true},
  {id: 'interface', title: 'Interfaces', w: 70, group: 'operation', obligation: true},
  {id: 'lifecycle', title: 'Lifecycle', w: 70, group: 'operation', obligation: true},
  {id: 'sizing', title: 'Sizing', w: 70, group: 'operation'},
  {id: 'cost', title: 'Cost', w: 70, group: 'operation'},
  {id: 'selection', title: 'Selection', sub: 'preferred · recorded · approved', w: 190, group: 'reasoning'}
];
export const BANDS = {structure: 'What it provides, and to whom', operation: 'Implementation obligations', reasoning: 'Decision'};
export function stackHead() { return SX.HEAD_H + 10; }

export function stackLayout(F) {
  let y = stackHead() + 6, fam;
  const rows = [], groups = [];
  for (const r of F.rows) {
    if (r.family !== fam) { fam = r.family; const g = F.groups.find(x => x.family === fam); groups.push({family: fam, title: g?.title || fam, y, h: SX.GROUP_H}); y += SX.GROUP_H; }
    const h = r.kind === 'option' ? SX.OPT_H : SX.ROW_H;
    rows.push({id: r.id, row: r, y, h}); y += h;
  }
  const x0 = SX.RAIL + 10;
  let x = x0;
  const cols = STACK_COLS.map(c => { const k = {...c, x}; x += c.w; return k; });
  const colGroups = [];
  for (const c of cols) { const last = colGroups.at(-1); if (last && last.group === c.group) last.w += c.w; else colGroups.push({group: c.group, title: BANDS[c.group], x: c.x, w: c.w}); }
  const cells = [];
  for (const r of rows) for (const c of cols) cells.push({row: r.id, col: c.id, x: c.x + 3, y: r.y + 5, w: c.w - 6, h: r.h - 10});
  const W = x + 16, H = y + 24;
  return {kind: 'stack', W, H, top: stackHead(), rail: SX.RAIL, x0, cols, colGroups, rows, groups, cells};
}

// One realisation: options are columns, criteria rows, with what each option brings and costs.
// The columns share the stage's width, between a readable minimum and a sensible maximum.
export const OX = {RAIL: 300, HEAD_H: 136, COL_W: 196, COL_MAX: 380, ROW_H: 58, GROUP_H: 26, NOTE_H: 92};
export function optionsHead() { return OX.HEAD_H + 10; }
export function optionsLayout(G, {viewW = 0} = {}) {
  const colW = G.cols.length && viewW ? Math.max(OX.COL_W, Math.min(OX.COL_MAX, Math.floor((viewW - OX.RAIL - 34) / G.cols.length))) : OX.COL_W;
  let y = optionsHead() + 6, grp;
  const rows = [], groups = [];
  for (const r of G.rows) { if (r.group !== grp) { grp = r.group; const g = G.groups.find(x => x.group === grp); groups.push({group: grp, title: g?.title || grp, y, h: OX.GROUP_H}); y += OX.GROUP_H; } rows.push({id: r.id, row: r, y, h: OX.ROW_H}); y += OX.ROW_H; }
  // The weighing: priority × effect, recorded and with suggestions, beneath the criteria.
  groups.push({group: 'weigh', title: 'As the drivers weigh them', y, h: OX.GROUP_H}); y += OX.GROUP_H;
  const weigh = {id: 'weigh', y, h: OX.ROW_H}; y += OX.ROW_H;
  groups.push({group: 'notes', title: 'What each option brings and costs', y, h: OX.GROUP_H}); y += OX.GROUP_H;
  const notes = [{id: 'benefits', title: 'Benefits', y, h: OX.NOTE_H}, {id: 'drawbacks', title: 'Drawbacks and limits', y: y + OX.NOTE_H, h: OX.NOTE_H}];
  y += OX.NOTE_H * 2;
  const cols = G.cols.map((c, i) => ({id: c.id, col: c, x: OX.RAIL + 10 + i * colW, w: colW}));
  const K = new Map(cols.map(c => [c.id, c])), R = new Map(rows.map(r => [r.id, r]));
  const cells = G.cells.map(c => { const k = K.get(c.col), r = R.get(c.row); return {...c, x: k.x + 6, y: r.y + 6, w: k.w - 12, h: r.h - 12}; });
  const noteCells = notes.flatMap(n => cols.map(k => ({note: n.id, col: k.id, x: k.x + 6, y: n.y + 6, w: k.w - 12, h: n.h - 12})));
  const weighCells = cols.map(k => ({col: k.id, x: k.x + 6, y: weigh.y + 6, w: k.w - 12, h: weigh.h - 12}));
  const W = OX.RAIL + 10 + cols.length * colW + 24, H = y + 24;
  return {kind: 'options', W, H, top: optionsHead(), rail: OX.RAIL, rows, groups, notes, cols, cells, noteCells, weigh, weighCells};
}
