# API Reference — JavaScript / TypeScript

## SafeAccess Facade

**Import:** `import { SafeAccess } from '@safe-access-inline/core'`

### Factory Methods

#### `SafeAccess.fromArray(data: unknown[]): ArrayAccessor`

Creates an accessor from an array or object.

```typescript
const accessor = SafeAccess.fromArray([{ name: 'Ana' }, { name: 'Bob' }]);
```

#### `SafeAccess.fromObject(data: Record<string, unknown>): ObjectAccessor`

Creates an accessor from a plain object.

```typescript
const accessor = SafeAccess.fromObject({ name: 'Ana', age: 30 });
```

#### `SafeAccess.fromJson(data: string): JsonAccessor`

Creates an accessor from a JSON string.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
```

#### `SafeAccess.fromXml(data: string): XmlAccessor`

Creates an accessor from an XML string.

```typescript
const accessor = SafeAccess.fromXml('<root><name>Ana</name></root>');
```

#### `SafeAccess.fromYaml(data: string): YamlAccessor`

Creates an accessor from a YAML string. Uses a built-in lightweight parser.

```typescript
const accessor = SafeAccess.fromYaml('name: Ana\nage: 30');
```

#### `SafeAccess.fromToml(data: string): TomlAccessor`

Creates an accessor from a TOML string. Uses a built-in lightweight parser.

```typescript
const accessor = SafeAccess.fromToml('name = "Ana"');
```

#### `SafeAccess.fromIni(data: string): IniAccessor`

Creates an accessor from an INI string.

```typescript
const accessor = SafeAccess.fromIni('[section]\nkey = value');
```

#### `SafeAccess.fromCsv(data: string): CsvAccessor`

Creates an accessor from a CSV string (first line = headers).

```typescript
const accessor = SafeAccess.fromCsv('name,age\nAna,30');
```

#### `SafeAccess.fromEnv(data: string): EnvAccessor`

Creates an accessor from a `.env` format string.

```typescript
const accessor = SafeAccess.fromEnv('APP_NAME=MyApp\nDEBUG=true');
```

#### `SafeAccess.detect(data: unknown): AbstractAccessor`

Auto-detects the format and creates the appropriate accessor.

Detection priority: array → object → JSON string → XML string → YAML string → INI string → ENV string.

```typescript
const accessor = SafeAccess.detect({ key: 'value' });           // ObjectAccessor
const fromJson = SafeAccess.detect('{"name": "Ana"}');          // JsonAccessor
const fromXml  = SafeAccess.detect('<root><name>Ana</name></root>'); // XmlAccessor
const fromYaml = SafeAccess.detect('name: Ana\nage: 30');       // YamlAccessor
```

#### `SafeAccess.extend(name: string, cls: Constructor): void`

Registers a custom accessor class.

```typescript
SafeAccess.extend('custom', MyAccessor);
```

#### `SafeAccess.custom(name: string, data: unknown): AbstractAccessor`

Instantiates a previously registered custom accessor.

```typescript
const accessor = SafeAccess.custom('custom', data);
```

---

## Accessor Instance Methods

All accessors extend `AbstractAccessor` and implement the `AccessorInterface`.

### Reading

#### `get(path: string, defaultValue?: unknown): unknown`

Access a value via dot notation path. **Never throws** — returns `defaultValue` (default: `null`) if path not found.

```typescript
accessor.get('user.name');           // value or null
accessor.get('user.email', 'N/A');   // value or 'N/A'
accessor.get('users.*.name');        // array of values (wildcard)
```

#### `getMany(paths: Record<string, unknown>): Record<string, unknown>`

Get multiple values at once. Keys are paths, values are defaults.

```typescript
accessor.getMany({
  'user.name': 'Unknown',
  'user.email': 'N/A',
});
// { 'user.name': 'Ana', 'user.email': 'N/A' }
```

#### `has(path: string): boolean`

Check if a path exists in the data.

```typescript
accessor.has('user.name');    // true
accessor.has('missing');      // false
```

#### `type(path: string): string | null`

Returns the JavaScript type of the value at the given path, or `null` if path doesn't exist.

Possible values: `"string"`, `"number"`, `"boolean"`, `"object"`, `"array"`, `"null"`, `"undefined"`.

```typescript
accessor.type('name');   // "string"
accessor.type('age');    // "number"
accessor.type('tags');   // "array"
accessor.type('x');      // null
```

#### `count(path?: string): number`

Count elements at path (or root).

```typescript
accessor.count();          // root element count
accessor.count('items');   // count of items
```

#### `keys(path?: string): string[]`

List keys at path (or root).

```typescript
accessor.keys();           // ['name', 'age', 'items']
```

#### `all(): Record<string, unknown>`

Returns all data as a shallow copy.

```typescript
accessor.all(); // { name: 'Ana', age: 30, ... }
```

### Writing (Immutable)

#### `set(path: string, value: unknown): AbstractAccessor`

Returns a **new instance** with the value set at the given path.

```typescript
const newAccessor = accessor.set('user.email', 'ana@example.com');
// accessor is unchanged, newAccessor has the value
```

#### `remove(path: string): AbstractAccessor`

Returns a **new instance** with the given path removed.

```typescript
const newAccessor = accessor.remove('user.age');
// accessor is unchanged, newAccessor has 'age' removed
```

### Transformation

#### `toArray(): Record<string, unknown>`

Returns a shallow copy of the data.

#### `toJson(pretty?: boolean): string`

Convert to JSON string.

```typescript
accessor.toJson();       // compact
accessor.toJson(true);   // pretty-printed with 2-space indent
```

#### `toObject(): Record<string, unknown>`

Returns a deep clone of the data (via `structuredClone`).

---

## DotNotationParser

**Import:** `import { DotNotationParser } from '@safe-access-inline/core'`

Static utility class. Typically used internally, but available for direct use.

#### `DotNotationParser.get(data, path, defaultValue?): unknown`

#### `DotNotationParser.has(data, path): boolean`

#### `DotNotationParser.set(data, path, value): Record<string, unknown>`

Returns a new object (uses `structuredClone`, does not mutate input).

#### `DotNotationParser.remove(data, path): Record<string, unknown>`

Returns a new object (does not mutate input).

---

## Errors

| Error | When |
|-------|------|
| `AccessorError` | Base error class |
| `InvalidFormatError` | Invalid input format (e.g., malformed JSON, wrong type) |
| `PathNotFoundError` | Reserved (not thrown by `get()`) |

All errors extend the base `Error` class and `AccessorError`.

---

## TypeScript Types

```typescript
interface AccessorInterface {
  get(path: string, defaultValue?: unknown): unknown;
  getMany(paths: Record<string, unknown>): Record<string, unknown>;
  has(path: string): boolean;
  set(path: string, value: unknown): AbstractAccessor;
  remove(path: string): AbstractAccessor;
  type(path: string): string | null;
  count(path?: string): number;
  keys(path?: string): string[];
  all(): Record<string, unknown>;
  toArray(): Record<string, unknown>;
  toJson(pretty?: boolean): string;
  toObject(): Record<string, unknown>;
}
```
