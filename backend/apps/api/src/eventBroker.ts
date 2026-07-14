import type { ActivityEvent, EventBrokerSettings } from '@aiw/domain';
import type { DurableEventStore } from './durableEvents.js';
import type { TenantEventHub } from './securityRuntime.js';

export interface EventBrokerAdapter {
  readonly name: EventBrokerSettings['adapter'];
  publish(topic: string, event: ActivityEvent): Promise<void>;
}

export class MemoryEventBroker implements EventBrokerAdapter {
  readonly name = 'memory' as const;
  readonly messages: Array<{ topic: string; event: ActivityEvent }> = [];
  async publish(topic: string, event: ActivityEvent): Promise<void> { this.messages.push({ topic, event: structuredClone(event) }); }
}

export class WebhookEventBroker implements EventBrokerAdapter {
  readonly name = 'webhook' as const;
  constructor(private readonly endpoint: string) {}
  async publish(topic: string, event: ActivityEvent): Promise<void> {
    const response = await fetch(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-aiw-topic': topic }, body: JSON.stringify(event), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`BROKER_WEBHOOK_FAILED_${response.status}`);
  }
}

export function createEventBroker(settings?: EventBrokerSettings): EventBrokerAdapter {
  if (settings?.adapter === 'webhook' && settings.endpointReference?.startsWith('https://')) return new WebhookEventBroker(settings.endpointReference);
  return new MemoryEventBroker();
}

export class OutboxWorker {
  constructor(private readonly store: DurableEventStore, private readonly liveHub: TenantEventHub, private readonly broker: EventBrokerAdapter) {}
  async dispatch(tenantId: string, settings: EventBrokerSettings, limit = 100): Promise<{ attempted: number; published: number; failed: number; adapter: string }> {
    const pending = await this.store.pending(tenantId, limit); let published = 0; let failed = 0;
    for (const record of pending) {
      try {
        await this.broker.publish(settings.topic, record.payload);
        this.liveHub.publishPrepared(record.payload);
        await this.store.markPublished(record.id); published += 1;
      } catch (error) {
        await this.store.markFailed(record.id, error instanceof Error ? error.message : String(error)); failed += 1;
      }
    }
    return { attempted: pending.length, published, failed, adapter: this.broker.name };
  }
}
