---
outline: deep
---

# Referência da API — JavaScript / TypeScript

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#metodos-de-instancia-do-accessor)
- [Desempenho: Caminhos Compilados](#desempenho-caminhos-compilados)
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

Formatos suportados: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'env'`, `'ndjson'`. Todos os formatos built-in também estão disponíveis como membros do enum `Format`.

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
```

Lança `InvalidFormatError` se o formato for desconhecido.

#### `SafeAccess.detect(data: unknown): AbstractAccessor`

Auto-detecta o formato e cria o accessor apropriado.

Prioridade de detecção: array → object → string JSON (com fallback NDJSON) → string XML → string YAML → string TOML → string INI → string ENV.

```typescript
const accessor = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const fromJson = SafeAccess.detect('{"name": "Ana"}'); // JsonAccessor
const fromXml = SafeAccess.detect("<root><name>Ana</name></root>"); // XmlAccessor
const fromYaml = SafeAccess.detect("name: Ana\nage: 30"); // YamlAccessor
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

// Com ToJsonOptions
import type { ToJsonOptions } from "@safe-access-inline/safe-access-inline";

const opts: ToJsonOptions = {
    unescapeUnicode: true, // \u00e9 → é
    unescapeSlashes: true, // \/ → /
    space: 2, // indentar com 2 espaços
};
accessor.toJson(true, opts);
```

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

---

## Reset de Estado Global

#### `SafeAccess.resetAll(): void`

Reseta **todo** o estado estático global de uma vez: o registry de plugins padrão, o cache de caminhos e qualquer política de segurança configurada globalmente.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

afterEach(() => {
    SafeAccess.resetAll();
});
```

**Quando usar:** No teardown da suíte de testes, quando múltiplos subsistemas foram configurados globalmente e é necessário um estado completamente limpo entre os casos de teste.

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
