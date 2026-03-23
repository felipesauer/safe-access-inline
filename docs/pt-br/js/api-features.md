---
outline: deep
---

# API — Operações & I/O — JavaScript / TypeScript

## Índice

- [Inferência de Tipo Segura](#inferência-de-tipo-segura)
- [Operações de Array](#operações-de-array)
- [JSON Patch](#json-patch)
- [Validação de Schema](#validação-de-schema)
- [Segurança](#segurança)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Log de Auditoria](#log-de-auditoria)
- [Integrações de Framework](#integrações-de-framework)

---

## Inferência de Tipo Segura

Quando você fornece um tipo de shape concreto via parâmetro genérico, a biblioteca infere automaticamente o tipo do valor retornado por `get()` — sem casting, sem `unknown`.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

interface Config {
    server: { host: string; port: number };
    debug: boolean;
    tags: string[];
}

const accessor = SafeAccess.fromObject<Config>({
    server: { host: "localhost", port: 3000 },
    debug: true,
    tags: ["web", "api"],
});

const host = accessor.get("server.host"); // inferido: string | undefined
const port = accessor.get("server.port"); // inferido: number | undefined
const debug = accessor.get("debug", false); // inferido: boolean
const tags = accessor.get("tags"); // inferido: string[] | undefined
```

### `DeepPaths<T>` — Autocompletar para Caminhos Aninhados

O tipo utilitário `DeepPaths<T>` enumera todos os caminhos dot-notation válidos para um shape. Isso alimenta o autocompletar no IDE e a validação de caminhos em tempo de compilação:

```typescript
import type { DeepPaths } from "@safe-access-inline/safe-access-inline";

type ConfigPaths = DeepPaths<Config>;
// "server" | "server.host" | "server.port" | "debug" | "tags"

// ✅ Válido — autocompletado e verificado em tempo de tipo
accessor.get("server.host");

// ❌ Erro TypeScript: '"server.hostname"' não é atribuível a 'DeepPaths<Config>'
accessor.get("server.hostname");
```

### `ValueAtPath<T, P>` — Estreitamento do Tipo de Retorno

`ValueAtPath<T, P>` resolve o tipo em um dado caminho:

```typescript
import type {
    ValueAtPath,
    DeepPaths,
} from "@safe-access-inline/safe-access-inline";

type HostType = ValueAtPath<Config, "server.host">; // string
type PortType = ValueAtPath<Config, "server.port">; // number
```

### Acesso sem Tipo (Untyped)

Sem um genérico (ou usando `Record<string, unknown>`), `get()` retorna `unknown` — total retrocompatibilidade:

```typescript
// Sem tipo — retorna unknown
const accessor = SafeAccess.from(rawInput);
const value = accessor.get("some.path"); // unknown
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
    errors: SchemaValidationIssue[];
}

interface SchemaValidationIssue {
    path: string;
    message: string;
}
```

### Adapters incluídos

O pacote exporta adapters prontos para bibliotecas comuns de validação de schema:

| Adapter                | Peer dependency | Observações                                                                                                                                                    |
| ---------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ZodSchemaAdapter`     | `zod`           | Valida com `schema.safeParse(data)`                                                                                                                            |
| `ValibotSchemaAdapter` | `valibot`       | Aceita a função `safeParse` do Valibot no construtor                                                                                                           |
| `YupSchemaAdapter`     | `yup`           | Usa `schema.validateSync(data, { abortEarly: false })`                                                                                                         |
| `JsonSchemaAdapter`    | Nenhuma         | Adapter embutido para subconjunto do draft-07 com suporte a `type`, `required`, `properties`, `items`, `minimum`, `maximum`, `minLength`, `maxLength` e `enum` |

Esses adapters incluídos são intencionalmente específicos de ecossistema. O pacote JS inclui adapters para validadores comuns do ecossistema JavaScript (`zod`, `valibot`, `yup`), enquanto o pacote PHP inclui `JsonSchemaAdapter` e `SymfonyValidatorAdapter`.

### Adapters incluídos

O pacote exporta adapters prontos para as bibliotecas de schema mais comuns:

| Adapter                | Peer dependency | Notas                                                                                                                             |
| ---------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ZodSchemaAdapter`     | `zod`           | Valida com `schema.safeParse(data)`                                                                                               |
| `ValibotSchemaAdapter` | `valibot`       | Recebe a função `safeParse` do Valibot no construtor                                                                              |
| `YupSchemaAdapter`     | `yup`           | Usa `schema.validateSync(data, { abortEarly: false })`                                                                            |
| `JsonSchemaAdapter`    | Nenhuma         | Adapter built-in com suporte a `type`, `required`, `properties`, `items`, `minimum`, `maximum`, `minLength`, `maxLength` e `enum` |

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

**Import:** `import { sanitizeCsvCell, sanitizeCsvRow, sanitizeCsvHeaders } from '@safe-access-inline/safe-access-inline'`

Protege contra injeção de fórmulas CSV.

- `sanitizeCsvCell(cell: string, mode?: CsvSanitizeMode): string`
- `sanitizeCsvRow(row: string[], mode?: CsvSanitizeMode): string[]`
- `sanitizeCsvHeaders(headers: string[], mode?: CsvSanitizeMode): string[]`

Modos: `'prefix'` (prefixa com `'`), `'strip'` (remove todos os caracteres de prefixo de injeção CSV: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n` conforme orientação OWASP CSV Injection), `'error'` (lança erro), `'none'` (passthrough).

`sanitizeCsvHeaders()` aplica a mesma sanitização de célula a um array de cabeçalhos de coluna — útil quando os valores de cabeçalho originam de dados fornecidos pelo usuário ou fontes externas.

### Sanitização de Headers HTTP

**Import:** `import { sanitizeHeaders } from '@safe-access-inline/safe-access-inline'`

#### `sanitizeHeaders(headers: Record<string, string> | null | undefined): Record<string, string>`

Sanitiza um mapa de headers HTTP antes de passá-los para requisições de saída. Retorna um novo registro — a entrada nunca é mutada.

- Nomes de header são convertidos para minúsculas e validados contra os caracteres de token RFC 7230; nomes inválidos são descartados silenciosamente.
- Valores de header têm sequências CRLF (`\r\n`) e caracteres de controle ASCII removidos para prevenir injeção de headers.
- Aceita `null` / `undefined` — retorna um objeto vazio.

```typescript
import { sanitizeHeaders } from "@safe-access-inline/safe-access-inline";

const safe = sanitizeHeaders({
    "Content-Type": "application/json",
    "X-Custom": "value\r\nevil: injected", // CRLF removido
    "": "sem-nome", // nome vazio descartado
});
// { "content-type": "application/json", "x-custom": "valueevilinjected" }
```

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

`fromFileSync()` e `fromFile()` aceitam um objeto `FileLoadOptions` como segundo argumento.

#### `FileLoadOptions`

```typescript
import type { FileLoadOptions } from "@safe-access-inline/safe-access-inline";

interface FileLoadOptions {
    /** Override de formato explícito — detectado automaticamente pela extensão se omitido. */
    format?: string | Format;
    /** Restringe o carregamento a esses diretórios (proteção contra path-traversal). */
    allowedDirs?: string[];
    /** Defina `true` para desabilitar a restrição de allowed-dirs. */
    allowAnyPath?: boolean;
    /** Tamanho máximo do arquivo em bytes (lança `SecurityError` se excedido). */
    maxSize?: number;
    /** Lista de extensões de arquivo permitidas, ex: `['.json', '.yaml']`. */
    allowedExtensions?: string[];
}
```

JavaScript expõe APIs de carregamento de arquivos síncronas e assíncronas. Essa é uma diferença intencional entre linguagens: o pacote PHP expõe apenas I/O síncrono, enquanto o pacote JS fornece variantes assíncronas para runtimes Node e variantes síncronas para bootstrap, scripts ou CLI.

### Streaming de Arquivos Grandes

Para processamento eficiente de memória de arquivos CSV ou NDJSON grandes, o JS fornece streaming assíncrono baseado em `AsyncGenerator` — funcionalmente equivalente às variantes `Generator` síncronas do PHP.

#### `SafeAccess.streamCsv(filePath: string, options?: FileLoadOptions): AsyncGenerator<string[]>`

Produz linhas CSV analisadas uma por vez sem carregar o arquivo inteiro na memória.

```typescript
for await (const row of SafeAccess.streamCsv("/app/data/users.csv", {
    allowedDirs: ["/app/data"],
})) {
    console.log(row); // string[]
}
```

#### `SafeAccess.streamNdjson(filePath: string, options?: FileLoadOptions): AsyncGenerator<unknown>`

Produz registros NDJSON analisados um por vez.

```typescript
for await (const event of SafeAccess.streamNdjson("/app/data/events.ndjson", {
    allowedDirs: ["/app/data"],
})) {
    console.log(event); // objeto analisado
}
```

No PHP, o equivalente é um laço `foreach ($stream as $row)` síncrono sobre um `Generator`. Ambos os paradigmas entregam a mesma garantia: linhas são produzidas uma de cada vez sem carregar o arquivo inteiro na memória. Veja [Arquitetura — Streaming: Síncrono (PHP) vs Assíncrono (JS)](/guide/architecture#streaming-síncrono-php-vs-assíncrono-js).

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

No pacote JS, `watchFile()` retorna uma única função de unsubscribe e usa o watcher da plataforma (`fs.watch`) internamente.

Isso difere intencionalmente do PHP, onde `watchFile()` retorna `{ poll, stop }` porque o loop de polling precisa ser dirigido explicitamente em um runtime síncrono.

### IoLoader

**Import:** `import { configureIoLoader, resetIoLoaderConfig, assertPathWithinAllowedDirs, resolveFormatFromExtension } from '@safe-access-inline/safe-access-inline'`

`IoLoader` é o subsistema de I/O interno invocado por `fromFile()`, `fromFileSync()` e `fromUrl()`. Aplica proteção SSRF, guardas contra path-traversal e timeouts de requisição configuráveis.

#### Configuração

```typescript
import { configureIoLoader } from "@safe-access-inline/safe-access-inline";

configureIoLoader({
    requestTimeoutMs: 15_000, // timeout total da requisição HTTP (padrão: 10 000 ms)
    connectTimeoutMs: 8_000, // timeout da fase de conexão TCP (padrão: 5 000 ms)
});
```

#### `IoLoaderConfig`

```typescript
interface IoLoaderConfig {
    /** Timeout total da requisição HTTP em milissegundos. */
    readonly requestTimeoutMs: number;
    /** Milissegundos máximos para estabelecer a conexão TCP. */
    readonly connectTimeoutMs: number;
    /** Cliente HTTP injetável (substitui o transporte `https.request` embutido). */
    readonly httpClient?: HttpClientInterface;
    /** Resolvedor DNS injetável (substitui o resolvedor `dns.promises` embutido). */
    readonly dnsResolver?: DnsResolverInterface;
}
```

#### Injeção de Dependência — `HttpClientInterface` e `DnsResolverInterface`

Você pode substituir o transporte HTTP embutido e o resolvedor DNS por implementações customizadas — útil para testes, proxies ou ambientes restritos.

**`HttpClientInterface`** substitui `https.request()`:

```typescript
import type { HttpClientInterface } from "@safe-access-inline/safe-access-inline";

const mockClient: HttpClientInterface = {
    async fetch(url, options) {
        return {
            ok: true,
            status: 200,
            async text() {
                return '{"chave":"valor"}';
            },
            async json() {
                return { chave: "valor" };
            },
        };
    },
};

configureIoLoader({ httpClient: mockClient });
const accessor = await SafeAccess.fromUrl("https://example.com/config.json");
```

> **Segurança:** A validação SSRF (bloqueio de IPs privados) é sempre aplicada, mesmo quando um `httpClient` customizado está configurado. A resolução DNS e verificação de intervalo de IP são executadas antes de qualquer chamada de rede.

---

## Log de Auditoria

**Import:** `import { onAudit, clearAuditListeners } from '@safe-access-inline/safe-access-inline'`

Inscreva-se em eventos de segurança e operações de dados.

```typescript
const unsubscribe = SafeAccess.onAudit((event) => {
    console.log(`[${event.type}]`, event.detail);
});

// Tipos de evento: 'file.read', 'url.fetch', 'security.violation', 'security.deprecation',
//                  'data.mask', 'file.watch', 'data.freeze', 'data.format_warning', 'schema.validate'

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
    | "security.deprecation"
    | "data.mask"
    | "data.freeze"
    | "data.format_warning"
    | "schema.validate";
```

---

## Integrações de Framework

### NestJS

**Import:** `import { SafeAccessModule, SafeAccessService, SAFE_ACCESS, createSafeAccessProvider, createSafeAccessServiceProvider } from '@safe-access-inline/safe-access-inline'`

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

#### `createSafeAccessProvider(options: SafeAccessModuleOptions)`

Retorna uma definição de provider NestJS que resolve um `AbstractAccessor` sob o token de injeção `SAFE_ACCESS`. Use quando quiser injetar o accessor diretamente.

#### `createSafeAccessServiceProvider(options: SafeAccessModuleOptions)`

Retorna uma definição de provider NestJS que resolve uma instância de `SafeAccessService`, que envolve o accessor e pode ser injetada por tipo.

```typescript
@Module({
    providers: [createSafeAccessServiceProvider({ filePath: "./config.yaml" })],
    exports: [SafeAccessService],
})
export class ConfigModule {}

@Injectable()
class MyService {
    constructor(private config: SafeAccessService) {}

    getHost() {
        return this.config.get("database.host");
    }
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
