import http from 'node:http';
import net from 'node:net';
import {lookup as dnsLookup} from 'node:dns/promises';
import {gzipSync, brotliCompressSync, gzip, brotliCompress, constants as zlibConstants} from 'node:zlib';
import {promisify} from 'node:util';
import {readFile, access, mkdir} from 'node:fs/promises';
import {constants as fsConstants, existsSync, realpathSync} from 'node:fs';
import {createHash, createHmac, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import worker from './worker.js';
import {intelligenceStatus, providers as providerRegistry} from './intelligence-provider.js';
import {localFiles} from './local-files.js';
import {APP_SECURITY_HEADERS, SIGN_IN_SECURITY_HEADERS, isCompressible} from './security-headers.js';
import {auditEvent, errorEvent} from './audit-log.js';
import {runRetention, retentionPolicy, retentionChanged} from './retention.js';
import {processDraftingQueue} from './drafting-service.js';
import {exportService, readService} from './export-thread.js';

// Node.js gate (audit B-10): the local database uses node:sqlite, available without a flag from Node 22.13
// and 23.4, so it is loaded only after this check. The workbench is developed and released on Node 24.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13) || (nodeMajor === 23 && nodeMinor < 4)) {
  console.error(`AIW needs Node.js 22.13 or later, and Node.js 24 is recommended; this is ${process.versions.node}. Install Node.js 24 from https://nodejs.org and start again.`);
  process.exit(1);
}
// node:sqlite announces itself as experimental on every start (round 2, B2-22). That one notice is known and recorded
// here; every other warning still reaches the log, so it no longer hides among identical lines.
const emitWarning = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  const type = typeof rest[0] === 'string' ? rest[0] : rest[0]?.type;
  if (type === 'ExperimentalWarning' && /SQLite is an experimental feature/.test(String(warning?.message ?? warning))) return;
  return emitWarning.call(process, warning, ...rest);
};
const {localDatabase} = await import('./local-db.js');

const args = process.argv.slice(2);
const argument = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const port = Number(argument('--port')) || Number(process.env.PORT) || 4173;
// Loopback only by default: without local accounts every request is served as the single development
// architect, so a network-reachable server would let anyone on the network edit projects and use the AI key.
const host = argument('--host') || process.env.AIW_HOST || '127.0.0.1';
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', 'localhost']);
const loopbackOnly = LOOPBACK_ADDRESSES.has(host);
const RELEASE = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')).release || 'AIW v0.10.0-rc.10.73.6';

