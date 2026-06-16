import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { apiFetch, formatPhoneDigits } from '../../lib/api';

const grupos = [
  {
    titulo: 'Dados da empresa',
    campos: [
      { chave: 'nome_empresa', label: 'Nome da empresa', tipo: 'texto' },
      { chave: 'whatsapp', label: 'WhatsApp completo', tipo: 'telefone' },
      { chave: 'email', label: 'Email', tipo: 'texto' },
      { chave: 'endereco', label: 'Endereço', tipo: 'texto' },
      { chave: 'instagram', label: 'Instagram', tipo: 'texto' },
      { chave: 'facebook', label: 'Facebook', tipo: 'texto' }
    ]
  },
  {
    titulo: 'Tela inicial do site',
    campos: [
      { chave: 'home_badge', label: 'Selo acima do título', tipo: 'texto' },
      { chave: 'home_titulo', label: 'Título principal', tipo: 'texto' },
      { chave: 'home_subtitulo', label: 'Subtítulo', tipo: 'textarea' },
      { chave: 'home_banner_url', label: 'Imagem do banner principal URL', tipo: 'texto' },
      { chave: 'home_codigo_pedido_titulo', label: 'Título da barra de acompanhar pedido', tipo: 'texto' },
      { chave: 'home_codigo_pedido_texto', label: 'Texto da barra de acompanhar pedido', tipo: 'texto' }
    ]
  },
  {
    titulo: 'Logos e documentos',
    campos: [
      { chave: 'logo_site_url', label: 'Logo do site URL', tipo: 'texto' },
      { chave: 'logo_documento_url', label: 'Logo para Ordem de Serviço / Recibo URL', tipo: 'texto' },
      { chave: 'assinatura_url', label: 'Assinatura digital do recibo URL', tipo: 'texto' }
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

const allCampos = grupos.flatMap((g) => g.campos);

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
    const nextValue = chave === 'whatsapp' ? formatPhoneDigits(valor) : valor;
    setDados((prev) => ({ ...prev, [chave]: nextValue }));
  }

  async function salvarTudo() {
    setSalvando(true);
    try {
      for (const campo of allCampos) {
        await apiFetch('/admin/configuracoes/' + campo.chave, {
          method: 'PUT',
          body: JSON.stringify({ valor: dados[campo.chave] || '', tipo: 'texto' })
        });
      }
      alert('Configurações salvas com sucesso.');
      await carregar();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar configurações.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="p-8">Carregando configurações...</div>;

  return (
    <div className="fade-in w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-3xl font-black text-slate-950">Configurações</h1><p className="text-slate-500">Dados da empresa, tela inicial, logos e documentos.</p></div>
        <button onClick={salvarTudo} disabled={salvando} className="btn btn-primary"><Save size={18} />{salvando ? 'Salvando...' : 'Salvar configurações'}</button>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="card p-5 grid gap-4 content-start">
            <h2 className="font-display text-xl font-bold text-primary">{grupo.titulo}</h2>
            {grupo.campos.map((campo) => (
              <label key={campo.chave} className="block">
                <span className="text-sm font-bold text-slate-700">{campo.label}</span>
                {campo.tipo === 'textarea' ? (
                  <textarea className="mt-1 w-full min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-4 focus:ring-amber-100" value={dados[campo.chave] || ''} onChange={(e) => setCampo(campo.chave, e.target.value)} />
                ) : (
                  <input className="mt-1 w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-4 focus:ring-amber-100" inputMode={campo.tipo === 'telefone' ? 'numeric' : undefined} placeholder={campo.tipo === 'telefone' ? 'Somente números. Ex: 5588996240470' : ''} value={dados[campo.chave] || ''} onChange={(e) => setCampo(campo.chave, e.target.value)} />
                )}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Configuracoes;
