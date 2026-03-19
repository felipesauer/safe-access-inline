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
safe-access get <arquivo> <caminho> [--default|-d <valor>]
```

```bash
safe-access get config.json "user.name"
safe-access get data.yaml "items.*.price"
safe-access get config.toml "database.host" --default localhost
safe-access get config.toml "database.host" -d localhost
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
safe-access mask <arquivo> --patterns|-p <padrão,...> [--to <formato>] [--pretty]
```

```bash
safe-access mask config.json --patterns "password,secret,api_*"
safe-access mask config.json -p "password,secret,api_*"
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

### `has` — Verificar se caminho existe

```bash
safe-access has <arquivo> <caminho>
```

```bash
safe-access has config.json "database.host"   # sai com 0 se existir, 1 se não
```

### `count` — Contar elementos

```bash
safe-access count <arquivo> [caminho]
```

```bash
safe-access count config.json             # conta chaves na raiz
safe-access count config.json "items"     # conta elementos no caminho
```

### `validate` — Validar contra JSON Schema

```bash
safe-access validate <arquivo> --schema|-s <schema.json> [--format json]
```

```bash
safe-access validate config.json --schema schema.json
safe-access validate config.json -s schema.json

# Exibe o resultado da validação como JSON estruturado ({ valid, errors[] })
safe-access validate config.json --schema schema.json --format json
```

### `convert` — Converter formato (arquivo ou stdin)

```bash
safe-access convert --file <arquivo> --to <formato>
safe-access convert --from <formato> --to <formato> < entrada
```

```bash
safe-access convert --file config.yaml --to json
safe-access convert --from yaml --to toml < config.yaml
```

## Formatos Suportados

O CLI detecta automaticamente o formato do arquivo pela extensão:

`.json` · `.yaml` / `.yml` · `.toml` · `.xml` · `.ini` · `.csv` · `.env` · `.ndjson`

## Piping & Stdin

Use `-` como argumento de arquivo para ler do stdin. O CLI detecta automaticamente o formato do conteúdo de entrada.

```bash
# Fazer pipe de JSON de outro comando
echo '{"user": {"name": "Ana"}}' | safe-access get - "user.name"

# Encadear comandos: definir um valor e depois lê-lo
safe-access set config.json "version" '"2.0"' | safe-access get - "version"

# Converter entre formatos via pipe
cat config.yaml | safe-access convert --from yaml --to json

# Pipe a partir do curl
curl -s https://api.example.com/config.json | safe-access get - "database.host"
```

Ao usar pipe com `convert`, use `--from` para especificar o formato de entrada explicitamente:

```bash
safe-access convert --from yaml --to toml < config.yaml
```

A saída sempre vai para o **stdout**, erros para o **stderr** — então você pode redirecionar a saída para arquivos com segurança:

```bash
safe-access transform config.yaml --to json --pretty > config.json
safe-access mask config.json --patterns "password,secret" > config-safe.json
```

## Códigos de Saída

| Código | Significado                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------- |
| `0`    | Sucesso                                                                                                 |
| `1`    | Erro — uso inválido, comando desconhecido, arquivo não encontrado, ou `has` quando o caminho não existe |

O comando `has` usa códigos de saída para resultados booleanos:

```bash
safe-access has config.json "database.host" && echo "existe" || echo "ausente"
```

Defina `DEBUG=1` para incluir stack traces no stderr:

```bash
DEBUG=1 safe-access get config.json "invalid..path"
```

## Uso em CI/CD

### Validação de Config no CI

```bash
# Validar config contra um schema — sai com 1 em caso de falha
safe-access validate config.json --schema schema.json

# Saída JSON estruturada para processamento posterior
safe-access validate config.json --schema schema.json --format json
```

### Verificar Chaves Obrigatórias

```bash
# Falhar o build se uma chave obrigatória estiver ausente
safe-access has config.json "database.host" || exit 1
safe-access has config.json "database.port" || exit 1
```

### Extrair Valores para Scripts

```bash
# Usar em variáveis do shell
DB_HOST=$(safe-access get config.json "database.host")
APP_VERSION=$(safe-access get package.json "version")
```

### Mascarar Segredos Antes de Logar

```bash
# Seguro para log/commit — todos os campos sensíveis ocultados
safe-access mask config.json --patterns "password,secret,*_KEY,*_TOKEN" --to json --pretty
```

### Mesclagem de Camadas de Config

```bash
# Mesclar base → ambiente → overrides locais
safe-access layer defaults.json production.json local.json --to json --pretty > merged.json
```

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
