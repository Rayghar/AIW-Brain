import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>readFile(path.join(root,p),'utf8');
const pkg=JSON.parse(await read('package.json'));
const task=await read('apps/web/src/components/TaskWorkspaceFrame.tsx');
const shell=await read('apps/web/src/components/GuidedDeliveryShell.tsx');
const store=await read('apps/web/src/store/workspaceStore.ts');
const pattern=await read('apps/web/src/components/PatternIntelligenceWorkspace.tsx');
const synthesis=await read('apps/web/src/components/ArchitectureSynthesisWorkspace.tsx');
const admin=await read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');
const canvas=await read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx');
const reviewer=await read('apps/web/src/components/ReviewerAssuranceStudio.tsx');
const portfolio=await read('apps/web/src/components/PortfolioWorkspace.tsx');
const main=await read('apps/web/src/main.tsx');
const css=await read('apps/web/src/styles/rc10_65_1_journey_remediation.css');
const checks=[
 ['frontend version',pkg.version==='0.10.0-rc.10.65.1'],
 ['compact task contract',task.includes('task-workspace-frame__contract-expanded') && !task.includes('task-workspace-frame__left-rail')],
 ['lifecycle drawer collapsed by default',shell.includes('useState(true)') && shell.includes('guided-delivery__rail-backdrop')],
 ['read-only autosave capability guard',store.includes("can(state.experienceProfile, 'architecture.write')") && store.includes('clearTimeout(autosaveTimer)')],
 ['stage-aware design composition',pattern.includes("record.category === 'governance'") && pattern.includes('effectiveStage')],
 ['truthful synthesis baseline',synthesis.includes('modelBaseline') && synthesis.includes('Exploratory generation')],
 ['Pattern DNA search and pagination',admin.includes('patternPage') && admin.includes('patternQuery')],
 ['actionable empty canvas',canvas.includes('canvas-start-state') && canvas.includes('Compose from patterns')],
 ['reviewer task differentiation',reviewer.includes('taskFocus') && reviewer.includes("taskFocus !== 'findings'") && reviewer.includes("taskFocus !== 'disposition'")],
 ['enterprise task differentiation',portfolio.includes("taskFocus === 'reuse'") && portfolio.includes('portfolio-reuse-focus')],
 ['remediation style imported',main.includes('rc10_65_1_journey_remediation.css')],
 ['canvas-first containment styles',css.includes('.guided-delivery-workarea .canvas-toolbar') && css.includes('.canvas-start-state')],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`rc.10.65.1 frontend remediation gate: ${checks.length}/${checks.length} passed`);
