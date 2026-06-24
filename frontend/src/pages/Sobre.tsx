import { SEO } from '../components/SEO';

export function Sobre() {
  return (
    <>
      <SEO 
        title="Sobre Nós"
        description="Conheça a Gráfica W Criações: 18 anos de experiência em impressão profissional, brindes corporativos, embalagens e sacolas personalizadas em Guaraciaba do Norte - CE."
        keywords="sobre gráfica guaraciaba do norte, história gráfica, brindes corporativos ceará, embalagens personalizadas, sacolas de papel"
      />

      <div className="fade-in max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl font-bold text-primary mb-4">Sobre a Gráfica W Criações</h1>
          <p className="text-xl text-gray-600">18 anos transformando ideias em materiais que geram resultados</p>
        </div>

        <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">
          <p>
            Há <strong>18 anos</strong> no mercado, a <strong>Gráfica W Criações</strong> se consolidou como referência em impressão e produção de materiais promocionais na região de Guaraciaba do Norte - CE.
          </p>

          <p>
            Somos especializados em soluções completas para empresas: <strong>brindes corporativos</strong>, <strong>embalagens personalizadas</strong>, <strong>sacolas de papel</strong>, adesivos, banners, cartões de visita, folders, etiquetas e todos os tipos de impressos.
          </p>

          <h2 className="text-3xl font-display font-bold text-primary mt-12 mb-6">Nossa Missão</h2>
          <p>
            Entregar qualidade premium com agilidade, ajudando empresas e empreendedores a se destacarem através de materiais bem produzidos e com identidade visual forte.
          </p>

          <h2 className="text-3xl font-display font-bold text-primary mt-12 mb-6">O que oferecemos</h2>
          <ul className="grid md:grid-cols-2 gap-4 text-lg">
            <li className="flex items-start gap-3"><span className="text-gold mt-1">•</span> Brindes Corporativos Personalizados</li>
            <li className="flex items-start gap-3"><span className="text-gold mt-1">•</span> Embalagens e Sacolas de Papel</li>
            <li className="flex items-start gap-3"><span className="text-gold mt-1">•</span> Impressão Digital e Offset</li>
            <li className="flex items-start gap-3"><span className="text-gold mt-1">•</span> Adesivos e Etiquetas</li>
            <li className="flex items-start gap-3"><span className="text-gold mt-1">•</span> Banners e Backdrops</li>
            <li className="flex items-start gap-3"><span className="text-gold mt-1">•</span> Materiais para PDV e Eventos</li>
          </ul>

          <div className="bg-gray-50 p-8 rounded-3xl mt-12">
            <h3 className="text-2xl font-display font-bold text-primary mb-4">Por que escolher a W Criações?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl font-display font-bold text-gold mb-2">18</div>
                <p className="font-medium">Anos de Experiência</p>
              </div>
              <div>
                <div className="text-4xl font-display font-bold text-gold mb-2">100%</div>
                <p className="font-medium">Atendimento Personalizado</p>
              </div>
              <div>
                <div className="text-4xl font-display font-bold text-gold mb-2">Rápido</div>
                <p className="font-medium">Prazo de Entrega</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <a 
            href="https://wa.me/88996240470?text=Olá! Quero conhecer melhor a Gráfica W Criações."
            target="_blank"
            className="btn btn-primary text-lg px-10 py-4 inline-flex items-center gap-3"
          >
            Falar com Nossa Equipe
          </a>
        </div>
      </div>
    </>
  );
}