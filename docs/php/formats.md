---
outline: deep
---

# Formats & Utility Methods — PHP

## Table of Contents

- [Working with Formats](#working-with-formats)
- [Utility Methods](#utility-methods)

## Working with Formats

### Working with YAML

YAML support is included out of the box. Parsing prefers `ext-yaml` when available, falling back to `symfony/yaml`. Serialization follows the same priority.

```php
$yaml = <<<YAML
server:
  host: localhost
  port: 8080
tags:
  - web
  - api
YAML;

$accessor = SafeAccess::fromYaml($yaml);
$accessor->get('server.host');   // "localhost"
$accessor->get('tags.0');        // "web"
$accessor->get('tags.*');        // ["web", "api"]

// Serialize back
$accessor->toYaml();             // "server:\n    host: localhost\n..."
```

::: tip Plugin override
Register a `SymfonyYamlParser` or `SymfonyYamlSerializer` via `PluginRegistry` to force `symfony/yaml` even when `ext-yaml` is present — useful in test environments where you want consistent output.
:::

### Working with TOML

TOML support is provided by `devium/toml`, installed automatically as a dependency.

```php
$toml = <<<TOML
title = "My App"

[database]
host = "localhost"
port = 5432
TOML;

$accessor = SafeAccess::fromToml($toml);
$accessor->get('title');             // "My App"
$accessor->get('database.host');     // "localhost"
$accessor->get('database.port');     // 5432

// Serialize back
$accessor->toToml();                 // 'title = "My App"\n\n[database]\n...'
```

::: tip Plugin override
Register a custom `DeviumTomlParser` or `DeviumTomlSerializer` via `PluginRegistry` if you need to override encoding options.
:::

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

## Utility Methods

```php
$accessor = SafeAccess::fromArray([
    'name' => 'Ana',
    'age' => 30,
    'tags' => ['php', 'laravel'],
]);

$accessor->type('name');     // "string"
$accessor->type('age');      // "number"
$accessor->type('tags');     // "array"
$accessor->type('missing');  // null

$accessor->count();          // 3 (root keys)
$accessor->count('tags');    // 2

$accessor->keys();           // ['name', 'age', 'tags']
$accessor->keys('tags');     // [0, 1]

$accessor->all();            // full array
```

---

## Format Conversion

Every accessor can be serialized to any supported format — no re-parsing needed. This makes cross-format conversion a one-liner:

```php
use SafeAccessInline\SafeAccess;

// YAML → JSON
$accessor = SafeAccess::fromYaml(<<<YAML
app:
  name: MyApp
  version: "2.0"
database:
  host: localhost
  port: 5432
YAML);

$accessor->toJson(true);
// {
//   "app": { "name": "MyApp", "version": "2.0" },
//   "database": { "host": "localhost", "port": 5432 }
// }

// JSON → TOML
$json = SafeAccess::fromJson('{"title":"My App","port":8080}');
$json->toToml();
// title = "My App"
// port = 8080

// TOML → YAML
$toml = SafeAccess::fromToml(<<<TOML
title = "Config"
[db]
host = "localhost"
TOML);
$toml->toYaml();
// title: Config
// db:
//   host: localhost

// JSON → XML
$data = SafeAccess::fromJson('{"user":{"name":"Ana","role":"admin"}}');
$data->toXml();
// <root><user><name>Ana</name><role>admin</role></user></root>
```

> **Tip:** Convert between formats as part of a build pipeline or data migration — load from one format, mutate immutably, serialize to another.
