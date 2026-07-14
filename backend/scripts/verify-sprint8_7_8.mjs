import { readFileSync } from 'node:fs';

const files = {
  app: readFileSync('apps/web/src/App.tsx', 'utf8'),
  profiles: readFileSync('apps/web/src/lib/experienceProfiles.ts', 'utf8'),
  activation: readFileSync('apps/web/src/components/ActivationWorkspace.tsx', 'utf8'),
  admin: readFileSync('apps/web/src/components/AdminConsoleWorkspace.tsx', 'utf8'),
  api: readFileSync('apps/api/src/app.ts', 'utf8'),
  styles: readFileSync('apps/web/src/styles.css', 'utf8'),
  packageJson: readFileSync('package.json', 'utf8'),
  lock: readFileSync('package-lock.json', 'utf8'),
};
const checks = [
  ['release version rc6 lineage', files.packageJson.includes('0.10.0-rc.10.1')],
  ['activation workspace routable', files.app.includes('ActivationWorkspace') && files.app.includes('workspaceMode === "activation"') && files.profiles.includes("'activation'")],
  ['admin workspace routable', files.app.includes('AdminConsoleWorkspace') && files.app.includes('workspaceMode === "admin"') && files.profiles.includes("'admin'")],
  ['guided scenario templates', ['Pan-African payment platform','Multi-tenant SaaS platform','Legacy modernization'].every((x) => files.activation.includes(x))],
  ['first model generation', files.activation.includes('Generate first visual model') && files.activation.includes('generateStarterModel') && files.activation.includes('previewIntelligentLayout')],
  ['activation readiness meter', files.activation.includes('Activation readiness') && files.activation.includes('readiness') && files.activation.includes('Kernel-ranked work')],
  ['admin LLM configuration', files.admin.includes('LLM and co-architect routing') && files.admin.includes('OPENAI_API_KEY') && files.admin.includes('structuredOutputRequired')],
  ['admin repository governance', files.admin.includes('Repository and evidence onboarding') && files.admin.includes('AIW_ENABLE_GITHUB_KNOWLEDGE')],
  ['admin knowledge governance', files.admin.includes('Knowledge governance and Pattern DNA') && files.admin.includes('Candidate knowledge scoring')],
  ['admin runtime and finalization controls', files.admin.includes('Enterprise runtime acceptance') && files.admin.includes('Final without evidence')],
  ['admin API summary endpoint', files.api.includes('/api/admin/configuration-summary') && files.api.includes('adminConfigurationSummary')],
  ['sprint release endpoint', files.api.includes('/api/releases/8.7.8') && files.api.includes('sprint878PlatformRelease')],
  ['premium activation/admin styling', files.styles.includes('Sprint 8.7.8') && files.styles.includes('.activation-status-grid') && files.styles.includes('.admin-tabs')],
  ['public npm registry', !files.lock.includes('applied-caas-gateway')],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Sprint 8.7.8 verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Sprint 8.7.8 activation/admin gate passed: ${checks.length}/${checks.length}.`);
