# Mind Factory Provider Binding Runbook

1. Register a repository connector with allowed paths.
2. Create a read-only provider fetch plan.
3. Configure the required target-environment token reference.
4. Execute source refresh only through read-only worker policy.
5. Confirm quarantined snapshot creation.
6. Extract and normalize candidate claims.
7. Run release-impact preview before promotion.
8. Export `.aiw-kpack`.
9. Sign the manifest hash with the configured KMS/HSM provider.
10. Import and activate by tenant/project after verification.

No repository writes, PR creation or architecture mutation are permitted by these operations.
