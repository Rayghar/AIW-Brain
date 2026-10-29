// rc41 (lead, from W2's open items): the design at a glance speaks as the tab's own state line does and carries no
// second next step. Synthetic project; no provider, network or write.
import assert from 'node:assert/strict';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?chapter=5&tab=work'});
for (const key of ['window', 'document', 'location', 'history', 'localStorage', 'CustomEvent', 'Element']) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
const {createProject} = await import('./shared/projects-domain.js');
const {settleDocument} = await import('./public/document-memo.js');
const {workStageState, chapterRecordsState, emptyStageLine} = await import('./public/work-frame.js');
const {chapterChecks} = await import('./public/readiness-model.js');
const {workGlanceHTML} = await import('./public/work-glance.js');
const {stripReading} = await import('./public/chapter-strip.js');
const {isConfirmed} = await import('./public/work-records.js');
const {withFinalReview} = await import('./public/review-domain.js');

const checks = [], pass = s => checks.push(s);
let calls = 0; globalThis.fetch = () => { calls++; throw Error('The glance never uses a provider or the network'); };
const p = settleDocument(structuredClone(createProject({name: 'Glance', template: 'bank-payment'}, 'glance-fixture'))), before = JSON.stringify(p);
const dom = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content.firstElementChild; };
const head = el => el.querySelector('.work-glance-head small').textContent;
const validateLink = el => [...el.querySelectorAll('.work-glance-checks a')].filter(a => a.textContent === 'Open Validate');

// A recorded stage on Work: the head is the stage's own line; the checks link to Validate.
const stage = workStageState(p, 5, 'components');
assert(stage.recorded > 0, 'the fixture records Chapter 5 components');
const work = dom(workGlanceHTML(p, 5, 'components'));
assert.equal(work.dataset.workGlance, '5:components');
assert.equal(head(work), stage.line);
assert.equal(validateLink(work).length, 1);
assert.equal(validateLink(work)[0].getAttribute('href'), chapterChecks(p, 5).validateURL);
pass('Work, recorded stage: the head is the stage line and Open Validate leads to the chapter’s checks');

// One next step per tab (the footer's): no "Next task" block on any tab, while the readiness model holds one.
assert(chapterChecks(p, 5).next?.text, 'the fixture has a next task to repeat');
for (const tab of ['work', 'validate', 'output']) {
  const el = dom(workGlanceHTML(p, 5, 'components', {tab}));
  assert.equal(el.querySelectorAll('.work-glance-next, [data-work-glance-next]').length, 0, tab);
  assert(!el.textContent.includes('Next task'), tab);
}
pass('No tab’s glance repeats the footer’s next task');

// Validate and Output: the head is the chapter's line (the tab's state line); Open Validate only from Output.
const chapterLine = chapterRecordsState(p, 5).line;
const onValidate = dom(workGlanceHTML(p, 5, 'components', {tab: 'validate'})), onOutput = dom(workGlanceHTML(p, 5, 'components', {tab: 'output'}));
assert.equal(head(onValidate), chapterLine); assert.equal(head(onOutput), chapterLine);
assert.notEqual(chapterLine, stage.line, 'the fixture tells the chapter from the stage');
assert.equal(validateLink(onValidate).length, 0);
assert(onValidate.querySelector('.work-glance-checks .work-glance-chips'), 'the checks stay on Validate, without the link to itself');
assert.equal(validateLink(onOutput).length, 1);
pass('Validate and Output: the head is the chapter’s line; Validate does not link to itself');

// An empty stage in a chapter with records: the head names the stage as empty and counts the chapter.
assert.equal(workStageState(p, 8, 'lineage').recorded, 0, 'the fixture leaves Chapter 8 lineage empty');
const empty = dom(workGlanceHTML(p, 8, 'lineage'));
assert.equal(head(empty), 'Nothing recorded in this stage yet · ' + chapterRecordsState(p, 8).parts[0] + ' in this chapter');
assert.match(head(empty), /^Nothing recorded in this stage yet · \d+ records in this chapter$/);
assert(empty.querySelector('[data-work-starter]').disabled, 'starters wait for the stage’s first record');
pass('Work, empty stage: "Nothing recorded in this stage yet · N records in this chapter"');

