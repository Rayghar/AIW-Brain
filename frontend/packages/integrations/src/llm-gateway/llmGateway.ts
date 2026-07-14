import type { LlmBudgetPolicy, LlmGatewayRequest, LlmGatewayResponse, LlmProvider } from './types.js';
import type { ModelRoutingPolicyOptions } from './modelRoutingPolicy.js';
import { selectModelRoute } from './modelRoutingPolicy.js';
import { redactPromptAndContext } from './redaction.js';
import { validateStructuredOutput } from './responseValidator.js';
import { checkBudget, createUsageRecord, estimateCostUsd, type UsageTotals } from './costLedger.js';

export interface LlmGatewayDependencies {
  providers: LlmProvider[];
  routing: ModelRoutingPolicyOptions;
  budgetPolicy: LlmBudgetPolicy;
  getUsageTotals: (request: LlmGatewayRequest) => Promise<UsageTotals>;
  recordUsage: (record: ReturnType<typeof createUsageRecord>) => Promise<void>;
  audit: (event: Record<string, unknown>) => Promise<void>;
  pricing: Record<string, { inputPerMillionUsd: number; outputPerMillionUsd: number; cachedInputPerMillionUsd?: number }>;
}

export class LlmGateway {
  constructor(private readonly deps: LlmGatewayDependencies) {}

  async complete<T = unknown>(request: LlmGatewayRequest): Promise<LlmGatewayResponse<T>> {
    const route = selectModelRoute(request, this.deps.routing);
    const provider = this.deps.providers.find((candidate) => candidate.name === route.provider && candidate.supports(route.routeClass));

    if (!provider) {
      throw new Error(`No LLM provider available for route ${route.provider}/${route.routeClass}`);
    }

    const redacted = redactPromptAndContext(request.prompt, request.context);
    const pricing = this.deps.pricing[route.model] ?? { inputPerMillionUsd: 0, outputPerMillionUsd: 0 };

    // Pre-flight estimate uses a conservative rough estimate before provider call.
    const roughInputTokens = Math.ceil((redacted.prompt.length + JSON.stringify(redacted.context).length) / 4);
    const roughOutputTokens = 1200;
    const estimatedPreflightCost = estimateCostUsd({
      inputTokens: roughInputTokens,
      outputTokens: roughOutputTokens,
      inputPerMillionUsd: pricing.inputPerMillionUsd,
      outputPerMillionUsd: pricing.outputPerMillionUsd,
      ...(pricing.cachedInputPerMillionUsd !== undefined ? { cachedInputPerMillionUsd: pricing.cachedInputPerMillionUsd } : {}),
    });

    const totals = await this.deps.getUsageTotals(request);
    const budget = checkBudget(request, this.deps.budgetPolicy, totals, estimatedPreflightCost);
    if (!budget.allowed) {
      const record = createUsageRecord({
        request,
        provider: route.provider,
        model: route.model,
        routeClass: route.routeClass,
        inputTokens: roughInputTokens,
        outputTokens: 0,
        estimatedCostUsd: estimatedPreflightCost,
        cached: false,
        status: 'blocked',
      });
      await this.deps.recordUsage(record);
      await this.deps.audit({ type: 'llm.request.blocked', request, route, budget, redactions: redacted.redactions });
      throw new Error(budget.reason ?? 'LLM request blocked by budget policy.');
    }

    const result = await provider.complete<T>({
      model: route.model,
      prompt: redacted.prompt,
      context: redacted.context,
      outputSchemaName: request.outputSchemaName,
      temperature: route.temperature,
    });

    const finalCost = estimateCostUsd({
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      ...(result.cachedInputTokens !== undefined ? { cachedInputTokens: result.cachedInputTokens } : {}),
      inputPerMillionUsd: pricing.inputPerMillionUsd,
      outputPerMillionUsd: pricing.outputPerMillionUsd,
      ...(pricing.cachedInputPerMillionUsd !== undefined ? { cachedInputPerMillionUsd: pricing.cachedInputPerMillionUsd } : {}),
    });

    const validation = validateStructuredOutput(result.output, request.outputSchemaName);
    const usageRecord = createUsageRecord({
      request,
      provider: route.provider,
      model: route.model,
      routeClass: route.routeClass,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      ...(result.cachedInputTokens !== undefined ? { cachedInputTokens: result.cachedInputTokens } : {}),
      estimatedCostUsd: finalCost,
      cached: false,
      status: validation.valid ? 'completed' : 'failed',
    });

    await this.deps.recordUsage(usageRecord);
    await this.deps.audit({
      type: 'llm.request.completed',
      request: { ...request, prompt: '[omitted-from-audit-event]' },
      route,
      validation,
      usageRecord,
      redactions: redacted.redactions,
    });

    return {
      id: usageRecord.id,
      provider: route.provider,
      model: route.model,
      routeClass: route.routeClass,
      output: result.output,
      ...(result.rawText ? { rawText: result.rawText } : {}),
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        ...(result.cachedInputTokens !== undefined ? { cachedInputTokens: result.cachedInputTokens } : {}),
        estimatedCostUsd: finalCost,
      },
      validation,
      cached: false,
      createdAt: usageRecord.createdAt,
    };
  }
}
