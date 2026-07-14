import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { architectureProjectSchema } from '../packages/domain/dist/index.js';
import { analyseArchitectureDrift, evaluateArchitecturePolicyGate, validateProject } from '../packages/engine/dist/index.js';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
async function json(path) { return JSON.parse(await readFile(resolve(path), 'utf8')); }

const projectPath = argument('--project') ?? 'data/sprint7-example-project.json';
const inventoryPath = argument('--inventory') ?? 'data/sprint7-runtime-inventory.json';
const gatePath = argument('--gate') ?? 'data/sprint7-policy-gate.json';
const libraryPath = argument('--library') ?? 'data/knowledge-library.json';

const parsed = architectureProjectSchema.safeParse(await json(projectPath));
if (!parsed.success) {
  console.error(JSON.stringify({ passed: false, error: 'INVALID_PROJECT', details: parsed.error.flatten() }, null, 2));
  process.exit(2);
}
const project = parsed.data;
const inventory = await json(inventoryPath);
const gate = await json(gatePath);
const library = await json(libraryPath);
const architectureFindings = validateProject(project, library);
const drift = analyseArchitectureDrift(project, inventory);
const result = evaluateArchitecturePolicyGate(project, gate, architectureFindings, drift);
console.log(JSON.stringify({ ...result, driftSummary: drift.summary, architectureFindings: architectureFindings.length }, null, 2));
if (!result.passed) process.exit(1);
