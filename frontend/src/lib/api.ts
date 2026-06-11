export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
export const WHATSAPP_NUMBER = '5588996240470';
export const BRAND = { name: 'Gráfica W Criações', phone: '(88) 99624-0470', whatsapp: '88 99624-0470' };

export type Product = {
  id:string; nome:string; slug:string; descricao:string; descricao_longa?:string; preco:number; preco_original?:number;
  estoque:number; imagem_principal:string; imagens_adicionais?:string[]; especificacoes?:Record<string, string[]>;
  destaque?:boolean; tempo_producao:number; categoria_nome?:string; avaliacao_media?:number; avaliacoes_total?:number
};
export type Category = { id:string; nome:string; slug:string; descricao:string; imagem_url:string };
export type CartItem = { id:string; produto_id:string; nome:string; slug:string; imagem_principal:string; quantidade:number; preco_unitario:number; especificacoes_selecionadas:Record<string,string> };
export type CustomerData = { nome:string; telefone:string; email:string; endereco:string; observacoes:string };
export type LocalOrder = { numero:string; items:CartItem[]; cliente:CustomerData; subtotal:number; frete:number; desconto:number; total:number; created_at:string };

export const formatMoney = (v:number|string) => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function token(){return localStorage.getItem('gp_token')||''}
export async function api<T>(path:string, options:RequestInit={}){
  const res=await fetch(`${API_URL}${path}`,{...options,headers:{'Content-Type':'application/json',...(token()?{Authorization:`Bearer ${token()}`}:{}) ,...(options.headers||{})}});
  const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.message||'Erro na requisição'); return data as T;
}
export function createWhatsAppOrderMessage(order: LocalOrder){
  const linhas = order.items.map((i,idx)=>{
    const specs = Object.entries(i.especificacoes_selecionadas).map(([k,v])=>`${k}: ${v}`).join(' | ');
    return `${idx+1}. ${i.quantidade}x ${i.nome}${specs ? ` (${specs})` : ''} - ${formatMoney(i.preco_unitario*i.quantidade)}`;
  }).join('\n');
  return `Olá, quero finalizar meu pedido na ${BRAND.name}.\n\nPedido: ${order.numero}\nCliente: ${order.cliente.nome}\nTelefone: ${order.cliente.telefone}\nEmail: ${order.cliente.email || 'não informado'}\nEndereço/retirada: ${order.cliente.endereco}\n\nItens:\n${linhas}\n\nSubtotal: ${formatMoney(order.subtotal)}\nFrete: ${formatMoney(order.frete)}\nDesconto: ${formatMoney(order.desconto)}\nTotal: ${formatMoney(order.total)}\n\nObservações: ${order.cliente.observacoes || 'sem observações'}\n\nAguardo confirmação pelo WhatsApp.`;
}
export function whatsappUrl(message:string){ return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`; }

export const mockProducts: Product[] = [
  {id:'1',nome:'Chaveiro Personalizado',slug:'chaveiro-personalizado',descricao:'Chaveiros personalizados com foto, marca, evento ou campanha.',descricao_longa:'Pequeno por fora, gigante na divulgação. Chaveiro personalizado com impressão de alta definição, acabamento resistente e visual profissional para lembranças, eventos, escolas, campanhas, brindes e divulgação de marcas.',preco:40,preco_original:60,estoque:500,imagem_principal:'/assets/chaveiros-personalizados.jpeg',imagens_adicionais:['/assets/chaveiros-personalizados.jpeg','/assets/logo-wide.jpeg'],tempo_producao:3,destaque:true,categoria_nome:'Brindes',avaliacao_media:5,avaliacoes_total:48,especificacoes:{Quantidade:['5 unidades','10 unidades','30 unidades','50 unidades','100 unidades','500 unidades','1000 unidades'],Modelo:['Frente única','Dupla face','Com abridor'],Acabamento:['Azul premium','Transparente','Personalizado']}},
  {id:'2',nome:'Cartão de Visita Premium',slug:'cartao-visita-premium',descricao:'Impressão frente e verso com acabamento refinado.',descricao_longa:'Cartão de visita em papel couchê 300g com laminação fosca, brilho ou verniz localizado.',preco:89.9,preco_original:119.9,estoque:500,imagem_principal:'https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=1200',tempo_producao:3,destaque:true,categoria_nome:'Papelaria',avaliacao_media:4.8,avaliacoes_total:32,especificacoes:{Quantidade:['100','250','500','1000'],Acabamento:['Fosco','Brilho','Verniz localizado']}},
  {id:'3',nome:'Panfleto Couchê Colorido',slug:'panfleto-couche-colorido',descricao:'Ideal para campanhas, eventos e divulgação local.',preco:149.9,estoque:1000,imagem_principal:'https://images.unsplash.com/photo-1598188306155-25e400eb5078?q=80&w=1200',tempo_producao:4,destaque:true,categoria_nome:'Divulgação',avaliacao_media:4.7,avaliacoes_total:21,especificacoes:{Tamanho:['A5','A4','10x15'],Papel:['90g','115g','150g']}},
  {id:'4',nome:'Banner Lona 440g',slug:'banner-lona-440g',descricao:'Banner resistente com impressão em alta definição.',preco:69.9,estoque:200,imagem_principal:'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1200',tempo_producao:2,destaque:true,categoria_nome:'Comunicação Visual',avaliacao_media:4.9,avaliacoes_total:18,especificacoes:{Tamanho:['60x90','80x120','100x150'],Acabamento:['Bastão','Ilhós']}},
  {id:'5',nome:'Adesivo Personalizado',slug:'adesivo-personalizado',descricao:'Adesivos para embalagens, brindes e marcas.',preco:45,estoque:900,imagem_principal:'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?q=80&w=1200',tempo_producao:3,categoria_nome:'Adesivos',avaliacao_media:4.6,avaliacoes_total:14,especificacoes:{Formato:['Redondo','Quadrado','Especial'],Quantidade:['50','100','250']}},
  {id:'6',nome:'Sacola Personalizada',slug:'sacola-personalizada',descricao:'Sacolas premium para lojas, eventos e presentes.',preco:239.9,estoque:100,imagem_principal:'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=1200',tempo_producao:7,categoria_nome:'Embalagens',avaliacao_media:5,avaliacoes_total:9,especificacoes:{Material:['Kraft','Branco','Duplex'],Quantidade:['50','100','250']}}
];
export const mockCategories: Category[] = [
  {id:'1',nome:'Brindes',slug:'brindes',descricao:'Chaveiros, lembranças e produtos personalizados.',imagem_url:'/assets/chaveiros-personalizados.jpeg'},
  {id:'2',nome:'Papelaria',slug:'papelaria',descricao:'Cartões, timbrados e materiais corporativos.',imagem_url:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800'},
  {id:'3',nome:'Divulgação',slug:'divulgacao',descricao:'Panfletos, folders e impressos promocionais.',imagem_url:'https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=800'},
  {id:'4',nome:'Comunicação Visual',slug:'comunicacao-visual',descricao:'Banners, placas e materiais de impacto.',imagem_url:'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=800'}
];
