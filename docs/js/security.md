---
outline: deep
---

# Security — JavaScript / TypeScript

## Table of Contents

- [SecurityPolicy](#securitypolicy)
- [Global Policy](#global-policy)
- [Readonly Accessors](#readonly-accessors)
- [Deep Freeze & Prototype Pollution](#deep-freeze--prototype-pollution)

---

## SecurityPolicy

A `SecurityPolicy` object applies a set of constraints to any parse or load operation. All fields are optional — omit any you don't need.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = {
    maxDepth: 128,
    maxPayloadBytes: 1_048_576, // 1 MB
    maxKeys: 5_000,
    allowedDirs: ["/app/config"],
};

// Apply to a string payload
const accessor = SafeAccess.withPolicy(jsonString, policy);
```

### Policy field reference

| Field             | Type       | Default      | Protects against                                      |
| ----------------- | ---------- | ------------ | ----------------------------------------------------- |
| `maxDepth`        | `number`   | `128`        | Deeply nested objects that trigger stack overflows    |
| `maxPayloadBytes` | `number`   | `10_485_760` | Memory exhaustion from oversized payloads             |
| `maxKeys`         | `number`   | `10_000`     | Objects with millions of keys consuming excessive RAM |
| `allowedDirs`     | `string[]` | `[]`         | Path-traversal attacks in file-loading operations     |

### When a policy violation is detected

Violations throw a `SecurityError`:

```typescript
import {
    SafeAccess,
    SecurityError,
} from "@safe-access-inline/safe-access-inline";
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = { maxPayloadBytes: 128 }; // tiny limit for demo

const bigJson = JSON.stringify({ data: "x".repeat(1000) });

try {
    SafeAccess.withPolicy(bigJson, policy);
} catch (e) {
    if (e instanceof SecurityError) {
        console.error("Security constraint violated:", e.message);
        // "Payload exceeds maximum allowed size"
    }
}
```

---

## Global Policy

Set a default policy that applies automatically to every operation without passing it explicitly each time:

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const appPolicy: SecurityPolicy = {
    maxDepth: 64,
    maxPayloadBytes: 2_097_152, // 2 MB
};

// Install globally — applies to all subsequent operations
SafeAccess.setGlobalPolicy(appPolicy);

// These now respect the global policy automatically
const a = SafeAccess.fromJson(largeJson);

// Remove the global policy when no longer needed
SafeAccess.clearGlobalPolicy();
```

---

## Readonly Accessors

Pass `{ readonly: true }` to any factory method to prevent all mutations. Any call to `set()`, `remove()`, `merge()`, or `freeze()` throws a `ReadonlyViolationError`:

```typescript
import {
    SafeAccess,
    ReadonlyViolationError,
} from "@safe-access-inline/safe-access-inline";

const ro = SafeAccess.fromObject({ key: "value" }, { readonly: true });

ro.get("key"); // "value" — reads always work

try {
    ro.set("key", "new");
} catch (e) {
    if (e instanceof ReadonlyViolationError) {
        console.error("Cannot mutate a readonly accessor");
    }
}
```

You can also freeze an existing accessor at runtime:

```typescript
const accessor = SafeAccess.fromJson('{"config": {"debug": false}}');
const frozen = accessor.freeze();

frozen.get("config.debug"); // false
frozen.set("config.debug", true); // throws ReadonlyViolationError
accessor.set("config.debug", true); // still works — original is not frozen
```

---

## Deep Freeze & Prototype Pollution

`deepFreeze` recursively freezes an object using `Object.freeze`, preventing any code from adding or modifying properties including through prototype chains:

```typescript
import { deepFreeze } from "@safe-access-inline/safe-access-inline";

const config = deepFreeze({
    db: { host: "localhost", port: 5432 },
    flags: { debug: true },
});

// Any mutation attempt is silently ignored in loose mode,
// or throws a TypeError in strict mode
config.db.host = "other"; // no-op (or TypeError in strict mode)
(config as any).__proto__.polluted = true; // no-op
```

### Why this matters

Without freezing, a crafted JSON payload can pollute the prototype chain:

```typescript
// Without protection — dangerous:
const payload = JSON.parse('{"__proto__": {"admin": true}}');
const obj = Object.assign({}, payload);
console.log(({} as any).admin); // true — prototype polluted!

// With deepFreeze — safe:
const safe = deepFreeze(JSON.parse('{"__proto__": {"admin": true}}'));
const obj2 = Object.assign({}, safe);
console.log(({} as any).admin); // undefined — prototype intact
```

> For XML XXE prevention (DOCTYPE/ENTITY blocking), the library applies it automatically on every `fromXml()` call — no configuration needed.
