---
outline: deep
---

# Sistema de Plugins — PHP

YAML e TOML funcionam sem configuração (`ext-yaml` ou `symfony/yaml` para YAML, `devium/toml` para TOML). O Sistema de Plugins permite **substituir** os parsers e serializers padrão por implementações customizadas.

---

## Substituindo Padrões

```php
use SafeAccessInline\Core\Registries\PluginRegistry;
use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Plugins\DeviumTomlParser;

// Substituir parser YAML com opções customizadas
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

// Substituir parser TOML
PluginRegistry::registerParser('toml', new DeviumTomlParser());
```

> Plugins são **substituições opcionais**. YAML e TOML funcionam sem nenhum registro de plugin.

---

## Usando YAML (Sem Configuração)

```php
// Funciona sem configuração — nenhum registro de plugin necessário:
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
$accessor->get('name');           // "Ana"
$accessor->get('age');            // 30

$accessor->toYaml();              // "name: Ana\nage: 30\n"
```

---

## Usando TOML (Sem Configuração)

```php
$toml = <<<TOML
title = "My Config"

[database]
host = "localhost"
port = 5432
TOML;

$accessor = SafeAccess::fromToml($toml);
$accessor->get('title');              // "My Config"
$accessor->get('database.host');      // "localhost"
$accessor->toToml();                  // saída TOML
```

---

## Serialização Genérica com `transform()`

O método `transform()` serializa dados para qualquer formato que tenha um plugin de serialização registrado:

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->transform('yaml');     // "name: Ana\n"
```

---

## Plugins Incluídos

| Plugin                  | Formato | Tipo       | Requer                     |
| ----------------------- | ------- | ---------- | -------------------------- |
| `SymfonyYamlParser`     | yaml    | Parser     | `symfony/yaml`             |
| `SymfonyYamlSerializer` | yaml    | Serializer | `symfony/yaml`             |
| `NativeYamlParser`      | yaml    | Parser     | `ext-yaml` (extensão PHP)  |
| `NativeYamlSerializer`  | yaml    | Serializer | `ext-yaml` (extensão PHP)  |
| `DeviumTomlParser`      | toml    | Parser     | `devium/toml`              |
| `DeviumTomlSerializer`  | toml    | Serializer | `devium/toml`              |
| `SimpleXmlSerializer`   | xml     | Serializer | `ext-simplexml` (embutido) |

---

## Criando Plugins Customizados

Implemente `ParserPluginInterface` ou `SerializerPluginInterface`:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;

class MyYamlParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        return yaml_parse($raw);
    }
}

class MyYamlSerializer implements SerializerPluginInterface
{
    public function serialize(array $data): string
    {
        return yaml_emit($data);
    }
}

PluginRegistry::registerParser('yaml', new MyYamlParser());
PluginRegistry::registerSerializer('yaml', new MyYamlSerializer());
```

---

## Exemplo: Plugin Laravel Config

Um plugin que encapsula o helper `config()` do Laravel:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;

class LaravelConfigParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        // $raw é o nome de um grupo de configuração, ex: "database"
        return config($raw, []);
    }
}

PluginRegistry::registerParser('laravel-config', new LaravelConfigParser());
```

---

## Exemplo: Plugin Symfony ParameterBag

Um plugin para o `ParameterBag` do Symfony:

```php
use SafeAccessInline\Contracts\ParserPluginInterface;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;

class ParameterBagParser implements ParserPluginInterface
{
    public function __construct(
        private ParameterBagInterface $parameterBag,
    ) {}

    public function parse(string $raw): array
    {
        return $this->parameterBag->all();
    }
}

PluginRegistry::registerParser('parameters', new ParameterBagParser($container->getParameterBag()));
```

---

## Resetando Plugins (Testes)

Em suítes de teste, chame `reset()` para limpar todos os plugins registrados entre testes:

```php
use SafeAccessInline\Core\Registries\PluginRegistry;

afterEach(function () {
    PluginRegistry::reset();
});
```
