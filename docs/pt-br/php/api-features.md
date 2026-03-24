---
outline: deep
---

# API — Segurança — PHP

## Índice

- [Segurança](#segurança)

## Segurança

### SecurityPolicy

**Namespace:** `SafeAccessInline\Security\Guards\SecurityPolicy`

Agrega todas as configurações de segurança em um único objeto de política imutável.

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 512,
    maxPayloadBytes: 10_485_760,  // 10 MB
    maxKeys: 10_000,
    allowedDirs: ['/app/config'],
);
```

#### `merge(array $overrides): self`

Cria uma nova política com valores sobrescritos.

```php
$strict = $policy->merge(['maxDepth' => 64, 'maxKeys' => 1000]);
```

### SecurityOptions

**Namespace:** `SafeAccessInline\Security\Guards\SecurityOptions`

Métodos de asserção estáticos para segurança de payload.

| Constante           | Valor Padrão |
| ------------------- | ------------ |
| `MAX_DEPTH`         | 512          |
| `MAX_PAYLOAD_BYTES` | 10.485.760   |
| `MAX_KEYS`          | 10.000       |

#### `SecurityOptions::assertPayloadSize(string $input, ?int $maxBytes = null): void`

Lança `SecurityException` se o input exceder o máximo de bytes.

#### `SecurityOptions::assertMaxKeys(array $data, ?int $maxKeys = null): void`

Lança `SecurityException` se os dados tiverem chaves demais (contagem recursiva).

#### `SecurityOptions::assertMaxDepth(int $currentDepth, ?int $maxDepth = null): void`

Lança `SecurityException` se o aninhamento exceder a profundidade máxima.

### SecurityGuard

**Namespace:** `SafeAccessInline\Security\Guards\SecurityGuard`

#### `SecurityGuard::assertSafeKey(string $key): void`

Bloqueia chaves de prototype pollution: `__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `valueOf`, `toString`, `hasOwnProperty`, `isPrototypeOf`. Lança `SecurityException`.

#### `SecurityGuard::sanitizeObject(array $data): array`

Remove recursivamente chaves proibidas dos dados.
