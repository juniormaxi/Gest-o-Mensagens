# WhatsSender Web

Aplicação web para organizar campanhas personalizadas e abrir conversas no WhatsApp com a mensagem preenchida. O envio final é sempre feito pelo operador; o projeto não automatiza cliques, disparos em massa, scraping ou contorno de proteções do WhatsApp.

## Arquitetura

- `src/client`: React, Vite, Tailwind e interface responsiva.
- `src/server`: API Express dividida em rotas, serviços, providers, middleware e validação Zod.
- `src/shared`: regras puras e testáveis de telefone e templates.
- `prisma`: schema PostgreSQL, migration inicial e seed opt-in.

O fluxo principal é `Campaign -> Import -> Contact -> CampaignContact -> MessageEvent`. `CampaignContact` guarda os dados específicos da campanha e o estado atual; `MessageEvent` mantém o histórico imutável para auditoria. `WhatsAppWebProvider` somente cria a URL oficial `wa.me` com `encodeURIComponent`.

## MVP implementado

- autenticação JWT, senha bcrypt, perfis e rotas protegidas;
- dashboard básico e campanhas paginadas;
- upload CSV/XLSX, prévia, mapeamento, validação e importação em lotes de 500;
- normalização brasileira, inválidos e deduplicação;
- variáveis personalizadas, URL individual/padrão e fallback `{{nome|cliente}}` sem `eval`;
- fila manual com mensagem individual, abrir WhatsApp, confirmação, próximo contato e atalhos `W/E/N/S/←/→`;
- eventos e auditoria, anonimização LGPD, rate limit, Helmet e validação centralizada;
- schema/indexes, migration, Docker e healthcheck.

Os menus de modelos, relatórios avançados e configurações estão reservados visualmente para a Fase 2; não há implementação fictícia desses módulos.

## Desenvolvimento

Requisitos: Node 22+ e PostgreSQL 15+.

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

O frontend abre em `http://localhost:5173`; a API em `http://localhost:3000`. O seed exige `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` e não cria dados de campanha.

## Variáveis de ambiente

Consulte `.env.example`. `DATABASE_URL` e `JWT_SECRET` são obrigatórias. Nunca use o segredo de exemplo em produção. As credenciais não são incluídas em logs.

## Comandos

```bash
npm test             # testes unitários
npm run typecheck    # cliente e servidor em strict mode
npm run build        # Prisma, API e frontend
npx prisma migrate deploy
```

## Deploy no Railway

1. Crie um serviço PostgreSQL e um serviço a partir deste repositório.
2. Defina `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `PORT=3000` e `DEFAULT_COUNTRY_CODE=55`.
3. O `railway.json` usa o Dockerfile, executa `prisma migrate deploy` e verifica `/api/health`.
4. Execute o seed uma única vez com credenciais administrativas temporárias e depois remova as variáveis do seed.

## Segurança e limites

A aplicação usa consultas parametrizadas do Prisma, Zod, Helmet, CORS restrito, limite de login, limite de upload e paginação server-side. Em produção, use HTTPS e segredos fortes. Para volumes muito grandes, a evolução prevista é mover parsing/importação para worker/stream, mantendo as mesmas tabelas e serviços. O validador de WhatsApp retorna `UNKNOWN` até existir integração oficial/autorizada.
