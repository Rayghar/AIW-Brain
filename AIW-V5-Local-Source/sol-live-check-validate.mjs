// The live probe itself, proved on the test double (round 11): `scripts/sol-live-check.mjs --mock` starts a server on
// a scratch database against the loopback provider double, asks Sol for one field draft in each of the eleven
// chapters of the reference project, the journey, the review and one bounded architecture theme, and writes the evidence. Here: the
// evidence has eleven chapter entries, 1 to 11 in order, each completed with its packet's size and sources, its
// grounding and the draft text; the pins name the field prompt; no key reaches the file; and with no key in the shell
// the probe sends nothing and says so (exit 2). The double proves the probe, not the provider: the owner's local run
// with a real key is the evidence of the drafts' relevance (LOCAL-RUN.md). Run: npm run test:sol-live-check
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const checks = [], started = Date.now();
const pass = n => { checks.push(n); console.log('PASS', n); };
const scratch = mkdtempSync(path.join(os.tmpdir(), 'aiw-sol-live-'));
// The shell's own keys never reach the probe: the suite runs without a key, then on the double.
const bare = Object.fromEntries(Object.entries(process.env).filter(([k]) => !['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AIW_ANTHROPIC_BASE_URL'].includes(k) && !k.startsWith('AIW_LLM_')));
const probe = (args, env) => spawnSync(process.execPath, ['scripts/sol-live-check.mjs', ...args], {cwd: root, env, encoding: 'utf8', timeout: 240000});
try {
  // 1. No key: nothing is sent, the reason is said, exit 2, and no evidence is written.
  const none = probe(['--out', path.join(scratch, 'none.json')], bare);
  assert.equal(none.status, 2, none.stdout + none.stderr);
  assert.match(none.stdout, /nothing was sent\. Set ANTHROPIC_API_KEY in the shell/);
  assert.equal(existsSync(path.join(scratch, 'none.json')), false, 'no evidence file without a run');
  pass('with no key in the shell the probe sends nothing, names the variable to set and exits 2');

  // 2. The double: eleven chapter drafts, the journey and the review, all completed, each chapter entry recorded.
  const out = path.join(scratch, 'double.json');
  const mock = probe(['--mock', '--out', out], bare);
  assert.equal(mock.status, 0, mock.stdout + mock.stderr);
  const evidence = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(evidence.schema, 'aiw.sol-live-check/3');
  assert.equal(evidence.live, false); assert.equal(evidence.passed, true);
  assert.deepEqual(evidence.chapters.map(c => c.chapter), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'one field draft per chapter, in order');
  assert.deepEqual(evidence.chapters.map(c => c.command), ['artefact', 'quality.driver', 'decision.save', 'logical.responsibility', 'realisation.component', 'technology.capability', 'techrealisation.plan', 'interfaces.contract', 'security.control', 'runtime.plan', 'review.narrative']);
  for (const c of evidence.chapters) {
    assert.equal(c.status, 'completed', `chapter ${c.chapter}: ${c.error}`);
    assert.ok(typeof c.field === 'string' && c.field && typeof c.record === 'string' && c.record, `chapter ${c.chapter} names its field and record`);
    assert.ok(Number.isInteger(c.packetCharacters) && c.packetCharacters > 0 && c.packetCharacters <= 12000 && c.sources >= 1 && c.sources <= 10, `chapter ${c.chapter}: the packet's size and sources are recorded within the budgets`);
    assert.ok(typeof c.draft === 'string' && c.draft.length > 0, `chapter ${c.chapter}: the draft text is recorded`);
    assert.equal(c.groundingAccepted, true, `chapter ${c.chapter}: the double's draft passes the checks`);
  }
  assert.ok(evidence.chapters.filter(c => c.neighbours > 0).length >= 6, 'most chapters’ packets hold the record’s neighbours');
  const fields = evidence.runs.filter(r => r.mode === 'field');
  assert.equal(fields.length, 11); assert.equal(evidence.runs.length, 14, 'eleven field drafts, the journey, the review and one architecture theme');
  assert.ok(fields.every(r => r.packet && Array.isArray(r.packet.neighbours) && typeof r.packet.help === 'string' && r.draft && r.grounding), 'each field run keeps its packet reading, grounding and draft');
  assert.ok(evidence.pins.includes('sol-field-3'), 'the field prompt pin is recorded: ' + evidence.pins.join(', '));
  assert.ok(evidence.runs.some(r => r.mode === 'journey' && r.status === 'completed') && evidence.runs.some(r => r.mode === 'review' && r.status === 'completed'));
  const architecture = evidence.runs.find(r => r.mode === 'architecture');
  assert.equal(architecture.status, 'completed', architecture.error);
  assert.equal(architecture.packet.requirements, 1);
  assert.equal(architecture.checks.proposalCount, 1);
  assert.equal(architecture.groundingAccepted, true);
  assert.deepEqual(architecture.proposalRefs[0].requirements, ['REQ-001']);
  assert.deepEqual(architecture.calls.map(c => [c.pass, c.provider, c.kind]), [['draft', 'default', 'openai'], ['check', 'default', 'openai']], 'the architecture receipt names both model passes');
  assert.ok(architecture.calls.every(c => c.model && c.responseId && c.usage.inputTokens), 'each architecture pass has a model, response and usage receipt');
  const text = readFileSync(out, 'utf8');
  assert.doesNotMatch(text, /test-key-never-returned/, 'no key reaches the evidence');
  assert.match(text, /proves the probe, not the provider/, 'the double is named as such');
  assert.match(mock.stdout, /field\s+completed\s+ch\s+5 realisation\.component\.boundary[\s\S]*packet \d+ chars, \d+ sources · draft:/, 'the console line per chapter');
  pass('on the test double the probe records eleven chapter field drafts, journey, review and one grounded architecture theme with draft/check provider receipts and no key in the file');
} finally {
  rmSync(scratch, {recursive: true, force: true});
}
console.log(JSON.stringify({status: 'passed', checks: checks.length, seconds: Math.round((Date.now() - started) / 1000), checksRun: checks}, null, 2));
