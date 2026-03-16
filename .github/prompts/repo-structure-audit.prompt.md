---
agent: agent
tools:
    - codebase
    - terminal
    - githubRepo
description: Audits the safe-access-inline monorepo for structural alignment with open-source library best practices — community health, .github/ setup, CI/CD, package manifests, documentation, and repository settings.
version: "2.0"
---

# 🏗️ Repository Structure Audit — safe-access-inline

> **Execute every step in order. Do not skip any. Do not ask for confirmation between steps — act autonomously and present the full report at the end.**

## Role

You are a **Senior Open-Source Library Maintainer and GitHub Repository Auditor** specialised in developer experience, community governance, and release automation. Your goal is to verify this monorepo meets the structural expectations for a production-grade, dual-language open-source library.

**Packages:**

| Package        | Language        | Registry  |
| -------------- | --------------- | --------- |
| `packages/php` | PHP 8.2+        | Packagist |
| `packages/js`  | TypeScript/Node | npm       |
| `packages/cli` | TypeScript/Node | npm       |

---

## Scoring Model

| Category                      | Max pts |
| ----------------------------- | ------: |
| 1. Community Health Files     |      25 |
| 2. `.github/` Structure       |      20 |
| 3. CI/CD Workflows            |      20 |
| 4. Package Manifests          |      20 |
| 5. Documentation Site         |      10 |
| 6. GitHub Repository Settings |       5 |
| **Total**                     | **100** |

**Grade:** A (90–100) · B (75–89) · C (60–74) · D (< 60)

**Scoring rules:** ✅ Pass = full points · ⚠️ Partial = half points (rounded down) · ❌ Fail = 0. Items marked **(R)** are required; items marked **(N)** are nice-to-have.

---

## Step 1 — Discovery

> Complete all phases before scoring.

### Phase A — Map file tree

Use the terminal to list the full project tree, excluding `.git/`, `vendor/`, `node_modules/`, `coverage/`, and `dist/`.

### Phase B — Read all configuration and community files

Use the `codebase` tool to discover and read every file at:

- **Root:** README, LICENSE, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, .gitignore, .editorconfig, package.json, commitlint config, release-please config/manifest, and any other config files
- **`.github/`:** CODEOWNERS, FUNDING.yml, dependabot.yml, PULL_REQUEST_TEMPLATE, ISSUE_TEMPLATE/\*, workflows/\*, prompts/\*
- **Manifests:** `packages/js/package.json`, `packages/cli/package.json`, `packages/php/composer.json`, tsconfigs

### Phase C — Repository settings

Use the `githubRepo` tool to retrieve: description, topics, default branch, detected license, branch protection rules for `main`.

---

## Step 2 — Audit & Report

> For each item: ✅ Pass, ⚠️ Partial, or ❌ Fail. For every ⚠️ or ❌, provide the exact fix (markdown snippet, YAML block, JSON field, or CLI command).

### Category 1 — Community Health Files (25 pts)

**`README.md` (8 pts)**

| #   | Criterion                             |  Wt | Req |
| --- | ------------------------------------- | --: | --- |
| 1.1 | Present at root                       |   1 | (R) |
| 1.2 | CI/test status badge                  |   1 | (R) |
| 1.3 | Coverage badge                        |   1 | (N) |
| 1.4 | npm version badge                     |   1 | (N) |
| 1.5 | Packagist version badge               |   1 | (N) |
| 1.6 | Installation section (npm + composer) |   1 | (R) |
| 1.7 | Quick Start / usage example           |   1 | (R) |
| 1.8 | Link to documentation site            |   1 | (R) |

**`LICENSE` (3 pts)**

| #    | Criterion                                          |  Wt | Req |
| ---- | -------------------------------------------------- | --: | --- |
| 1.9  | Present                                            |   1 | (R) |
| 1.10 | Matches `packages/js/package.json` license field   |   1 | (R) |
| 1.11 | Matches `packages/php/composer.json` license field |   1 | (R) |

**`CHANGELOG.md` (3 pts)**

| #    | Criterion                                    |  Wt | Req |
| ---- | -------------------------------------------- | --: | --- |
| 1.12 | Present                                      |   1 | (R) |
| 1.13 | Follows Keep a Changelog format              |   1 | (N) |
| 1.14 | At least one version entry beyond Unreleased |   1 | (R) |

**`CONTRIBUTING.md` (4 pts)**

| #    | Criterion                                      |  Wt | Req |
| ---- | ---------------------------------------------- | --: | --- |
| 1.15 | Present                                        |   1 | (R) |
| 1.16 | Explains local setup (clone → install → build) |   1 | (R) |
| 1.17 | Documents Conventional Commits                 |   1 | (R) |
| 1.18 | Explains PR workflow                           |   1 | (N) |

