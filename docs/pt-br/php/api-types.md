---
outline: deep
---

# API — Tipos & Internos — PHP

## Índice

- [PluginRegistry](#pluginregistry)
- [PathCache](#pathcache)
- [Exceções](#exceções)
- [Interfaces](#interfaces)
- [Enums](#enums)

## PluginRegistry

**Namespace:** `SafeAccessInline\Core\Registries\PluginRegistry`

Registro estático para plugins de parser e serializer. Parsers convertem strings brutas em arrays; serializers convertem arrays em strings formatadas.

#### `PluginRegistry::registerParser(string $format, ParserPluginInterface $parser): void`

Registra um plugin parser para o formato dado.

```php
use SafeAccessInline\Plugins\SymfonyYamlParser;
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
```

#### `PluginRegistry::registerSerializer(string $format, SerializerPluginInterface $serializer): void`

Registra um plugin serializer para o formato dado.

```php
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
```

#### `PluginRegistry::hasParser(string $format): bool`

Verifica se um parser está registrado para o formato dado.

#### `PluginRegistry::hasSerializer(string $format): bool`

Verifica se um serializer está registrado para o formato dado.

#### `PluginRegistry::getParser(string $format): ParserPluginInterface`

Obtém o parser registrado. Lança `UnsupportedTypeException` se não registrado.

#### `PluginRegistry::getSerializer(string $format): SerializerPluginInterface`

Obtém o serializer registrado. Lança `UnsupportedTypeException` se não registrado.

#### `PluginRegistry::reset(): void`

Limpa todos os plugins registrados. Destinado para testes — chame no `beforeEach` para prevenir poluição entre testes.

### Interfaces de Plugin

#### `ParserPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\ParserPluginInterface`

```php
interface ParserPluginInterface
{
    /**
     * @param string $raw
     * @return array<mixed>
     * @throws InvalidFormatException
     */
    public function parse(string $raw): array;
}
```

#### `SerializerPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\SerializerPluginInterface`

```php
interface SerializerPluginInterface
{
    /**
     * @param array<mixed> $data
     * @return string
     */
    public function serialize(array $data): string;
}
```

---

## PathCache

**Namespace:** `SafeAccessInline\Core\PathCache`

Um cache interno estilo LRU para segmentos de caminho dot-notation já parseados. Exportado para casos de uso avançados como pré-aquecimento do cache ou limpeza entre testes. Todos os métodos são estáticos.

#### `PathCache::get(string $path): ?array`

Retorna os segmentos parseados em cache para o caminho dado.

#### `PathCache::set(string $path, array $segments): void`

Armazena segmentos parseados no cache.

#### `PathCache::has(string $path): bool`

Verifica se um caminho está em cache.

#### `PathCache::clear(): void`

Remove todas as entradas do cache.

#### `PathCache::size(): int`

Retorna o número atual de entradas em cache.

#### `PathCache::enable(): void`

Habilita o cache (habilitado por padrão).

#### `PathCache::disable(): void`

Desabilita o cache — todas as buscas ignoram o cache.

#### `PathCache::isEnabled(): bool`

Verifica se o cache está atualmente habilitado.

---

## Exceções

| Exceção                      | Quando                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AccessorException`          | Classe base de exceção                                                                                           |
| `InvalidFormatException`     | Formato de input inválido (ex: JSON malformado, plugin parser ausente no nível do accessor)                      |
| `UnsupportedTypeException`   | `detect()` não consegue determinar formato; `PluginRegistry` não tem plugin registrado; `toXml()` sem serializer |
| `PathNotFoundException`      | Reservado (não lançado por `get()`)                                                                              |
| `SecurityException`          | Path traversal, payload muito grande, chaves proibidas                                                           |
| `ReadonlyViolationException` | Modificação de um accessor readonly (`set`, `remove`, `merge`, `push`, etc.)                                     |

### Capturando exceções

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

// Formato inválido
try {
    SafeAccess::fromJson('{invalid json}');
} catch (InvalidFormatException $e) {
    echo 'Falha no parse: ' . $e->getMessage();
}

// Violação de política de segurança
try {
    $policy = new SecurityPolicy(maxDepth: 2);
    SafeAccess::withPolicy($deeplyNested, $policy);
} catch (SecurityException $e) {
    echo 'Limite de segurança excedido: ' . $e->getMessage();
}

// Tentativa de mutação em accessor readonly
try {
    $ro = SafeAccess::fromObject(['key' => 'value'], readonly: true);
    $ro->set('key', 'new'); // lança
} catch (ReadonlyViolationException $e) {
    echo 'O accessor é somente-leitura: ' . $e->getMessage();
}

// Plugin de serializer ausente
try {
    $accessor->toYaml();
} catch (UnsupportedTypeException $e) {
    echo 'Nenhum serializer registrado para yaml: ' . $e->getMessage();
}
```

---

## Interfaces

| Interface                   | Métodos                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AccessorInterface`         | Contrato completo: `get()`, `getMany()`, `all()`, `set()`, `merge()`, `remove()`, `toArray()`, `toJson()`, serializadores, `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                                                                                   |
| `SerializerPluginInterface` | `serialize()`                                                                                                                                                               |

---

## Enums

### `Format`

**Namespace:** `SafeAccessInline\Enums\Format`

Enum backed por string cobrindo todos os formatos built-in. Use como alternativa tipada a passar strings brutas para `SafeAccess::from()`.

| Caso             | Valor      |
| ---------------- | ---------- |
| `Format::Array`  | `'array'`  |
| `Format::Object` | `'object'` |
| `Format::Json`   | `'json'`   |
| `Format::Xml`    | `'xml'`    |
| `Format::Yaml`   | `'yaml'`   |
| `Format::Toml`   | `'toml'`   |
| `Format::Ini`    | `'ini'`    |
| `Format::Env`    | `'env'`    |
| `Format::Ndjson` | `'ndjson'` |

### `SegmentType` <Badge type="warning" text="@internal" />

::: warning @internal
Este enum é um detalhe de implementação do parser de dot-notation. Não use em código de aplicação — a estrutura pode mudar em versões futuras.
:::

**Namespace:** `SafeAccessInline\Enums\SegmentType`

Discriminador para os tipos de segmento produzidos pelo parser de dot-notation.

| Caso                         | Valor             |
| ---------------------------- | ----------------- |
| `SegmentType::KEY`           | `'key'`           |
| `SegmentType::INDEX`         | `'index'`         |
| `SegmentType::WILDCARD`      | `'wildcard'`      |
| `SegmentType::DESCENT`       | `'descent'`       |
| `SegmentType::DESCENT_MULTI` | `'descent-multi'` |
| `SegmentType::MULTI_INDEX`   | `'multi-index'`   |
| `SegmentType::MULTI_KEY`     | `'multi-key'`     |
| `SegmentType::FILTER`        | `'filter'`        |
| `SegmentType::SLICE`         | `'slice'`         |
