import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd().endsWith('/frontend') ? process.cwd() : resolve(process.cwd(), 'frontend');
const admin = readFileSync(resolve(root, 'apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'apps/web/src/styles.css'), 'utf8');
const requiredAdmin = ["'production'", 'Production readiness command center', 'productionReadinessItems', 'Identity and access', 'LLM provider routes and keys', 'GitHub repository evidence', 'Mind Factory pipeline', 'Knowledge governance', 'KMS and signing', 'Worker runtime', 'Durability and audit', 'Required environment and secret references'];
const missingAdmin = requiredAdmin.filter((item) => !admin.includes(item));
const requiredCss = ['admin-readiness-grid', 'admin-readiness-item', 'production-readiness-card'];
const missingCss = requiredCss.filter((item) => !css.includes(item));
if (missingAdmin.length || missingCss.length) {
  console.error('Sprint 8.9.19 verification failed.', { missingAdmin, missingCss });
  process.exit(1);
}
console.log('Sprint 8.9.19 verification passed: Admin Production Readiness Control Center is present.');
