import { Helmet } from 'react-helmet-async'; // npm install react-helmet-async

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

export function SEO({ title, description, keywords, image, url }: SEOProps) {
  const siteName = "Gráfica W Criações";
  const defaultDescription = "Impressos, adesivos, brindes, bordados e produtos personalizados com qualidade premium em Guaraciaba do Norte - CE.";

  return (
    <Helmet>
      <title>{title ? `${title} | ${siteName}` : siteName}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta name="keywords" content={keywords || "gráfica, guaraciaba do norte, adesivos, bordados, brindes, personalizados"} />
      
      {/* Open Graph / Social Media */}
      <meta property="og:title" content={title || siteName} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image || "https://seusite.com/og-image.jpg"} />
      <meta property="og:url" content={url || window.location.href} />
      <meta property="og:type" content="website" />

      {/* Local SEO */}
      <meta name="geo.region" content="BR-CE" />
      <meta name="geo.placename" content="Guaraciaba do Norte" />
      <meta name="geo.position" content="-4.166; -40.966" /> {/* coordenadas aproximadas */}
    </Helmet>
  );
}