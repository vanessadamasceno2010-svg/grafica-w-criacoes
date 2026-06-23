# V7 - Correção da ligação com o backend de Preview

## Erro corrigido

A mensagem:

`Rota não encontrada: GET /api/admin/contas-pagar`

significa que o frontend novo estava ligado ao backend antigo de produção. O SQL não causa esse erro.

## O que foi alterado

- O frontend agora respeita `VITE_API_URL` quando ela estiver configurada.
- O backend permite os endereços de Preview oficiais do frontend.
- A permissão CORS deixou de aceitar sites desconhecidos.
- O endereço de produção continua funcionando como alternativa quando não há variável configurada.

## Arquivos alterados

- `frontend/src/lib/api.ts`
- `backend/src/index.ts`

## SQL

Não existe SQL novo na V7.

A V6 ainda precisa de `database/migrations/010_contas_pagar.sql`. Se esse arquivo já foi executado com sucesso no ambiente usado para teste, não execute novamente.

## Como ligar os dois Previews na Vercel

### 1. Backend de teste

1. Envie a V7 para a branch `cadastro-produtos-variacoes`.
2. Abra o projeto do **backend** na Vercel.
3. Entre em **Deployments**.
4. Aguarde o Preview dessa branch terminar.
5. Copie o endereço do Preview ou alias da branch.
6. Abra esse endereço acrescentando `/health`.
7. Confirme que aparece `ok: true`.

### 2. Frontend de teste

1. Abra o projeto do **frontend** na Vercel.
2. Entre em **Settings → Environment Variables**.
3. Crie a variável `VITE_API_URL`.
4. No valor, informe o endereço do backend de Preview seguido de `/api`.
5. Exemplo: `https://endereco-do-backend-preview.vercel.app/api`.
6. Marque somente o ambiente **Preview**.
7. Salve.
8. Volte aos Deployments do frontend e faça **Redeploy** da branch.

Essa variável não contém senha ou chave. Ela informa apenas o endereço público do backend de teste.

## Como confirmar a correção

1. Abra o novo Preview do frontend.
2. Entre como administrador.
3. Abra **Contas a Pagar**.
4. A mensagem “Rota não encontrada” não deve aparecer.
5. Cadastre uma conta pequena de teste.
6. Confira parcelas, vencimentos e Dashboard.

## Publicação

Depois que os dois Previews estiverem aprovados:

1. Confirme o backup e a migração `010_contas_pagar.sql` na produção.
2. Faça merge da branch na `main`.
3. Confirme que os projetos de backend e frontend foram publicados pela Vercel.
4. Abra **Contas a Pagar** no site final e faça um teste controlado.

## Segurança

- Nenhuma chave ou senha foi alterada.
- A variável nova contém somente uma URL pública.
- Rotas financeiras continuam exclusivas para administrador.
- PushinPay, pagamentos e Supabase Auth não foram modificados.
