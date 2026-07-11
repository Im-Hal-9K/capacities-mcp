# JavaScript Best Practices

This standard covers high-impact JavaScript patterns for robustness and safety: reliable async control flow, error propagation, resource cleanup, input validation, network timeouts and retries, configuration handling, logging practices, concurrency-safe shared state, and test determinism. It focuses on pitfalls that commonly cause production incidents such as hung requests, swallowed errors, leaked handles, unsafe dynamic code execution, and flaky tests.

## Rules

* Set explicit timeouts and cancellation for every network or IPC request using AbortController and per-request deadlines.
* Retry only idempotent operations with bounded attempts, exponential backoff, and jitter; surface the final error without wrapping away the cause.
* Validate and normalize untrusted input at module boundaries using allowlists and type checks; reject extra fields and unexpected encodings.
* Avoid eval, Function, and dynamic import paths from untrusted data; use explicit dispatch maps for extensibility.
* Propagate errors with original cause using Error options or rethrow; avoid catch blocks that only log or return defaults.
* Release resources deterministically by awaiting stream completion and closing handles in finally; use pipeline/using patterns where available.
* Avoid async callbacks in Array.forEach/map without awaiting; use for...of for sequencing or Promise.all with explicit concurrency limits.
* Use structured logging with stable keys and redaction; avoid logging secrets or whole objects containing credentials.
* Centralize configuration loading and freeze the exported config object; disallow runtime mutation and avoid reading process.env throughout the codebase.
* Guard shared mutable state across async boundaries with explicit ownership, atomics, or a single-writer queue; avoid read-modify-write on shared objects.
