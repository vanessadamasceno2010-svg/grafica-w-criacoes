import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { BRAND, apiFetch, formatPhoneDigits, getPublicConfig } from '../lib/api';

export function Contato() {
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '', assunto: '', mensagem: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    getPublicConfig().then(setConfig).catch(() => setConfig({}));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      await apiFetch('/contatos', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          telefone: formatPhoneDigits(formData.telefone)
        })
      });
      setSent(true);
      setFormData({ nome: '', email: '', telefone: '', assunto: '', mensagem: '' });
      setTimeout(() => setSent(false), 3500);
    } catch (error: any) {
      alert(error.message || 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const whatsappNumber = String(config.whatsapp || BRAND.whatsappNumber || '').replace(/\D/g, '');
  const infoItems = [
    { icon: Phone, label: 'WhatsApp', value: config.whatsapp || BRAND.whatsapp, link: `https://wa.me/${whatsappNumber || BRAND.whatsappNumber}?text=${encodeURIComponent('Olá vim do Site')}` },
    { icon: Mail, label: 'Email', value: config.email || BRAND.email || 'wcriacoesgrafica@gmail.com', link: `mailto:${config.email || BRAND.email || 'wcriacoesgrafica@gmail.com'}` },
    { icon: MapPin, label: 'Endereço', value: config.endereco || 'Tv. João Miguel da Fonseca Lobo, 105 - Centro', link: '#' },
    { icon: Clock, label: 'Horário', value: config.horario || 'Seg a Sex: 8h às 18h | Sáb: 8h às 12h', link: '#' }
  ];

  return (
    <div className="fade-in max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-8 text-center sm:text-left">
        Entre em Contato
      </h1>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4">
          {infoItems.map(({ icon: Icon, label, value, link }) => (
            <a key={label} href={link} className="card p-5 flex items-start gap-4 active:scale-[0.98] transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Icon size={22} className="text-gold" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className="font-semibold text-primary">{value}</p>
              </div>
            </a>
          ))}

          <div className="card overflow-hidden mt-6">
            <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400">
              <MapPin size={48} />
              <span className="ml-2">Localização da loja</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-xl font-bold text-primary mb-2">Envie uma Mensagem</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome *</label>
                <input type="text" required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="input" placeholder="Seu nome" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone completo</label>
                <input type="tel" inputMode="numeric" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatPhoneDigits(e.target.value) })} className="input" placeholder="Somente números. Ex: 5588996240470" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" placeholder="seu@email.com" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assunto *</label>
              <input type="text" required value={formData.assunto} onChange={(e) => setFormData({ ...formData, assunto: e.target.value })} className="input" placeholder="Orçamento, dúvida, etc." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mensagem *</label>
              <textarea required value={formData.mensagem} onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })} className="input min-h-[140px] resize-none" placeholder="Descreva sua necessidade com detalhes..." />
            </div>

            <button type="submit" disabled={sent || sending} className="btn btn-primary w-full sm:w-auto disabled:opacity-70">
              {sending ? 'Enviando...' : sent ? 'Mensagem Enviada!' : <><Send size={18} />Enviar Mensagem</>}
            </button>

            {sent && <p className="text-success text-sm text-center font-semibold">Mensagem enviada com sucesso! Entraremos em contato em breve.</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
