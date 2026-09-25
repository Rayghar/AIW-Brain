# Read authority and caching

Mind Factory now offers two concerns inside its existing architecture comparison: Flow & completion, and Reads & freshness. The latter compares an authoritative read with cache-aside. Sol enters the same flow. The requirement, quality target, inherited decisions and constraints remain the basis for the comparison.

The visual read path shows the reader, authority and disposable copy. Normal-read, cache-unavailable and source-unavailable views explain the declared behaviour. They are design walkthroughs, not runtime tests. The source-outage view permits a cached result only when the architect chose that policy and the value is present, authorised and within its agreed age bound.

## Reasoning and sources

The read method has a separate immutable identity, `read-design-1` / `AIW-READS-1`, while retaining the version 36 interaction method and its receipts. It uses the SA Playbook component-composition passages and the caching tactic in `Quality Requirements!B3`, with exact locators and hashes. It also records inspected summaries of Microsoft’s [Cache-Aside](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside) and [Caching guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching), accessed 2026-09-20. The authoritative workbook hash is retained from the earlier increment.

Explicit answers establish freshness, permission to cache, access isolation, invalidation, concurrent-fill handling, cold-cache recovery and outage policy. Requiring the latest committed value blocks this cache-aside proposal. Prohibiting a copy also blocks it. Invalid or absent freshness bounds cannot prepare a cache proposal. Low or unknown reuse remains a visible reason to prefer the simpler path. A direct read still requires an explicit source-consistency contract; it does not itself establish freshness.

The typed reasoning graph now includes the information scope and, when selected, its authoritative component. The LLM receives the exact saved comparison and its requirement and quality target. An active comparison keeps its own scenario context even when the canvas selection changes. No unsupported generic boundary option is enabled by a read question. Numerical benefits, actual hit rates and capacity are not invented.

## Reviewed model changes

The authoritative option proposes two application roles, one authoritative data definition, read connectivity, operating obligations and a draft decision. The cache option adds a store component for the disposable copy, a separate derived data definition and lineage, lookup/fill/invalidation relationships, and caching support. Both data definitions retain the business authority; the cache is not made a business-write authority. Existing data ownership and component definitions are retained when reused.

Both approaches use the existing model impact review and explicit acceptance. Inherited interface contracts are now included in the visible proposal before acceptance. They retain open schema and contract obligations for Chapter 8. The preview stamp includes the composition revision, so a pre-update browser cannot accept an older preview without reopening it.

The draft decision retains both options and the working selection. Original reasoning, source receipts and review history enter the SDD. Changes to reused data classification, protection, authority or lineage invalidate a proposal and require source review. Earlier and current data context are shown beside the saved model context. A source review retires outdated draft alternatives.

## Validation and limits

- A non-banking catalogue fixture covers both topologies, blocking conditions, finite age bounds, typed graph endpoints, preserved authority, copy lineage, explicit inherited contracts, existing-data reuse, changed classification, draft decisions and SDD traceability.
- Actual Worker checks cover save, review, acceptance, reopen and owner isolation. Long-policy source packets retain the reasoning graph and selected intent within the existing excerpt budget.
- DOM integration covers both concerns, normal and failed-dependency views, unsaved answers, model review and acceptance. A Chapter 2 variant routes to the exact saved proposal. Existing interaction, guided-design, Brain and LLM regressions pass.
- The browser connection and permitted recovery retry timed out. No rendered desktop/mobile walkthrough or screenshot was obtained. DOM checks do not establish visual layout quality.
- This composition supports application-owned information. A valid external authority remains external; it is not silently replaced. External authority composition, write-through/behind variants, automatic cache sizing, database selection and measured performance remain further work.
- Existing OpenAI configuration is unchanged. No new live provider request was made. Full repository indexing, automatic knowledge refresh and calibrated scores remain outside this increment.

The next design concern is persistence: model access patterns, transactional boundaries and recovery needs before comparing storage approaches. The same source, conditional-reasoning and review contracts should govern that extension.
