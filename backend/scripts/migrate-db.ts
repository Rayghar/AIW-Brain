import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const MIGRATION_LOCK_NAME = 'aiw-schema-migrations';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required. Add the PostgreSQL connection string to the backend environment.',
    );
  }

  const client = new pg.Client({
    connectionString,
    application_name: 'aiw-migrator',
  });

  let lockAcquired = false;

  await client.connect();
  console.log('Connected to PostgreSQL.');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(
      `SELECT pg_advisory_lock(hashtext($1))`,
      [MIGRATION_LOCK_NAME],
    );

    lockAcquired = true;

    const directory = resolve(process.cwd(), 'database', 'migrations');

    const files = (await readdir(directory))
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort((left, right) =>
        left.localeCompare(right, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

    if (files.length === 0) {
      console.log(`No migration files found in ${directory}`);
      return;
    }

    for (const file of files) {
      const applied = await client.query(
        `
          SELECT 1
          FROM schema_migrations
          WHERE version = $1
        `,
        [file],
      );

      if (applied.rowCount && applied.rowCount > 0) {
        console.log(`Skipped ${file} because it has already been applied.`);
        continue;
      }

      const migrationPath = resolve(directory, file);
      const sql = await readFile(migrationPath, 'utf8');

      await client.query('BEGIN');

      try {
        await client.query(sql);

        await client.query(
          `
            INSERT INTO schema_migrations (version)
            VALUES ($1)
          `,
          [file],
        );

        await client.query('COMMIT');
        console.log(`Applied ${file}`);
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply ${file}.`);
        throw error;
      }
    }

    console.log('AIW database migrations completed successfully.');
  } finally {
    if (lockAcquired) {
      await client
        .query(
          `SELECT pg_advisory_unlock(hashtext($1))`,
          [MIGRATION_LOCK_NAME],
        )
        .catch(() => undefined);
    }

    await client.end().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  console.error('AIW database migration failed.');

  if (error instanceof Error) {
    console.error(error.message);

    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
