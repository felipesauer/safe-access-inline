---
outline: deep
---

# Recursos Avançados — PHP

## Índice

- [Operações de Array](#operações-de-array)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Configuração em Camadas](#configuração-em-camadas)

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
$stop = SafeAccess::watchFile('/app/config.json', function ($accessor) {
    echo "Config atualizada: " . $accessor->get('version') . "\n";
});

// Depois: parar de observar
$stop();
```
