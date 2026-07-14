import type {
  AiwLifecycleStage,
  BrainSignal,
  BrainSignalCategory,
  BrainSignalSeverity,
  BrainSignalSourceType,
} from '@aiw/brain-runtime';

function mapStage(stage?: string): AiwLifecycleStage {
  switch (stage) {
    case 'designIntent': return 'requirements-intent';
    case 'systemContext': return 'system-context';
    case 'logicalApplication': return 'logical-application';
    case 'applicationRealization': return 'application-realization';
    case 'logicalTechnology': return 'logical-technology';
    case 'physicalTechnology': return 'physical-technology';
    case 'validationRealization': return 'review-assurance';
    default: return 'logical-application';
  }
}

function sourceType(origin?: string): BrainSignalSourceType {
  if (origin === 'approved-knowledge') return 'knowledge';
  if (origin === 'runtime-evidence') return 'system';
  if (origin === 'enterprise-policy') return 'system';
  return 'deterministic';
}

function categoryOf(finding: any): BrainSignalCategory {
  const haystack = `${finding.category ?? ''} ${finding.title ?? ''} ${finding.detail ?? ''}`.toLowerCase();
  if (haystack.includes('interface') || haystack.includes('contract')) return 'interface-critique';
  if (haystack.includes('pattern')) return 'pattern-fit';
  if (haystack.includes('style')) return 'style-fit';
  if (haystack.includes('evidence')) return 'evidence-quality';
  if (haystack.includes('security') || haystack.includes('policy')) return 'security-governance';
  if (haystack.includes('sdd') || haystack.includes('handoff')) return 'sdd-readiness';
  if (haystack.includes('review') || haystack.includes('approval')) return 'review-readiness';
  return 'object-completeness';
}

function severityOf(finding: any): BrainSignalSeverity {
  if (finding.severity === 'SIGNIFICANT') return finding.category === 'policy' ? 'blocker' : 'warning';
  if (finding.category === 'trade-off' || finding.category === 'assumption') return 'review';
  return 'hint';
}

function evidenceRefs(intelligence: any, refs: string[]) {
  return refs.map((id) => ({
    id,
    label: id,
    sourceType: 'knowledge-record' as const,
    confidence: intelligence?.confidence === 'high' ? 0.9 : 0.7,
  }));
}

/**
 * Converts the single canonical IntelligenceResponse into UI signals.
 * It does not recompute architectural truth. Local brain-runtime rules are presentation
 * projections only and are merged later with canonical-kernel precedence.
 */
