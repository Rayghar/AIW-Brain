import { readFileSync } from 'node:fs';

const checks = [];
function file(path) { return readFileSync(path, 'utf8'); }
function check(name, condition) {
  checks.push({ name, condition });
  if (!condition) console.error(`FAIL ${name}`);
}

const overlays = file('apps/web/src/components/ShellOverlays.tsx');
const tour = file('apps/web/src/components/FirstRunTour.tsx');
const review = file('apps/web/src/components/ReviewWorkspace.tsx');
const synthesis = file('apps/web/src/components/ArchitectureSynthesisWorkspace.tsx');
const css = file('apps/web/src/design-system/product-experience.css');

check('capability map has lane-only action strip', overlays.includes('capability-map-lane-actions') && overlays.includes('Show only'));
check('capability map has lane focus helper', overlays.includes('focusCapabilityLane') && overlays.includes('resetCapabilityFilters'));
check('capability lanes have actionable headers', overlays.includes('capability-lane__actions') && overlays.includes('laneDescriptions'));
check('tour has action labels', tour.includes('actionLabel') && tour.includes('runStepAction'));
check('tour can open brain menu action', tour.includes("step.id === \"brain\"") && tour.includes('HTMLDetailsElement'));
check('tour action feedback is visible', tour.includes('first-run-tour__action-message') && css.includes('first-run-tour__action-message'));
check('review artifacts are deferred', review.includes('artifact-section--deferred') && review.includes("await import('@aiw/artifacts')"));
check('synthesis package import is deferred', synthesis.includes('artifactPackageBusy') && synthesis.includes('await import("@aiw/artifacts")'));
check('no static artifacts runtime import in synthesis/review', !synthesis.includes('from "@aiw/artifacts"') && !review.includes("from '@aiw/artifacts';"));
check('lane action styles exist', css.includes('.capability-map-lane-actions') && css.includes('.capability-lane__header'));

const failed = checks.filter(item => !item.condition);
if (failed.length) {
  console.error(`artifact-capability-tour gate failed: ${failed.length} issue(s)`);
  process.exit(1);
}
console.log(`artifact-capability-tour gate passed: ${checks.length} checks`);
