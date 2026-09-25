// Chapter 2 Model — deterministic layout for the utility tree and the "What if" ripple.
//
// Utility tree: four columns (utility, quality family, attribute, driver). Leaves take rows in
// order; every parent is centred on its children, and each parent's children hang from one trunk,
// so no connector crosses a card. What if: the driver on the left and what it reaches in columns
// by chapter, each card joined to the driver by a trunk in the gutter before its column. Neither
// layout reads the lens. Guarantees are checked in utility-validate.mjs.

export const UT = {HEAD_H: 64, TOP: 16, GAP: 46, VGAP: 12, AGAP: 18, FGAP: 30, PAD: 16,
  COL: {root: 150, family: 176, attribute: 204, driver: 330},
  H: {root: 112, family: 86, attribute: 94, hole: 124, driver: 158, proposed: 158, folded: 104}};
export function utilityHead() { return UT.HEAD_H + 8; }

const colX = () => {
  const x = {root: UT.PAD}; x.family = x.root + UT.COL.root + UT.GAP; x.attribute = x.family + UT.COL.family + UT.GAP; x.driver = x.attribute + UT.COL.attribute + UT.GAP;
  return x;
};
const LEVEL = ['root', 'family', 'attribute', 'driver'];

export function utilityLayout(F) {
  const X = colX(), byId = new Map(F.nodes.map(n => [n.id, n])), kids = new Map();
  for (const e of F.edges) { if (!kids.has(e.from)) kids.set(e.from, []); kids.get(e.from).push(e.to); }
  const box = new Map();
  let y = utilityHead() + UT.TOP;
  const hOf = n => n.kind === 'attribute' && n.folded ? UT.H.folded : UT.H[n.kind] || UT.H.driver;
  const place = (id, top) => { const n = byId.get(id), col = LEVEL[n.level], h = hOf(n); box.set(id, {id, node: n, x: X[col], y: Math.round(top), w: UT.COL[col], h}); };
  const families = kids.get('U:root') || [];
  const bands = [];
  families.forEach((fid, fi) => {
    if (fi) y += UT.FGAP;
    const fTop = y;
    (kids.get(fid) || []).forEach((aid, ai) => {
      if (ai) y += UT.AGAP;
      const ds = kids.get(aid) || [], a = byId.get(aid), ah = hOf(a);
      if (!ds.length) { place(aid, y); y += ah; return; }
      const top = y;
      ds.forEach((did, di) => { if (di) y += UT.VGAP; place(did, y); y += hOf(byId.get(did)); });
      // The attribute is centred on its drivers, and never taller than the block it heads.
      const block = y - top;
      if (block < ah) { const shift = (ah - block) / 2; for (const did of ds) box.get(did).y += Math.round(shift); y = top + ah; place(aid, top); }
      else place(aid, top + (block - ah) / 2);
    });
    const kidsBoxes = (kids.get(fid) || []).map(id => box.get(id)), fh = hOf(byId.get(fid));
    const span = [Math.min(...kidsBoxes.map(b => b.y)), Math.max(...kidsBoxes.map(b => b.y + b.h))];
    if (span[1] - span[0] < fh) { y = Math.max(y, span[0] + fh); place(fid, span[0]); }
    else place(fid, (span[0] + span[1]) / 2 - fh / 2);
    bands.push({id: fid, y: fTop - 10, h: y - fTop + 20});
  });
  if (!families.length) y += UT.H.root;
  const fb = families.map(id => box.get(id));
  const rh = UT.H.root, rs = fb.length ? [Math.min(...fb.map(b => b.y)), Math.max(...fb.map(b => b.y + b.h))] : [utilityHead() + UT.TOP, utilityHead() + UT.TOP + rh];
  place('U:root', Math.max(utilityHead() + UT.TOP, (rs[0] + rs[1]) / 2 - rh / 2));
  const edges = F.edges.map(e => {
    const a = box.get(e.from), b = box.get(e.to), sy = a.y + a.h / 2, ty = b.y + b.h / 2, xm = a.x + a.w + UT.GAP / 2;
    return {id: e.from + '>' + e.to, from: e.from, to: e.to, pts: [[a.x + a.w, sy], [xm, sy], [xm, ty], [b.x, ty]]};
  });
  const cards = [...box.values()];
  const W = X.driver + UT.COL.driver + UT.PAD, H = Math.max(y, ...cards.map(c => c.y + c.h)) + 24;
  return {kind: 'tree', W, H, top: utilityHead(), rail: 0, cards, edges, bands, cols: LEVEL.map(k => ({id: k, x: X[k], w: UT.COL[k]}))};
}

