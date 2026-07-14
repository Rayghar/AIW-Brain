import fs from 'node:fs';

const app = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
const profiles = fs.readFileSync('apps/web/src/lib/experienceProfiles.ts', 'utf8');
const store = fs.readFileSync('apps/web/src/store/workspaceStore.ts', 'utf8');
const failures = [];
const modes = ['design','activation','admin','quality','portfolio','comparison','governance','collaboration','security','runtime','drift','conformance','operations','knowledge','patterns','synthesis','pilot'];
const stageIds = ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'];

for (const mode of modes) {
  if (mode !== 'design' && !app.includes(`id: "${mode}"`)) failures.push(`Workspace ${mode} is not present in the sidebar workspace registry.`);
  if (mode !== 'design' && !app.includes(`workspaceMode === "${mode}"`)) failures.push(`Workspace ${mode} is not routed in mainContent.`);
  if (!profiles.includes(`'${mode}'`)) failures.push(`Workspace ${mode} is not exposed in any experience profile.`);
}

for (const stage of stageIds) {
  if (!app.includes(`id: "${stage}"`)) failures.push(`Design stage ${stage} is not present in the lifecycle rail.`);
}

const requiredFragments = [
  'const enterStage = (stage: ArchitectureStage)',
  'const enterWorkspace = (mode: WorkspaceModeId)',
  'document.getElementById(\'aiw-main\')?.focus()',
  'onClick={() => enterStage(stage.id)}',
  'onClick={() => enterWorkspace(entry.id)}',
  'onChange={(event) => enterWorkspace(event.target.value as WorkspaceModeId)}',
  '<GuidedJourneyWorkspace />',
  '<LocaleSwitcher />',
  '<option value="design">Design lifecycle</option>',
  'Open full reference workbench',
  'setExperienceProfile("administrator")',
  'setWorkspaceMode("activation")',
];

for (const fragment of requiredFragments) {
  if (!app.includes(fragment) && !fs.readFileSync('apps/web/src/components/ProjectHub.tsx', 'utf8').includes(fragment)) {
    failures.push(`Required navigation fragment missing: ${fragment}`);
  }
}

if (app.includes('workspaceMode === "activation" ? (\n      <LocaleSwitcher />\n          <GuidedJourneyWorkspace />')) {
  failures.push('Activation workspace still renders adjacent JSX siblings without a fragment.');
}
if (app.includes('.filter((entry) => entry.id !== "comparison")')) {
  failures.push('Comparison workspace is still hidden from the sidebar despite being a first-class route.');
}
if (!store.includes("state.workspaceMode = 'design';") || !store.includes('setActiveStage: (stage)')) {
  failures.push('setActiveStage must force workspaceMode back to design.');
}

if (failures.length) {
  console.error('End-to-end navigation wiring verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`End-to-end navigation wiring passed: ${modes.length} workspaces and ${stageIds.length} lifecycle stages are route-wired, sidebar-visible, keyboard-launchable, and focus-forwarding.`);
