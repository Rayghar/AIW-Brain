# Gate 6B replacement bounded-smoke approval request

Generated: 2026-07-16T13:43:17.071Z

Status: **not approved and not executed**. Production accepted: **false**.

The fail-closed model-identity contract is now configured for provider `openai`, exact requested snapshot `gpt-4.1-mini-2025-04-14`, and purpose `governed-candidate-semantic-transformation`. The alias `gpt-4.1-mini` is retained only as governed identity metadata. The sole allowed snapshot is `gpt-4.1-mini-2025-04-14`; wildcard, prefix, regular-expression matching, fallback, and substitution are prohibited.

The original alias-based smoke remains a rejected historical transaction at `GATE_6B_LIVE_BOUNDED_SMOKE_RESULT.json` with SHA-256 `sha256:4196e360f301e6a394131b297a06cee5c95c86c482ad9bedded36896899cb59a`. A replacement run will write a separate replacement receipt and will not rewrite that historical evidence.

Proposed command from `backend` after explicit product-owner approval:

```powershell
node --env-file-if-exists=.env --import=tsx scripts/rc10-73-8/run-gate-6b-live-bounded-smoke.mts --approved-replacement-smoke
```

Limits: one call, zero retries, concurrency one, one previously approved public bounded passage, at most 8,000 input characters, at most 1,500 output tokens, no tools, no web search, no external retrieval, no code execution, candidate-only persistence, zero automatic promotion, and zero Design Graph mutation.

Do not run the full Gate 6B pilot. Gate 6C remains blocked and Gate 6D has not started.
