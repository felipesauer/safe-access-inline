---
outline: deep
---

# API — Operations & I/O — PHP

## Table of Contents

- [I/O & File Loading](#io--file-loading)
- [Layered Configuration](#layered-configuration)
- [File Watching](#file-watching)
- [Audit Logging](#audit-logging)
- [Security](#security)
- [Schema Validation](#schema-validation)
- [Framework Integrations](#framework-integrations)

## I/O & File Loading

**Namespace:** `SafeAccessInline\Core\IoLoader`

#### `IoLoader::readFile(string $filePath, array $allowedDirs = []): string`

Reads a file with path-traversal protection. Emits `file.read` audit event.

#### `IoLoader::fetchUrl(string $url, array $options = []): string`

Fetches a URL with SSRF protection (blocks private IPs, cloud metadata endpoints, enforces HTTPS).

#### `IoLoader::assertSafeUrl(string $url, array $options = []): void`

Validates a URL is safe without fetching it.

#### `IoLoader::assertPathWithinAllowedDirs(string $filePath, array $allowedDirs = []): void`

Validates a file path is within allowed directories.

#### `IoLoader::isPrivateIp(string $ip): bool`

Checks if an IP address is in a private range (RFC 1918, link-local, loopback, cloud metadata).

#### `IoLoader::resolveFormatFromExtension(string $filePath): ?AccessorFormat`

Derives the `AccessorFormat` enum case from a file path's extension (e.g. `config.yaml` → `AccessorFormat::Yaml`). Returns `null` when the extension is unrecognized.

```php
use SafeAccessInline\Core\IoLoader;

$format = IoLoader::resolveFormatFromExtension('/app/config.yaml'); // AccessorFormat::Yaml
$format = IoLoader::resolveFormatFromExtension('/app/data.ndjson');  // AccessorFormat::Ndjson
$format = IoLoader::resolveFormatFromExtension('/app/file.txt');     // null
```

---

## Layered Configuration

#### `SafeAccess::layer(array $sources): AbstractAccessor`

Deep-merges multiple accessors into one (last-wins). Returns an `ObjectAccessor`.

```php
$base     = SafeAccess::fromFile('/app/config/defaults.json');
$override = SafeAccess::fromFile('/app/config/local.json');
$merged   = SafeAccess::layer([$base, $override]);
```

#### `SafeAccess::layerFiles(array $paths, array $allowedDirs = []): AbstractAccessor`

Loads multiple files and deep-merges them. Convenience wrapper around `fromFile()` + `layer()`.

```php
$config = SafeAccess::layerFiles([
    '/app/config/defaults.yaml',
    '/app/config/production.yaml',
], ['/app/config']);
```

---

## File Watching

#### `SafeAccess::watchFile(string $filePath, callable $onChange, ?string $format = null, array $allowedDirs = []): callable`

Watches a file for changes using polling. Calls `$onChange(AbstractAccessor)` when the file is modified. Returns a stop function.

```php
$stop = SafeAccess::watchFile('/app/config.json', function ($accessor) {
    echo "Config updated!\n";
});

// Later: stop watching
$stop();
```

---

## Audit Logging

#### `SafeAccess::onAudit(callable $listener): callable`

Subscribes to audit events. Returns an unsubscribe function.

Event types: `file.read`, `file.watch`, `url.fetch`, `security.violation`, `security.deprecation`, `data.mask`, `data.freeze`, `schema.validate`.

```php
$unsub = SafeAccess::onAudit(function (array $event) {
    // $event = ['type' => 'file.read', 'timestamp' => 1234567890.123, 'detail' => [...]]
    log($event['type'], $event['detail']);
});

// Later: unsubscribe
$unsub();
```

#### `SafeAccess::clearAuditListeners(): void`

Removes all registered audit listeners.

---

## Security

### SecurityPolicy

**Namespace:** `SafeAccessInline\Security\Guards\SecurityPolicy`

Aggregates all security settings into a single immutable policy object.

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 512,
    maxPayloadBytes: 10_485_760,  // 10 MB
    maxKeys: 10_000,
    allowedDirs: ['/app/config'],
    url: [
        'allowPrivateIps' => false,
        'allowedHosts' => ['api.example.com'],
        'allowedPorts' => [443],
    ],
    csvMode: 'strip',
    maskPatterns: ['password', 'secret', '*_token'],
);
```

#### `merge(array $overrides): self`

Creates a new policy with overridden values.

```php
$strict = $policy->merge(['maxDepth' => 64, 'maxKeys' => 1000]);
```

### SecurityOptions

**Namespace:** `SafeAccessInline\Security\Guards\SecurityOptions`

Static assertion methods for payload safety.

| Constant            | Default Value |
| ------------------- | ------------- |
| `MAX_DEPTH`         | 512           |
| `MAX_PAYLOAD_BYTES` | 10,485,760    |
| `MAX_KEYS`          | 10,000        |

#### `SecurityOptions::assertPayloadSize(string $input, ?int $maxBytes = null): void`

Throws `SecurityException` if input exceeds max bytes.

#### `SecurityOptions::assertMaxKeys(array $data, ?int $maxKeys = null): void`

Throws `SecurityException` if data has too many keys (recursive count).

#### `SecurityOptions::assertMaxDepth(int $currentDepth, ?int $maxDepth = null): void`

Throws `SecurityException` if nesting exceeds max depth.

### SecurityGuard

**Namespace:** `SafeAccessInline\Security\Guards\SecurityGuard`

#### `SecurityGuard::assertSafeKey(string $key): void`

Blocks prototype pollution keys: `__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `valueOf`, `toString`, `hasOwnProperty`, `isPrototypeOf`. Throws `SecurityException`.

#### `SecurityGuard::sanitizeObject(array $data): array`

Recursively removes forbidden keys from data.

### CsvSanitizer

**Namespace:** `SafeAccessInline\Security\Sanitizers\CsvSanitizer`

Guards against CSV injection attacks (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`).

#### `CsvSanitizer::sanitizeCell(string $cell, string $mode = 'none'): string`

| Mode       | Behavior                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `'none'`   | No sanitization                                                                                       |
| `'prefix'` | Prepends `'` to dangerous cells                                                                       |
| `'strip'`  | Removes all CSV injection prefix characters (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`) per OWASP guidance |
| `'error'`  | Throws `SecurityException`                                                                            |

#### `CsvSanitizer::sanitizeRow(array $row, string $mode = 'none'): array`

Applies `sanitizeCell` to every cell in a row.

### DataMasker

**Namespace:** `SafeAccessInline\Security\Sanitizers\DataMasker`

#### `DataMasker::mask(array $data, array $patterns = []): array`

Replaces values of sensitive keys with `[REDACTED]`. Built-in sensitive keys: `password`, `secret`, `token`, `api_key`, `apikey`, `private_key`, `passphrase`, `credential`, `auth`, `authorization`, `cookie`, `session`, `ssn`, `credit_card`, `creditcard`.

Custom glob patterns extend (not replace) the built-in list.

---

## Schema Validation

### SchemaRegistry

**Namespace:** `SafeAccessInline\Core\Registries\SchemaRegistry`

#### `SchemaRegistry::setDefaultAdapter(SchemaAdapterInterface $adapter): void`

Set a default schema adapter used by `validate()` when no adapter is explicitly passed.

#### `SchemaRegistry::getDefaultAdapter(): ?SchemaAdapterInterface`

#### `SchemaRegistry::clearDefaultAdapter(): void`

### SchemaAdapterInterface

**Namespace:** `SafeAccessInline\Contracts\SchemaAdapterInterface`

```php
interface SchemaAdapterInterface
{
    public function validate(array $data, mixed $schema): SchemaValidationResult;
}
```

### SchemaValidationResult

**Namespace:** `SafeAccessInline\Contracts\SchemaValidationResult`

```php
readonly class SchemaValidationResult
{
    public bool $valid;
    /** @var SchemaValidationIssue[] */
    public array $errors;
}
```

### SchemaValidationIssue

**Namespace:** `SafeAccessInline\Contracts\SchemaValidationIssue`

```php
readonly class SchemaValidationIssue
{
    public string $path;
    public string $message;
}
```

---

## Framework Integrations

### Laravel

**Namespace:** `SafeAccessInline\Integrations\LaravelServiceProvider`

#### `LaravelServiceProvider::register(object $app): void`

Registers a `'safe-access'` singleton in the Laravel container with an alias to `AbstractAccessor::class`.

```php
use SafeAccessInline\Integrations\LaravelServiceProvider;

LaravelServiceProvider::register($this->app);

// Resolve from container
$accessor = app('safe-access');
$accessor = app(AbstractAccessor::class);
```

#### `LaravelServiceProvider::fromConfig(object $config): AbstractAccessor`

Wraps the entire Laravel config repository.

```php
$accessor = LaravelServiceProvider::fromConfig(config());
$accessor->get('app.name'); // 'Laravel'
```

#### `LaravelServiceProvider::fromConfigKey(object $config, string $key): AbstractAccessor`

Wraps a specific config key.

```php
$accessor = LaravelServiceProvider::fromConfigKey(config(), 'database');
$accessor->get('default'); // 'mysql'
```

### LaravelFacade

**Namespace:** `SafeAccessInline\Integrations\LaravelFacade`

A static facade that proxies calls to the `AbstractAccessor` instance bound in the Laravel container under the `'safe-access'` key. Requires `LaravelServiceProvider::register($app)` to have been called first.

#### `LaravelFacade::resolve(object $app): AbstractAccessor`

Resolves and returns the `AbstractAccessor` instance from the given container.

```php
use SafeAccessInline\Integrations\LaravelFacade;

$accessor = LaravelFacade::resolve(app());
$accessor->get('database.default'); // 'mysql'
```

#### `LaravelFacade::__callStatic(string $method, array $arguments): mixed`

Proxies any static call to the bound `AbstractAccessor` instance resolved from `app()`.

```php
// Equivalent to app('safe-access')->get('app.name')
$name = LaravelFacade::get('app.name');
$port = LaravelFacade::get('database.connections.mysql.port', 3306);
```

### Symfony

**Namespace:** `SafeAccessInline\Integrations\SymfonyIntegration`

#### `SymfonyIntegration::fromParameterBag(object $parameterBag): AbstractAccessor`

Wraps Symfony's ParameterBag.

```php
use SafeAccessInline\Integrations\SymfonyIntegration;

$accessor = SymfonyIntegration::fromParameterBag($container->getParameterBag());
$accessor->get('kernel.environment'); // 'prod'
```

#### `SymfonyIntegration::fromConfig(array $config): AbstractAccessor`

Wraps a processed Symfony config array.

```php
$accessor = SymfonyIntegration::fromConfig($processedConfig);
```

#### `SymfonyIntegration::fromYamlFile(string $yamlPath, array $allowedDirs = [], bool $allowAnyPath = false): AbstractAccessor`

Loads a YAML config file with path-traversal protection.

```php
$accessor = SymfonyIntegration::fromYamlFile('/app/config/services.yaml', ['/app/config']);
```
