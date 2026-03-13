# Safe Access Inline — JavaScript / TypeScript

[![npm version](https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)
[![Node Version](https://img.shields.io/node/v/@safe-access-inline/safe-access-inline)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)
[![License](https://img.shields.io/npm/l/@safe-access-inline/safe-access-inline)](LICENSE)

Safe nested data access with dot notation for JavaScript & TypeScript — supports **Object, Array, JSON, XML, YAML, TOML, INI, CSV, ENV**.

> This is a **read-only mirror** of [`packages/js`](https://github.com/felipesauer/safe-access-inline/tree/main/packages/js) in the [safe-access-inline](https://github.com/felipesauer/safe-access-inline) mono-repo. Issues and pull requests should be opened there.

## Installation

```bash
npm install @safe-access-inline/safe-access-inline
```

## Quick Start

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

// From JSON string
const accessor = SafeAccess.fromJson('{"user": {"name": "Felipe", "roles": ["admin"]}}');
accessor.get('user.name'); // "Felipe"
accessor.get('user.roles.0'); // "admin"
accessor.get('user.email', 'N/A'); // "N/A" (default)

// From plain object
const accessor2 = SafeAccess.fromObject({ database: { host: 'localhost', port: 5432 } });
accessor2.get('database.port'); // 5432

// From XML string
const accessor3 = SafeAccess.fromXml('<root><server><host>localhost</host></server></root>');
accessor3.get('server.host'); // "localhost"
```

## Supported Formats

| Method                    | Format      | Built-in          |
| ------------------------- | ----------- | ----------------- |
| `SafeAccess.fromArray()`  | Array       | Yes               |
| `SafeAccess.fromObject()` | Object      | Yes               |
| `SafeAccess.fromJson()`   | JSON string | Yes               |
| `SafeAccess.fromXml()`    | XML string  | Yes               |
| `SafeAccess.fromYaml()`   | YAML string | Yes (`js-yaml`)   |
| `SafeAccess.fromToml()`   | TOML string | Yes (`smol-toml`) |
| `SafeAccess.fromIni()`    | INI string  | Yes               |
| `SafeAccess.fromCsv()`    | CSV string  | Yes               |
| `SafeAccess.fromEnv()`    | ENV string  | Yes               |
| `SafeAccess.from()`       | Auto-detect | Yes               |

All formats include built-in parsers. YAML uses `js-yaml` and TOML uses `smol-toml` by default. You can override any parser or serializer via the plugin system.

## Plugin System

Register custom parsers or serializers to override the built-in defaults:

```typescript
import { SafeAccess, PluginRegistry } from '@safe-access-inline/safe-access-inline';
import type { ParserPlugin, SerializerPlugin } from '@safe-access-inline/safe-access-inline';

// Override the default YAML parser with a custom implementation
const myYamlParser: ParserPlugin = {
    parse(raw: string): Record<string, unknown> {
        return myYamlLib.parse(raw);
    },
};

PluginRegistry.registerParser('yaml', myYamlParser);
```

The package also ships ready-to-use plugins: `JsYamlParser`, `JsYamlSerializer`, `SmolTomlParser`, `SmolTomlSerializer`.

## Dot Notation

Access nested values using dot-separated keys:

```
user.name           → data.user.name
user.roles.0        → data.user.roles[0]
servers.0.host      → data.servers[0].host
```

## API Reference

### Reading

```typescript
accessor.get('key'); // value or undefined
accessor.get('key', 'default'); // value or default
accessor.getMany(['a', 'b']); // { a: value, b: value }
accessor.all(); // all data as object
```

### Writing (Immutable)

```typescript
const updated = accessor.set('key', 'value'); // returns new instance
const removed = accessor.remove('key'); // returns new instance
```

### Transforming

```typescript
accessor.toArray(); // [key, value][] entries
accessor.toJson(); // JSON string
accessor.toXml(); // XML string
accessor.toYaml(); // YAML string
accessor.toToml(); // TOML string
accessor.toObject(); // plain object
accessor.transform('json'); // by format name
```

## TypeScript

Full type definitions are included. The package exports ESM and CommonJS builds:

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline'; // ESM
const { SafeAccess } = require('@safe-access-inline/safe-access-inline'); // CJS
```

### Exported types

```typescript
import type {
    AccessorInterface,
    ReadableInterface,
    TransformableInterface,
    WritableInterface,
} from '@safe-access-inline/safe-access-inline';
```

## Requirements

- Node.js 22+

## Documentation

Full documentation is available at [felipesauer.github.io/safe-access-inline](https://felipesauer.github.io/safe-access-inline):

- [Getting Started — JS/TS](https://felipesauer.github.io/safe-access-inline/js/getting-started/)
- [API Reference — JS/TS](https://felipesauer.github.io/safe-access-inline/js/api-reference/)
- [Architecture](https://felipesauer.github.io/safe-access-inline/architecture/)

## License

[MIT](LICENSE)
