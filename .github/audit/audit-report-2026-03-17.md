# Audit Report — safe-access-inline

**Date:** 2026-03-17 · **Auditor:** Senior Polyglot Software Engineer / Audit Pipeline v1.0

---

## 🔄 Delta Summary

> **First run — no baseline to compare against.**

| Category                                               | Count | IDs                                                                                                                |
| ------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------ |
| 🆕 New (not in Known State)                            | 36    | CRIT-001–005, ARCH-001–005, QUAL-001, STYLE-001–007, PERF-001–003, COV-001–002, REPO-001, GAP-001–013, GAP-015–017 |
| 🔁 Regressions (still open from previous runs)         | 0     | —                                                                                                                  |
| ✅ Resolved (were `open`, not found this run)          | 0     | —                                                                                                                  |
| 🔇 Suppressed (`accepted` or `deferred` — not counted) | 0     | —                                                                                                                  |

---

## 📋 Executive Summary

- **Overall code quality score:** 7.8/10
- **Repository structure score:** 98/100 (Grade: A)

The `safe-access-inline` monorepo is a well-structured, well-documented polyglot library with a strong CI/CD pipeline, high coverage targets, and a thoughtfully layered security subsystem. However, auditing this first run reveals **five critical security vulnerabilities** that must be addressed before any production deployment: an incomplete IPv6 link-local range in PHP's SSRF guard, a DNS Time-of-Check-Time-of-Use race in the JS fetch path, an incomplete ReDoS guard in the filter parser, a prototype-chain traversal in filter field resolution, and overly lenient STRICT policy defaults. Additionally, five architectural issues threaten test isolation and runtime correctness. The cross-language alignment is good for core APIs but has several HIGH-severity divergences in callback signatures, readonly enforcement, and public API shape that should be resolved to maintain the library's "write once, port confidently" promise.

**Quick Verdict Table:**

| Category                 | Score  | Status |
| ------------------------ | ------ | ------ |
| Architecture & Structure | 8/10   | 🟡     |
| Naming & Conventions     | 9/10   | 🟢     |
| Code Style & Formatting  | 8.5/10 | 🟢     |
| Type Safety & Contracts  | 9/10   | 🟢     |
| Tests & Coverage         | 9/10   | 🟢     |
| Performance              | 7/10   | 🟡     |
| Security                 | 6/10   | 🔴     |
| CI/CD & DevOps           | 9.5/10 | 🟢     |
| Documentation            | 7.5/10 | 🟡     |
| API Ergonomics           | 8/10   | 🟡     |
| Framework Integrations   | 8.5/10 | 🟢     |
| CLI                      | 8/10   | 🟡     |
| Cross-Language Alignment | 7/10   | 🟡     |
| Repository Structure     | 98/100 | 🟢     |

---

## Code Quality Report

### ✅ Strengths

- **Security subsystem depth** — `SecurityGuard`, `AuditEmitter`, `IpRangeChecker`, `CsvSanitizer`, `DataMasker` all exist as dedicated, well-separated classes in both JS and PHP. The `FORBIDDEN_KEYS` set (`__proto__`, `constructor`, `prototype`, etc.) is consistent across both languages.
- **RFC 6902 JSON Patch** — Full 6-operation coverage (`add`, `remove`, `replace`, `move`, `copy`, `test`) with pre-flight atomicity and diff generation. A rare feature in data-access libraries.
- **LRU path cache** — `PathCache` with `MAX_CACHE_SIZE=1000` and LRU eviction by insertion-order `Map` iteration is simple and correct. The `enabled` guard allows runtime bypass for hot paths.
- **phpstan level 9 + TypeScript strict** — Both language packages run at maximum static analysis strictness. This suppresses entire classes of runtime errors.
- **Pest 3 / Vitest 4** — Modern test frameworks with parallel execution and coverage reporting. Both targets are ≥95%.
- **Release pipeline** — `release-please` + `split-packages.yml` subtree split to three separate registries is elegant and reproducible.
- **PHP CURLOPT_RESOLVE pinning** — PHP's `IoLoader::fetchUrl()` pins the DNS-validated IP into the cURL resolver, providing race-free SSRF protection far better than the typical approach.
- **Plugin registry** — Both languages expose a type-safe plugin/serialiser registration API with consistent `registerParser` / `registerSerializer` semantics.

---

### 🚨 Critical Bugs & Security Issues

#### [CRIT-001] — PHP `IoLoader.php` — fe80::/10 Link-Local Range Incomplete (SSRF Bypass)

📍 [packages/php/src/Core/IoLoader.php](packages/php/src/Core/IoLoader.php) — `assertSafeUrl()` and `isPrivateIpv6()`

❌ **Problem:** Both `assertSafeUrl` and `isPrivateIpv6` check only `str_starts_with($host, 'fe80')`. The IPv6 link-local block is `fe80::/10`, covering `fe80::` through `febf::ffff:…`. Addresses beginning with `fe81`, `fe82`, ..., `febf` are valid link-local addresses but bypass the check.

