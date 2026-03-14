# Plan: Remediação Completa da Auditoria — safe-access-inline

Todas as correções e melhorias serão aplicadas diretamente no branch `refactor/roadmap-v1.1` em sequência de 4 fases. As fases são ordenadas por criticidade; dentro de cada fase, itens JS e PHP são independentes entre si e podem ser executados em paralelo. A próxima fase só começa após todos os testes da fase atual passarem.

---

## Fase 1 — P0: Bugs críticos de segurança

_Deve ser executada antes de qualquer deploy em produção que processe input de usuário._

### 1a. [CRIT-001] Bypass de symlink no guard de path — JS

_Paralela com 1b, 1c, 1d_

- Em `packages/js/src/core/io-loader.ts`, adicionar helper `safeResolve(p: string): string` que tenta `fs.realpathSync(p)` e cai em `path.resolve(p)` no `catch` (arquivo ainda não existe = queda esperada)
- Substituir `path.resolve(filePath)` → `safeResolve(filePath)` dentro de `assertPathWithinAllowedDirs`
- Substituir `path.resolve(dir)` → `fs.realpathSync(dir)` para os `allowedDirs` (eles devem existir)
- Adicionar import de `realpathSync` do `node:fs`
- Adicionar testes em `packages/js/tests/unit/core/io-loader.test.ts`: criar tmpdir, criar arquivo fora do dir, criar symlink apontando para ele dentro do allowed dir, verificar que leitura via symlink lança `SecurityError`

### 1b. [CRIT-002] `fetchUrl` segue redirects sem re-validar o destino — JS

_Paralela com 1a, 1c, 1d_

- Em `packages/js/src/core/io-loader.ts`, alterar `const response = await fetch(url)` para `fetch(url, { redirect: 'manual' })`
- Após o fetch, adicionar bloco: se `response.status >= 300 && response.status < 400`, extrair o header `Location`, chamar `assertSafeUrl(location, options)` + `assertResolvedIpNotPrivate(new URL(location).hostname)` e então realizar um segundo fetch recursivo (máx 5 redirecionamentos — contagem via parâmetro interno `_depth`)
- Caso `_depth > 5`, lançar `SecurityError('Too many redirects')`
- Adicionar testes em `packages/js/tests/unit/core/io-loader.test.ts`: mock de `fetch` que retorna 302 para `http://169.254.169.254/`, verificar `SecurityError` com SSRF message; mock que retorna 302 legítimo (HTTPS externo), verificar que segue normalmente

### 1c. [CRIT-003] IPv4-mapped IPv6 não bloqueado no SSRF guard — JS

_Paralela com 1a, 1b, 1d — mas CRIT-002 depende desta (renomeia a função)_

- Em `packages/js/src/core/ip-range-checker.ts`, renomear `isIpv6Loopback` → `isPrivateOrLoopbackIpv6`
- Dentro da nova função, após checar `::1` / full-form loopback, adicionar: `const v4mapped = cleaned.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)` → se match, chamar `isPrivateIp(v4mapped[1])` e retornar o resultado
- Adicionar `100.64.0.0/10` ao array `PRIVATE_IP_RANGES` (RFC 6598, CGNAT / shared address space)
- Atualizar o call site em `assertSafeUrl` que chamava `isIpv6Loopback` para chamar `isPrivateOrLoopbackIpv6`
- Exportar a nova função no lugar da antiga (reexportar com alias deprecated se necessário para evitar breaking change público — checar se `isIpv6Loopback` está no `index.ts`)
- Adicionar testes em `packages/js/tests/unit/core/ip-range-checker.test.ts`: `::ffff:10.0.0.1`, `::ffff:169.254.169.254`, `::ffff:192.168.1.1` → bloqueados; `::ffff:8.8.8.8` → permitido; `100.64.0.1` → bloqueado

### 1d. [CRIT-004] CSV injection via prefixo `\n` — JS e PHP

_Paralela com 1a, 1b, 1c_

- Em `packages/js/src/core/csv-sanitizer.ts`, adicionar `'\n'` ao array `DANGEROUS_PREFIXES`
- Em `packages/php/src/Security/CsvSanitizer.php`, adicionar `"\n"` ao array `DANGEROUS_PREFIXES`
- Adicionar testes em `packages/js/tests/unit/core/csv-sanitizer.test.ts`: célula prefixada com `\n=HYPERLINK(...)` em modo `strip` → resultado sem prefixo; em modo `throw` → lança erro
- Adicionar testes no equivalente PHP (`CsvSanitizerTest.php`)

✅ **Checkpoint Fase 1**: `vitest run` (JS) e `./vendor/bin/pest` (PHP) passam sem erros.

