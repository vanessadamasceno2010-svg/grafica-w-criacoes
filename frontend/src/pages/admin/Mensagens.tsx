import { useEffect, useMemo, useState } from 'react';
import { Mail, MessageSquare, Phone, Search, Trash2, CheckCircle2, X } from 'lucide-react';
import { apiFetch, formatPhoneDigits, whatsappUrl } from '../../lib/api';

type Mensagem = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  assunto: string;
  mensagem: string;
  respondido?: boolean;
  created_at?: string;
};

export function Mensagens() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Mensagem | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const rows = await apiFetch<Mensagem[]>('/admin/mensagens');
      setMensagens(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mensagens;
    return mensagens.filter((m) => [m.nome, m.email, m.telefone, m.assunto, m.mensagem].join(' ').toLowerCase().includes(q));
  }, [mensagens, search]);

  async function marcarRespondida(msg: Mensagem, respondido = true) {
    try {
      await apiFetch('/admin/mensagens/' + msg.id, {
        method: 'PUT',
        body: JSON.stringify({ respondido })
      });
      setSelected(null);
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar mensagem.');
    }
  }

  async function excluir(msg: Mensagem) {
    try {
      await apiFetch('/admin/mensagens/' + msg.id, { method: 'DELETE' });
      setSelected(null);
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir mensagem.');
    }
  }

  function abrirWhatsApp(msg: Mensagem) {
    const phone = formatPhoneDigits(msg.telefone || '');
    const texto = `Olá ${msg.nome || ''}, recebemos sua mensagem pelo site da Gráfica W Criações e estamos retornando seu contato.`;
    if (phone.length >= 10) {
      window.open(`https://wa.me/55${phone.replace(/^55/, '')}?text=${encodeURIComponent(texto)}`, '_blank');
      return;
    }
    window.open(whatsappUrl(texto), '_blank');
  }

  return (
    <div className="fade-in w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Mensagens do Site</h1>
          <p className="text-gray-500 mt-1">Mensagens enviadas pelo formulário da página inicial/contato.</p>
        </div>
        <div className="card p-3 w-full lg:max-w-md relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input className="input pl-11" placeholder="Buscar por cliente, telefone ou mensagem..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <div className="card p-5">Carregando mensagens...</div>}

      <div className="grid gap-3">
        {!loading && filtradas.length === 0 && (
          <div className="card p-8 text-center text-gray-500">Nenhuma mensagem encontrada.</div>
        )}

        {filtradas.map((msg) => (
          <button key={msg.id} onClick={() => setSelected(msg)} className="card p-5 text-left hover:ring-2 hover:ring-gold/40 transition">
            <div className="grid md:grid-cols-[1fr_auto] gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${msg.respondido ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {msg.respondido ? 'Respondida' : 'Nova mensagem'}
                  </span>
                  <span className="text-xs text-gray-400">{msg.created_at ? new Date(msg.created_at).toLocaleString('pt-BR') : ''}</span>
                </div>
                <h3 className="font-bold text-primary text-lg truncate">{msg.nome || 'Cliente'}</h3>
                <p className="text-sm text-gray-500 truncate">{msg.assunto || 'Sem assunto'}</p>
                <p className="text-gray-600 mt-2 line-clamp-2">{msg.mensagem}</p>
              </div>
              <div className="text-sm text-gray-500 md:text-right">
                <p>{msg.telefone || 'Sem telefone'}</p>
                <p>{msg.email}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[92dvh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-primary">Mensagem de {selected.nome}</h2>
                <p className="text-sm text-gray-500">{selected.created_at ? new Date(selected.created_at).toLocaleString('pt-BR') : ''}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Email</p><p className="font-bold text-primary break-all">{selected.email}</p></div>
                <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Telefone</p><p className="font-bold text-primary">{selected.telefone || '-'}</p></div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Assunto</p><p className="font-bold text-primary">{selected.assunto}</p></div>
              <div className="rounded-2xl bg-gray-50 p-4 whitespace-pre-wrap"><p className="text-xs text-gray-500 mb-1">Mensagem</p>{selected.mensagem}</div>
            </div>

            <div className="p-4 border-t border-gray-100 grid sm:grid-cols-4 gap-2">
              <button className="btn btn-outline" onClick={() => window.open('mailto:' + selected.email, '_blank')}><Mail size={16} />Email</button>
              <button className="btn btn-outline" onClick={() => abrirWhatsApp(selected)}><Phone size={16} />WhatsApp</button>
              <button className="btn btn-outline" onClick={() => marcarRespondida(selected, true)}><CheckCircle2 size={16} />Respondida</button>
              <button className="btn btn-outline text-red-700" onClick={() => excluir(selected)}><Trash2 size={16} />Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
