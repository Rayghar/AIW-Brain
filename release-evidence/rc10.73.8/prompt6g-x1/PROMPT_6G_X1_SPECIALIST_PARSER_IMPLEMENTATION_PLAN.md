# Prompt 6G X1 specialist parser implementation plan

Generated: 2026-07-17T13:27:09.482Z

Status: implementation-ready backlog; no parser is claimed complete. Production accepted: false.

1. YAML structural parser (1,989): parse locally with aliases bounded, remote includes prohibited, macros and tags treated as opaque, preserve source ranges and exact scalars.
2. Topology parser (745): parse Terraform/PlantUML/DSL structures without evaluation, remote modules/includes prohibited, record unsupported expressions.
3. XML model parser (364): disable DTD and external entities, preserve namespaces/attributes/relations and reject expansion.
4. Architecture-model parser (169): preserve Draw.io/SVG/C4/model graph structures without executing embedded scripts or links.

Each parser needs fixtures, schema validation, deterministic replay, denominator-preserving error dispositions, and a governed reroute after exact facts are emitted.
