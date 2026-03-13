---
layout: home
title: Início
nav_exclude: true
description: Acesse dados profundamente aninhados com notação de ponto — uma API, 9 formatos, PHP + JS/TS.
permalink: /pt-br/
lang: pt-br
---

# safe-access-inline

{: .fs-9 }

Acesse dados profundamente aninhados com notação de ponto — uma API, 9 formatos, PHP + JS/TS.
{: .fs-6 .fw-300 }

[![PHP CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml)
[![JS CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml)
[![npm version](https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline.svg)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)
[![Packagist Version](https://img.shields.io/packagist/v/safe-access-inline/safe-access-inline.svg)](https://packagist.org/packages/safe-access-inline/safe-access-inline)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/felipesauer/safe-access-inline/blob/main/LICENSE)

---

## Por quê?

Acessar dados aninhados de configs, APIs ou formatos de arquivo geralmente significa escrever cadeias defensivas de `isset`, optional chaining ou try/catch — cada formato com suas peculiaridades.

**safe-access-inline** oferece uma API unificada que funciona de forma idêntica em PHP e JavaScript:

```php
$accessor->get('user.profile.name', 'N/A');  // Funciona com JSON, XML, YAML, TOML, INI, CSV, ENV…
```

```typescript
accessor.get("user.profile.name", "N/A"); // Mesma API, mesmo resultado
```

Sem exceções. Sem surpresas. Uma API, 9 formatos.

---

## Funcionalidades

- **Zero surpresas** — `get()` nunca lança exceções; sempre retorna um valor padrão para caminhos não encontrados
- **Agnóstico de formato** — mesma API para 9 formatos de dados
- **Imutável** — `set()` e `remove()` retornam novas instâncias
- **Notação de ponto** — acesse dados aninhados com `user.profile.name`
- **Wildcard** — `users.*.email` retorna um array com todos os emails
- **Sistema de plugins** — estenda parsing e serialização com plugins customizados via `PluginRegistry`
- **Dependências reais para YAML/TOML** — `js-yaml`/`smol-toml` (JS) e `symfony/yaml`/`devium/toml` (PHP) funcionam sem configuração
- **Paridade PHP ↔ JS** — API idêntica em ambas linguagens

---

## Formatos Suportados

| Formato | PHP | JS/TS | Dependências                                                                       |
| ------- | :-: | :---: | ---------------------------------------------------------------------------------- |
| Array   | ✅  |  ✅   | Nenhuma                                                                            |
| Object  | ✅  |  ✅   | Nenhuma                                                                            |
| JSON    | ✅  |  ✅   | `ext-json` (nativo)                                                                |
| XML     | ✅  |  ✅   | `ext-simplexml` (nativo) / parser embutido                                         |
| YAML    | ✅  |  ✅   | `ext-yaml` ou `symfony/yaml` (PHP) / `js-yaml` (JS) — override via plugin opcional |
| TOML    | ✅  |  ✅   | Embutido (`devium/toml` / `smol-toml`) — override via plugin opcional              |
| INI     | ✅  |  ✅   | Nativo                                                                             |
| CSV     | ✅  |  ✅   | Nativo                                                                             |
| ENV     | ✅  |  ✅   | Nativo                                                                             |

---

## Início Rápido

### PHP

```bash
composer require safe-access-inline/safe-access-inline
```

```php
use SafeAccessInline\SafeAccess;

$accessor = SafeAccess::fromJson('{"user": {"name": "Ana", "age": 30}}');
$accessor->get('user.name');           // "Ana"
$accessor->get('user.email', 'N/A');   // "N/A" (padrão, sem exceção)

// Wildcard
$accessor = SafeAccess::fromArray(['users' => [['name' => 'Ana'], ['name' => 'Bob']]]);
$accessor->get('users.*.name');        // ["Ana", "Bob"]
```

[Primeiros Passos — PHP](php/getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[Referência da API — PHP](php/api-reference){: .btn .fs-5 .mb-4 .mb-md-0 }

### JavaScript / TypeScript

```bash
npm install @safe-access-inline/safe-access-inline
```

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const accessor = SafeAccess.fromJson('{"user": {"name": "Ana", "age": 30}}');
accessor.get("user.name"); // "Ana"
accessor.get("user.email", "N/A"); // "N/A"

// Wildcard
const obj = SafeAccess.fromObject({
    users: [{ name: "Ana" }, { name: "Bob" }],
});
obj.get("users.*.name"); // ["Ana", "Bob"]
```

[Primeiros Passos — JS/TS](js/getting-started){: .btn .btn-blue .fs-5 .mb-4 .mb-md-0 .mr-2 }
[Referência da API — JS/TS](js/api-reference){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Saiba Mais

- [Arquitetura](architecture) — princípios de design, diagrama de componentes, sistema de plugins, fluxo de dados
- [Contribuindo](https://github.com/felipesauer/safe-access-inline/blob/main/CONTRIBUTING.md) — como contribuir
- [Segurança](https://github.com/felipesauer/safe-access-inline/blob/main/SECURITY.md) — política de divulgação de vulnerabilidades
