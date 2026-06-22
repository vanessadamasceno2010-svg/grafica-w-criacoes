# V5 — Prazo de entrega por variação

## O que foi ajustado

- Adicionado o campo **Prazo de entrega** em cada variação/preço do produto no painel administrativo.
- O prazo é salvo dentro do JSON `variacoes` de cada produto, usando a chave `prazo_entrega`.
- O campo aceita texto livre, por exemplo:
  - `3 dias úteis`
  - `5 a 7 dias úteis`
  - `A combinar`
- Na página do produto, ao selecionar uma variação, o prazo aparece junto do preço selecionado.
- Ao adicionar ao carrinho ou finalizar pelo WhatsApp, o prazo da variação selecionada vai junto nas especificações do item.

## Banco de dados

Não precisa rodar nova migration no Supabase, porque a tabela `produtos` já possui a coluna `variacoes jsonb`.
O novo campo fica dentro de cada objeto da lista de variações, exemplo:

```json
{
  "id": "VAR-123",
  "nome": "100 unidades • Fosco",
  "opcoes": {
    "Quantidade": "100 unidades",
    "Acabamento": "Fosco"
  },
  "preco": 80,
  "prazo_entrega": "3 dias úteis",
  "estoque": 0,
  "ativo": true
}
```

## Arquivos alterados

- `frontend/src/lib/api.ts`
- `frontend/src/pages/admin/Produtos.tsx`
- `frontend/src/pages/Produto.tsx`

## Validação

Build executado com sucesso:

```bash
npm run build
```