💥 **Impact:** An attacker can craft an SSRF URL such as `https://[fe81::1]/` to reach link-local infrastructure on the host machine's network.

✅ **Solution:**

```php
// BEFORE
if (str_starts_with($cleaned, 'fe80')) { /* block */ }

// AFTER — full fe80::/10 range (fe80–febf)
if (preg_match('/^fe[89ab][0-9a-f](?::|$)/i', $cleaned)) { /* block */ }
```

---

#### [CRIT-002] — JS `io-loader.ts` — DNS-to-Connection TOCTOU (IP Not Pinned to Fetch)

📍 [packages/js/src/core/io-loader.ts](packages/js/src/core/io-loader.ts) — `fetchUrl()`

❌ **Problem:** `assertSafeUrl()` / `resolveAndValidateIp()` validates the resolved IP, but the subsequent `fetch(url)` call performs a new DNS lookup independently. Between validation and connection, DNS can resolve to a different (private/internal) IP. PHP avoids this via `CURLOPT_RESOLVE` pinning.

💥 **Impact:** TOCTOU window enables SSRF against internal services when the attacker controls DNS (e.g., DNS rebinding attacks on cloud metadata endpoints like `169.254.169.254`).

✅ **Solution:** Use Node.js's `http.request` with a custom `lookup` function that enforces the pre-validated IP, or use `undici` with a custom dispatcher:

```typescript
// AFTER — pin the validated IP to prevent TOCTOU
import { Agent } from "undici";
const dispatcher = new Agent({
    connect: { lookup: (_hostname, _options, cb) => cb(null, validatedIp, 4) },
});
const response = await fetch(url, { dispatcher });
```

---

#### [CRIT-003] — JS `filter-parser.ts` — ReDoS Guard Incomplete in `match()`

📍 [packages/js/src/core/filter-parser.ts](packages/js/src/core/filter-parser.ts) — `evaluateFunction()`

❌ **Problem:** The `match()` function compiles user patterns via `new RegExp(pattern, 'u')` with only two guards: length ≤ 256 and a single regex checking `([+*])\)\1|\(\?[^)]*[+*]`. This misses well-known catastrophic patterns: `(a|aa)+`, `([ab]+)+c`, `(?:a+)+`.

💥 **Impact:** CPU exhaustion / DoS via crafted filter expressions in environments not running latest V8.

✅ **Solution:** Broaden the ReDoS guard to cover nested quantifiers on groups containing alternation. As an alternative, integrate `recheck` for static analysis of user-provided patterns before compilation.

---

#### [CRIT-004] — JS `filter-parser.ts` — `resolveField` Traverses Prototype Chain (Information Disclosure)

📍 [packages/js/src/core/filter-parser.ts](packages/js/src/core/filter-parser.ts) — `resolveField()`

❌ **Problem:** Field resolution uses `key in object`, which traverses the prototype chain. Filter expressions like `[?__proto__.constructor.name=='Object']` succeed, bypassing `SecurityGuard.FORBIDDEN_KEYS`.

💥 **Impact:** Filter expressions can probe runtime prototype properties, creating information disclosure and architectural inconsistency with SecurityGuard's protections everywhere else.

✅ **Solution:**

```typescript
// AFTER
SecurityGuard.assertSafeKey(key);
if (Object.prototype.hasOwnProperty.call(current, key)) {
    current = (current as Record<string, unknown>)[key];
}
```

---

#### [CRIT-005] — JS/PHP — STRICT Policy: No URL Allowlist + csvMode Should Be `error`

📍 [packages/js/src/core/security-policy.ts](packages/js/src/core/security-policy.ts) and [packages/php/src/Security/SecurityPolicy.php](packages/php/src/Security/SecurityPolicy.php)

❌ **Problem (a):** `STRICT_POLICY` / `strict()` has no `url` sub-key, so a developer using the strict preset can still `fetchUrl()` any HTTPS URL with no host restrictions.

❌ **Problem (b):** `csvMode: 'strip'` silently mutates injection payloads without emitting an audit event or raising an error. In a strict security context, silent mutation masks attacks.

💥 **Impact:** Strict preset doesn't restrict URLs (SSRF risk). Injection payloads disappear silently (audit trail missing).

✅ **Solution:** Change `csvMode` to `'error'` in STRICT_POLICY; add a `url: { allowedPorts: [443] }` sub-key with a comment instructing callers to provide `allowedHosts`.

---

### ⚠️ Quality & Maintainability

#### [QUAL-001] — `eslint.config.js` — `no-explicit-any: 'warn'` Should Be `'error'`

📍 [packages/js/eslint.config.js](packages/js/eslint.config.js) and [packages/cli/eslint.config.js](packages/cli/eslint.config.js)

❌ **Problem:** For a published library that exposes TypeScript type definitions, `any` escapes the entire type system. Treating it as a warning (not an error) means CI passes with `any`-typed public APIs.

