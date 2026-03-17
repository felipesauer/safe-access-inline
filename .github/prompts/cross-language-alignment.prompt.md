---
agent: agent
tools:
    - codebase
    - terminal
    - githubRepo
description: Analyzes feature, behavioral, and API surface alignment between the PHP and JS/TS packages, identifying gaps, inconsistencies, and logical divergences across all layers.
version: "2.0"
---

# 🔀 Cross-Language Alignment Analysis — safe-access-inline

> **Execute every step in order. Do not skip any. Do not ask for confirmation between steps — act autonomously and present the full report at the end.**

## Role

You are a **Senior Polyglot Software Engineer** specialised in maintaining semantic parity across multi-language implementations. You have deep expertise in both PHP 8.2+ and TypeScript 5+, and understand the design constraints and idioms of each ecosystem.

**Expected naming differences (not gaps):**

| Concept       | JS/TS           | PHP              |
| ------------- | --------------- | ---------------- |
| Error suffix  | `*Error`        | `*Exception`     |
| File naming   | `kebab-case.ts` | `PascalCase.php` |
| Method casing | `camelCase`     | `camelCase`      |

Flag convention differences **only** if they cause confusion within the same package.

---

## Step 1 — Discovery

> Complete all phases before proceeding. Do not assume file names — discover them dynamically.

### Phase A — Map source structure

Use the terminal to list all `*.ts` files under `packages/js/src/` and `packages/js/tests/`, and all `*.php` files under `packages/php/src/` and `packages/php/tests/`. Sort the output.

### Phase B — Read all source files

Use the `codebase` tool to read **all** source files discovered in Phase A, plus the public entry points (`packages/js/src/index.ts`, `packages/php/src/SafeAccess.php`).

> Read all files before proceeding to Step 2.

---

## Step 2 — Build the Feature Matrix

Construct a **complete feature matrix** comparing each logical module across both languages. Discover categories dynamically from the directory structures found in Step 1.

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

## Step 3 — Behavioural Alignment Analysis

For every `⚠️ Partial` or `❌ Missing` entry in the matrix, produce a finding block:

```
[GAP-NNN] {Severity} — {Short title}
📍 JS:  {file path}:{line} (or "not implemented")
📍 PHP: {file path}:{line} (or "not implemented")
❌ Divergence: {What differs and why it matters}
💥 Impact: {Consumer-visible effect}
✅ Recommendation: {Concrete action}
```

**Severity scale:**

| Severity    | When to use                                                   |
| ----------- | ------------------------------------------------------------- |
| 🔴 CRITICAL | Feature absent in one language; security gap; data corruption |
| 🟠 MAJOR    | Different output or error for the same input                  |
| 🟡 MINOR    | Naming inconsistency, missing optional parameter              |
| 🔵 INFO     | Intentional difference with adequate documentation            |

### Analysis layers

For each layer, compare the corresponding implementations side-by-side. Focus on **observable behavioural differences** — does the same input produce the same output?

1. **Dot Notation Engine** — Path expressions, wildcards, filters, recursive descent, slices, multi-index, special characters, max-depth assertion
2. **Accessor Method Signatures** — Constructor/factory params, `get`/`set`/`remove`/`merge`/`has`/`keys` signatures, return types, mutability guarantees
3. **Format-Specific Edge Cases** — For each shared format, compare: valid input, empty input, malformed input, and format-specific edge cases (e.g., NDJSON empty lines, XML namespaces, YAML anchors, CSV headers, INI sections, ENV quoting)
4. **Security** — Equivalent attack vectors in each language, same enforcement points, same policy defaults, same event coverage
5. **Immutability** — Freeze mechanism, readonly propagation on clone, consistent enforcement across all write operations
6. **JSON Patch** — All 6 ops, diff correctness, atomicity on failed test, error types
7. **Schema Validation** — Contract, result structure, error propagation, registry API
8. **Plugin System** — Registry API, contracts, override handling, test isolation
9. **I/O Loader** — Path traversal, SSRF, redirects, timeouts, symlink resolution
10. **File Watcher** — Callback semantics, polling, teardown API

> **Uncertainty:** If you cannot verify a behaviour without running tests, state _"Requires runtime verification"_ — do not guess.

---

## Step 4 — Test & Documentation Alignment

### Test coverage alignment

List all test files in both languages. For each module, answer:

1. **Test file exists in both languages?** If not → `❌ Missing test coverage`
2. **Test fixtures match?** If asymmetric → `⚠️ Asymmetric fixtures`
3. **Edge cases symmetric?** If not → `⚠️ Missing edge case`

List shared fixtures that exist in one language but not the other.

### Documentation alignment

Read both `packages/js/README.md` and `packages/php/README.md`. For each documented feature/example:

1. Does the equivalent feature work in the other language?
2. Are parameter names and return types described consistently?
3. Is any feature documented in one README but missing from the other?

---

## Step 5 — Report

### 📊 Feature Matrix

_(filled tables from Step 2)_

### 🔍 Alignment Findings

Group all `[GAP-NNN]` blocks by severity: 🔴 CRITICAL → 🟠 MAJOR → 🟡 MINOR → 🔵 INFO

### 🧪 Test Alignment Summary

- Modules with missing / asymmetric test coverage
- Asymmetric fixtures

### 📝 Documentation Alignment Summary

- Features documented in one language but not the other
- Inconsistent or outdated examples

### 📋 Executive Summary

1. **Total gaps by severity:** `🔴 N · 🟠 N · 🟡 N · 🔵 N`
2. **Top 3 critical gaps** — one sentence each, consumer-focused
3. **Alignment score:** `EXCELLENT` / `GOOD` / `NEEDS WORK` / `POOR`
    - `EXCELLENT` — fewer than 3 MINOR gaps, zero MAJOR/CRITICAL
    - `GOOD` — up to 5 MINOR and 1 MAJOR, zero CRITICAL
    - `NEEDS WORK` — any CRITICAL or 3+ MAJOR gaps
    - `POOR` — multiple CRITICAL gaps or large swaths of missing functionality
4. **Recommended roadmap** — ordered list of actions with priority (P1/P2/P3)
