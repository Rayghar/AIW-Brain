# Run AIW v0.10.0-rc.10.73.4 on Windows

## Prerequisites

- Node.js supported by the package engines
- npm
- PowerShell

## Backend

```powershell
cd backend
npm ci
npm run rc10_73_3:verify
npm run dev:api
```

Apply database migration `019_rc10_73_3_brain_transactions.sql` before enabling PostgreSQL persistence. MongoDB transaction persistence requires an Atlas cluster or replica set that supports sessions and transactions.

## Frontend

Open a second PowerShell window:

```powershell
cd frontend
npm ci
npm run rc10_73_3:verify
npm run dev
```

The release gate verifies the durable Brain proposal ledger, hash chain, optimistic concurrency, independent review authority, architecture-rule waiver separation, semantic graph freshness and current release metadata. Managed database, dedicated browser transaction-workflow, production infrastructure and live model-provider acceptance require separate organisation-managed environments.
