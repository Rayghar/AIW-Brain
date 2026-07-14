import type { LlmBudgetPolicy, LlmGatewayRequest, LlmRouteClass, LlmUsageRecord } from './types.js';

export interface UsageTotals {
  tenantMonthUsd: number;
  projectMonthUsd?: number;
  userDayUsd?: number;
}

export function estimateCostUsd(args: {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  cachedInputPerMillionUsd?: number;
}): number {
  const uncachedInput = Math.max(0, args.inputTokens - (args.cachedInputTokens ?? 0));
  const inputCost = (uncachedInput / 1_000_000) * args.inputPerMillionUsd;
  const cachedCost = ((args.cachedInputTokens ?? 0) / 1_000_000) * (args.cachedInputPerMillionUsd ?? args.inputPerMillionUsd);
  const outputCost = (args.outputTokens / 1_000_000) * args.outputPerMillionUsd;
  return Number((inputCost + cachedCost + outputCost).toFixed(6));
}

export function checkBudget(
  request: LlmGatewayRequest,
  policy: LlmBudgetPolicy,
  totals: UsageTotals,
  estimatedRequestUsd: number,
): { allowed: boolean; reason?: string; requiresApproval?: boolean } {
  if (policy.blockedTaskTypes?.includes(request.taskType)) {
    return { allowed: false, reason: `Task type ${request.taskType} is blocked by policy.` };
  }
  if (policy.maxRequestUsd !== undefined && estimatedRequestUsd > policy.maxRequestUsd) {
    return { allowed: false, reason: 'Request exceeds maximum allowed request cost.' };
  }
  if (totals.tenantMonthUsd + estimatedRequestUsd > policy.tenantMonthlyUsd) {
    return { allowed: false, reason: 'Tenant monthly LLM budget exceeded.' };
  }
  if (policy.projectMonthlyUsd !== undefined && (totals.projectMonthUsd ?? 0) + estimatedRequestUsd > policy.projectMonthlyUsd) {
    return { allowed: false, reason: 'Project monthly LLM budget exceeded.' };
  }
  if (policy.userDailyUsd !== undefined && (totals.userDayUsd ?? 0) + estimatedRequestUsd > policy.userDailyUsd) {
    return { allowed: false, reason: 'User daily LLM budget exceeded.' };
  }
  if (policy.requireApprovalAboveUsd !== undefined && estimatedRequestUsd > policy.requireApprovalAboveUsd) {
    return { allowed: true, requiresApproval: true, reason: 'Request requires approval by policy.' };
  }
  return { allowed: true };
}

export function createUsageRecord(args: {
  request: LlmGatewayRequest;
  provider: string;
  model: string;
  routeClass: LlmRouteClass;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  estimatedCostUsd: number;
  cached: boolean;
  status: LlmUsageRecord['status'];
}): LlmUsageRecord {
  return {
    id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId: args.request.tenantId,
    ...(args.request.projectId ? { projectId: args.request.projectId } : {}),
    ...(args.request.userId ? { userId: args.request.userId } : {}),
    taskType: args.request.taskType,
    provider: args.provider,
    model: args.model,
    routeClass: args.routeClass,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    ...(args.cachedInputTokens !== undefined ? { cachedInputTokens: args.cachedInputTokens } : {}),
    estimatedCostUsd: args.estimatedCostUsd,
    cached: args.cached,
    status: args.status,
    createdAt: new Date().toISOString(),
  };
}