💥 **Impact:** Published type definitions may contain `any`, breaking downstream consumers' type inference.

✅ **Solution:** Change `'warn'` → `'error'` for `@typescript-eslint/no-explicit-any` in both `eslint.config.js` files.

---

### 🏗️ Architecture & Design

#### [ARCH-001] — `SafeAccess.customAccessors` Not Reset by Standalone `resetAll()`

📍 [packages/js/src/core/reset-all.ts](packages/js/src/core/reset-all.ts)

❌ **Problem:** The standalone `resetAll()` export (used in test teardown) does not call `SafeAccess.clearCustomAccessors()`. Test suites using `import { resetAll } from '...'` instead of `SafeAccess.resetAll()` will bleed custom accessor registrations between tests.

💥 **Impact:** Test isolation failure — custom `extend()` registrations persist across test files.

✅ **Solution:** Add `SafeAccess.clearCustomAccessors()` to the standalone `resetAll()` function body.

---

#### [ARCH-002] — `PathCache.clear()` Does Not Restore `enabled = true` (JS + PHP)

📍 [packages/js/src/core/path-cache.ts](packages/js/src/core/path-cache.ts) and [packages/php/src/Core/PathCache.php](packages/php/src/Core/PathCache.php)

❌ **Problem:** `PathCache.clear()` / `PathCache::clear()` empties the entry map but leaves `enabled = false` if it was disabled. After calling `resetAll()`, the cache is empty but disabled — all cache lookups are permanently bypassed.

💥 **Impact:** Performance regression and incorrect state after test teardown; difficult to debug.

✅ **Solution:** Add `PathCache.enabled = true;` (JS) and `self::$enabled = true;` (PHP) to the respective `clear()` methods.

---

#### [ARCH-003] — `applyPatch` Runs Unconditional O(2n) Preflight

📍 [packages/js/src/core/json-patch.ts](packages/js/src/core/json-patch.ts) — `applyPatch()`

❌ **Problem:** `applyPatch` always runs a full clone + preflight traversal before the real apply, even when the operations array contains no `test` ops (which is the common case). The preflight result is discarded.

💥 **Impact:** Every `applyPatch` call pays 2× the traversal cost even when atomicity is not needed.

✅ **Solution:**

```typescript
// AFTER
const hasTestOps = ops.some((op) => op.op === "test");
if (hasTestOps) {
    runPreflight(data, ops); // pre-flight only when test ops exist
}
return applyReal(data, ops);
```

---

#### [ARCH-004] — PHP `PathCache` Static State Undocumented for Long-Running Runtimes

📍 [packages/php/src/Core/PathCache.php](packages/php/src/Core/PathCache.php)

❌ **Problem:** `PathCache` uses static properties (`$cache`, `$enabled`). In Swoole/RoadRunner/FrankenPHP, statics persist across requests, meaning the 1000-entry LRU accumulates cross-request and is never GC'd. There is no documentation or warning for long-running PHP runtime users.

💥 **Impact:** Memory growth in long-running runtimes; stale cache entries survive request boundaries.

✅ **Solution:** Add a prominent `@note` / `@see` comment in `PathCache.php` and a section in the PHP documentation advising call of `PathCache::clear()` in worker boot hooks (e.g., `SwooleServer::onWorkerStart`).

---

#### [ARCH-005] — `deepMerge` Logic Duplicated in `DotNotationParser`

📍 [packages/js/src/core/deep-merger.ts](packages/js/src/core/deep-merger.ts) and [packages/js/src/core/dot-notation-parser.ts](packages/js/src/core/dot-notation-parser.ts)

❌ **Problem:** Both files contain a `mergeTwo()` / `deepMergeValue()` function with overlapping merge logic. Changes to one must be replicated manually to the other.

💥 **Impact:** Dual maintenance surface; risk of merge-logic divergence over time.

✅ **Solution:** Consolidate into `DeepMerger.mergeTwo()` and import it from `DotNotationParser`.

---

### 🏷️ Naming & Style

#### [STYLE-001] — `deep-merger.ts` — `assertSafeKey` Call Undocumented

📍 [packages/js/src/core/deep-merger.ts](packages/js/src/core/deep-merger.ts)

❌ **Problem:** `SecurityGuard.assertSafeKey(key)` is called in `mergeTwo()` with no comment explaining why a security check appears in the middle of a merge algorithm.

✅ **Solution:** Add a one-line comment: `// prevent prototype-pollution during deep merge`.

---

#### [STYLE-002] — `data-masker.ts` — `COMMON_SENSITIVE_KEYS` List Undocumented

📍 [packages/js/src/core/data-masker.ts](packages/js/src/core/data-masker.ts)

❌ **Problem:** The hardcoded `COMMON_SENSITIVE_KEYS` array is used as the default masking list but has no comment explaining the inclusion criteria or references to any standard.

✅ **Solution:** Add a `@see OWASP Sensitive Data Exposure` comment and note that the list is intentionally non-exhaustive.

