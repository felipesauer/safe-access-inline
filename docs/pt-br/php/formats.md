---
outline: deep
---

# Formatos & Utilitários — PHP

## Índice

- [Trabalhando com Formatos](#trabalhando-com-formatos)
- [Métodos Utilitários](#métodos-utilitários)

## Trabalhando com Formatos

### Trabalhando com XML

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

### Trabalhando com INI

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

### Trabalhando com ENV

```php
$env = <<<ENV
APP_NAME=MyApp
APP_KEY="secret-key"
DEBUG=true
# Este é um comentário
DB_HOST=localhost
ENV;

$accessor = SafeAccess::fromEnv($env);
$accessor->get('APP_NAME');              // "MyApp"
$accessor->get('APP_KEY');               // "secret-key"
$accessor->get('DB_HOST');               // "localhost"
```

### Trabalhando com CSV

```php
$csv = "name,age,city\nAna,30,Porto Alegre\nBob,25,São Paulo";

$accessor = SafeAccess::fromCsv($csv);
$accessor->get('0.name');                // "Ana"
$accessor->get('1.city');                // "São Paulo"
$accessor->get('*.name');                // ["Ana", "Bob"]
```

#### Proteção contra CSV injection

Para proteger contra ataques de CSV injection (células que começam com `=`, `+`, `-`, `@`), passe um `csvMode` para `SecurityPolicy`. Valores aceitos:

- `'none'` _(padrão)_ — sem sanitização
- `'prefix'` — adiciona uma tabulação antes de células perigosas
- `'strip'` — remove o caractere inicial perigoso
- `'error'` — lança `SecurityError` ao detectar

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(csvMode: 'strip');
$accessor = SafeAccess::withPolicy($csvString, $policy);
```

### Accessors customizados

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
        // Sua lógica de parsing customizada
        return ['parsed' => $raw];
    }
}

// Registrar
SafeAccess::extend('myformat', MyFormatAccessor::class);

// Usar
$accessor = SafeAccess::custom('myformat', $data);
$accessor->get('parsed');
```

## Métodos Utilitários

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

$accessor->count();          // 3 (chaves raiz)
$accessor->count('tags');    // 2

$accessor->keys();           // ['name', 'age', 'tags']
$accessor->keys('tags');     // [0, 1]

$accessor->all();            // array completo
```
