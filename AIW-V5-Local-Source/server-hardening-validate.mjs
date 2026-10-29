// The laptop server's own defences (server.js): it answers only on its own address, refuses to serve a
// network without accounts, sends a Content-Security-Policy with the app, ends sessions on the server
// at sign-out, throttles guessing, keeps redirects on this site, and marks cookies Secure behind a proxy the
// operator trusts. Round 2: request bodies are bounded before they are read (B2-02), both stores follow the
// database file (B2-07), a health endpoint, an orderly stop and a request id (B2-10), API answers travel
// compressed (B2-13), every setting is documented (B2-14), and a sign-in names its origin (B2-17).
// Private databases and synthetic accounts only. Run: npm run test:server-hardening
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {rmSync, readFileSync, readdirSync, mkdtempSync, existsSync, renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {renderEnvExample, SETTINGS} from './settings.js';

const checks = [], pass = (name) => checks.push(name), started = [];
process.on('exit', () => { for (const server of started) { try { server.child.kill('SIGKILL'); } catch { /* already gone */ } } }); // no server outlives this suite
const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
async function start(env = {}, args = []) {
  const port = await freePort(), db = '.aiw-local/server-hardening-' + port + '.sqlite';
  const child = spawn(process.execPath, ['server.js', '--port', String(port), ...args], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', AIW_LOCAL_ACCOUNTS: '', AIW_ALLOW_OPEN_NETWORK: '', AIW_ALLOWED_HOSTS: '', AIW_COOKIE_SECURE: '', ...env}, stdio: ['ignore', 'pipe', 'pipe']});
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });
  const server = {port, db, child, ready: null, base: 'http://127.0.0.1:' + port, output: () => output};
  started.push(server);
  server.ready = await new Promise((resolve) => { child.stdout.on('data', (d) => { if (String(d).includes('ready')) resolve(true); }); child.on('exit', () => resolve(false)); });
  return server;
}
// Raw HTTP, so the Host header is exactly what a rebinding page's browser would send.
const raw = (port, text) => new Promise((resolve) => {
  const socket = net.connect(port, '127.0.0.1', () => socket.write(text));
  let reply = '';
  socket.on('data', (d) => { reply += d; });
  socket.on('end', () => resolve(reply));
  socket.on('error', () => resolve(reply));
});
const statusOf = (reply) => Number(reply.split(' ')[1]);

