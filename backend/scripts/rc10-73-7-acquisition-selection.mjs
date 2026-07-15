import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');

export function selectAcquisitionDossiers(dossiers, requestedConnectorIds = []) {
  const governed = dossiers
    .filter((item) => item.acquisitionStatus === 'approved')
    .sort((left, right) => left.connectorId.localeCompare(right.connectorId));
  const requested = [...new Set(requestedConnectorIds.map((value) => value.trim()).filter(Boolean))].sort();
  if (!requested.length) return governed;
  const available = new Set(governed.map((item) => item.connectorId));
  const unknown = requested.filter((connectorId) => !available.has(connectorId));
  if (unknown.length) throw new Error(`UNKNOWN_OR_UNAPPROVED_ACQUISITION_CONNECTOR:${unknown.join(',')}`);
  const requestedSet = new Set(requested);
  return governed.filter((item) => requestedSet.has(item.connectorId));
}

export function acquisitionDryRun(dossiers, requestedConnectorIds = []) {
  const selected = selectAcquisitionDossiers(dossiers, requestedConnectorIds);
  return {
    schemaVersion: 'aiw-acquisition-dry-run-v1',
    networkAccess: false,
    selectedCount: selected.length,
    connectors: selected.map((item) => ({
      connectorId: item.connectorId,
      repository: item.repository,
      sourceAuthorityClass: item.sourceAuthorityClass,
      acquisitionStatus: item.acquisitionStatus,
      intendedUse: item.permittedUses,
    })),
  };
}

export function formatAcquisitionDryRun(report) {
  return [
    `selected count: ${report.selectedCount}`,
    ...report.connectors.map((item) => [
      item.connectorId,
      item.repository,
      item.sourceAuthorityClass,
      item.acquisitionStatus,
      item.intendedUse.join('; '),
    ].join('\t')),
  ].join('\n');
}

async function main() {
  const sourceMap = JSON.parse(await readFile(resolve(backend, 'data/rc10_55-global-architecture-intelligence-source-map.json'), 'utf8'));
  const requested = (process.env.AIW_REFRESH_CONNECTORS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const report = acquisitionDryRun(sourceMap.dossiers, requested);
  process.stdout.write(`${formatAcquisitionDryRun(report)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
