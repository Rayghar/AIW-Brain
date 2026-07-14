import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { CiFitnessLoopPlan, RepositoryPilotScan, RuntimeEvidenceIngestionPlan } from '@aiw/integrations';

interface RepositoryConformancePilotStore {
  scans: RepositoryPilotScan[];
  fitnessLoops: CiFitnessLoopPlan[];
  runtimePlans: RuntimeEvidenceIngestionPlan[];
  updatedAt?: string;
}

const DEFAULT_STORE_PATH = resolve(process.cwd(), 'data/local/repository-conformance-store.json');

function loadStore(path: string): RepositoryConformancePilotStore {
  if (!existsSync(path)) return { scans: [], fitnessLoops: [], runtimePlans: [] };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RepositoryConformancePilotStore>;
    return {
      scans: Array.isArray(parsed.scans) ? parsed.scans : [],
      fitnessLoops: Array.isArray(parsed.fitnessLoops) ? parsed.fitnessLoops : [],
      runtimePlans: Array.isArray(parsed.runtimePlans) ? parsed.runtimePlans : [],
      ...(parsed.updatedAt ? { updatedAt: parsed.updatedAt } : {}),
    };
  } catch {
    return { scans: [], fitnessLoops: [], runtimePlans: [] };
  }
}

function saveStore(path: string, store: RepositoryConformancePilotStore): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2));
}

export class RepositoryConformancePilotRepository {
  private readonly path: string;
  private store: RepositoryConformancePilotStore;

  constructor(path = process.env.AIW_REPOSITORY_CONFORMANCE_STORE_PATH || DEFAULT_STORE_PATH) {
    this.path = path;
    this.store = loadStore(path);
  }

  snapshot(): RepositoryConformancePilotStore {
    return {
      scans: [...this.store.scans].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
      fitnessLoops: [...this.store.fitnessLoops].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
      runtimePlans: [...this.store.runtimePlans].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
      ...(this.store.updatedAt ? { updatedAt: this.store.updatedAt } : {}),
    };
  }

  saveScan(scan: RepositoryPilotScan): void {
    this.store.scans = [scan, ...this.store.scans.filter((item) => item.scanId !== scan.scanId)].slice(0, 100);
    saveStore(this.path, this.store);
  }

  saveFitnessLoop(plan: CiFitnessLoopPlan): void {
    this.store.fitnessLoops = [plan, ...this.store.fitnessLoops.filter((item) => item.connectorId !== plan.connectorId)].slice(0, 100);
    saveStore(this.path, this.store);
  }

  saveRuntimePlan(plan: RuntimeEvidenceIngestionPlan): void {
    this.store.runtimePlans = [plan, ...this.store.runtimePlans.filter((item) => item.connectorId !== plan.connectorId)].slice(0, 100);
    saveStore(this.path, this.store);
  }
}

export const repositoryConformancePilotRepository = new RepositoryConformancePilotRepository();