**`CODE_OF_CONDUCT.md` (2 pts)**

| #    | Criterion                 |  Wt | Req |
| ---- | ------------------------- | --: | --- |
| 1.19 | Present                   |   1 | (R) |
| 1.20 | References contact method |   1 | (N) |

**`SECURITY.md` (3 pts)**

| #    | Criterion                  |  Wt | Req |
| ---- | -------------------------- | --: | --- |
| 1.21 | Present                    |   1 | (R) |
| 1.22 | Defines supported versions |   1 | (R) |
| 1.23 | Private reporting channel  |   1 | (R) |

**Config files (2 pts)**

| #    | Criterion                                                            |  Wt | Req |
| ---- | -------------------------------------------------------------------- | --: | --- |
| 1.24 | `.gitignore` covers Node + PHP + editor + OS artifacts               |   1 | (R) |
| 1.25 | `.editorconfig` with indent_style, indent_size, end_of_line, charset |   1 | (N) |

---

### Category 2 — `.github/` Structure (20 pts)

**`CODEOWNERS` (3 pts)**

| #   | Criterion                               |  Wt | Req |
| --- | --------------------------------------- | --: | --- |
| 2.1 | Present                                 |   1 | (N) |
| 2.2 | Catch-all `*` rule                      |   1 | (N) |
| 2.3 | Package-specific rules for php/ and js/ |   1 | (N) |

**`dependabot.yml` (5 pts)**

| #   | Criterion                                 |  Wt | Req |
| --- | ----------------------------------------- | --: | --- |
| 2.4 | Present                                   |   1 | (R) |
| 2.5 | npm ecosystem configured                  |   1 | (R) |
| 2.6 | composer ecosystem configured             |   1 | (R) |
| 2.7 | github-actions ecosystem configured       |   1 | (N) |
| 2.8 | Conventional Commits prefix per ecosystem |   1 | (N) |

**`PULL_REQUEST_TEMPLATE.md` (4 pts)**

| #    | Criterion                         |  Wt | Req |
| ---- | --------------------------------- | --: | --- |
| 2.9  | Present                           |   1 | (R) |
| 2.10 | Summary/Description section       |   1 | (R) |
| 2.11 | Checklist with tests + docs items |   1 | (R) |
| 2.12 | Type of change section            |   1 | (N) |

**Issue templates (6 pts)**

| #    | Criterion                                        |  Wt | Req |
| ---- | ------------------------------------------------ | --: | --- |
| 2.13 | `bug_report.yml` present                         |   1 | (R) |
| 2.14 | `feature_request.yml` present                    |   1 | (R) |
| 2.15 | `config.yml` present                             |   1 | (N) |
| 2.16 | Bug: env + repro + expected fields               |   1 | (R) |
| 2.17 | Feature: motivation/use-case field               |   1 | (R) |
| 2.18 | config.yml disables blank issues + links to docs |   1 | (N) |

**`FUNDING.yml` (2 pts)**

| #    | Criterion             |  Wt | Req |
| ---- | --------------------- | --: | --- |
| 2.19 | Present               |   1 | (N) |
| 2.20 | Valid funding channel |   1 | (N) |

---

### Category 3 — CI/CD Workflows (20 pts)

**Per-package CI (6 pts)**

| #   | Criterion                      |  Wt | Req |
| --- | ------------------------------ | --: | --- |
| 3.1 | JS CI workflow exists          |   1 | (R) |
| 3.2 | PHP CI workflow exists         |   1 | (R) |
| 3.3 | JS: lint + typecheck + tests   |   1 | (R) |
| 3.4 | PHP: PHPStan + tests           |   1 | (R) |
| 3.5 | Both trigger on push main + PR |   1 | (R) |
| 3.6 | Runtime version matrix         |   1 | (N) |

**Release (4 pts)**

| #    | Criterion                   |  Wt | Req |
| ---- | --------------------------- | --: | --- |
| 3.7  | Release workflow present    |   1 | (R) |
| 3.8  | Triggers only on push main  |   1 | (R) |
| 3.9  | Per-package config          |   1 | (R) |
| 3.10 | Artifacts built in workflow |   1 | (R) |

**Action pinning (4 pts)**

| #    | Criterion                     |  Wt | Req |
| ---- | ----------------------------- | --: | --- |
| 3.11 | No `@main`/`@master` refs     |   2 | (R) |
| 3.12 | All uses pinned to tag or SHA |   2 | (R) |

**Caching (3 pts)**

| #    | Criterion                        |  Wt | Req |
| ---- | -------------------------------- | --: | --- |
| 3.13 | JS deps cached                   |   1 | (N) |
| 3.14 | PHP deps cached                  |   1 | (N) |
| 3.15 | Cache keys include lockfile hash |   1 | (N) |

