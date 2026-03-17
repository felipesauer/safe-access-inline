# O que é Safe Access Inline?

**Safe Access Inline** é uma biblioteca de acesso a dados agnóstica de formato que fornece uma API única e unificada para ler, escrever e transformar dados profundamente aninhados com segurança — em **PHP** e **JavaScript/TypeScript**.

## Por quê?

Acessar dados aninhados de configs, APIs ou formatos de arquivo geralmente significa escrever cadeias defensivas de `isset`, optional chaining ou `try/catch` — cada formato com suas peculiaridades.

**Safe Access Inline** oferece uma API que funciona de forma idêntica em ambas linguagens:

::: code-group

```php [PHP]
use SafeAccessInline\SafeAccess;

$accessor = SafeAccess::from('{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}');
$accessor->get('user.name');              // "Ana"
$accessor->get('user.email', 'N/A');      // "N/A" — nunca lança exceção
$accessor->get('items.*.price');          // [10, 50] — wildcard
$accessor->get('items[?price>20].price'); // [50] — filtro
$accessor->get('..name');                 // ["Ana"] — descida recursiva
```

```ts [JavaScript / TypeScript]
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const accessor = SafeAccess.from(
    '{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}',
);
accessor.get("user.name"); // "Ana"
accessor.get("user.email", "N/A"); // "N/A" — nunca lança exceção
accessor.get("items.*.price"); // [10, 50] — wildcard
accessor.get("items[?price>20].price"); // [50] — filtro
accessor.get("..name"); // ["Ana"] — descida recursiva
```

:::

Sem exceções. Sem surpresas. Uma API, 10 formatos.

## Formatos Suportados

| Formato | PHP | JS/TS | Dependências                                        |
| ------- | :-: | :---: | --------------------------------------------------- |
| Array   | ✅  |  ✅   | Nenhuma                                             |
| Object  | ✅  |  ✅   | Nenhuma                                             |
| JSON    | ✅  |  ✅   | `ext-json` (nativo)                                 |
| XML     | ✅  |  ✅   | `ext-simplexml` (nativo) / parser embutido          |
| YAML    | ✅  |  ✅   | `ext-yaml` ou `symfony/yaml` (PHP) / `js-yaml` (JS) |
| TOML    | ✅  |  ✅   | `devium/toml` (PHP) / `smol-toml` (JS)              |
| INI     | ✅  |  ✅   | Nativo                                              |
| CSV     | ✅  |  ✅   | Nativo                                              |
| ENV     | ✅  |  ✅   | Nativo                                              |
| NDJSON  | ✅  |  ✅   | Nativo                                              |

## Expressões de Caminho

| Sintaxe               | Descrição                   | Exemplo                          |
| --------------------- | --------------------------- | -------------------------------- |
| `a.b.c`               | Chave aninhada              | `user.profile.name`              |
| `a[0]`                | Índice de array             | `items[0].title`                 |
| `a.*`                 | Wildcard — todos os itens   | `users.*.name`                   |
| `a[?f>v]`             | Filtro com comparação       | `products[?price>20]`            |
| `a[?f==v && f2>v]`    | Filtro com `&&` / `\|\|`    | `items[?active==true && age>18]` |
| `a[0,2,4]`            | Multi-índice                | `items[0,2,4].name`              |
| `a[name,age]`         | Seleção de múltiplas chaves | `users.*[name,age]`              |
| `a[0:5]`              | Slice (início:fim)          | `items[0:5]`                     |
| `a[::2]`              | Slice com passo             | `items[::2]`                     |
| `[?length(@.f)>n]`    | Filtro — função length      | `[?length(@.name)>3]`            |
| `[?match(@.f,'pat')]` | Filtro — regex match        | `[?match(@.email,'@co\.')]`      |
| `..key`               | Descida recursiva           | `..name` (qualquer profundidade) |

Filtros suportam `==`, `!=`, `>`, `<`, `>=`, `<=` com lógica `&&` / `||`.

## Instalação

::: code-group

```bash [PHP]
composer require safe-access-inline/safe-access-inline
```

```bash [JavaScript / TypeScript]
npm install @safe-access-inline/safe-access-inline
```

```bash [CLI]
npm install -g @safe-access-inline/cli
```

:::

## Funcionalidades Principais

- **Zero surpresas** — `get()` nunca lança exceções; sempre retorna um valor padrão seguro
- **Imutável por padrão** — `set()`, `remove()`, `merge()` retornam novas instâncias; ative o modo readonly com deep-freeze via `{ readonly: true }`
- **Expressões de caminho avançadas** — wildcards, filtros com `&&`/`||`, descida recursiva, slices (`[0:5:2]`), multi-index (`[0,2,4]`), seleção de múltiplas chaves (`[name,age]`) e funções de filtro (`length`, `match`, `keys`)
- **Operações de array** — `push`, `pop`, `shift`, `unshift`, `insert`, `filterAt`, `mapAt`, `sortAt`, `unique`, `flatten`
- **JSON Patch** — RFC 6902 `diff()` e `applyPatch()`
- **Segurança em primeiro lugar** — proteção contra prototype pollution · SSRF com resolução DNS · detecção de faixas IPv6 (`fc00::/7`, `fe80::/10`) · bloqueio de metadados em nuvem (`169.254.169.254`, `metadata.google.internal`) · prevenção de XXE em XML (DOCTYPE/ENTITY bloqueados) · modos de saneamento CSV (`none` / `prefix` / `strip` / `error`) · 16 padrões de mascaramento automático de chaves sensíveis (`password`, `secret`, `token`, `api_key`, `cookie`, `ssn`, …) · presets de `SecurityPolicy` configuráveis (`strict`, `permissive`, padrão)
- **Validação de schema** — `validate(schema, adapter)` com adapters integrados para Zod, Valibot, Yup e JSON Schema; configure um padrão global via `SchemaRegistry.setDefaultAdapter()`
- **I/O** — `fromFile()`, `fromUrl()` (somente HTTPS, lista de portas permitidas), `layer()`, `watchFile()` com log de auditoria completo
- **Sistema de plugins** — substitua parsers/serializers por formato via `PluginRegistry`; registre accessors de formatos personalizados com `SafeAccess.extend()`
- **Caminhos com templates** — `getTemplate('user.{id}.name', { id: 42 })` para interpolação dinâmica de chaves
- **API de segmentos** — `getAt([…])`, `setAt([…])`, `hasAt([…])`, `removeAt([…])` para acesso programático por array de segmentos (JS)
- **CLI** — consulte, transforme, compare, mascare e mescle arquivos pelo terminal
- **Integrações com frameworks** — Laravel, Symfony (PHP) · NestJS (`SafeAccessModule`, `SafeAccessService`), Vite (JS)
- **Inferência TypeScript** — `DeepPaths<T>` / `ValueAtPath<T, P>` para chamadas `get()` totalmente tipadas sem casting (JS)
- **Extensões auto-detectadas** — `.json`, `.yml`, `.yaml`, `.toml`, `.ini`, `.cfg`, `.csv`, `.env`, `.ndjson`, `.jsonl`
- **Paridade PHP ↔ JS** — API idêntica em ambas linguagens

## Próximos Passos

- [Primeiros Passos — JS/TS](/pt-br/js/getting-started) — instale e use em JavaScript/TypeScript
- [Primeiros Passos — PHP](/pt-br/php/getting-started) — instale e use em PHP
- [CLI](/pt-br/cli/) — uso pela linha de comando
- [Arquitetura](/pt-br/guide/architecture) — princípios de design e internos
