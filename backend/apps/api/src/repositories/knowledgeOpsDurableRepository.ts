import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  KnowledgeOpsDurableSnapshot,
  KnowledgeOpsEventRecord,
  KnowledgeOpsRepositoryPort,
  KnowledgeReleaseCandidateRecord,
  PatternDnaEditRecord,
  KnowledgeReleaseManifest,
  KnowledgeReleasePinRecord,
} from '@aiw/knowledge';

const emptySnapshot = (): KnowledgeOpsDurableSnapshot => ({ candidates: [], stagedPatternEdits: [], releasedManifests: [], pins: [], events: [] });

function knowledgeOpsStorePath(): string {
  return resolve(process.env.AIW_KNOWLEDGE_OPS_STORE_PATH ?? 'data/local/knowledge-ops-store.json');
}

function readSnapshot(path = knowledgeOpsStorePath()): KnowledgeOpsDurableSnapshot {
  if (!existsSync(path)) return emptySnapshot();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<KnowledgeOpsDurableSnapshot>;
    return {
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      stagedPatternEdits: Array.isArray(parsed.stagedPatternEdits) ? parsed.stagedPatternEdits : [],
      releasedManifests: Array.isArray(parsed.releasedManifests) ? parsed.releasedManifests : [],
      pins: Array.isArray(parsed.pins) ? parsed.pins : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(snapshot: KnowledgeOpsDurableSnapshot, path = knowledgeOpsStorePath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
}

export class FileBackedKnowledgeOpsRepository implements KnowledgeOpsRepositoryPort {
  constructor(private readonly path = knowledgeOpsStorePath()) {}

  snapshot(): KnowledgeOpsDurableSnapshot {
    return readSnapshot(this.path);
  }


  listPatternDnaEdits(): PatternDnaEditRecord[] {
    return this.snapshot().stagedPatternEdits;
  }

  savePatternDnaEdit(edit: PatternDnaEditRecord): void {
    const snapshot = this.snapshot();
    const index = snapshot.stagedPatternEdits.findIndex((item) => item.editId === edit.editId);
    if (index >= 0) snapshot.stagedPatternEdits[index] = edit;
    else snapshot.stagedPatternEdits.push(edit);
    writeSnapshot(snapshot, this.path);
  }

  discardPatternDnaEdit(editId: string, actor: string): PatternDnaEditRecord | undefined {
    const snapshot = this.snapshot();
    const index = snapshot.stagedPatternEdits.findIndex((item) => item.editId === editId);
    if (index < 0) return undefined;
    const [removed] = snapshot.stagedPatternEdits.splice(index, 1);
    const discarded: PatternDnaEditRecord = { ...removed!, status: 'discarded', editor: actor || removed!.editor };
    snapshot.stagedPatternEdits.unshift(discarded);
    writeSnapshot(snapshot, this.path);
    return discarded;
  }

  clearMaterializedPatternDnaEdits(editIds: string[]): void {
    const idSet = new Set(editIds);
    const snapshot = this.snapshot();
    snapshot.stagedPatternEdits = snapshot.stagedPatternEdits.map((edit) => idSet.has(edit.editId) ? { ...edit, status: 'materialized' } : edit);
    writeSnapshot(snapshot, this.path);
  }

  listCandidates(): KnowledgeReleaseCandidateRecord[] {
    return this.snapshot().candidates;
  }

  getCandidate(candidateId: string): KnowledgeReleaseCandidateRecord | undefined {
    return this.snapshot().candidates.find((candidate) => candidate.candidateId === candidateId);
  }

  saveCandidate(candidate: KnowledgeReleaseCandidateRecord): void {
    const snapshot = this.snapshot();
    const index = snapshot.candidates.findIndex((item) => item.candidateId === candidate.candidateId);
    if (index >= 0) snapshot.candidates[index] = candidate;
    else snapshot.candidates.push(candidate);
    writeSnapshot(snapshot, this.path);
  }

  listReleasedManifests(): KnowledgeReleaseManifest[] {
    return this.snapshot().releasedManifests;
  }

  saveReleasedManifest(manifest: KnowledgeReleaseManifest): void {
    const snapshot = this.snapshot();
    const index = snapshot.releasedManifests.findIndex((item) => item.releaseId === manifest.releaseId);
    if (index >= 0) snapshot.releasedManifests[index] = manifest;
    else snapshot.releasedManifests.push(manifest);
    writeSnapshot(snapshot, this.path);
  }

  listPins(): KnowledgeReleasePinRecord[] {
    return this.snapshot().pins;
  }

  savePin(pin: KnowledgeReleasePinRecord): void {
    const snapshot = this.snapshot();
    const index = snapshot.pins.findIndex((item) => item.scope === pin.scope && item.scopeId === pin.scopeId);
    if (index >= 0) snapshot.pins[index] = pin;
    else snapshot.pins.push(pin);
    writeSnapshot(snapshot, this.path);
  }

  recordEvent(event: KnowledgeOpsEventRecord): void {
    const snapshot = this.snapshot();
    snapshot.events.unshift(event);
    snapshot.events = snapshot.events.slice(0, 1000);
    writeSnapshot(snapshot, this.path);
  }

  listEvents(limit = 100): KnowledgeOpsEventRecord[] {
    return this.snapshot().events.slice(0, limit);
  }
}

export const knowledgeOpsDurableRepository = new FileBackedKnowledgeOpsRepository();
