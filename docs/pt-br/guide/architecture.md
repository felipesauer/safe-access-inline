---
outline: deep
---

# Arquitetura

## Índice

- [Arquitetura](#arquitetura)
    - [Índice](#indice)
    - [Visão Geral](#visao-geral)
    - [Princípios de Design](#principios-de-design)
    - [Diagrama de Componentes](#diagrama-de-componentes)
    - [Sistema de Plugins](#sistema-de-plugins)
        - [Contratos](#contratos)
        - [PluginRegistry](#pluginregistry)
        - [Comportamento PHP vs JS](#comportamento-php-vs-js)
    - [Fluxo de Dados](#fluxo-de-dados)
    - [Motor DotNotationParser](#motor-dotnotationparser)
    - [Padrão de Imutabilidade](#padrao-de-imutabilidade)
    - [TypeDetector](#typedetector)
    - [Estrutura do Monorepo](#estrutura-do-monorepo)
    - [Arquitetura de Segurança](#arquitetura-de-seguranca)
    - [I/O & Carregamento de Arquivos](#i-o-carregamento-de-arquivos)
    - [Validação de Schema](#validacao-de-schema)
    - [Sistema de Auditoria](#sistema-de-auditoria)
    - [Pacote CLI](#pacote-cli)
    - [Integrações com Frameworks](#integracoes-com-frameworks)
    - [Registros de Decisão de Arquitetura](#registros-de-decisao-de-arquitetura)
        - [ADR-1: `set()` / `remove()` usam `clone` em vez de `static::from()`](#adr-1-set-remove-usam-clone-em-vez-de-static-from)
        - [ADR-2: JS `toXml()` / `toYaml()` / `toToml()` via Bibliotecas Reais + Plugin Override](#adr-2-js-toxml-toyaml-totoml-via-bibliotecas-reais-plugin-override)
        - [ADR-3: Dependências Reais para YAML/TOML + PluginRegistry para Override](#adr-3-dependencias-reais-para-yaml-toml-pluginregistry-para-override)

## Visão Geral

safe-access-inline é uma biblioteca de acesso a dados agnóstica de formato que fornece uma única API para ler, escrever e transformar estruturas de dados profundamente aninhadas com segurança. Segue o padrão **Facade** com um sistema de accessors plugáveis e um **Plugin Registry** extensível para parsing e serialização de formatos.

## Princípios de Design

1. **Zero Surpresas** — `get()` nunca lança exceções. Caminhos não encontrados retornam um valor padrão.
2. **Agnóstico de Formato** — A mesma API funciona de forma idêntica em todos os formatos suportados.
3. **Imutabilidade** — `set()` e `remove()` sempre retornam novas instâncias; o original nunca é modificado.
4. **Dependências Reais para Formatos Complexos** — YAML e TOML usam bibliotecas reais (`js-yaml`/`smol-toml` em JS, `symfony/yaml`/`devium/toml` em PHP) como dependências. O Sistema de Plugins fornece capacidade opcional de override.
5. **Extensibilidade** — Accessors customizados via `SafeAccess::extend()`, parsers e serializers customizados via `PluginRegistry`.

## Diagrama de Componentes

```mermaid
flowchart TD
    SA["SafeAccess — ponto de entrada estático<br/>fromArray · fromJson · detect · extend · custom"]
    AA["AbstractAccessor — classe base (toda a lógica)<br/>get · set · remove · has<br/>toArray · toJson · toXml · toYaml · toToml · transform<br/>type · count · keys · all<br/>push · pop · shift · insert · diff · applyPatch<br/>masked · validate"]
    DNP["DotNotationParser<br/>get · has · set · remove<br/>parseKeys · buildPath"]
    PR["PluginRegistry<br/>registerParser() · registerSerializer()<br/>getParser · has · get"]
    P["Parsers<br/>yaml · toml"]
    S["Serializers<br/>yaml · xml · …"]
    C["Custom plugins"]
    acc["Accessors Concretos<br/>Array · Object · JSON · XML · YAML<br/>TOML · INI · CSV · ENV · NDJSON<br/>cada um implementa parse(raw) → array"]

    SA -->|cria| AA
    AA -->|resolução de caminho| DNP
    AA -->|serialização e parsing| PR
    PR --> P & S & C
    AA -.->|estendido por| acc
```

## Sistema de Plugins

O Sistema de Plugins fornece capacidade de **override opcional** para parsing e serialização de formatos específicos. YAML e TOML usam bibliotecas reais por padrão — plugins permitem que usuários substituam por implementações alternativas.

### Contratos

```mermaid
classDiagram
    class ParserPluginInterface {
        <<interface>>
        +parse(string raw) array
    }
    class SerializerPluginInterface {
        <<interface>>
        +serialize(array data) string
    }
```

- **`ParserPluginInterface`** — recebe uma string bruta (ex: texto YAML), retorna um array associativo normalizado. Lança `InvalidFormatException` para input malformado.
- **`SerializerPluginInterface`** — recebe um array normalizado, retorna uma string formatada (ex: texto YAML).

### PluginRegistry

Um registro estático que mapeia nomes de formato (ex: `'yaml'`, `'toml'`) para implementações de parser e serializer.

```
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

// Accessors consultam o registro:
// YamlAccessor::parse() → PluginRegistry::getParser('yaml')->parse($raw)
// $accessor->toYaml()   → PluginRegistry::getSerializer('yaml')->serialize($data)
// $accessor->transform('yaml') → mesmo que toYaml()
```

### Comportamento PHP vs JS

| Aspecto                                                 | PHP                                                                                                                                  | JS/TS                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Parsing YAML/TOML                                       | Biblioteca real por padrão (`ext-yaml` ou `symfony/yaml` para YAML, `devium/toml` para TOML); plugin **opcional** (overrides)        | Biblioteca real por padrão (`js-yaml`, `smol-toml`); plugin **opcional** (overrides) |
| Serialização (`toYaml`, `toToml`, `toXml`, `transform`) | Plugin override → fallback para `ext-yaml`/biblioteca real (com fallback `SimpleXMLElement` para XML)                                | Biblioteca real por padrão para YAML/TOML; plugin necessário para XML                |
| Plugins incluídos                                       | 6 plugins (SymfonyYamlParser, SymfonyYamlSerializer, NativeYamlParser, NativeYamlSerializer, DeviumTomlParser, DeviumTomlSerializer) | 4 plugins (JsYamlParser, JsYamlSerializer, SmolTomlParser, SmolTomlSerializer)       |

## Fluxo de Dados

```mermaid
flowchart TD
    Input["Entrada<br/>string · array · object"]
    Factory["Accessor::from(data)<br/>raw = data, data = parse(raw)"]

    P1["Maioria dos formatos<br/>parsing específico do accessor<br/>JSON.parse · XML parse · …"]
    P2["YAML — PHP<br/>PluginRegistry → ext-yaml → symfony/yaml fallback"]
    P3["TOML — PHP<br/>PluginRegistry → devium/toml"]
    P4["YAML / TOML — JS<br/>PluginRegistry → js-yaml / smol-toml"]

    Norm["Array normalizado armazenado em data"]
    Read["Operações de leitura via DotNotationParser<br/>get · set · has · remove · …"]

    T1["toArray() · toJson() · toObject()<br/>embutidos, sempre disponíveis"]
    T2["toXml()<br/>embutido em PHP e JS<br/>plugin tem precedência se registrado"]
    T3["toYaml()<br/>PHP: Plugin → ext-yaml → symfony/yaml<br/>JS: js-yaml padrão"]
    T4["toToml()<br/>PHP: Plugin → devium/toml<br/>JS: smol-toml padrão"]
    T5["transform(format)<br/>embutido para yaml · toml · csv (JS)<br/>outros → PluginRegistry"]

    Input --> Factory
    Factory --> P1 & P2 & P3 & P4
    P1 & P2 & P3 & P4 --> Norm
    Norm --> Read
    Norm --> T1 & T2 & T3 & T4 & T5
```

## Motor DotNotationParser

O parser resolve caminhos como `user.profile.name` contra estruturas de dados aninhadas.

**Sintaxe de caminhos suportada:**

- `name` — acesso a chave simples
- `user.profile.name` — acesso aninhado
- `items.0.title` — acesso por índice numérico
- `matrix[0][1]` — notação de colchetes (convertida para notação de ponto)
- `users.*.name` — wildcard (retorna array de todos os valores correspondentes)
- `config\.db.host` — ponto escapado (ponto literal no nome da chave)

**Algoritmo de resolução:**

1. Analisa o caminho em segmentos de chave via `parseKeys()`
2. Percorre a estrutura de dados segmento por segmento
3. No wildcard `*`: itera todos os filhos, resolve recursivamente o caminho restante
4. No ponto escapado: trata como nome literal da chave
5. Retorna o valor padrão se qualquer segmento não for encontrado

## Padrão de Imutabilidade

```
$original = SafeAccess::fromJson('{"a": 1}');
$modified = $original->set('b', 2);

// $original->data = ['a' => 1]     ← inalterado
// $modified->data = ['a' => 1, 'b' => 2]  ← nova instância
```

Implementação:

- PHP: `clone $this` + atualiza `$data`
- JS: método `clone(newData)` cria nova instância com dados modificados (via `structuredClone`)

## TypeDetector

Prioridade de auto-detecção (primeiro match vence):

1. **Array** → `ArrayAccessor`
2. **SimpleXMLElement** (apenas PHP) → `XmlAccessor`
3. **Object** → `ObjectAccessor`
4. **String JSON** (`{` ou `[`) → `JsonAccessor`
5. **String NDJSON** (múltiplas linhas `{...}`) → `NdjsonAccessor`
6. **String XML** (`<?xml` ou `<`) → `XmlAccessor`
7. **String YAML** (contém `: ` sem `=`) → `YamlAccessor`
8. **String TOML** (padrão `chave = "quoted"`) → `TomlAccessor`
9. **String INI** (tem cabeçalhos `[seção]`) → `IniAccessor`
10. **String ENV** (padrão `CHAVE=VALOR` maiúsculo) → `EnvAccessor`
11. **Não suportado** → lança `UnsupportedTypeError` / `UnsupportedTypeException`

> **Limitações:** CSV não é auto-detectado. A heurística YAML (`: ` sem `=`) pode produzir falsos positivos, e a detecção TOML (`chave = "quoted"`) pode ocasionalmente conflitar com alguns formatos INI. Sempre prefira métodos factory explícitos (ex: `fromYaml()`, `fromToml()`) para inputs ambíguos.

## Estrutura do Monorepo

```
safe-access-inline/
├── packages/
│   ├── php/                 # Pacote Composer
│   │   ├── src/
│   │   │   ├── Accessors/   # 10 accessors de formato (incl. NDJSON)
│   │   │   ├── Contracts/   # Interfaces (incl. ParserPlugin, SerializerPlugin, SchemaAdapter)
│   │   │   ├── Core/        # AbstractAccessor, DotNotationParser, TypeDetector, PluginRegistry, SchemaRegistry, JsonPatch, IoLoader, FileWatcher, DeepMerger
│   │   │   ├── Enums/       # AccessorFormat enum
│   │   │   ├── Exceptions/  # Hierarquia de exceções (incl. SecurityException, SchemaValidationException, ReadonlyViolationException)
│   │   │   ├── Integrations/# LaravelServiceProvider, SymfonyIntegration
│   │   │   ├── Plugins/     # Plugins incluídos (SymfonyYaml*, NativeYaml*, DeviumToml*)
│   │   │   ├── Security/    # SecurityPolicy, SecurityOptions, SecurityGuard, CsvSanitizer, DataMasker, AuditLogger
│   │   │   ├── Traits/      # HasFactory, HasTransformations, HasWildcardSupport
│   │   │   └── SafeAccess.php
│   │   └── tests/
│   │       ├── Unit/        # Testes unitários mock-based
│   │       └── Integration/ # Testes de integração com parsers reais
│   ├── js/                  # Pacote npm
│   │   ├── src/
│   │   │   ├── accessors/   # 10 accessors de formato (incl. NDJSON)
│   │   │   ├── contracts/   # Interfaces TypeScript
│   │   │   ├── core/        # AbstractAccessor, DotNotationParser, TypeDetector, PluginRegistry, SchemaRegistry, JsonPatch, IoLoader, FileWatcher, DeepMerger, AuditLogger
│   │   │   ├── exceptions/  # Hierarquia de erros (incl. SecurityError, SchemaValidationError, ReadonlyViolationError)
│   │   │   ├── integrations/# Módulo NestJS, plugin Vite
│   │   │   ├── plugins/     # Plugins incluídos (JsYaml*, SmolToml*)
│   │   │   ├── types/       # DeepPaths, ValueAtPath utility types
│   │   │   ├── safe-access.ts
│   │   │   └── index.ts     # Barrel export
│   │   └── tests/
│   │       ├── unit/        # Testes unitários mock-based
│   │       └── integration/ # Testes de pipeline cross-format
│   └── cli/                 # Pacote CLI (@safe-access-inline/cli)
│       ├── src/cli.ts       # Ponto de entrada CLI (get, set, remove, transform, convert, diff, mask, layer, keys, type, has, count, validate)
│       └── tests/
└── docs/                    # Documentação (VitePress, English + pt-BR)
├── .github/workflows/       # CI/CD
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
└── README.md
```

## Arquitetura de Segurança

O módulo de segurança fornece defesa em profundidade para processamento de dados:

```mermaid
flowchart TD
    SP["SecurityPolicy<br/>maxDepth · maxPayloadBytes · maxKeys<br/>allowedDirs · url options · csvMode · maskPatterns"]
    SO["SecurityOptions<br/>assertções de limite"]
    IL["IoLoader<br/>validação de path e URL"]
    CS["CsvSanitizer"]
    DM["DataMasker"]

    SP -->|delega para| SO
    SP -->|delega para| IL
    SP -->|delega para| CS
    SP -->|delega para| DM
```

- **SecurityPolicy** — Agregado imutável de todas as configurações de segurança. Suporta `merge()` para criar políticas derivadas.
- **SecurityOptions** — Métodos estáticos de asserção para limites de tamanho de payload, contagem de chaves e profundidade de aninhamento.
- **SecurityGuard** — Bloqueia chaves de prototype pollution (`__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `valueOf`, `toString`, `hasOwnProperty`, `isPrototypeOf`). Sanitiza objetos recursivamente.
- **IoLoader** — Proteção contra path-traversal para leitura de arquivos. Proteção contra SSRF para fetch de URLs (bloqueia IPs privados, metadata de cloud, exige HTTPS).
- **CsvSanitizer** — Protege contra ataques de CSV injection com modos configuráveis (none, prefix, strip, error).
- **DataMasker** — Substitui valores sensíveis (password, token, secret, etc.) por `[REDACTED]`. Suporta padrões customizados de glob/regex.

## I/O & Carregamento de Arquivos

Carregamento de arquivos e URLs segue um pipeline seguro:

1. **Validação de caminho** — O caminho resolvido deve estar dentro de `allowedDirs` (se especificado)
2. **Detecção de formato** — Baseada em extensão (`resolveFormatFromExtension`)
3. **Leitura de conteúdo** — Sistema de arquivos ou fetch HTTPS
4. **Emissão de auditoria** — Evento `file.read` ou `url.fetch`
5. **Criação do accessor** — Delegado ao método `SafeAccess.from*()` apropriado

File watching usa polling (`FileWatcher`) — verifica mtime em intervalos configuráveis. Retorna uma função stop para cleanup.

Configuração em camadas (`layer()`, `layerFiles()`) realiza deep-merge de múltiplas fontes com semântica last-wins.

## Validação de Schema

A validação de schema usa o padrão **Adapter** para permanecer agnóstica de biblioteca:

```mermaid
flowchart LR
    SR["SchemaRegistry<br/>default adapter"]
    SAI["SchemaAdapterInterface<br/>validate(data, schema)"]
    SVR["SchemaValidationResult<br/>valid: bool<br/>errors: Issue[]"]

    SR -->|usa| SAI
    SAI -->|retorna| SVR
```

Usuários implementam `SchemaAdapterInterface` com sua biblioteca de validação preferida (Zod, Joi, JSON Schema, etc.) e registram via `SchemaRegistry.setDefaultAdapter()`.

## Sistema de Auditoria

O sistema de auditoria fornece observabilidade para operações relevantes à segurança:

- **Tipos de evento:** `file.read`, `file.watch`, `url.fetch`, `security.violation`, `data.mask`, `data.freeze`, `schema.validate`
- **Assinatura:** `SafeAccess.onAudit(listener)` retorna uma função de unsubscribe
- **Emissão:** Interna — disparada automaticamente por IoLoader, DataMasker, validação de schema, etc.
- **Design:** Padrão pub/sub. Listeners são síncronos. Eventos incluem campos `type`, `timestamp` e `detail`.

## Pacote CLI

O pacote `@safe-access-inline/cli` fornece acesso via linha de comando a todas as funcionalidades da biblioteca:

| Comando     | Descrição                                       |
| ----------- | ----------------------------------------------- |
| `get`       | Ler um valor por caminho                        |
| `set`       | Definir um valor em um caminho                  |
| `remove`    | Remover um valor em um caminho                  |
| `transform` | Converter entre formatos (JSON ↔ YAML ↔ TOML)   |
| `diff`      | Gerar diff JSON Patch entre dois arquivos       |
| `mask`      | Ocultar valores sensíveis                       |
| `layer`     | Mesclar múltiplos arquivos de configuração      |
| `keys`      | Listar chaves em um caminho                     |
| `type`      | Mostrar o tipo de um valor em um caminho        |
| `has`       | Verificar existência de caminho (exit code 0/1) |
| `count`     | Contar elementos em um caminho                  |

Suporta entrada via stdin (`-`), todos os formatos (JSON, YAML, TOML, XML, INI, CSV, ENV, NDJSON), saída formatada e expressões de caminho.

## Integrações com Frameworks

| Framework | Pacote | Módulo                   | Funcionalidades                                          |
| --------- | ------ | ------------------------ | -------------------------------------------------------- |
| NestJS    | JS     | `SafeAccessModule`       | Módulo dinâmico, token de injeção `SAFE_ACCESS`          |
| Vite      | JS     | `safeAccessPlugin`       | Módulo virtual, suporte HMR, merge de múltiplos arquivos |
| Laravel   | PHP    | `LaravelServiceProvider` | Binding singleton, wrapping do config repository         |
| Symfony   | PHP    | `SymfonyIntegration`     | Wrapping de ParameterBag, carregamento de arquivo YAML   |

## Registros de Decisão de Arquitetura

### ADR-1: `set()` / `remove()` usam `clone` em vez de `static::from()`

**Contexto:** O PLAN.md especifica `set()` retorna `static::from($newData)`. No entanto, alguns accessors carregam metadata além do array normalizado — por exemplo, `XmlAccessor` armazena a string `originalXml`.

**Decisão:** Tanto PHP quanto JS usam `clone` (PHP: `clone $this`; JS: método `clone(newData)`) para preservar qualquer metadata específica do accessor ao produzir uma nova instância. Apenas `$data` é atualizado.

**Consequência:** Metadata como `originalXml` sobrevive a mutações, que é o comportamento esperado. O round-trip `set() → toXml()` ainda pode acessar o XML original via `getOriginalXml()`.

### ADR-2: JS `toXml()` / `toYaml()` / `toToml()` via Bibliotecas Reais + Plugin Override

**Contexto:** Inicialmente, o pacote JS omitia `toXml()` e `toYaml()` porque JavaScript não tem emissor XML nativo e serialização YAML exigiria uma dependência de runtime.

**Decisão (original):** JS expunha apenas `toArray()`, `toJson()` e `toObject()`.

**Decisão (revisão #1):** Com a introdução do Sistema de Plugins, JS expôs `toYaml()`, `toXml()` e `transform()` via PluginRegistry.

**Decisão (revisão #2):** `js-yaml` e `smol-toml` agora são `dependencies` reais. `toYaml()` e `toToml()` funcionam sem configuração usando essas bibliotecas. Plugins fornecem override opcional para usuários que precisam de bibliotecas diferentes. `toXml()` ainda requer plugin.

**Consequência:** Serialização YAML e TOML funciona sem configuração. Usuários que precisam de serializers alternativos registram um plugin override. Serialização XML ainda requer registro explícito de plugin.

### ADR-3: Dependências Reais para YAML/TOML + PluginRegistry para Override

**Contexto:** Os accessors YAML e TOML do PHP originalmente usavam checks `class_exists()` e `function_exists()` para detectar parsers disponíveis em runtime. Depois, um PluginRegistry foi introduzido que exigia registro manual de plugins. PHP e JS tinham abordagens diferentes: PHP exigia plugins, JS tinha parsers leves embutidos.

**Decisão:** Tornar bibliotecas YAML/TOML dependências reais em ambas plataformas. `js-yaml` + `smol-toml` são `dependencies` em JS. `symfony/yaml` + `devium/toml` são `require` em PHP. PluginRegistry continua existindo para override: se um plugin é registrado, ele tem prioridade sobre a biblioteca padrão.

**Escolhas-chave de design:**

- **Ambas plataformas**: Parsing e serialização YAML/TOML funcionam sem configuração — zero configuração necessária.
- **Plugin override**: `PluginRegistry.registerParser()` / `PluginRegistry.registerSerializer()` ainda funciona — plugins registrados têm prioridade sobre bibliotecas padrão.
- **Parsers embutidos JS removidos**: Os antigos parsers leves YAML/TOML foram removidos em favor de bibliotecas comprovadas (`js-yaml`, `smol-toml`).
- **Tipos de exceção**: `InvalidFormatException` no nível do accessor, `UnsupportedTypeException` no nível do registro.
- **Testes**: Testes unitários usam plugins mock (classes/objetos anônimos) para isolamento. Testes de integração usam bibliotecas reais.

**Consequência:** Zero configuração para YAML/TOML em ambas plataformas. Comportamento consistente entre PHP e JS. Usuários que precisam de parsers/serializers alternativos os registram via PluginRegistry.
