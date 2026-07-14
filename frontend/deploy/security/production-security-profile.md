# AIW v0.10.0-rc.10.11 Production Security Profile

Sprint 8.8.8 hardens the enterprise deployment boundary. Production deployments must set:

```bash
AIW_DEPLOYMENT_MODE=production
AIW_ALLOW_DEV_AUTH=false
AIW_OIDC_ISSUER=https://<enterprise-idp>
AIW_OIDC_CLIENT_ID=<aiw-client-id>
AIW_OIDC_PROVIDER_ID=<provider-id>
DATABASE_URL=postgres://...
```

## Required controls

1. Development authentication is disabled in production.
2. OIDC/proxy-verified claims provide explicit AIW roles.
3. Tenant security policy requires SSO and blocks development auth.
4. Repository connectors remain read-only by default.
5. Runtime evidence is evidence-only until a human-approved mutation policy exists.
6. Candidate knowledge cannot influence production scoring before release promotion.
7. Admin audit export is permission guarded and emits a checksum manifest.
8. RLS acceptance must be run against PostgreSQL before production use.

## Validation commands

```bash
npm run sprint8_8_8:verify
npm run route:permissions:report
node scripts/verify-sprint8_8_8.mjs
```

## Operational note

The in-memory reference profile is acceptable only for local/demo mode. Enterprise pilot and production deployments must use PostgreSQL for tenant isolation, audit durability and RLS acceptance.
