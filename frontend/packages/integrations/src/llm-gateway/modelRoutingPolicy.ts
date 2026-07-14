import type { LlmGatewayRequest, LlmRouteClass } from './types.js';

export interface ModelRoute {
  provider: string;
  model: string;
  routeClass: LlmRouteClass;
  temperature: number;
}

export interface ModelRoutingPolicyOptions {
  defaultProvider: string;
  lowCostModel: string;
  highReasoningModel: string;
  privateModel?: string;
  batchModel?: string;
}

export function selectModelRoute(
  request: LlmGatewayRequest,
  options: ModelRoutingPolicyOptions,
): ModelRoute {
  if (request.sensitivity === 'restricted' && options.privateModel) {
    return { provider: 'private', model: options.privateModel, routeClass: 'private', temperature: 0.1 };
  }

  switch (request.taskType) {
    case 'architecture-critique':
    case 'sdd-section-draft':
    case 'decision-radar':
      return { provider: options.defaultProvider, model: options.highReasoningModel, routeClass: 'high-reasoning', temperature: 0.2 };
    case 'knowledge-extraction':
      return { provider: options.defaultProvider, model: options.batchModel ?? options.highReasoningModel, routeClass: 'batch', temperature: 0.1 };
    case 'style-explanation':
    case 'pattern-explanation':
    case 'interface-suggestion':
    case 'design-interview':
    case 'executive-summary':
    default:
      return { provider: options.defaultProvider, model: options.lowCostModel, routeClass: 'low-cost', temperature: 0.2 };
  }
}
