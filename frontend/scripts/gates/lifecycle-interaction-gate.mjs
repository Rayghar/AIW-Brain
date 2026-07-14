import fs from 'node:fs';

const checks = [
  ['apps/web/src/App.tsx', 'id="aiw-stage-workspace"', 'focused workspace anchor exists'],
  ['apps/web/src/App.tsx', 'advanceLifecycle', 'bottom lifecycle advance handler exists'],
  ['apps/web/src/App.tsx', 'workspace-context-strip--quiet', 'quiet context strip is used'],
  ['apps/web/src/components/ArchitectureLifecycleJourney.tsx', 'Focus workspace', 'stage action focuses workspace instead of vague open action'],
  ['apps/web/src/components/ArchitectureLifecycleJourney.tsx', 'focusWorkspace', 'lifecycle stage focus scroll logic exists'],
  ['apps/web/src/components/ArchitectureLifecycleJourney.tsx', 'window.setTimeout(focus, 180)', 're-render-safe delayed stage focus exists'],
  ['apps/web/src/components/BottomDock.tsx', 'advanceLifecycle', 'bottom dock calls lifecycle advance handler'],
  ['apps/web/src/components/ProjectCockpit.tsx', 'Continue where you left off', 'cockpit leads with continuation'],
  ['apps/web/src/components/ProjectCockpit.tsx', 'Current project', 'cockpit separates current project from portfolio'],
  ['apps/web/src/components/brain/QuietBrainSignalLayer.tsx', 'aiw-causal-pulse', 'causal brain pulse is wired'],
];

let failed = false;
for (const [file, needle, label] of checks) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(needle)) {
    console.error(`✗ ${label}: missing ${needle} in ${file}`);
    failed = true;
  } else {
    console.log(`✓ ${label}`);
  }
}
if (failed) process.exit(1);
