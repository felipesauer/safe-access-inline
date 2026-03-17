---
outline: deep
---

# CLI

> Consulte, transforme e manipule arquivos de dados pelo terminal.

## Instalação

```bash
npm install -g @safe-access-inline/cli
```

Ou use com `npx`:

```bash
npx @safe-access-inline/cli get config.json "user.name"
```

## Comandos

### `get` — Consultar um valor

```bash
safe-access get <arquivo> <caminho> [--default <valor>]
```

```bash
safe-access get config.json "user.name"
safe-access get data.yaml "items.*.price"
safe-access get config.toml "database.host" --default localhost
```

### `set` — Definir um valor (saída no stdout)

```bash
safe-access set <arquivo> <caminho> <valor> [--to <formato>] [--pretty]
```

```bash
safe-access set config.json "database.port" 3306 --to json --pretty
```

### `remove` — Remover um caminho (saída no stdout)

```bash
safe-access remove <arquivo> <caminho> [--to <formato>] [--pretty]
```

```bash
safe-access remove config.json "database.port" --to json --pretty
```

### `transform` — Converter entre formatos

```bash
safe-access transform <arquivo> --to <formato> [--pretty]
```

```bash
safe-access transform config.yaml --to json --pretty
safe-access transform config.json --to yaml
safe-access transform config.json --to toml
```

### `diff` — Diff JSON Patch

```bash
safe-access diff <arquivo1> <arquivo2>
```

```bash
safe-access diff config.json config-updated.json
```

### `mask` — Mascarar dados sensíveis

```bash
safe-access mask <arquivo> --patterns <padrão,...> [--to <formato>] [--pretty]
```

```bash
safe-access mask config.json --patterns "password,secret,api_*"
```

### `layer` — Mesclar arquivos de configuração

```bash
safe-access layer <arquivo1> [arquivo2...] [--to <formato>] [--pretty]
```

```bash
safe-access layer defaults.yaml overrides.json --to json --pretty
```

### `keys` — Listar chaves

```bash
safe-access keys <arquivo> [caminho]
```

### `type` — Obter tipo do valor

```bash
safe-access type <arquivo> <caminho>
```

## Formatos Suportados

O CLI detecta automaticamente o formato do arquivo pela extensão:

`.json` · `.yaml` / `.yml` · `.toml` · `.xml` · `.ini` · `.csv` · `.env` · `.ndjson`

## Exemplos

```bash
# Consultar valor aninhado de YAML
safe-access get docker-compose.yml "services.web.ports"

# Converter JSON para TOML
safe-access transform config.json --to toml

# Mascarar segredos antes de compartilhar
safe-access mask .env --patterns "SECRET_*,API_KEY" --to env

# Mesclar múltiplas camadas de configuração
safe-access layer defaults.json staging.json local.json --to json --pretty
```
