# AIW v0.10.0-rc.10.73.6 Release Report

## Release objective

Replace the partial, capped and split GitHub ingestion approach with an operational acquisition plane capable of processing the complete governed scope of every approved repository without pretending that an unavailable network or unresolved human approval has passed.

## Implemented

1. **One live-acquisition runner for all 30 approved repositories by default.**
   - registry-driven selection;
   - optional connector subsets for controlled retries;
   - current GitHub REST API version `2026-03-10`, configurable by environment;
   - authenticated token support without embedding credentials.

2. **Immutable and complete repository acquisition.**
   - default branch resolution and immutable commit pinning;
   - recursive Git tree acquisition;
   - safe recovery when GitHub marks a recursive tree as truncated;
   - allow and deny glob policies with deny precedence;
   - file-size enforcement;
   - policy `maxFilesPerRefresh` converted into a batch size rather than a total-corpus cap.

3. **Durable, resumable processing.**
   - per-repository checkpoints;
   - changed-blob reprocessing only;
   - bounded fetch concurrency;
   - exponential retry and rate-limit handling;
   - per-file accepted, rejected, failed and resumed states.

4. **Cryptographic source integrity.**
   - independent Git blob SHA-1 verification;
   - content SHA-256 receipts;
   - immutable snapshot IDs;
   - manifest re-verification.

5. **Expanded quarantine.**
   - private-key and token shapes;
   - cloud credentials;
   - credential-bearing database URLs;
   - bearer tokens and inline secrets;
   - binary and malformed content;
   - embedded scripts;
   - prompt-injection-shaped text;
   - generated or minified-content warnings;
   - no source execution.

6. **Licence evidence without false legal clearance.**
   - repository licence endpoint evidence;
   - SPDX identifier, path, SHA and repository URL;
   - retained dossier review status;
   - explicit human-review disposition.

7. **Deterministic architecture-document parsing.**
   - Markdown and AsciiDoc sections;
   - bounded candidate claims;
   - exact repository, commit, path, heading, line range, excerpt and excerpt hash;
   - candidate-only authority until independent review and promotion.

8. **Operational deployment material.**
   - connectivity preflight;
   - live acquisition CLI;
   - complete-scope verification gate;
   - environment profile and Kubernetes CronJob example.

## Direct connection attempt

A direct `git ls-remote` connectivity check was executed against all 30 approved repositories. The execution container could not resolve `github.com`; all 30 attempts failed at DNS resolution before authentication or repository access. The release therefore records 0/30 live refreshes and does not claim production acceptance.

## Honest boundary

The acquisition implementation and offline verification are complete for this release. The actual repository corpus still requires execution in an environment with outbound GitHub access and a least-privilege token or GitHub App installation where applicable. Licence decisions, independent claim review, expert scoring calibration, signed promotion and production retrieval activation remain human and enterprise-environment gates.
