import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assessKnowledgeFabricRelease,
  assessGithubKnowledgeConversion,
  searchPatternDna2,
  type RepositoryDossier,
  type PatternDna2RecordLike,
  type GithubConversionRepository,
  type PatternKnowledgeAuthority,
} from '@aiw/knowledge';
import type { AuthenticatedPrincipal } from '@aiw/domain';

const readJson = (url: URL) => JSON.parse(readFileSync(fileURLToPath(url),'utf8'));
const sourceMap = readJson(new URL('../../../../data/rc10_55-global-architecture-intelligence-source-map.json', import.meta.url)) as { releaseId: string; summary: unknown; dossiers: RepositoryDossier[] };
const legacyCorpus = readJson(new URL('../../../../data/rc10_55-pattern-dna2.json', import.meta.url)) as { releaseId: string; metrics: unknown; records: PatternDna2RecordLike[] };
const corpus = readJson(new URL('../../../../data/rc10_73_5-pattern-dna2.1.json', import.meta.url)) as { releaseId: string; metrics: unknown; records: Array<PatternDna2RecordLike & { knowledgeAuthority?: PatternKnowledgeAuthority; lineageSummary?: { claimIds?: string[] } }> };
const conversion = readJson(new URL('../../../../data/rc10_73_5-github-conversion-registry.json', import.meta.url)) as { releaseId: string; generatedAt: string; metrics: unknown; repositories: GithubConversionRepository[] };
const knowledgeObjects = readJson(new URL('../../../../data/rc10_73_5-knowledge-objects.json', import.meta.url)) as { releaseId: string; metrics: unknown; objects: Array<Record<string,unknown> & { objectId: string; objectClass: string; subjectId?: string; recordId?: string; provenance?: { connectorId?: string } }> };
const lineage = readJson(new URL('../../../../data/rc10_73_5-claim-lineage-index.json', import.meta.url)) as { releaseId: string; records: Array<{ recordId: string; recordName: string }> };
const contradictions = readJson(new URL('../../../../data/rc10_73_5-contradiction-register.json', import.meta.url)) as { releaseId: string; unresolvedCount: number; contradictions: unknown[] };
const activation = readJson(new URL('../../../../data/rc10_73_5-brain-knowledge-activation.json', import.meta.url));
const cambridgePack = readJson(new URL('../../../../data/rc10_55-cambridge-knowledge-pack.json', import.meta.url)) as { reasoningQuestions?: Record<string,unknown>; reviewRules?: unknown[]; sddGrammar?: unknown[] };
const stageKits = readJson(new URL('../../../../data/rc10_55-stage-intelligence-kits.json', import.meta.url)) as { stages: Array<{stage?:string;patternEmphasis?:unknown[];requiredEvidence?:unknown[]}> };

export interface KnowledgeFabricRouteDeps { principalFor: (request: FastifyRequest) => AuthenticatedPrincipal }

export async function knowledgeFabricRoutes(app: FastifyInstance, deps: KnowledgeFabricRouteDeps): Promise<void> {
  app.get('/api/knowledge-fabric/summary', async (request) => {
    deps.principalFor(request);
    const legacyAssessment = assessKnowledgeFabricRelease({ releaseId: legacyCorpus.releaseId, dossiers: sourceMap.dossiers, patterns: legacyCorpus.records, stageKits: stageKits.stages, cambridgePack });
    const conversionAssessment = assessGithubKnowledgeConversion({ repositories: conversion.repositories, patterns: corpus.records });
    return {
      releaseId: corpus.releaseId,
      sourceMap: sourceMap.summary,
      patternDna2: corpus.metrics,
      assessment: legacyAssessment,
      githubConversion: conversionAssessment,
      activation,
      contradictions: { unresolved: contradictions.unresolvedCount },
      authorityNotice: 'Repository-derived knowledge without immutable live source revisions is non-scoring and controlled-pilot only.',
    };
  });
  app.get('/api/knowledge-fabric/source-map', async (request) => { deps.principalFor(request); return sourceMap; });
  app.get('/api/knowledge-fabric/github-conversion', async (request) => { deps.principalFor(request); return conversion; });
  app.get('/api/knowledge-fabric/activation-posture', async (request) => { deps.principalFor(request); return activation; });
  app.get('/api/knowledge-fabric/contradictions', async (request) => { deps.principalFor(request); return contradictions; });
  app.get('/api/knowledge-fabric/cambridge-pack', async (request) => { deps.principalFor(request); return cambridgePack; });
  app.get('/api/knowledge-fabric/stage-kits', async (request) => { deps.principalFor(request); return stageKits; });
  app.get('/api/knowledge-fabric/knowledge-objects', async (request, reply) => {
    deps.principalFor(request);
    const parsed = z.object({
      objectClass: z.string().max(120).optional(),
      connectorId: z.string().max(160).optional(),
      subjectId: z.string().max(240).optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
    }).safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_KNOWLEDGE_OBJECT_QUERY', details: parsed.error.flatten() });
    const limit = parsed.data.limit ?? 100;
    const records = knowledgeObjects.objects.filter((item) => {
      if (parsed.data.objectClass && item.objectClass !== parsed.data.objectClass) return false;
      if (parsed.data.connectorId && item.provenance?.connectorId !== parsed.data.connectorId) return false;
      if (parsed.data.subjectId && item.subjectId !== parsed.data.subjectId && item.recordId !== parsed.data.subjectId) return false;
      return true;
    }).slice(0, limit);
    return { releaseId: knowledgeObjects.releaseId, count: records.length, records };
  });
  app.get('/api/knowledge-fabric/lineage/:recordId', async (request, reply) => {
    deps.principalFor(request);
    const parsed = z.object({ recordId: z.string().min(1).max(240) }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PATTERN_ID' });
    const record = lineage.records.find((item) => item.recordId === parsed.data.recordId);
    if (!record) return reply.code(404).send({ error: 'KNOWLEDGE_LINEAGE_NOT_FOUND' });
    return { releaseId: lineage.releaseId, record };
  });
  app.get('/api/knowledge-fabric/patterns', async (request, reply) => {
    deps.principalFor(request);
    const parsed = z.object({ q:z.string().max(200).optional(), category:z.string().max(80).optional(), stage:z.string().max(80).optional(), deepOnly:z.coerce.boolean().optional(), limit:z.coerce.number().int().min(1).max(200).optional() }).safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({error:'INVALID_KNOWLEDGE_FABRIC_QUERY',details:parsed.error.flatten()});
    const search = {
      ...(parsed.data.q !== undefined ? { query: parsed.data.q } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
      ...(parsed.data.deepOnly !== undefined ? { deepOnly: parsed.data.deepOnly } : {}),
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
    };
    const records = searchPatternDna2(corpus.records, search);
    return { releaseId:corpus.releaseId, count:records.length, records };
  });
  app.get('/api/knowledge-fabric/patterns/:patternId', async (request, reply) => {
    deps.principalFor(request);
    const parsed = z.object({patternId:z.string().min(1).max(240)}).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({error:'INVALID_PATTERN_ID'});
    const record = corpus.records.find((item)=>item.id===parsed.data.patternId);
    if (!record) return reply.code(404).send({error:'PATTERN_NOT_FOUND'});
    return { releaseId:corpus.releaseId, record };
  });
}
