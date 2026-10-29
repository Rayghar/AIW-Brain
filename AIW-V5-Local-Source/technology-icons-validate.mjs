// The technology-category icons (round 6, Contract F): the lexicon reads product names and kinds into one of sixteen
// categories (every example the contract names, the bank reference's options, nothing for words it does not know); every
// glyph is 24 × 24 single-path data that parses as SVG path data; the ids are the sixteen the contract names, in a stable
// order; the Key lists the icons a picture draws only when the picture names its icon set and an element carries one.
// Measures the icons matched on the four reference projects' technology options. No network, no model key.
// Run: npm run test:technology-icons
import assert from 'node:assert/strict';
import {ICONS, ICON_IDS, iconFor, iconsDrawn} from './shared/technology-icons.js';
import {iconKeyHTML} from './public/notation-view.js';
import {createProject} from './shared/projects-domain.js';

const checks = [], pass = n => checks.push(n);

// 1. The ids: the sixteen categories the contract names, stable, each with a title and a path.
assert.deepEqual(ICON_IDS, ['database', 'queue', 'cache', 'gateway', 'function', 'container', 'browser', 'mobile', 'storage', 'identity', 'search', 'stream', 'scheduler', 'model', 'network', 'message']);
for (const id of ICON_IDS) { assert.ok(typeof ICONS[id].title === 'string' && ICONS[id].title.length > 2, id + ' has a title'); assert.ok(typeof ICONS[id].path === 'string' && ICONS[id].path.length > 10, id + ' has a path'); }
assert.ok(Object.isFrozen(ICONS) && Object.isFrozen(ICON_IDS), 'the set is frozen');
assert.ok(!Object.values(ICONS).some(i => /logo|™|®/i.test(i.title)), 'titles are categories, never vendor marks');
pass('sixteen icon ids in a stable order, each with a title and single-path data, the set frozen');

// 2. Every path parses as SVG path data: commands M L H V C S Q T A Z with the number of arguments each takes, within 0–24.
function parsePath(d) {
  const ARGS = {M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0};
  const tokens = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) || [];
  assert.equal(tokens.join('').replace(/\s/g, ''), d.replace(/[\s,]/g, ''), 'nothing but commands and numbers: ' + d);
  let i = 0, count = 0, cmd = null, x = 0, y = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; if (cmd.toUpperCase() === 'Z') { count++; continue; } } else assert.ok(cmd && cmd.toUpperCase() !== 'Z', 'a number follows a command: ' + d);
    const n = ARGS[cmd.toUpperCase()]; assert.ok(n > 0, 'known command ' + cmd);
    const args = tokens.slice(i, i + n).map(Number); assert.equal(args.length, n, cmd + ' takes ' + n + ' numbers in ' + d); assert.ok(args.every(Number.isFinite), 'finite numbers');
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'H') x = rel ? x + args[0] : args[0]; else if (C === 'V') y = rel ? y + args[0] : args[0]; else { const px = args[n - 2], py = args[n - 1]; x = rel ? x + px : px; y = rel ? y + py : py; }
    assert.ok(x >= -0.5 && x <= 24.5 && y >= -0.5 && y <= 24.5, cmd + ' stays inside the 24 × 24 box in ' + d + ' (' + x + ',' + y + ')');
    i += n; count++;
  }
  return count;
}
for (const id of ICON_IDS) { const n = parsePath(ICONS[id].path); assert.ok(n >= 3, id + ' draws something (' + n + ' segments)'); assert.ok(/^M/.test(ICONS[id].path), id + ' starts with a move'); }
pass('every glyph parses as SVG path data (commands with their arguments) and stays inside 24 × 24');

