# Atualização do catálogo digital: imagens e identidade própria

Este ZIP contém somente os arquivos novos/alterados desta etapa. Requer a atualização anterior do catálogo digital LivePix, incluindo a migração 015.

## Instalação

1. No SQL Editor do Supabase, execute database/migrations/016_digital_identidade_imagens.sql. As capas existentes são preservadas como a primeira foto da galeria. O SQL não apaga produtos ou pedidos.
2. Extraia o ZIP e envie o conteúdo das pastas para as mesmas pastas na raiz da branch main do GitHub, substituindo os arquivos indicados. Não envie o ZIP diretamente, não crie uma pasta extra e não envie node_modules.
3. Publique novamente o backend e o frontend. Não há novas variáveis de ambiente nem mudanças nas credenciais LivePix.

## Onde configurar

Abra Painel admin → Catálogo digital.

- No cadastro/edição de produtos, use “Fotos do produto”. Cada produto aceita até 12 imagens. A primeira é a capa. As setas alteram a ordem; Remover retira a imagem da galeria.
- Carregue JPEG, PNG ou WebP do computador, cole uma URL HTTPS ou cole o conteúdo completo data:image/jpeg;base64,... (também PNG/WebP). Clique em Adicionar imagem para importar o conteúdo colado.
- Arquivos e imagens base64 são redimensionados para até 1920 pixels e armazenados pelo serviço de imagens já existente. O limite de entrada é 20 MB por imagem. Aguarde a conclusão e depois salve o produto. URLs HTTPS comuns permanecem externas.
- O upload utiliza o bucket catalogo já utilizado nas fotos do site. Se houver erro de upload, confira se esse bucket existe e se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão corretos no backend.

Abra “Identidade, rodapé e banners do catálogo digital” para configurar:

- Nome e logo próprios, por arquivo, URL ou data:image. Sem logo cadastrada, aparece o nome da loja digital, sem usar a marca do site principal.
- Título e apresentação do catálogo.
- Até 12 banners com ordem, descrição e opção de exibir/ocultar cada banner.
- Rolagem automática ativável, intervalo entre 2 e 30 segundos (padrão: 4). O visitante pode avançar, voltar ou pausar. Quem prefere movimentos reduzidos inicia com a animação pausada.
- Título do rodapé, texto sobre a loja, informações de contato e texto final/direitos autorais, sem herdar dados do catálogo físico.

Clique em “Salvar identidade e banners” após terminar. Este botão salva as configurações da loja; o botão “Salvar produto” salva as fotos e os dados do produto.

## Experiência do visitante

O endereço permanece /digitais. O cabeçalho leva somente ao catálogo digital. O link “Site da gráfica” foi removido. A página da compra também usa a logo e o rodapé próprios. O site principal ainda existe no mesmo domínio e pode ser acessado digitando seu endereço; esta separação remove os atalhos, não cria uma restrição de acesso.

As fotos dos produtos têm miniaturas e podem ser ampliadas com navegação entre imagens. Os banners usam proporção 4:1 no computador e 2:1 no celular: mantenha textos e elementos importantes centralizados para evitar cortes.

## Validação

Build de frontend/backend e TypeScript verificados. Testes automatizados cobrem migração repetível, preservação das capas existentes, ordem/capa da galeria, edição de configurações restrita ao admin, rejeição de URLs inseguras e intervalos inválidos, além das proteções de pagamento da versão anterior.

A inspeção visual em navegador não foi executada neste ambiente. Após publicar, confira uma imagem enviada do computador, uma imagem base64, as miniaturas e a logo/banners no celular. Nenhum pagamento real foi realizado nesta etapa.
