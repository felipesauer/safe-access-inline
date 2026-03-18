---
outline: deep
---

# Advanced Features — PHP

## Table of Contents

- [Array Operations](#array-operations)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & File Loading](#io--file-loading)
- [Layered Configuration](#layered-configuration)

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
$stop = SafeAccess::watchFile('/app/config.json', function ($accessor) {
    echo "Config updated: " . $accessor->get('version') . "\n";
});

// Later: stop watching
$stop();
```
