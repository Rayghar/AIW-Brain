import { createHash } from 'node:crypto';
import { dirname, extname, basename } from 'node:path';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function sha256Prefixed(value) {
  return `sha256:${sha256(value)}`;
}

export const opaquePreservableExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.vsdx', '.graffle', '.sketch']);
export const prohibitedExecutableExtensions = new Set(['.exe', '.dll', '.so', '.dylib', '.msi', '.com', '.scr', '.jar', '.class', '.pyc', '.wasm']);

export function sourceFormat(path) {
  const ext = extname(path).toLowerCase();
  return ext ? ext.slice(1) : 'extensionless';
}

export function parserFor(path) {
  const ext = extname(path).toLowerCase();
  if (['.md', '.mdx'].includes(ext)) return 'markdown-structural-parser-v1';
  if (['.adoc', '.asciidoc'].includes(ext)) return 'asciidoc-structural-parser-v1';
  if (ext === '.json') return 'json-structural-parser-v1';
  if (['.yaml', '.yml'].includes(ext)) return 'yaml-structural-parser-required';
  if (['.xml', '.drawio', '.svg'].includes(ext)) return 'xml-model-parser-required';
  if (['.puml', '.plantuml', '.c4', '.dsl'].includes(ext)) return 'architecture-model-parser-required';
  if (['.tf', '.bicep', '.hcl'].includes(ext)) return 'topology-parser-required';
  if (['.proto', '.graphql', '.gql', '.avsc', '.asyncapi', '.openapi'].includes(ext)) return 'interface-contract-parser-required';
  if (opaquePreservableExtensions.has(ext)) return 'opaque-format-specialist-parser-required';
  return 'bounded-text-parser-v1';
}

const artefactRules = [
  ['core-banking-modernisation', /core[-_ ]?bank|banking.*moderni[sz]|mainframe.*moderni[sz]|payment.*moderni[sz]/i],
  ['agentic-application-architecture', /agentic|multi[-_ ]?agent|agent[-_ ]?orchestrat|\bmcp\b|model[-_ ]?context[-_ ]?protocol|\ba2a\b/i],
  ['observability-architecture', /observab|telemetry|opentelemetry|prometheus|grafana|jaeger|zipkin|service[-_ ]?map|tracing/i],
  ['architecture-decision-record', /(^|\/)(adr|adrs|decision-records?)(\/|$)|\bADR[-_ ]?\d+/i],
  ['architecture-rule-or-fitness-test', /archunit|jqassistant|fitness|architecture[-_ ]?(?:rule|test)|conformance/i],
  ['diagram-or-model', /diagram|model|c4|plantuml|structurizr|drawio|topology|context[-_ ]?map/i],
  ['interface-or-event-contract', /asyncapi|openapi|swagger|protobuf|\.proto$|event[-_ ]?(?:contract|schema)|interface[-_ ]?contract/i],
  ['deployment-or-topology-blueprint', /deploy|topology|terraform|bicep|helm|kustomize|kubernetes|cloudformation|blueprint/i],
  ['security-blueprint', /security|threat[-_ ]?model|zero[-_ ]?trust|iam|authn|authz/i],
  ['data-flow-model', /data[-_ ]?flow|dfd|lineage|pipeline|streaming/i],
  ['migration-or-refactoring', /migrat|moderni[sz]|refactor|strangler|current[-_ ]?state|target[-_ ]?state/i],
  ['operational-runbook', /runbook|playbook|operations|operational|sre|incident|disaster[-_ ]?recovery/i],
  ['resilience-experiment', /chaos|resilien|failure[-_ ]?inject|fault[-_ ]?inject|game[-_ ]?day/i],
  ['cost-or-capacity-guidance', /cost|capacity|sizing|finops|throughput|scalability/i],
  ['stakeholder-or-concern-model', /stakeholder|concern|viewpoint|quality[-_ ]?attribute|scenario/i],
  ['educational-architecture-sequence', /tutorial|workshop|learning|roadmap|example|sample|reference[-_ ]?architecture/i],
  ['complete-reference-architecture', /reference[-_ ]?architecture|solution[-_ ]?architecture|architecture[-_ ]?center|architecture[-_ ]?catalog/i],
];

