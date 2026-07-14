import { readFileSync } from 'node:fs';

const files = {
  store: 'apps/web/src/store/workspaceStore.ts',
  lifecycle: 'apps/web/src/components/ArchitectureLifecycleJourney.tsx',
  cockpit: 'apps/web/src/components/ProjectCockpit.tsx',
  css: 'apps/web/src/design-system/product-experience.css',
};

function contains(file, needle) {
  const text = readFileSync(files[file], 'utf8');
  if (!text.includes(needle)) throw new Error(`${files[file]} missing required marker: ${needle}`);
}

contains('store', 'LifecycleCompletionRecord');
contains('store', 'lifecycleCompletions');
contains('store', 'completeLifecycleStep');
contains('store', 'lifecycleArtifacts');
contains('store', 'partialize: (state) =>');
contains('lifecycle', 'completeLifecycleStep({');
contains('lifecycle', 'downloadFinalSddPack');
contains('lifecycle', 'compileSolutionDeliveryPack');
contains('lifecycle', 'stage-handoff-ledger');
contains('lifecycle', 'stage-artifact-ledger');
contains('cockpit', 'cockpitJourney');
contains('cockpit', 'SDD Pack');
contains('cockpit', 'tracked artifact(s)');
contains('css', 'rc.10.46 lifecycle functionalization');

console.log('Guided lifecycle functionalization gate passed.');
