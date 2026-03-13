---
title: Referência da API — PHP
nav_exclude: true
permalink: /pt-br/php/api-reference/
lang: pt-br
---

# Referência da API — PHP

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#métodos-de-instância-do-accessor)
- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Exceções](#exceções)
- [Interfaces](#interfaces)

## Facade SafeAccess

**Namespace:** `SafeAccessInline\SafeAccess`

### Métodos Factory

#### `SafeAccess::fromArray(array $data): ArrayAccessor`

Cria um accessor a partir de um array PHP.

```php
$accessor = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
```

#### `SafeAccess::fromObject(object $data): ObjectAccessor`

Cria um accessor a partir de um objeto PHP (stdClass ou qualquer objeto).

```php
$accessor = SafeAccess::fromObject((object) ['name' => 'Ana']);
```

#### `SafeAccess::fromJson(string $data): JsonAccessor`

Cria um accessor a partir de uma string JSON.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
```

#### `SafeAccess::fromXml(string|SimpleXMLElement $data): XmlAccessor`

Cria um accessor a partir de uma string XML ou SimpleXMLElement.

```php
$accessor = SafeAccess::fromXml('<root><name>Ana</name></root>');
```

#### `SafeAccess::fromYaml(string $data): YamlAccessor`

Cria um accessor a partir de uma string YAML. Usa `ext-yaml` (se disponível) ou `symfony/yaml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```php
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess::fromToml(string $data): TomlAccessor`

Cria um accessor a partir de uma string TOML. Usa `devium/toml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```php
$accessor = SafeAccess::fromToml('name = "Ana"');
```

#### `SafeAccess::fromIni(string $data): IniAccessor`

Cria um accessor a partir de uma string INI.

```php
$accessor = SafeAccess::fromIni("[section]\nkey = value");
```

#### `SafeAccess::fromCsv(string $data): CsvAccessor`

Cria um accessor a partir de uma string CSV (primeira linha = cabeçalhos).

```php
$accessor = SafeAccess::fromCsv("name,age\nAna,30");
```

#### `SafeAccess::fromEnv(string $data): EnvAccessor`

Cria um accessor a partir de uma string no formato `.env`.

```php
$accessor = SafeAccess::fromEnv("APP_NAME=MyApp\nDEBUG=true");
```

#### `SafeAccess::detect(mixed $data): AbstractAccessor`

Auto-detecta o formato e cria o accessor apropriado.

Prioridade de detecção: array → SimpleXMLElement → object → string JSON → string XML → string INI → string ENV.

```php
$accessor = SafeAccess::detect(['key' => 'value']); // ArrayAccessor
```

#### `SafeAccess::extend(string $name, string $class): void`

Registra uma classe accessor customizada.

```php
SafeAccess::extend('custom', MyAccessor::class);
```

#### `SafeAccess::custom(string $name, mixed $data): AbstractAccessor`

Instancia um accessor customizado previamente registrado.

```php
$accessor = SafeAccess::custom('custom', $data);
```

---

## Métodos de Instância do Accessor

Todos os accessors estendem `AbstractAccessor` e implementam estes métodos:

### Leitura

#### `get(string $path, mixed $default = null): mixed`

Acessa um valor via caminho em notação de ponto. **Nunca lança** — retorna `$default` se o caminho não for encontrado.

```php
$accessor->get('user.name');           // valor ou null
$accessor->get('user.email', 'N/A');   // valor ou 'N/A'
$accessor->get('users.*.name');        // array de valores (wildcard)
```

#### `getMany(array $paths): array`

Obtém múltiplos valores de uma vez. Chaves são caminhos, valores são padrões.

```php
$accessor->getMany([
    'user.name' => 'Unknown',
    'user.email' => 'N/A',
]);
// ['user.name' => 'Ana', 'user.email' => 'N/A']
```

#### `has(string $path): bool`

Verifica se um caminho existe nos dados.

```php
$accessor->has('user.name');    // true
$accessor->has('missing');      // false
```

#### `type(string $path): ?string`

Retorna o tipo PHP do valor no caminho dado, ou `null` se o caminho não existir.

```php
$accessor->type('name');   // "string"
$accessor->type('age');    // "integer"
$accessor->type('tags');   // "array"
$accessor->type('x');      // null
```

#### `count(?string $path = null): int`

Conta elementos no caminho (ou na raiz).

```php
$accessor->count();          // contagem de elementos raiz
$accessor->count('items');   // contagem do array 'items'
```

#### `keys(?string $path = null): array`

Lista chaves no caminho (ou na raiz).

```php
$accessor->keys();           // ['name', 'age', 'items']
$accessor->keys('items');    // [0, 1, 2]
```

#### `all(): array`

Retorna todos os dados como array associativo. Intenção semântica: "me dê tudo como está".

```php
$accessor->all(); // ['name' => 'Ana', 'age' => 30, ...]
```

### Escrita (Imutável)

#### `set(string $path, mixed $value): static`

Retorna uma **nova instância** com o valor definido no caminho dado.

```php
$new = $accessor->set('user.email', 'ana@example.com');
// $accessor inalterado, $new tem o valor
```

#### `remove(string $path): static`

Retorna uma **nova instância** com o caminho dado removido.

```php
$new = $accessor->remove('user.age');
// $accessor inalterado, $new tem 'age' removido
```

### Transformação

#### `toArray(): array`

Converte dados para array PHP. Intenção semântica: "converter para formato array". Atualmente idêntico a `all()`, mas semanticamente distinto para extensibilidade futura.

#### `toJson(int $flags = 0): string`

Converte dados para string JSON.

```php
$accessor->toJson();                    // compacto
$accessor->toJson(JSON_PRETTY_PRINT);   // formatado
```

#### `toObject(): stdClass`

Converte dados para objeto stdClass.

#### `toXml(string $rootElement = 'root'): string`

Converte dados para string XML. Verifica `PluginRegistry` para um serializer XML primeiro; cai para implementação embutida `SimpleXMLElement`.

```php
$accessor->toXml();           // <root>...</root>
$accessor->toXml('config');   // <config>...</config>
```

#### `toYaml(): string`

Converte dados para string YAML. Verifica `PluginRegistry` para um serializer YAML primeiro; depois cai para `yaml_emit()` se `ext-yaml` estiver disponível; caso contrário usa `Symfony\Component\Yaml\Yaml::dump()`.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->toYaml();          // "name: Ana\n"
```

#### `toToml(): string`

Converte dados para string TOML. Verifica `PluginRegistry` para um serializer TOML primeiro; cai para `Devium\Toml\Toml::encode()`.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->toToml();          // 'name = "Ana"'
```

#### `transform(string $format): string`

Serializa dados para qualquer formato que tenha um plugin serializer registrado. Lança `UnsupportedTypeException` se nenhum serializer estiver registrado para o formato dado.

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
$accessor->transform('yaml');  // "name: Ana\nage: 30\n"
```

---

## PluginRegistry

**Namespace:** `SafeAccessInline\Core\PluginRegistry`

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

## DotNotationParser

**Namespace:** `SafeAccessInline\Core\DotNotationParser`

Classe utilitária estática. Normalmente usada internamente, mas disponível para uso direto.

#### `DotNotationParser::get(array $data, string $path, mixed $default = null): mixed`

#### `DotNotationParser::has(array $data, string $path): bool`

#### `DotNotationParser::set(array $data, string $path, mixed $value): array`

Retorna um novo array (não muta o input).

#### `DotNotationParser::remove(array $data, string $path): array`

Retorna um novo array (não muta o input).

---

## Exceções

| Exceção                    | Quando                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `AccessorException`        | Classe base de exceção                                                                                                         |
| `InvalidFormatException`   | Formato de input inválido (ex: JSON malformado, plugin parser ausente no nível do accessor)                                    |
| `UnsupportedTypeException` | `detect()` não consegue determinar formato; `PluginRegistry` não tem plugin registrado; `toXml()`/`transform()` sem serializer |
| `PathNotFoundException`    | Reservado (não lançado por `get()`)                                                                                            |

---

## Interfaces

| Interface                   | Métodos                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ReadableInterface`         | `get()`, `getMany()`, `all()`                                                                                     |
| `WritableInterface`         | `set()`, `remove()`                                                                                               |
| `TransformableInterface`    | `toArray()`, `toJson()`, `toXml()`, `toYaml()`, `toToml()`, `toObject()`, `transform()`                           |
| `AccessorInterface`         | Estende `ReadableInterface` + `TransformableInterface`, adiciona `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                         |
| `SerializerPluginInterface` | `serialize()`                                                                                                     |
