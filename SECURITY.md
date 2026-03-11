# Security Policy

## Supported Versions

| Package | Version | Supported |
|---------|---------|:---------:|
| `safe-access-inline/safe-access-inline` (PHP) | 0.x | :white_check_mark: |
| `@safe-access-inline/safe-access-inline` (JS/TS) | 0.x | :white_check_mark: |

> Only the latest release of each package receives security updates.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

### How to Report

1. **Open a GitHub Issue** with the prefix `[SECURITY]` in the title.
   - Example: `[SECURITY] Arbitrary code execution via crafted TOML input`
2. **Include the following details:**
   - A clear description of the vulnerability
   - Steps to reproduce the issue
   - Affected package(s) and version(s)
   - Potential impact assessment
   - (Optional) A suggested fix or patch

### What to Expect

| Timeline | Action |
|----------|--------|
| **48 hours** | Acknowledgment of your report |
| **7 days** | Initial assessment and severity classification |
| **90 days** | Target deadline for a fix to be released |

We follow a **coordinated disclosure** approach. We ask that you:

- **Do not** publicly disclose the vulnerability until a fix has been released or the 90-day deadline has passed.
- **Do not** exploit the vulnerability beyond what is necessary to demonstrate it.
- **Do** provide us with reasonable time to address the issue.

### Scope

The following are considered security issues:

- **Injection attacks** — input that causes unintended code execution during parsing or transformation
- **Denial of service** — crafted input that causes excessive memory consumption or infinite loops
- **Data exposure** — scenarios where accessor operations leak data from unrelated contexts
- **Dependency vulnerabilities** — known CVEs in direct dependencies

The following are **not** considered security issues:

- Bugs that cause incorrect parsing output without security implications
- Feature requests or general usability issues
- Issues in development-only dependencies (devDependencies / require-dev)

## Security Best Practices

When using safe-access-inline in your projects:

- Always validate and sanitize external input **before** passing it to `SafeAccess` factory methods.
- Keep your dependencies up to date. Run `composer audit` (PHP) or `npm audit` (JS) regularly.
- When using the Plugin System, only register parser and serializer plugins from trusted sources.
