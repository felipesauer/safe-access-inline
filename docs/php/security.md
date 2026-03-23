---
outline: deep
---

# Security & Integrations — PHP

## Table of Contents

- [Security](#security)
- [Schema Validation](#schema-validation)
- [Audit Logging](#audit-logging)
- [Framework Integrations](#framework-integrations)

## Security

### SecurityPolicy

Combine all security settings into a single policy:

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 128,
    maxPayloadBytes: 1_048_576,  // 1 MB
    maxKeys: 5000,
    allowedDirs: ['/app/config'],
    url: ['allowedHosts' => ['api.example.com']],
    csvMode: 'strip',
    maskPatterns: ['password', '*_token'],
);

// Load with policy
$accessor = SafeAccess::withPolicy($jsonString, $policy);
$accessor = SafeAccess::fromFileWithPolicy('/app/config.json', $policy);
$accessor = SafeAccess::fromUrlWithPolicy('https://api.example.com/config.json', $policy);
```

#### Policy Presets

Two built-in presets are available:

- **`SecurityPolicy::strict()`** — restrictive limits suitable for untrusted input
- **`SecurityPolicy::permissive()`** — relaxed limits for trusted environments

```php
$accessor = SafeAccess::withPolicy($data, SecurityPolicy::strict());
```

#### Global Policy

Set a global policy that applies as the default for all operations:

```php
SecurityPolicy::setGlobal(SecurityPolicy::strict());
$current = SecurityPolicy::getGlobal(); // ?SecurityPolicy
SecurityPolicy::clearGlobal();

// Or via SafeAccess facade
SafeAccess::setGlobalPolicy(SecurityPolicy::strict());
SafeAccess::clearGlobalPolicy();
```

### Data masking

```php
$accessor = SafeAccess::fromArray([
    'user' => 'Ana',
    'password' => 's3cret',
    'api_key' => 'abc-123',
]);

$safe = $accessor->mask();
$safe->get('password');  // '[REDACTED]'
$safe->get('api_key');   // '[REDACTED]'
$safe->get('user');      // 'Ana'

// Custom patterns
$safe = $accessor->mask(['custom_secret', '*_token']);
```

### Readonly accessors

```php
$readonly = new \SafeAccessInline\Accessors\ArrayAccessor(['key' => 'value'], true);
$readonly->get('key');           // 'value' — reading works
$readonly->set('key', 'new');    // throws ReadonlyViolationException
```

---

## Schema Validation

```php
use SafeAccessInline\Core\Registries\SchemaRegistry;

// Register a default adapter (implement SchemaAdapterInterface)
SchemaRegistry::setDefaultAdapter($myAdapter);

// Validate — throws SchemaValidationException on failure
$accessor->validate($schema);

// Fluent chaining
$name = $accessor->validate($schema)->get('name');

// With explicit adapter
$accessor->validate($schema, new MySchemaAdapter());
```

---

## Audit Logging

Track security-relevant operations:

```php
$unsub = SafeAccess::onAudit(function (array $event) {
    // $event = ['type' => 'file.read', 'timestamp' => ..., 'detail' => [...]]
    logger()->info($event['type'], $event['detail']);
});

// Events: file.read, file.watch, url.fetch, security.violation,
//         security.deprecation, data.mask, data.freeze, schema.validate

// Clean up
$unsub();
SafeAccess::clearAuditListeners();
```

---

## Framework Integrations

### Laravel

```php
use SafeAccessInline\Integrations\LaravelServiceProvider;

// In a service provider's register() method:
LaravelServiceProvider::register($this->app);

// Now resolve from container:
$accessor = app('safe-access');
$accessor = app(\SafeAccessInline\Core\AbstractAccessor::class);

// Or wrap config directly:
$config = LaravelServiceProvider::fromConfig(config());
$config->get('app.name');                        // type-safe access
$config->get('database.connections.*.driver');    // wildcard

// Specific config key:
$db = LaravelServiceProvider::fromConfigKey(config(), 'database');
$db->get('default'); // 'mysql'
```

### Symfony

```php
use SafeAccessInline\Integrations\SymfonyIntegration;

// From ParameterBag
$accessor = SymfonyIntegration::fromParameterBag($container->getParameterBag());
$accessor->get('kernel.environment');  // 'prod'

// From config array
$accessor = SymfonyIntegration::fromConfig($processedConfig);

// From YAML file (with path protection)
$accessor = SymfonyIntegration::fromYamlFile('/app/config/services.yaml', ['/app/config']);
```
