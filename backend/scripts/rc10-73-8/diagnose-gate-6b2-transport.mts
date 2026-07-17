import { lookup } from 'node:dns/promises';
import { createConnection } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway, type LlmSafeTransportTelemetry } from '../../apps/api/src/llmGateway.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const r2Mode = process.argv.includes('--r2-transport');
const evidenceRoot = r2Mode
  ? resolve(root, 'release-evidence', 'rc10.73.8', 'gate6b2-r2')
  : resolve(root, 'release-evidence', 'rc10.73.8');
const runtimePolicyPath = resolve(root, 'backend', 'config', 'llm-runtime-overrides.json');
const model = 'gpt-4.1-mini-2025-04-14';
const purpose = 'governed-candidate-semantic-transformation';
const timeoutMs = 15_000;

const safeText = (value: unknown) => String(value ?? '').replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]').slice(0, 500);
const now = () => new Date().toISOString();
async function readJson(path: string) { return JSON.parse(await readFile(path, 'utf8')); }
async function writeJsonAtomic(name: string, value: unknown) {
  await mkdir(evidenceRoot, { recursive: true });
  const path = resolve(evidenceRoot, name); const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await rename(temporary, path);
}

function governedPolicy(raw: any): LlmRuntimePolicy {
  const tenant = raw?.tenants?.['gate-6b-local-smoke'] ?? raw;
  const route = tenant?.routes?.find((item: any) => item.providerId === 'openai' && item.purpose === purpose && item.model === model);
  const allowlist = tenant?.modelAllowlist?.filter((item: any) => item.providerId === 'openai' && item.purposes?.includes(purpose) && item.model === model && item.allowedSnapshots?.includes(model));
  if (!route || allowlist?.length !== 1) throw new Error('GATE6B2_TRANSPORT_EXACT_MODEL_NOT_ALLOWLISTED');
  if (tenant.allowFallback !== false || route.fallbackRouteIds?.length !== 0) throw new Error('GATE6B2_TRANSPORT_FALLBACK_PROHIBITED');
  return { ...tenant, routes: [{ ...route, enabled: true, timeoutMs, fallbackRouteIds: [], dataClassificationAllowlist: ['public'] }], modelAllowlist: allowlist, allowFallback: false, maxRetries: 0 };
}

function stepFailure(startedAt: string, error: any) {
  const endedAt = now(); const cause = error?.cause;
  return { startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: false,
    errorName: safeText(error?.name || 'Error'), errorMessage: safeText(error?.message || error),
    causeCode: cause?.code ? safeText(cause.code) : null, causeMessage: cause?.message ? safeText(cause.message) : null,
    socket: cause?.socket ? { localAddress: cause.socket.localAddress ?? null, localPort: cause.socket.localPort ?? null, remoteAddress: cause.socket.remoteAddress ?? null, remotePort: cause.socket.remotePort ?? null, bytesWritten: cause.socket.bytesWritten ?? null, bytesRead: cause.socket.bytesRead ?? null } : null,
    retryPosture: 'no-automatic-retry' };
}

async function dnsStep(host: string) {
  const startedAt = now(); try {
    const addresses = await lookup(host, { all: true }); const endedAt = now();
    return { startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: addresses.length > 0,
      dnsResult: addresses.map((item) => ({ address: item.address, family: item.family })), retryPosture: 'no-automatic-retry' };
  } catch (error) { return { ...stepFailure(startedAt, error), dnsResult: [] }; }
}

async function tcpStep(host: string) {
  const startedAt = now(); try {
    const socketInfo = await new Promise<any>((resolvePromise, reject) => {
      const socket = createConnection({ host, port: 443 }); socket.setTimeout(timeoutMs);
      socket.once('connect', () => { const result = { localAddress: socket.localAddress ?? null, localPort: socket.localPort ?? null, remoteAddress: socket.remoteAddress ?? null, remotePort: socket.remotePort ?? null, bytesWritten: socket.bytesWritten, bytesRead: socket.bytesRead }; socket.end(); resolvePromise(result); });
      socket.once('timeout', () => { socket.destroy(); reject(Object.assign(new Error('TCP connection timeout'), { code: 'TCP_TIMEOUT' })); });
      socket.once('error', reject);
    });
    const endedAt = now(); return { startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: true, socket: socketInfo, retryPosture: 'no-automatic-retry' };
  } catch (error) { return stepFailure(startedAt, error); }
}

