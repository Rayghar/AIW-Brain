import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export const productRoleIds = ['platform-admin','solution-architect','platform-architect','knowledge-admin','knowledge-curator','architecture-reviewer','security-reviewer','compliance-reviewer','enterprise-architect','model-admin','repository-admin','security-admin','auditor'] as const;
export type ProductRoleId = typeof productRoleIds[number];
export type UserStatus = 'invited'|'active'|'suspended'|'disabled';
export type DefaultProfile = 'solution-architect'|'enterprise-architect'|'platform-architect'|'architecture-reviewer'|'administrator'|'knowledge-curator';

export interface TenantUserProfile {
  tenantId: string; userId: string; organisationId?: string; identitySubject: string;
  email: string; displayName: string; roles: ProductRoleId[]; status: UserStatus;
  defaultProfile: DefaultProfile; createdAt: string; updatedAt: string; updatedBy: string;
}
export interface UserInvitationReceipt { invitationId: string; userId: string; tenantId: string; email: string; status: 'pending'|'accepted'|'expired'|'revoked'; expiresAt: string; sentAt: string; }

function row(row: Record<string, unknown>): TenantUserProfile {
  return { tenantId: String(row.tenant_id), userId: String(row.user_id), ...(row.organisation_id ? { organisationId: String(row.organisation_id) } : {}), identitySubject: String(row.identity_subject), email: String(row.email), displayName: String(row.display_name), roles: row.roles as ProductRoleId[], status: row.status as UserStatus, defaultProfile: row.default_profile as DefaultProfile, createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(), updatedBy: String(row.updated_by) };
}

