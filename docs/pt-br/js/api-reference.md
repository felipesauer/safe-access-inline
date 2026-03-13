---
title: Referência da API — JS/TS
nav_exclude: true
permalink: /pt-br/js/api-reference/
lang: pt-br
---

# Referência da API — JavaScript / TypeScript

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#métodos-de-instância-do-accessor)
- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Erros](#erros)
- [Tipos TypeScript](#tipos-typescript)

---

## Facade SafeAccess

**Import:** `import { SafeAccess } from '@safe-access-inline/safe-access-inline'`

### Métodos Factory

#### `SafeAccess.fromArray(data: unknown[]): ArrayAccessor`

Cria um accessor a partir de um array ou objeto.

```typescript
const accessor = SafeAccess.fromArray([{ name: "Ana" }, { name: "Bob" }]);
```

#### `SafeAccess.fromObject(data: Record<string, unknown>): ObjectAccessor`

Cria um accessor a partir de um objeto plano.

```typescript
const accessor = SafeAccess.fromObject({ name: "Ana", age: 30 });
```

#### `SafeAccess.fromJson(data: string): JsonAccessor`

Cria um accessor a partir de uma string JSON.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
```

#### `SafeAccess.fromXml(data: string): XmlAccessor`

Cria um accessor a partir de uma string XML.

```typescript
const accessor = SafeAccess.fromXml("<root><name>Ana</name></root>");
```

#### `SafeAccess.fromYaml(data: string): YamlAccessor`

Cria um accessor a partir de uma string YAML. Usa `js-yaml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```typescript
const accessor = SafeAccess.fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess.fromToml(data: string): TomlAccessor`

Cria um accessor a partir de uma string TOML. Usa `smol-toml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```typescript
const accessor = SafeAccess.fromToml('name = "Ana"');
```

#### `SafeAccess.fromIni(data: string): IniAccessor`

Cria um accessor a partir de uma string INI.

```typescript
const accessor = SafeAccess.fromIni("[section]\nkey = value");
```

#### `SafeAccess.fromCsv(data: string): CsvAccessor`

Cria um accessor a partir de uma string CSV (primeira linha = cabeçalhos).

```typescript
const accessor = SafeAccess.fromCsv("name,age\nAna,30");
```

#### `SafeAccess.fromEnv(data: string): EnvAccessor`

Cria um accessor a partir de uma string no formato `.env`.

```typescript
const accessor = SafeAccess.fromEnv("APP_NAME=MyApp\nDEBUG=true");
```

#### `SafeAccess.detect(data: unknown): AbstractAccessor`

Auto-detecta o formato e cria o accessor apropriado.

Prioridade de detecção: array → object → string JSON → string XML → string YAML → string INI → string ENV.

```typescript
const accessor = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const fromJson = SafeAccess.detect('{"name": "Ana"}'); // JsonAccessor
const fromXml = SafeAccess.detect("<root><name>Ana</name></root>"); // XmlAccessor
const fromYaml = SafeAccess.detect("name: Ana\nage: 30"); // YamlAccessor
```

#### `SafeAccess.extend(name: string, cls: Constructor): void`

Registra uma classe accessor customizada.

```typescript
SafeAccess.extend("custom", MyAccessor);
```

#### `SafeAccess.custom(name: string, data: unknown): AbstractAccessor`

Instancia um accessor customizado previamente registrado.

```typescript
const accessor = SafeAccess.custom("custom", data);
```

---

## Métodos de Instância do Accessor

Todos os accessors estendem `AbstractAccessor` e implementam o `AccessorInterface`.

### Leitura

#### `get(path: string, defaultValue?: unknown): unknown`

Acessa um valor via caminho em notação de ponto. **Nunca lança** — retorna `defaultValue` (padrão: `null`) se o caminho não for encontrado.

```typescript
accessor.get("user.name"); // valor ou null
accessor.get("user.email", "N/A"); // valor ou 'N/A'
accessor.get("users.*.name"); // array de valores (wildcard)
```

#### `getMany(paths: Record<string, unknown>): Record<string, unknown>`

Obtém múltiplos valores de uma vez. Chaves são caminhos, valores são padrões.

```typescript
accessor.getMany({
    "user.name": "Unknown",
    "user.email": "N/A",
});
// { 'user.name': 'Ana', 'user.email': 'N/A' }
```

#### `has(path: string): boolean`

Verifica se um caminho existe nos dados.

```typescript
accessor.has("user.name"); // true
accessor.has("missing"); // false
```

#### `type(path: string): string | null`

Retorna o tipo JavaScript do valor no caminho dado, ou `null` se o caminho não existir.

Valores possíveis: `"string"`, `"number"`, `"boolean"`, `"object"`, `"array"`, `"null"`, `"undefined"`.

```typescript
accessor.type("name"); // "string"
accessor.type("age"); // "number"
accessor.type("tags"); // "array"
accessor.type("x"); // null
```

#### `count(path?: string): number`

Conta elementos no caminho (ou na raiz).

```typescript
accessor.count(); // contagem de elementos raiz
accessor.count("items"); // contagem de items
```

#### `keys(path?: string): string[]`

Lista chaves no caminho (ou na raiz).

```typescript
accessor.keys(); // ['name', 'age', 'items']
```

#### `all(): Record<string, unknown>`

Retorna todos os dados como cópia rasa. Intenção semântica: "me dê tudo como está".

```typescript
accessor.all(); // { name: 'Ana', age: 30, ... }
```

### Escrita (Imutável)

#### `set(path: string, value: unknown): AbstractAccessor`

Retorna uma **nova instância** com o valor definido no caminho dado.

```typescript
const newAccessor = accessor.set("user.email", "ana@example.com");
// accessor inalterado, newAccessor tem o valor
```

#### `remove(path: string): AbstractAccessor`

Retorna uma **nova instância** com o caminho dado removido.

```typescript
const newAccessor = accessor.remove("user.age");
// accessor inalterado, newAccessor tem 'age' removido
```

### Transformação

#### `toArray(): Record<string, unknown>`

Retorna uma cópia rasa dos dados. Intenção semântica: "converter para formato array/objeto". Atualmente idêntico a `all()`, mas semanticamente distinto para extensibilidade futura.

#### `toJson(pretty?: boolean): string`

Converte para string JSON.

```typescript
accessor.toJson(); // compacto
accessor.toJson(true); // formatado com indentação de 2 espaços
```

#### `toObject(): Record<string, unknown>`

Retorna um deep clone dos dados (via `structuredClone`).

#### `toYaml(): string`

Serializa os dados para YAML. Usa `js-yaml` por padrão. Se um plugin serializer `'yaml'` for registrado via `PluginRegistry`, o plugin tem prioridade.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
accessor.toYaml(); // "name: Ana\n"
```

#### `toToml(): string`

Serializa os dados para TOML. Usa `smol-toml` por padrão. Se um plugin serializer `'toml'` for registrado via `PluginRegistry`, o plugin tem prioridade.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
accessor.toToml(); // 'name = "Ana"\n'
```

#### `toXml(rootElement?: string): string`

Serializa os dados para XML. Requer um plugin serializer `'xml'` registrado via `PluginRegistry`. Cai para `UnsupportedTypeError` se nenhum serializer estiver registrado. O parâmetro `rootElement` (padrão: `'root'`) é passado internamente mas o plugin serializer controla a saída real.

```typescript
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => {
        // Sua lógica de serialização XML
        return "<root>...</root>";
    },
});

