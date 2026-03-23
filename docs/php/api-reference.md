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

#### `SafeAccess::fromCsv(string $data, bool $readonly = false): CsvAccessor`

Creates an accessor from a CSV string (first line = headers).

```php
$accessor = SafeAccess::fromCsv("name,age\nAna,30");
$readonly = SafeAccess::fromCsv($csv, true);
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

Supported formats: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'csv'`, `'env'`, or any custom name registered via `extend()`. All built-in formats are also available as `Format` enum cases.

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

// Custom format (string only)
SafeAccess::extend('custom', MyAccessor::class);
$custom = SafeAccess::from($data, 'custom');
```

Throws `InvalidFormatException` if the format is unknown and not registered.

#### `SafeAccess::detect(mixed $data): AbstractAccessor`

Auto-detects the format and creates the appropriate accessor.

Detection priority: array → SimpleXMLElement → object → JSON string (with NDJSON fallback) → XML string → YAML string → TOML string → INI string → ENV string.

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

#### `SafeAccess::clearCustomAccessors(): void`

Removes all custom accessors registered via `extend()`. Intended for test teardown to prevent cross-test pollution.

```php
afterEach(function (): void {
    SafeAccess::clearCustomAccessors();
});
```

#### `SafeAccess::resetAll(): void`

Resets **all** global state at once: global security policy, audit listeners, plugin registry, and schema registry. Intended for test suite teardown when multiple subsystems have been configured.

```php
afterEach(function (): void {
    SafeAccess::resetAll();
});
```

::: tip vs. clearCustomAccessors()
`resetAll()` is a superset of `clearCustomAccessors()` — it also clears the plugin registry, schema registry, global policy, and audit listeners. Use it when you need a completely clean slate between tests.
:::

#### `SafeAccess::fromFile(string $filePath, ?string $format = null, array $allowedDirs = [], bool $allowAnyPath = false): AbstractAccessor`

Reads a file from disk and creates the appropriate accessor. Auto-detects format from file extension if `$format` is `null`. The `$allowedDirs` parameter restricts which directories can be read (path-traversal protection). Set `$allowAnyPath = true` to bypass directory restrictions (use with caution).

This API is synchronous. The accessor is fully loaded before the method returns.

```php
$accessor = SafeAccess::fromFile('/etc/config.json');
$accessor = SafeAccess::fromFile('/app/config.yaml', 'yaml');
$accessor = SafeAccess::fromFile('/app/config.json', null, ['/app']);
$accessor = SafeAccess::fromFile('/tmp/data.json', null, [], true); // unrestricted path
```

Throws `SecurityException` if the path is outside allowed directories.

#### `SafeAccess::fromUrl(string $url, ?string $format = null, array $options = []): AbstractAccessor`

Fetches a URL (HTTPS-only, SSRF-safe) and returns the appropriate accessor. Auto-detects format from URL path extension.

This API is synchronous. The response is fetched and parsed before the method returns.

Options: `allowPrivateIps` (bool), `allowedHosts` (string[]), `allowedPorts` (int[]).

```php
$accessor = SafeAccess::fromUrl('https://api.example.com/config.json');
$accessor = SafeAccess::fromUrl('https://api.example.com/data', 'json', [
    'allowedHosts' => ['api.example.com'],
]);
```

Throws `SecurityException` on SSRF attempts, private IPs, non-HTTPS, or disallowed hosts.

#### `SafeAccess::withPolicy(mixed $data, SecurityPolicy $policy): AbstractAccessor`

Auto-detects format and enforces security limits from the policy (`maxPayloadBytes`, `maxKeys`, `maxDepth`). Also applies mask patterns if present.

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

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

#### `SafeAccess::getTemplate(string $template, array $bindings): string`

Renders a template string by replacing `{key}` placeholders with corresponding values from the bindings array. **Note**: This is a static string manipulation utility. To read a template path from an accessor directly, use `$accessor->getTemplate()`.

```php
$rendered = SafeAccess::getTemplate('Hello {user.name}', ['user' => ['name' => 'John']]);
// "Hello John"
```

#### `SafeAccess::compilePath(string $path): CompiledPath`

Parses a dot-notation path once and returns an opaque `CompiledPath` object. Pass it to `getCompiled()` to resolve values without re-tokenizing the path on each call. Best suited for tight loops or hot paths where the same field is read across many accessors.

**Parameters:**

- `$path` — dot-notation path to compile (e.g., `'user.address.city'`).

**Returns:** A `CompiledPath` instance (opaque handle).

```php
use SafeAccessInline\SafeAccess;