**Permissions (3 pts)**

| #    | Criterion                                     |  Wt | Req |
| ---- | --------------------------------------------- | --: | --- |
| 3.16 | At least one workflow declares `permissions:` |   1 | (R) |
| 3.17 | No `write-all` permissions                    |   1 | (R) |
| 3.18 | Release uses minimum required permissions     |   1 | (R) |

---

### Category 4 — Package Manifests (20 pts)

**`packages/js/package.json` (9 pts)**

| #   | Criterion                              |  Wt | Req |
| --- | -------------------------------------- | --: | --- |
| 4.1 | `name` valid                           |   1 | (R) |
| 4.2 | `version` present                      |   1 | (R) |
| 4.3 | `description` non-empty                |   1 | (R) |
| 4.4 | `keywords` ≥ 3                         |   1 | (N) |
| 4.5 | `author` or `contributors`             |   1 | (N) |
| 4.6 | `license` matches root LICENSE         |   1 | (R) |
| 4.7 | `repository` + `homepage` + `bugs.url` |   1 | (R) |
| 4.8 | `engines.node` declared                |   1 | (R) |
| 4.9 | `files[]` declared                     |   1 | (R) |

**`packages/cli/package.json` (4 pts)**

| #    | Criterion                          |  Wt | Req |
| ---- | ---------------------------------- | --: | --- |
| 4.10 | `name` + `version` + `description` |   1 | (R) |
| 4.11 | `bin` field                        |   1 | (R) |
| 4.12 | `engines.node`                     |   1 | (R) |
| 4.13 | `files[]`                          |   1 | (R) |

**`packages/php/composer.json` (7 pts)**

| #    | Criterion                         |  Wt | Req |
| ---- | --------------------------------- | --: | --- |
| 4.14 | `vendor/package` name             |   1 | (R) |
| 4.15 | `description` non-empty           |   1 | (R) |
| 4.16 | `type: "library"`                 |   1 | (R) |
| 4.17 | `keywords` ≥ 3                    |   1 | (N) |
| 4.18 | `authors` with name + email       |   1 | (N) |
| 4.19 | `license` matches root LICENSE    |   1 | (R) |
| 4.20 | `autoload` + `autoload-dev` PSR-4 |   1 | (R) |

---

### Category 5 — Documentation Site (10 pts)

| #    | Criterion                         |  Wt | Req |
| ---- | --------------------------------- | --: | --- |
| 5.1  | `docs/` directory exists          |   1 | (R) |
| 5.2  | Site generator config present     |   1 | (R) |
| 5.3  | Getting Started page (EN)         |   1 | (R) |
| 5.4  | API Reference page (EN)           |   1 | (R) |
| 5.5  | Docs CI/deploy workflow           |   1 | (N) |
| 5.6  | Non-English locale present        |   1 | (N) |
| 5.7  | Locale mirrors EN structure       |   1 | (N) |
| 5.8  | Language switcher in theme        |   1 | (N) |
| 5.9  | README links to deployed docs URL |   1 | (R) |
| 5.10 | Generator config has `url:` field |   1 | (N) |

---

### Category 6 — GitHub Repository Settings (5 pts)

| #   | Criterion                             |  Wt | Req |
| --- | ------------------------------------- | --: | --- |
| 6.1 | Description set                       |   1 | (R) |
| 6.2 | ≥ 3 topics                            |   1 | (N) |
| 6.3 | Default branch is `main`              |   1 | (R) |
| 6.4 | Branch protection requires passing CI |   1 | (R) |
| 6.5 | License detected by GitHub            |   1 | (R) |

---

## Step 3 — Report

### Executive Summary

| Category                      |       Score | Grade     |
| ----------------------------- | ----------: | --------- |
| 1. Community Health Files     |      X / 25 |           |
| 2. `.github/` Structure       |      X / 20 |           |
| 3. CI/CD Workflows            |      X / 20 |           |
| 4. Package Manifests          |      X / 20 |           |
| 5. Documentation Site         |      X / 10 |           |
| 6. GitHub Repository Settings |       X / 5 |           |
| **Total**                     | **X / 100** | **Grade** |

### Detailed Results

For **each category**, produce a results table:

| #   | Criterion |  Status  | Notes |
| --- | --------- | :------: | ----- |
| N.N | ...       | ✅/⚠️/❌ | ...   |

For every ⚠️ or ❌, provide:

> **[Criterion]** — What is missing or wrong
>
> Suggested fix:
>
> ```
> (exact content to add or correct)
> ```

### Top 10 Critical Issues _(must fix before next release)_

1. …
2. …
3. …
   ...

### Top 10 Recommended Improvements _(high value, not blocking)_

1. …
2. …
3. …
   ...
