---
outline: deep
---

# Referência da API — JavaScript / TypeScript

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#metodos-de-instancia-do-accessor)

**Ver também:**

- [API — Operações & I/O](/pt-br/js/api-features)
- [API — Tipos & Internos](/pt-br/js/api-types)

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

#### `SafeAccess.fromNdjson(data: string): NdjsonAccessor`

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

#### `has(path: string): boolean`

Verifica se um caminho existe nos dados.

```typescript
accessor.has("user.name"); // true
accessor.has("missing"); // false
```

#### `type(path: string): string | null`

Retorna o tipo normalizado do valor no caminho dado, ou `null` se o caminho não existir.

Valores possíveis: `"string"`, `"number"`, `"bool"`, `"object"`, `"array"`, `"null"`, `"undefined"`.

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

#### `toNdjson(): string`

Serializa os dados para JSON delimitado por linhas. Cada item de array de nível superior se torna uma linha JSON.

```typescript
accessor.toNdjson(); // '{"id":1}\n{"id":2}'
```

#### `transform(format: string): string`

Serializa os dados para qualquer formato que tenha um plugin serializer registrado. Lança `UnsupportedTypeError` se nenhum serializer for encontrado para o formato dado.

```typescript
accessor.transform("yaml"); // usa serializer 'yaml' registrado
accessor.transform("csv"); // usa serializer 'csv' registrado
```

### Segurança & Validação

#### `masked(patterns?: MaskPattern[]): AbstractAccessor`

Retorna uma **nova instância** com valores sensíveis mascarados. Sem patterns, auto-detecta chaves sensíveis comuns (password, secret, token, api_key, etc.). Com patterns, mascara adicionalmente chaves que correspondem aos padrões wildcard.

```typescript
const safe = accessor.masked(); // auto-mascara chaves comuns
const custom = accessor.masked(["api_*", "credentials"]); // padrões customizados
```

#### `validate<TSchema>(schema: TSchema, adapter?: SchemaAdapterInterface): this`

Valida os dados contra um schema usando o adapter fornecido (ou o adapter padrão definido via `SchemaRegistry`). Retorna `this` se válido; lança `SchemaValidationError` se inválido.

```typescript
import { SchemaRegistry } from "@safe-access-inline/safe-access-inline";

// Registrar um adapter de schema padrão (ex: Zod)
SchemaRegistry.setDefaultAdapter(myZodAdapter);

// Validar inline
accessor.validate(mySchema);
```

---
