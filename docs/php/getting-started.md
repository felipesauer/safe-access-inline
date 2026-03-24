---
outline: deep
---

# Getting Started — PHP

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Plugin System](/php/plugins)
- [Querying & Filtering](/php/querying)
- [Formats & Utility Methods](/php/formats)
- [Advanced Features](/php/advanced)
- [Security](/php/security)

## Requirements

- PHP 8.2 or higher
- `ext-json` (built-in)
- `ext-simplexml` (built-in, for XML support)

YAML and TOML support is included out of the box. YAML prefers `ext-yaml` when available, falling back to `symfony/yaml`. TOML uses `devium/toml`. Both are installed as dependencies.

## Installation

```bash
composer require safe-access-inline/safe-access-inline
```

## Basic Usage

### Accessing data with dot notation

```php
use SafeAccessInline\SafeAccess;

$json = '{"user": {"profile": {"name": "Ana", "age": 30}}}';
$accessor = SafeAccess::fromJson($json);

// Simple access
$accessor->get('user.profile.name');     // "Ana"
$accessor->get('user.profile.age');      // 30

// Safe access — never throws, returns default
$accessor->get('user.email', 'N/A');     // "N/A"
$accessor->get('nonexistent.path');      // null (default)

// Check existence
$accessor->has('user.profile.name');     // true
$accessor->has('user.email');            // false
```

### Working with arrays

```php
$data = [
    'users' => [
        ['name' => 'Ana', 'role' => 'admin'],
        ['name' => 'Bob', 'role' => 'user'],
        ['name' => 'Carol', 'role' => 'user'],
    ],
];

$accessor = SafeAccess::fromArray($data);

// Access by index
$accessor->get('users.0.name');          // "Ana"
$accessor->get('users.2.role');          // "user"

// Wildcard — get all matching values
$accessor->get('users.*.name');          // ["Ana", "Bob", "Carol"]
$accessor->get('users.*.role');          // ["admin", "user", "user"]
```

### Immutable modifications

```php
$accessor = SafeAccess::fromJson('{"name": "Ana", "age": 30}');

// set() returns a NEW instance
$modified = $accessor->set('email', 'ana@example.com');
$modified->get('email');                 // "ana@example.com"
$accessor->get('email');                 // null (original unchanged)

// remove() also returns a new instance
$cleaned = $accessor->remove('age');
$cleaned->has('age');                    // false
$accessor->has('age');                   // true (original unchanged)
```

### Format auto-detection

```php
$array = SafeAccess::detect(['key' => 'value']);    // ArrayAccessor
$json  = SafeAccess::detect('{"key": "value"}');    // JsonAccessor
$obj   = SafeAccess::detect((object)['a' => 1]);    // ObjectAccessor
```

### Cross-format transformation

```php
$accessor = SafeAccess::fromJson('{"name": "Ana", "age": 30}');

$accessor->toArray();    // ['name' => 'Ana', 'age' => 30]
$accessor->toXml();      // "<root><name>Ana</name><age>30</age></root>"
$accessor->toJson();     // '{"name":"Ana","age":30}'
$accessor->toYaml();     // "name: Ana\nage: 30\n"
$accessor->toToml();     // 'name = "Ana"\nage = 30\n'
```

---

## Plugin System

Replace built-in YAML/TOML parsers or add custom ones. See the [Plugin System](/php/plugins) page for the full guide.

---

## Real-world Scenarios

### Scenario 1 — Load a config file, read values, patch, and write back

```php
use SafeAccessInline\SafeAccess;

// 1. Load
$raw = file_get_contents('/app/config/app.json');
$accessor = SafeAccess::fromJson($raw);

// 2. Read
$host = $accessor->get('database.host', 'localhost');
$port = $accessor->get('database.port', 5432);
echo "Connecting to {$host}:{$port}";

// 3. Patch immutably
$updated = $accessor
    ->set('database.port', 5433)
    ->set('app.version', '2.1.0')
    ->set('app.updatedAt', date('c'));

// 4. Write back as pretty JSON
file_put_contents('/app/config/app.json', $updated->toJson(true));
```

### Scenario 2 — Parse a `.env` file and build a typed config object

```php
use SafeAccessInline\SafeAccess;

$raw = file_get_contents('.env');
$env = SafeAccess::fromEnv($raw);

$db = [
    'host' => (string) $env->get('DB_HOST', 'localhost'),
    'port' => (int) $env->get('DB_PORT', '5432'),
    'name' => (string) $env->get('DB_NAME', 'myapp'),
];

var_dump($db);
// ['host' => 'localhost', 'port' => 5432, 'name' => 'myapp']
```

### Scenario 3 — Merge environment-specific overrides onto a base config

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Exceptions\InvalidFormatException;

$base = SafeAccess::fromYaml(file_get_contents('/app/config/base.yaml'));
$env  = $_ENV['APP_ENV'] ?? 'development';

$config = $base;
try {
    $override = SafeAccess::fromYaml(file_get_contents("/app/config/{$env}.yaml"));
    // Deep-merge the override — base values are preserved unless explicitly replaced
    $config = $base->merge($override->all());
} catch (InvalidFormatException) {
    // No environment-specific override — use base config as-is
}

echo $config->get('database.host');
```
