export function Relatorios() {
  const cards = ['Vendas por período', 'Produtos mais vendidos', 'Clientes recorrentes', 'Resumo de pedidos'];
  return <div className="fade-in"><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Relatórios</h1><div className="grid sm:grid-cols-2 gap-4">{cards.map((c)=><div className="card p-5" key={c}><h3 className="font-display font-bold text-primary text-xl">{c}</h3><div className="h-44 mt-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 grid place-items-center text-gray-500 font-semibold">Gráfico dinâmico</div></div>)}</div><button className="btn btn-primary mt-5" onClick={()=>alert('Relatório exportado.')}>Exportar relatório</button></div>;
}
