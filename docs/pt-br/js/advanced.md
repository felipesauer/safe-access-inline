---
outline: deep
---

# Recursos Avançados — JavaScript / TypeScript

## Índice

- [Operações de Array](#operações-de-array)
- [JSON Patch & Diff](#json-patch--diff)
- [I/O & Carregamento de Arquivos](#io--carregamento-de-arquivos)
- [Configuração em Camadas](#configuração-em-camadas)

## Operações de Array

Todas as operações de array retornam **novas instâncias** — o original nunca é modificado.

```typescript
const accessor = SafeAccess.fromObject({
    tags: ["js", "ts", "js"],
    users: [
        { name: "Ana", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Carol", age: 30 },
    ],
});

// Adicionar itens
const pushed = accessor.push("tags", "safe-access");
// ['js', 'ts', 'js', 'safe-access']

// Remover último / primeiro
accessor.pop("tags"); // remove o último elemento
accessor.shift("tags"); // remove o primeiro elemento

// Inserir no início
accessor.unshift("tags", "first");

// Inserir no índice (suporta índices negativos)
accessor.insert("tags", 1, "inserted");

// Filtrar
accessor.filterAt("users", (u) => u.age >= 30);

// Map / transformar
accessor.mapAt("users", (u) => u.name);

// Ordenar
accessor.sortAt("users", "name"); // ascendente por 'name'
accessor.sortAt("users", "age", "desc"); // descendente por 'age'

// Único
accessor.unique("tags"); // remove 'js' duplicado
accessor.unique("users", "age"); // único por sub-chave

// Achatar
SafeAccess.fromObject({
    matrix: [
        [1, 2],
        [3, 4],
    ],
}).flatten("matrix");
// [1, 2, 3, 4]

// Helpers de acesso
accessor.first("users"); // { name: 'Ana', age: 30 }
accessor.last("users"); // { name: 'Carol', age: 30 }
accessor.nth("users", 1); // { name: 'Bob', age: 25 }
accessor.nth("users", -1); // { name: 'Carol', age: 30 }
```

---

## JSON Patch & Diff

Gere e aplique operações de JSON Patch conforme RFC 6902:

```typescript
import {
    SafeAccess,
    diff,
    applyPatch,
} from "@safe-access-inline/safe-access-inline";

const a = SafeAccess.fromObject({ name: "Ana", age: 30 });
const b = SafeAccess.fromObject({ name: "Ana", age: 31, city: "SP" });

// Método de instância
const ops = a.diff(b);
// [
//   { op: 'replace', path: '/age', value: 31 },
//   { op: 'add', path: '/city', value: 'SP' },
// ]

// Aplicar patch (retorna nova instância)
const patched = a.applyPatch([
    { op: "replace", path: "/age", value: 31 },
    { op: "add", path: "/city", value: "SP" },
]);

// Funções standalone também disponíveis
const ops2 = diff(a.all(), b.all());
const result = applyPatch(a.all(), ops2);
```

Operações suportadas: `add`, `replace`, `remove`, `move`, `copy`, `test`.

---

## I/O & Carregamento de Arquivos

### Carregar de arquivo

```typescript
// Auto-detectar formato pela extensão
const config = SafeAccess.fromFileSync("/app/config.json");

// Assíncrono
const config2 = await SafeAccess.fromFile("/app/config.yaml");

// Restringir diretórios permitidos (proteção contra path-traversal)
const safe = SafeAccess.fromFileSync("/app/config.json", undefined, ["/app"]);
```

### Carregar de URL

```typescript
// Apenas HTTPS, seguro contra SSRF
const data = await SafeAccess.fromUrl("https://api.example.com/config.json");

// Com restrições
const data2 = await SafeAccess.fromUrl("https://api.example.com/data", "json", {
    allowedHosts: ["api.example.com"],
    allowedPorts: [443],
    allowPrivateIps: false,
});
```

### Suporte a NDJSON

```typescript
const ndjson = '{"id":1}\n{"id":2}';
const accessor = SafeAccess.fromNdjson(ndjson);
accessor.get("0.id"); // 1
accessor.get("*.id"); // [1, 2]
accessor.toNdjson(); // volta para string NDJSON
```

---

## Configuração em Camadas

Mescle múltiplas fontes de configuração (último vence):

```typescript
// Camadas de instâncias accessor
const defaults = SafeAccess.fromFileSync("/app/config/defaults.json");
const overrides = SafeAccess.fromFileSync("/app/config/local.json");
const config = SafeAccess.layer([defaults, overrides]);

// Conveniência: camadas a partir de arquivos
const config2 = SafeAccess.layerFiles(
    ["/app/config/defaults.yaml", "/app/config/production.yaml"],
    ["/app/config"], // diretórios permitidos
);

// Observação de arquivos
const stop = SafeAccess.watchFile("/app/config.json", (accessor) => {
    console.log("Config atualizada:", accessor.get("version"));
});
// Depois: stop()
```