accessor.toXml();
```

#### `transform(format: string): string`

Serializa os dados para qualquer formato que tenha um plugin serializer registrado. Lança `UnsupportedTypeError` se nenhum serializer for encontrado para o formato dado.

```typescript
accessor.transform("yaml"); // usa serializer 'yaml' registrado
accessor.transform("csv"); // usa serializer 'csv' registrado
```

---

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

## DotNotationParser

**Import:** `import { DotNotationParser } from '@safe-access-inline/safe-access-inline'`

Classe utilitária estática. Normalmente usada internamente, mas disponível para uso direto.

#### `DotNotationParser.get(data, path, defaultValue?): unknown`

#### `DotNotationParser.has(data, path): boolean`

#### `DotNotationParser.set(data, path, value): Record<string, unknown>`

Retorna um novo objeto (usa `structuredClone`, não muta o input).

#### `DotNotationParser.remove(data, path): Record<string, unknown>`

Retorna um novo objeto (não muta o input).

---

## Erros

| Erro                   | Quando                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `AccessorError`        | Classe base de erro                                                                             |
| `InvalidFormatError`   | Formato de input inválido (ex: JSON malformado, plugin parser ausente)                          |
| `PathNotFoundError`    | Reservado (não lançado por `get()`)                                                             |
| `UnsupportedTypeError` | Nenhum plugin serializer/parser registrado para o formato solicitado (ex: `toXml()` sem plugin) |

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

interface SerializerPlugin {
    serialize(data: Record<string, unknown>): string;
}
```

### Plugins Incluídos

O pacote inclui plugins prontos para uso de parser e serializer para substituir as implementações padrão YAML/TOML:

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
