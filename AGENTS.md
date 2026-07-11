<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: JavaScript Best Practices

This standard covers high-impact JavaScript patterns for robustness and safety: reliable async control flow, error propagation, resource cleanup, input validation, network timeouts and retries, config... :
* Avoid async callbacks in Array.forEach/map without awaiting; use for...of for sequencing or Promise.all with explicit concurrency limits.
* Avoid eval, Function, and dynamic import paths from untrusted data; use explicit dispatch maps for extensibility.
* Centralize configuration loading and freeze the exported config object; disallow runtime mutation and avoid reading process.env throughout the codebase.
* Guard shared mutable state across async boundaries with explicit ownership, atomics, or a single-writer queue; avoid read-modify-write on shared objects.
* Propagate errors with original cause using Error options or rethrow; avoid catch blocks that only log or return defaults.
* Release resources deterministically by awaiting stream completion and closing handles in finally; use pipeline/using patterns where available.
* Retry only idempotent operations with bounded attempts, exponential backoff, and jitter; surface the final error without wrapping away the cause.
* Set explicit timeouts and cancellation for every network or IPC request using AbortController and per-request deadlines.
* Use structured logging with stable keys and redaction; avoid logging secrets or whole objects containing credentials.
* Validate and normalize untrusted input at module boundaries using allowlists and type checks; reject extra fields and unexpected encodings.

Full standard is available here for further request: [JavaScript Best Practices](.packmind/standards/javascript-best-practices.md)

# Standard: SQL Best Practices

This standard covers high-impact SQL practices for security, concurrency, transactional correctness, performance stability, and operability. It targets non-obvious pitfalls around isolation, locking, ... :
* Avoid OFFSET pagination on large tables; use keyset pagination with a stable, unique ordering predicate.
* Create composite indexes matching leading equality filters then ordering; avoid indexing only low-selectivity columns or mismatched column order.
* Enforce data invariants with constraints; prefer CHECK, FOREIGN KEY, NOT NULL, and UNIQUE over application-only validation.
* Keep predicates sargable; avoid applying functions to indexed columns in WHERE and JOIN conditions, and rewrite to range predicates.
* Lock rows with SELECT ... FOR UPDATE when reading values that will be updated in the same transaction; avoid read-then-update without locks.
* Select only required columns in production queries; avoid SELECT * in application-facing SQL and stable interfaces like views.
* Set transaction isolation explicitly at transaction start for any multi-statement write flow; do not rely on session or database defaults.
* Use parameter placeholders for all external values; pass lists via typed arrays or table-valued parameters, not string-built IN clauses.
* Use window functions for “top N per group” and latest-row selection; avoid correlated subqueries with LIMIT per row.
* Write DDL migrations as idempotent steps using IF EXISTS/IF NOT EXISTS and guarded backfills; avoid non-repeatable migrations.

Full standard is available here for further request: [SQL Best Practices](.packmind/standards/sql-best-practices.md)

# Standard: TypeScript Best Practices

This standard covers high-impact TypeScript patterns for runtime boundaries, error and async handling, resource lifecycle, configuration access, logging, retries/timeouts, concurrency safety, and test... :
* Implement retries only for idempotent operations with bounded attempts and backoff; avoid unbounded loops or retrying non-idempotent side effects.
* Keep tests isolated by controlling time, randomness, and global state; avoid tests that depend on real timeouts, Math.random, or shared module singletons.
* Manage resources with deterministic cleanup using try/finally or using; avoid leaving timers, event listeners, streams, or file handles open.
* Model config access with a typed loader that validates required keys and parses types; avoid reading process.env directly across the codebase.
* Prefer immutable data with readonly and avoid exporting mutable singletons; isolate shared state behind functions or classes with explicit update methods.
* Set explicit timeouts and cancellation for all network or long-running async operations using AbortSignal; avoid Promises that can hang indefinitely.
* Type async callbacks as returning Promise<void> and handle rejections at the boundary; avoid floating Promises inside event handlers and timers.
* Use structured logging with stable keys and include error stack and correlation context; avoid concatenated strings and logging only error.message.
* Use typed errors or discriminated Result types for expected failures; avoid throwing raw strings or relying on message matching.
* Validate all untrusted inputs at module boundaries using runtime schemas and return typed values; avoid casting unknown data to domain types.

Full standard is available here for further request: [TypeScript Best Practices](.packmind/standards/typescript-best-practices.md)
<!-- end: Packmind standards -->