// Local accounts (opt-in). AIW_LOCAL_ACCOUNTS is a JSON object of account ID → secret of at least 16
// characters. Each person signs in with their own secret and every request carries that identity, so a
// claim can pass four eyes on one machine. Without it, every request is the single development architect,
// as before. Two accounts are two people only when two different people hold them.
const ACCOUNTS = (() => {
  const raw = process.env.AIW_LOCAL_ACCOUNTS;
  if (!raw) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw Error('AIW_LOCAL_ACCOUNTS must be a JSON object of account ID → secret.'); }
  const entries = Object.entries(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
  if (!entries.length || entries.some(([id, secret]) => !/^[A-Za-z0-9_@.\-]{1,180}$/.test(id) || typeof secret !== 'string' || secret.length < 16)) {
    throw Error('Each local account needs an ID of letters, digits and _ @ . - and a secret of at least 16 characters.');
  }
  return new Map(entries);
})();
// Agent and service accounts (round 12, D-06, GR-GOV-12). AIW_AGENT_ACCOUNTS names, comma-separated, the local accounts
// a program signs in with (a drafting agent, an import job) rather than a person. Such an account never writes as a
// person, and never reviews, confirms, accepts or approves: it can never be one of four eyes. Each must be a local
// account of this workbench.
const AGENT_ACCOUNTS = (() => {
  const ids = String(process.env.AIW_AGENT_ACCOUNTS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = ids.filter((id) => !ACCOUNTS?.has(id));
  if (unknown.length) throw Error(`AIW_AGENT_ACCOUNTS names ${unknown.join(', ')}, which ${unknown.length === 1 ? 'is not a local account' : 'are not local accounts'} of this workbench (AIW_LOCAL_ACCOUNTS).`);
  return ids;
})();

// The provider keys this server holds, named in the warnings below (never their values).
const providerKey = [process.env.ANTHROPIC_API_KEY ? 'Anthropic' : '', process.env.OPENAI_API_KEY ? 'OpenAI' : ''].filter(Boolean).join(' and ');

// Fail closed: a server reachable from other machines must know who is asking. Without accounts it
// would serve everyone as the development architect, so it refuses to start unless the operator says,
// in so many words, that the network is trusted.
if (!loopbackOnly && !ACCOUNTS && process.env.AIW_ALLOW_OPEN_NETWORK !== '1') {
  console.error(`Refusing to listen on ${host} without local accounts: anyone who could reach it would open and change your projects as the local architect${providerKey ? ' and use your ' + providerKey + ' key' : ''}. Add AIW_LOCAL_ACCOUNTS (see LOCAL-RUN.md), or set AIW_ALLOW_OPEN_NETWORK=1 only on a network you fully trust.`);
  process.exit(1);
}

// The browser client: the source modules in public/ by default, or a production bundle built by
// `npm run build` (npm run start:production serves dist/client).
const clientDirectory = argument('--client') || process.env.AIW_CLIENT_DIR || 'public';
const root = path.resolve(clientDirectory);
// Both stores move together (round 2, B2-07): the object directory defaults to "baselines" beside the database
// file, so AIW_LOCAL_DB relocates everything and a backup is that file plus that directory. AIW_LOCAL_FILES
// names another directory explicitly.
const databaseFile = process.env.AIW_LOCAL_DB || '.aiw-local/project.sqlite';
const filesDirectory = process.env.AIW_LOCAL_FILES || path.join(path.dirname(databaseFile), 'baselines');
const DB = localDatabase(databaseFile);
// A database whose projects reference stored objects, opened without its object directory, is half a backup (or
// AIW_LOCAL_FILES points elsewhere): every such project would answer with an integrity error. Refuse to start and
// say which directory is missing, rather than create an empty one and serve broken projects.
if (!existsSync(filesDirectory) && await DB.prepare(`SELECT 1 AS found FROM projects WHERE document LIKE '%"storageKey"%' OR document LIKE '%"segments"%' OR document LIKE '%"requirementsStorage"%' LIMIT 1`).bind().first()) {
  console.error(`The database ${databaseFile} references stored objects, but the object directory ${filesDirectory} does not exist. Restore the database and its object directory together, or set AIW_LOCAL_FILES to the directory that holds its objects (before round 2, AIW_LOCAL_DB kept them in .aiw-local/baselines under the working directory).`);
  DB.close();
  process.exit(1);
}
await mkdir(filesDirectory, {recursive: true});
const FILES = localFiles(filesDirectory);
// The laptop knowledge repository service: its token may be read from the service's own token file.
const repositoryToken = process.env.AIW_KNOWLEDGE_REPOSITORY_TOKEN || (process.env.AIW_KNOWLEDGE_REPOSITORY_TOKEN_FILE ? (await readFile(process.env.AIW_KNOWLEDGE_REPOSITORY_TOKEN_FILE, 'utf8').catch(() => '')).trim() : '');

// DNS rebinding defence. A hostile page can make a browser send requests to this server under the
// page's own domain name, so the server's own origin must never be taken from an unchecked Host header.
// An IP literal cannot be re-pointed by DNS; a name is accepted only if it is localhost or listed in
// AIW_ALLOWED_HOSTS. The repository service applies the same rule (repository-service/server.js).
const allowedHostNames = new Set(['localhost', ...(process.env.AIW_ALLOWED_HOSTS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)]);
export function hostAllowed(value) {
  if (typeof value !== 'string' || !value) return false;
  let name;
  try { name = new URL('http://' + value).hostname.toLowerCase(); } catch { return false; }
  if (name.startsWith('[') && name.endsWith(']')) name = name.slice(1, -1);
  return net.isIP(name) !== 0 || allowedHostNames.has(name);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

// Static files are revalidated, never re-downloaded unchanged: an ETag from the bytes, and no-cache so
// each navigation asks before reusing what the browser holds. Text assets are compressed once and kept
// in memory (brotli, else gzip), which cuts a chapter's module transfer by roughly three quarters. The
// cache is bounded by bytes (round 2, B2-10): the least recently used variants go first.
const STATIC_CACHE_BYTES = Math.max(1 << 20, Number(process.env.AIW_STATIC_CACHE_BYTES) || 64 * 1024 * 1024);
const compressedCache = new Map();
let compressedCacheBytes = 0;
export function cacheCompressed(key, body) {
  const held = compressedCache.get(key);
  if (held) { compressedCache.delete(key); compressedCacheBytes -= held.length; }
  compressedCache.set(key, body);
  compressedCacheBytes += body.length;
  for (const [oldest, bytes] of compressedCache) {
    if (compressedCacheBytes <= STATIC_CACHE_BYTES) break;
    compressedCache.delete(oldest); compressedCacheBytes -= bytes.length;
  }
}
export const staticCacheState = () => ({entries: compressedCache.size, bytes: compressedCacheBytes, limit: STATIC_CACHE_BYTES});
function compressedVariant(file, data, etag, acceptEncoding) {
  const encoding = /\bbr\b/.test(acceptEncoding) ? 'br' : /\bgzip\b/.test(acceptEncoding) ? 'gzip' : null;
  if (!encoding) return null;
  const key = `${file}|${etag}|${encoding}`;
  let body = compressedCache.get(key);
  if (body) { compressedCache.delete(key); compressedCache.set(key, body); } // most recently used last
  else {
    body = encoding === 'br'
      ? brotliCompressSync(data, {params: {[zlibConstants.BROTLI_PARAM_QUALITY]: 5}})
      : gzipSync(data, {level: 6});
    cacheCompressed(key, body);
  }
  return {encoding, body};
}

const mobilePreviewPage = (url) => {
  const chapter = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].includes(url.searchParams.get('chapter')) ? url.searchParams.get('chapter') : '1';
  const source = '/?chapter=' + chapter
    + '&project=' + encodeURIComponent(url.searchParams.get('project') || 'bank-payment')
    + '&tab=' + encodeURIComponent(url.searchParams.get('tab') || 'work')
    + '&view=' + encodeURIComponent(url.searchParams.get('view') || '')
    + '&preview=frame';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mobile chapter preview · AIW V5</title><link rel="icon" href="data:,"></head><body style="margin:0;background:#dbe3d4"><iframe title="Mobile chapter preview" src="'
    + source + '" style="display:block;width:390px;height:844px;border:0;margin:16px auto"></iframe></body></html>';
};

const ASSETS = {async fetch(req) {
  const url = new URL(req.url);
  try {
    if (url.searchParams.get('preview') === 'mobile') {
      return new Response(mobilePreviewPage(url), {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ...APP_SECURITY_HEADERS}});
    }
    const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!file.startsWith(root + path.sep)) throw Error();
    const data = await readFile(file);
    const etag = createHash('sha256').update(data).digest('base64url').slice(0, 27);
    const variant = isCompressible(file) ? compressedVariant(file, data, etag, req.headers.get('accept-encoding') || '') : null;
    const tag = '"' + etag + (variant ? '-' + variant.encoding : '') + '"';
    // Content-hashed bundle files never change under their name; everything else is revalidated.
    const immutable = clientDirectory !== 'public' && url.pathname.startsWith('/assets/');
    const headers = {'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache', ETag: tag, Vary: 'Accept-Encoding', ...APP_SECURITY_HEADERS};
    if (req.headers.get('if-none-match') === tag) return new Response(null, {status: 304, headers});
    return new Response(variant ? variant.body : data, {headers: {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      ...(variant ? {'Content-Encoding': variant.encoding} : {}),
      ...headers,
    }});
  } catch {
    return new Response('Not found', {status: 404, headers: {'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff'}});
  }
}};

