---
outline: deep
---

# Security — PHP

## Table of Contents

- [Security — PHP](#security--php)
    - [Table of Contents](#table-of-contents)
    - [SecurityPolicy](#securitypolicy)
        - [Policy field reference](#policy-field-reference)
        - [When a policy violation is detected](#when-a-policy-violation-is-detected)
    - [Global Policy](#global-policy)
    - [Readonly Accessors](#readonly-accessors)
    - [Deep Freeze \& Prototype Pollution](#deep-freeze--prototype-pollution)

---

## SecurityPolicy

A `SecurityPolicy` object applies a set of constraints to any parse or load operation. All constructor parameters are optional:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 128,
    maxPayloadBytes: 1_048_576, // 1 MB
    maxKeys: 5_000,
    allowedDirs: ['/app/config'],
);

// Apply to a string payload
$accessor = SafeAccess::withPolicy($jsonString, $policy);
```

### Policy field reference

| Field             | Type       | Default      | Protects against                                      |
| ----------------- | ---------- | ------------ | ----------------------------------------------------- |
| `maxDepth`        | `int`      | `128`        | Deeply nested objects that trigger stack overflows    |
| `maxPayloadBytes` | `int`      | `10_485_760` | Memory exhaustion from oversized payloads             |
| `maxKeys`         | `int`      | `10_000`     | Objects with millions of keys consuming excessive RAM |
| `allowedDirs`     | `string[]` | `[]`         | Path-traversal attacks in file-loading operations     |

### When a policy violation is detected

Violations throw a `SecurityException`:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;
use SafeAccessInline\Exceptions\SecurityException;

$policy = new SecurityPolicy(maxPayloadBytes: 128); // tiny limit for demo

$bigJson = json_encode(['data' => str_repeat('x', 1000)]);

try {
    SafeAccess::withPolicy($bigJson, $policy);
} catch (SecurityException $e) {
    echo 'Security constraint violated: ' . $e->getMessage();
    // "Payload exceeds maximum allowed size"
}
```

---

## Global Policy

Set a default policy that applies automatically to every operation without passing it explicitly:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;

$appPolicy = new SecurityPolicy(
    maxDepth: 64,
    maxPayloadBytes: 2_097_152, // 2 MB
);

// Install globally
SecurityPolicy::setGlobal($appPolicy);
// or: SafeAccess::setGlobalPolicy($appPolicy);

// These now respect the global policy automatically
$a = SafeAccess::fromJson($largeJson);

// Inspect or remove the global policy
$current = SecurityPolicy::getGlobal(); // ?SecurityPolicy
SecurityPolicy::clearGlobal();
// or: SafeAccess::clearGlobalPolicy();
```

---

## Readonly Accessors

Pass `true` as the second constructor argument to any accessor to prevent all mutations. Any call to `set()`, `remove()`, `merge()`, or `push()` throws a `ReadonlyViolationException`:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Exceptions\ReadonlyViolationException;

$ro = SafeAccess::fromObject(['key' => 'value'], readonly: true);

echo $ro->get('key'); // 'value' — reads always work

try {
    $ro->set('key', 'new');
} catch (ReadonlyViolationException $e) {
    echo 'Cannot mutate a readonly accessor';
}
```

You can also freeze an existing accessor at runtime:

```php
$accessor = SafeAccess::fromJson('{"config": {"debug": false}}');
$frozen = $accessor->freeze();

$frozen->get('config.debug'); // false
$frozen->set('config.debug', true); // throws ReadonlyViolationException
$accessor->set('config.debug', true); // still works — original is not frozen
```

---

## Deep Freeze & Prototype Pollution

PHP object mutation works differently from JavaScript, but `deepFreeze` is exposed as a utility for completeness. The main protection in PHP comes through the **readonly accessor** (see above) and input validation via `SecurityPolicy`.

> For XML XXE prevention (DOCTYPE/ENTITY blocking), the library applies it automatically on every `fromXml()` call — no configuration needed.
