import type { ArchitectureProject, ArtifactBundle, RepositoryBinding } from '@aiw/domain';
import { generateArchitectureFitnessFunctions } from '@aiw/engine';
import { openRepositoryPullRequest } from './repositoryProviders.js';

function workflowContent(): string {
  return `name: AIW Architecture Conformance
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  architecture-conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Execute project tests and AIW fitness functions
        shell: bash
        run: |
          set -euo pipefail
          if [ -f ./mvnw ]; then ./mvnw test; elif [ -f ./gradlew ]; then ./gradlew test; elif [ -f package.json ]; then npm ci && npm test; else echo "Configure the project-specific conformance command"; fi
      - name: Upload conformance evidence to AIW
        if: always() && env.AIW_CONFORMANCE_URL != ''
        env:
          AIW_CONFORMANCE_URL: \${{ secrets.AIW_CONFORMANCE_URL }}
          AIW_CONFORMANCE_TOKEN: \${{ secrets.AIW_CONFORMANCE_TOKEN }}
        shell: bash
        run: |
          node .aiw/fitness/publish-conformance.mjs
`;
}

function publisherContent(project: ArchitectureProject): string {
  return `import { readFileSync, existsSync } from 'node:fs';
const url = process.env.AIW_CONFORMANCE_URL;
if (!url) process.exit(0);
const payload = {
  id: 'CEV-' + process.env.GITHUB_RUN_ID,
  projectId: ${JSON.stringify(project.id)},
  branchId: ${JSON.stringify(project.branch.id)},
  sourceType: 'generic',
  repositoryUrl: process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY,
  commitSha: process.env.GITHUB_SHA,
  workflowRunId: process.env.GITHUB_RUN_ID,
  environment: 'ci',
  collectedAt: new Date().toISOString(),
  payload: existsSync('.aiw/conformance-results.json') ? JSON.parse(readFileSync('.aiw/conformance-results.json','utf8')) : { results: [], status: 'no-project-adapter-output' }
};
const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (process.env.AIW_CONFORMANCE_TOKEN || '') }, body: JSON.stringify(payload) });
if (!response.ok) throw new Error('AIW conformance upload failed: ' + response.status);
`;
}

export function buildFitnessDeliveryBundle(project: ArchitectureProject, patternIds: string[]): ArtifactBundle {
  const artifacts = generateArchitectureFitnessFunctions(patternIds);
  return {
    generatedAt: new Date().toISOString(), projectId: project.id,
    files: [
      ...artifacts.map((item) => ({ path: item.path, mediaType: item.mediaType, content: item.content })),
      { path: '.github/workflows/aiw-architecture-conformance.yml', mediaType: 'application/yaml', content: workflowContent() },
      { path: '.aiw/fitness/publish-conformance.mjs', mediaType: 'text/javascript', content: publisherContent(project) },
      { path: '.aiw/fitness/README.md', mediaType: 'text/markdown', content: '# AIW architecture fitness functions\n\nGenerated controls are reviewable scaffolds. Configure project-specific execution and do not merge them without architecture and engineering review.\n' },
    ],
  };
}

export async function deliverFitnessFunctions(input: { project: ArchitectureProject; binding: RepositoryBinding; patternIds: string[]; token: string }) {
  const bundle = buildFitnessDeliveryBundle(input.project, input.patternIds);
  const pullRequest = await openRepositoryPullRequest(input.project, input.binding, bundle, input.token);
  return { pullRequest, fileCount: bundle.files.length, generatedAt: bundle.generatedAt, reviewRequired: true };
}
