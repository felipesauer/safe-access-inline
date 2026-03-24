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
    - [Format Conversion](#format-conversion)
    - [TypeScript Support](#typescript-support)

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

````

---\n\n## ESM and CommonJS

The package ships dual ESM/CJS builds:

```javascript
// ESM
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// CommonJS
const { SafeAccess } = require("@safe-access-inline/safe-access-inline");
````

---

## Format Conversion

Every accessor can be serialized to any supported format — no re-parsing needed. This makes cross-format conversion a one-liner:

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// YAML → JSON
const accessor = SafeAccess.fromYaml(`
app:
  name: MyApp
  version: "2.0"
database:
  host: localhost
  port: 5432
`);

accessor.toJson(true);
// {
//   "app": { "name": "MyApp", "version": "2.0" },
//   "database": { "host": "localhost", "port": 5432 }
// }

// JSON → TOML
const json = SafeAccess.fromJson('{"title":"My App","port":8080}');
json.toToml();
// title = "My App"
// port = 8080

// TOML → YAML
const toml = SafeAccess.fromToml(`
title = "Config"
[db]
host = "localhost"
`);
toml.toYaml();
// title: Config
// db:
//   host: localhost

// JSON → XML
const data = SafeAccess.fromJson('{"user":{"name":"Ana","role":"admin"}}');
data.toXml("root");
// <?xml version="1.0"?>
// <root><user><name>Ana</name><role>admin</role></user></root>
```

> **Tip:** Convert between formats as part of a build pipeline or data migration — load from one format, mutate immutably, serialize to another.

---

## TypeScript Support

Full TypeScript definitions are included. All public types are exported:

```typescript
import {
    SafeAccess,
    AbstractAccessor,
    TypeDetector,
    PluginRegistry,
    ArrayAccessor,
    ObjectAccessor,
    JsonAccessor,
    XmlAccessor,
    YamlAccessor,
    TomlAccessor,
    IniAccessor,
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
} from "@safe-access-inline/safe-access-inline";
```
