import fs from 'node:fs/promises';
import { assessDesignLibraryIntegrity } from '../packages/engine/dist/index.js';
const library = JSON.parse(await fs.readFile(new URL('../data/knowledge-library.json', import.meta.url), 'utf8'));
const report = assessDesignLibraryIntegrity(library);
await fs.writeFile(new URL('../data/sprint7_6-knowledge-integrity.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.insufficient > 0 || report.summary.unresolvedEvidenceIds.length > 0) process.exitCode = 2;
