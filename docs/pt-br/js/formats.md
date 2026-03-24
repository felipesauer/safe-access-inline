---
outline: deep
---

# Formatos & TypeScript — JavaScript / TypeScript

## Índice

- [Trabalhando com Formatos](#trabalhando-com-formatos)
- [ESM e CommonJS](#esm-e-commonjs)
- [Suporte TypeScript](#suporte-typescript)

## Trabalhando com Formatos

### Trabalhando com XML

```typescript
const xml = `<config><database><host>localhost</host><port>5432</port></database></config>`;

const accessor = SafeAccess.fromXml(xml);
accessor.get("database.host"); // "localhost"
accessor.get("database.port"); // "5432"
```

### Trabalhando com YAML

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

### Trabalhando com TOML

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

### Trabalhando com INI

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

### Trabalhando com ENV

```typescript
const env = `
APP_NAME=MyApp
APP_KEY="secret-key"
DEBUG=true
# Comentário
DB_HOST=localhost
`;

const accessor = SafeAccess.fromEnv(env);
accessor.get("APP_NAME"); // "MyApp"
accessor.get("APP_KEY"); // "secret-key"
```

## Conversão entre Formatos

Leia em qualquer formato e serialze para outro em um pipeline fluente:

**YAML → JSON**

```typescript
const accessor = SafeAccess.fromYaml(yamlString);
const json = accessor.toJson(true);
```

**JSON → TOML**

```typescript
const accessor = SafeAccess.fromJson(jsonString);
const toml = accessor.toToml();
```

**TOML → YAML**

```typescript
const accessor = SafeAccess.fromToml(tomlString);
const yaml = accessor.toYaml();
```

**JSON → XML**

```typescript
const accessor = SafeAccess.fromJson(jsonString);
const xml = accessor.toXml("root");
```

---

## ESM e CommonJS

O pacote inclui builds duplos ESM/CJS:

```javascript
// ESM
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// CommonJS
const { SafeAccess } = require("@safe-access-inline/safe-access-inline");
```

## Suporte TypeScript

Definições TypeScript completas estão incluídas. Todos os tipos públicos são exportados:

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
