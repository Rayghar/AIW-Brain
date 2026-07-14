import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const releaseId = 'AKR-0.10.60';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const patternFabric = await readJson(join(root, 'data/rc10_55-pattern-dna2.json'));
const sourceMap = await readJson(join(root, 'data/rc10_55-global-architecture-intelligence-source-map.json'));
const stageKits = await readJson(join(root, 'data/rc10_55-stage-intelligence-kits.json'));
const approvedClaims = await readJson(join(root, 'generated/operational-cycle/knowledge/approved-claims.json'));
const records = patternFabric.records;
const dossiers = sourceMap.dossiers;

const unique = (values) => [...new Set(values.filter(Boolean))];
const sum = (values) => values.reduce((a,b) => a+b,0);
const byType = Object.fromEntries(unique(records.map((record) => record.recordType)).sort().map((type) => [type, records.filter((record) => record.recordType === type).length]));
const sourceReferences = new Map();
for (const record of records) for (const evidence of record.evidence ?? []) {
  const current = sourceReferences.get(evidence.connectorId) ?? { recordIds: [], claimIds: [] };
  current.recordIds.push(record.id);
  current.claimIds.push(...(evidence.claimIds ?? []));
  sourceReferences.set(evidence.connectorId, current);
}
const interactionTypes = {};
const contractTypes = {};
for (const record of records) for (const item of record.interfaceKit ?? []) {
  interactionTypes[item.interaction ?? 'unspecified'] = (interactionTypes[item.interaction ?? 'unspecified'] ?? 0) + 1;
  contractTypes[item.contractType ?? 'unspecified'] = (contractTypes[item.contractType ?? 'unspecified'] ?? 0) + 1;
}
const lifecycleCoverage = {};
for (const record of records) for (const stage of record.applicableStages ?? []) {
  lifecycleCoverage[stage] = (lifecycleCoverage[stage] ?? 0) + 1;
}

const designRecords = records.map((record) => ({
  id: record.id,
  name: record.name,
  type: record.recordType,
  category: record.category,
  aliases: record.aliases ?? [],
  lifecycleStages: record.applicableStages ?? [],
  tags: record.tags ?? [],
  toolset: {
    components: (record.componentKit ?? []).map((item) => ({ key: item.key, name: item.name, kind: item.canonicalKind, responsibility: item.responsibility, required: item.required, attributes: item.properties ?? {} })),
    interfaces: (record.interfaceKit ?? []).map((item) => ({ key: item.key, name: item.name, interaction: item.interaction, protocol: item.protocol, contractType: item.contractType, required: item.required, providerRole: item.providerRole, consumerRole: item.consumerRole })),
    obligations: record.obligations ?? [],
    risks: record.risks ?? [],
    antiPatternDetection: record.detectionRules ?? [],
    conformanceRules: record.conformanceRules ?? [],
    fitnessTests: record.fitnessTests ?? [],
    transitionStrategies: record.transitionStrategies ?? [],
    providerNeutralRealization: record.providerNeutralRealization ?? null,
    providerRealizations: record.providerRealizations ?? [],
    generationContract: record.generationContract ?? {},
  },
  provenance: {
    sourceConnectors: unique((record.evidence ?? []).map((item) => item.connectorId)),
    claimIds: unique((record.evidence ?? []).flatMap((item) => item.claimIds ?? [])),
    atomicClaimComplete: (record.evidence ?? []).some((item) => (item.claimIds ?? []).length > 0),
    editorialReview: record.editorialReview ?? record.review ?? null,
  },
}));

const sourceDossiers = dossiers.map((dossier) => {
  const use = sourceReferences.get(dossier.connectorId) ?? { recordIds: [], claimIds: [] };
  return {
    connectorId: dossier.connectorId,
    repository: dossier.repository,
    posture: dossier.recommendedPosture,
    lifecycleStatus: dossier.sourceAuthority?.lifecycleStatus,
    trustTier: dossier.sourceAuthority?.trustTier,
    licence: dossier.licence,
    permittedUses: dossier.permittedAiwUses ?? [],
    prohibitedUses: dossier.prohibitedAiwUses ?? [],
    lifecycleStages: dossier.lifecycleStagesAffected ?? [],
    canonicalMappings: dossier.canonicalMapping ?? [],
    reviewer: dossier.requiredHumanReviewer,
    usedByRecordCount: unique(use.recordIds).length,
    linkedClaimCount: unique(use.claimIds).length,
    activeDesignSource: use.recordIds.length > 0,
  };
});

const report = {
  title: 'AIW rc.10.59 Architecture Design Toolset',
  releaseId,
  generatedAt: new Date().toISOString(),
  authority: {
    source: 'Governed, pinned rc.10.55 knowledge snapshot plus approved operational claims',
    liveRefreshPerformed: false,
    limitation: 'This build normalizes and activates the pinned governed corpus. It does not claim a fresh live extraction and independent promotion run for every public repository.',
  },
  summary: {
    totalKnowledgeRecords: records.length,
    recordsByType: byType,
    repositoryDossiers: dossiers.length,
    activeDesignSources: sourceDossiers.filter((item) => item.activeDesignSource).length,
    unusedOrAdapterOnlySources: sourceDossiers.filter((item) => !item.activeDesignSource).length,
    approvedAtomicClaims: approvedClaims.claims.length,
    recordsWithAtomicClaimLinks: designRecords.filter((item) => item.provenance.atomicClaimComplete).length,
    componentKitItems: sum(records.map((record) => record.componentKit?.length ?? 0)),
    interfaceKitItems: sum(records.map((record) => record.interfaceKit?.length ?? 0)),
    topologyGenerativeRecords: records.filter((record) => record.generationContract?.topology).length,
    meaningfulGenerationContracts: records.filter((record) => Object.values(record.generationContract ?? {}).some((value) => value === true)).length,
    lifecycleCoverage,
    interactionTypes,
    contractTypes,
  },
  lifecycleStageKits: stageKits.stageKits ?? stageKits,
  sourceDossiers,
  designRecords,
  approvedClaims: approvedClaims.claims.map((claim) => ({ id: claim.id, type: claim.claimType, statement: claim.statement, sourceLocations: claim.sourceLocations, reviewedBy: claim.reviewedBy, reviewedAt: claim.reviewedAt })),
  closureBacklog: [
    'Link each priority Pattern DNA field to independently reviewed atomic source claims.',
    'Execute live refresh, extraction, contradiction review and independent promotion for approved production connectors.',
    'Deepen provider-product mappings without allowing provider products to override vendor-neutral capability design.',
    'Continue specialist editorial calibration of generated component and interface kits.',
  ],
};

const out = join(root, 'data/rc10_59-architecture-design-toolset.json');
const generated = join(root, 'generated/rc10-59/rc10_59-knowledge-tooling-report.json');
await mkdir(dirname(out), { recursive: true });
await mkdir(dirname(generated), { recursive: true });
await writeFile(out, JSON.stringify(report, null, 2) + '\n');
await writeFile(generated, JSON.stringify({ releaseId, generatedAt: report.generatedAt, summary: report.summary, sourceDossiers }, null, 2) + '\n');
const frontendData = resolve(root, '../frontend/data/rc10_59-architecture-design-toolset.json');
await mkdir(dirname(frontendData), { recursive: true });
await copyFile(out, frontendData);
console.log(JSON.stringify({ output: out, summary: report.summary }, null, 2));
