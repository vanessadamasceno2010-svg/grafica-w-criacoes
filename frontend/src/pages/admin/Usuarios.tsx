export function Usuarios() {
  const users = [{nome:'Administrador', email:'admin@graficawcriacoes.com', role:'admin'}, {nome:'Cliente', email:'cliente@email.com', role:'user'}];
  return <div className="fade-in"><h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Gerenciador de Usuários</h1><div className="grid sm:grid-cols-2 gap-4">{users.map((u)=><div className="card p-4" key={u.email}><h3 className="font-bold text-primary">{u.nome}</h3><p className="text-sm text-gray-500">{u.email}</p><span className="badge bg-gold/10 text-gold mt-3">{u.role}</span><button className="btn btn-outline w-full mt-4" onClick={()=>alert('Editar usuário')}>Editar</button></div>)}</div></div>;
}
