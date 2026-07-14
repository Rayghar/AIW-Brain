import { createId, type ArchitectureProject, type RuntimeInventory, type RuntimeRelationship, type RuntimeResource, type TelemetrySpanEvidence } from '@aiw/domain';

function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export function deriveTopologyFromTelemetry(project: ArchitectureProject, name: string, spans: TelemetrySpanEvidence[]): RuntimeInventory {
  const capturedAt = new Date().toISOString();
  const serviceNames = new Set<string>();
  for (const span of spans) { serviceNames.add(span.serviceName); if (span.peerService) serviceNames.add(span.peerService); }
  const idByService = new Map<string, string>();
  const resources: RuntimeResource[] = [...serviceNames].sort().map((serviceName) => {
    const id = createId('runtime-service'); idByService.set(serviceName, id);
    const serviceSpans = spans.filter((span) => span.serviceName === serviceName);
    const errors = serviceSpans.filter((span) => span.status === 'error').length;
    const p95 = [...serviceSpans].sort((a, b) => a.durationMs - b.durationMs)[Math.max(0, Math.ceil(serviceSpans.length * 0.95) - 1)]?.durationMs ?? 0;
    return { id, sourceType: 'telemetry', externalId: `otel:${normalize(serviceName)}`, resourceType: 'ObservedService', name: serviceName, provider: 'opentelemetry', properties: { spanCount: serviceSpans.length, errorRatePercent: serviceSpans.length ? errors / serviceSpans.length * 100 : 0, p95LatencyMs: p95 }, labels: { 'aiw.telemetry-derived': 'true' }, discoveredAt: capturedAt };
  });
  const grouped = new Map<string, { count: number; errors: number; durations: number[]; protocol?: string }>();
  for (const span of spans.filter((item) => item.peerService)) {
    const key = `${span.serviceName}|${span.peerService}`;
    const current = grouped.get(key) ?? { count: 0, errors: 0, durations: [] };
    current.count += 1; current.errors += span.status === 'error' ? 1 : 0; current.durations.push(span.durationMs); if (span.protocol) current.protocol = span.protocol;
    grouped.set(key, current);
  }
  const relationships: RuntimeRelationship[] = [...grouped.entries()].flatMap(([key, stats]) => {
    const [source, target] = key.split('|'); const sourceId = source ? idByService.get(source) : undefined; const targetId = target ? idByService.get(target) : undefined;
    if (!sourceId || !targetId) return [];
    const sorted = [...stats.durations].sort((a,b) => a-b); const p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
    return [{ id: createId('runtime-edge'), sourceResourceId: sourceId, targetResourceId: targetId, kind: 'calls' as const, properties: { callCount: stats.count, errorRatePercent: stats.count ? stats.errors / stats.count * 100 : 0, p95LatencyMs: p95, protocol: stats.protocol } }];
  });
  return { id: createId('inventory'), tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, name, sourceType: 'telemetry', capturedAt, rawFingerprint: `telemetry-${spans.length}-${resources.length}-${relationships.length}`, resources, relationships };
}
