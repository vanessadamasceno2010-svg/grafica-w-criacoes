import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
}

export function SEO({ title, description, keywords }: SEOProps) {
  useEffect(() => {
    const siteName = "Gráfica W Criações";
    document.title = title ? `${title} | ${siteName}` : siteName;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description || "");
  }, [title, description]);

  return null;
}