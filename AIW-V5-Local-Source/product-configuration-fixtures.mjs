// Synthetic, explicitly declared configurations for reasoning tests. The shipped
// reference seed deliberately leaves these facts unknown. These declarations
// exercise conditional arithmetic and do not represent verified deployments.
const configurations = [
  [/kafka/i, {'kafka.retention':true,'kafka.partitionContract':true,'kafka.replicationFactor':3,'kafka.ackPolicy':true}],
  [/rabbitmq/i, {'rabbit.queueType':'quorum','rabbit.manualAck':true,'rabbit.members':3}],
  [/postgres/i, {'postgres.uniqueConstraint':true,'database.atomicKeyAndEffect':true,'postgres.streamingReplication':true,'postgres.singlePrimary':true}],
  [/mysql/i, {'mysql.innodb':true,'mysql.uniqueConstraint':true,'database.atomicKeyAndEffect':true,'mysql.groupReplication':true,'mysql.singlePrimary':true}],
  [/mongo/i, {'mongo.uniqueIndex':true,'database.atomicKeyAndEffect':true,'mongo.replicaSet':true,'mongo.sharding':true,'mongo.partitionContract':true}],
  [/redis/i, {'redis.sentinel':true,'redis.sentinelCount':3,'redis.clientFailover':true,'redis.persistence':true}],
  [/kong/i, {'edge.authPlugin':true,'edge.rateLimit':true}],
  [/nginx/i, {'edge.rateLimit':true}],
  [/kubernetes/i, {'kubernetes.hpa':true,'kubernetes.safeReplicas':true,'kubernetes.restartPolicy':true}],
  [/keycloak/i, {'mechanism.keycloak-oidc.reviewed':true}],
  [/opentelemetry/i, {'mechanism.otel-context.reviewed':true}],
  [/pgbackrest/i, {'mechanism.pgbackrest-pitr.reviewed':true}],
  [/patroni/i, {'mechanism.patroni-failover.reviewed':true}]
];

export function configuredProductFixture(option) {
  const match = configurations.find(([pattern]) => pattern.test(option.product || ''));
  if (!match) return {...option};
  return {...option,replicaCount:3,topology:'Explicit synthetic multi-instance topology',failureDomains:'Three independent synthetic failure domains',
    specEvidence:'Synthetic configuration declared for the reasoning test; no deployment or measured result is asserted.',
    configurationFacts:{...option.configurationFacts,...match[1]}};
}

export function withConfiguredProductFixtures(project) {
  const result = structuredClone(project);
  for (const r of result.technologyRealisation?.records || []) r.options = r.options.map(configuredProductFixture);
  return result;
}
