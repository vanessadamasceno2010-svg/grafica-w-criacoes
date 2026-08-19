# Instalação do PDV e Produção

## 1. Atualizar o banco de dados

1. Entre no Supabase do projeto.
2. Abra **SQL Editor**.
3. Abra o arquivo `database/migrations/011_pdv_producao.sql` deste projeto.
4. Copie todo o conteúdo, cole no SQL Editor e clique em **Run**.

O SQL pode ser executado uma vez. Ele preserva os dados existentes.

## 2. Publicar o projeto

Substitua o projeto atual pelo conteúdo desta pasta e publique primeiro o backend e depois o frontend na Vercel.

Antes da publicação, execute na pasta principal:

```bash
npm install
npm run build
```

## 3. Configurar a Elgin L42 Pro

1. Instale o driver oficial da Elgin no computador Windows.
2. Conecte a impressora por USB.
3. No Windows, configure a mídia com largura de **80 mm**.
4. No navegador, permita pop-ups para o endereço do sistema.
5. Ao imprimir, selecione a Elgin L42 Pro, papel de 80 mm, escala 100% e margens mínimas ou nenhuma.

## 4. Teste rápido

1. Entre no painel administrativo.
2. Abra **PDV e Produção**.
3. Cadastre uma venda pequena e clique em **Finalizar e imprimir**.
4. Confirme se o pedido apareceu na aba **Produção**.
5. Altere a etapa do pedido.
6. Abra **Entradas e saídas** e confirme o recebimento.
7. Cadastre uma saída de teste.
8. Confira se o saldo corresponde às entradas menos as saídas.

## Observação

A comanda é um documento interno de produção. Ela não substitui nota fiscal, NFC-e ou cupom fiscal.
