#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const checks = [];
function expectFile(file) {
  checks.push({ name: `file:${file}`, ok: fs.existsSync(file) });
}
function expectContains(file, needle) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  checks.push({ name: `${file} contains ${needle}`, ok: text.includes(needle) });
}

expectFile('apps/web/src/components/StudioSpecialistSurfaces.tsx');
expectContains('apps/web/src/components/StudioSpecialistSurfaces.tsx', 'StudioDataTable');
expectContains('apps/web/src/components/StudioSpecialistSurfaces.tsx', 'StudioPreviewDrawer');
expectContains('apps/web/src/components/StudioSpecialistSurfaces.tsx', 'StudioEmptyState');
expectContains('apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx', 'StudioDataTable');
expectContains('apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx', 'Selection inspector');
expectContains('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'StudioDataTable');
expectContains('apps/web/src/styles.css', 'studio-data-table-card');
expectContains('apps/web/src/styles.css', 'studio-preview-drawer');
expectContains('apps/web/src/styles.css', 'studio-empty-state');
expectContains('SPRINT8_9_13_PRODUCT_GRADE_TABLES_PREVIEWS_EMPTY_STATES.md', 'product-grade table');
expectContains('CHANGE_SUMMARY_v0.10.0-rc.10.33.md', 'rc.10.31');

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error('Sprint 8.9.13 verification failed:');
  for (const failure of failures) console.error(` - ${failure.name}`);
  process.exit(1);
}
console.log(`Sprint 8.9.13 verification passed (${checks.length}/${checks.length}).`);
