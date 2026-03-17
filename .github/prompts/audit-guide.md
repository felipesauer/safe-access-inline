# Audit Execution Guide

## Pré-requisito: contexto compartilhado

Todos os prompts começam com a instrução de ler o [audit-shared.md](audit-shared.md) via `codebase` tool. Isso acontece automaticamente — não é necessário fazer nada manual.

---

## Passo 1 — Execute `audit-00` primeiro (bloqueante)

Abra uma nova conversa de agente com [audit-00-bootstrap.prompt.md](audit-00-bootstrap.prompt.md).

O agente lê `.github/audit/AUDIT_LOG.md` e produz o **Known State Artifact** — um bloco markdown com três seções (accepted, deferred, open). **Copie esse bloco inteiro.**

> **Primeira execução:** o log estará vazio; o Known State Artifact terá "None" em todas as seções. Isso é esperado — copie o bloco assim mesmo.

---

## Passo 2 — Execute `audit-01` (bloqueante)

Abra uma nova conversa de agente com [audit-01-discovery.prompt.md](audit-01-discovery.prompt.md).

Ao final, o agente produz o **Discovery Artifact** — um bloco markdown estruturado. **Copie esse bloco inteiro.**

---

## Passo 3 — Execute `audit-02` até `audit-06` (paralelos)

Abra **5 conversas separadas**, uma para cada prompt. No início de cada uma, cole **ambos** os artifacts nos respectivos placeholders:

```
## Input: Discovery Artifact
<!-- Paste the full Discovery Artifact produced by audit-01-discovery.prompt.md here -->

## Input: Known State Artifact
<!-- Paste the full Known State Artifact produced by audit-00-bootstrap.prompt.md here -->
```

| Arquivo                                                            | O que coletar ao final                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| [audit-02-security.prompt.md](audit-02-security.prompt.md)         | Todos os `[CRIT-NNN]` + Security Score Card                     |
| [audit-03-architecture.prompt.md](audit-03-architecture.prompt.md) | Todos os `[ARCH-NNN]` + `[QUAL-NNN]` + Score Card               |
| [audit-04-quality.prompt.md](audit-04-quality.prompt.md)           | `[STYLE-NNN]`, `[PERF-NNN]`, `[COV-NNN]` + tabela de supressões |
| [audit-05-repository.prompt.md](audit-05-repository.prompt.md)     | Tabelas pontuadas das 6 categorias + score final                |
| [audit-06-alignment.prompt.md](audit-06-alignment.prompt.md)       | Feature matrix + todos os `[GAP-NNN]` + alignment score         |

---

## Passo 4 — Execute `audit-07` (bloqueante, depende de todos)

Abra uma nova conversa com [audit-07-report.prompt.md](audit-07-report.prompt.md) e cole os outputs dos passos anteriores em seus respectivos placeholders — incluindo o **Known State Artifact** (do Passo 1). O agente sintetiza tudo no relatório final consolidado, com um **Delta Summary** mostrando o que é novo, o que é regressão e o que foi resolvido.

---

## Passo 5 — Execute `audit-08` (bloqueante, atualiza o log)

Abra uma nova conversa com [audit-08-update-log.prompt.md](audit-08-update-log.prompt.md) e cole:

- o **Known State Artifact** (do Passo 1)
- o **Full Audit Report** (do Passo 4)

O agente produz o conteúdo atualizado de `.github/audit/AUDIT_LOG.md`. Copie e salve o arquivo, depois commite:

```bash
git add .github/audit/AUDIT_LOG.md
git commit -m "chore(audit): update audit log $(date +%Y-%m-%d)"
```

> A partir da segunda execução, o Known State Artifact conterá os findings anteriores e os prompts de análise irão automaticamente suprimir o que foi `accepted`, relabear o que era `open` como regressão, e identificar o que foi corrigido.

---

## Fluxo visual

```
audit-00 → Known State Artifact ──────────────────────────────────┐
audit-01 → Discovery Artifact                                      │
                  │                                                │
          ┌───────┼──────────────────────┐                        │
          ▼       ▼       ▼       ▼      ▼                        │
       audit-02 03    04    05    06  (+ Known State)             │
          │       │       │       │      │                        │
          └───────┼───────────────┼──────┘                        │
                  ▼                                                │
              audit-07  ◄─────────────────────────────────────────┘
          (relatório + Delta Summary)
                  │
              audit-08
        (atualiza AUDIT_LOG.md → commit)
```

> **Dica:** use uma aba/janela separada do VS Code Copilot Chat para cada prompt, para evitar que o contexto de um contamine o outro.

---

## Gerenciamento do AUDIT_LOG.md

O arquivo `.github/audit/AUDIT_LOG.md` persiste o estado entre runs. Após receber o output do `audit-08`, você pode editar manualmente o status de qualquer finding:

| Status     | Quando usar                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------- |
| `open`     | Problema confirmado, ainda não corrigido                                                      |
| `fixed`    | Corrigido no código (marcado automaticamente pelo `audit-08`)                                 |
| `accepted` | Revisado e aceito como risco ou decisão intencional — **nunca mais aparecerá nos relatórios** |
| `deferred` | Adiado para versão futura — aparece apenas na seção "Still Deferred", sem contar no score     |

> **Exemplo de uso:** itens do `audit-05` (repositório) como `CODEOWNERS`, `FUNDING.yml` ou badges que você não pretende adicionar podem ser marcados como `accepted`. Eles desaparecerão permanentemente dos relatórios futuros.

---

## Índice de arquivos

| Arquivo                                                            | Tipo     | Descrição                                                                 |
| ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------- |
| [audit-shared.md](audit-shared.md)                                 | Contexto | Role, finding format, prefixes, Known State Protocol, calibration example |
| [audit-00-bootstrap.prompt.md](audit-00-bootstrap.prompt.md)       | Prompt   | Lê AUDIT_LOG.md → Known State Artifact                                    |
| [audit-01-discovery.prompt.md](audit-01-discovery.prompt.md)       | Prompt   | Mapa do repositório → Discovery Artifact                                  |
| [audit-02-security.prompt.md](audit-02-security.prompt.md)         | Prompt   | P1: Segurança & Correção `[CRIT-NNN]`                                     |
| [audit-03-architecture.prompt.md](audit-03-architecture.prompt.md) | Prompt   | P2: Arquitetura & Confiabilidade `[ARCH-NNN]` `[QUAL-NNN]`                |
| [audit-04-quality.prompt.md](audit-04-quality.prompt.md)           | Prompt   | P3: Qualidade, testes, supressões `[STYLE-NNN]` `[PERF-NNN]` `[COV-NNN]`  |
| [audit-05-repository.prompt.md](audit-05-repository.prompt.md)     | Prompt   | Scoring estrutural do repositório (100 pts)                               |
| [audit-06-alignment.prompt.md](audit-06-alignment.prompt.md)       | Prompt   | Alinhamento cross-language `[GAP-NNN]`                                    |
| [audit-07-report.prompt.md](audit-07-report.prompt.md)             | Prompt   | Relatório final consolidado + Delta Summary + roadmap                     |
| [audit-08-update-log.prompt.md](audit-08-update-log.prompt.md)     | Prompt   | Atualiza AUDIT_LOG.md após a run                                          |
| `../audit/AUDIT_LOG.md`                                            | Estado   | Log persistente de findings entre runs                                    |
