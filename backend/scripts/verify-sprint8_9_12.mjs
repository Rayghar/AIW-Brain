import { readFileSync, existsSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${message}`);
  }
}

const specialist = existsSync('apps/web/src/components/StudioSpecialistSurfaces.tsx') ? readFileSync('apps/web/src/components/StudioSpecialistSurfaces.tsx', 'utf8') : '';
const knowledge = readFileSync('apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx', 'utf8');
const admin = readFileSync('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'utf8');
const patterns = readFileSync('apps/web/src/components/PatternIntelligenceWorkspace.tsx', 'utf8');
const review = readFileSync('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx', 'utf8');
const canvas = readFileSync('apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'utf8');
const styles = readFileSync('apps/web/src/styles.css', 'utf8');

assert(specialist.includes('StudioPipelineBoard') && specialist.includes('StudioOperatorChecklist'), 'shared specialist studio primitives exist');
assert(knowledge.includes('Source → quarantine → review → release activation') && knowledge.includes('Today’s knowledge reviewer path'), 'Knowledge Ops has a governed pipeline and reviewer path');
assert(admin.includes('Control-plane operating model') && admin.includes('Admin launch checklist'), 'Admin Control Plane has operator cockpit guidance');
assert(patterns.includes('Pattern marketplace and applicability board') && patterns.includes('Pattern selection path'), 'Pattern intelligence has marketplace/applicability UX');
assert(review.includes('Evidence → risks → decisions → fitness tests → handoff') && review.includes('Executive review summary'), 'Review Studio has executive decision pipeline');
assert(canvas.includes('canvas-model-tree-board') && canvas.includes('Selection inspector depth'), 'Canvas has model tree and inspector-depth guidance');
assert(styles.includes('.studio-pipeline-board') && styles.includes('.studio-operator-card') && styles.includes('.canvas-model-tree-board'), 'specialist workspace styles are present');
assert(styles.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'), 'pipeline board supports multi-step studio layout');

if (process.exitCode) process.exit(process.exitCode);
console.log('Sprint 8.9.12 Specialist Workspace Experience Polish gate passed.');
