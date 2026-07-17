import { createHash } from 'node:crypto';
import type { CanonicalEpistemicStatus } from '@aiw/domain';
import { z } from 'zod';
import type { ResolvedEvidenceAtom } from './gate6b2R2SemanticTransformation.js';

export const gate6b3SourceAtomEpistemicStatuses = [
  'normative-requirement', 'source-stated-recommendation', 'measured-result',
  'source-example', 'implementation-observation', 'illustration', 'unknown',
] as const;
export type Gate6b3SourceAtomEpistemicStatus = (typeof gate6b3SourceAtomEpistemicStatuses)[number];

export const gate6b3AssetSynthesisStatuses = [
  'source-direct', 'deterministic-composition', 'sol-inference',
  'delegated-sol-interpretation', 'hypothesis',
] as const;
export type Gate6b3AssetSynthesisStatus = (typeof gate6b3AssetSynthesisStatuses)[number];
export type Gate6b3Applicability = 'required' | 'optional' | 'not-applicable' | 'unknown';

export const gate6b3EpistemicMigrationViewSchema = z.object({
  caseId: z.string(),
  assetId: z.string(),
  sourceAtoms: z.array(z.object({ atomId: z.string(), epistemicStatus: z.enum(gate6b3SourceAtomEpistemicStatuses) }).strict()),
  fields: z.array(z.object({ fieldName: z.string(), epistemicStatus: z.enum(gate6b3SourceAtomEpistemicStatuses), supportingAtomIds: z.array(z.string()) }).strict()),
  assetSynthesisStatus: z.enum(gate6b3AssetSynthesisStatuses),
  conditionApplicability: z.enum(['required','optional','not-applicable','unknown']),
  limitationApplicability: z.enum(['required','optional','not-applicable','unknown']),
  historicalCandidateRewritten: z.literal(false),
}).strict();

export interface Gate6b3LabelV2 {
  caseId: string;
  expectedDisposition: string;
  permittedDispositions: string[];
  primaryAssetTypes: string[];
  secondaryAssetTypes: string[];
  assetTypeAliases: Record<string, string[]>;
  permittedSourceAtomEpistemicStatuses: Gate6b3SourceAtomEpistemicStatus[];
  expectedSynthesisStatuses: Gate6b3AssetSynthesisStatus[];
  fieldEpistemicExpectations: Array<{ fieldName: string; permittedStatuses: Gate6b3SourceAtomEpistemicStatus[] }>;
  conditionApplicability: Gate6b3Applicability;
  requiredConditionEvidenceTerms: string[];
  limitationApplicability: Gate6b3Applicability;
  requiredLimitationEvidenceTerms: string[];
  expectedNonClaim: boolean;
  expectedAbstention: boolean;
}

export interface Gate6b3HistoricAsset {
  assetId: string;
  caseId: string;
  assetType: string;
  statement: string;
  epistemicStatus: CanonicalEpistemicStatus;
  supportingAtomIds: string[];
  fields: Array<{ fieldName: string; value: string; knowledgeState: string; supportingAtomIds: string[] }>;
  conditions: Array<{ value: string; supportingAtomIds: string[] }>;
  limitations: Array<{ value: string; supportingAtomIds: string[] }>;
  authority: 'candidate';
  productionAccepted: false;
  automaticPromotionAllowed: false;
  designGraphMutationAllowed: false;
}

