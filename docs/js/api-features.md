---
outline: deep
---

# API — Operations & I/O — JavaScript / TypeScript

## Table of Contents

- [Array Operations](#array-operations)
- [JSON Patch](#json-patch)
- [Schema Validation](#schema-validation)
- [Security](#security)
- [I/O & File Loading](#io--file-loading)
- [Audit Logging](#audit-logging)
- [Framework Integrations](#framework-integrations)

---

## Array Operations

All array operations are **immutable** — they return a new accessor instance.

**Import:** These are instance methods on any accessor.

#### `push(path: string, ...items: unknown[]): AbstractAccessor`

Appends items to the array at the given path.

```typescript
const updated = accessor.push("tags", "new-tag");
```

#### `pop(path: string): AbstractAccessor`

Removes the last item from the array at the given path.

#### `shift(path: string): AbstractAccessor`

Removes the first item from the array at the given path.

#### `unshift(path: string, ...items: unknown[]): AbstractAccessor`

Prepends items to the array at the given path.

#### `insert(path: string, index: number, ...items: unknown[]): AbstractAccessor`

Inserts items at the given index in the array at the given path.

```typescript
const updated = accessor.insert("items", 2, { id: 99 });
```

#### `filterAt(path: string, predicate: (item, index) => boolean): AbstractAccessor`

Filters the array at the given path using a predicate function.

```typescript
const active = accessor.filterAt("users", (u) => u.active === true);
```

#### `mapAt(path: string, transform: (item, index) => unknown): AbstractAccessor`

Transforms each item in the array at the given path.

#### `sortAt(path: string, key?: string, direction?: 'asc' | 'desc'): AbstractAccessor`

Sorts the array at the given path. For arrays of objects, pass `key` to sort by a specific field.

```typescript
const sorted = accessor.sortAt("items", "price", "desc");
```

#### `unique(path: string, key?: string): AbstractAccessor`

Removes duplicates from the array at the given path. For objects, pass `key` to deduplicate by a specific field.

#### `flatten(path: string, depth?: number): AbstractAccessor`

Flattens nested arrays at the given path. Default depth is 1.

#### `first(path: string, defaultValue?: unknown): unknown`

Returns the first element of the array at the given path.

```typescript
accessor.first("items"); // first item
accessor.first("items", null); // null if empty
```

#### `last(path: string, defaultValue?: unknown): unknown`

Returns the last element of the array at the given path.

#### `nth(path: string, index: number, defaultValue?: unknown): unknown`

Returns the element at the given index. Supports negative indices.

```typescript
accessor.nth("items", -1); // last item
```

---

## JSON Patch

**Import:** `import { diff, applyPatch } from '@safe-access-inline/safe-access-inline'`

#### `diff(a: Record<string, unknown>, b: Record<string, unknown>): JsonPatchOp[]`

Computes a RFC 6902 JSON Patch between two objects.

```typescript
const patches = diff(original, modified);
// [{ op: 'replace', path: '/name', value: 'New' }, ...]
```

#### `applyPatch(data: Record<string, unknown>, ops: JsonPatchOp[]): Record<string, unknown>`

Applies a JSON Patch to an object. Returns a new object (does not mutate input).

```typescript
const result = applyPatch(data, patches);
```

#### Instance Methods

Accessors also expose these as instance methods:

```typescript
const patches = accessorA.diff(accessorB);
const patched = accessor.applyPatch(patches);
```

#### `JsonPatchOp`

```typescript
type JsonPatchOp = {
    op: "add" | "remove" | "replace" | "move" | "copy" | "test";
    path: string;
    value?: unknown;
    from?: string;
};
```

---

## Schema Validation

**Import:** `import { SchemaRegistry, SchemaValidationError } from '@safe-access-inline/safe-access-inline'`

#### `SchemaRegistry.setDefaultAdapter(adapter: SchemaAdapterInterface): void`

Sets a global default schema adapter used by `accessor.validate()` when no adapter is passed.

#### `SchemaRegistry.getDefaultAdapter(): SchemaAdapterInterface | null`

Returns the current default adapter, or `null`.

#### `SchemaRegistry.clearDefaultAdapter(): void`

Clears the default adapter.

#### `SchemaAdapterInterface`

```typescript
interface SchemaAdapterInterface<TSchema = unknown> {
    validate(
        data: Record<string, unknown>,
        schema: TSchema,
    ): SchemaValidationResult;
}

interface SchemaValidationResult {
    valid: boolean;
    errors: SchemaValidationIssue[];
}

interface SchemaValidationIssue {
    path: string;
    message: string;
}
```

---

## Security

### SecurityPolicy

**Import:** `import { mergePolicy, defaultPolicy } from '@safe-access-inline/safe-access-inline'`

A unified security configuration that aggregates all security options.

```typescript
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy = mergePolicy(defaultPolicy(), {
    maxDepth: 256,
    allowedDirs: ["/etc/config"],
    url: { allowPrivateIps: false, allowedHosts: ["api.example.com"] },
    maskPatterns: ["password", "secret"],
});

const accessor = SafeAccess.withPolicy(data, policy);
const fileAccessor = await SafeAccess.fromFileWithPolicy(
    "/etc/config/app.json",
    policy,
);
const urlAccessor = await SafeAccess.fromUrlWithPolicy(
    "https://api.example.com/config",
    policy,
);
```

#### `SecurityPolicy` interface

```typescript
interface SecurityPolicy {
    maxDepth?: number;
    maxPayloadBytes?: number;
    maxKeys?: number;
    allowedDirs?: string[];
    url?: UrlPolicy;
    csvMode?: "none" | "prefix" | "strip" | "error";
    maskPatterns?: MaskPattern[];
}

interface UrlPolicy {
    allowPrivateIps?: boolean;
    allowedHosts?: string[];
    allowedPorts?: number[];
}
```

#### `mergePolicy(base, overrides?): SecurityPolicy`

Merges two policies. Overrides take precedence.

#### `defaultPolicy(): SecurityPolicy`

Returns the default policy (maxDepth=512, maxPayloadBytes=10MB, maxKeys=10000).

### SecurityOptions

**Import:** `import { assertPayloadSize, assertMaxKeys, assertMaxDepth } from '@safe-access-inline/safe-access-inline'`

Low-level assertion functions used internally by all format parsers:

- `assertPayloadSize(input: string, maxBytes?: number): void`
- `assertMaxKeys(data: Record<string, unknown>, maxKeys?: number): void`
- `assertMaxDepth(currentDepth: number, maxDepth?: number): void`

### Data Masking

**Import:** `import { mask } from '@safe-access-inline/safe-access-inline'`

#### `mask(data, patterns?): Record<string, unknown>`

Recursively masks sensitive values. Auto-detects common sensitive keys (password, secret, token, etc.). Supports wildcard patterns with `*`.

```typescript
const safe = mask(data, ["api_*", "credentials"]);
// { password: '[REDACTED]', api_key: '[REDACTED]', name: 'Ana' }
```

### CSV Sanitization

**Import:** `import { sanitizeCsvCell, sanitizeCsvRow } from '@safe-access-inline/safe-access-inline'`

Protects against CSV formula injection.

- `sanitizeCsvCell(cell: string, mode?: CsvSanitizeMode): string`
- `sanitizeCsvRow(row: string[], mode?: CsvSanitizeMode): string[]`

Modes: `'prefix'` (prefix with `'`), `'strip'` (removes all CSV injection prefix characters: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n` per OWASP CSV Injection guidance), `'error'` (throw), `'none'` (passthrough).

### Deep Freeze

**Import:** `import { deepFreeze } from '@safe-access-inline/safe-access-inline'`

#### `deepFreeze<T extends object>(obj: T): Readonly<T>`

Recursively freezes an object. Useful for making config immutable at runtime.

### IP Range Checker

**Import:** `import { assertSafeUrl, isPrivateIp } from '@safe-access-inline/safe-access-inline'`

- `assertSafeUrl(url: string, options?): void` — Throws `SecurityError` if the URL targets a private IP (SSRF protection).
- `isPrivateIp(ip: string): boolean` — Returns `true` for private/loopback IPs.

---

## I/O & File Loading

### File Loading

```typescript
// Synchronous
const accessor = SafeAccess.fromFileSync("./config.json");
const accessor = SafeAccess.fromFileSync("./config.yaml", {
    format: "yaml",
    allowedDirs: ["/etc/config"],
});

// Async
const accessor = await SafeAccess.fromFile("./config.json");
```

### URL Loading

```typescript
const accessor = await SafeAccess.fromUrl(
    "https://api.example.com/config.json",
    {
        allowPrivateIps: false,
        allowedHosts: ["api.example.com"],
        allowedPorts: [443],
    },
);
```

### Layered Config

Merge multiple config sources (last wins):

```typescript
const config = SafeAccess.layer([defaults, overrides, local]);
const config = await SafeAccess.layerFiles([
    "./defaults.yaml",
    "./overrides.json",
]);
```

### File Watcher

```typescript
const stop = SafeAccess.watchFile("./config.yaml", (accessor) => {
    console.log("Config changed:", accessor.get("app.name"));
});

// Later: stop watching
stop();
```

---

## Audit Logging

**Import:** `import { onAudit, clearAuditListeners } from '@safe-access-inline/safe-access-inline'`

Subscribe to security and data operation events.

```typescript
const unsubscribe = SafeAccess.onAudit((event) => {
    console.log(`[${event.type}]`, event.detail);
});

// Event types: 'file.read', 'url.fetch', 'security.violation', 'data.mask',
//              'file.watch', 'data.freeze', 'schema.validate'

// Cleanup
SafeAccess.clearAuditListeners();
unsubscribe(); // or unsubscribe individually
```

#### `AuditEvent`

```typescript
interface AuditEvent {
    type: AuditEventType;
    timestamp: number;
    detail: Record<string, unknown>;
}

type AuditEventType =
    | "file.read"
    | "file.watch"
    | "url.fetch"
    | "security.violation"
    | "data.mask"
    | "data.freeze"
    | "schema.validate";
```

---

## Framework Integrations

### NestJS

**Import:** `import { SafeAccessModule, SAFE_ACCESS, createSafeAccessProvider } from '@safe-access-inline/safe-access-inline'`

```typescript
// Option 1: Module registration
@Module({
    imports: [
        SafeAccessModule.register({
            filePath: "./config.yaml",
        }),
    ],
})
export class AppModule {}

// Option 2: Custom provider
@Module({
    providers: [
        createSafeAccessProvider({
            layerPaths: ["./defaults.yaml", "./overrides.json"],
        }),
    ],
    exports: [SAFE_ACCESS],
})
export class ConfigModule {}

// Inject in services
@Injectable()
class MyService {
    constructor(@Inject(SAFE_ACCESS) private config: AbstractAccessor) {}
}
```

### Vite Plugin

**Import:** `import { safeAccessPlugin, loadConfig } from '@safe-access-inline/safe-access-inline'`

```typescript
// vite.config.ts
import { safeAccessPlugin } from "@safe-access-inline/safe-access-inline";

export default defineConfig({
    plugins: [
        safeAccessPlugin({
            files: ["./config/defaults.yaml", "./config/local.json"],
            virtualId: "virtual:safe-access-config", // default
        }),
    ],
});

// In app code:
import config from "virtual:safe-access-config";
// config is the merged JSON object
```

HMR is supported — changing a watched config file triggers a full reload.
