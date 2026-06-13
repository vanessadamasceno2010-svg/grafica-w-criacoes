import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { apiFetch, setAuthSession } from '../lib/api';
import { useApp } from '../contexts/AppContext';

export function Login() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [mode, setMode] = useState<'login' | 'cadastro'>('login');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', senha: '' });

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function goByRole(user: any) {
    const role = String(user?.role || 'user').toLowerCase();
    if (role === 'admin') return navigate('/admin');
    if (role === 'funcionario' || role === 'employee' || role === 'staff') return navigate('/admin/pedidos');
    return navigate('/minha-conta');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const payload = mode === 'login'
        ? { email: form.email.trim().toLowerCase(), senha: form.senha }
        : { nome: form.nome.trim(), telefone: form.telefone.trim(), email: form.email.trim().toLowerCase(), senha: form.senha };
      const data = await apiFetch<any>(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAuthSession(data.token, data.user);
      setUser(data.user);
      goByRole(data.user);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível acessar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900">
            {mode === 'login' ? <ShieldCheck size={28} /> : <UserPlus size={28} />}
          </div>
        </div>
        <h1 className="text-3xl font-black text-center text-slate-950">{mode === 'login' ? 'Acessar Conta' : 'Criar Conta'}</h1>
        <p className="text-center text-slate-500 mt-2 mb-6">Login único para cliente, funcionário e administrador.</p>

        <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-2xl p-1 mb-6">
          <button type="button" onClick={() => setMode('login')} className={'h-11 rounded-xl font-bold ' + (mode === 'login' ? 'bg-white shadow text-slate-950' : 'text-slate-500')}>Entrar</button>
          <button type="button" onClick={() => setMode('cadastro')} className={'h-11 rounded-xl font-bold ' + (mode === 'cadastro' ? 'bg-white shadow text-slate-950' : 'text-slate-500')}>Cadastrar</button>
        </div>

        {mode === 'cadastro' && (
          <>
            <label className="block mb-4">
              <span className="block text-sm font-bold text-slate-700 mb-2">Nome completo</span>
              <input className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-4 focus:ring-amber-100" value={form.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Seu nome" required />
            </label>
            <label className="block mb-4">
              <span className="block text-sm font-bold text-slate-700 mb-2">Telefone / WhatsApp</span>
              <input className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-4 focus:ring-amber-100" value={form.telefone} onChange={(e) => setField('telefone', e.target.value)} placeholder="(88) 99999-0000" required />
            </label>
          </>
        )}

        <label className="block mb-4">
          <span className="block text-sm font-bold text-slate-700 mb-2">Email</span>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" className="w-full h-12 rounded-2xl border border-slate-200 pl-12 pr-4 outline-none focus:ring-4 focus:ring-amber-100" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="seuemail@email.com" required />
          </div>
        </label>

        <label className="block mb-5">
          <span className="block text-sm font-bold text-slate-700 mb-2">Senha</span>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="password" className="w-full h-12 rounded-2xl border border-slate-200 pl-12 pr-4 outline-none focus:ring-4 focus:ring-amber-100" value={form.senha} onChange={(e) => setField('senha', e.target.value)} placeholder="Digite sua senha" required minLength={6} />
          </div>
        </label>

        {erro && <div className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-700 p-4 font-semibold">{erro}</div>}
        <button type="submit" disabled={loading} className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black transition disabled:opacity-60">
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </main>
  );
}
