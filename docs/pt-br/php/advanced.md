---
outline: deep
---

# Recursos Avançados — PHP

## Índice

- [Operações de Array](#operações-de-array)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Configuração em Camadas](#configuração-em-camadas)
- [Referência de configuração](#referência-de-configuração)
- [Integração com PHPStan](#integração-com-phpstan)

## Operações de Array

Todas as operações de array retornam **novas instâncias** — o original nunca é mutado.

```php
$accessor = SafeAccess::fromArray([
    'tags' => ['php', 'laravel', 'php'],
    'users' => [
        ['name' => 'Ana', 'age' => 30],
        ['name' => 'Bob', 'age' => 25],
        ['name' => 'Carol', 'age' => 30],
    ],
]);

// Adicionar itens
$new = $accessor->push('tags', 'safe-access');
// ['php', 'laravel', 'php', 'safe-access']

// Remover último / primeiro
$new = $accessor->pop('tags');     // remove o último elemento
$new = $accessor->shift('tags');   // remove o primeiro elemento

// Adicionar no início
$new = $accessor->unshift('tags', 'first');

// Inserir em um índice (suporta índices negativos)
$new = $accessor->insert('tags', 1, 'inserted');

// Filtrar
$adults = $accessor->filterAt('users', fn($u) => $u['age'] >= 30);

// Map / transformar
$names = $accessor->mapAt('users', fn($u) => $u['name']);

// Ordenar
$sorted = $accessor->sortAt('users', 'name');        // ascendente por 'name'
$desc   = $accessor->sortAt('users', 'age', 'desc'); // descendente por 'age'

// Único
$unique = $accessor->unique('tags');                  // remove 'php' duplicado
$byAge  = $accessor->unique('users', 'age');          // único por sub-chave

// Achatar
$flat = SafeAccess::fromArray(['matrix' => [[1, 2], [3, 4]]])
    ->flatten('matrix');  // [1, 2, 3, 4]

// Helpers de acesso
$accessor->first('users');    // ['name' => 'Ana', 'age' => 30]
$accessor->last('users');     // ['name' => 'Carol', 'age' => 30]
$accessor->nth('users', 1);   // ['name' => 'Bob', 'age' => 25]
$accessor->nth('users', -1);  // ['name' => 'Carol', 'age' => 30]
```

---

## JSON Patch & Diff

Gere e aplique operações JSON Patch RFC 6902:

```php
$a = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
$b = SafeAccess::fromArray(['name' => 'Ana', 'age' => 31, 'city' => 'SP']);

// Gerar diff
$ops = $a->diff($b);
// [
//   ['op' => 'replace', 'path' => '/age', 'value' => 31],
//   ['op' => 'add', 'path' => '/city', 'value' => 'SP'],
// ]

// Aplicar patch (retorna uma nova instância)
$patched = $a->applyPatch([
    ['op' => 'replace', 'path' => '/age', 'value' => 31],
    ['op' => 'add',     'path' => '/city', 'value' => 'SP'],
    ['op' => 'remove',  'path' => '/age'],
]);
```

Todas as operações do RFC 6902 são suportadas:

```php
$patched = $a->applyPatch([
    // move — move um valor de um caminho para outro
    ['op' => 'move', 'from' => '/age', 'path' => '/years'],
    // copy — copia um valor para um novo caminho
    ['op' => 'copy', 'from' => '/name', 'path' => '/alias'],
    // test — verifica se um valor é igual ao esperado (lança exceção em caso de diferença)
    ['op' => 'test', 'path' => '/name', 'value' => 'Ana'],
]);
```

Operações suportadas: `add`, `replace`, `remove`, `move`, `copy`, `test`.

---

## I/O & Carregamento de Arquivos

### Carregar de arquivo

```php
// Auto-detecta formato pela extensão
$config = SafeAccess::fromFile('/app/config.json');
$config = SafeAccess::fromFile('/app/config.yaml');

// Formato explícito
$config = SafeAccess::fromFile('/app/data.txt', 'json');

// Restringir diretórios permitidos (proteção contra path-traversal)
$config = SafeAccess::fromFile('/app/config.json', null, ['/app']);
```

### Carregar de URL

```php
// Apenas HTTPS, seguro contra SSRF
$data = SafeAccess::fromUrl('https://api.example.com/config.json');

// Com restrições
$data = SafeAccess::fromUrl('https://api.example.com/data', 'json', [
    'allowedHosts' => ['api.example.com'],
    'allowedPorts' => [443],
    'allowPrivateIps' => false,
]);
```

### Suporte a NDJSON

```php
$ndjson = '{"id":1,"name":"Ana"}' . "\n" . '{"id":2,"name":"Bob"}';
$accessor = SafeAccess::fromNdjson($ndjson);
$accessor->get('0.name');   // 'Ana'
$accessor->get('*.id');     // [1, 2]
$accessor->toNdjson();      // de volta para string NDJSON
```

---

## Configuração em Camadas

Mescle múltiplas fontes de configuração (última vence):

```php
// Empilhar instâncias de accessor
$defaults = SafeAccess::fromFile('/app/config/defaults.yaml');
$env      = SafeAccess::fromFile('/app/config/production.yaml');
$config   = SafeAccess::layer([$defaults, $env]);

$config->get('database.host'); // valor de production.yaml (se presente)

// Conveniência: empilhar a partir de arquivos
$config = SafeAccess::layerFiles([
    '/app/config/defaults.yaml',
    '/app/config/production.yaml',
], ['/app/config']); // diretórios permitidos
```

### Observação de arquivo

```php
$watcher = SafeAccess::watchFile('/app/config.json', function ($accessor) {
    echo "Config atualizada: " . $accessor->get('version') . "\n";
});

// Verificar alterações (executa o loop de observação)
$watcher['poll']();
// Ou parar de observar
$watcher['stop']();
```

---

## Referência de configuração

O pacote expõe classes de configuração para consumidores avançados que precisam ajustar limites explicitamente.

### `SafeAccessConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\SafeAccessConfig;

$config = new SafeAccessConfig(
    maxCustomAccessors: 50,
);
```

Limita quantas classes de accessor customizadas podem ser registradas com `SafeAccess::extend()`.

### `CacheConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\CacheConfig;

$config = new CacheConfig(
    maxSize: 1000,
);
```

Controla o número máximo de caminhos dot-notation em cache retidos por `PathCache`.

### `ParserConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\ParserConfig;

$config = new ParserConfig(
    maxResolveDepth: 512,
    maxXmlDepth: 100,
);
```

Define limites para resolução recursiva de caminhos e profundidade de XML.

### `MergerConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\MergerConfig;

$config = new MergerConfig(
    maxDepth: 512,
);
```

Limita a profundidade de recursão durante operações de deep merge.

### `MaskerConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\MaskerConfig;

$config = new MaskerConfig(
    defaultMaskValue: '[REDACTED]',
    maxRecursionDepth: 100,
    maxPatternCacheSize: 200,
);
```

Configura o valor de substituição e o limite de recursão usados por `DataMasker`.

### `AuditConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\AuditConfig;

$config = new AuditConfig(
    maxListeners: 100,
);
```

Limita o número de listeners de auditoria registrados ao mesmo tempo.

### `FilterParserConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\FilterParserConfig;

$config = new FilterParserConfig(
    maxPatternLength: 128,
    pcreBacktrackLimit: 1000,
    pcreRecursionLimit: 100,
);
```

Define o comprimento de regex e os limites do motor PCRE usados por expressões `match()` em filtros.

### `IoLoaderConfig`

```php
<?php
declare(strict_types=1);

use SafeAccessInline\Core\Config\IoLoaderConfig;

$config = new IoLoaderConfig(
    curlTimeout: 10,
    curlConnectTimeout: 5,
);
```

Controla o timeout total e o timeout de conexão do cURL, em segundos, para `IoLoader::fetchUrl()`.

---

## Integração com PHPStan

O pacote inclui uma extensão PHPStan customizada que estreita o tipo de retorno de `get()` em tempo de análise estática quando o accessor é anotado com um shape concreto. Sem a extensão, `get()` retorna `mixed`.

### Habilitando a Extensão

Adicione a extensão à configuração PHPStan do seu projeto:

```neon
# phpstan.neon
includes:
    - vendor/safe-access-inline/safe-access-inline/phpstan-extension.neon
```

### Como Funciona

Anote qualquer variável accessor com `@var AccessorClass<array{...}>` usando um shape inline. A extensão resolve o tipo de retorno de `get()` com base no shape no caminho chamado:

```php
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Accessors\JsonAccessor;

/** @var JsonAccessor<array{user: array{name: string, age: int}, active: bool}> $acc */
$acc = SafeAccess::fromJson($json);

$name   = $acc->get('user.name');   // PHPStan: string|null
$age    = $acc->get('user.age', 0); // PHPStan: int
$active = $acc->get('active');      // PHPStan: bool|null
$city   = $acc->get('user.city');   // PHPStan: mixed  (não está no shape → fallback)
```

Sem a anotação, `get()` retorna `mixed` — compatibilidade retroativa total é preservada.

### Classes de Accessor Suportadas

A extensão se aplica a todas as classes de accessor concretas:

- `ArrayAccessor`, `ObjectAccessor`, `JsonAccessor`
- `XmlAccessor`, `YamlAccessor`, `TomlAccessor`
- `IniAccessor`, `CsvAccessor`, `EnvAccessor`, `NdjsonAccessor`

::: tip Requisito de shape genérico
O tipo de shape deve ser fornecido como o primeiro parâmetro de template: `AccessorClass<array{...}>`. Usar `AbstractAccessor` diretamente como tipo anotado não é suportado pela extensão — use a subclasse concreta.
:::
