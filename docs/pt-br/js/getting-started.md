---
title: Primeiros Passos — JS/TS
nav_exclude: true
permalink: /pt-br/js/getting-started/
lang: pt-br
---

# Primeiros Passos — JavaScript / TypeScript

## Índice

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Uso Básico](#uso-básico)
- [Sistema de Plugins](#sistema-de-plugins)
- [Filtragem e Descida Recursiva](#filtragem-e-descida-recursiva)
- [Deep Merge](#deep-merge)
- [Exemplos de Plugins](#exemplos-de-plugins)
- [Trabalhando com Formatos](#trabalhando-com-formatos)
- [Accessors Customizados](#accessors-customizados)
- [ESM e CommonJS](#esm-e-commonjs)
- [Suporte TypeScript](#suporte-typescript)
- [Operações de Array](#operações-de-array)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Configuração em Camadas](#configuração-em-camadas)
- [Segurança](#segurança)
- [Validação de Schema](#validação-de-schema)
- [Log de Auditoria](#log-de-auditoria)
- [Integrações de Framework](#integrações-de-framework)

---

## Requisitos

- Node.js 22 ou superior
- TypeScript 5.5+ (para projetos TypeScript)

## Instalação

```bash
npm install @safe-access-inline/safe-access-inline
```

## Uso Básico

### Acessando dados com notação de ponto

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const json = '{"user": {"profile": {"name": "Ana", "age": 30}}}';
const accessor = SafeAccess.fromJson(json);

// Acesso simples
accessor.get("user.profile.name"); // "Ana"
accessor.get("user.profile.age"); // 30

// Acesso seguro — nunca lança, retorna valor padrão
accessor.get("user.email", "N/A"); // "N/A"
accessor.get("nonexistent.path"); // null (padrão)

// Verificar existência
accessor.has("user.profile.name"); // true
accessor.has("user.email"); // false
```

### Trabalhando com arrays e objetos

```typescript
const data = {
    users: [
        { name: "Ana", role: "admin" },
        { name: "Bob", role: "user" },
        { name: "Carol", role: "user" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Acesso por índice
accessor.get("users.0.name"); // "Ana"
accessor.get("users.2.role"); // "user"

// Wildcard — obter todos os valores correspondentes
accessor.get("users.*.name"); // ["Ana", "Bob", "Carol"]
accessor.get("users.*.role"); // ["admin", "user", "user"]
```

### Modificações imutáveis

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

// set() retorna uma NOVA instância
const modified = accessor.set("email", "ana@example.com");
modified.get("email"); // "ana@example.com"
accessor.get("email"); // null (original inalterado)

// remove() também retorna uma nova instância
const cleaned = accessor.remove("age");
cleaned.has("age"); // false
accessor.has("age"); // true (original inalterado)
```

### Auto-detecção de formato

```typescript
const arr = SafeAccess.detect([1, 2, 3]); // ArrayAccessor
const obj = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const json = SafeAccess.detect('{"key": "value"}'); // JsonAccessor
```

### Transformação cross-format

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

accessor.toArray(); // { name: "Ana", age: 30 }
accessor.toObject(); // cópia profunda como objeto plano
accessor.toJson(); // '{"name":"Ana","age":30}'
accessor.toJson(true); // JSON formatado

// YAML e TOML funcionam sem configuração (via js-yaml e smol-toml)
accessor.toYaml(); // "name: Ana\nage: 30\n"
accessor.toToml(); // 'name = "Ana"\nage = 30\n'
accessor.toXml("person"); // requer plugin serializer 'xml'
accessor.transform("yaml"); // genérico — usa PluginRegistry
```

> **Nota:** `toXml()` e `transform()` para formatos customizados requerem plugins serializer. `toYaml()` e `toToml()` funcionam sem configuração.

---

## Sistema de Plugins

YAML e TOML funcionam sem configuração usando `js-yaml` e `smol-toml` (incluídos como dependências). O Sistema de Plugins permite **substituir** os parsers e serializers padrão, ou registrar plugins para outros formatos (como XML).

### Substituindo Parsers Padrão

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";
import type {
    ParserPlugin,
    SerializerPlugin,
} from "@safe-access-inline/safe-access-inline";

// Substituir o parser YAML padrão com uma implementação customizada
const customYamlParser: ParserPlugin = {
    parse: (raw) => myCustomYamlLib.parse(raw),
};

PluginRegistry.registerParser("yaml", customYamlParser);

// fromYaml() agora usa seu parser customizado em vez de js-yaml
const accessor = SafeAccess.fromYaml(yamlContent);
```

### Registrando Plugins Serializer para XML

```typescript
// XML requer um plugin pois não há serializer XML padrão
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => myXmlLib.build(data),
});

accessor.toXml(); // usa seu plugin serializer XML
```

### Usando `transform()`

O método genérico `transform()` serializa dados para qualquer formato que tenha um serializer registrado:

```typescript
PluginRegistry.registerSerializer("csv", {
    serialize: (data) => {
        // Sua lógica de serialização CSV
        return Object.entries(data)
            .map(([k, v]) => `${k},${v}`)
            .join("\n");
    },
});

const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
accessor.transform("csv"); // "name,Ana\nage,30"
```

### Resetando Plugins (Testes)

Em suítes de teste, chame `reset()` para limpar todos os plugins registrados entre testes:

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";

afterEach(() => {
    PluginRegistry.reset();
});
```

---

## Filtragem e Descida Recursiva

### Expressões de filtro

Use `[?campo operador valor]` para filtrar arrays:

```typescript
const data = {
    products: [
        { name: "Laptop", price: 1200, category: "electronics" },
        { name: "Phone", price: 800, category: "electronics" },
        { name: "Book", price: 25, category: "education" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Filtrar por igualdade
accessor.get("products[?category=='electronics'].name");
// ["Laptop", "Phone"]

// Filtrar por comparação numérica
accessor.get("products[?price>500].name");
// ["Laptop", "Phone"]

// Combinar com AND / OR
accessor.get("products[?price>100 && category=='electronics'].name");
// ["Laptop", "Phone"]

accessor.get("products[?price>1000 || category=='education'].name");
// ["Laptop", "Book"]
```

### Descida recursiva

Use `..key` para coletar todos os valores com essa chave em qualquer profundidade:

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

### Combinando filtros com descida

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

// Nomes de todas as lojas ativas em todas as regiões
accessor.get("..stores[?active==true].name");
// ["Store A", "Store C"]
```

---

## Deep Merge

O método `merge()` faz deep-merge de objetos. Arrays e escalares são substituídos, objetos aninhados são mesclados recursivamente:

```typescript
const accessor = SafeAccess.fromObject({
    user: { name: "Ana", settings: { theme: "light", lang: "en" } },
});

// Merge em um caminho específico
const updated = accessor.merge("user.settings", {
    theme: "dark",
    notifications: true,
});
updated.get("user.settings.theme"); // "dark"
updated.get("user.settings.lang"); // "en" (preservado)
updated.get("user.settings.notifications"); // true

// Merge na raiz
const withMeta = accessor.merge({ version: "2.0", debug: false });
withMeta.get("version"); // "2.0"
withMeta.get("user.name"); // "Ana" (preservado)
```

---

## Exemplos de Plugins

### Plugin de Validação com Zod

Validar dados parseados contra um schema Zod:

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
config.get("db.host"); // "localhost" — validado no momento do carregamento
```

### Plugin Serializer XML Customizado

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

---

## Operações de Array

Todas as operações de array retornam **novas instâncias** — o original nunca é modificado.

```typescript
const accessor = SafeAccess.fromObject({
    tags: ["js", "ts", "js"],
    users: [
        { name: "Ana", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Carol", age: 30 },
    ],
});

// Adicionar itens
const pushed = accessor.push("tags", "safe-access");
// ['js', 'ts', 'js', 'safe-access']

// Remover último / primeiro
accessor.pop("tags"); // remove o último elemento
accessor.shift("tags"); // remove o primeiro elemento

// Inserir no início
accessor.unshift("tags", "first");

// Inserir no índice (suporta índices negativos)
accessor.insert("tags", 1, "inserted");

// Filtrar
accessor.filterAt("users", (u) => u.age >= 30);

// Map / transformar
accessor.mapAt("users", (u) => u.name);

// Ordenar
accessor.sortAt("users", "name"); // ascendente por 'name'
accessor.sortAt("users", "age", "desc"); // descendente por 'age'

// Único
accessor.unique("tags"); // remove 'js' duplicado
accessor.unique("users", "age"); // único por sub-chave

// Achatar
SafeAccess.fromObject({
    matrix: [
        [1, 2],
        [3, 4],
    ],
}).flatten("matrix");
// [1, 2, 3, 4]

// Helpers de acesso
accessor.first("users"); // { name: 'Ana', age: 30 }
accessor.last("users"); // { name: 'Carol', age: 30 }
accessor.nth("users", 1); // { name: 'Bob', age: 25 }
accessor.nth("users", -1); // { name: 'Carol', age: 30 }
```

---

## JSON Patch & Diff

Gere e aplique operações de JSON Patch conforme RFC 6902:

```typescript
import {
    SafeAccess,
    diff,
    applyPatch,
} from "@safe-access-inline/safe-access-inline";

const a = SafeAccess.fromObject({ name: "Ana", age: 30 });
const b = SafeAccess.fromObject({ name: "Ana", age: 31, city: "SP" });

// Método de instância
const ops = a.diff(b);
// [
//   { op: 'replace', path: '/age', value: 31 },
//   { op: 'add', path: '/city', value: 'SP' },
// ]

// Aplicar patch (retorna nova instância)
const patched = a.applyPatch([
    { op: "replace", path: "/age", value: 31 },
    { op: "add", path: "/city", value: "SP" },
]);

// Funções standalone também disponíveis
const ops2 = diff(a.all(), b.all());
const result = applyPatch(a.all(), ops2);
```

Operações suportadas: `add`, `replace`, `remove`, `move`, `copy`, `test`.

---

## I/O & Carregamento de Arquivos

### Carregar de arquivo

```typescript
// Auto-detectar formato pela extensão
const config = SafeAccess.fromFileSync("/app/config.json");

// Assíncrono
const config2 = await SafeAccess.fromFile("/app/config.yaml");

// Restringir diretórios permitidos (proteção contra path-traversal)
const safe = SafeAccess.fromFileSync("/app/config.json", undefined, ["/app"]);
```

### Carregar de URL

```typescript
// Apenas HTTPS, seguro contra SSRF
const data = await SafeAccess.fromUrl("https://api.example.com/config.json");

// Com restrições
const data2 = await SafeAccess.fromUrl("https://api.example.com/data", "json", {
    allowedHosts: ["api.example.com"],
    allowedPorts: [443],
    allowPrivateIps: false,
});
```

### Suporte a NDJSON

```typescript
const ndjson = '{"id":1}\n{"id":2}';
const accessor = SafeAccess.fromNdjson(ndjson);
accessor.get("0.id"); // 1
accessor.get("*.id"); // [1, 2]
accessor.toNdjson(); // volta para string NDJSON
```

---

## Configuração em Camadas

Mescle múltiplas fontes de configuração (último vence):

```typescript
// Camadas de instâncias accessor
const defaults = SafeAccess.fromFileSync("/app/config/defaults.json");
const overrides = SafeAccess.fromFileSync("/app/config/local.json");
const config = SafeAccess.layer([defaults, overrides]);

// Conveniência: camadas a partir de arquivos
const config2 = SafeAccess.layerFiles(
    ["/app/config/defaults.yaml", "/app/config/production.yaml"],
    ["/app/config"], // diretórios permitidos
);

// Observação de arquivos
const stop = SafeAccess.watchFile("/app/config.json", (accessor) => {
    console.log("Config atualizada:", accessor.get("version"));
});
// Depois: stop()
```

---

## Segurança

### SecurityPolicy

```typescript
import {
    SecurityPolicy,
    defaultPolicy,
    mergePolicy,
} from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = mergePolicy(defaultPolicy, {
    maxDepth: 128,
    maxPayloadBytes: 1_048_576,
    allowedDirs: ["/app/config"],
    url: { allowedHosts: ["api.example.com"] },
    csvMode: "strip",
    maskPatterns: ["password", /.*_token/],
});

// Carregar com política
const accessor = SafeAccess.withPolicy(jsonString, policy);
const fromFile = SafeAccess.fromFileWithPolicy("/app/config.json", policy);
const fromUrl = await SafeAccess.fromUrlWithPolicy(
    "https://api.example.com/config.json",
    policy,
);
```

### Mascaramento de dados

```typescript
const accessor = SafeAccess.fromObject({
    user: "Ana",
    password: "s3cret",
    api_key: "abc-123",
});

const safe = accessor.masked();
safe.get("password"); // '[REDACTED]'
safe.get("api_key"); // '[REDACTED]'
safe.get("user"); // 'Ana'

// Padrões customizados
const custom = accessor.masked(["custom_secret", /.*_token/]);
```

### Readonly & Deep Freeze

```typescript
// Readonly — lança ReadonlyViolationError ao tentar modificar
const ro = SafeAccess.fromObject({ key: "value" }, { readonly: true });
ro.get("key"); // 'value'
ro.set("key", "new"); // lança ReadonlyViolationError

// Deep freeze — previne poluição de protótipo no objeto de dados
SafeAccess.deepFreeze(myObject);
```

---

## Validação de Schema

```typescript
import { SchemaRegistry } from "@safe-access-inline/safe-access-inline";

// Registrar um adapter padrão (implemente SchemaAdapterInterface)
SchemaRegistry.setDefaultAdapter(myAdapter);

// Validar — lança SchemaValidationError em caso de falha
accessor.validate(schema);

// Encadeamento fluente
const name = accessor.validate(schema).get("name");
```

---

## Log de Auditoria

```typescript
const unsub = SafeAccess.onAudit((event) => {
    // event = { type: 'file.read', timestamp: 1234567890.123, detail: {...} }
    console.log(event.type, event.detail);
});

// Eventos: file.read, file.watch, url.fetch, security.violation,
//         data.mask, data.freeze, schema.validate

// Limpar
unsub();
SafeAccess.clearAuditListeners();
```

---

## Integrações de Framework

### NestJS

```typescript
import {
    SafeAccessModule,
    SAFE_ACCESS,
} from "@safe-access-inline/safe-access-inline";

// No seu módulo NestJS
@Module({
    imports: [
        SafeAccessModule.register({
            filePath: "./config.yaml",
            allowedDirs: ["./config"],
        }),
    ],
})
export class AppModule {}

// Injetar em um serviço
@Injectable()
export class ConfigService {
    constructor(@Inject(SAFE_ACCESS) private config: AbstractAccessor) {}

    getDbHost() {
        return this.config.get("database.host");
    }
}
```

### Vite

```typescript
import {
    safeAccessPlugin,
    loadConfig,
} from "@safe-access-inline/safe-access-inline";

// vite.config.ts
export default defineConfig({
    plugins: [
        safeAccessPlugin({
            files: ["./config/defaults.yaml", "./config/local.yaml"],
            virtualId: "virtual:app-config", // opcional, padrão é 'virtual:safe-access-config'
        }),
    ],
});

// Na sua aplicação
import config from "virtual:app-config";
// config é um accessor mesclado de todos os arquivos

// Ou carregue a config manualmente
const config2 = loadConfig(["./config/defaults.yaml", "./config/local.yaml"]);
```
