# Getting Started — JavaScript / TypeScript

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Plugin System](#plugin-system)
- [Working with Formats](#working-with-formats)
- [Custom Accessors](#custom-accessors)
- [ESM and CommonJS](#esm-and-commonjs)
- [TypeScript Support](#typescript-support)

---

## Requirements

- Node.js 22 or higher
- TypeScript 5.5+ (for TypeScript projects)

## Installation

```bash
npm install @safe-access-inline/safe-access-inline
```

## Basic Usage

### Accessing data with dot notation

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

const json = '{"user": {"profile": {"name": "Ana", "age": 30}}}';
const accessor = SafeAccess.fromJson(json);

// Simple access
accessor.get('user.profile.name');     // "Ana"
accessor.get('user.profile.age');      // 30

// Safe access — never throws, returns default
accessor.get('user.email', 'N/A');     // "N/A"
accessor.get('nonexistent.path');      // null (default)

// Check existence
accessor.has('user.profile.name');     // true
accessor.has('user.email');            // false
```

### Working with arrays and objects

```typescript
const data = {
  users: [
    { name: 'Ana', role: 'admin' },
    { name: 'Bob', role: 'user' },
    { name: 'Carol', role: 'user' },
  ],
};

const accessor = SafeAccess.fromObject(data);

// Access by index
accessor.get('users.0.name');          // "Ana"
accessor.get('users.2.role');          // "user"

// Wildcard — get all matching values
accessor.get('users.*.name');          // ["Ana", "Bob", "Carol"]
accessor.get('users.*.role');          // ["admin", "user", "user"]
```

### Immutable modifications

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

// set() returns a NEW instance
const modified = accessor.set('email', 'ana@example.com');
modified.get('email');                 // "ana@example.com"
accessor.get('email');                 // null (original unchanged)

// remove() also returns a new instance
const cleaned = accessor.remove('age');
cleaned.has('age');                    // false
accessor.has('age');                   // true (original unchanged)
```

### Format auto-detection

```typescript
const arr = SafeAccess.detect([1, 2, 3]);         // ArrayAccessor
const obj = SafeAccess.detect({ key: 'value' });   // ObjectAccessor
const json = SafeAccess.detect('{"key": "value"}'); // JsonAccessor
```

### Cross-format transformation

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

accessor.toArray();    // { name: "Ana", age: 30 }
accessor.toObject();   // deep clone as plain object
accessor.toJson();     // '{"name":"Ana","age":30}'
accessor.toJson(true); // pretty-printed JSON

// Serialize to other formats via Plugin System
accessor.toYaml();             // requires 'yaml' serializer plugin
accessor.toXml('person');      // requires 'xml' serializer plugin
accessor.transform('yaml');    // generic — uses PluginRegistry
```

> **Note:** `toYaml()`, `toXml()`, and `transform()` require serializer plugins. See [Plugin System](#plugin-system) below.

---

## Plugin System

The Plugin System lets you register custom parser and serializer plugins for any format. This is especially useful for `toYaml()`, `toXml()`, and `transform()`, which delegate serialization to registered plugins.

### Registering Plugins

```typescript
import { PluginRegistry } from '@safe-access-inline/safe-access-inline';
import type { ParserPlugin, SerializerPlugin } from '@safe-access-inline/safe-access-inline';

// Example: register a YAML serializer using js-yaml
import jsYaml from 'js-yaml';

const yamlSerializer: SerializerPlugin = {
  serialize: (data) => jsYaml.dump(data),
};

PluginRegistry.registerSerializer('yaml', yamlSerializer);
```

Once registered, `toYaml()` and `transform('yaml')` work on any accessor:

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
accessor.toYaml();
// name: Ana
// age: 30
```

### Overriding Built-in Parsers

The JS package ships with lightweight built-in parsers for YAML and TOML. You can override them with a plugin if you need more robust parsing:

```typescript
import jsYaml from 'js-yaml';

const yamlParser: ParserPlugin = {
  parse: (raw) => jsYaml.load(raw) as Record<string, unknown>,
};

PluginRegistry.registerParser('yaml', yamlParser);

// fromYaml() now uses your plugin instead of the built-in parser
const accessor = SafeAccess.fromYaml(yamlContent);
```

### Using `transform()`

The generic `transform()` method serializes data to any format that has a registered serializer:

```typescript
PluginRegistry.registerSerializer('csv', {
  serialize: (data) => {
    // Your CSV serialization logic
    return Object.entries(data).map(([k, v]) => `${k},${v}`).join('\n');
  },
});

const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
accessor.transform('csv');  // "name,Ana\nage,30"
```

### Resetting Plugins (Testing)

In test suites, call `reset()` to clear all registered plugins between tests:

```typescript
import { PluginRegistry } from '@safe-access-inline/safe-access-inline';

afterEach(() => {
  PluginRegistry.reset();
});
```

---

## Working with Formats

### Working with XML

```typescript
const xml = `<config><database><host>localhost</host><port>5432</port></database></config>`;

const accessor = SafeAccess.fromXml(xml);
accessor.get('database.host');         // "localhost"
accessor.get('database.port');         // "5432"
```

### Working with YAML

```typescript
const yaml = `
app:
  name: MyApp
  debug: true
database:
  host: localhost
  port: 5432
`;

const accessor = SafeAccess.fromYaml(yaml);
accessor.get('app.name');              // "MyApp"
accessor.get('database.port');         // 5432
```

### Working with TOML

```typescript
const toml = `
title = "My Config"

[database]
host = "localhost"
port = 5432
`;

const accessor = SafeAccess.fromToml(toml);
accessor.get('title');                 // "My Config"
accessor.get('database.host');         // "localhost"
```

### Working with INI

```typescript
const ini = `
app_name = MyApp

[database]
host = localhost
port = 3306
`;

const accessor = SafeAccess.fromIni(ini);
accessor.get('app_name');              // "MyApp"
accessor.get('database.host');         // "localhost"
```

### Working with ENV

```typescript
const env = `
APP_NAME=MyApp
APP_KEY="secret-key"
DEBUG=true
# Comment
DB_HOST=localhost
`;

const accessor = SafeAccess.fromEnv(env);
accessor.get('APP_NAME');              // "MyApp"
accessor.get('APP_KEY');               // "secret-key"
```

### Working with CSV

```typescript
const csv = `name,age,city
Ana,30,Porto Alegre
Bob,25,São Paulo`;

const accessor = SafeAccess.fromCsv(csv);
accessor.get('0.name');                // "Ana"
accessor.get('1.city');                // "São Paulo"
accessor.get('*.name');                // ["Ana", "Bob"]
```

### Custom accessors

```typescript
import { AbstractAccessor } from '@safe-access-inline/safe-access-inline';

class MyFormatAccessor extends AbstractAccessor {
  static from(data: unknown): MyFormatAccessor {
    return new MyFormatAccessor(data);
  }

  protected parse(raw: unknown): Record<string, unknown> {
    // Your custom parsing logic
    return { parsed: raw };
  }

  clone(data: Record<string, unknown>): MyFormatAccessor {
    const inst = Object.create(MyFormatAccessor.prototype);
    inst.raw = this.raw;
    inst.data = data;
    return inst;
  }
}

// Register
SafeAccess.extend('myformat', MyFormatAccessor);

// Use
const accessor = SafeAccess.custom('myformat', data);
accessor.get('parsed');
```

## ESM and CommonJS

The package ships dual ESM/CJS builds:

```javascript
// ESM
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

// CommonJS
const { SafeAccess } = require('@safe-access-inline/safe-access-inline');
```

## TypeScript Support

Full TypeScript definitions are included. All public types are exported:

```typescript
import {
  SafeAccess,
  AbstractAccessor,
  DotNotationParser,
  TypeDetector,
  PluginRegistry,
  ArrayAccessor,
  ObjectAccessor,
  JsonAccessor,
  XmlAccessor,
  YamlAccessor,
  TomlAccessor,
  IniAccessor,
  CsvAccessor,
  EnvAccessor,
  AccessorError,
  InvalidFormatError,
  PathNotFoundError,
  UnsupportedTypeError,
} from '@safe-access-inline/safe-access-inline';

import type {
  ParserPlugin,
  SerializerPlugin,
  AccessorInterface,
  ReadableInterface,
  WritableInterface,
  TransformableInterface,
} from '@safe-access-inline/safe-access-inline';
```
