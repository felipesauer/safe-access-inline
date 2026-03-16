---
outline: deep
---

# Plugin System — JavaScript / TypeScript

YAML and TOML work out of the box using `js-yaml` and `smol-toml` (shipped as dependencies). The Plugin System lets you **override** the default parsers and serializers, or register plugins for other formats (like XML).

---

## Overriding Default Parsers

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";
import type {
    ParserPlugin,
    SerializerPlugin,
} from "@safe-access-inline/safe-access-inline";

// Override the default YAML parser with a custom implementation
const customYamlParser: ParserPlugin = {
    parse: (raw) => myCustomYamlLib.parse(raw),
};

PluginRegistry.registerParser("yaml", customYamlParser);

// fromYaml() now uses your custom parser instead of js-yaml
const accessor = SafeAccess.fromYaml(yamlContent);
```

---

## Registering Serializer Plugins

```typescript
// XML requires a plugin since there's no default XML serializer
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => myXmlLib.build(data),
});

accessor.toXml(); // uses your XML serializer plugin
```

---

## Using `transform()`

The generic `transform()` method serializes data to any format that has a registered serializer:

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

## Shipped Plugins

| Plugin               | Format | Type       | Dependency  |
| -------------------- | ------ | ---------- | ----------- |
| `JsYamlParser`       | yaml   | Parser     | `js-yaml`   |
| `JsYamlSerializer`   | yaml   | Serializer | `js-yaml`   |
| `SmolTomlParser`     | toml   | Parser     | `smol-toml` |
| `SmolTomlSerializer` | toml   | Serializer | `smol-toml` |

These are the built-in defaults. You can override them at any time with `PluginRegistry.registerParser()` / `registerSerializer()`.

---

## Creating Custom Plugins

Implement the `ParserPlugin` or `SerializerPlugin` interface:

```typescript
import type {
    ParserPlugin,
    SerializerPlugin,
} from "@safe-access-inline/safe-access-inline";

const myParser: ParserPlugin = {
    parse(raw: string): Record<string, unknown> {
        // Your parsing logic
        return JSON.parse(raw);
    },
};

const mySerializer: SerializerPlugin = {
    serialize(data: Record<string, unknown>): string {
        // Your serialization logic
        return JSON.stringify(data, null, 2);
    },
};

PluginRegistry.registerParser("custom", myParser);
PluginRegistry.registerSerializer("custom", mySerializer);
```

---

## Example: Zod Validation Plugin

A parser plugin that validates parsed data against a Zod schema:

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
        return configSchema.parse(data); // throws ZodError if invalid
    },
};

PluginRegistry.registerParser("json", validatingJsonParser);

// Now fromJson() validates against your schema
const accessor = SafeAccess.fromJson('{"host": "localhost", "port": 3000}'); // OK
SafeAccess.fromJson('{"host": 123}'); // throws ZodError
```

---

## Resetting Plugins (Testing)

In test suites, call `reset()` to clear all registered plugins between tests:

```typescript
import { PluginRegistry } from "@safe-access-inline/safe-access-inline";

afterEach(() => {
    PluginRegistry.reset();
});
```
