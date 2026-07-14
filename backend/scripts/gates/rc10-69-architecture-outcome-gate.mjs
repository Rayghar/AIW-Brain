import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const checks = [
  ['domain contracts', 'packages/domain/src/architectureOutcomeEvaluation.ts', ['regulated-payments', 'governed-llm-aiw', 'productionAcceptanceClaimed: false']],
  ['evaluation engine', 'packages/engine/src/architectureOutcomeEvaluation.ts', ['buildArchitectureOutcomeScenarios', 'runArchitectureOutcomeBenchmark', 'humanExpertValidationCompleted: false', 'llmHasCanonicalMutationAuthority: false']],
  ['API routes', 'apps/api/src/routes/intelligenceRoutes.ts', ['/api/intelligence/outcome-evaluation/scenarios', '/api/intelligence/outcome-evaluation/run', 'TENANT_BOUNDARY_VIOLATION']],
  ['engine tests', 'packages/engine/test/rc10_69_architecture_outcome_evaluation.test.ts', ['seven reproducible scenarios', 'correctness uplift beyond deterministic authority']],
  ['API tests', 'apps/api/test/rc10_69_architecture_outcome_evaluation_api.test.ts', ['blinded expert-review pack', 'denies evaluation of a project from another tenant']],
];
let passed = 0;
for (const [label, path, tokens] of checks) {
  const source = read(path);
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label}: missing ${token}`);
    passed += 1;
  }
}
console.log(JSON.stringify({ gate: 'rc10.69-architecture-outcome', passed, status: 'passed' }, null, 2));
