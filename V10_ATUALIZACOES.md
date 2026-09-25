# V10 — catálogo e PDV avulso

- Logo enviada aplicada no cabeçalho, rodapé, painel e favicon.
- Card do catálogo sem descrição/compartilhamento; destaque usa estrela e oferta ficou compacta.
- Menu ganhou “Conheça a gráfica”, apontando para `/a-grafica`.
- Banners múltiplos com rolagem automática continuam configuráveis no painel em Configurações.
- Produtos aceitam `categoria_ids` (mantendo `categoria_id` para compatibilidade); execute `database/migrations/014_v10_catalogo.sql`.
- Editor de fotos aceita upload ou URL externa.
- PDV avulso abre por padrão, permite cliente existente, vários itens, duplicação/remoção, totais, desconto, saldo, cópia para clipboard e abertura da impressão.

Após publicar, rode a migration 014 antes de cadastrar produtos com mais de uma categoria.
