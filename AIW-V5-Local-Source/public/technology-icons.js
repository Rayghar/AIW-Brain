// Technology-category icons for Chapter 7's picture (round 6, Contract F). A product named in a technology option
// ("PostgreSQL", "Kafka", "Kong API gateway") is read into one of sixteen categories by a lexicon over technology names
// and kinds, and each category has one glyph: a simple, recognisable shape drawn here as 24 × 24 single-path data. The
// glyphs are categories, never vendor marks: a database is a cylinder whoever makes it. iconFor(text) returns the icon
// id or null when the words name no category it knows; the notation model sets node.icon on the technology scene and
// the renderer draws D.icons[node.icon].path in the glyph slot. Presentation only: nothing here reads or writes a record.
// DOM-free; the browser, the server and the suites load it (shared/technology-icons.js re-exports it).

// Every glyph: a title for the Key and the text alternative, and the path (stroke drawing, fill none, 1.8 wide).
export const ICONS = Object.freeze({
  database: {title: 'Database', path: 'M12 3C7.6 3 4 4.3 4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3zM4 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'},
  queue: {title: 'Queue or message broker', path: 'M3 8h4v8H3zM9 8h4v8H9zM15 8h4v8h-4zM19 12h3m-1.5-1.5L22 12l-1.5 1.5'},
  cache: {title: 'Cache', path: 'M4 4h16v16H4zM13 6.5l-4.5 7h4l-1.5 4 4.5-7h-4z'},
  gateway: {title: 'Gateway or proxy', path: 'M9 3h6v18H9zM2 12h5m-2-2.5L7 12l-2 2.5M17 12h5m-2-2.5L22 12l-2 2.5'},
  function: {title: 'Function or serverless compute', path: 'M3 3h3v18H3M21 3h-3v18h3M8 19l5-14M10.5 12l4.5 7'},
  container: {title: 'Container platform', path: 'M3 8h18v12H3zM3 8l3-4h12l3 4M8 11v6M12 11v6M16 11v6'},
  browser: {title: 'Web application', path: 'M3 4h18v16H3zM3 9h18M6 6.5h.5M9 6.5h.5M12 6.5h.5'},
  mobile: {title: 'Mobile application', path: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM7 5h10M7 18h10M12 20h.01'},
  storage: {title: 'Object or file storage', path: 'M4 6h16l-1.5 14h-13zM4 6c0-1.7 3.6-3 8-3s8 1.3 8 3M9 10v6M15 10v6'},
  identity: {title: 'Identity and access', path: 'M12 2l8 3v6c0 5-3.5 9.2-8 11-4.5-1.8-8-6-8-11V5zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 12v4M12 14h2.5'},
  search: {title: 'Search index', path: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM14.5 14.5L20 20'},
  stream: {title: 'Event stream', path: 'M3 8c3-2.5 6 2.5 9 0s6-2.5 9 0M3 13c3-2.5 6 2.5 9 0s6-2.5 9 0M3 18c3-2.5 6 2.5 9 0s6-2.5 9 0'},
  scheduler: {title: 'Scheduler or batch', path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2'},
  model: {title: 'Model or inference', path: 'M5 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8.5l10 3M7 15.5l10-3'},
  network: {title: 'Network or load balancer', path: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM4 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM20 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 7v4M12 11l-7 6M12 11l7 6'},
  message: {title: 'Messaging or notification', path: 'M3 6h18v12H3zM3 6l9 7 9-7'}
});
export const ICON_IDS = Object.freeze(Object.keys(ICONS));

// The lexicon: each entry is a category and the words that name it, matched as whole words (case-insensitive) in the
// order given, so a backup tool is storage before its database is a database, and a managed OpenID provider is identity
// before "provider" means nothing. Product names are read as categories; no logo is implied.
const LEXICON = [
  ['storage', ['s3', 'blob', 'bucket', 'object storage', 'object store', 'file store', 'file storage', 'nfs', 'efs', 'gcs', 'minio', 'backup', 'backups', 'snapshot', 'snapshots', 'pgbackrest', 'archive storage', 'cold storage']],
  ['identity', ['keycloak', 'oidc', 'openid', 'openid connect', 'cognito', 'okta', 'auth0', 'entra', 'active directory', 'ldap', 'saml', 'identity provider', 'identity', 'sso', 'single sign-on', 'iam', 'authentication', 'authorization service']],
  ['gateway', ['kong', 'api gateway', 'gateway', 'nginx', 'envoy', 'haproxy', 'traefik', 'apigee', 'reverse proxy', 'ingress', 'ingress controller', 'api management', 'bff']],
  ['network', ['vpc', 'load balancer', 'load balancing', 'alb', 'elb', 'nlb', 'subnet', 'vpn', 'cdn', 'cloudfront', 'dns', 'route 53', 'firewall', 'waf', 'service mesh', 'istio', 'linkerd', 'private link', 'peering']],
  ['stream', ['kinesis', 'flink', 'spark streaming', 'event hub', 'event hubs', 'pulsar', 'pub/sub', 'pubsub', 'stream processing', 'event stream', 'streaming']],
  ['queue', ['kafka', 'rabbitmq', 'sqs', 'activemq', 'artemis', 'amqp', 'jms', 'nats', 'mq', 'ibm mq', 'service bus', 'message queue', 'message broker', 'broker', 'queue', 'event log', 'messaging']],
  ['cache', ['redis', 'memcached', 'elasticache', 'hazelcast', 'ehcache', 'valkey', 'cache', 'caching', 'in-memory store']],
  ['search', ['elasticsearch', 'opensearch', 'solr', 'lucene', 'algolia', 'meilisearch', 'typesense', 'search index', 'full-text search', 'search engine', 'search']],
  ['model', ['inference', 'inference endpoint', 'model serving', 'model server', 'llm', 'language model', 'machine learning model', 'ml model', 'embedding model', 'sagemaker', 'vertex ai', 'model', 'models']],
  ['scheduler', ['cron', 'cronjob', 'airflow', 'quartz', 'scheduler', 'scheduled job', 'batch job', 'batch scheduler', 'control-m', 'step functions', 'temporal', 'argo workflows', 'dagster', 'prefect']],
  ['function', ['lambda', 'cloud function', 'cloud functions', 'azure functions', 'azure function', 'faas', 'serverless function', 'serverless functions', 'cloud run functions', 'openfaas', 'knative']],
  ['container', ['kubernetes', 'k8s', 'docker', 'ecs', 'eks', 'aks', 'gke', 'openshift', 'nomad', 'fargate', 'cloud run', 'container platform', 'container', 'containers', 'pod', 'helm']],
  ['mobile', ['ios', 'android', 'mobile app', 'mobile application', 'react native', 'flutter', 'swift app', 'kotlin app', 'mobile']],
  ['browser', ['react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt', 'web app', 'web application', 'single-page application', 'spa', 'browser', 'web portal', 'web client', 'frontend', 'front end', 'website']],
  ['message', ['smtp', 'twilio', 'sns', 'sendgrid', 'ses', 'email service', 'e-mail', 'email', 'sms', 'push notification', 'push notifications', 'notification service', 'notifications', 'firebase cloud messaging', 'fcm', 'apns']],
  ['database', ['postgresql', 'postgres', 'mysql', 'mariadb', 'dynamodb', 'mongodb', 'cassandra', 'oracle database', 'sql server', 'sqlserver', 'db2', 'cockroachdb', 'cosmos db', 'cosmosdb', 'aurora', 'rds', 'spanner', 'firestore', 'couchbase', 'neo4j', 'sqlite', 'patroni', 'database', 'databases', 'datastore', 'data store', 'document store', 'rdbms', 'sql', 'nosql', 'persistence']]
];
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// Word boundaries that treat letters and digits as word characters and everything else as a break ("Kong API gateway",
// "S3", "e-mail", "pub/sub"); a term that ends in a digit or a letter must not continue into another of them.
const RULES = LEXICON.map(([id, words]) => [id, new RegExp('(?<![a-z0-9])(?:' + words.map(escapeRe).join('|') + ')(?![a-z0-9])', 'i')]);

// The icon id for a technology's words (a product name, its vendor line, the need it answers), or null.
export function iconFor(text) {
  const t = String(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return null;
  for (const [id, re] of RULES) if (re.test(t)) return id;
  return null;
}
// The icon ids a picture draws, with how many elements carry each, in the lexicon's order of the Key.
export function iconsDrawn(D) {
  const set = D?.icons || ICONS, count = new Map();
  for (const n of D?.nodes || []) if (n.icon && set[n.icon]?.path) count.set(n.icon, (count.get(n.icon) || 0) + 1);
  const order = [...ICON_IDS, ...Object.keys(set).filter(id => !ICON_IDS.includes(id))];
  return order.filter(id => count.has(id)).map(id => ({id, title: String(set[id].title || id), path: String(set[id].path), count: count.get(id)}));
}
