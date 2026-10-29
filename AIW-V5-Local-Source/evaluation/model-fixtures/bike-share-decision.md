# Record each trip once in the trip service, not at the dock

* Status: proposed
* Deciders: the bike share architect, the transport team lead
* Date: 2026-10-02

Neighbourhood bike share · MADR fixture (AIW authored teaching example; no real organisation). Read by interpretMADR (public/madr.js) through the model interpreter: one decision, three alternatives, one chosen.

## Context and Problem Statement

A trip must be recorded exactly once even when a dock loses its mobile connection and reconnects. Where should the record of truth for a trip live: in the dock gateway, which sees the unlock and the return first, or in the trip service, which every other service reads?

## Decision Drivers

* A trip must be recorded exactly once (requirement).
* Unlocking must keep working for ten minutes without the central system.
* Trip locations must not be kept longer than ninety days.

## Considered Options

* Trip service owns the trip record
* Dock gateway owns the trip record
* Both keep a copy and reconcile nightly

## Decision Outcome

Chosen option: "Trip service owns the trip record", because one owner with idempotent event handling meets exactly-once without a reconciliation job, and the dock keeps only the events it has not yet delivered.

### Consequences

* Good, because every reader has one record to trust.
* Bad, because the dock must queue events while offline, which the chosen hardware supports for twenty minutes.

## Pros and Cons of the Options

### Trip service owns the trip record

* Good, because one owner and one idempotency key.
* Bad, because the dock needs an outbox.

### Dock gateway owns the trip record

* Good, because the dock sees the trip first.
* Bad, because forty docks become forty records of truth.

### Both keep a copy and reconcile nightly

* Bad, because the member sees two fees until the night.
