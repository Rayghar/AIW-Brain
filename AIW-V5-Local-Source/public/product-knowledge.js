// What each product is documented to do, as it bears on the quality attributes — the knowledge
// behind the suggested judgements in Chapter 7's options and the review desk's switch points.
//
// TRAITS are mechanisms, each quoted with where the product documents it: Kafka keeps a replayable
// log; an acknowledged work queue removes a message; a single-primary topology has one write
// authority. A trait suggests a judgement (supports, or creates a trade-off) for the
// attributes it bears on; a CEILING trait is a single-unit bottleneck whose limit is a planning
// assumption the reviewer sets, so the desk can say where an objective passes it. The SA Playbook's
// own technology lists add a weaker "named for this attribute" trait. Suggestions are never
// judgements until an architect records them in Chapter 7.
import {ATTRIBUTES} from './playbook-knowledge.js';
import {digest} from './brain-integrity.js';

export const TRAITS = [
  // Messaging
  {id: 'kafka-replay', product: /kafka/i, attrs: ['traceability', 'recoverability'], effect: 'supports', text: 'Kafka keeps records for a configured retention period, so a consumer can read them again after a failure or for an audit.', src: 'https://kafka.apache.org/43/getting-started/introduction/'},
  {id: 'kafka-partitions', product: /kafka/i, attrs: ['scalability'], effect: 'supports', spreads: true, text: 'A topic is split into partitions spread across brokers, and the consumers in a group share them, so throughput grows by adding partitions and brokers.', src: 'https://kafka.apache.org/43/design/design/'},
  {id: 'kafka-replication', product: /kafka/i, attrs: ['availability'], effect: 'supports', text: 'Each partition is replicated across brokers; when a partition\'s leader fails, an in-sync follower takes over.', src: 'https://kafka.apache.org/43/design/design/'},
  {id: 'rabbit-quorum', product: /rabbitmq/i, attrs: ['availability'], effect: 'supports', text: 'Quorum queues replicate each message to a majority of nodes and keep working when a minority of nodes fails.', src: 'https://www.rabbitmq.com/docs/quorum-queues'},
  {id: 'rabbit-ack', product: /rabbitmq/i, attrs: ['recoverability'], effect: 'supports', text: 'Consumers acknowledge each message; an unacknowledged message is redelivered, and a rejected one can go to a dead-letter exchange.', src: 'https://www.rabbitmq.com/docs/confirms'},
  {id: 'rabbit-consumed', product: /rabbitmq/i, attrs: ['traceability'], effect: 'tension', text: 'A queue removes a message once it is acknowledged, so its history cannot be replayed from the queue; RabbitMQ Streams keep a replayable log instead.', src: 'https://www.rabbitmq.com/docs/streams'},
  {id: 'rabbit-leader', product: /rabbitmq/i, attrs: ['scalability'], effect: 'ceiling', ceiling: 'queue', text: 'Each quorum queue has one leader, on one node, so one queue does not get faster by adding nodes; load is spread by using more queues.', src: 'https://www.rabbitmq.com/docs/quorum-queues'},
  // Databases
  {id: 'pg-unique', product: /postgres/i, attrs: ['integrity'], effect: 'supports', text: 'A declared unique constraint can reject a repeated key. The key, retained outcome and business effect must share the intended transaction; a product name does not establish idempotency.', src: 'https://www.postgresql.org/docs/18/ddl-constraints.html'},
  {id: 'pg-standby', product: /postgres/i, attrs: ['availability', 'recoverability'], effect: 'supports', text: 'A streaming-replication standby can be promoted when the primary fails.', src: 'https://www.postgresql.org/docs/current/warm-standby.html'},
  {id: 'pg-primary', product: /postgres/i, attrs: ['scalability'], effect: 'ceiling', ceiling: 'primary', text: 'In the declared single-primary topology, standby reads do not distribute primary writes. Sharding or another topology needs its own integrity and capacity design.', src: 'https://www.postgresql.org/docs/18/hot-standby.html'},
  {id: 'mysql-unique', product: /mysql/i, attrs: ['integrity'], effect: 'supports', text: 'With a transactional engine such as InnoDB, a statement that violates a unique key is rolled back. Confirm the table engine and statement semantics for this design.', src: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html'},
  {id: 'mysql-group', product: /mysql/i, attrs: ['availability', 'recoverability'], effect: 'supports', text: 'Group Replication in single-primary mode elects a replacement when the primary leaves. Clients still need rerouting and the failover behaviour needs rehearsal.', src: 'https://dev.mysql.com/doc/refman/8.4/en/group-replication-single-primary-mode.html'},
  {id: 'mysql-primary', product: /mysql/i, attrs: ['scalability'], effect: 'ceiling', ceiling: 'primary', text: 'In Group Replication single-primary mode only one member accepts writes. This ceiling applies to that topology; a different design needs its own capacity assessment.', src: 'https://dev.mysql.com/doc/refman/8.4/en/group-replication-single-primary-mode.html'},
  {id: 'mongo-unique', product: /mongo/i, attrs: ['integrity'], effect: 'supports', text: 'A unique index refuses a second document with the same key.', src: 'https://www.mongodb.com/docs/manual/core/index-unique/'},
  {id: 'mongo-replica', product: /mongo/i, attrs: ['availability', 'recoverability'], effect: 'supports', text: 'A replica set elects a new primary automatically when the primary fails.', src: 'https://www.mongodb.com/docs/manual/replication/'},
  {id: 'mongo-shard', product: /mongo/i, attrs: ['scalability'], effect: 'supports', spreads: true, text: 'Sharding spreads data and writes across shards.', src: 'https://www.mongodb.com/docs/manual/sharding/'},
  // Caches
  {id: 'redis-sentinel', product: /redis/i, attrs: ['availability'], effect: 'supports', text: 'Configured Sentinel can promote a replica and guide clients after a primary failure. Quorum, failure domains and client support matter; asynchronous replication can lose acknowledged writes.', src: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/'},
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

// Questions belong to the existing product option specification. False means
// explicitly absent; an unanswered field remains unknown. Requirements are
// recorded as requirements, not inferred from the product or a prose match.
const bool=(key,label,product,question)=>({key,label,product,type:'boolean',question:question||label+'?'});
const enumeration=(key,label,product,options,question)=>({key,label,product,type:'enum',options,question:question||label+'?'});
const numeric=(key,label,product)=>({key,label,product,type:'number',question:label+'?'});
export const CONFIGURATION_FIELDS=[
 bool('database.atomicKeyAndEffect','Duplicate key and business effect share the intended atomic commit',/postgres|mysql|mongo/i),
 bool('database.rowPoliciesRequired','Linked specification requires database-enforced row policies',/postgres|mysql/i),
 bool('database.nativeMaterializedViewsRequired','Linked specification requires native materialized views',/postgres|mysql/i),
 bool('database.boundedReadStalenessAllowed','The read contract permits explicitly bounded older results',/postgres|mysql/i),
 bool('database.mysqlCompatibilityRequired','Existing application contract requires MySQL compatibility',/postgres|mysql/i),
 bool('postgres.uniqueConstraint','Required unique constraint is specified',/postgres/i),
 bool('postgres.streamingReplication','Streaming replication is configured',/postgres/i),
 bool('postgres.singlePrimary','This deployment uses a single write primary',/postgres/i),
 bool('postgres.rowLevelSecurity','Row security policies are enabled on the required tables',/postgres/i),
 bool('postgres.policyBypassReviewed','Owner, superuser and BYPASSRLS paths are addressed',/postgres/i),
 bool('postgres.materializedViews','Materialized-view refresh and freshness are specified',/postgres/i),
 bool('mysql.innodb','Relevant tables use the InnoDB transactional engine',/mysql/i),
 bool('mysql.uniqueConstraint','Required unique constraint is specified',/mysql/i),
 bool('mysql.groupReplication','Group Replication is configured',/mysql/i),
 bool('mysql.singlePrimary','Group Replication operates in single-primary mode',/mysql/i),
 bool('mysql.compatibilityValidated','Existing MySQL queries, routines and connectors are compatibility-tested',/mysql/i),
 enumeration('redis.cacheRole','Redis data role',/redis/i,[['disposable-cache','Disposable copy of an authority'],['authoritative','Authoritative record'],['other','Another explicit role']]),
 bool('redis.sentinel','Sentinel is configured',/redis/i),
 numeric('redis.sentinelCount','Independently placed Sentinel instances',/redis/i),
 bool('redis.clientFailover','Clients support the selected Sentinel failover path',/redis/i),
 bool('redis.persistence','A specified RDB or AOF persistence policy is enabled',/redis/i),
 bool('redis.cacheContract','Freshness, invalidation, eviction and cold-origin protection are specified',/redis/i),
 enumeration('redis.maxmemoryPolicy','Configured memory/eviction behaviour',/redis/i,[['evict','Explicit bounded eviction policy'],['reject','Reject writes at the configured memory bound']]),
 bool('mongo.uniqueIndex','Unique index covers the required business-key scope',/mongo/i),
 bool('mongo.replicaSet','Replica set and election policy are configured',/mongo/i),
 bool('mongo.sharding','Sharding is configured for this collection',/mongo/i),
 bool('mongo.partitionContract','Key distribution, transaction locality and rebalance duties are specified',/mongo/i),
 bool('kafka.retention','Required retention and replay range are configured',/kafka/i),
 bool('kafka.partitionContract','Partition key, ordering and safe consumer concurrency are specified',/kafka/i),
 numeric('kafka.replicationFactor','Configured replication factor for this topic',/kafka/i),
 bool('kafka.ackPolicy','Acknowledgement and in-sync replica failure policy are specified',/kafka/i),
 enumeration('rabbit.queueType','RabbitMQ data structure',/rabbitmq/i,[['quorum','Quorum queue'],['classic','Classic queue'],['stream','Stream']]),
 bool('rabbit.manualAck','Consumer acknowledgements and repeat protection are specified',/rabbitmq/i),
 numeric('rabbit.members','Members of the quorum queue',/rabbitmq/i),
 bool('edge.authPlugin','Authentication plugin is configured for the required route',/kong/i),
 bool('edge.rateLimit','Rate limits and trusted client identity are configured',/nginx|kong/i),
 bool('edge.reverseProxy','Reverse-proxy forwarding and upstream policy are configured',/nginx/i),
 bool('edge.loadBalancing','Backend pool selection and readiness are configured',/nginx/i),
 bool('kubernetes.hpa','HPA policy, metrics and scaling bounds are configured',/kubernetes/i),
 bool('kubernetes.safeReplicas','Work can move between independently ready replicas',/kubernetes/i),
 bool('kubernetes.restartPolicy','Controller, restart and readiness policies are specified',/kubernetes/i)
];
export const configurationFieldsFor=product=>CONFIGURATION_FIELDS.filter(f=>f.product.test(String(product||''))).map(({product,...field})=>field);
const condition=(fact,label,value=true,op='eq')=>({id:fact,fact,label,op,value,question:CONFIGURATION_FIELDS.find(f=>f.key===fact)?.question||'Record '+label.toLowerCase()+'.'});
const configured=(...requires)=>({requires:[condition('version','Product version',null,'present'),...requires]});
// A versioned reference supports this documentation family only. A mismatch
// withholds this mechanism reading; it does not reject the product itself.
const documented=(major,minor,...requires)=>configured(condition('version.major','Inspected documentation major version',major),...(minor==null?[]:[condition('version.minor','Inspected documentation minor version',minor)]),...requires);
const conditions={
 'kafka-replay':configured(condition('kafka.retention','Configured retention and replay range')),
 'kafka-partitions':configured(condition('kafka.partitionContract','Partition and consumer concurrency contract')),
 'kafka-replication':configured(condition('kafka.replicationFactor','More than one topic replica',2,'gte'),condition('kafka.ackPolicy','Acknowledgement and in-sync policy'),condition('failureDomains','Replica failure domains',null,'present')),
 'rabbit-quorum':configured(condition('rabbit.queueType','Quorum queue configuration','quorum'),condition('rabbit.members','At least three queue members',3,'gte'),condition('failureDomains','Queue member failure domains',null,'present')),
 'rabbit-ack':configured(condition('rabbit.queueType','Work queue semantics',['quorum','classic'],'oneOf'),condition('rabbit.manualAck','Consumer acknowledgement contract')),
 'rabbit-consumed':configured(condition('rabbit.queueType','Work queue rather than replayable stream',['quorum','classic'],'oneOf')),
 'rabbit-leader':configured(condition('rabbit.queueType','Quorum queue topology','quorum')),
 'pg-unique':documented(18,null,condition('postgres.uniqueConstraint','Specified unique constraint'),condition('database.atomicKeyAndEffect','Atomic key and business effect')),
 'pg-standby':configured(condition('postgres.streamingReplication','Configured streaming replication'),condition('replicaCount','At least two data instances including primary',2,'gte'),condition('failureDomains','Primary and standby failure domains',null,'present')),
 'pg-primary':configured(condition('postgres.singlePrimary','Single-primary topology')),
 'mysql-unique':documented(8,4,condition('mysql.innodb','InnoDB table engine'),condition('mysql.uniqueConstraint','Specified unique constraint'),condition('database.atomicKeyAndEffect','Atomic key and business effect')),
 'mysql-group':configured(condition('mysql.groupReplication','Group Replication enabled'),condition('mysql.singlePrimary','Single-primary mode'),condition('replicaCount','At least three data instances for this majority-tolerant design',3,'gte'),condition('failureDomains','Group member failure domains',null,'present')),
 'mysql-primary':configured(condition('mysql.groupReplication','Group Replication enabled'),condition('mysql.singlePrimary','Single-primary mode')),
 'mongo-unique':configured(condition('mongo.uniqueIndex','Unique index and key scope'),condition('database.atomicKeyAndEffect','Atomic key and business effect')),
 'mongo-replica':configured(condition('mongo.replicaSet','Configured replica set'),condition('replicaCount','At least three data instances for this replica-set design',3,'gte'),condition('failureDomains','Replica failure domains',null,'present')),
 'mongo-shard':configured(condition('mongo.sharding','Sharded collection'),condition('mongo.partitionContract','Partitioning contract')),
 'redis-sentinel':configured(condition('redis.sentinel','Sentinel enabled'),condition('replicaCount','At least two data instances including primary',2,'gte'),condition('redis.sentinelCount','At least three independently placed Sentinel watchers',3,'gte'),condition('redis.clientFailover','Sentinel-aware clients'),condition('failureDomains','Sentinel and replica failure domains',null,'present')),
 'redis-persist':configured(condition('redis.persistence','RDB or AOF persistence policy')),
 'memcached-none':configured(),
 'kong-plugins':configured(condition('edge.authPlugin','Route authentication plugin'),condition('edge.rateLimit','Rate limiting and identity')),
 'nginx-limit':configured(condition('edge.rateLimit','Rate limiting and identity')),
 'k8s-hpa':configured(condition('kubernetes.hpa','Configured autoscaler policy'),condition('kubernetes.safeReplicas','Safe and ready replicas')),
 'k8s-restart':configured(condition('kubernetes.restartPolicy','Controller and restart policy'))
};
for(const trait of TRAITS)if(conditions[trait.id])trait.applicability={id:trait.id,...conditions[trait.id]};
const reviewedTrait=(value,versionScope)=>({...value,evidence:{url:value.src,accessedAt:'2026-10-20',versionScope,statementSha256:digest(value.text)}});
TRAITS.push(
 reviewedTrait({id:'pg-row-policies',product:/postgres/i,attrs:['security'],effect:'supports',text:'PostgreSQL row security can enforce per-row policies. Review table-owner, superuser and BYPASSRLS access; the feature does not by itself prove tenant isolation.',src:'https://www.postgresql.org/docs/18/ddl-rowsecurity.html',applicability:documented(18,null,condition('database.rowPoliciesRequired','Required database row-policy capability'),condition('postgres.rowLevelSecurity','Policies enabled for the required tables'),condition('postgres.policyBypassReviewed','Policy bypass paths reviewed'))},'PostgreSQL 18.x documentation family; other versions require a separate reviewed interpretation'),
 reviewedTrait({id:'pg-materialized',product:/postgres/i,attrs:['performance'],effect:'supports',text:'PostgreSQL materialized views retain query results and require refresh. They can support an approved precomputed-read design when the result-age contract permits it.',src:'https://www.postgresql.org/docs/18/rules-materializedviews.html',applicability:documented(18,null,condition('database.nativeMaterializedViewsRequired','Required native materialized-view capability'),condition('database.boundedReadStalenessAllowed','Bounded older result permitted'),condition('postgres.materializedViews','Refresh and freshness contract'))},'PostgreSQL 18.x documentation family; other versions require a separate reviewed interpretation'),
 reviewedTrait({id:'mysql-materialized-gap',product:/mysql/i,attrs:['performance','maintainability'],effect:'tension',text:'MySQL 8.4 documents no native materialized views. If that exact capability is required, evaluate a separately maintained summary or a different engine; this is not a general claim that MySQL cannot serve reporting.',src:'https://dev.mysql.com/doc/refman/8.4/en/faqs-views.html',applicability:documented(8,4,condition('database.nativeMaterializedViewsRequired','Required native materialized-view capability'))},'MySQL 8.4.x documentation family only'),
 reviewedTrait({id:'mysql-existing-contract',product:/mysql/i,attrs:['maintainability'],effect:'supports',text:'A required existing MySQL application contract can justify retaining a tested MySQL version and engine. Compare migration and operating work alongside any requested database features.',src:'https://dev.mysql.com/doc/refman/8.4/en/storage-engines.html',applicability:configured(condition('database.mysqlCompatibilityRequired','Existing MySQL compatibility requirement'),condition('mysql.compatibilityValidated','Application compatibility tested'),condition('mysql.innodb','Required transactional table engine'))},'Project-specific compatibility judgement; MySQL 8.4 engine reference'),
 reviewedTrait({id:'redis-cache-role',product:/redis/i,attrs:['performance'],effect:'supports',text:'Redis can fill the disposable cache role after the read design establishes eligible reuse, freshness and controlled origin access. Persistence or Sentinel does not replace that cache contract.',src:'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/',applicability:configured(condition('redis.cacheRole','Disposable read-copy role','disposable-cache'),condition('redis.cacheContract','Cache correctness and recovery contract'),condition('redis.maxmemoryPolicy','Memory and eviction policy',null,'present'))},'Redis OSS cache role; verify selected version and configuration'),
 reviewedTrait({id:'nginx-proxy',product:/nginx/i,attrs:['security','interoperability'],effect:'supports',text:'NGINX can forward requests through a reverse-proxy boundary. The selected configuration must identify the required policy, upstream identity and failure behaviour.',src:'https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/',applicability:configured(condition('edge.reverseProxy','Configured proxy boundary'))},'NGINX feature/configuration scoped; verify edition and version'),
 reviewedTrait({id:'nginx-balancing',product:/nginx/i,attrs:['availability','scalability'],effect:'supports',text:'NGINX can combine reverse proxying with upstream load distribution. Configure readiness and state handling; the two roles do not require two products.',src:'https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/',applicability:configured(condition('edge.loadBalancing','Configured backend pool and readiness'))},'NGINX feature/configuration scoped; verify edition and version')
);

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
