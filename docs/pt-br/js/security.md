---
outline: deep
---

# Segurança — JavaScript / TypeScript

## Índice

- [SecurityPolicy](#securitypolicy)
- [Política Global](#política-global)
- [Accessors Readonly](#accessors-readonly)
- [Deep Freeze e Poluição de Protótipo](#deep-freeze-e-poluição-de-protótipo)

---

## SecurityPolicy

Um objeto `SecurityPolicy` aplica um conjunto de restrições a qualquer operação de parse ou carregamento de arquivo. Todos os campos são opcionais — omita os que não precisar.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = {
    maxDepth: 128,
    maxPayloadBytes: 1_048_576, // 1 MB
    maxKeys: 5_000,
    allowedDirs: ["/app/config"],
};

// Aplicar a um payload de string
const accessor = SafeAccess.withPolicy(jsonString, policy);
```

### Referência dos campos da política

| Campo             | Tipo       | Padrão       | Protege contra                                               |
| ----------------- | ---------- | ------------ | ------------------------------------------------------------ |
| `maxDepth`        | `number`   | `128`        | Objetos profundamente aninhados que causam stack overflow    |
| `maxPayloadBytes` | `number`   | `10_485_760` | Esgotamento de memória por payloads muito grandes            |
| `maxKeys`         | `number`   | `10_000`     | Objetos com milhões de chaves consumindo RAM excessiva       |
| `allowedDirs`     | `string[]` | `[]`         | Ataques de path traversal em operações de leitura de arquivo |

### Quando uma violação de política é detectada

Violações lançam um `SecurityError`:

```typescript
import {
    SafeAccess,
    SecurityError,
} from "@safe-access-inline/safe-access-inline";
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy: SecurityPolicy = { maxPayloadBytes: 128 }; // limite mínimo para demo

const bigJson = JSON.stringify({ data: "x".repeat(1000) });

try {
    SafeAccess.withPolicy(bigJson, policy);
} catch (e) {
    if (e instanceof SecurityError) {
        console.error("Restrição de segurança violada:", e.message);
        // "Payload exceeds maximum allowed size"
    }
}
```

---

## Política Global

Defina uma política padrão que se aplica automaticamente a todas as operações sem precisar passá-la explicitamente:

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const appPolicy: SecurityPolicy = {
    maxDepth: 64,
    maxPayloadBytes: 2_097_152, // 2 MB
};

// Instalar globalmente
SafeAccess.setGlobalPolicy(appPolicy);

// Todas as operações subsequentes respeitam a política global automaticamente
const a = SafeAccess.fromJson(largeJson);

// Remover a política global quando não for mais necessária
SafeAccess.clearGlobalPolicy();
```

---

## Accessors Readonly

Passe `{ readonly: true }` em qualquer método factory para impedir todas as mutações. Qualquer chamada a `set()`, `remove()`, `merge()` ou `freeze()` lança um `ReadonlyViolationError`:

```typescript
import {
    SafeAccess,
    ReadonlyViolationError,
} from "@safe-access-inline/safe-access-inline";

const ro = SafeAccess.fromObject({ key: "value" }, { readonly: true });

ro.get("key"); // "value" — leituras sempre funcionam

try {
    ro.set("key", "new");
} catch (e) {
    if (e instanceof ReadonlyViolationError) {
        console.error("Não é possível modificar um accessor readonly");
    }
}
```

Você também pode congelar um accessor existente em tempo de execução:

```typescript
const accessor = SafeAccess.fromJson('{"config": {"debug": false}}');
const frozen = accessor.freeze();

frozen.get("config.debug"); // false
frozen.set("config.debug", true); // lança ReadonlyViolationError
accessor.set("config.debug", true); // ainda funciona — o original não está congelado
```

---

## Deep Freeze e Poluição de Protótipo

`deepFreeze` congela recursivamente um objeto usando `Object.freeze`, impedindo qualquer código de adicionar ou modificar propriedades, inclusive através de cadeias de protótipo:

```typescript
import { deepFreeze } from "@safe-access-inline/safe-access-inline";

const config = deepFreeze({
    db: { host: "localhost", port: 5432 },
    flags: { debug: true },
});

// Qualquer tentativa de mutação é silenciosamente ignorada no modo normal,
// ou lança TypeError no strict mode
config.db.host = "outro"; // sem efeito (ou TypeError no strict mode)
(config as any).__proto__.polluted = true; // sem efeito
```

### Por que isso importa

Sem o freeze, um payload JSON malicioso pode poluir a cadeia de protótipos:

```typescript
// Sem proteção — perigoso:
const payload = JSON.parse('{"__proto__": {"admin": true}}');
const obj = Object.assign({}, payload);
console.log(({} as any).admin); // true — protótipo poluído!

// Com deepFreeze — seguro:
const safe = deepFreeze(JSON.parse('{"__proto__": {"admin": true}}'));
const obj2 = Object.assign({}, safe);
console.log(({} as any).admin); // undefined — protótipo intacto
```

> Para prevenção de XXE em XML (bloqueio de DOCTYPE/ENTITY), a biblioteca aplica automaticamente em toda chamada `fromXml()` — sem configuração necessária.
