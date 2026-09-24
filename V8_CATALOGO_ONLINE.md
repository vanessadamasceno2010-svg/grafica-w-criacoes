# V8 — Catálogo online e pedidos pelo WhatsApp

## Instalação

1. Faça backup do banco e mantenha uma cópia da versão publicada.
2. Em um ambiente de homologação, confirme que as migrações anteriores estão aplicadas. Execute `database/migrations/012_catalogo_pedidos.sql` no SQL Editor do Supabase. Não execute novamente os seeds em uma base existente.
3. A migração cria a função transacional de pedidos, os campos de histórico dos itens, uma chave para evitar duplicatas e o bucket público `catalogo`. Apenas fotos de produtos devem ser enviadas a esse bucket; não envie documentos de clientes.
4. Mantenha no backend as variáveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `JWT_SECRET`. A chave de serviço nunca deve ser configurada no frontend.
5. No frontend, configure `VITE_API_URL` apontando para a URL do backend terminada em `/api`, e `VITE_WHATSAPP_NUMBER` com país e DDD, somente números. Configure `FRONTEND_URL` no backend.
6. Execute `npm ci`, `npm run build` e `npm test`. Publique o backend e depois o frontend nos projetos existentes.
7. Reabra produtos antigos com variações e salve-os pelo painel para garantir IDs persistentes. Carrinhos antigos sem ID da variação devem ter os itens removidos e adicionados novamente.

## O que mudou

- A página inicial abre o catálogo. A Home completa foi preservada em `/a-grafica`, acessível por “Conheça a gráfica”, mantendo banner, orçamento, acompanhamento e demais seções. Busca inclui características das variações, com filtros de material, tamanho e acabamento.
- O catálogo carrega todas as páginas disponíveis, em lotes de 100, corrigindo o limite anterior. Os filtros de características também ficam na URL. A filtragem continua local; para catálogos muito grandes, será necessário mover filtros e paginação da interface para o servidor.
- Fotos gerais e por combinação: upload múltiplo, escolha de capa, remoção da associação e miniaturas. A primeira foto é a capa. Fotos são reduzidas no navegador e armazenadas no Supabase Storage.
- Ao escolher uma combinação, a galeria muda. Se ela não tiver fotos próprias, usa a galeria geral. O carrinho recebe a foto escolhida.
- O pedido público não exige cadastro. O servidor ignora preços enviados pelo navegador e consulta os produtos no banco.
- Pedido e itens são gravados na mesma transação. A chave do checkout evita duplicação nas retentativas da mesma solicitação.
- O pedido preserva nome, foto, características e preço em um snapshot exibido no painel. Mudanças posteriores no produto não alteram esse histórico.
- Produtos são arquivados pela rota de exclusão, preservando itens vendidos.
- Após salvar, o checkout abre a mensagem no WhatsApp; a confirmação mantém um link explícito para reenviar caso a abertura seja bloqueada. O cliente precisa confirmar o envio no aplicativo. O pedido continua registrado se ele não enviar a mensagem.
- O saldo inicial corresponde ao total; pagamento fica pendente. Frete permanece a combinar.

## Cadastro de fotos

Admin → Produtos → editar: use a galeria geral abaixo da imagem principal. Em cada combinação, use “Fotos desta combinação”. Pode enviar até 12 fotos por galeria. Aguarde o envio e salve o produto. “Usar capa” move a foto para o início. Remover uma foto desfaz sua associação; não apaga o arquivo físico do bucket, pois ele pode ser reutilizado.

As fotos são vinculadas à combinação completa nesta versão. Para reutilizar uma galeria entre vários lotes, as mesmas URLs podem permanecer no cadastro ao duplicar uma combinação/produto; não existe ainda um gerenciador independente de galerias compartilhadas por acabamento.

## Validação

Compilação frontend/backend e verificação TypeScript realizadas. Teste PostgreSQL embarcado cobre preço calculado no servidor, saldo, foto da variação, idempotência, rollback, histórico preservado e produto inativo. Execute `npm test` para repetir.

Não houve acesso ao banco publicado nem teste de upload real no seu Supabase. A instalação do navegador de testes falhou neste ambiente, portanto a inspeção visual e a execução completa no navegador precisam ser conferidas na homologação.

Roteiro de homologação: cadastrar duas combinações com fotos diferentes; escolher cada opção no celular; conferir imagem, valor e carrinho; finalizar sem login; conferir pedido e itens no admin; abrir WhatsApp e conferir resumo; repetir envio após falha de rede; testar produto arquivado. Verificar que o bucket e a função foram criados antes de abrir a loja ao público.

## Escopo e limites

O fluxo de pedidos públicos foi atualizado. As rotinas antigas de pedido manual, financeiro e PDV foram preservadas; não representam uma auditoria completa desses módulos. Pedidos antigos não ganham fotos retrospectivamente. A unidade/lote segue o grupo “Quantidade” cadastrado no produto e deve estar explicitamente descrita (por exemplo, “100 unidades por lote”).

Nenhuma alteração foi publicada automaticamente. O ZIP não inclui dependências, builds ou arquivos .env privados; preserve as configurações do seu ambiente.

## Revisão do prompt mestre enviado

Preservados autenticação mobile, Contas a Pagar, Clientes, Orçamentos, PDV, utilitários existentes, opções, geração automática de variações, estoque, prazo, compartilhamento e galeria ampliada. O atalho de pedido rápido agora passa pelo checkout para registrar o pedido antes do WhatsApp. Endpoint `/pedidos/site`, Pix, pagamento 50%/50%, endereço e link de acompanhamento mantidos. Entrega/retirada é registrada em campo próprio.
