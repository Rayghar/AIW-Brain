// The DOM suites again, on the variants their defaults do not cover: the guided design task on Chapters 5–7
// and on a blank project, the exchange and protection tasks on a blank project, and the workbench on
// Chapters 2, 3, 4 and 11. Each variant runs in its own process, four at a time.
// Needs happy-dom (a pinned development dependency). Run: npm run test:ui-variants
import {spawn} from 'node:child_process';

const variants = [
  ['design-task-ui-validate.mjs', [], {AIW_CHAPTER: '5'}],
  ['design-task-ui-validate.mjs', [], {AIW_CHAPTER: '6'}],
  ['design-task-ui-validate.mjs', [], {AIW_CHAPTER: '7'}],
  ['design-task-ui-validate.mjs', [], {AIW_BLANK: '1'}],
  ['exchange-task-ui-validate.mjs', [], {AIW_BLANK: '1'}],
  ['security-task-ui-validate.mjs', [], {AIW_BLANK: '1'}],
  ...['2', '3', '4', '11'].map((chapter) => ['workbench-ui-validate.mjs', [chapter], {}]),
];
const run = ([file, args, env]) => new Promise((resolve) => {
  const child = spawn(process.execPath, [file, ...args], {env: {...process.env, ...env}, stdio: ['ignore', 'pipe', 'pipe']});
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });
  child.on('exit', (code) => resolve({name: [file, ...args, ...Object.entries(env).map(([k, v]) => `${k}=${v}`)].join(' '), passed: code === 0, output}));
});
const results = [], queue = [...variants];
await Promise.all(Array.from({length: 4}, async () => { while (queue.length) results.push(await run(queue.shift())); }));
const failed = results.filter((r) => !r.passed);
for (const f of failed) console.error(`FAIL ${f.name}\n${f.output.split('\n').filter((l) => /Error|at file/.test(l)).slice(0, 6).join('\n')}`);
console.log(JSON.stringify({passed: results.filter((r) => r.passed).map((r) => r.name), failed: failed.map((r) => r.name)}, null, 2));
if (failed.length) process.exitCode = 1;
