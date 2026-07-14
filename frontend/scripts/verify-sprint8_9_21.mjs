import { readFileSync } from 'node:fs';

const files = {
  app: 'apps/web/src/App.tsx',
  main: 'apps/web/src/main.tsx',
  cockpit: 'apps/web/src/components/ProjectCockpit.tsx',
  comparison: 'apps/web/src/components/ComparisonWorkspace.tsx',
  reviewStudio: 'apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx',
  css: 'apps/web/src/rc10_38_cockpit_pages.css',
};
const read = (file) => readFileSync(file, 'utf8');
const required = [
  [files.app, 'UserCog'],
  [files.main, "./rc10_38_cockpit_pages.css"],
  [files.cockpit, 'CockpitPageFrame'],
  [files.cockpit, 'concept1-kpi-grid'],
  [files.cockpit, 'Architecture lifecycle progress'],
  [files.comparison, 'comparison-concept1-page'],
  [files.reviewStudio, 'review-summary-strip'],
  [files.css, 'Sprint 8.9.21 / rc.10.38'],
  [files.css, '.concept1-kpi-grid'],
  [files.css, '.review-summary-strip'],
];
const failures = [];
for (const [file, needle] of required) {
  const content = read(file);
  if (!content.includes(needle)) failures.push(`${file} missing ${needle}`);
}
const app = read(files.app);
if (/grid-template-columns:\s*76px/.test(read('apps/web/src/rc10_37_redesign.css') + read(files.css))) {
  failures.push('compact 76px navigation regression detected in redesign CSS');
}
if (!app.includes('Project Cockpit') || !app.includes('Design Lifecycle') || !app.includes('Admin & Knowledge Ops')) {
  failures.push('logical navigation section labels missing from App shell');
}
if (failures.length) {
  console.error('Sprint 8.9.21 verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.21 Concept 1 cockpit page verification passed.');
