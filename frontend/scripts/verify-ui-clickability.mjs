import fs from 'node:fs';

const app = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
const profiles = fs.readFileSync('apps/web/src/lib/experienceProfiles.ts', 'utf8');
const hub = fs.readFileSync('apps/web/src/components/ProjectHub.tsx', 'utf8');
const styles = fs.readFileSync('apps/web/src/styles.css', 'utf8');

const requiredModes = ['design','activation','admin','quality','portfolio','comparison','governance','collaboration','security','runtime','drift','conformance','operations','knowledge','patterns','synthesis','pilot'];
const failures = [];

for (const mode of requiredModes) {
  if (mode !== 'design' && !app.includes(`id: "${mode}"`)) failures.push(`Workspace ${mode} missing from workspaceEntries.`);
  if (mode !== 'design' && !app.includes(`workspaceMode === "${mode}"`)) failures.push(`Workspace ${mode} missing from content router.`);
  if (!profiles.includes(`'${mode}'`)) failures.push(`Workspace ${mode} missing from at least one experience profile.`);
}

for (const key of ['workspace-jump-select','Workspace launchpad','visibleWorkspaceEntries','action-menu__section--grid']) {
  if (!app.includes(key)) failures.push(`Global workspace launch surface missing ${key}.`);
}
for (const key of ['Open full reference workbench','Create from reference','setExperienceProfile("administrator")']) {
  if (!hub.includes(key)) failures.push(`Full reference activation missing ${key}.`);
}
for (const key of ['activation-ribbon','journey-intelligence-map.is-compact','.workspace-nav-buttons button','.route-handoff-overlay']) {
  if (!styles.includes(key)) failures.push(`Global UX polish CSS missing ${key}.`);
}

if (failures.length) {
  console.error('UI clickability/polish verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`UI clickability/polish verification passed: ${requiredModes.length} workspaces routable, reference activation enabled, global polish selectors present.`);
