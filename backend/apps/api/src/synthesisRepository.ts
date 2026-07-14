import pg from 'pg';
import type { ArchitectureSimulationResult, ArchitectureSynthesisRun, SynthesisArtifactBundle, SynthesisDecisionPackage } from '@aiw/domain';

export interface SynthesisRepository {
  saveRun(run: ArchitectureSynthesisRun, requestedBy: string): Promise<void>;
  getRun(tenantId: string, runId: string): Promise<ArchitectureSynthesisRun | null>;
  listRuns(tenantId: string, projectId: string): Promise<ArchitectureSynthesisRun[]>;
  saveSimulations(tenantId: string, results: ArchitectureSimulationResult[], actor: string): Promise<void>;
  listSimulations(tenantId: string, runId: string, alternativeId?: string): Promise<ArchitectureSimulationResult[]>;
  saveDecision(tenantId: string, decision: SynthesisDecisionPackage, actor: string): Promise<void>;
  saveArtifactBundle(tenantId: string, bundle: SynthesisArtifactBundle, actor: string): Promise<void>;
  close(): Promise<void>;
}

export class MemorySynthesisRepository implements SynthesisRepository {
  readonly runs = new Map<string, ArchitectureSynthesisRun>();
  readonly simulations: ArchitectureSimulationResult[] = [];
  readonly decisions: SynthesisDecisionPackage[] = [];
  readonly bundles: SynthesisArtifactBundle[] = [];
  async saveRun(run: ArchitectureSynthesisRun): Promise<void> { this.runs.set(`${run.tenantId}:${run.id}`, structuredClone(run)); }
  async getRun(tenantId: string, runId: string): Promise<ArchitectureSynthesisRun | null> { return structuredClone(this.runs.get(`${tenantId}:${runId}`) ?? null); }
  async listRuns(tenantId: string, projectId: string): Promise<ArchitectureSynthesisRun[]> { return [...this.runs.values()].filter((item) => item.tenantId === tenantId && item.projectId === projectId).sort((a,b) => b.generatedAt.localeCompare(a.generatedAt)).map((item) => structuredClone(item)); }
  async saveSimulations(_tenantId: string, results: ArchitectureSimulationResult[]): Promise<void> { for (const result of results) { const index = this.simulations.findIndex((item) => item.id === result.id); if (index >= 0) this.simulations[index] = structuredClone(result); else this.simulations.push(structuredClone(result)); } }
  async listSimulations(_tenantId: string, runId: string, alternativeId?: string): Promise<ArchitectureSimulationResult[]> { return this.simulations.filter((item) => item.runId === runId && (!alternativeId || item.alternativeId === alternativeId)).map((item) => structuredClone(item)); }
  async saveDecision(_tenantId: string, decision: SynthesisDecisionPackage): Promise<void> { this.decisions.push(structuredClone(decision)); }
  async saveArtifactBundle(_tenantId: string, bundle: SynthesisArtifactBundle): Promise<void> { this.bundles.push(structuredClone(bundle)); }
  async close(): Promise<void> {}
}

