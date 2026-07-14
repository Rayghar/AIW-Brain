import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const pkg = JSON.parse(await read('package.json'));
const release = await read('packages/domain/src/release.ts');
const delivery = await read('apps/web/src/components/guided-delivery/SddDeliveryWorkspace.tsx');
const css = await read('apps/web/src/design-system/guided-delivery.css');
const pdf = await read('packages/artifacts/src/accessiblePdf.ts');
const sections = await read('packages/engine/src/sddSections.ts');
const checks = [
  ['frontend version', pkg.version === '0.10.0-rc.10.65.1'],
  ['canonical release identity', release.includes("version: '0.10.0-rc.10.65.1'")],
  ['professional PDF action', delivery.includes('Download professional PDF') && delivery.includes('downloadProfessionalPdf')],
  ['delivery quality summary', delivery.includes('Professional SDD readiness') && delivery.includes('traceabilityPercent')],
  ['responsive readiness metrics', css.includes('.guided-sdd-quality__metrics') && css.includes('@media (max-width: 760px)')],
  ['professional PDF renderer mirrored', pdf.includes('Professional Delivery Engine') && pdf.includes("sectionTitle: 'Contents'")],
  ['readable viewbook diagrams mirrored', pdf.includes('diagramCommands') && pdf.includes('Stable identities retained across views')],
  ['executive and gap sections mirrored', sections.includes('Executive architecture summary') && sections.includes('Architecture completeness, evidence gaps and next actions')],
];
let failed=0;
for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
if (failed) process.exit(1);
console.log(`rc.10.65 frontend gate: ${checks.length}/${checks.length} passed`);