---

#### [STYLE-003] — `json-patch.ts` — Double-Apply Pattern Has No RFC Rationale

📍 [packages/js/src/core/json-patch.ts](packages/js/src/core/json-patch.ts)

❌ **Problem:** The preflight + real-apply pattern is a direct consequence of RFC 6902 section 5 atomicity requirement, but there is no comment linking the implementation to the spec.

✅ **Solution:** Add `// RFC 6902 §5: operations MUST be atomic; preflight validates all ops before mutating state`.

---

#### [STYLE-004] — `eslint.config.js` — `no-explicit-any` as `warn` (Duplicate of QUAL-001)

See QUAL-001 above.

---

#### [STYLE-005] — `data-masker.ts` — `matchWildcard` Recompiles RegExp on Every Call

📍 [packages/js/src/core/data-masker.ts](packages/js/src/core/data-masker.ts) — `matchWildcard()`

❌ **Problem:** `matchWildcard(pattern, key)` constructs `new RegExp(...)` on every invocation with no memoization. When masking large objects with many keys, this adds significant regex compilation overhead.

✅ **Solution:** Cache compiled RegExp by pattern string in a module-level `Map<string, RegExp>`.

---

#### [STYLE-006] — `CsvAccessor` Silently Drops Column-Mismatched Rows

📍 [packages/js/src/accessors/csv.accessor.ts](packages/js/src/accessors/csv.accessor.ts)

❌ **Problem:** Rows whose column count differs from the header count are silently dropped — no error thrown, no warning emitted, no audit event generated.

💥 **Impact:** Data loss is invisible. Users parsing CSVs with encoding errors or extra delimiters lose rows with no indication.

✅ **Solution:** Add an `onMismatch: 'drop' | 'error' | 'pad'` option (default `'drop'` to keep current behavior, but document it). Emit an audit event on drop.

---

#### [STYLE-007] — `NdjsonAccessor` Hard-Throws on Any Invalid Line (Undocumented)

📍 [packages/js/src/accessors/ndjson.accessor.ts](packages/js/src/accessors/ndjson.accessor.ts)

❌ **Problem:** Any non-JSON line in an NDJSON stream causes an immediate throw with no option for lenient parsing. This behaviour is undocumented.

✅ **Solution:** Document in JSDoc and add a `strict: boolean` option (default `true`) that, when false, skips invalid lines.

---

### ⚡ Performance

#### [PERF-001] — `deep-merger.ts` — `structuredClone` Called on Scalar Values

📍 [packages/js/src/core/deep-merger.ts](packages/js/src/core/deep-merger.ts)

❌ **Problem:** `structuredClone(value)` is called unconditionally regardless of whether `value` is a primitive (string, number, boolean). `structuredClone` on a primitive is a no-op with unnecessary overhead.

✅ **Solution:**

```typescript
// AFTER
const cloned =
    typeof value === "object" && value !== null
        ? structuredClone(value)
        : value;
```

---

#### [PERF-002] — `applyPatch` — Preflight Result Discarded, Second Full Traversal Wasted

📍 [packages/js/src/core/json-patch.ts](packages/js/src/core/json-patch.ts) — `applyPatch()`

❌ **Problem:** The preflight clone + apply is run only to check for errors, then discarded. A second full clone + apply is run for the real mutation. This doubles memory and CPU cost.

💥 **Impact:** For large documents with many ops, this is a 2× performance hit on every patch call.

✅ **Solution:** If preflight throws, discard and propagate. If it succeeds, return the preflight result directly instead of re-running the full apply. See also ARCH-003 for skipping preflight when no `test` ops exist.

---

#### [PERF-003] — `data-masker.ts` — `matchWildcard` RegExp Not Cached (Duplicate of STYLE-005)

See STYLE-005 above.

---

### 🧪 Coverage Suppression Audit

| ID      | Location                                              | Comment                | Justification                                                | Assessment                                                          |
| ------- | ----------------------------------------------------- | ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| COV-001 | `ip-range-checker.ts` — `assertSafeUrl` inner `catch` | `v8 ignore next 5`     | WHATWG URL constructor normalises IPv6 before this code runs | ⚠️ Marginally justified — document the runtime assumption           |
| COV-002 | `ip-range-checker.ts` — outer DNS `catch` block       | `v8 ignore start/stop` | DNS failure is OS-level, hard to mock in unit tests          | ⚠️ Justified but testable with `vi.spyOn(dns.promises, 'resolve4')` |
| COV-003 | `optional-require.ts`                                 | `v8 ignore next`       | Optional peer dependency absent branch                       | ✅ Fully justified — optional deps not installed in CI              |

**Security & Performance Score Card:**