// Sessions. The cookie is signed, and it also names a server-side session, so signing out (or a
// revocation) ends it at once rather than when the signature expires. Sessions end when the server
// restarts, because the signing key and the session list live in memory.
const SESSION_KEY = randomBytes(32);
const SESSION_SECONDS = 12 * 3600;
const COOKIE = 'aiw_local';
const SESSIONS = new Map();
const sha256 = (value) => createHash('sha256').update(value).digest();
const mac = (payload) => createHmac('sha256', SESSION_KEY).update(payload).digest();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

function pruneSessions(now = Date.now()) {
  for (const [sid, session] of SESSIONS) if (!(session.expires > now)) SESSIONS.delete(sid);
}
function issueSession(id) {
  pruneSessions();
  const sid = randomBytes(18).toString('base64url');
  const expires = Date.now() + SESSION_SECONDS * 1000;
  SESSIONS.set(sid, {id, expires});
  const payload = [Buffer.from(id).toString('base64url'), expires, sid].join('.');
  return payload + '.' + mac(payload).toString('base64url');
}
function readSession(cookie) {
  const match = new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)').exec(cookie || '');
  if (!match) return null;
  const [id64, expires, sid, signature] = match[1].split('.');
  if (!id64 || !expires || !sid || !signature) return null;
  const given = Buffer.from(signature, 'base64url');
  const good = mac([id64, expires, sid].join('.'));
  if (given.length !== good.length || !timingSafeEqual(given, good) || !(Number(expires) > Date.now())) return null;
  const id = Buffer.from(id64, 'base64url').toString('utf8');
  const session = SESSIONS.get(sid);
  if (!session || session.id !== id || !ACCOUNTS?.has(id)) return null;
  return {id, sid};
}

// Every sign-in attempt does the same work whether or not the account exists, so response time does
// not reveal account IDs.
const SECRET_DIGESTS = ACCOUNTS ? new Map([...ACCOUNTS].map(([id, secret]) => [id, sha256(secret)])) : new Map();
const UNKNOWN_ACCOUNT_DIGEST = sha256(randomBytes(32));
function secretMatches(id, secret) {
  const expected = SECRET_DIGESTS.get(id) || UNKNOWN_ACCOUNT_DIGEST;
  const matches = timingSafeEqual(sha256(typeof secret === 'string' ? secret : ''), expected);
  return matches && SECRET_DIGESTS.has(id);
}

// Brute-force throttling per account and per client address: after five failures, each further
// failure locks sign-in for that account or address for a doubling period, up to 15 minutes.
const FAILURES = new Map();
const LOCK_AFTER = 5;
const MAX_LOCK_SECONDS = 900;
function lockedFor(keys, now = Date.now()) {
  let seconds = 0;
  for (const key of keys) {
    const failure = FAILURES.get(key);
    if (failure && failure.until > now) seconds = Math.max(seconds, Math.ceil((failure.until - now) / 1000));
  }
  return seconds;
}
function recordFailure(keys, now = Date.now()) {
  for (const key of keys) {
    const failure = FAILURES.get(key) || {count: 0, until: 0};
    failure.count += 1;
    if (failure.count >= LOCK_AFTER) failure.until = now + Math.min(MAX_LOCK_SECONDS, 2 ** (failure.count - LOCK_AFTER)) * 1000;
    FAILURES.set(key, failure);
  }
  if (FAILURES.size > 10000) for (const [key, failure] of FAILURES) if (failure.until < now) FAILURES.delete(key);
}