// Compile once
$compiledPath = SafeAccess::compilePath('user.address.city');

// Reuse across many accessors — no re-parsing
$a = SafeAccess::fromArray(['user' => ['address' => ['city' => 'São Paulo']]]);
$b = SafeAccess::fromArray(['user' => ['address' => ['city' => 'Lisbon']]]);

$a->getCompiled($compiledPath); // "São Paulo"
$b->getCompiled($compiledPath); // "Lisbon"
```

::: tip Performance tip
`compilePath()` combined with `getCompiled()` performs better than `get()` in tight loops where the same path is used many times. For one-off access, prefer the simpler `get()` API.
:::

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

#### `getTemplate(string $template, array $bindings, mixed $default = null): mixed`

Resolves a template string by substituting binding keys with their values, then reads the resulting path from the accessor.

```php
// Template uses {key} placeholders resolved against $bindings
$accessor->getTemplate('users.{id}.name', ['id' => '0']); // 'Ana'
$accessor->getTemplate('settings.{section}.{key}', ['section' => 'db', 'key' => 'host'], 'localhost');
```

#### `getCompiled(CompiledPath $compiled, mixed $default = null): mixed`

Resolves a pre-compiled path (see [`SafeAccess::compilePath()`](#safeaccess-compilepath-string-path-compiledpath)) against this accessor's data. Prefer this over `get()` when the same path is read repeatedly in a loop.

```php
$compiled = SafeAccess::compilePath('user.name');
$accessor->getCompiled($compiled);           // 'Ana'
$accessor->getCompiled($compiled, 'N/A');    // 'Ana' if exists, 'N/A' if missing
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

#### `toJson(int|bool $flags = 0): string`

Convert data to a JSON string. Passing `true` as a boolean is a shorthand for `JSON_PRETTY_PRINT`.

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

#### `toCsv(?string $csvMode = null): string`

Serializes the data to CSV format. The optional `$csvMode` parameter controls CSV injection sanitization: `'none'` (default), `'prefix'`, `'strip'`, or `'error'`.

```php
$accessor->toCsv();          // default: no sanitization
$accessor->toCsv('strip');   // strip dangerous leading characters
```

#### `transform(string $format): string`

Serialize data to any format. Falls back to built-in serializers for `yaml` and `toml` (no plugin required). Other formats require a registered serializer plugin; throws `UnsupportedTypeException` if none is found.

```php
// yaml and toml work without registration
$accessor->transform('yaml');  // "name: Ana\nage: 30\n"
$accessor->transform('toml');  // 'name = "Ana"\nage = 30\n'

// Custom formats need a plugin
PluginRegistry::registerSerializer('csv', new MyCsvSerializer());
$accessor->transform('csv');
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
use SafeAccessInline\Core\Registries\SchemaRegistry;

SchemaRegistry::setDefaultAdapter($myAdapter);
$accessor->validate($schema)->get('name'); // fluent chaining

// With explicit adapter
$accessor->validate($schema, new MySchemaAdapter());
```

### Readonly

The `AbstractAccessor` constructor accepts `bool $readonly = false`. When `true`, all write methods (`set`, `remove`, `merge`, `push`, `pop`, etc.) throw `ReadonlyViolationException`. You can also freeze an existing accessor at runtime.

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

#### `diff(AbstractAccessor|array $other): array`

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

### Debugging

#### `trace(string $path): array`

Returns an ordered array of resolution steps used to traverse the path. Useful for diagnosing unexpected `null` returns or understanding how wildcards and filters are resolved.

```php
$accessor = SafeAccess::fromArray(['users' => [['name' => 'Ana']]]);
$steps = $accessor->trace('users.0.name');
// [
//   ['step' => 'users',  'value' => [['name' => 'Ana']]],
//   ['step' => '0',      'value' => ['name' => 'Ana']],
//   ['step' => 'name',   'value' => 'Ana'],
// ]
```

### Wildcard Convenience

#### `getWildcard(string $path, mixed $default = null): array`

Convenience wrapper for wildcard paths — always returns an `array`. Equivalent to calling `get($path)` where `$path` contains a `*` or `.**` expression, but explicitly typed for static analysis.

```php
$names = $accessor->getWildcard('users.*.name');   // ['Ana', 'Bob']
$all   = $accessor->getWildcard('missing.*', []);   // [] (default)
```

---
