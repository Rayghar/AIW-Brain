# Connected sources and operations

AIW reads an explicitly configured source, retains its original response in a resumable job, and presents a model change preview. Source status is an assertion. A passing workflow does not establish coverage of a requirement or certify the design. AIW does not post issues, comments, messages or deployment changes through these adapters.

## Configure a private source

Set `AIW_CONNECTIONS_JSON` in the server runtime to a JSON array. Each profile has a unique `id`, `title`, supported `kind`, HTTPS `url`, and explicit `owners` containing the authenticated project owner's ID. Keep tokens in server environment variables named `AIW_CONNECTION_TOKEN_<NAME>`. Profiles without an owner allowlist are unavailable.

For the local package, the single identity is `local-architect`. Put JSON on one line in `.env`; the launcher reads this file locally. Do not put credentials in project sources, Git or exports. Restart after configuration changes. Hosted runtime settings require a new deployment to apply.

```json
[
  {
    "id": "delivery-issues",
    "title": "Delivery issues",
    "kind": "github-issues",
    "owners": ["local-architect"],
    "url": "https://api.github.com/repos/YOUR_ORG/YOUR_REPO/issues",
    "tokenEnv": "AIW_CONNECTION_TOKEN_GITHUB"
  }
]
```

In Sol, open **Chapter tools → Project evidence and saved perspectives → Sources & operations → Connected sources**. Connect an available profile, read an update, run the saved job, select observations and map them to requirement IDs. Review differences and resolve local/source conflicts before applying. An unchanged repeat does not duplicate records. Changed credentials or connection settings require a fresh read when their configured profile changes. Token rotation alone preserves the profile identity; its source response still receives an integrity check.

## Supported source contracts

| Kind | Endpoint / response | Scope and limits |
| --- | --- | --- |
| `github-issues` | `https://api.github.com/repos/ORG/REPO/issues` | GET; 100 per page, explicit next page; excludes pull requests. Imported as defects, requiring project interpretation. |
| `github-actions` | `https://api.github.com/repos/ORG/REPO/actions/runs` | GET; 100 per page. Workflow SHA, attempt and reported conclusion retained; coverage remains unverified. |
| `jira` | `https://TENANT.atlassian.net/rest/api/3/search/jql?jql=...` | Enhanced GET JQL search, 100 per page, opaque next-page token. Atlassian document text is flattened; the original response is retained. |
| `azure-work-items` | `https://dev.azure.com/ORG/PROJECT/_apis/wit/workitems?ids=1,2` | GET API 7.1, up to 200 explicitly selected work item IDs. WIQL execution and write-back are not implemented. |
| `runtime-json` | Public HTTPS returning `aiw.delivery.v1` | Up to 200 observations with external IDs and evidence context; map each to requirements. |
| `openapi-json` / `asyncapi-json` | Public HTTPS returning a JSON specification | Uses Chapter 8's bounded supported subset. Preview caller/provider mapping and unsupported semantics. Not a complete standards conformance engine. |

Bearer tokens are the default. For a service requiring HTTP Basic authentication, set `"auth":"basic"`; its token variable must contain the base64-encoded service-approved user/token pair. Credentials are never included in project exports. Use service credentials scoped to the configured read operation. Requests reject redirects, use a 25-second deadline and a 2 MB response limit. Endpoints are server administration inputs; these adapters do not provide arbitrary user-selected URLs or autonomous crawling.

Provider documentation used for these contracts: [GitHub issues](https://docs.github.com/en/rest/issues/issues), [GitHub workflow runs](https://docs.github.com/en/rest/actions/workflow-runs), [Jira enhanced issue search](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/), [Azure work items](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/list?view=azure-devops-rest-7.1).

## Jobs, disclosure and usage

Jobs persist their inputs, attempts, lease and immutable output. Run/retry is explicit; hosted requests can finish in the Worker context after the HTTP response. Expired leases may be resumed. There is no unattended scheduler or deployment agent. The project allows 30 prepared jobs per hour and three failed attempts per job. Lists show the latest 100 jobs; saved IDs remain retrievable.

The project owner can disable external AI, reduce the hourly generation and rolling token budgets, mask recognizable contacts, and exclude selected object records. Masking is a heuristic, not a complete PII classifier. Excluding a record does not redact its contents if someone repeated them in a different source; inspect the prepared packet before sending. Semantic search sends its query and eligible source excerpts during retrieval, before model generation. Token reservations include retrieval, generation and the second source check. A failed request retains its reservation when actual provider usage is unknown.

Organisation guidance requires independent authenticated review before a signed immutable release. Project adoption preserves its exact source and conditions. Withdrawal or expiry blocks new use and creates a review finding for recorded adaptations. Local mode has one identity and cannot demonstrate independent approval.

## Recovery

Chapter 11 and Project operations can export a portable recovery package with a checksum, hydrated project, original workbooks, source snapshots, evidence attachments and historical collaboration records. Restore/import creates a separate private project. Server secrets and access grants are excluded; imported reviews are historical assertions and organisation guidance must be adopted again.

Portable recovery uses a checksummed gzip JSON envelope for larger projects. It is bounded to 12 MB in transit, 64 MB after decompression, 7 MB of original source bytes and 200 files. Decompression enforces the declared byte count before parsing. For larger local projects, stop AIW and copy the entire `.aiw-local` directory together with the matching code version. Copy both SQLite and file storage, not just the database. Restore into a separate directory first and verify original sources and model counts. This is a tested portable restore path, not a claim of automated enterprise backup or disaster recovery coverage.
