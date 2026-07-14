import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { KnowledgeLibrary } from '@aiw/domain';

let cached: KnowledgeLibrary | null = null;

export async function loadKnowledgeLibrary(): Promise<KnowledgeLibrary> {
  if (cached) return cached;
  const configured = process.env.AIW_KNOWLEDGE_LIBRARY_PATH;
  const bundledDefault = fileURLToPath(new URL('../../../data/knowledge-library.json', import.meta.url));
  const filePath = configured ? path.resolve(configured) : bundledDefault;
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as KnowledgeLibrary;
  cached = parsed;
  return parsed;
}
