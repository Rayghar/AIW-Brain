import pg from 'pg';
import { createHash } from 'node:crypto';
import type { ArchitectureConformanceFinding, ArchitectureKnowledgeClaim, ConformanceEvidenceEnvelope, KnowledgeRefreshExecution, KnowledgeReleaseSignature, RecommendationOutcomeRecord } from '@aiw/domain';
import type { StoredKnowledgeObject } from './knowledgeObjectStore.js';
import { conformanceEvidenceHash } from '@aiw/engine';

export interface LlmAuditInput {
  executionId: string;
  purpose: string;
  routeId: string;
  providerId: string;
  model: string;
  requestFingerprint: string;
  dataClassification: string;
  fallbackUsed: boolean;
  latencyMs: number;
  usage: Record<string, unknown>;
  status: 'succeeded'|'failed'|'blocked';
  errorCode?: string;
}


export interface KnowledgeRecordDraftAudit {
  draftId: string;
  recordId: string;
  recordType: 'architectureStyle'|'pattern';
  status: 'candidate'|'reviewed'|'approved'|'rejected';
  owner?: string;
  sourceEvidenceIds: string[];
  record: Record<string, unknown>;
  reviewerBrief?: Record<string, unknown>;
}

export interface KnowledgeOperationsRepository {
  saveRefresh(tenantId: string, job: KnowledgeRefreshExecution): Promise<void>;
  saveObjects(tenantId: string, snapshotId: string, connectorId: string, status: 'quarantined'|'accepted'|'rejected', objects: StoredKnowledgeObject[]): Promise<void>;
  saveConformance(tenantId: string, evidence: ConformanceEvidenceEnvelope, findings: ArchitectureConformanceFinding[]): Promise<void>;
  saveSignature(tenantId: string, signature: KnowledgeReleaseSignature): Promise<void>;
  saveLlmAudit(tenantId: string, input: LlmAuditInput): Promise<void>;
  saveCandidateClaims(tenantId: string, claims: ArchitectureKnowledgeClaim[]): Promise<void>;
  saveKnowledgeRecordDraft(tenantId: string, input: KnowledgeRecordDraftAudit): Promise<void>;
  saveRecommendationOutcome(tenantId: string, input: RecommendationOutcomeRecord): Promise<void>;
  listRecommendationOutcomes(tenantId: string, recordId?: string): Promise<RecommendationOutcomeRecord[]>;
  close(): Promise<void>;
}

export class MemoryKnowledgeOperationsRepository implements KnowledgeOperationsRepository {
  readonly refreshes: KnowledgeRefreshExecution[] = [];
  readonly objects: StoredKnowledgeObject[] = [];
  readonly findings: ArchitectureConformanceFinding[] = [];
  readonly signatures: KnowledgeReleaseSignature[] = [];
  readonly llmAudits: LlmAuditInput[] = [];
  readonly candidateClaims: ArchitectureKnowledgeClaim[] = [];
  readonly knowledgeRecordDrafts: KnowledgeRecordDraftAudit[] = [];
  readonly recommendationOutcomes: Array<{ tenantId: string; outcome: RecommendationOutcomeRecord }> = [];
  async saveRefresh(_tenantId: string, job: KnowledgeRefreshExecution): Promise<void> { this.refreshes.push(structuredClone(job)); }
  async saveObjects(_tenantId: string, _snapshotId: string, _connectorId: string, _status: 'quarantined'|'accepted'|'rejected', objects: StoredKnowledgeObject[]): Promise<void> { this.objects.push(...structuredClone(objects)); }
  async saveConformance(_tenantId: string, _evidence: ConformanceEvidenceEnvelope, findings: ArchitectureConformanceFinding[]): Promise<void> { this.findings.push(...structuredClone(findings)); }
  async saveSignature(_tenantId: string, signature: KnowledgeReleaseSignature): Promise<void> { this.signatures.push(structuredClone(signature)); }
  async saveLlmAudit(_tenantId: string, input: LlmAuditInput): Promise<void> { this.llmAudits.push(structuredClone(input)); }
  async saveCandidateClaims(_tenantId: string, claims: ArchitectureKnowledgeClaim[]): Promise<void> { this.candidateClaims.push(...structuredClone(claims)); }
  async saveKnowledgeRecordDraft(_tenantId: string, input: KnowledgeRecordDraftAudit): Promise<void> {
    const index = this.knowledgeRecordDrafts.findIndex((item) => item.draftId === input.draftId);
    if (index >= 0) this.knowledgeRecordDrafts[index] = structuredClone(input); else this.knowledgeRecordDrafts.push(structuredClone(input));
  }
  async saveRecommendationOutcome(tenantId: string, input: RecommendationOutcomeRecord): Promise<void> {
    const index = this.recommendationOutcomes.findIndex((item) => item.tenantId === tenantId && item.outcome.id === input.id);
    const stored = { tenantId, outcome: structuredClone(input) };
    if (index >= 0) this.recommendationOutcomes[index] = stored; else this.recommendationOutcomes.push(stored);
  }
  async listRecommendationOutcomes(tenantId: string, recordId?: string): Promise<RecommendationOutcomeRecord[]> {
    return this.recommendationOutcomes
      .filter((item) => item.tenantId === tenantId && (!recordId || item.outcome.recordId === recordId))
      .map((item) => structuredClone(item.outcome));
  }
  async close(): Promise<void> {}
}

