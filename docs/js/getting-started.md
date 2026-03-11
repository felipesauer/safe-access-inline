# Getting Started — JavaScript / TypeScript

## Requirements

- Node.js 18 or higher
- TypeScript 5.5+ (for TypeScript projects)

## Installation

```bash
npm install @safe-access-inline/core
```

## Basic Usage

### Accessing data with dot notation

```typescript
import { SafeAccess } from '@safe-access-inline/core';

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
```

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
import { AbstractAccessor } from '@safe-access-inline/core';

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
import { SafeAccess } from '@safe-access-inline/core';

// CommonJS
const { SafeAccess } = require('@safe-access-inline/core');
```

## TypeScript Support

Full TypeScript definitions are included. All public types are exported:

```typescript
import {
  SafeAccess,
  AbstractAccessor,
  DotNotationParser,
  TypeDetector,
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
} from '@safe-access-inline/core';
```
