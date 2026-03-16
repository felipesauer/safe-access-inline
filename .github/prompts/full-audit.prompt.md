---
agent: agent
tools:
    - codebase
    - terminal
    - githubRepo
description: Consolidation prompt — run after completing the three individual audits to produce a unified cross-cutting report.
version: "2.0"
---

# 🧪 Full Audit Suite — safe-access-inline

## Audit Workflow

This suite consists of **three independent audit prompts** that should be run **sequentially in separate conversations**. After all three are complete, run this prompt to produce the consolidated report.

### Step 1 — Run each audit individually

Execute these prompts **one at a time, in separate sessions**:

| Order | Prompt                               | Focus                                                    |
| ----- | ------------------------------------ | -------------------------------------------------------- |
| 1     | `audit.prompt.md`                    | Code quality, security, architecture, performance, tests |
| 2     | `cross-language-alignment.prompt.md` | PHP ↔ JS/TS feature parity and behavioural equivalence   |
| 3     | `repo-structure-audit.prompt.md`     | Community health, CI/CD, manifests, documentation        |

> **Why separate sessions?** Each audit reads the entire codebase and produces a detailed report. Running all three in one session would overflow the context window, causing the agent to skip sections or lose coherence.

### Step 2 — Consolidate

After all three audits are complete, invoke **this prompt** and provide the three audit reports as context (paste the key findings or attach the output).

The agent will:

1. Read and cross-reference the three reports
2. Identify findings that appear in more than one report
3. Deduplicate and produce the consolidated report below

---

## Consolidated Report Format

### 🔴 Cross-Cutting Critical Issues

List findings that appear in **more than one audit** (e.g., a security gap flagged in both the codebase audit and the alignment audit). For each:

- State the issue once
- Reference the original finding IDs from both reports (e.g., `[CRIT-003]` from codebase audit + `[GAP-005]` from alignment audit)
- Explain why the cross-cutting nature increases the urgency

### 📋 Findings Index

| #   | Finding | Source Audit                          | Severity                       | Package                   |
| --- | ------- | ------------------------------------- | ------------------------------ | ------------------------- |
| 1   | ...     | Codebase / Alignment / Repo Structure | Critical / High / Medium / Low | php / js / cli / monorepo |

> Include **every** finding from all three audits. Deduplicate — if the same issue appears in two audits, list it once and reference both sources.

### 🏆 Repository Score Summary

Re-state the final score and grade from the Repository Structure Audit.

### 🚀 Top 25 Action Plan

List the 25 highest-impact actions across all three audits, ordered by priority:

| #   | Action | Package | Source Audit | Why it's top 25 |
| --- | ------ | ------- | ------------ | --------------- |
| 1   | ...    | ...     | ...          | ...             |
