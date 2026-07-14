import {
  createId,
  type ArchitectureProject,
  type ArchitectureStage,
  type CollaborationOperationBatch,
  type DiscussionThread,
  type MergeConflict,
  type MergePlan,
  type ProjectMember,
  type ProjectPermission,
  type ProjectRole,
  type ReviewAssignment,
  type WorkbenchNotification,
} from '@aiw/domain';
import { compareBranches } from './branches.js';

const rolePermissions: Record<ProjectRole, ProjectPermission[]> = {
  owner: ['project.read', 'project.edit', 'branch.create', 'branch.merge', 'review.assign', 'review.decide', 'approval.request', 'approval.decide', 'comment.create', 'comment.resolve', 'member.manage', 'rulepack.manage', 'artifact.generate'],
  architect: ['project.read', 'project.edit', 'branch.create', 'approval.request', 'comment.create', 'comment.resolve', 'artifact.generate'],
  reviewer: ['project.read', 'review.decide', 'approval.decide', 'comment.create', 'comment.resolve'],
  governance: ['project.read', 'review.assign', 'review.decide', 'approval.decide', 'comment.create', 'comment.resolve', 'rulepack.manage', 'artifact.generate'],
  contributor: ['project.read', 'project.edit', 'comment.create', 'artifact.generate'],
  viewer: ['project.read'],
};

export function permissionsForRole(role: ProjectRole): ProjectPermission[] {
  return [...rolePermissions[role]];
}

export function canPerform(project: ArchitectureProject, actorId: string, permission: ProjectPermission): boolean {
  const member = project.members.find((item) => item.id === actorId && item.status === 'active');
  return Boolean(member && rolePermissions[member.role].includes(permission));
}

function notify(project: ArchitectureProject, notification: Omit<WorkbenchNotification, 'id' | 'createdAt'>, now: string): void {
  project.notifications.unshift({ ...notification, id: createId('notification'), createdAt: now });
}

