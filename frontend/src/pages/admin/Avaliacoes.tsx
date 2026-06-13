import { mockProducts } from '../../lib/api';

export function Avaliacoes() {
  const items = mockProducts.slice(0, 5).map((p, i) => ({ produto: p.nome, cliente: `Cliente ${i + 1}`, nota: '★★★★★', comentario: 'Excelente qualidade e atendimento.' }));
  return <div className="fade-in"><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Gerenciador de Avaliações</h1><div className="grid sm:grid-cols-2 gap-4">{items.map((a)=><div className="card p-4" key={a.produto}><p className="text-gold font-bold">{a.nota}</p><h3 className="font-bold text-primary mt-1">{a.produto}</h3><p className="text-sm text-gray-500">{a.cliente}</p><p className="text-gray-700 mt-3">{a.comentario}</p><button className="btn btn-outline w-full mt-4" onClick={()=>alert('Avaliação aberta.')}>Ver avaliação</button></div>)}</div></div>;
}
