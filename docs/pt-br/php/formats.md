---
outline: deep
---

# Formatos & Utilitários — PHP

## Índice

- [Trabalhando com Formatos](#trabalhando-com-formatos)
- [Métodos Utilitários](#métodos-utilitários)

## Trabalhando com Formatos

### Trabalhando com YAML

O suporte a YAML vem incluso. O parser prefere `ext-yaml` quando disponível, usando `symfony/yaml` como fallback. A serialização segue a mesma prioridade.

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

// Serializar de volta
$accessor->toYaml();             // "server:\n    host: localhost\n..."
```

::: tip Override via plugin
Registre um `SymfonyYamlParser` ou `SymfonyYamlSerializer` via `PluginRegistry` para forçar `symfony/yaml` mesmo quando `ext-yaml` está presente — útil em ambientes de teste onde se deseja saída consistente.
:::

### Trabalhando com TOML

O suporte a TOML é fornecido por `devium/toml`, instalado automaticamente como dependência.

```php
$toml = <<<TOML
title = "Meu App"

[database]
host = "localhost"
port = 5432
TOML;

$accessor = SafeAccess::fromToml($toml);
$accessor->get('title');             // "Meu App"
$accessor->get('database.host');     // "localhost"
$accessor->get('database.port');     // 5432

// Serializar de volta
$accessor->toToml();                 // 'title = "Meu App"\n\n[database]\n...'
```

::: tip Override via plugin
Registre um `DeviumTomlParser` ou `DeviumTomlSerializer` customizado via `PluginRegistry` se precisar substituir as opções de codificação.
:::

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

---

## Conversão entre Formatos

Leia em qualquer formato e serialize para outro em um pipeline fluente:

**YAML → JSON**

```php
$accessor = SafeAccess::fromYaml($yamlString);
$json = $accessor->toJson(true);
```

**JSON → TOML**

```php
$accessor = SafeAccess::fromJson($jsonString);
$toml = $accessor->toToml();
```

**TOML → YAML**

```php
$accessor = SafeAccess::fromToml($tomlString);
$yaml = $accessor->toYaml();
```

**JSON → XML**

```php
$accessor = SafeAccess::fromJson($jsonString);
$xml = $accessor->toXml('root');
```