async function tlsStep(host: string) {
  const startedAt = now(); try {
    const result = await new Promise<any>((resolvePromise, reject) => {
      const socket = tlsConnect({ host, port: 443, servername: host, rejectUnauthorized: true }); socket.setTimeout(timeoutMs);
      socket.once('secureConnect', () => { const result = { authorized: socket.authorized, authorizationError: socket.authorizationError ?? null, protocol: socket.getProtocol(), cipher: socket.getCipher()?.name ?? null, localAddress: socket.localAddress ?? null, localPort: socket.localPort ?? null, remoteAddress: socket.remoteAddress ?? null, remotePort: socket.remotePort ?? null, bytesWritten: socket.bytesWritten, bytesRead: socket.bytesRead }; socket.end(); resolvePromise(result); });
      socket.once('timeout', () => { socket.destroy(); reject(Object.assign(new Error('TLS negotiation timeout'), { code: 'TLS_TIMEOUT' })); });
      socket.once('error', reject);
    });
    const endedAt = now(); return { startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: result.authorized === true, tlsResult: result, retryPosture: 'no-automatic-retry' };
  } catch (error) { return stepFailure(startedAt, error); }
}

async function basicHttpStep(url: string) {
  const startedAt = now(); try {
    const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json', 'user-agent': 'AIW-Gate6B2-Transport-Diagnostic' }, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.arrayBuffer(); const endedAt = now();
    return { startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: true, httpStatus: response.status,
      providerRequestId: response.headers.get('x-request-id') ?? response.headers.get('openai-request-id'), bytesRead: body.byteLength,
      expectedUnauthenticatedResponse: true, retryPosture: 'no-automatic-retry' };
  } catch (error) { return stepFailure(startedAt, error); }
}

async function entitlement(gateway: LlmGateway) {
  const startedAt = now(); try {
    const receipt = await gateway.verifyExactModelEntitlement({ providerId: 'openai', purpose, model }); const endedAt = now();
    return { startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: receipt.available && receipt.httpStatus === 200 && receipt.exactModelIdReturned === model,
      httpStatus: receipt.httpStatus, providerRequestId: receipt.providerRequestId ?? null, exactModelIdReturned: receipt.exactModelIdReturned ?? null,
      redaction: receipt.redaction, retryPosture: 'no-automatic-retry' };
  } catch (error) { return stepFailure(startedAt, error); }
}

async function freshChild(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('GATE6B2_TRANSPORT_MISSING_SECRET');
  const policy = governedPolicy(await readJson(runtimePolicyPath)); const telemetry: LlmSafeTransportTelemetry[] = [];
  const gateway = new LlmGateway(policy, fetch, { transportTelemetrySink: (record) => { telemetry.push(record); } });
  const result = await entitlement(gateway);
  process.stdout.write(JSON.stringify({ result, transportTelemetry: telemetry, productionAccepted: false }));
}

async function freshProcessStep() {
  const startedAt = now(); return new Promise<any>((resolvePromise) => {
    const child = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--fresh-child'], { cwd: resolve(root, 'backend'), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; child.stdout.on('data', (chunk) => { stdout += chunk.toString(); }); child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    const timer = setTimeout(() => child.kill(), timeoutMs + 5_000);
    child.once('exit', (code) => { clearTimeout(timer); const endedAt = now();
      if (code === 0) { try { const parsed = JSON.parse(stdout); resolvePromise({ startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: parsed.result?.passed === true, childExitCode: code, ...parsed }); return; } catch { /* handled below */ } }
      resolvePromise({ startedAt, endedAt, elapsedMs: Date.parse(endedAt) - Date.parse(startedAt), passed: false, childExitCode: code, errorName: 'FreshProcessDiagnosticError', errorMessage: safeText(stderr || 'fresh child returned invalid output'), retryPosture: 'no-automatic-retry' });
    });
  });
}

