# AIW Requirements Addendum — Living Canvas and Generative Architecture Cursor

**Purpose:** Add normative requirements for the AIW product-moat interaction that is not fully expressed in the current baseline.  
**Status:** Proposed for controlled baselining.  
**Requirement prefix:** `GAC` (Generative Architecture Cursor), `STG` (Stage Transformation Grammar), `AUT` (Autonomy and Human Control), `MFK-G` (Mind Factory Generative Knowledge), `GUX` (Generative UX), `GAT` (Generative Acceptance Testing).

---

## GAC — Generative Architecture Cursor

### GAC-001 — Canvas-native intelligence
**P0 — SHALL:** AIW shall present architecture intelligence at the selected model scope as executable canvas actions rather than requiring users to leave the canvas for routine design decisions.  
**Acceptance:** Selecting an eligible scope produces a context-specific action menu anchored to that scope.

### GAC-002 — Context-sensitive actions
**P0 — SHALL:** Generated actions shall be based on the active project, branch, revision, lifecycle stage, viewpoint, selected scope, upstream model, requirements, drivers, decisions, policies, obligations and active knowledge release.  
**Acceptance:** Changing a material driver, pattern or upstream relationship changes the eligible or ranked actions.

### GAC-003 — Bounded action count
**P0 — SHALL:** The default contextual menu shall display no more than five ranked actions.  
**Acceptance:** Lower-ranked actions remain discoverable without crowding the canvas.

### GAC-004 — Authority rendering
**P0 — SHALL:** AIW shall distinguish deterministic requirements, governed recommendations, architecture inferences, LLM proposals and architect-created content.  
**Acceptance:** Authority class is available visually and through accessible text before acceptance.

### GAC-005 — Explainability
**P0 — SHALL:** Every material generative action shall expose why it appears now, why it applies to the selected scope, what supports it, what it changes and what happens if it is omitted.  
**Acceptance:** Explanation traces to requirements, drivers, decisions, Pattern DNA, policy and knowledge release where applicable.

### GAC-006 — Ghost preview
**P0 — SHALL:** AIW shall preview all proposed nodes, relationships, interfaces, boundaries, obligations and lineage before model mutation.  
**Acceptance:** The user can inspect before/after topology and affected objects.

### GAC-007 — Atomic mutation
**P0 — SHALL:** Accepted generative actions shall apply as atomic, idempotent and reversible mutation sets.  
**Acceptance:** Partial mutation is rolled back on validation or persistence failure.

### GAC-008 — Staleness protection
**P0 — SHALL:** AIW shall invalidate or recompute a proposal when its project revision, selected scope or governing knowledge release changes.  
**Acceptance:** A stale proposal cannot be committed.

### GAC-009 — Scope focus queue
**P0 — SHALL:** AIW shall maintain a resumable queue of upstream scopes that are complete, active, deferred, skipped, blocked or unresolved for the target stage.  
**Acceptance:** The architect can leave and resume without losing stage progress.

### GAC-010 — Progressive continuation
**P1 — SHALL:** After a mutation is accepted, AIW shall recompute context and guide the user to the next unresolved scope or action.  
**Acceptance:** The flow does not require manual re-selection of the stage context after every accepted change.

### GAC-011 — Empty-canvas intelligence
**P1 — SHALL:** Invoking the cursor on empty canvas shall offer stage-appropriate actions such as add scope, generate candidate structure or import an approved template.  
**Acceptance:** Empty-canvas actions differ from object-scoped actions.

### GAC-012 — User correction
**P0 — SHALL:** The architect shall be able to edit a proposed topology before acceptance.  
**Acceptance:** Edited content retains provenance and records the architect's modification.

---

## STG — Stage Transformation Grammar

### STG-001 — Governed transformation grammar
**P0 — SHALL:** Each lifecycle transition shall be governed by a versioned transformation grammar rather than only static entity-kind mappings.  
**Acceptance:** The grammar declares source/target families, decomposition rules, relationship propagation, interfaces, obligations and completion conditions.

### STG-002 — Requirements to logical design
**P0 — SHALL:** AIW shall transform accepted requirements, responsibilities and quality forces into candidate logical domains, capabilities, services, APIs, events and data ownership.  
**Acceptance:** Every generated logical element traces to intent, decision or approved pattern.

### STG-003 — One-to-many decomposition
**P0 — SHALL:** A source scope may generate multiple target objects when responsibilities, interfaces or quality tactics require decomposition.  
**Acceptance:** The engine is not limited to one generic target per source node.

