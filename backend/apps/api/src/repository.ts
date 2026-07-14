import { createHash } from 'node:crypto';
import type { ArchitectureProject, PortfolioEntry, ProjectSnapshot } from '@aiw/domain';
import { createId, synchronizeArchitectureProjectDesignGraphState } from '@aiw/domain';
import { databaseProvider, mongodbDbName, mongodbUri } from './databaseMode.js';

export interface SaveSnapshotInput {
  project: ArchitectureProject;
  label: string;
  status: ProjectSnapshot['status'];
  createdBy: string;
}

export class RepositoryRevisionConflict extends Error {
  constructor(public readonly currentRevision: number) { super('REVISION_CONFLICT'); }
}

export interface ProjectRepository {
  saveProject(project: ArchitectureProject, expectedRevision?: number): Promise<ArchitectureProject>;
  getProject(tenantId: string, projectId: string, branchId: string): Promise<ArchitectureProject | null>;
  listProjects(tenantId: string): Promise<PortfolioEntry[]>;
  saveSnapshot(input: SaveSnapshotInput): Promise<ProjectSnapshot>;
  listSnapshots(tenantId: string, projectId: string): Promise<Array<Omit<ProjectSnapshot, 'project'>>>;
  getSnapshot(tenantId: string, projectId: string, snapshotId: string): Promise<ProjectSnapshot | null>;
  close(): Promise<void>;
}

function contentHash(project: ArchitectureProject): string {
  return createHash('sha256').update(JSON.stringify(project)).digest('hex');
}

function portfolio(project: ArchitectureProject): PortfolioEntry {
  const hard = project.findings.filter((item) => item.severity === 'HARD').length;
  const significant = project.findings.filter((item) => item.severity === 'SIGNIFICANT').length;
  return {
    id: project.id, name: project.name, description: project.description,
    owner: project.members.find((item) => item.role === 'owner')?.displayName ?? 'Unassigned',
    status: project.stageApprovals.some((item) => item.status === 'approved') ? 'in-review' : 'draft',
    healthScore: Math.max(0, 100 - hard * 20 - significant * 7), updatedAt: project.updatedAt, branchCount: 1,
    openFindings: project.findings.length, approvalProgress: Math.round(project.stageApprovals.filter((item) => item.status === 'approved').length / 6 * 100),
  };
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly snapshots = new Map<string, ProjectSnapshot[]>();
  private readonly projects = new Map<string, ArchitectureProject>();
  private key(tenantId: string, projectId: string, branchId: string): string { return `${tenantId}:${projectId}:${branchId}`; }
  private snapshotKey(tenantId: string, projectId: string): string { return `${tenantId}:${projectId}`; }

  async saveProject(project: ArchitectureProject, expectedRevision?: number): Promise<ArchitectureProject> {
    project = synchronizeArchitectureProjectDesignGraphState(project);
    const key = this.key(project.tenantId, project.id, project.branch.id);
    const existing = this.projects.get(key);
    if (expectedRevision !== undefined && existing && existing.revision !== expectedRevision) throw new RepositoryRevisionConflict(existing.revision);
    const copy = structuredClone(project); this.projects.set(key, copy); return structuredClone(copy);
  }

  async getProject(tenantId: string, projectId: string, branchId: string): Promise<ArchitectureProject | null> {
    const project = this.projects.get(this.key(tenantId, projectId, branchId));
    return project ? structuredClone(project) : null;
  }

  async listProjects(tenantId: string): Promise<PortfolioEntry[]> {
    const latest = new Map<string, ArchitectureProject>();
    for (const project of this.projects.values()) {
      if (project.tenantId !== tenantId) continue;
      const current = latest.get(project.id);
      if (!current || new Date(project.updatedAt) > new Date(current.updatedAt)) latest.set(project.id, project);
    }
    return [...latest.values()].map(portfolio);
  }

  async saveSnapshot(input: SaveSnapshotInput): Promise<ProjectSnapshot> {
    input = { ...input, project: synchronizeArchitectureProjectDesignGraphState(input.project) };
    const snapshot: ProjectSnapshot = {
      id: createId('snapshot'), projectId: input.project.id, revision: input.project.revision, label: input.label, status: input.status,
      createdAt: new Date().toISOString(), contentHash: contentHash(input.project), project: structuredClone(input.project),
    };
    const key = this.snapshotKey(input.project.tenantId, input.project.id);
    this.snapshots.set(key, [snapshot, ...(this.snapshots.get(key) ?? [])]);
    return structuredClone(snapshot);
  }

  async listSnapshots(tenantId: string, projectId: string): Promise<Array<Omit<ProjectSnapshot, 'project'>>> {
    return (this.snapshots.get(this.snapshotKey(tenantId, projectId)) ?? []).map(({ project: _project, ...metadata }) => metadata);
  }

  async getSnapshot(tenantId: string, projectId: string, snapshotId: string): Promise<ProjectSnapshot | null> {
    return structuredClone(this.snapshots.get(this.snapshotKey(tenantId, projectId))?.find((item) => item.id === snapshotId) ?? null);
  }
  async close(): Promise<void> {}
}

