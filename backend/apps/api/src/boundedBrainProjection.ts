/**
 * Canonical bounded projection used by benchmark and Workbench Brain paths.
 * It removes runtime-only volatility, caps recursive breadth and prevents raw
 * runtime structures from being transferred as an accidental prompt payload.
 */
export function boundedBrainProjection(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    const stable = value.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '[runtime-id]');
    return stable.length > 600 ? `${stable.slice(0, 597)}...` : stable;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => boundedBrainProjection(item, depth + 1));
  if (typeof value === 'object') {
    if (depth >= 4) return '[bounded-structure]';
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'brainReceipt' && !/(?:At|timestamp)$/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 30)
      .map(([key, item]) => [key, boundedBrainProjection(item, depth + 1)]));
  }
  return String(value);
}

export function stableBrainRuntimeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableBrainRuntimeValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== 'brainReceipt' && !/(?:At|timestamp)$/i.test(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, stableBrainRuntimeValue(item)]));
  return value;
}
