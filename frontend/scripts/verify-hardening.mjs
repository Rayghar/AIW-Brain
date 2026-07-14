import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const exists = (path) => access(new URL(path, root)).then(() => true).catch(() => false);
const [pkg, app, styles, profiles, i18n, locale, canvas, retrieval, qualityEngine, synthesis, acceptance, api, corpusRaw, manifest, sw] = await Promise.all([
  read('package.json').then(JSON.parse),
  read('apps/web/src/App.tsx'),
  read('apps/web/src/styles.css'),
  read('apps/web/src/lib/experienceProfiles.ts'),
  read('apps/web/src/lib/i18n.tsx'),
  read('apps/web/src/lib/locale.ts'),
  read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx'),
  read('packages/engine/src/knowledgeRetrieval.ts'),
  read('packages/engine/src/knowledgeQuality.ts'),
  read('packages/engine/src/architectureSynthesis.ts'),
  read('apps/api/src/platformAcceptance.ts'),
  read('apps/api/src/app.ts'),
  read('data/sprint7_8-pattern-intelligence.json'),
  read('apps/web/public/manifest.webmanifest'),
  read('apps/web/public/sw.js'),
]);
const corpus = JSON.parse(corpusRaw);
const records = Array.isArray(corpus) ? corpus : corpus.records;
const criticalIds = ['STYLE-MICROSERVICES','PAT-TRANSACTIONAL-OUTBOX','PAT-SAGA-BOUNDARY','PAT-CIRCUIT-BREAKER','PAT-ZERO-TRUST','PAT-API-GATEWAY','PAT-CQRS','PAT-EVENT-SOURCING','PAT-RETRY-WITH-BACKOFF','PAT-BULKHEAD'];
const critical = records.filter((record) => criticalIds.includes(record.id));
const checks = [
  ['hardening lineage is retained in the current release', ['0.9.7','0.9.9','0.10.0-alpha.1','0.10.0-alpha.2','0.10.0-alpha.3','0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(pkg.version) && /AIW-0\.9\.7/.test(api) && /api\/releases\/8\.0\.4/.test(api)],
  ['role-focused progressive disclosure is available', /solution-architect/.test(profiles) && /knowledge-curator/.test(profiles) && /experienceProfile/.test(app)],
  ['core shell supports four locale catalogs and RTL', /const fr:/.test(i18n) && /const pt:/.test(i18n) && /const ar:/.test(i18n) && /document\.documentElement\.dir/.test(locale) && /\[dir='rtl'\]/.test(styles)],
  ['keyboard and screen-reader canvas alternative exists', /Architecture outline/.test(canvas) && /aria-current/.test(canvas) && /aria-label/.test(canvas) && /skip-link/.test(app)],
  ['installable offline shell is safe and does not cache tenant APIs', JSON.parse(manifest).display === 'standalone' && /isSensitiveApi/.test(sw) && /cache-control.*no-store/i.test(sw)],
  ['pending quality calibration remains excluded from scoring', /pending calibration/.test((await read('apps/web/src/components/QualityAttributeStudio.tsx')).toLowerCase()) && /production-calibrated/.test((await read('apps/web/src/components/QualityAttributeStudio.tsx')).toLowerCase())],
  ['knowledge depth is scored across editorial and operational dimensions', /assessKnowledgeRecordDepth/.test(qualityEngine) && /specificity/.test(qualityEngine) && /conformance/.test(qualityEngine) && /topology/.test(qualityEngine)],
  ['shallow knowledge cannot enter unanchored production grounding', /item\.depth\.grade !== 'needs-enrichment'/.test(retrieval) && /primaryRecommendationEligible/.test(retrieval)],
  ['critical patterns have distinct enriched content', critical.length === criticalIds.length && critical.every((record) => String(record.problem ?? '').length >= 80 && (record.applicabilityRules ?? []).length >= 2 && (record.risks ?? []).length >= 2 && (record.obligations ?? []).length >= 2)],
  ['simulation changes only with approved empirical profiles', /profile\.status !== 'approved'/.test(synthesis) && /evidence-adjusted/.test(synthesis) && /not a capacity guarantee/.test(synthesis)],
  ['platform acceptance separates configured from verified', /Configured means[\s\S]*Verified means/.test(acceptance) && /reference-only/.test(acceptance) && /not-configured/.test(acceptance) && /platform\/acceptance/.test(api)],
  ['hardening APIs expose knowledge depth and active release', /api\/knowledge\/depth/.test(api) && /hardeningPlatformRelease/.test(api)],
];
let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`${passed}/${checks.length} hardening checks passed`);
if (passed !== checks.length) process.exit(1);
