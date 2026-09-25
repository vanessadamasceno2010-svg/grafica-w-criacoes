# V9 — Ajustes solicitados no catálogo e PDV

## Entregue

- Número curto de pedido (`WC1001`, por exemplo), usado também no acompanhamento. Números antigos continuam localizáveis pelo alias salvo.
- Mensagem do WhatsApp sem código de acompanhamento separado e sem repetir características técnicas internas.
- Catálogo com duas colunas no celular e cinco no desktop.
- Estrelas e avaliações removidas dos cards e da página do produto.
- Página do produto mais compacta: removidos textos auxiliares, “Preço da opção escolhida”, “Produção sob encomenda”, “Número de conjuntos” e “Opções revisadas”. Restaram apenas Adicionar ao carrinho e Comprar agora.
- Botão Catálogo removido do menu; Início abre o catálogo.
- Botão flutuante do WhatsApp reposicionado para não cobrir a barra Conta/carrinho no celular.
- Filtros de características ficam ocultos até o botão Filtros ser aberto.
- Ordenação padrão por mais vendidos. O ranking é calculado no banco e ignora pedidos cancelados.
- Fotos compartilhadas entre variações com as mesmas características visuais; mudar apenas quantidade não muda a foto. Acabamento, tamanho, material ou modelo diferentes podem ter fotos diferentes.
- Banners promocionais com rolagem automática, pausa, setas, indicadores e configuração no Admin → Configurações. O banner aceita até 10 imagens, link opcional e ativação individual.
- Categorias e barra de acompanhamento compactas.
- PDV com aba Pedido avulso. Todos os campos são opcionais: cliente, WhatsApp, descrição, quantidade, valor unitário, total, desconto, valor pago, data do pedido e data de entrega. O sistema calcula total, pago e restante.
- Impressão de pedidos e avulsos preparada para a Elgin L42 Pro por impressão do navegador, com largura e altura configuráveis. A impressora precisa estar instalada no Windows; a seleção da impressora é feita na janela de impressão.

## Banco de dados

Execute uma única vez, depois da migration 012:

`database/migrations/013_catalogo_pdv.sql`

Ela cria a numeração curta, ranking de vendas, sincronização de fotos por características visuais e a função transacional de pedido avulso. Faça backup antes. A migration é reaplicável nos testes, mas não execute seeds novamente.

## Variáveis e deploy

Nenhuma nova chave secreta foi adicionada. Publique o backend e o frontend juntos depois de executar a migration. Execute:

```bash
npm ci
npm run build
npm test
```

## Elgin L42 Pro

A L42 Pro é compatível com EPL, ZPL, PPLA e PPLB, mas este projeto usa a impressão do navegador para preservar compatibilidade com Vercel e Windows. No computador da gráfica, instale o driver Elgin, configure o tamanho real do rolo/etiqueta e selecione a impressora na janela aberta pelo botão. O site não consegue imprimir silenciosamente pela USB a partir de um navegador comum. Para impressão automática sem diálogo será necessário um aplicativo local/serviço de impressão, etapa separada.

## Validação realizada

- TypeScript frontend: aprovado.
- Build frontend e backend: aprovado.
- Testes PostgreSQL embarcado: aprovados para número curto, alias antigo, migration reaplicável, pedido avulso com campos vazios, desconto, valor pago, saldo, caixa sem duplicidade, fotos por acabamento e ranking.
- A impressão física não foi testada, pois a impressora não está conectada ao ambiente.
