import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  process.stdout.write(`${JSON.stringify({ connected: false, reason: "DATABASE_URL_NOT_PRESENT" })}\n`);
  process.exitCode = 2;
} else {
  const client = new pg.Client({
    connectionString,
    application_name: "aiw-rc10-78-2-baseline",
    connectionTimeoutMillis: 10_000,
    statement_timeout: 10_000,
  });
  try {
    await client.connect();
    const version = await client.query<{ server_version: string }>("SHOW server_version");
    const migrations = await client.query<{ version: string; applied_at: string }>(
      "SELECT version, applied_at::text FROM schema_migrations ORDER BY applied_at DESC, version DESC",
    ).catch(() => ({ rows: [] }));
    const tables = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    const rls = await client.query<{ tablename: string; rowsecurity: boolean }>(
      "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    process.stdout.write(`${JSON.stringify({
      connected: true,
      serverVersion: version.rows[0]?.server_version ?? "unknown",
      migrationCount: migrations.rows.length,
      latestMigration: migrations.rows[0]?.version ?? null,
      tableCount: tables.rows.length,
      tables: tables.rows.map((row) => row.table_name),
      rlsEnabledTables: rls.rows.filter((row) => row.rowsecurity).map((row) => row.tablename),
      secretValuesCaptured: false,
    })}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      connected: false,
      reason: error instanceof Error ? error.message : "POSTGRES_DIAGNOSTIC_FAILED",
      code: error && typeof error === "object" && "code" in error ? String(error.code) : null,
      secretValuesCaptured: false,
    })}\n`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}
