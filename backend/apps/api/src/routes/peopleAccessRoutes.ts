import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PeopleAccessRepository, productRoleIds } from '../peopleAccessRepository.js';

type Principal = { tenantId: string; subject: string; roles?: string[] | undefined };
export async function peopleAccessRoutes(app: FastifyInstance, deps: { principalFor: (request: FastifyRequest) => Principal }) {
  const repository = new PeopleAccessRepository();
  app.addHook('onClose', async () => repository.close());
  const admin = (principal: Principal) => (principal.roles ?? []).some((role) => ['platform-admin','security-admin'].includes(role)) || process.env.AIW_ALLOW_DEV_AUTH === 'true';
  const roles = z.array(z.enum(productRoleIds)).min(1);
  const profile = z.enum(['solution-architect','enterprise-architect','platform-architect','architecture-reviewer','administrator','knowledge-curator']);
  app.get('/api/admin/people', async (request, reply) => { const principal=deps.principalFor(request); if(!admin(principal)) return reply.code(403).send({error:'PERMISSION_DENIED'}); return { users: await repository.list(principal.tenantId), adapter: process.env.DATABASE_URL ? 'postgresql' : 'unavailable' }; });
  app.post('/api/admin/people/invitations', async (request, reply) => {
    const principal=deps.principalFor(request); if(!admin(principal)) return reply.code(403).send({error:'PERMISSION_DENIED'});
    const parsed=z.object({ organisationId:z.string().min(1).optional(), email:z.string().email(), displayName:z.string().min(2).max(160), roles, defaultProfile:profile, expiresInDays:z.number().int().min(1).max(30).default(7) }).safeParse(request.body);
    if(!parsed.success) return reply.code(400).send({error:'INVALID_USER_INVITATION',details:parsed.error.flatten()});
    try { const result=await repository.invite({tenantId:principal.tenantId,email:parsed.data.email,displayName:parsed.data.displayName,roles:parsed.data.roles,defaultProfile:parsed.data.defaultProfile,...(parsed.data.organisationId?{organisationId:parsed.data.organisationId}:{}),actorId:principal.subject,correlationId:request.id,expiresAt:new Date(Date.now()+parsed.data.expiresInDays*86400000).toISOString()}); return reply.code(201).send(result); }
    catch(error){ if(error&&typeof error==='object'&&'code'in error&&String(error.code)==='23505') return reply.code(409).send({error:'DUPLICATE_IDENTITY'}); throw error; }
  });
  app.patch('/api/admin/people/:userId', async (request, reply) => {
    const principal=deps.principalFor(request); if(!admin(principal)) return reply.code(403).send({error:'PERMISSION_DENIED'});
    const params=z.object({userId:z.string().min(1)}).safeParse(request.params); const body=z.object({roles:roles.optional(),status:z.enum(['invited','active','suspended','disabled']).optional(),defaultProfile:profile.optional()}).refine((value)=>Object.keys(value).length>0).safeParse(request.body);
    if(!params.success||!body.success) return reply.code(400).send({error:'INVALID_USER_UPDATE'});
    try{return await repository.update({tenantId:principal.tenantId,userId:params.data.userId,...(body.data.roles?{roles:body.data.roles}:{}),...(body.data.status?{status:body.data.status}:{}),...(body.data.defaultProfile?{defaultProfile:body.data.defaultProfile}:{}),actorId:principal.subject,correlationId:request.id});}catch(error){if(error instanceof Error&&error.message==='USER_NOT_FOUND') return reply.code(404).send({error:'USER_NOT_FOUND'});throw error;}
  });
}
