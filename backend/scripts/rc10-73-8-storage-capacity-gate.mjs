import { statfs } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MINIMUM_FREE_BYTES = 8 * 1024 ** 3;

function finiteNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label}_MUST_BE_A_NON_NEGATIVE_NUMBER`);
  return Math.trunc(value);
}

export function evaluateStorageCapacity(input) {
  const freeBytesBefore = finiteNonNegative(input.freeBytesBefore, 'FREE_BYTES');
  const projectedTemporaryBytes = finiteNonNegative(input.projectedTemporaryBytes, 'PROJECTED_TEMPORARY_BYTES');
  const projectedPermanentBytes = finiteNonNegative(input.projectedPermanentBytes, 'PROJECTED_PERMANENT_BYTES');
  const projectedPeakBytes = projectedTemporaryBytes + projectedPermanentBytes;
  const projectedFreeBytesAtPeak = freeBytesBefore - projectedPeakBytes;
  const reasons = [];

  if (freeBytesBefore < MINIMUM_FREE_BYTES) reasons.push('FREE_SPACE_BELOW_8_GIB_CONTROLLED_STOP');
  if (projectedFreeBytesAtPeak < MINIMUM_FREE_BYTES) reasons.push('PROJECTED_FREE_SPACE_BELOW_8_GIB_CONTROLLED_STOP');
  if (input.stage === 'gate-6c-full-semantic-transformation') {
    if (!input.productOwnerApproved) reasons.push('GATE_6C_PRODUCT_OWNER_APPROVAL_REQUIRED');
    if (!Number.isFinite(input.projectedTokenCount) || input.projectedTokenCount <= 0) reasons.push('GATE_6C_PROJECTED_TOKEN_COUNT_REQUIRED');
    if (!String(input.projectedModelWorkload ?? '').trim()) reasons.push('GATE_6C_PROJECTED_MODEL_WORKLOAD_REQUIRED');
  }

  return {
    schemaVersion: 'aiw-rc10-73-8-storage-capacity-gate-v1',
    stage: input.stage,
    freeBytesBefore,
    minimumFreeBytes: MINIMUM_FREE_BYTES,
    projectedTemporaryBytes,
    projectedPermanentBytes,
    projectedPeakBytes,
    projectedFreeBytesAtPeak,
    projectedTokenCount: input.projectedTokenCount ?? null,
    projectedModelWorkload: input.projectedModelWorkload ?? null,
    productOwnerApproved: input.productOwnerApproved === true,
    automaticEvidenceDeletionAllowed: false,
    decision: reasons.length ? 'controlled-stop' : 'proceed',
    reasons,
    productionAccepted: false,
  };
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const stage = valueAfter('--stage');
  if (!stage) throw new Error('STAGE_REQUIRED');
  const productRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const disk = await statfs(productRoot, { bigint: true });
  const receipt = evaluateStorageCapacity({
    stage,
    freeBytesBefore: Number(disk.bavail * disk.bsize),
    projectedTemporaryBytes: Number(valueAfter('--temporary-bytes') ?? NaN),
    projectedPermanentBytes: Number(valueAfter('--permanent-bytes') ?? NaN),
    projectedTokenCount: valueAfter('--projected-tokens') === undefined ? null : Number(valueAfter('--projected-tokens')),
    projectedModelWorkload: valueAfter('--projected-model-workload') ?? null,
    productOwnerApproved: process.argv.includes('--product-owner-approved'),
  });
  process.stdout.write(`${JSON.stringify({ ...receipt, observedAt: new Date().toISOString(), observedPath: productRoot }, null, 2)}\n`);
  if (receipt.decision !== 'proceed') process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
