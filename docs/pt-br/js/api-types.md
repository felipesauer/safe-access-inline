---
outline: deep
---

# API — Tipos & Internos — JavaScript / TypeScript

## Índice

- [PluginRegistry](#pluginregistry)
- [PathCache](#pathcache)
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

#### `PathCache.has(path: string): boolean`

Retorna `true` se o cache contiver uma entrada para o caminho fornecido.

#### `PathCache.size: number` _(getter)_

Número atual de entradas em cache.

#### `PathCache.configure(config: Partial<CacheConfig>): void`

Sobrescreve a configuração do cache (ex. `maxSize`). Mescla com a configuração padrão.

```typescript
PathCache.configure({ maxSize: 500 });
```

#### `PathCache.disable(): void`

Desativa o cache — chamadas subsequentes a `get()` sempre retornam `undefined`.

#### `PathCache.enable(): void`

Reativa o cache após uma chamada anterior a `disable()`.

#### `PathCache.isEnabled: boolean` _(getter)_

Indica se o cache está atualmente ativo.

---

## Erros

| Erro                     | Quando                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `AccessorError`          | Classe base de erro                                                                                                        |
| `InvalidFormatError`     | Formato de input inválido (ex: JSON malformado, plugin parser ausente)                                                     |
| `PathNotFoundError`      | Reservado (não lançado por `get()`)                                                                                        |
| `UnsupportedTypeError`   | Nenhum plugin serializer/parser registrado para o formato solicitado                                                       |
| `SecurityError`          | Violação de restrição de segurança (tamanho do payload, contagem de chaves, profundidade, segurança de URL, entidades XML) |
| `ReadonlyViolationError` | Tentativa de mutação em um accessor readonly                                                                               |

Todos os erros estendem a classe base `Error` e `AccessorError`.

### Capturando erros

```typescript
import {
    SafeAccess,
    InvalidFormatError,
    SecurityError,
    ReadonlyViolationError,
    UnsupportedTypeError,
} from "@safe-access-inline/safe-access-inline";

// Formato inválido
try {
    SafeAccess.fromJson("{invalid json}");
} catch (e) {
    if (e instanceof InvalidFormatError) {
        console.error("Falha no parse:", e.message);
    }
}

// Violação de política de segurança
try {
    const policy = { maxDepth: 2 };
    SafeAccess.withPolicy(deeplyNested, policy);
} catch (e) {
    if (e instanceof SecurityError) {
        console.error("Limite de segurança excedido:", e.message);
    }
}

// Tentativa de mutação em accessor readonly
try {
    const ro = SafeAccess.fromObject(config, { readonly: true });
    ro.set("key", "value"); // lança
} catch (e) {
    if (e instanceof ReadonlyViolationError) {
        console.error("O accessor é somente-leitura:", e.message);
    }
}

// Plugin de serializer ausente
try {
    accessor.toYaml();
} catch (e) {
    if (e instanceof UnsupportedTypeError) {
        console.error("Nenhum serializer registrado para yaml:", e.message);
    }
}
```

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
    toYaml(): string;
    toToml(): string;
    toXml(rootElement?: string): string;
}

interface ParserPlugin {
    parse(raw: string): Record<string, unknown>;
}

type ReadonlyAccessor = AbstractAccessor;
```

`ReadonlyAccessor` é um alias de conveniência para `AbstractAccessor` quando você quer anotar fluxos readonly ou imutáveis sem repetir o nome da classe concreta.

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

## Tipos Adicionais

### `ToJsonOptions`

Controles de saída opcionais para `toJson()`. Espelha o comportamento do `toJson()` do PHP (unicode/slashes não escapados por padrão).

```typescript
import type { ToJsonOptions } from "@safe-access-inline/safe-access-inline";

interface ToJsonOptions {
    /**
     * Quando `true`, substitui sequências de escape `\uXXXX` pelos caracteres Unicode reais
     * — equivalente ao `JSON_UNESCAPED_UNICODE` do PHP.
     * @defaultValue false
     */
    readonly unescapeUnicode?: boolean;

    /**
     * Quando `true`, substitui `\/` por `/` na saída
     * — equivalente ao `JSON_UNESCAPED_SLASHES` do PHP.
     * @defaultValue false
     */
    readonly unescapeSlashes?: boolean;

    /**
     * Indentação a usar quando `pretty` for `true`. Aceita um número (espaços) ou uma string (ex: `'\t'`).
     * @defaultValue 2
     */
    readonly space?: number | string;
}
```

```typescript
accessor.toJson(true, { unescapeUnicode: true, space: 4 });
// Gera saída compatível com PHP: sem sequências \uXXXX, indentação de 4 espaços
```

### `FilterCondition`

Uma única condição dentro de uma expressão de filtro analisada (ex: `[?age >= 18]`).

```typescript
import type { FilterCondition } from "@safe-access-inline/safe-access-inline";

interface FilterCondition {
    /** Caminho do campo a avaliar (ex: `"age"`, `"profile.name"`). */
    field: string;
    /** O operador de comparação. */
    operator: "==" | "!=" | ">" | "<" | ">=" | "<=";
    /** O valor para comparar. */
    value: unknown;
    /** Nome de função opcional (ex: `"length"`, `"match"`, `"keys"`). */
    func?: string;
    /** Argumentos de função opcionais. */
    funcArgs?: string[];
}
```

### `FilterExpression`

Uma expressão de filtro analisada composta por uma ou mais `FilterCondition`s unidas por operadores lógicos.

```typescript
import type { FilterExpression } from "@safe-access-inline/safe-access-inline";

interface FilterExpression {
    /** Lista ordenada de condições de comparação. */
    conditions: FilterCondition[];
    /** Operadores lógicos conectando condições adjacentes (`length === conditions.length - 1`). */
    logicals: ("&&" | "||")[];
}
```

```typescript
// A expressão `[?age>=18 && active==true]` é analisada como:
// {
//   conditions: [
//     { field: 'age', operator: '>=', value: 18 },
//     { field: 'active', operator: '==', value: true },
//   ],
//   logicals: ['&&'],
// }
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
| `Format.Env`    | `'env'`    |
| `Format.Ndjson` | `'ndjson'` |

### `SegmentType` <Badge type="warning" text="@internal" />

::: warning @internal
Este enum é um detalhe de implementação do parser de dot-notation. Não use em código de aplicação — a estrutura pode mudar em versões futuras.
:::

Discriminador para os tipos de segmento produzidos pelo parser de dot-notation.

| Membro                      | Valor             |
| --------------------------- | ----------------- |
| `SegmentType.KEY`           | `'key'`           |
| `SegmentType.INDEX`         | `'index'`         |
| `SegmentType.WILDCARD`      | `'wildcard'`      |
| `SegmentType.DESCENT`       | `'descent'`       |
| `SegmentType.DESCENT_MULTI` | `'descent-multi'` |
| `SegmentType.MULTI_INDEX`   | `'multi-index'`   |
| `SegmentType.MULTI_KEY`     | `'multi-key'`     |
| `SegmentType.FILTER`        | `'filter'`        |
| `SegmentType.SLICE`         | `'slice'`         |

### `PatchOperationType` <Badge type="warning" text="@internal" />

::: warning @internal
Este enum espelha os nomes das operações RFC 6902 JSON Patch usados internamente. Não use em código de aplicação.
:::

Enum string que espelha os nomes das operações RFC 6902 JSON Patch.

| Membro                       | Valor       |
| ---------------------------- | ----------- |
| `PatchOperationType.ADD`     | `'add'`     |
| `PatchOperationType.REMOVE`  | `'remove'`  |
| `PatchOperationType.REPLACE` | `'replace'` |
| `PatchOperationType.MOVE`    | `'move'`    |
| `PatchOperationType.COPY`    | `'copy'`    |
| `PatchOperationType.TEST`    | `'test'`    |
