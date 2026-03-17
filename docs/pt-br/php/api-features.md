---
outline: deep
---

# API — Operações & I/O — PHP

## Índice

- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Configuração em Camadas](#configuração-em-camadas)
- [Observação de Arquivos](#observação-de-arquivos)
- [Log de Auditoria](#log-de-auditoria)
- [Segurança](#segurança)
- [Validação de Schema](#validação-de-schema)
- [Integrações de Framework](#integrações-de-framework)

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

#### `IoLoader::resolveFormatFromExtension(string $filePath): ?AccessorFormat`

Deriva o caso do enum `AccessorFormat` a partir da extensão do caminho de arquivo (ex.: `config.yaml` → `AccessorFormat::Yaml`). Retorna `null` quando a extensão não é reconhecida.

```php
use SafeAccessInline\Core\IoLoader;

$format = IoLoader::resolveFormatFromExtension('/app/config.yaml'); // AccessorFormat::Yaml
$format = IoLoader::resolveFormatFromExtension('/app/data.ndjson');  // AccessorFormat::Ndjson
$format = IoLoader::resolveFormatFromExtension('/app/file.txt');     // null
```

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

Bloqueia chaves de prototype pollution: `__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `valueOf`, `toString`, `hasOwnProperty`, `isPrototypeOf`. Lança `SecurityException`.

#### `SecurityGuard::sanitizeObject(array $data): array`

Remove recursivamente chaves proibidas dos dados.

### CsvSanitizer

**Namespace:** `SafeAccessInline\Security\CsvSanitizer`

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

**Namespace:** `SafeAccessInline\Security\DataMasker`

#### `DataMasker::mask(array $data, array $patterns = []): array`

Substitui valores de chaves sensíveis por `[REDACTED]`. Chaves sensíveis embutidas: `password`, `secret`, `token`, `api_key`, `apikey`, `private_key`, `passphrase`, `credential`, `auth`, `authorization`, `cookie`, `session`, `ssn`, `credit_card`, `creditcard`.

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
