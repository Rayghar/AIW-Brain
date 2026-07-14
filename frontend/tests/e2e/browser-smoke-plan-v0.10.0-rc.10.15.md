# AIW Browser Smoke Plan — v0.10.0-rc.10.15

Sprint 8.9.3 adds a lightweight browser-confidence gate for the reference package. The gate validates the production web bundle and critical source contracts without introducing a heavyweight browser runtime into the distributable archive.

## Covered journeys

1. App shell exposes skip navigation and a focusable main landmark.
2. Command palette is available as an accessible modal dialog.
3. Review Studio remains lazy-loaded.
4. Review Studio exposes review report, JSON, handoff ZIP and handoff JSON export actions.
5. Browser ZIP export uses user-triggered dynamic artifact import.
6. Admin Control Plane exposes Model Routes, Repositories, Knowledge Sources, Security & RBAC, and Audit Trail.
7. Pilot Evaluation workspace remains available for controlled enterprise pilot readiness.
8. Built browser bundle contains the Review Studio export and Admin/RBAC surfaces.

Run:

```bash
npm run browser:e2e:smoke
```
