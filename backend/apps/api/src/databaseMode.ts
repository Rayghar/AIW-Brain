export type AiwDatabaseProvider = 'memory' | 'postgresql' | 'mongodb-atlas';

function normalizedProvider(): string {
  return (process.env.AIW_DATABASE_PROVIDER ?? process.env.DATABASE_PROVIDER ?? '').trim().toLowerCase();
}

export function databaseProvider(): AiwDatabaseProvider {
  const provider = normalizedProvider();
  if (provider === 'mongodb' || provider === 'mongo' || provider === 'atlas' || provider === 'mongodb-atlas') return 'mongodb-atlas';
  if (provider === 'postgres' || provider === 'postgresql' || provider === 'pg') return 'postgresql';
  if (process.env.MONGODB_URI || process.env.MONGO_URL) return 'mongodb-atlas';
  if (process.env.DATABASE_URL) return 'postgresql';
  return 'memory';
}

export function mongodbUri(): string | undefined {
  return process.env.MONGODB_URI ?? process.env.MONGO_URL;
}

export function mongodbDbName(): string {
  return process.env.MONGODB_DB_NAME ?? process.env.AIW_MONGODB_DATABASE ?? 'aiw';
}

export function databaseStatus() {
  const provider = databaseProvider();
  return {
    provider,
    durable: provider === 'memory' ? false : true,
    projectRepository: provider,
    outbox: provider === 'mongodb-atlas' ? 'mongodb-atlas-outbox' : provider === 'postgresql' ? 'postgresql-outbox' : 'memory-outbox',
    atlasConfigured: Boolean(mongodbUri()),
    postgresConfigured: Boolean(process.env.DATABASE_URL),
  };
}
