---
layout: home

hero:
    name: Safe Access Inline
    text: Camada de Acesso a Dados Completa. PHP + JS/TS.
    tagline: Faça parse, transformação, query e segurança de dados estruturados — com segurança — em uma API consistente para PHP e TypeScript.
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
      title: 9 Formatos
      details: "JSON · XML · YAML · TOML · INI · ENV · NDJSON · Array · Object — uma API unificada, sem boilerplate. Detecte formatos automaticamente via detect(), infira pelo nome do arquivo e serialize para qualquer formato com toJson(), toYaml(), toToml(), etc."
      link: /pt-br/js/getting-started
      linkText: Ver todos os formatos
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      title: Imutável por Design
      details: "Cada escrita retorna uma nova instância — os dados internos nunca são mutados. Ative o modo readonly com deep-freeze via { readonly&#58; true }; qualquer set(), remove() ou merge() subsequente lança ReadonlyViolationError imediatamente."
      link: /pt-br/js/api-reference
      linkText: Referência da API
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>'
      title: Queries Poderosas
      details: "Wildcards (*.name) · Filtros ([?price>20]) · Lógica booleana ([?a&&b||c]) · Descida recursiva (..key) · Slices ([0:5:2]) · Multi-index ([0,2,4]) · Paths com template ({key}) · Funções de filtro&#58; starts_with, contains, values."
      link: /pt-br/guide/
      linkText: Sintaxe de paths
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
      title: Tipos TypeScript
      details: "Tipos TypeScript estritos com total segurança em tempo de compilação. Cada método é genericamente tipado e cada retorno é previsível."
      link: /pt-br/js/api-reference
      linkText: Docs TypeScript
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>'
      title: Paridade PHP ↔ JS
      details: API idêntica em ambas as linguagens. Mesmos caminhos, mesmos resultados, mesmo comportamento — validado por uma suíte de fixtures compartilhada entre os pacotes que assegura saídas idênticas. Escolha sua stack; mude quando quiser.
      link: /pt-br/php/getting-started
      linkText: Docs PHP
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'
      title: Segurança em Primeiro Lugar
      details: "Subsistemas endurecidos&#58; proteção contra prototype pollution · prevenção de XXE em XML · análise estática contra ReDoS em filtros regex."
      link: /pt-br/js/security
      linkText: Docs de segurança
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M18 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>'
      title: Extensível
      details: Substitua qualquer parser ou serializer via PluginRegistry — troque js-yaml, smol-toml ou qualquer driver integrado.
      link: /pt-br/js/plugins
      linkText: Guia de plugins
    - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>'
      title: Ferramenta CLI
      details: "Consulte, transforme e converta arquivos de dados diretamente do terminal. 9 comandos · 9 formatos · suporte a piping. safe-access get config.json 'user.name', set, remove, convert, keys, type, has, count — tudo com a mesma sintaxe de paths da biblioteca."
      link: /pt-br/cli/
      linkText: Referência da CLI
---
