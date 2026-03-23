---
layout: home

hero:
    name: Safe Access Inline
    text: Complete Data Access Layer. PHP + JS/TS.
    tagline: Parse, transform, query, validate, stream, and secure structured data — safely — with one consistent API across PHP and TypeScript.
    image:
        src: /logo-hero.svg
        alt: Safe Access Inline
    actions:
        - theme: brand
          text: Get Started
          link: /guide/
        - theme: alt
          text: API Reference
          link: /js/api-reference
        - theme: alt
          text: View on GitHub
          link: https://github.com/felipesauer/safe-access-inline

features:
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'
      title: Zero Surprises
      details: "get() never throws — missing keys, null data, or wrong types always return your safe default. Freeze an accessor with { readonly&#58; true } and any write attempt throws ReadonlyViolationError. Production-safe by design."
      link: /guide/
      linkText: Quick start
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>'
      title: 10 Formats
      details: "JSON · XML · YAML · TOML · INI · CSV · ENV · NDJSON · Array · Object — one unified API, zero boilerplate. Auto-detect formats via detect(), infer from file extension, and convert between formats with transform(format)."
      link: /js/getting-started
      linkText: See all formats
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      title: Immutable by Design
      details: "Every write returns a new instance — internal data is never mutated. Enable deep-frozen readonly mode with { readonly&#58; true }; any subsequent set(), remove(), or merge() throws ReadonlyViolationError immediately."
      link: /js/api-reference
      linkText: API reference
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>'
      title: Powerful Queries
      details: "Wildcards (*.name) · Filters ([?price>20]) · Boolean logic ([?a&&b||c]) · Recursive descent (..key) · Slices ([0:5:2]) · Multi-index ([0,2,4]) · Template paths ({key}) · Filter functions&#58; length, match, starts_with, contains, keys."
      link: /guide/
      linkText: Path syntax
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
      title: TypeScript Types
      details: "Deep path inference with DeepPaths&lt;T&gt; and ValueAtPath&lt;T, P&gt; — fully typed get() and set() with no casting. Pre-compile hot paths once with SafeAccess.compilePath() and reuse a CompiledPath across loops for maximum performance."
      link: /js/api-reference
      linkText: TypeScript docs
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>'
      title: PHP ↔ JS Parity
      details: Identical API in both languages. Same paths, same results, same behavior — validated by a shared cross-package fixture suite that asserts identical outputs. Pick your stack; switch any time.
      link: /php/getting-started
      linkText: PHP docs
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'
      title: Security-First
      details: "Six hardened sub-systems&#58; prototype pollution guard · SSRF + IPv6 blocking · XML XXE prevention · CSV injection sanitizer (prefix / strip / error) · RFC 7230 header sanitization · ReDoS static analysis on filter regex. Plus 16 built-in sensitive-key auto-mask patterns."
      link: /js/security
      linkText: Security docs
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
      title: Schema Validation
      details: "validate(schema, adapter?) returns { valid, errors } and never throws. Built-in JsonSchemaAdapter needs no peer dependency (draft-07 subset). Plug in Zod, Valibot, or Yup via SchemaRegistry.setDefaultAdapter() for a process-wide default."
      link: /js/api-reference
      linkText: Schema adapters
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M18 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>'
      title: Extensible
      details: Override any parser or serializer via PluginRegistry — swap js-yaml, smol-toml, or any built-in driver. Shipped integrations for NestJS (SafeAccessModule), Vite (safeAccessPlugin), Laravel, and Symfony.
      link: /js/plugins
      linkText: Plugin guide
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>'
      title: File I/O
      details: Read and write files with fromFile() / writeFile() in sync and async variants. Path-traversal guard via allowedDirs enforces canonical OS-level paths — no TOCTOU races, no escape to parent directories. Supports allowedExtensions and maxSize limits.
      link: /js/api-reference
      linkText: File options
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
      title: URL Loading
      details: fromUrl(url, options?) fetches over HTTPS with full SSRF protection — private IPs blocked, DNS resolved before connect, redirects disabled, payload size capped. Restrict to allowedHosts and allowedPorts for zero-trust environments.
      link: /js/security
      linkText: URL options
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
      title: Streaming
      details: streamCsv() and streamNdjson() return an AsyncGenerator — one row or JSON line per iteration. Process gigabyte-scale files with a constant memory footprint. File handles are auto-closed on early break, preventing resource leaks.
      link: /js/api-reference
      linkText: Streaming API
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
      title: Layered Config
      details: "layer(accessors[]) deep-merges N accessors, last-wins — stack defaults, staging, and production overrides in a single call. layerFiles(paths[]) loads and merges N files. Perfect for 12-factor app config patterns."
      link: /js/api-features
      linkText: Layering guide
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      title: File Watcher
      details: watchFile(path, onChange, options?) re-parses the file on every change and delivers a fresh typed accessor to your callback. Returns an unsubscribe function. Ideal for hot-reload config in dev servers and long-running processes.
      link: /js/api-features
      linkText: Watcher API
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>'
      title: Audit Logging
      details: "onAudit(listener) fires on every observable operation — file.read, file.write, url.fetch, security.violation, data.mask, data.freeze, schema.validate, and more. Returns an unsubscribe function. Zero overhead when no listener is attached."
      link: /js/api-features
      linkText: Audit events
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>'
      title: JSON Patch
      details: "Full RFC 6902 support — diff(a, b) computes a minimal patch, applyPatch(ops) applies it atomically, validatePatch(ops) checks structure. All six operations&#58; add, remove, replace, move, copy, test. Throws JsonPatchTestFailedError on assertion failure."
      link: /js/api-reference
      linkText: JSON Patch API
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>'
      title: Debug & Trace
      details: trace(path) walks a dot-path segment-by-segment and reports the segment name, found status, and value type at each step — stops at the first missing key. Never throws. The fastest way to diagnose why a deep path returns a default.
      link: /js/api-reference
      linkText: Trace API
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>'
      title: CLI Tool
      details: "Query, transform, and manipulate data files straight from the terminal. 13 commands · 8 formats · piping support. safe-access get config.json 'user.name', diff, merge, validate, mask, and more — all with the same path syntax as the library."
      link: /cli/
      linkText: CLI reference
---
