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
    - [Leitura](#leitura)
    - [Escrita (Imutável)](#escrita-imutável)
    - [Operações de Array (Imutável)](#operações-de-array-imutável)
    - [JSON Patch & Diff](#json-patch--diff)
    - [Transformação](#transformação)
    - [Segurança & Validação](#segurança--validação)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Configuração em Camadas](#configuração-em-camadas)
- [Observação de Arquivos](#observação-de-arquivos)
- [Log de Auditoria](#log-de-auditoria)
- [Segurança](#segurança)
    - [SecurityPolicy](#securitypolicy)
    - [SecurityOptions](#securityoptions)
    - [SecurityGuard](#securityguard)
    - [CsvSanitizer](#csvsanitizer)
    - [DataMasker](#datamasker)
- [Validação de Schema](#validação-de-schema)
- [Integrações de Framework](#integrações-de-framework)
    - [Laravel](#laravel)
    - [Symfony](#symfony)
- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Exceções](#exceções)
- [Interfaces](#interfaces)
- [Enums](#enums)

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

#### `SafeAccess::fromFile(string $filePath, ?string $format = null, array $allowedDirs = []): AbstractAccessor`

Lê um arquivo do disco e cria o accessor apropriado. Auto-detecta o formato pela extensão do arquivo se `$format` for `null`. O parâmetro `$allowedDirs` restringe quais diretórios podem ser lidos (proteção contra path-traversal).

```php
$accessor = SafeAccess::fromFile('/etc/config.json');
$accessor = SafeAccess::fromFile('/app/config.yaml', 'yaml');
$accessor = SafeAccess::fromFile('/app/config.json', null, ['/app']);
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

Auto-detecta o formato e opcionalmente aplica padrões de máscara da política.

```php
use SafeAccessInline\Security\SecurityPolicy;

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

#### `toNdjson(): string`

Serializa dados para Newline Delimited JSON. Cada valor de nível superior se torna uma linha JSON separada.

```php
$accessor = SafeAccess::fromArray([['id' => 1], ['id' => 2]]);
$accessor->toNdjson(); // '{"id":1}\n{"id":2}'
```

#### `transform(string $format): string`

Serializa dados para qualquer formato que tenha um plugin serializer registrado. Lança `UnsupportedTypeException` se nenhum serializer estiver registrado para o formato dado.

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
$accessor->transform('yaml');  // "name: Ana\nage: 30\n"
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
use SafeAccessInline\Core\SchemaRegistry;

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

## I/O & Carregamento de Arquivos

**Namespace:** `SafeAccessInline\Core\IoLoader`

#### `IoLoader::readFile(string $filePath, array $allowedDirs = []): string`

Lê um arquivo com proteção contra path-traversal. Emite evento de auditoria `file.read`.

#### `IoLoader::fetchUrl(string $url, array $options = []): string`

Busca uma URL com proteção contra SSRF (bloqueia IPs privados, endpoints de metadados cloud, exige HTTPS).

#### `IoLoader::assertSafeUrl(string $url, array $options = []): void`

Valida se uma URL é segura sem buscá-la.

#### `IoLoader::assertPathWithinAllowedDirs(string $filePath, array $allowedDirs = []): void`

Valida se um caminho de arquivo está dentro dos diretórios permitidos.

#### `IoLoader::isPrivateIp(string $ip): bool`

Verifica se um endereço IP está em uma faixa privada (RFC 1918, link-local, loopback, metadados cloud).

---

## Configuração em Camadas

#### `SafeAccess::layer(array $sources): AbstractAccessor`

Faz deep-merge de múltiplos accessors em um (último vence). Retorna um `ObjectAccessor`.

```php
$base     = SafeAccess::fromFile('/app/config/defaults.json');
$override = SafeAccess::fromFile('/app/config/local.json');
$merged   = SafeAccess::layer([$base, $override]);
```

#### `SafeAccess::layerFiles(array $paths, array $allowedDirs = []): AbstractAccessor`

Carrega múltiplos arquivos e faz deep-merge deles. Wrapper de conveniência para `fromFile()` + `layer()`.

```php
$config = SafeAccess::layerFiles([
    '/app/config/defaults.yaml',
    '/app/config/production.yaml',
], ['/app/config']);
```

---

## Observação de Arquivos

#### `SafeAccess::watchFile(string $filePath, callable $onChange, ?string $format = null, array $allowedDirs = []): callable`

Observa um arquivo por mudanças usando polling. Chama `$onChange(AbstractAccessor)` quando o arquivo é modificado. Retorna uma função de parada.

```php
$stop = SafeAccess::watchFile('/app/config.json', function ($accessor) {
    echo "Config atualizada!\n";
});

// Depois: parar de observar
$stop();
```

---

## Log de Auditoria

#### `SafeAccess::onAudit(callable $listener): callable`

Inscreve-se em eventos de auditoria. Retorna uma função de cancelamento de inscrição.

Tipos de evento: `file.read`, `file.watch`, `url.fetch`, `security.violation`, `data.mask`, `data.freeze`, `schema.validate`.

```php
$unsub = SafeAccess::onAudit(function (array $event) {
    // $event = ['type' => 'file.read', 'timestamp' => 1234567890.123, 'detail' => [...]]
    log($event['type'], $event['detail']);
});

// Depois: cancelar inscrição
$unsub();
```

#### `SafeAccess::clearAuditListeners(): void`

Remove todos os listeners de auditoria registrados.

---

## Segurança

### SecurityPolicy

**Namespace:** `SafeAccessInline\Security\SecurityPolicy`

Agrega todas as configurações de segurança em um único objeto de política imutável.

```php
use SafeAccessInline\Security\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 512,
    maxPayloadBytes: 10_485_760,  // 10 MB
    maxKeys: 10_000,
    allowedDirs: ['/app/config'],
    url: [
        'allowPrivateIps' => false,
        'allowedHosts' => ['api.example.com'],
        'allowedPorts' => [443],
    ],
    csvMode: 'strip',
    maskPatterns: ['password', 'secret', '*_token'],
);
```

#### `merge(array $overrides): self`

Cria uma nova política com valores sobrescritos.

```php
$strict = $policy->merge(['maxDepth' => 64, 'maxKeys' => 1000]);
```

### SecurityOptions

**Namespace:** `SafeAccessInline\Security\SecurityOptions`

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

**Namespace:** `SafeAccessInline\Security\SecurityGuard`

#### `SecurityGuard::assertSafeKey(string $key): void`

Bloqueia chaves de prototype pollution: `__proto__`, `constructor`, `prototype`. Lança `SecurityException`.

#### `SecurityGuard::sanitizeObject(array $data): array`

Remove recursivamente chaves proibidas dos dados.

### CsvSanitizer

**Namespace:** `SafeAccessInline\Security\CsvSanitizer`

Protege contra ataques de CSV injection (`=`, `+`, `-`, `@`, `\t`, `\r`).

#### `CsvSanitizer::sanitizeCell(string $cell, string $mode = 'none'): string`

| Modo       | Comportamento                           |
| ---------- | --------------------------------------- |
| `'none'`   | Sem sanitização                         |
| `'prefix'` | Adiciona `'` antes de células perigosas |
| `'strip'`  | Remove caracteres perigosos iniciais    |
| `'error'`  | Lança `SecurityException`               |

#### `CsvSanitizer::sanitizeRow(array $row, string $mode = 'none'): array`

Aplica `sanitizeCell` a cada célula de uma linha.

### DataMasker

**Namespace:** `SafeAccessInline\Security\DataMasker`

#### `DataMasker::mask(array $data, array $patterns = []): array`

Substitui valores de chaves sensíveis por `[REDACTED]`. Chaves sensíveis embutidas: `password`, `secret`, `token`, `api_key`, `apiKey`, `authorization`, `auth`, `credential`, `private_key`, `privateKey`, `access_token`, `accessToken`, `refresh_token`, `refreshToken`.

Padrões glob customizados estendem (não substituem) a lista embutida.

---

## Validação de Schema

### SchemaRegistry

**Namespace:** `SafeAccessInline\Core\SchemaRegistry`

#### `SchemaRegistry::setDefaultAdapter(SchemaAdapterInterface $adapter): void`

Define um adapter de schema padrão usado por `validate()` quando nenhum adapter é passado explicitamente.

#### `SchemaRegistry::getDefaultAdapter(): ?SchemaAdapterInterface`

#### `SchemaRegistry::clearDefaultAdapter(): void`

### SchemaAdapterInterface

**Namespace:** `SafeAccessInline\Contracts\SchemaAdapterInterface`

```php
interface SchemaAdapterInterface
{
    public function validate(array $data, mixed $schema): SchemaValidationResult;
}
```

### SchemaValidationResult

**Namespace:** `SafeAccessInline\Contracts\SchemaValidationResult`

```php
readonly class SchemaValidationResult
{
    public bool $valid;
    /** @var SchemaValidationIssue[] */
    public array $errors;
}
```

### SchemaValidationIssue

**Namespace:** `SafeAccessInline\Contracts\SchemaValidationIssue`

```php
readonly class SchemaValidationIssue
{
    public string $path;
    public string $message;
}
```

---

## Integrações de Framework

### Laravel

**Namespace:** `SafeAccessInline\Integrations\LaravelServiceProvider`

#### `LaravelServiceProvider::register(object $app): void`

Registra um singleton `'safe-access'` no container do Laravel com um alias para `AbstractAccessor::class`.

```php
use SafeAccessInline\Integrations\LaravelServiceProvider;

LaravelServiceProvider::register($this->app);

// Resolver do container
$accessor = app('safe-access');
$accessor = app(AbstractAccessor::class);
```

#### `LaravelServiceProvider::fromConfig(object $config): AbstractAccessor`

Envolve todo o repositório de configuração do Laravel.

```php
$accessor = LaravelServiceProvider::fromConfig(config());
$accessor->get('app.name'); // 'Laravel'
```

#### `LaravelServiceProvider::fromConfigKey(object $config, string $key): AbstractAccessor`

Envolve uma chave de configuração específica.

```php
$accessor = LaravelServiceProvider::fromConfigKey(config(), 'database');
$accessor->get('default'); // 'mysql'
```

### Symfony

**Namespace:** `SafeAccessInline\Integrations\SymfonyIntegration`

#### `SymfonyIntegration::fromParameterBag(object $parameterBag): AbstractAccessor`

Envolve o ParameterBag do Symfony.

```php
use SafeAccessInline\Integrations\SymfonyIntegration;

$accessor = SymfonyIntegration::fromParameterBag($container->getParameterBag());
$accessor->get('kernel.environment'); // 'prod'
```

#### `SymfonyIntegration::fromConfig(array $config): AbstractAccessor`

Envolve um array de configuração processado do Symfony.

```php
$accessor = SymfonyIntegration::fromConfig($processedConfig);
```

#### `SymfonyIntegration::fromYamlFile(string $yamlPath, array $allowedDirs = []): AbstractAccessor`

Carrega um arquivo de configuração YAML com proteção contra path-traversal.

```php
$accessor = SymfonyIntegration::fromYamlFile('/app/config/services.yaml', ['/app/config']);
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

#### `DotNotationParser::renderTemplate(string $template, array $bindings): string`

Renderiza placeholders `{key}` em um template de caminho.

```php
DotNotationParser::renderTemplate('users.{id}.name', ['id' => '42']);
// 'users.42.name'
```

---

## Exceções

| Exceção                      | Quando                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `AccessorException`          | Classe base de exceção                                                                                                         |
| `InvalidFormatException`     | Formato de input inválido (ex: JSON malformado, plugin parser ausente no nível do accessor)                                    |
| `UnsupportedTypeException`   | `detect()` não consegue determinar formato; `PluginRegistry` não tem plugin registrado; `toXml()`/`transform()` sem serializer |
| `PathNotFoundException`      | Reservado (não lançado por `get()`)                                                                                            |
| `SecurityException`          | Tentativa de SSRF, path traversal, payload muito grande, chaves proibidas, CSV injection (modo `error`)                        |
| `ReadonlyViolationException` | Modificação de um accessor readonly (`set`, `remove`, `merge`, `push`, etc.)                                                   |
| `SchemaValidationException`  | Validação de schema falhou — possui `getIssues(): SchemaValidationIssue[]` para informações detalhadas de erro                 |

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
