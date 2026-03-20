---
outline: deep
---

# Primeiros Passos — JavaScript / TypeScript

## Índice

- [Requisitos](#requisitos)
- [Instalação](#instalacao)
- [Uso Básico](#uso-basico)
- [Sistema de Plugins](#sistema-de-plugins)

**Ver também:**

- [Consultas e Filtros](/pt-br/js/querying)
- [Formatos & TypeScript](/pt-br/js/formats)
- [Recursos Avançados](/pt-br/js/advanced)
- [Segurança & Integrações](/pt-br/js/security)

---

## Requisitos

- Node.js 22 ou superior
- TypeScript 5.5+ (para projetos TypeScript)

## Instalação

```bash
npm install @safe-access-inline/safe-access-inline
```

> **Tree-shaking:** O pacote é marcado com `"sideEffects": false` e distribui bundles ESM/CJS. Bundlers ESM modernos (Vite, Rollup, webpack 5+) fazem tree-shaking de código não utilizado automaticamente.

## Uso Básico

### Acessando dados com notação de ponto

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const json = '{"user": {"profile": {"name": "Ana", "age": 30}}}';
const accessor = SafeAccess.fromJson(json);

// Acesso simples
accessor.get("user.profile.name"); // "Ana"
accessor.get("user.profile.age"); // 30

// Acesso seguro — nunca lança, retorna valor padrão
accessor.get("user.email", "N/A"); // "N/A"
accessor.get("nonexistent.path"); // null (padrão)

// Verificar existência
accessor.has("user.profile.name"); // true
accessor.has("user.email"); // false
```

### Trabalhando com arrays e objetos

```typescript
const data = {
    users: [
        { name: "Ana", role: "admin" },
        { name: "Bob", role: "user" },
        { name: "Carol", role: "user" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Acesso por índice
accessor.get("users.0.name"); // "Ana"
accessor.get("users.2.role"); // "user"

// Wildcard — obter todos os valores correspondentes
accessor.get("users.*.name"); // ["Ana", "Bob", "Carol"]
accessor.get("users.*.role"); // ["admin", "user", "user"]
```

### Modificações imutáveis

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

// set() retorna uma NOVA instância
const modified = accessor.set("email", "ana@example.com");
modified.get("email"); // "ana@example.com"
accessor.get("email"); // null (original inalterado)

// remove() também retorna uma nova instância
const cleaned = accessor.remove("age");
cleaned.has("age"); // false
accessor.has("age"); // true (original inalterado)
```

### Auto-detecção de formato

```typescript
const arr = SafeAccess.detect([1, 2, 3]); // ArrayAccessor
const obj = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const json = SafeAccess.detect('{"key": "value"}'); // JsonAccessor
```

### Transformação cross-format

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

accessor.toArray(); // { name: "Ana", age: 30 }
accessor.toObject(); // cópia profunda como objeto plano
accessor.toJson(); // '{"name":"Ana","age":30}'
accessor.toJson(true); // JSON formatado

// YAML e TOML funcionam sem configuração (via js-yaml e smol-toml)
accessor.toYaml(); // "name: Ana\nage: 30\n"
accessor.toToml(); // 'name = "Ana"\nage = 30\n'
accessor.toXml("person"); // usa serializador interno (plugin pode substituir)
accessor.transform("yaml"); // delega para toYaml()
```

> **Nota:** `toYaml()`, `toToml()` e `toXml()` funcionam sem configuração. `transform()` também utiliza os serializadores internos para `yaml`, `toml` e `csv`.

---

## Sistema de Plugins

YAML e TOML funcionam sem configuração, usando `js-yaml` e `smol-toml`. O Sistema de Plugins permite sobrescrever os parsers e serializers padrão com implementações customizadas.

Consulte a página do [Sistema de Plugins](/pt-br/js/plugins) para documentação completa, plugins embutidos, exemplos customizados e utilitários de teste.
