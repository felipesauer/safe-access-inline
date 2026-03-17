# What is Safe Access Inline?

**Safe Access Inline** is a format-agnostic data access library that provides a single, unified API for safely reading, writing, and transforming deeply nested data structures — in both **PHP** and **JavaScript/TypeScript**.

## Why?

Accessing nested data from configs, APIs, or file formats usually means writing defensive chains of `isset`, optional chaining, or `try/catch` blocks — each format with its own quirks.

**Safe Access Inline** gives you one API that works the same everywhere:

::: code-group

```php [PHP]
use SafeAccessInline\SafeAccess;

$accessor = SafeAccess::from('{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}');
$accessor->get('user.name');              // "Ana"
$accessor->get('user.email', 'N/A');      // "N/A" — never throws
$accessor->get('items.*.price');          // [10, 50] — wildcard
$accessor->get('items[?price>20].price'); // [50] — filter
$accessor->get('..name');                 // ["Ana"] — recursive descent
```

```ts [JavaScript / TypeScript]
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const accessor = SafeAccess.from(
    '{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}',
);
accessor.get("user.name"); // "Ana"
accessor.get("user.email", "N/A"); // "N/A" — never throws
accessor.get("items.*.price"); // [10, 50] — wildcard
accessor.get("items[?price>20].price"); // [50] — filter
accessor.get("..name"); // ["Ana"] — recursive descent
```

:::

No exceptions. No surprises. One API, 10 formats.

## Supported Formats

| Format | PHP | JS/TS | Dependencies                                        |
| ------ | :-: | :---: | --------------------------------------------------- |
| Array  | ✅  |  ✅   | None                                                |
| Object | ✅  |  ✅   | None                                                |
| JSON   | ✅  |  ✅   | `ext-json` (native)                                 |
| XML    | ✅  |  ✅   | `ext-simplexml` (native) / built-in parser          |
| YAML   | ✅  |  ✅   | `ext-yaml` or `symfony/yaml` (PHP) / `js-yaml` (JS) |
| TOML   | ✅  |  ✅   | `devium/toml` (PHP) / `smol-toml` (JS)              |
| INI    | ✅  |  ✅   | Native                                              |
| CSV    | ✅  |  ✅   | Native                                              |
| ENV    | ✅  |  ✅   | Native                                              |
| NDJSON | ✅  |  ✅   | Native                                              |

## Path Expressions

| Syntax                | Description               | Example                          |
| --------------------- | ------------------------- | -------------------------------- |
| `a.b.c`               | Nested key                | `user.profile.name`              |
| `a[0]`                | Array index               | `items[0].title`                 |
| `a.*`                 | Wildcard — all items      | `users.*.name`                   |
| `a[?f>v]`             | Filter with comparison    | `products[?price>20]`            |
| `a[?f==v && f2>v]`    | Filter with `&&` / `\|\|` | `items[?active==true && age>18]` |
| `a[0,2,4]`            | Multi-index               | `items[0,2,4].name`              |
| `a[name,age]`         | Multi-key pick            | `users.*[name,age]`              |
| `a[0:5]`              | Slice (start:end)         | `items[0:5]`                     |
| `a[::2]`              | Slice with step           | `items[::2]`                     |
| `[?length(@.f)>n]`    | Filter — length function  | `[?length(@.name)>3]`            |
| `[?match(@.f,'pat')]` | Filter — regex match      | `[?match(@.email,'@co\.')]`      |
| `..key`               | Recursive descent         | `..name` (any depth)             |

Filters support `==`, `!=`, `>`, `<`, `>=`, `<=` with `&&` / `||` logic.

## Install

::: code-group

```bash [PHP]
composer require safe-access-inline/safe-access-inline
```

```bash [JavaScript / TypeScript]
npm install @safe-access-inline/safe-access-inline
```

```bash [CLI]
npm install -g @safe-access-inline/cli
```

:::

## Key Features

- **Zero surprises** — `get()` never throws; always returns a safe default value
- **Immutable by default** — `set()`, `remove()`, `merge()` return new instances; opt into deep-frozen readonly with `{ readonly: true }`
- **Rich path expressions** — wildcards, filters with `&&`/`||`, recursive descent, slices (`[0:5:2]`), multi-index (`[0,2,4]`), multi-key picks (`[name,age]`), and filter functions (`length`, `match`, `keys`)
- **Array operations** — `push`, `pop`, `shift`, `unshift`, `insert`, `filterAt`, `mapAt`, `sortAt`, `unique`, `flatten`
- **JSON Patch** — RFC 6902 `diff()` and `applyPatch()`
- **Security-first** — prototype pollution guard · SSRF protection with DNS-level resolution · IPv6 range detection (`fc00::/7`, `fe80::/10`) · cloud metadata blocks (`169.254.169.254`, `metadata.google.internal`) · XML XXE prevention (DOCTYPE/ENTITY blocked) · CSV injection modes (`none` / `prefix` / `strip` / `error`) · 16 built-in sensitive-key auto-mask patterns (`password`, `secret`, `token`, `api_key`, `cookie`, `ssn`, …) · configurable `SecurityPolicy` presets (`strict`, `permissive`, default)
- **Schema validation** — `validate(schema, adapter)` with built-in adapters for Zod, Valibot, Yup, and JSON Schema; configure a global default via `SchemaRegistry.setDefaultAdapter()`
- **I/O** — `fromFile()`, `fromUrl()` (HTTPS-only, port allowlist), `layer()`, `watchFile()` with full audit logging
- **Plugin system** — override parsers/serializers per format via `PluginRegistry`; register custom format accessors with `SafeAccess.extend()`
- **Template paths** — `getTemplate('user.{id}.name', { id: 42 })` for dynamic key interpolation
- **Segment API** — `getAt([…])`, `setAt([…])`, `hasAt([…])`, `removeAt([…])` for programmatic path access (JS)
- **CLI** — query, transform, diff, mask, and layer files from the terminal
- **Framework integrations** — Laravel, Symfony (PHP) · NestJS (`SafeAccessModule`, `SafeAccessService`), Vite (JS)
- **TypeScript inference** — `DeepPaths<T>` / `ValueAtPath<T, P>` for fully typed `get()` calls with zero casting (JS)
- **Auto-detected extensions** — `.json`, `.yml`, `.yaml`, `.toml`, `.ini`, `.cfg`, `.csv`, `.env`, `.ndjson`, `.jsonl`
- **PHP ↔ JS parity** — identical API in both languages

## Next Steps

- [JS/TS Getting Started](/js/getting-started) — install and use in JavaScript/TypeScript
- [PHP Getting Started](/php/getting-started) — install and use in PHP
- [CLI](/cli/) — command-line usage
- [Architecture](/guide/architecture) — design principles and internals
