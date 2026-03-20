---
outline: deep
---

# Recursos Avançados — JavaScript / TypeScript

## Índice

- [Operações de Array](#operações-de-array)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Configuração em Camadas](#configuração-em-camadas)
- [Referência de configuração](#referência-de-configuração)

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

## Referência de configuração

O pacote exporta interfaces de configuração e objetos default para consumidores avançados que precisam ajustar limites explicitamente.

### `SafeAccessConfig`

```typescript
interface SafeAccessConfig {
    readonly maxCustomAccessors: number;
}

const DEFAULT_SAFE_ACCESS_CONFIG: SafeAccessConfig = {
    maxCustomAccessors: 50,
};
```

Limita quantas classes de accessor customizadas podem ser registradas com `SafeAccess.extend()`.

### `CacheConfig`

```typescript
interface CacheConfig {
    readonly maxSize: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
    maxSize: 1000,
};
```

Controla o número máximo de caminhos dot-notation em cache retidos por `PathCache`.

### `ParserConfig`

```typescript
interface ParserConfig {
    readonly maxResolveDepth: number;
    readonly maxXmlDepth: number;
}

const DEFAULT_PARSER_CONFIG: ParserConfig = {
    maxResolveDepth: 512,
    maxXmlDepth: 100,
};
```

Define limites para resolução recursiva de caminhos e profundidade de XML.

### `MergerConfig`

```typescript
interface MergerConfig {
    readonly maxDepth: number;
}

const DEFAULT_MERGER_CONFIG: MergerConfig = {
    maxDepth: 512,
};
```

Limita a profundidade de recursão durante operações de deep merge.

### `MaskerConfig`

```typescript
interface MaskerConfig {
    readonly defaultMaskValue: string;
    readonly maxRecursionDepth: number;
    readonly maxPatternCacheSize: number;
}

const DEFAULT_MASKER_CONFIG: MaskerConfig = {
    defaultMaskValue: "[REDACTED]",
    maxRecursionDepth: 100,
    maxPatternCacheSize: 200,
};
```

Configura o valor de substituição, o limite de recursão e o cache de padrões curingas usado por `mask()`.

### `AuditConfig`

```typescript
interface AuditConfig {
    readonly maxListeners: number;
}

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
    maxListeners: 100,
};
```

Limita o número de listeners de auditoria registrados ao mesmo tempo.

### `FilterParserConfig`

```typescript
interface FilterParserConfig {
    readonly maxPatternLength: number;
}

const DEFAULT_FILTER_PARSER_CONFIG: FilterParserConfig = {
    maxPatternLength: 128,
};
```

Define o comprimento máximo de regex aceito por expressões `match()` em filtros.

### `IoLoaderConfig`

```typescript
interface IoLoaderConfig {
    readonly requestTimeoutMs: number;
    readonly connectTimeoutMs: number;
}

const DEFAULT_IO_LOADER_CONFIG: IoLoaderConfig = {
    requestTimeoutMs: 10_000,
    connectTimeoutMs: 5_000,
};
```

Controla o timeout total da requisição e o timeout de conexão para `fetchUrl()`. Esta exportação é destinada a customização avançada de I/O.