export function classifyDeterministicEvidencePosture(input: {
  evidenceAvailable: boolean;
  text: string;
  parserClassification?: 'metadata-only' | 'heading-only' | 'bibliographic' | 'prose' | 'machine-readable-fact';
  atomExtractionStatus?: 'not-run' | 'zero-atoms' | 'unsupported-atoms' | 'validated-atoms';
}): 'abstain-insufficient-evidence' | 'non-claim' | 'source-reference' | 'claim-bearing' | 'atom-extraction-failed' {
  if (!input.evidenceAvailable) return 'abstain-insufficient-evidence';
  if (input.parserClassification === 'metadata-only' || input.parserClassification === 'heading-only') return 'non-claim';
  if (input.parserClassification === 'bibliographic') return 'source-reference';
  if (input.atomExtractionStatus === 'unsupported-atoms') return 'atom-extraction-failed';
  if (input.atomExtractionStatus === 'zero-atoms') return 'atom-extraction-failed';
  if (input.parserClassification === 'machine-readable-fact') return 'claim-bearing';
  const compact = input.text.replace(/\s+/g, ' ').trim();
  if (!compact || /^#{1,6}\s+[^.!?]+$/.test(compact) || compact.split(' ').length <= 3) return 'non-claim';
  return 'claim-bearing';
}

const genericAtomStatus: Record<string, Gate6b3SourceAtomEpistemicStatus[]> = {
  requirement: ['normative-requirement'], recommendation: ['source-stated-recommendation'], example: ['source-example'],
  'implementation-observation': ['implementation-observation'], procedure: ['implementation-observation','source-stated-recommendation'],
  'machine-readable-architecture-fact': ['implementation-observation'], 'causal-relationship': ['implementation-observation','source-stated-recommendation'],
  'exact-source-statement': ['implementation-observation','source-stated-recommendation','source-example','normative-requirement','illustration','unknown'],
  condition: ['normative-requirement','source-stated-recommendation','implementation-observation','source-example','unknown'],
  limitation: ['normative-requirement','source-stated-recommendation','implementation-observation','source-example','unknown'],
  'contradiction-side': ['normative-requirement','source-stated-recommendation','implementation-observation','unknown'],
  'non-claim': ['unknown'], 'insufficient-evidence-disposition': ['unknown'],
};

export function atomEpistemicCorrect(atom: ResolvedEvidenceAtom, label: Gate6b3LabelV2): boolean {
  const status = atom.proposedEpistemicStatus as Gate6b3SourceAtomEpistemicStatus;
  return gate6b3SourceAtomEpistemicStatuses.includes(status)
    && label.permittedSourceAtomEpistemicStatuses.includes(status)
    && (genericAtomStatus[atom.atomType] ?? ['unknown']).includes(status);
}

export function deriveAssetSynthesisStatus(asset: Gate6b3HistoricAsset): Gate6b3AssetSynthesisStatus {
  if (['pattern-dna','architecture-genome-fragment','contradiction-or-scoped-distinction'].includes(asset.assetType)) return 'deterministic-composition';
  if (asset.supportingAtomIds.length > 1) return 'deterministic-composition';
  if (asset.epistemicStatus === 'sol-inference') return 'sol-inference';
  if (asset.epistemicStatus === 'expert-interpretation') return 'delegated-sol-interpretation';
  if (asset.epistemicStatus === 'hypothesis') return 'hypothesis';
  return 'source-direct';
}

export function createEpistemicMigrationView(asset: Gate6b3HistoricAsset, atoms: ResolvedEvidenceAtom[], label: Gate6b3LabelV2) {
  const atomById = new Map(atoms.map((atom) => [atom.atomId, atom]));
  const referenced = [...new Set([
    ...asset.supportingAtomIds, ...asset.fields.flatMap((field) => field.supportingAtomIds),
    ...asset.conditions.flatMap((field) => field.supportingAtomIds), ...asset.limitations.flatMap((field) => field.supportingAtomIds),
  ])].map((id) => atomById.get(id)).filter((atom): atom is ResolvedEvidenceAtom => Boolean(atom));
  const view = {
    caseId: asset.caseId, assetId: asset.assetId,
    sourceAtoms: referenced.map((atom) => ({ atomId: atom.atomId, epistemicStatus: atom.proposedEpistemicStatus as Gate6b3SourceAtomEpistemicStatus })),
    fields: asset.fields.map((field) => {
      const statuses = field.supportingAtomIds.map((id) => atomById.get(id)?.proposedEpistemicStatus as Gate6b3SourceAtomEpistemicStatus | undefined).filter(Boolean) as Gate6b3SourceAtomEpistemicStatus[];
      const expectation = label.fieldEpistemicExpectations.find((item) => item.fieldName === field.fieldName);
      const epistemicStatus = statuses.find((status) => expectation?.permittedStatuses.includes(status)) ?? statuses[0] ?? 'unknown';
      return { fieldName: field.fieldName, epistemicStatus, supportingAtomIds: field.supportingAtomIds };
    }),
    assetSynthesisStatus: deriveAssetSynthesisStatus(asset),
    conditionApplicability: label.conditionApplicability,
    limitationApplicability: label.limitationApplicability,
    historicalCandidateRewritten: false as const,
  };
  return gate6b3EpistemicMigrationViewSchema.parse(view);
}

function normalizeType(value: string, label: Gate6b3LabelV2): string {
  for (const [canonical, aliases] of Object.entries(label.assetTypeAliases)) if (value === canonical || aliases.includes(value)) return canonical;
  return value;
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>(); return items.filter((item) => { const value = key(item); if (seen.has(value)) return false; seen.add(value); return true; });
}

function referencedText(asset: Gate6b3HistoricAsset, atomById: Map<string, ResolvedEvidenceAtom>): string {
  const ids = new Set([
    ...asset.supportingAtomIds, ...asset.fields.flatMap((item) => item.supportingAtomIds),
    ...asset.conditions.flatMap((item) => item.supportingAtomIds), ...asset.limitations.flatMap((item) => item.supportingAtomIds),
  ]);
  return [...ids].map((id) => atomById.get(id)?.exactSupportText ?? '').join(' ').toLowerCase();
}

function termsCaptured(terms: string[], assets: Gate6b3HistoricAsset[], atomById: Map<string, ResolvedEvidenceAtom>): boolean {
  if (!terms.length) return true;
  const text = assets.map((asset) => referencedText(asset, atomById)).join(' ');
  return terms.every((term) => text.includes(term.toLowerCase()));
}

export interface Gate6b3CaseEvaluation {
  caseId: string;
  disposition: string;
  dispositionCorrect: boolean;
  acceptedAssetCount: number;
  primaryAssetTypeCorrect: boolean;
  matchingPrimaryTypes: string[];
  secondaryTypes: string[];
  sourceAtomEpistemicCorrect: number;
  sourceAtomEpistemicTotal: number;
  fieldEpistemicCorrect: number;
  fieldEpistemicTotal: number;
  synthesisStatusCorrect: number;
  synthesisStatusTotal: number;
  conditionApplicability: Gate6b3Applicability;
  conditionCaptured: boolean | null;
  limitationApplicability: Gate6b3Applicability;
  limitationCaptured: boolean | null;
  authorityLeakage: number;
}

export function evaluateGate6b3Case(input: {
  label: Gate6b3LabelV2;
  atoms: ResolvedEvidenceAtom[];
  assets: Gate6b3HistoricAsset[];
  deterministicDisposition?: string;
}): Gate6b3CaseEvaluation {
  const atoms = uniqueBy(input.atoms, (atom) => `${atom.evidenceId}:${atom.resolvedStart}:${atom.resolvedEnd}:${atom.atomType}`);
  const assets = uniqueBy(input.assets, (asset) => `${asset.assetType}:${[...asset.supportingAtomIds].sort().join(',')}:${asset.statement ?? ''}`);
  const atomById = new Map(input.atoms.map((atom) => [atom.atomId, atom]));
  const disposition = input.deterministicDisposition ?? (assets.length ? 'candidate-assets' : 'rejected-semantic-output');
  const dispositionCorrect = input.label.permittedDispositions.includes(disposition);
  const normalPrimary = input.label.primaryAssetTypes.map((item) => normalizeType(item, input.label));
  const matchingPrimaryTypes = [...new Set(assets.map((asset) => normalizeType(asset.assetType, input.label)).filter((item) => normalPrimary.includes(item)))];
  const secondaryTypes = [...new Set(assets.map((asset) => normalizeType(asset.assetType, input.label)).filter((item) => !normalPrimary.includes(item)))];
  const fields = assets.flatMap((asset) => asset.fields.map((field) => ({ asset, field })));
  let fieldEpistemicCorrect = 0;
  for (const { field } of fields) {
    const statuses = field.supportingAtomIds.map((id) => atomById.get(id)?.proposedEpistemicStatus).filter(Boolean) as Gate6b3SourceAtomEpistemicStatus[];
    const expectation = input.label.fieldEpistemicExpectations.find((item) => item.fieldName === field.fieldName);
    if (field.knowledgeState !== 'stated' || (statuses.length && statuses.every((status) => expectation ? expectation.permittedStatuses.includes(status) : input.label.permittedSourceAtomEpistemicStatuses.includes(status)))) fieldEpistemicCorrect += 1;
  }
  const synthesis = assets.map(deriveAssetSynthesisStatus);
  const authorityLeakage = assets.filter((asset) => asset.authority !== 'candidate' || asset.productionAccepted || asset.automaticPromotionAllowed || asset.designGraphMutationAllowed).length;
  return {
    caseId: input.label.caseId, disposition, dispositionCorrect, acceptedAssetCount: assets.length,
    primaryAssetTypeCorrect: matchingPrimaryTypes.length > 0 || input.label.expectedAbstention || input.label.expectedNonClaim,
    matchingPrimaryTypes, secondaryTypes,
    sourceAtomEpistemicCorrect: atoms.filter((atom) => atomEpistemicCorrect(atom, input.label)).length,
    sourceAtomEpistemicTotal: atoms.length,
    fieldEpistemicCorrect, fieldEpistemicTotal: fields.length,
    synthesisStatusCorrect: synthesis.filter((status) => input.label.expectedSynthesisStatuses.includes(status)).length,
    synthesisStatusTotal: synthesis.length,
    conditionApplicability: input.label.conditionApplicability,
    conditionCaptured: input.label.conditionApplicability === 'required' ? termsCaptured(input.label.requiredConditionEvidenceTerms, assets, atomById) : null,
    limitationApplicability: input.label.limitationApplicability,
    limitationCaptured: input.label.limitationApplicability === 'required' ? termsCaptured(input.label.requiredLimitationEvidenceTerms, assets, atomById) : null,
    authorityLeakage,
  };
}

export function planSemanticIsolationFallback(input: {
  pairedRequestId: string;
  caseId: string;
  caseCount: number;
  failure: 'zero-validated-atoms' | 'incomplete-case-output' | 'cross-case-contamination' | 'failed-case-isolation';
  priorFallbackCount: number;
  promptFingerprint: string;
  model: string;
  evidenceId: string;
  excerptHash: string;
  schemaFingerprint: string;
}) {
  if (input.caseCount < 2) throw new Error('GATE6B3_FALLBACK_REQUIRES_PAIRED_REQUEST');
  if (input.priorFallbackCount >= 1) throw new Error('GATE6B3_SEMANTIC_ISOLATION_FALLBACK_EXHAUSTED');
  const fingerprint = createHash('sha256').update(JSON.stringify({ pairedRequestId: input.pairedRequestId, caseId: input.caseId, failure: input.failure, promptFingerprint: input.promptFingerprint, model: input.model, evidenceId: input.evidenceId, excerptHash: input.excerptHash, schemaFingerprint: input.schemaFingerprint })).digest('hex');
  return { kind: 'semantic-isolation-fallback', originalPairedRequestId: input.pairedRequestId, caseId: input.caseId, failure: input.failure, attempt: 1, samePrompt: true, sameModel: true, sameEvidence: true, sameSchema: true, pairedAttemptPreserved: true, otherPairedResultUnchanged: true, providerCallCount: 1, requestFingerprint: `sha256:${fingerprint}` };
}
