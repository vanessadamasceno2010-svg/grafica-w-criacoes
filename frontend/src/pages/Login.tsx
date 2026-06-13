import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { apiFetch, setAuthSession } from '../lib/api';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { setUser } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = mode === 'register'
        ? { nome, email, telefone, senha: password }
        : { email, senha: password };

      const result = await apiFetch<{ user: any; token: string }>(
        mode === 'register' ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      setAuthSession(result.token, result.user);
      setUser(result.user);
      navigate(result.user.role === 'admin' || isAdmin ? '/admin' : '/minha-conta');
    } catch (err: any) {
      setError(err.message || 'Não foi possível entrar. Confira email e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in max-w-md mx-auto px-4 py-12">
      <div className="card p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">Acessar Conta</h1>
          <p className="text-gray-500 mt-2">Entre com seu cadastro real do sistema</p>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>Entrar</button>
          <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${mode === 'register' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>Cadastrar</button>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
          <button type="button" onClick={() => setIsAdmin(false)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${!isAdmin ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
            <User size={16} className="inline mr-2" />Cliente
          </button>
          <button type="button" onClick={() => setIsAdmin(true)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${isAdmin ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
            <ShieldCheck size={16} className="inline mr-2" />Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome</label>
                <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone</label>
                <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(88) 99999-9999" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-11" placeholder="seu@email.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-11" placeholder="Mínimo 8 caracteres" />
            </div>
          </div>

          {error && <div className="rounded-xl bg-red-50 text-red-700 font-semibold p-3 text-sm">{error}</div>}

          <button type="submit" disabled={isLoading} className="btn btn-primary w-full text-base disabled:opacity-70">
            {isLoading ? 'Aguarde...' : <>{mode === 'register' ? 'Criar conta' : 'Entrar'}<ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Para acessar o painel, use um usuário com role <b>admin</b> no Supabase.
        </p>
      </div>
    </div>
  );
}
