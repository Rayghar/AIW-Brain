# AIW MongoDB Atlas Integration

AIW can now use MongoDB Atlas for durable project, branch, snapshot and outbox-event persistence.

## Runtime selection

Set:

```bash
AIW_DATABASE_PROVIDER=mongodb-atlas
MONGODB_URI=mongodb+srv://<aiw_app_user>:<password>@<cluster-name>.<cluster-id>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=aiw
```

The API selects persistence in this order:

1. `AIW_DATABASE_PROVIDER=mongodb-atlas` or a configured `MONGODB_URI` selects Atlas.
2. `DATABASE_URL` selects PostgreSQL.
3. If neither is configured, AIW uses in-memory reference storage.

## Collections

The Atlas repository creates and uses these collections:

- `project_branch_documents` — current canonical architecture project per tenant/project/branch.
- `project_snapshots` — immutable architecture snapshots and SDD/review handoff history.
- `durable_events` — activity/outbox records for project collaboration events.

## Indexes

The repository creates indexes lazily on first use:

- `project_branch_documents`: unique `{ tenantId, projectId, branchId }`.
- `project_snapshots`: unique `{ tenantId, projectId, snapshotId }`.
- `durable_events`: unique `{ eventId }` plus tenant/status ordering.

## Local validation

Run:

```bash
cd backend
npm install
npm run mongodb-atlas:gate
npm run build -w @aiw/api
npm run dev:api
```

Then check:

```bash
curl http://localhost:3001/ready
curl http://localhost:3001/api/storage/status
```

The response should report `mongodb-atlas` as the project repository when Atlas is configured.

## Production guidance

Use a dedicated Atlas database user for AIW. Restrict Network Access to your backend runtime IPs instead of using broad access. Keep `MONGODB_URI` only in a secret manager or deployment environment variable; do not commit it.
