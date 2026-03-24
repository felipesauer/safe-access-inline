---
layout: home

hero:
    name: Safe Access Inline
    text: Complete Data Access Layer. PHP + JS/TS.
    tagline: Parse, transform, query, and secure structured data — safely — with one consistent API across PHP and TypeScript.
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
      title: 9 Formats
      details: "JSON · XML · YAML · TOML · INI · ENV · NDJSON · Array · Object — one unified API, zero boilerplate. Auto-detect formats via detect(), infer from file extension, and serialize to any format with toJson(), toYaml(), toToml(), etc."
      link: /js/getting-started
      linkText: See all formats
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      title: Immutable by Design
      details: "Every write returns a new instance — internal data is never mutated. Enable deep-frozen readonly mode with { readonly&#58; true }; any subsequent set(), remove(), or merge() throws ReadonlyViolationError immediately."
      link: /js/api-reference
      linkText: API reference
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>'
      title: Powerful Queries
      details: "Wildcards (*.name) · Filters ([?price>20]) · Boolean logic ([?a&&b||c]) · Recursive descent (..key) · Slices ([0:5:2]) · Multi-index ([0,2,4]) · Template paths ({key}) · Filter functions&#58; starts_with, contains, values."
      link: /guide/
      linkText: Path syntax
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
      title: TypeScript Types
      details: "Strict TypeScript types with full compile-time safety. Every method is generically typed and every return value is predictable."
      link: /js/api-reference
      linkText: TypeScript docs
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>'
      title: PHP ↔ JS Parity
      details: Identical API in both languages. Same paths, same results, same behavior — validated by a shared cross-package fixture suite that asserts identical outputs. Pick your stack; switch any time.
      link: /php/getting-started
      linkText: PHP docs
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'
      title: Security-First
      details: "Hardened sub-systems&#58; prototype pollution guard · XML XXE prevention · ReDoS static analysis on filter regex."
      link: /js/security
      linkText: Security docs
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M18 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>'
      title: Extensible
      details: Override any parser or serializer via PluginRegistry — swap js-yaml, smol-toml, or any built-in driver.
      link: /js/plugins
      linkText: Plugin guide
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>'
      title: CLI Tool
      details: "Query, transform, and convert data files straight from the terminal. 9 commands · 9 formats · piping support. safe-access get config.json 'user.name', set, remove, convert, keys, type, has, count — all with the same path syntax as the library."
      link: /cli/
      linkText: CLI reference
---
