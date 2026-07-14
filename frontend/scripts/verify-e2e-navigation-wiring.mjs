#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('apps/web/src/App.tsx');
const router = read('apps/web/src/components/WorkspaceRouter.tsx');
const nav = read('apps/web/src/lib/workspaceNavigation.ts');
const designStages = read('apps/web/src/lib/designStages.ts');
const profiles = read('apps/web/src/lib/experienceProfiles.ts');
const projectHub = read('apps/web/src/components/ProjectHub.tsx');
const lifecycle = read('apps/web/src/components/ArchitectureLifecycleJourney.tsx');
const store = read('apps/web/src/store/workspaceStore.ts');
const failures = [];
const workspaces = ['cockpit','activation','admin','quality','portfolio','comparison','governance','collaboration','security','runtime','drift','conformance','operations','knowledge','patterns','synthesis','pilot'];
const designWorkspaceRouted = router.includes('return activeContent(project.activeStage)') && router.includes('function activeContent');
const stages = ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'];

for (const mode of workspaces) {
  if (!nav.includes(`id: "${mode}"`)) failures.push(`Workspace ${mode} is not present in the navigation catalog.`);
  if (!router.includes(`workspaceMode === "${mode}"`)) failures.push(`Workspace ${mode} is not routed in WorkspaceRouter.`);
  if (!profiles.includes(`'${mode}'`)) failures.push(`Workspace ${mode} is not exposed in any experience profile.`);
}
if (!designWorkspaceRouted) failures.push('Design workspace is not routed through activeContent(project.activeStage).');
for (const stage of stages) {
  if (!designStages.includes(`id: "${stage}"`) && !designStages.includes(`id: '${stage}'`)) failures.push(`Design stage ${stage} is missing from designStages.`);
  if (!nav.includes(`id: "${stage}"`)) failures.push(`Design stage ${stage} is missing from the navigation catalog.`);
  if (!lifecycle.includes(stage)) failures.push(`Design stage ${stage} is not referenced by ArchitectureLifecycleJourney.`);
}

const appFragments = [
  'const enterStage = (stage: ArchitectureStage)',
  'const enterWorkspace = (mode: WorkspaceModeId)',
  'document.getElementById("aiw-main")?.focus()',
  '<ShellNavRail',
  '<ShellTopbar',
  '<ArchitectureLifecycleJourney',
  '<ShellOverlays',
  '<BottomDock',
];
for (const fragment of appFragments) if (!app.includes(fragment)) failures.push(`Required shell fragment missing: ${fragment}`);
for (const fragment of ['<LocaleSwitcher />','<GuidedJourneyWorkspace />','<ProjectCockpit />','<QualityAttributeStudio />','<AdminControlPlaneWorkspace />']) {
  if (!router.includes(fragment)) failures.push(`Required routed workspace fragment missing: ${fragment}`);
}
if (!projectHub.includes('setExperienceProfile("solution-architect")')) failures.push('ProjectHub full-reference path must start in the Solution Architect journey.');
if (!projectHub.includes('setActiveStage("designIntent")')) failures.push('ProjectHub must seed the Requirements & Intent stage.');
if (!store.includes("state.workspaceMode = 'design';") || !store.includes('setActiveStage: (stage)')) failures.push('setActiveStage must force workspaceMode back to design.');
if (failures.length) {
  console.error('End-to-end navigation wiring verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`End-to-end navigation wiring passed: ${workspaces.length} workspaces and ${stages.length} lifecycle stages are catalogued, routed, profile-visible, and stage-focused.`);