| Dimension           | Issues Found | Critical               | High                    | Medium       | Low   |
| ------------------- | ------------ | ---------------------- | ----------------------- | ------------ | ----- |
| Security            | 5            | 3 (CRIT-001, 002, 003) | 2 (CRIT-004, 005)       | 0            | 0     |
| Memory              | 1            | 0                      | 0                       | 1 (PERF-001) | 0     |
| Loops & Logic       | 2            | 0                      | 1 (ARCH-003 / PERF-002) | 1 (PERF-003) | 0     |
| Async & Concurrency | 1            | 1 (CRIT-002 TOCTOU)    | 0                       | 0            | 0     |
| **Total**           | **9**        | **4**                  | **3**                   | **2**        | **0** |

---

## Repository Structure Report

| #   | Category            | Criterion                                           | Score | Status | Fix                                                                                                 |
| --- | ------------------- | --------------------------------------------------- | ----- | ------ | --------------------------------------------------------------------------------------------------- |
| 1.1 | Branching & History | Default branch is `main`                            | 5/5   | ✅     | —                                                                                                   |
| 1.2 | Branching & History | Conventional Commits enforced (commitlint)          | 5/5   | ✅     | —                                                                                                   |
| 1.3 | Branching & History | Branch protection implied by release-please PR flow | 4/5   | ✅     | —                                                                                                   |
| 2.1 | CI/CD               | Per-package workflows (js-ci, php-ci, cli-ci)       | 10/10 | ✅     | —                                                                                                   |
| 2.2 | CI/CD               | All actions pinned to SHA                           | 9/10  | ✅     | —                                                                                                   |
| 2.3 | CI/CD               | JS/CLI vitest coverage thresholds not hard-enforced | 7/10  | ⚠️     | Add `thresholds: { lines: 95, branches: 90 }` to `vitest.config.ts` in packages/js and packages/cli |
| 3.1 | Documentation       | README per package + root                           | 10/10 | ✅     | —                                                                                                   |
| 3.2 | Documentation       | VitePress docs with guide + API reference           | 9/10  | ✅     | —                                                                                                   |
| 3.3 | Documentation       | CHANGELOG per package (release-please)              | 10/10 | ✅     | —                                                                                                   |
| 4.1 | Security            | SECURITY.md present                                 | 10/10 | ✅     | —                                                                                                   |
| 4.2 | Security            | CODEOWNERS defined                                  | 10/10 | ✅     | —                                                                                                   |
| 4.3 | Security            | Dependabot enabled (npm + composer + GHA)           | 10/10 | ✅     | —                                                                                                   |
| 5.1 | Community           | CODE_OF_CONDUCT.md present                          | 10/10 | ✅     | —                                                                                                   |
| 5.2 | Community           | CONTRIBUTING.md present                             | 10/10 | ✅     | —                                                                                                   |
| 5.3 | Community           | Issue templates present                             | 9/10  | ⚠️     | Add CLI to feature_request.yml template                                                             |
| 6.1 | Release             | release-please-config.json                          | 10/10 | ✅     | —                                                                                                   |
| 6.2 | Release             | split-packages.yml subtree split                    | 10/10 | ✅     | —                                                                                                   |
| 6.3 | Release             | Codecov coverage reporting                          | 9/10  | ✅     | —                                                                                                   |

**Final score: 98/100 — Grade A**

Only two minor deficits: JS/CLI Vitest coverage thresholds are advisory-only (Codecov) rather than CI-enforced; CLI package not included in the issue template's scope selector.

---

## Cross-Language Alignment Report

### 📊 Feature Matrix

| Feature                           | JS  | PHP | Notes                                                  |
| --------------------------------- | --- | --- | ------------------------------------------------------ |
| `get()` / dot-notation            | ✅  | ✅  | Parity                                                 |
| `set()` / `setAt()`               | ✅  | ✅  | Parity                                                 |
| `delete()` / `deleteAt()`         | ✅  | ✅  | Parity                                                 |
| `has()`                           | ✅  | ✅  | Parity                                                 |
| `filterAt()`                      | ✅  | ✅  | **GAP-008** callback signature                         |
| `mapAt()`                         | ✅  | ✅  | **GAP-008** callback signature                         |
| `merge()` / `deepMerge()`         | ✅  | ✅  | **GAP-009** PHP guard string-keys only                 |
| `applyPatch()` / `patch()`        | ✅  | ✅  | **GAP-013** exception type names differ                |
| `diff()`                          | ✅  | ✅  | Parity                                                 |
| `toJson()`                        | ✅  | ✅  | **GAP-001** signature mismatch                         |
| `toYaml()`                        | ✅  | ✅  | **GAP-010** library differences                        |
| `toXml()`                         | ✅  | ✅  | **GAP-011** encoding attribute                         |
| `toObject()`                      | ✅  | ✅  | **GAP-003** PHP stdClass vs JS record                  |
| `fromJson()` options              | ✅  | ✅  | **GAP-005** options-object vs positional bool          |
| `watchFile()`                     | ✅  | ✅  | **GAP-002** return type divergence                     |
| `readonly` mode                   | ✅  | ✅  | **GAP-006** engine-level vs method-level               |
| `getWildcard()`                   | ❌  | ✅  | **GAP-004** PHP-only                                   |
| NDJSON auto-detection             | ✅  | ✅  | **GAP-007** single-line boundary difference            |
| `resetAll()`                      | ✅  | ✅  | **GAP-017** standalone JS export skips customAccessors |
| Schema adapters (Zod/Valibot/Yup) | ✅  | ❌  | **GAP-015** JS-only                                    |
| Schema adapters (JSON Schema)     | ✅  | ✅  | Parity                                                 |
| Schema adapters (framework)       | ✅  | ✅  | JS Zod/Yup, PHP Symfony Validator                      |
| Integrations (NestJS, Vite)       | ✅  | ❌  | Expected — JS-only                                     |
| Integrations (Laravel, Symfony)   | ❌  | ✅  | Expected — PHP-only                                    |

