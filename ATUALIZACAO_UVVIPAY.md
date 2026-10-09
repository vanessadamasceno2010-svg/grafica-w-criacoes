# UvviPay no catálogo digital — instalação pelo GitHub

Este pacote contém apenas os arquivos novos e alterados. Requer as atualizações anteriores do catálogo digital, incluindo as migrações 015 e 016. Não inclui node_modules.

## O que foi integrado

- Novas compras digitais com Pix UvviPay, QR Code gerado no próprio navegador e Pix Copia e Cola.
- Nome, e-mail e CPF/CNPJ solicitados no checkout conforme os dados exigidos pela API. Não há coleta de cartão nesta versão.
- Preço calculado no servidor pelo produto cadastrado; o valor enviado pelo navegador não é utilizado.
- Consulta autenticada do pagamento e download liberado quando confirmado como pago.
- Webhook com assinatura HMAC e validade do timestamp. O backend consulta a API mesmo após receber uma notificação assinada.
- Repetição de tentativa com a mesma chave de idempotência e o mesmo conteúdo original, evitando cobrar novamente após timeout.
- Situações pago, pendente, recusado, cancelado, expirado, estornado e contestado no admin. Estorno/contestação bloqueia a entrega pela página. Um link externo já copiado ou um arquivo já baixado não pode ser recolhido por este sistema.
- Pedidos anteriores continuam identificados como LivePix. Mantenha as credenciais LivePix para consultar suas compras antigas ainda pendentes.
- Identidade, galerias, banners e rodapé do catálogo digital preservados.

A entrega continua sendo feita na página da compra, mediante o link privado; não há envio automático por e-mail nesta atualização. Vendas digitais continuam na sua seção própria, sem lançamento automático no caixa do catálogo físico.

## 1. Supabase

Abra o SQL Editor do seu projeto e execute todo o arquivo:

database/migrations/017_digital_uvvipay.sql

Execute antes de publicar o novo backend. A migração preserva os pedidos existentes como LivePix e adiciona os campos da UvviPay. Não apaga pedidos, produtos ou imagens. Os dados do comprador ficam na tabela privada, acessível ao backend pela service role.

## 2. Vercel — variáveis do projeto BACKEND

Abra o projeto do backend → Settings → Environment Variables. Preencha:

| Nome | Valor |
| --- | --- |
| DIGITAL_PAYMENT_GATEWAY | uvvipay |
| UVVIPAY_CLIENT_ID | Client ID gerado na sua conta UvviPay |
| UVVIPAY_CLIENT_SECRET | Client Secret correspondente |
| UVVIPAY_ENV | production para vendas reais; staging somente para testes, com credenciais de teste |
| UVVIPAY_WEBHOOK_SECRET | Um segredo aleatório exclusivo, entre 32 e 256 caracteres, criado por você com um gerador de senhas |
| DIGITAL_API_URL | URL pública do backend terminando em /api, por exemplo https://seu-backend.vercel.app/api |

Mantenha SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET e FRONTEND_URL já configuradas. A VITE_API_URL do frontend deve apontar para a API correta, como antes.

Não envie os segredos na conversa nem os coloque no GitHub. Não use nomes iniciados por VITE_ para chaves UvviPay. As credenciais ficam somente no backend. Configure os ambientes da Vercel que você realmente utiliza e faça redeploy após editar variáveis.

UVVIPAY_ENV aceita apenas production ou staging. Os endereços da API são fixos e oficiais. Uma compra criada em staging não libera arquivos reais, mesmo quando marcada como paga. Não misture credenciais de ambientes diferentes. Alterar o ambiente não converte pedidos antigos de teste em pedidos de produção.

## 3. GitHub

Extraia o ZIP. Envie os arquivos para as mesmas pastas da branch main, substituindo os existentes. Envie também frontend/package.json e package-lock.json da raiz: eles incluem a biblioteca de QR Code. Não crie uma pasta extra com o nome do ZIP. Não envie node_modules.

