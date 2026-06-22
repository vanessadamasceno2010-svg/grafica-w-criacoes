# V3 - Filtro de variações com preços diferentes

## O que foi alterado

- O painel aceita grupos prontos ou personalizados.
- Exemplos de grupos: Tamanho, Acabamento, Quantidade, Tipo de papel, Cor e Impressão.
- O botão **Gerar pelas opções** cria todas as combinações possíveis.
- Cada combinação pode receber preço e estoque próprios.
- A página do produto mostra as opções como filtros.
- As opções seguintes são filtradas conforme as escolhas anteriores.
- Combinações indisponíveis ficam desativadas.
- O preço muda automaticamente quando o cliente troca a combinação.
- A combinação e o preço escolhidos seguem corretamente para o carrinho.
- Produtos antigos com quantidade, acabamento, tamanho ou modelo continuam compatíveis.

## Arquivos alterados

- `frontend/src/lib/api.ts`
- `frontend/src/pages/admin/Produtos.tsx`
- `frontend/src/pages/Produto.tsx`

## Supabase e SQL

Esta V3 **não precisa de SQL**.

As opções personalizadas ficam dentro do campo flexível `variacoes`, que já existe no projeto. Não execute nenhuma migração no Supabase para esta versão.

## Como cadastrar um produto

1. Entre no painel de teste.
2. Abra **Produtos** e crie ou edite um produto.
3. Em **Opções do produto**, adicione os grupos desejados.
4. Exemplo:
   - Tamanho: `5x5 cm, 9x5 cm`
   - Acabamento: `Fosco, Brilho`
   - Quantidade: `100, 250, 500`
5. Para um grupo personalizado, clique em **Outra**.
6. Digite, por exemplo:
   - Título: `Tipo de papel`
   - Opções: `Couché 250g, Supremo 300g`
7. Clique em **Gerar pelas opções**.
8. Informe um preço diferente em cada combinação gerada.
9. Desative combinações que não devem aparecer para o cliente.
10. Salve o produto.

## Como testar no Preview da Vercel

1. Envie a V3 para a branch `cadastro-produtos-variacoes`.
2. Aguarde a Vercel gerar um novo Preview.
3. Entre no painel e cadastre um produto com pelo menos três grupos.
4. Abra esse produto no catálogo.
5. Troque Tamanho, Acabamento e Quantidade.
6. Confirme que o preço muda conforme cada combinação.
7. Confira se opções inexistentes ficam desativadas.
8. Adicione ao carrinho e confira combinação e preço.
9. Teste também um produto antigo.
10. Confira no celular e no computador.

Não faça merge na `main` antes de concluir todos os testes.

## Segurança

- Nenhuma senha ou variável de ambiente foi alterada.
- Supabase, PushinPay, pagamentos e permissões administrativas não foram alterados.
- O ZIP não contém arquivo `.env`.
