# Candidate knowledge, four eyes and the Brain chain — implementation plan (v20.2)

Controlling baseline: **AIW v0.10.0-rc.10.73.6**. Branch: `release/aiw-v0.10.0-rc.10.73.6-knowledge-four-eyes`, from v20.1 at `62542ae`.

The sponsor approved three items from the review of the older TypeScript backend (rc10.91.1), plus a confirmation that the Brain is wired end to end through the knowledge repository to the LLM.

## 1. One identity for a file, whichever way it is read

- The GitHub transport decodes UTF-8 with the byte-order mark stripped. The corpus transport keeps it.
- So a file that starts with a BOM gets a different SHA-256, and a different contract-v1 identity, depending on how it was retrieved.
- A live GitHub read of such a file with the corpus's expected hash therefore fails. Signed receipts and invalidations would also not bind across the two transports.
- Fix: the GitHub transport keeps the BOM, like the corpus. A test reads the same BOM file both ways and gets one identity.

## 2. Four eyes on every claim

- **Today:** v20 requires an independent authenticated reviewer only for repository claims, and checks it only when a signed release receipt is applied. For any other claim, the author can verify their own interpretation, and it then reaches Sol.
- **Change:**
  - `knowledge.review` refuses a reviewer whose authenticated identity is the claim's author.
  - Eligibility re-checks this on every read, so an older self-reviewed claim stops reaching Sol, releases and links until another person reviews it. The workbench says why.
  - The repository-claim rule at signing is unchanged.
- **Consequence:** one person alone can no longer complete a review. The hosted workbench already authenticates each person. The laptop server stamps every request as the same person.
- **Opt-in local accounts in `server.js`:**
  - Configured through `AIW_LOCAL_ACCOUNTS` in `.env`: account IDs with their own secrets, at least 16 characters each.
  - A sign-in page and an HMAC-signed, HttpOnly, SameSite=Strict session cookie.
  - Without that setting the server behaves as today.
  - Two local accounts are two people only when two people hold them. The report says so.
  - The second person needs the editor role, added by the owner in Project team.
- **Tests:** the suites whose review steps reuse the author's identity move those steps to a second identity.

## 3. The older backend's candidate set BK-P2-20260911

- **The set:** 15 pinned sources, 42 exact passages and 18 curated candidate assets, all marked candidate-only.
- **Retrievable here:** 12 of the 15 sources are retrievable in v20.
  - Two Apache Camel files are JSON models, not documentation.
  - The AsyncAPI specification is over the 60,000-byte source limit.
- **The pack:** `candidate-sets/bk-p2-20260911.json`, converted from the set.
  - It holds locators, hashes, licences and the curator's own interpretations. It holds no third-party text: exact passages come from the laptop corpus at import time.
  - Each asset becomes one candidate claim, anchored on its mechanism passage in a retrievable source and checked against the real corpus when the pack is built.
  - Conditions come from the asset's conditions. Limitations come from its exclusions and trade-offs. Provenance goes in tags.
- **The importer:** `scripts/import-candidate-set.mjs` retrieves each exact original (`knowledge.fetch` through the corpus) and creates each candidate claim (`knowledge.claim`). It uses the one command path, as the signed-in person, and is idempotent, with a dry run.
- Nothing is reviewed, released or activated by the import.

## 4. The Brain chain, end to end

One suite runs the whole path against the synthetic corpus, two authenticated identities and the provider test double:

corpus passage → exact original → candidate claim → review by a second person → release → signed receipt → activation → link to a record → Sol's packet → Sol's assessment citing it.

A laptop run imports the real BK-P2 set into a disposable project as evidence.

## Verification

- Focused suites.
- The browser suites for Sources and stewardship.
- The full regression.
- The v20.2 package with SHA-256, from a clean extract.

## Boundaries

- No live provider call, and no real second reviewer. The suites use synthetic identities, and say so.
- No licence clearance.
- Importing into the sponsor's own project is their decision: the report gives the command.
- `productionAccepted` stays `false`.