export class PeopleAccessRepository {
  private pool: Pool | null = null;
  constructor(private readonly connectionString = process.env.DATABASE_URL) {}
  private async database(): Promise<Pool> {
    if (!this.connectionString) throw new Error('POSTGRESQL_REQUIRED_FOR_PEOPLE_ACCESS');
    if (!this.pool) { const { Pool } = await import('pg'); this.pool = new Pool({ connectionString: this.connectionString, max: Number(process.env.AIW_DB_POOL_MAX ?? 10), application_name: 'aiw-people-access' }); }
    return this.pool;
  }
  private async transaction<T>(tenantId: string, action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await (await this.database()).connect();
    try { await client.query('BEGIN'); await client.query(`SELECT set_config('aiw.tenant_id',$1,true)`, [tenantId]); const result = await action(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async list(tenantId: string): Promise<TenantUserProfile[]> {
    return this.transaction(tenantId, async (client) => (await client.query('SELECT * FROM tenant_user_profiles_v1 ORDER BY display_name,user_id')).rows.map(row));
  }
  async invite(input: { tenantId: string; organisationId?: string; email: string; displayName: string; roles: ProductRoleId[]; defaultProfile: DefaultProfile; actorId: string; correlationId: string; expiresAt: string }): Promise<{ profile: TenantUserProfile; invitation: UserInvitationReceipt }> {
    return this.transaction(input.tenantId, async (client) => {
      const now = new Date().toISOString(); const userId = `user-${randomUUID()}`; const invitationId = `invite-${randomUUID()}`; const identitySubject = `pending:${input.email.toLowerCase()}`;
      const tokenHash = createHash('sha256').update(`${invitationId}:${randomUUID()}`).digest('hex');
      const profile: TenantUserProfile = { tenantId: input.tenantId, userId, ...(input.organisationId ? { organisationId: input.organisationId } : {}), identitySubject, email: input.email.toLowerCase(), displayName: input.displayName, roles: input.roles, status: 'invited', defaultProfile: input.defaultProfile, createdAt: now, updatedAt: now, updatedBy: input.actorId };
      await client.query(`INSERT INTO tenant_user_profiles_v1(tenant_id,user_id,organisation_id,identity_subject,email,display_name,roles,status,default_profile,created_at,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11)`, [profile.tenantId,profile.userId,profile.organisationId ?? null,profile.identitySubject,profile.email,profile.displayName,profile.roles,profile.status,profile.defaultProfile,now,input.actorId]);
      await client.query(`INSERT INTO tenant_user_invitations_v1(tenant_id,invitation_id,user_id,email,token_hash,status,expires_at,sent_at,created_by) VALUES($1,$2,$3,$4,$5,'pending',$6,$7,$8)`, [input.tenantId,invitationId,userId,profile.email,tokenHash,input.expiresAt,now,input.actorId]);
      await client.query(`INSERT INTO tenant_role_assignments_v2(assignment_id,tenant_id,subject,email,roles,source,active,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,'manual',true,$6,$7) ON CONFLICT(assignment_id) DO UPDATE SET roles=EXCLUDED.roles,active=true,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`, [`role-${userId}`,input.tenantId,identitySubject,profile.email,profile.roles,input.actorId,now]);
      await client.query(`INSERT INTO audit_events(tenant_id,audit_event_id,actor_id,event_type,action,target_type,target_id,outcome,correlation_id,metadata,occurred_at,retention_until) VALUES($1,$2,$3,'identity','invite-user','tenant-user',$4,'success',$5,$6::jsonb,$7,$8)`, [input.tenantId,`audit-${randomUUID()}`,input.actorId,userId,input.correlationId,JSON.stringify({ roles: profile.roles, defaultProfile: profile.defaultProfile, invitationId }),now,new Date(Date.now()+365*86400000).toISOString()]);
      return { profile, invitation: { invitationId, userId, tenantId: input.tenantId, email: profile.email, status: 'pending', expiresAt: input.expiresAt, sentAt: now } };
    });
  }
  async update(input: { tenantId: string; userId: string; roles?: ProductRoleId[]; status?: UserStatus; defaultProfile?: DefaultProfile; actorId: string; correlationId: string }): Promise<TenantUserProfile> {
    return this.transaction(input.tenantId, async (client) => {
      const current = (await client.query('SELECT * FROM tenant_user_profiles_v1 WHERE tenant_id=$1 AND user_id=$2 FOR UPDATE',[input.tenantId,input.userId])).rows[0];
      if (!current) throw new Error('USER_NOT_FOUND');
      const next = row(current); if (input.roles) next.roles=input.roles; if (input.status) next.status=input.status; if (input.defaultProfile) next.defaultProfile=input.defaultProfile; next.updatedAt=new Date().toISOString(); next.updatedBy=input.actorId;
      await client.query('UPDATE tenant_user_profiles_v1 SET roles=$3,status=$4,default_profile=$5,updated_at=$6,updated_by=$7 WHERE tenant_id=$1 AND user_id=$2',[input.tenantId,input.userId,next.roles,next.status,next.defaultProfile,next.updatedAt,input.actorId]);
      await client.query('UPDATE tenant_role_assignments_v2 SET roles=$3,active=$4,updated_at=$5,updated_by=$6 WHERE tenant_id=$1 AND assignment_id=$2',[input.tenantId,`role-${input.userId}`,next.roles,next.status==='active'||next.status==='invited',next.updatedAt,input.actorId]);
      await client.query(`INSERT INTO audit_events(tenant_id,audit_event_id,actor_id,event_type,action,target_type,target_id,outcome,correlation_id,metadata,occurred_at,retention_until) VALUES($1,$2,$3,'identity','update-user','tenant-user',$4,'success',$5,$6::jsonb,$7,$8)`,[input.tenantId,`audit-${randomUUID()}`,input.actorId,input.userId,input.correlationId,JSON.stringify({roles:next.roles,status:next.status,defaultProfile:next.defaultProfile}),next.updatedAt,new Date(Date.now()+365*86400000).toISOString()]);
      return next;
    });
  }
  async close() { if (this.pool) await this.pool.end(); }
}
