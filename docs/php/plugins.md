---
outline: deep
---

# Plugin System — PHP

YAML and TOML work out of the box (`ext-yaml` or `symfony/yaml` for YAML, `devium/toml` for TOML). The Plugin System lets you **override** the default parsers and serializers with custom implementations.

---

## Overriding Defaults

```php
use SafeAccessInline\Core\Registries\PluginRegistry;
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

---

## Using YAML (Zero Config)

```php
// Works out of the box — no plugin registration needed:
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
$accessor->get('name');           // "Ana"
$accessor->get('age');            // 30

$accessor->toYaml();              // "name: Ana\nage: 30\n"
```

---

## Using TOML (Zero Config)

```php
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

---

## Generic Serialization with `transform()`

The `transform()` method serializes data to any format that has a registered serializer plugin:

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->transform('yaml');     // "name: Ana\n"
```

---

## Shipped Plugins

| Plugin                  | Format | Type       | Requires                   |
| ----------------------- | ------ | ---------- | -------------------------- |
| `SymfonyYamlParser`     | yaml   | Parser     | `symfony/yaml`             |
| `SymfonyYamlSerializer` | yaml   | Serializer | `symfony/yaml`             |
| `NativeYamlParser`      | yaml   | Parser     | `ext-yaml` (PHP extension) |
| `NativeYamlSerializer`  | yaml   | Serializer | `ext-yaml` (PHP extension) |
| `DeviumTomlParser`      | toml   | Parser     | `devium/toml`              |
| `DeviumTomlSerializer`  | toml   | Serializer | `devium/toml`              |
| `SimpleXmlSerializer`   | xml    | Serializer | `ext-simplexml` (bundled)  |

---

## Creating Custom Plugins

Implement `ParserPluginInterface` or `SerializerPluginInterface`:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;

class MyYamlParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        return yaml_parse($raw);
    }
}

class MyYamlSerializer implements SerializerPluginInterface
{
    public function serialize(array $data): string
    {
        return yaml_emit($data);
    }
}

PluginRegistry::registerParser('yaml', new MyYamlParser());
PluginRegistry::registerSerializer('yaml', new MyYamlSerializer());
```

---

## Example: Laravel Config Plugin

A plugin that wraps Laravel's `config()` helper:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;

class LaravelConfigParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        // $raw is a config group name, e.g. "database"
        return config($raw, []);
    }
}

PluginRegistry::registerParser('laravel-config', new LaravelConfigParser());

// Register a custom accessor
SafeAccess::extend('laravel-config', fn ($data) => /* ... */);
```

---

## Example: Symfony ParameterBag Plugin

A plugin for Symfony's `ParameterBag`:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;

class ParameterBagParser implements ParserPluginInterface
{
    public function __construct(
        private ParameterBagInterface $parameterBag,
    ) {}

    public function parse(string $raw): array
    {
        return $this->parameterBag->all();
    }
}

PluginRegistry::registerParser('parameters', new ParameterBagParser($container->getParameterBag()));
```

---

## Resetting Plugins (Testing)

In test suites, call `reset()` to clear all registered plugins between tests:

```php
use SafeAccessInline\Core\Registries\PluginRegistry;

afterEach(function () {
    PluginRegistry::reset();
});
```
