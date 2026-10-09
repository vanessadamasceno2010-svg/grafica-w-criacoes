# Atualização — Pix, histórico por CPF e entrega digital

## O que mudou

- O checkout UvviPay confirma o registro salvo antes de responder e o QR/Pix Copia e Cola aparece já na primeira geração.
- A tela da compra aproveita a resposta do checkout imediatamente, sem esperar um segundo clique.
- O CPF/CNPJ usado no pagamento é armazenado somente como hash.
- O catálogo digital ganhou **Acessar minhas compras**. O cliente informa o CPF/CNPJ, vê as compras pagas e solicita o download de cada arquivo. O endereço do arquivo não é exposto na listagem.
- Após a confirmação, a página mostra uma tela animada de parabéns com botão de download em destaque.

## Publicação

1. Execute `database/migrations/017_digital_uvvipay.sql` no Supabase (a migration é idempotente e adiciona o índice do hash do documento).
2. Publique o backend e o frontend com os arquivos desta atualização.
3. Faça um pagamento UvviPay de teste e confirme: QR na primeira tentativa, consulta por CPF/CNPJ e tela de download após o webhook/consulta de status.

Compras antigas feitas antes desta migration não aparecem na consulta por CPF/CNPJ porque ainda não possuem o hash do documento; os links originais continuam funcionando.
