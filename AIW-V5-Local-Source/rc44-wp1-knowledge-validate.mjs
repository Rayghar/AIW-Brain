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
//   node rc44-wp1-knowledge-validate.mjs                   every delivered case
//   node rc44-wp1-knowledge-validate.mjs --all             the pending cases too
//   node rc44-wp1-knowledge-validate.mjs --only S1.5       the cases whose name holds the text
//   node rc44-wp1-knowledge-validate.mjs --print-baseline  what an old document reads as (S1.8), as JSON
// Synthetic fixtures only; no provider is called. Run: npm run test:rc44-wp1-knowledge
const FILES = ['./rc44-wp1-cases-forms.mjs', './rc44-wp1-cases-crosswalk.mjs', './rc44-wp1-cases-pins.mjs', './rc44-wp1-cases-intake.mjs', './rc44-wp1-cases-isolation.mjs'];
const args = process.argv.slice(2), all = args.includes('--all') || process.env.AIW_RC44_WP1_ALL === '1', only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
if (args.includes('--print-baseline')) { console.log(JSON.stringify((await import(FILES[0])).oldDocumentReadings())); process.exit(0); }
const passed = [], failed = [], pending = [];
for (const file of FILES) {
  const {cases} = await import(file);
  for (const c of cases) {
    if (only && !c.name.includes(only)) continue;
    if (c.pending && !all) { pending.push(c.name); console.log('PENDING', c.name); continue; }
    try { await c.run(); passed.push(c.name); console.log('PASS', c.name); }
    catch (e) { const line = String(e?.message || e).split('\n')[0].slice(0, 600); failed.push({name: c.name, error: line}); console.log('FAIL', c.name, '\n   ', line); }
  }
}
console.log(JSON.stringify({suite: 'rc44-wp1-knowledge', passed: passed.length, failed: failed.length, pending: pending.length, failures: failed}));
if (failed.length) process.exit(1);
console.log('PASS rc44 wp1 knowledge: ' + passed.length + ' cases' + (pending.length ? '; ' + pending.length + ' pending for the slices not built yet' : '') + '. Synthetic fixtures only; nothing here is knowledge.');
