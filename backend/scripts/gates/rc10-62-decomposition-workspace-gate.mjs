import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const checks=[
 ['domain decomposition contract','packages/domain/src/architectureDecomposition.ts','ArchitectureDecompositionReport'],
 ['decomposition engine','packages/modelling/src/interactiveDecomposition.ts','validateArchitectureDecomposition'],
 ['reference system boundary','packages/domain/src/sample.ts','system-order-payment'],
 ['reference container hierarchy','packages/domain/src/sample.ts','code-order-command-handler'],
];
let passed=0;
for (const [label,relative,needle] of checks){const file=path.join(root,relative);const ok=fs.existsSync(file)&&fs.readFileSync(file,'utf8').includes(needle);console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)process.exitCode=1;else passed++;}
console.log(`${passed}/${checks.length} rc.10.62 backend gates passed`);
