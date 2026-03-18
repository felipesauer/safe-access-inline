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
