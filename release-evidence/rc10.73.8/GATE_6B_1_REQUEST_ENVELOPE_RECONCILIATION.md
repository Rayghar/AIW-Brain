# Gate 6B.1 request-envelope reconciliation

The committed preparation estimate of 40 calls (`24 + 10 + 6`) does not survive deterministic construction from the accepted 24-case manifest when every strategy must receive all 24 cases.

Measured dry-run planning produces:

- 24 one-unit requests;
- 17 same-source requests, because the 24 cases span 16 repositories and cross-source batching is prohibited;
- 18 architecture-group requests, because only six architecture groups contain two selected cases and unrelated groups cannot be combined;
- 59 total requests.

The corresponding maximum token envelope is 151,704, above the 120,000 ceiling. The likely estimate is 86,804 tokens, but the runner gates on the maximum envelope to remain fail closed. Eight requests also exceed the governed 8,000-character per-request input boundary after deterministic system instructions and evidence metadata are included; the largest planned request is 16,984 characters.

No cases were dropped, no cross-source micro-batch was created, and no unrelated architecture groups were merged to reproduce the earlier estimate. Gate 6B.1 remains controlled-stopped. Resolution requires a new governed decision to increase the call/token envelope or to revise and independently review the benchmark grouping; neither decision is made here.

Network calls, model calls, candidate records, approved-record changes, Design Graph mutations, automatic promotions, and production acceptance remain zero.
