---
outline: deep
---

# Security & Integrations — JavaScript / TypeScript

## Table of Contents

- [Security \& Integrations — JavaScript / TypeScript](#security--integrations--javascript--typescript)
    - [Table of Contents](#table-of-contents)
    - [Security](#security)
        - [SecurityPolicy](#securitypolicy)
        - [Data masking](#data-masking)
        - [Readonly \& Deep Freeze](#readonly--deep-freeze)
    - [Schema Validation](#schema-validation)
    - [Audit Logging](#audit-logging)
    - [Framework Integrations](#framework-integrations)
        - [NestJS](#nestjs)
        - [Vite](#vite)

---

## Security

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

const policy: SecurityPolicy = mergePolicy(defaultPolicy, {
    maxDepth: 128,
    maxPayloadBytes: 1_048_576,
    allowedDirs: ["/app/config"],
    url: { allowedHosts: ["api.example.com"] },
    csvMode: "strip",
    maskPatterns: ["password", /.*_token/],
});

// Load with policy
const accessor = SafeAccess.withPolicy(jsonString, policy);
const fromFile = SafeAccess.fromFileWithPolicy("/app/config.json", policy);
const fromUrl = await SafeAccess.fromUrlWithPolicy(
    "https://api.example.com/config.json",
    policy,
);
```

#### Policy Presets

Two built-in presets are available:

- **`STRICT_POLICY`** — restrictive limits suitable for untrusted input
- **`PERMISSIVE_POLICY`** — relaxed limits for trusted environments

```typescript
const accessor = SafeAccess.withPolicy(data, STRICT_POLICY);
```

#### Global Policy

Set a global policy that applies as the default for all operations:

```typescript
setGlobalPolicy(STRICT_POLICY);
const current = getGlobalPolicy(); // SecurityPolicy | undefined
clearGlobalPolicy();

// Or via SafeAccess facade
SafeAccess.setGlobalPolicy(STRICT_POLICY);
SafeAccess.clearGlobalPolicy();
```

### Data masking

```typescript
const accessor = SafeAccess.fromObject({
    user: "Ana",
    password: "s3cret",
    api_key: "abc-123",
});

const safe = accessor.masked();
safe.get("password"); // '[REDACTED]'
safe.get("api_key"); // '[REDACTED]'
safe.get("user"); // 'Ana'

// Custom patterns
const custom = accessor.masked(["custom_secret", /.*_token/]);
```

### Readonly & Deep Freeze

```typescript
// Readonly — throws ReadonlyViolationError on mutation
const ro = SafeAccess.fromObject({ key: "value" }, { readonly: true });
ro.get("key"); // 'value'
ro.set("key", "new"); // throws ReadonlyViolationError

// Deep freeze — prevents prototype pollution on the data object
SafeAccess.deepFreeze(myObject);
```

---

## Schema Validation

```typescript
import { SchemaRegistry } from "@safe-access-inline/safe-access-inline";

// Register a default adapter (implement SchemaAdapterInterface)
SchemaRegistry.setDefaultAdapter(myAdapter);

// Validate — throws SchemaValidationError on failure
accessor.validate(schema);

// Fluent chaining
const name = accessor.validate(schema).get("name");
```

---

## Audit Logging

```typescript
const unsub = SafeAccess.onAudit((event) => {
    // event = { type: 'file.read', timestamp: 1234567890.123, detail: {...} }
    console.log(event.type, event.detail);
});

// Events: file.read, file.watch, url.fetch, security.violation,
//         security.deprecation, data.mask, data.freeze, schema.validate

// Clean up
unsub();
SafeAccess.clearAuditListeners();
```

---

## Framework Integrations

### NestJS

```typescript
import {
    SafeAccessModule,
    SAFE_ACCESS,
} from "@safe-access-inline/safe-access-inline";

// In your NestJS module
@Module({
    imports: [
        SafeAccessModule.register({
            filePath: "./config.yaml",
            allowedDirs: ["./config"],
        }),
    ],
})
export class AppModule {}

// Inject in a service
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
            virtualId: "virtual:app-config", // optional, defaults to 'virtual:safe-access-config'
        }),
    ],
});

// In your app
import config from "virtual:app-config";
// config is a merged accessor from all files

// Or load config manually
const config2 = loadConfig(["./config/defaults.yaml", "./config/local.yaml"]);
```
