# AI Handoff — LeprechaunPayClock

## Objetivo do projeto
Aplicação web para acompanhar ganhos em tempo real por empresa, com cards individuais e totais de hoje, mês e ano.

## Stack e estrutura
- Backend: Node.js + Express
- Banco: Turso (libSQL) via `@libsql/client`
- Frontend: HTML/CSS/JS em `public/`
- API principal:
  - `GET /api/companies`
  - `GET /api/earnings`
  - `POST /api/earnings`
  - `GET /api/health`

Pastas importantes:
- `api/` handlers HTTP
- `lib/database.js` inicialização, schema e seed/upsert de empresas
- `public/script.js` cálculo de ganhos e render dos cards
- `public/assets/` logos

## Regras de negócio atuais

### Empresas
- Empresas ativas vêm de `companies.active = 1`.
- Empresas são sincronizadas no startup do backend via `seedDatabase()`.
- O seed usa upsert por nome (conflito em `name`) para manter valores atualizados.

### Almatar (regra vigente)
- Nome: Almatar
- Tipo: CLT
- Salário mensal: 14560
- Início: 2026-03-09
- Logo: `public/assets/Almatar.png`

### Data/fuso horário (ponto crítico)
- Problema histórico: `new Date('YYYY-MM-DD')` era interpretado em UTC e mostrava dia anterior em alguns fusos.
- Correção aplicada no frontend: usar parse local com `parseISODateAsLocal(dateString)` em `public/script.js`.
- Sempre reutilizar parse local para qualquer `start_date` em exibição/comparação.

## Deploy e ambientes

### Local
Necessário definir variáveis:
- `TURSO_CONNECTION_URL`
- `TURSO_AUTH_TOKEN`

Sem essas variáveis o backend não inicializa.

### Produção (Vercel)
- Push em `main` dispara deploy automático quando integração GitHub↔Vercel está ativa.
- `vercel.json` define `buildCommand: npm install`.

## Decisões importantes já tomadas
- Não commitar arquivos acidentais da pasta `errors/`.
- Commits recentes relevantes:
  - inclusão da Almatar + logo + sincronização no seed
  - correção da data de início para 2026-03-09
  - correção de fuso na leitura/exibição de data

## Checklist para futuras mudanças de empresa
1. Atualizar empresa em `lib/database.js` (seed/upsert).
2. Confirmar data no formato `YYYY-MM-DD`.
3. Garantir parse local no frontend (nunca parse UTC implícito).
4. Adicionar logo em `public/assets/` e mapear em `public/script.js`.
5. Validar `GET /api/companies`.
6. Commitar apenas arquivos relacionados.

## Débitos técnicos conhecidos
- `README.md` está muito curto e não documenta setup real.
- `env.example` não representa todas as variáveis necessárias de runtime.
- Existem arquivos não versionados em `errors/` no workspace local (não devem entrar em commit).
