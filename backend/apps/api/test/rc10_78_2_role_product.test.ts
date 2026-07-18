import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { emptyRequirementsIntelligenceState, sampleProject, type SolutionJourney } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

let app: FastifyInstance;
beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH='true'; app=await buildApp({repository:new InMemoryProjectRepository(),logger:false}); });
afterEach(async () => { await app.close(); });

describe('rc.10.78.2 role product APIs', () => {
  it('previews and persists candidate sequences without approved-graph mutation', async () => {
    const input=structuredClone(sampleProject); const requirements=emptyRequirementsIntelligenceState();
    requirements.requirements=[{id:'REQ-X',title:'Exchange event',statement:'The system shall publish an event.',type:'functional',priority:'must',origin:'source-derived',status:'accepted',confidence:1,evidenceRefs:[],stakeholderRefs:[],journeyRefs:['journey-x'],acceptanceCriteria:[],tags:[],createdAt:new Date(0).toISOString(),updatedAt:new Date(0).toISOString()}];
    requirements.journeys=[{id:'journey-x',name:'Exchange',goal:'Exchange event',description:'Event exchange',priority:'high',origin:'source-derived',status:'accepted',actorRefs:[],requirementRefs:['REQ-X'],participants:[{id:'a',name:'Service A',kind:'system-of-interest',description:''},{id:'b',name:'Service B',kind:'external-system',description:''}],paths:[{id:'happy',kind:'happy',name:'Happy',description:'Event delivered',interactions:[{id:'event',sequence:1,fromParticipantId:'a',toParticipantId:'b',label:'Publish event',interactionKind:'event',requirementRefs:['REQ-X'],qualityRefs:[],dataObjects:[],trustBoundaryCrossing:true,status:'accepted'}]}],qualityHotspots:[],architectureObligations:[],createdAt:new Date(0).toISOString(),updatedAt:new Date(0).toISOString()} satisfies SolutionJourney];
    input.requirementsIntelligence=requirements; const repository=new InMemoryProjectRepository(); await repository.saveProject(input); await app.close(); app=await buildApp({repository,logger:false});
    const preview=await app.inject({method:'POST',url:`/api/projects/${input.id}/branches/${input.branch.id}/sequences/generate`,payload:{expectedRevision:input.revision,preview:true}}); expect(preview.statusCode).toBe(200); expect(preview.json()).toMatchObject({authority:'candidate',persisted:false});
    const persisted=await app.inject({method:'POST',url:`/api/projects/${input.id}/branches/${input.branch.id}/sequences/generate`,payload:{expectedRevision:input.revision,preview:false}}); expect(persisted.statusCode).toBe(200); expect(persisted.json()).toMatchObject({authority:'candidate',persisted:true});
    const generated=persisted.json().sequences[0]; const decided=await app.inject({method:'POST',url:`/api/projects/${input.id}/branches/${input.branch.id}/sequences/${generated.id}/decision`,payload:{expectedRevision:persisted.json().projectRevision,decision:'accepted',rationale:'Accepted for project use'}}); expect(decided.statusCode).toBe(200); expect(decided.json().sequence.status).toBe('accepted');
  });
});