try {
  // 1. Its own address only, and a strict policy on the app it serves.
  const open = await start();
  assert.equal(statusOf(await raw(open.port, `POST /api/projects HTTP/1.1\r\nHost: attacker.example:${open.port}\r\nOrigin: http://attacker.example:${open.port}\r\nContent-Type: application/json\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}`)), 421, 'a rebinding page cannot create a project');
  assert.equal(statusOf(await raw(open.port, `GET /api/project HTTP/1.1\r\nHost: attacker.example\r\nConnection: close\r\n\r\n`)), 421, 'or read one');
  assert.equal(statusOf(await raw(open.port, 'GET / HTTP/1.0\r\n\r\n')), 421, 'a request without a Host is refused');
  assert.equal((await fetch(`http://localhost:${open.port}/`)).status, 200, 'localhost is its own name');
  let r = await fetch(open.base + '/');
  const policy = r.headers.get('content-security-policy') || '';
  for (const directive of ["script-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'self'"]) assert(policy.includes(directive), 'the app page carries ' + directive);
  assert(!/script-src[^;]*unsafe/.test(policy), 'scripts never run inline');
  assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  r = await fetch(open.base + '/entry.js', {headers: {'accept-encoding': 'br'}});
  assert.equal(r.headers.get('content-encoding'), 'br', 'modules travel compressed');
  assert.match(await r.text(), /import/);
  assert.equal((await fetch(open.base + '/entry.js', {headers: {'accept-encoding': 'br', 'if-none-match': r.headers.get('etag')}})).status, 304, 'and are revalidated, not re-sent');
  assert.equal(statusOf(await raw(open.port, `GET /..%2fserver.js HTTP/1.1\r\nHost: 127.0.0.1:${open.port}\r\nConnection: close\r\n\r\n`)), 404, 'nothing outside public/ is served');
  assert.match((await fetch(open.base + '/?preview=mobile&chapter=4')).headers.get('content-security-policy') || '', /script-src 'self'/);
  pass('its own address only: a foreign or missing Host is refused before any work; the app page, modules and mobile preview carry a strict Content-Security-Policy, frame and type protections; modules travel compressed with validators');

  // 2. A network-reachable server must know who is asking.
  const refused = await start({}, ['--host', '0.0.0.0']);
  assert.equal(refused.ready, false); assert.match(refused.output(), /Refusing to listen on 0\.0\.0\.0 without local accounts/);
  const trusted = await start({AIW_ALLOW_OPEN_NETWORK: '1'}, ['--host', '0.0.0.0']);
  assert.equal(trusted.ready, true);
  // The warning is written to stderr, which can arrive after the ready line on stdout.
  for (let wait = 0; wait < 40 && !/Warning: listening/.test(trusted.output()); wait += 1) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.match(trusted.output(), /Warning: listening on 0\.0\.0\.0 without local accounts/);
  const accounts = {'architect-a': 'architect-secret-0001', 'steward-b': 'steward-secret-000002'};
  const named = await start({AIW_LOCAL_ACCOUNTS: JSON.stringify(accounts), AIW_ALLOWED_HOSTS: 'workbench.example'}, ['--host', '0.0.0.0']);
  assert.equal(named.ready, true);
  assert.equal(statusOf(await raw(named.port, `GET /local/sign-in HTTP/1.1\r\nHost: workbench.example:${named.port}\r\nConnection: close\r\n\r\n`)), 200, 'a listed host name is served');
  pass('fail closed: beyond loopback the server refuses to start without local accounts unless the operator declares the network trusted; listed host names are served');

  // 3. Sessions end on the server, guessing is throttled, and redirects stay on this site.
  const site = await start({AIW_LOCAL_ACCOUNTS: JSON.stringify(accounts), AIW_TRUST_PROXY: '1'});
  const signIn = (account, secret, next = '/?chapter=1', headers = {}) => fetch(site.base + '/local/sign-in', {method: 'POST', redirect: 'manual', headers: {'Content-Type': 'application/x-www-form-urlencoded', Origin: site.base, ...headers}, body: new URLSearchParams({account, secret, next})});
  r = await signIn('architect-a', accounts['architect-a']);
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  assert.doesNotMatch(r.headers.get('set-cookie'), /Secure/, 'plain loopback cannot carry a Secure cookie');
  assert.equal((await fetch(site.base + '/api/project', {headers: {Cookie: cookie}})).status, 200);
  await fetch(site.base + '/local/sign-out', {redirect: 'manual', headers: {Cookie: cookie}});
  assert.equal((await fetch(site.base + '/api/project', {headers: {Cookie: cookie}})).status, 401, 'a copied cookie stops working at sign-out');
  for (const next of ['//evil.example', '/\\evil.example', '/\tevil.example', '/\t/evil.example', '/\n/evil.example', 'https://evil.example']) {
    assert.equal((await signIn('architect-a', accounts['architect-a'], next)).headers.get('location'), '/', 'no way off this site: ' + JSON.stringify(next));
  }
  assert.equal((await signIn('architect-a', accounts['architect-a'], '/?chapter=4&tab=model')).headers.get('location'), '/?chapter=4&tab=model');
  assert.match((await signIn('architect-a', accounts['architect-a'], '/', {'x-forwarded-proto': 'https'})).headers.get('set-cookie'), /Secure/, 'behind an HTTPS proxy the operator trusts (AIW_TRUST_PROXY=1) the cookie is Secure');
  const tries = [];
  for (let attempt = 0; attempt < 6; attempt += 1) tries.push((await signIn('steward-b', 'not-the-secret-000')).status);
  assert.deepEqual(tries, [401, 401, 401, 401, 401, 429], 'five wrong secrets, then a lock');
  r = await signIn('steward-b', accounts['steward-b']);
  assert.equal(r.status, 429, 'the lock holds even for the right secret'); assert(Number(r.headers.get('retry-after')) > 0);
  assert.match((await fetch(site.base + '/local/sign-in')).headers.get('content-security-policy') || '', /default-src 'none'/);
  for (const event of ['sign-in', 'sign-in-failed', 'sign-in-throttled', 'sign-out']) assert.match(site.output(), new RegExp('"event":"' + event + '"'), 'audited: ' + event);
  pass('sessions: sign-out ends the session on the server; five wrong secrets lock sign-in with Retry-After; post-sign-in redirects stay on this site; cookies are Secure behind a trusted HTTPS proxy; sign-in, failures, locks and sign-out are written to the audit log');

  // 4. A sign-in names its origin (B2-17): Origin, or for a browser that omits it, Sec-Fetch-Site; a proxy header
  // is trusted only when the operator says so.
  const plain = await start({AIW_LOCAL_ACCOUNTS: JSON.stringify(accounts)});
  const signInAt = (server, headers) => fetch(server.base + '/local/sign-in', {method: 'POST', redirect: 'manual', headers: {'Content-Type': 'application/x-www-form-urlencoded', ...headers}, body: new URLSearchParams({account: 'architect-a', secret: accounts['architect-a'], next: '/'})});
  assert.equal((await signInAt(plain, {})).status, 403, 'a form post with neither Origin nor Sec-Fetch-Site is refused');
  assert.equal((await signInAt(plain, {'Sec-Fetch-Site': 'cross-site'})).status, 403, 'a cross-site post is refused');
  assert.equal((await signInAt(plain, {'Sec-Fetch-Site': 'same-origin'})).status, 303, 'a same-origin post without Origin signs in');
  assert.equal((await signInAt(plain, {Origin: 'http://elsewhere.example'})).status, 403);
  r = await signInAt(plain, {Origin: plain.base, 'x-forwarded-proto': 'https'});
  assert.equal(r.status, 303); assert.doesNotMatch(r.headers.get('set-cookie'), /Secure/, 'without AIW_TRUST_PROXY a client-supplied X-Forwarded-Proto does not mark the cookie Secure');
  pass('sign-in origin: a form post must carry this origin (Origin or Sec-Fetch-Site: same-origin); X-Forwarded-Proto is honoured only with AIW_TRUST_PROXY=1');

  // 5. Bodies are bounded before they are buffered (B2-02): a declared Content-Length beyond the route's bound is
  // refused before a byte of the body is read; a streamed body is refused the moment it passes the bound; neither
  // grows the server; a GET that carries a body is answered, not faulted.
  const rss = (pid) => Number(/VmRSS:\s+(\d+)/.exec(readFileSync('/proc/' + pid + '/status', 'utf8'))?.[1] || 0);
  const before = rss(open.child.pid);
  const flood = (port, head, chunked) => new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    let reply = '', written = 0, writtenAtReply = null, done = false;
    const chunk = Buffer.alloc(65536, 0x61);
    const finish = () => { if (!done) { done = true; socket.destroy(); resolve({reply, written: writtenAtReply ?? written}); } };
    const pump = () => { while (!done && written < 60 * 1024 * 1024) { const ok = socket.write(chunked ? Buffer.concat([Buffer.from(chunk.length.toString(16) + '\r\n'), chunk, Buffer.from('\r\n')]) : chunk); written += chunk.length; if (!ok) return socket.once('drain', pump); } };
    socket.on('connect', () => { socket.write(head); pump(); });
    socket.on('data', (d) => { reply += d; if (writtenAtReply === null && /\r\n\r\n/.test(reply)) { writtenAtReply = written; setTimeout(finish, 50); } });
    socket.on('error', finish); socket.on('close', finish);
  });
  let flooded = await flood(open.port, `POST /api/commands HTTP/1.1\r\nHost: 127.0.0.1:${open.port}\r\nOrigin: http://127.0.0.1:${open.port}\r\nContent-Type: application/json\r\nContent-Length: 52428800\r\n\r\n`, false);
  assert.equal(statusOf(flooded.reply), 413, 'a declared 50 MB body is refused: ' + flooded.reply.slice(0, 60));
  assert.match(flooded.reply, /"code":"too_large"/);
  assert(flooded.written < 16 * 1024 * 1024, 'refused before the body was read (client had sent ' + flooded.written + ' bytes of 50 MB when the answer arrived)');
  flooded = await flood(open.port, `POST /api/commands HTTP/1.1\r\nHost: 127.0.0.1:${open.port}\r\nOrigin: http://127.0.0.1:${open.port}\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\n\r\n`, true);
  assert.equal(statusOf(flooded.reply), 413, 'a streamed body is refused once it passes the bound: ' + flooded.reply.slice(0, 60));
  assert(flooded.written < 16 * 1024 * 1024, 'and the stream is cut at the bound, not read to its end (client had sent ' + flooded.written + ' bytes of 60 MB when the answer arrived)');
  const after = rss(open.child.pid);
  assert(after - before < 64 * 1024, 'the server did not buffer the floods (RSS grew ' + (after - before) + ' KB)');
  assert.equal(statusOf(await raw(open.port, `GET /api/project HTTP/1.1\r\nHost: 127.0.0.1:${open.port}\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}`)), 200, 'a GET with a body is served, not faulted');
  assert.equal(statusOf(await raw(open.port, `POST /api/projects HTTP/1.1\r\nHost: 127.0.0.1:${open.port}\r\nOrigin: http://127.0.0.1:${open.port}\r\nContent-Type: application/json\r\nContent-Length: 140000\r\nConnection: close\r\n\r\n{}`)), 413, 'each route has its own bound');
  pass('bounded bodies: a 50 MB declared body and a 60 MB streamed body to /api/commands are refused with 413 before being read, the server does not grow, a GET with a body is served, and bounds are per route');

  // 6. Health, request ids and API compression (B2-10, B2-13).
  r = await fetch(open.base + '/api/health');
  assert.equal(r.status, 200); const health = await r.json();
  assert.equal(health.status, 'ok'); assert.equal(health.checks.database, 'ok'); assert.equal(health.checks.files, 'ok');
  assert.match(health.release, /^AIW v0\.10\.0-rc\.10\./, 'the release notation is reported');
  assert.equal(typeof health.provider.configured, 'boolean'); assert.match(r.headers.get('x-request-id') || '', /^[0-9a-f-]{36}$/);
  assert.equal((await fetch(site.base + '/api/health')).status, 200, 'health needs no sign-in');
  r = await fetch(open.base + '/api/project', {headers: {'accept-encoding': 'gzip'}});
  assert.equal(r.headers.get('content-encoding'), 'gzip', 'API JSON travels compressed when accepted');
  assert.match(r.headers.get('vary') || '', /Accept-Encoding/);
  const project = await r.json(); assert(project.document?.artefacts?.length > 0, 'and decodes to the project');
  const identity = await raw(open.port, `GET /api/project HTTP/1.1\r\nHost: 127.0.0.1:${open.port}\r\nConnection: close\r\n\r\n`);
  assert.doesNotMatch(identity.split('\r\n\r\n')[0], /content-encoding/i, 'and uncompressed when not accepted');
  const compressedBytes = Number(/content-length: (\d+)/i.exec((await raw(open.port, `GET /api/project HTTP/1.1\r\nHost: 127.0.0.1:${open.port}\r\nAccept-Encoding: gzip\r\nConnection: close\r\n\r\n`)).split('\r\n\r\n')[0])?.[1]);
  assert(compressedBytes > 0 && compressedBytes < identity.length / 3, 'compressed to under a third (' + compressedBytes + ' of ' + identity.length + ')');
  // The compressed static cache is bounded by bytes: with a 1 MB bound, fetching every client module keeps at most
  // 1 MB of compressed variants and evicts the least recently used.
  const bounded = await start({AIW_STATIC_CACHE_BYTES: String(1024 * 1024)});
  const modules = readdirSync('public').filter((f) => /\.(?:js|css)$/.test(f));
  let fetched = 0;
  for (const file of modules) { const got = await fetch(bounded.base + '/' + file, {headers: {'accept-encoding': 'br'}}); if (got.headers.get('content-encoding') === 'br') fetched++; await got.arrayBuffer(); }
  const cache = (await (await fetch(bounded.base + '/api/health')).json()).staticCache;
  assert.equal(cache.limit, 1024 * 1024); assert(cache.bytes <= cache.limit, 'the cache stays within its bound: ' + JSON.stringify(cache));
  assert(fetched > 50 && cache.entries > 0 && cache.entries < fetched, 'older variants were evicted (' + cache.entries + ' kept of ' + fetched + ' compressed)');
  pass('health and transport: GET /api/health reports database, files, release and provider configuration without sign-in; every answer carries X-Request-Id; API JSON is gzip-compressed when accepted and sent as is otherwise; the compressed static cache stays within AIW_STATIC_CACHE_BYTES');

  // 7. Every setting is documented (B2-14): .env.example is rendered from settings.js, and every AIW_* variable the
  // backend and scripts read appears in the table.
  assert.equal(readFileSync('.env.example', 'utf8'), renderEnvExample(), '.env.example matches settings.js (node scripts/env-example.mjs)');
  // A variable is read as env.NAME, or by its name through a helper (setting(env, 'NAME'), read('NAME'), round 23 M-11);
  // a row whose name holds a placeholder (<NAME>, <MODE>) documents the variables its pattern matches.
  const documented = new Set(SETTINGS.map((s) => s.name)), patterns = SETTINGS.filter((s) => s.pattern).map((s) => new RegExp(s.pattern)), read = new Set(), internal = new Set(['AIW_RESOLVE_HOST', 'AIW_KNOWN_ACTORS']);
  for (const file of [...readdirSync('.').filter((f) => /\.(?:js|mjs)$/.test(f)), ...readdirSync('scripts').filter((f) => /\.mjs$/.test(f)).map((f) => 'scripts/' + f)]) for (const m of readFileSync(file, 'utf8').matchAll(/(?:process\.env|\benv)\.(AIW_[A-Z0-9_]+)|\b(?:setting|read)\(\s*(?:env\s*,\s*)?'(AIW_[A-Z0-9_]+)'\s*\)/g)) read.add(m[1] || m[2]);
  assert.ok(['AIW_LLM_PROVIDERS', 'AIW_LLM_FALLBACK', 'AIW_LLM_ROUTE_DRAFT'].every((name) => read.has(name)), 'the helper reads are seen');
  assert.ok(patterns.some((re) => re.test('AIW_LLM_BACKUP_DAILY_TOKENS')) && patterns.some((re) => re.test('AIW_LLM_ROUTE_ARCHITECTURE_CHECK')), 'a provider\'s and a route\'s variables are documented by their pattern');
  const undocumented = [...read].filter((name) => !documented.has(name) && !internal.has(name) && !patterns.some((re) => re.test(name)));
  assert.deepEqual(undocumented, [], 'every AIW_* setting read by the code is in settings.js');
  pass('settings: .env.example is rendered from the settings table and every AIW_* variable the code reads is documented there');

  // 8. Both stores follow the database file (B2-07), and an orderly stop (B2-10).
  const home = mkdtempSync(path.join(tmpdir(), 'aiw-store-'));
  const moved = await start({AIW_LOCAL_DB: path.join(home, 'store', 'project.sqlite')});
  assert.equal(moved.ready, true, 'the database directory is created');
  const opened = await (await fetch(moved.base + '/api/project')).json();
  const requirement = opened.document.artefacts.find((a) => a.type === 'requirement');
  r = await fetch(moved.base + '/api/commands', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: moved.base}, body: JSON.stringify({revision: opened.revision, command: {type: 'artefact', payload: {...requirement, title: requirement.title + ' (moved store)'}}})});
  assert.equal(r.status, 200, await r.text());
  assert(existsSync(path.join(home, 'store', 'baselines')) && readdirSync(path.join(home, 'store', 'baselines')).length > 0, 'objects are written beside the database file');
  assert(!existsSync(path.join(home, '.aiw-local')), 'nothing is written under the working directory for that database');
  const stopped = new Promise((resolve) => moved.child.on('exit', (code, signal) => resolve({code, signal})));
  moved.child.kill('SIGTERM');
  const exit = await Promise.race([stopped, new Promise((resolve) => setTimeout(() => resolve({code: 'timeout'}), 8000))]);
  assert.equal(exit.code, 0, 'SIGTERM stops the server cleanly: ' + JSON.stringify(exit));
  assert.match(moved.output(), /"event":"shutdown"/, 'the stop is logged as one JSON line');
  const again = await start({AIW_LOCAL_DB: path.join(home, 'store', 'project.sqlite')});
  const reread = await (await fetch(again.base + '/api/project')).json();
  assert.equal(reread.document.artefacts.find((a) => a.id === requirement.id).title, requirement.title + ' (moved store)', 'a restart on the same database finds its objects: database and object directory are one backup unit');
  assert.equal(reread.document.changes.events.length, 1, 'including the change journal');
  // Half a backup: the database without its object directory. The server refuses to start and names the directory.
  const stoppedAgain = new Promise((resolve) => again.child.on('exit', resolve));
  again.child.kill('SIGTERM'); await stoppedAgain;
  renameSync(path.join(home, 'store', 'baselines'), path.join(home, 'store', 'objects-elsewhere'));
  const half = await start({AIW_LOCAL_DB: path.join(home, 'store', 'project.sqlite')});
  assert.equal(half.ready, false, 'a database whose objects are missing does not start');
  assert.equal(await new Promise((resolve) => half.child.exitCode !== null ? resolve(half.child.exitCode) : half.child.on('exit', resolve)), 1);
  assert.match(half.output(), /object directory .*baselines does not exist[\s\S]*AIW_LOCAL_FILES/, 'and says which directory is missing');
  assert(!existsSync(path.join(home, 'store', 'baselines')), 'no empty directory is created in its place');
  const pointed = await start({AIW_LOCAL_DB: path.join(home, 'store', 'project.sqlite'), AIW_LOCAL_FILES: path.join(home, 'store', 'objects-elsewhere')});
  assert.equal(pointed.ready, true);
  assert.equal((await (await fetch(pointed.base + '/api/project')).json()).document.changes.events.length, 1, 'AIW_LOCAL_FILES names the directory that holds the objects');
  rmSync(home, {recursive: true, force: true});
  pass('stores and stop: AIW_LOCAL_DB moves the object directory with the database file, SIGTERM exits 0 after an audited orderly stop, the restarted server reads the project and its journal from both stores, a database without its object directory refuses to start, and AIW_LOCAL_FILES points it at the right one');
} finally {
  for (const server of started) {
    server.child.kill();
    for (const suffix of ['', '-wal', '-shm']) try { rmSync(server.db + suffix, {force: true}); } catch { /* best effort */ }
  }
}
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
