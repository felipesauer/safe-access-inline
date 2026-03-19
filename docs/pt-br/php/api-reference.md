---
outline: deep
---

# Referência da API — PHP

## Índice

- [Facade SafeAccess](#facade-safeaccess)
- [Métodos de Instância do Accessor](#metodos-de-instancia-do-accessor)
    - [Leitura](#leitura)
    - [Escrita (Imutável)](#escrita-imutavel)
    - [Transformação](#transformacao)
    - [Segurança & Validação](#seguranca-validacao)
    - [Readonly](#readonly)
    - [Operações de Array (Imutável)](#operacoes-de-array-imutavel)
    - [JSON Patch & Diff](#json-patch-diff)
    - [Acesso por Segmentos](#acesso-por-segmentos)

**Ver também:**

- [API — Operações & I/O](/pt-br/php/api-features)
- [API — Tipos & Internos](/pt-br/php/api-types)

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

#### `SafeAccess::fromNdjson(string $data): NdjsonAccessor`

Cria um accessor a partir de uma string Newline Delimited JSON (NDJSON). Cada linha é parseada como um objeto JSON separado.

```php
$accessor = SafeAccess::fromNdjson('{"id":1}' . "\n" . '{"id":2}');
$accessor->get('0.id'); // 1
```

#### `SafeAccess::from(mixed $data, string|AccessorFormat $format = ''): AbstractAccessor`

Fábrica unificada — cria um accessor a partir de qualquer dado. Com uma string de formato ou um valor do enum `AccessorFormat`, delega para a fábrica tipada correspondente. Sem formato, detecta automaticamente (equivalente a `detect()`).

Formatos suportados: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'csv'`, `'env'`, ou qualquer nome customizado registrado via `extend()`. Todos os formatos built-in também estão disponíveis como casos do enum `AccessorFormat`.

```php
use SafeAccessInline\Enums\AccessorFormat;

// Auto-detecção (sem formato)
$accessor = SafeAccess::from('{"name": "Ana"}'); // JsonAccessor

// Formato explícito via string
$json = SafeAccess::from('{"name": "Ana"}', 'json');   // JsonAccessor
$yaml = SafeAccess::from("name: Ana", 'yaml');          // YamlAccessor

// Formato explícito via enum
$json = SafeAccess::from('{"name": "Ana"}', AccessorFormat::Json);    // JsonAccessor
$yaml = SafeAccess::from("name: Ana", AccessorFormat::Yaml);           // YamlAccessor
$xml  = SafeAccess::from('<root><n>1</n></root>', AccessorFormat::Xml); // XmlAccessor
$arr  = SafeAccess::from(['a' => 1], AccessorFormat::Array);            // ArrayAccessor

// Formato customizado (apenas string)
SafeAccess::extend('custom', MyAccessor::class);
$custom = SafeAccess::from($data, 'custom');
```

Lança `InvalidFormatException` se o formato for desconhecido e não estiver registrado.

#### `SafeAccess::detect(mixed $data): AbstractAccessor`

Auto-detecta o formato e cria o accessor apropriado.

Prioridade de detecção: array → SimpleXMLElement → object → string JSON (com fallback NDJSON) → string XML → string YAML → string TOML → string INI → string ENV.

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

#### `SafeAccess::fromFile(string $filePath, ?string $format = null, array $allowedDirs = [], bool $allowAnyPath = false): AbstractAccessor`

Lê um arquivo do disco e cria o accessor apropriado. Auto-detecta o formato pela extensão do arquivo se `$format` for `null`. O parâmetro `$allowedDirs` restringe quais diretórios podem ser lidos (proteção contra path-traversal). Defina `$allowAnyPath = true` para ignorar restrições de diretório (use com cautela).

```php
$accessor = SafeAccess::fromFile('/etc/config.json');
$accessor = SafeAccess::fromFile('/app/config.yaml', 'yaml');
$accessor = SafeAccess::fromFile('/app/config.json', null, ['/app']);
$accessor = SafeAccess::fromFile('/tmp/data.json', null, [], true); // caminho irrestrito
```

Lança `SecurityException` se o caminho estiver fora dos diretórios permitidos.

#### `SafeAccess::fromUrl(string $url, ?string $format = null, array $options = []): AbstractAccessor`

Busca uma URL (somente HTTPS, seguro contra SSRF) e retorna o accessor apropriado. Auto-detecta o formato pela extensão do caminho da URL.

Opções: `allowPrivateIps` (bool), `allowedHosts` (string[]), `allowedPorts` (int[]).

```php
$accessor = SafeAccess::fromUrl('https://api.example.com/config.json');
$accessor = SafeAccess::fromUrl('https://api.example.com/data', 'json', [
    'allowedHosts' => ['api.example.com'],
]);
```

Lança `SecurityException` em tentativas de SSRF, IPs privados, não-HTTPS ou hosts não permitidos.

#### `SafeAccess::withPolicy(mixed $data, SecurityPolicy $policy): AbstractAccessor`

Auto-detecta o formato e aplica limites de segurança da política (`maxPayloadBytes`, `maxKeys`, `maxDepth`). Também aplica padrões de máscara se presentes.

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(maskPatterns: ['password', 'secret']);
$accessor = SafeAccess::withPolicy($jsonString, $policy);
```

#### `SafeAccess::fromFileWithPolicy(string $filePath, SecurityPolicy $policy): AbstractAccessor`

Carrega um arquivo restrito aos `allowedDirs` da política.

```php
$policy = new SecurityPolicy(allowedDirs: ['/app/config']);
$accessor = SafeAccess::fromFileWithPolicy('/app/config/app.json', $policy);
```

#### `SafeAccess::fromUrlWithPolicy(string $url, SecurityPolicy $policy): AbstractAccessor`

Busca uma URL restrita pelas opções de URL da política.

```php
$policy = new SecurityPolicy(url: [
    'allowedHosts' => ['api.example.com'],
    'allowPrivateIps' => false,
]);
$accessor = SafeAccess::fromUrlWithPolicy('https://api.example.com/config.json', $policy);
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

#### `getTemplate(string $template, array $bindings, mixed $default = null): mixed`

Resolve uma string de template substituindo as chaves de `$bindings` pelos seus valores, depois lê o caminho resultante no accessor.

```php
// O template usa placeholders {chave} resolvidos contra $bindings
$accessor->getTemplate('users.{id}.name', ['id' => '0']); // 'Ana'
$accessor->getTemplate('settings.{section}.{key}', ['section' => 'db', 'key' => 'host'], 'localhost');
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

#### `toNdjson(): string`

Serializa dados para Newline Delimited JSON. Cada valor de nível superior se torna uma linha JSON separada.

```php
$accessor = SafeAccess::fromArray([['id' => 1], ['id' => 2]]);
$accessor->toNdjson(); // '{"id":1}\n{"id":2}'
```

#### `toCsv(?string $csvMode = null): string`

Serializa os dados para formato CSV. O parâmetro opcional `$csvMode` controla a sanitização de injeção CSV: `'none'` (padrão), `'prefix'`, `'strip'`, ou `'error'`.

```php
$accessor->toCsv();          // padrão: sem sanitização
$accessor->toCsv('strip');   // remove caracteres iniciais perigosos
```

#### `transform(string $format): string`

Serializa dados para qualquer formato. Utiliza serializers embutidos para `yaml` e `toml` (sem necessidade de plugin). Outros formatos requerem um plugin serializer registrado; lança `UnsupportedTypeException` se nenhum for encontrado.

```php
// yaml e toml funcionam sem registro
$accessor->transform('yaml');  // "name: Ana\nage: 30\n"
$accessor->transform('toml');  // 'name = "Ana"\nage = 30\n'

// Formatos customizados precisam de um plugin
PluginRegistry::registerSerializer('csv', new MyCsvSerializer());
$accessor->transform('csv');
```

### Segurança & Validação

#### `masked(array $patterns = []): static`

Retorna uma **nova instância** com dados sensíveis substituídos por `[REDACTED]`. Auto-detecta chaves comuns (password, token, secret, api_key, etc.). Padrões glob customizados podem ser fornecidos.

```php
$safe = $accessor->masked();
$safe->get('database.password'); // '[REDACTED]'

// Com padrões customizados
$safe = $accessor->masked(['*_key', 'credentials.*']);
```

#### `validate(mixed $schema, ?SchemaAdapterInterface $adapter = null): static`

Valida dados contra um schema. Usa o adapter padrão do `SchemaRegistry` se nenhum for fornecido. Lança `SchemaValidationException` em caso de falha. Retorna `$this` para encadeamento fluente.

```php
use SafeAccessInline\Core\Registries\SchemaRegistry;

SchemaRegistry::setDefaultAdapter($myAdapter);
$accessor->validate($schema)->get('name'); // encadeamento fluente

// Com adapter explícito
$accessor->validate($schema, new MySchemaAdapter());
```

### Readonly

O construtor de `AbstractAccessor` aceita `bool $readonly = false`. Quando `true`, todos os métodos de escrita (`set`, `remove`, `merge`, `push`, `pop`, etc.) lançam `ReadonlyViolationException`.

```php
$accessor = SafeAccess::fromArray(['key' => 'value']);
$readonly = new \SafeAccessInline\Accessors\ArrayAccessor(['key' => 'value'], true);
$readonly->set('key', 'new'); // lança ReadonlyViolationException
```

### Operações de Array (Imutável)

Todas as operações de array retornam **novas instâncias** — o original nunca é mutado.

#### `push(string $path, mixed ...$items): static`

Adiciona itens ao final do array em `$path`.

```php
$new = $accessor->push('tags', 'php', 'safe');
```

#### `pop(string $path): static`

Remove o último item do array em `$path`.

```php
$new = $accessor->pop('tags');
```

#### `shift(string $path): static`

Remove o primeiro item do array em `$path`.

```php
$new = $accessor->shift('queue');
```

#### `unshift(string $path, mixed ...$items): static`

Adiciona itens ao início do array em `$path`.

```php
$new = $accessor->unshift('queue', 'first');
```

#### `insert(string $path, int $index, mixed ...$items): static`

Insere itens em um índice específico no array em `$path`. Suporta índices negativos.

```php
$new = $accessor->insert('items', 1, 'inserted');
$new = $accessor->insert('items', -1, 'before-last');
```

#### `filterAt(string $path, callable $predicate): static`

Filtra itens do array em `$path` usando um predicado `fn($value, $key): bool`.

```php
$new = $accessor->filterAt('users', fn($u) => $u['active'] === true);
```

#### `mapAt(string $path, callable $transform): static`

Transforma cada item do array em `$path` usando `fn($value, $key): mixed`.

```php
$new = $accessor->mapAt('prices', fn($p) => $p * 1.1);
```

#### `sortAt(string $path, ?string $key = null, string $direction = 'asc'): static`

Ordena o array em `$path`. Opcionalmente por uma sub-chave. Direção: `'asc'` ou `'desc'`.

```php
$sorted = $accessor->sortAt('users', 'name');
$desc   = $accessor->sortAt('scores', null, 'desc');
```

#### `unique(string $path, ?string $key = null): static`

Remove valores duplicados do array em `$path`. Opcionalmente desduplicar por uma sub-chave.

```php
$new = $accessor->unique('tags');
$new = $accessor->unique('users', 'email');
```

#### `flatten(string $path, int $depth = 1): static`

Achata arrays aninhados em `$path` por `$depth` níveis.

```php
$new = $accessor->flatten('matrix');        // 1 nível
$new = $accessor->flatten('deep', PHP_INT_MAX); // totalmente achatado
```

#### `first(string $path, mixed $default = null): mixed`

Retorna o primeiro elemento do array em `$path`.

```php
$accessor->first('items'); // primeiro item ou null
```

#### `last(string $path, mixed $default = null): mixed`

Retorna o último elemento do array em `$path`.

```php
$accessor->last('items'); // último item ou null
```

#### `nth(string $path, int $index, mixed $default = null): mixed`

Retorna o elemento no índice `$index`. Suporta índices negativos (`-1` = último).

```php
$accessor->nth('items', 0);    // primeiro
$accessor->nth('items', -1);   // último
$accessor->nth('items', 99, 'fallback'); // 'fallback'
```

### JSON Patch & Diff

#### `diff(AbstractAccessor $other): array`

Gera operações RFC 6902 JSON Patch representando as diferenças entre dois accessors.

```php
$a = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
$b = SafeAccess::fromArray(['name' => 'Ana', 'age' => 31, 'city' => 'SP']);

$ops = $a->diff($b);
// [
//   ['op' => 'replace', 'path' => '/age', 'value' => 31],
//   ['op' => 'add', 'path' => '/city', 'value' => 'SP'],
// ]
```

#### `applyPatch(array $ops): static`

Aplica operações RFC 6902 JSON Patch. Suporta: `add`, `replace`, `remove`, `move`, `copy`, `test`. Retorna uma **nova instância**.

```php
$new = $accessor->applyPatch([
    ['op' => 'replace', 'path' => '/name', 'value' => 'Updated'],
    ['op' => 'add', 'path' => '/new_key', 'value' => 42],
    ['op' => 'remove', 'path' => '/old_key'],
]);
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