---

## Fase 2 — P1: Integrações & CLI

_Paralela: 2a+2b são só PHP, 2c+2d são só JS._

### 2a. [QUAL-005] `LaravelServiceProvider` incompatível com auto-discovery — PHP

- Em `packages/php/src/Integrations/LaravelServiceProvider.php`, adicionar constructor `public function __construct(private readonly object $app) {}` e converter `register(object $app): void` e `boot(object $app): void` de `static` para métodos de instância — ambos passam a usar `$this->app` ao invés do parâmetro
- Manter método estático conveniente `static function make(object $app): static` que retorna `new static($app)` para preservar a API de chamada estática existente
- Em `packages/php/composer.json`, verificar e remover (ou corrigir) `extra.laravel.providers` se ele aponta para esta classe com a API errada; a classe agora será instanciável pela auto-descoberta do Laravel
- Atualizar docblock para descrever o padrão correto de uso tanto manual quanto auto-discovery
- Atualizar docs em `docs/php/api-reference.md` e `docs/pt-br/php/api-reference.md`
- Adicionar testes de instância no arquivo de teste PHP equivalente

### 2b. [STYLE-003] `SafeAccessBundle` não é um Symfony Bundle real — PHP

- Renomear `packages/php/src/Integrations/SafeAccessBundle.php` para `SymfonyServiceRegistrar.php` e a classe para `SymfonyServiceRegistrar`
- Atualizar todas as referências internas (se houver)
- Manter `SafeAccessBundle.php` como `@deprecated` com `class_alias('SafeAccessInline\Integrations\SymfonyServiceRegistrar', 'SafeAccessInline\Integrations\SafeAccessBundle')` (dois releases de grace period)
- Atualizar docblock explicando que esta classe é um **helper de registro de serviço**, não um Symfony Bundle kernelizado — não pode ser listada em `config/bundles.php` sem implementar `BundleInterface`
- Atualizar docs em `docs/php/api-reference.md` e `docs/pt-br/php/api-reference.md`

### 2c. [QUAL-001] CLI sem proteção de path-traversal em argumentos de arquivo — JS

- Em `packages/cli/src/cli.ts`, adicionar opção `--allowed-dirs` ao `parseArgs` (tipo `string`, separada por vírgula)
- Na função `loadFromStdinOrFile`, substituir `SafeAccess.fromFileSync(resolve(fileArg))` por `SafeAccess.fromFileSync(fileArg, { allowedDirs: parsedAllowedDirs })` — sem o `resolve` manual (o guard interno cuida disso)
- Quando `--allowed-dirs` não fornecido, defaultar para `[process.cwd()]` e emitir warning em stderr: `Warning: no --allowed-dirs specified, defaulting to cwd`
- Atualizar `HELP` string com exemplo do novo flag
- Adicionar testes no arquivo de teste CLI (`packages/cli/tests/cli.test.ts`, criando-o se não existir): testar `loadFromStdinOrFile` com e sem `--allowed-dirs`

### 2d. [ARCH-003] Vite plugin expõe config completa ao bundle do browser — JS

- Em `packages/js/src/integrations/vite.ts`, adicionar campo `mask?: MaskPattern[]` a `VitePluginOptions` (importar `MaskPattern` e `mask` de `../core/data-masker`)
- Antes do `JSON.stringify(configData)` em `load()`, se `options.mask` estiver definido, aplicar `configData = mask(configData, options.mask)`
- Adicionar testes em `packages/js/tests/unit/integrations.test.ts`: verificar que campo `password` não aparece no output do plugin quando `mask: ['password']` está configurado

✅ **Checkpoint Fase 2**: todos os testes passam, build compila sem erros TypeScript e PHPStan nível 9.

---

## Fase 3 — P2: Melhorias de qualidade

_3a, 3b, 3c, 3d, 3e são todos independentes entre si — podem ser executados em paralelo._

### 3a. [QUAL-002] `deepMerge` executa clone duplo em múltiplos overrides — JS

- Em `packages/js/src/core/deep-merger.ts`, remover o `structuredClone(target)` do início de `mergeTwo` e torná-la uma função que muta diretamente o `target` passado
- No loop de `deepMerge`, clonar `base` uma única vez no início (`let result = structuredClone(base)`) e passar `result` diretamente para `mergeTwo`; para cada `override`, `mergeTwo(result, override)` agora muta `result` in-place
- Para valores escalar/array, usar `structuredClone(srcVal)` apenas no `result[key] = structuredClone(srcVal)` (já feito)
- Verificar que os testes existentes em `packages/js/tests/unit/core/deep-merger.test.ts` continuam passando sem modificação (comportamento externo idêntico)

