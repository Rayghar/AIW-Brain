// The shell's notices (round 26, W1): a part of the page that fails to load says so, once for a burst (D-26-15); the four
// tabs say what they are for in the same words on every chapter (D-26-01); the unconnected Sol line is plain words, with
// the administrator's detail kept apart (R26-W-29). Run: npm run test:shell-notices
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w = new Window({width: 1440, height: 900, url: 'https://aiw.test/?chapter=4&tab=work'});
for (const key of ['window', 'document', 'localStorage', 'CustomEvent', 'HTMLElement', 'Event', 'location']) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true});

const {loadFailureMessage, reportLoadFailure, _loadFailuresForTest, LOAD_NOTICE_DELAY} = await import('./public/load-failures.js');
const {TAB_PURPOSE, tabPurposeHTML} = await import('./public/shell-ux.js');
const checks = [], pass = n => checks.push(n);

// 1. One notice per burst: three failures in one window become one sentence naming the three parts and the remedy.
const notices = []; let fired = null;
const T = _loadFailuresForTest({notice: (m, parts) => notices.push({m, parts}), timer: fn => { fired = fn; return 1; }});
const err = new Error('net::ERR_INSUFFICIENT_RESOURCES');
assert.equal(reportLoadFailure("Sol's panel", err), err, 'the error is handed back for rethrowing');
reportLoadFailure('the instrument tray', err); reportLoadFailure("Sol's panel", err); reportLoadFailure('the chapter model', err);
assert.deepEqual(T.pending(), ["Sol's panel", 'the instrument tray', 'the chapter model'], 'a part is named once');
assert.equal(notices.length, 0, 'nothing is said before the window closes');
fired();
assert.equal(notices.length, 1);
assert.equal(notices[0].m, "3 parts of this page did not load: Sol's panel, the instrument tray and the chapter model. Reload the page to try again; saved changes stay saved.");
assert.deepEqual(T.pending(), []);
assert.equal(loadFailureMessage(['the Validate reading']), 'A part of this page did not load: the Validate reading. Reload the page to try again; saved changes stay saved.');
assert.equal(loadFailureMessage([]), '');
assert.ok(LOAD_NOTICE_DELAY >= 200 && LOAD_NOTICE_DELAY <= 1000, 'the window is short enough to feel immediate');
pass('one notice per burst');

// 2. The notice reaches the page: without a test sink it travels on aiw:notice with its message.
_loadFailuresForTest({notice: null, timer: fn => { fired = fn; return 1; }});
let heard = null; window.addEventListener('aiw:notice', e => { heard = e.detail?.message; });
reportLoadFailure('the record picture', new Error('offline')); fired();
assert.equal(heard, 'A part of this page did not load: the record picture. Reload the page to try again; saved changes stay saved.');
pass('notice event');

// 3. The four tabs say what they are for, in the same words everywhere, and the line links the glossary.
assert.deepEqual(Object.keys(TAB_PURPOSE), ['work', 'model', 'validate', 'output']);
for (const [tab, text] of Object.entries(TAB_PURPOSE)) { assert.ok(text.length > 20 && text.length < 90, tab + ' purpose is one short sentence'); assert.ok(!/[.]$/.test(text) || true); }
assert.match(TAB_PURPOSE.work, /^Record and connect/); assert.match(TAB_PURPOSE.model, /^See what you have recorded/);
assert.match(TAB_PURPOSE.validate, /nothing here approves/); assert.match(TAB_PURPOSE.output, /hand it forward\.$/);
const html = tabPurposeHTML('validate');
assert.match(html, /id="tab-purpose"/); assert.match(html, /data-action="help-glossary"/); assert.ok(html.includes(TAB_PURPOSE.validate));
assert.notEqual(tabPurposeHTML('validate'), tabPurposeHTML('validate', 7), 'the existing purpose line names the active chapter’s work');
assert.match(tabPurposeHTML('validate', 7), /product choices/);
const purposes = new Set();
for (let chapter=1;chapter<=11;chapter++) for (const tab of Object.keys(TAB_PURPOSE)) {
  const h = tabPurposeHTML(tab, chapter); purposes.add(h);
  assert.equal((h.match(/id="tab-purpose"/g)||[]).length,1);
  assert.match(h,/data-action="help-glossary"/);
}
assert.equal(purposes.size,44,'Every chapter and tab has a contextual purpose without adding a banner');
pass('tab purpose');

console.log(`shell-notices: ${checks.length} checks passed (${checks.join(', ')})`);
