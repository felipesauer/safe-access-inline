---
outline: deep
---

# Sistema de Plugins — JavaScript / TypeScript

YAML e TOML funcionam sem configuração, usando `js-yaml` e `smol-toml` (incluídos como dependências). O Sistema de Plugins permite **substituir** os parsers e serializers padrão, ou registrar plugins para outros formatos (como XML).

---

## Substituindo Parsers Padrão

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";
import type {
    ParserPlugin,
    SerializerPlugin,
} from "@safe-access-inline/safe-access-inline";

// Substitui o parser YAML padrão por uma implementação customizada
const customYamlParser: ParserPlugin = {
    parse: (raw) => myCustomYamlLib.parse(raw),
};

PluginRegistry.registerParser("yaml", customYamlParser);

// fromYaml() agora usa seu parser customizado em vez de js-yaml
const accessor = SafeAccess.fromYaml(yamlContent);
```

---

## Registrando Plugins de Serialização

```typescript
// XML precisa de um plugin pois não há serializer padrão para XML
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => myXmlLib.build(data),
});

accessor.toXml(); // usa seu plugin de serialização XML
```

---

## Usando `transform()`

O método genérico `transform()` serializa dados para qualquer formato que tenha um serializer registrado:

```typescript
PluginRegistry.registerSerializer("csv", {
    serialize: (data) => {
        return Object.entries(data)
            .map(([k, v]) => `${k},${v}`)
            .join("\n");
    },
});

const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
accessor.transform("csv"); // "name,Ana\nage,30"
```

---

## Plugins Incluídos

| Plugin               | Formato | Tipo       | Dependência |
| -------------------- | ------- | ---------- | ----------- |
| `JsYamlParser`       | yaml    | Parser     | `js-yaml`   |
| `JsYamlSerializer`   | yaml    | Serializer | `js-yaml`   |
| `SmolTomlParser`     | toml    | Parser     | `smol-toml` |
| `SmolTomlSerializer` | toml    | Serializer | `smol-toml` |

Esses são os padrões embutidos. Você pode substituí-los a qualquer momento com `PluginRegistry.registerParser()` / `registerSerializer()`.

---

## Criando Plugins Customizados

Implemente a interface `ParserPlugin` ou `SerializerPlugin`:

```typescript
import type {
    ParserPlugin,
    SerializerPlugin,
} from "@safe-access-inline/safe-access-inline";

const myParser: ParserPlugin = {
    parse(raw: string): Record<string, unknown> {
        // Sua lógica de parsing
        return JSON.parse(raw);
    },
};

const mySerializer: SerializerPlugin = {
    serialize(data: Record<string, unknown>): string {
        // Sua lógica de serialização
        return JSON.stringify(data, null, 2);
    },
};

PluginRegistry.registerParser("custom", myParser);
PluginRegistry.registerSerializer("custom", mySerializer);
```

---

## Exemplo: Plugin de Validação com Zod

Um plugin de parser que valida os dados contra um schema Zod:

```typescript
import { z } from "zod";
import type { ParserPlugin } from "@safe-access-inline/safe-access-inline";

const configSchema = z.object({
    host: z.string(),
    port: z.number().min(1).max(65535),
    debug: z.boolean().optional(),
});

const validatingJsonParser: ParserPlugin = {
    parse(raw: string): Record<string, unknown> {
        const data = JSON.parse(raw);
        return configSchema.parse(data); // lança ZodError se inválido
    },
};

PluginRegistry.registerParser("json", validatingJsonParser);

// Agora fromJson() valida contra seu schema
const accessor = SafeAccess.fromJson('{"host": "localhost", "port": 3000}'); // OK
SafeAccess.fromJson('{"host": 123}'); // lança ZodError
```

---

## Resetando Plugins (Testes)

Em suítes de teste, chame `reset()` para limpar todos os plugins registrados entre testes:

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";

afterEach(() => {
    PluginRegistry.reset();
});
```
