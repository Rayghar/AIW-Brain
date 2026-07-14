import fs from 'node:fs';
import path from 'node:path';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '../packages/domain/dist/index.js';
import { buildPortfolioIntelligence } from '../packages/engine/dist/index.js';

const report = buildPortfolioIntelligence(samplePortfolioProjects, sampleEnterpriseCatalog);
const out = path.resolve('generated/portfolio-cycle');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'enterprise-portfolio-intelligence.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(out, 'enterprise-architecture-catalog.json'), JSON.stringify(sampleEnterpriseCatalog, null, 2));
console.log(JSON.stringify({
  projects: report.summary.projects,
  dependencies: report.summary.totalDependencies,
  highRiskProjects: report.summary.highRiskProjects,
  standardizationScore: report.summary.standardizationScore,
  complianceScore: report.summary.complianceScore,
  roadmapItems: report.roadmap.length,
}, null, 2));
