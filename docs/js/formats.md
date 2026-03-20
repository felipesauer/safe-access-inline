---
outline: deep
---

# Formats & TypeScript — JavaScript / TypeScript

## Table of Contents

- [Formats \& TypeScript — JavaScript / TypeScript](#formats--typescript--javascript--typescript)
    - [Table of Contents](#table-of-contents)
    - [Working with Formats](#working-with-formats)
        - [Working with XML](#working-with-xml)
        - [Working with YAML](#working-with-yaml)
        - [Working with TOML](#working-with-toml)
        - [Working with INI](#working-with-ini)
        - [Working with ENV](#working-with-env)
        - [Working with CSV](#working-with-csv)
            - [CSV injection protection](#csv-injection-protection)
        - [Custom accessors](#custom-accessors)
    - [ESM and CommonJS](#esm-and-commonjs)
    - [TypeScript Support](#typescript-support)
        - [Type-Safe Path Inference](#type-safe-path-inference)

---

## Working with Formats

### Working with XML

```typescript
const xml = `<config><database><host>localhost</host><port>5432</port></database></config>`;

const accessor = SafeAccess.fromXml(xml);
accessor.get("database.host"); // "localhost"
accessor.get("database.port"); // "5432"
```

### Working with YAML

```typescript
const yaml = `
app:
  name: MyApp
  debug: true
database:
  host: localhost
  port: 5432
`;

const accessor = SafeAccess.fromYaml(yaml);
accessor.get("app.name"); // "MyApp"
accessor.get("database.port"); // 5432
```

### Working with TOML

```typescript
const toml = `
title = "My Config"

[database]
host = "localhost"
port = 5432
`;

const accessor = SafeAccess.fromToml(toml);
accessor.get("title"); // "My Config"
accessor.get("database.host"); // "localhost"
```

### Working with INI

```typescript
const ini = `
app_name = MyApp

[database]
host = localhost
port = 3306
`;

const accessor = SafeAccess.fromIni(ini);
accessor.get("app_name"); // "MyApp"
accessor.get("database.host"); // "localhost"
```

### Working with ENV

```typescript
const env = `
APP_NAME=MyApp
APP_KEY="secret-key"
DEBUG=true
# Comment
DB_HOST=localhost
`;

const accessor = SafeAccess.fromEnv(env);
accessor.get("APP_NAME"); // "MyApp"
accessor.get("APP_KEY"); // "secret-key"
```

### Working with CSV

```typescript
const csv = `name,age,city
Ana,30,Porto Alegre
Bob,25,São Paulo`;

const accessor = SafeAccess.fromCsv(csv);
accessor.get("0.name"); // "Ana"
accessor.get("1.city"); // "São Paulo"
accessor.get("*.name"); // ["Ana", "Bob"]
```

#### CSV injection protection

CSV injection prevention is applied during **serialization** (`.toCsv()`), not during parsing. To guard against formula injection (cells starting with `=`, `+`, `-`, `@`), pass a `csvMode` to `SecurityPolicy`. Accepted values:

- `'none'` _(default)_ — no sanitization
- `'prefix'` — prepends a single quote to dangerous cells
- `'strip'` — removes the dangerous leading character
- `'error'` — throws a `SecurityError` on detection

```typescript
import {
    mergePolicy,
    defaultPolicy,
} from "@safe-access-inline/safe-access-inline";

const policy = mergePolicy(defaultPolicy, { csvMode: "strip" });
const accessor = SafeAccess.withPolicy(csvString, policy);
```

### Custom accessors

```typescript
import { AbstractAccessor } from "@safe-access-inline/safe-access-inline";

class MyFormatAccessor extends AbstractAccessor {
    static from(data: unknown): MyFormatAccessor {
        return new MyFormatAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        // Your custom parsing logic
        return { parsed: raw };
    }

    clone(data: Record<string, unknown>): MyFormatAccessor {
        const inst = Object.create(MyFormatAccessor.prototype);
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }
}

// Register
SafeAccess.extend("myformat", MyFormatAccessor);

// Use
const accessor = SafeAccess.custom("myformat", data);
accessor.get("parsed");
```

---

## ESM and CommonJS

The package ships dual ESM/CJS builds:

```javascript
// ESM
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// CommonJS
const { SafeAccess } = require("@safe-access-inline/safe-access-inline");
```

---

## TypeScript Support

Full TypeScript definitions are included. All public types are exported:

```typescript
import {
    SafeAccess,
    AbstractAccessor,
    DotNotationParser,
    TypeDetector,
    PluginRegistry,
    ArrayAccessor,
    ObjectAccessor,
    JsonAccessor,
    XmlAccessor,
    YamlAccessor,
    TomlAccessor,
    IniAccessor,
    CsvAccessor,
    EnvAccessor,
    AccessorError,
    InvalidFormatError,
    PathNotFoundError,
    UnsupportedTypeError,
    JsYamlParser,
    JsYamlSerializer,
    SmolTomlParser,
    SmolTomlSerializer,
} from "@safe-access-inline/safe-access-inline";

import type {
    ParserPlugin,
    SerializerPlugin,
    AccessorInterface,
    ReadableInterface,
    WritableInterface,
    TransformableInterface,
    DeepPaths,
    ValueAtPath,
} from "@safe-access-inline/safe-access-inline";
```

### Type-Safe Path Inference

```typescript
import type {
    DeepPaths,
    ValueAtPath,
} from "@safe-access-inline/safe-access-inline";

type AppConfig = {
    db: { host: string; port: number };
    cache: { enabled: boolean; ttl: number };
};

// Autocomplete all valid paths
type Paths = DeepPaths<AppConfig>;
// "db" | "db.host" | "db.port" | "cache" | "cache.enabled" | "cache.ttl"

// Resolve value types
type Host = ValueAtPath<AppConfig, "db.host">; // string
type TTL = ValueAtPath<AppConfig, "cache.ttl">; // number

// Build your own typed getter
function getTyped<P extends DeepPaths<AppConfig>>(
    accessor: AbstractAccessor,
    path: P,
): ValueAtPath<AppConfig, P> {
    return accessor.get(path) as ValueAtPath<AppConfig, P>;
}
```
