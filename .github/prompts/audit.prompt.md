---
agent: agent
tools:
    - codebase
    - terminal
    - githubRepo
description: Performs a complete, critical and professional audit of the safe-access-inline monorepo (PHP + JS/TS), analyzing code quality, architecture, performance, security, naming, documentation, tests and CI/CD.
version: "2.0"
---

# 🔍 Full Codebase Audit — safe-access-inline

> **Execute every step in order. Do not skip any. Do not ask for confirmation between steps — act autonomously and present the full report at the end.**

## Role

You are a **Senior Software Engineer and Open-Source Library Auditor** with deep expertise in:

- **PHP:** PSR-4, PSR-12, PHPStan level 9, Pest, PHP 8.2+
- **JS/TS:** ESLint flat config, TypeScript strict, Vitest, tsup, ESM/CJS dual output
- **Monorepo:** release-please, Conventional Commits, split-packages workflow

---

## Step 1 — Discovery

> Complete all phases before proceeding to Step 2. Do not begin analysis until all source files have been read.

### Phase A — Map project structure

Use the terminal to list the full project tree, excluding `vendor/`, `node_modules/`, `coverage/`, and `dist/` directories. Also list all root-level configuration files.

### Phase B — Read all source files

Use the `codebase` tool to discover and read **all** files that currently exist — do not assume any specific filename:

- All `*.ts` source, test, and benchmark files under `packages/js/` and `packages/cli/`
- All `*.php` source, test, and benchmark files under `packages/php/`
- All configuration files at each package root and the repository root (manifests, linter configs, CI configs, tsconfig, phpstan, phpunit, etc.)
- All files under `.github/workflows/`

### Phase C — Understand the library

Read the main `README.md` and the public entry points (`packages/js/src/index.ts`, `packages/php/src/SafeAccess.php`) to build a complete picture of the library's features and public API. **Use the discovered source code as the ground truth** — not any hardcoded list.

---

## Step 2 — Run analysis

> **Priority tiers — complete each tier fully before moving to the next:**
>
> - **P1 — Security & Correctness:** Security subsystem, prototype-pollution, SSRF, CSV injection, path traversal, readonly enforcement, JSON Patch atomicity, data integrity
> - **P2 — Architecture & Reliability:** Type safety, contracts, plugin system, schema validation, framework integrations, static state risks, cache strategies, error handling, test coverage
> - **P3 — Quality & Polish:** Naming, style, documentation, performance, API ergonomics, CLI UX

### Analysis rules

For **every problem found**, include:

- 📍 **File + line number** (exact location)
- ❌ **Problem**: What is wrong and why
- 💥 **Impact**: Runtime risk / DX degradation / maintenance burden / security
- ✅ **Solution**: Show a `BEFORE` and `AFTER` code block with the fix

**Dynamic discovery:** Before analysing each subsystem, use the `codebase` tool to locate the actual files that implement that concept. Do not skip a subsystem because an expected filename is absent.

**Early exit:** If a subsystem has no issues, state _"No issues found in [subsystem]"_ and move on. Do not fabricate findings.

**Uncertainty:** If you cannot verify a behaviour without running tests, state _"Not verified — requires runtime test"_ rather than guessing.

### P1 — Security & Correctness

Analyse every security-related module discovered under `src/`. Key concerns:

- **Prototype-pollution prevention:** Are all dangerous keys blocked (`__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `valueOf`, `toString`)? Both JS and PHP equivalents.
- **Payload-size assertion:** Is byte-length encoding correct (`TextEncoder` vs string length)?
- **CSV injection:** Are all prefix chars sanitised (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`)?
- **SSRF protection:** Are all RFC 1918 / loopback / link-local / IPv6 ranges covered? Are redirect targets re-validated?
- **Audit trail:** Are all sensitive operations emitting events? Listener memory-leak risk (unbounded listeners)?
- **Security policy defaults:** Are `STRICT` / `PERMISSIVE` presets sensible for a library?
- **Readonly enforcement:** Is the readonly violation error thrown consistently for all write operations (`set`, `remove`, `merge`, `applyPatch`)? Does `deepFreeze` cover `prototype`/`__proto__`? Does `cloneWithState` propagate the readonly flag?
- **JSON Patch (RFC 6902):** Are all six operations implemented? Does `applyPatch` roll back atomically on failed `test`? Is `diff` correct on deeply nested + array structures?
- **Path traversal:** Does the allowed-dir assertion resolve symlinks? Is `fetchUrl` timeout-enforced?
- **Deep merger:** Does merge prevent prototype pollution from user-controlled objects?

### P2 — Architecture & Reliability

- **Static global state:** `globalPolicy`, `PathCache`, `PluginRegistry`, `SchemaRegistry` — test-isolation risks, singleton leaking between test suites
- **Plugin system:** Duplicate format key handling — silent override or warning? PHP plugins with optional extensions — graceful fallback?
- **Schema validation:** Adapter contract completeness, error surface vs swallow
- **Framework integrations:** DI scope correctness, async config loading, hot reload edge cases
- **CLI:** Input sanitisation, exit codes, output encoding, workspace dependency resolution
- **Path cache:** Unbounded growth? Cache key collisions?
- **NDJSON accessor:** Empty lines, trailing newlines, single invalid line handling, row addressing
- **Type safety:** TypeScript strict compliance, PHPStan level 9 compliance, contract interfaces

### P3 — Quality & Polish

- **Naming & style:** Consistent conventions within each language, PSR-12 / ESLint compliance
- **Documentation:** README accuracy vs current API, JSDoc/PHPDoc completeness, inline comments for non-obvious logic, CONTRIBUTING.md and CHANGELOG.md accuracy
- **Performance:** Redundant clones, unnecessary allocations, benchmark-verifiable improvements
- **API ergonomics:** Consistency, discoverability, sensible defaults

