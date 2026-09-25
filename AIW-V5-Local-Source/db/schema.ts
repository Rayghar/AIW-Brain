import {sqliteTable, text, integer, primaryKey, index} from 'drizzle-orm/sqlite-core';
export const projects=sqliteTable('projects',{
  ownerId:text('owner_id').notNull(),
  id:text('id').notNull(),
  document:text('document').notNull(),
  revision:integer('revision').notNull().default(1),
  updatedAt:text('updated_at').notNull(),
  indexStamp:text('index_stamp')
},table=>[primaryKey({columns:[table.ownerId,table.id]})]);
export const intelligenceRuns=sqliteTable('intelligence_runs',{
 ownerId:text('owner_id').notNull(),id:text('id').notNull(),projectId:text('project_id').notNull(),
 objectId:text('object_id').notNull(),mode:text('mode').notNull(),inputStamp:text('input_stamp').notNull(),
 status:text('status').notNull(),provider:text('provider').notNull(),model:text('model').notNull(),
 storageKey:text('storage_key').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),errorCode:text('error_code'),actorId:text('actor_id'),reservedTokens:integer('reserved_tokens').notNull().default(0),usedTokens:integer('used_tokens')
},table=>[primaryKey({columns:[table.ownerId,table.id]}),index('intelligence_owner_created').on(table.ownerId,table.createdAt),index('intelligence_project_context').on(table.ownerId,table.projectId,table.objectId,table.createdAt)]);

export const brainRetrievalRuns=sqliteTable('brain_retrieval_runs',{
 ownerId:text('owner_id').notNull(),id:text('id').notNull(),projectId:text('project_id').notNull(),inputHash:text('input_hash').notNull(),status:text('status').notNull(),storageKey:text('storage_key').notNull(),createdAt:text('created_at').notNull(),reservedTokens:integer('reserved_tokens').notNull().default(0),usedTokens:integer('used_tokens')
},table=>[primaryKey({columns:[table.ownerId,table.id]}),index('brain_retrieval_owner_created').on(table.ownerId,table.createdAt),index('brain_retrieval_context').on(table.ownerId,table.projectId,table.inputHash,table.status)]);

export const workbookUploads=sqliteTable('workbook_uploads',{
 ownerId:text('owner_id').notNull(),id:text('id').notNull(),projectId:text('project_id').notNull(),filename:text('filename').notNull(),sha256:text('sha256').notNull(),bytes:integer('bytes').notNull(),storageKey:text('storage_key').notNull(),createdAt:text('created_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.id]}),index('workbook_project_created').on(table.ownerId,table.projectId,table.createdAt)]);
export const requirementIndex=sqliteTable('requirement_index',{
 ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),id:text('id').notNull(),externalId:text('external_id').notNull(),domain:text('domain').notNull(),capability:text('capability').notNull(),title:text('title').notNull(),delivery:text('delivery').notNull(),confirmed:integer('confirmed').notNull(),search:text('search').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.projectId,table.id]}),index('requirements_domain').on(table.ownerId,table.projectId,table.domain),index('requirements_external').on(table.ownerId,table.projectId,table.externalId)]);
export const projectAccess=sqliteTable('project_access',{
 ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),actorId:text('actor_id').notNull(),role:text('role').notNull(),createdAt:text('created_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.projectId,table.actorId]}),index('access_actor').on(table.actorId,table.projectId)]);
export const projectReviews=sqliteTable('project_reviews',{
 ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),id:text('id').notNull(),document:text('document').notNull(),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.projectId,table.id]})]);
export const projectAttachments=sqliteTable('project_attachments',{
 ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),id:text('id').notNull(),filename:text('filename').notNull(),sha256:text('sha256').notNull(),bytes:integer('bytes').notNull(),storageKey:text('storage_key').notNull(),sourceId:text('source_id').notNull(),createdAt:text('created_at').notNull(),actorId:text('actor_id').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.projectId,table.id]})]);

export const organizations=sqliteTable('organizations',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),document:text('document').notNull(),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()});
export const organizationMembers=sqliteTable('organization_members',{organizationId:text('organization_id').notNull(),actorId:text('actor_id').notNull(),role:text('role').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.organizationId,t.actorId]}),index('organization_member_actor').on(t.actorId,t.organizationId)]);
export const organizationLibrary=sqliteTable('organization_library',{organizationId:text('organization_id').notNull(),id:text('id').notNull(),document:text('document').notNull(),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.organizationId,t.id]})]);
export const organizationReleases=sqliteTable('organization_releases',{organizationId:text('organization_id').notNull(),id:text('id').notNull(),document:text('document').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.organizationId,t.id]})]);
export const objectDiscussions=sqliteTable('object_discussions',{ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),objectId:text('object_id').notNull(),id:text('id').notNull(),document:text('document').notNull(),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.projectId,t.id]}),index('discussion_object').on(t.ownerId,t.projectId,t.objectId,t.updatedAt)]);
export const projectActivity=sqliteTable('project_activity',{ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),id:text('id').notNull(),actorId:text('actor_id').notNull(),document:text('document').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.projectId,t.id]}),index('activity_project').on(t.ownerId,t.projectId,t.createdAt)]);
export const activityReads=sqliteTable('activity_reads',{ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),actorId:text('actor_id').notNull(),seenAt:text('seen_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.projectId,t.actorId]})]);
export const projectJobs=sqliteTable('project_jobs',{ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),status:text('status').notNull(),inputHash:text('input_hash').notNull(),document:text('document').notNull(),revision:integer('revision').notNull(),leaseUntil:text('lease_until'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.projectId,t.id]}),index('jobs_project_status').on(t.ownerId,t.projectId,t.status,t.updatedAt)]);
export const projectConnections=sqliteTable('project_connections',{ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),id:text('id').notNull(),document:text('document').notNull(),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.projectId,t.id]})]);
export const operationEvents=sqliteTable('operation_events',{ownerId:text('owner_id').notNull(),projectId:text('project_id').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),document:text('document').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.projectId,t.id]}),index('operation_project').on(t.ownerId,t.projectId,t.createdAt)]);
