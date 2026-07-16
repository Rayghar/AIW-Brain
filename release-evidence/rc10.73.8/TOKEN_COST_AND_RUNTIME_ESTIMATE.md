# Token, Cost and Runtime Estimate

Generated: 2026-07-16T05:23:31.685Z

The deterministic plan proposes 42,953 model calls after duplicate reuse and deterministic exclusions. Total token demand is estimated at 49,395,950 minimum, 79,463,050 likely and 139,597,250 maximum. The calculation uses 1,000/1,500/2,500 input tokens and 150/350/750 output tokens per semantic unit for the minimum/likely/maximum cases. Estimated input volume is therefore 42,953,000 to 107,382,500 tokens; estimated output volume is 6,442,950 to 32,214,750 tokens.

Estimated elapsed runtime is 21,477 seconds at two calls per second, 85,906 seconds at one call per two seconds, and 429,530 seconds at one call per ten seconds. These are planning scenarios, not measured model throughput. Candidate index size is estimated at 87,967,744 to 351,870,976 bytes; deterministic Gate 6A ledgers actually measured 329,784,477 bytes. Gate 6A reserved 1,073,741,824 temporary bytes and 805,306,368 permanent bytes for its local deterministic processing envelope.

No provider pricing, throughput or elapsed time is asserted. The AIW runtime is unconfigured, the explicit model-name allowlist is absent, and current pricing would require fresh approved external verification. Gate 6B must establish actual token use, concurrency, retry/dead-letter behavior and cost receipts before any Gate 6C projection is approved.
