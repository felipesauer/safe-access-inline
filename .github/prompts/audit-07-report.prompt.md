---
agent: agent
tools:
    - codebase
description: "Audit Step 5 — Synthesises all findings from audit-02 through audit-06 into the full, final audit report. Produces Executive Summary, Code Quality Report, Repository Structure Report, Alignment Report, Industry Comparison, and Prioritised Roadmap. Depends on outputs of all previous audit prompts."
version: "1.0"
---

# 📋 Audit 07 — Full Audit Report (Synthesis)

> **Read `.github/prompts/audit-shared.md` first** using the `codebase` tool to load role, prefixes, and finding formats.

> **Paste the outputs from ALL previous audit prompts below before running this prompt.**

---

## Input: All Audit Outputs

### Discovery Artifact (from audit-01)

<!-- Paste here -->

### Security Findings `[CRIT-NNN]` + Security Score Card (from audit-02)

<!-- Paste here -->

### Architecture & Quality Findings `[ARCH-NNN]` `[QUAL-NNN]` + Score Card (from audit-03)

<!-- Paste here -->

### Quality, Static Analysis & Coverage Findings `[STYLE-NNN]` `[PERF-NNN]` `[COV-NNN]` (from audit-04)

<!-- Paste here -->

### Repository Structure Scored Tables (from audit-05)

<!-- Paste here -->

### Feature Matrix + Gap Findings `[GAP-NNN]` + Alignment Score (from audit-06)

<!-- Paste here -->

---

## Instructions

Consolidate all inputs into the structured report below. Do **not** re-analyse the code — synthesise only from the provided inputs. Do not omit any finding or gap.

---

## 📋 Executive Summary

- **Overall code quality score:** X/10
- **Repository structure score:** X/100 (Grade: X)
- One paragraph summarising the overall state of the repository ("Given the findings across security, architecture, quality, repository structure, and cross-language alignment, the project is in a … state with … as the most critical areas to address.")

**Quick Verdict Table:**

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
| Cross-Language Alignment | /10   | 🟢/🟡/🔴 |
| Repository Structure     | /100  | 🟢/🟡/🔴 |

---

## Code Quality Report

### ✅ Strengths

What is genuinely good. Be specific, reference real files.

### 🚨 Critical Bugs & Security Issues

All `[CRIT-NNN]` findings from audit-02.

### ⚠️ Quality & Maintainability

All `[QUAL-NNN]` findings from audit-03.

### 🏗️ Architecture & Design

All `[ARCH-NNN]` findings from audit-03.

### 🏷️ Naming & Style

All `[STYLE-NNN]` findings from audit-04.

### ⚡ Performance

All `[PERF-NNN]` findings from audit-04.

### 🧪 Coverage Suppression Audit

All `[COV-NNN]` findings and summary table from audit-04.

**Security & Performance Score Card** (from audit-02 and audit-03):

| Dimension           | Issues found | Critical | High | Medium | Low |
| ------------------- | ------------ | -------- | ---- | ------ | --- |
| Security            |              |          |      |        |     |
| Memory              |              |          |      |        |     |
| Loops & Logic       |              |          |      |        |     |
| Async & Concurrency |              |          |      |        |     |
| **Total**           |              |          |      |        |     |

---

## Repository Structure Report

Full scored table for all 6 categories with ✅ / ⚠️ / ❌ per criterion and exact fixes.

**Final score: X/100 — Grade X**

---

## Cross-Language Alignment Report

### 📊 Feature Matrix

_(from audit-06 Phase A)_

### 🔍 Alignment Findings

All `[GAP-NNN]` blocks grouped by severity: 🔴 CRITICAL → 🟠 MAJOR → 🟡 MINOR → 🔵 INFO

**Total gaps by severity:** `🔴 N · 🟠 N · 🟡 N · 🔵 N`

**Alignment score:** `EXCELLENT` / `GOOD` / `NEEDS WORK` / `POOR`

### 🧪 Test Alignment Summary

_(from audit-06 Phase C)_

### 📝 Documentation Alignment Summary

_(from audit-06 Phase C)_

---

## 🆚 Comparison with Industry References

Compare against: `lodash.get`, `dot-prop`, `get-value`, `adrot/dot`, `data-get` (PHP).

> **⚠️ Hallucination guard:** Only include features you can verify from published documentation or source code. Mark uncertain entries as `❓ Unverified`. Do not guess.

Write a paragraph on what this library does **better** and what needs improvement to compete.

---

## 📋 Prioritised Refactoring Roadmap

Consolidate **every** finding across all three audit domains into one prioritised table. **No issue may be omitted.**

| Priority | ID        | Domain         | Title | Effort | Impact |
| -------- | --------- | -------------- | ----- | ------ | ------ |
| 🔴 High  | CRIT-001  | Code Quality   | ...   | S/M/L  | High   |
| 🔴 High  | GAP-001   | Alignment      | ...   | S/M/L  | High   |
| 🟡 Med   | QUAL-002  | Code Quality   | ...   | S/M/L  | Med    |
| 🟡 Med   | Repo-3.11 | Repo Structure | ...   | S/M/L  | Med    |
| 🟢 Low   | STYLE-003 | Code Quality   | ...   | S/M/L  | Low    |

Every finding (`CRIT`, `QUAL`, `ARCH`, `STYLE`, `PERF`, `COV`, `GAP`, and repo structure fixes) **must** appear in this table.
