---
outline: deep
---

# Advanced Features — JavaScript / TypeScript

## Table of Contents

- [Configuration reference](#configuration-reference)

---

### NDJSON support

```typescript
const ndjson = '{"id":1}\n{"id":2}';
const accessor = SafeAccess.fromNdjson(ndjson);
accessor.get("0.id"); // 1
accessor.get("*.id"); // [1, 2]
accessor.toNdjson(); // back to NDJSON string
```

---

## Configuration reference

The package exports configuration interfaces and default objects for advanced consumers who need to tune limits explicitly.

### `CacheConfig` — tune path cache size

`PathCache` stores parsed dot-notation paths so repeated `get("a.b.c")` calls skip re-parsing. The default limit is `1000` entries (LRU eviction).

**When to change:** high-frequency access patterns with hundreds of unique paths benefit from a larger cache. Reduce it in memory-constrained environments.

```typescript
import { PathCache } from "@safe-access-inline/safe-access-inline";

// Increase cache for a path-heavy workload
PathCache.configure({ maxSize: 5_000 });

// Check current size
PathCache.size; // number of cached entries

// Pre-warm the cache with paths used in hot loops
const paths = ["user.name", "user.email", "user.role", "settings.theme"];
const accessor = SafeAccess.fromObject(data);
paths.forEach((p) => accessor.get(p)); // populates the cache

// Disable cache entirely (useful in tests to ensure isolation)
PathCache.disable();
// ... run tests ...
PathCache.enable();

// Or clear between test cases
PathCache.clear();
```

### `ParserConfig` — tune recursion limits

`ParserConfig` controls two depth limits:

- `maxResolveDepth` — maximum recursion depth when resolving nested paths (default: `512`)
- `maxXmlDepth` — maximum tag nesting depth when parsing XML (default: `100`)

**When to change:** lower `maxXmlDepth` to harden against deeply nested XML payloads from untrusted sources. Increase `maxResolveDepth` if you work with extremely deep JSON structures.

```typescript
import { DEFAULT_PARSER_CONFIG } from "@safe-access-inline/safe-access-inline";
import type { ParserConfig } from "@safe-access-inline/safe-access-inline";

// Inspect defaults
console.log(DEFAULT_PARSER_CONFIG);
// { maxResolveDepth: 512, maxXmlDepth: 100 }

// Use in a SecurityPolicy for runtime enforcement
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = {
    maxDepth: DEFAULT_PARSER_CONFIG.maxResolveDepth,
};
```
