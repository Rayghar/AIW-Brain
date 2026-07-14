import { createId, type ActivityEvent } from '@aiw/domain';
import { databaseProvider, mongodbDbName, mongodbUri } from './databaseMode.js';

export interface DurableEventRecord {
  id: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: ActivityEvent;
  status: 'pending' | 'published' | 'failed';
  attempts: number;
  createdAt: string;
  publishedAt?: string | undefined;
  lastError?: string | undefined;
}

export interface DurableEventStore {
  append(input: Omit<DurableEventRecord, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<DurableEventRecord>;
  pending(tenantId: string, limit?: number): Promise<DurableEventRecord[]>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  close(): Promise<void>;
}

export class InMemoryDurableEventStore implements DurableEventStore {
  private readonly events = new Map<string, DurableEventRecord>();
  async append(input: Omit<DurableEventRecord, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<DurableEventRecord> {
    const event: DurableEventRecord = { ...input, id: createId('outbox'), status: 'pending', attempts: 0, createdAt: new Date().toISOString() };
    this.events.set(event.id, event); return structuredClone(event);
  }
  async pending(tenantId: string, limit = 100): Promise<DurableEventRecord[]> {
    return [...this.events.values()].filter((event) => event.tenantId === tenantId && event.status !== 'published').slice(0, limit).map((event) => structuredClone(event));
  }
  async markPublished(id: string): Promise<void> { const event = this.events.get(id); if (event) { event.status = 'published'; event.publishedAt = new Date().toISOString(); event.attempts += 1; } }
  async markFailed(id: string, error: string): Promise<void> { const event = this.events.get(id); if (event) { event.status = 'failed'; event.lastError = error; event.attempts += 1; } }
  async close(): Promise<void> {}
}

export class PostgresDurableEventStore implements DurableEventStore {
  private pool: import('pg').Pool | null = null;
  constructor(private readonly connectionString: string) {}
  private async getPool(): Promise<import('pg').Pool> { if (this.pool) return this.pool; const { Pool } = await import('pg'); this.pool = new Pool({ connectionString: this.connectionString, application_name: 'aiw-outbox' }); return this.pool; }
  async append(input: Omit<DurableEventRecord, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<DurableEventRecord> {
    const event: DurableEventRecord = { ...input, id: createId('outbox'), status: 'pending', attempts: 0, createdAt: new Date().toISOString() };
    await (await this.getPool()).query(`INSERT INTO durable_events(event_id,tenant_id,aggregate_type,aggregate_id,event_type,payload,status,attempts,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`, [event.id,event.tenantId,event.aggregateType,event.aggregateId,event.eventType,JSON.stringify(event.payload),event.status,event.attempts,event.createdAt]);
    return event;
  }
  async pending(tenantId: string, limit = 100): Promise<DurableEventRecord[]> {
    const result = await (await this.getPool()).query(`SELECT event_id AS id,tenant_id AS "tenantId",aggregate_type AS "aggregateType",aggregate_id AS "aggregateId",event_type AS "eventType",payload,status,attempts,created_at AS "createdAt",published_at AS "publishedAt",last_error AS "lastError" FROM durable_events WHERE tenant_id=$1 AND status <> 'published' ORDER BY created_at LIMIT $2`, [tenantId,limit]);
    return result.rows as DurableEventRecord[];
  }
  async markPublished(id: string): Promise<void> { await (await this.getPool()).query(`UPDATE durable_events SET status='published',published_at=now(),attempts=attempts+1 WHERE event_id=$1`, [id]); }
  async markFailed(id: string, error: string): Promise<void> { await (await this.getPool()).query(`UPDATE durable_events SET status='failed',last_error=$2,attempts=attempts+1 WHERE event_id=$1`, [id,error]); }
  async close(): Promise<void> { if (this.pool) await this.pool.end(); }
}


export class MongoAtlasDurableEventStore implements DurableEventStore {
  private client: import('mongodb').MongoClient | null = null;
  private indexesReady = false;
  constructor(private readonly connectionString: string, private readonly dbName = mongodbDbName()) {}
  private async getClient(): Promise<import('mongodb').MongoClient> {
    if (this.client) return this.client;
    const { MongoClient } = await import('mongodb');
    this.client = new MongoClient(this.connectionString, {
      appName: 'aiw-outbox',
      maxPoolSize: Number(process.env.AIW_DB_POOL_MAX ?? 10),
      serverSelectionTimeoutMS: Number(process.env.AIW_MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 8000),
    });
    await this.client.connect();
    return this.client;
  }
  private async collection(): Promise<import('mongodb').Collection<DurableEventRecord & { eventId: string; createdAtDate: Date; publishedAtDate?: Date }>> {
    const client = await this.getClient();
    return client.db(this.dbName).collection('durable_events');
  }
  private async ensureIndexes(): Promise<void> {
    if (this.indexesReady) return;
    const collection = await this.collection();
    await Promise.all([
      collection.createIndex({ eventId: 1 }, { unique: true, name: 'uniq_event_id' }),
      collection.createIndex({ tenantId: 1, status: 1, createdAtDate: 1 }, { name: 'tenant_pending_events' }),
    ]);
    this.indexesReady = true;
  }
  async append(input: Omit<DurableEventRecord, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<DurableEventRecord> {
    await this.ensureIndexes();
    const event: DurableEventRecord = { ...input, id: createId('outbox'), status: 'pending', attempts: 0, createdAt: new Date().toISOString() };
    await (await this.collection()).insertOne({ ...event, eventId: event.id, createdAtDate: new Date(event.createdAt) });
    return structuredClone(event);
  }
  async pending(tenantId: string, limit = 100): Promise<DurableEventRecord[]> {
    await this.ensureIndexes();
    const rows = await (await this.collection()).find({ tenantId, status: { $ne: 'published' } }, { sort: { createdAtDate: 1 }, limit }).toArray();
    return rows.map((row) => ({
      id: row.eventId ?? row.id,
      tenantId: row.tenantId,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      createdAt: row.createdAt,
      ...(row.publishedAt ? { publishedAt: row.publishedAt } : {}),
      ...(row.lastError ? { lastError: row.lastError } : {}),
    }));
  }
  async markPublished(id: string): Promise<void> {
    await this.ensureIndexes();
    const publishedAt = new Date().toISOString();
    await (await this.collection()).updateOne({ eventId: id }, { $set: { status: 'published', publishedAt, publishedAtDate: new Date(publishedAt) }, $inc: { attempts: 1 } });
  }
  async markFailed(id: string, error: string): Promise<void> {
    await this.ensureIndexes();
    await (await this.collection()).updateOne({ eventId: id }, { $set: { status: 'failed', lastError: error }, $inc: { attempts: 1 } });
  }
  async close(): Promise<void> { if (this.client) await this.client.close(); }
}

export function createDurableEventStore(): DurableEventStore {
  const provider = databaseProvider();
  if (provider === 'mongodb-atlas') {
    const uri = mongodbUri();
    if (!uri) throw new Error('MONGODB_URI_REQUIRED_FOR_ATLAS_PROVIDER');
    return new MongoAtlasDurableEventStore(uri);
  }
  return process.env.DATABASE_URL ? new PostgresDurableEventStore(process.env.DATABASE_URL) : new InMemoryDurableEventStore();
}
