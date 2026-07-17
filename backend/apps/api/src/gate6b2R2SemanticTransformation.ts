import { createHash } from 'node:crypto';
import { z } from 'zod';
import { canonicalEpistemicStatuses } from '@aiw/domain';

export const GATE6B2_R2_PROMPT_VERSION = 'gate-6b2-r2-two-stage-cognition-v1' as const;
export const GATE6B2_R2_SCHEMA_VERSION = 'aiw-gate-6b2-r2-strict-structured-v1' as const;

export const evidenceAtomTypes = [
  'exact-source-statement', 'requirement', 'recommendation', 'example',
  'implementation-observation', 'procedure', 'machine-readable-architecture-fact',
  'condition', 'limitation', 'causal-relationship', 'contradiction-side',
  'non-claim', 'insufficient-evidence-disposition',
] as const;

const candidateIsolation = {
  authority: z.literal('candidate'),
  productionAccepted: z.literal(false),
  automaticPromotionAllowed: z.literal(false),
  designGraphMutationAllowed: z.literal(false),
};

export const gate6b2R2EvidenceAtomSchema = z.object({
  atomId: z.string(),
  caseId: z.string(),
  evidenceId: z.string(),
  atomType: z.enum(evidenceAtomTypes),
  exactSupportText: z.string(),
  supportRole: z.enum(['primary', 'condition', 'limitation', 'context', 'mechanism', 'consequence', 'trade-off', 'contradiction']),
  polarity: z.enum(['affirmed', 'negated', 'conditional', 'unknown']),
  sourceModality: z.enum(['must', 'shall', 'should', 'may', 'can', 'example', 'observed', 'descriptive', 'unknown']),
  proposedEpistemicStatus: z.enum(canonicalEpistemicStatuses),
  occurrenceHint: z.number().nullable(),
  conditionAtomIds: z.array(z.string()),
  limitationAtomIds: z.array(z.string()),
}).strict();

export const gate6b2R2StageASchema = z.object({
  schemaVersion: z.literal(GATE6B2_R2_SCHEMA_VERSION),
  promptVersion: z.literal(GATE6B2_R2_PROMPT_VERSION),
  stage: z.literal('evidence-atom-extraction'),
  ...candidateIsolation,
  cases: z.array(z.object({
    caseId: z.string(),
    disposition: z.enum(['atoms-proposed', 'non-claim', 'abstain-insufficient-evidence']),
    additionalEvidenceRequired: z.array(z.string()),
    atoms: z.array(gate6b2R2EvidenceAtomSchema),
  }).strict()),
}).strict();

export type Gate6b2R2StageAOutput = z.infer<typeof gate6b2R2StageASchema>;
export type Gate6b2R2EvidenceAtom = z.infer<typeof gate6b2R2EvidenceAtomSchema>;

export const gate6b2R2AssetTypes = [
  'atomic-claim', 'source-example', 'implementation-observation', 'procedure-or-runbook-step',
  'pattern-dna', 'architecture-genome-fragment', 'contradiction-or-scoped-distinction',
  'interface-obligation', 'data-obligation', 'security-obligation', 'resilience-obligation',
  'source-reference', 'non-claim', 'abstention',
] as const;

export const gate6b2R2StageBSchema = z.object({
  schemaVersion: z.literal(GATE6B2_R2_SCHEMA_VERSION),
  promptVersion: z.literal(GATE6B2_R2_PROMPT_VERSION),
  stage: z.literal('typed-architecture-asset-synthesis'),
  ...candidateIsolation,
  cases: z.array(z.object({
    caseId: z.string(),
    disposition: z.enum(['candidate-assets', 'non-claim', 'abstain-insufficient-evidence', 'rejected-semantic-output']),
    additionalEvidenceRequired: z.array(z.string()),
    assets: z.array(z.object({
      assetId: z.string(),
      caseId: z.string(),
      assetType: z.enum(gate6b2R2AssetTypes),
      statement: z.string(),
      epistemicStatus: z.enum(canonicalEpistemicStatuses),
      supportingAtomIds: z.array(z.string()),
      fields: z.array(z.object({
        fieldName: z.string(),
        value: z.string(),
        knowledgeState: z.enum(['stated', 'unknown', 'not-stated', 'not-applicable', 'requires-additional-evidence']),
        supportingAtomIds: z.array(z.string()),
      }).strict()),
      conditions: z.array(z.object({ value: z.string(), supportingAtomIds: z.array(z.string()) }).strict()),
      limitations: z.array(z.object({ value: z.string(), supportingAtomIds: z.array(z.string()) }).strict()),
      reviewRequired: z.literal(true),
      ...candidateIsolation,
    }).strict()),
  }).strict()),
}).strict();

