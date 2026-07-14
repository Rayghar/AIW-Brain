import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const checks = [
  ['Evaluation Lab', 'apps/web/src/components/PilotEvaluationWorkspace.tsx', ['Seven scenarios. Three modes. One independent review protocol.', 'Outcome overview', 'Mode comparison', 'Expert review pack', 'Navigation & UX', 'Pilot readiness']],
  ['role navigation', 'apps/web/src/lib/roleNavigation.ts', ['Evaluation Lab', 'enterprise-architect', 'knowledge-curator']],
  ['responsive shell', 'apps/web/src/App.tsx', ['aiw.roleRail.expanded.rc10_69', 'role-rail-backdrop', 'window.innerWidth < 1440']],
  ['rail focus', 'apps/web/src/components/ShellNavRail.tsx', ['document.getElementById("aiw-main")?.focus', 'event.key === "Escape"']],
  ['rail backdrop', 'apps/web/src/App.tsx', ['aria-label="Close role navigation"', 'role-rail-backdrop']],
  ['responsive CSS', 'apps/web/src/styles/rc10_69_outcome_lab.css', ['@media (max-width: 1439px)', '.role-rail-backdrop', 'grid-template-columns: 68px minmax(0,1fr)']],
  ['honesty boundary', 'packages/engine/src/architectureOutcomeEvaluation.ts', ['humanExpertValidationCompleted: false', 'conventionalBaselineMeasuredWithHumanParticipants: false', 'productionAcceptanceClaimed: false']],
];
let passed = 0;
for (const [label, path, tokens] of checks) {
  const source = read(path);
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label}: missing ${token}`);
    passed += 1;
  }
}
const ui = read('apps/web/src/components/PilotEvaluationWorkspace.tsx');
if (/rc\.10\.69 · Architecture intelligence proof/.test(ui)) throw new Error('User-facing internal release label remains in the Evaluation Lab');
console.log(JSON.stringify({ gate: 'rc10.69-outcome-lab', passed, status: 'passed' }, null, 2));
