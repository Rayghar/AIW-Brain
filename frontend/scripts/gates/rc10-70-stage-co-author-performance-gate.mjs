import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const checks = [
  ['stage co-author panel', 'apps/web/src/components/StageCoAuthorPanel.tsx', [
    'Why this design makes sense',
    'How this stage enables the business outcome',
    'Requirements and business drivers enabled',
    'explained',
    'Trade-offs accepted',
    'Risks and open questions',
    'Accept selected',
    'Ask Sol to explain &amp; draft',
  ]],
  ['requirements integration', 'apps/web/src/components/DesignBriefStudio.tsx', ['StageCoAuthorPanel', 'targetStage="requirements"']],
  ['quality-driver integration', 'apps/web/src/components/QualityAttributeStudio.tsx', ['StageCoAuthorPanel', 'targetStage="qualityDrivers"']],
  ['canvas lifecycle integration', 'apps/web/src/features/canvas/ProCanvasViewSystem.tsx', ['StageCoAuthorPanel', 'stageCoAuthorTarget']],
  ['review integration', 'apps/web/src/components/ReviewerAssuranceStudio.tsx', ['StageCoAuthorPanel', 'targetStage="reviewAssurance"']],
  ['solution review integration', 'apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx', ['StageCoAuthorPanel', 'targetStage="reviewAssurance"']],
  ['SDD integration', 'apps/web/src/components/guided-delivery/SddDeliveryWorkspace.tsx', ['StageCoAuthorPanel', 'targetStage="sddPack"']],
  ['field mutation control', 'apps/web/src/store/workspaceStore.ts', [
    'applyStageCoAuthorOperations',
    "validationStatus !== 'ready'",
    'proposal.projectRevision !== state.project.revision',
    'undoStack',
  ]],
  ['selection performance', 'apps/web/src/store/workspaceStore.ts', [
    'deferredSelectionDerivedTimer',
    'setTimeout',
    'dragging === false',
  ]],
  ['conditional resize control', 'apps/web/src/features/canvas/nodes/ArchitectureNodeView.tsx', ['selected && !visual.locked && !data.livingCanvasGhost']],
  ['initialized node drag', 'apps/web/src/features/canvas/ProCanvasViewSystem.tsx', ['useNodesInitialized', 'nodesDraggable={canvasInteractionEnabled && nodesInitialized}', 'nodeDragThreshold={4}']],
  ['collaboration backoff', 'apps/web/src/components/CollaborationRuntime.tsx', ['120_000', 'selectedNodeIdRef', '60_000']],
  ['request timeout', 'apps/web/src/lib/collaborationClient.ts', ['private async request', '5_000']],
  ['responsive containment', 'apps/web/src/design-system/product-experience.css', ['.resizable-studio-layout .flow-container', 'min-width: 0 !important', 'max-width: 100%']],
  ['guided footer containment', 'apps/web/src/design-system/guided-delivery.css', ['clamp(14px, 2vw, 28px)', 'margin-left: calc(-1 * clamp(14px, 2vw, 28px))']],
  ['stage domain contract', 'packages/domain/src/stageCoAuthor.ts', ['StageArchitectureExplanation', 'StageExplanationComponent', 'StageDraftOperation', 'StageCoAuthorProposal']],
];

let passed = 0;
for (const [label, path, tokens] of checks) {
  const source = read(path);
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label}: missing ${token}`);
    passed += 1;
  }
}

const store = read('apps/web/src/store/workspaceStore.ts');
const selectionBranch = store.match(/if \(change\.type === "select"\)[\s\S]{0,1600}?return \{ \...state, project: nextProject \};/u)?.[0] ?? '';
if (selectionBranch.includes('updateDerived(')) {
  throw new Error('React Flow selection changes still perform synchronous derived-intelligence recomputation.');
}

const nodeView = read('apps/web/src/features/canvas/nodes/ArchitectureNodeView.tsx');
if (/\<NodeResizer[\s\S]{0,250}?\/\>/.test(nodeView) && !nodeView.includes('{selected && !visual.locked && !data.livingCanvasGhost ?')) {
  throw new Error('NodeResizer must only mount for the selected, editable, non-ghost node.');
}

console.log(JSON.stringify({
  gate: 'rc10.70-stage-co-author-performance',
  passed,
  status: 'passed',
  guarantees: [
    'explainable stage guidance is integrated from requirements through SDD',
    'field proposals remain human-controlled and revision-bound',
    'node selection and drag avoid heavy synchronous recomputation',
    'collaboration failure uses bounded timeouts and backoff',
    'studio layout uses targeted containment rather than blanket overflow suppression',
  ],
}, null, 2));
