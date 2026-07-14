import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const targets=[
  ['packages/engine/src/recommendationCalibration.ts', ['CAL-HIGH-REGULATORY-DISTRIBUTED','CAL-LOW-CHANGE-READINESS-AUTONOMY','CAL-HIGH-REVERSIBILITY-PROVIDER-DEPENDENCE','CAL-CENTRAL-OPS-HIGH-OVERHEAD','CAL-COEXISTENCE-COARSE-BOUNDARIES']],
  ['packages/engine/src/intelligenceEvaluation.ts', ['BENCH-REGULATED-DISTRIBUTION','BENCH-ORGANISATIONAL-FEASIBILITY','BENCH-OPERATING-MODEL','BENCH-TRANSITION-ARCHITECTURE','BENCH-REVERSIBILITY']],
  ['packages/engine/test/intelligenceEvaluation.test.ts', ['toBeGreaterThanOrEqual(12)']],
];
const failures=[];
for (const [file,patterns] of targets) {
  const content=fs.readFileSync(path.join(root,file),'utf8');
  for (const pattern of patterns) if (!content.includes(pattern)) failures.push(`${file} missing ${pattern}`);
}
if (failures.length) { console.error('rc.10.50 intelligence depth gate failed:\n'+failures.map(x=>` - ${x}`).join('\n')); process.exit(1); }
console.log('rc.10.50 intelligence depth gate passed: transitional, organisational, regulatory, operating-model and reversibility scenarios are present.');
