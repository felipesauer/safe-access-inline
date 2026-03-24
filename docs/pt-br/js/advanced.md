---
outline: deep
---

# Recursos Avançados — JavaScript / TypeScript

## Índice

- [Referência de configuração](#referência-de-configuração)

## Suporte a NDJSON

```typescript
const ndjson = '{"id":1}\n{"id":2}';
const accessor = SafeAccess.fromNdjson(ndjson);
accessor.get("0.id"); // 1
accessor.get("*.id"); // [1, 2]
accessor.toNdjson(); // volta para string NDJSON
```

---

## Referência de configuração

O pacote exporta interfaces de configuração e objetos default para consumidores avançados que precisam ajustar limites explicitamente.

### `CacheConfig` — ajustar tamanho do cache de paths

`PathCache` armazena paths dot-notation já parseados para que chamadas repetidas de `get("a.b.c")` não precisem re-parsear. O limite padrão é de `1000` entradas (evicção LRU).

**Quando alterar:** padrões de acesso de alta frequência com centenas de paths únicos se beneficiam de um cache maior. Reduza em ambientes com memória limitada.

```typescript
import { PathCache } from "@safe-access-inline/safe-access-inline";

// Aumentar o cache para cargas de trabalho com muitos paths
PathCache.configure({ maxSize: 5_000 });

// Verificar tamanho atual
PathCache.size; // número de entradas em cache

// Pré-aquecer o cache com paths usados em loops críticos
const paths = ["user.name", "user.email", "user.role", "settings.theme"];
const accessor = SafeAccess.fromObject(data);
paths.forEach((p) => accessor.get(p)); // popula o cache

// Desabilitar o cache completamente (útil em testes)
PathCache.disable();
// ... executar testes ...
PathCache.enable();

// Ou limpar entre casos de teste
PathCache.clear();
```

### `ParserConfig` — ajustar limites de recursão

`ParserConfig` controla dois limites de profundidade:

- `maxResolveDepth` — profundidade máxima de recursão ao resolver paths aninhados (padrão: `512`)
- `maxXmlDepth` — profundidade máxima de aninhamento de tags XML (padrão: `100`)

**Quando alterar:** reduza `maxXmlDepth` para endurecer a biblioteca contra payloads XML muito aninhados vindos de fontes não confiáveis.

```typescript
import { DEFAULT_PARSER_CONFIG } from "@safe-access-inline/safe-access-inline";
import type { ParserConfig } from "@safe-access-inline/safe-access-inline";

// Verificar os valores padrão
console.log(DEFAULT_PARSER_CONFIG);
// { maxResolveDepth: 512, maxXmlDepth: 100 }
```
