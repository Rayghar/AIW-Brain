// What each product is documented to do, as it bears on the quality attributes — the knowledge
// behind the suggested judgements in Chapter 7's options and the review desk's switch points.
//
// TRAITS are mechanisms, each quoted with where the product documents it: Kafka keeps a replayable
// log; a RabbitMQ queue removes a message once it is acknowledged; every PostgreSQL write goes
// through one primary. A trait suggests a judgement (supports, or creates a trade-off) for the
// attributes it bears on; a CEILING trait is a single-unit bottleneck whose limit is a planning
// assumption the reviewer sets, so the desk can say where an objective passes it. The SA Playbook's
// own technology lists add a weaker "named for this attribute" trait. Suggestions are never
// judgements until an architect records them in Chapter 7.
import {ATTRIBUTES} from './playbook-knowledge.js';

export const TRAITS = [
  // Messaging
  {id: 'kafka-replay', product: /kafka/i, attrs: ['traceability', 'recoverability'], effect: 'supports', text: 'Kafka keeps records for a configured retention period, so a consumer can read them again after a failure or for an audit.', src: 'https://kafka.apache.org/documentation/#design'},
  {id: 'kafka-partitions', product: /kafka/i, attrs: ['scalability'], effect: 'supports', spreads: true, text: 'A topic is split into partitions spread across brokers, and the consumers in a group share them, so throughput grows by adding partitions and brokers.', src: 'https://kafka.apache.org/documentation/#intro_concepts_and_terms'},
  {id: 'kafka-replication', product: /kafka/i, attrs: ['availability'], effect: 'supports', text: 'Each partition is replicated across brokers; when a partition\'s leader fails, an in-sync follower takes over.', src: 'https://kafka.apache.org/documentation/#replication'},
  {id: 'rabbit-quorum', product: /rabbitmq/i, attrs: ['availability'], effect: 'supports', text: 'Quorum queues replicate each message to a majority of nodes and keep working when a minority of nodes fails.', src: 'https://www.rabbitmq.com/docs/quorum-queues'},
  {id: 'rabbit-ack', product: /rabbitmq/i, attrs: ['recoverability'], effect: 'supports', text: 'Consumers acknowledge each message; an unacknowledged message is redelivered, and a rejected one can go to a dead-letter exchange.', src: 'https://www.rabbitmq.com/docs/confirms'},
  {id: 'rabbit-consumed', product: /rabbitmq/i, attrs: ['traceability'], effect: 'tension', text: 'A queue removes a message once it is acknowledged, so its history cannot be replayed from the queue; RabbitMQ Streams keep a replayable log instead.', src: 'https://www.rabbitmq.com/docs/streams'},
  {id: 'rabbit-leader', product: /rabbitmq/i, attrs: ['scalability'], effect: 'ceiling', ceiling: 'queue', text: 'Each quorum queue has one leader, on one node, so one queue does not get faster by adding nodes; load is spread by using more queues.', src: 'https://www.rabbitmq.com/docs/quorum-queues'},
  // Databases
  {id: 'pg-unique', product: /postgres/i, attrs: ['integrity'], effect: 'supports', text: 'Unique constraints inside a transaction refuse a repeated request atomically.', src: 'https://www.postgresql.org/docs/current/ddl-constraints.html'},
  {id: 'pg-standby', product: /postgres/i, attrs: ['availability', 'recoverability'], effect: 'supports', text: 'A streaming-replication standby can be promoted when the primary fails.', src: 'https://www.postgresql.org/docs/current/warm-standby.html'},
  {id: 'pg-primary', product: /postgres/i, attrs: ['scalability'], effect: 'ceiling', ceiling: 'primary', text: 'Standbys serve reads only; every write goes through the one primary.', src: 'https://www.postgresql.org/docs/current/hot-standby.html'},
  {id: 'mongo-unique', product: /mongo/i, attrs: ['integrity'], effect: 'supports', text: 'A unique index refuses a second document with the same key.', src: 'https://www.mongodb.com/docs/manual/core/index-unique/'},
  {id: 'mongo-replica', product: /mongo/i, attrs: ['availability', 'recoverability'], effect: 'supports', text: 'A replica set elects a new primary automatically when the primary fails.', src: 'https://www.mongodb.com/docs/manual/replication/'},
  {id: 'mongo-shard', product: /mongo/i, attrs: ['scalability'], effect: 'supports', spreads: true, text: 'Sharding spreads data and writes across shards.', src: 'https://www.mongodb.com/docs/manual/sharding/'},
  // Caches
  {id: 'redis-sentinel', product: /redis/i, attrs: ['availability'], effect: 'supports', text: 'Replicas watched by Sentinel fail over automatically when the primary fails.', src: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/'},
  {id: 'redis-persist', product: /redis/i, attrs: ['recoverability'], effect: 'supports', text: 'RDB snapshots and the append-only file can keep its data on disk across a restart.', src: 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/'},
  {id: 'memcached-none', product: /memcached/i, attrs: ['availability', 'recoverability'], effect: 'tension', text: 'Memcached servers neither replicate nor persist: a lost node takes its entries with it, and the application refills them.', src: 'https://github.com/memcached/memcached/wiki/Overview'},
  // Edge and identity
  {id: 'kong-plugins', product: /kong/i, attrs: ['security'], effect: 'supports', text: 'Plugins enforce authentication and rate limits at the gateway.', src: 'https://docs.konghq.com/hub/'},
  {id: 'nginx-limit', product: /nginx/i, attrs: ['security'], effect: 'supports', text: 'Request-rate limits can be enforced per client (limit_req).', src: 'https://nginx.org/en/docs/http/ngx_http_limit_req_module.html'},
  {id: 'keycloak-oidc', product: /keycloak/i, attrs: ['security'], effect: 'supports', text: 'Issues and validates OpenID Connect tokens, so each service can check who is acting.', src: 'https://www.keycloak.org/docs/latest/server_admin/'},
  // Operations evidence, backup and recovery
  {id: 'otel-context', product: /opentelemetry/i, attrs: ['traceability'], effect: 'supports', text: 'Trace context travels with each request across services, so one payment can be followed end to end.', src: 'https://opentelemetry.io/docs/concepts/context-propagation/'},
  {id: 'pgbackrest-pitr', product: /pgbackrest/i, attrs: ['recoverability'], effect: 'supports', text: 'Restores to a chosen point in time from a backup and the archived write-ahead log.', src: 'https://pgbackrest.org/user-guide.html'},
  {id: 'patroni-failover', product: /patroni/i, attrs: ['availability', 'recoverability'], effect: 'supports', text: 'Promotes a standby automatically when the PostgreSQL primary fails, agreeing the leader through a distributed configuration store.', src: 'https://patroni.readthedocs.io/en/latest/'},
  // Compute
  {id: 'k8s-hpa', product: /kubernetes/i, attrs: ['scalability'], effect: 'supports', text: 'The Horizontal Pod Autoscaler adds and removes replicas as load changes.', src: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/'},
  {id: 'k8s-restart', product: /kubernetes/i, attrs: ['availability'], effect: 'supports', text: 'Restarts failed containers and reschedules pods away from failed nodes.', src: 'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/'}
];

// Single-unit bottlenecks. The limit is a planning assumption (desk-capacity.js ASSUMPTIONS), not a
// benchmark: the desk says so wherever it uses one.
export const CEILINGS = {
  queue: {key: 'queueMsgPerSec', measure: 'messages', unit: 'msg/s', unitName: 'messages a second', label: 'one queue', what: 'One queue\'s leader takes every message on it', beyond: 'Split the work across several queues'},
  primary: {key: 'primaryWritesPerSec', measure: 'writes', unit: 'writes/s', unitName: 'writes a second', label: 'one primary', what: 'One primary takes every write', beyond: 'Split the writes — a database for each service, or partitioned by key'}
};

export const traitsFor = product => { const n = String(product || ''); return n ? TRAITS.filter(t => t.product.test(n)) : []; };
export const ceilingOf = product => { const t = traitsFor(product).find(x => x.effect === 'ceiling'); return t ? {...CEILINGS[t.ceiling], trait: t} : null; };
export const spreadsOf = product => traitsFor(product).find(x => x.spreads) || null;

// The SA Playbook's technology lists, read as weak traits: "named among the technologies for X".
const fragments = name => String(name).split(/[(),/]|\bwith\b|\betc\b/i).map(s => s.trim()).filter(s => s.length >= 4);
export function playbookNames(product) {
  const p = String(product || '').toLowerCase();
  if (!p) return [];
  const out = [];
  for (const a of ATTRIBUTES.filter(a => a.guide)) {
    const row = (a.guide.src.match(/!B(\d+)/) || [])[1];
    for (const t of a.guide.technologies) for (const n of t.names) if (fragments(n).some(f => p.includes(f.toLowerCase()))) out.push({attr: a.id, attrName: a.name, kind: t.kind, name: n, src: row ? `QR-Guidebook!H${row}` : a.guide.src});
  }
  return out;
}

// How an operating model bears on who runs it.
export function operatingTrait(model) {
  const m = String(model || '');
  if (/self/i.test(m)) return {effect: 'tension', text: `Operated by the team itself (${m}): it must be run, patched, scaled and recovered in-house.`, src: 'Chapter 7 · operating model'};
  if (/provider|managed|saas/i.test(m)) return {effect: 'supports', text: `Operated by its provider (${m}): running, patching and scaling sit with the provider, under its service terms.`, src: 'Chapter 7 · operating model'};
  return null;
}
