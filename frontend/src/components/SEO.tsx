import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
}

export function SEO({ title, description, keywords, image }: SEOProps) {
  const siteName = "Gráfica W Criações";
  const defaultTitle = "Gráfica W Criações | Impressão e Brindes Corporativos";
  const defaultDescription = "Especializada em impressão de materiais, brindes empresariais, embalagens e sacolas de papel personalizadas. Qualidade premium para sua empresa em Guaraciaba do Norte - CE.";
  const defaultKeywords = "gráfica guaraciaba do norte, brindes corporativos, embalagens personalizadas, sacolas de papel, impressão digital, adesivos, banners, materiais promocionais, gráfica ceará";

  return (
    <Helmet>
      <title>{title ? `${title} | ${siteName}` : defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image || "https://grafica-w-criacoes-frontend.vercel.app/og-image.jpg"} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="pt_BR" />

      {/* Local Business */}
      <meta name="geo.region" content="BR-CE" />
      <meta name="geo.placename" content="Guaraciaba do Norte" />
    </Helmet>
  );
}