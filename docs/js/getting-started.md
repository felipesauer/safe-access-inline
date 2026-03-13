---
title: Getting Started
parent: JavaScript / TypeScript
nav_order: 1
permalink: /js/getting-started/
---

# Getting Started — JavaScript / TypeScript

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Plugin System](#plugin-system)
- [Working with Formats](#working-with-formats)
- [Filtering and Recursive Descent](#filtering-and-recursive-descent)
- [Deep Merge](#deep-merge)
- [Plugin Examples](#plugin-examples)
- [Custom Accessors](#custom-accessors)
- [ESM and CommonJS](#esm-and-commonjs)
- [TypeScript Support](#typescript-support)

---

## Requirements

- Node.js 22 or higher
- TypeScript 5.5+ (for TypeScript projects)

## Installation

```bash
npm install @safe-access-inline/safe-access-inline
```

## Basic Usage

### Accessing data with dot notation

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const json = '{"user": {"profile": {"name": "Ana", "age": 30}}}';
const accessor = SafeAccess.fromJson(json);

// Simple access
accessor.get("user.profile.name"); // "Ana"
accessor.get("user.profile.age"); // 30

// Safe access — never throws, returns default
accessor.get("user.email", "N/A"); // "N/A"
accessor.get("nonexistent.path"); // null (default)

// Check existence
accessor.has("user.profile.name"); // true
accessor.has("user.email"); // false
```

### Working with arrays and objects

```typescript
const data = {
    users: [
        { name: "Ana", role: "admin" },
        { name: "Bob", role: "user" },
        { name: "Carol", role: "user" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Access by index
accessor.get("users.0.name"); // "Ana"
accessor.get("users.2.role"); // "user"

// Wildcard — get all matching values
accessor.get("users.*.name"); // ["Ana", "Bob", "Carol"]
accessor.get("users.*.role"); // ["admin", "user", "user"]
```

### Immutable modifications

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

// set() returns a NEW instance
const modified = accessor.set("email", "ana@example.com");
modified.get("email"); // "ana@example.com"
accessor.get("email"); // null (original unchanged)

// remove() also returns a new instance
const cleaned = accessor.remove("age");
cleaned.has("age"); // false
accessor.has("age"); // true (original unchanged)
```

### Format auto-detection

```typescript
const arr = SafeAccess.detect([1, 2, 3]); // ArrayAccessor
const obj = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const json = SafeAccess.detect('{"key": "value"}'); // JsonAccessor
```

### Cross-format transformation

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

accessor.toArray(); // { name: "Ana", age: 30 }
accessor.toObject(); // deep clone as plain object
accessor.toJson(); // '{"name":"Ana","age":30}'
accessor.toJson(true); // pretty-printed JSON

// YAML and TOML work zero-config (powered by js-yaml and smol-toml)
accessor.toYaml(); // "name: Ana\nage: 30\n"
accessor.toToml(); // 'name = "Ana"\nage = 30\n'
accessor.toXml("person"); // requires 'xml' serializer plugin
accessor.transform("yaml"); // generic — uses PluginRegistry
```

> **Note:** `toXml()` and `transform()` for custom formats require serializer plugins. `toYaml()` and `toToml()` work out of the box.

---

## Plugin System

YAML and TOML work out of the box using `js-yaml` and `smol-toml` (shipped as dependencies). The Plugin System lets you **override** the default parsers and serializers, or register plugins for other formats (like XML).

### Overriding Default Parsers

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";
import type {
    ParserPlugin,
    SerializerPlugin,
} from "@safe-access-inline/safe-access-inline";

// Override the default YAML parser with a custom implementation
const customYamlParser: ParserPlugin = {
    parse: (raw) => myCustomYamlLib.parse(raw),
};

PluginRegistry.registerParser("yaml", customYamlParser);

// fromYaml() now uses your custom parser instead of js-yaml
const accessor = SafeAccess.fromYaml(yamlContent);
```

### Registering Serializer Plugins for XML

```typescript
// XML requires a plugin since there's no default XML serializer
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => myXmlLib.build(data),
});

accessor.toXml(); // uses your XML serializer plugin
```

### Using `transform()`

The generic `transform()` method serializes data to any format that has a registered serializer:

```typescript
PluginRegistry.registerSerializer("csv", {
    serialize: (data) => {
        // Your CSV serialization logic
        return Object.entries(data)
            .map(([k, v]) => `${k},${v}`)
            .join("\n");
    },
});

const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
accessor.transform("csv"); // "name,Ana\nage,30"
```

### Resetting Plugins (Testing)

In test suites, call `reset()` to clear all registered plugins between tests:

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";

afterEach(() => {
    PluginRegistry.reset();
});
```

---

## Filtering and Recursive Descent

### Filter expressions

Use `[?field operator value]` to filter arrays:

```typescript
const data = {
    products: [
        { name: "Laptop", price: 1200, category: "electronics" },
        { name: "Phone", price: 800, category: "electronics" },
        { name: "Book", price: 25, category: "education" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Filter by equality
accessor.get("products[?category=='electronics'].name");
// ["Laptop", "Phone"]

// Filter by numeric comparison
accessor.get("products[?price>500].name");
// ["Laptop", "Phone"]

// Combine with AND / OR
accessor.get("products[?price>100 && category=='electronics'].name");
// ["Laptop", "Phone"]

accessor.get("products[?price>1000 || category=='education'].name");
// ["Laptop", "Book"]
```

### Recursive descent

Use `..key` to collect all values with that key at any nesting depth:

```typescript
const org = {
    name: "Corp",
    departments: {
        engineering: {
            name: "Engineering",
            teams: {
                frontend: { name: "Frontend", members: 5 },
                backend: { name: "Backend", members: 8 },
            },
        },
        marketing: { name: "Marketing", members: 3 },
    },
};

const accessor = SafeAccess.fromObject(org);
accessor.get("..name");
// ["Corp", "Engineering", "Frontend", "Backend", "Marketing"]

accessor.get("..members");
// [5, 8, 3]
```

### Combining filters with descent

```typescript
const data = {
    region1: {
        stores: [
            { name: "Store A", revenue: 50000, active: true },
            { name: "Store B", revenue: 20000, active: false },
        ],
    },
    region2: {
        stores: [{ name: "Store C", revenue: 80000, active: true }],
    },
};

const accessor = SafeAccess.fromObject(data);

// All active store names across all regions
accessor.get("..stores[?active==true].name");
// ["Store A", "Store C"]
```

---

## Deep Merge

The `merge()` method deep-merges objects. Arrays and scalars are replaced, nested objects are merged recursively:

```typescript
const accessor = SafeAccess.fromObject({
    user: { name: "Ana", settings: { theme: "light", lang: "en" } },
});

// Merge at a specific path
const updated = accessor.merge("user.settings", {
    theme: "dark",
    notifications: true,
});
updated.get("user.settings.theme"); // "dark"
updated.get("user.settings.lang"); // "en" (preserved)
updated.get("user.settings.notifications"); // true

// Merge at root
const withMeta = accessor.merge({ version: "2.0", debug: false });
withMeta.get("version"); // "2.0"
withMeta.get("user.name"); // "Ana" (preserved)
```

---

## Plugin Examples

### Zod Validation Plugin

Validate parsed data against a Zod schema:

```typescript
import { z } from "zod";
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const ConfigSchema = z.object({
    db: z.object({
        host: z.string(),
        port: z.number().int().positive(),
    }),
    cache: z.object({
        ttl: z.number().default(3600),
    }),
});

function loadConfig(raw: string) {
    const accessor = SafeAccess.fromYaml(raw);
    const parsed = ConfigSchema.parse(accessor.all());
    return SafeAccess.fromObject(parsed);
}

const config = loadConfig(
    "db:\n  host: localhost\n  port: 5432\ncache:\n  ttl: 600",
);
config.get("db.host"); // "localhost" — validated at load time
```

### Custom XML Serializer Plugin

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";
import type { SerializerPlugin } from "@safe-access-inline/safe-access-inline";
import { create } from "xmlbuilder2";

const xmlSerializer: SerializerPlugin = {
    serialize: (data) => {
        const doc = create({ version: "1.0" }).ele("root");
        function build(parent: any, obj: Record<string, unknown>) {
            for (const [key, value] of Object.entries(obj)) {
                if (
                    typeof value === "object" &&
                    value !== null &&
                    !Array.isArray(value)
                ) {
                    build(parent.ele(key), value as Record<string, unknown>);
                } else {
                    parent.ele(key).txt(String(value));
                }
            }
        }
        build(doc, data);
        return doc.end({ prettyPrint: true });
    },
};

PluginRegistry.registerSerializer("xml", xmlSerializer);
```

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

## ESM and CommonJS

The package ships dual ESM/CJS builds:

```javascript
// ESM
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// CommonJS
const { SafeAccess } = require("@safe-access-inline/safe-access-inline");
```

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
