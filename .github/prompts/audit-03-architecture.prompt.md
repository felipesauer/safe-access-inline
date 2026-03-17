---
agent: agent
tools:
    - codebase
    - terminal
description: "Audit Step 2 (P2) — Architecture & Reliability analysis for the safe-access-inline monorepo. Covers static global state, plugin system, schema validation, CLI, memory leaks, loops & logic, and async/concurrency. Depends on the Discovery Artifact from audit-01."
version: "1.0"
---

# 🏗️ Audit 03 — Architecture & Reliability (P2)

> **Read `.github/prompts/audit-shared.md` first** using the `codebase` tool to load role, finding format, prefixes, and calibration example.

> **Paste the Discovery Artifact from `audit-01-discovery.prompt.md` below before running this prompt.**

---

## Input: Discovery Artifact

<!-- Paste the full Discovery Artifact produced by audit-01-discovery.prompt.md here -->

---

## Input: Known State Artifact

<!-- Paste the full Known State Artifact produced by audit-00-bootstrap.prompt.md here -->

---

## Instructions

Using the file paths in the Discovery Artifact, read each subsystem with the `codebase` tool before analysing it. **Do not skip a subsystem because an expected filename is absent** — discover actual files first.

Complete each concern fully before moving to the next. Produce `[ARCH-NNN]` blocks for structural / design problems and `[QUAL-NNN]` blocks for code smells and maintainability issues. Number sequentially within each prefix.

**Known State filtering:** Before reporting any finding, apply the Known State Protocol from `audit-shared.md`. Skip `accepted` findings entirely, list `deferred` findings only under a `### Still Deferred` section at the end, and report `open` findings that still exist as `[REGRESSION: <original-title>]` rather than new numbered findings.

---

## P2 — Architecture & Reliability

### Static State & Coupling

- **Static global state:** `globalPolicy`, `PathCache`, `PluginRegistry`, `SchemaRegistry` — test-isolation risks, singleton leaking between test suites
- **Plugin system:** Duplicate format key handling — silent override or warning? PHP plugins with optional extensions — graceful fallback?
- **Schema validation:** Adapter contract completeness, error surface vs swallow
- **Framework integrations:** DI scope correctness, async config loading, hot reload edge cases
- **CLI:** Input sanitisation, exit codes, output encoding, workspace dependency resolution
- **Path cache:** Unbounded growth? Cache key collisions?
- **NDJSON accessor:** Empty lines, trailing newlines, single invalid line handling, row addressing
- **Type safety:** TypeScript strict compliance, PHPStan level 9 compliance, contract interfaces

### Memory Leaks

**JS/TS:**

- Event listeners never removed
- Closures retaining large object graphs
- `setTimeout`/`setInterval` without cleanup
- Growing caches with no eviction policy

**PHP:**

- Streams or connections never closed
- Large arrays kept alive across requests
- Static properties accumulating state indefinitely

### Loops & Logic

- Infinite loops or missing exit conditions
- Nested loops with $O(n^2)$ or worse complexity where flatter alternatives exist
- Off-by-one errors, unreachable branches, or dead code paths
- Incorrect short-circuit evaluation or operator precedence

### Async & Concurrency (JS/TS)

- Unhandled promise rejections or floating promises
- `async` functions called without `await` where the result matters
- Synchronous blocking operations on the main thread (e.g., `fs.readFileSync` in hot paths)
- Race conditions from parallel mutations of shared state

---

## Output Format

Produce findings as:

- `[ARCH-NNN]` for structural / design problems
- `[QUAL-NNN]` for code smells, anti-patterns, dead code, SRP violations

Use the finding format from `audit-shared.md`.

If a subsystem has no issues, state: _"No issues found in [subsystem]."_

At the end, produce an **Architecture & Reliability Score Card**:

| Dimension           | Issues found | Critical | High | Medium | Low |
| ------------------- | ------------ | -------- | ---- | ------ | --- |
| Static state        |              |          |      |        |     |
| Memory leaks        |              |          |      |        |     |
| Loops & Logic       |              |          |      |        |     |
| Async & Concurrency |              |          |      |        |     |
| Type safety         |              |          |      |        |     |
| **Total**           |              |          |      |        |     |
