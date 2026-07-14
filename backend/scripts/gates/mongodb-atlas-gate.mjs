#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const files = [
  'apps/api/src/databaseMode.ts',
  'apps/api/src/repository.ts',
  'apps/api/src/durableEvents.ts',
  'apps/api/package.json',
];
const contents = Object.fromEntries(files.map((file) => [file, readFileSync(file, 'utf8')]));
const required = [
  ['apps/api/src/databaseMode.ts', 'mongodb-atlas'],
  ['apps/api/src/databaseMode.ts', 'MONGODB_URI'],
  ['apps/api/src/repository.ts', 'MongoAtlasProjectRepository'],
  ['apps/api/src/repository.ts', 'project_branch_documents'],
  ['apps/api/src/repository.ts', 'MONGODB_URI_REQUIRED_FOR_ATLAS_PROVIDER'],
  ['apps/api/src/durableEvents.ts', 'MongoAtlasDurableEventStore'],
  ['apps/api/src/durableEvents.ts', 'durable_events'],
  ['apps/api/package.json', 'mongodb'],
];
const missing = required.filter(([file, needle]) => !contents[file]?.includes(needle));
if (missing.length) {
  console.error('MongoDB Atlas integration gate failed:');
  for (const [file, needle] of missing) console.error(`- ${file} missing ${needle}`);
  process.exit(1);
}
console.log('MongoDB Atlas integration gate passed.');
