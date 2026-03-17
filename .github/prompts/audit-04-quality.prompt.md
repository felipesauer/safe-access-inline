---
agent: agent
tools:
    - codebase
    - terminal
description: "Audit Step 2 (P3) — Code quality, naming, documentation, performance, API ergonomics, static analysis execution, and coverage suppression audit for the safe-access-inline monorepo. Depends on the Discovery Artifact from audit-01."
version: "1.0"
---

# 🧹 Audit 04 — Quality, Tests & Coverage (P3)

> **Read `.github/prompts/audit-shared.md` first** using the `codebase` tool to load role, finding format, prefixes, and calibration example.

> **Paste the Discovery Artifact from `audit-01-discovery.prompt.md` below before running this prompt.**

---

## Input: Discovery Artifact

<!-- Paste the full Discovery Artifact produced by audit-01-discovery.prompt.md here -->

---

## Instructions

Using the file paths in the Discovery Artifact, read each area with the `codebase` tool as needed. Complete all four sections below in order. Do not skip any.

---

## Section 1 — P3: Quality & Polish

Analyse the codebase for:

**Naming & Style**

- Consistent conventions within each language (PSR-12 / ESLint compliance)
- Misleading names, inconsistencies, convention violations

**Documentation**

- README accuracy vs current API
- JSDoc / PHPDoc completeness
- Inline comments for non-obvious logic
- CONTRIBUTING.md and CHANGELOG.md accuracy

**Performance**

- Redundant clones, unnecessary allocations
- Benchmark-verifiable improvements

**API Ergonomics**

- Consistency, discoverability, sensible defaults

Produce `[STYLE-NNN]` for naming/style, `[PERF-NNN]` for performance findings using the format from `audit-shared.md`.

---

## Section 2 — Static Analysis & Tests

Execute the project's lint, type-check, and test commands for all three packages via terminal. Report ✅ if it passes with zero warnings/errors, or ❌ with the exact output. **Do not skip — failures are findings.**

```bash
# JS package
cd packages/js && npm run lint && npm run typecheck && npm run test

# CLI package
cd packages/cli && npm run lint && npm run typecheck && npm run test

# PHP package
cd packages/php && composer run analyse && composer run test
```

For each command report:

- ✅ Passed (zero warnings/errors)
- ❌ Failed — paste exact output

---

## Section 3 — Coverage Suppression Audit

Search for **all** instances of coverage suppression and skipped tests across all packages:

**PHP (`packages/php/`):**

```bash
grep -rn "@codeCoverageIgnore\|@coversNothing\|markTestSkipped\|->skip()" packages/php/src packages/php/tests
```

**JS/TS (`packages/js/`, `packages/cli/`):**

```bash
grep -rn "c8 ignore\|istanbul ignore\|test\.skip\|it\.skip\|describe\.skip\|xit(\|xdescribe(" packages/js/src packages/js/tests packages/cli/src packages/cli/tests
```

**Config-level exclusions:**

- Examine `vitest.config.ts` coverage `exclude` list
- Examine `phpunit.xml.dist` coverage exclusion patterns

For each suppression found, evaluate:

1. **Justification present?** If not → `❌ Unjustified`
2. **Could it be replaced with a mock?** (PHP: MockHandler, vfsStream; JS: `vi.mock()`, `msw`, `vi.spyOn(fs, ...)`)
3. **Is it security-sensitive?** If yes → escalate to `[CRIT-NNN]`
4. **Classify:** ✅ Justified · ⚠️ Questionable · ❌ Unjustified

If a search returns **no results**, confirm explicitly: _"No suppressions found in [package]."_

---

## Section 4 — Output

### Findings

All quality findings as `[STYLE-NNN]` and `[PERF-NNN]` blocks.

### Static Analysis Results

```
packages/js  lint:       ✅ / ❌
packages/js  typecheck:  ✅ / ❌
packages/js  test:       ✅ / ❌
packages/cli lint:       ✅ / ❌
packages/cli typecheck:  ✅ / ❌
packages/cli test:       ✅ / ❌
packages/php analyse:    ✅ / ❌
packages/php test:       ✅ / ❌
```

### Coverage Suppression Summary Table

| Package | Location | Suppression type | Justified? | Security-sensitive? | Classification |
| ------- | -------- | ---------------- | ---------- | ------------------- | -------------- |
|         |          |                  |            |                     |                |

Produce `[COV-NNN]` detail blocks for every ⚠️ Questionable and ❌ Unjustified suppression.
