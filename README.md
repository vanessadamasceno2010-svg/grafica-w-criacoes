# Gráfica W Criações

Site premium para gráfica com loja pública, catálogo de produtos, carrinho, finalização de pedido pelo WhatsApp e painel administrativo completo.

## Ajustes aplicados

- Identidade visual atualizada para o padrão azul escuro e dourado da Gráfica W Criações.
- Logo e imagem de chaveiros adicionadas em `frontend/public/assets`.
- Checkout sem API de pagamento online.
- Cliente monta o carrinho e finaliza enviando o pedido para o WhatsApp: **88 99624-0470**.
- Painel administrativo com opção de registrar pedido manualmente.
- Pedido concluído com opção de emitir/imprimir recibo.
- Backend preparado para controlar pedidos de origem `site`, `whatsapp` ou `manual`.

## Tecnologias

- React 19 + TypeScript + Tailwind CSS
- Express.js + TypeScript
- PostgreSQL/Supabase
- JWT, bcrypt, Zod, Helmet, Rate Limit
- Envio de email opcional via SMTP
- Vitest/Supertest no backend

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3333`

## Banco de dados

Execute a migration e seed no Supabase SQL Editor:

```sql
-- database/migrations/001_init.sql
-- database/seeds/001_seed.sql
```

## Login inicial

Admin seedado:

- Email: `admin@graficawcriacoes.com`
- Senha: `Admin@123456`

## Rotas principais

Loja: `/`, `/catalogo`, `/produto/:slug`, `/carrinho`, `/checkout`, `/pedido-confirmado/:numero`, `/acompanhar`, `/sobre`, `/contato`, `/login`, `/minha-conta`.

Admin: `/admin`, `/admin/produtos`, `/admin/pedidos`, `/admin/clientes`, `/admin/categorias`, `/admin/cupons`, `/admin/avaliacoes`, `/admin/configuracoes`, `/admin/contatos`, `/admin/relatorios`, `/admin/usuarios`.

## Produção

- Use HTTPS obrigatório no domínio.
- Configure `JWT_SECRET` forte.
- Configure SMTP apenas se quiser emails automáticos.
- Configure RLS no Supabase conforme sua política.
- Configure backups automáticos do Supabase.
- Atualize o número de WhatsApp em `frontend/src/lib/api.ts` e no `.env` caso mude.
