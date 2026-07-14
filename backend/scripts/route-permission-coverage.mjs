#!/usr/bin/env node
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const files = ['apps/api/src/app.ts', ...readdirSync('apps/api/src/routes').filter((f) => f.endsWith('.ts')).map((f) => `apps/api/src/routes/${f}`)];
const endpoints = [];
const routePattern = /app\.(get|post|put|delete)\(\s*['"`]([^'"`]+)['"`]/g;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(routePattern)) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const after = text.slice(match.index, Math.min(text.length, match.index + 2200));
    const direct = [...after.matchAll(/hasPermission\([^,]+,\s*['"`]([^'"`]+)['"`]\)/g)].map((m) => m[1]);
    const viaDeny = [...after.matchAll(/deny\([^,]+,\s*[^,]+,\s*['"`]([^'"`]+)['"`]\)/g)].map((m) => m[1]);
    const viaGuardHelper = [...after.matchAll(/guard\([^,]+,\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
    const permissions = [...direct, ...viaDeny, ...viaGuardHelper];
    endpoints.push({ method, path, file, mutating: method !== 'GET', permissionGuarded: permissions.length > 0, permissions });
  }
}
const adminKnowledgeMutations = endpoints.filter((e) => e.mutating && /^\/api\/(admin|knowledge-ops|knowledge-release|pattern-dna)/.test(e.path));
const unguarded = adminKnowledgeMutations.filter((e) => !e.permissionGuarded);
const summary = {
  generatedAt: new Date().toISOString(),
  totalEndpoints: endpoints.length,
  mutatingEndpoints: endpoints.filter((e) => e.mutating).length,
  adminKnowledgeMutations: adminKnowledgeMutations.length,
  adminKnowledgeMutationsGuarded: adminKnowledgeMutations.length - unguarded.length,
  adminKnowledgeMutationsUnguarded: unguarded.length,
  unguarded,
  endpoints,
};
mkdirSync('generated', { recursive: true });
writeFileSync('generated/route-permission-coverage.json', JSON.stringify(summary, null, 2));
console.log(`Route-permission coverage generated: ${summary.totalEndpoints} endpoints, ${summary.adminKnowledgeMutationsGuarded}/${summary.adminKnowledgeMutations} Admin/Knowledge mutations permission-guarded.`);
if (unguarded.length) {
  for (const endpoint of unguarded) console.error(`WARN  unguarded Admin/Knowledge mutation: ${endpoint.method} ${endpoint.path} (${endpoint.file})`);
}
process.exit(0);
