# V2 - Correção do login no Preview da Vercel

## Problema encontrado

O endereço de teste da Vercel tentava acessar o backend diretamente. Como o endereço do Preview muda a cada branch, o navegador bloqueava a conexão e mostrava:

`NetworkError when attempting to fetch resource.`

Esse erro acontecia antes da conferência do email e da senha.

## O que foi alterado

- As chamadas feitas em endereços `vercel.app` agora usam `/api` no próprio site.
- A Vercel encaminha essas chamadas com segurança para o backend existente.
- O login mostra uma mensagem simples caso o servidor realmente esteja indisponível.
- Nenhuma senha, usuário ou permissão foi alterada.
- Supabase, PushinPay e banco de dados não foram alterados.

## Arquivos alterados

- `frontend/src/lib/api.ts`
- `frontend/vercel.json`

## Variáveis de ambiente

Não é necessário criar, remover ou alterar variável de ambiente para esta V2.

Quando o site estiver na Vercel, ele usará o encaminhamento `/api`. Fora da Vercel, o comportamento anterior e a variável `VITE_API_URL` continuam disponíveis.

## Supabase e SQL

Esta V2 **não precisa de SQL**. Não execute nenhuma migração no Supabase.

## Como testar

1. Envie esta V2 para a mesma branch de teste `cadastro-produtos-variacoes`.
2. Aguarde a Vercel finalizar o novo Preview.
3. Abra o novo endereço do Preview; não reutilize um endereço antigo que mostre `DEPLOYMENT_NOT_FOUND`.
4. Abra a tela **Entrar**.
5. Digite o email e a senha normalmente.
6. Confirme que o painel administrativo abre.
7. Saia da conta e entre novamente.
8. Teste também o catálogo e o cadastro de produtos da V1.

Não envie a senha em captura de tela, mensagem ou arquivo.

## Publicação

Não faça merge na `main` antes de o login funcionar no Preview e o cadastro de produtos da V1 continuar funcionando.
