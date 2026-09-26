// Local accounts on the laptop server (server.js, AIW_LOCAL_ACCOUNTS): each person signs in with their own
// secret, requests carry that identity, and a claim's author cannot verify it — a second signed-in person,
// added to the project team by its owner, can. The accounts are synthetic test identities.
// Run: npm run test:local-accounts
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {rmSync} from 'node:fs';
import net from 'node:net';

const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/local-accounts-' + port + '.sqlite';
const accounts = {'architect-a': 'architect-secret-0001', 'steward-b': 'steward-secret-000002'};
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, AIW_LOCAL_ACCOUNTS: JSON.stringify(accounts), OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port, checks = [], pass = n => checks.push(n);
const signIn = (account, secret, origin = base) => fetch(base + '/local/sign-in', {method: 'POST', redirect: 'manual', headers: {'Content-Type': 'application/x-www-form-urlencoded', Origin: origin}, body: new URLSearchParams({account, secret, next: '/?chapter=1'})});
const cookieOf = r => (r.headers.get('set-cookie') || '').split(';')[0];
const api = (cookie, path, body) => fetch(base + path, {method: body ? 'POST' : 'GET', headers: {Cookie: cookie, Origin: base, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
try {
  // 1. Signing in: nothing is served until a person signs in with their own secret.
  let r = await fetch(base + '/api/project'); assert.equal(r.status, 401); assert.match((await r.json()).error, /Sign in/);
  r = await fetch(base + '/?chapter=1', {redirect: 'manual'}); assert.equal(r.status, 303); assert.match(r.headers.get('location'), /^\/local\/sign-in\?next=/);
  assert.match(await (await fetch(base + '/local/sign-in')).text(), /Sign in to this workbench[\s\S]*A claim's author cannot verify it/);
  assert.equal((await signIn('architect-a', 'not-the-right-secret')).status, 401);
  assert.equal((await signIn('nobody', accounts['architect-a'])).status, 401);
  assert.equal((await signIn('architect-a', accounts['architect-a'], 'http://elsewhere.example')).status, 403, 'a sign-in posted from another origin is refused');
  r = await signIn('architect-a', accounts['architect-a']); assert.equal(r.status, 303); assert.equal(r.headers.get('location'), '/?chapter=1');
  assert.match(r.headers.get('set-cookie'), /HttpOnly/); assert.match(r.headers.get('set-cookie'), /SameSite=Strict/);
  const architect = cookieOf(r), [name, value] = architect.split('='), [id64, expires, sig] = value.split('.');
  assert.equal((await api(`${name}=${id64}.${expires}.${sig.slice(0, -2)}${sig.endsWith('AA') ? 'BB' : 'AA'}`, '/api/project')).status, 401, 'a tampered session is refused');
  assert.equal((await api(`${name}=${Buffer.from('steward-b').toString('base64url')}.${expires}.${sig}`, '/api/project')).status, 401, 'one account\'s signature does not sign in another');
  r = await api(architect, '/api/project'); assert.equal(r.status, 200);
  const id = (await r.json()).document.id;
  pass('signing in: nothing is served until a person signs in with their own secret; wrong secrets, unknown accounts, other origins, and tampered or re-used sessions are refused; the session cookie is HttpOnly and SameSite=Strict');

  // 2. Four eyes: the author cannot verify the claim; a second signed-in person, added by the owner, can.
  const command = async (cookie, cmd) => { const {revision} = await (await api(cookie, '/api/project?project=' + id)).json(); return api(cookie, '/api/commands?project=' + id, {revision, command: cmd}); };
  r = await command(architect, {type: 'knowledge.source', payload: {title: 'Gateway budget note', body: 'Gateway notes\nThe channel gateway enforces a 2-second budget on this call.\nRecorded by the platform team.', revision: '2026-09-26', path: 'notes/gateway.md'}});
  assert.equal(r.status, 200); let d = (await r.json()).document; const sourceId = d.knowledge.sources.at(-1).id;
  r = await command(architect, {type: 'knowledge.claim', payload: {sourceId, lineStart: 2, lineEnd: 2, subjectId: 'PAT-TIMEOUT', predicate: 'bounds the call', statement: 'The channel gateway bounds this call at 2 seconds.', claimType: 'applicability', polarity: 'limits', conditions: 'The call passes through the channel gateway.', limitations: 'Calls that bypass the gateway are not bounded by it.'}});
  assert.equal(r.status, 200); d = (await r.json()).document; const claimId = d.knowledge.claims.at(-1).id;
  const review = {id: claimId, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true, reviewed: true, reviewer: 'Knowledge steward', reason: 'Checked against the original note.'};
  r = await command(architect, {type: 'knowledge.review', payload: review}); assert.equal(r.status, 400); assert.match((await r.json()).error, /You wrote this claim\. Another authenticated person must verify it/);
  assert.equal((await api(architect, '/api/access?project=' + id, {actorId: 'steward-b', role: 'editor'})).status, 200, 'the owner adds the second person to the project team');
  const steward = cookieOf(await signIn('steward-b', accounts['steward-b']));
  r = await command(steward, {type: 'knowledge.review', payload: {...review, reviewer: 'Steward B'}}); assert.equal(r.status, 200, 'the second person verifies it');
  const claim = (await (await api(architect, '/api/project?project=' + id)).json()).document.knowledge.claims.find(x => x.id === claimId);
  assert.equal(claim.actor, 'architect-a'); assert.equal(claim.review.actor, 'steward-b'); assert.equal(claim.review.decision, 'verified');
  pass('four eyes through the server: the claim\'s author is refused when verifying it; the owner adds a second person to the project team, who signs in with their own secret and verifies it; the claim records both identities');

  // 3. Signing out ends the session in the browser.
  r = await fetch(base + '/local/sign-out', {redirect: 'manual', headers: {Cookie: steward}}); assert.equal(r.status, 303); assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
  pass('signing out clears the session cookie and returns to the sign-in page');
} finally {
  server.kill();
  for (const f of [db, db + '-wal', db + '-shm']) try { rmSync(f, {force: true}); } catch { /* best effort */ }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
