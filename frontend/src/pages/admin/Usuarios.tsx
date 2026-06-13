import { useEffect, useState } from 'react';
import { Edit, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { BottomSheet } from '../../components/BottomSheet';

type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role?: string;
  permissoes?: string[];
};

const permissoesDisponiveis = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'avaliacoes', label: 'Avaliações' },
  { key: 'relatorios', label: 'Relatórios' }
];

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'editar' | 'senha' | null>(null);
  const [selecionado, setSelecionado] = useState<Usuario | null>(null);
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    role: 'user',
    senha: '',
    permissoes: [] as string[]
  });

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

  function abrirEditar(usuario: Usuario) {
    setSelecionado(usuario);
    setForm({
      nome: usuario.nome || '',
      telefone: usuario.telefone || '',
      role: usuario.role || 'user',
      senha: '',
      permissoes: Array.isArray(usuario.permissoes) ? usuario.permissoes : []
    });
    setModal('editar');
  }

  function abrirSenha(usuario: Usuario) {
    setSelecionado(usuario);
    setForm({
      nome: usuario.nome || '',
      telefone: usuario.telefone || '',
      role: usuario.role || 'user',
      senha: '',
      permissoes: Array.isArray(usuario.permissoes) ? usuario.permissoes : []
    });
    setModal('senha');
  }

  function togglePermissao(key: string) {
    setForm((prev) => {
      const exists = prev.permissoes.includes(key);
      return {
        ...prev,
        permissoes: exists ? prev.permissoes.filter((p) => p !== key) : [...prev.permissoes, key]
      };
    });
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
            role: form.role,
            permissoes: form.role === 'funcionario' ? form.permissoes : []
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
      setSelecionado(null);
      await carregar();
      alert('Usuário atualizado com sucesso.');
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
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">Gerenciador de Usuários</h1>
      <p className="text-gray-500 mb-6">Defina função, senha e permissões de funcionários.</p>

      {loading ? (
        <div className="card p-4">Carregando usuários...</div>
      ) : (
        <div className="grid gap-4">
          {usuarios.map((u) => (
            <div className="card p-4" key={u.id}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-primary text-lg">{u.nome}</h3>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <p className="text-sm text-gray-500">{u.telefone || 'Sem telefone'}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="badge bg-gold/10 text-gold">{u.role || 'user'}</span>
                    {u.role === 'funcionario' && (u.permissoes || []).map((p) => (
                      <span key={p} className="badge bg-primary/10 text-primary">{p}</span>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-2">
                  <button className="btn btn-outline" onClick={() => abrirEditar(u)}>
                    <Edit size={16} />
                    Editar
                  </button>
                  <button className="btn btn-outline" onClick={() => abrirSenha(u)}>
                    <KeyRound size={16} />
                    Senha
                  </button>
                  <button className="btn bg-red-50 text-red-700 hover:bg-red-100" onClick={() => excluir(u)}>
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomSheet isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'senha' ? 'Redefinir senha' : 'Editar usuário'}>
        {selecionado && (
          <div className="space-y-4">
            {modal === 'editar' && (
              <>
                <label className="block">
                  <span className="text-sm font-bold text-gray-700">Nome</span>
                  <input className="input mt-1" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-gray-700">Telefone</span>
                  <input className="input mt-1" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-gray-700">Função</span>
                  <select className="input mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="user">Cliente</option>
                    <option value="funcionario">Funcionário</option>
                    <option value="admin">Administrador</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </label>

                {form.role === 'funcionario' && (
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3 font-bold text-primary">
                      <ShieldCheck size={18} />
                      Permissões do funcionário
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {permissoesDisponiveis.map((p) => (
                        <label key={p.key} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3 font-semibold">
                          <input type="checkbox" checked={form.permissoes.includes(p.key)} onChange={() => togglePermissao(p.key)} />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {modal === 'senha' && (
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Nova senha para {selecionado.nome}</span>
                <input type="password" className="input mt-1" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Digite a nova senha" />
              </label>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