// A post-sign-in destination must be a path on this site: one leading slash, no second slash or
// backslash after it, and no whitespace or control characters a browser might strip into "//host".
const sameSitePath = (value) => typeof value === 'string' && /^\/(?![\/\\])[^\s\\\u0000-\u001f\u007f]*$/.test(value) ? value : '/';
// The cookie is Secure when the operator says the workbench is only served over HTTPS, or when a proxy the
// operator trusts (AIW_TRUST_PROXY=1, round 2, B2-17) says this request arrived over HTTPS. Without that
// declaration a client-supplied X-Forwarded-Proto is ignored: a spoofed header must not drop the cookie.
const trustProxy = process.env.AIW_TRUST_PROXY === '1';
const secureCookie = (req) => process.env.AIW_COOKIE_SECURE === '1' || (trustProxy && req.headers['x-forwarded-proto'] === 'https');
const cookieAttributes = (req, maxAge) => `HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookie(req) ? '; Secure' : ''}`;
const audit = auditEvent;
const ownOrigin = (req) => ['http://' + req.headers.host, 'https://' + req.headers.host];

function signInPage(res, {status = 200, message = '', current = '', next = '/', retryAfter = 0} = {}) {
  res.writeHead(status, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SIGN_IN_SECURITY_HEADERS, ...(retryAfter ? {'Retry-After': String(retryAfter)} : {})});
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · AIW local workbench</title><style>body{font:15px/1.5 system-ui,sans-serif;max-width:26rem;margin:4rem auto;padding:0 16px;color:#1d2a24;background:#f7f5ef}label{display:block;margin:.8rem 0 .2rem}input{width:100%;padding:.5rem;font:inherit;box-sizing:border-box}button{margin-top:1rem;padding:.5rem 1rem;font:inherit}.m{color:#8a2d1c}.n{color:#55635b;font-size:13px}</style></head><body><h1>Sign in to this workbench</h1>${current ? `<p>Signed in as <b>${esc(current)}</b>. <a href="/local/sign-out">Sign out</a> to switch accounts.</p>` : ''}${message ? `<p class="m" role="alert">${esc(message)}</p>` : ''}<form method="post" action="/local/sign-in"><input type="hidden" name="next" value="${esc(next)}"><label for="account">Account</label><input id="account" name="account" autocomplete="username" required><label for="secret">Secret</label><input id="secret" name="secret" type="password" autocomplete="current-password" required><button type="submit">Sign in</button></form><p class="n">Each person signs in with their own account from this workbench's settings. A claim's author cannot verify it: a second person signs in with their own account to review it.</p></body></html>`);
}