export class PostgresSynthesisRepository implements SynthesisRepository {
  private readonly pool: pg.Pool;
  constructor(connectionString: string) { this.pool = new pg.Pool({ connectionString, max: Number(process.env.AIW_DB_POOL_MAX || 10), application_name: 'aiw-synthesis' }); }
  private async run<T>(tenantId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); await client.query(`SELECT set_config('aiw.tenant_id',$1,true)`, [tenantId]); const value = await fn(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }
  async saveRun(run: ArchitectureSynthesisRun, requestedBy: string): Promise<void> {
    await this.run(run.tenantId, async (client) => {
      await client.query(`INSERT INTO architecture_synthesis_runs(tenant_id,run_id,project_id,branch_id,project_revision,knowledge_release_id,input_fingerprint,mode,assessment,pareto_alternative_ids,recommended_alternative_id,warnings,model_trace,requested_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14)
        ON CONFLICT(tenant_id,run_id) DO UPDATE SET assessment=excluded.assessment,pareto_alternative_ids=excluded.pareto_alternative_ids,recommended_alternative_id=excluded.recommended_alternative_id,warnings=excluded.warnings,model_trace=excluded.model_trace,updated_at=now()`,
        [run.tenantId,run.id,run.projectId,run.branchId,run.projectRevision,run.knowledgeReleaseId,run.inputFingerprint,run.mode,JSON.stringify(run.assessment),JSON.stringify(run.paretoAlternativeIds),run.recommendedAlternativeId ?? null,JSON.stringify(run.warnings),run.modelTrace ? JSON.stringify(run.modelTrace) : null,requestedBy]);
      await client.query('DELETE FROM architecture_synthesis_alternatives WHERE tenant_id=$1 AND run_id=$2',[run.tenantId,run.id]);
      for (const alt of run.alternatives) await client.query(`INSERT INTO architecture_synthesis_alternatives(tenant_id,run_id,alternative_id,strategy_id,name,overall_score,pattern_ids,alternative) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,[run.tenantId,run.id,alt.id,alt.strategyId,alt.name,alt.scorecard.overall,JSON.stringify(alt.patternIds),JSON.stringify(alt)]);
    });
  }
  async getRun(tenantId: string, runId: string): Promise<ArchitectureSynthesisRun | null> {
    return this.run(tenantId, async (client) => { const run = await client.query('SELECT * FROM architecture_synthesis_runs WHERE tenant_id=$1 AND run_id=$2',[tenantId,runId]); if (!run.rows[0]) return null; const alts = await client.query('SELECT alternative FROM architecture_synthesis_alternatives WHERE tenant_id=$1 AND run_id=$2 ORDER BY overall_score DESC',[tenantId,runId]); const row=run.rows[0]; return { id:row.run_id,tenantId:row.tenant_id,projectId:row.project_id,branchId:row.branch_id,projectRevision:row.project_revision,knowledgeReleaseId:row.knowledge_release_id,generatedAt:new Date(row.created_at).toISOString(),inputFingerprint:row.input_fingerprint,mode:row.mode,assessment:row.assessment,alternatives:alts.rows.map((item)=>item.alternative),paretoAlternativeIds:row.pareto_alternative_ids,warnings:row.warnings,...(row.recommended_alternative_id?{recommendedAlternativeId:row.recommended_alternative_id}:{}),...(row.model_trace?{modelTrace:row.model_trace}:{}) } as ArchitectureSynthesisRun; });
  }
  async listRuns(tenantId: string, projectId: string): Promise<ArchitectureSynthesisRun[]> { return this.run(tenantId, async (client) => { const result=await client.query('SELECT run_id FROM architecture_synthesis_runs WHERE tenant_id=$1 AND project_id=$2 ORDER BY created_at DESC LIMIT 50',[tenantId,projectId]); const runs:ArchitectureSynthesisRun[]=[]; for (const row of result.rows) { const run=await this.getRun(tenantId,row.run_id); if(run) runs.push(run); } return runs; }); }
  async saveSimulations(tenantId: string, results: ArchitectureSimulationResult[], actor: string): Promise<void> { await this.run(tenantId, async (client) => { for(const item of results) await client.query(`INSERT INTO architecture_simulation_results(tenant_id,simulation_result_id,run_id,alternative_id,scenario_id,scenario_type,deterministic_model_version,result,simulated_by,simulated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) ON CONFLICT(tenant_id,simulation_result_id) DO UPDATE SET result=excluded.result,simulated_by=excluded.simulated_by,simulated_at=excluded.simulated_at`,[tenantId,item.id,item.runId,item.alternativeId,item.scenario.id,item.scenario.type,item.deterministicModelVersion,JSON.stringify(item),actor,item.simulatedAt]); }); }
  async listSimulations(tenantId: string, runId: string, alternativeId?: string): Promise<ArchitectureSimulationResult[]> { return this.run(tenantId, async (client) => { const result=await client.query(`SELECT result FROM architecture_simulation_results WHERE tenant_id=$1 AND run_id=$2 ${alternativeId?'AND alternative_id=$3':''} ORDER BY simulated_at DESC`, alternativeId?[tenantId,runId,alternativeId]:[tenantId,runId]); return result.rows.map((row)=>row.result); }); }
  async saveDecision(tenantId: string, decision: SynthesisDecisionPackage, actor: string): Promise<void> { await this.run(tenantId, async (client) => { await client.query(`INSERT INTO architecture_synthesis_decisions(tenant_id,decision_package_id,run_id,alternative_id,status,decision_package,decided_by,decided_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) ON CONFLICT(tenant_id,decision_package_id) DO UPDATE SET status=excluded.status,decision_package=excluded.decision_package,decided_by=excluded.decided_by,decided_at=excluded.decided_at`,[tenantId,decision.id,decision.runId,decision.alternativeId,decision.status,JSON.stringify(decision),actor,decision.status==='accepted'?new Date():null]); }); }
  async saveArtifactBundle(tenantId: string, bundle: SynthesisArtifactBundle, actor: string): Promise<void> { await this.run(tenantId, async (client) => { await client.query(`INSERT INTO synthesis_artifact_manifests(tenant_id,manifest_id,run_id,alternative_id,manifest,generated_by) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(tenant_id,manifest_id) DO UPDATE SET manifest=excluded.manifest,generated_by=excluded.generated_by,generated_at=now()`,[tenantId,`MANIFEST-${bundle.runId}-${bundle.alternativeId}`,bundle.runId,bundle.alternativeId,JSON.stringify(bundle.manifest),actor]); }); }
  async close(): Promise<void> { await this.pool.end(); }
}

export function createSynthesisRepository(): SynthesisRepository { return process.env.DATABASE_URL ? new PostgresSynthesisRepository(process.env.DATABASE_URL) : new MemorySynthesisRepository(); }
