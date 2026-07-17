import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BIA1_CRITICAL_OMISSIONS,
  BIA1_GOLD_EXPECTATIONS,
  BIA1_RUBRIC,
  BIA1_SCENARIOS,
  sha256,
} from "../../apps/api/src/bia1Benchmark.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const out = resolve(root, "release-evidence", "rc10.73.8", "bia1");
const names = [
  "BIA1_SCENARIO_1_AGENCY_BANKING_INPUT.json",
  "BIA1_SCENARIO_2_EVENT_FULFILMENT_INPUT.json",
  "BIA1_SCENARIO_3_SENSITIVE_ANALYTICS_INPUT.json",
  "BIA1_SCENARIO_4_CORE_BANKING_MODERNISATION_INPUT.json",
  "BIA1_SCENARIO_5_AGENTIC_APPLICATION_INPUT.json",
];

async function writeJson(name: string, value: unknown) {
  await writeFile(resolve(out, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

await mkdir(out, { recursive: true });
for (let index = 0; index < BIA1_SCENARIOS.length; index += 1) await writeJson(names[index]!, BIA1_SCENARIOS[index]);
await writeJson("BIA1_FROZEN_RUBRIC.json", BIA1_RUBRIC);
await writeJson("BIA1_CRITICAL_OMISSION_CATALOG.json", { schemaVersion: "aiw-bia1-critical-omissions-v1", frozen: true, omissions: BIA1_CRITICAL_OMISSIONS, productionAccepted: false });
await writeJson("BIA1_GOLD_EXPECTATION_REGISTER.json", { schemaVersion: "aiw-bia1-gold-expectations-v1", evaluatorOnly: true, frozen: true, scenarios: BIA1_GOLD_EXPECTATIONS, productionAccepted: false });
const files = [...names, "BIA1_FROZEN_RUBRIC.json", "BIA1_CRITICAL_OMISSION_CATALOG.json", "BIA1_GOLD_EXPECTATION_REGISTER.json"];
const records = [];
for (const path of files) {
  const content = await readFile(resolve(out, path));
  records.push({ path, bytes: content.byteLength, sha256: sha256(content) });
}
await writeJson("BIA1_SCENARIO_FINGERPRINT_RECEIPT.json", {
  schemaVersion: "aiw-bia1-fingerprint-receipt-v1",
  frozenAt: new Date().toISOString(),
  baselineCommit: "170561006a7b000e966b7e4b15632083ee8b3d9c",
  generationOutputsPresentAtFreeze: false,
  records,
  aggregateFingerprint: sha256(records),
  goldExpectationsExcludedFromGeneration: true,
  historicalGate6EvidenceModified: 0,
  productionAccepted: false,
});
process.stdout.write(`${JSON.stringify({ files: records.length + 1, aggregateFingerprint: sha256(records), productionAccepted: false }, null, 2)}\n`);
