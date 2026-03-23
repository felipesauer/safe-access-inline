---
layout: home

hero:
    name: Safe Access Inline
    text: Camada de Acesso a Dados Completa. PHP + JS/TS.
    tagline: Faça parse, transformação, query, validação, streaming e segurança de dados estruturados — com segurança — em uma API consistente para PHP e TypeScript.
    image:
        src: /logo-hero.svg
        alt: Safe Access Inline
    actions:
        - theme: brand
          text: Começar
          link: /pt-br/guide/
        - theme: alt
          text: Referência da API
          link: /pt-br/js/api-reference
        - theme: alt
          text: Ver no GitHub
          link: https://github.com/felipesauer/safe-access-inline

features:
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'
      title: Zero Surpresas
      details: "get() nunca lança exceções — chaves ausentes, dados nulos ou tipos errados sempre retornam o valor padrão seguro. Congele um accessor com { readonly&#58; true } e qualquer tentativa de escrita lança ReadonlyViolationError. Seguro para produção."
      link: /pt-br/guide/
      linkText: Começar
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>'
      title: 10 Formatos
      details: "JSON · XML · YAML · TOML · INI · CSV · ENV · NDJSON · Array · Object — uma API unificada, sem boilerplate. Detecte formatos automaticamente via detect(), infira pelo nome do arquivo e converta entre formatos com transform(format)."
      link: /pt-br/js/getting-started
      linkText: Ver todos os formatos
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      title: Imutável por Design
      details: "Cada escrita retorna uma nova instância — os dados internos nunca são mutados. Ative o modo readonly com deep-freeze via { readonly&#58; true }; qualquer set(), remove() ou merge() subsequente lança ReadonlyViolationError imediatamente."
      link: /pt-br/js/api-reference
      linkText: Referência da API
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>'
      title: Queries Poderosas
      details: "Wildcards (*.name) · Filtros ([?price>20]) · Lógica booleana ([?a&&b||c]) · Descida recursiva (..key) · Slices ([0:5:2]) · Multi-index ([0,2,4]) · Paths com template ({key}) · Funções de filtro&#58; length, match, starts_with, contains, keys."
      link: /pt-br/guide/
      linkText: Sintaxe de paths
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
      title: Tipos TypeScript
      details: "Inferência profunda de caminho com DeepPaths&lt;T&gt; e ValueAtPath&lt;T, P&gt; — get() e set() totalmente tipados, sem casting. Pré-compile paths quentes uma vez com SafeAccess.compilePath() e reutilize um CompiledPath em loops para máxima performance."
      link: /pt-br/js/api-reference
      linkText: Docs TypeScript
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>'
      title: Paridade PHP ↔ JS
      details: API idêntica em ambas as linguagens. Mesmos caminhos, mesmos resultados, mesmo comportamento — validado por uma suíte de fixtures compartilhada entre os pacotes que assegura saídas idênticas. Escolha sua stack; mude quando quiser.
      link: /pt-br/php/getting-started
      linkText: Docs PHP
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'
      title: Segurança em Primeiro Lugar
      details: "Seis subsistemas endurecidos&#58; proteção contra prototype pollution · bloqueio SSRF + IPv6 · prevenção de XXE em XML · sanitizador de injeção em CSV (prefix / strip / error) · sanitização de headers RFC 7230 · análise estática contra ReDoS em filtros regex. Mais 16 padrões de mascaramento automático de chaves sensíveis."
      link: /pt-br/js/security
      linkText: Docs de segurança
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
      title: Validação de Schema
      details: "validate(schema, adapter?) retorna { valid, errors } e nunca lança. O JsonSchemaAdapter integrado não exige peer dependency (subconjunto draft-07). Conecte Zod, Valibot ou Yup via SchemaRegistry.setDefaultAdapter() para um padrão global no processo."
      link: /pt-br/js/api-reference
      linkText: Adapters de schema
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M18 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>'
      title: Extensível
      details: Substitua qualquer parser ou serializer via PluginRegistry — troque js-yaml, smol-toml ou qualquer driver integrado. Integrações prontas para NestJS (SafeAccessModule), Vite (safeAccessPlugin), Laravel e Symfony.
      link: /pt-br/js/plugins
      linkText: Guia de plugins
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>'
      title: Arquivo I/O
      details: Leia e escreva arquivos com fromFile() / writeFile() em variantes síncronas e assíncronas. A proteção contra path traversal via allowedDirs aplica caminhos canônicos no nível do SO — sem corridas TOCTOU, sem escape para diretórios pai. Suporta allowedExtensions e limites de maxSize.
      link: /pt-br/js/api-reference
      linkText: Opções de arquivo
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
      title: Carregamento por URL
      details: fromUrl(url, options?) faz requisições HTTPS com proteção completa contra SSRF — IPs privados bloqueados, DNS resolvido antes de conectar, redirecionamentos desativados, tamanho do payload limitado. Restrinja a allowedHosts e allowedPorts para ambientes zero-trust.
      link: /pt-br/js/security
      linkText: Opções de URL
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
      title: Streaming
      details: streamCsv() e streamNdjson() retornam um AsyncGenerator — uma linha ou objeto JSON por iteração. Processe arquivos de gigabytes com consumo de memória constante. Handles de arquivo são fechados automaticamente em um break antecipado, evitando vazamentos de recursos.
      link: /pt-br/js/api-reference
      linkText: API de streaming
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
      title: Config em Camadas
      details: "layer(accessors[]) faz deep-merge de N accessors, último vence — empilhe padrões, staging e sobrescritas de produção em uma única chamada. layerFiles(paths[]) carrega e mescla N arquivos. Perfeito para padrões de config 12-factor."
      link: /pt-br/js/api-features
      linkText: Guia de camadas
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      title: Observador de Arquivo
      details: watchFile(path, onChange, options?) re-faz o parse do arquivo a cada alteração e entrega um accessor tipado e atualizado ao callback. Retorna uma função de cancelamento. Ideal para hot-reload de config em servidores de desenvolvimento e processos de longa duração.
      link: /pt-br/js/api-features
      linkText: API de watcher
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>'
      title: Audit Logging
      details: "onAudit(listener) dispara em cada operação observável — file.read, file.write, url.fetch, security.violation, data.mask, data.freeze, schema.validate e mais. Retorna uma função de cancelamento. Zero overhead quando nenhum listener está registrado."
      link: /pt-br/js/api-features
      linkText: Eventos de auditoria
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>'
      title: JSON Patch
      details: "Suporte completo a RFC 6902 — diff(a, b) calcula um patch mínimo, applyPatch(ops) aplica atomicamente, validatePatch(ops) verifica a estrutura. Os seis operadores&#58; add, remove, replace, move, copy, test. Lança JsonPatchTestFailedError em falha de asserção."
      link: /pt-br/js/api-reference
      linkText: API JSON Patch
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>'
      title: Debug & Trace
      details: trace(path) percorre um dot-path segmento por segmento e reporta o nome do segmento, status de encontrado e tipo do valor em cada etapa — para no primeiro trecho ausente. Nunca lança. A forma mais rápida de diagnosticar por que um path profundo retorna um valor padrão.
      link: /pt-br/js/api-reference
      linkText: API de trace
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>'
      title: Ferramenta CLI
      details: "Consulte, transforme e manipule arquivos de dados diretamente do terminal. 13 comandos · 8 formatos · suporte a piping. safe-access get config.json 'user.name', diff, merge, validate, mask e muito mais — tudo com a mesma sintaxe de paths da biblioteca."
      link: /pt-br/cli/
      linkText: Referência da CLI
---
