export type LlmTaskType =
  | 'design-interview'
  | 'architecture-critique'
  | 'style-explanation'
  | 'pattern-explanation'
  | 'interface-suggestion'
  | 'sdd-section-draft'
  | 'decision-radar'
  | 'knowledge-extraction'
  | 'executive-summary';

export type LlmRouteClass = 'low-cost' | 'high-reasoning' | 'private' | 'batch';

export interface LlmGatewayRequest<TOutputSchema = unknown> {
  tenantId: string;
  projectId?: string;
  userId?: string;
  taskType: LlmTaskType;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  prompt: string;
  context: Record<string, unknown>;
  outputSchemaName: string;
  outputSchema?: TOutputSchema;
  maxEstimatedCostUsd?: number;
  idempotencyKey?: string;
}

export interface LlmGatewayResponse<T = unknown> {
  id: string;
  provider: string;
  model: string;
  routeClass: LlmRouteClass;
  output: T;
  rawText?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
    estimatedCostUsd: number;
  };
  validation: {
    valid: boolean;
    errors?: string[];
  };
  cached: boolean;
  createdAt: string;
}

export interface LlmProvider {
  name: string;
  supports(routeClass: LlmRouteClass): boolean;
  complete<T = unknown>(request: ProviderCompletionRequest): Promise<ProviderCompletionResponse<T>>;
}

export interface ProviderCompletionRequest {
  model: string;
  prompt: string;
  context: Record<string, unknown>;
  outputSchemaName: string;
  temperature?: number;
}

export interface ProviderCompletionResponse<T = unknown> {
  output: T;
  rawText?: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface LlmBudgetPolicy {
  tenantMonthlyUsd: number;
  projectMonthlyUsd?: number;
  userDailyUsd?: number;
  maxRequestUsd?: number;
  requireApprovalAboveUsd?: number;
  allowAutoDowngrade: boolean;
  allowedProviders: string[];
  blockedTaskTypes?: LlmTaskType[];
}

export interface LlmUsageRecord {
  id: string;
  tenantId: string;
  projectId?: string;
  userId?: string;
  taskType: LlmTaskType;
  provider: string;
  model: string;
  routeClass: LlmRouteClass;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  estimatedCostUsd: number;
  cached: boolean;
  status: 'allowed' | 'blocked' | 'downgraded' | 'failed' | 'completed';
  createdAt: string;
}
