import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WhatsAppButton() {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const phone = config.whatsapp || "88996240470";
  const message = encodeURIComponent("Olá! Vi no site da Gráfica W Criações e gostaria de um orçamento.");

  const handleClick = () => {
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[100] flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl hover:bg-green-600 hover:scale-110 active:scale-95 transition-all duration-300"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle size={34} strokeWidth={2.5} />
      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white flex items-center justify-center ring-2 ring-green-500">
        <div className="h-3 w-3 rounded-full bg-green-400 animate-ping absolute" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
      </div>
    </button>
  );
}