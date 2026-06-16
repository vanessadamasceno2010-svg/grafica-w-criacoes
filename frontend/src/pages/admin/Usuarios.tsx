import { useEffect, useState } from 'react';
import { Edit, KeyRound, Trash2, X, ShieldCheck } from 'lucide-react';
import { apiFetch, formatPhoneDigits, notifySuccess } from '../../lib/api';

const permissoesDisponiveis = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'orcamentos', label: 'Orçamentos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'cupons', label: 'Cupons' },
  { key: 'mensagens', label: 'Mensagens' },
  { key: 'relatorios', label: 'Relatórios' }
];

type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: string;
  funcionario_permissoes?: string[];
};

export function Usuarios() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [senha, setSenha] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<Usuario[]>('/admin/usuarios');
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function abrirEdicao(user: Usuario) {
    setEditing({
      ...user,
      telefone: formatPhoneDigits(user.telefone || ''),
      funcionario_permissoes: Array.isArray(user.funcionario_permissoes) ? user.funcionario_permissoes : []
    });
  }

  function togglePermissao(key: string) {
    if (!editing) return;
    const atual = Array.isArray(editing.funcionario_permissoes) ? editing.funcionario_permissoes : [];
    const next = atual.includes(key) ? atual.filter((p) => p !== key) : [...atual, key];
    setEditing({ ...editing, funcionario_permissoes: next });
  }

  async function salvarUsuario() {
    if (!editing) return;
    if (!editing.nome.trim()) return alert('Informe o nome do usuário.');

    try {
      await apiFetch('/admin/usuarios/' + editing.id, {
        method: 'PUT',
        body: JSON.stringify({
          nome: editing.nome,
          telefone: formatPhoneDigits(editing.telefone || ''),
          role: editing.role,
          funcionario_permissoes: editing.role === 'funcionario' ? editing.funcionario_permissoes || [] : []
        })
      });
      setEditing(null);
      await load();
      notifySuccess('Usuário atualizado com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar usuário.');
    }
  }

  async function redefinirSenha() {
    if (!senha?.id) return;
    if (!senha.nova || senha.nova.length < 6) return alert('A senha precisa ter pelo menos 6 caracteres.');

    try {
      await apiFetch('/admin/usuarios/' + senha.id + '/redefinir-senha', {
        method: 'PUT',
        body: JSON.stringify({ senha: senha.nova })
      });
      setSenha(null);
      notifySuccess('Senha atualizada com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao redefinir senha.');
    }
  }

  async function excluirUsuario(user: Usuario) {
    try {
      await apiFetch('/admin/usuarios/' + user.id, { method: 'DELETE' });
      await load();
      notifySuccess('Usuário excluído com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuário.');
    }
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Gerenciador de Usuários</h1>
        <p className="text-gray-500 mt-1">Edite função, telefone e permissões do funcionário.</p>
      </div>

      {loading && <div className="card p-4 mb-4">Carregando usuários...</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {users.map((u) => (
          <div className="card p-4" key={u.id || u.email}>
            <h3 className="font-bold text-primary">{u.nome}</h3>
            <p className="text-sm text-gray-500 break-all">{u.email}</p>
            <p className="text-sm text-gray-500">{u.telefone || 'Sem telefone'}</p>
            <span className="badge bg-gold/10 text-gold mt-3">{u.role}</span>
            {u.role === 'funcionario' && (
              <p className="text-xs text-gray-500 mt-2">Permissões: {(u.funcionario_permissoes || []).join(', ') || 'nenhuma'}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              <button className="btn btn-outline" onClick={() => abrirEdicao(u)}><Edit size={16} />Editar</button>
              <button className="btn btn-outline" onClick={() => setSenha({ ...u, nova: '' })}><KeyRound size={16} />Senha</button>
              <button className="btn btn-outline text-red-600" onClick={() => excluirUsuario(u)}><Trash2 size={16} />Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[92dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-primary">Editar usuário</h2>
                <p className="text-sm text-gray-500 break-all">{editing.email}</p>
              </div>
              <button onClick={() => setEditing(null)} className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-primary">Nome</span>
                <input className="input mt-1" placeholder="Nome" value={editing.nome || ''} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary">Telefone completo</span>
                <input className="input mt-1" inputMode="numeric" placeholder="Somente números. Ex: 5588996240470" value={editing.telefone || ''} onChange={(e) => setEditing({ ...editing, telefone: formatPhoneDigits(e.target.value) })} />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-primary">Função</span>
                <select className="input mt-1" value={editing.role || 'user'} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  <option value="user">Cliente</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>

              {editing.role === 'funcionario' && (
                <div className="card p-4 bg-gray-50 shadow-none">
                  <h3 className="font-bold text-primary mb-3 flex items-center gap-2"><ShieldCheck size={18} />Permissões do funcionário</h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {permissoesDisponiveis.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 bg-white rounded-xl p-3 border border-gray-100">
                        <input type="checkbox" checked={(editing.funcionario_permissoes || []).includes(p.key)} onChange={() => togglePermissao(p.key)} />
                        <span className="font-semibold text-sm">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3">
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarUsuario}>Salvar alteração</button>
            </div>
          </div>
        </div>
      )}

      {senha && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-primary">Redefinir senha</h2>
                <p className="text-sm text-gray-500">Usuário: <b>{senha.nome}</b></p>
              </div>
              <button onClick={() => setSenha(null)} className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center"><X size={20} /></button>
            </div>
            <input type="password" className="input" placeholder="Nova senha" value={senha.nova || ''} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} />
            <button className="btn btn-primary w-full mt-4" onClick={redefinirSenha}>Salvar nova senha</button>
          </div>
        </div>
      )}
    </div>
  );
}
