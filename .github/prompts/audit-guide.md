# Audit Execution Guide

## Pré-requisito: contexto compartilhado

Todos os prompts começam com a instrução de ler o [audit-shared.md](audit-shared.md) via `codebase` tool. Isso acontece automaticamente — não é necessário fazer nada manual.

---

## Passo 1 — Execute `audit-01` primeiro (bloqueante)

Abra uma nova conversa de agente com [audit-01-discovery.prompt.md](audit-01-discovery.prompt.md).

Ao final, o agente produz o **Discovery Artifact** — um bloco markdown estruturado. **Copie esse bloco inteiro.**

---

## Passo 2 — Execute `audit-02` até `audit-06` (paralelos)

Abra **5 conversas separadas**, uma para cada prompt. No início de cada uma, cole o Discovery Artifact no placeholder:

```
## Input: Discovery Artifact
<!-- Paste the full Discovery Artifact produced by audit-01-discovery.prompt.md here -->
```

Substitua o comentário pelo conteúdo copiado. Os 5 rodam independentemente — não precisa esperar um terminar para iniciar o outro.

| Prompt                                                             | O que coletar ao final                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| [audit-02-security.prompt.md](audit-02-security.prompt.md)         | Todos os `[CRIT-NNN]` + Security Score Card                     |
| [audit-03-architecture.prompt.md](audit-03-architecture.prompt.md) | Todos os `[ARCH-NNN]` + `[QUAL-NNN]` + Score Card               |
| [audit-04-quality.prompt.md](audit-04-quality.prompt.md)           | `[STYLE-NNN]`, `[PERF-NNN]`, `[COV-NNN]` + tabela de supressões |
| [audit-05-repository.prompt.md](audit-05-repository.prompt.md)     | Tabelas pontuadas das 6 categorias + score final                |
| [audit-06-alignment.prompt.md](audit-06-alignment.prompt.md)       | Feature matrix + todos os `[GAP-NNN]` + alignment score         |

---

## Passo 3 — Execute `audit-07` (bloqueante, depende de todos)

Abra uma nova conversa com [audit-07-report.prompt.md](audit-07-report.prompt.md) e cole os outputs dos 6 prompts anteriores em seus respectivos placeholders. O agente sintetiza tudo no relatório final consolidado.

---

## Fluxo visual

```
Nova conversa → audit-01 → copia Discovery Artifact
                                  │
          ┌───────────────────────┼─────────────────────┐
          ▼           ▼           ▼           ▼          ▼
       audit-02    audit-03    audit-04    audit-05   audit-06
     (segurança) (arquitetura)(qualidade)  (repo)  (alinhamento)
          │           │           │           │          │
          └───────────────────────┼─────────────────────┘
                                  ▼
                              audit-07
                          (relatório final)
```

> **Dica:** use uma aba/janela separada do VS Code Copilot Chat para cada prompt dos passos 2 e 3, para evitar que o contexto de um contamine o outro.

---

## Índice de arquivos

| Arquivo                                                            | Tipo       | Descrição                                                                |
| ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------ |
| [audit-shared.md](audit-shared.md)                                 | Contexto   | Role, finding format, prefixes, calibration example                      |
| [audit-01-discovery.prompt.md](audit-01-discovery.prompt.md)       | Prompt     | Mapa do repositório → Discovery Artifact                                 |
| [audit-02-security.prompt.md](audit-02-security.prompt.md)         | Prompt     | P1: Segurança & Correção `[CRIT-NNN]`                                    |
| [audit-03-architecture.prompt.md](audit-03-architecture.prompt.md) | Prompt     | P2: Arquitetura & Confiabilidade `[ARCH-NNN]` `[QUAL-NNN]`               |
| [audit-04-quality.prompt.md](audit-04-quality.prompt.md)           | Prompt     | P3: Qualidade, testes, supressões `[STYLE-NNN]` `[PERF-NNN]` `[COV-NNN]` |
| [audit-05-repository.prompt.md](audit-05-repository.prompt.md)     | Prompt     | Scoring estrutural do repositório (100 pts)                              |
| [audit-06-alignment.prompt.md](audit-06-alignment.prompt.md)       | Prompt     | Alinhamento cross-language `[GAP-NNN]`                                   |
| [audit-07-report.prompt.md](audit-07-report.prompt.md)             | Prompt     | Relatório final consolidado + roadmap                                    |
| [audit.prompt.md](audit.prompt.md)                                 | Deprecated | Prompt monolítico original (mantido como referência)                     |
