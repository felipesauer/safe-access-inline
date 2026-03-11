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

### Optional dependencies

| Format | Package |
|--------|---------|
| YAML | `symfony/yaml` (^7.0) **or** `ext-yaml` |
| TOML | `devium/toml` |

```bash
composer require symfony/yaml devium/toml
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

| Method | Format | Requirements |
|--------|--------|-------------|
| `SafeAccess::fromArray()` | PHP Array | — |
| `SafeAccess::fromObject()` | stdClass | — |
| `SafeAccess::fromJson()` | JSON string | `ext-json` |
| `SafeAccess::fromXml()` | XML string | `ext-simplexml` |
| `SafeAccess::fromYaml()` | YAML string | Plugin required |
| `SafeAccess::fromToml()` | TOML string | Plugin required |
| `SafeAccess::fromIni()` | INI string | — |
| `SafeAccess::fromCsv()` | CSV string | — |
| `SafeAccess::fromEnv()` | ENV string | — |
| `SafeAccess::from()` | Auto-detect | Varies |

## Plugin System

YAML and TOML formats require parser plugins. The library ships with four plugins:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Plugins\DeviumTomlParser;
use SafeAccessInline\Plugins\DeviumTomlSerializer;

// Register parsers (for reading)
SafeAccess::registerPlugin('yaml', 'parser', new SymfonyYamlParser());
SafeAccess::registerPlugin('toml', 'parser', new DeviumTomlParser());

// Register serializers (for transform output)
SafeAccess::registerPlugin('yaml', 'serializer', new SymfonyYamlSerializer());
SafeAccess::registerPlugin('toml', 'serializer', new DeviumTomlSerializer());

// Now YAML and TOML work
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

Access nested values using dot-separated keys:

```
user.name           → $data['user']['name']
user.roles.0        → $data['user']['roles'][0]
servers.0.host      → $data['servers'][0]['host']
```

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

### Transforming

```php
$accessor->toArray();
$accessor->toJson();
$accessor->toXml();
$accessor->toYaml();    // requires serializer plugin
$accessor->toObject();
$accessor->transform('json');  // by format name
```

## Requirements

- PHP 8.2+
- `ext-json`
- `ext-simplexml` / `ext-libxml`

## Documentation

Full documentation is available in the [mono-repo](https://github.com/felipesauer/safe-access-inline/tree/main/docs/php).

## License

[MIT](LICENSE)