export function adaptKernelIntelligenceToSignals(intelligence: any): BrainSignal[] {
  if (!intelligence?.context) return [];
  const stage = mapStage(intelligence.context.stage);
  const confidence = intelligence.confidence === 'high' ? 0.9 : 0.72;
  const now = intelligence.trace?.at ?? new Date().toISOString();
  const knowledgeReleaseId = intelligence.evidence?.knowledgeReleaseId;
  const signals: BrainSignal[] = [];

  for (const [index, finding] of (intelligence.findings ?? []).entries()) {
    const refs = Array.isArray(finding.kbRefs) ? finding.kbRefs : [];
    const objectId = finding.affectedIds?.[0];
    signals.push({
      id: `kernel-finding:${intelligence.trace?.id ?? 'state'}:${index}`,
      stage,
      category: categoryOf(finding),
      sourceType: sourceType(finding.origin),
      authority: 'authoritative-kernel',
      ...(objectId ? { objectId } : {}),
      severity: severityOf(finding),
      confidence,
      title: finding.title,
      shortMessage: finding.detail,
      detail: `${finding.detail}${intelligence.explanation?.ifIgnored ? ` If ignored: ${intelligence.explanation.ifIgnored}` : ''}`,
      recommendedAction: intelligence.nextBestActions?.[0]?.title,
      evidence: evidenceRefs(intelligence, refs),
      surfaces: finding.severity === 'SIGNIFICANT'
        ? ['canvas-badge','stage-health-chip','info-center','decision-radar']
        : ['canvas-badge','info-center'],
      dismissible: finding.severity !== 'SIGNIFICANT',
      createdAt: now,
    });
  }

  for (const [index, recommendation] of (intelligence.recommendations ?? []).entries()) {
    signals.push({
      id: `kernel-style:${intelligence.trace?.id ?? 'state'}:${recommendation.styleId}`,
      stage,
      category: 'style-fit',
      sourceType: 'deterministic',
      authority: 'authoritative-kernel',
      styleId: recommendation.styleId,
      severity: index === 0 ? 'recommendation' : 'silent',
      confidence: Math.max(0.45, Math.min(0.95, Number(recommendation.score ?? 0) / 100)),
      title: index === 0 ? `${recommendation.styleName} is the current best-fit style` : `${recommendation.styleName} remains an alternative`,
      shortMessage: intelligence.explanation?.whyNow ?? `Ranked from the current drivers, constraints and approved release ${knowledgeReleaseId ?? 'unknown'}.`,
      detail: `${intelligence.explanation?.whyHere ?? ''} ${intelligence.explanation?.alternatives?.length ? `Alternatives: ${intelligence.explanation.alternatives.join('; ')}` : ''}`.trim(),
      recommendedAction: index === 0 ? 'Review the evidence and trade-offs before accepting the style.' : 'Compare this alternative before recording the style decision.',
      evidence: evidenceRefs(intelligence, intelligence.evidence?.kbRefs ?? []),
      surfaces: index === 0 ? ['silent-ranking','library-chip','bottom-brain-signal','info-center','decision-radar'] : ['silent-ranking','info-center'],
      dismissible: true,
      createdAt: now,
    });
  }

  for (const [index, missing] of (intelligence.missingAttributes ?? []).entries()) {
    signals.push({
      id: `kernel-missing:${intelligence.trace?.id ?? 'state'}:${missing.subjectId}:${missing.attribute}:${index}`,
      stage,
      category: 'object-completeness',
      sourceType: 'deterministic',
      authority: 'authoritative-kernel',
      objectId: missing.subjectId,
      severity: 'warning',
      confidence,
      title: `Define ${missing.attribute}`,
      shortMessage: missing.question,
      detail: `The canonical intelligence kernel identified a missing architecture property on ${missing.subjectId}.`,
      recommendedAction: 'Open the object inspector and complete the governed property.',
      evidence: knowledgeReleaseId ? [{ id: knowledgeReleaseId, label: `Approved release ${knowledgeReleaseId}`, sourceType: 'audit', confidence }] : [],
      surfaces: ['canvas-badge','stage-health-chip','info-center'],
      dismissible: false,
      createdAt: now,
    });
  }

  for (const [index, action] of (intelligence.nextBestActions ?? []).slice(0, 4).entries()) {
    signals.push({
      id: `kernel-action:${action.id ?? index}`,
      stage,
      category: 'review-readiness',
      sourceType: 'deterministic',
      authority: 'authoritative-kernel',
      severity: 'recommendation',
      confidence: Math.max(0.5, Math.min(0.95, Number(action.score ?? 65) / 100)),
      title: action.title,
      shortMessage: action.detail,
      detail: action.why,
      recommendedAction: action.title,
      evidence: evidenceRefs(intelligence, action.kbRefs ?? []),
      surfaces: index === 0 ? ['bottom-brain-signal','info-center'] : ['info-center'],
      dismissible: true,
      createdAt: now,
    });
  }
  return signals;
}

function semanticKey(signal: BrainSignal): string {
  return [signal.category, signal.objectId ?? '', signal.patternId ?? '', signal.styleId ?? '', signal.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()].join('|');
}

export function mergeKernelAndPresentationSignals(kernelSignals: BrainSignal[], presentationSignals: BrainSignal[]): BrainSignal[] {
  const authoritativeKeys = new Set(kernelSignals.map(semanticKey));
  const objectCategoryKeys = new Set(kernelSignals.filter((signal) => signal.objectId).map((signal) => `${signal.category}|${signal.objectId}`));
  const filteredPresentation = presentationSignals.filter((signal) => {
    if (authoritativeKeys.has(semanticKey(signal))) return false;
    if (signal.objectId && objectCategoryKeys.has(`${signal.category}|${signal.objectId}`)) return false;
    return true;
  });
  return [...kernelSignals, ...filteredPresentation];
}
