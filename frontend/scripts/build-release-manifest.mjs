#!/usr/bin/env node
// Three-pin reproducibility: release id + content hashes + embedding model.
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const kb = JSON.parse(fs.readFileSync(path.join(root,'data/knowledge-library.json'),'utf8'));
const pin = (p) => fs.existsSync(path.join(root,p)) ? sha(path.join(root,p)) : null;
const manifest = {
  releaseId: kb.knowledgeReleaseId ?? 'AKR-unversioned',
  generatedAt: new Date().toISOString(),
  pins: {
    knowledgeLibrarySha256: sha(path.join(root,'data/knowledge-library.json')),
    webCopySha256: pin('apps/web/src/data/knowledge-library.json'),
    approvedClaimsSha256: pin('data/sprint7_7-approved-claims.json'),
    governanceSha256: sha(path.join(root,'data/knowledge-governance.json')),
  },
  embeddingModel: 'none — lexical retrieval v1 (pgvector inactive; pin embedder version here on activation)',
  ontologyVersion: '0.9.9',
};
fs.writeFileSync(path.join(root,'data/knowledge-release-manifest.json'), JSON.stringify(manifest,null,2));
console.log('release manifest pinned:', manifest.releaseId);
