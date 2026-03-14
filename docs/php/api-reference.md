---
title: API Reference
parent: PHP
nav_order: 2
permalink: /php/api-reference/
---

# API Reference — PHP

## Table of Contents

- [SafeAccess Facade](#safeaccess-facade)
- [Accessor Instance Methods](#accessor-instance-methods)
    - [Reading](#reading)
    - [Writing (Immutable)](#writing-immutable)
    - [Array Operations (Immutable)](#array-operations-immutable)
    - [JSON Patch & Diff](#json-patch--diff)
    - [Transformation](#transformation)
    - [Security & Validation](#security--validation)
- [I/O & File Loading](#io--file-loading)
- [Layered Configuration](#layered-configuration)
- [File Watching](#file-watching)
- [Audit Logging](#audit-logging)
- [Security](#security)
    - [SecurityPolicy](#securitypolicy)
    - [SecurityOptions](#securityoptions)
    - [SecurityGuard](#securityguard)
    - [CsvSanitizer](#csvsanitizer)
    - [DataMasker](#datamasker)
- [Schema Validation](#schema-validation)
- [Framework Integrations](#framework-integrations)
    - [Laravel](#laravel)
    - [Symfony](#symfony)
- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Exceptions](#exceptions)
- [Interfaces](#interfaces)
- [Enums](#enums)

## SafeAccess Facade

**Namespace:** `SafeAccessInline\SafeAccess`

### Factory Methods

#### `SafeAccess::fromArray(array $data): ArrayAccessor`

Creates an accessor from a PHP array.

```php
$accessor = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
```

#### `SafeAccess::fromObject(object $data): ObjectAccessor`

Creates an accessor from a PHP object (stdClass or any object).

```php
$accessor = SafeAccess::fromObject((object) ['name' => 'Ana']);
```

#### `SafeAccess::fromJson(string $data): JsonAccessor`

Creates an accessor from a JSON string.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
```

#### `SafeAccess::fromXml(string|SimpleXMLElement $data): XmlAccessor`

Creates an accessor from an XML string or SimpleXMLElement.

```php
$accessor = SafeAccess::fromXml('<root><name>Ana</name></root>');
```

#### `SafeAccess::fromYaml(string $data): YamlAccessor`

Creates an accessor from a YAML string. Uses `ext-yaml` (if available) or `symfony/yaml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```php
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess::fromToml(string $data): TomlAccessor`

Creates an accessor from a TOML string. Uses `devium/toml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```php
$accessor = SafeAccess::fromToml('name = "Ana"');
```

#### `SafeAccess::fromIni(string $data): IniAccessor`

Creates an accessor from an INI string.

```php
$accessor = SafeAccess::fromIni("[section]\nkey = value");
```

#### `SafeAccess::fromCsv(string $data): CsvAccessor`

Creates an accessor from a CSV string (first line = headers).

```php
$accessor = SafeAccess::fromCsv("name,age\nAna,30");
```

#### `SafeAccess::fromEnv(string $data): EnvAccessor`

Creates an accessor from a `.env` format string.

```php
$accessor = SafeAccess::fromEnv("APP_NAME=MyApp\nDEBUG=true");
```

#### `SafeAccess::fromNdjson(string $data): NdjsonAccessor`

Creates an accessor from a Newline Delimited JSON (NDJSON) string. Each line is parsed as a separate JSON object.

```php
$accessor = SafeAccess::fromNdjson('{"id":1}' . "\n" . '{"id":2}');
$accessor->get('0.id'); // 1
```

#### `SafeAccess::from(mixed $data, string|AccessorFormat $format = ''): AbstractAccessor`

Unified factory — creates an accessor from any data. With a format string or `AccessorFormat` enum value, delegates to the corresponding typed factory. Without a format, auto-detects (same as `detect()`).

Supported formats: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'csv'`, `'env'`, or any custom name registered via `extend()`. All built-in formats are also available as `AccessorFormat` enum cases.

```php
use SafeAccessInline\Enums\AccessorFormat;

// Auto-detect (no format)
$accessor = SafeAccess::from('{"name": "Ana"}'); // JsonAccessor

// Explicit format via string
$json = SafeAccess::from('{"name": "Ana"}', 'json');   // JsonAccessor
$yaml = SafeAccess::from("name: Ana", 'yaml');          // YamlAccessor

// Explicit format via enum
$json = SafeAccess::from('{"name": "Ana"}', AccessorFormat::Json);    // JsonAccessor
$yaml = SafeAccess::from("name: Ana", AccessorFormat::Yaml);           // YamlAccessor
$xml  = SafeAccess::from('<root><n>1</n></root>', AccessorFormat::Xml); // XmlAccessor
$arr  = SafeAccess::from(['a' => 1], AccessorFormat::Array);            // ArrayAccessor

// Custom format (string only)
SafeAccess::extend('custom', MyAccessor::class);
$custom = SafeAccess::from($data, 'custom');
```

Throws `InvalidFormatException` if the format is unknown and not registered.

#### `SafeAccess::detect(mixed $data): AbstractAccessor`

Auto-detects the format and creates the appropriate accessor.

Detection priority: array → SimpleXMLElement → object → JSON string → XML string → INI string → ENV string.

```php
$accessor = SafeAccess::detect(['key' => 'value']); // ArrayAccessor
```

#### `SafeAccess::extend(string $name, string $class): void`

Registers a custom accessor class.

```php
SafeAccess::extend('custom', MyAccessor::class);
```

#### `SafeAccess::custom(string $name, mixed $data): AbstractAccessor`

Instantiates a previously registered custom accessor.

```php
$accessor = SafeAccess::custom('custom', $data);
```

#### `SafeAccess::fromFile(string $filePath, ?string $format = null, array $allowedDirs = []): AbstractAccessor`

Reads a file from disk and creates the appropriate accessor. Auto-detects format from file extension if `$format` is `null`. The `$allowedDirs` parameter restricts which directories can be read (path-traversal protection).

```php
$accessor = SafeAccess::fromFile('/etc/config.json');
$accessor = SafeAccess::fromFile('/app/config.yaml', 'yaml');
$accessor = SafeAccess::fromFile('/app/config.json', null, ['/app']);
```

Throws `SecurityException` if the path is outside allowed directories.

#### `SafeAccess::fromUrl(string $url, ?string $format = null, array $options = []): AbstractAccessor`

Fetches a URL (HTTPS-only, SSRF-safe) and returns the appropriate accessor. Auto-detects format from URL path extension.

Options: `allowPrivateIps` (bool), `allowedHosts` (string[]), `allowedPorts` (int[]).

```php
$accessor = SafeAccess::fromUrl('https://api.example.com/config.json');
$accessor = SafeAccess::fromUrl('https://api.example.com/data', 'json', [
    'allowedHosts' => ['api.example.com'],
]);
```

Throws `SecurityException` on SSRF attempts, private IPs, non-HTTPS, or disallowed hosts.

#### `SafeAccess::withPolicy(mixed $data, SecurityPolicy $policy): AbstractAccessor`

Auto-detects format and optionally applies mask patterns from the policy.

```php
use SafeAccessInline\Security\SecurityPolicy;

$policy = new SecurityPolicy(maskPatterns: ['password', 'secret']);
$accessor = SafeAccess::withPolicy($jsonString, $policy);
```

#### `SafeAccess::fromFileWithPolicy(string $filePath, SecurityPolicy $policy): AbstractAccessor`

Loads a file constrained to the policy's `allowedDirs`.

```php
$policy = new SecurityPolicy(allowedDirs: ['/app/config']);
$accessor = SafeAccess::fromFileWithPolicy('/app/config/app.json', $policy);
```

#### `SafeAccess::fromUrlWithPolicy(string $url, SecurityPolicy $policy): AbstractAccessor`

Fetches a URL constrained by the policy's URL options.

```php
$policy = new SecurityPolicy(url: [
    'allowedHosts' => ['api.example.com'],
    'allowPrivateIps' => false,
]);
$accessor = SafeAccess::fromUrlWithPolicy('https://api.example.com/config.json', $policy);
```

---

## Accessor Instance Methods

All accessors extend `AbstractAccessor` and implement these methods:

### Reading

#### `get(string $path, mixed $default = null): mixed`

Access a value via dot notation path. **Never throws** — returns `$default` if path not found.

```php
$accessor->get('user.name');                          // value or null
$accessor->get('user.email', 'N/A');                  // value or 'N/A'
$accessor->get('users.*.name');                       // array of values (wildcard)
$accessor->get("users[?role=='admin'].name");         // filtered values
$accessor->get('..name');                             // recursive descent
```

#### `getMany(array $paths): array`

Get multiple values at once. Keys are paths, values are defaults.

```php
$accessor->getMany([
    'user.name' => 'Unknown',
    'user.email' => 'N/A',
]);
// ['user.name' => 'Ana', 'user.email' => 'N/A']
```

#### `has(string $path): bool`

Check if a path exists in the data.

```php
$accessor->has('user.name');    // true
$accessor->has('missing');      // false
```

#### `type(string $path): ?string`

Returns the PHP type of the value at the given path, or `null` if path doesn't exist.

```php
$accessor->type('name');   // "string"
$accessor->type('age');    // "integer"
$accessor->type('tags');   // "array"
$accessor->type('x');      // null
```

#### `count(?string $path = null): int`

Count elements at path (or root).

```php
$accessor->count();          // root element count
$accessor->count('items');   // count of 'items' array
```

#### `keys(?string $path = null): array`

List keys at path (or root).

```php
$accessor->keys();           // ['name', 'age', 'items']
$accessor->keys('items');    // [0, 1, 2]
```

#### `all(): array`

Returns all data as an associative array. Semantic intent: "give me everything as-is".

```php
$accessor->all(); // ['name' => 'Ana', 'age' => 30, ...]
```

### Writing (Immutable)

#### `set(string $path, mixed $value): static`

Returns a **new instance** with the value set at the given path.

```php
$new = $accessor->set('user.email', 'ana@example.com');
// $accessor is unchanged, $new has the value
```

#### `merge(array $value): static`

#### `merge(string $path, array $value): static`

Deep merges data at root or at a specific path. Returns a **new instance**. Associative arrays are merged recursively; other values are replaced.

```php
// Merge at root
$merged = $accessor->merge(['theme' => 'dark', 'notifications' => true]);

// Merge at path
$merged = $accessor->merge('user.settings', ['theme' => 'dark']);
```

#### `remove(string $path): static`

Returns a **new instance** with the given path removed.

```php
$new = $accessor->remove('user.age');
// $accessor is unchanged, $new has 'age' removed
```

### Transformation

#### `toArray(): array`

Convert data to a PHP array. Semantic intent: "convert to array format". Currently identical to `all()`, but semantically distinct for future extensibility.

#### `toJson(int $flags = 0): string`

Convert data to a JSON string.

```php
$accessor->toJson();                    // compact
$accessor->toJson(JSON_PRETTY_PRINT);   // pretty-printed
```

#### `toObject(): stdClass`

Convert data to a stdClass object.

#### `toXml(string $rootElement = 'root'): string`

Convert data to an XML string. Checks `PluginRegistry` for an XML serializer first; falls back to built-in `SimpleXMLElement` implementation.

```php
$accessor->toXml();           // <root>...</root>
$accessor->toXml('config');   // <config>...</config>
```

#### `toYaml(): string`

Convert data to a YAML string. Checks `PluginRegistry` for a YAML serializer first; then falls back to `yaml_emit()` if `ext-yaml` is available; otherwise uses `Symfony\Component\Yaml\Yaml::dump()`.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->toYaml();          // "name: Ana\n"
```

#### `toToml(): string`

Convert data to a TOML string. Checks `PluginRegistry` for a TOML serializer first; falls back to `Devium\Toml\Toml::encode()`.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->toToml();          // 'name = "Ana"'
```

#### `toNdjson(): string`

Serializes data to Newline Delimited JSON. Each top-level value becomes a separate JSON line.

```php
$accessor = SafeAccess::fromArray([['id' => 1], ['id' => 2]]);
$accessor->toNdjson(); // '{"id":1}\n{"id":2}'
```

#### `transform(string $format): string`

Serialize data to any format that has a registered serializer plugin. Throws `UnsupportedTypeException` if no serializer is registered for the given format.

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
$accessor->transform('yaml');  // "name: Ana\nage: 30\n"
```

### Security & Validation

#### `masked(array $patterns = []): static`

Returns a **new instance** with sensitive data replaced by `[REDACTED]`. Auto-detects common keys (password, token, secret, api_key, etc.). Custom glob patterns can be provided.

```php
$safe = $accessor->masked();
$safe->get('database.password'); // '[REDACTED]'

// With custom patterns
$safe = $accessor->masked(['*_key', 'credentials.*']);
```

#### `validate(mixed $schema, ?SchemaAdapterInterface $adapter = null): static`

Validates data against a schema. Uses `SchemaRegistry` default adapter if none provided. Throws `SchemaValidationException` on failure. Returns `$this` for fluent chaining.

```php
use SafeAccessInline\Core\SchemaRegistry;

SchemaRegistry::setDefaultAdapter($myAdapter);
$accessor->validate($schema)->get('name'); // fluent chaining

// With explicit adapter
$accessor->validate($schema, new MySchemaAdapter());
```

### Readonly

The `AbstractAccessor` constructor accepts `bool $readonly = false`. When `true`, all write methods (`set`, `remove`, `merge`, `push`, `pop`, etc.) throw `ReadonlyViolationException`.

```php
$accessor = SafeAccess::fromArray(['key' => 'value']);
$readonly = new \SafeAccessInline\Accessors\ArrayAccessor(['key' => 'value'], true);
$readonly->set('key', 'new'); // throws ReadonlyViolationException
```

### Array Operations (Immutable)

All array operations return **new instances** — the original is never mutated.

#### `push(string $path, mixed ...$items): static`

Appends items to the end of the array at `$path`.

```php
$new = $accessor->push('tags', 'php', 'safe');
```

#### `pop(string $path): static`

Removes the last item from the array at `$path`.

```php
$new = $accessor->pop('tags');
```

#### `shift(string $path): static`

Removes the first item from the array at `$path`.

```php
$new = $accessor->shift('queue');
```

#### `unshift(string $path, mixed ...$items): static`

Prepends items to the beginning of the array at `$path`.

```php
$new = $accessor->unshift('queue', 'first');
```

#### `insert(string $path, int $index, mixed ...$items): static`

Inserts items at a specific index in the array at `$path`. Supports negative indices.

```php
$new = $accessor->insert('items', 1, 'inserted');
$new = $accessor->insert('items', -1, 'before-last');
```

#### `filterAt(string $path, callable $predicate): static`

Filters array items at `$path` using a predicate `fn($value, $key): bool`.

```php
$new = $accessor->filterAt('users', fn($u) => $u['active'] === true);
```

#### `mapAt(string $path, callable $transform): static`

Transforms each array item at `$path` using `fn($value, $key): mixed`.

```php
$new = $accessor->mapAt('prices', fn($p) => $p * 1.1);
```

#### `sortAt(string $path, ?string $key = null, string $direction = 'asc'): static`

Sorts the array at `$path`. Optionally by a sub-key. Direction: `'asc'` or `'desc'`.

```php
$sorted = $accessor->sortAt('users', 'name');
$desc   = $accessor->sortAt('scores', null, 'desc');
```

#### `unique(string $path, ?string $key = null): static`

Removes duplicate values from the array at `$path`. Optionally de-duplicates by a sub-key.

```php
$new = $accessor->unique('tags');
$new = $accessor->unique('users', 'email');
```

#### `flatten(string $path, int $depth = 1): static`

Flattens nested arrays at `$path` by `$depth` levels.

```php
$new = $accessor->flatten('matrix');        // 1 level
$new = $accessor->flatten('deep', PHP_INT_MAX); // fully flat
```

#### `first(string $path, mixed $default = null): mixed`

Returns the first element of the array at `$path`.

```php
$accessor->first('items'); // first item or null
```

#### `last(string $path, mixed $default = null): mixed`

Returns the last element of the array at `$path`.

```php
$accessor->last('items'); // last item or null
```

#### `nth(string $path, int $index, mixed $default = null): mixed`

Returns the element at index `$index`. Supports negative indices (`-1` = last).

```php
$accessor->nth('items', 0);    // first
$accessor->nth('items', -1);   // last
$accessor->nth('items', 99, 'fallback'); // 'fallback'
```

### JSON Patch & Diff

#### `diff(AbstractAccessor $other): array`

Generates RFC 6902 JSON Patch operations representing the differences between two accessors.

```php
$a = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
$b = SafeAccess::fromArray(['name' => 'Ana', 'age' => 31, 'city' => 'SP']);

$ops = $a->diff($b);
// [
//   ['op' => 'replace', 'path' => '/age', 'value' => 31],
//   ['op' => 'add', 'path' => '/city', 'value' => 'SP'],
// ]
```

#### `applyPatch(array $ops): static`

Applies RFC 6902 JSON Patch operations. Supports: `add`, `replace`, `remove`, `move`, `copy`, `test`. Returns a **new instance**.

```php
$new = $accessor->applyPatch([
    ['op' => 'replace', 'path' => '/name', 'value' => 'Updated'],
    ['op' => 'add', 'path' => '/new_key', 'value' => 42],
    ['op' => 'remove', 'path' => '/old_key'],
]);
```

### Segment-Based Access

For cases where you need literal path access without wildcard or filter parsing:

#### `getAt(array $segments, mixed $default = null): mixed`

```php
$accessor->getAt(['users', '0', 'name']); // literal traversal
```

#### `hasAt(array $segments): bool`

#### `setAt(array $segments, mixed $value): static`

#### `removeAt(array $segments): static`

---

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

Event types: `file.read`, `file.watch`, `url.fetch`, `security.violation`, `data.mask`, `data.freeze`, `schema.validate`.

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

**Namespace:** `SafeAccessInline\Security\SecurityPolicy`

Aggregates all security settings into a single immutable policy object.

```php
use SafeAccessInline\Security\SecurityPolicy;

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

**Namespace:** `SafeAccessInline\Security\SecurityOptions`

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

**Namespace:** `SafeAccessInline\Security\SecurityGuard`

#### `SecurityGuard::assertSafeKey(string $key): void`

Blocks prototype pollution keys: `__proto__`, `constructor`, `prototype`. Throws `SecurityException`.

#### `SecurityGuard::sanitizeObject(array $data): array`

Recursively removes forbidden keys from data.

### CsvSanitizer

**Namespace:** `SafeAccessInline\Security\CsvSanitizer`

Guards against CSV injection attacks (`=`, `+`, `-`, `@`, `\t`, `\r`).

#### `CsvSanitizer::sanitizeCell(string $cell, string $mode = 'none'): string`

| Mode       | Behavior                             |
| ---------- | ------------------------------------ |
| `'none'`   | No sanitization                      |
| `'prefix'` | Prepends `'` to dangerous cells      |
| `'strip'`  | Removes leading dangerous characters |
| `'error'`  | Throws `SecurityException`           |

#### `CsvSanitizer::sanitizeRow(array $row, string $mode = 'none'): array`

Applies `sanitizeCell` to every cell in a row.

### DataMasker

**Namespace:** `SafeAccessInline\Security\DataMasker`

#### `DataMasker::mask(array $data, array $patterns = []): array`

Replaces values of sensitive keys with `[REDACTED]`. Built-in sensitive keys: `password`, `secret`, `token`, `api_key`, `apiKey`, `authorization`, `auth`, `credential`, `private_key`, `privateKey`, `access_token`, `accessToken`, `refresh_token`, `refreshToken`.

Custom glob patterns extend (not replace) the built-in list.

---

## Schema Validation

### SchemaRegistry

**Namespace:** `SafeAccessInline\Core\SchemaRegistry`

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

#### `SymfonyIntegration::fromYamlFile(string $yamlPath, array $allowedDirs = []): AbstractAccessor`

Loads a YAML config file with path-traversal protection.

```php
$accessor = SymfonyIntegration::fromYamlFile('/app/config/services.yaml', ['/app/config']);
```

---

## PluginRegistry

**Namespace:** `SafeAccessInline\Core\PluginRegistry`

Static registry for parser and serializer plugins. Parsers convert raw strings to arrays; serializers convert arrays to formatted strings.

#### `PluginRegistry::registerParser(string $format, ParserPluginInterface $parser): void`

Register a parser plugin for the given format.

```php
use SafeAccessInline\Plugins\SymfonyYamlParser;
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
```

#### `PluginRegistry::registerSerializer(string $format, SerializerPluginInterface $serializer): void`

Register a serializer plugin for the given format.

```php
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
```

#### `PluginRegistry::hasParser(string $format): bool`

Check if a parser is registered for the given format.

#### `PluginRegistry::hasSerializer(string $format): bool`

Check if a serializer is registered for the given format.

#### `PluginRegistry::getParser(string $format): ParserPluginInterface`

Get the registered parser. Throws `UnsupportedTypeException` if not registered.

#### `PluginRegistry::getSerializer(string $format): SerializerPluginInterface`

Get the registered serializer. Throws `UnsupportedTypeException` if not registered.

#### `PluginRegistry::reset(): void`

Clear all registered plugins. Intended for testing — call in `beforeEach` to prevent cross-test pollution.

### Plugin Interfaces

#### `ParserPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\ParserPluginInterface`

```php
interface ParserPluginInterface
{
    /**
     * @param string $raw
     * @return array<mixed>
     * @throws InvalidFormatException
     */
    public function parse(string $raw): array;
}
```

#### `SerializerPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\SerializerPluginInterface`

```php
interface SerializerPluginInterface
{
    /**
     * @param array<mixed> $data
     * @return string
     */
    public function serialize(array $data): string;
}
```

---

## DotNotationParser

**Namespace:** `SafeAccessInline\Core\DotNotationParser`

Static utility class. Typically used internally, but available for direct use.

#### `DotNotationParser::get(array $data, string $path, mixed $default = null): mixed`

Supports advanced path expressions:

| Syntax            | Description                                                   | Example                 |
| ----------------- | ------------------------------------------------------------- | ----------------------- |
| `a.b.c`           | Nested key access                                             | `"user.profile.name"`   |
| `a[0]`            | Bracket index                                                 | `"items[0].title"`      |
| `a.*`             | Wildcard — returns array of values                            | `"users.*.name"`        |
| `a[?field>value]` | Filter — returns matching items                               | `"products[?price>20]"` |
| `..key`           | Recursive descent — collects all values of `key` at any depth | `"..name"`              |

**Filter expressions** support:

- Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `&&` (AND), `\|\|` (OR)
- Values: numbers, `'strings'`, `true`, `false`, `null`

```php
// Filter: all admin users
DotNotationParser::get($data, "users[?role=='admin']");

// Filter with numeric comparison + path continuation
DotNotationParser::get($data, 'products[?price>20].name');

// Combined AND
DotNotationParser::get($data, "items[?type=='fruit' && color=='red'].name");

// Recursive descent: all "name" values at any depth
DotNotationParser::get($data, '..name');

// Descent + wildcard
DotNotationParser::get($data, '..items.*.id');

// Descent + filter
DotNotationParser::get($data, "..employees[?active==true].name");
```

#### `DotNotationParser::has(array $data, string $path): bool`

#### `DotNotationParser::set(array $data, string $path, mixed $value): array`

Returns a new array (does not mutate input).

#### `DotNotationParser::merge(array $data, string $path, array $value): array`

Deep merges `$value` at `$path`. When `$path` is empty, merges at root. Associative arrays are merged recursively; other values are replaced.

```php
$result = DotNotationParser::merge($data, 'user.settings', ['theme' => 'dark']);
```

#### `DotNotationParser::remove(array $data, string $path): array`

Returns a new array (does not mutate input).

#### `DotNotationParser::renderTemplate(string $template, array $bindings): string`

Renders `{key}` placeholders in a path template.

```php
DotNotationParser::renderTemplate('users.{id}.name', ['id' => '42']);
// 'users.42.name'
```

---

## Exceptions

| Exception                    | When                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `AccessorException`          | Base exception class                                                                                                     |
| `InvalidFormatException`     | Invalid input format (e.g., malformed JSON, missing parser plugin at accessor level)                                     |
| `UnsupportedTypeException`   | `detect()` cannot determine format; `PluginRegistry` has no registered plugin; `toXml()`/`transform()` has no serializer |
| `PathNotFoundException`      | Reserved (not thrown by `get()`)                                                                                         |
| `SecurityException`          | SSRF attempt, path traversal, payload too large, forbidden keys, CSV injection (`error` mode)                            |
| `ReadonlyViolationException` | Modifying a readonly accessor (`set`, `remove`, `merge`, `push`, etc.)                                                   |
| `SchemaValidationException`  | Schema validation failed — has `getIssues(): SchemaValidationIssue[]` for detailed error info                            |

---

## Interfaces

| Interface                   | Methods                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ReadableInterface`         | `get()`, `getMany()`, `all()`                                                                                 |
| `WritableInterface`         | `set()`, `merge()`, `remove()`                                                                                |
| `TransformableInterface`    | `toArray()`, `toJson()`, `toXml()`, `toYaml()`, `toToml()`, `toNdjson()`, `toObject()`, `transform()`         |
| `AccessorInterface`         | Extends `ReadableInterface` + `TransformableInterface`, adds `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                     |
| `SerializerPluginInterface` | `serialize()`                                                                                                 |
| `SchemaAdapterInterface`    | `validate()`                                                                                                  |

---

## Enums

### `AccessorFormat`

**Namespace:** `SafeAccessInline\Enums\AccessorFormat`

String-backed enum covering all built-in formats. Use it as a type-safe alternative to passing raw strings to `SafeAccess::from()`.

| Case                     | Value      |
| ------------------------ | ---------- |
| `AccessorFormat::Array`  | `'array'`  |
| `AccessorFormat::Object` | `'object'` |
| `AccessorFormat::Json`   | `'json'`   |
| `AccessorFormat::Xml`    | `'xml'`    |
| `AccessorFormat::Yaml`   | `'yaml'`   |
| `AccessorFormat::Toml`   | `'toml'`   |
| `AccessorFormat::Ini`    | `'ini'`    |
| `AccessorFormat::Csv`    | `'csv'`    |
| `AccessorFormat::Env`    | `'env'`    |
| `AccessorFormat::Ndjson` | `'ndjson'` |
