import type {
  ArchitectureProject,
  ContextualRecommendationBundle,
  DesignGuidanceItem,
  Finding,
  KnowledgeLibrary,
} from '@aiw/domain';

function guide(input: Omit<DesignGuidanceItem, 'source' | 'dismissible'> & Partial<Pick<DesignGuidanceItem, 'source' | 'dismissible'>>): DesignGuidanceItem {
  return { source: 'deterministic-knowledge', dismissible: true, ...input };
}

export function deriveDesignGuidance(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  contextual: ContextualRecommendationBundle,
  findings: Finding[],
  selectedNodeId?: string | null,
): DesignGuidanceItem[] {
  const items: DesignGuidanceItem[] = [];
  const stage = project.activeStage;
  const topStyle = contextual.styles.find((item) => item.eligible);
  const topPattern = contextual.patterns.find((item) => item.eligible && item.status === 'not-selected' && item.score >= 65);
  const openObligation = contextual.obligations.find((item) => !item.satisfied);
  const hardFinding = findings.find((item) => item.severity === 'HARD');

  if (stage === 'designIntent') {
    if (!project.description.trim()) items.push(guide({ id: 'GUIDE-BRIEF-PROBLEM', stage, placement: 'brief', priority: 'critical', kind: 'next-step', title: 'Start with the architecture problem', message: 'Describe the business problem, affected users and the boundary of the system before selecting technology.', rationale: 'Pattern applicability depends on context; an empty problem statement makes recommendations generic and unsafe.', linkedRecordIds: [], action: { type: 'none', label: 'Complete problem statement' } }));
    if (!project.objectives.length) items.push(guide({ id: 'GUIDE-BRIEF-OBJECTIVES', stage, placement: 'brief', priority: 'high', kind: 'next-step', title: 'Record measurable outcomes', message: 'Add at least one business or architecture objective that can be used to compare alternatives.', rationale: 'Objectives are the traceability anchor for quality scenarios, decisions and simulations.', linkedRecordIds: [], action: { type: 'none', label: 'Add objectives' } }));
    if (!project.constraints.length) items.push(guide({ id: 'GUIDE-BRIEF-CONSTRAINTS', stage, placement: 'brief', priority: 'high', kind: 'warning', title: 'Capture hard constraints early', message: 'Record regulation, data residency, legacy integration, technology policy, timeline and budget constraints.', rationale: 'Applicability gates can only exclude unsafe options when constraints are explicit.', linkedRecordIds: [], action: { type: 'none', label: 'Add constraints' } }));
    if (project.description.trim() && project.objectives.length && project.constraints.length) items.push(guide({ id: 'GUIDE-BRIEF-TO-QUALITY', stage, placement: 'brief', priority: 'high', kind: 'next-step', title: 'Translate the brief into quality drivers', message: 'Move to Logical Application and prioritize only the quality attributes that truly distinguish acceptable designs.', rationale: 'The recommendation engine uses approved calibrated drivers and records the contribution of each driver.', linkedRecordIds: library.qualityAttributes.filter((item) => item.calibrated).map((item) => item.id), action: { type: 'navigate', label: 'Prioritize quality attributes', target: 'quality' } }));
  }

  if (stage === 'logicalApplication') {
    const weightedCalibrated = project.qualityPriorities.filter((priority) => priority.weight > 0 && library.qualityAttributes.find((item) => item.id === priority.attributeId)?.calibrated);
    const weightedPending = project.qualityPriorities.filter((priority) => priority.weight > 0 && !library.qualityAttributes.find((item) => item.id === priority.attributeId)?.calibrated);
    if (!weightedCalibrated.length) items.push(guide({ id: 'GUIDE-QUALITY-CALIBRATED', stage, placement: 'quality', priority: 'critical', kind: 'next-step', title: 'Choose calibrated decision drivers', message: 'Set weights for availability, performance, scalability, resilience, modifiability, deployability, cost efficiency or simplicity.', rationale: 'Only attributes with approved cross-style calibration can honestly affect deterministic rankings.', linkedRecordIds: library.qualityAttributes.filter((item) => item.calibrated).map((item) => item.id), action: { type: 'none', label: 'Set calibrated weights' } }));
    if (weightedPending.length) items.push(guide({ id: 'GUIDE-QUALITY-PENDING', stage, placement: 'quality', priority: 'medium', kind: 'knowledge-tip', title: 'Pending attributes remain requirements, not score inputs', message: `${weightedPending.map((item) => item.attributeId).join(', ')} ${weightedPending.length === 1 ? 'is' : 'are'} recorded but excluded from ranking until expert calibration is approved.`, rationale: 'AIW never substitutes an invented neutral score for missing architecture evidence.', linkedRecordIds: weightedPending.map((item) => item.attributeId), action: { type: 'open-knowledge', label: 'Review calibration status', target: 'knowledge' } }));
    const hasAcceptedStyle = project.styleDecisions.some((item) => item.stage === stage && item.status === 'accepted' && (!item.scopeNodeId || item.scopeNodeId === selectedNodeId));
    if (!hasAcceptedStyle && topStyle && weightedCalibrated.length) items.push(guide({ id: `GUIDE-STYLE-${topStyle.styleId}`, stage, placement: 'canvas', priority: 'high', kind: 'recommendation', title: `Consider ${topStyle.styleName}`, message: `${topStyle.styleName} currently leads at ${topStyle.score.toFixed(1)} based on the calibrated drivers and recorded context. Review its trade-offs before accepting it.`, rationale: topStyle.strengths[0] ?? topStyle.assumptions[0] ?? 'This is the leading eligible architecture style.', linkedRecordIds: [topStyle.styleId], action: { type: 'accept-style', label: 'Review leading style', target: topStyle.styleId } }));
  }

  if (stage !== 'designIntent' && stage !== 'validationRealization') {
    const stageNodes = project.nodes.filter((node) => node.stage === stage);
    if (!stageNodes.length) items.push(guide({ id: `GUIDE-CANVAS-START-${stage}`, stage, placement: 'canvas', priority: 'high', kind: 'next-step', title: `Start the ${stage} model`, message: 'Add or derive the first canonical architecture object, then let the guide recalculate against the selected scope.', rationale: 'Guidance becomes more precise as typed nodes, relationships and boundaries are recorded.', linkedRecordIds: [], action: { type: 'none', label: 'Add the first object' } }));
    if (topPattern) items.push(guide({ id: `GUIDE-PATTERN-${stage}-${topPattern.patternId}`, stage, placement: selectedNodeId ? 'inspector' : 'canvas', priority: topPattern.score >= 80 ? 'high' : 'medium', kind: 'recommendation', title: `Evaluate ${topPattern.patternName}`, message: topPattern.reasons[0] ?? 'This pattern matches signals in the current design scope.', rationale: `${topPattern.tradeoffs[0] ?? 'Review prerequisites, obligations and conflicts before applying.'}`, linkedRecordIds: [topPattern.patternId], action: { type: 'review-pattern', label: 'Open pattern intelligence', target: topPattern.patternId } }));
    if (openObligation) items.push(guide({ id: `GUIDE-OBLIGATION-${openObligation.sourceRecordId}`, stage, placement: 'canvas', priority: 'medium', kind: 'obligation', title: `Open obligation from ${openObligation.sourceName}`, message: openObligation.obligation, rationale: 'Accepted styles and patterns are incomplete until their operational and governance obligations are addressed.', linkedRecordIds: [openObligation.sourceRecordId], action: { type: 'navigate', label: 'Review obligations', target: 'validationRealization' } }));
  }

  if (stage === 'validationRealization') {
    if (hardFinding) items.push(guide({ id: `GUIDE-HARD-${hardFinding.id}`, stage, placement: 'review', priority: 'critical', kind: 'warning', title: hardFinding.title, message: hardFinding.message, rationale: hardFinding.rationale, linkedRecordIds: [hardFinding.ruleId], action: { type: 'run-audit', label: 'Inspect validation findings' }, dismissible: false }));
    else if (findings.length) items.push(guide({ id: 'GUIDE-REVIEW-FINDINGS', stage, placement: 'review', priority: 'high', kind: 'next-step', title: 'Resolve or explicitly accept architecture findings', message: `${findings.length} deterministic finding(s) remain. Run the co-architect audit for evidence-grounded, reversible proposals.`, rationale: 'Deterministic findings remain authoritative; the model may only propose safe changes.', linkedRecordIds: findings.map((item) => item.ruleId), action: { type: 'run-audit', label: 'Run co-architect audit' } }));
    else items.push(guide({ id: 'GUIDE-REVIEW-AUDIT', stage, placement: 'review', priority: 'medium', kind: 'next-step', title: 'Ask the co-architect for a final design review', message: 'Run a provider-neutral assisted audit to identify missing responsibilities, risks and evidence-backed improvement proposals.', rationale: 'The audit uses the configured LLM route but preserves deterministic validation and human approval.', linkedRecordIds: [], action: { type: 'run-audit', label: 'Run co-architect audit' } }));
  }

  if (contextual.warnings.length) items.push(guide({ id: `GUIDE-CONFLICT-${stage}`, stage, placement: 'global', priority: 'high', kind: 'warning', title: 'Pattern conflict detected', message: contextual.warnings[0]!, rationale: 'Conflicting pattern selections must be resolved before the architecture is approved.', linkedRecordIds: contextual.patterns.filter((item) => item.conflicts.length).flatMap((item) => [item.patternId, ...item.conflicts]), action: { type: 'navigate', label: 'Review pattern composition', target: 'patterns' } }));

  const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  return items.sort((a, b) => order[a.priority] - order[b.priority] || a.id.localeCompare(b.id));
}
