# AIW Offline Intelligence Architecture

Version: v0.10.0-rc.10.17  
Sprint: 8.9.4

## Principle

Offline AIW runs the authoritative part of the mind: deterministic kernel + signed knowledge release + local project state. The LLM is optional.

## Offline components

```text
PWA shell
→ local project store
→ deterministic kernel
→ signed knowledge pack
→ local retrieval/index
→ Review Studio
→ ADR/SDD/handoff export
```

## Required offline capabilities

- open and edit a project,
- run guided journey templates,
- rank quality drivers from the pinned release,
- recommend patterns and tactics,
- perform graph/model checks,
- run Review Studio,
- generate ADRs and fitness tests,
- generate handoff pack,
- show release ID, source provenance and assumptions,
- import a newer signed knowledge pack when available.

## Explicit non-capabilities unless locally configured

- live GitHub/repository scanning,
- cloud semantic retrieval,
- hosted LLM brief extraction,
- tenant-wide release promotion,
- CI fitness-loop updates,
- external policy validation,
- fresh source ingestion.

## Offline storage model

| Data | Storage | Notes |
|---|---|---|
| Project model | IndexedDB/local file | User-controlled export/import |
| View state | IndexedDB/local file | Separate from semantic model |
| Knowledge pack | PWA cache / local file | Signed, manifest-verified |
| Evidence receipts | Project-local | Tied to release ID |
| Handoff exports | Browser download | ZIP/JSON/Markdown |

## Offline honesty labels

The UI must label:

- active release ID,
- release age,
- offline mode,
- disabled cloud routes,
- disabled live repository evidence,
- draft/non-scoring content,
- insufficient grounding.

## Security

Offline knowledge packs must be verifiable before activation. AIW must refuse unsigned, mismatched, corrupted or expired packs unless an explicit development-mode override is active.
