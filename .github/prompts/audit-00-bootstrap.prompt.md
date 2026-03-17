---
agent: agent
tools:
    - codebase
description: "Audit Step 0 — Reads AUDIT_LOG.md and produces the Known State Artifact consumed by all subsequent audit prompts (02–07). Must run before audit-01."
version: "1.0"
---

# 🗂️ Audit 00 — Bootstrap Known State

> **Read `.github/prompts/audit-shared.md` first** using the `codebase` tool to load role and the Known State Protocol.

---

## Instructions

1. Read `.github/audit/AUDIT_LOG.md` using the `codebase` tool.
2. Check the `Findings` table:
    - If the table has **no data rows** (only the header, or the file says "—"), produce an **empty Known State Artifact** (all sections say "None") and stop. This is a first run.
    - Otherwise, parse every row and group entries by their `Status` column into the three sections below.

**Matching guidance:** Subsequent prompts will match findings by **title** (semantic/fuzzy), not by ID number alone — IDs may shift between runs. Extract titles accurately.

---

## Output: Known State Artifact

Produce the following block verbatim, filling in each section. Copy the entire block and paste it into the `## Input: Known State Artifact` placeholder in audit-02 through audit-07.

```markdown
## Known State Artifact

_Generated: YYYY-MM-DD from `.github/audit/AUDIT_LOG.md`_

### Accepted findings — DO NOT re-report these

<!--
List each entry as: `ID — Title`
If none: write "None"
-->

### Deferred findings — list as "still deferred" only, do not count in scores

<!--
List each entry as: `ID — Title`
If none: write "None"
-->

### Open findings — report as [REGRESSION] if still present

<!--
List each entry as: `ID — Title`
If none: write "None"
-->
```
