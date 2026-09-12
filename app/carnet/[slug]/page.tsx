import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CARNET_ARTICLES, getCarnetArticle } from '@/lib/content/carnetArticles';
import { CarnetArticleContent } from '@/components/slumbywise/CarnetArticleContent';

export function generateStaticParams() {
  return CARNET_ARTICLES.map(a => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getCarnetArticle(params.slug);
  if (!article) return {};
  return {
    title: `${article.plainTitle} — Le carnet · Slumbywise`,
    description: article.excerpt,
  };
}

export default function CarnetArticlePage({ params }: { params: { slug: string } }) {
  const article = getCarnetArticle(params.slug);
  if (!article) notFound();
  return <CarnetArticleContent article={article} />;
}
