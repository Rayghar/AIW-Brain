// Run the retention policy once against the local database and object directory (retention.js), and print what
// it did as one JSON document. Honours AIW_LOCAL_DB, AIW_LOCAL_FILES and the AIW_RETENTION_* settings exactly as
// the server does; --dry-run reports the policy and the counts that would be removed without removing anything.
import path from 'node:path';
import {localDatabase} from '../local-db.js';
import {localFiles} from '../local-files.js';
import {runRetention, retentionPolicy, unreferencedUploads, DEFAULT_RETENTION} from '../retention.js';
const databaseFile = process.env.AIW_LOCAL_DB || '.aiw-local/project.sqlite';
const filesDirectory = process.env.AIW_LOCAL_FILES || path.join(path.dirname(databaseFile), 'baselines');
const dryRun = process.argv.includes('--dry-run');
const DB = localDatabase(databaseFile);
try {
  const policy = retentionPolicy(process.env);
  if (dryRun) {
    const now = Date.now(), iso = (ms) => new Date(now - ms).toISOString(), count = async (sql, ...binds) => (await DB.prepare(sql).bind(...binds).first()).n;
    const would = {
      interrupted: await count("SELECT COUNT(*) AS n FROM intelligence_runs WHERE status='pending' AND created_at<?", iso(policy.interruptedMinutes * 60000)) + await count("SELECT COUNT(*) AS n FROM brain_retrieval_runs WHERE status='pending' AND created_at<?", iso(policy.interruptedMinutes * 60000)),
      runs: policy.runsDays ? await count('SELECT COUNT(*) AS n FROM intelligence_runs WHERE created_at<?', iso(policy.runsDays * 86400000)) : 0,
      retrievals: policy.runsDays ? await count('SELECT COUNT(*) AS n FROM brain_retrieval_runs WHERE created_at<?', iso(policy.runsDays * 86400000)) : 0,
      events: policy.eventsDays ? await count('SELECT COUNT(*) AS n FROM operation_events WHERE created_at<?', iso(policy.eventsDays * 86400000)) : 0,
      activity: policy.activityDays ? await count('SELECT COUNT(*) AS n FROM project_activity WHERE created_at<?', iso(policy.activityDays * 86400000)) : 0,
      receipts: await count('SELECT COUNT(*) AS n FROM command_receipts WHERE created_at<?', iso(policy.receiptsHours * 3600000)) + await count('SELECT COUNT(*) AS n FROM route_receipts WHERE created_at<?', iso(policy.receiptsHours * 3600000)),
    };
    const errors = [];
    would.uploads = policy.uploadsDays ? (await unreferencedUploads({DB, FILES: localFiles(filesDirectory)}, iso(policy.uploadsDays * 86400000), errors)).length : 0;
    console.log(JSON.stringify({dryRun: true, database: databaseFile, files: filesDirectory, policy, defaults: DEFAULT_RETENTION, wouldRemove: would, errors}, null, 2));
  } else {
    const result = await runRetention({DB, FILES: localFiles(filesDirectory)}, policy);
    console.log(JSON.stringify({database: databaseFile, files: filesDirectory, ...result}, null, 2));
    if (result.errors.length) process.exitCode = 1;
  }
} finally { DB.close(); }
