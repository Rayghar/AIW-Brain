# Gate 6B.1 resume and checkpoint plan

Generated: 2026-07-16T17:13:35.757Z

- Resume keys are deterministic request checkpoint hashes bound to case IDs and excerpt hashes.
- A completed request is replayed only when its request fingerprint and strict output receipt verify.
- A timeout, HTTP 429, or HTTP 5xx may retry once; schema, identity, lineage, authority, mutation, capacity, or approval failures never retry.
- Each strategy writes an isolated append-only candidate transaction journal. No approved store or Design Graph writer is available to this runner.
- Before each request batch, recheck the 8 GiB controlled-stop floor. At or below the floor, flush the current receipt and stop without deleting evidence.
- Current dry-run blockers: CALL_LIMIT_EXCEEDED, EXECUTION_APPROVAL_MISSING, INDEPENDENT_REVIEW_RECEIPT_INVALID, INSUFFICIENT_DISK_CAPACITY, REQUEST_INPUT_LIMIT_EXCEEDED, TOKEN_AND_COST_APPROVAL_INVALID, TOKEN_ESTIMATE_EXCEEDED.
- Production accepted: false.