export type Gate6b2R2StageBOutput = z.infer<typeof gate6b2R2StageBSchema>;
export type Gate6b2R2Asset = Gate6b2R2StageBOutput['cases'][number]['assets'][number];

export interface Gate6b2R2EvidenceInput {
  caseId: string;
  evidenceId: string;
  excerpt: string;
  excerptHash: string;
}

export interface ResolvedEvidenceAtom extends Gate6b2R2EvidenceAtom {
  resolvedStart: number;
  resolvedEnd: number;
  excerptHash: string;
  quotationValidation: 'exact-unique-match' | 'exact-occurrence-hint-match';
}

export interface EvidenceAtomGateResult {
  acceptedAtoms: ResolvedEvidenceAtom[];
  rejectedAtoms: Array<{ atom: Gate6b2R2EvidenceAtom; reason: string }>;
  exactEvidenceLineage: boolean;
  crossCaseContamination: number;
  crossSourceContamination: number;
}

function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }

function newlineView(value: string): { text: string; starts: number[]; ends: number[] } {
  let text = '';
  const starts: number[] = [];
  const ends: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '\r' && value[i + 1] === '\n') {
      starts.push(i); ends.push(i + 2); text += '\n'; i += 1;
    } else {
      starts.push(i); ends.push(i + 1); text += value[i];
    }
  }
  return { text, starts, ends };
}

export function resolveExactSupportQuotation(atom: Gate6b2R2EvidenceAtom, evidence: Gate6b2R2EvidenceInput): ResolvedEvidenceAtom {
  if (atom.caseId !== evidence.caseId || atom.evidenceId !== evidence.evidenceId) throw new Error('R2_EVIDENCE_LINEAGE_MISMATCH');
  if (sha256(evidence.excerpt) !== evidence.excerptHash.replace(/^sha256:/, '')) throw new Error('R2_EXCERPT_HASH_MISMATCH');
  const source = newlineView(evidence.excerpt);
  const quote = atom.exactSupportText.replace(/\r\n/g, '\n');
  const matches: number[] = [];
  let from = 0;
  while (from <= source.text.length) {
    const found = source.text.indexOf(quote, from);
    if (found < 0) break;
    matches.push(found);
    from = found + Math.max(1, quote.length);
  }
  if (!matches.length) throw new Error('R2_EXACT_SUPPORT_QUOTATION_NOT_FOUND');
  if (matches.length > 1 && atom.occurrenceHint === null) throw new Error('R2_EXACT_SUPPORT_QUOTATION_AMBIGUOUS');
  const occurrence = atom.occurrenceHint ?? 1;
  if (!Number.isInteger(occurrence) || occurrence < 1) throw new Error('R2_OCCURRENCE_HINT_INVALID');
  if (occurrence > matches.length) throw new Error('R2_OCCURRENCE_HINT_OUT_OF_RANGE');
  const normalizedStart = matches[occurrence - 1]!;
  const normalizedEnd = normalizedStart + quote.length;
  const resolvedStart = source.starts[normalizedStart]!;
  const resolvedEnd = source.ends[normalizedEnd - 1]!;
  return {
    ...atom, resolvedStart, resolvedEnd, excerptHash: evidence.excerptHash,
    quotationValidation: matches.length === 1 ? 'exact-unique-match' : 'exact-occurrence-hint-match',
  };
}

export function validateEvidenceAtomGate(output: Gate6b2R2StageAOutput, evidenceInputs: Gate6b2R2EvidenceInput[]): EvidenceAtomGateResult {
  gate6b2R2StageASchema.parse(output);
  const evidenceByCase = new Map(evidenceInputs.map((item) => [item.caseId, item]));
  const acceptedAtoms: ResolvedEvidenceAtom[] = [];
  const rejectedAtoms: EvidenceAtomGateResult['rejectedAtoms'] = [];
  let crossCaseContamination = 0;
  let crossSourceContamination = 0;
  for (const caseOutput of output.cases) for (const atom of caseOutput.atoms) {
    const evidence = evidenceByCase.get(atom.caseId);
    if (!evidence || atom.caseId !== caseOutput.caseId) {
      crossCaseContamination += 1; rejectedAtoms.push({ atom, reason: 'R2_CROSS_CASE_CONTAMINATION' }); continue;
    }
    if (atom.evidenceId !== evidence.evidenceId) {
      crossSourceContamination += 1; rejectedAtoms.push({ atom, reason: 'R2_CROSS_SOURCE_CONTAMINATION' }); continue;
    }
    try { acceptedAtoms.push(resolveExactSupportQuotation(atom, evidence)); }
    catch (error) { rejectedAtoms.push({ atom, reason: error instanceof Error ? error.message : 'R2_ATOM_REJECTED' }); }
  }
  const acceptedIds = new Set(acceptedAtoms.map((atom) => atom.atomId));
  const duplicateIds = acceptedAtoms.filter((atom, index) => acceptedAtoms.findIndex((other) => other.atomId === atom.atomId) !== index);
  for (const duplicate of duplicateIds) {
    acceptedIds.delete(duplicate.atomId);
    rejectedAtoms.push({ atom: duplicate, reason: 'R2_DUPLICATE_ATOM_ID' });
  }
  const linkageInvalid = acceptedAtoms.filter((atom) => [...atom.conditionAtomIds, ...atom.limitationAtomIds].some((id) => !acceptedIds.has(id)));
  for (const invalid of linkageInvalid) rejectedAtoms.push({ atom: invalid, reason: 'R2_LINKED_ATOM_NOT_VALIDATED' });
  const invalidIds = new Set([...duplicateIds, ...linkageInvalid].map((atom) => atom.atomId));
  const finalAccepted = acceptedAtoms.filter((atom) => !invalidIds.has(atom.atomId));
  return { acceptedAtoms: finalAccepted, rejectedAtoms, exactEvidenceLineage: crossCaseContamination === 0 && crossSourceContamination === 0, crossCaseContamination, crossSourceContamination };
}

