import { useEffect, useState } from 'react';
import { Edit, KeyRound, Trash2, UserCog } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role?: string;
};

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'editar' | 'senha' | null>(null);
  const [selecionado, setSelecionado] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ nome: '', telefone: '', role: 'user', senha: '' });

  async function carregar() {
    setLoading(true);
    try {
      const data = await apiFetch<Usuario[]>('/admin/usuarios');
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function editar(usuario: Usuario) {
    setSelecionado(usuario);
    setForm({
      nome: usuario.nome || '',
      telefone: usuario.telefone || '',
      role: usuario.role || 'user',
      senha: ''
    });
    setModal('editar');
  }

  function senha(usuario: Usuario) {
    setSelecionado(usuario);
    setForm({
      nome: usuario.nome || '',
      telefone: usuario.telefone || '',
      role: usuario.role || 'user',
      senha: ''
    });
    setModal('senha');
  }

  async function salvar() {
    if (!selecionado) return;

    try {
      if (modal === 'editar') {
        await apiFetch('/admin/usuarios/' + selecionado.id, {
          method: 'PUT',
          body: JSON.stringify({
            nome: form.nome,
            telefone: form.telefone,
            role: form.role
          })
        });
      }

      if (modal === 'senha') {
        if (!form.senha || form.senha.length < 6) {
          alert('A senha precisa ter pelo menos 6 caracteres.');
          return;
        }

        await apiFetch('/admin/usuarios/' + selecionado.id + '/redefinir-senha', {
          method: 'PUT',
          body: JSON.stringify({ senha: form.senha })
        });
      }

      setModal(null);
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar usuário.');
    }
  }

  async function excluir(usuario: Usuario) {
    if (!confirm('Deseja excluir este usuário?')) return;

    try {
      await apiFetch('/admin/usuarios/' + usuario.id, { method: 'DELETE' });
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir usuário.');
    }
  }

  return (
    <div className="fade-in">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">
        Gerenciador de Usuários
      </h1>
      <p className="text-gray-500 mb-6">
        Defina permissões: admin, funcionário ou cliente.
      </p>

      {loading ? (
        <div className="card p-4">Carregando usuários...</div>
      ) : (
        <div className="grid gap-4">
          {usuarios.map((u) => (
            <div key={u.id} className="card p-5">
              <div className="grid sm:grid-cols-[1fr_auto] gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                      <UserCog size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary">{u.nome}</h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="badge bg-gold/10 text-gold">{u.role || 'user'}</span>
                    <span className="badge bg-gray-100 text-gray-600">{u.telefone || 'Sem telefone'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button className="btn btn-outline" onClick={() => editar(u)}>
                    <Edit size={16} />
                    Editar
                  </button>
                  <button className="btn btn-outline" onClick={() => senha(u)}>
                    <KeyRound size={16} />
                    Senha
                  </button>
                  <button className="btn bg-red-50 text-red-700" onClick={() => excluir(u)}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && selecionado && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-primary mb-4">
              {modal === 'editar' ? 'Editar usuário' : 'Redefinir senha'}
            </h2>

            {modal === 'editar' ? (
              <div className="space-y-4">
                <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome" />
                <input className="input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="Telefone" />
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">Cliente</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            ) : (
              <input type="password" className="input" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Nova senha" />
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
