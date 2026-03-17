---
outline: deep
---

# API — Tipos & Internos — JavaScript / TypeScript

## Índice

- [PluginRegistry](#pluginregistry)
- [PathCache](#pathcache)
- [DotNotationParser](#dotnotationparser)
- [Erros](#erros)
- [Tipos TypeScript](#tipos-typescript)
- [Enums](#enums)

## PluginRegistry

**Import:** `import { PluginRegistry } from '@safe-access-inline/safe-access-inline'`

Registro central para plugins de parser e serializer. Todos os métodos são estáticos.

### Métodos de Parser

#### `PluginRegistry.registerParser(format: string, parser: ParserPlugin): void`

Registra um plugin parser para o formato dado. O plugin deve implementar `{ parse(raw: string): Record<string, unknown> }`.

```typescript
import type { ParserPlugin } from "@safe-access-inline/safe-access-inline";

const yamlParser: ParserPlugin = {
    parse: (raw) => jsYaml.load(raw) as Record<string, unknown>,
};

PluginRegistry.registerParser("yaml", yamlParser);
```

#### `PluginRegistry.hasParser(format: string): boolean`

Retorna `true` se um plugin parser estiver registrado para o formato.

#### `PluginRegistry.getParser(format: string): ParserPlugin`

Retorna o plugin parser registrado. Lança `UnsupportedTypeError` se não encontrado.

### Métodos de Serializer

#### `PluginRegistry.registerSerializer(format: string, serializer: SerializerPlugin): void`

Registra um plugin serializer para o formato dado. O plugin deve implementar `{ serialize(data: Record<string, unknown>): string }`.

```typescript
import type { SerializerPlugin } from "@safe-access-inline/safe-access-inline";

const yamlSerializer: SerializerPlugin = {
    serialize: (data) => jsYaml.dump(data),
};

PluginRegistry.registerSerializer("yaml", yamlSerializer);
```

#### `PluginRegistry.hasSerializer(format: string): boolean`

Retorna `true` se um plugin serializer estiver registrado para o formato.

#### `PluginRegistry.getSerializer(format: string): SerializerPlugin`

Retorna o plugin serializer registrado. Lança `UnsupportedTypeError` se não encontrado.

### Métodos Utilitários

#### `PluginRegistry.reset(): void`

Limpa todos os parsers e serializers registrados. Útil em teardowns de teste.

```typescript
afterEach(() => PluginRegistry.reset());
```

---

## PathCache

**Import:** `import { PathCache } from '@safe-access-inline/safe-access-inline'`

Cache LRU interno para caminhos dot-notation já analisados. Exportado para casos de uso avançados, como pré-aquecimento do cache ou limpeza entre execuções de teste.

#### `PathCache.get(path: string): unknown | undefined`

Obtém um resultado de análise em cache para a string de caminho fornecida.

#### `PathCache.set(path: string, value: unknown): void`

Armazena um resultado de análise no cache.

#### `PathCache.clear(): void`

Remove todas as entradas do cache.

---

## DotNotationParser

**Import:** `import { DotNotationParser } from '@safe-access-inline/safe-access-inline'`

Classe utilitária estática. Normalmente usada internamente, mas disponível para uso direto.

#### `DotNotationParser.get(data, path, defaultValue?): unknown`

Suporta expressões de caminho avançadas:

| Sintaxe           | Descrição                                                                     | Exemplo                 |
| ----------------- | ----------------------------------------------------------------------------- | ----------------------- |
| `a.b.c`           | Acesso a chave aninhada                                                       | `"user.profile.name"`   |
| `a[0]`            | Índice com colchetes                                                          | `"items[0].title"`      |
| `a.*`             | Wildcard — retorna array de valores                                           | `"users.*.name"`        |
| `a[?field>value]` | Filtro — retorna itens correspondentes                                        | `"products[?price>20]"` |
| `..key`           | Descida recursiva — coleta todos os valores de `key` em qualquer profundidade | `"..name"`              |

**Expressões de filtro** suportam:

- Comparação: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Lógicos: `&&` (AND), `\|\|` (OR)
- Valores: números, `'strings'`, `true`, `false`, `null`

```typescript
// Filtro: todos os usuários admin
DotNotationParser.get(data, "users[?role=='admin']");

// Filtro com comparação numérica + continuação de caminho
DotNotationParser.get(data, "products[?price>20].name");

// AND combinado
DotNotationParser.get(data, "items[?type=='fruit' && color=='red'].name");

// Descida recursiva: todos os valores "name" em qualquer profundidade
DotNotationParser.get(data, "..name");

// Descida + wildcard
DotNotationParser.get(data, "..items.*.id");

// Descida + filtro
DotNotationParser.get(data, "..employees[?active==true].name");
```

#### `DotNotationParser.has(data, path): boolean`

#### `DotNotationParser.set(data, path, value): Record<string, unknown>`

Retorna um novo objeto (usa `structuredClone`, não muta o input).

#### `DotNotationParser.merge(data, path, value): Record<string, unknown>`

Faz deep merge de `value` no `path` dado. Quando `path` é uma string vazia, mescla na raiz. Objetos são mesclados recursivamente; todos os outros valores são substituídos.

```typescript
const result = DotNotationParser.merge(data, "user.settings", {
    theme: "dark",
});
// Mescla { theme: "dark" } em data.user.settings
```

#### `DotNotationParser.remove(data, path): Record<string, unknown>`

Retorna um novo objeto (não muta o input).

---

## Erros

| Erro                     | Quando                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `AccessorError`          | Classe base de erro                                                                                                        |
| `InvalidFormatError`     | Formato de input inválido (ex: JSON malformado, plugin parser ausente)                                                     |
| `PathNotFoundError`      | Reservado (não lançado por `get()`)                                                                                        |
| `UnsupportedTypeError`   | Nenhum plugin serializer/parser registrado para o formato solicitado (ex: `toXml()` sem plugin)                            |
| `SecurityError`          | Violação de restrição de segurança (tamanho do payload, contagem de chaves, profundidade, segurança de URL, entidades XML) |
| `ReadonlyViolationError` | Tentativa de mutação em um accessor readonly                                                                               |
| `SchemaValidationError`  | Dados falham na validação de schema via `validate()`                                                                       |

Todos os erros estendem a classe base `Error` e `AccessorError`.

---

## Tipos TypeScript

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
    toYaml(): string;
    toToml(): string;
    toXml(rootElement?: string): string;
    transform(format: string): string;
}

interface ParserPlugin {
    parse(raw: string): Record<string, unknown>;
}
```

### Plugins Incluídos

O pacote inclui plugins de parser e serializer prontos para uso para substituir as implementações padrão de YAML/TOML:

```typescript
import {
    JsYamlParser,
    JsYamlSerializer,
    SmolTomlParser,
    SmolTomlSerializer,
} from "@safe-access-inline/safe-access-inline";
```

| Plugin               | Formato | Tipo       | Biblioteca  |
| -------------------- | ------- | ---------- | ----------- |
| `JsYamlParser`       | yaml    | Parser     | `js-yaml`   |
| `JsYamlSerializer`   | yaml    | Serializer | `js-yaml`   |
| `SmolTomlParser`     | toml    | Parser     | `smol-toml` |
| `SmolTomlSerializer` | toml    | Serializer | `smol-toml` |

```typescript
interface SerializerPlugin {
    serialize(data: Record<string, unknown>): string;
}
```

---

## Enums

### `Format`

**Import:** `import { Format } from '@safe-access-inline/safe-access-inline'`

Enum de string cobrindo todos os formatos built-in. Use como alternativa tipada a passar strings brutas para `SafeAccess.from()`.

| Membro          | Valor      |
| --------------- | ---------- |
| `Format.Array`  | `'array'`  |
| `Format.Object` | `'object'` |
| `Format.Json`   | `'json'`   |
| `Format.Xml`    | `'xml'`    |
| `Format.Yaml`   | `'yaml'`   |
| `Format.Toml`   | `'toml'`   |
| `Format.Ini`    | `'ini'`    |
| `Format.Csv`    | `'csv'`    |
| `Format.Env`    | `'env'`    |
| `Format.Ndjson` | `'ndjson'` |

### Utilitários de Inferência de Caminho

Inferência de caminho type-safe para validação de caminhos em tempo de compilação e resolução de valores:

```typescript
import type {
    DeepPaths,
    ValueAtPath,
} from "@safe-access-inline/safe-access-inline";

type Config = {
    db: { host: string; port: number };
    cache: { ttl: number; enabled: boolean };
};

// Todos os caminhos válidos em notação de ponto como tipo união
type ConfigPaths = DeepPaths<Config>;
// "db" | "db.host" | "db.port" | "cache" | "cache.ttl" | "cache.enabled"

// Resolver tipo do valor em um caminho específico
type Host = ValueAtPath<Config, "db.host">; // string
type Port = ValueAtPath<Config, "db.port">; // number

// Usar em assinaturas de função para type safety
function getConfig<P extends DeepPaths<Config>>(
    accessor: AbstractAccessor,
    path: P,
): ValueAtPath<Config, P> {
    return accessor.get(path) as ValueAtPath<Config, P>;
}

const host = getConfig(accessor, "db.host"); // tipado como string
```

#### `DeepPaths<T, Depth?>`

Gera uma união de todos os caminhos válidos em notação de ponto para o tipo `T`. Profundidade de recursão padrão: 7 níveis.

#### `ValueAtPath<T, P>`

Resolve o tipo do valor no caminho de notação de ponto `P` no tipo `T`. Retorna `unknown` para caminhos inválidos.
