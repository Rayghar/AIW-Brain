// rc44, work package 1 (versioned, usable knowledge; audit/rc44/design/wp1-knowledge.md). This runner only imports the
// case files and runs them, one file per slice, so slices built in parallel never edit the same lines:
//   S1 forms and the concept register      rc44-wp1-cases-forms.mjs
//   S2 crosswalk and one identity          rc44-wp1-cases-crosswalk.mjs
//   S3 releases with parts, pins, currency rc44-wp1-cases-pins.mjs
//   S4 intake, topic register, coverage    rc44-wp1-cases-intake.mjs
//   S5 the concept view (node isolation)   rc44-wp1-cases-isolation.mjs
// A slice that is not built yet holds one pending case, "not yet implemented". A pending case is listed and does not
// fail the run, so the suite is green for what is delivered; `--all` (or AIW_RC44_WP1_ALL=1) runs the pending cases too,
// and they fail until their slice replaces them.
// A run that executed no case fails, and so does a case file that exports no case: a filter that matches nothing, or a
// file that lost its cases, is never reported as a pass.
//   node rc44-wp1-knowledge-validate.mjs                   every delivered case
//   node rc44-wp1-knowledge-validate.mjs --all             the pending cases too
//   node rc44-wp1-knowledge-validate.mjs --only S1.5       the cases whose name holds the text
//   node rc44-wp1-knowledge-validate.mjs --files a.mjs,b.mjs  these case files instead of the five
//   node rc44-wp1-knowledge-validate.mjs --print-baseline  what an old document reads as (S1.8), as JSON
// Synthetic fixtures only; no provider is called. Run: npm run test:rc44-wp1-knowledge
const ALL_FILES = ['./rc44-wp1-cases-forms.mjs', './rc44-wp1-cases-crosswalk.mjs', './rc44-wp1-cases-pins.mjs', './rc44-wp1-cases-intake.mjs', './rc44-wp1-cases-isolation.mjs'];
const args = process.argv.slice(2), value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] || '' : '', all = args.includes('--all') || process.env.AIW_RC44_WP1_ALL === '1', only = value('--only');
const FILES = args.includes('--files') ? value('--files').split(',').map(f => f.trim()).filter(Boolean) : ALL_FILES;
if (args.includes('--print-baseline')) { console.log(JSON.stringify((await import(ALL_FILES[0])).oldDocumentReadings())); process.exit(0); }
const passed = [], failed = [], pending = [];
for (const file of FILES) {
  const {cases} = await import(file);
  if (!Array.isArray(cases) || !cases.length) { failed.push({name: file, error: 'The case file exports no case.'}); console.log('FAIL', file, '\n    The case file exports no case.'); continue; }
  for (const c of cases) {
    if (only && !c.name.includes(only)) continue;
    if (c.pending && !all) { pending.push(c.name); console.log('PENDING', c.name); continue; }
    try { await c.run(); passed.push(c.name); console.log('PASS', c.name); }
    catch (e) { const line = String(e?.message || e).split('\n')[0].slice(0, 600); failed.push({name: c.name, error: line}); console.log('FAIL', c.name, '\n   ', line); }
  }
}
if (!FILES.length) failed.push({name: '--files', error: 'No case file was named.'});
if (!passed.length && !failed.length) failed.push({name: only ? '--only ' + only : 'the run', error: 'No case was executed' + (pending.length ? ' (' + pending.length + ' pending).' : '.') + ' A run that executes nothing is not a pass.'});
console.log(JSON.stringify({suite: 'rc44-wp1-knowledge', passed: passed.length, failed: failed.length, pending: pending.length, failures: failed}));
if (failed.length) { for (const f of failed.filter(f => /^No case/.test(f.error))) console.log('FAIL', f.name, '\n   ', f.error); process.exit(1); }
console.log('PASS rc44 wp1 knowledge: ' + passed.length + ' cases' + (pending.length ? '; ' + pending.length + ' pending for the slices not built yet' : '') + '. Synthetic fixtures only; nothing here is knowledge.');
