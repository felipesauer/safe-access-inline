---
title: Primeiros Passos — PHP
nav_exclude: true
permalink: /pt-br/php/getting-started/
lang: pt-br
---

# Primeiros Passos — PHP

## Índice

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Uso Básico](#uso-básico)
- [Sistema de Plugins](#sistema-de-plugins)
- [Trabalhando com Formatos](#trabalhando-com-formatos)
- [Accessors Customizados](#accessors-customizados)
- [Métodos Utilitários](#métodos-utilitários)

## Requisitos

- PHP 8.2 ou superior
- `ext-json` (embutido)
- `ext-simplexml` (embutido, para suporte XML)

Suporte a YAML e TOML está incluído sem configuração. YAML prefere `ext-yaml` quando disponível, caindo para `symfony/yaml`. TOML usa `devium/toml`. Ambos são instalados como dependências.

## Instalação

```bash
composer require safe-access-inline/safe-access-inline
```

## Uso Básico

### Acessando dados com notação de ponto

```php
use SafeAccessInline\SafeAccess;

$json = '{"user": {"profile": {"name": "Ana", "age": 30}}}';
$accessor = SafeAccess::fromJson($json);

// Acesso simples
$accessor->get('user.profile.name');     // "Ana"
$accessor->get('user.profile.age');      // 30

// Acesso seguro — nunca lança, retorna valor padrão
$accessor->get('user.email', 'N/A');     // "N/A"
$accessor->get('nonexistent.path');      // null (padrão)

// Verificar existência
$accessor->has('user.profile.name');     // true
$accessor->has('user.email');            // false
```

### Trabalhando com arrays

```php
$data = [
    'users' => [
        ['name' => 'Ana', 'role' => 'admin'],
        ['name' => 'Bob', 'role' => 'user'],
        ['name' => 'Carol', 'role' => 'user'],
    ],
];

$accessor = SafeAccess::fromArray($data);

// Acesso por índice
$accessor->get('users.0.name');          // "Ana"
$accessor->get('users.2.role');          // "user"

// Wildcard — obter todos os valores correspondentes
$accessor->get('users.*.name');          // ["Ana", "Bob", "Carol"]
$accessor->get('users.*.role');          // ["admin", "user", "user"]
```

### Modificações imutáveis

```php
$accessor = SafeAccess::fromJson('{"name": "Ana", "age": 30}');

// set() retorna uma NOVA instância
$modified = $accessor->set('email', 'ana@example.com');
$modified->get('email');                 // "ana@example.com"
$accessor->get('email');                 // null (original inalterado)

// remove() também retorna uma nova instância
$cleaned = $accessor->remove('age');
$cleaned->has('age');                    // false
$accessor->has('age');                   // true (original inalterado)
```

### Auto-detecção de formato

```php
$array = SafeAccess::detect(['key' => 'value']);    // ArrayAccessor
$json  = SafeAccess::detect('{"key": "value"}');    // JsonAccessor
$obj   = SafeAccess::detect((object)['a' => 1]);    // ObjectAccessor
```

### Transformação cross-format

```php
$accessor = SafeAccess::fromJson('{"name": "Ana", "age": 30}');

$accessor->toArray();    // ['name' => 'Ana', 'age' => 30]
$accessor->toObject();   // stdClass { name: "Ana", age: 30 }
$accessor->toXml();      // "<root><name>Ana</name><age>30</age></root>"
$accessor->toJson();     // '{"name":"Ana","age":30}'
$accessor->toYaml();     // "name: Ana\nage: 30\n"
$accessor->toToml();     // 'name = "Ana"\nage = 30\n'
```

## Sistema de Plugins

YAML e TOML funcionam sem configuração (`ext-yaml` ou `symfony/yaml` para YAML, `devium/toml` para TOML). O Sistema de Plugins permite **substituir** os parsers e serializers padrão com implementações customizadas.

### Substituindo Padrões

```php
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Plugins\DeviumTomlParser;

// Substituir parser YAML com opções customizadas
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

// Substituir parser TOML
PluginRegistry::registerParser('toml', new DeviumTomlParser());
```

> Plugins são **overrides opcionais**. YAML e TOML funcionam sem nenhum registro de plugin.

### Usando YAML (zero configuração)

```php
// Funciona sem configuração — não é necessário registrar plugins:
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
$accessor->get('name');           // "Ana"
$accessor->get('age');            // 30

$accessor->toYaml();              // "name: Ana\nage: 30\n"
```

### Usando TOML (zero configuração)

```php
// Funciona sem configuração — não é necessário registrar plugins:
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

### Serialização Genérica com `transform()`

O método `transform()` serializa dados para qualquer formato que tenha um plugin serializer registrado:

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->transform('yaml');     // "name: Ana\n"
```

### Plugins Incluídos

| Plugin                  | Formato | Tipo       | Requer                    |
| ----------------------- | ------- | ---------- | ------------------------- |
| `SymfonyYamlParser`     | yaml    | Parser     | `symfony/yaml`            |
| `SymfonyYamlSerializer` | yaml    | Serializer | `symfony/yaml`            |
| `NativeYamlParser`      | yaml    | Parser     | `ext-yaml` (extensão PHP) |
| `NativeYamlSerializer`  | yaml    | Serializer | `ext-yaml` (extensão PHP) |
| `DeviumTomlParser`      | toml    | Parser     | `devium/toml`             |
| `DeviumTomlSerializer`  | toml    | Serializer | `devium/toml`             |

### Criando Plugins Customizados

Você pode criar seus próprios plugins implementando as interfaces de plugin:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;

class MyYamlParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        // Sua lógica de parsing
        return yaml_parse($raw);
    }
}

class MyYamlSerializer implements SerializerPluginInterface
{
    public function serialize(array $data): string
    {
        // Sua lógica de serialização
        return yaml_emit($data);
    }
}

// Registrar
PluginRegistry::registerParser('yaml', new MyYamlParser());
PluginRegistry::registerSerializer('yaml', new MyYamlSerializer());
```

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
$accessor->type('age');      // "integer"
$accessor->type('tags');     // "array"
$accessor->type('missing');  // null

$accessor->count();          // 3 (chaves raiz)
$accessor->count('tags');    // 2

$accessor->keys();           // ['name', 'age', 'tags']
$accessor->keys('tags');     // [0, 1]

$accessor->all();            // array completo
```
