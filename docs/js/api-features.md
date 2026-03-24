---
outline: deep
---

# API — Operations & I/O — JavaScript / TypeScript

## Table of Contents

- [Type-Safe Path Inference](#type-safe-path-inference)
- [Security](#security)

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

### Untyped Access

If no generic is provided (or you use `Record<string, unknown>`), `get()` falls back to returning `unknown` — full backward compatibility is preserved:

```typescript
// Untyped — returns unknown
const accessor = SafeAccess.from(rawInput);
const value = accessor.get("some.path"); // unknown
```

---

## Security

### Deep Freeze

**Import:** `import { deepFreeze } from '@safe-access-inline/safe-access-inline'`

#### `deepFreeze<T extends object>(obj: T): Readonly<T>`

Recursively freezes an object using `Object.freeze` on every nested level. Use it to protect config objects from accidental or malicious mutation.

```typescript
import { deepFreeze } from "@safe-access-inline/safe-access-inline";

const config = deepFreeze({
    db: { host: "localhost", port: 5432 },
    flags: { debug: false },
});

// Write attempts are silently ignored (or TypeError in strict mode)
config.db.host = "other"; // no-op

// Also guards against prototype pollution from JSON payloads:
const payload = JSON.parse('{"__proto__": {"isAdmin": true}}');
const safe = deepFreeze(Object.assign({}, payload));
console.log(({} as any).isAdmin); // undefined — prototype untouched
```