// Request bodies (round 2, B2-02). Nothing is buffered before the Host, route and session checks have passed, a
// declared Content-Length beyond the route's bound is refused before a byte is read, and a streamed body is
// refused and the connection closed the moment it passes the bound. The bounds sit just above what each route's
// own validation accepts (the Worker's character and byte limits remain the authority within them).
const MiB = 1024 * 1024;
export const BODY_LIMITS = [
  [/^\/api\/commands$/, 1500000],
  [/^\/api\/projects$/, 131072], // a 20,000-character brief in any script, with its file description
  [/^\/api\/(recovery|intake|attachments)$/, 12 * MiB + 64 * 1024],
  [/^\/api\/knowledge\/repository-packet$/, 8000000 + 64 * 1024],
  [/^\/api\/knowledge\/repository-sync$/, 256000 + 4096],
  [/^\/api\/intelligence\//, 160000],
  [/^\/api\/(operations|connections|jobs)$/, 200000],
  [/^\/api\/organizations$/, 400000],
  [/^\/local\/sign-in$/, 8192],
];
export const DEFAULT_API_BODY_LIMIT = 1 * MiB;
export function bodyLimit(pathname) {
  for (const [pattern, limit] of BODY_LIMITS) if (pattern.test(pathname)) return limit;
  return pathname.startsWith('/api/') ? DEFAULT_API_BODY_LIMIT : 0;
}
const BODYLESS = new Set(['GET', 'HEAD', 'OPTIONS']);
const LINGER_MS = 1500, LINGER_BYTES = MiB;
function refuseBody(req, res, url, limit) {
  const api = url.pathname.startsWith('/api/');
  const message = `This request exceeds the ${limit >= MiB ? Math.round(limit / MiB) + ' MB' : Math.round(limit / 1024) + ' KB'} limit for ${url.pathname}.`;
  // No "Connection: close": with it Node closes the socket as soon as the answer is written, and closing with unread
  // request bytes is a TCP reset that can discard the answer at a client still uploading. Instead a lingering close:
  // what follows is discarded as it arrives, never buffered, up to LINGER_BYTES; then reading stops, so the client
  // cannot push the rest of its body; and after LINGER_MS the connection is closed whether or not it has finished.
  res.writeHead(413, {'Content-Type': api ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store'});
  res.end(api ? JSON.stringify({error: message, code: 'too_large'}) : message);
  let discarded = 0;
  req.on('data', (chunk) => { discarded += chunk.length; if (discarded >= LINGER_BYTES) req.pause(); });
  const linger = setTimeout(() => req.destroy(), LINGER_MS);
  linger.unref();
  req.once('close', () => clearTimeout(linger));
}
// Listeners rather than `for await`: leaving an async iterator early destroys the socket, and the 413 would be lost
// to the reset. Resolves with the body, or null once the request has been answered (or the client has gone).
function readBody(req, res, url) {
  const limit = bodyLimit(url.pathname);
  const declared = req.headers['content-length'] === undefined ? null : Number(req.headers['content-length']);
  if (declared !== null && declared > limit) { refuseBody(req, res, url, limit); return Promise.resolve(null); }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0, settled = false;
    const settle = (fn, value) => { if (settled) return; settled = true; req.off('data', onData); req.off('end', onEnd); req.off('error', onError); req.off('close', onClose); fn(value); };
    const onData = (chunk) => {
      total += chunk.length;
      if (total > limit) { settle(resolve, null); refuseBody(req, res, url, limit); return; }
      chunks.push(chunk);
    };
    const onEnd = () => settle(resolve, Buffer.concat(chunks, total));
    const onError = (e) => settle(reject, e);
    const onClose = () => settle(resolve, null); // the client went away before the body ended: nothing to answer
    req.on('data', onData); req.on('end', onEnd); req.on('error', onError); req.on('close', onClose);
  });
}

// Sign-in and sign-out pages, and whose request this is. Returns the account, or null once it has answered.
// The sign-in form is the only route that reads a body before the session is known, bounded to 8 KB.
async function localAccount(req, res, url) {
  const session = readSession(req.headers.cookie);
  const current = session?.id || '';
  if (url.pathname === '/local/sign-in' && req.method === 'GET') { signInPage(res, {current, next: sameSitePath(url.searchParams.get('next'))}); return null; }
  if (url.pathname === '/local/sign-in' && req.method === 'POST') {
    // A sign-in must come from this workbench's own page: the browser's Origin, or for a browser that omits it,
    // its Sec-Fetch-Site. A form post that names neither is refused (round 2, B2-17).
    const origin = req.headers.origin, fetchSite = req.headers['sec-fetch-site'];
    if (origin ? !ownOrigin(req).includes(origin) : fetchSite !== 'same-origin') {
      res.writeHead(403, {'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff'}); res.end('Sign in from this workbench.'); return null;
    }
    const body = await readBody(req, res, url);
    if (body === null) return null;
    const form = new URLSearchParams(body.toString('utf8'));
    const id = form.get('account') || '';
    const next = sameSitePath(form.get('next'));
    const keys = ['account:' + id.toLowerCase(), 'address:' + (req.socket.remoteAddress || '')];
    const wait = lockedFor(keys);
    if (wait) {
      audit('sign-in-throttled', {account: id.slice(0, 180), address: req.socket.remoteAddress, retryAfterSeconds: wait});
      signInPage(res, {status: 429, message: `Too many unsuccessful attempts. Try again in ${wait} seconds.`, next, retryAfter: wait}); return null;
    }
    if (!secretMatches(id, form.get('secret') || '')) {
      recordFailure(keys);
      audit('sign-in-failed', {account: id.slice(0, 180), address: req.socket.remoteAddress});
      await new Promise((resolve) => setTimeout(resolve, 250));
      signInPage(res, {status: 401, message: 'That account and secret do not match.', next}); return null;
    }
    for (const key of keys) FAILURES.delete(key);
    if (session) SESSIONS.delete(session.sid);
    audit('sign-in', {account: id, address: req.socket.remoteAddress});
    res.writeHead(303, {Location: next, 'Set-Cookie': `${COOKIE}=${issueSession(id)}; ${cookieAttributes(req, SESSION_SECONDS)}`, 'Cache-Control': 'no-store'}); res.end(); return null;
  }
  if (url.pathname === '/local/sign-out') {
    if (session) { SESSIONS.delete(session.sid); audit('sign-out', {account: session.id, address: req.socket.remoteAddress}); }
    res.writeHead(303, {Location: '/local/sign-in', 'Set-Cookie': `${COOKIE}=; ${cookieAttributes(req, 0)}`, 'Cache-Control': 'no-store'}); res.end(); return null;
  }
  if (current) return current;
  if (url.pathname.startsWith('/api/')) { res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff'}); res.end(JSON.stringify({error: 'Sign in to this workbench first.', signIn: '/local/sign-in'})); return null; }
  if (req.method === 'GET') { res.writeHead(303, {Location: '/local/sign-in?next=' + encodeURIComponent(url.pathname + url.search), 'Cache-Control': 'no-store'}); res.end(); return null; }
  res.writeHead(401, {'Content-Type': 'text/plain; charset=utf-8'}); res.end('Sign in to this workbench first.'); return null;
}

// Liveness and readiness for a supervisor (round 2, B2-10): the database answers, the object directory is
// writable. It needs no sign-in and names no secret; the provider flag says whether Sol is configured.
const startedAt = Date.now();
async function healthResponse(res) {
  const checks = {};
  try { checks.database = (await DB.prepare('SELECT 1 AS ok').bind().first())?.ok === 1 ? 'ok' : 'failed'; } catch { checks.database = 'failed'; }
  try { await access(filesDirectory, fsConstants.W_OK); checks.files = 'ok'; } catch { checks.files = 'failed'; }
  const ok = Object.values(checks).every((value) => value === 'ok');
  res.writeHead(ok ? 200 : 503, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
  res.end(JSON.stringify({status: ok ? 'ok' : 'degraded', release: RELEASE, uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), checks, accounts: !!ACCOUNTS, provider: {configured: intelligenceStatus(WORKER_ENV).configured}, staticCache: staticCacheState()}));
}

// API answers are compressed on the way out when the client accepts it (round 2, B2-13): the project document is
// a quarter-megabyte of JSON that gzip cuts to a tenth. Static files keep their own cached variants above. The
// compression runs off the main loop (round 12: a large design's project or SDD is tens of megabytes, which took
// seconds to compress while nothing else was answered); the bytes are the same.
const COMPRESSIBLE_RESPONSE = /^(?:application\/json|text\/)/;
const gzipAsync = promisify(gzip), brotliAsync = promisify(brotliCompress);
async function compressResponse(req, headers, payload) {
  if (payload.length < 1024 || headers['content-encoding'] || req.method === 'HEAD' || !COMPRESSIBLE_RESPONSE.test(headers['content-type'] || '')) return payload;
  const accept = req.headers['accept-encoding'] || '';
  const encoding = /\bgzip\b/.test(accept) ? 'gzip' : /\bbr\b/.test(accept) ? 'br' : null;
  if (!encoding) return payload;
  const body = encoding === 'gzip' ? await gzipAsync(payload, {level: 5}) : await brotliAsync(payload, {params: {[zlibConstants.BROTLI_PARAM_QUALITY]: 4, [zlibConstants.BROTLI_PARAM_SIZE_HINT]: payload.length}});
  headers['content-encoding'] = encoding;
  headers.vary = headers.vary ? headers.vary + ', Accept-Encoding' : 'Accept-Encoding';
  delete headers['content-length'];
  return body;
}

// Work a route starts after it has answered (round 12: Sol's drafting jobs, drafting-service.js), the Worker's
// ctx.waitUntil for that route: a set of the tasks still running. The local scheduler below also advances queued
// jobs, including after restart, without any open browser.
const pendingWork = new Set();
const BACKGROUND = {waitUntil(task) { const t = Promise.resolve(task).catch(e => errorEvent('background-error', e, {})).finally(() => pendingWork.delete(t)); pendingWork.add(t); }};
const WORKER_ENV = {
  DB, FILES, ASSETS, AIW_BACKGROUND: BACKGROUND,
  // Sol's provider settings (settings.js): the two keys and every AIW_LLM_* variable — the default provider's choice,
  // model, effort, refusal fallback, gateways, price table and per-call timer, and (round 12, M) the registry of
  // further providers (AIW_LLM_PROVIDERS, AIW_LLM_<NAME>_*), the route of each mode (AIW_LLM_ROUTE_*) and the
  // fallback chain (AIW_LLM_FALLBACK). A provider's key is among them (AIW_LLM_<NAME>_API_KEY): server-side only.
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AIW_ANTHROPIC_BASE_URL: process.env.AIW_ANTHROPIC_BASE_URL,
  ...Object.fromEntries(Object.entries(process.env).filter(([k, v]) => k.startsWith('AIW_LLM_') && typeof v === 'string')),
  AIW_REPOSITORY_SYNC_KEYS: process.env.AIW_REPOSITORY_SYNC_KEYS,
  AIW_REPOSITORY_NOTICE_KEYS: process.env.AIW_REPOSITORY_NOTICE_KEYS,
  AIW_KNOWLEDGE_REPOSITORY_URL: process.env.AIW_KNOWLEDGE_REPOSITORY_URL,
  AIW_KNOWLEDGE_REPOSITORY_TOKEN: repositoryToken,
  AIW_REPOSITORY_SYNC_INTERVAL_MS: process.env.AIW_REPOSITORY_SYNC_INTERVAL_MS,
  // The accounts that exist on this workbench, so a project or organisation role can only be granted to one of
  // them (round 2, B2-18). Without local accounts there is no registry and grants are not checked.
  AIW_KNOWN_ACTORS: ACCOUNTS ? [...ACCOUNTS.keys()].join(',') : '',
  // The agent and service accounts among them (AIW_AGENT_ACCOUNTS above): never a person, never a reviewer.
  AIW_AGENT_ACTORS: AGENT_ACCOUNTS.join(','),
  // Lets connectors refuse endpoints whose names resolve to internal addresses (connection-adapters.js).
  AIW_RESOLVE_HOST: async (hostName) => (await dnsLookup(hostName, {all: true})).map((a) => a.address),
};

// Exports are answered by a thread of their own (round 12, D-11; export-thread.js): the same Worker route on its own
// connection to this database, so the main loop keeps answering while an SDD is built, and it builds a project's SDD
// exports again after the project changes. It receives the settings above that are plain values (its database, object
// store and assets are its own).
const threadEnv = Object.fromEntries(Object.entries(WORKER_ENV).filter(([, value]) => typeof value === 'string'));
const exportsThread = exportService({databaseFile, filesDirectory, env: threadEnv});
// A baseline's freeze runs in that thread too (round 12, GR-STO-02: baseline-service.js), in its turn among the builds, so
// the main loop keeps answering while the frozen SDD is built; the route answers with its receipt at once.
WORKER_ENV.JOB_THREAD = {run: spec => exportsThread.job(spec)};
// Whole-project reads are answered by a thread of their own too (round 12, PS-14: export-thread.js readService): reading
// and completing a project of a drafted design's size holds a thread for a second, and the first read of a project
// stored before round 12 stores its upgrade (fifteen seconds, once).
const readsThread = readService({databaseFile, filesDirectory, env: threadEnv});
const THREAD_READS = new Set(['/api/project', '/api/changes']);

// Slow-client bounds (round 2, B2-10): headers within 30 s, a complete request within AIW_REQUEST_TIMEOUT_MS
// (2 minutes by default; the largest upload is 12 MB), idle keep-alive connections closed after 5 s.
const requestTimeout = Math.max(10000, Number(process.env.AIW_REQUEST_TIMEOUT_MS) || 120000);
export const server = http.createServer({requestTimeout, headersTimeout: Math.min(30000, requestTimeout), keepAliveTimeout: 5000, maxHeaderSize: 16384}, async (req, res) => {
  const requestId = randomUUID();
  res.setHeader('X-Request-Id', requestId);
  try {
    if (!hostAllowed(req.headers.host)) {
      res.writeHead(421, {'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff'});
      res.end('This workbench answers only on its own address. To use another host name, add it to AIW_ALLOWED_HOSTS.');
      return;
    }
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (url.pathname === '/api/health' && req.method === 'GET') return await healthResponse(res);
    const actor = ACCOUNTS ? await localAccount(req, res, url) : 'local-architect';
    if (!actor) return;
    // A body is read only for a method that carries one, after the session is known, within the route's bound.
    let body = null;
    if (!BODYLESS.has(req.method)) { body = await readBody(req, res, url); if (body === null) return; }
    const headers = new Headers(req.headers);
    headers.set('oai-authenticated-user-id', actor);
    const request = new Request('http://' + req.headers.host + req.url, {method: req.method, headers, ...(body?.length ? {body, duplex: 'half'} : {})});
    const response = url.pathname === '/api/export' && req.method === 'GET' ? await exportsThread.fetch(request) : THREAD_READS.has(url.pathname) && req.method === 'GET' ? await readsThread.fetch(request) : await worker.fetch(request, {
      ...WORKER_ENV,
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => /^AIW_CONNECTION(?:S_JSON|_TOKEN_[A-Z0-9_]+)$/.test(key))),
    });
    // A write to a project: its SDD exports are built again in the export thread once it is quiet (export-thread.js).
    if (!BODYLESS.has(req.method) && response.ok && url.pathname.startsWith('/api/')) exportsThread.changed(url.searchParams.get('project'));
    // A recovery package streams entry by entry (round 12, GR-STO-03: recovery-package.js): written as it is produced,
    // never held whole here, and cut off (the download incomplete, so no import accepts it) if producing it fails.
    if (/^application\/x-ndjson/.test(response.headers.get('content-type') || '') && response.body && req.method !== 'HEAD') {
      res.writeHead(response.status, Object.fromEntries(response.headers));
      const reader = response.body.getReader();
      try {
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          if (res.destroyed) { await reader.cancel(); break; }
          if (!res.write(value)) await new Promise(resolve => { const go = () => { res.off('drain', go); res.off('close', go); resolve(); }; res.on('drain', go); res.on('close', go); });
        }
        res.end();
      } catch (e) { errorEvent('stream-error', e, {requestId, path: url.pathname}); res.destroy(e); }
      return;
    }
    const responseHeaders = Object.fromEntries(response.headers);
    const payload = await compressResponse(req, responseHeaders, Buffer.from(await response.arrayBuffer()));
    if (req.method !== 'HEAD' && response.status !== 204 && response.status !== 304) responseHeaders['content-length'] = String(payload.length);
    res.writeHead(response.status, responseHeaders);
    res.end(payload);
  } catch (e) {
    errorEvent('request-error', e, {requestId, method: req.method, path: (req.url || '').split('?')[0]});
    if (!res.headersSent) res.writeHead(500, {'Content-Type': (req.url || '').startsWith('/api/') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff'});
    res.end((req.url || '').startsWith('/api/') ? JSON.stringify({error: 'The workbench could not answer this request. Your input is still here; reload and try again.', code: 'fault', requestId}) : 'Preview could not respond');
  }
});
server.on('clientError', (e, socket) => {
  if (e.code === 'ECONNRESET' || !socket.writable) return socket.destroy();
  errorEvent('client-error', e, {address: socket.remoteAddress});
  socket.end(e.code === 'HPE_HEADER_OVERFLOW' ? 'HTTP/1.1 431 Request Header Fields Too Large\r\nConnection: close\r\n\r\n' : 'HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

// Retention (retention.js): at start-up, then every AIW_RETENTION_INTERVAL_MS (an hour by default; 0 for start-up only).
const retentionInterval = process.env.AIW_RETENTION_INTERVAL_MS === undefined || process.env.AIW_RETENTION_INTERVAL_MS === '' ? 3600000 : Math.max(0, Number(process.env.AIW_RETENTION_INTERVAL_MS) || 0);
let retentionTimer = null;
async function retentionRun(trigger) {
  try {
    const result = await runRetention({DB, FILES}, retentionPolicy(process.env));
    if (retentionChanged(result)) audit('retention', {trigger, ...result});
  } catch (e) { errorEvent('retention-error', e, {trigger}); }
}

// One bounded slice per wake, with the lease in project_jobs arbitrating between the scheduler and the request's
// initial background attempt. A local operator may set the interval to 0 to use only explicit external scheduling;
// the start-up sweep still reclaims queued work and leases that have expired.
const draftingInterval = process.env.AIW_DRAFTING_INTERVAL_MS === undefined || process.env.AIW_DRAFTING_INTERVAL_MS === '' ? 10000 : Math.min(300000, Math.max(0, Number(process.env.AIW_DRAFTING_INTERVAL_MS) || 0));
let draftingTimer = null, draftingBusy = false;
async function draftingRun(trigger) {
  if (draftingBusy || stopping) return;
  draftingBusy = true;
  try {
    const result = await processDraftingQueue(WORKER_ENV, {maxJobs: 1});
    if (result.dispatched) audit('drafting-queue', {trigger, ...result});
  } catch (e) { errorEvent('drafting-queue-error', e, {trigger}); }
  finally { draftingBusy = false; }
}

server.listen(port, host, () => {
  console.log(`AIW preview ready on ${port} (http://${host.includes(':') ? '[' + host + ']' : host}:${port})${ACCOUNTS ? ` · ${ACCOUNTS.size} local accounts: sign in at /local/sign-in` : ''}`);
  if (!loopbackOnly) {
    console.warn(ACCOUNTS
      ? `Warning: listening on ${host}. Anyone who can reach this address and holds a local account secret can open and change your projects${providerKey ? ' and use your ' + providerKey + ' key' : ''}.${process.env.AIW_COOKIE_SECURE === '1' ? '' : ' Serve it over HTTPS and set AIW_COOKIE_SECURE=1 so session cookies never travel in clear.'}`
      : `Warning: listening on ${host} without local accounts because AIW_ALLOW_OPEN_NETWORK=1. Anyone who can reach this address can open and change your projects as the local architect${providerKey ? ' and use your ' + providerKey + ' key' : ''}.`);
    if (!allowedHostNames.size || allowedHostNames.size === 1) console.warn('Requests must use an IP address or localhost; add host names to AIW_ALLOWED_HOSTS to use them.');
  }
  // Credentials travel to whatever these settings name (audit B-15), so say where when it is not the provider's own
  // address: every provider of the registry (round 12, M), its key never shown.
  const hostOf = (value) => { try { return new URL(value).hostname; } catch { return String(value); } };
  for (const p of providerRegistry(WORKER_ENV).list) {
    if (!p.keyConfigured || !p.baseURL || hostOf(p.baseURL) === hostOf(p.defaultHost ? 'https://' + p.defaultHost : '')) continue;
    console.warn(`Note: provider ${p.name} (${p.label}) sends its key (${p.keyVariable}) and Sol's requests to ${hostOf(p.baseURL)}. Use only a gateway you trust.`);
  }
  const repository = (process.env.AIW_KNOWLEDGE_REPOSITORY_URL || '').trim();
  if (repository && repositoryToken && !LOOPBACK_ADDRESSES.has(hostOf(repository).replace(/^\[|\]$/g, ''))) console.warn(`Note: the knowledge repository token is sent to ${hostOf(repository)}.`);
  retentionRun('start-up');
  if (retentionInterval > 0) { retentionTimer = setInterval(() => retentionRun('interval'), retentionInterval); retentionTimer.unref(); }
  draftingRun('start-up');
  if (draftingInterval > 0) { draftingTimer = setInterval(() => draftingRun('interval'), draftingInterval); draftingTimer.unref(); }
});

// Closing the server (a suite that imported it, or the orderly stop below) stops the timers and closes the database.
let databaseOpen = true;
const closeDatabase = () => { if (!databaseOpen) return; databaseOpen = false; try { DB.close(); } catch { /* already closed */ } };
server.on('close', () => { if (retentionTimer) clearInterval(retentionTimer); if (draftingTimer) clearInterval(draftingTimer); closeDatabase(); });

// An orderly stop (round 2, B2-10): Ctrl+C or a supervisor's SIGTERM stops accepting connections, lets requests in
// flight finish (five seconds at most), closes the database cleanly and exits 0.
let stopping = false;
export function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (retentionTimer) clearInterval(retentionTimer);
  if (draftingTimer) clearInterval(draftingTimer);
  audit('shutdown', {signal});
  const force = setTimeout(() => { server.closeAllConnections?.(); }, 2000);
  force.unref();
  const deadline = setTimeout(() => { closeDatabase(); process.exit(0); }, 5000);
  deadline.unref();
  server.close(() => { clearTimeout(force); clearTimeout(deadline); closeDatabase(); process.exit(0); });
  server.closeIdleConnections?.();
}
// Only when the server is the program (node server.js): a script that imports it keeps its own signal handling.
const runDirectly = (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (runDirectly) for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => shutdown(signal));
