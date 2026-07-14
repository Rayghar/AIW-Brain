import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), 'utf8');
const [app, shell, sdd, deliveryFacade, deliveryTypes, deliveryStages, deliveryAssessment, lifecycle, review, canvas, css, hub, context, brief, quality, store] = await Promise.all([
  read('apps/web/src/App.tsx'),
  read('apps/web/src/components/GuidedDeliveryShell.tsx'),
  read('apps/web/src/components/guided-delivery/SddDeliveryWorkspace.tsx'),
  read('apps/web/src/lib/guidedDelivery.ts'),
  read('apps/web/src/lib/guidedDeliveryTypes.ts'),
  read('apps/web/src/lib/guidedDeliveryStages.ts'),
  read('apps/web/src/lib/guidedDeliveryAssessment.ts'),
  read('apps/web/src/store/actions/lifecycleFlow.ts'),
  read('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx'),
  read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx'),
  read('apps/web/src/design-system/guided-delivery.css'),
  read('apps/web/src/components/ProjectHub.tsx'),
  read('apps/web/src/lib/guidedDeliveryContext.tsx'),
  read('apps/web/src/components/DesignBriefStudio.tsx'),
  read('apps/web/src/components/QualityAttributeStudio.tsx'),
  read('apps/web/src/store/workspaceStore.ts'),
]);
const delivery = [deliveryFacade, deliveryTypes, deliveryStages, deliveryAssessment].join('\n');

const checks = [
  ['one guided delivery shell is mounted for design and quality', app.includes('workspaceMode === "design" || workspaceMode === "quality"') && app.includes('<GuidedDeliveryShell')],
  ['competing journey chrome is retired inside guided delivery', app.includes('!focusMode && !isGuidedDelivery') && app.includes('!isGuidedDelivery ? <BottomDock')],
  ['new projects start at Requirements', hub.includes('setActiveLifecycleStep("requirements")') && hub.includes('setActiveStage("designIntent")')],
  ['eight authoritative delivery stages exist', (delivery.match(/index:\s*[1-8],/g) ?? []).length === 8],
  ['stage tasks map to explicit validation checks', delivery.includes('checkIds: string[]') && (delivery.match(/checkIds:\s*\[/g) ?? []).length >= 32],
  ['quality scenarios require all six fields', delivery.includes('scenario.source') && delivery.includes('scenario.responseMeasure') && delivery.includes('completeScenarios.length === project.qualityScenarios.length')],
  ['scenario classification mismatch blocks completion', delivery.includes('scenarioCategoryLooksWrong') && delivery.includes('mismatches.length === 0')],
  ['pattern obligations block logical handoff', delivery.includes('Accepted pattern obligations are acknowledged')],
  ['realization lineage, contracts, owners and runtime are gated', ['Every realization object traces upstream','Interfaces and contracts are defined','Every deployable unit has an owner','Runtime intention is specified'].every((text) => delivery.includes(text))],
  ['physical redundancy requires explicit failure domains', delivery.includes('zones.length >= 2') && delivery.includes('Do not claim multi-zone resilience')],
  ['review findings and scorecard persist to canonical project', lifecycle.includes('recordArchitectureReview') && lifecycle.includes('state.project.findings.push') && lifecycle.includes('state.project.aiReviewHistory')],
  ['review assignment and independent disposition are visible', review.includes('Assign independent review') && review.includes('Complete assigned review') && review.includes('Submit immutable baseline for approval')],
  ['final SDD is gated by approved review', delivery.includes('Review baseline is approved') && sdd.includes('assessment.blockers.length > 0')],
  ['recommended checks do not become false completion blockers', lifecycle.includes('item.required !== false')],
  ['failed lifecycle completion does not create a snapshot', lifecycle.indexOf('if (blockerCount > 0)') < lifecycle.indexOf('state.snapshots.unshift(snapshot)')],
  ['canvas opens in focus-first mode', canvas.includes('useState(false)') && canvas.includes('libraryOpen')],
  ['guided design visual system is loaded', css.includes('--sol-teal') && css.includes('.guided-stage-footer') && css.includes('.guided-task-grid')],

  ['task context binds each work area to one current task', context.includes('GuidedDeliveryTaskProvider') && shell.includes('<GuidedDeliveryTaskProvider value={{ stageId, taskId: activeTaskId }}>')],
  ['requirements authoring is task-focused', brief.includes('guided-brief--${guidedTaskId}') && css.includes('.guided-brief--scope .brief-field--scope') && css.includes('.guided-brief--constraints .brief-field--constraints')],
  ['quality authoring is task-focused', quality.includes('guided-quality--${guidedTaskId}') && css.includes('.guided-quality--scenarios .quality-scenario-section') && css.includes('.guided-quality--tradeoffs .quality-layout')],
  ['guided delivery hides the competing work-mode strip', css.includes('.app-shell.guided-delivery-active .topbar-flow-menu') && css.includes('display: none !important')],
  ['save idempotency is bound to the complete request payload', store.includes('const savePayload = { project: state.project, expectedRevision: state.lastSavedRevision ?? undefined }') && store.includes('const requestFingerprint = hashContent(savePayload)')],
  ['stage controls remain in document flow and cannot cover work', css.includes('Keep stage controls in the document flow') && css.includes('.guided-stage-footer {\n  position: sticky !important') && css.includes('.guided-delivery-message {\n  position: sticky !important')],
];

let failed = 0;
for (const [label, passed] of checks) {
  if (passed) console.log(`PASS ${label}`);
  else { console.error(`FAIL ${label}`); failed += 1; }
}
if (failed) process.exit(1);
console.log(`rc.10.52 guided delivery gate passed (${checks.length}/${checks.length}).`);
