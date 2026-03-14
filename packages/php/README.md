# Safe Access Inline — PHP

[![Packagist Version](https://img.shields.io/packagist/v/safe-access-inline/safe-access-inline)](https://packagist.org/packages/safe-access-inline/safe-access-inline)
[![PHP Version](https://img.shields.io/packagist/php-v/safe-access-inline/safe-access-inline)](https://packagist.org/packages/safe-access-inline/safe-access-inline)
[![License](https://img.shields.io/packagist/l/safe-access-inline/safe-access-inline)](LICENSE)

Safe nested data access with dot notation for PHP — supports **Array, Object, JSON, XML, YAML, TOML, INI, CSV, ENV**.

> This is a **read-only mirror** of [`packages/php`](https://github.com/felipesauer/safe-access-inline/tree/main/packages/php) in the [safe-access-inline](https://github.com/felipesauer/safe-access-inline) mono-repo. Issues and pull requests should be opened there.

## Installation

```bash
composer require safe-access-inline/safe-access-inline
```

## Quick Start

```php
use SafeAccessInline\SafeAccess;

// From JSON string
$accessor = SafeAccess::fromJson('{"user": {"name": "Felipe", "roles": ["admin"]}}');
$accessor->get('user.name');           // "Felipe"
$accessor->get('user.roles.0');        // "admin"
$accessor->get('user.email', 'N/A');   // "N/A" (default)

// From array
$accessor = SafeAccess::fromArray(['database' => ['host' => 'localhost', 'port' => 5432]]);
$accessor->get('database.port');       // 5432

// From XML string
$accessor = SafeAccess::fromXml('<root><server><host>localhost</host></server></root>');
$accessor->get('server.host');         // "localhost"
```

## Supported Formats

| Method                     | Format      | Requirements                            |
| -------------------------- | ----------- | --------------------------------------- |
| `SafeAccess::fromArray()`  | PHP Array   | —                                       |
| `SafeAccess::fromObject()` | stdClass    | —                                       |
| `SafeAccess::fromJson()`   | JSON string | `ext-json`                              |
| `SafeAccess::fromXml()`    | XML string  | `ext-simplexml`                         |
| `SafeAccess::fromYaml()`   | YAML string | `ext-yaml` or `symfony/yaml` (included) |
| `SafeAccess::fromToml()`   | TOML string | `devium/toml` (included)                |
| `SafeAccess::fromIni()`    | INI string  | —                                       |
| `SafeAccess::fromCsv()`    | CSV string  | —                                       |
| `SafeAccess::fromEnv()`    | ENV string  | —                                       |
| `SafeAccess::from()`       | Auto-detect | Varies                                  |

## Plugin System

YAML and TOML work out of the box. YAML prefers `ext-yaml` when available, falling back to `symfony/yaml`. TOML uses `devium/toml`. The Plugin System lets you **override** the defaults with custom or alternative implementations:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Plugins\DeviumTomlParser;
use SafeAccessInline\Plugins\DeviumTomlSerializer;

// Override parsers (optional — works without this)
SafeAccess::registerPlugin('yaml', 'parser', new SymfonyYamlParser());
SafeAccess::registerPlugin('toml', 'parser', new DeviumTomlParser());

// Override serializers (optional — works without this)
SafeAccess::registerPlugin('yaml', 'serializer', new SymfonyYamlSerializer());
SafeAccess::registerPlugin('toml', 'serializer', new DeviumTomlSerializer());

// YAML and TOML work with or without plugins
$accessor = SafeAccess::fromYaml("server:\n  host: localhost");
$accessor->get('server.host'); // "localhost"
```

### Custom plugins

Implement `ParserPluginInterface` or `SerializerPluginInterface`:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;

class MyYamlParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        return my_yaml_parse($raw);
    }
}

SafeAccess::registerPlugin('yaml', 'parser', new MyYamlParser());
```

## Dot Notation

Access nested values using dot-separated keys, wildcards, filters, and recursive descent:

```
user.name                        → simple nested access
user.roles.0                     → array index
servers.*.host                   → wildcard (all items)
users[?active==true].name        → filter by condition
users[?age>=18 && role=='admin'] → compound filter (&&, ||)
..name                           → recursive descent (find at any depth)
```

### Path Expressions

| Syntax            | Description                  | Example                          |
| ----------------- | ---------------------------- | -------------------------------- |
| `key`             | Direct property access       | `user.name`                      |
| `0`, `1`          | Numeric array index          | `items.0.title`                  |
| `*`               | Wildcard — all items         | `users.*.email`                  |
| `[?field>value]`  | Filter with comparison       | `items[?price>100]`              |
| `[?f==v && f2>v]` | Filter with logical operator | `items[?active==true && age>18]` |
| `..key`           | Recursive descent            | `..name` (any depth)             |

## API Reference

### Reading

```php
$accessor->get('key');                // value or null
$accessor->get('key', 'default');     // value or default
$accessor->getMany(['a', 'b']);       // ['a' => value, 'b' => value]
$accessor->all();                     // all data as array
```

### Writing (Immutable)

```php
$new = $accessor->set('key', 'value');  // returns new instance
$new = $accessor->remove('key');        // returns new instance
```

### Merging (Immutable)

```php
$merged = $accessor->merge('settings', ['theme' => 'dark', 'lang' => 'en']);  // deep merge at path
$rootMerge = $accessor->merge('', ['extra' => true]);  // merge at root
```

### Transforming

```php
$accessor->toArray();
$accessor->toJson();
$accessor->toXml();
$accessor->toYaml();    // YAML string (works out of the box)
$accessor->toToml();    // TOML string (works out of the box)
$accessor->toObject();
$accessor->transform('json');  // by format name
```

## Requirements

- PHP 8.2+
- `ext-json`
- `ext-simplexml` / `ext-libxml`

## Security

Built-in security features with configurable policies:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\SecurityGuard;

// Prototype pollution guard (enabled by default)
// SecurityGuard blocks __proto__, constructor, prototype keys

// Payload & key limits
SafeAccess::fromJson($bigPayload); // throws SecurityError if payload exceeds limits

// Data masking
$masked = $accessor->masked(['password', 'secret', 'api_*']);
```

Security features: prototype pollution guard, payload/key/depth limits, XML hardening (DOCTYPE/ENTITY blocked, LIBXML_NONET), YAML safe schema, CSV injection protection, path traversal prevention, SSRF protection, data masking.

## Laravel Integration

Auto-discovered in Laravel 11+ via `extra.laravel` in composer.json. For Laravel 10 and below, add to `config/app.php`:

```php
// config/app.php
'providers' => [
    SafeAccessInline\Integrations\LaravelServiceProvider::class,
],
'aliases' => [
    'SafeAccess' => SafeAccessInline\Integrations\LaravelFacade::class,
],
```

Usage:

```php
// Via Facade
SafeAccess::get('database.host');

// Via container
$accessor = app('safe-access');
$accessor->get('database.host');

// Via injection
public function __construct(
    private \SafeAccessInline\Core\AbstractAccessor $config
) {}
```

## Symfony Integration

Register as a Symfony bundle:

```php
// config/bundles.php
return [
    SafeAccessInline\Integrations\SafeAccessBundle::class => ['all' => true],
];
```

Or use static helpers directly:

```php
use SafeAccessInline\Integrations\SymfonyIntegration;

$accessor = SymfonyIntegration::fromParameterBag($container->getParameterBag());
$accessor->get('database_host');

$accessor = SymfonyIntegration::fromYamlFile(__DIR__ . '/../config/services.yaml');
```

## I/O Loading

Load data directly from the filesystem or a remote URL:

```php
use SafeAccessInline\SafeAccess;

// From file (format auto-detected from extension)
$accessor = SafeAccess::fromFile('/path/to/config.yaml');
$accessor->get('database.host');

// From URL (HTTPS only)
$accessor = SafeAccess::fromUrl('https://example.com/config.json');
$accessor->get('database.host');
```

File loads are protected against path-traversal attacks. URL loads enforce HTTPS and block private/cloud-metadata IPs.

## Layered Configuration

Merge multiple configuration sources with last-wins deep-merge semantics:

```php
use SafeAccessInline\SafeAccess;

// Merge two arrays
$merged = SafeAccess::layer(
    ['database' => ['host' => 'localhost', 'port' => 5432]],
    ['database' => ['port' => 5433, 'name' => 'mydb']]
);
$merged->get('database.port'); // 5433
$merged->get('database.host'); // 'localhost'

// Merge multiple config files (last file wins)
$config = SafeAccess::layerFiles([
    '/path/to/config/base.yaml',
    '/path/to/config/production.yaml',
]);
$config->get('database.host');
```

## NDJSON

NDJSON (Newline Delimited JSON) — each line is an independent JSON object:

```php
use SafeAccessInline\SafeAccess;

$raw = '{"id":1,"name":"Alice"}' . "\n" . '{"id":2,"name":"Bob"}';
$accessor = SafeAccess::fromNdjson($raw);
$accessor->get('0.name'); // "Alice"
$accessor->get('1.id');   // 2

// Serialize back to NDJSON
$accessor->toNdjson(); // '{"id":1,"name":"Alice"}' . "\n" . '{"id":2,"name":"Bob"}'
```

## File Watcher

Watch a config file for changes and reload automatically (polling-based):

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Core\AbstractAccessor;

$stop = SafeAccess::watchFile('/path/to/config.yaml', function (AbstractAccessor $accessor): void {
    echo 'Config reloaded: ' . $accessor->get('server.port');
});

// Stop watching
$stop();
```

## Audit Events

Subscribe to security and I/O audit events:

```php
use SafeAccessInline\SafeAccess;

SafeAccess::onAudit(function (array $event): void {
    echo $event['type'] . ': ' . ($event['detail'] ?? '');
});

// Event types: file.read, url.fetch, mask.apply, schema.validate, security.block
```

## Security Policy

Configure and enforce security boundaries with preset or custom policies:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\SecurityPolicy;

// Apply preset policies
$strict     = SafeAccess::withPolicy($data, SecurityPolicy::strict());
$permissive = SafeAccess::withPolicy($data, SecurityPolicy::permissive());

// Set a global policy for all instances
SafeAccess::setGlobalPolicy(SecurityPolicy::strict());
SafeAccess::clearGlobalPolicy();
```

`SecurityPolicy::strict()` — `maxDepth: 20`, `maxPayloadBytes: 1 MB`, `maxKeys: 1000`, CSV injection protection.  
`SecurityPolicy::permissive()` — `maxDepth: 1024`, `maxPayloadBytes: 100 MB`, `maxKeys: 100 000`.

## Documentation

Full documentation is available at [felipesauer.github.io/safe-access-inline](https://felipesauer.github.io/safe-access-inline):

- [Getting Started — PHP](https://felipesauer.github.io/safe-access-inline/php/getting-started/)
- [API Reference — PHP](https://felipesauer.github.io/safe-access-inline/php/api-reference/)
- [Architecture](https://felipesauer.github.io/safe-access-inline/architecture/)

## License

[MIT](LICENSE)
