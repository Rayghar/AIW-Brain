# Gate 6B.2 continuation result

Status: **failed closed after transport recovery**

The transport gate passed, capacity recovered above the controlled-stop floor, and the frozen continuation began through the governed gateway. `G6B2-REQ-01` completed and checkpointed with 2,557 tokens and zero candidate records. `G6B2-REQ-02` returned malformed structured JSON and was rejected. Semantic failures are not retryable, so the remaining six requests were not executed.

The complete frozen-label quality evaluation cannot be calculated from this partial run. No unavailable metric, token value or cost has been fabricated. The rejected response's safe telemetry was not flushed before process exit; the runner has been hardened offline so future rejected attempts persist telemetry before termination.

Prompt 6G remains blocked. Production accepted remains false. Gate 6C is blocked, Gate 6D is not started, and backup remains deferred by product owner.