### STG-004 — Many-to-one realization
**P1 — SHALL:** Multiple upstream responsibilities may be realized by one downstream object when justified.  
**Acceptance:** The proposal explains consolidation and preserves all lineage links.

### STG-005 — Relationship propagation
**P0 — SHALL:** Upstream relationships shall be preserved, refined, remapped or explicitly dispositioned in the target stage.  
**Acceptance:** No upstream relationship silently disappears.

### STG-006 — Interface derivation
**P0 — SHALL:** AIW shall derive candidate interfaces, providers, consumers and contracts from refined relationships.  
**Acceptance:** Generated interfaces carry lineage and review status.

### STG-007 — Boundary derivation
**P1 — SHALL:** AIW shall propose system, trust, deployment and ownership boundaries where implied by stage, policy or pattern.  
**Acceptance:** Boundary-crossing relationships trigger required interface and control checks.

### STG-008 — Quality reasoning chain
**P0 — SHALL:** Quality drivers shall influence design through scenarios, tactics, styles/patterns, responsibilities, components, capabilities and physical realization.  
**Acceptance:** AIW does not jump from a quality label directly to a vendor product without the intermediate rationale.

### STG-009 — Pattern-kit execution
**P0 — SHALL:** Accepted Pattern DNA shall be able to generate applicable components, relationships, interfaces, obligations, risks and fitness tests.  
**Acceptance:** Pattern application visibly changes the canonical model and evidence ledger.

### STG-010 — Stage finalization
**P0 — SHALL:** A stage shall not finalize until all upstream scopes and relationships are completed or explicitly dispositioned.  
**Acceptance:** Finalization reports completeness, lineage, interfaces, obligations and open evidence.

### STG-011 — C4 projection
**P1 — SHALL:** AIW shall support System Context → Container → Component decomposition as a governed projection over the canonical model.  
**Acceptance:** C4 levels preserve stable canonical identities and do not create a separate source of truth.

### STG-012 — Non-C4 lifecycle support
**P0 — SHALL:** C4 support shall not constrain AIW's logical application, realization, technology, deployment, security, resilience, data and traceability models.  
**Acceptance:** Transformation grammars remain based on the canonical metamodel.

---

## AUT — Autonomy and Human Control

### AUT-001 — Guide mode
**P0 — SHALL:** AIW shall offer a mode that presents one next action at a time.  
**Acceptance:** The user controls every accepted mutation.

### AUT-002 — Compose mode
**P0 — SHALL:** AIW shall offer a mode that proposes a coherent local topology for the selected scope.  
**Acceptance:** The topology is previewed and accepted as one reviewable mutation set.

### AUT-003 — Draft Stage mode
**P1 — SHALL:** AIW shall offer a mode that proposes a complete target-stage draft divided into scope-level change sets.  
**Acceptance:** The architect may accept, edit, reject or defer each scope independently.

### AUT-004 — No silent mutation
**P0 — SHALL:** No deterministic, knowledge-derived or LLM-generated proposal shall mutate the canonical model without accountable user acceptance.  
**Acceptance:** Architecture mutation requires actor, project revision and rationale evidence.

### AUT-005 — LLM non-authority
**P0 — SHALL:** LLM output shall never own scoring, policy, stage approval or model validity.  
**Acceptance:** Provider output passes schema, eligibility, policy and canonical validation before preview.

### AUT-006 — Offline continuity
**P0 — SHALL:** Guide and Compose workflows shall remain usable without an external LLM.  
**Acceptance:** Deterministic and governed-knowledge actions remain available during provider outage.

### AUT-007 — Rejection learning boundary
**P0 — SHALL:** Acceptance, rejection and edits may influence ranking and curation queues but shall not directly rewrite approved knowledge.  
**Acceptance:** Knowledge changes require Mind Factory review and release promotion.

---

## MFK-G — Mind Factory Generative Knowledge

### MFK-G-001 — Generative-depth score
**P0 — SHALL:** Pattern DNA and stage kits shall carry a generative-depth score indicating whether they can produce usable topology, interfaces and obligations.  
**Acceptance:** Structurally complete but non-generative records are visible and cannot masquerade as executable patterns.

### MFK-G-002 — Stage kits
**P0 — SHALL:** Each lifecycle stage shall have governed object, interface, relationship, obligation and review kits.  
**Acceptance:** Stage kits are versioned in the active knowledge release.

