---
outline: deep
---

# API — Tipos & Internos — PHP

## Índice

- [PluginRegistry](#pluginregistry)
- [PathCache](#pathcache)
- [DotNotationParser](#dotnotationparser)
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

## DotNotationParser

**Namespace:** `SafeAccessInline\Core\Parsers\DotNotationParser`

Classe utilitária estática. Normalmente usada internamente, mas disponível para uso direto.

#### `DotNotationParser::get(array $data, string $path, mixed $default = null): mixed`

Suporta expressões de caminho avançadas:

| Sintaxe           | Descrição                                                                     | Exemplo                 |
| ----------------- | ----------------------------------------------------------------------------- | ----------------------- |
| `a.b.c`           | Acesso a chave aninhada                                                       | `"user.profile.name"`   |
| `a[0]`            | Índice com colchetes                                                          | `"items[0].title"`      |
| `a.*`             | Wildcard — retorna array de valores                                           | `"users.*.name"`        |
| `a[?field>value]` | Filtro — retorna itens correspondentes                                        | `"products[?price>20]"` |
| `..key`           | Descida recursiva — coleta todos os valores de `key` em qualquer profundidade | `"..name"`              |

**Expressões de filtro** suportam:

- Comparação: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Lógicos: `&&` (AND), `\|\|` (OR)
- Valores: números, `'strings'`, `true`, `false`, `null`

```php
// Filtro: todos os usuários admin
DotNotationParser::get($data, "users[?role=='admin']");

// Filtro com comparação numérica + continuação de caminho
DotNotationParser::get($data, 'products[?price>20].name');

// AND combinado
DotNotationParser::get($data, "items[?type=='fruit' && color=='red'].name");

// Descida recursiva: todos os valores "name" em qualquer profundidade
DotNotationParser::get($data, '..name');

// Descida + wildcard
DotNotationParser::get($data, '..items.*.id');

// Descida + filtro
DotNotationParser::get($data, "..employees[?active==true].name");
```

#### `DotNotationParser::has(array $data, string $path): bool`

#### `DotNotationParser::set(array $data, string $path, mixed $value): array`

Retorna um novo array (não muta o input).

#### `DotNotationParser::merge(array $data, string $path, array $value): array`

Faz deep merge de `$value` em `$path`. Quando `$path` é vazio, mescla na raiz. Arrays associativos são mesclados recursivamente; outros valores são substituídos.

```php
$result = DotNotationParser::merge($data, 'user.settings', ['theme' => 'dark']);
```

#### `DotNotationParser::remove(array $data, string $path): array`

Retorna um novo array (não muta o input).

#### `DotNotationParser::renderTemplate(string $template, array $bindings): string`

Renderiza placeholders `{key}` em um template de caminho.

```php
DotNotationParser::renderTemplate('users.{id}.name', ['id' => '42']);
// 'users.42.name'
```

---

## Exceções

| Exceção                        | Quando                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `AccessorException`            | Classe base de exceção                                                                                                         |
| `InvalidFormatException`       | Formato de input inválido (ex: JSON malformado, plugin parser ausente no nível do accessor)                                    |
| `UnsupportedTypeException`     | `detect()` não consegue determinar formato; `PluginRegistry` não tem plugin registrado; `toXml()`/`transform()` sem serializer |
| `PathNotFoundException`        | Reservado (não lançado por `get()`)                                                                                            |
| `SecurityException`            | Tentativa de SSRF, path traversal, payload muito grande, chaves proibidas, CSV injection (modo `error`)                        |
| `ReadonlyViolationException`   | Modificação de um accessor readonly (`set`, `remove`, `merge`, `push`, etc.)                                                   |
| `SchemaValidationException`    | Validação de schema falhou — possui `getIssues(): SchemaValidationIssue[]` para informações detalhadas de erro                 |
| `JsonPatchTestFailedException` | Operação `test` do JSON Patch falhou — valor no caminho não corresponde ao valor esperado                                      |

---

## Interfaces

| Interface                   | Métodos                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ReadableInterface`         | `get()`, `getMany()`, `all()`                                                                                     |
| `WritableInterface`         | `set()`, `merge()`, `remove()`                                                                                    |
| `TransformableInterface`    | `toArray()`, `toJson()`, `toXml()`, `toYaml()`, `toToml()`, `toNdjson()`, `toObject()`, `transform()`             |
| `AccessorInterface`         | Estende `ReadableInterface` + `TransformableInterface`, adiciona `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                         |
| `SerializerPluginInterface` | `serialize()`                                                                                                     |
| `SchemaAdapterInterface`    | `validate()`                                                                                                      |

---

## Enums

### `AccessorFormat`

**Namespace:** `SafeAccessInline\Enums\AccessorFormat`

Enum backed por string cobrindo todos os formatos built-in. Use como alternativa tipada a passar strings brutas para `SafeAccess::from()`.

| Caso                     | Valor      |
| ------------------------ | ---------- |
| `AccessorFormat::Array`  | `'array'`  |
| `AccessorFormat::Object` | `'object'` |
| `AccessorFormat::Json`   | `'json'`   |
| `AccessorFormat::Xml`    | `'xml'`    |
| `AccessorFormat::Yaml`   | `'yaml'`   |
| `AccessorFormat::Toml`   | `'toml'`   |
| `AccessorFormat::Ini`    | `'ini'`    |
| `AccessorFormat::Csv`    | `'csv'`    |
| `AccessorFormat::Env`    | `'env'`    |
| `AccessorFormat::Ndjson` | `'ndjson'` |
