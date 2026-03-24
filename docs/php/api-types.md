---
outline: deep
---

# API — Types & Internals — PHP

## Table of Contents

- [PluginRegistry](#pluginregistry)
- [PathCache](#pathcache)
- [Exceptions](#exceptions)
- [Interfaces](#interfaces)
- [Enums](#enums)

## PluginRegistry

**Namespace:** `SafeAccessInline\Core\Registries\PluginRegistry`

Static registry for parser and serializer plugins. Parsers convert raw strings to arrays; serializers convert arrays to formatted strings.

#### `PluginRegistry::registerParser(string $format, ParserPluginInterface $parser): void`

Register a parser plugin for the given format.

```php
use SafeAccessInline\Plugins\SymfonyYamlParser;
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
```

#### `PluginRegistry::registerSerializer(string $format, SerializerPluginInterface $serializer): void`

Register a serializer plugin for the given format.

```php
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
```

#### `PluginRegistry::hasParser(string $format): bool`

Check if a parser is registered for the given format.

#### `PluginRegistry::hasSerializer(string $format): bool`

Check if a serializer is registered for the given format.

#### `PluginRegistry::getParser(string $format): ParserPluginInterface`

Get the registered parser. Throws `UnsupportedTypeException` if not registered.

#### `PluginRegistry::getSerializer(string $format): SerializerPluginInterface`

Get the registered serializer. Throws `UnsupportedTypeException` if not registered.

#### `PluginRegistry::reset(): void`

Clear all registered plugins. Intended for testing — call in `beforeEach` to prevent cross-test pollution.

### Plugin Interfaces

#### `ParserPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\ParserPluginInterface`

```php
interface ParserPluginInterface
{
    /**
     * @param string $raw
     * @return array<mixed>
     * @throws InvalidFormatException
     */
    public function parse(string $raw): array;
}
```

#### `SerializerPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\SerializerPluginInterface`

```php
interface SerializerPluginInterface
{
    /**
     * @param array<mixed> $data
     * @return string
     */
    public function serialize(array $data): string;
}
```

---

## PathCache

**Namespace:** `SafeAccessInline\Core\PathCache`

An internal LRU-style cache for parsed dot-notation path segments. Exported for advanced use cases such as pre-warming the cache or clearing it between test runs. All methods are static.

#### `PathCache::get(string $path): ?array`

Retrieve cached parsed segments for the given path string.

#### `PathCache::set(string $path, array $segments): void`

Store parsed segments in the cache.

#### `PathCache::has(string $path): bool`

Check if a path is cached.

#### `PathCache::clear(): void`

Evict all entries from the cache.

#### `PathCache::size(): int`

Return the current number of cached entries.

#### `PathCache::enable(): void`

Enable the cache (enabled by default).

#### `PathCache::disable(): void`

Disable the cache — all lookups will bypass the cache.

#### `PathCache::isEnabled(): bool`

Check if the cache is currently enabled.

---

## Exceptions

| Exception                    | When                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `AccessorException`          | Base exception class                                                                                       |
| `InvalidFormatException`     | Invalid input format (e.g., malformed JSON, missing parser plugin at accessor level)                       |
| `UnsupportedTypeException`   | `detect()` cannot determine format; `PluginRegistry` has no registered plugin; `toXml()` has no serializer |
| `PathNotFoundException`      | Reserved (not thrown by `get()`)                                                                           |
| `SecurityException`          | Path traversal, payload too large, forbidden keys                                                          |
| `ReadonlyViolationException` | Modifying a readonly accessor (`set`, `remove`, `merge`, `push`, etc.)                                     |

### Catching exceptions

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

// InvalidFormatException — malformed input
try {
    SafeAccess::fromJson('not valid json');
} catch (InvalidFormatException $e) {
    echo 'Bad input: ' . $e->getMessage();
}

// SecurityException — policy violation
try {
    $policy = new SecurityPolicy(maxPayloadBytes: 10);
    SafeAccess::withPolicy('{"key": "value that is too long"}', $policy);
} catch (SecurityException $e) {
    echo 'Payload too large: ' . $e->getMessage();
}

// ReadonlyViolationException — mutation on frozen accessor
try {
    $ro = SafeAccess::fromObject(['k' => 1], readonly: true);
    $ro->set('k', 2);
} catch (ReadonlyViolationException $e) {
    echo 'Cannot mutate a readonly accessor';
}

// UnsupportedTypeException — no plugin registered
try {
    $accessor = SafeAccess::fromJson('{"key": "value"}');
    $accessor->transform('custom-format'); // no plugin registered
} catch (UnsupportedTypeException $e) {
    echo 'Register a plugin first via PluginRegistry';
}
```

---

## Interfaces

| Interface                   | Methods                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AccessorInterface`         | Complete contract: `get()`, `getMany()`, `all()`, `set()`, `merge()`, `remove()`, `toArray()`, `toJson()`, serializers, `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                                                                                |
| `SerializerPluginInterface` | `serialize()`                                                                                                                                                            |

---

## Enums

### `Format`

**Namespace:** `SafeAccessInline\Enums\Format`

String-backed enum covering all built-in formats. Use it as a type-safe alternative to passing raw strings to `SafeAccess::from()`.

| Case             | Value      |
| ---------------- | ---------- |
| `Format::Array`  | `'array'`  |
| `Format::Object` | `'object'` |
| `Format::Json`   | `'json'`   |
| `Format::Xml`    | `'xml'`    |
| `Format::Yaml`   | `'yaml'`   |
| `Format::Toml`   | `'toml'`   |
| `Format::Ini`    | `'ini'`    |
| `Format::Env`    | `'env'`    |
| `Format::Ndjson` | `'ndjson'` |

### `SegmentType` <Badge type="warning" text="@internal" />

**Namespace:** `SafeAccessInline\Enums\SegmentType`

Discriminator for the parsed segment kinds produced by the dot-notation parser. **This is an internal implementation detail** — it is exported for library authors building on top of this package, but regular application code should not rely on it.

| Case                         | Value             |
| ---------------------------- | ----------------- |
| `SegmentType::KEY`           | `'key'`           |
| `SegmentType::INDEX`         | `'index'`         |
| `SegmentType::WILDCARD`      | `'wildcard'`      |
| `SegmentType::DESCENT`       | `'descent'`       |
| `SegmentType::DESCENT_MULTI` | `'descent-multi'` |
| `SegmentType::MULTI_INDEX`   | `'multi-index'`   |
| `SegmentType::MULTI_KEY`     | `'multi-key'`     |
| `SegmentType::FILTER`        | `'filter'`        |
| `SegmentType::SLICE`         | `'slice'`         |
