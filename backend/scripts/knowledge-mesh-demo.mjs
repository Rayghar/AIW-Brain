import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { knowledgeRepositoryConnectors, seedKnowledgeClaims } from '../packages/domain/dist/index.js';
import {
  assessKnowledgeMeshCoverage,
  detectClaimContradictions,
  extractionPromptContract,
  retrieveArchitectureKnowledge,
} from '../packages/engine/dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedAt = new Date().toISOString();
const coverage = assessKnowledgeMeshCoverage();
const contradictions = detectClaimContradictions(seedKnowledgeClaims);
const retrievalExamples = [
  retrieveArchitectureKnowledge({ query: 'modular monolith module boundary verification', limit: 6 }),
  retrieveArchitectureKnowledge({ query: 'bounded context context map service decomposition', limit: 6 }),
  retrieveArchitectureKnowledge({ query: 'cloud native component relationships topology template', limit: 6 }),
];
const seedPayload = {
  version: '0.8.7-seed',
  connectorIds: knowledgeRepositoryConnectors.map((item) => item.id).sort(),
  claimIds: seedKnowledgeClaims.filter((claim) => claim.reviewStatus === 'verified').map((claim) => claim.id).sort(),
};
const checksum = createHash('sha256').update(JSON.stringify(seedPayload)).digest('hex');
const release = {
  id: `KREL-SEED-${checksum.slice(0, 12)}`,
  version: '0.8.7-seed',
  createdAt: generatedAt,
  createdBy: 'Architecture Knowledge Council',
  status: 'approved',
  claimIds: seedPayload.claimIds,
  sourceSnapshotIds: [],
  proposalIds: [],
  checksum: `sha256:${checksum}`,
  notes: [
    'Human-reviewed seed claims only.',
    'GitHub refreshes and LLM extractions remain quarantined candidates until expert review and regression testing.',
  ],
};
const report = {
  generatedAt,
  coverage,
  sourcePolicy: {
    trustTiers: {
      1: 'Official standards, specifications, vendor architecture centres and governed foundations.',
      2: 'Mature architecture methods, modelling tools, conformance tools and component ecosystems.',
      3: 'Useful implementation examples and emerging catalogs requiring corroboration.',
      4: 'Discovery indexes only; never direct production evidence.',
    },
    publicationFlow: ['retrieve', 'quarantine', 'extract candidate claims', 'validate', 'detect contradictions', 'expert review', 'regression test', 'publish versioned release'],
  },
  extractionContract: extractionPromptContract(),
  contradictions,
  retrievalExamples,
  currentRelease: release,
};

const outputs = [
  ['data/sprint7_7-github-knowledge-catalog.json', { generatedAt, connectors: knowledgeRepositoryConnectors, coverage }],
  ['data/sprint7_7-approved-claims.json', { generatedAt, claims: seedKnowledgeClaims }],
  ['data/sprint7_7-knowledge-release.json', release],
  ['generated/sprint7_7-knowledge-mesh-report.json', report],
];
for (const [relative, payload] of outputs) {
  const path = resolve(root, relative);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ generatedAt, connectors: coverage.connectors, approvedConnectors: coverage.approvedConnectors, claims: seedKnowledgeClaims.length, contradictions: contradictions.length, release: release.id, outputFiles: outputs.map(([path]) => path) }, null, 2));
