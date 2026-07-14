# rc.10.73.5 Known Limitations

1. **No live repository refresh was executed.** The container had no outbound GitHub DNS/network path and no enterprise GitHub App credentials. The release records 0/30 immutable live snapshots.
2. **Direct source coverage is still shallow.** Only 14 approved source claims exist, mapping directly to approximately 0.3% of Pattern DNA records.
3. **Editorial synthesis is not source evidence.** The 984 editorial claim receipts now have explicit lineage but cannot be used as production scoring, hard constraints or conformance authority.
4. **Licence disposition is incomplete.** Ten approved repositories are verified; twenty remain `requires-review`.
5. **No repository-derived record is production scoring-calibrated.** The release correctly reports zero scoring-calibrated Pattern DNA records.
6. **Live claim extraction was not exercised.** The connector, quarantine and extraction pipeline exists, but this build did not execute it against current repository content.
7. **No semantic contradiction corpus was produced.** The current approved direct claim set contains no polarity conflicts; future live extraction will likely create context-sensitive contradictions requiring human resolution.
8. **Frontend user experience was not expanded.** The new posture is exposed through API and release evidence; a dedicated Knowledge Conversion dashboard remains future work.
9. **Full TypeScript rebuild was not executed in this container.** Installed workspace dependencies were absent. Source and compiled JavaScript were updated together, and no-dependency syntax/policy tests passed.
10. **Production acceptance remains false.** Managed infrastructure, live providers, enterprise KMS, independent human review and controlled enterprise pilot remain open.
