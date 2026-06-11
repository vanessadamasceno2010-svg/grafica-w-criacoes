insert into users(email,nome,telefone,senha,role) values
('admin@graficawcriacoes.com','Administrador','(88) 99624-0470','$2a$12$jbSm.5NPxjeOgtmxI7No1.i8WtCLjOiJzxx.tghPP.OwwFYC4va3K','admin'),
('cliente@email.com','Cliente Premium','(88) 99999-0000','$2a$12$jbSm.5NPxjeOgtmxI7No1.i8WtCLjOiJzxx.tghPP.OwwFYC4va3K','user')
on conflict(email) do nothing;

insert into categorias(nome,descricao,slug,imagem_url,ordem,ativo) values
('Brindes','Chaveiros, lembranças e produtos personalizados.','brindes','/assets/chaveiros-personalizados.jpeg',1,true),
('Papelaria','Cartões, timbrados e materiais corporativos.','papelaria','https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800',2,true),
('Divulgação','Panfletos, folders e materiais promocionais.','divulgacao','https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=800',3,true),
('Comunicação Visual','Banners, placas e impressos de impacto.','comunicacao-visual','https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=800',4,true)
on conflict(slug) do nothing;

insert into produtos(categoria_id,nome,descricao,descricao_longa,preco,preco_original,estoque,imagem_principal,imagens_adicionais,especificacoes,slug,sku,peso,dimensoes,tempo_producao,destaque,ativo)
select c.id,'Chaveiro Personalizado','Chaveiros personalizados com foto, marca, evento ou campanha.','Produto pequeno por fora e gigante na divulgação. Impressão de alta definição com acabamento resistente para lembranças, escolas, eventos, campanhas e brindes.',40.00,60.00,500,'/assets/chaveiros-personalizados.jpeg','["/assets/chaveiros-personalizados.jpeg","/assets/logo-wide.jpeg"]','{"Quantidade":["5 unidades","10 unidades","30 unidades","50 unidades","100 unidades","500 unidades","1000 unidades"],"Modelo":["Frente única","Dupla face","Com abridor"],"Acabamento":["Azul premium","Transparente","Personalizado"]}','chaveiro-personalizado','CHV-001',0.1,'{"largura":5,"altura":5}',3,true,true from categorias c where c.slug='brindes'
on conflict(slug) do nothing;

insert into produtos(categoria_id,nome,descricao,descricao_longa,preco,preco_original,estoque,imagem_principal,imagens_adicionais,especificacoes,slug,sku,peso,dimensoes,tempo_producao,destaque,ativo)
select c.id,'Cartão de Visita Premium','Impressão frente e verso com acabamento refinado.','Papel couchê 300g, laminação fosca e opção de verniz localizado.',89.90,119.90,500,'https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=1200','[]','{"Quantidade":["100","250","500","1000"],"Acabamento":["Fosco","Brilho","Verniz localizado"]}','cartao-visita-premium','CVP-001',0.2,'{"largura":9,"altura":5}',3,true,true from categorias c where c.slug='papelaria'
on conflict(slug) do nothing;

insert into produtos(categoria_id,nome,descricao,descricao_longa,preco,estoque,imagem_principal,imagens_adicionais,especificacoes,slug,sku,peso,dimensoes,tempo_producao,destaque,ativo)
select c.id,'Banner Lona 440g','Banner resistente com impressão em alta definição.','Lona de alta qualidade com ilhós ou bastão para eventos e fachadas.',69.90,200,'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1200','[]','{"Tamanho":["60x90","80x120","100x150"],"Acabamento":["Bastão","Ilhós"]}','banner-lona-440g','BAN-001',0.8,'{"largura":60,"altura":90}',2,true,true from categorias c where c.slug='comunicacao-visual'
on conflict(slug) do nothing;

insert into configuracoes_site(chave,valor,tipo) values
('nome_empresa','Gráfica W Criações','texto'),
('email_contato','contato@graficawcriacoes.com','texto'),
('telefone','(88) 99624-0470','texto'),
('whatsapp','5588996240470','texto'),
('taxa_frete_padrao','0','numero'),
('tempo_producao_padrao','5','numero'),
('horario_funcionamento','Segunda a sexta, 8h às 18h','texto'),
('modo_checkout','whatsapp','texto')
on conflict(chave) do update set valor=excluded.valor,tipo=excluded.tipo;

insert into cupons_desconto(codigo,descricao,tipo,valor,uso_maximo,data_inicio,data_fim,ativo) values
('PRIMEIRA10','Desconto para primeira compra','percentual',10,500,now()-interval '1 day',now()+interval '1 year',true)
on conflict(codigo) do nothing;
