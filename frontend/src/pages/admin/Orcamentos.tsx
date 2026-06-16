import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, Send, Copy, CheckCircle2, ShoppingCart, Trash2, X } from 'lucide-react';
import { apiFetch, formatMoney } from '../../lib/api';

type Cliente = {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
};

type Orcamento = {
  id: string;
  numero_orcamento: string;
  usuario_id?: string | null;
  cliente_nome: string;
  cliente_email?: string;
  cliente_telefone?: string;
  descricao: string;
  valor_total: number;
  validade?: string | null;
  status: string;
  observacoes?: string;
  virou_pedido?: boolean;
  pedido_id?: string | null;
  created_at?: string;
};

type FormState = {
  usuario_id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  descricao: string;
  valor_total: string;
  validade: string;
  status: string;
  observacoes: string;
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  vencido: 'Vencido'
};

function emptyForm(): FormState {
  return {
    usuario_id: '',
    cliente_nome: '',
    cliente_email: '',
    cliente_telefone: '',
    descricao: '',
    valor_total: '',
    validade: '',
    status: 'rascunho',
    observacoes: ''
  };
}

function moneyToNumber(value: any) {
  const normalized = String(value || '0')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return Number(normalized) || 0;
}

function dateOnly(value: any) {
  return value ? String(value).slice(0, 10) : '';
}

function buildShareMessage(orcamento: Orcamento) {
  const numero = orcamento.numero_orcamento || orcamento.id;
  const validade = orcamento.validade ? new Date(orcamento.validade).toLocaleDateString('pt-BR') : 'A combinar';

  return [
    `*Orçamento número:* ${numero}`,
    '',
    `*Cliente:* ${orcamento.cliente_nome || 'Cliente'}`,
    '',
    '*Descrição:*',
    String(orcamento.descricao || '').trim(),
    '',
    `*Valor total:* ${formatMoney(orcamento.valor_total || 0)}`,
    `*Validade do orçamento:* ${validade}`,
    '',
    '*Forma de pagamento:*',
    '50% Pedido e 50% Entrega',
    '',
    '*Chave Pix:*',
    'wcriacoesgrafica@gmail.com',
    '',
    'Após a confirmação, seguiremos com a criação dos layouts e enviaremos para aprovação antes de iniciar a produção dos materiais.',
    '',
    'Qualquer dúvida, estamos à disposição.'
  ].join('\n');
}

