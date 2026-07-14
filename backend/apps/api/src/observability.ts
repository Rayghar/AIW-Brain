import { randomBytes } from 'node:crypto';

interface ActiveRequest {
  startedAt: number;
  startedUnixNano: string;
  traceId: string;
  spanId: string;
  method: string;
  route: string;
}

interface CompletedSpan {
  traceId: string;
  spanId: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  statusCode: number;
  durationMs: number;
  attributes: Record<string, string | number | boolean>;
}

interface Histogram {
  count: number;
  sum: number;
  max: number;
  values: number[];
}

export interface TelemetrySummary {
  serviceName: string;
  startedAt: string;
  uptimeSeconds: number;
  requests: number;
  errors: number;
  activeRequests: number;
  queuedSpans: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  exportedSpans: number;
}

function percentile(values: number[], quantile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * quantile))] ?? 0;
}

function hex(bytes: number): string { return randomBytes(bytes).toString('hex'); }
function unixNano(): string { return (BigInt(Date.now()) * 1_000_000n).toString(); }

export class TelemetryRuntime {
  private readonly started = Date.now();
  private readonly active = new Map<string, ActiveRequest>();
  private readonly completed: CompletedSpan[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private exportedSpans = 0;
  private readonly routeCounts = new Map<string, number>();
  private readonly latency: Histogram = { count: 0, sum: 0, max: 0, values: [] };

  constructor(readonly serviceName = 'aiw-api') {}

  beginRequest(requestId: string, method: string, route: string, traceparent?: string): { traceId: string; spanId: string; traceparent: string } {
    const parsed = traceparent?.match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/i);
    const traceId = parsed?.[1] ?? hex(16);
    const spanId = hex(8);
    this.active.set(requestId, { startedAt: performance.now(), startedUnixNano: unixNano(), traceId, spanId, method, route });
    return { traceId, spanId, traceparent: `00-${traceId}-${spanId}-01` };
  }

  endRequest(requestId: string, statusCode: number): void {
    const span = this.active.get(requestId);
    if (!span) return;
    this.active.delete(requestId);
    const duration = Math.max(0, performance.now() - span.startedAt);
    this.requestCount += 1;
    if (statusCode >= 500) this.errorCount += 1;
    const routeKey = `${span.method} ${span.route}`;
    this.routeCounts.set(routeKey, (this.routeCounts.get(routeKey) ?? 0) + 1);
    this.latency.count += 1;
    this.latency.sum += duration;
    this.latency.max = Math.max(this.latency.max, duration);
    this.latency.values.push(duration);
    if (this.latency.values.length > 5000) this.latency.values.splice(0, this.latency.values.length - 5000);
    this.completed.push({
      traceId: span.traceId, spanId: span.spanId, name: routeKey, startTimeUnixNano: span.startedUnixNano,
      endTimeUnixNano: unixNano(), statusCode, durationMs: duration,
      attributes: { 'http.request.method': span.method, 'http.route': span.route, 'http.response.status_code': statusCode },
    });
    if (this.completed.length > 2000) this.completed.splice(0, this.completed.length - 2000);
  }

  async exportOtlp(endpoint: string, fetcher: typeof fetch = fetch): Promise<{ exported: number }> {
    const spans = [...this.completed];
    if (!spans.length) return { exported: 0 };
    const url = endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint.replace(/\/$/, '')}/v1/traces`;
    const response = await fetcher(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: this.serviceName } }] }, scopeSpans: [{ scope: { name: 'aiw-runtime', version: '0.8.0' }, spans: spans.map((span) => ({ traceId: span.traceId, spanId: span.spanId, name: span.name, kind: 2, startTimeUnixNano: span.startTimeUnixNano, endTimeUnixNano: span.endTimeUnixNano, attributes: Object.entries(span.attributes).map(([key, value]) => ({ key, value: typeof value === 'number' ? { intValue: String(value) } : typeof value === 'boolean' ? { boolValue: value } : { stringValue: value } })), status: { code: span.statusCode >= 500 ? 2 : 1 } })) }] }] }),
    });
    if (!response.ok) throw new Error(`OTLP_EXPORT_FAILED:${response.status}`);
    this.completed.splice(0, spans.length);
    this.exportedSpans += spans.length;
    return { exported: spans.length };
  }

  summary(): TelemetrySummary {
    return {
      serviceName: this.serviceName,
      startedAt: new Date(this.started).toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.started) / 1000),
      requests: this.requestCount,
      errors: this.errorCount,
      activeRequests: this.active.size,
      queuedSpans: this.completed.length,
      p50LatencyMs: Number(percentile(this.latency.values, 0.5).toFixed(2)),
      p95LatencyMs: Number(percentile(this.latency.values, 0.95).toFixed(2)),
      p99LatencyMs: Number(percentile(this.latency.values, 0.99).toFixed(2)),
      exportedSpans: this.exportedSpans,
    };
  }

  prometheus(): string {
    const lines = [
      '# HELP aiw_http_requests_total Total HTTP requests processed.',
      '# TYPE aiw_http_requests_total counter',
      `aiw_http_requests_total ${this.requestCount}`,
      '# HELP aiw_http_errors_total Total HTTP 5xx responses.',
      '# TYPE aiw_http_errors_total counter',
      `aiw_http_errors_total ${this.errorCount}`,
      '# HELP aiw_http_request_duration_ms HTTP request latency in milliseconds.',
      '# TYPE aiw_http_request_duration_ms summary',
      `aiw_http_request_duration_ms{quantile="0.5"} ${percentile(this.latency.values, 0.5).toFixed(3)}`,
      `aiw_http_request_duration_ms{quantile="0.95"} ${percentile(this.latency.values, 0.95).toFixed(3)}`,
      `aiw_http_request_duration_ms{quantile="0.99"} ${percentile(this.latency.values, 0.99).toFixed(3)}`,
      `aiw_http_request_duration_ms_sum ${this.latency.sum.toFixed(3)}`,
      `aiw_http_request_duration_ms_count ${this.latency.count}`,
      '# HELP aiw_http_active_requests Current in-flight HTTP requests.',
      '# TYPE aiw_http_active_requests gauge',
      `aiw_http_active_requests ${this.active.size}`,
      '# HELP aiw_otel_spans_queued Spans waiting for OTLP export.',
      '# TYPE aiw_otel_spans_queued gauge',
      `aiw_otel_spans_queued ${this.completed.length}`,
    ];
    for (const [route, count] of this.routeCounts) lines.push(`aiw_http_route_requests_total{route=${JSON.stringify(route)}} ${count}`);
    return `${lines.join('\n')}\n`;
  }
}
