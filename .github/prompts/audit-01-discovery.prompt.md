---
agent: agent
tools:
    - codebase
    - terminal
    - githubRepo
description: "Audit Step 1 — Discovers and maps the full repository: source files, configuration, public API surface, and GitHub settings. Produces a structured discovery artifact consumed by all subsequent audit prompts."
version: "1.0"
---

# 🔍 Audit 01 — Discovery

> **Read `.github/prompts/audit-shared.md` first** using the `codebase` tool to load role, packages, and conventions before proceeding.

> **Execute every phase in order. Do not skip any. At the end, produce the structured Discovery Artifact described below.**

---

## Phase A — Map Project Structure

Use the terminal to list the full project tree, excluding `vendor/`, `node_modules/`, `coverage/`, and `dist/` directories:

```bash
find . \
  -not \( -path "*/vendor/*" -o -path "*/node_modules/*" -o -path "*/coverage/*" -o -path "*/dist/*" \) \
  | sort
```

Also list all root-level configuration files:

```bash
ls -la
```

---

## Phase B — Read All Source Files

Use the `codebase` tool to discover and read **all** files that currently exist — do not assume any specific filename:

- All `*.ts` source, test, and benchmark files under `packages/js/` and `packages/cli/`
- All `*.php` source, test, and benchmark files under `packages/php/`
- All configuration files at each package root and the repository root (manifests, linter configs, CI configs, tsconfig, phpstan, phpunit, etc.)
- All files under `.github/workflows/`
- All community health and `.github/` files: `CODEOWNERS`, `FUNDING.yml`, `dependabot.yml`, `PULL_REQUEST_TEMPLATE`, `ISSUE_TEMPLATE/*`, `prompts/*`

---

## Phase C — Understand the Library

Read the main `README.md` and the public entry points (`packages/js/src/index.ts`, `packages/php/src/SafeAccess.php`) to build a complete picture of the library's features and public API.

**Use the discovered source code as the ground truth** — not any hardcoded list.

---

## Phase D — Repository Settings

Use the `githubRepo` tool to retrieve:

- Repository description and topics
- Default branch
- Detected license
- Branch protection rules for `main`

---

## Discovery Artifact (Output)

Produce a single structured markdown block with the following sections. This artifact must be **pasted as input** into each of the subsequent audit prompts (02–06).

```markdown
## Discovery Artifact

### Project Tree

<!-- condensed output from `find` command -->

### Root Config Files

<!-- list of files at repo root -->

### JS/TS Source Files (`packages/js/` + `packages/cli/`)

<!-- full paths of every *.ts file discovered -->

### PHP Source Files (`packages/php/`)

<!-- full paths of every *.php file discovered -->

### CI/CD Workflows

<!-- full paths of every .github/workflows/*.yml file discovered -->

### Community Health Files

<!-- list of discovered: README.md, LICENSE, CHANGELOG.md, CONTRIBUTING.md,
     CODE_OF_CONDUCT.md, SECURITY.md, .gitignore, .editorconfig,
     CODEOWNERS, FUNDING.yml, dependabot.yml, PULL_REQUEST_TEMPLATE,
     ISSUE_TEMPLATE/*, prompts/* -->

### Public API Surface — JS (`packages/js/src/index.ts`)

<!-- every exported symbol with its type signature -->

### Public API Surface — PHP (`packages/php/src/SafeAccess.php`)

<!-- every public method with its signature -->

### GitHub Repository Settings

- Description: ...
- Topics: ...
- Default branch: ...
- License: ...
- Branch protection (main): ...
```
