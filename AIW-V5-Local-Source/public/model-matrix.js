// The Matrix view of a chapter model (round 3, D; round 4, R4-B): any two record sets of the one model against each
// other. The sets offered are the record types the chapter's connected model and the project actually hold (read from
// the data, never a fixed list); each chapter opens on its default pair and remembers the pair chosen. A cell says how
// the row relates to the column: the recorded relationship(s) where there is one; else the path through one
// intermediate record (two hops), marked as such; and only where the two sets meet neither way, the shortest chain of
// recorded relationships through the design (requirement → responsibility → component → running part). A click
// selects the cell. A row or column with nothing recorded against the other axis is a gap and is marked as one.
// Large sets are capped (the first 60 rows × 40 columns) with a note and a filter per axis. A reading of the saved
// document: nothing here writes. An axis of requirements filters on the text every requirement search reads
// (requirement-groups.js requirementSearchIndex), so a requirement is found by its workbook id, its domain or its group
// as it is in the register (round 12, G, GR-UX-06).
import {architectureModel, OBJECT_TYPES} from './architecture-model.js';
import {layerOfType} from './notation-model.js';
import {layerForLevel} from './chapter-names.js';
import {perDocument} from './document-memo.js';
import {esc} from './html-escape.js';
import {requirementSearchIndex} from './requirement-groups.js';
import {chapterRecordSet} from './chapter-records.js';

