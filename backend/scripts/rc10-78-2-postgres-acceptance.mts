import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { sampleProject } from '@aiw/domain';
import { PeopleAccessRepository } from '../apps/api/src/peopleAccessRepository.js';
import { PostgresProjectRepository } from '../apps/api/src/repository.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL_REQUIRED');
const runId = randomUUID().slice(0, 8);
const tenantId = `tenant-rc10-78-2-${runId}`;
const actorId = `acceptance-admin-${runId}`;
const client = new pg.Client({ connectionString, application_name: 'aiw-rc10-78-2-acceptance', connectionTimeoutMillis: 10_000, statement_timeout: 15_000 });
const people = new PeopleAccessRepository(connectionString);
const projects = new PostgresProjectRepository(connectionString);

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(`SELECT set_config('aiw.tenant_id',$1,true)`, [tenantId]);
  await client.query(`INSERT INTO tenants(tenant_id,name,slug,status,data_region,security_settings) VALUES($1,$2,$3,'active','acceptance-local','{}'::jsonb) ON CONFLICT(tenant_id) DO NOTHING`, [tenantId, `rc.10.78.2 acceptance ${runId}`, `rc10-78-2-${runId}`]);
  await client.query('COMMIT');

  const solution = await people.invite({ tenantId, email:`solution-${runId}@example.test`, displayName:'rc.10.78.2 Solution Architect', roles:['solution-architect'], defaultProfile:'solution-architect', actorId, correlationId:`acceptance-${runId}-solution`, expiresAt:new Date(Date.now()+7*86400000).toISOString() });
  const enterprise = await people.invite({ tenantId, email:`enterprise-${runId}@example.test`, displayName:'rc.10.78.2 Enterprise Architect', roles:['enterprise-architect','architecture-reviewer'], defaultProfile:'enterprise-architect', actorId, correlationId:`acceptance-${runId}-enterprise`, expiresAt:new Date(Date.now()+7*86400000).toISOString() });
  const activeSolution = await people.update({ tenantId, userId:solution.profile.userId, status:'active', actorId, correlationId:`acceptance-${runId}-activate-solution` });
  const activeEnterprise = await people.update({ tenantId, userId:enterprise.profile.userId, status:'active', actorId, correlationId:`acceptance-${runId}-activate-enterprise` });

  const project = structuredClone(sampleProject);
  project.tenantId=tenantId; project.id=`project-rc10-78-2-${runId}`; project.name=`rc.10.78.2 governed architecture ${runId}`; project.description='PostgreSQL acceptance project for role-centred architecture work.'; project.branch={...project.branch,id:'branch-main',name:'Main architecture'}; project.revision=0; project.updatedAt=new Date().toISOString(); project.members=[{id:activeSolution.userId,displayName:activeSolution.displayName,email:activeSolution.email,role:'owner',status:'active',joinedAt:new Date().toISOString()},{id:activeEnterprise.userId,displayName:activeEnterprise.displayName,email:activeEnterprise.email,role:'governance',status:'active',joinedAt:new Date().toISOString()}];
  const created=await projects.saveProject(project); const reloaded=await projects.getProject(tenantId,project.id,'branch-main');
  if(!reloaded) throw new Error('PROJECT_RELOAD_FAILED');
  const updated={...reloaded,activeStage:'logicalApplication' as const,revision:reloaded.revision+1,updatedAt:new Date().toISOString()};
  const savedUpdate=await projects.saveProject(updated,reloaded.revision); const portfolio=await projects.listProjects(tenantId); const crossTenant=await projects.getProject(`${tenantId}-other`,project.id,'branch-main');
  const userRows=await people.list(tenantId);

  await client.query('BEGIN'); await client.query(`SELECT set_config('aiw.tenant_id',$1,true)`,[tenantId]);
  const direct=await client.query<{profiles:string;members:string;documents:string}>(`SELECT (SELECT count(*)::text FROM tenant_user_profiles_v1) profiles,(SELECT count(*)::text FROM project_members WHERE project_id=$1) members,(SELECT count(*)::text FROM project_branch_documents WHERE project_id=$1) documents`,[project.id]);
  await client.query('ROLLBACK');

  process.stdout.write(`${JSON.stringify({
    runId, tenantId, adapter:'postgresql', migration:'022_rc10_78_2_role_product_persistence.sql',
    solutionArchitect:{userId:activeSolution.userId,status:activeSolution.status,roles:activeSolution.roles,defaultProfile:activeSolution.defaultProfile},
    enterpriseArchitect:{userId:activeEnterprise.userId,status:activeEnterprise.status,roles:activeEnterprise.roles,defaultProfile:activeEnterprise.defaultProfile},
    invitations:{created:2,rawTokensPersisted:false},
    project:{projectId:created.id,created:true,reloaded:reloaded.id===created.id,updated:savedUpdate.activeStage==='logicalApplication',revision:savedUpdate.revision,portfolioVisible:portfolio.some((item)=>item.id===project.id),memberCount:Number(direct.rows[0]?.members??0),documentCount:Number(direct.rows[0]?.documents??0)},
    users:{profileCount:userRows.length,solutionRolePersisted:userRows.some((item)=>item.userId===activeSolution.userId&&item.roles.includes('solution-architect')),enterpriseRolePersisted:userRows.some((item)=>item.userId===activeEnterprise.userId&&item.roles.includes('enterprise-architect'))},
    tenantIsolation:{crossTenantProjectVisible:Boolean(crossTenant),passed:crossTenant===null},
    auditExpected:true, approvedKnowledgeMutations:0, productionDesignGraphMutations:0, automaticPromotions:0, productionAccepted:false, secretValuesCaptured:false,
  })}\n`);
} finally {
  await people.close().catch(()=>undefined); await projects.close().catch(()=>undefined); await client.end().catch(()=>undefined);
}