A publicação do frontend e do backend ocorrerá conforme as configurações atuais da Vercel. Se não houver publicação automática, clique em Redeploy nos dois projetos.

## 4. Ativar notificações

Abra o admin → Catálogo digital. O painel informa qual gateway e ambiente estão configurados. Clique em “Configurar webhook UvviPay”.

O botão registra ou atualiza este endereço:

https://SEU-BACKEND/api/digital/webhook/uvvipay

Ele envia o segredo HMAC e os eventos de pagamento, estorno, contestação, recusa, cancelamento e expiração. Não cadastre uma URL do frontend por engano. A mensagem de sucesso exige que o provedor retorne o webhook ativo e com assinatura configurada.

“Credenciais configuradas” significa que as variáveis estão presentes. O registro do webhook e uma cobrança de teste verificam as permissões reais da conta. Se trocar UVVIPAY_WEBHOOK_SECRET, publique o backend e clique novamente no botão para atualizar o provedor.

A conta deve permitir Pix e a chave x-idempotency-key. Se o provedor informar IDEMPOTENCY_KEY_NOT_SUPPORTED, solicite a habilitação ao suporte UvviPay; a integração não remove a proteção para forçar uma cobrança.

## 5. Teste antes de divulgar

1. Confira se a conta UvviPay está habilitada para operar e se as credenciais pertencem ao ambiente selecionado.
2. Abra /digitais, escolha um produto e preencha os dados do comprador. A API documenta valores entre R$ 1,00 e R$ 150.000,00, sujeitos aos limites reais da sua conta.
3. Verifique o QR Code e o Pix Copia e Cola. Antes do pagamento, o botão de download não deve aparecer.
4. Faça um pagamento real controlado quando estiver em production. Confira a liberação na página e o status no admin.
5. Feche a página após outra compra de teste paga e confira a atualização via webhook no admin. Não marque um pagamento como pago apenas por retornar ao site.
6. Se a conexão falhar ao gerar o Pix, use “Tentar novamente nesta compra” ou o botão de verificação no admin. A mesma cobrança será recuperada; não crie vários pedidos para resolver um timeout.

O Pix é solicitado com validade de 30 minutos. O prazo exibido utiliza a expiração retornada pela UvviPay. O relógio do navegador não confirma nem desfaz um pagamento: a API continua sendo a autoridade para liberar o download.

## Compras antigas e reversão

O endpoint antigo /api/digital/webhook continua atendendo eventos LivePix. Para voltar a criar novas compras com LivePix, defina DIGITAL_PAYMENT_GATEWAY=livepix e faça redeploy do backend. Mantenha as configurações de ambos os provedores enquanto houver pedidos pendentes. A origem de cada pedido é preservada; a troca de gateway não muda cobranças já geradas.

## Validação desta entrega

A integração foi implementada a partir da documentação oficial, sem acessar sua conta ou usar credenciais reais. Os testes usam respostas simuladas da API e banco PostgreSQL embarcado. Foram verificados preços no servidor, recuperação após timeout, assinatura e timestamp, acesso privado, valor divergente, confirmação, estorno, concorrência de estados e bloqueio de entrega em staging, além das verificações de compilação e tipos.

Não foi possível executar a inspeção visual automatizada: o download do navegador de teste falhou neste ambiente. Confira o checkout no celular e no computador após publicar. A aprovação de uma cobrança real ainda depende da configuração e das permissões da sua conta.

Documentação oficial consultada:
- https://developers.uvvipay.com.br/api-reference/payments/create
- https://developers.uvvipay.com.br/api-reference/payments/get
- https://developers.uvvipay.com.br/webhooks
- https://developers.uvvipay.com.br/api-reference/webhooks/create

Para repetir os testes técnicos: npm run build; npx tsc --noEmit -p frontend/tsconfig.json; node backend/tests/digital.mjs; node backend/tests/uvvipay.mjs.
