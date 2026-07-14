import type { LlmProvider, LlmRouteClass, ProviderCompletionRequest, ProviderCompletionResponse } from '../types.js';

/**
 * OpenAI provider adapter stub.
 *
 * This intentionally avoids importing a concrete SDK in the architecture foundation pack.
 * In the AIW repo, wire this to the approved OpenAI SDK/client and environment secrets.
 */
export class OpenAiProvider implements LlmProvider {
  name = 'openai';

  constructor(private readonly options: { apiKey?: string; baseUrl?: string }) {}

  supports(routeClass: LlmRouteClass): boolean {
    return ['low-cost', 'high-reasoning', 'batch'].includes(routeClass);
  }

  async complete<T = unknown>(_request: ProviderCompletionRequest): Promise<ProviderCompletionResponse<T>> {
    if (!this.options.apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    // Replace with real provider call in AIW backend.
    // Required implementation behavior:
    // 1. Use structured output schema.
    // 2. Return parsed JSON output.
    // 3. Return usage/token metadata.
    // 4. Never log raw sensitive prompt content here.
    throw new Error('OpenAiProvider.complete is a scaffold. Wire it to the approved provider client in the AIW backend.');
  }
}
