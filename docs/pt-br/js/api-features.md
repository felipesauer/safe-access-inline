---
outline: deep
---

# API — Operações & I/O — JavaScript / TypeScript

## Índice

- [Inferência de Tipo Segura](#inferência-de-tipo-segura)
- [Segurança](#segurança)

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

### Acesso sem Tipo (Untyped)

Sem um genérico (ou usando `Record<string, unknown>`), `get()` retorna `unknown` — total retrocompatibilidade:

```typescript
// Sem tipo — retorna unknown
const accessor = SafeAccess.from(rawInput);
const value = accessor.get("some.path"); // unknown
```

---

## Seguran\u00e7a

### SecurityPolicy

**Import:** `import type { SecurityPolicy } from '@safe-access-inline/safe-access-inline'`

Uma configuração de segurança unificada que agrega todas as opções de segurança.

```typescript
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = {
    maxDepth: 256,
    maxPayloadBytes: 5 * 1024 * 1024,
    allowedDirs: ["/etc/config"],
};

const accessor = SafeAccess.withPolicy(data, policy);
```

#### Interface `SecurityPolicy`

```typescript
interface SecurityPolicy {
    maxDepth?: number;
    maxPayloadBytes?: number;
    maxKeys?: number;
    allowedDirs?: string[];
}
```

### SecurityOptions

**Import:** `import { assertPayloadSize, assertMaxKeys, assertMaxDepth } from '@safe-access-inline/safe-access-inline'`

Funções de asserção de baixo nível usadas internamente por todos os parsers de formato:

- `assertPayloadSize(input: string, maxBytes?: number): void`
- `assertMaxKeys(data: Record<string, unknown>, maxKeys?: number): void`
- `assertMaxDepth(currentDepth: number, maxDepth?: number): void`

### Deep Freeze

**Import:** `import { deepFreeze } from '@safe-access-inline/safe-access-inline'`

#### `deepFreeze<T extends object>(obj: T): Readonly<T>`

Congela recursivamente um objeto. Útil para tornar configurações imutáveis em tempo de execução e para proteção contra ataques de prototype pollution.

**Cenário: prototype pollution**

Um atacante pode tentar injetar propriedades no `Object.prototype` via JSON malicioso:

```typescript
const malicious = JSON.parse('{"__proto__": {"isAdmin": true}}');
console.log(({} as any).isAdmin); // true — prototype poluído!
```

Usando `deepFreeze()` antes de passar para um accessor, o objeto fica completamente imutável:

```typescript
import { deepFreeze, SafeAccess } from "@safe-access-inline/safe-access-inline";

const untrusted = JSON.parse(userInput);
const safe = deepFreeze(untrusted);
const accessor = SafeAccess.fromObject(safe);
// Qualquer tentativa de poluir o prototype é silenciosamente bloqueada
// mesmo em modo não-strict, pois o objeto está congelado
```
