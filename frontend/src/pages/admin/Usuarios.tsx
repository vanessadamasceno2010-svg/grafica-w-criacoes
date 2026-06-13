import { useEffect, useState } from 'react';
import { Edit, KeyRound, Trash2 } from 'lucide-react';
import { apiFetch, confirmAction, notifySuccess } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

const permissoesDisponiveis = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'cupons', label: 'Cupons' },
  { key: 'avaliacoes', label: 'Avaliações' },
  { key: 'relatorios', label: 'Relatórios' }
];

export function Usuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [senha, setSenha] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      setUsers(await apiFetch<any[]>('/admin/usuarios'));
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function togglePermissao(key: string) {
    const atual = Array.isArray(editing.funcionario_permissoes) ? editing.funcionario_permissoes : [];
    const next = atual.includes(key) ? atual.filter((p: string) => p !== key) : [...atual, key];
    setEditing({ ...editing, funcionario_permissoes: next });
  }

  async function salvarUsuario() {
    if (!editing) return;
    if (!confirmAction('Confirmar alteração deste usuário?')) return;

    try {
      await apiFetch('/admin/usuarios/' + editing.id, {
        method: 'PUT',
        body: JSON.stringify({
          nome: editing.nome,
          telefone: editing.telefone || '',
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
    if (!confirmAction('Confirmar redefinição de senha?')) return;

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

  async function excluirUsuario(user: any) {
    if (!confirmAction('Deseja excluir este usuário?')) return;

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
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-6">Gerenciador de Usuários</h1>
      {loading && <div className="card p-4 mb-4">Carregando usuários...</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {users.map((u) => (
          <div className="card p-4" key={u.id || u.email}>
            <h3 className="font-bold text-primary">{u.nome}</h3>
            <p className="text-sm text-gray-500">{u.email}</p>
            <p className="text-sm text-gray-500">{u.telefone || 'Sem telefone'}</p>
            <span className="badge bg-gold/10 text-gold mt-3">{u.role}</span>
            {u.role === 'funcionario' && <p className="text-xs text-gray-500 mt-2">Permissões: {(u.funcionario_permissoes || []).join(', ') || 'nenhuma'}</p>}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button className="btn btn-outline" onClick={() => setEditing({ ...u, funcionario_permissoes: Array.isArray(u.funcionario_permissoes) ? u.funcionario_permissoes : [] })}><Edit size={16}/>Editar</button>
              <button className="btn btn-outline" onClick={() => setSenha({ ...u, nova: '' })}><KeyRound size={16}/>Senha</button>
              <button className="btn btn-outline text-red-600" onClick={() => excluirUsuario(u)}><Trash2 size={16}/>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      <BottomSheet isOpen={!!editing} onClose={() => setEditing(null)} title="Editar usuário">
        {editing && <div className="space-y-4">
          <input className="input" placeholder="Nome" value={editing.nome || ''} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
          <input className="input" placeholder="Telefone" value={editing.telefone || ''} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} />
          <select className="input" value={editing.role || 'user'} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
            <option value="user">Cliente</option>
            <option value="funcionario">Funcionário</option>
            <option value="admin">Administrador</option>
            <option value="inactive">Inativo</option>
          </select>

          {editing.role === 'funcionario' && (
            <div className="card p-4 bg-gray-50">
              <h3 className="font-bold text-primary mb-3">Permissões do funcionário</h3>
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

          <button className="btn btn-primary w-full" onClick={salvarUsuario}>Salvar alteração</button>
        </div>}
      </BottomSheet>

      <BottomSheet isOpen={!!senha} onClose={() => setSenha(null)} title="Redefinir senha">
        {senha && <div className="space-y-4">
          <p className="text-sm text-gray-500">Usuário: <b>{senha.nome}</b></p>
          <input type="password" className="input" placeholder="Nova senha" value={senha.nova || ''} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} />
          <button className="btn btn-primary w-full" onClick={redefinirSenha}>Salvar nova senha</button>
        </div>}
      </BottomSheet>
    </div>
  );
}
