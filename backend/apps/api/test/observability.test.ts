import { describe, expect, it } from 'vitest';
import { TelemetryRuntime } from '../src/observability.js';

describe('OpenTelemetry-compatible runtime', () => {
  it('propagates trace context and exports queued spans using OTLP JSON', async () => {
    const telemetry = new TelemetryRuntime('test-service');
    const context = telemetry.beginRequest('request-1', 'GET', '/health', '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01');
    expect(context.traceId).toBe('0123456789abcdef0123456789abcdef');
    telemetry.endRequest('request-1', 200);
    let body: unknown;
    const result = await telemetry.exportOtlp('https://collector.example', async (_url, init) => { body = JSON.parse(String(init?.body)); return new Response('{}', { status: 200 }); });
    expect(result.exported).toBe(1);
    expect((body as { resourceSpans: unknown[] }).resourceSpans).toHaveLength(1);
    expect(telemetry.summary().queuedSpans).toBe(0);
  });
});