export function detectArchitectureArtefact({ connectorId, repository, commitSha, path, contentPreview = '', licenceDisposition, securityDisposition }) {
  const ext = extname(path).toLowerCase();
  const haystack = `${path}\n${contentPreview.slice(0, 20_000)}`;
  const types = artefactRules.filter(([, pattern]) => pattern.test(haystack)).map(([type]) => type);
  if (['.puml', '.plantuml', '.c4', '.dsl', '.drawio', '.svg', '.vsdx'].includes(ext) && !types.includes('diagram-or-model')) types.push('diagram-or-model');
  if (['.tf', '.bicep', '.hcl'].includes(ext) && !types.includes('deployment-or-topology-blueprint')) types.push('deployment-or-topology-blueprint');
  if (!types.length) return null;
  const generated = /(^|\/)(dist|build|generated|vendor|node_modules|target)(\/|$)|\.min\./i.test(path);
  const directory = dirname(path).replaceAll('\\', '/');
  return {
    artefactId: `AART-${sha256(`${connectorId}|${commitSha}|${path}`).slice(0, 24)}`,
    artefactTypes: types.sort(), connectorId, repository, immutableCommit: commitSha, path,
    format: sourceFormat(path), parserRequired: parserFor(path), relatedFiles: [],
    sourceAuthorship: generated ? 'generated-or-vendored-review-required' : 'source-authored-candidate',
    licenceAndReusePosture: licenceDisposition, securityDisposition,
    candidateExtractionDestinations: types.map((type) => `candidate/${type}`).sort(),
    crossFileGroupHint: directory === '.' ? basename(path, extname(path)) : directory,
  };
}

export function buildCrossFileArchitectureGroups(artefacts) {
  const buckets = new Map();
  for (const artefact of artefacts) {
    const key = `${artefact.connectorId}|${artefact.crossFileGroupHint}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(artefact);
  }
  const groups = [];
  for (const [key, members] of buckets) {
    if (members.length < 2) continue;
    const paths = members.map((item) => item.path).sort();
    const groupId = `ACFG-${sha256(`${key}|${paths.join('|')}`).slice(0, 24)}`;
    for (const member of members) {
      const relatedFileCount = paths.length - 1;
      member.crossFileGroupId = groupId;
      member.relatedFileCount = relatedFileCount;
      member.relatedFiles = paths.filter((path) => path !== member.path).slice(0, 10);
      member.relatedFilesTruncated = relatedFileCount > member.relatedFiles.length;
    }
    groups.push({
      groupId,
      connectorId: members[0].connectorId, repository: members[0].repository,
      immutableCommit: members[0].immutableCommit, groupPath: members[0].crossFileGroupHint,
      memberPaths: paths, artefactTypes: [...new Set(members.flatMap((item) => item.artefactTypes))].sort(),
      relationship: 'co-located-candidate-architecture-artefacts', reviewRequired: true,
    });
  }
  return groups.sort((a, b) => a.groupId.localeCompare(b.groupId));
}

export function buildBoundedEvidencePassages({ connectorId, repository, commitSha, path, content, sections }) {
  const lines = content.split(/\r?\n/);
  const passages = [];
  for (const section of sections) {
    const start = Math.max(1, Number(section.lineStart || 1));
    const end = Math.min(lines.length, Math.max(start, Number(section.lineEnd || start)));
    const excerpt = lines.slice(start - 1, Math.min(end, start + 39)).join('\n').trim().slice(0, 8_000);
    if (!excerpt) continue;
    passages.push({
      evidenceId: `BEV-${sha256(`${connectorId}|${commitSha}|${path}|${start}|${end}|${excerpt}`).slice(0, 24)}`,
      connectorId, repository, immutableCommitSha: commitSha, path, heading: section.heading ?? null,
      structuralRange: `lines ${start}-${Math.min(end, start + 39)}`, boundedExcerpt: excerpt,
      excerptHash: sha256Prefixed(excerpt), parserVersion: parserFor(path), contentDisposition: 'untrusted-data-only',
    });
  }
  return passages.slice(0, 500);
}
