# Gate 6B epistemic contract alignment

Generated: 2026-07-16T16:39:05.699Z

Status: **implemented for future Gate 6B transformations; historical evidence preserved**. Production accepted: **false**.

Gate 6A's `EPISTEMIC_STATUS_SCHEMA.json` is canonical. Future outputs may use only: `normative-requirement`, `source-stated-recommendation`, `measured-result`, `source-example`, `implementation-observation`, `expert-interpretation`, `sol-inference`, `hypothesis`, `illustration`, `unknown`.

Every claim now carries both a statement origin and an epistemic basis. Source-backed statuses require source origin; `sol-inference` requires Sol origin; and `hypothesis` requires hypothesis origin. Product-runtime Sol cannot assign `expert-interpretation`; that status requires a separate external-review receipt. A normative requirement additionally requires official-specification authority, binding source language, and a `normative-text` basis. These controls prevent an example from becoming a requirement merely because a model assigns a stronger label.

The legacy values `source-asserted`, `model-inferred`, and `uncertain` are not accepted by the strict output schema. `source-asserted` requires context-specific migration to requirement, recommendation, example, implementation observation, or an explicit unknown/review state. `model-inferred` maps to `sol-inference`; `uncertain` maps to `unknown`. Unknown values are rejected.

The three claims in the successful Azure Bicep smoke are assessed as `source-example`, not normative requirements. They describe a worked deployment example and its demonstrated module configuration. The historical receipt remains unchanged; the correction exists only in `GATE_6B_EPISTEMIC_STATUS_MAPPING.json` as a candidate review proposal.

No approved knowledge, production graph, or canonical Design Graph was changed.
