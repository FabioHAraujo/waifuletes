# 🤖 Instruções Técnicas para Agentes de IA — Waifuletes

Este documento serve como a fonte canônica de diretrizes, regras arquiteturais, convenções de código e restrições para agentes de Inteligência Artificial (Gemini, Claude, GPT, Copilot, etc.) que operam neste repositório.

---

## 🎯 1. Visão Geral e Filosofia do Projeto

O **Waifuletes** é um motor de jogo RESTful especializado em gacha, harém e coleção de personagens, projetado para alimentar bots de chat em tempo real. O foco prioritário do projeto é:
1. **Performance Extrema:** Sorteios em < 10ms, p95 < 60ms sob alta carga concorrente.
2. **Atomicidade e Integridade Estrita:** Nenhuma operação financeira (Kakera) ou de consumo de roll pode sofrer de race conditions.
3. **Privacidade por Padrão (PII):** Nenhum JID, telefone ou identificador interno de usuário pode ser exposto em chamadas públicas anônimas.
4. **Deploy Seguro e Reprodutível:** Totalmente conteinerizado via Docker.

---

## 💻 2. Stack Tecnológica

| Componente | Tecnologia | Versão / Padrão |
|------------|------------|-----------------|
| Runtime | Node.js | v20+ / v22 LTS |
| Linguagem | TypeScript | 5.x com `strict: true` |
| Servidor Web | Fastify | 4.x (atenção à compatibilidade de plugins) |
| ORM | Prisma | 5.22.x |
| Banco Relacional | PostgreSQL | 16-alpine (com extensão `pg_trgm`) |
| Cache & Concorrência | Redis / ioredis | 7-alpine (com scripts Lua atômicos) |
| Testes | Vitest | 3.x / 5.x |
| Conteinerização | Docker / Compose | Multi-stage, non-root user `node` |

---

## 🔒 3. Regras Estritas de Implementação

### 3.1. Concorrência e Cooldowns
- **Rolls:** A verificação de saldo e a dedução de rolls são feitas através de script Lua atômico no Redis (`CONSUME_ROLL_LUA` em `CooldownService.ts`). Não use consultas separadas de leitura e escrita.
- **Roll Refund:** Se uma exceção não recuperável ocorrer durante o sorteio após o débito no Redis, o roll deve ser estornado atomicamente (`REFUND_ROLL_LUA`).
- **Claim Lock:** A janela de casamento é de **300 segundos** (5 minutos), armazenada com `SET claim:lock:<id> <groupId> EX 300 NX`. O lock pertence ao grupo, permitindo casamento por qualquer usuário presente.
- **Dono Global Único:** A tabela `harem_entries` possui `@@unique([characterId])`. Concorrência entre claims concorrentes no mesmo segundo é resolvida com tratamento elegante do erro Prisma `P2002` mapeado para `CHARACTER_ALREADY_CLAIMED`.

### 3.2. Proteção de Dados Pessoais (PII)
- Use o helper `isTrustedRequest(req)` (exportado em `api/src/plugins/auth.ts`) para diferenciar chamadas anônimas de chamadas autenticadas do bot.
- Em chamadas anônimas para `/leaderboard/users`, `/characters` e `/characters/:id`, omita os campos `id`, `platform`, `claimedInGroup` e retorne apenas `owner: { name }`.

### 3.3. Banco de Dados e Migrations
- **Nunca use `prisma db push` em produção.** Sempre use `npx prisma migrate deploy`.
- Novas migrações devem ser criadas via `npx prisma migrate dev --create-only`.
- O saldo de Kakera deve respeitar a constraint `CHECK (kakera >= 0)` e débitos devem usar `{ kakera: { gte: -amount } }`.

### 3.4. Fastify e Plugins
- Fastify 4.x é utilizado. Ao adicionar plugins como Helmet ou Rate Limit, utilize versões compatíveis com v4 (`@fastify/helmet@11.x`, `@fastify/rate-limit@9.x`).
- Todos os endpoints devem possuir validação de schema com `additionalProperties: false` para mitigar ataques de injeção de parâmetros.

---

## 📁 4. Estrutura de Diretórios Canônica

```
waifuletes/
├── api/
│   ├── prisma/             # Schema e Migrations
│   ├── src/
│   │   ├── config.ts       # Variáveis de ambiente validadas
│   │   ├── errors/         # DomainError e códigos de erro
│   │   ├── jobs/           # Rotinas em segundo plano (importManifest)
│   │   ├── plugins/        # Autenticação, Prisma, etc.
│   │   ├── routes/
│   │   │   ├── private/    # Rotinas autenticadas do bot
│   │   │   └── public/     # Rotinas com proteção PII
│   │   ├── services/       # Lógica de negócio (Roll, Marry, etc.)
│   │   ├── utils/          # Helpers utilitários
│   │   └── server.ts       # Instanciação Fastify
│   ├── tests/              # Testes Vitest de concorrência e integridade
│   └── scripts/            # Scripts utilitários e benchmarks
├── docs/                   # Documentações de integração e arquitetura
├── media/                  # Diretório de imagens locais (ignorado no git)
├── scripts/                # Scripts utilitários públicos (Mudae importer)
├── scratch/                # Arquivos locais/temporários (ignorado no git)
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

## 🚫 5. Restrições Proibidas
- **NUNCA** commitar arquivos `.env`, dumps de banco de dados (`.dump`, `.sql`), senhas reais ou tokens privados.
- **NUNCA** reintroduzir scripts ou filtros de categorização infantil no repositório público rastreado.
- **NUNCA** expor portas de banco de dados (`5432`) ou Redis (`6379`) diretamente na interface pública de rede (`0.0.0.0`); sempre vincule a `127.0.0.1`.

---

## 🐳 6. Docker & Rebuild de Containers (REGRA ESTRITA)
- **NUNCA execute restart ou rebuild automaticamente:** A IA jamais deve executar `docker restart`, `docker compose restart`, `docker compose down`, `docker compose up --build` ou reinício de containers por conta própria.
- **SEMPRE SOLICITAR AO USUÁRIO:** Qualquer necessidade de aplicar alterações em containers deve ser solicitada ao usuário, fornecendo o comando adequado para execução manual.
- **SEMPRE SUGERIR REBUILD (`--build`) PARA ALTERAÇÕES DE CÓDIGO (OBRIGATÓRIO):**
  - **`docker restart` NÃO APLICA MUDANÇAS DE CÓDIGO** no `waifuletes-api`, pois o projeto é em TypeScript e compilado no build multi-stage do Dockerfile (`RUN npm run build` -> `dist/`), e o `docker-compose.yml` mapeia apenas `prisma` e `public` (não mapeia `src/` nem `dist/`).
  - Portanto, após qualquer alteração em arquivos `.ts`, rotas, serviços ou dependências, **SEMPRE FORNEÇA O COMANDO DE REBUILD**:
    ```bash
    docker compose up -d --build api
    ```
  - **NUNCA sugira apenas `docker restart api`** quando o código do backend for alterado. Forneça sempre o comando completo com `--build` para que o usuário não precise perguntar se precisa de rebuild.
