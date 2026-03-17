---
agent: agent
tools:
    - codebase
    - terminal
description: "Audit Step 4 — Cross-Language Alignment Analysis for safe-access-inline. Builds a feature matrix comparing PHP and JS/TS implementations, identifies behavioural divergences, and checks test/doc symmetry. Depends on the Discovery Artifact from audit-01."
version: "1.0"
---

# 🔄 Audit 06 — Cross-Language Alignment

> **Read `.github/prompts/audit-shared.md` first** using the `codebase` tool to load role, gap finding format, and severity scale.

> **Paste the Discovery Artifact from `audit-01-discovery.prompt.md` below before running this prompt.**

---

## Input: Discovery Artifact

<!-- Paste the full Discovery Artifact produced by audit-01-discovery.prompt.md here -->

---

## Input: Known State Artifact

<!-- Paste the full Known State Artifact produced by audit-00-bootstrap.prompt.md here -->

---

## Instructions

Use the `codebase` tool to read each module side-by-side (JS and PHP) before comparing.

Complete all three phases in order. Number `[GAP-NNN]` findings sequentially.

**Uncertainty:** If you cannot verify a behaviour without running tests, state _"Requires runtime verification"_ — do not guess.

**Known State filtering:** Before reporting any finding, apply the Known State Protocol from `audit-shared.md`. Skip `accepted` findings entirely, list `deferred` findings only under a `### Still Deferred` section at the end, and report `open` findings that still exist as `[REGRESSION: <original-title>]` rather than new numbered findings.

---

## Phase A — Feature Matrix

Construct a **complete feature matrix** comparing each logical module across both languages. Discover categories dynamically from the directory structures in the Discovery Artifact.

For each entry, assign a status:

| Status     | Meaning                                                      |
| ---------- | ------------------------------------------------------------ |
| ✅ Present | Fully implemented and equivalent                             |
| ⚠️ Partial | Present but with gaps (missing methods, different behaviour) |
| ❌ Missing | Not implemented in this language                             |
| 🔵 N/A     | Not applicable due to language constraints (document reason) |

Build matrix tables for these categories (add more if discovered):

1. **Accessors** — one row per format accessor found
2. **Core Engine** — parser, cache, merger, freezer, registries
3. **Operations** — public API methods on the accessor base class
4. **JSON Patch (RFC 6902)** — all six operations + diff + atomicity
5. **Security** — guard, options, policy, sanitiser, masker, IP checker, audit trail
6. **I/O & File System** — sync read, async read, fetch, path protection, watcher
7. **Schema Validation** — adapter contract, registry, each adapter implementation
8. **Plugin System** — registry, contracts, built-in plugins, isolation
9. **Exceptions / Errors** — one row per exception class
10. **Framework Integrations** — mark language-specific ones as `🔵 N/A`

---

## Phase B — Behavioural Alignment Findings

For every `⚠️ Partial` or `❌ Missing` entry in the Phase A matrix, produce a `[GAP-NNN]` block using the format from `audit-shared.md`.

Compare implementations side-by-side, focusing on **observable behavioural differences** — does the same input produce the same output?

### Alignment Layers

1. **Dot Notation Engine** — Path expressions, wildcards, filters, recursive descent, slices, multi-index, special characters, max-depth assertion
2. **Accessor Method Signatures** — Constructor/factory params, `get`/`set`/`remove`/`merge`/`has`/`keys` signatures, return types, mutability guarantees
3. **Format-Specific Edge Cases** — For each shared format, compare: valid input, empty input, malformed input, and format-specific edge cases (e.g., NDJSON empty lines, XML namespaces, YAML anchors, CSV headers, INI sections, ENV quoting)
4. **Security** — Equivalent attack vectors, same enforcement points, same policy defaults, same event coverage
5. **Immutability** — Freeze mechanism, readonly propagation on clone, consistent enforcement across all write operations
6. **JSON Patch** — All 6 ops, diff correctness, atomicity on failed test, error types
7. **Schema Validation** — Contract, result structure, error propagation, registry API
8. **Plugin System** — Registry API, contracts, override handling, test isolation
9. **I/O Loader** — Path traversal, SSRF, redirects, timeouts, symlink resolution
10. **File Watcher** — Callback semantics, polling, teardown API

---

## Phase C — Test & Documentation Alignment

### Test Coverage Alignment

For each module, answer:

1. **Test file exists in both languages?** If not → `❌ Missing test coverage`
2. **Test fixtures match?** If asymmetric → `⚠️ Asymmetric fixtures`
3. **Edge cases symmetric?** If not → `⚠️ Missing edge case`

List shared fixtures that exist in one language but not the other.

### Documentation Alignment

Read both `packages/js/README.md` and `packages/php/README.md`. For each documented feature/example:

1. Does the equivalent feature work in the other language?
2. Are parameter names and return types described consistently?
3. Is any feature documented in one README but missing from the other?

---

## Output Format

### 📊 Feature Matrix

_(filled tables from Phase A)_

### 🔍 Alignment Findings

All `[GAP-NNN]` blocks grouped by severity: 🔴 CRITICAL → 🟠 MAJOR → 🟡 MINOR → 🔵 INFO

**Total gaps by severity:** `🔴 N · 🟠 N · 🟡 N · 🔵 N`

**Alignment score:**

| Rating       | Condition                                              |
| ------------ | ------------------------------------------------------ |
| `EXCELLENT`  | Fewer than 3 MINOR gaps, zero MAJOR/CRITICAL           |
| `GOOD`       | Up to 5 MINOR and 1 MAJOR, zero CRITICAL               |
| `NEEDS WORK` | Any CRITICAL or 3+ MAJOR gaps                          |
| `POOR`       | Multiple CRITICAL gaps or large swaths of missing code |

### 🧪 Test Alignment Summary

- Modules with missing / asymmetric test coverage
- Asymmetric fixtures list

### 📝 Documentation Alignment Summary

- Features documented in one language but not the other
- Inconsistent or outdated examples
