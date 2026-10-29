// `npm run check` lint step (audit F2-20): ESLint with eslint.config.js (no-unused-vars, no-empty and a local
// rule that names a static import cycle in public/) over the whole tree, held by a ratchet. The violations
// that existed when the rules were introduced are recorded per file and rule in scripts/lint-baseline.json;
// the step fails when any file has more of a rule than its baseline row (or a row it does not have), and it
// says which rows can be lowered. Nothing is auto-fixed and the baseline never grows by itself: lowering it
// is `node scripts/lint.mjs --ratchet` (rows only go down), and a deliberate raise is an edit to the JSON
// that a reviewer sees.
//   node scripts/lint.mjs                 every problem, then the ratchet verdict
//   node scripts/lint.mjs --summary       counts and the verdict only
//   node scripts/lint.mjs a.js b.js       those files, with no baseline allowance (for files that must be clean)
//   node scripts/lint.mjs --ratchet       lower baseline rows to the current counts
// ESLint is the pinned devDependency (node_modules/eslint); when it is missing the step fails and says so.
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const summary = args.includes('--summary'), ratchet = args.includes('--ratchet'), writeBaseline = args.includes('--write-baseline');
const files = args.filter((a) => !a.startsWith('--'));
const baselineFile = path.join(root, 'scripts', 'lint-baseline.json');
const eslint = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
if (!existsSync(eslint)) { console.error('ESLint is not installed: run `npm ci` (devDependency eslint).'); process.exit(2); }
const result = spawnSync(process.execPath, [eslint, '--config', 'eslint.config.js', '--format', 'json', '--no-error-on-unmatched-pattern', ...(files.length ? files : ['.'])], {cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024});
let report;
try { report = JSON.parse(result.stdout); } catch { console.error((result.stdout || '').slice(0, 2000) + (result.stderr || '').slice(0, 2000)); process.exit(2); }
const counts = {}, rules = {}; let problems = 0;
for (const f of report) {
  const file = path.relative(root, f.filePath).split(path.sep).join('/');
  for (const m of f.messages) {
    const rule = m.ruleId || 'parse';
    if (!summary) console.log(`${file}:${m.line}:${m.column} ${rule} ${m.message}`);
    ((counts[file] ||= {})[rule] = (counts[file]?.[rule] || 0) + 1); rules[rule] = (rules[rule] || 0) + 1; problems++;
  }
}
const sortObject = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
if (writeBaseline) { writeFileSync(baselineFile, JSON.stringify(sortObject(counts), null, 1) + '\n'); console.log(`baseline written: ${problems} problems in ${Object.keys(counts).length} files`); process.exit(0); }
// Named files are checked strictly; the whole tree is checked against the baseline.
const baseline = files.length ? {} : JSON.parse(readFileSync(baselineFile, 'utf8'));
const growth = [], lower = [];
for (const [file, byRule] of Object.entries(counts)) for (const [rule, n] of Object.entries(byRule)) { const allowed = baseline[file]?.[rule] || 0; if (n > allowed) growth.push(`${file} ${rule}: ${n} (baseline ${allowed})`); }
for (const [file, byRule] of Object.entries(baseline)) for (const [rule, allowed] of Object.entries(byRule)) { const n = counts[file]?.[rule] || 0; if (n < allowed) lower.push({file, rule, n, allowed}); }
if (ratchet && lower.length) {
  for (const {file, rule, n} of lower) { if (n) baseline[file][rule] = n; else delete baseline[file][rule]; if (!Object.keys(baseline[file]).length) delete baseline[file]; }
  writeFileSync(baselineFile, JSON.stringify(sortObject(baseline), null, 1) + '\n');
}
const allowedTotal = Object.values(baseline).reduce((n, r) => n + Object.values(r).reduce((a, b) => a + b, 0), 0);
console.log(JSON.stringify({files: report.length, problems, rules, baseline: files.length ? 0 : allowedTotal, new: growth.length, lowerable: ratchet ? 0 : lower.length}));
if (growth.length) console.error('New lint problems (fix them; the baseline only goes down):\n- ' + growth.join('\n- '));
if (lower.length && !ratchet) console.log(`${lower.length} baseline rows are above the current counts; run \`node scripts/lint.mjs --ratchet\` to lower them.`);
process.exit(growth.length ? 1 : 0);