// 3. The lexicon: the contract's examples, each to its category.
const CASES = {database: ['PostgreSQL', 'MySQL', 'DynamoDB', 'MongoDB document store', 'SQL Server'], queue: ['Kafka', 'RabbitMQ', 'SQS', 'Apache Kafka event log', 'RabbitMQ messaging service'], cache: ['Redis', 'Memcached', 'Redis cache'], gateway: ['Kong', 'API gateway', 'nginx', 'Kong API gateway', 'NGINX reverse proxy'], function: ['Lambda', 'Cloud Function', 'Azure Functions'], container: ['Kubernetes', 'Docker', 'ECS', 'Managed Kubernetes (cloud provider)'], browser: ['React', 'web app', 'Angular front end'], mobile: ['iOS', 'Android', 'React Native'], storage: ['S3', 'blob', 'bucket', 'pgBackRest for PostgreSQL', 'Managed database backups'], identity: ['Keycloak', 'OIDC', 'Cognito', 'Managed OpenID Connect provider'], search: ['Elasticsearch', 'OpenSearch'], stream: ['Kinesis', 'Flink'], scheduler: ['cron', 'Airflow'], model: ['model', 'inference'], network: ['VPC', 'load balancer'], message: ['SMTP', 'Twilio', 'SNS']};
for (const [id, words] of Object.entries(CASES)) for (const w of words) assert.equal(iconFor(w), id, w + ' → ' + id);
for (const w of ['', '   ', null, undefined, 'Documented manual failover', 'OpenTelemetry · Prometheus · Grafana', 'Self-managed compute', 'a sentence with no technology in it']) assert.equal(iconFor(w), null, JSON.stringify(w) + ' names no category');
assert.equal(iconFor('POSTGRESQL DATABASE'), 'database', 'case does not matter'); assert.equal(iconFor('es3'), null, 'whole words only'); assert.equal(iconFor('redis-backed cache'), 'cache');
pass('the lexicon answers every example in the contract and says null for words it does not know; whole words, any case');

// 4. The icons matched on the four reference projects' technology options (product, vendor line and need), measured.
const measure = {};
for (const t of ['bank-payment', 'service-permits', 'warehouse-fulfilment', 'clinic-appointments']) {
  const p = createProject({name: t, template: t}, 'icons-' + t, '2026-10-02T00:00:00Z');
  const options = (p.technologyRealisation?.records || []).flatMap(r => (r.options || []).map(o => [o.product || o.title, o.vendor, r.title].filter(Boolean).join(' ')));
  const matched = options.map(iconFor).filter(Boolean);
  measure[t] = {matched: matched.length, total: options.length, icons: [...new Set(matched)]};
}
assert.ok(measure['bank-payment'].matched >= 12 && measure['bank-payment'].total === 18, 'the bank reference: most options name a category: ' + JSON.stringify(measure['bank-payment']));
assert.ok(measure['bank-payment'].icons.includes('database') && measure['bank-payment'].icons.includes('queue') && measure['bank-payment'].icons.includes('identity'), 'database, queue and identity among them');
pass('the reference projects measured: ' + Object.entries(measure).map(([t, m]) => t + ' ' + m.matched + '/' + m.total).join(', '));

// 5. The Key lists the icons drawn when the picture names its icon set and an element carries one (Contract F).
const D = {icons: ICONS, nodes: [{id: 'a', icon: 'database'}, {id: 'b', icon: 'database'}, {id: 'c', icon: 'queue'}, {id: 'd'}, {id: 'e', icon: 'nothing-known'}]};
assert.deepEqual(iconsDrawn(D).map(i => [i.id, i.count]), [['database', 2], ['queue', 1]], 'each icon once, with a count, in the stable order');
const key = iconKeyHTML(D);
assert.match(key, /<h5 aria-level="4">Technology icons<\/h5>/); assert.equal((key.match(/<p class="nt-icon-key"/g) || []).length, 2);
assert.ok(key.includes('data-nt-icon="database"') && key.includes('Database <small>×2</small>') && key.includes('Queue or message broker') && key.includes('<path d="' + ICONS.queue.path + '"/>'), 'the glyph and the title of each');
assert.equal(iconKeyHTML({nodes: [{id: 'a', icon: 'database'}]}), '', 'no icon set on the picture: nothing listed');
assert.equal(iconKeyHTML({icons: ICONS, nodes: [{id: 'a'}]}), '', 'no element carries an icon: nothing listed');
assert.equal(iconKeyHTML(null), '');
// A picture's own set (a registered icon beyond the sixteen) is listed too, after the known ones; a hostile title is escaped.
const own = {icons: {...ICONS, custom: {title: 'Custom <b>x</b>', path: 'M1 1h2'}}, nodes: [{id: 'a', icon: 'custom'}, {id: 'b', icon: 'cache'}]};
assert.deepEqual(iconsDrawn(own).map(i => i.id), ['cache', 'custom']); assert.ok(iconKeyHTML(own).includes('Custom &lt;b&gt;x&lt;/b&gt;') && !iconKeyHTML(own).includes('<b>x</b>'));
pass('the Key lists each icon drawn once with its glyph, title and count, only with D.icons and node.icon present; titles are escaped');

console.log(JSON.stringify({suite: 'Technology icons', passed: checks.length, checks, measure}, null, 1));
