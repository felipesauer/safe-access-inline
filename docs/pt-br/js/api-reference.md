---
outline: deep
---

# Referência da API — JavaScript / TypeScript

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#metodos-de-instancia-do-accessor)
- [Desempenho: Caminhos Compilados](#desempenho-caminhos-compilados)
- [Operações de Array (Imutável)](#operacoes-de-array-imutavel)
- [Segurança & Validação](#seguranca-validacao)
- [Injeção de Dependência](#injecao-de-dependencia)
- [Tipos de I/O](#tipos-de-io)
- [Funções Utilitárias de Segurança](#funcoes-utilitarias-de-seguranca)
  **Ver também:**

- [API — Operações & I/O](/pt-br/js/api-features)
- [API — Tipos & Internos](/pt-br/js/api-types)

---

## Facade SafeAccess

**Import:** `import { SafeAccess } from '@safe-access-inline/safe-access-inline'`

### Métodos Factory

#### `SafeAccess.fromArray(data: unknown[], options?: { readonly?: boolean }): ArrayAccessor`

Cria um accessor a partir de um array. Passe `{ readonly: true }` para prevenir mutações.

```typescript
const accessor = SafeAccess.fromArray([{ name: "Ana" }, { name: "Bob" }]);
const ro = SafeAccess.fromArray([1, 2, 3], { readonly: true });
```

#### `SafeAccess.fromObject(data: Record<string, unknown>, options?: { readonly?: boolean }): ObjectAccessor`

Cria um accessor a partir de um objeto plano. Passe `{ readonly: true }` para prevenir mutações.

```typescript
const accessor = SafeAccess.fromObject({ name: "Ana", age: 30 });
const ro = SafeAccess.fromObject({ key: "value" }, { readonly: true });
```

#### `SafeAccess.fromJson(data: string, options?: { readonly?: boolean }): JsonAccessor`

Cria um accessor a partir de uma string JSON.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
```

#### `SafeAccess.fromXml(data: string, options?: { readonly?: boolean }): XmlAccessor`

Cria um accessor a partir de uma string XML.

```typescript
const accessor = SafeAccess.fromXml("<root><name>Ana</name></root>");
```

#### `SafeAccess.fromYaml(data: string, options?: { readonly?: boolean }): YamlAccessor`

Cria um accessor a partir de uma string YAML. Usa `js-yaml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```typescript
const accessor = SafeAccess.fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess.fromToml(data: string, options?: { readonly?: boolean }): TomlAccessor`

Cria um accessor a partir de uma string TOML. Usa `smol-toml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```typescript
const accessor = SafeAccess.fromToml('name = "Ana"');
```

#### `SafeAccess.fromIni(data: string, options?: { readonly?: boolean }): IniAccessor`

Cria um accessor a partir de uma string INI.

```typescript
const accessor = SafeAccess.fromIni("[section]\nkey = value");
```

#### `SafeAccess.fromCsv(data: string, options?: { readonly?: boolean }): CsvAccessor`

Cria um accessor a partir de uma string CSV (primeira linha = cabeçalhos).

```typescript
const accessor = SafeAccess.fromCsv("name,age\nAna,30");
```

#### `SafeAccess.fromEnv(data: string, options?: { readonly?: boolean }): EnvAccessor`

Cria um accessor a partir de uma string no formato `.env`.

```typescript
const accessor = SafeAccess.fromEnv("APP_NAME=MyApp\nDEBUG=true");
```

#### `SafeAccess.fromNdjson(data: string, options?: { readonly?: boolean }): NdjsonAccessor`

Cria um accessor a partir de uma string JSON delimitada por linhas (NDJSON).

```typescript
const accessor = SafeAccess.fromNdjson('{"id":1}\n{"id":2}');
```

#### `SafeAccess.from(data: unknown, format?: string | Format): AbstractAccessor`

Fábrica unificada — cria um accessor a partir de qualquer dado. Com uma string de formato ou um valor do enum `Format`, delega para a fábrica tipada correspondente. Sem formato, detecta automaticamente (equivalente a `detect()`).

Formatos suportados: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'csv'`, `'env'`, ou qualquer nome customizado registrado via `extend()`. Todos os formatos built-in também estão disponíveis como membros do enum `Format`.

Os overloads TypeScript preservam o tipo de retorno específico para cada formato conhecido — tanto string literals quanto valores do enum `Format` são totalmente tipados.

```typescript
import { SafeAccess, Format } from "@safe-access-inline/safe-access-inline";

// Auto-detecção (sem formato)
const accessor = SafeAccess.from('{"name": "Ana"}'); // JsonAccessor

// Formato explícito via string
const json = SafeAccess.from('{"name": "Ana"}', "json");
const yaml = SafeAccess.from("name: Ana", "yaml");

// Formato explícito via enum
const json2 = SafeAccess.from('{"name": "Ana"}', Format.Json);
const yaml2 = SafeAccess.from("name: Ana", Format.Yaml);
const xml = SafeAccess.from("<root><n>1</n></root>", Format.Xml);
const arr = SafeAccess.from([1, 2, 3], Format.Array);

// Formato customizado (apenas string)
SafeAccess.extend("custom", MyAccessor);
const custom = SafeAccess.from(data, "custom");
```

Lança `InvalidFormatError` se o formato for desconhecido e não estiver registrado.

#### `SafeAccess.detect(data: unknown): AbstractAccessor`

Auto-detecta o formato e cria o accessor apropriado.

Prioridade de detecção: array → object → string JSON (com fallback NDJSON) → string XML → string YAML → string TOML → string INI → string ENV.

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

## Desempenho: Caminhos Compilados

Pré-compile caminhos em notação de ponto que são acessados repetidamente para evitar re-análise a cada chamada.

#### `SafeAccess.compilePath(path: string): CompiledPath`

Analisa um caminho em notação de ponto uma única vez e retorna um objeto `CompiledPath` opaco. Passe-o para `getCompiled()` para resolver valores sem re-tokenizar o caminho a cada chamada. Indicado para laços com muitas iterações ou caminhos críticos de performance.

**Parâmetros:**

- `path` — caminho em notação de ponto a compilar (ex.: `"user.address.city"`).

**Retorno:** Uma instância de `CompiledPath` (handle opaco — não acesse campos internos diretamente).

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// Compilar uma vez
const caminhosCompilado = SafeAccess.compilePath("user.address.city");

// Reutilizar em vários accessors — sem re-análise
const a = SafeAccess.fromObject({ user: { address: { city: "São Paulo" } } });
const b = SafeAccess.fromObject({ user: { address: { city: "Lisboa" } } });

a.getCompiled(caminhosCompilado); // "São Paulo"
b.getCompiled(caminhosCompilado); // "Lisboa"
```

#### `getCompiled(compiled: CompiledPath, defaultValue?: unknown): unknown`

Resolve o caminho pré-compilado (veja [`SafeAccess.compilePath()`](#safeaccess-compilepath-path-string-compiledpath)) nos dados deste accessor. Prefira este método em vez de `get()` em laços onde o mesmo caminho é lido repetidamente.

```typescript
const compilado = SafeAccess.compilePath("app.timeout");
const accessor = SafeAccess.fromObject({ app: { timeout: 30 } });

accessor.getCompiled(compilado); // 30
accessor.getCompiled(compilado, 60); // 30 (caminho existe)

const vazio = SafeAccess.fromObject({});
vazio.getCompiled(compilado); // null
vazio.getCompiled(compilado, 60); // 60
```

::: tip Dica de performance
`compilePath()` combinado com `getCompiled()` tem desempenho superior ao `get()` em laços onde o mesmo caminho é usado centenas ou milhares de vezes. Para acesso pontual, prefira a API mais simples com `get()`.
:::

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
accessor.get("users[?role=='admin'].name"); // valores filtrados
accessor.get("..name"); // descida recursiva
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

#### `getWildcard<T = unknown>(path: string, defaultValue?: T[]): T[]`

Wrapper de conveniência para caminhos com wildcard — sempre retorna um array tipado. Equivalente a chamar `get()` com um caminho contendo `*` ou `.**`, mas com garantia explícita de retorno como array tipado.

```typescript
accessor.getWildcard("users.*.name"); // ['Alice', 'Bob', 'Charlie']
accessor.getWildcard("items.*.price", []); // [] se caminho não encontrado
accessor.getWildcard<number>("prices.*", [0]); // [1.99, 2.49, 3.00]
```

#### `has(path: string): boolean`

Verifica se um caminho existe nos dados.

```typescript
accessor.has("user.name"); // true
accessor.has("missing"); // false
```

#### `getTemplate(template: string, bindings: Record<string, string | number>, defaultValue?: unknown): unknown`

Resolve uma string de template substituindo placeholders `{key}` com valores dos bindings, e então lê o caminho resultante.

```typescript
accessor.getTemplate("users.{id}.name", { id: 0 }); // 'Ana'
accessor.getTemplate(
    "settings.{section}.{key}",
    { section: "db", key: "host" },
    "localhost",
);
```

#### `getAt(segments: string[], defaultValue?: unknown): unknown`

Acessa um valor via array de segmentos de caminho (alternativa programática a strings com notação de ponto).

```typescript
accessor.getAt(["users", "0", "name"]); // 'Ana'
```

#### `getCompiled(compiled: CompiledPath, defaultValue?: unknown): unknown`

Resolve um caminho pré-compilado (veja [`SafeAccess.compilePath()`](#safeaccess-compilepath-path-string-compiledpath)) nos dados deste accessor. Prefira este método em laços onde o mesmo caminho é lido repetidamente.

```typescript
const compilado = SafeAccess.compilePath("user.name");
accessor.getCompiled(compilado); // 'Ana'
accessor.getCompiled(compilado, "N/A"); // 'Ana' se existir, 'N/A' se ausente
```

#### `hasAt(segments: string[]): boolean`

Verifica se um caminho existe usando um array de segmentos.

#### `type(path: string): string | null`

Retorna o tipo normalizado do valor no caminho dado, ou `null` se o caminho não existir.

Valores possíveis: `"string"`, `"number"`, `"bool"`, `"object"`, `"array"`, `"null"`.

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

#### `merge(value: Record<string, unknown>): AbstractAccessor`

#### `merge(path: string, value: Record<string, unknown>): AbstractAccessor`

Faz deep merge de dados na raiz ou em um caminho específico. Retorna uma **nova instância**. Objetos são mesclados recursivamente; arrays e escalares são substituídos.

```typescript
// Merge na raiz
const merged = accessor.merge({ theme: "dark", notifications: true });

// Merge em caminho
const merged = accessor.merge("user.settings", { theme: "dark" });
```

#### `remove(path: string): AbstractAccessor`

Retorna uma **nova instância** com o caminho dado removido.

```typescript
const newAccessor = accessor.remove("user.age");
// accessor inalterado, newAccessor tem 'age' removido
```

#### `setAt(segments: string[], value: unknown): AbstractAccessor`

Define um valor usando um array de segmentos de caminho. Retorna uma **nova instância**.

```typescript
const newAccessor = accessor.setAt(["user", "email"], "ana@example.com");
```

#### `removeAt(segments: string[]): AbstractAccessor`

Remove um caminho usando um array de segmentos. Retorna uma **nova instância**.

### Transformação

#### `toArray(): Record<string, unknown>`

Retorna uma cópia rasa dos dados. Intenção semântica: "converter para formato array/objeto". Atualmente idêntico a `all()`, mas semanticamente distinto para extensibilidade futura.

#### `toJson(pretty?: boolean, options?: ToJsonOptions): string`

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

Serializa os dados para XML. Usa um serializador XML interno por padrão — produz `<?xml version="1.0"?><root>...</root>`. Se um plugin serializer `'xml'` for registrado via `PluginRegistry`, o plugin tem prioridade. O parâmetro `rootElement` (padrão: `'root'`) define o nome do elemento raiz XML.

```typescript
// Serializador interno (sem necessidade de plugin)
accessor.toXml(); // <?xml version="1.0"?>\n<root>...</root>
accessor.toXml("config"); // <?xml version="1.0"?>\n<config>...</config>

// Registre um plugin para substituir o serializador interno
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => myXmlLib.build(data),
});
accessor.toXml(); // usa seu plugin
```

#### `toNdjson(): string`

Serializa os dados para JSON delimitado por linhas. Cada item de array de nível superior se torna uma linha JSON.

```typescript
accessor.toNdjson(); // '{"id":1}\n{"id":2}'
```

#### `toCsv(csvMode?: 'none' | 'prefix' | 'strip' | 'error'): string`

Serializa os dados para formato CSV. O parâmetro opcional `csvMode` controla a sanitização de injeção CSV.

```typescript
accessor.toCsv(); // padrão: sem sanitização
accessor.toCsv("strip"); // remove caracteres iniciais perigosos
```

#### `transform(format: string): string`

Serializa os dados para qualquer formato que tenha um plugin serializer registrado. Lança `UnsupportedTypeError` se nenhum serializer for encontrado para o formato dado.

```typescript
accessor.transform("yaml"); // usa serializer 'yaml' registrado
accessor.transform("csv"); // usa serializer 'csv' registrado
```

### Operações de Array (Imutável)

Todas as operações de array retornam **novas instâncias** — o original nunca é mutado.

#### `push(path: string, ...items: unknown[]): AbstractAccessor`

Acrescenta itens ao final do array em `path`.

```typescript
const updated = accessor.push("tags", "typescript", "safe");
```

#### `pop(path: string): AbstractAccessor`

Remove o último item do array em `path`.

```typescript
const updated = accessor.pop("tags");
```

#### `shift(path: string): AbstractAccessor`

Remove o primeiro item do array em `path`.

```typescript
const updated = accessor.shift("queue");
```

#### `unshift(path: string, ...items: unknown[]): AbstractAccessor`

Insere itens no início do array em `path`.

```typescript
const updated = accessor.unshift("queue", "first");
```

#### `insert(path: string, index: number, ...items: unknown[]): AbstractAccessor`

Insere itens em um índice específico do array em `path`. Suporta índices negativos.

```typescript
const updated = accessor.insert("items", 1, "inserted");
const updated2 = accessor.insert("items", -1, "before-last");
```

#### `filterAt(path: string, predicate: (item: unknown, index: number) => boolean): AbstractAccessor`

Filtra itens do array em `path` usando um predicado.

```typescript
const updated = accessor.filterAt("users", (u) => (u as any).active === true);
```

#### `mapAt(path: string, transform: (item: unknown, index: number) => unknown): AbstractAccessor`

Transforma cada item do array em `path` usando `transform`.

```typescript
const updated = accessor.mapAt("prices", (p) => (p as number) * 1.1);
```

#### `sortAt(path: string, key?: string, direction?: 'asc' | 'desc'): AbstractAccessor`

Ordena o array em `path`. Opcionalmente por uma sub-chave. Direção: `'asc'` (padrão) ou `'desc'`.

```typescript
const sorted = accessor.sortAt("users", "name");
const desc = accessor.sortAt("scores", undefined, "desc");
```

#### `unique(path: string, key?: string): AbstractAccessor`

Remove valores duplicados do array em `path`. Opcionalmente deduplica por uma sub-chave.

```typescript
const updated = accessor.unique("tags");
const updated2 = accessor.unique("users", "email");
```

#### `flatten(path: string, depth?: number): AbstractAccessor`

Nivela arrays aninhados em `path` por `depth` níveis (padrão `1`).

```typescript
const updated = accessor.flatten("matrix"); // 1 nível
const updated2 = accessor.flatten("deep", Infinity); // totalmente nivelado
```

#### `first(path: string, defaultValue?: unknown): unknown`

Retorna o primeiro elemento do array em `path`.

```typescript
accessor.first("items"); // primeiro item ou null
accessor.first("items", "none"); // primeiro item ou "none"
```

#### `last(path: string, defaultValue?: unknown): unknown`

Retorna o último elemento do array em `path`.

```typescript
accessor.last("items"); // último item ou null
```

#### `nth(path: string, index: number, defaultValue?: unknown): unknown`

Retorna o elemento no índice `index`. Suporta índices negativos (`-1` = último).

```typescript
accessor.nth("items", 0); // primeiro
accessor.nth("items", -1); // último
accessor.nth("items", 99, "fallback"); // "fallback"
```

### Segurança & Validação

#### `mask(patterns?: MaskPattern[]): AbstractAccessor`

Retorna uma **nova instância** com valores sensíveis mascarados. Sem patterns, auto-detecta chaves sensíveis comuns (password, secret, token, api_key, etc.). Com patterns, mascara adicionalmente chaves que correspondem aos padrões wildcard.

```typescript
const safe = accessor.mask(); // auto-mascara chaves comuns
const custom = accessor.mask(["api_*", "credentials"]); // padrões customizados
```

#### `validate<TSchema>(schema: TSchema, adapter?: SchemaAdapterInterface): SchemaValidationResult`

Valida os dados contra um schema usando o adapter fornecido (ou o adapter padrão definido via `SchemaRegistry`). Retorna um `SchemaValidationResult` — verifique `result.valid` para determinar o sucesso. Não lança exceção em caso de falha na validação.

```typescript
import { SchemaRegistry } from "@safe-access-inline/safe-access-inline";

// Registrar um adapter de schema padrão (ex: Zod)
SchemaRegistry.setDefaultAdapter(myZodAdapter);

// Validar e verificar resultado
const result = accessor.validate(mySchema);
if (result.valid) {
    accessor.get("name"); // acesso seguro
} else {
    console.log(result.errors);
}
```

### Readonly

Todos os métodos factory (`fromJson`, `fromArray`, etc.) aceitam `{ readonly: true }` para criar um accessor que lança `ReadonlyViolationError` em qualquer mutação. Você também pode congelar uma instância existente em tempo de execução.

#### `freeze(): AbstractAccessor`

Retorna uma cópia congelada deste accessor. Todas as operações de escrita subsequentes lançarão `ReadonlyViolationError`.

```typescript
const frozen = accessor.freeze();
frozen.set("key", "value"); // lança ReadonlyViolationError

// Via opções do factory
const ro = SafeAccess.fromJson('{"key":"value"}', { readonly: true });
ro.set("key", "new"); // lança ReadonlyViolationError
```

### JSON Patch (RFC 6902)

Métodos de instância para computar e aplicar operações RFC 6902 JSON Patch. Funções livres também são exportadas para uso standalone — veja [API — Operações & I/O](/pt-br/js/api-features#json-patch).

#### `diff(other: AbstractAccessor): JsonPatchOperation[]`

Computa um JSON Patch RFC 6902 entre este accessor e `other`.

```typescript
const patches = accessorA.diff(accessorB);
// [{ op: 'replace', path: '/name', value: 'New' }, ...]
```

#### `applyPatch(ops: JsonPatchOperation[]): AbstractAccessor`

Aplica operações RFC 6902 JSON Patch. Retorna uma **nova instância** — não muta.

```typescript
const updated = accessor.applyPatch([
    { op: "replace", path: "/name", value: "Atualizado" },
    { op: "add", path: "/novaChave", value: 42 },
    { op: "remove", path: "/chaveAntiga" },
]);
```

#### `validatePatch(ops: JsonPatchOperation[]): void`

Valida uma lista de operações RFC 6902 JSON Patch. Lança `JsonPatchValidationError` se alguma operação for estruturalmente inválida.

```typescript
accessor.validatePatch([{ op: "replace", path: "/name", value: "OK" }]); // passa
accessor.validatePatch([{ op: "invalid" as any, path: "/" }]); // lança
```

#### `JsonPatchOperation`

```typescript
type JsonPatchOperation = {
    op: "add" | "remove" | "replace" | "move" | "copy" | "test";
    path: string;
    value?: unknown;
    from?: string;
};
```

---

## Reset de Estado Global

#### `SafeAccess.resetAll(): void`

Reseta **todo** o estado estático global de uma vez: o registry de plugins padrão, o registry de schemas padrão, o cache de caminhos, qualquer política de segurança configurada globalmente e todos os listeners de auditoria.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

afterEach(() => {
    SafeAccess.resetAll();
});
```

**Quando usar:** No teardown da suíte de testes, quando múltiplos subsistemas foram configurados globalmente e é necessário um estado completamente limpo entre os casos de teste.

**Nota:** `resetAll()` reseta apenas os registries **padrão** (globais). Instâncias criadas via `ServiceContainer.create()` gerenciam seu próprio estado de forma independente e não são afetadas. Para novo código, prefira `ServiceContainer` — veja [Injeção de Dependência](#injeção-de-dependência).

---

## Injeção de Dependência

**Import:** `import { ServiceContainer, defaultContainer } from '@safe-access-inline/safe-access-inline'`

A biblioteca disponibiliza um container de serviços leve que agrupa os dois registries centrais (`PluginRegistry` e `SchemaRegistry`). A injeção de dependência foi introduzida para que os testes operem em instâncias completamente isoladas — sem precisar chamar `resetAll()` global e sem interferir em outros testes executados em paralelo.

### `ServiceContainer`

Container leve que mantém um `pluginRegistry` e um `schemaRegistry`.

#### Campos

| Campo            | Tipo              | Descrição                                         |
| ---------------- | ----------------- | ------------------------------------------------- |
| `pluginRegistry` | `IPluginRegistry` | Instância do registry de plugins deste container. |
| `schemaRegistry` | `ISchemaRegistry` | Instância do registry de schemas deste container. |

#### `ServiceContainer.create(): ServiceContainer`

Cria um novo container com instâncias de registry **novas e isoladas**. Nenhum estado é compartilhado com os padrões globais ou com outros containers criados por este método.

```typescript
import { ServiceContainer } from "@safe-access-inline/safe-access-inline";

const container = ServiceContainer.create();
// container.pluginRegistry e container.schemaRegistry são instâncias novas
// — completamente independentes dos padrões globais
```

#### Construtor

```typescript
new ServiceContainer(opts?: {
    pluginRegistry?: IPluginRegistry;
    schemaRegistry?: ISchemaRegistry;
})
```

Quando `opts` é omitido, os singletons globais padrão são utilizados. Para instâncias isoladas, prefira `ServiceContainer.create()`.

### `defaultContainer`

O container padrão de todo o processo. Encapsula `PluginRegistry.getDefault()` e `SchemaRegistry.getDefault()` — os mesmos singletons usados implicitamente por todos os métodos estáticos da biblioteca.

```typescript
import { defaultContainer } from "@safe-access-inline/safe-access-inline";

// Verificar se um plugin YAML está registrado globalmente
defaultContainer.pluginRegistry.has("yaml", "parser"); // true se um parser YAML estiver registrado
```

### Quando usar cada um

| Cenário                                 | Recomendado                                        |
| --------------------------------------- | -------------------------------------------------- |
| Código de aplicação em produção         | `defaultContainer` (implícito via API estática)    |
| Isolamento em testes (sem `resetAll()`) | `ServiceContainer.create()`                        |
| Escopo de plugins para uma feature      | `ServiceContainer.create()` com registro explícito |

### Exemplos

**Container isolado para testes:**

```typescript
import { ServiceContainer } from "@safe-access-inline/safe-access-inline";
import type {
    IPluginRegistry,
    ISchemaRegistry,
} from "@safe-access-inline/safe-access-inline";

describe("MinhaFeature", () => {
    let container: ServiceContainer;

    beforeEach(() => {
        // Registries novos por teste — sem estado global compartilhado
        container = ServiceContainer.create();
    });

    it("registra um parser customizado sem afetar outros testes", () => {
        container.pluginRegistry.registerParser("toml", meuTomlParser);
        expect(container.pluginRegistry.has("toml", "parser")).toBe(true);
        // O PluginRegistry global NÃO é afetado
    });
});
```

**Injetando registries customizados:**

```typescript
import {
    ServiceContainer,
    PluginRegistry,
    SchemaRegistry,
} from "@safe-access-inline/safe-access-inline";

// Cria um registry personalizado
const meuRegistry = PluginRegistry.create();
meuRegistry.registerParser("csv", meuCsvParser);

// Injeta no container — schemaRegistry usa o padrão global
const container = new ServiceContainer({ pluginRegistry: meuRegistry });
```

Veja também: [Arquitetura — Sistema de Plugins](/pt-br/guide/architecture#plugin-system)

---

## Tipos de I/O

### `FileLoadOptions`

Controla o comportamento de carregamento de arquivos para `fromFile()`, `fromFileSync()`, `streamCsv()` e `streamNdjson()`.

```typescript
import type { FileLoadOptions } from "@safe-access-inline/safe-access-inline";

interface FileLoadOptions {
    /** Override de formato explícito — detectado automaticamente pela extensão se omitido. */
    format?: string | Format;
    /** Restringe o carregamento a esses diretórios. Proteção contra path-traversal. */
    allowedDirs?: string[];
    /** Defina `true` para desabilitar a restrição de allowed-dirs. */
    allowAnyPath?: boolean;
    /** Tamanho máximo do arquivo em bytes. Lança `SecurityError` se excedido. */
    maxSize?: number;
    /** Lista de extensões de arquivo permitidas, ex: `['.json', '.yaml']`. Lança `SecurityError` caso contrário. */
    allowedExtensions?: string[];
}
```

### `HttpClientInterface`

Transporte HTTP injetável usado por `fromUrl()` e `IoLoader`. Implementar esta interface permite substituir a chamada `https.request()` embutida — útil para testes, proxies e ambientes isolados.

```typescript
import type {
    HttpClientInterface,
    HttpRequestOptions,
    HttpResponse,
} from "@safe-access-inline/safe-access-inline";

interface HttpRequestOptions {
    headers?: Record<string, string>;
    timeout?: number;
    signal?: AbortSignal;
}

interface HttpResponse {
    readonly ok: boolean;
    readonly status: number;
    text(): Promise<string>;
    json(): Promise<unknown>;
}

interface HttpClientInterface {
    fetch(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}
```

Injete via `configureIoLoader({ httpClient: meuCliente })`. A validação SSRF ainda é executada antes de qualquer chamada a `httpClient.fetch()`.

### `DnsResolverInterface`

Resolvedor DNS injetável usado pela guarda SSRF antes do fetch de URL. Substitui as buscas `dns.promises`.

```typescript
import type { DnsResolverInterface } from "@safe-access-inline/safe-access-inline";

interface DnsResolverInterface {
    resolve(hostname: string): Promise<string[]>;
    resolve4?(hostname: string): Promise<string[]>;
    resolve6?(hostname: string): Promise<string[]>;
}
```

Injete via `configureIoLoader({ dnsResolver: meuResolver })`.

---

## Funções Utilitárias de Segurança

### `sanitizeHeaders()`

```typescript
import { sanitizeHeaders } from "@safe-access-inline/safe-access-inline";

function sanitizeHeaders(
    headers: Record<string, string> | null | undefined,
): Record<string, string>;
```

Sanitiza headers HTTP antes do uso em requisições de saída:

- Nomes de header são convertidos para minúsculas e validados contra os caracteres de token RFC 7230; nomes inválidos são descartados.
- Valores de header têm sequências CRLF e caracteres de controle removidos (prevenção de injeção de headers).
- Retorna um novo registro — a entrada não é mutada.
- `null` / `undefined` retorna `{}`.

### `sanitizeCsvHeaders()`

```typescript
import { sanitizeCsvHeaders } from "@safe-access-inline/safe-access-inline";

function sanitizeCsvHeaders(
    headers: string[],
    mode?: CsvSanitizeMode,
): string[];
```

Aplica `sanitizeCsvCell()` a cada elemento de uma linha de cabeçalho. Protege contra injeção de fórmulas CSV em nomes de coluna originados de dados não confiáveis.

```typescript
sanitizeCsvHeaders(["Nome", "=SUM(A1)", "Email"], "strip");
// ["Nome", "SUM(A1)", "Email"]
```
