# rc.10.78.2 login and landing redesign report

Generated: 2026-07-18T22:45:10.7669688+01:00
Status: implemented and statically verified; browser acceptance pending

## Outcome

The public project hub now leads with the restrained product progression “Start with intent / Design with evidence / Validate what gets built”. Enterprise access and persistence posture are visible without exposing implementation detail. Development authentication remains available only when explicitly enabled.

When PostgreSQL is the configured durable store, project creation and project loading now fail closed on API failure. They no longer silently substitute browser-local demo state. Local sample fallback remains available only for the explicit in-memory development adapter.

## Verified controls

- `backend/.env` remains ignored and outside Git.
- No secret value is rendered, recorded, hashed or copied into release evidence.
- Database status is obtained through the storage-status API.
- Durable-store connectivity failure is explained to the user and disables project creation.
- Created project members are persisted through the project repository transaction.
- Product and enterprise persistence copy are concise and user-facing.

## Remaining acceptance

The full landing and authentication state matrix, keyboard flow, responsive layout and both role-specific browser journeys remain to be exercised in managed Chromium. Until that evidence exists, this report does not claim browser acceptance or production acceptance.

`productionAccepted=false`