### 3b. [QUAL-003] `AuditEmitter`/`AuditLogger` sem aviso de excesso de listeners — JS e PHP

- Em `packages/js/src/core/audit-emitter.ts`, adicionar `const MAX_LISTENERS = 50`; em `onAudit`, após o push, emitir `console.warn('[safe-access-inline] AuditEmitter: more than ${MAX_LISTENERS} listeners registered. Possible memory leak.')`
- Em `packages/php/src/Security/AuditLogger.php`, adicionar constante `private const MAX_LISTENERS = 50`; na função `onAudit`, após o push, adicionar `trigger_error(...)` com `E_USER_WARNING`
- Adicionar testes: verificar que aviso é emitido ao registrar o listener 51, e não emitido ao registrar o 50

### 3c. [QUAL-004] `PathCache` usa type assertion que perde variantes ricas de `Segment` — JS

- Em `packages/js/src/core/path-cache.ts`, remover a definição local `type Segment = { type: 'key'... } | { type: 'wildcard' }` e importar o tipo completo `Segment` de `./dot-notation-parser` (verificar que ele é exportado lá; se não for, exportá-lo)
- Mudar `private static readonly cache = new Map<string, Segment[]>()` para usar o tipo importado
- Remover qualquer cast `as Array<...>` nos pontos de uso
- Verificar testes existentes em `packages/js/tests/unit/core/path-cache.test.ts`

### 3d. [ARCH-002] Docs do NestJS não explicam o design não-global — documentação

- Em `docs/js/getting-started.md` e `docs/pt-br/js/getting-started.md`, na seção NestJS, adicionar parágrafo: `SafeAccessModule` não é `@Global()` por design — controle de escopo fica com o consumidor. Para compartilhar entre feature modules, re-exporte `SAFE_ACCESS` de um `SharedConfigModule`
- Mesmo acréscimo em `docs/js/api-reference.md` e `docs/pt-br/js/api-reference.md`

### 3e. [STYLE-001] Inconsistência de nomes `AuditEmitter` (JS) vs `AuditLogger` (PHP) — renomeação

- Renomear `packages/php/src/Security/AuditLogger.php` para `AuditEmitter.php` e a classe para `AuditEmitter`
- Atualizar namespace e todos os `use` internos ao pacote PHP que referenciam `AuditLogger`
- Manter `AuditLogger.php` como arquivo `@deprecated` com `class_alias('SafeAccessInline\Security\AuditEmitter', 'SafeAccessInline\Security\AuditLogger')` para compatibilidade (dois releases)
- Atualizar docs PHP

✅ **Checkpoint Fase 3**: `vitest run --coverage` (JS) e `./vendor/bin/pest --coverage` (PHP) passam; TypeScript e PHPStan sem erros.

---

## Fase 4 — P3: Refatoração arquitetural

_4a é prerequisito de 4b. 4c é independente de 4a/4b._

### 4a. [ARCH-001] Introduzir `SafeAccessContext` — JS

_Maior mudança do plano — backward-compatible._

- Criar `packages/js/src/core/safe-access-context.ts` com classe `SafeAccessContext`:
    - Campos: `listeners: AuditListener[]`, `policy: SecurityPolicy | null`, `pathCache: Map<string, Segment[]>`
    - Métodos: `onAudit(listener)`, `emit(type, detail)`, `setPolicy(p)`, `clearPolicy()`, `clearListeners()`, `clearCache()`
- Criar instância de módulo `defaultContext = new SafeAccessContext()` em `safe-access-context.ts` — este se torna o singleton de módulo
- Refatorar `audit-emitter.ts`, `security-policy.ts` e `path-cache.ts` para delegar ao `defaultContext` (mantendo as funções exportadas existentes como thin wrappers)
- Adicionar parâmetro opcional `context?: SafeAccessContext` às funções `readFile`, `fetchUrl`, `deepMerge`, `onAudit`, `setGlobalPolicy` — se omitido, usam `defaultContext`
- Exportar `SafeAccessContext` e `defaultContext` do `index.ts`
- Escrever testes em arquivo novo `packages/js/tests/unit/core/safe-access-context.test.ts`: dois contextos isolados com políticas diferentes, sem cross-contamination; verificar que `defaultContext` ainda funciona igual ao código atual
- Esta mudança não altera a API pública existente — é puramente aditiva

### 4b. [PERF-002] `PathCache` com evicção LRU ao invés de FIFO — JS

_Depende de 4a para usar cache por contexto_

