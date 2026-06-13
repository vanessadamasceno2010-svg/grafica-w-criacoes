import { useEffect, useState } from 'react';
import { Edit, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';

type Cliente = { id: string; nome: string; email: string; telefone?: string; role?: string; total_gasto?: number; pedidos?: number };

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'novo' | 'editar' | 'senha' | null>(null);
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' });

  async function carregar() {
    setLoading(true);
    try {
      const data = await apiFetch<Cliente[]>('/admin/clientes');
      setClientes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setSelecionado(null);
    setForm({ nome: '', email: '', telefone: '', senha: '' });
    setModal('novo');
  }

  function abrirEditar(cliente: Cliente) {
    setSelecionado(cliente);
    setForm({ nome: cliente.nome || '', email: cliente.email || '', telefone: cliente.telefone || '', senha: '' });
    setModal('editar');
  }

  function abrirSenha(cliente: Cliente) {
    setSelecionado(cliente);
    setForm({ nome: cliente.nome || '', email: cliente.email || '', telefone: cliente.telefone || '', senha: '' });
    setModal('senha');
  }

  async function salvar() {
    try {
      if (modal === 'novo') {
        await apiFetch('/admin/clientes', {
          method: 'POST',
          body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone, senha: form.senha || '12345678', role: 'user' })
        });
      }
      if (modal === 'editar' && selecionado) {
        await apiFetch('/admin/clientes/' + selecionado.id, {
          method: 'PUT',
          body: JSON.stringify({ nome: form.nome, email: form.email, telefone: form.telefone })
        });
      }
      if (modal === 'senha' && selecionado) {
        if (!form.senha || form.senha.length < 6) return alert('A nova senha precisa ter pelo menos 6 caracteres.');
        await apiFetch('/admin/clientes/' + selecionado.id + '/redefinir-senha', {
          method: 'PUT',
          body: JSON.stringify({ senha: form.senha })
        });
      }
      setModal(null);
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar.');
    }
  }

  async function deletar(cliente: Cliente) {
    if (!confirm('Deseja excluir este cliente?')) return;
    try {
      await apiFetch('/admin/clientes/' + cliente.id, { method: 'DELETE' });
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir cliente.');
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Clientes</h1>
          <p className="text-slate-500">Cadastro, email de login e redefinição de senha.</p>
        </div>
        <button onClick={abrirNovo} className="h-12 px-5 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2"><UserPlus size={18} />Novo Cliente</button>
      </div>

      {loading ? <div className="bg-white rounded-3xl p-6 shadow-sm">Carregando clientes...</div> : (
        <div className="grid gap-4">
          {clientes.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <div className="grid md:grid-cols-[1fr_auto] gap-4">
                <div>
                  <h3 className="font-black text-lg text-slate-950">{cliente.nome}</h3>
                  <p className="text-slate-600">{cliente.email}</p>
                  <p className="text-slate-500">{cliente.telefone || 'Sem telefone'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <span className="px-3 py-1 rounded-full bg-slate-100 font-bold">Perfil: {cliente.role || 'user'}</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">Total: {formatMoney(cliente.total_gasto || 0)}</span>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">Pedidos: {cliente.pedidos || 0}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button onClick={() => abrirEditar(cliente)} className="h-11 px-4 rounded-xl bg-slate-100 font-bold flex items-center justify-center gap-2"><Edit size={16} />Editar</button>
                  <button onClick={() => abrirSenha(cliente)} className="h-11 px-4 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center gap-2"><KeyRound size={16} />Senha</button>
                  <button onClick={() => deletar(cliente)} className="h-11 px-4 rounded-xl bg-red-50 text-red-700 font-bold flex items-center justify-center gap-2"><Trash2 size={16} />Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end md:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
            <h2 className="text-2xl font-black mb-4">{modal === 'novo' ? 'Novo Cliente' : modal === 'editar' ? 'Editar Cliente' : 'Redefinir Senha'}</h2>
            {modal !== 'senha' && (
              <>
                <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Nome</span><input className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
                <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Email para login</span><input type="email" className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Telefone</span><input className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
              </>
            )}
            {modal === 'novo' && <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Senha inicial</span><input type="password" className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Opcional: padrão 12345678" /></label>}
            {modal === 'senha' && <label className="block mb-3"><span className="text-sm font-bold text-slate-700">Nova senha para {selecionado?.nome}</span><input type="password" className="mt-1 w-full h-12 rounded-2xl border px-4" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Digite a nova senha" /></label>}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setModal(null)} className="h-12 rounded-2xl bg-slate-100 font-black">Cancelar</button>
              <button onClick={salvar} className="h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;
