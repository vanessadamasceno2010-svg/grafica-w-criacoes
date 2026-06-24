import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export function Produto() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <>
      <SEO 
        title="Produto" 
        description="Detalhes do produto - Gráfica W Criações" 
      />
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Carregando produto...</h1>
        <p className="mt-4">Slug: {slug}</p>
        <Link to="/catalogo" className="text-blue-600 underline mt-6 inline-block">
          Voltar ao Catálogo
        </Link>
      </div>
    </>
  );
}