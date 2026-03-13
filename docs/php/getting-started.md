# Getting Started — PHP

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Plugin System](#plugin-system)
- [Working with Formats](#working-with-formats)
- [Custom Accessors](#custom-accessors)
- [Utility Methods](#utility-methods)

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