export function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Orcamento | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [share, setShare] = useState<{ orcamento: Orcamento; texto: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [orcRows, cliRows] = await Promise.all([
        apiFetch<Orcamento[]>('/admin/orcamentos'),
        apiFetch<Cliente[]>('/admin/clientes').catch(() => [])
      ]);
      setOrcamentos(Array.isArray(orcRows) ? orcRows : []);
      setClientes(Array.isArray(cliRows) ? cliRows : []);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar orçamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orcamentos.filter((orc) => {
      const text = [orc.numero_orcamento, orc.cliente_nome, orc.cliente_email, orc.cliente_telefone, orc.descricao]
        .join(' ')
        .toLowerCase();
      return text.includes(q) && (status === 'todos' || orc.status === status);
    });
  }, [orcamentos, search, status]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setModal(true);
  }

  function openEdit(orc: Orcamento) {
    setEditing(orc);
    setForm({
      usuario_id: orc.usuario_id || '',
      cliente_nome: orc.cliente_nome || '',
      cliente_email: orc.cliente_email || '',
      cliente_telefone: orc.cliente_telefone || '',
      descricao: orc.descricao || '',
      valor_total: String(orc.valor_total || ''),
      validade: dateOnly(orc.validade),
      status: orc.status || 'rascunho',
      observacoes: orc.observacoes || ''
    });
    setModal(true);
  }

  function chooseClient(id: string) {
    const c = clientes.find((item) => item.id === id);
    if (!c) {
      setForm({ ...form, usuario_id: '', cliente_nome: '', cliente_email: '', cliente_telefone: '' });
      return;
    }
    setForm({
      ...form,
      usuario_id: c.id,
      cliente_nome: c.nome || '',
      cliente_email: c.email || '',
      cliente_telefone: c.telefone || ''
    });
  }

  async function save() {
    if (!form.cliente_nome.trim()) return alert('Informe o nome do cliente.');
    if (!form.descricao.trim()) return alert('Informe a descrição do orçamento.');

    const payload = {
      usuario_id: form.usuario_id || null,
      cliente_nome: form.cliente_nome,
      cliente_email: form.cliente_email,
      cliente_telefone: form.cliente_telefone,
      descricao: form.descricao,
      valor_total: moneyToNumber(form.valor_total),
      validade: form.validade || null,
      status: form.status,
      observacoes: form.observacoes
    };

    try {
      if (editing) {
        await apiFetch('/admin/orcamentos/' + editing.id, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/admin/orcamentos', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setModal(false);
      await load();
      alert('Orçamento salvo com sucesso.');
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar orçamento.');
    }
  }

  async function remove(orc: Orcamento) {
    if (!confirm('Deseja excluir este orçamento?')) return;
    try {
      await apiFetch('/admin/orcamentos/' + orc.id, { method: 'DELETE' });
      await load();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir orçamento.');
    }
  }

  async function virarPedido(orc: Orcamento) {
    if (!confirm('Transformar este orçamento em pedido?')) return;
    try {
      const pedido = await apiFetch<any>('/admin/orcamentos/' + orc.id + '/virar-pedido', { method: 'POST' });
      await load();
      alert('Pedido criado com sucesso: ' + (pedido?.numero_pedido || '')); 
    } catch (error: any) {
      alert(error.message || 'Erro ao transformar orçamento em pedido.');
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Texto copiado.');
    } catch {
      alert('Não foi possível copiar automaticamente.');
    }
  }

  function sendWhatsApp(text: string, phone?: string) {
    const clean = String(phone || '').replace(/\D/g, '');
    const url = clean
      ? 'https://wa.me/55' + clean.replace(/^55/, '') + '?text=' + encodeURIComponent(text)
      : 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-950 flex items-center gap-2">
            <ClipboardList size={28} /> Orçamentos
          </h1>
          <p className="text-slate-500">Crie, compartilhe e transforme orçamentos em pedidos.</p>
        </div>
        <button onClick={openNew} className="h-12 px-5 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2">
          <Plus size={18} /> Novo Orçamento
        </button>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 mb-5 grid md:grid-cols-[1fr_220px] gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-11"
            placeholder="Buscar por cliente, número ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm">Carregando orçamentos...</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((orc) => (
            <button key={orc.id} onClick={() => openEdit(orc)} className="text-left bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:ring-2 hover:ring-amber-300 transition">
              <div className="grid lg:grid-cols-[1fr_160px_160px_auto] gap-4 items-center">
                <div>
                  <p className="font-black text-slate-950">{orc.numero_orcamento}</p>
                  <p className="text-slate-700 font-bold">{orc.cliente_nome}</p>
                  <p className="text-slate-500 text-sm line-clamp-2">{orc.descricao}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valor</p>
                  <p className="font-black text-slate-950">{formatMoney(orc.valor_total || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className="inline-flex px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-sm">
                    {statusLabels[orc.status] || orc.status}
                  </span>
                  {orc.virou_pedido && <p className="text-xs text-emerald-700 font-bold mt-1">Virou pedido</p>}
                </div>
                <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-2" onClick={(e) => e.stopPropagation()}>
                  <button className="h-11 px-3 rounded-xl bg-slate-100 font-bold flex items-center justify-center gap-2" onClick={() => setShare({ orcamento: orc, texto: buildShareMessage(orc) })}><Send size={16} /> Enviar</button>
                  <button className="h-11 px-3 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center gap-2" onClick={() => copyText(buildShareMessage(orc))}><Copy size={16} /> Copiar</button>
                  <button className="h-11 px-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center gap-2" onClick={() => virarPedido(orc)} disabled={orc.virou_pedido}><ShoppingCart size={16} /> Pedido</button>
                  <button className="h-11 px-3 rounded-xl bg-red-50 text-red-700 font-bold flex items-center justify-center gap-2" onClick={() => remove(orc)}><Trash2 size={16} /></button>
                </div>
              </div>
            </button>
          ))}

          {filtered.length === 0 && <div className="bg-white rounded-3xl p-6 shadow-sm text-slate-500">Nenhum orçamento encontrado.</div>}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-3xl max-h-[92dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{editing ? 'Editar orçamento' : 'Novo orçamento'}</h2>
                <p className="text-slate-500">Todos os campos principais têm título para facilitar o preenchimento.</p>
              </div>
              <button onClick={() => setModal(false)} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black text-slate-800">Selecionar cliente cadastrado</span>
                <select className="input mt-1" value={form.usuario_id} onChange={(e) => chooseClient(e.target.value)}>
                  <option value="">Selecionar ou preencher manualmente</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} - {c.email || c.telefone || 'sem contato'}</option>)}
                </select>
              </label>

              <div className="grid md:grid-cols-3 gap-3">
                <label className="block md:col-span-1">
                  <span className="text-sm font-black text-slate-800">Nome do cliente</span>
                  <input className="input mt-1" value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} placeholder="Nome do cliente" />
                </label>
                <label className="block">
                  <span className="text-sm font-black text-slate-800">Telefone</span>
                  <input className="input mt-1" value={form.cliente_telefone} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} placeholder="WhatsApp" />
                </label>
                <label className="block">
                  <span className="text-sm font-black text-slate-800">Email</span>
                  <input className="input mt-1" value={form.cliente_email} onChange={(e) => setForm({ ...form, cliente_email: e.target.value })} placeholder="Email" />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-black text-slate-800">Descrição do orçamento</span>
                <textarea className="input mt-1 min-h-36" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva produtos, quantidades, acabamentos, medidas e observações." />
              </label>

              <div className="grid md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-sm font-black text-slate-800">Valor total R$</span>
                  <input className="input mt-1" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} placeholder="0,00" />
                </label>
                <label className="block">
                  <span className="text-sm font-black text-slate-800">Validade</span>
                  <input className="input mt-1" type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-black text-slate-800">Status</span>
                  <select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-black text-slate-800">Observações internas</span>
                <textarea className="input mt-1 min-h-24" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações internas para a equipe." />
              </label>
            </div>

            <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button onClick={() => setModal(false)} className="h-12 rounded-2xl border border-slate-200 font-black">Cancelar</button>
              <button onClick={save} className="h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">Salvar orçamento</button>
            </div>
          </div>
        </div>
      )}

      {share && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-3xl max-h-[92dvh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Compartilhar orçamento</h2>
                <p className="text-slate-500">Edite o texto antes de copiar ou enviar pelo WhatsApp.</p>
              </div>
              <button onClick={() => setShare(null)} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea className="input min-h-[420px] font-mono text-sm leading-relaxed" value={share.texto} onChange={(e) => setShare({ ...share, texto: e.target.value })} />
            </div>
            <div className="p-4 border-t border-slate-100 grid sm:grid-cols-3 gap-3">
              <button onClick={() => copyText(share.texto)} className="h-12 rounded-2xl border border-slate-200 font-black flex items-center justify-center gap-2"><Copy size={17} /> Copiar</button>
              <button onClick={() => sendWhatsApp(share.texto, share.orcamento.cliente_telefone)} className="h-12 rounded-2xl bg-emerald-500 text-white font-black flex items-center justify-center gap-2"><Send size={17} /> WhatsApp</button>
              <button onClick={() => setShare(null)} className="h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
