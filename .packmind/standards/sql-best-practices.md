# SQL Best Practices

This standard covers high-impact SQL practices for security, concurrency, transactional correctness, performance stability, and operability. It targets non-obvious pitfalls around isolation, locking, pagination, aggregation, indexing, migrations, and plan stability in real-world systems.

## Rules

* Use parameter placeholders for all external values; pass lists via typed arrays or table-valued parameters, not string-built IN clauses.
* Set transaction isolation explicitly at transaction start for any multi-statement write flow; do not rely on session or database defaults.
* Lock rows with SELECT ... FOR UPDATE when reading values that will be updated in the same transaction; avoid read-then-update without locks.
* Write DDL migrations as idempotent steps using IF EXISTS/IF NOT EXISTS and guarded backfills; avoid non-repeatable migrations.
* Enforce data invariants with constraints; prefer CHECK, FOREIGN KEY, NOT NULL, and UNIQUE over application-only validation.
* Avoid OFFSET pagination on large tables; use keyset pagination with a stable, unique ordering predicate.
* Select only required columns in production queries; avoid SELECT * in application-facing SQL and stable interfaces like views.
* Use window functions for “top N per group” and latest-row selection; avoid correlated subqueries with LIMIT per row.
* Keep predicates sargable; avoid applying functions to indexed columns in WHERE and JOIN conditions, and rewrite to range predicates.
* Create composite indexes matching leading equality filters then ordering; avoid indexing only low-selectivity columns or mismatched column order.