### MFK-G-003 — Tactic mapping
**P0 — SHALL:** Approved quality tactics shall map to relevant pattern, component, capability and test options.  
**Acceptance:** Driver-sensitive action ranking can cite the tactic chain.

### MFK-G-004 — Transformation fragments
**P0 — SHALL:** Approved knowledge may provide reusable transformation-grammar fragments.  
**Acceptance:** Fragments are schema-validated, provenance-bound and human-reviewed.

### MFK-G-005 — Counterfactual explanation
**P1 — SHALL:** High-impact generative records shall explain consequences of omission and alternatives.  
**Acceptance:** Cursor actions can answer why an element is recommended and what changes if it is not selected.

### MFK-G-006 — Outcome feedback queue
**P1 — SHALL:** The Mind Factory shall receive aggregated accept, reject and edit outcomes for curator review.  
**Acceptance:** No outcome is automatically promoted into production knowledge.

---

## GUX — Generative User Experience

### GUX-001 — Canvas dominance
**P0 — SHALL:** The architecture canvas shall remain visible and dominant during generative authoring.  
**Acceptance:** Guidance, evidence and consequences appear as contextual overlays or drawers rather than replacing the canvas.

### GUX-002 — Eligible-scope states
**P0 — SHALL:** AIW shall render ready, active, complete, deferred, blocked and preserved scope states.  
**Acceptance:** State meaning is available without relying solely on colour.

### GUX-003 — Keyboard equivalence
**P0 — SHALL:** Every cursor action shall be operable by keyboard.  
**Acceptance:** A complete decomposition journey can be completed without pointer input.

### GUX-004 — Accessible preview
**P0 — SHALL:** Ghost topology and consequences shall have accessible textual equivalents.  
**Acceptance:** Screen-reader users receive created/removed object and relationship summaries.

### GUX-005 — Reduced motion
**P1 — SHALL:** Highlighting and cursor animation shall respect reduced-motion preferences.  
**Acceptance:** No essential information depends on animation.

### GUX-006 — Noise budget
**P0 — SHALL:** The cursor shall enforce a contextual action and signal noise budget.  
**Acceptance:** The default surface shows only the highest-value actions and blockers.

### GUX-007 — Experienced-user acceleration
**P1 — SHALL:** Experts shall be able to invoke Compose or Draft Stage mode and use keyboard commands to avoid excessive click sequences.  
**Acceptance:** The guided experience does not force one-object-at-a-time authoring.

---

## GAT — Acceptance and Evaluation

### GAT-001 — Context sensitivity benchmark
**P0 — SHALL:** Benchmark scenarios shall prove that action rankings change appropriately when requirements, drivers, styles, patterns or policies change.  
**Acceptance:** Static identical menus fail the benchmark.

### GAT-002 — Relationship preservation benchmark
**P0 — SHALL:** Context-to-container and container-to-component tests shall prove that upstream relationships are preserved, refined or dispositioned.  
**Acceptance:** Silent relationship loss is a release blocker.

### GAT-003 — Expert correctness review
**P0 — SHALL:** Independent architects shall evaluate generated decompositions for correctness, completeness and trade-off quality.  
**Acceptance:** Output existence alone is not a pass.

### GAT-004 — Traceability gate
**P0 — SHALL:** Every generated material element shall trace to a requirement, quality tactic, pattern, decision, policy or explicit architect action.  
**Acceptance:** Orphaned generated elements block stage finalization.

### GAT-005 — Reversibility gate
**P0 — SHALL:** Every accepted generative action shall be reversible without corrupting subsequent accepted work.  
**Acceptance:** Undo and branch comparison tests pass.

### GAT-006 — Provider outage gate
**P0 — SHALL:** The golden journey shall remain usable when all external LLM routes are disabled.  
**Acceptance:** Deterministic and governed knowledge paths complete the lifecycle.

### GAT-007 — Scale gate
**P1 — SHALL:** Cursor actions and previews shall meet defined latency budgets on the 1,500-node / 5,000-relationship reference model.  
**Acceptance:** Scoped context computation prevents whole-graph pointer latency.

### GAT-008 — Full lifecycle golden journey
**P0 — SHALL:** A representative project shall progress from requirements to SDD through the Living Canvas with progressive model enrichment and stable lineage.  
**Acceptance:** Screenshots, event traces, mutation sets, Viewbook views and final SDD are retained as evidence.