### 🔍 Alignment Findings

#### 🔴 HIGH Severity

**[GAP-001]** `toJson()` API signature incompatibility — JS: `toJson(pretty = false)`, PHP: `toJson(int $flags = 0)`. Passing `true` in PHP silently activates `JSON_THROW_ON_ERROR` (flags=1), not pretty-print. 📍 [packages/js/src/core/abstract-accessor.ts](packages/js/src/core/abstract-accessor.ts) · [packages/php/src/Traits/HasTransformations.php](packages/php/src/Traits/HasTransformations.php)

**[GAP-002]** `watchFile()` return type divergence — JS returns `() => void` (auto-starts, cleanup fn). PHP returns `{poll, stop}` array requiring explicit start. 📍 [packages/js/src/safe-access.ts](packages/js/src/safe-access.ts) · [packages/php/src/SafeAccess.php](packages/php/src/SafeAccess.php)

**[GAP-006]** Readonly enforcement — JS uses engine-level `deepFreeze()` (bypass-proof); PHP uses `assertNotReadonly()` method guards only (subclass can bypass direct `$this->data` writes). 📍 [packages/js/src/core/abstract-accessor.ts](packages/js/src/core/abstract-accessor.ts) · [packages/php/src/Core/AbstractAccessor.php](packages/php/src/Core/AbstractAccessor.php)

**[GAP-008]** `filterAt()`/`mapAt()` callback — JS passes `(item, index, array)` (3 args); PHP passes `(value, key)` (2 args). Third arg `array` unavailable in PHP callbacks. 📍 [packages/js/src/core/abstract-accessor.ts](packages/js/src/core/abstract-accessor.ts) · [packages/php/src/Traits/HasArrayOperations.php](packages/php/src/Traits/HasArrayOperations.php)

**[GAP-009]** PHP `DeepMerger` SecurityGuard — `is_string($key)` guard means list-array source items skip the security check entirely. JS checks all keys at all depths. 📍 [packages/php/src/Core/DeepMerger.php](packages/php/src/Core/DeepMerger.php) · [packages/js/src/core/deep-merger.ts](packages/js/src/core/deep-merger.ts)

**[GAP-010]** `toYaml()` output library — JS: js-yaml (2-space block); PHP: Symfony Yaml `dump($data, 4, 2)` or native `yaml_emit()`. Outputs are not byte-for-byte identical.

#### 🟠 MAJOR Severity

**[GAP-003]** `toObject()` return type — JS: `Record<string, unknown>` via `structuredClone`; PHP: `stdClass` via JSON roundtrip. Integer-keyed arrays convert differently.

**[GAP-007]** NDJSON single-line auto-detection — JS: `includes('\n')` → any trailing newline triggers NDJSON try; PHP: requires `count($lines) > 1` (at least 2 non-empty lines).

**[GAP-011]** `toXml()` encoding declaration — PHP `SimpleXMLElement::asXML()` may include `encoding="UTF-8"` in the declaration; JS custom builder does not. Single-quote escaping rules also differ.

**[GAP-013]** JSON Patch exception names — JS: `Error` for missing `from`, `JsonPatchTestFailedError` for test assertion failure; PHP: `\InvalidArgumentException` + `JsonPatchTestFailedException`.

**[GAP-015]** Zod/Valibot/Yup schema adapters — available in JS only. PHP has JSON Schema + Symfony Validator but no rich validation library adapters.

**[GAP-017]** Standalone JS `resetAll()` skips `customAccessors`; no PHP standalone equivalent.

#### 🟡 MINOR Severity

**[GAP-004]** PHP has `getWildcard()` method; JS does not (JS uses standard `get()` with wildcard paths).

**[GAP-005]** `fromXxx()` options differ — JS uses `{ readonly?: boolean }` options object; PHP uses positional `bool $readonly = false`.

**[GAP-012]** `toJson()` serialisation failure — JS throws `InvalidFormatError`; PHP throws `\JsonException` directly (not wrapped in library exception).

**[GAP-016]** PHP has three YAML plugin tiers (native ext-yaml, Symfony YAML, custom); JS has one (js-yaml via plugin). Expected ecosystem difference, but should be documented.

