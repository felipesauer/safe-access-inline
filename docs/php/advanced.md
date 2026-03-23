---
outline: deep
---

# Advanced Features — PHP

## Table of Contents

- [Array Operations](#array-operations)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & File Loading](#io--file-loading)
- [Layered Configuration](#layered-configuration)
- [Configuration reference](#configuration-reference)
- [PHPStan Integration](#phpstan-integration)

## Array Operations

All array operations return **new instances** — the original is never mutated.

```php
$accessor = SafeAccess::fromArray([
    'tags' => ['php', 'laravel', 'php'],
    'users' => [
        ['name' => 'Ana', 'age' => 30],
        ['name' => 'Bob', 'age' => 25],
        ['name' => 'Carol', 'age' => 30],
    ],
]);

// Append items
$new = $accessor->push('tags', 'safe-access');
// ['php', 'laravel', 'php', 'safe-access']

// Remove last / first
$new = $accessor->pop('tags');     // removes last element
$new = $accessor->shift('tags');   // removes first element

// Prepend
$new = $accessor->unshift('tags', 'first');

// Insert at index (supports negative indices)
$new = $accessor->insert('tags', 1, 'inserted');

// Filter
$adults = $accessor->filterAt('users', fn($u) => $u['age'] >= 30);

// Map / transform
$names = $accessor->mapAt('users', fn($u) => $u['name']);

// Sort
$sorted = $accessor->sortAt('users', 'name');        // ascending by 'name'
$desc   = $accessor->sortAt('users', 'age', 'desc'); // descending by 'age'

// Unique
$unique = $accessor->unique('tags');                  // removes duplicate 'php'
$byAge  = $accessor->unique('users', 'age');          // unique by sub-key

// Flatten
$flat = SafeAccess::fromArray(['matrix' => [[1, 2], [3, 4]]])
    ->flatten('matrix');  // [1, 2, 3, 4]

// Access helpers
$accessor->first('users');    // ['name' => 'Ana', 'age' => 30]
$accessor->last('users');     // ['name' => 'Carol', 'age' => 30]
$accessor->nth('users', 1);   // ['name' => 'Bob', 'age' => 25]
$accessor->nth('users', -1);  // ['name' => 'Carol', 'age' => 30]
```

---

## JSON Patch & Diff

Generate and apply RFC 6902 JSON Patch operations:

```php
$a = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
$b = SafeAccess::fromArray(['name' => 'Ana', 'age' => 31, 'city' => 'SP']);

// Generate diff
$ops = $a->diff($b);
// [
//   ['op' => 'replace', 'path' => '/age', 'value' => 31],
//   ['op' => 'add', 'path' => '/city', 'value' => 'SP'],
// ]

// Apply patch (returns new instance)
$patched = $a->applyPatch([
    ['op' => 'replace', 'path' => '/age', 'value' => 31],
    ['op' => 'add',     'path' => '/city', 'value' => 'SP'],
    ['op' => 'remove',  'path' => '/age'],
]);
```

All RFC 6902 operations are supported:

```php
$patched = $a->applyPatch([
    // move — move a value from one path to another
    ['op' => 'move', 'from' => '/age', 'path' => '/years'],
    // copy — copy a value to a new path
    ['op' => 'copy', 'from' => '/name', 'path' => '/alias'],
    // test — assert a value equals the expected value (throws on mismatch)
    ['op' => 'test', 'path' => '/name', 'value' => 'Ana'],
]);
```

Supported operations: `add`, `replace`, `remove`, `move`, `copy`, `test`.

---

## I/O & File Loading

### Load from file

```php
// Auto-detect format from extension
$config = SafeAccess::fromFile('/app/config.json');
$config = SafeAccess::fromFile('/app/config.yaml');

// Explicit format
$config = SafeAccess::fromFile('/app/data.txt', 'json');

// Restrict allowed directories (path-traversal protection)
$config = SafeAccess::fromFile('/app/config.json', null, ['/app']);
```

### Load from URL

```php
// HTTPS-only, SSRF-safe
$data = SafeAccess::fromUrl('https://api.example.com/config.json');

// With restrictions
$data = SafeAccess::fromUrl('https://api.example.com/data', 'json', [
    'allowedHosts' => ['api.example.com'],
    'allowedPorts' => [443],
    'allowPrivateIps' => false,
]);
```

### NDJSON support

```php
$ndjson = '{"id":1,"name":"Ana"}' . "\n" . '{"id":2,"name":"Bob"}';
$accessor = SafeAccess::fromNdjson($ndjson);
$accessor->get('0.name');   // 'Ana'
$accessor->get('*.id');     // [1, 2]
$accessor->toNdjson();      // back to NDJSON string
```

---

## Layered Configuration

Merge multiple config sources (last-wins):

```php
// Layer accessor instances
$defaults = SafeAccess::fromFile('/app/config/defaults.yaml');
$env      = SafeAccess::fromFile('/app/config/production.yaml');
$config   = SafeAccess::layer([$defaults, $env]);

$config->get('database.host'); // value from production.yaml (if present)

// Convenience: layer from files
$config = SafeAccess::layerFiles([
    '/app/config/defaults.yaml',
    '/app/config/production.yaml',
], ['/app/config']); // allowed directories
```

### File watching

```php
$watcher = SafeAccess::watchFile('/app/config.json', function ($accessor) {
    echo "Config updated: " . $accessor->get('version') . "\n";
});

// Poll for changes (drives the watch loop)
$watcher['poll']();
// Or stop watching
$watcher['stop']();
```

---

## Configuration reference

The package exposes configuration classes for advanced consumers who want to tune limits explicitly.

### `SafeAccessConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\SafeAccessConfig;

$config = new SafeAccessConfig(
    maxCustomAccessors: 50,
);
```

Limits how many custom accessor classes can be registered through `SafeAccess::extend()`.

### `CacheConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\CacheConfig;

$config = new CacheConfig(
    maxSize: 1000,
);
```

Controls the maximum number of parsed dot-notation paths retained by `PathCache`.

### `ParserConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\ParserConfig;

$config = new ParserConfig(
    maxResolveDepth: 512,
    maxXmlDepth: 100,
);
```

Bounds recursive path resolution and XML nesting depth.

### `MergerConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\MergerConfig;

$config = new MergerConfig(
    maxDepth: 512,
);
```

Limits recursion depth during deep-merge operations.

### `MaskerConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\MaskerConfig;

$config = new MaskerConfig(
    defaultMaskValue: '[REDACTED]',
    maxRecursionDepth: 100,
    maxPatternCacheSize: 200,
);
```

Configures the replacement value and recursion bound used by `DataMasker`.

### `AuditConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\AuditConfig;

$config = new AuditConfig(
    maxListeners: 100,
);
```

Caps the number of concurrent audit listeners.

### `FilterParserConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\FilterParserConfig;

$config = new FilterParserConfig(
    maxPatternLength: 128,
    pcreBacktrackLimit: 1000,
    pcreRecursionLimit: 100,
);
```

Sets the regex length and PCRE engine limits used by `match()` filter expressions.

### `IoLoaderConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\IoLoaderConfig;

$config = new IoLoaderConfig(
    curlTimeout: 10,
    curlConnectTimeout: 5,
);
```

Controls total cURL timeout and connection timeout, in seconds, for `IoLoader::fetchUrl()`.

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
- `IniAccessor`, `CsvAccessor`, `EnvAccessor`, `NdjsonAccessor`

::: tip Generic shape requirement
The shape type must be provided as the first template parameter: `AccessorClass<array{...}>`. Using `AbstractAccessor` directly as the annotated type is not supported by the extension — use the concrete subclass.
:::