export class PostgresKnowledgeOperationsRepository implements KnowledgeOperationsRepository {
  private readonly pool: pg.Pool;
  constructor(connectionString: string) { this.pool = new pg.Pool({ connectionString, max: Number(process.env.AIW_DB_POOL_MAX || 10), application_name: 'aiw-knowledge-operations' }); }
  private async run<T>(tenantId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN'); await client.query(`SELECT set_config('aiw.tenant_id', $1, true)`, [tenantId]);
      const result = await fn(client); await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }
  async saveRefresh(tenantId: string, job: KnowledgeRefreshExecution): Promise<void> {
    await this.run(tenantId, async (client) => { await client.query(
      `INSERT INTO knowledge_refresh_jobs(tenant_id,job_id,connector_id,trigger_type,status,requested_revision,resolved_revision,snapshot_id,object_manifest_uri,result,error_code,requested_by,requested_at,started_at,completed_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15)
       ON CONFLICT(tenant_id,job_id) DO UPDATE SET status=excluded.status,resolved_revision=excluded.resolved_revision,snapshot_id=excluded.snapshot_id,object_manifest_uri=excluded.object_manifest_uri,result=excluded.result,error_code=excluded.error_code,started_at=excluded.started_at,completed_at=excluded.completed_at`,
      [tenantId,job.id,job.connectorId,job.triggerType,job.status,job.requestedRevision ?? null,job.resolvedRevision ?? null,job.snapshotId ?? null,job.objectManifestUri ?? null,JSON.stringify(job.result),job.errorCode ?? null,job.requestedBy,job.requestedAt,job.startedAt ?? null,job.completedAt ?? null]); });
  }
  async saveObjects(tenantId: string, snapshotId: string, connectorId: string, status: 'quarantined'|'accepted'|'rejected', objects: StoredKnowledgeObject[]): Promise<void> {
    await this.run(tenantId, async (client) => {
      for (const object of objects) await client.query(
        `INSERT INTO knowledge_object_references(tenant_id,object_id,snapshot_id,connector_id,object_key,object_uri,media_type,size_bytes,sha256,quarantine_status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT(tenant_id,object_key) DO UPDATE SET object_uri=excluded.object_uri,media_type=excluded.media_type,size_bytes=excluded.size_bytes,sha256=excluded.sha256,quarantine_status=excluded.quarantine_status`,
        [tenantId,`KOBJ-${createHash('sha256').update(object.key).digest('hex').slice(0,20)}`,snapshotId,connectorId,object.key,object.uri,object.mediaType,object.sizeBytes,object.sha256,status]);
    });
  }
  async saveConformance(tenantId: string, evidence: ConformanceEvidenceEnvelope, findings: ArchitectureConformanceFinding[]): Promise<void> {
    await this.run(tenantId, async (client) => {
      await client.query(
        `INSERT INTO conformance_evidence(tenant_id,evidence_id,project_id,branch_id,source_type,repository_url,commit_sha,workflow_run_id,environment,raw_evidence,content_hash,collected_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)
         ON CONFLICT(tenant_id,evidence_id) DO NOTHING`,
        [tenantId,evidence.id,evidence.projectId,evidence.branchId,evidence.sourceType,evidence.repositoryUrl ?? null,evidence.commitSha ?? null,evidence.workflowRunId ?? null,evidence.environment ?? null,JSON.stringify(evidence.payload),conformanceEvidenceHash(evidence),evidence.collectedAt]);
      for (const item of findings) await client.query(
        `INSERT INTO conformance_findings(tenant_id,finding_id,evidence_id,project_id,branch_id,architecture_object_id,decision_id,rule_id,severity,status,title,description,remediation,detail)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
         ON CONFLICT(tenant_id,finding_id) DO UPDATE SET status=excluded.status,severity=excluded.severity,description=excluded.description,detail=excluded.detail`,
        [tenantId,item.id,item.evidenceId,item.projectId,item.branchId,item.architectureObjectId ?? null,item.decisionId ?? null,item.ruleId,item.severity,item.status,item.title,item.description,item.remediation ?? null,JSON.stringify(item.detail)]);
    });
  }
  async saveSignature(tenantId: string, signature: KnowledgeReleaseSignature): Promise<void> {
    await this.run(tenantId, async (client) => { await client.query(
      `INSERT INTO knowledge_release_signatures(tenant_id,release_id,checksum_sha256,signature_algorithm,public_key_id,public_key_pem,signature_base64,signed_by,signed_at,verification_status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(tenant_id,release_id,public_key_id) DO UPDATE SET signature_base64=excluded.signature_base64,signed_at=excluded.signed_at,verification_status=excluded.verification_status`,
      [tenantId,signature.releaseId,signature.checksumSha256,signature.signatureAlgorithm,signature.publicKeyId,signature.publicKeyPem,signature.signatureBase64,signature.signedBy,signature.signedAt,signature.verificationStatus]); });
  }
  async saveLlmAudit(tenantId: string, input: LlmAuditInput): Promise<void> {
    await this.run(tenantId, async (client) => { await client.query(
      `INSERT INTO llm_execution_audit(tenant_id,execution_id,purpose,route_id,provider_id,model,request_fingerprint,data_classification,fallback_used,latency_ms,usage,status,error_code)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)`,
      [tenantId,input.executionId,input.purpose,input.routeId,input.providerId,input.model,input.requestFingerprint,input.dataClassification,input.fallbackUsed,input.latencyMs,JSON.stringify(input.usage),input.status,input.errorCode ?? null]); });
  }
  async saveCandidateClaims(tenantId: string, claims: ArchitectureKnowledgeClaim[]): Promise<void> {
    await this.run(tenantId, async (client) => {
      for (const claim of claims) await client.query(
        `INSERT INTO architecture_knowledge_claims(tenant_id,claim_id,subject_id,claim_type,predicate,object_value,polarity,review_status,source_confidence,corroboration_score,definition,reviewed_by,reviewed_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,'candidate',$8,$9,$10::jsonb,NULL,NULL)
         ON CONFLICT(tenant_id,claim_id) DO UPDATE SET definition=excluded.definition,source_confidence=excluded.source_confidence,corroboration_score=excluded.corroboration_score,review_status='candidate'`,
        [tenantId,claim.id,claim.subjectId,claim.claimType,claim.predicate,claim.object,claim.polarity,claim.sourceConfidence,claim.corroborationScore,JSON.stringify({ ...claim, reviewStatus: 'candidate' })]);
    });
  }
  async saveKnowledgeRecordDraft(tenantId: string, input: KnowledgeRecordDraftAudit): Promise<void> {
    await this.run(tenantId, async (client) => {
      await client.query(
        `INSERT INTO knowledge_record_drafts(tenant_id,draft_id,record_id,record_type,status,owner,source_evidence_ids,record,reviewer_brief,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,now())
         ON CONFLICT(tenant_id,draft_id) DO UPDATE SET status=excluded.status,owner=excluded.owner,source_evidence_ids=excluded.source_evidence_ids,record=excluded.record,reviewer_brief=excluded.reviewer_brief,updated_at=now()`,
        [tenantId,input.draftId,input.recordId,input.recordType,input.status,input.owner ?? null,JSON.stringify(input.sourceEvidenceIds),JSON.stringify(input.record),JSON.stringify(input.reviewerBrief ?? {})]);
    });
  }
  async saveRecommendationOutcome(tenantId: string, input: RecommendationOutcomeRecord): Promise<void> {
    await this.run(tenantId, async (client) => { await client.query(
      `INSERT INTO recommendation_outcomes(tenant_id,outcome_id,project_id,recommendation_id,recommendation_type,record_id,stage,decision,reason,decided_by,decided_at,implemented_at,review_result,conformance_result,observed_outcomes,expected_outcomes,knowledge_release_id,auto_learning_applied)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,false)
       ON CONFLICT(tenant_id,outcome_id) DO UPDATE SET decision=excluded.decision,reason=excluded.reason,implemented_at=excluded.implemented_at,review_result=excluded.review_result,conformance_result=excluded.conformance_result,observed_outcomes=excluded.observed_outcomes,expected_outcomes=excluded.expected_outcomes`,
      [tenantId,input.id,input.projectId,input.recommendationId,input.recommendationType,input.recordId ?? null,input.stage,input.decision,input.reason,input.decidedBy,input.decidedAt,input.implementedAt ?? null,input.reviewResult ?? null,input.conformanceResult ?? null,JSON.stringify(input.observedOutcomes ?? {}),JSON.stringify(input.expectedOutcomes ?? {}),input.knowledgeReleaseId]); });
  }
  async listRecommendationOutcomes(tenantId: string, recordId?: string): Promise<RecommendationOutcomeRecord[]> {
    return this.run(tenantId, async (client) => {
      const result = await client.query(
        `SELECT outcome_id,project_id,recommendation_id,recommendation_type,record_id,stage,decision,reason,decided_by,decided_at,implemented_at,review_result,conformance_result,observed_outcomes,expected_outcomes,knowledge_release_id
         FROM recommendation_outcomes WHERE tenant_id=$1 AND ($2::text IS NULL OR record_id=$2) ORDER BY decided_at DESC`, [tenantId, recordId ?? null]);
      return result.rows.map((row) => ({
        id: String(row.outcome_id), projectId: String(row.project_id), recommendationId: String(row.recommendation_id), recommendationType: row.recommendation_type,
        ...(row.record_id ? { recordId: String(row.record_id) } : {}), stage: row.stage, decision: row.decision, reason: String(row.reason), decidedBy: String(row.decided_by),
        decidedAt: new Date(row.decided_at).toISOString(), ...(row.implemented_at ? { implementedAt: new Date(row.implemented_at).toISOString() } : {}),
        ...(row.review_result ? { reviewResult: row.review_result } : {}), ...(row.conformance_result ? { conformanceResult: row.conformance_result } : {}),
        observedOutcomes: row.observed_outcomes ?? {}, expectedOutcomes: row.expected_outcomes ?? {}, knowledgeReleaseId: String(row.knowledge_release_id), autoLearningApplied: false as const,
      }));
    });
  }
  async close(): Promise<void> { await this.pool.end(); }
}

export function createKnowledgeOperationsRepository(): KnowledgeOperationsRepository {
  return process.env.DATABASE_URL ? new PostgresKnowledgeOperationsRepository(process.env.DATABASE_URL) : new MemoryKnowledgeOperationsRepository();
}
