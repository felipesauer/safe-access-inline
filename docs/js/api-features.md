---
outline: deep
---

# API — Operations & I/O — JavaScript / TypeScript

## Table of Contents

- [Type-Safe Path Inference](#type-safe-path-inference)
- [Array Operations](#array-operations)
- [JSON Patch](#json-patch)
- [Schema Validation](#schema-validation)
- [Security](#security)
- [I/O & File Loading](#io--file-loading)
    - [Streaming Large Files](#streaming-large-files)
- [Audit Logging](#audit-logging)
- [Framework Integrations](#framework-integrations)

---

## Type-Safe Path Inference

When you provide a concrete shape type via the generic parameter, the library automatically infers the value type returned by `get()` — no casting, no `unknown`.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

interface Config {
    server: { host: string; port: number };
    debug: boolean;
    tags: string[];
}

const accessor = SafeAccess.fromObject<Config>({
    server: { host: "localhost", port: 3000 },
    debug: true,
    tags: ["web", "api"],
});

const host = accessor.get("server.host"); // inferred: string | undefined
const port = accessor.get("server.port"); // inferred: number | undefined
const debug = accessor.get("debug", false); // inferred: boolean
const tags = accessor.get("tags"); // inferred: string[] | undefined
```

### `DeepPaths<T>` — Autocomplete for Nested Paths

The `DeepPaths<T>` utility type enumerates all valid dot-notation paths for a given shape. This powers IDE autocompletion and compile-time path validation:

```typescript
import type { DeepPaths } from "@safe-access-inline/safe-access-inline";

type ConfigPaths = DeepPaths<Config>;
// "server" | "server.host" | "server.port" | "debug" | "tags"

// ✅ Valid — autocompleted and type-checked
accessor.get("server.host");

// ❌ TypeScript error: '"server.hostname"' is not assignable to 'DeepPaths<Config>'
accessor.get("server.hostname");
```

### `ValueAtPath<T, P>` — Return Type Narrowing

`ValueAtPath<T, P>` resolves the type at a given path:

```typescript
import type {
    ValueAtPath,
    DeepPaths,
} from "@safe-access-inline/safe-access-inline";

type HostType = ValueAtPath<Config, "server.host">; // string
type PortType = ValueAtPath<Config, "server.port">; // number
```

### Untyped Access

If no generic is provided (or you use `Record<string, unknown>`), `get()` falls back to returning `unknown` — full backward compatibility is preserved:

```typescript
// Untyped — returns unknown
const accessor = SafeAccess.from(rawInput);
const value = accessor.get("some.path"); // unknown
```

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

#### `diff(a: Record<string, unknown>, b: Record<string, unknown>): JsonPatchOperation[]`

Computes a RFC 6902 JSON Patch between two objects.

```typescript
const patches = diff(original, modified);
// [{ op: 'replace', path: '/name', value: 'New' }, ...]
```

#### `applyPatch(data: Record<string, unknown>, ops: JsonPatchOperation[]): Record<string, unknown>`

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

#### `JsonPatchOperation`

```typescript
type JsonPatchOperation = {
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

### Shipped adapters

The package exports ready-to-use adapters for common schema libraries:

| Adapter                | Peer dependency | Notes                                                                                                                                             |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ZodSchemaAdapter`     | `zod`           | Validates with `schema.safeParse(data)`                                                                                                           |
| `ValibotSchemaAdapter` | `valibot`       | Accepts Valibot's `safeParse` function in the constructor                                                                                         |
| `YupSchemaAdapter`     | `yup`           | Uses `schema.validateSync(data, { abortEarly: false })`                                                                                           |
| `JsonSchemaAdapter`    | None            | Built-in draft-07 subset adapter supporting `type`, `required`, `properties`, `items`, `minimum`, `maximum`, `minLength`, `maxLength`, and `enum` |

These shipped adapters are intentionally ecosystem-specific. The JS package ships adapters for common JS validators (`zod`, `valibot`, `yup`), while the PHP package ships `JsonSchemaAdapter` and `SymfonyValidatorAdapter`.

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

**Import:** `import { sanitizeCsvCell, sanitizeCsvRow, sanitizeCsvHeaders } from '@safe-access-inline/safe-access-inline'`

Protects against CSV formula injection.

- `sanitizeCsvCell(cell: string, mode?: CsvSanitizeMode): string`
- `sanitizeCsvRow(row: string[], mode?: CsvSanitizeMode): string[]`
- `sanitizeCsvHeaders(headers: string[], mode?: CsvSanitizeMode): string[]`

Modes: `'prefix'` (prefix with `'`), `'strip'` (removes all CSV injection prefix characters: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n` per OWASP CSV Injection guidance), `'error'` (throw), `'none'` (passthrough).

`sanitizeCsvHeaders()` applies the same cell sanitization to an array of column headers — useful when header values originate from user-supplied data or external sources.

### HTTP Header Sanitization

**Import:** `import { sanitizeHeaders } from '@safe-access-inline/safe-access-inline'`

#### `sanitizeHeaders(headers: Record<string, string> | null | undefined): Record<string, string>`

Sanitizes a map of HTTP request headers before passing them to outgoing requests. Returns a new record — the input is never mutated.

- Header names are lowercased and validated against RFC 7230 token characters; invalid names are silently dropped.
- Header values have CRLF sequences (`\r\n`) and ASCII control characters stripped to prevent header injection.
- Accepts `null` / `undefined` — returns an empty object.

```typescript
import { sanitizeHeaders } from "@safe-access-inline/safe-access-inline";

const safe = sanitizeHeaders({
    "Content-Type": "application/json",
    "X-Custom": "value\r\nevil: injected", // CRLF stripped
    "": "no-name", // empty name dropped
});
// { "content-type": "application/json", "x-custom": "valueevilinjected" }
```

### Deep Freeze

**Import:** `import { deepFreeze } from '@safe-access-inline/safe-access-inline'`

#### `deepFreeze<T extends object>(obj: T): Readonly<T>`

Recursively freezes an object. Useful for making config immutable at runtime.

### IP Range Checker

**Import:** `import { assertSafeUrl, isPrivateIp } from '@safe-access-inline/safe-access-inline'`

- `assertSafeUrl(url: string, options?): void` — Throws `SecurityError` if the URL targets a private IP (SSRF protection).
- `isPrivateIp(ip: string): boolean` — Returns `true` for private/loopback IPs.

### FilterParser — ReDoS Protection

**Import:** `import { FilterParser } from '@safe-access-inline/safe-access-inline'`

Filter expressions (`[?age>=18 && active==true]`) in dot-notation paths are parsed and evaluated by `FilterParser`. To prevent ReDoS attacks, the `match()` filter function applies several guards before constructing a `RegExp`:

| Guard                                  | What it catches                                                 |
| -------------------------------------- | --------------------------------------------------------------- |
| `maxPatternLength` (default: 128)      | Rejects patterns that exceed the configured length limit        |
| Nested quantifiers                     | `(x+)+`, `(x+)*`, `(x*){2,}` — catastrophic backtracking shapes |
| Alternation quantifiers                | `(a\|b)+`, `(x\|y)*` — polynomial backtracking over alternation |
| Non-capturing quantifiers in lookahead | `(?...*)`, `(?...*[...]*)`                                      |
| Sibling groups with quantifiers        | Adjacent quantified groups that multiply backtracking           |

If any guard matches, `match()` returns `false` rather than throwing. This ensures filter expressions that include unsafe patterns degrade silently (non-match) without crashing the host application.

```typescript
import { FilterParser } from "@safe-access-inline/safe-access-inline";

// Configuring the max pattern length (default: 128)
FilterParser.configure({ maxPatternLength: 64 });

// Resetting to defaults
FilterParser.resetConfig();
```

**PHP alignment:** PHP's `FilterParser` applies the same static guards in `evaluateFunction()`. The `maxPatternLength` constant is 128 in both implementations.

> **Tip:** Prefer `starts_with()` and `contains()` over `match()` for string tests — they are not regex-based and carry no ReDoS risk.

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

Both `fromFileSync()` and `fromFile()` accept a `FileLoadOptions` object as the second argument.

#### `FileLoadOptions`

```typescript
import type { FileLoadOptions } from "@safe-access-inline/safe-access-inline";

interface FileLoadOptions {
    /** Explicit format override — auto-detected from extension if omitted. */
    format?: string | Format;
    /** Restrict loading to these directories (path-traversal guard). */
    allowedDirs?: string[];
    /** Set to `true` to disable the allowed-dirs restriction. */
    allowAnyPath?: boolean;
    /** Maximum file size in bytes (throws `SecurityError` if exceeded). */
    maxSize?: number;
    /** Allowlist of file extensions, e.g. `['.json', '.yaml']`. */
    allowedExtensions?: string[];
}
```

JavaScript exposes both synchronous and asynchronous file-loading APIs. This is a deliberate cross-language difference: the PHP package exposes synchronous I/O only, while the JS package provides async variants for Node runtimes and sync variants for bootstrap or CLI use cases.

### Streaming Large Files

For memory-efficient processing of large CSV or NDJSON files, JS provides asynchronous `AsyncGenerator`-based streaming — equivalent in functionality to PHP's synchronous `Generator` variants.

#### `SafeAccess.streamCsv(filePath: string, options?: FileLoadOptions): AsyncGenerator<ObjectAccessor>`

Yields parsed CSV rows one at a time without loading the entire file into memory.

```typescript
for await (const row of SafeAccess.streamCsv("/app/data/users.csv", {
    allowedDirs: ["/app/data"],
})) {
    console.log(row.get("name")); // ObjectAccessor
}
```

#### `SafeAccess.streamNdjson(filePath: string, options?: FileLoadOptions): AsyncGenerator<JsonAccessor>`

Yields parsed NDJSON records one at a time.

```typescript
for await (const event of SafeAccess.streamNdjson("/app/data/events.ndjson", {
    allowedDirs: ["/app/data"],
})) {
    console.log(event.get("type")); // JsonAccessor
}
```

In PHP, the equivalent is a synchronous `foreach ($stream as $row)` loop over a `Generator`. Both paradigms deliver the same guarantee: rows are yielded one at a time without loading the entire file into memory. See [Architecture — Streaming: Sync vs Async](/guide/architecture#streaming-sync-php-vs-async-js).

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

In the JS package, `watchFile()` returns a single unsubscribe function and uses the platform watcher (`fs.watch`) under the hood.

This differs intentionally from PHP, where `watchFile()` returns `{ poll, stop }` because the polling loop must be driven explicitly in a synchronous runtime.

### Writing Files

`SafeAccess.writeFile()` and `SafeAccess.writeFileSync()` write a string to disk with the same path-traversal protection applied by `fromFile()`.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// Synchronous
SafeAccess.writeFile("./output.json", JSON.stringify({ key: "value" }));

// Async (recommended)
await SafeAccess.writeFileAsync(
    "./output.json",
    JSON.stringify({ key: "value" }),
);

// With directory restriction
await SafeAccess.writeFileAsync("./output.json", content, {
    allowedDirs: ["./output"],
});
```

Both methods emit a `file.write` audit event (see [Audit Logging](#audit-logging)).

### IoLoader

**Import:** `import { configureIoLoader, resetIoLoaderConfig, assertPathWithinAllowedDirs, resolveFormatFromExtension } from '@safe-access-inline/safe-access-inline'`

`IoLoader` is the internal I/O subsystem invoked by `fromFile()`, `fromFileSync()`, and `fromUrl()`. It enforces SSRF protection, path-traversal guards, and configurable request timeouts.

#### Configuration

```typescript
import { configureIoLoader } from "@safe-access-inline/safe-access-inline";

configureIoLoader({
    requestTimeoutMs: 15_000, // total HTTP request timeout (default: 10 000 ms)
    connectTimeoutMs: 8_000, // TCP connection-phase timeout (default: 5 000 ms)
});
```

#### `IoLoaderConfig`

```typescript
interface IoLoaderConfig {
    /** Total HTTP request timeout in milliseconds. */
    readonly requestTimeoutMs: number;
    /** Maximum milliseconds to wait while establishing the TCP connection. */
    readonly connectTimeoutMs: number;
    /** Injectable HTTP client (replaces the built-in `https.request` transport). */
    readonly httpClient?: HttpClientInterface;
    /** Injectable DNS resolver (replaces the built-in `dns.promises` resolver). */
    readonly dnsResolver?: DnsResolverInterface;
}
```

#### Dependency Injection — `HttpClientInterface` and `DnsResolverInterface`

You can replace the built-in HTTP transport and DNS resolver with custom implementations — useful for testing, proxying, or restricted environments.

**`HttpClientInterface`** replaces `https.request()`:

```typescript
import type { HttpClientInterface } from "@safe-access-inline/safe-access-inline";

const mockClient: HttpClientInterface = {
    async fetch(url, options) {
        return {
            ok: true,
            status: 200,
            async text() {
                return '{"key":"value"}';
            },
            async json() {
                return { key: "value" };
            },
        };
    },
};

configureIoLoader({ httpClient: mockClient });
const accessor = await SafeAccess.fromUrl("https://example.com/config.json");
```

**`DnsResolverInterface`** replaces `dns.promises`:

```typescript
import type { DnsResolverInterface } from "@safe-access-inline/safe-access-inline";

const mockDns: DnsResolverInterface = {
    async resolve(hostname) {
        return ["93.184.216.34"];
    },
};

configureIoLoader({ dnsResolver: mockDns });
```

> **Security:** SSRF validation (private-IP blocking) is always applied, even when a custom `httpClient` is configured. The DNS resolution and IP-range check run before any network call is made.

#### `configureIoLoader(overrides: Partial<IoLoaderConfig>): void`

Overrides the default I/O configuration. Unspecified keys retain their defaults.

#### `resetIoLoaderConfig(): void`

Resets the I/O configuration to the built-in defaults (`requestTimeoutMs: 10 000`, `connectTimeoutMs: 5 000`).

#### `assertPathWithinAllowedDirs(filePath, allowedDirs?, options?): string`

Validates that `filePath` is inside one of the `allowedDirs`. Returns the canonical resolved path (eliminating TOCTOU windows). Throws `SecurityError` on violation.

```typescript
import { assertPathWithinAllowedDirs } from "@safe-access-inline/safe-access-inline";

// Validate before passing to downstream code
const canonical = assertPathWithinAllowedDirs("./config.json", ["/app/config"]);
```

#### `resolveFormatFromExtension(filePath: string): Format | null`

Derives the `Format` enum value from a file extension (e.g. `config.yaml` → `Format.Yaml`). Returns `null` for unrecognised extensions.

```typescript
import {
    resolveFormatFromExtension,
    Format,
} from "@safe-access-inline/safe-access-inline";

resolveFormatFromExtension("/app/config.yaml"); // Format.Yaml
resolveFormatFromExtension("/app/data.ndjson"); // Format.Ndjson
resolveFormatFromExtension("/app/file.txt"); // null
```

#### SSRF Protection

URL fetching (`fromUrl()`) goes through a multi-layer SSRF guard:

1. **Scheme enforcement** — only `https:` is allowed; `http:`, `file:`, `ftp:` are rejected.
2. **DNS resolution** — the hostname is resolved before connecting; private IP ranges (RFC 1918, link-local, loopback) and cloud metadata endpoints are blocked.
3. **DNS pinning** — the resolved IP is pinned to the HTTPS connection (`lookup` override) to prevent DNS rebinding attacks between the security check and the actual connection.
4. **Redirect blocking** — HTTP 3xx redirects are rejected to prevent SSRF via open-redirect chains.
5. **Payload size cap** — responses larger than `maxPayloadBytes` (default: 10 MB) are aborted.

See also: [Security — SSRF Protection](/js/security)

---

## Audit Logging

**Import:** `import { onAudit, clearAuditListeners } from '@safe-access-inline/safe-access-inline'`

Subscribe to security and data operation events.

```typescript
const unsubscribe = SafeAccess.onAudit((event) => {
    console.log(`[${event.type}]`, event.detail);
});

// Event types: 'file.read', 'url.fetch', 'security.violation', 'data.mask',
//              'file.watch', 'data.freeze', 'data.format_warning', 'schema.validate'

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
    | "security.deprecation"
    | "data.mask"
    | "data.freeze"
    | "data.format_warning"
    | "schema.validate";
```

---

## Framework Integrations

### NestJS

**Import:** `import { SafeAccessModule, SafeAccessService, SAFE_ACCESS, createSafeAccessProvider, createSafeAccessServiceProvider } from '@safe-access-inline/safe-access-inline'`

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

#### `createSafeAccessProvider(options: SafeAccessModuleOptions)`

Returns a NestJS provider definition that resolves an `AbstractAccessor` under the `SAFE_ACCESS` injection token. Use when you want to inject the accessor directly.

#### `createSafeAccessServiceProvider(options: SafeAccessModuleOptions)`

Returns a NestJS provider definition that resolves a `SafeAccessService` instance, which wraps the accessor and can be injected by type.

```typescript
@Module({
    providers: [createSafeAccessServiceProvider({ filePath: "./config.yaml" })],
    exports: [SafeAccessService],
})
export class ConfigModule {}

@Injectable()
class MyService {
    constructor(private config: SafeAccessService) {}

    getHost() {
        return this.config.get("database.host");
    }
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

### Express

**Import:** `import { safeAccessMiddleware } from '@safe-access-inline/safe-access-inline'`

Express middleware that loads a config file **once** at middleware creation time and attaches the resulting accessor to `req[attachAs]` on every request. The config file is never reloaded per-request.

```typescript
import express from "express";
import { safeAccessMiddleware } from "@safe-access-inline/safe-access-inline";

const app = express();
app.use(safeAccessMiddleware({ filePath: "./config/app.json" }));

app.get("/", (req, res) => {
    const port = (req as any).config.get("server.port", 3000);
    res.json({ port });
});
```

#### `safeAccessMiddleware(options: SafeAccessExpressOptions): RequestHandler`

Returns a standard Express `RequestHandler`. Load errors are propagated via `next(err)` on the first request.

#### `SafeAccessExpressOptions`

```typescript
import type { SafeAccessExpressOptions } from "@safe-access-inline/safe-access-inline";

interface SafeAccessExpressOptions {
    /** Path to the configuration file. Format is auto-detected from the extension. */
    readonly filePath: string;
    /** Explicit format override (e.g. `'json'`, `'yaml'`). */
    readonly format?: string;
    /** Property name to attach the accessor to on `req`. Defaults to `'config'`. */
    readonly attachAs?: string;
    /** Allowed directories for file access (security restriction). */
    readonly allowedDirs?: string[];
    /** Set to `true` to bypass path restrictions when no `allowedDirs` are configured. */
    readonly allowAnyPath?: boolean;
}
```

### Next.js

**Import:** `import { loadConfig as loadNextConfig } from '@safe-access-inline/safe-access-inline'`

Server-side config loader for Next.js. Designed for use in `getServerSideProps`, `getStaticProps`, and App Router server components. Only executes on the server — never in client-side bundles.

```typescript
// getServerSideProps / getStaticProps
import { loadConfig as loadNextConfig } from "@safe-access-inline/safe-access-inline";

export async function getServerSideProps() {
    const config = await loadNextConfig({ filePath: "./config/app.json" });
    return {
        props: { port: config.get("server.port", 3000) },
    };
}

// App Router server component
export default async function Page() {
    const config = await loadNextConfig({ filePath: "./config/app.json" });
    return <div>{config.get("app.title")}</div>;
}
```

#### `loadConfig(options: SafeAccessNextOptions): Promise<AbstractAccessor>`

Loads a configuration file and returns a resolved `AbstractAccessor`.

#### `SafeAccessNextOptions`

```typescript
import type { SafeAccessNextOptions } from "@safe-access-inline/safe-access-inline";

interface SafeAccessNextOptions {
    /** Path to the configuration file. Format is auto-detected from the extension. */
    readonly filePath: string;
    /** Explicit format override (e.g. `'json'`, `'yaml'`). */
    readonly format?: string;
    /** Allowed directories for file access (security restriction). */
    readonly allowedDirs?: string[];
    /** Set to `true` to bypass path restrictions when no `allowedDirs` are configured. */
    readonly allowAnyPath?: boolean;
}
```
