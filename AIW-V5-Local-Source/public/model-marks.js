// Marks on the picture (round 5, Contract M). Any source can say what state an element is in, and every picture paints
// it the same way: the chapter checks (source `checks`: passing, to fix, to confirm, keyed by record id), the trace path
// (`trace`: traced and dimmed), a change impact or a decision alternative (`impact`: changed), Sol's review findings and
// proposals not yet saved (ghost). A mark is {id, state, note, href?}; set(source, marks) replaces what that source said,
// clear(source) withdraws it, and every change is announced as `aiw:model-marks` with {source}, so a picture repaints
// its marks without laying itself out again. When two sources mark one element the stronger state is drawn:
// traced > changed > fix > confirm > pass; a ghost is drawn as its own element; dimmed lowers the opacity and never hides.
// The glyphs and words are the shared ones of readiness-model.js. Presentation only: nothing here writes the document.
import {CHECK_WORDS, CHECK_GLYPHS} from './readiness-model.js';

export const MARK_STATES = ['traced', 'changed', 'fix', 'confirm', 'pass', 'ghost', 'dimmed'];
const RANK = {traced: 5, changed: 4, fix: 3, confirm: 2, pass: 1};
// What each state says, in one vocabulary: the check states keep the readiness words and glyphs.
export const MARK_WORDS = {...CHECK_WORDS, changed: 'changed', traced: 'on the trace', dimmed: 'off the trace', ghost: 'proposed, not saved'};
export const MARK_GLYPHS = {...CHECK_GLYPHS};
export const isCheckState = s => s === 'pass' || s === 'fix' || s === 'confirm';

const sources = new Map(); // source → {marks: [{id, state, note, href, ...}], info}
let version = 0, merged = null;
const announce = source => {
  version++; merged = null;
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('aiw:model-marks', {detail: {source}}));
};
const clean = m => (m && m.id != null && MARK_STATES.includes(m.state) ? {...m, id: String(m.id), note: m.note == null ? '' : String(m.note)} : null);

// Replace what one source says. `info` is the source's own reading (a trace's chain, the alternative's name); optional.
export function setMarks(source, marks = [], info = null) {
  const key = String(source || ''); if (!key) return;
  const list = (Array.isArray(marks) ? marks : []).map(clean).filter(Boolean);
  const before = sources.get(key);
  const sig = JSON.stringify([list, info]);
  if (before && before.sig === sig) return;
  sources.set(key, {marks: list, info: info || null, sig});
  announce(key);
}
export function clearMarks(source) { const key = String(source || ''); if (!sources.has(key)) return; sources.delete(key); announce(key); }
export const marksInfo = source => sources.get(String(source))?.info || null;
export const markSources = () => [...sources.keys()];
export const marksVersion = () => version;

// The merged marks, one per element: the strongest state of the sources that mark it (except those `skip` names), whether
// it is dimmed or a ghost, every source's note, and the glyph and word the picture draws.
export function mergeMarks(skip = null) {
  const off = skip instanceof Set ? skip : new Set(skip || []);
  return mergeSources([...sources].filter(([source]) => !off.has(source)).map(([source, {marks}]) => [source, marks]));
}
// The same merge over sources a picture holds itself ([[source, marks], …]), without publishing them: the record
// picture paints its chapter's checks this way.
export function mergeSources(pairs) {
  const out = new Map();
  for (const [source, list] of pairs) {
    for (const m of (list || []).map(clean).filter(Boolean)) {
      let x = out.get(m.id);
      if (!x) out.set(m.id, x = {id: m.id, state: null, dimmed: false, ghost: false, notes: [], sources: [], href: null, anchor: null, title: ''});
      x.notes.push({source, state: m.state, note: m.note}); if (!x.sources.includes(source)) x.sources.push(source);
      if (m.state === 'dimmed') x.dimmed = true;
      else if (m.state === 'ghost') { x.ghost = true; x.anchor ||= m.anchor || null; x.title ||= m.title || m.note || ''; }
      else if (!x.state || RANK[m.state] > RANK[x.state]) { x.state = m.state; x.note = m.note; x.source = source; }
      if (m.href && !x.href) x.href = m.href;
    }
  }
  // A traced element is never dimmed by another source's dimming.
  for (const x of out.values()) { if (x.state === 'traced') x.dimmed = false; x.glyph = MARK_GLYPHS[x.state] || ''; x.word = MARK_WORDS[x.state] || ''; }
  return out;
}
// Every source merged (cached until the next change).
export function allMarks() { return merged ||= mergeMarks(); }

if (typeof window !== 'undefined') {
  window.aiwModelMarks = {
    set: setMarks, clear: clearMarks,
    // Every marked element, merged by Contract M's precedence.
    all: () => [...allMarks().values()].map(x => ({...x, notes: x.notes.map(n => ({...n}))})),
    info: marksInfo, sources: markSources, get version() { return version; },
    words: MARK_WORDS, glyphs: MARK_GLYPHS
  };
}
