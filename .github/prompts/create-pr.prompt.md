---
agent: agent
tools:
    - terminal
    - github-pull-request_activePullRequest
description: Creates a Pull Request with a title derived from the branch name and an auto-generated description
---

# Create Pull Request

Follow all steps below **in order**. Do not skip any step. Do not ask for confirmation between steps — execute everything autonomously and only present the final result to the user.

---

## Step 1 — Get current branch

Run:

```sh
git branch --show-current
```

The branch **must** follow the pattern `{type}/{slug}`, where:

- `{type}` is a Conventional Commits type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `revert`
- `{slug}` is a kebab-case description, e.g. `create-yaml-accessor`

If the branch does not follow this pattern, stop and warn the user:

> ⚠️ Branch name does not follow the required pattern `{type}/{slug}` (e.g. `feat/create-yaml-accessor`). Please rename the branch before creating the PR.

---

## Step 2 — Detect scope from changed files

Run:

```sh
git diff --name-only origin/main...HEAD
```

Map file paths to a scope using the table below:

| Files changed match                         | Scope  |
| ------------------------------------------- | ------ |
| `packages/js/**`                            | `js`   |
| `packages/php/**`                           | `php`  |
| `docs/**`                                   | `docs` |
| `.github/**` or `*.yml` (CI)                | `ci`   |
| `package.json`, `composer.json`, lock files | `deps` |

Rules:

- If files span **multiple packages** (`js` and `php`), count how many files belong to each and use the **scope with more files**
- If it is a tie, use `js`
- Valid scopes are: `js`, `php`, `docs`, `ci`, `deps`

---

## Step 3 — Build the PR title

Format:

```
{type}({scope}): {slug with hyphens replaced by spaces}
```

Examples:
| Branch | Scope detected | Title |
|---------------------------------|----------------|----------------------------------------|
| `feat/create-yaml-accessor` | `js` | `feat(js): create yaml accessor` |
| `fix/null-pointer-array` | `php` | `fix(php): null pointer array` |
| `docs/update-readme` | `docs` | `docs(docs): update readme` |
| `chore/upgrade-dependencies` | `deps` | `chore(deps): upgrade dependencies` |
| `ci/add-pr-title-workflow` | `ci` | `ci(ci): add pr title workflow` |

---

## Step 4 — Gather context for the description

Run both commands:

```sh
git log --oneline origin/main...HEAD
```

```sh
git diff --stat origin/main...HEAD
```

Use the output to understand:

- What was added, changed, or removed
- Which files were most impacted
- If any breaking changes are implied (e.g. deleted public methods, renamed exports, changed interfaces)
- If any commit message references an issue (e.g. `Closes #123`, `Fixes #45`)

---

## Step 5 — Generate the PR description

Use the context from Step 4 to write the body. Follow this structure **exactly**:

```markdown
## Summary

{2–3 direct sentences. What was done, why it was necessary, and what impact it has.
Be specific — mention the feature, fix, or change by name. Do NOT use vague language like "various improvements".}

## Changes

- {Relevant behavioral or functional change — not a file name}
- {Another meaningful change}
- {Add as many bullets as needed, remove this line if only one change}

## Breaking Changes

{Remove this entire section if there are no breaking changes.
If there are, describe exactly what breaks and how consumers should migrate.}

## Related

{Remove this entire section if no issues are referenced in commits.
Otherwise list: Closes #N}

## Checklist

- [ ] Tests added or updated
- [ ] Static analysis passes (`phpstan analyse` / `tsc --noEmit`)
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Documentation updated (if applicable)
```

Rules for the description:

- **Summary** must be 2–3 sentences max — no bullet points inside it
- **Changes** bullets describe _what changed_ in terms of behavior, not file names
- Omit **Breaking Changes** entirely if not applicable — do not leave it with placeholder text
- Omit **Related** entirely if no issue numbers are found in commits
- Do not add extra sections beyond what is defined above
- Write in **English**, past tense (e.g. "Added support for...", "Fixed an issue where...")

---

## Step 6 — Create the PR

Use the `github-pull-request_activePullRequest` tool or `gh` CLI to create the PR with:

- **Title**: the title from Step 3
- **Body**: the description from Step 5
- **Base branch**: `main`

If the GitHub tool is available, prefer it. Otherwise run:

```sh
gh pr create \
  --title "{title from Step 3}" \
  --body "{description from Step 5}" \
  --base main
```

---

## Final output to the user

After creating the PR, present a brief confirmation:

```
✅ PR created successfully

Title: {title}
URL:   {url}
```

Do not repeat the full description in the final message.
