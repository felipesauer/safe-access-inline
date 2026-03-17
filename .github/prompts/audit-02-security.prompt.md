---
agent: agent
tools:
    - codebase
    - terminal
description: "Audit Step 2 (P1) — Security & Correctness analysis for the safe-access-inline monorepo. Covers OWASP Top 10, prototype-pollution, SSRF, CSV injection, readonly enforcement, JSON Patch atomicity, and path traversal. Depends on the Discovery Artifact from audit-01."
version: "1.0"
---

# 🔒 Audit 02 — Security & Correctness (P1)

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

Using the file paths in the Discovery Artifact, read each security-related module with the `codebase` tool before analysing it. **Do not skip a subsystem because an expected filename is absent** — discover actual files first.

Complete each concern fully before moving to the next. Produce one `[CRIT-NNN]` block per finding, numbered sequentially.

**Known State filtering:** Before reporting any finding, apply the Known State Protocol from `audit-shared.md`. Skip `accepted` findings entirely, list `deferred` findings only under a `### Still Deferred` section at the end, and report `open` findings that still exist as `[REGRESSION: <original-title>]` rather than new numbered findings.

---

## P1 — Security & Correctness

### OWASP Checks

- **Injection:** SQL Injection, XSS, command injection, path traversal — are all user-controlled inputs properly sanitised before use?
- **Broken access control:** Unauthorized data access or privilege escalation paths — are access boundaries enforced?
- **Cryptographic failures:** Weak hashing, plaintext secrets, insecure storage — are sensitive fields never stored or logged in plaintext?
- **Insecure design:** Missing input validation, unsafe deserialization, SSRF — are external inputs validated at all boundaries?
- **Security misconfiguration:** Permissive settings, exposed debug output, error message leakage to consumers

### Library-Specific Checks

**Prototype-pollution prevention**

- Are all dangerous keys blocked: `__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `valueOf`, `toString`?
- Both JS and PHP equivalents.

**Payload-size assertion**

- Is byte-length encoding correct (`TextEncoder` vs string length)?

**CSV injection**

- Are all prefix chars sanitised: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`?

**SSRF protection**

- Are all RFC 1918 / loopback / link-local / IPv6 ranges covered?
- Are redirect targets re-validated after following a redirect?

**Audit trail**

- Are all sensitive operations emitting events?
- Listener memory-leak risk (unbounded listeners)?

**Security policy defaults**

- Are `STRICT` / `PERMISSIVE` presets sensible for a library?

**Readonly enforcement**

- Is the readonly violation error thrown consistently for all write operations (`set`, `remove`, `merge`, `applyPatch`)?
- Does `deepFreeze` cover `prototype`/`__proto__`?
- Does `cloneWithState` propagate the readonly flag?

**JSON Patch (RFC 6902)**

- Are all six operations implemented?
- Does `applyPatch` roll back atomically on a failed `test` operation?
- Is `diff` correct on deeply nested + array structures?

**Path traversal**

- Does the allowed-dir assertion resolve symlinks?
- Is `fetchUrl` timeout-enforced?

**Deep merger**

- Does merge prevent prototype pollution from user-controlled objects?

---

## Output Format

Produce findings as sequential `[CRIT-NNN]` blocks using the format from `audit-shared.md`.

If a subsystem has no issues, state: _"No issues found in [subsystem]."_

At the end, produce a **Security Score Card**:

| Dimension           | Issues found | Critical | High | Medium | Low |
| ------------------- | ------------ | -------- | ---- | ------ | --- |
| Injection / OWASP   |              |          |      |        |     |
| Prototype pollution |              |          |      |        |     |
| SSRF                |              |          |      |        |     |
| CSV injection       |              |          |      |        |     |
| Readonly / Patch    |              |          |      |        |     |
| Audit trail         |              |          |      |        |     |
| Path traversal      |              |          |      |        |     |
| **Total**           |              |          |      |        |     |
