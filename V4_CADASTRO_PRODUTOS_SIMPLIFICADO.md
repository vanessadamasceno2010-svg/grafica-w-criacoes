# V4 - Cadastro de produtos simplificado

## O que foi removido da tela

- Slug/link do produto.
- SKU/código interno.
- Descrição curta.
- Preço base.
- Preço original.
- Estoque base.
- Estoque por combinação.
- Exibição de estoque na página do produto.
- Produção em dias por produto.

Os campos técnicos continuam sendo preenchidos internamente quando necessários. Dados antigos não são apagados do banco.

## Nova categoria pelo cadastro do produto

- A lista de categorias agora possui **Outros — criar nova categoria**.
- Ao escolher essa opção, aparece o campo **Nome da nova categoria**.
- A categoria é criada automaticamente quando o produto é salvo.
- Se já existir uma categoria com o mesmo nome, o produto usa a categoria existente.
- Somente usuários autorizados do painel podem criar a categoria.

## Preços

Os preços continuam sendo definidos em **Preços por combinação**. Cada combinação deve possuir um valor maior que zero.

## Arquivos alterados

- `frontend/src/pages/admin/Produtos.tsx`
- `frontend/src/pages/Produto.tsx`

## Supabase e SQL

Esta V4 **não precisa de SQL**. Não execute nenhuma migração no Supabase.

## Variáveis de ambiente

Nenhuma variável de ambiente foi criada, removida ou alterada.

## Como testar no Preview

1. Envie a V4 para a branch `cadastro-produtos-variacoes`.
2. Aguarde o novo Preview da Vercel.
3. Entre no painel e abra **Produtos**.
4. Confirme que os campos removidos não aparecem mais.
5. Crie um produto usando uma categoria existente.
6. Crie outro produto escolhendo **Outros — criar nova categoria**.
7. Digite o nome da categoria nova.
8. Crie as opções e informe os preços das combinações.
9. Salve o produto.
10. Confira se a categoria nova aparece no painel e no produto.
11. Confira os filtros, preços e carrinho.
12. Teste também um produto antigo.

Não faça merge na `main` antes de concluir todos os testes.

## Segurança

- Supabase, PushinPay, pagamentos e permissões não foram alterados.
- O ZIP não contém `.env`, senhas ou chaves privadas.
