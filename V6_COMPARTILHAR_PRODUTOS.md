# V6 - Botão de compartilhar produtos

## O que foi adicionado

- Botão **Compartilhar** em cada card de produto do catálogo e da home.
- Botão de compartilhamento na página individual do produto.
- No celular, usa o compartilhamento nativo do aparelho quando disponível.
- No desktop/navegadores sem compartilhamento nativo, copia a mensagem e o link do produto para a área de transferência.
- A mensagem compartilhada inclui:
  - nome do produto;
  - preço;
  - opção/variação selecionada, quando houver;
  - prazo de entrega da variação, quando houver;
  - descrição curta;
  - link direto para o produto.

## Arquivos alterados

- `frontend/src/components/ProductCard.tsx`
- `frontend/src/pages/Produto.tsx`
- `frontend/src/lib/share.ts`

## Observação

Não precisa rodar migration no banco. A alteração é somente no front-end.
