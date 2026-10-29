// Product facts the review desk relies on when it turns an objective into a specification. Each is
// a documented default or operating rule, quoted with where it is documented, and matched to a
// Chapter 7 product by name. They are defaults to check against the version in use, not limits the
// desk invents; the desk says so wherever it uses one.

export const PRODUCT_FACTS = [
  {id: 'pg-max-connections', product: /postgres/i, key: 'maxConnections', value: 100,
    text: 'PostgreSQL allows 100 connections by default (max_connections).',
    advice: 'Put a connection pooler in front of it, such as PgBouncer, or raise max_connections with the memory it needs.',
    src: 'https://www.postgresql.org/docs/current/runtime-config-connection.html'},
  {id: 'rabbit-quorum', product: /rabbitmq/i, key: 'clusterNodes', value: 3,
    text: 'RabbitMQ quorum queues replicate to a majority of nodes, so a cluster that tolerates one node failure needs three nodes.',
    advice: 'Run quorum queues on an odd number of nodes: three to survive one failure, five to survive two.',
    src: 'https://www.rabbitmq.com/docs/quorum-queues'},
  {id: 'redis-sentinel', product: /redis/i, key: 'sentinels', value: 3,
    text: 'Redis Sentinel needs at least three Sentinel instances for a robust deployment.',
    advice: 'Run a primary with at least one replica, watched by three Sentinels in separate failure domains.',
    src: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/'},
  {id: 'patroni-dcs', product: /patroni/i, key: 'dcs', value: 3,
    text: 'Patroni elects the PostgreSQL leader through a distributed configuration store, such as etcd, Consul or ZooKeeper.',
    advice: 'Give the configuration store three members in separate failure domains, so it keeps a majority when one fails.',
    src: 'https://patroni.readthedocs.io/en/latest/'}
];

export function factsFor(productName) {
  const name = String(productName || '');
  return name ? PRODUCT_FACTS.filter(f => f.product.test(name)) : [];
}
export function fact(productName, key) { return factsFor(productName).find(f => f.key === key) || null; }
