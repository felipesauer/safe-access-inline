---
outline: deep
---

# API — Security — PHP

## Table of Contents

- [Security](#security)

## Security

### SecurityPolicy

**Namespace:** `SafeAccessInline\Security\Guards\SecurityPolicy`

Aggregates all security settings into a single immutable policy object.

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 512,
    maxPayloadBytes: 10_485_760,  // 10 MB
    maxKeys: 10_000,
    allowedDirs: ['/app/config'],
);
```

#### `merge(array $overrides): self`

Creates a new policy with overridden values.

```php
$strict = $policy->merge(['maxDepth' => 64, 'maxKeys' => 1000]);
```

### SecurityOptions

**Namespace:** `SafeAccessInline\Security\Guards\SecurityOptions`

Static assertion methods for payload safety.

| Constant            | Default Value |
| ------------------- | ------------- |
| `MAX_DEPTH`         | 512           |
| `MAX_PAYLOAD_BYTES` | 10,485,760    |
| `MAX_KEYS`          | 10,000        |

#### `SecurityOptions::assertPayloadSize(string $input, ?int $maxBytes = null): void`

Throws `SecurityException` if input exceeds max bytes.

#### `SecurityOptions::assertMaxKeys(array $data, ?int $maxKeys = null): void`

Throws `SecurityException` if data has too many keys (recursive count).

#### `SecurityOptions::assertMaxDepth(int $currentDepth, ?int $maxDepth = null): void`

Throws `SecurityException` if nesting exceeds max depth.

### SecurityGuard

**Namespace:** `SafeAccessInline\Security\Guards\SecurityGuard`

#### `SecurityGuard::assertSafeKey(string $key): void`

Blocks prototype pollution keys: `__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `valueOf`, `toString`, `hasOwnProperty`, `isPrototypeOf`. Throws `SecurityException`.

#### `SecurityGuard::sanitizeObject(array $data): array`

Recursively removes forbidden keys from data.
