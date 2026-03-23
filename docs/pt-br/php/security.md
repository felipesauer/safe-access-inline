---
outline: deep
---

# Segurança & Integrações — PHP

## Índice

- [Segurança \& Integrações — PHP](#segurança--integrações--php)
    - [Índice](#índice)
    - [Segurança](#segurança)
        - [SecurityPolicy](#securitypolicy)
        - [Mascaramento de dados](#mascaramento-de-dados)
        - [Accessors readonly](#accessors-readonly)
    - [Validação de Schema](#validação-de-schema)
    - [Log de Auditoria](#log-de-auditoria)
    - [Integrações de Framework](#integrações-de-framework)
        - [Laravel](#laravel)
        - [Symfony](#symfony)

## Segurança

### SecurityPolicy

Combine todas as configurações de segurança em uma única política:

```php
use SafeAccessInline\Security\Guards\SecurityPolicy;

$policy = new SecurityPolicy(
    maxDepth: 128,
    maxPayloadBytes: 1_048_576,  // 1 MB
    maxKeys: 5000,
    allowedDirs: ['/app/config'],
    url: ['allowedHosts' => ['api.example.com']],
    csvMode: 'strip',
    maskPatterns: ['password', '*_token'],
);

// Carregar com política
$accessor = SafeAccess::withPolicy($jsonString, $policy);
$accessor = SafeAccess::fromFileWithPolicy('/app/config.json', $policy);
$accessor = SafeAccess::fromUrlWithPolicy('https://api.example.com/config.json', $policy);
```

#### Presets de Política

Dois presets integrados estão disponíveis:

- **`SecurityPolicy::strict()`** — limites restritivos para entrada não confiável
- **`SecurityPolicy::permissive()`** — limites relaxados para ambientes confiáveis

```php
$accessor = SafeAccess::withPolicy($data, SecurityPolicy::strict());
```

#### Política Global

Defina uma política global que se aplica como padrão para todas as operações:

```php
SecurityPolicy::setGlobal(SecurityPolicy::strict());
$current = SecurityPolicy::getGlobal(); // ?SecurityPolicy
SecurityPolicy::clearGlobal();

// Ou via facade SafeAccess
SafeAccess::setGlobalPolicy(SecurityPolicy::strict());
SafeAccess::clearGlobalPolicy();
```

### Mascaramento de dados

```php
$accessor = SafeAccess::fromArray([
    'user' => 'Ana',
    'password' => 's3cret',
    'api_key' => 'abc-123',
]);

$safe = $accessor->mask();
$safe->get('password');  // '[REDACTED]'
$safe->get('api_key');   // '[REDACTED]'
$safe->get('user');      // 'Ana'

// Padrões customizados
$safe = $accessor->mask(['custom_secret', '*_token']);
```

### Accessors readonly

```php
$readonly = new \SafeAccessInline\Accessors\ArrayAccessor(['key' => 'value'], true);
$readonly->get('key');           // 'value' — leitura funciona
$readonly->set('key', 'new');    // lança ReadonlyViolationException
```

---

## Validação de Schema

```php
use SafeAccessInline\Core\Registries\SchemaRegistry;

// Registrar um adaptador padrão (implemente SchemaAdapterInterface)
SchemaRegistry::setDefaultAdapter($myAdapter);

// Validar — lança SchemaValidationException em caso de falha
$accessor->validate($schema);

// Encadeamento fluente
$name = $accessor->validate($schema)->get('name');

// Com adaptador explícito
$accessor->validate($schema, new MySchemaAdapter());
```

---

## Log de Auditoria

Rastreie operações relevantes para segurança:

```php
$unsub = SafeAccess::onAudit(function (array $event) {
    // $event = ['type' => 'file.read', 'timestamp' => ..., 'detail' => [...]]
    logger()->info($event['type'], $event['detail']);
});

// Eventos: file.read, file.watch, url.fetch, security.violation,
//         security.deprecation, data.mask, data.freeze, schema.validate

// Limpar
$unsub();
SafeAccess::clearAuditListeners();
```

---

## Integrações de Framework

### Laravel

```php
use SafeAccessInline\Integrations\LaravelServiceProvider;

// No método register() de um service provider:
LaravelServiceProvider::register($this->app);

// Agora resolva a partir do container:
$accessor = app('safe-access');
$accessor = app(\SafeAccessInline\Core\AbstractAccessor::class);

// Ou encapsule a config diretamente:
$config = LaravelServiceProvider::fromConfig(config());
$config->get('app.name');                        // acesso type-safe
$config->get('database.connections.*.driver');    // wildcard

// Chave de config específica:
$db = LaravelServiceProvider::fromConfigKey(config(), 'database');
$db->get('default'); // 'mysql'
```

### Symfony

```php
use SafeAccessInline\Integrations\SymfonyIntegration;

// A partir de ParameterBag
$accessor = SymfonyIntegration::fromParameterBag($container->getParameterBag());
$accessor->get('kernel.environment');  // 'prod'

// A partir de array de config
$accessor = SymfonyIntegration::fromConfig($processedConfig);

// A partir de arquivo YAML (com proteção de caminho)
$accessor = SymfonyIntegration::fromYamlFile('/app/config/services.yaml', ['/app/config']);
```