// rc41 close (C2): a chapter-wide reading counts each record once. Chapter 2's quality scenarios and prioritised
// drivers are filters over its drivers, so a driver read by three kinds is still one record, and so is its confirmation.
{
  const q = structuredClone(p); q.quality.drivers.slice(0, 2).forEach(d => { d.confirmed = true; });
  const doc = settleDocument(q), drivers = doc.quality.drivers, conflicts = doc.quality.conflicts || [];
  assert.ok(drivers.length >= 3 && drivers.every(d => d.priority && (d.metric || d.targetValue != null || d.scenarioId)), 'the fixture’s drivers are read by the driver, scenario and priority kinds alike');
  const distinct = new Set([...drivers, ...conflicts].map(r => r.id)), confirmed = [...drivers, ...conflicts].filter(isConfirmed).length;
  const st = chapterRecordsState(doc, 2);
  assert.equal(st.recorded, distinct.size, 'Chapter 2 counts its distinct drivers and conflicts');
  assert.equal(st.rows.length, distinct.size); assert.equal(new Set(st.rows.map(r => r.id)).size, st.rows.length, 'no record is listed twice');
  assert.equal(confirmed, 2); assert.equal(st.confirmed, confirmed, 'a confirmed driver is confirmed once');
  assert.equal(st.parts[0], distinct.size + ' records');
  assert.equal(st.line, [distinct.size + ' records', confirmed + ' confirmed', st.fix ? st.fix + ' to fix' : '', st.confirm ? st.confirm + ' to confirm' : ''].filter(Boolean).join(' · '));
  const reading = stripReading(st);
  assert.equal(reading.ok, Math.round(100 * confirmed / distinct.size), 'the meter’s confirmed fill is a share of the distinct records');
  assert.equal(reading.open, Math.round(100 * Math.min(st.open, distinct.size) / distinct.size));
  assert.ok(st.open > 0 && st.open <= distinct.size, 'what the checks hold open is never more than the records');
  if (!conflicts.length) assert.equal(emptyStageLine(doc, 2, 'Conflicts'), 'Nothing recorded in Conflicts yet · ' + distinct.size + ' records in this chapter');
  // A stage's own line keeps its kind: the drivers' stage still counts its drivers.
  assert.equal(workStageState(doc, 2, 'intake').recorded, drivers.length);
}
pass('Chapter 2: each driver is one record on the chapter’s line, its meter and the empty stage’s line, however many kinds read it');

// rc41 close (C3): Chapter 11's passages are the SDD's sections, written from its final checks, so its chapter-wide
// reading holds those checks open: never "confirmed" while a final check fails, never "nothing recorded" and empty while
// final checks are open. Chapters 1–10 keep reading their passages per record.
{
  const blankReview = settleDocument(withFinalReview(structuredClone(createProject({name: 'Final', template: 'bank-payment'}, 'final-fixture'))));
  const C0 = chapterChecks(blankReview, 11);
  assert.ok(C0.toFix > 0 && C0.toConfirm > 0, 'the fixture’s final checks hold items to fix and to confirm');
  const none = chapterRecordsState(blankReview, 11);
  assert.equal(none.recorded, 0);
  assert.deepEqual([none.fix, none.confirm, none.state], [C0.toFix, C0.toConfirm, 'fix']);
  assert.equal(none.line, 'Nothing recorded yet · ' + C0.toFix + ' to fix · ' + C0.toConfirm + ' to confirm');
  assert.deepEqual(stripReading(none), {state: 'fix', ok: 0, open: 100, counts: 'nothing recorded yet · ' + C0.toFix + ' to fix · ' + C0.toConfirm + ' to confirm'});
  // A person frames and confirms the SDD narrative (review.narrative): one confirmed record while the final checks fail.
  const framed = withFinalReview(structuredClone(createProject({name: 'Final', template: 'bank-payment'}, 'final-fixture-2')));
  framed.finalReview.narrative = {...framed.finalReview.narrative, summary: 'What the design does', approach: 'How it does it', confirmed: true};
  const doc = settleDocument(framed), C = chapterChecks(doc, 11), st = chapterRecordsState(doc, 11);
  assert.ok(C.toFix > 0, 'final checks still to fix');
  assert.deepEqual([st.recorded, st.confirmed, st.fix, st.confirm], [1, 1, C.toFix, C.toConfirm]);
  assert.equal(st.state, 'fix', 'not "confirmed" while a final check fails');
  assert.equal(st.line, '1 record · 1 confirmed · ' + C.toFix + ' to fix · ' + C.toConfirm + ' to confirm');
  const reading = stripReading(st);
  assert.deepEqual([reading.state, reading.open], ['fix', 100]);
  assert.equal(reading.counts, 'recorded · confirmed · ' + C.toFix + ' to fix · ' + C.toConfirm + ' to confirm', 'a count above one keeps its number on a one-record reading');
  // Chapters 1–10: the open counts are the passages of the chapter's own records, as before.
  const ch5 = chapterRecordsState(p, 5), ids = new Set(ch5.rows.map(r => r.id)), own = chapterChecks(p, 5).passages.filter(x => ids.has(x.id));
  assert.deepEqual([ch5.fix, ch5.confirm], [own.filter(x => x.status === 'fix').length, own.filter(x => x.status === 'confirm').length]);
}
pass('Chapter 11: the chapter’s reading holds its final checks open (state fix, the meter’s open fill whole), with or without a record; Chapters 1–10 read their passages per record');

// An unknown section falls back to the chapter's first stage; nothing was written or sent.
assert.equal(dom(workGlanceHTML(p, 5, 'nonsense')).dataset.workGlance, '5:components');
assert.equal(workGlanceHTML(p, 12, 'components'), '');
assert.equal(JSON.stringify(p), before); assert.equal(calls, 0);
pass('Unknown stage falls back; out-of-range chapter draws nothing; no write, no provider call');

console.log(JSON.stringify({suite: 'work-glance', checks: checks.length, passed: checks}, null, 1));
await w.happyDOM?.abort?.(); w.close?.();
