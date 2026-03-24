---
outline: deep
---

# API Reference — PHP

## Table of Contents

- [SafeAccess Facade](#safeaccess-facade)
- [Accessor Instance Methods](#accessor-instance-methods)

See also: [API — Operations & I/O](/php/api-features) · [API — Types & Internals](/php/api-types)

## SafeAccess Facade

**Namespace:** `SafeAccessInline\SafeAccess`

### Factory Methods

#### `SafeAccess::fromArray(array $data, bool $readonly = false): ArrayAccessor`

Creates an accessor from a PHP array. Pass `true` as the second argument to create a read-only accessor that throws `ReadonlyViolationException` on any mutation.

```php
$accessor = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
$readonly = SafeAccess::fromArray(['key' => 'value'], true);
```

#### `SafeAccess::fromObject(object $data, bool $readonly = false): ObjectAccessor`

Creates an accessor from a PHP object (stdClass or any object).

```php
$accessor = SafeAccess::fromObject((object) ['name' => 'Ana']);
$readonly = SafeAccess::fromObject($obj, true);
```

#### `SafeAccess::fromJson(string $data, bool $readonly = false): JsonAccessor`

Creates an accessor from a JSON string.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$readonly = SafeAccess::fromJson('{"key": "value"}', true);
```

#### `SafeAccess::fromXml(string|SimpleXMLElement $data, bool $readonly = false): XmlAccessor`

Creates an accessor from an XML string or SimpleXMLElement.

```php
$accessor = SafeAccess::fromXml('<root><name>Ana</name></root>');
$readonly = SafeAccess::fromXml('<root/>', true);
```

#### `SafeAccess::fromYaml(string $data, bool $readonly = false): YamlAccessor`

Creates an accessor from a YAML string. Uses `ext-yaml` (if available) or `symfony/yaml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```php
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
$readonly = SafeAccess::fromYaml($yaml, true);
```

#### `SafeAccess::fromToml(string $data, bool $readonly = false): TomlAccessor`

Creates an accessor from a TOML string. Uses `devium/toml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```php
$accessor = SafeAccess::fromToml('name = "Ana"');
$readonly = SafeAccess::fromToml($toml, true);
```

#### `SafeAccess::fromIni(string $data, bool $readonly = false): IniAccessor`

Creates an accessor from an INI string.

```php
$accessor = SafeAccess::fromIni("[section]\nkey = value");
$readonly = SafeAccess::fromIni($ini, true);
```

#### `SafeAccess::fromEnv(string $data, bool $readonly = false): EnvAccessor`

Creates an accessor from a `.env` format string.

```php
$accessor = SafeAccess::fromEnv("APP_NAME=MyApp\nDEBUG=true");
$readonly = SafeAccess::fromEnv($env, true);
```

#### `SafeAccess::fromNdjson(string $data, bool $readonly = false): NdjsonAccessor`

Creates an accessor from a Newline Delimited JSON (NDJSON) string. Each line is parsed as a separate JSON object.

```php
$accessor = SafeAccess::fromNdjson('{"id":1}' . "\n" . '{"id":2}');
$accessor->get('0.id'); // 1
$readonly = SafeAccess::fromNdjson($ndjson, true);
```

#### `SafeAccess::from(mixed $data, string|Format $format = ''): AbstractAccessor`

Unified factory — creates an accessor from any data. With a format string or `Format` enum value, delegates to the corresponding typed factory. Without a format, auto-detects (same as `detect()`).

Supported formats: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'env'`, `'ndjson'`. All built-in formats are also available as `Format` enum cases.

```php
use SafeAccessInline\Enums\Format;

// Auto-detect (no format)
$accessor = SafeAccess::from('{"name": "Ana"}'); // JsonAccessor

// Explicit format via string
$json = SafeAccess::from('{"name": "Ana"}', 'json');   // JsonAccessor
$yaml = SafeAccess::from("name: Ana", 'yaml');          // YamlAccessor

// Explicit format via enum
$json = SafeAccess::from('{"name": "Ana"}', Format::Json);    // JsonAccessor
$yaml = SafeAccess::from("name: Ana", Format::Yaml);           // YamlAccessor
$xml  = SafeAccess::from('<root><n>1</n></root>', Format::Xml); // XmlAccessor
$arr  = SafeAccess::from(['a' => 1], Format::Array);            // ArrayAccessor
```

Throws `InvalidFormatException` if the format is unknown.

#### `SafeAccess::detect(mixed $data): AbstractAccessor`

Auto-detects the format and creates the appropriate accessor.

Detection priority: array → SimpleXMLElement → object → JSON string (with NDJSON fallback) → XML string → YAML string → TOML string → INI string → ENV string.

```php
$accessor = SafeAccess::detect(['key' => 'value']); // ArrayAccessor
```

#### `SafeAccess::resetAll(): void`

Resets **all** global state at once: global security policy and plugin registry. Intended for test suite teardown when multiple subsystems have been configured.

```php
afterEach(function (): void {
    SafeAccess::resetAll();
});
```

#### `SafeAccess::withPolicy(mixed $data, SecurityPolicy $policy): AbstractAccessor`

Auto-detects format and enforces security limits from the policy (`maxPayloadBytes`, `maxKeys`, `maxDepth`). Also applies mask patterns if present.

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(allowedDirs: ['/app/config']);
$accessor = SafeAccess::withPolicy($jsonString, $policy);
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

Returns the normalized type of the value at the given path, or `null` if path doesn't exist.

Possible values: `"string"`, `"number"`, `"bool"`, `"object"`, `"array"`, `"null"`. Returns `null` (not a string) when the path does not exist.

```php
$accessor->type('name');   // "string"
$accessor->type('age');    // "number"
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

### Typed Reading

Convenience methods that cast the result to a specific PHP scalar type. Each returns `$default` if the path does not exist, and the cast value otherwise.

#### `getInt(string $path, int $default = 0): int`

```php
$accessor->getInt('user.age');        // (int) value or 0
$accessor->getInt('score', -1);       // -1 if path missing
```

#### `getBool(string $path, bool $default = false): bool`

```php
$accessor->getBool('feature.enabled');    // (bool) value or false
$accessor->getBool('debug', true);        // true if path missing
```

#### `getString(string $path, string $default = ''): string`

```php
$accessor->getString('user.name');        // (string) value or ''
$accessor->getString('env', 'production'); // 'production' if path missing
```

#### `getArray(string $path, array $default = []): array`

```php
$accessor->getArray('items');             // (array) value or []
$accessor->getArray('tags', ['default']); // ['default'] if path missing
```

#### `getFloat(string $path, float $default = 0.0): float`

```php
$accessor->getFloat('price');       // (float) value or 0.0
$accessor->getFloat('rate', 1.5);   // 1.5 if path missing
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

#### `toJson(int|bool|array $flagsOrOptions = 0): string`

Convert data to a JSON string. Accepts three forms:

| Argument type | Behaviour                                                              |
| ------------- | ---------------------------------------------------------------------- |
| `int`         | Raw `JSON_*` bitmask (e.g. `JSON_PRETTY_PRINT`)                        |
| `bool`        | `true` → `JSON_PRETTY_PRINT`; `false` → compact                        |
| `array`       | Named options: `pretty`, `unescapeUnicode`, `unescapeSlashes`, `space` |

```php
$accessor->toJson();                                     // compact
$accessor->toJson(JSON_PRETTY_PRINT);                    // bitmask (legacy)
$accessor->toJson(true);                                 // pretty shorthand
$accessor->toJson(['pretty' => true]);                   // named option
$accessor->toJson(['unescapeUnicode' => true]);           // keep unicode as-is
$accessor->toJson(['unescapeSlashes' => true]);           // keep slashes as-is
$accessor->toJson(['pretty' => true, 'unescapeUnicode' => true]); // combined
```

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

### Readonly

The `AbstractAccessor` constructor accepts `bool $readonly = false`. When `true`, all write methods (`set`, `remove`, `merge`, etc.) throw `ReadonlyViolationException`. You can also freeze an existing accessor at runtime.

#### `freeze(): static`

Returns a frozen copy of this accessor. All subsequent write operations will throw a `ReadonlyViolationException`.

```php
$frozen = $accessor->freeze();
$frozen->set('a', 1); // throws ReadonlyViolationException
```

```php
$accessor = SafeAccess::fromArray(['key' => 'value']);
$readonly = new \SafeAccessInline\Accessors\ArrayAccessor(['key' => 'value'], true);
$readonly->set('key', 'new'); // throws ReadonlyViolationException
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

### Wildcard Convenience

#### `getWildcard(string $path, mixed $default = null): array`

Convenience wrapper for wildcard paths — always returns an `array`. Equivalent to calling `get($path)` where `$path` contains a `*` or `.**` expression, but explicitly typed for static analysis.

```php
$names = $accessor->getWildcard('users.*.name');   // ['Ana', 'Bob']
$all   = $accessor->getWildcard('missing.*', []);   // [] (default)
```

---
