---
outline: deep
---

# Referência da API — PHP

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#metodos-de-instancia-do-accessor)
    - [Leitura](#leitura)
    - [Leitura Tipada](#leitura-tipada)
    - [Escrita (Imutável)](#escrita-imutavel)
    - [Readonly](#readonly)
    - [Acesso por Segmentos](#acesso-por-segmentos)
    - [Depuração](#depuracao)
    - [Wildcard Conveniente](#wildcard-conveniente)

**Ver também:**

- [API — Operações & I/O](/pt-br/php/api-features)
- [API — Tipos & Internos](/pt-br/php/api-types)

## Facade SafeAccess

**Namespace:** `SafeAccessInline\SafeAccess`

### Métodos Factory

#### `SafeAccess::fromArray(array $data, bool $readonly = false): ArrayAccessor`

Cria um accessor a partir de um array PHP. Passe `true` como segundo argumento para criar um accessor somente leitura que lança `ReadonlyViolationException` em qualquer mutação.

```php
$accessor = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
$readonly = SafeAccess::fromArray(['key' => 'value'], true);
```

#### `SafeAccess::fromObject(object $data, bool $readonly = false): ObjectAccessor`

Cria um accessor a partir de um objeto PHP (stdClass ou qualquer objeto).

```php
$accessor = SafeAccess::fromObject((object) ['name' => 'Ana']);
$readonly = SafeAccess::fromObject($obj, true);
```

#### `SafeAccess::fromJson(string $data, bool $readonly = false): JsonAccessor`

Cria um accessor a partir de uma string JSON.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$readonly = SafeAccess::fromJson('{"key": "value"}', true);
```

#### `SafeAccess::fromXml(string|SimpleXMLElement $data, bool $readonly = false): XmlAccessor`

Cria um accessor a partir de uma string XML ou SimpleXMLElement.

```php
$accessor = SafeAccess::fromXml('<root><name>Ana</name></root>');
$readonly = SafeAccess::fromXml('<root/>', true);
```

#### `SafeAccess::fromYaml(string $data, bool $readonly = false): YamlAccessor`

Cria um accessor a partir de uma string YAML. Usa `ext-yaml` (se disponível) ou `symfony/yaml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```php
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
$readonly = SafeAccess::fromYaml($yaml, true);
```

#### `SafeAccess::fromToml(string $data, bool $readonly = false): TomlAccessor`

Cria um accessor a partir de uma string TOML. Usa `devium/toml` por padrão. Se um plugin parser for registrado via `PluginRegistry`, o plugin tem prioridade.

```php
$accessor = SafeAccess::fromToml('name = "Ana"');
$readonly = SafeAccess::fromToml($toml, true);
```

#### `SafeAccess::fromIni(string $data, bool $readonly = false): IniAccessor`

Cria um accessor a partir de uma string INI.

```php
$accessor = SafeAccess::fromIni("[section]\nkey = value");
$readonly = SafeAccess::fromIni($ini, true);
```

#### `SafeAccess::fromEnv(string $data, bool $readonly = false): EnvAccessor`

Cria um accessor a partir de uma string no formato `.env`.

```php
$accessor = SafeAccess::fromEnv("APP_NAME=MyApp\nDEBUG=true");
$readonly = SafeAccess::fromEnv($env, true);
```

#### `SafeAccess::fromNdjson(string $data, bool $readonly = false): NdjsonAccessor`

Cria um accessor a partir de uma string Newline Delimited JSON (NDJSON). Cada linha é parseada como um objeto JSON separado.

```php
$accessor = SafeAccess::fromNdjson('{"id":1}' . "\n" . '{"id":2}');
$accessor->get('0.id'); // 1
$readonly = SafeAccess::fromNdjson($ndjson, true);
```

```php
$accessor = SafeAccess::fromNdjson('{"id":1}' . "\n" . '{"id":2}');
$accessor->get('0.id'); // 1
```

#### `SafeAccess::from(mixed $data, string|Format $format = ''): AbstractAccessor`

Fábrica unificada — cria um accessor a partir de qualquer dado. Com uma string de formato ou um valor do enum `Format`, delega para a fábrica tipada correspondente. Sem formato, detecta automaticamente (equivalente a `detect()`).

Formatos suportados: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'env'`, `'ndjson'`. Todos os formatos built-in também estão disponíveis como casos do enum `Format`.

```php
use SafeAccessInline\Enums\Format;

// Auto-detecção (sem formato)
$accessor = SafeAccess::from('{"name": "Ana"}'); // JsonAccessor

// Formato explícito via string
$json = SafeAccess::from('{"name": "Ana"}', 'json');   // JsonAccessor
$yaml = SafeAccess::from("name: Ana", 'yaml');          // YamlAccessor

// Formato explícito via enum
$json = SafeAccess::from('{"name": "Ana"}', Format::Json);    // JsonAccessor
$yaml = SafeAccess::from("name: Ana", Format::Yaml);           // YamlAccessor
$xml  = SafeAccess::from('<root><n>1</n></root>', Format::Xml); // XmlAccessor
$arr  = SafeAccess::from(['a' => 1], Format::Array);            // ArrayAccessor

// Formato customizado (apenas string)
```

Lança `InvalidFormatException` se o formato for desconhecido e não estiver registrado.

#### `SafeAccess::detect(mixed $data): AbstractAccessor`

Auto-detecta o formato e cria o accessor apropriado.

Prioridade de detecção: array → SimpleXMLElement → object → string JSON (com fallback NDJSON) → string XML → string YAML → string TOML → string INI → string ENV.

```php
$accessor = SafeAccess::detect(['key' => 'value']); // ArrayAccessor
```

#### `SafeAccess::resetAll(): void`

Reseta **todo** o estado global de uma vez: política de segurança global e registry de plugins. Indicado para teardown de suite de testes quando múltiplos subsistemas foram configurados.

```php
afterEach(function (): void {
    SafeAccess::resetAll();
});
```

#### `SafeAccess::withPolicy(mixed $data, SecurityPolicy $policy): AbstractAccessor`

Auto-detecta o formato e aplica limites de segurança da política (`maxPayloadBytes`, `maxKeys`, `maxDepth`, `allowedDirs`).

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(maxDepth: 64, allowedDirs: ['/app/config']);
$accessor = SafeAccess::withPolicy($jsonString, $policy);
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

Retorna o tipo normalizado do valor no caminho dado, ou `null` se o caminho não existir.

Valores possíveis: `"string"`, `"number"`, `"bool"`, `"object"`, `"array"`, `"null"`. Retorna `null` (não uma string) quando o caminho não existe.

```php
$accessor->type('name');   // "string"
$accessor->type('age');    // "number"
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

### Leitura Tipada

Métodos de conveniência que convertem o resultado para um tipo escalar PHP específico. Cada um retorna `$default` se o caminho não existir, e o valor convertido caso contrário.

#### `getInt(string $path, int $default = 0): int`

```php
$accessor->getInt('user.age');        // (int) valor ou 0
$accessor->getInt('score', -1);       // -1 se caminho ausente
```

#### `getBool(string $path, bool $default = false): bool`

```php
$accessor->getBool('feature.enabled');    // (bool) valor ou false
$accessor->getBool('debug', true);        // true se caminho ausente
```

#### `getString(string $path, string $default = ''): string`

```php
$accessor->getString('user.name');         // (string) valor ou ''
$accessor->getString('env', 'production'); // 'production' se caminho ausente
```

#### `getArray(string $path, array $default = []): array`

```php
$accessor->getArray('items');              // (array) valor ou []
$accessor->getArray('tags', ['default']);  // ['default'] se caminho ausente
```

#### `getFloat(string $path, float $default = 0.0): float`

```php
$accessor->getFloat('price');      // (float) valor ou 0.0
$accessor->getFloat('rate', 1.5);  // 1.5 se caminho ausente
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

#### `toJson(int|bool|array $flagsOrOptions = 0): string`

Converte dados para string JSON. Aceita três formas:

| Tipo do argumento | Comportamento                                                            |
| ----------------- | ------------------------------------------------------------------------ |
| `int`             | Bitmask `JSON_*` bruto (ex: `JSON_PRETTY_PRINT`)                         |
| `bool`            | `true` → `JSON_PRETTY_PRINT`; `false` → compacto                         |
| `array`           | Opções nomeadas: `pretty`, `unescapeUnicode`, `unescapeSlashes`, `space` |

```php
$accessor->toJson();                                     // compacto
$accessor->toJson(JSON_PRETTY_PRINT);                    // bitmask (legado)
$accessor->toJson(true);                                 // atalho para pretty
$accessor->toJson(['pretty' => true]);                   // opção nomeada
$accessor->toJson(['unescapeUnicode' => true]);           // mantém unicode
$accessor->toJson(['unescapeSlashes' => true]);           // mantém barras
$accessor->toJson(['pretty' => true, 'unescapeUnicode' => true]); // combinado
```

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

#### `toNdjson(): string`

Serializa dados para Newline Delimited JSON. Cada valor de nível superior se torna uma linha JSON separada.

```php
$accessor = SafeAccess::fromArray([['id' => 1], ['id' => 2]]);
$accessor->toNdjson(); // '{"id":1}\n{"id":2}'
```

### Readonly

O construtor de `AbstractAccessor` aceita `bool $readonly = false`. Quando `true`, todos os métodos de escrita (`set`, `remove`, `merge`, etc.) lançam `ReadonlyViolationException`.

```php
$accessor = SafeAccess::fromArray(['key' => 'value']);
$readonly = new \SafeAccessInline\Accessors\ArrayAccessor(['key' => 'value'], true);
$readonly->set('key', 'new'); // lança ReadonlyViolationException
```

### Acesso por Segmentos

Para casos onde você precisa de acesso literal ao caminho sem parsing de wildcard ou filtro:

#### `getAt(array $segments, mixed $default = null): mixed`

```php
$accessor->getAt(['users', '0', 'name']); // travessia literal
```

#### `hasAt(array $segments): bool`

#### `setAt(array $segments, mixed $value): static`

#### `removeAt(array $segments): static`

---

### Wildcard Conveniente

#### `getWildcard(string $path, mixed $default = null): array`

Wrapper de conveniência para caminhos wildcard — sempre retorna um `array`. Equivalente a chamar `get($path)` onde `$path` contém uma expressão `*` ou `.**`, mas explicitamente tipado para análise estática.

```php
$names = $accessor->getWildcard('users.*.name');   // ['Ana', 'Bob']
$all   = $accessor->getWildcard('missing.*', []);   // [] (default)
```

---
