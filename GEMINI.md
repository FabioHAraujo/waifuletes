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

### 3.5. Schemas Fastify e Métodos HTTP (DELETE, GET)
- **Schemas de Requisição:** Endpoints HTTP do tipo `DELETE` e `GET` NUNCA devem definir schema de `body` como `{ type: 'object' }` a menos que o payload no corpo seja estritamente obrigatório e documentado como tal. Navegadores e clientes HTTP padrão (fetch, axios, curl) enviam requisições DELETE sem body (passando parâmetros via query string ou headers). Definir `body: { type: 'object' }` faz o validador Ajv do Fastify rejeitar requisições legítimas com `VALIDATION_ERROR: body must be object`.

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

---

## 🧪 7. Diretrizes Estritas de Testes Automatizados (Vitest)

### 7.1. Validação Real de Schemas e Rotas HTTP
- **Nunca confiar apenas em testes unitários de serviços com mocks:** Testar unicamente a classe de serviço (ex: `UserService`, `DivorceService`) com mocks do Prisma valida apenas cálculos e regras de negócio internas, mas é completamente cego a erros estruturais de rotas Fastify, validações do Ajv, headers, query strings e serialização JSON.
- **Testes devem simular o comportamento real do usuário/frontend:** Endpoints da API (especialmente rotas web públicas e autenticadas) devem possuir testes que invoquem a rota HTTP (via `fastify.inject()` ou `fetch` no servidor de teste), reproduzindo fielmente as chamadas do cliente web (ex: `DELETE` com `?token=...` sem body).

### 7.2. Tolerância Zero para Sujeira de Teste na Base de Dados
- **Limpeza Obrigatória de Testes:** É expressamente proibido deixar resíduos de testes na base de dados de desenvolvimento ou produção.
- **Desfazer Casamentos:** Todo teste que realizar casamentos (`/marry`) DEVE obrigatoriamente desfazê-los no `afterAll` ou `finally`, decrementando `claimCount` do personagem para que ele volte ao estado solteiro e possa ser utilizado por jogadores reais.
- **Remover Usuários e Grupos de Teste:** Usuários criados em testes (ex: `test_*`, `another_user_*`, `seed_*`, `roll_tester_*`) e seus grupos DEVEM ser excluídos ao final de cada suíte (`afterAll`), utilizando os helpers de limpeza (`cleanupUser`, `cleanupTestDatabase`).
- **Apagar Sugestões de Teste:** Sugestões enviadas para validar criação, alteração ou debounce DEVEM ser excluídas do banco e ter eventuais mensagens de Telegram canceladas no encerramento do teste.
- **Global Teardown:** A configuração do Vitest (`vitest.config.ts`) possui `globalTeardown` configurado para varrer e expurgar quaisquer resíduos residuais via `POST /admin/cleanup-test-data` caso algum teste seja abortado ou sofra falha crítica antes do `afterAll`.

---

## ⚡ 8. Cachebuster Obrigatório para Frontend (CSS & JS)
- **Sempre atualizar o Cachebuster nas páginas HTML:** Sempre que qualquer arquivo estático de frontend em `api/public/` (especialmente `css/retro-theme.css`, `js/user.js`, `js/api.js`, etc.) for alterado, é **obrigatório** atualizar o parâmetro de versão (`?v=YYYYMMDD-<topico>`) nas tags `<link rel="stylesheet">` e `<script src="...">` de todos os arquivos HTML que referenciam os arquivos modificados (`user.html`, `catalogo.html`, `character.html`, `admin.html`, `index.html`).
- **Prevenção de Cache Stale:** Navegadores e proxies realizam cache agressivo de arquivos estáticos. Sem atualizar o cachebuster nos HTMLs, usuários e testadores continuarão carregando versões antigas em cache, resultando em falhas visuais ou comportamentos inconsistentes.
