---
outline: deep
---

# Advanced Features — JavaScript / TypeScript

## Table of Contents

- [Array Operations](#array-operations)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & File Loading](#io--file-loading)
- [Layered Configuration](#layered-configuration)

---

## Array Operations

All array operations return **new instances** — the original is never mutated.

```typescript
const accessor = SafeAccess.fromObject({
    tags: ["js", "ts", "js"],
    users: [
        { name: "Ana", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Carol", age: 30 },
    ],
});

// Append items
const pushed = accessor.push("tags", "safe-access");
// ['js', 'ts', 'js', 'safe-access']

// Remove last / first
accessor.pop("tags"); // removes last element
accessor.shift("tags"); // removes first element

// Prepend
accessor.unshift("tags", "first");

// Insert at index (supports negative indices)
accessor.insert("tags", 1, "inserted");

// Filter
accessor.filterAt("users", (u) => u.age >= 30);

// Map / transform
accessor.mapAt("users", (u) => u.name);

// Sort
accessor.sortAt("users", "name"); // ascending by 'name'
accessor.sortAt("users", "age", "desc"); // descending by 'age'

// Unique
accessor.unique("tags"); // removes duplicate 'js'
accessor.unique("users", "age"); // unique by sub-key

// Flatten
SafeAccess.fromObject({
    matrix: [
        [1, 2],
        [3, 4],
    ],
}).flatten("matrix");
// [1, 2, 3, 4]

// Access helpers
accessor.first("users"); // { name: 'Ana', age: 30 }
accessor.last("users"); // { name: 'Carol', age: 30 }
accessor.nth("users", 1); // { name: 'Bob', age: 25 }
accessor.nth("users", -1); // { name: 'Carol', age: 30 }
```

---

## JSON Patch & Diff

Generate and apply RFC 6902 JSON Patch operations:

```typescript
import {
    SafeAccess,
    diff,
    applyPatch,
} from "@safe-access-inline/safe-access-inline";

const a = SafeAccess.fromObject({ name: "Ana", age: 30 });
const b = SafeAccess.fromObject({ name: "Ana", age: 31, city: "SP" });

// Instance method
const ops = a.diff(b);
// [
//   { op: 'replace', path: '/age', value: 31 },
//   { op: 'add', path: '/city', value: 'SP' },
// ]

// Apply patch (returns new instance)
const patched = a.applyPatch([
    { op: "replace", path: "/age", value: 31 },
    { op: "add", path: "/city", value: "SP" },
]);

// Standalone functions also available
const ops2 = diff(a.all(), b.all());
const result = applyPatch(a.all(), ops2);
```

Supported operations: `add`, `replace`, `remove`, `move`, `copy`, `test`.

---

## I/O & File Loading

### Load from file

```typescript
// Auto-detect format from extension
const config = SafeAccess.fromFileSync("/app/config.json");

// Async
const config2 = await SafeAccess.fromFile("/app/config.yaml");

// Restrict allowed directories (path-traversal protection)
const safe = SafeAccess.fromFileSync("/app/config.json", undefined, ["/app"]);
```

### Load from URL

```typescript
// HTTPS-only, SSRF-safe
const data = await SafeAccess.fromUrl("https://api.example.com/config.json");

// With restrictions
const data2 = await SafeAccess.fromUrl("https://api.example.com/data", "json", {
    allowedHosts: ["api.example.com"],
    allowedPorts: [443],
    allowPrivateIps: false,
});
```

### NDJSON support

```typescript
const ndjson = '{"id":1}\n{"id":2}';
const accessor = SafeAccess.fromNdjson(ndjson);
accessor.get("0.id"); // 1
accessor.get("*.id"); // [1, 2]
accessor.toNdjson(); // back to NDJSON string
```

---

## Layered Configuration

Merge multiple config sources (last-wins):

```typescript
// Layer accessor instances
const defaults = SafeAccess.fromFileSync("/app/config/defaults.json");
const overrides = SafeAccess.fromFileSync("/app/config/local.json");
const config = SafeAccess.layer([defaults, overrides]);

// Convenience: layer from files
const config2 = SafeAccess.layerFiles(
    ["/app/config/defaults.yaml", "/app/config/production.yaml"],
    ["/app/config"], // allowed directories
);

// File watching
const stop = SafeAccess.watchFile("/app/config.json", (accessor) => {
    console.log("Config updated:", accessor.get("version"));
});
// Later: stop()
```