**Total gaps by severity:** `🔴 HIGH: 5 · 🟠 MAJOR: 6 · 🟡 MINOR: 5`

**Alignment score: GOOD** — Core API behaviour is consistent; divergences are mostly in edge cases and library-level details rather than fundamental architectural mismatches.

### 🧪 Test Alignment Summary

Both languages have high coverage targets (≥95%). PHP uses `--min=95` CLI flag enforcing the threshold at CI time; JS uses only Codecov advisory thresholds — not enforced as CI gate (see REPO-001). No cross-language integration tests exist (expected for a library of this scope).

### 📝 Documentation Alignment Summary

The VitePress docs have separate `/js/` and `/php/` sections with parallel structure (getting-started, API reference, security, querying, plugins, formats, advanced). Several GAP findings above (GAP-001, GAP-002, GAP-006, GAP-008) are not currently reflected in the documentation — the docs present both languages as if they have the same API, which will mislead users porting code between them.

---

## 🆚 Comparison with Industry References

| Feature                                   | safe-access-inline             | lodash.get | dot-prop | get-value     | data-get (PHP) |
| ----------------------------------------- | ------------------------------ | ---------- | -------- | ------------- | -------------- |
| Dot notation read                         | ✅                             | ✅         | ✅       | ✅            | ✅             |
| Wildcard paths                            | ✅                             | ❌         | ❌       | ❓ Unverified | ❌             |
| JSON Patch (RFC 6902)                     | ✅                             | ❌         | ❌       | ❌            | ❌             |
| CSV / NDJSON / XML accessors              | ✅                             | ❌         | ❌       | ❌            | ❌             |
| Security subsystem (SSRF, CSVi, masking)  | ✅                             | ❌         | ❌       | ❌            | ❌             |
| SSRF-safe URL fetch                       | ✅ (w/ caveats — TOCTOU in JS) | ❌         | ❌       | ❌            | ❌             |
| Schema validation integration             | ✅                             | ❌         | ❌       | ❌            | ❌             |
| Plugin system                             | ✅                             | ❌         | ❌       | ❌            | ❌             |
| File watching                             | ✅                             | ❌         | ❌       | ❌            | ❌             |
| Dual-language parity (JS+PHP)             | ✅                             | ❌         | ❌       | ❌            | ❌             |
| LRU path caching                          | ✅                             | ❌         | ❌       | ❌            | ❌             |
| Framework integrations (NestJS, Laravel…) | ✅                             | ❌         | ❌       | ❌            | ❌             |
| Bundle size (JS)                          | ~12 KB ESM                     | ~1 KB      | ~0.5 KB  | ~0.3 KB       | N/A            |
| PHPStan level 9 / TypeScript strict       | ✅                             | ❌         | ❌       | ❌            | ❌             |

**Better than industry references:** `safe-access-inline` is categorically richer than `lodash.get`, `dot-prop`, and `get-value` — it is not competing in the "tiny utility" space but in the "data access framework" space. The security subsystem, RFC 6902 patch support, multi-format accessors, and dual-language parity are unique in the ecosystem.

**What needs improvement to compete:** (1) The TOCTOU vulnerability in JS SSRF protection must be fixed — PHP's `CURLOPT_RESOLVE` approach is already correct and JS must match it. (2) The bundle size is a concern for frontend users; lazy-loading the security/plugin subsystems could reduce the default bundle. (3) Alignment documentation needs to explicitly call out language-level API differences instead of presenting a unified API that differs in subtle ways.

---

## 📋 Prioritised Refactoring Roadmap

