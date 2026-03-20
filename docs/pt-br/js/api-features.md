---
outline: deep
---

# API — Operações & I/O — JavaScript / TypeScript

## Índice

- [Operações de Array](#operações-de-array)
- [JSON Patch](#json-patch)
- [Validação de Schema](#validação-de-schema)
- [Segurança](#segurança)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Log de Auditoria](#log-de-auditoria)
- [Integrações de Framework](#integrações-de-framework)

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

JavaScript expõe APIs de carregamento de arquivos síncronas e assíncronas. Essa é uma diferença intencional entre linguagens: o pacote PHP expõe apenas I/O síncrono, enquanto o pacote JS fornece variantes assíncronas para runtimes Node e variantes síncronas para bootstrap, scripts ou CLI.

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
