import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { whatsappUrl } from '../lib/api';
export function WhatsAppButton(){const {pathname}=useLocation();const high=pathname.startsWith('/produto/')||pathname==='/carrinho';return <a href={whatsappUrl('Olá! Vi no site da Gráfica W Criações e gostaria de um orçamento.')} target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp" className={`fixed right-3 sm:right-6 z-20 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg ${high?'bottom-[calc(10rem+env(safe-area-inset-bottom))]':'bottom-[calc(5rem+env(safe-area-inset-bottom))]'} sm:bottom-6`}><MessageCircle size={25}/></a>;}
