---
outline: deep
---

# Consultas & Filtros — PHP

## Índice

- [Filtragem e Descida Recursiva](#filtragem-e-descida-recursiva)
- [Deep Merge](#deep-merge)

## Filtragem e Descida Recursiva

### Expressões de filtro

Use `[?campo operador valor]` para filtrar arrays:

```php
$accessor = SafeAccess::fromObject([
    'products' => [
        ['name' => 'Laptop', 'price' => 1200, 'category' => 'electronics'],
        ['name' => 'Phone',  'price' => 800,  'category' => 'electronics'],
        ['name' => 'Book',   'price' => 25,   'category' => 'education'],
    ],
]);

// Filtrar por igualdade
$accessor->get("products[?category=='electronics'].name");
// ['Laptop', 'Phone']

// Filtrar por comparação numérica
$accessor->get('products[?price>500].name');
// ['Laptop', 'Phone']

// Combinar com AND / OR
$accessor->get("products[?price>100 && category=='electronics'].name");
// ['Laptop', 'Phone']
```

### Descida recursiva

Use `..key` para coletar todos os valores com essa chave em qualquer profundidade:

```php
$accessor = SafeAccess::fromArray([
    'name' => 'Corp',
    'departments' => [
        'engineering' => [
            'name' => 'Engineering',
            'teams' => [
                'frontend' => ['name' => 'Frontend', 'members' => 5],
                'backend'  => ['name' => 'Backend',  'members' => 8],
            ],
        ],
        'marketing' => ['name' => 'Marketing', 'members' => 3],
    ],
]);

$accessor->get('..name');
// ['Corp', 'Engineering', 'Frontend', 'Backend', 'Marketing']

$accessor->get('..members');
// [5, 8, 3]
```

### Combinando filtros com descida

```php
$accessor = SafeAccess::fromArray([
    'region1' => [
        'stores' => [
            ['name' => 'Store A', 'revenue' => 50000, 'active' => true],
            ['name' => 'Store B', 'revenue' => 20000, 'active' => false],
        ],
    ],
    'region2' => [
        'stores' => [
            ['name' => 'Store C', 'revenue' => 80000, 'active' => true],
        ],
    ],
]);

$accessor->get("..stores[?active==true].name");
// ['Store A', 'Store C']
```

---

## Deep Merge

```php
$accessor = SafeAccess::fromArray([
    'user' => ['name' => 'Ana', 'settings' => ['theme' => 'light', 'lang' => 'en']],
]);

// Merge em um caminho específico
$updated = $accessor->merge('user.settings', ['theme' => 'dark', 'notifications' => true]);
$updated->get('user.settings.theme');         // 'dark'
$updated->get('user.settings.lang');          // 'en' (preservado)
$updated->get('user.settings.notifications'); // true

// Merge na raiz
$withMeta = $accessor->merge(['version' => '2.0', 'debug' => false]);
$withMeta->get('version');   // '2.0'
$withMeta->get('user.name'); // 'Ana' (preservado)
```

---

## Combinando Expressões de Path

Encadeie slice, filtro e wildcard em um único path para consultas poderosas:

```php
$accessor = SafeAccess::fromArray([
    'users' => [
        ['name' => 'Ana',   'role' => 'admin', 'active' => true],
        ['name' => 'Bob',   'role' => 'user',  'active' => false],
        ['name' => 'Carol', 'role' => 'user',  'active' => true],
        ['name' => 'Dave',  'role' => 'admin', 'active' => true],
    ],
]);

// Slice + wildcard: usuários 1 a 3, extrair nomes
$accessor->get('users.[1:3].*.name'); // ['Bob', 'Carol', 'Dave']

// Filtro + wildcard: usuários ativos, extrair roles
$accessor->get('users.[?(@.active==true)].*.role'); // ['admin', 'user']

// Filtro + campo específico: nome dos admins
$accessor->get('users.[?(@.role==\'admin\')].*.name'); // ['Ana', 'Dave']
```

## Paths Dinâmicos com `getTemplate()`

Construa paths em tempo de execução com placeholders `{variavel}`:

```php
$template = 'users.{id}.profile.{field}';

$name = $accessor->getTemplate($template, ['id' => '0', 'field' => 'name']);
// equivalente a: $accessor->get('users.0.profile.name')

// Múltiplas substituições em loop
$fields = ['name', 'email', 'role'];
$profile = [];

foreach ($fields as $field) {
    $profile[$field] = $accessor->getTemplate(
        'users.{id}.{field}',
        ['id' => '0', 'field' => $field],
    );
}
// $profile = ['name' => 'Ana', 'email' => 'ana@example.com', 'role' => 'admin']
```

## Leituras em Lote com `getMany()`

Leia vários paths de uma só vez, recebendo um array associativo de resultados:

```php
$config = SafeAccess::fromArray([
    'database' => ['host' => 'localhost', 'port' => 5432, 'name' => 'mydb'],
    'cache'    => ['host' => 'redis',     'port' => 6379],
    'app'      => ['debug' => true,       'version' => '1.0'],
]);

$settings = $config->getMany([
    'database.host' => 'localhost',
    'database.port' => 5432,
    'cache.host'    => 'redis',
    'app.debug'     => false,
    'app.version'   => '0.0',
]);

// $settings = [
//   'database.host' => 'localhost',
//   'database.port' => 5432,
//   'cache.host'    => 'redis',
//   'app.debug'     => true,
//   'app.version'   => '1.0',
// ]
```