- Em `packages/js/src/core/path-cache.ts` (ou dentro de `SafeAccessContext` após 4a), alterar o método `get`: após `PathCache.cache.get(path)`, se entry encontrado → `cache.delete(path); cache.set(path, value)` (re-insere ao final, movendo para posição "mais recente" na ordem de inserção do Map)
- A evição no `set` continua sendo `keys().next().value` (agora representa o LRU — o menos recentemente acessado)
- Atualizar testes em `packages/js/tests/unit/core/path-cache.test.ts`: verificar que o path acessado mais recentemente sobrevive à evicção ao inserir o 1001º item

### 4c. [PERF-003] `assertMaxKeys` — fast-path raso antes do deep walk — JS

_Independente de 4a/4b_

- Em `packages/js/src/core/security-options.ts`, no início de `assertMaxKeys`, adicionar: `if (Object.keys(obj).length <= maxKeys) return` — se a contagem de chaves de nível raiz já está abaixo do limite, skip o walk recursivo completo
- Adicionar teste: objeto raso com 500 chaves e `maxKeys: 1000` → não entra no deep walk

✅ **Checkpoint Fase 4**: suite completa passa, build ESM+CJS+DTS compilado, `vitest bench` mostra melhoria em `deepMerge` e `PathCache` benchmarks.

---

## Arquivos modificados

| Arquivo                                                     | Itens                                    |
| ----------------------------------------------------------- | ---------------------------------------- |
| `packages/js/src/core/io-loader.ts`                         | CRIT-001, CRIT-002                       |
| `packages/js/src/core/ip-range-checker.ts`                  | CRIT-003                                 |
| `packages/js/src/core/csv-sanitizer.ts`                     | CRIT-004                                 |
| `packages/php/src/Security/CsvSanitizer.php`                | CRIT-004                                 |
| `packages/php/src/Integrations/LaravelServiceProvider.php`  | QUAL-005                                 |
| `packages/php/composer.json`                                | QUAL-005                                 |
| `packages/php/src/Integrations/SafeAccessBundle.php`        | STYLE-003 (deprecation stub)             |
| `packages/php/src/Integrations/SymfonyServiceRegistrar.php` | STYLE-003 (novo)                         |
| `packages/cli/src/cli.ts`                                   | QUAL-001                                 |
| `packages/js/src/integrations/vite.ts`                      | ARCH-003                                 |
| `packages/js/src/core/deep-merger.ts`                       | QUAL-002                                 |
| `packages/js/src/core/audit-emitter.ts`                     | QUAL-003                                 |
| `packages/php/src/Security/AuditLogger.php`                 | QUAL-003, STYLE-001 (deprecation stub)   |
| `packages/php/src/Security/AuditEmitter.php`                | STYLE-001 (novo)                         |
| `packages/js/src/core/path-cache.ts`                        | QUAL-004, PERF-002                       |
| `packages/js/src/core/security-options.ts`                  | PERF-003                                 |
| `packages/js/src/core/safe-access-context.ts`               | ARCH-001 (novo)                          |
| `packages/js/src/index.ts`                                  | ARCH-001 (exportar SafeAccessContext)    |
| `docs/js/`, `docs/php/`, `docs/pt-br/`                      | ARCH-002, STYLE-001, STYLE-003, QUAL-005 |

---

## Decisões e escopo

- Renomeações breaking (AuditLogger → AuditEmitter; SafeAccessBundle → SymfonyServiceRegistrar) usam o pattern `@deprecated + class_alias` para manter compatibilidade durante uma janela de 2 minor releases
- `SafeAccess.extend()` / `customAccessors` (static Map) não são encapsulados em `SafeAccessContext` na Fase 4 — escopo deliberadamente excluído para manter o plano focado
- `deepMerge` após QUAL-002 muta o `result` interno in-place; o contrato externo (retorna novo objeto, não muta `base`) é preservado porque `result` é sempre o clone de `base`
- O flag `--allowed-dirs` do CLI usa `process.cwd()` como default (mais restritivo) — qualquer quebra de uso existente é considerada um "fix" e não uma regressão, pois o comportamento anterior era inseguro

## Verificação final

1. `cd packages/js && vitest run` + `cd packages/php && ./vendor/bin/pest` — zero falhas
2. Teste manual: criar symlink fora de `allowedDirs` e ler via CLI — deve retornar `SecurityError`
3. `npx tsc --noEmit` no pacote JS + `./vendor/bin/phpstan analyse --level 9 src/` no pacote PHP
4. `vitest run --coverage` — cobertura não deve cair abaixo dos níveis atuais
5. `vitest bench benchmarks/` — `deepMerge` com 3 overrides deve mostrar redução de alocações; `PathCache` hit-rate em acesso a 10 paths quentes deve melhorar
