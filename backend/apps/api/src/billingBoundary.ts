import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { BillingEventReceipt, PlanId, SubscriptionStatus, TenantSubscription } from '@aiw/admin';

export interface BillingEventEnvelope {
  provider: string;
  eventId: string;
  tenantId: string;
  eventType: string;
  externalCustomerReference?: string;
  externalSubscriptionReference?: string;
  planId?: PlanId;
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  occurredAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface BillingBoundaryResult {
  receipt: BillingEventReceipt;
  subscription?: TenantSubscription;
  replayed: boolean;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function nextPeriod(start?: string, end?: string): { start: Date; end: Date } | null {
  const parsedStart = start ? new Date(start) : new Date();
  const parsedEnd = end ? new Date(end) : new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth() + 1, parsedStart.getUTCDate()));
  if (!Number.isFinite(parsedStart.getTime()) || !Number.isFinite(parsedEnd.getTime()) || parsedEnd <= parsedStart) return null;
  return { start: parsedStart, end: parsedEnd };
}

const eventStatus: Record<string, SubscriptionStatus | undefined> = {
  'subscription.created': 'active',
  'subscription.updated': undefined,
  'subscription.renewed': 'active',
  'subscription.past-due': 'past-due',
  'subscription.suspended': 'suspended',
  'subscription.cancelled': 'cancelled',
};

export class BillingBoundary {
  constructor(
    private readonly secret: string | undefined = process.env.AIW_BILLING_WEBHOOK_SECRET,
    private readonly receipts: Map<string, BillingEventReceipt> = new Map(),
  ) {}

  configured(): boolean { return Boolean(this.secret?.trim()); }
  signatureFor(envelope: BillingEventEnvelope): string {
    if (!this.secret) throw new Error('BILLING_BOUNDARY_NOT_CONFIGURED');
    return createHmac('sha256', this.secret).update(stable(envelope)).digest('hex');
  }

  process(envelope: BillingEventEnvelope, signature: string, actor = 'billing-boundary'): BillingBoundaryResult {
    const receivedAt = new Date().toISOString();
    const payload = stable(envelope);
    const payloadSha256 = createHash('sha256').update(payload).digest('hex');
    const key = `${envelope.provider}:${envelope.eventId}`;
    const existing = this.receipts.get(key);
    if (existing) {
      if (existing.payloadSha256 !== payloadSha256) throw new Error('BILLING_EVENT_ID_REUSED_WITH_DIFFERENT_PAYLOAD');
      if (existing.signatureVerified && existing.disposition !== 'rejected') {
        return { receipt: structuredClone(existing), replayed: true };
      }
      // A failed signature is security evidence, not a trusted idempotency claim.
      // Permit the provider to retry the same immutable event with a valid signature.
      this.receipts.delete(key);
    }
    if (!this.secret?.trim()) throw new Error('BILLING_BOUNDARY_NOT_CONFIGURED');
    const expected = createHmac('sha256', this.secret).update(payload).digest('hex');
    if (!safeEqualHex(expected, signature)) {
      const receipt: BillingEventReceipt = {
        provider: envelope.provider, eventId: envelope.eventId, tenantId: envelope.tenantId, eventType: envelope.eventType,
        payloadSha256, signatureVerified: false, disposition: 'rejected', receivedAt, processingDetail: 'Signature verification failed.',
      };
      this.receipts.set(key, receipt);
      throw Object.assign(new Error('BILLING_SIGNATURE_INVALID'), { receipt });
    }
    const supported = Object.prototype.hasOwnProperty.call(eventStatus, envelope.eventType);
    if (!supported) {
      const receipt: BillingEventReceipt = {
        provider: envelope.provider, eventId: envelope.eventId, tenantId: envelope.tenantId, eventType: envelope.eventType,
        payloadSha256, signatureVerified: true, disposition: 'ignored', receivedAt, processedAt: receivedAt,
        processingDetail: 'Event type is not an AIW subscription-state event.',
        ...(envelope.externalCustomerReference ? { externalCustomerReference: envelope.externalCustomerReference } : {}),
        ...(envelope.externalSubscriptionReference ? { externalSubscriptionReference: envelope.externalSubscriptionReference } : {}),
      };
      this.receipts.set(key, receipt);
      return { receipt: structuredClone(receipt), replayed: false };
    }
    const period = nextPeriod(envelope.currentPeriodStart, envelope.currentPeriodEnd);
    if (!period) throw new Error('BILLING_SUBSCRIPTION_PERIOD_INVALID');
    if (!envelope.planId) throw new Error('BILLING_PLAN_REQUIRED');
    const status = envelope.subscriptionStatus ?? eventStatus[envelope.eventType] ?? 'active';
    const subscription: TenantSubscription = {
      tenantId: envelope.tenantId,
      planId: envelope.planId,
      status,
      currentPeriodStart: period.start.toISOString(),
      currentPeriodEnd: period.end.toISOString(),
      ...(envelope.externalSubscriptionReference ? { externalBillingReference: envelope.externalSubscriptionReference } : {}),
      updatedAt: receivedAt,
      updatedBy: actor,
    };
    const receipt: BillingEventReceipt = {
      provider: envelope.provider, eventId: envelope.eventId, tenantId: envelope.tenantId, eventType: envelope.eventType,
      payloadSha256, signatureVerified: true, disposition: 'accepted', receivedAt, processedAt: receivedAt,
      processingDetail: `Subscription state updated to ${status}; no payment-instrument data stored.`,
      ...(envelope.externalCustomerReference ? { externalCustomerReference: envelope.externalCustomerReference } : {}),
      ...(envelope.externalSubscriptionReference ? { externalSubscriptionReference: envelope.externalSubscriptionReference } : {}),
    };
    this.receipts.set(key, receipt);
    return { receipt: structuredClone(receipt), subscription, replayed: false };
  }
}
