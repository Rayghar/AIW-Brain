// Source-pinned method excerpts and explicitly scoped reference summaries.
export const ARCHITECTURE_SOURCES = {
  "id": "AIW-INTERACTION-1",
  "version": 1,
  "method": {
    "id": "SA-COMPONENT-METHOD",
    "title": "SA Playbook · component composition",
    "file": "SA Playbook_v2.xlsx",
    "fileSha256": "d3ee19a22e664b365a0e3d618bf60ebb195788b5578a425d25c8672e7c53e4a6",
    "sheet": "Components GuideBook v2",
    "posture": "User-supplied method; project applicability requires judgement",
    "passages": [
      {
        "locator": "Components GuideBook v2!B19",
        "text": "Extract significant requirements that have the most substantial impact on design.",
        "sha256": "e31c51280a0caa4d3ae7273727613ac93f0c11e1ba4bf3875162d7c1399ec958"
      },
      {
        "locator": "Components GuideBook v2!B20",
        "text": "Categorize drivers into business, functional, quality, and constraints.",
        "sha256": "eb72d8a8e20dd13d734c6fbae47947a393d23dd292fe82efb5bc9e9360a62f07"
      },
      {
        "locator": "Components GuideBook v2!B21",
        "text": "Prioritize drivers based on importance and potential impact.",
        "sha256": "0ed03284d612c7ef6aa35d7b1cc5db28aa2bd843403a7299e3f4e55b06e00311"
      },
      {
        "locator": "Components GuideBook v2!B35",
        "text": "Evaluate components for cohesion (elements within a component should be logically related) and coupling (minimize dependencies between components).",
        "sha256": "8f254eb0d40a5d892252c3760e262aa725b7f350797ca6c27d47c7f8cb2b9994"
      },
      {
        "locator": "Components GuideBook v2!B43",
        "text": "Evaluate data flow, communication mechanisms (function calls, events, messages), and synchronous vs. asynchronous communication.",
        "sha256": "c3022604ba6c2155ccd2f84c0702b03379fd27dcb80a5b0b96747d14129bafef"
      },
      {
        "locator": "Components GuideBook v2!B76",
        "text": "Analyze dependencies between components and identify potential coupling issues.",
        "sha256": "3f0bbea7e5be3ee9d8f5c4fc877dd3635edf7d70f1e8c282032dd90d50661f39"
      },
      {
        "locator": "Components GuideBook v2!B78",
        "text": "Data Coupling: Sharing data through databases or message queues.",
        "sha256": "f0f914f706d92535ed92e2722e983dcab77c59f74312a9277bf9f5b46d8cb223"
      },
      {
        "locator": "Components GuideBook v2!B79",
        "text": "Control Coupling: One component controlling the execution flow of another.",
        "sha256": "2ee6a77fed39f440225c8397e467a8a463f429d8bc585509fa8b46ca6912822a"
      },
      {
        "locator": "Components GuideBook v2!B80",
        "text": "Temporal Coupling: One component depending on the timing or execution order of another.",
        "sha256": "0287b4053d7812aa8b561483c883ac1df05db6c1181e039ffca3bfa01fe16abc"
      },
      {
        "locator": "Components GuideBook v2!B81",
        "text": "Aim for loose coupling where possible, using techniques like asynchronous communication or message queues to decouple components.",
        "sha256": "985ccf8287159f268384cbcd792631171eba05052ce0eaaa762ef797c318d179"
      },
      {
        "locator": "Components GuideBook v2!B100",
        "text": "Clearly document components, responsibilities, interfaces, dependencies, and coupling relationships.",
        "sha256": "bfb95532c46c551391134f560fdd5e6d35ad63c4ed9bc0116d1049a24ddd29b8"
      }
    ]
  },
  "references": [
    {
      "id": "MS-QUEUE-LEVELING",
      "title": "Microsoft · Queue-Based Load Leveling",
      "url": "https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling",
      "section": "Problems and considerations; When to use this pattern",
      "accessedAt": "2026-09-20",
      "posture": "Public reference inspected; local interpretation, no calibrated scoring",
      "statement": "Buffering can absorb intermittent demand if processing capacity catches up. It introduces waiting and operational duties. Immediate final responses may rule it out. Durability, retention and queue capacity need explicit design. Test processing rates and end-to-end completion time.",
      "statementSha256": "8844a8d7455ffd52003d8f2bc7478d7e49785b114230a4117b10ea69736c359c"
    },
    {
      "id": "MS-COMPETING-CONSUMERS",
      "title": "Microsoft · Competing Consumers",
      "url": "https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers",
      "section": "Solution; Issues and considerations",
      "accessedAt": "2026-09-20",
      "posture": "Public reference inspected; local interpretation, no calibrated scoring",
      "statement": "A queue can distribute work among consumer instances. This differs from broadcasting every event to every subscriber. Consumer recovery, repeated delivery and processing order need explicit treatment. Adding consumers does not establish an end-to-end throughput guarantee.",
      "statementSha256": "d24eb0fc468fa6dd73a9a5192fc9668e351c059574d91385d3f09ec390432deb"
    }
  ],
  "authority": {
    "automaticAdoption": false,
    "scoring": false,
    "liveRepositoryIndex": false,
    "modelMutation": "Reviewed architect proposal only"
  },
  "adaptedBackend": [
    "packages/domain/src/architectureDesignGraph.ts",
    "packages/engine/src/patternIntelligence.ts",
    "apps/api/src/architectureBrainOrchestrator.ts"
  ],
  "backend": "AIW_V5_rc10.80.32_CHAPTER5_THIRD_WAVE_FULLSOURCE.zip"
};
