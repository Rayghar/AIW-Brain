import fs from 'node:fs';
import path from 'node:path';
import { sampleProject } from '../packages/domain/dist/index.js';
import { analyseOperationalDrift, createRemediationPlan, executeCollector, recommendArchitectureStyles } from '../packages/engine/dist/index.js';
import { compileArtifacts } from '../packages/artifacts/dist/index.js';
const library = JSON.parse(fs.readFileSync(new URL('../data/knowledge-library.json', import.meta.url), 'utf8'));
const project = structuredClone(sampleProject);
const physical = project.nodes.find((node) => node.id === 'physical-postgres');
physical.tags.push('critical'); physical.properties.expectedMonthlyCost = 500; physical.properties.replicas = 2; physical.properties.availabilityZones = 2;
const collector = { ...project.inventoryCollectors[0], provider: 'aws', scope: { account: 'reference' } };
const result = executeCollector(project, collector, { resources: [{ id: 'arn:aws:rds:reference', name: 'Managed PostgreSQL', type: 'aws_db_instance', region: 'eu-west-1', monthlyCost: 850, replicas: 1, availabilityZones: 1, tags: { 'aiw.node-id': 'physical-postgres' } }] }, 'reference-cycle');
project.runtimeInventories.unshift(result.inventory); project.collectorRuns.unshift(result.run); project.inventoryCollectors[0] = result.collector;
const drift = analyseOperationalDrift(project, result.inventory); project.operationalDriftReports.unshift(drift);
const plan = createRemediationPlan(drift, 'scheduled-architecture-agent'); project.remediationPlans.unshift(plan);
const bundle = compileArtifacts(project, library, recommendArchitectureStyles(project, library));
const out = path.resolve('generated/operational-cycle'); fs.mkdirSync(out, { recursive: true });
for (const file of bundle.files) { const target = path.join(out, file.path); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, file.content); }
fs.writeFileSync(path.join(out, 'cycle-summary.json'), JSON.stringify({ collectorRun: result.run, operationalDrift: drift.summary, remediationActions: plan.actions.length, artifacts: bundle.files.length }, null, 2));
console.log(JSON.stringify({ collectorRun: result.run.status, resources: result.inventory.resources.length, findings: drift.findings.length, remediationActions: plan.actions.length, artifacts: bundle.files.length }, null, 2));
