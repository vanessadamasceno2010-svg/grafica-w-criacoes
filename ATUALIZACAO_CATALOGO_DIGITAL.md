# Catálogo digital — instalação

Este pacote contém somente arquivos novos/alterados, nas pastas do projeto. Não inclui node_modules. O catálogo físico e seu carrinho continuam separados.

## 1. Atualizar o GitHub

Extraia o ZIP. Envie o conteúdo das pastas backend, frontend e database para as mesmas pastas na raiz da branch main. Não crie uma pasta extra com o nome do ZIP. Substitua os arquivos existentes e mantenha todos os outros arquivos do projeto.

## 2. Criar as tabelas

No Supabase, abra SQL Editor e execute todo o arquivo database/migrations/015_catalogo_digital.sql antes de publicar o backend. Pode executá-lo novamente sem apagar dados.

As tabelas digitais são privadas: o navegador acessa apenas a API do backend. O backend precisa da SUPABASE_SERVICE_ROLE_KEY já usada pelo projeto. Não altere as permissões para permitir leitura pública das tabelas.

## 3. Configurar o LivePix

Crie uma aplicação da sua própria conta no painel LivePix, em Configurações / API. Configure no ambiente do BACKEND na Vercel:

- LIVEPIX_CLIENT_ID: identificação da aplicação LivePix.
- LIVEPIX_CLIENT_SECRET: segredo da aplicação LivePix.
- DIGITAL_SITE_URL: endereço público do frontend, por exemplo https://sua-grafica.com (sem /digitais).
- DIGITAL_API_URL: endereço público da API, incluindo /api, por exemplo https://seu-backend.vercel.app/api.

Mantenha FRONTEND_URL apontando para seu domínio para permitir as chamadas do navegador. Mantenha a VITE_API_URL do frontend apontando para o backend correto, conforme a configuração atual.

Não coloque client_secret em variáveis VITE_, no código frontend, no GitHub ou em configurações públicas do site. O backend solicita os escopos payments:read, payments:write e webhooks. Configure a aplicação LivePix para permitir essas permissões.

Publique novamente backend e frontend após configurar as variáveis. Entre no painel como administrador, abra Catálogo digital e clique em “Configurar webhook LivePix”. O botão registra a URL DIGITAL_API_URL/digital/webhook na conta. A indicação de credenciais configuradas confirma a presença das variáveis; o botão testa o acesso real à API.

Referência oficial da integração: https://docs.livepix.gg/api e https://api.livepix.gg/open-api.json.

## 4. Cadastrar e vender

No admin, Catálogo digital permite cadastrar/editar nome, descrição, valor, imagem por URL HTTPS, link HTTPS do arquivo e disponibilidade. Desmarque “Disponível no catálogo” para retirar um produto da venda. Compras anteriores preservam o valor, nome e link que existiam no momento do pedido.

Compartilhe https://SEU-DOMINIO/digitais. Não há botão no menu público principal. A página é acessível por link direto, mas não é uma página privada ou protegida por senha.

Cada compra corresponde a um produto digital. O cliente abre a compra, clica em Pagar com LivePix e realiza o pagamento no checkout oficial. A tela de compra consulta automaticamente a confirmação e mostra Baixar arquivo quando confirmado. O webhook permite registrar o pagamento mesmo quando o cliente fecha a página. O admin pode conferir as últimas 200 compras e consultar pagamentos pendentes novamente.

A entrega acontece na página da compra, não por e-mail ou WhatsApp. O cliente deve guardar o link usando “Copiar link desta compra”; as últimas 30 compras também ficam acessíveis no mesmo navegador. O link contém uma chave privada após #. Quem tiver o link poderá acessar o arquivo após o pagamento. O arquivo de destino deve estar acessível sem solicitar permissão ao comprador; teste o endereço em janela anônima. Após liberado, um link externo pode ser compartilhado pelo comprador; este modelo não oferece DRM nem expiração do arquivo.

## 5. Conferência antes de divulgar

1. Cadastre um produto e confirme a visualização em /digitais e a ausência de link no menu principal.
2. Gere uma compra: o arquivo deve continuar indisponível antes do pagamento.
3. Faça um pagamento real de teste permitido pela sua conta LivePix. Volte à compra, confira a liberação e faça o download.
4. Confira o status Pago no admin e atualize a página da compra para confirmar que o acesso permanece.
5. Faça outra compra, feche a página após pagar e confira o processamento pelo webhook no admin.

Não houve acesso às suas credenciais nem pagamento real durante a preparação do pacote. A integração segue a API oficial, mas a ativação depende das permissões, condições e disponibilidade da sua conta LivePix. O valor mínimo aceito e eventuais taxas são definidos pelo provedor; erros de criação não liberam arquivos.

## Validação técnica realizada

- Build de produção do frontend e backend e verificação TypeScript do frontend.
- Testes automatizados com banco PostgreSQL embarcado e API LivePix simulada: migração repetível, permissões privadas, cache compartilhado de token, bloqueio de admin não autenticado, acesso por chave, rejeição de notificação falsa/valor divergente e confirmação idempotente.
- A validação visual automatizada não foi executada: o ambiente não possui o navegador necessário.

Para repetir os testes: npm run build, npx tsc --noEmit -p frontend/tsconfig.json e node backend/tests/digital.mjs.

As vendas digitais aparecem na seção própria. Não são somadas automaticamente ao PDV ou fluxo de caixa do catálogo físico nesta atualização.
