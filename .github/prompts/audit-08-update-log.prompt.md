---
agent: agent
tools:
    - codebase
description: "Audit Step 8 — Updates AUDIT_LOG.md after a complete audit run. Merges new findings from audit-07, marks resolved items as fixed, and preserves accepted/deferred decisions. Must run after audit-07."
version: "1.0"
---

# 🔄 Audit 08 — Update Audit Log

> **Read `.github/prompts/audit-shared.md` first** using the `codebase` tool for context.

---

## Input: Known State Artifact (from audit-00)

<!-- Paste the full Known State Artifact produced by audit-00-bootstrap.prompt.md here -->

---

## Input: Full Audit Report (from audit-07)

<!-- Paste the full output of audit-07-report.prompt.md here -->

---

## Instructions

Merge the Known State Artifact with all findings extracted from the Full Audit Report. Apply the following rules for each entry:

| Source                  | Condition                                               | Action                                      |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Known State: `open`     | Finding **still present** in Report (fuzzy title match) | Keep as `open`, preserve existing row       |
| Known State: `open`     | Finding **not present** in Report                       | Change status to `fixed`, set Date to today |
| Known State: `accepted` | Any                                                     | Keep unchanged                              |
| Known State: `deferred` | Any                                                     | Keep unchanged                              |
| New finding in Report   | **Not present** in Known State (any status)             | Add as `open`, set Date to today            |

**Matching rule:** Match findings by title (semantic/fuzzy), not by ID number alone — IDs may shift between runs. When uncertain whether two titles refer to the same finding, keep both (do not silently merge).

**Today's date:** use the current date from your context.

**Extract all findings from the Report:** Every `[CRIT-NNN]`, `[ARCH-NNN]`, `[QUAL-NNN]`, `[STYLE-NNN]`, `[PERF-NNN]`, `[COV-NNN]`, `[GAP-NNN]` block, as well as each ⚠️/❌ repo structure criterion from audit-05.

---

## Output

Produce the **complete, updated content** of `.github/audit/AUDIT_LOG.md` inside a single fenced code block. Then print this instruction:

> Copy the block above and replace the full contents of `.github/audit/AUDIT_LOG.md`, then commit:
>
> ```bash
> git add .github/audit/AUDIT_LOG.md
> git commit -m "chore(audit): update audit log $(date +%Y-%m-%d)"
> ```
