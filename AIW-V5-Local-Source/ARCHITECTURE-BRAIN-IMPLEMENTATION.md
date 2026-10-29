# AIW Architecture Brain implementation slice

This source package builds on the supplied AIW source snapshot (`caa42e9`). It is a verified local implementation, **not a published Site version**. The payment fixture demonstrates authority and scope gates with fabricated source lines. It is not a reviewed payment decision.

## What is implemented

- A typed architecture interpretation lives inside the existing original → candidate claim → independent review → release → activation lifecycle. A unit records its mechanism, product/capability/configuration scope, possible quality effects, obligations and exclusions. Its exact content is included in review and release integrity checks.
- The reviewer inspects the original passage, source use note, conditions, limits and structured unit. Eligibility rechecks the authenticated second actor, source/use/applicability attestations, source hash, signed repository receipt where required, active release and withdrawal.
- The Brain relates a reviewed claim to the selected Chapter 7 realization and named options, with release-qualified identifiers. Sol's text and semantic retrieval excludes claims that conflict with the saved options, product version or capability. Excluded project objects and source IDs are removed before embedding provider requests as well as final Sol packets.
- Chapter 7 and Design Resources show **Why this choice?** beside an option. The reading distinguishes a structural scope match from missing configuration and exposes the claim's conditions, limitations, quality effects, obligations and authenticated reviewer. It neither changes the option selection nor asserts a measured target.
- A candidate payment pack identifies three illustrative requirements and drivers and the outbox, Kafka and RabbitMQ questions to investigate. It contains official documentation locators and original candidate interpretations, without copied originals or real approvals.

## Verify

From this directory, using the package's existing dependency setup:

```bash
npm run test:payment-knowledge-pilot
node architecture-knowledge-unit-validate.mjs
node brain-governance-ui-validate.mjs
npm run test:brain-integration
npm run test:knowledge-retrieval
npm run test:technology-catalogue
node check-syntax.mjs
npm run build
```

The payment suite includes tests that a Kafka 3.9 claim cannot inform a RabbitMQ-only or Kafka 4.0 realization, and that excluded claims or originals never enter the embedding request. Provider transport, review actors and source lines are synthetic. A live browser walkthrough and private deployment are still unverified.

## Real evidence needed

Use `PAYMENT-ARCHITECTURE-KNOWLEDGE-PILOT.md` as the intake plan. An architect must confirm the actual payment scope and targets, acquire permitted exact originals, have another authenticated architect review each claim and source use, activate a valid release, record the project-specific comparison, run relevant failure and replay observations, and assess the focused case. Whole-project SDD approval remains separate. A rights checkbox records human attestation; the system does not make a legal determination of provider reuse rights.