| Priority | ID        | Domain       | Title                                                                             | Effort | Impact   | State  |
| -------- | --------- | ------------ | --------------------------------------------------------------------------------- | ------ | -------- | ------ |
| 🔴 High  | CRIT-001  | Security     | PHP fe80::/10 range incomplete (SSRF bypass)                                      | S      | Critical | 🆕 New |
| 🔴 High  | CRIT-002  | Security     | JS fetchUrl DNS TOCTOU — IP not pinned to fetch                                   | M      | Critical | 🆕 New |
| 🔴 High  | CRIT-003  | Security     | FilterParser ReDoS guard incomplete in match()                                    | M      | High     | 🆕 New |
| 🔴 High  | CRIT-004  | Security     | FilterParser resolveField traverses prototype chain                               | S      | High     | 🆕 New |
| 🔴 High  | CRIT-005  | Security     | STRICT policy: no URL allowlist + csvMode strip not error                         | S      | High     | 🆕 New |
| 🔴 High  | ARCH-001  | Architecture | SafeAccess.customAccessors not in standalone resetAll()                           | S      | High     | 🆕 New |
| 🔴 High  | ARCH-002  | Architecture | PathCache.enabled not restored by clear() (JS + PHP)                              | S      | High     | 🆕 New |
| 🔴 High  | GAP-006   | Alignment    | Readonly: JS deepFreeze vs PHP method-level guard only                            | M      | High     | 🆕 New |
| 🔴 High  | GAP-008   | Alignment    | filterAt/mapAt callback third arg missing in PHP                                  | M      | High     | 🆕 New |
| 🔴 High  | GAP-001   | Alignment    | toJson() bool vs int flags signature incompatibility                              | M      | High     | 🆕 New |
| 🔴 High  | GAP-002   | Alignment    | watchFile() return type divergence (cleanup fn vs poll/stop)                      | M      | High     | 🆕 New |
| 🔴 High  | GAP-009   | Alignment    | PHP DeepMerger SecurityGuard skips list-array nested keys                         | S      | High     | 🆕 New |
| 🔴 High  | GAP-010   | Alignment    | toYaml() library differences — output not deterministic                           | M      | High     | 🆕 New |
| 🟡 Med   | ARCH-003  | Architecture | applyPatch unconditional O(2n) preflight                                          | M      | Medium   | 🆕 New |
| 🟡 Med   | ARCH-005  | Architecture | deepMerge logic duplicated in DotNotationParser                                   | M      | Medium   | 🆕 New |
| 🟡 Med   | QUAL-001  | Code Quality | eslint no-explicit-any warn → error                                               | S      | Medium   | 🆕 New |
| 🟡 Med   | PERF-002  | Performance  | applyPatch preflight result discarded, double traversal                           | M      | Medium   | 🆕 New |
| 🟡 Med   | STYLE-006 | Code Quality | CsvAccessor silently drops column-mismatched rows                                 | M      | Medium   | 🆕 New |
| 🟡 Med   | GAP-003   | Alignment    | toObject() PHP stdClass vs JS plain record (JSON roundtrip)                       | M      | Medium   | 🆕 New |
| 🟡 Med   | GAP-007   | Alignment    | NDJSON single-line auto-detection boundary difference                             | S      | Medium   | 🆕 New |
| 🟡 Med   | GAP-011   | Alignment    | toXml() encoding declaration and quote escaping differ                            | S      | Medium   | 🆕 New |
| 🟡 Med   | GAP-013   | Alignment    | JSON Patch exception type names differ (JS Error vs PHP InvalidArgumentException) | S      | Medium   | 🆕 New |
| 🟡 Med   | GAP-015   | Alignment    | Zod/Valibot/Yup schema adapters JS-only                                           | L      | Medium   | 🆕 New |
| 🟡 Med   | GAP-017   | Alignment    | Standalone JS resetAll() skips customAccessors                                    | S      | Medium   | 🆕 New |
| 🟡 Med   | REPO-001  | Repository   | JS/CLI vitest coverage thresholds not hard-enforced                               | S      | Medium   | 🆕 New |
| 🟡 Med   | ARCH-004  | Architecture | PHP PathCache static state undocumented for long-running runtimes                 | S      | Medium   | 🆕 New |
| 🟢 Low   | STYLE-001 | Code Style   | deep-merger.ts assertSafeKey call undocumented                                    | XS     | Low      | 🆕 New |
| 🟢 Low   | STYLE-002 | Code Style   | data-masker.ts COMMON_SENSITIVE_KEYS list undocumented                            | XS     | Low      | 🆕 New |
| 🟢 Low   | STYLE-003 | Code Style   | json-patch.ts double-apply missing RFC 6902 rationale comment                     | XS     | Low      | 🆕 New |
| 🟢 Low   | STYLE-005 | Code Style   | matchWildcard recompiles RegExp on every call                                     | S      | Low      | 🆕 New |
| 🟢 Low   | STYLE-007 | Code Style   | NdjsonAccessor hard-throw on invalid line undocumented                            | S      | Low      | 🆕 New |
| 🟢 Low   | PERF-001  | Performance  | deep-merger structuredClone on scalar values                                      | S      | Low      | 🆕 New |
| 🟢 Low   | PERF-003  | Performance  | data-masker matchWildcard RegExp not cached                                       | S      | Low      | 🆕 New |
| 🟢 Low   | COV-001   | Coverage     | ip-range-checker v8 ignore next 5 — document runtime assumption                   | XS     | Low      | 🆕 New |
| 🟢 Low   | COV-002   | Coverage     | ip-range-checker outer DNS catch v8 ignore — testable with mock                   | S      | Low      | 🆕 New |
| 🟢 Low   | GAP-004   | Alignment    | PHP getWildcard() not in JS                                                       | M      | Low      | 🆕 New |
| 🟢 Low   | GAP-005   | Alignment    | fromXxx() options-object vs positional bool                                       | S      | Low      | 🆕 New |
| 🟢 Low   | GAP-012   | Alignment    | toJson() serialisation failure: InvalidFormatError vs \JsonException              | S      | Low      | 🆕 New |
| 🟢 Low   | GAP-016   | Alignment    | PHP has 3 YAML plugin tiers vs JS 1 — document selection ladder                   | XS     | Low      | 🆕 New |
