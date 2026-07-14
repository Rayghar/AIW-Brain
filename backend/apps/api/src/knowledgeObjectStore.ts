import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface StoredKnowledgeObject {
  key: string;
  uri: string;
  sha256: string;
  sizeBytes: number;
  mediaType: string;
  storedAt: string;
}

export interface KnowledgeObjectStore {
  put(key: string, content: Uint8Array | string, mediaType: string): Promise<StoredKnowledgeObject>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  health(): Promise<{ adapter: string; ready: boolean; detail: string }>;
}

function environmentSecret(name: string): string | undefined {
  const direct = process.env[name];
  if (direct?.trim()) return direct;
  const file = process.env[`${name}_FILE`];
  if (!file?.trim()) return undefined;
  return readFileSync(file, 'utf8').trim();
}

function digest(content: Uint8Array): string { return createHash('sha256').update(content).digest('hex'); }
function bytes(content: Uint8Array | string): Uint8Array { return typeof content === 'string' ? new TextEncoder().encode(content) : content; }
function safeKey(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('../') || normalized.startsWith('..')) throw new Error('INVALID_OBJECT_STORE_KEY');
  return normalized;
}

export class FileSystemKnowledgeObjectStore implements KnowledgeObjectStore {
  constructor(private readonly root = process.env.AIW_KNOWLEDGE_OBJECT_DIR || resolve(process.cwd(), '.aiw-knowledge-objects')) {}
  async put(key: string, content: Uint8Array | string, mediaType: string): Promise<StoredKnowledgeObject> {
    const normalized = safeKey(key); const value = bytes(content); const path = join(this.root, normalized);
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, value);
    return { key: normalized, uri: `file://${path}`, sha256: digest(value), sizeBytes: value.byteLength, mediaType, storedAt: new Date().toISOString() };
  }
  async get(key: string): Promise<Uint8Array> { return new Uint8Array(await readFile(join(this.root, safeKey(key)))); }
  async delete(key: string): Promise<void> { await rm(join(this.root, safeKey(key)), { force: true }); }
  async health(): Promise<{ adapter: string; ready: boolean; detail: string }> {
    try { await mkdir(this.root, { recursive: true }); return { adapter: 'filesystem', ready: true, detail: this.root }; }
    catch (error) { return { adapter: 'filesystem', ready: false, detail: error instanceof Error ? error.message : String(error) }; }
  }
}

export class S3KnowledgeObjectStore implements KnowledgeObjectStore {
  private readonly client: S3Client;
  constructor(
    private readonly bucket = process.env.AIW_KNOWLEDGE_S3_BUCKET || 'aiw-knowledge',
    private readonly prefix = (process.env.AIW_KNOWLEDGE_S3_PREFIX || '').replace(/^\/+|\/+$/g, ''),
  ) {
    const endpoint = process.env.AIW_KNOWLEDGE_S3_ENDPOINT;
    const accessKeyId = environmentSecret('AWS_ACCESS_KEY_ID');
    const secretAccessKey = environmentSecret('AWS_SECRET_ACCESS_KEY');
    const sessionToken = environmentSecret('AWS_SESSION_TOKEN');
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(endpoint ? { endpoint, forcePathStyle: process.env.AIW_KNOWLEDGE_S3_FORCE_PATH_STYLE !== 'false' } : {}),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) } } : {}),
    });
  }
  private fullKey(key: string): string { const normalized = safeKey(key); return this.prefix ? `${this.prefix}/${normalized}` : normalized; }
  async put(key: string, content: Uint8Array | string, mediaType: string): Promise<StoredKnowledgeObject> {
    const value = bytes(content); const fullKey = this.fullKey(key); const sha256 = digest(value);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: fullKey, Body: value, ContentType: mediaType, Metadata: { sha256 } }));
    return { key: safeKey(key), uri: `s3://${this.bucket}/${fullKey}`, sha256, sizeBytes: value.byteLength, mediaType, storedAt: new Date().toISOString() };
  }
  async get(key: string): Promise<Uint8Array> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.fullKey(key) }));
    if (!response.Body) throw new Error('OBJECT_NOT_FOUND'); return response.Body.transformToByteArray();
  }
  async delete(key: string): Promise<void> { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.fullKey(key) })); }
  async health(): Promise<{ adapter: string; ready: boolean; detail: string }> {
    try { await this.client.send(new HeadBucketCommand({ Bucket: this.bucket })); return { adapter: 's3', ready: true, detail: this.bucket }; }
    catch (error) { return { adapter: 's3', ready: false, detail: error instanceof Error ? error.message : String(error) }; }
  }
}

export function createKnowledgeObjectStore(): KnowledgeObjectStore {
  return process.env.AIW_KNOWLEDGE_OBJECT_STORE === 's3' ? new S3KnowledgeObjectStore() : new FileSystemKnowledgeObjectStore();
}
