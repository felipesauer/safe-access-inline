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

Access nested values using dot-separated keys, wildcards, filters, and recursive descent:

```
user.name                        → simple nested access
user.roles.0                     → array index
servers.*.host                   → wildcard (all items)
users[?active==true].name        → filter by condition
users[?age>=18 && role=='admin'] → compound filter (&&, ||)
..name                           → recursive descent (find at any depth)
```

### Path Expressions

| Syntax            | Description                  | Example                          |
| ----------------- | ---------------------------- | -------------------------------- |
| `key`             | Direct property access       | `user.name`                      |
| `0`, `1`          | Numeric array index          | `items.0.title`                  |
| `*`               | Wildcard — all items         | `users.*.email`                  |
| `[?field>value]`  | Filter with comparison       | `items[?price>100]`              |
| `[?f==v && f2>v]` | Filter with logical operator | `items[?active==true && age>18]` |
| `..key`           | Recursive descent            | `..name` (any depth)             |

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

### Merging (Immutable)

```typescript
const merged = accessor.merge('settings', { theme: 'dark', lang: 'en' }); // deep merge at path
const rootMerge = accessor.merge('', { extra: true }); // merge at root
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

## TypeScript Types

Full type inference for nested paths and values:

```typescript
import type { DeepPaths, ValueAtPath } from '@safe-access-inline/safe-access-inline';

type Config = { database: { host: string; port: number } };
type Paths = DeepPaths<Config>; // 'database' | 'database.host' | 'database.port'
type Host = ValueAtPath<Config, 'database.host'>; // string

const accessor = SafeAccess.fromObject<Config>({ database: { host: 'localhost', port: 5432 } });
const host = accessor.get('database.host'); // typed as string
```

## JSONPath (RFC 9535)

Extended path syntax beyond dot notation:

```typescript
accessor.get('$.user.name'); // root anchor
accessor.get("user['first-name']"); // bracket notation
accessor.get('items[0,2,4]'); // multi-index
accessor.get('..email'); // recursive descent
```

## Schema Validation

Plug in any schema library via the adapter interface:

```typescript
import { SchemaRegistry, SafeAccess } from '@safe-access-inline/safe-access-inline';
import type { SchemaAdapterInterface } from '@safe-access-inline/safe-access-inline';

const zodAdapter: SchemaAdapterInterface = {
    validate(data, schema) {
        const result = schema.safeParse(data);
        return {
            valid: result.success,
            errors: result.success
                ? []
                : result.error.issues.map((i) => ({
                      path: i.path.join('.'),
                      message: i.message,
                  })),
        };
    },
};

SchemaRegistry.setDefaultAdapter(zodAdapter);
const result = accessor.validate(myZodSchema);
```

## Array Operations

`ArrayAccessor` provides rich mutation methods (all immutable — return new instances):

```typescript
const arr = SafeAccess.fromArray([{ id: 1 }, { id: 2 }, { id: 3 }]);
arr.push({ id: 4 });
arr.filterAt('', (i) => i.id > 1);
arr.sortAt('', (a, b) => a.id - b.id);
arr.unique();
arr.flatten();
arr.first();
arr.last();
arr.nth(1);
```

## JSON Patch (RFC 6902)

```typescript
import { diff, applyPatch } from '@safe-access-inline/safe-access-inline';

const a = { version: 1, name: 'old' };
const b = { version: 2, name: 'new', extra: true };

const patches = diff(a, b);
const result = applyPatch(a, patches);
```

## Security

Built-in security with configurable policies:

```typescript
import { SafeAccess, STRICT_POLICY, mergePolicy } from '@safe-access-inline/safe-access-inline';

// Preset policies
const accessor = SafeAccess.withPolicy(data, STRICT_POLICY);

// Custom policy
const policy = mergePolicy(STRICT_POLICY, { maxPayloadBytes: 2_097_152 });
SafeAccess.setGlobalPolicy(policy);

// Data masking
const masked = accessor.masked(['password', 'secret', 'api_*']);

// Audit events
SafeAccess.onAudit((event) => console.log(event.type, event.detail));
```

Security features: prototype pollution guard, payload/key/depth limits, XML hardening, YAML safe schema, CSV injection protection, path traversal prevention, SSRF protection, data masking.

## File Watcher (Hot Reload)

```typescript
const stop = SafeAccess.watchFile('./config.yaml', (accessor) => {
    console.log('Config reloaded:', accessor.get('server.port'));
});

stop(); // stop watching
```

## NestJS Integration

```typescript
import { SafeAccessModule, SafeAccessService } from '@safe-access-inline/safe-access-inline';

@Module({
    imports: [SafeAccessModule.register({ filePath: './config.yaml' })],
})
export class AppModule {}

@Injectable()
export class MyService {
    constructor(private config: SafeAccessService) {}
    getPort() {
        return this.config.get<number>('server.port', 3000);
    }
}
```

## Vite Integration

```typescript
// vite.config.ts
import { safeAccessPlugin } from '@safe-access-inline/safe-access-inline';

export default {
    plugins: [safeAccessPlugin({ filePath: './config.yaml', virtualId: 'virtual:config' })],
};

// In your app
import config from 'virtual:config';
```

## I/O Loading

Load data directly from the filesystem or a remote URL:

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

// From file (async, format detected from extension)
const accessor = await SafeAccess.fromFile('./config.yaml');
accessor.get('database.host');

// From file (sync)
const accessor = SafeAccess.fromFileSync('./config.json');

// From URL (async, HTTPS only)
const remote = await SafeAccess.fromUrl('https://example.com/config.json');
```

File loads are protected against path-traversal attacks. URL loads enforce HTTPS and block private/cloud-metadata IPs.

## Layered Configuration

Merge multiple configuration sources with last-wins deep-merge semantics:

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

// Merge two in-memory objects
const merged = SafeAccess.layer(
    { database: { host: 'localhost', port: 5432 } },
    { database: { port: 5433, name: 'mydb' } },
);
merged.get('database.port'); // 5433
merged.get('database.host'); // 'localhost'

// Merge multiple config files (last file wins)
const config = await SafeAccess.layerFiles([
    './config/base.yaml',
    './config/production.yaml',
    './config/local.yaml',
]);
config.get('database.host');
```

## NDJSON

NDJSON (Newline Delimited JSON) — each line is an independent JSON object:

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

const raw = `{"id":1,"name":"Alice"}
{"id":2,"name":"Bob"}`;

const accessor = SafeAccess.fromNdjson(raw);
accessor.get('0.name'); // "Alice"
accessor.get('1.id'); // 2

// Serialize back to NDJSON
accessor.toNdjson(); // '{"id":1,"name":"Alice"}\n{"id":2,"name":"Bob"}'
```

## Documentation

Full documentation is available at [felipesauer.github.io/safe-access-inline](https://felipesauer.github.io/safe-access-inline):

- [Getting Started — JS/TS](https://felipesauer.github.io/safe-access-inline/js/getting-started/)
- [API Reference — JS/TS](https://felipesauer.github.io/safe-access-inline/js/api-reference/)
- [Architecture](https://felipesauer.github.io/safe-access-inline/architecture/)

## License

[MIT](LICENSE)