// The words for the sets the chapters' defaults name; any other record type reads its own label, in the plural.
export const SET_LABELS = {journey: 'Journey steps', requirement: 'Requirements', quality: 'Quality drivers', decision: 'Decisions', responsibility: 'Responsibilities', component: 'Components', capability: 'Capabilities', technology: 'Products', contract: 'Contracts', data: 'Data definitions', threat: 'Threats', control: 'Controls', instance: 'Placements', runtime: 'Running parts'};
// Each chapter's default pair (round 11, A) asks what no other instrument of the chapter asks: Chapter 3 what each
// decision answers (Trade-offs weighs it against the drivers), Chapter 4 whether a responsibility is realised yet,
// Chapter 5 the allocation of responsibilities to components, Chapter 6 what realises each capability, Chapter 9 what
// each control protects, Chapter 10 which targets each operating plan carries, Chapter 11 what protects what was asked for.
export const MATRIX_DEFAULTS = {1: ['journey', 'requirement'], 2: ['requirement', 'quality'], 3: ['decision', 'requirement'], 4: ['responsibility', 'component'], 5: ['responsibility', 'component'], 6: ['component', 'capability'], 7: ['capability', 'technology'], 8: ['component', 'contract'], 9: ['control', 'component'], 10: ['runtime', 'quality'], 11: ['requirement', 'control']};
// What one screen draws (round 4, scale): beyond it the matrix says so and the axis filters narrow it.
export const MATRIX_CAP = {rows: 60, cols: 40};
const plural = w => (/(s|ence|ing)$/i.test(w) ? w : /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
export const setLabel = t => SET_LABELS[t] || plural(OBJECT_TYPES[t]?.label || String(t));
// A record type is a name the architecture model knows (a remembered pair is checked against it before use).
export const isRecordType = t => typeof t === 'string' && Object.hasOwn(OBJECT_TYPES, t);
// Words for a relationship read from the row's side.
const WORD = {realizedBy: ['realized by', 'realizes'], implementedBy: ['implemented by', 'implements'], fulfils: ['fulfils', 'fulfilled by'], requires: ['requires', 'required by'], provides: ['provides', 'provided by'], uses: ['uses', 'used by'], owns: ['owns', 'owned by'], exchanges: ['exchanges', 'exchanged by'], protects: ['protects', 'protected by'], mitigates: ['mitigates', 'mitigated by'], threatens: ['threatens', 'threatened by'], enforces: ['enforces', 'enforced by'], operatedAs: ['operated as', 'operates'], placedAs: ['placed as', 'places'], metBy: ['met by', 'meets'], constrains: ['constrains', 'constrained by'], justifies: ['justifies', 'justified by'], addresses: ['addresses', 'addressed by'], considers: ['considers', 'considered by'], interaction: ['calls', 'called by'], realizesContract: ['realizes', 'realized by'], supports: ['supports', 'supported by'], memberOf: ['belongs to', 'holds'], partOf: ['part of', 'holds'], hasNeed: ['needs', 'needed by'], motivatedBy: ['motivated by', 'motivates'], evidences: ['evidences', 'evidenced by'], sequence: ['then', 'after'], informs: ['informs', 'informed by'], delivers: ['delivers', 'delivered by'], precedes: ['precedes', 'follows'], dependency: ['depends on', 'depended on by'], trust: ['trusts', 'trusted by'], data: ['sends data to', 'receives data from'], 'participates in': ['participates in', 'has participant']};
const say = (e, fromRow) => (WORD[e.type] ? WORD[e.type][fromRow ? 0 : 1] : (fromRow ? '' : '← ') + (e.label || e.type));
// Paths run through the design's spine only, so that two records are not "related" through a shared project or note.
const SPINE = new Set(['journey', 'requirement', 'quality', 'decision', 'responsibility', 'component', 'capability', 'need', 'technology', 'contract', 'data', 'threat', 'control', 'runtime', 'instance']);
const SKIP = new Set(['frames', 'framesBaseline', 'scopes', 'describes', 'assesses', 'conflictsWith', 'inEnvironment', 'locatedIn', 'withinBoundary', 'memberOf', 'sequence']);

const graphOf = perDocument(p => {
  const M = architectureModel(p), adj = new Map(), byType = new Map();
  const records = new Set(Array.from({length: 11}, (_, i) => chapterRecordSet(p, i + 1).records).flat().map(r => r.id));
  for (const e of M.relationships) { if (SKIP.has(e.type) || e.from === e.to) continue; for (const [a, b] of [[e.from, e.to], [e.to, e.from]]) { if (!adj.has(a)) adj.set(a, []); adj.get(a).push({to: b, e, out: a === e.from}); } }
  // Axes contain saved chapter records. Derived process steps and nested option projections
  // remain available to trace paths but never masquerade as additional register records.
  for (const o of M.objects.values()) { if (!records.has(o.id)) continue; if (!byType.has(o.type)) byType.set(o.type, []); byType.get(o.type).push(o); }
  for (const list of byType.values()) list.sort((a, b) => String(a.ref).localeCompare(String(b.ref), undefined, {numeric: true}));
  return {M, adj, byType};
});
const refOf = (M, id) => M.objects.get(id)?.ref || id;

// The model of one pair: rows, columns, and per related pair a cell {kind: 'direct' | 'via' | 'chain', items}.
// `basis` is the nearest kind the two sets meet by; a gap is a record with no cell of that kind (so a path through
// another record never hides a missing recorded relationship).
export const matrixModel = perDocument((p, o) => buildMatrix(p, o), (o = {}) => (o.rows || '') + '|' + (o.cols || '') + '|' + (o.maxHops || 4));
function buildMatrix(p, {rows, cols, maxHops = 4} = {}) {
  if (!p || !rows || !cols) return null;
  const {M, adj, byType} = graphOf(p), R = byType.get(rows) || [], C = byType.get(cols) || [], colIds = new Set(C.map(o => o.id));
  const cells = new Map(), put = (k, kind, item) => { let c = cells.get(k); if (!c) cells.set(k, c = {kind, items: []}); if (c.kind === kind) c.items.push(item); return c; };
  // 1. The relationships the project records between the two.
  for (const r of R) for (const x of adj.get(r.id) || []) {
    if (!colIds.has(x.to) || x.to === r.id) continue;
    const k = r.id + '|' + x.to; if (cells.get(k)?.items.some(y => y.e === x.e || y.words === say(x.e, x.out))) continue;
    // A direct cell names the ArchiMate type of the recorded relationship (round 6, Contract T).
    put(k, 'direct', {e: x.e, words: say(x.e, x.out), type: x.e.archimate?.type || null, valid: x.e.archimate ? x.e.archimate.valid : null, via: [], steps: [`${refOf(M, r.id)} ${say(x.e, x.out)} ${refOf(M, x.to)}${x.e.archimate?.type ? ' · ' + x.e.archimate.type : ''}`]});
  }
  // 2. Where a pair has none: the paths through one intermediate record of a third set (two hops), each intermediate once.
  for (const r of R) for (const x of adj.get(r.id) || []) {
    const mid = M.objects.get(x.to); if (!mid || !SPINE.has(mid.type) || mid.type === rows || mid.type === cols) continue;
    for (const y of adj.get(mid.id) || []) {
      if (!colIds.has(y.to) || y.to === r.id) continue;
      const k = r.id + '|' + y.to, c = cells.get(k); if (c && (c.kind !== 'via' || c.items.some(i => i.via[0] === mid.id))) continue;
      put(k, 'via', {e: null, words: 'via ' + (mid.ref || mid.id), via: [mid.id], steps: [`${refOf(M, r.id)} ${say(x.e, x.out)} ${refOf(M, mid.id)}`, `${refOf(M, mid.id)} ${say(y.e, y.out)} ${refOf(M, y.to)}`]});
    }
  }
  // 3. Only where the two sets meet neither way: the shortest chain through the spine, up to `maxHops` relationships.
  const chained = !cells.size && rows !== cols;
  if (chained) for (const r of R) {
    const prev = new Map([[r.id, null]]), q = [[r.id, 0]];
    while (q.length) {
      const [id, d] = q.shift(); if (d >= maxHops) continue;
      for (const x of adj.get(id) || []) {
        if (prev.has(x.to)) continue; const o = M.objects.get(x.to); if (!o) continue;
        if (colIds.has(x.to)) {
          prev.set(x.to, {id, x}); const path = []; let at = x.to; while (prev.get(at)) { const s = prev.get(at); path.unshift(s); at = s.id; }
          const via = path.slice(0, -1).map(s => s.x.to);
          put(r.id + '|' + x.to, 'chain', {e: null, words: 'through ' + via.map(v => refOf(M, v)).join(' → '), via, steps: path.map(s => `${refOf(M, s.id)} ${say(s.x.e, s.x.out)} ${refOf(M, s.x.to)}`)});
          continue;
        }
        if (!SPINE.has(o.type) || o.type === rows || o.type === cols) continue;
        prev.set(x.to, {id, x}); q.push([x.to, d + 1]);
      }
    }
  }
  const counts = {direct: 0, via: 0, chain: 0}; for (const c of cells.values()) counts[c.kind]++;
  const basis = counts.direct ? 'direct' : counts.via ? 'via' : counts.chain ? 'chain' : null;
  const search = rows === 'requirement' || cols === 'requirement' ? requirementSearchIndex(p) : null;
  const node = o => ({id: o.id, ref: o.ref || o.id, title: o.title || '', layer: layerOfType(o.type, o.record) || layerForLevel(o.level), search: (o.type === 'requirement' && search?.get(String(o.id))) || ''});
  const rowsOut = R.map(node), colsOut = C.map(node), hit = (r, c) => cells.get(r + '|' + c)?.kind === basis;
  const emptyRows = new Set(rowsOut.filter(r => !colsOut.some(c => hit(r.id, c.id))).map(r => r.id));
  const emptyCols = new Set(colsOut.filter(c => !rowsOut.some(r => hit(r.id, c.id))).map(c => c.id));
  return {rowType: rows, colType: cols, rows: rowsOut, cols: colsOut, cells, emptyRows, emptyCols, chained, basis, counts, rowLabel: setLabel(rows), colLabel: setLabel(cols)};
}
// The sets a chapter can choose from, read from the data: every record type the project holds at least one record of,
// those the chapter's connected model draws first (`inModel`: the types of its elements), each in the chapters' order.
export function matrixSets(p, {inModel = null} = {}) {
  if (!p) return [];
  const {byType} = graphOf(p), here = inModel instanceof Set ? inModel : new Set(inModel || []), order = Object.keys(OBJECT_TYPES);
  const rank = t => (OBJECT_TYPES[t]?.chapter ?? 99) * 1000 + (order.indexOf(t) < 0 ? 999 : order.indexOf(t));
  return [...byType.entries()].filter(([, list]) => list.length).map(([type, list]) => ({type, label: setLabel(type), count: list.length, chapter: OBJECT_TYPES[type]?.chapter, here: here.has(type)})).sort((a, b) => rank(a.type) - rank(b.type));
}

const MARK = {direct: '●', via: '○', chain: '◌'};
// An axis longer than this offers its own filter.
const FILTER_FROM = 12;
const matches = (n, q) => !q || (n.ref + ' ' + n.title + ' ' + (n.search || '')).toLowerCase().includes(q);
// The rows and columns on screen: the layers and the axis filters applied, then the cap.
export function matrixView(X, {layers = null, filter = {}, cap = MATRIX_CAP} = {}) {
  const keep = Array.isArray(layers) ? new Set(layers) : null, vis = n => !keep || !n.layer || keep.has(n.layer);
  const fr = String(filter.rows || '').trim().toLowerCase(), fc = String(filter.cols || '').trim().toLowerCase();
  const inLayers = {rows: X.rows.filter(vis), cols: X.cols.filter(vis)};
  const rows = inLayers.rows.filter(n => matches(n, fr)), cols = inLayers.cols.filter(n => matches(n, fc));
  const shownRows = rows.slice(0, cap.rows), shownCols = cols.slice(0, cap.cols);
  return {rows, cols, shownRows, shownCols, capped: rows.length > shownRows.length || cols.length > shownCols.length, hidden: X.rows.length - inLayers.rows.length + X.cols.length - inLayers.cols.length, filtered: !!(fr || fc)};
}
export function matrixHTML(X, {sel = null, cell = null, layers = null, sets = [], chapter = null, filter = {}, cap = MATRIX_CAP} = {}) {
  if (!X) return '<p class="nt-sheet-empty">No matrix for this chapter.</p>';
  const V = matrixView(X, {layers, filter, cap}), {rows, cols, shownRows, shownCols, hidden} = V;
  const options = value => {
    const groups = new Map(), entries = sets.some(s => s.type === value) ? sets : [...sets, {type: value, label: setLabel(value), count: 0, chapter: OBJECT_TYPES[value]?.chapter}];
    for (const s of entries) { const ch = s.chapter || OBJECT_TYPES[s.type]?.chapter || 0; if (!groups.has(ch)) groups.set(ch, []); groups.get(ch).push(s); }
    return [...groups].sort(([a], [b]) => a - b).map(([ch, records]) => `<optgroup label="${ch ? 'Chapter ' + ch : 'Other records'}">${records.map(s => `<option value="${esc(s.type)}" ${s.type === value ? 'selected' : ''}>${esc(s.label)} · ${s.count}</option>`).join('')}</optgroup>`).join('');
  };
  // An axis is its set and, where it holds more than a screen's worth (or a filter is set), a filter by reference or title.
  const axis = (field, value) => {
    const word = field === 'rows' ? 'Rows' : 'Columns', f = field === 'rows' ? 'xrfilter' : 'xcfilter', n = (field === 'rows' ? X.rows : X.cols).length;
    const find = n > FILTER_FROM || filter[field] ? `<label class="nt-find nt-xfind"><span class="cm-sr">Filter the ${word.toLowerCase()}</span><input type="search" data-nt-field="${f}" value="${esc(filter[field] || '')}" placeholder="filter" aria-label="Filter the ${word.toLowerCase()} by reference or title${(field === 'rows' ? X.rowType : X.colType) === 'requirement' ? ', external id, domain or group' : ''}"></label>` : '';
    return `<div class="nt-x-axis" role="group" aria-label="${word}"><label class="cm-scn"><span>${word}</span><select data-nt-field="x${field}" aria-label="${word} of the matrix">${options(value)}</select></label>${find}</div>`;
  };
  const gapsR = rows.filter(r => X.emptyRows.has(r.id)).length, gapsC = cols.filter(c => X.emptyCols.has(c.id)).length;
  const how = X.basis === 'via' ? ' · related through one record' : X.basis === 'chain' ? ' · related through the design' : '';
  const status = `${rows.length} × ${cols.length}${how} · ${!rows.length || !cols.length ? 'nothing to compare yet' : gapsR + gapsC ? `${gapsR} ${X.rowLabel.toLowerCase()} and ${gapsC} ${X.colLabel.toLowerCase()} with no link at this scope` : 'every shown record has a link; this does not verify coverage'}${hidden ? ` · ${hidden} hidden by layers` : ''}${V.filtered ? ' · filtered' : ''}`;
  const bar = `<div class="nt-sheet-bar nt-x-bar">${axis('rows', X.rowType)}<button type="button" class="cm-btn nt-x-swap" data-nt="swap" title="Swap the rows and the columns">⇄ <span>Swap axes</span></button>${axis('cols', X.colType)}<p class="nt-sheet-status" role="status">${esc(status)}</p>${hidden ? '<button type="button" class="cm-btn" data-nt="layers-all">Show every layer</button>' : ''}</div>`;
  if (!shownRows.length || !shownCols.length) {
    const emptyAxis = !X.rows.length ? X.rowLabel : !X.cols.length ? X.colLabel : null, unmatched = !rows.length && filter.rows ? X.rowLabel : !cols.length && filter.cols ? X.colLabel : null;
    const why = emptyAxis ? `The project records no ${emptyAxis.toLowerCase()} yet.` : unmatched ? `No ${unmatched.toLowerCase()} match the filter.` : 'Every record of one axis is hidden by the layers.';
    return bar + `<p class="nt-sheet-empty">${esc(why)}</p>`;
  }
  const capNote = V.capped ? `<p class="nt-x-cap" role="note">showing the first ${shownRows.length} rows × ${shownCols.length} columns · filter to narrow</p>` : '';
  const head = `<tr><th scope="col" class="nt-x-corner"><span>${esc(X.rowLabel)} ↓ · ${esc(X.colLabel)} →</span></th>${shownCols.map(c => `<th scope="col" class="${X.emptyCols.has(c.id) ? 'gap' : ''}${c.id === sel ? ' sel' : ''}" title="${esc(c.ref + ' ' + c.title)}${X.emptyCols.has(c.id) ? ' · nothing recorded against it' : ''}"><button type="button" data-nt-row="${esc(c.id)}"><b>${esc(c.ref)}</b><small>${esc(c.title)}</small></button></th>`).join('')}</tr>`;
  const body = shownRows.map(r => `<tr class="${X.emptyRows.has(r.id) ? 'gap' : ''}${r.id === sel ? ' sel' : ''}"><th scope="row" title="${esc(r.ref + ' ' + r.title)}${X.emptyRows.has(r.id) ? ' · nothing recorded against it' : ''}"><button type="button" data-nt-row="${esc(r.id)}"><b>${esc(r.ref)}</b> ${esc(r.title)}</button>${X.emptyRows.has(r.id) ? '<small class="nt-gap">gap</small>' : ''}</th>${shownCols.map(c => {
    const k = r.id + '|' + c.id, x = X.cells.get(k), on = cell === k;
    if (!x) return `<td class="${X.emptyRows.has(r.id) || X.emptyCols.has(c.id) ? 'gap' : ''}"></td>`;
    const label = x.kind === 'direct' ? `${r.ref} ${x.items.map(i => i.words + (i.type ? ' (' + i.type + ')' : '')).join('; ')} ${c.ref}` : x.kind === 'via' ? `${r.ref} and ${c.ref}: no recorded relationship; related via ${x.items.map(i => i.words.replace(/^via /, '')).join(', ')}` : `${r.ref} and ${c.ref}: related ${x.items[0].words}`;
    return `<td class="hit ${x.kind}${on ? ' on' : ''}"><button type="button" data-nt-cell="${esc(k)}" aria-pressed="${on}" aria-label="${esc(label)}" title="${esc(label)}"><i aria-hidden="true">${MARK[x.kind]}</i><span>${esc(x.items[0].words)}${x.items.length > 1 ? ` <small>+${x.items.length - 1}</small>` : ''}</span></button></td>`;
  }).join('')}</tr>`).join('');
  return bar + capNote + `<div class="nt-tcard"><div class="nt-table-wrap nt-x-wrap" tabindex="0" role="region" aria-label="${esc(X.rowLabel)} against ${esc(X.colLabel)}, scrolls both ways"><table class="nt-table nt-x"><caption class="cm-sr">Chapter ${esc(chapter)}: ${esc(X.rowLabel)} against ${esc(X.colLabel)}. A filled mark is a recorded relationship, a hollow mark a path through one other record${X.basis === 'chain' ? ', a dotted mark a longer chain through the design' : ''}; an empty row or column is a gap.</caption><thead>${head}</thead><tbody>${body}</tbody></table></div><p class="nt-scroll-hint" aria-hidden="true">Scroll sideways for more columns →</p></div><p class="nt-x-key"><span><i>●</i> recorded<span class="nt-long"> relationship</span></span><span><i>○</i> through one<span class="nt-long"> other</span> record</span>${X.basis === 'chain' ? '<span><i>◌</i> through the design</span>' : ''}<span class="gap">gap<span class="nt-long">: nothing recorded against the other axis</span></span></p>`;
}
// ---------------------------------------------------------------- the trace path (round 5)
// The chain from one record through the design's layers: requirement → quality driver → decision → responsibility →
// component → capability → realization → contract or data → control → placement → running part. Each step is read
// from the Matrix of the record's type against that step's type, so the trace and the Matrix agree: the records the
// Matrix relates to this row by the nearest kind it holds for it (recorded, else through one record, else the shortest
// chains through the design), with the records each path passes through. A step with nothing is a gap, and is named.
export const TRACE_ORDER = [['requirement'], ['quality'], ['decision'], ['responsibility'], ['component'], ['capability'], ['technology'], ['contract', 'data'], ['control'], ['instance'], ['runtime']];
const STEP_WORD = {requirement: 'requirement', quality: 'quality driver', decision: 'decision', responsibility: 'responsibility', component: 'component', capability: 'capability', technology: 'realization', contract: 'contract', data: 'data definition', control: 'control', instance: 'placement', runtime: 'running part'};
const KIND_RANK = {direct: 0, via: 1, chain: 2};
export function traceFrom(p, id, {extra = []} = {}) {
  if (!p || !id) return null;
  const {M} = graphOf(p), start = M.objects.get(id); if (!start) return null;
  const ids = new Set([id]), order = TRACE_ORDER.some(g => g.includes(start.type)) ? TRACE_ORDER : [[start.type], ...TRACE_ORDER], steps = [];
  for (const group of order) {
    const found = new Map();
    for (const t of group) {
      if (t === start.type) { found.set(id, start); continue; }
      const X = matrixModel(p, {rows: start.type, cols: t}); if (!X) continue;
      const mine = X.cols.map(c => [c, X.cells.get(id + '|' + c.id)]).filter(([, x]) => x);
      if (!mine.length) continue;
      const rank = Math.min(...mine.map(([, x]) => KIND_RANK[x.kind])), near = mine.filter(([, x]) => KIND_RANK[x.kind] === rank);
      const len = x => Math.min(...x.items.map(i => i.steps.length)), shortest = Math.min(...near.map(([, x]) => len(x)));
      for (const [c, x] of near) {
        if (x.kind === 'chain' && len(x) > shortest) continue;
        found.set(c.id, M.objects.get(c.id)); ids.add(c.id);
        for (const it of x.items) if (x.kind !== 'chain' || it.steps.length === shortest) for (const v of it.via) ids.add(v);
      }
    }
    const records = [...found.values()].filter(Boolean).sort((a, b) => String(a.ref).localeCompare(String(b.ref), undefined, {numeric: true}));
    steps.push({types: group, word: group.map(t => STEP_WORD[t] || setLabel(t).toLowerCase()).join(' or '), records: records.map(o => ({id: o.id, ref: o.ref || o.id, title: o.title || '', type: o.type})), gap: !records.length});
  }
  for (const x of extra) if (M.objects.has(x)) ids.add(x);
  const refs = list => list.slice(0, 2).map(r => r.ref).join(', ') + (list.length > 2 ? ' +' + (list.length - 2) : '');
  const chain = steps.map(st => (st.gap ? `[no ${st.word}]` : refs(st.records))).join(' → ');
  return {id, ref: start.ref || id, title: start.title || '', type: start.type, ids, steps, chain, gaps: steps.filter(st => st.gap).map(st => 'no ' + st.word)};
}

// What a selected cell says, for the companion.
export function cellHTML(X, key) {
  const x = X?.cells.get(key); if (!x) return '';
  const [rid, cid] = key.split('|'), r = X.rows.find(o => o.id === rid), c = X.cols.find(o => o.id === cid);
  const what = x.kind === 'direct' ? `${x.items.length === 1 ? 'A relationship' : x.items.length + ' relationships'} the project records${x.items[0].type ? ', typed ' + [...new Set(x.items.map(i => i.type))].join(', ') + ' by ArchiMate 3.1' : ''}${x.items.some(i => i.valid === false) ? '; the recorded kind is not allowed between these two types, so the standard writes an association' : ''}.` : x.kind === 'via' ? `No relationship is recorded between the two; ${x.items.length === 1 ? 'one record joins them' : x.items.length + ' records join them'}, each by two recorded relationships.` : 'No relationship is recorded between the two, nor through one record; this is the shortest chain of recorded relationships that joins them.';
  return `<section class="cm-spec nt-cellspec"><h4 aria-level="3">Selected cell · ${x.kind === 'direct' ? 'recorded' : x.kind === 'via' ? 'through one record' : 'through the design'}</h4><p><b>${esc(r?.ref || rid)}</b> ${esc(r?.title || '')}</p><ul class="nt-cell-list">${x.items.slice(0, 8).map(i => `<li>${i.steps.map(esc).join(' · ')}</li>`).join('')}${x.items.length > 8 ? `<li>and ${x.items.length - 8} more</li>` : ''}</ul><p><b>${esc(c?.ref || cid)}</b> ${esc(c?.title || '')}</p><p class="cm-muted">${what}</p><p class="nt-actions"><button type="button" class="cm-btn" data-nt="trace" data-id="${esc(rid)}" data-cell="${esc(key)}" title="Light ${esc(r?.ref || rid)}’s chain through the design in the Layers view">Trace ${esc(r?.ref || rid)} through the design</button></p></section>`;
}
