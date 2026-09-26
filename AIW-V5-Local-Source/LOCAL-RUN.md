# Run AIW V5 locally

Source snapshot: `25bab8241fe7e1f86d81bd54e5d8240d1e7dd457` (the private AIW V5 Site source). The ZIP contains the complete frontend, backend, shared model, schema migrations, package lock, and checks. It does **not** contain your hosted projects, local database, dependencies, or secrets.

## Start

1. Install **Node.js 24**. Confirm with `node --version` (it should start with `v24.`) and `npm --version`.
2. Unzip `AIW-V5-Local-Source.zip`. Open a terminal **inside** the extracted `AIW-V5-Local-Source` directory, where `package.json` and `server.js` are located.
3. Run:

   ```sh
   npm ci
   npm start
   ```

4. Open **http://localhost:4173** in your browser. Keep the terminal open. Stop the server with **Ctrl+C**.

The first visit loads an illustrative Bank Payment Journey. Choose **All projects** to create a blank project or another reference copy. Your changes persist in `.aiw-local/project.sqlite`; the folder is created automatically on first run. The local backend uses a development identity for one architect and is meant for local development, not production authentication.

If port 4173 is busy, run `npm start -- --port 5173` and open **http://localhost:5173**. For automatic server restarts while editing files, use `npm run dev`.

The server accepts connections from this computer only (`127.0.0.1`). To try AIW from a phone or another device on the same network, start it with `npm start -- --host 0.0.0.0` (or set `AIW_HOST`) and stop it when you finish. The local backend has no sign-in: anyone who can reach it can open and change your projects as the development architect and use a configured OpenAI key.

## Where the code lives

| Part | Files | Purpose |
| --- | --- | --- |
| Frontend | `public/index.html`, `public/entry.js`, `public/app.js`, `public/*.js`, `public/*.css` | Chapter UI, connected canvas, Sol and Mind Factory, browser-based model interactions. |
| Local backend | `server.js`, `local-db.js`, `local-files.js` | Node HTTP server; SQLite and file adapters for local use. |
| API and services | `worker.js`, root `*-service.js`, `project-storage.js`, `brain-retrieval.js`, `intelligence-provider.js` | Project commands, storage, review, export and optional AI gateway. |
| Shared model | `public/*-domain.js`, `public/architecture-model.js`, `public/architecture-explorer.js` | Domain rules and canonical model used by the frontend and API. Keep the original paths intact. |
| Schema | `drizzle/*.sql`, `db/` | Database migrations and schema. Local SQLite migrations apply automatically. |

The hosted deployment uses the same app logic with managed D1/R2 bindings; `server.js` supplies local substitutes. You do not need to run a separate frontend server or configure a database for local use.

## Check it

Run `npm run check`, `npm run test:connected-model`, and `npm run test:investigation`. The investigation check covers Chapter 4–11 object continuity, scoped relationships and the reviewable contract-to-SDD change. Tests do not prove a real Orbus import, independent knowledge quality or provider behaviour.

## Optional AI connection

The model and rule-based guidance work without an API key. To enable the OpenAI gateway locally, copy `.env.example` to `.env`, put your own key in `OPENAI_API_KEY`, and start with `node --env-file=.env server.js`. Do not put a key into browser code, commit it, or share the `.env` file. AIW shows **LLM not connected** until configured. With a key and `AIW_LLM_MODEL`, Sol also reasons at the review desk (Chapter 11 → Model, or Validate → Review desk) and in the companion of every chapter model, Chapters 2 to 10 (select a record, or ask for the chapter's round), and for the knowledge stewards (Mind Factory → Architecture in context → Stewards). *Ask Sol* shows what will be sent before anything leaves your machine. To route requests through an OpenAI-compatible gateway, set `AIW_LLM_BASE_URL` (https, or http on loopback).

To carry a hosted project into your local workspace, export its connected project JSON from the hosted project's Chapter 11 Output, then use **All projects → Restore / import project** locally. Review the import preview before applying it; hosted project data is intentionally absent from this source download.

## Optional knowledge repository (on the laptop that holds the corpus)

The acquired architecture corpus becomes searchable in Mind Factory → Sources when the knowledge repository service runs beside the workbench. From this directory:

```sh
npm run repository:init     # once: a service token and a notice key under %LOCALAPPDATA%\AIW\repository-service
npm run repository:build    # index or re-verify the corpus (about a minute)
npm run repository:serve    # keep it running; it listens on http://127.0.0.1:4180 only
```

`repository:init` prints three settings. Add them to `.env` (never commit it) and start the workbench with `node --env-file=.env server.js`. Without them, Sources shows the bundled locators as before. Search results are unreviewed repository text: retrieving one saves the exact original into the project, and it becomes knowledge only through interpretation, review, release and activation. See [KNOWLEDGE-REPOSITORY.md](KNOWLEDGE-REPOSITORY.md), including the live refresh from GitHub and the optional daily task.