export interface TypedAssetGateResult {
  acceptedAssets: Gate6b2R2Asset[];
  rejectedAssets: Array<{ asset: Gate6b2R2Asset; reasons: string[] }>;
  crossCaseContamination: number;
  authorityLeakage: number;
}

export function validateTypedAssetGate(output: Gate6b2R2StageBOutput, atoms: ResolvedEvidenceAtom[]): TypedAssetGateResult {
  gate6b2R2StageBSchema.parse(output);
  const atomById = new Map(atoms.map((atom) => [atom.atomId, atom]));
  const acceptedAssets: Gate6b2R2Asset[] = [];
  const rejectedAssets: TypedAssetGateResult['rejectedAssets'] = [];
  let crossCaseContamination = 0;
  let authorityLeakage = 0;
  for (const caseOutput of output.cases) for (const asset of caseOutput.assets) {
    const reasons: string[] = [];
    if (asset.caseId !== caseOutput.caseId) { reasons.push('R2_ASSET_CROSS_CASE_CONTAMINATION'); crossCaseContamination += 1; }
    if (asset.authority !== 'candidate' || asset.productionAccepted || asset.automaticPromotionAllowed || asset.designGraphMutationAllowed) {
      reasons.push('R2_ASSET_AUTHORITY_LEAKAGE'); authorityLeakage += 1;
    }
    const references = [
      ...asset.supportingAtomIds,
      ...asset.fields.flatMap((field) => field.supportingAtomIds),
      ...asset.conditions.flatMap((field) => field.supportingAtomIds),
      ...asset.limitations.flatMap((field) => field.supportingAtomIds),
    ];
    for (const atomId of references) {
      const atom = atomById.get(atomId);
      if (!atom) reasons.push(`R2_UNVALIDATED_ATOM_REFERENCE:${atomId}`);
      else if (atom.caseId !== asset.caseId) { reasons.push(`R2_ATOM_CASE_MISMATCH:${atomId}`); crossCaseContamination += 1; }
    }
    for (const field of asset.fields) {
      if (field.knowledgeState === 'stated' && field.supportingAtomIds.length === 0) reasons.push(`R2_STATED_FIELD_WITHOUT_ATOM:${field.fieldName}`);
      if (field.knowledgeState !== 'stated' && field.value.trim() && !['unknown', 'not stated', 'not applicable', 'requires additional evidence'].includes(field.value.trim().toLowerCase())) reasons.push(`R2_UNSUPPORTED_FIELD_MUST_BE_UNKNOWN:${field.fieldName}`);
    }
    if (asset.assetType === 'pattern-dna') {
      for (const required of ['context-or-trigger', 'mechanism', 'consequence', 'trade-off-or-limitation']) {
        const field = asset.fields.find((item) => item.fieldName === required);
        if (!field || field.knowledgeState !== 'stated' || !field.supportingAtomIds.length) reasons.push(`R2_PATTERN_DNA_FIELD_REQUIRED:${required}`);
      }
    }
    if (reasons.length) rejectedAssets.push({ asset, reasons }); else acceptedAssets.push(asset);
  }
  return { acceptedAssets, rejectedAssets, crossCaseContamination, authorityLeakage };
}

export function deterministicNoEvidenceControl(caseId = 'G6B1-24') {
  return {
    caseId, disposition: 'abstain-insufficient-evidence' as const, evidenceAvailable: false,
    providerCalls: 0, additionalEvidenceRequired: ['a governed bounded source passage'],
    candidateClaimsCreated: 0, authority: 'candidate' as const, productionAccepted: false,
    automaticPromotionAllowed: false, designGraphMutationAllowed: false,
  };
}
