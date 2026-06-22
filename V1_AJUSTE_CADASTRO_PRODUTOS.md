# V1 - Preços por quantidade e acabamento

## O que foi alterado

- A área de preços do cadastro de produtos ficou mais simples.
- Cada combinação agora destaca os campos: quantidade, acabamento, preço e estoque.
- Tamanho, modelo e nome personalizado continuam disponíveis em **Mais detalhes**.
- O painel impede o salvamento de combinação sem quantidade, acabamento ou preço.
- O painel avisa quando existir uma combinação repetida.
- Quando houver combinações, o menor preço será salvo como preço base do produto.
- Na página pública, o nome da combinação não repete quantidade e acabamento.

## Arquivos alterados

- `frontend/src/pages/admin/Produtos.tsx`
- `frontend/src/pages/Produto.tsx`
- `package-lock.json` foi criado ao instalar as dependências para validação.

## Supabase e SQL

Esta V1 **não precisa de SQL novo**.

O projeto já possui a coluna `variacoes` na migração:

`database/migrations/006_modal_padrao_variacoes_produtos.sql`

Se o cadastro atual já salvava variações, essa migração já foi aplicada. Não execute novamente apenas por causa desta V1.

## Como testar no painel

1. Entre no painel administrativo de teste.
2. Abra **Produtos**.
3. Clique em **Novo Produto**.
4. Preencha nome, categoria e os demais dados principais.
5. Em **Preços por quantidade e acabamento**, clique em **Adicionar preço**.
6. Cadastre, por exemplo:
   - Quantidade: `100 unidades`
   - Acabamento: `Fosco`
   - Preço: `80,00`
7. Adicione outra linha, por exemplo `250 unidades`, `Fosco`, `150,00`.
8. Adicione outra linha com a mesma quantidade e acabamento diferente.
9. Salve o produto.
10. Abra o produto no catálogo e confirme que cada combinação mostra o preço correto.
11. Adicione uma combinação ao carrinho e confira o preço e a descrição escolhida.

Também teste estes avisos:

- Tentar salvar uma linha sem quantidade.
- Tentar salvar uma linha sem acabamento.
- Tentar salvar uma linha com preço zero.
- Tentar repetir a mesma combinação.

## Como enviar para o GitHub

Use somente a branch de teste `cadastro-produtos-variacoes`.

No GitHub Desktop:

1. Abra o repositório do projeto.
2. Crie a branch `cadastro-produtos-variacoes` a partir da `main`.
3. Substitua os arquivos do projeto pelos arquivos desta V1.
4. Confirme que o arquivo `.env` não está selecionado para envio.
5. Escreva a mensagem: `V1 - preços por quantidade e acabamento`.
6. Clique em **Commit to cadastro-produtos-variacoes**.
7. Clique em **Publish branch**.
8. Não faça merge com a `main` ainda.

## Como testar na Vercel

1. Aguarde a Vercel criar o endereço de teste da branch.
2. Abra o endereço de **Preview**, não o endereço de produção.
3. Faça todos os testes descritos acima.
4. Confira também um produto antigo para garantir que ele continua funcionando.
5. Confira no celular e no computador.

Somente depois de todos os testes aprovados a branch poderá ser unida à `main`.

## Observação de segurança

A instalação encontrou um alerta de segurança na biblioteca de envio de e-mail `nodemailer`, que já fazia parte do projeto. Ela não foi atualizada nesta V1 porque a correção exige uma mudança maior e poderia afetar os e-mails. Isso deve ser tratado separadamente e testado antes da produção.
