import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { knowledgeRepositoryConnectors, patternAtomicClaimReceipts, sprint78PatternCorpus } from '@aiw/domain';

export interface EvidenceEntailmentSource {
  id: string;
  recordId: string;
  title: string;
  statement: string;
  sourceReleaseId: string;
  activeKnowledgeReleaseId: string;
  connectorId?: string;
  trustTier?: number;
  reviewStatus: 'verified' | 'candidate';
  evidenceRole?: string;
}

export interface ApprovedGroundingSource extends EvidenceEntailmentSource {
  reviewStatus: 'verified';
}

export interface ApprovedKnowledgeGroundingPack {
  schemaVersion: '1.0';
  activeKnowledgeReleaseId: string;
  generatedAt: string;
  sourceFingerprint: string;
  allowedReferenceIds: string[];
  sources: ApprovedGroundingSource[];
  excluded: Array<{ id: string; reason: string }>;
}

const convertedKnowledge = JSON.parse(readFileSync(fileURLToPath(new URL('../../../data/rc10_73_5-knowledge-objects.json', import.meta.url)), 'utf8')) as { objects: Array<{ objectClass: string; claimId?: string; subjectId?: string; statement?: string; provenance?: { connectorId?: string }; review?: { status?: string }; authority?: { reasoningEligible?: boolean }; }> };

const STOP = new Set(['the','and','for','that','with','from','this','into','only','when','its','are','was','were','will','should','must','have','has','not','but','can','may','your','their','they']);

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length > 3 && !STOP.has(item)));
}

function overlapScore(statement: string, evidence: string): number {
  const left = tokens(statement);
  const right = tokens(evidence);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.min(left.size, right.size);
}

export function buildApprovedKnowledgeGroundingPack(input: {
  activeKnowledgeReleaseId: string;
  recordIds: Iterable<string>;
  now?: string;
}): ApprovedKnowledgeGroundingPack {
  const requested = new Set(input.recordIds);
  const records = sprint78PatternCorpus.filter((record) => requested.has(record.id) && record.lifecycle === 'approved');
  const recordIds = new Set(records.map((record) => record.id));
  const connectors = new Map(knowledgeRepositoryConnectors.map((item) => [item.id, item]));
  const sources: ApprovedGroundingSource[] = [];
  for (const record of records) {
    sources.push({
      id: record.id,
      recordId: record.id,
      title: record.name,
      statement: [record.summary, record.problem, ...record.context, ...record.forces, ...record.applicabilityRules, ...record.exclusions, ...record.prerequisites, ...record.obligations.map((item) => `${item.title}: ${item.description}`), ...record.risks, ...record.mitigations].filter(Boolean).join(' '),
      sourceReleaseId: record.review.releaseId,
      activeKnowledgeReleaseId: input.activeKnowledgeReleaseId,
      reviewStatus: 'verified',
    });
  }
  for (const claim of patternAtomicClaimReceipts.filter((item) => recordIds.has(item.patternRecordId) && item.reviewStatus === 'verified')) {
    const connector = connectors.get(claim.connectorId);
    sources.push({
      id: claim.id,
      recordId: claim.patternRecordId,
      title: `${claim.patternRecordId} ${claim.claimType}`,
      statement: claim.statement,
      sourceReleaseId: claim.releaseId,
      activeKnowledgeReleaseId: input.activeKnowledgeReleaseId,
      connectorId: claim.connectorId,
      ...(connector ? { trustTier: connector.trustTier } : {}),
      reviewStatus: 'verified',
      evidenceRole: claim.evidenceRole,
    });
  }
  for (const claim of convertedKnowledge.objects.filter((item) => item.objectClass === 'atomic-source-claim' && item.subjectId && requested.has(item.subjectId) && item.review?.status === 'verified' && item.authority?.reasoningEligible)) {
    if (!claim.claimId || !claim.subjectId || !claim.statement) continue;
    sources.push({
      id: claim.claimId,
      recordId: claim.subjectId,
      title: `${claim.subjectId} approved source claim`,
      statement: claim.statement,
      sourceReleaseId: 'AKR-0.10.73.5',
      activeKnowledgeReleaseId: input.activeKnowledgeReleaseId,
      ...(claim.provenance?.connectorId ? { connectorId: claim.provenance.connectorId } : {}),
      reviewStatus: 'verified',
      evidenceRole: 'direct-source-claim',
    });
  }
  const excluded = [...requested].filter((id) => !recordIds.has(id)).map((id) => ({ id, reason: 'Record is absent from the approved Pattern DNA corpus or is not approved.' }));
  const canonical = sources.map((item) => `${item.id}|${item.recordId}|${item.statement}|${item.sourceReleaseId}`).sort().join('\n');
  return {
    schemaVersion: '1.0',
    activeKnowledgeReleaseId: input.activeKnowledgeReleaseId,
    generatedAt: input.now ?? new Date().toISOString(),
    sourceFingerprint: `sha256:${createHash('sha256').update(canonical).digest('hex')}`,
    allowedReferenceIds: sources.map((item) => item.id),
    sources,
    excluded,
  };
}


