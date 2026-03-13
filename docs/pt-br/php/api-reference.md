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

#### `SafeAccess::from(mixed $data, string|AccessorFormat $format = ''): AbstractAccessor`

Fábrica unificada — cria um accessor a partir de qualquer dado. Com uma string de formato ou um valor do enum `AccessorFormat`, delega para a fábrica tipada correspondente. Sem formato, detecta automaticamente (equivalente a `detect()`).

Formatos suportados: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'csv'`, `'env'`, ou qualquer nome customizado registrado via `extend()`. Todos os formatos built-in também estão disponíveis como casos do enum `AccessorFormat`.

```php
use SafeAccessInline\Enums\AccessorFormat;

// Auto-detecção (sem formato)
$accessor = SafeAccess::from('{"name": "Ana"}'); // JsonAccessor

// Formato explícito via string
$json = SafeAccess::from('{"name": "Ana"}', 'json');
$yaml = SafeAccess::from("name: Ana", 'yaml');

// Formato explícito via enum
$json = SafeAccess::from('{"name": "Ana"}', AccessorFormat::Json);
$yaml = SafeAccess::from("name: Ana", AccessorFormat::Yaml);
$xml  = SafeAccess::from('<root><n>1</n></root>', AccessorFormat::Xml);
$arr  = SafeAccess::from(['a' => 1], AccessorFormat::Array);

// Formato customizado (apenas string)
SafeAccess::extend('custom', MyAccessor::class);
$custom = SafeAccess::from($data, 'custom');
```

Lança `InvalidFormatException` se o formato for desconhecido e não estiver registrado.

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
$accessor->get("users[?role=='admin'].name"); // valores filtrados
$accessor->get('..name');              // descida recursiva
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

#### `merge(array $value): static`

#### `merge(string $path, array $value): static`

Faz deep merge de dados na raiz ou em um caminho específico. Retorna uma **nova instância**. Arrays associativos são mesclados recursivamente; outros valores são substituídos.

```php
// Merge na raiz
$merged = $accessor->merge(['theme' => 'dark', 'notifications' => true]);

// Merge em caminho
$merged = $accessor->merge('user.settings', ['theme' => 'dark']);
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
| `WritableInterface`         | `set()`, `merge()`, `remove()`                                                                                    |
| `TransformableInterface`    | `toArray()`, `toJson()`, `toXml()`, `toYaml()`, `toToml()`, `toObject()`, `transform()`                           |
| `AccessorInterface`         | Estende `ReadableInterface` + `TransformableInterface`, adiciona `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                         |
| `SerializerPluginInterface` | `serialize()`                                                                                                     |

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
