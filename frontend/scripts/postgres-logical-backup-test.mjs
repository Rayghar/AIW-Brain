import pg from 'pg';
import { sampleProject } from '../packages/domain/dist/index.js';
import { PostgresProjectRepository } from '../apps/api/dist/repository.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const tenantId = 'tenant-backup-test';
const project = structuredClone(sampleProject);
project.tenantId = tenantId;
project.id = 'project-backup-restore-test';
project.branch = { ...project.branch, id: 'branch-backup-test' };
project.identityProviders = project.identityProviders.map((provider) => ({ ...provider, tenantId }));
const client = new pg.Client({ connectionString });
await client.connect();
await client.query(`INSERT INTO tenants(tenant_id,name,slug,status,data_region,security_settings) VALUES($1,$2,$3,'active','test','{}'::jsonb) ON CONFLICT(tenant_id) DO NOTHING`, [tenantId,'Backup test tenant',tenantId]);
await client.end();
const repository = new PostgresProjectRepository(connectionString);
try {
  await repository.saveProject(project);
  const backup = await repository.getProject(tenantId, project.id, project.branch.id);
  if (!backup) throw new Error('Could not create logical backup');
  const deleteClient = new pg.Client({ connectionString }); await deleteClient.connect();
  try { await deleteClient.query('DELETE FROM projects WHERE tenant_id=$1 AND project_id=$2', [tenantId, project.id]); } finally { await deleteClient.end(); }
  await repository.saveProject(backup);
  const restored = await repository.getProject(tenantId, project.id, project.branch.id);
  if (!restored || restored.name !== project.name || restored.schemaVersion !== '0.8.0') throw new Error('Logical backup restore verification failed');
  console.log(JSON.stringify({ backup: 'ok', restore: 'ok', tenantId, projectId: project.id, revision: restored.revision }, null, 2));
} finally {
  await repository.close();
  const cleanup = new pg.Client({ connectionString }); await cleanup.connect();
  try { await cleanup.query('DELETE FROM tenants WHERE tenant_id=$1', [tenantId]); } finally { await cleanup.end(); }
}
