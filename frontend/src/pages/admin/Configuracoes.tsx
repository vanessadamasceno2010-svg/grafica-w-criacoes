import { useEffect, useState } from 'react';
import { Save, Image, Home } from 'lucide-react';
import { apiFetch, confirmAction, notifySuccess } from '../../lib/api';

const grupos = [
  {
    titulo: 'Informações do atendimento',
    campos: [
      { chave: 'nome_empresa', label: 'Nome da empresa', tipo: 'texto' },
      { chave: 'telefone', label: 'Telefone', tipo: 'texto' },
      { chave: 'whatsapp', label: 'WhatsApp com DDI', tipo: 'texto' },
      { chave: 'email', label: 'Email', tipo: 'texto' },
      { chave: 'endereco', label: 'Endereço', tipo: 'texto' },
      { chave: 'instagram', label: 'Instagram', tipo: 'texto' },
      { chave: 'facebook', label: 'Facebook', tipo: 'texto' }
    ]
  },
  {
    titulo: 'Tela inicial do site',
    campos: [
      { chave: 'home_badge', label: 'Texto pequeno acima do título', tipo: 'texto' },
      { chave: 'home_titulo', label: 'Título principal', tipo: 'texto' },
      { chave: 'home_subtitulo', label: 'Subtítulo', tipo: 'textarea' },
      { chave: 'home_banner_url', label: 'URL do banner principal', tipo: 'texto' },
      { chave: 'home_botao_catalogo', label: 'Texto do botão catálogo', tipo: 'texto' },
      { chave: 'home_botao_whatsapp', label: 'Texto do botão WhatsApp', tipo: 'texto' },
      { chave: 'acompanhar_titulo', label: 'Título da barra de acompanhar pedido', tipo: 'texto' },
      { chave: 'acompanhar_subtitulo', label: 'Subtítulo da barra de acompanhar pedido', tipo: 'textarea' }
    ]
  },
  {
    titulo: 'Logos e documentos',
    campos: [
      { chave: 'logo_site_url', label: 'URL da logo do site', tipo: 'texto' },
      { chave: 'logo_documentos_url', label: 'URL da logo da Ordem de Serviço/Recibo', tipo: 'texto' },
      { chave: 'assinatura_recibo_url', label: 'URL da assinatura do recibo digital', tipo: 'texto' }
    ]
  },
  {
    titulo: 'Textos legais',
    campos: [
      { chave: 'sobre', label: 'Texto Sobre', tipo: 'textarea' },
      { chave: 'politica_privacidade', label: 'Política de Privacidade', tipo: 'textarea' },
      { chave: 'termos', label: 'Termos de uso', tipo: 'textarea' }
    ]
  }
];

const todosCampos = grupos.flatMap((g) => g.campos);

export function Configuracoes() {
  const [dados, setDados] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const rows = await apiFetch<any[]>('/admin/configuracoes');
      const map: Record<string, string> = {};
      for (const item of rows || []) map[item.chave] = item.valor || '';
      setDados(map);
    } catch (error: any) {
      alert(error.message || 'Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function setCampo(chave: string, valor: string) {
    setDados((prev) => ({ ...prev, [chave]: valor }));
  }

  async function salvarTudo() {
    if (!confirmAction('Confirmar alteração das configurações do site?')) return;
    setSalvando(true);
    try {
      for (const campo of todosCampos) {
        await apiFetch('/admin/configuracoes/' + campo.chave, {
          method: 'PUT',
          body: JSON.stringify({ valor: dados[campo.chave] || '', tipo: 'texto' })
        });
      }
      notifySuccess('Configurações salvas com sucesso. Atualize a página inicial para conferir.');
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar configurações.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="p-8">Carregando configurações...</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Configurações</h1>
          <p className="text-slate-500">Ajuste atendimento, tela inicial, banner, logos e documentos.</p>
        </div>
        <button onClick={salvarTudo} disabled={salvando} className="h-12 px-5 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2 disabled:opacity-60">
          <Save size={18} />{salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      <div className="grid gap-6">
        {grupos.map((grupo) => (
          <section key={grupo.titulo} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-xl font-black text-slate-950 mb-4 flex items-center gap-2">
              {grupo.titulo.includes('Tela') ? <Home size={20} /> : grupo.titulo.includes('Logo') ? <Image size={20} /> : null}
              {grupo.titulo}
            </h2>

            <div className="grid gap-4">
              {grupo.campos.map((campo) => (
                <label key={campo.chave} className="block">
                  <span className="text-sm font-bold text-slate-700">{campo.label}</span>
                  {campo.tipo === 'textarea' ? (
                    <textarea className="mt-1 w-full min-h-[130px] rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-4 focus:ring-amber-100" value={dados[campo.chave] || ''} onChange={(e) => setCampo(campo.chave, e.target.value)} />
                  ) : (
                    <input className="mt-1 w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-4 focus:ring-amber-100" value={dados[campo.chave] || ''} onChange={(e) => setCampo(campo.chave, e.target.value)} placeholder="Digite ou cole uma URL" />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default Configuracoes;
