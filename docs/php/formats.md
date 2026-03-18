---
outline: deep
---

# Formats & Utility Methods — PHP

## Table of Contents

- [Working with Formats](#working-with-formats)
- [Utility Methods](#utility-methods)

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

#### CSV injection protection

To guard against CSV injection attacks (cells starting with `=`, `+`, `-`, `@`), pass a `csvMode` to `SecurityPolicy`. Accepted values:

- `'none'` _(default)_ — no sanitization
- `'prefix'` — prepends a tab to dangerous cells
- `'strip'` — removes the dangerous leading character
- `'error'` — throws a `SecurityError` on detection

```php
use SafeAccessInline\Security\SecurityPolicy;

$policy = new SecurityPolicy(csvMode: 'strip');
$accessor = SafeAccess::withPolicy($csvString, $policy);
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
$accessor->type('age');      // "number"
$accessor->type('tags');     // "array"
$accessor->type('missing');  // null

$accessor->count();          // 3 (root keys)
$accessor->count('tags');    // 2

$accessor->keys();           // ['name', 'age', 'tags']
$accessor->keys('tags');     // [0, 1]

$accessor->all();            // full array
```
