---
outline: deep
---

# Recursos Avançados — PHP

## Índice

- [Referência de configuração](#referência-de-configuração)
- [Integração com PHPStan](#integração-com-phpstan)

### Suporte a NDJSON

```php
$ndjson = '{"id":1,"name":"Ana"}' . "\n" . '{"id":2,"name":"Bob"}';
$accessor = SafeAccess::fromNdjson($ndjson);
$accessor->get('0.name');   // 'Ana'
$accessor->get('*.id');     // [1, 2]
$accessor->toNdjson();      // de volta para string NDJSON
```

---

## Referência de configuração

O pacote expõe classes de configuração para consumidores avançados que precisam ajustar limites explicitamente.

### `CacheConfig` — ajuste do cache de paths

`PathCache` armazena paths dot-notation parseados para que chamadas repetidas de `->get('a.b.c')` ignorem o re-parse. O limite padrão é `1000` entradas (evicção LRU).

**Quando alterar:** padrões de acesso de alta frequência com centenas de paths únicos se beneficiam de um cache maior. Reduza em ambientes com memória limitada.

```php
use SafeAccessInline\Core\PathCache;
use SafeAccessInline\Core\Config\CacheConfig;

// Aumentar cache para workloads com muitos paths
PathCache::configure(new CacheConfig(maxSize: 5_000));

// Verificar tamanho atual
PathCache::size(); // int — número de entradas em cache

// Pré-aquecer o cache com paths usados em loops hot
$paths = ['user.name', 'user.email', 'user.role', 'settings.theme'];
foreach ($paths as $path) {
    $accessor->get($path); // popula o cache
}

// Desabilitar o cache completamente (útil em testes)
PathCache::disable();
// ... executar testes ...
PathCache::enable();

// Ou limpar entre casos de teste
PathCache::clear();
```

### `ParserConfig` — ajuste dos limites de recursão

`ParserConfig` controla dois limites de profundidade:

- `maxResolveDepth` — profundidade máxima de recursão ao resolver paths aninhados (padrão: `512`)
- `maxXmlDepth` — profundidade máxima de aninhamento de tags ao parsear XML (padrão: `100`)

**Quando alterar:** reduza `maxXmlDepth` para reforçar a segurança contra payloads XML profundamente aninhados de fontes não confiáveis.

```php
use SafeAccessInline\Core\Config\ParserConfig;

$config = new ParserConfig(
    maxResolveDepth: 512,
    maxXmlDepth: 50, // limite mais rígido para XML não confiável
);
```

---

## Integração com PHPStan

O pacote inclui uma extensão PHPStan customizada que estreita o tipo de retorno de `get()` em tempo de análise estática quando o accessor é anotado com um shape concreto. Sem a extensão, `get()` retorna `mixed`.

### Habilitando a Extensão

Adicione a extensão à configuração PHPStan do seu projeto:

```neon
# phpstan.neon
includes:
    - vendor/safe-access-inline/safe-access-inline/phpstan-extension.neon
```

### Como Funciona

Anote qualquer variável accessor com `@var AccessorClass<array{...}>` usando um shape inline. A extensão resolve o tipo de retorno de `get()` com base no shape no caminho chamado:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Accessors\JsonAccessor;

/** @var JsonAccessor<array{user: array{name: string, age: int}, active: bool}> $acc */
$acc = SafeAccess::fromJson($json);

$name   = $acc->get('user.name');   // PHPStan: string|null
$age    = $acc->get('user.age', 0); // PHPStan: int
$active = $acc->get('active');      // PHPStan: bool|null
$city   = $acc->get('user.city');   // PHPStan: mixed  (não está no shape → fallback)
```

Sem a anotação, `get()` retorna `mixed` — compatibilidade retroativa total é preservada.

### Classes de Accessor Suportadas

A extensão se aplica a todas as classes de accessor concretas:

- `ArrayAccessor`, `ObjectAccessor`, `JsonAccessor`
- `XmlAccessor`, `YamlAccessor`, `TomlAccessor`
- `IniAccessor`, `EnvAccessor`, `NdjsonAccessor`

::: tip Requisito de shape genérico
O tipo de shape deve ser fornecido como o primeiro parâmetro de template: `AccessorClass<array{...}>`. Usar `AbstractAccessor` diretamente como tipo anotado não é suportado pela extensão — use a subclasse concreta.
:::
