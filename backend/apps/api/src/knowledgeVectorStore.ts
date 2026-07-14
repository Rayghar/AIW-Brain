import pg from 'pg';
import { createHash } from 'node:crypto';
import { EmbeddingGateway, vectorLiteral } from './embeddingGateway.js';

export interface ApprovedKnowledgeVectorRecord {
  releaseId: string;
  recordType: 'claim'|'pattern'|'anti-pattern'|'topology-template'|'rule';
  recordId: string;
  sourceText: string;
  metadata?: Record<string, unknown>;
}

export interface HybridKnowledgeHit {
  recordType: ApprovedKnowledgeVectorRecord['recordType'];
  recordId: string;
  sourceText: string;
  metadata: Record<string, unknown>;
  semanticScore: number;
  lexicalScore: number;
  score: number;
}

function stableId(input: string): string { return `KEMB-${createHash('sha256').update(input).digest('hex').slice(0, 24)}`; }

export class ApprovedKnowledgeVectorStore {
  private readonly pool: pg.Pool;
  constructor(connectionString = process.env.DATABASE_URL, private readonly embeddings = new EmbeddingGateway()) {
    if (!connectionString) throw new Error('DATABASE_URL_REQUIRED_FOR_VECTOR_STORE');
    this.pool = new pg.Pool({ connectionString, max: Number(process.env.AIW_DB_POOL_MAX || 10), application_name: 'aiw-vector-store' });
  }

  async close(): Promise<void> { await this.pool.end(); }

  private async tenantClient<T>(tenantId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('aiw.tenant_id', $1, true)`, [tenantId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async upsert(tenantId: string, record: ApprovedKnowledgeVectorRecord): Promise<{ embeddingId: string; model: string; contentHash: string }> {
    const embedded = await this.embeddings.embed(record.sourceText);
    const embeddingId = stableId(`${tenantId}:${record.releaseId}:${record.recordType}:${record.recordId}:${embedded.model}`);
    await this.tenantClient(tenantId, async (client) => {
      await client.query(
        `INSERT INTO approved_knowledge_embeddings(tenant_id, embedding_id, release_id, record_type, record_id, content_hash, source_text, embedding_model, embedding, metadata)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10::jsonb)
         ON CONFLICT (tenant_id, release_id, record_type, record_id, embedding_model)
         DO UPDATE SET content_hash=excluded.content_hash, source_text=excluded.source_text, embedding=excluded.embedding, metadata=excluded.metadata, created_at=now()`,
        [tenantId, embeddingId, record.releaseId, record.recordType, record.recordId, embedded.contentHash, record.sourceText, embedded.model, vectorLiteral(embedded.vector), JSON.stringify(record.metadata ?? {})],
      );
    });
    return { embeddingId, model: embedded.model, contentHash: embedded.contentHash };
  }

  async search(tenantId: string, releaseId: string, query: string, limit = 12): Promise<HybridKnowledgeHit[]> {
    const embedded = await this.embeddings.embed(query);
    return this.tenantClient(tenantId, async (client) => {
      const result = await client.query(
        `WITH ranked AS (
           SELECT record_type, record_id, source_text, metadata,
                  GREATEST(0, 1 - (embedding <=> $3::vector)) AS semantic_score,
                  ts_rank_cd(to_tsvector('english', source_text), plainto_tsquery('english', $4)) AS lexical_score
           FROM approved_knowledge_embeddings
           WHERE tenant_id=$1 AND release_id=$2
         )
         SELECT record_type, record_id, source_text, metadata, semantic_score, lexical_score,
                (semantic_score * 0.72 + LEAST(1, lexical_score) * 0.28) AS score
         FROM ranked
         ORDER BY score DESC, record_id
         LIMIT $5`,
        [tenantId, releaseId, vectorLiteral(embedded.vector), query, Math.max(1, Math.min(50, limit))],
      );
      return result.rows.map((row) => ({
        recordType: row.record_type,
        recordId: row.record_id,
        sourceText: row.source_text,
        metadata: row.metadata ?? {},
        semanticScore: Number(row.semantic_score),
        lexicalScore: Number(row.lexical_score),
        score: Number(row.score),
      }));
    });
  }

  async health(): Promise<{ ready: boolean; vectorExtension: boolean; count: number }> {
    const client = await this.pool.connect();
    try {
      const extension = await client.query(`SELECT 1 FROM pg_extension WHERE extname='vector'`);
      const count = await client.query(`SELECT count(*)::int AS count FROM approved_knowledge_embeddings`);
      return { ready: true, vectorExtension: Boolean(extension.rowCount), count: Number(count.rows[0]?.count ?? 0) };
    } catch { return { ready: false, vectorExtension: false, count: 0 }; }
    finally { client.release(); }
  }
}
