import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleEnterpriseCatalog, samplePortfolioProjects, sampleProject, AIW_RELEASE } from '../packages/domain/dist/index.js';
import { composeSdd, buildReferencePilotScenarios, runPilotEvaluationSuite, buildV10ReleaseReadiness } from '../packages/engine/dist/index.js';
import { renderAccessibleSddPdf } from '../packages/artifacts/dist/index.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distributionRoot = path.resolve(backendRoot, '..');
const out = path.join(distributionRoot, 'release-evidence/rc10.65/generated');
await mkdir(out, { recursive: true });
const library = {
  knowledgeReleaseId: 'AKR-0.10.60', libraryId: 'rc10-65-reference', version: '0.10.65', status: 'approved',
  generatedAt: new Date().toISOString(), disclaimer: 'Reference acceptance library',
  qualityAttributes: [], architectureStyles: [], patterns: [], viewpoints: [], evidence: [], rulePacks: [],
};
const pdf = renderAccessibleSddPdf(structuredClone(sampleProject), structuredClone(library));
await writeFile(path.join(out, 'AIW_RC10_65_REFERENCE_PROFESSIONAL_SDD.pdf'), pdf.bytes);
await writeFile(path.join(out, 'AIW_RC10_65_REFERENCE_SDD.md'), composeSdd(structuredClone(sampleProject), structuredClone(library)));
const pilot = runPilotEvaluationSuite(buildReferencePilotScenarios(samplePortfolioProjects), samplePortfolioProjects, sampleEnterpriseCatalog);
const readiness = buildV10ReleaseReadiness(pilot);
await writeFile(path.join(out, 'AIW_RC10_65_PILOT_EVALUATION.json'), JSON.stringify({ release: AIW_RELEASE, report: pilot, readiness }, null, 2));
const src = path.join(backendRoot, 'apps/api/src');
const routeFiles = (await readdir(src)).filter((name) => name.endsWith('ApplicationRoutes.ts'));
const routeMetrics = [];
for (const name of routeFiles) {
  const content = await readFile(path.join(src, name), 'utf8');
  routeMetrics.push({ file: name, lines: content.split(/\r?\n/).length });
}
await writeFile(path.join(out, 'AIW_RC10_65_BACKEND_ROUTE_METRICS.json'), JSON.stringify({
  release: AIW_RELEASE.version,
  appLines: (await readFile(path.join(src, 'app.ts'), 'utf8')).split(/\r?\n/).length,
  routeMetrics,
  allBoundedModulesUnder1300: routeMetrics.filter((item) => item.file !== 'registerApplicationRoutes.ts').every((item) => item.lines <= 1300),
}, null, 2));
await writeFile(path.join(out, 'AIW_RC10_65_SDD_PROFILE.json'), JSON.stringify({
  release: AIW_RELEASE.version,
  pageCount: pdf.pageCount,
  bookmarkCount: pdf.bookmarkCount,
  profile: pdf.profile,
  model: {
    nodes: sampleProject.nodes.length,
    relationships: sampleProject.edges.length,
    interfaces: sampleProject.interfaces?.length ?? 0,
    decisions: sampleProject.decisions?.length ?? 0,
    findings: sampleProject.findings?.length ?? 0,
  },
  independentPdfUaCertification: false,
}, null, 2));
console.log(JSON.stringify({ out, pdfPages: pdf.pageCount, bookmarks: pdf.bookmarkCount, pilotScenarios: pilot.scenarios.length }, null, 2));
