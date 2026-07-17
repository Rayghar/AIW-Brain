import { createId, type ArchitectureProject, type ProjectReviewAction, type ProjectReviewDecision } from '@aiw/domain';

export interface RecordProjectReviewDecisionInput {
  targetType: ProjectReviewDecision['targetType'];
  targetId: string;
  action: ProjectReviewAction;
  actorId: string;
  comment: string;
  now?: string;
}

/** Records project-candidate governance without conferring knowledge or production authority. */
export function recordProjectReviewDecision(
  project: ArchitectureProject,
  input: RecordProjectReviewDecisionInput,
): { project: ArchitectureProject; decision: ProjectReviewDecision } {
  const next = structuredClone(project);
  const node = next.nodes.find((item) => item.id === input.targetId);
  const finding = next.findings.find((item) => item.id === input.targetId);
  if (input.targetType === 'candidate' && (!node || node.properties.candidateAuthority !== 'candidate'))
    throw new Error('REVIEW_TARGET_NOT_CANDIDATE');
  if (input.targetType === 'graph-object' && !node) throw new Error('REVIEW_TARGET_NOT_FOUND');
  if (input.targetType === 'risk' && !finding) throw new Error('REVIEW_RISK_NOT_FOUND');
  if (input.targetType === 'project' && input.targetId !== next.id) throw new Error('REVIEW_PROJECT_MISMATCH');

  const priorState = node
    ? String(node.properties.reviewDisposition ?? node.properties.candidateLifecycleState ?? node.status)
    : input.targetType === 'risk' ? 'open' : 'candidate-project';
  let resultingState = priorState;
  if (node) {
    if (input.action === 'approve-project-candidate') {
      node.properties.reviewDisposition = 'approved-for-project';
      node.status = 'reviewed';
      resultingState = 'approved-for-project';
    } else if (input.action === 'return-with-comments') {
      node.properties.reviewDisposition = 'changes-requested';
      node.properties.candidateLifecycleState = 'under-review';
      resultingState = 'changes-requested';
    } else if (input.action === 'reject-candidate') {
      node.properties.reviewDisposition = 'rejected';
      node.properties.candidateLifecycleState = 'rejected';
      resultingState = 'rejected';
    } else if (input.action === 'request-evidence') {
      node.properties.reviewDisposition = 'evidence-requested';
      resultingState = 'evidence-requested';
    } else if (input.action === 'request-regeneration') {
      node.properties.reviewDisposition = 'regeneration-requested';
      node.properties.candidateLifecycleState = 'stale';
      resultingState = 'regeneration-requested';
    } else if (input.action === 'record-exception') {
      node.properties.reviewDisposition = 'exception-recorded';
      resultingState = 'exception-recorded';
    }
  } else if (input.action === 'mark-risk-accepted') resultingState = 'risk-accepted-for-project';
  else if (input.action === 'record-exception') resultingState = 'exception-recorded';

  const timestamp = input.now ?? new Date().toISOString();
  const id = createId('project-review');
  const decision: ProjectReviewDecision = {
    id,
    projectId: next.id,
    branchId: next.branch.id,
    targetType: input.targetType,
    targetId: input.targetId,
    action: input.action,
    actorRole: 'reviewer',
    actorId: input.actorId,
    timestamp,
    comment: input.comment.trim(),
    priorState,
    resultingState,
    authority: 'project-candidate-review',
    auditReference: `audit:${id}`,
  };
  next.reviewDecisionLedger = [...(next.reviewDecisionLedger ?? []), decision];
  next.revision += 1;
  next.updatedAt = timestamp;
  return { project: next, decision };
}
