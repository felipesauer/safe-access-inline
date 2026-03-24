---
outline: deep
---

# Segurança — PHP

## Índice

- [Segurança — PHP](#segurança--php)
    - [Índice](#índice)
    - [SecurityPolicy](#securitypolicy)
        - [Referência dos campos da política](#referência-dos-campos-da-política)
        - [Quando uma violação é detectada](#quando-uma-violação-é-detectada)
    - [Política Global](#política-global)
    - [Accessors Readonly](#accessors-readonly)
    - [Deep Freeze \& Poluição de Prototype](#deep-freeze--poluição-de-prototype)

---

## SecurityPolicy

Um objeto `SecurityPolicy` aplica um conjunto de restrições a qualquer operação de parse ou carregamento. Todos os parâmetros do construtor são opcionais:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 128,
    maxPayloadBytes: 1_048_576, // 1 MB
    maxKeys: 5_000,
    allowedDirs: ['/app/config'],
);

// Aplicar a um payload de string
$accessor = SafeAccess::withPolicy($jsonString, $policy);
```

### Referência dos campos da política

| Campo             | Tipo       | Padrão       | Protege contra                                            |
| ----------------- | ---------- | ------------ | --------------------------------------------------------- |
| `maxDepth`        | `int`      | `128`        | Objetos profundamente aninhados que causam stack overflow |
| `maxPayloadBytes` | `int`      | `10_485_760` | Esgotamento de memória por payloads muito grandes         |
| `maxKeys`         | `int`      | `10_000`     | Objetos com milhões de chaves consumindo RAM excessiva    |
| `allowedDirs`     | `string[]` | `[]`         | Ataques de path-traversal em operações de carregamento    |

### Quando uma violação é detectada

Violações lançam uma `SecurityException`:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;
use SafeAccessInline\Exceptions\SecurityException;

$policy = new SecurityPolicy(maxPayloadBytes: 128); // limite pequeno para demo

$bigJson = json_encode(['data' => str_repeat('x', 1000)]);

try {
    SafeAccess::withPolicy($bigJson, $policy);
} catch (SecurityException $e) {
    echo 'Restrição de segurança violada: ' . $e->getMessage();
    // "Payload exceeds maximum allowed size"
}
```

---

## Política Global

Defina uma política padrão que se aplica automaticamente a todas as operações sem precisar passá-la explicitamente:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;

$appPolicy = new SecurityPolicy(
    maxDepth: 64,
    maxPayloadBytes: 2_097_152, // 2 MB
);

// Instalar globalmente
SecurityPolicy::setGlobal($appPolicy);
// ou: SafeAccess::setGlobalPolicy($appPolicy);

// Estas operações agora respeitam a política global automaticamente
$a = SafeAccess::fromJson($largeJson);

// Inspecionar ou remover a política global
$current = SecurityPolicy::getGlobal(); // ?SecurityPolicy
SecurityPolicy::clearGlobal();
// ou: SafeAccess::clearGlobalPolicy();
```

---

## Accessors Readonly

Passe `true` como segundo argumento do construtor para qualquer accessor para prevenir todas as mutações. Qualquer chamada a `set()`, `remove()`, `merge()` ou `push()` lança `ReadonlyViolationException`:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Exceptions\ReadonlyViolationException;

$ro = SafeAccess::fromObject(['key' => 'value'], readonly: true);

echo $ro->get('key'); // 'value' — leituras sempre funcionam

try {
    $ro->set('key', 'new');
} catch (ReadonlyViolationException $e) {
    echo 'Não é possível mutar um accessor readonly';
}
```

Você também pode congelar um accessor existente em tempo de execução:

```php
$accessor = SafeAccess::fromJson('{"config": {"debug": false}}');
$frozen = $accessor->freeze();

$frozen->get('config.debug'); // false
$frozen->set('config.debug', true); // lança ReadonlyViolationException
$accessor->set('config.debug', true); // ainda funciona — o original não está congelado
```

---

## Deep Freeze & Poluição de Prototype

A mutação de objetos em PHP funciona de forma diferente do JavaScript, mas `deepFreeze` é exposto como utilitário por completeza. A principal proteção em PHP vem através do **accessor readonly** (veja acima) e da validação de entrada via `SecurityPolicy`.

> Para prevenção de XXE em XML (bloqueio de DOCTYPE/ENTITY), a biblioteca aplica automaticamente em toda chamada `fromXml()` — nenhuma configuração necessária.
