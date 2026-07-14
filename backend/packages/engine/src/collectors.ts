import { createId, type ArchitectureProject, type CollectorRun, type InventoryCollector, type RuntimeInventory, type RuntimeResource } from '@aiw/domain';
import { importRuntimeInventory } from './runtimeInventory.js';

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
function number(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }

function providerResources(provider: InventoryCollector['provider'], raw: unknown): Array<Record<string, unknown>> {
  const root = record(raw);
  if (provider === 'kubernetes') return Array.isArray(root.items) ? root.items.map(record) : [];
  const candidates = Array.isArray(root.resources) ? root.resources : Array.isArray(root.value) ? root.value : Array.isArray(raw) ? raw.map(record) : [];
  return candidates.map(record);
}

function normalizeCloud(provider: Exclude<InventoryCollector['provider'], 'kubernetes'>, raw: unknown): unknown {
  const resources = providerResources(provider, raw).map((item, index) => {
    const tagsRaw = record(item.tags);
    const tags = Object.fromEntries(Object.entries(tagsRaw).map(([key, value]) => [key, String(value)]));
    const id = text(item.id, `${provider}:resource:${index}`);
    const name = text(item.name, id.split('/').at(-1) ?? `resource-${index}`);
    const type = text(item.type, text(item.resourceType, 'CloudResource'));
    const location = text(item.location, text(item.region));
    const sku = record(item.sku);
    const properties = { ...record(item.properties), monthlyCost: number(item.monthlyCost), cpuUtilizationPercent: number(item.cpuUtilizationPercent), memoryUtilizationPercent: number(item.memoryUtilizationPercent), replicas: number(item.replicas), availabilityZones: number(item.availabilityZones), sku: text(sku.name) || undefined };
    return { externalId: id, resourceType: type, name, provider, region: location || undefined, version: text(item.version) || undefined, properties, labels: tags };
  });
  return { resources, relationships: [] };
}

export function collectorDue(collector: InventoryCollector, now = new Date()): boolean {
  if (!collector.enabled || collector.status === 'disabled') return false;
  if (!collector.nextRunAt) return true;
  return Date.parse(collector.nextRunAt) <= now.getTime();
}

export function executeCollector(project: ArchitectureProject, collector: InventoryCollector, raw: unknown, sourceRevision?: string): { inventory: RuntimeInventory; run: CollectorRun; collector: InventoryCollector } {
  const startedAt = new Date().toISOString();
  try {
    const input = collector.provider === 'kubernetes' ? raw : normalizeCloud(collector.provider, raw);
    const inventory = importRuntimeInventory(project, `${collector.name} inventory`, collector.provider, input, sourceRevision);
    const completedAt = new Date().toISOString();
    const next = new Date(Date.parse(completedAt) + 6 * 60 * 60 * 1000).toISOString();
    return {
      inventory,
      run: { id: createId('collector-run'), collectorId: collector.id, startedAt, completedAt, status: 'completed', inventoryId: inventory.id, resourceCount: inventory.resources.length, relationshipCount: inventory.relationships.length, message: `Collected ${inventory.resources.length} resources from ${collector.provider}.` },
      collector: { ...collector, lastRunAt: completedAt, nextRunAt: next, status: 'healthy' },
    };
  } catch (error) {
    return {
      inventory: importRuntimeInventory(project, `${collector.name} failed inventory`, collector.provider, { resources: [], relationships: [] }, sourceRevision),
      run: { id: createId('collector-run'), collectorId: collector.id, startedAt, completedAt: new Date().toISOString(), status: 'failed', resourceCount: 0, relationshipCount: 0, message: error instanceof Error ? error.message : String(error) },
      collector: { ...collector, lastRunAt: startedAt, status: 'degraded' },
    };
  }
}

export function collectorHealth(project: ArchitectureProject): { configured: number; due: number; degraded: number; lastSuccessfulRun?: CollectorRun } {
  const completed = project.collectorRuns.filter((run) => run.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return { configured: project.inventoryCollectors.filter((item) => item.enabled).length, due: project.inventoryCollectors.filter((item) => collectorDue(item)).length, degraded: project.inventoryCollectors.filter((item) => item.status === 'degraded').length, ...(completed[0] ? { lastSuccessfulRun: completed[0] } : {}) };
}