function containsUnsupportedAbsolute(output: string, evidence: string): boolean {
  const absolutePatterns = [
    /\bguarantee(?:s|d)?\b/i,
    /\bunlimited\b/i,
    /\bzero\s+(?:latency|cost|risk|downtime|defects?)\b/i,
    /\b(?:always|never)\b/i,
    /\b100\s*%\b/i,
    /\bwithout\s+(?:any\s+)?(?:cost|risk|trade-?off|failure)\b/i,
  ];
  return absolutePatterns.some((pattern) => pattern.test(output) && !pattern.test(evidence));
}

function containsUnsupportedNumber(output: string, evidence: string): boolean {
  const numbers = output.match(/\b\d+(?:\.\d+)?\s*(?:%|ms\b|seconds?\b|minutes?\b|hours?\b|tps\b|rps\b|x\b)/gi) ?? [];
  return numbers.some((number) => !evidence.toLowerCase().includes(number.toLowerCase()));
}

export interface EvidenceSupportScore {
  lexicalClaimCoverage: number;
  supportScore: number;
  riskFlags: Array<'unsupported-absolute' | 'unsupported-number' | 'condition-omission' | 'limitation-omission' | 'negation-mismatch'>;
}

export function scoreEvidenceSupport(output: string, evidence: string, precisionMode = false): EvidenceSupportScore {
  const riskFlags: EvidenceSupportScore['riskFlags'] = [];
  if (containsUnsupportedAbsolute(output, evidence)) riskFlags.push('unsupported-absolute');
  if (containsUnsupportedNumber(output, evidence)) riskFlags.push('unsupported-number');
  if (precisionMode) {
    const evidenceHasCondition = /\b(?:if|when|only when|provided that|requires?|subject to)\b/i.test(evidence);
    const outputRetainsCondition = /\b(?:if|when|only when|provided that|requires?|subject to|condition)\b/i.test(output);
    if (evidenceHasCondition && !outputRetainsCondition) riskFlags.push('condition-omission');
    const evidenceHasLimitation = /\b(?:however|except|unless|beyond (?:the )?scope|does not|cannot|limitation|trade-?off|risk)\b/i.test(evidence);
    const outputRetainsLimitation = /\b(?:however|except|unless|scope|does not|cannot|limitation|trade-?off|risk)\b/i.test(output);
    if (evidenceHasLimitation && !outputRetainsLimitation) riskFlags.push('limitation-omission');
    const evidenceHasNegation = /\b(?:not|never|cannot|must not|may not|prohibited)\b/i.test(evidence);
    const outputHasNegation = /\b(?:not|never|cannot|must not|may not|prohibited)\b/i.test(output);
    if (evidenceHasNegation && !outputHasNegation) riskFlags.push('negation-mismatch');
  }
  const lexicalClaimCoverage = Number(overlapScore(output, evidence).toFixed(4));
  return { lexicalClaimCoverage, supportScore: riskFlags.length ? 0 : lexicalClaimCoverage, riskFlags };
}

export interface EvidenceEntailmentItem {
  referenceId: string;
  supportScore: number;
  status: 'supported' | 'weak' | 'unsupported' | 'missing-source';
  lexicalClaimCoverage?: number;
  riskFlags?: EvidenceSupportScore['riskFlags'];
  sourceStatement?: string;
}

export interface EvidenceEntailmentReceipt {
  verified: boolean;
  threshold: number;
  citedReferenceIds: string[];
  items: EvidenceEntailmentItem[];
  unsupportedReferenceIds: string[];
}

export function verifyEvidenceEntailment(input: {
  outputText: string;
  citedReferenceIds: Iterable<string>;
  sources: EvidenceEntailmentSource[];
  threshold?: number;
  precisionMode?: boolean;
}): EvidenceEntailmentReceipt {
  const threshold = input.threshold ?? 0.5;
  const sourceById = new Map(input.sources.map((item) => [item.id, item]));
  const citedReferenceIds = [...new Set(input.citedReferenceIds)];
  const items = citedReferenceIds.map((referenceId): EvidenceEntailmentItem => {
    const source = sourceById.get(referenceId);
    if (!source) return { referenceId, supportScore: 0, status: 'missing-source' };
    const evidenceText = `${source.title} ${source.statement}`;
    const score = scoreEvidenceSupport(input.outputText, evidenceText, input.precisionMode ?? false);
    const supportScore = score.supportScore;
    const status = supportScore >= threshold ? 'supported' : supportScore >= threshold / 2 ? 'weak' : 'unsupported';
    return { referenceId, supportScore, lexicalClaimCoverage: score.lexicalClaimCoverage, riskFlags: score.riskFlags, status, sourceStatement: source.statement };
  });
  const unsupportedReferenceIds = items.filter((item) => item.status === 'unsupported' || item.status === 'missing-source'
    || ((input.precisionMode ?? false) && item.status === 'weak')).map((item) => item.referenceId);
  return { verified: unsupportedReferenceIds.length === 0, threshold, citedReferenceIds, items, unsupportedReferenceIds };
}
