import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
const ledgerPath = resolve(evidenceRoot, 'GATE_6B_1_LIVE_CANDIDATE_RECORDS.json');
const outputPath = resolve(evidenceRoot, 'GATE_6B_1_LIVE_CANDIDATE_IDENTITY_INDEX.json');
const sha256 = (value: string | Buffer): string => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const ledgerBytes = await readFile(ledgerPath);
const ledger = JSON.parse(ledgerBytes.toString('utf8'));
const records = ledger.records.map((record: any, index: number) => {
  const identityPayload = `${record.requestId}\n${record.strategy}\n${record.caseId}\n${record.evidenceId ?? 'none'}\n${JSON.stringify(record.output)}`;
  return {
    ordinal: index + 1,
    canonicalCandidateRecordId: `G6B1-CAND-${sha256(identityPayload).slice(7, 31)}`,
    legacyCandidateRecordId: record.candidateRecordId,
    requestId: record.requestId,
    strategy: record.strategy,
    caseId: record.caseId,
    evidenceId: record.evidenceId,
    authority: 'candidate',
    outputFingerprint: sha256(JSON.stringify(record.output)),
  };
});
const uniqueCanonicalIds = new Set(records.map((item: any) => item.canonicalCandidateRecordId));
if (uniqueCanonicalIds.size !== records.length) throw new Error('GATE_6B_1_CANONICAL_CANDIDATE_ID_COLLISION');
const legacyIds = records.map((item: any) => item.legacyCandidateRecordId);
const index = {
  schemaVersion: 'aiw-gate-6b-1-live-candidate-identity-index-v1', generatedAt: new Date().toISOString(), productionAccepted: false,
  sourceLedger: 'release-evidence/rc10.73.8/GATE_6B_1_LIVE_CANDIDATE_RECORDS.json', sourceLedgerSha256: sha256(ledgerBytes),
  sourceRecordCount: records.length, sourceLegacyUniqueIdCount: new Set(legacyIds).size,
  sourceLegacyDuplicateIdCount: records.length - new Set(legacyIds).size,
  canonicalRecordCount: records.length, canonicalUniqueIdCount: uniqueCanonicalIds.size, canonicalDuplicateIdCount: 0,
  canonicalIdentityFields: ['requestId','strategy','caseId','evidenceId','outputFingerprint'],
  historicalLedgerRewritten: false, legacyIdsAuthoritative: false,
  authority: 'candidate', approvedKnowledgeChanged: false, designGraphMutations: 0, automaticPromotions: 0,
  records,
};
await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ sourceRecordCount: records.length, sourceLegacyDuplicateIdCount: index.sourceLegacyDuplicateIdCount, canonicalUniqueIdCount: index.canonicalUniqueIdCount, canonicalDuplicateIdCount: 0, productionAccepted: false }, null, 2)}\n`);
