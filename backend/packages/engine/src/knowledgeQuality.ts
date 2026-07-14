import type {
  KnowledgeDepthAssessment,
  KnowledgeDepthDimension,
  KnowledgeDepthPortfolio,
  PatternKnowledgeRecord,
} from '@aiw/domain';

const genericPhrases = [
  'normalized as an aiw',
  'address architecture forces for',
  'use when',
  'evaluate against project constraints',
  'delivery speed versus long-term maintainability',
  'local optimization versus end-to-end system behavior',
  'operational simplicity versus flexibility and scale',
  'misapplying',
  'use an architecture decision record',
];

function richText(value: string | undefined, minimum = 45): boolean {
  return Boolean(value && value.trim().length >= minimum && !/^address architecture forces for/i.test(value.trim()));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function dimension(id: KnowledgeDepthDimension['id'], label: string, score: number, maximum: number, notes: string[]): KnowledgeDepthDimension {
  return { id, label, score: Math.max(0, Math.min(maximum, score)), maximum, notes };
}

export function assessKnowledgeRecordDepth(record: PatternKnowledgeRecord): KnowledgeDepthAssessment {
  const combined = [record.summary, record.problem, ...record.context, ...record.forces, ...record.applicabilityRules, ...record.exclusions, ...record.prerequisites, ...record.risks, ...record.mitigations].join(' ').toLowerCase();
  const genericPhraseMatches = genericPhrases.filter((phrase) => combined.includes(phrase));
  const dimensions: KnowledgeDepthDimension[] = [];

  const specificityNotes: string[] = [];
  let specificity = 0;
  if (richText(record.summary, 60)) specificity += 4; else specificityNotes.push('Summary is generic or too short.');
  if (richText(record.problem, 70)) specificity += 5; else specificityNotes.push('Problem statement does not clearly distinguish the record.');
  if (uniqueStrings(record.context).length >= 2 && record.context.some((item) => item.length >= 55)) specificity += 4; else specificityNotes.push('Context lacks distinct operating conditions.');
  if (genericPhraseMatches.length <= 2) specificity += 2; else specificityNotes.push(`${genericPhraseMatches.length} template phrases reduce editorial specificity.`);
  dimensions.push(dimension('specificity', 'Editorial specificity', specificity, 15, specificityNotes));

  const applicabilityNotes: string[] = [];
  let applicability = 0;
  if (record.applicableStages.length) applicability += 2;
  if (uniqueStrings(record.applicabilityRules).length >= 2) applicability += 4; else applicabilityNotes.push('Add explicit eligibility conditions.');
  if (uniqueStrings(record.exclusions).length >= 2) applicability += 3; else applicabilityNotes.push('Add concrete exclusions and misuse boundaries.');
  if (uniqueStrings(record.prerequisites).length >= 2) applicability += 3; else applicabilityNotes.push('Add verifiable prerequisites.');
  dimensions.push(dimension('applicability', 'Applicability boundaries', applicability, 12, applicabilityNotes));

  const tradeoffNotes: string[] = [];
  let tradeoffs = 0;
  if (uniqueStrings(record.forces).length >= 3 && record.forces.some((item) => item.length >= 45)) tradeoffs += 4; else tradeoffNotes.push('Forces are generic or incomplete.');
  if (uniqueStrings(record.risks).length >= 2) tradeoffs += 3; else tradeoffNotes.push('Add pattern-specific failure modes.');
  if (uniqueStrings(record.mitigations).length >= 2) tradeoffs += 3; else tradeoffNotes.push('Add mitigation guidance tied to risks.');
  if (record.alternatives.length || record.complements.length || record.conflicts.length >= 2) tradeoffs += 2; else tradeoffNotes.push('Add alternatives, complements or conflicts.');
  dimensions.push(dimension('tradeoffs', 'Forces and trade-offs', tradeoffs, 12, tradeoffNotes));

  const evidenceNotes: string[] = [];
  let evidence = 0;
  const distinctConnectors = new Set(record.evidence.map((item) => item.connectorId));
  const claimBound = record.evidence.filter((item) => item.claimIds.length > 0);
  if (record.evidence.length >= 2) evidence += 4; else evidenceNotes.push('Fewer than two evidence sources.');
  if (distinctConnectors.size >= 2) evidence += 3; else evidenceNotes.push('Evidence lacks source diversity.');
  if (record.evidence.some((item) => item.evidenceRole === 'primary')) evidence += 2; else evidenceNotes.push('No primary evidence source.');
  if (claimBound.length) evidence += 3; else evidenceNotes.push('Evidence is source-bound but not claim-bound.');
  if (record.review?.reviewedBy && record.review?.releaseId) evidence += 2;
  dimensions.push(dimension('evidence', 'Evidence and review', evidence, 14, evidenceNotes));

  const operabilityNotes: string[] = [];
  let operability = 0;
  if (record.obligations.length >= 2) operability += 4; else operabilityNotes.push('Add more than one concrete operating obligation.');
  if (record.obligations.some((item) => item.verificationHint.length >= 35)) operability += 2;
  if (record.qualityImpacts.length >= 2 && record.qualityImpacts.every((item) => item.rationale.length >= 45)) operability += 4; else operabilityNotes.push('Quality impacts need pattern-specific rationale.');
  if (record.qualityImpacts.some((item) => item.conditions.length >= 2)) operability += 2; else operabilityNotes.push('Quality impacts lack measurable conditions.');
  dimensions.push(dimension('operability', 'Quality and obligations', operability, 12, operabilityNotes));

  const realizationNotes: string[] = [];
  let realization = 0;
  if (record.providerRealizations.length) realization += 4; else realizationNotes.push('No reviewed realization examples.');
  if (record.providerRealizations.some((item) => item.conditions.length && item.notes.length)) realization += 2;
  dimensions.push(dimension('realization', 'Implementation realizations', realization, 6, realizationNotes));

  const conformanceNotes: string[] = [];
  let conformance = 0;
  if (record.conformanceRules.length) conformance += 5; else conformanceNotes.push('No fitness-function or conformance rule.');
  if (record.conformanceRules.some((item) => item.predicate !== 'require-property')) conformance += 3; else conformanceNotes.push('Conformance is metadata-only rather than structural.');
  dimensions.push(dimension('conformance', 'Conformance depth', conformance, 8, conformanceNotes));

  const topologyNotes: string[] = [];
  let topology = 0;
  if (record.topology?.nodes.length) topology += 6; else topologyNotes.push('No reusable topology.');
  if (record.topology?.edges.length) topology += 4;
  if (record.topology?.boundaryRules.length) topology += 2;
  dimensions.push(dimension('topology', 'Visual topology', topology, 12, topologyNotes));

  const raw = dimensions.reduce((sum, item) => sum + item.score, 0);
  const maximum = dimensions.reduce((sum, item) => sum + item.maximum, 0);
  const score = Math.round(raw / maximum * 100);
  const blockers: string[] = [];
  if (record.lifecycle !== 'approved') blockers.push('Record is not approved.');
  if (!record.evidence.length) blockers.push('Record has no evidence references.');
  if (!record.review?.releaseId) blockers.push('Record is not bound to a knowledge release.');
  const grade = score >= 62 ? 'production-deep' : score >= 48 ? 'production-supporting' : 'needs-enrichment';
  const warnings = dimensions.flatMap((item) => item.notes).slice(0, 12);
  return {
    recordId: record.id,
    recordName: record.name,
    score,
    grade,
    primaryRecommendationEligible: grade === 'production-deep' && blockers.length === 0,
    dimensions,
    blockers,
    warnings,
    genericPhraseMatches,
  };
}

export function assessKnowledgeCorpusDepth(records: PatternKnowledgeRecord[]): KnowledgeDepthPortfolio {
  const assessments = records.map(assessKnowledgeRecordDepth).sort((a, b) => a.score - b.score || a.recordId.localeCompare(b.recordId));
  return {
    assessedAt: new Date().toISOString(),
    recordCount: assessments.length,
    productionDeep: assessments.filter((item) => item.grade === 'production-deep').length,
    productionSupporting: assessments.filter((item) => item.grade === 'production-supporting').length,
    needsEnrichment: assessments.filter((item) => item.grade === 'needs-enrichment').length,
    averageScore: assessments.length ? Math.round(assessments.reduce((sum, item) => sum + item.score, 0) / assessments.length) : 0,
    assessments,
  };
}
