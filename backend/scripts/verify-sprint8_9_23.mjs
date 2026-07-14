import { readFileSync } from 'node:fs';

const files = {
  main: 'apps/web/src/main.tsx',
  css: 'apps/web/src/rc10_40_command_center.css',
  governance: 'apps/web/src/components/GovernanceWorkspace.tsx',
  security: 'apps/web/src/components/SecurityWorkspace.tsx',
  drift: 'apps/web/src/components/DriftWorkspace.tsx',
  conformance: 'apps/web/src/components/ConformanceWorkspace.tsx',
  ops: 'apps/web/src/components/OperationalIntelligenceWorkspace.tsx',
  runtime: 'apps/web/src/components/EnterpriseRuntimeWorkspace.tsx',
  admin: 'apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx',
};

const read = (file) => readFileSync(file, 'utf8');
const required = [
  [files.main, "./rc10_40_command_center.css"],
  [files.css, 'Sprint 8.9.23 / rc.10.40'],
  [files.css, '.command-center-page'],
  [files.css, '.command-kpi-row'],
  [files.css, '.admin-command-kpi-row'],
  [files.governance, 'command-center-page governance-page'],
  [files.governance, 'Governance command center metrics'],
  [files.security, 'command-center-page security-page'],
  [files.security, 'Security and live ops command center metrics'],
  [files.drift, 'command-center-page drift-page'],
  [files.drift, 'Runtime drift command center metrics'],
  [files.conformance, 'command-center-page conformance-workspace'],
  [files.conformance, 'Continuous conformance command center metrics'],
  [files.ops, 'command-center-page operational-intelligence-page'],
  [files.ops, 'Operational intelligence command center metrics'],
  [files.runtime, 'command-center-page enterprise-runtime-page'],
  [files.runtime, 'Enterprise runtime command center metrics'],
  [files.admin, 'command-center-page admin-control-plane'],
  [files.admin, 'Admin and knowledge operations command center metrics'],
];

const failures = [];
for (const [file, needle] of required) {
  const content = read(file);
  if (!content.includes(needle)) failures.push(`${file} missing ${needle}`);
}

const css = read(files.css);
if (/font-size:\s*(?:7|8|9|10)px/.test(css)) failures.push('Concept 3 CSS introduced sub-11px text.');
if (!css.includes('@media (max-width: 1180px)')) failures.push('Concept 3 CSS missing tablet responsive fallback.');
if (!css.includes('@media (max-width: 720px)')) failures.push('Concept 3 CSS missing mobile responsive fallback.');
if (!css.includes('Governance/admin/operations command-center redesign')) failures.push('Concept 3 CSS missing stated design intent.');

if (failures.length) {
  console.error('Sprint 8.9.23 verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.23 Concept 3 command-center page verification passed.');
