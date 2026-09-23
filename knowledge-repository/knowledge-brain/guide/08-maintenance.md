# Make maintenance small and repeatable

At the end of a work session, process a small number of inbox items. Link useful notes, record unresolved questions, and remove accidental duplicates only after preserving source references.

Run the local link checker. It verifies file targets, detects ambiguous wiki links and rejects links outside the selected vault. It does not validate heading anchors or external website availability.

Rebuild from explicit source selections and compare the statistics and source hashes. A changed hash deserves investigation; it is not proof that a source improved. Keep source manifests outside the mutable wiki.

Automation should produce a reviewable proposal and a receipt. Do not schedule unattended promotion or canonical graph mutation. This toolkit has no scheduler or background model calls.

Continue with [evaluation](09-evaluation.md).
