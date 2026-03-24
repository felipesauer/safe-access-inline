---
outline: deep
---

# Querying & Filtering — PHP

## Table of Contents

- [Filtering and Recursive Descent](#filtering-and-recursive-descent)
- [Deep Merge](#deep-merge)

## Filtering and Recursive Descent

### Filter expressions

Use `[?field operator value]` to filter arrays:

```php
$accessor = SafeAccess::fromObject([
    'products' => [
        ['name' => 'Laptop', 'price' => 1200, 'category' => 'electronics'],
        ['name' => 'Phone',  'price' => 800,  'category' => 'electronics'],
        ['name' => 'Book',   'price' => 25,   'category' => 'education'],
    ],
]);

// Filter by equality
$accessor->get("products[?category=='electronics'].name");
// ['Laptop', 'Phone']

// Filter by numeric comparison
$accessor->get('products[?price>500].name');
// ['Laptop', 'Phone']

// Combine with AND / OR
$accessor->get("products[?price>100 && category=='electronics'].name");
// ['Laptop', 'Phone']
```

### Recursive descent

Use `..key` to collect all values with that key at any depth:

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

### Combining filters with descent

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

// Merge at a specific path
$updated = $accessor->merge('user.settings', ['theme' => 'dark', 'notifications' => true]);
$updated->get('user.settings.theme');         // 'dark'
$updated->get('user.settings.lang');          // 'en' (preserved)
$updated->get('user.settings.notifications'); // true

// Merge at root
$withMeta = $accessor->merge(['version' => '2.0', 'debug' => false]);
$withMeta->get('version');   // '2.0'
$withMeta->get('user.name'); // 'Ana' (preserved)
```

---

## Combining Path Expressions

Segments can be freely combined in a single path. The query is evaluated left-to-right:

```php
$accessor = SafeAccess::fromArray([
    'catalog' => [
        ['id' => 1, 'name' => 'Laptop', 'tags' => ['electronics', 'portable'], 'price' => 1200],
        ['id' => 2, 'name' => 'Phone',  'tags' => ['electronics', 'mobile'],   'price' => 800],
        ['id' => 3, 'name' => 'Desk',   'tags' => ['furniture'],               'price' => 300],
        ['id' => 4, 'name' => 'Tablet', 'tags' => ['electronics', 'portable'], 'price' => 600],
    ],
]);

// Filter, then pick a field
$accessor->get('catalog[?price>500].name');
// ['Laptop', 'Phone', 'Tablet']

// Slice, then wildcard
$accessor->get('catalog[0:2].*.name');
// ['Laptop', 'Phone'] (first 2 items, all names)

// Combined AND filter + field pick
$accessor->get('catalog[?price>500 && price<1000].name');
// ['Phone', 'Tablet']

// Recursive descent + filter
$accessor->get("catalog[?price>1000].tags.0");
// ['electronics'] (first tag of expensive items)
```

---

## Dynamic Paths with `getTemplate()`

`getTemplate()` substitutes `{key}` placeholders in a path template before resolving it — useful when the path contains a value only known at runtime:

```php
$users = SafeAccess::fromArray([
    'users' => [
        ['name' => 'Ana', 'role' => 'admin'],
        ['name' => 'Bob', 'role' => 'user'],
    ],
]);

// Resolve path with a dynamic index
$users->getTemplate('users.{index}.name', ['index' => 0]); // 'Ana'
$users->getTemplate('users.{index}.name', ['index' => 1]); // 'Bob'

// Multiple substitutions
$config = SafeAccess::fromArray([
    'services' => [
        'auth' => ['host' => 'auth.example.com', 'port' => 443],
        'api'  => ['host' => 'api.example.com',  'port' => 8080],
    ],
]);

$config->getTemplate('services.{service}.{field}', [
    'service' => 'auth',
    'field'   => 'host',
], 'unknown'); // 'auth.example.com'

$config->getTemplate('services.{service}.{field}', [
    'service' => 'db',
    'field'   => 'host',
], 'unknown'); // 'unknown' (path not found, returns default)
```

---

## Batch Reads with `getMany()`

`getMany()` reads multiple paths in a single call, returning an associative array of path → value. Missing paths fall back to the provided default:

```php
$accessor = SafeAccess::fromArray([
    'user'     => ['name' => 'Ana', 'email' => 'ana@example.com', 'role' => 'admin'],
    'settings' => ['theme' => 'dark'],
]);

$values = $accessor->getMany([
    'user.name'      => 'Unknown',
    'user.email'     => 'N/A',
    'user.phone'     => 'N/A',    // path does not exist — uses default
    'settings.theme' => 'light',
]);

// [
//   'user.name'      => 'Ana',
//   'user.email'     => 'ana@example.com',
//   'user.phone'     => 'N/A',
//   'settings.theme' => 'dark',
// ]
```
