---
outline: deep
---

# Segurança & Integrações — JavaScript / TypeScript

## Índice

- [Segurança \& Integrações — JavaScript / TypeScript](#segurança--integrações--javascript--typescript)
    - [Índice](#índice)
    - [Segurança](#segurança)
        - [SecurityPolicy](#securitypolicy)
            - [Presets de Política](#presets-de-política)
            - [Política Global](#política-global)
        - [Mascaramento de dados](#mascaramento-de-dados)
        - [Readonly \& Deep Freeze](#readonly--deep-freeze)
    - [Validação de Schema](#validação-de-schema)
    - [Log de Auditoria](#log-de-auditoria)
    - [Integrações de Framework](#integrações-de-framework)
        - [NestJS](#nestjs)
        - [Vite](#vite)

## Segurança

### SecurityPolicy

```typescript
import {
    SecurityPolicy,
    defaultPolicy,
    mergePolicy,
    STRICT_POLICY,
    PERMISSIVE_POLICY,
    setGlobalPolicy,
    clearGlobalPolicy,
    getGlobalPolicy,
} from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = mergePolicy(defaultPolicy(), {
    maxDepth: 128,
    maxPayloadBytes: 1_048_576,
    allowedDirs: ["/app/config"],
    url: { allowedHosts: ["api.example.com"] },
    csvMode: "strip",
    maskPatterns: ["password", /.*_token/],
});

// Carregar com política
const accessor = SafeAccess.withPolicy(jsonString, policy);
const fromFile = SafeAccess.fromFileWithPolicy("/app/config.json", policy);
const fromUrl = await SafeAccess.fromUrlWithPolicy(
    "https://api.example.com/config.json",
    policy,
);
```

#### Presets de Política

Dois presets integrados estão disponíveis:

- **`STRICT_POLICY`** — limites restritivos para entrada não confiável
- **`PERMISSIVE_POLICY`** — limites relaxados para ambientes confiáveis

```typescript
const accessor = SafeAccess.withPolicy(data, STRICT_POLICY);
```

#### Política Global

Defina uma política global que se aplica como padrão para todas as operações:

```typescript
setGlobalPolicy(STRICT_POLICY);
const current = getGlobalPolicy(); // SecurityPolicy | null
clearGlobalPolicy();

// Ou via facade SafeAccess
SafeAccess.setGlobalPolicy(STRICT_POLICY);
SafeAccess.clearGlobalPolicy();
```

### Mascaramento de dados

```typescript
const accessor = SafeAccess.fromObject({
    user: "Ana",
    password: "s3cret",
    api_key: "abc-123",
});

const safe = accessor.mask();
safe.get("password"); // '[REDACTED]'
safe.get("api_key"); // '[REDACTED]'
safe.get("user"); // 'Ana'

// Padrões customizados
const custom = accessor.mask(["custom_secret", /.*_token/]);
```

### Readonly & Deep Freeze

```typescript
// Readonly — lança ReadonlyViolationError ao tentar modificar
const ro = SafeAccess.fromObject({ key: "value" }, { readonly: true });
ro.get("key"); // 'value'
ro.set("key", "new"); // lança ReadonlyViolationError

// Deep freeze — previne poluição de protótipo no objeto de dados
import { deepFreeze } from "@safe-access-inline/safe-access-inline";
deepFreeze(myObject);
```

---

## Validação de Schema

```typescript
import { SchemaRegistry } from "@safe-access-inline/safe-access-inline";

// Registrar um adapter padrão (implemente SchemaAdapterInterface)
SchemaRegistry.setDefaultAdapter(myAdapter);

// Validar — lança SchemaValidationError em caso de falha
accessor.validate(schema);

// Encadeamento fluente
const name = accessor.validate(schema).get("name");
```

---

## Log de Auditoria

```typescript
const unsub = SafeAccess.onAudit((event) => {
    // event = { type: 'file.read', timestamp: 1234567890.123, detail: {...} }
    console.log(event.type, event.detail);
});

// Eventos: file.read, file.watch, url.fetch, security.violation,
//         security.deprecation, data.mask, data.freeze, schema.validate

// Limpar
unsub();
SafeAccess.clearAuditListeners();
```

---

## Integrações de Framework

### NestJS

```typescript
import {
    SafeAccessModule,
    SAFE_ACCESS,
} from "@safe-access-inline/safe-access-inline";

// No seu módulo NestJS
@Module({
    imports: [
        SafeAccessModule.register({
            filePath: "./config.yaml",
            allowedDirs: ["./config"],
        }),
    ],
})
export class AppModule {}

// Injetar em um serviço
@Injectable()
export class ConfigService {
    constructor(@Inject(SAFE_ACCESS) private config: AbstractAccessor) {}

    getDbHost() {
        return this.config.get("database.host");
    }
}
```

### Vite

```typescript
import {
    safeAccessPlugin,
    loadConfig,
} from "@safe-access-inline/safe-access-inline";

// vite.config.ts
export default defineConfig({
    plugins: [
        safeAccessPlugin({
            files: ["./config/defaults.yaml", "./config/local.yaml"],
            virtualId: "virtual:app-config", // opcional, padrão é 'virtual:safe-access-config'
        }),
    ],
});

// Na sua aplicação
import config from "virtual:app-config";
// config é um accessor mesclado de todos os arquivos

// Ou carregue a config manualmente
const config2 = loadConfig(["./config/defaults.yaml", "./config/local.yaml"]);
```
