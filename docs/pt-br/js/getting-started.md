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
- [Segurança](/pt-br/js/security)

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
accessor.toJson(); // '{"name":"Ana","age":30}'
accessor.toJson(true); // JSON formatado

// YAML e TOML funcionam sem configuração (via js-yaml e smol-toml)
accessor.toYaml(); // "name: Ana\nage: 30\n"
accessor.toToml(); // 'name = "Ana"\nage = 30\n'
accessor.toXml("person"); // usa serializador interno (plugin pode substituir)
```

> **Nota:** `toYaml()`, `toToml()` e `toXml()` funcionam sem configuração.

---

## Sistema de Plugins

YAML e TOML funcionam sem configuração, usando `js-yaml` e `smol-toml`. O Sistema de Plugins permite sobrescrever os parsers e serializers padrão com implementações customizadas.

Consulte a página do [Sistema de Plugins](/pt-br/js/plugins) para documentação completa, plugins embutidos, exemplos customizados e utilitários de teste.

---

## Cenários Reais

### 1. Carregar, ler e atualizar um arquivo de configuração JSON

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import { readFileSync, writeFileSync } from "node:fs";

// Carregar e ler
const raw = readFileSync("./config/app.json", "utf8");
const cfg = SafeAccess.fromJson(raw);

const host = cfg.get("database.host", "localhost");
const port = cfg.get("database.port", 5432);
console.log(`Conectando em ${host}:${port}`);

// Aplicar patch e salvar de volta
const updated = cfg.set("database.port", 5433).set("app.version", "2.1.0");

writeFileSync("./config/app.json", updated.toJson(true), "utf8");
```

### 2. Parse de arquivo .env e construção de objeto de configuração tipado

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const accessor = SafeAccess.fromEnv(env);

interface AppConfig {
    apiUrl: string;
    port: number;
    debug: boolean;
}

const config: AppConfig = {
    apiUrl: accessor.get("API_URL", "http://localhost") as string,
    port: Number(accessor.get("PORT", "3000")),
    debug: accessor.get("DEBUG", "false") === "true",
};
```

### 3. Mesclar override de ambiente sobre configuração base YAML

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import { readFileSync } from "node:fs";

const base = SafeAccess.fromYaml(readFileSync("./config/base.yaml", "utf8"));
const override = SafeAccess.fromYaml(
    readFileSync(`./config/${process.env.NODE_ENV}.yaml`, "utf8"),
);

// Deep-merge: chaves do override sobrescrevem, o restante é preservado
const config = base.merge(override.all());

config.get("database.host"); // valor final mesclado
config.get("app.name"); // preservado da config base
```