function dueDate(days: number, now: Date): string {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

export function assignReview(
  projectInput: ArchitectureProject,
  input: {
    stage: ArchitectureStage;
    assignedTo: string;
    assignedBy: string;
    instructions?: string | undefined;
    priority?: ReviewAssignment['priority'] | undefined;
    snapshotId?: string | undefined;
  },
  now = new Date(),
): ArchitectureProject {
  const project = structuredClone(projectInput);
  if (!canPerform(project, input.assignedBy, 'review.assign') && !canPerform(project, input.assignedBy, 'approval.request')) {
    throw new Error('FORBIDDEN_REVIEW_ASSIGNMENT');
  }
  const assignee = project.members.find((item) => item.id === input.assignedTo && item.status === 'active');
  if (!assignee || !['reviewer', 'governance', 'owner'].includes(assignee.role)) throw new Error('INVALID_REVIEWER');
  if (project.collaborationSettings.requireIndependentReviewer && input.assignedBy === input.assignedTo) throw new Error('INDEPENDENT_REVIEWER_REQUIRED');
  const timestamp = now.toISOString();
  const assignment: ReviewAssignment = {
    id: createId('review'),
    stage: input.stage,
    branchId: project.branch.id,
    snapshotId: input.snapshotId,
    assignedTo: input.assignedTo,
    assignedBy: input.assignedBy,
    status: 'open',
    priority: input.priority ?? 'normal',
    instructions: input.instructions?.trim() || `Review the ${input.stage} architecture stage against its submitted baseline.`,
    dueAt: dueDate(project.collaborationSettings.reviewDueDays, now),
    createdAt: timestamp,
  };
  project.reviewAssignments.unshift(assignment);
  notify(project, {
    recipientId: input.assignedTo,
    type: 'review-assigned',
    title: `Architecture review assigned: ${input.stage}`,
    message: assignment.instructions,
    targetType: 'review',
    targetId: assignment.id,
  }, timestamp);
  project.revision += 1;
  project.updatedAt = timestamp;
  return project;
}

export function completeReview(projectInput: ArchitectureProject, assignmentId: string, actorId: string, now = new Date()): ArchitectureProject {
  const project = structuredClone(projectInput);
  const assignment = project.reviewAssignments.find((item) => item.id === assignmentId);
  if (!assignment) throw new Error('REVIEW_NOT_FOUND');
  if (assignment.assignedTo !== actorId && !canPerform(project, actorId, 'review.decide')) throw new Error('FORBIDDEN_REVIEW_DECISION');
  assignment.status = 'completed';
  assignment.completedAt = now.toISOString();
  project.revision += 1;
  project.updatedAt = now.toISOString();
  return project;
}

export function createDiscussion(
  projectInput: ArchitectureProject,
  input: { actorId: string; targetType: DiscussionThread['targetType']; targetId: string; title: string; body: string },
  now = new Date(),
): ArchitectureProject {
  const project = structuredClone(projectInput);
  if (!canPerform(project, input.actorId, 'comment.create')) throw new Error('FORBIDDEN_COMMENT');
  const timestamp = now.toISOString();
  const mentioned = project.members.filter((member) => input.body.includes(`@${member.displayName}`) || input.body.includes(`@${member.email}`));
  const thread: DiscussionThread = {
    id: createId('thread'),
    targetType: input.targetType,
    targetId: input.targetId,
    title: input.title.trim() || 'Architecture discussion',
    status: 'open',
    createdBy: input.actorId,
    createdAt: timestamp,
    participantIds: Array.from(new Set([input.actorId, ...mentioned.map((item) => item.id)])),
    comments: [{ id: createId('comment'), authorId: input.actorId, body: input.body.trim(), createdAt: timestamp }],
  };
  project.discussionThreads.unshift(thread);
  for (const member of mentioned) {
    notify(project, {
      recipientId: member.id,
      type: 'mention',
      title: `You were mentioned: ${thread.title}`,
      message: input.body,
      targetType: input.targetType,
      targetId: input.targetId,
    }, timestamp);
  }
  project.revision += 1;
  project.updatedAt = timestamp;
  return project;
}

export function addDiscussionComment(projectInput: ArchitectureProject, threadId: string, actorId: string, body: string, now = new Date()): ArchitectureProject {
  const project = structuredClone(projectInput);
  if (!canPerform(project, actorId, 'comment.create')) throw new Error('FORBIDDEN_COMMENT');
  const thread = project.discussionThreads.find((item) => item.id === threadId);
  if (!thread) throw new Error('THREAD_NOT_FOUND');
  const timestamp = now.toISOString();
  thread.comments.push({ id: createId('comment'), authorId: actorId, body: body.trim(), createdAt: timestamp });
  if (!thread.participantIds.includes(actorId)) thread.participantIds.push(actorId);
  for (const participantId of thread.participantIds.filter((id) => id !== actorId)) {
    notify(project, {
      recipientId: participantId,
      type: 'comment-added',
      title: `New comment: ${thread.title}`,
      message: body,
      targetType: thread.targetType,
      targetId: thread.targetId,
    }, timestamp);
  }
  project.revision += 1;
  project.updatedAt = timestamp;
  return project;
}

export function resolveDiscussion(projectInput: ArchitectureProject, threadId: string, actorId: string, now = new Date()): ArchitectureProject {
  const project = structuredClone(projectInput);
  if (!canPerform(project, actorId, 'comment.resolve')) throw new Error('FORBIDDEN_RESOLVE');
  const thread = project.discussionThreads.find((item) => item.id === threadId);
  if (!thread) throw new Error('THREAD_NOT_FOUND');
  thread.status = 'resolved';
  thread.resolvedBy = actorId;
  thread.resolvedAt = now.toISOString();
  project.revision += 1;
  project.updatedAt = now.toISOString();
  return project;
}

export function expireGovernanceItems(projectInput: ArchitectureProject, now = new Date()): ArchitectureProject {
  const project = structuredClone(projectInput);
  const timestamp = now.toISOString();
  let changed = false;
  for (const approval of project.stageApprovals) {
    if (approval.status === 'approved' && approval.expiresAt && new Date(approval.expiresAt).getTime() <= now.getTime()) {
      approval.status = 'changes-requested';
      approval.expiredAt = timestamp;
      approval.comments.push('Approval validity expired; revalidation and renewed approval are required.');
      if (approval.assignedReviewerId) notify(project, {
        recipientId: approval.assignedReviewerId,
        type: 'approval-expired',
        title: `Approval expired: ${approval.stage}`,
        message: 'The governed approval baseline has expired and must be reviewed again.',
        targetType: 'approval',
        targetId: approval.id,
      }, timestamp);
      changed = true;
    }
  }
  for (const review of project.reviewAssignments) {
    if (['open', 'in-progress'].includes(review.status) && review.dueAt && new Date(review.dueAt).getTime() < now.getTime()) {
      review.status = 'overdue';
      changed = true;
    }
  }
  if (changed) {
    project.revision += 1;
    project.updatedAt = timestamp;
  }
  return project;
}

function keyed<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createMergePlan(source: ArchitectureProject, target: ArchitectureProject): MergePlan {
  const conflicts: MergeConflict[] = [];
  const categories: Array<{ category: MergeConflict['category']; source: Array<{ id: string }>; target: Array<{ id: string }> }> = [
    { category: 'node', source: source.nodes, target: target.nodes },
    { category: 'edge', source: source.edges, target: target.edges },
    { category: 'style', source: source.styleDecisions, target: target.styleDecisions },
    { category: 'pattern', source: source.patternSelections, target: target.patternSelections },
    { category: 'decision', source: source.decisions, target: target.decisions },
    { category: 'approval', source: source.stageApprovals, target: target.stageApprovals },
  ];
  for (const collection of categories) {
    const sourceMap = keyed(collection.source);
    const targetMap = keyed(collection.target);
    for (const [id, sourceValue] of sourceMap) {
      const targetValue = targetMap.get(id);
      if (targetValue && !equal(sourceValue, targetValue)) {
        conflicts.push({
          id: createId('merge-conflict'),
          category: collection.category,
          recordId: id,
          label: (() => { const value = sourceValue as unknown as Record<string, unknown>; return String(value.label ?? value.title ?? value.name ?? id); })(),
          sourceValue: structuredClone(sourceValue),
          targetValue: structuredClone(targetValue),
          resolution: 'unresolved',
        });
      }
    }
  }
  const comparison = compareBranches(source, target);
  const conflictKeys = new Set(conflicts.map((item) => `${item.category}:${item.recordId}`));
  return {
    id: createId('merge-plan'),
    sourceBranchId: source.branch.id,
    targetBranchId: target.branch.id,
    createdAt: new Date().toISOString(),
    conflicts,
    nonConflictingDifferences: comparison.differences.filter((item) => !conflictKeys.has(`${item.category}:${item.recordId}`)),
    status: conflicts.length ? 'draft' : 'ready',
  };
}

export function resolveMergeConflict(planInput: MergePlan, conflictId: string, resolution: 'source' | 'target'): MergePlan {
  const plan = structuredClone(planInput);
  const conflict = plan.conflicts.find((item) => item.id === conflictId);
  if (!conflict) throw new Error('MERGE_CONFLICT_NOT_FOUND');
  conflict.resolution = resolution;
  if (plan.conflicts.every((item) => item.resolution !== 'unresolved')) plan.status = 'ready';
  return plan;
}

function replaceById<T extends { id: string }>(items: T[], value: T): void {
  const index = items.findIndex((item) => item.id === value.id);
  if (index >= 0) items[index] = structuredClone(value);
  else items.push(structuredClone(value));
}

export function applyMergePlan(source: ArchitectureProject, targetInput: ArchitectureProject, planInput: MergePlan): ArchitectureProject {
  if (planInput.status !== 'ready' || planInput.conflicts.some((item) => item.resolution === 'unresolved')) throw new Error('UNRESOLVED_MERGE_CONFLICTS');
  const target = structuredClone(targetInput);
  const selectedSource = new Set(planInput.conflicts.filter((item) => item.resolution === 'source').map((item) => `${item.category}:${item.recordId}`));
  const applyCollection = <T extends { id: string }>(category: MergeConflict['category'], sourceItems: T[], targetItems: T[]) => {
    for (const item of sourceItems) {
      const hasConflict = planInput.conflicts.some((conflict) => conflict.category === category && conflict.recordId === item.id);
      if (!hasConflict || selectedSource.has(`${category}:${item.id}`)) replaceById(targetItems, item);
    }
  };
  applyCollection('node', source.nodes, target.nodes);
  applyCollection('edge', source.edges, target.edges);
  applyCollection('style', source.styleDecisions, target.styleDecisions);
  applyCollection('pattern', source.patternSelections, target.patternSelections);
  applyCollection('decision', source.decisions, target.decisions);
  applyCollection('approval', source.stageApprovals, target.stageApprovals);
  target.revision += 1;
  target.updatedAt = new Date().toISOString();
  target.notifications.unshift({
    id: createId('notification'), recipientId: target.members.find((member) => member.role === 'owner')?.id ?? 'user-owner',
    type: 'branch-merged', title: `Branch merged: ${source.branch.name}`, message: `${source.branch.name} was merged using an explicit conflict-resolution plan.`,
    targetType: 'branch', targetId: source.branch.id, createdAt: target.updatedAt,
  });
  return target;
}

export class OptimisticConcurrencyError extends Error {
  constructor(public readonly currentRevision: number) {
    super('REVISION_CONFLICT');
  }
}

export function applyCollaborationOperations(projectInput: ArchitectureProject, batch: CollaborationOperationBatch): ArchitectureProject {
  if (projectInput.tenantId !== batch.tenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
  if (projectInput.id !== batch.projectId || projectInput.branch.id !== batch.branchId) throw new Error('PROJECT_BRANCH_MISMATCH');
  if (projectInput.revision !== batch.baseRevision) throw new OptimisticConcurrencyError(projectInput.revision);
  if (!canPerform(projectInput, batch.actorId, 'project.edit') && !batch.operations.every((item) => item.type === 'ADD_COMMENT')) throw new Error('FORBIDDEN_EDIT');
  const project = structuredClone(projectInput);
  for (const operation of batch.operations) {
    if (operation.type === 'UPSERT_NODE') replaceById(project.nodes, operation.node);
    if (operation.type === 'DELETE_NODE') {
      project.nodes = project.nodes.filter((item) => item.id !== operation.nodeId);
      project.edges = project.edges.filter((edge) => edge.sourceId !== operation.nodeId && edge.targetId !== operation.nodeId);
    }
    if (operation.type === 'UPSERT_EDGE') replaceById(project.edges, operation.edge);
    if (operation.type === 'DELETE_EDGE') project.edges = project.edges.filter((item) => item.id !== operation.edgeId);
    if (operation.type === 'ADD_COMMENT') {
      const thread = project.discussionThreads.find((item) => item.id === operation.threadId);
      if (!thread) throw new Error('THREAD_NOT_FOUND');
      thread.comments.push(operation.comment);
    }
  }
  project.revision += 1;
  project.updatedAt = new Date().toISOString();
  return project;
}

export function activeMembers(project: ArchitectureProject): ProjectMember[] {
  return project.members.filter((member) => member.status === 'active');
}
