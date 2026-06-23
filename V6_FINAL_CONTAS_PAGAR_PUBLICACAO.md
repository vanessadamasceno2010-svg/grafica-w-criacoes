# V6 Final - Contas a Pagar e prazo por variação

## Incluído nesta versão

### Prazo por variação

- Cada combinação do produto possui prazo próprio em dias úteis.
- O prazo muda junto com o preço na página do produto.
- O prazo escolhido segue para o carrinho.
- Variações antigas recebem inicialmente 3 dias úteis e podem ser editadas.

### Contas a Pagar

- Nova opção **Contas a Pagar** no menu administrativo.
- Acesso exclusivo para administrador.
- Cadastro de descrição, fornecedor, categoria, valor, primeiro vencimento e observações.
- Conta única ou parcelada em até 120 parcelas.
- Vencimentos mensais gerados automaticamente.
- Divisão segura do valor, incluindo diferença de centavos na última parcela.
- Marcar parcela como paga ou reabrir como pendente.
- Excluir parcelas.
- Filtro por período, situação e busca.
- Cards com total do mês, contas a vencer, contas vencidas e total filtrado.
- Resumo das contas também no Dashboard principal.

## Arquivos principais alterados

- `database/migrations/010_contas_pagar.sql`
- `backend/src/routes/admin.ts`
- `frontend/src/pages/admin/ContasPagar.tsx`
- `frontend/src/pages/admin/AdminLayout.tsx`
- `frontend/src/pages/admin/Dashboard.tsx`
- `frontend/src/App.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/admin/Produtos.tsx`
- `frontend/src/pages/Produto.tsx`

## SQL obrigatório

Esta versão precisa da migração:

`database/migrations/010_contas_pagar.sql`

Execute somente em um Supabase de testes primeiro:

1. Abra o projeto de testes no Supabase.
2. Entre em **SQL Editor**.
3. Clique em **New query**.
4. Cole todo o conteúdo do arquivo SQL.
5. Clique em **Run** uma única vez.
6. Confirme que a tabela `contas_pagar` foi criada.

A migração cria uma tabela nova e não modifica pedidos, clientes, pagamentos ou fluxo de caixa existentes.

Se você possui apenas o Supabase de produção, não execute o SQL ainda. Solicite um plano de migração segura antes da publicação.

## Como testar

1. Use a branch `cadastro-produtos-variacoes`.
2. Envie a V6 para o GitHub.
3. Aguarde o Preview da Vercel.
4. Entre como administrador.
5. Abra **Contas a Pagar**.
6. Cadastre uma conta de R$ 1.000,00 em 3 parcelas.
7. Confira os três vencimentos mensais e a soma de R$ 1.000,00.
8. Marque uma parcela como paga e depois reabra.
9. Teste os filtros por período e situação.
10. Crie uma conta vencida de teste e confira o card vermelho.
11. Confira os cards no Dashboard principal.
12. Edite um produto e defina prazos diferentes para duas combinações.
13. Troque a variação na página do produto e confira preço e prazo.
14. Adicione ao carrinho e confira o prazo estimado.
15. Teste no celular e no computador.

## Publicação final

Somente depois dos testes:

1. Faça backup do Supabase de produção.
2. Execute `010_contas_pagar.sql` no SQL Editor da produção uma única vez.
3. Faça o merge da branch testada na `main`.
4. Aguarde a publicação da Vercel.
5. Faça um teste final sem cadastrar dados fictícios permanentes.

## Segurança

- A tabela usa RLS.
- Somente a chave de serviço do backend possui acesso direto.
- Todas as rotas exigem usuário administrador.
- Clientes e funcionários não recebem acesso às contas.
- Nenhuma variável de ambiente foi alterada.
- Supabase Auth, PushinPay e pagamentos não foram modificados.