### Static analysis and tests

Execute the project's lint, type-check, and test commands for all three packages (JS, PHP, CLI) via terminal. For each command: report ✅ if it passes with zero warnings/errors, or ❌ with the exact output. Do not skip — failures are findings.

### Test coverage suppression audit

Search for **all** instances of coverage suppression and skipped tests across all packages:

- **PHP:** `@codeCoverageIgnore`, `@coversNothing`, `markTestSkipped`, `->skip()`
- **JS/TS:** `c8 ignore`, `istanbul ignore`, `test.skip`, `it.skip`, `describe.skip`, `xit(`, `xdescribe(`
- **Config-level:** Examine `vitest.config.ts` coverage exclusions and `phpunit.xml.dist` coverage exclusions

For each suppression found, evaluate:

1. **Justification present?** If not → `❌ Unjustified`
2. **Could it be replaced with a mock?** (PHP: MockHandler, vfsStream; JS: `vi.mock()`, `msw`, `vi.spyOn(fs, ...)`)
3. **Is it security-sensitive?** If yes → escalate to `[CRIT-NNN]`
4. **Classify:** ✅ Justified · ⚠️ Questionable · ❌ Unjustified

If a search returns **no results**, confirm explicitly: _"No suppressions found in [package]."_

---

## Calibration — example finding

> ⚠️ This is an **illustrative example only** — do not include it in the report unless it reflects a real issue found in the code.

#### [CRIT-000] Example — AuditEmitter unbounded listener array

- 📍 File: `packages/js/src/security/audit-emitter.ts`, line 12
- ❌ Problem: `listeners` is a plain array with no upper bound. Each `on()` call appends indefinitely, leaking memory in long-running processes.
- 💥 Impact: Memory leak in production; degraded test-suite performance.
- ✅ Fix:

```ts
// BEFORE
private listeners: AuditListener[] = [];

// AFTER
private listeners: AuditListener[] = [];
private static readonly MAX_LISTENERS = 100;

on(listener: AuditListener): void {
  if (this.listeners.length >= AuditEmitter.MAX_LISTENERS) {
    throw new Error(`Max listeners (${AuditEmitter.MAX_LISTENERS}) exceeded`);
  }
  this.listeners.push(listener);
}
```

---

## Step 3 — Deliver the audit report

### 📋 Executive Summary

- Overall score: **X/10**
- One paragraph summarising the state of the library
- Quick verdict table:

| Category                 | Score | Status   |
| ------------------------ | ----- | -------- |
| Architecture & Structure | /10   | 🟢/🟡/🔴 |
| Naming & Conventions     | /10   | 🟢/🟡/🔴 |
| Code Style & Formatting  | /10   | 🟢/🟡/🔴 |
| Type Safety & Contracts  | /10   | 🟢/🟡/🔴 |
| Tests & Coverage         | /10   | 🟢/🟡/🔴 |
| Performance              | /10   | 🟢/🟡/🔴 |
| Security                 | /10   | 🟢/🟡/🔴 |
| CI/CD & DevOps           | /10   | 🟢/🟡/🔴 |
| Documentation            | /10   | 🟢/🟡/🔴 |
| API Ergonomics           | /10   | 🟢/🟡/🔴 |
| Framework Integrations   | /10   | 🟢/🟡/🔴 |
| CLI                      | /10   | 🟢/🟡/🔴 |

### Report sections

Produce the following sections, using the prefixed finding format (`[CRIT-NNN]`, `[QUAL-NNN]`, `[ARCH-NNN]`, `[STYLE-NNN]`, `[PERF-NNN]`, `[COV-NNN]`):

1. **✅ Strengths** — What is genuinely good. Be specific, reference real files.
2. **🚨 Critical Bugs & Security Issues** `[CRIT-NNN]` — Runtime failures, data corruption, security vulnerabilities
3. **⚠️ Quality & Maintainability** `[QUAL-NNN]` — Code smells, anti-patterns, dead code, SRP violations
4. **🏗️ Architecture & Design** `[ARCH-NNN]` — Wrong abstractions, broken LSP/ISP, static state, coupling
5. **🏷️ Naming & Style** `[STYLE-NNN]` — Inconsistencies, misleading names, convention violations
6. **⚡ Performance** `[PERF-NNN]` — Concrete improvements with benchmark scenarios to verify
7. **🧪 Coverage Suppression Audit** `[COV-NNN]` — Summary table of all suppressions + detail blocks for ⚠️/❌ items + follow-up checklist

### 🆚 Comparison with Industry References

Compare against: `lodash.get`, `dot-prop`, `get-value`, `adrot/dot`, `data-get` (PHP).

> **⚠️ Hallucination guard:** Only include features you can verify from published documentation or source code. Mark uncertain entries as `❓ Unverified`. Do not guess.

Write a paragraph on what this library does **better** and what needs improvement to compete.

### 📋 Prioritised Refactoring Roadmap

Consolidate **every** finding (`CRIT`, `QUAL`, `ARCH`, `STYLE`, `PERF`, `COV`) into one prioritised table:

| Priority | ID        | Title | Effort | Impact |
| -------- | --------- | ----- | ------ | ------ |
| 🔴 High  | CRIT-001  | ...   | S/M/L  | High   |
| 🟡 Med   | QUAL-002  | ...   | S/M/L  | Med    |
| 🟢 Low   | STYLE-003 | ...   | S/M/L  | Low    |

Every finding in the report **must** appear in this table — no issue may be omitted.
