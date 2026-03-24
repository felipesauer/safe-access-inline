---
outline: deep
---

# Primeiros Passos — PHP

## Índice

- [Requisitos](#requisitos)
- [Instalação](#instalacao)
- [Uso Básico](#uso-basico)
- [Sistema de Plugins](#sistema-de-plugins)

**Ver também:**

- [Consultas e Filtros](/pt-br/php/querying)
- [Formatos & Utilitários](/pt-br/php/formats)
- [Recursos Avançados](/pt-br/php/advanced)
- [Segurança](/pt-br/php/security)

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
$accessor->toXml();      // "<root><name>Ana</name><age>30</age></root>"
$accessor->toJson();     // '{"name":"Ana","age":30}'
$accessor->toYaml();     // "name: Ana\nage: 30\n"
$accessor->toToml();     // 'name = "Ana"\nage = 30\n'
```

---

## Cenários Reais

### 1. Carregar, ler e atualizar um arquivo de configuração JSON

```php
<?php
declare(strict_types=1);

use SafeAccessInline\SafeAccess;

// Carregar e ler
$raw = file_get_contents('./config/app.json');
$cfg = SafeAccess::fromJson($raw);

$host = $cfg->get('database.host', 'localhost');
$port = $cfg->get('database.port', 5432);
echo "Conectando em {$host}:{$port}";

// Aplicar patch e salvar de volta
$updated = $cfg
    ->set('database.port', 5433)
    ->set('app.version', '2.1.0');

file_put_contents('./config/app.json', $updated->toJson(true));
```

### 2. Parse de arquivo .env e construção de array de configuração tipado

```php
<?php
declare(strict_types=1);

use SafeAccessInline\SafeAccess;

$env = file_get_contents('.env');
$accessor = SafeAccess::fromEnv($env);

$config = [
    'apiUrl' => (string) $accessor->get('API_URL', 'http://localhost'),
    'port'   => (int)    $accessor->get('PORT',    '3000'),
    'debug'  => $accessor->get('DEBUG', 'false') === 'true',
];
```

### 3. Mesclar override de ambiente sobre configuração base YAML

```php
<?php
declare(strict_types=1);

use SafeAccessInline\SafeAccess;

$base     = SafeAccess::fromYaml(file_get_contents('./config/base.yaml'));
$override = SafeAccess::fromYaml(
    file_get_contents('./config/' . ($_ENV['APP_ENV'] ?? 'production') . '.yaml'),
);

// Deep-merge: chaves do override sobrescrevem, o restante é preservado
$config = $base->merge($override->all());

$config->get('database.host'); // valor final mesclado
$config->get('app.name');      // preservado da config base
```

---

## Sistema de Plugins

YAML e TOML funcionam sem configuração. O Sistema de Plugins permite registrar parsers e serializers customizados para formatos adicionais.

Consulte a página do [Sistema de Plugins](/pt-br/php/plugins) para documentação completa, plugins embutidos, exemplos customizados e utilitários de teste.
