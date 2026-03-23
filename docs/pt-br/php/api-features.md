---
outline: deep
---

# API — Operações & I/O — PHP

## Índice

- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Streaming de Arquivos Grandes](#streaming-de-arquivos-grandes)
- [Configuração em Camadas](#configuração-em-camadas)
- [Observação de Arquivos](#observação-de-arquivos)
- [Log de Auditoria](#log-de-auditoria)
- [Segurança](#segurança)
- [Validação de Schema](#validação-de-schema)
- [Integrações de Framework](#integrações-de-framework)

## I/O & Carregamento de Arquivos

**Namespace:** `SafeAccessInline\Core\IoLoader`

O I/O em PHP é síncrono por definição. Diferentemente do pacote JS, o pacote PHP não expõe variantes assíncronas de `fromFile()` / `fromUrl()`; toda leitura de arquivo ou URL é concluída antes do retorno do accessor.

::: tip O PHP também tem streaming síncrono
O pacote PHP fornece `streamCsv()` e `streamNdjson()` como métodos baseados em `Generator` do PHP — funcionalmente equivalentes às variantes `AsyncGenerator` do JS. Use um laço `foreach` para processar linhas uma por vez sem carregar o arquivo inteiro na memória.
:::

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

#### `IoLoader::resolveFormatFromExtension(string $filePath): ?Format`

Deriva o caso do enum `Format` a partir da extensão do caminho de arquivo (ex.: `config.yaml` → `Format::Yaml`). Retorna `null` quando a extensão não é reconhecida.

```php
use SafeAccessInline\Core\IoLoader;

$format = IoLoader::resolveFormatFromExtension('/app/config.yaml'); // Format::Yaml
$format = IoLoader::resolveFormatFromExtension('/app/data.ndjson');  // Format::Ndjson
$format = IoLoader::resolveFormatFromExtension('/app/file.txt');     // null
```

---

## Streaming de Arquivos Grandes

Para processamento eficiente de memória de arquivos CSV ou NDJSON grandes, o PHP fornece streaming baseado em `Generator` — funcionalmente equivalente às variantes `AsyncGenerator` do JS.

#### `SafeAccess::streamCsv(string $filePath, array $allowedDirs = [], bool $allowAnyPath = false): Generator`

Lê um arquivo CSV linha por linha, produzindo cada linha como array associativo (chaves do cabeçalho → valores das células). O arquivo nunca é totalmente carregado na memória.

```php
use SafeAccessInline\SafeAccess;

foreach (SafeAccess::streamCsv('/app/data/users.csv', ['/app/data']) as $row) {
    // $row = ['name' => 'Ana', 'age' => '30', 'city' => 'Porto Alegre']
    echo $row['name'] . "\n";
}
```

::: tip Comparação com JS
No JS, o equivalente é `for await (const row of SafeAccess.streamCsv(path))`. O `foreach` síncrono do PHP entrega a mesma semântica de linha por vez. Veja [Arquitetura — Streaming: Síncrono (PHP) vs Assíncrono (JS)](/guide/architecture#streaming-síncrono-php-vs-assíncrono-js) para uma comparação detalhada.
:::

#### `SafeAccess::streamNdjson(string $filePath, array $allowedDirs = [], bool $allowAnyPath = false): Generator`

Lê um arquivo NDJSON linha por linha, produzindo cada linha como array associativo decodificado.

```php
foreach (SafeAccess::streamNdjson('/app/data/events.ndjson', ['/app/data']) as $event) {
    // $event = ['type' => 'click', 'ts' => 1711234567]
    processEvent($event);
}
```

::: warning Segurança de caminho
Ambos os métodos de streaming aplicam a mesma proteção `$allowedDirs` contra path-traversal que `fromFile()`. Passe uma allowlist ou defina `$allowAnyPath = true` explicitamente quando restrições de diretório não forem necessárias.
:::

---

## Configuração em Camadas

#### `SafeAccess::layer(array $sources): AbstractAccessor`

Faz deep-merge de múltiplos accessors em um (último vence). Retorna um `ObjectAccessor`.

```php
$base     = SafeAccess::fromFile('/app/config/defaults.json');
$override = SafeAccess::fromFile('/app/config/local.json');
$merged   = SafeAccess::layer([$base, $override]);
```

#### `SafeAccess::layerFiles(array $paths, FileLoadOptions|array $optionsOrAllowedDirs = [], bool $allowAnyPath = false): AbstractAccessor`

Carrega múltiplos arquivos e faz deep-merge deles. Aceita um DTO `FileLoadOptions` ou os parâmetros legados `array $allowedDirs` + `bool $allowAnyPath`.

```php
use SafeAccessInline\Contracts\FileLoadOptions;

$config = SafeAccess::layerFiles([
    '/app/config/defaults.yaml',
    '/app/config/production.yaml',
], ['/app/config']);

$config = SafeAccess::layerFiles(
    ['/app/config/defaults.yaml', '/app/config/production.yaml'],
    new FileLoadOptions(allowedDirs: ['/app/config']),
);
```

---

## Observação de Arquivos

#### `SafeAccess::watchFile(string $filePath, callable $onChange, FileLoadOptions|string|null $formatOrOptions = null, array $allowedDirs = [], bool $allowAnyPath = false): array{poll: callable(): void, stop: callable(): void}`

Observa um arquivo por mudanças usando polling. Chama `$onChange(AbstractAccessor)` quando o arquivo é modificado. Retorna um array com dois callables: `poll` (inicia o loop de polling bloqueante) e `stop` (para de observar).

**Parâmetros:**

| Parâmetro          | Tipo                            | Padrão  | Descrição                                                                            |
| ------------------ | ------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `$filePath`        | `string`                        | —       | Caminho do arquivo a observar.                                                       |
| `$onChange`        | `callable`                      | —       | Callback chamado com um `AbstractAccessor` atualizado a cada mudança.                |
| `$formatOrOptions` | `FileLoadOptions\|string\|null` | `null`  | String de formato, DTO `FileLoadOptions`, ou `null` para auto-detecção.              |
| `$allowedDirs`     | `array`                         | `[]`    | Legado: diretórios em que o arquivo deve residir (ignorado ao usar DTO).             |
| `$allowAnyPath`    | `bool`                          | `false` | Quando `true`, desativa a verificação de `allowedDirs`. Use com cuidado em produção. |

```php
$watcher = SafeAccess::watchFile('/app/config.json', function ($accessor) {
    echo "Config atualizada!\n";
});

// Iniciar polling (bloqueante — execute em processo/fiber separado conforme necessário)
$watcher['poll']();

// Parar de observar em outro contexto
$watcher['stop']();
```

```php
// ── Usando DTO FileLoadOptions (forma ergonômica) ─────────────────────────
use SafeAccessInline\Contracts\FileLoadOptions;

$watcher = SafeAccess::watchFile(
    '/app/config.json',
    fn ($accessor) => reload($accessor),
    new FileLoadOptions(allowedDirs: ['/app'], format: 'json'),
);
$watcher['poll']();
```

#### `SafeAccess::watchFilePoll(string $filePath, callable $callback, FileLoadOptions|string|null $formatOrOptions = null, int $pollIntervalMs = 500, ?int $maxIterations = null): void`

Wrapper bloqueante de conveniência em torno de `watchFile()` que conduz o loop de polling internamente. O método retorna quando `$maxIterations` ticks são concluídos (ou executa indefinidamente quando `null`).

| Parâmetro          | Tipo                            | Padrão | Descrição                                                    |
| ------------------ | ------------------------------- | ------ | ------------------------------------------------------------ |
| `$filePath`        | `string`                        | —      | Caminho do arquivo a monitorar.                              |
| `$callback`        | `callable`                      | —      | Chamado com um accessor atualizado a cada mudança detectada. |
| `$formatOrOptions` | `FileLoadOptions\|string\|null` | `null` | Formato ou DTO.                                              |
| `$pollIntervalMs`  | `int`                           | `500`  | Milissegundos entre verificações.                            |
| `$maxIterations`   | `int\|null`                     | `null` | Para após N ticks. `null` = executa para sempre.             |

::: warning
Sempre passe `$maxIterations` em testes para evitar loops infinitos.
:::

```php
// Verifica por 10 segundos (20 ticks × 500 ms) e então retorna.
SafeAccess::watchFilePoll(
    '/app/config.json',
    function ($accessor) {
        echo 'Config mudou: ' . $accessor->get('version') . PHP_EOL;
    },
    new FileLoadOptions(allowedDirs: ['/app'], format: 'json'),
    pollIntervalMs: 500,
    maxIterations: 20,
);
```

---

## Log de Auditoria

#### `SafeAccess::onAudit(callable $listener): callable`

Inscreve-se em eventos de auditoria. Retorna uma função de cancelamento de inscrição.

Tipos de evento: `file.read`, `file.write`, `file.watch`, `url.fetch`, `security.violation`, `security.deprecation`, `data.mask`, `data.freeze`, `data.format_warning`, `schema.validate`.

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

**Namespace:** `SafeAccessInline\Security\Guards\SecurityPolicy`

Agrega todas as configurações de segurança em um único objeto de política imutável.

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

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

### CsvSanitizer

**Namespace:** `SafeAccessInline\Security\Sanitizers\CsvSanitizer`

Protege contra ataques de CSV injection (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`).

#### `CsvSanitizer::sanitizeCell(string $cell, string $mode = 'none'): string`

| Modo       | Comportamento                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `'none'`   | Sem sanitização                                                                                                       |
| `'prefix'` | Adiciona `'` antes de células perigosas                                                                               |
| `'strip'`  | Remove todos os caracteres de prefixo de injeção CSV (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`) conforme orientação OWASP |
| `'error'`  | Lança `SecurityException`                                                                                             |

#### `CsvSanitizer::sanitizeRow(array $row, string $mode = 'none'): array`

Aplica `sanitizeCell` a cada célula de uma linha.

### DataMasker

**Namespace:** `SafeAccessInline\Security\Sanitizers\DataMasker`

#### `DataMasker::mask(array $data, array $patterns = []): array`

Substitui valores de chaves sensíveis por `[REDACTED]`. Chaves sensíveis embutidas: `password`, `secret`, `token`, `api_key`, `apikey`, `private_key`, `passphrase`, `credential`, `auth`, `authorization`, `cookie`, `session`, `ssn`, `credit_card`, `creditcard`.

Padrões glob customizados estendem (não substituem) a lista embutida.

---

## Validação de Schema

### SchemaRegistry

**Namespace:** `SafeAccessInline\Core\Registries\SchemaRegistry`

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

### Adapters incluídos

O pacote exporta adapters prontos para os sistemas de schema que suporta:

| Adapter                   | Dependência         | Notas                                                                                                                                          |
| ------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `JsonSchemaAdapter`       | Nenhuma             | Validador built-in com suporte a `type`, `required`, `properties`, `items`, `minimum`, `maximum`, `minLength`, `maxLength`, `enum` e `pattern` |
| `SymfonyValidatorAdapter` | `symfony/validator` | Aceita uma instância opcional de validator ou cria uma automaticamente quando o pacote está instalado                                          |

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

### LaravelFacade

**Namespace:** `SafeAccessInline\Integrations\LaravelFacade`

Fachada estática que delega chamadas para a instância de `AbstractAccessor` registrada no container Laravel sob a chave `'safe-access'`. Requer que `LaravelServiceProvider::register($app)` tenha sido chamado antes.

#### `LaravelFacade::resolve(object $app): AbstractAccessor`

Resolve e retorna a instância de `AbstractAccessor` do container fornecido.

```php
use SafeAccessInline\Integrations\LaravelFacade;

$accessor = LaravelFacade::resolve(app());
$accessor->get('database.default'); // 'mysql'
```

#### `LaravelFacade::__callStatic(string $method, array $arguments): mixed`

Delega qualquer chamada estática à instância de `AbstractAccessor` resolvida via `app()`.

```php
// Equivalente a app('safe-access')->get('app.name')
$name = LaravelFacade::get('app.name');
$port = LaravelFacade::get('database.connections.mysql.port', 3306);
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

#### `SymfonyIntegration::fromYamlFile(string $yamlPath, array $allowedDirs = [], bool $allowAnyPath = false): AbstractAccessor`

Carrega um arquivo de configuração YAML com proteção contra path-traversal.

```php
$accessor = SymfonyIntegration::fromYamlFile('/app/config/services.yaml', ['/app/config']);
```
