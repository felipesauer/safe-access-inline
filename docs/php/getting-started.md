---
outline: deep
---

# Getting Started — PHP

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Filtering and Recursive Descent](#filtering-and-recursive-descent)
- [Deep Merge](#deep-merge)
- [Plugin System](#plugin-system)
- [Plugin Examples](#plugin-examples)
- [Working with Formats](#working-with-formats)
- [Custom Accessors](#custom-accessors)
- [Utility Methods](#utility-methods)
- [Array Operations](#array-operations)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & File Loading](#io--file-loading)
- [Layered Configuration](#layered-configuration)
- [Security](#security)
- [Schema Validation](#schema-validation)
- [Audit Logging](#audit-logging)
- [Framework Integrations](#framework-integrations)

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
$accessor->toObject();   // stdClass { name: "Ana", age: 30 }
$accessor->toXml();      // "<root><name>Ana</name><age>30</age></root>"
$accessor->toJson();     // '{"name":"Ana","age":30}'
$accessor->toYaml();     // "name: Ana\nage: 30\n"
$accessor->toToml();     // 'name = "Ana"\nage = 30\n'
```

---

## Filtering and Recursive Descent

### Filter expressions

Use `[?field operator value]` to filter arrays:

```php
$accessor = SafeAccess::fromObject([
    'products' => [
        ['name' => 'Laptop', 'price' => 1200, 'category' => 'electronics'],
        ['name' => 'Phone',  'price' => 800,  'category' => 'electronics'],
        ['name' => 'Book',   'price' => 25,   'category' => 'education'],
    ],
]);

// Filter by equality
$accessor->get("products[?category=='electronics'].name");
// ['Laptop', 'Phone']

// Filter by numeric comparison
$accessor->get('products[?price>500].name');
// ['Laptop', 'Phone']

// Combine with AND / OR
$accessor->get("products[?price>100 && category=='electronics'].name");
// ['Laptop', 'Phone']
```

### Recursive descent

Use `..key` to collect all values with that key at any depth:

```php
$accessor = SafeAccess::fromArray([
    'name' => 'Corp',
    'departments' => [
        'engineering' => [
            'name' => 'Engineering',
            'teams' => [
                'frontend' => ['name' => 'Frontend', 'members' => 5],
                'backend'  => ['name' => 'Backend',  'members' => 8],
            ],
        ],
        'marketing' => ['name' => 'Marketing', 'members' => 3],
    ],
]);

$accessor->get('..name');
// ['Corp', 'Engineering', 'Frontend', 'Backend', 'Marketing']

$accessor->get('..members');
// [5, 8, 3]
```

### Combining filters with descent

```php
$accessor = SafeAccess::fromArray([
    'region1' => [
        'stores' => [
            ['name' => 'Store A', 'revenue' => 50000, 'active' => true],
            ['name' => 'Store B', 'revenue' => 20000, 'active' => false],
        ],
    ],
    'region2' => [
        'stores' => [
            ['name' => 'Store C', 'revenue' => 80000, 'active' => true],
        ],
    ],
]);

$accessor->get("..stores[?active==true].name");
// ['Store A', 'Store C']
```

---

## Deep Merge

```php
$accessor = SafeAccess::fromArray([
    'user' => ['name' => 'Ana', 'settings' => ['theme' => 'light', 'lang' => 'en']],
]);

// Merge at a specific path
$updated = $accessor->merge('user.settings', ['theme' => 'dark', 'notifications' => true]);
$updated->get('user.settings.theme');         // 'dark'
$updated->get('user.settings.lang');          // 'en' (preserved)
$updated->get('user.settings.notifications'); // true

// Merge at root
$withMeta = $accessor->merge(['version' => '2.0', 'debug' => false]);
$withMeta->get('version');   // '2.0'
$withMeta->get('user.name'); // 'Ana' (preserved)
```

---

## Plugin System

YAML and TOML work out of the box (`ext-yaml` or `symfony/yaml` for YAML, `devium/toml` for TOML). The Plugin System lets you **override** the default parsers and serializers with custom implementations.

### Overriding Defaults

```php
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Plugins\DeviumTomlParser;

// Override YAML parser with custom options
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

// Override TOML parser
PluginRegistry::registerParser('toml', new DeviumTomlParser());
```

> Plugins are **optional overrides**. YAML and TOML work without any plugin registration.

### Using YAML (zero config)

```php
// Works out of the box — no plugin registration needed:
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
$accessor->get('name');           // "Ana"
$accessor->get('age');            // 30

$accessor->toYaml();              // "name: Ana\nage: 30\n"
```

### Using TOML (zero config)

```php
// Works out of the box — no plugin registration needed:
$toml = <<<TOML
title = "My Config"

[database]
host = "localhost"
port = 5432
TOML;

$accessor = SafeAccess::fromToml($toml);
$accessor->get('title');              // "My Config"
$accessor->get('database.host');      // "localhost"
$accessor->toToml();                  // TOML output
```

### Generic Serialization with `transform()`

The `transform()` method serializes data to any format that has a registered serializer plugin:

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->transform('yaml');     // "name: Ana\n"
```

### Shipped Plugins

| Plugin                  | Format | Type       | Requires                   |
| ----------------------- | ------ | ---------- | -------------------------- |
| `SymfonyYamlParser`     | yaml   | Parser     | `symfony/yaml`             |
| `SymfonyYamlSerializer` | yaml   | Serializer | `symfony/yaml`             |
| `NativeYamlParser`      | yaml   | Parser     | `ext-yaml` (PHP extension) |
| `NativeYamlSerializer`  | yaml   | Serializer | `ext-yaml` (PHP extension) |
| `DeviumTomlParser`      | toml   | Parser     | `devium/toml`              |
| `DeviumTomlSerializer`  | toml   | Serializer | `devium/toml`              |

### Creating Custom Plugins

You can create your own plugins by implementing the plugin interfaces:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;

class MyYamlParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        // Your parsing logic
        return yaml_parse($raw);
    }
}

class MyYamlSerializer implements SerializerPluginInterface
{
    public function serialize(array $data): string
    {
        // Your serialization logic
        return yaml_emit($data);
    }
}

// Register
PluginRegistry::registerParser('yaml', new MyYamlParser());
PluginRegistry::registerSerializer('yaml', new MyYamlSerializer());
```

---

## Plugin Examples

### Laravel Config Integration

```php
use SafeAccessInline\SafeAccess;

// Load Laravel config as a safe accessor
$config = SafeAccess::fromArray(config()->all());
$config->get('database.connections.mysql.host');     // type-safe, never throws
$config->get('app.timezone', 'UTC');                 // with fallback
$config->get('database.connections.*.driver');        // wildcard across connections
```

### Symfony ParameterBag Integration

```php
use SafeAccessInline\SafeAccess;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;

class ConfigService
{
    private \SafeAccessInline\Core\AbstractAccessor $accessor;

    public function __construct(ParameterBagInterface $params)
    {
        $this->accessor = SafeAccess::fromArray($params->all());
    }

    public function get(string $path, mixed $default = null): mixed
    {
        return $this->accessor->get($path, $default);
    }
}
```

---

## Working with Formats

### Working with XML

```php
$xml = <<<XML
<?xml version="1.0"?>
<config>
    <database>
        <host>localhost</host>
        <port>5432</port>
    </database>
    <app>
        <name>MyApp</name>
    </app>
</config>
XML;

$accessor = SafeAccess::fromXml($xml);
$accessor->get('database.host');         // "localhost"
$accessor->get('app.name');              // "MyApp"
```

### Working with INI

```php
$ini = <<<INI
app_name = MyApp

[database]
host = localhost
port = 3306

[cache]
driver = redis
INI;

$accessor = SafeAccess::fromIni($ini);
$accessor->get('app_name');              // "MyApp"
$accessor->get('database.host');         // "localhost"
$accessor->get('cache.driver');          // "redis"
```

### Working with ENV

```php
$env = <<<ENV
APP_NAME=MyApp
APP_KEY="secret-key"
DEBUG=true
# This is a comment
DB_HOST=localhost
ENV;

$accessor = SafeAccess::fromEnv($env);
$accessor->get('APP_NAME');              // "MyApp"
$accessor->get('APP_KEY');               // "secret-key"
$accessor->get('DB_HOST');               // "localhost"
```

### Working with CSV

```php
$csv = "name,age,city\nAna,30,Porto Alegre\nBob,25,São Paulo";

$accessor = SafeAccess::fromCsv($csv);
$accessor->get('0.name');                // "Ana"
$accessor->get('1.city');                // "São Paulo"
$accessor->get('*.name');                // ["Ana", "Bob"]
```

### Custom accessors

```php
use SafeAccessInline\Core\AbstractAccessor;

class MyFormatAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        return new static($data);
    }

    protected function parse(mixed $raw): array
    {
        // Your custom parsing logic
        return ['parsed' => $raw];
    }
}

// Register
SafeAccess::extend('myformat', MyFormatAccessor::class);

// Use
$accessor = SafeAccess::custom('myformat', $data);
$accessor->get('parsed');
```

## Utility Methods

```php
$accessor = SafeAccess::fromArray([
    'name' => 'Ana',
    'age' => 30,
    'tags' => ['php', 'laravel'],
]);

$accessor->type('name');     // "string"
$accessor->type('age');      // "integer"
$accessor->type('tags');     // "array"
$accessor->type('missing');  // null

$accessor->count();          // 3 (root keys)
$accessor->count('tags');    // 2

$accessor->keys();           // ['name', 'age', 'tags']
$accessor->keys('tags');     // [0, 1]

$accessor->all();            // full array
```

---

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

---

## Security

### SecurityPolicy

Combine all security settings into a single policy:

```php
use SafeAccessInline\Security\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 128,
    maxPayloadBytes: 1_048_576,  // 1 MB
    maxKeys: 5000,
    allowedDirs: ['/app/config'],
    url: ['allowedHosts' => ['api.example.com']],
    csvMode: 'strip',
    maskPatterns: ['password', '*_token'],
);

// Load with policy
$accessor = SafeAccess::withPolicy($jsonString, $policy);
$accessor = SafeAccess::fromFileWithPolicy('/app/config.json', $policy);
$accessor = SafeAccess::fromUrlWithPolicy('https://api.example.com/config.json', $policy);
```

### Data masking

```php
$accessor = SafeAccess::fromArray([
    'user' => 'Ana',
    'password' => 's3cret',
    'api_key' => 'abc-123',
]);

$safe = $accessor->masked();
$safe->get('password');  // '[REDACTED]'
$safe->get('api_key');   // '[REDACTED]'
$safe->get('user');      // 'Ana'

// Custom patterns
$safe = $accessor->masked(['custom_secret', '*_token']);
```

### Readonly accessors

```php
$readonly = new \SafeAccessInline\Accessors\ArrayAccessor(['key' => 'value'], true);
$readonly->get('key');           // 'value' — reading works
$readonly->set('key', 'new');    // throws ReadonlyViolationException
```

---

## Schema Validation

```php
use SafeAccessInline\Core\SchemaRegistry;

// Register a default adapter (implement SchemaAdapterInterface)
SchemaRegistry::setDefaultAdapter($myAdapter);

// Validate — throws SchemaValidationException on failure
$accessor->validate($schema);

// Fluent chaining
$name = $accessor->validate($schema)->get('name');

// With explicit adapter
$accessor->validate($schema, new MySchemaAdapter());
```

---

## Audit Logging

Track security-relevant operations:

```php
$unsub = SafeAccess::onAudit(function (array $event) {
    // $event = ['type' => 'file.read', 'timestamp' => ..., 'detail' => [...]]
    logger()->info($event['type'], $event['detail']);
});

// Events: file.read, file.watch, url.fetch, security.violation,
//         data.mask, data.freeze, schema.validate

// Clean up
$unsub();
SafeAccess::clearAuditListeners();
```

---

## Framework Integrations

### Laravel

```php
use SafeAccessInline\Integrations\LaravelServiceProvider;

// In a service provider's register() method:
LaravelServiceProvider::register($this->app);

// Now resolve from container:
$accessor = app('safe-access');
$accessor = app(\SafeAccessInline\Core\AbstractAccessor::class);

// Or wrap config directly:
$config = LaravelServiceProvider::fromConfig(config());
$config->get('app.name');                        // type-safe access
$config->get('database.connections.*.driver');    // wildcard

// Specific config key:
$db = LaravelServiceProvider::fromConfigKey(config(), 'database');
$db->get('default'); // 'mysql'
```

### Symfony

```php
use SafeAccessInline\Integrations\SymfonyIntegration;

// From ParameterBag
$accessor = SymfonyIntegration::fromParameterBag($container->getParameterBag());
$accessor->get('kernel.environment');  // 'prod'

// From config array
$accessor = SymfonyIntegration::fromConfig($processedConfig);

// From YAML file (with path protection)
$accessor = SymfonyIntegration::fromYamlFile('/app/config/services.yaml', ['/app/config']);
```