async function main() {
  if (process.argv.includes('--fresh-child')) { await freshChild(); return; }
  if (!process.argv.includes('--approved-non-generation-transport-diagnostic')) throw new Error('GATE6B2_TRANSPORT_DIAGNOSTIC_APPROVAL_MISSING');
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('GATE6B2_TRANSPORT_MISSING_SECRET');
  const policy = governedPolicy(await readJson(runtimePolicyPath)); const route = policy.routes[0]!; const baseUrl = route.baseUrl!; const host = new URL(baseUrl).hostname;
  const transportTelemetry: LlmSafeTransportTelemetry[] = [];
  const gateway = new LlmGateway(policy, fetch, { transportTelemetrySink: (record) => { transportTelemetry.push(record); } });
  const startedAt = now(); const dns = await dnsStep(host); const tcp = await tcpStep(host); const tls = await tlsStep(host);
  const basicHttps = await basicHttpStep(`${baseUrl}/models/${encodeURIComponent(model)}`);
  const exactModelEntitlement = await entitlement(gateway);
  const consecutiveAuthenticated = [];
  for (let index = 0; index < 3; index += 1) consecutiveAuthenticated.push(await entitlement(gateway));
  const freshConnection = await freshProcessStep(); const completedAt = now();
  const allErrors = JSON.stringify({ dns, tcp, tls, basicHttps, exactModelEntitlement, consecutiveAuthenticated, freshConnection, transportTelemetry });
  const noUndErrSocket = !/UND_ERR_SOCKET/i.test(allErrors);
  const passed = dns.passed && tcp.passed && tls.passed && basicHttps.passed && exactModelEntitlement.passed
    && consecutiveAuthenticated.length === 3 && consecutiveAuthenticated.every((item) => item.passed) && freshConnection.passed && noUndErrSocket;
  const result = { schemaVersion: 'aiw-gate-6b-2-transport-diagnostic-v1', startedAt, completedAt,
    productionAccepted: false, diagnosticType: 'non-generation-transport-only', modelCalls: 0, benchmarkEvidenceTransferred: false,
    host, port: 443, timeoutMs, exactModel: model, passed, dns, tcp, tls, basicHttps, exactModelEntitlement,
    consecutiveAuthenticated, freshConnection, transportTelemetry, noUndErrSocket,
    credentialsRecorded: false, authenticationHeadersRecorded: false, rawSecretValuesRecorded: false,
  };
  const receiptName = r2Mode ? 'GATE_6B_2_R2_TRANSPORT_DIAGNOSTIC.json' : 'GATE_6B_2_TRANSPORT_DIAGNOSTIC.json';
  const reportName = r2Mode ? 'GATE_6B_2_R2_TRANSPORT_DIAGNOSTIC.md' : 'GATE_6B_2_TRANSPORT_DIAGNOSTIC.md';
  await writeJsonAtomic(receiptName, { ...result, r2Preflight: r2Mode });
  await writeFile(resolve(evidenceRoot, reportName), `# Gate 6B.2${r2Mode ? ' R2' : ''} transport diagnostic\n\nStatus: **${passed ? 'PASS' : 'FAIL'}**\nGenerated: ${completedAt}\nExact model entitlement: ${exactModelEntitlement.passed ? 'passed' : 'failed'}\nThree consecutive authenticated non-generation responses: ${consecutiveAuthenticated.every((item) => item.passed) ? 'passed' : 'failed'}\nFresh-process connection: ${freshConnection.passed ? 'passed' : 'failed'}\nUND_ERR_SOCKET observed: ${noUndErrSocket ? 'no' : 'yes'}\nModel generation calls: 0\nProduction accepted: false\n\nDNS, TCP, TLS, basic HTTPS and authenticated model-entitlement checks used no benchmark evidence or semantic prompt content. Secrets and authentication headers are excluded from this report.\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ passed, dns: dns.passed, tcp: tcp.passed, tls: tls.passed, basicHttps: basicHttps.passed, exactModelEntitlement: exactModelEntitlement.passed, consecutiveAuthenticated: consecutiveAuthenticated.map((item) => item.passed), freshConnection: freshConnection.passed, noUndErrSocket, modelCalls: 0, productionAccepted: false }, null, 2)}\n`);
  if (!passed) process.exitCode = 2;
}

main().catch((error) => { process.stderr.write(`${safeText(error instanceof Error ? error.message : error)}\n`); process.exitCode = 1; });
