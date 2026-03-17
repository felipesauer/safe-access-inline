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

### Trabalhando com CSV

```typescript
const csv = `name,age,city
Ana,30,Porto Alegre
Bob,25,São Paulo`;

const accessor = SafeAccess.fromCsv(csv);
accessor.get("0.name"); // "Ana"
accessor.get("1.city"); // "São Paulo"
accessor.get("*.name"); // ["Ana", "Bob"]
```

### Accessors customizados

```typescript
import { AbstractAccessor } from "@safe-access-inline/safe-access-inline";

class MyFormatAccessor extends AbstractAccessor {
    static from(data: unknown): MyFormatAccessor {
        return new MyFormatAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        // Sua lógica de parsing customizada
        return { parsed: raw };
    }

    clone(data: Record<string, unknown>): MyFormatAccessor {
        const inst = Object.create(MyFormatAccessor.prototype);
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }
}

// Registrar
SafeAccess.extend("myformat", MyFormatAccessor);

// Usar
const accessor = SafeAccess.custom("myformat", data);
accessor.get("parsed");
```

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

### Inferência de Caminhos com Tipagem

```typescript
import type {
    DeepPaths,
    ValueAtPath,
} from "@safe-access-inline/safe-access-inline";

type AppConfig = {
    db: { host: string; port: number };
    cache: { enabled: boolean; ttl: number };
};

// Autocomplete de todos os caminhos válidos
type Paths = DeepPaths<AppConfig>;
// "db" | "db.host" | "db.port" | "cache" | "cache.enabled" | "cache.ttl"

// Resolver tipos dos valores
type Host = ValueAtPath<AppConfig, "db.host">; // string
type TTL = ValueAtPath<AppConfig, "cache.ttl">; // number

// Construa seu próprio getter tipado
function getTyped<P extends DeepPaths<AppConfig>>(
    accessor: AbstractAccessor,
    path: P,
): ValueAtPath<AppConfig, P> {
    return accessor.get(path) as ValueAtPath<AppConfig, P>;
}
```