export class PostgresProjectRepository implements ProjectRepository {
  private pool: import('pg').Pool | null = null;
  constructor(private readonly connectionString: string) {}
  private async getPool(): Promise<import('pg').Pool> {
    if (this.pool) return this.pool;
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.connectionString, max: Number(process.env.AIW_DB_POOL_MAX ?? 10), application_name: 'aiw-api' });
    return this.pool;
  }

  async saveProject(project: ArchitectureProject, expectedRevision?: number): Promise<ArchitectureProject> {
    project = synchronizeArchitectureProjectDesignGraphState(project);
    const client = await (await this.getPool()).connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('aiw.tenant_id', $1, true)`, [project.tenantId]);
      const existing = await client.query(`SELECT current_revision FROM project_branch_documents WHERE tenant_id=$1 AND project_id=$2 AND branch_id=$3 FOR UPDATE`, [project.tenantId, project.id, project.branch.id]);
      const currentRevision = existing.rows[0]?.current_revision as number | undefined;
      if (expectedRevision !== undefined && currentRevision !== undefined && currentRevision !== expectedRevision) throw new RepositoryRevisionConflict(currentRevision);
      await this.saveProjectWithinTransaction(client, project);
      await client.query('COMMIT');
      return structuredClone(project);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  private async saveProjectWithinTransaction(client: import('pg').PoolClient, project: ArchitectureProject): Promise<void> {
    await client.query(
      `INSERT INTO projects(tenant_id,project_id,name,description,active_stage,current_revision,updated_at) VALUES($1,$2,$3,$4,$5,$6,now())
       ON CONFLICT(tenant_id,project_id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,active_stage=EXCLUDED.active_stage,current_revision=EXCLUDED.current_revision,updated_at=now()`,
      [project.tenantId, project.id, project.name, project.description, project.activeStage, project.revision],
    );
    await client.query(
      `INSERT INTO architecture_branches(tenant_id,branch_id,project_id,name,description,parent_branch_id,base_revision,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(tenant_id,branch_id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,status=EXCLUDED.status`,
      [project.tenantId, project.branch.id, project.id, project.branch.name, project.branch.description, project.branch.parentBranchId ?? null, project.branch.baseRevision, project.branch.status, project.branch.createdAt],
    );
    await client.query(
      `INSERT INTO project_branch_documents(tenant_id,project_id,branch_id,current_revision,canonical_model,content_hash,updated_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,now())
       ON CONFLICT(tenant_id,project_id,branch_id) DO UPDATE SET current_revision=EXCLUDED.current_revision,canonical_model=EXCLUDED.canonical_model,content_hash=EXCLUDED.content_hash,updated_at=now()`,
      [project.tenantId, project.id, project.branch.id, project.revision, JSON.stringify(project), contentHash(project)],
    );
  }

  async getProject(tenantId: string, projectId: string, branchId: string): Promise<ArchitectureProject | null> {
    const result = await (await this.getPool()).query(`SELECT canonical_model AS project FROM project_branch_documents WHERE tenant_id=$1 AND project_id=$2 AND branch_id=$3`, [tenantId, projectId, branchId]);
    return (result.rows[0]?.project as ArchitectureProject | undefined) ?? null;
  }

  async listProjects(tenantId: string): Promise<PortfolioEntry[]> {
    const result = await (await this.getPool()).query(`SELECT DISTINCT ON (project_id) canonical_model AS project FROM project_branch_documents WHERE tenant_id=$1 ORDER BY project_id,updated_at DESC`, [tenantId]);
    return result.rows.map((row) => portfolio(row.project as ArchitectureProject));
  }

  async saveSnapshot(input: SaveSnapshotInput): Promise<ProjectSnapshot> {
    input = { ...input, project: synchronizeArchitectureProjectDesignGraphState(input.project) };
    const client = await (await this.getPool()).connect();
    const id = createId('snapshot'); const hash = contentHash(input.project); const createdAt = new Date().toISOString();
    try {
      await client.query('BEGIN'); await client.query(`SELECT set_config('aiw.tenant_id',$1,true)`, [input.project.tenantId]);
      await this.saveProjectWithinTransaction(client, input.project);
      await client.query(
        `INSERT INTO project_snapshots(tenant_id,snapshot_id,project_id,branch_id,revision,status,label,canonical_model,content_hash,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)`,
        [input.project.tenantId,id,input.project.id,input.project.branch.id,input.project.revision,input.status,input.label,JSON.stringify(input.project),hash,input.createdBy,createdAt],
      );
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    return { id, projectId: input.project.id, revision: input.project.revision, label: input.label, status: input.status, createdAt, contentHash: hash, project: structuredClone(input.project) };
  }

  async listSnapshots(tenantId: string, projectId: string): Promise<Array<Omit<ProjectSnapshot, 'project'>>> {
    const result = await (await this.getPool()).query(`SELECT snapshot_id AS id,project_id AS "projectId",revision,label,status,created_at AS "createdAt",content_hash AS "contentHash" FROM project_snapshots WHERE tenant_id=$1 AND project_id=$2 ORDER BY created_at DESC`, [tenantId,projectId]);
    return result.rows as Array<Omit<ProjectSnapshot, 'project'>>;
  }

  async getSnapshot(tenantId: string, projectId: string, snapshotId: string): Promise<ProjectSnapshot | null> {
    const result = await (await this.getPool()).query(`SELECT snapshot_id AS id,project_id AS "projectId",revision,label,status,created_at AS "createdAt",content_hash AS "contentHash",canonical_model AS project FROM project_snapshots WHERE tenant_id=$1 AND project_id=$2 AND snapshot_id=$3`, [tenantId,projectId,snapshotId]);
    return (result.rows[0] as ProjectSnapshot | undefined) ?? null;
  }

  async close(): Promise<void> { if (this.pool) await this.pool.end(); }
}


export class MongoAtlasProjectRepository implements ProjectRepository {
  private client: import('mongodb').MongoClient | null = null;
  private indexesReady = false;
  constructor(private readonly connectionString: string, private readonly dbName = mongodbDbName()) {}

  private async getClient(): Promise<import('mongodb').MongoClient> {
    if (this.client) return this.client;
    const { MongoClient } = await import('mongodb');
    this.client = new MongoClient(this.connectionString, {
      appName: 'aiw-api',
      maxPoolSize: Number(process.env.AIW_DB_POOL_MAX ?? 10),
      serverSelectionTimeoutMS: Number(process.env.AIW_MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 8000),
    });
    await this.client.connect();
    return this.client;
  }

  private async db(): Promise<import('mongodb').Db> {
    const client = await this.getClient();
    return client.db(this.dbName);
  }

  private async projectDocuments(): Promise<import('mongodb').Collection> {
    const db = await this.db();
    return db.collection('project_branch_documents');
  }

  private async snapshotDocuments(): Promise<import('mongodb').Collection> {
    const db = await this.db();
    return db.collection('project_snapshots');
  }

  private async ensureIndexes(): Promise<void> {
    if (this.indexesReady) return;
    const projects = await this.projectDocuments();
    const snapshots = await this.snapshotDocuments();
    await Promise.all([
      projects.createIndex({ tenantId: 1, projectId: 1, branchId: 1 }, { unique: true, name: 'uniq_project_branch' }),
      projects.createIndex({ tenantId: 1, projectId: 1, updatedAt: -1 }, { name: 'tenant_project_latest' }),
      snapshots.createIndex({ tenantId: 1, projectId: 1, snapshotId: 1 }, { unique: true, name: 'uniq_project_snapshot' }),
      snapshots.createIndex({ tenantId: 1, projectId: 1, createdAt: -1 }, { name: 'tenant_snapshot_history' }),
    ]);
    this.indexesReady = true;
  }

  async saveProject(project: ArchitectureProject, expectedRevision?: number): Promise<ArchitectureProject> {
    project = synchronizeArchitectureProjectDesignGraphState(project);
    await this.ensureIndexes();
    const projects = await this.projectDocuments();
    const filter = { tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id };
    const existing = await projects.findOne<{ currentRevision?: number }>(filter, { projection: { currentRevision: 1 } });
    if (expectedRevision !== undefined && existing?.currentRevision !== undefined && existing.currentRevision !== expectedRevision) {
      throw new RepositoryRevisionConflict(existing.currentRevision);
    }
    const savedAt = new Date();
    await projects.updateOne(filter, {
      $set: {
        tenantId: project.tenantId,
        projectId: project.id,
        branchId: project.branch.id,
        currentRevision: project.revision,
        project: structuredClone(project),
        contentHash: contentHash(project),
        updatedAt: savedAt,
      },
      $setOnInsert: { createdAt: savedAt },
    }, { upsert: true });
    return structuredClone(project);
  }

  async getProject(tenantId: string, projectId: string, branchId: string): Promise<ArchitectureProject | null> {
    await this.ensureIndexes();
    const result = await (await this.projectDocuments()).findOne<{ project: ArchitectureProject }>({ tenantId, projectId, branchId }, { projection: { project: 1 } });
    return result?.project ? structuredClone(result.project) : null;
  }

  async listProjects(tenantId: string): Promise<PortfolioEntry[]> {
    await this.ensureIndexes();
    const rows = await (await this.projectDocuments()).aggregate<{ project: ArchitectureProject }>([
      { $match: { tenantId } },
      { $sort: { projectId: 1, updatedAt: -1 } },
      { $group: { _id: '$projectId', project: { $first: '$project' } } },
      { $sort: { 'project.updatedAt': -1 } },
    ]).toArray();
    return rows.map((row) => portfolio(row.project));
  }

  async saveSnapshot(input: SaveSnapshotInput): Promise<ProjectSnapshot> {
    input = { ...input, project: synchronizeArchitectureProjectDesignGraphState(input.project) };
    await this.ensureIndexes();
    const id = createId('snapshot');
    const hash = contentHash(input.project);
    const createdAt = new Date().toISOString();
    await this.saveProject(input.project);
    await (await this.snapshotDocuments()).insertOne({
      tenantId: input.project.tenantId,
      snapshotId: id,
      projectId: input.project.id,
      branchId: input.project.branch.id,
      revision: input.project.revision,
      status: input.status,
      label: input.label,
      project: structuredClone(input.project),
      contentHash: hash,
      createdBy: input.createdBy,
      createdAt: new Date(createdAt),
    });
    return { id, projectId: input.project.id, revision: input.project.revision, label: input.label, status: input.status, createdAt, contentHash: hash, project: structuredClone(input.project) };
  }

  async listSnapshots(tenantId: string, projectId: string): Promise<Array<Omit<ProjectSnapshot, 'project'>>> {
    await this.ensureIndexes();
    const rows = await (await this.snapshotDocuments()).find<{ snapshotId: string; projectId: string; revision: number; label: string; status: ProjectSnapshot['status']; createdAt: Date | string; contentHash: string }>(
      { tenantId, projectId },
      { projection: { snapshotId: 1, projectId: 1, revision: 1, label: 1, status: 1, createdAt: 1, contentHash: 1 }, sort: { createdAt: -1 } },
    ).toArray();
    return rows.map((row) => ({ id: row.snapshotId, projectId: row.projectId, revision: row.revision, label: row.label, status: row.status, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt, contentHash: row.contentHash }));
  }

  async getSnapshot(tenantId: string, projectId: string, snapshotId: string): Promise<ProjectSnapshot | null> {
    await this.ensureIndexes();
    const row = await (await this.snapshotDocuments()).findOne<{ snapshotId: string; projectId: string; revision: number; label: string; status: ProjectSnapshot['status']; createdAt: Date | string; contentHash: string; project: ArchitectureProject }>({ tenantId, projectId, snapshotId });
    if (!row) return null;
    return { id: row.snapshotId, projectId: row.projectId, revision: row.revision, label: row.label, status: row.status, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt, contentHash: row.contentHash, project: structuredClone(row.project) };
  }

  async close(): Promise<void> { if (this.client) await this.client.close(); }
}

export function createProjectRepository(): ProjectRepository {
  const provider = databaseProvider();
  if (provider === 'mongodb-atlas') {
    const uri = mongodbUri();
    if (!uri) throw new Error('MONGODB_URI_REQUIRED_FOR_ATLAS_PROVIDER');
    return new MongoAtlasProjectRepository(uri);
  }
  return process.env.DATABASE_URL ? new PostgresProjectRepository(process.env.DATABASE_URL) : new InMemoryProjectRepository();
}