// ---------------------------------------------------------------- What if

// The driver stays in the sticky head; what it reaches is read in bands, one per chapter, down a
// labelled rail — three cards to a row, the most severe first.
export const TU = {HEAD_H: 138, RAIL: 164, CARD_W: 240, CARD_H: 120, AGG_H: 138, GAP: 12, PER_ROW: 3, PAD: 12, BAND_PAD: 12};
export const RIPPLE_COLS = [
  {id: 'decision', title: 'Decisions', chapter: 'Chapter 3'},
  {id: 'plan', title: 'Runtime', chapter: 'Chapter 10'},
  {id: 'capability', title: 'Platform', chapter: 'Chapter 6'},
  {id: 'product', title: 'Products', chapter: 'Chapter 7'},
  {id: 'path', title: 'Interfaces', chapter: 'Chapter 8'}
];
export const SEVERITY = ['breaks', 'holdsNow', 'revisit', 'unknown', 'eases', 'holds'];
export function tuneHead() { return TU.HEAD_H + 8; }

// Cards with the same kind, state and reason read as one, listing what they cover.
export function rippleCards(effects) {
  const groups = new Map();
  for (const e of effects) {
    const k = e.kind + '|' + e.state + '|' + e.why.replace(/[A-Z]{2,4}-\d{3}/g, '#');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  return [...groups.values()].map(g => g.length === 1 ? {...g[0], members: [g[0]], id: g[0].kind + ':' + g[0].id} : {...g[0], id: g[0].kind + ':group:' + g.map(x => x.id).join(','), members: g, title: `${g.length} ${g[0].kind === 'plan' ? 'runtime plans' : g[0].kind === 'product' ? 'realisations' : g[0].kind === 'capability' ? 'capabilities' : 'decisions'}`, aggregate: true});
}

export function tuneLayout(T) {
  const x0 = TU.RAIL + TU.PAD, bands = [], cards = [];
  let y = tuneHead() + 10;
  for (const c of RIPPLE_COLS) {
    const es = T.effects.filter(e => e.kind === c.id);
    if (!es.length) continue;
    const rc = rippleCards(es).sort((a, b) => SEVERITY.indexOf(a.state) - SEVERITY.indexOf(b.state) || (a.ref < b.ref ? -1 : 1));
    const top = y;
    for (let i = 0; i < rc.length; i += TU.PER_ROW) {
      const row = rc.slice(i, i + TU.PER_ROW), h = Math.max(...row.map(r => (r.aggregate ? TU.AGG_H : TU.CARD_H)));
      row.forEach((r, k) => cards.push({id: r.id, card: r, col: c.id, x: x0 + k * (TU.CARD_W + TU.GAP), y: y + TU.BAND_PAD, w: TU.CARD_W, h}));
      y += h + TU.GAP;
    }
    y += TU.BAND_PAD * 2 - TU.GAP;
    const counts = {};
    for (const e of es) counts[e.state] = (counts[e.state] || 0) + 1;
    bands.push({...c, y: top, h: y - top, count: es.length, counts});
    y += 10;
  }
  const W = x0 + TU.PER_ROW * (TU.CARD_W + TU.GAP) - TU.GAP + TU.PAD, H = Math.max(y, tuneHead() + 120) + 16;
  return {kind: 'tune', W, H, top: tuneHead(), rail: TU.RAIL, head: {x: x0, w: W - x0 - TU.PAD, h: TU.HEAD_H - 12}, bands, cards, edges: []};
}
