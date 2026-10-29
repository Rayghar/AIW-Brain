// A part of the page that fails to load says so (round 26, D-26-15). The shell loads Sol's panel, the chapter models, the
// Validate and Output readings, the instrument tray and a few more modules lazily; when one of those imports fails (a
// network cut, a browser out of resources after many quick navigations) the console used to be the only witness and the
// person saw a page with a part missing. Every lazy import now reports here; failures within a short window become one
// notice that names the parts and says what to do, so a burst of twenty failures is one sentence, not twenty toasts.
// The notice travels on the page's 'aiw:notice' event (project-context.js reportFailure), which entry.js shows.
import {reportFailure} from './project-context.js';

export const LOAD_NOTICE_DELAY = 400; // ms: failures this close together are one notice
const pending = new Set();
let timer = null, schedule = (fn, ms) => setTimeout(fn, ms), sink = null;

// What the notice says for the parts that failed: one sentence, the parts named, the remedy.
export function loadFailureMessage(parts) {
  const names = [...new Set(parts.filter(Boolean))];
  if (!names.length) return '';
  const list = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names.at(-1);
  return `${names.length === 1 ? 'A part of this page did not load' : names.length + ' parts of this page did not load'}: ${list}. Reload the page to try again; saved changes stay saved.`;
}

function flush() {
  timer = null;
  const parts = [...pending]; pending.clear();
  const message = loadFailureMessage(parts);
  if (!message) return;
  if (sink) sink(message, parts); else reportFailure(message, null, {quiet: false});
}

// Report a lazily loaded part that did not load. `part` is the words a person reads ("Sol's panel"); `error` goes to
// the console with it. Returns the error so a caller can keep rethrowing.
export function reportLoadFailure(part, error) {
  if (typeof console !== 'undefined') console.warn(`${part} could not load.`, error?.message || error || '');
  pending.add(part);
  if (!timer) timer = schedule(flush, LOAD_NOTICE_DELAY);
  return error;
}

// For tests: route notices to a function and drive the timer by hand.
export function _loadFailuresForTest({notice = null, timer: schedulerOverride = null} = {}) {
  sink = notice; if (schedulerOverride) schedule = schedulerOverride;
  return {flush: () => { if (timer) { timer = null; } flush(); }, pending: () => [...pending]};
}
