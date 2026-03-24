---
outline: deep
---

# Advanced Features — PHP

## Table of Contents

- [Configuration reference](#configuration-reference)
- [PHPStan Integration](#phpstan-integration)

### NDJSON support

```php
$ndjson = '{"id":1,"name":"Ana"}' . "\n" . '{"id":2,"name":"Bob"}';
$accessor = SafeAccess::fromNdjson($ndjson);
$accessor->get('0.name');   // 'Ana'
$accessor->get('*.id');     // [1, 2]
$accessor->toNdjson();      // back to NDJSON string
```

---

## Configuration reference

The package exposes configuration classes for advanced consumers who want to tune limits explicitly.

### `CacheConfig` — tune path cache size

`PathCache` stores parsed dot-notation paths so repeated `->get('a.b.c')` calls skip re-parsing. The default limit is `1000` entries (LRU eviction).

**When to change:** high-frequency access patterns with hundreds of unique paths benefit from a larger cache. Reduce it in memory-constrained environments.

```php
use SafeAccessInline\Core\PathCache;
use SafeAccessInline\Core\Config\CacheConfig;

// Increase cache for a path-heavy workload
PathCache::configure(new CacheConfig(maxSize: 5_000));

// Check current size
PathCache::size(); // int — number of cached entries

// Pre-warm the cache with paths used in hot loops
$paths = ['user.name', 'user.email', 'user.role', 'settings.theme'];
foreach ($paths as $path) {
    $accessor->get($path); // populates the cache
}

// Disable the cache entirely (useful in tests)
PathCache::disable();
// ... run tests ...
PathCache::enable();

// Or clear between test cases
PathCache::clear();
```

### `ParserConfig` — tune recursion limits

`ParserConfig` controls two depth limits:

- `maxResolveDepth` — maximum recursion depth when resolving nested paths (default: `512`)
- `maxXmlDepth` — maximum tag nesting depth when parsing XML (default: `100`)

**When to change:** lower `maxXmlDepth` to harden against deeply nested XML payloads from untrusted sources.

```php
use SafeAccessInline\Core\Config\ParserConfig;

$config = new ParserConfig(
    maxResolveDepth: 512,
    maxXmlDepth: 50, // stricter limit for untrusted XML
);
```

---

## PHPStan Integration

The package ships a custom PHPStan extension that narrows the return type of `get()` at static-analysis time when the accessor is annotated with a concrete shape. Without the extension, `get()` returns `mixed`.

### Enabling the Extension

Add the extension to your project's PHPStan configuration:

```neon
# phpstan.neon
includes:
    - vendor/safe-access-inline/safe-access-inline/phpstan-extension.neon
```

### How it Works

Annotate any accessor variable with `@var AccessorClass<array{...}>` using an inline shape. The extension resolves the return type of `get()` based on the shape at the called path:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Accessors\JsonAccessor;

/** @var JsonAccessor<array{user: array{name: string, age: int}, active: bool}> $acc */
$acc = SafeAccess::fromJson($json);

$name   = $acc->get('user.name');   // PHPStan: string|null
$age    = $acc->get('user.age', 0); // PHPStan: int
$active = $acc->get('active');      // PHPStan: bool|null
$city   = $acc->get('user.city');   // PHPStan: mixed  (not in shape → fallback)
```

Without the annotation, `get()` returns `mixed` — full backward compatibility is preserved.

### Supported Accessor Classes

The extension applies to all concrete accessor classes:

- `ArrayAccessor`, `ObjectAccessor`, `JsonAccessor`
- `XmlAccessor`, `YamlAccessor`, `TomlAccessor`
- `IniAccessor`, `EnvAccessor`, `NdjsonAccessor`

::: tip Generic shape requirement
The shape type must be provided as the first template parameter: `AccessorClass<array{...}>`. Using `AbstractAccessor` directly as the annotated type is not supported by the extension — use the concrete subclass.
:::
