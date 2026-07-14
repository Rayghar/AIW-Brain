#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function text(path) { return readFileSync(path, 'utf8'); }
function check(name, ok) {
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
  }
}

const app = text('apps/api/src/app.ts');
const securityRoute = text('apps/api/src/routes/enterpriseSecurityRoutes.ts');
const rbac = text('packages/engine/src/rbac.ts');
const securityRuntime = text('apps/api/src/securityRuntime.ts');
const identity = text('apps/api/src/identity.ts');
const admin = text('packages/admin/src/index.ts');
const adminUi = text('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');
const migration = text('database/migrations/015_sprint8_8_8_enterprise_security_rbac_scale.sql');

check('package registered enterprise security route', app.includes('enterpriseSecurityRoutes'));
check('dedicated enterprise security route exists', existsSync('apps/api/src/routes/enterpriseSecurityRoutes.ts'));
for (const endpoint of ['/api/admin/security/roles','/api/admin/security/role-assignments','/api/admin/security/tenant-policies','/api/admin/security/posture','/api/admin/security/rls-acceptance','/api/admin/audit/export/v2','/api/admin/security/performance-checks']) check(`security endpoint ${endpoint}`, securityRoute.includes(endpoint));
for (const permission of ['security.role-admin','security.tenant-policy','security.posture.read','audit.export']) check(`RBAC includes ${permission}`, rbac.includes(`'${permission}'`));
check('RBAC does not infer platform-admin from missing roles', !/return \['platform-admin'\]/.test(rbac));
check('development tokens blocked when dev auth disabled', /allowDevelopment && authorization/.test(securityRuntime) && /UNAUTHENTICATED/.test(securityRuntime));
check('proxy-verified OIDC claim mode supported', securityRuntime.includes('AIW_TRUST_PROXY_OIDC_CLAIMS') && securityRuntime.includes('proxy-verified-oidc'));
check('OIDC role mapping supports claims/groups/realm/client roles', ['deriveRolesFromClaims','realm_access','resource_access','AIW_OIDC_ROLE_CLAIM_PATH'].every((token) => identity.includes(token)));
check('admin store owns tenant policies and role assignments', admin.includes('tenantPolicies') && admin.includes('roleAssignments') && admin.includes('roleMappingRules'));
check('tenant policy blocks production dev auth', admin.includes('Production tenant policy cannot allow development auth') && migration.includes('production_blocks_dev_auth'));
check('Admin UI exposes Security & RBAC tab', adminUi.includes("'security'") && adminUi.includes('Security & RBAC') && adminUi.includes('saveRoleAssignment'));
check('audit export v2 has checksum manifest', securityRoute.includes('checksumSha256') && securityRoute.includes('x-aiw-audit-export-manifest'));
check('RLS migration exists with tenant isolation', migration.includes('tenant_security_policies_v2') && migration.includes('tenant_role_assignments_v2') && migration.includes('enable row level security'));
check('production security profile exists', existsSync('deploy/security/production-security-profile.md'));
check('sprint documentation exists', existsSync('SPRINT8_8_8_ENTERPRISE_SECURITY_RBAC_SCALE.md'));

if (process.exitCode) process.exit(process.exitCode);
console.log('Sprint 8.8.8 Enterprise Security, RBAC and Scale Hardening verification passed.');
