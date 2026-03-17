---
outline: deep
---

# Referência da API — JavaScript / TypeScript

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#metodos-de-instancia-do-accessor)
- [Operações de Array](#operacoes-de-array)
- [JSON Patch](#json-patch)
- [Validação de Schema](#validacao-de-schema)
- [Segurança](#seguranca)
- [I/O & Carregamento de Arquivos](#i-o-carregamento-de-arquivos)
- [Log de Auditoria](#log-de-auditoria)
- [Integrações de Framework](#integracoes-de-framework)
- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Erros](#erros)
- [Tipos TypeScript](#tipos-typescript)
- [Enums](#enums)

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

## Operações de Array

Todas as operações de array são **imutáveis** — retornam uma nova instância do accessor.

**Import:** Estes são métodos de instância em qualquer accessor.

#### `push(path: string, ...items: unknown[]): AbstractAccessor`

Adiciona itens ao final do array no caminho dado.

```typescript
const updated = accessor.push("tags", "new-tag");
```

#### `pop(path: string): AbstractAccessor`

Remove o último item do array no caminho dado.

#### `shift(path: string): AbstractAccessor`

Remove o primeiro item do array no caminho dado.

#### `unshift(path: string, ...items: unknown[]): AbstractAccessor`

Adiciona itens ao início do array no caminho dado.

#### `insert(path: string, index: number, ...items: unknown[]): AbstractAccessor`

Insere itens no índice dado no array no caminho dado.

```typescript
const updated = accessor.insert("items", 2, { id: 99 });
```

#### `filterAt(path: string, predicate: (item, index) => boolean): AbstractAccessor`

Filtra o array no caminho dado usando uma função predicado.

```typescript
const active = accessor.filterAt("users", (u) => u.active === true);
```

#### `mapAt(path: string, transform: (item, index) => unknown): AbstractAccessor`

Transforma cada item no array no caminho dado.

#### `sortAt(path: string, key?: string, direction?: 'asc' | 'desc'): AbstractAccessor`

Ordena o array no caminho dado. Para arrays de objetos, passe `key` para ordenar por um campo específico.

```typescript
const sorted = accessor.sortAt("items", "price", "desc");
```

#### `unique(path: string, key?: string): AbstractAccessor`

Remove duplicatas do array no caminho dado. Para objetos, passe `key` para deduplicar por um campo específico.

#### `flatten(path: string, depth?: number): AbstractAccessor`

Achata arrays aninhados no caminho dado. Profundidade padrão é 1.

#### `first(path: string, defaultValue?: unknown): unknown`

Retorna o primeiro elemento do array no caminho dado.

```typescript
accessor.first("items"); // primeiro item
accessor.first("items", null); // null se vazio
```

#### `last(path: string, defaultValue?: unknown): unknown`

Retorna o último elemento do array no caminho dado.

#### `nth(path: string, index: number, defaultValue?: unknown): unknown`

Retorna o elemento no índice dado. Suporta índices negativos.

```typescript
accessor.nth("items", -1); // último item
```

---

## JSON Patch

**Import:** `import { diff, applyPatch } from '@safe-access-inline/safe-access-inline'`

#### `diff(a: Record<string, unknown>, b: Record<string, unknown>): JsonPatchOp[]`

Calcula um JSON Patch RFC 6902 entre dois objetos.

```typescript
const patches = diff(original, modified);
// [{ op: 'replace', path: '/name', value: 'New' }, ...]
```

#### `applyPatch(data: Record<string, unknown>, ops: JsonPatchOp[]): Record<string, unknown>`

Aplica um JSON Patch a um objeto. Retorna um novo objeto (não muta o input).

```typescript
const result = applyPatch(data, patches);
```

#### Métodos de Instância

Accessors também expõem estes como métodos de instância:

```typescript
const patches = accessorA.diff(accessorB);
const patched = accessor.applyPatch(patches);
```

#### `JsonPatchOp`

```typescript
type JsonPatchOp = {
    op: "add" | "remove" | "replace" | "move" | "copy" | "test";
    path: string;
    value?: unknown;
    from?: string;
};
```

---

## Validação de Schema

**Import:** `import { SchemaRegistry, SchemaValidationError } from '@safe-access-inline/safe-access-inline'`

#### `SchemaRegistry.setDefaultAdapter(adapter: SchemaAdapterInterface): void`

Define um adapter de schema global padrão usado por `accessor.validate()` quando nenhum adapter é passado.

#### `SchemaRegistry.getDefaultAdapter(): SchemaAdapterInterface | null`

Retorna o adapter padrão atual, ou `null`.

#### `SchemaRegistry.clearDefaultAdapter(): void`

Limpa o adapter padrão.

#### `SchemaAdapterInterface`

```typescript
interface SchemaAdapterInterface<TSchema = unknown> {
    validate(
        data: Record<string, unknown>,
        schema: TSchema,
    ): SchemaValidationResult;
}

interface SchemaValidationResult {
    valid: boolean;
    issues: SchemaValidationIssue[];
}

interface SchemaValidationIssue {
    path: string;
    message: string;
}
```

---

## Segurança

### SecurityPolicy

**Import:** `import { mergePolicy, defaultPolicy } from '@safe-access-inline/safe-access-inline'`

Uma configuração de segurança unificada que agrega todas as opções de segurança.

```typescript
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy = mergePolicy(defaultPolicy(), {
    maxDepth: 256,
    allowedDirs: ["/etc/config"],
    url: { allowPrivateIps: false, allowedHosts: ["api.example.com"] },
    maskPatterns: ["password", "secret"],
});

const accessor = SafeAccess.withPolicy(data, policy);
const fileAccessor = await SafeAccess.fromFileWithPolicy(
    "/etc/config/app.json",
    policy,
);
const urlAccessor = await SafeAccess.fromUrlWithPolicy(
    "https://api.example.com/config",
    policy,
);
```

#### Interface `SecurityPolicy`

```typescript
interface SecurityPolicy {
    maxDepth?: number;
    maxPayloadBytes?: number;
    maxKeys?: number;
    allowedDirs?: string[];
    url?: UrlPolicy;
    csvMode?: "none" | "prefix" | "strip" | "error";
    maskPatterns?: MaskPattern[];
}

interface UrlPolicy {
    allowPrivateIps?: boolean;
    allowedHosts?: string[];
    allowedPorts?: number[];
}
```

#### `mergePolicy(base, overrides?): SecurityPolicy`

Mescla duas policies. Overrides têm prioridade.

#### `defaultPolicy(): SecurityPolicy`

Retorna a policy padrão (maxDepth=512, maxPayloadBytes=10MB, maxKeys=10000).

### SecurityOptions

**Import:** `import { assertPayloadSize, assertMaxKeys, assertMaxDepth } from '@safe-access-inline/safe-access-inline'`

Funções de asserção de baixo nível usadas internamente por todos os parsers de formato:

- `assertPayloadSize(input: string, maxBytes?: number): void`
- `assertMaxKeys(data: Record<string, unknown>, maxKeys?: number): void`
- `assertMaxDepth(currentDepth: number, maxDepth?: number): void`

### Mascaramento de Dados

**Import:** `import { mask } from '@safe-access-inline/safe-access-inline'`

#### `mask(data, patterns?): Record<string, unknown>`

Mascara recursivamente valores sensíveis. Auto-detecta chaves sensíveis comuns (password, secret, token, etc.). Suporta padrões wildcard com `*`.

```typescript
const safe = mask(data, ["api_*", "credentials"]);
// { password: '[REDACTED]', api_key: '[REDACTED]', name: 'Ana' }
```

### Sanitização CSV

**Import:** `import { sanitizeCsvCell, sanitizeCsvRow } from '@safe-access-inline/safe-access-inline'`

Protege contra injeção de fórmulas CSV.

- `sanitizeCsvCell(cell: string, mode?: CsvSanitizeMode): string`
- `sanitizeCsvRow(row: string[], mode?: CsvSanitizeMode): string[]`

Modos: `'prefix'` (prefixa com `'`), `'strip'` (remove todos os caracteres de prefixo de injeção CSV: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n` conforme orientação OWASP CSV Injection), `'error'` (lança erro), `'none'` (passthrough).

### Deep Freeze

**Import:** `import { deepFreeze } from '@safe-access-inline/safe-access-inline'`

#### `deepFreeze<T extends object>(obj: T): Readonly<T>`

Congela recursivamente um objeto. Útil para tornar configurações imutáveis em tempo de execução.

### IP Range Checker

**Import:** `import { assertSafeUrl, isPrivateIp } from '@safe-access-inline/safe-access-inline'`

- `assertSafeUrl(url: string, options?): void` — Lança `SecurityError` se a URL aponta para um IP privado (proteção contra SSRF).
- `isPrivateIp(ip: string): boolean` — Retorna `true` para IPs privados/loopback.

---

## I/O & Carregamento de Arquivos

### Carregamento de Arquivos

```typescript
// Síncrono
const accessor = SafeAccess.fromFileSync("./config.json");
const accessor = SafeAccess.fromFileSync("./config.yaml", {
    format: "yaml",
    allowedDirs: ["/etc/config"],
});

// Assíncrono
const accessor = await SafeAccess.fromFile("./config.json");
```

### Carregamento via URL

```typescript
const accessor = await SafeAccess.fromUrl(
    "https://api.example.com/config.json",
    {
        allowPrivateIps: false,
        allowedHosts: ["api.example.com"],
        allowedPorts: [443],
    },
);
```

### Configuração em Camadas

Mescla múltiplas fontes de configuração (última vence):

```typescript
const config = SafeAccess.layer([defaults, overrides, local]);
const config = await SafeAccess.layerFiles([
    "./defaults.yaml",
    "./overrides.json",
]);
```

### File Watcher

```typescript
const stop = SafeAccess.watchFile("./config.yaml", (accessor) => {
    console.log("Config changed:", accessor.get("app.name"));
});

// Depois: parar de observar
stop();
```

---

## Log de Auditoria

**Import:** `import { onAudit, clearAuditListeners } from '@safe-access-inline/safe-access-inline'`

Inscreva-se em eventos de segurança e operações de dados.

```typescript
const unsubscribe = SafeAccess.onAudit((event) => {
    console.log(`[${event.type}]`, event.detail);
});

// Tipos de evento: 'file.read', 'url.fetch', 'security.violation', 'data.mask',
//                  'file.watch', 'data.freeze', 'schema.validate'

// Limpeza
SafeAccess.clearAuditListeners();
unsubscribe(); // ou cancelar inscrição individualmente
```

#### `AuditEvent`

```typescript
interface AuditEvent {
    type: AuditEventType;
    timestamp: number;
    detail: Record<string, unknown>;
}

type AuditEventType =
    | "file.read"
    | "file.watch"
    | "url.fetch"
    | "security.violation"
    | "data.mask"
    | "data.freeze"
    | "schema.validate";
```

---

## Integrações de Framework

### NestJS

**Import:** `import { SafeAccessModule, SAFE_ACCESS, createSafeAccessProvider } from '@safe-access-inline/safe-access-inline'`

```typescript
// Opção 1: Registro de módulo
@Module({
    imports: [
        SafeAccessModule.register({
            filePath: "./config.yaml",
        }),
    ],
})
export class AppModule {}

// Opção 2: Provider customizado
@Module({
    providers: [
        createSafeAccessProvider({
            layerPaths: ["./defaults.yaml", "./overrides.json"],
        }),
    ],
    exports: [SAFE_ACCESS],
})
export class ConfigModule {}

// Injetar em serviços
@Injectable()
class MyService {
    constructor(@Inject(SAFE_ACCESS) private config: AbstractAccessor) {}
}
```

### Plugin Vite

**Import:** `import { safeAccessPlugin, loadConfig } from '@safe-access-inline/safe-access-inline'`

```typescript
// vite.config.ts
import { safeAccessPlugin } from "@safe-access-inline/safe-access-inline";

export default defineConfig({
    plugins: [
        safeAccessPlugin({
            files: ["./config/defaults.yaml", "./config/local.json"],
            virtualId: "virtual:safe-access-config", // padrão
        }),
    ],
});

// No código da aplicação:
import config from "virtual:safe-access-config";
// config é o objeto JSON mesclado
```

HMR é suportado — alterar um arquivo de configuração observado dispara um reload completo.

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
